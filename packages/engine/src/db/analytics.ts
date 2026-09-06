export async function getGraphAnalytics(db: D1Database, tenantId: string) {
  const byDomain = await db.prepare(`SELECT n.domain, COUNT(*) node_count, SUM(n.cost_cents) cost_cents, AVG(n.quality_score) quality_score, SUM(CASE WHEN n.status='completed' THEN 1 ELSE 0 END) completed_nodes, SUM(CASE WHEN n.status IN ('failed','blocked') THEN 1 ELSE 0 END) failed_or_blocked_nodes FROM task_graph_nodes n WHERE n.tenant_id=? GROUP BY n.domain ORDER BY cost_cents DESC`).bind(tenantId).all<any>();
  const byModel = await db.prepare(`SELECT a.model, COUNT(*) attempts, SUM(a.cost_cents) cost_cents, AVG(a.quality_score) quality_score, SUM(CASE WHEN a.status='failed' THEN 1 ELSE 0 END) failures FROM task_graph_attempts a WHERE a.tenant_id=? GROUP BY a.model ORDER BY cost_cents DESC`).bind(tenantId).all<any>();
  const byGraph = await db.prepare(`SELECT g.id graph_id,g.goal,g.status,g.created_at,g.completed_at,COALESCE(SUM(n.cost_cents),0) cost_cents,COALESCE(SUM(n.tokens_in),0) tokens_in,COALESCE(SUM(n.tokens_out),0) tokens_out,AVG(n.quality_score) quality_score,COUNT(n.id) node_count,SUM(CASE WHEN n.status='completed' THEN 1 ELSE 0 END) completed_nodes,SUM(CASE WHEN n.status='blocked' THEN 1 ELSE 0 END) blocked_nodes FROM task_graphs g LEFT JOIN task_graph_nodes n ON n.graph_id=g.id AND n.tenant_id=g.tenant_id WHERE g.tenant_id=? GROUP BY g.id ORDER BY g.created_at DESC LIMIT 100`).bind(tenantId).all<any>();
  const totals = await db.prepare(`SELECT COUNT(*) graphs, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) completed_graphs, SUM(CASE WHEN status IN ('failed','blocked') THEN 1 ELSE 0 END) failed_graphs FROM task_graphs WHERE tenant_id=?`).bind(tenantId).first<any>();
  const escalations = await db.prepare(`SELECT COUNT(*) attempts, SUM(CASE WHEN attempt_number>1 THEN 1 ELSE 0 END) escalated_attempts, AVG(CASE WHEN attempt_number>1 THEN quality_score END) escalated_quality FROM task_graph_attempts WHERE tenant_id=?`).bind(tenantId).first<any>();
  return { totals: totals || {}, escalation: escalations || {}, byDomain: byDomain.results || [], byModel: byModel.results || [], recentGraphs: byGraph.results || [] };
}

export async function getRoutingSavings(db: D1Database, tenantId: string) {
  const row = await db.prepare(`SELECT COALESCE(SUM(cost_cents),0) actual_cost, COALESCE(SUM(CASE WHEN a.attempt_number=1 THEN a.cost_cents ELSE 0 END),0) primary_cost, COUNT(*) attempts FROM task_graph_attempts a WHERE a.tenant_id=?`).bind(tenantId).first<any>();
  const actual = Number(row?.actual_cost || 0), primary = Number(row?.primary_cost || 0);
  return { actualCostCents: actual, primaryAttemptCostCents: primary, escalationCostCents: Math.max(0, actual-primary), routingSavingsCents: 0 };
}
