import { NextRequest, NextResponse } from 'next/server';

const ENGINE_URL =
  process.env.ENGINE_URL ||
  process.env.NEXT_PUBLIC_ENGINE_URL ||
  'https://ai-work-partner-engine.uden-production-deployment.workers.dev';

export async function POST(request: NextRequest) {
  const upstream = new URL('/api/v1/tenants', ENGINE_URL);
  try {
    const body = await request.arrayBuffer();
    const response = await fetch(upstream, {
      method: 'POST',
      headers: { 'content-type': request.headers.get('content-type') || 'application/json' },
      body,
    });
    const responseBody = await response.arrayBuffer();
    const headers = new Headers();
    headers.set('content-type', response.headers.get('content-type') || 'application/json');
    console.info('registration_proxy', { upstream: upstream.toString(), status: response.status });
    return new NextResponse(responseBody, { status: response.status, headers });
  } catch (error) {
    console.error('registration_proxy_error', { upstream: upstream.toString(), error });
    return NextResponse.json({ error: 'Engine unavailable' }, { status: 502 });
  }
}
