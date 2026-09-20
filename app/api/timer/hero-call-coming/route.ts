import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromApiKey } from '@/lib/auth';

const NOTIFICATION_MAX_AGE_MS = 10 * 60 * 1000;

/**
 * POST /api/timer/hero-call-coming — zgłoś, że przyjdziesz pomóc na wołanie.
 * X-API-Key; body: { notificationId, nick }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authFromApiKey(request);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const notificationId = typeof body?.notificationId === 'string' ? body.notificationId.trim() : '';
    const nick = typeof body?.nick === 'string' ? body.nick.trim().slice(0, 80) : '';

    if (!notificationId) {
      return NextResponse.json({ error: 'notificationId is required' }, { status: 400 });
    }

    const call = await prisma.heroLevelNotification.findUnique({
      where: { id: notificationId },
    });
    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }
    if (Date.now() - call.createdAt.getTime() > NOTIFICATION_MAX_AGE_MS) {
      return NextResponse.json({ error: 'Call expired' }, { status: 410 });
    }

    const helper = await prisma.heroCallHelper.upsert({
      where: {
        notificationId_userId: { notificationId, userId: user.id },
      },
      update: { nick: nick || '?' },
      create: {
        notificationId,
        userId: user.id,
        nick: nick || '?',
      },
    });

    const helpers = await prisma.heroCallHelper.findMany({
      where: { notificationId },
      orderBy: { createdAt: 'asc' },
      select: { nick: true },
    });

    return NextResponse.json({
      ok: true,
      helperNick: helper.nick,
      helpers: helpers.map((h) => h.nick),
    });
  } catch (e) {
    console.error('[POST /api/timer/hero-call-coming]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
