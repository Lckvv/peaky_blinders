import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromApiKey } from '@/lib/auth';
import { RESERVATION_ITEMS_BY_TITAN } from '@/lib/reservations';

// GET /api/timer/reservations?monster=Kic — lista rezerwacji dla danego potwora (dla skryptu TM, X-API-Key)
export async function GET(request: NextRequest) {
  try {
    const user = await authFromApiKey(request);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
    }

    const monsterName = request.nextUrl.searchParams.get('monster');
    if (!monsterName || typeof monsterName !== 'string') {
      return NextResponse.json({ error: 'monster is required' }, { status: 400 });
    }

    const titanSlug = monsterName.trim().toLowerCase();
    const items = RESERVATION_ITEMS_BY_TITAN[titanSlug];
    if (!items || items.length === 0) {
      return NextResponse.json({ reservations: [] });
    }

    const itemByKey = Object.fromEntries(items.map((it) => [it.key, it]));

    const rows = await prisma.reservation.findMany({
      where: { titanSlug },
      orderBy: [{ priority: 'asc' }, { nick: 'asc' }],
    });

    const reservations = rows.map((r) => {
      const item = itemByKey[r.itemKey];
      return {
        nick: r.nick,
        itemKey: r.itemKey,
        priority: r.priority,
        gifFile: item?.gifFile ?? `${r.itemKey}.gif`,
        pngFile: item?.pngFile ?? `${r.itemKey}.png`,
      };
    });

    return NextResponse.json({ reservations });
  } catch (e) {
    console.error('[GET /api/timer/reservations]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
