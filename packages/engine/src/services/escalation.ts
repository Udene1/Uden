import { HonoEnv } from '../types';
import { getProvider } from './providers';
import { checkQuality } from './quality';
import { recordUsage } from './cost';
import { createEscalationLog } from '../db/queries';
import { QualityReport, MAX_ESCALATION_ATTEMPTS } from '@ai-work-partner/shared';

export interface EscalationResult {
  response: {
    result: string;
    promptTokens: number;
    completionTokens: number;
  };
  modelId: string;
  quality: QualityReport;
  attemptNumber: number;
  totalEscalationCostCents: number;
  totalEscalationTokensIn: number;
  totalEscalationTokensOut: number;
}

export async function escalateTask(
  env: HonoEnv['Bindings'],
  prompt: string,
  expectedFormat: string,
  primaryModel: string,
  fallbackChain: string[],
  taskId: string,
  tenantId: string,
  initialFailure: QualityReport
): Promise<EscalationResult | null> {
  let previousModel = primaryModel;
  let attemptNumber = 1;
  let bestResult: EscalationResult | null = null;
  let bestScore = initialFailure.overallScore;
  let currentFailure = initialFailure;

  let totalEscalationCostCents = 0;
  let totalEscalationTokensIn = 0;
  let totalEscalationTokensOut = 0;

  // Limit chain to MAX_ESCALATION_ATTEMPTS
  const modelsToAttempt = fallbackChain.slice(0, MAX_ESCALATION_ATTEMPTS);

  for (const modelId of modelsToAttempt) {
    attemptNumber++;
    const provider = getProvider(env, modelId);
    const reasonText = currentFailure.escalationReason ||
      currentFailure.checks.filter(c => !c.passed).map(c => c.reason).join('; ') ||
      'Quality threshold failed';

    // Log escalation attempt to DB
    await createEscalationLog(env.DB, {
      id: crypto.randomUUID(),
      taskId,
      fromModel: previousModel,
      toModel: modelId,
      reason: reasonText,
      qualityScore: currentFailure.overallScore,
      attemptNumber,
      createdAt: new Date().toISOString()
    });

    const systemPrompt = `You are an expert AI work partner assisting with a quality-escalated task. ` +
      `A previous attempt using a lower-tier model failed quality checks due to: "${reasonText}". ` +
      `Ensure your output satisfies all formatting (${expectedFormat}), completeness, and quality requirements.`;

    try {
      const response = await provider.execute(prompt, modelId, { systemPrompt });

      // Atomically record usage for this specific attempt
      const attemptCostCents = await recordUsage(
        env,
        tenantId,
        taskId,
        modelId,
        response.promptTokens,
        response.completionTokens
      );

      totalEscalationCostCents += attemptCostCents;
      totalEscalationTokensIn += response.promptTokens;
      totalEscalationTokensOut += response.completionTokens;

      const quality = checkQuality(response.result, expectedFormat, prompt);

      const candidateResult: EscalationResult = {
        response,
        modelId,
        quality,
        attemptNumber,
        totalEscalationCostCents,
        totalEscalationTokensIn,
        totalEscalationTokensOut
      };

      if (quality.overallScore > bestScore || bestResult === null) {
        bestScore = quality.overallScore;
        bestResult = candidateResult;
      }

      // If quality threshold passed and no escalation required, stop and return immediately
      if (!quality.shouldEscalate) {
        return candidateResult;
      }

      previousModel = modelId;
      currentFailure = quality;
    } catch (e: any) {
      console.error(`Escalation attempt ${attemptNumber} with ${modelId} failed:`, e?.message || e);
      previousModel = modelId;
    }
  }

  return bestResult;
}
