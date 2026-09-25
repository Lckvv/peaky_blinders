/** Max credited time per titan map visit. Script stops the timer; server clamps anyway. */
export const TITAN_AFK_CAP_SEC = 15 * 60;

/** Hard reject above this (malformed payload). */
export const ABSOLUTE_MAX_SESSION_SEC = 12 * 60 * 60;

/** Seconds of `start`–`end` already covered by other intervals. */
export function clipOverlapSeconds(
  start: Date,
  end: Date,
  others: { startedAt: Date; endedAt: Date }[]
): number {
  const startMs = start.getTime();
  const endMs = end.getTime();
  if (!(endMs > startMs) || others.length === 0) return 0;

  const iv = others
    .map((s) => ({
      a: Math.max(startMs, s.startedAt.getTime()),
      b: Math.min(endMs, s.endedAt.getTime()),
    }))
    .filter((x) => x.b > x.a)
    .sort((a, b) => a.a - b.a);

  let covered = 0;
  let cs = 0;
  let ce = 0;
  for (const x of iv) {
    if (ce === 0 || x.a > ce) {
      covered += ce - cs;
      cs = x.a;
      ce = x.b;
    } else if (x.b > ce) {
      ce = x.b;
    }
  }
  covered += ce - cs;
  return Math.round(covered / 1000);
}
