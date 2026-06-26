const entities = {};

const loggedEntities = new Set;

const loggedObjectTypes = new Set;

const activeTemporaryStatusEntityIds = new Set;

const activeShieldEffectEntityIds = new Set;

const portals = {};

const laserBeams = [];

const sabShots = [];

const rocketAttacks = [];

const labPrices = {};

const damageBubbles = [];

const DAMAGE_BUBBLE_STACK_SLOT_COUNT = 5;

const DAMAGE_BUBBLE_STACK_STEP_PX = 18;

const DAMAGE_BUBBLE_STACK_MAX_OFFSET_PX = DAMAGE_BUBBLE_STACK_STEP_PX * (DAMAGE_BUBBLE_STACK_SLOT_COUNT - 1);

const DAMAGE_BUBBLE_MAX_ACTIVE = 160;

let entityVisualLifeSeq = 1;
const removedEntitySnapshots = new Map();
const REMOVED_ENTITY_SNAPSHOT_TTL_MS = 3500;
const REMOVED_ENTITY_SNAPSHOT_MAX = 512;
const REMOVED_ENTITY_SNAPSHOT_PRUNE_INTERVAL_MS = 1000;
let removedEntitySnapshotsLastPruneAt = 0;

function pruneRemovedEntitySnapshots(now = performance.now(), force = false) {
    if (!(removedEntitySnapshots instanceof Map) || removedEntitySnapshots.size === 0) return;
    if (!force && now - removedEntitySnapshotsLastPruneAt < REMOVED_ENTITY_SNAPSHOT_PRUNE_INTERVAL_MS && removedEntitySnapshots.size <= REMOVED_ENTITY_SNAPSHOT_MAX) {
        return;
    }
    removedEntitySnapshotsLastPruneAt = now;
    for (const [id, snapshot] of removedEntitySnapshots.entries()) {
        if (!snapshot || snapshot.expiresAt && snapshot.expiresAt < now) {
            removedEntitySnapshots.delete(id);
        }
    }
    if (removedEntitySnapshots.size > REMOVED_ENTITY_SNAPSHOT_MAX) {
        let overflow = removedEntitySnapshots.size - REMOVED_ENTITY_SNAPSHOT_MAX;
        for (const id of removedEntitySnapshots.keys()) {
            removedEntitySnapshots.delete(id);
            overflow -= 1;
            if (overflow <= 0) break;
        }
    }
}

function clearRemovedEntitySnapshots() {
    removedEntitySnapshots.clear();
    removedEntitySnapshotsLastPruneAt = 0;
}

function refreshEntityTemporaryStatusRegistration(ent) {
    if (!ent || ent.id == null) return;
    if (ent.empImmunityUntil || ent.targetFadeUntil) {
        activeTemporaryStatusEntityIds.add(ent.id);
    } else {
        activeTemporaryStatusEntityIds.delete(ent.id);
    }
}

function refreshEntityShieldEffectRegistration(ent) {
    if (!ent || ent.id == null) return;
    if ((ent.ishActive && ent.ishUntil) || (ent.invincible && ent.invUntil)) {
        activeShieldEffectEntityIds.add(ent.id);
    } else {
        activeShieldEffectEntityIds.delete(ent.id);
    }
}

function unregisterEntityRuntimeActiveState(entityId) {
    if (entityId == null) return;
    activeTemporaryStatusEntityIds.delete(entityId);
    activeShieldEffectEntityIds.delete(entityId);
}

function clearEntityRuntimeActiveLists() {
    activeTemporaryStatusEntityIds.clear();
    activeShieldEffectEntityIds.clear();
}

if (typeof window !== "undefined") {
    window.clearRemovedEntitySnapshots = clearRemovedEntitySnapshots;
    window.pruneRemovedEntitySnapshots = pruneRemovedEntitySnapshots;
}

function nextEntityVisualLifeId() {
    return entityVisualLifeSeq++;
}

function ensureEntityVisualLife(ent) {
    if (!ent) return null;
    if (!Number.isFinite(ent.visualLifeId) || ent.visualLifeId <= 0) {
        ent.visualLifeId = nextEntityVisualLifeId();
        ent.visualLifeCreatedAt = performance.now();
    }
    return ent.visualLifeId;
}

function resetEntityVisualLife(ent) {
    if (!ent) return null;
    ent.visualLifeId = nextEntityVisualLifeId();
    ent.visualLifeCreatedAt = performance.now();
    ent.destroyedVisualAt = 0;
    return ent.visualLifeId;
}

function getEntityVisualLifeId(id) {
    if (heroId !== null && id === heroId) return -1;
    const ent = entities[id];
    return ent ? ensureEntityVisualLife(ent) : null;
}

function getDamageBubbleDurationMs() {
    const duration = typeof DAMAGE_BUBBLE_DURATION !== "undefined" ? Number(DAMAGE_BUBBLE_DURATION) : 1500;
    return Number.isFinite(duration) && duration > 0 ? duration : 1500;
}

function getDamageBubbleStackIndex(entityId, now) {
    if (entityId == null) return 0;
    const duration = getDamageBubbleDurationMs();
    const usedSlots = new Set();
    let activeCount = 0;
    for (let i = damageBubbles.length - 1; i >= 0; i--) {
        const bubble = damageBubbles[i];
        if (!bubble || bubble.entityId !== entityId) continue;
        const age = now - bubble.createdAt;
        if (age < 0 || age > duration) continue;
        activeCount++;
        let slot = Number.isFinite(bubble.stackIndex) ? Math.floor(bubble.stackIndex) : NaN;
        if (!Number.isFinite(slot)) {
            const offset = Number.isFinite(bubble.stackOffsetY) ? bubble.stackOffsetY : 0;
            slot = Math.round(offset / DAMAGE_BUBBLE_STACK_STEP_PX);
        }
        usedSlots.add(Math.max(0, slot) % DAMAGE_BUBBLE_STACK_SLOT_COUNT);
    }
    for (let slot = 0; slot < DAMAGE_BUBBLE_STACK_SLOT_COUNT; slot++) {
        if (!usedSlots.has(slot)) return slot;
    }
    return activeCount % DAMAGE_BUBBLE_STACK_SLOT_COUNT;
}

function rememberRemovedEntitySnapshot(ent) {
    if (!ent || ent.id == null) return null;
    const now = performance.now();
    const pose = getEntityInterpolatedPosition(ent);
    pruneRemovedEntitySnapshots(now);
    const snapshot = {
        id: ent.id,
        x: Number.isFinite(pose.x) ? pose.x : Number.isFinite(ent.x) ? ent.x : 0,
        y: Number.isFinite(pose.y) ? pose.y : Number.isFinite(ent.y) ? ent.y : 0,
        kind: ent.kind || "unknown",
        shipId: ent.shipId ?? ent.type ?? null,
        type: ent.type ?? null,
        angle: Number.isFinite(ent.angle) ? ent.angle : 0,
        visualLifeId: ensureEntityVisualLife(ent),
        createdAt: now,
        expiresAt: now + REMOVED_ENTITY_SNAPSHOT_TTL_MS
    };
    removedEntitySnapshots.set(ent.id, snapshot);
    if (removedEntitySnapshots.size > REMOVED_ENTITY_SNAPSHOT_MAX) {
        pruneRemovedEntitySnapshots(now, true);
    }
    ent.destroyedVisualAt = now;
    return snapshot;
}

function getRemovedEntitySnapshot(id) {
    const snapshot = removedEntitySnapshots.get(id);
    if (!snapshot) return null;
    const now = performance.now();
    if (snapshot.expiresAt && snapshot.expiresAt < now) {
        removedEntitySnapshots.delete(id);
        return null;
    }
    return snapshot;
}

function captureEntityEffectSnapshot(entityId) {
    if (entityId == null) return null;
    if (heroId !== null && entityId === heroId) {
        return {
            id: heroId,
            x: shipX,
            y: shipY,
            kind: "player",
            shipId: heroShipId,
            type: heroShipId,
            angle: heroAngle,
            visualLifeId: -1
        };
    }
    const ent = entities[entityId];
    if (ent) {
        const pose = getEntityInterpolatedPosition(ent);
        return {
            id: ent.id,
            x: Number.isFinite(pose.x) ? pose.x : Number.isFinite(ent.x) ? ent.x : 0,
            y: Number.isFinite(pose.y) ? pose.y : Number.isFinite(ent.y) ? ent.y : 0,
            kind: ent.kind || "unknown",
            shipId: ent.shipId ?? ent.type ?? null,
            type: ent.type ?? null,
            angle: Number.isFinite(ent.angle) ? ent.angle : 0,
            visualLifeId: ensureEntityVisualLife(ent)
        };
    }
    return getRemovedEntitySnapshot(entityId);
}

function resolveLiveEntitySnapshotForVisual(entityId, visualLifeId) {
    if (entityId == null) return null;
    if (heroId !== null && entityId === heroId) {
        return captureEntityEffectSnapshot(entityId);
    }
    const ent = entities[entityId];
    if (!ent) return null;
    const liveVisualLifeId = ensureEntityVisualLife(ent);
    if (visualLifeId != null && Number.isFinite(Number(visualLifeId)) && liveVisualLifeId !== Number(visualLifeId)) {
        return null;
    }
    return captureEntityEffectSnapshot(entityId);
}

