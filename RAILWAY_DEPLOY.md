# 🚂 Deploy na Railway - Krok po kroku

## Przygotowanie

### 1. Utwórz konto na Railway
- Wejdź na [railway.app](https://railway.app)
- Zaloguj się przez GitHub

### 2. Przygotuj repozytorium GitHub
```bash
# Jeśli jeszcze nie masz repo:
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TWOJE_USERNAME/margonem-timer.git
git push -u origin main
```

## Deploy na Railway

### Krok 1: Utwórz nowy projekt
1. W Railway dashboard kliknij **"New Project"**
2. Wybierz **"Deploy from GitHub repo"**
3. Wybierz swoje repozytorium `margonem-timer`
4. Railway automatycznie wykryje Next.js ✅

### Krok 2: Dodaj bazę danych PostgreSQL
1. W dashboardzie projektu kliknij **"+ New"**
2. Wybierz **"Database"** → **"PostgreSQL"**
3. Railway automatycznie:
   - Utworzy bazę danych
   - Ustawi zmienną środowiskową `DATABASE_URL` ✅

### Krok 3: Ustaw zmienne środowiskowe
1. W dashboardzie serwisu (nie bazy!) kliknij zakładkę **"Variables"**
2. Dodaj zmienne:

```
JWT_SECRET=twoj-losowy-secret-tutaj
NODE_ENV=production
```

**Jak wygenerować JWT_SECRET:**
```bash
# W terminalu:
openssl rand -base64 32
# Lub użyj generatora online
```

### Krok 4: Migracja bazy danych
Railway automatycznie uruchomi `npm run build` który zawiera `prisma generate`, ale musimy jeszcze zaktualizować schemat bazy.

**Opcja A - Przez Railway CLI:**
```bash
# Zainstaluj Railway CLI
npm i -g @railway/cli

# Zaloguj się
railway login

# Połącz się z projektem
railway link

# Uruchom migrację
railway run npx prisma db push
```

**Opcja B - Przez Railway Dashboard:**
1. W dashboardzie serwisu → zakładka **"Deploy"**
2. Kliknij **"View Logs"**
3. W zakładce **"Deploy"** znajdź przycisk **"Run Command"** lub użyj **"Shell"**
4. Wpisz: `npx prisma db push`

**Opcja C - Automatycznie przy każdym deployu (obecnie włączone):**
W `package.json` skrypt `build` uruchamia `prisma db push`, więc każdy deploy na Railway aktualizuje schemat bazy. **Jeśli dodałeś nowe pole (np. `heroOutfitUrl`) i baza na Railway jeszcze go nie ma**, uruchom raz ręcznie (Opcja A), a kolejne deploye będą już aktualizować schemat w buildzie.

### Krok 5: Sprawdź deploy
1. Railway automatycznie zbuduje i wdroży aplikację
2. Sprawdź logi w zakładce **"Deploy"** → **"View Logs"**
3. Po zakończeniu Railway da Ci URL: `https://twoj-projekt.up.railway.app`

### Krok 6: Testowanie
1. Otwórz URL aplikacji
2. Przejdź do `/dashboard` i zarejestruj użytkownika
3. Sprawdź czy wszystko działa

## Konfiguracja domeny (opcjonalne)

1. W dashboardzie serwisu → **"Settings"** → **"Networking"**
2. Kliknij **"Generate Domain"** lub dodaj własną domenę
3. Railway automatycznie ustawi SSL ✅

## Monitoring i logi

- **Logi:** Dashboard → serwis → zakładka **"Deploy"** → **"View Logs"**
- **Metryki:** Dashboard → serwis → zakładka **"Metrics"**
- **Baza danych:** Dashboard → PostgreSQL → **"Query"** (SQL editor)

## Aktualizacja aplikacji

Po każdym `git push` Railway automatycznie:
1. Wykryje zmiany
2. Zbuduje nową wersję
3. Wdroży ją

Możesz też ręcznie uruchomić deploy w dashboardzie.

## Troubleshooting

### Błąd: "Cannot connect to database"
- Sprawdź czy `DATABASE_URL` jest ustawione (Railway ustawia to automatycznie)
- Sprawdź czy baza danych jest uruchomiona

### Błąd: "Prisma schema not found"
- Upewnij się, że `prisma/schema.prisma` jest w repo
- Sprawdź czy `npm run build` działa lokalnie

### Błąd: "JWT_SECRET not set"
- Dodaj zmienną `JWT_SECRET` w Railway Variables
- Uruchom ponowny deploy

### Baza danych nie ma tabel
- Uruchom: `railway run npx prisma db push`
- Lub przez Railway Shell: `npx prisma db push`

### Błąd: "503 Backend.max_conn reached"
- Oznacza, że backend (aplikacja lub baza) osiągnął limit równoczesnych połączeń.
- **W tym projekcie:** aplikacja w produkcji automatycznie ustawia `connection_limit=5` w połączeniu do bazy (w `lib/prisma.ts`), żeby nie przekraczać limitu Railway.
- Jeśli błąd nadal występuje: w Railway → Variables możesz ustawić `DATABASE_URL` ręcznie z parametrem, np. `...?connection_limit=3` (na końcu URL bazy).

### Aplikacja nie startuje
- Sprawdź logi w Railway dashboard
- Upewnij się, że `package.json` ma skrypt `start`
- Sprawdź czy port jest poprawny (Railway automatycznie ustawia `PORT`)

## Koszty

Railway oferuje:
- **Plan Hobby:** $5 kredytu miesięcznie (wystarczy dla małych projektów)
- **Pay-as-you-go:** płacisz za użycie

Dla tego projektu (Next.js + PostgreSQL):
- **~$5-10/miesiąc** dla setek użytkowników
- Możesz ustawić **spending limit** w ustawieniach

## Przydatne linki

- [Railway Docs](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Railway Status](https://status.railway.app)

