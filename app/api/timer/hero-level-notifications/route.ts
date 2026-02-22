import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromApiKey } from '@/lib/auth';

const NOTIFICATION_MAX_AGE_MS = 10 * 60 * 1000; // 10 min
const ALLOWED_LEVELS = [64, 83, 114, 144, 217, 300];

// GET /api/timer/hero-level-notifications?since=timestamp — lista powiadomień globalna (wszystkie wysłane przez użytkowników); skrypt pokazuje popup każdemu
export async function GET(request: NextRequest) {
  try {
    const sinceStr = request.nextUrl.searchParams.get('since');
    const since = sinceStr ? parseInt(sinceStr, 10) : Date.now() - NOTIFICATION_MAX_AGE_MS;
    if (!Number.isInteger(since) || since < 0) {
      return NextResponse.json({ error: 'since must be a positive timestamp' }, { status: 400 });
    }

    const cutoff = new Date(Date.now() - NOTIFICATION_MAX_AGE_MS);
    await prisma.heroLevelNotification.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    const list = await prisma.heroLevelNotification.findMany({
      where: { createdAt: { gt: new Date(since) } },
      orderBy: { createdAt: 'asc' },
    });

    const notifications = list.map((n) => ({
      id: n.id,
      level: n.level,
      nick: n.nick,
      mapName: n.mapName,
      x: n.x,
      y: n.y,
      lvl: n.lvl,
      heroImageUrl: n.heroImageUrl ?? undefined,
      createdAt: n.createdAt.getTime(),
    }));

    return NextResponse.json(
      { notifications },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (e) {
    console.error('[GET /api/timer/hero-level-notifications]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/timer/hero-level-notifications — wyślij powiadomienie (X-API-Key, body: level, nick, mapName, x?, y?, lvl?, heroImageUrl?)
export async function POST(request: NextRequest) {
  try {
    const user = await authFromApiKey(request);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
    }

    const body = await request.json();
    const level = body?.level != null ? parseInt(String(body.level), 10) : NaN;
    const nick = typeof body?.nick === 'string' ? body.nick.trim() : '';
    const mapName = typeof body?.mapName === 'string' ? body.mapName.trim() : '';
    const x = body?.x != null ? parseInt(String(body.x), 10) : undefined;
    const y = body?.y != null ? parseInt(String(body.y), 10) : undefined;
    const lvl = body?.lvl != null ? parseInt(String(body.lvl), 10) : undefined;
    const heroImageUrl = typeof body?.heroImageUrl === 'string' ? body.heroImageUrl.trim() || null : null;

    if (!Number.isInteger(level) || !ALLOWED_LEVELS.includes(level)) {
      return NextResponse.json(
        { error: 'level must be one of: 64, 83, 114, 144, 217, 300' },
        { status: 400 }
      );
    }
    if (!nick || !mapName) {
      return NextResponse.json({ error: 'nick and mapName are required' }, { status: 400 });
    }

    await prisma.heroLevelNotification.create({
      data: {
        level,
        nick,
        mapName,
        x: x ?? null,
        y: y ?? null,
        lvl: lvl ?? null,
        heroImageUrl,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[POST /api/timer/hero-level-notifications]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
