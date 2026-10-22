'use client';

import Link from 'next/link';

const HEROES = [
  { slug: 'doppelganger', label: '132 - Doppelganger' },
  { slug: 'drude', label: '190 - Drude' },
  { slug: 'nosferatu', label: '243 - Nosferatu' },
];

const s: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 800, margin: '0 auto', padding: '24px 20px', fontFamily: 'system-ui, sans-serif' },
  title: { fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 8 },
  subtitle: { color: '#8892b0', marginBottom: 24 },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  link: {
    display: 'block',
    padding: '14px 20px',
    background: '#16213e',
    border: '1px solid #2a2a4a',
    borderRadius: 10,
    color: '#e67e22',
    textDecoration: 'none',
    fontSize: 16,
    fontWeight: 600,
  },
};

export default function HalloweenPage() {
  return (
    <div style={s.wrap}>
      <h1 style={s.title}>Halloween 2026</h1>
      <p style={s.subtitle}>Timery respawnu, obecność na mapach, ranking czasu i ranking Łowcy herosa. Wybierz herosa:</p>
      <div style={s.list}>
        {HEROES.map(({ slug, label }) => (
          <Link key={slug} href={`/2026/halloween/${slug}`} style={s.link}>
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
