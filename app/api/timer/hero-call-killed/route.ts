import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromApiKey } from '@/lib/auth';
import { sanitizeDiscordText, sendClanDiscordMessage } from '@/lib/discord';
import { HERO_CALL_RETENTION_MS } from '@/lib/hero-calls';
import { rateLimit } from '@/lib/rate-limit';

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

const recentLegendarySent = new Map<string, number>();

function lootKey(nick: string, mapName: string): string {
  return `${nick.trim().toLowerCase()}\n${mapName.trim().toLowerCase()}`;
}

function legendaryLine(legendary: string[]): string {
  if (legendary.length === 1) return `Legendarny przedmiot: ${legendary[0]}`;
  return `Legendarne przedmioty: ${legendary.join(', ')}`;
}

function cleanName(value: unknown, max: number): string {
  return sanitizeDiscordText(typeof value === 'string' ? value : '', max).replace(/\*/g, '');
}

function nameList(value: unknown, maxLen: number, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return unique(value.map((item) => cleanName(item, maxLen))).slice(0, limit);
}

/**
 * POST /api/timer/hero-call-killed — skrypt zgłasza zbicie z okna walki (koniec walki + martwy heros/tytan).
 * Zgłasza każdy uczestnik walki; na Discord trafia tylko jedna wiadomość,
 * bo wołanie oznaczamy atomowo (updateMany z killedAt: null) i wysyła ten, kto oznaczył pierwszy.
 * Uczestnicy biorą się z logu walki, nie z przycisku „Przyjdę pomóc”.
 * X-API-Key; body: { nick, mapName, reporterNick, participants?, legendary? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authFromApiKey(request);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
    }
    if (!rateLimit(`hero-call-killed:${user.id}`, 10, 5 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const nick = typeof body?.nick === 'string' ? body.nick.trim() : '';
    const mapName = typeof body?.mapName === 'string' ? body.mapName.trim() : '';
    const reporterNick = typeof body?.reporterNick === 'string' ? body.reporterNick.trim().slice(0, 80) : '';
    const participants = nameList(body?.participants, 40, 40);
    const legendary = nameList(body?.legendary, 80, 8);
    if (!nick || !mapName) {
      return NextResponse.json({ error: 'nick and mapName are required' }, { status: 400 });
    }

    const calls = await prisma.heroLevelNotification.findMany({
      where: {
        nick: { equals: nick, mode: 'insensitive' },
        mapName: { equals: mapName, mode: 'insensitive' },
        killedAt: null,
        createdAt: { gte: new Date(Date.now() - HERO_CALL_RETENTION_MS) },
      },
      orderBy: { createdAt: 'asc' },
    });
    if (!calls.length) {
      return sendLegendaryFollowUp(nick, mapName, legendary);
    }

    const killedAt = new Date();
    const marked = await prisma.heroLevelNotification.updateMany({
      where: { id: { in: calls.map((c) => c.id) }, killedAt: null },
      data: { killedAt, killedBy: reporterNick || '?' },
    });
    if (marked.count === 0) {
      return sendLegendaryFollowUp(nick, mapName, legendary);
    }

    const first = calls[0];
    const kind = first.kind === 'titan' ? 'titan' : 'hero';
    const callers = unique(calls.map((c) => cleanName(c.callerNick, 40)));
    const minutes = Math.max(1, Math.round((killedAt.getTime() - first.createdAt.getTime()) / 60000));

    let content = `✅ ${kind === 'titan' ? 'Tytan' : 'Heros'} ${sanitizeDiscordText(nick, 80)} zbity! (${sanitizeDiscordText(mapName, 120)})`;
    content += `\nWołał: ${callers.join(', ') || '?'} · od wołania: ${minutes} min`;
    content += participants.length
      ? `\nWzięli udział w walce (${participants.length}): ${participants.join(', ')}`
      : '\nBrak danych o uczestnikach walki';
    if (legendary.length) {
      content += `\n${legendaryLine(legendary)}`;
      recentLegendarySent.set(lootKey(nick, mapName), Date.now());
    }

    const sent = await sendClanDiscordMessage({ kind, content: content.slice(0, 1900) });
    return NextResponse.json({ ok: true, reported: true, discord: sent.ok });
  } catch (e) {
    console.error('[POST /api/timer/hero-call-killed]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** Loot bywa tylko w pakiecie osoby, która go dostała. Jak główna wiadomość poszła bez legendarki, dopisz jedną linijkę. */
async function sendLegendaryFollowUp(nick: string, mapName: string, legendary: string[]) {
  if (!legendary.length) return NextResponse.json({ ok: true, reported: false });
  const key = lootKey(nick, mapName);
  const sentAt = recentLegendarySent.get(key);
  if (sentAt && Date.now() - sentAt < 60_000) {
    return NextResponse.json({ ok: true, reported: false });
  }
  const recent = await prisma.heroLevelNotification.findFirst({
    where: {
      nick: { equals: nick, mode: 'insensitive' },
      mapName: { equals: mapName, mode: 'insensitive' },
      killedAt: { gte: new Date(Date.now() - 20_000) },
    },
    orderBy: { killedAt: 'desc' },
  });
  if (!recent) return NextResponse.json({ ok: true, reported: false });
  recentLegendarySent.set(key, Date.now());
  const kind = recent.kind === 'titan' ? 'titan' : 'hero';
  const sent = await sendClanDiscordMessage({ kind, content: legendaryLine(legendary).slice(0, 1900) });
  return NextResponse.json({ ok: true, reported: true, discord: sent.ok, lootFollowUp: true });
}
