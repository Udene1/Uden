import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import type { D1Database } from '@cloudflare/workers-types';
import { resolve } from 'node:path';
import { reserveBudget, releaseBudget, getBudgetState } from './cost';
import { blockDependents, getReadyGraphNodes, resumeTaskGraph } from './graph-executor';
import { persistGraph, persistGraphSnapshot, getPersistedGraph, acquireGraphExecutionLease } from './graph-persistence';
import { applyCurrentD1Schema } from '../test/d1-bootstrap';
import type { TaskGraph } from '@ai-work-partner/shared';

describe.sequential('graph reliability D1 integration', () => {
  let db: D1Database;
  let dispose: (() => Promise<void>) | undefined;
  const env = {} as any;

  beforeAll(async () => {
    const platform = await getPlatformProxy({ configPath: resolve(process.cwd(), 'packages/engine/wrangler.test.jsonc'), persist: false });
    db = platform.env.DB as D1Database;
    env.DB = db;
    dispose = platform.dispose;
    await applyCurrentD1Schema(db, resolve(process.cwd(), 'packages/engine'));
    await db.prepare(`INSERT INTO tenants (id,name,email,api_key_hash,monthly_budget_cents) VALUES (?,?,?,?,?)`).bind('reliability-tenant', 'Reliability', 'r@example.test', 'reliability-hash', 10).run();
    for (const [id, prompt] of [
      ['reliability-root', 'dependency graph test'],
      ['reliability-crash-root', 'recovery test'],
      ['reliability-fence-root', 'fence reclaim test'],
      ['reliability-revival-root', 'failed worker revival race'],
    ]) await db.prepare(`INSERT INTO tasks (id,tenant_id,prompt,status) VALUES (?,?,?,?)`).bind(id, 'reliability-tenant', prompt, 'processing').run();
  });

  afterAll(async () => { await dispose?.(); });

  it('atomically exhausts and releases budget reservations', async () => {
    expect(await reserveBudget(env, 'reliability-tenant', 7, 'reservation-a')).toBe(true);
    expect(await reserveBudget(env, 'reliability-tenant', 4, 'reservation-b')).toBe(false);
    await releaseBudget(env, 'reliability-tenant', 'reservation-a');
    expect(await reserveBudget(env, 'reliability-tenant', 4, 'reservation-b')).toBe(true);
    const state = await getBudgetState(env, 'reliability-tenant');
    expect(state.reservedCents).toBe(4);
    await releaseBudget(env, 'reliability-tenant', 'reservation-b');
  });

  it('persists a real multi-node dependency graph and blocks descendants of failure', async () => {
    const graph: TaskGraph = { id: 'multi-node-graph', rootTaskId: 'reliability-root', goal: 'multi node', createdAt: new Date().toISOString(), nodes: [
      { id: 'a', title: 'A', prompt: 'A', domain: 'general', complexity: 1, expectedFormat: 'markdown', recommendedTier: 1, dependencies: [], contextFrom: [], status: 'failed', attemptedModels: [], error: 'provider failure' },
      { id: 'b', title: 'B', prompt: 'B', domain: 'general', complexity: 1, expectedFormat: 'markdown', recommendedTier: 1, dependencies: ['a'], contextFrom: ['a'], status: 'pending', attemptedModels: [] },
      { id: 'c', title: 'C', prompt: 'C', domain: 'general', complexity: 1, expectedFormat: 'markdown', recommendedTier: 1, dependencies: ['b'], contextFrom: ['b'], status: 'pending', attemptedModels: [] },
      { id: 'd', title: 'D', prompt: 'D', domain: 'general', complexity: 1, expectedFormat: 'markdown', recommendedTier: 1, dependencies: [], contextFrom: [], status: 'ready', attemptedModels: [] },
    ] };
    await persistGraph(db, 'reliability-tenant', graph);
    blockDependents(graph);
    expect(graph.nodes.find(n => n.id === 'b')?.status).toBe('blocked');
    expect(graph.nodes.find(n => n.id === 'c')?.status).toBe('blocked');
    expect(getReadyGraphNodes(graph).map(n => n.id)).toEqual(['d']);
    const persisted = await getPersistedGraph(db, 'reliability-tenant', 'multi-node-graph');
    expect(persisted?.nodes).toHaveLength(4);
  });

  it('recovers persisted running state after a crash and never leaves a node running', async () => {
    const graph: TaskGraph = { id: 'crash-resume-graph', rootTaskId: 'reliability-crash-root', goal: 'crash resume', createdAt: new Date().toISOString(), nodes: [
      { id: 'recover', title: 'Recover', prompt: 'Recover this work', domain: 'general', complexity: 1, expectedFormat: 'markdown', recommendedTier: 1, dependencies: [], contextFrom: [], status: 'running', attemptedModels: ['gpt-4o-mini'] },
    ] };
    await persistGraph(db, 'reliability-tenant', graph);
    const result = await resumeTaskGraph(env, 'reliability-tenant', 'crash-resume-graph');
    expect(result.status).toBe('failed');
    const persisted = await getPersistedGraph(db, 'reliability-tenant', 'crash-resume-graph');
    expect(persisted?.nodes.some(n => n.status === 'running')).toBe(false);
    expect(persisted?.nodes[0].error).toContain('PROVIDER_REQUEST_FAILED');
  });

  it('rejects a stale fenced worker before it can mutate a graph node', async () => {
    const graph: TaskGraph = { id: 'fence-reclaim-graph', rootTaskId: 'reliability-fence-root', goal: 'fence reclaim', createdAt: new Date().toISOString(), nodes: [
      { id: 'node', title: 'Node', prompt: 'original', domain: 'general', complexity: 1, expectedFormat: 'markdown', recommendedTier: 1, dependencies: [], contextFrom: [], status: 'pending', attemptedModels: [] },
    ] };
    await persistGraph(db, 'reliability-tenant', graph);
    await db.prepare(`UPDATE task_graphs SET execution_owner=?,execution_version=?,lease_until=datetime('now','+120 seconds') WHERE id=? AND tenant_id=?`).bind('new-owner', 9, graph.id, 'reliability-tenant').run();
    const stale: TaskGraph = { ...graph, nodes: [{ ...graph.nodes[0], status: 'completed', output: 'stale worker must not win' }] };
    await expect(persistGraphSnapshot(db, 'reliability-tenant', stale, 'completed', null, null, { owner: 'old-owner', fenceVersion: 8 })).rejects.toThrow('Graph execution lease lost');
    const persisted = await getPersistedGraph(db, 'reliability-tenant', graph.id);
    expect(persisted?.nodes[0].status).toBe('pending');
    expect(persisted?.nodes[0].output).toBeUndefined();
  });

  it('prevents a failed worker revived after reclaim from overwriting the new worker', async () => {
    const graph: TaskGraph = { id: 'revival-race-graph', rootTaskId: 'reliability-revival-root', goal: 'revival race', createdAt: new Date().toISOString(), nodes: [
      { id: 'node', title: 'Node', prompt: 'work', domain: 'general', complexity: 1, expectedFormat: 'markdown', recommendedTier: 1, dependencies: [], contextFrom: [], status: 'running', attemptedModels: ['gpt-4o-mini'] },
    ] };
    await persistGraph(db, 'reliability-tenant', graph);
    await db.prepare(`UPDATE task_graphs SET execution_owner=?,execution_version=?,lease_until=datetime('now','+120 seconds') WHERE id=? AND tenant_id=?`).bind('worker-a', 20, graph.id, 'reliability-tenant').run();
    const failedByA: TaskGraph = { ...graph, nodes: [{ ...graph.nodes[0], status: 'failed', error: 'worker A provider failure' }] };
    await persistGraphSnapshot(db, 'reliability-tenant', failedByA, 'failed', null, 'worker A failed', { owner: 'worker-a', fenceVersion: 20 });
    const workerBFence = await acquireGraphExecutionLease(db, 'reliability-tenant', graph.id, 'worker-b');
    expect(workerBFence).toBe(21);
    const recovered = await getPersistedGraph(db, 'reliability-tenant', graph.id);
    expect(recovered?.nodes[0].status).toBe('failed');
    recovered!.nodes[0].status = 'ready';
    recovered!.nodes[0].error = undefined;
    recovered!.nodes[0].output = 'worker B result';
    await persistGraphSnapshot(db, 'reliability-tenant', recovered!, 'completed', null, null, { owner: 'worker-b', fenceVersion: 21 });
    const staleRevival: TaskGraph = { ...failedByA, nodes: [{ ...failedByA.nodes[0], status: 'completed', output: 'late worker A result' }] };
    await expect(persistGraphSnapshot(db, 'reliability-tenant', staleRevival, 'completed', null, null, { owner: 'worker-a', fenceVersion: 20 })).rejects.toThrow('Graph execution lease lost');
    const final = await getPersistedGraph(db, 'reliability-tenant', graph.id);
    expect(final?.nodes[0].status).toBe('completed');
    expect(final?.nodes[0].output).toBe('worker B result');
  });
});
