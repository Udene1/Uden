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
  tokensOut: number
): Promise<number> {
  const modelConfig = MODEL_REGISTRY[modelId];
  const provider: AIProvider = modelConfig ? modelConfig.provider : 'openai';
  const costCents = estimateCost(modelId, tokensIn, tokensOut);

  await createUsageRecord(env.DB, {
    id: crypto.randomUUID(),
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
