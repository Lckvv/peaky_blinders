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

function cx(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(' ');
}

type NavbarProps = {
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
};

export default function Navbar({ isMobile, isOpen, onClose }: NavbarProps = {}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [tytaniOpen, setTytaniOpen] = useState(() => pathname.startsWith('/tytani'));
  const [eventOpen, setEventOpen] = useState(() => pathname.startsWith('/2026'));
  const [year2026Open, setYear2026Open] = useState(() => pathname.startsWith('/2026'));
  const [urodziny20Open, setUrodziny20Open] = useState(() => pathname.startsWith('/2026/20urodziny'));
  const [easterOpen, setEasterOpen] = useState(() => pathname.startsWith('/2026/easter'));
  const [logsOpen, setLogsOpen] = useState(() => pathname.startsWith('/admin/logs'));

  const isHome = pathname === '/';
  const currentTytanSlug = pathname.startsWith('/tytani/')
    ? pathname.replace('/tytani/', '').split('/')[0]
    : null;

  const canPhases = user?.role === 'admin' || user?.role === 'koordynator' || user?.role === 'super_admin';
  const canAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <>
      {isMobile && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Zamknij menu"
          className={cx('gos-nav__overlay', isOpen && 'is-visible')}
          onClick={onClose}
          onKeyDown={(e) => e.key === 'Enter' && onClose?.()}
        />
      )}
      <nav className={cx('gos-nav', isMobile && isOpen && 'is-open')} aria-label="Nawigacja klanu">
        {isMobile && (
          <button type="button" className="gos-nav__close" onClick={onClose} aria-label="Zamknij menu">
            ×
          </button>
        )}

        <div className={cx('gos-nav__section', isMobile && 'gos-nav__section--mobile')}>
          <p className="gos-nav__label">Nawigacja</p>
          <Link href="/" className={cx('gos-nav__item', isHome && 'is-active')} onClick={onClose}>
            Home
          </Link>

          <button
            type="button"
            className={cx('gos-nav__item', tytaniOpen && 'is-open', pathname.startsWith('/tytani') && 'is-active')}
            onClick={() => setTytaniOpen((o) => !o)}
          >
            <span>Tytani</span>
            <span className={cx('gos-nav__chevron', tytaniOpen && 'is-open')}>▼</span>
          </button>
          {tytaniOpen &&
            TYTANI.map(({ name, slug }) => (
              <Link
                key={slug}
                href={`/tytani/${slug}`}
                className={cx('gos-nav__item', 'gos-nav__item--sub', currentTytanSlug === slug && 'is-active')}
                onClick={onClose}
              >
                {name}
              </Link>
            ))}
        </div>

        <div className="gos-nav__section">
          <Link
            href="/kupie"
            className={cx('gos-nav__item', pathname === '/kupie' && 'is-active')}
            onClick={onClose}
          >
            Kupie
          </Link>
          <Link
            href="/sprzedam"
            className={cx('gos-nav__item', pathname === '/sprzedam' && 'is-active')}
            onClick={onClose}
          >
            Sprzedam
          </Link>

          <button
            type="button"
            className={cx('gos-nav__item', eventOpen && 'is-open', pathname.startsWith('/2026') && 'is-active')}
            onClick={() => setEventOpen((o) => !o)}
          >
            <span>Event</span>
            <span className={cx('gos-nav__chevron', eventOpen && 'is-open')}>▼</span>
          </button>
          {eventOpen && (
            <>
              <button
                type="button"
                className={cx('gos-nav__item', 'gos-nav__item--sub', year2026Open && 'is-open', pathname.startsWith('/2026') && 'is-active')}
                onClick={() => setYear2026Open((o) => !o)}
              >
                <span>2026</span>
                <span className={cx('gos-nav__chevron', year2026Open && 'is-open')}>▼</span>
              </button>
              {year2026Open && (
                <>
                  <button
                    type="button"
                    className={cx('gos-nav__item', 'gos-nav__item--sub2', urodziny20Open && 'is-open', pathname.startsWith('/2026/20urodziny') && 'is-active')}
                    onClick={() => setUrodziny20Open((o) => !o)}
                  >
                    <span>20 urodziny</span>
                    <span className={cx('gos-nav__chevron', urodziny20Open && 'is-open')}>▼</span>
                  </button>
                  {urodziny20Open && (
                    <>
                      <Link href="/2026/20urodziny" className={cx('gos-nav__item', 'gos-nav__item--sub3', pathname === '/2026/20urodziny' && 'is-active')} onClick={onClose}>Strona główna</Link>
                      <Link href="/2026/20urodziny/seeker-of-creation" className={cx('gos-nav__item', 'gos-nav__item--sub3', pathname === '/2026/20urodziny/seeker-of-creation' && 'is-active')} onClick={onClose}>63 - Seeker of Creation</Link>
                      <Link href="/2026/20urodziny/harbinger-of-elancia" className={cx('gos-nav__item', 'gos-nav__item--sub3', pathname === '/2026/20urodziny/harbinger-of-elancia' && 'is-active')} onClick={onClose}>143 - Harbinger of Elancia</Link>
                      <Link href="/2026/20urodziny/thunder-wielding-barbarian" className={cx('gos-nav__item', 'gos-nav__item--sub3', pathname === '/2026/20urodziny/thunder-wielding-barbarian' && 'is-active')} onClick={onClose}>300 - Thunder-Wielding Barbarian</Link>
                    </>
                  )}
                  <button
                    type="button"
                    className={cx('gos-nav__item', 'gos-nav__item--sub2', easterOpen && 'is-open', pathname.startsWith('/2026/easter') && 'is-active')}
                    onClick={() => setEasterOpen((o) => !o)}
                  >
                    <span>Easter (statystyki)</span>
                    <span className={cx('gos-nav__chevron', easterOpen && 'is-open')}>▼</span>
                  </button>
                  {easterOpen && (
                    <>
                      <Link href="/2026/easter" className={cx('gos-nav__item', 'gos-nav__item--sub3', pathname === '/2026/easter' && 'is-active')} onClick={onClose}>Strona główna</Link>
                      <Link href="/2026/easter/hotblood-capon" className={cx('gos-nav__item', 'gos-nav__item--sub3', pathname === '/2026/easter/hotblood-capon' && 'is-active')} onClick={onClose}>81 - Hotblood Capon</Link>
                      <Link href="/2026/easter/grim-blackcluck" className={cx('gos-nav__item', 'gos-nav__item--sub3', pathname === '/2026/easter/grim-blackcluck' && 'is-active')} onClick={onClose}>41 - Grim Blackcluck</Link>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {(canPhases || canAdmin || user?.role === 'super_admin') && (
          <div className="gos-nav__section">
            <p className="gos-nav__label">Administracja</p>
            {canPhases && (
              <Link
                href="/admin/rezerwacje"
                className={cx('gos-nav__item', 'gos-nav__item--admin', pathname === '/admin/rezerwacje' && 'is-active')}
                onClick={onClose}
              >
                Rezerwacje
              </Link>
            )}
            {canPhases && (
              <Link
                href="/admin"
                className={cx('gos-nav__item', 'gos-nav__item--admin', pathname === '/admin' && 'is-active')}
                onClick={onClose}
              >
                Fazy
              </Link>
            )}
            {canAdmin && (
              <Link
                href="/admin/panel"
                className={cx('gos-nav__item', 'gos-nav__item--admin', pathname === '/admin/panel' && 'is-active')}
                onClick={onClose}
              >
                Admin Panel
              </Link>
            )}
            {canAdmin && (
              <Link
                href="/admin/ustawienia"
                className={cx('gos-nav__item', 'gos-nav__item--admin', pathname === '/admin/ustawienia' && 'is-active')}
                onClick={onClose}
              >
                Ustawienia poczty
              </Link>
            )}
            {user?.role === 'super_admin' && (
              <>
                <button
                  type="button"
                  className={cx('gos-nav__item', 'gos-nav__item--logs', logsOpen && 'is-open', pathname.startsWith('/admin/logs') && 'is-active')}
                  onClick={() => setLogsOpen((o) => !o)}
                >
                  <span>Logs</span>
                  <span className={cx('gos-nav__chevron', logsOpen && 'is-open')}>▼</span>
                </button>
                {logsOpen && (
                  <>
                    <Link href="/admin/logs/discord" className={cx('gos-nav__item', 'gos-nav__item--sub', 'gos-nav__item--logs', pathname === '/admin/logs/discord' && 'is-active')} onClick={onClose}>Logs Discord</Link>
                    <Link href="/admin/logs/margonem" className={cx('gos-nav__item', 'gos-nav__item--sub', 'gos-nav__item--logs', pathname === '/admin/logs/margonem' && 'is-active')} onClick={onClose}>Logs Margonem</Link>
                    <Link href="/admin/logs/chat" className={cx('gos-nav__item', 'gos-nav__item--sub', 'gos-nav__item--logs', pathname === '/admin/logs/chat' && 'is-active')} onClick={onClose}>Logs Chat</Link>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </nav>
    </>
  );
}
