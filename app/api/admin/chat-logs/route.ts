import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromCookie } from '@/lib/auth';

/**
 * GET /api/admin/chat-logs — lista logów czatu (tylko super_admin).
 * Query: ?limit=100&offset=0&q=tekst (szuka w koncie, autorze, odbiorcy, treści)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authFromCookie();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '200', 10), 500);
    const offset = Math.max(0, parseInt(request.nextUrl.searchParams.get('offset') || '0', 10));
    const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';

    const where = q
      ? {
          OR: [
            { author: { contains: q, mode: 'insensitive' as const } },
            { receiver: { contains: q, mode: 'insensitive' as const } },
            { text: { contains: q, mode: 'insensitive' as const } },
            { user: { username: { contains: q, mode: 'insensitive' as const } } },
          ],
        }
      : undefined;

    const [logs, total] = await Promise.all([
      prisma.chatLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: { select: { id: true, username: true } },
        },
      }),
      prisma.chatLog.count({ where }),
    ]);

    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l.id,
        createdAt: l.createdAt.toISOString(),
        username: l.user.username,
        author: l.author,
        receiver: l.receiver,
        text: l.text,
        messageTime: l.messageTime,
      })),
      total,
      limit,
      offset,
    });
  } catch (e) {
    console.error('[GET /api/admin/chat-logs]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/chat-logs — usuń wszystkie logi czatu (tylko super_admin).
 */
export async function DELETE() {
  try {
    const user = await authFromCookie();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.chatLog.deleteMany({});
    return NextResponse.json({ ok: true, deleted: true });
  } catch (e) {
    console.error('[DELETE /api/admin/chat-logs]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
