const SECRET_PATTERNS = [
  /bearer\s+[a-z0-9._-]+/gi,
  /(api[_-]?key|authorization|x-api-key|token|secret)\s*[:=]\s*[^\s,;]+/gi,
  /sk-[a-z0-9_-]+/gi,
];

export type ExternalOutcome = 'not_started' | 'in_flight' | 'completed' | 'failed' | 'unknown';

export class ProviderExecutionError extends Error {
  constructor(
    public readonly provider: string,
    public readonly code: string,
    public readonly retryable: boolean,
    public readonly externalOutcome: ExternalOutcome,
    message: string,
  ) {
    super(message);
    this.name = 'ProviderExecutionError';
  }
}

export function sanitizeProviderError(provider: string, error: unknown): ProviderExecutionError {
  if (error instanceof ProviderExecutionError) return error;
  const raw = error instanceof Error ? error.message : String(error || 'unknown provider error');
  const statusMatch = raw.match(/\b([45]\d\d)\b/);
  const status = statusMatch ? Number(statusMatch[1]) : undefined;
  const ambiguous =
    status === 408 ||
    status === 409 ||
    status === 425 ||
    status === 429 ||
    (status !== undefined && status >= 500) ||
    /timeout|temporar|overload|rate limit|network|fetch failed|connection reset|connection closed|socket/i.test(raw);
  const retryable = false;
  const code = status === 401 || status === 403
    ? 'PROVIDER_AUTH_FAILED'
    : status === 429
      ? 'PROVIDER_RATE_LIMITED'
      : status && status >= 500
        ? 'PROVIDER_UNAVAILABLE'
        : ambiguous
          ? 'PROVIDER_EXTERNAL_OUTCOME_UNKNOWN'
          : 'PROVIDER_REQUEST_FAILED';
  const safe = raw
    .replace(SECRET_PATTERNS[0], 'Bearer [REDACTED]')
    .replace(SECRET_PATTERNS[1], '$1=[REDACTED]')
    .replace(SECRET_PATTERNS[2], 'sk-[REDACTED]');
  return new ProviderExecutionError(
    provider,
    code,
    retryable,
    ambiguous ? 'unknown' : 'failed',
    `${provider} request failed (${code})${status ? ` [${status}]` : ''}: ${safe.slice(0, 500)}`,
  );
}

export function isRetryableProviderError(error: unknown): boolean {
  return error instanceof ProviderExecutionError
    ? error.retryable
    : sanitizeProviderError('provider', error).retryable;
}

export function isAmbiguousProviderError(error: unknown): boolean {
  return error instanceof ProviderExecutionError
    ? error.externalOutcome === 'unknown'
    : sanitizeProviderError('provider', error).externalOutcome === 'unknown';
}
