'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/app/components/AuthContext';

type Settings = {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  fromEmail: string;
  fromName: string;
  appUrl: string;
  passwordSet: boolean;
  configured: boolean;
};

const empty: Settings = {
  smtpHost: '',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: '',
  fromEmail: '',
  fromName: 'Guardians of Souls',
  appUrl: '',
  passwordSet: false,
  configured: false,
};

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 720, margin: '0 auto', padding: '32px 24px', fontFamily: 'system-ui, sans-serif' },
  title: { fontSize: 26, margin: '0 0 8px', color: '#fff' },
  sub: { color: '#8892b0', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 },
  card: {
    background: '#16213e',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    border: '1px solid #2a2a4a',
  },
  row: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 },
  label: { fontSize: 12, color: '#8892b0', fontWeight: 600 },
  input: {
    padding: '11px 12px',
    borderRadius: 8,
    border: '1px solid #2a2a4a',
    background: '#0f0f23',
    color: '#fff',
    fontSize: 14,
  },
  check: { display: 'flex', alignItems: 'center', gap: 8, color: '#b8c5d6', fontSize: 14, marginBottom: 16 },
  actions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  btn: {
    padding: '12px 18px',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    background: 'linear-gradient(135deg, #c9a227, #e8d48b)',
    color: '#1c1406',
  },
  btnGhost: {
    padding: '12px 18px',
    border: '1px solid #2a2a4a',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    background: 'transparent',
    color: '#b8c5d6',
  },
  hint: { fontSize: 12, color: '#8892b0', marginTop: 4, lineHeight: 1.45 },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 16,
  },
  ok: { background: 'rgba(46, 204, 113, 0.15)', color: '#2ecc71' },
  warn: { background: 'rgba(230, 126, 34, 0.15)', color: '#e67e22' },
  msg: { marginTop: 12, fontSize: 13 },
  forbidden: { textAlign: 'center' as const, padding: 48, color: '#e74c3c', fontSize: 16 },
};

