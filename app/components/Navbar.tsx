'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const TYTANI = [
  { name: 'Orla', slug: 'orla' },
  { name: 'Kic', slug: 'kic' },
  { name: 'Renegat', slug: 'renegat' },
  { name: 'Arcy', slug: 'arcy' },
  { name: 'Zoons', slug: 'zoons' },
  { name: 'Łowczyni', slug: 'lowczyni' },
  { name: 'Przyzywacz', slug: 'przyzywacz' },
  { name: 'Magua', slug: 'magua' },
  { name: 'Teza', slug: 'teza' },
  { name: 'Barbatos', slug: 'barbatos' },
  { name: 'Tanroth', slug: 'tanroth' },
] as const;

const navStyles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 240,
    minWidth: 240,
    background: '#1a1a2e',
    borderRight: '1px solid #2a2a4a',
    padding: '20px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  link: {
    display: 'block',
    padding: '12px 20px',
    color: '#aaa',
    textDecoration: 'none',
    fontSize: 14,
    transition: 'background 0.15s, color 0.15s',
  },
  linkActive: {
    background: 'rgba(52, 152, 219, 0.15)',
    color: '#3498db',
    borderLeft: '3px solid #3498db',
    paddingLeft: 17,
  },
  linkHover: {},
  dropdownTrigger: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '12px 20px',
    background: 'none',
    border: 'none',
    color: '#aaa',
    fontSize: 14,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.15s, color 0.15s',
  },
  dropdownTriggerOpen: {
    background: 'rgba(52, 152, 219, 0.1)',
    color: '#3498db',
  },
  sublink: {
    display: 'block',
    padding: '10px 20px 10px 32px',
    color: '#888',
    textDecoration: 'none',
    fontSize: 13,
    transition: 'background 0.15s, color 0.15s',
  },
  sublinkActive: {
    background: 'rgba(52, 152, 219, 0.12)',
    color: '#3498db',
  },
  chevron: {
    fontSize: 10,
    transition: 'transform 0.2s',
  },
};

export default function Navbar() {
  const pathname = usePathname();
  const [tytaniOpen, setTytaniOpen] = useState(() =>
    pathname.startsWith('/tytani')
  );

  const isHome = pathname === '/';
  const currentTytanSlug = pathname.startsWith('/tytani/')
    ? pathname.replace('/tytani/', '').split('/')[0]
    : null;

  return (
    <nav style={navStyles.sidebar}>
      <Link
        href="/"
        style={{
          ...navStyles.link,
          ...(isHome ? navStyles.linkActive : {}),
        }}
      >
        Home
      </Link>

      <div>
        <button
          type="button"
          style={{
            ...navStyles.dropdownTrigger,
            ...(tytaniOpen ? navStyles.dropdownTriggerOpen : {}),
          }}
          onClick={() => setTytaniOpen((o) => !o)}
        >
          <span>Tytani</span>
          <span
            style={{
              ...navStyles.chevron,
              transform: tytaniOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            ▼
          </span>
        </button>
        {tytaniOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {TYTANI.map(({ name, slug }) => {
              const href = `/tytani/${slug}`;
              const isActive = currentTytanSlug === slug;
              return (
                <Link
                  key={slug}
                  href={href}
                  style={{
                    ...navStyles.sublink,
                    ...(isActive ? navStyles.sublinkActive : {}),
                  }}
                >
                  {name}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
