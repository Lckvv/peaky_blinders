import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromCookie } from '@/lib/auth';

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// GET /api/timer/my-stats — czasy użytkownika per tytan: aktywna faza, łącznie, zamknięte fazy
export async function GET() {
  try {
    const user = await authFromCookie();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const monsters = await prisma.monster.findMany({
      orderBy: { name: 'asc' },
      include: {
        phases: {
          orderBy: { phaseNumber: 'asc' },
          include: {
            phaseResults: {
              where: { userId: user.id },
              take: 1,
            },
          },
        },
      },
    });

    const byTitan: Array<{
      monsterName: string;
      activePhaseTime: number;
      activePhaseTimeFormatted: string;
      totalTime: number;
      totalTimeFormatted: string;
      totalSessions: number;
      phases: Array<{ phaseName: string; totalTime: number; totalTimeFormatted: string }>;
    }> = [];

    for (const monster of monsters) {
      const [totalAgg, activePhase] = await Promise.all([
        prisma.mapSession.aggregate({
          where: { userId: user.id, monsterId: monster.id },
          _sum: { duration: true },
          _count: true,
        }),
        prisma.phase.findFirst({
          where: { monsterId: monster.id, isActive: true },
        }),
      ]);

      const totalTime = totalAgg._sum.duration || 0;
      const totalSessions = totalAgg._count || 0;

      let activePhaseTime = 0;
      if (activePhase) {
        const activeAgg = await prisma.mapSession.aggregate({
          where: {
            userId: user.id,
            monsterId: monster.id,
            phaseId: activePhase.id,
          },
          _sum: { duration: true },
        });
        activePhaseTime = activeAgg._sum.duration || 0;
      }

      const phases: Array<{ phaseName: string; totalTime: number; totalTimeFormatted: string }> = [];

      for (const phase of monster.phases) {
        if (phase.isActive) {
          if (activePhase && phase.id === activePhase.id && activePhaseTime > 0) {
            phases.push({
              phaseName: phase.name + ' (aktywna)',
              totalTime: activePhaseTime,
              totalTimeFormatted: formatTime(activePhaseTime),
            });
          }
        } else {
          const res = phase.phaseResults[0];
          if (res) {
            phases.push({
              phaseName: phase.name,
              totalTime: res.totalTime,
              totalTimeFormatted: formatTime(res.totalTime),
            });
          }
        }
      }

      byTitan.push({
        monsterName: monster.name,
        activePhaseTime,
        activePhaseTimeFormatted: formatTime(activePhaseTime),
        totalTime,
        totalTimeFormatted: formatTime(totalTime),
        totalSessions,
        phases,
      });
    }

    return NextResponse.json({
      byTitan,
    });
  } catch (error) {
    console.error('[My Stats] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
