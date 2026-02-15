# Jak Lootlog (i Margonem) udostępnia dane o graczach na mapie

Dokument wyciągnięty z repozytorium [lootlog/monorepo](https://github.com/lootlog/monorepo) (MIT) – opisuje, skąd brać informacje o graczu, mapie i innych graczach w grze Margonem.

---

## 1. Dwa interfejsy gry (NI vs SI)

Margonem ma **dwa interfejsy**:
- **NI** (new interface): obiekt `window.Engine`
- **SI** (stary interfejs): obiekt `window.g` + globalne `window.hero`, `window.map`

Lootlog wykrywa interfejs tak:

```ts
// apps/game-client/src/lib/game.ts
static get interface() {
  return typeof window.Engine === "object" ? "ni" : "si";
}
```

W Twoim skrypcie Tampermonkey już używasz fallbacku: `Engine || window.Engine || window.engine`.

---

## 2. Aktualna mapa

| Źródło | Nowy interfejs (NI) | Stary interfejs (SI) |
|--------|---------------------|----------------------|
| **Obiekt** | `window.Engine.map.d` | `window.map` |
| **Nazwa mapy** | `Engine.map.d.name` | `map.name` |
| **ID mapy** | `Engine.map.d.id` | `map.id` |

Typ z Lootlog (`GameMap`):

```ts
// apps/game-client/src/types/margonem/map.ts
export type GameMap = {
  visibility: number;
  name: string;
  id: number;
};
```

W Twoim skrypcie: `getEngine()?.map?.d?.name` – to jest zgodne z Lootlog.

---

## 3. Postać gracza (hero)

| Źródło | Nowy interfejs (NI) | Stary interfejs (SI) |
|--------|---------------------|----------------------|
| **Dane postaci** | `window.Engine.hero.d` | `window.hero` |

Ważne pola `GameHero` (z Lootlog):

- `nick` – nick postaci  
- `lvl`, `prof` – poziom, profesja  
- `id`, `account` – id postaci / konta  
- `x`, `y`, `dir` – pozycja na mapie  
- `clan` – `{ id, name, rank }`  
- `img` – ścieżka do ikony (outfit)  
- oraz m.in. `gold`, `exp`, `stamina`, statystyki wojownika itd.

Strój (outfit) w nowym interfejsie: Lootlog korzysta z `Engine.hero` (obiekt ma m.in. `hero.d`, `hero.outfitData`, `hero.icon` / `hero.outfit`). W Twoim skrypcie używasz `hero.d.icon`, `hero.outfitData` i fallbacku z `localStorage['Margonem']` (charlist) – to dobre uzupełnienie.

---

## 4. Inni gracze na mapie („others”)

To jest **główna odpowiedź na pytanie: skąd lista graczy na mapie**.

Lootlog używa **`Engine.others.check()`** (tylko NI). Zwraca obiekt: klucz → obiekt z polem `.d` (dane gracza).

```ts
// apps/game-client/src/lib/game.ts
static getOther(key: string): GameOther {
  if (this.interface === "ni") {
    const othersData = window.Engine.others.check();
    return othersData[key]?.d;
  } else {
    return window.g.other?.[key];
  }
}
```

Typ **GameOther** (Lootlog):

```ts
// apps/game-client/src/types/margonem/others.ts
export type GameOther = {
  account: number;
  icon: string;
  id: string;
  lvl: number;
  prof: string;
  nick: string;
};
```

Czyli **lista graczy na mapie** w nowym interfejsie:

```js
// W Tampermonkey (strona gry):
const engine = typeof Engine !== 'undefined' ? Engine : window.Engine;
if (engine?.others?.check) {
  const othersMap = engine.others.check(); // { [key]: { d: GameOther } }
  const playersOnMap = Object.keys(othersMap).map(key => othersMap[key]?.d).filter(Boolean);
  // playersOnMap[].nick, .lvl, .prof, .icon, .id, .account
}
```

W starym interfejsie (SI): `window.g.other` – obiekt po kluczu, wartości to już bezpośrednio `GameOther` (bez `.d`).

---

## 5. Eventy gry (successData) – aktualizacje w czasie rzeczywistym

Lootlog **przechwytuje wywołania** `successData` (odpowiedzi serwera gry), żeby dostać eventy (wejście na mapę, inni gracze, NPC-e, loot itd.):

- `window.successData`  
- lub `window.Engine.communication.successData` (NI)

W `game-events-manager.ts` używają **Proxy** na tę funkcję i parsują pierwszy argument (string JSON lub obiekt) jako **GameEvent**.

W **GameEvent** są m.in.:

- **`other`** – słownik graczy (inne postaci) w evencie; format: `{ [key: number]: { account, icon, prof, lvl, nick, action: "CREATE" } }`
- **`friends`** / **`friends_max`**, **`enemies`** / **`enemies_max`** – listy nicków (Lootlog je czasem usuwa z payloadu ze względów prywatności).

Dzięki temu można nie tylko odpytywać `Engine.others.check()`, ale też **reagować na eventy** wejścia/wyjścia innych graczy, jeśli gry te eventy tam wpuszczają.

---

## 6. NPC-e na mapie

Lootlog pobiera listę NPC-ów tak:

- **NI**: `window.Engine.npcs.getDrawableList().map(npc => npc.d)`
- **SI**: `Object.values(window.g.npc)`

Przydatne np. do detekcji bossów / „kto jest na mapie” po stronie mobów.

---

## 7. Świat (world) i inicjalizacja

- **Nazwa świata**:  
  - NI: `window.Engine.worldConfig.getWorldName()`  
  - SI: `window.g.worldConfig.getWorldName()`  
  - Fallback: subdomena z `location.hostname` (np. `*.margonem.pl`).

- **Czy gra zainicjowana**:  
  - NI: `window.Engine?.interface?.alreadyInitialised` lub `Engine.interface.getAlreadyInitialised?.()`  
  - SI: `window.g?.init === 5`.

---

## 8. Podsumowanie – „gracze na mapie” w Twoim projekcie

| Co chcesz | Gdzie to wziąć (userscript na margonem) |
|-----------|------------------------------------------|
| **Aktualna mapa** | `Engine.map.d.name`, `Engine.map.d.id` (lub `window.map` w SI) |
| **Własna postać** | `Engine.hero.d` (lub `window.hero`) – nick, lvl, prof, clan, icon/outfit |
| **Lista innych graczy na mapie** | **`Engine.others.check()`** → obiekt `{ [key]: { d: { nick, lvl, prof, icon, id, account } } }` (NI); w SI: `window.g.other` |
| **Eventy na żywo** | Proxy na `window.successData` / `Engine.communication.successData` i parsowanie payloadu jako GameEvent (m.in. `other`, `friends`, `enemies`) |
| **NPC-e na mapie** | `Engine.npcs.getDrawableList()` (NI) lub `window.g.npc` (SI) |

Wszystkie powyższe odwołania działają w kontekście strony gry (Tampermonkey/Greasemonkey na margonem.pl), gdzie obiekt `Engine` / `window.Engine` i ewentualnie `window.g` są dostępne po załadowaniu gry.

---

## Odniesienia w repozytorium Lootlog

- `apps/game-client/src/lib/game.ts` – abstrakcja Engine / g (hero, map, others, npcs, world).
- `apps/game-client/src/types/margonem/` – typy: `engine.ts`, `hero.ts`, `map.ts`, `others.ts`, `game-events/*`.
- `apps/game-client/src/lib/game-events-manager.ts` – przechwytywanie `successData` i kolejkowanie eventów.

Repo: [https://github.com/lootlog/monorepo](https://github.com/lootlog/monorepo) (branch `develop`), licencja MIT.
