import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromCookie } from '@/lib/auth';

// POST /api/admin/start-phase — uruchom fazę dla potwora (tylko admin)
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

    const activePhase = await prisma.phase.findFirst({
      where: { monsterId: monster.id, isActive: true },
    });
    if (activePhase) {
      return NextResponse.json(
        { error: `Faza dla ${monsterName} jest już uruchomiona` },
        { status: 400 }
      );
    }

    const lastPhase = await prisma.phase.findFirst({
      where: { monsterId: monster.id },
      orderBy: { phaseNumber: 'desc' },
    });
    const nextPhaseNumber = (lastPhase?.phaseNumber ?? 0) + 1;
    const phaseName = nextPhaseNumber === 1 ? monster.name : `${monster.name}${nextPhaseNumber}`;

    const phase = await prisma.phase.create({
      data: {
        monsterId: monster.id,
        phaseNumber: nextPhaseNumber,
        name: phaseName,
        isActive: true,
        startedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      phase: {
        id: phase.id,
        name: phase.name,
        phaseNumber: phase.phaseNumber,
        startedAt: phase.startedAt,
      },
    });
  } catch (error) {
    console.error('[Start Phase] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
