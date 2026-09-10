import { describe, expect, it } from 'vitest';
import { isAmbiguousProviderError, isRetryableProviderError, sanitizeProviderError } from './provider-errors';

describe('provider error sanitization', () => {
  it('redacts credentials and marks rate-limit outcomes as ambiguous', () => {
    const error = sanitizeProviderError('openai', new Error('OpenAI error (429): authorization: Bearer sk-secret-value retry later'));
    expect(error.message).not.toContain('sk-secret-value');
    expect(error.message).not.toContain('Bearer sk-secret-value');
    expect(error.code).toBe('PROVIDER_RATE_LIMITED');
    expect(error.externalOutcome).toBe('unknown');
    expect(error.retryable).toBe(false);
    expect(isAmbiguousProviderError(error)).toBe(true);
    expect(isRetryableProviderError(error)).toBe(false);
  });

  it('does not expose arbitrary provider response bodies beyond a bounded safe message', () => {
    const error = sanitizeProviderError('anthropic', new Error('internal response '.repeat(200)));
    expect(error.message.length).toBeLessThan(600);
  });

  it('treats transport failures as unknown and never automatically retryable', () => {
    const error = sanitizeProviderError('openai', new Error('fetch failed after timeout'));
    expect(error.code).toBe('PROVIDER_EXTERNAL_OUTCOME_UNKNOWN');
    expect(error.externalOutcome).toBe('unknown');
    expect(error.retryable).toBe(false);
  });

  it('keeps deterministic client failures non-ambiguous', () => {
    const error = sanitizeProviderError('openai', new Error('request failed [400]'));
    expect(error.externalOutcome).toBe('failed');
    expect(error.retryable).toBe(false);
    expect(isAmbiguousProviderError(error)).toBe(false);
  });
});
