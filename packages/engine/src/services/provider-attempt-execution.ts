import type { ProviderExecutionOptions, ProviderExecutionResult, AIProvider } from './providers';
import { getExternalAttemptOutcome, markExternalAttemptInFlight, markExternalAttemptOutcome } from './external-attempt-persistence';
import { createExternalAttemptIdentity, requiresReconciliation } from './external-attempts';
import type { ExecutionFence } from './execution-side-effects';
import { isAmbiguousProviderError, ProviderExecutionError, sanitizeProviderError } from './provider-errors';

export type DurableProviderAttempt = {
  attemptId: string;
  idempotencyKey: string;
  result: ProviderExecutionResult;
};

/** Executes one externally billable attempt. It intentionally never retries. */
export async function executeDurableProviderAttempt(
  db: D1Database,
  tenantId: string,
  graphId: string,
  nodeId: string,
  attemptNumber: number,
  durableAttemptId: string,
  modelId: string,
  provider: AIProvider,
  prompt: string,
  fence: ExecutionFence,
  options?: Omit<ProviderExecutionOptions, 'idempotencyKey'>,
): Promise<DurableProviderAttempt> {
  const identity = createExternalAttemptIdentity({ graphId, nodeId, tenantId, attemptNumber });
  const existing = await getExternalAttemptOutcome(db, tenantId, durableAttemptId);

  if (existing && requiresReconciliation(existing.outcome)) {
    if (!provider.supportsIdempotencyKey) {
      throw new ProviderExecutionError(
        modelId,
        'PROVIDER_RECONCILIATION_REQUIRED',
        false,
        'unknown',
        `External attempt '${durableAttemptId}' requires reconciliation before retry; provider '${modelId}' does not declare idempotent replay support`,
      );
    }
    if (existing.idempotencyKey && existing.idempotencyKey !== identity.idempotencyKey) {
      throw new ProviderExecutionError(
        modelId,
        'PROVIDER_ATTEMPT_IDENTITY_MISMATCH',
        false,
        'unknown',
        `External attempt '${durableAttemptId}' has an unexpected idempotency identity`,
      );
    }
  }

  await markExternalAttemptInFlight(db, tenantId, durableAttemptId, identity.idempotencyKey, fence);

  try {
    const result = await provider.execute(prompt, modelId, {
      ...options,
      idempotencyKey: identity.idempotencyKey,
    });
    await markExternalAttemptOutcome(db, tenantId, durableAttemptId, 'completed', fence);
    return { attemptId: durableAttemptId, idempotencyKey: identity.idempotencyKey, result };
  } catch (error) {
    const safe = sanitizeProviderError(modelId, error);
    await markExternalAttemptOutcome(
      db,
      tenantId,
      durableAttemptId,
      isAmbiguousProviderError(safe) ? 'unknown' : 'failed',
      fence,
      safe.message,
    );
    throw safe;
  }
}
