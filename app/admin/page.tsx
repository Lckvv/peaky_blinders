'use client';

import { useState, useEffect } from 'react';

// Stała lista tytanów — zawsze wyświetlana; tylko status (aktywna tak/nie) pochodzi z API
const TITANS = [
  { key: 'orla', label: 'Orla', monsterName: 'Orla' },
  { key: 'kic', label: 'Kic', monsterName: 'Kic' },
  { key: 'rene', label: 'Rene', monsterName: 'Renegat' },
  { key: 'arcy', label: 'Arcy', monsterName: 'Arcy' },
  { key: 'zoons', label: 'Zoons', monsterName: 'Zoons' },
  { key: 'lowka', label: 'Lowka', monsterName: 'Łowczyni' },
  { key: 'przyzy', label: 'Przyzy', monsterName: 'Przyzywacz' },
  { key: 'magua', label: 'Magua', monsterName: 'Magua' },
  { key: 'teza', label: 'Teza', monsterName: 'Teza' },
  { key: 'barba', label: 'Barba', monsterName: 'Barbatos' },
  { key: 'tanro', label: 'Tanro', monsterName: 'Tanroth' },
] as const;

type TitanStatus = {
  hasActivePhase: boolean;
  startedAt: string | null;
  phaseName: string | null;
};

type ClosedPhase = {
  id: string;
  phaseName: string;
  monsterName: string;
  startedAt: string;
  endedAt: string | null;
};

