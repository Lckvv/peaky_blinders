import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromApiKey } from '@/lib/auth';

const EVE_PRESENCE_MAX_AGE_MS = 2 * 60 * 1000; // 2 min

// GET /api/timer/eve-map-reservations?eveKey=63 — rezerwacje + obecność na mapach (kto jest na której mapie)
export async function GET(request: NextRequest) {
  try {
    const eveKeyStr = request.nextUrl.searchParams.get('eveKey');
    const eveKey = eveKeyStr ? parseInt(eveKeyStr, 10) : NaN;
    if (!Number.isInteger(eveKey) || ![63, 143, 300].includes(eveKey)) {
      return NextResponse.json({ error: 'eveKey must be 63, 143 or 300' }, { status: 400 });
    }

    const [rows, presenceRows] = await Promise.all([
      prisma.eveMapReservation.findMany({
        where: { eveKey },
        orderBy: { mapName: 'asc' },
      }),
      prisma.eveMapPresence.findMany({
        where: {
          eveKey,
          lastSeen: { gte: new Date(Date.now() - EVE_PRESENCE_MAX_AGE_MS) },
        },
        orderBy: [{ mapName: 'asc' }, { nick: 'asc' }],
      }),
    ]);

    const reservations = rows.map((r) => ({ mapName: r.mapName, nick: r.nick }));
    const presence = presenceRows.map((p) => ({ mapName: p.mapName, nick: p.nick }));
    return NextResponse.json({ reservations, presence });
  } catch (e) {
    console.error('[GET /api/timer/eve-map-reservations]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/timer/eve-map-reservations — zarezerwuj mapę (X-API-Key, body: eveKey, mapName, nick)
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

    if (!Number.isInteger(eveKey) || ![63, 143, 300].includes(eveKey)) {
      return NextResponse.json({ error: 'eveKey must be 63, 143 or 300' }, { status: 400 });
    }
    if (!mapName) {
      return NextResponse.json({ error: 'mapName is required' }, { status: 400 });
    }
    if (!nick) {
      return NextResponse.json({ error: 'nick is required' }, { status: 400 });
    }

    await prisma.eveMapReservation.upsert({
      where: {
        eveKey_mapName: { eveKey, mapName },
      },
      create: { eveKey, mapName, nick },
      update: { nick },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[POST /api/timer/eve-map-reservations]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/timer/eve-map-reservations — usuń rezerwację (X-API-Key, query: eveKey, mapName)
export async function DELETE(request: NextRequest) {
  try {
    const user = await authFromApiKey(request);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
    }

    const eveKeyStr = request.nextUrl.searchParams.get('eveKey');
    const eveKey = eveKeyStr ? parseInt(eveKeyStr, 10) : NaN;
    const mapName = request.nextUrl.searchParams.get('mapName')?.trim() ?? '';

    if (!Number.isInteger(eveKey) || ![63, 143, 300].includes(eveKey)) {
      return NextResponse.json({ error: 'eveKey must be 63, 143 or 300' }, { status: 400 });
    }
    if (!mapName) {
      return NextResponse.json({ error: 'mapName is required' }, { status: 400 });
    }

    await prisma.eveMapReservation.deleteMany({
      where: { eveKey, mapName },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[DELETE /api/timer/eve-map-reservations]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
