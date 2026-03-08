import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromApiKey } from '@/lib/auth';

/**
 * POST /api/timer/hero-alert-log — zapisz w logach, kto wysłał powiadomienie „Powiadom klan na Discordzie”.
 * Nagłówek X-API-Key; body: senderNick, heroNick, mapName, lvl?, x?, y?
 * Nie wysyła nic na Discord — tylko zapis w naszej bazie (HeroAlertLog).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authFromApiKey(request);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const senderNick = typeof body?.senderNick === 'string' ? body.senderNick.trim() : '';
    const heroNick = typeof body?.heroNick === 'string' ? body.heroNick.trim() : '';
    const mapName = typeof body?.mapName === 'string' ? body.mapName.trim() : '';

    if (!heroNick || !mapName) {
      return NextResponse.json(
        { error: 'heroNick and mapName are required' },
        { status: 400 }
      );
    }

    const lvl = body?.lvl != null ? parseInt(String(body.lvl), 10) : null;
    const x = body?.x != null ? parseInt(String(body.x), 10) : null;
    const y = body?.y != null ? parseInt(String(body.y), 10) : null;

    await prisma.heroAlertLog.create({
      data: {
        userId: user.id,
        senderNick: senderNick || '?',
        heroNick,
        mapName,
        lvl: Number.isInteger(lvl) ? lvl : null,
        x: Number.isInteger(x) ? x : null,
        y: Number.isInteger(y) ? y : null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[POST /api/timer/hero-alert-log]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
