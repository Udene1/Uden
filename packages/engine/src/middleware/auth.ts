import { Context, Next } from 'hono';
import { getTenantByApiKey } from '../db/queries';

export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.split(' ')[1];
  const hash = await hashApiKey(token);
  
  const tenant = await getTenantByApiKey(c.env.DB, hash);
  if (!tenant) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('tenant', tenant);
  c.set('tenantId', tenant.id);
  await next();
}
