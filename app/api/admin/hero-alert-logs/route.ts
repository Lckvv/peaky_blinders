import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromCookie } from '@/lib/auth';

/**
 * GET /api/admin/hero-alert-logs — lista logów „Powiadom klan na Discordzie” (tylko admin).
 * Query: ?limit=50&offset=0
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authFromCookie();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '100', 10), 500);
    const offset = Math.max(0, parseInt(request.nextUrl.searchParams.get('offset') || '0', 10));

    const [logs, total] = await Promise.all([
      prisma.heroAlertLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: { select: { id: true, username: true } },
        },
      }),
      prisma.heroAlertLog.count(),
    ]);

    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l.id,
        createdAt: l.createdAt.toISOString(),
        username: l.user.username,
        senderNick: l.senderNick,
        heroNick: l.heroNick,
        mapName: l.mapName,
        lvl: l.lvl,
        x: l.x,
        y: l.y,
      })),
      total,
      limit,
      offset,
    });
  } catch (e) {
    console.error('[GET /api/admin/hero-alert-logs]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
