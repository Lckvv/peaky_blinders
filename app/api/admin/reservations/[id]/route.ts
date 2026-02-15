import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromCookie } from '@/lib/auth';

async function requireAdmin() {
  const user = await authFromCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden - admin only' }, { status: 403 });
  return null;
}

// PATCH /api/admin/reservations/[id] — edytuj rezerwację (tylko admin)
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth) return auth;
  const { id } = await params;
  try {
    const body = await _request.json();
    const { nick, priority } = body;
    const update: { nick?: string; priority?: number } = {};
    if (typeof nick === 'string' && nick.trim()) update.nick = nick.trim();
    if (priority != null) {
      const p = Number(priority);
      if (p < 1 || p > 3) return NextResponse.json({ error: 'priority must be 1, 2 or 3' }, { status: 400 });
      update.priority = p;
    }
    const updated = await prisma.reservation.update({
      where: { id },
      data: update,
    });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Rezerwacja nie istnieje' }, { status: 404 });
    }
    if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Ta rezerwacja (nick w tym itemie) już istnieje.' }, { status: 400 });
    }
    console.error('PATCH /api/admin/reservations/[id]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/admin/reservations/[id] — usuń rezerwację (tylko admin)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth) return auth;
  const { id } = await params;
  try {
    await prisma.reservation.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Rezerwacja nie istnieje' }, { status: 404 });
    }
    console.error('DELETE /api/admin/reservations/[id]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