function pushDamageBubble(entityId, delta, isHealHint = false, colorId = null, showPlus = null) {
    if (entityId == null) return;
    const signed = parseInt(delta, 10);
    if (isNaN(signed) || signed === 0) return;
    const now = performance.now();
    const stackIndex = getDamageBubbleStackIndex(entityId, now);
    const stackOffsetY = Math.min(DAMAGE_BUBBLE_STACK_MAX_OFFSET_PX, stackIndex * DAMAGE_BUBBLE_STACK_STEP_PX);
    const isHeal = isHealHint || signed > 0;
    const cid = colorId !== null && colorId !== undefined ? colorId : isHeal ? 2 : 0;
    const plus = showPlus !== null && showPlus !== undefined ? showPlus : false;
    damageBubbles.push({
        entityId: entityId,
        value: Math.abs(signed),
        isHeal: isHeal,
        colorId: cid,
        showPlus: plus,
        stackIndex: stackIndex,
        stackOffsetY: stackOffsetY,
        createdAt: now
    });
    trimDamageBubbles();
}

function pushMissBubble(entityId, colorId = 0) {
    if (entityId == null) return;
    const now = performance.now();
    const stackIndex = getDamageBubbleStackIndex(entityId, now);
    const stackOffsetY = Math.min(DAMAGE_BUBBLE_STACK_MAX_OFFSET_PX, stackIndex * DAMAGE_BUBBLE_STACK_STEP_PX);
    const cid = colorId !== null && colorId !== undefined && !isNaN(parseInt(colorId, 10)) ? parseInt(colorId, 10) : 0;
    damageBubbles.push({
        entityId: entityId,
        value: 0,
        text: "MISS",
        isHeal: false,
        colorId: cid,
        showPlus: false,
        stackIndex: stackIndex,
        stackOffsetY: stackOffsetY,
        createdAt: now
    });
    trimDamageBubbles();
}

function trimDamageBubbles(maxActive = DAMAGE_BUBBLE_MAX_ACTIVE) {
    if (!Array.isArray(damageBubbles)) return;
    const max = Math.max(0, Number(maxActive) || DAMAGE_BUBBLE_MAX_ACTIVE);
    if (damageBubbles.length > max) {
        damageBubbles.splice(0, damageBubbles.length - max);
    }
}

const explosions = [];

const shieldBursts = [];

const shieldTwinkles = [];

const hullDamageEffects = [];

const rocketDamageEffects = [];

const rocketSmokeParticles = [];

const rocketLauncherMissDisplays = [];

const portalJumpEffects = [];

const smartbombEffects = [];

const empEffects = [];

let selectedTargetId = null;

let pendingTargetSelectionId = null;
let pendingTargetSelectionStartedAt = 0;
const TARGET_SELECTION_PENDING_TIMEOUT_MS = 15000;
let pendingTargetLaserAttackIntentId = null;

function getTargetSelectionNowMs() {
    return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
}

function normalizeTargetSelectionId(targetId) {
    const id = typeof targetId === "number" ? targetId : parseInt(targetId, 10);
    return Number.isFinite(id) ? id : null;
}

function clearPendingTargetLaserAttackIntent(targetId = null) {
    if (targetId == null || pendingTargetLaserAttackIntentId == null || Number(pendingTargetLaserAttackIntentId) === Number(targetId)) {
        pendingTargetLaserAttackIntentId = null;
    }
}

function queuePendingTargetLaserAttackIntent(targetId) {
    const id = normalizeTargetSelectionId(targetId);
    if (id == null) return false;
    pendingTargetLaserAttackIntentId = id;
    return true;
}

function consumePendingTargetLaserAttackIntent(targetId) {
    const id = normalizeTargetSelectionId(targetId);
    if (id == null || pendingTargetLaserAttackIntentId == null) return false;
    if (Number(pendingTargetLaserAttackIntentId) !== Number(id)) {
        pendingTargetLaserAttackIntentId = null;
        return false;
    }
    pendingTargetLaserAttackIntentId = null;
    return true;
}

function clearPendingTargetSelection(targetId = null) {
    if (targetId == null || pendingTargetSelectionId == null || Number(pendingTargetSelectionId) === Number(targetId)) {
        pendingTargetSelectionId = null;
        pendingTargetSelectionStartedAt = 0;
        clearPendingTargetLaserAttackIntent(targetId);
    }
}

function isTargetSelectionPending(targetId = null) {
    if (pendingTargetSelectionId == null) return false;
    const now = getTargetSelectionNowMs();
    if (pendingTargetSelectionStartedAt > 0 && now - pendingTargetSelectionStartedAt > TARGET_SELECTION_PENDING_TIMEOUT_MS) {
        clearPendingTargetSelection();
        return false;
    }
    return targetId == null || Number(pendingTargetSelectionId) === Number(targetId);
}

function requestTargetSelectionLikeFlash(targetId) {
    const id = normalizeTargetSelectionId(targetId);
    if (id == null) return false;
    if (pendingTargetLaserAttackIntentId != null && Number(pendingTargetLaserAttackIntentId) !== Number(id)) {
        queuePendingTargetLaserAttackIntent(id);
    }
    const alreadySelected = selectedTargetId != null && Number(selectedTargetId) === Number(id);
    pendingTargetSelectionId = id;
    pendingTargetSelectionStartedAt = getTargetSelectionNowMs();
    if (!alreadySelected) selectedTargetId = null;
    resetPendingRangeResume(id);
    sendSelectShip(id);
    return true;
}

function confirmTargetSelectionFromServer(targetId) {
    const id = normalizeTargetSelectionId(targetId);
    if (id == null) return false;
    if (pendingTargetSelectionId != null) {
        if (!isTargetSelectionPending(id)) {
            clearPendingTargetLaserAttackIntent(id);
            return false;
        }
        if (pendingTargetSelectionId != null && Number(pendingTargetSelectionId) !== Number(id)) {
            clearPendingTargetLaserAttackIntent();
            return false;
        }
    }
    const shouldSendPendingLaserAttack = consumePendingTargetLaserAttackIntent(id);
    selectedTargetId = id;
    clearPendingTargetSelection(id);
    if (shouldSendPendingLaserAttack && typeof sendLaserAttack === "function") {
        sendLaserAttack(id);
    }
    return true;
}

let currentLaserTargetId = null;

let attackIntentTargetId = null;

let confirmedAttackTargetId = null;

let pendingAttackAckTargetId = null;

let pendingAttackAckStartMs = 0;

let pendingRangeResumeTargetId = null;

let pendingRangeResumeMessage = false;

let rangeProtectedTargetId = null;

let isCtrlDown = false;

let ctrlHandledThisPress = false;

// Flash parity: Flash keeps a keyDown[] table and ignores repeated KEY_DOWN
// events until the matching KEY_UP is received. Browser keydown auto-repeat
// must therefore not retrigger quickbar/gameplay actions while the key is held.
const flashHeldGameplayKeys = new Set();

function getFlashGameplayKeyToken(event) {
    if (!event) return null;

    if (event.key === "Control") return "Control";
    if (event.code === "Space" || event.key === " ") return "Space";

    if (typeof keyBindings !== "undefined" && keyBindings && keyBindings[event.code]) {
        return event.code;
    }

    switch (event.code) {
        case "KeyJ":
        case "KeyC":
        case "KeyB":
        case "KeyF":
        case "KeyN":
        case "Equal":
        case "Minus":
        case "NumpadAdd":
        case "NumpadSubtract":
            return event.code;
        default:
            return null;
    }
}

function shouldIgnoreRepeatedFlashKeyDown(event) {
    const token = getFlashGameplayKeyToken(event);
    if (!token) return false;

    if (flashHeldGameplayKeys.has(token) || event.repeat) {
        if (typeof event.preventDefault === "function") event.preventDefault();
        return true;
    }

    flashHeldGameplayKeys.add(token);
    return false;
}

function releaseFlashGameplayKey(event) {
    const token = getFlashGameplayKeyToken(event);
    if (token) flashHeldGameplayKeys.delete(token);
}

function resetFlashGameplayKeys() {
    flashHeldGameplayKeys.clear();
    isCtrlDown = false;
    ctrlHandledThisPress = false;
}

let moveTargetX = null;

let moveTargetY = null;

let moveTargetFromMinimap = false;

let isMouseDownOnMap = false;

let heroMoveTimerId = null;

const FLASH_HERO_MOVE_REPEAT_MS = 33;

const FLASH_DOUBLE_CLICK_ATTACK_MS = 500;

let lastFlashDoubleClickMouseDownMs = 0;

let lastMouseScreenX = 0;

let lastMouseScreenY = 0;

const flashMoveWorldScratch = {
    x: 0,
    y: 0
};

const flashMovePoiScratch = {
    x: 0,
    y: 0
};

const flashMoveFromScratch = {
    x: 0,
    y: 0
};

const flashMoveToScratch = {
    x: 0,
    y: 0
};

const flashMoveSendTargetScratch = {
    x: 0,
    y: 0
};

const flashMoveLiveTargetScratch = {
    x: 0,
    y: 0
};

const flashMoveTargetCache = {
    valid: false,
    screenX: 0,
    screenY: 0,
    shipX: 0,
    shipY: 0,
    cameraX: 0,
    cameraY: 0,
    canvasWidth: 0,
    canvasHeight: 0,
    viewportScale: 0,
    moveRadiusSq: 0,
    mapMinX: 0,
    mapMinY: 0,
    mapWidth: 0,
    mapHeight: 0,
    poiRevision: 0,
    hasTarget: false,
    x: 0,
    y: 0
};

const hoverEntityScanCache = {
    valid: false,
    screenX: 0,
    screenY: 0,
    cameraX: 0,
    cameraY: 0,
    canvasWidth: 0,
    canvasHeight: 0,
    viewportScale: 0,
    entityId: null,
    entity: null,
    entityX: 0,
    entityY: 0
};

const COLLECTABLE_Y_OFFSET = 120;

let pendingCollectBoxId = null;

let collectDelayTimerId = null;

let collectDelayBoxId = null;

const collectedBoxRequestIds = new Set;

function normalizeCollectRequestId(boxId) {
    if (boxId == null) return null;
    return String(boxId);
}

