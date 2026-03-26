import { getRankingForMonster, getEveHunterLeaderboard } from '@/lib/leaderboard-server';

const SLUG_TO_NAME: Record<string, string> = {
  'hotblood-capon': 'Hotblood Capon',
  'grim-blackcluck': 'Grim Blackcluck',
};

const SLUG_TO_EVE_KEY: Record<string, number> = {
  'hotblood-capon': 81,
  'grim-blackcluck': 41,
};

const s: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 1000, margin: '0 auto', padding: '24px 20px', fontFamily: 'system-ui, sans-serif' },
  headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { textAlign: 'center' as const, fontSize: 32, fontWeight: 700, color: '#fff', margin: 0 },
  card: { background: '#16213e', borderRadius: 12, padding: 20, marginBottom: 16, border: '1px solid #2a2a4a' },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  th: { textAlign: 'left' as const, padding: '10px 12px', background: '#0f0f23', color: '#8892b0', fontWeight: 600, fontSize: 11 },
  td: { padding: '10px 12px', borderBottom: '1px solid #2a2a4a', color: '#ccc' },
  link: { color: '#3498db', textDecoration: 'none' },
  placeholder: { color: '#888', fontSize: 15, padding: '40px 20px', textAlign: 'center' as const },
};

type PageProps = { params: Promise<{ heroSlug: string }> };

export default async function EasterHeroRankingPage({ params }: PageProps) {
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

      <div style={s.card}>
        {leaderboard.length > 0 ? (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Pozycja</th>
                <th style={s.th}>Nick</th>
                <th style={s.th}>Postac</th>
                <th style={s.th}>Czas</th>
                <th style={s.th}>Sesje</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((e) => (
                <tr key={e.userId}>
                  <td style={s.td}>{e.rank}</td>
                  <td style={s.td}>
                    {e.profileUrl ? (
                      <a href={e.profileUrl} target="_blank" rel="noopener noreferrer" style={s.link}>
                        {e.nick || e.username}
                      </a>
                    ) : (
                      <span>{e.nick || e.username}</span>
                    )}
                  </td>
                  <td style={s.td}>{e.heroName}</td>
                  <td style={{ ...s.td, fontFamily: 'monospace', color: '#2ecc71' }}>{e.totalTimeFormatted}</td>
                  <td style={s.td}>{e.totalSessions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={s.placeholder}>Brak uczestnikow w tym rankingu.</p>
        )}
      </div>

      <div style={s.card}>
        <h2 style={{ ...s.title, fontSize: 22, marginBottom: 16 }}>Ranking Lowcy herosa</h2>
        {hunterLeaderboard.length > 0 ? (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Pozycja</th>
                <th style={s.th}>Nick</th>
                <th style={s.th}>Punkty</th>
              </tr>
            </thead>
            <tbody>
              {hunterLeaderboard.map((e) => (
                <tr key={e.userId}>
                  <td style={s.td}>{e.rank}</td>
                  <td style={s.td}>
                    {e.profileUrl ? (
                      <a href={e.profileUrl} target="_blank" rel="noopener noreferrer" style={s.link}>
                        {e.nick || e.username}
                      </a>
                    ) : (
                      <span>{e.nick || e.username}</span>
                    )}
                  </td>
                  <td style={{ ...s.td, color: '#e67e22', fontWeight: 600 }}>{e.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={s.placeholder}>Brak punktow lowcy dla tego herosa.</p>
        )}
      </div>
    </div>
  );
}
