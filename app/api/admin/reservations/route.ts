import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromCookie } from '@/lib/auth';

// GET /api/admin/reservations — lista rezerwacji (admin lub koordynator)
export async function GET(request: NextRequest) {
  try {
    const user = await authFromCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'koordynator') return NextResponse.json({ error: 'Forbidden - admin or koordynator only' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const titanSlug = searchParams.get('titanSlug');
    const itemKey = searchParams.get('itemKey');

    const where: { titanSlug?: string; itemKey?: string } = {};
    if (titanSlug) where.titanSlug = titanSlug;
    if (itemKey) where.itemKey = itemKey;

    const list = await prisma.reservation.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { nick: 'asc' }],
    });
    return NextResponse.json({ reservations: list });
  } catch (e) {
    console.error('GET /api/admin/reservations', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/admin/reservations — dodaj rezerwację (admin lub koordynator)
export async function POST(request: NextRequest) {
  try {
    const user = await authFromCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'koordynator') return NextResponse.json({ error: 'Forbidden - admin or koordynator only' }, { status: 403 });

    const body = await request.json();
    const { titanSlug, itemKey, nick, priority } = body;
    if (!titanSlug || !itemKey || !nick || priority == null) {
      return NextResponse.json(
        { error: 'titanSlug, itemKey, nick and priority are required' },
        { status: 400 }
      );
    }
    const p = Number(priority);
    if (p < 1 || p > 3) {
      return NextResponse.json({ error: 'priority must be 1, 2 or 3' }, { status: 400 });
    }

    const created = await prisma.reservation.create({
      data: {
        titanSlug: String(titanSlug).trim(),
        itemKey: String(itemKey).trim(),
        nick: String(nick).trim(),
        priority: p,
      },
    });
    return NextResponse.json(created);
  } catch (e: unknown) {
    const msg = e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2002'
      ? 'Ta rezerwacja (nick w tym itemie) już istnieje.'
      : 'Server error';
    console.error('POST /api/admin/reservations', e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
