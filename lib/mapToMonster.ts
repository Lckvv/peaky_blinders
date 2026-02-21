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

  // Heros 63 - Seeker of Creation (20 urodziny 2026)
  'Dripping Honey Mine - 1st Level - 2nd Chamber': 'Seeker of Creation',
  'Dripping Honey Mine - 2nd Level - 1st Chamber': 'Seeker of Creation',
  'Dripping Honey Mine - 3rd Level': 'Seeker of Creation',
  'Dripping Honey Mine - 2nd Level - 2nd Chamber': 'Seeker of Creation',
  'Dripping Honey Mine - Vestibule': 'Seeker of Creation',
  'Gnoll Settlement': 'Seeker of Creation',
  'Cheerful Glade': 'Seeker of Creation',
  'Forest Ford': 'Seeker of Creation',
  'Cave of Gnoll Shamans - 2nd Level': 'Seeker of Creation',
  'Cave of Gnoll Shamans - 1st Level': 'Seeker of Creation',
  'Cave of Gnoll Shamans - 3rd Level': 'Seeker of Creation',
  'Abandoned Beehives': 'Seeker of Creation',
  'Pregnolls Grotto - 2nd Level - 2nd Chamber': 'Seeker of Creation',
  'Pregnolls Grotto - 2nd Level': 'Seeker of Creation',
  'Pregnolls Grotto - 1st Level - 2nd Chamber': 'Seeker of Creation',
  'Pregnolls Grotto - 1st Level': 'Seeker of Creation',
  'Pregnolls Grotto - 3rd Level': 'Seeker of Creation',
  "Ant Colony - 1st Level - Left Tunnel": 'Seeker of Creation',
  "Ant Colony - 2nd Level - Left Corridors": 'Seeker of Creation',
  "Ant Colony - 3rd Level - Left Chamber": 'Seeker of Creation',
  "Ant Colony - 3rd Level - Queen's Nest": 'Seeker of Creation',
  "Ant Colony - 3rd Level - Right Chamber": 'Seeker of Creation',
  "Ant Colony - 2nd Level - Right Corridors": 'Seeker of Creation',
  "Ant Colony - 1st Level - Right Tunnel": 'Seeker of Creation',
  'Abyss of Conflagration': 'Seeker of Creation',

  // Heros 143 - Harbinger of Elancia
  "Vorundriel's Forge - 1st Level": 'Harbinger of Elancia',
  "Vorundriel's Forge - 2nd Level": 'Harbinger of Elancia',
  "Vorundriel's Forge - 3rd Level": 'Harbinger of Elancia',
  'Cenotaph of Berserkers - 1st Level': 'Harbinger of Elancia',
  'Small Fortress - Vestibule': 'Harbinger of Elancia',
  'Small Fortress - East Walls': 'Harbinger of Elancia',
  'Small Fortress - Western Corridor': 'Harbinger of Elancia',
  'Small Fortress - West Walls': 'Harbinger of Elancia',
  'Forsaken Fastness': 'Harbinger of Elancia',
  'Fiendish Quagmire': 'Harbinger of Elancia',
  'Ancestral Vault': 'Harbinger of Elancia',
  'Lost Valley': 'Harbinger of Elancia',
  'Mrinding Gallery - 1st Level - 1st Chamber': 'Harbinger of Elancia',
  'Mrinding Gallery - 2nd Level - 1st Chamber': 'Harbinger of Elancia',
  'Mrinding Gallery - 1st Level - 2nd Chamber': 'Harbinger of Elancia',
  'Mrinding Gallery - 2nd Level - 2nd Chamber': 'Harbinger of Elancia',
  'Erebeth Gallery - 2nd Level - 1st Chamber': 'Harbinger of Elancia',
  'Erebeth Gallery - 2nd Level - 2nd Chamber': 'Harbinger of Elancia',
  'Erebeth Gallery - 3rd Level': 'Harbinger of Elancia',
  'Fire Well - 3rd Level': 'Harbinger of Elancia',
  'Fire Well - 2nd Level': 'Harbinger of Elancia',
  'Fire Well - 1st Level': 'Harbinger of Elancia',

  // Heros 300 - Thunder-Wielding Barbarian
  'Shaiharrud Desert - East': 'Thunder-Wielding Barbarian',
  "Frost Lords' Passage": 'Thunder-Wielding Barbarian',
  'Hall of Ice Magic': 'Thunder-Wielding Barbarian',
  'Hall of Chilling Whispers': 'Thunder-Wielding Barbarian',
  'Hall of Frozen Bolts': 'Thunder-Wielding Barbarian',
  'Shaiharrud Desert - West': 'Thunder-Wielding Barbarian',
  'Rocks of Dead': 'Thunder-Wielding Barbarian',
  'Dragon Rockfoil': 'Thunder-Wielding Barbarian',
  "Vapor's Cliff": 'Thunder-Wielding Barbarian',
  'Kai Floodplains': 'Thunder-Wielding Barbarian',
  'Gvar Hamryd': 'Thunder-Wielding Barbarian',
  'Cave of Dry Shoots - 4th Level': 'Thunder-Wielding Barbarian',
  'Cave of Dry Shoots - 3rd Level': 'Thunder-Wielding Barbarian',
  'Cave of Dry Shoots - 2nd Level': 'Thunder-Wielding Barbarian',
  'Cave of Dry Shoots - 1st Level': 'Thunder-Wielding Barbarian',
  'Rustling Backwoods': 'Thunder-Wielding Barbarian',
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
