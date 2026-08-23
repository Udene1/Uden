import { Context, Next } from 'hono';

const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

export async function ratelimit(c: Context, next: Next) {
  const tenantId = c.get('tenantId');
  if (!tenantId) return await next();

  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 100;

  let record = rateLimitMap.get(tenantId);
  if (!record || now - record.timestamp > windowMs) {
    record = { count: 0, timestamp: now };
  }

  record.count++;
  rateLimitMap.set(tenantId, record);

  if (record.count > maxRequests) {
    return c.json({ error: 'Rate limit exceeded' }, 429);
  }

  await next();
}
