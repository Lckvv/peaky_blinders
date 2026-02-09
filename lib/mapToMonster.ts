/**
 * Mapowanie: nazwa mapy (z gry) → nazwa tytana w systemie (Monster.name).
 * Skrypt Tampermonkey wysyła pole "map"; na tej podstawie przypisujemy sesję do fazy danego tytana.
 * Możesz później uzupełnić pełną listę map.
 */
export const MAP_NAME_TO_MONSTER: Record<string, string> = {
  // Kic
  "Caerbannog's Grotto - 1st Chamber": 'Kic',
  "Caerbannog's Grotto - 2nd Chamber": 'Kic',
  "Caerbannog's Grotto - 3rd Chamber": 'Kic',
  // Dodaj kolejne mapy gdy będziesz mieć listę, np.:
  // "Mapa Orla ...": 'Orla',
  // "Mapa Renegat ...": 'Renegat',
};

/**
 * Zwraca nazwę tytana (Monster.name) dla danej nazwy mapy.
 * Jeśli map nie jest w mapowaniu, zwraca undefined.
 */
export function getMonsterNameFromMap(mapName: string): string | undefined {
  if (!mapName || typeof mapName !== 'string') return undefined;
  const trimmed = mapName.trim();
  return MAP_NAME_TO_MONSTER[trimmed];
}