function hasCollectRequestPending(boxId) {
    const key = normalizeCollectRequestId(boxId);
    return key !== null && collectedBoxRequestIds.has(key);
}

function clearCollectRequest(boxId) {
    const key = normalizeCollectRequestId(boxId);
    if (key === null) return;
    collectedBoxRequestIds.delete(key);
}

function clearAllCollectRequests() {
    collectedBoxRequestIds.clear();
}

function markCollectRequestPending(boxId) {
    const key = normalizeCollectRequestId(boxId);
    if (key === null || collectedBoxRequestIds.has(key)) return false;
    collectedBoxRequestIds.add(key);
    return true;
}

function computeCollectApproach(box) {
    if (!box) return null;
    return {
        x: box.x,
        y: box.y - COLLECTABLE_Y_OFFSET
    };
}

function clearPendingCollectState() {
    const canceledBoxId = pendingCollectBoxId;
    pendingCollectBoxId = null;
    cancelCollectDelay();
    if (canceledBoxId != null) {
        clearCollectRequest(canceledBoxId);
    }
}

function cancelCollectDelay() {
    if (collectDelayTimerId !== null) {
        clearTimeout(collectDelayTimerId);
        collectDelayTimerId = null;
    }
    collectDelayBoxId = null;
    if (typeof stopHeroCollectorBeam === "function") {
        stopHeroCollectorBeam();
    }
}

function isCollectDelayActiveFor(boxId) {
    return collectDelayTimerId !== null && collectDelayBoxId === boxId;
}

const FLASH_EXACT_BOX_COLLECT_DURATION_MS = 1e3;

function shouldCollectLikeFlash(box) {
    if (!box || box.kind !== "box") return false;
    return [ "cargoFree", "cargoNotFree", "bonusBox" ].includes(box.category);
}

function shouldUseCollectDelay(box) {
    if (!box || box.kind !== "box") return false;
    if (shouldCollectLikeFlash(box)) return false;
    return [ "bootyBox", "bootyKey", "ore" ].includes(box.category);
}

function playCollectSoundAt(boxX, boxY, soundId = 3) {
    try {
        const x = Number.isFinite(boxX) ? boxX : -1;
        const y = Number.isFinite(boxY) ? boxY : -1;
        if (window.AudioManager && typeof window.AudioManager.playSoundEffect === "function") {
            window.AudioManager.playSoundEffect(soundId, false, false, x, y, true);
        }
    } catch (_) {}
}

function playFlashExactCollectFeedback(boxId, durationMs = FLASH_EXACT_BOX_COLLECT_DURATION_MS) {
    if (boxId == null) return;
    const box = typeof entities !== "undefined" ? entities[boxId] : null;
    if (!box) return;
    playCollectSoundAt(box.x, box.y, 3);
    if (typeof startCollectableBoxBeam === "function" && Number.isFinite(box.x) && Number.isFinite(box.y)) {
        startCollectableBoxBeam(box.x, box.y, durationMs);
    }
}

function startCollectDelay(boxId, durationMs = BOX_COLLECT_DELAY_MS) {
    if (boxId == null) return;
    const isNewBeam = collectDelayBoxId !== boxId;
    if (collectDelayBoxId !== boxId) {
        cancelCollectDelay();
    }
    collectDelayBoxId = boxId;
    if (isNewBeam) {
        try {
            const box = typeof entities !== "undefined" ? entities[boxId] : null;
            const bx = box && box.x != null ? box.x : -1;
            const by = box && box.y != null ? box.y : -1;
            playCollectSoundAt(bx, by, 3);
        } catch (_) {}
    }
    if (typeof startHeroCollectorBeam === "function") {
        startHeroCollectorBeam(durationMs);
    }
    collectDelayTimerId = setTimeout(() => {
        collectDelayTimerId = null;
        collectDelayBoxId = null;
        const collectRequested = typeof hasCollectRequestPending === "function" && hasCollectRequestPending(boxId);
        if (pendingCollectBoxId === boxId && !collectRequested) {
            sendCollectBox(boxId, {
                suppressStartBeam: true
            });
        }
    }, durationMs);
}

function ensureEntity(id) {
    if (!entities[id]) {
        entities[id] = {
            id: id,
            kind: "unknown",
            type: 0,
            category: "unknown",
            shipId: null,
            x: 0,
            y: 0,
            angle: 0,
            expansionTypeId: 0,
            laserSalvoIndex: 0,
            name: "",
            gameTitleKey: "",
            clanTag: "",
            factionId: 0,
            rankId: 0,
            galaxyGatesFinished: 0,
            warnIconOnMap: false,
            droneDisplayCounts: null,
            hp: null,
            maxHp: null,
            shield: null,
            maxShield: null,
            targetStatsHydrated: false,
            targetStatsHydratedAt: 0,
            cargo: null,
            maxCargo: null,
            speed: null,
            visualLifeId: nextEntityVisualLifeId(),
            visualLifeCreatedAt: performance.now(),
            destroyedVisualAt: 0,
            targetFaded: false,
            targetFadeUntil: 0,
            ishActive: false,
            ishUntil: 0,
            ishSince: 0,
            invincible: false,
            invUntil: 0,
            invSince: 0,
            invisible: false,
            empImmunityUntil: 0,
            shieldDamageCount: 0,
            lockOwnerId: null,
            lastClaimUpdate: 0,
            targetRingGray: false,
            drones: [],
            attackTargetId: null,
            attackLockUntil: 0,
            attackLockX: null,
            attackLockY: null,
            interp: {
                startX: 0,
                startY: 0,
                endX: 0,
                endY: 0,
                startTime: 0,
                duration: 0
            }
        };
    } else {
        const ent = entities[id];
        if (!("shipId" in ent)) ent.shipId = null;
        if (!("expansionTypeId" in ent)) ent.expansionTypeId = 0;
        if (!("laserSalvoIndex" in ent)) ent.laserSalvoIndex = 0;
        if (!("gameTitleKey" in ent)) ent.gameTitleKey = "";
        if (!("maxHp" in ent)) ent.maxHp = null;
        if (!("maxShield" in ent)) ent.maxShield = null;
        if (!("targetStatsHydrated" in ent)) ent.targetStatsHydrated = ent.hp != null && ent.maxHp != null && ent.shield != null && ent.maxShield != null;
        if (!("targetStatsHydratedAt" in ent)) ent.targetStatsHydratedAt = 0;
        if (!("cargo" in ent)) ent.cargo = null;
        if (!("maxCargo" in ent)) ent.maxCargo = null;
        if (!("speed" in ent)) ent.speed = null;
        if (!("visualLifeId" in ent)) ent.visualLifeId = nextEntityVisualLifeId();
        if (!("visualLifeCreatedAt" in ent)) ent.visualLifeCreatedAt = performance.now();
        if (!("destroyedVisualAt" in ent)) ent.destroyedVisualAt = 0;
        if (!("targetFaded" in ent)) ent.targetFaded = false;
        if (!("targetFadeUntil" in ent)) ent.targetFadeUntil = 0;
        if (!("invisible" in ent)) ent.invisible = false;
        if (!("empImmunityUntil" in ent)) ent.empImmunityUntil = 0;
        if (!("lockOwnerId" in ent)) ent.lockOwnerId = null;
        if (!("lastClaimUpdate" in ent)) ent.lastClaimUpdate = 0;
        if (!("targetRingGray" in ent)) ent.targetRingGray = false;
        if (!("rankId" in ent)) ent.rankId = 0;
        if (!("galaxyGatesFinished" in ent)) ent.galaxyGatesFinished = 0;
        if (!("warnIconOnMap" in ent)) ent.warnIconOnMap = false;
        if (!("droneDisplayCounts" in ent)) ent.droneDisplayCounts = null;
        if (!("attackTargetId" in ent)) ent.attackTargetId = null;
        if (!("attackLockUntil" in ent)) ent.attackLockUntil = 0;
        if (!("attackLockX" in ent)) ent.attackLockX = null;
        if (!("attackLockY" in ent)) ent.attackLockY = null;
        if (!ent.interp) {
            ent.interp = {
                startX: 0,
                startY: 0,
                endX: 0,
                endY: 0,
                startTime: 0,
                duration: 0
            };
        }
    }
    return entities[id];
}

function updateEntityClaim(targetId, attackerId) {
    if (attackerId == null || isNaN(attackerId)) return;
    const ent = entities[targetId];
    if (!ent) return;
    ent.lastClaimUpdate = performance.now();
}

function clearEntityClaim(targetId) {
    const ent = entities[targetId];
    if (!ent) return;
    ent.lockOwnerId = null;
    ent.lastClaimUpdate = 0;
}

function ensurePortal(id) {
    if (!portals[id]) {
        portals[id] = {
            id: id,
            factionId: 0,
            typeId: 0,
            x: 0,
            y: 0,
            visibleOnMiniMap: true,
            targetMaps: [],
            targetMapId: null,
            idleStart: performance.now(),
            playJump: false,
            jumpStart: 0
        };
    } else {
        const portal = portals[id];
        if (!("targetMapId" in portal)) portal.targetMapId = null;
        if (!("idleStart" in portal)) portal.idleStart = performance.now();
        if (!("playJump" in portal)) portal.playJump = false;
        if (!("jumpStart" in portal)) portal.jumpStart = 0;
    }
    return portals[id];
}

function resetPendingRangeResume(targetId = null) {
    if (targetId === null || pendingRangeResumeTargetId === targetId) {
        pendingRangeResumeTargetId = null;
        pendingRangeResumeMessage = false;
    }
    if (targetId === null || rangeProtectedTargetId === targetId) {
        rangeProtectedTargetId = null;
    }
}

