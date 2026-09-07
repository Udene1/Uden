import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import type { D1Database } from '@cloudflare/workers-types';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { persistGraph, getPersistedGraph } from './graph-persistence';
import { requestGraphNodeApproval, approveGraphNode, rejectGraphNode } from './graph-approvals';
import type { TaskGraph } from '@ai-work-partner/shared';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const execSqlFile = async (db: D1Database, path: string) => { const sql = await readFile(path, 'utf8'); for (const statement of sql.replace(/^\uFEFF/, '').replace(/^[\t ]*--[^\r\n]*(?:\r?\n|$)/gm, '').split(';').map(s => s.trim()).filter(Boolean)) await db.prepare(statement).run(); };

describe('graph approvals D1 integration', () => {
  let db: D1Database; let dispose: (() => Promise<void>) | undefined;
  beforeAll(async () => { const platform = await getPlatformProxy({ configPath: resolve(root, 'wrangler.jsonc'), persist: false }); db = platform.env.DB as D1Database; dispose = platform.dispose; await execSqlFile(db, resolve(here, '../db/schema.sql')); await execSqlFile(db, resolve(root, 'migrations/0002_task_graph_persistence.sql')); await execSqlFile(db, resolve(root, 'migrations/0003_graph_durable_execution.sql')); await execSqlFile(db, resolve(root, 'migrations/0010_graph_node_approvals.sql')); await db.prepare('INSERT INTO tenants (id,name,email,api_key_hash) VALUES (?,?,?,?)').bind('approval-tenant','Approval Tenant','approval@example.test','approval-hash').run(); });
  afterAll(async () => { await dispose?.(); });
  it('persists pending approval and atomically transitions to approved', async () => {
    const graph: TaskGraph = { id: 'approval-graph', rootTaskId: 'approval-task', goal: 'approve a project change', createdAt: new Date().toISOString(), nodes: [{ id: 'change', title: 'Change project', prompt: 'change it', domain: 'code', complexity: 1, expectedFormat: 'code', recommendedTier: 1, dependencies: [], contextFrom: [], status: 'ready', attemptedModels: [] }] };
    await db.prepare('INSERT INTO tasks (id,tenant_id,prompt,status,mode,escalation_count,created_at) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP)').bind('approval-task','approval-tenant','approve a project change','processing','permissionless',0).run();
    await persistGraph(db, 'approval-tenant', graph, undefined, { owner: graph.id });
    const pending = await requestGraphNodeApproval(db, 'approval-tenant', graph.id, 'change', 'Production mutation');
    expect(pending.nodes[0].status).toBe('awaiting-approval'); expect(pending.nodes[0].approvalState).toBe('pending');
    const approved = await approveGraphNode(db, 'approval-tenant', graph.id, 'change', 'admin@example.test');
    expect(approved.nodes[0].status).toBe('ready'); expect(approved.nodes[0].approvalState).toBe('approved'); expect(approved.nodes[0].approvedBy).toBe('admin@example.test');
    const persisted = await getPersistedGraph(db, 'approval-tenant', graph.id); expect(persisted?.nodes[0].approvalState).toBe('approved');
    await expect(approveGraphNode(db, 'approval-tenant', graph.id, 'change', 'second-admin')).rejects.toThrow('Graph node is not awaiting approval');
  });
  it('rejects an approval request without granting execution', async () => {
    const graph: TaskGraph = { id: 'reject-graph', rootTaskId: 'reject-task', goal: 'reject a change', createdAt: new Date().toISOString(), nodes: [{ id: 'change', title: 'Dangerous change', prompt: 'change it', domain: 'code', complexity: 1, expectedFormat: 'code', recommendedTier: 1, dependencies: [], contextFrom: [], status: 'ready', attemptedModels: [] }] };
    await db.prepare('INSERT INTO tasks (id,tenant_id,prompt,status,mode,escalation_count,created_at) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP)').bind('reject-task','approval-tenant','reject a change','processing','permissionless',0).run();
    await persistGraph(db, 'approval-tenant', graph);
    await requestGraphNodeApproval(db, 'approval-tenant', graph.id, 'change');
    const rejected = await rejectGraphNode(db, 'approval-tenant', graph.id, 'change', 'admin@example.test', 'Not safe');
    expect(rejected.nodes[0].status).toBe('failed'); expect(rejected.nodes[0].approvalState).toBe('rejected'); expect(rejected.nodes[0].error).toBe('Not safe');
  });
});
