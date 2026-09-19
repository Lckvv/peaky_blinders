'use client';

import { useState } from 'react';
import { useAuth } from './AuthContext';
import AuthShell from './AuthShell';

type Mode = 'login' | 'register' | 'forgot';

export default function LoginForm() {
  const { refreshUser } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
    setInfo('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);
    try {
      if (mode === 'forgot') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ login: email.trim() }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Nie udało się wysłać wiadomości');
          return;
        }
        setInfo(data.message || 'Sprawdź skrzynkę e-mail.');
        return;
      }

      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body =
        mode === 'login'
          ? { login: email || username, password }
          : { email, username, password, invitationCode: invitationCode.trim() || undefined };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Wystąpił błąd');
        return;
      }
      await refreshUser();
    } catch {
      setError('Błąd połączenia');
    } finally {
      setSubmitting(false);
    }
  }

  const titles = {
    login: 'Wejście',
    register: 'Dołącz',
    forgot: 'Przypomnienie hasła',
  };
  const subs = {
    login: 'Zaloguj się, aby zainstalować dodatek u siebie.',
    register: 'Nowe konto wymaga kodu zaproszenia.',
    forgot: 'Podaj email lub username — wyślemy link do resetu.',
  };

  return (
    <AuthShell>
      <div className="gos-card">
        <h2>{titles[mode]}</h2>
        <p className="gos-sub">{subs[mode]}</p>

        {mode !== 'forgot' && (
          <div className="gos-tabs">
            <button type="button" className={mode === 'login' ? 'is-on' : ''} onClick={() => switchMode('login')}>
              Logowanie
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'is-on' : ''}
              onClick={() => switchMode('register')}
            >
              Rejestracja
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="gos-field">
              <label htmlFor="gos-email">Email</label>
              <input
                id="gos-email"
                type="email"
                placeholder="np. gos@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          )}

          <div className="gos-field">
            <label htmlFor="gos-login">
              {mode === 'register' ? 'Username' : mode === 'forgot' ? 'Email lub username' : 'Email lub username'}
            </label>
            <input
              id="gos-login"
              type={mode === 'register' ? 'text' : 'text'}
              placeholder={mode === 'register' ? 'Twój głowny Nick w grze' : 'email lub username'}
              value={mode === 'register' ? username : email}
              onChange={(e) => (mode === 'register' ? setUsername(e.target.value) : setEmail(e.target.value))}
              required
              autoComplete={mode === 'register' ? 'username' : 'username'}
            />
          </div>

          {mode !== 'forgot' && (
            <div className="gos-field">
              <label htmlFor="gos-password">Hasło</label>
              <input
                id="gos-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
          )}

          {mode === 'register' && (
            <div className="gos-field">
              <label htmlFor="gos-invite">Kod zaproszenia</label>
              <input
                id="gos-invite"
                type="text"
                placeholder="Kod od administratora"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
          )}

          {error && <p className="gos-error">{error}</p>}
          {info && <p className="gos-ok">{info}</p>}

          <button type="submit" className="gos-btn" disabled={submitting}>
            {submitting
              ? 'Czekaj…'
              : mode === 'login'
                ? 'Zaloguj się'
                : mode === 'register'
                  ? 'Utwórz konto'
                  : 'Wyślij link resetu'}
          </button>
        </form>

        {mode === 'login' && (
          <button type="button" className="gos-link" onClick={() => switchMode('forgot')}>
            Nie pamiętasz hasła?
          </button>
        )}
        {mode === 'forgot' && (
          <button type="button" className="gos-link" onClick={() => switchMode('login')}>
            Wróć do logowania
          </button>
        )}
      </div>
    </AuthShell>
  );
}
