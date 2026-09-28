import { describe, expect, it } from 'vitest';
import { availabilityFailureKind } from './model-availability';

describe('model availability failure classification', () => {
  it('treats rate limits and provider outages as cooldowns', () => {
    expect(availabilityFailureKind('PROVIDER_RATE_LIMITED')).toBe('cooldown');
    expect(availabilityFailureKind('PROVIDER_UNAVAILABLE')).toBe('cooldown');
    expect(availabilityFailureKind('PROVIDER_TRANSIENT_FAILURE')).toBe('cooldown');
  });

  it('keeps ambiguous outcomes on reconciliation', () => {
    expect(availabilityFailureKind('PROVIDER_EXTERNAL_OUTCOME_UNKNOWN')).toBe('ambiguous');
    expect(availabilityFailureKind('PROVIDER_RECONCILIATION_REQUIRED')).toBe('ambiguous');
  });

  it('treats deterministic provider failures as unavailable', () => {
    expect(availabilityFailureKind('CREDENTIAL_MISSING')).toBe('unavailable');
    expect(availabilityFailureKind('PROVIDER_AUTH_FAILED')).toBe('unavailable');
    expect(availabilityFailureKind('PROVIDER_REQUEST_FAILED')).toBe('unavailable');
  });
});
