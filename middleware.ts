import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const cors = getCorsHeaders(request);

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: cors,
    });
  }

  const response = NextResponse.next();
  Object.entries(cors).forEach(([key, value]) => {
    if (value) response.headers.set(key, value);
  });

  return response;
}

function isAllowedOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') return true;
    if (host === 'margonem.com' || host.endsWith('.margonem.com')) return true;
    if (host.endsWith('.railway.app')) return true;
    const appUrl = process.env.APP_URL;
    if (appUrl) {
      try {
        if (new URL(appUrl).hostname.toLowerCase() === host) return true;
      } catch {
        /* ignore */
      }
    }
    return false;
  } catch {
    return false;
  }
}

function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  const allowOrigin = origin && isAllowedOrigin(origin) ? origin : '';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
    'Access-Control-Max-Age': '86400',
  };
  if (allowOrigin) {
    headers['Access-Control-Allow-Origin'] = allowOrigin;
    headers.Vary = 'Origin';
  }
  return headers;
}

export const config = {
  matcher: '/api/:path*',
};
