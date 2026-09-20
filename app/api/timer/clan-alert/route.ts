import { NextRequest, NextResponse } from 'next/server';
import { authFromApiKey } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  HERO_CALL_LEVEL_RANGE,
  getMonsterMention,
  sanitizeDiscordText,
  sendClanDiscordMessage,
} from '@/lib/discord';
import { rateLimit } from '@/lib/rate-limit';

const HERO_LEVELS = [64, 83, 114, 144, 217, 300];

/**
 * POST /api/timer/clan-alert — wyślij wołanie na Discord (webhook tylko na serwerze).
 * X-API-Key wymagany.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authFromApiKey(request);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
    }

    if (!rateLimit(`clan-alert:${user.id}`, 8, 5 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many Discord alerts. Wait a few minutes.' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const kind = body?.kind === 'titan' ? 'titan' : 'hero';
    const withSummon = !!body?.withSummon && kind === 'hero';
    const nick = sanitizeDiscordText(typeof body?.nick === 'string' ? body.nick : '', 80);
    const mapName = sanitizeDiscordText(typeof body?.mapName === 'string' ? body.mapName : '', 120);
    const callerNick = sanitizeDiscordText(typeof body?.callerNick === 'string' ? body.callerNick : '', 80);
    const level = body?.level != null ? parseInt(String(body.level), 10) : kind === 'titan' ? 0 : NaN;
    const lvl = body?.lvl != null ? parseInt(String(body.lvl), 10) : NaN;
    const x = body?.x != null ? parseInt(String(body.x), 10) : NaN;
    const y = body?.y != null ? parseInt(String(body.y), 10) : NaN;
    const heroImageUrl = typeof body?.heroImageUrl === 'string' ? body.heroImageUrl.trim() : '';

    if (!nick || !mapName) {
      return NextResponse.json({ error: 'nick and mapName are required' }, { status: 400 });
    }
    if (kind === 'hero' && (!Number.isInteger(level) || !HERO_LEVELS.includes(level))) {
      return NextResponse.json({ error: 'level must be one of: 64, 83, 114, 144, 217, 300' }, { status: 400 });
    }

    const mention = getMonsterMention(kind, nick);
    const lvlStr = Number.isInteger(lvl) ? `${lvl}m` : '?';
    const posStr = Number.isInteger(x) && Number.isInteger(y) ? `${x},${y}` : '?';
    const kindLabel = kind === 'titan' ? 'Tytan!' : 'Heros!';
    let content = `${mention} ${kindLabel} ${nick} (${lvlStr}), ${mapName} (${posStr})`;
    content += `\nWoła: ${callerNick || '?'}`;
    if (kind === 'hero') {
      const lo = level - HERO_CALL_LEVEL_RANGE;
      const hi = level + HERO_CALL_LEVEL_RANGE;
      content += ` · przedział ${level} (${lo}–${hi})`;
    }
    if (withSummon) content += '\n⚡ Zaproponowano Przywołanie na herosa';

    const sent = await sendClanDiscordMessage({
      kind,
      content,
      imageUrl: heroImageUrl || null,
    });
    if (!sent.ok) {
      return NextResponse.json(
        { error: sent.error || `Discord error ${sent.status}` },
        { status: sent.status === 503 ? 503 : 502 }
      );
    }

    await prisma.heroAlertLog.create({
      data: {
        userId: user.id,
        senderNick: callerNick || '?',
        heroNick: nick,
        mapName,
        lvl: Number.isInteger(lvl) ? lvl : null,
        x: Number.isInteger(x) ? x : null,
        y: Number.isInteger(y) ? y : null,
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true, channel: kind === 'titan' ? 'tytani' : 'herosi' });
  } catch (e) {
    console.error('[POST /api/timer/clan-alert]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
