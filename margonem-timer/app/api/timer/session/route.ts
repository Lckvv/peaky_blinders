import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromApiKey } from '@/lib/auth';

// POST — record a map session (called by Tampermonkey script)
export async function POST(request: NextRequest) {
  try {
    // Auth via API key
    const user = await authFromApiKey(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or missing API key. Set X-API-Key header.' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    const { time, monster, map, hero, world, reason, timestamp } = body;

    if (!time || typeof time !== 'number' || time < 1) {
      return NextResponse.json(
        { error: 'Invalid "time" — must be a positive number (seconds)' },
        { status: 400 }
      );
    }

    if (!monster || !map) {
      return NextResponse.json(
        { error: 'Missing "monster" or "map" field' },
        { status: 400 }
      );
    }

    if (!hero) {
      return NextResponse.json(
        { error: 'Missing "hero" field (character name)' },
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

    // Find or create monster
    let monsterRecord = await prisma.monster.findUnique({
      where: { name: monster },
    });

    if (!monsterRecord) {
      monsterRecord = await prisma.monster.create({
        data: {
          name: monster,
          mapName: map,
        },
      });
    }

    // Calculate session start time
    const endedAt = timestamp ? new Date(timestamp) : new Date();
    const startedAt = new Date(endedAt.getTime() - time * 1000);

    // Save session
    const session = await prisma.mapSession.create({
      data: {
        userId: user.id,
        monsterId: monsterRecord.id,
        heroName: hero,
        world: world || 'Unknown',
        mapName: map,
        duration: time,
        reason: reason || 'unknown',
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
      `[Timer] ${user.username} (${hero}) → ${monster} on "${map}" — ${time}s (total: ${totalTime}s, sessions: ${totalSessions})`
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
    console.error('[Timer Session] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
