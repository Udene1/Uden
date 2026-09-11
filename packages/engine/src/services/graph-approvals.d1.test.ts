import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import type { D1Database } from '@cloudflare/workers-types';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { persistGraph, getPersistedGraph } from './graph-persistence';
import { gateGraphNodeForApproval } from './graph-executor';
import { requestGraphNodeApproval, approveGraphNode, rejectGraphNode, listGraphApprovals } from './graph-approvals';
import { hasPrincipalPermission, requirePrincipalPermission } from './permissions';
import type { TaskGraph } from '@ai-work-partner/shared';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const execSqlFile = async (db: D1Database, path: string) => { const sql = await readFile(path, 'utf8'); for (const statement of sql.replace(/^\uFEFF/, '').replace(/^[\t ]*--[^\r\n]*(?:\r?\n|$)/gm, '').split(';').map(s => s.trim()).filter(Boolean)) await db.prepare(statement).run(); };

describe('graph approvals D1 integration', () => {
  let db: D1Database; let dispose: (() => Promise<void>) | undefined;
  beforeAll(async () => { const platform = await getPlatformProxy({ configPath: resolve(root, 'wrangler.test.jsonc'), persist: false }); db = platform.env.DB as D1Database; dispose = platform.dispose; await execSqlFile(db, resolve(here, '../db/schema.sql')); for (const migration of ['0002_task_graph_persistence.sql','0003_graph_durable_execution.sql','0010_graph_node_approvals.sql','0011_runtime_job_linkage.sql','0012_graph_node_tool_persistence.sql','0013_graph_verification_repair.sql','0016_execution_principal.sql','0017_durable_graph_approvals.sql']) await execSqlFile(db, resolve(root, `migrations/${migration}`)); await db.prepare('INSERT INTO tenants (id,name,email,api_key_hash) VALUES (?,?,?,?)').bind('approval-tenant','Approval Tenant','approval@example.test','approval-hash').run(); await db.prepare('INSERT INTO tenant_members (tenant_id,subject,role) VALUES (?,?,?)').bind('approval-tenant','user:authorized','admin').run(); });
  afterAll(async () => { await dispose?.(); });
  it('authorizes durable approval actions by authenticated principal, not a caller-supplied actor', async () => { expect(await hasPrincipalPermission(db,'approval-tenant','graph:resume','user:authorized')).toBe(true); expect(await hasPrincipalPermission(db,'approval-tenant','graph:resume','user:unauthorized')).toBe(false); await expect(requirePrincipalPermission(db,'approval-tenant','graph:resume','user:unauthorized')).rejects.toThrow('Forbidden'); await expect(requirePrincipalPermission(db,'approval-tenant','graph:resume','user:authorized')).resolves.toBeUndefined(); expect(await hasPrincipalPermission(db,'approval-tenant','graph:resume','user:authorized')).toBe(true); expect(await hasPrincipalPermission(db,'other-tenant','graph:resume','user:authorized')).toBe(false); });
  it('persists pending approval and atomically transitions to approved', async () => {
    const graph: TaskGraph = { id: 'approval-graph', rootTaskId: 'approval-task', goal: 'approve a project change', executionPrincipal:'api-key:approval-principal', createdAt: new Date().toISOString(), nodes: [{ id: 'change', title: 'Change project', prompt: 'change it', domain: 'code', complexity: 1, expectedFormat: 'code', recommendedTier: 1, dependencies: [], contextFrom: [], status: 'ready', attemptedModels: [] }] };
    await db.prepare('INSERT INTO tasks (id,tenant_id,prompt,status,mode,escalation_count,created_at) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP)').bind('approval-task','approval-tenant','approve a project change','processing','permissionless',0).run(); await persistGraph(db, 'approval-tenant', graph, undefined, { owner: graph.id });
    const pending = await requestGraphNodeApproval(db, 'approval-tenant', graph.id, 'change', 'Production mutation','api-key:approval-principal'); expect(pending.nodes[0].status).toBe('awaiting-approval'); expect(pending.nodes[0].approvalState).toBe('pending');
    const requests=await listGraphApprovals(db,'approval-tenant',graph.id); expect(requests).toHaveLength(1); expect(requests[0].status).toBe('pending'); expect(requests[0].requested_by).toBe('api-key:approval-principal');
    const approved = await approveGraphNode(db, 'approval-tenant', graph.id, 'change', 'admin@example.test'); expect(approved.nodes[0].status).toBe('ready'); expect(approved.nodes[0].approvalState).toBe('approved'); expect(approved.nodes[0].approvedBy).toBe('admin@example.test');
    const decided=await listGraphApprovals(db,'approval-tenant',graph.id); expect(decided[0].status).toBe('approved'); expect(decided[0].decided_by).toBe('admin@example.test');
    const persisted = await getPersistedGraph(db, 'approval-tenant', graph.id); expect(persisted?.executionPrincipal).toBe('api-key:approval-principal'); expect(persisted?.nodes[0].approvalState).toBe('approved'); await expect(approveGraphNode(db, 'approval-tenant', graph.id, 'change', 'second-admin')).rejects.toThrow('Graph node is not awaiting approval');
  });
  it('rejects an approval request without granting execution', async () => {
    const graph: TaskGraph = { id: 'reject-graph', rootTaskId: 'reject-task', goal: 'reject a change', createdAt: new Date().toISOString(), nodes: [{ id: 'change', title: 'Dangerous change', prompt: 'change it', domain: 'code', complexity: 1, expectedFormat: 'code', recommendedTier: 1, dependencies: [], contextFrom: [], status: 'ready', attemptedModels: [] }] };
    await db.prepare('INSERT INTO tasks (id,tenant_id,prompt,status,mode,escalation_count,created_at) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP)').bind('reject-task','approval-tenant','reject a change','processing','permissionless',0).run(); await persistGraph(db, 'approval-tenant', graph); await requestGraphNodeApproval(db, 'approval-tenant', graph.id, 'change'); const rejected = await rejectGraphNode(db, 'approval-tenant', graph.id, 'change', 'admin@example.test', 'Not safe'); expect(rejected.nodes[0].status).toBe('failed'); expect(rejected.nodes[0].approvalState).toBe('rejected'); expect(rejected.nodes[0].error).toBe('Not safe'); const requests=await listGraphApprovals(db,'approval-tenant',graph.id); expect(requests[0].status).toBe('rejected'); expect(requests[0].decision_reason).toBe('Not safe');
  });
  it('automatically gates a mutation tool before execution', async () => { const node: TaskGraph['nodes'][number] = { id: 'patch', title: 'Apply change', prompt: 'apply patch', domain: 'code', complexity: 1, expectedFormat: 'code', recommendedTier: 1, dependencies: [], contextFrom: [], status: 'ready', attemptedModels: [], kind: 'project-tool', tool: 'patch', toolInput: { files: [] } }; expect(gateGraphNodeForApproval(node)).toBe(true); expect(node.status).toBe('awaiting-approval'); expect(node.approvalRequired).toBe(true); expect(node.approvalState).toBe('pending'); expect(gateGraphNodeForApproval(node)).toBe(false); node.approvalState = 'approved'; node.status = 'ready'; expect(gateGraphNodeForApproval(node)).toBe(false); expect(node.status).toBe('ready'); });
});
