import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create initial monsters (tytani + herosy 20 urodziny 2026)
  const monsters = [
    { name: 'Kic', mapName: "Caerbannog's Grotto - 1st Chamber" },
    { name: 'Seeker of Creation', mapName: 'Dripping Honey Mine - Vestibule' },
    { name: 'Harbinger of Elancia', mapName: "Vorundriel's Forge - 1st Level" },
    { name: 'Thunder-Wielding Barbarian', mapName: 'Shaiharrud Desert - East' },
  ];

  for (const monster of monsters) {
    await prisma.monster.upsert({
      where: { name: monster.name },
      update: { mapName: monster.mapName },
      create: monster,
    });
    console.log(`  ✅ Monster: ${monster.name} (${monster.mapName})`);
  }

  console.log('🌱 Seed complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
