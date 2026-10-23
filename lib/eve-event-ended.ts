/**
 * Herosy eventowe (EVE). Każdy event ma własny stan:
 * - ended: true → API odrzuca POSTy (410), skrypt nie zlicza czasu; zostają tylko statystyki na stronie.
 * - respawnMinMin / respawnMaxMin: okno respawnu liczone od zabicia herosa (w minutach).
 * Skrypt Tampermonkey ma lustrzaną konfigurację (EVE_HEROES) — trzymać w zgodzie.
 */
export type EveHero = {
  key: number;
  monster: string;
  event: 'easter2026' | 'halloween2026';
  ended: boolean;
  respawnMinMin: number;
  respawnMaxMin: number;
};

export const EVE_HEROES: readonly EveHero[] = [
  { key: 41, monster: 'Grim Blackcluck', event: 'easter2026', ended: true, respawnMinMin: 15, respawnMaxMin: 15 },
  { key: 81, monster: 'Hotblood Capon', event: 'easter2026', ended: true, respawnMinMin: 15, respawnMaxMin: 15 },
  { key: 132, monster: 'Doppelganger', event: 'halloween2026', ended: false, respawnMinMin: 35, respawnMaxMin: 105 },
  { key: 190, monster: 'Drude', event: 'halloween2026', ended: false, respawnMinMin: 43, respawnMaxMin: 131 },
  { key: 243, monster: 'Nosferatu', event: 'halloween2026', ended: false, respawnMinMin: 52, respawnMaxMin: 158 },
];

export const EVE_KEYS = EVE_HEROES.map((h) => h.key);
export const EVE_ACTIVE_KEYS = EVE_HEROES.filter((h) => !h.ended).map((h) => h.key);

export function getEveHero(key: number): EveHero | undefined {
  return EVE_HEROES.find((h) => h.key === key);
}

function normalizeMonsterName(name: string): string {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function getEveHeroByMonster(monster: string): EveHero | undefined {
  const m = normalizeMonsterName(monster);
  return EVE_HEROES.find((h) => normalizeMonsterName(h.monster) === m);
}

/** Trwający heros eventowy — rozpoznawany po nazwie, niezależnie od tego, czy skrypt uznał go za herosa czy tytana. */
export function isActiveEveHeroMonster(monster: string): boolean {
  return getEveHeroByMonster(monster)?.ended === false;
}

export function isEveHeroMonster(monster: string): boolean {
  return !!getEveHeroByMonster(monster);
}

export function isEndedEveHeroMonster(monster: string): boolean {
  return getEveHeroByMonster(monster)?.ended === true;
}

/** Dowolny znany klucz EVE (odczyty: rankingi, dashboard). */
export function isEveKey(key: number): boolean {
  return !!getEveHero(key);
}

/** Klucz trwającego eventu (zapisy: obecność, zabicia, punkty). */
export function isActiveEveKey(key: number): boolean {
  return getEveHero(key)?.ended === false;
}

export const EVE_KEY_ERROR = `eveKey must be one of: ${EVE_KEYS.join(', ')}`;
export const EVE_ACTIVE_KEY_ERROR = `eveKey must be an active event hero: ${EVE_ACTIVE_KEYS.join(', ')}`;
