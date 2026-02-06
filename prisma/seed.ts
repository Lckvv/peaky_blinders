import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create initial monsters
  const monsters = [
    { name: 'Kic', mapName: "Caerbannog's Grotto - 1st Chamber" },
    // Dodaj więcej potworów:
    // { name: 'NazwaPotwora', mapName: 'Nazwa Mapy' },
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
