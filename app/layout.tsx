import type { Metadata } from 'next';
import Navbar from './components/Navbar';

export const metadata: Metadata = {
  title: 'Margonem Map Timer',
  description: 'Track your time spent hunting monsters on Margonem maps',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0f0f23', color: '#eee' }}>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <Navbar />
          <main style={{ flex: 1, overflow: 'auto' }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
