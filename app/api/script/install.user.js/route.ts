import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

const SCRIPT_VERSION = '2.2';

// GET /api/script/install.user.js?token=JWT
// Serwuje LOADER â€“ maĹ‚y skrypt, ktĂłry Ĺ‚aduje wĹ‚aĹ›ciwy kod z serwera (ochrona oryginaĹ‚u).
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return jsError('Missing token. Go to the site and click "Install Script".');
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return jsError('Invalid or expired token. Log in again.');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      apiKeys: { where: { active: true }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  if (!user || user.apiKeys.length === 0) {
    return jsError('No active API key. Generate one on the site first.');
  }

  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host') || 'localhost:3000';
  const backendUrl = `${proto}://${host}`;
  const scriptUrl = `${backendUrl}/api/script/serve.user.js?token=${encodeURIComponent(token)}&v=${SCRIPT_VERSION}`;

  const loader = generateLoader(scriptUrl, backendUrl, SCRIPT_VERSION);

  return new NextResponse(loader, {
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function generateLoader(scriptUrl: string, backendUrl: string, version: string): string {
  const urlEscaped = scriptUrl.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `// ==UserScript==
// @name         Margonem Map Timer
// @namespace    http://tampermonkey.net/
// @version      ${version}
// @description  Loader - laduje skrypt z serwera (Peaky Blinders Map Timer)
// @author       Lucek
// @match        https://*.margonem.com/*
// @connect      *
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
  "use strict";
  var url = "${urlEscaped}";
  GM_xmlhttpRequest({
    method: "GET",
    url: url,
    onload: function (res) {
      if (res.status >= 200 && res.status < 300) {
        try {
          (function () { "use strict"; eval(res.responseText); })();
        } catch (e) {
          console.error("[MapTimer Loader] eval error:", e);
        }
      } else {
        console.error("[MapTimer Loader] fetch failed:", res.status);
      }
    },
    onerror: function () { console.error("[MapTimer Loader] network error"); }
  });
})();
`;
}

function jsError(msg: string) {
  return new NextResponse(`// ERROR: ${msg}`, {
    status: 401,
    headers: { 'Content-Type': 'text/javascript; charset=utf-8' },
  });
}
