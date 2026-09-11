import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import type { D1Database } from '@cloudflare/workers-types';
import { resolve } from 'node:path';
import type { TaskGraph } from '@ai-work-partner/shared';
import { persistGraph, recordGraphAttempt, acquireGraphExecutionLease } from './graph-persistence';
import { getExternalAttemptOutcome, markExternalAttemptInFlight, markExternalAttemptOutcome } from './external-attempt-persistence';
import { applyCurrentD1Schema } from '../test/d1-bootstrap';

describe.sequential('external attempt persistence D1 integration', () => {
  let db: D1Database;
  let dispose: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const engineRoot = resolve(process.cwd());
    const platform = await getPlatformProxy({ configPath: resolve(engineRoot, 'wrangler.test.jsonc'), persist: false });
    db = platform.env.DB as D1Database;
    dispose = platform.dispose;
    await applyCurrentD1Schema(db, engineRoot);
    await db.prepare(`INSERT INTO tenants (id,name,email,api_key_hash,monthly_budget_cents) VALUES (?,?,?,?,?)`).bind('attempt-tenant','Attempt persistence','attempt@example.test','attempt-hash',100).run();
    await db.prepare(`INSERT INTO tasks (id,tenant_id,prompt,status) VALUES (?,?,?,?)`).bind('attempt-root','attempt-tenant','attempt persistence test','processing').run();
    await db.prepare(`INSERT INTO tasks (id,tenant_id,prompt,status) VALUES (?,?,?,?)`).bind('attempt-stale-root','attempt-tenant','stale attempt persistence test','processing').run();
  });

  afterAll(async () => { await dispose?.(); });

  it('records an in-flight attempt and transitions it to unknown under the active fence', async () => {
    const graph: TaskGraph = {
      id: 'attempt-persistence-graph', rootTaskId: 'attempt-root', goal: 'external attempt persistence', createdAt: new Date().toISOString(),
      nodes: [{ id: 'node', title: 'Node', prompt: 'work', domain: 'general', complexity: 1, expectedFormat: 'markdown', recommendedTier: 1, dependencies: [], contextFrom: [], status: 'ready', attemptedModels: [] }],
    };
    await persistGraph(db, 'attempt-tenant', graph);
    const fenceVersion = await acquireGraphExecutionLease(db, 'attempt-tenant', graph.id, 'attempt-worker');
    expect(fenceVersion).toBe(2);
    await recordGraphAttempt(db, { id: 'attempt-1', graphId: graph.id, nodeId: 'node', tenantId: 'attempt-tenant', attemptNumber: 1, model: 'gpt-test', provider: 'openai', status: 'running' });
    const fence = { owner: 'attempt-worker', fenceVersion: fenceVersion!, tenantId: 'attempt-tenant', graphId: graph.id };
    await markExternalAttemptInFlight(db, 'attempt-tenant', 'attempt-1', 'uden:attempt-1', fence);
    expect(await getExternalAttemptOutcome(db, 'attempt-tenant', 'attempt-1')).toMatchObject({ outcome: 'in_flight', idempotencyKey: 'uden:attempt-1' });
    await markExternalAttemptOutcome(db, 'attempt-tenant', 'attempt-1', 'unknown', fence, 'provider timeout after request dispatch');
    expect(await getExternalAttemptOutcome(db, 'attempt-tenant', 'attempt-1')).toMatchObject({ outcome: 'unknown', externalError: 'provider timeout after request dispatch' });
  });

  it('rejects a stale worker from changing an external outcome after reclaim', async () => {
    const graph: TaskGraph = {
      id: 'attempt-stale-graph', rootTaskId: 'attempt-stale-root', goal: 'stale external attempt', createdAt: new Date().toISOString(),
      nodes: [{ id: 'node', title: 'Node', prompt: 'work', domain: 'general', complexity: 1, expectedFormat: 'markdown', recommendedTier: 1, dependencies: [], contextFrom: [], status: 'ready', attemptedModels: [] }],
    };
    await persistGraph(db, 'attempt-tenant', graph);
    const firstFence = await acquireGraphExecutionLease(db, 'attempt-tenant', graph.id, 'worker-a');
    expect(firstFence).toBe(2);
    await recordGraphAttempt(db, { id: 'attempt-stale-1', graphId: graph.id, nodeId: 'node', tenantId: 'attempt-tenant', attemptNumber: 1, model: 'gpt-test', provider: 'openai', status: 'running' });
    const staleFence = { owner: 'worker-a', fenceVersion: firstFence!, tenantId: 'attempt-tenant', graphId: graph.id };
    await markExternalAttemptInFlight(db, 'attempt-tenant', 'attempt-stale-1', 'uden:attempt-stale-1', staleFence);
    const secondFence = await acquireGraphExecutionLease(db, 'attempt-tenant', graph.id, 'worker-b');
    expect(secondFence).toBe(3);
    await expect(markExternalAttemptOutcome(db, 'attempt-tenant', 'attempt-stale-1', 'completed', staleFence)).rejects.toThrow('Graph execution lease lost');
    expect((await getExternalAttemptOutcome(db, 'attempt-tenant', 'attempt-stale-1'))?.outcome).toBe('in_flight');
  });
});