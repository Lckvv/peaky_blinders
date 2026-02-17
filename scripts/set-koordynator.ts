/**
 * Ustawia użytkownika jako koordynatora w bazie danych.
 * Użycie: npx tsx scripts/set-koordynator.ts <username>
 * Z Railway: railway run npx tsx scripts/set-koordynator.ts <username>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const username = process.argv[2];
  if (!username) {
    console.error('Podaj username: npx tsx scripts/set-koordynator.ts <username>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    console.error(`Użytkownik "${username}" nie istnieje.`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: 'koordynator' },
  });

  console.log(`OK: Użytkownik "${username}" ma teraz rolę koordynator.`);
}

main()
  .catch((e) => {
    console.error('Błąd:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
