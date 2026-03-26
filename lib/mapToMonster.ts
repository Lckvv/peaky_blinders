/**
 * Mapowanie: nazwa mapy (z gry) → nazwa tytana/herosa w systemie (Monster.name).
 * Skrypt Tampermonkey wysyła pole "map"; na tej podstawie przypisujemy sesję do fazy danego tytana.
 */
export const MAP_NAME_TO_MONSTER: Record<string, string> = {
  // Kic
  "Caerbannog's Grotto - 1st Chamber": 'Kic',
  "Caerbannog's Grotto - 2nd Chamber": 'Kic',
  "Caerbannog's Grotto - 3rd Chamber": 'Kic',
  // Orla
  'Shimmering Cavern': 'Orla',
  // Renegat
  "Bandits' Hideout - Vault": 'Renegat',
  // Arcy (Arcymag)
  'Politraka Volcano - Infernal Abyss': 'Arcy',
  // Przyzywacz
  'Chamber of Bloody Rites': 'Przyzywacz',
  // Barbatos
  'Hall of Ruined Temple': 'Barbatos',
  // Tanroth
  'Ice Throne Room': 'Tanroth',

  // Easter 2026 — heros 41: Grim Blackcluck
  'Fort Eder': 'Grim Blackcluck',
  'Goblin Forest': 'Grim Blackcluck',
  'Mulberry Passage': 'Grim Blackcluck',
  'Marshy Valley': 'Grim Blackcluck',
  'Marshlands': 'Grim Blackcluck',
  'Brigand Vale': 'Grim Blackcluck',
  'Stony Hideout': 'Grim Blackcluck',
  'Desecrated Graveyard': 'Grim Blackcluck',
  'Defiled Tomb - 1st Level': 'Grim Blackcluck',
  'Defiled Tomb - 2nd Level': 'Grim Blackcluck',
  'Defiled Tomb - 3nd Level': 'Grim Blackcluck',
  'Defiled Tomb - 3rd Level': 'Grim Blackcluck',
  'Defiled Tomb - 4nd Level': 'Grim Blackcluck',
  'Defiled Tomb - 4th Level': 'Grim Blackcluck',
  'Defiled Tomb - 5nd Level': 'Grim Blackcluck',
  'Defiled Tomb - 5th Level': 'Grim Blackcluck',

  // Easter 2026 — heros 81: Hotblood Capon
  'Andarum Ilami': 'Hotblood Capon',
  'Rocks of Cold Songs': 'Hotblood Capon',
  'Ice Crevasse - 1st Level - 1st Chamber': 'Hotblood Capon',
  'Ice Crevasse - 2nd Level - 1st Chamber': 'Hotblood Capon',
  'Ice Crevasse - 2nd Level': 'Hotblood Capon',
  'Icespire Chamber': 'Hotblood Capon',
  'Firn Cave - 2nd Level': 'Hotblood Capon',
  'Firn Cave - 1st Level': 'Hotblood Capon',
  'Hermitage of the Black Sun - 1st Level - North': 'Hotblood Capon',
  'Hermitage of the Black Sun - 2nd Level': 'Hotblood Capon',
  'Hermitage of the Black Sun - 3rd Level': 'Hotblood Capon',
  'Hermitage of the Black Sun - 4th Level - 1st Chamber': 'Hotblood Capon',
  'Hermitage of the Black Sun - 4th Level - 2nd Chamber': 'Hotblood Capon',
  'Hermitage of the Black Sun - 3rd Level - South': 'Hotblood Capon',
  'Andarum Temple - Warehouse 2nd Level': 'Hotblood Capon',
  'Andarum Temple - Armory': 'Hotblood Capon',
  'Andarum Temple - Warehouse 1st Level': 'Hotblood Capon',
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
