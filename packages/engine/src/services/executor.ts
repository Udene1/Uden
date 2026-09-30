import { HonoEnv } from '../types';
import { classifyTask } from './classifier';
import { routeTask } from './router';
import { checkQuality } from './quality';
import { escalateTask } from './escalation';
import { checkBudget, recordUsage } from './cost';
import { getProvider } from './providers';
import { resolveConnectionCandidates } from './providers/connection';
import { createTask, updateTask, getTenantById, getMonthlySpend } from '../db/queries';
import { Task, TaskStatus } from '@ai-work-partner/shared';
import { sanitizeProviderError, isAmbiguousProviderError } from './provider-errors';
import { resolveModelCandidates, markModelHealthy, markModelUnavailable, markModelCooldown, availabilityFailureKind } from './model-availability';

// TEMPORARY E2E DIAGNOSTIC: force dashboard tasks through NVIDIA until provider execution is confirmed.
const TEMP_E2E_MODEL = 'nvidia/nemotron-3.5-lightning-30b-a3b';

async function selectAvailableRouting(
  env: HonoEnv['Bindings'],
  tenantId: string,
  routing: { primaryModel: string; fallbackChain: string[] }
 ): Promise<{ primaryModel: string; fallbackChain: string[] }> {
  const ordered = await resolveConnectionCandidates(
    env,
    [routing.primaryModel, ...routing.fallbackChain],
  );

  const available = await resolveModelCandidates(env, tenantId, env.DB, [TEMP_E2E_MODEL]);
  return {
    primaryModel: available[0] || routing.primaryModel,
    fallbackChain: available.slice(1),
  };
}

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
  const availableRouting = await selectAvailableRouting(env, tenantId, routing);
  const effectiveRouting = { ...routing, ...availableRouting };

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
      suggestedModel: effectiveRouting.primaryModel,
      estimatedCostCents: effectiveRouting.estimatedCostCents,
      actionDescription: `Execute task in ${classification.domain} domain using ${effectiveRouting.primaryModel}`,
      reasoning: effectiveRouting.reasoning
    };
  }

  await createTask(env.DB, task, effectiveRouting);

  if (!permissionless) {
    return { task, routing: effectiveRouting };
  }

  return await runTaskExecution(
    env,
    task,
    effectiveRouting.primaryModel,
    effectiveRouting.fallbackChain,
    classification.expectedFormat
  );
}

export async function runTaskExecution(
  env: HonoEnv['Bindings'],
  task: Task,
  primaryModel: string,
  fallbackChain: string[],
  expectedFormat: string
) {
  let finalOutput = '';
  let finalModelUsed = primaryModel;
  let finalQualityScore = 100;
  let totalCostCents = 0;
  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let escalationCount = 0;

  const candidates = [primaryModel, ...fallbackChain].filter(
    (model, index, all) => Boolean(model) && all.indexOf(model) === index
  );
  let successfulModelIndex = -1;
  let response: Awaited<ReturnType<ReturnType<typeof getProvider>['execute']>> | undefined;
  const providerFailures: string[] = [];

  try {
    for (let index = 0; index < candidates.length; index += 1) {
      const modelId = candidates[index];
      try {
        response = await getProvider(env, modelId).execute(task.prompt, modelId);
        successfulModelIndex = index;
        await markModelHealthy(env.DB, task.tenantId, modelId);
        const cost = await recordUsage(
          env,
          task.tenantId,
          task.id,
          modelId,
          response.promptTokens,
          response.completionTokens,
          `${task.id}:provider:${index + 1}`,
          {
            actualModel: response.actualModel,
            requestId: response.requestId,
            cachedTokens: response.cachedTokens,
            reasoningTokens: response.reasoningTokens,
          },
        );
        totalTokensIn = response.promptTokens;
        totalTokensOut = response.completionTokens;
        totalCostCents = cost;
        break;
      } catch (error) {
        const safe = sanitizeProviderError(modelId, error);
        if (!isAmbiguousProviderError(safe)) {
          const kind = availabilityFailureKind(safe.code);
          if (kind === 'cooldown') {
            await markModelCooldown(env.DB, task.tenantId, modelId, safe.code);
          } else {
            await markModelUnavailable(env.DB, task.tenantId, modelId, safe.code);
          }
        }
        providerFailures.push(modelId + ': ' + safe.message);
        // An unknown external outcome is preserved for reconciliation, but it must not terminate the task.
        // Continue to the next model candidate so one unavailable model cannot sink the whole task.
        continue;
      }
    }

    if (!response || successfulModelIndex < 0) {
      const details = providerFailures.length ? '; attempts: ' + providerFailures.join(' | ') : '';
      throw new Error('No viable model/provider candidates completed execution' + details);
    }

    const quality = checkQuality(response.result, expectedFormat, task.prompt);
    const remainingFallbackChain = candidates.slice(successfulModelIndex + 1);

    if (quality.shouldEscalate && remainingFallbackChain.length > 0) {
      const escalated = await escalateTask(
        env,
        task.prompt,
        expectedFormat,
        candidates[successfulModelIndex],
        remainingFallbackChain,
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
        finalModelUsed = candidates[successfulModelIndex];
        finalQualityScore = quality.overallScore;
      }
    } else {
      finalOutput = response.result;
      finalModelUsed = candidates[successfulModelIndex];
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
  } catch (error: unknown) {
    const safe = sanitizeProviderError(finalModelUsed, error);
    await updateTask(env.DB, task.id, task.tenantId, {
      status: 'failed',
      output: `Execution error: ${safe.message}`
    });
    throw safe;
  }
}
