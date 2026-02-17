export default function KupiePage() {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Kupie</h1>
      <p style={styles.msg}>Strona w budowie</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 600,
    margin: '0 auto',
    padding: '48px 24px',
    fontFamily: 'system-ui, sans-serif',
    textAlign: 'center',
  },
  title: { fontSize: 28, color: '#fff', margin: '0 0 16px' },
  msg: { fontSize: 18, color: '#8892b0' },
};
