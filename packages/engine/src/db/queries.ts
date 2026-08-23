import { Tenant, Project, Task, EscalationLog, UsageRecord } from '@ai-work-partner/shared';

export async function createTenant(db: D1Database, tenant: Tenant) {
  await db.prepare(`INSERT INTO tenants (id, name, email, api_key_hash, quality_preference, monthly_budget_cents, mode) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(tenant.id, tenant.name, tenant.email || '', tenant.apiKeyHash, tenant.qualityPreference || 'balanced', tenant.monthlyBudgetCents || 10000, tenant.defaultMode || 'permissionless')
    .run();
}

export async function getTenantByApiKey(db: D1Database, apiKeyHash: string): Promise<Tenant | null> {
  const row = await db.prepare(`SELECT * FROM tenants WHERE api_key_hash = ?`).bind(apiKeyHash).first<any>();
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    apiKeyHash: row.api_key_hash,
    qualityPreference: row.quality_preference,
    monthlyBudgetCents: row.monthly_budget_cents,
    defaultMode: row.mode,
    bringOwnKeys: Boolean(row.bring_own_keys),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function getTenantById(db: D1Database, id: string): Promise<Tenant | null> {
  const row = await db.prepare(`SELECT * FROM tenants WHERE id = ?`).bind(id).first<any>();
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    apiKeyHash: row.api_key_hash,
    qualityPreference: row.quality_preference,
    monthlyBudgetCents: row.monthly_budget_cents,
    defaultMode: row.mode,
    bringOwnKeys: Boolean(row.bring_own_keys),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function updateTenant(db: D1Database, id: string, updates: Partial<Tenant>) {
  const keyMap: Record<string, string> = {
    name: 'name',
    qualityPreference: 'quality_preference',
    monthlyBudgetCents: 'monthly_budget_cents',
    defaultMode: 'mode',
    bringOwnKeys: 'bring_own_keys',
    apiKeyHash: 'api_key_hash'
  };

  const keys = Object.keys(updates).filter(k => keyMap[k]);
  if (keys.length === 0) return;

  const sets = keys.map(k => `${keyMap[k]} = ?`).join(', ');
  const values = keys.map(k => (updates as any)[k]);

  await db.prepare(`UPDATE tenants SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(...values, id)
    .run();
}

export async function createProject(db: D1Database, project: Project) {
  await db.prepare(`INSERT INTO projects (id, tenant_id, name, description, context) VALUES (?, ?, ?, ?, ?)`)
    .bind(project.id, project.tenantId, project.name, project.description || null, project.context || null)
    .run();
}

export async function getProjects(db: D1Database, tenantId: string): Promise<Project[]> {
  const result = await db.prepare(`SELECT * FROM projects WHERE tenant_id = ?`).bind(tenantId).all<any>();
  return result.results.map(row => ({
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description,
    context: row.context,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at
  }));
}

export async function createTask(db: D1Database, task: Task) {
  await db.prepare(`INSERT INTO tasks (id, tenant_id, project_id, prompt, mode, status, classified_tier, classified_domain, model_used, output, quality_score, total_cost_cents, tokens_in, tokens_out, escalation_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      task.id, task.tenantId, task.projectId || null, task.prompt, task.mode, task.status,
      task.classifiedTier || null, task.classifiedDomain || null, task.modelUsed || null,
      task.output || null, task.qualityScore || null, task.totalCostCents || null,
      task.tokensIn || null, task.tokensOut || null, task.escalationCount || 0
    )
    .run();
}

export async function getTask(db: D1Database, id: string, tenantId: string): Promise<Task | null> {
  const row = await db.prepare(`SELECT * FROM tasks WHERE id = ? AND tenant_id = ?`).bind(id, tenantId).first<any>();
  if (!row) return null;
  return mapTaskRow(row);
}

export async function updateTask(db: D1Database, id: string, tenantId: string, updates: Partial<Task>) {
  const keyMap: Record<string, string> = {
    status: 'status',
    classifiedTier: 'classified_tier',
    classifiedDomain: 'classified_domain',
    modelUsed: 'model_used',
    output: 'output',
    qualityScore: 'quality_score',
    totalCostCents: 'total_cost_cents',
    tokensIn: 'tokens_in',
    tokensOut: 'tokens_out',
    escalationCount: 'escalation_count',
    completedAt: 'completed_at'
  };

  const keys = Object.keys(updates).filter(k => keyMap[k]);
  if (keys.length === 0) return;

  const sets = keys.map(k => `${keyMap[k]} = ?`).join(', ');
  const values = keys.map(k => (updates as any)[k]);

  await db.prepare(`UPDATE tasks SET ${sets} WHERE id = ? AND tenant_id = ?`)
    .bind(...values, id, tenantId)
    .run();
}

export async function listTasks(db: D1Database, tenantId: string, limit = 50, offset = 0): Promise<Task[]> {
  const result = await db.prepare(`SELECT * FROM tasks WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .bind(tenantId, limit, offset).all<any>();
  return result.results.map(mapTaskRow);
}

function mapTaskRow(row: any): Task {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    projectId: row.project_id,
    prompt: row.prompt,
    mode: row.mode,
    status: row.status,
    classifiedTier: row.classified_tier,
    classifiedDomain: row.classified_domain,
    modelUsed: row.model_used,
    output: row.output,
    qualityScore: row.quality_score,
    totalCostCents: row.total_cost_cents,
    tokensIn: row.tokens_in,
    tokensOut: row.tokens_out,
    escalationCount: row.escalation_count || 0,
    createdAt: row.created_at,
    completedAt: row.completed_at
  };
}

export async function createEscalationLog(db: D1Database, log: EscalationLog) {
  await db.prepare(`INSERT INTO escalation_logs (id, task_id, from_model, to_model, reason, quality_score, attempt_number) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(log.id, log.taskId, log.fromModel, log.toModel, log.reason, log.qualityScore, log.attemptNumber)
    .run();
}

export async function createUsageRecord(db: D1Database, record: UsageRecord) {
  await db.prepare(`INSERT INTO usage_records (id, tenant_id, task_id, model, provider, tokens_in, tokens_out, cost_cents) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(record.id, record.tenantId, record.taskId || null, record.model, record.provider, record.tokensIn, record.tokensOut, record.costCents)
    .run();
}

export async function getUsageSummary(db: D1Database, tenantId: string) {
  const res = await db.prepare(`SELECT COUNT(*) as count, SUM(cost_cents) as total_cost FROM usage_records WHERE tenant_id = ?`)
    .bind(tenantId).first<{ count: number; total_cost: number }>();
  return res || { count: 0, total_cost: 0 };
}

export async function getDailyUsage(db: D1Database, tenantId: string) {
  const result = await db.prepare(`
    SELECT date(created_at) as date, SUM(cost_cents) as cost, COUNT(*) as task_count, SUM(tokens_in) as tokens_in, SUM(tokens_out) as tokens_out 
    FROM usage_records 
    WHERE tenant_id = ? 
    GROUP BY date(created_at) 
    ORDER BY date DESC 
    LIMIT 30
  `).bind(tenantId).all<any>();
  return result.results;
}

export async function getMonthlySpend(db: D1Database, tenantId: string): Promise<number> {
  const res = await db.prepare(`
    SELECT SUM(cost_cents) as total_cost 
    FROM usage_records 
    WHERE tenant_id = ? 
    AND created_at >= date('now', 'start of month')
  `).bind(tenantId).first<{total_cost: number}>();
  return res?.total_cost || 0;
}
