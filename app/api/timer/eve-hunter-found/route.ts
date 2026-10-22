import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromApiKey } from '@/lib/auth';
import { EVE_ACTIVE_KEY_ERROR, getEveHero, isActiveEveKey, isEveKey } from '@/lib/eve-event-ended';

/**
 * POST /api/timer/eve-hunter-found — zgłoś "znalazłem herosa" (właśnie go widzę na mapie).
 * Skrypt wywołuje to w momencie wykrycia herosa (lista NPC, nick herosa eventowego).
 * Punkt dostaje pierwszy znalazca danego spawnu. Kolejny punkt jest możliwy dopiero gdy:
 * - po ostatnim punkcie zapisano zabicie herosa (EveHeroKill), albo
 * - minął minimalny czas respawnu (zabicie mogło nie zostać wykryte).
 * EveRespawnTimer.killedAt przechowuje czas ostatnio przyznanego punktu.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authFromApiKey(request);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
    }

    const body = await request.json();
    const eveKey = body?.eveKey != null ? parseInt(String(body.eveKey), 10) : NaN;

    if (!Number.isInteger(eveKey) || !isActiveEveKey(eveKey)) {
      if (Number.isInteger(eveKey) && isEveKey(eveKey)) {
        return NextResponse.json({ error: 'Event zakończony.', event_ended: true }, { status: 410 });
      }
      return NextResponse.json({ error: EVE_ACTIVE_KEY_ERROR }, { status: 400 });
    }
    const cooldownMs = getEveHero(eveKey)!.respawnMinMin * 60_000;

    const now = Date.now();
    const awarded = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock($1)', eveKey + 1e9);
      const [lastClaim, lastKill] = await Promise.all([
        tx.eveRespawnTimer.findUnique({ where: { eveKey } }),
        tx.eveHeroKill.findFirst({ where: { eveKey }, orderBy: { killedAt: 'desc' } }),
      ]);
      const canAward =
        !lastClaim ||
        (lastKill != null && lastKill.killedAt > lastClaim.killedAt) ||
        now - lastClaim.killedAt.getTime() >= cooldownMs;
      if (!canAward) return false;
      await tx.eveHunterKill.create({
        data: { eveKey, userId: user.id },
      });
      await tx.eveRespawnTimer.upsert({
        where: { eveKey },
        create: { eveKey, killedAt: new Date(now) },
        update: { killedAt: new Date(now) },
      });
      return true;
    });

    if (!awarded) {
      return NextResponse.json({ error: 'Punkt za ten spawn już przyznany.' }, { status: 429 });
    }
    return NextResponse.json({ ok: true, points: 1 });
  } catch (e) {
    console.error('[POST /api/timer/eve-hunter-found]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
