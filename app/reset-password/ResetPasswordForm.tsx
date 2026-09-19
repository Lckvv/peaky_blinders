'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AuthShell from '../components/AuthShell';

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    if (password !== confirm) {
      setError('Hasła nie są takie same');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Nie udało się zmienić hasła');
        return;
      }
      setInfo(data.message || 'Hasło zostało zmienione.');
    } catch {
      setError('Błąd połączenia');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div className="gos-card">
        <h2>Nowe hasło</h2>
        <p className="gos-sub">Ustaw hasło, którym będziesz strzec dostępu do panelu.</p>

        {!token ? (
          <p className="gos-error">Brak tokenu w adresie. Użyj linku z wiadomości e-mail.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="gos-field">
              <label htmlFor="new-password">Nowe hasło</label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="gos-field">
              <label htmlFor="confirm-password">Powtórz hasło</label>
              <input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>
            {error && <p className="gos-error">{error}</p>}
            {info && <p className="gos-ok">{info}</p>}
            <button type="submit" className="gos-btn" disabled={submitting || Boolean(info)}>
              {submitting ? 'Zapisywanie…' : 'Zapisz hasło'}
            </button>
          </form>
        )}

        <a className="gos-link" href="/">
          Wróć do logowania
        </a>
      </div>
    </AuthShell>
  );
}
