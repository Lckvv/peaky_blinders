import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromCookie } from '@/lib/auth';

const BATCH_SIZE = 2000;

// POST /api/admin/prune-old-sessions?olderThanDays=90 — usuwa MapSession starsze niż N dni (w partiach).
// PhaseResult i Phase nie są ruszane. Tylko admin.
export async function POST(request: NextRequest) {
  try {
    const user = await authFromCookie();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - admin only' }, { status: 403 });
    }

    const days = Math.min(
      Math.max(1, parseInt(request.nextUrl.searchParams.get('olderThanDays') || '90', 10)),
      3650
    );
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    let totalDeleted = 0;

    while (true) {
      const batch = await prisma.mapSession.findMany({
        where: { endedAt: { lt: cutoff } },
        select: { id: true },
        take: BATCH_SIZE,
      });

      if (batch.length === 0) break;

      await prisma.mapSession.deleteMany({
        where: { id: { in: batch.map((r) => r.id) } },
      });
      totalDeleted += batch.length;
    }

    return NextResponse.json({
      ok: true,
      deleted: totalDeleted,
      olderThanDays: days,
      cutoff: cutoff.toISOString(),
    });
  } catch (error) {
    console.error('[Admin prune-old-sessions]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
