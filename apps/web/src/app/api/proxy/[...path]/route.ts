import axios from 'axios';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getEnv } from '@/lib/env';

const API_ENDPOINT = getEnv('API_ENDPOINT', 'http://localhost:3000');

const axiosInstance = axios.create({
  baseURL: API_ENDPOINT,
  validateStatus: () => true,
});

const ALLOWED_PATH_PREFIX = '/batches';

const sanitizePath = (rawPath: string): string | null => {
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return null;
  }
  if (decoded.includes('..') || decoded.includes('\0') || /[<>"']/.test(decoded)) {
    return null;
  }
  if (!decoded.startsWith(ALLOWED_PATH_PREFIX)) return null;

  return decoded;
};

const proxySseStream = async (path: string, searchParams: string, request: NextRequest): Promise<Response> => {
  const targetUrl = `${API_ENDPOINT}${path}${searchParams ? `?${searchParams}` : ''}`;
  const lastEventId = request.headers.get('last-event-id');

  const upstream = await fetch(targetUrl, {
    headers: {
      Accept: 'text/event-stream',
      ...(lastEventId ? { 'Last-Event-ID': lastEventId } : {}),
    },
    signal: request.signal,
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
};

const proxyRequest = async (request: NextRequest, method: string) => {
  try {
    const rawPath = request.nextUrl.pathname.replace('/api/proxy', '');
    const path = sanitizePath(rawPath);

    if (!path) {
      return NextResponse.json({ error: 'Invalid or disallowed request path' }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams.toString();

    if (method === 'GET' && path.endsWith('/events')) {
      return proxySseStream(path, searchParams, request);
    }

    const targetUrl = `${path}${searchParams ? `?${searchParams}` : ''}`;

    let data: unknown;
    const contentType = request.headers.get('content-type');

    if (method !== 'GET' && method !== 'HEAD') {
      if (contentType?.includes('application/json')) data = await request.json();
      else data = await request.text();
    }

    const headers: Record<string, string> = {};
    if (contentType) headers['Content-Type'] = contentType;

    const response = await axiosInstance.request({ method, url: targetUrl, headers, data });

    const responseContentType = response.headers['content-type'];
    return NextResponse.json(response.data, {
      status: response.status,
      headers: { 'Content-Type': typeof responseContentType === 'string' ? responseContentType : 'application/json' },
    });
  } catch {
    return NextResponse.json({ error: 'Proxy request failed' }, { status: 500 });
  }
};

export const GET = (request: NextRequest) => proxyRequest(request, 'GET');
export const POST = (request: NextRequest) => proxyRequest(request, 'POST');
export const PUT = (request: NextRequest) => proxyRequest(request, 'PUT');
export const PATCH = (request: NextRequest) => proxyRequest(request, 'PATCH');
export const DELETE = (request: NextRequest) => proxyRequest(request, 'DELETE');
