import { Hono } from 'hono';
import { HonoEnv } from '../types';
import { hashApiKey } from '../middleware/auth';
import { getTenantByApiKey } from '../db/queries';
import { createAuthSession, revokeAuthSession, AuthClient, sessionCookie, clearSessionCookie, readSessionCookie } from '../services/auth-sessions';
import { Tenant, TenantPublic } from '@ai-work-partner/shared';

function publicTenant(tenant: Tenant): TenantPublic {
  return { id: tenant.id, name: tenant.name, email: tenant.email, qualityPreference: tenant.qualityPreference, monthlyBudgetCents: tenant.monthlyBudgetCents, defaultMode: tenant.defaultMode, bringOwnKeys: tenant.bringOwnKeys, createdAt: tenant.createdAt, updatedAt: tenant.updatedAt };
}

export const authRoutes = new Hono<HonoEnv>();

function isClient(value: unknown): value is AuthClient {
  return value === 'desktop' || value === 'web' || value === 'mobile' || value === 'api';
}

authRoutes.post('/session', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const rawApiKey = typeof body.apiKey === 'string' ? body.apiKey : '';
  const client = isClient(body.client) ? body.client : null;
  if (!rawApiKey) return c.json({ error: 'apiKey is required' }, 400);
  if (!client) return c.json({ error: 'Invalid client' }, 400);

  const tenant = await getTenantByApiKey(c.env.DB, await hashApiKey(rawApiKey));
  if (!tenant) return c.json({ error: 'Unauthorized' }, 401);

  const session = await createAuthSession(c.env.DB, tenant.id, client);
  c.header('Set-Cookie', sessionCookie(session.token, session.expiresAt));
  return c.json({
    tenant: publicTenant(tenant),
    session_token: session.token,
    expires_at: session.expiresAt,
    subject: session.subject,
    client: session.client,
  }, 201);
});

authRoutes.post('/logout', async (c) => {
  const authorization = c.req.header('Authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : readSessionCookie(c.req.header('Cookie'));
  if (!token || !token.startsWith('us_')) return c.json({ error: 'Unauthorized' }, 401);
  await revokeAuthSession(c.env.DB, token);
  c.header('Set-Cookie', clearSessionCookie());
  return c.json({ success: true });
});