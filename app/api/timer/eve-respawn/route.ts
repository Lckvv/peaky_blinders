import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromApiKey } from '@/lib/auth';

const EVE_KEYS = [63, 143, 300];

// GET /api/timer/eve-respawn — czasy respu dla 63, 143, 300 (publiczne, dla skryptu)
export async function GET() {
  try {
    const rows = await prisma.eveRespawnTimer.findMany({
      where: { eveKey: { in: EVE_KEYS } },
    });
    const timers: Record<number, number> = {};
    rows.forEach((r) => {
      timers[r.eveKey] = r.killedAt.getTime();
    });
    return NextResponse.json({ timers });
  } catch (e) {
    console.error('[GET /api/timer/eve-respawn]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/timer/eve-respawn — ustaw "hero zabity" (X-API-Key, body: eveKey)
export async function POST(request: NextRequest) {
  try {
    const user = await authFromApiKey(request);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
    }

    const body = await request.json();
    const eveKey = body?.eveKey != null ? parseInt(String(body.eveKey), 10) : NaN;

    if (!Number.isInteger(eveKey) || !EVE_KEYS.includes(eveKey)) {
      return NextResponse.json(
        { error: 'eveKey must be 63, 143 or 300' },
        { status: 400 }
      );
    }

    await prisma.eveRespawnTimer.upsert({
      where: { eveKey },
      create: { eveKey },
      update: { killedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[POST /api/timer/eve-respawn]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
