# 🔧 Rozwiązanie problemu z wersją Node.js

## Problem
```
npm WARN EBADENGINE Unsupported engine {
  package: 'prisma@7.3.0',
  required: { node: '^20.19 || ^22.12 || >=24.0' },
  current: { node: 'v20.11.0' }
}
```

## Rozwiązanie

### Opcja 1: Użyj Prisma 6.2.0 (ZALECANE) ⭐

W `package.json` masz już Prisma 6.2.0, która działa z Node.js 20.11.0.

**Wykonaj:**
```bash
# Usuń node_modules i package-lock.json
rm -rf node_modules package-lock.json

# Zainstaluj ponownie (użyje wersji z package.json)
npm install
```

To zainstaluje Prisma 6.2.0 zamiast 7.3.0.

### Opcja 2: Zaktualizuj Node.js

**Lokalnie:**
```bash
# Użyj nvm (Node Version Manager)
nvm install 20.19.0
nvm use 20.19.0

# Lub zainstaluj najnowszą wersję LTS
nvm install --lts
nvm use --lts
```

**Na Railway:**
Railway automatycznie użyje wersji Node.js z pliku `.nvmrc` (już utworzony - 20.19.0).

### Opcja 3: Użyj dokładnej wersji Prisma

Zaktualizowałem `package.json` - Prisma jest teraz ustawiona na dokładną wersję `6.2.0` (bez `^`), więc npm nie zainstaluje nowszej wersji.

## Sprawdź wersję

```bash
# Sprawdź wersję Node.js
node --version

# Sprawdź wersję Prisma
npx prisma --version
```

Powinno pokazać:
- Node.js: `v20.11.0` lub wyższe
- Prisma: `6.2.0` (nie 7.3.0)

## Dla Railway

Railway automatycznie użyje:
- Wersji Node.js z `.nvmrc` (20.19.0)
- Lub z `nixpacks.toml` (nodejs-20_x)

Oba pliki zostały utworzone, więc Railway użyje odpowiedniej wersji Node.js.

## Jeśli nadal masz problem

```bash
# Wyczyść cache npm
npm cache clean --force

# Usuń wszystko
rm -rf node_modules package-lock.json

# Zainstaluj ponownie
npm install

# Sprawdź
npx prisma --version
```

Powinno pokazać `6.2.0` ✅

