# 🔧 Naprawa niezgodności package-lock.json

## Problem
```
npm error Invalid: lock file's @prisma/client@6.19.2 does not satisfy @prisma/client@6.2.0
```

`package-lock.json` ma starszą wersję niż `package.json`.

## Rozwiązanie:

### Krok 1: Usuń package-lock.json i node_modules

```bash
rm -rf node_modules package-lock.json
```

### Krok 2: Zainstaluj zależności ponownie

```bash
npm install
```

To utworzy nowy `package-lock.json` zgodny z `package.json`.

### Krok 3: Sprawdź czy wersje są zgodne

```bash
# Sprawdź wersję w package.json
cat package.json | grep "@prisma/client"

# Sprawdź wersję w package-lock.json (po instalacji)
cat package-lock.json | grep -A 2 "@prisma/client" | head -5
```

Oba powinny pokazywać `6.2.0`.

### Krok 4: Commit i push

```bash
git add package-lock.json
git commit -m "Fix: Update package-lock.json to match package.json"
git push
```

### Krok 5: Wyczyść cache Railway

W Railway Dashboard:
1. Settings → Clear Build Cache
2. Railway automatycznie zrobi nowy deploy

## Alternatywnie - zaktualizuj package.json

Jeśli chcesz użyć nowszej wersji Prisma:

```bash
npm install @prisma/client@latest prisma@latest
```

Ale lepiej zostać przy 6.2.0 (stabilniejsza).

