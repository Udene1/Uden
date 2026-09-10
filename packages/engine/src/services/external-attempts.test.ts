import { describe, expect, it } from 'vitest';
import { isRetrySafe, requiresReconciliation } from './external-attempts';

describe('external attempt reconciliation policy', () => {
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
