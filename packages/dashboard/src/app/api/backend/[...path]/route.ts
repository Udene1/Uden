import { NextRequest, NextResponse } from 'next/server';

const ENGINE_URL = process.env.ENGINE_URL || process.env.NEXT_PUBLIC_ENGINE_URL || 'https://ai-work-partner-engine.uden-production-deployment.workers.dev';

async function proxy(request: NextRequest, { params }: { params: { path: string[] } }) {
  const upstream = new URL(`/api/v1/${params.path.join('/')}`, ENGINE_URL.endsWith('/') ? ENGINE_URL : `${ENGINE_URL}/`);
  upstream.search = request.nextUrl.search;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  try {
    const response = await fetch(upstream, init);
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');
    return new NextResponse(response.body, { status: response.status, headers: responseHeaders });
  } catch (error) {
    console.error('engine_proxy_error', { upstream: upstream.toString(), error });
    return NextResponse.json({ error: 'Engine unavailable' }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
