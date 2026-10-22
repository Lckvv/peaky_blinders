import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromApiKey } from '@/lib/auth';
import { EVE_ACTIVE_KEY_ERROR, isActiveEveKey, isEveKey } from '@/lib/eve-event-ended';

const EVE_PRESENCE_MAX_AGE_MS = 15 * 1000; // 15 s — kto nie odświeży obecności (POST co 6 s) w tym czasie jest usuwany z listy

function rejectKey(eveKey: number): NextResponse | null {
  if (Number.isInteger(eveKey) && isActiveEveKey(eveKey)) return null;
  if (Number.isInteger(eveKey) && isEveKey(eveKey)) {
    return NextResponse.json({ error: 'Event zakończony.', event_ended: true }, { status: 410 });
  }
  return NextResponse.json({ error: EVE_ACTIVE_KEY_ERROR }, { status: 400 });
}

// POST /api/timer/eve-map-presence — zgłoś "jestem na mapie" (X-API-Key, body: eveKey, mapName, nick)
// Przy okazji odświeża EveMapLastLeft, więc „ostatnio ktoś był na mapie” liczy serwer, nie klienci.
export async function POST(request: NextRequest) {
  try {
    const user = await authFromApiKey(request);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
    }

    const body = await request.json();
    const eveKey = body?.eveKey != null ? parseInt(String(body.eveKey), 10) : NaN;
    const mapName = typeof body?.mapName === 'string' ? body.mapName.trim() : '';
    const nick = typeof body?.nick === 'string' ? body.nick.trim() : '';

    const rejected = rejectKey(eveKey);
    if (rejected) return rejected;
    if (!mapName) {
      return NextResponse.json({ error: 'mapName is required' }, { status: 400 });
    }
    if (!nick) {
      return NextResponse.json({ error: 'nick is required' }, { status: 400 });
    }

    const now = new Date();
    const cutoff = new Date(now.getTime() - EVE_PRESENCE_MAX_AGE_MS);
    await prisma.$transaction([
      prisma.eveMapPresence.deleteMany({
        where: { eveKey, lastSeen: { lt: cutoff } },
      }),
      prisma.eveMapPresence.upsert({
        where: {
          eveKey_mapName_nick: { eveKey, mapName, nick },
        },
        create: { eveKey, mapName, nick },
        update: { lastSeen: now },
      }),
      prisma.eveMapLastLeft.upsert({
        where: { eveKey_mapName: { eveKey, mapName } },
        create: { eveKey, mapName, lastLeftAt: now },
        update: { lastLeftAt: now },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[POST /api/timer/eve-map-presence]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/timer/eve-map-presence — usuń obecność "wyszedłem z mapy" (X-API-Key, query: eveKey, mapName, nick)
export async function DELETE(request: NextRequest) {
  try {
    const user = await authFromApiKey(request);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
    }

    const eveKeyStr = request.nextUrl.searchParams.get('eveKey');
    const eveKey = eveKeyStr ? parseInt(eveKeyStr, 10) : NaN;
    const mapName = request.nextUrl.searchParams.get('mapName')?.trim() ?? '';
    const nick = request.nextUrl.searchParams.get('nick')?.trim() ?? '';

    const rejected = rejectKey(eveKey);
    if (rejected) return rejected;
    if (!mapName || !nick) {
      return NextResponse.json({ error: 'mapName and nick are required' }, { status: 400 });
    }

    const now = new Date();
    const removed = await prisma.eveMapPresence.deleteMany({
      where: { eveKey, mapName, nick },
    });
    if (removed.count > 0) {
      await prisma.eveMapLastLeft.upsert({
        where: { eveKey_mapName: { eveKey, mapName } },
        create: { eveKey, mapName, lastLeftAt: now },
        update: { lastLeftAt: now },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[DELETE /api/timer/eve-map-presence]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
