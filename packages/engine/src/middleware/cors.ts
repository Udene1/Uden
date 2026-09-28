import { cors as honoCors } from 'hono/cors';
import type { Env } from '../types';

export function isAllowedOrigin(origin: string | undefined, env: Env) {
  if (!origin) return false;
  const configured = env.ALLOWED_ORIGINS?.split(',').map(value => value.trim()).filter(Boolean) ?? [];
  configured.push('https://uden-dashboard.vercel.app');
  return configured.includes(origin) || /^https?:\/\/localhost(?::\d+)?$/.test(origin);
}

export const cors = () => honoCors({
  origin: (origin, c) => isAllowedOrigin(origin, c.env as Env) ? origin : undefined,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
});
