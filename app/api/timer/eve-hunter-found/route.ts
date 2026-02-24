import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromApiKey } from '@/lib/auth';

const EVE_KEYS = [63, 143, 300];

// Min 15 min między punktami dla tego samego herosa — liczy się tylko pierwszy znalazca w oknie
const EVE_HUNTER_COOLDOWN_MIN_MS = 15 * 60 * 1000;

/**
 * POST /api/timer/eve-hunter-found — zgłoś "znalazłem herosa" (właśnie go widzę na mapie).
 * Skrypt wywołuje to w momencie wykrycia herosa (lista NPC, nick = Seeker of Creation / Harbinger of Elancia / Thunder-Wielding Barbarian).
 * Pierwszy gracz w oknie 15 min dostaje +1 pkt; po przyznaniu ustawiamy killedAt (EveRespawnTimer), żeby przez 15 min nikt inny nie dostał punktu za tego samego herosa.
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

    const existing = await prisma.eveRespawnTimer.findUnique({
      where: { eveKey },
    });
    const now = Date.now();
    const minSinceLastClaim = existing ? (now - existing.killedAt.getTime()) / 60000 : Infinity;
    const canAwardPoint = minSinceLastClaim >= 15;

    if (!canAwardPoint) {
      const waitMin = existing
        ? Math.ceil(15 - minSinceLastClaim)
        : 0;
      return NextResponse.json(
        { error: 'Punkt już przyznany za tego herosa. Min. 15 min do kolejnego.', waitMinutes: Math.max(0, waitMin) },
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
        !row || now - row.killedAt.getTime() >= EVE_HUNTER_COOLDOWN_MIN_MS;
      if (!passed) return;
      await tx.eveHunterKill.create({
        data: { eveKey, userId: user.id },
      });
      await tx.eveRespawnTimer.upsert({
        where: { eveKey },
        create: { eveKey },
        update: { killedAt: new Date(now) },
      });
    });

    return NextResponse.json({ ok: true, points: 1 });
  } catch (e) {
    console.error('[POST /api/timer/eve-hunter-found]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
