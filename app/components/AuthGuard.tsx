'use client';

import { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import LoginForm from './LoginForm';
import Header from './Header';
import Navbar from './Navbar';

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f0f23',
        color: '#888',
      }}>
        Ładowanie…
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <>
      <Header />
      <div style={{ display: 'flex', flex: 1, minHeight: 0, minWidth: 0 }}>
        <Navbar />
        <main style={{ flex: 1, overflow: 'auto', minWidth: 0, marginLeft: 260 }}>
          {children}
        </main>
      </div>
    </>
  );
}
