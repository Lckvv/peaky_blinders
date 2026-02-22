import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromApiKey } from '@/lib/auth';

const EVE_KEYS = [63, 143, 300];

const EVE_HUNTER_COOLDOWN_MIN: Record<number, number> = {
  63: 35,
  143: 50,
  300: 60,
};

/**
 * POST /api/timer/eve-hunter-found — zgłoś "znalazłem herosa" (właśnie go widzę na mapie).
 * Skrypt wywołuje to w momencie wykrycia herosa (lista NPC, nick = Seeker of Creation / Harbinger of Elancia / Thunder-Wielding Barbarian).
 * Pierwszy gracz, którego request przejdzie (cooldown minął), dostaje +1 pkt. Nie aktualizujemy timera respu (killedAt).
 */
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

    const cooldownMin = EVE_HUNTER_COOLDOWN_MIN[eveKey] ?? 60;
    const cooldownMs = cooldownMin * 60 * 1000;

    const existing = await prisma.eveRespawnTimer.findUnique({
      where: { eveKey },
    });
    const now = Date.now();
    const minRespawnPassed =
      !existing || now - existing.killedAt.getTime() >= cooldownMs;
    if (!minRespawnPassed) {
      const waitMin = existing
        ? Math.ceil((cooldownMs - (now - existing.killedAt.getTime())) / 60000)
        : 0;
      return NextResponse.json(
        { error: 'Cooldown. Poczekaj przed kolejnym zgłoszeniem.', waitMinutes: waitMin },
        { status: 429 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        'SELECT pg_advisory_xact_lock($1)',
        eveKey + 1e9
      );
      const row = await tx.eveRespawnTimer.findUnique({
        where: { eveKey },
      });
      const passed =
        !row || now - row.killedAt.getTime() >= cooldownMs;
      if (!passed) return;
      await tx.eveHunterKill.create({
        data: { eveKey, userId: user.id },
      });
    });

    return NextResponse.json({ ok: true, points: 1 });
  } catch (e) {
    console.error('[POST /api/timer/eve-hunter-found]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
