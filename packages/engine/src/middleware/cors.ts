import { cors as honoCors } from 'hono/cors';
import type { Env } from '../types';

export const cors = () => honoCors({
  origin: (origin, c) => {
    if (!origin) return undefined;

    const configured = (c.env as Env).ALLOWED_ORIGINS
      ?.split(',')
      .map(value => value.trim())
      .filter(Boolean) ?? [];

    // Local development remains available, while production origins must be
    // explicitly configured. Never reflect an arbitrary Origin header.
    if (configured.includes(origin)) return origin;
    if (/^https?:\/\/localhost(?::\d+)?$/.test(origin)) return origin;

    return undefined;
  },
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
});
