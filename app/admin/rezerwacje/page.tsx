'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RESERVATION_TITANS,
  RESERVATION_PRIORITIES,
  getReservationItems,
  getItemImagePath,
} from '@/lib/reservations';

type Reservation = {
  id: string;
  titanSlug: string;
  itemKey: string;
  nick: string;
  priority: number;
};

const s: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 900,
    margin: '0 auto',
    padding: '32px 24px',
    fontFamily: 'system-ui, sans-serif',
  },
  title: { fontSize: 26, margin: '0 0 8px', color: '#fff' },
  sub: { color: '#8892b0', fontSize: 14, margin: '0 0 24px', lineHeight: 1.5 },
  tabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 24,
    borderBottom: '1px solid #2a2a4a',
  },
  tab: {
    padding: '12px 16px',
    background: 'none',
    border: 'none',
    color: '#8892b0',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    borderBottom: '3px solid transparent',
    marginBottom: -1,
    transition: 'color 0.2s, border-color 0.2s',
  },
  tabActive: { color: '#3498db', borderBottomColor: '#3498db' },
  card: {
    background: '#16213e',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    border: '1px solid #2a2a4a',
  },
  subTabs: {
    display: 'flex',
    width: '100%',
    gap: 8,
    marginBottom: 16,
  },
  subTab: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '10px 8px',
    background: '#1a1a2e',
    border: '1px solid #2a2a4a',
    borderRadius: 8,
    cursor: 'pointer',
    color: '#b8c5d6',
    fontSize: 13,
    transition: 'border-color 0.2s, background 0.2s',
    minWidth: 0,
  },
  subTabOpen: { borderColor: '#3498db', background: 'rgba(52, 152, 219, 0.1)' },
  itemImg: { width: 28, height: 28, objectFit: 'contain', flexShrink: 0 },
  selectedPreview: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    minHeight: 48,
  },
  selectedGifWrap: {
    position: 'relative' as const,
    display: 'inline-block',
    width: 32,
    height: 32,
  },
  selectedGif: { width: 32, height: 32, objectFit: 'contain', display: 'block' },
  hoverPngPopup: {
    position: 'absolute' as const,
    left: '50%',
    bottom: '100%',
    transform: 'translateX(-50%) translateY(-8px)',
    zIndex: 100,
    padding: 6,
    background: '#1a1a2e',
    border: '1px solid #2a2a4a',
    borderRadius: 8,
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    pointerEvents: 'none',
  },
  hoverPngImg: { width: 64, height: 64, objectFit: 'contain', display: 'block' },
  tableWrap: { marginTop: 0, minWidth: 0 },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '1fr 140px 1fr',
    gap: 12,
    padding: '12px 16px',
    background: '#0f0f23',
    borderRadius: 8,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: 700,
    color: '#8892b0',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 140px 1fr',
    gap: 12,
    alignItems: 'center',
    padding: '12px 16px',
    background: '#1a1a2e',
    borderRadius: 8,
    marginBottom: 8,
    fontSize: 14,
    color: '#ccc',
    borderLeft: '4px solid transparent',
  },
  rowActions: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    minWidth: 0,
    justifyContent: 'flex-end',
  },
  addForm: {
    display: 'grid',
    gridTemplateColumns: '1fr 160px auto',
    gap: 12,
    alignItems: 'end',
    marginTop: 16,
    padding: 16,
    background: '#0f0f23',
    borderRadius: 8,
  },
  input: {
    padding: '10px 12px',
    background: '#1a1a2e',
    border: '1px solid #2a2a4a',
    borderRadius: 8,
    color: '#fff',
    fontSize: 14,
  },
  select: {
    padding: '10px 12px',
    background: '#1a1a2e',
    border: '1px solid #2a2a4a',
    borderRadius: 8,
    color: '#fff',
    fontSize: 14,
    cursor: 'pointer',
  },
  btn: {
    padding: '10px 18px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  },
  btnPrimary: { background: '#27ae60', color: '#fff' },
  btnSmall: { padding: '6px 12px', fontSize: 12 },
  btnDanger: { background: '#c0392b', color: '#fff' },
  btnSecondary: { background: '#34495e', color: '#fff' },
  empty: { textAlign: 'center', padding: 32, color: '#8892b0', fontSize: 14 },
  forbidden: { textAlign: 'center', padding: 48, color: '#e74c3c', fontSize: 16 },
  later: { color: '#8892b0', fontSize: 14, fontStyle: 'italic' },
};

