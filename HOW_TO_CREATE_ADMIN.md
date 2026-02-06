# 👑 Jak utworzyć użytkownika admin

## Metoda 1: Przez Railway Dashboard (NAJŁATWIEJSZA) ⭐

### Krok 1: Otwórz Railway Dashboard
1. Wejdź na [railway.app](https://railway.app)
2. Zaloguj się i wybierz swój projekt

### Krok 2: Otwórz SQL Editor
1. W projekcie kliknij na bazę danych **PostgreSQL**
2. Kliknij zakładkę **"Query"** (lub **"Data"** → **"Query"**)
3. Otworzy się SQL editor

### Krok 3: Wykonaj zapytanie SQL
```sql
-- Sprawdź istniejących użytkowników
SELECT id, username, email, role FROM "User";

-- Ustaw użytkownika jako admin (zamień 'twoj_username' na rzeczywisty username)
UPDATE "User" 
SET role = 'admin' 
WHERE username = 'twoj_username';

-- Sprawdź czy się udało
SELECT id, username, email, role FROM "User" WHERE username = 'twoj_username';
```

**Przykład:**
Jeśli Twój username to `testuser`, wykonaj:
```sql
UPDATE "User" 
SET role = 'admin' 
WHERE username = 'testuser';
```

### Krok 4: Zweryfikuj
```sql
SELECT username, role FROM "User" WHERE role = 'admin';
```
Powinieneś zobaczyć swojego użytkownika z `role = 'admin'`.

---

## Metoda 2: Przez Railway CLI

### Krok 1: Zainstaluj Railway CLI
```bash
npm i -g @railway/cli
```

### Krok 2: Zaloguj się i połącz z projektem
```bash
railway login
railway link
```

### Krok 3: Połącz się z bazą danych
```bash
railway connect postgres
```

### Krok 4: Wykonaj SQL
Po połączeniu z bazą wykonaj:
```sql
UPDATE "User" SET role = 'admin' WHERE username = 'twoj_username';
```

---

## Metoda 3: Lokalnie (jeśli masz dostęp do bazy Railway)

### Krok 1: Pobierz DATABASE_URL z Railway
1. W Railway dashboard → PostgreSQL → **"Variables"**
2. Skopiuj wartość `DATABASE_URL`

### Krok 2: Ustaw lokalnie
```bash
# Windows PowerShell
$env:DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# Linux/Mac
export DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
```

### Krok 3: Użyj Prisma Studio
```bash
npx prisma studio
```

1. Otwórz http://localhost:5555
2. Kliknij na tabelę **User**
3. Znajdź swojego użytkownika
4. Kliknij na rekord i edytuj pole **role**
5. Zmień z `user` na `admin`
6. Zapisz

### Krok 4: Lub użyj psql
```bash
# Połącz się z bazą Railway
psql "postgresql://user:password@host:5432/dbname?sslmode=require"

# Wykonaj SQL
UPDATE "User" SET role = 'admin' WHERE username = 'twoj_username';
```

---

## Metoda 4: Przez API (jeśli chcesz dodać endpoint)

Możesz też dodać endpoint do zmiany roli (tylko dla istniejących adminów):

```typescript
// app/api/admin/set-role/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const admin = await authFromCookie();
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userId, role } = await request.json();
  
  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });

  return NextResponse.json({ success: true });
}
```

Ale najpierw musisz mieć przynajmniej jednego admina (jajko-kura problem) 😄

---

## ✅ Weryfikacja

Po ustawieniu roli admin, sprawdź:

1. **Wyloguj się i zaloguj ponownie** na `/dashboard`
2. Przejdź do `/leaderboard`
3. Powinieneś zobaczyć przycisk **"Zakończ fazę"** przy potworach
4. Jeśli widzisz przycisk = działa! ✅

---

## 🔍 Sprawdzenie aktualnej roli

W Railway SQL Editor:
```sql
SELECT username, email, role, "createdAt" 
FROM "User" 
ORDER BY "createdAt" DESC;
```

To pokaże wszystkich użytkowników z ich rolami.

---

## ⚠️ Ważne

- **Nazwa tabeli:** W Prisma/PostgreSQL nazwa tabeli to `"User"` (z wielką literą i cudzysłowami)
- **Nazwa kolumny:** `role` (mała litera, bez cudzysłowów)
- **Wartości:** `'admin'` lub `'user'` (małe litery, w cudzysłowach)

---

## 🎯 Najszybszy sposób (dla Ciebie)

Skoro już masz deploy na Railway:

1. Railway Dashboard → PostgreSQL → **Query**
2. Wykonaj:
   ```sql
   UPDATE "User" SET role = 'admin' WHERE username = 'twoj_username';
   ```
3. Gotowe! ✅

