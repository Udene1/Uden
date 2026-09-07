import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import type { D1Database } from '@cloudflare/workers-types';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { persistGraph, getPersistedGraph } from './graph-persistence';
import type { TaskGraph } from '@ai-work-partner/shared';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const execSqlFile = async (db: D1Database, path: string) => {
  const sql = await readFile(path, 'utf8');
  for (const statement of sql.replace(/^\uFEFF/, '').replace(/^[\t ]*--[^\r\n]*(?:\r?\n|$)/gm, '').split(';').map(s => s.trim()).filter(Boolean)) await db.prepare(statement).run();
};

describe('graph runtime linkage D1 integration', () => {
  let db: D1Database; let dispose: (() => Promise<void>) | undefined;
  beforeAll(async () => {
    const platform = await getPlatformProxy({ configPath: resolve(root, 'wrangler.jsonc'), persist: false });
    db = platform.env.DB as D1Database; dispose = platform.dispose;
    await execSqlFile(db, resolve(here, '../db/schema.sql'));
    await execSqlFile(db, resolve(root, 'migrations/0002_task_graph_persistence.sql'));
    await execSqlFile(db, resolve(root, 'migrations/0003_graph_durable_execution.sql'));
    await execSqlFile(db, resolve(root, 'migrations/0010_graph_node_approvals.sql'));
    await execSqlFile(db, resolve(root, 'migrations/0011_runtime_job_linkage.sql'));
    await db.prepare('INSERT INTO tenants (id,name,email,api_key_hash) VALUES (?,?,?,?)').bind('runtime-tenant','Runtime Tenant','runtime@example.test','runtime-hash').run();
  });
  afterAll(async () => { await dispose?.(); });

  it('round-trips a runtime job id without losing approval or execution state', async () => {
    const graph: TaskGraph = {
      id: 'runtime-graph', rootTaskId: 'runtime-task', goal: 'run project tests', projectId: 'project-1', createdAt: new Date().toISOString(),
      nodes: [{ id: 'execute', title: 'Run tests', prompt: 'npm test', domain: 'code', complexity: 1, expectedFormat: 'text', recommendedTier: 1,
        dependencies: [], contextFrom: [], status: 'awaiting-runtime', attemptedModels: [], kind: 'project-tool', tool: 'execute', toolInput: { command: 'npm test' },
        approvalRequired: true, approvalState: 'approved', approvedBy: 'admin', approvedAt: new Date().toISOString(), runtimeJobId: 'job-123' }]
    };
    await db.prepare('INSERT INTO tasks (id,tenant_id,prompt,status,mode,escalation_count,created_at) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP)').bind('runtime-task','runtime-tenant','run project tests','processing','permissionless',0).run();
    await persistGraph(db, 'runtime-tenant', graph);
    const persisted = await getPersistedGraph(db, 'runtime-tenant', graph.id);
    expect(persisted?.projectId).toBe('project-1');
    expect(persisted?.nodes[0].status).toBe('awaiting-runtime');
    expect(persisted?.nodes[0].runtimeJobId).toBe('job-123');
    expect(persisted?.nodes[0].approvalState).toBe('approved');
  });
});
