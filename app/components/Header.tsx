'use client';

const styles: React.CSSProperties = {
  padding: '16px 24px',
  background: 'linear-gradient(90deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)',
  borderBottom: '2px solid #2a2a4a',
  textAlign: 'center',
};

export default function Header() {
  return (
    <header style={styles}>
      <h1
        style={{
          margin: 0,
          fontSize: 28,
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          textShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        Peaky Blinders
      </h1>
    </header>
  );
}
