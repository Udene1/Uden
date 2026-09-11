import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { resolve } from 'node:path';
import type { D1Database } from '@cloudflare/workers-types';
import type { TaskGraph } from '@ai-work-partner/shared';
import { applyCurrentD1Schema } from '../test/d1-bootstrap';
import { persistGraph, acquireGraphExecutionLease } from './graph-persistence';
import { registerExecutionRuntime, authorizeRuntimeExecution, markRuntimeExecutionInFlight, completeRuntimeExecution } from './execution-runtimes';

describe.sequential('execution runtime fencing D1 integration', () => {
  let db: D1Database;
  let dispose: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const engineRoot = resolve(process.cwd());
    const platform = await getPlatformProxy({ configPath: resolve(engineRoot, 'wrangler.test.jsonc'), persist: false });
    db = platform.env.DB as D1Database;
    dispose = platform.dispose;
    await applyCurrentD1Schema(db, engineRoot);
    await db.prepare(`INSERT INTO tenants (id,name,email,api_key_hash,monthly_budget_cents) VALUES (?,?,?,?,?)`).bind('runtime-tenant','Runtime tests','runtime@example.test','runtime-hash',100).run();
    await db.prepare(`INSERT INTO tasks (id,tenant_id,prompt,status) VALUES (?,?,?,?)`).bind('runtime-root','runtime-tenant','runtime execution test','processing').run();
  });

  afterAll(async () => { await dispose?.(); });

  it('requires the runtime to advertise the requested capability', async () => {
    await registerExecutionRuntime(db, 'runtime-tenant', { id: 'desktop-a', tenantId: 'runtime-tenant', kind: 'desktop_local', state: 'online', capabilities: ['git.read'], lastHeartbeatAt: new Date().toISOString() });
    const graph: TaskGraph = { id: 'runtime-capability-graph', rootTaskId: 'runtime-root', goal: 'runtime capability', createdAt: new Date().toISOString(), nodes: [{ id: 'node', title: 'Node', prompt: 'execute', domain: 'general', complexity: 1, expectedFormat: 'text', recommendedTier: 1, dependencies: [], contextFrom: [], status: 'ready', attemptedModels: [] }] };
    await persistGraph(db, 'runtime-tenant', graph);
    const version = await acquireGraphExecutionLease(db, 'runtime-tenant', graph.id, 'runtime-worker');
    await expect(authorizeRuntimeExecution(db, 'runtime-tenant', { runtimeId: 'desktop-a', graphId: graph.id, nodeId: 'node', attemptId: 'runtime-capability-attempt', executionOwner: 'runtime-worker', executionVersion: version!, leaseExpiresAt: new Date(Date.now()+60_000).toISOString(), capability: 'command.exec', command: 'echo', args: ['hello'] })).rejects.toThrow('lacks the requested capability');
  });

  it('fences runtime completion to the exact graph owner and generation', async () => {
    await registerExecutionRuntime(db, 'runtime-tenant', { id: 'desktop-b', tenantId: 'runtime-tenant', kind: 'desktop_local', state: 'online', capabilities: ['command.exec'], lastHeartbeatAt: new Date().toISOString() });
    const graph: TaskGraph = { id: 'runtime-fence-graph', rootTaskId: 'runtime-root', goal: 'runtime fence', createdAt: new Date().toISOString(), nodes: [{ id: 'node', title: 'Node', prompt: 'execute', domain: 'general', complexity: 1, expectedFormat: 'text', recommendedTier: 1, dependencies: [], contextFrom: [], status: 'ready', attemptedModels: [] }] };
    await persistGraph(db, 'runtime-tenant', graph);
    const version = await acquireGraphExecutionLease(db, 'runtime-tenant', graph.id, 'runtime-worker-a');
    const request = { runtimeId: 'desktop-b', graphId: graph.id, nodeId: 'node', attemptId: 'runtime-fence-attempt', executionOwner: 'runtime-worker-a', executionVersion: version!, leaseExpiresAt: new Date(Date.now()+60_000).toISOString(), capability: 'command.exec' as const, command: 'echo', args: ['hello'] };
    await authorizeRuntimeExecution(db, 'runtime-tenant', request);
    await markRuntimeExecutionInFlight(db, 'runtime-tenant', request);
    await db.prepare(`UPDATE task_graphs SET execution_owner='runtime-worker-b', execution_version=?, lease_until=datetime('now','+120 seconds') WHERE id=?`).bind(version!+1, graph.id).run();
    await expect(completeRuntimeExecution(db, 'runtime-tenant', request, { runtimeId:'desktop-b', graphId:graph.id, nodeId:'node', attemptId:'runtime-fence-attempt', outcome:'completed', startedAt:new Date().toISOString(), finishedAt:new Date().toISOString(), stdout:'stale' })).rejects.toThrow('Graph execution lease lost');
    const row = await db.prepare(`SELECT status FROM runtime_executions WHERE tenant_id=? AND attempt_id=?`).bind('runtime-tenant','runtime-fence-attempt').first<{status:string}>();
    expect(row?.status).toBe('in_flight');
  });
});
