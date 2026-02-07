# 🔧 Naprawa błędu npm install na Railway

## Problem
```
npm error A complete log of this run can be found in: /root/.npm/_logs/...
ERROR: failed to build: failed to solve: process "/bin/bash -ol pipefail -c npm i" did not complete successfully: exit code: 1
```

## Możliwe przyczyny:

1. **Problem z cache npm** - Railway może mieć stary cache
2. **Problem z package-lock.json** - może być nieaktualny
3. **Problem z wersjami Node.js** - niezgodność wersji

## Rozwiązania:

### Rozwiązanie 1: Wyczyść cache i zaktualizuj package-lock.json

**Lokalnie:**
```bash
# Usuń node_modules i package-lock.json
rm -rf node_modules package-lock.json

# Wyczyść cache npm
npm cache clean --force

# Zainstaluj ponownie
npm install

# Sprawdź czy działa
npm run build

# Commit i push
git add package-lock.json
git commit -m "Update package-lock.json"
git push
```

### Rozwiązanie 2: Sprawdź logi Railway

W Railway Dashboard:
1. Przejdź do projektu → **Deployments**
2. Kliknij na failed deployment
3. Kliknij **"View Logs"**
4. Przewiń do początku - zobaczysz dokładny błąd npm

### Rozwiązanie 3: Użyj npm ci zamiast npm i

Railway automatycznie używa `npm ci` w produkcji, ale możesz wymusić to w `railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm ci && npm run build"
  }
}
```

### Rozwiązanie 4: Sprawdź wersje Node.js

Upewnij się, że `.nvmrc` zawiera:
```
20.19.0
```

Railway użyje tej wersji automatycznie.

## Najczęstsze błędy:

### Błąd: "Cannot find module"
- **Rozwiązanie:** Usuń `node_modules` i `package-lock.json`, zainstaluj ponownie

### Błąd: "Peer dependency conflict"
- **Rozwiązanie:** Sprawdź czy wszystkie wersje są zgodne

### Błąd: "Out of memory"
- **Rozwiązanie:** Railway może potrzebować więcej pamięci - sprawdź w Settings

## Sprawdź przed push:

```bash
# Lokalnie sprawdź czy wszystko działa
npm install
npm run build
npm start  # w tle, sprawdź czy startuje
```

Jeśli działa lokalnie, problem może być z:
- Cache Railway
- Wersją Node.js na Railway
- Zmiennymi środowiskowymi

## Jeśli nadal nie działa:

1. **Sprawdź dokładne logi** w Railway (View Logs)
2. **Wyczyść cache Railway** - w Settings → Clear Build Cache
3. **Redeploy** - usuń deployment i zrób nowy

