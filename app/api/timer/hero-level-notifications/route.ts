import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromApiKey } from '@/lib/auth';
import { HERO_CALL_LEVELS } from '@/lib/discord';
import { HERO_CALL_RETENTION_MS } from '@/lib/hero-calls';

const NOTIFICATION_MAX_AGE_MS = 10 * 60 * 1000; // 10 min

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
    },
  });
}

function mapNotification(n: {
  id: string;
  level: number;
  nick: string;
  mapName: string;
  x: number | null;
  y: number | null;
  lvl: number | null;
  heroImageUrl: string | null;
  callerNick: string;
  kind: string;
  withSummon: boolean;
  createdAt: Date;
  killedAt: Date | null;
  helpers: { nick: string }[];
}) {
  return {
    id: n.id,
    level: n.level,
    nick: n.nick,
    mapName: n.mapName,
    x: n.x,
    y: n.y,
    lvl: n.lvl,
    heroImageUrl: n.heroImageUrl ?? undefined,
    callerNick: n.callerNick || undefined,
    kind: n.kind === 'titan' ? 'titan' : 'hero',
    withSummon: !!n.withSummon,
    helpers: n.helpers.map((h) => h.nick),
    createdAt: n.createdAt.getTime(),
    killedAt: n.killedAt ? n.killedAt.getTime() : null,
  };
}

const includeHelpers = {
  helpers: { select: { nick: true }, orderBy: { createdAt: 'asc' as const } },
};

// GET /api/timer/hero-level-notifications?since=timestamp — tylko zalogowany skrypt (X-API-Key)
export async function GET(request: NextRequest) {
  try {
    const user = await authFromApiKey(request);
    if (!user) {
      return noStoreJson({ error: 'Invalid or missing API key' }, 401);
    }
    const sinceStr = request.nextUrl.searchParams.get('since');
    const since = sinceStr ? parseInt(sinceStr, 10) : Date.now() - NOTIFICATION_MAX_AGE_MS;
    if (!Number.isInteger(since) || since < 0) {
      return noStoreJson({ error: 'since must be a positive timestamp' }, 400);
    }

    const cutoff = new Date(Date.now() - HERO_CALL_RETENTION_MS);
    await prisma.heroLevelNotification.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    const list = await prisma.heroLevelNotification.findMany({
      where: { createdAt: { gte: new Date(since) } },
      orderBy: { createdAt: 'asc' },
      include: includeHelpers,
    });

    return noStoreJson({ notifications: list.map(mapNotification) });
  } catch (e) {
    console.error('[GET /api/timer/hero-level-notifications]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/timer/hero-level-notifications — wyślij powiadomienie (X-API-Key)
export async function POST(request: NextRequest) {
  try {
    const user = await authFromApiKey(request);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
    }

    const body = await request.json();
    const kind = body?.kind === 'titan' ? 'titan' : 'hero';
    const level = body?.level != null ? parseInt(String(body.level), 10) : kind === 'titan' ? 0 : NaN;
    const nick = typeof body?.nick === 'string' ? body.nick.trim() : '';
    const mapName = typeof body?.mapName === 'string' ? body.mapName.trim() : '';
    const x = body?.x != null ? parseInt(String(body.x), 10) : undefined;
    const y = body?.y != null ? parseInt(String(body.y), 10) : undefined;
    const lvl = body?.lvl != null ? parseInt(String(body.lvl), 10) : undefined;
    const heroImageUrl = typeof body?.heroImageUrl === 'string' ? body.heroImageUrl.trim() || null : null;
    const callerNick = typeof body?.callerNick === 'string' ? body.callerNick.trim().slice(0, 80) : '';
    const withSummon = !!body?.withSummon && kind === 'hero';

    if (kind === 'hero' && (!Number.isInteger(level) || !HERO_CALL_LEVELS.includes(level))) {
      return NextResponse.json(
        { error: `level must be one of: ${HERO_CALL_LEVELS.join(', ')}` },
        { status: 400 }
      );
    }
    if (!nick || !mapName) {
      return NextResponse.json({ error: 'nick and mapName are required' }, { status: 400 });
    }

    const created = await prisma.heroLevelNotification.create({
      data: {
        level: kind === 'titan' ? 0 : level,
        nick,
        mapName,
        x: x ?? null,
        y: y ?? null,
        lvl: lvl ?? null,
        heroImageUrl,
        callerNick: callerNick || '?',
        kind,
        withSummon,
      },
      include: includeHelpers,
    });

    return NextResponse.json({ ok: true, id: created.id, notification: mapNotification(created) });
  } catch (e) {
    console.error('[POST /api/timer/hero-level-notifications]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
