import { prisma } from '@/lib/prisma';
import { getEveHero, getEveHeroByMonster } from '@/lib/eve-event-ended';

/** Kilku uczestników walki zgłasza to samo zabicie — w tym oknie traktujemy je jako jedno. */
const SAME_KILL_WINDOW_MS = 10 * 60 * 1000;

/**
 * Zapisuje zabicie herosa EVE (start okna respawnu). Zwraca false gdy to nie heros trwającego eventu
 * albo zabicie już jest zapisane przez innego uczestnika walki.
 */
export async function recordEveHeroKill(opts: {
  eveKey?: number;
  monster?: string;
  mapName: string;
  reporterNick: string;
  userId?: string;
}): Promise<boolean> {
  const hero = opts.eveKey != null ? getEveHero(opts.eveKey) : opts.monster ? getEveHeroByMonster(opts.monster) : undefined;
  if (!hero || hero.ended) return false;

  const now = Date.now();
  const last = await prisma.eveHeroKill.findFirst({
    where: { eveKey: hero.key },
    orderBy: { killedAt: 'desc' },
  });
  if (last && now - last.killedAt.getTime() < SAME_KILL_WINDOW_MS) return false;

  await prisma.eveHeroKill.create({
    data: {
      eveKey: hero.key,
      mapName: opts.mapName.slice(0, 200),
      reporterNick: (opts.reporterNick || '?').slice(0, 80),
      userId: opts.userId ?? null,
      killedAt: new Date(now),
    },
  });
  return true;
}