const s: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 860,
    margin: '0 auto',
    padding: '32px 24px',
    fontFamily: 'system-ui, sans-serif',
  },
  title: { fontSize: 26, margin: '0 0 8px', color: '#fff' },
  sub: { color: '#8892b0', fontSize: 14, margin: '0 0 24px', lineHeight: 1.5 },
  tabs: {
    display: 'flex',
    gap: 4,
    marginBottom: 24,
    borderBottom: '1px solid #2a2a4a',
  },
  tab: {
    padding: '12px 20px',
    background: 'none',
    border: 'none',
    color: '#8892b0',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    borderBottom: '3px solid transparent',
    marginBottom: -1,
    transition: 'color 0.2s, border-color 0.2s',
  },
  tabActive: {
    color: '#3498db',
    borderBottomColor: '#3498db',
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
  label: { fontWeight: 700, color: '#e2b714', fontSize: 16 },
  status: { fontSize: 13, color: '#8892b0' },
  statusActive: { color: '#2ecc71', fontWeight: 600 },
  actions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  btn: {
    padding: '10px 18px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  btnStart: { background: '#27ae60', color: '#fff' },
  btnEnd: { background: '#e67e22', color: '#fff' },
  btnDisabled: { background: '#333', color: '#666', cursor: 'not-allowed', opacity: 0.8 },
  forbidden: { textAlign: 'center', padding: 48, color: '#e74c3c', fontSize: 16 },
  closedHeader: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr',
    gap: 12,
    padding: '12px 16px',
    background: '#0f0f23',
    borderRadius: 8,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: 700,
    color: '#8892b0',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  closedRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr',
    gap: 12,
    alignItems: 'center',
    padding: '14px 16px',
    background: '#1a1a2e',
    borderRadius: 8,
    marginBottom: 8,
    border: '1px solid #2a2a4a',
    fontSize: 14,
    color: '#ccc',
  },
  emptyClosed: { textAlign: 'center', padding: 32, color: '#8892b0', fontSize: 14 },
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'activate' | 'closed'>('activate');
  const [statusByMonster, setStatusByMonster] = useState<Record<string, TitanStatus>>({});
  const [closedPhases, setClosedPhases] = useState<ClosedPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingClosed, setLoadingClosed] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  async function loadStatus() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/phase-status');
      if (res.status === 403 || res.status === 401) {
        setForbidden(true);
        setStatusByMonster({});
        return;
      }
      if (!res.ok) throw new Error('Błąd ładowania');
      const data = await res.json();
      const list = data.monsters || [];
      const byName: Record<string, TitanStatus> = {};
      list.forEach((m: { monsterName: string; hasActivePhase: boolean; startedAt: string | null; phaseName: string | null }) => {
        byName[m.monsterName] = {
          hasActivePhase: m.hasActivePhase,
          startedAt: m.startedAt,
          phaseName: m.phaseName,
        };
      });
      setStatusByMonster(byName);
    } catch {
      setStatusByMonster({});
    } finally {
      setLoading(false);
    }
  }

  async function loadClosed() {
    setLoadingClosed(true);
    try {
      const res = await fetch('/api/admin/phases-closed');
      if (res.ok) {
        const data = await res.json();
        setClosedPhases(data.phases || []);
      } else {
        setClosedPhases([]);
      }
    } catch {
      setClosedPhases([]);
    } finally {
      setLoadingClosed(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (activeTab === 'closed') loadClosed();
  }, [activeTab]);

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
      await loadStatus();
    } catch (e) {
      alert('Błąd: ' + e);
    } finally {
      setActing(null);
    }
  }

  async function endPhase(monsterName: string) {
    if (!confirm(`Zakończyć fazę dla ${monsterName}? Odliczanie się zatrzyma, sesje trafią do rankingu.`)) return;
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
      await loadStatus();
      if (activeTab === 'closed') await loadClosed();
    } catch (e) {
      alert('Błąd: ' + e);
    } finally {
      setActing(null);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('pl-PL', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  if (loading && Object.keys(statusByMonster).length === 0 && !forbidden) {
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
          <p style={s.forbidden}>Brak dostępu. Tylko administrator lub koordynator może zarządzać fazami.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <h1 style={s.title}>Panel admina — Fazy</h1>
      <p style={s.sub}>
        Zakładka <strong>Uruchom fazę</strong>: wybierz tytana i wciśnij <strong>Aktywuj</strong> — od zera zaczyna się zbieranie sesji z Tampermonkey. <strong>Zakończ</strong> zatrzymuje fazę i zamyka ją w rankingu. Zakładka <strong>Zamknięte fazy</strong> pokazuje historię zakończonych faz.
      </p>

      <div style={s.tabs}>
        <button
          type="button"
          style={{ ...s.tab, ...(activeTab === 'activate' ? s.tabActive : {}) }}
          onClick={() => setActiveTab('activate')}
        >
          Uruchom fazę
        </button>
        <button
          type="button"
          style={{ ...s.tab, ...(activeTab === 'closed' ? s.tabActive : {}) }}
          onClick={() => setActiveTab('closed')}
        >
          Zamknięte fazy
        </button>
      </div>

      {activeTab === 'activate' && (
        <div style={s.card}>
          <div style={s.tableHeader}>
            <span>Tytan</span>
            <span>Status</span>
            <span>Akcje</span>
          </div>
          {TITANS.map((t) => {
            const st = statusByMonster[t.monsterName];
            const hasActive = st?.hasActivePhase ?? false;
            return (
              <div key={t.key} style={s.row}>
                <span style={s.label}>{t.label}</span>
                <div style={{ ...s.status, ...(hasActive ? s.statusActive : {}) }}>
                  {hasActive
                    ? `Aktywna od ${st?.startedAt ? formatDate(st.startedAt) : '—'} (${st?.phaseName ?? ''})`
                    : 'Brak aktywnej fazy — odliczanie od zera po Aktywuj'}
                </div>
                <div style={s.actions}>
                  <button
                    type="button"
                    style={{
                      ...s.btn,
                      ...s.btnStart,
                      ...(hasActive || acting ? s.btnDisabled : {}),
                    }}
                    disabled={hasActive || !!acting}
                    onClick={() => startPhase(t.monsterName)}
                    title="Uruchom zbieranie sesji od zera"
                  >
                    {acting === t.monsterName ? '…' : 'Aktywuj'}
                  </button>
                  <button
                    type="button"
                    style={{
                      ...s.btn,
                      ...s.btnEnd,
                      ...(!hasActive || acting ? s.btnDisabled : {}),
                    }}
                    disabled={!hasActive || !!acting}
                    onClick={() => endPhase(t.monsterName)}
                    title="Zakończ fazę i zlicz ranking"
                  >
                    {acting === t.monsterName ? '…' : 'Zakończ'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'closed' && (
        <div style={s.card}>
          <div style={s.closedHeader}>
            <span>Faza</span>
            <span>Potwór</span>
            <span>Od</span>
            <span>Do</span>
          </div>
          {loadingClosed ? (
            <p style={s.emptyClosed}>Ładowanie…</p>
          ) : closedPhases.length === 0 ? (
            <p style={s.emptyClosed}>Brak zamkniętych faz.</p>
          ) : (
            closedPhases.map((p) => (
              <div key={p.id} style={s.closedRow}>
                <span>{p.phaseName}</span>
                <span>{p.monsterName}</span>
                <span>{formatDate(p.startedAt)}</span>
                <span>{p.endedAt ? formatDate(p.endedAt) : '—'}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
