/**
 * Kolejność tytanów w panelu Rezerwacje (bez zmian).
 */
export const RESERVATION_TITANS = [
  { slug: 'orla', label: 'Orla' },
  { slug: 'kic', label: 'Kic' },
  { slug: 'renegat', label: 'Renegat' },
  { slug: 'arcy', label: 'Arcy' },
  { slug: 'zoons', label: 'Zoons' },
  { slug: 'lowczyni', label: 'Łowczyni' },
  { slug: 'przyzywacz', label: 'Przyzywacz' },
  { slug: 'magua', label: 'Magua' },
  { slug: 'teza', label: 'Teza' },
  { slug: 'barbatos', label: 'Barbatos' },
  { slug: 'tanroth', label: 'Tanroth' },
] as const;

/** Priorytety (takie same dla wszystkich zakładek). */
export const RESERVATION_PRIORITIES = [
  { value: 1, label: 'Priorytet I', color: '#C8F527' },
  { value: 2, label: 'Priorytet II', color: '#27F584' },
  { value: 3, label: 'Priorytet III', color: '#2768F5' },
] as const;

/**
 * Zakładki (itemy) per tytan. Dla Kic: pliki w app/api/titans-images/kic/{itemKey}/ (podfolder na item).
 * gifFile — wyświetlany na miejscu (32×32); pngFile — w oknie hover. Nazwy = pliki w folderze.
 */
export type ReservationItem = {
  key: string;
  label: string;
  gifFile?: string;
  pngFile?: string;
};

export const RESERVATION_ITEMS_BY_TITAN: Record<string, ReservationItem[]> = {
  kic: [
    { key: 'bambosze', label: 'Bambosze', gifFile: 'kbunny_buty2.gif', pngFile: 'bambosze_scr.png' },
    { key: 'palka', label: 'Palka', gifFile: 'krolik_craft_01.gif', pngFile: 'palka.png' },
    { key: 'buty', label: 'Buty', gifFile: 'kbunny_buty2.gif', pngFile: 'bambosze_scr.png' },
    { key: 'pier_woj', label: 'Pier Woj', gifFile: 'pierscien885.gif', pngFile: 'pier_woj.png' },
    { key: 'pier_fiz', label: 'Pier Fiz', gifFile: 'pierscien883.gif', pngFile: 'pier_fiz.png' },
    { key: 'pier_mag', label: 'Pier Mag', gifFile: 'pierscien884.gif', pngFile: 'pier_mag.png' },
    { key: 'kokosy', label: 'Kokosy', gifFile: 'krolik_craft_03.gif', pngFile: 'kokosy.png' },
    { key: 'uszy', label: 'Uszy', gifFile: 'krolik_craft_02.gif', pngFile: 'uszy.png' },
  ],
  orla: [],
  renegat: [],
  arcy: [],
  zoons: [],
  lowczyni: [],
  przyzywacz: [],
  magua: [],
  teza: [],
  barbatos: [],
  tanroth: [],
};

export function getReservationItems(titanSlug: string) {
  return RESERVATION_ITEMS_BY_TITAN[titanSlug] ?? [];
}

/** Ścieżka do obrazka: /api/titans-images/kic/{itemKey}/{filename} — pliki w podfolderach kic/pier_mag/, kic/buty/ itd. */
export function getItemImagePath(
  titanSlug: string,
  item: ReservationItem,
  ext: 'gif' | 'png'
): string {
  if (titanSlug !== 'kic') return '';
  const filename = ext === 'gif' ? (item.gifFile ?? `${item.key}.gif`) : (item.pngFile ?? `${item.key}.png`);
  return `/api/titans-images/kic/${encodeURIComponent(item.key)}/${encodeURIComponent(filename)}`;
}
