import type { Metadata } from 'next';
import { Cinzel, Outfit } from 'next/font/google';
import { AuthProvider } from './components/AuthContext';
import AuthGuard from './components/AuthGuard';
import './gos.css';

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-cinzel',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Guardians of Souls',
  description: 'Panel klanu Guardians of Souls — timery, rankingi i rezerwacje',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" className={`${cinzel.variable} ${outfit.variable}`}>
      <body style={{ margin: 0, fontFamily: 'var(--font-outfit), system-ui, sans-serif', background: '#07080f', color: '#f6f1e4' }}>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', overflowX: 'hidden', width: '100%' }}>
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
