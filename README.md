# ⏱ Margonem Map Timer

Aplikacja do śledzenia czasu spędzonego na mapach w Margonem.
Skrypt Tampermonkey trackuje czas, a Next.js backend zapisuje dane i generuje leaderboard.

## 🏗️ Architektura

```
Tampermonkey Script (przeglądarka gracza)
   │
   │  POST /api/timer/session
   │  Header: X-API-Key: mgt_xxxxx
   │
   ▼
Next.js API (Railway)
   │
   ▼
PostgreSQL (Railway)
```

## 🚀 Deploy na Railway (5 min)

### 1. Utwórz repo na GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TWOJE/margonem-timer.git
git push -u origin main
```

### 2. Stwórz projekt na Railway

1. Wejdź na [railway.app](https://railway.app) i zaloguj się przez GitHub
2. **New Project** → **Deploy from GitHub repo** → wybierz `margonem-timer`
3. Railway automatycznie wykryje Next.js

### 3. Dodaj bazę danych

1. W dashboardzie projektu kliknij **+ New** → **Database** → **PostgreSQL**
2. Railway automatycznie ustawi zmienną `DATABASE_URL` ✅

### 4. Ustaw zmienne środowiskowe

W dashboardzie serwisu (nie bazy!) → **Variables** → dodaj:

```
JWT_SECRET=wygeneruj-cos-losowego-np-openssl-rand-base64-32
NODE_ENV=production
```

### 5. Uruchom migrację bazy

W dashboardzie Railway → zakładka **Settings** → **Custom Build Command**:

```
npx prisma db push && npm run build
```

Albo w zakładce **Deploy** uruchom ręcznie:

```
npx prisma db push
```

### 6. Gotowe! 🎉

Railway da Ci URL w stylu: `https://margonem-timer-production-xxxx.up.railway.app`

---

## 📦 Lokalne uruchomienie (development)

```bash
# Zainstaluj zależności
npm install

# Skopiuj env
cp .env.example .env
# Edytuj .env — ustaw DATABASE_URL na lokalne PostgreSQL

# Migracja bazy
npx prisma db push

# Seed (opcjonalnie)
npm run db:seed

# Uruchom dev server
npm run dev
```

Otwórz http://localhost:3000

---

## 🔑 Rejestracja i API key

### Zarejestruj się:
```bash
curl -X POST https://YOUR-APP.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "gracz@example.com",
    "username": "MojaNazwa",
    "password": "tajnehaslo123"
  }'
```

Odpowiedź:
```json
{
  "user": { "id": "...", "username": "MojaNazwa" },
  "apiKey": "mgt_a1b2c3d4e5f6..."
}
```

**Skopiuj `apiKey`** — wkleisz go do skryptu Tampermonkey.

---

## 🐒 Instalacja skryptu Tampermonkey

1. Zainstaluj [Tampermonkey](https://www.tampermonkey.net/) w przeglądarce
2. Utwórz nowy skrypt i wklej zawartość `tampermonkey-map-timer.user.js`
3. Wejdź do gry Margonem
4. Kliknij ikonę **⏱** w prawym dolnym rogu
5. Wklej **Backend URL** i **API Key**
6. Kliknij **Zapisz**

Timer wystartuje automatycznie gdy wejdziesz na trackowaną mapę!

---

## 📊 API Endpoints

| Method | Endpoint | Auth | Opis |
|--------|----------|------|------|
| POST | `/api/auth/register` | — | Rejestracja (zwraca API key) |
| POST | `/api/auth/login` | — | Logowanie (cookie JWT) |
| GET | `/api/auth/api-key` | Cookie | Lista API keys |
| POST | `/api/auth/api-key` | Cookie | Generuj nowy API key |
| DELETE | `/api/auth/api-key` | Cookie | Dezaktywuj API key |
| **POST** | **`/api/timer/session`** | **X-API-Key** | **Zapisz sesję (Tampermonkey)** |
| GET | `/api/timer/sessions` | API Key / Cookie | Moje sesje |
| GET | `/api/timer/leaderboard?monster=Kic` | — (publiczny) | Ranking |

### Przykład zapisu sesji (to robi skrypt automatycznie):
```bash
curl -X POST https://YOUR-APP.up.railway.app/api/timer/session \
  -H "Content-Type: application/json" \
  -H "X-API-Key: mgt_twoj_klucz" \
  -d '{
    "time": 3600,
    "monster": "Kic",
    "map": "Caerbannog'\''s Grotto - 1st Chamber",
    "hero": "MojaPostac",
    "world": "tempest",
    "reason": "map_change"
  }'
```

### Leaderboard:
```bash
curl https://YOUR-APP.up.railway.app/api/timer/leaderboard?monster=Kic
```

---

## 🗃️ Struktura bazy danych

- **User** — konta użytkowników
- **ApiKey** — klucze API (max 5 na usera), prefiks `mgt_`
- **Monster** — potwory z nazwą i mapą
- **MapSession** — pojedyncze sesje (czas, postać, mapa, powód wyjścia)

---

## 🔒 Bezpieczeństwo

- Hasła hashowane bcrypt (12 rounds)
- JWT tokeny (7 dni) dla web dashboard
- API keys z prefiksem `mgt_` dla skryptów
- Rate limit: max sesja 12h (anti-abuse)
- CORS headers dla requestów z margonem.com
- API keys możesz dezaktywować w każdej chwili

---

## 💰 Koszt

Railway: **~$5/miesiąc** (plan Hobby z $5 kredytu)
- Next.js app + PostgreSQL
- Wystarczające dla setek użytkowników
