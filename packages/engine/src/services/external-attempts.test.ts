import { describe, expect, it } from 'vitest';
import { createExternalAttemptIdentity, isRetrySafe, requiresReconciliation } from './external-attempts';

describe('external attempt reconciliation policy', () => {
  const input = {
    tenantId: 'tenant-1',
    graphId: 'graph-1',
    nodeId: 'node-1',
    attemptNumber: 3,
  };

  it('derives the same identity after a worker reclaim', () => {
    const first = createExternalAttemptIdentity(input);
    const reclaimed = createExternalAttemptIdentity(input);

    expect(reclaimed.id).toBe(first.id);
    expect(reclaimed.idempotencyKey).toBe(first.idempotencyKey);
    expect(reclaimed.idempotencyKey).toBe('uden:tenant-1:graph-1:node-1:3');
  });

  it('does not reuse identity across attempt numbers', () => {
    const first = createExternalAttemptIdentity(input);
    const next = createExternalAttemptIdentity({ ...input, attemptNumber: 4 });

    expect(next.id).not.toBe(first.id);
    expect(next.idempotencyKey).not.toBe(first.idempotencyKey);
  });

  it('allows retry only when no external request may have started', () => {
    expect(isRetrySafe('not_started')).toBe(true);
    expect(isRetrySafe('failed')).toBe(true);
    expect(isRetrySafe('in_flight')).toBe(false);
    expect(isRetrySafe('unknown')).toBe(false);
    expect(isRetrySafe('completed')).toBe(false);
  });

  it('requires reconciliation for potentially billed outcomes', () => {
    expect(requiresReconciliation('in_flight')).toBe(true);
    expect(requiresReconciliation('unknown')).toBe(true);
    expect(requiresReconciliation('not_started')).toBe(false);
    expect(requiresReconciliation('failed')).toBe(false);
    expect(requiresReconciliation('completed')).toBe(false);
  });
});
