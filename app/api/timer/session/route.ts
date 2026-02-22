import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromApiKey, validateApiKey } from '@/lib/auth';
import { getMonsterNameFromMap } from '@/lib/mapToMonster';

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

    // Anti-abuse: max session 12 hours, reject suspiciously long
    if (time > 43200) {
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

    // Herosy eventowe 63, 143, 300: bez faz, phaseId = null. Tytani: wymagana aktywna faza.
    const HERO_MONSTERS = ['Seeker of Creation', 'Harbinger of Elancia', 'Thunder-Wielding Barbarian'];
    const HERO_TO_EVE_KEY: Record<string, number> = {
      'Seeker of Creation': 63,
      'Harbinger of Elancia': 143,
      'Thunder-Wielding Barbarian': 300,
    };
    // Freeze naliczania czasu po zabiciu herosa (minuty)
    const EVE_FREEZE_MIN: Record<number, number> = {
      63: 17,
      143: 32,
      300: 40,
    };
    // Cooldown łowcy: minuty po zabiciu, zanim można przyznać kolejny punkt (automatycznie przy wyjściu z mapy)
    const EVE_HUNTER_COOLDOWN_MIN: Record<number, number> = {
      63: 35,
      143: 50,
      300: 60,
    };
    const isHeroMonster = HERO_MONSTERS.includes(monster);

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

    // Calculate session start time
    const endedAt = timestamp ? new Date(timestamp) : new Date();
    const startedAt = new Date(endedAt.getTime() - time * 1000);

    // Dla herosów EVE (63, 143, 300): dodajemy czas zawsze (działa w tle, bez otwartego okna). Gdy nie znamy timera respu — liczymy pełny czas.
    // Odejmujemy tylko okno freeze (X min po zabiciu), gdy wiemy że heros nie żyje — wtedy ten czas nie jest naliczany.
    let effectiveDurationSec = time;
    if (isHeroMonster) {
      const eveKey = HERO_TO_EVE_KEY[monster];
      const freezeMin = eveKey != null ? EVE_FREEZE_MIN[eveKey] : 0;
      if (eveKey != null && freezeMin > 0) {
        const respawn = await prisma.eveRespawnTimer.findUnique({
          where: { eveKey },
        });
        if (respawn) {
          const killedAt = respawn.killedAt.getTime();
          const freezeMs = freezeMin * 60 * 1000;
          const freezeEnd = killedAt + freezeMs;
          const startMs = startedAt.getTime();
          const endMs = endedAt.getTime();
          const overlapStart = Math.max(startMs, killedAt);
          const overlapEnd = Math.min(endMs, freezeEnd);
          const overlapMs = Math.max(0, overlapEnd - overlapStart);
          effectiveDurationSec = Math.max(0, time - Math.floor(overlapMs / 1000));
        }
      }
    }

    // Deduplikacja: ten sam użytkownik może wysłać sesję 2× (np. skrypt w iframe + top). Ignoruj duplikat.
    const duplicateWindowMs = 15000; // 15 s
    const existingDuplicate = await prisma.mapSession.findFirst({
      where: {
        userId: user.id,
        monsterId: monsterRecord.id,
        phaseId: phaseId,
        heroName: String(hero ?? 'Unknown'),
        duration: time,
        reason: String(reason ?? 'unknown'),
        endedAt: {
          gte: new Date(endedAt.getTime() - duplicateWindowMs),
          lte: new Date(endedAt.getTime() + duplicateWindowMs),
        },
      },
    });
    if (existingDuplicate) {
      const totalResult = await prisma.mapSession.aggregate({
        where: {
          userId: user.id,
          monsterId: monsterRecord.id,
        },
        _sum: { duration: true },
        _count: true,
      });
      const totalTime = totalResult._sum.duration || 0;
      const totalSessions = totalResult._count;
      return NextResponse.json({
        success: true,
        sessionId: existingDuplicate.id,
        sessionTime: effectiveDurationSec,
        totalTime,
        totalSessions,
        totalTimeFormatted: formatTime(totalTime),
        duplicate: true,
      });
    }

    // Save session (world/reason ze skryptu mogą być number — baza wymaga string)
    // heroOutfitUrl = outfit tej konkretnej postaci z tej sesji (Nick ma wiele postaci, każda swój strój)
    // Dla herosów EVE zapisujemy effectiveDurationSec (pełny czas minus freeze, gdy znamy timer)
    const session = await prisma.mapSession.create({
      data: {
        userId: user.id,
        monsterId: monsterRecord.id,
        phaseId: phaseId,
        heroName: String(hero ?? 'Unknown'),
        heroOutfitUrl: outfitUrlValue || null,
        world: String(world ?? 'Unknown'),
        mapName: mapName,
        duration: effectiveDurationSec,
        reason: String(reason ?? 'unknown'),
        startedAt,
        endedAt,
      },
    });

    // 1) Zejście z mapy (hero zabity / zniknął): ustaw timer respawnu (killedAt = now), żeby odliczanie i freeze działały
    if (isHeroMonster && reason !== 'map_enter') {
      const eveKey = HERO_TO_EVE_KEY[monster];
      if (eveKey != null) {
        const cooldownMin = EVE_HUNTER_COOLDOWN_MIN[eveKey] ?? 60;
        const cooldownMs = cooldownMin * 60 * 1000;
        await prisma.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(
            'SELECT pg_advisory_xact_lock($1)',
            eveKey + 1e9
          );
          const existing = await tx.eveRespawnTimer.findUnique({
            where: { eveKey },
          });
          const now = Date.now();
          const canStartNewWindow =
            !existing || now - existing.killedAt.getTime() >= cooldownMs;
          if (!canStartNewWindow) return;
          await tx.eveRespawnTimer.upsert({
            where: { eveKey },
            create: { eveKey },
            update: { killedAt: new Date() },
          });
        });
      }
    }

    // 2) Wejście na mapę (pierwszy który zobaczy herosa po respie): +1 pkt łowcy. Tylko „świeże” wejście (max 2 min) — nie z kolejki zaległych.
    const HUNTER_MAP_ENTER_MAX_AGE_MS = 2 * 60 * 1000;
    if (isHeroMonster && reason === 'map_enter') {
      const now = Date.now();
      const requestAgeMs = now - endedAt.getTime();
      if (requestAgeMs <= HUNTER_MAP_ENTER_MAX_AGE_MS && requestAgeMs >= -10000) {
        const eveKey = HERO_TO_EVE_KEY[monster];
        if (eveKey != null) {
          const cooldownMin = EVE_HUNTER_COOLDOWN_MIN[eveKey] ?? 60;
          const cooldownMs = cooldownMin * 60 * 1000;
          await prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(
              'SELECT pg_advisory_xact_lock($1)',
              eveKey + 1e9
            );
            const existing = await tx.eveRespawnTimer.findUnique({
              where: { eveKey },
            });
            const minRespawnPassed =
              !existing || now - existing.killedAt.getTime() >= cooldownMs;
            if (!minRespawnPassed) return;
            await tx.eveHunterKill.create({
              data: { eveKey, userId: user.id },
            });
          });
        }
      }
    }

    // Calculate user's total time for this monster
    const totalResult = await prisma.mapSession.aggregate({
      where: {
        userId: user.id,
        monsterId: monsterRecord.id,
      },
      _sum: { duration: true },
      _count: true,
    });

    const totalTime = totalResult._sum.duration || 0;
    const totalSessions = totalResult._count;

    if (reason !== 'map_enter' || effectiveDurationSec > 0) {
      console.log(
        `[Timer] ${user.username} (${hero}) → ${monster} on "${mapName}" — ${effectiveDurationSec}s${effectiveDurationSec !== time ? ` (raw ${time}s, freeze odjęty)` : ''} (total: ${totalTime}s, sessions: ${totalSessions})`
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      sessionTime: effectiveDurationSec,
      totalTime,
      totalSessions,
      totalTimeFormatted: formatTime(totalTime),
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

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}h ${m}m ${s}s`;
}
