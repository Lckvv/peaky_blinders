import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromCookie } from '@/lib/auth';

// Monstery w kolejności: short label -> pełna nazwa w DB
const ADMIN_MONSTERS = [
  { key: 'orla', label: 'Orla', name: 'Orla' },
  { key: 'kic', label: 'Kic', name: 'Kic' },
  { key: 'rene', label: 'Rene', name: 'Renegat' },
  { key: 'arcy', label: 'Arcy', name: 'Arcy' },
  { key: 'zoons', label: 'Zoons', name: 'Zoons' },
  { key: 'lowka', label: 'Lowka', name: 'Łowczyni' },
  { key: 'przyzy', label: 'Przyzy', name: 'Przyzywacz' },
  { key: 'magua', label: 'Magua', name: 'Magua' },
  { key: 'teza', label: 'Teza', name: 'Teza' },
  { key: 'barba', label: 'Barba', name: 'Barbatos' },
  { key: 'tanro', label: 'Tanro', name: 'Tanroth' },
] as const;

// GET /api/admin/phase-status — lista potworów i status faz (admin lub koordynator)
export async function GET() {
  try {
    const user = await authFromCookie();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin' && user.role !== 'koordynator') {
      return NextResponse.json({ error: 'Forbidden - admin or koordynator only' }, { status: 403 });
    }

    const result = await Promise.all(
      ADMIN_MONSTERS.map(async (m) => {
        let monster = await prisma.monster.findUnique({
          where: { name: m.name },
          include: {
            phases: {
              where: { isActive: true },
              take: 1,
              orderBy: { startedAt: 'desc' },
            },
          },
        });
        if (!monster) {
          monster = await prisma.monster.create({
            data: { name: m.name, mapName: m.name },
            include: {
              phases: {
                where: { isActive: true },
                take: 1,
              },
            },
          });
        }
        const activePhase = monster.phases[0] ?? null;
        return {
          key: m.key,
          label: m.label,
          monsterName: m.name,
          hasActivePhase: !!activePhase,
          startedAt: activePhase?.startedAt ?? null,
          phaseName: activePhase?.name ?? null,
        };
      })
    );

    return NextResponse.json({ monsters: result });
  } catch (error) {
    console.error('[Phase Status] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
