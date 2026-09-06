import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { listAuditLogs, requirePermission } from '../services/permissions';

export const auditRoutes = new Hono<HonoEnv>();

auditRoutes.get('/', async c => {
  const tenantId = c.get('tenantId');
  await requirePermission(c.env.DB, tenantId, 'audit:read');
  const rawLimit = Number.parseInt(c.req.query('limit') || '50', 10);
  const rawOffset = Number.parseInt(c.req.query('offset') || '0', 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, rawLimit)) : 50;
  const offset = Number.isFinite(rawOffset) ? Math.min(1_000_000, Math.max(0, rawOffset)) : 0;
  return c.json({ logs: await listAuditLogs(c.env.DB, tenantId, limit, offset) });
});
