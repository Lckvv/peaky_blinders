'use client';

import { useAuth } from '@/app/components/AuthContext';

const s: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 700,
    margin: '0 auto',
    padding: '32px 24px',
    fontFamily: 'system-ui, sans-serif',
  },
  card: {
    background: '#16213e',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    border: '1px solid #2a2a4a',
  },
  forbidden: { textAlign: 'center' as const, padding: 48, color: '#e74c3c', fontSize: 16 },
  empty: { textAlign: 'center' as const, padding: 24, color: '#8892b0', fontSize: 14 },
};

export default function AdminLogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={s.container}>
        <div style={s.card}>
          <p style={s.empty}>Ładowanie…</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'super_admin') {
    return (
      <div style={s.container}>
        <div style={s.card}>
          <p style={s.forbidden}>Brak dostępu. Tylko Super Admin ma dostęp do tej sekcji.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
