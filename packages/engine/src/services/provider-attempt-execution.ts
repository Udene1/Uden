import type { ProviderExecutionOptions, ProviderExecutionResult, AIProvider } from './providers';
import { markExternalAttemptInFlight, markExternalAttemptOutcome } from './external-attempt-persistence';
import { createExternalAttemptIdentity } from './external-attempts';
import type { ExecutionFence } from './execution-side-effects';
import { isAmbiguousProviderError, sanitizeProviderError } from './provider-errors';

export type DurableProviderAttempt = {
  attemptId: string;
  idempotencyKey: string;
  result?: ProviderExecutionResult;
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
  await markExternalAttemptInFlight(db, tenantId, durableAttemptId, identity.idempotencyKey, fence);

  try {
    const result = await provider.execute(prompt, modelId, {
      ...options,
      idempotencyKey: identity.idempotencyKey,
    });
    await markExternalAttemptOutcome(db, tenantId, durableAttemptId, 'completed', fence);
    return { attemptId: durableAttemptId, idempotencyKey: identity.idempotencyKey, result };
  } catch (error) {
    const safe = sanitizeProviderError('provider', error);
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
