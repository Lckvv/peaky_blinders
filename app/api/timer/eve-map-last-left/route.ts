import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromApiKey } from '@/lib/auth';
import { EVE_ACTIVE_KEY_ERROR, EVE_KEY_ERROR, isActiveEveKey, isEveKey } from '@/lib/eve-event-ended';

// GET /api/timer/eve-map-last-left?eveKey=132 — kiedy ostatnio ktoś był na każdej mapie (wspólne dla wszystkich)
export async function GET(request: NextRequest) {
  try {
    const eveKeyStr = request.nextUrl.searchParams.get('eveKey');
    const eveKey = eveKeyStr ? parseInt(eveKeyStr, 10) : NaN;
    if (!Number.isInteger(eveKey) || !isEveKey(eveKey)) {
      return NextResponse.json({ error: EVE_KEY_ERROR }, { status: 400 });
    }

    const rows = await prisma.eveMapLastLeft.findMany({
      where: { eveKey },
      orderBy: { mapName: 'asc' },
    });
    const lastLeft: Record<string, number> = {};
    rows.forEach((r) => {
      lastLeft[r.mapName] = r.lastLeftAt.getTime();
    });
    return NextResponse.json({ lastLeft });
  } catch (e) {
    console.error('[GET /api/timer/eve-map-last-left]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/timer/eve-map-last-left — ustaw "ostatnio opuszczono tę mapę" (X-API-Key, body: eveKey, mapName).
// Skrypt tego nie wywołuje — serwer aktualizuje czas przy POST/DELETE eve-map-presence.
export async function POST(request: NextRequest) {
  try {
    if (!(await authFromApiKey(request))) {
      return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
    }
    const body = await request.json();
    const eveKey = body?.eveKey != null ? parseInt(String(body.eveKey), 10) : NaN;
    const mapName = typeof body?.mapName === 'string' ? body.mapName.trim() : '';

    if (!Number.isInteger(eveKey) || !isActiveEveKey(eveKey)) {
      if (Number.isInteger(eveKey) && isEveKey(eveKey)) {
        return NextResponse.json({ error: 'Event zakończony.', event_ended: true }, { status: 410 });
      }
      return NextResponse.json({ error: EVE_ACTIVE_KEY_ERROR }, { status: 400 });
    }
    if (!mapName) {
      return NextResponse.json({ error: 'mapName is required' }, { status: 400 });
    }

    await prisma.eveMapLastLeft.upsert({
      where: {
        eveKey_mapName: { eveKey, mapName },
      },
      create: { eveKey, mapName },
      update: { lastLeftAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[POST /api/timer/eve-map-last-left]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
