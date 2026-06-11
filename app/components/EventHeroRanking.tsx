'use client';

import { useMemo, useState } from 'react';

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
  link: { color: '#3498db', textDecoration: 'none' },
  placeholder: { color: '#888', fontSize: 15, padding: '24px 12px', textAlign: 'center' as const },
  title: { textAlign: 'center' as const, fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 16px' },
  podiumOuter: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    marginBottom: 28,
  },
  podiumWrap: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 0,
    minHeight: 220,
  },
  podiumFloor: {
    width: '100%',
    maxWidth: 480,
    height: 14,
    background: 'linear-gradient(180deg, #0f1629 0%, #1a2744 50%, #16213e 100%)',
    border: '1px solid #2a2a4a',
    borderTop: 'none',
    borderRadius: '0 0 10px 10px',
    marginTop: -1,
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
  },
  podiumBox: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: '14px 16px 18px',
    background: 'linear-gradient(180deg, #1e2a4a 0%, #16213e 40%, #0f1629 100%)',
    borderRadius: '12px 12px 0 0',
    border: '1px solid #2a2a4a',
    borderBottom: 'none',
    minWidth: 140,
    boxShadow: 'inset 0 2px 8px rgba(255,255,255,0.06), 0 -2px 12px rgba(0,0,0,0.3)',
  },
  podiumBoxContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    width: '100%',
    gap: 6,
  },
  podiumOutfitCenter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: 64,
    height: 96,
    margin: '4px 0',
  },
  podiumFirst: {
    order: 2,
    minHeight: 220,
    transform: 'scale(1.05)',
    borderColor: '#c9a227',
    background: 'linear-gradient(180deg, #2a3f5f 0%, #1a2744 35%, #0f1629 100%)',
    boxShadow: '0 0 20px rgba(201, 162, 39, 0.25), inset 0 2px 8px rgba(255,255,255,0.08)',
  },
  podiumSecond: { order: 3, minHeight: 200, borderColor: '#6b7280' },
  podiumThird: { order: 1, minHeight: 180, borderColor: '#92400e' },
  podiumAvatarWrap: {
    width: 32,
    height: 48,
    overflow: 'hidden' as const,
    position: 'relative' as const,
    transform: 'scale(2)',
    transformOrigin: 'center',
    borderRadius: 6,
    background: '#0f0f23',
    border: '2px solid #2a2a4a',
  },
  podiumAvatarImg: { position: 'absolute' as const, left: 0, top: 0, display: 'block' },
  podiumAvatarPlaceholder: {
    width: 32,
    height: 48,
    background: '#0f0f23',
    border: '2px solid #2a2a4a',
    borderRadius: 6,
  },
  podiumRank: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: '50%',
    fontSize: 14,
    fontWeight: 800,
    color: '#fff',
    marginBottom: 6,
    flexShrink: 0,
  },
  podiumRank1: { background: 'linear-gradient(135deg, #c9a227 0%, #a67c00 100%)', boxShadow: '0 2px 8px rgba(201, 162, 39, 0.4)' },
  podiumRank2: { background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)', boxShadow: '0 2px 8px rgba(107, 114, 128, 0.4)' },
  podiumRank3: { background: 'linear-gradient(135deg, #92400e 0%, #78350f 100%)', boxShadow: '0 2px 8px rgba(146, 64, 14, 0.4)' },
  podiumNick: { fontSize: 13, fontWeight: 700, color: '#e2b714', textAlign: 'center' as const, lineHeight: 1.25, flexShrink: 0, wordBreak: 'break-word' as const },
  podiumTime: { fontSize: 12, color: '#2ecc71', fontFamily: 'monospace', flexShrink: 0 },
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

function PodiumAvatar({ url }: { url: string | null }) {
  if (url) {
    return (
      <div style={s.podiumAvatarWrap}>
        <img src={url} alt="" style={s.podiumAvatarImg} />
      </div>
    );
  }
  return <div style={{ ...s.podiumAvatarPlaceholder, transform: 'scale(2)', transformOrigin: 'center' }} />;
}

