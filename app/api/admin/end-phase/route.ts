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

    // Sprawdź czy użytkownik jest adminem
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - admin only' }, { status: 403 });
    }

    const { monsterName } = await request.json();

    if (!monsterName) {
      return NextResponse.json({ error: 'monsterName is required' }, { status: 400 });
    }

    // Znajdź potwora
    const monster = await prisma.monster.findUnique({
      where: { name: monsterName },
    });

    if (!monster) {
      return NextResponse.json({ error: 'Monster not found' }, { status: 404 });
    }

    // Znajdź najwyższy numer fazy dla tego potwora
    const lastPhase = await prisma.phase.findFirst({
      where: { monsterId: monster.id },
      orderBy: { phaseNumber: 'desc' },
    });

    const nextPhaseNumber = (lastPhase?.phaseNumber || -1) + 1;
    const phaseName = nextPhaseNumber === 0 ? monster.name : `${monster.name}${nextPhaseNumber}`;

    // Znajdź wszystkie sesje bez fazy (aktywny okres) dla tego potwora
    const activeSessions = await prisma.mapSession.findMany({
      where: {
        monsterId: monster.id,
        phaseId: null, // tylko sesje bez przypisanej fazy
      },
      include: {
        user: true,
      },
    });

    // Utwórz nową fazę
    const phase = await prisma.phase.create({
      data: {
        monsterId: monster.id,
        phaseNumber: nextPhaseNumber,
        name: phaseName,
        endedBy: user.id,
      },
    });

    // Zgrupuj sesje po użytkowniku i oblicz sumy
    const userStats = new Map<string, { totalTime: number; totalSessions: number }>();

    for (const session of activeSessions) {
      const existing = userStats.get(session.userId) || { totalTime: 0, totalSessions: 0 };
      existing.totalTime += session.duration;
      existing.totalSessions += 1;
      userStats.set(session.userId, existing);
    }

    // Zaktualizuj sesje - przypisz je do nowej fazy
    await prisma.mapSession.updateMany({
      where: {
        monsterId: monster.id,
        phaseId: null,
      },
      data: {
        phaseId: phase.id,
      },
    });

    // Utwórz wyniki fazy dla każdego użytkownika
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

