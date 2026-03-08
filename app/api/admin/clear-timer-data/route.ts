import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromCookie } from '@/lib/auth';

// POST /api/admin/clear-timer-data — czyści MapSession i PhaseResult (tylko admin).
// Opcje: ?phases=1 — usuwa też Phase; ?sessionsOnly=1 — usuwa tylko MapSession (zostawia PhaseResult i Phase).
export async function POST(request: NextRequest) {
  try {
    const user = await authFromCookie();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - admin only' }, { status: 403 });
    }

    const alsoPhases = request.nextUrl.searchParams.get('phases') === '1';
    const sessionsOnly = request.nextUrl.searchParams.get('sessionsOnly') === '1';

    let deletedResults = 0;
    const deletedSessions = await prisma.mapSession.deleteMany({});

    if (!sessionsOnly) {
      const r = await prisma.phaseResult.deleteMany({});
      deletedResults = r.count;
    }

    let deletedPhases = 0;
    if (alsoPhases) {
      const r = await prisma.phase.deleteMany({});
      deletedPhases = r.count;
    }

    return NextResponse.json({
      ok: true,
      deleted: {
        phaseResults: deletedResults,
        mapSessions: deletedSessions.count,
        phases: deletedPhases,
      },
    });
  } catch (error) {
    console.error('[Admin clear-timer-data]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
