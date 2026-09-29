const ENGINE_URL =
  process.env.ENGINE_URL ||
  process.env.NEXT_PUBLIC_ENGINE_URL ||
  'https://ai-work-partner-engine.uden-production-deployment.workers.dev';

function bearer(request: Request) {
  const header = request.headers.get('authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

export async function isOpsAuthorized(request: Request) {
  const credential = bearer(request);
  if (!credential) return false;

  try {
    const response = await fetch(ENGINE_URL + '/api/v1/tenant', {
      headers: { authorization: 'Bearer ' + credential },
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  }
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
