import { timingSafeEqual } from 'node:crypto';

const CLOUDFLARE_TOKEN_ENV = 'CLOUDFLARE_API_TOKEN';

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function isOpsAuthorized(request: Request) {
  const expected = process.env[CLOUDFLARE_TOKEN_ENV];
  if (!expected) return false;

  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

  return Boolean(token) && safeEqual(token, expected);
}

export function opsUnauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      'www-authenticate': 'Bearer realm="Uden Ops"',
    },
  });
}
