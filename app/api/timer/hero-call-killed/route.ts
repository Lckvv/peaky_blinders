import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromApiKey } from '@/lib/auth';
import { sanitizeDiscordText, sendClanDiscordMessage } from '@/lib/discord';
import { HERO_CALL_RETENTION_MS } from '@/lib/hero-calls';
import { rateLimit } from '@/lib/rate-limit';

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

/**
 * POST /api/timer/hero-call-killed — skrypt zgłasza, że heros/tytan zniknął z mapy (zbity).
 * Zgłasza każdy gracz z dodatkiem stojący na mapie; na Discord trafia tylko jedna wiadomość,
 * bo wołanie oznaczamy atomowo (updateMany z killedAt: null) i wysyła ten, kto oznaczył pierwszy.
 * X-API-Key; body: { nick, mapName, reporterNick }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authFromApiKey(request);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
    }
    if (!rateLimit(`hero-call-killed:${user.id}`, 10, 5 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const nick = typeof body?.nick === 'string' ? body.nick.trim() : '';
    const mapName = typeof body?.mapName === 'string' ? body.mapName.trim() : '';
    const reporterNick = typeof body?.reporterNick === 'string' ? body.reporterNick.trim().slice(0, 80) : '';
    if (!nick || !mapName) {
      return NextResponse.json({ error: 'nick and mapName are required' }, { status: 400 });
    }

    const calls = await prisma.heroLevelNotification.findMany({
      where: {
        nick,
        mapName,
        killedAt: null,
        createdAt: { gte: new Date(Date.now() - HERO_CALL_RETENTION_MS) },
      },
      orderBy: { createdAt: 'asc' },
      include: { helpers: { select: { nick: true }, orderBy: { createdAt: 'asc' } } },
    });
    if (!calls.length) {
      return NextResponse.json({ ok: true, reported: false });
    }

    const killedAt = new Date();
    const marked = await prisma.heroLevelNotification.updateMany({
      where: { id: { in: calls.map((c) => c.id) }, killedAt: null },
      data: { killedAt, killedBy: reporterNick || '?' },
    });
    if (marked.count === 0) {
      return NextResponse.json({ ok: true, reported: false });
    }

    const first = calls[0];
    const kind = first.kind === 'titan' ? 'titan' : 'hero';
    const callers = unique(calls.map((c) => sanitizeDiscordText(c.callerNick, 40)));
    const helpers = unique(calls.flatMap((c) => c.helpers.map((h) => sanitizeDiscordText(h.nick, 40))));
    const minutes = Math.max(1, Math.round((killedAt.getTime() - first.createdAt.getTime()) / 60000));

    let content = `✅ ${kind === 'titan' ? 'Tytan' : 'Heros'} ${sanitizeDiscordText(nick, 80)} zbity! (${sanitizeDiscordText(mapName, 120)})`;
    content += `\nWołał: ${callers.join(', ') || '?'} · od wołania: ${minutes} min`;
    content += helpers.length
      ? `\nZgłosili się do pomocy (${helpers.length}): ${helpers.join(', ')}`
      : '\nNikt nie zgłosił się do pomocy';

    const sent = await sendClanDiscordMessage({ kind, content: content.slice(0, 1900) });
    return NextResponse.json({ ok: true, reported: true, discord: sent.ok });
  } catch (e) {
    console.error('[POST /api/timer/hero-call-killed]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
