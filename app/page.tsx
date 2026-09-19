'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './components/AuthContext';

type TitanStat = {
  monsterName: string;
  activePhaseTime: number;
  activePhaseTimeFormatted: string;
  totalTime: number;
  totalTimeFormatted: string;
  totalSessions: number;
  phases: Array<{ phaseName: string; totalTime: number; totalTimeFormatted: string }>;
};

type ApiKey = {
  id: string;
  key: string;
  label?: string | null;
  active: boolean;
  lastUsed?: string | null;
};

export default function Home() {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [sessions, setSessions] = useState<any>(null);
  const [myStats, setMyStats] = useState<{ byTitan: TitanStat[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [newApiKey, setNewApiKey] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/api-key');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setApiKeys(data.keys || []);
          const [sessRes, statsRes] = await Promise.all([
            fetch('/api/timer/sessions?limit=10'),
            fetch('/api/timer/my-stats'),
          ]);
          if (!cancelled && sessRes.ok) setSessions(await sessRes.json());
          if (!cancelled && statsRes.ok) setMyStats(await statsRes.json());
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function generateNewKey() {
    try {
      const res = await fetch('/api/auth/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'Key ' + (apiKeys.length + 1) }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewApiKey(data.key);
        const keysRes = await fetch('/api/auth/api-key');
        if (keysRes.ok) {
          const keysData = await keysRes.json();
          setApiKeys(keysData.keys || []);
        }
      } else {
        alert(data.error);
      }
    } catch {
      alert('Error');
    }
  }

  async function installScript() {
    try {
      const res = await fetch('/api/script/install-token');
      if (!res.ok) {
        alert('Zaloguj się najpierw');
        return;
      }
      const data = await res.json();
      window.location.href = `/api/script/install.user.js?token=${data.token}`;
    } catch (err) {
      alert('Błąd: ' + (err instanceof Error ? err.message : err));
    }
  }

  if (loading) {
    return (
      <div className="gos-page">
        <p className="gos-empty">Ładowanie…</p>
      </div>
    );
  }

  return (
    <div className="gos-page">
      <section className="gos-hero">
        <p className="gos-kicker">Panel klanu</p>
        <h1>Home</h1>
        <p>
          Witaj{user?.username ? `, ${user.username}` : ''}. Tutaj instalujesz skrypt, sprawdzasz swoje czasy
          i klucze API — wszystko w jednym miejscu.
        </p>
        <button type="button" className="gos-cta" onClick={installScript}>
          Zainstaluj skrypt
        </button>
      </section>

      <section className="gos-card">
        <h2>Jak zacząć?</h2>
        <ol className="gos-steps">
          <li>
            Zainstaluj <a href="https://www.tampermonkey.net/">Tampermonkey</a> w przeglądarce
          </li>
          <li>
            Kliknij <strong>„Zainstaluj skrypt”</strong> — Tampermonkey otworzy okno instalacji
          </li>
          <li>Wejdź na mapę w grze — timer startuje automatycznie</li>
        </ol>
      </section>

      <section className="gos-card">
        <h2>Moje czasy</h2>
        <p className="gos-card__sub">
          Czas w aktywnej fazie, łącznie ze wszystkich sesji oraz z podziałem na fazy.
        </p>
        {myStats && myStats.byTitan.length > 0 ? (
          <div className="gos-table-wrap">
            <table className="gos-table">
              <thead>
                <tr>
                  <th>Tytan</th>
                  <th>W aktywnej fazie</th>
                  <th>Łącznie</th>
                  <th>Sesje</th>
                  <th>Fazy</th>
                </tr>
              </thead>
              <tbody>
                {myStats.byTitan.map((t) => (
                  <tr key={t.monsterName}>
                    <td>
                      <strong>{t.monsterName}</strong>
                    </td>
                    <td>{t.activePhaseTimeFormatted}</td>
                    <td className="gos-mono">{t.totalTimeFormatted}</td>
                    <td>{t.totalSessions}</td>
                    <td>{t.phases.length === 0 ? '—' : t.phases.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="gos-empty">Brak zapisanych czasów. Użyj skryptu na mapie, aby sesje trafiły tutaj.</p>
        )}
      </section>

      <section className="gos-card">
        <div className="gos-card__head">
          <h2>API Keys</h2>
          <button type="button" className="gos-btn" onClick={generateNewKey}>
            Nowy klucz
          </button>
        </div>
        {newApiKey && (
          <div className="gos-key">
            <p>Twój API Key (kliknij, aby skopiować):</p>
            <code
              onClick={() => {
                navigator.clipboard.writeText(newApiKey);
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              }}
            >
              {newApiKey}
            </code>
            {copied && <p>Skopiowano</p>}
          </div>
        )}
        {apiKeys.length === 0 ? (
          <p className="gos-empty">Brak kluczy — wygeneruj nowy powyżej.</p>
        ) : (
          apiKeys.map((k) => (
            <div key={k.id} className="gos-row">
              <div>
                <code className="gos-mono">{k.key.substring(0, 16)}...</code>
                <span style={{ marginLeft: 8, color: 'var(--gos-dim)', fontSize: 11 }}>{k.label}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--gos-dim)' }}>
                {k.active ? 'aktywny' : 'wyłączony'}
                {k.lastUsed ? ` · ${new Date(k.lastUsed).toLocaleDateString()}` : ' · nieużywany'}
              </div>
            </div>
          ))
        )}
      </section>

      {sessions?.summary?.length > 0 && (
        <section className="gos-card">
          <h2>Podsumowanie</h2>
          {sessions.summary.map((x: any) => (
            <div key={x.monster} className="gos-row">
              <div>
                <strong style={{ color: 'var(--gos-gold)' }}>{x.monster}</strong>
                <span style={{ color: 'var(--gos-dim)', fontSize: 11, marginLeft: 8 }}>{x.map}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="gos-mono" style={{ fontSize: 18 }}>
                  {x.totalTimeFormatted}
                </div>
                <div style={{ color: 'var(--gos-dim)', fontSize: 11 }}>{x.totalSessions} sesji</div>
              </div>
            </div>
          ))}
        </section>
      )}

      {sessions?.sessions?.length > 0 && (
        <section className="gos-card">
          <h2>Ostatnie sesje</h2>
          {sessions.sessions.map((x: any) => (
            <div key={x.id} className="gos-row">
              <div>
                <span style={{ color: 'var(--gos-gold)' }}>{x.monster}</span>
                <span style={{ color: 'var(--gos-dim)', fontSize: 11, marginLeft: 8 }}>
                  {x.hero} · {x.world}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="gos-mono">{x.durationFormatted}</span>
                <div style={{ color: 'var(--gos-dim)', fontSize: 10 }}>
                  {new Date(x.endedAt).toLocaleString()} · {x.reason}
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
