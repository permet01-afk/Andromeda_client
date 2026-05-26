function getStarfieldAnchor(cameraXValue, cameraYValue, out = null) {
    const camX = typeof cameraXValue === "number" ? cameraXValue : 0;
    const camY = typeof cameraYValue === "number" ? cameraYValue : 0;
    const halfW = canvas ? canvas.width / 2 : 0;
    const halfH = canvas ? canvas.height / 2 : 0;
    const scale = typeof getWorldScaleValue === "function" ? getWorldScaleValue() : 1;
    const anchor = out || {
        x: 0,
        y: 0
    };
    anchor.x = halfW - camX * scale;
    anchor.y = halfH - camY * scale;
    return anchor;
}

function resetStarfieldStars(stars, width, height, count) {
    stars.length = count;
    for (let i = 0; i < count; i++) {
        const star = stars[i] || {
            x: 0,
            y: 0,
            speed: 0
        };
        star.x = Math.random() * width;
        star.y = Math.random() * height;
        star.speed = Math.random() * (STARFIELD_SPEED_MAX - STARFIELD_SPEED_MIN) + STARFIELD_SPEED_MIN;
        stars[i] = star;
    }
}

function ensureStarfieldInitialized(forceReset = false) {
    if (!starfieldEnabled) return;
    const width = canvas ? canvas.width : 0;
    const height = canvas ? canvas.height : 0;
    if (!width || !height) return;
    const needsReinit = forceReset || !starfieldState || starfieldState.width !== width || starfieldState.height !== height || !Array.isArray(starfieldState.stars) || starfieldState.stars.length !== STARFIELD_DEFAULT_COUNT;
    if (!needsReinit) return;
    const starCount = STARFIELD_DEFAULT_COUNT;
    const state = starfieldState && Array.isArray(starfieldState.stars) ? starfieldState : {
        stars: []
    };
    resetStarfieldStars(state.stars, width, height, starCount);
    state.width = width;
    state.height = height;
    state.velocityX = 0;
    state.velocityY = 0;
    state.lastTick = performance.now();
    state.timeAccumulator = 0;
    starfieldState = state;
    getStarfieldAnchor(cameraX, cameraY, lastStarfieldAnchor);
}

function resetStarfieldState() {
    getStarfieldAnchor(cameraX, cameraY, lastStarfieldAnchor);
    ensureStarfieldInitialized(true);
}

function setStarfieldEnabled(enabled, color = STARFIELD_DEFAULT_COLOR) {
    starfieldEnabled = !!enabled;
    starfieldColor = Number.isFinite(color) ? color : STARFIELD_DEFAULT_COLOR;
    resetStarfieldState();
}

function setStarfieldStateFromMap(mapId, settings = null) {
    const cfg = settings || (mapStarfieldSettingsById ? mapStarfieldSettingsById[mapId] : null) || {
        enabled: DEFAULT_STARFIELD_ENABLED,
        color: STARFIELD_DEFAULT_COLOR
    };
    setStarfieldEnabled(cfg.enabled, cfg.color);
}

function updateStarfield(cameraXValue, cameraYValue) {
    if (!starfieldEnabled) return;
    ensureStarfieldInitialized();
    if (!starfieldState || !starfieldState.stars.length) return;
    const targetAnchor = updateStarfield._targetAnchor || (updateStarfield._targetAnchor = {
        x: 0,
        y: 0
    });
    getStarfieldAnchor(cameraXValue, cameraYValue, targetAnchor);
    const deltaX = targetAnchor.x - lastStarfieldAnchor.x;
    const deltaY = targetAnchor.y - lastStarfieldAnchor.y;
    let moveX = deltaX || 0;
    let moveY = deltaY || 0;
    if (moveX === 0 && moveY === 0) {
        moveX = STARFIELD_IDLE_SPEED;
        moveY = 0;
    }
    starfieldState.velocityX = moveX;
    starfieldState.velocityY = moveY;
    const now = performance.now();
    const tickDuration = 1e3 / STARFIELD_FPS;
    starfieldState.timeAccumulator += Math.max(0, now - (starfieldState.lastTick || now));
    while (starfieldState.timeAccumulator >= tickDuration) {
        const stars = starfieldState.stars;
        for (let i = 0; i < stars.length; i++) {
            const star = stars[i];
            const nextX = star.x + starfieldState.velocityX * star.speed;
            const nextY = star.y + starfieldState.velocityY * star.speed;
            star.x = nextX < 0 ? nextX + starfieldState.width : nextX > starfieldState.width ? nextX - starfieldState.width : nextX;
            star.y = nextY < 0 ? nextY + starfieldState.height : nextY > starfieldState.height ? nextY - starfieldState.height : nextY;
        }
        starfieldState.timeAccumulator -= tickDuration;
    }
    starfieldState.lastTick = now;
    lastStarfieldAnchor.x = targetAnchor.x;
    lastStarfieldAnchor.y = targetAnchor.y;
}

function drawStarfield() {
    if (!starfieldEnabled || !starfieldState || !starfieldState.stars.length) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = `#${(starfieldColor >>> 0).toString(16).padStart(6, "0")}`;
    const stars = starfieldState.stars;
    for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        const x = Math.round(star.x);
        const y = Math.round(star.y);
        ctx.fillRect(x, y, 1, 1);
    }
    ctx.restore();
}

const rocketSpriteCache = {};

function getRocketSprite(rocketId) {
    if (typeof ROCKET_SPRITE_DEFS === "undefined") return null;
    const hasDef = Number.isFinite(rocketId) && ROCKET_SPRITE_DEFS[rocketId];
    const fallbackId = typeof DEFAULT_ROCKET_SPRITE_ID === "number" ? DEFAULT_ROCKET_SPRITE_ID : null;
    const resolvedId = hasDef ? rocketId : fallbackId;
    if (resolvedId == null || !ROCKET_SPRITE_DEFS[resolvedId]) return null;
    const cacheKey = hasDef ? rocketId : resolvedId;
    if (!rocketSpriteCache[cacheKey]) {
        const def = ROCKET_SPRITE_DEFS[resolvedId];
        const img = andromedaCreateImage(def.path);
        rocketSpriteCache[cacheKey] = {
            img: img,
            width: def.width,
            height: def.height
        };
    }
    return rocketSpriteCache[cacheKey];
}

function getCurrentLogicalViewportRect(out = null) {
    const viewport = out || {
        left: 0,
        top: 0,
        right: LOGICAL_WIDTH,
        bottom: LOGICAL_HEIGHT
    };
    const worldScale = typeof getWorldScaleValue === "function" ? getWorldScaleValue() : 1;
    const mapScale = typeof getMapViewScaleValue === "function" ? getMapViewScaleValue() : 1;
    const totalScale = worldScale * mapScale;
    if (!Number.isFinite(totalScale) || totalScale <= 0 || typeof canvas === "undefined" || !canvas) {
        viewport.left = 0;
        viewport.top = 0;
        viewport.right = LOGICAL_WIDTH;
        viewport.bottom = LOGICAL_HEIGHT;
        return viewport;
    }
    const halfW = canvas.width / 2 / totalScale;
    const halfH = canvas.height / 2 / totalScale;
    viewport.left = LOGICAL_WIDTH / 2 - halfW;
    viewport.top = LOGICAL_HEIGHT / 2 - halfH;
    viewport.right = LOGICAL_WIDTH / 2 + halfW;
    viewport.bottom = LOGICAL_HEIGHT / 2 + halfH;
    return viewport;
}

function drawImageClippedToLogicalViewport(img, destX, destY, destW, destH, viewport) {
    const destRight = destX + destW;
    const destBottom = destY + destH;
    const clipLeft = Math.max(destX, viewport.left);
    const clipTop = Math.max(destY, viewport.top);
    const clipRight = Math.min(destRight, viewport.right);
    const clipBottom = Math.min(destBottom, viewport.bottom);
    if (clipRight <= clipLeft || clipBottom <= clipTop) return false;
    if (clipLeft === destX && clipTop === destY && clipRight === destRight && clipBottom === destBottom) {
        ctx.drawImage(img, destX, destY, destW, destH);
        return true;
    }
    const sourceScaleX = img.width / destW;
    const sourceScaleY = img.height / destH;
    const sourceX = (clipLeft - destX) * sourceScaleX;
    const sourceY = (clipTop - destY) * sourceScaleY;
    const sourceW = (clipRight - clipLeft) * sourceScaleX;
    const sourceH = (clipBottom - clipTop) * sourceScaleY;
    ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, clipLeft, clipTop, clipRight - clipLeft, clipBottom - clipTop);
    return true;
}

function getBackgroundLayerRenderMeta(layer, bg) {
    const offsets = layer.offsets;
    const offsetX = offsets ? offsets.x || 0 : layer.shiftX || 0;
    const offsetY = offsets ? offsets.y || 0 : layer.shiftY || 0;
    const parallax = layer.parallax || DEFAULT_BACKGROUND_PARALLAX;
    let meta = layer._renderMeta;
    if (!meta) {
        meta = layer._renderMeta = {};
    }
    if (meta.image !== bg || meta.imageWidth !== bg.width || meta.imageHeight !== bg.height || meta.parallax !== parallax || meta.offsetX !== offsetX || meta.offsetY !== offsetY) {
        meta.image = bg;
        meta.imageWidth = bg.width;
        meta.imageHeight = bg.height;
        meta.drawWidth = bg.width;
        meta.drawHeight = bg.height;
        meta.parallax = parallax;
        meta.offsetX = offsetX;
        meta.offsetY = offsetY;
    }
    return meta;
}

function drawMapBackground() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    updateStarfield(cameraX, cameraY);
    if (backgroundLayersEnabled && currentBackgroundLayers && currentBackgroundLayers.length) {
        const viewport = getCurrentLogicalViewportRect(drawMapBackground._viewport || (drawMapBackground._viewport = {
            left: 0,
            top: 0,
            right: LOGICAL_WIDTH,
            bottom: LOGICAL_HEIGHT
        }));
        for (let i = 0; i < currentBackgroundLayers.length; i++) {
            const layer = currentBackgroundLayers[i];
            const bg = layer.image;
            if (!bg || !bg.complete || bg.width === 0 || bg.height === 0) continue;
            const meta = getBackgroundLayerRenderMeta(layer, bg);
            const drawWidth = meta.drawWidth;
            const drawHeight = meta.drawHeight;
            if (drawWidth < 1 || drawHeight < 1) continue;
            const screenX = LOGICAL_WIDTH / 2 - cameraX / meta.parallax + meta.offsetX;
            const screenY = LOGICAL_HEIGHT / 2 - cameraY / meta.parallax + meta.offsetY;
            const previousSmoothing = ctx.imageSmoothingEnabled;
            ctx.imageSmoothingEnabled = false;
            drawImageClippedToLogicalViewport(bg, screenX, screenY, drawWidth, drawHeight, viewport);
            ctx.imageSmoothingEnabled = previousSmoothing;
        }
    }
    drawStarfield();
}

const ENGINE_FRAME_DURATION = 1e3 / (ENGINE_SPRITE_DEFS[DEFAULT_ENGINE_KEY]?.fps || ENGINE_ANIM_FPS || 20);

const ENGINE_MOVING_MAX_TICKS = 3;

const ENGINE_MOVE_EPS_SQ = .25;

const engineAnimationState = {};

const engineSmokeState = {};

const ENGINE_SMOKE_PARTICLE_POOL_LIMIT = 2048;

const engineSmokeParticlePool = [];

function acquireEngineSmokeParticle(ownerKey, x, y, createdAt) {
    const particle = engineSmokeParticlePool.length > 0 ? engineSmokeParticlePool.pop() : {
        x: 0,
        y: 0,
        createdAt: 0,
        ownerKey: "",
        active: false
    };
    particle.x = x;
    particle.y = y;
    particle.createdAt = createdAt;
    particle.ownerKey = ownerKey || "";
    particle.active = true;
    return particle;
}

function releaseEngineSmokeParticle(particle) {
    if (!particle) return;
    particle.x = 0;
    particle.y = 0;
    particle.createdAt = 0;
    particle.ownerKey = "";
    particle.active = false;
    if (engineSmokeParticlePool.length < ENGINE_SMOKE_PARTICLE_POOL_LIMIT) {
        engineSmokeParticlePool.push(particle);
    }
}

const ENGINE_VISUAL_SHIFT_SHIP_IDS = new Set([ 63, 64, 65, 66, 67 ]);

function shouldApplyEngineVisualShift(shipId) {
    const numericShipId = Number(shipId);
    return ENGINE_VISUAL_SHIFT_SHIP_IDS.has(numericShipId);
}

const BOX_ANIMATION_FRAME_DURATION = 25;

const BONUS_BOX_ANIMATION_FRAME_DURATION = 25;

const BOX_SPRITE_CONFIG = {
    cargo: {
        basePath: "graphics/collectables/box1/",
        frameCount: 25
    },
    bonus: {
        basePath: "graphics/collectables/box2/",
        frameCount: 24
    },
    booty: {
        basePath: "graphics/collectables/pirateBootyBox/",
        frameCount: 25
    }
};

const boxAnimationStates = {};

let bonusBoxFrameIndex = 0;

let bonusBoxAnimationTimer = null;

const BOOTY_KEY_SPRITE_PATH = UI_SPRITES.iconBootyKey || "graphics/ui/ui/images/59_shipInfoIcon_bootykey.png";

const bootyKeySprite = getUiImage(BOOTY_KEY_SPRITE_PATH);

const RANK_ICON_PATHS = {
    1: "graphics/ui/icons/images/37_rank1.png",
    2: "graphics/ui/icons/images/36_rank2.png",
    3: "graphics/ui/icons/images/35_rank3.png",
    4: "graphics/ui/icons/images/34_rank4.png",
    5: "graphics/ui/icons/images/33_rank5.png",
    6: "graphics/ui/icons/images/32_rank6.png",
    7: "graphics/ui/icons/images/31_rank7.png",
    8: "graphics/ui/icons/images/30_rank8.png",
    9: "graphics/ui/icons/images/29_rank9.png",
    10: "graphics/ui/icons/images/28_rank10.png",
    11: "graphics/ui/icons/images/27_rank11.png",
    12: "graphics/ui/icons/images/26_rank12.png",
    13: "graphics/ui/icons/images/25_rank13.png",
    14: "graphics/ui/icons/images/24_rank14.png",
    15: "graphics/ui/icons/images/23_rank15.png",
    16: "graphics/ui/icons/images/22_rank16.png",
    17: "graphics/ui/icons/images/21_rank17.png",
    18: "graphics/ui/icons/images/20_rank18.png",
    19: "graphics/ui/icons/images/19_rank19.png",
    20: "graphics/ui/icons/images/18_rank20.png",
    21: "graphics/ui/icons/images/17_rank21.png",
    22: "graphics/ui/icons/images/16_rank22.png",
    23: "graphics/ui/icons/images/rank_23.png"
};

const FACTION_ICON_PATHS = {
    1: "graphics/ui/icons/images/62_fraction1.png",
    2: "graphics/ui/icons/images/63_fraction2.png",
    3: "graphics/ui/icons/images/61_fraction3.png"
};

const ACHIEVEMENT_ICON_PATHS = {
    1: "graphics/ui/icons/images/achievment/39_achievement_1.png",
    2: "graphics/ui/icons/images/achievment/3_achievement_2.png",
    3: "graphics/ui/icons/images/achievment/4_achievement_3.png",
    4: "graphics/ui/icons/images/achievment/60_achievement_4.png"
};

const ORE_ANIMATION_FRAME_DURATION = 25;

const ORE_SPRITE_CONFIG = {
    oreBlue: {
        basePath: "graphics/collectables/oreBlue/",
        frameCount: 26
    },
    oreRed: {
        basePath: "graphics/collectables/oreRed/",
        frameCount: 26
    },
    oreYellow: {
        basePath: "graphics/collectables/oreYellow/",
        frameCount: 26
    }
};

const oreAnimationStates = {};

const COLLECTABLES_ATLAS_ENABLED = true;

const COLLECTABLES_ATLAS_PATH = "graphics/atlas/collectables_v1.png";

const COLLECTABLES_ATLAS_ROWS = Object.freeze({
    cargo: {
        y: 0,
        width: 128,
        height: 128,
        frameCount: 26
    },
    bonus: {
        y: 128,
        width: 100,
        height: 72,
        frameCount: 24
    },
    booty: {
        y: 200,
        width: 72,
        height: 72,
        frameCount: 25
    },
    oreBlue: {
        y: 272,
        width: 48,
        height: 48,
        frameCount: 26
    },
    oreRed: {
        y: 320,
        width: 48,
        height: 48,
        frameCount: 26
    },
    oreYellow: {
        y: 368,
        width: 48,
        height: 48,
        frameCount: 26
    }
});

let collectablesAtlasImage = null;

let collectablesAtlasStatus = COLLECTABLES_ATLAS_ENABLED ? "idle" : "disabled";

let collectablesAtlasListenersBound = false;

function markCollectablesAtlasReadyIfDecoded(img) {
    if (img && img.complete && img.width > 0 && img.height > 0) {
        collectablesAtlasStatus = "ready";
        return true;
    }
    return false;
}

function getCollectablesAtlasImage() {
    if (!COLLECTABLES_ATLAS_ENABLED) return null;
    if (!collectablesAtlasImage) {
        collectablesAtlasImage = andromedaCreateImage(COLLECTABLES_ATLAS_PATH);
        collectablesAtlasStatus = markCollectablesAtlasReadyIfDecoded(collectablesAtlasImage) ? "ready" : "loading";
    }
    if (!collectablesAtlasListenersBound && collectablesAtlasImage) {
        collectablesAtlasListenersBound = true;
        collectablesAtlasImage.addEventListener("load", () => {
            collectablesAtlasStatus = "ready";
        }, {
            once: true
        });
        collectablesAtlasImage.addEventListener("error", () => {
            collectablesAtlasStatus = "error";
        }, {
            once: true
        });
    }
    markCollectablesAtlasReadyIfDecoded(collectablesAtlasImage);
    return collectablesAtlasImage;
}

function getCollectablesAtlasFrame(rowKey, frameIndex) {
    const row = COLLECTABLES_ATLAS_ROWS[rowKey];
    if (!row) return null;
    const atlas = getCollectablesAtlasImage();
    if (!atlas) return null;
    if (collectablesAtlasStatus !== "ready") {
        return collectablesAtlasStatus === "error" ? null : {
            pendingAtlas: true,
            width: row.width,
            height: row.height
        };
    }
    const idx = (frameIndex % row.frameCount + row.frameCount) % row.frameCount;
    const sx = idx * row.width;
    const sy = row.y;
    if (sx + row.width > atlas.width || sy + row.height > atlas.height) {
        collectablesAtlasStatus = "error";
        return null;
    }
    return {
        atlas: atlas,
        sx: sx,
        sy: sy,
        sw: row.width,
        sh: row.height,
        width: row.width,
        height: row.height
    };
}

function drawCollectableFrame(frameDef, screenX, screenY) {
    if (!frameDef || frameDef.pendingAtlas) return false;
    if (frameDef.atlas) {
        ctx.drawImage(frameDef.atlas, frameDef.sx, frameDef.sy, frameDef.sw, frameDef.sh, screenX - frameDef.width / 2, screenY - frameDef.height / 2, frameDef.width, frameDef.height);
        return true;
    }
    const img = frameDef.img;
    if (!img || !img.complete || img.width <= 0 || img.height <= 0) return false;
    frameDef.width = img.width;
    frameDef.height = img.height;
    ctx.drawImage(img, screenX - img.width / 2, screenY - img.height / 2);
    return true;
}

function drawCenteredEffectFrame(frameDef, centerX, centerY, scale = 1) {
    if (!frameDef || frameDef.pendingAtlas) return false;
    if (frameDef.atlas) {
        const drawW = frameDef.width * scale;
        const drawH = frameDef.height * scale;
        ctx.drawImage(frameDef.atlas, frameDef.sx, frameDef.sy, frameDef.sw, frameDef.sh, centerX - drawW / 2, centerY - drawH / 2, drawW, drawH);
        return true;
    }
    const img = frameDef.img || frameDef;
    if (!img || !img.complete || img.width <= 0 || img.height <= 0) return false;
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    ctx.drawImage(img, centerX - drawW / 2, centerY - drawH / 2, drawW, drawH);
    return true;
}

function drawAnchoredEffectFrame(frameDef, anchorX, anchorY, scale = 1, options = {}) {
    if (!frameDef || frameDef.pendingAtlas) return false;
    const source = frameDef.atlas || frameDef.img || frameDef;
    if (!source || !source.complete || source.width <= 0 || source.height <= 0) return false;
    const sourceWidth = frameDef.width || source.width;
    const sourceHeight = frameDef.height || source.height;
    if (sourceWidth <= 0 || sourceHeight <= 0) return false;
    const drawW = sourceWidth * scale;
    const drawH = sourceHeight * scale;
    const pivotX = typeof options.pivotX === "number" ? options.pivotX * scale : drawW / 2;
    const pivotY = typeof options.pivotY === "number" ? options.pivotY * scale : drawH / 2;
    const rotation = Number.isFinite(options.rotation) ? options.rotation : 0;
    ctx.save();
    if (typeof options.alpha === "number") {
        ctx.globalAlpha = Math.max(0, Math.min(1, options.alpha));
    }
    ctx.translate(anchorX, anchorY);
    if (rotation) ctx.rotate(rotation);
    if (frameDef.atlas) {
        ctx.drawImage(frameDef.atlas, frameDef.sx, frameDef.sy, frameDef.sw, frameDef.sh, -pivotX, -pivotY, drawW, drawH);
    } else {
        ctx.drawImage(source, -pivotX, -pivotY, drawW, drawH);
    }
    ctx.restore();
    return true;
}

const COLLECTOR_BEAM_FRAME_COUNT = 15;

const COLLECTOR_BEAM_FPS = 30;

const COLLECTOR_BEAM_FRAME_DURATION = 1e3 / COLLECTOR_BEAM_FPS;

const COLLECTOR_BEAM_DEFAULT_DURATION_MS = 1500;

const COLLECTOR_BEAM_ATLAS_SECTION = "loopingCollectorBeam";

const FLASH_BOX_BEAM_FRAME_COUNT = 20;

const FLASH_BOX_BEAM_FPS = 20;

const FLASH_BOX_BEAM_DEFAULT_DURATION_MS = 1e3;

const FLASH_BOX_BEAM_FRAME_BASE_PATH = "graphics/pyroEffects/beam1/frame_";

const FLASH_BOX_BEAM_OFFSET_X = -92;

const FLASH_BOX_BEAM_OFFSET_Y = -144;

const collectorBeamCache = [];

const flashBoxBeamCache = [];

const activeCollectableBoxBeams = [];

const FLASH_COLLECTABLE_REMOVE_FADE_MS = 500;

const activeCollectableFadeOuts = [];

let heroCollectorBeamState = null;

let flashBoxBeamFramesPreloaded = false;

const REPAIR_ROBOT_ATLAS = Object.freeze({
    path: "graphics/atlas/repair_robot_v1.png",
    frameWidth: 150,
    frameHeight: 150,
    frameCount: 140,
    atlasColumns: 14,
    atlasCellWidth: 152,
    atlasCellHeight: 152,
    atlasPadding: 1,
    offsetY: 0,
    fps: 30
});

const REPAIR_ROBOT_FRAME_COUNT = REPAIR_ROBOT_ATLAS.frameCount;

const REPAIR_ROBOT_FRAME_DURATION = 1e3 / REPAIR_ROBOT_ATLAS.fps;

const REPAIR_ROBOT_OFFSET_Y = REPAIR_ROBOT_ATLAS.offsetY;

const BATTLE_REPAIR_ROBOT_ATLAS = Object.freeze({
    path: "graphics/atlas/battle_repair_robot_v1.png",
    frameWidth: 175,
    frameHeight: 175,
    frameCount: 140,
    atlasColumns: 14,
    atlasCellWidth: 177,
    atlasCellHeight: 177,
    atlasPadding: 1,
    offsetY: 0,
    fps: 30
});

const BATTLE_REPAIR_ROBOT_FRAME_COUNT = BATTLE_REPAIR_ROBOT_ATLAS.frameCount;

const BATTLE_REPAIR_ROBOT_FRAME_DURATION = 1e3 / BATTLE_REPAIR_ROBOT_ATLAS.fps;

const BATTLE_REPAIR_ROBOT_OFFSET_Y = BATTLE_REPAIR_ROBOT_ATLAS.offsetY;

let repairRobotAtlasImage = null;

let repairRobotAtlasStatus = "idle";

let repairRobotAtlasListenersBound = false;

let repairRobotState = null;

let battleRepairRobotAtlasImage = null;

let battleRepairRobotAtlasStatus = "idle";

let battleRepairRobotAtlasListenersBound = false;

let battleRepairRobotState = null;

function getCollectorBeamFrame(frameIndex) {
    const idx = (frameIndex % COLLECTOR_BEAM_FRAME_COUNT + COLLECTOR_BEAM_FRAME_COUNT) % COLLECTOR_BEAM_FRAME_COUNT;
    if (collectorBeamCache[idx]) return collectorBeamCache[idx];
    if (typeof getEffectsMiscAtlasFrame !== "function") return null;
    const frameDef = getEffectsMiscAtlasFrame(COLLECTOR_BEAM_ATLAS_SECTION, idx);
    if (frameDef && !frameDef.pendingAtlas) {
        collectorBeamCache[idx] = frameDef;
    }
    return frameDef;
}

function getFlashBoxBeamFrame(frameIndex) {
    const idx = Math.max(0, Math.min(FLASH_BOX_BEAM_FRAME_COUNT - 1, frameIndex | 0));
    if (flashBoxBeamCache[idx]) return flashBoxBeamCache[idx];
    const path = `${FLASH_BOX_BEAM_FRAME_BASE_PATH}${String(idx).padStart(3, "0")}.png`;
    const img = andromedaCreateImage(path);
    flashBoxBeamCache[idx] = img;
    return img;
}

function ensureFlashBoxBeamFramesPreloaded() {
    if (flashBoxBeamFramesPreloaded) return;
    flashBoxBeamFramesPreloaded = true;
    for (let i = 0; i < FLASH_BOX_BEAM_FRAME_COUNT; i++) {
        getFlashBoxBeamFrame(i);
    }
}

function startCollectableBoxBeam(worldX, worldY, durationMs = FLASH_BOX_BEAM_DEFAULT_DURATION_MS) {
    if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) return;
    ensureFlashBoxBeamFramesPreloaded();
    activeCollectableBoxBeams.push({
        x: worldX,
        y: worldY,
        startedAt: performance.now(),
        durationMs: durationMs || FLASH_BOX_BEAM_DEFAULT_DURATION_MS
    });
    if (activeCollectableBoxBeams.length > 32) {
        activeCollectableBoxBeams.splice(0, activeCollectableBoxBeams.length - 32);
    }
}

function drawActiveCollectableBoxBeams(now) {
    if (!activeCollectableBoxBeams.length) return;
    let keepCount = 0;
    for (let i = 0; i < activeCollectableBoxBeams.length; i++) {
        const beam = activeCollectableBoxBeams[i];
        if (!beam) {
            continue;
        }
        const durationMs = beam.durationMs || FLASH_BOX_BEAM_DEFAULT_DURATION_MS;
        const elapsed = now - beam.startedAt;
        if (elapsed >= durationMs) {
            continue;
        }
        activeCollectableBoxBeams[keepCount++] = beam;
        const progress = durationMs > 0 ? Math.max(0, Math.min(.999999, elapsed / durationMs)) : 0;
        const frameIndex = Math.min(FLASH_BOX_BEAM_FRAME_COUNT - 1, Math.floor(progress * FLASH_BOX_BEAM_FRAME_COUNT));
        const img = getFlashBoxBeamFrame(frameIndex);
        if (!img || !img.complete || img.width <= 0 || img.height <= 0) {
            continue;
        }
        const screenX = mapToScreenX(beam.x);
        const screenY = mapToScreenY(beam.y);
        ctx.drawImage(img, screenX + FLASH_BOX_BEAM_OFFSET_X, screenY + FLASH_BOX_BEAM_OFFSET_Y);
    }
    activeCollectableBoxBeams.length = keepCount;
}

function clearCollectableFadeOut(identifier) {
    if (identifier == null || !activeCollectableFadeOuts.length) return;
    let keepCount = 0;
    for (let i = 0; i < activeCollectableFadeOuts.length; i++) {
        const fade = activeCollectableFadeOuts[i];
        if (!fade) {
            continue;
        }
        if (fade.id == identifier || fade.serverId == identifier) {
            continue;
        }
        activeCollectableFadeOuts[keepCount++] = fade;
    }
    activeCollectableFadeOuts.length = keepCount;
}

function startCollectableFadeOut(entity, durationMs = FLASH_COLLECTABLE_REMOVE_FADE_MS) {
    if (!entity || entity.kind !== "box") return;
    const now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    const category = entity.category || "other";
    const fade = {
        id: entity.id,
        serverId: entity.serverId,
        kind: "box",
        x: Number(entity.x) || 0,
        y: Number(entity.y) || 0,
        type: entity.type,
        category: category,
        oreSprite: entity.oreSprite || null,
        startedAt: now,
        durationMs: durationMs || FLASH_COLLECTABLE_REMOVE_FADE_MS,
        renderMode: "shape",
        frameIndex: 0,
        spriteKey: null
    };
    if (category === "ore") {
        fade.renderMode = "ore";
        fade.spriteKey = getOreSpriteKeyFromType(entity.type, entity.oreSprite);
        const oreAnim = entity.id != null ? oreAnimationStates[entity.id] : null;
        fade.frameIndex = oreAnim && Number.isFinite(oreAnim.frameIndex) ? oreAnim.frameIndex : 0;
    } else if (category === "bonusBox" || category === "cargoFree" || category === "cargoNotFree" || category === "bootyBox") {
        fade.renderMode = "animatedBox";
        if (category === "bonusBox") {
            fade.frameIndex = bonusBoxFrameIndex | 0;
        } else {
            const boxAnim = entity.id != null ? boxAnimationStates[entity.id] : null;
            fade.frameIndex = boxAnim && Number.isFinite(boxAnim.frameIndex) ? boxAnim.frameIndex : 0;
        }
    } else if (category === "bootyKey") {
        fade.renderMode = "bootyKey";
    }
    clearCollectableFadeOut(fade.id);
    clearCollectableFadeOut(fade.serverId);
    activeCollectableFadeOuts.push(fade);
    if (activeCollectableFadeOuts.length > 64) {
        activeCollectableFadeOuts.splice(0, activeCollectableFadeOuts.length - 64);
    }
}

function drawCollectableFadeOutEntry(fade, now) {
    if (!fade) return;
    const dx = fade.x - shipX;
    const dy = fade.y - shipY;
    if (dx * dx + dy * dy > VIEW_RADIUS_SQ) return;
    if (!isEntityVisibleOnMap(fade)) return;
    const durationMs = fade.durationMs || FLASH_COLLECTABLE_REMOVE_FADE_MS;
    const elapsed = now - fade.startedAt;
    const alpha = Math.max(0, 1 - elapsed / durationMs);
    if (!(alpha > 0)) return;
    const boxScreenX = mapToScreenX(fade.x);
    const boxScreenY = mapToScreenY(fade.y);
    ctx.save();
    ctx.globalAlpha *= alpha;
    if (fade.renderMode === "ore") {
        const frameImg = getOreSpriteFrame(fade.spriteKey, fade.frameIndex | 0);
        if (frameImg && drawCollectableFrame(frameImg, boxScreenX, boxScreenY)) {
            ctx.restore();
            return;
        }
    } else if (fade.renderMode === "animatedBox") {
        const spriteCategory = fade.category === "bonusBox" ? "bonusBox" : fade.category === "bootyBox" ? "bootyBox" : fade.category;
        const frameImg = getBoxSpriteFrame(spriteCategory, fade.frameIndex | 0);
        if (frameImg && drawCollectableFrame(frameImg, boxScreenX, boxScreenY)) {
            ctx.restore();
            return;
        }
    } else if (fade.renderMode === "bootyKey") {
        const img = bootyKeySprite;
        if (img && img.complete && img.width > 0 && img.height > 0) {
            ctx.drawImage(img, boxScreenX - img.width / 2, boxScreenY - img.height / 2);
            ctx.restore();
            return;
        }
    }
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(boxScreenX, boxScreenY, boxMarkerSize / 2, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.restore();
}

function drawActiveCollectableFadeOuts(now) {
    if (!activeCollectableFadeOuts.length) return;
    let keepCount = 0;
    for (let i = 0; i < activeCollectableFadeOuts.length; i++) {
        const fade = activeCollectableFadeOuts[i];
        if (!fade) {
            continue;
        }
        const durationMs = fade.durationMs || FLASH_COLLECTABLE_REMOVE_FADE_MS;
        if (now - fade.startedAt >= durationMs) {
            continue;
        }
        activeCollectableFadeOuts[keepCount++] = fade;
        drawCollectableFadeOutEntry(fade, now);
    }
    activeCollectableFadeOuts.length = keepCount;
}

function markRepairRobotAtlasReadyIfDecoded(img) {
    if (img && img.complete && img.width > 0 && img.height > 0) {
        repairRobotAtlasStatus = "ready";
        return true;
    }
    return false;
}

function getRepairRobotAtlasImage() {
    if (!repairRobotAtlasImage) {
        repairRobotAtlasImage = andromedaCreateImage(REPAIR_ROBOT_ATLAS.path);
        repairRobotAtlasStatus = markRepairRobotAtlasReadyIfDecoded(repairRobotAtlasImage) ? "ready" : "loading";
    }
    if (!repairRobotAtlasListenersBound && repairRobotAtlasImage) {
        repairRobotAtlasListenersBound = true;
        repairRobotAtlasImage.addEventListener("load", () => {
            repairRobotAtlasStatus = "ready";
        }, {
            once: true
        });
        repairRobotAtlasImage.addEventListener("error", () => {
            repairRobotAtlasStatus = "error";
        }, {
            once: true
        });
    }
    markRepairRobotAtlasReadyIfDecoded(repairRobotAtlasImage);
    return repairRobotAtlasImage;
}

function getRepairRobotFrame(frameIndex) {
    const atlas = getRepairRobotAtlasImage();
    if (!atlas) return null;
    if (repairRobotAtlasStatus !== "ready") {
        return repairRobotAtlasStatus === "error" ? null : {
            pendingAtlas: true,
            width: REPAIR_ROBOT_ATLAS.frameWidth,
            height: REPAIR_ROBOT_ATLAS.frameHeight
        };
    }
    const idx = (frameIndex % REPAIR_ROBOT_FRAME_COUNT + REPAIR_ROBOT_FRAME_COUNT) % REPAIR_ROBOT_FRAME_COUNT;
    const columns = Math.max(1, REPAIR_ROBOT_ATLAS.atlasColumns || 1);
    const cellWidth = REPAIR_ROBOT_ATLAS.atlasCellWidth || REPAIR_ROBOT_ATLAS.frameWidth;
    const cellHeight = REPAIR_ROBOT_ATLAS.atlasCellHeight || REPAIR_ROBOT_ATLAS.frameHeight;
    const padding = REPAIR_ROBOT_ATLAS.atlasPadding || 0;
    const col = idx % columns;
    const row = Math.floor(idx / columns);
    const sx = col * cellWidth + padding;
    const sy = row * cellHeight + padding;
    const sw = REPAIR_ROBOT_ATLAS.frameWidth;
    const sh = REPAIR_ROBOT_ATLAS.frameHeight;
    if (sx + sw > atlas.width || sy + sh > atlas.height) {
        repairRobotAtlasStatus = "error";
        return null;
    }
    return {
        atlas: atlas,
        sx: sx,
        sy: sy,
        sw: sw,
        sh: sh,
        width: REPAIR_ROBOT_ATLAS.frameWidth,
        height: REPAIR_ROBOT_ATLAS.frameHeight
    };
}

function markBattleRepairRobotAtlasReadyIfDecoded(img) {
    if (img && img.complete && img.width > 0 && img.height > 0) {
        battleRepairRobotAtlasStatus = "ready";
        return true;
    }
    return false;
}

function getBattleRepairRobotAtlasImage() {
    if (!battleRepairRobotAtlasImage) {
        battleRepairRobotAtlasImage = andromedaCreateImage(BATTLE_REPAIR_ROBOT_ATLAS.path);
        battleRepairRobotAtlasStatus = markBattleRepairRobotAtlasReadyIfDecoded(battleRepairRobotAtlasImage) ? "ready" : "loading";
    }
    if (!battleRepairRobotAtlasListenersBound && battleRepairRobotAtlasImage) {
        battleRepairRobotAtlasListenersBound = true;
        battleRepairRobotAtlasImage.addEventListener("load", () => {
            battleRepairRobotAtlasStatus = "ready";
        }, {
            once: true
        });
        battleRepairRobotAtlasImage.addEventListener("error", () => {
            battleRepairRobotAtlasStatus = "error";
        }, {
            once: true
        });
    }
    markBattleRepairRobotAtlasReadyIfDecoded(battleRepairRobotAtlasImage);
    return battleRepairRobotAtlasImage;
}

function getBattleRepairRobotFrame(frameIndex) {
    const atlas = getBattleRepairRobotAtlasImage();
    if (!atlas) return null;
    if (battleRepairRobotAtlasStatus !== "ready") {
        return battleRepairRobotAtlasStatus === "error" ? null : {
            pendingAtlas: true,
            width: BATTLE_REPAIR_ROBOT_ATLAS.frameWidth,
            height: BATTLE_REPAIR_ROBOT_ATLAS.frameHeight
        };
    }
    const idx = (frameIndex % BATTLE_REPAIR_ROBOT_FRAME_COUNT + BATTLE_REPAIR_ROBOT_FRAME_COUNT) % BATTLE_REPAIR_ROBOT_FRAME_COUNT;
    const columns = Math.max(1, BATTLE_REPAIR_ROBOT_ATLAS.atlasColumns || 1);
    const cellWidth = BATTLE_REPAIR_ROBOT_ATLAS.atlasCellWidth || BATTLE_REPAIR_ROBOT_ATLAS.frameWidth;
    const cellHeight = BATTLE_REPAIR_ROBOT_ATLAS.atlasCellHeight || BATTLE_REPAIR_ROBOT_ATLAS.frameHeight;
    const padding = BATTLE_REPAIR_ROBOT_ATLAS.atlasPadding || 0;
    const col = idx % columns;
    const row = Math.floor(idx / columns);
    const sx = col * cellWidth + padding;
    const sy = row * cellHeight + padding;
    const sw = BATTLE_REPAIR_ROBOT_ATLAS.frameWidth;
    const sh = BATTLE_REPAIR_ROBOT_ATLAS.frameHeight;
    if (sx + sw > atlas.width || sy + sh > atlas.height) {
        battleRepairRobotAtlasStatus = "error";
        return null;
    }
    return {
        atlas: atlas,
        sx: sx,
        sy: sy,
        sw: sw,
        sh: sh,
        width: BATTLE_REPAIR_ROBOT_ATLAS.frameWidth,
        height: BATTLE_REPAIR_ROBOT_ATLAS.frameHeight
    };
}

function startRepairRobotAnimation() {
    const now = performance.now();
    repairRobotState = {
        frameIndex: 0,
        lastUpdate: now
    };
}

function stopRepairRobotAnimation() {
    repairRobotState = null;
}

function startBattleRepairRobotAnimation() {
    const now = performance.now();
    battleRepairRobotState = {
        frameIndex: typeof BATTLE_REPAIR_ROBOT_FRAME_COUNT !== "undefined" && BATTLE_REPAIR_ROBOT_FRAME_COUNT > 1 ? 1 : 0,
        lastUpdate: now
    };
}

function stopBattleRepairRobotAnimation() {
    battleRepairRobotState = null;
}

let techChainImpulseEffects = [];

function flashResetAllTechItemVisualEffects() {
    techChainImpulseEffects.length = 0;
    window.heroTechEnergyLeechActive = false;
    window.heroTechEnergyLeechUntil = 0;
    window.heroTechEnergyLeechStartedAt = 0;
    if (typeof setHeroBattleRepairing === "function") {
        setHeroBattleRepairing(false);
    }
    if (typeof heroShieldBackupUntil !== "undefined") {
        heroShieldBackupUntil = 0;
    }
    if (typeof heroShieldBackupStartedAt !== "undefined") {
        heroShieldBackupStartedAt = 0;
    }
    if (typeof entities === "object" && entities) {
        for (const id in entities) {
            const ent = entities[id];
            if (!ent) continue;
            ent.techEnergyLeechActive = false;
            ent.techEnergyLeechUntil = 0;
            ent.techEnergyLeechStartedAt = 0;
            ent.techShieldBackupStartedAt = 0;
            ent.techShieldBackupUntil = 0;
            ent.techBattleRepairing = false;
            ent.techBattleRepairUntil = 0;
            ent.techBattleRepairFadeUntil = 0;
        }
    }
}

const FLASH_CHAIN_IMPULSE_BUILD_MS = 300;

const FLASH_CHAIN_IMPULSE_FADE_MS = 3000;

function flashPushChainImpulseEffect(attackerId, targetIds) {
    const attacker = parseInt(attackerId, 10);
    if (!Number.isFinite(attacker)) return;
    const targets = Array.isArray(targetIds) ? targetIds.map(value => parseInt(value, 10)).filter(value => Number.isFinite(value) && value !== 0) : [];
    if (!targets.length) return;
    const startedAt = performance.now();
    const effectDuration = targets.length * FLASH_CHAIN_IMPULSE_BUILD_MS + FLASH_CHAIN_IMPULSE_FADE_MS;
    techChainImpulseEffects.push({
        attackerId: attacker,
        targetIds: targets,
        startedAt: startedAt,
        endsAt: startedAt + effectDuration,
        seed: Math.random() * 10000
    });
    if (techChainImpulseEffects.length > 24) {
        techChainImpulseEffects.splice(0, techChainImpulseEffects.length - 24);
    }
}

window.flashResetAllTechItemVisualEffects = flashResetAllTechItemVisualEffects;
window.flashPushChainImpulseEffect = flashPushChainImpulseEffect;

function getRankIcon(rankId) {
    const path = RANK_ICON_PATHS[rankId];
    return path ? getUiImage(path) : null;
}

function getFactionIcon(factionId) {
    const path = FACTION_ICON_PATHS[factionId];
    return path ? getUiImage(path) : null;
}

function getAchievementIcon(achievementId) {
    const path = ACHIEVEMENT_ICON_PATHS[achievementId];
    return path ? getUiImage(path) : null;
}

const nameplateTextFieldBitmapCache = new Map();
const NAMEPLATE_TEXT_FIELD_BITMAP_CACHE_LIMIT = 512;
const nameplateCompositeBitmapCache = new Map();
const NAMEPLATE_COMPOSITE_BITMAP_CACHE_LIMIT = 512;
const droneDisplayBitmapCache = Object.create(null);
const _nameplateTextMeasureCanvas = document.createElement("canvas");
const _nameplateTextMeasureCtx = _nameplateTextMeasureCanvas.getContext("2d", {
    willReadFrequently: true
});
const FLASH_NAMEPLATE_FONT_FAMILIES = '"EurostileHeaFl", "Eurostile Hea", "Eurostile", "Eurostile LT Std", "Square 721 BT", "Microgramma D Extended", Tahoma, Arial, sans-serif';
let flashNameplateFontCacheRevision = 0;
let flashNameplateFontsPrimed = false;

function disposeNameplateTextFieldBitmap(canvas) {
    try {
        if (canvas && typeof canvas.width === "number") canvas.width = 0;
        if (canvas && typeof canvas.height === "number") canvas.height = 0;
    } catch (_) {}
}

function clearNameplateTextFieldBitmapCache() {
    for (const canvas of nameplateTextFieldBitmapCache.values()) {
        disposeNameplateTextFieldBitmap(canvas);
    }
    nameplateTextFieldBitmapCache.clear();
    clearNameplateCompositeBitmapCache();
}

function clearNameplateCompositeBitmapCache() {
    for (const canvas of nameplateCompositeBitmapCache.values()) {
        disposeNameplateTextFieldBitmap(canvas);
    }
    nameplateCompositeBitmapCache.clear();
}

function pruneNameplateCompositeBitmapCache() {
    while (nameplateCompositeBitmapCache.size > NAMEPLATE_COMPOSITE_BITMAP_CACHE_LIMIT) {
        const oldKey = nameplateCompositeBitmapCache.keys().next().value;
        if (oldKey === undefined) break;
        disposeNameplateTextFieldBitmap(nameplateCompositeBitmapCache.get(oldKey));
        nameplateCompositeBitmapCache.delete(oldKey);
    }
}

function touchNameplateTextFieldBitmapCacheKey(cacheKey, canvas) {
    const cached = canvas || nameplateTextFieldBitmapCache.get(cacheKey);
    if (!cached) return null;
    nameplateTextFieldBitmapCache.delete(cacheKey);
    nameplateTextFieldBitmapCache.set(cacheKey, cached);
    return cached;
}

function pruneNameplateTextFieldBitmapCache() {
    while (nameplateTextFieldBitmapCache.size > NAMEPLATE_TEXT_FIELD_BITMAP_CACHE_LIMIT) {
        const oldKey = nameplateTextFieldBitmapCache.keys().next().value;
        if (oldKey === undefined) break;
        disposeNameplateTextFieldBitmap(nameplateTextFieldBitmapCache.get(oldKey));
        nameplateTextFieldBitmapCache.delete(oldKey);
    }
}

function touchNameplateCompositeBitmapCacheKey(cacheKey, canvas) {
    const cached = canvas || nameplateCompositeBitmapCache.get(cacheKey);
    if (!cached) return null;
    nameplateCompositeBitmapCache.delete(cacheKey);
    nameplateCompositeBitmapCache.set(cacheKey, cached);
    return cached;
}

if (typeof window !== "undefined") {
    window.clearNameplateTextFieldBitmapCache = clearNameplateTextFieldBitmapCache;
}

function markFlashNameplateFontsReady() {
    flashNameplateFontCacheRevision += 1;
    clearNameplateTextFieldBitmapCache();
}

function primeFlashNameplateFonts() {
    if (flashNameplateFontsPrimed || typeof document === "undefined") return;
    flashNameplateFontsPrimed = true;
    if (!document.fonts || typeof document.fonts.load !== "function") {
        markFlashNameplateFontsReady();
        return;
    }
    Promise.allSettled([
        document.fonts.load('16px "EurostileHeaFl"', 'TEST12345'),
        document.fonts.load('16px "EurostileFl"', 'TEST12345'),
        document.fonts.ready
    ]).then(markFlashNameplateFontsReady).catch(markFlashNameplateFontsReady);
}

primeFlashNameplateFonts();

function buildNameplateTextFieldBitmap(value, color, fontSpec, fontSizePx) {
    if (!value) return null;
    const safeValue = String(value);
    const cacheKey = `flashTFv5|${flashNameplateFontCacheRevision}|${fontSpec}|${color}|${safeValue}`;
    const cached = nameplateTextFieldBitmapCache.get(cacheKey);
    if (cached) {
        touchNameplateTextFieldBitmapCacheKey(cacheKey);
        return cached;
    }
    const measureCtx = _nameplateTextMeasureCtx;
    measureCtx.font = fontSpec;
    measureCtx.textAlign = "left";
    measureCtx.textBaseline = "alphabetic";
    const metrics = measureCtx.measureText(safeValue);
    const textWidth = Math.max(1, Math.ceil(metrics.width));
    const lineAscent = Math.max(1, Math.ceil(metrics.fontBoundingBoxAscent || metrics.actualBoundingBoxAscent || Math.round(fontSizePx * 0.88)));
    const lineDescent = Math.max(1, Math.ceil(metrics.fontBoundingBoxDescent || metrics.actualBoundingBoxDescent || Math.round(fontSizePx * 0.25)));
    const flashTopInset = 2;
    const flashBottomInset = 1;
    const drawX = 2;
    const baselineY = flashTopInset + lineAscent;
    const fieldWidth = textWidth + drawX + 2;
    const fieldHeight = flashTopInset + lineAscent + lineDescent + flashBottomInset;
    const canvas = document.createElement("canvas");
    canvas.width = fieldWidth;
    canvas.height = fieldHeight;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, fieldWidth, fieldHeight);
    ctx.font = fontSpec;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.imageSmoothingEnabled = false;
    const glowOffsets = [
        [-1, 0, 0.95],
        [1, 0, 0.95],
        [0, -1, 0.95],
        [0, 1, 0.95],
        [-1, -1, 0.62],
        [1, -1, 0.62],
        [-1, 1, 0.62],
        [1, 1, 0.62]
    ];
    for (const [dx, dy, alpha] of glowOffsets) {
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        ctx.fillText(safeValue, drawX + dx, baselineY + dy);
    }
    ctx.fillStyle = color;
    ctx.fillText(safeValue, drawX, baselineY);
    nameplateTextFieldBitmapCache.set(cacheKey, canvas);
    touchNameplateTextFieldBitmapCacheKey(cacheKey, canvas);
    pruneNameplateTextFieldBitmapCache();
    return canvas;
}

function drawNameplateWithIcons(ctx, name, clanTag, centerX, baseY, fillStyle, clanTagColor, rankId = 0, factionId = 0, achievementId = 0) {
    if (!name) return null;
    const safeName = String(name).trim();
    if (!safeName) return null;
    const rankImg = getRankIcon(rankId);
    const factionImg = getFactionIcon(factionId);
    const achievementImg = getAchievementIcon(achievementId);
    const rankReady = !!(rankImg && rankImg.complete && rankImg.width > 0 && rankImg.height > 0);
    const factionReady = !!(factionImg && factionImg.complete && factionImg.width > 0 && factionImg.height > 0);
    const achievementReady = !!(achievementImg && achievementImg.complete && achievementImg.width > 0 && achievementImg.height > 0);
    const trimmedClanTag = clanTag == null ? "" : String(clanTag).trim();
    const clanText = trimmedClanTag ? `[${trimmedClanTag}]` : "";
    const fontSizePx = 16;
    const fontSpec = `${fontSizePx}px ${FLASH_NAMEPLATE_FONT_FAMILIES}`;
    const rawRankW = rankReady ? rankImg.width : 0;
    const rankH = rankReady ? rankImg.height : 0;
    const factionW = factionReady ? factionImg.width : 0;
    const factionH = factionReady ? factionImg.height : 0;
    const drawOffsetX = 0;
    const drawOffsetY = 2;
    const rankY = rankReady ? 3 : 0;
    const factionY = factionReady ? 0 : 0;
    const textFieldY = 0;
    const factionSpacing = factionReady ? 2 : 0;
    const isSpecialRank23 = Number(rankId) === 23;
    const rankLogicalW = rankReady && isSpecialRank23 ? 16 : rawRankW;
    const rankVisualOverflowLeft = rankReady && isSpecialRank23 ? Math.max(0, Math.round((rawRankW - rankLogicalW) / 2)) : 0;
    const rankVisualOverflowRight = rankReady && isSpecialRank23 ? Math.max(0, rawRankW - rankLogicalW - rankVisualOverflowLeft) : 0;
    // rank_23.png is 26x16: the central 16px rank must behave like the classic rank 20,
    // while the wing extension is shifted left so it does not eat into the player name.
    const rank23LeftAlignShift = rankReady && isSpecialRank23 ? rankVisualOverflowRight : 0;
    const rankDrawX = 0;
    const clanFieldBitmap = clanText ? buildNameplateTextFieldBitmap(clanText, clanTagColor || fillStyle, fontSpec, fontSizePx) : null;
    const nameFieldBitmap = buildNameplateTextFieldBitmap(safeName, fillStyle, fontSpec, fontSizePx);
    const clanFieldWidth = clanFieldBitmap ? clanFieldBitmap.width : 0;
    const nameFieldWidth = nameFieldBitmap ? nameFieldBitmap.width : 0;
    let totalWidth = rankLogicalW + clanFieldWidth + nameFieldWidth + factionW + factionSpacing;
    totalWidth = Math.max(1, totalWidth);
    const visualWidth = Math.max(1, totalWidth + rankVisualOverflowLeft + rankVisualOverflowRight + rank23LeftAlignShift);
    const bitmapHeight = Math.max(1, rankReady ? rankY + rankH : 0, factionReady ? factionY + factionH : 0, clanFieldBitmap ? clanFieldBitmap.height + textFieldY + 1 : 0, nameFieldBitmap ? nameFieldBitmap.height + textFieldY + 1 : 0);
    const startX = Math.round(centerX - totalWidth / 2) + drawOffsetX - rankVisualOverflowLeft - rank23LeftAlignShift;
    const startY = Math.round(baseY + drawOffsetY);
    const rankSignature = rankReady ? `${rankId}:${rankImg.width}x${rankImg.height}` : "none";
    const factionSignature = factionReady ? `${factionId}:${factionImg.width}x${factionImg.height}` : "none";
    const compositeCacheKey = "flashNPv1|" + flashNameplateFontCacheRevision + "|" + safeName + "|" + clanText + "|" + fillStyle + "|" + (clanTagColor || fillStyle) + "|" + rankSignature + "|" + factionSignature + "|" + clanFieldWidth + "|" + nameFieldWidth + "|" + totalWidth + "|" + visualWidth + "|" + bitmapHeight + "|" + rankVisualOverflowLeft + "|" + rankVisualOverflowRight + "|" + rank23LeftAlignShift;
    let compositeCanvas = nameplateCompositeBitmapCache.get(compositeCacheKey);
    if (compositeCanvas) {
        touchNameplateCompositeBitmapCacheKey(compositeCacheKey, compositeCanvas);
    }
    if (!compositeCanvas) {
        compositeCanvas = document.createElement("canvas");
        compositeCanvas.width = visualWidth;
        compositeCanvas.height = bitmapHeight;
        const sctx = compositeCanvas.getContext("2d");
        sctx.clearRect(0, 0, compositeCanvas.width, compositeCanvas.height);
        sctx.imageSmoothingEnabled = true;
        if (rankReady) {
            sctx.drawImage(rankImg, rankDrawX, rankY);
        }
        if (factionReady) {
            sctx.drawImage(factionImg, rankVisualOverflowLeft + totalWidth - factionW + rank23LeftAlignShift, factionY);
        }
        let cursorX = rankVisualOverflowLeft + rankLogicalW + rank23LeftAlignShift;
        if (clanFieldBitmap) {
            sctx.drawImage(clanFieldBitmap, cursorX, textFieldY);
            cursorX += clanFieldWidth;
        }
        if (nameFieldBitmap) {
            sctx.drawImage(nameFieldBitmap, cursorX, textFieldY);
        }
        nameplateCompositeBitmapCache.set(compositeCacheKey, compositeCanvas);
        pruneNameplateCompositeBitmapCache();
    }
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0)";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    if (achievementReady) {
        ctx.drawImage(achievementImg, startX + rank23LeftAlignShift - 2, startY - 14);
    }
    ctx.drawImage(compositeCanvas, startX, startY);
    ctx.restore();
    return {
        startX: startX,
        startY: startY,
        bitmapWidth: totalWidth,
        bitmapHeight: bitmapHeight,
        rankWidth: rankVisualOverflowLeft + rankLogicalW + rank23LeftAlignShift
    };
}

function getSimpleDroneDisplayCounts(connector, explicitCounts) {
    if (explicitCounts && (explicitCounts.flax > 0 || explicitCounts.iris > 0)) {
        return {
            flax: Math.max(0, explicitCounts.flax | 0),
            iris: Math.max(0, explicitCounts.iris | 0)
        };
    }
    if (!connector || !Array.isArray(connector.groups) || !connector.groups.length) return null;
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

function buildSimpleDroneDisplayBitmap(flax, iris) {
    const safeFlax = Math.max(0, flax | 0);
    const safeIris = Math.max(0, iris | 0);
    const cacheKey = `${safeFlax}|${safeIris}`;
    const cached = droneDisplayBitmapCache[cacheKey];
    if (cached) return cached;
    const prefixImg = getUiImage("graphics/ui/ui/images/drone_prefix.png");
    const irisDotImg = getUiImage("graphics/ui/ui/images/iris_dot.png");
    const flaxDotImg = getUiImage("graphics/ui/ui/images/flax_dot.png");
    if (!prefixImg || !prefixImg.complete || !irisDotImg || !irisDotImg.complete || !flaxDotImg || !flaxDotImg.complete) {
        return null;
    }
    const canvas = document.createElement("canvas");
    canvas.width = 80;
    canvas.height = 12;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(prefixImg, 0, 0);
    let dotX = 10;
    for (let i = 0; i < safeIris; i++) {
        ctx.drawImage(irisDotImg, dotX, 0);
        dotX += 5;
    }
    dotX = 10;
    for (let i = 0; i < safeFlax; i++) {
        ctx.drawImage(flaxDotImg, dotX, 5);
        dotX += 5;
    }
    droneDisplayBitmapCache[cacheKey] = canvas;
    return canvas;
}

function drawSimpleDroneDisplayUnderNameplate(ctx, nameplateLayout, counts) {
    if (!nameplateLayout || !counts) return;
    const flax = Math.max(0, counts.flax | 0);
    const iris = Math.max(0, counts.iris | 0);
    if (flax <= 0 && iris <= 0) return;
    const droneDisplayBitmap = buildSimpleDroneDisplayBitmap(flax, iris);
    if (!droneDisplayBitmap) return;
    const drawX = Math.round(nameplateLayout.startX + nameplateLayout.rankWidth + 2);
    const drawY = Math.round(nameplateLayout.startY + 24);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(droneDisplayBitmap, drawX, drawY);
    ctx.restore();
}

function startHeroCollectorBeam(durationMs = COLLECTOR_BEAM_DEFAULT_DURATION_MS) {
    const now = performance.now();
    heroCollectorBeamState = {
        frameIndex: 0,
        lastUpdate: now,
        startedAt: now,
        durationMs: durationMs || COLLECTOR_BEAM_DEFAULT_DURATION_MS
    };
}

function stopHeroCollectorBeam() {
    heroCollectorBeamState = null;
}

function getBoxSpriteConfig(category) {
    if (category === "bonusBox") return BOX_SPRITE_CONFIG.bonus;
    if (category === "bootyBox") return BOX_SPRITE_CONFIG.booty;
    return BOX_SPRITE_CONFIG.cargo;
}

function getBoxSpriteFrame(category, frameIndex) {
    const cfg = getBoxSpriteConfig(category);
    const frameCount = cfg.frameCount;
    const idx = (frameIndex % frameCount + frameCount) % frameCount;
    const atlasRowKey = category === "bonusBox" ? "bonus" : category === "bootyBox" ? "booty" : "cargo";
    return getCollectablesAtlasFrame(atlasRowKey, idx);
}

function clearBoxAnimationState(id) {
    if (id == null) return;
    delete boxAnimationStates[id];
}

function getOreSpriteKeyFromType(type, oreSpriteOverride = null) {
    if (oreSpriteOverride) return oreSpriteOverride;
    return ORE_TYPE_SPRITES?.[type] || null;
}

function getOreSpriteConfig(spriteKey) {
    if (!spriteKey) return null;
    return ORE_SPRITE_CONFIG[spriteKey] || null;
}

function getOreSpriteFrame(spriteKey, frameIndex) {
    const cfg = getOreSpriteConfig(spriteKey);
    if (!cfg) return null;
    const frameCount = cfg.frameCount;
    const idx = (frameIndex % frameCount + frameCount) % frameCount;
    return getCollectablesAtlasFrame(spriteKey, idx);
}

function clearOreAnimationState(id) {
    if (id == null) return;
    delete oreAnimationStates[id];
}

function drawLootProtectionPiechart(e, boxScreenX, boxScreenY, spriteHeight, now, entityScale) {
    if (!e || !e.remainingLootTimeMs || !e.lootProtectionStartMs) return;
    const duration = e.remainingLootTimeMs;
    const start = e.lootProtectionStartMs;
    const elapsed = now - start;
    if (duration <= 0) return;
    const progress = Math.max(0, Math.min(1, elapsed / duration));
    const fadeOutMs = 250;
    let alpha = 1;
    if (elapsed >= duration) {
        alpha = Math.max(0, 1 - (elapsed - duration) / fadeOutMs);
        if (alpha <= 0) {
            e.remainingLootTimeMs = null;
            e.lootProtectionStartMs = 0;
            return;
        }
    }
    const h = typeof spriteHeight === "number" && spriteHeight > 0 ? spriteHeight : 28;
    const scale = typeof entityScale === "number" && entityScale > 0 ? entityScale : 1;
    const cx = boxScreenX;
    const cy = boxScreenY - h * .5 * scale;
    const radius = Math.max(10, 14 * scale);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineWidth = Math.max(2, 3 * scale);
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2, false);
    ctx.stroke();
    ctx.restore();
}

function clearAllCollectableAnimationStates() {
    for (const k in boxAnimationStates) delete boxAnimationStates[k];
    for (const k in oreAnimationStates) delete oreAnimationStates[k];
    activeCollectableBoxBeams.length = 0;
    activeCollectableFadeOuts.length = 0;
    if (bonusBoxAnimationTimer) {
        clearInterval(bonusBoxAnimationTimer);
        bonusBoxAnimationTimer = null;
    }
    bonusBoxFrameIndex = 0;
}

function ensureBonusBoxAnimationTimer() {
    if (bonusBoxAnimationTimer !== null) return;
    bonusBoxAnimationTimer = setInterval(() => {
        bonusBoxFrameIndex = (bonusBoxFrameIndex + 1) % BOX_SPRITE_CONFIG.bonus.frameCount;
    }, BONUS_BOX_ANIMATION_FRAME_DURATION);
}

function drawBootyKey(boxScreenX, boxScreenY, now) {
    const img = bootyKeySprite;
    if (img && img.complete && img.width > 0 && img.height > 0) {
        const pulse = 1 + .15 * Math.sin(now % 900 / 900 * Math.PI * 2);
        const alpha = .75 + .25 * Math.sin(now % 650 / 650 * Math.PI * 2);
        const w = img.width * pulse;
        const h = img.height * pulse;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.drawImage(img, boxScreenX - w / 2, boxScreenY - h / 2, w, h);
        ctx.restore();
    } else {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(boxScreenX, boxScreenY, 8, 0, Math.PI * 2, false);
        ctx.fill();
    }
}

function updateEngineAnimationState(key, worldX, worldY, forceMoving = false) {
    const now = performance.now();
    const engineFrames = ENGINE_SPRITE_DEFS[DEFAULT_ENGINE_KEY]?.frames?.length || ENGINE_SPRITE_DEFS[DEFAULT_ENGINE_KEY]?.frameCount || 1;
    const state = engineAnimationState[key] || {
        frameIndex: Math.max(0, engineFrames - 1),
        lastUpdate: now,
        lastFrameChange: now,
        movingTicks: 0,
        lastX: worldX,
        lastY: worldY,
        isMoving: false
    };
    const dx = worldX - state.lastX;
    const dy = worldY - state.lastY;
    const moved = forceMoving || dx * dx + dy * dy >= ENGINE_MOVE_EPS_SQ;
    if (moved) {
        if (state.movingTicks === 0) {
            state.isMoving = true;
        }
        state.movingTicks = Math.min(ENGINE_MOVING_MAX_TICKS, state.movingTicks + 1);
    }
    const shouldAdvance = now - state.lastFrameChange >= ENGINE_FRAME_DURATION;
    const movingNow = state.isMoving || state.movingTicks > 0;
    if (shouldAdvance) {
        if (movingNow && state.frameIndex > 0) {
            state.frameIndex -= 1;
            state.lastFrameChange = now;
        } else if (!movingNow && state.frameIndex < engineFrames - 1) {
            state.frameIndex += 1;
            state.lastFrameChange = now;
        }
    }
    state.lastX = worldX;
    state.lastY = worldY;
    state.lastUpdate = now;
    if (state.movingTicks > 0) {
        state.movingTicks -= 1;
        if (state.movingTicks === 0) {
            state.isMoving = false;
        }
    }
    engineAnimationState[key] = state;
    return {
        frameIndex: state.frameIndex,
        isMoving: movingNow
    };
}

function drawEngineSmokeTrail(key, thrusterX, thrusterY, angleRad, isMoving, screenOffsetY = 0, spawnBackOffset = 0) {
    const def = ENGINE_SMOKE_DEFS[DEFAULT_ENGINE_SMOKE_KEY];
    if (!def) return;
    const entityScale = typeof getEntityDrawScale === "function" ? getEntityDrawScale() : 1;
    const now = performance.now();
    const state = engineSmokeState[key] || {
        particles: [],
        lastSpawn: 0
    };
    if (isMoving && now - state.lastSpawn >= (def.spawnInterval || 50)) {
        state.lastSpawn = now;
        state.particles.push(acquireEngineSmokeParticle(key, thrusterX, thrusterY, now));
    }
    let frames = def.frames && def.frames.length > 0 ? def.frames : def._frameNumbers;
    if (!frames || frames.length === 0) {
        frames = [];
        const fallbackFrameCount = def.frameCount || 1;
        for (let i = 0; i < fallbackFrameCount; i++) frames.push(i + 1);
        def._frameNumbers = frames;
    }
    const frameCount = frames.length;
    const duration = def.duration || 750;
    let remainingParticleCount = 0;
    for (let i = 0; i < state.particles.length; i++) {
        const p = state.particles[i];
        const age = now - p.createdAt;
        if (age > duration) {
            releaseEngineSmokeParticle(p);
            continue;
        }
        const lifeRatio = age / duration;
        const frameIdx = Math.min(frameCount - 1, Math.floor(lifeRatio * frameCount));
        const img = getEngineSmokeSpriteFrame(DEFAULT_ENGINE_SMOKE_KEY, frameIdx);
        if (img && img.complete && img.width > 0 && img.height > 0) {
            const drawX = mapToScreenX(p.x);
            const drawY = mapToScreenY(p.y) + screenOffsetY;
            ctx.save();
            ctx.translate(drawX, drawY);
            const scale = (def.scale || 1) * entityScale;
            const drawW = img.width * scale;
            const drawH = img.height * scale;
            const ax = def.anchor?.x ?? .5;
            const ay = def.anchor?.y ?? .5;
            ctx.drawImage(img, -drawW * ax, -drawH * ay, drawW, drawH);
            ctx.restore();
        }
        state.particles[remainingParticleCount++] = p;
    }
    state.particles.length = remainingParticleCount;
    if (remainingParticleCount === 0 && !isMoving) {
        delete engineSmokeState[key];
        syncChatSendButtonState();
        return;
    }
    engineSmokeState[key] = state;
}

function drawEngineTrail(key, shipId, worldX, worldY, frameIndex, angleRad, offsetY = 0, forceMoving = false, visualShift = null) {
    const engineDef = ENGINE_SPRITE_DEFS[DEFAULT_ENGINE_KEY];
    if (!engineDef) return;
    const engineOffsets = getEngineOffsetsForFrame(shipId, frameIndex || 0);
    if (!engineOffsets || engineOffsets.length === 0) return;
    const {frameIndex: animFrameIndex, isMoving: isMoving} = updateEngineAnimationState(key, worldX, worldY, forceMoving);
    const img = getEngineSpriteFrame(DEFAULT_ENGINE_KEY, animFrameIndex);
    if (!img || !img.complete || img.width === 0 || img.height === 0) return;
    const entityScale = typeof getEntityDrawScale === "function" ? getEntityDrawScale() : 1;
    const offsetScale = entityScale;
    const smokeBack = (engineDef.smokeSpawnOffset || 0) * offsetScale;
    const scale = (engineDef.scale || 1) * entityScale;
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const ax = engineDef.anchor?.x ?? .5;
    const ay = engineDef.anchor?.y ?? .5;
    const rot = typeof angleRad === "number" && Number.isFinite(angleRad) ? angleRad : 0;
    const shiftWorldX = visualShift && Number.isFinite(visualShift.x) ? visualShift.x : 0;
    const shiftWorldY = visualShift && Number.isFinite(visualShift.y) ? visualShift.y : 0;
    for (let index = 0; index < engineOffsets.length; index++) {
        const engineOffset = engineOffsets[index];
        const thrusterX = worldX + engineOffset.x * offsetScale - shiftWorldX;
        const thrusterY = worldY + engineOffset.y * offsetScale - shiftWorldY;
        const smokeKey = `${key}_${index}`;
        drawEngineSmokeTrail(smokeKey, thrusterX, thrusterY, rot, isMoving, offsetY, smokeBack);
        const screenX = mapToScreenX(thrusterX);
        const screenY = mapToScreenY(thrusterY) + offsetY;
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(rot);
        ctx.drawImage(img, -drawW * ax, -drawH * ay, drawW, drawH);
        ctx.restore();
    }
}

const minimapStationIconCache = Object.create(null);

const minimapThreatIndicatorCache = Object.create(null);
const FLASH_MINIMAP_DYNAMIC_UPDATE_MS = 250;
const minimapEntityRenderCache = [];
let minimapEntityRenderCacheLastUpdate = -Infinity;
let minimapEntityRenderCacheSignature = "";

function getMinimapThreatIndicator(level, height) {
    const key = `${level}|${height}`;
    if (minimapThreatIndicatorCache[key]) return minimapThreatIndicatorCache[key];
    const canvas = document.createElement("canvas");
    canvas.width = 10;
    canvas.height = height;
    const c = canvas.getContext("2d");
    if (!c) return null;
    const indicatorColors = [ 16777215, 16772505, 16767296, 16763955, 16751360, 16737792 ];
    const clamped = Math.max(0, Math.min(indicatorColors.length - 1, level | 0));
    const segments = 6;
    const step = height / (segments - 1);
    const yStart = (5 - clamped) * step;
    const barH = step * clamped;
    if (barH > 0) {
        c.fillStyle = `#${indicatorColors[clamped].toString(16).padStart(6, "0")}`;
        c.fillRect(0, yStart, 3, barH);
    }
    c.strokeStyle = "#99ccff";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(8, 0);
    c.lineTo(8, height);
    let y = 0;
    for (let i = 0; i < segments; i++) {
        let yy = y;
        if (i === segments - 1) yy -= 1;
        c.moveTo(4, yy);
        c.lineTo(10, yy);
        y += step;
    }
    const seg2 = 21;
    const step2 = height / (seg2 - 1);
    y = 0;
    for (let i = 0; i < seg2; i++) {
        let yy = y;
        if (i === seg2 - 1) yy -= 1;
        c.lineTo(9, yy);
        y += step2;
    }
    c.stroke();
    minimapThreatIndicatorCache[key] = canvas;
    return canvas;
}

function rebuildMinimapEntityRenderCache(miniScaleX, miniScaleY, nowMs) {
    let writeIndex = 0;
    for (const id in entities) {
        const e = entities[id];
        if (!e) continue;
        if (e.id === heroId) continue;
        if (e.kind === "unknown") continue;
        const isSpaceball = e.shipId === 442 || e.shipId === 443;
        if (e.kind === "box" && !isSpaceball) continue;
        if (typeof isEntityInvisibleOnMinimap === "function" && isEntityInvisibleOnMinimap(e)) continue;
        const item = minimapEntityRenderCache[writeIndex] || {};
        item.id = e.id;
        item.entityRef = e;
        item.localX = (e.x - MAP_MIN_X) * miniScaleX;
        item.localY = (e.y - MAP_MIN_Y) * miniScaleY;
        item.isSpaceball = isSpaceball;
        item.warnIconOnMap = !!e.warnIconOnMap;
        item.fadedUntil = e.fadedUntil || 0;
        item.color = typeof getMinimapEntityColor === "function" ? getMinimapEntityColor(e) : getEntityColor(e);
        minimapEntityRenderCache[writeIndex++] = item;
    }
    minimapEntityRenderCache.length = writeIndex;
    minimapEntityRenderCacheLastUpdate = nowMs;
}

function drawMinimapPixel(mx, my, color, left, top) {
    const px = Math.round(mx);
    const py = Math.round(my);
    const right = left + MINIMAP_WIDTH;
    const bottom = top + MINIMAP_HEIGHT;
    const pixelSize = 3;
    const pixelHalf = Math.floor(pixelSize / 2);
    ctx.fillStyle = color;
    if (px > left + 2 && py > top + 2 && px < right - 4 && py < bottom - 4) {
        ctx.fillRect(px - pixelHalf, py - pixelHalf, pixelSize, pixelSize);
        return;
    }
    if (px <= left + 1) {
        if (py <= top + 2) {
            ctx.fillRect(left + 3, top + 3, 1, 1);
            ctx.fillRect(left + 4, top + 4, 1, 1);
            ctx.fillRect(left + 4, top + 5, 1, 1);
            ctx.fillRect(left + 5, top + 4, 1, 1);
        } else if (py >= bottom - 4) {
            ctx.fillRect(left + 3, bottom - 5, 1, 1);
            ctx.fillRect(left + 4, bottom - 6, 1, 1);
            ctx.fillRect(left + 4, bottom - 7, 1, 1);
            ctx.fillRect(left + 5, bottom - 6, 1, 1);
        } else {
            ctx.fillRect(left + 2, py, 1, 1);
            ctx.fillRect(left + 3, py, 1, 1);
            ctx.fillRect(left + 3, py + 1, 1, 1);
            ctx.fillRect(left + 3, py - 1, 1, 1);
            ctx.fillRect(left + 4, py + 1, 1, 1);
            ctx.fillRect(left + 4, py - 1, 1, 1);
        }
        return;
    }
    if (px >= right - 4) {
        if (py <= top + 1) {
            ctx.fillRect(right - 3, top + 2, 1, 1);
            ctx.fillRect(right - 4, top + 3, 1, 1);
            ctx.fillRect(right - 4, top + 4, 1, 1);
            ctx.fillRect(right - 5, top + 3, 1, 1);
        } else if (py >= bottom - 4) {
            ctx.fillRect(right - 3, bottom - 3, 1, 1);
            ctx.fillRect(right - 4, bottom - 4, 1, 1);
            ctx.fillRect(right - 4, bottom - 5, 1, 1);
            ctx.fillRect(right - 5, bottom - 4, 1, 1);
        } else {
            ctx.fillRect(right - 3, py, 1, 1);
            ctx.fillRect(right - 4, py, 1, 1);
            ctx.fillRect(right - 4, py + 1, 1, 1);
            ctx.fillRect(right - 4, py - 1, 1, 1);
            ctx.fillRect(right - 5, py + 1, 1, 1);
            ctx.fillRect(right - 5, py - 1, 1, 1);
        }
        return;
    }
    if (py <= top + 2) {
        ctx.fillRect(px, top + 2, 1, 1);
        ctx.fillRect(px, top + 3, 1, 1);
        ctx.fillRect(px + 1, top + 3, 1, 1);
        ctx.fillRect(px - 1, top + 3, 1, 1);
        ctx.fillRect(px + 1, top + 4, 1, 1);
        ctx.fillRect(px - 1, top + 4, 1, 1);
        return;
    }
    if (py >= bottom - 4) {
        ctx.fillRect(px, bottom - 3, 1, 1);
        ctx.fillRect(px, bottom - 4, 1, 1);
        ctx.fillRect(px + 1, bottom - 4, 1, 1);
        ctx.fillRect(px - 1, bottom - 4, 1, 1);
        ctx.fillRect(px + 1, bottom - 5, 1, 1);
        ctx.fillRect(px - 1, bottom - 5, 1, 1);
    }
}

function getStationMinimapIcon(station, scaleFactor, mapScale) {
    const type = station && (station.type || station.stationType) ? station.type || station.stationType : "";
    const key = `${type}_${scaleFactor}_${mapScale}`;
    if (minimapStationIconCache[key]) {
        return minimapStationIconCache[key];
    }
    const baseImg = stationImages[type];
    if (!baseImg || !baseImg.complete || baseImg.width <= 0) {
        return null;
    }
    const flashStationMeta = typeof getFlashStationPatternMeta === "function" ? getFlashStationPatternMeta(station) : null;
    const clipW = flashStationMeta && flashStationMeta.width ? flashStationMeta.width : baseImg.width;
    const clipH = flashStationMeta && flashStationMeta.height ? flashStationMeta.height : baseImg.height;
    const iconParam = scaleFactor * mapScale + 20;
    const iconW = Math.max(1, Math.floor(clipW / iconParam));
    const iconH = Math.max(1, Math.floor(clipH / iconParam));
    const iconCanvas = document.createElement("canvas");
    iconCanvas.width = iconW;
    iconCanvas.height = iconH;
    const iconCtx = iconCanvas.getContext("2d");
    if (!iconCtx) {
        return null;
    }
    const scaleSize = 1 / (Math.max(1, scaleFactor) * 10);
    iconCtx.setTransform(scaleSize, 0, 0, scaleSize, clipW / 2 * scaleSize, clipH / 2 * scaleSize);
    iconCtx.drawImage(baseImg, -clipW / 2, -clipH / 2);
    const result = {
        image: iconCanvas,
        clipW: clipW,
        clipH: clipH
    };
    minimapStationIconCache[key] = result;
    return result;
}

function warmStationMinimapIcon(station) {
    if (!station) return;
    const scaleFactor = typeof minimapScaleFactor === "number" && Number.isFinite(minimapScaleFactor) ? minimapScaleFactor : 1;
    const mapScale = typeof mapScaleFactor === "number" && Number.isFinite(mapScaleFactor) && mapScaleFactor > 0 ? mapScaleFactor : 1;
    getStationMinimapIcon(station, scaleFactor, mapScale);
}

window.warmStationMinimapIcon = warmStationMinimapIcon;

function formatMinimapMapId(mapId) {
    switch (mapId) {
      case 1:
        return "1-1";

      case 2:
        return "1-2";

      case 3:
        return "1-3";

      case 4:
        return "1-4";

      case 5:
        return "2-1";

      case 6:
        return "2-2";

      case 7:
        return "2-3";

      case 8:
        return "2-4";

      case 9:
        return "3-1";

      case 10:
        return "3-2";

      case 11:
        return "3-3";

      case 12:
        return "3-4";

      case 13:
        return "4-1";

      case 14:
        return "4-2";

      case 15:
        return "4-3";

      case 16:
        return "4-4";

      case 17:
        return "1-5";

      case 18:
        return "1-6";

      case 19:
        return "1-7";

      case 20:
        return "1-8";

      case 21:
        return "2-5";

      case 22:
        return "2-6";

      case 23:
        return "2-7";

      case 24:
        return "2-8";

      case 25:
        return "3-5";

      case 26:
        return "3-6";

      case 27:
        return "3-7";

      case 28:
        return "3-8";

      case 51:
        return "GGA";

      case 52:
        return "GGB";

      case 53:
        return "GGG";

      case 55:
        return "GGD";

      case 80:
        return "Surv";

      case 81:
        return "Inva";

      default:
        return "1-1";
    }
}

function drawMiniMap() {
    const layout = typeof getMinimapLayout === "function" ? getMinimapLayout() : null;
    if (!layout) {
        return;
    }
    const x = layout.contentX;
    const infoHeight = layout.infoHeight || 0;
    const y = layout.contentY;
    const mapY = layout.mapY ?? layout.contentY + infoHeight;
    const headerY = layout.headerY;
    const isMinimapOpen = window.showMinimap !== false;
    minimapHitboxes.zoomIn = null;
    minimapHitboxes.zoomOut = null;
    minimapHitboxes.frame = isMinimapOpen ? {
        x: layout.outerX,
        y: layout.outerY,
        w: layout.outerWidth,
        h: layout.outerHeight
    } : null;
    minimapHitboxes.content = isMinimapOpen ? {
        x: x,
        y: mapY,
        w: MINIMAP_WIDTH,
        h: MINIMAP_HEIGHT
    } : null;
    if (!isMinimapOpen) {
        return;
    }
    const minimapOverlay = getUiImage(UI_SPRITES.minimapOverlay);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, mapY, MINIMAP_WIDTH, MINIMAP_HEIGHT);
    ctx.clip();
    ctx.fillStyle = "#000000";
    ctx.fillRect(x, mapY, MINIMAP_WIDTH, MINIMAP_HEIGHT);
    if (minimapOverlay && minimapOverlay.complete && minimapOverlay.width > 0) {
        ctx.drawImage(minimapOverlay, x, mapY, MINIMAP_WIDTH, MINIMAP_HEIGHT);
    }
    ctx.restore();
    minimapHitboxes.zoomIn = layout.zoomInHitbox || null;
    minimapHitboxes.zoomOut = layout.zoomOutHitbox || null;
    const miniScaleX = MINIMAP_WIDTH / MAP_WIDTH;
    const miniScaleY = MINIMAP_HEIGHT / MAP_HEIGHT;
    const nowMs = performance.now();
    let heroLocalX = Math.floor((shipX - MAP_MIN_X) * miniScaleX);
    let heroLocalY = Math.floor((shipY - MAP_MIN_Y) * miniScaleY);
    if (heroLocalX <= 1) heroLocalX = 2;
    if (heroLocalX >= MINIMAP_WIDTH - 1) heroLocalX = MINIMAP_WIDTH - 3;
    if (heroLocalY <= 1) heroLocalY = 2;
    if (heroLocalY >= MINIMAP_HEIGHT - 1) heroLocalY = MINIMAP_HEIGHT - 3;
    const heroPx = x + heroLocalX;
    const heroPy = mapY + heroLocalY;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, mapY, MINIMAP_WIDTH, MINIMAP_HEIGHT);
    ctx.clip();
    const portalIcon = getUiImage(UI_SPRITES.minimapPortalIcon);
    if (portalIcon && portalIcon.complete && portalIcon.width > 0) {
        for (const pid in portals) {
            const p = portals[pid];
            if (!p) continue;
            if (p.visibleOnMiniMap === false) continue;
            const mx = x + (p.x - MAP_MIN_X) * miniScaleX;
            const my = mapY + (p.y - MAP_MIN_Y) * miniScaleY;
            if (mx >= x && mx <= x + MINIMAP_WIDTH && my >= mapY && my <= mapY + MINIMAP_HEIGHT) {
                ctx.drawImage(portalIcon, mx - portalIcon.width / 2, my - portalIcon.height / 2, portalIcon.width, portalIcon.height);
            }
        }
    }
    const scaleFactor = typeof minimapScaleFactor === "number" && Number.isFinite(minimapScaleFactor) ? minimapScaleFactor : 1;
    const mapScale = typeof mapScaleFactor === "number" && Number.isFinite(mapScaleFactor) && mapScaleFactor > 0 ? mapScaleFactor : 1;
    for (const s of stations) {
        const stationIcon = getStationMinimapIcon(s, scaleFactor, mapScale);
        if (!stationIcon || !stationIcon.image) continue;
        const topLeftX = x + (s.x - stationIcon.clipW / 2 - MAP_MIN_X) * miniScaleX;
        const topLeftY = mapY + (s.y - stationIcon.clipH / 2 - MAP_MIN_Y) * miniScaleY;
        ctx.drawImage(stationIcon.image, topLeftX, topLeftY, stationIcon.image.width, stationIcon.image.height);
    }
    ctx.fillStyle = "rgba(148, 148, 148, 0.6667)";
    ctx.fillRect(x, heroPy, MINIMAP_WIDTH, 2);
    ctx.fillRect(heroPx, mapY, 2, MINIMAP_HEIGHT);
    const finishIcon = getUiImage(UI_SPRITES.minimapFinishIcon);
    if (moveTargetFromMinimap && moveTargetX !== null && moveTargetY !== null && Number.isFinite(moveTargetX) && Number.isFinite(moveTargetY)) {
        const tx = x + (moveTargetX - MAP_MIN_X) * miniScaleX;
        const ty = mapY + (moveTargetY - MAP_MIN_Y) * miniScaleY;
        ctx.strokeStyle = "#6575d6";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(heroPx, heroPy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        if (finishIcon && finishIcon.complete && finishIcon.width > 0) {
            ctx.drawImage(finishIcon, tx - finishIcon.width / 2, ty - finishIcon.height / 2, finishIcon.width, finishIcon.height);
        }
    }
    drawMinimapPixel(heroPx, heroPy, "#33cc00", x, mapY);
    const alertIcon = getUiImage(UI_SPRITES.minimapAlertIcon);
    const spaceballIcon = getUiImage(UI_SPRITES.minimapSpaceballIcon);
    const alertReady = !!(alertIcon && alertIcon.complete && alertIcon.width > 0);
    const spaceballReady = !!(spaceballIcon && spaceballIcon.complete && spaceballIcon.width > 0);
    const entityCacheSignature = `${currentMapId}|${heroId}|${MAP_MIN_X}|${MAP_MIN_Y}|${miniScaleX}|${miniScaleY}|${alertReady}|${spaceballReady}`;
    if (entityCacheSignature !== minimapEntityRenderCacheSignature || nowMs - minimapEntityRenderCacheLastUpdate >= FLASH_MINIMAP_DYNAMIC_UPDATE_MS) {
        minimapEntityRenderCacheSignature = entityCacheSignature;
        rebuildMinimapEntityRenderCache(miniScaleX, miniScaleY, nowMs);
    }
    for (let i = 0; i < minimapEntityRenderCache.length; i++) {
        const item = minimapEntityRenderCache[i];
        const liveEntity = item.entityRef && entities[item.id] === item.entityRef ? item.entityRef : entities[item.id] || entities[String(item.id)];
        if (!liveEntity || liveEntity.id === heroId || liveEntity.kind === "unknown") continue;
        if (!Number.isFinite(liveEntity.x) || !Number.isFinite(liveEntity.y)) continue;
        const liveLocalX = (liveEntity.x - MAP_MIN_X) * miniScaleX;
        const liveLocalY = (liveEntity.y - MAP_MIN_Y) * miniScaleY;
        const mx = x + liveLocalX;
        const my = mapY + liveLocalY;
        const fadedUntil = liveEntity.fadedUntil || item.fadedUntil || 0;
        if (fadedUntil && fadedUntil > nowMs) {
            const a = Math.max(0, Math.min(1, (fadedUntil - nowMs) / 600));
            ctx.save();
            ctx.globalAlpha = a;
            if (item.isSpaceball && spaceballReady) {
                ctx.drawImage(spaceballIcon, mx - spaceballIcon.width / 2, my - spaceballIcon.height / 2, spaceballIcon.width, spaceballIcon.height);
            } else if (item.warnIconOnMap && alertReady) {
                ctx.drawImage(alertIcon, mx - alertIcon.width / 2, my - alertIcon.height / 2, alertIcon.width, alertIcon.height);
            } else {
                drawMinimapPixel(mx, my, item.color, x, mapY);
            }
            ctx.restore();
        } else {
            if (item.isSpaceball && spaceballReady) {
                ctx.drawImage(spaceballIcon, mx - spaceballIcon.width / 2, my - spaceballIcon.height / 2, spaceballIcon.width, spaceballIcon.height);
            } else if (item.warnIconOnMap && alertReady) {
                ctx.drawImage(alertIcon, mx - alertIcon.width / 2, my - alertIcon.height / 2, alertIcon.width, alertIcon.height);
            } else {
                drawMinimapPixel(mx, my, item.color, x, mapY);
            }
        }
    }
    if (typeof window.__getMinimapInterferenceState === "function") {
        const st = window.__getMinimapInterferenceState(nowMs);
        if (st && st.alpha > 0 && st.canvas) {
            ctx.save();
            ctx.globalAlpha = st.alpha;
            ctx.drawImage(st.canvas, x, mapY);
            ctx.restore();
            if (st.barY !== null && st.barY !== undefined) {
                ctx.save();
                ctx.globalAlpha = st.alpha * .35;
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(x, mapY + st.barY, MINIMAP_WIDTH, 1);
                ctx.restore();
            }
        }
    }
    ctx.restore();
    if (typeof minimapGroupPings !== "undefined" && Array.isArray(minimapGroupPings) && minimapGroupPings.length > 0) {
        const def = MINIMAP_SPRITE_DEFS.groupPing;
        let keepCount = 0;
        const cycleMs = 500;
        for (let i = 0; i < minimapGroupPings.length; i++) {
            const ping = minimapGroupPings[i];
            const age = nowMs - ping.t0;
            const life = cycleMs;
            if (ping.count === -1) {
                minimapGroupPings[keepCount++] = ping;
            } else if (age > life) {
                ping.count--;
                if (ping.count > 0) {
                    ping.t0 = nowMs;
                    minimapGroupPings[keepCount++] = ping;
                }
                continue;
            } else {
                minimapGroupPings[keepCount++] = ping;
            }
            const frameFloat = age / cycleMs * def.frameCount;
            const frameIndex = Math.min(def.frameCount - 1, Math.floor(frameFloat));
            const img = getMinimapSpriteFrame("groupPing", frameIndex);
            if (!img || !img.complete || img.width <= 0) continue;
            const mx = x + (ping.x - MAP_MIN_X) * miniScaleX;
            const my = mapY + (ping.y - MAP_MIN_Y) * miniScaleY;
            ctx.save();
            ctx.globalAlpha = 1;
            ctx.drawImage(img, mx - img.width / 2, my - img.height / 2, img.width, img.height);
            ctx.restore();
        }
        minimapGroupPings.length = keepCount;
    }
    if (window.minimapServerMarkers instanceof Map && window.minimapServerMarkers.size > 0) {
        const def = MINIMAP_SPRITE_DEFS.groupPing;
        const cycleMs = 500;
        for (const [markerId, m] of window.minimapServerMarkers.entries()) {
            if (!m || !Number.isFinite(m.startedAt)) {
                window.minimapServerMarkers.delete(markerId);
                continue;
            }
            const markerCount = Number.isFinite(m.count) ? m.count : -1;
            const age = nowMs - m.startedAt;
            if (markerCount !== -1 && age >= markerCount * cycleMs) {
                window.minimapServerMarkers.delete(markerId);
                continue;
            }
            const mx = x + (m.x - MAP_MIN_X) * miniScaleX;
            const my = mapY + (m.y - MAP_MIN_Y) * miniScaleY;
            const frameIndex = Math.min(def.frameCount - 1, Math.floor(age % cycleMs / cycleMs * def.frameCount));
            const img = getMinimapSpriteFrame("groupPing", frameIndex);
            if (!img || !img.complete || img.width <= 0) continue;
            ctx.save();
            ctx.drawImage(img, mx - img.width / 2, my - img.height / 2, img.width, img.height);
            ctx.restore();
        }
    }
    if (window.minimapClickPointer && window.minimapClickPointer.startedAt !== undefined) {
        const ptr = window.minimapClickPointer;
        const def = MINIMAP_SPRITE_DEFS.pointer;
        const flashTimelineFps = 60;
        const frameDurationMs = 1e3 / flashTimelineFps;
        const age = nowMs - ptr.startedAt;
        const frameIndex = Math.floor(age / frameDurationMs);
        if (frameIndex >= def.frameCount) {
            window.minimapClickPointer = null;
        } else {
            const img = getMinimapSpriteFrame("pointer", frameIndex);
            if (img && img.complete && img.width > 0) {
                const mx = x + (ptr.x - MAP_MIN_X) * miniScaleX;
                const my = mapY + (ptr.y - MAP_MIN_Y) * miniScaleY;
                ctx.drawImage(img, mx - img.width / 2, my - img.height / 2, img.width, img.height);
            }
        }
    }
    const threatLevelRaw = typeof window.minimapEnemyWarningLevel === "number" ? window.minimapEnemyWarningLevel : 0;
    const threatLevel = Math.max(0, Math.min(5, threatLevelRaw | 0));
    const ind = typeof getMinimapThreatIndicator === "function" ? getMinimapThreatIndicator(threatLevel, MINIMAP_HEIGHT) : null;
    if (ind) {
        ctx.drawImage(ind, x - 12, mapY);
    }
    if (infoHeight > 0) {
        const infoY = y;
        const displayX = Math.round(shipX / 100);
        const displayY = Math.round(shipY / 100);
        const coordText = `${displayX}/${displayY}`;
        const mapText = formatMinimapMapId(currentMapId);
        ctx.save();
        ctx.font = "bold 11px Tahoma";
        ctx.textAlign = "left";
        const labelY = infoY + infoHeight - 10;
        ctx.fillStyle = "#e5ca89";
        ctx.fillText(mapText, x + 2, labelY);
        const mapLabelWidth = ctx.measureText(mapText).width;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(coordText, x + 2 + mapLabelWidth + 8, labelY);
        ctx.restore();
    }
}

function drawShieldAura(sx, sy, currentShield, maxShield, ish, invincible, ishSince, ishUntil, invSince, invUntil, techShieldBackupUntil = 0) {
    const now = performance.now();
    const entityScale = typeof getEntityDrawScale === "function" ? getEntityDrawScale() : 1;
    const isRegenerating = typeof heroShieldRegenUntil !== "undefined" && heroShieldRegenUntil > now;
    if (!ish && !invincible && !isRegenerating) {
        return;
    }
    if (!invincible && !ish && (!currentShield || currentShield <= 0)) return;
    const effectiveMax = maxShield || currentShield || 1;
    const fullShield = maxShield ? currentShield >= maxShield || currentShield / effectiveMax >= .999 : false;
    let spriteKey = "standard";
    if (ish) spriteKey = "insta"; else if (invincible) spriteKey = "invincibility"; else if (fullShield) return; else if (currentShield / effectiveMax < .25) spriteKey = "low";
    const def = SHIELD_SPRITE_DEFS[spriteKey];
    if (!def) return;
    let frame;
    if (def.loop) {
        frame = Math.floor(shieldAnimTime * (def.fps || SHIELD_ANIM_FPS)) % def.frameCount;
    } else if (spriteKey === "insta") {
        const start = ishSince;
        if (!start) return;
        const elapsed = now - start;
        const frameDuration = 1e3 / (def.fps || SHIELD_ANIM_FPS);
        const visualDuration = Number.isFinite(def.durationMs) ? def.durationMs : frameDuration * (def.frameCount || 1);
        if (elapsed < 0 || elapsed >= visualDuration) return;
        frame = Math.min(def.frameCount - 1, Math.floor(elapsed / frameDuration));
    } else {
        const start = invSince;
        const end = invUntil;
        if (!start || !end) return;
        const duration = Math.max(1, end - start);
        const progress = Math.min(1, Math.max(0, (now - start) / duration));
        frame = Math.min(def.frameCount - 1, Math.floor(progress * def.frameCount));
    }
    const frameDef = getShieldSpriteFrame(spriteKey, frame);
    if (!frameDef || frameDef.pendingAtlas) return;
    const pulse = (1 + Math.sin(shieldAnimTime * 4) * .05) * entityScale;
    const alpha = .35 + .25 * Math.min(1, currentShield / effectiveMax);
    ctx.save();
    ctx.globalAlpha = alpha;
    drawCenteredEffectFrame(frameDef, sx, sy, pulse);
    ctx.restore();
}

const FLASH_TARGET_BAR_FADE_IN_MS = 250;

const shipBarReferenceHeightCache = Object.create(null);

let targetBarFadeTargetId = null;

let targetBarFadeStartedAt = 0;

const heroHpShieldBarOptions = {
    referenceShipId: null,
    alpha: 1
};

const selectedTargetHpShieldBarOptions = {
    referenceShipId: null,
    alpha: 1
};

function getShipBarReferenceHeight(shipId, fallbackHeight = null) {
    const parsedId = Number.isFinite(shipId) ? shipId : Number.parseInt(shipId, 10);
    const fallback = Number.isFinite(fallbackHeight) && fallbackHeight > 0 ? fallbackHeight : null;
    if (!Number.isFinite(parsedId)) return fallback;
    if (Object.prototype.hasOwnProperty.call(shipBarReferenceHeightCache, parsedId)) {
        return shipBarReferenceHeightCache[parsedId] || fallback;
    }
    let referenceHeight = null;
    const def = typeof SHIP_SPRITE_DEFS !== "undefined" ? SHIP_SPRITE_DEFS[parsedId] : null;
    if (def) {
        if (Number.isFinite(def.frameHeight) && def.frameHeight > 0) {
            referenceHeight = def.frameHeight;
        } else if (Array.isArray(def.atlasFrames) && def.atlasFrames.length > 0) {
            for (let i = 0; i < def.atlasFrames.length; i++) {
                const entry = def.atlasFrames[i];
                if (entry && Number.isFinite(entry.h) && entry.h > 0) {
                    referenceHeight = Math.max(referenceHeight || 0, entry.h);
                }
            }
        }
    }
    if (!(referenceHeight > 0) && typeof getShipSpriteFrame === "function") {
        const img = getShipSpriteFrame(parsedId, 0);
        if (img && img.complete && img.height > 0) {
            referenceHeight = img.height;
        }
    }
    if (!(referenceHeight > 0)) {
        referenceHeight = fallback;
    }
    shipBarReferenceHeightCache[parsedId] = referenceHeight;
    return referenceHeight;
}

function syncSelectedTargetBarFadeState() {
    const currentTargetId = selectedTargetId != null ? selectedTargetId : null;
    if (currentTargetId == null) {
        targetBarFadeTargetId = null;
        targetBarFadeStartedAt = 0;
        return;
    }
    if (targetBarFadeTargetId !== currentTargetId) {
        targetBarFadeTargetId = currentTargetId;
        targetBarFadeStartedAt = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    }
}

function getSelectedTargetBarFadeAlpha(targetId) {
    if (targetId == null || selectedTargetId == null || targetId !== selectedTargetId) return 0;
    syncSelectedTargetBarFadeState();
    const now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    if (!(targetBarFadeStartedAt > 0)) return 1;
    return Math.max(0, Math.min(1, (now - targetBarFadeStartedAt) / FLASH_TARGET_BAR_FADE_IN_MS));
}

function drawHpShieldBars(screenX, screenY, spriteHeight, hp, maxHp, shield, maxShield, shipId = null, entityScale = 1, options = null) {
    if (shipId != null && typeof isShipEnergyVisible === "function" && !isShipEnergyVisible(shipId)) {
        return;
    }
    const drawOptions = options && typeof options === "object" ? options : null;
    const requestedAlpha = drawOptions && Number.isFinite(drawOptions.alpha) ? Math.max(0, Math.min(1, drawOptions.alpha)) : 1;
    if (!(requestedAlpha > 0)) {
        return;
    }
    const referenceShipId = drawOptions && drawOptions.referenceShipId != null ? drawOptions.referenceShipId : shipId;
    const barWidth = 50;
    const barHeight = 3;
    const gap = 3;
    const resolvedScale = typeof entityScale === "number" && entityScale > 0 ? entityScale : 1;
    const spriteReferenceHeight = Number.isFinite(spriteHeight) && spriteHeight > 0 ? spriteHeight / resolvedScale : null;
    let visualHeight = spriteHeight || 0;
    if (referenceShipId != null && typeof getShipBarReferenceHeight === "function") {
        const stableVisualHeight = getShipBarReferenceHeight(referenceShipId, spriteReferenceHeight);
        if (Number.isFinite(stableVisualHeight) && stableVisualHeight > 0) {
            visualHeight = stableVisualHeight * resolvedScale;
        }
    }
    visualHeight = Math.max(10, visualHeight || 0);
    let energyOffset = 0;
    if (shipId != null && typeof getShipEnergyYOffset === "function") {
        const xmlOffset = getShipEnergyYOffset(shipId);
        if (Number.isFinite(xmlOffset)) {
            energyOffset = xmlOffset * resolvedScale;
        }
    }
    const topY = Math.round(screenY - visualHeight / 2 - energyOffset);
    const safeHp = typeof hp === "number" ? hp : 0;
    const safeMaxHp = typeof maxHp === "number" && maxHp > 0 ? maxHp : safeHp > 0 ? safeHp : 1;
    const safeShield = typeof shield === "number" ? shield : 0;
    const hasShieldCapacity = Number.isFinite(maxShield) ? maxShield > 0 : safeShield > 0;
    const safeMaxShield = typeof maxShield === "number" && maxShield > 0 ? maxShield : safeShield > 0 ? safeShield : 1;
    const showShieldBar = hasShieldCapacity && safeShield > 0;
    const hpRatio = Math.max(0, Math.min(1, safeHp / safeMaxHp));
    const shieldRatio = Math.max(0, Math.min(1, safeShield / safeMaxShield));
    const extraHpRatio = safeHp > safeMaxHp ? Math.max(0, Math.min(1, (safeHp - safeMaxHp) / safeMaxHp)) : 0;
    const x = Math.round(screenX - barWidth / 2);
    const yHp = topY;
    const yShield = topY + barHeight + gap;
    ctx.save();
    ctx.globalAlpha *= requestedAlpha;
    ctx.fillStyle = "#6d6d6d";
    ctx.fillRect(x, yHp, barWidth, barHeight);
    if (showShieldBar) {
        ctx.fillRect(x, yShield, barWidth, barHeight);
    }
    ctx.fillStyle = "#49be40";
    ctx.fillRect(x, yHp, Math.round(barWidth * hpRatio), barHeight);
    if (extraHpRatio > 0) {
        ctx.fillStyle = "#fdfd3e";
        ctx.fillRect(x, yHp, Math.round(barWidth * extraHpRatio), barHeight);
    }
    if (showShieldBar) {
        ctx.fillStyle = "#338fcc";
        ctx.fillRect(x, yShield, Math.round(barWidth * shieldRatio), barHeight);
    }
    ctx.fillStyle = "#000000";
    const outlineX = x - 1;
    const outlineWidth = barWidth + 2;
    const outlineHeight = barHeight + 2;
    const drawBarOutline = function(outlineY) {
        ctx.fillRect(outlineX, outlineY, outlineWidth, 1);
        ctx.fillRect(outlineX, outlineY + outlineHeight - 1, outlineWidth, 1);
        ctx.fillRect(outlineX, outlineY, 1, outlineHeight);
        ctx.fillRect(outlineX + outlineWidth - 1, outlineY, 1, outlineHeight);
    };
    drawBarOutline(yHp - 1);
    if (showShieldBar) {
        drawBarOutline(yShield - 1);
    }
    ctx.restore();
}

function resolveShieldBurstAnchor(sb) {
    if (sb && sb.followTarget && sb.targetId != null) {
        if (heroId !== null && sb.targetId === heroId) {
            return {
                x: shipX,
                y: shipY
            };
        }
        const ent = entities[sb.targetId];
        if (ent && (ent.kind === "player" || ent.kind === "npc")) {
            return {
                x: ent.x,
                y: ent.y
            };
        }
    }
    return {
        x: sb.x,
        y: sb.y
    };
}

function drawShieldBursts() {
    const now = performance.now();
    for (const sb of shieldBursts) {
        const spriteKey = sb.sprite || "hit";
        const def = SHIELD_SPRITE_DEFS[spriteKey];
        if (!def) continue;
        const elapsed = now - sb.createdAt;
        const frameDuration = 1e3 / (def.fps || SHIELD_ANIM_FPS);
        const frame = Math.min(def.frameCount - 1, Math.floor(elapsed / frameDuration));
        const frameDef = getShieldSpriteFrame(spriteKey, frame);
        if (!frameDef || frameDef.pendingAtlas) continue;
        const angle = Number.isFinite(sb.angle) ? sb.angle : 0;
        const radius = Number.isFinite(sb.radius) ? sb.radius : 0;
        const anchor = resolveShieldBurstAnchor(sb);
        const baseX = anchor.x + Math.cos(angle) * radius;
        const baseY = anchor.y + Math.sin(angle) * radius;
        const burstScreenX = mapToScreenX(baseX);
        const burstScreenY = mapToScreenY(baseY);
        const entityScale = typeof getEntityDrawScale === "function" ? getEntityDrawScale() : 1;
        const scale = Math.max(.01, radius / 100 * entityScale);
        drawAnchoredEffectFrame(frameDef, burstScreenX, burstScreenY, scale, {
            rotation: angle,
            pivotX: Number.isFinite(def.pivotX) ? def.pivotX : undefined,
            pivotY: Number.isFinite(def.pivotY) ? def.pivotY : undefined
        });
    }
}

const COLLECTOR_BEAM_SCREEN_OFFSET_Y = 65;

function drawHeroCollectorBeamAt(shipScreenX, shipScreenY) {
    if (!heroCollectorBeamState) return;
    const now = performance.now();
    const state = heroCollectorBeamState;
    const lifespan = state.durationMs || COLLECTOR_BEAM_DEFAULT_DURATION_MS;
    if (now - state.startedAt >= lifespan) {
        stopHeroCollectorBeam();
        return;
    }
    if (now - state.lastUpdate >= COLLECTOR_BEAM_FRAME_DURATION) {
        const steps = Math.floor((now - state.lastUpdate) / COLLECTOR_BEAM_FRAME_DURATION);
        state.frameIndex = (state.frameIndex + steps) % COLLECTOR_BEAM_FRAME_COUNT;
        state.lastUpdate = state.lastUpdate + steps * COLLECTOR_BEAM_FRAME_DURATION;
    }
    const frameImg = getCollectorBeamFrame(state.frameIndex);
    if (frameImg) {
        const entityScale = typeof getEntityDrawScale === "function" ? getEntityDrawScale() : 1;
        const centerY = shipScreenY + COLLECTOR_BEAM_SCREEN_OFFSET_Y * entityScale;
        drawCenteredEffectFrame(frameImg, shipScreenX, centerY, entityScale);
    }
}

function drawRepairRobot(shipScreenX, shipScreenY, shipHeight = 0) {
    if (!heroRepairing) return;
    if (!repairRobotState) {
        startRepairRobotAnimation();
    }
    if (!repairRobotState) return;
    const now = performance.now();
    if (now - repairRobotState.lastUpdate >= REPAIR_ROBOT_FRAME_DURATION) {
        const steps = Math.floor((now - repairRobotState.lastUpdate) / REPAIR_ROBOT_FRAME_DURATION);
        repairRobotState.frameIndex = (repairRobotState.frameIndex + steps) % REPAIR_ROBOT_FRAME_COUNT;
        repairRobotState.lastUpdate += steps * REPAIR_ROBOT_FRAME_DURATION;
    }
    const frameDef = getRepairRobotFrame(repairRobotState.frameIndex);
    if (!frameDef) return;
    const entityScale = typeof getEntityDrawScale === "function" ? getEntityDrawScale() : 1;
    const anchorY = shipScreenY + REPAIR_ROBOT_OFFSET_Y * entityScale;
    drawCenteredEffectFrame(frameDef, shipScreenX, anchorY, entityScale);
}

function drawBattleRepairRobot(shipScreenX, shipScreenY, visualOwner = null) {
    const now = performance.now();
    const isHeroVisual = !visualOwner;
    const isActive = isHeroVisual ? !!heroBattleRepairing : !!visualOwner.techBattleRepairing;
    const fadeUntil = isHeroVisual ? heroBattleRepairFadeUntil : Number(visualOwner.techBattleRepairFadeUntil) || 0;
    const activeUntil = isHeroVisual ? heroBattleRepairUntil : Number(visualOwner.techBattleRepairUntil) || 0;
    const isFading = !isActive && fadeUntil && now < fadeUntil;
    if (!isActive && !isFading) {
        if (battleRepairRobotState) stopBattleRepairRobotAnimation();
        return;
    }
    if (isActive && activeUntil && now >= activeUntil) {
        if (isHeroVisual) {
            if (typeof setHeroBattleRepairing === "function") {
                setHeroBattleRepairing(false);
            }
        } else {
            visualOwner.techBattleRepairing = false;
            visualOwner.techBattleRepairUntil = 0;
            visualOwner.techBattleRepairFadeUntil = now + (typeof BATTLE_REPAIR_FADE_MS === "number" ? BATTLE_REPAIR_FADE_MS : 250);
        }
        return;
    }
    if (!battleRepairRobotState) {
        if (isActive) startBattleRepairRobotAnimation(); else return;
    }
    if (now - battleRepairRobotState.lastUpdate >= BATTLE_REPAIR_ROBOT_FRAME_DURATION) {
        const steps = Math.floor((now - battleRepairRobotState.lastUpdate) / BATTLE_REPAIR_ROBOT_FRAME_DURATION);
        battleRepairRobotState.frameIndex = (battleRepairRobotState.frameIndex + steps) % BATTLE_REPAIR_ROBOT_FRAME_COUNT;
        battleRepairRobotState.lastUpdate += steps * BATTLE_REPAIR_ROBOT_FRAME_DURATION;
    }
    const frameDef = getBattleRepairRobotFrame(battleRepairRobotState.frameIndex);
    if (!frameDef) return;
    const entityScale = typeof getEntityDrawScale === "function" ? getEntityDrawScale() : 1;
    const anchorY = shipScreenY + (typeof BATTLE_REPAIR_ROBOT_OFFSET_Y === "number" ? BATTLE_REPAIR_ROBOT_OFFSET_Y * entityScale : 0);
    let alpha = 1;
    if (isFading) {
        const remaining = fadeUntil - now;
        alpha = Math.max(0, Math.min(1, remaining / BATTLE_REPAIR_FADE_MS));
    }
    ctx.save();
    ctx.globalAlpha = ctx.globalAlpha * alpha;
    drawCenteredEffectFrame(frameDef, shipScreenX, anchorY, entityScale);
    ctx.restore();
}

const expansionOffsetCache = {};

const _expansionCenterCanvas = document.createElement("canvas");

const _expansionCenterCtx = _expansionCenterCanvas.getContext("2d", {
    willReadFrequently: true
});

function getImageVisualCenter(img) {
    if (!img || !img.complete || img.width === 0 || img.height === 0) return null;
    _expansionCenterCanvas.width = img.width;
    _expansionCenterCanvas.height = img.height;
    _expansionCenterCtx.clearRect(0, 0, img.width, img.height);
    _expansionCenterCtx.drawImage(img, 0, 0);
    const {data: data} = _expansionCenterCtx.getImageData(0, 0, img.width, img.height);
    let sumX = 0;
    let sumY = 0;
    let weight = 0;
    const alphaThreshold = 10;
    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
            const alpha = data[(y * img.width + x) * 4 + 3];
            if (alpha > alphaThreshold) {
                sumX += x * alpha;
                sumY += y * alpha;
                weight += alpha;
            }
        }
    }
    if (!weight) {
        return {
            cx: img.width / 2,
            cy: img.height / 2
        };
    }
    return {
        cx: sumX / weight,
        cy: sumY / weight
    };
}

function getVisualShiftFromCenter(img) {
    const center = getImageVisualCenter(img);
    if (!center) return {
        x: 0,
        y: 0
    };
    return {
        x: center.cx - img.width / 2,
        y: center.cy - img.height / 2
    };
}

function getShipExpansionVisualShiftCached(shipId, frameIndex, img) {
    const assetKey = typeof getShipExpansionFrameCacheKey === "function" ? getShipExpansionFrameCacheKey(shipId, frameIndex) : "";
    const key = assetKey || `${shipId}:${frameIndex}:${img && (img.currentSrc || img.src) || ""}:${img && img.width || 0}x${img && img.height || 0}`;
    if (expansionOffsetCache[key]) return expansionOffsetCache[key];
    const shift = getVisualShiftFromCenter(img);
    expansionOffsetCache[key] = shift;
    return shift;
}

function getResolvedShipExpansionVisualShift(shipId, frameIndex, img, entityScale = 1) {
    if (!img || !img.complete || img.width <= 0 || img.height <= 0 || typeof getVisualShiftFromCenter !== "function") {
        return {
            x: 0,
            y: 0
        };
    }
    const rawShift = typeof getShipExpansionVisualShiftCached === "function" ? getShipExpansionVisualShiftCached(shipId, frameIndex, img) : getVisualShiftFromCenter(img);
    const resolvedScale = typeof entityScale === "number" && entityScale > 0 ? entityScale : 1;
    const maxShiftX = img.width * resolvedScale * .25;
    const maxShiftY = img.height * resolvedScale * .25;
    let shiftX = Number.isFinite(rawShift && rawShift.x) ? rawShift.x * resolvedScale : 0;
    let shiftY = Number.isFinite(rawShift && rawShift.y) ? rawShift.y * resolvedScale : 0;
    if (Math.abs(shiftX) > maxShiftX) shiftX = 0;
    if (Math.abs(shiftY) > maxShiftY) shiftY = 0;
    return {
        x: shiftX,
        y: shiftY
    };
}

const _visualBoundsCanvas = document.createElement("canvas");

const _visualBoundsCtx = _visualBoundsCanvas.getContext("2d", {
    willReadFrequently: true
});

function getImageVisualBounds(img, alphaThreshold = 20) {
    if (!img || !img.complete || img.width === 0 || img.height === 0) return null;
    _visualBoundsCanvas.width = img.width;
    _visualBoundsCanvas.height = img.height;
    _visualBoundsCtx.clearRect(0, 0, img.width, img.height);
    _visualBoundsCtx.drawImage(img, 0, 0);
    const {data: data} = _visualBoundsCtx.getImageData(0, 0, img.width, img.height);
    let minX = img.width, minY = img.height, maxX = -1, maxY = -1;
    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
            const alpha = data[(y * img.width + x) * 4 + 3];
            if (alpha > alphaThreshold) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (maxX < 0 || maxY < 0) {
        return {
            minX: 0,
            minY: 0,
            maxX: img.width - 1,
            maxY: img.height - 1,
            width: img.width,
            height: img.height
        };
    }
    return {
        minX: minX,
        minY: minY,
        maxX: maxX,
        maxY: maxY,
        width: maxX - minX + 1,
        height: maxY - minY + 1
    };
}

function getImageVisualRadius(img, alphaThreshold = 20) {
    const bounds = getImageVisualBounds(img, alphaThreshold);
    if (bounds && bounds.width > 0 && bounds.height > 0) {
        return Math.max(bounds.width, bounds.height) / 2;
    }
    return Math.max(img.width, img.height) / 2;
}

const shipVisualRadiusCache = Object.create(null);

const shipVisualBoundsCache = Object.create(null);

function normalizeShipVisualFrameIndex(shipId, frameIndex = 0) {
    const def = typeof SHIP_SPRITE_DEFS === "object" && SHIP_SPRITE_DEFS ? SHIP_SPRITE_DEFS[shipId] : null;
    const frameCount = Math.max(1, Number(def && def.frameCount) || 1);
    const numericFrame = Number(frameIndex);
    let idx = Number.isFinite(numericFrame) ? numericFrame % frameCount : 0;
    if (idx < 0) idx += frameCount;
    return idx;
}

function getShipVisualBoundsCached(shipId, frameIndex = 0, alphaThreshold = 20) {
    const idx = normalizeShipVisualFrameIndex(shipId, frameIndex);
    const numericThreshold = Number(alphaThreshold);
    const threshold = Number.isFinite(numericThreshold) ? numericThreshold : 20;
    const assetKey = typeof getShipSpriteFrameCacheKey === "function" ? getShipSpriteFrameCacheKey(shipId, idx) : "";
    const key = `${assetKey || `${shipId}_${idx}`}_${threshold}`;
    if (shipVisualBoundsCache[key]) return shipVisualBoundsCache[key];
    const img = getShipSpriteFrame(shipId, idx);
    if (!img || !img.complete || img.width === 0 || img.height === 0) return null;
    const bounds = getImageVisualBounds(img, threshold);
    if (bounds) shipVisualBoundsCache[key] = bounds;
    return bounds;
}

function getShipVisualRadiusCached(shipId, frameIndex = 0) {
    const idx = normalizeShipVisualFrameIndex(shipId, frameIndex);
    const assetKey = typeof getShipSpriteFrameCacheKey === "function" ? getShipSpriteFrameCacheKey(shipId, idx) : "";
    const key = assetKey || `${shipId}_${idx}`;
    if (shipVisualRadiusCache[key] != null) return shipVisualRadiusCache[key];
    const img = getShipSpriteFrame(shipId, idx);
    if (!img || !img.complete || img.width === 0 || img.height === 0) return null;
    const bounds = getShipVisualBoundsCached(shipId, idx, 20);
    const r = bounds && bounds.width > 0 && bounds.height > 0 ? Math.max(bounds.width, bounds.height) / 2 : Math.max(img.width, img.height) / 2;
    shipVisualRadiusCache[key] = r;
    return r;
}

const shipVisualShiftCache = Object.create(null);

const FLASH_SHIP_REGISTRATION_OFFSETS = Object.freeze({
    10: Object.freeze({
        x: -1,
        y: 22
    }),
    56: Object.freeze({
        x: -1,
        y: 22
    }),
    59: Object.freeze({
        x: -1,
        y: 22
    })
});

function getFixedFlashShipRegistrationOffset(shipId) {
    const numericShipId = Number.parseInt(shipId, 10);
    if (!Number.isFinite(numericShipId)) {
        return null;
    }
    return FLASH_SHIP_REGISTRATION_OFFSETS[numericShipId] || null;
}

function getShipVisualShiftCached(shipId, frameIndex, img) {
    const fixedOffset = getFixedFlashShipRegistrationOffset(shipId);
    if (fixedOffset) {
        return fixedOffset;
    }
    const idx = normalizeShipVisualFrameIndex(shipId, frameIndex);
    const assetKey = typeof getShipSpriteFrameCacheKey === "function" ? getShipSpriteFrameCacheKey(shipId, idx) : "";
    const key = assetKey || `${shipId}_${idx}`;
    if (shipVisualShiftCache[key]) return shipVisualShiftCache[key];
    const shift = getVisualShiftFromCenter(img);
    shipVisualShiftCache[key] = shift;
    return shift;
}

function getResolvedShipVisualShift(shipId, frameIndex, img, entityScale = 1) {
    if (!img || !img.complete || img.width <= 0 || img.height <= 0 || typeof getVisualShiftFromCenter !== "function") {
        return {
            x: 0,
            y: 0
        };
    }
    const rawShift = typeof getShipVisualShiftCached === "function" ? getShipVisualShiftCached(shipId, frameIndex, img) : getVisualShiftFromCenter(img);
    const resolvedScale = typeof entityScale === "number" && entityScale > 0 ? entityScale : 1;
    let shiftX = Number.isFinite(rawShift && rawShift.x) ? rawShift.x * resolvedScale : 0;
    let shiftY = Number.isFinite(rawShift && rawShift.y) ? rawShift.y * resolvedScale : 0;
    if (!getFixedFlashShipRegistrationOffset(shipId)) {
        const maxShiftX = img.width * resolvedScale * .25;
        const maxShiftY = img.height * resolvedScale * .25;
        if (Math.abs(shiftX) > maxShiftX) shiftX = 0;
        if (Math.abs(shiftY) > maxShiftY) shiftY = 0;
    }
    return {
        x: shiftX,
        y: shiftY
    };
}

function warmShipSpriteVisualMetrics(shipId, frameIndex = 0, entityScale = 1) {
    const idx = normalizeShipVisualFrameIndex(shipId, frameIndex);
    const img = typeof getShipSpriteFrame === "function" ? getShipSpriteFrame(shipId, idx) : null;
    if (!img || !img.complete || img.width <= 0 || img.height <= 0) return false;
    getResolvedShipVisualShift(shipId, idx, img, entityScale);
    const bounds = getShipVisualBoundsCached(shipId, idx, 20);
    const radius = getShipVisualRadiusCached(shipId, idx);
    return !!bounds && radius != null;
}

function flashShipSkillNowMs() {
    return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
}

function flashClampUnit(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
}

const FLASH_ENERGY_LEECH_INITIAL_FADE_IN_MS = 500;

const FLASH_ENERGY_LEECH_FADE_IN_MS = 1000;

const FLASH_ENERGY_LEECH_PAUSE_DELAY_MS = 2000;

const FLASH_ENERGY_LEECH_FADE_OUT_MS = 1000;

const FLASH_ENERGY_LEECH_CYCLE_MS = 9000;

function flashGetEnergyLeechPulseAlpha(nowMs, startedAtMs) {
    const start = Number(startedAtMs) || 0;
    if (!(start > 0) || nowMs < start) return 0;
    const ageMs = nowMs - start;
    const cycleIndex = Math.max(0, Math.floor(ageMs / FLASH_ENERGY_LEECH_CYCLE_MS));
    const local = ageMs - cycleIndex * FLASH_ENERGY_LEECH_CYCLE_MS;
    const fadeInMs = cycleIndex === 0 ? FLASH_ENERGY_LEECH_INITIAL_FADE_IN_MS : FLASH_ENERGY_LEECH_FADE_IN_MS;
    if (local < fadeInMs) {
        return local / fadeInMs;
    }
    if (local < FLASH_ENERGY_LEECH_PAUSE_DELAY_MS) {
        return 1;
    }
    if (local < FLASH_ENERGY_LEECH_PAUSE_DELAY_MS + FLASH_ENERGY_LEECH_FADE_OUT_MS) {
        return Math.max(0, 1 - (local - FLASH_ENERGY_LEECH_PAUSE_DELAY_MS) / FLASH_ENERGY_LEECH_FADE_OUT_MS);
    }
    return 0;
}

function flashDrawEnergyLeechAura(centerX, centerY, spriteHeight, startedAtMs, untilMs = 0) {
    const now = performance.now();
    if (untilMs && untilMs <= now) return;
    const alpha = flashGetEnergyLeechPulseAlpha(now, startedAtMs);
    if (!(alpha > 0)) return;
    if (typeof flashGetTechEffectSequenceFrameNumber !== "function" || typeof flashGetTechEffectFrameImage !== "function") return;
    const frameNumber = flashGetTechEffectSequenceFrameNumber("ELA0", startedAtMs, now);
    if (!(frameNumber > 0)) return;
    const frameImg = flashGetTechEffectFrameImage("ELA0", frameNumber);
    if (!frameImg || !frameImg.complete || !((frameImg.naturalWidth || frameImg.width) > 0) || !((frameImg.naturalHeight || frameImg.height) > 0)) return;
    const entityScale = typeof getEntityDrawScale === "function" ? getEntityDrawScale() : 1;
    ctx.save();
    ctx.globalAlpha *= alpha;
    drawCenteredEffectFrame(frameImg, centerX, centerY, entityScale);
    ctx.restore();
}

function flashDrawShieldBackupBurst(centerX, centerY, startedAtMs, untilMs = 0) {
    const start = Number(startedAtMs) || 0;
    if (!(start > 0)) return;
    const now = performance.now();
    const totalDuration = typeof FLASH_SHIELD_BACKUP_VISUAL_MS === "number" && FLASH_SHIELD_BACKUP_VISUAL_MS > 0 ? FLASH_SHIELD_BACKUP_VISUAL_MS : 1500;
    const elapsed = now - start;
    if (elapsed < 0 || elapsed > totalDuration) return;
    const def = SHIELD_SPRITE_DEFS.tech_shield_backup;
    if (!def) return;
    const fps = Math.max(1, Number(def.fps) || 15);
    const frameDurationMs = 1000 / fps;
    const frameIndex = Math.min(def.frameCount - 1, Math.floor(elapsed / frameDurationMs));
    const frameDef = getShieldSpriteFrame("tech_shield_backup", frameIndex);
    if (!frameDef || frameDef.pendingAtlas) return;
    let alpha = 1;
    const fadeInMs = typeof FLASH_SHIELD_BACKUP_FADE_IN_MS === "number" && FLASH_SHIELD_BACKUP_FADE_IN_MS > 0 ? FLASH_SHIELD_BACKUP_FADE_IN_MS : 250;
    const holdMs = typeof FLASH_SHIELD_BACKUP_HOLD_MS === "number" && FLASH_SHIELD_BACKUP_HOLD_MS >= 0 ? FLASH_SHIELD_BACKUP_HOLD_MS : 1000;
    const fadeOutMs = typeof FLASH_SHIELD_BACKUP_FADE_OUT_MS === "number" && FLASH_SHIELD_BACKUP_FADE_OUT_MS > 0 ? FLASH_SHIELD_BACKUP_FADE_OUT_MS : 250;
    if (elapsed < fadeInMs) {
        alpha = elapsed / fadeInMs;
    } else if (elapsed > fadeInMs + holdMs) {
        alpha = Math.max(0, 1 - (elapsed - fadeInMs - holdMs) / fadeOutMs);
    }
    const entityScale = typeof getEntityDrawScale === "function" ? getEntityDrawScale() : 1;
    ctx.save();
    ctx.globalAlpha *= alpha;
    drawCenteredEffectFrame(frameDef, centerX, centerY, entityScale);
    ctx.restore();
}

function flashResolveTechVisualWorldPosition(targetId, out = null) {
    const numericId = parseInt(targetId, 10);
    if (!Number.isFinite(numericId)) return null;
    const pos = out || {
        x: 0,
        y: 0
    };
    if (numericId === heroId) {
        if (typeof shipX !== "number" || typeof shipY !== "number") return null;
        pos.x = shipX;
        pos.y = shipY;
        return pos;
    }
    const ent = typeof entities === "object" && entities ? entities[numericId] || null : null;
    if (!ent || typeof ent.x !== "number" || typeof ent.y !== "number") return null;
    pos.x = ent.x;
    pos.y = ent.y;
    return pos;
}

function flashDrawChainImpulseBolt(fromX, fromY, toX, toY, alpha, seed, reveal = 1) {
    const clampedReveal = Math.max(0, Math.min(1, Number(reveal) || 0));
    if (!(alpha > 0) || !(clampedReveal > 0)) return;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const fullLength = Math.sqrt(dx * dx + dy * dy);
    if (!(fullLength > 0)) return;
    const endX = fromX + dx * clampedReveal;
    const endY = fromY + dy * clampedReveal;
    const drawDx = endX - fromX;
    const drawDy = endY - fromY;
    const length = Math.sqrt(drawDx * drawDx + drawDy * drawDy);
    if (!(length > 0)) return;
    const segments = Math.max(6, Math.min(18, Math.round(length / 45)));
    const angle = Math.atan2(drawDy, drawDx);
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = "rgba(222,240,255,0.98)";
    ctx.lineWidth = 2.7;
    ctx.lineCap = "round";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(125,210,255,0.95)";
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    for (let step = 1; step < segments; step++) {
        const t = step / segments;
        const baseX = fromX + drawDx * t;
        const baseY = fromY + drawDy * t;
        const jitter = Math.sin(seed * 0.017 + step * 1.71) * 9 + Math.cos(seed * 0.023 + step * 1.13) * 6;
        ctx.lineTo(baseX + nx * jitter, baseY + ny * jitter);
    }
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.strokeStyle = "rgba(140,220,255,0.92)";
    ctx.lineWidth = 1.2;
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.restore();
}

function drawChainImpulseTechEffects() {
    if (!Array.isArray(techChainImpulseEffects) || !techChainImpulseEffects.length) return;
    const now = performance.now();
    let activeCount = 0;
    for (let i = 0; i < techChainImpulseEffects.length; i++) {
        const effect = techChainImpulseEffects[i];
        if (effect && (!(Number(effect.endsAt) > 0) || now <= Number(effect.endsAt))) {
            techChainImpulseEffects[activeCount++] = effect;
        }
    }
    techChainImpulseEffects.length = activeCount;
    if (!techChainImpulseEffects.length) return;
    const sourceScratch = drawChainImpulseTechEffects._sourceScratch || (drawChainImpulseTechEffects._sourceScratch = {
        x: 0,
        y: 0
    });
    const targetScratch = drawChainImpulseTechEffects._targetScratch || (drawChainImpulseTechEffects._targetScratch = {
        x: 0,
        y: 0
    });
    for (const effect of techChainImpulseEffects) {
        const sourcePos = flashResolveTechVisualWorldPosition(effect.attackerId, sourceScratch);
        if (!sourcePos) continue;
        const targetCount = Array.isArray(effect.targetIds) ? effect.targetIds.length : 0;
        if (!(targetCount > 0)) continue;
        const chainBuildEndAt = Number(effect.startedAt) + targetCount * FLASH_CHAIN_IMPULSE_BUILD_MS;
        let fadeAlpha = 1;
        if (now > chainBuildEndAt) {
            fadeAlpha = Math.max(0, 1 - (now - chainBuildEndAt) / FLASH_CHAIN_IMPULSE_FADE_MS);
        }
        if (!(fadeAlpha > 0)) continue;
        let lastX = sourcePos.x;
        let lastY = sourcePos.y;
        for (let idx = 0; idx < effect.targetIds.length; idx++) {
            const targetPos = flashResolveTechVisualWorldPosition(effect.targetIds[idx], targetScratch);
            if (!targetPos) continue;
            const targetX = targetPos.x;
            const targetY = targetPos.y;
            const fromX = typeof mapToScreenX === "function" ? mapToScreenX(lastX) : lastX;
            const fromY = typeof mapToScreenY === "function" ? mapToScreenY(lastY) : lastY;
            const toX = typeof mapToScreenX === "function" ? mapToScreenX(targetX) : targetX;
            const toY = typeof mapToScreenY === "function" ? mapToScreenY(targetY) : targetY;
            const segmentStartedAt = Number(effect.startedAt) + idx * FLASH_CHAIN_IMPULSE_BUILD_MS;
            const segmentAge = now - segmentStartedAt;
            if (segmentAge < 0) {
                lastX = targetX;
                lastY = targetY;
                continue;
            }
            const reveal = Math.max(0, Math.min(1, segmentAge / FLASH_CHAIN_IMPULSE_BUILD_MS));
            if (reveal > 0) {
                const animatedSeed = (effect.seed || 0) + idx * 17 + now * 0.06;
                flashDrawChainImpulseBolt(fromX, fromY, toX, toY, fadeAlpha, animatedSeed, reveal);
            }
            lastX = targetX;
            lastY = targetY;
        }
    }
}

function flashDrawSolaceLightDecorator(centerX, centerY, baseRadius, alpha, ageMs, durationMs) {
    if (!(alpha > 0) || !(baseRadius > 0) || !(durationMs > 0)) return;
    const flashCount = 11;
    const flashSpacing = durationMs / flashCount;
    const flashLifeMs = Math.max(90, flashSpacing * 0.7);
    for (let idx = 0; idx < flashCount; idx++) {
        const flashStart = idx * flashSpacing;
        const localAge = ageMs - flashStart;
        if (localAge < 0 || localAge > flashLifeMs) continue;
        const t = localAge / flashLifeMs;
        const pulseAlpha = alpha * (1 - t);
        const pulseRadius = baseRadius * (0.18 + 0.10 * t);
        const angle = idx * (Math.PI * 2 / flashCount);
        const offsetRadius = baseRadius * (0.46 + 0.06 * Math.sin(idx));
        const px = centerX + Math.cos(angle) * offsetRadius;
        const py = centerY + Math.sin(angle) * offsetRadius * 0.7;
        ctx.save();
        ctx.globalAlpha *= pulseAlpha;
        const gradient = ctx.createRadialGradient(px, py, 0, px, py, pulseRadius);
        gradient.addColorStop(0, "rgba(255,255,255,0.95)");
        gradient.addColorStop(0.4, "rgba(220,255,210,0.72)");
        gradient.addColorStop(1, "rgba(220,255,210,0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(px, py, pulseRadius, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.restore();
    }
}

function flashResolveLightningEffectPlacement(centerX, centerY, shipId, frameIndex, spriteHeight, angleRad, entityKey) {
    const engineState = entityKey && typeof engineAnimationState !== "undefined" ? engineAnimationState[entityKey] || null : null;
    if (!engineState || !engineState.isMoving) return null;

    const entityScale = typeof getEntityDrawScale === "function" ? getEntityDrawScale() : 1;
    const rotation = (typeof angleRad === "number" ? angleRad : 0) + Math.PI;
    let drawX = centerX;
    let drawY = centerY;

    const offsets = typeof getEngineOffsetsForFrame === "function" ? getEngineOffsetsForFrame(shipId, frameIndex || 0) : null;
    if (offsets && offsets.length) {
        let sumX = 0;
        let sumY = 0;
        let count = 0;
        for (let i = 0; i < offsets.length; i++) {
            const offset = offsets[i];
            if (!offset) continue;
            const ox = Number(offset.x);
            const oy = Number(offset.y);
            if (!Number.isFinite(ox) || !Number.isFinite(oy)) continue;
            sumX += ox;
            sumY += oy;
            count++;
        }
        if (count > 0) {
            drawX += (sumX / count) * entityScale;
            drawY += (sumY / count) * entityScale;
        }
    } else {
        const referenceHeight = Math.max(44, (spriteHeight || (typeof getShipReferenceVisualHeight === "function" ? getShipReferenceVisualHeight(shipId) : 0) || 44) * entityScale);
        const backwardDistance = Math.max(8, referenceHeight * 0.62);
        drawX += Math.cos(rotation) * backwardDistance;
        drawY += Math.sin(rotation) * backwardDistance;
    }

    return { drawX, drawY, rotation, movingBoost: 1 };
}

function flashGetSkillEffectSequenceFrameNumber(effectState, nowMs) {
    if (!effectState || typeof flashGetSkillEffectSequenceMeta !== "function") return 0;
    const meta = flashGetSkillEffectSequenceMeta(effectState.abilityId);
    if (!meta) return 0;
    const fps = Math.max(1, Number(meta.fps) || 24);
    const frameCount = Math.max(1, Number(meta.frameCount) || 1);
    const frameDurationMs = 1000 / fps;
    const startedAtMs = Number(effectState.startedAtMs) || nowMs;
    const ageMs = Math.max(0, nowMs - startedAtMs);
    const instantLoops = Math.max(0, Number(meta.instantLoops) || 0);
    if (meta.loop === false) {
        if (instantLoops > 0) {
            const totalFrames = frameCount * instantLoops;
            const sequenceIndex = Math.min(totalFrames - 1, Math.max(0, Math.floor(ageMs / frameDurationMs)));
            return sequenceIndex % frameCount + 1;
        }
        return Math.min(frameCount, Math.floor(ageMs / frameDurationMs) + 1);
    }
    return Math.floor(ageMs / frameDurationMs) % frameCount + 1;
}

function flashTryDrawShipSkillVisualSequence(effectState, centerX, centerY, shipId, frameIndex, angleRad, spriteHeight, alpha, entityKey) {
    if (!effectState || !(alpha > 0)) return false;
    if (typeof flashGetSkillEffectSequenceMeta !== "function" || typeof flashGetSkillEffectFrameImage !== "function") return false;
    const meta = flashGetSkillEffectSequenceMeta(effectState.abilityId);
    if (!meta) return false;
    const nowMs = flashShipSkillNowMs();
    const frameNumber = flashGetSkillEffectSequenceFrameNumber(effectState, nowMs);
    if (!(frameNumber > 0)) return false;
    const img = flashGetSkillEffectFrameImage(effectState.abilityId, frameNumber);
    if (!img || !img.complete || !(img.naturalWidth > 0) || !(img.naturalHeight > 0)) return false;

    const entityScale = typeof getEntityDrawScale === "function" ? getEntityDrawScale() : 1;
    const referenceHeight = Math.max(
        44,
        (spriteHeight || (typeof getShipReferenceVisualHeight === "function" ? getShipReferenceVisualHeight(shipId) : 0) || 44) * entityScale
    );
    const effectScale = Math.max(0.25, referenceHeight * 0.5 / 65);
    let drawW = img.naturalWidth * effectScale;
    let drawH = img.naturalHeight * effectScale;
    let drawX = centerX;
    let drawY = centerY;
    let rotation = typeof angleRad === "number" ? angleRad : 0;

    if (effectState.abilityId === "lightning") {
        const placement = flashResolveLightningEffectPlacement(centerX, centerY, shipId, frameIndex, spriteHeight, angleRad, entityKey);
        if (!placement) return false;
        drawX = placement.drawX;
        drawY = placement.drawY;
        rotation = placement.rotation;
        drawW *= 0.9;
        drawH *= 0.9;
    }

    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(drawX, drawY);
    ctx.rotate(rotation);
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
    return true;
}

function flashDrawShipSkillVisualState(effectState, centerX, centerY, shipId, frameIndex, angleRad, spriteHeight, entityKey) {
    if (!effectState) return;
    const nowMs = flashShipSkillNowMs();
    const startedAtMs = Number(effectState.startedAtMs) || nowMs;
    const ageMs = Math.max(0, nowMs - startedAtMs);
    const fadeInMs = Math.max(0, Number(effectState.fadeInMs) || 0);
    const fadeOutMs = Math.max(0, Number(effectState.fadeOutMs) || 0);
    const expiresAtMs = Number(effectState.expiresAtMs) || 0;
    let alpha = 1;
    if (fadeInMs > 0 && ageMs < fadeInMs) {
        alpha *= flashClampUnit(ageMs / fadeInMs);
    }
    if (expiresAtMs > 0) {
        const remainingMs = expiresAtMs - nowMs;
        if (remainingMs <= 0) return;
        if ((!effectState.active || effectState.fading) && fadeOutMs > 0) {
            alpha *= flashClampUnit(remainingMs / fadeOutMs);
        }
    }
    if (!(alpha > 0)) return;
    const entityScale = typeof getEntityDrawScale === "function" ? getEntityDrawScale() : 1;
    const baseHeight = Math.max(24, (spriteHeight || (typeof getShipReferenceVisualHeight === "function" ? getShipReferenceVisualHeight(shipId) : 0) || 44) * entityScale * 0.72);
    const baseRadius = Math.max(18, baseHeight * 0.6);
    const abilityId = effectState.abilityId || "";
    const drewSequence = flashTryDrawShipSkillVisualSequence(effectState, centerX, centerY, shipId, frameIndex, angleRad, spriteHeight, alpha, entityKey);
    if (drewSequence) {
        if (abilityId === "solace") {
            const totalDuration = Math.max(1, Number(effectState.sequenceDurationMs) || 0);
            flashDrawSolaceLightDecorator(centerX, centerY, baseRadius, alpha, ageMs, totalDuration);
        }
        return;
    }
    return;
}

function drawShipSkillVisualEffectsForEntity(entityId, centerX, centerY, shipId, frameIndex, angleRad, spriteHeight, entityKey, worldX, worldY) {
    if (typeof flashGetShipSkillVisualStatesForEntity !== "function") return;
    const states = flashGetShipSkillVisualStatesForEntity(entityId);
    if (!states || !states.length) return;
    const engineState = entityKey && typeof engineAnimationState !== "undefined" ? engineAnimationState[entityKey] || null : null;
    const isMoving = !!(engineState && engineState.isMoving);
    for (let i = 0; i < states.length; i++) {
        const state = states[i];
        if (typeof flashUpdateShipSkillRuntimeAudio === "function") {
            flashUpdateShipSkillRuntimeAudio(state, worldX, worldY, isMoving);
        }
        flashDrawShipSkillVisualState(state, centerX, centerY, shipId, frameIndex, angleRad, spriteHeight, entityKey);
    }
}

const shipStableVisualHeightCache = Object.create(null);

function getShipReferenceVisualHeight(shipId) {
    const resolvedId = Number.parseInt(shipId, 10);
    if (!Number.isFinite(resolvedId)) return null;
    if (Object.prototype.hasOwnProperty.call(shipStableVisualHeightCache, resolvedId)) {
        return shipStableVisualHeightCache[resolvedId];
    }
    let visualHeight = null;
    if (typeof getShipSpriteFrame === "function") {
        const img = getShipSpriteFrame(resolvedId, 0);
        if (img && img.complete && img.width > 0 && img.height > 0) {
            let bounds = null;
            if (typeof getShipVisualBoundsCached === "function") {
                bounds = getShipVisualBoundsCached(resolvedId, 0, 20);
            } else if (typeof getImageVisualBounds === "function") {
                bounds = getImageVisualBounds(img, 20);
            }
            if (bounds && Number.isFinite(bounds.height) && bounds.height > 0) {
                visualHeight = bounds.height;
            } else {
                visualHeight = img.height;
            }
        }
    }
    shipStableVisualHeightCache[resolvedId] = visualHeight;
    return visualHeight;
}

if (typeof window !== "undefined") {
    window.getShipReferenceVisualHeight = getShipReferenceVisualHeight;
}

const heroLevelUpEffects = [];

let heroLevelUpLastLevel = null;

let heroLevelUpLastAt = 0;

function clearHeroLevelUpEffects() {
    heroLevelUpEffects.length = 0;
    heroLevelUpLastLevel = null;
    heroLevelUpLastAt = 0;
}

function triggerHeroLevelUpEffect(level) {
    const now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    const normalizedLevel = Number.isFinite(level) ? level : parseInt(level, 10);
    if (Number.isFinite(normalizedLevel)) {
        if (heroLevelUpLastLevel === normalizedLevel && now - heroLevelUpLastAt < 1200) {
            return false;
        }
        heroLevelUpLastLevel = normalizedLevel;
    }
    heroLevelUpLastAt = now;
    heroLevelUpEffects.push({
        startedAt: now,
        level: Number.isFinite(normalizedLevel) ? normalizedLevel : null
    });
    return true;
}

function drawHeroLevelUpEffects(screenX, screenY) {
    if (!heroLevelUpEffects.length || typeof getLevelUpFrame !== "function" || typeof LEVEL_UP_ANIM === "undefined" || !LEVEL_UP_ANIM) {
        return;
    }
    const now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    const entityScale = typeof getEntityDrawScale === "function" ? getEntityDrawScale() : 1;
    const frameDurationMs = typeof LEVEL_UP_ANIM.frameDurationMs === "number" && LEVEL_UP_ANIM.frameDurationMs > 0 ? LEVEL_UP_ANIM.frameDurationMs : 40;
    const frameCount = LEVEL_UP_ANIM.frameCount || 1;
    const totalDuration = frameCount * frameDurationMs;
    const yOffset = (typeof LEVEL_UP_ANIM.yOffset === "number" ? LEVEL_UP_ANIM.yOffset : -150) * entityScale;
    let writeIndex = 0;
    for (let idx = 0; idx < heroLevelUpEffects.length; idx++) {
        const fx = heroLevelUpEffects[idx];
        const elapsed = now - fx.startedAt;
        if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed >= totalDuration) {
            continue;
        }
        heroLevelUpEffects[writeIndex++] = fx;
        const frame = Math.floor(elapsed / frameDurationMs);
        if (frame < 0 || frame >= frameCount) continue;
        const frameDef = getLevelUpFrame(frame);
        if (!frameDef) continue;
        drawCenteredEffectFrame(frameDef, screenX, screenY + yOffset, entityScale);
    }
    heroLevelUpEffects.length = writeIndex;
}

window.triggerHeroLevelUpEffect = triggerHeroLevelUpEffect;

window.clearHeroLevelUpEffects = clearHeroLevelUpEffects;

function drawShipExpansionOverlay(shipId, frameIndex, screenX, screenY, shipShift = null) {
    const expansionDef = SHIP_EXPANSION_DEFS && SHIP_EXPANSION_DEFS[shipId];
    if (!expansionDef) return;
    const frameDef = getShipExpansionFrame(shipId, frameIndex);
    if (!frameDef || frameDef.pendingAtlas) return;
    const source = frameDef.atlas || frameDef.img || frameDef;
    if (!source) return;
    if (!frameDef.atlas && (!source.complete || source.width === 0 || source.height === 0)) return;
    if (frameDef.atlas && (!source.complete || source.width === 0 || source.height === 0)) return;
    const sourceW = frameDef.width || source.width || 0;
    const sourceH = frameDef.height || source.height || 0;
    if (sourceW <= 0 || sourceH <= 0) return;
    const entityScale = typeof getEntityDrawScale === "function" ? getEntityDrawScale() : 1;
    const offset = expansionDef && expansionDef.offset || getShipExpansionAnchor(shipId);
    const drawW = sourceW * entityScale;
    const drawH = sourceH * entityScale;
    let drawX = screenX - drawW / 2 + (offset.x || 0) * entityScale;
    let drawY = screenY - drawH / 2 + (offset.y || 0) * entityScale;

    if (expansionDef.useVisualCenterRegistration && !frameDef.atlas) {
        const expansionShift = typeof getResolvedShipExpansionVisualShift === "function" ? getResolvedShipExpansionVisualShift(shipId, frameIndex, source, entityScale) : {
            x: 0,
            y: 0
        };
        drawX -= expansionShift.x;
        drawY -= expansionShift.y;
    } else {
        const shiftX = shipShift ? shipShift.x : 0;
        const shiftY = shipShift ? shipShift.y : 0;
        drawX -= shiftX;
        drawY -= shiftY;
    }

    if (frameDef.atlas) {
        ctx.drawImage(source, frameDef.sx, frameDef.sy, frameDef.sw, frameDef.sh, drawX, drawY, drawW, drawH);
    } else {
        ctx.drawImage(source, drawX, drawY, drawW, drawH);
    }
}

function drawShip() {
    const shipScreenX = mapToScreenX(shipX);
    const syBase = mapToScreenY(shipY);
    const bobOffset = getHeroIdleOffset();
    const sy = syBase + bobOffset;
    const entityScale = typeof getEntityDrawScale === "function" ? getEntityDrawScale() : 1;
    let shipAnchorX = shipScreenX;
    let shipAnchorY = sy;
    ctx.save();
    ctx.globalAlpha = heroCloaked ? .3 : 1;
    drawHeroCollectorBeamAt(shipScreenX, sy);
    const shipId = heroShipId;
    const def = SHIP_SPRITE_DEFS[shipId];
    let shipDrawnHeight = 20;
    let shiftX = 0;
    let shiftY = 0;
    if (def) {
        const frameIndex = getDirectionFrameIndex(heroAngle, def.frameCount);
        let glowImg = null;
        let img = null;
        img = getShipSpriteFrame(shipId, frameIndex);
        if (img && img.complete && img.width > 0 && img.height > 0) {
            const shift = getResolvedShipVisualShift(shipId, frameIndex, img, entityScale);
            shiftX = shift.x;
            shiftY = shift.y;
        }
        shipAnchorX = shipScreenX - shiftX;
        shipAnchorY = sy - shiftY;
        if (typeof getShipGlowFrame === "function") {
            glowImg = getShipGlowFrame(shipId, frameIndex);
            if (glowImg && glowImg.complete && glowImg.width > 0 && glowImg.height > 0) {
                const gw = glowImg.width * entityScale;
                const gh = glowImg.height * entityScale;
                ctx.drawImage(glowImg, shipScreenX - gw / 2 - shiftX, sy - gh / 2 - shiftY, gw, gh);
            }
        }
        const heroVisualShift = drawShip._visualShift || (drawShip._visualShift = {
            x: 0,
            y: 0
        });
        heroVisualShift.x = shiftX;
        heroVisualShift.y = shiftY;
        const heroEngineVisualShift = shouldApplyEngineVisualShift(shipId) ? heroVisualShift : null;
        drawEngineTrail("hero", shipId, shipX, shipY, frameIndex, heroAngle || 0, 0, false, heroEngineVisualShift);
        if (img && img.complete && img.width > 0 && img.height > 0) {
            const w = img.width * entityScale;
            const h = img.height * entityScale;
            shipDrawnHeight = h;
            ctx.drawImage(img, shipScreenX - w / 2 - shiftX, sy - h / 2 - shiftY, w, h);
        }
        drawShipExpansionOverlay(shipId, frameIndex, shipScreenX, sy, heroVisualShift);
        drawShipSkillVisualEffectsForEntity(heroId, shipAnchorX, shipAnchorY, shipId, frameIndex, heroAngle || 0, shipDrawnHeight, "hero", shipX, shipY);
        drawHeroLevelUpEffects(shipAnchorX, shipAnchorY);
    } else {
        shipDrawnHeight = 0;
    }
    if (!shipDrawnHeight) {
        const size = 20 * entityScale;
        shipDrawnHeight = size;
        ctx.fillStyle = "#cccccc";
        ctx.beginPath();
        ctx.arc(shipScreenX, sy, size / 2, 0, Math.PI * 2, false);
        ctx.fill();
    }
    if (heroTargetFaded) {
        ctx.save();
        ctx.fillStyle = `rgba(80,80,80,${TARGET_FADE_OVERLAY_ALPHA})`;
        ctx.beginPath();
        ctx.arc(shipScreenX, sy, TARGET_FADE_OVERLAY_RADIUS, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.restore();
    }
    drawShieldAura(shipScreenX, sy, heroShield, heroMaxShield, heroIshActive, heroInvincible, heroIshSince, heroIshUntil, heroInvSince, heroInvUntil, typeof heroShieldBackupUntil !== "undefined" ? heroShieldBackupUntil : 0);
    if (typeof heroShieldBackupStartedAt !== "undefined" && heroShieldBackupStartedAt > 0) {
        flashDrawShieldBackupBurst(shipScreenX, sy, heroShieldBackupStartedAt, typeof heroShieldBackupUntil !== "undefined" ? heroShieldBackupUntil : 0);
    }
    if (window.heroTechEnergyLeechActive) {
        flashDrawEnergyLeechAura(shipScreenX, sy, shipDrawnHeight, Number(window.heroTechEnergyLeechStartedAt) || performance.now(), Number(window.heroTechEnergyLeechUntil) || 0);
    }
    if (setting_show_drones && window.heroDrones && window.heroDrones.groups && window.heroDrones.groups.length > 0) {
        const heroDefForDrones = SHIP_SPRITE_DEFS[heroShipId];
        const heroDronesFrameIndex = heroDefForDrones && heroDefForDrones.frameCount > 1 ? getDirectionFrameIndex(heroAngle, heroDefForDrones.frameCount) : 0;
        drawDrones(shipX, shipY, window.heroDrones, heroAngle, heroDronesFrameIndex);
    }
    if (heroRepairing) {
        drawRepairRobot(shipScreenX, sy, shipDrawnHeight);
    }
    if (heroBattleRepairing) {
        drawBattleRepairRobot(shipScreenX, sy);
    }
    if (setting_show_player_names && heroName && (typeof isShipLabelVisible !== "function" || isShipLabelVisible(heroShipId))) {
        const baseY = computeNameplateY(sy, shipDrawnHeight, heroShipId, entityScale);
        const clanTagColor = heroClanTag ? getClanTagColor(0) : null;
        const heroNameplateColor = typeof getGameXmlColorPattern === "function" ? getGameXmlColorPattern("neutral", "#ffffff") : "#ffffff";
        const heroNameplateLayout = drawNameplateWithIcons(ctx, heroName, heroClanTag, shipScreenX, baseY, heroNameplateColor, clanTagColor, heroRankId, window.heroFactionId || 0, heroGalaxyGatesFinished || 0);
        if (!setting_show_drones) {
            const heroDroneDisplayCounts = getSimpleDroneDisplayCounts(window.heroDrones, window.heroDroneDisplayCounts || null);
            drawSimpleDroneDisplayUnderNameplate(ctx, heroNameplateLayout, heroDroneDisplayCounts);
        }
    }
    heroHpShieldBarOptions.referenceShipId = heroShipId;
    heroHpShieldBarOptions.alpha = 1;
    drawHpShieldBars(shipScreenX, sy, shipDrawnHeight, heroHp, heroMaxHp, heroShield, heroMaxShield, heroShipId, entityScale, heroHpShieldBarOptions);
    ctx.restore();
}

const DRONE_DIRECTION_FRAME_COUNT = 32;

var DRONE_GROUP_RADIUS = typeof DRONE_GROUP_RADIUS !== "undefined" ? DRONE_GROUP_RADIUS : 75;

var DRONE_GROUP_DIMENSION = DRONE_GROUP_RADIUS * 2;

const DRONE_DEFAULT_DIMENSION = 30;

const DRONES_ATLAS_PATH = "graphics/atlas/drones_v1.png";

const DRONES_ATLAS_CELL_WIDTH = 62;

const DRONES_ATLAS_CELL_HEIGHT = 62;

const DRONES_ATLAS_PADDING = 1;

const DRONES_ATLAS_ROWS = Object.freeze({
    iris: {
        atlasRow: 0,
        frameWidth: 60,
        frameHeight: 60,
        frameCount: 32
    },
    flax: {
        atlasRow: 1,
        frameWidth: 60,
        frameHeight: 60,
        frameCount: 32
    }
});

let dronesAtlasImage = null;

let dronesAtlasStatus = "idle";

let dronesAtlasListenersBound = false;

const HAVOK_DRONE_FRAME_PATH = "graphics/havoks/";

const HAVOK_DRONE_FRAME_WIDTH = 60;

const HAVOK_DRONE_FRAME_HEIGHT = 60;

const havokDroneFrameImages = new Array(DRONE_DIRECTION_FRAME_COUNT);

const havokDroneFrameStatus = new Array(DRONE_DIRECTION_FRAME_COUNT).fill("idle");

const droneSpriteFrameDefCache = {
    iris: new Array(DRONE_DIRECTION_FRAME_COUNT),
    flax: new Array(DRONE_DIRECTION_FRAME_COUNT),
    havok: new Array(DRONE_DIRECTION_FRAME_COUNT)
};

const pendingDroneSpriteFrameDefs = {
    iris: {
        pendingAtlas: true,
        width: DRONES_ATLAS_ROWS.iris.frameWidth,
        height: DRONES_ATLAS_ROWS.iris.frameHeight
    },
    flax: {
        pendingAtlas: true,
        width: DRONES_ATLAS_ROWS.flax.frameWidth,
        height: DRONES_ATLAS_ROWS.flax.frameHeight
    },
    havok: {
        pendingAtlas: true,
        width: HAVOK_DRONE_FRAME_WIDTH,
        height: HAVOK_DRONE_FRAME_HEIGHT
    }
};

function markHavokDroneFrameReadyIfDecoded(idx, img) {
    if (img && img.complete && img.width > 0 && img.height > 0) {
        havokDroneFrameStatus[idx] = "ready";
        return true;
    }
    return false;
}

function getHavokDroneFrameImage(directionIndex) {
    const idx = (directionIndex % DRONE_DIRECTION_FRAME_COUNT + DRONE_DIRECTION_FRAME_COUNT) % DRONE_DIRECTION_FRAME_COUNT;
    if (!havokDroneFrameImages[idx]) {
        const img = andromedaCreateImage(`${HAVOK_DRONE_FRAME_PATH}${idx + 1}.png`);
        havokDroneFrameImages[idx] = img;
        havokDroneFrameStatus[idx] = markHavokDroneFrameReadyIfDecoded(idx, img) ? "ready" : "loading";
        img.addEventListener("load", () => {
            havokDroneFrameStatus[idx] = "ready";
        }, {
            once: true
        });
        img.addEventListener("error", () => {
            havokDroneFrameStatus[idx] = "error";
        }, {
            once: true
        });
    }
    markHavokDroneFrameReadyIfDecoded(idx, havokDroneFrameImages[idx]);
    return {
        img: havokDroneFrameImages[idx],
        idx: idx
    };
}

function getHavokDroneSpriteFrame(directionIndex) {
    const frame = getHavokDroneFrameImage(directionIndex);
    const status = havokDroneFrameStatus[frame.idx];
    if (status === "error") return null;
    if (status !== "ready") {
        return pendingDroneSpriteFrameDefs.havok;
    }
    const cached = droneSpriteFrameDefCache.havok[frame.idx];
    if (cached) return cached;
    const frameDef = {
        img: frame.img,
        width: HAVOK_DRONE_FRAME_WIDTH,
        height: HAVOK_DRONE_FRAME_HEIGHT
    };
    droneSpriteFrameDefCache.havok[frame.idx] = frameDef;
    return frameDef;
}

function markDronesAtlasReadyIfDecoded(img) {
    if (img && img.complete && img.width > 0 && img.height > 0) {
        dronesAtlasStatus = "ready";
        return true;
    }
    return false;
}

function getDronesAtlasImage() {
    if (!dronesAtlasImage) {
        dronesAtlasImage = andromedaCreateImage(DRONES_ATLAS_PATH);
        dronesAtlasStatus = markDronesAtlasReadyIfDecoded(dronesAtlasImage) ? "ready" : "loading";
    }
    if (!dronesAtlasListenersBound && dronesAtlasImage) {
        dronesAtlasListenersBound = true;
        dronesAtlasImage.addEventListener("load", () => {
            dronesAtlasStatus = "ready";
        }, {
            once: true
        });
        dronesAtlasImage.addEventListener("error", () => {
            dronesAtlasStatus = "error";
        }, {
            once: true
        });
    }
    markDronesAtlasReadyIfDecoded(dronesAtlasImage);
    return dronesAtlasImage;
}

function getDroneSpriteFrame(kind, directionIndex) {
    const rowKey = kind === "flax" ? "flax" : kind === "havok" ? "havok" : "iris";
    if (rowKey === "havok") {
        return getHavokDroneSpriteFrame(directionIndex);
    }
    const row = DRONES_ATLAS_ROWS[rowKey];
    if (!row) return null;
    const atlas = getDronesAtlasImage();
    if (!atlas) return null;
    if (dronesAtlasStatus !== "ready") {
        return dronesAtlasStatus === "error" ? null : pendingDroneSpriteFrameDefs[rowKey];
    }
    const idx = (directionIndex % row.frameCount + row.frameCount) % row.frameCount;
    const cached = droneSpriteFrameDefCache[rowKey][idx];
    if (cached) return cached;
    const sx = idx * DRONES_ATLAS_CELL_WIDTH + DRONES_ATLAS_PADDING;
    const sy = row.atlasRow * DRONES_ATLAS_CELL_HEIGHT + DRONES_ATLAS_PADDING;
    const sw = row.frameWidth;
    const sh = row.frameHeight;
    if (sx + sw > atlas.width || sy + sh > atlas.height) {
        dronesAtlasStatus = "error";
        return null;
    }
    const frameDef = {
        atlas: atlas,
        sx: sx,
        sy: sy,
        sw: sw,
        sh: sh,
        width: row.frameWidth,
        height: row.frameHeight
    };
    droneSpriteFrameDefCache[rowKey][idx] = frameDef;
    return frameDef;
}

function pickDroneKind(drone) {
    if (drone && drone.kind) return drone.kind;
    if (drone && String(drone.design || "").toLowerCase() === "havok") return "havok";
    if (typeof resolveDroneKind === "function" && drone) {
        return resolveDroneKind(drone.type);
    }
    return "iris";
}

const RAD_TO_DEG = 180 / Math.PI;

const DEG_TO_RAD = Math.PI / 180;

function positionOffsetDegrees(pos) {
    if (pos === DRONE_POSITION_TOP) return 0;
    if (pos === DRONE_POSITION_RIGHT) return 90;
    if (pos === DRONE_POSITION_DOWN) return 180;
    if (pos === DRONE_POSITION_LEFT) return 270;
    return 0;
}

const DRONE_GROUP_TWEEN_DURATION_MS = 1e3;

function normalizeDeg(deg) {
    const d = deg % 360;
    return d < 0 ? d + 360 : d;
}

function shortestDeltaDeg(fromDeg, toDeg) {
    const a = normalizeDeg(fromDeg);
    const b = normalizeDeg(toDeg);
    let delta = b - a;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    return delta;
}

function easeOutQuart(t) {
    const inv = 1 - t;
    return 1 - inv * inv * inv * inv;
}

function ensureDroneGroupAnim(group, initialDeg, nowMs) {
    if (!group) return;
    if (!group._anim) group._anim = {};
    const a = group._anim;
    if (!Number.isFinite(a.currentRotationDeg)) a.currentRotationDeg = initialDeg;
    if (!Number.isFinite(a.startRotationDeg)) a.startRotationDeg = a.currentRotationDeg;
    if (!Number.isFinite(a.targetRotationDeg)) a.targetRotationDeg = initialDeg;
    if (!Number.isFinite(a.startTimeMs)) a.startTimeMs = nowMs;
    if (!Number.isFinite(a.lastBaseRotationDeg)) a.lastBaseRotationDeg = NaN;
    if (!Number.isFinite(a.lastRetargetMs)) a.lastRetargetMs = 0;
    if (!Number.isFinite(a.desiredBaseRotationDeg)) a.desiredBaseRotationDeg = a.lastBaseRotationDeg;
}

function updateDroneGroupTween(group, baseRotationDegInt, offsetDeg, nowMs) {
    if (!group) return;
    const targetDeg = baseRotationDegInt + offsetDeg;
    ensureDroneGroupAnim(group, targetDeg, nowMs);
    const a = group._anim;
    if (!Number.isFinite(a.lastRetargetMs)) a.lastRetargetMs = 0;
    a.desiredBaseRotationDeg = baseRotationDegInt;
    if (a.lastBaseRotationDeg !== a.desiredBaseRotationDeg && nowMs - a.lastRetargetMs >= 30) {
        a.lastRetargetMs = nowMs;
        a.lastBaseRotationDeg = a.desiredBaseRotationDeg;
        a.startRotationDeg = a.currentRotationDeg;
        a.targetRotationDeg = a.lastBaseRotationDeg + offsetDeg;
        a.startTimeMs = nowMs;
    }
    const elapsed = nowMs - a.startTimeMs;
    const t = Math.max(0, Math.min(1, elapsed / DRONE_GROUP_TWEEN_DURATION_MS));
    const eased = easeOutQuart(t);
    const delta = shortestDeltaDeg(a.startRotationDeg, a.targetRotationDeg);
    a.currentRotationDeg = a.startRotationDeg + delta * eased;
}

function updateDronesAnimations(nowMs) {
    if (typeof setting_show_drones !== "undefined" && !setting_show_drones) return;
    if (window.heroDrones && window.heroDrones.groups && window.heroDrones.groups.length > 0) {
        updateDroneConnectorAnimations(window.heroDrones, typeof heroAngle !== "undefined" ? heroAngle : 0, nowMs);
    }
    if (typeof entities !== "undefined") {
        for (const id in entities) {
            const e = entities[id];
            if (e && e.id === heroId) continue;
            if (!e || !e.drones || !e.drones.groups || e.drones.groups.length === 0) continue;
            updateDroneConnectorAnimations(e.drones, e.angle || 0, nowMs);
        }
    }
}

function updateDroneConnectorAnimations(droneConnector, shipAngleRad, nowMs) {
    if (!droneConnector || !droneConnector.groups || !droneConnector.groups.length) return;
    const normalizedShipAngle = isFinite(shipAngleRad) ? shipAngleRad : 0;
    const shipRotationDegInt = normalizeDeg(Math.round(normalizedShipAngle * RAD_TO_DEG));
    const baseRotationDegInt = shipRotationDegInt - 180;
    for (const group of droneConnector.groups) {
        const offsetDeg = positionOffsetDegrees(group.position);
        updateDroneGroupTween(group, baseRotationDegInt, offsetDeg, nowMs);
    }
}

function isDroneGeometryCacheValid(cache, groups, baseRotationDeg, groupDimension) {
    if (!cache || cache.baseRotationDeg !== baseRotationDeg || cache.groupDimension !== groupDimension) return false;
    if (!cache.groups || cache.groups.length !== groups.length) return false;
    let itemIndex = 0;
    for (let gi = 0; gi < groups.length; gi++) {
        const group = groups[gi];
        const drones = group && Array.isArray(group.drones) ? group.drones : [];
        const targetGroupAngleDeg = baseRotationDeg + positionOffsetDegrees(group && group.position);
        const groupAngleDeg = group && group._anim && Number.isFinite(group._anim.currentRotationDeg) ? group._anim.currentRotationDeg : targetGroupAngleDeg;
        const groupCache = cache.groups[gi];
        if (!groupCache || groupCache.group !== group || groupCache.position !== (group && group.position) || groupCache.rotationDeg !== groupAngleDeg || groupCache.droneCount !== drones.length) return false;
        for (let di = 0; di < drones.length; di++) {
            const drone = drones[di];
            const item = cache.items[itemIndex++];
            if (!item || item.drone !== drone || item.position !== (drone && drone.position) || item.dimension !== (drone && drone.dimension)) return false;
        }
    }
    return itemIndex === cache.items.length;
}

function rebuildDroneGeometryCache(droneConnector, groups, baseRotationDeg, groupDimension) {
    const cache = droneConnector._geometryCache || {
        groups: [],
        items: []
    };
    cache.baseRotationDeg = baseRotationDeg;
    cache.groupDimension = groupDimension;
    let itemIndex = 0;
    for (let gi = 0; gi < groups.length; gi++) {
        const group = groups[gi];
        const drones = group && Array.isArray(group.drones) ? group.drones : [];
        const targetGroupAngleDeg = baseRotationDeg + positionOffsetDegrees(group && group.position);
        const groupAngleDeg = group && group._anim && Number.isFinite(group._anim.currentRotationDeg) ? group._anim.currentRotationDeg : targetGroupAngleDeg;
        const groupAngleRad = groupAngleDeg * DEG_TO_RAD;
        const groupOffsetX = Math.cos(groupAngleRad) * groupDimension;
        const groupOffsetY = Math.sin(groupAngleRad) * groupDimension;
        const groupCache = cache.groups[gi] || {};
        groupCache.group = group;
        groupCache.position = group && group.position;
        groupCache.rotationDeg = groupAngleDeg;
        groupCache.droneCount = drones.length;
        cache.groups[gi] = groupCache;
        for (let di = 0; di < drones.length; di++) {
            const drone = drones[di];
            const droneAngleDeg = baseRotationDeg + positionOffsetDegrees(drone && drone.position);
            const droneAngleRad = droneAngleDeg * DEG_TO_RAD;
            const droneRadius = drone && drone.position === DRONE_POSITION_CENTER ? 1 : drone && drone.dimension || DRONE_DEFAULT_DIMENSION;
            const item = cache.items[itemIndex] || {};
            item.drone = drone;
            item.position = drone && drone.position;
            item.dimension = drone && drone.dimension;
            item.offsetX = groupOffsetX + Math.cos(droneAngleRad) * droneRadius;
            item.offsetY = groupOffsetY + Math.sin(droneAngleRad) * droneRadius;
            cache.items[itemIndex++] = item;
        }
    }
    cache.groups.length = groups.length;
    cache.items.length = itemIndex;
    droneConnector._geometryCache = cache;
    return cache;
}

function drawDrones(worldX, worldY, droneConnector, shipAngle = 0, shipFrameIndex = null) {
    if (!droneConnector || !droneConnector.groups || !droneConnector.groups.length) return;
    const groups = droneConnector.groups;
    const normalizedShipAngle = isFinite(shipAngle) ? shipAngle : 0;
    const entityScale = typeof getEntityDrawScale === "function" ? getEntityDrawScale() : 1;
    const shipRotationDegInt = normalizeDeg(Math.round(normalizedShipAngle * RAD_TO_DEG));
    const baseRotationDeg = shipRotationDegInt - 180;
    const directionIndex = typeof shipFrameIndex === "number" && Number.isFinite(shipFrameIndex) ? shipFrameIndex : getDirectionFrameIndex(normalizedShipAngle, DRONE_DIRECTION_FRAME_COUNT);
    const groupDimension = droneConnector.groupDimension || DRONE_GROUP_DIMENSION;
    const geometryCache = isDroneGeometryCacheValid(droneConnector._geometryCache, groups, baseRotationDeg, groupDimension) ? droneConnector._geometryCache : rebuildDroneGeometryCache(droneConnector, groups, baseRotationDeg, groupDimension);
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    for (let i = 0; i < geometryCache.items.length; i++) {
        const item = geometryCache.items[i];
        const drone = item.drone;
        const kind = pickDroneKind(drone);
        const frameDef = getDroneSpriteFrame(kind, directionIndex);
        if (!frameDef || frameDef.pendingAtlas) continue;
        const droneScreenX = mapToScreenX(worldX + item.offsetX);
        const droneScreenY = mapToScreenY(worldY + item.offsetY);
        const drawW = frameDef.width * entityScale;
        const drawH = frameDef.height * entityScale;
        if (frameDef.atlas) {
            ctx.drawImage(frameDef.atlas, frameDef.sx, frameDef.sy, frameDef.sw, frameDef.sh, droneScreenX - drawW / 2, droneScreenY - drawH / 2, drawW, drawH);
        } else {
            const img = frameDef.img || frameDef;
            if (!img || !img.complete || img.width === 0 || img.height === 0) continue;
            ctx.drawImage(img, droneScreenX - drawW / 2, droneScreenY - drawH / 2, drawW, drawH);
        }
    }
    ctx.restore();
}

function isSameMapGroupMemberEntity(entity) {
    if (!entity || entity.id == null || typeof groupMembers !== "object" || !groupMembers) return false;
    const memberId = parseInt(entity.id, 10);
    if (!Number.isFinite(memberId) || !groupMembers[memberId]) return false;
    const member = groupMembers[memberId];
    if (member.isOffline) return false;
    const memberMapId = parseInt(member.mapId, 10);
    const activeMapId = typeof currentMapId !== "undefined" && currentMapId !== null ? parseInt(currentMapId, 10) : NaN;
    return Number.isFinite(memberMapId) && Number.isFinite(activeMapId) && memberMapId === activeMapId;
}

function drawEntities() {
    const BASE_MARKER_SIZE = 14;
    const now = performance.now();
    const entityScale = typeof getEntityDrawScale === "function" ? getEntityDrawScale() : 1;
    const ringScale = entityScale;
    syncSelectedTargetBarFadeState();
    const scaledMarkerSize = BASE_MARKER_SIZE * entityScale;
    const boxMarkerSize = BASE_MARKER_SIZE;
    for (const id in entities) {
        const e = entities[id];
        if (e && e.id === heroId) continue;
        if (e.kind === "box") continue;
        const dx = e.x - shipX;
        const dy = e.y - shipY;
        const distSq = dx * dx + dy * dy;
        if (distSq > VIEW_RADIUS_SQ && !isSameMapGroupMemberEntity(e)) continue;
        if (!isEntityVisibleOnMap(e)) continue;
        if (e.invisible && e.id !== heroId) continue;
        const faded = e.targetFaded && (!e.targetFadeUntil || now < e.targetFadeUntil);
        if (e.targetFadeUntil && now >= e.targetFadeUntil) {
            e.targetFadeUntil = 0;
            e.targetFaded = false;
        }
        const entityScreenX = mapToScreenX(e.x);
        const entityScreenY = mapToScreenY(e.y);
        const visualShipId = typeof resolveEntityVisualShipId === "function" ? resolveEntityVisualShipId(e.shipId) : e.shipId;
        const def = SHIP_SPRITE_DEFS[visualShipId];
        let drewSprite = false;
        let spriteHeight = scaledMarkerSize;
        let img = null;
        let entityAnchorX = entityScreenX;
        let entityAnchorY = entityScreenY;
        let shiftX = 0;
        let shiftY = 0;
        if (def) {
            let frameIndex = 0;
            if (def.animationMode === "loop") {
                const fps = typeof def.loopFps === "number" && def.loopFps > 0 ? def.loopFps : 24;
                const totalFrames = def.frameCount > 0 ? def.frameCount : 1;
                frameIndex = Math.floor(now / (1e3 / fps)) % totalFrames;
            } else if (visualShipId === 73 || visualShipId === 76 || visualShipId === 71 || visualShipId === 77) {
                const fps = 30;
                const totalFrames = def.frameCount > 0 ? def.frameCount : 32;
                frameIndex = Math.floor(now / (1e3 / fps)) % totalFrames;
            } else {
                if (typeof e.angle === "number" && def.frameCount > 1) {
                    frameIndex = getDirectionFrameIndex(e.angle, def.frameCount);
                }
            }
            img = getShipSpriteFrame(visualShipId, frameIndex);
            if (img && img.complete && img.width > 0 && img.height > 0) {
                const shift = getResolvedShipVisualShift(visualShipId, frameIndex, img, entityScale);
                shiftX = shift.x;
                shiftY = shift.y;
            }
            entityAnchorX = entityScreenX - shiftX;
            entityAnchorY = entityScreenY - shiftY;
            if (typeof getShipGlowFrame === "function") {
                const glowImg = getShipGlowFrame(e.shipId, frameIndex);
                if (glowImg && glowImg.complete && glowImg.width > 0 && glowImg.height > 0) {
                    const gw = glowImg.width * entityScale;
                    const gh = glowImg.height * entityScale;
                    ctx.drawImage(glowImg, entityScreenX - gw / 2 - shiftX, entityScreenY - gh / 2 - shiftY, gw, gh);
                }
            }
            const forceEngineMoving = typeof e.speed === "number" && e.speed > 0;
            let entityEngineVisualShift = null;
            if (shouldApplyEngineVisualShift(visualShipId)) {
                entityEngineVisualShift = e._engineVisualShift || (e._engineVisualShift = {
                    x: 0,
                    y: 0
                });
                entityEngineVisualShift.x = shiftX;
                entityEngineVisualShift.y = shiftY;
            }
            if (e._engineTrailKeyId !== e.id) {
                e._engineTrailKeyId = e.id;
                e._engineTrailKey = `entity_${e.id}`;
            }
            const entityEngineTrailKey = e._engineTrailKey;
            drawEngineTrail(entityEngineTrailKey, e.shipId, e.x, e.y, frameIndex, e.angle || 0, 0, forceEngineMoving, entityEngineVisualShift);
            if (img && img.complete && img.width > 0 && img.height > 0) {
                const w = img.width * entityScale;
                const h = img.height * entityScale;
                spriteHeight = h;
                ctx.drawImage(img, entityScreenX - w / 2 - shiftX, entityScreenY - h / 2 - shiftY, w, h);
                drewSprite = true;
            }
            drawShipExpansionOverlay(e.shipId, frameIndex, entityScreenX, entityScreenY, {
                x: shiftX,
                y: shiftY
            });
            drawShipSkillVisualEffectsForEntity(e.id, entityAnchorX, entityAnchorY, e.shipId, frameIndex, e.angle || 0, spriteHeight, `entity_${e.id}`, e.x, e.y);
        }
        if (!drewSprite) {
            spriteHeight = scaledMarkerSize;
            ctx.fillStyle = getEntityColor(e);
            ctx.beginPath();
            ctx.arc(entityScreenX, entityScreenY, scaledMarkerSize / 2, 0, Math.PI * 2, false);
            ctx.fill();
        }
        if (faded) {
            ctx.save();
            ctx.fillStyle = `rgba(80,80,80,${TARGET_FADE_OVERLAY_ALPHA})`;
            ctx.beginPath();
            ctx.arc(entityScreenX, entityScreenY, TARGET_FADE_OVERLAY_RADIUS, 0, Math.PI * 2, false);
            ctx.fill();
            ctx.restore();
        }
        if (e.kind === "player") {
            drawShieldAura(entityScreenX, entityScreenY, e.shield, e.maxShield, e.ishActive, e.invincible, e.ishSince, e.ishUntil, e.invSince, e.invUntil, e.techShieldBackupUntil || 0);
            if (e.techShieldBackupStartedAt) {
                flashDrawShieldBackupBurst(entityScreenX, entityScreenY, Number(e.techShieldBackupStartedAt) || 0, Number(e.techShieldBackupUntil) || 0);
            }
            if (e.techEnergyLeechActive) {
                flashDrawEnergyLeechAura(entityScreenX, entityScreenY, spriteHeight, Number(e.techEnergyLeechStartedAt) || performance.now(), Number(e.techEnergyLeechUntil) || 0);
            }
            if (e.techBattleRepairing || (e.techBattleRepairFadeUntil && e.techBattleRepairFadeUntil > performance.now())) {
                drawBattleRepairRobot(entityScreenX, entityScreenY, e);
            }
        }
        if (setting_show_drones && e.drones && e.drones.groups && e.drones.groups.length > 0) {
            const eAngleForDrones = e.angle || 0;
            const eDefForDrones = SHIP_SPRITE_DEFS[e.shipId];
            const eDronesFrameIndex = eDefForDrones && eDefForDrones.frameCount > 1 ? getDirectionFrameIndex(eAngleForDrones, eDefForDrones.frameCount) : 0;
            drawDrones(e.x, e.y, e.drones, eAngleForDrones, eDronesFrameIndex);
        }
        if (selectedTargetId !== null && e.id === selectedTargetId) {
            selectedTargetHpShieldBarOptions.referenceShipId = visualShipId;
            selectedTargetHpShieldBarOptions.alpha = getSelectedTargetBarFadeAlpha(e.id);
            drawHpShieldBars(entityScreenX, entityScreenY, spriteHeight, e.hp, e.maxHp, e.shield, e.maxShield, e.shipId, entityScale, selectedTargetHpShieldBarOptions);
        }
        if (e.id === selectedTargetId || e.id === currentLaserTargetId) {
            const useRedCircle = !e.targetRingGray;
            const spritePath = useRedCircle ? UI_SPRITES.targetRingOwned : UI_SPRITES.targetRingUnowned;
            const ringImg = getUiImage(spritePath);
            if (ringImg && ringImg.complete) {
                const w = ringImg.width * ringScale;
                const h = ringImg.height * ringScale;
                ctx.drawImage(ringImg, entityScreenX - w / 2, entityScreenY - h / 2, w, h);
            }
        }
        if (setting_show_player_names && e.name && e.kind !== "box" && (typeof isShipLabelVisible !== "function" || isShipLabelVisible(e.shipId))) {
            const baseY = computeNameplateY(entityScreenY, spriteHeight, e.shipId, entityScale);
            const rankId = e.rankId || (e.id === heroId ? heroRankId : 0);
            const achievementId = e.galaxyGatesFinished || (e.id === heroId ? heroGalaxyGatesFinished : 0);
            const clanTagColor = e.kind === "player" && e.clanTag ? getClanTagColor(e.clanDiplomacy) : null;
            const entityNameplateLayout = drawNameplateWithIcons(ctx, e.name, e.kind === "player" ? e.clanTag : null, entityScreenX, baseY, getNameplateColor(e), clanTagColor, rankId, e.factionId || 0, achievementId);
            if (!setting_show_drones && e.kind === "player") {
                const entityDroneDisplayCounts = getSimpleDroneDisplayCounts(e.drones, e.droneDisplayCounts || null);
                drawSimpleDroneDisplayUnderNameplate(ctx, entityNameplateLayout, entityDroneDisplayCounts);
            }
        }
    }
    drawChainImpulseTechEffects();
    for (const id in entities) {
        const e = entities[id];
        if (e.kind !== "box") continue;
        const dx = e.x - shipX;
        const dy = e.y - shipY;
        const distSq = dx * dx + dy * dy;
        if (distSq > VIEW_RADIUS_SQ) continue;
        if (!isEntityVisibleOnMap(e)) continue;
        const boxScreenX = mapToScreenX(e.x);
        const boxScreenY = mapToScreenY(e.y);
        let boxSpriteHeight = 28;
        const category = e.category || "other";
        const isCargo = category === "cargoFree" || category === "cargoNotFree";
        const isBonus = category === "bonusBox";
        const isBootyBox = category === "bootyBox";
        const isOre = category === "ore";
        const shouldAnimate = isCargo || isBonus || isBootyBox;
        const isBootyKey = category === "bootyKey";
        if (isOre) {
            const spriteKey = getOreSpriteKeyFromType(e.type, e.oreSprite);
            const cfg = getOreSpriteConfig(spriteKey);
            if (cfg) {
                const frameCount = cfg.frameCount;
                const animState = oreAnimationStates[e.id] || {
                    frameIndex: Math.floor(Math.random() * frameCount),
                    lastUpdate: now
                };
                if (now - animState.lastUpdate >= ORE_ANIMATION_FRAME_DURATION) {
                    const steps = Math.floor((now - animState.lastUpdate) / ORE_ANIMATION_FRAME_DURATION);
                    animState.frameIndex = (animState.frameIndex + steps) % frameCount;
                    animState.lastUpdate = animState.lastUpdate + steps * ORE_ANIMATION_FRAME_DURATION;
                }
                const frameImg = getOreSpriteFrame(spriteKey, animState.frameIndex);
                oreAnimationStates[e.id] = animState;
                if (frameImg && drawCollectableFrame(frameImg, boxScreenX, boxScreenY)) {
                    boxSpriteHeight = frameImg.height || boxSpriteHeight;
                } else {
                    ctx.fillStyle = getEntityColor(e);
                    ctx.fillRect(boxScreenX - boxMarkerSize / 2, boxScreenY - boxMarkerSize / 2, boxMarkerSize, boxMarkerSize);
                }
            } else {
                ctx.fillStyle = getEntityColor(e);
                ctx.beginPath();
                ctx.arc(boxScreenX, boxScreenY, boxMarkerSize / 2, 0, Math.PI * 2, false);
                ctx.fill();
            }
        } else if (shouldAnimate) {
            const spriteCategory = isBonus ? "bonusBox" : isBootyBox ? "bootyBox" : category;
            const cfg = getBoxSpriteConfig(spriteCategory);
            let frameIndex;
            if (isBonus) {
                ensureBonusBoxAnimationTimer();
                frameIndex = bonusBoxFrameIndex;
            } else {
                const animState = boxAnimationStates[e.id] || {
                    frameIndex: 0,
                    lastUpdate: now
                };
                if (now - animState.lastUpdate >= BOX_ANIMATION_FRAME_DURATION) {
                    const steps = Math.floor((now - animState.lastUpdate) / BOX_ANIMATION_FRAME_DURATION);
                    animState.frameIndex = (animState.frameIndex + steps) % cfg.frameCount;
                    animState.lastUpdate = animState.lastUpdate + steps * BOX_ANIMATION_FRAME_DURATION;
                }
                frameIndex = animState.frameIndex;
                boxAnimationStates[e.id] = animState;
            }
            const frameImg = getBoxSpriteFrame(spriteCategory, frameIndex);
            if (frameImg && drawCollectableFrame(frameImg, boxScreenX, boxScreenY)) {
                boxSpriteHeight = frameImg.height || boxSpriteHeight;
            } else {
                ctx.fillStyle = getEntityColor(e);
                ctx.fillRect(boxScreenX - boxMarkerSize / 2, boxScreenY - boxMarkerSize / 2, boxMarkerSize, boxMarkerSize);
            }
        } else {
            if (boxAnimationStates[e.id]) clearBoxAnimationState(e.id);
            if (isBootyKey) {
                drawBootyKey(boxScreenX, boxScreenY, now);
            } else {
                ctx.fillStyle = getEntityColor(e);
                ctx.beginPath();
                ctx.arc(boxScreenX, boxScreenY, boxMarkerSize / 2, 0, Math.PI * 2, false);
                ctx.fill();
            }
        }
        if (category === "cargoNotFree") {
            drawLootProtectionPiechart(e, boxScreenX, boxScreenY, boxSpriteHeight, now, entityScale);
        }
    }
    drawActiveCollectableFadeOuts(now);
    drawActiveCollectableBoxBeams(now);
}

const portalFrameViewportScratch = {
    left: 0,
    top: 0,
    right: LOGICAL_WIDTH,
    bottom: LOGICAL_HEIGHT
};

function isPortalDrawRectOutsideViewport(destX, destY, destW, destH) {
    const viewport = getCurrentLogicalViewportRect(portalFrameViewportScratch);
    return destX + destW <= viewport.left || destY + destH <= viewport.top || destX >= viewport.right || destY >= viewport.bottom;
}

function drawPortalFrame(frameDef, portalScreenX, portalScreenY, entityScale) {
    if (!frameDef || frameDef.pendingAtlas) return false;
    if (frameDef.preparedPortalFrame && frameDef.img) {
        const source = frameDef.img;
        if (source.width <= 0 || source.height <= 0 || frameDef.width <= 0 || frameDef.height <= 0) return false;
        const w = frameDef.width * entityScale;
        const h = frameDef.height * entityScale;
        const baseX = portalScreenX - w / 2;
        const baseY = portalScreenY - h / 2;
        const trim = frameDef.trim;
        if (trim && trim.sw > 0 && trim.sh > 0) {
            const scaleX = w / (frameDef.sw || frameDef.width || 1);
            const scaleY = h / (frameDef.sh || frameDef.height || 1);
            const destX = baseX + trim.x * scaleX;
            const destY = baseY + trim.y * scaleY;
            const destW = trim.sw * scaleX;
            const destH = trim.sh * scaleY;
            if (isPortalDrawRectOutsideViewport(destX, destY, destW, destH)) return true;
            ctx.drawImage(source, trim.sx || 0, trim.sy || 0, trim.sw, trim.sh, destX, destY, destW, destH);
        } else {
            if (isPortalDrawRectOutsideViewport(baseX, baseY, w, h)) return true;
            ctx.drawImage(source, baseX, baseY, w, h);
        }
        return true;
    }
    if (frameDef.atlas) {
        const w = frameDef.width * entityScale;
        const h = frameDef.height * entityScale;
        const baseX = portalScreenX - w / 2;
        const baseY = portalScreenY - h / 2;
        const trim = frameDef.trim;
        if (trim && trim.sw > 0 && trim.sh > 0) {
            const scaleX = w / (frameDef.sw || frameDef.width || 1);
            const scaleY = h / (frameDef.sh || frameDef.height || 1);
            const destX = baseX + trim.x * scaleX;
            const destY = baseY + trim.y * scaleY;
            const destW = trim.sw * scaleX;
            const destH = trim.sh * scaleY;
            if (isPortalDrawRectOutsideViewport(destX, destY, destW, destH)) return true;
            ctx.drawImage(frameDef.atlas, trim.sx, trim.sy, trim.sw, trim.sh, destX, destY, destW, destH);
        } else {
            if (isPortalDrawRectOutsideViewport(baseX, baseY, w, h)) return true;
            ctx.drawImage(frameDef.atlas, frameDef.sx, frameDef.sy, frameDef.sw, frameDef.sh, baseX, baseY, w, h);
        }
        return true;
    }
    if (!frameDef.complete || frameDef.width <= 0 || frameDef.height <= 0) return false;
    const w = frameDef.width * entityScale;
    const h = frameDef.height * entityScale;
    const destX = portalScreenX - w / 2;
    const destY = portalScreenY - h / 2;
    if (isPortalDrawRectOutsideViewport(destX, destY, w, h)) return true;
    ctx.drawImage(frameDef, destX, destY, w, h);
    return true;
}

function drawPortals() {
    const now = performance.now();
    const entityScale = typeof getEntityDrawScale === "function" ? getEntityDrawScale() : 1;
    const activeDuration = typeof PORTAL_ACTIVE_DURATION !== "undefined" ? PORTAL_ACTIVE_DURATION : 1e3;
    for (const pid in portals) {
        const p = portals[pid];
        if (!p) continue;
        if (p.pendingRemoval) {
            const removeAt = Number(p.pendingRemovalAt || 0) || 0;
            if (removeAt > 0 && now >= removeAt && (!p.playJump || !p.jumpStart || now - p.jumpStart >= activeDuration)) {
                delete portals[pid];
                continue;
            }
        }
        const dx = p.x - shipX;
        const dy = p.y - shipY;
        const distSq = dx * dx + dy * dy;
        if (distSq > VIEW_RADIUS_SQ) continue;
        const portalScreenX = mapToScreenX(p.x);
        const portalScreenY = mapToScreenY(p.y);
        ctx.save();
        ctx.lineWidth = 2;
        const portalSpriteKey = typeof PORTAL_TYPE_TO_SPRITE_KEY !== "undefined" && PORTAL_TYPE_TO_SPRITE_KEY && PORTAL_TYPE_TO_SPRITE_KEY[p.typeId] ? PORTAL_TYPE_TO_SPRITE_KEY[p.typeId] : p.typeId === 1 ? "standard" : null;
        if (portalSpriteKey) {
            let drawn = false;
            const portalDef = PORTAL_SPRITE_DEFS[portalSpriteKey];
            if (portalDef) {
                if (!p.idleStart) p.idleStart = now;
                if (p.playJump && p.jumpStart) {
                    const jumpElapsed = now - p.jumpStart;
                    if (jumpElapsed <= activeDuration) {
                        const activeImg = getPortalSpriteFrame(portalSpriteKey, "active", 0);
                        if (activeImg && drawPortalFrame(activeImg, portalScreenX, portalScreenY, entityScale)) {
                            drawn = true;
                        }
                    } else {
                        p.playJump = false;
                        p.jumpStart = 0;
                        if (p.pendingRemoval) {
                            delete portals[pid];
                            ctx.restore();
                            continue;
                        }
                    }
                }
                if (!drawn) {
                    const idleDef = portalDef.idle;
                    const frameDuration = 1e3 / (idleDef.fps || PORTAL_ANIM_FPS);
                    const elapsed = now - (p.idleStart || now);
                    const frame = Math.floor(elapsed / frameDuration) % idleDef.frameCount;
                    const idleImg = getPortalSpriteFrame(portalSpriteKey, "idle", frame);
                    if (idleImg && drawPortalFrame(idleImg, portalScreenX, portalScreenY, entityScale)) {
                        drawn = true;
                    }
                }
            }
            if (!drawn) {
                ctx.strokeStyle = "#00ffff";
                ctx.shadowBlur = 15;
                ctx.shadowColor = "#00ffff";
                const radius = 24 * entityScale;
                ctx.beginPath();
                ctx.arc(portalScreenX, portalScreenY, radius, 0, Math.PI * 2, false);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(portalScreenX, portalScreenY, radius - 8, 0, Math.PI * 2, false);
                ctx.globalAlpha = .6;
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(portalScreenX, portalScreenY, 4, 0, Math.PI * 2, false);
                ctx.fillStyle = "#ffffff";
                ctx.fill();
            }
        } else {
            ctx.strokeStyle = "#0055ff";
            ctx.shadowBlur = 0;
            const baseSize = 80 * entityScale;
            ctx.strokeRect(portalScreenX - baseSize / 2, portalScreenY - baseSize / 2, baseSize, baseSize);
            ctx.beginPath();
            ctx.moveTo(portalScreenX - baseSize / 2, portalScreenY - baseSize / 2);
            ctx.lineTo(portalScreenX + baseSize / 2, portalScreenY + baseSize / 2);
            ctx.moveTo(portalScreenX + baseSize / 2, portalScreenY - baseSize / 2);
            ctx.lineTo(portalScreenX - baseSize / 2, portalScreenY + baseSize / 2);
            ctx.globalAlpha = .3;
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.fillStyle = "#0055ff";
            ctx.font = "bold 10px Arial";
            ctx.textAlign = "center";
            ctx.fillText("BASE STATION", portalScreenX, portalScreenY + baseSize / 2 + 12 * entityScale);
        }
        ctx.restore();
    }
}

function drawTooltip() {
    if (!activeTooltip) return;
    const x = activeTooltip.x + 10;
    const y = activeTooltip.y + 10;
    const text = activeTooltip.text;
    ctx.save();
    ctx.font = "12px Arial";
    const w = ctx.measureText(text).width + 8;
    const h = 20;
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#aaa";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + 4, y + h / 2);
    ctx.restore();
}

function drawDebugInfo() {
    if (!infoMessages || infoMessages.length === 0) return;
    const now = performance.now();
    let writeIndex = 0;
    for (let k = 0; k < infoMessages.length; k++) {
        const m = infoMessages[k];
        if (!m || now - m.createdAt > (m.duration || 2500)) {
            continue;
        }
        infoMessages[writeIndex++] = m;
    }
    infoMessages.length = writeIndex;
    if (infoMessages.length === 0) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const x = canvas.width / 2;
    const y = 20;
    const lineH = 20;
    ctx.lineJoin = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,0,0,0.90)";
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < infoMessages.length; i++) {
        const m = infoMessages[i];
        const age = now - m.createdAt;
        const dur = m.duration || 2500;
        const alpha = Math.max(0, Math.min(1, 1 - age / dur));
        ctx.globalAlpha = alpha;
        const yy = y + i * lineH;
        ctx.strokeText(m.text, x, yy);
        ctx.fillText(m.text, x, yy);
    }
    ctx.restore();
}

function initWindowManager() {
    const FLASH_W1_BORDER_NONRES = "graphics/ui/window1/images/w1_border_nonres.png";
    const FLASH_W1_BORDER_RES = "graphics/ui/window1/images/w1_border_res.png";
    const FLASH_W1_BG_TILE = "graphics/ui/window1/images/w1_bg_tile.png";
    const FLASH_W1_ZOOM_IN = "graphics/ui/window1/images/49.png";
    const FLASH_W1_ZOOM_IN_HOVER = "graphics/ui/window1/images/51.png";
    const FLASH_W1_ZOOM_IN_DISABLED = "graphics/ui/window1/images/49.png";
    const FLASH_W1_ZOOM_OUT = "graphics/ui/window1/images/54.png";
    const FLASH_W1_ZOOM_OUT_HOVER = "graphics/ui/window1/images/56.png";
    const FLASH_W1_ZOOM_OUT_DISABLED = "graphics/ui/window1/images/54.png";
    const FLASH_W1_BTN_CLOSE = "graphics/ui/window/images/btn_close.png";
    const FLASH_W1_BTN_CLOSE_HOVER = "graphics/ui/window/images/btn_close_hover.png";
    const style = document.createElement("style");
    style.innerHTML = `\n         \n        #mainMenuContainer {\n    position: absolute;\n    left: 25px;\n    top: 200px;\n\n    \n    width: 0;\n    height: 0;\n\n    z-index: 2000;\n    pointer-events: none;\n}\n\n.minSlotIcon {\n    position: absolute;\n    width: 32px;\n    height: 35px;\n    display: none;\n\n    cursor: pointer;\n    pointer-events: auto;\n    image-rendering: pixelated;\n    filter: drop-shadow(0 0 1px rgba(255, 255, 255, 0.24));\n\n    background-image:\n        var(--bg-normal, ${getUiCssUrl("graphics/ui/actionMenu/images/81_comb02_std.png.png")}),\n        ${getUiCssUrl("graphics/ui/actionMenu/images/8_slot.png")};\n    background-repeat: no-repeat, no-repeat;\n    background-position: center, center;\n    background-size: 32px 35px, 32px 35px;\n}\n\n.minSlotIcon:hover {\n    filter: drop-shadow(0 0 1px rgba(255, 255, 255, 0.30));\n    background-image:\n        var(--bg-hover, var(--bg-normal, ${getUiCssUrl("graphics/ui/actionMenu/images/81_comb02_std.png.png")})),\n        ${getUiCssUrl("graphics/ui/actionMenu/images/8_slot.png")};\n    background-repeat: no-repeat, no-repeat;\n    background-position: center, center;\n    background-size: 32px 35px, 32px 35px;\n}\n\n.minSlotIconInner {\n    position: absolute;\n    left: 50%;\n    top: 50%;\n    width: 24px;\n    height: 24px;\n    transform: translate(-50%, -50%);\n    image-rendering: pixelated;\n\n    background-repeat: no-repeat;\n    background-position: center;\n    background-size: contain;\n\n    pointer-events: none;\n}\n\n.gameWindow {\n            position: absolute;\n            color: #ccc; font-family: Tahoma, Arial, sans-serif; font-size: 11px;\n            display: none;  \n            flex-direction: column;\n            z-index: 1000;\n            overflow: hidden;\n        }\n        .gameWindow.flashWindow[data-window-key="chat"] { overflow:hidden; }\n        #content_chat { display:flex; flex-direction:column; min-height:0; }\n        .windowChrome { position:absolute; inset:0; pointer-events:none; }\n        .windowChrome .winCorner { position:absolute; width:23px; height:21px; background-size:100% 100%; }\n        .windowChrome .winCorner.tl { top:0; left:0; background-image:url('${UI_SPRITES.windowCornerTL}'); }\n        .windowChrome .winCorner.tr { top:0; right:0; background-image:url('${UI_SPRITES.windowCornerTR}'); }\n        .windowChrome .winCorner.bl { bottom:0; left:0; background-image:url('${UI_SPRITES.windowCornerBL}'); }\n        .windowChrome .winCorner.br { bottom:0; right:0; background-image:url('${UI_SPRITES.windowCornerBR}'); }\n        .windowChrome .winEdge.top { position:absolute; left:23px; right:23px; top:0; height:28px; background:${UI_SPRITES.windowTopEdge ? `url('${UI_SPRITES.windowTopEdge}')` : "rgba(0,0,0,0.5)"}; background-repeat: repeat-x; background-size:auto 100%; }\n        .windowChrome .winEdge.bottom { position:absolute; left:23px; right:23px; bottom:0; height:28px; background:${UI_SPRITES.windowBottomEdge ? `url('${UI_SPRITES.windowBottomEdge}')` : "rgba(0,0,0,0.5)"}; background-repeat: repeat-x; background-size:auto 100%; }\n        .windowChrome .winEdge.left { position:absolute; left:0; top:21px; bottom:21px; width:16px; background:${UI_SPRITES.windowSide ? `url('${UI_SPRITES.windowSide}')` : "rgba(0,0,0,0.6)"}; background-repeat: repeat-y; background-size:100% auto; }\n        .windowChrome .winEdge.right { position:absolute; right:0; top:21px; bottom:21px; width:16px; background:${UI_SPRITES.windowSide ? `url('${UI_SPRITES.windowSide}')` : "rgba(0,0,0,0.6)"}; background-repeat: repeat-y; background-size:100% auto; }\n        .windowInterior { position:absolute; left:16px; right:16px; top:28px; bottom:28px; background:${UI_SPRITES.windowBg ? `url('${UI_SPRITES.windowBg}')` : "rgba(0, 10, 20, 0.85)"}; background-size:100% 100%; display:flex; flex-direction:column; }\n        .gameWindow.chatTheme .winCorner.tl { background-image:url('${UI_SPRITES.chatCornerTL || UI_SPRITES.windowCornerTL || ""}'); }\n        .gameWindow.chatTheme .winCorner.tr { background-image:url('${UI_SPRITES.chatCornerTR || UI_SPRITES.windowCornerTR || ""}'); }\n        .gameWindow.chatTheme .winCorner.bl { background-image:url('${UI_SPRITES.chatCornerBL || UI_SPRITES.windowCornerBL || ""}'); }\n        .gameWindow.chatTheme .winCorner.br { background-image:url('${UI_SPRITES.chatCornerBR || UI_SPRITES.windowCornerBR || ""}'); }\n        .gameWindow.chatTheme .winEdge.top { background:${UI_SPRITES.chatTopEdge ? `url('${UI_SPRITES.chatTopEdge}')` : UI_SPRITES.windowTopEdge ? `url('${UI_SPRITES.windowTopEdge}')` : "rgba(0,0,0,0.5)"}; background-repeat: repeat-x; background-size:auto 100%; }\n        .gameWindow.chatTheme .winEdge.bottom { background:${UI_SPRITES.chatBottomEdge ? `url('${UI_SPRITES.chatBottomEdge}')` : UI_SPRITES.windowBottomEdge ? `url('${UI_SPRITES.windowBottomEdge}')` : "rgba(0,0,0,0.5)"}; background-repeat: repeat-x; background-size:auto 100%; }\n        .gameWindow.chatTheme .winEdge.left,\n        .gameWindow.chatTheme .winEdge.right { background:${UI_SPRITES.chatSide ? `url('${UI_SPRITES.chatSide}')` : UI_SPRITES.windowSide ? `url('${UI_SPRITES.windowSide}')` : "rgba(0,0,0,0.6)"}; background-repeat: repeat-y; background-size:100% auto; }\n        .gameWindow.chatTheme .windowInterior { background:${UI_SPRITES.chatBgTile ? `url('${UI_SPRITES.chatBgTile}')` : UI_SPRITES.windowBg ? `url('${UI_SPRITES.windowBg}')` : "rgba(0, 10, 20, 0.85)"}; }\n        .gwHeader {\n            height: 28px; background: ${UI_SPRITES.windowHeader ? `url('${UI_SPRITES.windowHeader}')` : "rgba(0, 0, 0, 0.8)"};\n            background-repeat: repeat-x; background-size:auto 100%;\n            border-bottom: 1px solid #4a6b8c;\n            display: flex; justify-content: space-between; align-items: center;\n            padding: 0 5px; cursor: move;\n        }\n        .windowHeaderIcon {\n            width: 22px;\n            height: 22px;\n            margin-right: 6px;\n            background-size: 90% 90%;\n            background-position: center;\n            background-repeat: no-repeat;\n            cursor: pointer;\n            flex-shrink: 0;\n        }\n\n        .gameWindow.chatTheme .gwHeader { background:${UI_SPRITES.chatHeader ? `url('${UI_SPRITES.chatHeader}')` : UI_SPRITES.windowHeader ? `url('${UI_SPRITES.windowHeader}')` : "rgba(0,0,0,0.8)"}; }\n        .gameWindow.chatTheme .gwContent { background:${UI_SPRITES.chatFooter ? `url('${UI_SPRITES.chatFooter}')` : UI_SPRITES.windowFooter ? `url('${UI_SPRITES.windowFooter}')` : "rgba(0,0,0,0.25)"}; background-size:100% 100%; }\n        .gwTitle { color: #dfdfdf; font-weight: 700; font-size: 14px; font-family: Tahoma, Arial, sans-serif; text-shadow: 1px 1px 0 #000; }\n        .gwButtons { display: flex; gap: 4px; }\n        .gwBtn { cursor: pointer; width: 16px; height: 16px; background-size: 100% 100%; background-repeat: no-repeat; filter: drop-shadow(0 0 2px #000); }\n        .gwBtn.closeBtn { background-image: url('${UI_SPRITES.buttonClose}'); }\n        .gwBtn.closeBtn:hover { background-image: url('${UI_SPRITES.buttonCloseHover || UI_SPRITES.buttonClose}'); }\n        .gwBtn.collapseBtn { background-image: url('${UI_SPRITES.buttonCollapse}'); }\n        .gwBtn.collapseBtn:hover { background-image: url('${UI_SPRITES.buttonCollapseHover || UI_SPRITES.buttonCollapse}'); }\n        .gwBtn:hover { filter: none; }\n            .gwContent { padding: 6px; overflow: hidden; flex: 1; position: relative; background: ${UI_SPRITES.windowFooter ? `url('${UI_SPRITES.windowFooter}')` : "rgba(0,0,0,0.25)"}; background-size: 100% 100%; }\n\n         \n        \n        :root {\n            --do-chat-sender-color: #A6DCF9;\n            --do-chat-text-color: #EEEEEE;\n            --do-chat-highlight-color: #55FF55;\n            --do-chat-supporter-color: #FF0000;\n            --do-chat-mod-color: #F5B829;\n            --do-chat-admin-color: #FAA419;\n            --do-chat-system-color: #FFE538;\n            --do-chat-whisper-color: #FFF82D;\n        }\n        .doChatContent .chatLine { margin:0; padding:0; font-size:11px; line-height:13px; color:var(--do-chat-text-color); text-shadow:1px 1px 0 #000; white-space:pre-wrap; word-break:break-word; overflow-wrap:break-word; }\n        .doChatContent .chatLine .chatName { color:var(--do-chat-sender-color); cursor:pointer; text-decoration:none; }\n        .doChatContent .chatLine .chatName:hover { color:#b9ecff; text-decoration:none; }\n        .doChatContent .chatLine .chatClanTag { color:inherit; font-weight:inherit; }\n        .doChatContent .chatLine.chatSystem, .doChatContent .chatLine.chatSystem .chatName { color:var(--do-chat-system-color); font-weight:bold; }\n        .doChatContent .chatLine.chatSupporter, .doChatContent .chatLine.chatSupporter .chatName { color:var(--do-chat-supporter-color); font-weight:bold; }\n        .doChatContent .chatLine.chatMod, .doChatContent .chatLine.chatMod .chatName { color:var(--do-chat-mod-color); font-weight:bold; }\n        .doChatContent .chatLine.chatAdmin, .doChatContent .chatLine.chatAdmin .chatName { color:var(--do-chat-admin-color); font-weight:bold; }\n        .doChatContent .chatLine.chatWhisper, .doChatContent .chatLine.chatWhisper .chatName, .doChatContent .chatLine.chatWhisper .chatWhisperPrefix { color:var(--do-chat-whisper-color); }\n        .doChatContent .chatLine.chatWhisper .chatName:hover { color:var(--do-chat-whisper-color); }\n        .doChatContent .chatLine .mvcLightblue { color:var(--do-chat-sender-color); }\n        .doChatContent .chatLine .mvcYellow,\n        .doChatContent .chatLine .mvcYan { color:var(--do-chat-system-color); font-weight:bold; }\n        .doChatContent .chatLine .mvcWhite { color:var(--do-chat-text-color); }\n        .doChatContent .chatLine .mvcGreen { color:var(--do-chat-highlight-color); }\n        .doChatContent .chatLine .mvcRed { color:#FF0000; }\n        .doChatContent .chatLine .mvcOrange { color:var(--do-chat-mod-color); }\n        .doChatContent .chatLine .mvcBlue { color:#3864C0; }\n        .doChatContent .chatLine .mvcWhisper { color:var(--do-chat-whisper-color); }\n        .doChatContent .chatLine .mvcLink { color:#FF00FF; text-decoration:underline; }\n        .doChatContent .chatLine.chatClan,\n        .doChatContent .chatLine.chatFaction { color:var(--do-chat-text-color); }\n        .doChatContent .chatLine.chatClan .chatName,\n        .doChatContent .chatLine.chatFaction .chatName { color:var(--do-chat-sender-color); }\n        .doChatContent .chatLine.chatGroup { color:var(--do-chat-text-color); }\n        .doChatContent .chatLine.chatGroup .chatName { color:var(--do-chat-sender-color); }\n        .doChatContent .chatLine.chatGroup .chatName:hover { color:#b9ecff; }\n        #chatContent { min-height:0; }\n        .gameWindow.flashWindow[data-window-key="chat"] .chatResizer {\n            position:absolute;\n            width:16px;\n            height:16px;\n            right:4px;\n            bottom:4px;\n            cursor: se-resize;\n            background: transparent;\n            border: none;\n            box-shadow: none;\n            opacity: 0;\n        }\n        .gameWindow.flashWindow[data-window-key="chat"] .chatResizer:hover { opacity: 1; }\n        \n         \n        .statBarBox { width: 100%; height: 10px; background: #222; border: 1px solid #555; margin-bottom: 2px; position:relative; }\n        .statBarFill { height: 100%; width: 50%; transition: width 0.2s; }\n        .statBarText { position: absolute; top:-1px; left:0; width:100%; text-align:center; font-size:9px; color:#fff; text-shadow:1px 1px 0 #000; }\n\n        .uiStatRow { display:flex; align-items:center; gap:6px; margin-bottom:4px; }\n        .uiStatIcon { width:16px; height:16px; background-size: contain; background-repeat:no-repeat; }\n        .uiStatBar { position:relative; flex:1; height:16px; border:1px solid #152536; background:${UI_SPRITES.windowFooter ? `url('${UI_SPRITES.windowFooter}')` : "rgba(0,0,0,0.4)"}; background-size:100% 100%; }\n        .uiStatFill { position:absolute; left:0; top:0; bottom:0; background:rgba(0,255,0,0.55); }\n        .uiStatText { position:absolute; left:0; top:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:10px; color:#fff; text-shadow:1px 1px 0 #000; }\n        .uiValueRow { display:flex; align-items:center; justify-content:space-between; margin-bottom:2px; color:#e0efff; font-size:11px; }\n        .uiValueRow .label { display:flex; align-items:center; gap:6px; }\n\n \n        \n        .flashTopUtilityButton {\n            position: absolute;\n            width: 32px;\n            height: 35px;\n            border: none;\n            cursor: pointer;\n            z-index: 2200;\n            pointer-events: auto;\n            image-rendering: pixelated;\n            filter: drop-shadow(0 0 1px rgba(255, 255, 255, 0.24));\n            background-image:\n                var(--flash-top-bg, url('graphics/ui/actionMenu/images/81_comb02_std.png.png')),\n                url('graphics/ui/actionMenu/images/8_slot.png');\n            background-repeat: no-repeat, no-repeat;\n            background-position: center, center;\n            background-size: 32px 35px, 32px 35px;\n        }\n        .flashTopUtilityButton:hover {\n            filter: drop-shadow(0 0 1px rgba(255, 255, 255, 0.30));\n            background-image:\n                var(--flash-top-bg-hover, var(--flash-top-bg, url('graphics/ui/actionMenu/images/83_comb02_hover.png.png'))),\n                url('graphics/ui/actionMenu/images/8_slot.png');\n            background-repeat: no-repeat, no-repeat;\n            background-position: center, center;\n            background-size: 32px 35px, 32px 35px;\n        }\n        .flashTopUtilityButton.active,\n        .flashTopUtilityButton.active:hover {\n            filter: drop-shadow(0 0 1px rgba(255, 255, 255, 0.30));\n            background-image:\n                url('graphics/ui/actionMenu/images/82_comb02_selected.png.png'),\n                var(--flash-top-bg-active, var(--flash-top-bg-hover, var(--flash-top-bg, url('graphics/ui/actionMenu/images/83_comb02_hover.png.png')))),\n                url('graphics/ui/actionMenu/images/8_slot.png');\n            background-repeat: no-repeat, no-repeat, no-repeat;\n            background-position: center, center, center;\n            background-size: 32px 35px, 32px 35px, 32px 35px;\n        }\n        .flashTopUtilityButtonInner {\n            position: absolute;\n            left: 50%;\n            top: 50%;\n            width: 24px;\n            height: 24px;\n            transform: translate(-50%, -50%);\n            pointer-events: none;\n            image-rendering: pixelated;\n            background-repeat: no-repeat;\n            background-position: center;\n            background-size: contain;\n        }\n        .flashTopUtilityButton:active {\n            transform: translateY(1px);\n        }\n\n        .gameWindow.flashWindow[data-window-key="logout"] .gwContent {\n            overflow: hidden;\n        }\n        .gameWindow.flashWindow[data-window-key="logout"] .gwContent::before {\n            opacity: 0.40;\n        }\n        .gameWindow.flashWindow[data-window-key="logout"] .gwContent > .logoutContent {\n            position: absolute;\n            left: 10px;\n            right: 10px;\n            top: 15px;\n            width: auto;\n            height: auto;\n            min-height: 0;\n            display: flex;\n            flex-direction: column;\n            align-items: center;\n            justify-content: flex-start;\n            text-align: center;\n            color: #FFFFFF;\n            font-family: Tahoma, Arial, sans-serif;\n            pointer-events: auto;\n        }\n        .gameWindow.flashWindow[data-window-key="logout"] .logoutTextTop,\n        .gameWindow.flashWindow[data-window-key="logout"] .logoutCountdown,\n        .gameWindow.flashWindow[data-window-key="logout"] .logoutTextBottom {\n            width: 100%;\n            display: block;\n            text-align: center;\n            color: #FFFFFF;\n            font-family: Tahoma, Arial, sans-serif;\n            font-size: 14px;\n            font-weight: 700;\n            line-height: 16px;\n            letter-spacing: 0;\n            text-shadow: 1px 1px 0 #000000;\n        }\n        .gameWindow.flashWindow[data-window-key="logout"] .logoutTextTop {\n            margin: 0;\n            white-space: pre-line;\n        }\n        .gameWindow.flashWindow[data-window-key="logout"] .logoutCountdown {\n            margin: 11px 0 10px 0;\n        }\n        .gameWindow.flashWindow[data-window-key="logout"] .logoutTextBottom {\n            margin: 0 0 7px 0;\n            white-space: pre-line;\n        }\n        .gameWindow.flashWindow[data-window-key="logout"] .logoutCancelBtn {\n            width: 77px;\n            height: 25px;\n            padding: 0;\n            margin: 0;\n            border: 0;\n            outline: none;\n            display: inline-flex;\n            align-items: center;\n            justify-content: center;\n            background: url('graphics/ui/ui/sprites/DefineSprite_518_button1/1.png') no-repeat center / 77px 25px;\n            color: #FFFFFF;\n            font-family: Tahoma, Arial, sans-serif;\n            font-size: 11px;\n            font-weight: 700;\n            text-shadow: 1px 1px 0 #000000;\n            cursor: pointer;\n            pointer-events: auto;\n        }\n        .gameWindow.flashWindow[data-window-key="logout"] .logoutCancelBtn:active {\n            transform: translateY(1px);\n        }\n\n        .gameWindow.flashWindow[data-window-key="spaceball"] .gwContent {\n            padding: 0;\n            overflow: hidden;\n        }\n        .gameWindow.flashWindow[data-window-key="spaceball"] .flashSpaceballRoot {\n            position: absolute;\n            inset: 0;\n        }\n        .gameWindow.flashWindow[data-window-key="spaceball"] .flashSpaceballContainer {\n            position: absolute;\n            left: 12px;\n            top: 10px;\n            width: 164px;\n            height: 44px;\n        }\n        .gameWindow.flashWindow[data-window-key="spaceball"] .flashSpaceballEntry {\n            position: absolute;\n            top: 0;\n            height: 44px;\n            user-select: none;\n        }\n        .gameWindow.flashWindow[data-window-key="spaceball"] .flashSpaceballBg,\n        .gameWindow.flashWindow[data-window-key="spaceball"] .flashSpaceballSpeed {\n            position: absolute;\n            left: 0;\n            top: 0;\n            image-rendering: pixelated;\n            pointer-events: none;\n            user-select: none;\n            -webkit-user-drag: none;\n        }\n        .gameWindow.flashWindow[data-window-key="spaceball"] .flashSpaceballCompany,\n        .gameWindow.flashWindow[data-window-key="spaceball"] .flashSpaceballScore {\n            position: absolute;\n            left: 0;\n            color: #FFFFFF;\n            text-align: center;\n            white-space: nowrap;\n            pointer-events: none;\n            font-family: Tahoma, Arial, sans-serif;\n            font-size: 12px;\n            font-weight: 700;\n            line-height: 12px;\n            text-shadow: 1px 1px 0 #000000;\n            letter-spacing: 0;\n        }\n        .gameWindow.flashWindow[data-window-key="spaceball"] .flashSpaceballCompany {\n            top: 1px;\n        }\n        .gameWindow.flashWindow[data-window-key="spaceball"] .flashSpaceballScore {\n            top: 13px;\n        }\n\n         \n\n        #content_refinement {\n            position: relative;\n            width: 100%;\n            height: 100%;\n            box-sizing: border-box;\n            background: transparent;\n            color: #ffffff;\n            font-family: Tahoma, Arial, sans-serif;\n            overflow: visible;\n        }\n\n        #content_refinement .refiningTabs {\n            position: absolute;\n            left: 20px;\n            top: 38px;\n            width: 434px;\n            height: 21px;\n            display: flex;\n            gap: 2px;\n            padding: 0;\n            margin: 0;\n            z-index: 3;\n        }\n        #content_refinement .refiningTabs::after {\n            content: '';\n            position: absolute;\n            left: 0;\n            width: 434px;\n            top: 20px;\n            border-top: 1px solid #7e7e7e;\n        }\n        #content_refinement .refTab {\n            position: relative;\n            z-index: 1;\n            min-width: 84px;\n            height: 20px;\n            line-height: 20px;\n            padding: 0 8px;\n            margin: 0;\n            border: 0;\n            outline: none;\n            box-shadow: none;\n            background-repeat: no-repeat;\n            background-position: center;\n            background-size: 100% 100%;\n            cursor: pointer;\n            font-size: 11px;\n            color: #111111;\n            text-align: center;\n        }\n\n        #content_refinement .refiningBody {\n            position: absolute;\n            inset: 0;\n            box-sizing: border-box;\n            overflow: visible;\n            z-index: 1;\n        }\n        #content_refinement .refPage { display: none; }\n        #content_refinement .refPage.active {\n            display: block;\n            position: absolute;\n            left: 0;\n            top: 0;\n            width: 455px;\n            height: 525px;\n            overflow: visible;\n        }\n\n        #content_refinement .refiningTreeWrap {\n            width: 455px;\n            height: 525px;\n            margin: 0;\n            position: relative;\n        }\n        #content_refinement .refiningTree {\n            position: relative;\n            width: 455px;\n            height: 525px;\n            overflow: visible;\n        }\n        #content_refinement .refiningTreeBg {\n            position: absolute;\n            left: 110px;\n            top: 196px;\n            width: 257px;\n            height: 234px;\n            background: url('graphics/ui/ui/scripts/_assets/37_ore_tree.png') no-repeat 0 0;\n            background-size: 257px 234px;\n            pointer-events: none;\n        }\n\n        #content_refinement .refModule {\n            position: absolute;\n            width: 80px;\n            height: 122px;\n        }\n        #content_refinement .refModule.refStatic {\n            height: 96px;\n        }\n        #content_refinement .refUpgradeModule,\n        #content_refinement .refTargetModule {\n            position: relative;\n            width: 80px;\n            height: 100px;\n            flex: 0 0 80px;\n        }\n        #content_refinement .refUpgradeModule.refStatic,\n        #content_refinement .refTargetModule.refStatic {\n            height: 100px;\n        }\n        #content_refinement .refLabel {\n            position: absolute;\n            left: 0;\n            width: 80px;\n            height: 18px;\n            background: ${typeof getUiCssUrl === "function" ? getUiCssUrl("graphics/ui/refinement/images/labelSlot.png") : "url('graphics/ui/refinement/images/labelSlot.png')"} no-repeat 0 0;\n            background-size: 80px 18px;\n            display: flex;\n            align-items: center;\n            justify-content: center;\n            font-size: 11px;\n            font-weight: bold;\n            color: #ffffff;\n            text-align: center;\n            line-height: 16px;\n            white-space: nowrap;\n            overflow: hidden;\n            text-overflow: ellipsis;\n        }\n        #content_refinement .refLabelTop { top: -22px; }\n        #content_refinement .refLabelBottom { top: 74px; }\n        #content_refinement .refTargetModule .refLabelBottom { top: 82px; }\n\n        #content_refinement .refSlot,\n        #content_refinement .refTargetSlot {\n            position: absolute;\n            left: 0;\n            top: 0;\n            overflow: hidden;\n        }\n        #content_refinement .refSlot {\n            width: 80px;\n            height: 70px;\n            background: ${typeof getUiCssUrl === "function" ? getUiCssUrl("graphics/ui/refinement/images/sourceSlot.png") : "url('graphics/ui/refinement/images/sourceSlot.png')"} no-repeat 0 0;\n            background-size: 80px 70px;\n        }\n        #content_refinement .refTargetSlot {\n            width: 80px;\n            height: 78px;\n            background: ${typeof getUiCssUrl === "function" ? getUiCssUrl("graphics/ui/refinement/images/targetSlot.png") : "url('graphics/ui/refinement/images/targetSlot.png')"} no-repeat 0 0;\n            background-size: 80px 78px;\n        }\n        #content_refinement .refSlotIcon,\n        #content_refinement .refTargetSlotIcon {\n            position: absolute;\n            left: 50%;\n            top: 50%;\n            transform: translate(-50%, -50%);\n            width: 68px;\n            height: 62px;\n            object-fit: contain;\n            display: block;\n            background-repeat: no-repeat;\n            background-position: center;\n            background-size: contain;\n            pointer-events: none;\n            z-index: 1;\n        }\n        #content_refinement .refTargetSlotIcon {\n            width: 68px;\n            height: 68px;\n        }\n\n        #content_refinement .refTargetMini {\n            position: absolute;\n            left: 4px;\n            bottom: 4px;\n            width: 22px;\n            height: 22px;\n            background: ${typeof getUiCssUrl === "function" ? getUiCssUrl("graphics/ui/refinement/images/targetIcon.png") : "url('graphics/ui/refinement/images/targetIcon.png')"} no-repeat 0 0;\n            background-size: 22px 22px;\n        }\n        #content_refinement .refTargetMiniIcon {\n            position: absolute;\n            left: 1px;\n            top: 1px;\n            width: 20px;\n            height: 20px;\n            display: block;\n            object-fit: contain;\n            background-repeat: no-repeat;\n            background-position: center;\n            background-size: contain;\n            pointer-events: none;\n        }\n\n        #content_refinement .refNodeBtn {\n            position: absolute;\n            left: 0;\n            top: 100px;\n            width: 80px;\n            height: 22px;\n            line-height: 22px;\n            padding: 0;\n            border: 0;\n            outline: none;\n            box-shadow: none;\n            background-repeat: no-repeat;\n            background-position: center;\n            background-size: 100% 100%;\n            cursor: pointer;\n            font-size: 11px;\n            color: #111111;\n            text-align: center;\n        }\n        #content_refinement .refNodeBtn:disabled { cursor: default; }\n\n        #content_refinement .refUpgradeScene {\n            position: relative;\n            width: 455px;\n            height: 525px;\n            margin: 0;\n        }\n        #content_refinement .refUpgradeHeader {\n            position: absolute;\n            left: 20px;\n            top: 62px;\n            width: 340px;\n            font-size: 11px;\n            font-weight: bold;\n            color: #ffffff;\n            line-height: 14px;\n        }\n        #content_refinement .refUpgradeRow {\n            position: absolute;\n            display: flex;\n            gap: 8px;\n            margin: 0;\n        }\n        #content_refinement .refUpgradeRow.refUpgradeRaw {\n            left: 20px;\n            top: 100px;\n            width: 344px;\n        }\n        #content_refinement .refUpgradeRow.refUpgradeRefined {\n            left: 58px;\n            top: 270px;\n            width: 344px;\n        }\n        #content_refinement .refUpgradeRow.refUpgradeTargets {\n            left: 58px;\n            top: 392px;\n            width: 344px;\n        }\n        #content_refinement .refUpgradeHint {\n            position: absolute;\n            left: 58px;\n            top: 218px;\n            width: 340px;\n            margin: 0;\n            font-size: 11px;\n            line-height: 14px;\n            color: #ffffff;\n            text-align: left;\n        }\n\n        #refinePromptOverlay{\n            position:fixed;\n            inset:0;\n            background-image:url('graphics/ui/window1/images/w1_bg_tile.png');\n            z-index:11000;\n            display:flex;\n            align-items:center;\n            justify-content:center;\n        }\n        #refinePrompt{\n            width:260px;\n            padding:16px;\n            background-image:url('graphics/ui/window1/images/w1_bg_tile.png');\n            border:0;\n            font-family:Tahoma, Arial, sans-serif;\n        }\n        #refinePrompt h4{\n            margin:0 0 6px 0;\n            font-size:11px;\n        }\n        #refinePrompt p{\n            margin:0 0 10px 0;\n            font-size:11px;\n        }\n        #refinePrompt select{\n            width:100%;\n            height:24px;\n            background-image:url('graphics/ui/ui/sprites/DefineSprite_536_Button_upSkin/1.png');\n            background-size:100% 100%;\n            border:0;\n        }\n        #refinePrompt .refinePromptActions{\n            margin-top:12px;\n            display:flex;\n            gap:8px;\n            justify-content:flex-end;\n        }\n        #refinePrompt button{\n            min-width:70px;\n            height:22px;\n            background-image:url('graphics/ui/ui/sprites/DefineSprite_536_Button_upSkin/1.png');\n            background-size:100% 100%;\n            border:0;\n            cursor:pointer;\n        }\n\n        #safePromptOverlay{\n            position:fixed;\n            inset:0;\n            background-image:url('graphics/ui/window1/images/w1_bg_tile.png');\n            z-index:11000;\n            display:flex;\n            align-items:center;\n            justify-content:center;\n        }\n        #safePrompt{\n            width:260px;\n            padding:16px;\n            background-image:url('graphics/ui/window1/images/w1_bg_tile.png');\n            border:0;\n            font-family:Tahoma, Arial, sans-serif;\n        }\n        #safePrompt h4{\n            margin:0 0 6px 0;\n            font-size:11px;\n        }\n        #safePrompt p{\n            margin:0 0 10px 0;\n            font-size:11px;\n            line-height:14px;\n        }\n        #safePrompt select{\n            width:100%;\n            height:24px;\n            background-image:url('graphics/ui/ui/sprites/DefineSprite_536_Button_upSkin/1.png');\n            background-size:100% 100%;\n            border:0;\n        }\n        #safePrompt .refinePromptActions{\n            margin-top:12px;\n            display:flex;\n            gap:8px;\n            justify-content:flex-end;\n        }\n        #safePrompt button{\n            min-width:80px;\n            height:22px;\n            background-image:url('graphics/ui/ui/sprites/DefineSprite_536_Button_upSkin/1.png');\n            background-size:100% 100%;\n            border:0;\n            cursor:pointer;\n        }\n\n        #content_refinement .refSafeScene {\n            position: relative;\n            width: 455px;\n            height: 525px;\n            margin: 0;\n            color: #ffffff;\n        }\n        #content_refinement .refSafeTitle {\n            position: absolute;\n            left: 20px;\n            top: 68px;\n            width: 200px;\n            font-size: 16px;\n            font-weight: bold;\n            color: #ffffff;\n            text-shadow: 1px 1px 0 #000000;\n        }\n        #content_refinement .refSafeHint {\n            position: absolute;\n            left: 20px;\n            top: 92px;\n            width: 410px;\n            font-size: 11px;\n            line-height: 14px;\n            color: #ffffff;\n        }\n        #content_refinement .refSafeStatusCard,\n        #content_refinement .refSafeActionPanel,\n        #content_refinement .refSafeLevelCard {\n            background: rgba(8, 16, 28, 0.78);\n            border: 1px solid rgba(132, 164, 214, 0.42);\n            box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.45);\n        }\n        #content_refinement .refSafeStatusCard {\n            position: absolute;\n            left: 20px;\n            top: 132px;\n            width: 186px;\n            min-height: 168px;\n            padding: 12px;\n            box-sizing: border-box;\n        }\n        #content_refinement .refSafeStatusIcon {\n            width: 92px;\n            height: 92px;\n            margin: 0 auto 8px;\n            background-repeat: no-repeat;\n            background-position: center;\n            background-size: contain;\n        }\n        #content_refinement .refSafeStatusMeta {\n            display: flex;\n            flex-direction: column;\n            gap: 4px;\n        }\n        #content_refinement .refSafeStatLine {\n            display: flex;\n            justify-content: space-between;\n            align-items: center;\n            gap: 12px;\n            font-size: 11px;\n            line-height: 14px;\n        }\n        #content_refinement .refSafeStatLabel {\n            color: #bccae4;\n        }\n        #content_refinement .refSafeStatValue {\n            color: #ffffff;\n            font-weight: bold;\n        }\n        #content_refinement .refSafeActionPanel {\n            position: absolute;\n            left: 224px;\n            top: 132px;\n            width: 206px;\n            min-height: 168px;\n            padding: 12px;\n            box-sizing: border-box;\n        }\n        #content_refinement .refSafeActionTitle {\n            font-size: 14px;\n            font-weight: bold;\n            margin-bottom: 8px;\n            color: #ffffff;\n        }\n        #content_refinement .refSafeActionInfo {\n            font-size: 11px;\n            line-height: 14px;\n            margin-bottom: 12px;\n            color: #dce8ff;\n        }\n        #content_refinement .refSafeActionButtons {\n            display: flex;\n            flex-direction: column;\n            gap: 8px;\n        }\n        #content_refinement .refSafeButton {\n            width: 100%;\n            min-height: 22px;\n            line-height: 22px;\n            padding: 0 8px;\n            border: 0;\n            outline: none;\n            box-shadow: none;\n            background-repeat: no-repeat;\n            background-position: center;\n            background-size: 100% 100%;\n            cursor: pointer;\n            font-size: 11px;\n            color: #111111;\n            text-align: center;\n        }\n        #content_refinement .refSafeButton:disabled {\n            cursor: default;\n        }\n        #content_refinement .refSafeActionFootnote {\n            margin-top: 12px;\n            font-size: 10px;\n            line-height: 13px;\n            color: #b8c7e0;\n        }\n        #content_refinement .refSafeLevels {\n            position: absolute;\n            left: 20px;\n            top: 320px;\n            width: 410px;\n            display: flex;\n            gap: 10px;\n        }\n        #content_refinement .refSafeLevelCard {\n            flex: 1 1 0;\n            min-height: 144px;\n            padding: 10px;\n            box-sizing: border-box;\n            display: flex;\n            flex-direction: column;\n        }\n        #content_refinement .refSafeLevelHead {\n            font-size: 13px;\n            font-weight: bold;\n            color: #ffffff;\n            margin-bottom: 8px;\n        }\n        #content_refinement .refSafeLevelMeta {\n            font-size: 11px;\n            line-height: 15px;\n            color: #dce8ff;\n            margin-bottom: 10px;\n            min-height: 48px;\n        }\n        #content_refinement .refSafeLevelStatus {\n            font-size: 11px;\n            color: #ffe082;\n            margin-bottom: 10px;\n            min-height: 14px;\n        }\n        #content_refinement .refSafeDisabledNote {\n            position: absolute;\n            left: 20px;\n            right: 25px;\n            bottom: 22px;\n            font-size: 11px;\n            line-height: 14px;\n            color: #ffe082;\n        }\n\n        .oreGrid {\n            display: grid;\n            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));\n            gap: 8px;\n        }\n\n        .oreCard {\n            display: flex;\n            gap: 8px;\n            align-items: center;\n            padding: 6px;\n            background-image:url('graphics/ui/window1/images/w1_bg_tile.png');\n            border: 0;\n            \n        }\n        .oreCard .oreIcon {\n            width: 32px;\n            height: 32px;\n            background-size: contain;\n            background-repeat: no-repeat;\n            background-position: center;\n            \n            flex-shrink: 0;\n        }\n        .oreCard .oreInfo { display:flex; flex-direction:column; line-height:14px; }\n        .oreCard .oreInfo .oreName { }\n        .oreCard .oreInfo .oreCount { }\n\n        .refRecipe {\n            padding: 8px;\n            border: 0;\n            background-image:url('graphics/ui/window1/images/w1_bg_tile.png');\n            \n            display: block;\n            gap: 6px;\n        }\n        .refRecipeHeader { display:flex; justify-content:space-between; align-items:center; }\n        .refRecipeTitle { font-weight:bold; display:flex; gap:6px; align-items:center; }\n        .refRecipeBody { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }\n        .refRecipeInputs { font-size:11px; }\n        .refRecipe .refineInput { width:80px; }\n        .refRecipe .statusOk { }\n        .refRecipe .statusKo { }\n        #content_trade {\n            position: relative;\n            overflow: hidden;\n        }\n        #content_trade .tradeScene {\n            position: absolute;\n            inset: 0;\n            display: flex;\n            align-items: center;\n            justify-content: center;\n        }\n        #content_trade .tradeModulesGrid {\n            position: relative;\n            left: 0;\n            top: 0;\n            width: 482px;\n            height: 156px;\n            flex: 0 0 482px;\n        }\n        #content_trade .tradeModule {\n            position: absolute;\n            width: 82px;\n            height: 156px;\n            background: url('graphics/ui/ui/sprites/DefineSprite_234_trade_module_1/1.png') no-repeat 0 0 / 82px 156px;\n            image-rendering: pixelated;\n            color: #d5e8f8;\n        }\n        #content_trade .tradeOreIcon {\n            position: absolute;\n            left: 8px;\n            top: 23px;\n            width: 66px;\n            height: 56px;\n            background-repeat: no-repeat;\n            background-position: center;\n            background-size: 66px 56px;\n            image-rendering: pixelated;\n            pointer-events: none;\n            z-index: 1;\n        }\n        #content_trade .tradePriceMask,\n        #content_trade .tradeGainMask {\n            display: none;\n        }\n        #content_trade .tradePrice,\n        #content_trade .tradeGain,\n        #content_trade .tradeRemaining {\n            position: absolute;\n            text-align: center;\n            font-family: Tahoma, Arial, sans-serif;\n            text-shadow: none;\n            pointer-events: none;\n            white-space: nowrap;\n            overflow: hidden;\n            z-index: 3;\n        }\n        #content_trade .tradePrice {\n            left: 6px;\n            top: 7px;\n            width: 70px;\n            font-size: 11px;\n            line-height: 11px;\n            color: #ffffff;\n            font-weight: 700;\n        }\n        #content_trade .tradeRemaining {\n            left: 0;\n            top: 1px;\n            width: 67px;\n            font-size: 11px;\n            line-height: 15px;\n            color: #999999;\n            font-weight: 400;\n        }\n        #content_trade .tradeGain {\n            left: 6px;\n            top: 113px;\n            width: 70px;\n            font-size: 11px;\n            line-height: 12px;\n            color: #ffffff;\n            font-weight: 700;\n        }\n        #content_trade .tradeStepper {\n            position: absolute;\n            left: 8px;\n            top: 79px;\n            width: 67px;\n            height: 31px;\n        }\n        #content_trade .tradeModule.tradeDisabled {\n            filter: saturate(0);\n        }\n        #content_trade .tradeStepBtn {\n            position: absolute;\n            top: 17px;\n            width: 14px;\n            height: 14px;\n            border: 0;\n            padding: 0;\n            cursor: pointer;\n            background-repeat: no-repeat;\n            background-size: 14px 14px;\n            image-rendering: pixelated;\n        }\n        #content_trade .tradeStepBtn.minus { left: 0; background-image: url('graphics/ui/ui/sprites/DefineSprite_216_numericStepperMinus/1.png'); }\n        #content_trade .tradeStepBtn.minus:hover { background-image: url('graphics/ui/ui/sprites/DefineSprite_216_numericStepperMinus/2.png'); }\n        #content_trade .tradeStepBtn.minus:active { background-image: url('graphics/ui/ui/sprites/DefineSprite_216_numericStepperMinus/3.png'); }\n        #content_trade .tradeStepBtn.minus:disabled { background-image: url('graphics/ui/ui/sprites/DefineSprite_216_numericStepperMinus/4.png'); cursor: default; }\n        #content_trade .tradeStepBtn.plus { left: 53px; background-image: url('graphics/ui/ui/sprites/DefineSprite_209_numericStepperPlus/1.png'); }\n        #content_trade .tradeStepBtn.plus:hover { background-image: url('graphics/ui/ui/sprites/DefineSprite_209_numericStepperPlus/2.png'); }\n        #content_trade .tradeStepBtn.plus:active { background-image: url('graphics/ui/ui/sprites/DefineSprite_209_numericStepperPlus/3.png'); }\n        #content_trade .tradeStepBtn.plus:disabled { background-image: url('graphics/ui/ui/sprites/DefineSprite_209_numericStepperPlus/4.png'); cursor: default; }\n        #content_trade .tradeQty {\n            position: absolute;\n            left: 13px;\n            top: 17px;\n            width: 40px;\n            height: 15px;\n            border: 0;\n            background: transparent;\n            color: #ffffff;\n            text-align: center;\n            font-size: 11px;\n            line-height: 15px;\n            padding: 0;\n            margin: 0;\n            appearance: textfield;\n            -moz-appearance: textfield;\n        }\n        #content_trade .tradeSellBtn {\n            position: absolute;\n            left: 6px;\n            top: 135px;\n            width: 70px;\n            height: 15px;\n            border: 0;\n            padding: 0;\n            color: #fff;\n            font-size: 10px;\n            line-height: 15px;\n            background: url('graphics/ui/ui/sprites/DefineSprite_249/1.png') no-repeat center / 69px 16px;\n            image-rendering: pixelated;\n            cursor: pointer;\n        }\n        #content_trade .tradeSellBtn:disabled {\n            cursor: default;\n        }\n\n\n\n        \n        .gameWindow.flashWindow {\n            font-family: Tahoma, Arial, sans-serif;\n            font-size: 11px;\n            line-height: 13px;\n            color: #e9f1f7;\n            background: transparent;\n            border: none;\n            border-radius: 0;\n            box-shadow: none;\n            overflow: hidden;\n\n            \n            --flash-window-mask: url('graphics/ui/window1/images/w1_mask_nonres.png');\n            -webkit-mask-box-image: var(--flash-window-mask) 36 79 22 40 fill stretch;\n            mask-border: var(--flash-window-mask) 36 79 22 40 fill stretch;\n            \n            -webkit-mask-image: var(--flash-window-mask);\n            -webkit-mask-size: 100% 100%;\n            -webkit-mask-repeat: no-repeat;\n            mask-image: var(--flash-window-mask);\n            mask-size: 100% 100%;\n            mask-repeat: no-repeat;\n        }\n\n        .gameWindow.flashWindow.resizable {\n            --flash-window-mask: url('graphics/ui/window1/images/w1_mask_res.png');\n        }\n\n        .gameWindow.flashWindow .windowChrome {\n            position: absolute;\n            inset: 0;\n            pointer-events: none;\n            z-index: 0;\n        }\n\n        .gameWindow.flashWindow .windowChrome::before {\n            content: "";\n            position: absolute;\n            inset: 0;\n\n            \n            border-style: solid;\n            border-color: transparent;\n            border-width: 36px 79px 22px 40px;\n\n            -webkit-border-image: url('${FLASH_W1_BORDER_NONRES}') 36 79 22 40 fill stretch;\n            border-image: url('${FLASH_W1_BORDER_NONRES}') 36 79 22 40 fill stretch;\n        }\n\n        .gameWindow.flashWindow.resizable .windowChrome::before {\n            -webkit-border-image: url('${FLASH_W1_BORDER_RES}') 36 79 22 40 fill stretch;\n            border-image: url('${FLASH_W1_BORDER_RES}') 36 79 22 40 fill stretch;\n        }\n\n        \n        .gameWindow.flashWindow .windowChrome .winCorner,\n        .gameWindow.flashWindow .windowChrome .winEdge {\n            display: none;\n        }\n\n        .gameWindow.flashWindow .windowInterior {\n            position: absolute;\n            inset: 0;\n            display: block;\n            z-index: 1;\n            background: transparent;\n        }\n\n        \n        \n        .gameWindow.flashWindow .gwHeader {\n            position: absolute;\n            left: 0;\n            right: 0;\n            top: 0;\n            z-index: 3;\n            height: var(--header-height, 25px);\n            margin-top: 0;\n            padding: 0 8px 0 5px;\n\n            display: flex;\n            align-items: center;\n            justify-content: flex-start;\n            gap: 8px;\n\n            background: transparent;\n            border-bottom: none;\n            cursor: move;\n            user-select: none;\n        }\n\n        .gameWindow.flashWindow .gwHeaderLeft {\n            display: flex;\n            align-items: center;\n            gap: 2px;\n            min-width: 0;\n            flex: 1 1 auto;\n            padding-right: var(--title-reserve-right, 86px);\n        }\n\n        .gameWindow.flashWindow .gwIcon {\n            width: 24px;\n            height: 24px;\n            flex: 0 0 24px;\n            background-repeat: no-repeat;\n            background-position: center;\n            background-size: contain;\n            cursor: pointer;\n        }\n\n\n        .gameWindow.flashWindow .gwTitle {\n            font-size: 11px;\n            line-height: 14px;\n            font-weight: bold;\n            letter-spacing: 0.2px;\n            color: #e5ca89;\n            text-shadow: 1px 1px 0 #000;\n            white-space: nowrap;\n            overflow: hidden;\n            text-overflow: ellipsis;\n            max-width: 100%;\n            min-width: 0;\n        }\n\n        .gameWindow.flashWindow .gwButtons {\n            position: absolute;\n            right: var(--btn-right, 9px);\n            top: var(--btn-top, 0px);\n            z-index: 4;\n            display: flex;\n            align-items: center;\n            gap: var(--btn-gap, 1px);\n        }\n\n        .gameWindow.flashWindow .gwBtn {\n            opacity: 1;\n            filter: none;\n            background-size: 100% 100%;\n            background-repeat: no-repeat;\n            cursor: pointer;\n        }\n\n        .gameWindow.flashWindow .gwBtn:hover { filter: none; }\n            .gameWindow.flashWindow .gwBtn.zoomInBtn { width: var(--zoomin-w, 10px); height: var(--zoomin-h, 10px); background-image: url('${FLASH_W1_ZOOM_IN}'); }\n        .gameWindow.flashWindow .gwBtn.zoomInBtn:hover,\n        .gameWindow.flashWindow .gwBtn.zoomInBtn:active { background-image: url('${FLASH_W1_ZOOM_IN_HOVER}'); }\n        .gameWindow.flashWindow .gwBtn.zoomOutBtn { width: var(--zoomout-w, 10px); height: var(--zoomout-h, 10px); background-image: url('${FLASH_W1_ZOOM_OUT}'); }\n        .gameWindow.flashWindow .gwBtn.zoomOutBtn:hover,\n        .gameWindow.flashWindow .gwBtn.zoomOutBtn:active { background-image: url('${FLASH_W1_ZOOM_OUT_HOVER}'); }\n        .gameWindow.flashWindow .gwBtn.zoomInBtn.disabled {\n            background-image: url('${FLASH_W1_ZOOM_IN_DISABLED}');\n        }\n        .gameWindow.flashWindow .gwBtn.zoomOutBtn.disabled {\n            background-image: url('${FLASH_W1_ZOOM_OUT_DISABLED}');\n        }\n\n        \n        .gameWindow.flashWindow .gwBtn.closeBtn {\n            width: var(--close-w, 21px);\n            height: var(--close-h, 13px);\n            margin-left: var(--close-margin-left, 1px);\n            background-image: url('${FLASH_W1_BTN_CLOSE}');\n        }\n        .gameWindow.flashWindow .gwBtn.closeBtn:hover,\n        .gameWindow.flashWindow .gwBtn.closeBtn:active {\n            background-image: url('${FLASH_W1_BTN_CLOSE_HOVER}');\n        }\n\n\n        .gameWindow.flashWindow .gwContent {\n            position: absolute;\n            left: 0;\n            top: 0;\n            width: 100%;\n            height: 100%;\n            z-index: 2;\n            padding: 0;\n            background: transparent;\n            overflow: hidden;\n            box-sizing: border-box;\n        }\n\n        .gameWindow.flashWindow .gwContent::before {\n            content: "";\n            position: absolute;\n            inset: 0;\n            background-image: url('${FLASH_W1_BG_TILE}');\n            background-repeat: repeat;\n            opacity: 0.4;\n            pointer-events: none;\n            z-index: 0;\n        }\n\n        \n        .gameWindow.flashWindow .gwContent > * {\n            position: relative;\n            z-index: 1;\n            width: 100%;\n            height: 100%;\n        }\n\n        \n        .gameWindow.flashWindow[data-window-key="map"] {\n            pointer-events: none;\n        }\n        .gameWindow.flashWindow[data-window-key="map"] .windowChrome,\n        .gameWindow.flashWindow[data-window-key="map"] .windowInterior,\n        .gameWindow.flashWindow[data-window-key="map"] .gwContent,\n        .gameWindow.flashWindow[data-window-key="map"] .gwContent::before,\n        .gameWindow.flashWindow[data-window-key="map"] .gwContent > * {\n            pointer-events: none;\n        }\n        .gameWindow.flashWindow[data-window-key="map"] .gwHeader,\n        .gameWindow.flashWindow[data-window-key="map"] .gwHeaderLeft,\n        .gameWindow.flashWindow[data-window-key="map"] .gwTitle,\n        .gameWindow.flashWindow[data-window-key="map"] .gwButtons,\n        .gameWindow.flashWindow[data-window-key="map"] .gwBtn,\n        .gameWindow.flashWindow[data-window-key="map"] .gwIcon {\n            pointer-events: auto;\n        }\n\n        .flashShellFallbackRoot { position: absolute; inset: 0; font-family: Tahoma, Arial, sans-serif; font-size: 11px; line-height: 13px; color: #d7e1ea; }\n        .flashShellFallbackBox { position: absolute; min-width: 40px; min-height: 14px; padding: 1px 3px; border: 1px solid rgba(109,129,149,0.5); background: rgba(13,24,34,0.35); }\n\n        .gameWindow.flashWindow .winResizer {\n            position: absolute;\n            right: 0px;\n            bottom: 0px;\n            width: var(--resizer-w, 20px);\n            height: var(--resizer-h, 20px);\n            cursor: se-resize;\n            z-index: 4;\n            background: transparent;\n            opacity: 0;\n        }\n\n        .gameWindow.flashWindow .winResizer:hover { opacity: 1; }\n\n        \n        .gameWindow.flashWindow .chatResizer { display: none; }\n\n        \n        .gameWindow.flashWindow[data-window-key="chat"] .gwContent {\n            padding: 4px 6px 6px 6px;\n        }\n\n        .doChatFrame {\n            position: relative;\n            width: 100%;\n            height: 100%;\n            display: flex;\n            flex-direction: column;\n            min-height: 0;\n        }\n\n        .doChatTop, .doChatMid, .doChatBottom {\n            display: flex;\n            width: 100%;\n        }\n\n        .doChatTop { height: 28px; flex: 0 0 28px; }\n        .doChatBottom { height: 22px; flex: 0 0 22px; }\n        .doChatMid { flex: 1; min-height: 0; }\n\n        .doChatTopLeft { width: 6px; background: url('../gamechat/as3/skin/darkorbit/upLeft.png') no-repeat; }\n        .doChatTopMid { position: relative; flex: 1; background: url('../gamechat/as3/skin/darkorbit/upMid.png') repeat-x; }\n        .doChatTopRight { width: 13px; background: url('../gamechat/as3/skin/darkorbit/upRight.png') no-repeat; }\n\n        .doChatMidLeft { width: 6px; background: url('../gamechat/as3/skin/darkorbit/midLeft.png') repeat-y; }\n        .doChatMidMid { flex: 1; background: url('../gamechat/as3/skin/darkorbit/midMid.png') repeat; position: relative; min-height: 0; }\n        .doChatMidRight { width: 13px; background: url('../gamechat/as3/skin/darkorbit/midRight.png') repeat-y; }\n\n        .doChatBottomLeft { width: 6px; background: url('../gamechat/as3/skin/darkorbit/downLeft.png') no-repeat; }\n        .doChatBottomMid { position: relative; flex: 1; background: url('../gamechat/as3/skin/darkorbit/downMid.png') repeat-x; }\n        .doChatBottomRight { width: 13px; background: url('../gamechat/as3/skin/darkorbit/downRight.png') no-repeat; }\n\n        .doChatTabsWrap {\n            position: absolute;\n            left: 20px;\n            width: calc(100% - 60px);\n            bottom: 9px;\n            height: 11px;\n            overflow: hidden;\n        }\n\n        .doChatTabs {\n            position: absolute;\n            left: 0;\n            top: 0;\n            display: flex;\n            gap: 2px;\n            align-items: flex-end;\n            height: 11px;\n            transform: translateX(var(--chat-tabs-offset, -2px));\n            will-change: transform;\n        }\n\n        .doChatTabBtn {\n            position: absolute;\n            top: 8px;\n            width: 11px;\n            height: 11px;\n            border: none;\n            padding: 0;\n            margin: 0;\n            cursor: pointer;\n            background-color: transparent;\n            background-repeat: no-repeat;\n        }\n\n        .doChatTabBtnLeft {\n            left: 6px;\n            background-image: url('../gamechat/as3/skin/darkorbit/btn_left_normal.png');\n        }\n\n        .doChatTabBtnLeft:hover {\n            background-image: url('../gamechat/as3/skin/darkorbit/btn_left_over.png');\n        }\n\n        .doChatTabBtnRight {\n            right: 9px;\n            background-image: url('../gamechat/as3/skin/darkorbit/btn_right_normal.png');\n        }\n\n        .doChatTabBtnRight:hover {\n            background-image: url('../gamechat/as3/skin/darkorbit/btn_right_over.png');\n        }\n\n        .doChatTabBtn[disabled] {\n            visibility: hidden;\n            pointer-events: none;\n        }\n\n        .doChatTabs .chatTab {\n            height: 11px;\n            width: 86px;\n            min-width: 86px;\n            max-width: 86px;\n            padding: 0;\n            display: inline-flex;\n            align-items: center;\n            justify-content: center;\n            font-family: Tahoma, Arial, sans-serif;\n            font-size: 10px;\n            font-weight: bold;\n            line-height: 10px;\n            cursor: pointer;\n            user-select: none;\n            color: #bec8dc;\n            background: url('../gamechat/as3/skin/darkorbit/tab.png') no-repeat;\n            opacity: 1;\n        }\n\n        .doChatTabs .chatTab.chatTabOver {\n            color: #6b95ef;\n        }\n\n        .doChatTabs .chatTab.chatTabSelected {\n            color: #dae6ff;\n        }\n\n        .doChatTabs .chatTab.chatTabDisabled {\n            color: #7f8794;\n            pointer-events: none;\n        }\n\n        .doChatOverlay {\n            position: absolute;\n            inset: 0;\n            pointer-events: none;\n        }\n\n        .doChatContent {\n            position: absolute;\n            left: 6px;\n            top: 27px;\n            right: 69px;\n            bottom: 53px;\n            overflow-y: auto;\n            overflow-x: hidden;\n            padding: 0;\n            font-family: Tahoma, Arial, sans-serif;\n            font-size: 11px;\n            line-height: 13px;\n            box-sizing: border-box;\n            pointer-events: auto;\n            scrollbar-width: none;\n            -ms-overflow-style: none;\n        }\n\n        .doChatContent::-webkit-scrollbar {\n            width: 0;\n            height: 0;\n        }\n\n        .doChatInput {\n            position: absolute;\n            left: 8px;\n            right: 72px;\n            bottom: 2px;\n            top: auto;\n            height: 18px;\n            font-family: Tahoma, Arial, sans-serif;\n            font-size: 10px;\n            line-height: 18px;\n            color: #ffffff;\n            background: transparent;\n            border: none;\n            outline: none;\n            padding: 0 3px;\n            box-sizing: border-box;\n            pointer-events: auto;\n        }\n\n        .doChatScrollTrack {\n            position: absolute;\n            right: 8px;\n            top: 35px;\n            bottom: 35px;\n            width: 12px;\n            background: #8a8e94;\n            pointer-events: none;\n        }\n\n        .doChatScrollThumb {\n            position: absolute;\n            right: 8px;\n            top: 35px;\n            width: 12px;\n            height: 28px;\n            background: url('../gamechat/as3/skin/darkorbit/holder.png') no-repeat;\n            pointer-events: auto;\n            cursor: pointer;\n        }\n\n        #flashConnectionModalLayer {\n            position: absolute;\n            inset: 0;\n            display: none;\n            pointer-events: none;\n            z-index: 14000;\n        }\n\n        #flashConnectionModalLayer.active {\n            display: block;\n            pointer-events: auto;\n        }\n\n        #flashConnectionModalLayer .flashConnectionModalBlocker {\n            position: absolute;\n            inset: 0;\n            background: transparent;\n            pointer-events: auto;\n        }\n\n        .gameWindow.flashWindow.flashConnectionUiWindow {\n            display: none;\n            pointer-events: auto;\n        }\n\n        .gameWindow.flashWindow.flashConnectionUiWindow .gwHeader {\n            cursor: move;\n            user-select: none;\n        }\n\n        .gameWindow.flashWindow.flashConnectionUiWindow .gwHeaderLeft {\n            pointer-events: none;\n        }\n\n        .gameWindow.flashWindow.flashConnectionUiWindow .gwIcon {\n            opacity: 1;\n            background-image: url('graphics/ui/window1/images/info_icon.png');\n        }\n\n        .gameWindow.flashWindow.flashConnectionUiWindow .gwTitle {\n            font-family: "EurostileHeaFl", "Eurostile Hea", "Eurostile", "Eurostile LT Std", "Square 721 BT", "Microgramma D Extended", Tahoma, Arial, sans-serif;\n            font-size: 14px;\n            font-weight: 600;\n            letter-spacing: 0;\n        }\n\n        .gameWindow.flashWindow.flashConnectionUiWindow .gwContent {\n            overflow: hidden;\n        }\n\n        .gameWindow.flashWindow.flashConnectionUiWindow .gwContent > * {\n            width: auto;\n            height: auto;\n        }\n\n        .gameWindow.flashWindow.flashConnectionUiWindow .gwButtons,\n        .gameWindow.flashWindow.flashConnectionUiWindow .winResizer,\n        .gameWindow.flashWindow.flashConnectionUiWindow .chatResizer {\n            display: none !important;\n        }\n\n        .gameWindow.flashWindow.flashConnectionUiWindow .flashConnectionSprite {\n            position: absolute;\n            background-repeat: no-repeat;\n            background-position: 0 0;\n            pointer-events: none;\n        }\n\n        .gameWindow.flashWindow.flashConnectionUiWindow .flashConnectionText,\n        .gameWindow.flashWindow.flashConnectionUiWindow .flashConnectionLostBody {\n            position: absolute;\n            font-family: "EurostileHeaFl", "Eurostile Hea", "Eurostile", "Eurostile LT Std", "Square 721 BT", "Microgramma D Extended", Tahoma, Arial, sans-serif;\n            font-size: 14px;\n            line-height: 15px;\n            font-weight: 600;\n            color: #ffffff;\n            text-shadow: 0 1px 0 rgba(0,0,0,0.88);\n            white-space: pre-line;\n            pointer-events: none;\n        }\n\n        .gameWindow.flashWindow[data-window-key="connection"] .flashConnectionSprite {\n            left: 24px;\n            top: 20px;\n            width: 261px;\n            height: 154px;\n            background-image: url('graphics/ui/ui/sprites/DefineSprite_340_connectionWindow/1.png');\n        }\n\n        .gameWindow.flashWindow[data-window-key="connection"] .flashConnectionInfoTop {\n            left: 165px;\n            top: 46px;\n            width: 114px;\n        }\n\n        .gameWindow.flashWindow[data-window-key="connection"] .flashConnectionInfoBottom {\n            left: 167px;\n            top: 123px;\n            width: 114px;\n        }\n\n        .gameWindow.flashWindow[data-window-key="connection"] .flashConnectionProgress {\n            position: absolute;\n            left: 154px;\n            top: 119px;\n            width: 126px;\n            height: 13px;\n            pointer-events: none;\n        }\n\n        .gameWindow.flashWindow[data-window-key="connection"] .flashConnectionProgressSegment {\n            position: absolute;\n            top: 1px;\n            height: 11px;\n            background: transparent;\n        }\n\n        .gameWindow.flashWindow[data-window-key="connection"] .flashConnectionProgressSegment.on {\n            background: linear-gradient(180deg, #85ffb5 0%, #2fff7c 35%, #0fcb56 100%);\n            box-shadow: inset 0 1px 0 rgba(255,255,255,0.55), 0 0 3px rgba(47,255,124,0.35);\n        }\n\n        .gameWindow.flashWindow.flashConnectionUiWindow .flashConnectionActionButton {\n            position: absolute;\n            min-width: 0;\n            width: auto;\n            height: 21px;\n            margin: 0;\n            padding: 0 4px 1px;\n            border: none;\n            outline: none;\n            appearance: none;\n            -webkit-appearance: none;\n            box-sizing: border-box;\n            border-radius: 0;\n            background: url('graphics/ui/ui/sprites/DefineSprite_518_button1/1.png') no-repeat 0 0 / 100% 100%;\n            background-color: transparent;\n            color: #f1f1f1;\n            font-family: "EurostileFl", "Eurostile", "Eurostile LT Std", "Square 721 BT", "Microgramma D Extended", Tahoma, Arial, sans-serif;\n            font-size: 12px;\n            font-weight: 400;\n            line-height: 20px;\n            text-align: center;\n            text-shadow: 0 1px 0 rgba(0,0,0,0.92);\n            white-space: nowrap;\n            cursor: pointer;\n        }\n\n        .gameWindow.flashWindow.flashConnectionUiWindow .flashConnectionActionButton:hover {\n            filter: brightness(1.08);\n        }\n\n        .gameWindow.flashWindow.flashConnectionUiWindow .flashConnectionActionButton:active {\n            transform: translateY(1px);\n            filter: brightness(0.96);\n        }\n\n        .gameWindow.flashWindow[data-window-key="connection"] .flashConnectionCancelBtn {\n            top: 184px;\n        }\n\n        .gameWindow.flashWindow[data-window-key="connectionLost"] .flashConnectionSprite {\n            left: 15px;\n            top: 30px;\n            width: 255px;\n            height: 133px;\n            background-image: url('graphics/ui/ui/sprites/DefineSprite_345_connectionLostWindow/1.png');\n        }\n\n        .gameWindow.flashWindow[data-window-key="connectionLost"] .flashConnectionLostBody {\n            left: 140px;\n            top: 44px;\n            width: 164px;\n        }\n\n        .gameWindow.flashWindow[data-window-key="connectionLost"] .flashConnectionReconnectBtn,\n        .gameWindow.flashWindow[data-window-key="connectionLost"] .flashConnectionLogoutBtn {\n            top: 168px;\n        }\n\n\n\n
        #content_refinement .refSafeStatusCard {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            justify-content: flex-start;
            gap: 10px;
            min-height: 0;
            height: 188px;
        }
        #content_refinement .refSafeStatusIcon {
            flex: 0 0 auto;
            width: 78px;
            height: 78px;
            margin: 0 auto;
            align-self: center;
        }
        #content_refinement .refSafeStatusMeta {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            column-gap: 12px;
            row-gap: 4px;
            width: 100%;
            margin-top: 0;
            align-items: center;
        }
        #content_refinement .refSafeStatLine {
            display: contents;
        }
        #content_refinement .refSafeStatLabel {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            min-width: 0;
            font-size: 10px;
            line-height: 12px;
        }
        #content_refinement .refSafeStatValue {
            justify-self: end;
            text-align: right;
            font-size: 10px;
            line-height: 12px;
            white-space: nowrap;
            min-width: 46px;
            font-variant-numeric: tabular-nums;
            font-feature-settings: "tnum" 1;
        }
        #content_refinement .refSafeActionPanel {
            min-height: 0;
            height: 188px;
        }
        #content_refinement .refSafeActionInfo {
            margin-bottom: 10px;
        }
        #content_refinement .refSafeLevels {
            top: 344px;
            gap: 8px;
        }
        #content_refinement .refSafeLevelCard {
            min-height: 134px;
            transition: opacity 120ms ease, filter 120ms ease, box-shadow 120ms ease;
        }
        #content_refinement .refSafeLevelCard.is-completed {
            opacity: 0.58;
            filter: grayscale(0.85) saturate(0.55);
        }
        #content_refinement .refSafeLevelCard.is-completed .refSafeLevelStatus {
            color: #9ea9b6;
        }
        #content_refinement .refSafeLevelCard.is-max {
            opacity: 1;
            filter: none;
            box-shadow: inset 0 0 0 1px rgba(229, 193, 92, 0.45);
        }
        #content_refinement .refSafeLevelCard.is-max .refSafeLevelStatus {
            color: #f1cf73;
        }
        #content_refinement .refSafeLevelCard.is-next .refSafeLevelStatus {
            color: #f1cf73;
        }
        #content_refinement .refSafeLevelCard.is-locked .refSafeLevelStatus {
            color: #9ea9b6;
        }
        #content_refinement .refSafeLevelMeta {
            min-height: 44px;
        }
        #content_refinement .refSafeDisabledNote {
            bottom: 16px;
        }
    `;
    document.head.appendChild(style);
    
if (!document.getElementById("flashSpacemapStyle")) {
    const spacemapStyle = document.createElement("style");
    spacemapStyle.id = "flashSpacemapStyle";
    spacemapStyle.textContent = `
        .gameWindow.flashWindow[data-window-key="spacemap"] .windowInterior {
            overflow: hidden;
        }
        .gameWindow.flashWindow[data-window-key="spacemap"] .gwHeader {
            position: relative;
            z-index: 5;
        }
        .gameWindow.flashWindow[data-window-key="spacemap"] .gwContent {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            padding: 4px 6px 6px;
            overflow: hidden;
            background: ${UI_SPRITES.windowFooter ? `url('${UI_SPRITES.windowFooter}')` : "rgba(0,0,0,0.25)"};
            background-size: 100% 100%;
            box-sizing: border-box;
            z-index: 1;
        }
        .gameWindow.flashWindow[data-window-key="spacemap"] .gwContent::before {
            display: none;
        }
        .gameWindow.flashWindow[data-window-key="spacemap"] .gwTitle {
            letter-spacing: 0.2px;
        }
        .flashSpacemapRoot {
            position: relative;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            gap: 4px;
            background: transparent;
            overflow: hidden;
            user-select: none;
            font-family: Tahoma, Arial, sans-serif;
            color: #fff;
        }
        .flashSpacemapRoot,
        .flashSpacemapRoot * {
            box-sizing: border-box;
        }
        .flashSpacemapSwitch {
            margin: 0 0 0 4px;
            padding: 0;
            border: none;
            outline: none;
            appearance: none;
            -webkit-appearance: none;
            background: transparent;
            color: #fff;
            font-family: "EurostileHeaFl", "Eurostile Hea", "Eurostile", "Eurostile LT Std", Tahoma, Arial, sans-serif;
            font-size: 12px;
            line-height: 18px;
            text-align: left;
            text-shadow: 0 1px 0 rgba(0,0,0,0.95);
            cursor: pointer;
            align-self: flex-start;
        }
        .flashSpacemapSwitch:hover {
            filter: brightness(1.08);
        }
        .flashSpacemapCanvas {
            position: relative;
            width: 592px;
            height: 428px;
            align-self: center;
            background: transparent;
            overflow: hidden;
        }
        .flashSpacemapPage {
            position: absolute;
            inset: 0;
            display: none;
        }
        .flashSpacemapPage.is-active {
            display: block;
        }
        .flashSpacemapEdgeLayer {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            overflow: visible;
            pointer-events: none;
            z-index: 1;
        }
        .flashSpacemapEdgePath {
            fill: none;
            stroke: rgba(224, 224, 224, 0.72);
            stroke-width: 1.25;
            stroke-linecap: square;
            stroke-linejoin: miter;
            filter: drop-shadow(0 0 1px rgba(0,0,0,0.85));
        }
        .flashSpacemapMapNode {
            position: absolute;
            margin: 0;
            padding: 0;
            border: none;
            outline: none;
            background: transparent;
            cursor: default;
            user-select: none;
            z-index: 2;
        }
        .flashSpacemapMapArt {
            position: absolute;
            inset: 0;
            background-repeat: no-repeat;
            background-position: 0 0;
            background-size: 100% 100%;
            image-rendering: auto;
            pointer-events: none;
        }
        .flashSpacemapMapNode:hover .flashSpacemapMapArt {
            filter: brightness(1.06);
        }
        .flashSpacemapMapMarkerCurrent {
            position: absolute;
            left: 50%;
            top: 50%;
            width: 48px;
            height: 48px;
            transform: translate(-50%, -50%);
            background-image: ${typeof getUiCssUrl === "function" ? getUiCssUrl("graphics/ui/spacemap/images/marker_currentMap.png") : "url('graphics/ui/spacemap/images/marker_currentMap.png')"};
            background-repeat: no-repeat;
            background-position: center center;
            background-size: contain;
            pointer-events: none;
            display: none;
        }
        .flashSpacemapMapNode.is-current .flashSpacemapMapMarkerCurrent {
            display: block;
        }
    `;
    document.head.appendChild(spacemapStyle);
}
    const dock = document.createElement("div");
    dock.id = "mainMenuContainer";
    window.appendToHud ? window.appendToHud(dock) : document.body.appendChild(dock);
    dock.style.position = "absolute";
    const parsedSlotsCfg = typeof getFlashMinimizedIconSlots === "function" ? getFlashMinimizedIconSlots() : null;
    const fallbackSlotsCfg = {
        left: 25,
        top: 200,
        slots: [ {
            x: 0,
            y: 0
        }, {
            x: 0,
            y: 45
        }, {
            x: 0,
            y: 90
        }, {
            x: 0,
            y: 135
        }, {
            x: 0,
            y: 180
        }, {
            x: 0,
            y: 225
        } ]
    };
    __flashMinSlotsCfg = parsedSlotsCfg || fallbackSlotsCfg;
    dock.style.left = __flashMinSlotsCfg.left + "px";
    dock.style.top = __flashMinSlotsCfg.top + "px";
}

const WINDOWS_CONFIG = {
    user: {
        title: "User",
        w: 200,
        h: 92,
        icon: "U"
    },
    ship: {
        title: "Ship",
        w: 200,
        h: 80,
        icon: "S"
    },
    log: {
        title: "Log",
        w: 240,
        h: 150,
        icon: "L"
    },
    chat: {
        title: "Chat",
        w: 300,
        h: 150,
        icon: "@"
    },
    group: {
        title: "Versus System",
        w: 330,
        h: 200,
        icon: "G"
    },
    quest: {
        title: "Quests",
        w: 560,
        h: 430,
        icon: "Q"
    },
    booster: {
        title: "Boosters",
        w: 110,
        h: 150,
        icon: "B"
    },
    spaceball: {
        title: "Spaceball",
        w: 170,
        h: 70,
        icon: "SB"
    },
    map: {
        title: "Mini map",
        icon: "M"
    },
    spacemap: {
        title: "Spacemap",
        icon: "SM"
    },
    settings: {
        title: "Settings",
        w: 400,
        h: 464,
        icon: "ST"
    },
    trade: {
        title: "Trade",
        w: 565,
        h: 210,
        icon: "TR"
    },
    logout: {
        title: "Logout",
        w: 200,
        h: 200,
        icon: "LO"
    },
    refinement: {
        title: "Refinement",
        w: 455,
        h: 525,
        icon: "RF"
    }
};

const FLASH_WINDOW_OFFSET_PROFILES = {
    windowContainer1: {
        confidence: {
            close: .62,
            zoomIn: .62,
            zoomOut: .62,
            resizer: .72,
            title: .55
        },
        header: {
            height: 25,
            buttonsRight: 9,
            buttonsTop: 7,
            buttonsGap: 12,
            titleReserveRight: 86
        },
        close: {
            w: 21,
            h: 13,
            marginLeft: 1
        },
        zoomIn: {
            w: 10,
            h: 10
        },
        zoomOut: {
            w: 10,
            h: 10
        },
        resizer: {
            right: 8,
            bottom: 6,
            w: 20,
            h: 20
        }
    },
    windowContainer2: {
        confidence: {
            close: .62,
            zoomIn: .62,
            zoomOut: .62,
            resizer: .72,
            title: .55
        },
        header: {
            height: 25,
            buttonsRight: 9,
            buttonsTop: 7,
            buttonsGap: 12,
            titleReserveRight: 86
        },
        close: {
            w: 21,
            h: 13,
            marginLeft: 1
        },
        zoomIn: {
            w: 10,
            h: 10
        },
        zoomOut: {
            w: 10,
            h: 10
        },
        resizer: {
            right: 8,
            bottom: 6,
            w: 20,
            h: 20
        }
    },
    windowContainer3: {
        confidence: {
            close: .62,
            zoomIn: .62,
            zoomOut: .62,
            resizer: .72,
            title: .55
        },
        header: {
            height: 25,
            buttonsRight: 9,
            buttonsTop: 7,
            buttonsGap: 12,
            titleReserveRight: 86
        },
        close: {
            w: 21,
            h: 13,
            marginLeft: 1
        },
        zoomIn: {
            w: 10,
            h: 10
        },
        zoomOut: {
            w: 10,
            h: 10
        },
        resizer: {
            right: 8,
            bottom: 6,
            w: 20,
            h: 20
        }
    },
    windowContainer5: {
        confidence: {
            close: .62,
            zoomIn: .62,
            zoomOut: .62,
            resizer: .72,
            title: .55
        },
        header: {
            height: 25,
            buttonsRight: 9,
            buttonsTop: 7,
            buttonsGap: 12,
            titleReserveRight: 86
        },
        close: {
            w: 21,
            h: 13,
            marginLeft: 1
        },
        zoomIn: {
            w: 10,
            h: 10
        },
        zoomOut: {
            w: 10,
            h: 10
        },
        resizer: {
            right: 8,
            bottom: 6,
            w: 20,
            h: 20
        }
    }
};

function resolveWindowContainerSymbol(runtimeCfg) {
    if (runtimeCfg && runtimeCfg.zoomable && !runtimeCfg.resizable) return "windowContainer5";
    if (runtimeCfg && runtimeCfg.closeable && !runtimeCfg.resizable) return "windowContainer3";
    if (runtimeCfg && runtimeCfg.resizable) return "windowContainer2";
    return "windowContainer1";
}

function resolveWindowOffsetProfile(runtimeCfg) {
    const symbol = resolveWindowContainerSymbol(runtimeCfg);
    const profile = FLASH_WINDOW_OFFSET_PROFILES[symbol] || FLASH_WINDOW_OFFSET_PROFILES.windowContainer1;
    return {
        symbol: symbol,
        profile: profile
    };
}

const FLASH_WINDOW_ID_BY_KEY = {
    user: 0,
    ship: 1,
    map: 3,
    settings: 4,
    log: 5,
    trade: 6,
    logout: 7,
    connection: 8,
    quest: 10,
    connectionLost: 12,
    spacemap: 13,
    booster: 15,
    spaceball: 16,
    chat: 20,
    group: 23,
    refinement: 24
};

const FLASH_WINDOW_KEY_BY_ID = Object.fromEntries(Object.entries(FLASH_WINDOW_ID_BY_KEY).map(([k, v]) => [ String(v), k ]));

const FLASH_WINDOW_PERSISTENCE_STORAGE_KEY = "andromeda_flash_window_persistence_v1";

let __flashPersistedWindowSettingsByKey = {};

let __flashDisplayChatEnabled = true;

let __flashMainMenuPosition = null;

function getFlashCurrentResolutionId() {
    const cfg = window.ANDROMEDA_CONFIG || {};
    const raw = cfg.resolutionID != null ? cfg.resolutionID : cfg.resolutionId != null ? cfg.resolutionId : 0;
    return String(raw);
}

function readFlashWindowPersistenceStore() {
    try {
        const raw = localStorage.getItem(FLASH_WINDOW_PERSISTENCE_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
        return {};
    }
}

function writeFlashWindowPersistenceStore(store) {
    try {
        localStorage.setItem(FLASH_WINDOW_PERSISTENCE_STORAGE_KEY, JSON.stringify(store || {}));
    } catch (_) {}
}

function normalizeFlashWindowPersistenceEntry(key, entry) {
    if (!key || !entry || typeof entry !== "object") return null;
    const left = parseInt(entry.left ?? entry.x, 10);
    const top = parseInt(entry.top ?? entry.y, 10);
    const openRaw = entry.open;
    const open = typeof openRaw === "boolean" ? openRaw : parseInt(openRaw, 10) !== 0;
    if (!(Number.isFinite(left) && Number.isFinite(top))) return null;
    return {
        left: left,
        top: top,
        open: !!open
    };
}

function getFlashPersistedWindowSetting(key) {
    if (!key) return null;
    return normalizeFlashWindowPersistenceEntry(key, __flashPersistedWindowSettingsByKey[key]);
}

function hasFlashPersistedWindowSetting(key) {
    return !!getFlashPersistedWindowSetting(key);
}

function persistFlashWindowPersistenceFallback() {
    const store = readFlashWindowPersistenceStore();
    store.resolution = getFlashCurrentResolutionId();
    store.windowSettings = __flashPersistedWindowSettingsByKey;
    store.displayChat = __flashDisplayChatEnabled ? 1 : 0;
    store.mainMenuPosition = __flashMainMenuPosition;
    writeFlashWindowPersistenceStore(store);
}

function loadFlashWindowPersistenceFallback() {
    const store = readFlashWindowPersistenceStore();
    if (!store || String(store.resolution ?? getFlashCurrentResolutionId()) !== getFlashCurrentResolutionId()) {
        return;
    }
    const nextWindowSettings = {};
    const rawWindowSettings = store.windowSettings;
    if (rawWindowSettings && typeof rawWindowSettings === "object") {
        for (const [key, value] of Object.entries(rawWindowSettings)) {
            const normalized = normalizeFlashWindowPersistenceEntry(key, value);
            if (normalized) nextWindowSettings[key] = normalized;
        }
    }
    __flashPersistedWindowSettingsByKey = nextWindowSettings;
    if (store.mainMenuPosition && typeof store.mainMenuPosition === "object") {
        const left = parseInt(store.mainMenuPosition.left ?? store.mainMenuPosition.x, 10);
        const top = parseInt(store.mainMenuPosition.top ?? store.mainMenuPosition.y, 10);
        if (Number.isFinite(left) && Number.isFinite(top)) {
            __flashMainMenuPosition = {
                left: left,
                top: top
            };
        }
    }
    if (store.displayChat !== undefined) {
        __flashDisplayChatEnabled = parseInt(store.displayChat, 10) !== 0;
    }
}

function parseFlashWindowSettingsPayload(value) {
    const parts = String(value == null ? "" : value).split(",");
    const entries = {};
    for (let i = 0; i + 3 < parts.length; i += 4) {
        const rawId = String(parts[i] || "").trim();
        if (!rawId) continue;
        const key = FLASH_WINDOW_KEY_BY_ID[rawId];
        if (!key) continue;
        const left = parseInt(parts[i + 1], 10);
        const top = parseInt(parts[i + 2], 10);
        const open = parseInt(parts[i + 3], 10) !== 0;
        if (!(Number.isFinite(left) && Number.isFinite(top))) continue;
        entries[key] = {
            left: left,
            top: top,
            open: open
        };
    }
    return entries;
}

function applyFlashMainMenuPositionToRuntime(dock) {
    // Flash MAINMENU_POSITION does not control the minimized-icon dock.
    // In the current HTML5 client, mainMenuContainer is that dock, so applying
    // MAINMENU_POSITION here causes a regression by moving the left column of
    // minimized windows. Keep the value persisted for protocol parity, but do
    // not apply it to runtime until there is a dedicated HTML5 equivalent of
    // the draggable Flash MainMenu.
    void dock;
    return;
}

function applyFlashWindowSettingEntryToRuntime(key, entry) {
    const normalized = normalizeFlashWindowPersistenceEntry(key, entry);
    if (!normalized) return;
    const refs = typeof getFlashWindowShellRefs === "function" ? getFlashWindowShellRefs(key) : null;
    const winEl = refs && refs.win ? refs.win : document.getElementById("win_" + key);
    if (winEl) {
        winEl.style.transform = "none";
        winEl.style.left = normalized.left + "px";
        winEl.style.top = normalized.top + "px";
    }
    if (typeof windowStates === "object" && windowStates) {
        windowStates[key] = normalized.open;
    }
    if (key === "map") {
        window.showMinimap = normalized.open;
    }
}

function applyFlashPersistedWindowSettingsToRuntime() {
    for (const [key, entry] of Object.entries(__flashPersistedWindowSettingsByKey)) {
        applyFlashWindowSettingEntryToRuntime(key, entry);
    }
    if (typeof refreshWindowsVisibility === "function") {
        refreshWindowsVisibility();
    }
}

function applyFlashWindowSettingsSettingValue(settingKey, value, options) {
    const opts = options || {};
    const keyText = String(settingKey || "");
    const resolutionPart = keyText.includes(",") ? keyText.split(",", 2)[1] : "";
    if (resolutionPart && resolutionPart !== getFlashCurrentResolutionId()) {
        return;
    }
    __flashPersistedWindowSettingsByKey = parseFlashWindowSettingsPayload(value);
    persistFlashWindowPersistenceFallback();
    if (!opts.skipRuntimeApply) {
        applyFlashPersistedWindowSettingsToRuntime();
    }
}

function resolveCurrentWindowTopLeft(winEl, key) {
    if (winEl) {
        const left = parseInt(winEl.style.left || "", 10);
        const top = parseInt(winEl.style.top || "", 10);
        if (Number.isFinite(left) && Number.isFinite(top)) {
            return {
                left: left,
                top: top
            };
        }
        const hudPos = window.getHudElementPos ? window.getHudElementPos(winEl) : null;
        if (hudPos && Number.isFinite(hudPos.x) && Number.isFinite(hudPos.y)) {
            return {
                left: Math.round(hudPos.x),
                top: Math.round(hudPos.y)
            };
        }
    }
    const persisted = getFlashPersistedWindowSetting(key);
    if (persisted) {
        return {
            left: persisted.left,
            top: persisted.top
        };
    }
    const defaultPos = getFlashWindowDefaultPos(key);
    return {
        left: defaultPos.left,
        top: defaultPos.top
    };
}

function buildCurrentFlashWindowSettingsEntries() {
    const entries = {};
    for (const [key, id] of Object.entries(FLASH_WINDOW_ID_BY_KEY)) {
        const meta = getFlashWindowMeta(key);
        if (!meta || !meta.saveSettings) continue;
        const refs = typeof getFlashWindowShellRefs === "function" ? getFlashWindowShellRefs(key) : null;
        const winEl = refs && refs.win ? refs.win : document.getElementById("win_" + key);
        const pos = resolveCurrentWindowTopLeft(winEl, key);
        entries[key] = {
            left: pos.left,
            top: pos.top,
            open: !!windowStates[key]
        };
    }
    return entries;
}

function serializeCurrentFlashWindowSettingsValue() {
    const entries = buildCurrentFlashWindowSettingsEntries();
    const chunks = [];
    for (const [key, id] of Object.entries(FLASH_WINDOW_ID_BY_KEY)) {
        const meta = getFlashWindowMeta(key);
        if (!meta || !meta.saveSettings) continue;
        const entry = normalizeFlashWindowPersistenceEntry(key, entries[key]);
        if (!entry) continue;
        chunks.push(String(id), String(entry.left), String(entry.top), entry.open ? "1" : "0");
    }
    return chunks.join(",");
}

function persistCurrentFlashWindowSettingsLocally() {
    __flashPersistedWindowSettingsByKey = buildCurrentFlashWindowSettingsEntries();
    persistFlashWindowPersistenceFallback();
}

function sendCurrentFlashWindowSettingsToServer() {
    if (typeof sendSetting !== "function") return;
    const payload = serializeCurrentFlashWindowSettingsValue();
    if (!payload) return;
    sendSetting(`WINDOW_SETTINGS,${getFlashCurrentResolutionId()}`, payload);
}

function applyFlashMainMenuPositionSettingValue(value, options) {
    const parts = String(value == null ? "" : value).split(",");
    const left = parseInt(parts[0], 10);
    const top = parseInt(parts[1], 10);
    if (!(Number.isFinite(left) && Number.isFinite(top))) return;
    __flashMainMenuPosition = {
        left: left,
        top: top
    };
    persistFlashWindowPersistenceFallback();
    if (!(options && options.skipRuntimeApply)) {
        applyFlashMainMenuPositionToRuntime();
    }
}

function applyFlashDisplayChatSettingValue(value, options) {
    __flashDisplayChatEnabled = parseInt(value, 10) !== 0;
    persistFlashWindowPersistenceFallback();
    if (!(options && options.skipRuntimeApply) && typeof refreshWindowsVisibility === "function") {
        refreshWindowsVisibility();
    }
}

function isFlashChatDisplayEnabled() {
    return __flashDisplayChatEnabled !== false;
}

window.flashLoadWindowPersistenceFromLocalStorage = loadFlashWindowPersistenceFallback;
window.flashApplyWindowSettingsSettingValue = applyFlashWindowSettingsSettingValue;
window.flashApplyMainMenuPositionSettingValue = applyFlashMainMenuPositionSettingValue;
window.flashApplyDisplayChatSettingValue = applyFlashDisplayChatSettingValue;
window.flashPersistCurrentWindowSettingsLocally = persistCurrentFlashWindowSettingsLocally;
window.flashSerializeCurrentWindowSettingsValue = serializeCurrentFlashWindowSettingsValue;
window.flashSendCurrentWindowSettingsToServer = sendCurrentFlashWindowSettingsToServer;

function _flashParseBool(value, defaultValue) {
    if (value === null || value === undefined || value === "") return !!defaultValue;
    return String(value).toLowerCase() === "true";
}

function _flashParseInt(value, defaultValue) {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : defaultValue;
}

function _getFlashGameXmlDoc() {
    return window._gameXmlDoc || null;
}

function _getDirectChild(parent, tagNameLower) {
    if (!parent) return null;
    const kids = parent.children ? Array.from(parent.children) : [];
    for (const k of kids) {
        if (k && k.tagName && k.tagName.toLowerCase() === tagNameLower) return k;
    }
    return null;
}

function _getRootWindowsNode(xmlDoc) {
    if (!xmlDoc || !xmlDoc.documentElement) return null;
    const direct = _getDirectChild(xmlDoc.documentElement, "windows");
    if (direct) return direct;
    const list = xmlDoc.getElementsByTagName("windows");
    return list && list.length ? list[0] : null;
}

function _getFlashWindowDefById(windowId) {
    const xmlDoc = _getFlashGameXmlDoc();
    const windowsNode = _getRootWindowsNode(xmlDoc);
    if (!windowsNode) return null;
    const nodes = windowsNode.getElementsByTagName("window");
    for (const node of Array.from(nodes)) {
        if (String(node.getAttribute("id")) === String(windowId)) {
            return node;
        }
    }
    return null;
}

function getFlashWindowMeta(key) {
    let id = FLASH_WINDOW_ID_BY_KEY[key];
    if (id === undefined) {
        const m = /^win(\d+)$/i.exec(String(key || ""));
        if (m) id = parseInt(m[1], 10);
    }
    if (id === undefined || !Number.isFinite(id)) return null;
    const node = _getFlashWindowDefById(id);
    if (!node) return null;
    return {
        id: id,
        titleKey: node.getAttribute("titleKey") || "",
        icon: node.getAttribute("icon") || "",
        resizable: _flashParseBool(node.getAttribute("resizable"), false),
        closeable: _flashParseBool(node.getAttribute("closeable"), false),
        zoomable: _flashParseBool(node.getAttribute("zoomable"), false),
        transparency: _flashParseBool(node.getAttribute("transparency"), false),
        startMinimized: _flashParseBool(node.getAttribute("startMinimized"), false),
        maximizeOnClick: _flashParseBool(node.getAttribute("maximizeOnClick"), true),
        minimizeOnClick: _flashParseBool(node.getAttribute("minimizeOnClick"), true),
        hudToggle: _flashParseBool(node.getAttribute("hudToggle"), false),
        saveSettings: _flashParseBool(node.getAttribute("saveSettings"), false),
        slotType: node.getAttribute("slotType") || "",
        bgNormalIcon: node.getAttribute("bgNormalIcon") || "comb02_std.png",
        bgHoverIcon: node.getAttribute("bgHoverIcon") || "comb02_hover.png",
        width0: _flashParseInt(node.getAttribute("width_0"), null),
        height0: _flashParseInt(node.getAttribute("height_0"), null),
        width1: _flashParseInt(node.getAttribute("width_1"), null),
        height1: _flashParseInt(node.getAttribute("height_1"), null)
    };
}

function getFlashWindowRuntimeConfig(key, fallbackCfg) {
    const cfg = Object.assign({}, fallbackCfg || {});
    const meta = getFlashWindowMeta(key);
    if (!meta) return cfg;
    if (meta.width0 != null) cfg.w = meta.width0;
    if (meta.height0 != null) cfg.h = meta.height0;
    cfg.resizable = !!meta.resizable;
    cfg.closeable = !!meta.closeable;
    cfg.zoomable = !!meta.zoomable;
    cfg.transparency = !!meta.transparency;
    cfg.startMinimized = !!meta.startMinimized;
    cfg.maximizeOnClick = meta.maximizeOnClick !== undefined ? !!meta.maximizeOnClick : true;
    cfg.minimizeOnClick = meta.minimizeOnClick !== undefined ? !!meta.minimizeOnClick : true;
    cfg.hudToggle = !!meta.hudToggle;
    cfg.slotType = meta.slotType || cfg.slotType || "";
    cfg.bgNormalIcon = meta.bgNormalIcon || cfg.bgNormalIcon || "comb02_std.png";
    cfg.bgHoverIcon = meta.bgHoverIcon || cfg.bgHoverIcon || "comb02_hover.png";
    cfg.flashIconName = meta.icon || cfg.flashIconName;
    cfg.titleKey = meta.titleKey || cfg.titleKey || "";
    if (key === "quest") {
        cfg.title = "Quests";
        cfg.w = 560;
        cfg.h = 430;
        cfg.resizable = true;
        cfg.closeable = true;
        cfg.startMinimized = true;
        cfg.flashUseRuntimeOuterSize = true;
    }
    if (key === "spacemap") {
        cfg.w = FLASH_SPACEMAP_LAYOUT.outer.width;
        cfg.h = FLASH_SPACEMAP_LAYOUT.outer.height;
        cfg.flashUseRuntimeOuterSize = true;
        if (Object.prototype.hasOwnProperty.call(cfg, "flashHeaderReserve")) {
            delete cfg.flashHeaderReserve;
        }
    }
    return cfg;
}

function _getFlashResolutionNode() {
    const xmlDoc = _getFlashGameXmlDoc();
    if (!xmlDoc || !xmlDoc.documentElement) return null;
    const patterns = _getDirectChild(xmlDoc.documentElement, "patterns");
    const resolutionsNode = patterns ? _getDirectChild(patterns, "resolutions") : null;
    if (!resolutionsNode) return null;
    const resId = window.ANDROMEDA_CONFIG && window.ANDROMEDA_CONFIG.resolutionID != null ? String(window.ANDROMEDA_CONFIG.resolutionID) : "0";
    const list = resolutionsNode.getElementsByTagName("resolution");
    let fallback = null;
    for (const r of Array.from(list)) {
        if (!fallback) fallback = r;
        if (String(r.getAttribute("id")) === resId) return r;
    }
    return fallback;
}

function getFlashWindowDefaultPos(key, width, height) {
    const persisted = getFlashPersistedWindowSetting(key);
    if (persisted) return {
        left: persisted.left,
        top: persisted.top
    };
    const id = FLASH_WINDOW_ID_BY_KEY[key];
    if (id === undefined) return WINDOW_DEFAULT_POS[key] || {
        top: 100,
        left: 100
    };
    const resNode = _getFlashResolutionNode();
    if (!resNode) return WINDOW_DEFAULT_POS[key] || {
        top: 100,
        left: 100
    };
    const windowsNode = _getDirectChild(resNode, "windows");
    if (!windowsNode) return WINDOW_DEFAULT_POS[key] || {
        top: 100,
        left: 100
    };
    let winNode = null;
    const list = windowsNode.getElementsByTagName("window");
    for (const w of Array.from(list)) {
        if (String(w.getAttribute("id")) === String(id)) {
            winNode = w;
            break;
        }
    }
    if (!winNode) return WINDOW_DEFAULT_POS[key] || {
        top: 100,
        left: 100
    };
    const xPosRaw = winNode.getAttribute("xPos");
    const yPosRaw = winNode.getAttribute("yPos");
    const screenW = window.ANDROMEDA_CONFIG && Number(window.ANDROMEDA_CONFIG.width) || window.innerWidth || 800;
    const screenH = window.ANDROMEDA_CONFIG && Number(window.ANDROMEDA_CONFIG.height) || window.innerHeight || 600;
    const w = Number(width) || WINDOWS_CONFIG[key] && WINDOWS_CONFIG[key].w || 200;
    const h = Number(height) || WINDOWS_CONFIG[key] && WINDOWS_CONFIG[key].h || 120;
    const left = xPosRaw === "center" ? Math.round((screenW - w) / 2) : _flashParseInt(xPosRaw, WINDOW_DEFAULT_POS[key] && WINDOW_DEFAULT_POS[key].left || 100);
    const top = yPosRaw === "center" ? Math.round((screenH - h) / 2) : _flashParseInt(yPosRaw, WINDOW_DEFAULT_POS[key] && WINDOW_DEFAULT_POS[key].top || 100);
    return {
        left: left,
        top: top
    };
}

function getFlashMinimizedIconSlots() {
    const resNode = _getFlashResolutionNode();
    if (!resNode) return null;
    const slotsNode = _getDirectChild(resNode, "minimizediconslots");
    if (!slotsNode) return null;
    const baseX = _flashParseInt(slotsNode.getAttribute("x") || slotsNode.getAttribute("xPos"), 0);
    const baseY = _flashParseInt(slotsNode.getAttribute("y") || slotsNode.getAttribute("yPos"), 0);
    const slotEls = slotsNode.getElementsByTagName("minimizedIconSlot");
    const slots = [];
    for (const s of Array.from(slotEls)) {
        slots.push({
            x: _flashParseInt(s.getAttribute("iconXPos"), 0),
            y: _flashParseInt(s.getAttribute("iconYPos"), 0)
        });
    }
    return {
        left: baseX,
        top: baseY,
        slots: slots
    };
}

const FLASH_TOPMENU_BG_WIDTH = 151;

function getCurrentHudLogicalWidth() {
    const root = typeof window.getHudRoot === "function" ? window.getHudRoot() : document.getElementById("hudRoot");
    if (root) {
        const styleWidth = parseInt(root.style && root.style.width, 10);
        if (Number.isFinite(styleWidth) && styleWidth > 0) return styleWidth;
        const rootWidth = root.clientWidth || root.offsetWidth;
        if (Number.isFinite(rootWidth) && rootWidth > 0) return rootWidth;
    }
    if (typeof LOGICAL_WIDTH === "number" && Number.isFinite(LOGICAL_WIDTH) && LOGICAL_WIDTH > 0) return LOGICAL_WIDTH;
    return window.innerWidth || 1920;
}

function getCurrentHudLogicalHeight() {
    const root = typeof window.getHudRoot === "function" ? window.getHudRoot() : document.getElementById("hudRoot");
    if (root) {
        const styleHeight = parseInt(root.style && root.style.height, 10);
        if (Number.isFinite(styleHeight) && styleHeight > 0) return styleHeight;
        const rootHeight = root.clientHeight || root.offsetHeight;
        if (Number.isFinite(rootHeight) && rootHeight > 0) return rootHeight;
    }
    if (typeof LOGICAL_HEIGHT === "number" && Number.isFinite(LOGICAL_HEIGHT) && LOGICAL_HEIGHT > 0) return LOGICAL_HEIGHT;
    return (window.ANDROMEDA_CONFIG && Number(window.ANDROMEDA_CONFIG.height)) || window.innerHeight || 1080;
}

function getFlashTopMenuStaticSlotPos(windowId) {
    if (!Number.isFinite(windowId)) return null;
    const xmlDoc = _getFlashGameXmlDoc();
    if (!xmlDoc || !xmlDoc.documentElement) return null;
    const topMenuNode = _getDirectChild(xmlDoc.documentElement, "topmenu");
    const staticSlotsNode = topMenuNode ? _getDirectChild(topMenuNode, "staticbuttonslots") : null;
    if (!staticSlotsNode) return null;
    const slotEls = staticSlotsNode.getElementsByTagName("staticButtonSlot");
    for (const slot of Array.from(slotEls)) {
        if (String(slot.getAttribute("id")) !== String(windowId)) continue;
        const logicalWidth = getCurrentHudLogicalWidth();
        const baseX = logicalWidth - FLASH_TOPMENU_BG_WIDTH;
        return {
            left: baseX + _flashParseInt(slot.getAttribute("iconXPos"), 0),
            top: _flashParseInt(slot.getAttribute("iconYPos"), 0)
        };
    }
    return null;
}

function getFlashTopMenuStaticSlotPosByKey(key) {
    const id = FLASH_WINDOW_ID_BY_KEY[key];
    return Number.isFinite(id) ? getFlashTopMenuStaticSlotPos(id) : null;
}

function isFlashTopMenuStaticWindowKey(key) {
    return key === "settings";
}

const FLASH_TOP_UTILITY_WINDOW_KEYS = new Set([ "refinement", "trade", "settings", "logout" ]);

function getFlashTopUtilityBasePos() {
    return {
        left: getCurrentHudLogicalWidth() - FLASH_TOPMENU_BG_WIDTH + 2,
        top: 51
    };
}

function getFlashTopUtilityButtonPosByIndex(index) {
    const base = getFlashTopUtilityBasePos();
    const step = 33;
    return {
        left: base.left + step * index,
        top: base.top
    };
}

const FLASH_TOP_UTILITY_BUTTONS = [ {
    domId: "refiningButton",
    windowKey: "refinement",
    title: "Refining",
    iconPath: "graphics/ui/window1/images/refinement_icon.png",
    getPos: () => getFlashTopUtilityButtonPosByIndex(0),
    onClick: () => {
        if (typeof openRefiningWindow === "function") openRefiningWindow();
    }
}, {
    domId: "tradeButton",
    windowKey: "trade",
    title: "Trade",
    iconPath: "graphics/ui/window1/images/trade_icon.png",
    getPos: () => getFlashTopUtilityButtonPosByIndex(1),
    onClick: () => {
        if (typeof openTradeWindow === "function") openTradeWindow();
    }
}, {
    domId: "settingsButton",
    windowKey: "settings",
    title: "Settings",
    iconPath: "graphics/ui/window1/images/settings_icon.png",
    getPos: () => getFlashTopUtilityButtonPosByIndex(2),
    onClick: () => {
        if (typeof window.toggleSettingsWindow === "function") window.toggleSettingsWindow(); else if (typeof toggleSettingsWindow === "function") toggleSettingsWindow();
    }
}, {
    domId: "logoutButton",
    windowKey: "logout",
    title: "Logout",
    iconPath: "graphics/ui/window1/images/logout_icon.png",
    getPos: () => getFlashTopUtilityButtonPosByIndex(3),
    onClick: () => {
        if (typeof openLogoutWindow === "function") openLogoutWindow();
    }
} ];

function getFlashTopUtilityButtonDefById(domId) {
    return FLASH_TOP_UTILITY_BUTTONS.find(def => def.domId === domId) || null;
}

function syncFlashTopUtilityButtonPosition(buttonOrId) {
    const btn = typeof buttonOrId === "string" ? document.getElementById(buttonOrId) : buttonOrId;
    if (!btn) return;
    const def = getFlashTopUtilityButtonDefById(btn.id);
    if (!def) return;
    const pos = def.getPos ? def.getPos() : null;
    if (!pos) return;
    btn.style.left = `${pos.left}px`;
    btn.style.top = `${pos.top}px`;
}

function syncFlashTopUtilityButtons() {
    FLASH_TOP_UTILITY_BUTTONS.forEach(def => {
        const btn = document.getElementById(def.domId);
        if (btn) syncFlashTopUtilityButtonPosition(btn);
    });
}

function updateFlashTopUtilityButtonsState() {
    FLASH_TOP_UTILITY_BUTTONS.forEach(def => {
        const btn = document.getElementById(def.domId);
        if (!btn) return;
        const isActive = !!(windowStates && Object.prototype.hasOwnProperty.call(windowStates, def.windowKey) && windowStates[def.windowKey]);
        btn.classList.toggle("active", isActive);
        btn.style.display = isActive ? "none" : "block";
        if (!isActive) {
            syncFlashTopUtilityButtonPosition(btn);
        }
    });
}

function ensureFlashTopUtilityButton(windowKey) {
    const def = FLASH_TOP_UTILITY_BUTTONS.find(entry => entry.windowKey === windowKey);
    if (!def) return null;
    let btn = document.getElementById(def.domId);
    if (!btn) {
        btn = document.createElement("div");
        btn.id = def.domId;
        btn.className = "flashTopUtilityButton";
        btn.title = def.title;
        btn.dataset.windowKey = def.windowKey;
        btn.addEventListener("mousedown", e => {
            e.preventDefault();
            e.stopPropagation();
        });
        btn.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof def.onClick === "function") def.onClick();
        });
        window.appendToHud ? window.appendToHud(btn) : document.body.appendChild(btn);
    } else {
        btn.classList.add("flashTopUtilityButton");
        btn.dataset.windowKey = def.windowKey;
        btn.title = def.title;
    }
    btn.textContent = "";
    btn.style.right = "auto";
    btn.style.removeProperty("--icon");
    btn.style.setProperty("--flash-top-bg", typeof getUiCssUrl === "function" ? getUiCssUrl("graphics/ui/actionMenu/images/81_comb02_std.png.png") : `url('graphics/ui/actionMenu/images/81_comb02_std.png.png')`);
    btn.style.setProperty("--flash-top-bg-hover", typeof getUiCssUrl === "function" ? getUiCssUrl("graphics/ui/actionMenu/images/83_comb02_hover.png.png") : `url('graphics/ui/actionMenu/images/83_comb02_hover.png.png')`);
    btn.style.setProperty("--flash-top-bg-active", typeof getUiCssUrl === "function" ? getUiCssUrl("graphics/ui/actionMenu/images/83_comb02_hover.png.png") : `url('graphics/ui/actionMenu/images/83_comb02_hover.png.png')`);
    let inner = btn.querySelector(".flashTopUtilityButtonInner");
    if (!inner) {
        inner = document.createElement("div");
        inner.className = "flashTopUtilityButtonInner";
        btn.appendChild(inner);
    }
    inner.style.backgroundImage = `url('${def.iconPath}')`;
    syncFlashTopUtilityButtonPosition(btn);
    updateFlashTopUtilityButtonsState();
    return btn;
}

const WINDOW_DEFAULT_POS = {
    ship: {
        top: 80,
        left: 70
    },
    user: {
        top: 200,
        left: 70
    },
    group: {
        top: 80,
        left: 280
    },
    log: {
        top: 360,
        left: 70
    },
    chat: {
        top: 540,
        left: 70
    },
    booster: {
        top: 10,
        left: 10
    }
};

let __flashWindowZCounter = 1e3;

function bringWindowToFront(target) {
    let winEl = target;
    if (typeof target === "string") {
        const refs = getFlashWindowShellRefs(target);
        winEl = refs && refs.win ? refs.win : document.getElementById("win_" + target);
    }
    if (!winEl) {
        if (window.FLASH_PARITY_DEBUG) {
            console.warn("[FLASH_PARITY] bringWindowToFront: missing target", target);
        }
        return;
    }
    __flashWindowZCounter += 1;
    winEl.style.zIndex = String(__flashWindowZCounter);
}

let windowStates = {
    user: true,
    ship: true,
    chat: true,
    group: false,
    quest: false,
    log: true,
    map: true,
    spacemap: false,
    booster: false,
    spaceball: false
};

loadFlashWindowPersistenceFallback();

let FLASH_LEFT_SLOT_ORDER = [ "user", "ship", "log", "chat", "group", "quest", "spacemap", "booster", "spaceball", "map" ];

let boosterStatus = [];

let boosterAutoClosed = true;

const SPACEBALL_COMPANY_IDS = [ 1, 2, 3 ];

const SPACEBALL_COMPANY_LABELS = {
    1: "MMO",
    2: "EIC",
    3: "VRU"
};

const SPACEBALL_ENTRY_ASSETS = {
    1: {
        bg: "graphics/ui/ui/images/spaceball_1.png",
        width: 55,
        height: 44
    },
    2: {
        bg: "graphics/ui/ui/images/spaceball_2.png",
        width: 56,
        height: 44
    },
    3: {
        bg: "graphics/ui/ui/images/spaceball_3.png",
        width: 53,
        height: 42
    }
};

let __spaceballScoreboardState = {
    active: false,
    scores: {
        1: 0,
        2: 0,
        3: 0
    },
    owner: 0,
    speed: 0
};

let spaceballAutoClosed = true;

let __flashMinSlotsCfg = null;

function isBoosterActive() {
    return Array.isArray(boosterStatus) && boosterStatus.some(value => Number(value) > 0);
}

function updateBoosterStatus(values) {
    boosterStatus = Array.isArray(values) ? values.map(value => parseInt(value, 10) || 0) : [];
    const hasBoosters = isBoosterActive();
    if (!hasBoosters) {
        windowStates.booster = false;
        boosterAutoClosed = true;
    } else if (boosterAutoClosed) {
        windowStates.booster = true;
        boosterAutoClosed = false;
    }
    if (typeof refreshWindowsVisibility === "function") {
        refreshWindowsVisibility();
    }
}

window.updateBoosterStatus = updateBoosterStatus;

function hasSpaceballScoreboard() {
    return !!(__spaceballScoreboardState && __spaceballScoreboardState.active);
}

function getSpaceballScoreboardSnapshot() {
    return {
        active: !!(__spaceballScoreboardState && __spaceballScoreboardState.active),
        owner: __spaceballScoreboardState && Number.isFinite(Number(__spaceballScoreboardState.owner)) ? Number(__spaceballScoreboardState.owner) : 0,
        speed: __spaceballScoreboardState && Number.isFinite(Number(__spaceballScoreboardState.speed)) ? Number(__spaceballScoreboardState.speed) : 0,
        scores: {
            1: __spaceballScoreboardState && __spaceballScoreboardState.scores && Number.isFinite(Number(__spaceballScoreboardState.scores[1])) ? Number(__spaceballScoreboardState.scores[1]) : 0,
            2: __spaceballScoreboardState && __spaceballScoreboardState.scores && Number.isFinite(Number(__spaceballScoreboardState.scores[2])) ? Number(__spaceballScoreboardState.scores[2]) : 0,
            3: __spaceballScoreboardState && __spaceballScoreboardState.scores && Number.isFinite(Number(__spaceballScoreboardState.scores[3])) ? Number(__spaceballScoreboardState.scores[3]) : 0
        }
    };
}

function setSpaceballScoreboardData(mmo, eic, vru, speed, owner) {
    if (!__spaceballScoreboardState || typeof __spaceballScoreboardState !== "object") {
        __spaceballScoreboardState = {
            active: false,
            scores: {
                1: 0,
                2: 0,
                3: 0
            },
            owner: 0,
            speed: 0
        };
    }
    const scores = __spaceballScoreboardState.scores || (__spaceballScoreboardState.scores = {
        1: 0,
        2: 0,
        3: 0
    });
    const applyScore = (companyId, rawValue) => {
        if (rawValue == null) return;
        const parsed = parseInt(rawValue, 10);
        if (!Number.isNaN(parsed)) {
            scores[companyId] = parsed;
        }
    };
    applyScore(1, mmo);
    applyScore(2, eic);
    applyScore(3, vru);
    if (owner != null) {
        const parsedOwner = parseInt(owner, 10);
        if (!Number.isNaN(parsedOwner)) {
            __spaceballScoreboardState.owner = parsedOwner;
        }
    }
    if (speed != null) {
        const parsedSpeed = parseInt(speed, 10);
        if (!Number.isNaN(parsedSpeed)) {
            __spaceballScoreboardState.speed = parsedSpeed;
        }
    }
    __spaceballScoreboardState.active = true;
    if (!Object.prototype.hasOwnProperty.call(windowStates, "spaceball")) {
        windowStates.spaceball = true;
    }
    if (spaceballAutoClosed) {
        windowStates.spaceball = true;
        spaceballAutoClosed = false;
    }
    if (typeof refreshWindowsVisibility === "function") {
        refreshWindowsVisibility();
    }
    const container = document.getElementById("content_spaceball");
    if (container && typeof renderFlashSpaceballWindow === "function") {
        try {
            renderFlashSpaceballWindow(container);
        } catch (e) {
            console.error("[SPACEBALL] renderFlashSpaceballWindow failed", e);
        }
    }
}

window.updateSpaceballScoreboard = setSpaceballScoreboardData;

window.getBoosterStatus = () => boosterStatus.slice();

let logoutWindowElement = null;

let logoutTimerId = null;

let logoutCountdownValue = 0;

let logoutBreakByUser = false;

let tradeWindowElement = null;

let tradeOreCards = new Map;

let tradeWindowAllowedByZone = false;

let tradeLockOverlay = null;

const TRADE_ORE_CONFIG = [ {
    type: 1,
    key: "prometium",
    languageKey: "sta_prometium",
    pricetagLanguageKey: "pricetag_credits_compact",
    gaintagLanguageKey: "pricetag_credits_compact",
    icon: "graphics/ui/ui/images/45_ore_1.png"
}, {
    type: 2,
    key: "endurium",
    languageKey: "sta_endurium",
    pricetagLanguageKey: "pricetag_credits_compact",
    gaintagLanguageKey: "pricetag_credits_compact",
    icon: "graphics/ui/ui/images/41_ore_2.png"
}, {
    type: 3,
    key: "terbium",
    languageKey: "sta_terbium",
    pricetagLanguageKey: "pricetag_credits_compact",
    gaintagLanguageKey: "pricetag_credits_compact",
    icon: "graphics/ui/ui/images/40_ore_3.png"
}, {
    type: 11,
    key: "prometid",
    languageKey: "sta_prometid",
    pricetagLanguageKey: "pricetag_credits_compact",
    gaintagLanguageKey: "pricetag_credits_compact",
    icon: "graphics/ui/ui/images/44_ore_11.png"
}, {
    type: 12,
    key: "duranium",
    languageKey: "sta_duranium",
    pricetagLanguageKey: "pricetag_credits_compact",
    gaintagLanguageKey: "pricetag_credits_compact",
    icon: "graphics/ui/ui/images/43_ore_12.png"
}, {
    type: 13,
    key: "promerium",
    languageKey: "sta_promerium",
    pricetagLanguageKey: "pricetag_credits_compact",
    gaintagLanguageKey: "pricetag_credits_compact",
    icon: "graphics/ui/ui/images/42_ore_13.png"
} ];

const REFINING_ORES = [ {
    key: "prometium",
    languageKey: "ore_prometium",
    icon: "graphics/ui/refinement/images/11_ore_1.png"
}, {
    key: "endurium",
    languageKey: "ore_endurium",
    icon: "graphics/ui/refinement/images/6_ore_2.png"
}, {
    key: "terbium",
    languageKey: "ore_terbium",
    icon: "graphics/ui/refinement/images/5_ore_3.png"
}, {
    key: "prometid",
    languageKey: "ore_prometid",
    icon: "graphics/ui/refinement/images/10_ore_11.png"
}, {
    key: "duranium",
    languageKey: "ore_duranium",
    icon: "graphics/ui/refinement/images/9_ore_12.png"
}, {
    key: "promerium",
    languageKey: "ore_promerium",
    icon: "graphics/ui/refinement/images/8_ore_13.png"
}, {
    key: "xenomit",
    languageKey: "ore_xenomit",
    icon: "graphics/ui/refinement/images/4_ore_4.png"
} ];

const REFINING_RECIPES = [ {
    id: 11,
    key: "prometid",
    languageKey: "ore_prometid",
    inputs: {
        prometium: 20,
        endurium: 10
    }
}, {
    id: 12,
    key: "duranium",
    languageKey: "ore_duranium",
    inputs: {
        terbium: 20,
        endurium: 10
    }
}, {
    id: 13,
    key: "promerium",
    languageKey: "ore_promerium",
    inputs: {
        prometid: 10,
        duranium: 10,
        xenomit: 1
    }
} ];

const REFINING_RECIPES_BY_KEY = new Map(REFINING_RECIPES.map(r => [ r.key, r ]));

const UPGRADE_RAW_ORES = [ {
    key: "prometium",
    languageKey: "ore_prometium",
    icon: "graphics/ui/refinement/images/11_ore_1.png"
}, {
    key: "endurium",
    languageKey: "ore_endurium",
    icon: "graphics/ui/refinement/images/6_ore_2.png"
}, {
    key: "terbium",
    languageKey: "ore_terbium",
    icon: "graphics/ui/refinement/images/5_ore_3.png"
}, {
    key: "xenomit",
    languageKey: "ore_xenomit",
    icon: "graphics/ui/refinement/images/4_ore_4.png"
} ];

const UPGRADE_REFINED_ORES = [ {
    key: "prometid",
    languageKey: "ore_prometid",
    icon: "graphics/ui/refinement/images/10_ore_11.png",
    allowedTargets: [ "LASER", "ROCKET" ]
}, {
    key: "duranium",
    languageKey: "ore_duranium",
    icon: "graphics/ui/refinement/images/9_ore_12.png",
    allowedTargets: [ "DRIVING", "SHIELD" ]
}, {
    key: "promerium",
    languageKey: "ore_promerium",
    icon: "graphics/ui/refinement/images/8_ore_13.png",
    allowedTargets: [ "LASER", "ROCKET", "DRIVING", "SHIELD" ]
}, {
    key: "seprom",
    languageKey: "ore_seprom",
    icon: "graphics/ui/refinement/images/13_ore_14.png",
    allowedTargets: [ "LASER", "ROCKET", "SHIELD" ]
} ];

const UPGRADE_TARGETS = [ {
    id: "LASER",
    languageKey: "lab_laser",
    icon: "graphics/ui/refinement/images/17_item_1.png",
    amountKey: "lab_salvos"
}, {
    id: "ROCKET",
    languageKey: "lab_raketen",
    icon: "graphics/ui/refinement/images/16_item_2.png",
    amountKey: "lab_pieces"
}, {
    id: "DRIVING",
    languageKey: "lab_antrieb",
    icon: "graphics/ui/refinement/images/15_item_3.png",
    amountKey: "lab_minutes"
}, {
    id: "SHIELD",
    languageKey: "lab_schild",
    icon: "graphics/ui/refinement/images/14_item_4.png",
    amountKey: "lab_minutes"
} ];

const REFINEMENT_BITMAP_STATES = {
    tab: {
        std: "graphics/ui/ui/sprites/DefineSprite_536_Button_upSkin/1.png",
        mo: "graphics/ui/ui/sprites/DefineSprite_526_Button_overSkin/1.png",
        pr: "graphics/ui/ui/sprites/DefineSprite_534_Button_selectedUpSkin/1.png",
        da: "graphics/ui/ui/sprites/DefineSprite_520_Button_disabledSkin/1.png",
        sd: "graphics/ui/ui/sprites/DefineSprite_528_Button_selectedDisabledSkin/1.png"
    },
    button: {
        std: "graphics/ui/ui/sprites/DefineSprite_536_Button_upSkin/1.png",
        mo: "graphics/ui/ui/sprites/DefineSprite_526_Button_overSkin/1.png",
        pr: "graphics/ui/ui/sprites/DefineSprite_534_Button_selectedUpSkin/1.png",
        da: "graphics/ui/ui/sprites/DefineSprite_520_Button_disabledSkin/1.png"
    }
};

function bindBitmapStates(el, states, isSelectedFn = null) {
    if (!el || !states) return;
    const apply = phase => {
        const selected = typeof isSelectedFn === "function" ? !!isSelectedFn() : false;
        const disabled = !!el.disabled;
        let src = states.std;
        if (disabled && selected && states.sd) src = states.sd; else if (disabled && states.da) src = states.da; else if (phase === "pr" && states.pr) src = states.pr; else if (phase === "mo" && states.mo) src = states.mo; else if (selected && states.pr) src = states.pr; else if (selected && states.da) src = states.da;
        if (src) {
            if (typeof setUiBackgroundImage === "function") setUiBackgroundImage(el, src); else el.style.backgroundImage = `url('${src}')`;
        } else {
            el.style.backgroundImage = "";
        }
    };
    apply("std");
    el.addEventListener("mouseenter", () => apply("mo"));
    el.addEventListener("mouseleave", () => apply("std"));
    el.addEventListener("mousedown", () => apply("pr"));
    el.addEventListener("mouseup", () => apply("mo"));
    const mo = new MutationObserver(() => apply("std"));
    mo.observe(el, {
        attributes: true,
        attributeFilter: [ "disabled", "class" ]
    });
}

const SEPROM_SAFE_LEVELS = [ {
    level: 1,
    cost: 3e4,
    capacity: 3e3
}, {
    level: 2,
    cost: 6e4,
    capacity: 6e3
}, {
    level: 3,
    cost: 9e4,
    capacity: 1e4
} ];

const TRADE_SELL_BUTTON_BITMAP_STATES = {
    std: "graphics/ui/ui/sprites/DefineSprite_249/1.png",
    mo: "graphics/ui/ui/sprites/DefineSprite_249/2.png",
    pr: "graphics/ui/ui/sprites/DefineSprite_249/2.png",
    da: "graphics/ui/ui/sprites/DefineSprite_249/2.png"
};

const UPGRADE_DRAG_ICONS = {
    seprom: "graphics/ui/refinement/images/18_icon_14.png",
    promerium: "graphics/ui/refinement/images/19_icon_13.png",
    duranium: "graphics/ui/refinement/images/20_icon_12.png",
    prometid: "graphics/ui/refinement/images/21_icon_11.png"
};

let refiningWindowElement = null;

let refiningActiveTab = "refine";

let refiningLastCargoSig = "";

let refiningUpgradeCards = new Map;

let refiningPollTimer = null;

let refiningPollTicks = 0;

let refiningRefreshPendingAfterDrag = false;

let refiningPendingRefreshForce = false;

let refiningPendingRefreshScope = "all";

function startRefiningPoll() {
    stopRefiningPoll();
    refiningPollTicks = 0;
    try {
        sendRaw("LAB|UPD|GET");
    } catch (e) {}
    refiningPollTimer = setInterval(() => {
        const win = document.getElementById("win_refinement");
        if (!win || win.style.display === "none") {
            stopRefiningPoll();
            return;
        }
        try {
            sendRaw("LAB|UPD|GET");
        } catch (e) {}
        refiningPollTicks++;
        if (refiningPollTicks >= 600) {
            try {
                closeRefiningWindow();
            } catch (e) {
                stopRefiningPoll();
            }
        }
    }, 1e3);
}

function stopRefiningPoll() {
    if (refiningPollTimer) {
        clearInterval(refiningPollTimer);
        refiningPollTimer = null;
    }
}

let currentUpgradeDrag = null;

function isRefiningUpgradeDragActive() {
    return currentUpgradeDrag !== null;
}

function mergeRefiningRefreshScope(a, b) {
    if (a === "all" || b === "all") return "all";
    if (a === b) return a;
    return "all";
}

function scheduleRefiningRefreshAfterDrag(force = false, scope = "all") {
    refiningRefreshPendingAfterDrag = true;
    refiningPendingRefreshForce = refiningPendingRefreshForce || !!force;
    refiningPendingRefreshScope = mergeRefiningRefreshScope(refiningPendingRefreshScope, scope || "all");
}

function flushPendingRefiningRefreshAfterDrag() {
    if (!refiningRefreshPendingAfterDrag) return;
    const force = refiningPendingRefreshForce;
    const scope = refiningPendingRefreshScope;
    refiningRefreshPendingAfterDrag = false;
    refiningPendingRefreshForce = false;
    refiningPendingRefreshScope = "all";
    refreshRefiningWindow(force, scope);
}

function beginUpgradeDrag(oreKey) {
    currentUpgradeDrag = oreKey || null;
}

function endUpgradeDrag() {
    if (currentUpgradeDrag === null) return;
    currentUpgradeDrag = null;
    flushPendingRefiningRefreshAfterDrag();
}

function getOreCargoSnapshot() {
    return {
        ...window.oreCargo || {}
    };
}

function getSepromSafeLevelConfig(level) {
    const wanted = Math.max(0, parseInt(level, 10) || 0);
    return SEPROM_SAFE_LEVELS.find(cfg => cfg.level === wanted) || null;
}

function getSepromSafeCapacity(level) {
    const cfg = getSepromSafeLevelConfig(level);
    return cfg ? cfg.capacity : 0;
}

function hasSafeTradeAccess() {
    return typeof window.isTradeWindowAccessGranted === "function" ? !!window.isTradeWindowAccessGranted() : !!(typeof inTradeZone !== "undefined" && inTradeZone);
}

function getLabSafeStateSnapshot() {
    const src = window.labSafeState || {};
    const level = Math.max(0, parseInt(src.level, 10) || 0);
    const stored = Math.max(0, parseInt(src.stored, 10) || 0);
    const capacity = Math.max(0, parseInt(src.capacity, 10) || getSepromSafeCapacity(level));
    const loaded = src.loaded === true ? true : src.loaded === false ? false : Object.prototype.hasOwnProperty.call(src, "level") || Object.prototype.hasOwnProperty.call(src, "stored") || Object.prototype.hasOwnProperty.call(src, "capacity");
    return {
        loaded: loaded,
        level: level,
        stored: stored,
        capacity: capacity
    };
}

function computeRecipeMax(recipe, cargo) {
    let max = Infinity;
    for (const [ore, need] of Object.entries(recipe.inputs)) {
        const available = cargo[ore] || 0;
        max = Math.min(max, Math.floor(available / need));
    }
    if (!isFinite(max) || max < 0) return 0;
    return max;
}

const REFINE_AMOUNTS = [ 1, 5, 10, 50, 100, 500, 1e3 ];

function flashLocaleText(key, fallback = "") {
    if (!key) return fallback;
    try {
        if (typeof __flashLocaleGetText === "function") {
            const t = __flashLocaleGetText(key);
            if (t != null && String(t).trim() !== "") return String(t);
        }
    } catch (e) {}
    return fallback;
}

function resolveOreLabel(oreDef) {
    if (!oreDef) return "";
    return flashLocaleText(oreDef.languageKey, oreDef.key || "");
}

const REFINEMENT_TOOLTIP_KEYS = {
    prometium: [ "prometium_info" ],
    endurium: [ "endurium_info" ],
    terbium: [ "terbium_info" ],
    xenomit: [ "xenomit_info" ],
    prometid: [ "ore_details", "lab_effect_prometid" ],
    duranium: [ "ore_details", "lab_effect_duranium" ],
    promerium: [ "ore_details", "ore_details_addon", "lab_effect_promerium" ],
    seprom: [ "lab_effect_seprom" ]
};

function formatOreName(oreKey) {
    const ore = REFINING_ORES.find(o => o.key === oreKey) || UPGRADE_REFINED_ORES.find(o => o.key === oreKey) || UPGRADE_RAW_ORES.find(o => o.key === oreKey);
    return ore ? resolveOreLabel(ore) : oreKey;
}

function getRefiningRecipe(key) {
    return REFINING_RECIPES_BY_KEY.get(key) || null;
}

function applyRecipePlaceholders(text, recipe) {
    let out = String(text || "");
    if (!recipe) return out;
    const entries = Object.entries(recipe.inputs || {});
    entries.forEach(([k, c], idx) => {
        const n = idx + 1;
        out = out.replace(new RegExp("%COUNT_" + n + "%", "g"), String(c));
        out = out.replace(new RegExp("%ORE_" + n + "%", "g"), formatOreName(k));
    });
    const last = entries.length ? entries[entries.length - 1] : null;
    if (last) {
        out = out.replace(/%COUNT%/g, String(last[1]));
        out = out.replace(/%ORE%/g, formatOreName(last[0]));
    }
    return out;
}

function buildRecipeTooltip(recipe) {
    if (!recipe) return null;
    const effectKey = recipe && recipe.key ? "lab_effect_" + recipe.key : "";
    return applyRecipePlaceholders(flashLocaleText(effectKey, ""), recipe) || "";
}

function getOreTooltip(key, recipe) {
    const info = (REFINEMENT_TOOLTIP_KEYS[key] || []).map(k => applyRecipePlaceholders(flashLocaleText(k, ""), recipe)).filter(v => !!String(v || "").trim()).join("\n");
    const recipeTip = buildRecipeTooltip(recipe);
    if (info && recipeTip && !info.includes(recipeTip)) return `${info}\n${recipeTip}`;
    return info || recipeTip || "";
}

function showOreTooltip(e, oreKey, recipe) {
    if (typeof initActionDrawerTooltips === "function") {
        initActionDrawerTooltips();
    }
    const tt = document.getElementById("adTooltip");
    if (!tt) return;
    tt.innerHTML = "";
    const header = document.createElement("div");
    header.className = "ttHeader";
    header.textContent = formatOreName(oreKey);
    tt.appendChild(header);
    const text = getOreTooltip(oreKey, recipe);
    if (text) {
        const body = document.createElement("div");
        body.className = "ttBody";
        const lines = text.split("\n");
        lines.forEach((line, idx) => {
            if (idx > 0) body.appendChild(document.createElement("br"));
            body.appendChild(document.createTextNode(line));
        });
        tt.appendChild(body);
    }
    tt.style.display = "block";
    if (typeof moveActionTooltip === "function") {
        moveActionTooltip(e);
    }
}

function attachOreTooltip(element, oreKey, recipe) {
    if (!element) return;
    element.addEventListener("mouseenter", evt => showOreTooltip(evt, oreKey, recipe));
    element.addEventListener("mousemove", evt => {
        if (typeof moveActionTooltip === "function") moveActionTooltip(evt);
    });
    element.addEventListener("mouseleave", () => {
        if (typeof hideActionTooltip === "function") hideActionTooltip();
    });
}

let refinePromptOverlay = null;

function closeRefinePrompt() {
    if (refinePromptOverlay && refinePromptOverlay.parentNode) {
        refinePromptOverlay.parentNode.removeChild(refinePromptOverlay);
    }
    refinePromptOverlay = null;
}

function openRefinePrompt(recipe, maxAmount) {
    closeRefinePrompt();
    if (!recipe) return;
    const overlay = document.createElement("div");
    overlay.id = "refinePromptOverlay";
    const card = document.createElement("div");
    card.id = "refinePrompt";
    const title = document.createElement("h4");
    title.textContent = flashLocaleText(recipe.languageKey || "ore_" + recipe.key, recipe.key);
    card.appendChild(title);
    const question = document.createElement("p");
    question.textContent = flashLocaleText("lab_refine_question", "");
    card.appendChild(question);
    const select = document.createElement("select");
    const amounts = [];
    REFINE_AMOUNTS.forEach(a => {
        if (a < maxAmount) amounts.push(a);
    });
    amounts.push(maxAmount);
    const unique = Array.from(new Set(amounts.filter(a => a > 0)));
    unique.forEach(val => {
        const opt = document.createElement("option");
        opt.value = String(val);
        opt.textContent = val;
        select.appendChild(opt);
    });
    select.value = String(maxAmount);
    card.appendChild(select);
    const actions = document.createElement("div");
    actions.className = "refinePromptActions";
    const refineBtn = document.createElement("button");
    refineBtn.textContent = flashLocaleText("lab_btn_refine", "");
    refineBtn.addEventListener("click", () => {
        const val = parseInt(select.value, 10);
        if (typeof sendProduce === "function" && val > 0) {
            sendProduce(recipe.id, val);
        }
        closeRefinePrompt();
    });
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = flashLocaleText("lab_cancel", "");
    cancelBtn.addEventListener("click", closeRefinePrompt);
    bindBitmapStates(refineBtn, REFINEMENT_BITMAP_STATES.button);
    actions.appendChild(refineBtn);
    bindBitmapStates(cancelBtn, REFINEMENT_BITMAP_STATES.button);
    actions.appendChild(cancelBtn);
    card.appendChild(actions);
    overlay.addEventListener("click", e => {
        if (e.target === overlay) closeRefinePrompt();
    });
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    refinePromptOverlay = overlay;
}

function formatOreCount(n) {
    const v = Math.max(0, parseInt(n, 10) || 0);
    return v.toLocaleString("en-US");
}

function createRefinementLabelEl(text, bottom = false) {
    const label = document.createElement("div");
    label.className = "refLabel " + (bottom ? "refLabelBottom" : "refLabelTop");
    label.textContent = text || "";
    return label;
}

function createRefiningModule(ore, count, options = {}) {
    const node = document.createElement("div");
    node.className = "refModule" + (options.static ? " refStatic" : "");
    node.style.left = (options.x || 0) + "px";
    node.style.top = (options.y || 0) + "px";
    node.appendChild(createRefinementLabelEl(resolveOreLabel(ore), false));
    const slot = document.createElement("div");
    slot.className = "refSlot";
    const icon = document.createElement("div");
    icon.className = "refSlotIcon";
    if (typeof setUiBackgroundImage === "function") setUiBackgroundImage(icon, ore.icon); else icon.style.backgroundImage = `url('${ore.icon}')`;
    slot.appendChild(icon);
    node.appendChild(slot);
    node.appendChild(createRefinementLabelEl(formatOreCount(count), true));
    if (options.recipe) {
        const btn = document.createElement("button");
        btn.className = "refNodeBtn";
        btn.textContent = flashLocaleText("lab_btn_refine", "");
        const maxCraft = computeRecipeMax(options.recipe, getOreCargoSnapshot());
        btn.disabled = maxCraft <= 0;
        bindBitmapStates(btn, REFINEMENT_BITMAP_STATES.button);
        btn.onclick = () => openRefinePrompt(options.recipe, computeRecipeMax(options.recipe, getOreCargoSnapshot()));
        node.appendChild(btn);
    }
    attachOreTooltip(slot, ore.key, options.recipe || null);
    return node;
}

function renderRefiningTab(container) {
    const cargo = getOreCargoSnapshot();
    container.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "refiningTreeWrap";
    const tree = document.createElement("div");
    tree.className = "refiningTree";
    wrap.appendChild(tree);
    const treeBg = document.createElement("div");
    treeBg.className = "refiningTreeBg";
    tree.appendChild(treeBg);
    const pos = {
        prometium: {
            x: 63,
            y: 100,
            static: true
        },
        endurium: {
            x: 151,
            y: 100,
            static: true
        },
        terbium: {
            x: 239,
            y: 100,
            static: true
        },
        prometid: {
            x: 110,
            y: 235
        },
        duranium: {
            x: 198,
            y: 235
        },
        xenomit: {
            x: 330,
            y: 235,
            static: true
        },
        promerium: {
            x: 152,
            y: 390
        }
    };
    [ "prometium", "endurium", "terbium", "prometid", "duranium", "xenomit", "promerium" ].forEach(key => {
        const ore = REFINING_ORES.find(o => o.key === key);
        if (!ore) return;
        const recipe = getRefiningRecipe(key);
        const p = pos[key] || {
            x: 0,
            y: 0
        };
        const node = createRefiningModule(ore, cargo[key] || 0, {
            x: p.x,
            y: p.y,
            static: !!p.static && !recipe,
            recipe: recipe || null
        });
        tree.appendChild(node);
    });
    container.appendChild(wrap);
}

function getUpgradeState(id) {
    return refiningUpgradeCards.get(id) || {};
}

function setUpgradeState(id, data) {
    const prev = refiningUpgradeCards.get(id) || {};
    const merged = {
        ...prev,
        ...data
    };
    const amount = Math.max(0, parseInt(merged.amount, 10) || 0);
    const oreKey = merged.oreKey || null;
    if (!oreKey || amount <= 0) {
        const hadEntry = refiningUpgradeCards.has(id);
        if (hadEntry) {
            refiningUpgradeCards.delete(id);
        }
        return hadEntry;
    }
    if (prev.oreKey === oreKey && Math.max(0, parseInt(prev.amount, 10) || 0) === amount) {
        return false;
    }
    refiningUpgradeCards.set(id, {
        oreKey: oreKey,
        amount: amount
    });
    return true;
}

function getUpgradeOreDef(key) {
    return UPGRADE_REFINED_ORES.find(o => o.key === key);
}

function getUpgradeTargetDef(id) {
    return UPGRADE_TARGETS.find(t => t.id === id);
}

function canOreUpgradeTarget(oreKey, targetId) {
    const oreDef = getUpgradeOreDef(oreKey);
    if (!oreDef) return false;
    return oreDef.allowedTargets.includes(targetId);
}

function formatUpgradeAmount(targetId, amount) {
    const def = getUpgradeTargetDef(targetId);
    const val = amount || 0;
    if (!def) return `${val}`;
    let suffix = flashLocaleText(def.amountKey, "");
    const hasCountPlaceholder = /%COUNT%/.test(suffix);
    suffix = suffix.replace(/%COUNT%/g, String(val));
    if (hasCountPlaceholder) return suffix || `${val}`;
    return suffix ? `${val} ${suffix}` : `${val}`;
}

let upgradePromptOverlay = null;

function closeUpgradePrompt() {
    if (upgradePromptOverlay && upgradePromptOverlay.parentNode) {
        upgradePromptOverlay.parentNode.removeChild(upgradePromptOverlay);
    }
    upgradePromptOverlay = null;
}

function buildAmountOptions(maxAmount) {
    const opts = [];
    REFINE_AMOUNTS.forEach(v => {
        if (v < maxAmount) opts.push(v);
    });
    opts.push(maxAmount);
    return Array.from(new Set(opts.filter(v => v > 0)));
}

function openUpgradeAmountPrompt(targetId, oreKey, maxAmount, previousAmount = 0) {
    closeUpgradePrompt();
    if (maxAmount <= 0) {
        addInfoMessage(flashLocaleText("notEnoughCargo", ""));
        return;
    }
    const overlay = document.createElement("div");
    overlay.id = "refinePromptOverlay";
    const card = document.createElement("div");
    card.id = "refinePrompt";
    const title = document.createElement("h4");
    const targetDef = getUpgradeTargetDef(targetId);
    title.textContent = flashLocaleText("lab_btn_update", "");
    card.appendChild(title);
    const question = document.createElement("p");
    question.textContent = flashLocaleText("lab_refine_question", "");
    card.appendChild(question);
    const select = document.createElement("select");
    buildAmountOptions(maxAmount).forEach(val => {
        const opt = document.createElement("option");
        opt.value = String(val);
        opt.textContent = val;
        select.appendChild(opt);
    });
    const safeDefault = previousAmount > 0 ? Math.min(previousAmount, maxAmount) : maxAmount;
    select.value = String(safeDefault);
    card.appendChild(select);
    const actions = document.createElement("div");
    actions.className = "refinePromptActions";
    const applyBtn = document.createElement("button");
    applyBtn.textContent = flashLocaleText("lab_btn_update", "");
    applyBtn.addEventListener("click", () => {
        const val = parseInt(select.value, 10);
        if (isNaN(val) || val <= 0) return;
        if (typeof sendRefiningUpgrade === "function") {
            sendRefiningUpgrade(targetId, oreKey, val);
        }
        closeUpgradePrompt();
    });
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = flashLocaleText("lab_cancel", "");
    cancelBtn.addEventListener("click", closeUpgradePrompt);
    bindBitmapStates(applyBtn, REFINEMENT_BITMAP_STATES.button);
    actions.appendChild(applyBtn);
    bindBitmapStates(cancelBtn, REFINEMENT_BITMAP_STATES.button);
    actions.appendChild(cancelBtn);
    card.appendChild(actions);
    overlay.appendChild(card);
    overlay.addEventListener("click", e => {
        if (e.target === overlay) closeUpgradePrompt();
    });
    document.body.appendChild(overlay);
    upgradePromptOverlay = overlay;
}

function openUpgradeReplacePrompt(onConfirm) {
    closeUpgradePrompt();
    const overlay = document.createElement("div");
    overlay.id = "refinePromptOverlay";
    const card = document.createElement("div");
    card.id = "refinePrompt";
    const question = document.createElement("p");
    question.textContent = flashLocaleText("lab_refine_question", "");
    card.appendChild(question);
    const actions = document.createElement("div");
    actions.className = "refinePromptActions";
    const okBtn = document.createElement("button");
    okBtn.textContent = flashLocaleText("lab_btn_update", "");
    okBtn.addEventListener("click", () => {
        closeUpgradePrompt();
        onConfirm();
    });
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = flashLocaleText("lab_cancel", "");
    cancelBtn.addEventListener("click", closeUpgradePrompt);
    bindBitmapStates(okBtn, REFINEMENT_BITMAP_STATES.button);
    actions.appendChild(okBtn);
    bindBitmapStates(cancelBtn, REFINEMENT_BITMAP_STATES.button);
    actions.appendChild(cancelBtn);
    card.appendChild(actions);
    overlay.appendChild(card);
    overlay.addEventListener("click", e => {
        if (e.target === overlay) closeUpgradePrompt();
    });
    document.body.appendChild(overlay);
    upgradePromptOverlay = overlay;
}

let safePromptOverlay = null;

function closeSafePrompt() {
    if (safePromptOverlay && safePromptOverlay.parentNode) {
        safePromptOverlay.parentNode.removeChild(safePromptOverlay);
    }
    safePromptOverlay = null;
}

function openSafeAmountPrompt(mode, maxAmount) {
    closeSafePrompt();
    if (!hasSafeTradeAccess()) {
        addInfoMessage("You must be inside the trade zone (station) to use the Seprom Safe.");
        return;
    }
    const amountMax = Math.max(0, parseInt(maxAmount, 10) || 0);
    if (amountMax <= 0) {
        addInfoMessage(mode === "WITHDRAW" ? "No Seprom available or cargo is full." : flashLocaleText("notEnoughCargo", ""));
        return;
    }
    const overlay = document.createElement("div");
    overlay.id = "safePromptOverlay";
    const card = document.createElement("div");
    card.id = "safePrompt";
    const title = document.createElement("h4");
    title.textContent = "Seprom Safe";
    card.appendChild(title);
    const question = document.createElement("p");
    question.textContent = mode === "WITHDRAW" ? "How much Seprom do you want to withdraw from the safe?" : "How much Seprom do you want to deposit into the safe?";
    card.appendChild(question);
    const select = document.createElement("select");
    buildAmountOptions(amountMax).forEach(val => {
        const opt = document.createElement("option");
        opt.value = String(val);
        opt.textContent = String(val);
        select.appendChild(opt);
    });
    select.value = String(amountMax);
    card.appendChild(select);
    const actions = document.createElement("div");
    actions.className = "refinePromptActions";
    const applyBtn = document.createElement("button");
    applyBtn.textContent = mode === "WITHDRAW" ? "Withdraw" : "Deposit";
    applyBtn.addEventListener("click", () => {
        const val = parseInt(select.value, 10);
        if (!Number.isFinite(val) || val <= 0) return;
        if (mode === "WITHDRAW") {
            if (typeof sendLabSafeWithdraw === "function") sendLabSafeWithdraw(val);
        } else {
            if (typeof sendLabSafeDeposit === "function") sendLabSafeDeposit(val);
        }
        closeSafePrompt();
    });
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = flashLocaleText("lab_cancel", "");
    cancelBtn.addEventListener("click", closeSafePrompt);
    bindBitmapStates(applyBtn, REFINEMENT_BITMAP_STATES.button);
    bindBitmapStates(cancelBtn, REFINEMENT_BITMAP_STATES.button);
    actions.appendChild(applyBtn);
    actions.appendChild(cancelBtn);
    card.appendChild(actions);
    overlay.appendChild(card);
    overlay.addEventListener("click", e => {
        if (e.target === overlay) closeSafePrompt();
    });
    document.body.appendChild(overlay);
    safePromptOverlay = overlay;
}

function buildUpgradeOreSlot(ore, cargo) {
    const slot = document.createElement("div");
    slot.className = "refUpgradeModule";
    slot.appendChild(createRefinementLabelEl(resolveOreLabel(ore), false));
    const bg = document.createElement("div");
    bg.className = "refSlot";
    const icon = document.createElement("img");
    icon.className = "refSlotIcon";
    if (typeof setUiImageElementSource === "function") setUiImageElementSource(icon, ore.icon); else icon.src = ore.icon;
    icon.alt = "";
    bg.appendChild(icon);
    slot.appendChild(bg);
    slot.appendChild(createRefinementLabelEl(formatOreCount(cargo), true));
    attachOreTooltip(bg, ore.key, getRefiningRecipe(ore.key));
    if (ore.allowedTargets) {
        slot.draggable = cargo > 0;
        if (cargo > 0) {
            let dragImg = null;
            slot.addEventListener("dragstart", e => {
                e.dataTransfer.setData("text/upgrade-ore", ore.key);
                if (!dragImg && UPGRADE_DRAG_ICONS[ore.key]) {
                    dragImg = typeof getUiImage === "function" ? getUiImage(UPGRADE_DRAG_ICONS[ore.key]) : andromedaCreateImage(UPGRADE_DRAG_ICONS[ore.key]);
                }
                if (dragImg) {
                    e.dataTransfer.setDragImage(dragImg, dragImg.width / 2, dragImg.height / 2);
                }
                beginUpgradeDrag(ore.key);
            });
            slot.addEventListener("dragend", endUpgradeDrag);
        }
    }
    return slot;
}

function formatTargetStatus(targetId, state) {
    const amount = Math.max(0, state?.amount || 0);
    const oreKey = amount > 0 ? state?.oreKey : null;
    return formatUpgradeAmount(targetId, amount);
}

function handleUpgradeDrop(target, oreKey, cargo, state) {
    const oreDef = getUpgradeOreDef(oreKey);
    if (!oreDef) return;
    if (!canOreUpgradeTarget(oreKey, target.id)) {
        addInfoMessage(flashLocaleText("lab_error_upgrade_target", ""));
        return;
    }
    const available = cargo[oreKey] || 0;
    if (available <= 0) {
        addInfoMessage(flashLocaleText("notEnoughCargo", ""));
        return;
    }
    const proceed = () => openUpgradeAmountPrompt(target.id, oreKey, available, state?.oreKey === oreKey ? state.amount : 0);
    if (state?.oreKey && state.oreKey !== oreKey) {
        openUpgradeReplacePrompt(proceed);
    } else {
        proceed();
    }
}

function buildUpgradeTarget(target, cargo) {
    const state = getUpgradeState(target.id);
    const card = document.createElement("div");
    card.className = "refTargetModule";
    card.appendChild(createRefinementLabelEl(flashLocaleText(target.languageKey, target.id), false));
    const slot = document.createElement("div");
    slot.className = "refTargetSlot";
    const icon = document.createElement("div");
    icon.className = "refTargetSlotIcon";
    if (typeof setUiBackgroundImage === "function") setUiBackgroundImage(icon, target.icon); else icon.style.backgroundImage = `url('${target.icon}')`;
    slot.appendChild(icon);
    const mini = document.createElement("div");
    mini.className = "refTargetMini";
    const miniIcon = document.createElement("div");
    miniIcon.className = "refTargetMiniIcon";
    if (state?.oreKey && (state.amount || 0) > 0) {
        const oreDef = getUpgradeOreDef(state.oreKey);
        const oreIconPath = oreDef ? UPGRADE_DRAG_ICONS[oreDef.key] || oreDef.icon : null;
        if (oreIconPath) {
            if (typeof setUiBackgroundImage === "function") setUiBackgroundImage(miniIcon, oreIconPath); else miniIcon.style.backgroundImage = `url('${oreIconPath}')`;
        }
    }
    mini.appendChild(miniIcon);
    slot.appendChild(mini);
    const dragKeyFromEvent = e => e.dataTransfer?.getData("text/upgrade-ore") || currentUpgradeDrag;
    slot.addEventListener("dragover", e => {
        const dragKey = dragKeyFromEvent(e);
        if (dragKey && canOreUpgradeTarget(dragKey, target.id)) {
            e.preventDefault();
        }
    });
    slot.addEventListener("drop", e => {
        e.preventDefault();
        const oreKey = dragKeyFromEvent(e);
        handleUpgradeDrop(target, oreKey, cargo, state);
        setTimeout(endUpgradeDrag, 0);
    });
    card.appendChild(slot);
    card.appendChild(createRefinementLabelEl(formatTargetStatus(target.id, state), true));
    return card;
}

function renderUpgradeTab(container) {
    const cargo = getOreCargoSnapshot();
    container.innerHTML = "";
    const panel = document.createElement("div");
    panel.className = "refUpgradeScene";
    const title = document.createElement("div");
    title.className = "refUpgradeHeader";
    title.textContent = flashLocaleText("lab_title", "");
    panel.appendChild(title);
    const rawRow = document.createElement("div");
    rawRow.className = "refUpgradeRow refUpgradeRaw";
    UPGRADE_RAW_ORES.forEach(ore => {
        rawRow.appendChild(buildUpgradeOreSlot(ore, cargo[ore.key] || 0));
    });
    panel.appendChild(rawRow);
    const hint = document.createElement("div");
    hint.className = "refUpgradeHint";
    hint.textContent = flashLocaleText("labor_intro", "");
    panel.appendChild(hint);
    const refinedRow = document.createElement("div");
    refinedRow.className = "refUpgradeRow refUpgradeRefined";
    UPGRADE_REFINED_ORES.forEach(ore => {
        refinedRow.appendChild(buildUpgradeOreSlot(ore, cargo[ore.key] || 0));
    });
    panel.appendChild(refinedRow);
    const targetsRow = document.createElement("div");
    targetsRow.className = "refUpgradeRow refUpgradeTargets";
    UPGRADE_TARGETS.forEach(target => {
        targetsRow.appendChild(buildUpgradeTarget(target, cargo));
    });
    panel.appendChild(targetsRow);
    container.appendChild(panel);
}

function renderSafeTab(container) {
    const cargo = getOreCargoSnapshot();
    const safeState = getLabSafeStateSnapshot();
    const safeLoaded = !!safeState.loaded;
    const hasTradeAccess = hasSafeTradeAccess();
    const panel = document.createElement("div");
    panel.className = "refSafeScene";

    const title = document.createElement("div");
    title.className = "refSafeTitle";
    title.textContent = "Seprom Safe";
    panel.appendChild(title);

    const hint = document.createElement("div");
    hint.className = "refSafeHint";
    hint.textContent = safeLoaded ? "Store Seprom here. Safe stock is not lost on death." : "Loading your Seprom Safe data...";
    panel.appendChild(hint);

    const statusCard = document.createElement("div");
    statusCard.className = "refSafeStatusCard";

    const statusIcon = document.createElement("div");
    statusIcon.className = "refSafeStatusIcon";
    if (typeof setUiBackgroundImage === "function") setUiBackgroundImage(statusIcon, "graphics/ui/refinement/images/13_ore_14.png"); else statusIcon.style.backgroundImage = "url('graphics/ui/refinement/images/13_ore_14.png')";
    statusCard.appendChild(statusIcon);

    const statusMeta = document.createElement("div");
    statusMeta.className = "refSafeStatusMeta";
    const cargoSeprom = Math.max(0, parseInt(cargo.seprom, 10) || 0);
    const freeSafe = Math.max(0, safeState.capacity - safeState.stored);
    const safeValue = value => safeLoaded ? value : "...";

    const lines = [ {
        label: "Cargo Seprom",
        value: formatOreCount(cargoSeprom)
    }, {
        label: "Safe Seprom",
        value: safeValue(formatOreCount(safeState.stored))
    }, {
        label: "Seprom Safe Level",
        value: safeValue(String(safeState.level))
    }, {
        label: "Capacity",
        value: safeValue(formatOreCount(safeState.capacity))
    }, {
        label: "Free Space",
        value: safeValue(formatOreCount(freeSafe))
    } ];

    lines.forEach(entry => {
        const line = document.createElement("div");
        line.className = "refSafeStatLine";
        const label = document.createElement("span");
        label.className = "refSafeStatLabel";
        label.textContent = entry.label;
        const value = document.createElement("span");
        value.className = "refSafeStatValue";
        value.textContent = entry.value;
        line.appendChild(label);
        line.appendChild(value);
        statusMeta.appendChild(line);
    });
    statusCard.appendChild(statusMeta);
    panel.appendChild(statusCard);

    const actionPanel = document.createElement("div");
    actionPanel.className = "refSafeActionPanel";

    const actionTitle = document.createElement("div");
    actionTitle.className = "refSafeActionTitle";
    actionTitle.textContent = "Seprom Transfer";
    actionPanel.appendChild(actionTitle);

    const actionInfo = document.createElement("div");
    actionInfo.className = "refSafeActionInfo";
    actionInfo.textContent = hasTradeAccess ? "Move Seprom between your ship cargo and the safe." : "Move Seprom between your ship cargo and the safe. Available only inside the station trade zone.";
    actionPanel.appendChild(actionInfo);

    const actions = document.createElement("div");
    actions.className = "refSafeActionButtons";

    const depositMax = safeLoaded && hasTradeAccess ? Math.min(cargoSeprom, Math.max(0, safeState.capacity - safeState.stored)) : 0;
    const currentCargo = Number.isFinite(window.heroCargo) ? window.heroCargo : null;
    const currentMaxCargo = Number.isFinite(window.heroMaxCargo) ? window.heroMaxCargo : null;
    const safeWithdrawSpace = currentMaxCargo !== null && currentCargo !== null ? Math.max(0, currentMaxCargo - currentCargo) : safeState.stored;
    const withdrawMax = safeLoaded && hasTradeAccess ? Math.min(safeState.stored, safeWithdrawSpace) : 0;

    const depositBtn = document.createElement("button");
    depositBtn.className = "refSafeButton";
    depositBtn.textContent = `Deposit (${formatOreCount(depositMax)})`;
    depositBtn.disabled = !safeLoaded || !hasTradeAccess || depositMax <= 0 || safeState.capacity <= 0;
    bindBitmapStates(depositBtn, REFINEMENT_BITMAP_STATES.button);
    depositBtn.addEventListener("click", () => openSafeAmountPrompt("DEPOSIT", depositMax));
    actions.appendChild(depositBtn);

    const withdrawBtn = document.createElement("button");
    withdrawBtn.className = "refSafeButton";
    withdrawBtn.textContent = `Withdraw (${formatOreCount(withdrawMax)})`;
    withdrawBtn.disabled = !safeLoaded || !hasTradeAccess || withdrawMax <= 0 || safeState.capacity <= 0;
    bindBitmapStates(withdrawBtn, REFINEMENT_BITMAP_STATES.button);
    withdrawBtn.addEventListener("click", () => openSafeAmountPrompt("WITHDRAW", withdrawMax));
    actions.appendChild(withdrawBtn);

    actionPanel.appendChild(actions);

    const actionFootnote = document.createElement("div");
    actionFootnote.className = "refSafeActionFootnote";
    actionFootnote.textContent = hasTradeAccess ? "Only Seprom can be stored in the Safe." : "Go to the station trade zone to unlock, deposit or withdraw Seprom.";
    actionPanel.appendChild(actionFootnote);
    panel.appendChild(actionPanel);

    const levels = document.createElement("div");
    levels.className = "refSafeLevels";

    const maxSafeLevel = SEPROM_SAFE_LEVELS.length ? SEPROM_SAFE_LEVELS[SEPROM_SAFE_LEVELS.length - 1].level : 3;
    const isAtMaxSafeLevel = safeLoaded && safeState.level >= maxSafeLevel;

    SEPROM_SAFE_LEVELS.forEach(cfg => {
        const card = document.createElement("div");
        card.className = "refSafeLevelCard";

        const head = document.createElement("div");
        head.className = "refSafeLevelHead";
        head.textContent = `Level ${cfg.level}`;
        card.appendChild(head);

        const meta = document.createElement("div");
        meta.className = "refSafeLevelMeta";
        meta.innerHTML = `Unlock: <b>${formatOreCount(cfg.cost)}</b> Uridium<br>Capacity: <b>${formatOreCount(cfg.capacity)}</b> Seprom`;
        card.appendChild(meta);

        const status = document.createElement("div");
        status.className = "refSafeLevelStatus";
        const isCurrent = safeLoaded && safeState.level === cfg.level;
        const isUnlocked = safeLoaded && safeState.level > cfg.level;
        const isMaxCard = safeLoaded && isAtMaxSafeLevel && cfg.level === maxSafeLevel;
        const isCompletedForMax = safeLoaded && isAtMaxSafeLevel && cfg.level < maxSafeLevel;
        const canUnlock = safeLoaded && !isAtMaxSafeLevel && safeState.level + 1 === cfg.level;
        const currentUridium = Number.isFinite(window.heroUridium) ? window.heroUridium : null;
        const enoughUri = currentUridium === null || currentUridium >= cfg.cost;

        if (isCompletedForMax) card.classList.add("is-completed");
        if (isMaxCard) card.classList.add("is-max");
        else if (canUnlock) card.classList.add("is-next");
        else if (safeLoaded && !isCurrent && !isUnlocked) card.classList.add("is-locked");

        if (!safeLoaded) status.textContent = "Loading..."; else if (isMaxCard) status.textContent = "Maximum Level Reached"; else if (isCompletedForMax) status.textContent = "Completed"; else if (isUnlocked) status.textContent = "Unlocked"; else if (isCurrent) status.textContent = "Current Level"; else if (!hasTradeAccess) status.textContent = "Go to Station"; else if (canUnlock) status.textContent = enoughUri ? "Ready to Unlock" : "Need more Uridium"; else status.textContent = "Locked";
        card.appendChild(status);

        const btn = document.createElement("button");
        btn.className = "refSafeButton";
        if (!safeLoaded) {
            btn.textContent = "Loading";
            btn.disabled = true;
        } else if (isMaxCard) {
            btn.textContent = "Maxed";
            btn.disabled = true;
        } else if (isCurrent) {
            btn.textContent = "Current";
            btn.disabled = true;
        } else if (isCompletedForMax) {
            btn.textContent = "Completed";
            btn.disabled = true;
        } else if (isUnlocked) {
            btn.textContent = "Unlocked";
            btn.disabled = true;
        } else {
            btn.textContent = hasTradeAccess ? "Unlock" : "Station";
            btn.disabled = !hasTradeAccess || !canUnlock || !enoughUri;
        }
        bindBitmapStates(btn, REFINEMENT_BITMAP_STATES.button);
        btn.addEventListener("click", () => {
            if (!btn.disabled && typeof sendLabSafeUnlock === "function") sendLabSafeUnlock(cfg.level);
        });
        card.appendChild(btn);

        levels.appendChild(card);
    });

    panel.appendChild(levels);

    if (!safeLoaded) {
        const note = document.createElement("div");
        note.className = "refSafeDisabledNote";
        note.textContent = "Safe status is loading from the server...";
        panel.appendChild(note);
    } else if (safeState.capacity <= 0) {
        const note = document.createElement("div");
        note.className = "refSafeDisabledNote";
        note.textContent = "Unlock the Safe to protect your Seprom from cargo loss on death.";
        panel.appendChild(note);
    }

    container.innerHTML = "";
    container.appendChild(panel);
}

function getFlashWindowShellRefs(key) {
    const content = document.getElementById("content_" + key);
    const win = document.getElementById("win_" + key);
    return {
        content: content,
        win: win
    };
}

function debugFlashWindowGeometry(keys) {
    if (!window.FLASH_PARITY_DEBUG) return;
    (keys || []).forEach(key => {
        const {content: content, win: win} = getFlashWindowShellRefs(key);
        const interior = win ? win.querySelector(".windowInterior") : null;
        const gw = win ? win.querySelector(".gwContent") : null;
        if (!win || !content) {
            console.warn("[FLASH_PARITY] geometry: missing shell/content", key, {
                hasWin: !!win,
                hasContent: !!content
            });
            return;
        }
        const rectOf = el => {
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return {
                x: Math.round(r.x),
                y: Math.round(r.y),
                w: Math.round(r.width),
                h: Math.round(r.height)
            };
        };
        const styleOf = el => {
            if (!el) return null;
            const s = window.getComputedStyle(el);
            return {
                display: s.display,
                position: s.position,
                width: s.width,
                height: s.height,
                overflow: s.overflow,
                opacity: s.opacity,
                visibility: s.visibility,
                zIndex: s.zIndex,
                pointerEvents: s.pointerEvents
            };
        };
        const winRect = win.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();
        const winStyle = window.getComputedStyle(win);
        const contentStyle = window.getComputedStyle(content);
        console.log("[FLASH_PARITY] geometry", key, {
            winRect: {
                x: Math.round(winRect.x),
                y: Math.round(winRect.y),
                w: Math.round(winRect.width),
                h: Math.round(winRect.height)
            },
            contentRect: {
                x: Math.round(contentRect.x),
                y: Math.round(contentRect.y),
                w: Math.round(contentRect.width),
                h: Math.round(contentRect.height)
            },
            winStyle: {
                zIndex: winStyle.zIndex,
                overflow: winStyle.overflow,
                opacity: winStyle.opacity,
                display: winStyle.display,
                visibility: winStyle.visibility,
                position: winStyle.position
            },
            contentStyle: {
                zIndex: contentStyle.zIndex,
                overflow: contentStyle.overflow,
                opacity: contentStyle.opacity,
                display: contentStyle.display,
                visibility: contentStyle.visibility,
                position: contentStyle.position
            },
            parentChain: {
                win: {
                    rect: rectOf(win),
                    style: styleOf(win)
                },
                windowInterior: {
                    rect: rectOf(interior),
                    style: styleOf(interior)
                },
                gwContent: {
                    rect: rectOf(gw),
                    style: styleOf(gw)
                },
                content: {
                    rect: rectOf(content),
                    style: styleOf(content)
                }
            }
        });
    });
}

function auditMinimapPointerStack(clientX, clientY) {
    const x = Number.isFinite(clientX) ? clientX : null;
    const y = Number.isFinite(clientY) ? clientY : null;
    const mapWin = document.getElementById("win_map");
    if (!mapWin) return null;
    const mapRect = mapWin.getBoundingClientRect();
    const sampleX = x !== null ? x : Math.round(mapRect.left + mapRect.width / 2);
    const sampleY = y !== null ? y : Math.round(mapRect.top + mapRect.height / 2);
    const stack = typeof document.elementsFromPoint === "function" ? document.elementsFromPoint(sampleX, sampleY) : [];
    const report = stack.map(el => {
        const s = window.getComputedStyle(el);
        return {
            tag: el.tagName,
            id: el.id || null,
            className: el.className || null,
            pointerEvents: s.pointerEvents,
            zIndex: s.zIndex,
            position: s.position
        };
    });
    if (window.FLASH_PARITY_DEBUG) {
        console.log("[FLASH_PARITY] minimap pointer stack", {
            point: {
                x: sampleX,
                y: sampleY
            },
            report: report
        });
    }
    return report;
}

window.auditMinimapPointerStack = auditMinimapPointerStack;

function syncFlashWindowContentBounds(winEl) {
    if (!winEl) return;
    const isResizable = String(winEl.dataset.flashResizable || "") === "1";
    const baseW = parseInt(winEl.dataset.flashBaseWidth || "", 10);
    const baseH = parseInt(winEl.dataset.flashBaseHeight || "", 10);
    if (!isResizable && Number.isFinite(baseW) && Number.isFinite(baseH) && baseW > 0 && baseH > 0) {
        if (winEl.style.width !== `${baseW}px`) winEl.style.width = `${baseW}px`;
        if (winEl.style.height !== `${baseH}px`) winEl.style.height = `${baseH}px`;
    }
    const interior = winEl.querySelector(".windowInterior");
    const content = winEl.querySelector(".gwContent");
    const header = winEl.querySelector(".gwHeader");
    if (!interior || !content) return;
    const reserveHeader = parseInt(winEl.dataset.flashHeaderReserve || "", 10);
    const contentTop = Math.max(0, Math.round(Number.isFinite(reserveHeader) && reserveHeader >= 0 ? reserveHeader : header ? header.offsetTop + header.offsetHeight : 0));
    const width = Math.max(1, Math.round(interior.clientWidth));
    const height = Math.max(1, Math.round(interior.clientHeight - contentTop));
    content.style.left = "0px";
    content.style.top = contentTop + "px";
    content.style.width = width + "px";
    content.style.height = height + "px";
    if (window.FLASH_PARITY_DEBUG) {
        const key = winEl.dataset.windowKey || winEl.id || "unknown";
        const meta = typeof getFlashWindowMeta === "function" ? getFlashWindowMeta(key) : null;
        const wr = winEl.getBoundingClientRect();
        const cr = content.getBoundingClientRect();
        const styleWin = window.getComputedStyle(winEl);
        const styleContent = window.getComputedStyle(content);
        console.log("[FLASH_PARITY] content bounds applied", key, {
            targetGameXml: meta ? {
                width0: meta.width0,
                height0: meta.height0,
                width1: meta.width1,
                height1: meta.height1
            } : null,
            winRect: {
                w: Math.round(wr.width),
                h: Math.round(wr.height)
            },
            winStyle: {
                width: styleWin.width,
                height: styleWin.height
            },
            interiorRect: {
                w: interior.clientWidth,
                h: interior.clientHeight
            },
            gwRect: {
                w: Math.round(cr.width),
                h: Math.round(cr.height)
            },
            gwStyle: {
                width: styleContent.width,
                height: styleContent.height
            },
            appliedInsets: {
                left: 0,
                top: contentTop,
                right: 0,
                bottom: Math.max(0, interior.clientHeight - (contentTop + height))
            }
        });
    }
}

function verifyFlashWindowContentRects(keys) {
    if (!window.FLASH_PARITY_DEBUG) return;
    (keys || []).forEach(key => {
        const win = document.getElementById("win_" + key);
        const gw = win ? win.querySelector(".gwContent") : null;
        const content = document.getElementById("content_" + key);
        if (!win || !gw || !content) return;
        const wr = win.getBoundingClientRect();
        const gr = gw.getBoundingClientRect();
        const cr = content.getBoundingClientRect();
        const bad = gr.width <= 0 || gr.height <= 0 || cr.width <= 0 || cr.height <= 0;
        if (bad) {
            console.warn("[FLASH_PARITY] zero-size content detected", key, {
                win: {
                    w: Math.round(wr.width),
                    h: Math.round(wr.height)
                },
                gw: {
                    w: Math.round(gr.width),
                    h: Math.round(gr.height)
                },
                content: {
                    w: Math.round(cr.width),
                    h: Math.round(cr.height)
                }
            });
        }
    });
}

function ensureRefiningWindow() {
    if (refiningWindowElement) return refiningWindowElement;
    const {content: content, win: win} = getFlashWindowShellRefs("refinement");
    if (!content || !win) return null;
    refiningWindowElement = content;
    content.innerHTML = `\n        <div class="refiningTabs">\n            <button class="refTab active" data-tab="refine">${flashLocaleText("lab_btn_refinement", "")}</button>\n            <button class="refTab" data-tab="upgrade">${flashLocaleText("lab_btn_update", "")}</button>\n            <button class="refTab" data-tab="safe">Safe</button>\n        </div>\n        <div class="refiningBody">\n            <div class="refPage active" data-tab="refine"></div>\n            <div class="refPage" data-tab="upgrade"></div>\n            <div class="refPage" data-tab="safe"></div>\n        </div>\n    `;
    content.querySelectorAll(".refTab").forEach(btn => {
        bindBitmapStates(btn, REFINEMENT_BITMAP_STATES.tab, () => btn.classList.contains("active"));
        btn.addEventListener("click", () => {
            const nextTab = btn.getAttribute("data-tab");
            if (nextTab === "safe" && typeof sendLabSafeGet === "function") sendLabSafeGet();
            setRefiningTab(nextTab);
        });
    });
    const refinePage = content.querySelector('.refPage[data-tab="refine"]');
    if (refinePage) renderRefiningTab(refinePage);
    const upgradePage = content.querySelector('.refPage[data-tab="upgrade"]');
    if (upgradePage) renderUpgradeTab(upgradePage);
    const safePage = content.querySelector('.refPage[data-tab="safe"]');
    if (safePage) renderSafeTab(safePage);
    setRefiningTab(refiningActiveTab);
    return refiningWindowElement;
}

function setRefiningTab(tab) {
    refiningActiveTab = tab;
    if (!refiningWindowElement) return;
    refiningWindowElement.querySelectorAll(".refTab").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-tab") === tab);
    });
    refiningWindowElement.querySelectorAll(".refPage").forEach(page => {
        page.classList.toggle("active", page.getAttribute("data-tab") === tab);
    });
    if (tab === "refine") {
        const page = refiningWindowElement.querySelector('.refPage[data-tab="refine"]');
        if (page) renderRefiningTab(page);
    } else if (tab === "upgrade") {
        const page = refiningWindowElement.querySelector('.refPage[data-tab="upgrade"]');
        if (page) renderUpgradeTab(page);
    } else {
        const page = refiningWindowElement.querySelector('.refPage[data-tab="safe"]');
        if (page) renderSafeTab(page);
    }
}

function isRefiningRefreshScopeVisible(scope) {
    if (scope === "safe") return refiningActiveTab === "safe";
    if (scope === "upgrade") return refiningActiveTab === "upgrade";
    return true;
}

function getRefiningActiveTabSignature() {
    if (refiningActiveTab === "safe") {
        return JSON.stringify({
            cargo: getOreCargoSnapshot(),
            safe: window.labSafeState || null,
            trade: hasSafeTradeAccess() ? 1 : 0,
            uridium: Number.isFinite(window.heroUridium) ? window.heroUridium : null
        });
    }
    return JSON.stringify({
        cargo: getOreCargoSnapshot(),
        tab: refiningActiveTab
    });
}

function refreshRefiningWindow(force = false, scope = "all") {
    if (!refiningWindowElement || !windowStates || !windowStates.refinement) return;
    if (!isRefiningRefreshScopeVisible(scope)) return;
    if (refiningActiveTab === "upgrade" && isRefiningUpgradeDragActive()) {
        scheduleRefiningRefreshAfterDrag(force, scope);
        return;
    }
    const sig = JSON.stringify({
        active: refiningActiveTab,
        state: getRefiningActiveTabSignature()
    });
    if (!force && sig === refiningLastCargoSig) return;
    refiningLastCargoSig = sig;
    setRefiningTab(refiningActiveTab);
}

function openRefiningWindow() {
    const content = ensureRefiningWindow();
    if (!content) return;
    if (!window.labSafeState || window.labSafeState.loaded !== true) {
        window.labSafeState = {
            loaded: false,
            level: 0,
            stored: 0,
            capacity: 0
        };
    }
    windowStates.refinement = true;
    persistCurrentFlashWindowSettingsLocally();
    sendCurrentFlashWindowSettingsToServer();
    if (typeof refreshWindowsVisibility === "function") refreshWindowsVisibility();
    if (typeof bringWindowToFront === "function") bringWindowToFront(getFlashWindowShellRefs("refinement").win || "refinement");
    if (typeof sendLabSafeGet === "function") sendLabSafeGet();
    refreshRefiningWindow(true);
    startRefiningPoll();
}

function closeRefiningWindow() {
    stopRefiningPoll();
    windowStates.refinement = false;
    persistCurrentFlashWindowSettingsLocally();
    sendCurrentFlashWindowSettingsToServer();
    if (typeof refreshWindowsVisibility === "function") refreshWindowsVisibility();
    closeRefinePrompt();
    closeUpgradePrompt();
    closeSafePrompt();
}

function initRefiningButton() {
    ensureFlashTopUtilityButton("refinement");
}

const FLASH_SPACEMAP_PAGE_MAPS = {
    0: [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 ],
    1: [ 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28 ]
};

const FLASH_SPACEMAP_MAP_POSITIONS = {
    "0": {
        "1": {
            "x": 1,
            "y": 186
        },
        "2": {
            "x": 108,
            "y": 186
        },
        "3": {
            "x": 205,
            "y": 137
        },
        "4": {
            "x": 205,
            "y": 236
        },
        "5": {
            "x": 507,
            "y": 1
        },
        "6": {
            "x": 409,
            "y": 39
        },
        "7": {
            "x": 304,
            "y": 88
        },
        "8": {
            "x": 509,
            "y": 98
        },
        "9": {
            "x": 507,
            "y": 376
        },
        "10": {
            "x": 408,
            "y": 327
        },
        "11": {
            "x": 509,
            "y": 193
        },
        "12": {
            "x": 302,
            "y": 284
        },
        "13": {
            "x": 303,
            "y": 183
        },
        "14": {
            "x": 399,
            "y": 152
        },
        "15": {
            "x": 402,
            "y": 220
        }
    },
    "1": {
        "16": {
            "x": 210,
            "y": 108
        },
        "17": {
            "x": 116,
            "y": 165
        },
        "18": {
            "x": 42,
            "y": 92
        },
        "19": {
            "x": 42,
            "y": 238
        },
        "20": {
            "x": 0,
            "y": 165
        },
        "21": {
            "x": 396,
            "y": 165
        },
        "22": {
            "x": 470,
            "y": 92
        },
        "23": {
            "x": 470,
            "y": 238
        },
        "24": {
            "x": 512,
            "y": 165
        },
        "25": {
            "x": 351,
            "y": 275
        },
        "26": {
            "x": 272,
            "y": 338
        },
        "27": {
            "x": 432,
            "y": 338
        },
        "28": {
            "x": 352,
            "y": 378
        }
    }
};

const FLASH_SPACEMAP_MAP_LABELS = {
    "1": "1-1",
    "2": "1-2",
    "3": "1-3",
    "4": "1-4",
    "5": "2-1",
    "6": "2-2",
    "7": "2-3",
    "8": "2-4",
    "9": "3-1",
    "10": "3-2",
    "11": "3-3",
    "12": "3-4",
    "13": "4-1",
    "14": "4-2",
    "15": "4-3",
    "16": "4-4",
    "17": "1-5",
    "18": "1-6",
    "19": "1-7",
    "20": "1-8",
    "21": "2-5",
    "22": "2-6",
    "23": "2-7",
    "24": "2-8",
    "25": "3-5",
    "26": "3-6",
    "27": "3-7",
    "28": "3-8"
};

const FLASH_SPACEMAP_PORTAL_EDGES = {
    "0": [
        {
            "fromMap": 1,
            "toMap": 2,
            "fromPortal": {
                "id": 1,
                "x": 190,
                "y": 110
            },
            "toPortal": {
                "id": 2,
                "x": 20,
                "y": 20
            }
        },
        {
            "fromMap": 2,
            "toMap": 3,
            "fromPortal": {
                "id": 3,
                "x": 190,
                "y": 20
            },
            "toPortal": {
                "id": 4,
                "x": 20,
                "y": 110
            }
        },
        {
            "fromMap": 2,
            "toMap": 4,
            "fromPortal": {
                "id": 5,
                "x": 190,
                "y": 110
            },
            "toPortal": {
                "id": 6,
                "x": 20,
                "y": 20
            }
        },
        {
            "fromMap": 3,
            "toMap": 4,
            "fromPortal": {
                "id": 7,
                "x": 190,
                "y": 110
            },
            "toPortal": {
                "id": 8,
                "x": 190,
                "y": 20
            }
        },
        {
            "fromMap": 3,
            "toMap": 7,
            "fromPortal": {
                "id": 9,
                "x": 190,
                "y": 20
            },
            "toPortal": {
                "id": 300,
                "x": 20,
                "y": 110
            }
        },
        {
            "fromMap": 12,
            "toMap": 4,
            "fromPortal": {
                "id": 30,
                "x": 20,
                "y": 20
            },
            "toPortal": {
                "id": 100,
                "x": 190,
                "y": 110
            }
        },
        {
            "fromMap": 4,
            "toMap": 13,
            "fromPortal": {
                "id": 11,
                "x": 190,
                "y": 65
            },
            "toPortal": {
                "id": 12,
                "x": 20,
                "y": 65
            }
        },
        {
            "fromMap": 5,
            "toMap": 6,
            "fromPortal": {
                "id": 13,
                "x": 20,
                "y": 110
            },
            "toPortal": {
                "id": 14,
                "x": 190,
                "y": 20
            }
        },
        {
            "fromMap": 7,
            "toMap": 6,
            "fromPortal": {
                "id": 101,
                "x": 190,
                "y": 20
            },
            "toPortal": {
                "id": 103,
                "x": 20,
                "y": 110
            }
        },
        {
            "fromMap": 6,
            "toMap": 8,
            "fromPortal": {
                "id": 17,
                "x": 190,
                "y": 110
            },
            "toPortal": {
                "id": 21,
                "x": 20,
                "y": 20
            }
        },
        {
            "fromMap": 7,
            "toMap": 8,
            "fromPortal": {
                "id": 16,
                "x": 190,
                "y": 110
            },
            "toPortal": {
                "id": 20,
                "x": 190,
                "y": 20
            }
        },
        {
            "fromMap": 11,
            "toMap": 8,
            "fromPortal": {
                "id": 36,
                "x": 20,
                "y": 20
            },
            "toPortal": {
                "id": 102,
                "x": 20,
                "y": 110
            }
        },
        {
            "fromMap": 8,
            "toMap": 14,
            "fromPortal": {
                "id": 24,
                "x": 105,
                "y": 110
            },
            "toPortal": {
                "id": 25,
                "x": 105,
                "y": 20
            }
        },
        {
            "fromMap": 9,
            "toMap": 10,
            "fromPortal": {
                "id": 26,
                "x": 20,
                "y": 20
            },
            "toPortal": {
                "id": 27,
                "x": 190,
                "y": 110
            }
        },
        {
            "fromMap": 10,
            "toMap": 11,
            "fromPortal": {
                "id": 29,
                "x": 190,
                "y": 20
            },
            "toPortal": {
                "id": 35,
                "x": 190,
                "y": 110
            }
        },
        {
            "fromMap": 10,
            "toMap": 12,
            "fromPortal": {
                "id": 28,
                "x": 20,
                "y": 20
            },
            "toPortal": {
                "id": 33,
                "x": 190,
                "y": 110
            }
        },
        {
            "fromMap": 12,
            "toMap": 11,
            "fromPortal": {
                "id": 32,
                "x": 190,
                "y": 20
            },
            "toPortal": {
                "id": 34,
                "x": 20,
                "y": 110
            }
        },
        {
            "fromMap": 12,
            "toMap": 15,
            "fromPortal": {
                "id": 31,
                "x": 105,
                "y": 20
            },
            "toPortal": {
                "id": 38,
                "x": 190,
                "y": 65
            }
        },
        {
            "fromMap": 14,
            "toMap": 13,
            "fromPortal": {
                "id": 104,
                "x": 20,
                "y": 110
            },
            "toPortal": {
                "id": 105,
                "x": 190,
                "y": 20
            }
        },
        {
            "fromMap": 15,
            "toMap": 13,
            "fromPortal": {
                "id": 44,
                "x": 20,
                "y": 110
            },
            "toPortal": {
                "id": 106,
                "x": 190,
                "y": 110
            }
        },
        {
            "fromMap": 15,
            "toMap": 14,
            "fromPortal": {
                "id": 37,
                "x": 20,
                "y": 20
            },
            "toPortal": {
                "id": 42,
                "x": 190,
                "y": 110
            }
        }
    ],
    "1": [
        {
            "fromMap": 16,
            "toMap": 17,
            "fromPortal": {
                "id": 46,
                "x": 40,
                "y": 130
            },
            "toPortal": {
                "id": 52,
                "x": 190,
                "y": 65
            }
        },
        {
            "fromMap": 16,
            "toMap": 21,
            "fromPortal": {
                "id": 48,
                "x": 380,
                "y": 40
            },
            "toPortal": {
                "id": 49,
                "x": 20,
                "y": 110
            }
        },
        {
            "fromMap": 16,
            "toMap": 25,
            "fromPortal": {
                "id": 50,
                "x": 380,
                "y": 220
            },
            "toPortal": {
                "id": 51,
                "x": 20,
                "y": 20
            }
        },
        {
            "fromMap": 17,
            "toMap": 18,
            "fromPortal": {
                "id": 303,
                "x": 20,
                "y": 20
            },
            "toPortal": {
                "id": 304,
                "x": 190,
                "y": 110
            }
        },
        {
            "fromMap": 17,
            "toMap": 19,
            "fromPortal": {
                "id": 305,
                "x": 20,
                "y": 110
            },
            "toPortal": {
                "id": 306,
                "x": 190,
                "y": 20
            }
        },
        {
            "fromMap": 18,
            "toMap": 20,
            "fromPortal": {
                "id": 53,
                "x": 20,
                "y": 110
            },
            "toPortal": {
                "id": 57,
                "x": 190,
                "y": 20
            }
        },
        {
            "fromMap": 19,
            "toMap": 20,
            "fromPortal": {
                "id": 54,
                "x": 20,
                "y": 20
            },
            "toPortal": {
                "id": 56,
                "x": 190,
                "y": 110
            }
        },
        {
            "fromMap": 21,
            "toMap": 22,
            "fromPortal": {
                "id": 400,
                "x": 20,
                "y": 20
            },
            "toPortal": {
                "id": 401,
                "x": 20,
                "y": 110
            }
        },
        {
            "fromMap": 21,
            "toMap": 23,
            "fromPortal": {
                "id": 402,
                "x": 190,
                "y": 20
            },
            "toPortal": {
                "id": 403,
                "x": 20,
                "y": 110
            }
        },
        {
            "fromMap": 22,
            "toMap": 24,
            "fromPortal": {
                "id": 61,
                "x": 190,
                "y": 20
            },
            "toPortal": {
                "id": 65,
                "x": 20,
                "y": 110
            }
        },
        {
            "fromMap": 24,
            "toMap": 23,
            "fromPortal": {
                "id": 62,
                "x": 190,
                "y": 110
            },
            "toPortal": {
                "id": 63,
                "x": 190,
                "y": 20
            }
        },
        {
            "fromMap": 26,
            "toMap": 25,
            "fromPortal": {
                "id": 67,
                "x": 20,
                "y": 20
            },
            "toPortal": {
                "id": 72,
                "x": 20,
                "y": 110
            }
        },
        {
            "fromMap": 25,
            "toMap": 27,
            "fromPortal": {
                "id": 73,
                "x": 190,
                "y": 110
            },
            "toPortal": {
                "id": 74,
                "x": 20,
                "y": 110
            }
        },
        {
            "fromMap": 26,
            "toMap": 28,
            "fromPortal": {
                "id": 404,
                "x": 190,
                "y": 110
            },
            "toPortal": {
                "id": 405,
                "x": 20,
                "y": 110
            }
        },
        {
            "fromMap": 28,
            "toMap": 27,
            "fromPortal": {
                "id": 71,
                "x": 20,
                "y": 20
            },
            "toPortal": {
                "id": 406,
                "x": 190,
                "y": 110
            }
        }
    ]
};

const FLASH_SPACEMAP_LAYOUT = Object.freeze({
    canvas: Object.freeze({ width: 592, height: 428 }),
    outer: Object.freeze({ width: 640, height: 520 })
});

const FLASH_SPACEMAP_RENDER_STATE = {
    page: null,
    userSelectedPage: false,
    lastMapId: null
};

const FLASH_SPACEMAP_ASSET_BASE = "graphics/ui/spacemap/images";

function getFlashSpacemapCurrentMapId() {
    const fromCurrent = typeof currentMapId !== "undefined" && currentMapId !== null ? parseInt(currentMapId, 10) : NaN;
    if (Number.isFinite(fromCurrent) && FLASH_SPACEMAP_MAP_LABELS[fromCurrent]) return fromCurrent;
    const fallbackCfg = typeof cfg !== "undefined" && cfg && cfg.mapID != null ? parseInt(cfg.mapID, 10) : NaN;
    if (Number.isFinite(fallbackCfg) && FLASH_SPACEMAP_MAP_LABELS[fallbackCfg]) return fallbackCfg;
    return 1;
}

function getFlashSpacemapPageForMap(mapId) {
    return FLASH_SPACEMAP_PAGE_MAPS[1].includes(Number(mapId)) ? 1 : 0;
}

function getFlashSpacemapSwitchLabel(page) {
    if (page === 0) {
        return flashLocaleText("label_switch_map_to_upper_section", "Show upper maps") || "Show upper maps";
    }
    return flashLocaleText("label_switch_map_to_lower_section", "Show lower maps") || "Show lower maps";
}

function getFlashSpacemapMapLabel(mapId) {
    return FLASH_SPACEMAP_MAP_LABELS[mapId] || String(mapId || "—");
}

function getFlashSpacemapMapSize(mapId) {
    return mapId === 16 ? { width: 170, height: 106 } : { width: 80, height: 50 };
}

function getFlashSpacemapPortalBaseSize(mapId) {
    return mapId === 16 ? { width: 420, height: 260 } : { width: 210, height: 130 };
}

function getFlashSpacemapMapPosition(pageIndex, mapId) {
    const pagePositions = FLASH_SPACEMAP_MAP_POSITIONS[String(pageIndex)] || FLASH_SPACEMAP_MAP_POSITIONS[pageIndex] || {};
    return pagePositions[String(mapId)] || pagePositions[mapId] || { x: 0, y: 0 };
}

function getFlashSpacemapAssetUrl(fileName) {
    const rawPath = `${FLASH_SPACEMAP_ASSET_BASE}/${fileName}`;
    if (typeof resolveUiImageUrl === "function") {
        const resolved = resolveUiImageUrl(rawPath);
        if (resolved) return resolved;
    }
    return rawPath;
}

function getFlashSpacemapMapRect(pageIndex, mapId) {
    const pos = getFlashSpacemapMapPosition(pageIndex, mapId);
    const size = getFlashSpacemapMapSize(mapId);
    return {
        x: pos.x,
        y: pos.y,
        width: size.width,
        height: size.height
    };
}

function getFlashSpacemapPortalAnchor(pageIndex, mapId, portal) {
    const rect = getFlashSpacemapMapRect(pageIndex, mapId);
    const base = getFlashSpacemapPortalBaseSize(mapId);
    const ratioX = Math.min(1, Math.max(0, Number(portal && portal.x) / Math.max(1, base.width)));
    const ratioY = Math.min(1, Math.max(0, Number(portal && portal.y) / Math.max(0.0001, base.height)));
    return {
        x: rect.x + ratioX * rect.width,
        y: rect.y + ratioY * rect.height
    };
}

function getFlashSpacemapPortalDirection(mapId, portal) {
    const base = getFlashSpacemapPortalBaseSize(mapId);
    const nx = Math.min(1, Math.max(0, Number(portal && portal.x) / Math.max(1, base.width)));
    const ny = Math.min(1, Math.max(0, Number(portal && portal.y) / Math.max(1, base.height)));
    const distances = [
        { side: "left", value: nx },
        { side: "right", value: 1 - nx },
        { side: "top", value: ny },
        { side: "bottom", value: 1 - ny }
    ].sort((a, b) => a.value - b.value);
    return distances[0] ? distances[0].side : "right";
}

function getFlashSpacemapStubPoint(anchor, direction, distance) {
    const d = Number.isFinite(distance) ? distance : 10;
    if (direction === "left") return { x: anchor.x - d, y: anchor.y };
    if (direction === "right") return { x: anchor.x + d, y: anchor.y };
    if (direction === "top") return { x: anchor.x, y: anchor.y - d };
    return { x: anchor.x, y: anchor.y + d };
}

function buildFlashSpacemapEdgePath(startAnchor, startDirection, endAnchor, endDirection) {
    const s1 = getFlashSpacemapStubPoint(startAnchor, startDirection, 10);
    const e1 = getFlashSpacemapStubPoint(endAnchor, endDirection, 10);
    const horizontalDominant = Math.abs(e1.x - s1.x) >= Math.abs(e1.y - s1.y);
    if (horizontalDominant) {
        const midX = Math.round((s1.x + e1.x) / 2);
        return `M ${startAnchor.x.toFixed(2)} ${startAnchor.y.toFixed(2)} L ${s1.x.toFixed(2)} ${s1.y.toFixed(2)} L ${midX.toFixed(2)} ${s1.y.toFixed(2)} L ${midX.toFixed(2)} ${e1.y.toFixed(2)} L ${e1.x.toFixed(2)} ${e1.y.toFixed(2)} L ${endAnchor.x.toFixed(2)} ${endAnchor.y.toFixed(2)}`;
    }
    const midY = Math.round((s1.y + e1.y) / 2);
    return `M ${startAnchor.x.toFixed(2)} ${startAnchor.y.toFixed(2)} L ${s1.x.toFixed(2)} ${s1.y.toFixed(2)} L ${s1.x.toFixed(2)} ${midY.toFixed(2)} L ${e1.x.toFixed(2)} ${midY.toFixed(2)} L ${e1.x.toFixed(2)} ${e1.y.toFixed(2)} L ${endAnchor.x.toFixed(2)} ${endAnchor.y.toFixed(2)}`;
}

function renderFlashSpacemapPageEdges(pageIndex) {
    const pageEdges = FLASH_SPACEMAP_PORTAL_EDGES[String(pageIndex)] || FLASH_SPACEMAP_PORTAL_EDGES[pageIndex] || [];
    const paths = pageEdges.map(edge => {
        const startAnchor = getFlashSpacemapPortalAnchor(pageIndex, edge.fromMap, edge.fromPortal);
        const endAnchor = getFlashSpacemapPortalAnchor(pageIndex, edge.toMap, edge.toPortal);
        const startDirection = getFlashSpacemapPortalDirection(edge.fromMap, edge.fromPortal);
        const endDirection = getFlashSpacemapPortalDirection(edge.toMap, edge.toPortal);
        const d = buildFlashSpacemapEdgePath(startAnchor, startDirection, endAnchor, endDirection);
        return `<path class="flashSpacemapEdgePath" d="${d}"></path>`;
    }).join("");
    return `<svg class="flashSpacemapEdgeLayer" viewBox="0 0 ${FLASH_SPACEMAP_LAYOUT.canvas.width} ${FLASH_SPACEMAP_LAYOUT.canvas.height}" preserveAspectRatio="none" aria-hidden="true">${paths}</svg>`;
}

function renderFlashSpacemapPageNodes(pageIndex, currentMapId) {
    const pageMaps = FLASH_SPACEMAP_PAGE_MAPS[pageIndex] || [];
    return pageMaps.map(mapId => {
        const pos = getFlashSpacemapMapPosition(pageIndex, mapId);
        const size = getFlashSpacemapMapSize(mapId);
        const classes = [ "flashSpacemapMapNode" ];
        if (mapId === currentMapId) classes.push("is-current");
        return `<div class="${classes.join(" ")}" data-map-id="${mapId}" style="left:${pos.x}px;top:${pos.y}px;width:${size.width}px;height:${size.height}px;" title="${getFlashSpacemapMapLabel(mapId)}"><span class="flashSpacemapMapArt" style="background-image:url('${getFlashSpacemapAssetUrl(`map_${mapId}.png`)}')"></span><span class="flashSpacemapMapMarkerCurrent"></span></div>`;
    }).join("");
}

function clampFlashWindowToViewport(winEl, margin) {
    if (!winEl) return;
    const hudW = getCurrentHudLogicalWidth();
    const hudH = getCurrentHudLogicalHeight();
    const styleWidth = parseInt(winEl.style.width || "", 10);
    const styleHeight = parseInt(winEl.style.height || "", 10);
    const rect = winEl.getBoundingClientRect ? winEl.getBoundingClientRect() : null;
    const width = Number.isFinite(styleWidth) && styleWidth > 0 ? styleWidth : rect ? Math.round(rect.width) : winEl.offsetWidth || 0;
    const height = Number.isFinite(styleHeight) && styleHeight > 0 ? styleHeight : rect ? Math.round(rect.height) : winEl.offsetHeight || 0;
    const pad = Number.isFinite(margin) ? margin : 8;
    let left = parseInt(winEl.style.left || "", 10);
    let top = parseInt(winEl.style.top || "", 10);
    if (!Number.isFinite(left)) left = 0;
    if (!Number.isFinite(top)) top = 0;
    const maxLeft = Math.max(pad, hudW - width - pad);
    const maxTop = Math.max(pad, hudH - height - pad);
    left = Math.min(Math.max(left, pad), maxLeft);
    top = Math.min(Math.max(top, pad), maxTop);
    winEl.style.left = `${left}px`;
    winEl.style.top = `${top}px`;
}

function applyFlashSpacemapWindowParity(win) {
    if (!win) return;
    win.classList.add("flashSpacemapUiWindow");
    win.dataset.clampToViewport = "1";
    win.dataset.clampMargin = "4";
    const header = win.querySelector(".gwHeader");
    if (header) {
        header.style.cursor = "move";
    }
    const titleEl = win.querySelector(".gwTitle");
    if (titleEl) {
        titleEl.textContent = flashLocaleText("title_spacemap", "Star system") || "Star system";
    }
    try {
        const runtimeCfg = window.__runtimeWindowsConfig && window.__runtimeWindowsConfig.spacemap && typeof getFlashWindowRuntimeConfig === "function"
            ? getFlashWindowRuntimeConfig("spacemap", window.__runtimeWindowsConfig.spacemap)
            : { w: FLASH_SPACEMAP_LAYOUT.outer.width, h: FLASH_SPACEMAP_LAYOUT.outer.height, flashUseRuntimeOuterSize: true };
        if (typeof enforceFlashWindowBaseSize === "function") {
            enforceFlashWindowBaseSize("spacemap", win, runtimeCfg || {});
        }
        if (typeof syncFlashWindowContentBounds === "function") {
            syncFlashWindowContentBounds(win);
            if (typeof requestAnimationFrame === "function") {
                requestAnimationFrame(() => {
                    syncFlashWindowContentBounds(win);
                    clampFlashWindowToViewport(win, 4);
                });
            }
        }
        clampFlashWindowToViewport(win, 4);
    } catch (_) {}
}

function renderFlashSpacemapWindow(container) {
    if (!container) return false;
    const currentMap = getFlashSpacemapCurrentMapId();
    const state = FLASH_SPACEMAP_RENDER_STATE;
    const currentMapPage = getFlashSpacemapPageForMap(currentMap);
    if (state.page !== 0 && state.page !== 1) {
        state.page = currentMapPage;
        state.userSelectedPage = false;
    } else if (!state.userSelectedPage && state.lastMapId !== currentMap && FLASH_SPACEMAP_MAP_LABELS[currentMap]) {
        state.page = currentMapPage;
    }
    state.lastMapId = currentMap;
    const switchLabel = getFlashSpacemapSwitchLabel(state.page);
    container.innerHTML = `
        <div class="flashSpacemapRoot">
            <button type="button" class="flashSpacemapSwitch">${switchLabel}</button>
            <div class="flashSpacemapCanvas">
                <div class="flashSpacemapPage ${state.page === 0 ? "is-active" : ""}" data-page="0">
                    ${renderFlashSpacemapPageEdges(0)}
                    ${renderFlashSpacemapPageNodes(0, currentMap)}
                </div>
                <div class="flashSpacemapPage ${state.page === 1 ? "is-active" : ""}" data-page="1">
                    ${renderFlashSpacemapPageEdges(1)}
                    ${renderFlashSpacemapPageNodes(1, currentMap)}
                </div>
            </div>
        </div>
    `;
    const switcher = container.querySelector(".flashSpacemapSwitch");
    if (switcher) {
        switcher.addEventListener("click", () => {
            FLASH_SPACEMAP_RENDER_STATE.page = FLASH_SPACEMAP_RENDER_STATE.page === 0 ? 1 : 0;
            FLASH_SPACEMAP_RENDER_STATE.userSelectedPage = true;
            renderFlashSpacemapWindow(container);
        });
    }
    const win = document.getElementById("win_spacemap");
    if (win) {
        applyFlashSpacemapWindowParity(win);
    }
    return true;
}

function createSpacemapWindowContent() {
    const container = document.getElementById("content_spacemap");
    if (!container) return;
    container.dataset.flashSpacemapContent = "1";
    const win = document.getElementById("win_spacemap");
    if (win) {
        applyFlashSpacemapWindowParity(win);
    }
    try {
        FLASH_SPACEMAP_RENDER_STATE.page = getFlashSpacemapPageForMap(getFlashSpacemapCurrentMapId());
        FLASH_SPACEMAP_RENDER_STATE.userSelectedPage = false;
        FLASH_SPACEMAP_RENDER_STATE.lastMapId = getFlashSpacemapCurrentMapId();
        renderFlashSpacemapWindow(container);
    } catch (e) {
        console.error("[SPACEMAP] renderFlashSpacemapWindow failed", e);
    }
}

function refreshFlashSpacemapWindow() {
    const container = document.getElementById("content_spacemap");
    if (!container) return false;
    const ok = renderFlashSpacemapWindow(container);
    const win = document.getElementById("win_spacemap");
    if (win) clampFlashWindowToViewport(win, 4);
    return ok;
}

window.refreshFlashSpacemapWindow = refreshFlashSpacemapWindow;

function buildRuntimeWindowsConfig() {
    const xmlDoc = _getFlashGameXmlDoc();
    const windowsNode = _getRootWindowsNode(xmlDoc);
    const out = {};
    if (!windowsNode) {
        return Object.assign({}, WINDOWS_CONFIG);
    }
    const nodes = Array.from(windowsNode.getElementsByTagName("window"));
    for (const node of nodes) {
        const id = parseInt(node.getAttribute("id") || "-1", 10);
        if (!Number.isFinite(id) || id < 0) continue;
        const key = FLASH_WINDOW_KEY_BY_ID[String(id)] || `win${id}`;
        if (!WINDOW_RUNTIME_ALLOWLIST.has(key)) continue;
        const base = WINDOWS_CONFIG[key] || {};
        out[key] = Object.assign({}, base, {
            title: base.title || node.getAttribute("titleKey") || key,
            icon: base.icon || "",
            flashWindowId: id
        });
    }
    for (const k in WINDOWS_CONFIG) {
        if (!WINDOW_RUNTIME_ALLOWLIST.has(k)) continue;
        if (!Object.prototype.hasOwnProperty.call(out, k)) out[k] = Object.assign({}, WINDOWS_CONFIG[k]);
    }
    return out;
}

const CORE_WINDOW_KEYS = new Set([ "user", "ship", "map", "spacemap", "log", "chat", "group", "quest", "booster", "spaceball" ]);

const WINDOW_RUNTIME_ALLOWLIST = new Set([ "group", "quest", "map", "spacemap", "chat", "log", "ship", "user", "booster", "spaceball", "trade", "refinement", "settings", "logout" ]);

function renderGenericXmlWindowContent(key, runtimeCfg) {
    const contentEl = document.getElementById("content_" + key);
    if (!contentEl) return;
    const meta = getFlashWindowMeta(key);
    if (!meta) return;
    if (key === "refinement") {
        return;
    }
    contentEl.innerHTML = "";
    if (typeof __renderFlashInfoWindow === "function" && _getFlashWindowDefById(meta.id) && _getFlashWindowDefById(meta.id).getElementsByTagName("infoFieldContainer").length) {
        const resolver = field => {
            const val = typeof getInfoValueByType === "function" ? getInfoValueByType(field.id) : null;
            return {
                text: val == null || val === "" ? "0" : String(val),
                percent: null
            };
        };
        try {
            __renderFlashInfoWindow(meta.id, contentEl, resolver);
            return;
        } catch (e) {}
    }
}

function createGameWindows() {
    const dock = document.getElementById("mainMenuContainer");
    if (!dock) return;
    dock.innerHTML = "";
    const ACTIONMENU_BG = {
        "comb01_std.png": "graphics/ui/actionMenu/images/84_comb01_std.png.png",
        "comb01_hover.png": "graphics/ui/actionMenu/images/86_comb01_hover.png.png",
        "comb01_selected.png": "graphics/ui/actionMenu/images/85_comb01_selected.png.png",
        "comb02_std.png": "graphics/ui/actionMenu/images/81_comb02_std.png.png",
        "comb02_hover.png": "graphics/ui/actionMenu/images/83_comb02_hover.png.png",
        "comb02_selected.png": "graphics/ui/actionMenu/images/82_comb02_selected.png.png",
        "comb03_std.png": "graphics/ui/actionMenu/images/79_comb03_std.png.png",
        "comb03_hover.png": "graphics/ui/actionMenu/images/80_comb03_hover.png.png"
    };
    const resolveActionMenuBg = fileName => {
        const name = String(fileName || "").trim();
        const rawPath = !name ? ACTIONMENU_BG["comb02_std.png"] : ACTIONMENU_BG[name] || "graphics/ui/actionMenu/images/" + name;
        if (typeof resolveUiImageUrl === "function") {
            const resolved = resolveUiImageUrl(rawPath);
            if (resolved) return resolved;
        }
        return rawPath;
    };
    const runtimeWindowsConfig = buildRuntimeWindowsConfig();
    window.__runtimeWindowsConfig = runtimeWindowsConfig;
    FLASH_LEFT_SLOT_ORDER = Object.keys(runtimeWindowsConfig).sort((a, b) => {
        const ma = getFlashWindowMeta(a);
        const mb = getFlashWindowMeta(b);
        const ia = ma && Number.isFinite(ma.id) ? ma.id : 9999;
        const ib = mb && Number.isFinite(mb.id) ? mb.id : 9999;
        return ia - ib;
    });
    for (const key in runtimeWindowsConfig) {
        const baseCfg = runtimeWindowsConfig[key];
        const cfg = getFlashWindowRuntimeConfig(key, baseCfg);
        const usesFlashUtilityButton = FLASH_TOP_UTILITY_WINDOW_KEYS.has(key);
        const useTopMenuStaticSlot = !usesFlashUtilityButton && isFlashTopMenuStaticWindowKey(key);
        const persistedWindowSetting = getFlashPersistedWindowSetting(key);
        if (persistedWindowSetting && typeof persistedWindowSetting.open === "boolean") {
            windowStates[key] = persistedWindowSetting.open;
        } else {
            windowStates[key] = !cfg.startMinimized;
        }
        const existingIcon = document.getElementById("icon_" + key);
        if (existingIcon && existingIcon.parentNode) {
            existingIcon.parentNode.removeChild(existingIcon);
        }
        if (!usesFlashUtilityButton) {
            const iconEl = document.createElement("div");
            iconEl.id = "icon_" + key;
            iconEl.className = "minSlotIcon";
            iconEl.dataset.key = key;
            iconEl.title = cfg.title || key;
            if (useTopMenuStaticSlot) {
                iconEl.dataset.staticTopMenuSlot = "1";
            }
            const bgNormalPath = resolveActionMenuBg(cfg.bgNormalIcon || "comb02_std.png");
            const bgHoverPath = resolveActionMenuBg(cfg.bgHoverIcon || "comb02_hover.png");
            iconEl.style.setProperty("--bg-normal", `url('${bgNormalPath}')`);
            iconEl.style.setProperty("--bg-hover", `url('${bgHoverPath}')`);
            const innerIcon = document.createElement("div");
            innerIcon.className = "minSlotIconInner";
            if (cfg.flashIconName) {
                innerIcon.style.backgroundImage = `url('graphics/ui/window1/images/${cfg.flashIconName}')`;
            } else if (cfg.icon) {
                innerIcon.textContent = cfg.icon;
            }
            iconEl.appendChild(innerIcon);
            iconEl.addEventListener("mousedown", e => e.stopPropagation());
            iconEl.addEventListener("click", () => {
                if (cfg && cfg.maximizeOnClick === false) return;
                if (key === "settings" && typeof toggleSettingsWindow === "function") {
                    toggleSettingsWindow();
                } else {
                    toggleWindow(key, true);
                    const winEl = document.getElementById("win_" + key);
                    if (winEl) {
                        bringWindowToFront(winEl);
                    }
                }
            });
            if (useTopMenuStaticSlot) {
                window.appendToHud ? window.appendToHud(iconEl) : document.body.appendChild(iconEl);
            } else {
                dock.appendChild(iconEl);
            }
        }
        const winEl = createGenericWindow(key, cfg);
        window.appendToHud ? window.appendToHud(winEl) : document.body.appendChild(winEl);
        if (key === "chat") {
            initChatInterface();
        }
        if (key === "log" && typeof initGameLogWindow === "function") {
            initGameLogWindow();
        }
        if (key === "group") {
            createGroupWindowContent();
        }
        if (key === "quest" && typeof initQuestWindow === "function") {
            initQuestWindow();
        }
        if (key === "spacemap") {
            createSpacemapWindowContent();
        }
        if (key === "booster") {
            createBoosterWindowContent();
        }
        if (key === "spaceball") {
            createSpaceballWindowContent();
        }
        if (!CORE_WINDOW_KEYS.has(key)) {
            renderGenericXmlWindowContent(key, cfg);
        }
    }
    refreshWindowsVisibility();
    const parityKeys = [ "user", "ship", "chat", "log", "group", "map", "trade", "refinement", "settings", "logout" ];
    debugFlashWindowGeometry(parityKeys);
    verifyFlashWindowContentRects(parityKeys.filter(k => k !== "map"));
}

function shouldApplyResizerExtentForWindow(key, runtimeCfg) {
    if (runtimeCfg && runtimeCfg.resizable) return true;
    return key === "ship" || key === "user" || key === "refinement" || key === "booster" || key === "logout" || key === "spaceball";
}

const WINDOW_GEOMETRY_STORAGE_KEY = "andromeda_window_geometry_v1";

function readPersistedWindowGeometryStore() {
    try {
        const raw = localStorage.getItem(WINDOW_GEOMETRY_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
        return {};
    }
}

function writePersistedWindowGeometryStore(store) {
    try {
        localStorage.setItem(WINDOW_GEOMETRY_STORAGE_KEY, JSON.stringify(store || {}));
    } catch (_) {}
}

function getPersistedWindowGeometry(key) {
    if (!key) return null;
    const store = readPersistedWindowGeometryStore();
    const entry = store[key];
    if (!entry || typeof entry !== "object") return null;
    const width = parseInt(entry.w ?? entry.width, 10);
    const height = parseInt(entry.h ?? entry.height, 10);
    if (!(Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0)) return null;
    return {
        width: width,
        height: height
    };
}

function persistWindowGeometry(key, width, height) {
    if (!key) return;
    const w = parseInt(width, 10);
    const h = parseInt(height, 10);
    if (!(Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0)) return;
    const store = readPersistedWindowGeometryStore();
    store[key] = {
        w: w,
        h: h
    };
    writePersistedWindowGeometryStore(store);
}

function resolveFlashWindowOuterSize(key, runtimeCfg, winEl) {
    const meta = getFlashWindowMeta(key);
    const o = resolveWindowOffsetProfile(runtimeCfg || {}).profile;
    const minimapBase = key === "map" && typeof getMinimapWindowBaseSize === "function" ? getMinimapWindowBaseSize() : null;
    const preferRuntimeOuterSize = !!(runtimeCfg && runtimeCfg.flashUseRuntimeOuterSize);
    const runtimeW = runtimeCfg ? Number(runtimeCfg.w) : NaN;
    const runtimeH = runtimeCfg ? Number(runtimeCfg.h) : NaN;
    let baseW = preferRuntimeOuterSize && Number.isFinite(runtimeW) && runtimeW > 0 ? runtimeW : minimapBase && Number.isFinite(minimapBase.width) ? minimapBase.width : meta && Number.isFinite(meta.width0) ? meta.width0 : runtimeCfg && Number(runtimeCfg.w) || 0;
    let baseH = preferRuntimeOuterSize && Number.isFinite(runtimeH) && runtimeH > 0 ? runtimeH : minimapBase && Number.isFinite(minimapBase.height) ? minimapBase.height : meta && Number.isFinite(meta.height0) ? meta.height0 : runtimeCfg && Number(runtimeCfg.h) || 0;
    if (key === "connectionLost" && !(runtimeCfg && runtimeCfg.resizable)) {
        const runtimeW = Number(runtimeCfg && runtimeCfg.w);
        const runtimeH = Number(runtimeCfg && runtimeCfg.h);
        if (Number.isFinite(runtimeW) && runtimeW > 0) baseW = runtimeW;
        if (Number.isFinite(runtimeH) && runtimeH > 0) baseH = runtimeH;
    }
    if (key === "group" || key === "booster" || key === "logout" || key === "spaceball") {
        const bw = parseInt(winEl && winEl.dataset ? winEl.dataset.baseW || "" : "", 10);
        const bh = parseInt(winEl && winEl.dataset ? winEl.dataset.baseH || "" : "", 10);
        if (Number.isFinite(bw) && Number.isFinite(bh) && bw > 0 && bh > 0) {
            baseW = bw;
            baseH = bh;
        }
    }
    if (!(baseW > 0 && baseH > 0)) return null;
    const includeResizerExtent = shouldApplyResizerExtentForWindow(key, runtimeCfg);
    const defaultOuterW = baseW + (includeResizerExtent ? o.resizer.w || 0 : 0);
    const defaultOuterH = baseH + (includeResizerExtent ? o.resizer.h || 0 : 0);
    let outerW = defaultOuterW;
    let outerH = defaultOuterH;
    if (runtimeCfg && runtimeCfg.resizable) {
        const liveWidth = parseInt(winEl && winEl.dataset ? winEl.dataset.flashUserWidth || "" : "", 10);
        const liveHeight = parseInt(winEl && winEl.dataset ? winEl.dataset.flashUserHeight || "" : "", 10);
        if (Number.isFinite(liveWidth) && Number.isFinite(liveHeight) && liveWidth > 0 && liveHeight > 0) {
            outerW = liveWidth;
            outerH = liveHeight;
        } else {
            const persisted = getPersistedWindowGeometry(key);
            if (persisted) {
                outerW = persisted.width;
                outerH = persisted.height;
                if (winEl && winEl.dataset) {
                    winEl.dataset.flashUserWidth = String(outerW);
                    winEl.dataset.flashUserHeight = String(outerH);
                }
            }
        }
    }
    return {
        baseW: baseW,
        baseH: baseH,
        outerW: outerW,
        outerH: outerH,
        defaultOuterW: defaultOuterW,
        defaultOuterH: defaultOuterH
    };
}

function enforceFlashWindowBaseSize(key, winEl, runtimeCfg) {
    if (!winEl) return;
    const resolved = resolveFlashWindowOuterSize(key, runtimeCfg || {}, winEl);
    if (!resolved) return;
    const outerW = Math.max(1, Math.round(resolved.outerW));
    const outerH = Math.max(1, Math.round(resolved.outerH));
    const defaultOuterW = Math.max(1, Math.round(resolved.defaultOuterW));
    const defaultOuterH = Math.max(1, Math.round(resolved.defaultOuterH));
    winEl.style.width = outerW + "px";
    winEl.style.height = outerH + "px";
    winEl.dataset.flashBaseWidth = String(defaultOuterW);
    winEl.dataset.flashBaseHeight = String(defaultOuterH);
    winEl.dataset.flashResizable = runtimeCfg && runtimeCfg.resizable ? "1" : "0";
    if (runtimeCfg && runtimeCfg.resizable) {
        winEl.dataset.flashUserWidth = String(outerW);
        winEl.dataset.flashUserHeight = String(outerH);
    }
    if (window.FLASH_PARITY_DEBUG) {
        console.log("[FLASH_PARITY] enforce-window-size", key, {
            targetGameXml: {
                width0: resolved.baseW,
                height0: resolved.baseH
            },
            appliedOuter: {
                width: resolved.outerW,
                height: resolved.outerH
            },
            defaultOuter: {
                width: resolved.defaultOuterW,
                height: resolved.defaultOuterH
            }
        });
    }
}

function createGenericWindow(key, cfg) {
    const runtimeCfg = Object.assign({}, cfg || {});
    const pos = getFlashWindowDefaultPos(key, runtimeCfg.w, runtimeCfg.h);
    const div = document.createElement("div");
    div.id = "win_" + key;
    div.dataset.windowKey = key;
    div.className = "gameWindow flashWindow" + (runtimeCfg.resizable ? " resizable" : "");
    const resolvedOffsets = resolveWindowOffsetProfile(runtimeCfg);
    div.dataset.windowContainerSymbol = resolvedOffsets.symbol;
    const o = resolvedOffsets.profile;
    div.style.setProperty("--btn-right", `${o.header.buttonsRight}px`);
    div.style.setProperty("--btn-top", `${o.header.buttonsTop}px`);
    div.style.setProperty("--btn-gap", `${o.header.buttonsGap}px`);
    div.style.setProperty("--header-height", `${o.header.height}px`);
    div.style.setProperty("--title-reserve-right", `${o.header.titleReserveRight}px`);
    div.style.setProperty("--close-w", `${o.close.w}px`);
    div.style.setProperty("--close-h", `${o.close.h}px`);
    div.style.setProperty("--close-margin-left", `${o.close.marginLeft}px`);
    div.style.setProperty("--zoomin-w", `${o.zoomIn.w}px`);
    div.style.setProperty("--zoomin-h", `${o.zoomIn.h}px`);
    div.style.setProperty("--zoomout-w", `${o.zoomOut.w}px`);
    div.style.setProperty("--zoomout-h", `${o.zoomOut.h}px`);
    div.style.setProperty("--resizer-right", `${o.resizer.right}px`);
    div.style.setProperty("--resizer-bottom", `${o.resizer.bottom}px`);
    div.style.setProperty("--resizer-w", `${o.resizer.w}px`);
    div.style.setProperty("--resizer-h", `${o.resizer.h}px`);
    div.style.top = Math.round(pos.top || 60) + "px";
    div.style.left = Math.round(pos.left || 60) + "px";
    div.dataset.flashResizable = runtimeCfg.resizable ? "1" : "0";
    if (runtimeCfg.flashHeaderReserve != null) {
        div.dataset.flashHeaderReserve = String(runtimeCfg.flashHeaderReserve);
    } else if (key === "ship" || key === "user") {
        div.dataset.flashHeaderReserve = "0";
    }
    enforceFlashWindowBaseSize(key, div, runtimeCfg);
    const title = runtimeCfg.title && String(runtimeCfg.title).trim() || runtimeCfg.titleKey && String(runtimeCfg.titleKey).trim() || key;
    const showZoom = !!runtimeCfg.zoomable;
    const showClose = !!runtimeCfg.closeable;
    const btnParts = [];
    if (showZoom) {
        btnParts.push('<span class="gwBtn zoomOutBtn" title="Zoom out"></span>');
        btnParts.push('<span class="gwBtn zoomInBtn" title="Zoom in"></span>');
    }
    if (showClose) {
        btnParts.push('<span class="gwBtn closeBtn" title="Close"></span>');
    }
    const buttonsHtml = `<div class="gwButtons">${btnParts.join("")}</div>`;
    const reserveRight = (() => {
        let reserve = o.header.buttonsRight + 4;
        if (showZoom) reserve += o.zoomOut.w + o.zoomIn.w + o.header.buttonsGap * 2;
        if (showClose) reserve += o.close.w + o.close.marginLeft + o.header.buttonsGap;
        return Math.max(12, reserve);
    })();
    div.style.setProperty("--title-reserve-right", `${reserveRight}px`);
    div.innerHTML = `\n        <div class="windowChrome"></div>\n        <div class="windowInterior">\n            <div class="gwHeader" id="head_${key}">\n                <div class="gwHeaderLeft">\n                    <span class="gwIcon" id="hicon_${key}" aria-hidden="true"></span>\n                    <span class="gwTitle">${title}</span>\n                </div>\n                ${buttonsHtml}\n            </div>\n            <div class="gwContent" id="content_${key}"></div>\n        </div>\n    `;
    const headerIconEl = div.querySelector("#hicon_" + key);
    if (headerIconEl) {
        if (runtimeCfg.flashIconName) {
            headerIconEl.style.backgroundImage = `url('graphics/ui/window1/images/${runtimeCfg.flashIconName}')`;
        } else {
            headerIconEl.style.opacity = "0";
        }
        headerIconEl.addEventListener("mousedown", e => {
            e.preventDefault();
            e.stopPropagation();
        });
        headerIconEl.addEventListener("click", e => {
            e.stopPropagation();
            if (runtimeCfg.minimizeOnClick !== false) {
                toggleWindow(key, false);
            }
        });
    }
    const closeBtn = div.querySelector(".closeBtn");
    if (closeBtn) {
        closeBtn.addEventListener("mousedown", e => {
            e.preventDefault();
            e.stopPropagation();
        });
        closeBtn.addEventListener("click", e => {
            e.stopPropagation();
            toggleWindow(key, false);
        });
    }
    const zoomIn = div.querySelector(".zoomInBtn");
    const zoomOut = div.querySelector(".zoomOutBtn");
    if (zoomIn) {
        zoomIn.addEventListener("mousedown", e => {
            e.preventDefault();
            e.stopPropagation();
        });
        zoomIn.addEventListener("click", e => {
            e.stopPropagation();
            if (zoomIn.classList.contains("disabled")) return;
            if (typeof zoomMinimapIn === "function") zoomMinimapIn();
        });
    }
    if (zoomOut) {
        zoomOut.addEventListener("mousedown", e => {
            e.preventDefault();
            e.stopPropagation();
        });
        zoomOut.addEventListener("click", e => {
            e.stopPropagation();
            if (zoomOut.classList.contains("disabled")) return;
            if (typeof zoomMinimapOut === "function") zoomMinimapOut();
        });
    }
    const dragHandle = div.querySelector("#head_" + key);
    if (dragHandle) makeElementDraggable(div, dragHandle);
    if (runtimeCfg.resizable) {
        const resizerOptions = {};
        if (key === "chat") {
            resizerOptions.minWidth = 250;
            resizerOptions.minHeight = 120;
            resizerOptions.maxWidth = 900;
            resizerOptions.maxHeight = 900;
            resizerOptions.onResize = () => {
                syncFlashWindowContentBounds(div);
                if (typeof renderChatTabs === "function") renderChatTabs();
                if (typeof syncChatScrollThumb === "function") syncChatScrollThumb();
            };
        }
        attachWindowResizer(div, resizerOptions);
    }
    div.addEventListener("mousedown", () => {
        bringWindowToFront(div);
    });
    syncFlashWindowContentBounds(div);
    if (typeof ResizeObserver === "function") {
        const ro = new ResizeObserver(() => {
            syncFlashWindowContentBounds(div);
            if (key === "chat") {
                if (typeof renderChatTabs === "function") renderChatTabs();
                if (typeof syncChatScrollThumb === "function") syncChatScrollThumb();
            }
        });
        ro.observe(div);
    }
    return div;
}

function toggleWindow(key, forceState) {
    const newState = forceState !== undefined ? forceState : !windowStates[key];
    windowStates[key] = newState;
    refreshWindowsVisibility();
    saveInterfaceLayout();
    const meta = getFlashWindowMeta(key);
    if (meta && meta.saveSettings) {
        persistCurrentFlashWindowSettingsLocally();
        sendCurrentFlashWindowSettingsToServer();
    }
}

function hasBooster() {
    try {
        if (typeof isBoosterActive === "function") return !!isBoosterActive();
    } catch (e) {}
    try {
        if (typeof boosterStatus !== "undefined") return !!boosterStatus;
    } catch (e) {}
    return false;
}

function createGroupWindowContent() {
    if (typeof initGroupWindow === "function") {
        try {
            initGroupWindow();
        } catch (e) {
            console.error("[GROUP] initGroupWindow failed", e);
        }
        return;
    }
}

function createBoosterWindowContent() {
    const container = document.getElementById("content_booster");
    if (!container) return;
    if (typeof renderFlashBoosterWindow === "function") {
        try {
            renderFlashBoosterWindow(container);
        } catch (e) {
            console.error("[BOOSTER] renderFlashBoosterWindow failed", e);
        }
    }
}

function getSpaceballSpeedFrameForCompany(companyId, snapshot) {
    const data = snapshot || getSpaceballScoreboardSnapshot();
    if (!data || Number(companyId) !== Number(data.owner)) return 1;
    const speed = parseInt(data.speed, 10);
    if (!Number.isFinite(speed)) return 1;
    return Math.max(1, Math.min(4, speed + 1));
}

function renderFlashSpaceballWindow(container) {
    if (!container) return false;
    const win = document.getElementById("win_spaceball");
    const titleEl = win ? win.querySelector(".gwTitle") : null;
    if (titleEl) {
        titleEl.textContent = flashLocaleText("title_spaceball", "Spaceball") || "Spaceball";
    }
    const snapshot = getSpaceballScoreboardSnapshot();
    if (!snapshot.active) {
        container.innerHTML = '<div class="flashSpaceballRoot"></div>';
        return true;
    }
    const root = document.createElement("div");
    root.className = "flashSpaceballRoot";
    const entriesContainer = document.createElement("div");
    entriesContainer.className = "flashSpaceballContainer";
    root.appendChild(entriesContainer);
    let offsetX = 0;
    SPACEBALL_COMPANY_IDS.forEach(companyId => {
        const asset = SPACEBALL_ENTRY_ASSETS[companyId];
        const width = asset && Number.isFinite(asset.width) ? asset.width : 0;
        const height = asset && Number.isFinite(asset.height) ? asset.height : 44;
        const left = offsetX;
        offsetX += width;
        const companyLabel = SPACEBALL_COMPANY_LABELS[companyId] || "";
        const score = snapshot.scores[companyId] != null ? snapshot.scores[companyId] : 0;
        const speedFrame = getSpaceballSpeedFrameForCompany(companyId, snapshot);
        const entry = document.createElement("div");
        entry.className = "flashSpaceballEntry";
        entry.style.left = `${left}px`;
        entry.style.width = `${width}px`;
        entry.style.height = `${height}px`;
        let bgNode = null;
        if (asset && asset.bg && typeof getUiImage === "function") {
            const resolvedNode = getUiImage(asset.bg);
            if (resolvedNode && typeof resolvedNode === "object" && resolvedNode.nodeType === 1) {
                bgNode = resolvedNode;
            }
        }
        if (!bgNode) {
            bgNode = document.createElement("img");
            bgNode.src = asset && asset.bg ? asset.bg : "";
            bgNode.alt = "";
            bgNode.width = width;
            bgNode.height = height;
        }
        bgNode.classList.add("flashSpaceballBg");
        bgNode.setAttribute("draggable", "false");
        bgNode.style.width = `${width}px`;
        bgNode.style.height = `${height}px`;
        entry.appendChild(bgNode);
        const companyEl = document.createElement("div");
        companyEl.className = "flashSpaceballCompany";
        companyEl.style.width = `${width}px`;
        companyEl.textContent = companyLabel;
        entry.appendChild(companyEl);
        const scoreEl = document.createElement("div");
        scoreEl.className = "flashSpaceballScore";
        scoreEl.style.width = `${width}px`;
        scoreEl.textContent = String(Math.round(Number(score) || 0));
        entry.appendChild(scoreEl);
        const speedEl = document.createElement("img");
        speedEl.className = "flashSpaceballSpeed";
        speedEl.src = `graphics/ui/ui/sprites/DefineSprite_356_spaceball_speed/${speedFrame}.png`;
        speedEl.alt = "";
        speedEl.width = 29;
        speedEl.height = 9;
        speedEl.setAttribute("draggable", "false");
        speedEl.style.left = "15px";
        speedEl.style.top = "29px";
        entry.appendChild(speedEl);
        entriesContainer.appendChild(entry);
    });
    container.innerHTML = "";
    container.appendChild(root);
    if (win) {
        win.dataset.baseW = "170";
        win.dataset.baseH = "70";
        try {
            const runtimeCfg = window.__runtimeWindowsConfig && window.__runtimeWindowsConfig.spaceball && typeof getFlashWindowRuntimeConfig === "function" ? getFlashWindowRuntimeConfig("spaceball", window.__runtimeWindowsConfig.spaceball) : {
                w: 170,
                h: 70
            };
            if (typeof enforceFlashWindowBaseSize === "function") {
                enforceFlashWindowBaseSize("spaceball", win, runtimeCfg || {});
            }
            if (typeof syncFlashWindowContentBounds === "function") {
                syncFlashWindowContentBounds(win);
            }
        } catch (_) {}
    }
    return true;
}

function createSpaceballWindowContent() {
    const container = document.getElementById("content_spaceball");
    if (!container) return;
    try {
        renderFlashSpaceballWindow(container);
    } catch (e) {
        console.error("[SPACEBALL] renderFlashSpaceballWindow failed", e);
    }
}

function refreshWindowsVisibility() {
    const parsed = __flashMinSlotsCfg && Array.isArray(__flashMinSlotsCfg.slots) ? __flashMinSlotsCfg : typeof getFlashMinimizedIconSlots === "function" ? getFlashMinimizedIconSlots() : null;
    const slots = parsed && Array.isArray(parsed.slots) && parsed.slots.length ? parsed.slots : [ {
        x: 0,
        y: 0
    }, {
        x: 0,
        y: 45
    }, {
        x: 0,
        y: 90
    }, {
        x: 0,
        y: 135
    }, {
        x: 0,
        y: 180
    }, {
        x: 0,
        y: 225
    } ];
    const orderedKeys = FLASH_LEFT_SLOT_ORDER.filter(k => WINDOW_RUNTIME_ALLOWLIST.has(k) && Object.prototype.hasOwnProperty.call(windowStates, k));
    const extraKeys = Object.keys(windowStates).filter(k => WINDOW_RUNTIME_ALLOWLIST.has(k) && !orderedKeys.includes(k));
    orderedKeys.push(...extraKeys);
    let slotIndex = 0;
    const openedNow = [];
    for (const key of orderedKeys) {
        if (key === "booster" && !hasBooster()) {
            const iconEl = document.getElementById("icon_" + key);
            if (iconEl) iconEl.style.display = "none";
            const winEl = document.getElementById("win_" + key);
            if (winEl) winEl.style.display = "none";
            continue;
        }
        if (key === "spaceball" && !hasSpaceballScoreboard()) {
            const iconEl = document.getElementById("icon_" + key);
            if (iconEl) iconEl.style.display = "none";
            const winEl = document.getElementById("win_" + key);
            if (winEl) winEl.style.display = "none";
            continue;
        }
        if (key === "chat" && !isFlashChatDisplayEnabled()) {
            const iconEl = document.getElementById("icon_" + key);
            if (iconEl) iconEl.style.display = "none";
            const winEl = document.getElementById("win_" + key);
            if (winEl) winEl.style.display = "none";
            continue;
        }
        const isOpen = !!windowStates[key];
        const iconEl = document.getElementById("icon_" + key);
        const winEl = document.getElementById("win_" + key);
        if (iconEl) {
            const useTopMenuStaticSlot = iconEl.dataset && iconEl.dataset.staticTopMenuSlot === "1";
            if (isOpen) {
                iconEl.style.display = "none";
            } else if (useTopMenuStaticSlot) {
                const pos = getFlashTopMenuStaticSlotPosByKey(key) || {
                    left: getCurrentHudLogicalWidth() - FLASH_TOPMENU_BG_WIDTH + 35,
                    top: 51
                };
                iconEl.style.left = pos.left + "px";
                iconEl.style.top = pos.top + "px";
                iconEl.style.display = "block";
            } else {
                const pos = slots[slotIndex] || {
                    x: 0,
                    y: slotIndex * 45
                };
                iconEl.style.left = pos.x + "px";
                iconEl.style.top = pos.y + "px";
                iconEl.style.display = "block";
                slotIndex++;
            }
        }
        if (winEl) {
            winEl.style.display = isOpen ? "block" : "none";
            if (isOpen) {
                const cfg = window.__runtimeWindowsConfig && window.__runtimeWindowsConfig[key] ? getFlashWindowRuntimeConfig(key, window.__runtimeWindowsConfig[key]) : null;
                enforceFlashWindowBaseSize(key, winEl, cfg || {});
                syncFlashWindowContentBounds(winEl);
                if (key === "chat") {
                    if (typeof renderChatTabs === "function") renderChatTabs();
                    if (typeof syncChatScrollThumb === "function") syncChatScrollThumb();
                }
                if (key === "spacemap" && typeof refreshFlashSpacemapWindow === "function") {
                    refreshFlashSpacemapWindow();
                }
                openedNow.push(key);
            }
        }
        if (key === "map") {
            window.showMinimap = isOpen;
            if (typeof window.invalidateMinimapLayoutCache === "function") {
                window.invalidateMinimapLayoutCache();
            }
        }
    }
    if (openedNow.length && typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => verifyFlashWindowContentRects(openedNow));
    }
    syncFlashTopUtilityButtons();
    updateFlashTopUtilityButtonsState();
}

function makeElementDraggable(elmnt, handle) {
    let startMouseX = 0;
    let startMouseY = 0;
    let startLeft = 0;
    let startTop = 0;
    handle.onmousedown = dragMouseDown;
    function dragMouseDown(e) {
        e = e || window.event;
        if (e.target && typeof e.target.closest === "function" && e.target.closest(".gwBtn, .gwButtons, .gwIcon")) {
            return;
        }
        e.preventDefault();
        const p = window.clientToHudCoords ? window.clientToHudCoords(e.clientX, e.clientY) : {
            x: e.clientX,
            y: e.clientY
        };
        startMouseX = p.x;
        startMouseY = p.y;
        const pEl = window.getHudElementPos ? window.getHudElementPos(elmnt) : {
            x: elmnt.offsetLeft || 0,
            y: elmnt.offsetTop || 0
        };
        startLeft = Math.round(pEl.x || 0);
        startTop = Math.round(pEl.y || 0);
        elmnt.style.transform = "none";
        elmnt.style.left = startLeft + "px";
        elmnt.style.top = startTop + "px";
        if (elmnt.dataset && elmnt.dataset.windowKey === "map" && typeof window.invalidateMinimapLayoutCache === "function") {
            window.invalidateMinimapLayoutCache();
        }
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
        bringWindowToFront(elmnt);
    }
    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        const p = window.clientToHudCoords ? window.clientToHudCoords(e.clientX, e.clientY) : {
            x: e.clientX,
            y: e.clientY
        };
        const dx = p.x - startMouseX;
        const dy = p.y - startMouseY;
        const nextLeft = Math.round(startLeft + dx);
        const nextTop = Math.round(startTop + dy);
        elmnt.style.left = nextLeft + "px";
        elmnt.style.top = nextTop + "px";
        if (elmnt.dataset && elmnt.dataset.windowKey === "map" && typeof window.invalidateMinimapLayoutCache === "function") {
            window.invalidateMinimapLayoutCache();
        }
        if (elmnt.dataset && elmnt.dataset.clampToViewport === "1" && typeof clampFlashWindowToViewport === "function") {
            const clampMargin = parseInt(elmnt.dataset.clampMargin || "", 10);
            clampFlashWindowToViewport(elmnt, Number.isFinite(clampMargin) ? clampMargin : 8);
        }
    }
    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        const draggedKey = elmnt && elmnt.dataset ? elmnt.dataset.windowKey || "" : "";
        if (draggedKey === "map" && typeof window.invalidateMinimapLayoutCache === "function") {
            window.invalidateMinimapLayoutCache();
        }
        if (draggedKey) {
            const meta = getFlashWindowMeta(draggedKey);
            if (meta && meta.saveSettings) {
                persistCurrentFlashWindowSettingsLocally();
                sendCurrentFlashWindowSettingsToServer();
            }
        }
    }
}

function attachWindowResizer(winEl, options) {
    const opts = options || {};
    const resizer = document.createElement("div");
    resizer.className = "winResizer";
    winEl.appendChild(resizer);
    const minWidth = Number.isFinite(opts.minWidth) ? opts.minWidth : 180;
    const minHeight = Number.isFinite(opts.minHeight) ? opts.minHeight : 120;
    const maxWidth = Number.isFinite(opts.maxWidth) ? opts.maxWidth : Number.POSITIVE_INFINITY;
    const maxHeight = Number.isFinite(opts.maxHeight) ? opts.maxHeight : Number.POSITIVE_INFINITY;
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;
    function onMouseDown(e) {
        e.preventDefault();
        e.stopPropagation();
        const p = window.clientToHudCoords ? window.clientToHudCoords(e.clientX, e.clientY) : {
            x: e.clientX,
            y: e.clientY
        };
        startX = p.x;
        startY = p.y;
        startWidth = Math.round(winEl.offsetWidth);
        startHeight = Math.round(winEl.offsetHeight);
        if (typeof bringWindowToFront === "function") {
            bringWindowToFront(winEl);
        }
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    }
    function onMouseMove(e) {
        e.preventDefault();
        const p = window.clientToHudCoords ? window.clientToHudCoords(e.clientX, e.clientY) : {
            x: e.clientX,
            y: e.clientY
        };
        const dx = p.x - startX;
        const dy = p.y - startY;
        const newW = Math.round(Math.min(maxWidth, Math.max(minWidth, startWidth + dx)));
        const newH = Math.round(Math.min(maxHeight, Math.max(minHeight, startHeight + dy)));
        winEl.style.width = newW + "px";
        winEl.style.height = newH + "px";
        winEl.dataset.flashUserWidth = String(newW);
        winEl.dataset.flashUserHeight = String(newH);
        if (typeof syncFlashWindowContentBounds === "function") {
            syncFlashWindowContentBounds(winEl);
        }
        if (typeof opts.onResize === "function") {
            opts.onResize(newW, newH);
        }
    }
    function onMouseUp() {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        const currentWidth = parseInt(winEl.dataset.flashUserWidth || "", 10) || winEl.offsetWidth;
        const currentHeight = parseInt(winEl.dataset.flashUserHeight || "", 10) || winEl.offsetHeight;
        persistWindowGeometry(winEl.dataset.windowKey || "", currentWidth, currentHeight);
        if (typeof saveInterfaceLayout === "function") {
            saveInterfaceLayout();
        }
    }
    resizer.addEventListener("mousedown", onMouseDown);
}

function getTradePricesMap() {
    if (typeof labPrices !== "undefined") return labPrices;
    return window.tradePrices || {};
}

function getTradeOrePrice(type, key) {
    const prices = getTradePricesMap();
    if (prices && prices[type] != null) return prices[type];
    const fallback = window.orePrices || {};
    return fallback[key] != null ? fallback[key] : null;
}

function getTradeOreCargo(key) {
    const cargo = window.oreCargo || {};
    return cargo[key] || 0;
}

function formatTradeValue(languageKey, value) {
    const amount = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    const fallback = `%VALUE%`;
    const template = flashLocaleText(languageKey, fallback);
    return template.replace(/%VALUE%/g, amount.toLocaleString("en-US"));
}

function setTradeWindowAccess() {
    if (tradeLockOverlay) {
        tradeLockOverlay.style.display = "none";
        tradeLockOverlay.textContent = "";
        tradeLockOverlay.style.backgroundImage = "none";
    }
    const btn = document.getElementById("tradeButton");
    if (btn) {
        btn.classList.remove("locked");
    }
    refreshTradeSellButtons();
}

function handleTradeZoneStateFromServer(isInTradeZone) {
    const nextAllowed = !!isInTradeZone;
    if (tradeWindowAllowedByZone === nextAllowed) return;
    tradeWindowAllowedByZone = nextAllowed;
    if (!tradeWindowAllowedByZone) {
        closeSafePrompt();
    }
    setTradeWindowAccess();
    if (windowStates && windowStates.refinement && typeof refreshRefiningWindow === "function") {
        refreshRefiningWindow(true, "safe");
    }
}

function handleTradeWindowActivationFromServer() {
    setTradeWindowAccess();
    const content = ensureTradeWindow();
    if (!content) return;
    windowStates.trade = true;
    if (typeof refreshWindowsVisibility === "function") refreshWindowsVisibility();
    if (typeof bringWindowToFront === "function") bringWindowToFront(getFlashWindowShellRefs("trade").win || "trade");
    refreshTradeUI();
}

function buildTradeCard(def, index) {
    const card = document.createElement("div");
    card.className = "tradeModule";
    card.style.left = `${index * 80}px`;
    card.style.top = "0px";
    const icon = document.createElement("div");
    icon.className = "tradeOreIcon";
    if (typeof setUiBackgroundImage === "function") setUiBackgroundImage(icon, def.icon); else icon.style.backgroundImage = `url('${def.icon}')`;
    const priceMask = document.createElement("div");
    priceMask.className = "tradePriceMask";
    const priceDisplay = document.createElement("div");
    priceDisplay.className = "tradePrice";
    const stepper = document.createElement("div");
    stepper.className = "tradeStepper";
    const remainingDisplay = document.createElement("div");
    remainingDisplay.className = "tradeRemaining";
    const decBtn = document.createElement("button");
    decBtn.className = "tradeStepBtn minus";
    decBtn.type = "button";
    const qtyInput = document.createElement("input");
    qtyInput.className = "tradeQty";
    qtyInput.type = "text";
    qtyInput.inputMode = "numeric";
    qtyInput.autocomplete = "off";
    qtyInput.min = "0";
    qtyInput.step = "1";
    qtyInput.value = "0";
    const incBtn = document.createElement("button");
    incBtn.className = "tradeStepBtn plus";
    incBtn.type = "button";
    stepper.appendChild(remainingDisplay);
    stepper.appendChild(decBtn);
    stepper.appendChild(qtyInput);
    stepper.appendChild(incBtn);
    const gainMask = document.createElement("div");
    gainMask.className = "tradeGainMask";
    const gain = document.createElement("div");
    gain.className = "tradeGain";
    const sellBtn = document.createElement("button");
    sellBtn.className = "tradeSellBtn";
    sellBtn.type = "button";
    sellBtn.textContent = flashLocaleText("out_verkaufen", "SELL");
    bindBitmapStates(sellBtn, TRADE_SELL_BUTTON_BITMAP_STATES);
    card.appendChild(priceMask);
    card.appendChild(priceDisplay);
    card.appendChild(icon);
    card.appendChild(stepper);
    card.appendChild(gainMask);
    card.appendChild(gain);
    card.appendChild(sellBtn);
    const updateCard = () => {
        const available = getTradeOreCargo(def.key);
        const unitPrice = getTradeOrePrice(def.type, def.key) || 0;
        const requested = Math.min(Math.max(parseInt(qtyInput.value, 10) || 0, 0), available);
        qtyInput.value = String(requested);
        const total = unitPrice * requested;
        const canSell = unitPrice > 0 && requested > 0;
        priceDisplay.textContent = formatTradeValue(def.pricetagLanguageKey, unitPrice);
        remainingDisplay.textContent = String(Math.max(0, available - requested));
        gain.textContent = formatTradeValue(def.gaintagLanguageKey, total);
        const moduleDisabled = available <= 0 || unitPrice <= 0;
        card.classList.toggle("tradeDisabled", moduleDisabled);
        decBtn.disabled = requested <= 0;
        incBtn.disabled = requested >= available;
        qtyInput.disabled = moduleDisabled;
        sellBtn.disabled = !canSell;
        if (canSell && !sellHandlerAttached) {
            sellBtn.addEventListener("click", onSellClick);
            sellHandlerAttached = true;
        } else if (!canSell && sellHandlerAttached) {
            sellBtn.removeEventListener("click", onSellClick);
            sellHandlerAttached = false;
        }
    };
    const adjust = delta => {
        const available = getTradeOreCargo(def.key);
        const current = parseInt(qtyInput.value, 10) || 0;
        const next = Math.min(Math.max(current + delta, 0), available);
        qtyInput.value = String(next);
        updateCard();
    };
    decBtn.addEventListener("click", () => adjust(-1));
    incBtn.addEventListener("click", () => adjust(1));
    qtyInput.addEventListener("change", updateCard);
    qtyInput.addEventListener("input", updateCard);
    const onSellClick = () => {
        const count = parseInt(qtyInput.value, 10) || 0;
        if (count < 1) return;
        if (typeof window.sendSellOre === "function") {
            window.sendSellOre(def.key, count);
        }
    };
    let sellHandlerAttached = false;
    tradeOreCards.set(def.type, {
        refresh: updateCard,
        reset: available => {
            qtyInput.value = String(Math.max(0, available));
            updateCard();
        }
    });
    return card;
}

function ensureTradeWindow() {
    if (tradeWindowElement) return tradeWindowElement;
    const {content: content, win: win} = getFlashWindowShellRefs("trade");
    if (!content) return null;
    content.innerHTML = "";
    const scene = document.createElement("div");
    scene.className = "tradeScene";
    const grid = document.createElement("div");
    grid.className = "tradeModulesGrid";
    scene.appendChild(grid);
    content.appendChild(scene);
    tradeLockOverlay = null;
    TRADE_ORE_CONFIG.forEach((def, idx) => {
        const card = buildTradeCard(def, idx);
        grid.appendChild(card);
    });
    tradeWindowElement = content;
    setTradeWindowAccess();
    try {
        const titleEl = win ? win.querySelector(".gwTitle") : null;
        if (titleEl) titleEl.textContent = flashLocaleText("title_trade", "Trade raw materials");
    } catch (e) {}
    return tradeWindowElement;
}

function refreshTradeUI() {
    if (!tradeWindowElement) return;
    TRADE_ORE_CONFIG.forEach(def => {
        const entry = tradeOreCards.get(def.type);
        if (!entry) return;
        const available = getTradeOreCargo(def.key);
        entry.reset(available);
    });
}

function refreshTradeSellButtons() {
    if (!tradeWindowElement) return;
    TRADE_ORE_CONFIG.forEach(def => {
        const entry = tradeOreCards.get(def.type);
        if (!entry) return;
        entry.refresh();
    });
}

function openTradeWindow() {
    const content = ensureTradeWindow();
    if (!content) return;
    windowStates.trade = true;
    if (typeof refreshWindowsVisibility === "function") refreshWindowsVisibility();
    if (typeof bringWindowToFront === "function") bringWindowToFront(getFlashWindowShellRefs("trade").win || "trade");
    refreshTradeUI();
    if (typeof sendRaw === "function") {
        sendRaw("b");
    }
}

function initTradeButton() {
    ensureFlashTopUtilityButton("trade");
    setTradeWindowAccess();
}

window.handleTradeWindowActivationFromServer = handleTradeWindowActivationFromServer;

window.handleTradeZoneStateFromServer = handleTradeZoneStateFromServer;

window.isTradeWindowAccessGranted = () => !!tradeWindowAllowedByZone;

function initSettingsButton() {
    ensureFlashTopUtilityButton("settings");
}

function getLogoutLocaleParts() {
    const raw = flashLocaleText("msg_logout_seconds", "Logging out in %SEC% seconds");
    const parts = String(raw || "").split("%SEC%");
    const top = String(parts[0] == null ? "" : parts[0]).replace(/\s+$/g, "") || "Logging out in";
    const bottom = String(parts[1] == null ? "" : parts[1]).replace(/^\s+/g, "") || "seconds";
    return {
        top: top,
        bottom: bottom
    };
}

function getLogoutCancelLabel() {
    return flashLocaleText("logout_subbot", "CANCEL") || "CANCEL";
}

function syncLogoutWindowLocale() {
    const {content: content, win: win} = getFlashWindowShellRefs("logout");
    if (!content || !win) return;
    const titleEl = win.querySelector(".gwTitle");
    if (titleEl) {
        titleEl.textContent = flashLocaleText("title_logout", "Logout") || "Logout";
    }
    const parts = getLogoutLocaleParts();
    const topEl = content.querySelector(".logoutTextTop");
    const bottomEl = content.querySelector(".logoutTextBottom");
    const cancelBtn = content.querySelector(".logoutCancelBtn");
    if (topEl) topEl.textContent = parts.top;
    if (bottomEl) bottomEl.textContent = parts.bottom;
    if (cancelBtn) cancelBtn.textContent = getLogoutCancelLabel();
}

function syncLogoutWindowDimensions() {
    const {content: content, win: win} = getFlashWindowShellRefs("logout");
    if (!content || !win || win.style.display === "none") return;
    const logoutContent = content.querySelector(".logoutContent");
    const cancelBtn = content.querySelector(".logoutCancelBtn");
    if (!logoutContent || !cancelBtn) return;
    const headerReserve = parseInt(win.dataset.flashHeaderReserve || "", 10) || 25;
    const buttonBottom = cancelBtn.offsetTop + cancelBtn.offsetHeight;
    if (!(buttonBottom > 0)) return;
    const containerTop = logoutContent.offsetTop;
    const dynamicBaseHeight = Math.max(1, Math.round(headerReserve + containerTop + buttonBottom));
    const meta = getFlashWindowMeta("logout");
    const baseWidth = meta && Number.isFinite(meta.width0) && meta.width0 > 0 ? meta.width0 : 200;
    win.dataset.baseW = String(baseWidth);
    win.dataset.baseH = String(dynamicBaseHeight);
    const cfg = window.__runtimeWindowsConfig && window.__runtimeWindowsConfig.logout ? getFlashWindowRuntimeConfig("logout", window.__runtimeWindowsConfig.logout) : getFlashWindowRuntimeConfig("logout", WINDOWS_CONFIG.logout || {});
    enforceFlashWindowBaseSize("logout", win, cfg || {});
    syncFlashWindowContentBounds(win);
}

function initLogoutUI() {
    ensureFlashTopUtilityButton("logout");
    const {content: content, win: win} = getFlashWindowShellRefs("logout");
    if (!content || !win) return;
    if (!content.querySelector(".logoutContent")) {
        content.innerHTML = `\n            <div class="logoutContent">\n                <div class="logoutTextTop"></div>\n                <div class="logoutCountdown">--</div>\n                <div class="logoutTextBottom"></div>\n                <button id="logoutCancelBtn" class="logoutCancelBtn" type="button"></button>\n            </div>\n        `;
        const cancelBtn = content.querySelector("#logoutCancelBtn");
        if (cancelBtn) {
            cancelBtn.addEventListener("click", () => requestLogoutCancel(true));
        }
    }
    logoutWindowElement = content;
    syncLogoutWindowLocale();
    updateLogoutWindowText();
    if (win.style.display !== "none") {
        syncLogoutWindowDimensions();
    }
}

function openLogoutWindow() {
    if (!logoutWindowElement) return;
    windowStates.logout = true;
    if (typeof refreshWindowsVisibility === "function") refreshWindowsVisibility();
    if (typeof bringWindowToFront === "function") bringWindowToFront("logout");
    logoutBreakByUser = false;
    if (typeof heroMoveTimerId !== "undefined" && heroMoveTimerId) {
        clearInterval(heroMoveTimerId);
        heroMoveTimerId = null;
    }
    if (typeof isMouseDownOnMap !== "undefined") {
        isMouseDownOnMap = false;
    }
    if (typeof isChasingTarget !== "undefined") {
        isChasingTarget = false;
    }
    if (typeof sendMoveToServer === "function") {
        sendMoveToServer(shipX, shipY);
    }
    logoutControlsLocked = true;
    stopLogoutCountdown();
    startLogoutCountdown();
    syncLogoutWindowLocale();
    if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => syncLogoutWindowDimensions());
    } else {
        syncLogoutWindowDimensions();
    }
    try {
        if (window.AudioManager && typeof window.AudioManager.playSoundEffect === "function") {
            window.AudioManager.playSoundEffect(22, false, false, -1, -1, true);
        }
    } catch (_) {}
    if (typeof sendLogoutRequest === "function") {
        sendLogoutRequest();
    }
}

function startLogoutCountdown() {
    logoutCountdownValue = heroPremium || false ? 5 : 20;
    updateLogoutWindowText();
    logoutTimerId = setInterval(() => {
        if (logoutCountdownValue > 0) {
            logoutCountdownValue -= 1;
            updateLogoutWindowText();
            if (logoutCountdownValue <= 0) {
                finalizeLogoutCountdown();
            }
        }
    }, 1e3);
}

function stopLogoutCountdown() {
    if (logoutTimerId) {
        clearInterval(logoutTimerId);
        logoutTimerId = null;
    }
}

function updateLogoutWindowText() {
    if (!logoutWindowElement) return;
    syncLogoutWindowLocale();
    const countdownEl = logoutWindowElement.querySelector(".logoutCountdown");
    if (countdownEl) {
        countdownEl.textContent = logoutCountdownValue;
    }
    const refs = getFlashWindowShellRefs("logout");
    if (refs && refs.win && refs.win.style.display !== "none") {
        if (typeof requestAnimationFrame === "function") {
            requestAnimationFrame(() => syncLogoutWindowDimensions());
        } else {
            syncLogoutWindowDimensions();
        }
    }
}

function requestLogoutCancel(fromUser) {
    logoutBreakByUser = !!fromUser;
    if (fromUser && typeof addLogEntry === "function") {
        addLogEntry("Logout cancelled by user.");
    }
    if (typeof sendLogoutCancel === "function") {
        sendLogoutCancel();
    }
}

function minimizeLogoutWindow() {
    windowStates.logout = false;
    if (typeof refreshWindowsVisibility === "function") refreshWindowsVisibility();
}

function handleLogoutCancelFromServer() {
    stopLogoutCountdown();
    logoutCountdownValue = 0;
    updateLogoutWindowText();
    minimizeLogoutWindow();
    logoutControlsLocked = false;
    if (!logoutBreakByUser && typeof addLogEntry === "function") {
        addLogEntry("Logout cancelled.");
    }
    logoutBreakByUser = false;
}

function handleLogoutConfirmedFromServer() {
    stopLogoutCountdown();
    logoutCountdownValue = 0;
    logoutControlsLocked = true;
    updateLogoutWindowText();
    minimizeLogoutWindow();
    try {
        window.close();
    } catch (e) {}
    setTimeout(() => {
        window.location.href = "../";
    }, 100);
}

function finalizeLogoutCountdown() {
    stopLogoutCountdown();
    logoutCountdownValue = 0;
    logoutControlsLocked = true;
    updateLogoutWindowText();
    // Le serveur est l'autorité finale : à 0, on attend le paquet "l"
    // ou le paquet "t" si le logout est annulé par combat/dégâts.
}

let flashConnectionModalLayer = null;

let flashConnectionInfoWindowElement = null;

let flashConnectionLostWindowElement = null;

let flashConnectionProgressTimer = null;

let flashConnectionProgressStep = 0;

let flashConnectionResizeBound = false;

let flashConnectionMeasureCanvas = null;

const FLASH_CONNECTION_PROGRESS_SEGMENTS = [ {
    left: 1,
    width: 11
}, {
    left: 16,
    width: 10
}, {
    left: 30,
    width: 10
}, {
    left: 45,
    width: 9
}, {
    left: 58,
    width: 10
}, {
    left: 73,
    width: 10
}, {
    left: 87,
    width: 10
}, {
    left: 101,
    width: 10
}, {
    left: 114,
    width: 10
} ];

const FLASH_CONNECTION_BUTTON_FONT_FAMILY = '"EurostileFl", "Eurostile", "Eurostile LT Std", "Square 721 BT", "Microgramma D Extended", Tahoma, Arial, sans-serif';

window.__ANDRO_CONNECTION_MODAL_ACTIVE = false;

function closeFlashClientWindow() {
    try {
        if (typeof window.bpCloseWindow === "function") {
            window.bpCloseWindow("");
            return;
        }
    } catch (_) {}
    try {
        window.close();
    } catch (_) {}
    setTimeout(() => {
        try {
            window.location.href = "../";
        } catch (_) {}
    }, 50);
}

function ensureFlashConnectionResizeBinding() {
    if (flashConnectionResizeBound) return;
    flashConnectionResizeBound = true;
    window.addEventListener("resize", () => {
        if (flashConnectionInfoWindowElement) syncFlashConnectionWindowLayout("connection", flashConnectionInfoWindowElement);
        if (flashConnectionLostWindowElement) syncFlashConnectionWindowLayout("connectionLost", flashConnectionLostWindowElement);
    });
}

function ensureFlashConnectionModalLayer() {
    if (flashConnectionModalLayer && flashConnectionModalLayer.parentNode) return flashConnectionModalLayer;
    const layer = document.createElement("div");
    layer.id = "flashConnectionModalLayer";
    layer.innerHTML = '<div class="flashConnectionModalBlocker"></div>';
    window.appendToHud ? window.appendToHud(layer) : document.body.appendChild(layer);
    flashConnectionModalLayer = layer;
    ensureFlashConnectionResizeBinding();
    return layer;
}

function setFlashConnectionModalActive(active) {
    const layer = ensureFlashConnectionModalLayer();
    const hasVisibleWindow = !!(flashConnectionInfoWindowElement && flashConnectionInfoWindowElement.style.display !== "none") || !!(flashConnectionLostWindowElement && flashConnectionLostWindowElement.style.display !== "none");
    const finalActive = !!active && hasVisibleWindow;
    layer.classList.toggle("active", finalActive);
    window.__ANDRO_CONNECTION_MODAL_ACTIVE = finalActive;
}

function cancelFlashConnectionWindowAnimation(winEl) {
    if (!winEl) return;
    if (winEl.__flashConnectionFadeTimer) {
        clearTimeout(winEl.__flashConnectionFadeTimer);
        winEl.__flashConnectionFadeTimer = null;
    }
    winEl.style.transition = "";
}

function setFlashConnectionWindowVisible(winEl, visible) {
    if (!winEl) return;
    cancelFlashConnectionWindowAnimation(winEl);
    if (visible) {
        winEl.style.display = "block";
        winEl.style.opacity = "1";
    } else {
        winEl.style.display = "none";
        winEl.style.opacity = "1";
    }
}

function fadeOutFlashConnectionWindow(winEl, durationMs, onComplete) {
    if (!winEl) {
        if (typeof onComplete === "function") onComplete();
        return;
    }
    cancelFlashConnectionWindowAnimation(winEl);
    winEl.style.display = "block";
    winEl.style.opacity = "1";
    winEl.getBoundingClientRect();
    winEl.style.transition = `opacity ${Math.max(0, durationMs)}ms linear`;
    requestAnimationFrame(() => {
        winEl.style.opacity = "0";
    });
    winEl.__flashConnectionFadeTimer = setTimeout(() => {
        winEl.style.display = "none";
        winEl.style.opacity = "1";
        winEl.style.transition = "";
        winEl.__flashConnectionFadeTimer = null;
        if (typeof onComplete === "function") onComplete();
    }, Math.max(0, durationMs) + 34);
}

function applyFlashConnectionWindowChrome(winEl) {
    if (!winEl) return;
    const runtimeCfg = {
        resizable: false,
        closeable: false,
        zoomable: false
    };
    const resolvedOffsets = resolveWindowOffsetProfile(runtimeCfg);
    const o = resolvedOffsets.profile;
    winEl.dataset.windowContainerSymbol = resolvedOffsets.symbol;
    winEl.style.setProperty("--btn-right", `${o.header.buttonsRight}px`);
    winEl.style.setProperty("--btn-top", `${o.header.buttonsTop}px`);
    winEl.style.setProperty("--btn-gap", `${o.header.buttonsGap}px`);
    winEl.style.setProperty("--header-height", `${o.header.height}px`);
    winEl.style.setProperty("--title-reserve-right", `${o.header.titleReserveRight}px`);
    winEl.style.setProperty("--close-w", `${o.close.w}px`);
    winEl.style.setProperty("--close-h", `${o.close.h}px`);
    winEl.style.setProperty("--close-margin-left", `${o.close.marginLeft}px`);
    winEl.style.setProperty("--zoomin-w", `${o.zoomIn.w}px`);
    winEl.style.setProperty("--zoomin-h", `${o.zoomIn.h}px`);
    winEl.style.setProperty("--zoomout-w", `${o.zoomOut.w}px`);
    winEl.style.setProperty("--zoomout-h", `${o.zoomOut.h}px`);
    winEl.style.setProperty("--resizer-right", `${o.resizer.right}px`);
    winEl.style.setProperty("--resizer-bottom", `${o.resizer.bottom}px`);
    winEl.style.setProperty("--resizer-w", `${o.resizer.w}px`);
    winEl.style.setProperty("--resizer-h", `${o.resizer.h}px`);
}

function measureFlashConnectionButtonWidth(label) {
    const value = label == null ? "" : String(label);
    if (!flashConnectionMeasureCanvas) {
        flashConnectionMeasureCanvas = document.createElement("canvas");
    }
    const ctx = flashConnectionMeasureCanvas.getContext("2d");
    if (!ctx) return Math.max(24, 77);
    ctx.font = `12px ${FLASH_CONNECTION_BUTTON_FONT_FAMILY}`;
    return Math.max(24, Math.ceil(ctx.measureText(value).width) + 7);
}

function getFlashConnectionElementBox(el, options = {}) {
    if (!el) return null;
    const style = window.getComputedStyle ? window.getComputedStyle(el) : null;
    const left = style ? parseFloat(style.left) || 0 : el.offsetLeft || 0;
    const top = style ? parseFloat(style.top) || 0 : el.offsetTop || 0;
    const styleWidth = style ? parseFloat(style.width) || 0 : 0;
    const styleHeight = style ? parseFloat(style.height) || 0 : 0;
    const includeScroll = options.includeScroll !== false;
    const width = Math.max(el.offsetWidth || 0, styleWidth, includeScroll ? el.scrollWidth || 0 : 0);
    const height = Math.max(el.offsetHeight || 0, styleHeight, includeScroll ? el.scrollHeight || 0 : 0);
    return {
        left: left,
        top: top,
        width: width,
        height: height,
        right: left + width,
        bottom: top + height
    };
}

function getFlashConnectionLostContentBottom(winEl) {
    if (!winEl) return 0;
    const spriteBox = getFlashConnectionElementBox(winEl.querySelector(".flashConnectionSprite"), {
        includeScroll: false
    });
    const bodyBox = getFlashConnectionElementBox(winEl.querySelector(".flashConnectionLostBody"));
    return Math.max(spriteBox ? spriteBox.bottom : 0, bodyBox ? bodyBox.bottom : 0);
}

function autoSizeFlashConnectionLostWindow(winEl, preservePosition = false) {
    if (!winEl) return;
    layoutFlashConnectionLostWindow(winEl);
    const spriteBox = getFlashConnectionElementBox(winEl.querySelector(".flashConnectionSprite"), {
        includeScroll: false
    });
    const bodyBox = getFlashConnectionElementBox(winEl.querySelector(".flashConnectionLostBody"));
    const reconnectBox = getFlashConnectionElementBox(winEl.querySelector(".flashConnectionReconnectBtn"), {
        includeScroll: false
    });
    const logoutBox = getFlashConnectionElementBox(winEl.querySelector(".flashConnectionLogoutBtn"), {
        includeScroll: false
    });
    let requiredRight = 0;
    let requiredBottom = 0;
    [ spriteBox, bodyBox, reconnectBox, logoutBox ].forEach(box => {
        if (!box) return;
        requiredRight = Math.max(requiredRight, box.right);
        requiredBottom = Math.max(requiredBottom, box.bottom);
    });
    const targetWidth = Math.max(300, Math.ceil(requiredRight));
    const targetHeight = Math.max(190, Math.ceil(requiredBottom + 5));
    const currentWidth = parseInt(winEl.dataset.flashAutoSizedWidth || "", 10) || 0;
    const currentHeight = parseInt(winEl.dataset.flashAutoSizedHeight || "", 10) || 0;
    if (currentWidth !== targetWidth) {
        winEl.dataset.flashAutoSizedWidth = String(targetWidth);
    }
    if (currentHeight !== targetHeight) {
        winEl.dataset.flashAutoSizedHeight = String(targetHeight);
    }
    syncFlashConnectionWindowLayout("connectionLost", winEl, preservePosition);
    layoutFlashConnectionLostWindow(winEl);
}

function layoutFlashConnectionInfoWindow(winEl) {
    if (!winEl) return;
    const cancelBtn = winEl.querySelector(".flashConnectionCancelBtn");
    if (cancelBtn) {
        const btnWidth = measureFlashConnectionButtonWidth(cancelBtn.textContent || "");
        cancelBtn.style.width = `${btnWidth}px`;
        cancelBtn.style.left = `${Math.round(150 - btnWidth / 2 + 5)}px`;
        cancelBtn.style.top = "184px";
    }
}

function layoutFlashConnectionLostWindow(winEl) {
    if (!winEl) return;
    const reconnectBtn = winEl.querySelector(".flashConnectionReconnectBtn");
    const logoutBtn = winEl.querySelector(".flashConnectionLogoutBtn");
    const buttonTop = Math.max(168, Math.ceil(getFlashConnectionLostContentBottom(winEl) + 5));
    let reconnectWidth = 0;
    if (reconnectBtn) {
        reconnectWidth = measureFlashConnectionButtonWidth(reconnectBtn.textContent || "");
        reconnectBtn.style.width = `${reconnectWidth}px`;
        reconnectBtn.style.left = "15px";
        reconnectBtn.style.top = `${buttonTop}px`;
    }
    if (logoutBtn) {
        const logoutWidth = measureFlashConnectionButtonWidth(logoutBtn.textContent || "");
        logoutBtn.style.width = `${logoutWidth}px`;
        logoutBtn.style.left = `${15 + reconnectWidth + 5}px`;
        logoutBtn.style.top = `${buttonTop}px`;
    }
}

function syncFlashConnectionWindowLayout(key, winEl, preservePosition = false) {
    if (!winEl) return;
    const runtimeCfg = getFlashWindowRuntimeConfig(key, {
        titleKey: key === "connectionLost" ? "title_connection_lost" : "title_connection_info",
        w: key === "connectionLost" ? 300 : 300,
        h: key === "connectionLost" ? 250 : 210,
        resizable: false,
        closeable: false,
        zoomable: false
    });
    const autoSizedWidth = key === "connectionLost" ? parseInt(winEl.dataset.flashAutoSizedWidth || "", 10) || 0 : 0;
    const autoSizedHeight = key === "connectionLost" ? parseInt(winEl.dataset.flashAutoSizedHeight || "", 10) || 0 : 0;
    if (autoSizedWidth > 0) {
        runtimeCfg.w = autoSizedWidth;
    }
    if (autoSizedHeight > 0) {
        runtimeCfg.h = autoSizedHeight;
    }
    const currentLeft = preservePosition ? parseFloat(winEl.style.left) : NaN;
    const currentTop = preservePosition ? parseFloat(winEl.style.top) : NaN;
    enforceFlashWindowBaseSize(key, winEl, runtimeCfg);
    const width = autoSizedWidth || parseInt(winEl.dataset.flashBaseWidth || "", 10) || winEl.offsetWidth || runtimeCfg.w || 300;
    const height = autoSizedHeight || parseInt(winEl.dataset.flashBaseHeight || "", 10) || winEl.offsetHeight || runtimeCfg.h || 210;
    if (Number.isFinite(currentLeft) && Number.isFinite(currentTop)) {
        winEl.style.left = Math.round(currentLeft) + "px";
        winEl.style.top = Math.round(currentTop) + "px";
    } else {
        const pos = getFlashWindowDefaultPos(key, width, height);
        winEl.style.left = Math.round(pos.left || 0) + "px";
        winEl.style.top = Math.round(pos.top || 0) + "px";
    }
    if (key === "connection") layoutFlashConnectionInfoWindow(winEl); else if (key === "connectionLost") layoutFlashConnectionLostWindow(winEl);
}

function createFlashConnectionWindowShell(key) {
    const runtimeCfg = getFlashWindowRuntimeConfig(key, {
        titleKey: key === "connectionLost" ? "title_connection_lost" : "title_connection_info",
        w: key === "connectionLost" ? 300 : 300,
        h: key === "connectionLost" ? 250 : 210,
        resizable: false,
        closeable: false,
        zoomable: false
    });
    const titleKey = runtimeCfg.titleKey || (key === "connectionLost" ? "title_connection_lost" : "title_connection_info");
    const title = flashLocaleText(titleKey, key === "connectionLost" ? "Connection lost" : "Connection information");
    const winEl = document.createElement("div");
    winEl.id = "win_" + key;
    winEl.dataset.windowKey = key;
    winEl.className = "gameWindow flashWindow flashConnectionUiWindow";
    applyFlashConnectionWindowChrome(winEl);
    winEl.innerHTML = `\n        <div class="windowChrome"></div>\n        <div class="windowInterior">\n            <div class="gwHeader">\n                <div class="gwHeaderLeft">\n                    <span class="gwIcon" aria-hidden="true"></span>\n                    <span class="gwTitle"></span>\n                </div>\n            </div>\n            <div class="gwContent" id="content_${key}"></div>\n        </div>\n    `;
    const titleEl = winEl.querySelector(".gwTitle");
    if (titleEl) titleEl.textContent = title;
    const headerEl = winEl.querySelector(".gwHeader");
    if (headerEl && !winEl.__flashConnectionDragBound && typeof makeElementDraggable === "function") {
        makeElementDraggable(winEl, headerEl);
        winEl.__flashConnectionDragBound = true;
    }
    setFlashConnectionWindowVisible(winEl, false);
    syncFlashConnectionWindowLayout(key, winEl);
    bringWindowToFront(winEl);
    ensureFlashConnectionModalLayer().appendChild(winEl);
    return winEl;
}

function ensureFlashConnectionInfoWindow() {
    if (flashConnectionInfoWindowElement && flashConnectionInfoWindowElement.parentNode) return flashConnectionInfoWindowElement;
    const winEl = createFlashConnectionWindowShell("connection");
    const content = winEl.querySelector("#content_connection");
    if (content) {
        const progressSegments = FLASH_CONNECTION_PROGRESS_SEGMENTS.map((seg, idx) => `<span class="flashConnectionProgressSegment" data-progress-index="${idx}" style="left:${seg.left}px;width:${seg.width}px;"></span>`).join("");
        content.innerHTML = `\n            <div class="flashConnectionSprite" aria-hidden="true"></div>\n            <div class="flashConnectionText flashConnectionInfoTop"></div>\n            <div class="flashConnectionProgress" aria-hidden="true">${progressSegments}</div>\n            <div class="flashConnectionText flashConnectionInfoBottom"></div>\n            <button class="flashConnectionActionButton flashConnectionCancelBtn" type="button"></button>\n        `;
        const cancelBtn = content.querySelector(".flashConnectionCancelBtn");
        if (cancelBtn) cancelBtn.addEventListener("click", closeFlashClientWindow);
    }
    flashConnectionInfoWindowElement = winEl;
    syncFlashConnectionInfoLocale();
    return winEl;
}

function ensureFlashConnectionLostWindow() {
    if (flashConnectionLostWindowElement && flashConnectionLostWindowElement.parentNode) return flashConnectionLostWindowElement;
    const winEl = createFlashConnectionWindowShell("connectionLost");
    const content = winEl.querySelector("#content_connectionLost");
    if (content) {
        content.innerHTML = `\n            <div class="flashConnectionSprite" aria-hidden="true"></div>\n            <div class="flashConnectionLostBody"></div>\n            <button class="flashConnectionActionButton flashConnectionReconnectBtn" type="button"></button>\n            <button class="flashConnectionActionButton flashConnectionLogoutBtn" type="button"></button>\n        `;
        const reconnectBtn = content.querySelector(".flashConnectionReconnectBtn");
        const logoutBtn = content.querySelector(".flashConnectionLogoutBtn");
        if (reconnectBtn) {
            reconnectBtn.addEventListener("click", () => {
                hideFlashConnectionLostWindow(false, 300, () => {
                    if (typeof window.reconnectToCurrentMap === "function") {
                        window.reconnectToCurrentMap();
                    }
                });
            });
        }
        if (logoutBtn) logoutBtn.addEventListener("click", closeFlashClientWindow);
    }
    flashConnectionLostWindowElement = winEl;
    syncFlashConnectionLostLocale();
    return winEl;
}

function syncFlashConnectionInfoLocale() {
    const winEl = ensureFlashConnectionInfoWindow();
    const titleEl = winEl.querySelector(".gwTitle");
    if (titleEl) titleEl.textContent = flashLocaleText("title_connection_info", "Connection information");
    const topEl = winEl.querySelector(".flashConnectionInfoTop");
    const bottomEl = winEl.querySelector(".flashConnectionInfoBottom");
    const cancelBtn = winEl.querySelector(".flashConnectionCancelBtn");
    if (topEl) topEl.textContent = flashLocaleText("log_verbinde", "Establishing connection ...");
    if (bottomEl) bottomEl.textContent = flashLocaleText("log_warten", "Please wait ...");
    if (cancelBtn) cancelBtn.textContent = flashLocaleText("log_abbruch", "CANCEL") || "CANCEL";
    layoutFlashConnectionInfoWindow(winEl);
}

function syncFlashConnectionLostLocale() {
    const winEl = ensureFlashConnectionLostWindow();
    const titleEl = winEl.querySelector(".gwTitle");
    if (titleEl) titleEl.textContent = flashLocaleText("title_connection_lost", "Connection lost");
    const bodyEl = winEl.querySelector(".flashConnectionLostBody");
    const reconnectBtn = winEl.querySelector(".flashConnectionReconnectBtn");
    const logoutBtn = winEl.querySelector(".flashConnectionLogoutBtn");
    const head = flashLocaleText("log_verbindunghead", "The connection was interrupted.");
    const body = flashLocaleText("log_verbindungtext", "You're no longer connected to the DarkOrbit game server.\nDo you wish to reconnect?");
    if (bodyEl) bodyEl.textContent = `${head}\n\n${body}`;
    if (reconnectBtn) reconnectBtn.textContent = flashLocaleText("log_neueverbindung", "New connection") || "New connection";
    if (logoutBtn) logoutBtn.textContent = flashLocaleText("log_Logout", "Logout") || "Logout";
    layoutFlashConnectionLostWindow(winEl);
}

function updateFlashConnectionProgress() {
    const winEl = ensureFlashConnectionInfoWindow();
    const segments = Array.from(winEl.querySelectorAll(".flashConnectionProgressSegment"));
    if (!segments.length) return;
    flashConnectionProgressStep = flashConnectionProgressStep % segments.length + 1;
    const litCount = flashConnectionProgressStep;
    segments.forEach((seg, idx) => seg.classList.toggle("on", idx < litCount));
}

function startFlashConnectionProgress() {
    stopFlashConnectionProgress();
    flashConnectionProgressStep = 0;
    updateFlashConnectionProgress();
    flashConnectionProgressTimer = setInterval(updateFlashConnectionProgress, 180);
}

function stopFlashConnectionProgress() {
    if (flashConnectionProgressTimer) {
        clearInterval(flashConnectionProgressTimer);
        flashConnectionProgressTimer = null;
    }
}

function showFlashConnectionInfoWindow() {
    const winEl = ensureFlashConnectionInfoWindow();
    hideFlashConnectionLostWindow(false);
    syncFlashConnectionInfoLocale();
    syncFlashConnectionWindowLayout("connection", winEl);
    setFlashConnectionWindowVisible(winEl, true);
    bringWindowToFront(winEl);
    startFlashConnectionProgress();
    setFlashConnectionModalActive(true);
}

function removeFlashConnectionInfoWindow() {
    stopFlashConnectionProgress();
    if (!flashConnectionInfoWindowElement) {
        setFlashConnectionModalActive(false);
        return;
    }
    if (flashConnectionInfoWindowElement.style.display === "none") {
        const keepModalActive = !!(flashConnectionLostWindowElement && flashConnectionLostWindowElement.style.display !== "none");
        setFlashConnectionModalActive(keepModalActive);
        return;
    }
    fadeOutFlashConnectionWindow(flashConnectionInfoWindowElement, 1e3, () => {
        const keepModalActive = !!(flashConnectionLostWindowElement && flashConnectionLostWindowElement.style.display !== "none");
        setFlashConnectionModalActive(keepModalActive);
    });
}

function showFlashConnectionLostWindow() {
    const winEl = ensureFlashConnectionLostWindow();
    removeFlashConnectionInfoWindow();
    syncFlashConnectionLostLocale();
    syncFlashConnectionWindowLayout("connectionLost", winEl);
    setFlashConnectionWindowVisible(winEl, true);
    winEl.getBoundingClientRect();
    autoSizeFlashConnectionLostWindow(winEl, true);
    bringWindowToFront(winEl);
    setFlashConnectionModalActive(true);
}

function hideFlashConnectionLostWindow(updateLayer = true, durationMs = 0, onHidden = null) {
    if (!flashConnectionLostWindowElement) {
        if (updateLayer) setFlashConnectionModalActive(false);
        if (typeof onHidden === "function") onHidden();
        return;
    }
    if (durationMs > 0) {
        fadeOutFlashConnectionWindow(flashConnectionLostWindowElement, durationMs, () => {
            if (updateLayer) setFlashConnectionModalActive(false);
            if (typeof onHidden === "function") onHidden();
        });
        return;
    }
    setFlashConnectionWindowVisible(flashConnectionLostWindowElement, false);
    if (updateLayer) setFlashConnectionModalActive(false);
    if (typeof onHidden === "function") onHidden();
}

window.showConnectionInfoWindow = showFlashConnectionInfoWindow;

window.removeConnectionWindow = removeFlashConnectionInfoWindow;

window.removeConnectionInfoWindow = removeFlashConnectionInfoWindow;

window.showConnectionLostWindow = showFlashConnectionLostWindow;

window.hideConnectionLostWindow = hideFlashConnectionLostWindow;

window.isConnectionModalBlocking = () => !!window.__ANDRO_CONNECTION_MODAL_ACTIVE;

function updateChatTabVisualState(tab, state) {
    if (!tab) return;
    const signature = `${state.selected ? 1 : 0}|${state.disabled ? 1 : 0}|${state.over ? 1 : 0}|${state.down ? 1 : 0}`;
    if (tab.dataset.parityState !== signature && typeof window.flashParityDebugLog === "function") {
        window.flashParityDebugLog("chat-tab-state", {
            label: tab.textContent || "",
            selected: !!state.selected,
            disabled: !!state.disabled,
            over: !!state.over,
            down: !!state.down
        });
    }
    tab.dataset.parityState = signature;
    tab.classList.remove("chatTabOver", "chatTabDown", "chatTabDisabled", "chatTabSelected");
    if (state.disabled) tab.classList.add("chatTabDisabled");
    if (state.selected) tab.classList.add("chatTabSelected");
    if (state.over && !state.disabled) tab.classList.add("chatTabOver");
}

function getChatTabMetrics() {
    const tabStep = 88;
    const tabInitialOffset = -2;
    return {
        tabStep: tabStep,
        tabInitialOffset: tabInitialOffset
    };
}

function renderChatTabs() {
    const tabs = document.getElementById("chatTabs");
    const wrap = document.querySelector(".doChatTabsWrap");
    if (!tabs || !wrap) return;
    ensureDefaultChatRooms();
    tabs.innerHTML = "";
    const roomSortWeight = room => {
        if (!room) return 999;
        if (Number.isFinite(room.sortOrder)) return room.sortOrder;
        const name = String(room.name || "").toLowerCase();
        if (room.id === 1 || name === "global") return 10;
        if (room.syntheticType === "group") return 35;
        if (room.id >= 2 && room.id <= 4) return 20;
        if (name === "clan" || room.id > 100) return 30;
        return 50;
    };
    chatRooms.sort((a, b) => {
        const diff = roomSortWeight(a) - roomSortWeight(b);
        if (diff !== 0) return diff;
        return a.id - b.id;
    });
    const visibleRooms = chatRooms.filter(room => {
        if (!room) return false;
        const name = (room.name || "").toLowerCase();
        if (room.syntheticType === "group") return room.visible !== false;
        if (name === "whispers") return false;
        if (room.id === 1 || name === "global") return true;
        const factionNames = {
            1: "mmo",
            2: "eic",
            3: "vru"
        };
        const playerFaction = window.heroFactionId || 0;
        const factionMatch = playerFaction && (room.faction === playerFaction || room.id === playerFaction + 1 || name === factionNames[playerFaction]);
        const playerClan = window.heroClanId || 0;
        const clanMatch = playerClan && (room.id === playerClan + 100 || room.faction === playerClan + 100 || name === "clan");
        return factionMatch || clanMatch;
    });
    const fallbackRoom = visibleRooms.find(room => room.id === chatCurrentRoomId);
    const switchedToDefault = !fallbackRoom && chatCurrentRoomId !== 1;
    if (!fallbackRoom) chatCurrentRoomId = 1;
    const {tabStep: tabStep, tabInitialOffset: tabInitialOffset} = getChatTabMetrics();
    if (!Number.isFinite(window.__chatTabPos)) window.__chatTabPos = 0;
    const tabMaskWidth = wrap.clientWidth || 190;
    const rightVisible = (visibleRooms.length + window.__chatTabPos) * tabStep - 2 >= tabMaskWidth;
    if (!rightVisible && window.__chatTabPos < 0) {
        const needed = Math.max(0, Math.ceil((visibleRooms.length * tabStep - 2 - tabMaskWidth) / tabStep));
        window.__chatTabPos = -needed;
    }
    if (window.__chatTabPos > 0) window.__chatTabPos = 0;
    for (const room of visibleRooms) {
        const tab = document.createElement("div");
        tab.className = "chatTab";
        tab.textContent = room.name;
        const state = {
            selected: room.id === chatCurrentRoomId,
            disabled: !!room.disabled,
            over: false,
            down: false
        };
        updateChatTabVisualState(tab, state);
        tab.addEventListener("mouseenter", () => {
            state.over = true;
            updateChatTabVisualState(tab, state);
        });
        tab.addEventListener("mouseleave", () => {
            state.over = false;
            state.down = false;
            updateChatTabVisualState(tab, state);
        });
        tab.addEventListener("click", () => {
            if (state.disabled) return;
            chatCurrentRoomId = room.id;
            if (typeof chatWs !== "undefined" && chatWs && chatWs.readyState === WebSocket.OPEN && room.localOnly !== true) {
                chatWs.send(`bz|0|${chatCurrentRoomId}\0`);
            }
            renderChatTabs();
            renderChatContent();
            const input = document.getElementById("chatInput");
            if (input) input.focus();
        });
        tabs.appendChild(tab);
    }
    tabs.style.setProperty("--chat-tabs-offset", `${tabInitialOffset + window.__chatTabPos * tabStep}px`);
    const leftBtn = document.getElementById("chatTabsLeftBtn");
    const rightBtn = document.getElementById("chatTabsRightBtn");
    const rightShouldShow = (visibleRooms.length + window.__chatTabPos) * tabStep - 2 >= tabMaskWidth;
    if (leftBtn) leftBtn.disabled = !(window.__chatTabPos < 0);
    if (rightBtn) rightBtn.disabled = !rightShouldShow;
    if (switchedToDefault) {
        renderChatContent();
    }
}

function renderChatContent() {
    const content = document.getElementById("chatContent");
    if (!content) return;
    const wasNearBottom = content.scrollHeight - content.scrollTop - content.clientHeight < 6;
    const buf = chatBuffers[chatCurrentRoomId] || [];
    content.innerHTML = "";
    for (const entry of buf) {
        const div = document.createElement("div");
        div.className = "chatLine " + (entry.typeClass || "chatGlobal");
        div.innerHTML = entry.html;
        content.appendChild(div);
    }
    if (typeof trimChatDomContainer === "function") trimChatDomContainer(content);
    if (window.FLASH_PARITY_DEBUG && typeof window.flashParityDebugLog === "function") {
        window.flashParityDebugLog("chat-render", {
            roomId: chatCurrentRoomId,
            renderedCount: buf.length
        });
    }
    if (wasNearBottom) content.scrollTop = content.scrollHeight;
    syncChatScrollThumb();
}

function sendChatMessage() {
    const input = document.getElementById("chatInput");
    if (!input) return;
    const msg = String(input.value || "").trim();
    if (!msg) {
        syncChatSendButtonState();
        return;
    }
    const roomId = typeof chatCurrentRoomId !== "undefined" && chatCurrentRoomId != null ? chatCurrentRoomId : 1;
    if (typeof window.isSyntheticGroupChatRoom === "function" && window.isSyntheticGroupChatRoom(roomId)) {
        const handled = typeof window.sendSyntheticGroupChatMessage === "function" ? window.sendSyntheticGroupChatMessage(msg) : false;
        if (handled) {
            input.value = "";
        }
        syncChatSendButtonState();
        return;
    }
    if (typeof chatWs === "undefined" || !chatWs || chatWs.readyState !== WebSocket.OPEN) {
        console.warn("[CHAT] sendChatMessage: chat websocket not connected");
        if (typeof window.ensureChatConnection === "function") {
            window.ensureChatConnection("send-chat");
        }
        const now = Date.now();
        if (!window.__lastChatReconnectNoticeAt || now - window.__lastChatReconnectNoticeAt > 3000) {
            window.__lastChatReconnectNoticeAt = now;
            if (typeof addChatSystemLikeMessage === "function") {
                addChatSystemLikeMessage("Chat connection lost. Reconnecting...", roomId, "chatSystem");
            }
        }
        syncChatSendButtonState();
        return;
    }
    const payload = `a|${roomId}|${msg}\0`;
    try {
        chatWs.send(payload);
    } catch (e) {
        console.error("[CHAT] sendChatMessage failed", e);
    }
    input.value = "";
    syncChatSendButtonState();
}

function syncChatSendButtonState() {
    return;
}

function getChatScrollMetrics() {
    const frame = document.querySelector("#content_chat .doChatFrame");
    const content = document.getElementById("chatContent");
    const thumb = document.getElementById("chatScrollThumb");
    if (!frame || !content || !thumb) return null;
    const frameHeight = Math.max(150, frame.clientHeight || 150);
    const baseTrackTop = 35;
    const baseTrackHeight = 80;
    const holderHeight = 28;
    const deltaH = frameHeight - 150;
    const trackTop = baseTrackTop;
    const trackHeight = Math.max(holderHeight, baseTrackHeight + deltaH);
    const trackBottom = trackTop + trackHeight;
    return {
        frame: frame,
        content: content,
        thumb: thumb,
        trackTop: trackTop,
        trackHeight: trackHeight,
        trackBottom: trackBottom,
        holderHeight: holderHeight
    };
}

function syncChatScrollThumb() {
    const m = getChatScrollMetrics();
    if (!m) return;
    const {content: content, thumb: thumb, trackTop: trackTop, trackHeight: trackHeight, holderHeight: holderHeight} = m;
    const track = document.querySelector("#content_chat .doChatScrollTrack");
    const maxScroll = Math.max(0, content.scrollHeight - content.clientHeight);
    if (maxScroll <= 0) {
        thumb.style.display = "none";
        if (track) track.style.display = "none";
        content.scrollTop = 0;
        return;
    }
    thumb.style.display = "block";
    if (track) track.style.display = "block";
    const span = Math.max(1, trackHeight - holderHeight);
    const ratio = maxScroll > 0 ? content.scrollTop / maxScroll : 0;
    const y = Math.round(trackTop + ratio * span);
    thumb.style.top = `${y}px`;
    thumb.style.height = `${holderHeight}px`;
}

function bindChatScrollInteractions() {
    const m = getChatScrollMetrics();
    if (!m) return;
    const {content: content, thumb: thumb, trackTop: trackTop, trackHeight: trackHeight, holderHeight: holderHeight} = m;
    const span = Math.max(1, trackHeight - holderHeight);
    let dragging = false;
    let grabOffset = 0;
    const onMove = ev => {
        if (!dragging) return;
        ev.preventDefault();
        const frameRect = m.frame.getBoundingClientRect();
        const localY = ev.clientY - frameRect.top;
        const minY = trackTop;
        const maxY = trackTop + span;
        const thumbY = Math.max(minY, Math.min(maxY, localY - grabOffset));
        thumb.style.top = `${Math.round(thumbY)}px`;
        const maxScroll = Math.max(0, content.scrollHeight - content.clientHeight);
        const ratio = (thumbY - trackTop) / span;
        content.scrollTop = Math.round(ratio * maxScroll);
    };
    const onUp = () => {
        dragging = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
    };
    thumb.addEventListener("mousedown", ev => {
        ev.preventDefault();
        const top = parseFloat(thumb.style.top || `${trackTop}`) || trackTop;
        dragging = true;
        grabOffset = ev.clientY - (m.frame.getBoundingClientRect().top + top);
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    });
    content.addEventListener("wheel", ev => {
        if (!content) return;
        ev.preventDefault();
        const delta = ev.deltaY || 0;
        const next = content.scrollTop + delta;
        const maxScroll = Math.max(0, content.scrollHeight - content.clientHeight);
        content.scrollTop = Math.max(0, Math.min(maxScroll, next));
        syncChatScrollThumb();
    }, {
        passive: false
    });
    content.addEventListener("scroll", syncChatScrollThumb);
    window.addEventListener("resize", syncChatScrollThumb);
    syncChatScrollThumb();
}

window.sendChatMessage = sendChatMessage;

function initChatInterface() {
    const tryInit = () => {
        const container = document.getElementById("content_chat");
        if (!container) return false;
        if (container.dataset.chatInit === "1") return true;
        container.dataset.chatInit = "1";
        container.innerHTML = `\n            <div class="doChatFrame">\n                <div class="doChatTop">\n                    <div class="doChatTopLeft"></div>\n                    <div class="doChatTopMid">\n                        <div class="doChatTabsWrap">\n                            <div id="chatTabs" class="doChatTabs"></div>\n                        </div>\n                        <button id="chatTabsLeftBtn" class="doChatTabBtn doChatTabBtnLeft" type="button"></button>\n                        <button id="chatTabsRightBtn" class="doChatTabBtn doChatTabBtnRight" type="button"></button>\n                    </div>\n                    <div class="doChatTopRight"></div>\n                </div>\n\n                <div class="doChatMid">\n                    <div class="doChatMidLeft"></div>\n                    <div class="doChatMidMid">\n                    </div>\n                    <div class="doChatMidRight"></div>\n                </div>\n\n                <div class="doChatBottom">\n                    <div class="doChatBottomLeft"></div>\n                    <div class="doChatBottomMid"></div>\n                    <div class="doChatBottomRight"></div>\n                </div>\n\n                <div class="doChatOverlay">\n                    <div id="chatContent" class="doChatContent"></div>\n                    <input type="text" id="chatInput" class="doChatInput" placeholder="" autocomplete="off" />\n                    <div class="doChatScrollTrack"></div>\n                    <div id="chatScrollThumb" class="doChatScrollThumb"></div>\n                </div>\n            </div>\n        `;
        const input = document.getElementById("chatInput");
        const leftBtn = document.getElementById("chatTabsLeftBtn");
        const rightBtn = document.getElementById("chatTabsRightBtn");
        if (leftBtn) leftBtn.onclick = () => {
            window.__chatTabPos = Math.min(0, (window.__chatTabPos || 0) + 1);
            renderChatTabs();
        };
        if (rightBtn) rightBtn.onclick = () => {
            window.__chatTabPos = (window.__chatTabPos || 0) - 1;
            renderChatTabs();
        };
        if (input) {
            input.addEventListener("keydown", e => {
                if (e.key !== "Enter" || e.isComposing) return;
                e.preventDefault();
                e.stopPropagation();
                sendChatMessage();
            });
            input.addEventListener("focus", () => {
                if (typeof window.ensureChatConnection === "function") {
                    window.ensureChatConnection("chat-focus");
                }
            });
        }
        const content = document.getElementById("chatContent");
        if (content) {
            content.addEventListener("click", ev => {
                const target = ev.target instanceof HTMLElement ? ev.target.closest(".chatName[data-name]") : null;
                if (!target) return;
                const name = String(target.getAttribute("data-name") || "").trim();
                if (!name) return;
                const inp = document.getElementById("chatInput");
                if (!inp) return;
                inp.value = `/w ${name} `;
                inp.focus();
            });
        }
        bindChatScrollInteractions();
        renderChatTabs();
        renderChatContent();
        syncChatScrollThumb();
        return true;
    };
    if (!tryInit()) {
        const interval = setInterval(() => {
            if (tryInit()) clearInterval(interval);
        }, 200);
    }
}

function getLogicalPointerPosition(evt) {
    if (!evt || !canvas) {
        return {
            x: 0,
            y: 0
        };
    }
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width ? canvas.width / rect.width : 1;
    const scaleY = rect.height ? canvas.height / rect.height : 1;
    return {
        x: (evt.clientX - rect.left) * scaleX,
        y: (evt.clientY - rect.top) * scaleY
    };
}

window.getLogicalPointerPosition = getLogicalPointerPosition;

(function() {
    const quickbarReusableBounds = {
        x: 0,
        y: 0,
        w: 0,
        h: 0
    };
    const quickbarReusableSlotRects = {};
    const quickbarReusableZeroPoint = {
        x: 0,
        y: 0
    };
    const quickbarReusableFallbackPoints = [];
    const quickbarReusableDraggerHitbox = {
        x: 0,
        y: 0,
        w: 0,
        h: 0
    };
    const quickbarReusableRotateHitbox = {
        x: 0,
        y: 0,
        w: 0,
        h: 0
    };
    const quickbarActionStateScratch = {
        cpuInfo: null,
        actionState: null
    };
    const flashQuickbarDigitPathCache = Object.create(null);
    const flashQuickbarActionMenuImagePathCache = Object.create(null);

    function flashQuickbarSetRect(rect, x, y, w, h) {
        rect.x = x;
        rect.y = y;
        rect.w = w;
        rect.h = h;
        return rect;
    }

    function flashQuickbarGetReusableSlotRect(slot) {
        let rect = quickbarReusableSlotRects[slot];
        if (!rect) {
            rect = {
                x: 0,
                y: 0,
                w: 0,
                h: 0
            };
            quickbarReusableSlotRects[slot] = rect;
        }
        return rect;
    }

    function flashQuickbarGetFallbackSlotPoints(slotWidth) {
        for (let idx = 0; idx < 10; idx++) {
            let point = quickbarReusableFallbackPoints[idx];
            if (!point) {
                point = {
                    x: 0,
                    y: 0
                };
                quickbarReusableFallbackPoints[idx] = point;
            }
            point.x = idx * (slotWidth + 3);
            point.y = 0;
        }
        return quickbarReusableFallbackPoints;
    }

    function flashQuickbarUnionRect(a, b) {
        if (!b) return a || null;
        if (!a) {
            return flashQuickbarSetRect(quickbarReusableBounds, b.x, b.y, b.w, b.h);
        }
        const minX = Math.min(a.x, b.x);
        const minY = Math.min(a.y, b.y);
        const maxX = Math.max(a.x + a.w, b.x + b.w);
        const maxY = Math.max(a.y + a.h, b.y + b.h);
        return flashQuickbarSetRect(a, minX, minY, maxX - minX, maxY - minY);
    }

    function flashQuickbarDrawImage(path, x, y, width, height) {
        if (!path || typeof getUiImage !== "function" || !ctx) return false;
        const img = getUiImage(path);
        if (!img || !img.complete || !(img.naturalWidth || img.width)) {
            return false;
        }
        const drawWidth = Number.isFinite(width) ? width : (img.naturalWidth || img.width);
        const drawHeight = Number.isFinite(height) ? height : (img.naturalHeight || img.height);
        ctx.drawImage(img, Math.round(x), Math.round(y), drawWidth, drawHeight);
        return true;
    }

    function flashQuickbarDrawFallbackSlot(x, y, width, height) {
        if (!ctx) return;
        ctx.save();
        ctx.fillStyle = "rgba(8, 16, 28, 0.85)";
        ctx.strokeStyle = "rgba(120, 170, 220, 0.85)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + width / 2, y);
        ctx.lineTo(x + width, y + width * 0.22);
        ctx.lineTo(x + width, y + height - width * 0.22);
        ctx.lineTo(x + width / 2, y + height);
        ctx.lineTo(x, y + height - width * 0.22);
        ctx.lineTo(x, y + width * 0.22);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    function flashQuickbarGetDigitPath(slot) {
        let path = flashQuickbarDigitPathCache[slot];
        if (!path) {
            const imageId = 355 + (slot - 1) * 2;
            path = `graphics/ui/actionMenu/images/${imageId}.png`;
            flashQuickbarDigitPathCache[slot] = path;
        }
        return path;
    }

    function flashQuickbarGetActionMenuImagePath(imageNum) {
        let path = flashQuickbarActionMenuImagePathCache[imageNum];
        if (!path) {
            path = `graphics/ui/actionMenu/images/${imageNum}.png`;
            flashQuickbarActionMenuImagePathCache[imageNum] = path;
        }
        return path;
    }

    function flashQuickbarDrawDigit(slot, slotX, slotY, slotWidth, slotHeight) {
        if (!ctx) return;
        const digitPath = flashQuickbarGetDigitPath(slot);
        const digitImg = typeof getUiImage === "function" ? getUiImage(digitPath) : null;
        if (digitImg && digitImg.complete && (digitImg.naturalWidth || digitImg.width)) {
            const digitWidth = digitImg.naturalWidth || digitImg.width;
            const digitHeight = digitImg.naturalHeight || digitImg.height;
            const digitX = slotX + slotWidth * 0.5 - digitWidth * 0.5 + 1;
            const digitY = slotY + slotHeight - digitWidth + 1;
            ctx.drawImage(digitImg, Math.round(digitX), Math.round(digitY), digitWidth, digitHeight);
            return;
        }
        ctx.save();
        ctx.font = "bold 9px Arial";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(slot === 10 ? "0" : String(slot), Math.round(slotX + slotWidth / 2 + 1), Math.round(slotY + slotHeight - 2));
        ctx.restore();
    }

    function flashQuickbarDrawQuantityText(text, centerX, topY, empty) {
        if (!ctx || text == null || text === "") return;
        ctx.save();
        ctx.font = "9px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(0,0,0,0.85)";
        ctx.fillStyle = empty ? "#ff6363" : "#ffffff";
        ctx.strokeText(String(text), centerX, topY);
        ctx.fillText(String(text), centerX, topY);
        ctx.restore();
    }

    function flashQuickbarDrawLauncherVisual(slotX, slotY) {
        if (typeof flashGetLauncherSelectedRocketId !== "function" || typeof flashGetLauncherCapacity !== "function") {
            return;
        }
        const selectedRocketId = flashGetLauncherSelectedRocketId();
        const launcherCapacity = flashGetLauncherCapacity();
        const launcherLoaded = Math.max(0, parseInt(window.heroRocketLauncherRocketsLoaded, 10) || 0);
        const selectedRocketPath = (typeof FLASH_ACTION_MENU_LAUNCHER_ICON_BY_ROCKET_ID !== "undefined" && FLASH_ACTION_MENU_LAUNCHER_ICON_BY_ROCKET_ID[selectedRocketId]) || (typeof FLASH_ACTION_MENU_LAUNCHER_UNLOADED_SYMBOL_EXACT !== "undefined" ? FLASH_ACTION_MENU_LAUNCHER_UNLOADED_SYMBOL_EXACT : "");
        if (launcherCapacity <= 0) {
            flashQuickbarDrawImage(typeof FLASH_ACTION_MENU_LAUNCHER_UNLOADED_SYMBOL_EXACT !== "undefined" ? FLASH_ACTION_MENU_LAUNCHER_UNLOADED_SYMBOL_EXACT : selectedRocketPath, slotX, slotY, FLASH_QUICKBAR_SLOT_WIDTH, FLASH_QUICKBAR_SLOT_HEIGHT);
            return;
        }
        flashQuickbarDrawImage(selectedRocketPath, slotX, slotY, FLASH_QUICKBAR_SLOT_WIDTH, FLASH_QUICKBAR_SLOT_HEIGHT);
        const trackPath = typeof FLASH_ACTION_MENU_LAUNCHER_SLOT_TRACK_BY_CAPACITY !== "undefined" ? FLASH_ACTION_MENU_LAUNCHER_SLOT_TRACK_BY_CAPACITY[launcherCapacity] || "" : "";
        const trackX = slotX + (launcherCapacity === 5 ? 4 : 9);
        const trackWidth = launcherCapacity === 5 ? 24 : 14;
        flashQuickbarDrawImage(trackPath, trackX, slotY + 15, trackWidth, 4);
        const filledDotPath = typeof FLASH_ACTION_MENU_LAUNCHER_FILLED_DOT_BY_ROCKET_ID !== "undefined" ? FLASH_ACTION_MENU_LAUNCHER_FILLED_DOT_BY_ROCKET_ID[selectedRocketId] || "" : "";
        const slotOffsets = typeof FLASH_ACTION_MENU_LAUNCHER_FILLED_SLOT_OFFSETS_BY_CAPACITY !== "undefined" ? FLASH_ACTION_MENU_LAUNCHER_FILLED_SLOT_OFFSETS_BY_CAPACITY[launcherCapacity] || [] : [];
        const filledCount = Math.max(0, Math.min(launcherLoaded, slotOffsets.length));
        for (let index = 0; index < filledCount; index++) {
            flashQuickbarDrawImage(filledDotPath, slotX + slotOffsets[index], slotY + 15, 4, 4);
        }
    }

    function flashQuickbarGetActionState(item, out) {
        const cpuInfo = item && item.type === "cpu" && typeof flashGetActionCpuInfo === "function" ? flashGetActionCpuInfo(item.code || "") : null;
        const actionState = typeof flashGetActionRuntimeState === "function" ? flashGetActionRuntimeState(item, cpuInfo) : {
            enabled: true,
            active: false,
            cooling: false,
            disabledAlpha: 0.5,
            cooldown: null
        };
        out.cpuInfo = cpuInfo;
        out.actionState = actionState;
        return out;
    }

    drawQuickbar = function() {
        if (!ctx || !canvas) return;
        if (typeof flashEnsureQuickbarPositionInitialized === "function") {
            flashEnsureQuickbarPositionInitialized();
        }
        quickbarLockHitbox = null;
        quickbarRotateHitbox = null;
        quickbarMinHitbox = null;
        quickbarDraggerHitbox = null;
        quickbarBounds = null;
        for (let slot = 1; slot <= 10; slot++) {
            quickbarSlotRects[slot] = null;
            quickbarSlotHitboxes[slot] = null;
        }
        if (quickbarMinimized) {
            return;
        }

        const slotWidth = typeof FLASH_QUICKBAR_SLOT_WIDTH === "number" ? FLASH_QUICKBAR_SLOT_WIDTH : 32;
        const slotHeight = typeof FLASH_QUICKBAR_SLOT_HEIGHT === "number" ? FLASH_QUICKBAR_SLOT_HEIGHT : 35;
        const points = typeof flashGetQuickbarSlotPoints === "function" ? flashGetQuickbarSlotPoints(quickbarLayoutMode) : flashQuickbarGetFallbackSlotPoints(slotWidth);

        ctx.save();
        for (let slot = 1; slot <= 10; slot++) {
            const point = points[slot - 1] || quickbarReusableZeroPoint;
            const slotX = Math.round(quickbarPosition.x + point.x);
            const slotY = Math.round(quickbarPosition.y + point.y);
            const rawItem = typeof flashResolveQuickbarItem === "function" ? flashResolveQuickbarItem(quickSlots[slot]) : quickSlots[slot];
            const actionCode = rawItem && typeof flashGetCooldownCodeForItem === "function" ? flashGetCooldownCodeForItem(rawItem) : (rawItem && (rawItem.cooldownCode || rawItem.code) || "");
            const isBlacklisted = !!(rawItem && actionCode && typeof isActionBlacklisted === "function" && isActionBlacklisted(actionCode));
            const item = isBlacklisted ? null : rawItem;
            const shouldDrawSlot = !quickbarLocked || !!item;
            if (!shouldDrawSlot) {
                continue;
            }

            const slotRect = flashQuickbarSetRect(flashQuickbarGetReusableSlotRect(slot), slotX, slotY, slotWidth, slotHeight);
            quickbarSlotRects[slot] = slotRect;
            quickbarSlotHitboxes[slot] = slotRect;
            quickbarBounds = flashQuickbarUnionRect(quickbarBounds, slotRect);

            if (!flashQuickbarDrawImage(typeof FLASH_ACTION_MENU_SLOT_BG !== "undefined" ? FLASH_ACTION_MENU_SLOT_BG : "graphics/ui/actionMenu/images/slot.png", slotX, slotY, slotWidth, slotHeight)) {
                flashQuickbarDrawFallbackSlot(slotX, slotY, slotWidth, slotHeight);
            }

            if (item) {
                const actionRuntime = flashQuickbarGetActionState(item, quickbarActionStateScratch);
                const cpuInfo = actionRuntime.cpuInfo;
                const actionState = actionRuntime.actionState;
                const isActiveAmmo = item.type === "ammo" && Number(currentAmmoId) === Number(item.id);
                const isActiveRocket = item.type === "rocket" && Number(currentRocketId) === Number(item.id);
                const isActiveLauncherRocket = item.type === "launcherRocket" && typeof flashGetLauncherSelectedRocketId === "function" && Number(flashGetLauncherSelectedRocketId()) === Number(item.id);
                const isActiveAutoRocket = item.type === "cpu" && item.code === "ARL" && !!(cpuInfo && cpuInfo.state);
                const isActiveCpuToggle = item.type === "cpu" && (item.code === "AMB" || item.code === "RKB" || item.code === "RLC") && !!(cpuInfo && cpuInfo.state);
                const suppressCpuGlow = item.type === "cpu" && item.code === "CLK";
                const isHighlighted = (suppressCpuGlow ? false : !!actionState.active) || isActiveAmmo || isActiveRocket || isActiveLauncherRocket || isActiveAutoRocket || isActiveCpuToggle;
                const isFastbuy = item.categoryKey === "fastbuy" || item.type === "buy";
                const baseBgPath = item.bgDefault || (isFastbuy && typeof FLASH_ACTION_MENU_FASTBUY_BG_DEFAULT !== "undefined" ? FLASH_ACTION_MENU_FASTBUY_BG_DEFAULT : (typeof FLASH_ACTION_MENU_ITEM_BG_DEFAULT !== "undefined" ? FLASH_ACTION_MENU_ITEM_BG_DEFAULT : ""));
                const hoverBgPath = item.bgHover || (isFastbuy && typeof FLASH_ACTION_MENU_FASTBUY_BG_HOVER !== "undefined" ? FLASH_ACTION_MENU_FASTBUY_BG_HOVER : baseBgPath);
                const selectedBgPath = item.bgSelected || (isFastbuy && typeof FLASH_ACTION_MENU_FASTBUY_BG_SELECTED !== "undefined" ? FLASH_ACTION_MENU_FASTBUY_BG_SELECTED : (typeof FLASH_ACTION_MENU_ITEM_BG_SELECTED !== "undefined" ? FLASH_ACTION_MENU_ITEM_BG_SELECTED : ""));
                const isHovered = quickbarHoveredSlot === slot;

                if (baseBgPath) {
                    flashQuickbarDrawImage(baseBgPath, slotX, slotY, slotWidth, slotHeight);
                }
                if (isHovered && actionState.enabled && !isHighlighted && hoverBgPath) {
                    flashQuickbarDrawImage(hoverBgPath, slotX, slotY, slotWidth, slotHeight);
                }
                if (!actionState.cooldown && isHighlighted && selectedBgPath) {
                    flashQuickbarDrawImage(selectedBgPath, slotX - 1, slotY - 2, slotWidth + 2, slotHeight + 4);
                }

                if (Number(item.buttonId) === 46) {
                    flashQuickbarDrawLauncherVisual(slotX, slotY);
                } else {
                    const iconPath = typeof flashResolveActionItemIconPath === "function" ? flashResolveActionItemIconPath(item, item) : (item.iconPath || "");
                    if (iconPath) {
                        flashQuickbarDrawImage(iconPath, slotX, slotY, slotWidth, slotHeight);
                    } else {
                        ctx.save();
                        ctx.font = "9px Arial";
                        ctx.fillStyle = "#dddddd";
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText(String(item.label || item.code || "Action").slice(0, 8), slotX + slotWidth / 2, slotY + slotHeight / 2);
                        ctx.restore();
                    }
                }

                let qty = 0;
                let hasStock = false;
                if (item.type === "launcher") {
                    qty = Math.max(0, parseInt(window.heroRocketLauncherRocketsLoaded, 10) || 0);
                    hasStock = qty > 0 || (typeof flashGetLauncherCapacity === "function" && flashGetLauncherCapacity() > 0);
                } else if (item.type === "cpu" && cpuInfo) {
                    qty = parseInt(cpuInfo.amount, 10) || 0;
                    hasStock = cpuInfo.hasItem !== false;
                } else if (typeof flashGetActionStockCount === "function") {
                    qty = flashGetActionStockCount(item);
                    hasStock = typeof flashGetActionStockId === "function" ? flashGetActionStockId(item) != null : qty > 0;
                }

                if (Number(item.buttonId) !== 46) {
                    if (item.ammobar && hasStock && typeof AMMO_BAR_FRAME_IDS !== "undefined" && AMMO_BAR_FRAME_IDS.length > 0) {
                        const maxValue = item.type === "ammo" ? 2000 : 100;
                        const clampedQty = Math.max(0, Math.min(qty, maxValue));
                        const ratio = maxValue > 0 ? clampedQty / maxValue : 0;
                        const frameIndex = Math.min(AMMO_BAR_FRAME_IDS.length - 1, Math.max(0, Math.floor(ratio * (AMMO_BAR_FRAME_IDS.length - 1))));
                        const imageNum = AMMO_BAR_FRAME_IDS[frameIndex];
                        flashQuickbarDrawImage(flashQuickbarGetActionMenuImagePath(imageNum), slotX + (typeof FLASH_ACTION_MENU_V2_AMMOBAR_LEFT === "number" ? FLASH_ACTION_MENU_V2_AMMOBAR_LEFT : 3), slotY + (typeof FLASH_ACTION_MENU_V2_AMMOBAR_TOP === "number" ? FLASH_ACTION_MENU_V2_AMMOBAR_TOP : 9), typeof FLASH_ACTION_MENU_V2_AMMOBAR_WIDTH === "number" ? FLASH_ACTION_MENU_V2_AMMOBAR_WIDTH : 29, typeof FLASH_ACTION_MENU_V2_AMMOBAR_HEIGHT === "number" ? FLASH_ACTION_MENU_V2_AMMOBAR_HEIGHT : 6);
                    } else if (item.counter) {
                        const canShowCounter = hasStock || (item.type === "cpu" && cpuInfo && cpuInfo.hasItem !== false);
                        if (canShowCounter) {
                            const qtyText = qty > 9999 ? `${Math.round(qty / 1000)}k` : String(qty);
                            flashQuickbarDrawQuantityText(qtyText, Math.round(slotX + slotWidth / 2), slotY + (typeof FLASH_ACTION_MENU_V2_QTY_TOP === "number" ? FLASH_ACTION_MENU_V2_QTY_TOP : 9), qty <= 0);
                        }
                    }
                }

                if (!actionState.enabled && typeof FLASH_ACTION_MENU_DISABLED_BG !== "undefined") {
                    ctx.save();
                    ctx.globalAlpha = Number.isFinite(actionState.disabledAlpha) ? actionState.disabledAlpha : 0.5;
                    flashQuickbarDrawImage(FLASH_ACTION_MENU_DISABLED_BG, slotX, slotY, slotWidth, slotHeight);
                    ctx.restore();
                }
                if (actionState.cooldown) {
                    const ratio = Math.max(0, Math.min(1, actionState.cooldown.remaining / Math.max(actionState.cooldown.total || actionState.cooldown.remaining || 1, 1)));
                    if (typeof flashDrawCooldownOverlayOnCanvas === "function") {
                        flashDrawCooldownOverlayOnCanvas(ctx, slotX, slotY, slotWidth, slotHeight, ratio, item.type === "tech" || item.type === "ability" ? 0.82 : 0.72);
                    }
                }
            }

            flashQuickbarDrawDigit(slot, slotX, slotY, slotWidth, slotHeight);
        }

        if (!quickbarLocked) {
            const draggerSize = 20;
            const draggerPath = quickbarDraggerHovered ? "graphics/ui/actionMenu/images/173.png" : "graphics/ui/actionMenu/images/171.png";
            quickbarDraggerHitbox = flashQuickbarSetRect(quickbarReusableDraggerHitbox, Math.round(quickbarPosition.x - 7), Math.round(quickbarPosition.y - 14), draggerSize, draggerSize);
            flashQuickbarDrawImage(draggerPath, quickbarDraggerHitbox.x, quickbarDraggerHitbox.y, draggerSize, draggerSize);
            quickbarBounds = flashQuickbarUnionRect(quickbarBounds, quickbarDraggerHitbox);

            const verticalMode = Number(quickbarLayoutMode) === 2 || Number(quickbarLayoutMode) === 3;
            const rotatorSize = 20;
            quickbarRotateHitbox = flashQuickbarSetRect(quickbarReusableRotateHitbox, Math.round(quickbarPosition.x + (verticalMode ? 21 : -7)), Math.round(quickbarPosition.y + (verticalMode ? -14 : 29)), rotatorSize, rotatorSize);
            const rotatorPath = quickbarRotateHovered ? "graphics/ui/actionMenu/images/159.png" : "graphics/ui/actionMenu/images/157.png";
            flashQuickbarDrawImage(rotatorPath, quickbarRotateHitbox.x, quickbarRotateHitbox.y, rotatorSize, rotatorSize);
            quickbarBounds = flashQuickbarUnionRect(quickbarBounds, quickbarRotateHitbox);
        }

        ctx.restore();
    };

    window.isPointInQuickbarRegion = function(screenX, screenY) {
        if (quickbarDraggerHitbox && isPointInRect(screenX, screenY, quickbarDraggerHitbox)) return true;
        if (quickbarRotateHitbox && isPointInRect(screenX, screenY, quickbarRotateHitbox)) return true;
        for (let slot = 1; slot <= 10; slot++) {
            const rect = quickbarSlotHitboxes[slot];
            if (rect && isPointInRect(screenX, screenY, rect)) {
                return true;
            }
        }
        return false;
    };
})();
