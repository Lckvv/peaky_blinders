'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

const SLUG_TO_NAME: Record<string, string> = {
  orla: 'Orla',
  kic: 'Kic',
  renegat: 'Renegat',
  arcy: 'Arcy',
  zoons: 'Zoons',
  lowczyni: 'Łowczyni',
  przyzywacz: 'Przyzywacz',
  magua: 'Magua',
  teza: 'Teza',
  barbatos: 'Barbatos',
  tanroth: 'Tanroth',
};

type PhaseOption = { id: string; name: string; label: string; isActive: boolean };
type Entry = {
  rank: number;
  userId: string;
  username: string;
  nick: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
  heroName: string;
  totalTime: number;
  totalTimeFormatted: string;
  totalSessions: number;
};

const s: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 1000, margin: '0 auto', padding: '24px 20px', fontFamily: 'system-ui, sans-serif' },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 24,
    flexWrap: 'wrap' as const,
  },
  headerRowLeft: { flex: '0 0 auto', minWidth: 220 },
  headerRowCenter: { flex: '1 1 auto', display: 'flex', justifyContent: 'center', minWidth: 0 },
  headerRowRight: { flex: '0 0 220px', minWidth: 0 },
  title: { textAlign: 'center' as const, fontSize: 32, fontWeight: 700, color: '#fff', margin: 0 },
  dropdownLabel: { fontSize: 12, color: '#8892b0', marginBottom: 6, fontWeight: 600 },
  dropdown: {
    width: '100%',
    minWidth: 200,
    padding: '10px 12px',
    background: '#1a1a2e',
    border: '1px solid #2a2a4a',
    borderRadius: 8,
    color: '#eee',
    fontSize: 14,
    cursor: 'pointer',
  },
  layout: { display: 'block' },
  main: { width: '100%' },
  /* Podium: lewo = 3. miejsce (najniższe), środek = 1. (najwyższe), prawo = 2. (średnie) */
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
  podiumSecond: {
    order: 3,
    minHeight: 200,
    borderColor: '#6b7280',
  },
  podiumThird: {
    order: 1,
    minHeight: 180,
    borderColor: '#92400e',
  },
  /* Fragment 32×48 px (lew górny róg GIF – pierwsza postawa frontowa) */
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
  podiumAvatarImg: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    display: 'block',
  },
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
  card: { background: '#16213e', borderRadius: 12, padding: 20, marginBottom: 16, border: '1px solid #2a2a4a' },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  th: { textAlign: 'left' as const, padding: '10px 12px', background: '#0f0f23', color: '#8892b0', fontWeight: 600, fontSize: 11 },
  td: { padding: '10px 12px', borderBottom: '1px solid #2a2a4a', color: '#ccc' },
  link: { color: '#3498db', textDecoration: 'none' },
  linkHover: { textDecoration: 'underline' },
  placeholder: { color: '#888', fontSize: 15, padding: '40px 20px', textAlign: 'center' as const },
};

