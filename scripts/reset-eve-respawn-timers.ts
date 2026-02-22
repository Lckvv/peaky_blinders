/**
 * Resetuje timery respawnu herosów EVE (63, 143, 300).
 * Po uruchomieniu w oknach skryptu będą 00:00 / brak odliczania, dopóki ktoś nie zejdzie z mapy herosa.
 *
 * Użycie: npx tsx scripts/reset-eve-respawn-timers.ts
 * Z Railway: railway run npx tsx scripts/reset-eve-respawn-timers.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const deleted = await prisma.eveRespawnTimer.deleteMany({});
  console.log('Usunięto EveRespawnTimer:', deleted.count, '— czasy 63, 143, 300 zresetowane (00:00).');
}

main()
  .catch((e) => {
    console.error('Błąd:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
