import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { requirePermission, writeAudit } from '../services/permissions';
import { requestGraphNodeApproval, approveAndResumeGraph, rejectGraphNode } from '../services/graph-approvals';
import { sanitizeError } from '../services/observability';

export const approvalRoutes = new Hono<HonoEnv>();

approvalRoutes.post('/graphs/:graphId/nodes/:nodeId/request', async c => {
  const tenantId = c.get('tenantId');
  try {
    await requirePermission(c.env.DB, tenantId, 'graph:execute');
    const body = await c.req.json().catch(() => ({}));
    const graph = await requestGraphNodeApproval(c.env.DB, tenantId, c.req.param('graphId'), c.req.param('nodeId'), typeof body.reason === 'string' ? body.reason : undefined);
    await writeAudit(c.env.DB, tenantId, 'graph.node.approval.requested', 'task_graph_node', `${c.req.param('graphId')}:${c.req.param('nodeId')}`, undefined, c.get('requestId'), { graphId: c.req.param('graphId'), nodeId: c.req.param('nodeId') });
    return c.json({ graph }, 200);
  } catch (error) { const message = sanitizeError(error); return c.json({ error: message }, message === 'Forbidden' ? 403 : 409); }
});

approvalRoutes.post('/graphs/:graphId/nodes/:nodeId/approve', async c => {
  const tenantId = c.get('tenantId');
  try {
    await requirePermission(c.env.DB, tenantId, 'graph:resume');
    const body = await c.req.json().catch(() => ({}));
    const approvedBy = typeof body.approvedBy === 'string' ? body.approvedBy : 'tenant-api-key';
    const result = await approveAndResumeGraph(c.env.DB, c.env, tenantId, c.req.param('graphId'), c.req.param('nodeId'), approvedBy);
    await writeAudit(c.env.DB, tenantId, 'graph.node.approval.approved', 'task_graph_node', `${c.req.param('graphId')}:${c.req.param('nodeId')}`, undefined, c.get('requestId'), { graphId: c.req.param('graphId'), nodeId: c.req.param('nodeId'), approvedBy });
    return c.json(result, 200);
  } catch (error) { const message = sanitizeError(error); return c.json({ error: message }, message === 'Forbidden' ? 403 : 409); }
});

approvalRoutes.post('/graphs/:graphId/nodes/:nodeId/reject', async c => {
  const tenantId = c.get('tenantId');
  try {
    await requirePermission(c.env.DB, tenantId, 'graph:resume');
    const body = await c.req.json().catch(() => ({}));
    const rejectedBy = typeof body.rejectedBy === 'string' ? body.rejectedBy : 'tenant-api-key';
    const graph = await rejectGraphNode(c.env.DB, tenantId, c.req.param('graphId'), c.req.param('nodeId'), rejectedBy, typeof body.reason === 'string' ? body.reason : undefined);
    await writeAudit(c.env.DB, tenantId, 'graph.node.approval.rejected', 'task_graph_node', `${c.req.param('graphId')}:${c.req.param('nodeId')}`, undefined, c.get('requestId'), { graphId: c.req.param('graphId'), nodeId: c.req.param('nodeId'), rejectedBy });
    return c.json({ graph }, 200);
  } catch (error) { const message = sanitizeError(error); return c.json({ error: message }, message === 'Forbidden' ? 403 : 409); }
});
