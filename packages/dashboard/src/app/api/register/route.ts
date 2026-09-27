import { NextRequest, NextResponse } from 'next/server';

const ENGINE_URL =
  process.env.ENGINE_URL ||
  process.env.NEXT_PUBLIC_ENGINE_URL ||
  'https://ai-work-partner-engine.uden-production-deployment.workers.dev';

export async function POST(request: NextRequest) {
  const upstream = new URL('/api/v1/tenants', ENGINE_URL);
  try {
    const body = await request.json().catch(() => ({}));
    const response = await fetch(upstream, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...body, client: 'web' }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return NextResponse.json(result, { status: response.status });

    if (result.api_key) {
      const sessionResponse = await fetch(new URL('/api/v1/auth/session', ENGINE_URL), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ apiKey: result.api_key, client: 'web' }),
      });
      const session = await sessionResponse.json().catch(() => ({}));
      if (sessionResponse.ok) Object.assign(result, session);
    }

    console.info('registration_proxy', { upstream: upstream.toString(), status: response.status });
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error('registration_proxy_error', { upstream: upstream.toString(), error });
    return NextResponse.json({ error: 'Engine unavailable' }, { status: 502 });
  }
}
