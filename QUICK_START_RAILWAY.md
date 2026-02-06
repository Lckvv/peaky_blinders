# 🚀 Szybki start - Railway (krok po kroku)

## Krok 1: Utworzyłeś bazę danych ✅
Widzisz "You have no tables" - to normalne! Teraz musisz utworzyć tabele.

## Krok 2: Uruchom migrację bazy danych

### Metoda A: Przez Railway Dashboard (NAJŁATWIEJSZA) ⭐

1. **Wróć do głównego projektu** (nie bazy danych):
   - Kliknij "X" w prawym górnym rogu (zamknij widok bazy)
   - Wróć do projektu "peaky_blinders"

2. **Otwórz zakładkę "Deployments"** (gdzie widzisz swój aktywny deploy)

3. **Znajdź przycisk "Shell" lub "Run Command"**:
   - W prawym górnym rogu aktywnego deploymentu
   - Lub w menu (trzy kropki ⋮) przy deploymentzie
   - Kliknij "Shell" lub "Run Command"

4. **Wykonaj komendę**:
   ```bash
   npx prisma db push
   ```

5. **Poczekaj na zakończenie** - powinno pokazać:
   ```
   ✔ Generated Prisma Client
   ✔ Database schema pushed successfully
   ```

### Metoda B: Przez Railway CLI

```bash
# Zainstaluj Railway CLI (jeśli jeszcze nie masz)
npm i -g @railway/cli

# Zaloguj się
railway login

# Połącz z projektem (wybierz "peaky_blinders")
railway link

# Uruchom migrację
railway run npx prisma db push
```

## Krok 3: Sprawdź czy tabele zostały utworzone

1. **Wróć do bazy danych PostgreSQL**:
   - Kliknij na "Postgres" w sidebarze
   - Zakładka "Data"

2. **Powinieneś zobaczyć tabele**:
   - `User`
   - `ApiKey`
   - `Monster`
   - `MapSession`
   - `Phase`
   - `PhaseResult`

## Krok 4: Zarejestruj użytkownika

1. **Otwórz aplikację**:
   - URL: `peakyblinders-production-61db.up.railway.app` (lub Twój URL)
   - Przejdź do: `/dashboard`

2. **Zarejestruj się**:
   - Kliknij zakładkę "Rejestracja"
   - Wypełnij formularz (email, username, password, opcjonalnie nick)
   - Zapisz swój API key!

## Krok 5: Ustaw użytkownika jako admin

### Teraz możesz użyć SQL Editor:

1. **W bazie danych PostgreSQL** → zakładka **"Data"**
2. **Kliknij na tabelę "User"** (jeśli widzisz tabele)
3. **Lub użyj SQL**:
   - W Railway może być zakładka "Query" lub "SQL"
   - Jeśli nie ma, użyj Railway CLI:

```bash
railway connect postgres
```

Po połączeniu wykonaj:
```sql
-- Sprawdź użytkowników
SELECT id, username, email, role FROM "User";

-- Ustaw admina (zamień 'twoj_username')
UPDATE "User" SET role = 'admin' WHERE username = 'twoj_username';

-- Sprawdź
SELECT username, role FROM "User" WHERE role = 'admin';
```

## ⚠️ Ważne!

- **Najpierw** uruchom `npx prisma db push` (Krok 2)
- **Potem** zarejestruj użytkownika (Krok 4)
- **Na końcu** ustaw admina (Krok 5)

## 🔍 Jeśli nie widzisz zakładki "Query" w Railway

Railway może nie mieć bezpośredniego SQL editora w interfejsie. W takim przypadku:

1. **Użyj Railway CLI** (Metoda B powyżej)
2. **Lub użyj zewnętrznego narzędzia**:
   - Pobierz `DATABASE_URL` z Railway → PostgreSQL → Variables
   - Użyj np. [pgAdmin](https://www.pgadmin.org/) lub [DBeaver](https://dbeaver.io/)
   - Połącz się używając `DATABASE_URL`

## ✅ Gotowe!

Po wykonaniu wszystkich kroków:
- Baza danych ma tabele ✅
- Masz zarejestrowanego użytkownika ✅
- Użytkownik ma rolę admin ✅
- Możesz używać funkcji admina w aplikacji ✅