function resolveShieldEffectDuration(effect, baseMs) {
    if (effect === "ISH") {
        return baseMs;
    }
    const spriteKey = effect === "INVINCIBILITY" ? "invincibility" : null;
    if (!spriteKey) return baseMs;
    const def = SHIELD_SPRITE_DEFS[spriteKey];
    if (!def) return baseMs;
    const animMs = def.frameCount / (def.fps || SHIELD_ANIM_FPS) * 1e3;
    return Math.max(baseMs, animMs);
}

function setHeroShieldEffect(effect, active, durationMs) {
    const now = performance.now();
    const duration = resolveShieldEffectDuration(effect, durationMs);
    if (effect === "ISH") {
        heroIshActive = !!active;
        heroIshUntil = active ? now + duration : 0;
        heroIshSince = active ? now : 0;
    } else if (effect === "INVINCIBILITY") {
        heroInvincible = !!active;
        heroInvUntil = active ? now + duration : 0;
        heroInvSince = active ? now : 0;
    }
}

function setEntityShieldEffect(ent, effect, active, durationMs) {
    if (!ent || ent.kind !== "player") return;
    const now = performance.now();
    const duration = resolveShieldEffectDuration(effect, durationMs);
    if (effect === "ISH") {
        ent.ishActive = !!active;
        ent.ishUntil = active ? now + duration : 0;
        ent.ishSince = active ? now : 0;
    } else if (effect === "INVINCIBILITY") {
        ent.invincible = !!active;
        ent.invUntil = active ? now + duration : 0;
        ent.invSince = active ? now : 0;
    }
    refreshEntityShieldEffectRegistration(ent);
}

