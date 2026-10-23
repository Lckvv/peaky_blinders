import EventHeroRanking from '@/app/components/EventHeroRanking';
import EveLiveTimers from '@/app/components/EveLiveTimers';
import { getRankingForMonster, getEveHunterLeaderboard } from '@/lib/leaderboard-server';
export const dynamic = 'force-dynamic';

const SLUG_TO_HERO: Record<string, { name: string; eveKey: number }> = {
  doppelganger: { name: 'Doppelganger', eveKey: 132 },
  drude: { name: 'Drude', eveKey: 190 },
  nosferatu: { name: 'Nosferatu', eveKey: 243 },
};

const s: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 1000, margin: '0 auto', padding: '24px 20px', fontFamily: 'system-ui, sans-serif' },
  headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { textAlign: 'center' as const, fontSize: 32, fontWeight: 700, color: '#fff', margin: 0 },
  placeholder: { color: '#888', fontSize: 15, padding: '40px 20px', textAlign: 'center' as const },
};

type PageProps = { params: Promise<{ heroSlug: string }> };

export default async function HalloweenHeroPage({ params }: PageProps) {
  const { heroSlug } = await params;
  const hero = SLUG_TO_HERO[heroSlug?.toLowerCase() ?? ''];

  if (!hero) {
    return (
      <div style={s.wrap}>
        <h1 style={s.title}>Nieznany heros</h1>
        <p style={s.placeholder}>Nie znaleziono strony.</p>
      </div>
    );
  }

  const [data, hunterLeaderboard] = await Promise.all([
    getRankingForMonster(hero.name),
    getEveHunterLeaderboard(hero.eveKey),
  ]);

  return (
    <div style={s.wrap}>
      <div style={s.headerRow}>
        <h1 style={s.title}>
          {hero.eveKey} — {hero.name}
        </h1>
      </div>

      <EveLiveTimers eveKey={hero.eveKey} />

      <EventHeroRanking
        monsterName={hero.name}
        leaderboard={data?.leaderboard ?? []}
        hunterLeaderboard={hunterLeaderboard}
      />
    </div>
  );
}
