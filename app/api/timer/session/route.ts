import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromApiKey, validateApiKey } from '@/lib/auth';
import { getMonsterNameFromMap } from '@/lib/mapToMonster';
import { EVE_EVENT_ENDED, isEveHeroMonster } from '@/lib/eve-event-ended';
import {
  ABSOLUTE_MAX_SESSION_SEC,
  TITAN_AFK_CAP_SEC,
  clipOverlapSeconds,
} from '@/lib/session-limits';

// POST — record a map session (called by Tampermonkey script)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // API key: z nagłówka (GM_xmlhttpRequest) albo z body (sendBeacon — nie ustawia nagłówków)
    let user = await authFromApiKey(request);
    if (!user && body.apiKey) {
      user = await validateApiKey(body.apiKey);
    }
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or missing API key. Set X-API-Key header or apiKey in body.' },
        { status: 401 }
      );
    }

    const { time, monster: bodyMonster, map: mapName, hero, world, reason, timestamp, profileUrl, avatarUrl, outfitUrl } = body;

    const isMapEnter = reason === 'map_enter';
    if (typeof time !== 'number' || time < 0) {
      return NextResponse.json(
        { error: 'Invalid "time" — must be a non-negative number (seconds)' },
        { status: 400 }
      );
    }
    if (time < 1 && !isMapEnter) {
      return NextResponse.json(
        { error: 'Invalid "time" — must be at least 1 second unless reason is map_enter' },
        { status: 400 }
      );
    }

    if (!mapName || typeof mapName !== 'string') {
      return NextResponse.json(
        { error: 'Missing "map" field (map name from game)' },
        { status: 400 }
      );
    }

    if (!hero) {
      return NextResponse.json(
        { error: 'Missing "hero" field (character name)' },
        { status: 400 }
      );
    }

    // Przypisanie do tytana: z mapowania mapa → tytan, albo z payloadu "monster"
    const monster = getMonsterNameFromMap(mapName) ?? bodyMonster ?? null;
    if (!monster) {
      return NextResponse.json(
        {
          error: `Map "${mapName}" is not assigned to any phase. Add it in mapToMonster or send "monster" in payload.`,
        },
        { status: 400 }
      );
    }

    if (EVE_EVENT_ENDED && isEveHeroMonster(monster)) {
      return NextResponse.json(
        { error: 'Event zakończony. Naliczanie czasu wyłączone.', event_ended: true },
        { status: 410 }
      );
    }

    if (profileUrl != null && typeof profileUrl === 'string' && profileUrl.trim()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { profileUrl: profileUrl.trim().slice(0, 500) },
      });
    }
    const outfitUrlValue = (avatarUrl ?? outfitUrl) != null && typeof (avatarUrl ?? outfitUrl) === 'string'
      ? String(avatarUrl ?? outfitUrl).trim().slice(0, 500)
      : null;
    if (outfitUrlValue) {
      await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: outfitUrlValue },
      });
    }

    // Anti-abuse: reject malformed payloads (12h+)
    if (time > ABSOLUTE_MAX_SESSION_SEC) {
      return NextResponse.json(
        { error: 'Session too long (max 12h). Possible bug in script.' },
        { status: 400 }
      );
    }

    // Find or create monster (name z mapowania lub payloadu)
    let monsterRecord = await prisma.monster.findUnique({
      where: { name: monster },
    });

    if (!monsterRecord) {
      monsterRecord = await prisma.monster.create({
        data: {
          name: monster,
          mapName: mapName,
        },
      });
    }

    // Herosy eventowe (Easter 2026): bez faz, phaseId = null. Tytani: wymagana aktywna faza.
    const isHeroMonster = isEveHeroMonster(monster);

    let phaseId: string | null = null;
    if (!isHeroMonster) {
      const activePhase = await prisma.phase.findFirst({
        where: { monsterId: monsterRecord.id, isActive: true },
      });
      if (!activePhase) {
        return NextResponse.json(
          { error: 'No active phase for this monster. Session ignored.' },
          { status: 409 }
        );
      }
      phaseId = activePhase.id;
    }

    // Tytani: max 15 min na wizytę (AFK). startedAt liczymy od obciętego czasu, nie od raw `time`.
    let effectiveDurationSec = time;
    if (!isHeroMonster && !isMapEnter && effectiveDurationSec > TITAN_AFK_CAP_SEC) {
      effectiveDurationSec = TITAN_AFK_CAP_SEC;
    }

    const endedAt = timestamp ? new Date(timestamp) : new Date();
    let startedAt = new Date(endedAt.getTime() - effectiveDurationSec * 1000);

    const heroName = String(hero ?? 'Unknown');
    const reasonStr = String(reason ?? 'unknown');

    if (!isMapEnter && effectiveDurationSec > 0) {
      const overlapping = await prisma.mapSession.findMany({
        where: {
          userId: user.id,
          monsterId: monsterRecord.id,
          phaseId,
          heroName,
          duration: { gt: 0 },
          startedAt: { lt: endedAt },
          endedAt: { gt: startedAt },
        },
        select: { startedAt: true, endedAt: true },
      });
      const overlapSec = clipOverlapSeconds(startedAt, endedAt, overlapping);
      if (overlapSec > 0) {
        effectiveDurationSec = Math.max(0, effectiveDurationSec - overlapSec);
        startedAt = new Date(endedAt.getTime() - effectiveDurationSec * 1000);
      }
    }

    if (!isMapEnter && effectiveDurationSec < 1) {
      const totals = await sessionTotals(user.id, monsterRecord.id);
      return NextResponse.json({
        success: true,
        sessionTime: 0,
        ignored: 'overlap_or_cap',
        ...totals,
      });
    }

    // Deduplikacja: ten sam użytkownik może wysłać sesję 2× (np. skrypt w iframe + top). Ignoruj duplikat.
    const duplicateWindowMs = 15000; // 15 s
    const existingDuplicate = await prisma.mapSession.findFirst({
      where: {
        userId: user.id,
        monsterId: monsterRecord.id,
        phaseId: phaseId,
        heroName,
        duration: effectiveDurationSec,
        reason: reasonStr,
        endedAt: {
          gte: new Date(endedAt.getTime() - duplicateWindowMs),
          lte: new Date(endedAt.getTime() + duplicateWindowMs),
        },
      },
    });
    if (existingDuplicate) {
      const totals = await sessionTotals(user.id, monsterRecord.id);
      return NextResponse.json({
        success: true,
        sessionId: existingDuplicate.id,
        sessionTime: effectiveDurationSec,
        duplicate: true,
        ...totals,
      });
    }

    // Save session (world/reason ze skryptu mogą być number — baza wymaga string)
    // heroOutfitUrl = outfit tej konkretnej postaci z tej sesji (Nick ma wiele postaci, każda swój strój)
    // Dla herosów EVE zapisujemy effectiveDurationSec (pełny czas sesji)
    const session = await prisma.mapSession.create({
      data: {
        userId: user.id,
        monsterId: monsterRecord.id,
        phaseId: phaseId,
        heroName,
        heroOutfitUrl: outfitUrlValue || null,
        world: String(world ?? 'Unknown'),
        mapName: mapName,
        duration: effectiveDurationSec,
        reason: reasonStr,
        startedAt,
        endedAt,
      },
    });

    // Timer „ostatnio opuszczono mapę” jest ustawiany przez skrypt (POST /api/timer/eve-map-last-left), nie tutaj.
    // Punkt łowcy (63, 143, 300) jest przyznawany w /api/timer/eve-hunter-found — skrypt wywołuje go w momencie wykrycia herosa na mapie (lista NPC, nick), nie przy map_enter.

    const totals = await sessionTotals(user.id, monsterRecord.id);

    if (reason !== 'map_enter' || effectiveDurationSec > 0) {
      console.log(
        `[Timer] ${user.username} (${hero}) → ${monster} on "${mapName}" — ${effectiveDurationSec}s${effectiveDurationSec !== time ? ` (raw ${time}s, cap/overlap)` : ''} (total: ${totals.totalTime}s, sessions: ${totals.totalSessions})`
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      sessionTime: effectiveDurationSec,
      ...totals,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Timer Session] Error:', message, error);
    return NextResponse.json(
      { error: 'Internal server error', detail: process.env.NODE_ENV === 'development' ? message : undefined },
      { status: 500 }
    );
  }
}

async function sessionTotals(userId: string, monsterId: string) {
  const totalResult = await prisma.mapSession.aggregate({
    where: { userId, monsterId },
    _sum: { duration: true },
    _count: true,
  });
  const totalTime = totalResult._sum.duration || 0;
  const totalSessions = totalResult._count;
  return {
    totalTime,
    totalSessions,
    totalTimeFormatted: formatTime(totalTime),
  };
}

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}h ${m}m ${s}s`;
}
