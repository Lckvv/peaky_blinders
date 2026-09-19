'use client';

import { useMemo, useState } from 'react';
import Podium from './Podium';

export type RankingRow = {
  rank: number;
  userId: string;
  username: string;
  nick: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
  heroName: string;
  totalTimeFormatted: string;
  totalSessions: number;
};

export type HunterRow = {
  rank: number;
  userId: string;
  username: string;
  nick: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
  points: number;
};

const s: Record<string, React.CSSProperties> = {
  searchWrap: { marginBottom: 16 },
  searchInput: {
    width: '100%',
    maxWidth: 360,
    padding: '10px 14px',
    background: '#0f0f23',
    border: '1px solid #2a2a4a',
    borderRadius: 8,
    color: '#fff',
    fontSize: 14,
    boxSizing: 'border-box',
  },
  searchHint: { color: '#8892b0', fontSize: 12, marginTop: 8 },
  card: { background: '#16213e', borderRadius: 12, padding: 20, marginBottom: 16, border: '1px solid #2a2a4a' },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  th: { textAlign: 'left' as const, padding: '10px 12px', background: '#0f0f23', color: '#8892b0', fontWeight: 600, fontSize: 11 },
  td: { padding: '10px 12px', borderBottom: '1px solid #2a2a4a', color: '#ccc' },
  avatarWrap: {
    width: 32,
    height: 48,
    overflow: 'hidden' as const,
    position: 'relative' as const,
    transform: 'scale(1.4)',
    transformOrigin: 'left center',
    borderRadius: 6,
    background: '#0f0f23',
    border: '1px solid #2a2a4a',
  },
  avatarImg: { position: 'absolute' as const, left: 0, top: 0, display: 'block' },
  avatarPlaceholder: {
    width: 32,
    height: 48,
    background: '#0f0f23',
    border: '1px solid #2a2a4a',
    borderRadius: 6,
  },
  link: { color: '#e3c36a', textDecoration: 'none' },
  placeholder: { color: '#888', fontSize: 15, padding: '24px 12px', textAlign: 'center' as const },
  title: {
    textAlign: 'center' as const,
    fontSize: 22,
    fontWeight: 700,
    color: '#fff8e7',
    margin: '0 0 16px',
    fontFamily: 'var(--font-cinzel), Georgia, serif',
  },
};

function matchesQuery(row: { nick: string | null; username: string; heroName?: string }, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    (row.nick || '').toLowerCase().includes(q) ||
    row.username.toLowerCase().includes(q) ||
    (row.heroName || '').toLowerCase().includes(q)
  );
}

function AvatarCell({ url }: { url: string | null }) {
  if (url) {
    return (
      <div style={s.avatarWrap}>
        <img src={url} alt="" style={s.avatarImg} />
      </div>
    );
  }
  return <div style={s.avatarPlaceholder} />;
}

type Props = {
  monsterName: string;
  leaderboard: RankingRow[];
  hunterLeaderboard: HunterRow[];
};

export default function EventHeroRanking({ monsterName, leaderboard, hunterLeaderboard }: Props) {
  const [query, setQuery] = useState('');

  const filteredLeaderboard = useMemo(
    () => leaderboard.filter((e) => matchesQuery(e, query)),
    [leaderboard, query]
  );
  const filteredHunter = useMemo(
    () => hunterLeaderboard.filter((e) => matchesQuery(e, query)),
    [hunterLeaderboard, query]
  );

  const trimmed = query.trim();

  return (
    <>
      <div style={s.searchWrap}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj nicku, postaci..."
          style={s.searchInput}
          aria-label="Szukaj w rankingu"
        />
        {trimmed ? (
          <p style={s.searchHint}>
            Wyniki dla „{trimmed}”: {filteredLeaderboard.length} w czasie, {filteredHunter.length} w łowcy
          </p>
        ) : (
          <p style={s.searchHint}>Wpisz nick lub nazwę postaci, żeby przefiltrować tabelę.</p>
        )}
      </div>

      {leaderboard.length > 0 ? (
        <>
          {!trimmed && (
            <Podium
              entries={leaderboard.slice(0, 3).map((e) => ({
                nick: e.nick,
                username: e.username,
                avatarUrl: e.avatarUrl,
                score: e.totalTimeFormatted,
              }))}
            />
          )}
          <div style={s.card}>
            {filteredLeaderboard.length > 0 ? (
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Pozycja</th>
                    <th style={s.th}>Nick</th>
                    <th style={s.th}>Grafika</th>
                    <th style={s.th}>Postać</th>
                    <th style={s.th}>Czas</th>
                    <th style={s.th}>Sesje</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaderboard.map((e) => (
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
                      <td style={s.td}>
                        <AvatarCell url={e.avatarUrl} />
                      </td>
                      <td style={s.td}>{e.heroName}</td>
                      <td style={{ ...s.td, fontFamily: 'monospace', color: '#2ecc71' }}>{e.totalTimeFormatted}</td>
                      <td style={s.td}>{e.totalSessions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={s.placeholder}>Brak wyników dla „{trimmed}” w rankingu czasu.</p>
            )}
          </div>
        </>
      ) : (
        <div style={s.card}>
          <p style={s.placeholder}>Brak uczestników w rankingu {monsterName}.</p>
        </div>
      )}

      <div style={s.card}>
        <h2 style={s.title}>Ranking Łowcy herosa {monsterName}</h2>
        <p style={{ ...s.searchHint, textAlign: 'center', marginBottom: 16 }}>Who is the real tracker?</p>
        {hunterLeaderboard.length > 0 ? (
          <>
            {!trimmed && (
              <Podium
                entries={hunterLeaderboard.slice(0, 3).map((e) => ({
                  nick: e.nick,
                  username: e.username,
                  avatarUrl: e.avatarUrl,
                  score: `${e.points} ptk`,
                  tone: 'points' as const,
                }))}
              />
            )}
            {filteredHunter.length > 0 ? (
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Pozycja</th>
                    <th style={s.th}>Nick</th>
                    <th style={s.th}>Grafika</th>
                    <th style={s.th}>Punkty</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHunter.map((e) => (
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
                      <td style={s.td}>
                        <AvatarCell url={e.avatarUrl} />
                      </td>
                      <td style={{ ...s.td, color: '#e67e22', fontWeight: 600 }}>{e.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={s.placeholder}>Brak wyników dla „{trimmed}” w rankingu łowcy.</p>
            )}
          </>
        ) : (
          <p style={s.placeholder}>Brak punktów łowcy dla tego herosa.</p>
        )}
      </div>
    </>
  );
}
