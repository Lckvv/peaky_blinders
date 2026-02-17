// ==UserScript==
// @name         Margonem Map Timer
// @namespace    http://tampermonkey.net/
// @version      2.5
// @description  Tracks time spent on target maps and syncs with backend. Supports API key auth for multi-user leaderboards.
// @author       Lucek
// @match        https://*.margonem.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      *
// @connect      *.railway.app
// @connect      *.up.railway.app
// @connect      discord.com
// ==/UserScript==

(function () {
    'use strict';

    // Uruchamiaj tylko w oknie głównym — w iframe skrypt by się dublował i wysyłał tę samą sesję 2× (pagehide w obu kontekstach).
    if (window !== window.top) return;

    // ================================================================
    //  CONFIG — zmień BACKEND_URL i API_KEY po rejestracji na stronie
    // ================================================================
    const CONFIG = {
        // 🔑 Twój API key — dostaniesz go po rejestracji na stronie
        API_KEY: GM_getValue('api_key', ''),

        // 🌐 Adres backendu (Railway) — możesz zmienić w ustawieniach ⏱
        BACKEND_URL: GM_getValue('backend_url', 'https://peakyblinders-production-61db.up.railway.app'),

        // 🗺️ Mapy tytanów (nazwa mapy z gry → tytan). Timer nalicza czas gdy jesteś na którejś z nich.
        TARGETS: [
            { map: "Caerbannog's Grotto - 2nd Chamber", monster: 'Kic' },
            { map: 'Shimmering Cavern', monster: 'Orla' },
            { map: "Bandits' Hideout - Vault", monster: 'Renegat' },
            { map: 'Politraka Volcano - Infernal Abyss', monster: 'Arcy' },
            { map: 'Chamber of Bloody Rites', monster: 'Przyzywacz' },
            { map: 'Hall of Ruined Temple', monster: 'Barbatos' },
            { map: 'Ice Throne Room', monster: 'Tanroth' },
        ],

        CHECK_INTERVAL: 1000,
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
    let kolejkiWrap = null;
    let kolejkiListPanel = null;
    let kolejkiListContent = null;
    let kolejkiMenuPanel = null;
    let kolejkiOpen = false;
    let kolejkiMenuOpen = false;
    let sessionFinalized = false;
    let reservationsCache = { monster: null, data: null, ts: 0 };
    let phaseLeaderboardCache = { monster: null, data: null, ts: 0 };
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
    let lastHerosNotifiedMapName = null;
    // Heros eventowy: listy map per EVE
    const EVE_MAPS = {
        63: [
            'Dripping Honey Mine - 1st Level - 1st Chamber',
            'Dripping Honey Mine - 2nd Level - 1st Chamber',
            'Dripping Honey Mine - 3rd Level',
            'Dripping Honey Mine - 2nd Level - 2nd Chamber',
            'Dripping Honey Mine - Vestibule',
        ],
        143: [
            "Vorundriel's Forge - 1st Level",
            "Vorundriel's Forge - 2nd Level",
            "Vorundriel's Forge - 3rd Level",
        ],
        300: [
            'Shaiharrud Desert - East',
        ],
    };
    let eveWindowOpen = false;
    let eveWindowEl = null;
    let eveMapListPanel = null;
    let selectedEveKey = null;
    let eveMapPopupEl = null;
    let eveMapPopupCurrentMap = null;
    // Heros → Discord: webhook (kanał herosi), panel z przyciskiem „Zawołaj klan”
    const DISCORD_WEBHOOK_HEROS = 'https://discord.com/api/webhooks/1473433710220148816/FWedosu8fOskXb7Dy1C2AUiJ99lSi75LD4JkjfbrYcizdE7vbD97MQK-Gwc9UPf0JBhC';
    let heroAlertPanelEl = null;
    let lastHeroAlertData = null;
    let heroAlertSending = false;

    function refreshConfigFromStorage() {
        CONFIG.API_KEY = GM_getValue('api_key', '');
        const url = GM_getValue('backend_url', '');
        if (url) CONFIG.BACKEND_URL = url.replace(/\/$/, '');
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

    /** Lista NPCów na mapie (potwory, herosy itd.). Zwraca tablicę { id, wt, nick, tpl }. wt = widget type (Lootlog: >79 = Heros, >89 = Kolos, >99 = Tytan). */
    function getNpcsOnMap() {
        const engine = getEngine();
        if (!engine) return [];
        try {
            if (typeof engine.npcs !== 'undefined' && typeof engine.npcs.getDrawableList === 'function') {
                const list = engine.npcs.getDrawableList();
                if (!Array.isArray(list)) return [];
                const tplManager = engine.npcTplManager && typeof engine.npcTplManager.getNpcTpl === 'function' ? engine.npcTplManager : null;
                return list.map(function (npc) {
                    const d = npc && npc.d != null ? npc.d : npc;
                    if (!d) return null;
                    var wt = d.wt != null ? Number(d.wt) : undefined;
                    if (wt == null && d.tpl != null && tplManager) {
                        var tpl = tplManager.getNpcTpl(d.tpl);
                        wt = tpl && tpl.wt != null ? Number(tpl.wt) : undefined;
                    }
                    return { id: d.id, wt: wt, nick: d.nick, tpl: d.tpl, lvl: d.lvl != null ? Number(d.lvl) : undefined, x: d.x != null ? Number(d.x) : undefined, y: d.y != null ? Number(d.y) : undefined };
                }).filter(Boolean);
            }
            if (typeof window.g !== 'undefined' && window.g && window.g.npc) {
                const arr = Object.values(window.g.npc);
                return arr.map(function (d) {
                    if (!d) return null;
                    const wt = d.wt != null ? Number(d.wt) : undefined;
                    return { id: d.id, wt: wt, nick: d.nick, tpl: d.tpl, lvl: d.lvl != null ? Number(d.lvl) : undefined, x: d.x != null ? Number(d.x) : undefined, y: d.y != null ? Number(d.y) : undefined };
                }).filter(Boolean);
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

    /** Jedno powiadomienie na mapę — reset przy wyjściu z mapy lub odświeżeniu. Pokazuje panel z przyciskami Zawołaj klan / Zamknij. */
    function checkHerosOnMapAndNotify() {
        const mapName = getCurrentMapName();
        if (lastHerosNotifiedMapName !== null && lastHerosNotifiedMapName !== mapName) {
            lastHerosNotifiedMapName = null;
            hideHeroAlertPanel();
        }
        if (!mapName) return;
        const npcs = getNpcsOnMap();
        const heroNpc = npcs.find(function (n) { return isHeroOrTitan(n.wt); });
        if (!heroNpc) return;
        if (lastHerosNotifiedMapName === mapName) return;
        lastHerosNotifiedMapName = mapName;
        const name = (heroNpc.nick && String(heroNpc.nick).trim()) || (heroNpc.wt >= TITAN_WT_MIN ? 'Tytan' : 'Heros');
        lastHeroAlertData = {
            nick: name,
            lvl: heroNpc.lvl,
            x: heroNpc.x,
            y: heroNpc.y,
            mapName: mapName,
        };
        showHeroAlertPanel();
        log('Heros/Tytan na mapie:', name, '(wt:', heroNpc.wt + ')');
    }

    function showHeroAlertPanel() {
        if (!lastHeroAlertData) return;
        if (!heroAlertPanelEl) {
            heroAlertPanelEl = document.createElement('div');
            heroAlertPanelEl.id = 'map-timer-hero-alert';
            heroAlertPanelEl.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:100010;background:#1a1a2e;border:2px solid #e67e22;border-radius:12px;padding:14px 18px;box-shadow:0 8px 24px rgba(0,0,0,0.5);font-family:Arial,sans-serif;min-width:260px;';
            heroAlertPanelEl.innerHTML =
                '<div style="color:#fff;font-weight:bold;font-size:14px;margin-bottom:8px;">🦸 Heros na mapie!</div>' +
                '<div class="map-timer-hero-alert-info" style="color:#b8c5d6;font-size:12px;margin-bottom:12px;"></div>' +
                '<div style="display:flex;gap:8px;justify-content:center;">' +
                '<button type="button" class="map-timer-hero-alert-call" style="padding:8px 14px;background:#27ae60;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:bold;">Zawołaj klan</button>' +
                '<button type="button" class="map-timer-hero-alert-close" style="padding:8px 14px;background:#34495e;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;">Zamknij</button>' +
                '</div>';
            document.body.appendChild(heroAlertPanelEl);
            heroAlertPanelEl.querySelector('.map-timer-hero-alert-call').addEventListener('click', sendHeroAlertToDiscord);
            heroAlertPanelEl.querySelector('.map-timer-hero-alert-close').addEventListener('click', hideHeroAlertPanel);
        }
        var info = heroAlertPanelEl.querySelector('.map-timer-hero-alert-info');
        var lvlStr = lastHeroAlertData.lvl != null ? lastHeroAlertData.lvl + 'm' : '?';
        var posStr = (lastHeroAlertData.x != null && lastHeroAlertData.y != null) ? (lastHeroAlertData.x + ',' + lastHeroAlertData.y) : '?';
        info.textContent = lastHeroAlertData.nick + ' (' + lvlStr + '), ' + lastHeroAlertData.mapName + ' (' + posStr + ')';
        heroAlertPanelEl.style.display = 'block';
    }

    function hideHeroAlertPanel() {
        if (heroAlertPanelEl) heroAlertPanelEl.style.display = 'none';
    }

    function sendHeroAlertToDiscord() {
        if (!lastHeroAlertData) return;
        var lvlStr = lastHeroAlertData.lvl != null ? lastHeroAlertData.lvl + 'm' : '?';
        var posStr = (lastHeroAlertData.x != null && lastHeroAlertData.y != null) ? (lastHeroAlertData.x + ',' + lastHeroAlertData.y) : '?';
        if (heroAlertSending) return;
        heroAlertSending = true;
        var btn = heroAlertPanelEl && heroAlertPanelEl.querySelector('.map-timer-hero-alert-call');
        if (btn) { btn.disabled = true; btn.textContent = 'Wysyłam…'; }
        var content = '@Mulher Hero! ' + lastHeroAlertData.nick + ' (' + lvlStr + '), ' + lastHeroAlertData.mapName + ' (' + posStr + ')';
        fetch(DISCORD_WEBHOOK_HEROS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: content }),
        }).then(function (r) {
            heroAlertSending = false;
            if (btn) { btn.disabled = false; btn.textContent = 'Zawołaj klan'; }
            if (r.ok) {
                showToast('✅ Wysłano na Discord (herosi)');
                hideHeroAlertPanel();
            } else {
                showToast('❌ Błąd wysyłania na Discord: ' + r.status, 'error');
            }
        }).catch(function (e) {
            heroAlertSending = false;
            if (btn) { btn.disabled = false; btn.textContent = 'Zawołaj klan'; }
            log('Discord webhook error:', e);
            showToast('❌ Błąd połączenia z Discord', 'error');
        });
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
        if (seconds < CONFIG.MIN_TIME_TO_SEND) {
            log(`Czas ${seconds}s < ${CONFIG.MIN_TIME_TO_SEND}s, pomijam (${reason})`);
            return;
        }

        if (!CONFIG.API_KEY) {
            log('⚠️ Brak API key! Zainstaluj skrypt ze strony (link z tokenem) — wtedy key będzie ustawiony automatycznie.');
            showToast('⚠️ Brak API key — nie zapisuję sesji.', 'error');
            return;
        }

        const payload = {
            time: seconds,
            monster: monster,
            map: map,
            hero: heroName || 'Unknown',
            world: worldName || 'Unknown',
            reason: reason,
            timestamp: new Date().toISOString(),
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
                    // Kolejkuj tylko na błędy tymczasowe (sieć/5xx/timeout/limit),
                    // nie na permanentne (np. brak aktywnej fazy).
                    if (r.status >= 500 || r.status === 408 || r.status === 429) saveLocally(payload);
                });
            }).catch(function (e) {
                log('❌ fetch (unload):', e);
                saveLocally(payload);
            });
            return;
        }

        log(retryCount > 0 ? '📤 Ponowna próba #' + retryCount : '📤 Wysyłam POST (sprawdź zakładkę Network):', url);

        var controller = null;
        try { controller = new window.AbortController(); } catch (e) { controller = { signal: {}, abort: function () {} }; }
        var timeoutId = setTimeout(function () { if (controller.abort) controller.abort(); }, 60000);

        fetch(url, {
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
                    // Nie kolejkuj permanentnych błędów klucza.
                } else if (res.status === 409) {
                    // Np. brak aktywnej fazy — nie kolejkuj.
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
                setTimeout(function () { sendToBackend(seconds, monster, map, reason, false, retryCount + 1); }, delay);
                return;
            }
            onFail('Błąd sieci / timeout.');
        });
    }

    function saveLocally(payload) {
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
            if (pending.length === 0) return;

            log(`📤 Wysyłam ${pending.length} zaległych sesji...`);

            const toSend = [...pending];
            localStorage.setItem('maptimer_pending', '[]');

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

        const info = getHeroInfo();
        heroName = info?.name;
        worldName = info?.world;
        heroOutfitUrl = info?.outfitUrl ?? null;

        log(`✅ Na mapie: "${target.map}" — tracking ${target.monster} jako ${heroName}${heroOutfitUrl ? ' (outfit: ' + heroOutfitUrl + ')' : ''}`);
    }

    function finalizeSession(reason, useUnloadSend = false) {
        if (!currentTarget || !sessionStartTime) return;
        if (sessionFinalized) return;
        sessionFinalized = true;

        accumulatedSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
        log(`⏹ Finalize po ${accumulatedSeconds}s (${reason})`);
        sendToBackend(accumulatedSeconds, currentTarget.monster, currentTarget.map, reason, useUnloadSend);

        currentTarget = null;
        sessionStartTime = null;
        accumulatedSeconds = 0;
    }

    let lastLoggedMapName = null;
    function tick() {
        refreshConfigFromStorage();
        const mapName = getCurrentMapName();
        const target = mapName ? findTarget(mapName) : null;

        if (mapName && !target && mapName !== lastLoggedMapName) {
            log('⚠️ Wykryta mapa nie jest w TARGETS:', JSON.stringify(mapName), '— dodaj ją do listy w skrypcie');
            lastLoggedMapName = mapName;
        }
        if (!mapName) lastLoggedMapName = null;

        if (target) {
            if (!currentTarget) {
                onEnteredTargetMap(target);
            }
            if (sessionStartTime) {
                accumulatedSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
            }
            updateTimerUI();
        }
        checkHerosOnMapAndNotify();
        if (!target) {
            if (currentTarget) {
                finalizeSession('map_change');
            }
            hideTimerUI();
        }
        if (kolejkiListContent) updateKolejkiListUI();
        if (eveMapListPanel && selectedEveKey != null && eveMapListPanel.style.display !== 'none') updateEveMapList();
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

    function updateTimerUI() {
        if (!uiElement) createTimerUI();
        uiElement.style.display = 'block';
        const statusDot = CONFIG.API_KEY ? '🟢' : '🔴';
        uiElement.textContent = `${statusDot} ⏱ ${currentTarget?.monster} — ${formatTime(accumulatedSeconds)}`;
    }

    function hideTimerUI() {
        if (uiElement) uiElement.style.display = 'none';
    }

    // ================================================================
    //  UI — Kolejki: ikonka (przesuwalna), klik = lista graczy; rezerwacje na mapie Kic
    // ================================================================
    function getStoredKolejkiPos() {
        try {
            if (typeof GM_getValue === 'function') {
                const v = GM_getValue('kolejki_pos', null);
                if (v && typeof v.left === 'number' && typeof v.top === 'number') return v;
            }
        } catch (e) { /* ignore */ }
        return { left: Math.max(0, (document.documentElement.clientWidth || 400) - 220), top: Math.max(0, (document.documentElement.clientHeight || 300) - 320) };
    }

    function setStoredKolejkiPos(left, top) {
        try {
            if (typeof GM_setValue === 'function') GM_setValue('kolejki_pos', { left: left, top: top });
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
                        updateKolejkiListUI();
                    } else if (action === 'heros') {
                        openEveWindow();
                    }
                });
            });
        }
        const closeBtn = kolejkiWrap.querySelector('.map-timer-kolejki-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function () {
                kolejkiOpen = false;
                kolejkiListPanel.style.display = 'none';
            });
        }
        document.addEventListener('mousemove', function (e) {
            if (currentPngPopup && currentPngPopupImg && e.target !== currentPngPopupImg && !(currentPngPopupImg.contains && currentPngPopupImg.contains(e.target))) {
                hidePngPopup();
            }
        });
        document.addEventListener('mouseleave', function () { hidePngPopup(); });
        updateKolejkiListUI();
    }

    function updateKolejkiListUI() {
        if (!kolejkiListContent) return;
        const players = getPlayersOnMap();
        const target = findTarget(getCurrentMapName());
        const reservations = (target && target.monster) ? fetchReservationsForMonster(target.monster) : [];
        const byNick = {};
        reservations.forEach(function (r) {
            const n = (r.nick || '').trim().toLowerCase();
            if (n) byNick[n] = r;
        });
        const timeByNick = (target && target.monster) ? fetchPhaseLeaderboard(target.monster) : {};
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
        { key: 63, label: 'EVE 63 - Nazwa herosa' },
        { key: 143, label: 'EVE 143 - Nazwa herosa' },
        { key: 300, label: 'EVE 300 - Nazwa herosa' },
    ];

    function createEveWindow() {
        if (eveWindowEl) return eveWindowEl;
        eveWindowEl = document.createElement('div');
        eveWindowEl.id = 'map-timer-eve-window';
        eveWindowEl.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:100003;min-width:280px;max-width:360px;background:#1a1a2e;border:1px solid #2a2a4a;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.5);font-family:Arial,sans-serif;overflow:hidden;';
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

    function showEveMapListPanel(eveKey) {
        if (eveMapListPanel) {
            eveMapListPanel.style.display = 'block';
            eveMapListPanel.querySelector('.map-timer-eve-list-title').textContent = 'Mapy (EVE ' + eveKey + ')';
            selectedEveKey = eveKey;
            updateEveMapList();
            return;
        }
        eveMapListPanel = document.createElement('div');
        eveMapListPanel.id = 'map-timer-eve-list-panel';
        eveMapListPanel.style.cssText = 'position:fixed;z-index:100004;min-width:260px;max-width:320px;background:#1a1a2e;border:1px solid #2a2a4a;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.5);font-family:Arial,sans-serif;overflow:hidden;';
        var offLeft = (document.documentElement.clientWidth || 800) - 320;
        var offTop = Math.max(80, ((document.documentElement.clientHeight || 600) - 280) / 2);
        eveMapListPanel.style.left = offLeft + 'px';
        eveMapListPanel.style.top = offTop + 'px';
        eveMapListPanel.innerHTML =
            '<div class="map-timer-eve-list-panel-title" style="background:#16213e;padding:10px 36px 10px 12px;font-weight:bold;font-size:14px;border-bottom:1px solid #2a2a4a;color:#fff;cursor:move;user-select:none;">Mapy</div>' +
            '<div class="map-timer-eve-list-title" style="font-size:12px;color:#8892b0;padding:8px 12px 0;"></div>' +
            '<div class="map-timer-eve-list" style="padding:8px 12px 12px;max-height:220px;overflow-y:auto;"></div>' +
            '<button type="button" class="map-timer-eve-list-close" style="position:absolute;top:8px;right:8px;background:none;border:none;color:#8892b0;cursor:pointer;font-size:18px;padding:0 4px;">✕</button>';
        document.body.appendChild(eveMapListPanel);

        var listTitleBar = eveMapListPanel.querySelector('.map-timer-eve-list-panel-title');
        var listDrag = { active: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 };
        listTitleBar.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            listDrag.active = true;
            listDrag.startX = e.clientX;
            listDrag.startY = e.clientY;
            var rect = eveMapListPanel.getBoundingClientRect();
            listDrag.startLeft = rect.left;
            listDrag.startTop = rect.top;
            e.preventDefault();
        });
        document.addEventListener('mousemove', function (e) {
            if (!listDrag.active) return;
            eveMapListPanel.style.left = (listDrag.startLeft + (e.clientX - listDrag.startX)) + 'px';
            eveMapListPanel.style.top = (listDrag.startTop + (e.clientY - listDrag.startY)) + 'px';
        });
        document.addEventListener('mouseup', function (e) {
            if (e.button !== 0) return;
            listDrag.active = false;
        });

        eveMapListPanel.querySelector('.map-timer-eve-list-close').addEventListener('click', function () {
            eveMapListPanel.style.display = 'none';
        });

        eveMapListPanel.querySelector('.map-timer-eve-list-title').textContent = 'Mapy (EVE ' + eveKey + ')';
        updateEveMapList();
    }

    function ensureEveMapPopup() {
        if (eveMapPopupEl) return eveMapPopupEl;
        eveMapPopupEl = document.createElement('div');
        eveMapPopupEl.id = 'map-timer-eve-map-popup';
        eveMapPopupEl.style.cssText = 'position:fixed;z-index:100005;min-width:220px;max-width:360px;background:#1a1a2e;border:1px solid #2a2a4a;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.5);font-family:Arial,sans-serif;overflow:hidden;display:none;';
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

    function updateEveMapList() {
        if (!eveMapListPanel || selectedEveKey == null) return;
        var listEl = eveMapListPanel.querySelector('.map-timer-eve-list');
        if (!listEl) return;
        var maps = EVE_MAPS[selectedEveKey] || [];
        var currentMap = getCurrentMapName() || '';
        var myNick = heroName || 'Ty';

        listEl.innerHTML = '';
        if (maps.length === 0) {
            listEl.innerHTML = '<div style="color:#8892b0;font-size:12px;padding:8px 0;">Brak map (lista do uzupełnienia w skrypcie).</div>';
            return;
        }
        maps.forEach(function (mapName) {
            var isCurrent = (String(mapName).trim().toLowerCase() === currentMap.trim().toLowerCase());
            var nick = isCurrent ? myNick : '—';
            var rowColor = isCurrent ? '#2ecc71' : '#e74c3c';
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.06);font-size:12px;cursor:pointer;';
            row.innerHTML = '<span style="color:' + rowColor + ';">' + escapeHtml(mapName) + '</span><span style="color:' + rowColor + ';">' + escapeHtml(nick) + '</span>';
            row.addEventListener('click', function () { toggleEveMapPopup(mapName); });
            listEl.appendChild(row);
        });
    }

    function openEveWindow() {
        createEveWindow();
        eveWindowOpen = true;
        eveWindowEl.style.display = 'block';
        selectedEveKey = null;
        if (eveMapListPanel) eveMapListPanel.style.display = 'none';
    }

    // ================================================================
    //  UI — Toast notifications
    // ================================================================
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        const bg = type === 'error' ? '#e74c3c' : '#27ae60';
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
        }, 3000);
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
        log(`   API Key: ${CONFIG.API_KEY ? '✅ ustawiony' : '❌ BRAK — zainstaluj skrypt ze strony (link z tokenem)'}`);

        const waitForEngine = setInterval(function () {
            if (getEngine()) {
                clearInterval(waitForEngine);
                log('Engine znaleziony ✅');
                createKolejkiBox();
                flushPending();
                setInterval(tick, CONFIG.CHECK_INTERVAL);
                tick();
            }
        }, 500);

        setTimeout(() => {
            if (!getEngine()) {
                clearInterval(waitForEngine);
                log('⚠️ Engine nie znaleziony po 30s');
            }
        }, 30000);
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