function isPointInRect(px, py, rect) {
    return rect && px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

function resolveEntityVisualShipId(shipId) {
    if (shipId === 31) return 73;
    if (shipId === 27) return 76;
    if (shipId === 36) return 71;
    if (shipId === 28) return 77;
    return shipId;
}

function getEntityInterpolatedPosition(ent) {
    if (!ent) {
        return {
            x: 0,
            y: 0,
            settled: true
        };
    }
    let x = Number.isFinite(ent.x) ? ent.x : 0;
    let y = Number.isFinite(ent.y) ? ent.y : 0;
    let settled = true;
    const p = ent.interp;
    if (p && Number.isFinite(p.duration) && p.duration > 0 && Number.isFinite(p.startTime)) {
        const now = performance.now();
        const t = (now - p.startTime) / p.duration;
        if (t >= 1) {
            x = Number.isFinite(p.endX) ? p.endX : x;
            y = Number.isFinite(p.endY) ? p.endY : y;
        } else if (t >= 0) {
            const startX = Number.isFinite(p.startX) ? p.startX : x;
            const startY = Number.isFinite(p.startY) ? p.startY : y;
            const endX = Number.isFinite(p.endX) ? p.endX : x;
            const endY = Number.isFinite(p.endY) ? p.endY : y;
            x = startX + (endX - startX) * t;
            y = startY + (endY - startY) * t;
            settled = false;
        }
    }
    return {
        x: x,
        y: y,
        settled: settled
    };
}

function pointInRect(px, py, rect) {
    return !!rect && px >= rect.left && px <= rect.right && py >= rect.top && py <= rect.bottom;
}

function getWorldViewportScale() {
    return typeof getMapViewRenderScale === "function" ? getMapViewRenderScale() : typeof getWorldScaleValue === "function" ? getWorldScaleValue() : 1;
}

function mapToViewportScreenX(x) {
    const dx = x - cameraX;
    const centerX = canvas && canvas.width ? canvas.width / 2 : LOGICAL_WIDTH / 2;
    return centerX + dx * getWorldViewportScale();
}

function mapToViewportScreenY(y) {
    const dy = y - cameraY;
    const centerY = canvas && canvas.height ? canvas.height / 2 : LOGICAL_HEIGHT / 2;
    return centerY + dy * getWorldViewportScale();
}

function getFlashShipCircleHitProfile(ent, pose, viewportScale, baseRadius = 60) {
    if (!ent || (ent.kind !== "player" && ent.kind !== "npc")) return null;
    const shipId = Number.isFinite(ent.shipId) ? ent.shipId : parseInt(ent.shipId || "", 10);
    const clickOffsetX = typeof getShipClickOffsetX === "function" ? getShipClickOffsetX(shipId) : 0;
    const clickOffsetY = typeof getShipClickOffsetY === "function" ? getShipClickOffsetY(shipId) : 0;
    const xmlRadius = typeof getShipClickRadius === "function" ? getShipClickRadius(shipId) : NaN;
    const worldRadius = Number.isFinite(xmlRadius) && xmlRadius > 0 ? xmlRadius : Math.max(1, baseRadius || 45);
    const centerWorldX = pose.x + (Number.isFinite(clickOffsetX) ? clickOffsetX : 0);
    const centerWorldY = pose.y + (Number.isFinite(clickOffsetY) ? clickOffsetY : 0);
    return {
        screenX: mapToViewportScreenX(centerWorldX),
        screenY: mapToViewportScreenY(centerWorldY),
        hitRect: null,
        hitRadius: Math.max(1, worldRadius * viewportScale),
        pose: pose,
        useFlashCircle: true,
        clickRadiusWorld: worldRadius,
        clickOffsetX: Number.isFinite(clickOffsetX) ? clickOffsetX : 0,
        clickOffsetY: Number.isFinite(clickOffsetY) ? clickOffsetY : 0
    };
}

function getEntityHitTestProfile(ent, baseRadius = 60) {
    if (!ent) return null;
    const pose = getEntityInterpolatedPosition(ent);
    const viewportScale = getWorldViewportScale();
    const flashShipProfile = getFlashShipCircleHitProfile(ent, pose, viewportScale, baseRadius);
    if (flashShipProfile) {
        return flashShipProfile;
    }
    const screenX = mapToViewportScreenX(pose.x);
    const screenY = mapToViewportScreenY(pose.y);
    let hitRect = null;
    let hitRadius = Math.max(1, baseRadius || 60);
    const entityScale = typeof getEntityDrawScale === "function" ? getEntityDrawScale() : 1;
    const visualShipId = resolveEntityVisualShipId(ent.shipId);
    const def = typeof SHIP_SPRITE_DEFS !== "undefined" && visualShipId != null ? SHIP_SPRITE_DEFS[visualShipId] : null;
    let spriteMetrics = ent.__flashHoverSpriteMetrics || null;
    if (def && typeof getShipSpriteFrame === "function") {
        let frameIndex = 0;
        if (def.animationMode === "loop") {
            const fps = typeof def.loopFps === "number" && def.loopFps > 0 ? def.loopFps : 24;
            const totalFrames = def.frameCount > 0 ? def.frameCount : 1;
            frameIndex = Math.floor(performance.now() / (1e3 / fps)) % totalFrames;
        } else if (visualShipId === 73 || visualShipId === 76 || visualShipId === 71 || visualShipId === 77) {
            const totalFrames = def.frameCount > 0 ? def.frameCount : 32;
            frameIndex = Math.floor(performance.now() / (1e3 / 30)) % totalFrames;
        } else if (typeof ent.angle === "number" && def.frameCount > 1 && typeof getDirectionFrameIndex === "function") {
            frameIndex = getDirectionFrameIndex(ent.angle, def.frameCount);
        }
        try {
            const img = getShipSpriteFrame(visualShipId, frameIndex);
            if (img && img.complete && img.width > 0 && img.height > 0) {
                let shiftX = 0;
                let shiftY = 0;
                if (typeof getResolvedShipVisualShift === "function") {
                    const shift = getResolvedShipVisualShift(visualShipId, frameIndex, img, entityScale);
                    if (shift) {
                        shiftX = Number.isFinite(shift.x) ? shift.x : 0;
                        shiftY = Number.isFinite(shift.y) ? shift.y : 0;
                    }
                }
                spriteMetrics = {
                    width: img.width * entityScale * viewportScale,
                    height: img.height * entityScale * viewportScale,
                    shiftX: shiftX * viewportScale,
                    shiftY: shiftY * viewportScale,
                    visualShipId: visualShipId,
                    frameIndex: frameIndex,
                    updatedAt: performance.now()
                };
                ent.__flashHoverSpriteMetrics = spriteMetrics;
            }
        } catch (_) {}
    }
    if (spriteMetrics && Number.isFinite(spriteMetrics.width) && Number.isFinite(spriteMetrics.height)) {
        const pad = ent.invisible ? 16 : 8;
        const halfW = spriteMetrics.width / 2;
        const halfH = spriteMetrics.height / 2;
        const shiftX = Number.isFinite(spriteMetrics.shiftX) ? spriteMetrics.shiftX : 0;
        const shiftY = Number.isFinite(spriteMetrics.shiftY) ? spriteMetrics.shiftY : 0;
        hitRect = {
            left: screenX - halfW - shiftX - pad,
            top: screenY - halfH - shiftY - pad,
            right: screenX + halfW - shiftX + pad,
            bottom: screenY + halfH - shiftY + pad
        };
        hitRadius = Math.max(hitRadius, Math.max(spriteMetrics.width, spriteMetrics.height) * .5 + pad);
    } else if (ent.invisible) {
        hitRadius = Math.max(hitRadius, 90);
    }
    if (ent.invisible) {
        hitRadius = Math.max(hitRadius, 90);
    }
    return {
        screenX: screenX,
        screenY: screenY,
        hitRect: hitRect,
        hitRadius: hitRadius,
        pose: pose
    };
}

function refreshEntityInteractionAfterVisibilityChange(targetId) {
    const ent = entities[targetId];
    if (!ent) return;
    const profile = getEntityHitTestProfile(ent, 60);
    if (!profile || !profile.pose) return;
    ent.x = profile.pose.x;
    ent.y = profile.pose.y;
    if (ent.interp && profile.pose.settled) {
        ent.interp.startX = ent.x;
        ent.interp.startY = ent.y;
        ent.interp.endX = ent.x;
        ent.interp.endY = ent.y;
        ent.interp.duration = 0;
        ent.interp.startTime = performance.now();
    }
    ent.__flashLastVisibilityToggleMs = performance.now();
}

window.__flashRefreshEntityInteractionAfterInv = refreshEntityInteractionAfterVisibilityChange;

function isShipOrNpcEntity(ent) {
    return ent && (ent.kind === "player" || ent.kind === "npc");
}

function isBoxEntity(ent) {
    return ent && ent.kind === "box";
}

function isCanvasHoverEntity(ent) {
    return ent && (ent.kind === "player" || ent.kind === "npc" || ent.kind === "box");
}

function getHoverEntityViewportScale() {
    return typeof getWorldViewportScale === "function" ? getWorldViewportScale() : 1;
}

function isCachedHoverEntityValid(screenX, screenY, viewportScale) {
    if (!hoverEntityScanCache.valid || hoverEntityScanCache.entityId == null) return false;
    if (entities[hoverEntityScanCache.entityId] !== hoverEntityScanCache.entity) return false;
    if (!hoverEntityScanCache.entity || hoverEntityScanCache.entity.x !== hoverEntityScanCache.entityX || hoverEntityScanCache.entity.y !== hoverEntityScanCache.entityY) return false;
    return hoverEntityScanCache.screenX === screenX && hoverEntityScanCache.screenY === screenY && hoverEntityScanCache.cameraX === cameraX && hoverEntityScanCache.cameraY === cameraY && hoverEntityScanCache.canvasWidth === (canvas && canvas.width || 0) && hoverEntityScanCache.canvasHeight === (canvas && canvas.height || 0) && hoverEntityScanCache.viewportScale === viewportScale;
}

function getHoverEntityAtScreenPos(screenX, screenY) {
    const viewportScale = getHoverEntityViewportScale();
    if (isCachedHoverEntityValid(screenX, screenY, viewportScale)) {
        return hoverEntityScanCache.entity;
    }
    const hoverEntity = findEntityAtScreenPos(screenX, screenY, isCanvasHoverEntity, 60, true);
    hoverEntityScanCache.valid = !!hoverEntity;
    hoverEntityScanCache.screenX = screenX;
    hoverEntityScanCache.screenY = screenY;
    hoverEntityScanCache.cameraX = cameraX;
    hoverEntityScanCache.cameraY = cameraY;
    hoverEntityScanCache.canvasWidth = canvas && canvas.width || 0;
    hoverEntityScanCache.canvasHeight = canvas && canvas.height || 0;
    hoverEntityScanCache.viewportScale = viewportScale;
    hoverEntityScanCache.entityId = hoverEntity && hoverEntity.id != null ? hoverEntity.id : null;
    hoverEntityScanCache.entity = hoverEntity || null;
    hoverEntityScanCache.entityX = hoverEntity ? hoverEntity.x : 0;
    hoverEntityScanCache.entityY = hoverEntity ? hoverEntity.y : 0;
    return hoverEntity;
}

function findEntityAtScreenPos(screenX, screenY, predicate, radius, includeInvisible = false) {
    let best = null;
    let bestScore = Infinity;
    const baseRadius = radius || 60;
    for (const id in entities) {
        const e = entities[id];
        if (e && e.id === heroId) continue;
        if (predicate && !predicate(e)) continue;
        if (e.invisible && e.id !== heroId && !includeInvisible) continue;
        const now = performance.now();
        if (e.empImmunityUntil && now < e.empImmunityUntil) continue;
        const hit = getEntityHitTestProfile(e, baseRadius);
        if (!hit) continue;
        const dx = hit.screenX - screenX;
        const dy = hit.screenY - screenY;
        const d2 = dx * dx + dy * dy;
        const insideRect = pointInRect(screenX, screenY, hit.hitRect);
        const insideRadius = d2 < hit.hitRadius * hit.hitRadius;
        if (!insideRect && !insideRadius) continue;
        if (d2 < bestScore) {
            bestScore = d2;
            best = e;
        }
    }
    return best;
}

function getHeroFlashMoveRadiusSquared() {
    let shipId = Number.isFinite(heroShipId) && heroShipId > 0 ? heroShipId : null;
    if ((shipId === null || shipId === 0) && heroId != null && entities[heroId] && entities[heroId].shipId != null) {
        const parsed = parseInt(entities[heroId].shipId, 10);
        if (Number.isFinite(parsed) && parsed > 0) shipId = parsed;
    }
    if (typeof getShipMoveRadiusSquared === "function") {
        const radiusSquared = getShipMoveRadiusSquared(shipId);
        if (Number.isFinite(radiusSquared) && radiusSquared >= 0) return radiusSquared;
    }
    // Flash ShipPattern.moveRadiusSquared default when game.xml has no moveRadius attribute.
    return 100;
}

function getFlashPoiZonesRevisionForMoveCache() {
    return typeof window.getFlashPoiZonesRevision === "function" ? window.getFlashPoiZonesRevision() : 0;
}

function copyFlashMoveTargetCache(out = null) {
    if (!flashMoveTargetCache.hasTarget) return null;
    if (out) {
        out.x = flashMoveTargetCache.x;
        out.y = flashMoveTargetCache.y;
        return out;
    }
    return {
        x: flashMoveTargetCache.x,
        y: flashMoveTargetCache.y
    };
}

function rememberFlashMoveTargetCache(screenX, screenY, viewportScale, moveRadiusSq, poiRevision, hasTarget, targetX, targetY, out = null) {
    flashMoveTargetCache.valid = true;
    flashMoveTargetCache.screenX = screenX;
    flashMoveTargetCache.screenY = screenY;
    flashMoveTargetCache.shipX = shipX;
    flashMoveTargetCache.shipY = shipY;
    flashMoveTargetCache.cameraX = cameraX;
    flashMoveTargetCache.cameraY = cameraY;
    flashMoveTargetCache.canvasWidth = canvas && canvas.width || 0;
    flashMoveTargetCache.canvasHeight = canvas && canvas.height || 0;
    flashMoveTargetCache.viewportScale = viewportScale;
    flashMoveTargetCache.moveRadiusSq = moveRadiusSq;
    flashMoveTargetCache.mapMinX = MAP_MIN_X;
    flashMoveTargetCache.mapMinY = MAP_MIN_Y;
    flashMoveTargetCache.mapWidth = MAP_WIDTH;
    flashMoveTargetCache.mapHeight = MAP_HEIGHT;
    flashMoveTargetCache.poiRevision = poiRevision;
    flashMoveTargetCache.hasTarget = !!hasTarget;
    flashMoveTargetCache.x = hasTarget ? targetX : 0;
    flashMoveTargetCache.y = hasTarget ? targetY : 0;
    return copyFlashMoveTargetCache(out);
}

function hasCachedFlashMoveTarget(screenX, screenY, viewportScale, moveRadiusSq, poiRevision) {
    return flashMoveTargetCache.valid && flashMoveTargetCache.screenX === screenX && flashMoveTargetCache.screenY === screenY && flashMoveTargetCache.shipX === shipX && flashMoveTargetCache.shipY === shipY && flashMoveTargetCache.cameraX === cameraX && flashMoveTargetCache.cameraY === cameraY && flashMoveTargetCache.canvasWidth === (canvas && canvas.width || 0) && flashMoveTargetCache.canvasHeight === (canvas && canvas.height || 0) && flashMoveTargetCache.viewportScale === viewportScale && flashMoveTargetCache.moveRadiusSq === moveRadiusSq && flashMoveTargetCache.mapMinX === MAP_MIN_X && flashMoveTargetCache.mapMinY === MAP_MIN_Y && flashMoveTargetCache.mapWidth === MAP_WIDTH && flashMoveTargetCache.mapHeight === MAP_HEIGHT && flashMoveTargetCache.poiRevision === poiRevision;
}

function getFlashMoveTargetFromScreen(screenX, screenY, out = null) {
    if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) return null;
    if (!canvas) return null;
    const viewportScale = getWorldViewportScale();
    const centerX = canvas.width ? canvas.width / 2 : LOGICAL_WIDTH / 2;
    const centerY = canvas.height ? canvas.height / 2 : LOGICAL_HEIGHT / 2;
    const dx = screenX - centerX;
    const dy = screenY - centerY;
    const moveRadiusSq = getHeroFlashMoveRadiusSquared();
    const poiRevision = getFlashPoiZonesRevisionForMoveCache();
    if (hasCachedFlashMoveTarget(screenX, screenY, viewportScale, moveRadiusSq, poiRevision)) {
        return copyFlashMoveTargetCache(out);
    }
    if (dx * dx + dy * dy < moveRadiusSq) {
        return rememberFlashMoveTargetCache(screenX, screenY, viewportScale, moveRadiusSq, poiRevision, false, 0, 0, out);
    }
    const worldPos = screenToMapInto(screenX, screenY, flashMoveWorldScratch, viewportScale);
    let targetX = worldPos.x;
    let targetY = worldPos.y;
    let corrected = null;
    if (typeof checkFlashPoiZoneCollisionsValues === "function") {
        corrected = checkFlashPoiZoneCollisionsValues(shipX, shipY, targetX, targetY, flashMovePoiScratch);
    } else if (typeof checkFlashPoiZoneCollisions === "function") {
        flashMoveFromScratch.x = shipX;
        flashMoveFromScratch.y = shipY;
        flashMoveToScratch.x = targetX;
        flashMoveToScratch.y = targetY;
        corrected = checkFlashPoiZoneCollisions(flashMoveFromScratch, flashMoveToScratch);
    }
    if (corrected && Number.isFinite(corrected.x) && Number.isFinite(corrected.y)) {
        targetX = corrected.x;
        targetY = corrected.y;
    }
    return rememberFlashMoveTargetCache(screenX, screenY, viewportScale, moveRadiusSq, poiRevision, true, targetX, targetY, out);
}

