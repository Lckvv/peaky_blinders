/**
 * Czyści dane timerów z bazy (sesje i wyniki faz).
 * Konta (User), API keys, potwory (Monster) i definicje faz (Phase) zostają.
 *
 * Użycie:
 *   npx tsx scripts/clear-timer-data.ts
 * Z Railway (produkcja):
 *   railway run npx tsx scripts/clear-timer-data.ts
 *
 * Opcja --phases  usuwa też wszystkie fazy (w Admin trzeba będzie uruchomić fazy od zera).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const alsoPhases = process.argv.includes('--phases');

  const deletedResults = await prisma.phaseResult.deleteMany({});
  console.log('Usunięto PhaseResult:', deletedResults.count);

  const deletedSessions = await prisma.mapSession.deleteMany({});
  console.log('Usunięto MapSession:', deletedSessions.count);

  if (alsoPhases) {
    const deletedPhases = await prisma.phase.deleteMany({});
    console.log('Usunięto Phase:', deletedPhases.count);
  }

  console.log('Gotowe. Dane timerów wyczyszczone.');
  if (!alsoPhases) {
    console.log('(Fazy zostały. Aby usunąć też fazy, uruchom z opcją: --phases)');
  }
}

main()
  .catch((e) => {
    console.error('Błąd:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
