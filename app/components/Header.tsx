'use client';

import { useAuth } from './AuthContext';

type HeaderProps = {
  isMobile?: boolean;
  onMenuClick?: () => void;
};

export default function Header({ isMobile, onMenuClick }: HeaderProps) {
  const { logout } = useAuth();

  return (
    <header className="gos-header">
      {isMobile ? (
        <button type="button" className="gos-header__menu" onClick={onMenuClick} aria-label="Otwórz menu">
          <span />
          <span />
          <span />
        </button>
      ) : (
        <div className="gos-header__spacer" />
      )}
      <h1 className="gos-header__title">Guardians of Souls</h1>
      <button type="button" className="gos-header__logout" onClick={logout}>
        Wyloguj
      </button>
    </header>
  );
}
