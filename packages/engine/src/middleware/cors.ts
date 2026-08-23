import { cors as honoCors } from 'hono/cors';

export const cors = () => honoCors({
  origin: (origin) => {
    if (origin && (origin.endsWith('localhost:3000') || origin.includes('your-production-domain.com'))) {
      return origin;
    }
    return 'http://localhost:3000';
  },
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
});
