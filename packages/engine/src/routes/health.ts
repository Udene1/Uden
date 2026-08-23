import { Hono } from 'hono';
import { HonoEnv } from '../types';

export const healthRoutes = new Hono<HonoEnv>();

healthRoutes.get('/', async (c) => {
  try {
    // Check DB connection
    await c.env.DB.prepare('SELECT 1').first();
    return c.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    return c.json({ status: 'error', database: 'disconnected' }, 500);
  }
});
