import { Prisma } from '@prisma/client';
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

export type LeaderboardEntry = {
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

export type HunterEntry = {
  rank: number;
  userId: string;
  username: string;
  nick: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
  points: number;
};

/** Dla herosów eventowych (brak faz): ranking czasu na mapach. Używane tylko po stronie serwera (strona 20urodziny). */
export async function getRankingForMonster(monsterName: string): Promise<{
  monster: { id: string; name: string; mapName: string | null };
  leaderboard: LeaderboardEntry[];
} | null> {
  const monster = await prisma.monster.findUnique({
    where: { name: monsterName },
    include: { phases: true },
  });
  if (!monster || monster.phases.length > 0) return null;

  const [grouped, heroRows] = await Promise.all([
    prisma.mapSession.groupBy({
      by: ['userId'],
      where: { monsterId: monster.id },
      _sum: { duration: true },
      _count: true,
    }),
    prisma.$queryRaw<Array<{ userId: string; heroName: string; heroOutfitUrl: string | null }>>(
      Prisma.sql`SELECT DISTINCT ON ("userId") "userId", "heroName", "heroOutfitUrl"
        FROM "MapSession" WHERE "monsterId" = ${monster.id}
        ORDER BY "userId", "endedAt" DESC`
    ),
  ]);
  const userIds = grouped.map((s) => s.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, nick: true, profileUrl: true, avatarUrl: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  const byUser: Record<string, { totalTime: number; totalSessions: number }> = {};
  const heroByUser: Record<string, string> = {};
  const outfitByUser: Record<string, string | null> = {};
  for (const r of heroRows) {
    heroByUser[r.userId] = r.heroName;
    outfitByUser[r.userId] = r.heroOutfitUrl ?? null;
  }
  for (const s of grouped) {
    byUser[s.userId] = { totalTime: s._sum.duration ?? 0, totalSessions: s._count };
  }
  const sorted = Object.entries(byUser)
    .map(([userId, data]) => ({ userId, ...data, user: userMap[userId]! }))
    .filter((e) => e.user)
    .sort((a, b) => b.totalTime - a.totalTime);
  const leaderboard: LeaderboardEntry[] = sorted.map((item, idx) => ({
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

  return {
    monster: { id: monster.id, name: monster.name, mapName: monster.mapName },
    leaderboard,
  };
}

const EVE_KEYS = [63, 143, 300];

/** Ranking łowcy herosa (eveKey 63, 143, 300). Tylko odczyt po stronie serwera. */
export async function getEveHunterLeaderboard(eveKey: number): Promise<HunterEntry[]> {
  if (!Number.isInteger(eveKey) || !EVE_KEYS.includes(eveKey)) return [];

  const kills = await prisma.eveHunterKill.findMany({
    where: { eveKey },
    select: { userId: true },
  });
  const pointsByUser: Record<string, number> = {};
  for (const k of kills) {
    pointsByUser[k.userId] = (pointsByUser[k.userId] ?? 0) + 1;
  }
  const userIds = Object.keys(pointsByUser);
  if (userIds.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, nick: true, profileUrl: true, avatarUrl: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return Object.entries(pointsByUser)
    .map(([userId, points]) => ({ userId, points, user: userMap[userId] }))
    .filter((e): e is { userId: string; points: number; user: NonNullable<typeof users[0]> } => !!e.user)
    .sort((a, b) => b.points - a.points)
    .map((item, idx) => ({
      rank: idx + 1,
      userId: item.userId,
      username: item.user.username,
      nick: item.user.nick,
      profileUrl: item.user.profileUrl,
      avatarUrl: item.user.avatarUrl,
      points: item.points,
    }));
}
