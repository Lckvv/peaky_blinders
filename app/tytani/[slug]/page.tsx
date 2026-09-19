'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Podium from '@/app/components/Podium';
import { titanBySlug } from '@/lib/titans';

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
  title: { textAlign: 'center' as const, fontSize: 32, fontWeight: 700, color: '#fff8e7', margin: 0, fontFamily: 'var(--font-cinzel), Georgia, serif' },
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
  const titan = titanBySlug(slug);
  const monsterName = titan?.monsterName;
  const displayName = titan?.label;

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
        <h1 style={s.title}>Ranking {displayName}</h1>
        <div style={s.card}>
          <p style={s.placeholder}>Brak danych rankingu.</p>
        </div>
      </div>
    );
  }

  const { phases, leaderboard } = data;

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
          <h1 style={s.title}>Ranking {displayName}</h1>
        </div>
        <div style={s.headerRowRight} />
      </div>

      <div style={s.layout}>
        <div style={s.main}>
          {leaderboard.length > 0 && (
            <>
              <Podium
                entries={leaderboard.slice(0, 3).map((e) => ({
                  nick: e.nick,
                  username: e.username,
                  avatarUrl: e.avatarUrl,
                  score: e.totalTimeFormatted,
                }))}
              />

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
