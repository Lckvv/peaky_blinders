import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EVE_KEY_ERROR, getEveHero } from '@/lib/eve-event-ended';
const EVE_PRESENCE_MAX_AGE_MS = 15 * 1000; // spójne z eve-map-presence — po kilku sekundach bez POST gracz znika z listy

export const dynamic = 'force-dynamic';

// GET /api/timer/eve-dashboard?eveKey=132 — wszystko w jednym: rezerwacje, obecność, lastLeft, ostatnie zabicie + okno respawnu
export async function GET(request: NextRequest) {
  try {
    const eveKeyStr = request.nextUrl.searchParams.get('eveKey');
    const eveKey = eveKeyStr ? parseInt(eveKeyStr, 10) : NaN;
    const hero = Number.isInteger(eveKey) ? getEveHero(eveKey) : undefined;
    if (!hero) {
      return NextResponse.json({ error: EVE_KEY_ERROR }, { status: 400 });
    }

    const cutoff = new Date(Date.now() - EVE_PRESENCE_MAX_AGE_MS);
    const [reservations, presenceRows, lastLeftRows, lastKill] = await Promise.all([
      prisma.eveMapReservation.findMany({
        where: { eveKey },
        orderBy: { mapName: 'asc' },
      }),
      prisma.eveMapPresence.findMany({
        where: { eveKey, lastSeen: { gte: cutoff } },
        orderBy: [{ mapName: 'asc' }, { nick: 'asc' }],
      }),
      prisma.eveMapLastLeft.findMany({
        where: { eveKey },
        orderBy: { mapName: 'asc' },
      }),
      prisma.eveHeroKill.findFirst({
        where: { eveKey },
        orderBy: { killedAt: 'desc' },
      }),
    ]);

    const lastLeft: Record<string, number> = {};
    lastLeftRows.forEach((r) => {
      lastLeft[r.mapName] = r.lastLeftAt.getTime();
    });

    const respawn = lastKill
      ? {
          killedAt: lastKill.killedAt.getTime(),
          minAt: lastKill.killedAt.getTime() + hero.respawnMinMin * 60_000,
          maxAt: lastKill.killedAt.getTime() + hero.respawnMaxMin * 60_000,
          mapName: lastKill.mapName,
          killedBy: lastKill.reporterNick,
        }
      : null;

    return NextResponse.json(
      {
        eveKey,
        monster: hero.monster,
        ended: hero.ended,
        respawnMinMin: hero.respawnMinMin,
        respawnMaxMin: hero.respawnMaxMin,
        reservations: reservations.map((r) => ({ mapName: r.mapName, nick: r.nick })),
        presence: presenceRows.map((p) => ({ mapName: p.mapName, nick: p.nick })),
        lastLeft,
        respawn,
        serverNow: Date.now(),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    console.error('[GET /api/timer/eve-dashboard]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
