import { Hono } from 'hono';
import { HonoEnv } from '../types';
import { getUsageSummary, getDailyUsage } from '../db/queries';

export const usageRoutes = new Hono<HonoEnv>();

usageRoutes.get('/summary', async (c) => {
  const tenantId = c.get('tenantId');
  const summary = await getUsageSummary(c.env.DB, tenantId);
  return c.json(summary);
});

usageRoutes.get('/daily', async (c) => {
  const tenantId = c.get('tenantId');
  const daily = await getDailyUsage(c.env.DB, tenantId);
  return c.json({ daily });
});