function sendHeroMoveFromScreenLikeFlash(screenX, screenY) {
    const target = getFlashMoveTargetFromScreen(screenX, screenY, flashMoveSendTargetScratch);
    if (!target) return false;
    moveTargetX = target.x;
    moveTargetY = target.y;
    moveTargetFromMinimap = false;
    isChasingTarget = false;
    if (typeof sendMoveToServer === "function") {
        sendMoveToServer(moveTargetX, moveTargetY);
    }
    return true;
}

function heroFollowMouseTick() {
    if (!isMouseDownOnMap) return;
    const screenX = lastMouseScreenX;
    const screenY = lastMouseScreenY;
    if (!canvas) return;
    const margin = 10;
    const miniMapX = canvas.width - MINIMAP_WIDTH - margin;
    const miniMapY = canvas.height - MINIMAP_HEIGHT - margin;
    const overMiniMap = screenX >= miniMapX && screenX <= miniMapX + MINIMAP_WIDTH && screenY >= miniMapY && screenY <= miniMapY + MINIMAP_HEIGHT;
    if (overMiniMap) return;
    sendHeroMoveFromScreenLikeFlash(screenX, screenY);
}


function isFlashDoubleClickAttackEnabled() {
    return typeof setting_doubleclick_attack !== "undefined" && !!setting_doubleclick_attack;
}

function getFlashMouseDownTimeMs() {
    return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
}

function handleFlashDoubleClickAttackFromMouseDown(screenX, screenY) {
    if (!isFlashDoubleClickAttackEnabled()) return false;
    const nowMs = getFlashMouseDownTimeMs();
    const previousMs = lastFlashDoubleClickMouseDownMs;
    const isFlashDoubleClick = previousMs > 0 && nowMs - previousMs < FLASH_DOUBLE_CLICK_ATTACK_MS;
    lastFlashDoubleClickMouseDownMs = nowMs;
    if (!isFlashDoubleClick) return false;
    if (selectedTargetId == null) return false;
    const selectedShip = entities[selectedTargetId];
    if (!selectedShip || (selectedShip.kind !== "player" && selectedShip.kind !== "npc")) return false;
    const hitShip = findEntityAtScreenPos(screenX, screenY, isShipOrNpcEntity, 60, true);
    if (!hitShip) return false;
    toggleLaserOnSelectedTarget();
    return true;
}

function getMinimapMapRect() {
    const isMinimapOpen = window.showMinimap !== false;
    if (!isMinimapOpen) return null;
    const layout = typeof getMinimapLayout === "function" ? getMinimapLayout(isMinimapOpen) : null;
    if (minimapHitboxes.content) return minimapHitboxes.content;
    if (!layout) return null;
    return {
        x: layout.contentX,
        y: layout.mapY ?? layout.contentY + MINIMAP_INFO_HEIGHT,
        w: MINIMAP_WIDTH,
        h: MINIMAP_HEIGHT
    };
}

function handleMinimapMapClick(screenX, screenY) {
    const mapRect = getMinimapMapRect();
    if (!mapRect || !isPointInRect(screenX, screenY, mapRect)) return false;
    const scaleX = MAP_WIDTH > 0 ? MAP_WIDTH / MINIMAP_WIDTH : 0;
    const scaleY = MAP_HEIGHT > 0 ? MAP_HEIGHT / MINIMAP_HEIGHT : 0;
    const clickLocalX = screenX - mapRect.x;
    const clickLocalY = screenY - mapRect.y;
    let targetX = MAP_MIN_X + clickLocalX * scaleX;
    let targetY = MAP_MIN_Y + clickLocalY * scaleY;
    targetX = Math.max(MAP_MIN_X, Math.min(MAP_MAX_X, targetX));
    targetY = Math.max(MAP_MIN_Y, Math.min(MAP_MAX_Y, targetY));
    if (groupPingMode && Object.keys(groupMembers).length > 0) {
        sendGroupPing(targetX, targetY);
        if (typeof window.__flashGroupClearActionMode === "function") {
            window.__flashGroupClearActionMode();
        } else {
            groupPingMode = false;
        }
        if (typeof window.flashParityDebugLog === "function") window.flashParityDebugLog("minimap-action", {
            action: "group-ping",
            x: targetX,
            y: targetY
        });
        return true;
    }
    const corrected = typeof checkFlashPoiZoneCollisions === "function" ? checkFlashPoiZoneCollisions({
        x: shipX,
        y: shipY
    }, {
        x: targetX,
        y: targetY
    }) : null;
    if (corrected && Number.isFinite(corrected.x) && Number.isFinite(corrected.y)) {
        targetX = corrected.x;
        targetY = corrected.y;
    }
    moveTargetX = targetX;
    moveTargetY = targetY;
    moveTargetFromMinimap = true;
    window.minimapClickPointer = {
        x: targetX,
        y: targetY,
        startedAt: typeof performance !== "undefined" && performance.now ? performance.now() : Date.now()
    };
    isChasingTarget = false;
    sendMoveToServer(targetX, targetY);
    if (typeof window.flashParityDebugLog === "function") window.flashParityDebugLog("minimap-action", {
        action: "move-click",
        x: targetX,
        y: targetY
    });
    return true;
}

function isConnectionModalBlocking() {
    return !!(typeof window.isConnectionModalBlocking === "function" && window.isConnectionModalBlocking());
}

