'use client';

import { useState, useEffect } from 'react';

export default function Home() {
    const [user, setUser] = useState<any>(null);
    const [apiKeys, setApiKeys] = useState<any[]>([]);
    const [sessions, setSessions] = useState<any>(null);
    const [myStats, setMyStats] = useState<{ byTitan: Array<{
            monsterName: string;
            activePhaseTime: number;
            activePhaseTimeFormatted: string;
            totalTime: number;
            totalTimeFormatted: string;
            totalSessions: number;
            phases: Array<{ phaseName: string; totalTime: number; totalTimeFormatted: string }>;
        }> } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [nick, setNick] = useState('');
    const [password, setPassword] = useState('');
    const [newApiKey, setNewApiKey] = useState('');

    useEffect(() => { checkAuth(); }, []);

    async function checkAuth() {
        try {
            const res = await fetch('/api/auth/api-key');
            if (res.ok) {
                const data = await res.json();
                setApiKeys(data.keys || []);
                setUser(data.user || true);
                loadSessions();
            }
        } catch (e) {}
        setLoading(false);
    }

    async function loadSessions() {
        try {
            const [sessRes, statsRes] = await Promise.all([
                fetch('/api/timer/sessions?limit=10'),
                fetch('/api/timer/my-stats'),
            ]);
            if (sessRes.ok) setSessions(await sessRes.json());
            if (statsRes.ok) setMyStats(await statsRes.json());
        } catch (e) {}
    }

    async function handleAuth(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setNewApiKey('');

        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        const body = isLogin
            ? { login: email || username, password }
            : { email, username, password, nick: nick || undefined };

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();

            if (!res.ok) { setError(data.error || 'Something went wrong'); return; }
            if (!isLogin && data.apiKey) setNewApiKey(data.apiKey);

            setUser(data.user || true);
            checkAuth();
        } catch (e) {
            setError('Network error');
        }
    }

    async function generateNewKey() {
        try {
            const res = await fetch('/api/auth/api-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label: 'Key ' + (apiKeys.length + 1) }),
            });
            const data = await res.json();
            if (res.ok) { setNewApiKey(data.key); checkAuth(); }
            else alert(data.error);
        } catch (e) { alert('Error'); }
    }

    if (loading) return <div style={s.container}><p style={{ color: '#888' }}>Loading...</p></div>;

  return (
    <main style={{ maxWidth: 700, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>⏱ Margonem Map Timer</h1>
      <p style={{ color: '#888', marginBottom: 20 }}>
        Śledź czas spędzony na mapach w Margonem. Rywalizuj z innymi!
      </p>

      <a href="/dashboard" style={{
        display: 'block', textAlign: 'center', padding: '14px 20px',
        background: 'linear-gradient(135deg, #6c3483, #2980b9)', color: '#fff',
        borderRadius: 10, fontSize: 16, fontWeight: 'bold', textDecoration: 'none', marginBottom: 32,
      }}>
        ⚡ Zaloguj się i zainstaluj skrypt
      </a>

      <section style={{ background: '#1a1a2e', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginTop: 0 }}>Jak zacząć?</h2>
        <ol style={{ lineHeight: 2, color: '#ccc' }}>
          <li>Zainstaluj <a href="https://www.tampermonkey.net/" style={{ color: '#3498db' }}>Tampermonkey</a> w przeglądarce</li>
          <li>Przejdź do <a href="/dashboard" style={{ color: '#3498db' }}>dashboardu</a> i zarejestruj się</li>
          <li>Kliknij <strong>„Zainstaluj skrypt"</strong> — Tampermonkey otworzy okno instalacji</li>
          <li>Wejdź na mapę w grze — timer startuje automatycznie!</li>
        </ol>
      </section>

        {/* MOJE CZASY — per tytan */}
        <div style={s.card}>
            <h2 style={s.h2}>⏱ Moje czasy (per tytan)</h2>
            <p style={{ color: '#8892b0', fontSize: 12, margin: '0 0 12px' }}>
                Czas w aktywnej fazie, łącznie ze wszystkich sesji oraz z podziałem na fazy.
            </p>
            {myStats && myStats.byTitan.length > 0 ? (
                <div style={s.statsTableWrap}>
                    <table style={s.statsTable}>
                        <thead>
                        <tr>
                            <th style={s.statsTh}>Tytan</th>
                            <th style={s.statsTh}>W aktywnej fazie</th>
                            <th style={s.statsTh}>Łącznie (wszystkie sesje)</th>
                            <th style={s.statsTh}>Sesje</th>
                            <th style={s.statsTh}>Fazy</th>
                        </tr>
                        </thead>
                        <tbody>
                        {myStats.byTitan.map((t) => (
                            <tr key={t.monsterName} style={s.statsTr}>
                                <td style={s.statsTd}><strong style={{ color: '#e2b714' }}>{t.monsterName}</strong></td>
                                <td style={s.statsTd}>{t.activePhaseTimeFormatted}</td>
                                <td style={{ ...s.statsTd, color: '#2ecc71', fontFamily: 'monospace' }}>{t.totalTimeFormatted}</td>
                                <td style={s.statsTd}>{t.totalSessions}</td>
                                <td style={s.statsTd}>
                                    {t.phases.length === 0 ? '—' : (
                                        <div style={{ fontSize: 11 }}>
                                            {t.phases.map((p) => (
                                                <div key={p.phaseName}>{p.phaseName}: {p.totalTimeFormatted}</div>
                                            ))}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p style={{ color: '#666', fontSize: 13 }}>Brak zapisanych czasów. Użyj skryptu na mapie, aby sesje trafiły tutaj.</p>
            )}
        </div>

        {/* API KEYS */}
        <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={s.h2}>🔑 API Keys</h2>
                <button onClick={generateNewKey} style={s.btnSmall}>+ Nowy klucz</button>
            </div>
            {newApiKey && <KeyReveal apiKey={newApiKey} />}
            {apiKeys.length === 0 ? (
                <p style={{ color: '#888', fontSize: 13 }}>Brak kluczy — wygeneruj nowy powyżej.</p>
            ) : (
                apiKeys.map((k) => (
                    <div key={k.id} style={s.row}>
                        <div>
                            <code style={{ color: '#3498db', fontSize: 12 }}>{k.key.substring(0, 16)}...</code>
                            <span style={{ marginLeft: 8, color: '#666', fontSize: 11 }}>{k.label}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#555' }}>
                            {k.active ? '🟢' : '🔴'}
                            {k.lastUsed ? ` ${new Date(k.lastUsed).toLocaleDateString()}` : ' unused'}
                        </div>
                    </div>
                ))
            )}
        </div>

        {/* SUMMARY */}
        {sessions?.summary?.length > 0 && (
            <div style={s.card}>
                <h2 style={s.h2}>📊 Podsumowanie</h2>
                {sessions.summary.map((x: any) => (
                    <div key={x.monster} style={{ ...s.row, padding: '12px 0' }}>
                        <div>
                            <strong style={{ color: '#e2b714' }}>{x.monster}</strong>
                            <span style={{ color: '#555', fontSize: 11, marginLeft: 8 }}>{x.map}</span>
                        </div>
                        <div style={{ textAlign: 'right' as const }}>
                            <div style={{ color: '#2ecc71', fontFamily: 'monospace', fontSize: 18 }}>{x.totalTimeFormatted}</div>
                            <div style={{ color: '#666', fontSize: 11 }}>{x.totalSessions} sesji</div>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* RECENT SESSIONS */}
        {sessions?.sessions?.length > 0 && (
            <div style={s.card}>
                <h2 style={s.h2}>🕐 Ostatnie sesje</h2>
                {sessions.sessions.map((x: any) => (
                    <div key={x.id} style={{ ...s.row, fontSize: 13 }}>
                        <div>
                            <span style={{ color: '#e2b714' }}>{x.monster}</span>
                            <span style={{ color: '#555', fontSize: 11, marginLeft: 8 }}>{x.hero} · {x.world}</span>
                        </div>
                        <div style={{ textAlign: 'right' as const }}>
                            <span style={{ color: '#2ecc71', fontFamily: 'monospace' }}>{x.durationFormatted}</span>
                            <div style={{ color: '#444', fontSize: 10 }}>
                                {new Date(x.endedAt).toLocaleString()} · {x.reason}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </main>
  );
}

function KeyReveal({ apiKey }: { apiKey: string }) {
    return (
        <div style={{ background: '#0a1628', border: '1px solid #2ecc71', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <p style={{ margin: '0 0 6px', fontWeight: 'bold', color: '#2ecc71', fontSize: 12 }}>
                🔑 Twój API Key (kliknij aby skopiować):
            </p>
            <code
                style={{ display: 'block', background: '#000', padding: '8px 12px', borderRadius: 6, fontSize: 13, fontFamily: 'monospace', color: '#2ecc71', cursor: 'pointer', wordBreak: 'break-all' as const }}
                onClick={() => { navigator.clipboard.writeText(apiKey); alert('Skopiowano!'); }}
            >
                {apiKey}
            </code>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    container: { maxWidth: 600, margin: '0 auto', padding: '32px 16px', fontFamily: 'system-ui, sans-serif' },
    title: { fontSize: 28, margin: '0 0 4px', color: '#fff' },
    sub: { color: '#888', margin: '0 0 24px', fontSize: 14 },
    card: { background: '#1a1a2e', borderRadius: 12, padding: 20, marginBottom: 16 },
    h2: { fontSize: 16, margin: '0 0 12px', color: '#eee' },
    tabs: { display: 'flex', marginBottom: 16, borderRadius: 8, overflow: 'hidden', border: '1px solid #333' },
    tab: { flex: 1, padding: 10, background: '#0f0f23', color: '#888', border: 'none', cursor: 'pointer', fontSize: 13 },
    tabOn: { background: '#16213e', color: '#fff' },
    input: { padding: '10px 12px', background: '#0f3460', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none' },
    btnGreen: { padding: 12, background: '#27ae60', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 'bold', marginTop: 4 },
    btnInstall: { padding: '14px 20px', background: 'linear-gradient(135deg, #6c3483, #2980b9)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 'bold', width: '100%' },
    btnSmall: { padding: '6px 12px', background: '#3498db', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11 },
    row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #ffffff08' },
    linkBtn: { padding: '8px 16px', background: '#6c3483', color: '#fff', textDecoration: 'none', borderRadius: 8, fontSize: 13, fontWeight: 'bold' },
    statsTableWrap: { overflowX: 'auto' as const },
    statsTable: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
    statsTh: { textAlign: 'left' as const, padding: '10px 12px', background: '#0f0f23', color: '#8892b0', fontWeight: 600, fontSize: 11 },
    statsTr: { borderBottom: '1px solid #2a2a4a' },
    statsTd: { padding: '10px 12px', color: '#ccc' },
};
