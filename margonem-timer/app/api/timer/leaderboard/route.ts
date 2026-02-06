import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET — public leaderboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monster = searchParams.get('monster') || 'Kic';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    // Find the monster
    const monsterRecord = await prisma.monster.findUnique({
      where: { name: monster },
    });

    if (!monsterRecord) {
      return NextResponse.json({
        leaderboard: [],
        monster,
        message: 'No data for this monster yet',
      });
    }

    // Aggregate total time per user for this monster
    const rawStats = await prisma.mapSession.groupBy({
      by: ['userId'],
      where: { monsterId: monsterRecord.id },
      _sum: { duration: true },
      _count: true,
      orderBy: { _sum: { duration: 'desc' } },
      take: limit,
    });

    // Fetch user info
    const userIds = rawStats.map((s) => s.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true },
    });

    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    // Get most recent hero name per user for this monster
    const recentSessions = await prisma.mapSession.findMany({
      where: {
        userId: { in: userIds },
        monsterId: monsterRecord.id,
      },
      orderBy: { endedAt: 'desc' },
      distinct: ['userId'],
      select: { userId: true, heroName: true, world: true },
    });

    const heroMap = Object.fromEntries(
      recentSessions.map((s) => [s.userId, { hero: s.heroName, world: s.world }])
    );

    const leaderboard = rawStats.map((s, index) => ({
      rank: index + 1,
      username: userMap[s.userId]?.username || 'Unknown',
      hero: heroMap[s.userId]?.hero || 'Unknown',
      world: heroMap[s.userId]?.world || 'Unknown',
      totalTime: s._sum.duration || 0,
      totalTimeFormatted: formatTime(s._sum.duration || 0),
      totalSessions: s._count,
    }));

    // Available monsters for filter
    const availableMonsters = await prisma.monster.findMany({
      select: { name: true, mapName: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      leaderboard,
      monster,
      map: monsterRecord.mapName,
      availableMonsters,
    });
  } catch (error) {
    console.error('[Leaderboard] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function formatTime(totalSeconds: number): string {
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
