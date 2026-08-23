import { HonoEnv } from '../types';
import { getProvider } from './providers';
import { checkQuality } from './quality';
import { createEscalationLog } from '../db/queries';
import { QualityReport } from '@ai-work-partner/shared';

export async function escalateTask(
  env: HonoEnv['Bindings'],
  prompt: string,
  expectedFormat: string,
  fallbackChain: string[],
  taskId: string,
  tenantId: string,
  initialFailure: QualityReport
) {
  let attemptNumber = 1;
  let bestResult: any = null;
  let bestScore = -1;
  let currentFailure = initialFailure;

  for (const modelId of fallbackChain) {
    attemptNumber++;
    const provider = getProvider(env, modelId);
    const reasonText = currentFailure.escalationReason || currentFailure.checks.filter(c => !c.passed).map(c => c.reason).join(', ') || 'Quality threshold failed';

    // Log escalation attempt
    await createEscalationLog(env.DB, {
      id: crypto.randomUUID(),
      taskId,
      fromModel: fallbackChain[attemptNumber - 2] || 'primary',
      toModel: modelId,
      reason: reasonText,
      qualityScore: currentFailure.overallScore,
      attemptNumber,
      createdAt: new Date().toISOString()
    });

    const enhancedPrompt = `${prompt}\n\n[SYSTEM NOTICE: A previous lower-tier model output failed quality verification: "${reasonText}". Please generate a complete, high-quality response satisfying all requirements.]`;

    try {
      const response = await provider.execute(enhancedPrompt, modelId);
      const quality = checkQuality(response.result, expectedFormat, prompt);

      if (quality.overallScore > bestScore) {
        bestScore = quality.overallScore;
        bestResult = { response, modelId, quality, attemptNumber };
      }

      if (!quality.shouldEscalate) {
        return bestResult; // Quality threshold satisfied
      }

      currentFailure = quality;
    } catch (e) {
      console.error(`Escalation attempt ${attemptNumber} with ${modelId} failed:`, e);
    }
  }

  return bestResult;
}
