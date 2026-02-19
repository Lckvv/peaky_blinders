import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const EVE_KEYS = [63, 143, 300];

// GET /api/timer/eve-map-last-left?eveKey=63 — kiedy ostatnio opuszczono każdą mapę (dla wielu map EVE, wspólne dla wszystkich)
export async function GET(request: NextRequest) {
  try {
    const eveKeyStr = request.nextUrl.searchParams.get('eveKey');
    const eveKey = eveKeyStr ? parseInt(eveKeyStr, 10) : NaN;
    if (!Number.isInteger(eveKey) || !EVE_KEYS.includes(eveKey)) {
      return NextResponse.json({ error: 'eveKey must be 63, 143 or 300' }, { status: 400 });
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

// POST /api/timer/eve-map-last-left — ustaw "ostatnio opuszczono tę mapę" (body: eveKey, mapName), bez auth
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const eveKey = body?.eveKey != null ? parseInt(String(body.eveKey), 10) : NaN;
    const mapName = typeof body?.mapName === 'string' ? body.mapName.trim() : '';

    if (!Number.isInteger(eveKey) || !EVE_KEYS.includes(eveKey)) {
      return NextResponse.json({ error: 'eveKey must be 63, 143 or 300' }, { status: 400 });
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
