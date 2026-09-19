export const TITANS = [
  { slug: 'orla', monsterName: 'Orla', label: 'Dziewicza Orlica' },
  { slug: 'kic', monsterName: 'Kic', label: 'Zabójczy Królik' },
  { slug: 'renegat', monsterName: 'Renegat', label: 'Renegat Baulus' },
  { slug: 'arcy', monsterName: 'Arcy', label: 'Piekielny Arcymag' },
  { slug: 'zoons', monsterName: 'Zoons', label: 'Versus Zoons' },
  { slug: 'lowczyni', monsterName: 'Łowczyni', label: 'Łowczyni Wspomnień' },
  { slug: 'przyzywacz', monsterName: 'Przyzywacz', label: 'Przyzywacz Demonów' },
  { slug: 'magua', monsterName: 'Magua', label: 'Maddok Magua' },
  { slug: 'teza', monsterName: 'Teza', label: 'Tezcatlipoca' },
  { slug: 'barbatos', monsterName: 'Barbatos', label: 'Barbatos Smoczy Strażnik' },
  { slug: 'tanroth', monsterName: 'Tanroth', label: 'Tanroth' },
] as const;

export type TitanSlug = (typeof TITANS)[number]['slug'];

export function titanBySlug(slug: string) {
  return TITANS.find((t) => t.slug === slug.toLowerCase()) ?? null;
}

export function titanLabel(slug: string) {
  return titanBySlug(slug)?.label ?? slug;
}

export function titanMonsterName(slug: string) {
  return titanBySlug(slug)?.monsterName ?? null;
}
