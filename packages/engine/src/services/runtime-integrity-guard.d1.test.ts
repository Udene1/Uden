import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { resolve } from 'node:path';
import type { D1Database } from '@cloudflare/workers-types';
import type { TaskGraph } from '@ai-work-partner/shared';
import { applyCurrentD1Schema } from '../test/d1-bootstrap';
import { persistGraph, acquireGraphExecutionLease } from './graph-persistence';
import { registerExecutionRuntime, authorizeRuntimeExecution, markRuntimeExecutionInFlight } from './execution-runtimes';

describe.sequential('runtime terminal integrity guard', () => {
  let db: D1Database; let dispose: (() => Promise<void>) | undefined;
  beforeAll(async () => {
    const engineRoot = resolve(process.cwd());
    const platform = await getPlatformProxy({ configPath: resolve(engineRoot, 'wrangler.test.jsonc'), persist: false });
    db = platform.env.DB as D1Database;
    dispose = platform.dispose;
    await applyCurrentD1Schema(db, engineRoot);
    await db.prepare(`INSERT INTO tenants (id,name,email,api_key_hash,monthly_budget_cents) VALUES (?,?,?,?,?)`).bind('integrity-tenant','Integrity tests','integrity@example.test','integrity-hash',100).run();
    await db.prepare(`INSERT INTO tasks (id,tenant_id,prompt,status) VALUES (?,?,?,?)`).bind('integrity-root','integrity-tenant','runtime integrity','processing').run();
  });
  afterAll(async () => { await dispose?.(); });

  it('blocks terminal graph transition while runtime side effect is unresolved, then permits it after resolution', async () => {
    await registerExecutionRuntime(db, 'integrity-tenant', {
      id: 'integrity-runtime', tenantId: 'integrity-tenant', kind: 'desktop_local', state: 'online',
      capabilities: ['command.exec'], lastHeartbeatAt: new Date().toISOString(),
    });
    const graph: TaskGraph = {
      id: 'runtime-integrity-graph', rootTaskId: 'integrity-root', goal: 'runtime integrity', createdAt: new Date().toISOString(),
      nodes: [{ id: 'node', title: 'Node', prompt: 'execute', domain: 'general', complexity: 1, expectedFormat: 'text', recommendedTier: 1, dependencies: [], contextFrom: [], status: 'ready', attemptedModels: [] }],
    };
    await persistGraph(db, 'integrity-tenant', graph);
    const version = await acquireGraphExecutionLease(db, 'integrity-tenant', graph.id, 'integrity-worker');
    const request = {
      runtimeId: 'integrity-runtime', graphId: graph.id, nodeId: 'node', attemptId: 'integrity-attempt',
      executionOwner: 'integrity-worker', executionVersion: version!, leaseExpiresAt: new Date(Date.now() + 60000).toISOString(),
      capability: 'command.exec' as const, command: 'echo', args: ['integrity'],
    };
    await authorizeRuntimeExecution(db, 'integrity-tenant', request);
    await markRuntimeExecutionInFlight(db, 'integrity-tenant', request);

    await expect(db.prepare(`UPDATE task_graphs SET status='completed' WHERE id=? AND tenant_id=?`).bind(graph.id, 'integrity-tenant').run()).rejects.toThrow('Graph cannot become terminal with unresolved runtime side effects');

    await db.prepare(`UPDATE runtime_executions SET status='completed', finished_at=CURRENT_TIMESTAMP WHERE tenant_id=? AND attempt_id=?`).bind('integrity-tenant', request.attemptId).run();
    await db.prepare(`UPDATE task_graphs SET status='completed' WHERE id=? AND tenant_id=?`).bind(graph.id, 'integrity-tenant').run();
    const row = await db.prepare(`SELECT status FROM task_graphs WHERE id=? AND tenant_id=?`).bind(graph.id, 'integrity-tenant').first<{ status: string }>();
    expect(row?.status).toBe('completed');
  });
});
