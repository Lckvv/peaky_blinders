import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

function jsError(msg: string, status = 401) {
  return new NextResponse(`// ERROR: ${msg}`, {
    status,
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

// GET /api/script/serve.user.js?token=JWT
// Tylko zalogowany użytkownik (ważny token) dostaje skrypt.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return jsError('Missing token. Install the script from the site while logged in.');
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return jsError('Invalid or expired token. Log in again and reinstall the script.');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { apiKeys: { where: { active: true }, orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  if (!user?.apiKeys?.[0]) {
    return jsError('No active API key. Generate one on the site first.');
  }

  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host') || 'localhost:3000';
  const backendUrl = `${proto}://${host}`;

  let code: string;
  try {
    const path = join(process.cwd(), 'tampermonkey-map-timer.user.js');
    if (!existsSync(path)) {
      return jsError('Script file not found', 404);
    }
    code = readFileSync(path, 'utf8');
  } catch {
    return jsError('Error reading script', 500);
  }

  const apiKey = user.apiKeys[0].key;
  const keyEscaped = String(apiKey).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const urlEscaped = String(backendUrl).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  code = code.replace(/var INSTALL_API_KEY = '';/, `var INSTALL_API_KEY = '${keyEscaped}';`);
  code = code.replace(/var INSTALL_BACKEND_URL = '';/, `var INSTALL_BACKEND_URL = '${urlEscaped}';`);
  code = code.replace(/GM_getValue\s*\(\s*['"]api_key['"]\s*,\s*['"][^'"]*['"]\s*\)/g, `GM_getValue('api_key', '${keyEscaped}')`);
  code = code.replace(/GM_getValue\s*\(\s*['"]backend_url['"]\s*,\s*['"][^'"]*['"]\s*\)/g, `GM_getValue('backend_url', '${urlEscaped}')`);

  return new NextResponse(code, {
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
