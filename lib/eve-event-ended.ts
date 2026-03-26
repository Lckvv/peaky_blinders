/**
 * Event Easter 2026 (herosy 41, 81).
 * Gdy true: API odrzuca POSTy dla herosów eventowych, skrypt ukrywa przycisk i nie wysyła requestów.
 */
export const EVE_EVENT_ENDED = false;

export const EVE_KEYS = [41, 81] as const;
export const EVE_HERO_MONSTERS = ['Grim Blackcluck', 'Hotblood Capon'] as const;

export function isEveHeroMonster(monster: string): boolean {
  return (EVE_HERO_MONSTERS as readonly string[]).includes(monster);
}

export function isEveKey(key: number): boolean {
  return EVE_KEYS.includes(key as 41 | 81);
}
