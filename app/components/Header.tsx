'use client';

import { useAuth } from './AuthContext';

const styles: Record<string, React.CSSProperties> = {
    header: {
        position: 'sticky',
        top: 0,
        zIndex: 100,
        width: '100%',
        background: 'linear-gradient(90deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)',
        height: '80px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
    },
    title: {
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
    },
};

export default function Header() {
    const { logout } = useAuth();

    return (
        <header style={styles.header}>
            <h1 style={styles.title}>Peaky Blinders</h1>
            <button type="button" onClick={logout} style={styles.logoutBtn}>
                Wyloguj
            </button>
        </header>
    );
}
