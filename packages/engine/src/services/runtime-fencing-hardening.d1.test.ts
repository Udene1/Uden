import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { resolve } from 'node:path';
import type { D1Database } from '@cloudflare/workers-types';
import type { TaskGraph } from '@ai-work-partner/shared';
import { applyCurrentD1Schema } from '../test/d1-bootstrap';
import { persistGraph, acquireGraphExecutionLease } from './graph-persistence';
import { registerExecutionRuntime, authorizeRuntimeExecution, markRuntimeExecutionInFlight } from './execution-runtimes';

describe.sequential('runtime fencing hardening', () => {
  let db: D1Database;
  let dispose: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const engineRoot = resolve(process.cwd());
    const platform = await getPlatformProxy({ configPath: resolve(engineRoot, 'wrangler.test.jsonc'), persist: false });
    db = platform.env.DB as D1Database;
    dispose = platform.dispose;
    await applyCurrentD1Schema(db, engineRoot);
    await db.prepare(`INSERT INTO tenants (id,name,email,api_key_hash,monthly_budget_cents) VALUES (?,?,?,?,?)`)
      .bind('fence-hardening-tenant', 'Fence hardening', 'fence-hardening@example.test', 'fence-hardening-hash', 100).run();
  });

  afterAll(async () => { await dispose?.(); });

  async function createExecution() {
    const executionId = crypto.randomUUID();
    const rootTaskId = `fence-hardening-root-${executionId}`;
    await db.prepare(`INSERT INTO tasks (id,tenant_id,prompt,status) VALUES (?,?,?,?)`)
      .bind(rootTaskId, 'fence-hardening-tenant', 'fence hardening', 'processing').run();
    await registerExecutionRuntime(db, 'fence-hardening-tenant', {
      id: `fence-hardening-runtime-${executionId}`, tenantId: 'fence-hardening-tenant', kind: 'desktop_local', state: 'online',
      capabilities: ['command.exec'], lastHeartbeatAt: new Date().toISOString(),
    });
    const graph: TaskGraph = {
      id: `fence-hardening-${executionId}`,
      rootTaskId, goal: 'fence hardening', createdAt: new Date().toISOString(),
      nodes: [{ id: `node-${executionId}`, title: 'Node', prompt: 'execute', domain: 'general', complexity: 1, expectedFormat: 'text', recommendedTier: 1, dependencies: [], contextFrom: [], status: 'ready', attemptedModels: [] }],
    };
    await persistGraph(db, 'fence-hardening-tenant', graph);
    const version = await acquireGraphExecutionLease(db, 'fence-hardening-tenant', graph.id, `worker-${graph.id}`);
    const request = {
      runtimeId: `fence-hardening-runtime-${executionId}`, graphId: graph.id, nodeId: graph.nodes[0].id, attemptId: `attempt-${graph.id}`,
      executionOwner: `worker-${graph.id}`, executionVersion: version!, leaseExpiresAt: new Date(Date.now() + 60000).toISOString(),
      capability: 'command.exec' as const, command: 'echo', args: ['hardening'],
    };
    await authorizeRuntimeExecution(db, 'fence-hardening-tenant', request);
    await markRuntimeExecutionInFlight(db, 'fence-hardening-tenant', request);
    return { graph, request, version: version! };
  }

  it('rejects an old worker trying to rewrite runtime fence identity', async () => {
    const { graph, request, version } = await createExecution();
    await db.prepare(`UPDATE task_graphs SET execution_owner='new-owner', execution_version=?, lease_until=datetime('now','+120 seconds') WHERE id=?`)
      .bind(version + 1, graph.id).run();
    await expect(db.prepare(`UPDATE runtime_executions SET execution_owner='new-owner', execution_version=? WHERE tenant_id=? AND attempt_id=?`)
      .bind(version + 1, 'fence-hardening-tenant', request.attemptId).run())
      .rejects.toThrow('Runtime execution fence identity is immutable');
  });

  it('rejects terminal runtime history from being rewritten', async () => {
    const { graph, request } = await createExecution();
    await db.prepare(`UPDATE runtime_executions SET status='completed', external_operation_id='op-1', stdout='authoritative', finished_at=CURRENT_TIMESTAMP WHERE tenant_id=? AND attempt_id=?`)
      .bind('fence-hardening-tenant', request.attemptId).run();
    await expect(db.prepare(`UPDATE runtime_executions SET status='failed', stdout='stale' WHERE tenant_id=? AND attempt_id=?`)
      .bind('fence-hardening-tenant', request.attemptId).run())
      .rejects.toThrow('Terminal runtime execution history is immutable');
    const row = await db.prepare(`SELECT status,stdout FROM runtime_executions WHERE tenant_id=? AND attempt_id=?`)
      .bind('fence-hardening-tenant', request.attemptId).first<{status:string;stdout:string}>();
    expect(row).toEqual({ status: 'completed', stdout: 'authoritative' });
    expect(graph.id).toBeTruthy();
  });

  it('rejects illegal runtime state regression', async () => {
    const { request } = await createExecution();
    await expect(db.prepare(`UPDATE runtime_executions SET status='authorized' WHERE tenant_id=? AND attempt_id=?`)
      .bind('fence-hardening-tenant', request.attemptId).run())
      .rejects.toThrow('Illegal runtime execution status transition');
  });

  it('makes terminal graph attempts immutable while allowing the running-to-terminal transition', async () => {
    const { graph } = await createExecution();
    const nodeId = graph.nodes[0].id;
    await db.prepare(`INSERT INTO task_graph_attempts (id,graph_id,node_id,tenant_id,attempt_number,model,status,external_outcome,idempotency_key,started_at) VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`)
      .bind(`attempt-record-${graph.id}`, graph.id, nodeId, 'fence-hardening-tenant', 1, 'test-model', 'running', 'not_started', `idem-${graph.id}`).run();
    await db.prepare(`UPDATE task_graph_attempts SET status='completed',external_outcome='completed',completed_at=CURRENT_TIMESTAMP WHERE graph_id=? AND node_id=? AND attempt_number=1`)
      .bind(graph.id, nodeId).run();
    await expect(db.prepare(`UPDATE task_graph_attempts SET status='failed',external_outcome='unknown' WHERE graph_id=? AND node_id=? AND attempt_number=1`)
      .bind(graph.id, nodeId).run())
      .rejects.toThrow('Terminal graph attempt history is immutable');
  });
});
