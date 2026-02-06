import type { Metadata } from 'next';

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
        {children}
      </body>
    </html>
  );
}