export default function EmailSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(empty);
  const [password, setPassword] = useState('');
  const [testTo, setTestTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/email-settings');
        if (res.status === 401 || res.status === 403) {
          setForbidden(true);
          return;
        }
        if (!res.ok) throw new Error('Błąd ładowania');
        const data = await res.json();
        setSettings({ ...empty, ...data.settings });
        setTestTo(data.settings?.fromEmail || user?.email || '');
      } catch {
        setError('Nie udało się wczytać ustawień');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.email]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/email-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          smtpPassword: password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Nie udało się zapisać');
        return;
      }
      setSettings({ ...empty, ...data.settings });
      setPassword('');
      setMessage(data.message);
    } catch {
      setError('Błąd połączenia');
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/email-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testTo || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ? `${data.error}: ${data.detail}` : data.error || 'Test nieudany');
        return;
      }
      setMessage(data.message);
    } catch {
      setError('Błąd połączenia');
    } finally {
      setTesting(false);
    }
  }

  if (!user || loading) {
    return (
      <div style={s.container}>
        <p style={{ color: '#888' }}>Ładowanie…</p>
      </div>
    );
  }

  if (forbidden || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return (
      <div style={s.container}>
        <div style={s.card}>
          <p style={s.forbidden}>Brak dostępu. Tylko administrator może konfigurować pocztę.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <h1 style={s.title}>Ustawienia — przypomnienie hasła</h1>
      <p style={s.sub}>
        Tutaj podajesz serwer SMTP, z którego wychodzą maile z linkiem do resetu hasła.
        Dla Gmaila użyj hasła aplikacji i portu 587. Adres aplikacji wklej tylko jeśli link w mailu ma prowadzić na inną domenę niż ta, z której korzystasz.
      </p>

      <div style={s.card}>
        <span style={{ ...s.badge, ...(settings.configured ? s.ok : s.warn) }}>
          {settings.configured ? 'Poczta skonfigurowana' : 'Brak kompletnej konfiguracji'}
        </span>

        <form onSubmit={save}>
          <div style={s.row}>
            <label style={s.label} htmlFor="smtpHost">Host SMTP</label>
            <input
              id="smtpHost"
              style={s.input}
              value={settings.smtpHost}
              onChange={(e) => setSettings((v) => ({ ...v, smtpHost: e.target.value }))}
              placeholder="smtp.gmail.com"
            />
          </div>
          <div style={s.row}>
            <label style={s.label} htmlFor="smtpPort">Port</label>
            <input
              id="smtpPort"
              style={s.input}
              type="number"
              min={1}
              max={65535}
              value={settings.smtpPort}
              onChange={(e) => setSettings((v) => ({ ...v, smtpPort: Number(e.target.value) }))}
            />
            <span style={s.hint}>587 (STARTTLS) albo 465 (SSL). Zaznacz „szyfrowane połączenie” tylko dla 465.</span>
          </div>
          <label style={s.check}>
            <input
              type="checkbox"
              checked={settings.smtpSecure}
              onChange={(e) => setSettings((v) => ({ ...v, smtpSecure: e.target.checked }))}
            />
            Szyfrowane połączenie (SSL / port 465)
          </label>
          <div style={s.row}>
            <label style={s.label} htmlFor="smtpUser">Użytkownik SMTP</label>
            <input
              id="smtpUser"
              style={s.input}
              value={settings.smtpUser}
              onChange={(e) => setSettings((v) => ({ ...v, smtpUser: e.target.value }))}
              placeholder="konto@gmail.com"
              autoComplete="off"
            />
          </div>
          <div style={s.row}>
            <label style={s.label} htmlFor="smtpPassword">Hasło SMTP</label>
            <input
              id="smtpPassword"
              style={s.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={settings.passwordSet ? 'Pozostaw puste, aby nie zmieniać' : 'Hasło lub hasło aplikacji'}
              autoComplete="new-password"
            />
          </div>
          <div style={s.row}>
            <label style={s.label} htmlFor="fromEmail">Nadawca (From)</label>
            <input
              id="fromEmail"
              style={s.input}
              type="email"
              value={settings.fromEmail}
              onChange={(e) => setSettings((v) => ({ ...v, fromEmail: e.target.value }))}
              placeholder="noreply@twoja-domena.pl"
            />
          </div>
          <div style={s.row}>
            <label style={s.label} htmlFor="fromName">Nazwa nadawcy</label>
            <input
              id="fromName"
              style={s.input}
              value={settings.fromName}
              onChange={(e) => setSettings((v) => ({ ...v, fromName: e.target.value }))}
            />
          </div>
          <div style={s.row}>
            <label style={s.label} htmlFor="appUrl">Publiczny adres strony (opcjonalnie)</label>
            <input
              id="appUrl"
              style={s.input}
              value={settings.appUrl}
              onChange={(e) => setSettings((v) => ({ ...v, appUrl: e.target.value }))}
              placeholder="https://twoja-domena.pl"
            />
          </div>

          <div style={s.actions}>
            <button type="submit" style={s.btn} disabled={saving}>
              {saving ? 'Zapisywanie…' : 'Zapisz konfigurację'}
            </button>
          </div>
        </form>
      </div>

      <div style={s.card}>
        <h2 style={{ fontSize: 16, margin: '0 0 12px', color: '#eee' }}>Wyślij mail testowy</h2>
        <div style={s.row}>
          <label style={s.label} htmlFor="testTo">Adres testowy</label>
          <input
            id="testTo"
            style={s.input}
            type="email"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="twoj@email.pl"
          />
        </div>
        <button type="button" style={s.btnGhost} onClick={sendTest} disabled={testing}>
          {testing ? 'Wysyłanie…' : 'Wyślij test'}
        </button>
        {message && <p style={{ ...s.msg, color: '#2ecc71' }}>{message}</p>}
        {error && <p style={{ ...s.msg, color: '#e74c3c' }}>{error}</p>}
      </div>
    </div>
  );
}
