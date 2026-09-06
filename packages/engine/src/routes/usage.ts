import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { getUsageSummary, getDailyUsage } from '../db/queries';
import { getGraphAnalytics, getRoutingSavings } from '../db/analytics';
import { requirePermission } from '../services/permissions';
export const usageRoutes = new Hono<HonoEnv>();
usageRoutes.get('/summary', async c => c.json(await getUsageSummary(c.env.DB,c.get('tenantId'))));
usageRoutes.get('/daily', async c => c.json({daily:await getDailyUsage(c.env.DB,c.get('tenantId'))}));
usageRoutes.get('/analytics', async c => { const t=c.get('tenantId'); await requirePermission(c.env.DB,t,'graph:read'); return c.json({analytics:await getGraphAnalytics(c.env.DB,t),savings:await getRoutingSavings(c.env.DB,t)}); });