/** Obrazek 32x32 GIF wybranego itemu (między podzakładkami a tabelą); przy hover — okienko z PNG. */
function SelectedItemPreview({
  titanSlug,
  itemKey,
  label,
}: {
  titanSlug: string;
  itemKey: string;
  label: string;
}) {
  const [hover, setHover] = useState(false);
  const gifPath = getItemImagePath(titanSlug, itemKey, 'gif');
  const pngPath = getItemImagePath(titanSlug, itemKey, 'png');
  if (!gifPath) return null;
  return (
    <div style={s.selectedPreview}>
      <span
        style={s.selectedGifWrap}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <img src={gifPath} alt={label} style={s.selectedGif} />
        {pngPath && hover && (
          <span style={s.hoverPngPopup}>
            <img src={pngPath} alt="" role="presentation" style={s.hoverPngImg} />
          </span>
        )}
      </span>
    </div>
  );
}

export default function AdminRezerwacjePage() {
  const [activeTitan, setActiveTitan] = useState<string>(RESERVATION_TITANS[0].slug);
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [addNick, setAddNick] = useState('');
  const [addPriority, setAddPriority] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNick, setEditNick] = useState('');
  const [editPriority, setEditPriority] = useState(1);

  const items = getReservationItems(activeTitan);
  const hasItems = items.length > 0;

  const loadReservations = useCallback(async (titanSlug: string, itemKey: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/reservations?titanSlug=${encodeURIComponent(titanSlug)}&itemKey=${encodeURIComponent(itemKey)}`
      );
      if (res.status === 403 || res.status === 401) {
        setForbidden(true);
        setReservations([]);
        return;
      }
      if (!res.ok) throw new Error('Błąd ładowania');
      const data = await res.json();
      setReservations(data.reservations ?? []);
    } catch {
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (forbidden) return;
    if (activeTitan && openItem) loadReservations(activeTitan, openItem);
    else setReservations([]);
  }, [activeTitan, openItem, loadReservations, forbidden]);

  const handleAdd = async () => {
    const nick = addNick.trim();
    if (!nick || !openItem) return;
    try {
      const res = await fetch('/api/admin/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titanSlug: activeTitan,
          itemKey: openItem,
          nick,
          priority: addPriority,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Błąd dodawania');
        return;
      }
      setAddNick('');
      setAddPriority(1);
      if (openItem) loadReservations(activeTitan, openItem);
    } catch (e) {
      alert('Błąd: ' + e);
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    try {
      const res = await fetch(`/api/admin/reservations/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nick: editNick.trim(), priority: editPriority }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Błąd zapisu');
        return;
      }
      setEditingId(null);
      if (openItem) loadReservations(activeTitan, openItem);
    } catch (e) {
      alert('Błąd: ' + e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Usunąć tę rezerwację?')) return;
    try {
      const res = await fetch(`/api/admin/reservations/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Błąd usuwania');
        return;
      }
      if (openItem) loadReservations(activeTitan, openItem);
    } catch (e) {
      alert('Błąd: ' + e);
    }
  };

  const startEdit = (r: Reservation) => {
    setEditingId(r.id);
    setEditNick(r.nick);
    setEditPriority(r.priority);
  };

  const priorityColor = (p: number) => RESERVATION_PRIORITIES.find((x) => x.value === p)?.color ?? 'transparent';
  const priorityLabel = (p: number) => RESERVATION_PRIORITIES.find((x) => x.value === p)?.label ?? '';

  if (forbidden) {
    return (
      <div style={s.container}>
        <div style={s.card}>
          <p style={s.forbidden}>Brak dostępu. Tylko administrator może zarządzać rezerwacjami.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <h1 style={s.title}>Panel admina — Rezerwacje</h1>

      <div style={s.tabs}>
        {RESERVATION_TITANS.map((t) => (
          <button
            key={t.slug}
            type="button"
            style={{ ...s.tab, ...(activeTitan === t.slug ? s.tabActive : {}) }}
            onClick={() => {
              setActiveTitan(t.slug);
              setOpenItem(null);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={s.card}>
        {!hasItems ? (
          <p style={s.later}>Zakładki dla tego tytana będą uzupełnione później.</p>
        ) : (
          <>
            <div style={s.subTabs}>
              {items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  style={{
                    ...s.subTab,
                    ...(openItem === item.key ? s.subTabOpen : {}),
                  }}
                  onClick={() => setOpenItem(openItem === item.key ? null : item.key)}
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {openItem && (
              <>
                <SelectedItemPreview
                  titanSlug={activeTitan}
                  itemKey={openItem}
                  label={items.find((i) => i.key === openItem)?.label ?? openItem}
                />
                <div style={s.tableWrap}>
                <div style={s.tableHeader}>
                  <span>Nick</span>
                  <span>Priorytet</span>
                  <span>Akcje</span>
                </div>
                {loading ? (
                  <p style={s.empty}>Ładowanie…</p>
                ) : (
                  <>
                    {reservations.map((r) => (
                      <div
                        key={r.id}
                        style={{
                          ...s.row,
                          borderLeftColor: priorityColor(r.priority),
                        }}
                      >
                        {editingId === r.id ? (
                          <>
                            <input
                              type="text"
                              value={editNick}
                              onChange={(e) => setEditNick(e.target.value)}
                              style={s.input}
                              placeholder="Nick"
                            />
                            <select
                              value={editPriority}
                              onChange={(e) => setEditPriority(Number(e.target.value))}
                              style={s.select}
                            >
                              {RESERVATION_PRIORITIES.map((p) => (
                                <option key={p.value} value={p.value}>
                                  {p.label}
                                </option>
                              ))}
                            </select>
                            <div style={s.rowActions}>
                              <button
                                type="button"
                                style={{ ...s.btn, ...s.btnPrimary, ...s.btnSmall }}
                                onClick={handleUpdate}
                              >
                                Zapisz
                              </button>
                              <button
                                type="button"
                                style={{ ...s.btn, ...s.btnSecondary, ...s.btnSmall }}
                                onClick={() => setEditingId(null)}
                              >
                                Anuluj
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span>{r.nick}</span>
                            <span title={priorityLabel(r.priority)}>{priorityLabel(r.priority)}</span>
                            <div style={s.rowActions}>
                              <button
                                type="button"
                                style={{ ...s.btn, ...s.btnSecondary, ...s.btnSmall }}
                                onClick={() => startEdit(r)}
                              >
                                Edytuj
                              </button>
                              <button
                                type="button"
                                style={{ ...s.btn, ...s.btnDanger, ...s.btnSmall }}
                                onClick={() => handleDelete(r.id)}
                              >
                                Usuń
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    <div style={s.addForm}>
                      <input
                        type="text"
                        value={addNick}
                        onChange={(e) => setAddNick(e.target.value)}
                        style={s.input}
                        placeholder="Nick"
                      />
                      <select
                        value={addPriority}
                        onChange={(e) => setAddPriority(Number(e.target.value))}
                        style={s.select}
                      >
                        {RESERVATION_PRIORITIES.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                      <button type="button" style={{ ...s.btn, ...s.btnPrimary }} onClick={handleAdd}>
                        Dodaj
                      </button>
                    </div>
                  </>
                )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
