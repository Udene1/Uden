import { describe, expect, it } from 'vitest';
import { sanitizeProviderError } from './provider-errors';

describe('provider error sanitization', () => {
  it('redacts credentials and preserves safe retry classification', () => {
    const error = sanitizeProviderError('openai', new Error('OpenAI error (429): authorization: Bearer sk-secret-value retry later'));
    expect(error.message).not.toContain('sk-secret-value');
    expect(error.message).not.toContain('Bearer sk-secret-value');
    expect(error.code).toBe('PROVIDER_RATE_LIMITED');
    expect(error.retryable).toBe(true);
  });

  it('does not expose arbitrary provider response bodies beyond a bounded safe message', () => {
    const error = sanitizeProviderError('anthropic', new Error('internal response '.repeat(200)));
    expect(error.message.length).toBeLessThan(600);
  });
});
