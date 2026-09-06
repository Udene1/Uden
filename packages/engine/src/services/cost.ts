import { HonoEnv } from '../types';
import { createUsageRecord, getMonthlySpend, getTenantById } from '../db/queries';
import { MODEL_REGISTRY, estimateCost, AIProvider } from '@ai-work-partner/shared';

export async function checkBudget(env: HonoEnv['Bindings'], tenantId: string): Promise<boolean> {
  const tenant = await getTenantById(env.DB, tenantId);
  if (!tenant || !tenant.monthlyBudgetCents) return true;
  const spent = await getMonthlySpend(env.DB, tenantId);
  return spent < tenant.monthlyBudgetCents;
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

  // Graph executions are accounted by recordGraphAttempt(), where the durable
  // attempt ID is the usage ID. This prevents a replayed attempt from creating
  // a second usage row while preserving the existing non-graph task path.
  const graph = await env.DB.prepare('SELECT id FROM task_graphs WHERE root_task_id=? AND tenant_id=? LIMIT 1')
    .bind(taskId, tenantId)
    .first<{ id: string }>();
  if (graph) return costCents;

  await createUsageRecord(env.DB, {
    id: usageId || crypto.randomUUID(),
    tenantId,
    taskId,
    model: modelId,
    provider,
    tokensIn,
    tokensOut,
    costCents,
    createdAt: new Date().toISOString()
  });
  return costCents;
}
