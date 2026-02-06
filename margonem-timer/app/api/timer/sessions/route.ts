import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate } from '@/lib/auth';

// GET — list user's sessions (web dashboard or TM script)
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const monster = searchParams.get('monster');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);

    const where: any = { userId: auth.user.id };
    if (monster) {
      where.monster = { name: monster };
    }

    const [sessions, total] = await Promise.all([
      prisma.mapSession.findMany({
        where,
        include: {
          monster: { select: { name: true, mapName: true } },
        },
        orderBy: { endedAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.mapSession.count({ where }),
    ]);

    // Aggregate stats per monster
    const stats = await prisma.mapSession.groupBy({
      by: ['monsterId'],
      where: { userId: auth.user.id },
      _sum: { duration: true },
      _count: true,
    });

    // Fetch monster names for stats
    const monsterIds = stats.map((s) => s.monsterId);
    const monsters = await prisma.monster.findMany({
      where: { id: { in: monsterIds } },
    });

    const monsterMap = Object.fromEntries(monsters.map((m) => [m.id, m]));

    const summary = stats.map((s) => ({
      monster: monsterMap[s.monsterId]?.name || 'Unknown',
      map: monsterMap[s.monsterId]?.mapName || 'Unknown',
      totalTime: s._sum.duration || 0,
      totalSessions: s._count,
      totalTimeFormatted: formatTime(s._sum.duration || 0),
    }));

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        monster: s.monster.name,
        map: s.mapName,
        hero: s.heroName,
        world: s.world,
        duration: s.duration,
        durationFormatted: formatTime(s.duration),
        reason: s.reason,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
      })),
      summary,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Sessions GET] Error:', error);
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
