'use client';

import { useAuth } from './AuthContext';

const styles: Record<string, React.CSSProperties> = {
    header: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        width: '100%',
        boxSizing: 'border-box',
        background: 'linear-gradient(90deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)',
        height: 80,
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
    },
    hamburger: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 5,
        width: 40,
        height: 40,
        padding: 8,
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 8,
        cursor: 'pointer',
        flexShrink: 0,
    },
    hamburgerLine: {
        width: '100%',
        height: 2,
        background: '#fff',
        borderRadius: 1,
    },
    headerSpacer: {
        width: 40,
        flexShrink: 0,
    },
    title: {
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        margin: 0,
        fontSize: 28,
        fontWeight: 700,
        color: '#fff',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        textShadow: '0 2px 8px rgba(0,0,0,0.3)',
    },
    logoutBtn: {
        padding: '8px 16px',
        background: 'rgba(231, 76, 60, 0.2)',
        color: '#e74c3c',
        border: '1px solid rgba(231, 76, 60, 0.4)',
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        flexShrink: 0,
    },
};

type HeaderProps = {
    isMobile?: boolean;
    onMenuClick?: () => void;
};

export default function Header({ isMobile, onMenuClick }: HeaderProps) {
    const { logout } = useAuth();

    return (
        <header style={styles.header}>
            {isMobile ? (
                <button
                    type="button"
                    onClick={onMenuClick}
                    style={styles.hamburger}
                    aria-label="Otwórz menu"
                >
                    <span style={styles.hamburgerLine} />
                    <span style={styles.hamburgerLine} />
                    <span style={styles.hamburgerLine} />
                </button>
            ) : (
                <div style={styles.headerSpacer} />
            )}
            <h1 style={styles.title}>Peaky Blinders</h1>
            <button type="button" onClick={logout} style={styles.logoutBtn}>
                Wyloguj
            </button>
        </header>
    );
}
