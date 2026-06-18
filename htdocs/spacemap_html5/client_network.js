const ANDRO_PERF_THRESHOLDS = Object.freeze({
    frameGapWarnMs: 120,
    frameGapConsoleMs: 250,
    frameGapBigMs: 500,
    packetHandlerWarnMs: 20,
    packetHandlerConsoleMs: 50,
    rxDrainWarnMs: 40,
    rxDrainConsoleMs: 80,
    rxBacklogWarn: 200,
    rxBurstPacketsWarn: 64,
    drawTotalWarnMs: 25,
    drawEntitiesWarnMs: 15,
    drawMinimapWarnMs: 10,
    drawEffectWarnMs: 10,
    cleanupWarnMs: 10,
    drawConsoleMs: 50,
    longTaskWarnMs: 50,
    longTaskConsoleMs: 250,
    lifecycleRecentMs: 3000,
    mapTransitionRecentMs: 5000,
    frameGapContextEvents: 20,
    frameGapContextSeconds: 10,
    secondBinCount: 60,
    resourceLookbackMs: 10000,
    syncGapThresholdsMs: Object.freeze([ 250, 500, 1000, 2000, 3000 ]),
    syncConsoleMs: 1000,
    syncGapThrottleMs: 1500,
    packetBurstAfterGapRecentMs: 5000,
    ringSize: 500
});

(function initAndroPerf() {
    function nowMs() {
        return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    }

    function roundMs(value) {
        return Math.round((Number(value) || 0) * 10) / 10;
    }

    function detectEnabled() {
        try {
            const params = new URLSearchParams(window.location.search || "");
            if (params.get("androPerf") === "1") return true;
            if (params.get("androPerf") === "0") return false;
        } catch (_) {}
        try {
            return window.localStorage && window.localStorage.getItem("androPerf") === "1";
        } catch (_) {
            return false;
        }
    }

    const enabled = detectEnabled();
    const events = [];
    const counts = Object.create(null);
    const opcodeCounts = Object.create(null);
    const slowest = Object.create(null);
    const lastRecordAtByKey = Object.create(null);
    const startedAtMs = nowMs();
    const startedAtIso = new Date().toISOString();
    const lifecycle = {
        visibilityState: typeof document !== "undefined" ? document.visibilityState || "visible" : "unknown",
        focused: typeof document !== "undefined" && typeof document.hasFocus === "function" ? document.hasFocus() : true,
        lastFocusAtMs: null,
        lastFocusAt: null,
        lastBlurAtMs: null,
        lastBlurAt: null,
        lastVisibilityChangeAtMs: null,
        lastVisibilityChangeAt: null,
        lastVisibilityState: typeof document !== "undefined" ? document.visibilityState || "visible" : "unknown",
        lastPageHideAtMs: null,
        lastPageHideAt: null,
        lastPageShowAtMs: null,
        lastPageShowAt: null,
        lastFreezeAtMs: null,
        lastFreezeAt: null,
        lastResumeAtMs: null,
        lastResumeAt: null
    };
    const lastState = {
        packet: null,
        opcode: null,
        handler: null,
        draw: null,
        cleanup: null,
        longTask: null,
        input: null,
        mapTransition: null
    };
    const workerState = {
        supported: false,
        started: false,
        failed: false,
        lastHeartbeatAtMs: null,
        lastHeartbeatAt: null,
        lastWorkerNowMs: null,
        lastSeq: 0,
        lastMainReceiveGapMs: null,
        maxMainReceiveGapMs: 0,
        lastWorkerGapMs: null,
        maxWorkerGapMs: 0,
        heartbeatCount: 0
    };
    const syncState = {
        lastWsReceiveAtMs: null,
        lastWsReceiveAt: null,
        maxWsReceiveGapMs: 0,
        lastWsReceiveGap: null,
        lastUsefulEntityUpdateAtMs: nowMs(),
        lastUsefulEntityUpdateAt: startedAtIso,
        lastUsefulEntityUpdate: null,
        lastEntityUpdateThresholdMs: 0,
        maxEntityUpdateGapMs: 0,
        lastEntityUpdateGap: null,
        pendingTargetSelection: null,
        maxTargetInfoDelayMs: 0,
        lastTargetInfoDelay: null,
        maxPacketBurstAfterGapMs: 0,
        lastPacketBurstAfterGap: null,
        lastSignificantGap: null,
        lastPacketBurstRecordAtMs: null,
        lastSyncFreeze: null,
        probableReason: null,
        activeDrain: null
    };
    const secondBins = [];
    let lastSnapshotMap = null;
    let longTaskObserver = null;
    let heartbeatWorker = null;
    let seq = 1;

    function getSyncThreshold(durationMs) {
        const duration = Number(durationMs || 0);
        let threshold = 0;
        for (const value of ANDRO_PERF_THRESHOLDS.syncGapThresholdsMs) {
            if (duration >= value) threshold = value; else break;
        }
        return threshold;
    }

    function getSyncCategory(durationMs) {
        const duration = Number(durationMs || 0);
        if (duration >= 3000) return "3000ms+";
        if (duration >= 2000) return "2000-3000ms";
        if (duration >= 1000) return "1000-2000ms";
        if (duration >= 500) return "500-1000ms";
        if (duration >= 250) return "250-500ms";
        return "below-threshold";
    }

    function copyLastState(value) {
        if (!value) return null;
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (_) {
            return null;
        }
    }

    function topOpcodeList(opcodes, limit = 8) {
        if (!opcodes) return [];
        return Object.keys(opcodes).map(opcode => ({
            opcode: opcode,
            count: opcodes[opcode]
        })).sort((a, b) => b.count - a.count || a.opcode.localeCompare(b.opcode)).slice(0, limit);
    }

    function compactPerfEvent(event) {
        if (!event) return null;
        const out = {
            id: event.id,
            at: event.at,
            tMs: event.tMs,
            type: event.type
        };
        for (const key of [ "durationMs", "gapMs", "previousGapMs", "thresholdMs", "level", "category", "reason", "probableReason", "targetId", "targetType", "opcode", "normalizedOpcode", "processed", "backlogBefore", "backlogAfter" ]) {
            if (event[key] !== undefined) out[key] = event[key];
        }
        return out;
    }

    function getCurrentWsReceiveGapMs(perfNow = nowMs()) {
        return syncState.lastWsReceiveAtMs == null ? null : roundMs(perfNow - syncState.lastWsReceiveAtMs);
    }

    function getCurrentEntityUpdateGapMs(perfNow = nowMs()) {
        return syncState.lastUsefulEntityUpdateAtMs == null ? null : roundMs(perfNow - syncState.lastUsefulEntityUpdateAtMs);
    }

    function getCurrentTargetInfoDelayMs(perfNow = nowMs()) {
        return syncState.pendingTargetSelection && syncState.pendingTargetSelection.selectedAtMs != null ? roundMs(perfNow - syncState.pendingTargetSelection.selectedAtMs) : null;
    }

    function shouldRecordSyncGap(kind, thresholdMs, perfNow) {
        if (thresholdMs >= 1000) return true;
        const key = `sync:${kind}:${thresholdMs}`;
        const lastAt = lastRecordAtByKey[key] || 0;
        if (perfNow - lastAt < ANDRO_PERF_THRESHOLDS.syncGapThrottleMs) return false;
        lastRecordAtByKey[key] = perfNow;
        return true;
    }

    function getSyncContext(snapshot, perfNow = nowMs()) {
        const snap = snapshot || collectSnapshot();
        return {
            map: snap.map,
            visibilityState: snap.visibilityState,
            hasFocus: snap.hasFocus,
            rxQueue: snap.rxQueue,
            wsConnected: typeof window !== "undefined" ? window.__ANDRO_WS_CONNECTED === true : null,
            currentWsReceiveGapMs: getCurrentWsReceiveGapMs(perfNow),
            currentEntityUpdateGapMs: getCurrentEntityUpdateGapMs(perfNow),
            currentTargetInfoDelayMs: getCurrentTargetInfoDelayMs(perfNow),
            lastPacket: copyLastState(lastState.packet),
            lastOpcode: lastState.opcode,
            lastHandler: copyLastState(lastState.handler),
            lastUsefulEntityUpdate: copyLastState(syncState.lastUsefulEntityUpdate),
            lastDraw: copyLastState(lastState.draw),
            targetSelection: copyLastState(syncState.pendingTargetSelection),
            entities: snap.entities,
            players: snap.players,
            npcs: snap.npcs,
            lasers: snap.lasers,
            rockets: snap.rockets,
            rocketSmoke: snap.rocketSmoke,
            damageBubbles: snap.damageBubbles,
            minimapOpen: snap.minimapOpen,
            groupOpen: snap.groupOpen
        };
    }

    function getSignalDuration(type, event) {
        if (!event) return 0;
        if (type === "frame_gap") return Number(event.gapMs || 0);
        if (type === "packet_burst_after_gap") return Number(event.previousGapMs || event.durationMs || 0);
        return Number(event.durationMs || event.gapMs || 0);
    }

    function inferSyncFreezeReason(type, event) {
        if (type === "ws_receive_gap") return "websocket_receive_gap";
        if (type === "entity_update_gap") return "packet_apply_gap";
        if (type === "target_info_delay") return "target_info_delay";
        if (type === "packet_burst_after_gap") return "packet_burst_after_gap";
        if (type === "frame_gap") {
            const reason = String(event && event.reason || "");
            if (reason.includes("main-thread") || reason.includes("longtask")) return "browser_main_thread";
            const draw = lastState.draw;
            if (draw && Number(draw.durationMs || 0) >= ANDRO_PERF_THRESHOLDS.drawTotalWarnMs) return "render_only";
            return "unknown";
        }
        return "unknown";
    }

    function noteSignificantGap(source, durationMs, event) {
        const duration = Number(durationMs || 0);
        if (duration < ANDRO_PERF_THRESHOLDS.syncGapThresholdsMs[0]) return;
        syncState.lastSignificantGap = {
            source: source,
            durationMs: roundMs(duration),
            thresholdMs: getSyncThreshold(duration),
            atMs: nowMs(),
            eventId: event && event.id || null
        };
    }

    function recordEntityUpdateGap(durationMs, source) {
        const duration = Number(durationMs || 0);
        const threshold = getSyncThreshold(duration);
        if (!threshold) return null;
        const perfNow = nowMs();
        if (!shouldRecordSyncGap("entity_update_gap", threshold, perfNow)) return null;
        const snapshot = collectSnapshot();
        const event = record("entity_update_gap", Object.assign({
            durationMs: roundMs(duration),
            thresholdMs: threshold,
            category: getSyncCategory(duration),
            source: source || "watchdog",
            lastUsefulPacket: copyLastState(syncState.lastUsefulEntityUpdate),
            lastOpcode: lastState.opcode,
            rxQueue: snapshot.rxQueue,
            currentWsReceiveGapMs: getCurrentWsReceiveGapMs(perfNow),
            snapshot: snapshot
        }, getSyncContext(snapshot, perfNow)));
        syncState.lastEntityUpdateThresholdMs = Math.max(syncState.lastEntityUpdateThresholdMs, threshold);
        return event;
    }

    function recordSyncFreezeFromEvent(type, event) {
        if (type === "sync_freeze") return;
        if (type !== "ws_receive_gap" && type !== "entity_update_gap" && type !== "target_info_delay" && type !== "frame_gap" && type !== "packet_burst_after_gap") return;
        const duration = getSignalDuration(type, event);
        if (duration < 500) return;
        const snapshot = event && event.snapshot || collectSnapshot();
        const probableReason = inferSyncFreezeReason(type, event);
        record("sync_freeze", Object.assign({
            durationMs: roundMs(duration),
            thresholdMs: getSyncThreshold(duration),
            category: getSyncCategory(duration),
            sourceEventType: type,
            sourceEventId: event && event.id || null,
            probableReason: probableReason
        }, getSyncContext(snapshot), {
            snapshot: snapshot
        }));
    }

    function getTopSyncFreezeEvents(limit = 10) {
        return events.filter(event => event && event.type === "sync_freeze").slice().sort((a, b) => Number(b.durationMs || 0) - Number(a.durationMs || 0)).slice(0, limit).map(compactPerfEvent);
    }

    function resetSyncStateForClear() {
        const perfNow = nowMs();
        syncState.lastWsReceiveAtMs = null;
        syncState.lastWsReceiveAt = null;
        syncState.maxWsReceiveGapMs = 0;
        syncState.lastWsReceiveGap = null;
        syncState.lastUsefulEntityUpdateAtMs = perfNow;
        syncState.lastUsefulEntityUpdateAt = new Date().toISOString();
        syncState.lastUsefulEntityUpdate = null;
        syncState.lastEntityUpdateThresholdMs = 0;
        syncState.maxEntityUpdateGapMs = 0;
        syncState.lastEntityUpdateGap = null;
        syncState.pendingTargetSelection = null;
        syncState.maxTargetInfoDelayMs = 0;
        syncState.lastTargetInfoDelay = null;
        syncState.maxPacketBurstAfterGapMs = 0;
        syncState.lastPacketBurstAfterGap = null;
        syncState.lastSignificantGap = null;
        syncState.lastPacketBurstRecordAtMs = null;
        syncState.lastSyncFreeze = null;
        syncState.probableReason = null;
        syncState.activeDrain = null;
    }

    function getArrayLength(value) {
        return Array.isArray(value) ? value.length : null;
    }

    function getMemorySnapshot() {
        try {
            const memory = typeof performance !== "undefined" ? performance.memory : null;
            if (!memory) return null;
            return {
                usedJSHeapSize: Number(memory.usedJSHeapSize) || 0,
                totalJSHeapSize: Number(memory.totalJSHeapSize) || 0,
                jsHeapSizeLimit: Number(memory.jsHeapSizeLimit) || 0
            };
        } catch (_) {
            return null;
        }
    }

    function updateLifecycleState() {
        try {
            lifecycle.visibilityState = typeof document !== "undefined" ? document.visibilityState || "visible" : "unknown";
            lifecycle.focused = typeof document !== "undefined" && typeof document.hasFocus === "function" ? document.hasFocus() : true;
        } catch (_) {}
    }

    function isoFromNow(perfNow) {
        return new Date(Date.now() - Math.max(0, nowMs() - perfNow)).toISOString();
    }

    function getCurrentSecondBin(perfNow = nowMs()) {
        const sec = Math.floor((perfNow - startedAtMs) / 1000);
        let bin = secondBins.length ? secondBins[secondBins.length - 1] : null;
        if (!bin || bin.sec !== sec) {
            bin = {
                sec: sec,
                startMs: sec * 1000,
                startAt: isoFromNow(startedAtMs + sec * 1000),
                packets: 0,
                opcodes: Object.create(null),
                drains: 0,
                maxRxBacklog: 0,
                maxDrawTotal: 0,
                maxDrawEntities: 0,
                maxDrawMiniMap: 0,
                maxDrawLaserBeams: 0,
                maxDrawExplosions: 0,
                drawTotalSum: 0,
                drawTotalCount: 0,
                drawEntitiesSum: 0,
                drawEntitiesCount: 0,
                drawMiniMapSum: 0,
                drawMiniMapCount: 0,
                maxCleanup: 0,
                maxFrameGap: 0,
                entities: null,
                players: null,
                npcs: null,
                bossProtegits: null,
                lasers: null,
                damageBubbles: null,
                minimapOpen: false,
                groupOpen: false,
                visibilityState: lifecycle.visibilityState,
                focused: lifecycle.focused,
                memory: null
            };
            secondBins.push(bin);
            while (secondBins.length > ANDRO_PERF_THRESHOLDS.secondBinCount) secondBins.shift();
        }
        return bin;
    }

    function updateBinSnapshot(bin, snapshot) {
        if (!bin || !snapshot) return;
        bin.entities = snapshot.entities;
        bin.players = snapshot.players;
        bin.npcs = snapshot.npcs;
        bin.bossProtegits = snapshot.bossProtegits;
        bin.lasers = snapshot.lasers;
        bin.damageBubbles = snapshot.damageBubbles;
        bin.minimapOpen = !!snapshot.minimapOpen;
        bin.groupOpen = !!snapshot.groupOpen;
        bin.visibilityState = snapshot.visibilityState;
        bin.focused = snapshot.hasFocus;
        bin.memory = snapshot.memory;
    }

    function normalizeOpcodeForStats(opcode, parts, startIndex) {
        const op = String(opcode || "");
        const next = String(parts && parts[startIndex] || "");
        if (op === "MM" && next.toUpperCase() === "SR") return "MM|SR";
        if (op === "ps" && next.toLowerCase() === "upd") return "ps|upd";
        if (op === "C" || op === "R" || op === "K" || op === "MM" || op === "a" || op === "Y" || op === "U" || op === "ps") return op;
        return "other";
    }

    function getRecentBins(seconds = ANDRO_PERF_THRESHOLDS.frameGapContextSeconds) {
        return secondBins.slice(-Math.max(1, seconds)).map(bin => ({
            sec: bin.sec,
            startMs: bin.startMs,
            startAt: bin.startAt,
            packets: bin.packets,
            opcodes: Object.assign({}, bin.opcodes),
            drains: bin.drains,
            maxRxBacklog: roundMs(bin.maxRxBacklog),
            maxDrawTotal: roundMs(bin.maxDrawTotal),
            maxDrawEntities: roundMs(bin.maxDrawEntities),
            maxDrawMiniMap: roundMs(bin.maxDrawMiniMap),
            maxDrawLaserBeams: roundMs(bin.maxDrawLaserBeams),
            maxDrawExplosions: roundMs(bin.maxDrawExplosions),
            avgDrawTotal: bin.drawTotalCount > 0 ? roundMs(bin.drawTotalSum / bin.drawTotalCount) : 0,
            avgDrawEntities: bin.drawEntitiesCount > 0 ? roundMs(bin.drawEntitiesSum / bin.drawEntitiesCount) : 0,
            avgDrawMiniMap: bin.drawMiniMapCount > 0 ? roundMs(bin.drawMiniMapSum / bin.drawMiniMapCount) : 0,
            maxCleanup: roundMs(bin.maxCleanup),
            maxFrameGap: roundMs(bin.maxFrameGap),
            entities: bin.entities,
            players: bin.players,
            npcs: bin.npcs,
            bossProtegits: bin.bossProtegits,
            lasers: bin.lasers,
            damageBubbles: bin.damageBubbles,
            minimapOpen: bin.minimapOpen,
            groupOpen: bin.groupOpen,
            visibilityState: bin.visibilityState,
            focused: bin.focused,
            memory: bin.memory
        }));
    }

    function getRecentResources(perfNow = nowMs()) {
        try {
            if (!performance || typeof performance.getEntriesByType !== "function") return [];
            const minStart = perfNow - ANDRO_PERF_THRESHOLDS.resourceLookbackMs;
            return performance.getEntriesByType("resource").filter(entry => {
                const end = Number(entry.responseEnd || entry.startTime || 0);
                return end >= minStart;
            }).slice(-25).map(entry => ({
                name: String(entry.name || "").split("?")[0].slice(-160),
                initiatorType: entry.initiatorType || "",
                startTime: roundMs(entry.startTime || 0),
                responseEnd: roundMs(entry.responseEnd || 0),
                durationMs: roundMs(entry.duration || 0),
                transferSize: Number(entry.transferSize || 0)
            }));
        } catch (_) {
            return [];
        }
    }

    function getWindowOpenByKey(key) {
        try {
            const selector = `.gameWindow[data-window-key="${key}"]`;
            const el = document.querySelector(selector);
            if (!el) return false;
            const style = window.getComputedStyle ? window.getComputedStyle(el) : null;
            if (style && (style.display === "none" || style.visibility === "hidden")) return false;
            return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        } catch (_) {
            return false;
        }
    }

    function collectSnapshot() {
        updateLifecycleState();
        const snapshot = {
            map: null,
            visibilityState: lifecycle.visibilityState,
            hasFocus: lifecycle.focused,
            lastFocusAt: lifecycle.lastFocusAt,
            lastBlurAt: lifecycle.lastBlurAt,
            lastVisibilityChangeAt: lifecycle.lastVisibilityChangeAt,
            lastPageHideAt: lifecycle.lastPageHideAt,
            lastPageShowAt: lifecycle.lastPageShowAt,
            lastFreezeAt: lifecycle.lastFreezeAt,
            lastResumeAt: lifecycle.lastResumeAt,
            memory: getMemorySnapshot(),
            workerHeartbeat: {
                supported: workerState.supported,
                started: workerState.started,
                failed: workerState.failed,
                lastHeartbeatAt: workerState.lastHeartbeatAt,
                lastHeartbeatAgeMs: workerState.lastHeartbeatAtMs == null ? null : roundMs(nowMs() - workerState.lastHeartbeatAtMs),
                lastMainReceiveGapMs: workerState.lastMainReceiveGapMs == null ? null : roundMs(workerState.lastMainReceiveGapMs),
                maxMainReceiveGapMs: roundMs(workerState.maxMainReceiveGapMs),
                lastWorkerGapMs: workerState.lastWorkerGapMs == null ? null : roundMs(workerState.lastWorkerGapMs),
                maxWorkerGapMs: roundMs(workerState.maxWorkerGapMs),
                heartbeatCount: workerState.heartbeatCount
            },
            lastPacket: lastState.packet,
            lastOpcode: lastState.opcode,
            lastHandler: lastState.handler,
            lastDraw: lastState.draw,
            lastCleanup: lastState.cleanup,
            lastLongTask: lastState.longTask,
            lastInput: lastState.input,
            lastMapTransition: lastState.mapTransition,
            wsConnected: typeof window !== "undefined" ? window.__ANDRO_WS_CONNECTED === true : null,
            currentWsReceiveGapMs: getCurrentWsReceiveGapMs(),
            currentEntityUpdateGapMs: getCurrentEntityUpdateGapMs(),
            currentTargetInfoDelayMs: getCurrentTargetInfoDelayMs(),
            lastWsReceiveGap: syncState.lastWsReceiveGap,
            lastEntityUpdateGap: syncState.lastEntityUpdateGap,
            lastTargetInfoDelay: syncState.lastTargetInfoDelay,
            lastPacketBurstAfterGap: syncState.lastPacketBurstAfterGap,
            lastSyncFreeze: syncState.lastSyncFreeze,
            probableReason: syncState.probableReason,
            entities: null,
            players: null,
            npcs: null,
            bossProtegits: null,
            lasers: null,
            sabShots: null,
            sabRings: null,
            rockets: null,
            rocketSmoke: null,
            damageBubbles: null,
            explosions: null,
            smartbombEffects: null,
            empEffects: null,
            portalJumpEffects: null,
            minimapMarkers: null,
            pendingVisualCleanup: null,
            rxQueue: null,
            minimapOpen: false,
            groupOpen: false
        };
        try {
            if (typeof currentMapId !== "undefined") snapshot.map = currentMapId;
        } catch (_) {}
        try {
            if (snapshot.map != null && snapshot.map !== lastSnapshotMap) {
                if (lastSnapshotMap !== null) {
                    lastState.mapTransition = {
                        from: lastSnapshotMap,
                        to: snapshot.map,
                        at: new Date().toISOString(),
                        tMs: roundMs(nowMs() - startedAtMs)
                    };
                    snapshot.lastMapTransition = lastState.mapTransition;
                }
                lastSnapshotMap = snapshot.map;
            }
        } catch (_) {}
        try {
            if (typeof entities !== "undefined" && entities) {
                const seen = new Set();
                let players = 0;
                let npcs = 0;
                let bossProtegits = 0;
                for (const key in entities) {
                    const e = entities[key];
                    if (!e || e.id == null) continue;
                    const id = String(e.id);
                    if (seen.has(id)) continue;
                    seen.add(id);
                    if (e.kind === "player") players++;
                    if (e.kind === "npc") {
                        npcs++;
                        const shipId = Number(e.shipId ?? e.type ?? 0);
                        const name = String(e.name || "").toLowerCase();
                        if (shipId === 81 || name.includes("protegit")) bossProtegits++;
                    }
                }
                snapshot.entities = seen.size;
                snapshot.players = players;
                snapshot.npcs = npcs;
                snapshot.bossProtegits = bossProtegits;
            }
        } catch (_) {}
        try { if (typeof laserBeams !== "undefined") snapshot.lasers = getArrayLength(laserBeams); } catch (_) {}
        try { if (typeof sabShots !== "undefined") snapshot.sabShots = getArrayLength(sabShots); } catch (_) {}
        try { if (typeof SAB_RING_STATE !== "undefined" && SAB_RING_STATE instanceof Map) snapshot.sabRings = SAB_RING_STATE.size; } catch (_) {}
        try { if (typeof rocketAttacks !== "undefined") snapshot.rockets = getArrayLength(rocketAttacks); } catch (_) {}
        try { if (typeof rocketSmokeParticles !== "undefined") snapshot.rocketSmoke = getArrayLength(rocketSmokeParticles); } catch (_) {}
        try { if (typeof damageBubbles !== "undefined") snapshot.damageBubbles = getArrayLength(damageBubbles); } catch (_) {}
        try { if (typeof explosions !== "undefined") snapshot.explosions = getArrayLength(explosions); } catch (_) {}
        try { if (typeof smartbombEffects !== "undefined") snapshot.smartbombEffects = getArrayLength(smartbombEffects); } catch (_) {}
        try { if (typeof empEffects !== "undefined") snapshot.empEffects = getArrayLength(empEffects); } catch (_) {}
        try { if (typeof portalJumpEffects !== "undefined") snapshot.portalJumpEffects = getArrayLength(portalJumpEffects); } catch (_) {}
        try { if (window.minimapServerMarkers instanceof Map) snapshot.minimapMarkers = window.minimapServerMarkers.size; } catch (_) {}
        try { if (typeof PENDING_ENTITY_VISUAL_CLEANUPS !== "undefined" && PENDING_ENTITY_VISUAL_CLEANUPS instanceof Map) snapshot.pendingVisualCleanup = PENDING_ENTITY_VISUAL_CLEANUPS.size; } catch (_) {}
        try { if (typeof __getRxBacklog === "function") { snapshot.rxQueue = __getRxBacklog("game") + __getRxBacklog("chat"); snapshot.rxQueueGame = __getRxBacklog("game"); snapshot.rxQueueChat = __getRxBacklog("chat"); } } catch (_) {}
        snapshot.minimapOpen = getWindowOpenByKey("map") || getWindowOpenByKey("minimap");
        snapshot.groupOpen = getWindowOpenByKey("group");
        updateBinSnapshot(getCurrentSecondBin(), snapshot);
        return snapshot;
    }

    function updateSlowest(bucket, event) {
        const duration = Number(event.durationMs ?? event.gapMs ?? 0);
        if (!Number.isFinite(duration)) return;
        const current = slowest[bucket];
        if (!current || duration > current.durationMs) {
            slowest[bucket] = {
                durationMs: duration,
                type: event.type,
                opcode: event.opcode || null,
                label: event.label || null,
                at: event.at
            };
        }
    }

    function shouldConsoleLog(type, data) {
        if (type === "frame_gap") return Number(data.gapMs || 0) >= ANDRO_PERF_THRESHOLDS.frameGapConsoleMs;
        if (type === "packet_handler_slow") return Number(data.durationMs || 0) >= ANDRO_PERF_THRESHOLDS.packetHandlerConsoleMs;
        if (type === "rx_drain_slow") return Number(data.durationMs || 0) >= ANDRO_PERF_THRESHOLDS.rxDrainConsoleMs;
        if (type === "draw_slow") return Number(data.durationMs || 0) >= ANDRO_PERF_THRESHOLDS.drawConsoleMs;
        if (type === "cleanup_slow") return Number(data.durationMs || 0) >= ANDRO_PERF_THRESHOLDS.drawConsoleMs;
        if (type === "longtask") return Number(data.durationMs || 0) >= ANDRO_PERF_THRESHOLDS.longTaskConsoleMs;
        if (type === "ws_receive_gap" || type === "entity_update_gap" || type === "target_info_delay" || type === "packet_burst_after_gap" || type === "sync_freeze") {
            return getSignalDuration(type, data) >= ANDRO_PERF_THRESHOLDS.syncConsoleMs;
        }
        return false;
    }

    function shouldThrottleRecord(type, data, perfNow) {
        if (shouldConsoleLog(type, data)) return false;
        let key = "";
        let throttleMs = 0;
        if (type === "draw_slow") {
            key = `${type}:${data.label || ""}`;
            throttleMs = 250;
        } else if (type === "cleanup_slow") {
            key = `${type}:${data.label || ""}`;
            throttleMs = 250;
        } else {
            return false;
        }
        const lastAt = lastRecordAtByKey[key] || 0;
        if (perfNow - lastAt < throttleMs) return true;
        lastRecordAtByKey[key] = perfNow;
        return false;
    }

    function record(type, data = {}) {
        if (!enabled) return null;
        const perfNow = nowMs();
        if (shouldThrottleRecord(type, data, perfNow)) return null;
        const event = Object.assign({
            id: seq++,
            at: new Date().toISOString(),
            tMs: roundMs(perfNow - startedAtMs),
            type: type
        }, data);
        if (!event.snapshot) event.snapshot = collectSnapshot();
        events.push(event);
        while (events.length > ANDRO_PERF_THRESHOLDS.ringSize) events.shift();
        counts[type] = (counts[type] || 0) + 1;
        if (event.opcode) opcodeCounts[event.opcode] = (opcodeCounts[event.opcode] || 0) + 1;
        if (type === "frame_gap") updateSlowest("frameGap", event);
        if (type === "packet_handler_slow") updateSlowest("packetHandler", event);
        if (type === "rx_drain_slow") updateSlowest("rxDrain", event);
        if (type === "draw_slow") updateSlowest("draw", event);
        if (type === "cleanup_slow") updateSlowest("cleanup", event);
        if (type === "longtask") updateSlowest("longTask", event);
        if (type === "ws_receive_gap") {
            syncState.lastWsReceiveGap = compactPerfEvent(event);
            syncState.maxWsReceiveGapMs = Math.max(syncState.maxWsReceiveGapMs, Number(event.durationMs || 0));
            noteSignificantGap("ws_receive_gap", event.durationMs, event);
        }
        if (type === "entity_update_gap") {
            syncState.lastEntityUpdateGap = compactPerfEvent(event);
            syncState.maxEntityUpdateGapMs = Math.max(syncState.maxEntityUpdateGapMs, Number(event.durationMs || 0));
            noteSignificantGap("entity_update_gap", event.durationMs, event);
        }
        if (type === "target_info_delay") {
            syncState.lastTargetInfoDelay = compactPerfEvent(event);
            syncState.maxTargetInfoDelayMs = Math.max(syncState.maxTargetInfoDelayMs, Number(event.durationMs || 0));
        }
        if (type === "packet_burst_after_gap") {
            syncState.lastPacketBurstAfterGap = compactPerfEvent(event);
            syncState.maxPacketBurstAfterGapMs = Math.max(syncState.maxPacketBurstAfterGapMs, Number(event.previousGapMs || event.durationMs || 0));
        }
        if (type === "sync_freeze") {
            syncState.lastSyncFreeze = compactPerfEvent(event);
            syncState.probableReason = event.probableReason || syncState.probableReason;
        } else {
            recordSyncFreezeFromEvent(type, event);
        }
        if (shouldConsoleLog(type, event)) {
            try {
                console.warn("[AndroPerf]", type, event);
            } catch (_) {}
        }
        return event;
    }

    function msSince(perfNow, timestampMs) {
        if (timestampMs == null) return Number.POSITIVE_INFINITY;
        return perfNow - timestampMs;
    }

    function classifyFrameGap(gapMs, snapshot, perfNow) {
        const visible = snapshot.visibilityState === "visible";
        const focused = snapshot.hasFocus !== false;
        const reasons = [];
        if (!visible) reasons.push("document-not-visible");
        if (!focused) reasons.push("document-not-focused");
        if (msSince(perfNow, lifecycle.lastVisibilityChangeAtMs) <= ANDRO_PERF_THRESHOLDS.lifecycleRecentMs) reasons.push("recent-visibilitychange");
        if (msSince(perfNow, lifecycle.lastBlurAtMs) <= ANDRO_PERF_THRESHOLDS.lifecycleRecentMs) reasons.push("recent-blur");
        if (msSince(perfNow, lifecycle.lastFocusAtMs) <= ANDRO_PERF_THRESHOLDS.lifecycleRecentMs) reasons.push("recent-focus");
        if (msSince(perfNow, lifecycle.lastPageHideAtMs) <= ANDRO_PERF_THRESHOLDS.lifecycleRecentMs) reasons.push("recent-pagehide");
        if (msSince(perfNow, lifecycle.lastPageShowAtMs) <= ANDRO_PERF_THRESHOLDS.lifecycleRecentMs) reasons.push("recent-pageshow");
        if (msSince(perfNow, lifecycle.lastFreezeAtMs) <= ANDRO_PERF_THRESHOLDS.lifecycleRecentMs) reasons.push("browser-freeze-event");
        if (msSince(perfNow, lifecycle.lastResumeAtMs) <= ANDRO_PERF_THRESHOLDS.lifecycleRecentMs) reasons.push("browser-resume-event");
        const transition = lastState.mapTransition;
        if (transition && Number.isFinite(transition.tMs) && perfNow - (startedAtMs + transition.tMs) <= ANDRO_PERF_THRESHOLDS.mapTransitionRecentMs) {
            reasons.push("recent-map-transition");
        }
        const longTask = lastState.longTask;
        const recentLongTask = !!(longTask && Number.isFinite(longTask.tMs) && perfNow - (startedAtMs + longTask.tMs) <= 2000);
        if (recentLongTask) reasons.push("recent-longtask");
        const workerAge = snapshot.workerHeartbeat && snapshot.workerHeartbeat.lastHeartbeatAgeMs;
        const workerOwnGap = snapshot.workerHeartbeat && snapshot.workerHeartbeat.lastWorkerGapMs;
        const workerMainGap = snapshot.workerHeartbeat && snapshot.workerHeartbeat.lastMainReceiveGapMs;
        let workerInterpretation = "unavailable";
        if (snapshot.workerHeartbeat && snapshot.workerHeartbeat.started && workerAge != null) {
            if (workerOwnGap >= Math.min(gapMs * .5, 1000)) {
                workerInterpretation = "worker-also-gapped";
                reasons.push("worker-gap");
            } else if (workerMainGap >= gapMs * .5 || workerAge < 1000) {
                workerInterpretation = "worker-likely-continued";
                reasons.push("worker-likely-continued");
            } else {
                workerInterpretation = "worker-inconclusive";
            }
        }
        let probablyGameplayFreeze = visible && focused && gapMs >= ANDRO_PERF_THRESHOLDS.frameGapConsoleMs;
        if (reasons.includes("recent-map-transition") || reasons.includes("recent-pagehide") || reasons.includes("recent-pageshow") || reasons.includes("browser-freeze-event") || reasons.includes("browser-resume-event")) {
            probablyGameplayFreeze = false;
        }
        let reason = "minor-frame-delay";
        if (!visible) reason = "tab-hidden-or-suspended";
        else if (!focused) reason = "tab-blurred-or-focus-throttled";
        else if (reasons.includes("recent-map-transition")) reason = "map-transition-or-loading";
        else if (recentLongTask) reason = "visible-focused-recent-longtask-main-thread";
        else if (workerInterpretation === "worker-likely-continued") reason = "visible-focused-worker-continued-main-thread-or-render";
        else if (workerInterpretation === "worker-also-gapped") reason = "visible-focused-worker-also-gapped-browser-os";
        else if (probablyGameplayFreeze) reason = "visible-focused-no-js-cause-yet";
        return {
            visible: visible,
            focused: focused,
            probablyGameplayFreeze: probablyGameplayFreeze,
            reason: reason,
            reasons: reasons,
            workerInterpretation: workerInterpretation
        };
    }

    function packetPrefix(parts, startIndex) {
        try {
            return parts.slice(0, Math.min(parts.length, Math.max(startIndex + 4, 6))).map(part => String(part).slice(0, 80)).join("|");
        } catch (_) {
            return "";
        }
    }

    function getRenderWarnThreshold(label) {
        if (label === "drawTotal" || label === "renderFrame") return ANDRO_PERF_THRESHOLDS.drawTotalWarnMs;
        if (label === "drawEntities") return ANDRO_PERF_THRESHOLDS.drawEntitiesWarnMs;
        if (label === "drawMiniMap" || label === "minimapRebuild") return ANDRO_PERF_THRESHOLDS.drawMinimapWarnMs;
        return ANDRO_PERF_THRESHOLDS.drawEffectWarnMs;
    }

    function recordLifecycleEvent(name, extra = null) {
        if (!enabled) return;
        const perfNow = nowMs();
        updateLifecycleState();
        if (name === "focus") {
            lifecycle.lastFocusAtMs = perfNow;
            lifecycle.lastFocusAt = new Date().toISOString();
        } else if (name === "blur") {
            lifecycle.lastBlurAtMs = perfNow;
            lifecycle.lastBlurAt = new Date().toISOString();
        } else if (name === "visibilitychange") {
            lifecycle.lastVisibilityChangeAtMs = perfNow;
            lifecycle.lastVisibilityChangeAt = new Date().toISOString();
            lifecycle.lastVisibilityState = lifecycle.visibilityState;
        } else if (name === "pagehide") {
            lifecycle.lastPageHideAtMs = perfNow;
            lifecycle.lastPageHideAt = new Date().toISOString();
        } else if (name === "pageshow") {
            lifecycle.lastPageShowAtMs = perfNow;
            lifecycle.lastPageShowAt = new Date().toISOString();
        } else if (name === "freeze") {
            lifecycle.lastFreezeAtMs = perfNow;
            lifecycle.lastFreezeAt = new Date().toISOString();
        } else if (name === "resume") {
            lifecycle.lastResumeAtMs = perfNow;
            lifecycle.lastResumeAt = new Date().toISOString();
        }
        record("lifecycle", Object.assign({
            event: name,
            visibilityState: lifecycle.visibilityState,
            focused: lifecycle.focused
        }, extra || {}));
    }

    function installLifecycleHooks() {
        if (!enabled || typeof window === "undefined") return;
        try { window.addEventListener("focus", () => recordLifecycleEvent("focus")); } catch (_) {}
        try { window.addEventListener("blur", () => recordLifecycleEvent("blur")); } catch (_) {}
        try { window.addEventListener("pagehide", event => recordLifecycleEvent("pagehide", { persisted: !!event.persisted })); } catch (_) {}
        try { window.addEventListener("pageshow", event => recordLifecycleEvent("pageshow", { persisted: !!event.persisted })); } catch (_) {}
        try { document.addEventListener("visibilitychange", () => recordLifecycleEvent("visibilitychange")); } catch (_) {}
        try { document.addEventListener("freeze", () => recordLifecycleEvent("freeze")); } catch (_) {}
        try { document.addEventListener("resume", () => recordLifecycleEvent("resume")); } catch (_) {}
        const noteInput = event => {
            lastState.input = {
                type: event.type,
                key: event.key ? String(event.key).slice(0, 32) : null,
                button: Number.isFinite(event.button) ? event.button : null,
                at: new Date().toISOString(),
                tMs: roundMs(nowMs() - startedAtMs)
            };
        };
        try { window.addEventListener("pointerdown", noteInput, { passive: true }); } catch (_) {}
        try { window.addEventListener("keydown", noteInput, { passive: true }); } catch (_) {}
    }

    function installLongTaskObserver() {
        if (!enabled || typeof PerformanceObserver === "undefined") return;
        try {
            longTaskObserver = new PerformanceObserver(list => {
                for (const entry of list.getEntries()) {
                    const duration = Number(entry.duration || 0);
                    if (duration < ANDRO_PERF_THRESHOLDS.longTaskWarnMs) continue;
                    const attribution = Array.isArray(entry.attribution) ? entry.attribution.slice(0, 5).map(item => ({
                        name: item.name || "",
                        entryType: item.entryType || "",
                        containerType: item.containerType || "",
                        containerName: item.containerName || "",
                        containerSrc: String(item.containerSrc || "").slice(-160),
                        scriptUrl: String(item.scriptUrl || "").slice(-160)
                    })) : [];
                    const event = {
                        name: entry.name || "longtask",
                        entryType: entry.entryType || "longtask",
                        startTime: roundMs(entry.startTime || 0),
                        durationMs: roundMs(duration),
                        attribution: attribution
                    };
                    lastState.longTask = Object.assign({
                        at: new Date().toISOString(),
                        tMs: roundMs(nowMs() - startedAtMs)
                    }, event);
                    record("longtask", event);
                }
            });
            longTaskObserver.observe({ entryTypes: [ "longtask" ] });
        } catch (e) {
            record("longtask_observer_error", {
                message: e && e.message ? String(e.message) : String(e)
            });
        }
    }

    function installWorkerHeartbeat() {
        if (!enabled || typeof Worker === "undefined" || typeof Blob === "undefined" || typeof URL === "undefined") return;
        workerState.supported = true;
        try {
            const workerSource = [
                "let seq = 0;",
                "setInterval(() => {",
                "  seq += 1;",
                "  postMessage({ type: 'heartbeat', seq, workerNow: Date.now() });",
                "}, 100);"
            ].join("\n");
            const blobUrl = URL.createObjectURL(new Blob([ workerSource ], { type: "application/javascript" }));
            heartbeatWorker = new Worker(blobUrl);
            URL.revokeObjectURL(blobUrl);
            workerState.started = true;
            heartbeatWorker.onmessage = event => {
                const perfNow = nowMs();
                const data = event && event.data || {};
                if (data.type !== "heartbeat") return;
                if (workerState.lastHeartbeatAtMs != null) {
                    const mainGap = perfNow - workerState.lastHeartbeatAtMs;
                    workerState.lastMainReceiveGapMs = mainGap;
                    if (mainGap > workerState.maxMainReceiveGapMs) workerState.maxMainReceiveGapMs = mainGap;
                }
                if (workerState.lastWorkerNowMs != null && Number.isFinite(data.workerNow)) {
                    const workerGap = Number(data.workerNow) - workerState.lastWorkerNowMs;
                    workerState.lastWorkerGapMs = workerGap;
                    if (workerGap > workerState.maxWorkerGapMs) workerState.maxWorkerGapMs = workerGap;
                }
                workerState.lastHeartbeatAtMs = perfNow;
                workerState.lastHeartbeatAt = new Date().toISOString();
                workerState.lastWorkerNowMs = Number.isFinite(data.workerNow) ? Number(data.workerNow) : workerState.lastWorkerNowMs;
                workerState.lastSeq = Number(data.seq) || workerState.lastSeq;
                workerState.heartbeatCount++;
            };
            heartbeatWorker.onerror = event => {
                workerState.failed = true;
                record("worker_heartbeat_error", {
                    message: event && event.message ? String(event.message) : "worker heartbeat error"
                });
            };
        } catch (e) {
            workerState.failed = true;
            record("worker_heartbeat_error", {
                message: e && e.message ? String(e.message) : String(e)
            });
        }
    }

    const api = {
        enabled: enabled,
        thresholds: ANDRO_PERF_THRESHOLDS,
        nowMs: nowMs,
        collectSnapshot: collectSnapshot,
        record: record,
        recordFrameGap(gapMs) {
            if (!enabled || gapMs < ANDRO_PERF_THRESHOLDS.frameGapWarnMs) return;
            const perfNow = nowMs();
            const snapshot = collectSnapshot();
            const classification = classifyFrameGap(gapMs, snapshot, perfNow);
            const bin = getCurrentSecondBin(perfNow);
            if (gapMs > bin.maxFrameGap) bin.maxFrameGap = gapMs;
            const level = gapMs >= ANDRO_PERF_THRESHOLDS.frameGapBigMs ? "500ms+" : gapMs >= ANDRO_PERF_THRESHOLDS.frameGapConsoleMs ? "250ms+" : "120ms+";
            record("frame_gap", {
                gapMs: roundMs(gapMs),
                level: level,
                visible: classification.visible,
                focused: classification.focused,
                probablyGameplayFreeze: classification.probablyGameplayFreeze,
                reason: classification.reason,
                reasons: classification.reasons,
                workerInterpretation: classification.workerInterpretation,
                recentEvents: events.slice(-ANDRO_PERF_THRESHOLDS.frameGapContextEvents),
                recentBins: getRecentBins(),
                recentResources: gapMs >= ANDRO_PERF_THRESHOLDS.frameGapConsoleMs ? getRecentResources(perfNow) : [],
                snapshot: snapshot
            });
        },
        tickSyncWatchdog() {
            if (!enabled) return;
            const perfNow = nowMs();
            const snapshot = collectSnapshot();
            if (snapshot.visibilityState !== "visible" || snapshot.hasFocus === false || snapshot.map == null || snapshot.wsConnected !== true) return;
            const entityGap = syncState.lastUsefulEntityUpdateAtMs == null ? 0 : perfNow - syncState.lastUsefulEntityUpdateAtMs;
            const threshold = getSyncThreshold(entityGap);
            if (!threshold || threshold <= syncState.lastEntityUpdateThresholdMs) return;
            recordEntityUpdateGap(entityGap, "watchdog");
        },
        noteWsReceive(channel) {
            if (!enabled || channel !== "game") return;
            const perfNow = nowMs();
            if (syncState.lastWsReceiveAtMs != null) {
                const gap = perfNow - syncState.lastWsReceiveAtMs;
                const threshold = getSyncThreshold(gap);
                if (threshold && shouldRecordSyncGap("ws_receive_gap", threshold, perfNow)) {
                    const snapshot = collectSnapshot();
                    record("ws_receive_gap", Object.assign({
                        durationMs: roundMs(gap),
                        thresholdMs: threshold,
                        category: getSyncCategory(gap),
                        snapshot: snapshot
                    }, getSyncContext(snapshot, perfNow)));
                }
            }
            syncState.lastWsReceiveAtMs = perfNow;
            syncState.lastWsReceiveAt = new Date().toISOString();
        },
        noteEntityUsefulUpdate(kind, data = null) {
            if (!enabled) return;
            const perfNow = nowMs();
            if (syncState.lastUsefulEntityUpdateAtMs != null) {
                const gap = perfNow - syncState.lastUsefulEntityUpdateAtMs;
                const threshold = getSyncThreshold(gap);
                if (threshold && threshold > syncState.lastEntityUpdateThresholdMs) {
                    recordEntityUpdateGap(gap, "before_update");
                }
            }
            const update = Object.assign({
                kind: kind || "unknown",
                at: new Date().toISOString(),
                tMs: roundMs(perfNow - startedAtMs),
                packet: copyLastState(lastState.packet),
                opcode: lastState.opcode
            }, data || {});
            syncState.lastUsefulEntityUpdateAtMs = perfNow;
            syncState.lastUsefulEntityUpdateAt = update.at;
            syncState.lastUsefulEntityUpdate = update;
            syncState.lastEntityUpdateThresholdMs = 0;
        },
        noteTargetSelection(targetId, targetType = null, data = null) {
            if (!enabled || targetId == null) return;
            const perfNow = nowMs();
            const snapshot = collectSnapshot();
            syncState.pendingTargetSelection = Object.assign({
                targetId: targetId,
                targetType: targetType || null,
                selectedAt: new Date().toISOString(),
                selectedAtMs: perfNow,
                map: snapshot.map,
                rxQueue: snapshot.rxQueue,
                lastPacket: copyLastState(lastState.packet),
                lastOpcode: lastState.opcode
            }, data || {});
        },
        noteTargetInfoApplied(targetId, data = null) {
            if (!enabled || targetId == null || !syncState.pendingTargetSelection) return;
            if (String(syncState.pendingTargetSelection.targetId) !== String(targetId)) return;
            const perfNow = nowMs();
            const duration = perfNow - syncState.pendingTargetSelection.selectedAtMs;
            const threshold = getSyncThreshold(duration);
            const snapshot = collectSnapshot();
            if (threshold) {
                record("target_info_delay", Object.assign({
                    durationMs: roundMs(duration),
                    thresholdMs: threshold,
                    category: getSyncCategory(duration),
                    targetId: targetId,
                    targetType: syncState.pendingTargetSelection.targetType,
                    selectedAt: syncState.pendingTargetSelection.selectedAt,
                    infoAppliedAt: new Date().toISOString(),
                    currentWsReceiveGapMs: getCurrentWsReceiveGapMs(perfNow),
                    currentEntityUpdateGapMs: getCurrentEntityUpdateGapMs(perfNow),
                    rxQueue: snapshot.rxQueue,
                    lastPacket: copyLastState(lastState.packet),
                    lastOpcode: lastState.opcode,
                    snapshot: snapshot
                }, data || {}, getSyncContext(snapshot, perfNow)));
            }
            syncState.pendingTargetSelection = null;
        },
        beginRxDrain() {
            if (!enabled) return null;
            syncState.activeDrain = {
                startedAtMs: nowMs(),
                opcodes: Object.create(null)
            };
            return syncState.activeDrain;
        },
        endRxDrain(token) {
            if (!enabled || !token || syncState.activeDrain !== token) return [];
            const top = topOpcodeList(token.opcodes);
            syncState.activeDrain = null;
            return top;
        },
        notePacket(opcode, parts, startIndex) {
            if (!enabled) return;
            const perfNow = nowMs();
            const normalized = normalizeOpcodeForStats(opcode, parts, startIndex);
            const bin = getCurrentSecondBin(perfNow);
            bin.packets++;
            bin.opcodes[normalized] = (bin.opcodes[normalized] || 0) + 1;
            if (syncState.activeDrain && syncState.activeDrain.opcodes) {
                syncState.activeDrain.opcodes[normalized] = (syncState.activeDrain.opcodes[normalized] || 0) + 1;
            }
            lastState.opcode = normalized;
            lastState.packet = {
                opcode: opcode || "",
                normalizedOpcode: normalized,
                prefix: packetPrefix(parts || [], startIndex || 0),
                partCount: parts && parts.length || 0,
                at: new Date().toISOString(),
                tMs: roundMs(perfNow - startedAtMs)
            };
        },
        recordPacketHandler(opcode, durationMs, parts, startIndex) {
            if (!enabled) return;
            const normalized = normalizeOpcodeForStats(opcode, parts, startIndex);
            lastState.handler = {
                opcode: opcode || "",
                normalizedOpcode: normalized,
                durationMs: roundMs(durationMs),
                prefix: packetPrefix(parts || [], startIndex || 0),
                at: new Date().toISOString(),
                tMs: roundMs(nowMs() - startedAtMs)
            };
            if (durationMs < ANDRO_PERF_THRESHOLDS.packetHandlerWarnMs) return;
            record("packet_handler_slow", {
                opcode: opcode || "",
                normalizedOpcode: normalized,
                durationMs: roundMs(durationMs),
                prefix: packetPrefix(parts || [], startIndex || 0),
                partCount: parts && parts.length || 0
            });
        },
        recordRxDrain(data) {
            if (!enabled || !data) return;
            const duration = Number(data.durationMs || 0);
            const backlogBefore = Number(data.backlogBefore || 0);
            const backlogAfter = Number(data.backlogAfter || 0);
            const processed = Number(data.processed || 0);
            const bin = getCurrentSecondBin();
            bin.drains++;
            bin.maxRxBacklog = Math.max(bin.maxRxBacklog, backlogBefore, backlogAfter);
            const topOpcodes = Array.isArray(data.topOpcodes) ? data.topOpcodes : [];
            const recentGap = syncState.lastSignificantGap;
            if (recentGap && processed > 0 && nowMs() - recentGap.atMs <= ANDRO_PERF_THRESHOLDS.packetBurstAfterGapRecentMs) {
                const bursty = processed >= ANDRO_PERF_THRESHOLDS.rxBurstPacketsWarn || backlogBefore >= ANDRO_PERF_THRESHOLDS.rxBurstPacketsWarn || backlogAfter >= ANDRO_PERF_THRESHOLDS.rxBurstPacketsWarn || duration >= ANDRO_PERF_THRESHOLDS.rxDrainWarnMs;
                const lastBurstAt = syncState.lastPacketBurstRecordAtMs || 0;
                if (bursty && nowMs() - lastBurstAt >= ANDRO_PERF_THRESHOLDS.syncGapThrottleMs) {
                    syncState.lastPacketBurstRecordAtMs = nowMs();
                    record("packet_burst_after_gap", {
                        previousGapMs: recentGap.durationMs,
                        previousGapSource: recentGap.source,
                        previousGapThresholdMs: recentGap.thresholdMs,
                        processed: processed,
                        backlogBefore: backlogBefore,
                        backlogAfter: backlogAfter,
                        durationMs: roundMs(duration),
                        topOpcodes: topOpcodes,
                        budgetMs: data.budgetMs,
                        maxLines: data.maxLines
                    });
                    syncState.lastSignificantGap = null;
                }
            }
            if (duration < ANDRO_PERF_THRESHOLDS.rxDrainWarnMs && backlogBefore < ANDRO_PERF_THRESHOLDS.rxBacklogWarn && backlogAfter < ANDRO_PERF_THRESHOLDS.rxBacklogWarn && processed < ANDRO_PERF_THRESHOLDS.rxBurstPacketsWarn) return;
            record("rx_drain_slow", {
                durationMs: roundMs(duration),
                processed: processed,
                backlogBefore: backlogBefore,
                backlogAfter: backlogAfter,
                topOpcodes: topOpcodes,
                budgetMs: data.budgetMs,
                maxLines: data.maxLines
            });
        },
        recordRender(label, durationMs, extra = null) {
            if (!enabled) return;
            const bin = getCurrentSecondBin();
            const duration = Number(durationMs || 0);
            if (label === "drawTotal") {
                bin.maxDrawTotal = Math.max(bin.maxDrawTotal, duration);
                bin.drawTotalSum += duration;
                bin.drawTotalCount++;
            } else if (label === "drawEntities") {
                bin.maxDrawEntities = Math.max(bin.maxDrawEntities, duration);
                bin.drawEntitiesSum += duration;
                bin.drawEntitiesCount++;
            } else if (label === "drawMiniMap" || label === "minimapRebuild") {
                bin.maxDrawMiniMap = Math.max(bin.maxDrawMiniMap, duration);
                bin.drawMiniMapSum += duration;
                bin.drawMiniMapCount++;
            } else if (label === "drawLaserBeams") bin.maxDrawLaserBeams = Math.max(bin.maxDrawLaserBeams, duration);
            else if (label === "drawExplosions") bin.maxDrawExplosions = Math.max(bin.maxDrawExplosions, duration);
            lastState.draw = {
                label: label,
                durationMs: roundMs(duration),
                at: new Date().toISOString(),
                tMs: roundMs(nowMs() - startedAtMs)
            };
            const threshold = getRenderWarnThreshold(label);
            if (durationMs < threshold) return;
            record("draw_slow", Object.assign({
                label: label,
                durationMs: roundMs(durationMs),
                thresholdMs: threshold
            }, extra || {}));
        },
        recordCleanup(label, durationMs, data = null) {
            if (!enabled) return;
            const duration = Number(durationMs || 0);
            const bin = getCurrentSecondBin();
            bin.maxCleanup = Math.max(bin.maxCleanup, duration);
            lastState.cleanup = {
                label: label,
                durationMs: roundMs(duration),
                at: new Date().toISOString(),
                tMs: roundMs(nowMs() - startedAtMs)
            };
            if (durationMs < ANDRO_PERF_THRESHOLDS.cleanupWarnMs) return;
            record("cleanup_slow", Object.assign({
                label: label,
                durationMs: roundMs(durationMs),
                thresholdMs: ANDRO_PERF_THRESHOLDS.cleanupWarnMs
            }, data || {}));
        },
        summary() {
            return {
                enabled: enabled,
                startedAt: startedAtIso,
                uptimeMs: roundMs(nowMs() - startedAtMs),
                eventCount: events.length,
                counts: Object.assign({}, counts),
                opcodeCounts: Object.assign({}, opcodeCounts),
                slowest: JSON.parse(JSON.stringify(slowest)),
                maxWsReceiveGapMs: roundMs(syncState.maxWsReceiveGapMs),
                maxEntityUpdateGapMs: roundMs(syncState.maxEntityUpdateGapMs),
                maxTargetInfoDelayMs: roundMs(syncState.maxTargetInfoDelayMs),
                maxPacketBurstAfterGapMs: roundMs(syncState.maxPacketBurstAfterGapMs),
                lastWsReceiveGap: copyLastState(syncState.lastWsReceiveGap),
                lastEntityUpdateGap: copyLastState(syncState.lastEntityUpdateGap),
                lastTargetInfoDelay: copyLastState(syncState.lastTargetInfoDelay),
                lastPacketBurstAfterGap: copyLastState(syncState.lastPacketBurstAfterGap),
                lastSyncFreeze: copyLastState(syncState.lastSyncFreeze),
                probableReason: syncState.probableReason,
                topSyncFreezeEvents: getTopSyncFreezeEvents(),
                snapshot: collectSnapshot(),
                lifecycle: Object.assign({}, lifecycle),
                workerHeartbeat: Object.assign({}, workerState),
                last: JSON.parse(JSON.stringify(lastState)),
                recentBins: getRecentBins(ANDRO_PERF_THRESHOLDS.secondBinCount),
                memory: getMemorySnapshot(),
                thresholds: ANDRO_PERF_THRESHOLDS
            };
        },
        dump() {
            return JSON.stringify({
                generatedAt: new Date().toISOString(),
                summary: api.summary(),
                recentBins: getRecentBins(ANDRO_PERF_THRESHOLDS.secondBinCount),
                events: events.slice()
            }, null, 2);
        },
        clear() {
            events.length = 0;
            for (const key of Object.keys(counts)) delete counts[key];
            for (const key of Object.keys(opcodeCounts)) delete opcodeCounts[key];
            for (const key of Object.keys(slowest)) delete slowest[key];
            for (const key of Object.keys(lastRecordAtByKey)) delete lastRecordAtByKey[key];
            secondBins.length = 0;
            resetSyncStateForClear();
            seq = 1;
            return api.summary();
        },
        copy() {
            const text = api.dump();
            if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
                return navigator.clipboard.writeText(text).then(() => text);
            }
            try {
                if (typeof window.copy === "function") {
                    window.copy(text);
                    return text;
                }
            } catch (_) {}
            console.warn("[AndroPerf] Clipboard API unavailable; use copy(AndroPerf.dump()) in DevTools.");
            return text;
        }
    };

    window.AndroPerf = api;

    if (enabled) {
        installLifecycleHooks();
        installLongTaskObserver();
        installWorkerHeartbeat();
        recordLifecycleEvent("profiler-start", {
            visibilityState: lifecycle.visibilityState,
            focused: lifecycle.focused
        });
    }

    if (enabled && typeof requestAnimationFrame === "function") {
        let lastFrameAt = 0;
        const tick = ts => {
            if (typeof document !== "undefined" && document.hidden) {
                lastFrameAt = ts;
            } else if (lastFrameAt > 0) {
                api.recordFrameGap(ts - lastFrameAt);
            }
            api.tickSyncWatchdog();
            lastFrameAt = ts;
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }
})();

function __androPerfNoteEntityUpdate(kind, data = null) {
    const perf = window.AndroPerf;
    if (perf && perf.enabled && typeof perf.noteEntityUsefulUpdate === "function") {
        perf.noteEntityUsefulUpdate(kind, data || null);
    }
}

function __androPerfNoteTargetInfoApplied(targetId, packetKind, data = null) {
    const perf = window.AndroPerf;
    if (!perf || !perf.enabled || typeof perf.noteTargetInfoApplied !== "function") return;
    let ent = null;
    try {
        ent = targetId != null && typeof entities !== "undefined" ? entities[targetId] : null;
    } catch (_) {}
    perf.noteTargetInfoApplied(targetId, Object.assign({
        packetKind: packetKind || null,
        targetType: ent && ent.kind || null,
        hpKnown: !!(ent && ent.hp != null),
        shieldKnown: !!(ent && ent.shield != null),
        nameKnown: !!(ent && ent.name)
    }, data || {}));
}

let ws = null;

let wsConnecting = false;

let wsReconnectTimer = null;

let wsReconnectAttempts = 0;

let wsManualClose = false;

let wsPageUnloading = false;

let wsConnectWatchdogTimer = null;

let wsEverReceived = false;

let wsLoginAttemptPending = false;

const pendingAttackLocksByAttackerId = new Map();

const attackLockAttackersByTargetId = new Map();

function resetWsLoginAttempt(reason = "") {
    wsLoginAttemptPending = false;
}

window.__ANDRO_WS_CONNECTED = false;

function dispatchWsEvent(name, detail) {
    try {
        window.dispatchEvent(new CustomEvent(name, {
            detail: detail || {}
        }));
    } catch (e) {
        try {
            window.dispatchEvent(new Event(name));
        } catch {}
    }
}

window.addEventListener("beforeunload", () => {
    wsPageUnloading = true;
    wsManualClose = true;
    chatManualClose = true;
    clearWsConnectWatchdog();
    clearChatReconnectTimer();
    stopChatHeartbeat();
    try {
        if (chatWs && chatWs.readyState === WebSocket.OPEN) {
            chatWs.close(1e3, "page unload");
        }
    } catch {}
    try {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close(1e3, "page unload");
        }
    } catch {}
});

let heroLoaded = false;

let mapLoaded = false;

let sentRdyMap = false;

let mapLoadedMarkTimer = null;

let mapLoadedMarkTimerType = "";

function cancelPendingMapLoadedMark() {
    if (!mapLoadedMarkTimer) return;
    if (mapLoadedMarkTimerType === "raf" && typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(mapLoadedMarkTimer);
    } else {
        clearTimeout(mapLoadedMarkTimer);
    }
    mapLoadedMarkTimer = null;
    mapLoadedMarkTimerType = "";
}

function queueMapLoaded(reason = "") {
    if (mapLoaded) {
        trySendRdyMap();
        return;
    }
    cancelPendingMapLoadedMark();
    const commit = () => {
        mapLoadedMarkTimer = null;
        mapLoadedMarkTimerType = "";
        mapLoaded = true;
        trySendRdyMap();
    };
    if (typeof requestAnimationFrame === "function") {
        mapLoadedMarkTimerType = "raf";
        mapLoadedMarkTimer = requestAnimationFrame(commit);
    } else {
        mapLoadedMarkTimerType = "timeout";
        mapLoadedMarkTimer = setTimeout(commit, 0);
    }
}

function resetReadyFlags() {
    cancelPendingMapLoadedMark();
    heroLoaded = false;
    mapLoaded = false;
    sentRdyMap = false;
}

function trySendRdyMap() {
    if (!sentRdyMap && heroLoaded && mapLoaded) {
        sendRaw("RDY|MAP");
        sentRdyMap = true;
    }
}

let pingTimerId = null;

function startPingTimer() {
    stopPingTimer();
    sendRaw("PNG");
    pingTimerId = setInterval(() => {
        sendRaw("PNG");
    }, 25e3);
}

function stopPingTimer() {
    if (pingTimerId) {
        clearInterval(pingTimerId);
        pingTimerId = null;
    }
}

function showFlashConnectionInfoWindowSafe() {
    try {
        if (typeof window.showConnectionInfoWindow === "function") {
            window.showConnectionInfoWindow();
        }
    } catch (_) {}
}

function removeFlashConnectionInfoWindowSafe() {
    try {
        if (typeof window.removeConnectionWindow === "function") {
            window.removeConnectionWindow();
        } else if (typeof window.removeConnectionInfoWindow === "function") {
            window.removeConnectionInfoWindow();
        }
    } catch (_) {}
}

function showFlashConnectionLostWindowSafe() {
    try {
        if (typeof window.showConnectionLostWindow === "function") {
            window.showConnectionLostWindow();
        }
    } catch (_) {}
}

function hideFlashConnectionLostWindowSafe() {
    try {
        if (typeof window.hideConnectionLostWindow === "function") {
            window.hideConnectionLostWindow();
        }
    } catch (_) {}
}

if (typeof window.__ANDRO_AUDIO_SETTINGS_READY !== "boolean") {
    window.__ANDRO_AUDIO_SETTINGS_READY = false;
}

if (!Array.isArray(window.__ANDRO_FLASH_SETTINGS_CHUNK)) {
    window.__ANDRO_FLASH_SETTINGS_CHUNK = null;
}

const __audioSettingsPacketSeen = {
    PLAY_MUSIC: false,
    PLAY_SFX: false
};

let __audioSettingsApplyTimer = null;

function markServerAudioSettingsReady(reason = "") {
    if (__audioSettingsApplyTimer) {
        clearTimeout(__audioSettingsApplyTimer);
    }
    __audioSettingsApplyTimer = setTimeout(() => {
        __audioSettingsApplyTimer = null;
        window.__ANDRO_AUDIO_SETTINGS_READY = true;
        try {
            if (window.AudioManager && typeof window.AudioManager.onSettingsChanged === "function") {
                window.AudioManager.onSettingsChanged();
            }
        } catch (_) {}
        try {
            if (typeof window.__ANDRO_TRY_PLAY_STARTUP_SOUNDS === "function") {
                window.__ANDRO_TRY_PLAY_STARTUP_SOUNDS(reason || "audio-settings-ready");
            }
        } catch (_) {}
    }, 0);
}

function applySelectedRocketFromServer(rawValue, source = "") {
    const rocketId = parseInt(rawValue, 10);
    if (isNaN(rocketId) || rocketId <= 0) return false;
    const prevRocketId = Number(currentRocketId) || 0;
    try {
        currentRocketId = rocketId;
    } catch (_) {}
    if (Array.isArray(window.__ANDRO_FLASH_SETTINGS_CHUNK)) {
        while (window.__ANDRO_FLASH_SETTINGS_CHUNK.length <= 16) {
            window.__ANDRO_FLASH_SETTINGS_CHUNK.push("1");
        }
        window.__ANDRO_FLASH_SETTINGS_CHUNK[16] = String(rocketId);
    }
    const changed = prevRocketId !== rocketId;
    if (changed) {
        try {
            if (typeof renderActionDrawerItems === "function") {
                renderActionDrawerItems();
            }
        } catch (_) {}
        try {
            if (typeof drawQuickbar === "function") {
                drawQuickbar();
            }
        } catch (_) {}
    }
    return changed;
}

function applySelectedAmmoFromServer(rawValue, source = "") {
    const ammoId = parseInt(rawValue, 10);
    if (isNaN(ammoId) || ammoId <= 0) return false;
    const prevAmmoId = Number(currentAmmoId) || 0;
    try {
        currentAmmoId = ammoId;
        if (ammoId !== RSB_AMMO_ID) {
            primaryAmmoId = ammoId;
        }
    } catch (_) {}
    if (Array.isArray(window.__ANDRO_FLASH_SETTINGS_CHUNK)) {
        while (window.__ANDRO_FLASH_SETTINGS_CHUNK.length <= 15) {
            window.__ANDRO_FLASH_SETTINGS_CHUNK.push("1");
        }
        window.__ANDRO_FLASH_SETTINGS_CHUNK[15] = String(ammoId);
    }
    const changed = prevAmmoId !== ammoId;
    const sabAmmoId = typeof SAB_AMMO_ID !== "undefined" ? Number(SAB_AMMO_ID) : 5;
    if (Number.isFinite(sabAmmoId) && ammoId !== sabAmmoId && typeof clearSabLaserVisualJobsForLocalHero === "function") {
        clearSabLaserVisualJobsForLocalHero();
    }
    if (changed) {
        try {
            if (typeof renderActionDrawerItems === "function") {
                renderActionDrawerItems();
            }
        } catch (_) {}
        try {
            if (typeof drawQuickbar === "function") {
                drawQuickbar();
            }
        } catch (_) {}
    }
    return changed;
}

function shouldIgnoreConflictingStartupAudioSetting(settingKey, settingValue) {
    const keyUpper = String(settingKey || "").toUpperCase();
    if (keyUpper !== "PLAY_MUSIC" && keyUpper !== "PLAY_SFX") {
        return false;
    }
    if (window.__ANDRO_HAS_INITIAL_RDY_I) {
        return false;
    }
    if (!Array.isArray(window.__ANDRO_FLASH_SETTINGS_CHUNK)) {
        return false;
    }
    const index = keyUpper === "PLAY_SFX" ? 11 : 12;
    const flashValue = String(window.__ANDRO_FLASH_SETTINGS_CHUNK[index] ?? "");
    const incomingValue = String(settingValue ?? "");
    if (flashValue !== "0" && flashValue !== "1" || incomingValue === flashValue) {
        return false;
    }
    console.warn("[AUDIO] Ignoring conflicting startup audio setting packet", {
        key: keyUpper,
        incomingValue: incomingValue,
        flashValue: flashValue
    });
    return true;
}

function updateFlashSettingsChunkFromIndividualSetting(settingKey, settingValue) {
    if (!settingKey || settingValue === undefined || settingValue === null) return;
    if (!Array.isArray(window.__ANDRO_FLASH_SETTINGS_CHUNK)) return;
    const value = String(settingValue);
    switch (String(settingKey).toUpperCase()) {
      case "DISPLAY_PLAYER_NAMES":
        window.__ANDRO_FLASH_SETTINGS_CHUNK[4] = value;
        break;

      case "DISPLAY_ORE":
        window.__ANDRO_FLASH_SETTINGS_CHUNK[7] = value;
        break;

      case "DISPLAY_BONUS_BOXES":
        window.__ANDRO_FLASH_SETTINGS_CHUNK[8] = value;
        break;

      case "PLAY_SFX":
        window.__ANDRO_FLASH_SETTINGS_CHUNK[11] = value;
        break;

      case "PLAY_MUSIC":
        window.__ANDRO_FLASH_SETTINGS_CHUNK[12] = value;
        break;

      case "SELECTED_ROCKET":
        window.__ANDRO_FLASH_SETTINGS_CHUNK[16] = value;
        break;

      case "DISPLAY_FREE_CARGO_BOXES":
        window.__ANDRO_FLASH_SETTINGS_CHUNK[21] = value;
        break;

      case "DISPLAY_NOT_FREE_CARGO_BOXES":
        window.__ANDRO_FLASH_SETTINGS_CHUNK[22] = value;
        break;

      default:
        break;
    }
}

function applyFlashSettingsChunk(chunkParts) {
    const chunk = Array.isArray(chunkParts) ? chunkParts.map(value => String(value ?? "")) : [];
    if (!chunk.length) return;
    window.__ANDRO_FLASH_SETTINGS_CHUNK = chunk.slice();
    const state = {
        SHOW_PLAYER_NAMES: chunk[4] === "1",
        SHOW_RESOURCES: chunk[7] === "1",
        SHOW_BONUS_BOXES: chunk[8] === "1",
        PLAY_SFX: chunk[11] === "1",
        PLAY_MUSIC: chunk[12] === "1",
        SHOW_CARGO_BOXES: chunk[21] === "1" && chunk[22] === "1"
    };
    if (typeof window.__applySettingsStateFromServer === "function") {
        window.__applySettingsStateFromServer(state, {
            freeCargo: chunk[21] === "1",
            notFreeCargo: chunk[22] === "1"
        });
    } else {
        try {
            setting_show_player_names = !!state.SHOW_PLAYER_NAMES;
        } catch (_) {}
        try {
            setting_play_sfx = !!state.PLAY_SFX;
        } catch (_) {}
        try {
            setting_play_music = !!state.PLAY_MUSIC;
        } catch (_) {}
        try {
            VISIBILITY_SETTINGS.freeCargo = chunk[21] === "1";
            VISIBILITY_SETTINGS.notFreeCargo = chunk[22] === "1";
            VISIBILITY_SETTINGS.ore = !!state.SHOW_RESOURCES;
            VISIBILITY_SETTINGS.bonusBoxes = !!state.SHOW_BONUS_BOXES;
        } catch (_) {}
        try {
            backgroundLayersEnabled = !!backgroundLayersEnabled;
        } catch (_) {}
        try {
            if (window.AudioManager && typeof window.AudioManager.onSettingsChanged === "function") {
                window.AudioManager.onSettingsChanged();
            }
        } catch (_) {}
    }
    applySelectedAmmoFromServer(chunk[15], "A|SET");
    applySelectedRocketFromServer(chunk[16], "A|SET");
    __audioSettingsPacketSeen.PLAY_MUSIC = true;
    __audioSettingsPacketSeen.PLAY_SFX = true;
    markServerAudioSettingsReady("A|SET");
}

function hardCloseSocketInstance(socket, reason) {
    if (!socket) return;
    try {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
    } catch (_) {}
    try {
        socket.close(1e3, reason || "manual close");
    } catch (_) {}
}

function clearWsConnectWatchdog() {
    if (!wsConnectWatchdogTimer) return;
    clearTimeout(wsConnectWatchdogTimer);
    wsConnectWatchdogTimer = null;
}

function armWsConnectWatchdog(socket, url) {
    clearWsConnectWatchdog();
    wsConnectWatchdogTimer = setTimeout(() => {
        if (ws !== socket) return;
        if (!socket || socket.readyState !== WebSocket.CONNECTING) return;
        console.warn(`[WS] Connection timeout to ${url}`);
        wsConnecting = false;
        window.__ANDRO_WS_CONNECTED = false;
        netBuffer = "";
        wsUsesNullDelimiter = false;
        resetReadyFlags();
        dispatchWsEvent("andromeda:ws-startup-failed", {
            code: 0,
            reason: "connect-timeout",
            clean: false
        });
        showFlashConnectionLostWindowSafe();
        hardCloseSocketInstance(socket, "connect timeout");
        if (ws === socket) {
            ws = null;
        }
    }, 8e3);
}

function clearChatReconnectTimer() {
    if (!chatReconnectTimer) return;
    clearTimeout(chatReconnectTimer);
    chatReconnectTimer = null;
}

function scheduleChatReconnect(reason = "") {
    if (wsPageUnloading || wsManualClose || !window.__ANDRO_WS_CONNECTED) return;
    if (chatWs && (chatWs.readyState === WebSocket.OPEN || chatWs.readyState === WebSocket.CONNECTING)) return;
    if (chatReconnectTimer) return;
    const delay = Math.min(5000, 750 * Math.pow(2, Math.min(chatReconnectAttempts, 3)));
    chatReconnectAttempts += 1;
    console.warn(`[CHAT-WS] Scheduling reconnect in ${delay}ms${reason ? ` (${reason})` : ""}.`);
    chatReconnectTimer = setTimeout(() => {
        chatReconnectTimer = null;
        if (wsPageUnloading || wsManualClose || !window.__ANDRO_WS_CONNECTED) return;
        if (heroId && heroId > 0) connectToChat(); else startChatInitMonitor();
    }, delay);
}

function ensureChatConnection(reason = "") {
    if (chatWs && (chatWs.readyState === WebSocket.OPEN || chatWs.readyState === WebSocket.CONNECTING)) return;
    scheduleChatReconnect(reason || "ensure-chat");
}

window.ensureChatConnection = ensureChatConnection;

function closeChatConnectionForDisconnect(reason) {
    clearChatReconnectTimer();
    stopChatHeartbeat();
    chatManualClose = true;
    chatServerFrameSeen = false;
    if (chatWs) {
        hardCloseSocketInstance(chatWs, reason || "game disconnect");
    }
    chatWs = null;
    chatBuffer = "";
    chatUsesNullDelimiter = false;
}

function reconnectToCurrentMap() {
    if (wsReconnectTimer) {
        clearTimeout(wsReconnectTimer);
        wsReconnectTimer = null;
    }
    wsManualClose = true;
    resetWsLoginAttempt("manual-reconnect");
    stopPingTimer();
    clearWsConnectWatchdog();
    hardCloseSocketInstance(ws, "manual reconnect");
    ws = null;
    wsConnecting = false;
    closeChatConnectionForDisconnect("manual reconnect");
    netBuffer = "";
    wsUsesNullDelimiter = false;
    window.__ANDRO_WS_CONNECTED = false;
    wsManualClose = false;
    hideFlashConnectionLostWindowSafe();
    connectToServer(true);
    if (heroId && heroId > 0) connectToChat(); else startChatInitMonitor();
}

window.reconnectToCurrentMap = reconnectToCurrentMap;

let chatWs = null;

let chatReconnectTimer = null;

let chatReconnectAttempts = 0;

let chatManualClose = false;

let chatHeartbeatTimer = null;

let chatServerFrameSeen = false;

let lastChatReconnectNoticeAt = 0;

const CHAT_HEARTBEAT_INTERVAL_MS = 20000;

const CHAT_RECONNECT_NOTICE_COOLDOWN_MS = 8000;

const chatStartupNoticeKeysSeen = new Set();

function sendChatRaw(line, socketInstance = chatWs) {
    if (!socketInstance || socketInstance.readyState !== WebSocket.OPEN) return false;
    try {
        let payload = String(line || "");
        if (!payload.endsWith("\0")) payload += "\0";
        socketInstance.send(payload);
        return true;
    } catch (e) {
        console.warn("[CHAT-WS] Send failed:", e);
        return false;
    }
}

function startChatHeartbeat(socketInstance = chatWs) {
    stopChatHeartbeat();
    if (!socketInstance) return;
    chatHeartbeatTimer = setInterval(() => {
        if (chatWs !== socketInstance || !socketInstance || socketInstance.readyState !== WebSocket.OPEN) {
            stopChatHeartbeat();
            return;
        }
        sendChatRaw("PNG", socketInstance);
    }, CHAT_HEARTBEAT_INTERVAL_MS);
}

function stopChatHeartbeat() {
    if (chatHeartbeatTimer) {
        clearInterval(chatHeartbeatTimer);
        chatHeartbeatTimer = null;
    }
}

function markChatServerFrameSeen() {
    if (!chatServerFrameSeen) {
        chatServerFrameSeen = true;
    }
    chatReconnectAttempts = 0;
}

function normalizeChatStartupNoticeKey(value) {
    const text = String(value || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    if (!text) return "";
    if (text.includes("welcome on") && text.includes("andromeda")) return "welcome";
    if (text.includes("official global chat") && text.includes("respect the rules")) return "global-rules";
    return "";
}

function shouldSuppressRepeatedChatStartupNotice(value) {
    const key = normalizeChatStartupNoticeKey(value);
    if (!key) return false;
    if (chatStartupNoticeKeysSeen.has(key)) return true;
    chatStartupNoticeKeysSeen.add(key);
    return false;
}

function addThrottledChatReconnectNotice(roomId = chatCurrentRoomId) {
    const now = Date.now();
    if (now - lastChatReconnectNoticeAt < CHAT_RECONNECT_NOTICE_COOLDOWN_MS) return;
    lastChatReconnectNoticeAt = now;
    addChatSystemLikeMessage("Chat connection lost. Reconnecting...", roomId, "chatSystem");
}

let netBuffer = "";

let chatBuffer = "";

let wsUsesNullDelimiter = false;

let chatUsesNullDelimiter = false;

const COLLECTABLE_ID_PREFIX = "c:";

function makeCollectableEntityId(rawId) {
    return COLLECTABLE_ID_PREFIX + String(rawId);
}

function extractCollectableServerId(entityId) {
    if (typeof entityId === "string" && entityId.startsWith(COLLECTABLE_ID_PREFIX)) {
        return entityId.slice(COLLECTABLE_ID_PREFIX.length);
    }
    return String(entityId);
}

function resolveEntityKeyFromServerId(rawId) {
    if (rawId == null || rawId === "") return null;
    if (typeof entities !== "undefined" && entities[rawId]) return rawId;
    if (/^\d+$/.test(rawId)) {
        const num = parseInt(rawId, 10);
        if (typeof entities !== "undefined" && entities[num]) return num;
    }
    const cKey = makeCollectableEntityId(rawId);
    if (typeof entities !== "undefined" && entities[cKey]) return cKey;
    return null;
}

const WS_TEXT_DECODER = new TextDecoder("utf-8");

let __andromedaRxChain = Promise.resolve();

const RX_DRAIN_BASE_BUDGET_MS = 4;
const RX_DRAIN_MAX_BUDGET_MS = 10;
const RX_DRAIN_BASE_MAX_LINES = 96;
const RX_DRAIN_HARD_MAX_LINES = 384;
const RX_CHAT_MAX_LINES_PER_DRAIN = 32;
const RX_MOVE_COALESCE_BACKLOG = 160;
const RX_PRIORITY_SCAN_BACKLOG = 96;
const RX_PRIORITY_SCAN_LIMIT = 256;

const __andromedaRxQueues = {
    game: {
        lines: [],
        head: 0
    },
    chat: {
        lines: [],
        head: 0
    }
};

const __rxPendingMoveByKey = new Map();
const __rxEntityLifecycleSeqById = Object.create(null);

let __andromedaRxDrainScheduled = false;

function __rxNowMs() {
    return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
}

function __getRxQueueState(channel) {
    return channel === "chat" ? __andromedaRxQueues.chat : __andromedaRxQueues.game;
}

function __getRxBacklog(channel) {
    const q = __getRxQueueState(channel);
    return Math.max(0, q.lines.length - q.head);
}

function __compactRxQueueIfNeeded(channel) {
    const q = __getRxQueueState(channel);
    if (q.head <= 0) return;
    if (q.head < 1024 && q.head * 2 < q.lines.length) return;
    q.lines.splice(0, q.head);
    q.head = 0;
}

function __clearRxQueue(channel = null) {
    if (!channel || channel === "game") {
        const game = __andromedaRxQueues.game;
        game.lines.length = 0;
        game.head = 0;
        __rxPendingMoveByKey.clear();
        for (const id in __rxEntityLifecycleSeqById) delete __rxEntityLifecycleSeqById[id];
    }
    if (!channel || channel === "chat") {
        const chat = __andromedaRxQueues.chat;
        chat.lines.length = 0;
        chat.head = 0;
    }
}

function __scheduleRxDrain() {
    if (__andromedaRxDrainScheduled) return;
    __andromedaRxDrainScheduled = true;
    const run = () => __drainRxQueue();
    if (typeof requestAnimationFrame === "function" && !(typeof document !== "undefined" && document.hidden)) {
        requestAnimationFrame(run);
    } else {
        setTimeout(run, 0);
    }
}

function __extractRxOpcodeAndArgs(line) {
    const parts = String(line || "").split("|");
    if (parts.length === 0) return null;
    let opcode = parts[0];
    let startIndex = 1;
    if (opcode === "0") {
        opcode = parts[1] || "";
        startIndex = 2;
    }
    if (!opcode) return null;
    return {
        opcode: opcode,
        args: parts.slice(startIndex)
    };
}

function __getRxLifecycleSeq(entityId) {
    const key = String(entityId);
    return __rxEntityLifecycleSeqById[key] || 0;
}

function __bumpRxLifecycleSeq(entityId) {
    const key = String(entityId);
    __rxEntityLifecycleSeqById[key] = (__rxEntityLifecycleSeqById[key] || 0) + 1;
    return __rxEntityLifecycleSeqById[key];
}

function __annotateGameRxItem(item) {
    const meta = __extractRxOpcodeAndArgs(item.line);
    if (!meta) return item;
    item.opcode = meta.opcode;
    const args = meta.args;
    if (item.opcode === "1") {
        const isHeroCorrection = args.length === 3;
        const entityId = isHeroCorrection ? null : parseInt(args[0], 10);
        if (!isHeroCorrection && Number.isFinite(entityId)) {
            item.targetEntityId = entityId;
            item.coalesceKey = String(entityId) + ":" + __getRxLifecycleSeq(entityId);
        }
        return item;
    }
    if (item.opcode === "Y") {
        const targetId = parseInt(args[1], 10);
        if (Number.isFinite(targetId)) item.targetEntityId = targetId;
        return item;
    }
    if (item.opcode === "N" || item.opcode === "C" || item.opcode === "R" || item.opcode === "K" || item.opcode === "2") {
        const entityId = parseInt(args[0], 10);
        if (Number.isFinite(entityId)) {
            item.targetEntityId = entityId;
            if (item.opcode === "C" || item.opcode === "R" || item.opcode === "K" || item.opcode === "2") {
                item.lifecycleEntityId = entityId;
                __bumpRxLifecycleSeq(entityId);
            }
        }
    }
    return item;
}

function __queueRxLine(channel, line, fallback = false) {
    line = (line || "").trim();
    if (!line || line === "||") return;
    const q = __getRxQueueState(channel);
    const item = {
        channel: channel,
        line: line,
        fallback: !!fallback
    };
    if (channel === "game") {
        __annotateGameRxItem(item);
        if (item.coalesceKey) {
            const gameBacklog = __getRxBacklog("game");
            const previousMove = __rxPendingMoveByKey.get(item.coalesceKey);
            if (gameBacklog >= RX_MOVE_COALESCE_BACKLOG && previousMove && !previousMove.processed && !previousMove.priorityConsumed) {
                previousMove.obsolete = true;
            }
            __rxPendingMoveByKey.set(item.coalesceKey, item);
        }
    }
    q.lines.push(item);
    __scheduleRxDrain();
}

function __releaseQueuedRxItem(item) {
    if (!item) return;
    item.processed = true;
    if (item.coalesceKey && __rxPendingMoveByKey.get(item.coalesceKey) === item) {
        __rxPendingMoveByKey.delete(item.coalesceKey);
    }
    if (item.priorityTaken) {
        item.priorityConsumed = true;
    }
}

function __processQueuedRxLine(item) {
    if (!item || !item.line || item.obsolete || item.priorityConsumed) {
        __releaseQueuedRxItem(item);
        return false;
    }
    try {
        if (item.channel === "chat") {
            if (item.line.indexOf("%") !== -1) handleChatPacket(item.line); else handleServerLine(item.line);
        } else {
            handleServerLine(item.line);
        }
    } catch (e) {
        const prefix = item.channel === "chat" ? "[CHAT-WS]" : "[WS]";
        const mode = item.fallback ? " (fallback)" : "";
        console.error(`${prefix} Line processing error${mode}:`, e, item.line);
    } finally {
        __releaseQueuedRxItem(item);
    }
    return true;
}

function __takeNextRxItem(channel) {
    const q = __getRxQueueState(channel);
    while (q.head < q.lines.length) {
        const item = q.lines[q.head++];
        if (!item || item.obsolete || item.priorityConsumed) {
            __releaseQueuedRxItem(item);
            continue;
        }
        return item;
    }
    return null;
}

function __isPriorityGameRxItem(item, blockedEntityIds) {
    if (!item || item.obsolete || item.priorityConsumed) return false;
    const targetId = item.targetEntityId;
    const targetKey = targetId == null ? null : String(targetId);
    if (targetKey && blockedEntityIds && blockedEntityIds.has(targetKey)) return false;
    const pendingId = typeof pendingTargetSelectionId !== "undefined" ? pendingTargetSelectionId : null;
    const selectedId = typeof selectedTargetId !== "undefined" ? selectedTargetId : null;
    const hero = typeof heroId !== "undefined" ? heroId : null;
    if (item.opcode === "N") {
        if (pendingId != null && Number(targetId) === Number(pendingId)) return true;
        if (pendingId == null && selectedId != null && Number(targetId) === Number(selectedId)) return true;
        return false;
    }
    if (item.opcode === "Y") {
        if (hero != null && Number(targetId) === Number(hero)) return true;
        if (pendingId != null && Number(targetId) === Number(pendingId)) return true;
        if (selectedId != null && Number(targetId) === Number(selectedId)) return true;
    }
    return false;
}

function __takePriorityGameRxItem(scanLimit) {
    const q = __andromedaRxQueues.game;
    const end = Math.min(q.lines.length, q.head + Math.max(0, scanLimit || 0));
    const blockedEntityIds = new Set();
    for (let idx = q.head; idx < end; idx++) {
        const item = q.lines[idx];
        if (!item || item.obsolete || item.priorityConsumed) continue;
        if (item.lifecycleEntityId != null) blockedEntityIds.add(String(item.lifecycleEntityId));
        if (__isPriorityGameRxItem(item, blockedEntityIds)) {
            item.priorityTaken = true;
            return item;
        }
    }
    return null;
}

function __getRxDrainPlan(gameBacklog, chatBacklog) {
    const totalBacklog = gameBacklog + chatBacklog;
    let budgetMs = RX_DRAIN_BASE_BUDGET_MS;
    let maxLines = RX_DRAIN_BASE_MAX_LINES;
    if (gameBacklog >= 1500 || totalBacklog >= 1800) {
        budgetMs = RX_DRAIN_MAX_BUDGET_MS;
        maxLines = RX_DRAIN_HARD_MAX_LINES;
    } else if (gameBacklog >= 700 || totalBacklog >= 900) {
        budgetMs = 8;
        maxLines = 288;
    } else if (gameBacklog >= 250 || totalBacklog >= 350) {
        budgetMs = 6;
        maxLines = 192;
    }
    return {
        budgetMs: budgetMs,
        maxLines: maxLines,
        chatMaxLines: RX_CHAT_MAX_LINES_PER_DRAIN
    };
}

function __drainRxQueue() {
    __andromedaRxDrainScheduled = false;
    const startedAt = __rxNowMs();
    const perf = window.AndroPerf;
    const perfDrainToken = perf && perf.enabled && typeof perf.beginRxDrain === "function" ? perf.beginRxDrain() : null;
    const gameBacklogBefore = __getRxBacklog("game");
    const chatBacklogBefore = __getRxBacklog("chat");
    const plan = __getRxDrainPlan(gameBacklogBefore, chatBacklogBefore);
    let processed = 0;
    let processedChat = 0;
    let processedGame = 0;
    while (processed < plan.maxLines && __rxNowMs() - startedAt < plan.budgetMs) {
        let item = null;
        if (__getRxBacklog("game") > 0) {
            if (__getRxBacklog("game") >= RX_PRIORITY_SCAN_BACKLOG) {
                item = __takePriorityGameRxItem(RX_PRIORITY_SCAN_LIMIT);
            }
            if (!item) item = __takeNextRxItem("game");
        } else if (__getRxBacklog("chat") > 0 && processedChat < plan.chatMaxLines) {
            item = __takeNextRxItem("chat");
        } else {
            break;
        }
        if (!item) break;
        const applied = __processQueuedRxLine(item);
        if (applied) {
            processed++;
            if (item.channel === "chat") processedChat++; else processedGame++;
        }
    }
    __compactRxQueueIfNeeded("game");
    __compactRxQueueIfNeeded("chat");
    const topOpcodes = perfDrainToken && perf && typeof perf.endRxDrain === "function" ? perf.endRxDrain(perfDrainToken) : [];
    if (window.AndroPerf && window.AndroPerf.enabled) {
        window.AndroPerf.recordRxDrain({
            durationMs: __rxNowMs() - startedAt,
            processed: processed,
            processedGame: processedGame,
            processedChat: processedChat,
            backlogBefore: gameBacklogBefore + chatBacklogBefore,
            backlogBeforeGame: gameBacklogBefore,
            backlogBeforeChat: chatBacklogBefore,
            backlogAfter: __getRxBacklog("game") + __getRxBacklog("chat"),
            backlogAfterGame: __getRxBacklog("game"),
            backlogAfterChat: __getRxBacklog("chat"),
            topOpcodes: topOpcodes,
            budgetMs: plan.budgetMs,
            maxLines: plan.maxLines
        });
    }
    if (__getRxBacklog("game") > 0 || __getRxBacklog("chat") > 0) {
        __scheduleRxDrain();
    }
}

function __decodeWsPayload(raw) {
    try {
        if (raw == null) return Promise.resolve("");
        if (typeof raw === "string") return Promise.resolve(raw);
        if (raw instanceof ArrayBuffer) {
            return Promise.resolve(WS_TEXT_DECODER.decode(raw));
        }
        if (ArrayBuffer.isView(raw) && raw.buffer instanceof ArrayBuffer) {
            const slice = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
            return Promise.resolve(WS_TEXT_DECODER.decode(slice));
        }
        if (typeof Blob !== "undefined" && raw instanceof Blob) {
            return raw.arrayBuffer().then(ab => WS_TEXT_DECODER.decode(ab));
        }
        return Promise.resolve(String(raw));
    } catch (e) {
        try {
            return Promise.resolve(String(raw ?? ""));
        } catch {
            return Promise.resolve("");
        }
    }
}

function __enqueueRxFrame(channel, socketInstance, raw) {
    const isActiveSocket = channel === "game" && ws === socketInstance || channel === "chat" && chatWs === socketInstance;
    if (isActiveSocket && window.AndroPerf && window.AndroPerf.enabled && typeof window.AndroPerf.noteWsReceive === "function") {
        window.AndroPerf.noteWsReceive(channel);
    }
    __andromedaRxChain = __andromedaRxChain.then(async () => {
        if (channel === "game" && ws !== socketInstance) return;
        if (channel === "chat" && chatWs !== socketInstance) return;
        const text = await __decodeWsPayload(raw);
        if (!text) return;
        if (channel === "game") {
            if (!wsEverReceived) {
                wsEverReceived = true;
                wsReconnectAttempts = 0;
            }
            resetWsLoginAttempt("server-frame");
        }
        if (channel === "chat") {
            markChatServerFrameSeen();
        }
        if (channel === "game") {
            __processGameRxText(text);
        } else {
            __processChatRxText(text);
        }
    }).catch(e => {
        console.error(`[${channel === "chat" ? "CHAT-WS" : "WS"}] RX chain error:`, e);
    });
}

function __processGameRxText(raw) {
    if (!raw) return;
    netBuffer += raw;
    if (netBuffer.indexOf("\\") !== -1) {
        netBuffer = netBuffer.replace(/\\0/g, "\0");
    }
    const sawNull = netBuffer.indexOf("\0") !== -1;
    if (sawNull) wsUsesNullDelimiter = true;
    if (!wsUsesNullDelimiter) {
        if (netBuffer.endsWith("\\")) {
            return;
        }
        let pkt = netBuffer.replace(/\n+$/g, "");
        netBuffer = "";
        if (pkt) {
            const lines = pkt.split(/\r?\n/);
            for (let line of lines) {
                __queueRxLine("game", line, true);
            }
        }
        return;
    }
    let cutIndex;
    while ((cutIndex = netBuffer.indexOf("\0")) !== -1) {
        let pkt = netBuffer.slice(0, cutIndex);
        netBuffer = netBuffer.slice(cutIndex + 1);
        pkt = pkt.replace(/\n+$/g, "");
        if (!pkt || pkt === "||") continue;
        const lines = pkt.split(/\r?\n/);
        for (let line of lines) {
            __queueRxLine("game", line, false);
        }
    }
}

function __processChatRxText(raw) {
    if (!raw) return;
    chatBuffer += raw;
    if (chatBuffer.indexOf("\\") !== -1) {
        chatBuffer = chatBuffer.replace(/\\0/g, "\0");
    }
    const sawNull = chatBuffer.indexOf("\0") !== -1;
    if (sawNull) chatUsesNullDelimiter = true;
    if (!chatUsesNullDelimiter) {
        if (chatBuffer.endsWith("\\")) {
            return;
        }
        let pkt = chatBuffer.replace(/\n+$/g, "");
        chatBuffer = "";
        if (pkt) {
            const lines = pkt.split(/\r?\n/);
            for (let line of lines) {
                __queueRxLine("chat", line, true);
            }
        }
        return;
    }
    let cutIndex;
    while ((cutIndex = chatBuffer.indexOf("\0")) !== -1) {
        let pkt = chatBuffer.slice(0, cutIndex);
        chatBuffer = chatBuffer.slice(cutIndex + 1);
        pkt = pkt.replace(/\n+$/g, "");
        if (!pkt || pkt === "||") continue;
        const lines = pkt.split(/\r?\n/);
        for (let line of lines) {
            __queueRxLine("chat", line, false);
        }
    }
}

function sendRaw(line) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn("[WS] Cannot send, WS is closed:", line);
        return;
    }
    if (!line.endsWith("\0")) line += "\0";
    ws.send(line);
}

function buildAndromedaWsUrl() {
    const isHttps = window.location.protocol === "https:";
    if (isHttps) {
        const host = cfg.wsHost || window.location.host;
        let path = cfg.wsPath || "/ws/";
        if (!path.startsWith("/")) path = "/" + path;
        return `wss://${host}${path}`;
    }
    const host = cfg.wsHost || cfg.host || window.location.hostname;
    const port = Number(cfg.wsPort || cfg.port || 8082);
    return `ws://${host}:${port}`;
}

function connectToServer(isReconnect = false) {
    hideFlashConnectionLostWindowSafe();
    const url = buildAndromedaWsUrl();
    if (!isReconnect) wsReconnectAttempts = 0;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        return;
    }
    if (wsConnecting) return;
    wsConnecting = true;
    window.__ANDRO_WS_CONNECTED = false;
    dispatchWsEvent("andromeda:ws-connecting", {
        url: url,
        attempt: wsReconnectAttempts,
        reconnect: !!isReconnect
    });
    ws = new WebSocket(url);
    armWsConnectWatchdog(ws, url);
    ws.binaryType = "arraybuffer";
    ws.onopen = () => {
        clearWsConnectWatchdog();
        wsConnecting = false;
        if (wsReconnectTimer) {
            clearTimeout(wsReconnectTimer);
            wsReconnectTimer = null;
        }
        window.__ANDRO_WS_CONNECTED = true;
        dispatchWsEvent("andromeda:ws-open", {});
        wsEverReceived = false;
        window.__ANDRO_HAS_INITIAL_RDY_I = false;
        resetReadyFlags();
        netBuffer = "";
        wsUsesNullDelimiter = false;
        __clearRxQueue("game");
        const version = "4.1";
        if (wsLoginAttemptPending) {
            console.warn("[WS] LOGIN already pending, suppressing duplicate startup LOGIN");
        } else {
            wsLoginAttemptPending = true;
            const loginCmd = `LOGIN|${cfg.userID}|${cfg.sessionID}|${version}`;
            sendRaw(loginCmd);
        }
        startPingTimer();
    };
    const __wsInstance = ws;
    ws.onmessage = event => {
        __enqueueRxFrame("game", __wsInstance, event.data);
    };
    ws.onerror = err => console.error("[WS] ERROR:", err);
    ws.onclose = e => {
        clearWsConnectWatchdog();
        wsConnecting = false;
        window.__ANDRO_WS_CONNECTED = false;
        const code = e && typeof e.code === "number" ? e.code : null;
        const reason = e && typeof e.reason === "string" ? e.reason : "";
        const clean = e && typeof e.wasClean === "boolean" ? e.wasClean : false;
        console.warn(`[WS] Disconnected (code=${code ?? "?"}, reason=${reason || "?"}, clean=${clean})`);
        stopPingTimer();
        netBuffer = "";
        wsUsesNullDelimiter = false;
        __clearRxQueue("game");
        try {
            if (typeof isPortalJumpLocked === "function" && isPortalJumpLocked() && typeof endPortalJumpLock === "function") {
                endPortalJumpLock("disconnect");
            }
        } catch (_) {}
        const startupFailure = !wsEverReceived;
        resetWsLoginAttempt(startupFailure ? "startup-close" : "close");
        ws = null;
        resetReadyFlags();
        dispatchWsEvent("andromeda:ws-close", {
            code: code,
            reason: reason,
            clean: clean,
            startupFailure: startupFailure,
            mapReady: !!sentRdyMap
        });
        if (startupFailure) {
            dispatchWsEvent("andromeda:ws-startup-failed", {
                code: code,
                reason: reason,
                clean: clean
            });
        }
        if (wsPageUnloading || wsManualClose) return;
        closeChatConnectionForDisconnect("game disconnect");
        showFlashConnectionLostWindowSafe();
    };
}

function ensureDefaultChatRooms() {
    syncSyntheticGroupChatRoom(false);
}

function removeChatRoom(roomId) {
    const idx = chatRooms.findIndex(r => r.id === roomId);
    if (idx !== -1) {
        chatRooms.splice(idx, 1);
    }
    if (chatBuffers[roomId]) {
        delete chatBuffers[roomId];
    }
}

function syncChatRoomsToHero(previousClanId = null) {
    ensureDefaultChatRooms();
    if (previousClanId && previousClanId !== heroClanId) {
        removeChatRoom(previousClanId + 100);
    }
    syncSyntheticGroupChatRoom();
    renderChatTabsSafe();
}

function renderChatTabsSafe(attempt = 0) {
    if (typeof renderChatTabs === "function") {
        renderChatTabs();
        return;
    }
    if (attempt < 10) {
        setTimeout(() => renderChatTabsSafe(attempt + 1), 100);
    }
}

function connectToChat() {
    if (chatWs && (chatWs.readyState === WebSocket.OPEN || chatWs.readyState === WebSocket.CONNECTING)) {
        return;
    }
    clearChatReconnectTimer();
    chatManualClose = false;
    const url = buildAndromedaWsUrl();
    chatWs = new WebSocket(url);
    const __chatWsInstance = chatWs;
    chatWs.binaryType = "arraybuffer";
    chatWs.onopen = () => {
        if (chatWs !== __chatWsInstance) return;
        chatManualClose = false;
        chatServerFrameSeen = false;
        chatBuffer = "";
        chatUsesNullDelimiter = false;
        __clearRxQueue("chat");
        startChatHeartbeat(__chatWsInstance);
        ensureDefaultChatRooms();
        renderChatTabsSafe();
        setTimeout(() => {
            if (chatWs !== __chatWsInstance || !__chatWsInstance || __chatWsInstance.readyState !== WebSocket.OPEN) {
                return;
            }
                const chatInitCmd = `bu|u|0|${heroId}|${cfg.sessionID}`;
                sendChatRaw(chatInitCmd, __chatWsInstance);
                setTimeout(() => {
                    if (chatWs === __chatWsInstance && __chatWsInstance.readyState === WebSocket.OPEN) {
                        sendChatRaw("bz|0|1", __chatWsInstance);
                        try {
                            const activeRoomId = typeof chatCurrentRoomId !== "undefined" ? Number(chatCurrentRoomId) : 1;
                            const activeRoom = Array.isArray(chatRooms) ? chatRooms.find(r => Number(r.id) === activeRoomId) : null;
                            if (activeRoom && activeRoom.localOnly !== true && activeRoomId > 0 && activeRoomId !== 1) {
                                sendChatRaw(`bz|0|${activeRoomId}`, __chatWsInstance);
                            }
                        } catch (_) {}
                    }
                }, 150);
        }, 500);
    };
    chatWs.onmessage = event => {
        __enqueueRxFrame("chat", __chatWsInstance, event.data);
    };
    chatWs.onerror = e => console.warn("[CHAT-WS] Error", e);
    chatWs.onclose = e => {
        const isCurrentChatSocket = chatWs === __chatWsInstance;
        if (isCurrentChatSocket) {
            chatWs = null;
            stopChatHeartbeat();
            chatServerFrameSeen = false;
            chatBuffer = "";
            chatUsesNullDelimiter = false;
            __clearRxQueue("chat");
        }
        console.warn("[CHAT-WS] Closed (Code: " + e.code + ").");
        if (!isCurrentChatSocket) return;
        if (chatManualClose || wsPageUnloading || wsManualClose || !window.__ANDRO_WS_CONNECTED) {
            chatManualClose = false;
            return;
        }
        scheduleChatReconnect(`close:${e && typeof e.code === "number" ? e.code : "?"}`);
    };
}

let chatInitInterval = null;

function startChatInitMonitor() {
    if (chatInitInterval) return;
    chatInitInterval = setInterval(() => {
        if (heroLoaded && heroId && heroId > 0) {
            clearInterval(chatInitInterval);
            chatInitInterval = null;
            connectToChat();
        }
    }, 500);
}

window.startNetwork = () => {
    wsManualClose = false;
    showFlashConnectionInfoWindowSafe();
    hideFlashConnectionLostWindowSafe();
    connectToServer(false);
    startChatInitMonitor();
};

const PACKET_HANDLERS = {
    m: handlePacket_m,
    w: handlePacket_w,
    i: handlePacket_i,
    1: handlePacket_move,
    A: handlePacket_A,
    MSG: handlePacket_displayMessage,
    d: handlePacket_d,
    RDY: handlePacket_RDY,
    c: handlePacket_c,
    f: handlePacket_f,
    H: handlePacket_H,
    HPT: handlePacket_HPT,
    p: handlePacket_portal,
    SMP: handlePacket_SMP,
    P: handlePacket_noAttack,
    O: handlePacket_O,
    X: handlePacket_X,
    F: handlePacket_F,
    J: handlePacket_J,
    LK: handlePacket_LK,
    a: handlePacket_laserAttack,
    SAB_SHOT: handlePacket_sabShot,
    v: handlePacket_rocketAttack,
    Y: handlePacket_attackInfo,
    2: handlePacket_remove,
    s: handlePacket_s,
    S: handlePacket_S,
    t: handlePacket_logoutCancel,
    l: handlePacket_logoutConfirmed,
    C: handlePacket_C,
    R: handlePacket_R,
    CSS: handlePacket_CSS,
    UT: handlePacket_UT,
    D: handlePacket_D,
    U: handlePacket_U,
    UI: handlePacket_UI,
    POI: handlePacket_POI,
    MM: handlePacket_MM,
    E: handlePacket_E,
    T: handlePacket_T,
    b: handlePacket_b,
    B: handlePacket_B,
    3: handlePacket_3,
    4: handlePacket_4,
    g: handlePacket_g,
    LAB: handlePacket_LAB,
    ps: handlePacket_ps,
    N: handlePacket_N,
    n: handlePacket_n,
    W: handlePacket_W,
    y: handlePacket_y,
    7: handlePacket_7,
    9: handlePacket_QuestFM,
    QST: handlePacket_QST,
    K: handlePacket_K,
    SD: handlePacket_SD,
    TX: handlePacket_TX,
    RL: handlePacket_RL,
    k: handlePacket_k,
    TW: handlePacket_TW
};

const unknownPacketStats = {};

const __PARITY_DEBUG_GAME_OPCODES = new Set([ "i", "s", "S", "U", "UI", "UT", "ps", "b", "B", "g" ]);

function __parityDebug(channel, payload) {
    if (typeof window.flashParityDebugLog === "function") {
        window.flashParityDebugLog(channel, payload);
    }
}

function ensureParityTelemetry() {
    const t = window.__flashParityTelemetry = window.__flashParityTelemetry || {};
    if (!Number.isFinite(t.logOpcodeCount)) t.logOpcodeCount = 0;
    if (!Number.isFinite(t.chatOpcodeCount)) t.chatOpcodeCount = 0;
    if (!Number.isFinite(t.chatLines)) t.chatLines = 0;
    if (!Number.isFinite(t.logLines)) t.logLines = 0;
    return t;
}

function pushFlashLogMessageFromServer(text, sourceOpcode) {
    const msg = String(text == null ? "" : text);
    if (!msg) return;
    if (!Array.isArray(window.flashLogMessages)) window.flashLogMessages = [];
    window.flashLogMessages.push(msg);
    if (window.flashLogMessages.length > 200) {
        window.flashLogMessages.splice(0, window.flashLogMessages.length - 200);
    }
    if (window.FLASH_PARITY_DEBUG) {
        const telemetry = ensureParityTelemetry();
        console.log("[FLASH_PARITY] log-source", {
            sourceOpcode: sourceOpcode || null,
            totalLines: window.flashLogMessages.length,
            gameOpcodeCount: telemetry.logOpcodeCount,
            chatOpcodeCount: telemetry.chatOpcodeCount
        });
    }
}

function addServerInfoLogMessage(text, sourceOpcode) {
    const msg = String(text == null ? "" : text);
    if (!msg) return;
    pushFlashLogMessageFromServer(msg, sourceOpcode || "INFO");
    addInstantLogMessage(msg, sourceOpcode);
}

function isFlashInstantLogEnabled() {
    const explicitWindowValue = typeof window !== "undefined" ? window.showInstantLog : undefined;
    if (explicitWindowValue !== undefined) return explicitWindowValue !== false && explicitWindowValue !== 0 && explicitWindowValue !== "0";
    const configValue = cfg && (cfg.instantLogEnabled ?? cfg.instantlogEnabled ?? cfg.showInstantLog);
    if (configValue !== undefined) return configValue !== false && configValue !== 0 && configValue !== "0";
    return true;
}

function getInstantLogDurationMs(sourceOpcode) {
    return sourceOpcode === "HP" ? 1e4 : 4e3;
}

function addInstantLogMessage(text, sourceOpcode) {
    if (!isFlashInstantLogEnabled()) return;
    const msg = String(text == null ? "" : text);
    if (!msg) return;
    if (typeof addInfoMessage === "function") {
        addInfoMessage(msg, getInstantLogDurationMs(sourceOpcode));
    }
}

function addFlashScreenMessage(text, durationMs) {
    const msg = String(text == null ? "" : text);
    if (!msg) return;
    if (typeof addInfoMessage === "function") {
        addInfoMessage(msg, durationMs);
    }
}

function resolveFlashDisplayMessage(payloadParts) {
    const payload = Array.isArray(payloadParts) ? payloadParts.map(part => String(part == null ? "" : part)) : [];
    if (payload.length === 0) return "";
    let localeKey = "";
    let replacementParts = [];
    if (payload.length >= 3 && /^-?\d+$/.test(payload[1])) {
        localeKey = payload[2];
        replacementParts = payload.slice(3);
    } else {
        localeKey = payload[0];
        replacementParts = payload.slice(1);
    }
    if (!localeKey) return "";
    if (replacementParts.length === 0) {
        return flashLocaleGetTextRaw(localeKey) || localeKey;
    }
    const localized = flashLocaleGetTextRaw(localeKey);
    if (localized) {
        return assembleFlashLocalizedLogMessage([ localeKey ].concat(replacementParts)) || localized;
    }
    return [ localeKey ].concat(replacementParts).filter(Boolean).join(" ");
}

function getFlashDisplayMessageDurationMs(payloadParts) {
    return 5000;
}

function handleFlashDisplayMessagePayload(payloadParts) {
    const msg = resolveFlashDisplayMessage(payloadParts);
    if (!msg) return;
    addFlashScreenMessage(msg, getFlashDisplayMessageDurationMs(payloadParts));
}

const FLASH_SHIP_SKILL_HERO_LOG_MESSAGES = Object.freeze({
    1: Object.freeze({ activateKey: "msg_instant_healed_as_activator", activateFallback: "Instant heal activated." }),
    2: Object.freeze({ activateKey: "msg_targets_shields_weakened", activateFallback: "Target shields weakened.", deactivateKey: "msg_targets_shields_recovered", deactivateFallback: "Target shields recovered." }),
    3: Object.freeze({ activateKey: "msg_prismatic_shielding_activated", activateFallback: "Prismatic Shielding activated.", deactivateKey: "msg_prismatic_shielding_stopped", deactivateFallback: "Prismatic Shielding stopped." }),
    4: Object.freeze({ activateKey: "msg_fortress_activated", activateFallback: "Fortress activated.", deactivateKey: "msg_fortress_stopped", deactivateFallback: "Fortress stopped." }),
    5: Object.freeze({ activateKey: "msg_singularity_activated", activateFallback: "Singularity activated.", deactivateKey: "msg_singularity_stopped", deactivateFallback: "Singularity stopped." }),
    6: Object.freeze({ activateKey: "msg_afterburner_activated", activateFallback: "Afterburner activated.", deactivateKey: "msg_afterburner_stopped", deactivateFallback: "Afterburner stopped." })
});

const FLASH_SHIP_SKILL_TARGET_LOG_MESSAGES = Object.freeze({
    1: Object.freeze({ activateKey: "msg_instant_healed_as_group_member", activateFallback: "You were healed by a group member." }),
    2: Object.freeze({ activateKey: "msg_shields_weakened", activateFallback: "Your shields have been weakened.", deactivateKey: "msg_shields_recovered", deactivateFallback: "Your shields have recovered." })
});

function flashLogShipSkillLocaleMessage(localeKey, fallbackText, sourceOpcode) {
    const localized = flashLocaleGetTextRaw(localeKey);
    const msg = localized || String(fallbackText || "");
    if (!msg) return;
    addServerInfoLogMessage(msg, sourceOpcode || "SD");
}

function flashLogShipSkillActionMessage(action, skillType, sourceId, targetIds) {
    if (typeof heroId === "undefined" || heroId === null) return;
    if (action !== "A" && action !== "D") return;
    const numericSkillType = parseInt(skillType, 10);
    const numericSourceId = parseInt(sourceId, 10);
    const normalizedTargets = Array.isArray(targetIds) ? targetIds.map(id => parseInt(id, 10)).filter(Number.isFinite) : [];
    const heroMeta = FLASH_SHIP_SKILL_HERO_LOG_MESSAGES[numericSkillType] || null;
    if (Number.isFinite(numericSourceId) && numericSourceId === heroId && heroMeta) {
        const localeKey = action === "A" ? heroMeta.activateKey : heroMeta.deactivateKey;
        const fallback = action === "A" ? heroMeta.activateFallback : heroMeta.deactivateFallback;
        if (localeKey || fallback) {
            flashLogShipSkillLocaleMessage(localeKey, fallback, "SD");
        }
        return;
    }
    if (Number.isFinite(numericSourceId) && numericSourceId !== heroId && normalizedTargets.includes(heroId)) {
        const targetMeta = FLASH_SHIP_SKILL_TARGET_LOG_MESSAGES[numericSkillType] || null;
        if (!targetMeta) return;
        const localeKey = action === "A" ? targetMeta.activateKey : targetMeta.deactivateKey;
        const fallback = action === "A" ? targetMeta.activateFallback : targetMeta.deactivateFallback;
        if (localeKey || fallback) {
            flashLogShipSkillLocaleMessage(localeKey, fallback, "SD");
        }
    }
}

function flashLocaleGetTextRaw(key) {
    if (!key) return "";
    if (typeof __flashLocaleGetText === "function") {
        return String(__flashLocaleGetText(key) || "");
    }
    return "";
}

function getFlashCombatTargetName(targetId) {
    const id = parseInt(targetId, 10);
    if (!Number.isFinite(id)) return "";
    try {
        if (typeof heroId !== "undefined" && heroId !== null && id === heroId) {
            if (typeof heroName === "string" && heroName) return heroName;
        }
    } catch (_) {}
    try {
        const ent = typeof entities !== "undefined" && entities ? entities[id] : null;
        if (ent && ent.name) return String(ent.name);
    } catch (_) {}
    return `#${id}`;
}

function resolveFlashCombatLocaleMessage(localeKey, targetId, fallbackText) {
    const localized = flashLocaleGetTextRaw(localeKey);
    const hasTarget = targetId !== undefined && targetId !== null;
    if (localized) {
        if (hasTarget) {
            return localized.replace(/%!/g, getFlashCombatTargetName(targetId));
        }
        return localized;
    }
    if (typeof fallbackText === "function") {
        return String(fallbackText(hasTarget ? getFlashCombatTargetName(targetId) : "") || "");
    }
    return String(fallbackText || "");
}

function logFlashCombatLocaleMessage(localeKey, targetId, fallbackText, sourceOpcode) {
    const msg = resolveFlashCombatLocaleMessage(localeKey, targetId, fallbackText);
    if (!msg) return "";
    addServerInfoLogMessage(msg, sourceOpcode || localeKey);
    return msg;
}

function clearHeroCombatLogActiveTarget(targetId = null) {
    if (typeof heroCombatLogActiveTargetId === "undefined") return;
    if (targetId === null || heroCombatLogActiveTargetId === targetId) {
        heroCombatLogActiveTargetId = null;
    }
}

function hasActiveHeroMoveTarget() {
    return Number.isFinite(moveTargetX) && Number.isFinite(moveTargetY);
}

function clearHeroAttackRuntimeState(options = {}) {
    const clearSelection = options.clearSelection === true;
    const preserveMoveTarget = options.preserveMoveTarget === true || options.preserveMinimapMove === true;
    const shouldPreserveMoveTarget = preserveMoveTarget && hasActiveHeroMoveTarget();
    const targetId = options.targetId ?? currentLaserTargetId ?? confirmedAttackTargetId ?? attackIntentTargetId ?? pendingAttackAckTargetId ?? selectedTargetId ?? heroCombatLogActiveTargetId ?? null;
    currentLaserTargetId = null;
    attackIntentTargetId = null;
    confirmedAttackTargetId = null;
    pendingAttackAckTargetId = null;
    pendingAttackAckStartMs = 0;
    if (typeof resetPendingRangeResume === "function") {
        resetPendingRangeResume(targetId);
    } else {
        pendingRangeResumeTargetId = null;
        pendingRangeResumeMessage = false;
        rangeProtectedTargetId = null;
    }
    if (clearSelection) {
        selectedTargetId = null;
        if (typeof clearPendingTargetSelection === "function") clearPendingTargetSelection();
    }
    isChasingTarget = false;
    if (!shouldPreserveMoveTarget) {
        moveTargetX = null;
        moveTargetY = null;
        moveTargetFromMinimap = false;
    }
    if (typeof laserBeams !== "undefined" && Array.isArray(laserBeams)) {
        laserBeams.length = 0;
    }
    if (typeof clearSabLaserVisualJobsForLocalHero === "function") {
        clearSabLaserVisualJobsForLocalHero();
    }
    if (targetId != null && typeof clearSabLaserVisualJobsForEntity === "function") {
        clearSabLaserVisualJobsForEntity(targetId);
    }
    if (typeof clearHeroMissingCombatTarget === "function") clearHeroMissingCombatTarget(targetId);
    clearHeroCombatLogActiveTarget(targetId);
    return targetId;
}

function assembleFlashLocalizedLogMessage(payloadParts) {
    const localeKey = String(payloadParts[0] || "");
    if (!localeKey) return "";
    const args = payloadParts.slice(1);
    if (args.length === 0) {
        return flashLocaleGetTextRaw(localeKey);
    }
    if (args.length === 1) {
        let argText = flashLocaleGetTextRaw(args[0]);
        if (!argText) argText = String(args[0] || "");
        return flashLocaleGetTextRaw(localeKey).replace("%!", argText);
    }
    let out = flashLocaleGetTextRaw(localeKey);
    for (let i = 0; i < args.length; i += 2) {
        const needle = String(args[i] || "");
        const value = String(args[i + 1] || "");
        out = out.replace(needle, value);
    }
    return out;
}

const UNKNOWN_PACKET_LOG_THROTTLE_MS = 5e3;

const UNKNOWN_PACKET_LOG_FIRST_SAMPLES = 3;

const unknownPacketLogState = Object.create(null);

function logUnknownPacket(opcode, parts) {
    const safeOpcode = opcode || "";
    if (!unknownPacketStats[safeOpcode]) {
        unknownPacketStats[safeOpcode] = 0;
    }
    unknownPacketStats[safeOpcode]++;
    let state = unknownPacketLogState[safeOpcode];
    if (!state) {
        state = {
            total: 0,
            suppressed: 0,
            lastLogAt: 0,
            lastSignature: ""
        };
        unknownPacketLogState[safeOpcode] = state;
    }
    state.total++;
    const now = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    const signature = parts && parts.length > 0 ? String(parts[0] || "") + "|" + String(parts[1] || "") + "|" + String(parts[2] || "") : safeOpcode;
    const shouldLogSample = state.total <= UNKNOWN_PACKET_LOG_FIRST_SAMPLES || signature !== state.lastSignature || now - state.lastLogAt >= UNKNOWN_PACKET_LOG_THROTTLE_MS;
    if (!shouldLogSample) {
        state.suppressed++;
        return;
    }
    const suppressed = state.suppressed;
    state.suppressed = 0;
    state.lastLogAt = now;
    state.lastSignature = signature;
    const content = parts && parts.length > 0 ? parts.join("|") : "";
    if (suppressed > 0) {
        console.warn("[UNKNOWN PACKET] opcode =", safeOpcode, "| total vus =", unknownPacketStats[safeOpcode], "| repetes masques =", suppressed, "| contenu =", content);
    } else {
        console.warn("[UNKNOWN PACKET] opcode =", safeOpcode, "| total vus =", unknownPacketStats[safeOpcode], "| contenu =", content);
    }
}

function handleServerLine(line) {
    const parts = line.split("|");
    if (parts.length === 0) return;
    let opcode;
    let startIndex;
    if (parts[0] === "0") {
        if (parts.length < 2) return;
        opcode = parts[1];
        startIndex = 2;
    } else {
        opcode = parts[0];
        startIndex = 1;
    }
    if (!opcode || opcode.trim() === "") {
        return;
    }
    if (window.AndroPerf && window.AndroPerf.enabled) {
        window.AndroPerf.notePacket(opcode, parts, startIndex);
    }
    const handler = PACKET_HANDLERS[opcode];
    if (__PARITY_DEBUG_GAME_OPCODES.has(opcode)) {
        __parityDebug("opcode-game", {
            opcode: opcode,
            parts: parts.slice(startIndex)
        });
    }
    const telemetry = ensureParityTelemetry();
    telemetry.logOpcodeCount += 1;
    telemetry.lastGameOpcode = opcode;
    window.__flashLastGameOpcode = opcode;
    if (handler) {
        const perf = window.AndroPerf;
        const perfStartedAt = perf && perf.enabled ? __rxNowMs() : 0;
        try {
            handler(parts, startIndex);
        } catch (e) {
            console.error("[PACKET ERROR] opcode =", opcode, "| line =", line, "| parts =", parts, e);
        } finally {
            if (perfStartedAt && perf && perf.enabled) {
                perf.recordPacketHandler(opcode, __rxNowMs() - perfStartedAt, parts, startIndex);
            }
        }
    } else {
        logUnknownPacket(opcode, parts);
    }
}

const chatRooms = [];

let chatCurrentRoomId = 1;

const chatBuffers = {};

const GROUP_CHAT_ROOM_NAME = "Group";

let groupChatRoomId = 0;

let syntheticGroupChatKey = "";

let syntheticGroupChatServerId = 0;

const knownClanTagsByLowerName = Object.create(null);

function normalizeChatClanTag(rawTag) {
    if (rawTag === null || rawTag === undefined) return "";
    const tag = String(rawTag).trim();
    if (!tag) return "";
    const lowered = tag.toLowerCase();
    if (lowered === "0" || lowered === "null" || lowered === "undefined" || lowered === "false") {
        return "";
    }
    return tag;
}

function cacheKnownClanTag(name, rawTag) {
    const key = String(name || "").trim().toLowerCase();
    const tag = normalizeChatClanTag(rawTag);
    if (key && tag) {
        knownClanTagsByLowerName[key] = tag;
    }
    return tag;
}

function getCachedKnownClanTag(name) {
    const key = String(name || "").trim().toLowerCase();
    if (!key) return "";
    return normalizeChatClanTag(knownClanTagsByLowerName[key]);
}

function getEntityClanTagById(entityId) {
    const id = parseInt(entityId, 10);
    if (!Number.isFinite(id) || id <= 0) return "";
    if (typeof entities !== "object" || !entities) return "";
    const ent = entities[id];
    if (!ent) return "";
    const tag = normalizeChatClanTag(ent.clanTag);
    if (tag && ent.name) {
        cacheKnownClanTag(ent.name, tag);
    }
    return tag;
}

function isSyntheticGroupChatRoom(roomId) {
    const id = parseInt(roomId, 10);
    return Number.isFinite(id) && id > 0 && id === groupChatRoomId;
}

function getCurrentGroupMemberIds() {
    const ids = [];
    const myHeroId = parseInt(heroId, 10);
    if (Number.isFinite(myHeroId) && myHeroId > 0) ids.push(myHeroId);
    if (typeof groupMembers === "object" && groupMembers) {
        for (const rawId in groupMembers) {
            const id = parseInt(rawId, 10);
            if (Number.isFinite(id) && id > 0) ids.push(id);
        }
    }
    return Array.from(new Set(ids)).sort((a, b) => a - b);
}

function computeSyntheticGroupChatKey() {
    const serverGroupId = parseInt(syntheticGroupChatServerId, 10);
    if (Number.isFinite(serverGroupId) && serverGroupId > 0) {
        return `g-${serverGroupId}`;
    }
    const ids = getCurrentGroupMemberIds();
    return ids.length >= 2 ? ids.join("-") : "";
}

function computeFallbackGroupChatRoomId(groupKey) {
    const key = String(groupKey || "");
    if (!key) return 0;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = (hash << 5) - hash + key.charCodeAt(i) >>> 0;
    }
    return 8e5 + hash % 1e5;
}

function resolveCurrentGroupChatRoomId(nextKey = "") {
    const serverGroupId = parseInt(syntheticGroupChatServerId, 10);
    if (Number.isFinite(serverGroupId) && serverGroupId > 0) {
        return serverGroupId;
    }
    const key = nextKey || computeSyntheticGroupChatKey();
    return key ? computeFallbackGroupChatRoomId(key) : 0;
}

function getGroupParticipantClanTagByName(name) {
    const needle = String(name || "").trim().toLowerCase();
    if (!needle) return null;
    if (typeof heroName === "string" && heroName && heroName.toLowerCase() === needle) {
        return normalizeChatClanTag(heroClanTag) || null;
    }
    if (typeof groupMembers === "object" && groupMembers) {
        for (const rawId in groupMembers) {
            const member = groupMembers[rawId];
            if (!member || !member.name) continue;
            if (String(member.name).trim().toLowerCase() === needle) {
                const liveTag = getEntityClanTagById(member.id);
                if (liveTag) {
                    member.clanTag = liveTag;
                    return liveTag;
                }
                const memberTag = normalizeChatClanTag(member.clanTag);
                if (memberTag) {
                    cacheKnownClanTag(member.name, memberTag);
                    member.clanTag = memberTag;
                    return memberTag;
                }
                const cachedTag = getCachedKnownClanTag(member.name);
                if (cachedTag) {
                    member.clanTag = cachedTag;
                    return cachedTag;
                }
                return null;
            }
        }
    }
    if (typeof entities === "object" && entities) {
        for (const rawId in entities) {
            const ent = entities[rawId];
            if (!ent || !ent.name) continue;
            if (String(ent.name).trim().toLowerCase() === needle) {
                const entTag = normalizeChatClanTag(ent.clanTag);
                if (entTag) {
                    cacheKnownClanTag(ent.name, entTag);
                    return entTag;
                }
                break;
            }
        }
    }
    return getCachedKnownClanTag(name) || null;
}

function migrateGroupChatBuffer(previousRoomId, nextRoomId) {
    if (!previousRoomId || !nextRoomId || previousRoomId === nextRoomId) return false;
    const oldBuffer = chatBuffers[previousRoomId];
    if (!oldBuffer || !oldBuffer.length) return false;
    const nextBuffer = chatBuffers[nextRoomId] = chatBuffers[nextRoomId] || [];
    nextBuffer.push(...oldBuffer);
    if (nextBuffer.length > 500) {
        nextBuffer.splice(0, nextBuffer.length - 500);
    }
    delete chatBuffers[previousRoomId];
    return true;
}

function syncSyntheticGroupChatRoom(shouldRender = true) {
    const nextKey = computeSyntheticGroupChatKey();
    const shouldExist = !!(groupInGroupServerState && nextKey);
    const nextRoomId = shouldExist ? resolveCurrentGroupChatRoomId(nextKey) : 0;
    const previousRoomId = groupChatRoomId;
    let changed = false;
    if (!shouldExist || !nextRoomId) {
        if (syntheticGroupChatKey) {
            syntheticGroupChatKey = "";
            changed = true;
        }
        if (previousRoomId) {
            removeChatRoom(previousRoomId);
            if (chatCurrentRoomId === previousRoomId) {
                chatCurrentRoomId = 1;
                if (typeof renderChatContent === "function") renderChatContent();
            }
            groupChatRoomId = 0;
            changed = true;
        }
        if (typeof window !== "undefined") window.__groupChatRoomId = 0;
        if (shouldRender && changed) renderChatTabsSafe();
        return changed;
    }
    if (syntheticGroupChatKey !== nextKey) {
        syntheticGroupChatKey = nextKey;
        changed = true;
    }
    if (previousRoomId && previousRoomId !== nextRoomId) {
        changed = migrateGroupChatBuffer(previousRoomId, nextRoomId) || changed;
        removeChatRoom(previousRoomId);
        if (chatCurrentRoomId === previousRoomId) {
            chatCurrentRoomId = nextRoomId;
        }
        changed = true;
    }
    if (groupChatRoomId !== nextRoomId) {
        groupChatRoomId = nextRoomId;
        changed = true;
    }
    if (!chatBuffers[groupChatRoomId]) {
        chatBuffers[groupChatRoomId] = [];
        changed = true;
    }
    const hadRoom = chatRooms.some(r => r && r.id === groupChatRoomId);
    const room = upsertChatRoom(groupChatRoomId, GROUP_CHAT_ROOM_NAME, 0);
    if (!hadRoom) changed = true;
    if (room.syntheticType !== "group") {
        room.syntheticType = "group";
        changed = true;
    }
    if (room.localOnly !== false) {
        room.localOnly = false;
        changed = true;
    }
    if (room.visible !== true) {
        room.visible = true;
        changed = true;
    }
    if (room.sortOrder !== 35) {
        room.sortOrder = 35;
        changed = true;
    }
    if (room.groupKey !== nextKey) {
        room.groupKey = nextKey;
        changed = true;
    }
    if (typeof window !== "undefined") window.__groupChatRoomId = groupChatRoomId;
    if (shouldRender && changed) renderChatTabsSafe();
    return changed;
}

function sendSyntheticGroupChatMessage(messageText) {
    if (typeof chatWs === "undefined" || !chatWs || chatWs.readyState !== WebSocket.OPEN) {
        ensureChatConnection("group-send");
        addThrottledChatReconnectNotice(chatCurrentRoomId);
        return false;
    }
    syncSyntheticGroupChatRoom(false);
    const roomId = groupChatRoomId || resolveCurrentGroupChatRoomId();
    if (!roomId) {
        addChatSystemLikeMessage("Group chat unavailable.", chatCurrentRoomId, "chatSystem");
        return false;
    }
    try {
        sendChatRaw(`bz|0|${roomId}`, chatWs);
        sendChatRaw(`a|${roomId}|${String(messageText || "")}`, chatWs);
        return true;
    } catch (e) {
        console.warn("[CHAT] send group message failed", e);
        addChatSystemLikeMessage("Unable to send the group chat message.", chatCurrentRoomId, "chatSystem");
        return false;
    }
}

window.isSyntheticGroupChatRoom = isSyntheticGroupChatRoom;

window.sendSyntheticGroupChatMessage = sendSyntheticGroupChatMessage;

function escapeHtml(str) {
    return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function escapeHtmlAttr(str) {
    return escapeHtml(str);
}

const CHAT_LOCALE_FALLBACKS = Object.freeze({
    "globalchat.chat.youWhisper": "You whisper to %USER:",
    "globalchat.chat.userWhispers": "%USER whispers:"
});

function getChatLocaleText(key) {
    if (!key) return "";
    try {
        if (typeof __flashLocaleGetText === "function") {
            const localized = String(__flashLocaleGetText(key) || "");
            if (localized) return localized;
        }
    } catch (_) {}
    return CHAT_LOCALE_FALLBACKS[key] || "";
}

function escapeChatTextHtml(str) {
    return escapeHtml(str).replace(/[\r\n]+/g, "<br>");
}

const CHAT_SERVER_MARKUP_CLASS_ALIASES = Object.freeze({
    mvcYan: "mvcYellow"
});

function containsTrustedChatMarkup(str) {
    return /<\s*(?:span|br)\b/i.test(String(str || ""));
}

function sanitizeServerChatMarkup(str) {
    let raw = String(str || "");
    if (!raw) return "";
    raw = raw.replace(/\r\n?/g, "\n");
    raw = raw.replace(/<\s*br\s*\/?\s*>/gi, "[[CHAT_BR]]");
    raw = raw.replace(/<\s*\/\s*span\s*>/gi, "[[CHAT_ENDSPAN]]");
    raw = raw.replace(/<\s*span\b([^>]*)>/gi, (_match, attrs) => {
        const classMatch = String(attrs || "").match(/\bclass\s*=\s*(['"])([^'"]+)\1/i) || String(attrs || "").match(/\bclass\s*=\s*([^\s>]+)/i);
        if (!classMatch) return "";
        const rawClasses = (classMatch[2] || classMatch[1] || "").trim();
        if (!rawClasses) return "";
        const safeClasses = rawClasses.split(/\s+/).map(name => CHAT_SERVER_MARKUP_CLASS_ALIASES[name] || name).filter(name => /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(name));
        if (!safeClasses.length) return "";
        return `[[CHAT_SPAN:${safeClasses.join(" ")}]]`;
    });
    let html = escapeHtml(raw);
    html = html.replace(/\[\[CHAT_BR\]\]/g, "<br>");
    html = html.replace(/\[\[CHAT_ENDSPAN\]\]/g, "</span>");
    html = html.replace(/\[\[CHAT_SPAN:([^\]]+)\]\]/g, (_match, cls) => `<span class="${escapeHtmlAttr(cls)}">`);
    html = html.replace(/\n/g, "<br>");
    return html;
}

function addChatSystemLikeMessage(msg, roomId = chatCurrentRoomId, typeClass = "chatSystem") {
    const raw = String(msg || "");
    if (containsTrustedChatMarkup(raw)) {
        addChatMessage(null, sanitizeServerChatMarkup(raw), roomId, typeClass, null, null, {
            msgIsHtml: true
        });
        return;
    }
    addChatMessage(null, raw, roomId, typeClass);
}

const CHAT_DOM_LINE_LIMIT = 500;

function trimChatDomContainer(container, limit = CHAT_DOM_LINE_LIMIT) {
    if (!container || !container.children) return;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : CHAT_DOM_LINE_LIMIT;
    while (container.children.length > safeLimit) {
        container.removeChild(container.firstChild);
    }
}

function buildChatWhisperHtml(localeKey, userName, messageText) {
    const template = getChatLocaleText(localeKey) || CHAT_LOCALE_FALLBACKS[localeKey] || "%USER:";
    const safeUserText = escapeHtml(userName || "");
    const safeUserAttr = escapeHtmlAttr(userName || "");
    const safeMessage = escapeChatTextHtml(messageText || "");
    const splitIndex = template.indexOf("%USER");
    if (splitIndex === -1) {
        return `<span class="chatWhisperPrefix">${escapeChatTextHtml(template)}</span>${safeMessage ? " " + safeMessage : ""}`;
    }
    const before = template.substring(0, splitIndex);
    const after = template.substring(splitIndex + "%USER".length);
    let html = "";
    if (before) html += `<span class="chatWhisperPrefix">${escapeChatTextHtml(before)}</span>`;
    html += `<span class="chatName" data-name="${safeUserAttr}">${safeUserText}</span>`;
    if (after) html += `<span class="chatWhisperPrefix">${escapeChatTextHtml(after)}</span>`;
    if (safeMessage) html += ` ${safeMessage}`;
    return html;
}

function addChatMessage(name, msg, roomId = chatCurrentRoomId, typeClass = "chatGlobal", clanTag = null, nameClass = null, options = null) {
    const buffer = chatBuffers[roomId] = chatBuffers[roomId] || [];
    const resolvedClanTag = name ? normalizeChatClanTag(clanTag) || getCachedKnownClanTag(name) : "";
    if (name && resolvedClanTag) {
        cacheKnownClanTag(name, resolvedClanTag);
    }
    let effectiveClass = typeClass || "chatGlobal";
    if (isSyntheticGroupChatRoom(roomId) && (typeClass === "chatGlobal" || typeClass === "chatGroup")) {
        effectiveClass = "chatGroup";
    } else if (heroClanId && roomId === heroClanId + 100 && typeClass === "chatGlobal") {
        effectiveClass = "chatClan";
    } else if (heroFactionId && roomId === heroFactionId + 1 && typeClass === "chatGlobal") {
        effectiveClass = "chatFaction";
    }
    const safeNameText = name ? escapeHtml(name) : "";
    const safeNameAttr = name ? escapeHtmlAttr(name) : "";
    const safeMsgHtml = options && options.msgIsHtml ? String(msg || "") : escapeChatTextHtml(msg || "");
    let nameDisplay = safeNameText;
    if (resolvedClanTag && resolvedClanTag.length > 0 && name) {
        const safeTag = escapeHtml(resolvedClanTag);
        nameDisplay = `[${safeTag}] ${safeNameText}`;
    }
    const nameClasses = [ "chatName" ];
    if (nameClass) {
        nameClasses.push(nameClass);
    }
    const html = name ? `<span class="${nameClasses.join(" ")}" data-name="${safeNameAttr}">${nameDisplay}: </span>${safeMsgHtml}` : safeMsgHtml;
    buffer.push({
        html: html,
        typeClass: effectiveClass
    });
    if (buffer.length > 500) {
        buffer.splice(0, buffer.length - 500);
    }
    if (roomId === chatCurrentRoomId) {
        const telemetry = ensureParityTelemetry();
        const container = document.getElementById("chatContent");
        if (container) {
            const wasNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 6;
            const div = document.createElement("div");
            div.className = "chatLine " + effectiveClass;
            div.innerHTML = html;
            container.appendChild(div);
            trimChatDomContainer(container);
            telemetry.chatLines += 1;
            if (window.FLASH_PARITY_DEBUG) {
                console.log("[FLASH_PARITY] chat-render", {
                    roomId: roomId,
                    lines: telemetry.chatLines,
                    chatOpcodeCount: telemetry.chatOpcodeCount,
                    lastChatOpcode: telemetry.lastChatOpcode || null,
                    className: effectiveClass
                });
            }
            if (wasNearBottom) container.scrollTop = container.scrollHeight;
            if (typeof syncChatScrollThumb === "function") {
                syncChatScrollThumb();
            }
        } else if (window.FLASH_PARITY_DEBUG) {
            console.warn("[FLASH_PARITY] chat-opcode-without-container", {
                roomId: roomId,
                opcodeCount: telemetry.chatOpcodeCount,
                lastChatOpcode: telemetry.lastChatOpcode || null
            });
        }
    }
}

function upsertChatRoom(id, name, faction) {
    const existing = chatRooms.find(r => r.id === id);
    if (existing) {
        existing.name = name;
        existing.faction = faction;
        return existing;
    }
    const room = {
        id: id,
        name: name,
        faction: faction
    };
    chatRooms.push(room);
    return room;
}

function handleChatPacket(raw) {
    const clean = raw.endsWith("#") ? raw.slice(0, -1) : raw;
    const separatorIndex = clean.indexOf("%");
    if (separatorIndex === -1) return;
    const opcode = clean.substring(0, separatorIndex);
    const data = clean.substring(separatorIndex + 1);
    const telemetry = ensureParityTelemetry();
    telemetry.chatOpcodeCount += 1;
    telemetry.lastChatOpcode = opcode;
    __parityDebug("opcode-chat", {
        opcode: opcode,
        data: data
    });
    if (opcode === "by") {
        const parts = data.split("|");
        if (parts.length >= 2) {
            const roomId = parseInt(parts[0], 10);
            const roomName = parts[1];
            const faction = parseInt(parts[2], 10) || 0;
            if (!isNaN(roomId)) {
                const room = upsertChatRoom(roomId, roomName, faction);
                if (String(roomName || "").trim().toLowerCase() === "group") {
                    syntheticGroupChatServerId = roomId;
                    groupChatRoomId = roomId;
                    room.syntheticType = "group";
                    room.localOnly = false;
                    room.visible = true;
                    room.sortOrder = 35;
                    if (typeof window !== "undefined") window.__groupChatRoomId = roomId;
                }
                renderChatTabsSafe();
            }
        }
    } else if (opcode === "a") {
        const parts = data.split("@");
        if (parts.length >= 3) {
            const roomId = parseInt(parts[0], 10) || 1;
            const name = parts[1];
            const msg = parts[2];
            const clanTag = parts[3] || null;
            const typeClass = isSyntheticGroupChatRoom(roomId) ? "chatGroup" : "chatGlobal";
            addChatMessage(name, msg, roomId, typeClass, clanTag);
        }
    } else if (opcode === "j") {
        const parts = data.split("@");
        if (parts.length >= 3) {
            const roomId = parseInt(parts[0], 10) || 1;
            const name = parts[1];
            const msg = parts[2];
            let clanTag = null;
            let staffClass = "chatAdmin";
            if (parts.length >= 4) {
                const maybeLevelRaw = parts[3];
                const maybeLevel = parseInt(maybeLevelRaw, 10);
                if (Number.isFinite(maybeLevel) && String(maybeLevel) === String(maybeLevelRaw).trim()) {
                    staffClass = maybeLevel > -1 && maybeLevel < 3 ? "chatSupporter" : "chatMod";
                    clanTag = parts[4] || null;
                } else {
                    clanTag = maybeLevelRaw || null;
                }
            }
            addChatMessage(name, msg, roomId, staffClass, clanTag, staffClass);
        }
    } else if (opcode === "dq") {
        if (shouldSuppressRepeatedChatStartupNotice(data)) return;
        addChatSystemLikeMessage(data, chatCurrentRoomId, "chatSystem");
    } else if (opcode === "cw") {
        const parts = data.split("@");
        if (parts.length >= 2) {
            const target = parts.shift() || "";
            const msg = parts.join("@");
            const line = buildChatWhisperHtml("globalchat.chat.youWhisper", target, msg);
            addChatMessage(null, line, chatCurrentRoomId, "chatWhisper", null, null, {
                msgIsHtml: true
            });
        }
    } else if (opcode === "cv") {
        const parts = data.split("@");
        if (parts.length >= 2) {
            const sender = parts.shift() || "";
            const msg = parts.join("@");
            const line = buildChatWhisperHtml("globalchat.chat.userWhispers", sender, msg);
            addChatMessage(null, line, chatCurrentRoomId, "chatWhisper", null, null, {
                msgIsHtml: true
            });
        }
    } else if (opcode === "gx") {
        const parts = data.split("@");
        if (parts.length >= 3) {
            const roomId = parseInt(parts.shift() || "0", 10) || groupChatRoomId || chatCurrentRoomId;
            const sender = parts.shift() || "";
            const msg = parts.shift() || "";
            const clanTag = parts.length ? parts.shift() || null : null;
            addChatMessage(sender, msg, roomId, "chatGroup", clanTag || getGroupParticipantClanTagByName(sender));
        }
    } else if (opcode === "fk") {
        const parts = data.split("@");
        const roomId = parseInt(parts[0], 10);
        const message = parts.slice(1).join("@");
        addChatSystemLikeMessage(message, Number.isFinite(roomId) ? roomId : chatCurrentRoomId, "chatSystem");
    } else if (opcode === "cf" || opcode === "cg" || opcode === "ch" || opcode === "ci" || opcode === "cl" || opcode === "cm" || opcode === "cn" || opcode === "co" || opcode === "cp" || opcode === "cs" || opcode === "ct" || opcode === "cu" || opcode === "bw" || opcode === "da" || opcode === "gb" || opcode === "cr") {
        const localeKeyByOpcode = {
            cf: "globalchat.chat.noMorePrivateRoomsAllowed",
            cg: "globalchat.chat.wrongArguments",
            ch: "globalchat.chat.roomnameToShort",
            ci: "globalchat.chat.privateRoomAlreadyExist",
            cl: "globalchat.chat.PrivateRoomNotExist",
            cm: "globalchat.chat.wrongCommand",
            cn: "globalchat.chat.cannotInviteYourself",
            co: "globalchat.chat.inviteErrorNotYourRoom",
            cp: "globalchat.chat.inviteErrorUserNotFound",
            cr: "globalchat.chat.youInvited",
            cs: "globalchat.chat.noWhisperMessage",
            ct: "globalchat.chat.userNotExistOrOnline",
            cu: "globalchat.chat.cannotWhisperYourself",
            bw: "globalchat.chat.wrongVersion",
            da: "globalchat.chat.floodWarning",
            gb: "globalchat.chat.roomNameNotAllowed"
        };
        const localeKey = localeKeyByOpcode[opcode] || "";
        let localized = typeof __flashLocaleGetText === "function" && localeKey ? String(__flashLocaleGetText(localeKey) || "") : "";
        if (opcode === "cr" && localized) {
            localized = localized.replace(/%USER/g, String((data || "").split("@")[0] || ""));
        }
        addChatSystemLikeMessage(localized || data || "", chatCurrentRoomId, "chatSystem");
    }
}

let groupUiRefreshScheduled = false;
let groupUiRefreshNeedsChatSync = false;

function scheduleFlashLikeGroupUiRefresh(syncChat = false) {
    if (syncChat) groupUiRefreshNeedsChatSync = true;
    if (groupUiRefreshScheduled) return;
    groupUiRefreshScheduled = true;
    const run = () => {
        groupUiRefreshScheduled = false;
        const shouldSyncChat = groupUiRefreshNeedsChatSync;
        groupUiRefreshNeedsChatSync = false;
        if (typeof forceGroupUiUpdate === "function") {
            forceGroupUiUpdate();
        }
        if (shouldSyncChat) {
            syncSyntheticGroupChatRoom();
        }
    };
    if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(run);
    } else {
        setTimeout(run, 0);
    }
}

function setGroupMemberField(member, key, value) {
    if (!member || value === null || typeof value === "undefined") return false;
    if (member[key] === value) return false;
    member[key] = value;
    return true;
}

function getGroupMemberMinimapState(member) {
    const activeMapId = getCurrentGroupNetworkMapId();
    const memberMapId = member && member.mapId != null ? parseInt(member.mapId, 10) : NaN;
    const posX = member && member.posX != null ? parseInt(member.posX, 10) : NaN;
    const posY = member && member.posY != null ? parseInt(member.posY, 10) : NaN;
    const visible = !!(member && !member.isOffline && Number.isFinite(memberMapId) && Number.isFinite(activeMapId) && memberMapId === activeMapId);
    return {
        visible: visible,
        mapId: Number.isFinite(memberMapId) ? memberMapId : null,
        activeMapId: Number.isFinite(activeMapId) ? activeMapId : null,
        posX: Number.isFinite(posX) ? posX : 0,
        posY: Number.isFinite(posY) ? posY : 0
    };
}

function hasGroupMinimapStateChanged(before, after) {
    if (!before || !after) return true;
    if (before.visible !== after.visible) return true;
    if (!after.visible) return false;
    return before.mapId !== after.mapId || before.activeMapId !== after.activeMapId || before.posX !== after.posX || before.posY !== after.posY;
}

function clearRemoteGroupMemberEntityAfterMapExit(memberId, before, after) {
    if (!before || !before.visible || after.visible) return;
    const ent = entities[memberId] || entities[String(memberId)];
    if (ent && ent.kind === "player") {
        handlePacket_R([ "R", String(memberId) ], 1);
    }
}

function applyGroupMemberMinimapDiff(memberId, before, after) {
    if (hasGroupMinimapStateChanged(before, after)) {
        invalidateGroupMinimapCache();
    }
    clearRemoteGroupMemberEntityAfterMapExit(memberId, before, after);
}

function handlePacket_ps(parts) {
    if (parts.length < 3) return;
    const INVITE_ERROR_MESSAGES = {
        full: "The group is full.",
        cig: "The player is already in a group.",
        cna: "The player is not available.",
        cnx: "Player not found.",
        inx: "Invite not found.",
        noi: "No pending invitation.",
        boss: "Only the leader can invite.",
        mxi: "Too many invitations sent.",
        mxc: "Too many invitations received.",
        blk: "Invitations are blocked by the target.",
        spam: "Invitation considered spam.",
        dpl: "Invitation already sent."
    };
    const action = (parts[2] || "").toLowerCase();
    if (typeof window !== "undefined") {
        window.__flashGroupServerStateSeen = true;
    }
    __parityDebug("opcode-group", {
        action: action,
        parts: parts.slice(3)
    });
    const refreshGroupUi = (syncChat = false) => scheduleFlashLikeGroupUiRefresh(syncChat);
    const resetGroup = showMessage => {
        for (const k in groupMembers) delete groupMembers[k];
        groupLeaderId = null;
        pendingGroupInvite = null;
        for (const k in groupIncomingInvites) delete groupIncomingInvites[k];
        for (const k in groupOutgoingInvites) delete groupOutgoingInvites[k];
        groupInvitationBehavior = 0;
        groupInGroupServerState = false;
        syntheticGroupChatServerId = 0;
        invalidateGroupMinimapCache();
        if (showMessage) addServerInfoLogMessage("Group disbanded.");
        refreshGroupUi(true);
    };
    const parseMemberBlock = (block, orderIdx) => {
        const name = block[0];
        const id = parseInt(block[1], 10);
        if (!name || isNaN(id)) return null;
        const member = {
            name: name,
            id: id,
            hp: parseInt(block[2], 10) || 0,
            maxHp: parseInt(block[3], 10) || 0,
            shield: parseInt(block[4], 10) || 0,
            maxShield: parseInt(block[5], 10) || 0,
            mapId: parseInt(block[6], 10) || 0,
            posX: parseInt(block[7], 10) || 0,
            posY: parseInt(block[8], 10) || 0,
            level: parseInt(block[9], 10) || 0,
            activity: Boolean(parseInt(block[10], 10)),
            cloaked: Boolean(parseInt(block[11], 10)),
            fighting: Boolean(parseInt(block[12], 10)),
            factionId: parseInt(block[13], 10) || 0,
            targetId: parseInt(block[14], 10) || 0,
            clanTag: normalizeChatClanTag(block[15]),
            shipType: parseInt(block[16], 10) || 0,
            isOffline: Boolean(parseInt(block[17], 10)),
            order: orderIdx
        };
        const liveTag = getEntityClanTagById(id);
        if (liveTag) {
            member.clanTag = liveTag;
        } else {
            const cachedTag = getCachedKnownClanTag(name);
            if (cachedTag) member.clanTag = cachedTag;
        }
        if (member.clanTag) {
            cacheKnownClanTag(name, member.clanTag);
        }
        return member;
    };
    if (action === "err") {
        const sub = (parts[3] || "").toLowerCase();
        if (sub === "conn") {
            resetGroup(true);
            pendingGroupInvite = null;
        } else if (sub === "a" || sub === "f" || sub === "png") {
            addServerInfoLogMessage("Group action not possible.");
        }
        return;
    }
    if (action === "inv") {
        const subAction = (parts[3] || "").toLowerCase();
        if (subAction === "new") {
            const inviterId = parseInt(parts[4], 10);
            const inviterName = parts[5];
            const inviterShipType = parseInt(parts[6], 10);
            const candidateId = parseInt(parts[7] || parts[6], 10);
            const candidateName = parts[8] || parts[6] || "";
            const candidateShipType = parseInt(parts[9] || parts[6], 10);
            const myHeroId = parseInt(heroId, 10);
            if (!isNaN(myHeroId) && candidateId === myHeroId) {
                groupIncomingInvites[inviterId] = {
                    id: inviterId,
                    name: inviterName,
                    shipType: Number.isFinite(inviterShipType) ? inviterShipType : 0
                };
                pendingGroupInvite = {
                    id: inviterId,
                    name: inviterName
                };
                addServerInfoLogMessage(`Group invitation received from ${inviterName}`);
            } else if (!isNaN(myHeroId) && inviterId === myHeroId && candidateName && !isNaN(candidateId)) {
                groupOutgoingInvites[candidateId] = {
                    id: candidateId,
                    name: candidateName,
                    shipType: Number.isFinite(candidateShipType) ? candidateShipType : 0
                };
                addServerInfoLogMessage(`Invitation sent to ${candidateName}.`);
            }
            refreshGroupUi();
        } else if (subAction === "del") {
            const reason = parts[4];
            const inviterId = parseInt(parts[5], 10);
            const candidateId = parseInt(parts[6], 10);
            if (!isNaN(inviterId)) delete groupIncomingInvites[inviterId];
            if (!isNaN(candidateId)) delete groupOutgoingInvites[candidateId];
            if (pendingGroupInvite && (pendingGroupInvite.id === inviterId || pendingGroupInvite.id === candidateId)) {
                pendingGroupInvite = null;
            }
            if (reason === "ack") {
                addServerInfoLogMessage("Invitation accepted.");
            } else if (reason === "rj" || reason === "rjc") {
                addServerInfoLogMessage("Invitation declined.");
            } else if (reason === "rv") {
                addServerInfoLogMessage("Invitation revoked.");
            }
            refreshGroupUi();
        } else if (subAction === "err") {
            const code = parts[4];
            if (INVITE_ERROR_MESSAGES[code]) {
                addServerInfoLogMessage(INVITE_ERROR_MESSAGES[code]);
            }
        }
        return;
    }
    if (action === "init") {
        const subAction = (parts[3] || "").toLowerCase();
        if (subAction === "grp") {
            for (const k in groupMembers) delete groupMembers[k];
            groupLeaderId = null;
            const groupId = parseInt(parts[4], 10) || 0;
            syntheticGroupChatServerId = groupId > 0 ? groupId : 0;
            const sizeCurrent = parseInt(parts[5], 10) || 0;
            groupInvitationBehavior = parseInt(parts[7], 10) || 0;
            const memberFields = parts.slice(9);
            const myHeroId = parseInt(heroId, 10);
            let orderIdx = 1;
            while (memberFields.length >= 19) {
                const block = memberFields.splice(0, 19);
                const member = parseMemberBlock(block, orderIdx);
                if (!member) continue;
                if (orderIdx === 1) {
                    groupLeaderId = member.id;
                }
                if (!isNaN(myHeroId) && member.id === myHeroId) {
                    orderIdx++;
                    continue;
                }
                groupMembers[member.id] = member;
                orderIdx++;
            }
            groupInGroupServerState = sizeCurrent > 1 || Object.keys(groupMembers).length > 0;
            if (Object.keys(groupMembers).length > 0) {
                addServerInfoLogMessage("Group formed!");
            }
            invalidateGroupMinimapCache();
            refreshGroupUi(true);
        }
        return;
    }
    if (action === "upd") {
        const memId = parseInt(parts[3], 10);
        const xmlData = parts[4];
        const member = groupMembers[memId];
        if (member && xmlData) {
            const extract = key => {
                const match = xmlData.match(new RegExp(`${key}="(\\d+)"`));
                return match ? parseInt(match[1], 10) : null;
            };
            const beforeMinimapState = getGroupMemberMinimapState(member);
            let changed = false;
            const hp = extract("hp");
            const maxHp = extract("hpM");
            const sh = extract("sh");
            const maxSh = extract("shM");
            const map = extract("map");
            const pos = xmlData.match(/pos="(-?\d+),(-?\d+)"/);
            const level = extract("lev");
            const faction = extract("fra");
            const act = extract("act");
            const clk = extract("clk");
            const tgt = extract("tgt");
            const shp = extract("shp");
            const fgt = extract("fgt");
            const off = extract("lgo");
            changed = setGroupMemberField(member, "hp", hp) || changed;
            changed = setGroupMemberField(member, "maxHp", maxHp) || changed;
            changed = setGroupMemberField(member, "shield", sh) || changed;
            changed = setGroupMemberField(member, "maxShield", maxSh) || changed;
            changed = setGroupMemberField(member, "mapId", map) || changed;
            if (pos) {
                changed = setGroupMemberField(member, "posX", parseInt(pos[1], 10)) || changed;
                changed = setGroupMemberField(member, "posY", parseInt(pos[2], 10)) || changed;
            }
            changed = setGroupMemberField(member, "level", level) || changed;
            changed = setGroupMemberField(member, "factionId", faction) || changed;
            changed = setGroupMemberField(member, "activity", act !== null ? Boolean(act) : null) || changed;
            changed = setGroupMemberField(member, "cloaked", clk !== null ? Boolean(clk) : null) || changed;
            changed = setGroupMemberField(member, "targetId", tgt) || changed;
            changed = setGroupMemberField(member, "shipType", shp) || changed;
            changed = setGroupMemberField(member, "fighting", fgt !== null ? Boolean(fgt) : null) || changed;
            changed = setGroupMemberField(member, "isOffline", off !== null ? Boolean(off) : null) || changed;
            if (changed) {
                applyGroupMemberMinimapDiff(memId, beforeMinimapState, getGroupMemberMinimapState(member));
                refreshGroupUi();
            }
        }
        return;
    }
    if (action === "lp") {
        const reason = parts[3];
        const targetId = parseInt(parts[4], 10);
        if (targetId === parseInt(heroId, 10)) {
            resetGroup(true);
            return;
        }
        if (groupMembers[targetId]) {
            let msg = `${groupMembers[targetId].name} left the group.`;
            if (reason === "kick") msg = `${groupMembers[targetId].name} was kicked from the group.`;
            addServerInfoLogMessage(msg);
            const beforeMinimapState = getGroupMemberMinimapState(groupMembers[targetId]);
            delete groupMembers[targetId];
            if (groupLeaderId === targetId) groupLeaderId = null;
            if (Object.keys(groupMembers).length === 0) {
                groupInGroupServerState = false;
                syntheticGroupChatServerId = 0;
            }
            applyGroupMemberMinimapDiff(targetId, beforeMinimapState, getGroupMemberMinimapState(null));
            refreshGroupUi(true);
        }
        return;
    }
    if (action === "png") {
        const gx = parseInt(parts[3], 10);
        const gy = parseInt(parts[4], 10);
        if (!isNaN(gx) && !isNaN(gy)) {
            const nowMs = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
            groupPings.push({
                x: gx,
                y: gy,
                t0: nowMs,
                count: 10
            });
            addServerInfoLogMessage("Group ping received.");
        }
        return;
    }
    if (action === "kill") {
        const targetId = parseInt(parts[3], 10);
        const member = groupMembers[targetId];
        if (member) {
            const changed = setGroupMemberField(member, "hp", 0);
            addServerInfoLogMessage(`${groupMembers[targetId].name} was destroyed.`);
            if (changed) refreshGroupUi();
        }
        return;
    }
    if (action === "jump") {
        const targetId = parseInt(parts[3], 10);
        const newMap = parseInt(parts[4], 10);
        const member = groupMembers[targetId];
        if (member && !isNaN(newMap)) {
            const beforeMinimapState = getGroupMemberMinimapState(member);
            const changed = setGroupMemberField(member, "mapId", newMap);
            if (changed) {
                applyGroupMemberMinimapDiff(targetId, beforeMinimapState, getGroupMemberMinimapState(member));
                refreshGroupUi();
            }
        }
        return;
    }
    if (action === "end") {
        resetGroup(true);
        return;
    }
    if (action === "nl") {
        const leaderId = parseInt(parts[3], 10);
        if (isNaN(leaderId)) return;
        groupLeaderId = leaderId;
        groupInGroupServerState = Object.keys(groupMembers).length > 0;
        const myHeroId = parseInt(heroId, 10);
        if (!isNaN(myHeroId) && leaderId === myHeroId) {
            addServerInfoLogMessage("You are the leader.");
        } else if (groupMembers[leaderId]) {
            addServerInfoLogMessage(`${groupMembers[leaderId].name} is the leader.`);
        } else {
            addServerInfoLogMessage("Group leader changed.");
        }
        refreshGroupUi();
        return;
    }
    if (action === "chib") {
        const behavior = parseInt(parts[3], 10);
        groupInvitationBehavior = behavior;
        refreshGroupUi();
        return;
    }
    if (action === "blk") {
        groupInvitesBlocked = Boolean(parseInt(parts[3], 10));
        addServerInfoLogMessage(groupInvitesBlocked ? "Group invitations blocked." : "Group invitations allowed.");
        refreshGroupUi();
        return;
    }
}

function handlePacket_N(parts, i) {
    const id = parseInt(parts[i], 10);
    const name = parts[i + 1] || "";
    const shield = parseInt(parts[i + 2], 10);
    const maxShield = parseInt(parts[i + 3], 10);
    const hp = parseInt(parts[i + 4], 10);
    const maxHp = parseInt(parts[i + 5], 10);
    if (isNaN(id)) return;
    if (id === -1) {
        if (typeof clearPendingTargetSelection === "function") clearPendingTargetSelection();
        clearHeroAttackRuntimeState({
            clearSelection: true,
            preserveMinimapMove: true
        });
        return;
    }
    if (heroId !== null && id === heroId) {
        if (!isNaN(shield)) heroShield = shield;
        if (!isNaN(maxShield)) heroMaxShield = maxShield;
        if (!isNaN(hp)) heroHp = hp;
        if (!isNaN(maxHp)) heroMaxHp = maxHp;
        __androPerfNoteEntityUpdate("hero_stats", {
            entityId: id,
            packetKind: "N",
            hpKnown: !isNaN(hp),
            shieldKnown: !isNaN(shield)
        });
    } else {
        const ent = ensureEntity(id);
        if (name) ent.name = name;
        if (!isNaN(shield)) ent.shield = shield;
        if (!isNaN(maxShield)) ent.maxShield = maxShield;
        if (!isNaN(hp)) ent.hp = hp;
        if (!isNaN(maxHp)) ent.maxHp = maxHp;
        ent.targetStatsHydrated = ent.hp != null && ent.maxHp != null && ent.shield != null && ent.maxShield != null;
        ent.targetStatsHydratedAt = __rxNowMs();
        if (typeof confirmTargetSelectionFromServer === "function") {
            confirmTargetSelectionFromServer(id, "N");
        } else {
            selectedTargetId = id;
        }
        if (ent.hp != null && ent.maxHp != null && ent.hp >= ent.maxHp) {
            clearEntityClaim(id);
        }
        __androPerfNoteEntityUpdate("entity_stats", {
            entityId: id,
            packetKind: "N",
            targetType: ent.kind,
            hpKnown: ent.hp != null,
            shieldKnown: ent.shield != null
        });
        __androPerfNoteTargetInfoApplied(id, "N");
    }
}

function resetMapState(newMapId) {
    resetReadyFlags();
    if (!isNaN(newMapId)) {
        currentMapId = newMapId;
        cfg.mapID = newMapId;
    }
    applyMapBackground(currentMapId);
    for (const id in entities) delete entities[id];
    invalidateGroupMinimapCache();
    if (typeof clearEntityRuntimeActiveLists === "function") clearEntityRuntimeActiveLists();
    for (const id in portals) delete portals[id];
    if (pendingAttackLocksByAttackerId instanceof Map) pendingAttackLocksByAttackerId.clear();
    if (attackLockAttackersByTargetId instanceof Map) attackLockAttackersByTargetId.clear();
    if (typeof clearAllCollectableAnimationStates === "function") clearAllCollectableAnimationStates();
    if (Array.isArray(stations)) {
        stations.length = 0;
    }
    laserBeams.length = 0;
    rocketAttacks.length = 0;
    if (Array.isArray(sabShots)) sabShots.length = 0;
    if (Array.isArray(rocketSmokeParticles)) rocketSmokeParticles.length = 0;
    if (Array.isArray(rocketLauncherMissDisplays)) rocketLauncherMissDisplays.length = 0;
    damageBubbles.length = 0;
    if (Array.isArray(shieldBursts)) shieldBursts.length = 0;
    if (Array.isArray(shieldTwinkles)) shieldTwinkles.length = 0;
    if (Array.isArray(hullDamageEffects)) hullDamageEffects.length = 0;
    if (Array.isArray(rocketDamageEffects)) rocketDamageEffects.length = 0;
    if (Array.isArray(portalJumpEffects)) portalJumpEffects.length = 0;
    explosions.length = 0;
    smartbombEffects.length = 0;
    if (Array.isArray(empEffects)) empEffects.length = 0;
    groupPings.length = 0;
    if (typeof cancelRsbBurst === "function") cancelRsbBurst(null);
    if (typeof clearSabRingState === "function") clearSabRingState();
    if (typeof clearSabLaserVisualJobs === "function") clearSabLaserVisualJobs();
    if (typeof clearRemovedEntitySnapshots === "function") clearRemovedEntitySnapshots();
    selectedTargetId = null;
    if (typeof clearPendingTargetSelection === "function") clearPendingTargetSelection();
    currentLaserTargetId = null;
    attackIntentTargetId = null;
    confirmedAttackTargetId = null;
    pendingAttackAckTargetId = null;
    pendingAttackAckStartMs = 0;
    resetPendingRangeResume();
    clearPendingCollectState();
    if (typeof clearAllCollectRequests === "function") {
        clearAllCollectRequests();
    } else if (typeof collectedBoxRequestIds !== "undefined") {
        collectedBoxRequestIds.clear();
    }
    if (typeof stopHeroCollectorBeam === "function") stopHeroCollectorBeam();
    moveTargetX = null;
    moveTargetY = null;
    moveTargetFromMinimap = false;
    window.minimapClickPointer = null;
    window.minimapEnemyWarningLevel = 0;
    window.heroDroneDisplayCounts = null;
    if (typeof clearHeroLevelUpEffects === "function") clearHeroLevelUpEffects();
    if (typeof clearHeroCombatLogActiveTarget === "function") clearHeroCombatLogActiveTarget();
    isChasingTarget = false;
    inDemilitarizedZone = false;
    inTradeZone = false;
    inJumpZone = false;
    radiationServerFlag = false;
    radiationWarningActive = false;
    radiationFade = 0;
    radiationPulseStart = 0;
    radiationFlashAlpha = 0;
    stopRadiationWarningTimer();
    if (typeof clearFlashPoiZones === "function") {
        clearFlashPoiZones();
    }
    if (typeof flashResetAllShipSkillVisualEffects === "function") {
        flashResetAllShipSkillVisualEffects();
    }
    if (typeof flashResetAllTechItemVisualEffects === "function") {
        flashResetAllTechItemVisualEffects();
    }
    if (typeof clearEnergyLeechEchoBeams === "function") {
        clearEnergyLeechEchoBeams();
    }
}

function invalidateGroupMinimapCache() {
    if (typeof window !== "undefined" && typeof window.invalidateMinimapEntityRenderCache === "function") {
        window.invalidateMinimapEntityRenderCache();
    }
}

function getCurrentGroupNetworkMapId() {
    const activeMapId = typeof currentMapId !== "undefined" && currentMapId !== null ? parseInt(currentMapId, 10) : NaN;
    if (Number.isFinite(activeMapId) && activeMapId > 0) return activeMapId;
    const cfgMapId = typeof cfg !== "undefined" && cfg && cfg.mapID != null ? parseInt(cfg.mapID, 10) : NaN;
    return Number.isFinite(cfgMapId) && cfgMapId > 0 ? cfgMapId : null;
}

function handlePacket_i(parts, i) {
    const newMapId = parseInt(parts[i], 10);
    if (isNaN(newMapId)) return;
    try {
        if (typeof endPortalJumpLock === "function") {
            endPortalJumpLock("map_change");
        }
    } catch (_) {}
    const __curMapId = typeof currentMapId !== "undefined" && currentMapId !== null ? parseInt(currentMapId, 10) : NaN;
    if (!isNaN(__curMapId) && __curMapId === newMapId) {
        return;
    }
    const prevMapId = typeof currentMapId !== "undefined" ? currentMapId : null;
    resetMapState(newMapId);
    if (prevMapId !== null && prevMapId !== newMapId) {
        try {
            if (window.AudioManager && typeof window.AudioManager.playSoundEffect === "function") {
                window.AudioManager.playSoundEffect(6, false, false, -1, -1, true);
            }
        } catch (_) {}
    }
}

function getKnownPlayerEffectEntity(targetId) {
    if (targetId == null || targetId === heroId) return null;
    const ent = entities[targetId];
    if (!ent || ent.kind === "unknown") return null;
    return ent;
}

function getExistingVisualEntity(targetId) {
    const numericId = Number(targetId);
    if (!Number.isFinite(numericId) || numericId === 0) return null;
    if (typeof heroId !== "undefined" && numericId === Number(heroId)) return null;
    const ent = entities[numericId] || entities[String(numericId)];
    if (!ent || ent.kind === "unknown") return null;
    return ent;
}

function handlePacket_n(parts, i) {
    if (parts.length < i + 1) return;
    const sub = parts[i];
    if (sub && sub.toUpperCase() === "P") {
        const action = (parts[i + 1] || "").toUpperCase();
        if (action === "REM") {
            const portalId = parseInt(parts[i + 2], 10);
            if (!isNaN(portalId) && portals[portalId]) {
                const portal = portals[portalId];
                const now = performance.now();
                const pendingDelay = 350;
                const activeDuration = typeof PORTAL_ACTIVE_DURATION !== "undefined" ? PORTAL_ACTIVE_DURATION : 1e3;
                portal.pendingRemoval = true;
                portal.pendingRemovalAt = Math.max(Number(portal.pendingRemovalAt || 0) || 0, now + pendingDelay);
                if (portal.playJump && portal.jumpStart) {
                    portal.pendingRemovalAt = Math.max(Number(portal.pendingRemovalAt || 0) || 0, Number(portal.jumpStart || 0) + activeDuration);
                }
            }
        }
        return;
    }
    if (sub === "pt") {
        const targetId = parseInt(parts[i + 1], 10);
        const titleKey = (parts[i + 2] || "").trim();
        if (!isNaN(targetId)) {
            if (targetId === heroId) {
                window.heroGameTitleKey = titleKey;
            }
            const ent = ensureEntity(targetId);
            ent.gameTitleKey = titleKey;
        }
        return;
    }
    if (sub && sub.toUpperCase() === "EMP") {
        const targetId = parseInt(parts[i + 1], 10);
        if (!isNaN(targetId)) {
            const now = performance.now();
            const empDurationMs = 2e3;
            let fxX = shipX;
            let fxY = shipY;
            if (targetId === heroId) {
                heroEmpImmunityUntil = now + empDurationMs;
                heroTargetFaded = true;
                heroTargetFadeUntil = now + empDurationMs;
            } else {
                const ent = getKnownPlayerEffectEntity(targetId);
                if (!ent) return;
                ent.empImmunityUntil = now + empDurationMs;
                ent.targetFaded = true;
                ent.targetFadeUntil = now + empDurationMs;
                refreshEntityTemporaryStatusRegistration(ent);
                fxX = typeof ent.x === "number" ? ent.x : shipX;
                fxY = typeof ent.y === "number" ? ent.y : shipY;
            }
            spawnEmpEffect(targetId, fxX, fxY);
            try {
                playSfxOnce(43, "EMP:" + targetId, fxX, fxY, 350);
            } catch (_) {}
        }
    } else if (sub === "ISH") {
        const targetId = parseInt(parts[i + 1], 10);
        if (!isNaN(targetId)) {
            if (targetId === heroId) {
                setHeroShieldEffect("ISH", true, ISH_DURATION_MS);
            } else {
                const ent = getKnownPlayerEffectEntity(targetId);
                if (!ent) return;
                setEntityShieldEffect(ent, "ISH", true, ISH_DURATION_MS);
            }
            playSfxOnce(31, "ISH:" + targetId, -1, -1, 350);
        }
    } else if (sub === "INV") {
        const targetId = parseInt(parts[i + 1], 10);
        const state = parseInt(parts[i + 2], 10);
        const invisible = state === 1;
        if (!isNaN(targetId)) {
            if (targetId === heroId) {
                heroCloaked = invisible;
            } else {
                const ent = getExistingVisualEntity(targetId);
                if (!ent) return;
                ent.invisible = invisible;
                if (typeof window.__flashRefreshEntityInteractionAfterInv === "function") {
                    window.__flashRefreshEntityInteractionAfterInv(targetId, invisible);
                }
            }
        }
    } else if (sub === "SMB") {
        const targetId = parseInt(parts[i + 1], 10);
        if (!isNaN(targetId)) {
            let fxX = null;
            let fxY = null;
            if (targetId === heroId) {
                fxX = shipX;
                fxY = shipY;
            } else {
                const ent = getKnownPlayerEffectEntity(targetId);
                if (!ent) return;
                fxX = ent.x;
                fxY = ent.y;
            }
            if (fxX != null && fxY != null) {
                const isHeroTarget = targetId === heroId;
                spawnSmartbombEffect(fxX, fxY, isHeroTarget);
                playSfxOnce(30, "SMB:" + targetId, -1, -1, 350);
            }
        }
    } else if (sub === "LSH") {
        const targetId = parseInt(parts[i + 1], 10);
        const ownerId = parseInt(parts[i + 2], 10);
        const myHeroId = parseInt(heroId, 10);
        const ownerIsHero = Number.isFinite(ownerId) && Number.isFinite(myHeroId) && ownerId === myHeroId;
        const targetIsGroupMember = typeof groupMembers === "object" && groupMembers
            && Object.prototype.hasOwnProperty.call(groupMembers, String(targetId));
        const shouldGray = !(ownerIsHero || targetIsGroupMember);
        if (!isNaN(targetId)) {
            if (targetId === myHeroId) {
                heroTargetFaded = shouldGray;
            } else {
                const ent = getExistingVisualEntity(targetId);
                if (!ent) return;
                ent.targetRingGray = shouldGray;
            }
        }
    } else if (sub === "USH") {
        const targetId = parseInt(parts[i + 1], 10);
        if (!isNaN(targetId)) {
            if (targetId === heroId) {
                heroTargetFaded = false;
            } else if (entities[targetId]) {
                entities[targetId].targetRingGray = false;
            }
        }
    } else if (sub === "ssi") {
        const mmo = parseInt(parts[i + 1], 10);
        const eic = parseInt(parts[i + 2], 10);
        const vru = parseInt(parts[i + 3], 10);
        const spd = parseInt(parts[i + 4], 10);
        const own = parseInt(parts[i + 5], 10);
        updateSpaceballHUD(mmo, eic, vru, spd, own);
    } else if (sub === "ssc") {
        const faction = parseInt(parts[i + 1], 10);
        const score = parseInt(parts[i + 2], 10);
        if (faction === 1) updateSpaceballHUD(score, null, null, null, null);
        if (faction === 2) updateSpaceballHUD(null, score, null, null, null);
        if (faction === 3) updateSpaceballHUD(null, null, score, null, null);
    } else if (sub === "fx") {
        const action = (parts[i + 1] || "").toLowerCase();
        const effect = (parts[i + 2] || "").toUpperCase();
        const targetId = parseInt(parts[i + 3], 10);
        if (!isNaN(targetId)) {
            const targetIsHero = Number(targetId) === Number(heroId);
            const targetEnt = targetIsHero ? null : getExistingVisualEntity(targetId);
            if (!targetIsHero && !targetEnt) return;
            const activate = action === "start";
            if (effect === "INVINCIBILITY") {
                if (targetIsHero) setHeroShieldEffect("INVINCIBILITY", activate, INVINCIBILITY_DURATION_MS); else setEntityShieldEffect(targetEnt, "INVINCIBILITY", activate, INVINCIBILITY_DURATION_MS);
            } else if (effect === "ISH") {
                if (targetIsHero) setHeroShieldEffect("ISH", activate, ISH_DURATION_MS); else setEntityShieldEffect(targetEnt, "ISH", activate, ISH_DURATION_MS);
            } else if (effect === "BATTLE_REP_BOT" || effect === "TECH_BATTLE_REP_BOT_EFFECT" || parseInt(effect, 10) === 12) {
                if (targetIsHero && typeof setHeroBattleRepairing === "function") {
                    const durationSeconds = parseInt(parts[i + 4], 10);
                    const durationMs = !isNaN(durationSeconds) ? durationSeconds * 1e3 : null;
                    setHeroBattleRepairing(activate, durationMs);
                }
            }
        }
    } else if (sub === "sss") {
        const owner = parseInt(parts[i + 1], 10);
        const speed = parseInt(parts[i + 2], 10);
        updateSpaceballHUD(null, null, null, speed, owner);
    } else if (sub === "sse") {
        if (typeof endSpaceballScoreboard === "function") {
            endSpaceballScoreboard();
        }
    } else if (sub === "d") {
        const targetId = parseInt(parts[i + 1], 10);
        const droneStr = parts[i + 2] || "";
        const parsedDrones = parseDrones(droneStr);
        const derivedCounts = deriveDroneDisplayCountsFromConnector(parsedDrones);
        if (targetId === heroId) {
            transferDroneAnimState(window.heroDrones, parsedDrones);
            window.heroDrones = parsedDrones;
            window.heroDroneDisplayCounts = derivedCounts;
        } else {
            const ent = getExistingVisualEntity(targetId);
            if (!ent) return;
            transferDroneAnimState(ent.drones, parsedDrones);
            ent.drones = parsedDrones;
            ent.droneDisplayCounts = derivedCounts;
        }
    } else if (sub === "e") {
        const targetId = parseInt(parts[i + 1], 10);
        const counts = normalizeDroneDisplayCounts(parts[i + 2] || "");
        const emptyConnector = {
            groupCount: 0,
            groupDimension: DRONE_GROUP_DIMENSION,
            groups: []
        };
        if (targetId === heroId) {
            if (!window.heroDrones || !window.heroDrones.groups || !window.heroDrones.groups.length) {
                window.heroDrones = emptyConnector;
            }
            window.heroDroneDisplayCounts = counts;
        } else {
            const ent = getExistingVisualEntity(targetId);
            if (!ent) return;
            if (!ent.drones || !ent.drones.groups || !ent.drones.groups.length) {
                ent.drones = emptyConnector;
            }
            ent.droneDisplayCounts = counts;
        }
    }
}

var DRONE_GROUP_RADIUS = typeof DRONE_GROUP_RADIUS !== "undefined" ? DRONE_GROUP_RADIUS : 75;

var DRONE_RADIUS = typeof DRONE_RADIUS !== "undefined" ? DRONE_RADIUS : 15;

var DRONE_GROUP_DIMENSION = DRONE_GROUP_RADIUS * 2;

const DRONE_POSITION_TOP = 0;

const DRONE_POSITION_RIGHT = 1;

const DRONE_POSITION_DOWN = 2;

const DRONE_POSITION_LEFT = 3;

const DRONE_POSITION_CENTER = 4;

function resolveDroneKind(typeId) {
    if (typeId === 1) return "flax";
    return "iris";
}

function resolveDroneRadius(typeId, level) {
    if (!Number.isFinite(typeId) || !Number.isFinite(level)) return DRONE_RADIUS * 2;
    return DRONE_RADIUS * 2;
}

function mapGroupPosition(groupCount, groupIndex) {
    if (groupCount === 1) return DRONE_POSITION_DOWN;
    if (groupCount === 2) return groupIndex === 0 ? DRONE_POSITION_LEFT : DRONE_POSITION_RIGHT;
    if (groupCount === 3) {
        if (groupIndex === 0) return DRONE_POSITION_RIGHT;
        if (groupIndex === 1) return DRONE_POSITION_DOWN;
        return DRONE_POSITION_LEFT;
    }
    if (groupIndex === 0) return DRONE_POSITION_RIGHT;
    if (groupIndex === 1) return DRONE_POSITION_DOWN;
    if (groupIndex === 2) return DRONE_POSITION_LEFT;
    return DRONE_POSITION_TOP;
}

function mapDronePosition(droneCount, droneIndex) {
    if (droneCount === 1) return DRONE_POSITION_CENTER;
    if (droneCount === 2) return droneIndex === 0 ? DRONE_POSITION_LEFT : DRONE_POSITION_RIGHT;
    if (droneCount === 3) {
        if (droneIndex === 0) return DRONE_POSITION_TOP;
        if (droneIndex === 1) return DRONE_POSITION_RIGHT;
        return DRONE_POSITION_LEFT;
    }
    if (droneIndex === 0) return DRONE_POSITION_TOP;
    if (droneIndex === 1) return DRONE_POSITION_RIGHT;
    if (droneIndex === 2) return DRONE_POSITION_LEFT;
    return DRONE_POSITION_DOWN;
}

function createDroneAnimState() {
    return {
        currentRotationDeg: NaN,
        startRotationDeg: NaN,
        targetRotationDeg: NaN,
        startTimeMs: NaN,
        lastBaseRotationDeg: NaN,
        lastRetargetMs: 0,
        desiredBaseRotationDeg: NaN
    };
}

function parseDrones(droneStr) {
    const emptyResult = {
        groupCount: 0,
        groupDimension: DRONE_GROUP_DIMENSION,
        groups: []
    };
    if (!droneStr || typeof droneStr !== "string") return emptyResult;
    const trimmed = droneStr.trim();
    if (!trimmed) return emptyResult;
    const segments = trimmed.split("/").filter(s => s !== "");
    if (!segments.length) return emptyResult;
    const groupCount = parseInt(segments.shift(), 10);
    if (!Number.isFinite(groupCount) || groupCount <= 0) return emptyResult;
    const groups = [];
    for (let i = 0; i < segments.length; i++) {
        const rawGroup = segments[i];
        if (!rawGroup) continue;
        const parts = rawGroup.split("-").filter(p => p !== "");
        if (!parts.length) continue;
        const droneCount = parseInt(parts.shift(), 10);
        if (!Number.isFinite(droneCount) || droneCount <= 0) continue;
        const drones = [];
        for (let j = 0; j < parts.length; j++) {
            const token = parts[j];
            const tokenParts = token.split(",");
            const digits = (tokenParts[0] || "").trim();
            const designToken = (tokenParts[1] || "").trim().toLowerCase();
            if (digits.length < 2) continue;
            const typeId = parseInt(digits.charAt(0), 10);
            const level = parseInt(digits.charAt(1), 10);
            const baseKind = resolveDroneKind(typeId);
            const hasHavokDesign = baseKind === "iris" && (designToken === "h" || designToken === "havok" || designToken === "havoc" || designToken === "1");
            drones.push({
                type: Number.isNaN(typeId) ? null : typeId,
                kind: hasHavokDesign ? "havok" : baseKind,
                design: hasHavokDesign ? "havok" : null,
                level: Number.isNaN(level) ? null : level,
                position: mapDronePosition(droneCount, j),
                dimension: resolveDroneRadius(typeId, level)
            });
        }
        if (drones.length) {
            groups.push({
                position: mapGroupPosition(groupCount, i),
                drones: drones,
                _anim: createDroneAnimState()
            });
        }
    }
    return {
        groupCount: groupCount,
        groupDimension: DRONE_GROUP_DIMENSION,
        groups: groups
    };
}

function transferDroneAnimState(prevConnector, nextConnector) {
    if (!prevConnector || !nextConnector) return;
    if (!prevConnector.groups || !nextConnector.groups) return;
    const prevByPos = {};
    for (const g of prevConnector.groups) {
        if (!g) continue;
        prevByPos[g.position] = g;
    }
    for (const g of nextConnector.groups) {
        if (!g) continue;
        const old = prevByPos[g.position];
        if (old && old._anim) {
            g._anim = old._anim;
        } else if (!g._anim) {
            g._anim = createDroneAnimState();
        }
    }
}

function playSfxOnce(soundId, key, x = -1, y = -1, cooldownMs = 350) {
    try {
        if (!window.AudioManager || typeof window.AudioManager.playSoundEffect !== "function") return;
        const now = performance.now();
        const store = window.__sfxOnceAt = window.__sfxOnceAt || {};
        const k = String(soundId) + ":" + String(key || "");
        if (store[k] && now - store[k] < cooldownMs) return;
        store[k] = now;
        window.AudioManager.playSoundEffect(soundId, false, false, x, y, true);
    } catch (_) {}
}

function handlePacket_S(parts, i) {
    if (parts.length < i + 1) return;
    const subOpcode = parts[i];
    switch (subOpcode) {
      case "CFG":
        {
            const cfgId = parseInt(parts[i + 1], 10);
            if (!isNaN(cfgId)) {
                heroConfig = cfgId;
            }
            break;
        }

      case "ROB":
        {
            if (typeof setHeroRepairing === "function") {
                setHeroRepairing(true);
            }
            if (typeof cpuItems !== "undefined" && cpuItems && cpuItems.ROB) {
                cpuItems.ROB.hasItem = true;
                cpuItems.ROB.state = true;
            }
            if (typeof renderActionDrawerItems === "function") {
                renderActionDrawerItems();
            }
            if (typeof drawQuickbar === "function") {
                drawQuickbar();
            }
            break;
        }

      case "ISH":
        {
            const state = (parts[i + 1] || "1").toString().toUpperCase();
            const active = state === "1" || state === "ON" || state === "TRUE";
            setHeroShieldEffect("ISH", active, ISH_DURATION_MS);
            if (active) {
                playSfxOnce(31, "ISH:hero", -1, -1, 350);
            }
            addServerInfoLogMessage(heroIshActive ? "ISH (Insta-shield) activated." : "ISH ended.");
            break;
        }

      case "SMB":
        {
            const state = (parts[i + 1] || "1").toString().toUpperCase();
            heroSmbJustUsed = state === "1" || state === "ON" || state === "TRUE";
            addServerInfoLogMessage("Smartbomb triggered.");
            playSfxOnce(30, "SMB:hero", -1, -1, 350);
            break;
        }

      case "EMP":
        {
            const targetId = parseInt(parts[i + 1], 10);
            if (isNaN(targetId)) return;
            const now = performance.now();
            const empDurationMs = 2e3;
            let targetEnt = null;
            let fxX = shipX;
            let fxY = shipY;
            if (targetId !== heroId) {
                targetEnt = getKnownPlayerEffectEntity(targetId);
                if (!targetEnt) break;
                fxX = typeof targetEnt.x === "number" ? targetEnt.x : shipX;
                fxY = typeof targetEnt.y === "number" ? targetEnt.y : shipY;
            }
            try {
                playSfxOnce(43, "EMP:" + targetId, fxX, fxY, 350);
            } catch (_) {}
            if (targetId === heroId) {
                heroEmpImmunityUntil = now + empDurationMs;
                heroTargetFaded = true;
                heroTargetFadeUntil = now + empDurationMs;
            } else if (targetEnt) {
                targetEnt.empImmunityUntil = now + empDurationMs;
                targetEnt.targetFaded = true;
                targetEnt.targetFadeUntil = now + empDurationMs;
                refreshEntityTemporaryStatusRegistration(targetEnt);
            }
            break;
        }

      case "CLK":
        {
            const state = (parts[i + 1] || "1").toString().toUpperCase();
            const active = state === "1" || state === "ON" || state === "TRUE";
            addServerInfoLogMessage(active ? "Cloak activated." : "Cloak deactivated.");
            break;
        }

      default:
        break;
    }
}

function triggerSlot(slot) {
    const item = quickSlots[slot];
    if (!item) return;
    const catalogItem = typeof resolveQuickbarCatalogItem === "function" ? resolveQuickbarCatalogItem(item) || item : item;
    const actionCode = getActionCodeForSlot(slot);
    if (actionCode && isActionBlacklisted(actionCode)) {
        return;
    }
    if (actionCode) {
        const cd = getCooldownInfo(actionCode);
        if (cd) {
            return;
        }
    }
    try {
        if (window.AudioManager && typeof window.AudioManager.playSoundEffect === "function") {
            window.AudioManager.playSoundEffect(25, false, false, -1, -1, true);
        }
    } catch (_) {}
    if (typeof executeItemActionDirectly === "function") {
        executeItemActionDirectly(catalogItem, {
            source: "quickbar"
        });
        return;
    }
    if (catalogItem.type === "ammo") {
        if (currentAmmoId !== catalogItem.id) {
            sendSelectAmmo(catalogItem.id);
        }
        if (selectedTargetId !== null) {
            sendLaserAttack(selectedTargetId);
            isChasingTarget = false;
        }
    } else if (catalogItem.type === "rocket") {
        if (currentRocketId !== catalogItem.id) {
            sendSelectRocket(catalogItem.id);
        }
    } else if (catalogItem.type === "tech") {
        sendTechActivation(catalogItem.id);
    } else if (catalogItem.type === "explosive" || catalogItem.type === "cpu") {
        sendCpuAction(catalogItem.code);
    } else if (catalogItem.type === "mine") {
        sendRaw("u|m|" + catalogItem.id);
    }
}

function handlePacket_m(parts, i) {
    let start = i;
    if (parts[0] === "0" && parts[1] === "m") {
        start = 2;
    }
    if (parts.length < start + 3) return;
    const mode = parseInt(parts[start], 10) || 0;
    const cx = parseInt(parts[start + 1], 10);
    const cy = parseInt(parts[start + 2], 10);
    if (isNaN(cx) || isNaN(cy)) return;
    queueMapLoaded("packet m");
    try {
        if (typeof endPortalJumpLock === "function" && typeof isPortalJumpLocked === "function" && isPortalJumpLocked()) {
            endPortalJumpLock("map_loaded");
        }
    } catch (_) {}
}

function handlePacket_w(parts, i) {
    let start = i;
    if (parts[0] === "0" && parts[1] === "w") {
        start = 2;
    }
    if (parts.length < start + 1) return;
    const lvl = parseInt(parts[start], 10);
    if (isNaN(lvl)) return;
    window.minimapEnemyWarningLevel = lvl;
}

function normalizeDroneDisplayCounts(rawValue) {
    if (rawValue == null) return null;
    const parts = String(rawValue).split("/");
    if (parts.length < 2) return null;
    const flax = Math.max(0, parseInt(parts[0], 10) || 0);
    const iris = Math.max(0, parseInt(parts[1], 10) || 0);
    return flax > 0 || iris > 0 ? {
        flax: flax,
        iris: iris
    } : null;
}

function deriveDroneDisplayCountsFromConnector(connector) {
    if (!connector || !Array.isArray(connector.groups) || !connector.groups.length) {
        return null;
    }
    let flax = 0;
    let iris = 0;
    for (const group of connector.groups) {
        if (!group || !Array.isArray(group.drones)) continue;
        for (const drone of group.drones) {
            if (!drone) continue;
            if (drone.kind === "flax" || drone.type === 1) flax++; else iris++;
        }
    }
    return flax > 0 || iris > 0 ? {
        flax: flax,
        iris: iris
    } : null;
}

function isHeroHomeEnemyWarningMap() {
    const faction = parseInt(window.heroFactionId, 10) || 0;
    const mapId = parseInt(currentMapId || cfg && cfg.mapID, 10) || 0;
    if (faction === 1) return mapId === 1 || mapId === 2 || mapId === 3;
    if (faction === 2) return mapId === 5 || mapId === 6 || mapId === 7;
    if (faction === 3) return mapId === 9 || mapId === 10 || mapId === 11;
    return false;
}

function countVisibleForeignPlayersForMinimapWarning() {
    const heroFaction = parseInt(window.heroFactionId, 10) || 0;
    if (!heroFaction) return 0;
    const seen = new Set;
    let enemies = 0;
    for (const key in entities) {
        const ent = entities[key];
        if (!ent || ent.kind !== "player") continue;
        const entityId = Number.isFinite(ent.id) ? ent.id : parseInt(key, 10);
        if (!Number.isFinite(entityId) || seen.has(entityId) || entityId === heroId) continue;
        seen.add(entityId);
        if (ent.invisible) continue;
        const faction = parseInt(ent.factionId, 10) || 0;
        if (!faction || faction === heroFaction) continue;
        enemies++;
        if (enemies >= 5) break;
    }
    return enemies;
}

function maybeClearMinimapEnemyWarningAfterForeignRemoval(removedEntity) {
    if (!removedEntity || removedEntity.kind !== "player") return;
    const removedFaction = parseInt(removedEntity.factionId, 10) || 0;
    const heroFaction = parseInt(window.heroFactionId, 10) || 0;
    if (!removedFaction || !heroFaction || removedFaction === heroFaction) return;
    if (!isHeroHomeEnemyWarningMap()) return;
    const currentLevel = parseInt(window.minimapEnemyWarningLevel, 10) || 0;
    if (currentLevel > 1) return;
    const visibleEnemies = countVisibleForeignPlayersForMinimapWarning();
    if (visibleEnemies === 0 && currentLevel !== 0) {
        window.minimapEnemyWarningLevel = 0;
    }
}

function handlePacket_H(parts, i) {
    if (parts.length < i + 2) return;
    const x = parseInt(parts[i], 10);
    const y = parseInt(parts[i + 1], 10);
    if (!isNaN(x) && !isNaN(y)) {
        shipX = x;
        shipY = y;
        cameraX = shipX;
        cameraY = shipY;
        __androPerfNoteEntityUpdate("hero_position", {
            entityId: typeof heroId !== "undefined" ? heroId : null,
            packetKind: "H",
            x: x,
            y: y
        });
    }
}

function handlePacket_HPT(parts, i) {
    if (parts.length < i + 2) return;
    const hp = parseInt(parts[i], 10);
    const maxHp = parseInt(parts[i + 1], 10);
    if (!isNaN(hp)) {
        heroHp = hp;
    }
    if (!isNaN(maxHp) && maxHp >= 0) {
        heroMaxHp = maxHp;
    }
    if (typeof setHeroRepairing === "function" && heroRepairing && !isNaN(hp) && !isNaN(maxHp) && maxHp > 0 && hp >= maxHp) {
        setHeroRepairing(false);
    }
    if (!isNaN(hp) || !isNaN(maxHp)) {
        __androPerfNoteEntityUpdate("hero_hp", {
            entityId: typeof heroId !== "undefined" ? heroId : null,
            packetKind: "HPT",
            hpKnown: !isNaN(hp)
        });
    }
}

function resetEntityInterpolationTo(ent, x, y) {
    if (!ent || !Number.isFinite(x) || !Number.isFinite(y)) return;
    ent.x = x;
    ent.y = y;
    if (!ent.interp) {
        ent.interp = {
            startX: x,
            startY: y,
            endX: x,
            endY: y,
            startTime: performance.now(),
            duration: 0
        };
        return;
    }
    ent.interp.startX = x;
    ent.interp.startY = y;
    ent.interp.endX = x;
    ent.interp.endY = y;
    ent.interp.startTime = performance.now();
    ent.interp.duration = 0;
}

function resolveEntityInterpolationPoseNow(ent, now = performance.now()) {
    if (!ent) return { x: 0, y: 0 };
    let x = Number.isFinite(ent.x) ? ent.x : 0;
    let y = Number.isFinite(ent.y) ? ent.y : 0;
    const p = ent.interp;
    if (!p || !Number.isFinite(p.duration) || p.duration <= 0 || !Number.isFinite(p.startTime)) {
        return { x, y };
    }
    const t = (now - p.startTime) / p.duration;
    if (t >= 1) {
        x = Number.isFinite(p.endX) ? p.endX : x;
        y = Number.isFinite(p.endY) ? p.endY : y;
        resetEntityInterpolationTo(ent, x, y);
        return { x, y };
    }
    if (t <= 0) {
        x = Number.isFinite(p.startX) ? p.startX : x;
        y = Number.isFinite(p.startY) ? p.startY : y;
        return { x, y };
    }
    const startX = Number.isFinite(p.startX) ? p.startX : x;
    const startY = Number.isFinite(p.startY) ? p.startY : y;
    const endX = Number.isFinite(p.endX) ? p.endX : x;
    const endY = Number.isFinite(p.endY) ? p.endY : y;
    return {
        x: startX + (endX - startX) * t,
        y: startY + (endY - startY) * t
    };
}

function startEntityInterpolationTo(ent, x, y, duration, now = performance.now()) {
    if (!ent || !Number.isFinite(x) || !Number.isFinite(y)) return;
    const current = resolveEntityInterpolationPoseNow(ent, now);
    ent.x = current.x;
    ent.y = current.y;
    if (!ent.interp) {
        ent.interp = {
            startX: current.x,
            startY: current.y,
            endX: x,
            endY: y,
            startTime: now,
            duration: duration
        };
        return;
    }
    ent.interp.startX = current.x;
    ent.interp.startY = current.y;
    ent.interp.endX = x;
    ent.interp.endY = y;
    ent.interp.startTime = now;
    ent.interp.duration = duration;
}

function handlePacket_move(parts, i) {
    const remaining = parts.length - i;
    if (remaining < 3) return;
    let id = 0;
    let x = 0;
    let y = 0;
    let time = 0;
    let isHeroCorrection = false;
    if (remaining === 3) {
        x = parseInt(parts[i], 10);
        y = parseInt(parts[i + 1], 10);
        time = parseFloat(parts[i + 2] || "0");
        id = heroId;
        isHeroCorrection = true;
    } else if (remaining >= 4) {
        id = parseInt(parts[i], 10);
        x = parseInt(parts[i + 1], 10);
        y = parseInt(parts[i + 2], 10);
        time = parseFloat(parts[i + 3] || "0");
        if (id === heroId) {
            isHeroCorrection = true;
        }
    } else {
        return;
    }
    if (isNaN(id) || isNaN(x) || isNaN(y)) return;
    if (isHeroCorrection) {
        moveTargetX = x;
        moveTargetY = y;
        if (Number.isFinite(time) && time <= 0) {
            shipX = x;
            shipY = y;
            moveTargetX = null;
            moveTargetY = null;
            moveTargetFromMinimap = false;
        }
        __androPerfNoteEntityUpdate("hero_move", {
            entityId: id,
            packetKind: "1",
            x: x,
            y: y
        });
        return;
    }
    const ent = ensureEntity(id);
    if (ent.kind === "box") return;
    if (ent.kind === "unknown") ent.kind = "player";
    applyPendingAttackLockForEntity(id);
    const now = performance.now();
    const dur = Number.isFinite(time) && time > 0 ? time : 0;
    if (ent.interp.duration === 0 && ent.x === 0 && ent.y === 0) {
        resetEntityInterpolationTo(ent, x, y);
    } else if (dur <= 0) {
        resetEntityInterpolationTo(ent, x, y);
    } else {
        startEntityInterpolationTo(ent, x, y, dur, now);
    }
    __androPerfNoteEntityUpdate("entity_move", {
        entityId: id,
        packetKind: "1",
        targetType: ent.kind,
        x: x,
        y: y
    });
}

function handlePacket_d(parts, i) {
    if (parts.length < i + 1) return;
    applySelectedRocketFromServer(parts[i], "opcode d");
}

function handlePacket_A(parts, i) {
    if (parts.length < i + 1) return;
    const subOpcode = parts[i];
    switch (subOpcode) {
      case "SET":
        {
            applyFlashSettingsChunk(parts.slice(i + 1));
            break;
        }

      case "C":
        {
            const itemType = parseInt(parts[i + 1], 10);
            const itemQty = parseInt(parts[i + 2], 10);
            if (!isNaN(itemType) && !isNaN(itemQty)) {
                if (typeof ammoStock !== "undefined") {
                    ammoStock[itemType] = itemQty;
                }
                if (typeof renderActionDrawerItems === "function") {
                    renderActionDrawerItems();
                }
                if (typeof drawQuickbar === "function") {
                    drawQuickbar();
                }
            }
            break;
        }

      case "SHS":
        {
            const enabled = parseInt(parts[i + 1], 10) || 0;
            const minTwinkle = parseInt(parts[i + 2], 10) || 0;
            const maxTwinkle = parseInt(parts[i + 3], 10) || 0;
            heroShowSkinShieldRandomly = enabled === 1;
            heroMinSkinShieldTwinkle = minTwinkle;
            heroMaxSkinShieldTwinkle = maxTwinkle;
            if (typeof updateHeroShieldTwinkle === "function") {
                updateHeroShieldTwinkle();
            }
            break;
        }

      case "CPU":
        {
            const cpuType = (parts[i + 1] || "").toString().toUpperCase();
            const rawVal = parts[i + 2];
            if (cpuType === "R") {
                const state = parseInt(rawVal, 10);
                const normalized = state === 1 ? 1 : 0;
                const hasAutoRocketCpu = !!(typeof window.heroHasAutoRocketCpu === "boolean"
                    ? window.heroHasAutoRocketCpu
                    : (cpuItems && cpuItems.ARL && cpuItems.ARL.hasItem));
                window.heroAutoRocketSkill = hasAutoRocketCpu ? normalized : 0;
                if (cpuItems && cpuItems.ARL) {
                    cpuItems.ARL.state = hasAutoRocketCpu && normalized === 1;
                }
                if (typeof renderActionDrawerItems === "function") {
                    renderActionDrawerItems();
                }
                if (typeof drawQuickbar === "function") {
                    drawQuickbar();
                }
            } else if (cpuType === "C") {
                const charge = parseInt(rawVal, 10);
                if (!isNaN(charge)) {
                    window.heroCloakCpuCharge = charge;
                    if (cpuItems && cpuItems.CLK) {
                        cpuItems.CLK.amount = Math.max(0, charge);
                        if (cpuItems.CLK.hasItem == null) {
                            cpuItems.CLK.hasItem = true;
                        }
                    }
                }
            } else if (cpuType === "Y") {
                const state = parseInt(rawVal, 10);
                const hasLauncherCpu = !!(typeof cpuItems !== "undefined" && cpuItems && cpuItems.RLC && cpuItems.RLC.hasItem);
                window.heroRocketLauncherAutoCpuState = hasLauncherCpu && state === 1 ? 1 : 0;
                if (typeof cpuItems !== "undefined" && cpuItems && cpuItems.RLC) {
                    cpuItems.RLC.state = hasLauncherCpu && window.heroRocketLauncherAutoCpuState === 1;
                }
                if (typeof renderActionDrawerItems === "function") {
                    renderActionDrawerItems();
                }
                if (typeof drawQuickbar === "function") {
                    drawQuickbar();
                }
            }
            break;
        }

      case "STD":
        {
            const msg = String(parts[i + 1] || "");
            if (msg) {
                addServerInfoLogMessage(msg, "STD");
            }
            break;
        }

      case "STM":
        {
            if (typeof __loadFlashLocaleMapOnce === "function") {
                __loadFlashLocaleMapOnce();
            }
            const payload = parts.slice(i + 1);
            const localeKey = String(payload[0] || "");
            const localized = assembleFlashLocalizedLogMessage(payload);
            if (localized) {
                addServerInfoLogMessage(localized, "STM");
            }
            if (localeKey) {
                const denyKeys = new Set([ "jump_cpu_failed_attack", "jump_cpu_failed_attack2", "jump_cpu_failed_ontarget", "jump_cpu_failed_map", "jump_cpu_malfunction", "jump_cpu_failed_time", "jumpgate_failed_pvp_map", "jumpgate_failed_no_gate" ]);
                if (denyKeys.has(localeKey)) {
                    try {
                        if (window.AudioManager && typeof window.AudioManager.playSoundEffect === "function") {
                            window.AudioManager.playSoundEffect(29, false, false, -1, -1, true);
                        }
                    } catch (_) {}
                }
            }
            break;
        }

      case "MSG":
      case "DISPLAY_MESSAGE":
        {
            handleFlashDisplayMessagePayload(parts.slice(i + 1));
            break;
        }

      case "LUP":
        {
            const newLevel = parseInt(parts[i + 1], 10);
            if (!isNaN(newLevel) && newLevel > 0) {
                heroLevel = newLevel;
                if (typeof triggerHeroLevelUpEffect === "function") {
                    triggerHeroLevelUpEffect(newLevel);
                }
            }
            break;
        }

      case "BK":
        {
            const count = parseInt(parts[i + 1], 10);
            if (!isNaN(count)) {
                heroBootyKeys = count;
            }
            break;
        }

      case "BS":
        {
            const payload = parts[i + 1] || "";
            const values = payload.split("/").map(value => parseInt(value, 10) || 0);
            if (typeof updateBoosterStatus === "function") {
                updateBoosterStatus(values);
            } else {
                window.boosterStatus = values;
            }
            break;
        }

      case "TX":
        {
            handlePacket_TX(parts, i + 1);
            break;
        }

      case "ITM":
        {
            const parseCpuLevel = offset => {
                const value = parseInt(parts[i + offset], 10);
                return Number.isFinite(value) && value > 0 ? value : 0;
            };
            const ammoBuyLevel = parseCpuLevel(4);
            const hm7Level = parseCpuLevel(6);
            const smartbombLevel = parseCpuLevel(8);
            const instashieldLevel = parseCpuLevel(9);
            const arolLevel = parseCpuLevel(12);
            const cloakLevel = parseCpuLevel(13);
            const rllbLevel = parseCpuLevel(14);
            const rocketBuyLevel = parseCpuLevel(15);
            window.heroHasAutoRocketCpu = arolLevel > 0;
            if (cpuItems && cpuItems.SMB) {
                cpuItems.SMB.hasItem = smartbombLevel > 0;
                cpuItems.SMB.level = smartbombLevel;
            }
            if (cpuItems && cpuItems.ISH) {
                cpuItems.ISH.hasItem = instashieldLevel > 0;
                cpuItems.ISH.level = instashieldLevel;
            }
            if (cpuItems && cpuItems.AMB) {
                cpuItems.AMB.hasItem = ammoBuyLevel > 0;
                cpuItems.AMB.level = ammoBuyLevel > 0 ? ammoBuyLevel : 1;
                if (!cpuItems.AMB.hasItem) {
                    cpuItems.AMB.amount = 0;
                    cpuItems.AMB.state = false;
                }
            }
            if (cpuItems && cpuItems.HM7) {
                cpuItems.HM7.hasItem = hm7Level > 0 || cpuItems.HM7.hasItem;
            }
            if (cpuItems && cpuItems.ARL) {
                cpuItems.ARL.hasItem = arolLevel > 0;
                cpuItems.ARL.level = arolLevel > 0 ? arolLevel : cpuItems.ARL.level;
                if (!cpuItems.ARL.hasItem) {
                    cpuItems.ARL.state = false;
                    window.heroAutoRocketSkill = 0;
                }
            } else if (arolLevel <= 0) {
                window.heroAutoRocketSkill = 0;
            }
            if (cpuItems && cpuItems.CLK) {
                cpuItems.CLK.hasItem = cloakLevel > 0 ? true : cpuItems.CLK.hasItem;
                cpuItems.CLK.level = cloakLevel > 0 ? cloakLevel : cpuItems.CLK.level;
            }
            if (cpuItems && cpuItems.RLC) {
                cpuItems.RLC.hasItem = rllbLevel > 0;
                cpuItems.RLC.level = rllbLevel > 0 ? rllbLevel : 1;
                if (!cpuItems.RLC.hasItem) {
                    cpuItems.RLC.state = false;
                    window.heroRocketLauncherAutoCpuState = 0;
                }
            } else if (rllbLevel <= 0) {
                window.heroRocketLauncherAutoCpuState = 0;
            }
            if (cpuItems && cpuItems.RKB) {
                cpuItems.RKB.hasItem = rocketBuyLevel > 0;
                cpuItems.RKB.level = rocketBuyLevel > 0 ? rocketBuyLevel : 1;
                if (!cpuItems.RKB.hasItem) {
                    cpuItems.RKB.amount = 0;
                    cpuItems.RKB.state = false;
                }
            }
            ammoStock[20] = parseInt(parts[i + 19], 10) || 0;
            ammoStock[21] = parseInt(parts[i + 20], 10) || 0;
            ammoStock[22] = parseInt(parts[i + 21], 10) || 0;
            ammoStock[23] = parseInt(parts[i + 22], 10) || 0;
            if (typeof renderActionDrawerItems === "function") {
                renderActionDrawerItems();
            }
            break;
        }

      case "RS":
        {
            const mode = parts[i + 1] || "0";
            if (typeof setHeroRepairing === "function") {
                if (mode === "-1") {
                    setHeroRepairing(false);
                } else if (mode === "0" || mode === "1") {
                    setHeroRepairing(true);
                }
            }
            if (typeof cpuItems !== "undefined" && cpuItems && cpuItems.ROB) {
                if (mode === "-1") {
                    cpuItems.ROB.state = false;
                } else if (mode === "0" || mode === "1") {
                    cpuItems.ROB.hasItem = true;
                    cpuItems.ROB.state = true;
                }
            }
            if (typeof renderActionDrawerItems === "function") {
                renderActionDrawerItems();
            }
            if (typeof drawQuickbar === "function") {
                drawQuickbar();
            }
            break;
        }

      case "CLD":
        {
            const rawCode = parts[i + 1] || "";
            const code = typeof flashResolveCanonicalTechCode === "function" ? flashResolveCanonicalTechCode(rawCode) : String(rawCode || "").toUpperCase();
            const seconds = parseInt(parts[i + 2], 10);
            if (code && !isNaN(seconds)) {
                setActionCooldown(code, Math.max(0, seconds));
            }
            break;
        }

      case "CLR":
        {
            const rawCode = String(parts[i + 1] || "").toUpperCase();
            const mappedCode = typeof flashResolveCanonicalTechCode === "function" ? flashResolveCanonicalTechCode(rawCode) : rawCode;
            if (mappedCode) {
                if (typeof clearActionCooldown === "function") {
                    clearActionCooldown(mappedCode);
                }
                if (typeof flashIsSkillCooldownCode === "function" && flashIsSkillCooldownCode(mappedCode)) {
                    if (typeof flashNormalizeSkillRuntimeReadyState === "function") {
                        flashNormalizeSkillRuntimeReadyState(mappedCode);
                    }
                } else if (typeof flashNormalizeTechRuntimeReadyState === "function") {
                    flashNormalizeTechRuntimeReadyState(mappedCode);
                }
            } else if (typeof clearActionCooldownGroup === "function") {
                clearActionCooldownGroup([ "ELA", "ECI", "RPM", "SBU", "BRB" ]);
            }
            if (typeof renderActionDrawerItems === "function") {
                renderActionDrawerItems();
            }
            if (typeof drawQuickbar === "function") {
                drawQuickbar();
            }
            break;
        }

      case "RCD":
        {
            const rawCode = String(parts[i + 1] || "").toUpperCase();
            if (rawCode) {
                if (typeof clearActionCooldown === "function") {
                    clearActionCooldown(rawCode);
                }
            } else if (typeof clearActionCooldownGroup === "function") {
                clearActionCooldownGroup([ "ROK", "PLA", "WIZ", "DCR", "RL" ]);
            }
            if (typeof renderActionDrawerItems === "function") {
                renderActionDrawerItems();
            }
            if (typeof drawQuickbar === "function") {
                drawQuickbar();
            }
            break;
        }

      case "v":
        {
            const speedStr = parts[i + 1] || "0";
            const speed = parseInt(speedStr, 10);
            if (!isNaN(speed) && speed > 0) {
                heroSpeed = speed;
            }
            break;
        }

      case "SHD":
        {
            const shStr = parts[i + 1] || "0";
            const maxShStr = parts[i + 2] || "0";
            const newShield = parseInt(shStr, 10);
            const newMaxSh = parseInt(maxShStr, 10);
            if (!isNaN(newShield)) heroShield = newShield;
            if (!isNaN(newMaxSh) && newMaxSh >= 0) heroMaxShield = newMaxSh;
            if (!isNaN(newShield) || !isNaN(newMaxSh)) {
                __androPerfNoteEntityUpdate("hero_shield", {
                    entityId: typeof heroId !== "undefined" ? heroId : null,
                    packetKind: "A|SHD",
                    shieldKnown: !isNaN(newShield)
                });
            }
            break;
        }

      case "HPT":
        {
            handlePacket_HPT(parts, i + 1);
            break;
        }

      case "HL":
        {
            if (parts.length < i + 5) break;
            const targetId = parseInt(parts[i + 2], 10);
            const type = parts[i + 3];
            const value = parseInt(parts[i + 4], 10);
            const diffRaw = parseInt(parts[i + 5] || "0", 10);
            const targetEnt = heroId !== null && targetId === heroId ? null : entities[targetId];
            const applyDeltaBubble = (prevVal, newVal, entityId, isShield = false) => {
                if (entityId == null || prevVal == null || isNaN(newVal)) return;
                let delta = !isNaN(diffRaw) ? diffRaw : newVal - prevVal;
                if (delta === 0) delta = newVal - prevVal;
                if (delta === 0) return;
                const isHeal = delta > 0;
                const colorId = isHeal ? isShield ? 3 : 2 : 0;
                pushDamageBubble(entityId, delta, isHeal, colorId, isHeal);
                if (!isShield && delta < 0 && entityId === heroId) {
                    spawnHullDamageEffect(heroId);
                }
            };
            if (heroId !== null && targetId === heroId) {
                if (type === "HPT") {
                    const prev = heroHp;
                    heroHp = value;
                    applyDeltaBubble(prev, value, heroId);
                    if (typeof setHeroRepairing === "function") {
                        if (heroRepairing && prev != null && value < prev) {
                            setHeroRepairing(false);
                        } else if (heroRepairing && heroMaxHp != null && value >= heroMaxHp) {
                            setHeroRepairing(false);
                        }
                    }
                } else if (type === "SHD") {
                    const prev = heroShield;
                    heroShield = value;
                    if (prev != null && value < prev) {
                        const angle = normalizeShieldImpactVisualAngle(getRecentBeamAngleForTarget(heroId));
                        const radius = computeShieldImpactRadius(snapshotEntityById(heroId));
                        if (angle != null) {
                            spawnShieldBurstAt(shipX, shipY, "hit", {
                                angle: angle,
                                radius: radius,
                                targetId: heroId,
                                followTarget: true
                            });
                        }
                        if (heroRepairing && typeof setHeroRepairing === "function") setHeroRepairing(false);
                    }
                    applyDeltaBubble(prev, value, heroId, true);
                }
                if (type === "HPT" || type === "SHD") {
                    __androPerfNoteEntityUpdate("hero_combat_stats", {
                        entityId: targetId,
                        packetKind: "A|HL",
                        hpKnown: type === "HPT",
                        shieldKnown: type === "SHD"
                    });
                }
            } else if (targetEnt) {
                if (type === "HPT") {
                    const prev = targetEnt.hp;
                    targetEnt.hp = value;
                    applyDeltaBubble(prev, value, targetId);
                    if (prev != null && value < prev && (targetEnt.kind === "player" || targetEnt.kind === "npc")) {
                        spawnHullDamageEffect(targetId);
                    }
                } else if (type === "SHD") {
                    const prev = targetEnt.shield;
                    targetEnt.shield = value;
                    if (prev != null && value < prev && targetEnt.kind === "player") {
                        const angle = normalizeShieldImpactVisualAngle(getRecentBeamAngleForTarget(targetId));
                        const radius = computeShieldImpactRadius(snapshotEntityById(targetId));
                        if (angle != null) {
                            spawnShieldBurstAt(targetEnt.x, targetEnt.y, "hit", {
                                angle: angle,
                                radius: radius,
                                targetId: targetId,
                                followTarget: true
                            });
                        }
                    }
                    applyDeltaBubble(prev, value, targetId, true);
                }
                if (type === "HPT" || type === "SHD") {
                    __androPerfNoteEntityUpdate("entity_combat_stats", {
                        entityId: targetId,
                        packetKind: "A|HL",
                        targetType: targetEnt.kind,
                        hpKnown: targetEnt.hp != null,
                        shieldKnown: targetEnt.shield != null
                    });
                    __androPerfNoteTargetInfoApplied(targetId, "A|HL");
                }
            }
            break;
        }

      default:
        break;
    }
}

function handlePacket_displayMessage(parts, i) {
    handleFlashDisplayMessagePayload(parts.slice(i));
}

function handlePacket_B(parts, i) {
    const values = [];
    for (let idx = i; idx < parts.length; idx++) {
        const v = parseInt(parts[idx], 10);
        values.push(isNaN(v) ? 0 : v);
    }
    const laserOrder = [ 1, 2, 3, 4, 5, 6 ];
    let changed = false;
    laserOrder.forEach((stockId, idx) => {
        if (values[idx] !== undefined) {
            if ((ammoStock[stockId] || 0) !== values[idx]) {
                changed = true;
            }
            ammoStock[stockId] = values[idx];
        }
    });
    if (changed && typeof renderActionDrawerItems === "function") {
        renderActionDrawerItems();
    }
}

function handlePacket_3(parts, i) {
    const rocketOrder = [ 9, 10, 11, 12, 13, 18, 14, 15, 16, 17, 30, 24, 25, 26 ];
    const lightQuickbarStockIds = new Set([ 16, 17, 30 ]);
    let cursor = i + 1;
    let changed = false;
    let onlyLightQuickbarChanges = true;
    let stockAvailabilityChanged = false;
    const stockChanges = [];
    const firstVal = parseInt(parts[i], 10);
    if (!isNaN(firstVal)) {
        const stockKey = rocketOrder[0];
        const previous = parseInt(ammoStock[stockKey], 10) || 0;
        if (previous !== firstVal) {
            changed = true;
            onlyLightQuickbarChanges = onlyLightQuickbarChanges && lightQuickbarStockIds.has(stockKey);
            stockAvailabilityChanged = stockAvailabilityChanged || (previous > 0) !== (firstVal > 0);
            stockChanges.push({
                stockId: stockKey,
                oldValue: previous,
                newValue: firstVal
            });
        }
        ammoStock[stockKey] = firstVal;
    }
    for (let idx = 1; idx < rocketOrder.length; idx++) {
        const raw = parts[cursor++] || "0";
        const val = parseInt(raw, 10);
        const stockKey = rocketOrder[idx];
        if (stockKey && !isNaN(val)) {
            const previous = parseInt(ammoStock[stockKey], 10) || 0;
            if (previous !== val) {
                changed = true;
                onlyLightQuickbarChanges = onlyLightQuickbarChanges && lightQuickbarStockIds.has(stockKey);
                stockAvailabilityChanged = stockAvailabilityChanged || (previous > 0) !== (val > 0);
                stockChanges.push({
                    stockId: stockKey,
                    oldValue: previous,
                    newValue: val
                });
            }
            ammoStock[stockKey] = val;
        }
    }
    if (changed) {
        const canUseLightQuickbarUpdate = onlyLightQuickbarChanges && !stockAvailabilityChanged;
        if (canUseLightQuickbarUpdate) {
            try {
                if (typeof flashTryUpdateActionDrawerStockDom === "function") {
                    const lightResult = flashTryUpdateActionDrawerStockDom(stockChanges);
                    if (lightResult && lightResult.needsRender && typeof renderActionDrawerItems === "function") {
                        renderActionDrawerItems();
                    }
                }
            } catch (_) {}
            return;
        }
        if (typeof renderActionDrawerItems === "function") {
            renderActionDrawerItems();
        }
        if (typeof drawQuickbar === "function") {
            drawQuickbar();
        }
    }
}

function handlePacket_4(parts, i) {
    if (!parts || parts.length <= i) return;
    let weaponType = "";
    let weaponId = NaN;
    for (let idx = i; idx < parts.length; idx++) {
        const token = String(parts[idx] || "").toUpperCase();
        if (!weaponType && (token === "L" || token === "R")) {
            weaponType = token;
            continue;
        }
        const parsed = parseInt(parts[idx], 10);
        if (!isNaN(parsed) && parsed > 0) {
            weaponId = parsed;
        }
    }
    if (!weaponType || !Number.isFinite(weaponId) || weaponId <= 0) return;
    if (weaponType === "L") {
        applySelectedAmmoFromServer(weaponId, "opcode 4");
    } else if (weaponType === "R") {
        applySelectedRocketFromServer(weaponId, "opcode 4");
    }
}

function resolveExpansionStage(stage, shipId = null) {
    const numericShipId = Number(shipId);
    if (Number.isFinite(numericShipId) && numericShipId > 0 && typeof getMaxExpansionStageForShip === "function") {
        const maxStage = getMaxExpansionStageForShip(numericShipId);
        if (Number.isFinite(maxStage) && maxStage > 0) {
            return maxStage;
        }
    }
    if (Number.isFinite(stage)) {
        return stage > 0 ? stage : 0;
    }
    const parsed = parseInt(stage, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 0;
    }
    return parsed;
}

function handlePacket_RDY(parts, i) {
    const section = parts[i];
    if (section !== "I") {
        console.warn("[PACKET RDY] Unexpected section:", section, parts);
        return;
    }
    let idx = i + 1;
    const nextStr = () => idx < parts.length ? parts[idx++] : null;
    const nextInt = () => {
        const raw = nextStr();
        if (raw === null) return null;
        const val = parseInt(raw, 10);
        return isNaN(val) ? null : val;
    };
    const id = nextInt();
    const name = nextStr() || "";
    const shipModel = nextInt();
    const shipSpeed = nextInt();
    const shipShield = nextInt();
    const shipMaxShld = nextInt();
    const shipHp = nextInt();
    const shipMaxHp = nextInt();
    const cargo = nextInt();
    const maxCargo = nextInt();
    const locX = nextInt();
    const locY = nextInt();
    const mapId = nextInt();
    const faction = nextInt();
    const clanId = nextInt();
    nextStr();
    nextStr();
    nextStr();
    const premiumFlag = nextStr();
    heroPremium = premiumFlag === "1";
    const expStr = nextStr();
    const honorStr = nextStr();
    const levelStr = nextStr();
    const expValue = expStr !== null ? parseInt(expStr, 10) : null;
    const honorValue = honorStr !== null ? parseInt(honorStr, 10) : null;
    const levelValue = levelStr !== null ? parseInt(levelStr, 10) : null;
    if (Number.isFinite(expValue)) heroXp = expValue;
    if (Number.isFinite(honorValue)) heroHonor = honorValue;
    if (Number.isFinite(levelValue)) heroLevel = levelValue;
    const creds = nextInt();
    const uri = nextInt();
    nextStr();
    const grade = nextStr();
    const clanTag = nextStr();
    const ggRings = nextInt();
    nextStr();
    const invisible = nextStr();
    const isInitialRdyI = !window.__ANDRO_HAS_INITIAL_RDY_I;
    if (isInitialRdyI) window.__ANDRO_HAS_INITIAL_RDY_I = true;
    const mapChanged = mapId !== null && mapId !== currentMapId;
    if (mapChanged) {
        resetMapState(mapId);
    }
    if (id !== null) heroId = id;
    heroName = name;
    if (shipModel !== null) heroShipId = shipModel;
    if (shipSpeed !== null) heroSpeed = shipSpeed;
    if (shipShield !== null) heroShield = shipShield;
    if (shipMaxShld !== null) heroMaxShield = shipMaxShld;
    if (shipHp !== null) heroHp = shipHp;
    if (shipMaxHp !== null) heroMaxHp = shipMaxHp;
    if (cargo !== null) heroCargo = cargo;
    if (maxCargo !== null) heroMaxCargo = maxCargo;
    if (heroId !== null) {
        const heroEntity = ensureEntity(heroId);
        heroEntity.kind = "player";
        if (shipModel !== null) {
            heroEntity.shipId = shipModel;
        } else if (Number.isFinite(heroShipId)) {
            heroEntity.shipId = heroShipId;
        }
        let stageCandidate = null;
        if (Number.isFinite(heroEntity.expansionTypeId) && heroEntity.expansionTypeId > 0) {
            stageCandidate = heroEntity.expansionTypeId;
        } else if (Number.isFinite(heroExpansionTypeId) && heroExpansionTypeId > 0) {
            stageCandidate = heroExpansionTypeId;
        }
        const resolvedStage = resolveExpansionStage(stageCandidate, heroEntity.shipId);
        heroEntity.expansionTypeId = resolvedStage;
        if (!Number.isFinite(heroExpansionTypeId) || heroExpansionTypeId <= 0) {
            heroExpansionTypeId = resolvedStage;
        }
    }
    if (locX !== null && locY !== null) {
        if (isInitialRdyI || mapChanged) {
            shipX = locX;
            shipY = locY;
            cameraX = shipX;
            cameraY = shipY;
        } else {
            const dx = Math.abs(locX - shipX);
            const dy = Math.abs(locY - shipY);
            if (dx > 1500 || dy > 1500) {
                shipX = locX;
                shipY = locY;
                cameraX = shipX;
                cameraY = shipY;
                moveTargetX = null;
                moveTargetY = null;
                moveTargetFromMinimap = false;
                isChasingTarget = false;
            }
        }
    }
    window.heroFactionId = faction === null ? 0 : faction;
    const previousClanId = heroClanId || null;
    heroClanId = clanId || null;
    window.heroClanId = heroClanId || 0;
    heroGrade = grade || heroGrade;
    const parsedRank = parseInt(grade, 10);
    if (!isNaN(parsedRank)) {
        heroRankId = parsedRank;
    }
    heroClanTag = clanTag === null || clanTag === undefined ? "" : String(clanTag).trim();
    cacheKnownClanTag(heroName, heroClanTag);
    if (ggRings !== null && !isNaN(ggRings)) {
        heroGalaxyGatesFinished = Math.max(0, Math.min(ggRings, 4));
    }
    if (heroId != null && typeof entities !== "undefined" && entities[heroId]) {
        entities[heroId].kind = "player";
        entities[heroId].rankId = heroRankId || 0;
        entities[heroId].factionId = window.heroFactionId || 0;
        entities[heroId].clanTag = heroClanTag || "";
        entities[heroId].galaxyGatesFinished = heroGalaxyGatesFinished || 0;
    }
    syncChatRoomsToHero(previousClanId);
    if (creds !== null) heroCredits = creds;
    if (uri !== null) heroUridium = uri;
    if (isInitialRdyI || mapChanged) {
        moveTargetX = null;
        moveTargetY = null;
        moveTargetFromMinimap = false;
        isChasingTarget = false;
    }
    if (isInitialRdyI || mapChanged) {
        if (typeof sendLabStatusRequest === "function") {
            sendLabStatusRequest();
        } else if (typeof sendRaw === "function" && ws && ws.readyState === WebSocket.OPEN) {
            sendRaw("LAB|UPD|GET");
        }
    }
    if (isInitialRdyI || mapChanged) {
        removeFlashConnectionInfoWindowSafe();
    }
    heroLoaded = true;
    trySendRdyMap();
}

const HONEY_BOX_HASHES = new Set([ "100vp", "103wa", "109xs", "10tv0", "13b44", "13jaa", "13p97", "13umf", "152g8", "1604u", "1801q", "180fk", "1ag6n", "1bfcm", "1c2tu", "1c3oi", "1e5au", "1ecek", "1fnxl", "1fsi3", "1g4pv", "1g568", "1g65j", "1g7du", "1gtlm", "1hd2h", "1hviz", "1isk4", "1jyqj", "1kjds", "1lmf1", "1malf", "1mc48", "1my80", "1nad0", "1nesl", "1oloo", "1r78f", "1scn2", "1srrl", "1srvg", "1ss4t", "1szeq", "1t5p4", "1trob", "1ts89", "1ucay", "1ukl6", "1usjy", "1v20m", "2u942", "3k2hr", "3mtlo", "416n4", "48chq", "49ol8", "5naot", "6dge9", "6ovbk", "6x1u8", "87k2a", "8v03f", "9icg0", "a2abg", "bu9m9", "bv8wq", "ci7m0", "fc9f7", "h0rbx", "hkw3g", "hm27v", "hs940", "lnkdf", "lqzp9", "m79jj", "mk797", "n5cwr", "ntr63", "oeoud", "ov57p", "ozims", "puvoe", "q0e4a", "q4knx", "qj4o9", "qtqry", "rckbt", "rku9c", "sn8n9", "tbeuu", "usc1j", "uy62u", "v2qxb", "w27x1", "wbku5", "wl0wr", "xixzz", "yyr28", "zel71", "znmjs" ]);

function handlePacket_c(parts, i) {
    if (parts.length < i + 4) return;
    const rawHash = parts[i];
    const hash = makeCollectableEntityId(rawHash);
    let type = parseInt(parts[i + 1], 10);
    if (isNaN(type)) type = 0;
    const x = parseInt(parts[i + 2], 10);
    const y = parseInt(parts[i + 3], 10);
    if (!rawHash) return;
    if (isNaN(x) || isNaN(y)) return;
    if (typeof HONEY_BOX_HASHES !== "undefined" && HONEY_BOX_HASHES.has(rawHash)) {
        return;
    }
    const e = ensureEntity(hash);
    e.id = hash;
    e.serverId = rawHash;
    e.type = type;
    e.shipId = null;
    e.x = x;
    e.y = y;
    e.kind = "box";
    e.name = "";
    e.hp = null;
    e.shield = null;
    e.factionId = 0;
    e.boxSpawnTime = Date.now();
    if (type === 0 && parts.length >= i + 5) {
        const remaining = parseInt(parts[i + 4], 10);
        if (!isNaN(remaining) && remaining > 0) {
            e.remainingLootTimeMs = remaining;
            e.lootProtectionStartMs = performance.now();
        } else {
            e.remainingLootTimeMs = null;
            e.lootProtectionStartMs = 0;
        }
    } else {
        e.remainingLootTimeMs = null;
        e.lootProtectionStartMs = 0;
    }
    categorizeEntityFromType(e);
    e.interp.startX = x;
    e.interp.startY = y;
    e.interp.endX = x;
    e.interp.endY = y;
    e.interp.duration = 0;
    if (typeof clearBoxAnimationState === "function") {
        clearBoxAnimationState(hash);
    }
}

function handlePacket_f(parts, i) {
    const subOpcode = parts[i];
    if (!subOpcode) {
        if (typeof addInfoMessage === "function") {
            addServerInfoLogMessage("your cargo is full");
        }
        try {
            const boxId = typeof pendingCollectBoxId !== "undefined" && pendingCollectBoxId != null ? pendingCollectBoxId : typeof collectDelayBoxId !== "undefined" ? collectDelayBoxId : null;
            if (boxId != null && typeof clearCollectRequest === "function") {
                clearCollectRequest(boxId);
            } else if (boxId == null && typeof clearAllCollectRequests === "function") {
                clearAllCollectRequests();
            } else if (boxId != null && typeof collectedBoxRequestIds !== "undefined") {
                collectedBoxRequestIds.delete(boxId);
            }
        } catch (_) {}
        if (typeof clearPendingCollectState === "function") {
            clearPendingCollectState();
        } else {
            if (typeof stopHeroCollectorBeam === "function") stopHeroCollectorBeam();
            if (typeof pendingCollectBoxId !== "undefined") pendingCollectBoxId = null;
        }
        return;
    }
    if (subOpcode !== "C") return;
    let idx = i + 1;
    const id = parseInt(parts[idx++], 10);
    const shipId = parseInt(parts[idx++], 10);
    const expansionStage = parseInt(parts[idx++], 10);
    const clanTag = parts[idx++] || "";
    const name = parts[idx++] || "";
    const x = parseInt(parts[idx++], 10);
    const y = parseInt(parts[idx++], 10);
    const faction = parseInt(parts[idx++], 10);
    const clanId = parseInt(parts[idx++], 10);
    const grade = parseInt(parts[idx++], 10);
    const extraField = parts[idx++];
    let warnIconOnMap = false;
    if (extraField === "0" || extraField === "1") {
        warnIconOnMap = extraField === "1";
    }
    const clanDiplomacy = parseInt(parts[idx++], 10);
    const ggRings = parseInt(parts[idx++], 10);
    if (idx < parts.length && (parts[idx] === "0" || parts[idx] === "1")) {
        warnIconOnMap = parts[idx] === "1";
        idx++;
    }
    if (isNaN(id) || isNaN(x) || isNaN(y)) return;
    const resolvedStage = resolveExpansionStage(expansionStage, shipId);
    const e = ensureEntity(id);
    e.kind = "player";
    e.gameTitleKey = "";
    e.name = name;
    e.clanTag = normalizeChatClanTag(clanTag);
    cacheKnownClanTag(name, e.clanTag);
    e.factionId = faction;
    e.clanId = isNaN(clanId) ? 0 : clanId;
    e.clanDiplomacy = isNaN(clanDiplomacy) ? 0 : clanDiplomacy;
    e.rankId = isNaN(grade) ? 0 : grade;
    e.galaxyGatesFinished = isNaN(ggRings) ? 0 : Math.max(0, Math.min(ggRings, 4));
    e.warnIconOnMap = !!warnIconOnMap;
    if (!isNaN(shipId)) {
        e.shipId = shipId;
    }
    resetEntityInterpolationTo(e, x, y);
    e.expansionTypeId = resolvedStage;
    const groupMember = groupMembers[id];
    if (groupMember) {
        const beforeMinimapState = getGroupMemberMinimapState(groupMember);
        let groupMemberChanged = false;
        if (name) groupMemberChanged = setGroupMemberField(groupMember, "name", name) || groupMemberChanged;
        if (e.clanTag) groupMemberChanged = setGroupMemberField(groupMember, "clanTag", e.clanTag) || groupMemberChanged;
        if (!isNaN(shipId)) groupMemberChanged = setGroupMemberField(groupMember, "shipType", shipId) || groupMemberChanged;
        groupMemberChanged = setGroupMemberField(groupMember, "posX", x) || groupMemberChanged;
        groupMemberChanged = setGroupMemberField(groupMember, "posY", y) || groupMemberChanged;
        const activeMapId = getCurrentGroupNetworkMapId();
        if (activeMapId !== null) groupMemberChanged = setGroupMemberField(groupMember, "mapId", activeMapId) || groupMemberChanged;
        if (groupMemberChanged) {
            applyGroupMemberMinimapDiff(id, beforeMinimapState, getGroupMemberMinimapState(groupMember));
            scheduleFlashLikeGroupUiRefresh();
        }
    }
    if (heroId !== null && id === heroId) {
        shipX = x;
        shipY = y;
        heroExpansionTypeId = resolvedStage;
        if (!isNaN(shipId)) {
            heroShipId = shipId;
        }
    }
    applyPendingAttackLockForEntity(id);
    __androPerfNoteEntityUpdate("player_spawn", {
        entityId: id,
        packetKind: "f|C",
        targetType: "player",
        x: x,
        y: y
    });
}

function handlePacket_portal(parts, i) {
    const len = parts.length;
    if (len < i + 3) return;
    const portalId = parseInt(parts[i], 10);
    if (isNaN(portalId)) return;
    let factionId = 0;
    let typeId = 0;
    let x = 0;
    let y = 0;
    let visibleOnMiniMap = true;
    let targetMaps = [];
    if (len < i + 7) {
        typeId = parseInt(parts[i + 1], 10) || 0;
        x = parseInt(parts[i + 3], 10);
        y = parseInt(parts[i + 4], 10);
    } else {
        factionId = parseInt(parts[i + 1], 10) || 0;
        typeId = parseInt(parts[i + 2], 10) || 0;
        x = parseInt(parts[i + 3], 10);
        y = parseInt(parts[i + 4], 10);
        visibleOnMiniMap = parseInt(parts[i + 5], 10) === 1;
        const mapsStr = parts[i + 6] || "";
        if (mapsStr.length > 0) {
            const tokens = mapsStr.split(",");
            for (const t of tokens) {
                const m = parseInt(t, 10);
                if (!isNaN(m) && m > 0) targetMaps.push(m);
            }
        }
    }
    if (isNaN(x) || isNaN(y)) return;
    const p = ensurePortal(portalId);
    p.factionId = factionId;
    p.typeId = typeId;
    p.x = x;
    p.y = y;
    p.visibleOnMiniMap = visibleOnMiniMap;
    p.targetMaps = targetMaps;
}

function handlePacket_SMP(parts, i) {
    if (parts.length < i + 2) return;
    const pvp = parseInt(parts[i], 10);
    if (!isNaN(pvp)) mapPvpAllowed = pvp;
}

function handlePacket_U(parts, i) {
    if (parts.length < i + 2) return;
    const nextMap = parseInt(parts[i], 10);
    const portalId = parseInt(parts[i + 1], 10);
    playSfxOnce(21, "U:voice_activate", -1, -1, 1e3);
    try {
        if (typeof beginPortalJumpLock === "function") {
            beginPortalJumpLock(nextMap, portalId);
        }
    } catch (_) {}
    if (!isNaN(portalId) && portals[portalId]) {
        const portal = portals[portalId];
        const jumpNow = performance.now();
        const activeDuration = typeof PORTAL_ACTIVE_DURATION !== "undefined" ? PORTAL_ACTIVE_DURATION : 1e3;
        portal.playJump = true;
        portal.jumpStart = jumpNow;
        if (portal.pendingRemoval) {
            portal.pendingRemovalAt = Math.max(Number(portal.pendingRemovalAt || 0) || 0, jumpNow + activeDuration);
        }
        spawnPortalJumpEffect(portal.x, portal.y);
        try {
            if (window.AudioManager && typeof window.AudioManager.playSoundEffect === "function") {
                window.AudioManager.playSoundEffect(5, false, false, portal.x, portal.y, true);
            }
        } catch (_) {}
    } else if (!isNaN(portalId)) {
        spawnPortalJumpEffect(shipX, shipY);
        try {
            if (window.AudioManager && typeof window.AudioManager.playSoundEffect === "function") {
                window.AudioManager.playSoundEffect(5, false, false, shipX, shipY, true);
            }
        } catch (_) {}
    }
}

function handlePacket_UI(parts, i) {
    const action = parts[i];
    if (action === "W") {
        const key = parts[i + 1];
        const value = parts[i + 2];
        if (key === "HW" && value) {
            window.hudHeightHint = parseInt(value, 10) || window.hudHeightHint;
        }
    }
}

function handlePacket_POI(parts, i) {
    const action = String(parts[i] || "").toUpperCase();
    if (action === "CRE") {
        const zoneType = String(parts[i + 1] || "").toUpperCase();
        const zoneId = parseInt(parts[i + 2] || "0", 10);
        const designId = parseInt(parts[i + 3] || "0", 10);
        const shape = String(parts[i + 4] || "").toUpperCase();
        const points = parts.slice(i + 5).map(v => parseFloat(v)).filter(v => Number.isFinite(v));
        if (zoneType && shape && typeof addFlashPoiZone === "function") {
            addFlashPoiZone(zoneType, zoneId, shape, designId, points);
        }
        return;
    }
    if (action === "RDY" || action === "ENT" || action === "LEA") {
        return;
    }
}

const MINIMAP_SERVER_MARKER_CYCLE_MS = 500;

function getMinimapServerMarkerExpiresAt(count, nowMs) {
    const markerCount = Number.isFinite(count) ? count : -1;
    if (markerCount < 0) return Number.POSITIVE_INFINITY;
    return nowMs + markerCount * MINIMAP_SERVER_MARKER_CYCLE_MS;
}

function isSameMinimapServerMarker(marker, x, y, count, type) {
    return !!marker && marker.x === x && marker.y === y && marker.count === count && marker.type === type;
}

function handlePacket_MM(parts, i) {
    const action = String(parts[i] || "").toUpperCase();
    if (action === "NO" || action === "NOISE") {
        const durationMs = parseInt(parts[i + 1] || "0", 10);
        if (typeof window.__setMinimapNoise === "function" && Number.isFinite(durationMs)) {
            window.__setMinimapNoise(durationMs);
        }
        return;
    }
    if (action === "SM" || action === "SR") {
        const markerId = parseInt(parts[i + 1] || "0", 10);
        const x = parseInt(parts[i + 2] || "0", 10);
        const y = parseInt(parts[i + 3] || "0", 10);
        const count = parseInt(parts[i + 4] || "-1", 10);
        if (!Number.isFinite(markerId) || !Number.isFinite(x) || !Number.isFinite(y)) return;
        if (!(window.minimapServerMarkers instanceof Map)) return;
        const nowMs = __rxNowMs();
        const markerCount = Number.isFinite(count) ? count : -1;
        const markerType = action === "SR" ? "redDot" : "ping";
        const expiresAt = getMinimapServerMarkerExpiresAt(markerCount, nowMs);
        const existingMarker = window.minimapServerMarkers.get(markerId);
        if (action === "SR" && isSameMinimapServerMarker(existingMarker, x, y, markerCount, markerType)) {
            existingMarker.lastSeenAt = nowMs;
            existingMarker.expiresAt = expiresAt;
            return;
        }
        window.minimapServerMarkers.set(markerId, {
            id: markerId,
            x: x,
            y: y,
            count: markerCount,
            startedAt: nowMs,
            lastSeenAt: nowMs,
            expiresAt: expiresAt,
            type: markerType
        });
        return;
    }
    if (action === "HM") {
        const markerId = parseInt(parts[i + 1] || "0", 10);
        if (!Number.isFinite(markerId)) return;
        if (window.minimapServerMarkers instanceof Map) {
            window.minimapServerMarkers.delete(markerId);
        }
    }
}

function handlePacket_C(parts, i) {
    if (parts.length < i + 8) return;
    const id = parseInt(parts[i], 10);
    const shipId = parseInt(parts[i + 1], 10);
    const name = parts[i + 4] || "";
    const x = parseInt(parts[i + 5], 10);
    const y = parseInt(parts[i + 6], 10);
    const factionId = parseInt(parts[i + 7] || "0", 10);
    if (isNaN(id) || isNaN(x) || isNaN(y)) return;
    const e = ensureEntity(id);
    if (e.kind !== "npc" || e.destroyedVisualAt) {
        if (typeof resetEntityVisualLife === "function") resetEntityVisualLife(e);
    }
    e.kind = "npc";
    e.gameTitleKey = "";
    e.type = shipId;
    e.shipId = shipId;
    resetEntityInterpolationTo(e, x, y);
    e.name = name;
    e.factionId = isNaN(factionId) ? 0 : factionId;
    applyPendingAttackLockForEntity(id);
    __androPerfNoteEntityUpdate("npc_spawn", {
        entityId: id,
        packetKind: "C",
        targetType: "npc",
        x: x,
        y: y
    });
}

function handlePacket_CSS(parts, i) {}

function handlePacket_UT(parts, i) {}

function handlePacket_TW(parts, i) {
    if (typeof window.handleTradeWindowActivationFromServer === "function") {
        window.handleTradeWindowActivationFromServer();
    }
}

function handlePacket_D(parts, i) {
    if (parts.length < i + 8) return;
    const demilitarized = !!parseInt(parts[i + 2] || "0", 10);
    const raw3 = parseInt(parts[i + 3] || "0", 10);
    const raw4 = parseInt(parts[i + 4] || "0", 10);
    const raw5 = parseInt(parts[i + 5] || "0", 10);
    const raw6 = parseInt(parts[i + 6] || "0", 10);
    const looksLikeYourServer = raw4 === 1 && (raw3 === 0 || raw3 === 1);
    const tradeArea = looksLikeYourServer ? !!raw3 : !!raw4;
    const radiation = !!raw5;
    const jumpArea = !!raw6;
    const tradeAreaChanged = tradeArea !== lastTradeZoneState;
    if (demilitarized !== lastDemilitarizedState) {
        lastDemilitarizedState = demilitarized;
    }
    if (tradeAreaChanged) {
        lastTradeZoneState = tradeArea;
    }
    inDemilitarizedZone = demilitarized;
    inTradeZone = tradeArea;
    inJumpZone = jumpArea;
    if (tradeAreaChanged && typeof window.handleTradeZoneStateFromServer === "function") {
        window.handleTradeZoneStateFromServer(inTradeZone);
    }
    setRadiationWarning(radiation);
}

function handlePacket_noAttack(parts, i) {
    lastNoAttackZoneTime = performance.now();
    if (typeof currentLaserTargetId !== "undefined" && currentLaserTargetId != null) {
        sendLaserStop(currentLaserTargetId, true);
    }
    if (typeof clearHeroCombatLogActiveTarget === "function") {
        clearHeroCombatLogActiveTarget();
    }
    if (typeof currentLaserTargetId !== "undefined") currentLaserTargetId = null;
    if (typeof attackIntentTargetId !== "undefined") attackIntentTargetId = null;
    if (typeof confirmedAttackTargetId !== "undefined") confirmedAttackTargetId = null;
    if (typeof pendingAttackAckTargetId !== "undefined") pendingAttackAckTargetId = null;
    if (typeof pendingAttackAckStartMs !== "undefined") pendingAttackAckStartMs = 0;
    if (typeof resetPendingRangeResume === "function") resetPendingRangeResume();
    if (typeof laserBeams !== "undefined") {
        laserBeams.length = 0;
    }
    if (typeof clearSabLaserVisualJobsForLocalHero === "function") {
        clearSabLaserVisualJobsForLocalHero();
    }
    if (typeof isChasingTarget !== "undefined") isChasingTarget = false;
}

function handlePacket_logoutCancel() {
    if (typeof handleLogoutCancelFromServer === "function") {
        handleLogoutCancelFromServer();
    }
}

function handlePacket_logoutConfirmed() {
    if (typeof handleLogoutConfirmedFromServer === "function") {
        handleLogoutConfirmedFromServer();
    }
}

function handlePacket_O(parts, i) {
    logFlashCombatLocaleMessage("outofrange", null, "Out of range", "O");
    const prevLaserTarget = typeof currentLaserTargetId !== "undefined" ? currentLaserTargetId : null;
    const resumeTarget = (typeof attackIntentTargetId !== "undefined" ? attackIntentTargetId : null) ?? (typeof confirmedAttackTargetId !== "undefined" ? confirmedAttackTargetId : null) ?? prevLaserTarget ?? (typeof selectedTargetId !== "undefined" ? selectedTargetId : null);
    if (typeof currentLaserTargetId !== "undefined") currentLaserTargetId = null;
    if (typeof pendingAttackAckTargetId !== "undefined" && pendingAttackAckTargetId === resumeTarget) {
        pendingAttackAckTargetId = null;
        if (typeof pendingAttackAckStartMs !== "undefined") pendingAttackAckStartMs = 0;
    }
    if (resumeTarget != null) {
        if (typeof confirmedAttackTargetId !== "undefined") confirmedAttackTargetId = resumeTarget;
        if (typeof attackIntentTargetId !== "undefined" && attackIntentTargetId == null) {
            attackIntentTargetId = resumeTarget;
        }
        if (typeof pendingRangeResumeTargetId !== "undefined") pendingRangeResumeTargetId = resumeTarget;
        if (typeof pendingRangeResumeMessage !== "undefined") pendingRangeResumeMessage = true;
        if (typeof rangeProtectedTargetId !== "undefined") rangeProtectedTargetId = resumeTarget;
    }
    if (typeof cancelRsbBurst === "function" && typeof heroId !== "undefined") cancelRsbBurst(heroId);
}

function handlePacket_X(parts, i) {
    const resumeTarget = pendingRangeResumeTargetId ?? attackIntentTargetId ?? confirmedAttackTargetId ?? selectedTargetId;
    if (pendingRangeResumeMessage && resumeTarget != null) {
        logFlashCombatLocaleMessage("fightcont", null, "The battle continues.", "X");
    }
    if (resumeTarget != null && attackIntentTargetId == null) {
        attackIntentTargetId = resumeTarget;
    }
    pendingRangeResumeMessage = false;
}

function handlePacket_F(parts, i) {
    logFlashCombatLocaleMessage("fightcanceled", null, "The fight was cancelled.", "F");
    clearHeroAttackRuntimeState({
        clearSelection: false,
        preserveMinimapMove: true
    });
}

function handlePacket_J(parts, i) {
    logFlashCombatLocaleMessage("fightcanceledbyop", null, "The fight was cancelled by the opponent.", "J");
    clearHeroAttackRuntimeState({
        clearSelection: false,
        preserveMinimapMove: true
    });
}

function clearAttackLockForEntity(ent) {
    if (!ent) return;
    unregisterAttackLockForEntity(ent);
    ent.attackTargetId = null;
    ent.attackLockUntil = 0;
    ent.attackLockX = null;
    ent.attackLockY = null;
}

function normalizeAttackLockEntityId(value) {
    if (value === null || value === undefined || value === "") return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
}

function registerAttackLockForEntity(ent) {
    if (!ent) return;
    const attackerId = normalizeAttackLockEntityId(ent.id);
    const targetId = normalizeAttackLockEntityId(ent.attackTargetId);
    if (attackerId === null || targetId === null || targetId === -1) return;
    let attackers = attackLockAttackersByTargetId.get(targetId);
    if (!attackers) {
        attackers = new Set();
        attackLockAttackersByTargetId.set(targetId, attackers);
    }
    attackers.add(attackerId);
}

function unregisterAttackLockForEntity(ent) {
    if (!ent) return;
    const attackerId = normalizeAttackLockEntityId(ent.id);
    const targetId = normalizeAttackLockEntityId(ent.attackTargetId);
    if (attackerId === null || targetId === null) return;
    const attackers = attackLockAttackersByTargetId.get(targetId);
    if (!attackers) return;
    attackers.delete(attackerId);
    if (attackers.size === 0) {
        attackLockAttackersByTargetId.delete(targetId);
    }
}

function setAttackLockTargetForEntity(ent, targetId) {
    if (!ent) return false;
    const numericTargetId = normalizeAttackLockEntityId(targetId);
    if (numericTargetId === null || numericTargetId === -1) {
        clearAttackLockForEntity(ent);
        return false;
    }
    unregisterAttackLockForEntity(ent);
    ent.attackTargetId = numericTargetId;
    registerAttackLockForEntity(ent);
    return true;
}

function clearAttackLocksTargetingEntity(removedId) {
    const targetId = normalizeAttackLockEntityId(removedId);
    if (targetId === null) return;
    let cleared = 0;
    const indexedAttackers = attackLockAttackersByTargetId.get(targetId);
    if (indexedAttackers && indexedAttackers.size > 0) {
        const attackerIds = Array.from(indexedAttackers);
        attackLockAttackersByTargetId.delete(targetId);
        for (const attackerId of attackerIds) {
            const other = entities[attackerId] || entities[String(attackerId)];
            if (!other || other.id === heroId) continue;
            if (normalizeAttackLockEntityId(other.attackTargetId) === targetId) {
                clearAttackLockForEntity(other);
                cleared++;
            }
        }
    }
    if (cleared > 0) return;
    for (const oid in entities) {
        const other = entities[oid];
        if (!other || other.id === heroId) continue;
        if (normalizeAttackLockEntityId(other.attackTargetId) === targetId) {
            clearAttackLockForEntity(other);
        }
    }
}

function resolveAttackLockTargetPoint(attacker) {
    if (!attacker || attacker.attackTargetId == null) return null;
    const target = attacker.attackTargetId === heroId ? {
        x: shipX,
        y: shipY
    } : typeof entities !== "undefined" ? entities[attacker.attackTargetId] : null;
    if (target && Number.isFinite(target.x) && Number.isFinite(target.y)) {
        attacker.attackLockX = target.x;
        attacker.attackLockY = target.y;
        return target;
    }
    if (Number.isFinite(attacker.attackLockX) && Number.isFinite(attacker.attackLockY)) {
        return {
            x: attacker.attackLockX,
            y: attacker.attackLockY
        };
    }
    return null;
}

function applyAttackLockToEntity(attacker, lock) {
    if (!attacker || !lock) return;
    const targetId = Number(lock.targetId);
    if (!Number.isFinite(targetId) || targetId === -1) {
        clearAttackLockForEntity(attacker);
        return;
    }
    setAttackLockTargetForEntity(attacker, targetId);
    attacker.attackLockUntil = Number.POSITIVE_INFINITY;
    attacker.attackLockX = Number.isFinite(lock.x) ? lock.x : null;
    attacker.attackLockY = Number.isFinite(lock.y) ? lock.y : null;
    const targetPoint = resolveAttackLockTargetPoint(attacker);
    if (targetPoint) {
        const dx = targetPoint.x - attacker.x;
        const dy = targetPoint.y - attacker.y;
        attacker.desiredAngle = Math.atan2(dy, dx) + Math.PI;
        if (typeof attacker.angle !== "number") attacker.angle = attacker.desiredAngle;
    }
}

function applyPendingAttackLockForEntity(entityId) {
    if (!(pendingAttackLocksByAttackerId instanceof Map)) return;
    const numericId = Number(entityId);
    if (!Number.isFinite(numericId)) return;
    const lock = pendingAttackLocksByAttackerId.get(numericId);
    if (!lock) return;
    const ent = typeof entities !== "undefined" ? entities[numericId] : null;
    if (!ent) return;
    applyAttackLockToEntity(ent, lock);
    pendingAttackLocksByAttackerId.delete(numericId);
}

function handlePacket_LK(parts, i) {
    if (parts.length < i + 2) return;
    const attackerId = parseInt(parts[i], 10);
    const targetId = parseInt(parts[i + 1], 10);
    const targetX = parts.length > i + 2 ? parseInt(parts[i + 2], 10) : NaN;
    const targetY = parts.length > i + 3 ? parseInt(parts[i + 3], 10) : NaN;
    if (!Number.isFinite(attackerId) || !Number.isFinite(targetId)) return;
    if (heroId !== null && attackerId === heroId) return;
    if (targetId === -1) {
        pendingAttackLocksByAttackerId.delete(attackerId);
        const liveAttacker = typeof entities !== "undefined" ? entities[attackerId] : null;
        if (liveAttacker) clearAttackLockForEntity(liveAttacker);
        return;
    }
    const lock = {
        targetId: targetId,
        x: Number.isFinite(targetX) ? targetX : null,
        y: Number.isFinite(targetY) ? targetY : null
    };
    const attacker = typeof entities !== "undefined" ? entities[attackerId] : null;
    if (!attacker) {
        pendingAttackLocksByAttackerId.set(attackerId, lock);
        return;
    }
    applyAttackLockToEntity(attacker, lock);
}

function handlePacket_sabShot(parts, i) {
    if (parts.length < i + 2) return;
    const attackerId = parseInt(parts[i], 10);
    const targetId = parseInt(parts[i + 1], 10);
    if (isNaN(attackerId) || isNaN(targetId)) return;
    const attackerSnap = snapshotEntityById(attackerId);
    const targetSnap = snapshotEntityById(targetId);
    if (!attackerSnap || !targetSnap) return;
    updateEntityClaim(targetId, attackerId);
    const startX = targetSnap.id === heroId ? shipX : targetSnap.x;
    const startY = targetSnap.id === heroId ? shipY : targetSnap.y;
    const endX = attackerSnap.id === heroId ? shipX : attackerSnap.x;
    const endY = attackerSnap.id === heroId ? shipY : attackerSnap.y;
    const duration = typeof SAB_SHOT_DURATION_MS !== "undefined" ? SAB_SHOT_DURATION_MS : 1e3;
    const now = performance.now();
    let updated = false;
    for (let idx = sabShots.length - 1; idx >= 0; idx--) {
        const shot = sabShots[idx];
        if (shot.attackerId === attackerId && shot.targetId === targetId) {
            if (!updated) {
                shot.startX = startX;
                shot.startY = startY;
                shot.endX = endX;
                shot.endY = endY;
                shot.duration = duration;
                shot.createdAt = now;
                shot.followTargets = true;
                updated = true;
            } else {
                sabShots.splice(idx, 1);
            }
        }
    }
    if (updated) return;
    sabShots.push({
        attackerId: attackerId,
        targetId: targetId,
        startX: startX,
        startY: startY,
        endX: endX,
        endY: endY,
        startScale: 1,
        endScale: .1,
        duration: duration,
        createdAt: now,
        followTargets: true
    });
}

function handlePacket_rocketAttack(parts, i) {
    if (parts.length < i + 6) return;
    const attackerId = parseInt(parts[i], 10);
    const targetId = parseInt(parts[i + 1], 10);
    const heavyFlag = parts[i + 2] === "H";
    const rocketId = parseInt(parts[i + 3], 10);
    const patternId = parseInt(parts[i + 4], 10);
    const autoFlag = !!parseInt(parts[i + 5] || "0", 10);
    if (isNaN(attackerId) || isNaN(targetId)) return;
    updateEntityClaim(targetId, attackerId);
    const attackerSnap = typeof captureEntityEffectSnapshot === "function" ? captureEntityEffectSnapshot(attackerId) : snapshotEntityById(attackerId);
    const targetSnap = typeof captureEntityEffectSnapshot === "function" ? captureEntityEffectSnapshot(targetId) : snapshotEntityById(targetId);
    if (!attackerSnap || !targetSnap) return;
    const beamAngle = computeShieldImpactAngle(attackerId, targetId);
    rocketAttacks.push({
        attackerId: attackerId,
        targetId: targetId,
        rocketId: isNaN(rocketId) ? 0 : rocketId,
        patternId: isNaN(patternId) ? 0 : patternId,
        heavy: heavyFlag,
        auto: autoFlag,
        angle: beamAngle,
        originX: attackerSnap.x,
        originY: attackerSnap.y,
        targetLastX: targetSnap.x,
        targetLastY: targetSnap.y,
        attackerVisualLifeId: attackerSnap.visualLifeId != null ? attackerSnap.visualLifeId : null,
        targetVisualLifeId: targetSnap.visualLifeId != null ? targetSnap.visualLifeId : null,
        createdAt: performance.now()
    });
    try {
        if (window.AudioManager) {
            const snap = typeof snapshotEntityById === "function" ? snapshotEntityById(attackerId) : entities[attackerId];
            const ax = snap && snap.x != null ? snap.x : -1;
            const ay = snap && snap.y != null ? snap.y : -1;
            if (typeof window.AudioManager.playRocketLaunch === "function") {
                window.AudioManager.playRocketLaunch(attackerId, isNaN(rocketId) ? 0 : rocketId, ax, ay);
            }
        }
    } catch (_) {}
}

function handlePacket_RL(parts, i) {
    if (!parts || parts.length < i + 1) return;
    const sub = (parts[i] || "").toString();
    if (sub === "S" || sub === "s") {
        const launcherType = parseInt(parts[i + 1], 10);
        const selectedRocket = parseInt(parts[i + 2], 10);
        const loaded = parseInt(parts[i + 3], 10);
        if (!isNaN(launcherType)) {
            window.heroRocketLauncherType = launcherType;
        }
        if (!isNaN(selectedRocket) && selectedRocket > 0) {
            window.heroSelectedLauncherRocket = selectedRocket;
        }
        if (!isNaN(loaded)) {
            window.heroRocketLauncherRocketsLoaded = Math.max(0, loaded);
        }
        if ((Number(window.heroRocketLauncherType) || 0) === 0) {
            window.heroRocketLauncherRocketsLoaded = 0;
        }
        const nextType = Number(window.heroRocketLauncherType) || 0;
        const nextLoaded = Math.max(0, parseInt(window.heroRocketLauncherRocketsLoaded, 10) || 0);
        let launcherSoundId = 0;
        if (nextType === 1) {
            if (nextLoaded > 0 && nextLoaded < 3) {
                launcherSoundId = 46;
            } else if (nextLoaded === 3) {
                launcherSoundId = 47;
            }
        } else if (nextType === 2) {
            if (nextLoaded > 0 && nextLoaded < 5) {
                launcherSoundId = 46;
            } else if (nextLoaded === 5) {
                launcherSoundId = 47;
            }
        }
        try {
            if (launcherSoundId && window.AudioManager && typeof window.AudioManager.playSoundEffect === "function") {
                window.AudioManager.playSoundEffect(launcherSoundId, false, false, -1, -1, true);
            }
        } catch (_) {}
        if (typeof renderActionDrawerItems === "function") {
            renderActionDrawerItems();
        }
        if (typeof drawQuickbar === "function") {
            drawQuickbar();
        }
        return;
    }
    if (sub === "R") {
        const hstrm = parseInt(parts[i + 1], 10);
        const ubr = parseInt(parts[i + 2], 10);
        const eco = parseInt(parts[i + 3], 10);
        if (!isNaN(hstrm)) ammoStock[20] = hstrm;
        if (!isNaN(ubr)) ammoStock[32] = ubr;
        if (!isNaN(eco)) ammoStock[31] = eco;
        if (typeof renderActionDrawerItems === "function") {
            renderActionDrawerItems();
        }
        if (typeof drawQuickbar === "function") {
            drawQuickbar();
        }
        return;
    }
    if (sub === "A" || sub === "a") {
        const attackerId = parseInt(parts[i + 1], 10);
        const targetId = parseInt(parts[i + 2], 10);
        const count = parseInt(parts[i + 3], 10);
        const patternId = parseInt(parts[i + 4], 10);
        const missFlag = (parts[i + 5] || "").toString().toUpperCase() === "M";
        if (isNaN(attackerId) || isNaN(targetId) || isNaN(patternId)) return;
        try {
            if (window.AudioManager) {
                const snap = typeof snapshotEntityById === "function" ? snapshotEntityById(attackerId) : entities[attackerId];
                const ax = snap && snap.x != null ? snap.x : -1;
                const ay = snap && snap.y != null ? snap.y : -1;
                if (typeof window.AudioManager.playRocketLaunch === "function") {
                    window.AudioManager.playRocketLaunch(attackerId, patternId, ax, ay);
                }
                if (typeof window.AudioManager.playSoundEffect === "function") {
                    window.AudioManager.playSoundEffect(40, false, false, ax, ay, true);
                }
            }
        } catch (_) {}
        if (typeof spawnRocketLauncherAirstrike === "function") {
            spawnRocketLauncherAirstrike(attackerId, targetId, patternId, isNaN(count) ? 0 : count, missFlag);
        }
    }
}

function handlePacket_k(parts, i) {
    if (typeof __loadFlashLocaleMapOnce === "function") {
        __loadFlashLocaleMapOnce();
    }
    const requiredLevel = parseInt(parts[i], 10);
    let message = "";
    if (!isNaN(requiredLevel) && requiredLevel > 0) {
        const localizedTemplate = flashLocaleGetTextRaw("jumplevelfalse");
        if (localizedTemplate) {
            message = localizedTemplate.replace(/%!/g, String(requiredLevel));
        } else {
            message = `You need level ${requiredLevel} to jump through this gate.`;
        }
    }
    if (!message) {
        message = "You cannot jump through this gate.";
    }
    addServerInfoLogMessage(message, "k");
    try {
        if (window.AudioManager && typeof window.AudioManager.playSoundEffect === "function") {
            window.AudioManager.playSoundEffect(29, false, false, -1, -1, true);
        }
    } catch (_) {}
}

const NETTEL_SPRITE_ID_LOCAL = typeof NETTEL_SPRITE_ID !== "undefined" ? NETTEL_SPRITE_ID : 7;

const NETTEL_SHIP_IDS = new Set([ 27, 36, 37, 71, 75, 76 ]);

const CRYSTAL_LASER_SPRITE_ID_LOCAL = typeof CRYSTAL_LASER_SPRITE_ID !== "undefined" ? CRYSTAL_LASER_SPRITE_ID : 8;

const CRYSTAL_NPC_TYPES = new Set([ 78, 29, 38 ]);

const CRYSTAL2_LASER_SPRITE_ID_LOCAL = typeof CRYSTAL2_LASER_SPRITE_ID !== "undefined" ? CRYSTAL2_LASER_SPRITE_ID : 9;

const CRYSTAL2_NPC_TYPES = new Set([ 79, 35, 45 ]);

const DEVOLARIUM_LASER_SPRITE_ID_LOCAL = typeof DEVOLARIUM_LASER_SPRITE_ID !== "undefined" ? DEVOLARIUM_LASER_SPRITE_ID : 10;

const DEVOLARIUM_NPC_TYPES = new Set([ 26, 72, 74, 46 ]);

const DEVOLARIUM_LASER_SPEED_MS = 750;

const LORDAKIUM_LASER_SPRITE_ID_LOCAL = typeof LORDAKIUM_LASER_SPRITE_ID !== "undefined" ? LORDAKIUM_LASER_SPRITE_ID : 11;

const LORDAKIUM_NPC_TYPES = new Set([ 77, 28 ]);

const LORDAKIUM_LASER_SPEED_MS = 1e3;

const PROTEGIT_LASER_SPRITE_ID_LOCAL = typeof PROTEGIT_LASER_SPRITE_ID !== "undefined" ? PROTEGIT_LASER_SPRITE_ID : 12;

const PROTEGIT_NPC_TYPES = new Set([ 81 ]);

const PROTEGIT_LASER_SPEED_MS = 500;

const SMALL_NPC_EXPLOSION_IDS = new Set([ 2, 71, 75, 78, 34, 36, 37, 38 ]);

const SMALL_SHIP_EXPLOSION_IDS = new Set([ 1, 3, 4, 5, 6, 7, 24, 25, 27, 31 ]);

const BOSS_EXPLOSION_IDS = new Set([ 28, 35, 45, 46, 80, 39 ]);

const STRUCTURE_EXPLOSION_IDS = new Set;

const MASSIVE_EXPLOSION_IDS = new Set;

function shouldUseCrystalLaser(attacker) {
    if (!attacker || attacker.kind !== "npc") return false;
    if (CRYSTAL_NPC_TYPES.has(attacker.type)) return true;
    if (CRYSTAL_NPC_TYPES.has(attacker.shipId)) return true;
    const name = (attacker.name || "").toLowerCase();
    return name.includes("kristallin");
}

function shouldUseCrystal2Laser(attacker) {
    if (!attacker || attacker.kind !== "npc") return false;
    if (CRYSTAL2_NPC_TYPES.has(attacker.type)) return true;
    if (attacker.shipId != null && CRYSTAL2_NPC_TYPES.has(attacker.shipId)) return true;
    const name = (attacker.name || "").toLowerCase();
    return name.includes("kristallon");
}

function shouldUseNettelLaser(attacker) {
    if (!attacker || attacker.kind !== "npc") return false;
    if (attacker.type != null && NETTEL_SHIP_IDS.has(attacker.type)) return true;
    if (attacker.shipId != null && NETTEL_SHIP_IDS.has(attacker.shipId)) return true;
    const name = (attacker.name || "").toLowerCase();
    return name.includes("lordakia") || name.includes("saimon") || name.includes("sibelonit");
}

function shouldUseDevolariumLaser(attacker) {
    if (!attacker || attacker.kind !== "npc") return false;
    if (attacker.type != null && DEVOLARIUM_NPC_TYPES.has(attacker.type)) return true;
    if (attacker.shipId != null && DEVOLARIUM_NPC_TYPES.has(attacker.shipId)) return true;
    const name = (attacker.name || "").toLowerCase();
    return name.includes("devolarium") || name.includes("sibelon");
}

function shouldUseLordakiumLaser(attacker) {
    if (!attacker || attacker.kind !== "npc") return false;
    if (attacker.type != null && LORDAKIUM_NPC_TYPES.has(attacker.type)) return true;
    if (attacker.shipId != null && LORDAKIUM_NPC_TYPES.has(attacker.shipId)) return true;
    const name = (attacker.name || "").toLowerCase();
    return name.includes("lordakium");
}

function shouldUseProtegitLaser(attacker) {
    if (!attacker || attacker.kind !== "npc") return false;
    if (attacker.type != null && PROTEGIT_NPC_TYPES.has(attacker.type)) return true;
    if (attacker.shipId != null && PROTEGIT_NPC_TYPES.has(attacker.shipId)) return true;
    const name = (attacker.name || "").toLowerCase();
    return name.includes("protegit");
}

const FORCED_SINGLE_CENTER_STREUNER_NPC_SHIP_IDS = new Set([ 2, 23, 84 ]);

function shouldForceSingleCenterNpcLaser(attackerId, attackerSnap) {
    const liveAttacker = attackerId === heroId ? null : entities[attackerId] || null;
    const kind = liveAttacker?.kind || attackerSnap?.kind || null;
    if (kind !== "npc") return false;
    const shipId = Number(liveAttacker?.shipId ?? attackerSnap?.shipId ?? 0);
    if (FORCED_SINGLE_CENTER_STREUNER_NPC_SHIP_IDS.has(shipId)) return true;
    const npcName = String(liveAttacker?.name || "").trim();
    return npcName === "-=[ Streuner ]=-" || npcName === "-=[ Boss Streuner ]=-";
}

const NO_VISIBLE_LASER_MORDON_NPC_SHIP_IDS = new Set([ 31, 73 ]);

function shouldSuppressVisibleNpcLaser(attackerId, attackerSnap) {
    const liveAttacker = attackerId === heroId ? null : entities[attackerId] || null;
    const candidate = liveAttacker || attackerSnap;
    const kind = candidate?.kind || null;
    if (kind !== "npc") return false;
    const shipId = Number(candidate?.shipId ?? 0);
    if (NO_VISIBLE_LASER_MORDON_NPC_SHIP_IDS.has(shipId)) return true;
    const npcName = String(candidate?.name || "").trim();
    return npcName === "-=[ Mordon ]=-" || npcName === "-=[ Boss Mordon ]=-";
}

function resolveLaserSalvoOffsets(attackerId, attackerSnap, visual) {
    const fallback = [ {
        x: 0,
        y: 0
    } ];
    if (!attackerSnap || !visual?.allowOffsets) return fallback;
    if (shouldForceSingleCenterNpcLaser(attackerId, attackerSnap)) return fallback;
    const shipId = attackerSnap.shipId;
    if (!shipId) return fallback;
    const expansionClassId = typeof getShipExpansionClass === "function" ? getShipExpansionClass(shipId) : 0;
    if (!expansionClassId) return fallback;
    const entityStage = attackerId === heroId ? heroExpansionTypeId : entities[attackerId]?.expansionTypeId ?? 0;
    const preferredStage = typeof getMaxExpansionStageForShip === "function" ? getMaxExpansionStageForShip(shipId) : 0;
    const expansionTypeId = Number.isFinite(preferredStage) && preferredStage > 0 ? preferredStage : entityStage;
    const frameCount = SHIP_SPRITE_DEFS[shipId]?.frameCount || 32;
    const attackerAngle = attackerId === heroId ? heroAngle : entities[attackerId]?.angle ?? attackerSnap.angle ?? 0;
    const frameIndex = typeof getDirectionFrameIndex === "function" ? getDirectionFrameIndex(attackerAngle, frameCount) : 0;
    const currentIndex = attackerId === heroId ? heroLaserSalvoIndex : entities[attackerId]?.laserSalvoIndex ?? 0;
    const buildOffsetsForPattern = (pattern, salvoIndex) => {
        const salvos = pattern?.salvosData;
        if (!salvos || salvos.length === 0) {
            return {
                offsets: [],
                salvosLength: 0,
                salvoIndex: 0
            };
        }
        const normalizedIndex = (salvoIndex % salvos.length + salvos.length) % salvos.length;
        const salvo = salvos[normalizedIndex] || [];
        const offsets = [];
        for (const positionsList of salvo) {
            if (!positionsList || positionsList.length === 0) continue;
            const point = positionsList[frameIndex] || positionsList[0];
            if (point) {
                offsets.push({
                    x: point.x,
                    y: point.y
                });
            }
        }
        return {
            offsets: offsets,
            salvosLength: salvos.length,
            salvoIndex: normalizedIndex
        };
    };
    const pattern = typeof getExpansionPattern === "function" ? getExpansionPattern(expansionClassId, expansionTypeId) : null;
    const selected = buildOffsetsForPattern(pattern, currentIndex);
    if (!selected || selected.salvosLength === 0) return fallback;
    if (attackerId === heroId) {
        heroLaserSalvoIndex = (selected.salvoIndex + 1) % selected.salvosLength;
    } else if (entities[attackerId]) {
        entities[attackerId].laserSalvoIndex = (selected.salvoIndex + 1) % selected.salvosLength;
    }
    return selected.offsets.length > 0 ? selected.offsets : fallback;
}

function applyLaserLength(startX, startY, endX, endY, laserLength, absorber) {
    if (absorber || !Number.isFinite(laserLength) || laserLength <= 0) {
        return {
            endX: endX,
            endY: endY
        };
    }
    const dx = startX - endX;
    const dy = startY - endY;
    const distSq = dx * dx + dy * dy;
    if (distSq < laserLength * laserLength) return null;
    const dist = Math.sqrt(distSq);
    const nx = dx / dist;
    const ny = dy / dist;
    return {
        endX: endX + nx * laserLength,
        endY: endY + ny * laserLength
    };
}

const RSB_BURST_STATE = new Map;
const RSB_BURST_STATE_MAX = 128;
let rsbBurstSequenceCounter = 1;

const SAB_RING_STATE = new Map;
const SAB_RING_STATE_TTL_MS = 1e4;
const SAB_RING_STATE_MAX = 256;
const SAB_RING_STATE_PRUNE_INTERVAL_MS = 1000;
let sabRingStateLastPruneAt = 0;
const SAB_LASER_VISUAL_JOBS = new Map;
let sabLaserVisualJobSeq = 1;
const SAB_LASER_VISUAL_TICK_MS = 100;

function getSabLaserVisualJobKey(attackerId, targetId, skilledLaser) {
    return `${attackerId}|${targetId}|${skilledLaser ? 1 : 0}`;
}

function cancelSabLaserVisualJob(key) {
    const job = SAB_LASER_VISUAL_JOBS.get(key);
    if (job && job.intervalId != null) {
        clearInterval(job.intervalId);
        job.intervalId = null;
    }
    SAB_LASER_VISUAL_JOBS.delete(key);
}

function clearSabLaserVisualJobs() {
    for (const key of Array.from(SAB_LASER_VISUAL_JOBS.keys())) {
        cancelSabLaserVisualJob(key);
    }
}

function clearSabLaserVisualJobsForEntity(entityId) {
    if (entityId == null || SAB_LASER_VISUAL_JOBS.size === 0) return;
    for (const [key, job] of Array.from(SAB_LASER_VISUAL_JOBS.entries())) {
        if (job && (job.attackerId === entityId || job.targetId === entityId)) {
            cancelSabLaserVisualJob(key);
        }
    }
}

function clearSabLaserVisualJobsForAttacker(attackerId, exceptKey = null) {
    if (attackerId == null || SAB_LASER_VISUAL_JOBS.size === 0) return;
    for (const [key, job] of Array.from(SAB_LASER_VISUAL_JOBS.entries())) {
        if (key !== exceptKey && job && job.attackerId === attackerId) {
            cancelSabLaserVisualJob(key);
        }
    }
}

function clearSabLaserVisualJobsForLocalHero() {
    if (typeof heroId === "undefined" || heroId == null) return;
    clearSabLaserVisualJobsForAttacker(heroId);
}

function normalizeSabLaserTiming(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : fallback;
}

function refreshSabLaserVisualJob(job, fireRateMs, attackLengthMs, beamDurationMs, spawnTick) {
    if (!job) return null;
    job.active = true;
    job.lastPacketAt = performance.now();
    job.fireRateMs = normalizeSabLaserTiming(fireRateMs, job.fireRateMs || 200);
    job.attackLengthMs = normalizeSabLaserTiming(attackLengthMs, job.attackLengthMs || 1350);
    job.beamDurationMs = normalizeSabLaserTiming(beamDurationMs, job.beamDurationMs || 500);
    if (typeof spawnTick === "function") {
        job.spawnTick = spawnTick;
    }
    return job;
}

function tickSabLaserVisualJob(key) {
    const job = SAB_LASER_VISUAL_JOBS.get(key);
    if (!job) return;
    const attackLength = normalizeSabLaserTiming(job.attackLengthMs, 1350);
    const fireRate = normalizeSabLaserTiming(job.fireRateMs, 200);
    const tickMs = normalizeSabLaserTiming(job.tickMs, SAB_LASER_VISUAL_TICK_MS);
    if (job.cnt > attackLength) {
        if (!job.active) {
            cancelSabLaserVisualJob(key);
            return;
        }
        job.cnt = 0;
        job.active = false;
    }
    if (job.cnt % fireRate === 0) {
        const attackerSnap = snapshotEntityById(job.attackerId);
        const targetSnap = snapshotEntityById(job.targetId);
        if (!attackerSnap || !targetSnap) {
            cancelSabLaserVisualJob(key);
            return;
        }
        if (typeof job.spawnTick === "function") {
            const firstTick = !job.spawnCount;
            job.spawnTick(performance.now(), true, firstTick);
            job.spawnCount = (job.spawnCount || 0) + 1;
        }
    }
    job.cnt += tickMs;
}

function startSabLaserVisualJob(key, attackerId, targetId, skilledLaser, fireRateMs, attackLengthMs, beamDurationMs, spawnTick) {
    cancelSabLaserVisualJob(key);
    const now = performance.now();
    const job = {
        key: key,
        attackerId: attackerId,
        targetId: targetId,
        skilledLaser: !!skilledLaser,
        startedAt: now,
        lastPacketAt: now,
        fireRateMs: normalizeSabLaserTiming(fireRateMs, 200),
        attackLengthMs: normalizeSabLaserTiming(attackLengthMs, 1350),
        beamDurationMs: normalizeSabLaserTiming(beamDurationMs, 500),
        tickMs: SAB_LASER_VISUAL_TICK_MS,
        cnt: 0,
        active: true,
        spawnTick: spawnTick,
        spawnCount: 0,
        intervalId: null,
        seq: sabLaserVisualJobSeq++
    };
    SAB_LASER_VISUAL_JOBS.set(key, job);
    tickSabLaserVisualJob(key);
    if (SAB_LASER_VISUAL_JOBS.get(key) === job) {
        job.intervalId = setInterval(() => {
            const activeJob = SAB_LASER_VISUAL_JOBS.get(key);
            if (!activeJob || activeJob.seq !== job.seq) return;
            tickSabLaserVisualJob(key);
        }, SAB_LASER_VISUAL_TICK_MS);
    }
    return job;
}

function startOrRefreshSabLaserVisualJob(key, attackerId, targetId, skilledLaser, fireRateMs, attackLengthMs, beamDurationMs, spawnTick) {
    const activeJob = SAB_LASER_VISUAL_JOBS.get(key);
    if (activeJob) {
        refreshSabLaserVisualJob(activeJob, fireRateMs, attackLengthMs, beamDurationMs, spawnTick);
        return activeJob;
    }
    return startSabLaserVisualJob(key, attackerId, targetId, skilledLaser, fireRateMs, attackLengthMs, beamDurationMs, spawnTick);
}

function pruneSabRingState(now = performance.now(), force = false) {
    if (!(SAB_RING_STATE instanceof Map) || SAB_RING_STATE.size === 0) return;
    const shouldScanTtl = force || SAB_RING_STATE.size > SAB_RING_STATE_MAX || now - sabRingStateLastPruneAt >= SAB_RING_STATE_PRUNE_INTERVAL_MS;
    if (shouldScanTtl) {
        sabRingStateLastPruneAt = now;
        for (const [key, lastSeen] of SAB_RING_STATE.entries()) {
            if (!Number.isFinite(lastSeen) || now - lastSeen > SAB_RING_STATE_TTL_MS) {
                SAB_RING_STATE.delete(key);
            }
        }
    }
    while (SAB_RING_STATE.size > SAB_RING_STATE_MAX) {
        const first = SAB_RING_STATE.keys().next();
        if (first.done) break;
        SAB_RING_STATE.delete(first.value);
    }
}

function rememberSabRingState(key, now = performance.now()) {
    if (SAB_RING_STATE.has(key)) SAB_RING_STATE.delete(key);
    SAB_RING_STATE.set(key, now);
    pruneSabRingState(now, SAB_RING_STATE.size > SAB_RING_STATE_MAX);
}

function clearSabRingState() {
    SAB_RING_STATE.clear();
    sabRingStateLastPruneAt = 0;
}

function clearSabRingStateForEntity(entityId) {
    if (entityId == null || !(SAB_RING_STATE instanceof Map) || SAB_RING_STATE.size === 0) return;
    const id = String(entityId);
    for (const key of Array.from(SAB_RING_STATE.keys())) {
        const parts = String(key).split("|");
        if (parts[0] === id || parts[1] === id) {
            SAB_RING_STATE.delete(key);
        }
    }
}

function pruneRsbBurstState() {
    if (!(RSB_BURST_STATE instanceof Map) || RSB_BURST_STATE.size <= RSB_BURST_STATE_MAX) return;
    for (const key of Array.from(RSB_BURST_STATE.keys())) {
        const state = RSB_BURST_STATE.get(key);
        if (!state || !state.timeouts || state.timeouts.length === 0) {
            RSB_BURST_STATE.delete(key);
        }
        if (RSB_BURST_STATE.size <= RSB_BURST_STATE_MAX) return;
    }
}

function clearRsbBurstState(key) {
    const state = RSB_BURST_STATE.get(key);
    if (state && state.timeouts && state.timeouts.length) {
        state.timeouts.forEach(clearTimeout);
        state.timeouts.length = 0;
    }
    RSB_BURST_STATE.delete(key);
}

function cancelRsbBurst(attackerId = null) {
    if (attackerId == null) {
        for (const key of Array.from(RSB_BURST_STATE.keys())) {
            clearRsbBurstState(key);
        }
        return;
    }
    const key = String(attackerId);
    clearRsbBurstState(key);
    if (typeof laserBeams !== "undefined") {
        for (let i = laserBeams.length - 1; i >= 0; i--) {
            const b = laserBeams[i];
            if (b && b.attackerId === attackerId && b.spriteId === 6) {
                laserBeams.splice(i, 1);
            }
        }
    }
}

function beginRsbBurst(attackerId, targetId = null) {
    cancelRsbBurst(attackerId);
    pruneRsbBurstState();
    const key = String(attackerId);
    const state = {
        seq: rsbBurstSequenceCounter++,
        timeouts: [],
        targetId: targetId,
        startedAt: performance.now()
    };
    RSB_BURST_STATE.set(key, state);
    return state.seq;
}

function cancelRsbBurstsByTarget(targetId) {
    if (targetId == null) return;
    const keysToCancel = [];
    for (const [key, state] of RSB_BURST_STATE.entries()) {
        if (state && state.targetId === targetId) {
            keysToCancel.push(key);
        }
    }
    for (const key of keysToCancel) {
        cancelRsbBurst(Number(key));
    }
}

function freezeLaserBeamTrajectory(beam) {
    if (!beam || !beam.followTargets || !beam.attackerId || !beam.targetId) return;
    const attacker = snapshotEntityById(beam.attackerId);
    const target = snapshotEntityById(beam.targetId);
    if (!attacker || !target) return;
    const hasOffset = Number.isFinite(beam.offsetX) && Number.isFinite(beam.offsetY);
    const hasEndOffset = Number.isFinite(beam.offsetEndX) && Number.isFinite(beam.offsetEndY);
    const endOffsetX = hasEndOffset ? beam.offsetEndX : hasOffset ? beam.offsetX : 0;
    const endOffsetY = hasEndOffset ? beam.offsetEndY : hasOffset ? beam.offsetY : 0;
    const origin = beam.absorber ? target : attacker;
    const destination = beam.absorber ? attacker : target;
    let startX = Number(origin.x) || 0;
    let startY = Number(origin.y) || 0;
    let endX = Number(destination.x) || 0;
    let endY = Number(destination.y) || 0;
    if (hasOffset) {
        startX += beam.offsetX;
        startY += beam.offsetY;
    }
    if (hasEndOffset || hasOffset) {
        endX += endOffsetX;
        endY += endOffsetY;
    }
    const adjusted = applyLaserLength(startX, startY, endX, endY, beam.laserLength, beam.absorber);
    if (adjusted) {
        endX = adjusted.endX;
        endY = adjusted.endY;
    }
    beam.startX = startX;
    beam.startY = startY;
    beam.endX = endX;
    beam.endY = endY;
    const angle = Math.atan2(endY - startY, endX - startX);
    beam.angle = angle;
    if (!beam.playLoop) {
        beam.rotation = angle;
    }
}

function releaseSabShotsForEntity(entityId) {
    if (typeof sabShots === "undefined") return;
    const now = performance.now();
    for (let i = sabShots.length - 1; i >= 0; i--) {
        const shot = sabShots[i];
        if (!shot) continue;
        const touchesEntity = shot.targetId === entityId || shot.attackerId === entityId;
        if (!touchesEntity) continue;
        if (shot.followTargets !== false) {
            const targetSnap = snapshotEntityById(shot.targetId);
            const attackerSnap = snapshotEntityById(shot.attackerId);
            if (targetSnap) {
                shot.startX = targetSnap.x;
                shot.startY = targetSnap.y;
            }
            if (attackerSnap) {
                shot.endX = attackerSnap.x;
                shot.endY = attackerSnap.y;
            }
        }
        shot.followTargets = false;
        shot.releasedAt = now;
    }
}

function removeLaserBeamsForEntity(entityId) {
    if (typeof laserBeams === "undefined") return;
    for (let i = laserBeams.length - 1; i >= 0; i--) {
        const b = laserBeams[i];
        if (!b) continue;
        const touchesEntity = b.targetId === entityId || b.attackerId === entityId;
        if (!touchesEntity) continue;
        if (b.playLoop) {
            laserBeams.splice(i, 1);
            continue;
        }
        freezeLaserBeamTrajectory(b);
        b.followTargets = false;
    }
}

function detachRocketAttacksForEntity(entityId) {
    if (typeof rocketAttacks === "undefined") return;
    const snapshot = typeof captureEntityEffectSnapshot === "function" ? captureEntityEffectSnapshot(entityId) : snapshotEntityById(entityId);
    for (let i = rocketAttacks.length - 1; i >= 0; i--) {
        const r = rocketAttacks[i];
        if (!r) continue;
        if (r.targetId === entityId) {
            if (snapshot && Number.isFinite(snapshot.x) && Number.isFinite(snapshot.y)) {
                r.targetLastX = snapshot.x;
                r.targetLastY = snapshot.y;
                if (r.targetVisualLifeId == null && snapshot.visualLifeId != null) r.targetVisualLifeId = snapshot.visualLifeId;
            }
            r.targetDetached = true;
        }
        if (r.attackerId === entityId) {
            if (snapshot && Number.isFinite(snapshot.x) && Number.isFinite(snapshot.y)) {
                if (!Number.isFinite(r.originX)) r.originX = snapshot.x;
                if (!Number.isFinite(r.originY)) r.originY = snapshot.y;
                if (r.attackerVisualLifeId == null && snapshot.visualLifeId != null) r.attackerVisualLifeId = snapshot.visualLifeId;
            }
            r.attackerDetached = true;
        }
    }
}

const ENTITY_VISUAL_CLEANUP_MAX_PER_FRAME = 8;
const ENTITY_VISUAL_CLEANUP_BUDGET_MS = 3;
const PENDING_ENTITY_VISUAL_CLEANUPS = new Map;
let entityVisualCleanupScheduled = false;

function scheduleEntityVisualCleanupFlush() {
    if (entityVisualCleanupScheduled) return;
    entityVisualCleanupScheduled = true;
    if (typeof requestAnimationFrame === "function" && !(typeof document !== "undefined" && document.hidden)) {
        requestAnimationFrame(flushEntityVisualCleanups);
    } else {
        setTimeout(flushEntityVisualCleanups, 0);
    }
}

function queueEntityVisualCleanup(entityId, options = {}) {
    if (entityId == null) return;
    const key = String(entityId);
    let job = PENDING_ENTITY_VISUAL_CLEANUPS.get(key);
    if (!job) {
        job = { entityId: entityId };
        PENDING_ENTITY_VISUAL_CLEANUPS.set(key, job);
    }
    if (options.clearSabRing) job.clearSabRing = true;
    if (options.releaseSabShots) job.releaseSabShots = true;
    if (options.detachRocketAttacks) job.detachRocketAttacks = true;
    if (options.clearShipSkillVisuals) job.clearShipSkillVisuals = true;
    scheduleEntityVisualCleanupFlush();
}

function runEntityVisualCleanupJob(job) {
    if (!job || job.entityId == null) return;
    const entityId = job.entityId;
    if (job.clearSabRing) clearSabRingStateForEntity(entityId);
    if (job.releaseSabShots) releaseSabShotsForEntity(entityId);
    if (job.detachRocketAttacks) detachRocketAttacksForEntity(entityId);
    if (job.clearShipSkillVisuals && typeof flashClearEntityShipSkillVisualEffects === "function") {
        flashClearEntityShipSkillVisualEffects(entityId);
    }
}

function flushEntityVisualCleanups() {
    entityVisualCleanupScheduled = false;
    const startedAt = __rxNowMs();
    const backlogBefore = PENDING_ENTITY_VISUAL_CLEANUPS.size;
    let processed = 0;
    while (PENDING_ENTITY_VISUAL_CLEANUPS.size > 0) {
        const first = PENDING_ENTITY_VISUAL_CLEANUPS.keys().next();
        if (first.done) break;
        const key = first.value;
        const job = PENDING_ENTITY_VISUAL_CLEANUPS.get(key);
        PENDING_ENTITY_VISUAL_CLEANUPS.delete(key);
        runEntityVisualCleanupJob(job);
        processed++;
        if (processed >= ENTITY_VISUAL_CLEANUP_MAX_PER_FRAME) break;
        if (__rxNowMs() - startedAt >= ENTITY_VISUAL_CLEANUP_BUDGET_MS) break;
    }
    if (PENDING_ENTITY_VISUAL_CLEANUPS.size > 0) {
        scheduleEntityVisualCleanupFlush();
    }
    if (window.AndroPerf && window.AndroPerf.enabled) {
        window.AndroPerf.recordCleanup("entityVisualCleanup", __rxNowMs() - startedAt, {
            processed: processed,
            backlogBefore: backlogBefore,
            backlogAfter: PENDING_ENTITY_VISUAL_CLEANUPS.size
        });
    }
}

function handlePacket_laserAttack(parts, i) {
    if (parts.length < i + 5) return;
    const attackerId = parseInt(parts[i], 10);
    const targetId = parseInt(parts[i + 1], 10);
    const patternId = parseInt(parts[i + 2], 10);
    const showShieldDamage = !!parseInt(parts[i + 3], 10);
    const skilledLaser = !!parseInt(parts[i + 4], 10);
    if (isNaN(attackerId) || isNaN(targetId)) return;
    if (targetId === -1) {
        clearSabLaserVisualJobsForAttacker(attackerId);
        const attackerLive = entities[attackerId];
        if (attackerLive) {
            clearAttackLockForEntity(attackerLive);
        }
        if (heroId !== null && attackerId === heroId) {
            if (typeof clearHeroMissingCombatTarget === "function") clearHeroMissingCombatTarget(targetId);
            clearHeroAttackRuntimeState({
                clearSelection: false,
                preserveMinimapMove: true
            });
        }
        return;
    }
    updateEntityClaim(targetId, attackerId);
    if (heroId !== null && attackerId === heroId) {
        if (typeof heroCombatLogActiveTargetId !== "undefined" && heroCombatLogActiveTargetId !== targetId) {
            logFlashCombatLocaleMessage("oppoatt", targetId, targetName => `Attacking ${targetName}`, "a");
            heroCombatLogActiveTargetId = targetId;
        }
        currentLaserTargetId = targetId;
        confirmedAttackTargetId = targetId;
        if (pendingAttackAckTargetId === targetId) {
            pendingAttackAckTargetId = null;
            pendingAttackAckStartMs = 0;
        }
        if (typeof pendingRangeResumeTargetId !== "undefined" && pendingRangeResumeTargetId === targetId && typeof resetPendingRangeResume === "function") {
            resetPendingRangeResume(targetId);
        }
        if (typeof clearHeroMissingCombatTarget === "function") clearHeroMissingCombatTarget(targetId);
        if (typeof lastAutoLaserResumeMs !== "undefined") {
            lastAutoLaserResumeMs = performance.now();
        }
    }
    const attackerSnap = snapshotEntityById(attackerId);
    const targetSnap = snapshotEntityById(targetId);
    if (!attackerSnap || !targetSnap) return;
    let visual = resolveLaserVisual(patternId, skilledLaser);
    if (shouldUseProtegitLaser(attackerSnap)) {
        visual = {
            ...visual,
            spriteId: PROTEGIT_LASER_SPRITE_ID_LOCAL,
            playLoop: false,
            playLoopRotated: false,
            absorber: false,
            speedMs: PROTEGIT_LASER_SPEED_MS
        };
    } else if (shouldUseDevolariumLaser(attackerSnap)) {
        visual = {
            ...visual,
            spriteId: DEVOLARIUM_LASER_SPRITE_ID_LOCAL,
            playLoop: true,
            playLoopRotated: false,
            absorber: false,
            speedMs: DEVOLARIUM_LASER_SPEED_MS,
            attackLengthMs: DEVOLARIUM_LASER_SPEED_MS
        };
    } else if (shouldUseLordakiumLaser(attackerSnap)) {
        visual = {
            ...visual,
            spriteId: LORDAKIUM_LASER_SPRITE_ID_LOCAL,
            playLoop: false,
            playLoopRotated: true,
            absorber: false,
            speedMs: LORDAKIUM_LASER_SPEED_MS
        };
    } else if (shouldUseNettelLaser(attackerSnap)) {
        visual = {
            ...visual,
            spriteId: NETTEL_SPRITE_ID_LOCAL,
            flipX: true
        };
    } else if (shouldUseCrystal2Laser(attackerSnap)) {
        visual = {
            ...visual,
            spriteId: CRYSTAL2_LASER_SPRITE_ID_LOCAL,
            flipX: false
        };
    } else if (shouldUseCrystalLaser(attackerSnap)) {
        visual = {
            ...visual,
            spriteId: CRYSTAL_LASER_SPRITE_ID_LOCAL,
            flipX: false
        };
    }
    const spriteInfo = getLaserSpriteFrame(visual.spriteId, skilledLaser);
    const laserLength = Number.isFinite(visual.laserLength) ? visual.laserLength : spriteInfo?.width || LASER_SPRITE_INFO[visual.spriteId]?.width || 0;
    const origin = visual.absorber ? targetSnap : attackerSnap;
    const destination = visual.absorber ? attackerSnap : targetSnap;
    const baseStartX = origin.x;
    const baseStartY = origin.y;
    const baseEndX = destination.x;
    const baseEndY = destination.y;
    const salvoOffsets = visual.absorber ? [ {
        x: 0,
        y: 0
    } ] : resolveLaserSalvoOffsets(attackerId, attackerSnap, visual);
    const baseDuration = visual.speedMs || DEFAULT_LASER_SPEED_MS;
    const duration = visual.playLoop ? visual.attackLengthMs || LASER_ATTACK_LENGTH_MS : baseDuration;
    const attackerLive = entities[attackerId];
    if (attackerLive) {
        setAttackLockTargetForEntity(attackerLive, targetId);
        attackerLive.attackLockX = targetSnap.x;
        attackerLive.attackLockY = targetSnap.y;
        const lockDuration = visual.attackLengthMs || (typeof LASER_ATTACK_LENGTH_MS !== "undefined" ? LASER_ATTACK_LENGTH_MS : 1350);
        const lockUntil = performance.now() + lockDuration;
        attackerLive.attackLockUntil = Math.max(attackerLive.attackLockUntil || 0, lockUntil);
        if (attackerLive.kind === "npc") {
            const targetPos = targetId === heroId ? {
                x: shipX,
                y: shipY
            } : entities[targetId];
            if (targetPos) {
                const dx = targetPos.x - attackerLive.x;
                const dy = targetPos.y - attackerLive.y;
                attackerLive.desiredAngle = Math.atan2(dy, dx) + Math.PI;
                if (typeof attackerLive.angle !== "number") attackerLive.angle = attackerLive.desiredAngle;
            }
        }
    }
    if (shouldSuppressVisibleNpcLaser(attackerId, attackerSnap)) {
        for (let idx = laserBeams.length - 1; idx >= 0; idx--) {
            const beam = laserBeams[idx];
            if (beam.attackerId === attackerId) {
                laserBeams.splice(idx, 1);
            }
        }
        return;
    }
    if (shouldUseProtegitLaser(attackerSnap)) {
        for (let idx = laserBeams.length - 1; idx >= 0; idx--) {
            const beam = laserBeams[idx];
            if (beam.attackerId === attackerId && beam.spriteId !== PROTEGIT_LASER_SPRITE_ID_LOCAL) {
                laserBeams.splice(idx, 1);
            }
        }
    } else if (shouldUseDevolariumLaser(attackerSnap)) {
        for (let idx = laserBeams.length - 1; idx >= 0; idx--) {
            const beam = laserBeams[idx];
            if (beam.attackerId === attackerId && beam.spriteId !== DEVOLARIUM_LASER_SPRITE_ID_LOCAL) {
                laserBeams.splice(idx, 1);
            }
        }
    } else if (shouldUseLordakiumLaser(attackerSnap)) {
        for (let idx = laserBeams.length - 1; idx >= 0; idx--) {
            const beam = laserBeams[idx];
            if (beam.attackerId === attackerId && beam.spriteId !== LORDAKIUM_LASER_SPRITE_ID_LOCAL) {
                laserBeams.splice(idx, 1);
            }
        }
    }
    const spawnBeamEntries = (createdAt, flagShowShield = showShieldDamage, playSound = true, options = null) => {
        const flipX = visual.flipX === true;
        const entries = [];
        let showShield = flagShowShield;
        let fallbackSoundX = baseStartX;
        let fallbackSoundY = baseStartY;
        const suppressImpactVisual = !!(options && options.suppressImpactVisual);
        const localSabVisual = !!(options && options.localSabVisual);
        salvoOffsets.forEach((offset, slotIndex) => {
            const offsetX = Number.isFinite(offset?.x) ? offset.x : 0;
            const offsetY = Number.isFinite(offset?.y) ? offset.y : 0;
            let startX = baseStartX + offsetX;
            let startY = baseStartY + offsetY;
            let endX = baseEndX;
            let endY = baseEndY;
            fallbackSoundX = startX;
            fallbackSoundY = startY;
            const adjusted = applyLaserLength(startX, startY, endX, endY, laserLength, visual.absorber);
            if (!adjusted) return;
            endX = adjusted.endX;
            endY = adjusted.endY;
            const angle = Math.atan2(endY - startY, endX - startX);
            const addEntry = (extraOffsetX, extraOffsetY, shotIndex) => {
                entries.push({
                    attackerId: attackerId,
                    targetId: targetId,
                    patternId: patternId,
                    spriteId: visual.spriteId,
                    showShieldDamage: showShield,
                    skilledLaser: skilledLaser,
                    absorber: visual.absorber,
                    rotation: visual.playLoop ? null : angle,
                    angle: angle,
                    startX: startX + extraOffsetX,
                    startY: startY + extraOffsetY,
                    endX: endX + extraOffsetX,
                    endY: endY + extraOffsetY,
                    offsetX: offsetX + extraOffsetX,
                    offsetY: offsetY + extraOffsetY,
                    offsetEndX: extraOffsetX,
                    offsetEndY: extraOffsetY,
                    duration: duration,
                    endScale: visual.absorber ? .1 : 1,
                    flipX: flipX,
                    laserLength: laserLength,
                    createdAt: createdAt,
                    playLoop: visual.playLoop,
                    followTargets: !visual.playLoop,
                    hitHandled: suppressImpactVisual,
                    localSabVisual: localSabVisual,
                    salvoSlot: `${slotIndex}-${shotIndex}`
                });
            };
            addEntry(0, 0, 0);
            showShield = false;
        });
        try {
            if (playSound && window.AudioManager && typeof window.AudioManager.playLaserShot === "function") {
                const lastEntry = entries[entries.length - 1];
                const soundX = visual.absorber ? baseStartX : lastEntry ? lastEntry.startX : fallbackSoundX;
                const soundY = visual.absorber ? baseStartY : lastEntry ? lastEntry.startY : fallbackSoundY;
                window.AudioManager.playLaserShot(attackerId, attackerSnap, patternId, skilledLaser, soundX, soundY);
            }
        } catch (_) {}
        if (entries.length === 0) return;
        if (visual.playLoop) {
            const entriesBySlot = new Map(entries.map(entry => [ entry.salvoSlot, entry ]));
            for (let idx = laserBeams.length - 1; idx >= 0; idx--) {
                const beam = laserBeams[idx];
                if (beam.playLoop && beam.attackerId === attackerId && beam.targetId === targetId && beam.patternId === patternId && beam.skilledLaser === skilledLaser) {
                    const slot = beam.salvoSlot ?? "0-0";
                    const entry = entriesBySlot.get(slot);
                    if (entry) {
                        beam.startX = entry.startX;
                        beam.startY = entry.startY;
                        beam.endX = entry.endX;
                        beam.endY = entry.endY;
                        beam.duration = entry.duration;
                        beam.createdAt = createdAt;
                        beam.absorber = entry.absorber;
                        beam.showShieldDamage = entry.showShieldDamage;
                        beam.angle = entry.angle;
                        beam.rotation = entry.rotation;
                        beam.endScale = entry.endScale;
                        beam.flipX = entry.flipX;
                        beam.laserLength = entry.laserLength;
                        beam.followTargets = entry.followTargets;
                        beam.offsetX = entry.offsetX;
                        beam.offsetY = entry.offsetY;
                        beam.offsetEndX = entry.offsetEndX;
                        beam.offsetEndY = entry.offsetEndY;
                        beam.hitHandled = false;
                        beam.salvoSlot = entry.salvoSlot;
                        entriesBySlot.delete(slot);
                    } else {
                        laserBeams.splice(idx, 1);
                    }
                }
            }
            for (const entry of entriesBySlot.values()) {
                laserBeams.push(entry);
            }
            return;
        }
        for (const entry of entries) {
            laserBeams.push(entry);
        }
    };
    const maybeSpawnEnergyLeechEcho = createdAt => {
        if (patternId === 7) return;
        if (typeof flashIsEnergyLeechLaserEchoActiveForEntity !== "function") return;
        if (!flashIsEnergyLeechLaserEchoActiveForEntity(attackerId, Number(createdAt) || performance.now())) return;
        if (typeof spawnEnergyLeechLaserEchoAttack === "function") {
            spawnEnergyLeechLaserEchoAttack(attackerId, targetId, Number(createdAt) || performance.now());
        }
    };
    const now = performance.now();
    if (patternId === 4 && visual.absorber && !visual.playLoop && visual.spriteId === 4) {
        const fireRate = typeof window !== "undefined" && Number.isFinite(window.SAB_LASER_FIRE_RATE_MS) && window.SAB_LASER_FIRE_RATE_MS > 0 ? window.SAB_LASER_FIRE_RATE_MS : 200;
        const attackLength = Number.isFinite(visual.attackLengthMs) && visual.attackLengthMs > 0 ? visual.attackLengthMs : typeof LASER_ATTACK_LENGTH_MS !== "undefined" ? LASER_ATTACK_LENGTH_MS : 1350;
        const beamDuration = Number.isFinite(duration) && duration > 0 ? duration : 500;
        const key = getSabLaserVisualJobKey(attackerId, targetId, skilledLaser);
        clearSabLaserVisualJobsForAttacker(attackerId, key);
        startOrRefreshSabLaserVisualJob(key, attackerId, targetId, skilledLaser, fireRate, attackLength, beamDuration, (createdAt, playSound, firstTick) => {
            if (firstTick) {
                spawnBeamEntries(createdAt, showShieldDamage, playSound);
                return;
            }
            spawnBeamEntries(createdAt, false, playSound, {
                suppressImpactVisual: true,
                localSabVisual: true
            });
        });
        maybeSpawnEnergyLeechEcho(now);
        return;
    }
    clearSabLaserVisualJobsForAttacker(attackerId);
    if (visual.spriteId === 6) {
        const cfg = window.RSB_VISUAL_BURST || {};
        const burstCount = Number.isFinite(cfg.count) ? cfg.count : 5;
        const burstSpacing = Number.isFinite(cfg.spacingMs) ? cfg.spacingMs : 120;
        const seq = beginRsbBurst(attackerId, targetId);
        for (let b = 0; b < burstCount; b++) {
            const delay = b * burstSpacing;
            const isFirst = b === 0;
            const timeoutId = setTimeout(() => {
                const state = RSB_BURST_STATE.get(String(attackerId));
                if (!state || state.seq !== seq) return;
                spawnBeamEntries(performance.now(), isFirst);
            }, delay);
            const state = RSB_BURST_STATE.get(String(attackerId));
            if (state) state.timeouts.push(timeoutId);
        }
        const cleanupDelay = Math.max(0, burstCount * burstSpacing + duration + 250);
        const cleanupTimeoutId = setTimeout(() => {
            const key = String(attackerId);
            const state = RSB_BURST_STATE.get(key);
            if (!state || state.seq !== seq) return;
            clearRsbBurstState(key);
        }, cleanupDelay);
        const state = RSB_BURST_STATE.get(String(attackerId));
        if (state) state.timeouts.push(cleanupTimeoutId);
        maybeSpawnEnergyLeechEcho(now);
        return;
    }
    spawnBeamEntries(now, showShieldDamage);
    maybeSpawnEnergyLeechEcho(now);
}

function handlePacket_attackInfo(parts, i) {
    const attackerId = parseInt(parts[i] || "", 10);
    const targetId = parseInt(parts[i + 1] || "", 10);
    const attackType = String(parts[i + 2] || "").toUpperCase();
    const hpRaw = parts[i + 3];
    const shRaw = parts[i + 4];
    const deltaRaw = parts[i + 5];
    const deltaAltRaw = parts[i + 6];
    if (isNaN(targetId)) return;
    updateEntityClaim(targetId, attackerId);
    const hp = hpRaw !== undefined ? parseInt(hpRaw, 10) : NaN;
    const shield = shRaw !== undefined ? parseFloat(shRaw) : NaN;
    const applyShieldHit = (id, prev, next) => {
        if (prev != null && !isNaN(next) && next < prev) {
            let angle = computeShieldImpactAngle(attackerId, targetId);
            if (angle == null) {
                const beamAngle = getRecentBeamAngleForTarget(id);
                angle = normalizeShieldImpactVisualAngle(beamAngle);
            }
            const radius = computeShieldImpactRadius(snapshotEntityById(id));
            const sx = heroId !== null && id === heroId ? shipX : entities[id]?.x || 0;
            const sy = heroId !== null && id === heroId ? shipY : entities[id]?.y || 0;
            if (angle != null) {
                spawnShieldBurstAt(sx, sy, "hit", {
                    angle: angle,
                    radius: radius,
                    targetId: id,
                    followTarget: true
                });
            }
        }
    };
    let prevHp = null;
    let prevShieldForBubble = null;
    if (heroId !== null && targetId === heroId) {
        prevHp = heroHp;
        prevShieldForBubble = heroShield;
        const prevShield = heroShield;
        if (!isNaN(hp)) heroHp = hp;
        if (!isNaN(shield)) {
            applyShieldHit(heroId, prevShield, shield);
            heroShield = shield;
        }
        if (!isNaN(hp) || !isNaN(shield)) {
            __androPerfNoteEntityUpdate("hero_combat_stats", {
                entityId: targetId,
                packetKind: "Y",
                hpKnown: !isNaN(hp),
                shieldKnown: !isNaN(shield)
            });
        }
    } else {
        const ent = entities[targetId];
        if (ent) {
            prevHp = ent.hp;
            prevShieldForBubble = ent.shield;
            const prevShield = ent.shield;
            if (!isNaN(hp)) ent.hp = hp;
            if (!isNaN(shield)) {
                applyShieldHit(targetId, prevShield, shield);
                ent.shield = shield;
            }
            if (ent.hp != null && ent.shield != null && ent.maxHp != null && ent.maxShield != null) {
                ent.targetStatsHydrated = true;
                ent.targetStatsHydratedAt = __rxNowMs();
            }
            if (!isNaN(hp) || !isNaN(shield)) {
                __androPerfNoteEntityUpdate("entity_combat_stats", {
                    entityId: targetId,
                    packetKind: "Y",
                    targetType: ent.kind,
                    hpKnown: !isNaN(hp),
                    shieldKnown: !isNaN(shield)
                });
                __androPerfNoteTargetInfoApplied(targetId, "Y");
            }
        }
    }
    if (!isNaN(hp) && hp <= 0) {
        cancelRsbBurstsByTarget(targetId);
        clearSabRingStateForEntity(targetId);
        clearSabLaserVisualJobsForEntity(targetId);
        removeLaserBeamsForEntity(targetId);
        releaseSabShotsForEntity(targetId);
    }
    let delta = deltaRaw !== undefined ? parseInt(deltaRaw, 10) : NaN;
    if (isNaN(delta) && deltaAltRaw !== undefined) {
        delta = parseInt(deltaAltRaw, 10);
    }

    if (isNaN(delta) || delta === 0) {
        if (attackType === "H") {
            const hpDelta = !isNaN(hp) && prevHp != null ? hp - prevHp : NaN;
            const shDelta = !isNaN(shield) && prevShieldForBubble != null ? shield - prevShieldForBubble : NaN;
            if (!isNaN(hpDelta) && hpDelta !== 0) {
                delta = hpDelta;
            } else if (!isNaN(shDelta) && shDelta !== 0) {
                delta = shDelta;
            }
        }
    }

    if (!isNaN(delta) && delta !== 0) {
        const isHealType = attackType === "H";
        const isHeal = isHealType || delta > 0;
        const colorId = isHealType ? 2 : 0;
        pushDamageBubble(targetId, delta, isHeal, colorId, isHealType);
    }
}

function handlePacket_remove(parts, i) {
    if (parts.length < i + 1) return;
    const rawId = parts[i];
    if (rawId == null || rawId === "") return;
    let key = makeCollectableEntityId(rawId);
    let e = entities[key];
    if (!e) {
        const directKey = entities[rawId] ? rawId : /^\d+$/.test(rawId) ? parseInt(rawId, 10) : null;
        const direct = directKey != null ? entities[directKey] : null;
        if (direct && direct.kind === "box") {
            key = directKey;
            e = direct;
        }
    }
    if (!e) return;
    if (typeof clearPendingTargetSelection === "function") clearPendingTargetSelection(e.id);
    if (e.kind === "player" || e.kind === "npc") {
        if (e.id === currentLaserTargetId || e.id === selectedTargetId) {
            if (typeof forceUnlock === "function") forceUnlock(e.id, { suppressServerStop: true, preserveMinimapMove: true });
            if (typeof stopLaserEffects === "function") stopLaserEffects();
            if (typeof stopRocketEffects === "function") stopRocketEffects();
        }
    }
    if (pendingCollectBoxId === e.id) {
        pendingCollectBoxId = null;
        if (typeof stopHeroCollectorBeam === "function") stopHeroCollectorBeam();
    }
    if (e.kind === "box") {
        if (typeof startCollectableFadeOut === "function") startCollectableFadeOut(e);
        if (typeof clearBoxAnimationState === "function") clearBoxAnimationState(e.id);
        if (typeof clearOreAnimationState === "function") clearOreAnimationState(e.id);
    }
    if (typeof rememberRemovedEntitySnapshot === "function" && (e.kind === "player" || e.kind === "npc")) {
        rememberRemovedEntitySnapshot(e);
    }
    cancelRsbBurstsByTarget(e.id);
    cancelRsbBurst(e.id);
    clearSabRingStateForEntity(e.id);
    clearSabLaserVisualJobsForEntity(e.id);
    removeLaserBeamsForEntity(e.id);
    releaseSabShotsForEntity(e.id);
    detachRocketAttacksForEntity(e.id);
    clearAttackLocksTargetingEntity(e.id);
    unregisterAttackLockForEntity(e);
    unregisterEntityRuntimeActiveState(e.id);
    delete entities[key];
    if (loggedEntities.has(e.id)) loggedEntities.delete(e.id);
    if (typeof clearCollectRequest === "function") {
        clearCollectRequest(e.id);
    } else if (typeof collectedBoxRequestIds !== "undefined") {
        collectedBoxRequestIds.delete(e.id);
    }
    maybeClearMinimapEnemyWarningAfterForeignRemoval(e);
    __androPerfNoteEntityUpdate("entity_remove", {
        entityId: e.id,
        packetKind: "2",
        targetType: e.kind
    });
}

function handlePacket_s(parts, i) {
    const typeId = parseInt(parts[i], 10);
    const stationId = parseInt(parts[i + 1], 10);
    const stationType = parts[i + 2];
    const factionId = parseInt(parts[i + 3], 10);
    const stationX = parseInt(parts[i + 5], 10);
    const stationY = parseInt(parts[i + 6], 10);
    if (!stationType || !Number.isFinite(stationX) || !Number.isFinite(stationY)) {
        return;
    }
    const nextStation = {
        id: Number.isFinite(stationId) ? stationId : null,
        typeId: Number.isFinite(typeId) ? typeId : null,
        factionId: Number.isFinite(factionId) ? factionId : 0,
        type: stationType,
        x: stationX,
        y: stationY
    };
    if (nextStation.id !== null) {
        const idx = stations.findIndex(s => s && s.id === nextStation.id);
        if (idx !== -1) {
            stations[idx] = Object.assign({}, stations[idx], nextStation);
            if (typeof window.warmStationMinimapIcon === "function") {
                window.warmStationMinimapIcon(stations[idx]);
            }
            return;
        }
    }
    stations.push(nextStation);
    if (typeof window.warmStationMinimapIcon === "function") {
        window.warmStationMinimapIcon(nextStation);
    }
}

function handlePacket_R(parts, i) {
    if (parts.length < i + 1) return;
    const rawId = parts[i];
    if (rawId == null || rawId === "") return;
    const key = typeof resolveEntityKeyFromServerId === "function" ? resolveEntityKeyFromServerId(rawId) : entities[rawId] ? rawId : /^\d+$/.test(rawId) ? parseInt(rawId, 10) : null;
    if (key == null) return;
    const ent = entities[key];
    if (!ent) return;
    if (typeof clearPendingTargetSelection === "function") clearPendingTargetSelection(ent.id);
    const isMyCollection = pendingCollectBoxId != null && pendingCollectBoxId == ent.id || typeof hasCollectRequestPending === "function" && hasCollectRequestPending(ent.id) || typeof hasCollectRequestPending !== "function" && typeof collectedBoxRequestIds !== "undefined" && collectedBoxRequestIds.has(ent.id);
    if (ent.kind === "box") {
        if (!isMyCollection && ent.boxSpawnTime && Date.now() - ent.boxSpawnTime < 2e3) {
            return;
        }
    }
    if (ent.kind === "player" || ent.kind === "npc") {
        if (ent.id == currentLaserTargetId || ent.id == selectedTargetId) {
            if (typeof forceUnlock === "function") forceUnlock(ent.id, { suppressServerStop: true, preserveMinimapMove: true });
            if (typeof stopLaserEffects === "function") stopLaserEffects();
            if (typeof stopRocketEffects === "function") stopRocketEffects();
        }
    }
    if (pendingCollectBoxId != null && pendingCollectBoxId == ent.id) {
        pendingCollectBoxId = null;
        if (typeof stopHeroCollectorBeam === "function") stopHeroCollectorBeam();
    }
    if (ent.kind === "box") {
        if (typeof startCollectableFadeOut === "function") startCollectableFadeOut(ent);
        if (typeof clearBoxAnimationState === "function") clearBoxAnimationState(ent.id);
        if (typeof clearOreAnimationState === "function") clearOreAnimationState(ent.id);
    }
    if (typeof rememberRemovedEntitySnapshot === "function" && (ent.kind === "player" || ent.kind === "npc")) {
        rememberRemovedEntitySnapshot(ent);
    }
    if (ent.kind === "player" || ent.kind === "npc") {
        cancelRsbBurstsByTarget(ent.id);
        cancelRsbBurst(ent.id);
        clearSabLaserVisualJobsForEntity(ent.id);
        removeLaserBeamsForEntity(ent.id);
        queueEntityVisualCleanup(ent.id, {
            clearSabRing: true,
            releaseSabShots: true,
            detachRocketAttacks: true,
            clearShipSkillVisuals: true
        });
        clearAttackLocksTargetingEntity(ent.id);
        unregisterAttackLockForEntity(ent);
        unregisterEntityRuntimeActiveState(ent.id);
    }
    if (entities[key] === ent) delete entities[key];
    if (entities[rawId] === ent) delete entities[rawId];
    if (ent.id != null && entities[ent.id] === ent) delete entities[ent.id];
    if (loggedEntities.has(ent.id)) loggedEntities.delete(ent.id);
    if (typeof clearCollectRequest === "function") {
        clearCollectRequest(ent.id);
    } else if (typeof collectedBoxRequestIds !== "undefined") {
        collectedBoxRequestIds.delete(ent.id);
    }
    maybeClearMinimapEnemyWarningAfterForeignRemoval(ent);
    __androPerfNoteEntityUpdate("entity_remove", {
        entityId: ent.id,
        packetKind: "R",
        targetType: ent.kind
    });
}

function getLaserAmmoLabelById(ammoId) {
    switch (ammoId) {
      case 1:
        return "LCB-10";

      case 2:
        return "MCB-25";

      case 3:
        return "MCB-50";

      case 4:
        return "UCB-100";

      case 5:
        return "SAB-50";

      case 6:
        return "RSB-75";

      default:
        return `Laser ammo (${ammoId})`;
    }
}

function getRocketLabelById(rocketId) {
    switch (rocketId) {
      case 1:
        return "R-310";

      case 2:
        return "PLT-2026";

      case 3:
        return "PLT-2021";

      case 4:
        return "PLT-3030";

      case 5:
        return "PLD-8";

      case 10:
        return "DCR-250";

      case 7:
        return "WIZ";

      default:
        return `Rocket (${rocketId})`;
    }
}

function handlePacket_W(parts, i) {
    const weapon = parts[i];
    const mode = parseInt(parts[i + 2], 10);
    const m = isNaN(mode) ? 0 : mode;
    if (typeof addInfoMessage !== "function") return;
    if (weapon === "R") {
        addServerInfoLogMessage(m === 0 ? "No rockets left." : "No rockets available.");
        return;
    }
    if (weapon === "L") {
        addServerInfoLogMessage(m === 0 ? "No laser ammunition left." : "No laser ammunition available.");
        try {
            if (typeof stopLaserEffects === "function") stopLaserEffects();
        } catch (_) {}
        if (m === 0) {
            try {
                if (typeof currentLaserTargetId !== "undefined") currentLaserTargetId = null;
                if (typeof attackIntentTargetId !== "undefined") attackIntentTargetId = null;
                if (typeof confirmedAttackTargetId !== "undefined") confirmedAttackTargetId = null;
                if (typeof pendingAttackAckTargetId !== "undefined") pendingAttackAckTargetId = null;
                if (typeof pendingAttackAckStartMs !== "undefined") pendingAttackAckStartMs = 0;
                if (typeof resetPendingRangeResume === "function") resetPendingRangeResume();
                if (typeof isChasingTarget !== "undefined") isChasingTarget = false;
            } catch (_) {}
        }
        return;
    }
}

function handlePacket_y(parts, i) {
    const type = parts[i];
    if (!type) return;
    if (type === "BTB") {
        if (typeof addInfoMessage === "function") {
            addServerInfoLogMessage("Your cargo bay is full.");
        }
        try {
            const boxId = typeof pendingCollectBoxId !== "undefined" && pendingCollectBoxId != null ? pendingCollectBoxId : typeof collectDelayBoxId !== "undefined" ? collectDelayBoxId : null;
            if (boxId != null && typeof clearCollectRequest === "function") {
                clearCollectRequest(boxId);
            } else if (boxId == null && typeof clearAllCollectRequests === "function") {
                clearAllCollectRequests();
            } else if (boxId != null && typeof collectedBoxRequestIds !== "undefined") {
                collectedBoxRequestIds.delete(boxId);
            }
        } catch (_) {}
        if (typeof clearPendingCollectState === "function") {
            clearPendingCollectState();
        } else {
            if (typeof stopHeroCollectorBeam === "function") stopHeroCollectorBeam();
            if (typeof pendingCollectBoxId !== "undefined") pendingCollectBoxId = null;
        }
        return;
    }
    if (type === "BAH") {
        if (typeof addInfoMessage === "function") {
            addServerInfoLogMessage("This box was already collected.");
        }
        try {
            const boxId = typeof pendingCollectBoxId !== "undefined" && pendingCollectBoxId != null ? pendingCollectBoxId : null;
            if (boxId != null && typeof clearCollectRequest === "function") {
                clearCollectRequest(boxId);
            } else if (boxId == null && typeof clearAllCollectRequests === "function") {
                clearAllCollectRequests();
            } else if (boxId != null && typeof collectedBoxRequestIds !== "undefined") {
                collectedBoxRequestIds.delete(boxId);
            }
        } catch (_) {}
        if (typeof clearPendingCollectState === "function") {
            clearPendingCollectState();
        } else {
            if (typeof stopHeroCollectorBeam === "function") stopHeroCollectorBeam();
            if (typeof pendingCollectBoxId !== "undefined") pendingCollectBoxId = null;
        }
        return;
    }
    if (typeof addInfoMessage !== "function") return;
    if (type === "BAT") {
        const ammoId = parseInt(parts[i + 1], 10);
        const amount = parseInt(parts[i + 2], 10);
        if (isNaN(ammoId) || isNaN(amount)) return;
        const label = getLaserAmmoLabelById(ammoId);
        addServerInfoLogMessage(`You received ${amount} ${label}.`);
        return;
    }
    if (type === "ROK") {
        const rocketId = parseInt(parts[i + 1], 10);
        const amount = parseInt(parts[i + 2], 10);
        if (isNaN(rocketId) || isNaN(amount)) return;
        const label = getRocketLabelById(rocketId);
        addServerInfoLogMessage(`You received ${amount} ${label}.`);
        return;
    }
    const amount = parseInt(parts[i + 1], 10);
    const total = parseInt(parts[i + 2], 10);
    if (isNaN(amount)) return;
    let label = type;
    if (type === "CRE") {
        label = "Credits";
        if (!isNaN(total)) heroCredits = total;
    } else if (type === "URI") {
        label = "Uridium";
        if (!isNaN(total)) heroUridium = total;
    } else if (type === "EP") {
        label = "EP";
        const newLevel = parseInt(parts[i + 3], 10);
        const previousLevel = typeof heroLevel === "number" && !isNaN(heroLevel) ? heroLevel : 0;
        if (!isNaN(total)) heroXp = total;
        if (!isNaN(newLevel) && newLevel > 0) {
            heroLevel = newLevel;
            if (newLevel > previousLevel && typeof triggerHeroLevelUpEffect === "function") {
                triggerHeroLevelUpEffect(newLevel);
            }
        }
    } else if (type === "HON") {
        label = "Honor";
        if (!isNaN(total)) heroHonor = total;
    }
    addServerInfoLogMessage(`You received ${amount} ${label}.`);
}

function forceUnlock(targetId, options = {}) {
    const suppressServerStop = options.suppressServerStop === true;
    const preserveMoveTarget = options.preserveMoveTarget === true || options.preserveMinimapMove === true;
    const shouldPreserveMoveTarget = preserveMoveTarget && hasActiveHeroMoveTarget();
    if (confirmedAttackTargetId === targetId) {
        confirmedAttackTargetId = null;
    }
    if (typeof clearHeroCombatLogActiveTarget === "function") {
        clearHeroCombatLogActiveTarget(targetId);
    }
    if (pendingAttackAckTargetId === targetId) {
        pendingAttackAckTargetId = null;
        pendingAttackAckStartMs = 0;
    }
    if (selectedTargetId === targetId) {
        selectedTargetId = null;
    }
    if (typeof clearPendingTargetSelection === "function") clearPendingTargetSelection(targetId);
    if (currentLaserTargetId === targetId) {
        currentLaserTargetId = null;
        if (!suppressServerStop) {
            sendLaserStop(targetId, true);
        }
    }
    if (attackIntentTargetId === targetId) {
        attackIntentTargetId = null;
    }
    if (typeof clearHeroMissingCombatTarget === "function") clearHeroMissingCombatTarget(targetId);
    if (pendingRangeResumeTargetId === targetId) {
        resetPendingRangeResume(targetId);
    }
    if (rangeProtectedTargetId === targetId) {
        rangeProtectedTargetId = null;
    }
    if (isChasingTarget) {
        isChasingTarget = false;
        if (!shouldPreserveMoveTarget) {
            moveTargetX = null;
            moveTargetY = null;
            moveTargetFromMinimap = false;
        }
    }
    removeLaserBeamsForEntity(targetId);
    releaseSabShotsForEntity(targetId);
    clearSabRingStateForEntity(targetId);
    clearSabLaserVisualJobsForEntity(targetId);
}

function clampExplosionType(v) {
    const n = parseInt(v, 10);
    if (!Number.isFinite(n) || isNaN(n)) return null;
    return Math.max(0, Math.min(5, n));
}

function resolveExplosionType(entity, id, explicitType = null) {
    const pktType = clampExplosionType(explicitType);
    if (pktType != null) return pktType;
    if (entity && entity.explodeTypeId != null) {
        const explicit = clampExplosionType(entity.explodeTypeId);
        if (explicit != null) return explicit;
    }
    if (entity && entity.category === "station") return 4;
    const shipId = entity && entity.shipId != null ? entity.shipId : id === heroId ? heroShipId : entity ? entity.type : null;
    const maxHp = id === heroId ? typeof heroMaxHp !== "undefined" ? heroMaxHp : null : entity && Number.isFinite(entity.maxHp) ? entity.maxHp : null;
    if (Number.isFinite(maxHp) && maxHp > 0) {
        if (maxHp < 5e4) return 2;
        if (maxHp < 4e5) return 3;
        if (maxHp < 2e6) return 0;
        return 1;
    }
    if (shipId != null) {
        if (STRUCTURE_EXPLOSION_IDS.has(shipId)) return 4;
        if (MASSIVE_EXPLOSION_IDS.has(shipId)) return 1;
        if (BOSS_EXPLOSION_IDS.has(shipId)) return 0;
        if (SMALL_SHIP_EXPLOSION_IDS.has(shipId)) return 3;
        if (SMALL_NPC_EXPLOSION_IDS.has(shipId)) return 2;
    }
    const name = (entity && entity.name ? entity.name : "").toLowerCase();
    if (name) {
        if (name.includes("station") || name.includes("base") || name.includes("turret")) return 4;
        if (name.includes("hitac") || name.includes("devour") || name.includes("battleray") || name.includes("emperor")) return 1;
        if (name.includes("cubikon") || name.includes("kristallon") || name.includes("lordakium") || name.includes("boss") || name.includes("uber")) return 0;
        if (name.includes("streuner") || name.includes("lordakia") || name.includes("saimon") || name.includes("mordon") || name.includes("interceptor")) return 2;
    }
    return 0;
}

function handlePacket_K(parts, i) {
    const id = parseInt(parts[i], 10);
    const e = entities[id];
    if (typeof clearPendingTargetSelection === "function") clearPendingTargetSelection(id);
    const explicitExplosionType = parts.length > i + 1 ? parts[i + 1] : null;
    if (typeof rememberRemovedEntitySnapshot === "function" && e) {
        rememberRemovedEntitySnapshot(e);
    }
    if (Number.isFinite(id)) {
        queueEntityVisualCleanup(id, { detachRocketAttacks: true });
    }
    clearAttackLocksTargetingEntity(id);
    if (e || id === heroId) {
        const entityX = id === heroId ? shipX : e ? e.x : 0;
        const entityY = id === heroId ? shipY : e ? e.y : 0;
        const explosionType = resolveExplosionType(e, id, explicitExplosionType);
        spawnExplosionAt(entityX, entityY, explosionType);
    }
    if (id === heroId) {
        addServerInfoLogMessage("SHIP DESTROYED!");
        try {
            if (window.AudioManager && typeof window.AudioManager.playSoundEffect === "function") {
                window.AudioManager.playSoundEffect(18, false, false, -1, -1, true);
                window.AudioManager.playSoundEffect(41, false, false, -1, -1, true);
            }
        } catch (_) {}
        heroHp = 0;
        heroShield = 0;
        moveTargetX = null;
        moveTargetY = null;
        moveTargetFromMinimap = false;
        isChasingTarget = false;
        attackIntentTargetId = null;
        currentLaserTargetId = null;
        cancelRsbBurstsByTarget(heroId);
        cancelRsbBurst(heroId);
        clearSabRingStateForEntity(heroId);
        clearSabLaserVisualJobsForEntity(heroId);
        removeLaserBeamsForEntity(heroId);
        releaseSabShotsForEntity(heroId);
        if (typeof activeLasers !== "undefined") activeLasers = [];
        if (typeof flashClearEntityShipSkillVisualEffects === "function") {
            flashClearEntityShipSkillVisualEffects(heroId);
        }
        if (typeof updateHtmlWindows === "function") updateHtmlWindows();
        __androPerfNoteEntityUpdate("hero_kill", {
            entityId: id,
            packetKind: "K"
        });
        return;
    }
    if (e) {
        if (e.kind === "box") {
            forceUnlock(id, { suppressServerStop: true, preserveMinimapMove: true });
            return;
        }
        forceUnlock(id, { suppressServerStop: true, preserveMinimapMove: true });
        cancelRsbBurstsByTarget(id);
        cancelRsbBurst(id);
        clearSabLaserVisualJobsForEntity(id);
        removeLaserBeamsForEntity(id);
        queueEntityVisualCleanup(id, {
            clearSabRing: true,
            releaseSabShots: true,
            detachRocketAttacks: true,
            clearShipSkillVisuals: true
        });
        unregisterAttackLockForEntity(e);
        unregisterEntityRuntimeActiveState(id);
        delete entities[id];
        if (loggedEntities.has(id)) loggedEntities.delete(id);
        __androPerfNoteEntityUpdate("entity_kill", {
            entityId: id,
            packetKind: "K",
            targetType: e.kind
        });
    }
}

function handlePacket_E(parts, i) {
    if (parts.length < i + 9) return;
    window.oreCargo = {
        prometium: parseInt(parts[i], 10) || 0,
        endurium: parseInt(parts[i + 1], 10) || 0,
        terbium: parseInt(parts[i + 2], 10) || 0,
        xenomit: parseInt(parts[i + 3], 10) || 0,
        prometid: parseInt(parts[i + 4], 10) || 0,
        duranium: parseInt(parts[i + 5], 10) || 0,
        promerium: parseInt(parts[i + 6], 10) || 0,
        seprom: parseInt(parts[i + 7], 10) || 0,
        palladium: parseInt(parts[i + 8], 10) || 0
    };
    const CARGO_ORE_KEYS = [ "prometium", "endurium", "terbium", "prometid", "duranium", "promerium", "seprom", "palladium" ];
    heroCargo = CARGO_ORE_KEYS.reduce((sum, key) => sum + (parseInt(window.oreCargo[key], 10) || 0), 0);
    if (typeof refreshTradeUI === "function") {
        refreshTradeUI();
    }
    if (typeof refreshRefiningWindow === "function") {
        refreshRefiningWindow();
    }
    try {
        const boxId = typeof pendingCollectBoxId !== "undefined" && pendingCollectBoxId != null ? pendingCollectBoxId : typeof collectDelayBoxId !== "undefined" && collectDelayBoxId != null ? collectDelayBoxId : null;
        const hadRequest = boxId != null ? typeof hasCollectRequestPending === "function" ? hasCollectRequestPending(boxId) : typeof collectedBoxRequestIds !== "undefined" && collectedBoxRequestIds.has(boxId) : typeof clearAllCollectRequests === "function" && typeof collectedBoxRequestIds !== "undefined" && collectedBoxRequestIds.size > 0;
        if (hadRequest) {
            if (boxId != null && typeof clearCollectRequest === "function") {
                clearCollectRequest(boxId);
            } else if (boxId == null && typeof clearAllCollectRequests === "function") {
                clearAllCollectRequests();
            } else if (boxId != null && typeof collectedBoxRequestIds !== "undefined") {
                collectedBoxRequestIds.delete(boxId);
            }
            if (typeof clearPendingCollectState === "function") {
                clearPendingCollectState();
            } else {
                try {
                    if (typeof stopHeroCollectorBeam === "function") stopHeroCollectorBeam();
                } catch (_) {}
                try {
                    if (typeof pendingCollectBoxId !== "undefined") pendingCollectBoxId = null;
                } catch (_) {}
                try {
                    if (typeof collectDelayBoxId !== "undefined") collectDelayBoxId = null;
                } catch (_) {}
                try {
                    if (typeof collectDelayTimerId !== "undefined" && collectDelayTimerId != null) {
                        clearTimeout(collectDelayTimerId);
                        collectDelayTimerId = null;
                    }
                } catch (_) {}
            }
        }
    } catch (_) {}
}

function handlePacket_T(parts, i) {
    let start = i;
    if (parts[0] === "0" && parts[1] === "T") {
        start = 2;
    }
    if (parts.length < start + 2) return;
    const typeRaw = parts[start] || "HM7";
    const amount = parseInt(parts[start + 1], 10);
    if (isNaN(amount)) return;
    const type = typeRaw.toUpperCase();
    if (type === "HM7") {
        cpuItems.HM7.amount = amount;
        cpuItems.HM7.hasItem = amount > 0;
        if (amount <= 0) {
            addServerInfoLogMessage("Trade Drone HM7 depleted.");
        } else {
            addServerInfoLogMessage("Trade Drone HM7: " + amount + " use(s) remaining.");
        }
    }
}

function handlePacket_b(parts, i) {
    if (parts.length < i + 5) return;
    window.orePrices = {
        prometium: parseInt(parts[i], 10) || 0,
        endurium: parseInt(parts[i + 1], 10) || 0,
        terbium: parseInt(parts[i + 2], 10) || 0
    };
}

function handlePacket_g(parts, i) {
    const keys = [ 1, 2, 3, 11, 12, 13 ];
    for (let idx = 0; idx < keys.length && i + idx < parts.length; idx++) {
        const price = parseInt(parts[i + idx], 10);
        if (!isNaN(price)) {
            labPrices[keys[idx]] = price;
        }
    }
    window.tradePrices = {
        ...labPrices
    };
    if (typeof refreshTradeUI === "function") {
        refreshTradeUI();
    }
}

const LAB_ORE_ID_TO_KEY = {
    1: "prometium",
    2: "endurium",
    3: "terbium",
    4: "xenomit",
    5: "palladium",
    11: "prometid",
    12: "duranium",
    13: "promerium",
    14: "seprom"
};

function labOreIdToKey(id) {
    const n = parseInt(id, 10);
    return LAB_ORE_ID_TO_KEY[n] || null;
}

function getSepromSafeCapacityForLevel(level) {
    const lvl = Math.max(0, Math.min(3, parseInt(level, 10) || 0));
    if (lvl === 1) return 3000;
    if (lvl === 2) return 6000;
    if (lvl === 3) return 10000;
    return 0;
}

function setLabSafeState(level, stored, capacity) {
    const safeLevel = Math.max(0, Math.min(3, parseInt(level, 10) || 0));
    const safeStored = Math.max(0, parseInt(stored, 10) || 0);
    const safeCapacity = Math.max(0, parseInt(capacity, 10) || getSepromSafeCapacityForLevel(safeLevel));
    const prev = window.labSafeState || {};
    const changed = prev.loaded !== true || (parseInt(prev.level, 10) || 0) !== safeLevel || (parseInt(prev.stored, 10) || 0) !== safeStored || (parseInt(prev.capacity, 10) || 0) !== safeCapacity;
    window.labSafeState = {
        loaded: true,
        level: safeLevel,
        stored: safeStored,
        capacity: safeCapacity
    };
    return changed;
}

function handlePacket_LAB(parts, i) {
    if (parts.length < i + 1) return;
    const subAction = parts[i];
    if (subAction === "SAFE") {
        const action = (parts[i + 1] || "").toUpperCase();
        if (action === "INFO") {
            const level = parseInt(parts[i + 2], 10) || 0;
            const stored = parseInt(parts[i + 3], 10) || 0;
            const capacity = parseInt(parts[i + 4], 10) || getSepromSafeCapacityForLevel(level);
            const changed = setLabSafeState(level, stored, capacity);
            if (changed && typeof refreshRefiningWindow === "function") {
                refreshRefiningWindow(true, "safe");
            }
        }
        return;
    }
    if (subAction === "UPD" || subAction === "INFO") {
        const updates = [];
        const cursorStart = subAction === "UPD" ? i + 1 : i;
        const actionLabel = parts[cursorStart] || "INFO";
        if (actionLabel === "INFO") {
            let cursor = cursorStart + 1;
            while (cursor + 2 < parts.length) {
                const targetId = (parts[cursor] || "").toUpperCase();
                const oreKey = labOreIdToKey(parts[cursor + 1]);
                const amount = parseInt(parts[cursor + 2], 10);
                cursor += 3;
                if (!targetId) continue;
                updates.push({
                    targetId: targetId,
                    oreKey: oreKey,
                    amount: isNaN(amount) ? 0 : Math.max(0, amount)
                });
            }
        }
        let changed = false;
        if (updates.length && typeof setUpgradeState === "function") {
            updates.forEach(({targetId: targetId, oreKey: oreKey, amount: amount}) => {
                const payload = {
                    amount: amount,
                    oreKey: oreKey || null
                };
                changed = setUpgradeState(targetId, payload) || changed;
            });
        }
        if (changed && typeof refreshRefiningWindow === "function") {
            refreshRefiningWindow(true, "upgrade");
        }
    }
}

function flashResolveTechVisualEntity(targetId, createIfMissing = false) {
    if (!Number.isFinite(Number(targetId)) || Number(targetId) === 0) return null;
    const numericId = Number(targetId);
    if (numericId === Number(heroId)) return null;
    const ent = typeof getExistingVisualEntity === "function" ? getExistingVisualEntity(numericId) : (entities[numericId] || entities[String(numericId)] || null);
    if (!ent || ent.kind === "unknown") return null;
    return ent;
}

function flashSetEnergyLeechTechVisual(targetId, active, durationSeconds = 0) {
    const now = performance.now();
    const durationMs = Number.isFinite(Number(durationSeconds)) && Number(durationSeconds) > 0 ? Number(durationSeconds) * 1e3 : 0;
    const nextUntil = durationMs > 0 ? now + durationMs : 0;
    if (Number(targetId) === Number(heroId)) {
        const wasActive = !!window.heroTechEnergyLeechActive && (!window.heroTechEnergyLeechUntil || window.heroTechEnergyLeechUntil > now);
        window.heroTechEnergyLeechActive = !!active;
        if (active) {
            if (!wasActive || !(Number(window.heroTechEnergyLeechStartedAt) > 0)) {
                window.heroTechEnergyLeechStartedAt = now;
            }
            window.heroTechEnergyLeechUntil = nextUntil > 0 ? Math.max(Number(window.heroTechEnergyLeechUntil) || 0, nextUntil) : (Number(window.heroTechEnergyLeechUntil) || 0);
        } else {
            window.heroTechEnergyLeechStartedAt = 0;
            window.heroTechEnergyLeechUntil = 0;
        }
        return;
    }
    const ent = flashResolveTechVisualEntity(targetId, false);
    if (!ent) return;
    const wasActive = !!ent.techEnergyLeechActive && (!(Number(ent.techEnergyLeechUntil) > 0) || Number(ent.techEnergyLeechUntil) > now);
    ent.techEnergyLeechActive = !!active;
    if (active) {
        if (!wasActive || !(Number(ent.techEnergyLeechStartedAt) > 0)) {
            ent.techEnergyLeechStartedAt = now;
        }
        ent.techEnergyLeechUntil = nextUntil > 0 ? Math.max(Number(ent.techEnergyLeechUntil) || 0, nextUntil) : (Number(ent.techEnergyLeechUntil) || 0);
    } else {
        ent.techEnergyLeechStartedAt = 0;
        ent.techEnergyLeechUntil = 0;
    }
}

function flashSetShieldBackupTechVisual(targetId, durationSeconds = 0) {
    const now = performance.now();
    const visualMs = typeof FLASH_SHIELD_BACKUP_VISUAL_MS === "number" && FLASH_SHIELD_BACKUP_VISUAL_MS > 0 ? FLASH_SHIELD_BACKUP_VISUAL_MS : 1500;
    if (Number(targetId) === Number(heroId)) {
        heroShieldBackupStartedAt = now;
        heroShieldBackupUntil = now + visualMs;
        return;
    }
    const ent = flashResolveTechVisualEntity(targetId, false);
    if (!ent) return;
    ent.techShieldBackupStartedAt = now;
    ent.techShieldBackupUntil = now + visualMs;
}

function flashSetBattleRepairTechVisual(targetId, active, durationSeconds = 0) {
    const now = performance.now();
    const durationMs = Number.isFinite(Number(durationSeconds)) && Number(durationSeconds) > 0 ? Number(durationSeconds) * 1e3 : 0;
    if (Number(targetId) === Number(heroId)) {
        if (typeof setHeroBattleRepairing === "function") {
            setHeroBattleRepairing(!!active, durationMs);
        }
        return;
    }
    const ent = flashResolveTechVisualEntity(targetId, false);
    if (!ent) return;
    if (active) {
        ent.techBattleRepairing = true;
        ent.techBattleRepairFadeUntil = 0;
        ent.techBattleRepairUntil = durationMs > 0 ? Math.max(Number(ent.techBattleRepairUntil) || 0, now + durationMs) : 0;
    } else {
        ent.techBattleRepairing = false;
        ent.techBattleRepairUntil = 0;
        ent.techBattleRepairFadeUntil = now + (typeof BATTLE_REPAIR_FADE_MS === "number" ? BATTLE_REPAIR_FADE_MS : 250);
    }
}

function handleTechChainImpulseAction(parts, startIndex) {
    if (!parts || startIndex == null || startIndex >= parts.length) return;
    const attackerId = parseInt(parts[startIndex + 1], 10);
    if (isNaN(attackerId)) return;
    const targetIds = [];
    for (let idx = startIndex + 2; idx < parts.length; idx++) {
        const value = parseInt(parts[idx], 10);
        if (!isNaN(value) && value !== 0) {
            targetIds.push(value);
        }
    }
    if (!targetIds.length) return;
    if (typeof flashPushChainImpulseEffect === "function") {
        flashPushChainImpulseEffect(attackerId, targetIds);
    }
}

function handleTechAction(parts, startIndex) {
    if (!parts || startIndex == null || startIndex >= parts.length) return;
    const action = parts[startIndex];
    let k = startIndex + 1;
    if ((parts[k] || "") === "0") k++;
    const rawCode = (parts[k] || "").toUpperCase();
    const code = typeof flashResolveCanonicalTechCode === "function" ? flashResolveCanonicalTechCode(rawCode) : rawCode;
    const targetId = parseInt(parts[k + 1], 10);
    const durationSeconds = parseInt(parts[k + 2], 10);
    if (code === "ELA") {
        if (action === "A") {
            flashSetEnergyLeechTechVisual(targetId, true, durationSeconds);
        } else if (action === "D") {
            flashSetEnergyLeechTechVisual(targetId, false, 0);
        }
    } else if (code === "BRB") {
        if (action === "A") {
            flashSetBattleRepairTechVisual(targetId, true, durationSeconds);
        } else if (action === "D") {
            flashSetBattleRepairTechVisual(targetId, false, 0);
        }
    } else if (code === "SBU") {
        if (action === "A") {
            flashSetShieldBackupTechVisual(targetId, durationSeconds);
            if (Number(targetId) === Number(heroId)) {
                try {
                    if (window.AudioManager && typeof window.AudioManager.playSoundEffect === "function") {
                        window.AudioManager.playSoundEffect(37, false, false, -1, -1, true);
                    }
                } catch (_) {}
            }
        }
    }
    if (Number(targetId) === Number(heroId) && typeof renderActionDrawerItems === "function") {
        renderActionDrawerItems();
    }
}

function refreshSkillUi(force = true) {
    if (!force) return;
    try {
        if (typeof renderActionDrawerItems === "function") {
            renderActionDrawerItems();
        }
    } catch (_) {}
    try {
        if (typeof drawQuickbar === "function") {
            drawQuickbar();
        }
    } catch (_) {}
}

function isHeroInSkillPacket(sourceId, targetIds) {
    const myHeroId = Number(heroId);
    if (!Number.isFinite(myHeroId)) return false;
    if (Number(sourceId) === myHeroId) return true;
    if (!Array.isArray(targetIds)) return false;
    return targetIds.some(id => Number(id) === myHeroId);
}

function handlePacket_SD(parts, i) {
    const action = String(parts[i] || "").toUpperCase();
    const nowSeconds = Date.now() / 1e3;
    switch (action) {
      case "S":
        {
            const skillType = parseInt(parts[i + 1], 10);
            const flashStatus = parseInt(parts[i + 2], 10);
            const secondsLeft = parseInt(parts[i + 3], 10);
            if ((!skillType || isNaN(skillType)) && (!flashStatus || isNaN(flashStatus))) {
                if (typeof flashUnequipAllSkills === "function") {
                    flashUnequipAllSkills();
                }
                refreshSkillUi();
                return;
            }
            const normalizedStatus = isNaN(flashStatus) ? 0 : flashStatus;
            if (typeof flashSetOnlyEquippedSkill === "function") {
                const state = flashSetOnlyEquippedSkill(skillType, normalizedStatus, isNaN(secondsLeft) ? 0 : Math.max(0, secondsLeft));
                if (state && typeof flashNormalizeSkillRuntimeReadyState === "function") {
                    flashNormalizeSkillRuntimeReadyState(skillType);
                }
            }
            if (!isNaN(skillType) && heroId !== null) {
                if (normalizedStatus === FLASH_SKILL_ACTIVE_STATE) {
                    if (typeof flashActivateShipSkillVisualChain === "function") {
                        flashActivateShipSkillVisualChain(skillType, heroId, []);
                    }
                } else {
                    if (typeof flashDeactivateShipSkillVisualState === "function") {
                        flashDeactivateShipSkillVisualState(skillType, heroId);
                    }
                    if ((normalizedStatus === 0 || normalizedStatus === FLASH_SKILL_READY_STATE) && typeof flashRemoveShipSkillVisualState === "function") {
                        flashRemoveShipSkillVisualState(skillType, heroId);
                    }
                }
            }
            refreshSkillUi();
            return;
        }

      case "A":
      case "D":
        {
            let cursor = i + 1;
            if ((parts[cursor] || "") === "0") {
                cursor++;
            }
            const skillType = parseInt(parts[cursor], 10);
            const sourceId = parseInt(parts[cursor + 1], 10);
            const targetIds = [];
            for (let idx = cursor + 2; idx < parts.length; idx++) {
                const targetId = parseInt(parts[idx], 10);
                if (!isNaN(targetId)) {
                    targetIds.push(targetId);
                }
            }
            const abilityId = typeof flashResolveSkillAbilityId === "function" ? flashResolveSkillAbilityId(skillType) : null;
            const sourceIsHero = !isNaN(sourceId) && Number(sourceId) === Number(heroId);
            if (abilityId && sourceIsHero && typeof flashGetOrCreateSkillRuntimeState === "function") {
                const state = flashGetOrCreateSkillRuntimeState(abilityId);
                state.lastSourceId = sourceId;
                state.targetIds = targetIds;
                state.equipped = true;
                if (window.heroSkillAvailability && abilityId) {
                    window.heroSkillAvailability[abilityId] = true;
                }
                if (action === "A") {
                    state.active = true;
                    state.flashStatus = FLASH_SKILL_ACTIVE_STATE;
                    state.available = true;
                    const activeSeconds = Math.max(Number(state.secondsLeft) || 0, 0);
                    state.activeUntil = activeSeconds > 0 ? nowSeconds + activeSeconds : 0;
                } else {
                    state.active = false;
                    state.activeUntil = 0;
                    if (Math.max(Number(state.cooldownRemaining) || 0, 0) > 0 || (typeof getCooldownInfo === "function" && getCooldownInfo(flashResolveSkillCooldownCode(abilityId)))) {
                        state.flashStatus = FLASH_SKILL_COOLING_STATE;
                        state.available = false;
                    } else {
                        state.flashStatus = FLASH_SKILL_READY_STATE;
                        state.available = true;
                        state.secondsLeft = 0;
                    }
                }
                if (typeof flashNormalizeSkillRuntimeReadyState === "function") {
                    flashNormalizeSkillRuntimeReadyState(abilityId);
                }
            }
            if (action === "A") {
                if (typeof flashActivateShipSkillVisualChain === "function") {
                    flashActivateShipSkillVisualChain(skillType, sourceId, targetIds);
                }
            } else if (typeof flashDeactivateShipSkillVisualChain === "function") {
                flashDeactivateShipSkillVisualChain(skillType, sourceId, targetIds);
            }
            flashLogShipSkillActionMessage(action, skillType, sourceId, targetIds);
            refreshSkillUi(isHeroInSkillPacket(sourceId, targetIds));
            return;
        }

      case "R":
        {
            const skillType = parseInt(parts[i + 1], 10);
            const sourceId = parseInt(parts[i + 2], 10);
            const abilityId = typeof flashResolveSkillAbilityId === "function" ? flashResolveSkillAbilityId(skillType) : null;
            if (abilityId && !isNaN(sourceId) && Number(sourceId) === Number(heroId) && typeof flashGetOrCreateSkillRuntimeState === "function") {
                const state = flashGetOrCreateSkillRuntimeState(abilityId);
                state.effectRemoved = true;
                if (!state.active) {
                    if (Math.max(Number(state.cooldownRemaining) || 0, 0) > 0) {
                        state.flashStatus = FLASH_SKILL_COOLING_STATE;
                        state.available = false;
                    } else if (state.equipped !== false) {
                        state.flashStatus = FLASH_SKILL_READY_STATE;
                        state.available = true;
                        state.secondsLeft = 0;
                    }
                }
                if (typeof flashNormalizeSkillRuntimeReadyState === "function") {
                    flashNormalizeSkillRuntimeReadyState(abilityId);
                }
            }
            if (!isNaN(skillType) && !isNaN(sourceId) && typeof flashRemoveShipSkillVisualState === "function") {
                flashRemoveShipSkillVisualState(skillType, sourceId);
            }
            refreshSkillUi(!isNaN(sourceId) && Number(sourceId) === Number(heroId));
            return;
        }

      default:
        return;
    }
}

function handlePacket_TX(parts, i) {
    const action = parts[i];
    if (action === "S") {
        const rawValues = [];
        for (let idx = i + 1; idx < parts.length; idx++) {
            const parsed = parseInt(parts[idx], 10);
            if (!isNaN(parsed)) {
                rawValues.push(parsed);
            }
        }
        const looksLikeStatusTriplets = rawValues.length >= 9 && rawValues.length % 3 === 0 && rawValues.every((value, idx) => idx % 3 !== 0 || (value >= 0 && value <= 4));
        const nowSeconds = Date.now() / 1e3;
        if (typeof window.heroTechCooldownMeta === "undefined" || !window.heroTechCooldownMeta) {
            window.heroTechCooldownMeta = Object.create(null);
        }
        if (typeof window.heroTechRuntimeState === "undefined" || !window.heroTechRuntimeState) {
            window.heroTechRuntimeState = Object.create(null);
        }
        if (looksLikeStatusTriplets) {
            let techId = 1;
            for (let idx = i + 1; idx + 2 < parts.length; idx += 3, techId++) {
                const rawStatus = parseInt(parts[idx], 10);
                const amount = parseInt(parts[idx + 1], 10);
                const secondsLeft = parseInt(parts[idx + 2], 10);
                const code = typeof TECH_ID_TO_CODE !== "undefined" ? TECH_ID_TO_CODE[techId] : null;
                if (!code) continue;
                const normalizedCode = String(code).toUpperCase();
                const state = window.heroTechRuntimeState[normalizedCode] || (window.heroTechRuntimeState[normalizedCode] = {});
                let flashStatus = rawStatus === 4 ? 0 : (isNaN(rawStatus) ? 0 : rawStatus);
                const seconds = isNaN(secondsLeft) ? 0 : Math.max(0, secondsLeft);
                const normalizedAmount = isNaN(amount) ? 0 : Math.max(0, amount);
                if (flashStatus === 3 && (normalizedAmount > 0 || (typeof flashTechRuntimeHasImplicitOwnership === "function" && flashTechRuntimeHasImplicitOwnership(normalizedCode))) && seconds <= 0) {
                    const cooldownMeta = window.heroTechCooldownMeta[normalizedCode] || null;
                    const cooldownRemaining = cooldownMeta && typeof cooldownMeta.endTime === "number" ? cooldownMeta.endTime - nowSeconds : 0;
                    if (cooldownRemaining <= 0) {
                        flashStatus = 1;
                    }
                }
                state.flashStatus = flashStatus;
                state.amount = normalizedAmount;
                state.secondsLeft = seconds;
                state.available = flashStatus === 1 || flashStatus === 2;
                state.active = flashStatus === 2;
                if (flashStatus === 2) {
                    state.activeUntil = seconds > 0 ? nowSeconds + seconds : 0;
                } else {
                    state.activeUntil = 0;
                }
                if (typeof flashNormalizeTechRuntimeReadyState === "function") {
                    flashNormalizeTechRuntimeReadyState(normalizedCode);
                }
            }
        } else {
            for (let idx = i + 1; idx < parts.length; idx++) {
                const val = parseInt(parts[idx], 10);
                if (!isNaN(val)) {
                    const techId = idx - i;
                    const code = typeof TECH_ID_TO_CODE !== "undefined" ? TECH_ID_TO_CODE[techId] : null;
                    if (code) {
                        const normalizedCode = String(code).toUpperCase();
                        const prev = window.heroTechCooldownMeta[normalizedCode] || null;
                        if (val > 0) {
                            const total = Math.max(prev && prev.duration ? prev.duration : 0, val);
                            window.heroTechCooldownMeta[normalizedCode] = {
                                endTime: nowSeconds + val,
                                duration: total || val
                            };
                            const state = window.heroTechRuntimeState[normalizedCode] || (window.heroTechRuntimeState[normalizedCode] = {});
                            state.available = true;
                            if (typeof flashSyncTechRuntimeCooldownState === "function") {
                                flashSyncTechRuntimeCooldownState(normalizedCode, val, total || val);
                            } else {
                                state.cooling = true;
                                state.cooldownRemaining = val;
                                state.cooldownTotal = total || val;
                            }
                        } else {
                            delete window.heroTechCooldownMeta[normalizedCode];
                            if (typeof flashClearTechRuntimeCooldownState === "function") {
                                flashClearTechRuntimeCooldownState(normalizedCode);
                            } else if (window.heroTechRuntimeState[normalizedCode]) {
                                window.heroTechRuntimeState[normalizedCode].cooling = false;
                                window.heroTechRuntimeState[normalizedCode].cooldownRemaining = 0;
                            }
                            if (typeof flashNormalizeTechRuntimeReadyState === "function") {
                                flashNormalizeTechRuntimeReadyState(normalizedCode);
                            }
                        }
                    }
                }
            }
        }
        if (typeof renderActionDrawerItems === "function") {
            renderActionDrawerItems();
        }
        return;
    }
    if (action === "ECI" || action === "CHAIN_BOLT") {
        handleTechChainImpulseAction(parts, i);
        return;
    }
    if (action === "A" || action === "D") {
        handleTechAction(parts, i);
    }
}

function handlePacket_7(parts, i) {
    let settingKey = parts[i];
    let settingValue = parts[i + 1];
    if (settingKey && settingValue === undefined && String(settingKey).indexOf(",") !== -1) {
        const commaParts = String(settingKey).split(",");
        settingKey = commaParts.shift();
        settingValue = commaParts.join(",");
    }
    if (settingKey && settingValue !== undefined) {
        if (shouldIgnoreConflictingStartupAudioSetting(settingKey, settingValue)) {
            return;
        }
        updateLocalSetting(settingKey, settingValue);
        updateFlashSettingsChunkFromIndividualSetting(settingKey, settingValue);
        const keyUpper = String(settingKey).toUpperCase();
        if (keyUpper === "PLAY_MUSIC" || keyUpper === "PLAY_SFX") {
            __audioSettingsPacketSeen[keyUpper] = true;
            if (__audioSettingsPacketSeen.PLAY_MUSIC && __audioSettingsPacketSeen.PLAY_SFX) {
                markServerAudioSettingsReady("7|" + keyUpper);
            }
        }
    }
}

function handlePacket_QST(parts, i) {
    const sub = String(parts[i] || "").toUpperCase();
    if (sub === "UPD" || sub === "UPDATE" || sub === "") {
        if (typeof window.scheduleQuestRefreshFromServer === "function") {
            window.scheduleQuestRefreshFromServer();
        }
        return;
    }

    console.warn("[QUEST] Unknown QST sub-opcode:", sub, "parts=", parts);
}

function handlePacket_QuestFM(parts, i) {
    if (parts.length < i + 1) return;
    const sub = parts[i];
    switch (sub) {
      case "ini":
        {
            const questData = parts[i + 1];
            const category = parts[i + 2] || "";
            if (!questData) {
                console.warn("[QUEST] ini packet without data.");
                return;
            }
            initQuestFromServer(questData, category);
            break;
        }

      case "upd":
        {
            const questId = parseInt(parts[i + 1] || "0", 10);
            const mode = parts[i + 2];
            if (mode === "i") {
                const condId = parseInt(parts[i + 3] || "0", 10);
                const current = parseInt(parts[i + 4] || "0", 10);
                const visibility = parseInt(parts[i + 5] || "0", 10);
                const runstate = !!parseInt(parts[i + 6] || "0", 10);
                updateQuestCondition(questId, condId, current, visibility, runstate);
            }
            break;
        }

      case "p":
        {
            const questId = parseInt(parts[i + 1] || "0", 10);
            privilegeQuestById(questId);
            break;
        }

      case "a":
        {
            const questId = parseInt(parts[i + 1] || "0", 10);
            const param2 = parseInt(parts[i + 2] || "0", 10);
            setQuestAccomplished(questId, param2);
            break;
        }

      case "c":
        {
            const questId = parseInt(parts[i + 1] || "0", 10);
            setQuestCancelled(questId);
            break;
        }

      case "f":
        {
            const questId = parseInt(parts[i + 1] || "0", 10);
            setQuestFailed(questId);
            break;
        }

      default:
        {
            console.warn("[QUEST] Unknown QUESTFM sub-opcode:", sub, "parts=", parts);
            break;
        }
    }
}

window.sendSellOre = function(oreType, amount) {
    const oreIds = {
        prometium: 1,
        endurium: 2,
        terbium: 3,
        xenomit: 4,
        prometid: 11,
        duranium: 12,
        promerium: 13,
        seprom: 9
    };
    const hasTradeAccess = typeof window.isTradeWindowAccessGranted === "function" ? !!window.isTradeWindowAccessGranted() : !!(typeof inTradeZone !== "undefined" && inTradeZone);
    if (!hasTradeAccess) {
        if (typeof addServerInfoLogMessage === "function") {
            addServerInfoLogMessage("You must be inside the trade zone (station) to sell ores.");
        }
        return;
    }
    const id = oreIds[String(oreType || "").toLowerCase()];
    const qty = Math.max(0, parseInt(amount, 10) || 0);
    if (!id || qty < 1) return;
    if (typeof sendRaw === "function") {
        sendRaw(`T|${id}|${qty}`);
    }
};
