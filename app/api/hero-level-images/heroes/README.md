# Obrazki/GIF-y herosów (po levelu) do powiadomień

Wrzuć pliki w podfoldery według levelu:

- `64/` — np. `hero.gif` lub `hero.png`
- `83/`
- `114/`
- `144/`
- `217/`
- `300/`

Skrypt pobiera: `GET /api/hero-level-images/{level}/hero.gif` (albo `hero.png`, `hero.webp`). Dla portretu możesz też użyć plików `portrait.png`, `portrait.gif` lub `platform.png` w danym folderze levelu. Rozszerzenia: `.gif`, `.png`, `.webp`.
