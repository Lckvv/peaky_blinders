/**
 * Usuwa stare rekordy MapSession (np. starsze niż 90 dni), w partiach, żeby nie obciążać pamięci.
 * PhaseResult i Phase NIE są usuwane — rankingi zamkniętych faz zostają.
 *
 * Użycie:
 *   npx tsx scripts/prune-old-sessions.ts
 *   npx tsx scripts/prune-old-sessions.ts --days 180
 *   railway run npx tsx scripts/prune-old-sessions.ts --days 90
 *
 * Opcje:
 *   --days N   usuń sesje starsze niż N dni (domyślnie: 90)
 *   --dry-run  tylko pokaż ile rekordów zostałoby usuniętych, nie usuwaj
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BATCH_SIZE = 2000;

async function main() {
  const args = process.argv.slice(2);
  const daysIdx = args.indexOf('--days');
  const days = daysIdx >= 0 && args[daysIdx + 1] ? parseInt(args[daysIdx + 1], 10) : 90;
  const dryRun = args.includes('--dry-run');

  if (isNaN(days) || days < 1) {
    console.error('Podaj poprawną liczbę dni, np. --days 90');
    process.exit(1);
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  console.log(`Sesje zakończone przed ${cutoff.toISOString()} (starsze niż ${days} dni) będą usunięte.`);
  if (dryRun) console.log('(tryb dry-run — nic nie usuwam)\n');

  let totalDeleted = 0;

  while (true) {
    const batch = await prisma.mapSession.findMany({
      where: { endedAt: { lt: cutoff } },
      select: { id: true },
      take: BATCH_SIZE,
    });

    if (batch.length === 0) break;

    if (!dryRun) {
      await prisma.mapSession.deleteMany({
        where: { id: { in: batch.map((r) => r.id) } },
      });
    }

    totalDeleted += batch.length;
    console.log(`${dryRun ? 'Byłoby usunięte' : 'Usunięto'} ${batch.length} rekordów (łącznie: ${totalDeleted})`);

    if (batch.length < BATCH_SIZE) break;
  }

  console.log(`\nGotowe. ${dryRun ? 'Byłoby usuniętych' : 'Usunięto'} łącznie ${totalDeleted} sesji.`);
  if (dryRun) console.log('Uruchom bez --dry-run, aby naprawdę usunąć.');
}

main()
  .catch((e) => {
    console.error('Błąd:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
