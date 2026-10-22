import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromApiKey } from '@/lib/auth';
import { EVE_ACTIVE_KEYS, EVE_ACTIVE_KEY_ERROR, getEveHero, isActiveEveKey, isEveKey } from '@/lib/eve-event-ended';
import { recordEveHeroKill } from '@/lib/eve-kills';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// GET /api/timer/eve-respawn — ostatnie zabicie i okno respawnu (min/max) per heros trwającego eventu.
export async function GET() {
  try {
    const timers: Record<number, { killedAt: number; minAt: number; maxAt: number; mapName: string; killedBy: string }> = {};
    await Promise.all(
      EVE_ACTIVE_KEYS.map(async (eveKey) => {
        const hero = getEveHero(eveKey)!;
        const last = await prisma.eveHeroKill.findFirst({
          where: { eveKey },
          orderBy: { killedAt: 'desc' },
        });
        if (!last) return;
        const killedAt = last.killedAt.getTime();
        timers[eveKey] = {
          killedAt,
          minAt: killedAt + hero.respawnMinMin * 60_000,
          maxAt: killedAt + hero.respawnMaxMin * 60_000,
          mapName: last.mapName,
          killedBy: last.reporterNick,
        };
      })
    );
    return NextResponse.json({ timers, serverNow: Date.now() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[GET /api/timer/eve-respawn]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/timer/eve-respawn — ręczne zgłoszenie „heros zabity teraz” (X-API-Key, body: eveKey, mapName?, nick?).
// Automatycznie zabicia zapisuje /api/timer/hero-call-killed (log walki); to jest awaryjny przycisk z okna w grze.
export async function POST(request: NextRequest) {
  try {
    const user = await authFromApiKey(request);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
    }
    if (!rateLimit(`eve-respawn:${user.id}`, 5, 5 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const eveKey = body?.eveKey != null ? parseInt(String(body.eveKey), 10) : NaN;
    if (!Number.isInteger(eveKey) || !isActiveEveKey(eveKey)) {
      if (Number.isInteger(eveKey) && isEveKey(eveKey)) {
        return NextResponse.json({ error: 'Event zakończony.', event_ended: true }, { status: 410 });
      }
      return NextResponse.json({ error: EVE_ACTIVE_KEY_ERROR }, { status: 400 });
    }
    const mapName = typeof body?.mapName === 'string' && body.mapName.trim() ? body.mapName.trim() : '?';
    const nick = typeof body?.nick === 'string' && body.nick.trim() ? body.nick.trim() : user.nick || user.username;

    const recorded = await recordEveHeroKill({ eveKey, mapName, reporterNick: nick, userId: user.id });
    if (!recorded) {
      return NextResponse.json(
        { error: 'Zabicie już zapisane (w ciągu ostatnich 10 min).', duplicate: true },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[POST /api/timer/eve-respawn]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
