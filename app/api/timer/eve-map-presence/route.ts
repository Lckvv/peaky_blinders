import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromApiKey } from '@/lib/auth';

const EVE_PRESENCE_MAX_AGE_MS = 5 * 60 * 1000; // 5 min — żeby przy schowanym oknie / throttlingu taba obecność nie znikała

// POST /api/timer/eve-map-presence — zgłoś "jestem na mapie" (X-API-Key, body: eveKey, mapName, nick)
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

    const cutoff = new Date(Date.now() - EVE_PRESENCE_MAX_AGE_MS);
    await prisma.$transaction([
      prisma.eveMapPresence.deleteMany({
        where: { eveKey, lastSeen: { lt: cutoff } },
      }),
      prisma.eveMapPresence.upsert({
        where: {
          eveKey_mapName_nick: { eveKey, mapName, nick },
        },
        create: { eveKey, mapName, nick },
        update: { lastSeen: new Date() },
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

    if (!Number.isInteger(eveKey) || ![63, 143, 300].includes(eveKey)) {
      return NextResponse.json({ error: 'eveKey must be 63, 143 or 300' }, { status: 400 });
    }
    if (!mapName || !nick) {
      return NextResponse.json({ error: 'mapName and nick are required' }, { status: 400 });
    }

    await prisma.eveMapPresence.deleteMany({
      where: { eveKey, mapName, nick },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[DELETE /api/timer/eve-map-presence]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
