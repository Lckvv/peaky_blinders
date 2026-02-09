import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromCookie } from '@/lib/auth';

// POST /api/admin/end-phase — zakończ fazę dla potwora (tylko admin)
export async function POST(request: NextRequest) {
  try {
    const user = await authFromCookie();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - admin only' }, { status: 403 });
    }

    const { monsterName } = await request.json();
    if (!monsterName) {
      return NextResponse.json({ error: 'monsterName is required' }, { status: 400 });
    }

    const monster = await prisma.monster.findUnique({
      where: { name: monsterName },
    });
    if (!monster) {
      return NextResponse.json({ error: 'Monster not found' }, { status: 404 });
    }

    // 1) Sprawdź czy jest aktywna faza (uruchomiona przez start-phase)
    const activePhase = await prisma.phase.findFirst({
      where: { monsterId: monster.id, isActive: true },
    });

    if (activePhase) {
      // Zamknij aktywną fazę: ustaw endedAt, endedBy, zbierz PhaseResults z sesji
      const sessions = await prisma.mapSession.findMany({
        where: { phaseId: activePhase.id },
        include: { user: true },
      });

      const userStats = new Map<string, { totalTime: number; totalSessions: number }>();
      for (const session of sessions) {
        const existing = userStats.get(session.userId) || { totalTime: 0, totalSessions: 0 };
        existing.totalTime += session.duration;
        existing.totalSessions += 1;
        userStats.set(session.userId, existing);
      }

      const phaseResults = Array.from(userStats.entries()).map(([userId, stats]) => ({
        phaseId: activePhase.id,
        userId,
        totalTime: stats.totalTime,
        totalSessions: stats.totalSessions,
      }));

      if (phaseResults.length > 0) {
        await prisma.phaseResult.createMany({
          data: phaseResults,
        });
      }

      await prisma.phase.update({
        where: { id: activePhase.id },
        data: {
          isActive: false,
          endedAt: new Date(),
          endedBy: user.id,
        },
      });

      return NextResponse.json({
        success: true,
        phase: {
          id: activePhase.id,
          name: activePhase.name,
          phaseNumber: activePhase.phaseNumber,
          endedAt: new Date(),
        },
        stats: {
          totalUsers: phaseResults.length,
          totalSessions: sessions.length,
        },
      });
    }

    // 2) Legacy: brak aktywnej fazy — zakończ okres sesji z phaseId=null
    const lastPhase = await prisma.phase.findFirst({
      where: { monsterId: monster.id },
      orderBy: { phaseNumber: 'desc' },
    });
    const nextPhaseNumber = (lastPhase?.phaseNumber ?? 0) + 1;
    const phaseName = nextPhaseNumber === 1 ? monster.name : `${monster.name}${nextPhaseNumber}`;

    const activeSessions = await prisma.mapSession.findMany({
      where: { monsterId: monster.id, phaseId: null },
      include: { user: true },
    });

    const phase = await prisma.phase.create({
      data: {
        monsterId: monster.id,
        phaseNumber: nextPhaseNumber,
        name: phaseName,
        isActive: false,
        endedAt: new Date(),
        endedBy: user.id,
      },
    });

    const userStats = new Map<string, { totalTime: number; totalSessions: number }>();
    for (const session of activeSessions) {
      const existing = userStats.get(session.userId) || { totalTime: 0, totalSessions: 0 };
      existing.totalTime += session.duration;
      existing.totalSessions += 1;
      userStats.set(session.userId, existing);
    }

    const phaseResults = Array.from(userStats.entries()).map(([userId, stats]) => ({
      phaseId: phase.id,
      userId,
      totalTime: stats.totalTime,
      totalSessions: stats.totalSessions,
    }));

    if (phaseResults.length > 0) {
      await prisma.phaseResult.createMany({
        data: phaseResults,
      });
    }

    await prisma.mapSession.updateMany({
      where: { monsterId: monster.id, phaseId: null },
      data: { phaseId: phase.id },
    });

    return NextResponse.json({
      success: true,
      phase: {
        id: phase.id,
        name: phase.name,
        phaseNumber: phase.phaseNumber,
        endedAt: phase.endedAt,
      },
      stats: {
        totalUsers: phaseResults.length,
        totalSessions: activeSessions.length,
      },
    });
  } catch (error) {
    console.error('[End Phase] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
