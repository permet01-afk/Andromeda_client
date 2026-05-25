(function() {
    "use strict";
    const _url = relativePath => new URL(relativePath, document.baseURI).toString();
    const SFX_URL = (soundbank, resKey) => _url(`audio/sounds/${soundbank}/${resKey}.mp3`);
    const MUSIC_URL = resKey => _url(`audio/music/${resKey}/track.mp3`);
    const CUSTOM_AUDIO_SETTINGS_STORAGE_KEY = "andromeda_custom_audio_settings_v1";
    const DEFAULT_CUSTOM_AUDIO_SETTINGS = Object.freeze({
        musicVolumePercent: 100,
        sfxVolumePercent: 100
    });
    const AudioManager = {
        soundRadius: 800,
        sndCnt: 0,
        lastTrack: "-1",
        soundPatterns: [],
        musicPatterns: [],
        laserSoundByClassType: {},
        rocketSoundById: {},
        pyroSoundByClassId: {},
        _ctx: null,
        _masterGain: null,
        _sfxBus: null,
        _musicBus: null,
        _customVolumePrefsHydrated: false,
        _musicVolumeScalar: 1,
        _sfxVolumeScalar: 1,
        _buffers: new Map,
        _processedBuffers: new Map,
        _failedUrls: new Set,
        _audioAssetManifestHydrated: false,
        _availableSfxKeys: null,
        _availableMusicKeys: null,
        _unlocked: false,
        _unlockHookInstalled: false,
        _musicChannel: null,
        _currentMusicTypeId: null,
        _pendingMusicTypeId: null,
        _heroEngineMoving: false,
        _heroEngineChannel: null,
        _heroEngineStartToken: 0,
        _heroEngineLastAttemptAt: 0,
        _heroEngineStarting: false,
        _soundAttemptCount: {},
        _pendingSfx: [],
        _pendingSfxLoops: {},
        _pendingSfxMax: 25,
        _patternsReady: false,
        _pendingSfxBeforePatterns: [],
        _debug: {
            enabled: false,
            stacks: false,
            maxEvents: 200
        },
        _recentEvents: [],
        _preloadedResourceKeys: [],
        _criticalBootAudioEntries: null,
        _criticalBootAudioPromise: null,
        _criticalBootAudioStatus: {
            state: "idle",
            ready: false,
            total: 0,
            completed: 0,
            loaded: 0,
            failed: 0,
            pending: 0,
            failures: [],
            reason: "",
            startedAt: 0,
            finishedAt: 0
        },
        _bootRuntimeWarmupIds: [4, 5, 6, 14, 20, 21, 24, 25, 29, 30, 31, 33, 37, 43, 75, 78, 80, 81, 82],
        _bootRuntimeWarmupPromise: null,
        _bootRuntimeWarmupStatus: {
            state: "idle",
            ready: false,
            total: 0,
            completed: 0,
            failed: 0,
            failures: [],
            reason: "",
            startedAt: 0,
            finishedAt: 0
        },
        _areServerAudioSettingsReady() {
            try {
                return !!window.__ANDRO_AUDIO_SETTINGS_READY;
            } catch (_) {}
            return false;
        },
        _isSfxEnabled() {
            if (!this._areServerAudioSettingsReady()) return false;
            try {
                if (typeof setting_play_sfx !== "undefined") return !!setting_play_sfx;
            } catch (_) {}
            return true;
        },
        _isMusicEnabled() {
            if (!this._areServerAudioSettingsReady()) return false;
            try {
                if (typeof setting_play_music !== "undefined") return !!setting_play_music;
            } catch (_) {}
            return true;
        },
        _sanitizeVolumePercent(value, fallback = 100) {
            const base = Number.isFinite(fallback) ? fallback : 100;
            const numeric = typeof value === "number" ? value : parseFloat(value);
            if (!Number.isFinite(numeric)) return Math.max(0, Math.min(100, Math.round(base)));
            return Math.max(0, Math.min(100, Math.round(numeric)));
        },
        _readStoredCustomVolumeSettings() {
            const fallback = {
                musicVolumePercent: DEFAULT_CUSTOM_AUDIO_SETTINGS.musicVolumePercent,
                sfxVolumePercent: DEFAULT_CUSTOM_AUDIO_SETTINGS.sfxVolumePercent
            };
            try {
                const raw = localStorage.getItem(CUSTOM_AUDIO_SETTINGS_STORAGE_KEY);
                if (!raw) return fallback;
                const parsed = JSON.parse(raw);
                return {
                    musicVolumePercent: this._sanitizeVolumePercent(parsed && parsed.musicVolumePercent, fallback.musicVolumePercent),
                    sfxVolumePercent: this._sanitizeVolumePercent(parsed && parsed.sfxVolumePercent, fallback.sfxVolumePercent)
                };
            } catch (_) {
                return fallback;
            }
        },
        _persistCustomVolumeSettings(snapshot) {
            try {
                localStorage.setItem(CUSTOM_AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify({
                    musicVolumePercent: this._sanitizeVolumePercent(snapshot && snapshot.musicVolumePercent, DEFAULT_CUSTOM_AUDIO_SETTINGS.musicVolumePercent),
                    sfxVolumePercent: this._sanitizeVolumePercent(snapshot && snapshot.sfxVolumePercent, DEFAULT_CUSTOM_AUDIO_SETTINGS.sfxVolumePercent)
                }));
            } catch (_) {}
        },
        _ensureCustomVolumePrefs() {
            if (this._customVolumePrefsHydrated) {
                return this.getCustomVolumeSettings();
            }
            const stored = this._readStoredCustomVolumeSettings();
            this._musicVolumeScalar = this._sanitizeVolumePercent(stored.musicVolumePercent, DEFAULT_CUSTOM_AUDIO_SETTINGS.musicVolumePercent) / 100;
            this._sfxVolumeScalar = this._sanitizeVolumePercent(stored.sfxVolumePercent, DEFAULT_CUSTOM_AUDIO_SETTINGS.sfxVolumePercent) / 100;
            this._customVolumePrefsHydrated = true;
            const snapshot = this.getCustomVolumeSettings();
            try {
                window.__ANDRO_CUSTOM_AUDIO_SETTINGS_STORAGE_KEY = CUSTOM_AUDIO_SETTINGS_STORAGE_KEY;
                window.__ANDRO_CUSTOM_AUDIO_SETTINGS = {
                    musicVolumePercent: snapshot.musicVolumePercent,
                    sfxVolumePercent: snapshot.sfxVolumePercent
                };
            } catch (_) {}
            return snapshot;
        },
        getCustomVolumeSettings() {
            if (!this._customVolumePrefsHydrated) {
                this._ensureCustomVolumePrefs();
            }
            const musicVolumePercent = this._sanitizeVolumePercent(Math.round((Number.isFinite(this._musicVolumeScalar) ? this._musicVolumeScalar : 1) * 100), DEFAULT_CUSTOM_AUDIO_SETTINGS.musicVolumePercent);
            const sfxVolumePercent = this._sanitizeVolumePercent(Math.round((Number.isFinite(this._sfxVolumeScalar) ? this._sfxVolumeScalar : 1) * 100), DEFAULT_CUSTOM_AUDIO_SETTINGS.sfxVolumePercent);
            return {
                musicVolumePercent: musicVolumePercent,
                sfxVolumePercent: sfxVolumePercent
            };
        },
        setCustomVolumeSettings(nextSettings = {}, options = {}) {
            this._ensureCustomVolumePrefs();
            const opts = options && typeof options === "object" ? options : {};
            const nextMusic = this._sanitizeVolumePercent(nextSettings && nextSettings.musicVolumePercent, this.getCustomVolumeSettings().musicVolumePercent);
            const nextSfx = this._sanitizeVolumePercent(nextSettings && nextSettings.sfxVolumePercent, this.getCustomVolumeSettings().sfxVolumePercent);
            this._musicVolumeScalar = nextMusic / 100;
            this._sfxVolumeScalar = nextSfx / 100;
            const snapshot = this.getCustomVolumeSettings();
            try {
                window.__ANDRO_CUSTOM_AUDIO_SETTINGS_STORAGE_KEY = CUSTOM_AUDIO_SETTINGS_STORAGE_KEY;
                window.__ANDRO_CUSTOM_AUDIO_SETTINGS = {
                    musicVolumePercent: snapshot.musicVolumePercent,
                    sfxVolumePercent: snapshot.sfxVolumePercent
                };
            } catch (_) {}
            if (opts.persist !== false) {
                this._persistCustomVolumeSettings(snapshot);
            }
            if (this._ctx) {
                this._applyBusesFromSettings();
            }
            return snapshot;
        },
        _ensureContext() {
            this._ensureCustomVolumePrefs();
            if (this._ctx) return this._ctx;
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) {
                console.warn("[AudioManager] Web Audio API unavailable.");
                return null;
            }
            this._ctx = new Ctx;
            this._unlocked = this._ctx.state === "running";
            this._masterGain = this._ctx.createGain();
            this._sfxBus = this._ctx.createGain();
            this._musicBus = this._ctx.createGain();
            this._sfxBus.connect(this._masterGain);
            this._musicBus.connect(this._masterGain);
            this._masterGain.connect(this._ctx.destination);
            this._applyBusesFromSettings();
            this._installUnlockHook();
            return this._ctx;
        },
        _installUnlockHook() {
            if (this._unlockHookInstalled) return;
            this._unlockHookInstalled = true;
            const tryUnlock = () => {
                this.unlock();
                window.removeEventListener("pointerdown", tryUnlock, true);
                window.removeEventListener("keydown", tryUnlock, true);
                window.removeEventListener("touchstart", tryUnlock, true);
            };
            window.addEventListener("pointerdown", tryUnlock, true);
            window.addEventListener("keydown", tryUnlock, true);
            window.addEventListener("touchstart", tryUnlock, true);
        },
        async unlock() {
            const ctx = this._ensureContext();
            if (!ctx) return false;
            try {
                if (ctx.state === "suspended") {
                    await ctx.resume();
                }
                this._unlocked = ctx.state === "running";
                this._flushPendingSfx();
                this.onSettingsChanged();
                if (this._heroEngineMoving) {
                    try {
                        this._tryStartHeroEngine();
                    } catch (_) {}
                }
                return this._unlocked;
            } catch (e) {
                console.warn("[AudioManager] unlock() failed:", e);
                return false;
            }
        },
        _queuePendingSfx(req) {
            try {
                if (!req) return;
                const sid = String(req.soundId);
                if (!req.loop) {
                    const last = this._pendingSfx.length ? this._pendingSfx[this._pendingSfx.length - 1] : null;
                    if (last && String(last.soundId) === sid) return;
                    if (sid === "23") {
                        this._pendingSfx = this._pendingSfx.filter(r => String(r.soundId) !== "23");
                    }
                    this._pendingSfx.push(req);
                    if (this._pendingSfx.length > this._pendingSfxMax) {
                        this._pendingSfx.splice(0, this._pendingSfx.length - this._pendingSfxMax);
                    }
                    return;
                }
                this._pendingSfxLoops[sid] = req;
            } catch (_) {}
        },
        _flushPendingSfx() {
            try {
                if (!this._unlocked) return;
                const loops = this._pendingSfxLoops || {};
                this._pendingSfxLoops = {};
                for (const sid in loops) {
                    const r = loops[sid];
                    if (!r) continue;
                    this.playSoundEffect(r.soundId, r.loop, r.fadeIn, r.x, r.y, r.overrideLimit);
                }
                const list = Array.isArray(this._pendingSfx) ? this._pendingSfx.slice() : [];
                this._pendingSfx = [];
                for (const r of list) {
                    if (!r) continue;
                    this.playSoundEffect(r.soundId, r.loop, r.fadeIn, r.x, r.y, r.overrideLimit);
                }
            } catch (_) {}
        },
        onSettingsChanged() {
            const ctx = this._ensureContext();
            if (!ctx) return;
            this._applyBusesFromSettings();
            if (!this._isMusicEnabled()) {
                this.stopMusic();
            } else {
                if (this._currentMusicTypeId != null) {
                    this.loadMusic(this._currentMusicTypeId);
                } else {
                    this.loadMusic(0);
                }
            }
        },
        _applyBusesFromSettings() {
            if (!this._sfxBus || !this._musicBus || !this._ctx) return;
            this._ensureCustomVolumePrefs();
            const now = this._ctx.currentTime;
            const sfxTarget = this._isSfxEnabled() ? Math.max(0, Math.min(1, this._sfxVolumeScalar || 0)) : 0;
            const musicTarget = this._isMusicEnabled() ? Math.max(0, Math.min(1, this._musicVolumeScalar || 0)) : 0;
            const applyRamp = (audioParam, target) => {
                try {
                    audioParam.cancelScheduledValues(now);
                    audioParam.setValueAtTime(audioParam.value, now);
                    audioParam.linearRampToValueAtTime(target, now + 0.02);
                } catch (_) {
                    try {
                        audioParam.setValueAtTime(target, now);
                    } catch (__) {}
                }
            };
            applyRamp(this._sfxBus.gain, sfxTarget);
            applyRamp(this._musicBus.gain, musicTarget);
        },
        _normalizeAudioAssetKey(soundbank, resKey) {
            const bank = typeof soundbank === "string" ? soundbank.trim() : "";
            const key = typeof resKey === "string" ? resKey.trim() : "";
            return bank && key ? `${bank}/${key}` : "";
        },
        _hydrateAudioAssetManifest() {
            if (this._audioAssetManifestHydrated) return;
            this._audioAssetManifestHydrated = true;
            this._availableSfxKeys = null;
            this._availableMusicKeys = null;
            let raw = null;
            try {
                raw = window.__ANDRO_AUDIO_ASSET_MANIFEST || null;
            } catch (_) {
                raw = null;
            }
            if (!raw || typeof raw !== "object") return;
            const sfx = new Set;
            const music = new Set;
            const rawSfx = Array.isArray(raw.sfx) ? raw.sfx : [];
            const rawMusic = Array.isArray(raw.music) ? raw.music : [];
            rawSfx.forEach(entry => {
                if (typeof entry !== "string") return;
                const normalized = entry.replace(/\\/g, "/").trim().replace(/^\/+/, "");
                if (normalized) sfx.add(normalized);
            });
            rawMusic.forEach(entry => {
                if (typeof entry !== "string") return;
                const normalized = entry.replace(/\\/g, "/").trim().replace(/^\/+/, "");
                if (normalized) music.add(normalized);
            });
            this._availableSfxKeys = sfx;
            this._availableMusicKeys = music;
        },
        _isKnownAvailableSfx(soundbank, resKey) {
            this._hydrateAudioAssetManifest();
            if (!(this._availableSfxKeys instanceof Set) || this._availableSfxKeys.size === 0) return true;
            const key = this._normalizeAudioAssetKey(soundbank, resKey);
            if (!key) return true;
            return this._availableSfxKeys.has(key);
        },
        _isKnownAvailableMusic(resKey) {
            this._hydrateAudioAssetManifest();
            if (!(this._availableMusicKeys instanceof Set) || this._availableMusicKeys.size === 0) return true;
            const key = typeof resKey === "string" ? resKey.trim() : "";
            if (!key) return true;
            return this._availableMusicKeys.has(key);
        },
        _classifyAudioUrl(url) {
            this._hydrateAudioAssetManifest();
            try {
                const parsed = new URL(url, document.baseURI);
                const path = (parsed.pathname || "").replace(/\\/g, "/");
                let match = path.match(/\/audio\/sounds\/([^/]+)\/([^/]+)\.mp3$/i);
                if (match) {
                    const key = `${decodeURIComponent(match[1])}/${decodeURIComponent(match[2])}`;
                    if (!(this._availableSfxKeys instanceof Set) || this._availableSfxKeys.size === 0) {
                        return {
                            known: false,
                            available: true,
                            type: "sfx",
                            key: key
                        };
                    }
                    return {
                        known: true,
                        available: this._availableSfxKeys.has(key),
                        type: "sfx",
                        key: key
                    };
                }
                match = path.match(/\/audio\/music\/([^/]+)\/track\.mp3$/i);
                if (match) {
                    const key = decodeURIComponent(match[1]);
                    if (!(this._availableMusicKeys instanceof Set) || this._availableMusicKeys.size === 0) {
                        return {
                            known: false,
                            available: true,
                            type: "music",
                            key: key
                        };
                    }
                    return {
                        known: true,
                        available: this._availableMusicKeys.has(key),
                        type: "music",
                        key: key
                    };
                }
            } catch (_) {}
            return {
                known: false,
                available: true,
                type: "unknown",
                key: ""
            };
        },
        _cloneCriticalBootAudioStatus() {
            const status = this._criticalBootAudioStatus && typeof this._criticalBootAudioStatus === "object" ? this._criticalBootAudioStatus : {};
            return {
                state: status.state || "idle",
                ready: !!status.ready,
                total: Number.isFinite(status.total) ? status.total : 0,
                completed: Number.isFinite(status.completed) ? status.completed : 0,
                loaded: Number.isFinite(status.loaded) ? status.loaded : 0,
                failed: Number.isFinite(status.failed) ? status.failed : 0,
                pending: Number.isFinite(status.pending) ? status.pending : 0,
                failures: Array.isArray(status.failures) ? status.failures.map(item => ({
                    soundId: item && Number.isFinite(item.soundId) ? item.soundId : -1,
                    resKey: item && item.resKey != null ? String(item.resKey) : "",
                    soundbank: item && item.soundbank != null ? String(item.soundbank) : "",
                    url: item && item.url != null ? String(item.url) : "",
                    error: item && item.error != null ? String(item.error) : ""
                })) : [],
                reason: status.reason != null ? String(status.reason) : "",
                startedAt: Number.isFinite(status.startedAt) ? status.startedAt : 0,
                finishedAt: Number.isFinite(status.finishedAt) ? status.finishedAt : 0
            };
        },
        _publishCriticalBootAudioStatus() {
            const snapshot = this._cloneCriticalBootAudioStatus();
            try {
                window.__ANDRO_AUDIO_BOOT_STATUS = snapshot;
                window.__ANDRO_AUDIO_BOOT_READY = !!snapshot.ready;
                window.__ANDRO_AUDIO_BOOT_PRELOAD_PROMISE = this._criticalBootAudioPromise || null;
            } catch (_) {}
            try {
                if (typeof window.dispatchEvent === "function" && typeof CustomEvent === "function") {
                    window.dispatchEvent(new CustomEvent("andromeda:boot-audio-status", {
                        detail: snapshot
                    }));
                }
            } catch (_) {}
        },
        getCriticalBootAudioStatus() {
            return this._cloneCriticalBootAudioStatus();
        },
        _parsePreloadedResourceKeysFromGameXml(xmlDoc) {
            if (!xmlDoc || typeof xmlDoc.querySelectorAll !== "function") return [];
            const keys = new Set;
            xmlDoc.querySelectorAll("patterns > preloadedResources > resource").forEach(node => {
                const resKey = (node.getAttribute("resKey") || "").trim();
                if (resKey) keys.add(resKey);
            });
            return Array.from(keys).sort();
        },
        _buildCriticalBootAudioEntries() {
            const preloadKeys = new Set(Array.isArray(this._preloadedResourceKeys) ? this._preloadedResourceKeys : []);
            const entries = [];
            const seen = new Set;
            (this.soundPatterns || []).forEach((pat, soundId) => {
                if (!pat || !pat.resKey || !pat.soundbank) return;
                if (!preloadKeys.has(pat.soundbank) && !preloadKeys.has(pat.resKey)) return;
                if (!this._isKnownAvailableSfx(pat.soundbank, pat.resKey)) return;
                const url = SFX_URL(pat.soundbank, pat.resKey);
                const needsProcessedLoop = soundId === 4;
                const cacheKey = `${needsProcessedLoop ? "loop" : "buffer"}|${url}`;
                if (seen.has(cacheKey)) return;
                seen.add(cacheKey);
                entries.push({
                    soundId: soundId,
                    resKey: pat.resKey,
                    soundbank: pat.soundbank,
                    url: url,
                    loader: () => needsProcessedLoop ? this._loadEngine0LoopBuffer(url) : this._loadBuffer(url)
                });
            });
            entries.sort((a, b) => a.soundId - b.soundId || a.resKey.localeCompare(b.resKey) || a.soundbank.localeCompare(b.soundbank));
            this._criticalBootAudioEntries = entries;
            return entries;
        },
        async _runCriticalBootAudioTasks(entries, limit, onProgress) {
            const list = Array.isArray(entries) ? entries : [];
            const concurrency = Math.max(1, Math.min(Number.isFinite(limit) ? Math.floor(limit) : 4, list.length || 1));
            let nextIndex = 0;
            const runWorker = async () => {
                while (true) {
                    const current = nextIndex++;
                    if (current >= list.length) return;
                    const entry = list[current];
                    let outcome = "loaded";
                    let error = null;
                    try {
                        await entry.loader();
                    } catch (err) {
                        outcome = "failed";
                        error = err;
                    }
                    try {
                        if (typeof onProgress === "function") {
                            onProgress(entry, outcome, error);
                        }
                    } catch (_) {}
                }
            };
            const workers = [];
            for (let i = 0; i < concurrency; i++) {
                workers.push(runWorker());
            }
            await Promise.all(workers);
        },
        primeCriticalBootAudio(reason = "manual") {
            if (this._criticalBootAudioPromise) return this._criticalBootAudioPromise;
            if (!this._patternsReady && window._gameXmlDoc && typeof this.parseFromGameXml === "function") {
                try {
                    this.parseFromGameXml(window._gameXmlDoc);
                } catch (_) {}
                if (this._criticalBootAudioPromise) return this._criticalBootAudioPromise;
            }
            const entries = this._buildCriticalBootAudioEntries();
            if (!entries.length) {
                this._criticalBootAudioStatus = {
                    state: this._patternsReady ? "ready" : "waiting_for_patterns",
                    ready: !!this._patternsReady,
                    total: 0,
                    completed: 0,
                    loaded: 0,
                    failed: 0,
                    pending: 0,
                    failures: [],
                    reason: reason,
                    startedAt: 0,
                    finishedAt: 0
                };
                this._publishCriticalBootAudioStatus();
                return Promise.resolve(this._cloneCriticalBootAudioStatus());
            }
            const failures = [];
            let completed = 0;
            let loaded = 0;
            let failed = 0;
            const startedAt = Date.now();
            this._criticalBootAudioStatus = {
                state: "loading",
                ready: false,
                total: entries.length,
                completed: 0,
                loaded: 0,
                failed: 0,
                pending: entries.length,
                failures: [],
                reason: reason,
                startedAt: startedAt,
                finishedAt: 0
            };
            this._publishCriticalBootAudioStatus();
            const finalize = state => {
                this._criticalBootAudioStatus = {
                    state: state,
                    ready: state === "ready" || state === "ready_with_missing",
                    total: entries.length,
                    completed: completed,
                    loaded: loaded,
                    failed: failed,
                    pending: Math.max(0, entries.length - completed),
                    failures: failures.slice(),
                    reason: reason,
                    startedAt: startedAt,
                    finishedAt: Date.now()
                };
                this._publishCriticalBootAudioStatus();
                return this._cloneCriticalBootAudioStatus();
            };
            this._criticalBootAudioPromise = this._runCriticalBootAudioTasks(entries, 4, (entry, outcome, error) => {
                completed += 1;
                if (outcome === "loaded") {
                    loaded += 1;
                } else {
                    failed += 1;
                    failures.push({
                        soundId: Number.isFinite(entry && entry.soundId) ? entry.soundId : -1,
                        resKey: entry && entry.resKey ? entry.resKey : "",
                        soundbank: entry && entry.soundbank ? entry.soundbank : "",
                        url: entry && entry.url ? entry.url : "",
                        error: error && error.message ? error.message : String(error || "Unknown audio preload error")
                    });
                }
                this._criticalBootAudioStatus = {
                    state: "loading",
                    ready: false,
                    total: entries.length,
                    completed: completed,
                    loaded: loaded,
                    failed: failed,
                    pending: Math.max(0, entries.length - completed),
                    failures: failures.slice(),
                    reason: reason,
                    startedAt: startedAt,
                    finishedAt: 0
                };
                this._publishCriticalBootAudioStatus();
            }).then(() => finalize(failed > 0 ? "ready_with_missing" : "ready")).catch(err => {
                console.warn("[AudioManager] Critical boot audio preload failed:", err);
                return finalize("ready_with_missing");
            }).finally(() => {
                try {
                    window.__ANDRO_AUDIO_BOOT_PRELOAD_PROMISE = this._criticalBootAudioPromise;
                } catch (_) {}
            });
            this._publishCriticalBootAudioStatus();
            return this._criticalBootAudioPromise;
        },
        waitForCriticalBootAudio(reason = "manual") {
            return Promise.resolve(this.primeCriticalBootAudio(reason));
        },
        _loadBuffer(url) {
            const ctx = this._ensureContext();
            if (!ctx) return Promise.reject(new Error("No AudioContext"));
            if (this._failedUrls.has(url)) {
                return Promise.reject(new Error("Audio previously failed to load"));
            }
            const availability = this._classifyAudioUrl(url);
            if (availability.known && !availability.available) {
                this._failedUrls.add(url);
                return Promise.reject(new Error("Audio asset unavailable in current HTML5 pack"));
            }
            if (this._buffers.has(url)) return this._buffers.get(url);
            const p = fetch(url).then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.arrayBuffer();
            }).then(ab => ctx.decodeAudioData(ab));
            this._buffers.set(url, p);
            p.catch(e => {
                this._buffers.delete(url);
                if (!this._failedUrls.has(url)) {
                    this._failedUrls.add(url);
                    console.warn(`[AudioManager] Audio not found or unreadable: ${url}`, e);
                }
            });
            return p;
        },
        _loadEngine0LoopBuffer(url) {
            if (this._processedBuffers.has(url)) return this._processedBuffers.get(url);
            const p = this._loadBuffer(url).then(buf => {
                const ctx = this._ensureContext();
                if (!ctx || !buf) throw new Error("engine0: no ctx/buffer");
                return this._makeEngine0Loopable(ctx, buf);
            });
            this._processedBuffers.set(url, p);
            p.catch(() => {
                try {
                    this._processedBuffers.delete(url);
                } catch (_) {}
            });
            return p;
        },
        _cloneBootRuntimeWarmupStatus() {
            const status = this._bootRuntimeWarmupStatus && typeof this._bootRuntimeWarmupStatus === "object" ? this._bootRuntimeWarmupStatus : {};
            return {
                state: status.state || "idle",
                ready: !!status.ready,
                total: Number.isFinite(status.total) ? status.total : 0,
                completed: Number.isFinite(status.completed) ? status.completed : 0,
                failed: Number.isFinite(status.failed) ? status.failed : 0,
                failures: Array.isArray(status.failures) ? status.failures.map(item => ({
                    soundId: item && Number.isFinite(item.soundId) ? item.soundId : -1,
                    error: item && item.error != null ? String(item.error) : ""
                })) : [],
                reason: status.reason != null ? String(status.reason) : "",
                startedAt: Number.isFinite(status.startedAt) ? status.startedAt : 0,
                finishedAt: Number.isFinite(status.finishedAt) ? status.finishedAt : 0
            };
        },
        _publishBootRuntimeWarmupStatus() {
            const snapshot = this._cloneBootRuntimeWarmupStatus();
            try {
                window.__ANDRO_AUDIO_RUNTIME_WARMUP_STATUS = snapshot;
                window.__ANDRO_AUDIO_RUNTIME_WARMUP_READY = !!snapshot.ready;
            } catch (_) {}
            try {
                if (typeof window.dispatchEvent === "function" && typeof CustomEvent === "function") {
                    window.dispatchEvent(new CustomEvent("andromeda:audio-runtime-warmup-status", {
                        detail: snapshot
                    }));
                }
            } catch (_) {}
        },
        getBootRuntimeWarmupStatus() {
            return this._cloneBootRuntimeWarmupStatus();
        },
        _warmupSfxGraph(buffer, options = {}) {
            const ctx = this._ensureContext();
            if (!ctx || !buffer) return Promise.resolve(false);
            return new Promise(resolve => {
                let src = null;
                let panNode = null;
                let gain = null;
                let finished = false;
                const finish = result => {
                    if (finished) return;
                    finished = true;
                    try {
                        if (src) src.onended = null;
                    } catch (_) {}
                    try {
                        if (src) src.disconnect();
                    } catch (_) {}
                    try {
                        if (panNode) panNode.disconnect();
                    } catch (_) {}
                    try {
                        if (gain) gain.disconnect();
                    } catch (_) {}
                    resolve(!!result);
                };
                try {
                    src = ctx.createBufferSource();
                    src.buffer = buffer;
                    src.loop = !!options.loop;
                    if (src.loop && typeof options.loopStart === "number" && typeof options.loopEnd === "number") {
                        try {
                            if (options.loopEnd > options.loopStart && options.loopEnd <= buffer.duration) {
                                src.loopStart = options.loopStart;
                                src.loopEnd = options.loopEnd;
                            }
                        } catch (_) {}
                    }
                    panNode = typeof ctx.createStereoPanner === "function" ? ctx.createStereoPanner() : null;
                    gain = ctx.createGain();
                    gain.gain.setValueAtTime(0, ctx.currentTime);
                    if (panNode) {
                        panNode.pan.setValueAtTime(0, ctx.currentTime);
                        src.connect(panNode);
                        panNode.connect(gain);
                    } else {
                        src.connect(gain);
                    }
                    gain.connect(this._sfxBus || this._masterGain || ctx.destination);
                    const duration = Math.max(0.012, Math.min(0.04, buffer.duration || 0.02));
                    const now = ctx.currentTime + 0.001;
                    src.onended = () => finish(true);
                    src.start(now);
                    try {
                        src.stop(now + duration);
                    } catch (_) {
                        setTimeout(() => {
                            try {
                                src.stop();
                            } catch (__) {}
                        }, Math.ceil(duration * 1000));
                    }
                    setTimeout(() => finish(true), Math.ceil((duration + 0.06) * 1000));
                } catch (err) {
                    finish(false);
                }
            });
        },
        async _warmupSoundIdRuntime(soundId) {
            const sid = typeof soundId === "number" ? soundId : parseInt(soundId, 10);
            if (!Number.isFinite(sid) || sid < 0) return;
            const pat = this.soundPatterns[sid];
            if (!pat || !pat.resKey || !pat.soundbank) {
                throw new Error("missing_sound_pattern");
            }
            const url = SFX_URL(pat.soundbank, pat.resKey);
            let buffer = null;
            let loopStart = null;
            let loopEnd = null;
            if (sid === 4) {
                const prepared = await this._loadEngine0LoopBuffer(url);
                buffer = prepared && prepared.buffer ? prepared.buffer : null;
                loopStart = prepared && typeof prepared.loopStart === "number" ? prepared.loopStart : null;
                loopEnd = prepared && typeof prepared.loopEnd === "number" ? prepared.loopEnd : null;
            } else {
                buffer = await this._loadBuffer(url);
            }
            if (!buffer) {
                throw new Error("missing_audio_buffer");
            }
            const warmed = await this._warmupSfxGraph(buffer, {
                loop: sid === 4,
                loopStart: loopStart,
                loopEnd: loopEnd
            });
            if (!warmed) {
                throw new Error("runtime_graph_warmup_failed");
            }
        },
        warmCriticalBootRuntimeAudio(reason = "manual") {
            if (this._bootRuntimeWarmupPromise) return this._bootRuntimeWarmupPromise;
            if (!this._patternsReady && window._gameXmlDoc && typeof this.parseFromGameXml === "function") {
                try {
                    this.parseFromGameXml(window._gameXmlDoc);
                } catch (_) {}
            }
            const ctx = this._ensureContext();
            if (!ctx) {
                this._bootRuntimeWarmupStatus = {
                    state: "unavailable",
                    ready: false,
                    total: 0,
                    completed: 0,
                    failed: 0,
                    failures: [],
                    reason: reason,
                    startedAt: 0,
                    finishedAt: 0
                };
                this._publishBootRuntimeWarmupStatus();
                return Promise.resolve(this._cloneBootRuntimeWarmupStatus());
            }
            if (ctx.state === "running") {
                this._unlocked = true;
            }
            const ids = Array.isArray(this._bootRuntimeWarmupIds) ? this._bootRuntimeWarmupIds.filter(id => this.soundPatterns && this.soundPatterns[id]) : [];
            if (!ids.length) {
                this._bootRuntimeWarmupStatus = {
                    state: "ready",
                    ready: true,
                    total: 0,
                    completed: 0,
                    failed: 0,
                    failures: [],
                    reason: reason,
                    startedAt: 0,
                    finishedAt: 0
                };
                this._publishBootRuntimeWarmupStatus();
                return Promise.resolve(this._cloneBootRuntimeWarmupStatus());
            }
            if (!this._unlocked) {
                this._bootRuntimeWarmupStatus = {
                    state: "waiting_for_unlock",
                    ready: false,
                    total: ids.length,
                    completed: 0,
                    failed: 0,
                    failures: [],
                    reason: reason,
                    startedAt: 0,
                    finishedAt: 0
                };
                this._publishBootRuntimeWarmupStatus();
                return Promise.resolve(this._cloneBootRuntimeWarmupStatus());
            }
            const failures = [];
            let completed = 0;
            let failed = 0;
            const startedAt = Date.now();
            this._bootRuntimeWarmupStatus = {
                state: "warming",
                ready: false,
                total: ids.length,
                completed: 0,
                failed: 0,
                failures: [],
                reason: reason,
                startedAt: startedAt,
                finishedAt: 0
            };
            this._publishBootRuntimeWarmupStatus();
            this._bootRuntimeWarmupPromise = Promise.all(ids.map(soundId => this._warmupSoundIdRuntime(soundId).catch(err => {
                failed += 1;
                failures.push({
                    soundId: soundId,
                    error: err && err.message ? err.message : String(err || "Audio runtime warmup failed")
                });
            }).then(() => {
                completed += 1;
                this._bootRuntimeWarmupStatus = {
                    state: "warming",
                    ready: false,
                    total: ids.length,
                    completed: completed,
                    failed: failed,
                    failures: failures.slice(),
                    reason: reason,
                    startedAt: startedAt,
                    finishedAt: 0
                };
                this._publishBootRuntimeWarmupStatus();
            }))).then(() => {
                this._bootRuntimeWarmupStatus = {
                    state: failed > 0 ? "ready_with_missing" : "ready",
                    ready: true,
                    total: ids.length,
                    completed: completed,
                    failed: failed,
                    failures: failures.slice(),
                    reason: reason,
                    startedAt: startedAt,
                    finishedAt: Date.now()
                };
                this._publishBootRuntimeWarmupStatus();
                return this._cloneBootRuntimeWarmupStatus();
            }).catch(err => {
                this._bootRuntimeWarmupStatus = {
                    state: "ready_with_missing",
                    ready: true,
                    total: ids.length,
                    completed: completed,
                    failed: Math.max(failed, 1),
                    failures: failures.concat([{
                        soundId: -1,
                        error: err && err.message ? err.message : String(err || "Audio runtime warmup failed")
                    }]),
                    reason: reason,
                    startedAt: startedAt,
                    finishedAt: Date.now()
                };
                this._publishBootRuntimeWarmupStatus();
                return this._cloneBootRuntimeWarmupStatus();
            });
            this._publishBootRuntimeWarmupStatus();
            return this._bootRuntimeWarmupPromise;
        },
        _makeEngine0Loopable(ctx, originalBuf) {
            const sr = originalBuf.sampleRate || 48e3;
            const ch = originalBuf.numberOfChannels || 1;
            const thr = 1e-4;
            const d0 = originalBuf.getChannelData(0);
            let start = 0;
            while (start < d0.length && Math.abs(d0[start]) < thr) start++;
            let end = d0.length - 1;
            while (end > start && Math.abs(d0[end]) < thr) end--;
            const pad = Math.floor(sr * .005);
            start = Math.max(0, start - pad);
            end = Math.min(d0.length - 1, end + pad);
            const trimmedLen = Math.max(1, end - start + 1);
            const trimmed = ctx.createBuffer(ch, trimmedLen, sr);
            for (let c = 0; c < ch; c++) {
                const src = originalBuf.getChannelData(c);
                trimmed.getChannelData(c).set(src.subarray(start, end + 1));
            }
            const minLoopSeconds = 3;
            const xfMs = 20;
            let xf = Math.floor(sr * xfMs / 1e3);
            xf = Math.max(0, Math.min(xf, Math.floor(trimmedLen / 4)));
            const step = Math.max(1, trimmedLen - xf);
            const rep = Math.max(4, Math.ceil(minLoopSeconds * sr / step));
            const outLen = step * (rep - 1) + trimmedLen;
            const out = ctx.createBuffer(ch, outLen, sr);
            for (let c = 0; c < ch; c++) {
                const src = trimmed.getChannelData(c);
                const dst = out.getChannelData(c);
                dst.set(src, 0);
                for (let i = 1; i < rep; i++) {
                    const pos = i * step;
                    if (xf > 0) {
                        for (let j = 0; j < xf; j++) {
                            const a = j / xf;
                            dst[pos + j] = dst[pos + j] * (1 - a) + src[j] * a;
                        }
                        dst.set(src.subarray(xf), pos + xf);
                    } else {
                        dst.set(src, pos);
                    }
                }
            }
            const loopStartSamples = step;
            const loopEndSamples = step * (rep - 1);
            const loopStart = loopStartSamples / sr;
            const loopEnd = Math.min(out.duration, loopEndSamples / sr);
            return {
                buffer: out,
                loopStart: loopStart,
                loopEnd: loopEnd
            };
        },
        _disconnectAudioNode(node) {
            try {
                if (node && typeof node.disconnect === "function") node.disconnect();
            } catch (_) {}
        },
        _cleanupMusicChannel(channel) {
            if (!channel || channel._cleaned) return;
            channel._cleaned = true;
            channel._stopped = true;
            try {
                if (channel.source) channel.source.onended = null;
            } catch (_) {}
            this._disconnectAudioNode(channel.source);
            this._disconnectAudioNode(channel.gain);
            channel.source = null;
            channel.gain = null;
        },
        _cleanupSfxChannel(channel) {
            if (!channel || channel._cleaned) return;
            channel._cleaned = true;
            channel._stopped = true;
            if (channel._fadeOutTimer) {
                clearTimeout(channel._fadeOutTimer);
                channel._fadeOutTimer = null;
            }
            if (!channel._endedHandled) {
                channel._endedHandled = true;
                this.sndCnt = Math.max(0, this.sndCnt - 1);
            }
            try {
                if (channel.source) channel.source.onended = null;
            } catch (_) {}
            this._disconnectAudioNode(channel.source);
            this._disconnectAudioNode(channel.panNode);
            this._disconnectAudioNode(channel.gain);
            channel.source = null;
            channel.panNode = null;
            channel.gain = null;
        },
        async loadMusic(musicTypeId) {
            this._currentMusicTypeId = musicTypeId;
            if (!this._isMusicEnabled()) return;
            const pat = this.musicPatterns[musicTypeId];
            if (!pat) {
                this._pendingMusicTypeId = musicTypeId;
                console.warn("[AudioManager] musicPatterns not ready yet (id=" + musicTypeId + ") -> waiting for game.xml");
                return;
            }
            this._pendingMusicTypeId = null;
            if (this.lastTrack === pat.resKey) return;
            this._ensureContext();
            if (!this._unlocked) return;
            if (!this._isKnownAvailableMusic(pat.resKey)) return;
            const url = MUSIC_URL(pat.resKey);
            const vol = typeof pat.volume === "number" ? pat.volume : 1;
            try {
                const buffer = await this._loadBuffer(url);
                this._startMusicBuffer(buffer, vol, pat.resKey);
            } catch (_) {}
        },
        _startMusicBuffer(buffer, volume, resKey) {
            const ctx = this._ensureContext();
            if (!ctx || !buffer) return;
            if (this._musicChannel) {
                this._musicChannel.stop();
                this._musicChannel = null;
            }
            const src = ctx.createBufferSource();
            src.buffer = buffer;
            src.loop = true;
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(volume, ctx.currentTime);
            src.connect(gain);
            gain.connect(this._musicBus);
            const manager = this;
            const channel = {
                source: src,
                gain: gain,
                _stopped: false,
                _cleaned: false,
                stop: () => {
                    if (channel._cleaned) return;
                    if (!channel._stopped) {
                        channel._stopped = true;
                        try {
                            src.stop();
                        } catch (_) {}
                    }
                    manager._cleanupMusicChannel(channel);
                }
            };
            src.onended = () => manager._cleanupMusicChannel(channel);
            try {
                src.start(0);
            } catch (_) {
                manager._cleanupMusicChannel(channel);
                return;
            }
            this.lastTrack = resKey;
            this._musicChannel = channel;
        },
        stopMusic() {
            if (this._musicChannel) {
                this._musicChannel.stop();
                this._musicChannel = null;
            }
            this.lastTrack = "-1";
        },
        async playSoundEffect(soundId, loop = false, fadeIn = false, x = -1, y = -1, overrideLimit = true, __opts = null) {
            const opts = __opts && typeof __opts === "object" ? __opts : {};
            const sid = typeof soundId === "number" ? soundId : parseInt(soundId, 10);
            if (!Number.isFinite(sid) || sid < 0) return null;
            soundId = sid;
            if (!opts.__skipCount) {
                this._countSoundAttempt(soundId);
            }
            if (!this._isSfxEnabled()) {
                this._pushEvent("sfx_skip", {
                    reason: "sfx_disabled",
                    soundId: soundId
                });
                return null;
            }
            if (!overrideLimit && this.sndCnt > 10) {
                this._pushEvent("sfx_skip", {
                    reason: "limit",
                    soundId: soundId,
                    sndCnt: this.sndCnt
                });
                return null;
            }
            const pat = this.soundPatterns[soundId];
            if (!pat) {
                if (!opts.__skipQueue) {
                    this._pendingSfxBeforePatterns = Array.isArray(this._pendingSfxBeforePatterns) ? this._pendingSfxBeforePatterns : [];
                    this._pendingSfxBeforePatterns.push({
                        soundId: soundId,
                        loop: loop,
                        fadeIn: fadeIn,
                        x: x,
                        y: y,
                        overrideLimit: overrideLimit
                    });
                    if (this._pendingSfxBeforePatterns.length > 50) {
                        this._pendingSfxBeforePatterns.splice(0, this._pendingSfxBeforePatterns.length - 50);
                    }
                    this._pushEvent("sfx_queue", {
                        reason: "patterns_missing",
                        soundId: soundId
                    });
                } else {
                    this._pushEvent("sfx_skip", {
                        reason: "patterns_missing",
                        soundId: soundId
                    });
                }
                return null;
            }
            const ctx = this._ensureContext();
            if (!ctx) return null;
            if (ctx.state === "running") {
                this._unlocked = true;
            }
            if (!this._unlocked) {
                this._queuePendingSfx({
                    soundId: soundId,
                    loop: loop,
                    fadeIn: fadeIn,
                    x: x,
                    y: y,
                    overrideLimit: overrideLimit
                });
                this._pushEvent("sfx_queue", {
                    reason: "locked",
                    soundId: soundId
                });
                return null;
            }
            const url = SFX_URL(pat.soundbank, pat.resKey);
            const baseVol = typeof pat.volume === "number" ? pat.volume : 1;
            let vol = baseVol;
            let pan = 0;
            if (x !== -1 && y !== -1) {
                const hero = this._getHeroPos();
                if (hero) {
                    const dx = hero.x - x;
                    const dy = hero.y - y;
                    const dist2 = dx * dx + dy * dy;
                    if (dist2 > this.soundRadius * this.soundRadius) {
                        this._pushEvent("sfx_skip", {
                            reason: "radius",
                            soundId: soundId
                        });
                        return null;
                    }
                    const dist = Math.sqrt(dist2);
                    vol = baseVol - baseVol / this.soundRadius * dist;
                    pan = (x - hero.x) / 500;
                }
            }
            if (pan < -1) pan = -1;
            if (pan > 1) pan = 1;
            try {
                let buffer = null;
                let loopStart = null;
                let loopEnd = null;
                if (soundId === 4 && loop) {
                    const r = await this._loadEngine0LoopBuffer(url);
                    buffer = r && r.buffer ? r.buffer : null;
                    loopStart = r && typeof r.loopStart === "number" ? r.loopStart : null;
                    loopEnd = r && typeof r.loopEnd === "number" ? r.loopEnd : null;
                } else {
                    buffer = await this._loadBuffer(url);
                }
                const ch = this._startSfxBuffer(buffer, {
                    initialVolume: vol,
                    targetVolume: baseVol,
                    pan: pan,
                    loop: loop,
                    fadeIn: fadeIn,
                    loopStart: loopStart,
                    loopEnd: loopEnd,
                    soundId: soundId
                });
                this._pushEvent("sfx_play", {
                    soundId: soundId,
                    resKey: pat.resKey,
                    soundbank: pat.soundbank,
                    loop: !!loop,
                    x: x,
                    y: y
                });
                return ch;
            } catch (e) {
                this._pushEvent("sfx_error", {
                    soundId: soundId,
                    url: url
                });
                return null;
            }
        },
        _startSfxBuffer(buffer, opts) {
            const ctx = this._ensureContext();
            if (!ctx || !buffer) return null;
            const src = ctx.createBufferSource();
            src.buffer = buffer;
            src.loop = !!opts.loop;
            if (src.loop && typeof opts.loopStart === "number" && typeof opts.loopEnd === "number") {
                try {
                    if (opts.loopEnd > opts.loopStart && opts.loopEnd <= buffer.duration) {
                        src.loopStart = opts.loopStart;
                        src.loopEnd = opts.loopEnd;
                    }
                } catch (_) {}
            }
            const panNode = typeof ctx.createStereoPanner === "function" ? ctx.createStereoPanner() : null;
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(Math.max(0, opts.initialVolume || 0), ctx.currentTime);
            if (panNode) {
                panNode.pan.setValueAtTime(opts.pan || 0, ctx.currentTime);
                src.connect(panNode);
                panNode.connect(gain);
            } else {
                src.connect(gain);
            }
            gain.connect(this._sfxBus);
            this.sndCnt += 1;
            const manager = this;
            const channel = {
                source: src,
                gain: gain,
                panNode: panNode,
                _stopped: false,
                _cleaned: false,
                _endedHandled: false,
                _fadeOutTimer: null,
                stop: () => {
                    if (channel._cleaned) return;
                    if (!channel._stopped) {
                        channel._stopped = true;
                        try {
                            src.stop();
                        } catch (_) {}
                    }
                    manager._cleanupSfxChannel(channel);
                }
            };
            src.onended = () => manager._cleanupSfxChannel(channel);
            try {
                src.start(0);
            } catch (_) {
                manager._cleanupSfxChannel(channel);
                return null;
            }
            if (opts.loop && opts.fadeIn) {
                const target = Math.max(0, opts.targetVolume || 0);
                gain.gain.cancelScheduledValues(ctx.currentTime);
                gain.gain.setValueAtTime(Math.max(0, opts.initialVolume || 0), ctx.currentTime);
                gain.gain.linearRampToValueAtTime(target, ctx.currentTime + .75);
            }
            return channel;
        },
        removeLoop(channel, fadeOut = false) {
            if (!channel || !channel.source || channel._cleaned) return;
            const ctx = this._ensureContext();
            if (!ctx) return;
            if (fadeOut && channel.gain) {
                if (channel._fadeOutTimer) return;
                const g = channel.gain.gain;
                g.cancelScheduledValues(ctx.currentTime);
                g.setValueAtTime(g.value, ctx.currentTime);
                g.linearRampToValueAtTime(0, ctx.currentTime + .75);
                channel._fadeOutTimer = setTimeout(() => {
                    channel._fadeOutTimer = null;
                    this.removeLoop(channel, false);
                }, 750);
                return;
            }
            try {
                channel.stop();
            } catch (_) {
                this._cleanupSfxChannel(channel);
            }
        },
        _countSoundAttempt(soundId) {
            try {
                const k = String(soundId);
                this._soundAttemptCount[k] = (this._soundAttemptCount[k] || 0) + 1;
            } catch (_) {}
        },
        setDebug(enabledOrOpts = true) {
            const base = this._debug || {
                enabled: false,
                stacks: false,
                maxEvents: 200
            };
            const opts = enabledOrOpts && typeof enabledOrOpts === "object" ? enabledOrOpts : {
                enabled: !!enabledOrOpts
            };
            this._debug = base;
            if (typeof opts.enabled === "boolean") this._debug.enabled = opts.enabled;
            if (typeof opts.stacks === "boolean") this._debug.stacks = opts.stacks;
            if (typeof opts.maxEvents === "number" && Number.isFinite(opts.maxEvents) && opts.maxEvents > 0) {
                this._debug.maxEvents = Math.min(1e3, Math.max(10, Math.floor(opts.maxEvents)));
            }
            console.log("[AudioManager] Debug", this._debug.enabled ? "ON" : "OFF", this._debug);
        },
        _pushEvent(type, payload = {}) {
            try {
                const dbg = this._debug || {
                    enabled: false,
                    stacks: false,
                    maxEvents: 200
                };
                const evt = {
                    t: performance.now(),
                    type: type,
                    ...payload
                };
                if (dbg.stacks) {
                    try {
                        evt.stack = (new Error).stack;
                    } catch (_) {}
                }
                this._recentEvents = Array.isArray(this._recentEvents) ? this._recentEvents : [];
                this._recentEvents.push(evt);
                const max = dbg.maxEvents || 200;
                if (this._recentEvents.length > max) {
                    this._recentEvents.splice(0, this._recentEvents.length - max);
                }
                if (dbg.enabled) {
                    console.log("[AudioManager]", type, payload);
                }
            } catch (_) {}
        },
        getRecentEvents() {
            return Array.isArray(this._recentEvents) ? this._recentEvents.slice() : [];
        },
        clearRecentEvents() {
            this._recentEvents = [];
        },
        getSoundUsage() {
            const out = [];
            try {
                for (let i = 0; i < this.soundPatterns.length; i++) {
                    const pat = this.soundPatterns[i];
                    if (!pat) continue;
                    out.push({
                        id: i,
                        soundbank: pat.soundbank,
                        resKey: pat.resKey,
                        attempts: this._soundAttemptCount[String(i)] || 0
                    });
                }
            } catch (_) {}
            return out;
        },
        getUnusedSoundIds() {
            const unused = [];
            try {
                for (let i = 0; i < this.soundPatterns.length; i++) {
                    const pat = this.soundPatterns[i];
                    if (!pat) continue;
                    if ((this._soundAttemptCount[String(i)] || 0) === 0) unused.push(i);
                }
            } catch (_) {}
            return unused;
        },
        setHeroEngineMoving(moving) {
            const want = !!moving;
            if (want === this._heroEngineMoving) {
                if (want) this._tryStartHeroEngine();
                return;
            }
            this._heroEngineMoving = want;
            this._heroEngineStartToken += 1;
            if (!want) {
                if (this._heroEngineChannel) {
                    this.removeLoop(this._heroEngineChannel, true);
                    this._heroEngineChannel = null;
                }
                return;
            }
            this._tryStartHeroEngine();
        },
        _tryStartHeroEngine() {
            try {
                if (!this._heroEngineMoving) return;
                if (this._heroEngineChannel) return;
                if (this._heroEngineStarting) return;
                if (!this.soundPatterns || !this.soundPatterns[4]) return;
                const ctx = this._ensureContext();
                if (!ctx) return;
                if (ctx.state === "running") this._unlocked = true;
                if (!this._unlocked) return;
                const now = performance.now();
                if (this._heroEngineLastAttemptAt && now - this._heroEngineLastAttemptAt < 250) return;
                this._heroEngineLastAttemptAt = now;
                const token = this._heroEngineStartToken;
                this._heroEngineStarting = true;
                const p = this.playSoundEffect(4, true, true, -1, -1, true);
                if (p && typeof p.then === "function") {
                    p.then(ch => {
                        if (!ch) return;
                        if (!this._heroEngineMoving || token !== this._heroEngineStartToken) {
                            try {
                                this.removeLoop(ch, false);
                            } catch (_) {}
                            return;
                        }
                        this._heroEngineChannel = ch;
                    }).finally(() => {
                        this._heroEngineStarting = false;
                    });
                } else {
                    this._heroEngineStarting = false;
                }
            } catch (_) {
                this._heroEngineStarting = false;
            }
        },
        playLaserShot(attackerId, attackerSnap, patternId, skilledLaser, x, y) {
            const shipId = Number(attackerSnap?.shipId ?? 0);
            const npcName = String(attackerSnap?.name || "").trim();
            if (attackerSnap?.kind === "npc" && (shipId === 31 || shipId === 73 || npcName === "-=[ Mordon ]=-" || npcName === "-=[ Boss Mordon ]=-")) return;
            const isHero = typeof heroId !== "undefined" && heroId !== null && attackerId === heroId;
            const overrideLimit = isHero;
            let classId = 0;
            try {
                if (typeof shouldUseProtegitLaser === "function" && shouldUseProtegitLaser(attackerSnap)) classId = 2; else if (typeof shouldUseDevolariumLaser === "function" && shouldUseDevolariumLaser(attackerSnap)) classId = 4; else if (typeof shouldUseLordakiumLaser === "function" && shouldUseLordakiumLaser(attackerSnap)) classId = 5; else if (typeof shouldUseNettelLaser === "function" && shouldUseNettelLaser(attackerSnap)) classId = 1; else if (typeof shouldUseCrystal2Laser === "function" && shouldUseCrystal2Laser(attackerSnap)) classId = 6; else if (typeof shouldUseCrystalLaser === "function" && shouldUseCrystalLaser(attackerSnap)) classId = 3;
            } catch (_) {}
            const typeId = classId === 0 ? patternId || 0 : 0;
            const soundId = this.laserSoundByClassType[classId] && this.laserSoundByClassType[classId][typeId] != null ? this.laserSoundByClassType[classId][typeId] : -1;
            if (soundId == null || soundId === -1) return;
            this.playSoundEffect(soundId, false, false, x, y, overrideLimit);
        },
        playRocketLaunch(attackerId, rocketId, x, y) {
            const overrideLimit = true;
            const soundId = this.rocketSoundById[rocketId] != null ? this.rocketSoundById[rocketId] : -1;
            if (soundId == null || soundId === -1) return;
            this.playSoundEffect(soundId, false, false, x, y, overrideLimit);
        },
        playPyro(classId, pyroId, x, y) {
            const soundId = this.pyroSoundByClassId[classId] && this.pyroSoundByClassId[classId][pyroId] != null ? this.pyroSoundByClassId[classId][pyroId] : -1;
            if (soundId == null || soundId === -1) return;
            this.playSoundEffect(soundId, false, false, x, y, true);
        },
        parseFromGameXml(xmlDoc) {
            if (!xmlDoc) return;
            const soundNodes = xmlDoc.querySelectorAll("patterns > sounds > sound");
            soundNodes.forEach(n => {
                const id = parseInt(n.getAttribute("id"), 10);
                if (isNaN(id)) return;
                const resKey = (n.getAttribute("resKey") || "").trim();
                const soundbank = (n.getAttribute("soundbank") || "").trim();
                const volume = parseFloat(n.getAttribute("volume") || "1");
                const loop = (n.getAttribute("loop") || "false") === "true";
                this.soundPatterns[id] = {
                    id: id,
                    resKey: resKey,
                    soundbank: soundbank,
                    volume: isNaN(volume) ? 1 : volume,
                    loop: loop
                };
            });
            const musicNodes = xmlDoc.querySelectorAll("patterns > music > track");
            musicNodes.forEach(n => {
                const id = parseInt(n.getAttribute("id"), 10);
                if (isNaN(id)) return;
                const resKey = (n.getAttribute("resKey") || "").trim();
                const volume = parseFloat(n.getAttribute("volume") || "1");
                this.musicPatterns[id] = {
                    id: id,
                    resKey: resKey,
                    volume: isNaN(volume) ? 1 : volume
                };
            });
            this._preloadedResourceKeys = this._parsePreloadedResourceKeysFromGameXml(xmlDoc);
            const laserNodes = xmlDoc.querySelectorAll("lasers > laser");
            laserNodes.forEach(n => {
                const classId = parseInt(n.getAttribute("class"), 10);
                const typeId = parseInt(n.getAttribute("type"), 10);
                const soundId = parseInt(n.getAttribute("soundID") || "-1", 10);
                if (isNaN(classId) || isNaN(typeId)) return;
                if (!this.laserSoundByClassType[classId]) this.laserSoundByClassType[classId] = {};
                this.laserSoundByClassType[classId][typeId] = isNaN(soundId) ? -1 : soundId;
            });
            const rocketNodes = xmlDoc.querySelectorAll("rockets > rocket");
            rocketNodes.forEach(n => {
                const id = parseInt(n.getAttribute("id"), 10);
                const soundId = parseInt(n.getAttribute("soundID") || "-1", 10);
                if (isNaN(id)) return;
                this.rocketSoundById[id] = isNaN(soundId) ? -1 : soundId;
            });
            const pyroNodes = xmlDoc.querySelectorAll("pyroEffects > pyroEffect");
            pyroNodes.forEach(n => {
                const classId = parseInt(n.getAttribute("class"), 10);
                const id = parseInt(n.getAttribute("id"), 10);
                const soundId = parseInt(n.getAttribute("soundID") || "-1", 10);
                if (isNaN(classId) || isNaN(id)) return;
                if (!this.pyroSoundByClassId[classId]) this.pyroSoundByClassId[classId] = {};
                this.pyroSoundByClassId[classId][id] = isNaN(soundId) ? -1 : soundId;
            });
            console.log("[AudioManager] game.xml audio patterns loaded:", {
                soundPatterns: Object.keys(this.soundPatterns || {}).length,
                musicPatterns: Object.keys(this.musicPatterns || {}).length
            });
            this._patternsReady = true;
            try {
                if (Array.isArray(this._pendingSfxBeforePatterns) && this._pendingSfxBeforePatterns.length) {
                    const pending = this._pendingSfxBeforePatterns.slice();
                    this._pendingSfxBeforePatterns.length = 0;
                    pending.forEach(req => {
                        try {
                            this.playSoundEffect(req.soundId, req.loop, req.fadeIn, req.x, req.y, req.overrideLimit, {
                                __skipCount: true,
                                __skipQueue: true,
                                __fromPending: true
                            });
                        } catch (_) {}
                    });
                    this._pushEvent("sfx_flush", {
                        count: pending.length
                    });
                }
            } catch (err) {
                console.warn("[AudioManager] flush pending SFX failed:", err);
            }
            if (this._pendingMusicTypeId != null && this._currentMusicTypeId == null) {
                this._currentMusicTypeId = this._pendingMusicTypeId;
            }
            if (this._heroEngineMoving) {
                try {
                    this._tryStartHeroEngine();
                } catch (_) {}
            }
            try {
                this.primeCriticalBootAudio("parseFromGameXml");
            } catch (err) {
                console.warn("[AudioManager] Critical boot audio preload init failed:", err);
            }
            this.onSettingsChanged();
        },
        status() {
            return {
                ctxState: this._ctx ? this._ctx.state : "none",
                unlocked: this._unlocked,
                sfxEnabled: this._isSfxEnabled(),
                musicEnabled: this._isMusicEnabled(),
                sndCnt: this.sndCnt,
                soundPatterns: Object.keys(this.soundPatterns || {}).length,
                musicPatterns: Object.keys(this.musicPatterns || {}).length,
                currentMusicTypeId: this._currentMusicTypeId,
                lastTrack: this.lastTrack,
                criticalBootAudio: this.getCriticalBootAudioStatus(),
                runtimeWarmup: this.getBootRuntimeWarmupStatus(),
                customVolumeSettings: this.getCustomVolumeSettings()
            };
        },
        _getHeroPos() {
            try {
                if (typeof shipX !== "undefined" && typeof shipY !== "undefined") {
                    return {
                        x: shipX,
                        y: shipY
                    };
                }
            } catch (_) {}
            return null;
        }
    };
    window.AudioManager = AudioManager;
    try {
        window.__ANDRO_CUSTOM_AUDIO_SETTINGS_STORAGE_KEY = CUSTOM_AUDIO_SETTINGS_STORAGE_KEY;
        window.__ANDRO_CUSTOM_AUDIO_SETTINGS = AudioManager._ensureCustomVolumePrefs();
    } catch (_) {}
    try {
        if (typeof window.__ANDRO_AUDIO_BOOT_READY !== "boolean") {
            window.__ANDRO_AUDIO_BOOT_READY = false;
        }
    } catch (_) {}
    try {
        window.__ANDRO_AUDIO_BOOT_STATUS = AudioManager.getCriticalBootAudioStatus();
        window.__ANDRO_AUDIO_BOOT_PRELOAD_PROMISE = null;
    } catch (_) {}
    try {
        window.__ANDRO_AUDIO_RUNTIME_WARMUP_READY = false;
        window.__ANDRO_AUDIO_RUNTIME_WARMUP_STATUS = AudioManager.getBootRuntimeWarmupStatus();
    } catch (_) {}
    try {
        AudioManager._ensureContext();
    } catch (_) {}
    try {
        if (window._gameXmlDoc && typeof AudioManager.parseFromGameXml === "function") {
            AudioManager.parseFromGameXml(window._gameXmlDoc);
        }
    } catch (_) {}
})();