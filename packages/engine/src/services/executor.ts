import { HonoEnv } from '../types';
import { classifyTask } from './classifier';
import { routeTask } from './router';
import { checkQuality } from './quality';
import { escalateTask } from './escalation';
import { checkBudget, recordUsage } from './cost';
import { getProvider } from './providers';
import { createTask, updateTask, getTenantById, getMonthlySpend } from '../db/queries';
import { Task, TaskStatus } from '@ai-work-partner/shared';

export async function executeTask(
  env: HonoEnv['Bindings'],
  tenantId: string,
  prompt: string,
  permissionless: boolean = true,
  projectId?: string
) {
  const hasBudget = await checkBudget(env, tenantId);
  if (!hasBudget) {
    throw new Error('Budget exceeded');
  }

  const tenant = await getTenantById(env.DB, tenantId);
  const qualityPref = tenant?.qualityPreference || 'balanced';
  const monthlyBudget = tenant?.monthlyBudgetCents || 10000;
  const spent = await getMonthlySpend(env.DB, tenantId);
  const budgetLeft = Math.max(0, monthlyBudget - spent);

  const classification = classifyTask(prompt);
  const routing = routeTask(
    classification.complexity,
    classification.domain,
    qualityPref,
    budgetLeft,
    classification.estimatedInputTokens,
    classification.estimatedOutputTokens
  );

  const initialStatus: TaskStatus = permissionless ? 'processing' : 'awaiting-approval';

  const task: Task = {
    id: crypto.randomUUID(),
    tenantId,
    projectId,
    prompt,
    mode: permissionless ? 'permissionless' : 'permission-based',
    status: initialStatus,
    classifiedTier: classification.recommendedTier,
    classifiedDomain: classification.domain,
    classifiedComplexity: classification.complexity,
    expectedFormat: classification.expectedFormat,
    escalationCount: 0,
    createdAt: new Date().toISOString()
  };

  if (!permissionless) {
    task.proposal = {
      suggestedModel: routing.primaryModel,
      estimatedCostCents: routing.estimatedCostCents,
      actionDescription: `Execute task in ${classification.domain} domain using ${routing.primaryModel}`,
      reasoning: routing.reasoning
    };
  }

  // Persist task and associated routing plan
  await createTask(env.DB, task, routing);

  if (!permissionless) {
    return { task, routing };
  }

  return await runTaskExecution(env, task, routing.primaryModel, routing.fallbackChain, classification.expectedFormat);
}

export async function runTaskExecution(
  env: HonoEnv['Bindings'],
  task: Task,
  primaryModel: string,
  fallbackChain: string[],
  expectedFormat: string
) {
  const provider = getProvider(env, primaryModel);
  let finalOutput = '';
  let finalModelUsed = primaryModel;
  let finalQualityScore = 100;
  let totalCostCents = 0;
  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let escalationCount = 0;

  try {
    const response = await provider.execute(task.prompt, primaryModel);

    // Atomically bill and record the primary model attempt
    const primaryCost = await recordUsage(
      env,
      task.tenantId,
      task.id,
      primaryModel,
      response.promptTokens,
      response.completionTokens
    );

    totalTokensIn = response.promptTokens;
    totalTokensOut = response.completionTokens;
    totalCostCents = primaryCost;

    const quality = checkQuality(response.result, expectedFormat, task.prompt);

    if (quality.shouldEscalate && fallbackChain.length > 0) {
      const escalated = await escalateTask(
        env,
        task.prompt,
        expectedFormat,
        primaryModel,
        fallbackChain,
        task.id,
        task.tenantId,
        quality
      );

      if (escalated) {
        finalOutput = escalated.response.result;
        finalModelUsed = escalated.modelId;
        finalQualityScore = escalated.quality.overallScore;
        totalTokensIn += escalated.totalEscalationTokensIn;
        totalTokensOut += escalated.totalEscalationTokensOut;
        totalCostCents += escalated.totalEscalationCostCents;
        escalationCount = escalated.attemptNumber - 1;
      } else {
        finalOutput = response.result;
        finalQualityScore = quality.overallScore;
      }
    } else {
      finalOutput = response.result;
      finalQualityScore = quality.overallScore;
    }

    const completedTaskUpdates: Partial<Task> = {
      status: 'completed',
      output: finalOutput,
      modelUsed: finalModelUsed,
      qualityScore: finalQualityScore,
      totalCostCents: Math.round(totalCostCents * 100) / 100,
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
      escalationCount,
      completedAt: new Date().toISOString()
    };

    await updateTask(env.DB, task.id, task.tenantId, completedTaskUpdates);

    return {
      taskId: task.id,
      output: finalOutput,
      modelUsed: finalModelUsed,
      qualityScore: finalQualityScore,
      costCents: completedTaskUpdates.totalCostCents,
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
      escalationCount
    };
  } catch (error: any) {
    await updateTask(env.DB, task.id, task.tenantId, {
      status: 'failed',
      output: `Execution error: ${error.message}`
    });
    throw error;
  }
}