canvas.addEventListener("mousedown", e => {
    const pointer = typeof getLogicalPointerPosition === "function" ? getLogicalPointerPosition(e) : (() => {
        const rect = canvas.getBoundingClientRect();
        const scaleMouseX = rect.width ? canvas.width / rect.width : 1;
        const scaleMouseY = rect.height ? canvas.height / rect.height : 1;
        return {
            x: (e.clientX - rect.left) * scaleMouseX,
            y: (e.clientY - rect.top) * scaleMouseY
        };
    })();
    const screenX = pointer.x;
    const screenY = pointer.y;
    if (e.__minimapHandledByCapture) {
        return;
    }
    if (isConnectionModalBlocking()) {
        return;
    }
    if (logoutControlsLocked) {
        return;
    }
    if (quickbarDraggerHitbox && isPointInRect(screenX, screenY, quickbarDraggerHitbox)) {
        if (e.button === 0 && !quickbarLocked) {
            isDraggingQuickbar = true;
            quickbarDragOffset.x = screenX - quickbarPosition.x;
            quickbarDragOffset.y = screenY - quickbarPosition.y;
            return;
        }
    }
    if (quickbarRotateHitbox && isPointInRect(screenX, screenY, quickbarRotateHitbox)) {
        if (e.button === 0 && !quickbarLocked) {
            quickbarLayoutMode = (quickbarLayoutMode + 1) % 4;
            if (typeof flashPlayQuickbarSlotMoveSound === "function") {
                flashPlayQuickbarSlotMoveSound();
            }
            if (typeof flashSendQuickbarOrderToServer === "function") {
                flashSendQuickbarOrderToServer();
            }
            saveInterfaceLayout();
            return;
        }
    }
    const overQuickbar = typeof window.isPointInQuickbarRegion === "function" ? window.isPointInQuickbarRegion(screenX, screenY) : (quickbarBounds && isPointInRect(screenX, screenY, quickbarBounds));
    if (overQuickbar) {
        if (quickbarMinHitbox && isPointInRect(screenX, screenY, quickbarMinHitbox)) {
            quickbarMinimized = !quickbarMinimized;
            saveInterfaceLayout();
            return;
        }
        if (quickbarLockHitbox && isPointInRect(screenX, screenY, quickbarLockHitbox)) {
            quickbarLocked = !quickbarLocked;
            addInfoMessage(quickbarLocked ? "Quickbar locked." : "Quickbar unlocked.");
            saveInterfaceLayout();
            return;
        }
        if (!quickbarMinimized) {
            for (let slot = 1; slot <= 10; slot++) {
                if (quickbarSlotHitboxes[slot] && isPointInRect(screenX, screenY, quickbarSlotHitboxes[slot])) {
                    if (e.button === 2) {
                        return;
                    }
                    if (e.button === 0) {
                        if (quickbarLocked) {
                            triggerSlot(slot);
                        } else {
                            configureQuickbarSlot(slot, {
                                screenX: screenX,
                                screenY: screenY,
                                clientX: e.clientX,
                                clientY: e.clientY,
                                originalEvent: e
                            });
                        }
                        return;
                    }
                }
            }
        }
        return;
    }
    if (minimapHitboxes.zoomIn && isPointInRect(screenX, screenY, minimapHitboxes.zoomIn)) {
        zoomMinimapIn();
        if (typeof window.flashParityDebugLog === "function") window.flashParityDebugLog("minimap-action", {
            action: "zoom-in-click"
        });
        return;
    }
    if (minimapHitboxes.zoomOut && isPointInRect(screenX, screenY, minimapHitboxes.zoomOut)) {
        zoomMinimapOut();
        if (typeof window.flashParityDebugLog === "function") window.flashParityDebugLog("minimap-action", {
            action: "zoom-out-click"
        });
        return;
    }
    if (handleMinimapMapClick(screenX, screenY)) {
        return;
    }
    if (e.button === 2) {
        const stopId = attackIntentTargetId !== null ? attackIntentTargetId : currentLaserTargetId !== null ? currentLaserTargetId : confirmedAttackTargetId !== null ? confirmedAttackTargetId : pendingRangeResumeTargetId !== null ? pendingRangeResumeTargetId : null;
        if (stopId !== null) {
            sendLaserStop(stopId, true);
        }
        attackIntentTargetId = null;
        confirmedAttackTargetId = null;
        pendingAttackAckTargetId = null;
        pendingAttackAckStartMs = 0;
        clearPendingTargetLaserAttackIntent();
        resetPendingRangeResume();
        isChasingTarget = false;
        return;
    }
    if (e.button !== 0) return;
    clearPendingCollectState();
    const repairBtnX = HERO_HUD_X + HERO_HUD_WIDTH - HERO_REPAIR_BTN_WIDTH - 10;
    const repairBtnY = HERO_HUD_Y + HERO_HUD_HEIGHT - HERO_REPAIR_BTN_HEIGHT - 8;
    if (screenX >= repairBtnX && screenX <= repairBtnX + HERO_REPAIR_BTN_WIDTH && screenY >= repairBtnY && screenY <= repairBtnY + HERO_REPAIR_BTN_HEIGHT) {
        sendRepairCommand();
        return;
    }
    if (groupPingMode && Object.keys(groupMembers).length > 0) {
        const pingWorldPos = screenToMap(screenX, screenY);
        sendGroupPing(pingWorldPos.x, pingWorldPos.y);
        if (typeof window.__flashGroupClearActionMode === "function") {
            window.__flashGroupClearActionMode();
        } else {
            groupPingMode = false;
        }
        if (typeof window.flashParityDebugLog === "function") window.flashParityDebugLog("group-action", {
            action: "world-ping",
            x: pingWorldPos.x,
            y: pingWorldPos.y
        });
        return;
    }
    handleFlashDoubleClickAttackFromMouseDown(screenX, screenY);
    const clickedShip = findEntityAtScreenPos(screenX, screenY, isShipOrNpcEntity, 60, true);
    if (clickedShip) {
        if (selectedTargetId !== null && selectedTargetId !== clickedShip.id) {
            const logActiveTargetId = typeof heroCombatLogActiveTargetId !== "undefined" ? heroCombatLogActiveTargetId : null;
            const hasConfirmedAttackOnSelected = currentLaserTargetId === selectedTargetId || confirmedAttackTargetId === selectedTargetId || logActiveTargetId === selectedTargetId;
            const hasAttackStateOnSelected = hasConfirmedAttackOnSelected || attackIntentTargetId === selectedTargetId || pendingAttackAckTargetId === selectedTargetId;
            if (hasAttackStateOnSelected) {
                if (typeof logFlashCombatLocaleMessage === "function") {
                    if (hasConfirmedAttackOnSelected) {
                        logFlashCombatLocaleMessage("attstop", selectedTargetId, targetName => `Attack on ${targetName} was cancelled.`, "CLIENT");
                    }
                }
                sendLaserStop(selectedTargetId, true);
                currentLaserTargetId = null;
                attackIntentTargetId = null;
                confirmedAttackTargetId = null;
                pendingAttackAckTargetId = null;
                pendingAttackAckStartMs = 0;
                if (typeof clearHeroCombatLogActiveTarget === "function") clearHeroCombatLogActiveTarget(selectedTargetId);
                isChasingTarget = false;
            }
        }
        requestTargetSelectionLikeFlash(clickedShip.id);
        if (clickedShip.kind === "player" && clickedShip.name) {
            const groupInput = document.getElementById("groupInputName");
            if (groupInput) {
                groupInput.value = clickedShip.name;
            }
        }
        return;
    }
    const clickedBox = findEntityAtScreenPos(screenX, screenY, isBoxEntity, 50);
    if (clickedBox) {
        const collectTarget = computeCollectApproach(clickedBox);
        if (collectTarget) {
            moveTargetX = collectTarget.x;
            moveTargetY = collectTarget.y;
        } else {
            moveTargetX = clickedBox.x;
            moveTargetY = clickedBox.y;
            moveTargetFromMinimap = false;
        }
        pendingCollectBoxId = clickedBox.id;
        isChasingTarget = false;
        sendMoveToServer(moveTargetX, moveTargetY);
        return;
    }
    if (e.button === 0) {
        isMouseDownOnMap = true;
        lastMouseScreenX = screenX;
        lastMouseScreenY = screenY;
        if (!heroMoveTimerId) {
            heroMoveTimerId = setInterval(heroFollowMouseTick, FLASH_HERO_MOVE_REPEAT_MS);
        }
        sendHeroMoveFromScreenLikeFlash(screenX, screenY);
    }
});

canvas.addEventListener("mousemove", e => {
    const pointer = typeof getLogicalPointerPosition === "function" ? getLogicalPointerPosition(e) : (() => {
        const rect = canvas.getBoundingClientRect();
        const scaleMouseX = rect.width ? canvas.width / rect.width : 1;
        const scaleMouseY = rect.height ? canvas.height / rect.height : 1;
        return {
            x: (e.clientX - rect.left) * scaleMouseX,
            y: (e.clientY - rect.top) * scaleMouseY
        };
    })();
    const screenX = pointer.x;
    const screenY = pointer.y;
    let cursor = "default";
    if (isConnectionModalBlocking()) {
        activeTooltip = null;
        canvas.style.cursor = "default";
        return;
    }
    const hoverState = typeof getMinimapHoverState === "function" ? getMinimapHoverState() : null;
    if (hoverState) {
        hoverState.header = false;
    }
    if (isDraggingQuickbar) {
        quickbarPosition.x = screenX - quickbarDragOffset.x;
        quickbarPosition.y = screenY - quickbarDragOffset.y;
    }
    if (quickbarRotateHitbox && isPointInRect(screenX, screenY, quickbarRotateHitbox)) {
        cursor = "pointer";
    }
    if (quickbarDraggerHitbox && isPointInRect(screenX, screenY, quickbarDraggerHitbox)) {
        cursor = "move";
    }
    if (typeof updateQuickbarHoverState === "function") {
        const quickbarCursor = updateQuickbarHoverState(screenX, screenY, e);
        if (quickbarCursor && cursor === "default") {
            cursor = quickbarCursor;
        }
    }
    activeTooltip = null;
    let quickbarTooltipShown = false;
    if (!quickbarMinimized) {
        for (let slot = 1; slot <= 10; slot++) {
            if (quickbarSlotHitboxes[slot] && isPointInRect(screenX, screenY, quickbarSlotHitboxes[slot])) {
                const item = quickSlots[slot];
                if (item) {
                    const resolvedQuickbarItem = typeof window.resolveQuickbarCatalogItem === "function" ? window.resolveQuickbarCatalogItem(item) || item : item;
                    if (typeof window.showActionTooltip === "function") {
                        window.showActionTooltip(e, resolvedQuickbarItem);
                    } else {
                        const label = resolvedQuickbarItem.label || resolvedQuickbarItem.code || "Item";
                        activeTooltip = {
                            text: label,
                            x: screenX,
                            y: screenY
                        };
                    }
                    quickbarTooltipShown = true;
                }
                break;
            }
        }
    }
    if (!quickbarTooltipShown && typeof window.hideActionTooltip === "function") {
        window.hideActionTooltip();
    }
    if (isMouseDownOnMap && (e.buttons & 1) === 1) {
        lastMouseScreenX = screenX;
        lastMouseScreenY = screenY;
        const liveMoveTarget = getFlashMoveTargetFromScreen(screenX, screenY, flashMoveLiveTargetScratch);
        if (liveMoveTarget) {
            moveTargetX = liveMoveTarget.x;
            moveTargetY = liveMoveTarget.y;
            moveTargetFromMinimap = false;
            isChasingTarget = false;
        }
    }
    const hoverEntity = getHoverEntityAtScreenPos(screenX, screenY);
    const isMinimapOpen = window.showMinimap !== false;
    const layout = typeof getMinimapLayout === "function" ? getMinimapLayout(isMinimapOpen) : null;
    if (isMinimapOpen && layout && hoverState) {
        const headerRect = {
            x: layout.outerX,
            y: layout.outerY,
            w: layout.outerWidth,
            h: MINIMAP_HEADER_HEIGHT
        };
        const overZoomIn = minimapHitboxes.zoomIn && isPointInRect(screenX, screenY, minimapHitboxes.zoomIn);
        const overZoomOut = minimapHitboxes.zoomOut && isPointInRect(screenX, screenY, minimapHitboxes.zoomOut);
        const overHeader = isPointInRect(screenX, screenY, headerRect);
        const prevHoverSig = `${hoverState.header ? 1 : 0}|${hoverState.zoomIn ? 1 : 0}|${hoverState.zoomOut ? 1 : 0}`;
        hoverState.header = !!overHeader;
        hoverState.zoomIn = !!overZoomIn;
        hoverState.zoomOut = !!overZoomOut;
        const nextHoverSig = `${hoverState.header ? 1 : 0}|${hoverState.zoomIn ? 1 : 0}|${hoverState.zoomOut ? 1 : 0}`;
        if (prevHoverSig !== nextHoverSig && typeof window.flashParityDebugLog === "function") {
            window.flashParityDebugLog("minimap-action", {
                action: "hover-state",
                header: hoverState.header,
                zoomIn: hoverState.zoomIn,
                zoomOut: hoverState.zoomOut
            });
        }
        if (overZoomIn || overZoomOut) {
            cursor = "pointer";
        } else if (overHeader) {
            cursor = "move";
        }
    }
    if (cursor === "default") {
        if (hoverEntity) {
            cursor = "pointer";
        }
    }
    canvas.style.cursor = cursor;
});

