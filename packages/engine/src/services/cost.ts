import { HonoEnv } from '../types';
import { createUsageRecord, getMonthlySpend, getTenantById } from '../db/queries';
import { MODEL_REGISTRY, estimateCost, AIProvider } from '@ai-work-partner/shared';
import { recordFencedUsage, type ExecutionFence } from './execution-side-effects';

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
  const graphValues = fence ? [fence.graphId, fence.owner, fence.fenceVersion] : [null, null, null];
  const fenceClause = fence
    ? `AND EXISTS (SELECT 1 FROM task_graphs WHERE id=? AND tenant_id=? AND execution_owner=? AND execution_version=? AND lease_until>=CURRENT_TIMESTAMP)`
    : '';
  const bindings: unknown[] = [
    crypto.randomUUID(), tenantId, referenceId, amount,
    graphValues[0], graphValues[1], graphValues[2],
    amount, tenantId, tenantId, tenantId,
  ];
  if (fence) bindings.push(fence.graphId, tenantId, fence.owner, fence.fenceVersion);
  await env.DB.prepare(`
    INSERT INTO budget_reservations (id, tenant_id, reference_id, amount_cents, status, graph_id, execution_owner, execution_version)
    SELECT ?, ?, ?, ?, 'reserved', ?, ?, ?
    WHERE ? <= (
      COALESCE((SELECT monthly_budget_cents FROM tenants WHERE id=?),10000)
      - COALESCE((SELECT SUM(cost_cents) FROM usage_records WHERE tenant_id=? AND created_at >= datetime('now','start of month')),0)
      - COALESCE((SELECT SUM(amount_cents) FROM budget_reservations WHERE tenant_id=? AND status='reserved' AND created_at >= datetime('now','start of month')),0)
    ) ${fenceClause}
    ON CONFLICT(tenant_id, reference_id) DO NOTHING
  `).bind(...bindings).run();

  const row = await env.DB.prepare('SELECT status,graph_id,execution_owner,execution_version FROM budget_reservations WHERE tenant_id=? AND reference_id=?').bind(tenantId, referenceId).first<{ status: string; graph_id:string|null; execution_owner:string|null; execution_version:number|null }>();
  if (fence && row?.status === 'reserved' && (row.graph_id !== fence.graphId || row.execution_owner !== fence.owner || row.execution_version !== fence.fenceVersion)) return false;
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

export interface UsageTelemetry {
  actualModel?: string;
  requestId?: string;
  cachedTokens?: number;
  reasoningTokens?: number;
}

export async function recordUsage(
  env: HonoEnv['Bindings'],
  tenantId: string,
  taskId: string,
  requestedModelId: string,
  tokensIn: number,
  tokensOut: number,
  usageId?: string,
  telemetry?: UsageTelemetry,
  fence?: ExecutionFence,
): Promise<number> {
  const actualModel = telemetry?.actualModel || requestedModelId;
  const modelConfig = MODEL_REGISTRY[actualModel] || MODEL_REGISTRY[requestedModelId];
  const provider: AIProvider = modelConfig?.provider || (requestedModelId.startsWith('agentrouter/') ? 'agentrouter' : 'openai');
  const pricedModel = MODEL_REGISTRY[actualModel] ? actualModel : (MODEL_REGISTRY[requestedModelId] ? requestedModelId : undefined);
  const costCents = pricedModel ? estimateCost(pricedModel, tokensIn, tokensOut) : 0;
  const record = {
    id: usageId || crypto.randomUUID(),
    tenantId,
    taskId,
    model: requestedModelId,
    actualModel,
    provider,
    requestId: telemetry?.requestId,
    tokensIn,
    tokensOut,
    cachedTokens: telemetry?.cachedTokens || 0,
    reasoningTokens: telemetry?.reasoningTokens || 0,
    costCents,
    pricingModel: pricedModel,
    pricingSource: pricedModel ? 'model-registry' : 'unavailable',
    inputCostPerMillion: pricedModel ? MODEL_REGISTRY[pricedModel].inputCostPerMillion : undefined,
    outputCostPerMillion: pricedModel ? MODEL_REGISTRY[pricedModel].outputCostPerMillion : undefined,
    createdAt: new Date().toISOString(),
  };

  if (fence?.graphId) {
    await recordFencedUsage(env.DB, {
      id: record.id,
      tenantId,
      taskId,
      graphId: fence.graphId,
      model: requestedModelId,
      provider,
      tokensIn,
      tokensOut,
      costCents,
    }, fence);
    await env.DB.prepare(`UPDATE usage_records SET actual_model=?,request_id=?,cached_tokens_in=?,reasoning_tokens=?,pricing_model=?,pricing_source=?,input_cost_per_million=?,output_cost_per_million=? WHERE id=? AND tenant_id=?`).bind(
      actualModel, record.requestId || null, record.cachedTokens, record.reasoningTokens, record.pricingModel || null,
      record.pricingSource, record.inputCostPerMillion ?? null, record.outputCostPerMillion ?? null, record.id, tenantId
    ).run();
  } else {
    await createUsageRecord(env.DB, record);
  }
  return costCents;
}
