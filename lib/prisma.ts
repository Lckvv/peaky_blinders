import { PrismaClient } from '@prisma/client';

// Na Railway (i innych hostach) baza ma limit równoczesnych połączeń. Bez limitu
// puli po stronie aplikacji łatwo o "503 Backend.max_conn reached".
if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
  try {
    const u = new URL(process.env.DATABASE_URL);
    if (!u.searchParams.has('connection_limit')) {
      u.searchParams.set('connection_limit', '5');
      process.env.DATABASE_URL = u.toString();
    }
  } catch {
    // Nie zmieniamy URL przy błędnej wartości
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
