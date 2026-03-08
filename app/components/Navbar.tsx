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
    gap: 12,
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
  sublink2: {
    display: 'block',
    padding: '8px 20px 8px 48px',
    color: '#8892b0',
    textDecoration: 'none',
    fontSize: 13,
    borderRadius: 6,
    marginLeft: 8,
    marginBottom: 2,
    transition: 'background 0.15s, color 0.15s',
  },
  sublink2Active: {
    background: 'rgba(52, 152, 219, 0.12)',
    color: '#3498db',
  },
  sublink3: {
    display: 'block',
    padding: '8px 20px 8px 60px',
    color: '#8892b0',
    textDecoration: 'none',
    fontSize: 13,
    borderRadius: 6,
    marginLeft: 8,
    marginBottom: 2,
    transition: 'background 0.15s, color 0.15s',
  },
  sublink3Active: {
    background: 'rgba(52, 152, 219, 0.12)',
    color: '#3498db',
  },
  chevron: {
    fontSize: 10,
    transition: 'transform 0.2s',
    flexShrink: 0,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 95,
    opacity: 0,
    pointerEvents: 'none' as const,
    transition: 'opacity 0.2s ease',
  },
  overlayVisible: {
    opacity: 1,
    pointerEvents: 'auto' as const,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontSize: 20,
    cursor: 'pointer',
    lineHeight: 1,
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
  superAdminLink: {
    display: 'block',
    padding: '10px 20px 10px 36px',
    color: '#9b59b6',
    textDecoration: 'none',
    fontSize: 13,
    borderRadius: 6,
    marginLeft: 8,
    marginBottom: 2,
    transition: 'background 0.15s, color 0.15s',
  },
  superAdminLinkActive: {
    background: 'rgba(155, 89, 182, 0.2)',
    color: '#bb8fce',
  },
};

type NavbarProps = {
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
};

