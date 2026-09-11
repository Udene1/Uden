import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import type { D1Database } from '@cloudflare/workers-types';
import { resolve } from 'node:path';
import { getPersistedGraph, persistGraph } from './graph-persistence';
import type { TaskGraph } from '@ai-work-partner/shared';
import { applyCurrentD1Schema } from '../test/d1-bootstrap';

describe.sequential('durable graph attempt recovery D1 integration', () => {
  let db: D1Database;
  let dispose: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const engineRoot = resolve(process.cwd());
    const platform = await getPlatformProxy({ configPath: resolve(engineRoot, 'wrangler.test.jsonc'), persist: false });
    db = platform.env.DB as D1Database;
    dispose = platform.dispose;
    await applyCurrentD1Schema(db, engineRoot);
    await db.prepare(`INSERT INTO tenants (id,name,email,api_key_hash,monthly_budget_cents) VALUES (?,?,?,?,?)`).bind('attempt-recovery-tenant','Attempt Recovery','attempt-recovery@example.test','attempt-recovery-hash',10000).run();
    await db.prepare(`INSERT INTO tasks (id,tenant_id,prompt,status) VALUES (?,?,?,?)`).bind('attempt-recovery-root','attempt-recovery-tenant','attempt recovery test','processing').run();
    await db.prepare(`INSERT INTO tasks (id,tenant_id,prompt,status) VALUES (?,?,?,?)`).bind('attempt-history-root','attempt-recovery-tenant','attempt history test','processing').run();
  });

  afterAll(async () => { await dispose?.(); });

  it('reconstructs a running provider attempt instead of allocating a new billable attempt', async () => {
    const graph: TaskGraph = {
      id: 'attempt-recovery-graph', rootTaskId: 'attempt-recovery-root', goal: 'recover unresolved provider attempt', createdAt: new Date().toISOString(),
      nodes: [{ id: 'node', title: 'Recover node', prompt: 'finish this work', domain: 'general', complexity: 2, expectedFormat: 'markdown', recommendedTier: 1, dependencies: [], contextFrom: [], status: 'running', selectedModel: 'gpt-4o-mini', attemptedModels: ['gpt-4o-mini'] }],
    };
    await persistGraph(db, 'attempt-recovery-tenant', graph);
    await db.prepare(`INSERT INTO task_graph_attempts (id,graph_id,node_id,tenant_id,attempt_number,model,provider,status,external_outcome,idempotency_key,started_at) VALUES (?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`).bind('attempt-recovery-graph:node:1','attempt-recovery-graph','node','attempt-recovery-tenant',1,'gpt-4o-mini','openai','running','in_flight','uden:attempt-recovery-tenant:attempt-recovery-graph:node:1').run();
    const recovered = await getPersistedGraph(db, 'attempt-recovery-tenant', 'attempt-recovery-graph');
    const node = recovered?.nodes[0] as (TaskGraph['nodes'][number] & { resumeAttemptNumber?: number; resumeAttemptModel?: string; resumeAttemptId?: string; resumeAttemptExternalOutcome?: string }) | undefined;
    expect(node?.status).toBe('ready');
    expect(node?.attemptedModels).toEqual([]);
    expect(node?.resumeAttemptNumber).toBe(1);
    expect(node?.resumeAttemptModel).toBe('gpt-4o-mini');
    expect(node?.resumeAttemptId).toBe('attempt-recovery-graph:node:1');
    expect(node?.resumeAttemptExternalOutcome).toBe('in_flight');
  });

  it('preserves completed history while reusing only the unresolved latest attempt', async () => {
    const graph: TaskGraph = { id: 'attempt-history-graph', rootTaskId: 'attempt-history-root', goal: 'preserve attempt history', createdAt: new Date().toISOString(), nodes: [{ id: 'node', title: 'History node', prompt: 'work', domain: 'general', complexity: 2, expectedFormat: 'markdown', recommendedTier: 1, dependencies: [], contextFrom: [], status: 'running', attemptedModels: ['gpt-4o-mini', 'gpt-4o'] }] };
    await persistGraph(db, 'attempt-recovery-tenant', graph);
    for (const attempt of [['attempt-history-graph:node:1',1,'gpt-4o-mini','completed','completed'],['attempt-history-graph:node:2',2,'gpt-4o','running','unknown']]) {
      await db.prepare(`INSERT INTO task_graph_attempts (id,graph_id,node_id,tenant_id,attempt_number,model,provider,status,external_outcome) VALUES (?,?,?,?,?,?,?,?,?)`).bind(attempt[0],'attempt-history-graph','node','attempt-recovery-tenant',attempt[1],attempt[2],'openai',attempt[3],attempt[4]).run();
    }
    const recovered = await getPersistedGraph(db, 'attempt-recovery-tenant', 'attempt-history-graph');
    const node = recovered?.nodes[0] as TaskGraph['nodes'][number] & { resumeAttemptNumber?: number; resumeAttemptModel?: string };
    expect(node.status).toBe('ready');
    expect(node.attemptedModels).toEqual(['gpt-4o-mini']);
    expect(node.resumeAttemptNumber).toBe(2);
    expect(node.resumeAttemptModel).toBe('gpt-4o');
  });
});