'use client';

import Link from 'next/link';

const HEROES = [
  { slug: 'seeker-of-creation', label: '63 - Seeker of Creation' },
  { slug: 'harbinger-of-elancia', label: '143 - Harbinger of Elancia' },
  { slug: 'thunder-wielding-barbarian', label: '300 - Thunder-Wielding Barbarian' },
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
    color: '#3498db',
    textDecoration: 'none',
    fontSize: 16,
    fontWeight: 600,
    transition: 'background 0.15s, border-color 0.15s',
  },
};

export default function UrodzinyPage() {
  return (
    <div style={s.wrap}>
      <h1 style={s.title}>20 urodziny</h1>
      <p style={s.subtitle}>Rankingi czasów na mapach herosów eventowych (EVE). Wybierz herosa:</p>
      <div style={s.list}>
        {HEROES.map(({ slug, label }) => (
          <Link key={slug} href={`/2026/20urodziny/${slug}`} style={s.link}>
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
