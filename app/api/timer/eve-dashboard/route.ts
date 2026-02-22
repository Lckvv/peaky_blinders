import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const EVE_KEYS = [63, 143, 300];
const EVE_PRESENCE_MAX_AGE_MS = 5 * 60 * 1000;

// GET /api/timer/eve-dashboard?eveKey=63 — wszystko w jednym: rezerwacje, obecność, lastLeft, respawn (mniej requestów = mniej lagu)
export async function GET(request: NextRequest) {
  try {
    const eveKeyStr = request.nextUrl.searchParams.get('eveKey');
    const eveKey = eveKeyStr ? parseInt(eveKeyStr, 10) : NaN;
    if (!Number.isInteger(eveKey) || !EVE_KEYS.includes(eveKey)) {
      return NextResponse.json({ error: 'eveKey must be 63, 143 or 300' }, { status: 400 });
    }

    const cutoff = new Date(Date.now() - EVE_PRESENCE_MAX_AGE_MS);
    const [reservations, presenceRows, lastLeftRows, respawnRow] = await Promise.all([
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
      prisma.eveRespawnTimer.findUnique({
        where: { eveKey },
      }),
    ]);

    const lastLeft: Record<string, number> = {};
    lastLeftRows.forEach((r) => {
      lastLeft[r.mapName] = r.lastLeftAt.getTime();
    });

    return NextResponse.json({
      reservations: reservations.map((r) => ({ mapName: r.mapName, nick: r.nick })),
      presence: presenceRows.map((p) => ({ mapName: p.mapName, nick: p.nick })),
      lastLeft,
      respawnTimer: respawnRow ? respawnRow.killedAt.getTime() : null,
    });
  } catch (e) {
    console.error('[GET /api/timer/eve-dashboard]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