window.addEventListener("mousedown", e => {
    if (isConnectionModalBlocking()) return;
    if (e.__minimapHandledByCapture) return;
    if (e.button !== 0 || window.showMinimap === false) return;
    if (e.target === canvas) return;
    const pointer = typeof getLogicalPointerPosition === "function" ? getLogicalPointerPosition(e) : (() => {
        const rect = canvas.getBoundingClientRect();
        const scaleMouseX = rect.width ? canvas.width / rect.width : 1;
        const scaleMouseY = rect.height ? canvas.height / rect.height : 1;
        return {
            x: (e.clientX - rect.left) * scaleMouseX,
            y: (e.clientY - rect.top) * scaleMouseY
        };
    })();
    if (handleMinimapMapClick(pointer.x, pointer.y)) {
        e.__minimapHandledByCapture = true;
        e.preventDefault();
        e.stopPropagation();
    }
}, true);

window.addEventListener("mouseup", e => {
    if (typeof finishQuickbarInteraction === "function") {
        finishQuickbarInteraction(e);
    }
    if (isDraggingQuickbar) {
        saveInterfaceLayout();
    }
    isDraggingQuickbar = false;
    if (isMouseDownOnMap) {
        isMouseDownOnMap = false;
    }
    if (heroMoveTimerId) {
        clearInterval(heroMoveTimerId);
        heroMoveTimerId = null;
    }
});

function toggleLaserOnSelectedTarget() {
    if (selectedTargetId == null) {
        if (pendingTargetSelectionId != null && isTargetSelectionPending(pendingTargetSelectionId)) {
            queuePendingTargetLaserAttackIntent(pendingTargetSelectionId);
        }
        return;
    }
    if (selectedTargetId === heroId) {
        addInfoMessage("You cannot attack yourself.");
        try {
            if (typeof sendLaserStop === "function") {
                sendLaserStop(selectedTargetId, true);
            }
        } catch (_) {}
        selectedTargetId = null;
        clearPendingTargetSelection();
        attackIntentTargetId = null;
        isChasingTarget = false;
        return;
    }
    const logActiveTargetId = typeof heroCombatLogActiveTargetId !== "undefined" ? heroCombatLogActiveTargetId : null;
    const isConfirmedAttackingSelected = confirmedAttackTargetId === selectedTargetId || currentLaserTargetId === selectedTargetId || logActiveTargetId === selectedTargetId;
    const isPendingAttackSelected = attackIntentTargetId === selectedTargetId || pendingAttackAckTargetId === selectedTargetId;
    const isAttackingSelected = isConfirmedAttackingSelected || isPendingAttackSelected;
    if (typeof isHeroGroupMemberTarget === "function" && isHeroGroupMemberTarget(selectedTargetId)) {
        if (isAttackingSelected && typeof sendLaserStop === "function") {
            sendLaserStop(selectedTargetId, true);
        }
        if (typeof blockGroupMemberAttack === "function") {
            blockGroupMemberAttack(selectedTargetId);
        }
        attackIntentTargetId = null;
        isChasingTarget = false;
        return;
    }
    if (isAttackingSelected) {
        if (isConfirmedAttackingSelected && typeof logFlashCombatLocaleMessage === "function") {
            logFlashCombatLocaleMessage("attstop", selectedTargetId, targetName => `Attack on ${targetName} was cancelled.`, "CLIENT");
        }
        sendLaserStop(selectedTargetId, true);
        attackIntentTargetId = null;
        isChasingTarget = false;
        resetPendingRangeResume(selectedTargetId);
        return;
    }
    attackIntentTargetId = selectedTargetId;
    isChasingTarget = false;
    sendLaserAttack(selectedTargetId);
}

window.addEventListener("keydown", e => {
    const _t = e.target;
    if (_t && (_t.tagName === "INPUT" || _t.tagName === "TEXTAREA" || _t.isContentEditable)) {
        return;
    }
    if (isConnectionModalBlocking()) {
        e.preventDefault();
        return;
    }
    if (logoutControlsLocked) {
        return;
    }
    if (shouldIgnoreRepeatedFlashKeyDown(e)) {
        return;
    }
    if (e.key === "Control") {
        if (!isCtrlDown) {
            isCtrlDown = true;
            if (!ctrlHandledThisPress) {
                ctrlHandledThisPress = true;
                try {
                    const curAmmo = typeof currentAmmoId !== "undefined" ? currentAmmoId : null;
                    let needsAmmo = curAmmo === null || curAmmo === undefined || curAmmo === 0;
                    if (!needsAmmo && typeof ammoStock !== "undefined" && ammoStock) {
                        const qty = parseInt(ammoStock[curAmmo], 10) || 0;
                        if (qty <= 0) needsAmmo = true;
                    }
                    if (needsAmmo) {
                        let preferredAmmoId = 1;
                        if (typeof ammoStock !== "undefined" && ammoStock) {
                            const candidates = [ 1, 2, 3, 4, 5 ];
                            for (const id of candidates) {
                                const q = parseInt(ammoStock[id], 10) || 0;
                                if (q > 0) {
                                    preferredAmmoId = id;
                                    break;
                                }
                            }
                        }
                        if (typeof sendSelectAmmo === "function") {
                            sendSelectAmmo(preferredAmmoId);
                        } else {
                            currentAmmoId = preferredAmmoId;
                            primaryAmmoId = preferredAmmoId;
                        }
                    }
                } catch (_) {}
                toggleLaserOnSelectedTarget();
            }
        }
        return;
    }
    if (e.code === "Space" || e.key === " ") {
        if (selectedTargetId != null && selectedTargetId !== heroId) {
            e.preventDefault();
            sendRocketAttack(selectedTargetId);
        } else if (selectedTargetId === heroId) {
            addInfoMessage("You cannot attack yourself.");
            selectedTargetId = null;
            clearPendingTargetSelection();
        }
        return;
    }
    if (e.key === "j" || e.key === "J") {
        let nearest = null;
        let bestDistSq = PORTAL_JUMP_DISTANCE * PORTAL_JUMP_DISTANCE;
        for (const id in portals) {
            const p = portals[id];
            const dx = p.x - shipX;
            const dy = p.y - shipY;
            const d2 = dx * dx + dy * dy;
            if (d2 < bestDistSq) {
                bestDistSq = d2;
                nearest = p;
            }
        }
        if (nearest) {
            if (!inJumpZone) {
                try {
                    if (window.AudioManager && typeof window.AudioManager.playSoundEffect === "function") {
                        window.AudioManager.playSoundEffect(29, false, false, -1, -1, true);
                    }
                } catch (_) {}
                addInfoMessage("Cannot: you're not in the jump zone.");
                return;
            }
            sendPortalJump();
        } else {
            addInfoMessage("No portal nearby.");
        }
        return;
    }
    if (e.key === "c" || e.key === "C") {
        const nextCfg = heroConfig === 1 ? 2 : 1;
        sendChangeConfig(nextCfg);
        return;
    }
    if (e.key === "+" || e.key === "=") {
        if (typeof increaseMapScale === "function") increaseMapScale();
        if (typeof window.flashParityDebugLog === "function") window.flashParityDebugLog("map-action", {
            action: "zoom-in"
        });
        return;
    }
    if (e.key === "-" || e.key === "_") {
        if (typeof decreaseMapScale === "function") decreaseMapScale();
        if (typeof window.flashParityDebugLog === "function") window.flashParityDebugLog("map-action", {
            action: "zoom-out"
        });
        return;
    }
    if (e.key === "b" || e.key === "B") {
        VISIBILITY_SETTINGS.bonusBoxes = !VISIBILITY_SETTINGS.bonusBoxes;
        addInfoMessage("Bonus boxes: " + (VISIBILITY_SETTINGS.bonusBoxes ? "ON" : "OFF"));
        return;
    }
    if (e.key === "f" || e.key === "F") {
        VISIBILITY_SETTINGS.freeCargo = !VISIBILITY_SETTINGS.freeCargo;
        addInfoMessage("Free cargo: " + (VISIBILITY_SETTINGS.freeCargo ? "ON" : "OFF"));
        return;
    }
    if (e.key === "n" || e.key === "N") {
        VISIBILITY_SETTINGS.notFreeCargo = !VISIBILITY_SETTINGS.notFreeCargo;
        addInfoMessage("Paid cargo: " + (VISIBILITY_SETTINGS.notFreeCargo ? "ON" : "OFF"));
        return;
    }
    if (keyBindings[e.code]) {
        triggerSlot(keyBindings[e.code]);
        return;
    }
});

window.addEventListener("keyup", e => {
    releaseFlashGameplayKey(e);
    if (e.key === "Control") {
        isCtrlDown = false;
        ctrlHandledThisPress = false;
    }
});

window.addEventListener("blur", resetFlashGameplayKeys);
document.addEventListener("visibilitychange", () => {
    if (document.hidden) resetFlashGameplayKeys();
});

function addInfoMessage(text, durationMs) {
    if (!text) return;
    const safeDuration = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 2500;
    infoMessages.unshift({
        text: String(text),
        createdAt: performance.now(),
        duration: safeDuration
    });
    if (infoMessages.length > 6) infoMessages.pop();
}

function mapToScreenX(x) {
    const dx = x - cameraX;
    return LOGICAL_WIDTH / 2 + dx;
}

function mapToScreenY(y) {
    const dy = y - cameraY;
    return LOGICAL_HEIGHT / 2 + dy;
}

function screenToMapInto(screenX, screenY, out, scale = getWorldViewportScale()) {
    const centerX = canvas && canvas.width ? canvas.width / 2 : LOGICAL_WIDTH / 2;
    const centerY = canvas && canvas.height ? canvas.height / 2 : LOGICAL_HEIGHT / 2;
    const dx = (screenX - centerX) / scale;
    const dy = (screenY - centerY) / scale;
    out.x = cameraX + dx;
    out.y = cameraY + dy;
    return out;
}

function screenToMap(screenX, screenY) {
    return screenToMapInto(screenX, screenY, {
        x: 0,
        y: 0
    });
}
