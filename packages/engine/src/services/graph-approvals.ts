import type { TaskGraph } from '@ai-work-partner/shared';
import { getPersistedGraph, persistGraphSnapshot } from './graph-persistence';
import { resumeTaskGraph } from './graph-executor';

async function recordApprovalRequest(db:D1Database, tenantId:string, graphId:string, nodeId:string, requestedBy:string, reason:string):Promise<string>{
  const id=crypto.randomUUID();
  await db.prepare(`INSERT INTO graph_approval_requests (id,tenant_id,graph_id,node_id,status,reason,requested_by) VALUES (?,?,?,?,?,?,?) ON CONFLICT(graph_id,node_id) WHERE status='pending' DO NOTHING`).bind(id,tenantId,graphId,nodeId,'pending',reason,requestedBy).run();
  const existing=await db.prepare(`SELECT id FROM graph_approval_requests WHERE tenant_id=? AND graph_id=? AND node_id=? AND status='pending'`).bind(tenantId,graphId,nodeId).first<{id:string}>();
  if(!existing?.id)throw new Error('Unable to persist graph approval request');
  return existing.id;
}

async function decideApproval(db:D1Database, tenantId:string, graphId:string, nodeId:string, status:'approved'|'rejected', decidedBy:string, reason?:string):Promise<void>{
  const row=await db.prepare(`UPDATE graph_approval_requests SET status=?,decided_by=?,decision_reason=?,decided_at=CURRENT_TIMESTAMP WHERE tenant_id=? AND graph_id=? AND node_id=? AND status='pending' RETURNING id`).bind(status,decidedBy,reason||null,tenantId,graphId,nodeId).first<{id:string}>();
  if(!row?.id)throw new Error('Graph approval request is no longer pending');
}

export async function listGraphApprovals(db:D1Database,tenantId:string,graphId:string){const result=await db.prepare(`SELECT * FROM graph_approval_requests WHERE tenant_id=? AND graph_id=? ORDER BY requested_at DESC`).bind(tenantId,graphId).all();return result.results||[];}

export async function requestGraphNodeApproval(db: D1Database, tenantId: string, graphId: string, nodeId: string, reason?: string, requestedBy='system'): Promise<TaskGraph> {
  const graph = await getPersistedGraph(db, tenantId, graphId); if (!graph) throw new Error('Graph not found');
  const node = graph.nodes.find(candidate => candidate.id === nodeId); if (!node) throw new Error('Graph node not found'); if (node.status === 'completed') throw new Error('Completed graph nodes cannot be placed on approval hold');
  node.approvalRequired = true; node.approvalState = 'pending'; node.approvalReason = reason?.trim() || node.approvalReason || 'Human approval required before this graph action'; node.status = 'awaiting-approval';
  await recordApprovalRequest(db,tenantId,graphId,nodeId,requestedBy,node.approvalReason);
  await persistGraphSnapshot(db, tenantId, graph, 'awaiting-approval', node.id, node.approvalReason); return graph;
}

export async function approveGraphNode(db: D1Database, tenantId: string, graphId: string, nodeId: string, approvedBy: string): Promise<TaskGraph> {
  const graph = await getPersistedGraph(db, tenantId, graphId); if (!graph) throw new Error('Graph not found'); const node = graph.nodes.find(candidate => candidate.id === nodeId); if (!node) throw new Error('Graph node not found');
  if (node.approvalState !== 'pending' || node.status !== 'awaiting-approval') throw new Error('Graph node is not awaiting approval');
  await decideApproval(db,tenantId,graphId,nodeId, 'approved', approvedBy.trim().slice(0,200)||'unknown');
  node.approvalState = 'approved'; node.approvedBy = approvedBy.trim().slice(0, 200) || 'unknown'; node.approvedAt = new Date().toISOString(); node.status = node.dependencies.length === 0 ? 'ready' : 'pending'; node.error = undefined;
  await persistGraphSnapshot(db, tenantId, graph, 'running', node.id, null); return graph;
}

export async function rejectGraphNode(db: D1Database, tenantId: string, graphId: string, nodeId: string, rejectedBy: string, reason?: string): Promise<TaskGraph> {
  const graph = await getPersistedGraph(db, tenantId, graphId); if (!graph) throw new Error('Graph not found'); const node = graph.nodes.find(candidate => candidate.id === nodeId); if (!node) throw new Error('Graph node not found');
  if (node.approvalState !== 'pending' || node.status !== 'awaiting-approval') throw new Error('Graph node is not awaiting approval');
  const safeReason=reason?.trim().slice(0,1000)||'Graph node rejected by human approval';
  await decideApproval(db,tenantId,graphId,nodeId,'rejected',rejectedBy.trim().slice(0,200)||'unknown',safeReason);
  node.approvalState = 'rejected'; node.approvedBy = rejectedBy.trim().slice(0, 200) || 'unknown'; node.approvedAt = new Date().toISOString(); node.status = 'failed'; node.error = safeReason;
  await persistGraphSnapshot(db, tenantId, graph, 'failed', node.id, node.error); return graph;
}

export async function approveAndResumeGraph(db: D1Database, env: Parameters<typeof resumeTaskGraph>[0], tenantId: string, graphId: string, nodeId: string, approvedBy: string): Promise<Awaited<ReturnType<typeof resumeTaskGraph>>> { await approveGraphNode(db, tenantId, graphId, nodeId, approvedBy); return resumeTaskGraph(env, tenantId, graphId); }
