import { Context, Next } from 'hono';

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 100;

export async function ratelimit(c: Context, next: Next) {
  const tenantId = c.get('tenantId');
  if (!tenantId) return await next();

  // KV gives the limit a Worker-wide/shared backing instead of an isolate-local Map.
  // It is intentionally a fixed-window limiter; the authoritative spend/budget checks
  // remain in the execution path.
  const kv = c.env?.CACHE_KV as KVNamespace | undefined;
  if (!kv) return await next();

  const bucket = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
  const key = `ratelimit:${tenantId}:${bucket}`;
  const current = Number(await kv.get(key) || '0');
  if (current >= MAX_REQUESTS) return c.json({ error: 'Rate limit exceeded' }, 429);

  await kv.put(key, String(current + 1), { expirationTtl: WINDOW_SECONDS + 5 });
  await next();
}
