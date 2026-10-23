'use client';

import { useEffect, useState } from 'react';

type Dashboard = {
  respawnMinMin: number;
  respawnMaxMin: number;
  respawn: { killedAt: number; minAt: number; maxAt: number } | null;
  serverNow: number;
};

const POLL_MS = 10_000;

const s: Record<string, React.CSSProperties> = {
  card: { background: '#16213e', borderRadius: 12, padding: 20, marginBottom: 16, border: '1px solid #2a2a4a' },
  title: { fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 12px' },
  status: { fontSize: 15, fontWeight: 600, marginBottom: 6 },
  meta: { color: '#8892b0', fontSize: 12 },
  barWrap: { height: 8, background: '#0f0f23', borderRadius: 4, overflow: 'hidden', margin: '10px 0 4px' },
};

function fmt(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m ? `${h}h ${m} min` : `${h}h`;
}

function respawnView(d: Dashboard, now: number) {
  const r = d.respawn;
  if (!r) return { color: '#8892b0', text: 'Brak zapisanego zabicia — czas respawnu nieznany', progress: null as number | null };
  if (now < r.minAt) {
    return { color: '#e74c3c', text: `Zabity ${fmt(now - r.killedAt)} temu · respawn najwcześniej za ${fmt(r.minAt - now)}`, progress: (now - r.killedAt) / (r.maxAt - r.killedAt) };
  }
  if (now < r.maxAt) {
    return { color: '#f1c40f', text: `Okno respawnu — może już stać · najpóźniej za ${fmt(r.maxAt - now)}`, progress: (now - r.killedAt) / (r.maxAt - r.killedAt) };
  }
  return { color: '#2ecc71', text: `Minął maksymalny czas respawnu (${fmt(now - r.maxAt)} temu) — heros powinien stać`, progress: 1 };
}

export default function EveLiveTimers({ eveKey }: { eveKey: number }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`/api/timer/eve-dashboard?eveKey=${eveKey}`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((j: Dashboard | null) => {
          if (!alive || !j) return;
          setOffset(j.serverNow - Date.now());
          setData(j);
        })
        .catch(() => {});
    load();
    const poll = setInterval(load, POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive = false;
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [eveKey]);

  if (!data) {
    return (
      <div style={s.card}>
        <p style={s.meta}>Ładowanie timera…</p>
      </div>
    );
  }

  const view = respawnView(data, now + offset);

  return (
    <div style={s.card}>
      <h2 style={s.title}>
        Respawn ({fmtMinutes(data.respawnMinMin)} – {fmtMinutes(data.respawnMaxMin)} od zabicia)
      </h2>
      <div style={{ ...s.status, color: view.color }}>{view.text}</div>
      {view.progress != null && (
        <div style={s.barWrap}>
          <div style={{ width: `${Math.min(100, view.progress * 100)}%`, height: '100%', background: view.color }} />
        </div>
      )}
    </div>
  );
}
