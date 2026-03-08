'use client';

import { useState, useEffect } from 'react';

type LogRow = {
  id: string;
  createdAt: string;
  username: string;
  author: string;
  receiver: string;
  text: string;
  messageTime: string | null;
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
  td: { padding: '10px', borderBottom: '1px solid #2a2a4a', color: '#b8c5d6', maxWidth: 320 },
  empty: { textAlign: 'center' as const, padding: 32, color: '#8892b0' },
  loading: { textAlign: 'center' as const, padding: 24, color: '#8892b0' },
  btnDeleteAll: {
    padding: '8px 16px',
    background: 'rgba(231, 76, 60, 0.2)',
    color: '#e74c3c',
    border: '1px solid rgba(231, 76, 60, 0.5)',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: 16,
  },
  btnRowDelete: {
    padding: '4px 8px',
    background: 'transparent',
    color: '#8892b0',
    border: 'none',
    borderRadius: 6,
    fontSize: 16,
    cursor: 'pointer',
    lineHeight: 1,
  },
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('pl-PL');
  } catch {
    return iso;
  }
}

export default function LogsChatPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/chat-logs?limit=200&offset=0', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleDeleteAll = async () => {
    if (!confirm('Usunąć wszystkie logi czatu? Tej operacji nie można cofnąć.')) return;
    setDeletingAll(true);
    try {
      const res = await fetch('/api/admin/chat-logs', { method: 'DELETE', credentials: 'include' });
      if (res.ok) await loadLogs();
    } finally {
      setDeletingAll(false);
    }
  };

  const handleDeleteOne = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/chat-logs/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setLogs((prev) => prev.filter((r) => r.id !== id));
        setTotal((prev) => Math.max(0, prev - 1));
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={s.container}>
      <style>{`.chat-log-row-delete:hover { color: #e74c3c !important; background: rgba(231, 76, 60, 0.15) !important; }`}</style>
      <h1 style={s.title}>Logs Chat</h1>
      <p style={s.sub}>
        Wiadomości prywatne z czatu (kto wysłał, do kogo, treść, godzina z czatu, data zapisu). Tylko Super Admin.
      </p>
      <div style={s.card}>
        {loading ? (
          <p style={s.loading}>Ładowanie…</p>
        ) : logs.length === 0 ? (
          <p style={s.empty}>Brak logów.</p>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <p style={{ margin: 0, color: '#8892b0', fontSize: 13 }}>Ostatnie {logs.length} z {total}</p>
              <button
                type="button"
                style={s.btnDeleteAll}
                onClick={handleDeleteAll}
                disabled={deletingAll || total === 0}
              >
                {deletingAll ? 'Usuwanie…' : 'Usuń wszystko'}
              </button>
            </div>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={{ ...s.th, width: 40 }}></th>
                  <th style={s.th}>Data zapisu</th>
                  <th style={s.th}>Konto (skrypt)</th>
                  <th style={s.th}>Od (autor)</th>
                  <th style={s.th}>Do (receiver)</th>
                  <th style={s.th}>Godz. (czat)</th>
                  <th style={s.th}>Wiadomość</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => (
                  <tr key={row.id}>
                    <td style={s.td}>
                      <button
                        type="button"
                        className="chat-log-row-delete"
                        style={s.btnRowDelete}
                        onClick={() => handleDeleteOne(row.id)}
                        disabled={deletingId === row.id}
                        title="Usuń"
                        aria-label="Usuń"
                      >
                        ×
                      </button>
                    </td>
                    <td style={s.td}>{formatDate(row.createdAt)}</td>
                    <td style={s.td}>{row.username}</td>
                    <td style={s.td}>{row.author}</td>
                    <td style={s.td}>{row.receiver || '—'}</td>
                    <td style={s.td}>{row.messageTime || '—'}</td>
                    <td style={s.td}>{row.text}</td>
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
