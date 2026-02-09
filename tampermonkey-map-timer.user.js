// ==UserScript==
// @name         Margonem Map Timer
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Tracks time spent on target maps and syncs with backend. Supports API key auth for multi-user leaderboards.
// @author       Lucek
// @match        https://*.margonem.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      *
// ==/UserScript==

(function () {
    'use strict';

    // ================================================================
    //  CONFIG — zmień BACKEND_URL i API_KEY po rejestracji na stronie
    // ================================================================
    const CONFIG = {
        // 🔑 Twój API key — dostaniesz go po rejestracji na stronie
        API_KEY: GM_getValue('api_key', ''),

        // 🌐 Adres backendu — zmień na swój po deployu na Railway
        BACKEND_URL: GM_getValue('backend_url', 'https://your-app.up.railway.app'),

        // 🗺️ Mapy do trackowania (nazwa dokładnie jak w grze)
        TARGETS: [
            { map: "Caerbannog's Grotto - 2nd Chamber", monster: 'Kic' },
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
    let uiElement = null;
    let settingsOpen = false;

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

    function getHeroInfo() {
        const engine = getEngine();
        if (!engine?.hero) return null;
        return {
            name: engine.hero.d?.nick || engine.hero.nick || engine.hero.name || 'Unknown',
            world: engine.map?.d?.mainid || engine.hero.d?.world || engine.hero.world || 'Unknown',
        };
    }

    function findTarget(mapName) {
        if (!mapName) return null;
        const normalized = mapName.trim();
        // Dokładne dopasowanie
        let target = CONFIG.TARGETS.find(t => t.map === normalized) || null;
        // Fallback: zawiera fragment (np. "2nd Chamber") — gra może zwracać inną pisownię
        if (!target && normalized.includes('2nd Chamber')) {
            target = CONFIG.TARGETS.find(t => t.map.includes('2nd Chamber')) || null;
        }
        return target;
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
    function sendToBackend(seconds, monster, map, reason, useBeacon = false) {
        refreshConfigFromStorage();
        if (seconds < CONFIG.MIN_TIME_TO_SEND) {
            log(`Czas ${seconds}s < ${CONFIG.MIN_TIME_TO_SEND}s, pomijam (${reason})`);
            return;
        }

        if (!CONFIG.API_KEY) {
            log('⚠️ Brak API key! Otwórz ustawienia (kliknij ikonę ⚙️) i wklej swój klucz.');
            saveLocally({ time: seconds, monster, map, hero: heroName, world: worldName, reason, timestamp: new Date().toISOString() });
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

        // sendBeacon — przy zamykaniu/przeładowaniu strony przeglądarka może przerwać zwykłe XHR; beacon ma wyższą szansę dotarcia
        if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
            const beaconPayload = { ...payload, apiKey: CONFIG.API_KEY };
            const url = `${CONFIG.BACKEND_URL}/api/timer/session`;
            const sent = navigator.sendBeacon(url, new Blob([JSON.stringify(beaconPayload)], { type: 'application/json' }));
            log(sent ? '📤 Wysłano (beacon) przy wyjściu' : '📤 Beacon niedostępny, zapisuję lokalnie');
            if (!sent) saveLocally(payload);
            return;
        }

        log('📤 Wysyłam:', payload);

        GM_xmlhttpRequest({
            url: `${CONFIG.BACKEND_URL}/api/timer/session`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': CONFIG.API_KEY,
            },
            data: JSON.stringify(payload),
            onload: (res) => {
                if (res.status >= 200 && res.status < 300) {
                    try {
                        const data = JSON.parse(res.responseText);
                        log(`✅ Zapisano! Total: ${data.totalTimeFormatted} (${data.totalSessions} sesji)`);
                        showToast(`✅ Zapisano ${formatTime(seconds)} — łącznie: ${data.totalTimeFormatted}`);
                    } catch (e) {
                        log('✅ Zapisano (nie można sparsować odpowiedzi)');
                    }
                } else if (res.status === 401) {
                    log('❌ Nieprawidłowy API key! Sprawdź ustawienia.');
                    showToast('❌ Nieprawidłowy API key!', 'error');
                    saveLocally(payload);
                } else {
                    log('❌ Błąd serwera:', res.status, res.responseText);
                    saveLocally(payload);
                }
            },
            onerror: (err) => {
                log('❌ Błąd sieci:', err);
                saveLocally(payload);
            },
            ontimeout: () => {
                log('❌ Timeout');
                saveLocally(payload);
            },
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
                            saveLocally(payload); // re-queue on failure
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

        const info = getHeroInfo();
        heroName = info?.name;
        worldName = info?.world;

        log(`✅ Na mapie: "${target.map}" — tracking ${target.monster} jako ${heroName}`);
    }

    function onLeftTargetMap(reason) {
        if (!currentTarget) return;

        if (sessionStartTime) {
            accumulatedSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
        }

        log(`❌ Opuścił mapę po ${accumulatedSeconds}s (${reason})`);
        sendToBackend(accumulatedSeconds, currentTarget.monster, currentTarget.map, reason);

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
        } else {
            if (currentTarget) {
                onLeftTargetMap('map_change');
            }
            hideTimerUI();
        }
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
    //  UI — Settings panel
    // ================================================================
    function createSettingsButton() {
        const btn = document.createElement('div');
        btn.id = 'map-timer-settings-btn';
        btn.textContent = '⏱';
        btn.title = 'Map Timer Settings';
        btn.style.cssText = `
            position: fixed; bottom: 10px; right: 10px; width: 36px; height: 36px;
            background: #2c3e50; color: #ecf0f1; border-radius: 50%; cursor: pointer;
            display: flex; align-items: center; justify-content: center; font-size: 18px;
            z-index: 99999; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            transition: background 0.2s;
        `;
        btn.addEventListener('mouseenter', () => btn.style.background = '#34495e');
        btn.addEventListener('mouseleave', () => btn.style.background = '#2c3e50');
        btn.addEventListener('click', toggleSettings);
        document.body.appendChild(btn);
    }

    function toggleSettings() {
        let panel = document.getElementById('map-timer-settings');
        if (panel) {
            panel.remove();
            settingsOpen = false;
            return;
        }
        settingsOpen = true;

        panel = document.createElement('div');
        panel.id = 'map-timer-settings';
        panel.style.cssText = `
            position: fixed; bottom: 55px; right: 10px; width: 320px;
            background: #1a1a2e; color: #eee; border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5); z-index: 99999;
            font-family: Arial, sans-serif; font-size: 13px; overflow: hidden;
        `;

        const pendingCount = JSON.parse(localStorage.getItem('maptimer_pending') || '[]').length;
        const hasKey = !!CONFIG.API_KEY;

        panel.innerHTML = `
            <div style="background:#16213e; padding:12px 16px; font-size:15px; font-weight:bold; display:flex; justify-content:space-between; align-items:center;">
                <span>⏱ Map Timer</span>
                <span style="font-size:11px; color:#888;">v2.0</span>
            </div>
            <div style="padding:16px;">
                <div style="margin-bottom:12px;">
                    <label style="display:block; margin-bottom:4px; color:#aaa; font-size:11px;">BACKEND URL</label>
                    <input id="mt-backend-url" type="text" value="${CONFIG.BACKEND_URL}"
                        placeholder="https://your-app.up.railway.app"
                        style="width:100%; padding:8px; background:#0f3460; border:1px solid #333; border-radius:6px; color:#fff; font-size:12px; box-sizing:border-box;" />
                </div>
                <div style="margin-bottom:12px;">
                    <label style="display:block; margin-bottom:4px; color:#aaa; font-size:11px;">API KEY</label>
                    <input id="mt-api-key" type="text" value="${CONFIG.API_KEY}"
                        placeholder="mgt_xxxxxxxxxxxxxxxx"
                        style="width:100%; padding:8px; background:#0f3460; border:1px solid #333; border-radius:6px; color:#fff; font-size:12px; box-sizing:border-box; font-family:monospace;" />
                </div>
                <div style="display:flex; gap:8px; margin-bottom:16px;">
                    <button id="mt-save" style="flex:1; padding:8px; background:#27ae60; color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:12px;">💾 Zapisz</button>
                    <button id="mt-flush" style="flex:1; padding:8px; background:#e67e22; color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:12px;">📤 Wyślij zaległe (${pendingCount})</button>
                </div>
                <div style="background:#0a0a1a; border-radius:6px; padding:10px; font-size:11px; color:#888;">
                    <div>Status: ${hasKey ? '<span style="color:#2ecc71;">✅ Skonfigurowany</span>' : '<span style="color:#e74c3c;">❌ Brak API key</span>'}</div>
                    <div>Mapa: ${currentTarget ? `<span style="color:#2ecc71;">${currentTarget.monster}</span>` : '<span style="color:#888;">nie na mapie</span>'}</div>
                    <div>Czas sesji: ${currentTarget ? formatTime(accumulatedSeconds) : '—'}</div>
                    <div>Postać: ${heroName || '—'}</div>
                    <div>Zaległe: ${pendingCount}</div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // Event listeners
        document.getElementById('mt-save').addEventListener('click', () => {
            const newUrl = document.getElementById('mt-backend-url').value.trim().replace(/\/$/, '');
            const newKey = document.getElementById('mt-api-key').value.trim();

            CONFIG.BACKEND_URL = newUrl;
            CONFIG.API_KEY = newKey;

            GM_setValue('backend_url', newUrl);
            GM_setValue('api_key', newKey);

            showToast('✅ Ustawienia zapisane!');
            panel.remove();
            settingsOpen = false;
        });

        document.getElementById('mt-flush').addEventListener('click', () => {
            flushPending();
            showToast('📤 Wysyłam zaległe sesje...');
            panel.remove();
            settingsOpen = false;
        });
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
    window.addEventListener('beforeunload', () => {
        if (currentTarget && sessionStartTime) {
            const seconds = Math.floor((Date.now() - sessionStartTime) / 1000);
            if (seconds >= CONFIG.MIN_TIME_TO_SEND) {
                // sendBeacon ma większą szansę dotarcia przy zamykaniu karty (zwykły XHR bywa przerywany)
                sendToBackend(seconds, currentTarget.monster, currentTarget.map, 'tab_close', true);
            }
        }
    });

    window.addEventListener('pagehide', () => {
        if (currentTarget && sessionStartTime) {
            const seconds = Math.floor((Date.now() - sessionStartTime) / 1000);
            if (seconds >= CONFIG.MIN_TIME_TO_SEND) {
                sendToBackend(seconds, currentTarget.monster, currentTarget.map, 'pagehide', true);
            }
        }
    });

    // ================================================================
    //  INIT
    // ================================================================
    function init() {
        refreshConfigFromStorage();
        log('🚀 Map Timer — inicjalizacja');
        log(`   Mapy: ${CONFIG.TARGETS.map(t => t.map).join(' | ')}`);
        log(`   BACKEND_URL: ${CONFIG.BACKEND_URL || '(pusty — ustaw w ⚙️)'}`);
        log(`   API Key: ${CONFIG.API_KEY ? '✅ ustawiony' : '❌ BRAK — kliknij ⏱ w rogu i wklej klucz, potem Zapisz'}`);

        createSettingsButton();

        const waitForEngine = setInterval(() => {
            if (getEngine()) {
                clearInterval(waitForEngine);
                log('Engine znaleziony ✅');

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
        forceFlush: () => onLeftTargetMap('manual_flush'),
        flushPending,
        addTarget: (map, monster) => { CONFIG.TARGETS.push({ map, monster }); log(`Added target: ${monster} on ${map}`); },
    };
})();
