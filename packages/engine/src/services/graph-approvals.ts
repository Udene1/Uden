import type { TaskGraph } from '@ai-work-partner/shared';
import { getPersistedGraph, persistGraphSnapshot } from './graph-persistence';
import { resumeTaskGraph } from './graph-executor';

export async function requestGraphNodeApproval(db: D1Database, tenantId: string, graphId: string, nodeId: string, reason?: string): Promise<TaskGraph> {
  const graph = await getPersistedGraph(db, tenantId, graphId);
  if (!graph) throw new Error('Graph not found');
  const node = graph.nodes.find(candidate => candidate.id === nodeId);
  if (!node) throw new Error('Graph node not found');
  if (node.status === 'completed') throw new Error('Completed graph nodes cannot be placed on approval hold');
  node.approvalRequired = true;
  node.approvalState = 'pending';
  node.approvalReason = reason?.trim() || node.approvalReason || 'Human approval required before this graph action';
  node.status = 'awaiting-approval';
  await persistGraphSnapshot(db, tenantId, graph, 'running', node.id, node.approvalReason);
  return graph;
}

export async function approveGraphNode(db: D1Database, tenantId: string, graphId: string, nodeId: string, approvedBy: string): Promise<TaskGraph> {
  const graph = await getPersistedGraph(db, tenantId, graphId);
  if (!graph) throw new Error('Graph not found');
  const node = graph.nodes.find(candidate => candidate.id === nodeId);
  if (!node) throw new Error('Graph node not found');
  if (node.approvalState !== 'pending' || node.status !== 'awaiting-approval') throw new Error('Graph node is not awaiting approval');
  node.approvalState = 'approved';
  node.approvedBy = approvedBy.trim().slice(0, 200) || 'unknown';
  node.approvedAt = new Date().toISOString();
  node.status = node.dependencies.length === 0 ? 'ready' : 'pending';
  node.error = undefined;
  await persistGraphSnapshot(db, tenantId, graph, 'running', node.id, null);
  return graph;
}

export async function rejectGraphNode(db: D1Database, tenantId: string, graphId: string, nodeId: string, rejectedBy: string, reason?: string): Promise<TaskGraph> {
  const graph = await getPersistedGraph(db, tenantId, graphId);
  if (!graph) throw new Error('Graph not found');
  const node = graph.nodes.find(candidate => candidate.id === nodeId);
  if (!node) throw new Error('Graph node not found');
  if (node.approvalState !== 'pending' || node.status !== 'awaiting-approval') throw new Error('Graph node is not awaiting approval');
  node.approvalState = 'rejected';
  node.approvedBy = rejectedBy.trim().slice(0, 200) || 'unknown';
  node.approvedAt = new Date().toISOString();
  node.status = 'failed';
  node.error = reason?.trim().slice(0, 1000) || 'Graph node rejected by human approval';
  await persistGraphSnapshot(db, tenantId, graph, 'failed', node.id, node.error);
  return graph;
}

export async function approveAndResumeGraph(db: D1Database, env: Parameters<typeof resumeTaskGraph>[0], tenantId: string, graphId: string, nodeId: string, approvedBy: string): Promise<Awaited<ReturnType<typeof resumeTaskGraph>>> {
  await approveGraphNode(db, tenantId, graphId, nodeId, approvedBy);
  return resumeTaskGraph(env, tenantId, graphId);
}
