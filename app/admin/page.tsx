'use client';

import { useState, useEffect } from 'react';

type MonsterStatus = {
  key: string;
  label: string;
  monsterName: string;
  hasActivePhase: boolean;
  startedAt: string | null;
  phaseName: string | null;
};

const s: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '32px 24px',
    fontFamily: 'system-ui, sans-serif',
  },
  title: {
    fontSize: 26,
    margin: '0 0 8px',
    color: '#fff',
  },
  sub: {
    color: '#8892b0',
    fontSize: 14,
    margin: '0 0 24px',
    lineHeight: 1.5,
  },
  card: {
    background: '#16213e',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    border: '1px solid #2a2a4a',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr 1fr',
    gap: 16,
    padding: '12px 16px',
    background: '#0f0f23',
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 12,
    fontWeight: 700,
    color: '#8892b0',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr 1fr',
    gap: 16,
    alignItems: 'center',
    padding: '16px',
    background: '#1a1a2e',
    borderRadius: 8,
    marginBottom: 8,
    border: '1px solid #2a2a4a',
  },
  label: {
    fontWeight: 700,
    color: '#e2b714',
    fontSize: 16,
  },
  status: {
    fontSize: 13,
    color: '#8892b0',
  },
  statusActive: {
    color: '#2ecc71',
    fontWeight: 600,
  },
  actions: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  btn: {
    padding: '10px 18px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  btnStart: {
    background: '#27ae60',
    color: '#fff',
  },
  btnEnd: {
    background: '#e67e22',
    color: '#fff',
  },
  btnDisabled: {
    background: '#333',
    color: '#666',
    cursor: 'not-allowed',
    opacity: 0.8,
  },
  forbidden: {
    textAlign: 'center',
    padding: 48,
    color: '#e74c3c',
    fontSize: 16,
  },
  empty: {
    textAlign: 'center',
    padding: 32,
    color: '#8892b0',
    fontSize: 14,
  },
  refreshBtn: {
    marginTop: 16,
    padding: '10px 20px',
    background: '#3498db',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
  },
};

export default function AdminPage() {
  const [monsters, setMonsters] = useState<MonsterStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/phase-status');
      if (res.status === 403 || res.status === 401) {
        setForbidden(true);
        setMonsters([]);
        return;
      }
      if (!res.ok) throw new Error('Błąd ładowania');
      const data = await res.json();
      setMonsters(data.monsters || []);
    } catch {
      setMonsters([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function startPhase(monsterName: string) {
    setActing(monsterName);
    try {
      const res = await fetch('/api/admin/start-phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monsterName }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Błąd uruchomienia fazy');
        return;
      }
      await load();
    } catch (e) {
      alert('Błąd: ' + e);
    } finally {
      setActing(null);
    }
  }

  async function endPhase(monsterName: string) {
    if (!confirm(`Zakończyć fazę dla ${monsterName}? Sesje zostaną zliczone do rankingu.`)) {
      return;
    }
    setActing(monsterName);
    try {
      const res = await fetch('/api/admin/end-phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monsterName }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Błąd zakończenia fazy');
        return;
      }
      await load();
    } catch (e) {
      alert('Błąd: ' + e);
    } finally {
      setActing(null);
    }
  }

  if (loading) {
    return (
      <div style={s.container}>
        <p style={{ color: '#888' }}>Ładowanie…</p>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div style={s.container}>
        <div style={s.card}>
          <p style={s.forbidden}>Brak dostępu. Tylko administrator może zarządzać fazami.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <h1 style={s.title}>Panel admina — Fazy</h1>
      <p style={s.sub}>
        Kliknij <strong>„Uruchom fazę”</strong> przy wybranym tytanie — od tego momentu sesje z Tampermonkey
        (dla map przypisanych do tego tytana) będą zapisywane do tej fazy. <strong>„Zakończ fazę”</strong> kończy
        zbieranie i zamyka fazę w rankingu. Może być aktywnych kilka faz jednocześnie (po jednej na tytana).
      </p>

      <div style={s.card}>
        <div style={s.tableHeader}>
          <span>Tytan</span>
          <span>Status</span>
          <span>Akcje</span>
        </div>

        {monsters.length === 0 ? (
          <div style={s.empty}>
            Nie załadowano listy tytanów.
            <br />
            <button type="button" style={s.refreshBtn} onClick={() => load()}>
              Odśwież
            </button>
          </div>
        ) : (
          monsters.map((m) => (
            <div key={m.key} style={s.row}>
              <span style={s.label}>{m.label}</span>
              <div style={{ ...s.status, ...(m.hasActivePhase ? s.statusActive : {}) }}>
                {m.hasActivePhase
                  ? `Aktywna od ${m.startedAt ? new Date(m.startedAt).toLocaleString('pl-PL') : '—'} (${m.phaseName ?? ''})`
                  : 'Brak aktywnej fazy'}
              </div>
              <div style={s.actions}>
                <button
                  type="button"
                  style={{
                    ...s.btn,
                    ...s.btnStart,
                    ...(m.hasActivePhase || acting ? s.btnDisabled : {}),
                  }}
                  disabled={m.hasActivePhase || !!acting}
                  onClick={() => startPhase(m.monsterName)}
                  title="Uruchom zbieranie sesji dla tego tytana"
                >
                  {acting === m.monsterName ? '…' : 'Uruchom fazę'}
                </button>
                <button
                  type="button"
                  style={{
                    ...s.btn,
                    ...s.btnEnd,
                    ...(!m.hasActivePhase || acting ? s.btnDisabled : {}),
                  }}
                  disabled={!m.hasActivePhase || !!acting}
                  onClick={() => endPhase(m.monsterName)}
                  title="Zakończ fazę i zlicz ranking"
                >
                  {acting === m.monsterName ? '…' : 'Zakończ fazę'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
