'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/components/AuthContext';

type InvitationCodeRow = {
  id: string;
  code: string;
  usedAt: string | null;
  createdAt: string;
};

const s: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 700,
    margin: '0 auto',
    padding: '32px 24px',
    fontFamily: 'system-ui, sans-serif',
  },
  title: { fontSize: 26, margin: '0 0 8px', color: '#fff' },
  sub: { color: '#8892b0', fontSize: 14, margin: '0 0 24px', lineHeight: 1.5 },
  card: {
    background: '#16213e',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    border: '1px solid #2a2a4a',
  },
  btn: {
    padding: '12px 20px',
    background: 'linear-gradient(135deg, #e67e22, #f39c12)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  newCode: {
    marginTop: 16,
    padding: 16,
    background: '#1a1a2e',
    borderRadius: 8,
    border: '1px solid #2ecc71',
    color: '#2ecc71',
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textAlign: 'center' as const,
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 12,
    padding: '12px 16px',
    background: '#0f0f23',
    borderRadius: 8,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: 700,
    color: '#8892b0',
    textTransform: 'uppercase',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 12,
    alignItems: 'center',
    padding: '12px 16px',
    background: '#1a1a2e',
    borderRadius: 8,
    marginBottom: 6,
    border: '1px solid #2a2a4a',
    fontSize: 14,
    color: '#b8c5d6',
  },
  used: { color: '#e74c3c' },
  active: { color: '#2ecc71' },
  forbidden: { textAlign: 'center' as const, padding: 48, color: '#e74c3c', fontSize: 16 },
  empty: { textAlign: 'center' as const, padding: 24, color: '#8892b0', fontSize: 14 },
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('pl-PL');
  } catch {
    return iso;
  }
}

export default function AdminPanelPage() {
  const { user } = useAuth();
  const [codes, setCodes] = useState<InvitationCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const loadCodes = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/invitation-codes');
      if (res.status === 403 || res.status === 401) {
        setForbidden(true);
        setCodes([]);
        return;
      }
      if (!res.ok) throw new Error('Błąd ładowania');
      const data = await res.json();
      setCodes(data.codes ?? []);
    } catch {
      setCodes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCodes();
  }, [loadCodes]);

  async function handleGenerate() {
    setGenerating(true);
    setNewCode(null);
    try {
      const res = await fetch('/api/admin/invitation-codes', { method: 'POST' });
      if (res.status === 403 || res.status === 401) {
        setForbidden(true);
        return;
      }
      if (!res.ok) throw new Error('Błąd');
      const data = await res.json();
      setNewCode(data.code);
      await loadCodes();
    } catch {
      setNewCode(null);
    } finally {
      setGenerating(false);
    }
  }

  if (!user) {
    return (
      <div style={s.container}>
        <div style={s.card}>
          <p style={s.empty}>Ładowanie…</p>
        </div>
      </div>
    );
  }

  if (forbidden || user.role !== 'admin') {
    return (
      <div style={s.container}>
        <div style={s.card}>
          <p style={s.forbidden}>Brak dostępu. Tylko administrator może generować kody zaproszenia.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <h1 style={s.title}>Admin Panel — Kody zaproszenia</h1>
      <p style={s.sub}>
        Wygenerowany kod jednorazowego użytku użytkownik wpisuje w polu „Kod zaproszenia” przy rejestracji. Po udanej rejestracji kod zostaje zdezaktywowany.
      </p>

      <div style={s.card}>
        <button
          type="button"
          style={{ ...s.btn, ...(generating ? s.btnDisabled : {}) }}
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? 'Generowanie…' : 'Wygeneruj nowy kod'}
        </button>
        {newCode && (
          <div style={s.newCode}>
            Skopiuj i przekaż użytkownikowi: <strong>{newCode}</strong>
          </div>
        )}

        <h2 style={{ fontSize: 16, margin: '24px 0 12px', color: '#b8c5d6' }}>Ostatnie kody</h2>
        {loading ? (
          <p style={s.empty}>Ładowanie…</p>
        ) : codes.length === 0 ? (
          <p style={s.empty}>Brak wygenerowanych kodów.</p>
        ) : (
          <>
            <div style={s.tableHeader}>
              <span>Kod</span>
              <span>Utworzono</span>
              <span>Status</span>
            </div>
            {codes.map((row) => (
              <div key={row.id} style={s.row}>
                <span style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>{row.code}</span>
                <span>{formatDate(row.createdAt)}</span>
                <span style={row.usedAt ? s.used : s.active}>
                  {row.usedAt ? `Wykorzystany ${formatDate(row.usedAt)}` : 'Aktywny'}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
