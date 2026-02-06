import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/leaderboard/phases — rankingi z fazami
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monsterName = searchParams.get('monster');

    // Pobierz wszystkich potworów lub konkretnego
    const where = monsterName ? { name: monsterName } : {};
    const monsters = await prisma.monster.findMany({
      where,
      include: {
        phases: {
          orderBy: { phaseNumber: 'asc' },
          include: {
            phaseResults: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    nick: true,
                  },
                },
              },
              orderBy: { totalTime: 'desc' },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Formatuj dane
    const result = await Promise.all(monsters.map(async (monster) => {
      // Faza 0 (aktywna) - sesje bez fazy
      const activeStats = await prisma.mapSession.groupBy({
        by: ['userId'],
        where: {
          monsterId: monster.id,
          phaseId: null,
        },
        _sum: { duration: true },
        _count: true,
      });

      // Pobierz informacje o użytkownikach dla aktywnej fazy
      const activeUserIds = activeStats.map(s => s.userId);
      const activeUsers = activeUserIds.length > 0 ? await prisma.user.findMany({
        where: { id: { in: activeUserIds } },
        select: { id: true, username: true, nick: true },
      }) : [];

      const activeUserMap = Object.fromEntries(activeUsers.map(u => [u.id, u]));

      // Sortuj aktywną fazę
      const activeLeaderboard = activeStats
        .map((stat) => ({
          userId: stat.userId,
          totalTime: stat._sum.duration || 0,
          totalSessions: stat._count,
          user: activeUserMap[stat.userId] || { id: stat.userId, username: 'Unknown', nick: null },
        }))
        .sort((a, b) => b.totalTime - a.totalTime)
        .map((item, index) => ({
          rank: index + 1,
          userId: item.userId,
          username: item.user.username,
          nick: item.user.nick,
          totalTime: item.totalTime,
          totalTimeFormatted: formatTime(item.totalTime),
          totalSessions: item.totalSessions,
        }));

      const phases = monster.phases.map((phase) => ({
        id: phase.id,
        name: phase.name,
        phaseNumber: phase.phaseNumber,
        endedAt: phase.endedAt,
        leaderboard: phase.phaseResults.map((result, index) => ({
          rank: index + 1,
          userId: result.userId,
          username: result.user.username,
          nick: result.user.nick,
          totalTime: result.totalTime,
          totalTimeFormatted: formatTime(result.totalTime),
          totalSessions: result.totalSessions,
        })),
      }));

      return {
        monster: {
          id: monster.id,
          name: monster.name,
          mapName: monster.mapName,
        },
        activePhase: activeLeaderboard.length > 0 ? {
          name: monster.name,
          phaseNumber: 0,
          leaderboard: activeLeaderboard,
        } : null,
        phases,
      };
    }));

    // Jeśli tylko jeden potwór, zwróć go bezpośrednio
    if (monsterName && result.length === 1) {
      return NextResponse.json(result[0]);
    }

    return NextResponse.json({ monsters: result });
  } catch (error) {
    console.error('[Leaderboard Phases] Error:', error);
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
  const s = totalSeconds % 60;

  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

