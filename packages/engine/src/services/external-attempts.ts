export type ExternalAttemptOutcome = 'not_started' | 'in_flight' | 'completed' | 'failed' | 'unknown';

export type ExternalAttemptIdentity = {
  id: string;
  graphId: string;
  nodeId: string;
  tenantId: string;
  attemptNumber: number;
  idempotencyKey: string;
};

export function createExternalAttemptIdentity(input: Omit<ExternalAttemptIdentity, 'id' | 'idempotencyKey'>): ExternalAttemptIdentity {
  const id = crypto.randomUUID();
  return {
    ...input,
    id,
    // Stable for the lifetime of this attempt. A reclaimed worker must reuse this
    // identity when reconciling an ambiguous provider outcome instead of creating
    // another billable request.
    idempotencyKey: `uden:${input.tenantId}:${input.graphId}:${input.nodeId}:${input.attemptNumber}:${id}`,
  };
}

export function isRetrySafe(outcome: ExternalAttemptOutcome): boolean {
  return outcome === 'not_started' || outcome === 'failed';
}

export function requiresReconciliation(outcome: ExternalAttemptOutcome): boolean {
  return outcome === 'in_flight' || outcome === 'unknown';
}
