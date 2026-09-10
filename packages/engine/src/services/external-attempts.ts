export type ExternalAttemptOutcome = 'not_started' | 'in_flight' | 'completed' | 'failed' | 'unknown';

export type ExternalAttemptIdentity = {
  id: string;
  graphId: string;
  nodeId: string;
  tenantId: string;
  attemptNumber: number;
  idempotencyKey: string;
};

/**
 * Derive attempt identity from durable graph coordinates. A reclaimed worker
 * must derive the same identity so an ambiguous provider attempt can be
 * reconciled or replayed with the same idempotency key instead of creating a
 * second billable request.
 */
export function createExternalAttemptIdentity(input: Omit<ExternalAttemptIdentity, 'id' | 'idempotencyKey'>): ExternalAttemptIdentity {
  const stableId = `uden-attempt:${input.tenantId}:${input.graphId}:${input.nodeId}:${input.attemptNumber}`;
  return {
    ...input,
    id: stableId,
    idempotencyKey: `uden:${input.tenantId}:${input.graphId}:${input.nodeId}:${input.attemptNumber}`,
  };
}

export function isRetrySafe(outcome: ExternalAttemptOutcome): boolean {
  return outcome === 'not_started' || outcome === 'failed';
}

export function requiresReconciliation(outcome: ExternalAttemptOutcome): boolean {
  return outcome === 'in_flight' || outcome === 'unknown';
}
