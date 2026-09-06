import type { TaskGraph, TaskNode, TaskNodeStatus } from '@ai-work-partner/shared';

export interface GraphAttemptInput {
  id: string;
  graphId: string;
  nodeId: string;
  tenantId: string;
  attemptNumber: number;
  model: string;
  provider?: string;
  status: 'running' | 'completed' | 'failed';
  promptTokens?: number;
  completionTokens?: number;
  costCents?: number;
  qualityScore?: number;
  escalationReason?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

function nodeToParams(graphId: string, tenantId: string, node: TaskNode) {
  return [
    node.id, graphId, tenantId, node.title, node.prompt, node.domain, node.complexity,
    node.expectedFormat, node.recommendedTier, JSON.stringify(node.dependencies),
    JSON.stringify(node.contextFrom), node.status, node.selectedModel || null,
    JSON.stringify(node.attemptedModels), node.output || null, node.qualityScore ?? null,
    node.costCents || 0, node.tokensIn || 0, node.tokensOut || 0, node.error || null
  ];
}

export async function createTaskGraphRecord(db: D1Database, tenantId: string, graph: TaskGraph, projectId?: string) {
  await db.prepare(`
    INSERT INTO task_graphs (id, tenant_id, root_task_id, project_id, goal, status, execution_version, created_at, started_at, completed_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(graph.id, tenantId, graph.rootTaskId, projectId || null, graph.goal,
    'pending', 1, graph.createdAt, null, graph.completedAt || null).run();

  for (const node of graph.nodes) {
    await db.prepare(`
      INSERT INTO task_graph_nodes (
        id, graph_id, tenant_id, title, prompt, domain, complexity, expected_format,
        recommended_tier, dependencies_json, context_from_json, status, selected_model,
        attempted_models_json, output, quality_score, cost_cents, tokens_in, tokens_out, error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(...nodeToParams(graph.id, tenantId, node)).run();
  }
}

export async function updateTaskGraphRecord(
  db: D1Database,
  tenantId: string,
  graph: TaskGraph,
  status: 'pending' | 'running' | 'completed' | 'failed' | 'blocked',
  activeNodeId?: string,
  lastError?: string
) {
  await db.prepare(`
    UPDATE task_graphs
    SET status = ?, active_node_id = ?, last_error = ?,
        started_at = CASE WHEN started_at IS NULL AND ? = 'running' THEN CURRENT_TIMESTAMP ELSE started_at END,
        completed_at = CASE WHEN ? IN ('completed', 'failed', 'blocked') THEN CURRENT_TIMESTAMP ELSE completed_at END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND tenant_id = ?
  `).bind(status, activeNodeId || null, lastError || null, status, status, graph.id, tenantId).run();
}

export async function updateTaskGraphNode(db: D1Database, tenantId: string, graphId: string, node: TaskNode) {
  await db.prepare(`
    UPDATE task_graph_nodes
    SET status = ?, selected_model = ?, attempted_models_json = ?, output = ?, quality_score = ?,
        cost_cents = ?, tokens_in = ?, tokens_out = ?, error = ?,
        started_at = CASE WHEN started_at IS NULL AND ? = 'running' THEN CURRENT_TIMESTAMP ELSE started_at END,
        completed_at = CASE WHEN ? IN ('completed', 'failed', 'blocked') THEN CURRENT_TIMESTAMP ELSE completed_at END,
        updated_at = CURRENT_TIMESTAMP
    WHERE graph_id = ? AND id = ? AND tenant_id = ?
  `).bind(
    node.status, node.selectedModel || null, JSON.stringify(node.attemptedModels), node.output || null,
    node.qualityScore ?? null, node.costCents || 0, node.tokensIn || 0, node.tokensOut || 0,
    node.error || null, node.status, node.status, graphId, node.id, tenantId
  ).run();
}

export async function createTaskGraphAttempt(db: D1Database, attempt: GraphAttemptInput) {
  await db.prepare(`
    INSERT INTO task_graph_attempts (
      id, graph_id, node_id, tenant_id, attempt_number, model, provider, status,
      prompt_tokens, completion_tokens, cost_cents, quality_score, escalation_reason,
      error, started_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    attempt.id, attempt.graphId, attempt.nodeId, attempt.tenantId, attempt.attemptNumber,
    attempt.model, attempt.provider || null, attempt.status, attempt.promptTokens || 0,
    attempt.completionTokens || 0, attempt.costCents || 0, attempt.qualityScore ?? null,
    attempt.escalationReason || null, attempt.error || null,
    attempt.startedAt || new Date().toISOString(), attempt.completedAt || null
  ).run();
}

export async function updateTaskGraphAttempt(
  db: D1Database,
  tenantId: string,
  attemptId: string,
  updates: Partial<Omit<GraphAttemptInput, 'id' | 'graphId' | 'nodeId' | 'tenantId' | 'attemptNumber'>>
) {
  const fields: Record<string, string> = {
    model: 'model', provider: 'provider', status: 'status', promptTokens: 'prompt_tokens',
    completionTokens: 'completion_tokens', costCents: 'cost_cents', qualityScore: 'quality_score',
    escalationReason: 'escalation_reason', error: 'error', startedAt: 'started_at', completedAt: 'completed_at'
  };
  const keys = Object.keys(updates).filter((key) => fields[key]);
  if (!keys.length) return;
  const set = keys.map((key) => `${fields[key]} = ?`).join(', ');
  await db.prepare(`UPDATE task_graph_attempts SET ${set} WHERE id = ? AND tenant_id = ?`)
    .bind(...keys.map((key) => (updates as any)[key] ?? null), attemptId, tenantId).run();
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function mapNode(row: any): TaskNode {
  return {
    id: row.id, title: row.title, prompt: row.prompt, domain: row.domain,
    complexity: row.complexity, expectedFormat: row.expected_format,
    recommendedTier: row.recommended_tier,
    dependencies: parseJson<string[]>(row.dependencies_json, []),
    contextFrom: parseJson<string[]>(row.context_from_json, []),
    status: row.status as TaskNodeStatus,
    selectedModel: row.selected_model || undefined,
    attemptedModels: parseJson<string[]>(row.attempted_models_json, []),
    output: row.output || undefined, qualityScore: row.quality_score ?? undefined,
    costCents: row.cost_cents || 0, tokensIn: row.tokens_in || 0,
    tokensOut: row.tokens_out || 0, error: row.error || undefined
  };
}

export async function getTaskGraph(db: D1Database, tenantId: string, graphId: string): Promise<TaskGraph | null> {
  const graph = await db.prepare(`SELECT * FROM task_graphs WHERE id = ? AND tenant_id = ?`).bind(graphId, tenantId).first<any>();
  if (!graph) return null;
  const nodes = await db.prepare(`SELECT * FROM task_graph_nodes WHERE graph_id = ? AND tenant_id = ? ORDER BY rowid ASC`)
    .bind(graphId, tenantId).all<any>();
  return {
    id: graph.id, rootTaskId: graph.root_task_id, goal: graph.goal,
    nodes: (nodes.results || []).map(mapNode), createdAt: graph.created_at,
    completedAt: graph.completed_at || undefined
  };
}

export async function listTaskGraphs(db: D1Database, tenantId: string, limit = 50, offset = 0) {
  const result = await db.prepare(`
    SELECT g.*, COUNT(n.id) AS node_count,
      SUM(CASE WHEN n.status = 'completed' THEN 1 ELSE 0 END) AS completed_nodes
    FROM task_graphs g LEFT JOIN task_graph_nodes n ON n.graph_id = g.id
    WHERE g.tenant_id = ? GROUP BY g.id ORDER BY g.created_at DESC LIMIT ? OFFSET ?
  `).bind(tenantId, limit, offset).all<any>();
  return result.results || [];
}

export async function getTaskGraphAttempts(db: D1Database, tenantId: string, graphId: string) {
  const result = await db.prepare(`
    SELECT * FROM task_graph_attempts WHERE graph_id = ? AND tenant_id = ? ORDER BY started_at ASC, attempt_number ASC
  `).bind(graphId, tenantId).all<any>();
  return result.results || [];
}
