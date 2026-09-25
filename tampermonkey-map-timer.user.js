// ==UserScript==
// @name         Margonem Map Timer
// @namespace    http://tampermonkey.net/
// @version      2.17
// @description  Śledzenie czasu na mapach tytanów (Guardians of Souls). Event Easter wyłączony — tylko statystyki na stronie.
// @author       Lucek
// @match        https://*.margonem.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      *.railway.app
// @connect      *.up.railway.app
// ==/UserScript==

(function () {
    'use strict';

    // Uruchamiaj tylko w oknie głównym — w iframe skrypt by się dublował i wysyłał tę samą sesję 2× (pagehide w obu kontekstach).
    if (window !== window.top) return;

    /** Event Easter 2026 (41, 81) zakończony — brak zliczania czasu i panelu herosa. Statystyki tylko na stronie. */
    const EVE_EVENT_ENDED = true;

    // Wstrzykiwane przez /api/script/serve.user.js przy instalacji ze strony (nadpisuje stary klucz w Tampermonkey).
    var INSTALL_API_KEY = '';
    var INSTALL_BACKEND_URL = '';
    if (INSTALL_API_KEY) GM_setValue('api_key', INSTALL_API_KEY);
    if (INSTALL_BACKEND_URL) GM_setValue('backend_url', String(INSTALL_BACKEND_URL).replace(/\/$/, ''));

    // ================================================================
    //  CONFIG — zmień BACKEND_URL i API_KEY po rejestracji na stronie
    // ================================================================
    const DEFAULT_BACKEND_URL = 'https://guardiansofsouls.up.railway.app';

    function isLegacyBackendUrl(url) {
        if (!url || typeof url !== 'string') return true;
        var u = url.toLowerCase();
        return u.indexOf('peakyblinders') !== -1;
    }

    function resolveBackendUrl() {
        var stored = String(GM_getValue('backend_url', '') || '').trim().replace(/\/$/, '');
        if (isLegacyBackendUrl(stored)) {
            stored = DEFAULT_BACKEND_URL;
            GM_setValue('backend_url', stored);
        }
        return stored;
    }

    const CONFIG = {
        // 🔑 Twój API key — dostaniesz go po rejestracji na stronie
        API_KEY: GM_getValue('api_key', ''),

        // 🌐 Adres backendu (Railway) — możesz zmienić w ustawieniach ⏱
        BACKEND_URL: resolveBackendUrl(),

        // 🗺️ Mapy tytanów (event Easter wyłączony — bez zliczania czasu na mapach 41/81).
        TARGETS: [
            { map: 'Shimmering Cavern', monster: 'Orla' },
            { map: "Caerbannog's Grotto - 2nd Chamber", monster: 'Kic' },
            { map: "Bandits' Hideout - Vault", monster: 'Renegat' },
            { map: 'Politraka Volcano - Infernal Abyss', monster: 'Arcy' },
            { map: 'Goblin Dwelling - Forge', monster: 'Zoons' },
            { map: 'Source of Memories', monster: 'Łowczyni' },
            { map: 'Chamber of Bloody Rites', monster: 'Przyzywacz' },
            { map: 'Den of Lizad Nightmares - Spring', monster: 'Magua' },
            { map: 'Teotihuacan - Main Chamber', monster: 'Teza' },
            { map: 'Hall of Ruined Temple', monster: 'Barbatos' },
            { map: 'Ice Throne Room', monster: 'Tanroth' },
        ],

        CHECK_INTERVAL: 2000,
        MIN_TIME_TO_SEND: 5,
        DEBUG: true,
    };

    // ================================================================
    //  STATE
    // ================================================================
    let currentTarget = null;   // { map, monster } | null
    let sessionStartTime = null;
    let accumulatedSeconds = 0;
    let heroName = null;
    let worldName = null;
    let heroOutfitUrl = null;  // URL obrazka stroju z Garmory CDN (do rankingu)
    let uiElement = null;
    var TOP_TIMER_VISIBLE_KEY = 'map_timer_top_timer_visible';
    let kolejkiWrap = null;
    let kolejkiListPanel = null;
    let kolejkiListContent = null;
    let kolejkiMenuPanel = null;
    let kolejkiOpen = false;
    let kolejkiMenuOpen = false;
    let sessionFinalized = false;
    const HERO_AFK_CAP_SEC = 180;
    // Musi być zgodne z lib/session-limits.ts (TITAN_AFK_CAP_SEC).
    const TITAN_AFK_CAP_SEC = 15 * 60;
    const HERO_AFK_MONSTERS = ['Grim Blackcluck', 'Hotblood Capon'];
    var EVE_HERO_NICK_TO_KEY = { 'Grim Blackcluck': 41, 'Hotblood Capon': 81 };
    let sessionAfkCapped = false;
    let reservationsCache = { monster: null, data: null, ts: 0 };
    let phaseLeaderboardCache = { monster: null, data: null, ts: 0 };
    var kolejkiAsyncCache = { monster: null, reservations: [], timeByNick: {}, ts: 0 };
    const RESERVATIONS_CACHE_TTL_MS = 2 * 60 * 1000;
    const LEADERBOARD_CACHE_TTL_MS = 2 * 60 * 1000;
    const PRIORITY_COLORS = { 1: '#C8F527', 2: '#27F584', 3: '#2768F5' };
    const PRIORITY_LABELS = { 1: 'Priorytet I', 2: 'Priorytet II', 3: 'Priorytet III' };
    const NICK_COLOR_NO_LIST = '#888';
    let currentPngPopup = null;
    let currentPngPopupImg = null;
    // Tylko Heros (wt 80–89) lub Tytan (wt > 99) — jedno powiadomienie aż wyjście z mapy / odświeżenie
    const HEROS_WT_MIN = 80;
    const HEROS_WT_MAX = 89;
    const TITAN_WT_MIN = 100;
    const HERO_CALL_LEVELS = [63, 83, 114, 144, 167, 190, 217, 244, 271, 300];
    const HERO_CALL_LEVEL_RANGE = 13;
    const HERO_CALL_LEVEL_RANGE_UP = { 300: 200 };
    let lastHerosNotifiedMapName = null;
    // Heros eventowy (41, 81): wejście/wyjście wysyłane przez session (map_enter / leave).
    // Punkty łowcy są przypisane do KONTA (userId z API key), nie do postaci — wiele postaci = jedno konto.
    // Heros eventowy: listy map per EVE
    const EVE_MAPS = {
        41: [
            'Fort Eder',
            'Goblin Forest',
            'Mulberry Passage',
            'Marshy Valley',
            'Marshlands',
            'Brigand Vale',
            'Stony Hideout',
            'Desecrated Graveyard',
            'Defiled Tomb - 1st Level',
            'Defiled Tomb - 2nd Level',
            'Defiled Tomb - 3nd Level',
            'Defiled Tomb - 3rd Level',
            'Defiled Tomb - 4nd Level',
            'Defiled Tomb - 4th Level',
            'Defiled Tomb - 5nd Level',
            'Defiled Tomb - 5th Level',
        ],
        81: [
            'Andarum Ilami',
            'Rocks of Cold Songs',
            'Ice Crevasse - 1st Level - 1st Chamber',
            'Ice Crevasse - 2nd Level - 1st Chamber',
            'Ice Crevasse - 2nd Level',
            'Icespire Chamber',
            'Firn Cave - 2nd Level',
            'Firn Cave - 1st Level',
            'Hermitage of the Black Sun - 1st Level - North',
            'Hermitage of the Black Sun - 2nd Level',
            'Hermitage of the Black Sun - 3rd Level',
            'Hermitage of the Black Sun - 4th Level - 1st Chamber',
            'Hermitage of the Black Sun - 4th Level - 2nd Chamber',
            'Hermitage of the Black Sun - 3rd Level - South',
            'Andarum Temple - Warehouse 2nd Level',
            'Andarum Temple - Armory',
            'Andarum Temple - Warehouse 1st Level',
        ],
    };
    let eveWindowOpen = false;
    let eveWindowEl = null;
    var eveMapListPanelsByKey = {}; // eveKey -> { panel, listEl, listHeight }
    let selectedEveKey = null;
    var eveMapReservationsCache = {}; // eveKey -> { data: [{mapName,nick}], ts }
    var eveMapLastLeftCache = {};    // eveKey -> { lastLeft: { mapName: ms }, ts } — z API, żeby czasy przetrwały odświeżenie
    var eveMapLastLeftAt = {};       // eveKey -> { mapKey: timestamp } — lokalna nadpiska (np. właśnie wykryte wyjście)
    var evePrevPresenceByMap = {};   // eveKey -> { mapKey: [nicks] } — poprzedni stan obecności (do wykrycia wyjścia)
    const EVE_RESERVATIONS_CACHE_TTL_MS = 8 * 1000; // krótki cache, żeby pozycje (obecność) odświeżały się na bieżąco
    const EVE_LAST_LEFT_CACHE_TTL_MS = 5 * 1000;
    let eveMapPopupEl = null;
    let eveMapPopupCurrentMap = null;
    // Discord idzie przez /api/timer/clan-alert (webhooki tylko na serwerze).
    // Nazwa herosa (z gry) → ping na Discord; brak na liście = @here
    const HEROS_PING_MAP = {
        'Wicked Patrick': '@Mroczny Patryk',
        'Crimson Avenger': '@Karmazynowy Mściciel',
        'Thief': '@Złodziej',
        'Spiteful Guide': '@Zły Przewodnik',
        'Possessed Paladin': '@Opętany Paladyn',
        'Hellish Skeletor': '@Piekielny Kościej',
        'Grove Sentinel': '@Koziec Mąciciel Ścieżek',
        "Night's Mistress": '@Kochanka Nocy',
        'Prince Kasim': '@Książe Kasim',
        'Pious Friar': '@Święty Braciszek',
        'Golden Roger': '@Złoty Roger',
        'Sheepless Shepherd': '@Baca bez Łowiec',
        'Spellcaster Atalia': '@Czarująca Atalia',
        'Insane Orc Hunter': '@Obłąkany Łowca Orków',
        'Usurer Grauhaz': '@Lichwiarz Grauhaz',
        'Viviana Nandin': '@Viviana Nandin',
        'Frightener': '@Przeraza',
        'Demonis Lord of the Void': '@Demonis Pan Nicości',
        'Mulher Ma': '@Mulher Ma',
        'Vapor Veneno': '@Vapor Veneno',
        'Oakhornus': '@Dęborożec',
        'Tepeyollotl': '@Tepeyollotl',
        'Triad Specter': '@Widmo Triady',
        'Negthotep the Abyss Priest': '@Negthotep Czarny Kapłan',
        'Young Dragon': '@Młody Smok',
    };
    // Nazwa tytana (z gry) → ping na Discord; brak na liście = @here
    const TITAN_PING_MAP = {
        'Virgin Eagless': '@Dziewicza Orlica',
        'Killer Rabbit': '@Zabójczy Królik',
        'Renegade Baulus': '@Renegat Baulus',
        'Infernal Archmage': '@Piekielny Arcymag',
        'Versus Zoons': '@Versus Zoons',
        'Huntress of Memories': '@Łowczyni Wspomnień',
        'Daemons Summoner': '@Przyzywacz Demonów',
        'Maddok Magua': '@Maddok Magua',
        'Tezcatlipoca': '@Tezcatlipoca',
        'Dragon Guardian Barbatos': '@Barbatos Smoczy Strażnik',
        'Tanroth': '@Tanroth',
    };
    // Nazwa herosa → Discord ROLE ID. Ping roli w treści: <@&ROLE_ID> (niebieski).
    const HEROS_DISCORD_ROLE_IDS = {
        'Wicked Patrick': '1472308873837674755',
        'Crimson Avenger': '1472308934025941094',
        'Thief': '1472308994977829068',
        'Spiteful Guide': '1472309048388096243',
        'Possessed Paladin': '1472309150946951248',
        'Hellish Skeletor': '1472309197453393980',
        'Grove Sentinel': '1472309289996521675',
        "Night's Mistress": '1471916507297484905',
        'Prince Kasim': '1471916577728233574',
        'Pious Friar': '1471916606228664336',
        'Golden Roger': '1471916626336026835',
        'Sheepless Shepherd': '1471916650025717995',
        'Spellcaster Atalia': '1471916679297630310',
        'Insane Orc Hunter': '1471916718795522059',
        'Usurer Grauhaz': '1471916737887994098',
        'Viviana Nandin': '1471917686337441934',
        'Frightener': '1471916771392094374',
        'Demonis Lord of the Void': '1471916812185763840',
        'Mulher Ma': '1471916847736684708',
        'Vapor Veneno': '1471916953848512604',
        'Oakhornus': '1471916979752407101',
        'Tepeyollotl': '1471917002166767668',
        'Triad Specter': '1471917021200650516',
        'Negthotep the Abyss Priest': '1471917052242559059',
        'Young Dragon': '1471917079190831258',
    };
    // Nazwa tytana → Discord ROLE ID.
    const TITAN_DISCORD_ROLE_IDS = {
        'Virgin Eagless': '725114797875789926',
        'Killer Rabbit': '725114855698202656',
        'Renegade Baulus': '725114894034272317',
        'Infernal Archmage': '725114977656242247',
        'Versus Zoons': '725115162398294047',
        'Huntress of Memories': '780724987551023134',
        'Daemons Summoner': '725115268182835281',
        'Maddok Magua': '952532626760151050',
        'Tezcatlipoca': '780726825575383111',
        'Dragon Guardian Barbatos': '1109961353784995973',
        'Tanroth': '780726964830732319',
    };
    function lookupPing(name, pingMap) {
        if (!name || typeof name !== 'string') return '@here';
        var lower = name.trim().toLowerCase();
        for (var k in pingMap) {
            if (k.toLowerCase() === lower) return pingMap[k];
        }
        return '@here';
    }
    function lookupRoleMention(name, roleIds, pingMap) {
        if (!name || typeof name !== 'string') return '@here';
        var lower = name.trim().toLowerCase();
        for (var k in roleIds) {
            if (k.toLowerCase() === lower) {
                var id = roleIds[k];
                if (id && String(id).trim()) return '<@&' + String(id).trim() + '>';
            }
        }
        return lookupPing(name, pingMap);
    }
    /** Zwraca fragment treści do pinga: <@&roleId> (rola, niebieski) albo @nick / @here. */
    function getHeroMentionForContent(heroName) {
        return lookupRoleMention(heroName, HEROS_DISCORD_ROLE_IDS, HEROS_PING_MAP);
    }
    function getTitanMentionForContent(titanName) {
        return lookupRoleMention(titanName, TITAN_DISCORD_ROLE_IDS, TITAN_PING_MAP);
    }
    function nameLooksLikeTitan(name) {
        if (!name || typeof name !== 'string') return false;
        var lower = name.trim().toLowerCase();
        for (var k in TITAN_DISCORD_ROLE_IDS) {
            if (k.toLowerCase() === lower) return true;
        }
        for (var p in TITAN_PING_MAP) {
            if (p.toLowerCase() === lower) return true;
        }
        return false;
    }
    let heroAlertPanelEl = null;
    let lastHeroAlertData = null;
    let heroAlertSending = false;
    let selectedHeroCallLevel = 144;
    let myActiveCallId = null;
    let myActiveCall = null; // { id, nick, mapName, isTitan, createdAt } — wołanie wysłane przez tego gracza
    let lastCallHelpers = [];
    let callMiniEl = null;
    // Heros/tytan widziany na bieżącej mapie; zniknięcie z listy NPC przez kilka ticków = zbity.
    let trackedHeroOnMap = null; // { id, nick, mapName, missingTicks }
    const HERO_KILL_MISSING_TICKS = 3;
    const HERO_CALL_RETENTION_MS = 30 * 60 * 1000;
    let callStylesInjected = false;

    function refreshConfigFromStorage() {
        CONFIG.API_KEY = GM_getValue('api_key', '');
        CONFIG.BACKEND_URL = resolveBackendUrl();
    }

    // ================================================================
    //  UTILS
    // ================================================================
    function log(...args) {
        if (CONFIG.DEBUG) console.log('[MapTimer]', ...args);
    }

    function getEngine() {
        try {
            const E = typeof Engine !== 'undefined' ? Engine : (typeof window !== 'undefined' && (window.Engine || window.engine));
            if (E?.map?.d?.name) return E;
        } catch (e) { /* ignore */ }
        return null;
    }

    function getCurrentMapName() {
        const name = getEngine()?.map?.d?.name || null;
        return name != null ? String(name).trim() : null;
    }

    const GARMORY_OUTFIT_BASE = 'https://micc.garmory-cdn.cloud/obrazki/postacie';
    const GARMORY_NPC_BASE = 'https://micc.garmory-cdn.cloud/obrazki/npc';

    /** Zwraca pełny URL obrazka stroju (outfit) z CDN Garmory. Źródła: hero.icon, hero.outfit, hero.outfitData (src/url/image). */
    function getHeroOutfitUrl() {
        const engine = getEngine();
        if (!engine?.hero) return null;
        const hero = engine.hero;
        const d = hero.d || {};

        // outfitData może zawierać bezpośredni URL (src, url, image)
        const od = hero.outfitData;
        if (od && typeof od === 'object') {
            const direct = od.src ?? od.url ?? od.image;
            if (direct && typeof direct === 'string' && (direct.startsWith('http') || direct.startsWith('//'))) {
                return direct.startsWith('//') ? 'https:' + direct : direct;
            }
        }

        // Ścieżka ikony: engine.hero.icon / outfit (format: /ścieżka lub ścieżka)
        const icon = d.icon ?? hero.icon ?? d.outfit ?? hero.outfit;
        if (!icon || typeof icon !== 'string') return null;
        const path = icon.startsWith('/') ? icon : '/' + icon;
        return GARMORY_OUTFIT_BASE.replace(/\/$/, '') + path;
    }

    /** Szuka w obiekcie tablic postaci (charlist) i zwraca URL stroju dla nicku. */
    function findOutfitInCharlist(charlist, heroName) {
        if (!charlist || typeof charlist !== 'object' || !heroName) return null;
        const nick = String(heroName).trim().toLowerCase();
        for (const userId of Object.keys(charlist)) {
            const chars = charlist[userId];
            if (!Array.isArray(chars)) continue;
            for (const char of chars) {
                if (char && char.icon && String(char.nick || '').trim().toLowerCase() === nick) {
                    const path = String(char.icon).startsWith('/') ? char.icon : '/' + char.icon;
                    return GARMORY_OUTFIT_BASE.replace(/\/$/, '') + path;
                }
            }
        }
        return null;
    }

    /** Fallback: strój z localStorage Margonem po nicku postaci. Próbuje kluczy: Margonem, margonem oraz skanuje wszystkie klucze. */
    function getOutfitFromLocalStorage(heroName) {
        if (!heroName || typeof heroName !== 'string') return null;
        const nick = String(heroName).trim().toLowerCase();
        try {
            const keysToTry = ['Margonem', 'margonem', 'MARGONEM'];
            for (const key of keysToTry) {
                const raw = localStorage.getItem(key);
                if (!raw) continue;
                const data = JSON.parse(raw);
                const charlist = data && typeof data.charlist === 'object' ? data.charlist : (data && typeof data === 'object' ? data : null);
                const url = findOutfitInCharlist(charlist, heroName);
                if (url) {
                    if (CONFIG.DEBUG) log('Outfit z localStorage (klucz "' + key + '"):', url);
                    return url;
                }
            }
        } catch (e) {
            if (CONFIG.DEBUG) log('getOutfitFromLocalStorage error:', e);
        }
        if (CONFIG.DEBUG) {
            const raw = localStorage.getItem('Margonem');
            log('Outfit: brak dla "' + heroName + '". localStorage["Margonem"]:', raw ? (raw.length + ' znaków, start: ' + raw.slice(0, 80)) : 'brak klucza');
        }
        return null;
    }

    function getHeroInfo() {
        const engine = getEngine();
        if (!engine?.hero) return null;
        const name = engine.hero.d?.nick || engine.hero.nick || engine.hero.name || 'Unknown';
        const outfitUrl = getHeroOutfitUrl() || getOutfitFromLocalStorage(name);
        return {
            name: name,
            world: engine.map?.d?.mainid || engine.hero.d?.world || engine.hero.world || 'Unknown',
            outfitUrl: outfitUrl,
        };
    }
    /** Aktualny nick z gry (z Engine), nie tylko po wejściu na mapę tytana. */
    function getCurrentHeroName() {
        var info = getHeroInfo();
        return (info && info.name) ? info.name : (heroName || 'Ty');
    }

    function getCurrentHeroLevel() {
        try {
            var engine = getEngine();
            var h = engine && engine.hero;
            var d = h && h.d ? h.d : h;
            var lvl = d && d.lvl != null ? Number(d.lvl) : (h && h.lvl != null ? Number(h.lvl) : NaN);
            return Number.isFinite(lvl) ? lvl : null;
        } catch (e) {
            return null;
        }
    }

    /** Ścieżka ikony NPC → CDN Garmory (lootlog: micc.garmory-cdn.cloud/obrazki/npc/). */
    function resolveNpcGfxUrl(icon) {
        if (!icon || typeof icon !== 'string') return null;
        var s = icon.trim();
        if (!s) return null;
        if (s.indexOf('http://') === 0 || s.indexOf('https://') === 0) return s;
        if (s.indexOf('//') === 0) return 'https:' + s;
        s = s.replace(/^\/+/, '');
        if (s.indexOf('obrazki/') === 0) return 'https://micc.garmory-cdn.cloud/' + s;
        return GARMORY_NPC_BASE.replace(/\/$/, '') + '/' + s;
    }

    function pickNpcIconFromObj(obj) {
        if (!obj || typeof obj !== 'object') return null;
        var raw = obj.icon ?? obj.gfx ?? obj.img ?? obj.image ?? obj.src ?? obj.url ?? obj.outfit ?? obj.avatar;
        if (raw && typeof raw === 'object') raw = raw.src ?? raw.url ?? raw.id ?? raw.path ?? null;
        return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
    }

    function getNpcTplObject(tpl) {
        if (tpl == null || tpl === '') return null;
        try {
            var engine = getEngine();
            var tplManager = engine && engine.npcTplManager && typeof engine.npcTplManager.getNpcTpl === 'function' ? engine.npcTplManager : null;
            if (!tplManager) return null;
            var obj = tplManager.getNpcTpl(tpl);
            return obj && typeof obj === 'object' ? obj : null;
        } catch (e) {
            return null;
        }
    }

    function mapNpcRecord(npc, tplManager) {
        var d = npc && npc.d != null ? npc.d : npc;
        if (!d) return null;
        var tplObj = null;
        if (d.tpl != null && tplManager) {
            try { tplObj = tplManager.getNpcTpl(d.tpl); } catch (e) { tplObj = null; }
        }
        var wt = d.wt != null ? Number(d.wt) : undefined;
        if (wt == null && tplObj && tplObj.wt != null) wt = Number(tplObj.wt);
        var icon = pickNpcIconFromObj(d) || pickNpcIconFromObj(npc) || pickNpcIconFromObj(tplObj);
        return {
            id: d.id,
            wt: wt,
            nick: d.nick,
            tpl: d.tpl,
            icon: icon,
            lvl: d.lvl != null ? Number(d.lvl) : (tplObj && tplObj.lvl != null ? Number(tplObj.lvl) : undefined),
            x: d.x != null ? Number(d.x) : undefined,
            y: d.y != null ? Number(d.y) : undefined,
        };
    }

    /** Lista NPCów na mapie (potwory, herosy itd.). wt = widget type (Lootlog: >79 = Heros, >89 = Kolos, >99 = Tytan). */
    function getNpcsOnMap() {
        const engine = getEngine();
        if (!engine) return [];
        try {
            if (typeof engine.npcs !== 'undefined' && typeof engine.npcs.getDrawableList === 'function') {
                const list = engine.npcs.getDrawableList();
                if (!Array.isArray(list)) return [];
                const tplManager = engine.npcTplManager && typeof engine.npcTplManager.getNpcTpl === 'function' ? engine.npcTplManager : null;
                return list.map(function (npc) { return mapNpcRecord(npc, tplManager); }).filter(Boolean);
            }
            if (typeof window.g !== 'undefined' && window.g && window.g.npc) {
                const arr = Object.values(window.g.npc);
                return arr.map(function (d) { return mapNpcRecord(d, null); }).filter(Boolean);
            }
        } catch (e) {
            if (CONFIG.DEBUG) log('getNpcsOnMap error:', e);
        }
        return [];
    }

    /** Czy wt to Heros (80–89) lub Tytan (100+). Kolos (90–99) pomijamy. */
    function isHeroOrTitan(wt) {
        if (wt == null || typeof wt !== 'number') return false;
        return (wt >= HEROS_WT_MIN && wt <= HEROS_WT_MAX) || wt >= TITAN_WT_MIN;
    }

    function getNpcImageUrlFromNpc(npcOrTpl) {
        if (npcOrTpl && typeof npcOrTpl === 'object') {
            var fromObj = resolveNpcGfxUrl(pickNpcIconFromObj(npcOrTpl) || npcOrTpl.icon);
            if (fromObj) return fromObj;
            if (npcOrTpl.tpl != null) npcOrTpl = npcOrTpl.tpl;
        }
        var tplObj = getNpcTplObject(npcOrTpl);
        return resolveNpcGfxUrl(pickNpcIconFromObj(tplObj));
    }

    /** Pobiera URL obrazka NPC/herosa z gry (silnik — szablon tpl). Zwraca null gdy brak. */
    function getNpcImageUrlFromEngine(tpl) {
        return getNpcImageUrlFromNpc(tpl);
    }

    function nearestCallLevel(heroLvl) {
        if (heroLvl == null || !Number.isFinite(Number(heroLvl))) return 144;
        var best = HERO_CALL_LEVELS[0];
        var bestDiff = 9999;
        HERO_CALL_LEVELS.forEach(function (l) {
            var d = Math.abs(l - Number(heroLvl));
            if (d < bestDiff) { bestDiff = d; best = l; }
        });
        return best;
    }

    function heroCallLevelRange(level) {
        level = Number(level);
        var up = HERO_CALL_LEVEL_RANGE_UP[level] != null ? HERO_CALL_LEVEL_RANGE_UP[level] : HERO_CALL_LEVEL_RANGE;
        return { lo: level - HERO_CALL_LEVEL_RANGE, hi: level + up };
    }

    function isPlayerInCallRange(callLevel, myLvl) {
        if (callLevel == null || callLevel === 0) return true;
        if (myLvl == null || !Number.isFinite(Number(myLvl))) return true;
        var range = heroCallLevelRange(callLevel);
        return Number(myLvl) >= range.lo && Number(myLvl) <= range.hi;
    }

    function apiTimerUrl(path) {
        return CONFIG.BACKEND_URL.replace(/\/$/, '') + path;
    }

    function resolveAlertImageUrl(data) {
        if (!data) return null;
        if (data.icon) {
            var fromIcon = resolveNpcGfxUrl(data.icon);
            if (fromIcon) return fromIcon;
        }
        var fromEngine = getNpcImageUrlFromNpc(data) || getNpcImageUrlFromEngine(data.tpl);
        if (fromEngine) return fromEngine;
        if (data.heroImageUrl && typeof data.heroImageUrl === 'string') {
            var u = data.heroImageUrl.trim();
            if (u.indexOf('http') === 0) return u;
            if (u.charAt(0) === '/' && CONFIG.BACKEND_URL) return CONFIG.BACKEND_URL.replace(/\/$/, '') + u;
            return resolveNpcGfxUrl(u);
        }
        return null;
    }

    /** Jedno powiadomienie na mapę — reset przy wyjściu z mapy lub odświeżeniu. Pokazuje panel z przyciskami Zawołaj klan / Zamknij. */
    function checkHerosOnMapAndNotify() {
        const mapName = getCurrentMapName();
        if (lastHerosNotifiedMapName !== null && lastHerosNotifiedMapName !== mapName) {
            lastHerosNotifiedMapName = null;
            hideHeroAlertPanel();
        }
        if (trackedHeroOnMap && trackedHeroOnMap.mapName !== mapName) trackedHeroOnMap = null;
        if (!mapName) return;
        const npcs = getNpcsOnMap();
        const heroNpc = npcs.find(function (n) { return isHeroOrTitan(n.wt); });
        trackHeroKill(heroNpc, mapName);
        if (!heroNpc) return;
        if (lastHerosNotifiedMapName === mapName) return;
        lastHerosNotifiedMapName = mapName;
        const isTitan = heroNpc.wt >= TITAN_WT_MIN;
        const name = (heroNpc.nick && String(heroNpc.nick).trim()) || (isTitan ? 'Tytan' : 'Heros');
        lastHeroAlertData = {
            nick: name,
            lvl: heroNpc.lvl,
            x: heroNpc.x,
            y: heroNpc.y,
            mapName: mapName,
            tpl: heroNpc.tpl,
            icon: heroNpc.icon,
            wt: heroNpc.wt,
            isTitan: isTitan || nameLooksLikeTitan(name),
        };
        selectedHeroCallLevel = lastHeroAlertData.isTitan ? 0 : nearestCallLevel(heroNpc.lvl);
        clearActiveCall();
        var nameTrim = (name || '').trim();
        var eveKey = EVE_HERO_NICK_TO_KEY[nameTrim];
        if (eveKey == null && nameTrim) {
            var match = Object.keys(EVE_HERO_NICK_TO_KEY).filter(function (n) { return n.toLowerCase() === nameTrim.toLowerCase(); })[0];
            if (match) eveKey = EVE_HERO_NICK_TO_KEY[match];
        }
        if (eveKey != null && CONFIG.API_KEY && !EVE_EVENT_ENDED) {
            fetch(CONFIG.BACKEND_URL.replace(/\/$/, '') + '/api/timer/eve-hunter-found', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY },
                body: JSON.stringify({ eveKey: eveKey })
            }).then(function (r) {
                if (r.status === 200) showToast('+1 pkt Łowcy herosa');
            }).catch(function () {});
        }
        showHeroAlertPanel();
        log('Heros/Tytan na mapie:', name, '(wt:', heroNpc.wt + ')');
    }

    function heroNpcDisplayName(heroNpc) {
        var isTitan = heroNpc.wt >= TITAN_WT_MIN;
        return (heroNpc.nick && String(heroNpc.nick).trim()) || (isTitan ? 'Tytan' : 'Heros');
    }

    /** Heros zniknął z listy NPC przez kilka ticków, a gracz dalej stoi na tej samej mapie = zbity. */
    function trackHeroKill(heroNpc, mapName) {
        if (heroNpc) {
            var key = heroNpc.id != null ? heroNpc.id : heroNpcDisplayName(heroNpc);
            if (!trackedHeroOnMap || trackedHeroOnMap.id !== key) {
                trackedHeroOnMap = { id: key, nick: heroNpcDisplayName(heroNpc), mapName: mapName, missingTicks: 0 };
            } else {
                trackedHeroOnMap.missingTicks = 0;
            }
            return;
        }
        if (!trackedHeroOnMap) return;
        trackedHeroOnMap.missingTicks++;
        if (trackedHeroOnMap.missingTicks < HERO_KILL_MISSING_TICKS) return;
        var killed = trackedHeroOnMap;
        trackedHeroOnMap = null;
        onHeroKilled(killed.nick, killed.mapName);
    }

    /** Każdy skrypt na mapie zgłasza zbicie; serwer wysyła na Discord tylko raz (i tylko gdy ktoś wołał). */
    function onHeroKilled(nick, mapName) {
        log('Heros/Tytan zniknął z mapy (zbity):', nick, mapName);
        closeHeroWindowsFor(nick, mapName);
        if (!CONFIG.API_KEY || !nick) return;
        fetch(apiTimerUrl('/api/timer/hero-call-killed'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY },
            body: JSON.stringify({ nick: nick, mapName: mapName, reporterNick: getCurrentHeroName() }),
        }).catch(function () {});
    }

    function closeHeroWindowsFor(nick, mapName) {
        if (myActiveCall && myActiveCall.nick === nick && myActiveCall.mapName === mapName) {
            var wasTitan = myActiveCall.isTitan;
            clearActiveCall();
            showToast('✅ ' + (wasTitan ? 'Tytan' : 'Heros') + ' ' + nick + ' zbity');
        }
        if (lastHeroAlertData && lastHeroAlertData.nick === nick && lastHeroAlertData.mapName === mapName && heroAlertPanelEl) {
            heroAlertPanelEl.style.display = 'none';
        }
    }

    function clearActiveCall() {
        myActiveCallId = null;
        myActiveCall = null;
        lastCallHelpers = [];
        hideCallMini();
    }

    /** Małe okienko z listą chętnych — pokazywane po zamknięciu dużego panelu wołania. */
    function showCallMini() {
        if (!myActiveCall) return;
        injectCallStyles();
        if (!callMiniEl) {
            callMiniEl = document.createElement('div');
            callMiniEl.id = 'map-timer-call-mini';
            callMiniEl.innerHTML =
                '<button type="button" class="mt-mini-x" title="Zamknij">×</button>' +
                '<div class="mt-mini-title"></div>' +
                '<div class="mt-mini-list"></div>';
            callMiniEl.querySelector('.mt-mini-x').addEventListener('click', hideCallMini);
            document.body.appendChild(callMiniEl);
        }
        callMiniEl.className = myActiveCall.isTitan ? 'is-titan' : 'is-hero';
        callMiniEl.querySelector('.mt-mini-title').textContent = 'Wołanie: ' + myActiveCall.nick;
        renderCallMiniHelpers();
        callMiniEl.style.display = 'block';
    }

    function hideCallMini() {
        if (callMiniEl) callMiniEl.style.display = 'none';
    }

    function renderCallMiniHelpers() {
        if (!callMiniEl) return;
        var list = callMiniEl.querySelector('.mt-mini-list');
        list.textContent = '';
        if (!lastCallHelpers.length) {
            list.textContent = 'Nikt jeszcze nie zgłosił chęci przyjścia';
            return;
        }
        var head = document.createElement('div');
        head.className = 'mt-mini-count';
        head.textContent = 'Przyjdą pomóc (' + lastCallHelpers.length + '):';
        list.appendChild(head);
        lastCallHelpers.forEach(function (nick) {
            var row = document.createElement('div');
            row.textContent = '• ' + nick;
            list.appendChild(row);
        });
    }

    function injectCallStyles() {
        if (callStylesInjected) return;
        callStylesInjected = true;
        var st = document.createElement('style');
        st.id = 'map-timer-call-css';
        st.textContent =
            '#map-timer-hero-alert{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:100010;width:min(420px,calc(100vw - 24px));padding:18px 18px 16px;border-radius:16px;font-family:Arial,sans-serif;box-shadow:0 16px 48px rgba(0,0,0,.55);color:#e8eef7;}' +
            '#map-timer-hero-alert.is-hero{background:linear-gradient(180deg,#24180f 0%,#1a1a2e 70%);border:2px solid #e67e22;}' +
            '#map-timer-hero-alert.is-titan{background:linear-gradient(180deg,#1a1028 0%,#141428 70%);border:2px solid #9b59b6;}' +
            '#map-timer-hero-alert .mt-call-head{display:flex;gap:14px;align-items:center;margin-bottom:12px;}' +
            '#map-timer-hero-alert .mt-call-art{width:88px;height:88px;flex-shrink:0;border-radius:12px;background:#111827;display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:36px;}' +
            '#map-timer-hero-alert .mt-call-art img{width:100%;height:100%;object-fit:contain;image-rendering:pixelated;}' +
            '#map-timer-hero-alert .mt-call-kicker{font-size:11px;letter-spacing:.12em;text-transform:uppercase;margin:0 0 4px;font-weight:700;}' +
            '#map-timer-hero-alert.is-hero .mt-call-kicker{color:#e67e22;}' +
            '#map-timer-hero-alert.is-titan .mt-call-kicker{color:#c39bd3;}' +
            '#map-timer-hero-alert .mt-call-name{font-size:18px;font-weight:800;margin:0 0 4px;color:#fff;}' +
            '#map-timer-hero-alert .mt-call-meta{font-size:12px;color:#9aa8bd;line-height:1.4;}' +
            '#map-timer-hero-alert .mt-call-label{font-size:11px;color:#8892b0;margin:10px 0 6px;}' +
            '#map-timer-hero-alert .mt-call-levels{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}' +
            '#map-timer-hero-alert .mt-call-lvl{padding:6px 10px;background:#2a2a4a;color:#eee;border:1px solid #444;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;}' +
            '#map-timer-hero-alert .mt-call-lvl.is-on{background:#e67e22;border-color:#f5b041;color:#1a1a2e;}' +
            '#map-timer-hero-alert .mt-call-actions button{display:block;width:100%;margin-bottom:8px;padding:10px 12px;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:700;color:#fff;}' +
            '#map-timer-hero-alert .mt-call-notify{background:#27ae60;}' +
            '#map-timer-hero-alert .mt-call-summon{background:#d35400;}' +
            '#map-timer-hero-alert.is-titan .mt-call-notify{background:#8e44ad;}' +
            '#map-timer-hero-alert .mt-call-close{background:#34495e!important;font-weight:600!important;}' +
            '#map-timer-hero-alert .mt-call-helpers{font-size:12px;color:#d5deea;background:rgba(0,0,0,.25);border-radius:8px;padding:8px 10px;margin:4px 0 10px;min-height:18px;}' +
            '.map-timer-hero-level-popup{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:100012;width:min(400px,calc(100vw - 24px));padding:18px;border-radius:16px;font-family:Arial,sans-serif;box-shadow:0 18px 50px rgba(0,0,0,.6);color:#e8eef7;text-align:center;}' +
            '.map-timer-hero-level-popup.is-hero{background:linear-gradient(180deg,#2a1a10 0%,#1a1a2e 78%);border:2px solid #e67e22;}' +
            '.map-timer-hero-level-popup.is-titan{background:linear-gradient(180deg,#221433 0%,#141428 78%);border:2px solid #9b59b6;}' +
            '.map-timer-hero-level-popup .mt-pop-kicker{font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:800;margin-bottom:8px;}' +
            '.map-timer-hero-level-popup.is-hero .mt-pop-kicker{color:#e67e22;}' +
            '.map-timer-hero-level-popup.is-titan .mt-pop-kicker{color:#c39bd3;}' +
            '.map-timer-hero-level-popup .mt-pop-art{width:120px;height:120px;margin:0 auto 10px;border-radius:14px;background:#111827;display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:48px;}' +
            '.map-timer-hero-level-popup .mt-pop-art img{width:100%;height:100%;object-fit:contain;image-rendering:pixelated;}' +
            '.map-timer-hero-level-popup .mt-pop-name{font-size:20px;font-weight:800;color:#fff;margin:0 0 6px;}' +
            '.map-timer-hero-level-popup .mt-pop-meta{font-size:13px;color:#b8c5d6;margin-bottom:8px;}' +
            '.map-timer-hero-level-popup .mt-pop-badge{display:inline-block;margin:4px 4px 10px;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:800;}' +
            '.map-timer-hero-level-popup .mt-pop-badge.range{background:#2a2a4a;color:#f5b041;}' +
            '.map-timer-hero-level-popup .mt-pop-badge.summon{background:#d35400;color:#fff;}' +
            '.map-timer-hero-level-popup .mt-pop-caller{font-size:12px;color:#9aa8bd;margin-bottom:12px;}' +
            '.map-timer-hero-level-popup .mt-pop-help{display:block;width:100%;padding:10px 12px;background:#27ae60;color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800;margin-bottom:8px;}' +
            '.map-timer-hero-level-popup .mt-pop-help:disabled{opacity:.7;cursor:default;}' +
            '.map-timer-hero-level-popup .mt-pop-x{position:absolute;top:8px;right:10px;background:none;border:none;color:#8892b0;cursor:pointer;font-size:22px;line-height:1;}' +
            '#map-timer-call-mini{position:fixed;right:16px;bottom:16px;z-index:100009;width:220px;max-height:260px;overflow-y:auto;padding:10px 12px;border-radius:12px;font-family:Arial,sans-serif;font-size:12px;color:#d5deea;box-shadow:0 8px 24px rgba(0,0,0,.5);}' +
            '#map-timer-call-mini.is-hero{background:#1a1a2e;border:2px solid #e67e22;}' +
            '#map-timer-call-mini.is-titan{background:#141428;border:2px solid #9b59b6;}' +
            '#map-timer-call-mini .mt-mini-title{font-weight:800;color:#fff;margin:0 18px 6px 0;}' +
            '#map-timer-call-mini .mt-mini-count{color:#27ae60;font-weight:700;margin-bottom:2px;}' +
            '#map-timer-call-mini .mt-mini-x{position:absolute;top:4px;right:6px;background:none;border:none;color:#8892b0;cursor:pointer;font-size:18px;line-height:1;}';
        document.head.appendChild(st);
    }

    function fillNpcArt(container, data, fallbackEmoji) {
        if (!container) return;
        container.textContent = '';
        var img = document.createElement('img');
        img.alt = '';
        var tryOrder = [];
        var gameUrl = resolveAlertImageUrl(data);
        if (gameUrl) tryOrder.push(gameUrl);
        if (data && data.level) {
            tryOrder.push(getHeroLevelImageUrl(data.level, 'png'));
            tryOrder.push(getHeroLevelImageUrl(data.level, 'gif'));
            tryOrder.push(getHeroLevelImageUrlFile(data.level, 'portrait.png'));
            tryOrder.push(getHeroLevelImageUrlFile(data.level, 'portrait.gif'));
        }
        var idx = 0;
        function fail() {
            container.textContent = fallbackEmoji || '🦸';
        }
        function tryNext() {
            if (idx < tryOrder.length && tryOrder[idx]) {
                img.src = tryOrder[idx++];
            } else {
                fail();
            }
        }
        img.onerror = tryNext;
        if (tryOrder.length) {
            container.appendChild(img);
            img.src = tryOrder[idx++];
        } else {
            fail();
        }
    }

    function renderCallHelpers(helpers) {
        helpers = helpers || [];
        lastCallHelpers = helpers;
        renderCallMiniHelpers();
        var el = heroAlertPanelEl && heroAlertPanelEl.querySelector('.mt-call-helpers');
        if (!el) return;
        if (!helpers.length) {
            el.textContent = 'Przyjdą pomóc: nikt jeszcze';
            return;
        }
        el.textContent = 'Przyjdą pomóc (' + helpers.length + '): ' + helpers.join(', ');
    }

    function showHeroAlertPanel() {
        if (!lastHeroAlertData) return;
        injectCallStyles();
        var isTitan = !!lastHeroAlertData.isTitan;
        if (!heroAlertPanelEl) {
            heroAlertPanelEl = document.createElement('div');
            heroAlertPanelEl.id = 'map-timer-hero-alert';
            document.body.appendChild(heroAlertPanelEl);
        }
        heroAlertPanelEl.className = isTitan ? 'is-titan' : 'is-hero';
        var lvlStr = lastHeroAlertData.lvl != null ? lastHeroAlertData.lvl + 'm' : '?';
        var posStr = (lastHeroAlertData.x != null && lastHeroAlertData.y != null) ? (lastHeroAlertData.x + ',' + lastHeroAlertData.y) : '?';
        var rangeNote = isTitan ? '' : ('Przedział ±' + HERO_CALL_LEVEL_RANGE + ' lvl od wybranej wartości (300: ' + heroCallLevelRange(300).lo + '–' + heroCallLevelRange(300).hi + ').');
        var actionsHtml = isTitan
            ? '<button type="button" class="mt-call-notify" data-summon="0">Powiadom klan o tytanie</button>'
            : '<button type="button" class="mt-call-notify" data-summon="0">Powiadom klan o herosie</button>' +
              '<button type="button" class="mt-call-summon" data-summon="1">Powiadom klan o herosie i zaproponuj Przywołanie</button>';
        heroAlertPanelEl.innerHTML =
            '<div class="mt-call-head">' +
                '<div class="mt-call-art"></div>' +
                '<div>' +
                    '<div class="mt-call-kicker">' + (isTitan ? 'Tytan na mapie' : 'Heros na mapie') + '</div>' +
                    '<div class="mt-call-name"></div>' +
                    '<div class="mt-call-meta"></div>' +
                '</div>' +
            '</div>' +
            (isTitan ? '' : '<div class="mt-call-label">Wołaj przedział (Twoja postać: ' + (getCurrentHeroLevel() != null ? getCurrentHeroLevel() : '?') + ' lvl)</div><div class="mt-call-levels"></div>') +
            '<div class="mt-call-helpers">Przyjdą pomóc: nikt jeszcze</div>' +
            '<div class="mt-call-actions">' + actionsHtml +
            '<button type="button" class="mt-call-close">Zamknij</button></div>';
        heroAlertPanelEl.querySelector('.mt-call-name').textContent = lastHeroAlertData.nick || '';
        heroAlertPanelEl.querySelector('.mt-call-meta').textContent = lvlStr + ' · ' + lastHeroAlertData.mapName + ' (' + posStr + ')' + (rangeNote ? ' · ' + rangeNote : '');
        fillNpcArt(heroAlertPanelEl.querySelector('.mt-call-art'), lastHeroAlertData, isTitan ? '⚔️' : '🦸');
        if (!isTitan) {
            var lvlWrap = heroAlertPanelEl.querySelector('.mt-call-levels');
            HERO_CALL_LEVELS.forEach(function (level) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'mt-call-lvl' + (selectedHeroCallLevel === level ? ' is-on' : '');
                btn.textContent = String(level);
                btn.addEventListener('click', function () {
                    selectedHeroCallLevel = level;
                    var all = heroAlertPanelEl.querySelectorAll('.mt-call-lvl');
                    for (var i = 0; i < all.length; i++) {
                        all[i].classList.toggle('is-on', Number(all[i].textContent) === selectedHeroCallLevel);
                    }
                });
                lvlWrap.appendChild(btn);
            });
        }
        var actionBtns = heroAlertPanelEl.querySelectorAll('.mt-call-notify, .mt-call-summon');
        for (var a = 0; a < actionBtns.length; a++) {
            actionBtns[a].addEventListener('click', function (ev) {
                var withSummon = ev.currentTarget.getAttribute('data-summon') === '1';
                sendClanCall({ withSummon: withSummon });
            });
        }
        heroAlertPanelEl.querySelector('.mt-call-close').addEventListener('click', hideHeroAlertPanel);
        heroAlertPanelEl.style.display = 'block';
    }

    function hideHeroAlertPanel() {
        var wasVisible = !!heroAlertPanelEl && heroAlertPanelEl.style.display !== 'none';
        if (heroAlertPanelEl) heroAlertPanelEl.style.display = 'none';
        if (wasVisible && myActiveCall) showCallMini();
    }

    var lastSeenHeroNotificationTs = Math.max(0, Date.now() - 9 * 60 * 1000);
    var lastFetchedHeroNotifTs = 0;
    var shownHeroNotificationIds = {};
    var SHOWN_CALL_IDS_TTL_MS = 30 * 60 * 1000;
    var SHOWN_CALL_IDS_MAX = 200;

    function getShownCallIdRecords() {
        try {
            if (typeof GM_getValue !== 'function') return [];
            var raw = GM_getValue('hero_call_shown_ids', '[]');
            var arr = JSON.parse(raw || '[]');
            if (!Array.isArray(arr)) return [];
            var now = Date.now();
            return arr.filter(function (x) { return x && x.id && (now - Number(x.ts || 0)) < SHOWN_CALL_IDS_TTL_MS; });
        } catch (e) { return []; }
    }
    function persistShownCallId(id) {
        if (!id) return;
        var arr = getShownCallIdRecords();
        for (var i = 0; i < arr.length; i++) {
            if (arr[i].id === id) return;
        }
        arr.push({ id: id, ts: Date.now() });
        if (arr.length > SHOWN_CALL_IDS_MAX) arr = arr.slice(-SHOWN_CALL_IDS_MAX);
        try { if (typeof GM_setValue === 'function') GM_setValue('hero_call_shown_ids', JSON.stringify(arr)); } catch (e) { /* ignore */ }
    }
    function shouldShowHeroLevelNotification(id) {
        if (!id) return false;
        if (shownHeroNotificationIds[id]) return false;
        var recs = getShownCallIdRecords();
        for (var i = 0; i < recs.length; i++) {
            if (recs[i].id === id) return false;
        }
        return true;
    }
    function markHeroLevelNotificationShown(id) {
        if (!id) return;
        shownHeroNotificationIds[id] = true;
        persistShownCallId(id);
    }

    function getAlertImageForApi() {
        var url = resolveAlertImageUrl(lastHeroAlertData);
        if (url && url.charAt(0) === '/' && CONFIG.BACKEND_URL) url = CONFIG.BACKEND_URL.replace(/\/$/, '') + url;
        return url || undefined;
    }

    function sendClanCall(opts) {
        if (!lastHeroAlertData) return;
        opts = opts || {};
        var isTitan = !!lastHeroAlertData.isTitan || nameLooksLikeTitan(lastHeroAlertData.nick);
        var withSummon = !isTitan && !!opts.withSummon;
        if (!isTitan && HERO_CALL_LEVELS.indexOf(selectedHeroCallLevel) < 0) {
            showToast('Wybierz przedział levelu', 'error');
            return;
        }
        if (heroAlertSending) return;
        heroAlertSending = true;
        var actionBtns = heroAlertPanelEl ? heroAlertPanelEl.querySelectorAll('.mt-call-notify, .mt-call-summon') : [];
        for (var i = 0; i < actionBtns.length; i++) {
            actionBtns[i].disabled = true;
            actionBtns[i].textContent = 'Wysyłam…';
        }
        var callerNick = getCurrentHeroName();
        var imageUrl = getAlertImageForApi();
        var channelLabel = isTitan ? 'tytani' : 'herosi';

        function restoreBtns() {
            heroAlertSending = false;
            if (!heroAlertPanelEl) return;
            var notifyBtn = heroAlertPanelEl.querySelector('.mt-call-notify');
            var summonBtn = heroAlertPanelEl.querySelector('.mt-call-summon');
            if (notifyBtn) {
                notifyBtn.disabled = false;
                notifyBtn.textContent = isTitan ? 'Powiadom klan o tytanie' : 'Powiadom klan o herosie';
            }
            if (summonBtn) {
                summonBtn.disabled = false;
                summonBtn.textContent = 'Powiadom klan o herosie i zaproponuj Przywołanie';
            }
        }

        function postDiscord() {
            fetch(apiTimerUrl('/api/timer/clan-alert'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY },
                body: JSON.stringify({
                    kind: isTitan ? 'titan' : 'hero',
                    withSummon: withSummon,
                    nick: lastHeroAlertData.nick,
                    mapName: lastHeroAlertData.mapName,
                    lvl: lastHeroAlertData.lvl != null ? lastHeroAlertData.lvl : null,
                    x: lastHeroAlertData.x != null ? lastHeroAlertData.x : null,
                    y: lastHeroAlertData.y != null ? lastHeroAlertData.y : null,
                    callerNick: callerNick,
                    level: isTitan ? 0 : selectedHeroCallLevel,
                    heroImageUrl: imageUrl || undefined
                }),
            }).then(function (r) {
                restoreBtns();
                if (r.ok) {
                    showToast('✅ Wysłano na Discord (' + channelLabel + ')' + (withSummon ? ' + przywołanie' : ''));
                } else if (r.status === 429) {
                    showToast('❌ Za dużo wołań — poczekaj chwilę', 'error');
                } else {
                    showToast('❌ Błąd Discord: ' + r.status, 'error');
                }
            }).catch(function (e) {
                restoreBtns();
                log('Discord alert error:', e);
                showToast('❌ Błąd połączenia z serwerem', 'error');
            });
        }

        if (!CONFIG.API_KEY) {
            restoreBtns();
            showToast('Brak API key — zainstaluj skrypt ze strony po zalogowaniu', 'error');
            return;
        }

        fetch(apiTimerUrl('/api/timer/hero-level-notifications'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY },
                body: JSON.stringify({
                    level: isTitan ? 0 : selectedHeroCallLevel,
                    nick: lastHeroAlertData.nick,
                    mapName: lastHeroAlertData.mapName,
                    x: lastHeroAlertData.x,
                    y: lastHeroAlertData.y,
                    lvl: lastHeroAlertData.lvl,
                    heroImageUrl: imageUrl,
                    callerNick: callerNick,
                    kind: isTitan ? 'titan' : 'hero',
                    withSummon: withSummon
                }),
            }).then(function (r) {
                return r.json().then(function (json) {
                    if (r.ok && json && json.id) {
                        myActiveCallId = json.id;
                        myActiveCall = {
                            id: json.id,
                            nick: lastHeroAlertData.nick,
                            mapName: lastHeroAlertData.mapName,
                            isTitan: isTitan,
                            createdAt: (json.notification && json.notification.createdAt) || Date.now(),
                        };
                        if (!heroAlertPanelEl || heroAlertPanelEl.style.display === 'none') showCallMini();
                        markHeroLevelNotificationShown(json.id);
                        renderCallHelpers((json.notification && json.notification.helpers) || []);
                    } else if (!r.ok) {
                        showToast('Wołanie w grze: ' + (json && json.error ? json.error : r.status), 'error');
                    }
                    postDiscord();
                });
            }).catch(function () {
                showToast('Wołanie w grze nie doszło — Discord i tak poleci', 'error');
                postDiscord();
            });
    }

    function sendComingToCall(notificationId, btn) {
        if (!notificationId || !CONFIG.API_KEY) {
            showToast('Brak API key — nie można zgłosić pomocy', 'error');
            return;
        }
        if (btn) { btn.disabled = true; btn.textContent = 'Wysyłam…'; }
        fetch(apiTimerUrl('/api/timer/hero-call-coming'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY },
            body: JSON.stringify({ notificationId: notificationId, nick: getCurrentHeroName() }),
        }).then(function (r) { return r.json().then(function (json) { return { r: r, json: json }; }); }).then(function (res) {
            if (res.r.ok) {
                if (btn) btn.textContent = 'Zgłoszono — ' + getCurrentHeroName();
                showToast('✅ Wołający widzi, że idziesz');
            } else {
                if (btn) { btn.disabled = false; btn.textContent = 'Przyjdę pomóc'; }
                showToast(res.json && res.json.error ? res.json.error : 'Błąd zgłoszenia', 'error');
            }
        }).catch(function () {
            if (btn) { btn.disabled = false; btn.textContent = 'Przyjdę pomóc'; }
            showToast('Błąd połączenia', 'error');
        });
    }

    /** URL obrazka/GIF herosa po levelu z backendu (np. /api/hero-level-images/64/hero.gif). */
    function getHeroLevelImageUrl(level, ext) {
        if (!CONFIG.BACKEND_URL || level == null) return null;
        return CONFIG.BACKEND_URL.replace(/\/$/, '') + '/api/hero-level-images/' + level + '/hero.' + (ext || 'gif');
    }
    /** URL dowolnego pliku w folderze level (np. portrait.png, platform.png). */
    function getHeroLevelImageUrlFile(level, filename) {
        if (!CONFIG.BACKEND_URL || level == null || !filename) return null;
        return CONFIG.BACKEND_URL.replace(/\/$/, '') + '/api/hero-level-images/' + level + '/' + encodeURIComponent(filename);
    }

    function showHeroLevelPopup(data) {
        injectCallStyles();
        var isTitan = data.kind === 'titan' || data.level === 0;
        var lvlStr = (data.lvl != null) ? data.lvl + 'm' : '?';
        var posStr = (data.x != null && data.y != null) ? (data.x + ',' + data.y) : '?';
        var pop = document.createElement('div');
        pop.className = 'map-timer-hero-level-popup ' + (isTitan ? 'is-titan' : 'is-hero');
        var range = data.level ? heroCallLevelRange(data.level) : null;
        var rangeLo = range ? range.lo : null;
        var rangeHi = range ? range.hi : null;
        pop.innerHTML =
            '<button type="button" class="mt-pop-x">×</button>' +
            '<div class="mt-pop-kicker">' + (isTitan ? 'Wołanie na tytana' : 'Wołanie na herosa') + '</div>' +
            '<div class="mt-pop-art"></div>' +
            '<div class="mt-pop-name"></div>' +
            '<div class="mt-pop-meta"></div>' +
            '<div class="mt-pop-badges"></div>' +
            '<div class="mt-pop-caller"></div>' +
            '<button type="button" class="mt-pop-help">Przyjdę pomóc</button>';
        pop.querySelector('.mt-pop-name').textContent = data.nick || '';
        pop.querySelector('.mt-pop-meta').textContent = lvlStr + ' · ' + (data.mapName || '') + ' (' + posStr + ')';
        var badges = pop.querySelector('.mt-pop-badges');
        if (!isTitan && data.level) {
            var b = document.createElement('span');
            b.className = 'mt-pop-badge range';
            b.textContent = 'Przedział ' + data.level + ' (' + rangeLo + '–' + rangeHi + ')';
            badges.appendChild(b);
        }
        if (data.withSummon && !isTitan) {
            var s = document.createElement('span');
            s.className = 'mt-pop-badge summon';
            s.textContent = '⚡ Przywołanie';
            badges.appendChild(s);
        }
        pop.querySelector('.mt-pop-caller').textContent = data.callerNick ? ('Woła: ' + data.callerNick) : '';
        fillNpcArt(pop.querySelector('.mt-pop-art'), data, isTitan ? '⚔️' : '🦸');
        pop.querySelector('.mt-pop-x').addEventListener('click', function () { if (pop.parentNode) pop.parentNode.removeChild(pop); });
        pop.querySelector('.mt-pop-help').addEventListener('click', function (ev) {
            sendComingToCall(data.id, ev.currentTarget);
        });
        document.body.appendChild(pop);
        setTimeout(function () { if (pop.parentNode) pop.parentNode.removeChild(pop); }, 45000);
    }

    function processIncomingCalls(list) {
        var myNick = String(getCurrentHeroName() || '').trim().toLowerCase();
        var myLvl = getCurrentHeroLevel();
        list.forEach(function (n) {
            var ts = n.createdAt != null ? Number(n.createdAt) : 0;
            if (ts > lastSeenHeroNotificationTs) lastSeenHeroNotificationTs = ts;
            if (myActiveCallId && n.id === myActiveCallId) {
                if (n.killedAt) {
                    closeHeroWindowsFor(n.nick, n.mapName);
                } else {
                    renderCallHelpers(n.helpers || []);
                }
            }
            if (!shouldShowHeroLevelNotification(n.id)) return;
            if (n.killedAt) {
                markHeroLevelNotificationShown(n.id);
                return;
            }
            var kind = n.kind === 'titan' ? 'titan' : 'hero';
            var caller = String(n.callerNick || '').trim().toLowerCase();
            if (caller && caller === myNick) {
                markHeroLevelNotificationShown(n.id);
                return;
            }
            if (kind === 'hero' && n.level && !isPlayerInCallRange(n.level, myLvl)) {
                return;
            }
            markHeroLevelNotificationShown(n.id);
            showHeroLevelPopup({
                id: n.id,
                level: n.level,
                nick: n.nick,
                mapName: n.mapName,
                x: n.x,
                y: n.y,
                lvl: n.lvl,
                heroImageUrl: n.heroImageUrl,
                callerNick: n.callerNick,
                kind: kind,
                withSummon: !!n.withSummon,
            });
        });
    }

    /** Async — pobiera globalne powiadomienia i pokazuje popup graczom w przedziale. */
    function fetchAndShowHeroLevelNotificationsAsync() {
        if (!CONFIG.BACKEND_URL || !CONFIG.API_KEY) return;
        if (myActiveCall && Date.now() - myActiveCall.createdAt > HERO_CALL_RETENTION_MS) clearActiveCall();
        var since = lastSeenHeroNotificationTs;
        if (myActiveCall) since = Math.max(0, myActiveCall.createdAt - 1000);
        var url = apiTimerUrl('/api/timer/hero-level-notifications?since=' + since);
        fetch(url, { cache: 'no-store', headers: { 'X-API-Key': CONFIG.API_KEY } }).then(function (r) { return r.ok ? r.json() : null; }).then(function (json) {
            if (!json || !json.notifications) return;
            processIncomingCalls(json.notifications || []);
        }).catch(function () {});
    }
    function pollHeroLevelNotificationsOnce() {
        lastFetchedHeroNotifTs = 0;
        fetchAndShowHeroLevelNotificationsAsync();
    }

    function sendHeroAlertToDiscord() {
        sendClanCall({ withSummon: false });
    }

    /** Lista postaci obecnych na mapie (Engine.others / g.other). */
    function getPlayersOnMap() {
        const engine = getEngine();
        if (!engine) return [];
        try {
            if (typeof engine.others !== 'undefined' && typeof engine.others.check === 'function') {
                const othersMap = engine.others.check();
                if (!othersMap || typeof othersMap !== 'object') return [];
                return Object.keys(othersMap)
                    .map(function (key) {
                        const o = othersMap[key];
                        const d = o && o.d != null ? o.d : o;
                        if (!d || !d.nick) return null;
                        return { nick: d.nick, lvl: d.lvl, prof: d.prof || '' };
                    })
                    .filter(Boolean);
            }
            if (typeof window.g !== 'undefined' && window.g && window.g.other) {
                const other = window.g.other;
                return Object.keys(other)
                    .map(function (key) {
                        const d = other[key];
                        if (!d || !d.nick) return null;
                        return { nick: d.nick, lvl: d.lvl, prof: d.prof || '' };
                    })
                    .filter(Boolean);
            }
        } catch (e) {
            if (CONFIG.DEBUG) log('getPlayersOnMap error:', e);
        }
        return [];
    }

    function findTarget(mapName) {
        if (!mapName) return null;
        const normalized = String(mapName).trim().toLowerCase();
        // Dokładne dopasowanie (case-insensitive). Bez dopasowania po fragmencie,
        // bo to odpala timer na innych mapach z tą samą końcówką.
        return CONFIG.TARGETS.find(t => String(t.map).trim().toLowerCase() === normalized) || null;
    }

    function formatTime(totalSeconds) {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    }

    // ================================================================
    //  API COMMUNICATION
    // ================================================================
    function sendToBackend(seconds, monster, map, reason, useUnloadSend = false, retryCount = 0) {
        refreshConfigFromStorage();
        if (reason !== 'map_enter' && seconds < CONFIG.MIN_TIME_TO_SEND) {
            log(`Czas ${seconds}s < ${CONFIG.MIN_TIME_TO_SEND}s, pomijam (${reason})`);
            return Promise.resolve();
        }
        if (EVE_EVENT_ENDED && HERO_AFK_MONSTERS.indexOf(monster) !== -1) {
            log('Event zakończony — pomijam wysyłkę sesji dla herosa eventowego');
            return Promise.resolve();
        }

        if (!CONFIG.API_KEY) {
            log('⚠️ Brak API key! Zainstaluj skrypt ze strony (link z tokenem) — wtedy key będzie ustawiony automatycznie.');
            showToast('⚠️ Brak API key — nie zapisuję sesji.', 'error');
            return Promise.resolve();
        }

        const payload = {
            time: seconds,
            monster: monster,
            map: map,
            hero: heroName || 'Unknown',
            world: worldName || 'Unknown',
            reason: reason,
            timestamp: new Date().toISOString(),
            apiKey: CONFIG.API_KEY,
        };
        // Outfit: z wejścia na mapę, albo odśwież przy wysyłce (engine mógł załadować później), albo z localStorage Margonem
        const outfitForSend = heroOutfitUrl || getHeroOutfitUrl() || getOutfitFromLocalStorage(heroName || '');
        if (outfitForSend) {
            payload.avatarUrl = outfitForSend;
            log('Wysylam: dodano avatarUrl (stroj) do payloadu');
        }
        log('Wysylam:', { time: payload.time, monster: payload.monster, hero: payload.hero, avatarUrl: payload.avatarUrl ? 'OK' : 'brak' });

        // sendBeacon — przy zamykaniu/przeładowaniu strony przeglądarka może przerwać zwykłe XHR; beacon ma wyższą szansę dotarcia
        const url = CONFIG.BACKEND_URL.replace(/\/$/, '') + '/api/timer/session';

        function onSuccess(data) {
            try {
                var d = typeof data === 'string' ? JSON.parse(data) : data;
                log('✅ Zapisano! Total:', d.totalTimeFormatted, '(', d.totalSessions, 'sesji)');
                showToast('✅ Zapisano ' + formatTime(seconds) + ' — łącznie: ' + d.totalTimeFormatted);
                if (reason !== 'map_enter' && HERO_AFK_MONSTERS.indexOf(monster) !== -1) eveRespawnCache = null;
            } catch (e) { log('✅ Zapisano'); }
        }
        function onFail(msg) {
            log('❌', msg);
            saveLocally(payload);
            var n = (JSON.parse(localStorage.getItem('maptimer_pending') || '[]')).length;
            showToast('💾 Zapisano lokalnie (' + n + '). Później: ⏱ → Wyślij zaległe.', 'error');
        }

        if (useUnloadSend && typeof fetch !== 'undefined') {
            var unloadPayload = Object.assign({}, payload, { apiKey: CONFIG.API_KEY });
            log('📤 POST przy przeładowaniu/zamknięciu:', url);
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(unloadPayload),
                keepalive: true,
            }).then(function (r) {
                if (r.ok) return r.text().then(onSuccess);
                return r.text().then(function (t) {
                    log('❌', r.status, t);
                    if (r.status >= 500 || r.status === 408 || r.status === 429) saveLocally(payload);
                });
            }).catch(function (e) {
                log('❌ fetch (unload):', e);
                saveLocally(payload);
            });
            return Promise.resolve();
        }

        log(retryCount > 0 ? '📤 Ponowna próba #' + retryCount : '📤 Wysyłam POST (sprawdź zakładkę Network):', url);

        var controller = null;
        try { controller = new window.AbortController(); } catch (e) { controller = { signal: {}, abort: function () {} }; }
        var timeoutId = setTimeout(function () { if (controller.abort) controller.abort(); }, 60000);

        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY },
            body: JSON.stringify(payload),
            signal: controller.signal,
        }).then(function (res) {
            clearTimeout(timeoutId);
            return res.text().then(function (text) {
                log('📥 Odpowiedź:', res.status, (text || '').slice(0, 200));
                if (res.ok) onSuccess(text);
                else if (res.status === 401) {
                    showToast('❌ Nieprawidłowy API key!', 'error');
                } else if (res.status === 409) {
                    showToast('ℹ️ Faza nieaktywna — pomijam zapis.', 'error');
                } else {
                    showToast('❌ Błąd ' + res.status, 'error');
                    if (res.status >= 500 || res.status === 408 || res.status === 429) {
                        saveLocally(payload);
                    }
                }
            });
        }).catch(function (err) {
            clearTimeout(timeoutId);
            var isTimeout = (err && err.name === 'AbortError') || (err && String(err.message || '').indexOf('fetch') !== -1);
            if (isTimeout && retryCount < 2) {
                var delay = retryCount === 0 ? 12000 : 20000;
                log('⏳ Timeout — ponowna próba za', delay / 1000, 's');
                showToast('⏳ Ponawiam za ' + (delay / 1000) + ' s...');
                return new Promise(function (resolve) {
                    setTimeout(function () { sendToBackend(seconds, monster, map, reason, false, retryCount + 1).then(resolve); }, delay);
                });
            }
            onFail('Błąd sieci / timeout.');
        });
    }

    function saveLocally(payload) {
        if (payload && payload.reason === 'map_enter') return;
        try {
            const pending = JSON.parse(localStorage.getItem('maptimer_pending') || '[]');
            pending.push(payload);
            localStorage.setItem('maptimer_pending', JSON.stringify(pending));
            log(`💾 Zapisano lokalnie (${pending.length} oczekujących)`);
        } catch (e) { /* ignore */ }
    }

    function flushPending() {
        if (!CONFIG.API_KEY) return;

        try {
            const pending = JSON.parse(localStorage.getItem('maptimer_pending') || '[]');
            const toSend = pending.filter(function (p) {
                if (p.reason === 'map_enter') return false;
                if (EVE_EVENT_ENDED && HERO_AFK_MONSTERS.indexOf(p.monster) !== -1) return false;
                return true;
            });
            if (toSend.length === 0) {
                if (pending.length > 0) localStorage.setItem('maptimer_pending', '[]');
                return;
            }
            localStorage.setItem('maptimer_pending', '[]');
            log(`📤 Wysyłam ${toSend.length} zaległych sesji...`);

            toSend.forEach((payload) => {
                GM_xmlhttpRequest({
                    url: `${CONFIG.BACKEND_URL}/api/timer/session`,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': CONFIG.API_KEY,
                    },
                    data: JSON.stringify(payload),
                    onload: (res) => {
                        if (res.status < 200 || res.status >= 300) {
                            // Re-queue tylko na błędy tymczasowe.
                            if (res.status >= 500 || res.status === 408 || res.status === 429) saveLocally(payload);
                        }
                    },
                    onerror: () => saveLocally(payload),
                });
            });
        } catch (e) { /* ignore */ }
    }

    // ================================================================
    //  MAP TRACKING
    // ================================================================
    function onEnteredTargetMap(target) {
        currentTarget = target;
        sessionStartTime = Date.now();
        accumulatedSeconds = 0;
        sessionFinalized = false;
        sessionAfkCapped = false;

        const info = getHeroInfo();
        heroName = info?.name;
        worldName = info?.world;
        heroOutfitUrl = info?.outfitUrl ?? null;

        log(`✅ Na mapie: "${target.map}" — tracking ${target.monster} jako ${heroName}${heroOutfitUrl ? ' (outfit: ' + heroOutfitUrl + ')' : ''}`);
        sendToBackend(0, target.monster, target.map, 'map_enter', false);
        refreshKolejkiAsync();
    }

    function finalizeSession(reason, useUnloadSend = false) {
        if (!currentTarget || !sessionStartTime) return Promise.resolve();
        if (sessionFinalized) return Promise.resolve();
        sessionFinalized = true;

        accumulatedSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
        var promise = Promise.resolve();
        if (sessionAfkCapped) {
            log('⏹ Finalize (limit AFK już wysłany, pomijam ponowne wysyłanie)');
        } else {
            log(`⏹ Finalize po ${accumulatedSeconds}s (${reason}) — wysyłam POST (stara mapa), potem wejście na nową`);
            promise = sendToBackend(accumulatedSeconds, currentTarget.monster, currentTarget.map, reason, useUnloadSend) || promise;
        }

        currentTarget = null;
        sessionStartTime = null;
        accumulatedSeconds = 0;
        sessionAfkCapped = false;
        return promise;
    }

    let lastLoggedMapName = null;
    var lastConfigRefreshTs = 0;
    function tick() {
        if (!getEngine()) return;
        if (!kolejkiWrap) {
            createKolejkiBox();
            flushPending();
        }
        var now = Date.now();
        if (now - lastConfigRefreshTs >= 10000) { refreshConfigFromStorage(); lastConfigRefreshTs = now; }
        const mapName = getCurrentMapName();
        var nowTick = now;
        const target = mapName ? findTarget(mapName) : null;
        var currentMapForEve = mapName || '';
        if (currentMapForEve !== lastEveFetchMapName) {
            lastEveFetchMapName = currentMapForEve;
            [41, 81].forEach(function (k) {
                var rec = eveMapListPanelsByKey[k];
                if (rec && rec.panel && rec.panel.style.display !== 'none') fetchEveDashboardAsync(k, applyEveDashboardToPanel);
            });
        }

        if (mapName && !target && mapName !== lastLoggedMapName) {
            log('⚠️ Wykryta mapa nie jest w TARGETS:', JSON.stringify(mapName), '— dodaj ją do listy w skrypcie');
            lastLoggedMapName = mapName;
        }
        if (!mapName) lastLoggedMapName = null;

        if (target) {
            if (!currentTarget) {
                onEnteredTargetMap(target);
            } else if (currentTarget.map !== target.map || currentTarget.monster !== target.monster) {
                var nextTarget = target;
                (finalizeSession('map_change') || Promise.resolve()).then(function () {
                    onEnteredTargetMap(nextTarget);
                });
            }
            if (sessionStartTime && currentTarget) {
                var elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
                var capSec = getAfkCapSec(currentTarget.monster);
                if (sessionAfkCapped) {
                    accumulatedSeconds = capSec;
                } else if (elapsed >= capSec) {
                    sendToBackend(capSec, currentTarget.monster, currentTarget.map, 'afk_cap', false);
                    sessionAfkCapped = true;
                    accumulatedSeconds = capSec;
                    var capMin = Math.round(capSec / 60);
                    showToast('Limit ' + capMin + ' min — odśwież stronę, żeby liczyć dalej.', 'warn');
                    log('⏸ Limit AFK ' + capSec + 's — licznik zatrzymany do odświeżenia');
                } else {
                    accumulatedSeconds = elapsed;
                }
            }
            updateTimerUI();
        }
        checkHerosOnMapAndNotify();
        sendEveMapPresenceIfNeeded();
        if (target && HERO_AFK_MONSTERS.indexOf(target.monster) >= 0) {
            if ((nowTick - lastEveDashboardGetTs) >= EVE_PRESENCE_AND_GET_INTERVAL_MS) {
                lastEveDashboardGetTs = nowTick;
                var eveKeyForMap = null;
                for (var ek in EVE_HERO_NAMES) { if (EVE_HERO_NAMES[ek] === target.monster) { eveKeyForMap = parseInt(ek, 10); break; } }
                if (eveKeyForMap != null) fetchEveDashboardAsync(eveKeyForMap, applyEveDashboardToPanel);
            }
            if ((nowTick - lastEveRespawnSyncTs) >= EVE_RESPAWN_SYNC_INTERVAL_MS) {
                lastEveRespawnSyncTs = nowTick;
                eveRespawnCache = null;
            }
        }
        if (nowTick - lastFetchedHeroNotifTs >= 2000) {
            lastFetchedHeroNotifTs = nowTick;
            fetchAndShowHeroLevelNotificationsAsync();
        }
        if (!target) {
            if (currentTarget) {
                finalizeSession('map_change');
            }
            hideTimerUI();
        }
        if (kolejkiListContent) updateKolejkiListUI();
    }

    /** Pobiera rezerwacje dla potwora (cache 2 min). */
    function fetchReservationsForMonster(monster) {
        if (!monster || !CONFIG.API_KEY) return [];
        const now = Date.now();
        if (reservationsCache.monster === monster && reservationsCache.data && (now - reservationsCache.ts) < RESERVATIONS_CACHE_TTL_MS) {
            return reservationsCache.data;
        }
        var out = [];
        var xhr = new XMLHttpRequest();
        xhr.open('GET', CONFIG.BACKEND_URL.replace(/\/$/, '') + '/api/timer/reservations?monster=' + encodeURIComponent(monster), false);
        xhr.setRequestHeader('X-API-Key', CONFIG.API_KEY);
        try {
            xhr.send();
            if (xhr.status === 200) {
                var json = JSON.parse(xhr.responseText);
                out = json.reservations || [];
                reservationsCache = { monster: monster, data: out, ts: now };
            }
        } catch (e) {
            if (CONFIG.DEBUG) log('fetchReservations error:', e);
        }
        return out;
    }

    /** Pobiera rezerwacje i obecność map EVE. Zwraca { reservations: [{mapName,nick}], presence: [{mapName,nick}] }. */
    function fetchEveMapReservationsAndPresence(eveKey) {
        var now = Date.now();
        if (eveMapReservationsCache[eveKey] && (now - eveMapReservationsCache[eveKey].ts) < EVE_RESERVATIONS_CACHE_TTL_MS) {
            return eveMapReservationsCache[eveKey];
        }
        var out = { reservations: [], presence: [] };
        var xhr = new XMLHttpRequest();
        xhr.open('GET', CONFIG.BACKEND_URL.replace(/\/$/, '') + '/api/timer/eve-map-reservations?eveKey=' + eveKey, false);
        try {
            xhr.send();
            if (xhr.status === 200) {
                var json = JSON.parse(xhr.responseText);
                out = { reservations: json.reservations || [], presence: json.presence || [] };
                eveMapReservationsCache[eveKey] = { reservations: out.reservations, presence: out.presence, ts: now };
            }
        } catch (e) {
            if (CONFIG.DEBUG) log('fetchEveMapReservations error:', e);
        }
        return out;
    }
    function fetchEveMapReservations(eveKey) {
        return (fetchEveMapReservationsAndPresence(eveKey).reservations || []);
    }
    /** Pobiera z API kiedy ostatnio opuszczono każdą mapę (eveKey). Zwraca { mapName: timestampMs }. */
    function fetchEveMapLastLeft(eveKey) {
        var now = Date.now();
        if (eveMapLastLeftCache[eveKey] && (now - eveMapLastLeftCache[eveKey].ts) < EVE_LAST_LEFT_CACHE_TTL_MS) {
            return eveMapLastLeftCache[eveKey].lastLeft || {};
        }
        var out = {};
        var xhr = new XMLHttpRequest();
        xhr.open('GET', CONFIG.BACKEND_URL.replace(/\/$/, '') + '/api/timer/eve-map-last-left?eveKey=' + eveKey, false);
        try {
            xhr.send();
            if (xhr.status === 200) {
                var json = JSON.parse(xhr.responseText);
                out = json.lastLeft || {};
                eveMapLastLeftCache[eveKey] = { lastLeft: out, ts: now };
            }
        } catch (e) { /* ignore */ }
        return out;
    }
    /** Zapisuje w API że mapa została właśnie opuszczona (wspólne dla wszystkich, przetrwa odświeżenie). */
    function setEveMapLastLeft(eveKey, mapName) {
        if (EVE_EVENT_ENDED) return false;
        var xhr = new XMLHttpRequest();
        xhr.open('POST', CONFIG.BACKEND_URL.replace(/\/$/, '') + '/api/timer/eve-map-last-left', false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        try {
            xhr.send(JSON.stringify({ eveKey: eveKey, mapName: mapName }));
            if (xhr.status === 200) {
                eveMapLastLeftCache[eveKey] = null;
                return true;
            }
        } catch (e) { /* ignore */ }
        return false;
    }
    var lastEvePresenceSent = {}; // eveKey -> timestamp
    var lastEveMapPresence = {};  // eveKey -> mapName (ostatnia mapa, na której zgłosiliśmy obecność)
    function deleteEveMapPresence(eveKey, mapName, nick) {
        var url = CONFIG.BACKEND_URL.replace(/\/$/, '') + '/api/timer/eve-map-presence?eveKey=' + encodeURIComponent(eveKey) + '&mapName=' + encodeURIComponent(mapName) + '&nick=' + encodeURIComponent(nick);
        fetch(url, { method: 'DELETE', headers: { 'X-API-Key': CONFIG.API_KEY || '' } }).then(function (r) { if (r.ok) eveMapReservationsCache[eveKey] = null; }).catch(function () {});
    }
    /** Wysyła obecność na mapie do API (bez throttlingu). Używane przy otwarciu panelu, żeby backend na pewno miał naszą pozycję. */
    function sendEvePresenceNow(eveKey, mapName, nick) {
        if (EVE_EVENT_ENDED || !CONFIG.API_KEY || !mapName || !nick) return;
        fetch(CONFIG.BACKEND_URL.replace(/\/$/, '') + '/api/timer/eve-map-presence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY },
            body: JSON.stringify({ eveKey: eveKey, mapName: mapName, nick: nick })
        }).then(function (r) { if (r.ok) { eveMapReservationsCache[eveKey] = null; lastEvePresenceSent[eveKey] = Date.now(); lastEveMapPresence[eveKey] = mapName; } }).catch(function () {});
    }
    function sendEveMapPresenceIfNeeded() {
        if (EVE_EVENT_ENDED || !CONFIG.API_KEY) return;
        var currentMap = getCurrentMapName();
        var nick = getCurrentHeroName();
        var now = Date.now();
        [41, 81].forEach(function (eveKey) {
            var maps = EVE_MAPS[eveKey] || [];
            var isOnEveMap = currentMap && maps.some(function (m) { return String(m).trim().toLowerCase() === currentMap.trim().toLowerCase(); });
            var lastMap = lastEveMapPresence[eveKey];
            if (isOnEveMap) {
                if (lastMap && lastMap.toLowerCase() !== currentMap.trim().toLowerCase()) {
                    deleteEveMapPresence(eveKey, lastMap, nick);
                    lastEveMapPresence[eveKey] = null;
                }
                if (lastEvePresenceSent[eveKey] && (now - lastEvePresenceSent[eveKey]) < 6000) return;
                lastEvePresenceSent[eveKey] = now;
                lastEveMapPresence[eveKey] = currentMap;
                fetch(CONFIG.BACKEND_URL.replace(/\/$/, '') + '/api/timer/eve-map-presence', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY },
                    body: JSON.stringify({ eveKey: eveKey, mapName: currentMap, nick: nick })
                }).then(function (r) { if (r.ok) eveMapReservationsCache[eveKey] = null; }).catch(function () {});
            } else {
                if (lastMap) {
                    deleteEveMapPresence(eveKey, lastMap, nick);
                    lastEveMapPresence[eveKey] = null;
                }
            }
        });
    }

    /** POST: zarezerwuj mapę EVE. Po sukcesie czyści cache dla eveKey. */
    function reserveEveMap(eveKey, mapName, nick) {
        if (EVE_EVENT_ENDED) return false;
        var xhr = new XMLHttpRequest();
        xhr.open('POST', CONFIG.BACKEND_URL.replace(/\/$/, '') + '/api/timer/eve-map-reservations', false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('X-API-Key', CONFIG.API_KEY || '');
        try {
            xhr.send(JSON.stringify({ eveKey: eveKey, mapName: mapName, nick: nick }));
            if (xhr.status === 200) {
                eveMapReservationsCache[eveKey] = null;
                return true;
            }
        } catch (e) {
            if (CONFIG.DEBUG) log('reserveEveMap error:', e);
        }
        return false;
    }

    /** DELETE: usuń rezerwację mapy EVE. */
    function deleteEveMapReservation(eveKey, mapName) {
        if (EVE_EVENT_ENDED) return false;
        var xhr = new XMLHttpRequest();
        xhr.open('DELETE', CONFIG.BACKEND_URL.replace(/\/$/, '') + '/api/timer/eve-map-reservations?eveKey=' + encodeURIComponent(eveKey) + '&mapName=' + encodeURIComponent(mapName), false);
        xhr.setRequestHeader('X-API-Key', CONFIG.API_KEY || '');
        try {
            xhr.send();
            if (xhr.status === 200) {
                eveMapReservationsCache[eveKey] = null;
                return true;
            }
        } catch (e) {
            if (CONFIG.DEBUG) log('deleteEveMapReservation error:', e);
        }
        return false;
    }

    /** Pobiera ranking (suma czasu w aktywnym fazie) dla potwora — zwraca { heroName -> totalSeconds }. */
    function fetchPhaseLeaderboard(monster) {
        if (!monster) return {};
        const now = Date.now();
        if (phaseLeaderboardCache.monster === monster && phaseLeaderboardCache.data && (now - phaseLeaderboardCache.ts) < LEADERBOARD_CACHE_TTL_MS) {
            return phaseLeaderboardCache.data;
        }
        var out = {};
        var xhr = new XMLHttpRequest();
        xhr.open('GET', CONFIG.BACKEND_URL.replace(/\/$/, '') + '/api/leaderboard/ranking?monster=' + encodeURIComponent(monster), false);
        try {
            xhr.send();
            if (xhr.status === 200) {
                var json = JSON.parse(xhr.responseText);
                var list = json.leaderboard || [];
                list.forEach(function (e) {
                    var name = (e.heroName || e.nick || '').trim();
                    if (name) out[name.toLowerCase()] = (e.totalTime || 0);
                });
                phaseLeaderboardCache = { monster: monster, data: out, ts: now };
            }
        } catch (e) {
            if (CONFIG.DEBUG) log('fetchPhaseLeaderboard error:', e);
        }
        return out;
    }
    /** Async — uzupełnia kolejkiAsyncCache, potem wywołuje updateKolejkiListUI (bez blokowania). */
    function refreshKolejkiAsync() {
        if (!currentTarget || !currentTarget.monster || !CONFIG.BACKEND_URL) return;
        var monster = currentTarget.monster;
        var base = CONFIG.BACKEND_URL.replace(/\/$/, '');
        var resUrl = base + '/api/timer/reservations?monster=' + encodeURIComponent(monster);
        var rankUrl = base + '/api/leaderboard/ranking?monster=' + encodeURIComponent(monster);
        var headers = CONFIG.API_KEY ? { 'X-API-Key': CONFIG.API_KEY } : {};
        Promise.all([
            fetch(resUrl, { headers: headers }).then(function (r) { return r.ok ? r.json() : { reservations: [] }; }).then(function (j) { return j.reservations || []; }),
            fetch(rankUrl, { headers: headers }).then(function (r) { return r.ok ? r.json() : { leaderboard: [] }; }).then(function (j) {
                var out = {};
                (j.leaderboard || []).forEach(function (e) {
                    var name = (e.heroName || e.nick || '').trim();
                    if (name) out[name.toLowerCase()] = e.totalTime || 0;
                });
                return out;
            })
        ]).then(function (arr) {
            kolejkiAsyncCache = { monster: monster, reservations: arr[0], timeByNick: arr[1], ts: Date.now() };
            if (kolejkiListContent) updateKolejkiListUI();
        }).catch(function () {});
    }

    // ================================================================
    //  UI — Timer overlay
    // ================================================================
    function createTimerUI() {
        uiElement = document.createElement('div');
        uiElement.id = 'map-timer-display';
        uiElement.style.cssText = `
            position: fixed; top: 8px; left: 50%; transform: translateX(-50%);
            background: rgba(0,0,0,0.8); color: #00ff88; padding: 6px 16px;
            border-radius: 6px; font-family: 'Consolas', monospace; font-size: 14px;
            z-index: 99999; display: none; border: 1px solid rgba(0,255,136,0.3);
            text-shadow: 0 0 4px rgba(0,255,136,0.5); pointer-events: none;
        `;
        document.body.appendChild(uiElement);
    }

    function getTopTimerVisible() {
        try {
            if (typeof GM_getValue === 'function') return GM_getValue(TOP_TIMER_VISIBLE_KEY, true);
            return localStorage.getItem(TOP_TIMER_VISIBLE_KEY) !== '0';
        } catch (e) { return true; }
    }
    function setTopTimerVisible(visible) {
        try {
            if (typeof GM_setValue === 'function') GM_setValue(TOP_TIMER_VISIBLE_KEY, !!visible);
            else localStorage.setItem(TOP_TIMER_VISIBLE_KEY, visible ? '1' : '0');
        } catch (e) { /* ignore */ }
    }
    function getAfkCapSec(monster) {
        if (HERO_AFK_MONSTERS.indexOf(monster) >= 0) return HERO_AFK_CAP_SEC;
        return TITAN_AFK_CAP_SEC;
    }

    function updateTimerUI() {
        if (!uiElement) createTimerUI();
        const statusDot = CONFIG.API_KEY ? '🟢' : '🔴';
        if (sessionAfkCapped) {
            uiElement.textContent = `${statusDot} ⏱ ${currentTarget?.monster} — ${formatTime(accumulatedSeconds)} (limit — odśwież)`;
            uiElement.style.background = 'rgba(120,30,0,0.9)';
            uiElement.style.color = '#ffcc88';
            uiElement.style.border = '1px solid rgba(255,160,60,0.5)';
            uiElement.style.textShadow = '0 0 4px rgba(255,160,60,0.5)';
        } else {
            uiElement.textContent = `${statusDot} ⏱ ${currentTarget?.monster} — ${formatTime(accumulatedSeconds)}`;
            uiElement.style.background = 'rgba(0,0,0,0.8)';
            uiElement.style.color = '#00ff88';
            uiElement.style.border = '1px solid rgba(0,255,136,0.3)';
            uiElement.style.textShadow = '0 0 4px rgba(0,255,136,0.5)';
        }
        uiElement.style.display = (currentTarget && getTopTimerVisible()) ? 'block' : 'none';
    }

    function hideTimerUI() {
        if (uiElement) uiElement.style.display = 'none';
    }

    // ================================================================
    //  UI — Kolejki: ikonka (przesuwalna), klik = lista graczy; rezerwacje na mapie Kic
    // ================================================================
    var KOLEJKI_POS_KEY = 'map_timer_kolejki_pos';

    function getStoredKolejkiPos() {
        function parsePos(v) {
            if (v == null) return null;
            var o = typeof v === 'string' ? (function () { try { return JSON.parse(v); } catch (e) { return null; } })() : v;
            if (o && typeof o.left === 'number' && typeof o.top === 'number') return { left: o.left, top: o.top };
            return null;
        }
        try {
            if (typeof GM_getValue === 'function') {
                var v = GM_getValue(KOLEJKI_POS_KEY, null);
                var pos = parsePos(v);
                if (pos) return pos;
            }
        } catch (e) { /* ignore */ }
        try {
            var raw = localStorage.getItem(KOLEJKI_POS_KEY);
            var pos = parsePos(raw);
            if (pos) return pos;
        } catch (e) { /* ignore */ }
        var w = document.documentElement.clientWidth || 400;
        var h = document.documentElement.clientHeight || 300;
        return { left: Math.max(0, w - 220), top: Math.max(0, h - 320) };
    }

    function setStoredKolejkiPos(left, top) {
        var payload = JSON.stringify({ left: left, top: top });
        try {
            if (typeof GM_setValue === 'function') GM_setValue(KOLEJKI_POS_KEY, payload);
        } catch (e) { /* ignore */ }
        try {
            localStorage.setItem(KOLEJKI_POS_KEY, payload);
        } catch (e) { /* ignore */ }
    }

    function createKolejkiBox() {
        if (kolejkiWrap) return;
        const pos = getStoredKolejkiPos();
        kolejkiWrap = document.createElement('div');
        kolejkiWrap.id = 'map-timer-kolejki-wrap';
        kolejkiWrap.style.cssText = 'position:fixed;left:' + pos.left + 'px;top:' + pos.top + 'px;z-index:99998;';
        kolejkiWrap.innerHTML =
            '<button type="button" class="map-timer-kolejki-btn" title="Menu">📋</button>' +
            '<div class="map-timer-kolejki-menu" style="display:none;">' +
            '<div class="map-timer-kolejki-icon-wrap"><span class="map-timer-tooltip">Kolejki</span><button type="button" class="map-timer-kolejki-icon-btn" data-action="kolejki">📋</button></div>' +
            '<div class="map-timer-kolejki-icon-wrap"><span class="map-timer-tooltip">Heros eventowy</span><button type="button" class="map-timer-kolejki-icon-btn" data-action="heros">⭐</button></div>' +
            '<div class="map-timer-kolejki-icon-wrap"><span class="map-timer-tooltip">Pokaż timer</span><button type="button" class="map-timer-kolejki-icon-btn" data-action="toggle-timer" title="Pokaż/ukryj timer obecności na mapie">⏱</button></div>' +
            '<div class="map-timer-kolejki-icon-wrap"><span class="map-timer-tooltip">Strona Główna</span><a href="' + (CONFIG.BACKEND_URL.replace(/\/$/, '')) + '" target="_blank" rel="noopener" class="map-timer-kolejki-icon-btn map-timer-kolejki-icon-link" title="Strona Główna">↗</a></div>' +
            '</div>' +
            '<div class="map-timer-kolejki-panel" style="display:none;">' +
            '<div class="map-timer-kolejki-title-row"><span class="map-timer-kolejki-title">Kolejki</span><button type="button" class="map-timer-kolejki-close" title="Zamknij">✕</button></div>' +
            '<div class="map-timer-kolejki-list-content"></div></div>';
        const btnStyle = 'background:#1a1a2e;border:1px solid rgba(255,255,255,0.2);color:#eee;width:40px;height:40px;border-radius:10px;cursor:pointer;font-size:18px;box-shadow:0 2px 10px rgba(0,0,0,0.4);';
        const panelStyle = 'position:absolute;min-width:200px;max-width:280px;background:#1a1a2e;color:#eee;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.08);font-family:Arial,sans-serif;font-size:12px;overflow:hidden;';
        const titleRowStyle = 'background:#16213e;padding:8px 12px;font-size:13px;font-weight:bold;display:flex;align-items:center;justify-content:space-between;';
        const titleStyle = 'font-size:13px;font-weight:bold;';
        const listStyle = 'padding:8px 12px;max-height:240px;overflow-y:auto;';
        const menuStyle = 'position:absolute;left:100%;margin-left:4px;top:0;display:flex;gap:4px;background:#1a1a2e;border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:6px;box-shadow:0 4px 16px rgba(0,0,0,0.4);';
        const iconWrapStyle = 'position:relative;';
        const iconBtnStyle = 'width:36px;height:36px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:#16213e;color:#eee;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;';
        const tooltipStyle = 'position:absolute;left:100%;top:50%;transform:translateY(-50%);margin-left:6px;padding:4px 8px;background:#0f0f23;color:#eee;font-size:12px;white-space:nowrap;border-radius:6px;border:1px solid #2a2a4a;box-shadow:0 2px 8px rgba(0,0,0,0.4);z-index:100002;pointer-events:none;opacity:0;transition:none;visibility:hidden;';
        const closeBtnStyle = 'background:none;border:none;color:#8892b0;cursor:pointer;font-size:16px;padding:2px 6px;line-height:1;border-radius:4px;';
        const styleEl = document.createElement('style');
        styleEl.textContent = '.map-timer-kolejki-btn{' + btnStyle + '}.map-timer-kolejki-btn:hover{background:#16213e;}.map-timer-kolejki-menu{' + menuStyle + '}.map-timer-kolejki-icon-wrap{' + iconWrapStyle + '}.map-timer-kolejki-icon-wrap:hover .map-timer-tooltip{opacity:1;visibility:visible;}.map-timer-kolejki-icon-btn{' + iconBtnStyle + '}.map-timer-kolejki-icon-btn:hover{background:#2a2a4a;}.map-timer-kolejki-icon-link{text-decoration:none;color:#eee;}.map-timer-kolejki-icon-link:hover{color:#eee;}.map-timer-tooltip{' + tooltipStyle + '}.map-timer-kolejki-close{' + closeBtnStyle + '}.map-timer-kolejki-close:hover{color:#fff;background:rgba(255,255,255,0.1);}.map-timer-kolejki-panel{' + panelStyle + '}.map-timer-kolejki-title-row{' + titleRowStyle + '}.map-timer-kolejki-title{' + titleStyle + '}.map-timer-kolejki-list-content{' + listStyle + '}.map-timer-kolejki-row{padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.06);}.map-timer-kolejki-meta{color:#888;font-size:10px;}.map-timer-kolejki-item-wrap{display:inline-block;vertical-align:middle;margin-left:4px;}.map-timer-kolejki-item-gif{width:20px;height:20px;object-fit:contain;cursor:pointer;}.map-timer-kolejki-png-popup{position:fixed;z-index:100001;background:#1a1a2e;padding:6px;border:1px solid #2a2a4a;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.5);pointer-events:none;}.map-timer-kolejki-png-popup img{display:block;width:auto;height:auto;max-width:90vw;max-height:70vh;object-fit:contain;}';
        document.head.appendChild(styleEl);
        document.body.appendChild(kolejkiWrap);
        if (EVE_EVENT_ENDED) {
            var herosBtn = kolejkiWrap.querySelector('.map-timer-kolejki-icon-btn[data-action="heros"]');
            if (herosBtn && herosBtn.parentElement) herosBtn.parentElement.style.display = 'none';
        }
        kolejkiMenuPanel = kolejkiWrap.querySelector('.map-timer-kolejki-menu');
        kolejkiListPanel = kolejkiWrap.querySelector('.map-timer-kolejki-panel');
        kolejkiListContent = kolejkiWrap.querySelector('.map-timer-kolejki-list-content');

        function applyKolejkiPanelPosition() {
            if (!kolejkiWrap || !kolejkiListPanel) return;
            const rect = kolejkiWrap.getBoundingClientRect();
            const btnW = 40;
            const btnH = 40;
            const vw = document.documentElement.clientWidth || window.innerWidth;
            const vh = document.documentElement.clientHeight || window.innerHeight;
            const onRight = rect.left + btnW > vw / 2;
            const onBottom = rect.top + btnH > vh / 2;
            if (kolejkiMenuPanel) {
                kolejkiMenuPanel.style.left = onRight ? 'auto' : '100%';
                kolejkiMenuPanel.style.right = onRight ? '100%' : 'auto';
                kolejkiMenuPanel.style.marginLeft = onRight ? '-4px' : '4px';
                kolejkiMenuPanel.style.marginRight = onRight ? '4px' : '0';
                kolejkiMenuPanel.style.top = '0';
                kolejkiMenuPanel.style.bottom = 'auto';
            }
            kolejkiListPanel.style.left = onRight ? 'auto' : '0';
            kolejkiListPanel.style.right = onRight ? '0' : 'auto';
            kolejkiListPanel.style.top = onBottom ? 'auto' : (btnH + 4) + 'px';
            kolejkiListPanel.style.bottom = onBottom ? '100%' : 'auto';
            kolejkiListPanel.style.marginBottom = onBottom ? '4px' : '0';
            kolejkiListPanel.style.marginTop = onBottom ? '0' : '0';
        }

        const btn = kolejkiWrap.querySelector('.map-timer-kolejki-btn');
        const drag = { active: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 };
        btn.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            drag.active = true;
            drag.startX = e.clientX;
            drag.startY = e.clientY;
            const rect = kolejkiWrap.getBoundingClientRect();
            drag.startLeft = rect.left;
            drag.startTop = rect.top;
            e.preventDefault();
        });
        document.addEventListener('mousemove', function (e) {
            if (!drag.active) return;
            const left = Math.max(0, drag.startLeft + (e.clientX - drag.startX));
            const top = Math.max(0, drag.startTop + (e.clientY - drag.startY));
            kolejkiWrap.style.left = left + 'px';
            kolejkiWrap.style.top = top + 'px';
            setStoredKolejkiPos(left, top);
            if (kolejkiOpen || kolejkiMenuOpen) applyKolejkiPanelPosition();
        });
        document.addEventListener('mouseup', function (e) {
            if (e.button !== 0) return;
            if (drag.active) {
                const moved = Math.abs(e.clientX - drag.startX) + Math.abs(e.clientY - drag.startY) > 5;
                drag.active = false;
                if (!moved) {
                    kolejkiMenuOpen = !kolejkiMenuOpen;
                    if (kolejkiMenuPanel) kolejkiMenuPanel.style.display = kolejkiMenuOpen ? 'flex' : 'none';
                    if (kolejkiMenuOpen) applyKolejkiPanelPosition();
                }
            }
        });

        if (kolejkiMenuPanel) {
            kolejkiMenuPanel.querySelectorAll('.map-timer-kolejki-icon-btn').forEach(function (iconBtn) {
                iconBtn.addEventListener('click', function () {
                    const action = iconBtn.getAttribute('data-action');
                    if (action === 'kolejki') {
                        kolejkiMenuOpen = false;
                        if (kolejkiMenuPanel) kolejkiMenuPanel.style.display = 'none';
                        kolejkiOpen = true;
                        applyKolejkiPanelPosition();
                        kolejkiListPanel.style.display = 'block';
                        try { if (typeof GM_setValue === 'function') GM_setValue('kolejki_panel_open', true); } catch (e) { /* ignore */ }
                        updateKolejkiListUI();
                    } else if (action === 'heros') {
                        openEveWindow();
                    } else if (action === 'toggle-timer') {
                        var next = !getTopTimerVisible();
                        setTopTimerVisible(next);
                        updateTimerUI();
                        showToast(next ? 'Timer obecności włączony' : 'Timer obecności ukryty');
                    }
                });
            });
        }
        const closeBtn = kolejkiWrap.querySelector('.map-timer-kolejki-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function () {
                kolejkiOpen = false;
                kolejkiListPanel.style.display = 'none';
                try { if (typeof GM_setValue === 'function') GM_setValue('kolejki_panel_open', false); } catch (e) { /* ignore */ }
            });
        }
        document.addEventListener('mousemove', function (e) {
            if (currentPngPopup && currentPngPopupImg && e.target !== currentPngPopupImg && !(currentPngPopupImg.contains && currentPngPopupImg.contains(e.target))) {
                hidePngPopup();
            }
        });
        document.addEventListener('mouseleave', function () { hidePngPopup(); });
        updateKolejkiListUI();
        // Przywróć stan paneli po odświeżeniu / zmianie postaci (tylko ręczne X zamyka)
        try {
            if (typeof GM_getValue === 'function' && GM_getValue('kolejki_panel_open', false)) {
                kolejkiOpen = true;
                if (kolejkiListPanel) { kolejkiListPanel.style.display = 'block'; applyKolejkiPanelPosition(); }
            }
            var savedEveKeys = getOpenEveKeys();
            if (savedEveKeys.length > 0) {
                createEveWindow();
                savedEveKeys.forEach(function (k) {
                    var key = parseInt(k, 10);
                    if (EVE_MAPS[key]) showEveMapListPanel(key);
                });
                if (eveWindowEl) eveWindowEl.style.display = 'none';
            }
        } catch (e) { /* ignore */ }
    }

    function updateKolejkiListUI() {
        if (!kolejkiListContent) return;
        const players = getPlayersOnMap();
        const target = findTarget(getCurrentMapName());
        var reservations = [];
        var timeByNick = {};
        if (target && target.monster) {
            if (kolejkiAsyncCache.monster === target.monster) {
                reservations = kolejkiAsyncCache.reservations || [];
                timeByNick = kolejkiAsyncCache.timeByNick || {};
            }
        }
        const byNick = {};
        reservations.forEach(function (r) {
            const n = (r.nick || '').trim().toLowerCase();
            if (n) byNick[n] = r;
        });
        // Sort: 1) suma czasu w fazie (malejąco), 2) ma rezerwację przed brakiem, 3) alfabetycznie
        const sortedPlayers = players.slice().filter(function (p) { return (p && p.nick) && String(p.nick).trim(); }).sort(function (a, b) {
            const na = String(a.nick).trim();
            const nb = String(b.nick).trim();
            const naLow = na.toLowerCase();
            const nbLow = nb.toLowerCase();
            const timeA = timeByNick[naLow] || 0;
            const timeB = timeByNick[nbLow] || 0;
            if (timeA !== timeB) return timeB - timeA;
            const resA = byNick[naLow];
            const resB = byNick[nbLow];
            if (!!resA !== !!resB) return resA ? -1 : 1;
            return na.localeCompare(nb, 'pl');
        });

        kolejkiListContent.innerHTML = '';
        if (!sortedPlayers.length) {
            kolejkiListContent.innerHTML = '<div style="color:#888;font-size:11px;">Brak danych o graczach</div>';
            return;
        }
        const baseUrl = (CONFIG.BACKEND_URL || '').replace(/\/$/, '');
        const titanSlug = target && target.monster ? target.monster.toLowerCase() : '';
        sortedPlayers.forEach(function (p) {
            const nick = String(p.nick).trim();
            const lvl = (p && p.lvl != null) ? p.lvl : '';
            const prof = (p && p.prof) ? String(p.prof) : '';
            const res = byNick[nick.toLowerCase()];
            const row = document.createElement('div');
            row.className = 'map-timer-kolejki-row';
            const nickColor = res ? (PRIORITY_COLORS[res.priority] || '#eee') : NICK_COLOR_NO_LIST;
            const priorityTitle = res ? (PRIORITY_LABELS[res.priority] || ('Priorytet ' + res.priority)) : '';
            if (res) {
                let html = '<span class="map-timer-kolejki-nick" style="color:' + nickColor + ';" title="' + escapeHtml(priorityTitle) + '">' + escapeHtml(nick) + '</span>';
                if (lvl !== '' || prof) html += ' <span class="map-timer-kolejki-meta">' + (lvl !== '' ? ' Lv.' + lvl : '') + (prof ? ' ' + prof : '') + '</span>';
                const gifUrl = baseUrl && titanSlug && res.gifFile ? (baseUrl + '/api/titans-images/' + titanSlug + '/' + (res.itemKey || '') + '/' + res.gifFile) : '';
                const pngUrl = baseUrl && titanSlug && res.pngFile ? (baseUrl + '/api/titans-images/' + titanSlug + '/' + (res.itemKey || '') + '/' + res.pngFile) : '';
                if (gifUrl) html += ' <span class="map-timer-kolejki-item-wrap"><img class="map-timer-kolejki-item-gif" src="' + gifUrl + '" alt="" data-png="' + escapeHtml(pngUrl) + '"/></span>';
                row.innerHTML = html;
                if (pngUrl) {
                    const img = row.querySelector('.map-timer-kolejki-item-gif');
                    if (img) addHoverPng(img, pngUrl);
                }
            } else {
                row.innerHTML = '<span style="color:' + NICK_COLOR_NO_LIST + ';">' + escapeHtml(nick) + '</span>' + (lvl !== '' || prof ? ' <span class="map-timer-kolejki-meta">' + (lvl !== '' ? ' Lv.' + lvl : '') + (prof ? ' ' + prof : '') + '</span>' : '');
            }
            kolejkiListContent.appendChild(row);
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function hidePngPopup() {
        if (currentPngPopup && currentPngPopup.parentNode) currentPngPopup.parentNode.removeChild(currentPngPopup);
        currentPngPopup = null;
        currentPngPopupImg = null;
    }

    function addHoverPng(imgEl, pngUrl) {
        imgEl.addEventListener('mouseenter', function () {
            hidePngPopup();
            currentPngPopupImg = imgEl;
            currentPngPopup = document.createElement('div');
            currentPngPopup.className = 'map-timer-kolejki-png-popup';
            const i = document.createElement('img');
            i.src = pngUrl;
            i.alt = '';
            currentPngPopup.appendChild(i);
            document.body.appendChild(currentPngPopup);
            const r = imgEl.getBoundingClientRect();
            currentPngPopup.style.left = (r.right + 4) + 'px';
            currentPngPopup.style.top = Math.max(4, r.top) + 'px';
        });
        imgEl.addEventListener('mouseleave', function () {
            hidePngPopup();
        });
    }

    // ================================================================
    //  UI — Heros eventowy (EVE): okno z 3 opcjami i listą map
    // ================================================================
    var EVE_OPTIONS = [
        { key: 41, label: 'EVE 41 - Grim Blackcluck' },
        { key: 81, label: 'EVE 81 - Hotblood Capon' },
    ];
    var EVE_HERO_NAMES = { 41: 'Grim Blackcluck', 81: 'Hotblood Capon' };
    var eveRespawnCache = null;
    var eveDashboardCache = {};  // eveKey -> { reservations, presence, lastLeft, respawnTimer } — do lokalnego odliczania
    var lastEveFetchMapName = null; // fetch przy każdym przejściu przez mapę
    var lastEveRespawnSyncTs = 0;   // gdy stoimy na mapie EVE: co 60s pobieramy globalne czasy (GET) i odświeżamy odliczanie
    const EVE_RESPAWN_SYNC_INTERVAL_MS = 60 * 1000; // 60 s — optymalnie: nie co sekundę, gra płynna
    var lastEveDashboardGetTs = 0;  // co 6 s GET eve-dashboard gdy na mapie EVE (obecność + timery dla wszystkich)
    const EVE_PRESENCE_AND_GET_INTERVAL_MS = 6 * 1000; // 6 s — POST presence + GET dashboard

    function createEveWindow() {
        if (eveWindowEl) return eveWindowEl;
        eveWindowEl = document.createElement('div');
        eveWindowEl.id = 'map-timer-eve-window';
        eveWindowEl.style.cssText = 'position:fixed;z-index:5003;min-width:280px;max-width:360px;background:#1a1a2e;border:1px solid #2a2a4a;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.5);font-family:Arial,sans-serif;overflow:hidden;';
        var savedPos = getEveWindowPos();
        if (savedPos != null) {
            eveWindowEl.style.left = savedPos.left + 'px';
            eveWindowEl.style.top = savedPos.top + 'px';
        } else {
            eveWindowEl.style.left = '50%';
            eveWindowEl.style.top = '50%';
            eveWindowEl.style.transform = 'translate(-50%,-50%)';
        }
        eveWindowEl.innerHTML =
            '<div class="map-timer-eve-title" style="background:#16213e;padding:10px 36px 10px 12px;font-weight:bold;font-size:14px;border-bottom:1px solid #2a2a4a;color:#fff;cursor:move;user-select:none;">Heros eventowy</div>' +
            '<div class="map-timer-eve-buttons" style="padding:12px;display:flex;flex-direction:column;gap:8px;">' +
            EVE_OPTIONS.map(function (o) { return '<button type="button" class="map-timer-eve-opt" data-eve="' + o.key + '" style="padding:10px 12px;background:#16213e;border:1px solid #2a2a4a;border-radius:8px;color:#eee;cursor:pointer;text-align:left;font-size:13px;">' + escapeHtml(o.label) + '</button>'; }).join('') +
            '</div>' +
            '<button type="button" class="map-timer-eve-close" style="position:absolute;top:8px;right:8px;background:none;border:none;color:#8892b0;cursor:pointer;font-size:18px;padding:0 4px;">✕</button>';
        document.body.appendChild(eveWindowEl);

        var titleBar = eveWindowEl.querySelector('.map-timer-eve-title');
        var drag = { active: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 };
        titleBar.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            drag.active = true;
            drag.startX = e.clientX;
            drag.startY = e.clientY;
            var rect = eveWindowEl.getBoundingClientRect();
            drag.startLeft = rect.left;
            drag.startTop = rect.top;
            eveWindowEl.style.transform = 'none';
            eveWindowEl.style.left = rect.left + 'px';
            eveWindowEl.style.top = rect.top + 'px';
            e.preventDefault();
        });
        document.addEventListener('mousemove', function (e) {
            if (!drag.active) return;
            eveWindowEl.style.left = (drag.startLeft + (e.clientX - drag.startX)) + 'px';
            eveWindowEl.style.top = (drag.startTop + (e.clientY - drag.startY)) + 'px';
        });
        document.addEventListener('mouseup', function (e) {
            if (e.button !== 0) return;
            drag.active = false;
            var r = eveWindowEl.getBoundingClientRect();
            saveEveWindowPos(Math.round(r.left), Math.round(r.top));
        });

        eveWindowEl.querySelectorAll('.map-timer-eve-opt').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var key = parseInt(btn.getAttribute('data-eve'), 10);
                selectedEveKey = key;
                showEveMapListPanel(key);
            });
        });
        eveWindowEl.querySelector('.map-timer-eve-close').addEventListener('click', function () {
            eveWindowOpen = false;
            if (eveWindowEl) eveWindowEl.style.display = 'none';
        });
        return eveWindowEl;
    }

    function getOpenEveKeys() {
        try {
            if (typeof GM_getValue !== 'function') return [];
            var raw = GM_getValue('eve_list_keys', '[]');
            var arr = JSON.parse(raw || '[]');
            return Array.isArray(arr) ? arr.filter(function (k) { return [41, 81].indexOf(parseInt(k, 10)) >= 0; }) : [];
        } catch (e) { return []; }
    }
    function saveOpenEveKeys(openKeys) {
        try { if (typeof GM_setValue === 'function') GM_setValue('eve_list_keys', JSON.stringify(openKeys)); } catch (e) { /* ignore */ }
    }
    var EVE_WINDOW_POS_KEY = 'map_timer_eve_window_pos';
    var EVE_PANEL_POS_KEY = 'map_timer_eve_panel_pos';

    function parsePosObj(raw) {
        if (raw == null) return null;
        var o = typeof raw === 'string' ? (function () { try { return JSON.parse(raw); } catch (e) { return null; } })() : (typeof raw === 'object' && raw !== null ? raw : null);
        return (o && typeof o.left === 'number' && typeof o.top === 'number') ? o : null;
    }
    function getEveWindowPos() {
        try {
            if (typeof GM_getValue === 'function') {
                var raw = GM_getValue(EVE_WINDOW_POS_KEY, null);
                var pos = parsePosObj(raw);
                if (pos) return pos;
            }
        } catch (e) { /* ignore */ }
        try {
            var raw = localStorage.getItem(EVE_WINDOW_POS_KEY);
            return parsePosObj(raw);
        } catch (e) { return null; }
    }
    function saveEveWindowPos(left, top) {
        var payload = JSON.stringify({ left: left, top: top });
        try { if (typeof GM_setValue === 'function') GM_setValue(EVE_WINDOW_POS_KEY, payload); } catch (e) { /* ignore */ }
        try { localStorage.setItem(EVE_WINDOW_POS_KEY, payload); } catch (e) { /* ignore */ }
    }
    function getEvePanelPos(eveKey) {
        function get() {
            try {
                if (typeof GM_getValue === 'function') {
                    var raw = GM_getValue(EVE_PANEL_POS_KEY, '{}');
                    var o = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
                    var p = o[String(eveKey)];
                    return (p && typeof p.left === 'number' && typeof p.top === 'number') ? p : null;
                }
            } catch (e) { /* ignore */ }
            try {
                var raw = localStorage.getItem(EVE_PANEL_POS_KEY);
                var o = raw ? JSON.parse(raw) : {};
                var p = o[String(eveKey)];
                return (p && typeof p.left === 'number' && typeof p.top === 'number') ? p : null;
            } catch (e) { return null; }
        }
        return get();
    }
    function saveEvePanelPos(eveKey, left, top) {
        function readAll() {
            try {
                if (typeof GM_getValue === 'function') {
                    var raw = GM_getValue(EVE_PANEL_POS_KEY, '{}');
                    return typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
                }
            } catch (e) { /* ignore */ }
            try {
                var raw = localStorage.getItem(EVE_PANEL_POS_KEY);
                return raw ? JSON.parse(raw) : {};
            } catch (e) { return {}; }
        }
        var o = readAll();
        o[String(eveKey)] = { left: left, top: top };
        var payload = JSON.stringify(o);
        try { if (typeof GM_setValue === 'function') GM_setValue(EVE_PANEL_POS_KEY, payload); } catch (e) { /* ignore */ }
        try { localStorage.setItem(EVE_PANEL_POS_KEY, payload); } catch (e) { /* ignore */ }
    }

    function showEveMapListPanel(eveKey) {
        var rec = eveMapListPanelsByKey[eveKey];
        if (rec && rec.panel) {
            rec.panel.style.display = 'block';
            var openKeys = getOpenEveKeys();
            if (openKeys.indexOf(eveKey) < 0) { openKeys.push(eveKey); saveOpenEveKeys(openKeys); }
            var currentMap = getCurrentMapName();
            var nick = getCurrentHeroName();
            var maps = EVE_MAPS[eveKey] || [];
            var isOnThisEveMap = currentMap && maps.some(function (m) { return String(m).trim().toLowerCase() === currentMap.trim().toLowerCase(); });
            if (isOnThisEveMap && nick) {
                sendEvePresenceNow(eveKey, currentMap, nick);
                setTimeout(function () { updateEveMapListForPanel(eveKey); }, 150);
            } else {
                updateEveMapListForPanel(eveKey);
            }
            return;
        }
        var panel = document.createElement('div');
        panel.setAttribute('data-eve-key', eveKey);
        panel.className = 'map-timer-eve-list-panel';
        panel.style.cssText = 'position:fixed;z-index:5004;min-width:260px;max-width:520px;width:280px;background:#1a1a2e;border:1px solid #2a2a4a;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.5);font-family:Arial,sans-serif;overflow:visible;display:flex;flex-direction:column;';
        var savedPanelPos = getEvePanelPos(eveKey);
        var w = document.documentElement.clientWidth || 800;
        var h = document.documentElement.clientHeight || 600;
        if (savedPanelPos != null && savedPanelPos.left >= 0 && savedPanelPos.top >= 0 && savedPanelPos.left < w && savedPanelPos.top < h) {
            panel.style.left = savedPanelPos.left + 'px';
            panel.style.top = savedPanelPos.top + 'px';
        } else {
            var count = Object.keys(eveMapListPanelsByKey).length;
            var offLeft = w - 320 - (count * 20);
            var offTop = Math.max(60, (h - 320) / 2) + (count * 24);
            panel.style.left = offLeft + 'px';
            panel.style.top = offTop + 'px';
        }
        var listHeight = 280;
        panel.innerHTML =
            '<div class="map-timer-eve-list-panel-title" style="background:#16213e;padding:10px 36px 10px 12px;font-weight:bold;font-size:14px;border-bottom:1px solid #2a2a4a;color:#fff;cursor:move;user-select:none;">Mapy</div>' +
            '<div class="map-timer-eve-list-title" style="font-size:12px;color:#8892b0;padding:8px 12px 0;"></div>' +
            '<div class="map-timer-eve-list" style="padding:8px 12px 12px;overflow-y:auto;overflow-x:hidden;flex:1;min-height:120px;max-height:400px;"></div>' +
            '<div class="map-timer-eve-list-resize" style="height:6px;background:#2a2a4a;cursor:ns-resize;flex-shrink:0;border-radius:0 0 12px 12px;"></div>' +
            '<div class="map-timer-eve-list-resize-w" style="position:absolute;top:40px;right:0;width:8px;bottom:0;cursor:ew-resize;"></div>' +
            '<button type="button" class="map-timer-eve-list-close" style="position:absolute;top:8px;right:8px;background:none;border:none;color:#8892b0;cursor:pointer;font-size:18px;padding:0 4px;">✕</button>';
        document.body.appendChild(panel);

        var listEl = panel.querySelector('.map-timer-eve-list');
        listEl.style.height = listHeight + 'px';
        listEl.setAttribute('tabindex', '0');
        listEl.addEventListener('wheel', function (ev) {
            var el = listEl;
            if (ev.deltaY === 0) return;
            var maxScroll = el.scrollHeight - el.clientHeight;
            if (maxScroll <= 0) return;
            el.scrollTop += ev.deltaY;
            if (el.scrollTop <= 0) el.scrollTop = 0;
            if (el.scrollTop >= maxScroll) el.scrollTop = maxScroll;
            ev.preventDefault();
            ev.stopPropagation();
        }, { passive: false });
        var listTitleBar = panel.querySelector('.map-timer-eve-list-panel-title');
        var listDrag = { active: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 };
        listTitleBar.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            listDrag.active = true;
            listDrag.startX = e.clientX;
            listDrag.startY = e.clientY;
            var rect = panel.getBoundingClientRect();
            listDrag.startLeft = rect.left;
            listDrag.startTop = rect.top;
            e.preventDefault();
        });
        document.addEventListener('mousemove', function (e) {
            if (!listDrag.active) return;
            panel.style.left = (listDrag.startLeft + (e.clientX - listDrag.startX)) + 'px';
            panel.style.top = (listDrag.startTop + (e.clientY - listDrag.startY)) + 'px';
        });
        document.addEventListener('mouseup', function (e) {
            if (e.button !== 0) return;
            listDrag.active = false;
            var r = panel.getBoundingClientRect();
            saveEvePanelPos(eveKey, Math.round(r.left), Math.round(r.top));
        });
        var resizeWEl = panel.querySelector('.map-timer-eve-list-resize-w');
        var resizeWDrag = { active: false, startX: 0, startW: 0 };
        resizeWEl.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            e.preventDefault();
            resizeWDrag.active = true;
            resizeWDrag.startX = e.clientX;
            resizeWDrag.startW = panel.offsetWidth;
        });
        document.addEventListener('mousemove', function (e) {
            if (!resizeWDrag.active) return;
            var dw = e.clientX - resizeWDrag.startX;
            var w = Math.max(260, Math.min(520, resizeWDrag.startW + dw));
            panel.style.width = w + 'px';
        });
        document.addEventListener('mouseup', function (e) {
            if (e.button !== 0) return;
            resizeWDrag.active = false;
        });

        var resizeEl = panel.querySelector('.map-timer-eve-list-resize');
        var resizeDrag = { active: false, startY: 0, startHeight: 0 };
        resizeEl.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            e.preventDefault();
            resizeDrag.active = true;
            resizeDrag.startY = e.clientY;
            resizeDrag.startHeight = listEl.offsetHeight;
        });
        document.addEventListener('mousemove', function (e) {
            if (!resizeDrag.active) return;
            var dy = e.clientY - resizeDrag.startY;
            var h = Math.max(120, Math.min(400, resizeDrag.startHeight + dy));
            listEl.style.height = h + 'px';
        });
        document.addEventListener('mouseup', function (e) {
            if (e.button !== 0) return;
            resizeDrag.active = false;
        });

        panel.querySelector('.map-timer-eve-list-close').addEventListener('click', function () {
            panel.style.display = 'none';
            var openKeys = getOpenEveKeys().filter(function (k) { return parseInt(k, 10) !== eveKey; });
            saveOpenEveKeys(openKeys);
        });

        panel.querySelector('.map-timer-eve-list-title').textContent = 'Mapy (EVE ' + eveKey + ')';
        eveMapListPanelsByKey[eveKey] = { panel: panel, listEl: listEl, listHeight: listHeight };
        var openKeys = getOpenEveKeys();
        if (openKeys.indexOf(eveKey) < 0) { openKeys.push(eveKey); saveOpenEveKeys(openKeys); }
        var currentMap = getCurrentMapName();
        var nick = getCurrentHeroName();
        var maps = EVE_MAPS[eveKey] || [];
        var isOnThisEveMap = currentMap && maps.some(function (m) { return String(m).trim().toLowerCase() === currentMap.trim().toLowerCase(); });
        if (isOnThisEveMap && nick) {
            sendEvePresenceNow(eveKey, currentMap, nick);
            setTimeout(function () { updateEveMapListForPanel(eveKey); }, 150);
        } else {
            updateEveMapListForPanel(eveKey);
        }
    }

    function ensureEveMapPopup() {
        if (eveMapPopupEl) return eveMapPopupEl;
        eveMapPopupEl = document.createElement('div');
        eveMapPopupEl.id = 'map-timer-eve-map-popup';
        eveMapPopupEl.style.cssText = 'position:fixed;z-index:5005;min-width:220px;max-width:360px;background:#1a1a2e;border:1px solid #2a2a4a;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.5);font-family:Arial,sans-serif;overflow:hidden;display:none;';
        eveMapPopupEl.innerHTML =
            '<div style="background:#16213e;padding:10px 32px 10px 12px;font-weight:bold;font-size:13px;border-bottom:1px solid #2a2a4a;color:#fff;">Mapa</div>' +
            '<div class="map-timer-eve-map-popup-body" style="padding:12px;font-size:13px;color:#eee;"></div>' +
            '<button type="button" class="map-timer-eve-map-popup-close" style="position:absolute;top:8px;right:8px;background:none;border:none;color:#8892b0;cursor:pointer;font-size:18px;padding:0 4px;">✕</button>';
        document.body.appendChild(eveMapPopupEl);
        eveMapPopupEl.querySelector('.map-timer-eve-map-popup-close').addEventListener('click', function () {
            eveMapPopupEl.style.display = 'none';
            eveMapPopupCurrentMap = null;
        });
        return eveMapPopupEl;
    }

    function toggleEveMapPopup(mapName) {
        ensureEveMapPopup();
        if (eveMapPopupCurrentMap === mapName) {
            eveMapPopupEl.style.display = 'none';
            eveMapPopupCurrentMap = null;
            return;
        }
        eveMapPopupCurrentMap = mapName;
        eveMapPopupEl.querySelector('.map-timer-eve-map-popup-body').textContent = mapName;
        eveMapPopupEl.style.display = 'block';
        var w = document.documentElement.clientWidth || 400;
        var h = document.documentElement.clientHeight || 300;
        eveMapPopupEl.style.left = (w - 280) / 2 + 'px';
        eveMapPopupEl.style.top = Math.max(60, (h - 120) / 2) + 'px';
    }

    var eveContextMenuEl = null;
    function showEveReserveContextMenu(e, eveKey, mapName, isReserved) {
        e.preventDefault();
        e.stopPropagation();
        if (eveContextMenuEl && eveContextMenuEl.parentNode) eveContextMenuEl.parentNode.removeChild(eveContextMenuEl);
        eveContextMenuEl = document.createElement('div');
        eveContextMenuEl.style.cssText = 'position:fixed;z-index:5020;background:#1a1a2e;border:1px solid #2a2a4a;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.5);padding:4px 0;min-width:160px;';
        eveContextMenuEl.style.left = e.clientX + 'px';
        eveContextMenuEl.style.top = e.clientY + 'px';

        var itemReserve = document.createElement('div');
        itemReserve.style.cssText = 'padding:8px 14px;font-size:13px;color:#eee;cursor:pointer;';
        itemReserve.textContent = 'Zarezerwuj';
        itemReserve.addEventListener('click', function () {
            if (eveContextMenuEl && eveContextMenuEl.parentNode) eveContextMenuEl.parentNode.removeChild(eveContextMenuEl);
            eveContextMenuEl = null;
            var nick = getCurrentHeroName();
            if (!CONFIG.API_KEY) { showToast('Ustaw API Key w ustawieniach', 'error'); return; }
            if (reserveEveMap(eveKey, mapName, nick)) {
                showToast('Zarezerwowano: ' + mapName);
                updateEveMapListForPanel(eveKey);
            } else {
                showToast('Błąd rezerwacji', 'error');
            }
        });
        eveContextMenuEl.appendChild(itemReserve);

        if (isReserved) {
            var itemDelete = document.createElement('div');
            itemDelete.style.cssText = 'padding:8px 14px;font-size:13px;color:#e74c3c;cursor:pointer;border-top:1px solid rgba(255,255,255,0.08);';
            itemDelete.textContent = 'Usuń rezerwację';
            itemDelete.addEventListener('click', function () {
                if (eveContextMenuEl && eveContextMenuEl.parentNode) eveContextMenuEl.parentNode.removeChild(eveContextMenuEl);
                eveContextMenuEl = null;
                if (!CONFIG.API_KEY) { showToast('Ustaw API Key w ustawieniach', 'error'); return; }
                if (deleteEveMapReservation(eveKey, mapName)) {
                    showToast('Rezerwacja usunięta');
                    updateEveMapListForPanel(eveKey);
                } else {
                    showToast('Błąd usuwania rezerwacji', 'error');
                }
            });
            eveContextMenuEl.appendChild(itemDelete);
        }

        document.body.appendChild(eveContextMenuEl);
        setTimeout(function () {
            document.addEventListener('click', function closeMenu() {
                document.removeEventListener('click', closeMenu);
                if (eveContextMenuEl && eveContextMenuEl.parentNode) eveContextMenuEl.parentNode.removeChild(eveContextMenuEl);
                eveContextMenuEl = null;
            });
        }, 0);
    }

    function formatTimeSince(sec) {
        if (sec < 0) return '—';
        var m = Math.floor(sec / 60);
        var s = Math.floor(sec % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    }
    function colorByTimeSinceLeft(sec) {
        if (sec < 0) return '#8B0000';
        if (sec <= 30) return '#FA8072';
        if (sec <= 60) return '#CD5C5C';
        if (sec <= 120) return '#FF0000';
        return '#8B0000';
    }
    /** Jedno żądanie zamiast 3 — mniej lagu. Async: callback(data). */
    function fetchEveDashboardAsync(eveKey, callback) {
        if (!CONFIG.BACKEND_URL || typeof callback !== 'function') return;
        var url = CONFIG.BACKEND_URL.replace(/\/$/, '') + '/api/timer/eve-dashboard?eveKey=' + eveKey;
        fetch(url).then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
            if (data) callback(eveKey, data);
        }).catch(function () {});
    }
    /** Rysuje listę map i tytuł z danych (data + now). Odliczanie lokalne — now się zmienia co sekundę. */
    function renderEveListAndTitle(eveKey, data, now) {
        var rec = eveMapListPanelsByKey[eveKey];
        if (!rec || !rec.panel || !rec.listEl) return;
        var listEl = rec.listEl;
        var maps = EVE_MAPS[eveKey] || [];
        var myNick = getCurrentHeroName();
        var reservations = data.reservations || [];
        var presence = data.presence || [];
        var apiLastLeft = data.lastLeft || {};
        var reservedByMap = {};
        reservations.forEach(function (r) { reservedByMap[String(r.mapName).trim()] = r.nick || ''; });
        var presenceByMap = {};
        presence.forEach(function (p) {
            var key = String(p.mapName).trim();
            if (!presenceByMap[key]) presenceByMap[key] = [];
            presenceByMap[key].push(p.nick || '');
        });
        listEl.innerHTML = '';
        if (maps.length === 0) {
            listEl.innerHTML = '<div style="color:#8892b0;font-size:12px;padding:8px 0;">Brak map (lista do uzupełnienia w skrypcie).</div>';
            applyEvePanelTitleFromData(eveKey, data.respawnTimer);
            return;
        }
        maps.forEach(function (mapName) {
            var mapKey = String(mapName).trim();
            var onMapNicks = presenceByMap[mapKey] || [];
            var hasSomeoneOnMap = onMapNicks.length > 0;
            var reservedNick = reservedByMap[mapKey];
            var isReserved = !!reservedNick;
            var displayRight = '—';
            var rowColor = '#8B0000';
            if (hasSomeoneOnMap) {
                rowColor = '#228B22';
                displayRight = onMapNicks.map(function (n) { return (n && myNick && String(n).trim().toLowerCase() === String(myNick).trim().toLowerCase()) ? 'Ty' : n; }).join(', ');
            } else {
                var lastLeft = (eveMapLastLeftAt[eveKey] && eveMapLastLeftAt[eveKey][mapKey]) || apiLastLeft[mapKey];
                var secSince = (lastLeft && typeof lastLeft === 'number') ? (now - lastLeft) / 1000 : -1;
                rowColor = colorByTimeSinceLeft(secSince);
                displayRight = (secSince >= 0) ? formatTimeSince(secSince) : (isReserved ? reservedNick : '—');
            }
            var mapDisplay = (isReserved ? '* ' : '') + mapName;
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.06);font-size:12px;cursor:pointer;';
            row.innerHTML = '<span style="color:' + rowColor + ';">' + escapeHtml(mapDisplay) + '</span><span style="color:' + rowColor + ';">' + escapeHtml(displayRight) + '</span>';
            if (isReserved) row.title = 'Zarezerwował: ' + escapeHtml(reservedNick);
            row.addEventListener('click', function (ev) { if (ev.button === 0) toggleEveMapPopup(mapName); });
            row.addEventListener('contextmenu', function (ev) { showEveReserveContextMenu(ev, eveKey, mapName, isReserved); });
            listEl.appendChild(row);
        });
        applyEvePanelTitleFromData(eveKey, data.respawnTimer);
    }
    /** Odświeża wyświetlanie z cache — tylko przelicza czasy (odliczanie lokalne co 1 s). */
    function refreshEvePanelDisplayFromCache(eveKey) {
        var data = eveDashboardCache[eveKey];
        if (!data) return;
        renderEveListAndTitle(eveKey, data, Date.now());
    }
    /** Aplikuje odpowiedź dashboardu: wykrywa wyjścia (POST), zapisuje do cache, rysuje. Fetch tylko przy wejściu na mapę / odświeżeniu. */
    function applyEveDashboardToPanel(eveKey, data) {
        var rec = eveMapListPanelsByKey[eveKey];
        if (!rec || !rec.panel || !rec.listEl) return;
        var listEl = rec.listEl;
        var maps = EVE_MAPS[eveKey] || [];
        var currentMap = getCurrentMapName() || '';
        var myNick = getCurrentHeroName();
        var reservations = data.reservations || [];
        var presence = data.presence || [];
        var apiLastLeft = data.lastLeft || {};
        var presenceByMap = {};
        presence.forEach(function (p) {
            var key = String(p.mapName).trim();
            if (!presenceByMap[key]) presenceByMap[key] = [];
            presenceByMap[key].push(p.nick || '');
        });
        if (!eveMapLastLeftAt[eveKey]) eveMapLastLeftAt[eveKey] = {};
        if (!evePrevPresenceByMap[eveKey]) evePrevPresenceByMap[eveKey] = {};
        var prev = evePrevPresenceByMap[eveKey];
        var now = Date.now();
        maps.forEach(function (mapName) {
            var mapKey = String(mapName).trim();
            var onMapNicks = presenceByMap[mapKey] || [];
            var hadSomeone = (prev[mapKey] && prev[mapKey].length > 0);
            if (hadSomeone && onMapNicks.length === 0) {
                eveMapLastLeftAt[eveKey][mapKey] = now;
                if (!EVE_EVENT_ENDED) {
                    fetch(CONFIG.BACKEND_URL.replace(/\/$/, '') + '/api/timer/eve-map-last-left', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eveKey: eveKey, mapName: mapKey }) }).catch(function () {});
                }
            }
            prev[mapKey] = onMapNicks.slice();
        });
        if (data.respawnTimer != null) {
            if (!eveRespawnCache) eveRespawnCache = { timers: {}, ts: 0 };
            if (!eveRespawnCache.timers) eveRespawnCache.timers = {};
            eveRespawnCache.timers[eveKey] = data.respawnTimer;
            eveRespawnCache.ts = now;
        }
        eveDashboardCache[eveKey] = { reservations: data.reservations || [], presence: data.presence || [], lastLeft: data.lastLeft || {}, respawnTimer: data.respawnTimer };
        renderEveListAndTitle(eveKey, eveDashboardCache[eveKey], now);
    }
    function applyEvePanelTitleFromData(eveKey, _respawnTimerMs) {
        var rec = eveMapListPanelsByKey[eveKey];
        if (!rec || !rec.panel) return;
        var titleEl = rec.panel.querySelector('.map-timer-eve-list-panel-title');
        if (!titleEl) return;
        titleEl.textContent = 'Mapy';
        titleEl.style.color = '#fff';
    }
    function updateEveMapListForPanel(eveKey) {
        fetchEveDashboardAsync(eveKey, function (k, data) { applyEveDashboardToPanel(k, data); });
    }
    function openEveWindow() {
        createEveWindow();
        eveWindowOpen = true;
        eveWindowEl.style.display = 'block';
        selectedEveKey = null;
    }

    // Odliczanie sekund lokalnie co 1 s — zero requestów, tylko przeliczanie „X min temu” i „Respawn: MM:SS” z cache
    setInterval(function () {
        [41, 81].forEach(function (k) {
            var rec = eveMapListPanelsByKey[k];
            if (rec && rec.panel && rec.panel.style.display !== 'none') refreshEvePanelDisplayFromCache(k);
        });
    }, 1000);
    // Backend tylko przy wejściu na mapę i przy odświeżeniu (w tick przy zmianie mapy + przy otwarciu/restore panelu)
    // Kolejki — dane z API co 5 s async (bez blokowania głównego wątku)
    setInterval(refreshKolejkiAsync, 5000);

    // ================================================================
    //  UI — Toast notifications
    // ================================================================
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        const bg = type === 'error' ? '#e74c3c' : type === 'warn' ? '#e67e22' : '#27ae60';
        const ttl = type === 'warn' ? 8000 : 3000;
        toast.style.cssText = `
            position: fixed; bottom: 60px; left: 50%; transform: translateX(-50%);
            background: ${bg}; color: #fff; padding: 10px 20px; border-radius: 8px;
            font-family: Arial, sans-serif; font-size: 13px; z-index: 100000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3); transition: opacity 0.5s;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }, ttl);
    }

    // ================================================================
    //  EVENT LISTENERS
    // ================================================================
    window.addEventListener('pagehide', () => {
        // pagehide odpala się przy przeładowaniu/nawigacji/zamknięciu — finalizujemy tylko raz.
        finalizeSession('pagehide', true);
    });

    // ================================================================
    //  INIT
    // ================================================================
    function init() {
        refreshConfigFromStorage();
        log('🚀 Map Timer — inicjalizacja');
        log(`   Mapy: ${CONFIG.TARGETS.map(t => t.map).join(' | ')}`);
        log(`   BACKEND_URL: ${CONFIG.BACKEND_URL || '(pusty — ustaw w ⚙️)'}`);
        log(`   API Key: ${CONFIG.API_KEY ? ('✅ ' + String(CONFIG.API_KEY).slice(0, 8) + '…') : '❌ BRAK — zainstaluj skrypt ze strony (link z tokenem)'}`);

        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'visible') pollHeroLevelNotificationsOnce();
        });

        setInterval(tick, CONFIG.CHECK_INTERVAL);
        setTimeout(function () { tick(); }, 800);

        const waitForEngine = setInterval(function () {
            if (getEngine()) {
                clearInterval(waitForEngine);
                log('Engine znaleziony ✅');
                if (!kolejkiWrap) {
                    createKolejkiBox();
                    flushPending();
                }
                pollHeroLevelNotificationsOnce();
            }
        }, 500);
    }

    init();

    // Debug API
    window.MapTimer = {
        getState: () => ({ currentTarget, accumulatedSeconds, heroName, worldName, apiKey: CONFIG.API_KEY ? '***set***' : 'not set' }),
        forceFlush: () => finalizeSession('manual_flush'),
        flushPending,
        addTarget: (map, monster) => { CONFIG.TARGETS.push({ map, monster }); log(`Added target: ${monster} on ${map}`); },
    };
})();
