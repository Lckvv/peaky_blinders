/**
 * Event 20 urodziny (herosy 63, 143, 300) zakończony.
 * Gdy true: API odrzuca POSTy dla herosów eventowych, skrypt ukrywa przycisk i nie wysyła requestów.
 * Ustaw na false, żeby w przyszłości ponownie włączyć event.
 */
export const EVE_EVENT_ENDED = true;

export const EVE_KEYS = [63, 143, 300] as const;
export const EVE_HERO_MONSTERS = ['Seeker of Creation', 'Harbinger of Elancia', 'Thunder-Wielding Barbarian'] as const;

export function isEveHeroMonster(monster: string): boolean {
  return (EVE_HERO_MONSTERS as readonly string[]).includes(monster);
}

export function isEveKey(key: number): boolean {
  return EVE_KEYS.includes(key as 63 | 143 | 300);
}
