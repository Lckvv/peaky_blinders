import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function formatTime(totalSeconds: number): string {
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatPhaseLabel(phase: { name: string; phaseNumber: number; startedAt: Date; endedAt: Date | null; isActive: boolean }): string {
  const prefix = `${phase.name} #${phase.phaseNumber}`;
  if (phase.isActive) return `${prefix} (aktywna)`;
  const date = phase.endedAt || phase.startedAt;
  const d = new Date(date);
  const str = d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${prefix} - ${str}`;
}

// GET /api/leaderboard/ranking?monster=Kic&phaseId=optional
// phaseId pusty = ranking łączony ze wszystkich faz; phaseId = id fazy = ranking tylko tej fazy
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monsterName = searchParams.get('monster');
    const phaseId = searchParams.get('phaseId');

    if (!monsterName) {
      return NextResponse.json({ error: 'monster is required' }, { status: 400 });
    }

    const monster = await prisma.monster.findUnique({
      where: { name: monsterName },
      include: {
        phases: {
          orderBy: [{ isActive: 'desc' }, { endedAt: 'desc' }],
        },
      },
    });

    if (!monster) {
      return NextResponse.json({ error: 'Monster not found' }, { status: 404 });
    }

    const activePhase = await prisma.phase.findFirst({
      where: { monsterId: monster.id, isActive: true },
    });

    const phasesForDropdown = monster.phases.map((p) => ({
      id: p.id,
      name: p.name,
      label: formatPhaseLabel({
        name: p.name,
        phaseNumber: p.phaseNumber,
        startedAt: p.startedAt,
        endedAt: p.endedAt,
        isActive: p.isActive,
      }),
      startedAt: p.startedAt.toISOString(),
      endedAt: p.endedAt?.toISOString() ?? null,
      isActive: p.isActive,
    }));

    type LeaderboardEntry = {
      rank: number;
      userId: string;
      username: string;
      nick: string | null;
      profileUrl: string | null;
      avatarUrl: string | null;
      heroName: string;
      totalTime: number;
      totalTimeFormatted: string;
      totalSessions: number;
    };

    let leaderboard: LeaderboardEntry[] = [];

    if (phaseId) {
      const phase = await prisma.phase.findFirst({
        where: { id: phaseId, monsterId: monster.id },
        include: {
          phaseResults: {
            include: {
              user: { select: { id: true, username: true, nick: true, profileUrl: true, avatarUrl: true } },
            },
            orderBy: { totalTime: 'desc' },
          },
        },
      });

      if (!phase) {
        return NextResponse.json({ error: 'Phase not found' }, { status: 404 });
      }

      let heroByUser: Record<string, string> = {};
      let outfitByUser: Record<string, string | null> = {};

      if (phase.isActive) {
        const sessions = await prisma.mapSession.findMany({
          where: { phaseId: phase.id },
          select: { userId: true, heroName: true, heroOutfitUrl: true, duration: true },
          orderBy: { endedAt: 'desc' },
        });
        const seen = new Set<string>();
        for (const s of sessions) {
          if (!seen.has(s.userId)) {
            heroByUser[s.userId] = s.heroName;
            outfitByUser[s.userId] = s.heroOutfitUrl ?? null;
            seen.add(s.userId);
          }
        }
        const byUser: Record<string, { totalTime: number; totalSessions: number }> = {};
        const userIds = [...new Set(sessions.map((s) => s.userId))];
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, username: true, nick: true, profileUrl: true, avatarUrl: true },
        });
        const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
        for (const s of sessions) {
          if (!byUser[s.userId]) byUser[s.userId] = { totalTime: 0, totalSessions: 0 };
          byUser[s.userId].totalTime += s.duration;
          byUser[s.userId].totalSessions += 1;
        }
        const sorted = Object.entries(byUser)
          .map(([userId, data]) => ({ userId, ...data, user: userMap[userId]! }))
          .filter((e) => e.user)
          .sort((a, b) => b.totalTime - a.totalTime);
        leaderboard = sorted.map((item, idx) => ({
          rank: idx + 1,
          userId: item.userId,
          username: item.user.username,
          nick: item.user.nick,
          profileUrl: item.user.profileUrl,
          avatarUrl: outfitByUser[item.userId] ?? item.user.avatarUrl ?? null,
          heroName: heroByUser[item.userId] ?? '-',
          totalTime: item.totalTime,
          totalTimeFormatted: formatTime(item.totalTime),
          totalSessions: item.totalSessions,
        }));
      } else {
        const sessions = await prisma.mapSession.findMany({
          where: { phaseId: phase.id },
          select: { userId: true, heroName: true, heroOutfitUrl: true },
          orderBy: { endedAt: 'desc' },
        });
        const seen = new Set<string>();
        for (const s of sessions) {
          if (!seen.has(s.userId)) {
            heroByUser[s.userId] = s.heroName;
            outfitByUser[s.userId] = s.heroOutfitUrl ?? null;
            seen.add(s.userId);
          }
        }
        leaderboard = phase.phaseResults.map((r, idx) => ({
          rank: idx + 1,
          userId: r.userId,
          username: r.user.username,
          nick: r.user.nick,
          profileUrl: r.user.profileUrl,
          avatarUrl: outfitByUser[r.userId] ?? r.user.avatarUrl ?? null,
          heroName: heroByUser[r.userId] ?? '-',
          totalTime: r.totalTime,
          totalTimeFormatted: formatTime(r.totalTime),
          totalSessions: r.totalSessions,
        }));
      }
    } else {
      const allPhaseIds = monster.phases.map((p) => p.id);
      const activePhaseId = activePhase?.id ?? null;

      const combinedByUser: Record<
        string,
        { totalTime: number; totalSessions: number; user: { id: string; username: string; nick: string | null; profileUrl: string | null; avatarUrl: string | null } }
      > = {};

      for (const phase of monster.phases) {
        if (phase.isActive && activePhaseId) {
          const sessions = await prisma.mapSession.findMany({
            where: { monsterId: monster.id, phaseId: activePhaseId },
            select: { userId: true, duration: true, heroName: true },
          });
          const users = await prisma.user.findMany({
            where: { id: { in: [...new Set(sessions.map((s) => s.userId))] } },
            select: { id: true, username: true, nick: true, profileUrl: true, avatarUrl: true },
          });
          const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
          for (const s of sessions) {
            const u = userMap[s.userId];
            if (!u) continue;
            if (!combinedByUser[s.userId]) {
              combinedByUser[s.userId] = { totalTime: 0, totalSessions: 0, user: u };
            }
            combinedByUser[s.userId].totalTime += s.duration;
            combinedByUser[s.userId].totalSessions += 1;
          }
        } else {
          const results = await prisma.phaseResult.findMany({
            where: { phaseId: phase.id },
            include: { user: { select: { id: true, username: true, nick: true, profileUrl: true, avatarUrl: true } } },
          });
          for (const r of results) {
            if (!combinedByUser[r.userId]) {
              combinedByUser[r.userId] = {
                totalTime: 0,
                totalSessions: 0,
                user: r.user,
              };
            }
            combinedByUser[r.userId].totalTime += r.totalTime;
            combinedByUser[r.userId].totalSessions += r.totalSessions;
          }
        }
      }

      const sorted = Object.entries(combinedByUser)
        .map(([userId, data]) => ({ userId, ...data }))
        .sort((a, b) => b.totalTime - a.totalTime);

      const userIds = sorted.map((s) => s.userId);
      const heroSessions = await prisma.mapSession.findMany({
        where: { monsterId: monster.id, userId: { in: userIds } },
        select: { userId: true, heroName: true, heroOutfitUrl: true },
        orderBy: { endedAt: 'desc' },
      });
      const heroByUser: Record<string, string> = {};
      const outfitByUser: Record<string, string | null> = {};
      const seen = new Set<string>();
      for (const s of heroSessions) {
        if (!seen.has(s.userId)) {
          heroByUser[s.userId] = s.heroName;
          outfitByUser[s.userId] = s.heroOutfitUrl ?? null;
          seen.add(s.userId);
        }
      }

      leaderboard = sorted.map((item, idx) => ({
        rank: idx + 1,
        userId: item.userId,
        username: item.user.username,
        nick: item.user.nick,
        profileUrl: item.user.profileUrl,
        avatarUrl: outfitByUser[item.userId] ?? item.user.avatarUrl ?? null,
        heroName: heroByUser[item.userId] ?? '-',
        totalTime: item.totalTime,
        totalTimeFormatted: formatTime(item.totalTime),
        totalSessions: item.totalSessions,
      }));
    }

    return NextResponse.json({
      monster: { id: monster.id, name: monster.name, mapName: monster.mapName },
      phases: phasesForDropdown,
      leaderboard,
    });
  } catch (error) {
    console.error('[Leaderboard Ranking] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
