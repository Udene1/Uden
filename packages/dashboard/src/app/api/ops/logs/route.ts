import { isOpsAuthorized, opsUnauthorized } from '@/lib/ops-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CLOUDFLARE_API = 'https://api.cloudflare.com/client/v4';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export async function GET(request: Request) {
  if (!(await isOpsAuthorized(request))) return opsUnauthorized();

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const workerName = process.env.CLOUDFLARE_WORKER_NAME ?? 'ai-work-partner-engine';

  if (!accountId || !apiToken) {
    return json({
      error: 'Ops logging is not configured',
      missing: [
        !accountId ? 'CLOUDFLARE_ACCOUNT_ID' : null,
        !apiToken ? 'CLOUDFLARE_API_TOKEN' : null,
      ].filter(Boolean),
    }, 503);
  }

  const mode = new URL(request.url).searchParams.get('mode') ?? 'tail';
  if (mode !== 'tail') {
    return json({ error: 'Unsupported mode', supported: ['tail'] }, 400);
  }

  const response = await fetch(
    CLOUDFLARE_API + '/accounts/' + encodeURIComponent(accountId) +
      '/workers/scripts/' + encodeURIComponent(workerName) + '/tails',
    {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + apiToken,
        'content-type': 'application/json',
      },
      body: JSON.stringify({}),
      cache: 'no-store',
    },
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    return json({
      error: 'Cloudflare tail could not be started',
      status: response.status,
      details: payload?.errors ?? payload?.messages ?? null,
    }, 502);
  }

  return json({
    ok: true,
    mode: 'tail',
    worker: workerName,
    tail: {
      id: payload.result?.id ?? null,
      expiresAt: payload.result?.expires_at ?? null,
      url: payload.result?.url ?? null,
    },
  });
}
