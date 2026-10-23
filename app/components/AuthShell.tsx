'use client';

import { ReactNode } from 'react';

export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="gos-auth">
      <style>{authCss}</style>
      <div className="gos-auth__bg" aria-hidden="true" />
      <div className="gos-auth__veil" aria-hidden="true" />
      <div className="gos-auth__orbs" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="gos-auth__layout">
        <section className="gos-auth__brand">
          <p className="gos-auth__kicker">Klan Margonem</p>
          <h1 className="gos-auth__title">Guardians of Souls</h1>
          <p className="gos-auth__lead">
            Wejdź do panelu klanu — timery, rankingi i rezerwacje w jednym miejscu.
          </p>
        </section>
        <section className="gos-auth__panel">{children}</section>
      </div>
    </div>
  );
}

const authCss = `
.gos-auth {
  --gold: #e3c36a;
  --gold-deep: #b8892d;
  --ink: #f6f1e4;
  --muted: #c4bba8;
  min-height: 100vh;
  width: 100%;
  box-sizing: border-box;
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;
  display: flex;
  align-items: stretch;
  font-family: var(--font-outfit), Outfit, system-ui, sans-serif;
  color: var(--ink);
}

.gos-auth__bg {
  position: absolute;
  inset: 0;
  background:
    url('/login-bg.jpg') center / cover no-repeat;
  transform: scale(1.06);
  animation: gos-kenburns 28s ease-in-out infinite alternate;
}

.gos-auth__veil {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(4, 7, 14, 0.88) 0%, rgba(8, 12, 22, 0.72) 46%, rgba(6, 9, 16, 0.55) 100%),
    radial-gradient(ellipse at 20% 80%, rgba(184, 137, 45, 0.22), transparent 42%),
    radial-gradient(ellipse at 80% 20%, rgba(88, 140, 210, 0.18), transparent 40%);
}

.gos-auth__orbs span {
  position: absolute;
  border-radius: 50%;
  filter: blur(2px);
  opacity: 0.55;
  animation: gos-float 12s ease-in-out infinite;
}
.gos-auth__orbs span:nth-child(1) { width: 10px; height: 10px; left: 12%; top: 28%; background: #e3c36a; animation-delay: 0s; }
.gos-auth__orbs span:nth-child(2) { width: 7px; height: 7px; left: 28%; top: 62%; background: #9ecbff; animation-delay: 2s; }
.gos-auth__orbs span:nth-child(3) { width: 12px; height: 12px; right: 18%; top: 22%; background: #f0d78a; animation-delay: 4s; }
.gos-auth__orbs span:nth-child(4) { width: 8px; height: 8px; right: 32%; bottom: 18%; background: #7ad1ff; animation-delay: 1.5s; }

.gos-auth__layout {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 48px 24px;
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 48px;
  align-items: center;
}

.gos-auth__kicker {
  margin: 0 0 14px;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  font-size: 11px;
  color: var(--gold);
}

.gos-auth__title {
  margin: 0;
  font-family: var(--font-cinzel), Cinzel, Georgia, serif;
  font-weight: 700;
  font-size: clamp(36px, 5vw, 62px);
  line-height: 1.08;
  color: #fff8e7;
  text-shadow: 0 10px 40px rgba(0,0,0,0.45);
}

.gos-auth__lead {
  margin: 18px 0 0;
  max-width: 440px;
  color: var(--muted);
  font-size: 16px;
  line-height: 1.65;
}

.gos-auth__panel {
  width: 100%;
}

.gos-card {
  width: 100%;
  max-width: 440px;
  margin-left: auto;
  background: rgba(12, 16, 28, 0.72);
  border: 1px solid rgba(227, 195, 106, 0.22);
  border-radius: 22px;
  padding: 28px 26px 24px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06);
  backdrop-filter: blur(18px);
}

.gos-card h2 {
  margin: 0 0 6px;
  font-family: var(--font-cinzel), Cinzel, Georgia, serif;
  font-size: 24px;
  font-weight: 700;
  color: #fff8e7;
}

.gos-card p.gos-sub {
  margin: 0 0 20px;
  color: #b7b0a0;
  font-size: 13px;
  line-height: 1.5;
}

.gos-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 5px;
  margin-bottom: 18px;
  border-radius: 14px;
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.06);
}

.gos-tabs button {
  border: 0;
  background: transparent;
  color: #b7b0a0;
  padding: 10px 8px;
  border-radius: 10px;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
}

.gos-tabs button.is-on {
  background: linear-gradient(135deg, #c9a227, #e8d48b);
  color: #1c1406;
}

.gos-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.gos-field label {
  font-size: 12px;
  color: #d7cbae;
  font-weight: 500;
}

.gos-field input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(227, 195, 106, 0.18);
  background: rgba(6, 8, 16, 0.7);
  color: #fff8e7;
  font: inherit;
  font-size: 14px;
  outline: none;
}

.gos-field input:focus {
  border-color: rgba(227, 195, 106, 0.7);
  box-shadow: 0 0 0 3px rgba(227, 195, 106, 0.15);
}

.gos-error {
  margin: 0 0 10px;
  color: #ff8d7a;
  font-size: 13px;
}

.gos-ok {
  margin: 0 0 10px;
  color: #9be7b3;
  font-size: 13px;
  line-height: 1.45;
}

.gos-btn {
  width: 100%;
  margin-top: 6px;
  padding: 13px 16px;
  border: 0;
  border-radius: 12px;
  cursor: pointer;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  color: #1c1406;
  background: linear-gradient(135deg, #c9a227, #f0d78a);
  box-shadow: 0 10px 24px rgba(201, 162, 39, 0.28);
}

.gos-btn:disabled {
  opacity: 0.65;
  cursor: wait;
}

.gos-btn:hover:not(:disabled) {
  filter: brightness(1.06);
}

.gos-link {
  display: inline-block;
  margin-top: 14px;
  width: 100%;
  text-align: center;
  background: none;
  border: 0;
  color: var(--gold);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  text-decoration: none;
}

.gos-link:hover { text-decoration: underline; }

@keyframes gos-kenburns {
  from { transform: scale(1.04) translateY(0); }
  to { transform: scale(1.12) translateY(-12px); }
}

@keyframes gos-float {
  0%, 100% { transform: translateY(0); opacity: 0.35; }
  50% { transform: translateY(-18px); opacity: 0.8; }
}

@media (max-width: 860px) {
  .gos-auth__layout {
    grid-template-columns: 1fr;
    padding: 28px 16px 40px;
    gap: 20px;
    align-content: start;
  }
  .gos-auth__title { font-size: 34px; }
  .gos-auth__lead { max-width: none; font-size: 14px; }
  .gos-card { max-width: none; margin: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .gos-auth__bg, .gos-auth__orbs span { animation: none; }
}
`;