export default function Navbar({ isMobile, isOpen, onClose }: NavbarProps = {}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [tytaniOpen, setTytaniOpen] = useState(() =>
    pathname.startsWith('/tytani')
  );
  const [eventOpen, setEventOpen] = useState(() =>
    pathname.startsWith('/2026')
  );
  const [year2026Open, setYear2026Open] = useState(() =>
    pathname.startsWith('/2026')
  );
  const [urodziny20Open, setUrodziny20Open] = useState(() =>
    pathname.startsWith('/2026/20urodziny')
  );
  const [logsOpen, setLogsOpen] = useState(() => pathname.startsWith('/admin/logs'));

  const isHome = pathname === '/';
  const isAdmin = pathname.startsWith('/admin');
  const currentTytanSlug = pathname.startsWith('/tytani/')
    ? pathname.replace('/tytani/', '').split('/')[0]
    : null;

  const sidebarStyle: React.CSSProperties = {
    ...navStyles.sidebar,
    ...(isMobile
      ? {
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease-out',
          top: 80,
          height: 'calc(100vh - 80px)',
          zIndex: 96,
        }
      : {}),
  };

  return (
    <>
      {isMobile && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Zamknij menu"
          style={{
            ...navStyles.overlay,
            ...(isOpen ? navStyles.overlayVisible : {}),
          }}
          onClick={onClose}
          onKeyDown={(e) => e.key === 'Enter' && onClose?.()}
        />
      )}
      <nav style={sidebarStyle} className="nav-sidebar">
        <style>{`
          .nav-sidebar .nav-link:hover { background: rgba(52, 152, 219, 0.15); color: #3498db; }
          .nav-sidebar .nav-dropdown-trigger:hover { background: rgba(52, 152, 219, 0.12); color: #3498db; }
          .nav-sidebar .nav-sublink:hover { background: rgba(52, 152, 219, 0.1); color: #3498db; }
          .nav-sidebar .nav-sublink3:hover { background: rgba(52, 152, 219, 0.1); color: #3498db; }
          .nav-sidebar .nav-admin-link:hover { background: rgba(230, 126, 34, 0.2); color: #f39c12; }
          .nav-sidebar .nav-super-admin-link:hover { background: rgba(155, 89, 182, 0.25); color: #bb8fce; }
          .nav-sidebar .nav-close-btn:hover { background: rgba(255,255,255,0.2); }
        `}</style>
        {isMobile && (
          <button
            type="button"
            className="nav-close-btn"
            style={navStyles.closeBtn}
            onClick={onClose}
            aria-label="Zamknij menu"
          >
            ×
          </button>
        )}
        <div style={{ ...navStyles.navSection, ...(isMobile ? { paddingTop: 48 } : {}) }}>
          <div style={navStyles.sectionLabel}>Nawigacja</div>
          <Link
            href="/"
            className="nav-link"
            style={{
              ...navStyles.link,
              ...(isHome ? navStyles.linkActive : {}),
            }}
            onClick={onClose}
          >
            Home
          </Link>

        <div>
          <button
            type="button"
            className="nav-dropdown-trigger"
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
                    className="nav-sublink"
                    style={{
                      ...navStyles.sublink,
                      ...(isActive ? navStyles.sublinkActive : {}),
                    }}
                    onClick={onClose}
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
          className="nav-link"
          style={{
            ...navStyles.link,
            ...(pathname === '/kupie' ? navStyles.linkActive : {}),
          }}
          onClick={onClose}
        >
          Kupie
        </Link>
        <Link
          href="/sprzedam"
          className="nav-link"
          style={{
            ...navStyles.link,
            ...(pathname === '/sprzedam' ? navStyles.linkActive : {}),
          }}
          onClick={onClose}
        >
          Sprzedam
        </Link>
        <div>
          <button
            type="button"
            className="nav-dropdown-trigger"
            style={{
              ...navStyles.dropdownTrigger,
              ...(eventOpen ? navStyles.dropdownTriggerOpen : {}),
            }}
            onClick={() => setEventOpen((o) => !o)}
          >
            <span>Event</span>
            <span style={{ ...navStyles.chevron, transform: eventOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </button>
          {eventOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <button
                type="button"
                className="nav-dropdown-trigger"
                style={{
                  ...navStyles.dropdownTrigger,
                  ...navStyles.sublink,
                  padding: '10px 20px 10px 36px',
                  ...(year2026Open ? navStyles.dropdownTriggerOpen : {}),
                }}
                onClick={() => setYear2026Open((o) => !o)}
              >
                <span>2026</span>
                <span style={{ ...navStyles.chevron, transform: year2026Open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
              </button>
              {year2026Open && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <button
                    type="button"
                    className="nav-dropdown-trigger"
                    style={{
                      ...navStyles.dropdownTrigger,
                      ...navStyles.sublink,
                      padding: '10px 20px 10px 36px',
                      ...(urodziny20Open ? navStyles.dropdownTriggerOpen : {}),
                    }}
                    onClick={() => setUrodziny20Open((o) => !o)}
                  >
                    <span>20 urodziny</span>
                    <span style={{ ...navStyles.chevron, transform: urodziny20Open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                  </button>
                  {urodziny20Open && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      <Link href="/2026/20urodziny" className="nav-sublink3" style={{ ...navStyles.sublink3, ...(pathname === '/2026/20urodziny' ? navStyles.sublink3Active : {}) }} onClick={onClose}>Strona główna</Link>
                      <Link href="/2026/20urodziny/seeker-of-creation" className="nav-sublink3" style={{ ...navStyles.sublink3, ...(pathname === '/2026/20urodziny/seeker-of-creation' ? navStyles.sublink3Active : {}) }} onClick={onClose}>63 - Seeker of Creation</Link>
                      <Link href="/2026/20urodziny/harbinger-of-elancia" className="nav-sublink3" style={{ ...navStyles.sublink3, ...(pathname === '/2026/20urodziny/harbinger-of-elancia' ? navStyles.sublink3Active : {}) }} onClick={onClose}>143 - Harbinger of Elancia</Link>
                      <Link href="/2026/20urodziny/thunder-wielding-barbarian" className="nav-sublink3" style={{ ...navStyles.sublink3, ...(pathname === '/2026/20urodziny/thunder-wielding-barbarian' ? navStyles.sublink3Active : {}) }} onClick={onClose}>300 - Thunder-Wielding Barbarian</Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={navStyles.navSection}>
        {(user?.role === 'admin' || user?.role === 'koordynator' || user?.role === 'super_admin') && (
          <Link
            href="/admin/rezerwacje"
            className="nav-admin-link"
            style={{
              ...navStyles.adminLink,
              ...(pathname === '/admin/rezerwacje' ? navStyles.adminLinkActive : {}),
            }}
            onClick={onClose}
          >
            ⚙ Rezerwacje
          </Link>
        )}
        {(user?.role === 'admin' || user?.role === 'koordynator' || user?.role === 'super_admin') && (
          <Link
            href="/admin"
            className="nav-admin-link"
            style={{
              ...navStyles.adminLink,
              ...(pathname === '/admin' ? navStyles.adminLinkActive : {}),
            }}
            onClick={onClose}
          >
            ⚙ Fazy
          </Link>
        )}
        {(user?.role === 'admin' || user?.role === 'super_admin') && (
          <Link
            href="/admin/panel"
            className="nav-admin-link"
            style={{
              ...navStyles.adminLink,
              ...(pathname === '/admin/panel' ? navStyles.adminLinkActive : {}),
            }}
            onClick={onClose}
          >
            ⚙ Admin Panel
          </Link>
        )}
        {user?.role === 'super_admin' && (
          <div>
            <button
              type="button"
              className="nav-dropdown-trigger"
              style={{
                ...navStyles.dropdownTrigger,
                ...(logsOpen ? navStyles.dropdownTriggerOpen : {}),
                color: '#9b59b6',
              }}
              onClick={() => setLogsOpen((o) => !o)}
            >
              <span>📋 Logs</span>
              <span style={{ ...navStyles.chevron, transform: logsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
            </button>
            {logsOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <Link
                  href="/admin/logs/discord"
                  className="nav-super-admin-link"
                  style={{
                    ...navStyles.superAdminLink,
                    ...(pathname === '/admin/logs/discord' ? navStyles.superAdminLinkActive : {}),
                  }}
                  onClick={onClose}
                >
                  Logs Discord
                </Link>
                <Link
                  href="/admin/logs/margonem"
                  className="nav-super-admin-link"
                  style={{
                    ...navStyles.superAdminLink,
                    ...(pathname === '/admin/logs/margonem' ? navStyles.superAdminLinkActive : {}),
                  }}
                  onClick={onClose}
                >
                  Logs Margonem
                </Link>
                <Link
                  href="/admin/logs/chat"
                  className="nav-super-admin-link"
                  style={{
                    ...navStyles.superAdminLink,
                    ...(pathname === '/admin/logs/chat' ? navStyles.superAdminLinkActive : {}),
                  }}
                  onClick={onClose}
                >
                  Logs Chat
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
    </>
  );
}
