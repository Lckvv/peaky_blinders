import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromCookie } from '@/lib/auth';

/**
 * POST /api/admin/chat-logs/delete-batch — usuń wybrane logi po id (tylko super_admin).
 * Body: { ids: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authFromCookie();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const raw = body?.ids;
    const ids = Array.isArray(raw)
      ? raw.filter((id): id is string => typeof id === 'string' && id.length > 0)
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ ok: true, deleted: 0 });
    }

    const result = await prisma.chatLog.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({ ok: true, deleted: result.count });
  } catch (e) {
    console.error('[POST /api/admin/chat-logs/delete-batch]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
