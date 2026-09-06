import { HonoEnv } from '../types';
import { createUsageRecord, getMonthlySpend, getTenantById } from '../db/queries';
import { MODEL_REGISTRY, estimateCost, AIProvider } from '@ai-work-partner/shared';

export async function getBudgetState(env: HonoEnv['Bindings'], tenantId: string): Promise<{ budgetCents: number; spentCents: number; reservedCents: number; availableCents: number }> {
  const tenant = await getTenantById(env.DB, tenantId);
  const budgetCents = tenant?.monthlyBudgetCents || 10000;
  const spentCents = await getMonthlySpend(env.DB, tenantId);
  const row = await env.DB.prepare(`SELECT COALESCE(SUM(amount_cents),0) AS reserved FROM budget_reservations WHERE tenant_id=? AND status='reserved' AND created_at >= datetime('now','start of month')`).bind(tenantId).first<{ reserved: number }>();
  const reservedCents = Number(row?.reserved || 0);
  return { budgetCents, spentCents, reservedCents, availableCents: Math.max(0, budgetCents - spentCents - reservedCents) };
}

export async function checkBudget(env: HonoEnv['Bindings'], tenantId: string): Promise<boolean> {
  const state = await getBudgetState(env, tenantId);
  return state.availableCents > 0;
}

/** Atomically reserves estimated spend using a conditional INSERT ... SELECT. */
export async function reserveBudget(env: HonoEnv['Bindings'], tenantId: string, amountCents: number, referenceId: string): Promise<boolean> {
  const amount = Math.max(1, Math.ceil(amountCents));
  const result = await env.DB.prepare(`
    INSERT INTO budget_reservations (id, tenant_id, reference_id, amount_cents, status)
    SELECT ?, ?, ?, ?, 'reserved'
    WHERE ? <= (
      COALESCE((SELECT monthly_budget_cents FROM tenants WHERE id=?),10000)
      - COALESCE((SELECT SUM(cost_cents) FROM usage_records WHERE tenant_id=? AND created_at >= datetime('now','start of month')),0)
      - COALESCE((SELECT SUM(amount_cents) FROM budget_reservations WHERE tenant_id=? AND status='reserved' AND created_at >= datetime('now','start of month')),0)
    )
  `).bind(crypto.randomUUID(), tenantId, referenceId, amount, amount, tenantId, tenantId, tenantId).run();
  return Boolean(result.meta?.changes);
}

export async function releaseBudget(env: HonoEnv['Bindings'], tenantId: string, referenceId: string): Promise<void> {
  await env.DB.prepare(`UPDATE budget_reservations SET status='released', released_at=CURRENT_TIMESTAMP WHERE tenant_id=? AND reference_id=? AND status='reserved'`).bind(tenantId, referenceId).run();
}

export async function recordUsage(
  env: HonoEnv['Bindings'],
  tenantId: string,
  taskId: string,
  modelId: string,
  tokensIn: number,
  tokensOut: number,
  usageId?: string,
): Promise<number> {
  const modelConfig = MODEL_REGISTRY[modelId];
  const provider: AIProvider = modelConfig ? modelConfig.provider : 'openai';
  const costCents = estimateCost(modelId, tokensIn, tokensOut);
  const graph = await env.DB.prepare('SELECT id FROM task_graphs WHERE root_task_id=? AND tenant_id=? LIMIT 1').bind(taskId, tenantId).first<{ id: string }>();
  if (graph) return costCents;
  await createUsageRecord(env.DB, { id: usageId || crypto.randomUUID(), tenantId, taskId, model: modelId, provider, tokensIn, tokensOut, costCents, createdAt: new Date().toISOString() });
  return costCents;
}
