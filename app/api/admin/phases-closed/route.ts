import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromCookie } from '@/lib/auth';

// GET /api/admin/phases-closed — lista zamkniętych faz (admin lub koordynator)
export async function GET() {
  try {
    const user = await authFromCookie();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin' && user.role !== 'koordynator') {
      return NextResponse.json({ error: 'Forbidden - admin or koordynator only' }, { status: 403 });
    }

    const phases = await prisma.phase.findMany({
      where: { isActive: false, endedAt: { not: null } },
      include: {
        monster: { select: { name: true } },
      },
      orderBy: { endedAt: 'desc' },
    });

    const list = phases.map((p) => ({
      id: p.id,
      phaseName: p.name,
      monsterName: p.monster.name,
      startedAt: p.startedAt.toISOString(),
      endedAt: p.endedAt ? p.endedAt.toISOString() : null,
    }));

    return NextResponse.json({ phases: list });
  } catch (error) {
    console.error('[Phases Closed] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
