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

    const { time, monster: bodyMonster, map: mapName, hero, world, reason, timestamp } = body;

    if (!time || typeof time !== 'number' || time < 1) {
      return NextResponse.json(
        { error: 'Invalid "time" — must be a positive number (seconds)' },
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

    // Przypisz do aktywnej fazy, jeśli jest uruchomiona
    const activePhase = await prisma.phase.findFirst({
      where: { monsterId: monsterRecord.id, isActive: true },
    });

    // Calculate session start time
    const endedAt = timestamp ? new Date(timestamp) : new Date();
    const startedAt = new Date(endedAt.getTime() - time * 1000);

    // Save session (world/reason ze skryptu mogą być number — baza wymaga string)
    const session = await prisma.mapSession.create({
      data: {
        userId: user.id,
        monsterId: monsterRecord.id,
        phaseId: activePhase?.id ?? null,
        heroName: String(hero ?? 'Unknown'),
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
