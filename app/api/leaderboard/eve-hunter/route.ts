import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const EVE_KEYS = [63, 143, 300];

export type EveHunterEntry = {
  rank: number;
  userId: string;
  username: string;
  nick: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
  points: number;
};

// GET /api/leaderboard/eve-hunter?eveKey=63 — ranking Łowcy herosa (punkty = liczba zgłoszonych zabójstw)
export async function GET(request: NextRequest) {
  try {
    const eveKeyStr = request.nextUrl.searchParams.get('eveKey');
    const eveKey = eveKeyStr ? parseInt(eveKeyStr, 10) : NaN;

    if (!Number.isInteger(eveKey) || !EVE_KEYS.includes(eveKey)) {
      return NextResponse.json(
        { error: 'eveKey must be 63, 143 or 300' },
        { status: 400 }
      );
    }

    const kills = await prisma.eveHunterKill.findMany({
      where: { eveKey },
      select: { userId: true },
    });

    const pointsByUser: Record<string, number> = {};
    for (const k of kills) {
      pointsByUser[k.userId] = (pointsByUser[k.userId] ?? 0) + 1;
    }

    const userIds = Object.keys(pointsByUser);
    if (userIds.length === 0) {
      return NextResponse.json({
        eveKey,
        leaderboard: [] as EveHunterEntry[],
      });
    }

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, nick: true, profileUrl: true, avatarUrl: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const leaderboard: EveHunterEntry[] = Object.entries(pointsByUser)
      .map(([userId, points]) => ({
        userId,
        points,
        user: userMap[userId],
      }))
      .filter((e) => e.user)
      .sort((a, b) => b.points - a.points)
      .map((item, idx) => ({
        rank: idx + 1,
        userId: item.userId,
        username: item.user!.username,
        nick: item.user!.nick,
        profileUrl: item.user!.profileUrl,
        avatarUrl: item.user!.avatarUrl,
        points: item.points,
      }));

    return NextResponse.json({
      eveKey,
      leaderboard,
    });
  } catch (e) {
    console.error('[GET /api/leaderboard/eve-hunter]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
