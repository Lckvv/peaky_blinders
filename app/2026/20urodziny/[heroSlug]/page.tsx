import EventHeroRanking from '@/app/components/EventHeroRanking';
import { getRankingForMonster, getEveHunterLeaderboard } from '@/lib/leaderboard-server';

const SLUG_TO_NAME: Record<string, string> = {
  'seeker-of-creation': 'Seeker of Creation',
  'harbinger-of-elancia': 'Harbinger of Elancia',
  'thunder-wielding-barbarian': 'Thunder-Wielding Barbarian',
};

const SLUG_TO_EVE_KEY: Record<string, number> = {
  'seeker-of-creation': 63,
  'harbinger-of-elancia': 143,
  'thunder-wielding-barbarian': 300,
};

const s: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 1000, margin: '0 auto', padding: '24px 20px' },
  headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: {
    textAlign: 'center',
    fontSize: 32,
    fontWeight: 700,
    color: '#fff8e7',
    margin: 0,
    fontFamily: 'var(--font-cinzel), Georgia, serif',
  },
  card: { background: '#16213e', borderRadius: 12, padding: 20, marginBottom: 16, border: '1px solid #2a2a4a' },
  placeholder: { color: '#888', fontSize: 15, padding: '40px 20px', textAlign: 'center' },
};

type PageProps = { params: Promise<{ heroSlug: string }> };

export default async function HeroRankingPage({ params }: PageProps) {
  const { heroSlug } = await params;
  const slug = heroSlug?.toLowerCase() ?? '';
  const monsterName = SLUG_TO_NAME[slug];
  const eveKey = SLUG_TO_EVE_KEY[slug];

  if (!monsterName) {
    return (
      <div style={s.wrap}>
        <h1 style={s.title}>Nieznany heros</h1>
        <p style={s.placeholder}>Nie znaleziono strony.</p>
      </div>
    );
  }

  const [data, hunterLeaderboard] = await Promise.all([
    getRankingForMonster(monsterName),
    eveKey != null ? getEveHunterLeaderboard(eveKey) : Promise.resolve([]),
  ]);

  if (!data) {
    return (
      <div style={s.wrap}>
        <h1 style={s.title}>Ranking {monsterName}</h1>
        <div style={s.card}>
          <p style={s.placeholder}>Brak danych rankingu.</p>
        </div>
      </div>
    );
  }

  const { monster, leaderboard } = data;

  return (
    <div style={s.wrap}>
      <div style={s.headerRow}>
        <h1 style={s.title}>Ranking {monster.name}</h1>
      </div>
      <EventHeroRanking
        monsterName={monster.name}
        leaderboard={leaderboard}
        hunterLeaderboard={hunterLeaderboard}
      />
    </div>
  );
}
