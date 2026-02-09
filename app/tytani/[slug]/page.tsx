'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

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

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 900, margin: '0 auto', padding: '32px 16px', fontFamily: 'system-ui, sans-serif' },
  title: { fontSize: 28, margin: '0 0 24px', color: '#fff' },
  card: { background: '#1a1a2e', borderRadius: 12, padding: 20, marginBottom: 16 },
  h2: { fontSize: 18, margin: '0 0 4px', color: '#eee' },
  tabs: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' as const },
  tab: { padding: '8px 16px', background: '#0f0f23', color: '#888', border: '1px solid #333', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  tabOn: { background: '#16213e', color: '#fff', borderColor: '#3498db' },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  th: { textAlign: 'left' as const, padding: '8px 12px', background: '#0f0f23', color: '#aaa', fontSize: 11, fontWeight: 'bold' },
  td: { padding: '10px 12px', borderBottom: '1px solid #ffffff08', color: '#ccc' },
  btnEndPhase: { padding: '8px 16px', background: '#e67e22', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' },
  placeholder: { color: '#888', fontSize: 15, padding: '40px 20px', textAlign: 'center' as const },
};

export default function TytanPage() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const monsterName = SLUG_TO_NAME[slug.toLowerCase()];

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const isKic = slug.toLowerCase() === 'kic';

  useEffect(() => {
    if (!monsterName) {
      setLoading(false);
      return;
    }
    checkAuth();
    if (isKic) {
      loadLeaderboard(monsterName);
    } else {
      setLoading(false);
    }
  }, [slug, monsterName, isKic]);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/api-key');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (e) {}
  }

  async function loadLeaderboard(monster: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard/phases?monster=${encodeURIComponent(monster)}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (e) {
      console.error('Error loading leaderboard:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleEndPhase(name: string) {
    if (!confirm(`Czy na pewno chcesz zakończyć fazę dla ${name}?`)) return;
    try {
      const res = await fetch('/api/admin/end-phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monsterName: name }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Błąd');
        return;
      }
      alert('Faza zakończona pomyślnie!');
      loadLeaderboard(name);
    } catch (e) {
      alert('Błąd: ' + e);
    }
  }

  if (!monsterName) {
    return (
      <div style={s.container}>
        <h1 style={s.title}>Nieznany tytan</h1>
        <p style={s.placeholder}>Nie znaleziono strony dla tego tytana.</p>
      </div>
    );
  }

  if (!isKic) {
    return (
      <div style={s.container}>
        <h1 style={s.title}>{monsterName}</h1>
        <div style={s.card}>
          <p style={s.placeholder}>Strona w przygotowaniu. Wkrótce pojawią się tu rankingi i informacje.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={s.container}>
        <p style={{ color: '#888' }}>Ładowanie...</p>
      </div>
    );
  }

  const monsterData = data?.monster ? data : null;
  if (!monsterData) {
    return (
      <div style={s.container}>
        <h1 style={s.title}>Kic</h1>
        <div style={s.card}>
          <p style={s.placeholder}>Brak danych rankingu.</p>
        </div>
      </div>
    );
  }

  const { monster, activePhase, phases } = monsterData;
  const allPhases = activePhase ? [activePhase, ...phases] : phases;

  return (
    <div style={s.container}>
      <h1 style={s.title}>{monster.name}</h1>

      <div style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={s.h2}>{monster.name}</h2>
            <p style={{ color: '#888', fontSize: 12, margin: 0 }}>{monster.mapName}</p>
          </div>
          {user?.role === 'admin' && (
            <button onClick={() => handleEndPhase(monster.name)} style={s.btnEndPhase}>
              Zakończ fazę
            </button>
          )}
        </div>

        {allPhases.length === 0 ? (
          <p style={{ color: '#888', fontSize: 13 }}>Brak faz</p>
        ) : (
          <>
            <div style={s.tabs}>
              {allPhases.map((phase: any, idx: number) => (
                <button
                  key={phase.name}
                  style={{
                    ...s.tab,
                    ...(selectedPhase === null && idx === 0 ? s.tabOn : {}),
                    ...(selectedPhase === phase.name ? s.tabOn : {}),
                  }}
                  onClick={() => setSelectedPhase(selectedPhase === phase.name ? null : phase.name)}
                >
                  {phase.name}
                </button>
              ))}
            </div>

            {allPhases.map((phase: any) => {
              const isActive = selectedPhase === null && phase === allPhases[0];
              const isSelected = selectedPhase === phase.name;
              if (!isActive && !isSelected) return null;

              return (
                <div key={phase.name} style={{ marginTop: 16 }}>
                  <h3 style={{ fontSize: 14, color: '#e2b714', marginBottom: 12 }}>
                    {phase.name} {phase.phaseNumber === 0 && '(Aktywna)'}
                  </h3>
                  {phase.leaderboard && phase.leaderboard.length > 0 ? (
                    <table style={s.table}>
                      <thead>
                        <tr>
                          <th style={s.th}>#</th>
                          <th style={s.th}>Gracz</th>
                          <th style={s.th}>Nick</th>
                          <th style={s.th}>Czas</th>
                          <th style={s.th}>Sesje</th>
                        </tr>
                      </thead>
                      <tbody>
                        {phase.leaderboard.map((entry: any) => (
                          <tr key={entry.userId}>
                            <td style={s.td}>{entry.rank}</td>
                            <td style={s.td}>{entry.username}</td>
                            <td style={s.td}>{entry.nick || '-'}</td>
                            <td style={{ ...s.td, fontFamily: 'monospace', color: '#2ecc71' }}>
                              {entry.totalTimeFormatted}
                            </td>
                            <td style={s.td}>{entry.totalSessions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ color: '#888', fontSize: 13 }}>Brak danych</p>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