function TimePodium({ entries }: { entries: RankingRow[] }) {
  const top3 = entries.slice(0, 3);
  const first = top3[0];
  const second = top3[1];
  const third = top3[2];
  if (!first) return null;

  return (
    <div style={s.podiumOuter}>
      <div style={s.podiumWrap}>
        {third && (
          <div style={{ ...s.podiumBox, ...s.podiumThird }}>
            <span style={{ ...s.podiumRank, ...s.podiumRank3 }}>3</span>
            <div style={s.podiumBoxContent}>
              <span style={s.podiumNick}>{third.nick || third.username}</span>
              <div style={s.podiumOutfitCenter}>
                <PodiumAvatar url={third.avatarUrl} />
              </div>
              <span style={s.podiumTime}>{third.totalTimeFormatted}</span>
            </div>
          </div>
        )}
        <div style={{ ...s.podiumBox, ...s.podiumFirst }}>
          <span style={{ ...s.podiumRank, ...s.podiumRank1 }}>1</span>
          <div style={s.podiumBoxContent}>
            <span style={s.podiumNick}>{first.nick || first.username}</span>
            <div style={s.podiumOutfitCenter}>
              <PodiumAvatar url={first.avatarUrl} />
            </div>
            <span style={s.podiumTime}>{first.totalTimeFormatted}</span>
          </div>
        </div>
        {second && (
          <div style={{ ...s.podiumBox, ...s.podiumSecond }}>
            <span style={{ ...s.podiumRank, ...s.podiumRank2 }}>2</span>
            <div style={s.podiumBoxContent}>
              <span style={s.podiumNick}>{second.nick || second.username}</span>
              <div style={s.podiumOutfitCenter}>
                <PodiumAvatar url={second.avatarUrl} />
              </div>
              <span style={s.podiumTime}>{second.totalTimeFormatted}</span>
            </div>
          </div>
        )}
      </div>
      <div style={s.podiumFloor} />
    </div>
  );
}

function HunterPodium({ entries }: { entries: HunterRow[] }) {
  const first = entries[0];
  const second = entries[1];
  const third = entries[2];
  if (!first) return null;

  return (
    <div style={s.podiumOuter}>
      <div style={s.podiumWrap}>
        {third && (
          <div style={{ ...s.podiumBox, ...s.podiumThird }}>
            <span style={{ ...s.podiumRank, ...s.podiumRank3 }}>3</span>
            <div style={s.podiumBoxContent}>
              <span style={s.podiumNick}>{third.nick || third.username}</span>
              <div style={s.podiumOutfitCenter}>
                <PodiumAvatar url={third.avatarUrl} />
              </div>
              <span style={{ ...s.podiumTime, color: '#e67e22' }}>{third.points} ptk</span>
            </div>
          </div>
        )}
        <div style={{ ...s.podiumBox, ...s.podiumFirst }}>
          <span style={{ ...s.podiumRank, ...s.podiumRank1 }}>1</span>
          <div style={s.podiumBoxContent}>
            <span style={s.podiumNick}>{first.nick || first.username}</span>
            <div style={s.podiumOutfitCenter}>
              <PodiumAvatar url={first.avatarUrl} />
            </div>
            <span style={{ ...s.podiumTime, color: '#e67e22' }}>{first.points} ptk</span>
          </div>
        </div>
        {second && (
          <div style={{ ...s.podiumBox, ...s.podiumSecond }}>
            <span style={{ ...s.podiumRank, ...s.podiumRank2 }}>2</span>
            <div style={s.podiumBoxContent}>
              <span style={s.podiumNick}>{second.nick || second.username}</span>
              <div style={s.podiumOutfitCenter}>
                <PodiumAvatar url={second.avatarUrl} />
              </div>
              <span style={{ ...s.podiumTime, color: '#e67e22' }}>{second.points} ptk</span>
            </div>
          </div>
        )}
      </div>
      <div style={s.podiumFloor} />
    </div>
  );
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
          {!trimmed && <TimePodium entries={leaderboard} />}
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
            {!trimmed && <HunterPodium entries={hunterLeaderboard} />}
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
