import { Hono } from 'hono';
import { HonoEnv } from '../types';
import { hashApiKey } from '../middleware/auth';
import { getTenantByApiKey } from '../db/queries';
import { createAuthSession, revokeAuthSession, AuthClient } from '../services/auth-sessions';

export const authRoutes = new Hono<HonoEnv>();

function isClient(value: unknown): value is AuthClient {
  return value === 'desktop' || value === 'web' || value === 'mobile' || value === 'api';
}

authRoutes.post('/session', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const rawApiKey = typeof body.apiKey === 'string' ? body.apiKey : '';
  const client = isClient(body.client) ? body.client : null;
  if (!rawApiKey || !client) return c.json({ error: 'apiKey and client are required' }, 400);

  const tenant = await getTenantByApiKey(c.env.DB, await hashApiKey(rawApiKey));
  if (!tenant) return c.json({ error: 'Unauthorized' }, 401);

  const session = await createAuthSession(c.env.DB, tenant.id, client);
  return c.json({
    tenant,
    session_token: session.token,
    expires_at: session.expiresAt,
    subject: session.subject,
    client: session.client,
  }, 201);
});

authRoutes.post('/logout', async (c) => {
  const authorization = c.req.header('Authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token || !token.startsWith('us_')) return c.json({ error: 'Unauthorized' }, 401);
  await revokeAuthSession(c.env.DB, token);
  return c.json({ success: true });
});
