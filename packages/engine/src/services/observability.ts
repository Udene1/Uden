import type { HonoEnv } from '../types';

const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]{12,}/g,
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /(?:api[_-]?key|authorization|token|secret|password)\s*[:=]\s*[^\s,;]+/gi,
];

export function sanitizeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  let safe = raw.slice(0, 1000);
  for (const pattern of SECRET_PATTERNS) safe = safe.replace(pattern, '[REDACTED]');
  return safe;
}

export function createRequestId(c: { req: { header(name: string): string | undefined } }): string {
  return c.req.header('x-request-id')?.slice(0, 128) || crypto.randomUUID();
}

export function logEvent(event: string, fields: Record<string, unknown> = {}): void {
  const safeFields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (/prompt|secret|token|authorization|api.?key|password/i.test(key)) continue;
    safeFields[key] = typeof value === 'string' ? sanitizeError(value) : value;
  }
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), event, ...safeFields }));
}

export function attachRequestId(c: any, requestId: string): void {
  c.header('x-request-id', requestId);
}

export function tenantLog(env: HonoEnv['Bindings'], tenantId: string, event: string, fields: Record<string, unknown> = {}): void {
  void env;
  logEvent(event, { tenantId, ...fields });
}
