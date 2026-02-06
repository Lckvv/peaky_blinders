'use client';

import { useState, useEffect } from 'react';

export default function LeaderboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonster, setSelectedMonster] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
    loadLeaderboard();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/api-key');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (e) {}
  }

  async function loadLeaderboard(monster?: string) {
    setLoading(true);
    try {
      const url = monster 
        ? `/api/leaderboard/phases?monster=${encodeURIComponent(monster)}`
        : '/api/leaderboard/phases';
      const res = await fetch(url);
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

  async function handleEndPhase(monsterName: string) {
    if (!confirm(`Czy na pewno chcesz zakończyć fazę dla ${monsterName}?`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/end-phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monsterName }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Błąd');
        return;
      }

      alert('Faza zakończona pomyślnie!');
      loadLeaderboard(monsterName);
    } catch (e) {
      alert('Błąd: ' + e);
    }
  }

  if (loading) {
    return (
      <div style={s.container}>
        <p style={{ color: '#888' }}>Ładowanie...</p>
      </div>
    );
  }

  const monsters = data?.monsters || (data ? [data] : []);

  return (
    <div style={s.container}>
      <h1 style={s.title}>🏆 Rankingi</h1>

      {monsters.length === 0 ? (
        <div style={s.card}>
          <p style={{ color: '#888' }}>Brak danych</p>
        </div>
      ) : (
        monsters.map((monsterData: any) => {
          const { monster, activePhase, phases } = monsterData;
          const allPhases = activePhase ? [activePhase, ...phases] : phases;

          return (
            <div key={monster.id} style={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h2 style={s.h2}>{monster.name}</h2>
                  <p style={{ color: '#888', fontSize: 12, margin: 0 }}>{monster.mapName}</p>
                </div>
                {user?.role === 'admin' && (
                  <button
                    onClick={() => handleEndPhase(monster.name)}
                    style={s.btnEndPhase}
                  >
                    Zakończ fazę
                  </button>
                )}
              </div>

              {allPhases.length === 0 ? (
                <p style={{ color: '#888', fontSize: 13 }}>Brak faz</p>
              ) : (
                <div style={s.tabs}>
                  {allPhases.map((phase: any, idx: number) => (
                    <button
                      key={phase.name}
                      style={{
                        ...s.tab,
                        ...(selectedMonster === null && idx === 0 ? s.tabOn : {}),
                        ...(selectedMonster === phase.name ? s.tabOn : {}),
                      }}
                      onClick={() => setSelectedMonster(selectedMonster === phase.name ? null : phase.name)}
                    >
                      {phase.name}
                    </button>
                  ))}
                </div>
              )}

              {allPhases.map((phase: any) => {
                const isActive = selectedMonster === null && phase === allPhases[0];
                const isSelected = selectedMonster === phase.name;
                
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
            </div>
          );
        })
      )}
    </div>
  );
}

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
};

