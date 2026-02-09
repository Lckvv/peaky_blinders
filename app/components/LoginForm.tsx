'use client';

import { useState } from 'react';
import { useAuth } from './AuthContext';

const s: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(180deg, #0f0f23 0%, #1a1a2e 100%)',
    padding: 24,
  },
  box: {
    width: '100%',
    maxWidth: 380,
    background: '#16213e',
    borderRadius: 16,
    padding: 28,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    border: '1px solid #2a2a4a',
  },
  title: {
    fontSize: 22,
    fontWeight: 600,
    color: '#fff',
    margin: '0 0 8px',
    textAlign: 'center',
  },
  sub: {
    color: '#8892b0',
    fontSize: 13,
    margin: '0 0 24px',
    textAlign: 'center',
  },
  tabs: {
    display: 'flex',
    marginBottom: 20,
    borderRadius: 10,
    overflow: 'hidden',
    background: '#0f0f23',
    border: '1px solid #2a2a4a',
  },
  tab: {
    flex: 1,
    padding: 12,
    background: 'transparent',
    color: '#8892b0',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    transition: 'all 0.2s',
  },
  tabOn: {
    background: '#3498db',
    color: '#fff',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    background: '#0f0f23',
    border: '1px solid #2a2a4a',
    borderRadius: 8,
    color: '#fff',
    fontSize: 14,
    marginBottom: 12,
    outline: 'none',
  },
  btn: {
    width: '100%',
    padding: 14,
    background: 'linear-gradient(135deg, #2980b9, #3498db)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8,
  },
  error: {
    color: '#e74c3c',
    fontSize: 13,
    margin: '0 0 8px',
  },
};

export default function LoginForm() {
  const { refreshUser } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin
        ? { login: email || username, password }
        : { email, username, password };
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

  return (
    <div style={s.wrap}>
      <div style={s.box}>
        <h1 style={s.title}>Zaloguj się</h1>
        <p style={s.sub}>
          {isLogin ? 'Podaj dane do konta' : 'Utwórz konto, aby kontynuować'}
        </p>
        <div style={s.tabs}>
          <button
            type="button"
            style={{ ...s.tab, ...(isLogin ? s.tabOn : {}) }}
            onClick={() => setIsLogin(true)}
          >
            Logowanie
          </button>
          <button
            type="button"
            style={{ ...s.tab, ...(!isLogin ? s.tabOn : {}) }}
            onClick={() => setIsLogin(false)}
          >
            Rejestracja
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          {!isLogin && (
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={s.input}
              required
            />
          )}
          <input
            type="text"
            placeholder={isLogin ? 'Email lub username' : 'Username'}
            value={isLogin ? email : username}
            onChange={(e) => (isLogin ? setEmail(e.target.value) : setUsername(e.target.value))}
            style={s.input}
            required
          />
          <input
            type="password"
            placeholder="Hasło"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={s.input}
            required
          />
          {error && <p style={s.error}>{error}</p>}
          <button type="submit" style={s.btn} disabled={submitting}>
            {isLogin ? 'Zaloguj się' : 'Zarejestruj się'}
          </button>
        </form>
      </div>
    </div>
  );
}
