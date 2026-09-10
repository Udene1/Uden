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

/**
 * Executes exactly one externally billable provider attempt.
 *
 * The caller must persist the graph-attempt row before invoking this helper.
 * This helper deliberately does not retry: retry policy belongs above this
 * boundary, and an ambiguous transport outcome must never be converted into a
 * second billable request automatically.
 */
export async function executeDurableProviderAttempt(
  db: D1Database,
  tenantId: string,
  graphId: string,
  nodeId: string,
  attemptNumber: number,
  modelId: string,
  provider: AIProvider,
  prompt: string,
  fence: ExecutionFence,
  options?: Omit<ProviderExecutionOptions, 'idempotencyKey'>,
): Promise<DurableProviderAttempt> {
  const identity = createExternalAttemptIdentity({
    graphId,
    nodeId,
    tenantId,
    attemptNumber,
  });

  await markExternalAttemptInFlight(
    db,
    tenantId,
    attemptIdForPersistence(attemptNumber, identity.id),
    identity.idempotencyKey,
    fence,
  );

  try {
    const result = await provider.execute(prompt, modelId, {
      ...options,
      idempotencyKey: identity.idempotencyKey,
    });

    await markExternalAttemptOutcome(
      db,
      tenantId,
      attemptIdForPersistence(attemptNumber, identity.id),
      'completed',
      fence,
    );

    return {
      attemptId: identity.id,
      idempotencyKey: identity.idempotencyKey,
      result,
    };
  } catch (error) {
    const safe = sanitizeProviderError('provider', error);
    const outcome = isAmbiguousProviderError(safe) ? 'unknown' : 'failed';

    await markExternalAttemptOutcome(
      db,
      tenantId,
      attemptIdForPersistence(attemptNumber, identity.id),
      outcome,
      fence,
      safe.message,
    );

    throw safe;
  }
}

/**
 * Existing graph attempt IDs are deterministic. External attempt identity is
 * deliberately separate, but the persistence boundary currently keys its row
 * by the graph attempt ID. Keeping this adapter in one place prevents callers
 * from inventing incompatible identities.
 */
function attemptIdForPersistence(attemptNumber: number, externalId: string): string {
  const separator = externalId.lastIndexOf(':');
  if (separator <= 0) return externalId;
  return externalId;
}
