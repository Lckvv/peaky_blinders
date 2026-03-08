'use client';

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 900, margin: '0 auto', padding: '32px 24px', fontFamily: 'system-ui, sans-serif' },
  title: { fontSize: 26, margin: '0 0 8px', color: '#fff' },
  sub: { color: '#8892b0', fontSize: 14, margin: '0 0 24px' },
  card: { background: '#16213e', borderRadius: 12, padding: 24, border: '1px solid #2a2a4a' },
};

export default function LogsMargonemPage() {
  return (
    <div style={s.container}>
      <h1 style={s.title}>Logs Margonem</h1>
      <p style={s.sub}>Dostęp tylko dla Super Admin. Tu będą logi powiązane z Margonem.</p>
      <div style={s.card}>
        <p style={{ color: '#8892b0', margin: 0 }}>Brak logów do wyświetlenia.</p>
      </div>
    </div>
  );
}
