# Uruchomienie lokalne

## 1. Środowisko

- **Node.js** ≥ 20.11 (sprawdź: `node -v`)
- Opcjonalnie: **PostgreSQL** lokalnie albo użycie bazy z Railway

## 2. Zmienne środowiskowe

Skopiuj plik z przykładowymi zmiennymi:

```bash
copy .env.example .env
```

(W PowerShell; w CMD: `copy .env.example .env`)

Edytuj `.env` i ustaw:

| Zmienna       | Opis |
|---------------|------|
| `DATABASE_URL` | Adres bazy. Lokalnie np. `postgresql://postgres:postgres@localhost:5432/margonem_timer` albo skopiuj **DATABASE_URL** z Railway (Variables w projekcie). |
| `JWT_SECRET`   | Dowolny długi, losowy string (np. wygeneruj: `openssl rand -base64 32`). |

## 3. Zależności i baza

```bash
npm install
npx prisma db push
```

(`prisma db push` dopasuje schemat Prisma do bazy; przy pierwszym uruchomieniu na pustej bazie utworzy tabele.)

## 4. Uruchomienie dev servera

```bash
npm run dev
```

Aplikacja będzie dostępna pod **http://localhost:3000**.

---

**Tip:** Jeśli nie masz lokalnego PostgreSQL, w Railway w projekcie wejdź w serwis bazy → **Connect** → skopiuj **Postgres Connection URL** i wklej jako `DATABASE_URL` w `.env`. Wtedy podczas kodowania korzystasz z tej samej bazy co na deployu (uważaj przy testach na żywych danych).
