import { HonoEnv } from '../types';
import { createUsageRecord, getMonthlySpend, getTenantById } from '../db/queries';
import { MODEL_REGISTRY, estimateCost, AIProvider } from '@ai-work-partner/shared';
import type { ExecutionFence } from './execution-side-effects';

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

/** Atomically reserves estimated spend and treats an existing live reservation for the same attempt as idempotent. */
export async function reserveBudget(env: HonoEnv['Bindings'], tenantId: string, amountCents: number, referenceId: string, fence?: ExecutionFence): Promise<boolean> {
  const amount = Math.max(1, Math.ceil(amountCents));
  const fenceClause = fence
    ? `AND EXISTS (SELECT 1 FROM task_graphs WHERE id=? AND tenant_id=? AND execution_owner=? AND execution_version=? AND lease_until>=CURRENT_TIMESTAMP)`
    : '';
  const bindings: unknown[] = [crypto.randomUUID(), tenantId, referenceId, amount, amount, tenantId, tenantId, tenantId];
  if (fence) bindings.push(fence.graphId, tenantId, fence.owner, fence.fenceVersion);
  await env.DB.prepare(`
    INSERT INTO budget_reservations (id, tenant_id, reference_id, amount_cents, status, graph_id, execution_owner, execution_version)
    SELECT ?, ?, ?, ?, 'reserved', ${fence ? '?' : 'NULL'}, ${fence ? '?' : 'NULL'}, ${fence ? '?' : 'NULL'}
    WHERE ? <= (
      COALESCE((SELECT monthly_budget_cents FROM tenants WHERE id=?),10000)
      - COALESCE((SELECT SUM(cost_cents) FROM usage_records WHERE tenant_id=? AND created_at >= datetime('now','start of month')),0)
      - COALESCE((SELECT SUM(amount_cents) FROM budget_reservations WHERE tenant_id=? AND status='reserved' AND created_at >= datetime('now','start of month')),0)
    ) ${fenceClause}
    ON CONFLICT(tenant_id, reference_id) DO NOTHING
  `).bind(...(fence ? [bindings[0], bindings[1], bindings[2], bindings[3], fence.graphId, fence.owner, fence.fenceVersion, bindings[4], bindings[5], bindings[6], bindings[7], ...bindings.slice(8)] : [bindings[0], bindings[1], bindings[2], bindings[3], bindings[4], bindings[5], bindings[6], bindings[7]])).run();

  const row = await env.DB.prepare('SELECT status FROM budget_reservations WHERE tenant_id=? AND reference_id=?').bind(tenantId, referenceId).first<{ status: string }>();
  if (fence && row?.status === 'reserved') {
    const owner = await env.DB.prepare('SELECT graph_id,execution_owner,execution_version FROM budget_reservations WHERE tenant_id=? AND reference_id=?').bind(tenantId, referenceId).first<{ graph_id:string|null; execution_owner:string|null; execution_version:number|null }>();
    if (owner?.graph_id !== fence.graphId || owner.execution_owner !== fence.owner || owner.execution_version !== fence.fenceVersion) return false;
  }
  return row?.status === 'reserved';
}

export async function releaseBudget(env: HonoEnv['Bindings'], tenantId: string, referenceId: string, fence?: ExecutionFence): Promise<void> {
  const result = fence
    ? await env.DB.prepare(`UPDATE budget_reservations SET status='released', released_at=CURRENT_TIMESTAMP WHERE tenant_id=? AND reference_id=? AND status='reserved' AND graph_id=? AND execution_owner=? AND execution_version=? AND EXISTS (SELECT 1 FROM task_graphs WHERE id=? AND tenant_id=? AND execution_owner=? AND execution_version=? AND lease_until>=CURRENT_TIMESTAMP)`).bind(tenantId, referenceId, fence.graphId, fence.owner, fence.fenceVersion, fence.graphId, tenantId, fence.owner, fence.fenceVersion).run()
    : await env.DB.prepare(`UPDATE budget_reservations SET status='released', released_at=CURRENT_TIMESTAMP WHERE tenant_id=? AND reference_id=? AND status='reserved'`).bind(tenantId, referenceId).run();
  if (fence && !result.meta?.changes) {
    const graph = await env.DB.prepare('SELECT execution_owner,execution_version,lease_until FROM task_graphs WHERE id=? AND tenant_id=?').bind(fence.graphId, tenantId).first<{execution_owner:string|null;execution_version:number;lease_until:string|null}>();
    if (!graph || graph.execution_owner !== fence.owner || graph.execution_version !== fence.fenceVersion || !graph.lease_until) throw new Error('Graph execution lease lost while releasing budget');
    const reservation = await env.DB.prepare('SELECT status FROM budget_reservations WHERE tenant_id=? AND reference_id=?').bind(tenantId, referenceId).first<{status:string}>();
    if (reservation?.status === 'reserved') throw new Error('Budget reservation fence mismatch');
  }
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