export default function TytanPage() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const monsterName = SLUG_TO_NAME[slug.toLowerCase()];

  const [data, setData] = useState<{
    monster: { name: string };
    phases: PhaseOption[];
    leaderboard: Entry[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('');
  const initialDefaultAppliedRef = useRef(false);

  useEffect(() => {
    if (!monsterName) {
      setLoading(false);
      return;
    }
    initialDefaultAppliedRef.current = false;
    setSelectedPhaseId('');
    loadRanking(monsterName, null);
  }, [monsterName]);

  // Tylko przy pierwszym załadowaniu: jeśli jest aktywna faza, ustaw ją zamiast "łącznie"
  useEffect(() => {
    if (!data || !monsterName || initialDefaultAppliedRef.current) return;
    const active = data.phases?.find((p: PhaseOption) => p.isActive);
    if (active) {
      setSelectedPhaseId(active.id);
      loadRanking(monsterName, active.id);
    }
    initialDefaultAppliedRef.current = true;
  }, [data, monsterName]);

  async function loadRanking(monster: string, phaseId: string | null) {
    setLoading(true);
    try {
      const url = phaseId
        ? `/api/leaderboard/ranking?monster=${encodeURIComponent(monster)}&phaseId=${encodeURIComponent(phaseId)}`
        : `/api/leaderboard/ranking?monster=${encodeURIComponent(monster)}`;
      const res = await fetch(url);
      if (res.ok) {
        const result = await res.json();
        setData(result);
        setSelectedPhaseId(phaseId ?? '');
      } else {
        setData(null);
      }
    } catch (e) {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  function onPhaseChange(phaseId: string) {
    setSelectedPhaseId(phaseId);
    if (!monsterName) return;
    if (phaseId === '') {
      loadRanking(monsterName, null);
    } else {
      loadRanking(monsterName, phaseId);
    }
  }

  if (!monsterName) {
    return (
      <div style={s.wrap}>
        <h1 style={s.title}>Nieznany tytan</h1>
        <p style={s.placeholder}>Nie znaleziono strony.</p>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div style={s.wrap}>
        <p style={{ color: '#888' }}>Ładowanie...</p>
      </div>
    );
  }

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

  const { monster, phases, leaderboard } = data;
  const top3 = leaderboard.slice(0, 3);
  const second = top3[1];
  const first = top3[0];
  const third = top3[2];

  return (
    <div style={s.wrap}>
      <div style={s.headerRow}>
        <div style={s.headerRowLeft}>
          <div style={s.dropdownLabel}>Faza</div>
          <select
            style={s.dropdown}
            value={selectedPhaseId}
            onChange={(e) => onPhaseChange(e.target.value)}
          >
            <option value="">Łącznie (wszystkie fazy)</option>
            {phases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div style={s.headerRowCenter}>
          <h1 style={s.title}>Ranking {monster.name}</h1>
        </div>
        <div style={s.headerRowRight} />
      </div>

      <div style={s.layout}>
        <div style={s.main}>
          {leaderboard.length > 0 && (
            <>
              <div style={s.podiumOuter}>
                <div style={s.podiumWrap}>
                  {third && (
                    <div style={{ ...s.podiumBox, ...s.podiumThird }}>
                      <span style={{ ...s.podiumRank, ...s.podiumRank3 }}>3</span>
                      <div style={s.podiumBoxContent}>
                        <span style={s.podiumNick}>{third.nick || third.username}</span>
                        <div style={s.podiumOutfitCenter}>
                          {third.avatarUrl ? (
                            <div style={s.podiumAvatarWrap}>
                              <img src={third.avatarUrl} alt="" style={s.podiumAvatarImg} />
                            </div>
                          ) : (
                            <div style={{ ...s.podiumAvatarPlaceholder, transform: 'scale(2)', transformOrigin: 'center' }} />
                          )}
                        </div>
                        <span style={s.podiumTime}>{third.totalTimeFormatted}</span>
                      </div>
                    </div>
                  )}
                  {first && (
                    <div style={{ ...s.podiumBox, ...s.podiumFirst }}>
                      <span style={{ ...s.podiumRank, ...s.podiumRank1 }}>1</span>
                      <div style={s.podiumBoxContent}>
                        <span style={s.podiumNick}>{first.nick || first.username}</span>
                        <div style={s.podiumOutfitCenter}>
                          {first.avatarUrl ? (
                            <div style={s.podiumAvatarWrap}>
                              <img src={first.avatarUrl} alt="" style={s.podiumAvatarImg} />
                            </div>
                          ) : (
                            <div style={{ ...s.podiumAvatarPlaceholder, transform: 'scale(2)', transformOrigin: 'center' }} />
                          )}
                        </div>
                        <span style={s.podiumTime}>{first.totalTimeFormatted}</span>
                      </div>
                    </div>
                  )}
                  {second && (
                    <div style={{ ...s.podiumBox, ...s.podiumSecond }}>
                      <span style={{ ...s.podiumRank, ...s.podiumRank2 }}>2</span>
                      <div style={s.podiumBoxContent}>
                        <span style={s.podiumNick}>{second.nick || second.username}</span>
                        <div style={s.podiumOutfitCenter}>
                          {second.avatarUrl ? (
                            <div style={s.podiumAvatarWrap}>
                              <img src={second.avatarUrl} alt="" style={s.podiumAvatarImg} />
                            </div>
                          ) : (
                            <div style={{ ...s.podiumAvatarPlaceholder, transform: 'scale(2)', transformOrigin: 'center' }} />
                          )}
                        </div>
                        <span style={s.podiumTime}>{second.totalTimeFormatted}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div style={s.podiumFloor} />
              </div>

              <div style={s.card}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Pozycja</th>
                      <th style={s.th}>Nick</th>
                      <th style={s.th}>Postać</th>
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
                            <a
                              href={e.profileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={s.link}
                            >
                              {e.nick || e.username}
                            </a>
                          ) : (
                            <span>{e.nick || e.username}</span>
                          )}
                        </td>
                        <td style={s.td}>{e.heroName}</td>
                        <td style={{ ...s.td, fontFamily: 'monospace', color: '#2ecc71' }}>
                          {e.totalTimeFormatted}
                        </td>
                        <td style={s.td}>{e.totalSessions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {leaderboard.length === 0 && (
            <div style={s.card}>
              <p style={s.placeholder}>Brak uczestników w tym rankingu.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
