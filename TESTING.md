# 🧪 Instrukcja testowania lokalnego

## 1. Przygotowanie środowiska

### Wymagania:
- Node.js 18+ 
- PostgreSQL (lokalnie lub np. Supabase/Neon dla darmowej bazy w chmurze)

### Instalacja:

```bash
# Zainstaluj zależności
npm install

# Utwórz plik .env w głównym katalogu
# Dla lokalnego PostgreSQL:
DATABASE_URL="postgresql://user:password@localhost:5432/margonem_timer?schema=public"
JWT_SECRET="twoj-secret-key-tutaj"

# Dla Supabase/Neon (darmowe):
# DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
```

### Migracja bazy danych:

```bash
# Wygeneruj Prisma Client
npx prisma generate

# Zastosuj schemat do bazy
npx prisma db push
```

## 2. Uruchomienie aplikacji

```bash
npm run dev
```

Aplikacja będzie dostępna pod: http://localhost:3000

## 3. Testowanie funkcjonalności

### A. Rejestracja użytkownika

1. Otwórz http://localhost:3000/dashboard
2. Kliknij zakładkę "Rejestracja"
3. Wypełnij formularz:
   - Email: test@example.com
   - Username: testuser
   - Nick: TestPostac (opcjonalne)
   - Password: test123
4. Po rejestracji zobaczysz swój API key

### B. Utworzenie użytkownika admin

W bazie danych (np. przez `npx prisma studio` lub psql):

```sql
UPDATE "User" SET role = 'admin' WHERE username = 'testuser';
```

Lub przez Prisma Studio:
```bash
npx prisma studio
# Otwórz http://localhost:5555
# Znajdź użytkownika i zmień role na "admin"
```

### C. Testowanie zapisu sesji

```bash
# Pobierz swój API key z dashboardu, potem:
curl -X POST http://localhost:3000/api/timer/session \
  -H "Content-Type: application/json" \
  -H "X-API-Key: mgt_TWOJ_KLUCZ" \
  -d '{
    "time": 3600,
    "monster": "Kic",
    "map": "Caerbannog'\''s Grotto - 1st Chamber",
    "hero": "TestPostac",
    "world": "tempest",
    "reason": "map_change"
  }'
```

### D. Testowanie zakończenia fazy (admin)

1. Zaloguj się jako admin na http://localhost:3000/dashboard
2. Przejdź do http://localhost:3000/leaderboard
3. Utwórz kilka sesji dla potwora "Kic" (używając API)
4. Kliknij przycisk "Zakończ fazę" przy potworze "Kic"
5. Sprawdź czy:
   - Utworzyła się faza "Kic1"
   - Ranking pokazuje zsumowane czasy
   - Nowe sesje będą przypisane do aktywnej fazy (Kic)

### E. Testowanie rankingów

1. Utwórz kilku użytkowników i dodaj im sesje
2. Zakończ kilka faz dla potwora
3. Sprawdź stronę `/leaderboard`:
   - Powinny być widoczne zakładki: Kic, Kic1, Kic2, etc.
   - Każda zakładka pokazuje ranking graczy
   - Ranking jest posortowany po czasie (malejąco)

## 4. Sprawdzanie bazy danych

```bash
# Otwórz Prisma Studio
npx prisma studio
```

Sprawdź tabele:
- **User** — użytkownicy (powinny być pola: nick, role)
- **Monster** — potwory
- **MapSession** — sesje (phaseId powinien być null dla aktywnych)
- **Phase** — fazy (Kic, Kic1, Kic2, etc.)
- **PhaseResult** — wyniki użytkowników w fazach

## 5. Testowanie skryptu Tampermonkey

1. Zainstaluj rozszerzenie Tampermonkey w przeglądarce
2. W dashboardzie kliknij "Zainstaluj skrypt jednym klikiem"
3. Tampermonkey otworzy okno instalacji — kliknij "Install"
4. Wejdź na stronę margonem.com
5. Skrypt powinien automatycznie wykrywać mapy i wysyłać dane

**Uwaga:** Dla lokalnego testowania musisz zmienić BACKEND_URL w skrypcie na `http://localhost:3000`

## 6. Typowe problemy

### Błąd: "relation does not exist"
```bash
# Uruchom ponownie migrację
npx prisma db push
```

### Błąd: "Invalid API key"
- Sprawdź czy API key jest poprawny (zaczyna się od `mgt_`)
- Sprawdź czy klucz jest aktywny w bazie danych

### Błąd: "Forbidden - admin only"
- Upewnij się, że użytkownik ma `role = 'admin'` w bazie danych

### Sesje nie są widoczne
- Sprawdź czy `phaseId` jest `null` dla aktywnych sesji
- Sprawdź czy sesje są przypisane do właściwego potwora

## 7. Reset bazy danych (jeśli potrzebujesz)

```bash
# UWAGA: To usunie wszystkie dane!
npx prisma migrate reset
# lub
npx prisma db push --force-reset
```

