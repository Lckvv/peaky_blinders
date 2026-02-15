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
 * Zakładki (itemy) per tytan. Tylko Kic ma zdefiniowane; reszta pusta (do uzupełnienia później).
 * Dla Kic: pliki w app/api/titans-images/kic/[filename]/titans_images/kic/
 * gifFile / pngFile — faktyczne nazwy plików w folderze (jeśli brak, używane są key.gif / key.png).
 */
export type ReservationItem = {
  key: string;
  label: string;
  gifFile?: string;
  pngFile?: string;
};

export const RESERVATION_ITEMS_BY_TITAN: Record<string, ReservationItem[]> = {
  kic: [
    { key: 'bambosze', label: 'Bambosze' },
    { key: 'buty', label: 'Buty', gifFile: 'kbunny_buty2.gif', pngFile: 'bambosze_scr.png' },
    { key: 'pier_woj', label: 'Pier Woj' },
    { key: 'pier_fiz', label: 'Pier Fiz' },
    { key: 'pier_mag', label: 'Pier Mag' },
    { key: 'kokosy', label: 'Kokosy' },
    { key: 'uszy', label: 'Uszy' },
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

/** Ścieżka do obrazka itemu (GIF lub PNG). Używa gifFile/pngFile z itemu, albo key.gif / key.png. */
export function getItemImagePath(
  titanSlug: string,
  item: ReservationItem,
  ext: 'gif' | 'png'
): string {
  if (titanSlug !== 'kic') return '';
  const filename = ext === 'gif' ? (item.gifFile ?? `${item.key}.gif`) : (item.pngFile ?? `${item.key}.png`);
  return `/api/titans-images/kic/${encodeURIComponent(filename)}`;
}
