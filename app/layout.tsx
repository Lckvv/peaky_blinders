import type { Metadata } from 'next';
import { AuthProvider } from './components/AuthContext';
import AuthGuard from './components/AuthGuard';

export const metadata: Metadata = {
  title: 'Peaky Blinders',
  description: 'Margonem Map Timer — śledzenie czasu na mapach',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0f0f23', color: '#eee' }}>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <AuthProvider>
            <AuthGuard>
              {children}
            </AuthGuard>
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
