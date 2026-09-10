import { describe, expect, it } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { markExternalAttemptInFlight, markExternalAttemptOutcome, getExternalAttemptOutcome, listUnresolvedExternalAttempts } from './external-attempt-persistence';
import type { ExecutionFence } from './execution-side-effects';

const testDir = resolve(fileURLToPath(new URL('.', import.meta.url)));
const engineRoot = resolve(testDir, '../..');
const schemaPath = resolve(testDir, '../db/schema.sql');
const migrationPath = (name: string) => resolve(engineRoot, 'migrations', name);
const execSqlFile = async (db: D1Database, path: string) => {
  const sql = await readFile(path, 'utf8');
  for (const statement of sql.replace(/^\uFEFF/, '').replace(/^[\t ]*--[^\r\n]*(?:\r?\n|$)/gm, '').split(';').map((s) => s.trim()).filter(Boolean)) await db.prepare(statement).run();
};

describe.sequential('external attempt persistence', () => {
  let db: D1Database;
  let dispose: (() => Promise<void>) | undefined;
  const env = {} as any;
  const fence: ExecutionFence = { owner: 'worker-a', fenceVersion: 7, tenantId: 'attempt-tenant', graphId: 'attempt-graph' };

  beforeAll(async () => {
    const platform = await getPlatformProxy({ configPath: resolve(engineRoot, 'wrangler.test.jsonc'), persist: false });
    db = platform.env.DB as D1Database;
    env.DB = db;
    dispose = platform.dispose;
    await execSqlFile(db, schemaPath);
    for (const migration of ['0003_graph_durable_execution.sql', '0015_execution_side_effect_fencing.sql', '0016_execution_principal.sql', '0018_durable_attempt_outcomes.sql']) await execSqlFile(db, migrationPath(migration));
    await db.prepare(`INSERT INTO tenants (id,name,email,api_key_hash,monthly_budget_cents) VALUES (?,?,?,?,?)`).bind('attempt-tenant','Attempts','attempts@example.test','attempt-hash',100).run();
    await db.prepare(`INSERT INTO tasks (id,tenant_id,prompt,status) VALUES (?,?,?,?)`).bind('attempt-root','attempt-tenant','external attempt test','processing').run();
    await db.prepare(`INSERT INTO task_graphs (id,tenant_id,root_task_id,goal,status,execution_version,execution_owner,lease_until,created_at,updated_at) VALUES (?,?,?,?,?, ?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).bind('attempt-graph','attempt-tenant','attempt-root','external attempt','running',7,'worker-a',"9999-12-31 00:00:00").run();
    await db.prepare(`INSERT INTO task_graph_attempts (id,graph_id,node_id,tenant_id,attempt_number,model,provider,status) VALUES (?,?,?,?,?,?,?,?)`).bind('attempt-1','attempt-graph','node-1','attempt-tenant',1,'gpt-4o-mini','openai','running').run();
  });
  afterAll(async () => { await dispose?.(); });

  it('transitions an authorized attempt to in_flight exactly once', async () => {
    await markExternalAttemptInFlight(db, 'attempt-tenant', 'attempt-1', 'uden:attempt-1', fence);
    const state = await getExternalAttemptOutcome(db, 'attempt-tenant', 'attempt-1');
    expect(state?.outcome).toBe('in_flight');
    expect(state?.idempotencyKey).toBe('uden:attempt-1');
    await expect(markExternalAttemptInFlight(db, 'attempt-tenant', 'attempt-1', 'duplicate-key', fence)).rejects.toThrow(/transition rejected|not_started/);
  });

  it('marks an ambiguous transport outcome unknown and exposes it for reconciliation', async () => {
    await markExternalAttemptOutcome(db, 'attempt-tenant', 'attempt-1', 'unknown', fence, 'provider timeout after request dispatch');
    const unresolved = await listUnresolvedExternalAttempts(db, 'attempt-tenant', 'attempt-graph');
    expect(unresolved).toHaveLength(1);
    expect(unresolved[0]).toMatchObject({ id: 'attempt-1', outcome: 'unknown', idempotencyKey: 'uden:attempt-1' });
  });

  it('rejects a stale worker from changing an unresolved outcome', async () => {
    const stale: ExecutionFence = { ...fence, owner: 'worker-b', fenceVersion: 8 };
    await expect(markExternalAttemptOutcome(db, 'attempt-tenant', 'attempt-1', 'completed', stale)).rejects.toThrow('lease lost');
    const state = await getExternalAttemptOutcome(db, 'attempt-tenant', 'attempt-1');
    expect(state?.outcome).toBe('unknown');
  });
});
