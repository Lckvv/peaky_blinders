import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// GET /api/script/serve.user.js?v=2.2&token=optional
// Serwuje pełny skrypt. Z tokenem: wstrzykuje API key i backend URL. Bez tokenu: skrypt z pustym API key (użytkownik ustawia w opcjach).
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host') || 'localhost:3000';
  const backendUrl = `${proto}://${host}`;

  let code: string;
  try {
    const path = join(process.cwd(), 'tampermonkey-map-timer.user.js');
    if (!existsSync(path)) {
      return new NextResponse('// Script file not found', { status: 404, headers: { 'Content-Type': 'text/javascript' } });
    }
    code = readFileSync(path, 'utf8');
  } catch {
    return new NextResponse('// Error reading script', { status: 500, headers: { 'Content-Type': 'text/javascript' } });
  }

  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: { apiKeys: { where: { active: true }, orderBy: { createdAt: 'desc' }, take: 1 } },
      });
      if (user?.apiKeys?.[0]) {
        const apiKey = user.apiKeys[0].key;
        const keyEscaped = String(apiKey).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const urlEscaped = String(backendUrl).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        code = code.replace(/GM_getValue\s*\(\s*['"]api_key['"]\s*,\s*['"][^'"]*['"]\s*\)/, `GM_getValue('api_key', '${keyEscaped}')`);
        code = code.replace(/GM_getValue\s*\(\s*['"]backend_url['"]\s*,\s*['"][^'"]*['"]\s*\)/, `GM_getValue('backend_url', '${urlEscaped}')`);
      }
    }
  }

  return new NextResponse(code, {
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=120',
    },
  });
}
