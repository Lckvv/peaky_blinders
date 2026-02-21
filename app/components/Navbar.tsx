'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from './AuthContext';

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
    position: 'fixed',
    left: 0,
    top: 80,
    width: 260,
    height: 'calc(100vh - 80px)',
    background: 'linear-gradient(180deg, #16213e 0%, #1a1a2e 100%)',
    borderRight: '1px solid #2a2a4a',
    padding: '24px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    boxShadow: '4px 0 24px rgba(0,0,0,0.2)',
    overflowY: 'auto',
    zIndex: 90,
  },
  navSection: {
    padding: '0 12px',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#5a6a8a',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    marginBottom: 6,
    paddingLeft: 12,
  },
  link: {
    display: 'block',
    padding: '12px 20px',
    color: '#b8c5d6',
    textDecoration: 'none',
    fontSize: 14,
    borderRadius: 8,
    marginBottom: 2,
    transition: 'background 0.15s, color 0.15s',
  },
  linkActive: {
    background: 'rgba(52, 152, 219, 0.2)',
    color: '#3498db',
    fontWeight: 600,
  },
  dropdownTrigger: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '12px 20px',
    background: 'none',
    border: 'none',
    color: '#b8c5d6',
    fontSize: 14,
    cursor: 'pointer',
    textAlign: 'left',
    borderRadius: 8,
    transition: 'background 0.15s, color 0.15s',
  },
  dropdownTriggerOpen: {
    background: 'rgba(52, 152, 219, 0.15)',
    color: '#3498db',
    fontWeight: 600,
  },
  sublink: {
    display: 'block',
    padding: '10px 20px 10px 36px',
    color: '#8892b0',
    textDecoration: 'none',
    fontSize: 13,
    borderRadius: 6,
    marginLeft: 8,
    marginBottom: 2,
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
  adminLink: {
    display: 'block',
    padding: '12px 20px',
    color: '#e67e22',
    textDecoration: 'none',
    fontSize: 14,
    borderRadius: 8,
    marginLeft: 12,
    marginRight: 12,
    marginBottom: 8,
    marginTop: 8,
    border: '1px solid rgba(230, 126, 34, 0.3)',
    transition: 'background 0.15s, color 0.15s',
  },
  adminLinkActive: {
    background: 'rgba(230, 126, 34, 0.15)',
    color: '#f39c12',
  },
};

export default function Navbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [tytaniOpen, setTytaniOpen] = useState(() =>
    pathname.startsWith('/tytani')
  );
  const [urodzinyOpen, setUrodzinyOpen] = useState(() =>
    pathname.startsWith('/2026')
  );

  const isHome = pathname === '/';
  const isAdmin = pathname.startsWith('/admin');
  const currentTytanSlug = pathname.startsWith('/tytani/')
    ? pathname.replace('/tytani/', '').split('/')[0]
    : null;

  return (
    <nav style={navStyles.sidebar}>
      <div style={navStyles.navSection}>
        <div style={navStyles.sectionLabel}>Nawigacja</div>
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
      </div>

      <div style={navStyles.navSection}>
        <Link
          href="/kupie"
          style={{
            ...navStyles.link,
            ...(pathname === '/kupie' ? navStyles.linkActive : {}),
          }}
        >
          Kupie
        </Link>
        <Link
          href="/sprzedam"
          style={{
            ...navStyles.link,
            ...(pathname === '/sprzedam' ? navStyles.linkActive : {}),
          }}
        >
          Sprzedam
        </Link>
        <div>
          <button
            type="button"
            style={{
              ...navStyles.dropdownTrigger,
              ...(urodzinyOpen ? navStyles.dropdownTriggerOpen : {}),
            }}
            onClick={() => setUrodzinyOpen((o) => !o)}
          >
            <span>2026</span>
            <span style={{ ...navStyles.chevron, transform: urodzinyOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </button>
          {urodzinyOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <Link href="/2026/20urodziny" style={{ ...navStyles.sublink, ...(pathname === '/2026/20urodziny' ? navStyles.sublinkActive : {}) }}>20 urodziny</Link>
              <Link href="/2026/20urodziny/seeker-of-creation" style={{ ...navStyles.sublink, ...(pathname === '/2026/20urodziny/seeker-of-creation' ? navStyles.sublinkActive : {}) }}>63 - Seeker of Creation</Link>
              <Link href="/2026/20urodziny/harbinger-of-elancia" style={{ ...navStyles.sublink, ...(pathname === '/2026/20urodziny/harbinger-of-elancia' ? navStyles.sublinkActive : {}) }}>143 - Harbinger of Elancia</Link>
              <Link href="/2026/20urodziny/thunder-wielding-barbarian" style={{ ...navStyles.sublink, ...(pathname === '/2026/20urodziny/thunder-wielding-barbarian' ? navStyles.sublinkActive : {}) }}>300 - Thunder-Wielding Barbarian</Link>
            </div>
          )}
        </div>
      </div>

      <div style={navStyles.navSection}>
        {(user?.role === 'admin' || user?.role === 'koordynator') && (
          <Link
            href="/admin/rezerwacje"
            style={{
              ...navStyles.adminLink,
              ...(pathname === '/admin/rezerwacje' ? navStyles.adminLinkActive : {}),
            }}
          >
            ⚙ Rezerwacje
          </Link>
        )}
        {user?.role === 'admin' && (
          <>
            <Link
              href="/admin"
              style={{
                ...navStyles.adminLink,
                ...(pathname === '/admin' ? navStyles.adminLinkActive : {}),
              }}
            >
              ⚙ Admin — Fazy
            </Link>
            <Link
              href="/admin/panel"
              style={{
                ...navStyles.adminLink,
                ...(pathname === '/admin/panel' ? navStyles.adminLinkActive : {}),
              }}
            >
              ⚙ Admin Panel
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
