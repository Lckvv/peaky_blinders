import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromApiKey } from '@/lib/auth';

const EVE_KEYS = [63, 143, 300];

// Min 15 min między przyznaniem punktu dla tego samego herosa (tylko pierwszy w oknie dostaje pkt)
const EVE_HUNTER_COOLDOWN_MIN = 15;

// GET /api/timer/eve-respawn — czas „ostatnio opuszczono mapę” per eveKey (max lastLeftAt po mapach).
// Timer nalicza się gdy stoimy na mapie (brak cooldownu); skrypt pokazuje czas od ostatniego zejścia.
export async function GET() {
  try {
    const rows = await prisma.eveMapLastLeft.findMany({
      where: { eveKey: { in: EVE_KEYS } },
    });
    const timers: Record<number, number> = {};
    EVE_KEYS.forEach((eveKey) => {
      const forKey = rows.filter((r) => r.eveKey === eveKey);
      if (forKey.length > 0) {
        const maxTs = Math.max(...forKey.map((r) => r.lastLeftAt.getTime()));
        timers[eveKey] = maxTs;
      }
    });
    return NextResponse.json({ timers });
  } catch (e) {
    console.error('[GET /api/timer/eve-respawn]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/timer/eve-respawn — ustaw "hero zabity" + 1 pkt dla łowcy (X-API-Key, body: eveKey). Cooldown: jeden zgłosiciel na okno respawnu.
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

    const cooldownMs = EVE_HUNTER_COOLDOWN_MIN * 60 * 1000;

    const existing = await prisma.eveRespawnTimer.findUnique({
      where: { eveKey },
    });

    const now = Date.now();
    if (existing) {
      const elapsed = now - existing.killedAt.getTime();
      if (elapsed < cooldownMs) {
        const waitMin = Math.ceil((cooldownMs - elapsed) / 60000);
        return NextResponse.json(
          {
            error: 'Hero jeszcze się odradza. Poczekaj przed zgłoszeniem kolejnego zabójstwa.',
            waitMinutes: waitMin,
          },
          { status: 429 }
        );
      }
    }

    await prisma.$transaction([
      prisma.eveRespawnTimer.upsert({
        where: { eveKey },
        create: { eveKey },
        update: { killedAt: new Date() },
      }),
      prisma.eveHunterKill.create({
        data: { eveKey, userId: user.id },
      }),
    ]);

    return NextResponse.json({ ok: true, points: 1 });
  } catch (e) {
    console.error('[POST /api/timer/eve-respawn]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
