import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromCookie } from '@/lib/auth';

const CODE_LENGTH = 14;
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bez 0,O,1,I żeby nie mylić

function generateInvitationCode(): string {
  let code = '';
  const bytes = new Uint8Array(CODE_LENGTH);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < CODE_LENGTH; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CHARS[bytes[i] % CHARS.length];
  }
  return code;
}

// GET /api/admin/invitation-codes — lista kodów (tylko admin)
export async function GET() {
  try {
    const user = await authFromCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden - admin only' }, { status: 403 });

    const list = await prisma.invitationCode.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json({ codes: list });
  } catch (e) {
    console.error('GET /api/admin/invitation-codes', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/admin/invitation-codes — wygeneruj nowy kod (tylko admin)
export async function POST() {
  try {
    const user = await authFromCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden - admin only' }, { status: 403 });

    let code: string;
    let attempts = 0;
    do {
      code = generateInvitationCode();
      const existing = await prisma.invitationCode.findUnique({ where: { code } });
      if (!existing) break;
      attempts++;
      if (attempts > 5) {
        return NextResponse.json({ error: 'Nie udało się wygenerować unikalnego kodu' }, { status: 500 });
      }
    } while (true);

    const created = await prisma.invitationCode.create({
      data: { code },
    });
    return NextResponse.json(created);
  } catch (e) {
    console.error('POST /api/admin/invitation-codes', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
