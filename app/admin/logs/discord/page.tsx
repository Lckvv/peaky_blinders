'use client';

import { useState, useEffect } from 'react';

type LogRow = {
  id: string;
  createdAt: string;
  username: string;
  senderNick: string;
  heroNick: string;
  mapName: string;
  lvl: number | null;
  x: number | null;
  y: number | null;
};

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 1000, margin: '0 auto', padding: '32px 24px', fontFamily: 'system-ui, sans-serif' },
  title: { fontSize: 26, margin: '0 0 8px', color: '#fff' },
  sub: { color: '#8892b0', fontSize: 14, margin: '0 0 24px' },
  card: { background: '#16213e', borderRadius: 12, padding: 24, border: '1px solid #2a2a4a', overflowX: 'auto' as const },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: {
    textAlign: 'left',
    padding: '12px 10px',
    background: '#0f0f23',
    color: '#8892b0',
    fontWeight: 600,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  td: { padding: '10px', borderBottom: '1px solid #2a2a4a', color: '#b8c5d6' },
  empty: { textAlign: 'center' as const, padding: 32, color: '#8892b0' },
  loading: { textAlign: 'center' as const, padding: 24, color: '#8892b0' },
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('pl-PL');
  } catch {
    return iso;
  }
}

export default function LogsDiscordPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/hero-alert-logs?limit=200&offset=0', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setLogs(data.logs ?? []);
          setTotal(data.total ?? 0);
        }
      } catch {
        if (!cancelled) setLogs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={s.container}>
      <h1 style={s.title}>Logs Discord</h1>
      <p style={s.sub}>
        Kto i co wysłał na kanał Discord (powiadomienia o herosie / evencie / tytanie — przycisk „Powiadom klan na Discordzie”).
      </p>
      <div style={s.card}>
        {loading ? (
          <p style={s.loading}>Ładowanie…</p>
        ) : logs.length === 0 ? (
          <p style={s.empty}>Brak logów.</p>
        ) : (
          <>
            <p style={{ margin: '0 0 12px', color: '#8892b0', fontSize: 13 }}>Ostatnie {logs.length} z {total}</p>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Data</th>
                  <th style={s.th}>Kto (konto)</th>
                  <th style={s.th}>Postać (kto wysłał)</th>
                  <th style={s.th}>Heros / Tytan</th>
                  <th style={s.th}>Mapa</th>
                  <th style={s.th}>Lvl</th>
                  <th style={s.th}>X, Y</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => (
                  <tr key={row.id}>
                    <td style={s.td}>{formatDate(row.createdAt)}</td>
                    <td style={s.td}>{row.username}</td>
                    <td style={s.td}>{row.senderNick || '—'}</td>
                    <td style={s.td}>{row.heroNick}</td>
                    <td style={s.td}>{row.mapName}</td>
                    <td style={s.td}>{row.lvl != null ? row.lvl : '—'}</td>
                    <td style={s.td}>
                      {row.x != null && row.y != null ? `${row.x}, ${row.y}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
