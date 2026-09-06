import { Tenant, Project, Task, EscalationLog, UsageRecord, RoutingPlan, TaskProposal } from '@ai-work-partner/shared';

// ─────────────────────────────────────────────
// Tenant Queries
// ─────────────────────────────────────────────

export async function createTenant(db: D1Database, tenant: Tenant) {
  await db.prepare(`
    INSERT INTO tenants (id, name, email, api_key_hash, quality_preference, monthly_budget_cents, mode, bring_own_keys, provider_keys_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(tenant.id, tenant.name, tenant.email || '', tenant.apiKeyHash, tenant.qualityPreference || 'balanced', tenant.monthlyBudgetCents || 10000, tenant.defaultMode || 'permissionless', tenant.bringOwnKeys ? 1 : 0, tenant.providerKeys ? JSON.stringify(tenant.providerKeys) : null).run();
}

export async function getTenantByApiKey(db: D1Database, apiKeyHash: string): Promise<Tenant | null> { const row = await db.prepare(`SELECT * FROM tenants WHERE api_key_hash = ?`).bind(apiKeyHash).first<any>(); return row ? mapTenantRow(row) : null; }
export async function getTenantById(db: D1Database, id: string): Promise<Tenant | null> { const row = await db.prepare(`SELECT * FROM tenants WHERE id = ?`).bind(id).first<any>(); return row ? mapTenantRow(row) : null; }

export async function updateTenant(db: D1Database, id: string, updates: Partial<Tenant>) {
  const keyMap: Record<string, string> = { name: 'name', email: 'email', qualityPreference: 'quality_preference', monthlyBudgetCents: 'monthly_budget_cents', defaultMode: 'mode', bringOwnKeys: 'bring_own_keys', apiKeyHash: 'api_key_hash', providerKeys: 'provider_keys_json' };
  const keys = Object.keys(updates).filter(k => keyMap[k]); if (!keys.length) return;
  const values = keys.map(k => { const val = (updates as any)[k]; if (k === 'bringOwnKeys') return val ? 1 : 0; if (k === 'providerKeys') return val ? JSON.stringify(val) : null; return val; });
  await db.prepare(`UPDATE tenants SET ${keys.map(k => `${keyMap[k]} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(...values, id).run();
}

function mapTenantRow(row: any): Tenant { let providerKeys; if (row.provider_keys_json) { try { providerKeys = JSON.parse(row.provider_keys_json); } catch { providerKeys = undefined; } } return { id: row.id, name: row.name, email: row.email || '', apiKeyHash: row.api_key_hash, qualityPreference: row.quality_preference || 'balanced', monthlyBudgetCents: row.monthly_budget_cents ?? 10000, defaultMode: row.mode || 'permissionless', bringOwnKeys: Boolean(row.bring_own_keys), providerKeys, createdAt: row.created_at, updatedAt: row.updated_at || row.created_at }; }

// ─────────────────────────────────────────────
// Project Queries
// ─────────────────────────────────────────────

export async function createProject(db: D1Database, project: Project) { await db.prepare(`INSERT INTO projects (id, tenant_id, name, description, context) VALUES (?, ?, ?, ?, ?)`).bind(project.id, project.tenantId, project.name, project.description || null, project.context || null).run(); }
export async function getProjects(db: D1Database, tenantId: string): Promise<Project[]> { const r = await db.prepare(`SELECT * FROM projects WHERE tenant_id = ? ORDER BY created_at DESC`).bind(tenantId).all<any>(); return (r.results || []).map(row => ({ id: row.id, tenantId: row.tenant_id, name: row.name, description: row.description, context: row.context, createdAt: row.created_at, updatedAt: row.updated_at || row.created_at })); }
export async function getProjectById(db: D1Database, id: string, tenantId: string): Promise<Project | null> { const row = await db.prepare(`SELECT * FROM projects WHERE id = ? AND tenant_id = ?`).bind(id, tenantId).first<any>(); return row ? { id: row.id, tenantId: row.tenant_id, name: row.name, description: row.description, context: row.context, createdAt: row.created_at, updatedAt: row.updated_at || row.created_at } : null; }

// ─────────────────────────────────────────────
// Task Queries
// ─────────────────────────────────────────────

export async function createTask(db: D1Database, task: Task, routingPlan?: RoutingPlan) {
  await db.prepare(`INSERT INTO tasks (id, tenant_id, project_id, prompt, mode, status, classified_tier, classified_domain, classified_complexity, expected_format, model_used, output, proposal_json, routing_plan_json, quality_score, total_cost_cents, tokens_in, tokens_out, escalation_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(task.id, task.tenantId, task.projectId || null, task.prompt, task.mode, task.status, task.classifiedTier || null, task.classifiedDomain || null, task.classifiedComplexity || null, task.expectedFormat || 'markdown', task.modelUsed || null, task.output || null, task.proposal ? JSON.stringify(task.proposal) : null, routingPlan ? JSON.stringify(routingPlan) : null, task.qualityScore || null, task.totalCostCents || 0, task.tokensIn || 0, task.tokensOut || 0, task.escalationCount || 0).run();
}

export async function getTask(db: D1Database, id: string, tenantId: string): Promise<(Task & { routingPlan?: RoutingPlan }) | null> { const row = await db.prepare(`SELECT * FROM tasks WHERE id = ? AND tenant_id = ?`).bind(id, tenantId).first<any>(); return row ? mapTaskRow(row) : null; }
export async function updateTask(db: D1Database, id: string, tenantId: string, updates: Partial<Task> & { routingPlan?: RoutingPlan }) {
  const keyMap: Record<string, string> = { status: 'status', classifiedTier: 'classified_tier', classifiedDomain: 'classified_domain', classifiedComplexity: 'classified_complexity', expectedFormat: 'expected_format', modelUsed: 'model_used', output: 'output', proposal: 'proposal_json', routingPlan: 'routing_plan_json', qualityScore: 'quality_score', totalCostCents: 'total_cost_cents', tokensIn: 'tokens_in', tokensOut: 'tokens_out', escalationCount: 'escalation_count', completedAt: 'completed_at' };
  const keys = Object.keys(updates).filter(k => keyMap[k]); if (!keys.length) return;
  const values = keys.map(k => { const val = (updates as any)[k]; return k === 'proposal' || k === 'routingPlan' ? (val ? JSON.stringify(val) : null) : val; });
  await db.prepare(`UPDATE tasks SET ${keys.map(k => `${keyMap[k]} = ?`).join(', ')} WHERE id = ? AND tenant_id = ?`).bind(...values, id, tenantId).run();
}
export async function listTasks(db: D1Database, tenantId: string, limit = 50, offset = 0): Promise<Task[]> { const r = await db.prepare(`SELECT * FROM tasks WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(tenantId, limit, offset).all<any>(); return (r.results || []).map(mapTaskRow); }

function mapTaskRow(row: any): Task & { routingPlan?: RoutingPlan } {
  let proposal: TaskProposal | undefined; let routingPlan: RoutingPlan | undefined;
  if (row.proposal_json) { try { proposal = JSON.parse(row.proposal_json); } catch { proposal = undefined; } }
  if (row.routing_plan_json) { try { routingPlan = JSON.parse(row.routing_plan_json); } catch { routingPlan = undefined; } }
  return { id: row.id, tenantId: row.tenant_id, projectId: row.project_id || undefined, prompt: row.prompt, mode: row.mode || 'permissionless', status: row.status, classifiedTier: row.classified_tier || undefined, classifiedDomain: row.classified_domain || undefined, classifiedComplexity: row.classified_complexity || undefined, expectedFormat: row.expected_format || 'markdown', modelUsed: row.model_used || undefined, output: row.output || undefined, proposal, routingPlan, qualityScore: row.quality_score ?? undefined, totalCostCents: row.total_cost_cents ?? 0, tokensIn: row.tokens_in ?? 0, tokensOut: row.tokens_out ?? 0, escalationCount: row.escalation_count || 0, createdAt: row.created_at, completedAt: row.completed_at || undefined };
}

// ─────────────────────────────────────────────
// Escalation & Usage Queries
// ─────────────────────────────────────────────

export async function createEscalationLog(db: D1Database, log: EscalationLog) { await db.prepare(`INSERT INTO escalation_logs (id, task_id, from_model, to_model, reason, quality_score, attempt_number) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(log.id, log.taskId, log.fromModel, log.toModel, log.reason, log.qualityScore, log.attemptNumber).run(); }

export async function createUsageRecord(db: D1Database, record: UsageRecord) {
  await db.prepare(`
    INSERT INTO usage_records (id, tenant_id, task_id, model, provider, tokens_in, tokens_out, cost_cents)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      tenant_id=excluded.tenant_id,
      task_id=excluded.task_id,
      model=excluded.model,
      provider=excluded.provider,
      tokens_in=excluded.tokens_in,
      tokens_out=excluded.tokens_out,
      cost_cents=excluded.cost_cents
  `).bind(record.id, record.tenantId, record.taskId || null, record.model, record.provider, record.tokensIn, record.tokensOut, record.costCents).run();
}

export async function getUsageSummary(db: D1Database, tenantId: string) {
  const totals = await db.prepare(`SELECT COUNT(*) as total_records, COALESCE(SUM(cost_cents), 0) as total_cost, COALESCE(SUM(tokens_in), 0) as total_tokens_in, COALESCE(SUM(tokens_out), 0) as total_tokens_out FROM usage_records WHERE tenant_id = ?`).bind(tenantId).first<any>();
  const taskStats = await db.prepare(`SELECT COUNT(*) as total_tasks, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks, SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_tasks, SUM(escalation_count) as total_escalations, AVG(quality_score) as avg_quality FROM tasks WHERE tenant_id = ?`).bind(tenantId).first<any>();
  const modelCosts = await db.prepare(`SELECT model, SUM(cost_cents) as cost FROM usage_records WHERE tenant_id = ? GROUP BY model`).bind(tenantId).all<any>();
  const providerCosts = await db.prepare(`SELECT provider, SUM(cost_cents) as cost FROM usage_records WHERE tenant_id = ? GROUP BY provider`).bind(tenantId).all<any>();
  const costByModel: Record<string, number> = {}; for (const row of modelCosts.results || []) costByModel[row.model] = row.cost;
  const costByProvider: Record<string, number> = {}; for (const row of providerCosts.results || []) costByProvider[row.provider] = row.cost;
  const totalCost = totals?.total_cost || 0; const totalTasks = taskStats?.total_tasks || 0; const escalationCount = taskStats?.total_escalations || 0;
  return { totalCostCents: Math.round(totalCost * 100) / 100, totalTokensIn: totals?.total_tokens_in || 0, totalTokensOut: totals?.total_tokens_out || 0, totalTasks, completedTasks: taskStats?.completed_tasks || 0, failedTasks: taskStats?.failed_tasks || 0, escalationCount, escalationRate: totalTasks > 0 ? Math.round((escalationCount / totalTasks) * 100) / 100 : 0, averageQualityScore: Math.round((taskStats?.avg_quality || 0) * 10) / 10, costByModel, costByProvider, savingsEstimateCents: 0, budgetUsedPercent: 0 };
}

export async function getDailyUsage(db: D1Database, tenantId: string) { const r = await db.prepare(`SELECT date(created_at) as date, COALESCE(SUM(cost_cents), 0) as cost_cents, COUNT(DISTINCT task_id) as task_count, COALESCE(SUM(tokens_in), 0) as tokens_in, COALESCE(SUM(tokens_out), 0) as tokens_out FROM usage_records WHERE tenant_id = ? GROUP BY date(created_at) ORDER BY date DESC LIMIT 30`).bind(tenantId).all<any>(); return r.results || []; }
export async function getMonthlySpend(db: D1Database, tenantId: string): Promise<number> { const res = await db.prepare(`SELECT COALESCE(SUM(cost_cents), 0) as total_cost FROM usage_records WHERE tenant_id = ? AND created_at >= date('now', 'start of month')`).bind(tenantId).first<{total_cost: number}>(); return res?.total_cost || 0; }
