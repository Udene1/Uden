import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { createGoogleAuthorizationUrl, completeGoogleAuthorization, listGmailMessages, sendGmailMessage } from '../services/google-workspace';
import { requirePermission, writeAudit } from '../services/permissions';
import { sanitizeError } from '../services/observability';

export const googleRoutes = new Hono<HonoEnv>();

googleRoutes.get('/connect', async c => {
  try {
    await requirePermission(c.env.DB, c.get('tenantId'), 'settings:write');
    return c.json({ authorizationUrl: await createGoogleAuthorizationUrl(c.env, c.get('tenantId')) }, 200);
  } catch (error) {
    const message = sanitizeError(error);
    return c.json({ error: message }, message === 'Forbidden' ? 403 : 503);
  }
});

googleRoutes.get('/callback', async c => {
  try {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const error = c.req.query('error');
    if (error) return c.json({ error: 'Google authorization was denied' }, 400);
    if (!code || !state) return c.json({ error: 'Missing OAuth callback parameters' }, 400);
    const result = await completeGoogleAuthorization(c.env, code, state);
    await writeAudit(c.env.DB, result.tenantId, 'google.connect', 'google_connection', undefined, 'google-oauth', undefined, { email: result.email || null });
    return c.json({ connected: true, email: result.email || null }, 200);
  } catch (error) {
    return c.json({ error: sanitizeError(error) }, 400);
  }
});

googleRoutes.get('/gmail/messages', async c => {
  const tenantId = c.get('tenantId');
  try {
    await requirePermission(c.env.DB, tenantId, 'workspace:read');
    const result = await listGmailMessages(c.env, tenantId, c.req.query('q') || '', Number(c.req.query('maxResults') || 20));
    return c.json(result, 200);
  } catch (error) {
    const message = sanitizeError(error);
    return c.json({ error: message }, message === 'Forbidden' ? 403 : 502);
  }
});

googleRoutes.post('/gmail/send', async c => {
  const tenantId = c.get('tenantId');
  try {
    await requirePermission(c.env.DB, tenantId, 'workspace:send');
    const body = await c.req.json().catch(() => ({}));
    if (!body || typeof body.to !== 'string' || typeof body.subject !== 'string' || typeof body.body !== 'string') return c.json({ error: 'to, subject, and body are required' }, 400);
    const result = await sendGmailMessage(c.env, tenantId, body.to, body.subject, body.body);
    await writeAudit(c.env.DB, tenantId, 'gmail.send', 'gmail_message', result.id || undefined, undefined, c.get('requestId'), { to: body.to, subject: body.subject });
    return c.json({ sent: true, messageId: result.id || null, threadId: result.threadId || null }, 200);
  } catch (error) {
    const message = sanitizeError(error);
    return c.json({ error: message }, message === 'Forbidden' ? 403 : 502);
  }
});
