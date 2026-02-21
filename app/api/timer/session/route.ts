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

    // Herosy eventowe 63, 143, 300 — nie zapisujemy sesji (usunięte ze zliczania)
    const HERO_MONSTERS_NO_COUNT = ['Seeker of Creation', 'Harbinger of Elancia', 'Thunder-Wielding Barbarian'];
    if (HERO_MONSTERS_NO_COUNT.includes(monster)) {
      return NextResponse.json({
        success: true,
        sessionId: null,
        sessionTime: time,
        totalTime: 0,
        totalSessions: 0,
        totalTimeFormatted: '0h 0m 0s',
        skipped: true,
      });
    }

    const activePhase = await prisma.phase.findFirst({
      where: { monsterId: (await prisma.monster.findUnique({ where: { name: monster } }))?.id ?? '', isActive: true },
    });
    if (!activePhase) {
      return NextResponse.json(
        { error: 'No active phase for this monster. Session ignored.' },
        { status: 409 }
      );
    }
    const phaseId = activePhase.id;

    // Calculate session start time
    const endedAt = timestamp ? new Date(timestamp) : new Date();
    const startedAt = new Date(endedAt.getTime() - time * 1000);

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
        sessionTime: time,
        totalTime,
        totalSessions,
        totalTimeFormatted: formatTime(totalTime),
        duplicate: true,
      });
    }

    // Save session (world/reason ze skryptu mogą być number — baza wymaga string)
    // heroOutfitUrl = outfit tej konkretnej postaci z tej sesji (Nick ma wiele postaci, każda swój strój)
    const session = await prisma.mapSession.create({
      data: {
        userId: user.id,
        monsterId: monsterRecord.id,
        phaseId: phaseId,
        heroName: String(hero ?? 'Unknown'),
        heroOutfitUrl: outfitUrlValue || null,
        world: String(world ?? 'Unknown'),
        mapName: mapName,
        duration: time,
        reason: String(reason ?? 'unknown'),
        startedAt,
        endedAt,
      },
    });

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

    console.log(
      `[Timer] ${user.username} (${hero}) → ${monster} on "${mapName}" — ${time}s (total: ${totalTime}s, sessions: ${totalSessions})`
    );

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      sessionTime: time,
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
