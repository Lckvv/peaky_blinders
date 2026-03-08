'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import LoginForm from './LoginForm';
import Header from './Header';
import Navbar from './Navbar';

const MOBILE_BREAKPOINT = 768;

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    setIsMobile(mq.matches);
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

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
      <Header
        isMobile={isMobile}
        onMenuClick={() => setMobileMenuOpen(true)}
      />
      <div style={{ display: 'flex', flex: 1, minHeight: 0, minWidth: 0, marginTop: 80 }}>
        <Navbar
          isMobile={isMobile}
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />
        <main style={{ flex: 1, overflow: 'auto', minWidth: 0, marginLeft: isMobile ? 0 : 260 }}>
          {children}
        </main>
      </div>
    </>
  );
}
