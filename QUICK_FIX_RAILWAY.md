# ⚡ Szybka naprawa błędu npm install na Railway

## Problem
Błąd podczas `npm i` na Railway - brakuje szczegółów w logach.

## Najczęstsze przyczyny:

1. **Brak package-lock.json** w repo
2. **Stary cache npm** na Railway
3. **Niezgodność wersji**

## Szybkie rozwiązanie:

### Krok 1: Wygeneruj package-lock.json lokalnie

```bash
# Usuń node_modules (jeśli istnieje)
rm -rf node_modules

# Wyczyść cache
npm cache clean --force

# Zainstaluj zależności (utworzy package-lock.json)
npm install

# Sprawdź czy działa
npm run build
```

### Krok 2: Dodaj package-lock.json do repo

```bash
# Sprawdź czy package-lock.json został utworzony
ls -la package-lock.json

# Dodaj do git
git add package-lock.json
git commit -m "Add package-lock.json"
git push
```

### Krok 3: Wyczyść cache na Railway

W Railway Dashboard:
1. Przejdź do projektu → **Settings**
2. Znajdź opcję **"Clear Build Cache"** lub **"Clear Cache"**
3. Kliknij i poczekaj
4. Zrób nowy deploy

### Krok 4: Sprawdź logi Railway

Jeśli nadal nie działa:
1. Railway Dashboard → **Deployments**
2. Kliknij na failed deployment
3. **View Logs**
4. Przewiń do początku - zobaczysz dokładny błąd npm

## Alternatywne rozwiązanie:

Jeśli problem nadal występuje, możesz wymusić użycie `npm ci`:

W Railway Dashboard → Settings → **Build Command**:
```
npm ci && npm run build
```

Lub dodaj do `railway.json`:
```json
{
  "build": {
    "buildCommand": "npm ci && npm run build"
  }
}
```

## Ważne:

- **package-lock.json** powinien być w repo (nie w .gitignore)
- Railway używa `npm ci` jeśli jest package-lock.json
- `npm ci` jest szybsze i bardziej niezawodne niż `npm install`

