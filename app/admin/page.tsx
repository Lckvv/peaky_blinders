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
    maxWidth: 720,
    margin: '0 auto',
    padding: '32px 24px',
    fontFamily: 'system-ui, sans-serif',
  },
  title: {
    fontSize: 24,
    margin: '0 0 8px',
    color: '#fff',
  },
  sub: {
    color: '#8892b0',
    fontSize: 14,
    margin: '0 0 24px',
  },
  card: {
    background: '#16213e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    border: '1px solid #2a2a4a',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    padding: '14px 16px',
    background: '#1a1a2e',
    borderRadius: 8,
    marginBottom: 8,
    border: '1px solid #2a2a4a',
  },
  label: {
    fontWeight: 600,
    color: '#e2b714',
    fontSize: 15,
  },
  status: {
    fontSize: 13,
    color: '#8892b0',
  },
  statusActive: {
    color: '#2ecc71',
    fontWeight: 600,
  },
  btn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
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
    background: '#444',
    color: '#888',
    cursor: 'not-allowed',
  },
  forbidden: {
    textAlign: 'center',
    padding: 48,
    color: '#e74c3c',
    fontSize: 16,
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
        Uruchamiaj i kończ fazy dla tytanów. Faza trwa od momentu uruchomienia do ręcznego zakończenia.
        Może być aktywnych kilka faz jednocześnie (po jednej na tytana).
      </p>

      <div style={s.card}>
        {monsters.map((m) => (
          <div key={m.key} style={s.row}>
            <div>
              <span style={s.label}>{m.label}</span>
              <div style={{ ...s.status, ...(m.hasActivePhase ? s.statusActive : {}) }}>
                {m.hasActivePhase
                  ? `Aktywna od ${m.startedAt ? new Date(m.startedAt).toLocaleString('pl-PL') : '—'} (${m.phaseName ?? ''})`
                  : 'Brak aktywnej fazy'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                style={{
                  ...s.btn,
                  ...s.btnStart,
                  ...(m.hasActivePhase || acting ? s.btnDisabled : {}),
                }}
                disabled={m.hasActivePhase || !!acting}
                onClick={() => startPhase(m.monsterName)}
              >
                {acting === m.monsterName ? '…' : 'Uruchom fazę'}
              </button>
              <button
                style={{
                  ...s.btn,
                  ...s.btnEnd,
                  ...(!m.hasActivePhase || acting ? s.btnDisabled : {}),
                }}
                disabled={!m.hasActivePhase || !!acting}
                onClick={() => endPhase(m.monsterName)}
              >
                {acting === m.monsterName ? '…' : 'Zakończ fazę'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
