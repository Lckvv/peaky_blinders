'use client';

import { ReactNode, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthContext';
import LoginForm from './LoginForm';
import Header from './Header';
import Navbar from './Navbar';

const MOBILE_BREAKPOINT = 768;
const PUBLIC_PATHS = ['/reset-password'];

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
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
        background: '#07080f',
        color: '#c4bba8',
        fontFamily: 'var(--font-outfit), system-ui, sans-serif',
      }}>
        Ładowanie…
      </div>
    );
  }

  if (!user) {
    const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
    if (isPublic) return <>{children}</>;
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
        <main className="gos-main" style={{ marginLeft: isMobile ? 0 : 260 }}>
          {children}
        </main>
      </div>
    </>
  );
}
