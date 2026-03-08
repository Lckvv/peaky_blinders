# Cloudflare przed Railway — krok po kroku

Dodanie Cloudflare daje: ochronę przed DDoS, rate limiting, opcjonalne ukrycie originu. Potrzebujesz **własnej domeny** (np. `twojastrona.pl`).

---

## 1. Masz już domenę?

- **Tak** → przejdź do kroku 2.
- **Nie** → kup domenę u rejestratora (np. home.pl, ovh.pl, cloudflare.com) i dopiero potem kroki poniżej.

---

## 2. Dodaj domenę do Cloudflare

1. Wejdź na [dash.cloudflare.com](https://dash.cloudflare.com) i zaloguj się (lub załóż konto).
2. **Add a site** → wpisz swoją domenę (np. `twojastrona.pl`) → wybierz plan **Free** → Continue.
3. Cloudflare pokaże rekordy DNS (możesz je zostawić). Kliknij **Continue**.
4. Cloudflare poda **twoje nameservery**, np.:
   - `ada.ns.cloudflare.com`
   - `bob.ns.cloudflare.com`
5. **Skopiuj te nameservery.**

---

## 3. Ustaw nameservery u rejestratora domeny

1. Wejdź do panelu u **rejestratora domeny** (gdzie kupiłeś domenę).
2. Znajdź sekcję **DNS / Nameservery / Serwery nazw**.
3. **Zamień** dotychczasowe nameservery na te z Cloudflare (z kroku 2).
4. Zapisz. Propagacja trwa zwykle 5–60 minut (czasem do 24 h).

---

## 4. DNS w Cloudflare — wskaż na Railway

1. W Cloudflare: **Twoja domena** → **DNS** → **Records**.
2. Dodaj rekord:
   - **Type:** `CNAME`
   - **Name:** `@` (dla twojastrona.pl) albo np. `app` (dla app.twojastrona.pl)
   - **Target:** Twój adres Railway, np. `peakyblinders-production-61db.up.railway.app`
   - **Proxy status:** **Proxied** (pomarańczowa chmurka) — wtedy ruch idzie przez Cloudflare.
3. Jeśli chcesz też `www`:
   - **Type:** `CNAME`
   - **Name:** `www`
   - **Target:** `twojastrona.pl` (lub ten sam Railway URL)
   - **Proxy:** Proxied.

---

## 5. Dodaj domenę w Railway

1. Railway Dashboard → **Twój projekt** → **serwis (aplikacja)** → **Settings** → **Networking** / **Domains**.
2. **Add custom domain** / **Generate domain**.
3. Wpisz dokładnie tę samą domenę, której używasz w Cloudflare (np. `twojastrona.pl` lub `app.twojastrona.pl`).
4. Railway może pokazać, że trzeba ustawić CNAME — **już to zrobiłeś w Cloudflare** (krok 4), więc nic więcej nie ustawiasz u rejestratora.
5. Poczekaj, aż Railway wystawi certyfikat (status „Active” / zielony). Czasem trzeba odczekać kilka minut.

---

## 6. SSL w Cloudflare (opcjonalnie)

1. W Cloudflare: **SSL/TLS**.
2. Ustaw **Full** lub **Full (strict)** — wtedy połączenie użytkownik → Cloudflare i Cloudflare → Railway jest szyfrowane.
3. Dla Railway zwykle wystarcza **Full**.

---

## 7. Zaktualizuj BACKEND_URL w aplikacji

- W skrypcie Tampermonkey użytkownicy muszą mieć **nowy adres** (Twoja domena), jeśli wcześniej używali `*.up.railway.app`.
- W **Railway Variables** możesz dodać zmienną np. `NEXT_PUBLIC_APP_URL=https://twojastrona.pl` i używać jej tam, gdzie generujesz linki.
- Użytkownicy w ustawieniach skryptu powinni ustawić **Backend URL** na `https://twojastrona.pl` (bez końcowego `/`).

---

## 8. (Opcjonalnie) Ochrona przed botami / rate limit

- W Cloudflare: **Security** → **Bots** — możesz włączyć ochronę botów (plan Free ma podstawy).
- **Security** → **WAF** — w planie Free masz ograniczone reguły; można np. ograniczyć requesty do `/api/` po kraju lub IP.

---

## Podsumowanie

| Krok | Gdzie | Co zrobić |
|------|--------|------------|
| 1 | Cloudflare | Dodać stronę (domenę), skopiować nameservery |
| 2 | Rejestrator | Ustawić nameservery na Cloudflare |
| 3 | Cloudflare DNS | Dodać CNAME `@` → `xxx.up.railway.app`, Proxied |
| 4 | Railway | Dodać custom domain (ta sama domena) |
| 5 | Cloudflare SSL | Ustawić Full |
| 6 | Skrypt / BACKEND_URL | Użyć nowej domeny zamiast `*.railway.app` |

Po tym ruch idzie: **Użytkownik → Cloudflare → Railway**. Cloudflare może blokować ataki i limitować ruch zanim trafi do Twojej aplikacji.
