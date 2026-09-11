import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { requirePermission, requirePrincipalPermission, writeAudit } from '../services/permissions';
import { requestGraphNodeApproval, approveAndResumeGraph, rejectGraphNode, listGraphApprovals } from '../services/graph-approvals';
import { proposeGraphRepair, approveGraphRepair, rejectGraphRepair, getGraphRepairProposal, listGraphRepairProposals } from '../services/graph-repair-proposals';
import { getPersistedGraph } from '../services/graph-persistence';
import { sanitizeError } from '../services/observability';

export const approvalRoutes = new Hono<HonoEnv>();

approvalRoutes.post('/graphs/:graphId/nodes/:nodeId/request', async c => {
  const tenantId = c.get('tenantId');
  const principal = c.get('executionPrincipal');
  try {
    await requirePrincipalPermission(c.env.DB, tenantId, 'graph:execute', principal);
    const body = await c.req.json().catch(() => ({}));
    const graph = await requestGraphNodeApproval(c.env.DB, tenantId, c.req.param('graphId'), c.req.param('nodeId'), typeof body.reason === 'string' ? body.reason : undefined, principal);
    await writeAudit(c.env.DB, tenantId, 'graph.node.approval.requested', 'task_graph_node', `${c.req.param('graphId')}:${c.req.param('nodeId')}`, principal, c.get('requestId'), { graphId: c.req.param('graphId'), nodeId: c.req.param('nodeId') });
    return c.json({ graph }, 200);
  } catch (error) { const message = sanitizeError(error); return c.json({ error: message }, message === 'Forbidden' ? 403 : 409); }
});

approvalRoutes.get('/graphs/:graphId', async c => { const tenantId=c.get('tenantId'); try { await requirePermission(c.env.DB,tenantId,'graph:read'); return c.json({approvals:await listGraphApprovals(c.env.DB,tenantId,c.req.param('graphId'))},200); } catch(error) { const message=sanitizeError(error); return c.json({error:message},message==='Forbidden'?403:409); } });

approvalRoutes.post('/graphs/:graphId/nodes/:nodeId/approve', async c => {
  const tenantId = c.get('tenantId');
  const principal = c.get('executionPrincipal');
  try {
    await requirePrincipalPermission(c.env.DB, tenantId, 'graph:resume', principal);
    const approvedBy = principal;
    const result = await approveAndResumeGraph(c.env.DB, c.env, tenantId, c.req.param('graphId'), c.req.param('nodeId'), approvedBy);
    await writeAudit(c.env.DB, tenantId, 'graph.node.approval.approved', 'task_graph_node', `${c.req.param('graphId')}:${c.req.param('nodeId')}`, principal, c.get('requestId'), { graphId: c.req.param('graphId'), nodeId: c.req.param('nodeId'), approvedBy });
    return c.json(result, 200);
  } catch (error) { const message = sanitizeError(error); return c.json({ error: message }, message === 'Forbidden' ? 403 : 409); }
});

approvalRoutes.post('/graphs/:graphId/nodes/:nodeId/reject', async c => {
  const tenantId = c.get('tenantId');
  const principal = c.get('executionPrincipal');
  try {
    await requirePrincipalPermission(c.env.DB, tenantId, 'graph:resume', principal);
    const body = await c.req.json().catch(() => ({}));
    const rejectedBy = principal;
    const graph = await rejectGraphNode(c.env.DB, tenantId, c.req.param('graphId'), c.req.param('nodeId'), rejectedBy, typeof body.reason === 'string' ? body.reason : undefined);
    await writeAudit(c.env.DB, tenantId, 'graph.node.approval.rejected', 'task_graph_node', `${c.req.param('graphId')}:${c.req.param('nodeId')}`, principal, c.get('requestId'), { graphId: c.req.param('graphId'), nodeId: c.req.param('nodeId'), rejectedBy });
    return c.json({ graph }, 200);
  } catch (error) { const message = sanitizeError(error); return c.json({ error: message }, message === 'Forbidden' ? 403 : 409); }
});

approvalRoutes.post('/graphs/:graphId/nodes/:nodeId/repair/propose', async c => {
  const tenantId = c.get('tenantId');
  try { await requirePermission(c.env.DB, tenantId, 'graph:execute'); const graph = await getPersistedGraph(c.env.DB, tenantId, c.req.param('graphId')); if (!graph) throw new Error('Graph not found'); const node = graph.nodes.find(candidate => candidate.id === c.req.param('nodeId')); if (!node) throw new Error('Graph node not found'); const proposal = await proposeGraphRepair(c.env, tenantId, graph, node); await writeAudit(c.env.DB, tenantId, 'graph.node.repair.proposed', 'graph_repair_proposal', proposal.id, undefined, c.get('requestId'), { graphId: graph.id, nodeId: node.id, attemptNumber: proposal.attemptNumber }); return c.json({ proposal }, 201); }
  catch (error) { const message = sanitizeError(error); return c.json({ error: message }, message === 'Forbidden' ? 403 : 409); }
});

approvalRoutes.get('/graphs/:graphId/nodes/:nodeId/repairs', async c => { const tenantId=c.get('tenantId'); try { await requirePermission(c.env.DB,tenantId,'graph:read'); return c.json({proposals:await listGraphRepairProposals(c.env.DB,tenantId,c.req.param('graphId'),c.req.param('nodeId'))},200); } catch(error) { const message=sanitizeError(error); return c.json({error:message},message==='Forbidden'?403:409); } });
approvalRoutes.get('/repairs/:proposalId', async c => { const tenantId=c.get('tenantId'); try { await requirePermission(c.env.DB,tenantId,'graph:read'); const proposal=await getGraphRepairProposal(c.env.DB,tenantId,c.req.param('proposalId')); if(!proposal)return c.json({error:'Graph repair proposal not found'},404); return c.json({proposal},200); } catch(error) { const message=sanitizeError(error); return c.json({error:message},message==='Forbidden'?403:409); } });
approvalRoutes.post('/repairs/:proposalId/approve', async c => { const tenantId=c.get('tenantId'); const principal=c.get('executionPrincipal'); try { await requirePrincipalPermission(c.env.DB,tenantId,'graph:resume',principal); const proposal=await approveGraphRepair(c.env,tenantId,c.req.param('proposalId'),principal); await writeAudit(c.env.DB,tenantId,'graph.node.repair.approved','graph_repair_proposal',proposal.id,principal,c.get('requestId'),{graphId:proposal.graphId,nodeId:proposal.nodeId,attemptNumber:proposal.attemptNumber,approvedBy:principal}); return c.json({proposal},200); } catch(error) { const message=sanitizeError(error); return c.json({error:message},message==='Forbidden'?403:409); } });
approvalRoutes.post('/repairs/:proposalId/reject', async c => { const tenantId=c.get('tenantId'); const principal=c.get('executionPrincipal'); try { await requirePrincipalPermission(c.env.DB,tenantId,'graph:resume',principal); const body=await c.req.json().catch(()=>({})); const proposal=await rejectGraphRepair(c.env.DB,tenantId,c.req.param('proposalId'),principal,typeof body.reason==='string'?body.reason:undefined); await writeAudit(c.env.DB,tenantId,'graph.node.repair.rejected','graph_repair_proposal',proposal.id,principal,c.get('requestId'),{graphId:proposal.graphId,nodeId:proposal.nodeId,attemptNumber:proposal.attemptNumber,rejectedBy:principal}); return c.json({proposal},200); } catch(error) { const message=sanitizeError(error); return c.json({error:message},message==='Forbidden'?403:409); } });
