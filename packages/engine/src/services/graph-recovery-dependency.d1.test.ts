import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import type { D1Database } from '@cloudflare/workers-types';
import { resolve } from 'node:path';
import { getPersistedGraph, persistGraph } from './graph-persistence';
import type { TaskGraph } from '@ai-work-partner/shared';
import { applyCurrentD1Schema } from '../test/d1-bootstrap';

describe.sequential('dependency-aware graph recovery D1 integration', () => {
  let db: D1Database;
  let dispose: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const engineRoot = resolve(process.cwd());
    const platform = await getPlatformProxy({ configPath: resolve(engineRoot, 'wrangler.test.jsonc'), persist: false });
    db = platform.env.DB as D1Database;
    dispose = platform.dispose;
    await applyCurrentD1Schema(db, engineRoot);
    await db.prepare(`INSERT INTO tenants (id,name,email,api_key_hash,monthly_budget_cents) VALUES (?,?,?,?,?)`).bind('dependency-recovery-tenant','Dependency Recovery','dependency-recovery@example.test','dependency-recovery-hash',10000).run();
    await db.prepare(`INSERT INTO tasks (id,tenant_id,prompt,status) VALUES (?,?,?,?)`).bind('dependency-recovery-root','dependency-recovery-tenant','dependency recovery','processing').run();
  });

  afterAll(async () => { await dispose?.(); });

  it('recovers an unresolved dependent node without touching dependency metadata', async () => {
    const graph: TaskGraph = { id: 'dependency-recovery-graph', rootTaskId: 'dependency-recovery-root', goal: 'recover dependent attempt', createdAt: new Date().toISOString(), nodes: [
      { id: 'upstream', title: 'Upstream', prompt: 'upstream', domain: 'general', complexity: 1, expectedFormat: 'markdown', recommendedTier: 1, dependencies: [], contextFrom: [], status: 'completed', attemptedModels: ['gpt-4o-mini'], output: 'done' },
      { id: 'dependent', title: 'Dependent', prompt: 'dependent', domain: 'general', complexity: 2, expectedFormat: 'markdown', recommendedTier: 1, dependencies: ['upstream'], contextFrom: ['upstream'], status: 'running', attemptedModels: ['gpt-4o-mini'] },
    ] };
    await persistGraph(db, 'dependency-recovery-tenant', graph);
    await db.prepare(`INSERT INTO task_graph_attempts (id,graph_id,node_id,tenant_id,attempt_number,model,provider,status,external_outcome,idempotency_key) VALUES (?,?,?,?,?,?,?,?,?,?)`).bind('dependency-recovery-graph:dependent:1','dependency-recovery-graph','dependent','dependency-recovery-tenant',1,'gpt-4o-mini','openai','running','unknown','uden:dependency-recovery-tenant:dependency-recovery-graph:dependent:1').run();
    const recovered = await getPersistedGraph(db, 'dependency-recovery-tenant', 'dependency-recovery-graph');
    const node = recovered?.nodes.find((candidate) => candidate.id === 'dependent') as TaskGraph['nodes'][number] & { resumeAttemptNumber?: number; resumeAttemptId?: string };
    expect(node.dependencies).toEqual(['upstream']);
    expect(node.contextFrom).toEqual(['upstream']);
    expect(node.status).toBe('awaiting-reconciliation');
    expect(node.attemptedModels).toEqual([]);
    expect(node.resumeAttemptNumber).toBe(1);
    expect(node.resumeAttemptId).toBe('dependency-recovery-graph:dependent:1');
  });
});
