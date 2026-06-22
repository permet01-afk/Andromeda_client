
















    function getStarfieldAnchor(cameraXValue, cameraYValue) {
        const camX = typeof cameraXValue === "number" ? cameraXValue : 0;
        const camY = typeof cameraYValue === "number" ? cameraYValue : 0;
        const halfW = canvas ? canvas.width / 2 : 0;
        const halfH = canvas ? canvas.height / 2 : 0;

        const scale = (typeof getWorldScaleValue === "function")
            ? getWorldScaleValue()
            : 1;

return {
  x: halfW - camX * scale,
  y: halfH - camY * scale
};

    }

    function ensureStarfieldInitialized() {
        if (!starfieldEnabled) return;
        const width = canvas ? canvas.width : 0;
        const height = canvas ? canvas.height : 0;
        if (!width || !height) return;

        const needsReinit =
            !starfieldState ||
            starfieldState.width !== width ||
            starfieldState.height !== height;

        if (!needsReinit) return;

        const starCount = STARFIELD_DEFAULT_COUNT;
        const stars = [];
        for (let i = 0; i < starCount; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                speed: Math.random() * (STARFIELD_SPEED_MAX - STARFIELD_SPEED_MIN) + STARFIELD_SPEED_MIN
            });
        }

        starfieldState = {
            width,
            height,
            stars,
            velocityX: 0,
            velocityY: 0,
            lastTick: performance.now(),
            timeAccumulator: 0
        };

        lastStarfieldAnchor = getStarfieldAnchor(cameraX, cameraY);
    }

    function resetStarfieldState() {
        starfieldState = null;
        lastStarfieldAnchor = getStarfieldAnchor(cameraX, cameraY);

        ensureStarfieldInitialized();
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

        const targetAnchor = getStarfieldAnchor(cameraXValue, cameraYValue);
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
        const tickDuration = 1000 / STARFIELD_FPS;
        starfieldState.timeAccumulator += Math.max(0, now - (starfieldState.lastTick || now));

        while (starfieldState.timeAccumulator >= tickDuration) {
            starfieldState.stars.forEach((star) => {
                const nextX = star.x + starfieldState.velocityX * star.speed;
                const nextY = star.y + starfieldState.velocityY * star.speed;

                star.x = nextX < 0 ? nextX + starfieldState.width : nextX > starfieldState.width ? nextX - starfieldState.width : nextX;
                star.y = nextY < 0 ? nextY + starfieldState.height : nextY > starfieldState.height ? nextY - starfieldState.height : nextY;
            });

            starfieldState.timeAccumulator -= tickDuration;
        }

        starfieldState.lastTick = now;
        lastStarfieldAnchor = targetAnchor;
    }

    function drawStarfield() {
        if (!starfieldEnabled || !starfieldState || !starfieldState.stars.length) return;

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = `#${(starfieldColor >>> 0).toString(16).padStart(6, "0")}`;

        starfieldState.stars.forEach((star) => {
            const x = Math.round(star.x);
            const y = Math.round(star.y);
            ctx.fillRect(x, y, 1, 1);
        });

        ctx.restore();
    }

    const rocketSpriteCache = {};

    function getRocketSprite(rocketId) {
        if (typeof ROCKET_SPRITE_DEFS === "undefined") return null;

        const hasDef = Number.isFinite(rocketId) && ROCKET_SPRITE_DEFS[rocketId];
        const fallbackId = (typeof DEFAULT_ROCKET_SPRITE_ID === "number") ? DEFAULT_ROCKET_SPRITE_ID : null;
        const resolvedId = hasDef ? rocketId : fallbackId;
        if (resolvedId == null || !ROCKET_SPRITE_DEFS[resolvedId]) return null;

        const cacheKey = hasDef ? rocketId : resolvedId;
        if (!rocketSpriteCache[cacheKey]) {
            const def = ROCKET_SPRITE_DEFS[resolvedId];
            const img = new Image();
            img.src = def.path;
            rocketSpriteCache[cacheKey] = {
                img,
                width: def.width,
                height: def.height
            };
        }

        return rocketSpriteCache[cacheKey];
    }

    function drawMapBackground() {
        // Clear the full viewport every frame to avoid ghosting / repetition when the
        // background image is smaller than the canvas.
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        updateStarfield(cameraX, cameraY);

        if (backgroundLayersEnabled && currentBackgroundLayers && currentBackgroundLayers.length) {
            const scale = 1;
            const orderedLayers = [...currentBackgroundLayers].sort((a, b) => (a.layer || 0) - (b.layer || 0));

            orderedLayers.forEach((layer) => {
                const bg = layer.image;
                if (!bg || !bg.complete || bg.width === 0 || bg.height === 0) return;

                const parallax = layer.parallax || DEFAULT_BACKGROUND_PARALLAX;
                const drawWidth = bg.width * scale;
                const drawHeight = bg.height * scale;

                if (drawWidth < 1 || drawHeight < 1) return;

                const offsets = layer.offsets || { x: layer.shiftX || 0, y: layer.shiftY || 0 };
                const screenX = LOGICAL_WIDTH / 2 - (cameraX / parallax) * scale + offsets.x * scale;
                const screenY = LOGICAL_HEIGHT / 2 - (cameraY / parallax) * scale + offsets.y * scale;

                const previousSmoothing = ctx.imageSmoothingEnabled;
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(bg, screenX, screenY, drawWidth, drawHeight);
                ctx.imageSmoothingEnabled = previousSmoothing;
            });
        }

        drawStarfield();
    }

    const ENGINE_FRAME_DURATION = 1000 / ((ENGINE_SPRITE_DEFS[DEFAULT_ENGINE_KEY]?.fps) || ENGINE_ANIM_FPS || 20);
    const ENGINE_MOVING_MAX_TICKS = 3;
    const engineAnimationState = {};
    const engineSmokeState = {};

    // --- BOX (CARGO) ANIMATION SPRITES ---
    const BOX_ANIMATION_FRAME_DURATION = 25; // ms (Flash client timer cadence)
    const BONUS_BOX_ANIMATION_FRAME_DURATION = 25; // ms (Flash timer cadence matches Flash box loop)
    const BOX_SPRITE_CONFIG = {
        cargo: { basePath: "graphics/collectables/box1/", frameCount: 25 },
        bonus: { basePath: "graphics/collectables/box2/", frameCount: 24 },
        booty: { basePath: "graphics/collectables/pirateBootyBox/", frameCount: 25 }
    };
    const boxSpriteCache = {};
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
        22: "graphics/ui/icons/images/16_rank22.png"
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

    // --- ORE ANIMATION SPRITES ---
    const ORE_ANIMATION_FRAME_DURATION = 25; // ms, aligné sur le timer Flash
    const ORE_SPRITE_CONFIG = {
        oreBlue:   { basePath: "graphics/collectables/oreBlue/",   frameCount: 26 },
        oreRed:    { basePath: "graphics/collectables/oreRed/",    frameCount: 26 },
        oreYellow: { basePath: "graphics/collectables/oreYellow/", frameCount: 26 }
    };
    const oreSpriteCache = {};
    const oreAnimationStates = {};

    // --- COLLECTOR BEAM (effet local au joueur) ---
    const COLLECTOR_BEAM_FRAME_COUNT = 15;
    const COLLECTOR_BEAM_FPS = 30;
    const COLLECTOR_BEAM_FRAME_DURATION = 1000 / COLLECTOR_BEAM_FPS;
    const COLLECTOR_BEAM_DEFAULT_DURATION_MS = 1500;
    const COLLECTOR_BEAM_BASE_PATH = "graphics/effects/loopingCollectorBeam/";

    const collectorBeamCache = [];
    let heroCollectorBeamState = null;

    const REPAIR_ROBOT_BASE_PATH = "graphics/robots/repairRobot1/";
    const REPAIR_ROBOT_FRAME_COUNT = 140;
    const REPAIR_ROBOT_FPS = 30;
    const REPAIR_ROBOT_FRAME_DURATION = 1000 / REPAIR_ROBOT_FPS;
    const REPAIR_ROBOT_OFFSET_Y = 0;

    const BATTLE_REPAIR_ROBOT_BASE_PATH = "graphics/robots/battleRepairRobot1/";
    const BATTLE_REPAIR_ROBOT_FRAME_COUNT = 140;
    const BATTLE_REPAIR_ROBOT_FPS = 30;
    const BATTLE_REPAIR_ROBOT_FRAME_DURATION = 1000 / BATTLE_REPAIR_ROBOT_FPS;
    const BATTLE_REPAIR_ROBOT_OFFSET_Y = 0;

    const repairRobotCache = [];
    let repairRobotState = null;

    const battleRepairRobotCache = [];
    let battleRepairRobotState = null;

    function getCollectorBeamFrame(frameIndex) {
        const idx = ((frameIndex % COLLECTOR_BEAM_FRAME_COUNT) + COLLECTOR_BEAM_FRAME_COUNT) % COLLECTOR_BEAM_FRAME_COUNT;
        const path = `${COLLECTOR_BEAM_BASE_PATH}${idx + 1}.png`;
        if (collectorBeamCache[path]) return collectorBeamCache[path];
        const img = new Image();
        img.src = path;
        collectorBeamCache[path] = img;
        return img;
    }

    function getRepairRobotFrame(frameIndex) {
        const idx = ((frameIndex % REPAIR_ROBOT_FRAME_COUNT) + REPAIR_ROBOT_FRAME_COUNT) % REPAIR_ROBOT_FRAME_COUNT;
        const path = `${REPAIR_ROBOT_BASE_PATH}${idx + 1}.png`;
        if (repairRobotCache[path]) return repairRobotCache[path];
        const img = new Image();
        img.src = path;
        repairRobotCache[path] = img;
        return img;
    }

    function getBattleRepairRobotFrame(frameIndex) {
        const idx = ((frameIndex % BATTLE_REPAIR_ROBOT_FRAME_COUNT) + BATTLE_REPAIR_ROBOT_FRAME_COUNT) % BATTLE_REPAIR_ROBOT_FRAME_COUNT;
        const path = `${BATTLE_REPAIR_ROBOT_BASE_PATH}${idx + 1}.png`;
        if (battleRepairRobotCache[path]) return battleRepairRobotCache[path];
        const img = new Image();
        img.src = path;
        battleRepairRobotCache[path] = img;
        return img;
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
        // Flash fait gotoAndPlay(2) → on commence à l'image "2.png" si possible
        frameIndex: (typeof BATTLE_REPAIR_ROBOT_FRAME_COUNT !== "undefined" && BATTLE_REPAIR_ROBOT_FRAME_COUNT > 1) ? 1 : 0,
        lastUpdate: now
    };
}


    function stopBattleRepairRobotAnimation() {
        battleRepairRobotState = null;
    }

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

    function drawNameplateWithIcons(ctx, name, clanTag, centerX, baseY, fillStyle, clanTagColor, rankId = 0, factionId = 0, achievementId = 0) {
    if (!name) return;

    const rankImg = getRankIcon(rankId);
    const factionImg = getFactionIcon(factionId);
    const achievementImg = getAchievementIcon(achievementId);

    const rankReady = rankImg && rankImg.complete && rankImg.width > 0 && rankImg.height > 0;
    const factionReady = factionImg && factionImg.complete && factionImg.width > 0 && factionImg.height > 0;
    const achievementReady = achievementImg && achievementImg.complete && achievementImg.width > 0 && achievementImg.height > 0;

    const clanText = clanTag ? `[${clanTag}]` : "";

    ctx.save();

    // Police Flash-like (plus lisible)
    const fontSizePx = 13;
    ctx.font = `bold ${fontSizePx}px Tahoma, Arial, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // Glow léger type Flash (au lieu d'un gros stroke)
    ctx.shadowColor = "rgba(0,0,0,1)";
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Mesure de hauteur réelle de la ligne texte (pour centrer les icônes)
    const tm = ctx.measureText("Mg");
    const textHeight = Math.max(
        fontSizePx,
        (tm.actualBoundingBoxAscent || fontSizePx) + (tm.actualBoundingBoxDescent || Math.round(fontSizePx * 0.25))
    );

    // petit ajustement fin si besoin (-1, 0, +1)
    const ICON_Y_NUDGE = 0;
    const getIconY = (img) => Math.round(baseY + (textHeight - img.height) / 2 + ICON_Y_NUDGE);

    const clanWidth = clanText ? ctx.measureText(clanText).width : 0;
    const nameWidth = ctx.measureText(name).width;
    const textWidth = clanWidth + nameWidth;

    const factionSpacing = factionReady ? 2 : 0;
    const rankSpacing = rankReady ? 1 : 0;

    let totalWidth = textWidth;
    if (rankReady) totalWidth += rankImg.width + rankSpacing;
    if (factionReady) totalWidth += factionImg.width + factionSpacing;

    const startX = Math.round(centerX) - Math.floor(totalWidth / 2);
    let cursorX = startX;

    // Achievement (petit au-dessus à gauche)
    if (achievementReady) {
        const achievementX = startX - 2;
        const achievementY = Math.round(baseY - 14);
        ctx.drawImage(achievementImg, achievementX, achievementY);
    }

    // Rank icon (aligné verticalement au texte)
    if (rankReady) {
        ctx.drawImage(rankImg, cursorX, getIconY(rankImg));
        cursorX += rankImg.width + rankSpacing;
    }

    // Clan tag
    if (clanText) {
        ctx.fillStyle = clanTagColor || fillStyle;
        ctx.fillText(clanText, cursorX, baseY);
        cursorX += clanWidth;
    }

    // Name
    ctx.fillStyle = fillStyle;
    ctx.fillText(name, cursorX, baseY);
    cursorX += nameWidth;

    // Faction icon (aligné verticalement au texte)
    if (factionReady) {
        cursorX += factionSpacing;
        ctx.drawImage(factionImg, cursorX, getIconY(factionImg));
    }

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
        const idx = ((frameIndex % frameCount) + frameCount) % frameCount;
        const path = `${cfg.basePath}${idx + 1}.png`;
        if (boxSpriteCache[path]) return boxSpriteCache[path];
        const img = new Image();
        img.src = path;
        boxSpriteCache[path] = img;
        return img;
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
        const idx = ((frameIndex % frameCount) + frameCount) % frameCount;
        const path = `${cfg.basePath}${idx + 1}.png`;
        if (oreSpriteCache[path]) return oreSpriteCache[path];
        const img = new Image();
        img.src = path;
        oreSpriteCache[path] = img;
        return img;
    }

    function clearOreAnimationState(id) {
        if (id == null) return;
        delete oreAnimationStates[id];
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
            const pulse = 1 + 0.15 * Math.sin((now % 900) / 900 * Math.PI * 2);
            const alpha = 0.75 + 0.25 * Math.sin((now % 650) / 650 * Math.PI * 2);
            const w = img.width * pulse;
            const h = img.height * pulse;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.drawImage(img, boxScreenX - w / 2, boxScreenY - h / 2, w, h);
            ctx.restore();
        } 
		else {
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(boxScreenX, boxScreenY, 8, 0, Math.PI * 2, false);
            ctx.fill();
        }
    }

    function updateEngineAnimationState(key, worldX, worldY, forceMoving = false) {
        const now = performance.now();
        const engineFrames = ENGINE_SPRITE_DEFS[DEFAULT_ENGINE_KEY]?.frames?.length
            || ENGINE_SPRITE_DEFS[DEFAULT_ENGINE_KEY]?.frameCount
            || 1;

        const state = engineAnimationState[key] || {
            frameIndex: Math.max(0, engineFrames - 1),
            lastUpdate: now,
            lastFrameChange: now,
            movingTicks: 0,
            lastX: worldX,
            lastY: worldY,
            isMoving: false
        };

        const moved = forceMoving || (worldX !== state.lastX || worldY !== state.lastY);
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
        return { frameIndex: state.frameIndex, isMoving: movingNow };
    }

    function drawEngineSmokeTrail(key, thrusterX, thrusterY, angleRad, isMoving, screenOffsetY = 0, spawnBackOffset = 0) {
    const def = ENGINE_SMOKE_DEFS[DEFAULT_ENGINE_SMOKE_KEY];
    if (!def) return;

    const entityScale = (typeof getEntityDrawScale === "function") ? getEntityDrawScale() : 1;
    const now = performance.now();
    const state = engineSmokeState[key] || { particles: [], lastSpawn: 0 };

    // ✅ Flash-like : spawn EXACT sur le point moteur (pas de recul, pas d'angle)
    if (isMoving && now - state.lastSpawn >= (def.spawnInterval || 50)) {
        state.lastSpawn = now;
        state.particles.push({
            x: thrusterX,
            y: thrusterY,
            createdAt: now
        });
    }

    const frames = def.frames && def.frames.length > 0
        ? def.frames
        : Array.from({ length: def.frameCount || 1 }, (_, idx) => idx + 1);

    const frameCount = frames.length;
    const duration = def.duration || 750;

    const remainingParticles = [];
    for (const p of state.particles) {
        const age = now - p.createdAt;
        if (age > duration) continue;

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

            const ax = def.anchor?.x ?? 0.5;
            const ay = def.anchor?.y ?? 0.5;

            // ✅ Pas de rotation, pas de drift, pas de recul : comme Flash
            ctx.drawImage(img, -drawW * ax, -drawH * ay, drawW, drawH);

            ctx.restore();
        }

        remainingParticles.push(p);
    }

    if (remainingParticles.length === 0 && !isMoving) {
        delete engineSmokeState[key];
        return;
    }

    state.particles = remainingParticles;
    engineSmokeState[key] = state;
}


    function drawEngineTrail(key, shipId, worldX, worldY, frameIndex, angleRad, offsetY = 0, forceMoving = false) {
    const engineDef = ENGINE_SPRITE_DEFS[DEFAULT_ENGINE_KEY];
    if (!engineDef) return;

    const engineOffsets = getEngineOffsetsForFrame(shipId, frameIndex || 0);
    if (!engineOffsets || engineOffsets.length === 0) return;

    const { frameIndex: animFrameIndex, isMoving } =
        updateEngineAnimationState(key, worldX, worldY, forceMoving);

    const img = getEngineSpriteFrame(DEFAULT_ENGINE_KEY, animFrameIndex);
    if (!img || !img.complete || img.width === 0 || img.height === 0) return;

    const entityScale = (typeof getEntityDrawScale === "function") ? getEntityDrawScale() : 1;
    const offsetScale = entityScale;

    const smokeBack = (engineDef.smokeSpawnOffset || 0) * offsetScale;

    const scale = (engineDef.scale || 1) * entityScale;
    const drawW = img.width * scale;
    const drawH = img.height * scale;

    const ax = engineDef.anchor?.x ?? 0.5;
    const ay = engineDef.anchor?.y ?? 0.5;

    const rot = (typeof angleRad === "number" && Number.isFinite(angleRad)) ? angleRad : 0;

    // IMPORTANT : ne pas décaler les moteurs selon la frame (sinon jitter/décalage sur Goliath)
    engineOffsets.forEach((engineOffset, index) => {
        const thrusterX = worldX + (engineOffset.x * offsetScale);
        const thrusterY = worldY + (engineOffset.y * offsetScale);

        const smokeKey = `${key}_${index}`;
        drawEngineSmokeTrail(smokeKey, thrusterX, thrusterY, rot, isMoving, offsetY, smokeBack);

        const screenX = mapToScreenX(thrusterX);
        const screenY = mapToScreenY(thrusterY) + offsetY;

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(rot);

        ctx.drawImage(img, -drawW * ax, -drawH * ay, drawW, drawH);
        ctx.restore();
    });
}



    // =====================================================================
function drawMiniMap() {
    const layout = (typeof getMinimapLayout === "function") ? getMinimapLayout() : {
        outerX: canvas.width - MINIMAP_WIDTH - 10,
        outerY: canvas.height - MINIMAP_HEIGHT - 10 - 26 - 16,
        outerWidth: MINIMAP_WIDTH + 16,
        outerHeight: MINIMAP_HEIGHT + 26 + 16,
        contentX: canvas.width - MINIMAP_WIDTH - 10 + 8,
        contentY: canvas.height - MINIMAP_HEIGHT - 10 + 26,
        headerY: canvas.height - MINIMAP_HEIGHT - 10 - 26 - 16,
        headerHeight: 26
    };

    const hoverState = (typeof getMinimapHoverState === "function")
        ? getMinimapHoverState()
        : { icon: false, header: false };

    const x = layout.contentX;
    const infoHeight = layout.infoHeight || 0;
    const y = layout.contentY;
    const mapY = layout.mapY || (layout.contentY + infoHeight);
    const headerY = layout.headerY;
    const isMinimapOpen = window.showMinimap !== false;

    minimapHitboxes.icon = null;
    minimapHitboxes.zoomIn = null;
    minimapHitboxes.zoomOut = null;
    minimapHitboxes.close = null;
    minimapHitboxes.frame = isMinimapOpen ? { x: layout.outerX, y: layout.outerY, w: layout.outerWidth, h: layout.outerHeight } : null;
    minimapHitboxes.content = isMinimapOpen ? { x, y: mapY, w: MINIMAP_WIDTH, h: MINIMAP_HEIGHT } : null;

    if (!isMinimapOpen) {
        return;
    }

    // 1. CADRE ET EN-TÊTE
    ctx.save();
    ctx.fillStyle = "#0b0909";
    ctx.fillRect(layout.outerX, layout.outerY, layout.outerWidth, layout.outerHeight);

    const headerGrad = ctx.createLinearGradient(0, headerY, 0, headerY + layout.headerHeight);
    headerGrad.addColorStop(0, "#4d2b1d");
    headerGrad.addColorStop(1, "#2d130d");
    ctx.fillStyle = headerGrad;
    ctx.fillRect(layout.outerX, headerY, layout.outerWidth, layout.headerHeight);

    ctx.strokeStyle = "#8a5a3a";
    ctx.lineWidth = 2;
    ctx.strokeRect(
        layout.outerX + 0.5,
        layout.outerY + 0.5,
        layout.outerWidth - 1,
        layout.outerHeight - 1
    );
    ctx.restore();

    // --- MODIFICATION ICI : Icône de la minimap (Image seule) ---
    const displaySize = 20; // Taille d'affichage de l'icône
    const iconX = layout.outerX + MINIMAP_FRAME_PADDING;
    const iconY = headerY + (layout.headerHeight - displaySize) / 2;
    
    // On utilise l'image du menu principal
    const minimapIconPath = UI_SPRITES.mainMenuIconMap; 
    const minimapIcon = getUiImage(minimapIconPath);
    const iconHovered = hoverState.icon === true;

    ctx.save();

    // Définition de la zone de clic (Hitbox)
    minimapHitboxes.icon = { x: iconX, y: iconY, w: displaySize, h: displaySize };
    minimapHitboxes.close = minimapHitboxes.icon;

    // Dessin de l'image
    if (minimapIcon && minimapIcon.complete && minimapIcon.width > 0) {
        if (iconHovered) {
            ctx.filter = "brightness(1.3)"; // Effet de survol simple
        }
        ctx.drawImage(minimapIcon, iconX, iconY, displaySize, displaySize);
    }
    
    ctx.restore();
    // -----------------------------------------------------------

    // Titre
    ctx.fillStyle = "#f5d1a4";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "left";
    ctx.fillText("Mini map", layout.outerX + MINIMAP_FRAME_PADDING + 26, headerY + layout.headerHeight - 8);

    // Boutons + / -
    const buttonY = headerY + (layout.headerHeight - MINIMAP_BUTTON_SIZE) / 2;
    const zoomOutX = layout.outerX + layout.outerWidth - MINIMAP_FRAME_PADDING - MINIMAP_BUTTON_SIZE;
    const zoomInX  = zoomOutX - MINIMAP_BUTTON_SIZE - 4;

    function drawHeaderButton(xBtn, label, hovered) {
        const grad = ctx.createLinearGradient(xBtn, buttonY, xBtn, buttonY + MINIMAP_BUTTON_SIZE);
        grad.addColorStop(0, hovered ? "#2e8b57" : "#5d3a28");
        grad.addColorStop(1, hovered ? "#1f5f3c" : "#3b2318");
        ctx.fillStyle = grad;
        ctx.fillRect(xBtn, buttonY, MINIMAP_BUTTON_SIZE, MINIMAP_BUTTON_SIZE);
        ctx.fillStyle = "#f8e6c8";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, xBtn + MINIMAP_BUTTON_SIZE / 2, buttonY + MINIMAP_BUTTON_SIZE / 2 + 0.5);
    }

    drawHeaderButton(zoomInX, "+", hoverState.zoomIn === true);
    drawHeaderButton(zoomOutX, "-", hoverState.zoomOut === true);
    minimapHitboxes.zoomIn = { x: zoomInX, y: buttonY, w: MINIMAP_BUTTON_SIZE, h: MINIMAP_BUTTON_SIZE };
    minimapHitboxes.zoomOut = { x: zoomOutX, y: buttonY, w: MINIMAP_BUTTON_SIZE, h: MINIMAP_BUTTON_SIZE };
    // Fond noir simple (pas d'image grise)
    ctx.fillStyle = "black";
    ctx.fillRect(x, mapY, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    // 2. CALCULS D'ÉCHELLE
    const scale = Math.min(MINIMAP_WIDTH / MAP_WIDTH, MINIMAP_HEIGHT / MAP_HEIGHT);

    const realW   = MAP_WIDTH  * scale;
    const realH   = MAP_HEIGHT * scale;
    
    const offsetX = (MINIMAP_WIDTH  - realW)  / 2;
    const offsetY = (MINIMAP_HEIGHT - realH) / 2;

    const toMiniX = (wx) => x + offsetX + (wx * scale);
    const toMiniY = (wy) => mapY + offsetY + (wy * scale);

    // 3. VISEUR
    const px = toMiniX(shipX);
    const py = toMiniY(shipY);

    if (px >= x && px <= x + MINIMAP_WIDTH && py >= mapY && py <= mapY + MINIMAP_HEIGHT) {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x + MINIMAP_WIDTH, py); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px, mapY); ctx.lineTo(px, mapY + MINIMAP_HEIGHT); ctx.stroke();
        ctx.restore();
    }

    // 4. PORTAILS
    const portalIcon = getUiImage(UI_SPRITES.minimapPortalIcon);
    for (const pid in portals) {
        const p = portals[pid];
        if (p.visibleOnMiniMap === false) continue;

        const mx = toMiniX(p.x);
        const my = toMiniY(p.y);

        if (mx >= x && mx <= x + MINIMAP_WIDTH && my >= mapY && my <= mapY + MINIMAP_HEIGHT) {
            if (portalIcon && portalIcon.complete && portalIcon.width > 0) {
                const pw = portalIcon.width;
                const ph = portalIcon.height;
                ctx.drawImage(portalIcon, mx - pw / 2, my - ph / 2, pw, ph);
            } else {
                ctx.strokeStyle = "#00ffff";
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(mx, my, 3, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }

    // 5. STATIONS
    for (const s of stations) {
        const mx = toMiniX(s.x);
        const my = toMiniY(s.y);
        if (mx >= x && mx <= x + MINIMAP_WIDTH && my >= mapY && my <= mapY + MINIMAP_HEIGHT) {
            const stationImg = stationImages[s.type];
            if (stationImg && stationImg.complete && stationImg.width > 0) {
                const targetHeight = 26;
                const scale = targetHeight / stationImg.height;
                const drawW = stationImg.width * scale;
                const drawH = stationImg.height * scale;
                ctx.drawImage(
                    stationImg,
                    mx - drawW / 2,
                    my - drawH / 2,
                    drawW,
                    drawH
                );
            } else {
                ctx.strokeStyle = "#00aaff";
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(mx, my, 6, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }

    // 6. ENTITÉS
    for (const id in entities) {
        const e = entities[id];
        if (!isEntityVisibleOnMap(e)) continue;

        // --- FILTRE : CACHER LES BOITES SUR LA MINIMAP ---
        // On vérifie si c'est une Spaceball (qui doit rester visible)
        const nameLower = (e.name || "").toLowerCase();
        const isSpaceball = nameLower.includes("spaceball");

        // Si c'est une boîte (Bonus, Cargo, Key, Ore...) et que ce n'est PAS la Spaceball, on passe.
        if (e.kind === "box" && !isSpaceball) {
            continue; 
        }
        // -------------------------------------------------

        const isGroupMember  = (groupMembers[e.id] !== undefined);
        const isLockedTarget = (selectedTargetId !== null && e.id == selectedTargetId);

        // Filtre radar : on cache si loin, SAUF si groupe ou cible
        if (!isGroupMember && !isLockedTarget) {
            const dx = e.x - shipX;
            const dy = e.y - shipY;
            if (dx * dx + dy * dy > MINIMAP_VIEW_RADIUS_SQ) continue;
        }

        const mx = toMiniX(e.x);
        const my = toMiniY(e.y);

        if (mx >= x && mx <= x + MINIMAP_WIDTH && my >= mapY && my <= mapY + MINIMAP_HEIGHT) {
            
            // Dessin spécifique pour la Spaceball (icône)
            if (isSpaceball) {
                const sbIcon = getUiImage(UI_SPRITES.minimapSpaceballIcon);
                if (sbIcon && sbIcon.complete && sbIcon.width > 0) {
                    ctx.drawImage(
                        sbIcon,
                        mx - sbIcon.width / 2,
                        my - sbIcon.height / 2,
                        sbIcon.width,
                        sbIcon.height
                    );
                    continue;
                }
            }

            // Dessin des points (Vaisseaux / NPCs)
            ctx.fillStyle = getEntityColor(e);
            let size = isGroupMember ? 4 : 2;

            if (isLockedTarget) {
                size = 4;
                ctx.fillStyle = "#ff0000";
                ctx.save();
                ctx.strokeStyle = "#ff0000";
                ctx.lineWidth = 1;
                ctx.strokeRect(mx - 4, my - 4, 8, 8);
                ctx.restore();
            }

            ctx.fillRect(mx - size / 2, my - size / 2, size, size);
        }
    }

    // 7. Point de destination
    if (moveTargetFromMinimap && moveTargetX !== null && moveTargetY !== null) {
        const tx = toMiniX(moveTargetX);
        const ty = toMiniY(moveTargetY);
		// 7.a Trait de déplacement (comme Flash)
ctx.save();

// On clip pour que le trait ne sorte jamais du carré de minimap
ctx.beginPath();
ctx.rect(x, mapY, MINIMAP_WIDTH, MINIMAP_HEIGHT);
ctx.clip();

// Style du trait (proche Flash)
ctx.strokeStyle = "rgba(120, 200, 255, 0.9)";
ctx.lineWidth = 1;

ctx.beginPath();
ctx.moveTo(px, py);   // position joueur sur minimap
ctx.lineTo(tx, ty);   // destination sur minimap
ctx.stroke();

ctx.restore();

        if (tx >= x && tx <= x + MINIMAP_WIDTH && ty >= mapY && ty <= mapY + MINIMAP_HEIGHT) {
            const finishIcon = getUiImage(UI_SPRITES.minimapFinishIcon);
            if (finishIcon && finishIcon.complete && finishIcon.width > 0) {
                ctx.drawImage(
                    finishIcon,
                    tx - finishIcon.width / 2,
                    ty - finishIcon.height / 2,
                    finishIcon.width,
                    finishIcon.height
                );
            } else {
                ctx.save();
                ctx.strokeStyle = "#00ff00";
                ctx.beginPath();
                ctx.arc(tx, ty, 4, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }
    }



    // 9. Pings de groupe
    const nowMs = performance.now();
    for (let idx = groupPings.length - 1; idx >= 0; idx--) {
        const ping = groupPings[idx];
        if (nowMs - ping.createdAt > 5000) {
            groupPings.splice(idx, 1);
            continue;
        }
        const mx = toMiniX(ping.x);
        const my = toMiniY(ping.y);
        if (mx >= x && mx <= x + MINIMAP_WIDTH && my >= mapY && my <= mapY + MINIMAP_HEIGHT) {
            const def   = MINIMAP_SPRITE_DEFS.groupPing;
            const frame = Math.floor(((nowMs - ping.createdAt) / 1000) * def.fps);
            const pingImg = getMinimapSpriteFrame(
                "groupPing",
                def.loop ? frame % def.frameCount : Math.min(frame, def.frameCount - 1)
            );
            if (pingImg && pingImg.complete && pingImg.width > 0) {
                ctx.save();
                const size = Math.max(pingImg.width, pingImg.height);
                ctx.globalAlpha = 1 - Math.min((nowMs - ping.createdAt) / 5000, 1);
                ctx.drawImage(pingImg, mx - size / 2, my - size / 2, size, size);
                ctx.restore();
            } else {
                ctx.save();
                ctx.strokeStyle = "#ffff00";
                ctx.lineWidth   = 2;
                const anim = (nowMs - ping.createdAt) / 1000;
                const r    = 2 + (anim % 1) * 10;
                ctx.globalAlpha = 1 - (anim % 1);
                ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.stroke();
                ctx.restore();
            }
        }
    }

    // 10. Joueur
    if (px >= x && px <= x + MINIMAP_WIDTH && py >= mapY && py <= mapY + MINIMAP_HEIGHT) {
        ctx.fillStyle = "white";
        ctx.fillRect(px - 2, py - 2, 4, 4);

        // Alerte ennemi proche
        const alertImg = getUiImage(UI_SPRITES.minimapAlertIcon);
        if (alertImg && alertImg.complete && alertImg.width > 0) {
            const threat = Object.values(entities).some(ent =>
                ent &&
                ent.kind === "player" &&
                ent.factionId &&
                heroFactionId &&
                ent.factionId !== heroFactionId &&
                Math.hypot(ent.x - shipX, ent.y - shipY) < 2000
            );
            if (threat) {
                ctx.drawImage(
                    alertImg,
                    px - alertImg.width / 2,
                    py - alertImg.height / 2,
                    alertImg.width,
                    alertImg.height
                );
            }
        }
    }

    // 11. Infos map
    if (infoHeight > 0) {
        const infoY = y;
        const displayX  = Math.round(shipX / 100);
        const displayY  = Math.round(shipY / 100);
        const coordText = `${displayX}/${displayY}`;
        const formatMapId = (mapId) => {
            switch (mapId) {
                case 1:  return "1-1";
                case 2:  return "1-2";
                case 3:  return "1-3";
                case 4:  return "1-4";
                case 5:  return "2-1";
                case 6:  return "2-2";
                case 7:  return "2-3";
                case 8:  return "2-4";
                case 9:  return "3-1";
                case 10: return "3-2";
                case 11: return "3-3";
                case 12: return "3-4";
                case 13: return "4-1";
                case 14: return "4-2";
                case 15: return "4-3";
                case 16: return "4-4";
                case 17: return "1-5";
                case 18: return "1-6";
                case 19: return "1-7";
                case 20: return "1-8";
                case 21: return "2-5";
                case 22: return "2-6";
                case 23: return "2-7";
                case 24: return "2-8";
                case 25: return "3-5";
                case 26: return "3-6";
                case 27: return "3-7";
                case 28: return "3-8";
                case 51: return "GGA";
                case 52: return "GGB";
                case 53: return "GGG";
                case 55: return "GGD";
                case 80: return "Surv";
                case 81: return "Inva";
                default: return "1-1";
            }
        };

        const mapText   = formatMapId(currentMapId);

        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
        ctx.fillRect(x, infoY, MINIMAP_WIDTH, infoHeight - 4);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, mapY - 1);
        ctx.lineTo(x + MINIMAP_WIDTH, mapY - 1);
        ctx.stroke();

        ctx.font = "bold 12px Arial";
        ctx.textAlign = "left";
        const labelY = infoY + infoHeight - 10;

        ctx.fillStyle = "#f5d1a4";
        ctx.fillText(mapText, x + 2, labelY);

        const mapLabelWidth = ctx.measureText(mapText).width;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(coordText, x + 2 + mapLabelWidth + 8, labelY);
        ctx.restore();
    }
}


    

 function drawShieldAura(sx, sy, currentShield, maxShield, ish, invincible, ishSince, ishUntil, invSince, invUntil) {
        const now = performance.now();
        const entityScale = (typeof getEntityDrawScale === "function") ? getEntityDrawScale() : 1;
        
        // --- 1. DÉTECTION DES ÉTATS ---
        // Est-ce qu'on régénère naturellement ? (Packet HL)
        const isRegenerating = (typeof heroShieldRegenUntil !== 'undefined' && heroShieldRegenUntil > now);
        
        // Est-ce que la Tech "Shield Backup" est active ? (Packet TX)
        const isBackupActive = (typeof heroShieldBackupUntil !== 'undefined' && heroShieldBackupUntil > now);

        // --- 2. RÈGLE D'AFFICHAGE STRICTE ---
        // Si aucun effet spécial n'est actif, on n'affiche PAS la bulle (même si le bouclier n'est pas plein).
        // C'est ce qui empêche le bouclier d'apparaître quand on prend des dégâts.
        if (!ish && !invincible && !isRegenerating && !isBackupActive) {
            return;
        }

        // Sécurité : pas de bouclier à 0 (sauf invincibilité)
        if (!invincible && !ish && (!currentShield || currentShield <= 0)) return;

        const effectiveMax = maxShield || currentShield || 1;
        const fullShield = maxShield ? (currentShield >= maxShield || currentShield / effectiveMax >= 0.999) : false;

        // --- 3. CHOIX DU SPRITE (Priorités) ---
        let spriteKey = "standard";
        
        if (ish) spriteKey = "insta";
        else if (invincible) spriteKey = "invincibility";
        else if (isBackupActive) spriteKey = "tech_shield_backup"; // Priorité sur le "full" (on voit l'effet même si on est full)
        else if (fullShield) return; // Si full et pas de Tech active, on cache la bulle
        else if (currentShield / effectiveMax < 0.25) spriteKey = "low";

        // --- 4. DESSIN ---
        const def = SHIELD_SPRITE_DEFS[spriteKey];
        if (!def) return;

        let frame;

        if (def.loop) {
            frame = Math.floor(shieldAnimTime * (def.fps || SHIELD_ANIM_FPS)) % def.frameCount;
        } else {
            const start = ish ? ishSince : invSince;
            const end = ish ? ishUntil : invUntil;
            if (!start || !end) return; 
            const duration = Math.max(1, end - start);
            const progress = Math.min(1, Math.max(0, (now - start) / duration));
            frame = Math.min(def.frameCount - 1, Math.floor(progress * def.frameCount));
        }

        const img = getShieldSpriteFrame(spriteKey, frame);
        if (!img || !img.complete || img.width === 0 || img.height === 0) return;

        const pulse = (1 + Math.sin(shieldAnimTime * 4) * 0.05) * entityScale;
        const alpha = 0.35 + 0.25 * Math.min(1, currentShield / effectiveMax);

        ctx.save();
        ctx.globalAlpha = alpha;
        const w = img.width * pulse;
        const h = img.height * pulse;
        ctx.drawImage(img, sx - w / 2, sy - h / 2, w, h);
        ctx.restore();
    }

    function drawHpShieldBars(screenX, screenY, spriteHeight, hp, maxHp, shield, maxShield) {
    // Flash-like (50x3, offset based on ship height)
    const barWidth = 50;
    const barHeight = 3;
    const gap = 3;

    const visualHeight = Math.max(10, spriteHeight || 0);
    const topY = Math.round(screenY - visualHeight / 2);

    const safeHp = typeof hp === "number" ? hp : 0;
    const safeMaxHp = (typeof maxHp === "number" && maxHp > 0) ? maxHp : (safeHp > 0 ? safeHp : 1);
    const safeShield = typeof shield === "number" ? shield : 0;
    const safeMaxShield = (typeof maxShield === "number" && maxShield > 0) ? maxShield : (safeShield > 0 ? safeShield : 1);

    const hpRatio = Math.max(0, Math.min(1, safeHp / safeMaxHp));
    const shieldRatio = Math.max(0, Math.min(1, safeShield / safeMaxShield));

    const x = Math.round(screenX - barWidth / 2);
    const yHp = topY;
    const yShield = topY + barHeight + gap;

    ctx.save();

    // Background (#6d6d6d)
    ctx.fillStyle = "#6d6d6d";
    ctx.fillRect(x, yHp, barWidth, barHeight);
    ctx.fillRect(x, yShield, barWidth, barHeight);

    // HP (#49be40)
    ctx.fillStyle = "#49be40";
    ctx.fillRect(x, yHp, barWidth * hpRatio, barHeight);

    // Shield (#338fcc)
    ctx.fillStyle = "#338fcc";
    ctx.fillRect(x, yShield, barWidth * shieldRatio, barHeight);

    ctx.restore();
}


    // Utilise toutes les frames des sprites de dégâts bouclier
    function drawShieldBursts() {
        const now = performance.now();
        for (const sb of shieldBursts) {
            const spriteKey = sb.sprite || "hit";
            const def = SHIELD_SPRITE_DEFS[spriteKey];
            if (!def) continue;

            const elapsed = now - sb.createdAt;
            const frameDuration = 1000 / (def.fps || SHIELD_ANIM_FPS);
            const frame = Math.min(def.frameCount - 1, Math.floor(elapsed / frameDuration));
            const img = getShieldSpriteFrame(spriteKey, frame);
            if (!img || !img.complete || img.width === 0 || img.height === 0) continue;

            const lifeRatio = Math.min(1, elapsed / Math.max(1, frameDuration * def.frameCount));
            const angle = sb.angle || 0;
            const radius = sb.radius || 0;
            const baseX = sb.x + Math.cos(angle) * radius;
            const baseY = sb.y + Math.sin(angle) * radius;

            const burstScreenX = mapToScreenX(baseX);
            const burstScreenY = mapToScreenY(baseY);
            const entityScale = (typeof getEntityDrawScale === "function") ? getEntityDrawScale() : 1;
            const scale = (1 + lifeRatio * 0.2) * entityScale;
            const w = img.width * scale;
            const h = img.height * scale;

            ctx.save();
            ctx.translate(burstScreenX, burstScreenY);
            if (sb.angle !== undefined && sb.angle !== null) ctx.rotate(angle);
            ctx.globalAlpha = 1 - lifeRatio;
            ctx.drawImage(img, -w / 2, -h / 2, w, h);
            ctx.restore();
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
        if (frameImg && frameImg.complete && frameImg.width > 0 && frameImg.height > 0) {
            const entityScale = (typeof getEntityDrawScale === "function") ? getEntityDrawScale() : 1;
            const drawW = frameImg.width * entityScale;
            const drawH = frameImg.height * entityScale;
            const drawX = shipScreenX - drawW / 2;
            const drawY = shipScreenY + COLLECTOR_BEAM_SCREEN_OFFSET_Y * entityScale - drawH / 2;
            ctx.drawImage(frameImg, drawX, drawY, drawW, drawH);
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

        const frameImg = getRepairRobotFrame(repairRobotState.frameIndex);
        if (!frameImg || !frameImg.complete || frameImg.width === 0 || frameImg.height === 0) return;

        const entityScale = (typeof getEntityDrawScale === "function") ? getEntityDrawScale() : 1;
        const anchorY = shipScreenY + REPAIR_ROBOT_OFFSET_Y * entityScale;
        const drawW = frameImg.width * entityScale;
        const drawH = frameImg.height * entityScale;
        const drawX = shipScreenX - drawW / 2;
        const drawY = anchorY - drawH / 2;

        ctx.drawImage(frameImg, drawX, drawY, drawW, drawH);
    }

function drawBattleRepairRobot(shipScreenX, shipScreenY) {
    const now = performance.now();

    const isActive = !!heroBattleRepairing;
    const isFading = !isActive && heroBattleRepairFadeUntil && now < heroBattleRepairFadeUntil;

    // Si ni actif ni en train de fade → on nettoie et on sort
    if (!isActive && !isFading) {
        if (battleRepairRobotState) stopBattleRepairRobotAnimation();
        return;
    }

    // Fin du timer (si un jour tu utilises une durée)
    if (isActive && heroBattleRepairUntil && now >= heroBattleRepairUntil) {
        if (typeof setHeroBattleRepairing === "function") {
            setHeroBattleRepairing(false);
        }
        return;
    }

    // Init anim (uniquement si actif; si on est en fade sans état, rien à dessiner)
    if (!battleRepairRobotState) {
        if (isActive) startBattleRepairRobotAnimation();
        else return;
    }

    // Update frames (on continue aussi pendant le fade, comme un MovieClip qui joue)
    if (now - battleRepairRobotState.lastUpdate >= BATTLE_REPAIR_ROBOT_FRAME_DURATION) {
        const steps = Math.floor((now - battleRepairRobotState.lastUpdate) / BATTLE_REPAIR_ROBOT_FRAME_DURATION);
        battleRepairRobotState.frameIndex = (battleRepairRobotState.frameIndex + steps) % BATTLE_REPAIR_ROBOT_FRAME_COUNT;
        battleRepairRobotState.lastUpdate += steps * BATTLE_REPAIR_ROBOT_FRAME_DURATION;
    }

    const frameImg = getBattleRepairRobotFrame(battleRepairRobotState.frameIndex);
    if (!frameImg || !frameImg.complete || frameImg.width === 0 || frameImg.height === 0) return;

    // POSITIONNEMENT : centré sur le vaisseau (comme le repair robot standard)
    // Tu peux ajuster BATTLE_REPAIR_ROBOT_OFFSET_Y (0, 10, -10, etc.) si besoin.
    const entityScale = (typeof getEntityDrawScale === "function") ? getEntityDrawScale() : 1;
    const anchorY = shipScreenY + (typeof BATTLE_REPAIR_ROBOT_OFFSET_Y === "number" ? BATTLE_REPAIR_ROBOT_OFFSET_Y * entityScale : 0);
    const drawW = frameImg.width * entityScale;
    const drawH = frameImg.height * entityScale;
    const drawX = shipScreenX - drawW / 2;
    const drawY = anchorY - drawH / 2;

    // Fade-out 0.5s comme Flash (stopAnimation → fadeOutClip(0.5))
    let alpha = 1;
    if (isFading) {
        const remaining = heroBattleRepairFadeUntil - now;
        alpha = Math.max(0, Math.min(1, remaining / BATTLE_REPAIR_FADE_MS));
    }

    ctx.save();
    ctx.globalAlpha = ctx.globalAlpha * alpha;
    ctx.drawImage(frameImg, drawX, drawY, drawW, drawH);
    ctx.restore();
}



    // --- Helpers d'alignement dynamiques pour les expansions ---
    const expansionOffsetCache = {};
    const _expansionCenterCanvas = document.createElement("canvas");
    const _expansionCenterCtx = _expansionCenterCanvas.getContext("2d", { willReadFrequently: true });


    function getImageVisualCenter(img) {
        if (!img || !img.complete || img.width === 0 || img.height === 0) return null;

        _expansionCenterCanvas.width = img.width;
        _expansionCenterCanvas.height = img.height;
        _expansionCenterCtx.clearRect(0, 0, img.width, img.height);
        _expansionCenterCtx.drawImage(img, 0, 0);

        const { data } = _expansionCenterCtx.getImageData(0, 0, img.width, img.height);
        let sumX = 0;
        let sumY = 0;
        let weight = 0;

        // On utilise un centre de masse alpha-pondéré pour éviter qu'un pixel isolé
        // (artefacts de découpe SWF → PNG) ne décale l'ancrage.
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
            return { cx: img.width / 2, cy: img.height / 2 };
        }
        return {
            cx: sumX / weight,
            cy: sumY / weight
        };
    }

    function getVisualShiftFromCenter(img) {
        const center = getImageVisualCenter(img);
        if (!center) return { x: 0, y: 0 };
        return {
            x: center.cx - img.width / 2,
            y: center.cy - img.height / 2
        };
    }
	// Cache pour éviter de recalculer le centre visuel à chaque frame (sinon gros lag)
const shipVisualShiftCache = Object.create(null);

function getShipVisualShiftCached(shipId, frameIndex, img) {
    const key = `${shipId}_${frameIndex}`;
    if (shipVisualShiftCache[key]) return shipVisualShiftCache[key];
    const shift = getVisualShiftFromCenter(img);
    shipVisualShiftCache[key] = shift;
    return shift;
}


    function getDynamicExpansionOffset(shipId, frameIndex, expansionImg) {
        const cacheKey = `${shipId}_${frameIndex}`;
        if (expansionOffsetCache[cacheKey]) return expansionOffsetCache[cacheKey];

        const shipImg = getShipSpriteFrame(shipId, frameIndex);
        if (!shipImg || !shipImg.complete || shipImg.width === 0 || shipImg.height === 0) return null;
        if (!expansionImg || !expansionImg.complete || expansionImg.width === 0 || expansionImg.height === 0) return null;

        const shipShift = getVisualShiftFromCenter(shipImg);
        const expansionShift = getVisualShiftFromCenter(expansionImg);
        const baseOffset = (SHIP_EXPANSION_DEFS[shipId] && SHIP_EXPANSION_DEFS[shipId].offset) || { x: 0, y: 0 };

        const computedOffset = {
            x: baseOffset.x + (shipShift.x - expansionShift.x),
            y: baseOffset.y + (shipShift.y - expansionShift.y)
        };

        expansionOffsetCache[cacheKey] = computedOffset;
        return computedOffset;
    }


    function drawShipExpansionOverlay(shipId, frameIndex, screenX, screenY, shipShift = null) {

        const expansionDef = SHIP_EXPANSION_DEFS && SHIP_EXPANSION_DEFS[shipId];
        if (!expansionDef) return;

        const img = getShipExpansionFrame(shipId, frameIndex);
        if (!img || !img.complete || img.width === 0 || img.height === 0) return;

        const entityScale = (typeof getEntityDrawScale === "function") ? getEntityDrawScale() : 1;
const offset = (expansionDef && expansionDef.offset) || getShipExpansionAnchor(shipId);

const drawW = img.width * entityScale;
const drawH = img.height * entityScale;

// même centrage que le ship : centre géométrique
const shiftX = shipShift ? shipShift.x * entityScale : 0;
const shiftY = shipShift ? shipShift.y * entityScale : 0;

const drawX = (screenX - drawW / 2) - shiftX + (offset.x || 0) * entityScale;
const drawY = (screenY - drawH / 2) - shiftY + (offset.y || 0) * entityScale;

ctx.drawImage(img, drawX, drawY, drawW, drawH);


    }

    function drawShip() {
        const shipScreenX = mapToScreenX(shipX);
        const syBase = mapToScreenY(shipY);
        const bobOffset = getHeroIdleOffset();
        const sy = syBase + bobOffset;
		
        const entityScale = (typeof getEntityDrawScale === "function") ? getEntityDrawScale() : 1;

        ctx.save();

        // Transparence si camouflage
        ctx.globalAlpha = heroCloaked ? 0.3 : 1.0;

        drawHeroCollectorBeamAt(shipScreenX, sy);

        const shipId = heroShipId;
        const def = SHIP_SPRITE_DEFS[shipId];
        let shipDrawnHeight = 20;

        if (def) {
            const frameIndex = getDirectionFrameIndex(heroAngle, def.frameCount);

            let glowImg = null;
            let img = null;

            // 1) On récupère d'abord l'image du ship (car le shift dépend du frame)
img = getShipSpriteFrame(shipId, frameIndex);

// 2) Shift visuel Flash-like : corrige le "centre" des gros sprites (Goliath etc.)
let shiftX = 0;
let shiftY = 0;

if (img && img.complete && img.width > 0 && img.height > 0 && typeof getVisualShiftFromCenter === "function") {
    const shift = getVisualShiftFromCenter(img);
    shiftX = (shift.x || 0) * entityScale;
    shiftY = (shift.y || 0) * entityScale;
}

// 3) Glow (doit utiliser le même shift que le ship)
if (typeof getShipGlowFrame === "function") {
    glowImg = getShipGlowFrame(shipId, frameIndex);
    if (glowImg && glowImg.complete && glowImg.width > 0 && glowImg.height > 0) {
        const gw = glowImg.width * entityScale;
        const gh = glowImg.height * entityScale;
        ctx.drawImage(glowImg, (shipScreenX - gw / 2) - shiftX, (sy - gh / 2) - shiftY, gw, gh);
    }
}

// 4) Engine/Smoke : ne pas appliquer le shift ici (les offsets XML sont déjà Flash)
drawEngineTrail("hero", shipId, shipX, shipY, frameIndex, heroAngle || 0, bobOffset);

// 5) Sprite ship : on applique le shift ici (c'est la correction principale)
if (img && img.complete && img.width > 0 && img.height > 0) {
    const w = img.width * entityScale;
    const h = img.height * entityScale;
    shipDrawnHeight = h;
    ctx.drawImage(img, (shipScreenX - w / 2) - shiftX, (sy - h / 2) - shiftY, w, h);
}

// 6) Overlay expansion : doit suivre le sprite du ship (donc centre décalé aussi)
drawShipExpansionOverlay(shipId, frameIndex, shipScreenX - shiftX, sy - shiftY);



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

        drawShieldAura(shipScreenX, sy, heroShield, heroMaxShield, heroIshActive, heroInvincible, heroIshSince, heroIshUntil, heroInvSince, heroInvUntil);

        if (setting_show_drones && window.heroDrones && window.heroDrones.groups && window.heroDrones.groups.length > 0) {
            drawDrones(shipX, shipY, window.heroDrones, heroAngle);
        }

        if (heroRepairing) {
            drawRepairRobot(shipScreenX, sy, shipDrawnHeight);
        }

        if (heroBattleRepairing) {
            drawBattleRepairRobot(shipScreenX, sy);
        }

        if (setting_show_player_names && heroName) {
            const baseY = computeNameplateY(syBase, shipDrawnHeight, heroShipId, entityScale);


            const clanTagColor = heroClanTag ? getClanTagColor(0) : null;

            drawNameplateWithIcons(
                ctx,
                heroName,
                heroClanTag,
                shipScreenX,
                baseY,
                "#ffffff",
                clanTagColor,
                heroRankId,
                window.heroFactionId || 0
            );
        }

        drawHpShieldBars(shipScreenX, syBase, shipDrawnHeight, heroHp, heroMaxHp, heroShield, heroMaxShield);


        ctx.restore();
    }
    const DRONE_DIRECTION_FRAME_COUNT = 32;
    var DRONE_GROUP_RADIUS = (typeof DRONE_GROUP_RADIUS !== "undefined") ? DRONE_GROUP_RADIUS : 75; // patterns.drones.@groupRadius dans game.xml
    var DRONE_GROUP_DIMENSION = DRONE_GROUP_RADIUS * 2;
    const DRONE_DEFAULT_DIMENSION = 30;    // patterns.drones.drone.@droneRadius * 2 (diamètre)

    const IRIS_DRONE_FRAMES = [
        131, 133, 135, 137, 139, 141, 143, 145,
        147, 149, 151, 153, 155, 157, 159, 161,
        163, 165, 167, 169, 171, 173, 175, 177,
        179, 181, 183, 185, 187, 189, 191, 193
    ];

    const FLAX_DRONE_FRAMES = [
        196, 198, 200, 202, 204, 206, 208, 210,
        212, 214, 216, 218, 220, 222, 224, 226,
        228, 230, 232, 234, 236, 238, 240, 242,
        244, 246, 248, 250, 252, 254, 256, 258
    ];

    function getDroneSpriteFrame(kind, directionIndex) {
        const frames = (kind === "flax") ? FLAX_DRONE_FRAMES : IRIS_DRONE_FRAMES;
        const idx = ((directionIndex % DRONE_DIRECTION_FRAME_COUNT) + DRONE_DIRECTION_FRAME_COUNT) % DRONE_DIRECTION_FRAME_COUNT;
        const fileNumber = frames[idx];
        return getUiImage(`graphics/assets/drones/images/${fileNumber}.png`);
    }

    function pickDroneKind(drone) {
        if (drone && drone.kind) return drone.kind;
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

    // Dessin générique des drones autour d'un vaisseau (structure inspirée du client Flash)
    function drawDrones(worldX, worldY, droneConnector, shipAngle = 0) {
        if (!droneConnector || !droneConnector.groups || !droneConnector.groups.length) return;

        const normalizedShipAngle = isFinite(shipAngle) ? shipAngle : 0;
        const entityScale = (typeof getEntityDrawScale === "function") ? getEntityDrawScale() : 1;
        const baseRotationDeg = normalizedShipAngle * RAD_TO_DEG - 180;
        const directionIndex = getDirectionFrameIndex(normalizedShipAngle, DRONE_DIRECTION_FRAME_COUNT);
        const groupDimension = droneConnector.groupDimension || DRONE_GROUP_DIMENSION;

        ctx.save();
        ctx.globalCompositeOperation = "source-over";

        for (const group of droneConnector.groups) {
            const groupAngleDeg = baseRotationDeg + positionOffsetDegrees(group.position);
            const groupAngleRad = groupAngleDeg * DEG_TO_RAD;
            const groupWorldX = worldX + Math.cos(groupAngleRad) * groupDimension;
            const groupWorldY = worldY + Math.sin(groupAngleRad) * groupDimension;
            const groupScreenX = mapToScreenX(groupWorldX);
            const groupScreenY = mapToScreenY(groupWorldY);

            for (const drone of group.drones || []) {
                const kind = pickDroneKind(drone);
                const img = getDroneSpriteFrame(kind, directionIndex);
                if (!img || !img.complete || img.width === 0 || img.height === 0) continue;

                const droneAngleDeg = baseRotationDeg + positionOffsetDegrees(drone.position);
                const droneAngleRad = droneAngleDeg * DEG_TO_RAD;

                const droneRadius = (drone.position === DRONE_POSITION_CENTER ? 1 : (drone.dimension || DRONE_DEFAULT_DIMENSION));
                const droneWorldX = groupWorldX + Math.cos(droneAngleRad) * droneRadius;
                const droneWorldY = groupWorldY + Math.sin(droneAngleRad) * droneRadius;
                const droneScreenX = mapToScreenX(droneWorldX);
                const droneScreenY = mapToScreenY(droneWorldY);

                const drawW = img.width * entityScale;
                const drawH = img.height * entityScale;
                ctx.drawImage(img, droneScreenX - drawW / 2, droneScreenY - drawH / 2, drawW, drawH);
            }
        }

        ctx.restore();
    }


    function drawEntities() {
    const BASE_MARKER_SIZE = 14;
    const entityScale = (typeof getEntityDrawScale === "function") ? getEntityDrawScale() : 1;
    const scaledMarkerSize = BASE_MARKER_SIZE * entityScale;
    const boxMarkerSize = BASE_MARKER_SIZE;

    // 1) Vaisseaux / NPC (hors boxes)
      for (const id in entities) {
          const e = entities[id];
          if (e.kind === "box") continue;

          const dx = e.x - shipX;
          const dy = e.y - shipY;
          const distSq = dx * dx + dy * dy;
          if (distSq > VIEW_RADIUS_SQ) continue;
          if (!isEntityVisibleOnMap(e)) continue;
          if (e.invisible && e.id !== heroId) continue;

          const now = performance.now();
          const faded = e.targetFaded && (!e.targetFadeUntil || now < e.targetFadeUntil);
          if (e.targetFadeUntil && now >= e.targetFadeUntil) {
              e.targetFadeUntil = 0;
              e.targetFaded = false;
          }

          const entityScreenX = mapToScreenX(e.x);
          const entityScreenY = mapToScreenY(e.y);

        const def = SHIP_SPRITE_DEFS[e.shipId];
        let drewSprite = false;
        let spriteHeight = scaledMarkerSize;
        let img = null;

        // Si on a des sprites pour ce shipId, on les utilise
        if (def) {
            // Frame choisie en fonction de l'angle (si connu)
            let frameIndex = 0;
            if (typeof e.angle === "number" && def.frameCount > 1) {
                frameIndex = getDirectionFrameIndex(e.angle, def.frameCount);
            }

            // --- SPRITE DU VAISSEAU (on le charge tôt pour calculer le shift) ---
img = getShipSpriteFrame(e.shipId, frameIndex);

// Shift visuel Flash-like (important surtout pour Goliath & variantes)
// On l'applique au rendu du ship + glow + overlay, PAS au moteur (offsets moteurs = XML)
let shiftX = 0;
let shiftY = 0;

// Variante safe : on applique le shift uniquement aux ships qui utilisent la engineClass du Goliath (class 10)
const isGoliathFamily =
    (typeof SHIP_ENGINE_CLASS !== "undefined" && SHIP_ENGINE_CLASS && SHIP_ENGINE_CLASS[e.shipId] === 10);

if (isGoliathFamily && img && img.complete && img.width > 0 && img.height > 0 && typeof getVisualShiftFromCenter === "function") {
    const shift = (typeof getShipVisualShiftCached === "function")
        ? getShipVisualShiftCached(e.shipId, frameIndex, img)
        : getVisualShiftFromCenter(img);

    shiftX = (shift.x || 0) * entityScale;
    shiftY = (shift.y || 0) * entityScale;
}

// --- AURA (GLOW) SI DISPONIBLE POUR CE SHIPID ---
if (typeof getShipGlowFrame === "function") {
    const glowImg = getShipGlowFrame(e.shipId, frameIndex);
    if (glowImg && glowImg.complete && glowImg.width > 0 && glowImg.height > 0) {
        const gw = glowImg.width * entityScale;
        const gh = glowImg.height * entityScale;
        ctx.drawImage(glowImg, (entityScreenX - gw / 2) - shiftX, (entityScreenY - gh / 2) - shiftY, gw, gh);
    }
}

// --- ENGINE / SMOKE (ne pas appliquer shift ici) ---
const forceEngineMoving = typeof e.speed === "number" && e.speed > 0;
drawEngineTrail(`entity_${e.id}`, e.shipId, e.x, e.y, frameIndex, e.angle || 0, 0, forceEngineMoving);

// --- SPRITE DU VAISSEAU (shift appliqué ici) ---
if (img && img.complete && img.width > 0 && img.height > 0) {
    const w = img.width * entityScale;
    const h = img.height * entityScale;
    spriteHeight = h;

    ctx.drawImage(img, (entityScreenX - w / 2) - shiftX, (entityScreenY - h / 2) - shiftY, w, h);
    drewSprite = true;
}

// Overlay expansion (doit suivre le ship)
drawShipExpansionOverlay(e.shipId, frameIndex, entityScreenX - shiftX, entityScreenY - shiftY);


        }

        // Fallback : si pas de sprite (ou pas encore chargé), on garde le carré
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
              drawShieldAura(entityScreenX, entityScreenY, e.shield, e.maxShield, e.ishActive, e.invincible, e.ishSince, e.ishUntil, e.invSince, e.invUntil);
        }

        // Drones de l'entité
        if (setting_show_drones && e.drones && e.drones.groups && e.drones.groups.length > 0) {
            drawDrones(e.x, e.y, e.drones, e.angle || 0);
        }

        if (selectedTargetId !== null && e.id === selectedTargetId) {
            drawHpShieldBars(entityScreenX, entityScreenY, spriteHeight, e.hp, e.maxHp, e.shield, e.maxShield);
        }

        // -----------------------------------------------------------
        // DESSIN DU CERCLE DE SÉLECTION (CORRIGÉ)
        // -----------------------------------------------------------
        if (e.id === selectedTargetId || e.id === currentLaserTargetId) {
            
            let useRedCircle = true; // Par défaut rouge
            const myId = window.ANDROMEDA_CONFIG.userID;
            const myFaction = window.ANDROMEDA_CONFIG.factionId;

            // -- RÈGLE 1 : LE "TAG" (Qui a l'aggro ?) --
            // Si quelqu'un d'autre que moi a déjà attaqué cette cible (lockOwnerId)
            // Alors la cible est "prise" -> GRIS pour moi.
            if (e.lockOwnerId && e.lockOwnerId !== myId) {
                useRedCircle = false;
            }
            // -- RÈGLE 2 : SI PERSONNE N'A ENCORE TIRÉ --
            else {
                // Si c'est un ALIEN (NPC) -> Toujours ROUGE (il est libre)
                if (e.isNpc || e.kind === "npc") {
                    useRedCircle = true;
                }
                // Si c'est un JOUEUR
                else {
                    // Si c'est un allié (Même firme) -> GRIS
                    if (e.factionId && e.factionId === myFaction) {
                        useRedCircle = false;
                    } 
                    // Si c'est un ennemi -> ROUGE
                    else {
                        useRedCircle = true;
                    }
                }
            }

            // --- CORRECTION: On utilise vos définitions existantes (client_config.js) ---
            // targetRingOwned   = 309.png (Rouge)
            // targetRingUnowned = 311.png (Gris)
            const spritePath = useRedCircle ? UI_SPRITES.targetRingOwned : UI_SPRITES.targetRingUnowned;
            
            // On utilise votre fonction utilitaire getUiImage()
            const ringImg = getUiImage(spritePath);

            // NOUVEAU CODE (Corrigé)
if (ringImg && ringImg.complete) {
    const ringScale = (typeof getEntityDrawScale === "function") ? getEntityDrawScale() : 1;
    
    // 1. On utilise les dimensions natives de l'image pour ne pas la déformer (ratio respecté)
    // 2. On peut ajouter un multiplicateur (ex: * 1.0) si l'image native est trop petite/grande
    const w = ringImg.width * ringScale;
    const h = ringImg.height * ringScale;
    
    // 3. On centre l'image parfaitement
    ctx.drawImage(ringImg, entityScreenX - w / 2, entityScreenY - h / 2, w, h);
}
        }

        // Nom + clan sous le vaisseau (joueurs) ou nom seul pour les NPCs
        if (setting_show_player_names && e.name && e.kind !== "box") {
            const baseY = computeNameplateY(entityScreenY, spriteHeight, e.shipId, entityScale);
            const rankId = e.rankId || (e.id === heroId ? heroRankId : 0);
            const achievementId = e.galaxyGatesFinished || (e.id === heroId ? heroGalaxyGatesFinished : 0);
            const clanTagColor = (e.kind === "player" && e.clanTag) ? getClanTagColor(e.clanDiplomacy) : null;

            drawNameplateWithIcons(
                ctx,
                e.name,
                e.kind === "player" ? e.clanTag : null,
                entityScreenX,
                baseY,
                getNameplateColor(e),
                clanTagColor,
                rankId,
                e.factionId || 0,
                achievementId
            );
        }
    }

    // 2) Boxes (par dessus, inchangé)
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

        const now = performance.now();
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
                const animState = oreAnimationStates[e.id] || { frameIndex: Math.floor(Math.random() * frameCount), lastUpdate: now };

                if (now - animState.lastUpdate >= ORE_ANIMATION_FRAME_DURATION) {
                    const steps = Math.floor((now - animState.lastUpdate) / ORE_ANIMATION_FRAME_DURATION);
                    animState.frameIndex = (animState.frameIndex + steps) % frameCount;
                    animState.lastUpdate = animState.lastUpdate + steps * ORE_ANIMATION_FRAME_DURATION;
                }

                const frameImg = getOreSpriteFrame(spriteKey, animState.frameIndex);
                oreAnimationStates[e.id] = animState;

                if (frameImg && frameImg.complete && frameImg.width > 0 && frameImg.height > 0) {
                    ctx.drawImage(frameImg, boxScreenX - frameImg.width / 2, boxScreenY - frameImg.height / 2);
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
                const animState = boxAnimationStates[e.id] || { frameIndex: 0, lastUpdate: now };

                if (now - animState.lastUpdate >= BOX_ANIMATION_FRAME_DURATION) {
                    const steps = Math.floor((now - animState.lastUpdate) / BOX_ANIMATION_FRAME_DURATION);
                    animState.frameIndex = (animState.frameIndex + steps) % cfg.frameCount;
                    animState.lastUpdate = animState.lastUpdate + steps * BOX_ANIMATION_FRAME_DURATION;
                }

                frameIndex = animState.frameIndex;
                boxAnimationStates[e.id] = animState;
            }

            const frameImg = getBoxSpriteFrame(spriteCategory, frameIndex);

            if (frameImg && frameImg.complete && frameImg.width > 0 && frameImg.height > 0) {
                ctx.drawImage(frameImg, boxScreenX - frameImg.width / 2, boxScreenY - frameImg.height / 2);
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
    }
}



    function drawPortals() {
        const now = performance.now();
        const entityScale = (typeof getEntityDrawScale === "function") ? getEntityDrawScale() : 1;

        for (const pid in portals) {
            const p = portals[pid];

            // 1. Optimisation : Si trop loin, on ne dessine pas
            const dx = p.x - shipX;
            const dy = p.y - shipY;
            const distSq = dx * dx + dy * dy;

            // Si hors de vue (plus loin que la vision), on passe
            if (distSq > VIEW_RADIUS_SQ) continue;

            // 2. Conversion coordonnées Map -> Écran
            const portalScreenX = mapToScreenX(p.x);
            const portalScreenY = mapToScreenY(p.y);

            ctx.save();
            ctx.lineWidth = 2;

            // 3. LOGIQUE VISUELLE BASÉE SUR LE TYPE FLASH
            // Dans le protocole, typeId 1 = Saut (Jumpgate).
            // Les autres types (0, ou spécifiques comme 80, etc.) sont souvent des bases ou des éléments de décor.

            if (p.typeId === 1) {
                let drawn = false;
                const portalDef = PORTAL_SPRITE_DEFS.standard;

                if (portalDef) {
                    if (!p.idleStart) p.idleStart = now;

                    if (p.playJump && p.jumpStart) {
                        const jumpElapsed = now - p.jumpStart;
                        if (jumpElapsed <= PORTAL_ACTIVE_DURATION) {
                            const activeImg = getPortalSpriteFrame("standard", "active", 0);
                            if (activeImg && activeImg.complete && activeImg.width > 0 && activeImg.height > 0) {
                                const w = activeImg.width * entityScale;
                                const h = activeImg.height * entityScale;
                                ctx.drawImage(activeImg, portalScreenX - w / 2, portalScreenY - h / 2, w, h);
                                drawn = true;
                            }
                        } else {
                            p.playJump = false;
                            p.jumpStart = 0;
                        }
                    }

                    if (!drawn) {
                        const idleDef = portalDef.idle;
                        const frameDuration = 1000 / (idleDef.fps || PORTAL_ANIM_FPS);
                        const elapsed = now - (p.idleStart || now);
                        const frame = Math.floor(elapsed / frameDuration) % idleDef.frameCount;
                        const idleImg = getPortalSpriteFrame("standard", "idle", frame);
                        if (idleImg && idleImg.complete && idleImg.width > 0 && idleImg.height > 0) {
                            const w = idleImg.width * entityScale;
                            const h = idleImg.height * entityScale;
                            ctx.drawImage(idleImg, portalScreenX - w / 2, portalScreenY - h / 2, w, h);
                            drawn = true;
                        }
                    }
                }

                // Fallback vectoriel si les sprites ne sont pas disponibles
                if (!drawn) {
                    ctx.strokeStyle = "#00ffff"; // Cyan brillant
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = "#00ffff";

                    const radius = 24 * entityScale;

                    ctx.beginPath();
                    ctx.arc(portalScreenX, portalScreenY, radius, 0, Math.PI * 2, false);
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.arc(portalScreenX, portalScreenY, radius - 8, 0, Math.PI * 2, false);
                    ctx.globalAlpha = 0.6;
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.arc(portalScreenX, portalScreenY, 4, 0, Math.PI * 2, false);
                    ctx.fillStyle = "#ffffff";
                    ctx.fill();
                }

            } else {
                // --- BASE / STATION DE RÉPARATION (Carré/Structure) ---
                // Ce n'est pas un portail de saut, c'est la base (X-1 ou X-8)
                // Dans le Flash, c'est souvent une image de station, ici on fait un carré symbolique

                ctx.strokeStyle = "#0055ff"; // Bleu foncé (Couleur Firme)
                ctx.shadowBlur = 0; // Pas de lueur magique

                // Dessin d'une "Base" (Carré avec une croix au milieu pour atterrissage)
                const baseSize = 80 * entityScale;
                ctx.strokeRect(portalScreenX - baseSize/2, portalScreenY - baseSize/2, baseSize, baseSize);

                ctx.beginPath();
                ctx.moveTo(portalScreenX - baseSize/2, portalScreenY - baseSize/2);
                ctx.lineTo(portalScreenX + baseSize/2, portalScreenY + baseSize/2);
                ctx.moveTo(portalScreenX + baseSize/2, portalScreenY - baseSize/2);
                ctx.lineTo(portalScreenX - baseSize/2, portalScreenY + baseSize/2);
                ctx.globalAlpha = 0.3;
                ctx.stroke();

                // Label
                ctx.globalAlpha = 1;
                ctx.fillStyle = "#0055ff";
                ctx.font = "bold 10px Arial";
                ctx.textAlign = "center";
                ctx.fillText("BASE STATION", portalScreenX, portalScreenY + baseSize/2 + 12 * entityScale);
            }

            ctx.restore();
        }
    }

        function drawHeroHud() {
        const width  = HERO_HUD_WIDTH;
        const height = HERO_HUD_HEIGHT;
        const x = HERO_HUD_X;
        const y = HERO_HUD_Y;

        ctx.save();
        const hudBg = getUiImage(heroShield && heroMaxShield && heroShield < heroMaxShield ? UI_SPRITES.heroHudActiveBg : UI_SPRITES.heroHudBg);
        if (hudBg && hudBg.complete && hudBg.width > 0 && hudBg.height > 0) {
            ctx.drawImage(hudBg, x, y, width, height);
        } else {
            ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
            ctx.fillRect(x, y, width, height);
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
        }

        // ----- HEADER : SHIP + NOM DU VAISSEAU -----
        ctx.font = "13px Consolas, monospace";
        ctx.fillStyle = "#ffffff";
        ctx.textBaseline = "top";

        // Titre "Ship"
        ctx.textAlign = "left";
        ctx.fillText("Ship", x + 10, y + 6);

        // Nom du héros + flags à droite
        let name = heroName || "Vous";
        const statusFlags = [];
        if (heroCloaked)   statusFlags.push("CLK");
        if (heroIshActive) statusFlags.push("ISH");
        if (heroEmpActive) statusFlags.push("EMP");
        if (heroInvincible) statusFlags.push("INV");
        if (statusFlags.length > 0) name += " [" + statusFlags.join(" ") + "]";

        ctx.textAlign = "right";
        ctx.fillText(name, x + width - 10, y + 6);

        // ----- BARRE HP -----
        const hpBarX = x + 10;
        const hpBarY = y + 26;
        const hpBarW = width - 20;
        const hpBarH = 12;

        ctx.fillStyle = "#333333";
        ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);

        if (heroHp !== null && heroHp >= 0) {
            const denomHp = (heroMaxHp && heroMaxHp > 0) ? heroMaxHp : (heroHp || 1);
            const ratio   = Math.max(0, Math.min(1, heroHp / denomHp));
            const color   = ratio > 0.5 ? "#00ff00" : (ratio > 0.2 ? "#ffff00" : "#ff0000");
            ctx.fillStyle = color;
            ctx.fillRect(hpBarX, hpBarY, hpBarW * ratio, hpBarH);
        }

        ctx.strokeStyle = "#000000";
        ctx.strokeRect(hpBarX + 0.5, hpBarY + 0.5, hpBarW - 1, hpBarH - 1);
        ctx.fillStyle = "#ffffff";
        ctx.font = "11px Consolas, monospace";
        ctx.textAlign = "center";

        let hpText = "HP: ?";
        if (heroHp !== null) {
            if (heroMaxHp && heroMaxHp > 0) {
                hpText = `HP: ${heroHp} / ${heroMaxHp}`;
            } else {
                hpText = `HP: ${heroHp}`;
            }
        }
        ctx.fillText(hpText, hpBarX + hpBarW / 2, hpBarY + 1);

        // ----- BARRE SHIELD -----
        const shBarX = x + 10;
        const shBarY = y + 44;
        const shBarW = width - 20;
        const shBarH = 10;

        ctx.fillStyle = "#333333";
        ctx.fillRect(shBarX, shBarY, shBarW, shBarH);

        if (heroShield !== null && heroShield >= 0) {
            const denomSh = (heroMaxShield && heroMaxShield > 0) ? heroMaxShield : (heroShield || 1);
            const ratio   = Math.max(0, Math.min(1, heroShield / denomSh));
            ctx.fillStyle = "#00bfff";
            ctx.fillRect(shBarX, shBarY, shBarW * ratio, shBarH);
        }

        ctx.strokeStyle = "#000000";
        ctx.strokeRect(shBarX + 0.5, shBarY + 0.5, shBarW - 1, shBarH - 1);
        ctx.fillStyle = "#ffffff";

        let shdText = "SHD: ?";
        if (heroShield !== null) {
            if (heroMaxShield && heroMaxShield > 0) {
                shdText = `SHD: ${heroShield} / ${heroMaxShield}`;
            } else {
                shdText = `SHD: ${heroShield}`;
            }
        }
        ctx.fillText(shdText, shBarX + shBarW / 2, shBarY);

        // ----- LIGNES INFORMATIONS SHIP (Cargo / Lasers / Rockets / CFG) -----
        ctx.textAlign = "left";
        ctx.font = "11px Consolas, monospace";
        let infoY = y + 60;

        const cargoText = (heroCargo != null && heroMaxCargo != null)
            ? `Cargo : ${heroCargo} / ${heroMaxCargo}`
            : "Cargo : ?";

        ctx.fillText(cargoText, x + 10, infoY);
        infoY += 12;

        const totalLaserAmmo =
            (ammoStock[1] || 0) +
            (ammoStock[2] || 0) +
            (ammoStock[3] || 0) +
            (ammoStock[4] || 0) +
            (ammoStock[5] || 0) +
            (ammoStock[6] || 0);

        const totalRocketAmmo =
            (ammoStock[10] || 0) +
            (ammoStock[11] || 0) +
            (ammoStock[12] || 0);

        ctx.fillText(`Lasers : ${totalLaserAmmo}`,   x + 10, infoY);
        infoY += 12;
        ctx.fillText(`Rockets: ${totalRocketAmmo}`,  x + 10, infoY);

        // ----- BOUTON REPAIR -----
        const btnX = HERO_HUD_X + HERO_HUD_WIDTH - HERO_REPAIR_BTN_WIDTH - 10;
        const btnY = HERO_HUD_Y + HERO_HUD_HEIGHT - HERO_REPAIR_BTN_HEIGHT - 8;
        ctx.fillStyle = "#222222";
        ctx.fillRect(btnX, btnY, HERO_REPAIR_BTN_WIDTH, HERO_REPAIR_BTN_HEIGHT);
        ctx.strokeStyle = "#ffffff";
        ctx.strokeRect(btnX + 0.5, btnY + 0.5, HERO_REPAIR_BTN_WIDTH - 1, HERO_REPAIR_BTN_HEIGHT - 1);
        ctx.font = "12px Consolas, monospace";
        ctx.fillStyle = "#00ff00";
        ctx.textAlign = "center";
        ctx.fillText("REPAIR", btnX + HERO_REPAIR_BTN_WIDTH / 2, btnY + 4);

        // ----- LIGNE DU BAS : CONFIG + TOTALS -----
        const statusY = y + HERO_HUD_HEIGHT - 16;
        ctx.font = "10px Consolas, monospace";
        ctx.textAlign = "left";
        ctx.fillStyle = "#00ff00";
        ctx.fillText(`CFG:${heroConfig}  L:${totalLaserAmmo}  R:${totalRocketAmmo}`, x + 10, statusY);

        ctx.restore();
    }

function drawPlayerStatsHUD() {
        const x = HERO_HUD_X;
        const y = HERO_HUD_Y + HERO_HUD_HEIGHT + 10;

        const width  = 220;
        const height = 130; // un peu plus haut pour 7 lignes

        const chrome = drawWindowChrome(x, y, width, height, "User");

        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";

        let textX = x + 10;
        let textY = y + chrome.headerHeight + 2;

        ctx.font = "12px Consolas, monospace";

        ctx.fillText(`LVL : ${heroLevel}`,      textX, textY); textY += 16;
        ctx.fillText(`XP  : ${heroXp}`,         textX, textY); textY += 16;
        ctx.fillText(`HON : ${heroHonor}`,      textX, textY); textY += 16;
        ctx.fillText(`CRE : ${heroCredits}`,    textX, textY); textY += 16;
        ctx.fillText(`URI : ${heroUridium}`,    textX, textY); textY += 16;
        ctx.fillText(`JP  : ${heroJackpot}`,    textX, textY); textY += 16;
        ctx.fillText(`Keys: ${heroBootyKeys}`,  textX, textY);

        ctx.restore();
    }


    // A mettre avant drawQuickbar ou en tout début de fichier
function pathHexagon(ctx, x, y, size) {
    const r = size / 2;
    const cx = x + size / 2;
    const cy = y + size / 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (270 + (i * 60)) * (Math.PI / 180);
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
}

function drawQuickbar() {
    const slotCount = 10;
    
    // Dimensions
    const slotWidth  = (typeof ACTION_DRAWER_HEX_WIDTH !== "undefined" ? ACTION_DRAWER_HEX_WIDTH : 44);
    const slotHeight = (typeof ACTION_DRAWER_HEX_HEIGHT !== "undefined" ? ACTION_DRAWER_HEX_HEIGHT : 50);
    const padding    = 0;
    const headerHeight = 20;

    let cols = 10; let rows = 1;
    switch (quickbarLayoutMode) {
        case 0: cols = 10; rows = 1; break;
        case 1: cols = 1;  rows = 10; break;
        case 2: cols = 5;  rows = 2; break;
        case 3: cols = 2;  rows = 5; break;
    }

    const totalWidth  = cols * (slotWidth + padding) + padding;
    const totalHeight = rows * (slotHeight + padding) + headerHeight + padding;

    if (!quickbarInitialized) {
        quickbarPosition.x = (canvas.width - totalWidth) / 2;
        quickbarPosition.y = canvas.height - totalHeight - 10;
        quickbarInitialized = true;
    }

    const x = quickbarPosition.x;
    const y = quickbarPosition.y;
    quickbarBounds = { x: x, y: y, w: totalWidth, h: totalHeight };
    
    ctx.save();

    // Réinitialisation des zones de clic
    quickbarLockHitbox = null; 
    quickbarRotateHitbox = null; 
    quickbarMinHitbox = null; 
    quickbarDraggerHitbox = null;

    if (quickbarMinimized) { ctx.restore(); return; }

    const startX = x + padding;
    const startY = y + headerHeight;

    for (let slot = 1; slot <= slotCount; slot++) {
        const idx = slot - 1;
        const col = idx % cols;
        const row = Math.floor(idx / cols);

        const slotScreenX = startX + col * (slotWidth + padding);
        const slotScreenY = startY + row * (slotHeight + padding);
        const item = quickSlots[slot];

        if (quickbarLocked && !item) {
            quickbarSlotRects[slot] = null;
            quickbarSlotHitboxes[slot] = null;
            continue;
        }

        quickbarSlotRects[slot] = { x: slotScreenX, y: slotScreenY, w: slotWidth, h: slotHeight };
        quickbarSlotHitboxes[slot] = quickbarSlotRects[slot];

        let borderColor = null;
        let isSelected = false;
        if (item) {
            if (item.type === "ammo" && currentAmmoId === item.id) { borderColor = "#ffffff"; isSelected = true; }
            else if (item.type === "rocket" && currentRocketId === item.id) { borderColor = "#ffcc00"; isSelected = true; }
        }

        // 1. Fond Hexagone
        let bgPath = UI_SPRITES.quickbarSlot;
        if (item) {
            if (isSelected && typeof ACTION_DRAWER_ITEM_BG_SELECTED !== "undefined") bgPath = ACTION_DRAWER_ITEM_BG_SELECTED;
            else if (typeof ACTION_DRAWER_ITEM_BG_DEFAULT !== "undefined") bgPath = ACTION_DRAWER_ITEM_BG_DEFAULT;
        }
        const slotImg = getUiImage(bgPath);
        if (slotImg && slotImg.complete && slotImg.width > 0) ctx.drawImage(slotImg, slotScreenX, slotScreenY, slotWidth, slotHeight);
        else { ctx.fillStyle = "rgba(40,40,40,0.5)"; pathHexagon(ctx, slotScreenX + (slotWidth-slotHeight)/2, slotScreenY, slotHeight); ctx.fill(); }

        // 2. Halo
        if (item) {
            ctx.save();
            let glowColor = (isSelected && borderColor) ? borderColor : "rgba(255, 255, 255, 0.7)";
            let lineWidth = (isSelected && borderColor) ? 2.2 : 1.2;
            let blur = (isSelected && borderColor) ? 8 : 3;
            ctx.strokeStyle = glowColor; ctx.lineWidth = lineWidth; ctx.shadowColor = glowColor; ctx.shadowBlur = blur;
            pathHexagon(ctx, slotScreenX + (slotWidth - slotHeight)/2 + 2, slotScreenY + 2, slotHeight - 4);
            ctx.stroke();
            ctx.restore();
        }

        // 3. Icône
        if (item) {
            const iconPath = getQuickbarIconPath(item);
            const iconImg  = getUiImage(iconPath);
            if (iconImg && iconImg.complete && iconImg.width > 0) {
                const iSize = 38;
                const iX = slotScreenX + (slotWidth - iSize) / 2;
                const iY = slotScreenY + (slotHeight - iSize) / 2;
                ctx.drawImage(iconImg, iX, iY, iSize, iSize);
            } else {
                ctx.fillStyle = "#eee"; ctx.font = "bold 10px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
                let label = item.label || (item.code || ("x" + item.id));
                ctx.fillText(label.substring(0, 3), slotScreenX + slotWidth / 2, slotScreenY + slotHeight / 2);
            }

            // =========================================================================
            // A. QUANTITÉ INFAILLIBLE (MAPPING DIRECT)
            // =========================================================================
            let qty = 0;
            let hasStock = false;
            let stockId = item.stockId;

            // Si pas de stockId, on le déduit mathématiquement selon le type
            if (!stockId) {
                if (item.type === "ammo") {
                    stockId = item.id; // Laser ID 4 = Stock 4 (Correct)
                } else if (item.type === "rocket") {
                    stockId = item.id + 9; // Rocket ID 1 (R310) = Stock 10 (CORRIGÉ : index 9 dans tableau = ID 10 en base)
                    // Note: Dans ton émulateur, les roquettes commencent souvent à l'index 9 ou 10 du tableau
                    // Si PLT-2026 (ID 2) = Stock 10, alors ID + 8 fonctionne.
                    // Si R-310 (ID 1) = Stock 9, alors ID + 8 fonctionne.
                    stockId = item.id + 8; 
                } else if (item.type === "mine") {
                    stockId = item.id + 19; // Mine ID 1 = Stock 20
                } else if (item.type === "cpu" && typeof QUICKBAR_ITEMS_BY_CATEGORY !== 'undefined') {
                    // Pour les CPU, on garde la recherche car les IDs sont complexes
                     for (const cat in QUICKBAR_ITEMS_BY_CATEGORY) {
                         const found = QUICKBAR_ITEMS_BY_CATEGORY[cat].find(i => i.id === item.id || i.code === item.code);
                         if (found && found.stockId) { stockId = found.stockId; break; }
                     }
                }
            }

            if (stockId && typeof ammoStock !== 'undefined' && ammoStock[stockId] !== undefined) {
                qty = parseInt(ammoStock[stockId], 10) || 0;
                hasStock = true;
            }

            // B. AFFICHAGE DE LA BARRE
            let hasVisualBar = false;
            if (item.type === "ammo" || item.type === "rocket" || item.type === "mine" || (item.type === "cpu" && stockId)) {
                
                const maxVal = (item.type === "ammo") ? 2000 : 100;
                const framesList = (typeof AMMO_BAR_FRAME_IDS !== 'undefined') ? AMMO_BAR_FRAME_IDS : [];
                
                if (framesList.length > 0) {
                    const clampedQty = Math.max(0, Math.min(qty, maxVal));
                    const ratio = clampedQty / maxVal;
                    
                    let frameIndex = Math.floor(ratio * (framesList.length - 1));
                    if (frameIndex < 0) frameIndex = 0;
                    if (frameIndex >= framesList.length) frameIndex = framesList.length - 1;

                    const imageNum = framesList[frameIndex];
                    const barImg = getUiImage(`graphics/ui/actionMenu/images/${imageNum}.png`);
                    
                    if (barImg && barImg.complete && barImg.width > 0) {
                        const bW = (typeof AMMO_BAR_WIDTH !== 'undefined') ? AMMO_BAR_WIDTH : 38;
                        const bH = (typeof AMMO_BAR_HEIGHT !== 'undefined') ? AMMO_BAR_HEIGHT : 9;
                        const bTop = (typeof AMMO_BAR_OFFSET_TOP !== 'undefined') ? AMMO_BAR_OFFSET_TOP : 13;
                        const bx = slotScreenX + (slotWidth - bW) / 2;
                        const by = slotScreenY + bTop;
                        ctx.drawImage(barImg, bx, by, bW, bH);
                    }
                }
                hasVisualBar = true;
            }

            // C. TEXTE (Seulement si pas de barre)
            if (!hasVisualBar) {
                let qtyText = "";
                let textColor = "#ccc";
                if (hasStock) {
                    qtyText = (qty > 9999) ? (qty/1000).toFixed(0)+"k" : qty.toString();
                    if (qty <= 0) textColor = "#ff4444";
                }
                if (qtyText !== "") {
                    ctx.fillStyle = textColor; ctx.font = "9px Arial"; ctx.textAlign = "right";
                    ctx.fillText(qtyText, slotScreenX + slotWidth - 8, slotScreenY + slotHeight - 8);
                }
            }

            // D. Cooldown
            const code = getActionCodeForSlot(slot);
            if (code) { const cd = getCooldownInfo(code); if (cd) { const ratio = cd.remaining / cd.total; ctx.save(); pathHexagon(ctx, slotScreenX+(slotWidth-slotHeight)/2+2, slotScreenY+2, slotHeight-4); ctx.clip(); ctx.fillStyle="rgba(0,0,0,0.6)"; const h=slotHeight*ratio; ctx.fillRect(slotScreenX, slotScreenY+slotHeight-h, slotWidth, h); ctx.fillStyle="#fff"; ctx.font="bold 11px Arial"; ctx.textAlign="center"; ctx.fillText(Math.ceil(cd.remaining), slotScreenX+slotWidth/2, slotScreenY+slotHeight/2); ctx.restore(); } }
        }

        // 4. Numéro slot
        const numberImageId = 355 + (slot - 1) * 2;
        const numberImgPath = `graphics/ui/actionMenu/images/${numberImageId}.png`;
        const numberImg = getUiImage(numberImgPath);
        if (numberImg && numberImg.complete && numberImg.width > 0) {
            const nx = slotScreenX + (slotWidth - numberImg.width) / 2;
            const ny = slotScreenY + slotHeight - numberImg.height - 4;
            ctx.drawImage(numberImg, nx, ny);
        }

        // 5. Outils (Slot 1)
        if (slot === 1 && !quickbarLocked) {
            const draggerImg = getUiImage("graphics/ui/actionMenu/images/171.png");
            if (draggerImg && draggerImg.complete) {
                const dSize = 19; const draggerX = slotScreenX - 5; const draggerY = slotScreenY - 5;
                ctx.drawImage(draggerImg, draggerX, draggerY, dSize, dSize);
                quickbarDraggerHitbox = { x: draggerX, y: draggerY, w: dSize, h: dSize };
            }
            const rotImg = getUiImage("graphics/ui/actionMenu/images/157.png");
            if (rotImg && rotImg.complete) {
                const rSize = 19; const rotX = slotScreenX + slotWidth - rSize + 5; const rotY = slotScreenY - 5;
                ctx.drawImage(rotImg, rotX, rotY, rSize, rSize);
                quickbarRotateHitbox = { x: rotX, y: rotY, w: rSize, h: rSize };
            }
        }
    } 
    ctx.restore();
}

	
	function drawTooltip() {
        if (!activeTooltip) return;
        const x = activeTooltip.x + 10; // Décalage souris
        const y = activeTooltip.y + 10;
        const text = activeTooltip.text;

        ctx.save();
        ctx.font = "12px Arial";
        const w = ctx.measureText(text).width + 8;
        const h = 20;

        // Fond noir
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = "#aaa";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);

        // Texte blanc
        ctx.fillStyle = "#fff";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(text, x + 4, y + h/2);
        ctx.restore();
    }



   function drawDebugInfo() {
    if (!infoMessages || infoMessages.length === 0) return;

    const now = performance.now();

    // purge expirés
    for (let k = infoMessages.length - 1; k >= 0; k--) {
        const m = infoMessages[k];
        if (m && now - m.createdAt > (m.duration || 2500)) {
            infoMessages.splice(k, 1);
        }
    }
    if (infoMessages.length === 0) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const x = canvas.width / 2;
    const y = 20;
    const lineH = 20;

    // ✅ style Flash-like : texte blanc + contour noir (sans fond)
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


	// ========================================================
// GESTIONNAIRE DE FENÊTRES & MENU PRINCIPAL (Style Flash)
// ========================================================
function initWindowManager() {
    const logoutIconPath = "graphics/ui/window1/images/15_logout_icon.png.png";
    const logoutWindowBg = UI_SPRITES.windowBg ? `url('${UI_SPRITES.windowBg}')` : "rgba(0, 10, 20, 0.92)";
    const logoutHeaderBg = UI_SPRITES.windowHeader ? `url('${UI_SPRITES.windowHeader}')` : "linear-gradient(90deg, rgba(0,20,40,0.9), rgba(0,50,80,0.9))";
    const logoutCloseBg = UI_SPRITES.buttonClose ? `url('${UI_SPRITES.buttonClose}')` : "rgba(0,60,90,0.8)";
    const style = document.createElement('style');
    style.innerHTML = `
        /* --- BARRE D'ICÔNES (GAUCHE) --- */
        #mainMenuContainer {
    position: absolute;
    top: 12px; left: 12px;

    /* largeur = icône (40) */
    width: 40px;

    /* plus de “cadre” autour */
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 0;
    box-shadow: none;

    display: flex;
    flex-direction: column;
    gap: 5px;
    z-index: 2000;
}

        .mainMenuIcon {
            width: 40px; height: 40px;
            background-color: rgba(0, 20, 40, 0.6);
            background-size: 80% 80%;
            background-position: center;
            background-repeat: no-repeat;
            border: 1px solid #4a6b8c;
            border-radius: 6px;
            cursor: pointer;
            display: flex; justify-content: center; align-items: center;
            color: #00aaff; font-weight: bold; font-size: 10px; font-family: Arial;
            transition: all 0.2s;
            box-shadow: 0 0 5px rgba(0,0,0,0.5);
        }
        .mainMenuIcon:hover { border-color: #fff; background-color: rgba(0, 40, 80, 0.9); }
        .mainMenuIcon.active { border-color: #00ff00; box-shadow: 0 0 8px #00ff00; }

        /* --- FENÊTRES GÉNÉRIQUES --- */
        .gameWindow {
            position: absolute;
            color: #ccc; font-family: Consolas, monospace; font-size: 11px;
            display: none; /* Caché par défaut */
            flex-direction: column;
            z-index: 1000;
            box-shadow: 0 0 10px #000;
            overflow: hidden;
        }
        .gameWindow.basicWindow {
            background: rgba(0, 10, 20, 0.85);
            border: 1px solid #4a6b8c;
        }
        .basicWindow .basicHeader {
            height: 24px;
            background: rgba(0,0,0,0.65);
            border-bottom: 1px solid #4a6b8c;
            display:flex;
            align-items:center;
            justify-content: space-between;
            padding: 0 6px;
            cursor: move;
            color: #00aaff;
            font-weight: bold;
        }
        .basicWindow .basicContent {
            padding: 6px;
            background: rgba(0,0,0,0.55);
            color: #ccc;
            flex:1;
            min-height: 0;
        }
        #win_chat { overflow:hidden; }
        #win_chat .basicContent { display:flex; flex-direction:column; min-height:0; }
        #content_chat { display:flex; flex-direction:column; min-height:0; }
        .basicWindow .basicBtn { cursor:pointer; color:#fff; background:#222; border:1px solid #555; padding:1px 4px; font-size:10px; }
        .windowChrome { position:absolute; inset:0; pointer-events:none; }
        .windowChrome .winCorner { position:absolute; width:23px; height:21px; background-size:100% 100%; }
        .windowChrome .winCorner.tl { top:0; left:0; background-image:url('${UI_SPRITES.windowCornerTL}'); }
        .windowChrome .winCorner.tr { top:0; right:0; background-image:url('${UI_SPRITES.windowCornerTR}'); }
        .windowChrome .winCorner.bl { bottom:0; left:0; background-image:url('${UI_SPRITES.windowCornerBL}'); }
        .windowChrome .winCorner.br { bottom:0; right:0; background-image:url('${UI_SPRITES.windowCornerBR}'); }
        .windowChrome .winEdge.top { position:absolute; left:23px; right:23px; top:0; height:28px; background:${UI_SPRITES.windowTopEdge ? `url('${UI_SPRITES.windowTopEdge}')` : "rgba(0,0,0,0.5)"}; background-repeat: repeat-x; background-size:auto 100%; }
        .windowChrome .winEdge.bottom { position:absolute; left:23px; right:23px; bottom:0; height:28px; background:${UI_SPRITES.windowBottomEdge ? `url('${UI_SPRITES.windowBottomEdge}')` : "rgba(0,0,0,0.5)"}; background-repeat: repeat-x; background-size:auto 100%; }
        .windowChrome .winEdge.left { position:absolute; left:0; top:21px; bottom:21px; width:16px; background:${UI_SPRITES.windowSide ? `url('${UI_SPRITES.windowSide}')` : "rgba(0,0,0,0.6)"}; background-repeat: repeat-y; background-size:100% auto; }
        .windowChrome .winEdge.right { position:absolute; right:0; top:21px; bottom:21px; width:16px; background:${UI_SPRITES.windowSide ? `url('${UI_SPRITES.windowSide}')` : "rgba(0,0,0,0.6)"}; background-repeat: repeat-y; background-size:100% auto; }
        .windowInterior { position:absolute; left:16px; right:16px; top:28px; bottom:28px; background:${UI_SPRITES.windowBg ? `url('${UI_SPRITES.windowBg}')` : "rgba(0, 10, 20, 0.85)"}; background-size:100% 100%; display:flex; flex-direction:column; }
        .gameWindow.chatTheme .winCorner.tl { background-image:url('${UI_SPRITES.chatCornerTL || UI_SPRITES.windowCornerTL || ''}'); }
        .gameWindow.chatTheme .winCorner.tr { background-image:url('${UI_SPRITES.chatCornerTR || UI_SPRITES.windowCornerTR || ''}'); }
        .gameWindow.chatTheme .winCorner.bl { background-image:url('${UI_SPRITES.chatCornerBL || UI_SPRITES.windowCornerBL || ''}'); }
        .gameWindow.chatTheme .winCorner.br { background-image:url('${UI_SPRITES.chatCornerBR || UI_SPRITES.windowCornerBR || ''}'); }
        .gameWindow.chatTheme .winEdge.top { background:${UI_SPRITES.chatTopEdge ? `url('${UI_SPRITES.chatTopEdge}')` : (UI_SPRITES.windowTopEdge ? `url('${UI_SPRITES.windowTopEdge}')` : "rgba(0,0,0,0.5)")}; background-repeat: repeat-x; background-size:auto 100%; }
        .gameWindow.chatTheme .winEdge.bottom { background:${UI_SPRITES.chatBottomEdge ? `url('${UI_SPRITES.chatBottomEdge}')` : (UI_SPRITES.windowBottomEdge ? `url('${UI_SPRITES.windowBottomEdge}')` : "rgba(0,0,0,0.5)")}; background-repeat: repeat-x; background-size:auto 100%; }
        .gameWindow.chatTheme .winEdge.left,
        .gameWindow.chatTheme .winEdge.right { background:${UI_SPRITES.chatSide ? `url('${UI_SPRITES.chatSide}')` : (UI_SPRITES.windowSide ? `url('${UI_SPRITES.windowSide}')` : "rgba(0,0,0,0.6)")}; background-repeat: repeat-y; background-size:100% auto; }
        .gameWindow.chatTheme .windowInterior { background:${UI_SPRITES.chatBgTile ? `url('${UI_SPRITES.chatBgTile}')` : (UI_SPRITES.windowBg ? `url('${UI_SPRITES.windowBg}')` : "rgba(0, 10, 20, 0.85)")}; }
        .gwHeader {
            height: 28px; background: ${UI_SPRITES.windowHeader ? `url('${UI_SPRITES.windowHeader}')` : "rgba(0, 0, 0, 0.8)"};
            background-repeat: repeat-x; background-size:auto 100%;
            border-bottom: 1px solid #4a6b8c;
            display: flex; justify-content: space-between; align-items: center;
            padding: 0 5px; cursor: move;
        }
		        .windowHeaderIcon {
            width: 22px;
            height: 22px;
            margin-right: 6px;
            background-size: 90% 90%;
            background-position: center;
            background-repeat: no-repeat;
            border-radius: 4px;
            box-shadow: 0 0 4px #000;
            cursor: pointer;
            flex-shrink: 0;
        }
        .windowHeaderIcon:hover {
            box-shadow: 0 0 6px #0ff;
        }

        .gameWindow.chatTheme .gwHeader { background:${UI_SPRITES.chatHeader ? `url('${UI_SPRITES.chatHeader}')` : (UI_SPRITES.windowHeader ? `url('${UI_SPRITES.windowHeader}')` : "rgba(0,0,0,0.8)")}; }
        .gameWindow.chatTheme .gwContent { background:${UI_SPRITES.chatFooter ? `url('${UI_SPRITES.chatFooter}')` : (UI_SPRITES.windowFooter ? `url('${UI_SPRITES.windowFooter}')` : "rgba(0,0,0,0.25)")}; background-size:100% 100%; }
        .gwTitle { color: #00aaff; font-weight: bold; font-size: 11px; text-shadow: 1px 1px 0 #000; }
        .gwButtons { display: flex; gap: 4px; }
        .gwBtn { cursor: pointer; width: 16px; height: 16px; background-size: 100% 100%; background-repeat: no-repeat; filter: drop-shadow(0 0 2px #000); }
        .gwBtn.closeBtn { background-image: url('${UI_SPRITES.buttonClose}'); }
        .gwBtn.collapseBtn { background-image: url('${UI_SPRITES.buttonCollapse}'); }
        .gwBtn:hover { filter: drop-shadow(0 0 4px #0ff); }
        .gwContent { padding: 6px; overflow: hidden; flex: 1; position: relative; background: ${UI_SPRITES.windowFooter ? `url('${UI_SPRITES.windowFooter}')` : "rgba(0,0,0,0.25)"}; background-size: 100% 100%; }

        /* Chat styles aligned with Flash visual hints */
        .chatLine { font-size:11px; line-height:14px; color:#eeeeee; text-shadow:1px 1px 0 #000; }
        .chatLine .chatName { color:#a6dcf9; cursor:pointer; text-decoration:none; }
        .chatLine .chatName:hover { color:#b9ecff; text-decoration:underline; }
        .chatLine .chatClanTag { color:#5cf18b; }
        .chatLine.chatSystem, .chatLine.chatSystem .chatName { color:#ffe538; font-weight:bold; }
        .chatLine.chatSupporter, .chatLine.chatSupporter .chatName { color:#ff0000; font-weight:bold; }
        .chatLine.chatMod, .chatLine.chatMod .chatName { color:#f5b829; font-weight:bold; }
        .chatLine.chatWhisper, .chatLine.chatWhisper .chatName { color:#880000; }
        .chatLine.chatClan { color:#5cf18b; }
        .chatLine.chatFaction { color:#7bb5ff; }
        #chatContent { min-height:0; }
        #win_chat .chatResizer {
            position:absolute;
            width:16px;
            height:16px;
            right:4px;
            bottom:4px;
            cursor: se-resize;
            background: transparent;
            border: none;
            box-shadow: none;
            opacity: 0;
        }
        #win_chat .chatResizer:hover { opacity: 1; }
        
        /* Barres de progression (HP/SHD) */
        .statBarBox { width: 100%; height: 10px; background: #222; border: 1px solid #555; margin-bottom: 2px; position:relative; }
        .statBarFill { height: 100%; width: 50%; transition: width 0.2s; }
        .statBarText { position: absolute; top:-1px; left:0; width:100%; text-align:center; font-size:9px; color:#fff; text-shadow:1px 1px 0 #000; }

        .uiStatRow { display:flex; align-items:center; gap:6px; margin-bottom:4px; }
        .uiStatIcon { width:16px; height:16px; background-size: contain; background-repeat:no-repeat; }
        .uiStatBar { position:relative; flex:1; height:16px; border:1px solid #152536; background:${UI_SPRITES.windowFooter ? `url('${UI_SPRITES.windowFooter}')` : "rgba(0,0,0,0.4)"}; background-size:100% 100%; }
        .uiStatFill { position:absolute; left:0; top:0; bottom:0; background:rgba(0,255,0,0.55); }
        .uiStatText { position:absolute; left:0; top:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:10px; color:#fff; text-shadow:1px 1px 0 #000; }
        .uiValueRow { display:flex; align-items:center; justify-content:space-between; margin-bottom:2px; color:#e0efff; font-size:11px; }
        .uiValueRow .label { display:flex; align-items:center; gap:6px; }

        /* Booster window */
        #win_booster .basicContent { padding: 6px 6px 8px; }
        #win_booster .boosterList { display: flex; flex-direction: column; gap: 6px; }
        #win_booster .boosterRow { display: flex; align-items: center; gap: 6px; }
        #win_booster .boosterIcon { width: 16px; height: 16px; background-size: contain; background-repeat: no-repeat; background-position: center; flex-shrink: 0; }
        #win_booster .boosterBar { position: relative; width: 60px; height: 10px; border: 1px solid #2a4057; background: rgba(0, 0, 0, 0.55); }
        #win_booster .boosterFill { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(90deg, #4aff4a, #00cc00); }
        #win_booster .boosterText { position: absolute; left: 0; top: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #fff; text-shadow: 1px 1px 0 #000; }

        /* Boutons en haut à droite (Refining + Trade + Settings + Logout) */
        #refiningButton {
  position: absolute;
  top: 12px;
  right: 150px;
  width: 40px;
  height: 40px;

  background-image: url('graphics/ui/window1/images/9_refinement_icon.png');
  background-size: 90% 90%;
  background-position: center;
  background-repeat: no-repeat;
  background-color: rgba(0, 20, 40, 0.6);

  border: 1px solid #4a6b8c;
  border-radius: 6px;
  cursor: pointer;
  box-shadow: 0 0 5px rgba(0,0,0,0.5);
  z-index: 2200;
}

        #refiningButton:hover { border-color: #fff; background-color: rgba(0, 40, 80, 0.9); }

        #tradeButton {
            position: absolute;
            top: 12px;
            right: 104px;
            width: 40px;
            height: 40px;
            background-image: url('graphics/ui/window1/images/1_trade_icon.png.png');
            background-size: 90% 90%;
            background-position: center;
            background-repeat: no-repeat;
            background-color: rgba(0, 20, 40, 0.6);
            border: 1px solid #4a6b8c;
            border-radius: 6px;
            cursor: pointer;
            box-shadow: 0 0 5px rgba(0,0,0,0.5);
            z-index: 2200;
        }
        #tradeButton:hover { border-color: #fff; background-color: rgba(0, 40, 80, 0.9); }

        #settingsButton {
            position: absolute;
            top: 12px;
            right: 58px;
            width: 40px;
            height: 40px;
            background-image: url('graphics/ui/window1/images/8_settings_icon.png.png');
            background-size: 90% 90%;
            background-position: center;
            background-repeat: no-repeat;
            background-color: rgba(0, 20, 40, 0.6);
            border: 1px solid #4a6b8c;
            border-radius: 6px;
            cursor: pointer;
            box-shadow: 0 0 5px rgba(0,0,0,0.5);
            z-index: 2200;
        }
        #settingsButton:hover { border-color: #fff; background-color: rgba(0, 40, 80, 0.9); }

        /* Logout (bouton top-droite + fenêtre centrale) */
        #logoutButton {
            position: absolute;
            top: 12px;
            right: 12px;
            width: 40px;
            height: 40px;
            background-image: url('${logoutIconPath}');
            background-size: 90% 90%;
            background-position: center;
            background-repeat: no-repeat;
            background-color: rgba(0, 20, 40, 0.6);
            border: 1px solid #4a6b8c;
            border-radius: 6px;
            cursor: pointer;
            box-shadow: 0 0 5px rgba(0,0,0,0.5);
            z-index: 2200;
        }
        #logoutButton:hover { border-color: #fff; background-color: rgba(0, 40, 80, 0.9); }

        #logoutWindow {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 240px;
            min-height: 180px;
            display: none;
            flex-direction: column;
            background: ${logoutWindowBg};
            background-size: 100% 100%;
            border: 1px solid #4a6b8c;
            box-shadow: 0 0 10px #000;
            z-index: 2200;
        }
        #logoutWindow .logoutHeader {
            height: 28px;
            background: ${logoutHeaderBg};
            background-repeat: repeat-x;
            background-size: auto 100%;
            border-bottom: 1px solid #4a6b8c;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 6px;
            color: #00aaff;
            font-weight: bold;
            font-size: 11px;
            cursor: move;
        }
        #logoutWindow .logoutHeader .logoutHeaderLeft {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        #logoutWindow .logoutHeader .logoutHeaderLeft .windowHeaderIcon {
            width: 20px;
            height: 20px;
            background-image: url('${logoutIconPath}');
            background-size: 90% 90%;
            background-position: center;
            background-repeat: no-repeat;
            border-radius: 4px;
            display: inline-flex;
        }
        #logoutWindow .logoutClose {
            width: 18px;
            height: 18px;
            background: ${logoutCloseBg};
            background-size: 100% 100%;
            border: 1px solid #4a6b8c;
            border-radius: 4px;
            cursor: pointer;
            box-shadow: 0 0 4px rgba(0,0,0,0.6);
        }
        #logoutWindow .logoutClose:hover { box-shadow: 0 0 6px #0ff; }

        #logoutWindow .logoutContent {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 14px 12px 16px 12px;
            text-align: center;
            color: #ffffff;
            background: rgba(0,0,0,0.35);

            background-size: 100% 100%;
        }
        #logoutWindow .logoutTextTop {
            font-size: 13px;
            font-weight: bold;
            letter-spacing: 0.5px;
        }
        #logoutWindow .logoutCountdown {
            font-size: 28px;
            font-weight: bold;
            text-shadow: 1px 1px 2px #000;
        }
        #logoutWindow .logoutTextBottom {
            font-size: 12px;
            color: #d0eaff;
        }
        #logoutWindow .doClassicButton {
            margin-top: 6px;
            min-width: 120px;
        }
		#logoutWindow .logoutCancelBtn{
    background: rgba(0,0,0,0.35);
    border: 1px solid #4a6b8c;
    border-radius: 4px;
    color: #ffffff;
    cursor: pointer;
    padding: 3px 8px;
    min-width: 120px;
    height: 22px;
    font-family: Arial, sans-serif;
    font-size: 11px;
    box-shadow: none;
}
#logoutWindow .logoutCancelBtn:hover{
    background: rgba(0,0,0,0.55);
}
        #logoutWindow .logoutCancelBtn:active{
    background: rgba(0,0,0,0.70);
}

        /* Fenêtre Refining / Upgrade */
        #refiningWindow {
            position: absolute;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            width: 455px;
            min-height: 525px;
            display: none;
            flex-direction: column;
            background: ${logoutWindowBg};
            background-size: 100% 100%;
            border: 1px solid #4a6b8c;
            box-shadow: 0 0 10px #000;
            color: #cde8ff;
            z-index: 2200;
            padding-bottom: 8px;
        }

        #refiningWindow .refiningHeader {
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 8px;
            background: ${logoutHeaderBg};
            background-repeat: repeat-x;
            background-size: auto 100%;
            border-bottom: 1px solid #4a6b8c;
            cursor: move;
        }

        #refiningWindow .refiningHeader .left {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        #refiningWindow .refiningHeader .windowHeaderIcon {
  width: 22px;
  height: 22px;
  background-image: url('graphics/ui/window1/images/9_refinement_icon.png');
  background-size: 90% 90%;
  background-position: center;
  background-repeat: no-repeat;
  background-color: rgba(0, 20, 40, 0.6);
  border-radius: 4px;
}


        #refiningWindow .refiningTitle { font-weight: bold; color: #00aaff; }

        #refiningWindow .refiningTabs {
            display: flex;
            gap: 4px;
            padding: 6px;
            background: rgba(0,0,0,0.35);
            border-bottom: 1px solid #2d4c63;
        }

        #refiningWindow .refTab {
            flex: 1;
            height: 26px;
            background: #122031;
            border: 1px solid #33516a;
            color: #cde8ff;
            cursor: pointer;
            font-size: 11px;
        }

        #refiningWindow .refTab.active {
            background: #1d3248;
            color: #fff;
            border-color: #4a6b8c;
        }

        #refiningWindow .refiningBody {
            padding: 12px;
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        #refiningWindow .refPage { display: none; flex: 1; flex-direction: column; gap: 10px; }
        #refiningWindow .refPage.active { display: flex; }
		
/* --- Arbre de Raffinage (Correction Flash - Taille Agrandie) --- */
#refiningWindow .refiningTreeWrap {
    flex: 1;
    display: flex;
    justify-content: center;
    padding: 20px;
    background: rgba(0,0,0,0.3);
}

#refiningWindow .refiningTree {
    position: relative;
    width: 400px;
    height: 380px; /* plus haut pour laisser de l'air en bas */
    user-select: none;
}


#refiningWindow .refiningTreeLines {
    position: absolute;
    inset: 0;
    z-index: 1;
}

#refiningWindow .refNode {
    position: absolute;
    z-index: 10;
    width: 84px; /* Augmenté (était 72) */
    text-align: center;
}

#refiningWindow .refNodeTitle {
    font-size: 11px;
    color: #a6d5ff;
    font-weight: bold;
    margin-bottom: 4px;
    text-shadow: 1px 1px 2px #000;
}

#refiningWindow .refNodeBox {
    background: #0a121a;
    border: 1px solid #3c5f7c;
    border-radius: 4px;
    box-shadow: 0 0 8px rgba(0,0,0,0.8);
    overflow: hidden;
}

#refiningWindow .refNodeIcon {
    height: 52px; /* Augmenté (était 40) */
    background-size: 46px; /* Icônes plus grandes */
    background-repeat: no-repeat;
    background-position: center;
}

#refiningWindow .refNodeCount {
    height: 18px;
    line-height: 18px;
    background: rgba(0,0,0,0.7);
    border-top: 1px solid #2d4c63;
    font-size: 11px;
    font-weight: bold;
    color: #ffd700; /* Chiffres en "Or" pour mieux voir */
}

#refiningWindow .refNodeBtn {
    margin-top: 6px;
    width: 100%;
    height: 22px;
    background: linear-gradient(to bottom, #2d4c63, #122031);
    border: 1px solid #4a6b8c;
    color: #fff;
    cursor: pointer;
    font-size: 11px;
    border-radius: 3px;
}
#refinePromptOverlay{
    position:fixed;
    inset:0;
    background:rgba(0,0,0,0.45);
    z-index:4000;
    display:flex;
    align-items:center;
    justify-content:center;
}
#refinePrompt{
    width:260px;
    padding:16px;
    background:rgba(0,12,24,0.92);
    border:1px solid #4a6b8c;
    box-shadow:0 0 10px #000;
    color:#cde8ff;
    font-family:Arial,sans-serif;
}
#refinePrompt h4{
    margin:0 0 6px 0;
    font-size:13px;
    color:#00aaff;
}
#refinePrompt p{
    margin:0 0 10px 0;
    font-size:12px;
    color:#cde8ff;
}
#refinePrompt select{
    width:100%;
    height:24px;
    background:rgba(0,0,0,0.35);
    border:1px solid #33516a;
    color:#fff;
}
#refinePrompt .refinePromptActions{
    margin-top:12px;
    display:flex;
    gap:8px;
    justify-content:flex-end;
}
#refinePrompt button{
    min-width:70px;
    height:24px;
    background:rgba(0,0,0,0.35);
    border:1px solid #4a6b8c;
    color:#fff;
    cursor:pointer;
}
#refinePrompt button:hover{ background: rgba(0,0,0,0.55); }


        .oreGrid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 8px;
        }

        .oreCard {
            display: flex;
            gap: 8px;
            align-items: center;
            padding: 6px;
            background: rgba(0,0,0,0.45);
            border: 1px solid #33516a;
            border-radius: 6px;
        }
        .oreCard .oreIcon {
            width: 32px;
            height: 32px;
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            border-radius: 4px;
            flex-shrink: 0;
        }
        .oreCard .oreInfo { display:flex; flex-direction:column; line-height:14px; }
        .oreCard .oreInfo .oreName { color:#fff; font-weight:bold; }
        .oreCard .oreInfo .oreCount { color:#9bd0ff; }

        .refRecipe {
            padding: 8px;
            border: 1px solid #33516a;
            background: rgba(0,0,0,0.4);
            border-radius: 6px;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .refRecipeHeader { display:flex; justify-content:space-between; align-items:center; }
        .refRecipeTitle { font-weight:bold; color:#fff; display:flex; gap:6px; align-items:center; }
        .refRecipeBody { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .refRecipeInputs { color:#a6d5ff; font-size:11px; }
        .refRecipe .refineInput { width:80px; }
        .refRecipe .statusOk { color:#6cff9b; }
        .refRecipe .statusKo { color:#ff8a7a; }

                .upgradePanel { display:flex; flex-direction:column; gap:10px; color:#d0eaff; }
        .upgradeTitle { font-weight:bold; color:#ffffff; }
        .upgradeHint { text-align:center; color:#a6d5ff; font-style:italic; }

        /* 4 colonnes comme Flash (Prometium..Xenomit / Prometid..Seprom / Lasers..Shields) */
        .upgradeRow{
          display:grid;
          grid-template-columns: repeat(4, 1fr);
          gap:8px;
          align-items:stretch;
        }

        /* Slots minerais (vertical) + icônes plus grandes */
        .upgradeSlot{
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:flex-start;
          gap:4px;
          padding:6px 4px;
          text-align:center;
          background: rgba(0,0,0,0.45);
          border:1px solid #33516a;
          border-radius:6px;
          min-width:0;
        }
        .upgradeSlot .oreIcon{
          width:52px;
          height:52px;
          border-radius:4px;
          background-repeat:no-repeat;
          background-position:center;
          background-size:46px 46px; /* même échelle que le refining tree */
        }
        .upgradeSlot .oreName{ color:#fff; font-weight:bold; font-size:11px; line-height:13px; }
        .upgradeSlot .oreCount{ color:#9bd0ff; font-size:11px; line-height:13px; }
        .upgradeSlot.draggable { cursor:pointer; }
.upgradeSlot.draggable:active { cursor:grabbing; }
        .upgradeSlot.disabled{ opacity:0.5; cursor:default; }

        .upgradeTargets{ gap:10px; }
        .upgradeTarget{
          width:100%;
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:6px;
          padding:8px 6px;
          border:1px solid #33516a;
          background: rgba(0,0,0,0.45);
          border-radius:6px;
        }
        .upgradeTarget .targetHeader{ display:flex; flex-direction:column; gap:4px; align-items:center; text-align:center; }
        .upgradeTarget .targetTitle{ color:#fff; font-weight:bold; font-size:11px; line-height:13px; }
        .upgradeTarget .targetIconWrap{
          position:relative;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          padding:2px;
          border-radius:6px;
        }
        .upgradeTarget .targetIconWrap.dropActive{
          box-shadow:0 0 8px rgba(108,255,155,0.5);
          background: rgba(10,20,30,0.5);
        }
        .upgradeTarget .targetIcon{
          width:52px;
          height:52px;
          background-repeat:no-repeat;
          background-position:center;
          background-size:46px 46px;
          border-radius:4px;
          box-shadow:0 0 0 1px #33516a;
        }
        .upgradeTarget .targetOreIcon{
          position:absolute;
          left:4px;
          bottom:4px;
          width:22px;
          height:22px;
          background-size:contain;
          background-repeat:no-repeat;
          background-position:center;
          border:1px solid #33516a;
          border-radius:3px;
          background-color: rgba(5,10,20,0.85);
          display:none;
        }
        .upgradeTarget .targetOreIcon.visible{ display:block; }
        .upgradeTarget .targetInfo{ font-size:11px; color:#9bd0ff; text-align:center; }


        /* Fenêtre Trade */
        #tradeWindow {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 620px;
            min-height: 320px;
            display: none;
            flex-direction: column;
            background: ${logoutWindowBg};
            background-size: 100% 100%;
            border: 1px solid #4a6b8c;
            box-shadow: 0 0 10px #000;
            z-index: 2200;
        }
        #tradeWindow .tradeHeader {
            height: 28px;
            background: ${logoutHeaderBg};
            background-repeat: repeat-x;
            background-size: auto 100%;
            border-bottom: 1px solid #4a6b8c;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 6px;
            color: #00aaff;
            font-weight: bold;
            font-size: 11px;
            cursor: move;
        }
        #tradeWindow .tradeHeaderLeft {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        #tradeWindow .tradeHeader .windowHeaderIcon {
            width: 20px;
            height: 20px;
            background-image: url('graphics/ui/window1/images/1_trade_icon.png.png');
            background-size: 90% 90%;
            background-position: center;
            background-repeat: no-repeat;
            border-radius: 4px;
            display: inline-flex;
        }

        #tradeWindow .tradeContent {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 12px;
            color: #ffffff;
            background: rgba(0,0,0,0.35);
        }
        #tradeOreGrid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            align-items: stretch;
        }
        .tradeOreCard {
            background: rgba(5,20,35,0.7);
            border: 1px solid #3c5f7c;
            border-radius: 6px;
            padding: 10px 8px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            box-shadow: 0 0 6px rgba(0,0,0,0.5);
            text-align: center;
        }
        .tradeOreHeader {
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: #a6dcf9;
        }
        .tradeOreIcon {
            width: 64px;
            height: 64px;
            margin: 0 auto;
            border-radius: 6px;
            background-size: contain;
            background-position: center;
            background-repeat: no-repeat;
            box-shadow: 0 0 8px #000;
        }
        .tradePriceDisplay {
            font-size: 12px;
            font-weight: bold;
            color: #fff3a8;
        }
        .tradeCardLabel {
            font-size: 11px;
            color: #d0eaff;
        }
        .tradeRow { display: flex; justify-content: space-between; font-size: 11px; color: #d0eaff; }
        .tradeStepper { display: flex; align-items: center; gap: 4px; }
        .tradeStepper button {
            width: 22px;
            height: 22px;
            background: rgba(0,0,0,0.35);
            border: 1px solid #4a6b8c;
            color: #fff;
            cursor: pointer;
            border-radius: 3px;
        }
        .tradeStepper button:disabled { opacity: 0.6; cursor: default; }
        .tradeStepper input {
            width: 60px;
            height: 22px;
            text-align: center;
            background: rgba(0,0,0,0.35);
            border: 1px solid #4a6b8c;
            color: #fff;
        }
        .tradeGain { font-size: 11px; color: #ffc25a; }


    `;
    document.head.appendChild(style);

    // Création de la barre HTML
    const dock = document.createElement('div');
    dock.id = 'mainMenuContainer';
    document.body.appendChild(dock);
}

// Liste des fenêtres gérées
const WINDOWS_CONFIG = {
    'user':  { title: 'User', w: 220, h: 130, icon: 'U' }, // U = User
    'ship':  { title: 'SHIP',        w: 260, h: 120, icon: 'S' }, // S = Ship
    'chat':  { title: 'CHAT',        w: 320, h: 220, icon: '@' }, // @ = Chat
    'group': { title: 'GROUP',       w: 160, h: 200, icon: 'G' }, // G = Group
    'log':   { title: 'LOG',         w: 280, h: 160, icon: 'L' }, // L = Log
    'quest': { title: 'MISSIONS',    w: 250, h: 300, icon: '!' }, // ! = Quests
    'booster': { title: 'BOOSTERS',  w: 110, h: 150, icon: 'B' }, // B = Booster
    'map':   { title: 'MINIMAP',     icon: 'M' }  // M = Minimap (cas spécial)
};

const WINDOW_ICON_PATHS = {
    user: UI_SPRITES.mainMenuIconShip || "graphics/ui/window1/images/11_player_icon.png.png",
    ship: "graphics/ui/window1/images/7_ship_icon.png.png",
    chat: UI_SPRITES.dockIconChat || UI_SPRITES.mainMenuIconChat,
    group: UI_SPRITES.dockIconGroup || UI_SPRITES.mainMenuIconGroup,
    log: UI_SPRITES.mainMenuIconLog,
    quest: UI_SPRITES.mainMenuIconQuest,
    booster: "graphics/ui/window1/images/23_booster_icon.png.png",
    map: UI_SPRITES.mainMenuIconMap
};

const BASIC_WINDOW_KEYS = new Set(["chat", "log", "ship", "user", "group", "booster"]);

const WINDOW_DEFAULT_POS = {
    ship:  { top: 80,  left: 70 },
    user:  { top: 200, left: 70 },
    group: { top: 80,  left: 280 },
    log:   { top: 360, left: 70 },
    chat:  { top: 540, left: 70 },
    quest: { top: 140, left: 520 },
    booster: { top: 10, left: 10 }
};

// État d'ouverture des fenêtres (pour sauvegarde)
let windowStates = {
    user: true, ship: true, chat: true, group: false, log: true, quest: false, map: true, booster: false
};

let boosterStatus = [];
let boosterAutoClosed = true;

function isBoosterActive() {
    return Array.isArray(boosterStatus) && boosterStatus.some((value) => Number(value) > 0);
}

function updateBoosterStatus(values) {
    boosterStatus = Array.isArray(values) ? values.map((value) => parseInt(value, 10) || 0) : [];
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
window.getBoosterStatus = () => boosterStatus.slice();

let logoutWindowElement = null;
let logoutTimerId = null;
let logoutCountdownValue = 0;
let logoutBreakByUser = false;
let tradeWindowElement = null;
let tradeOreCards = new Map();
const TRADE_ORE_CONFIG = [
    { type: 1,  key: 'prometium', label: 'PROMETIUM', color: '#f64c3c', icon: 'graphics/ui/ui/images/45_ore_1.png' },
    { type: 2,  key: 'endurium',  label: 'ENDURIUM',  color: '#3ba0ff', icon: 'graphics/ui/ui/images/41_ore_2.png' },
    { type: 3,  key: 'terbium',   label: 'TERBIUM',   color: '#ffd043', icon: 'graphics/ui/ui/images/40_ore_3.png' },
    { type: 11, key: 'prometid',  label: 'PROMETID',  color: '#ff8a3b', icon: 'graphics/ui/ui/images/44_ore_11.png' },
    { type: 12, key: 'duranium',  label: 'DURANIUM',  color: '#4aff8c', icon: 'graphics/ui/ui/images/43_ore_12.png' },
    { type: 13, key: 'promerium', label: 'PROMERIUM', color: '#d94aff', icon: 'graphics/ui/ui/images/42_ore_13.png' }
];

const REFINING_ORES = [
    { key: 'prometium', label: 'Prometium', icon: 'graphics/ui/refinement/images/11_ore_1.png' },
    { key: 'endurium',  label: 'Endurium',  icon: 'graphics/ui/refinement/images/6_ore_2.png' },
    { key: 'terbium',   label: 'Terbium',   icon: 'graphics/ui/refinement/images/5_ore_3.png' },
    { key: 'prometid',  label: 'Prometid',  icon: 'graphics/ui/refinement/images/10_ore_11.png' },
    { key: 'duranium',  label: 'Duranium',  icon: 'graphics/ui/refinement/images/9_ore_12.png' },
    { key: 'promerium', label: 'Promerium', icon: 'graphics/ui/refinement/images/8_ore_13.png' },
    { key: 'xenomit',   label: 'Xenomit',   icon: 'graphics/ui/refinement/images/4_ore_4.png' }
];


const REFINING_RECIPES = [
    { id: 11, key: 'prometid', label: 'Prometid', inputs: { prometium: 20, endurium: 10 } },
    { id: 12, key: 'duranium', label: 'Duranium', inputs: { terbium: 20, endurium: 10 } },
    { id: 13, key: 'promerium', label: 'Promerium', inputs: { prometid: 10, duranium: 10, xenomit: 1 } }
];

const REFINING_RECIPES_BY_KEY = new Map(REFINING_RECIPES.map((r) => [r.key, r]));

const REFINING_TOOLTIPS = {
    prometium: 'Prometium is the red raw material which can be collected in outer space.',
    endurium: 'Endurium is the blue raw material which can be collected in outer space.',
    terbium: 'Terbium is the gold raw material which can be collected in outer space.',
    xenomit: 'You need Xenomit to produce Promerium.',
    prometid: '5% increase in firepower',
    duranium: 'Speed +15 / Shield +15%',
    promerium: 'Firepower +10% / Speed +30 / Shield +30%',
    seprom: 'Firepower +60% / Shield generator performance +40%'
};

const REFINING_EFFECTS = {
    prometid: '5% increase in firepower',
    duranium: 'Speed +15 / Shield +15%',
    promerium: 'Firepower +10% / Speed +30 / Shield +30%'
};

const UPGRADE_RAW_ORES = [
    { key: 'prometium', label: 'Prometium', icon: 'graphics/ui/refinement/images/11_ore_1.png' },
    { key: 'endurium',  label: 'Endurium',  icon: 'graphics/ui/refinement/images/6_ore_2.png' },
    { key: 'terbium',   label: 'Terbium',   icon: 'graphics/ui/refinement/images/5_ore_3.png' },
    { key: 'xenomit',   label: 'Xenomit',   icon: 'graphics/ui/refinement/images/4_ore_4.png' }
];

const UPGRADE_REFINED_ORES = [
    { key: 'prometid',  label: 'Prometid',  icon: 'graphics/ui/refinement/images/10_ore_11.png', allowedTargets: ['LASER', 'ROCKET'] },
    { key: 'duranium',  label: 'Duranium',  icon: 'graphics/ui/refinement/images/9_ore_12.png',  allowedTargets: ['DRIVING', 'SHIELD'] },
    { key: 'promerium', label: 'Promerium', icon: 'graphics/ui/refinement/images/8_ore_13.png',  allowedTargets: ['LASER', 'ROCKET', 'DRIVING', 'SHIELD'] },
    { key: 'seprom',    label: 'Seprom',    icon: 'graphics/ui/refinement/images/13_ore_14.png', allowedTargets: ['LASER', 'SHIELD'] }
];

const UPGRADE_TARGETS = [
    { id: 'LASER',     label: 'Lasers',     icon: 'graphics/ui/refinement/images/17_item_1.png', amountKey: 'rounds' },
    { id: 'ROCKET',    label: 'Rockets',    icon: 'graphics/ui/refinement/images/16_item_2.png', amountKey: 'units' },
    { id: 'DRIVING',   label: 'Generators', icon: 'graphics/ui/refinement/images/15_item_3.png', amountKey: 'min.' },
    { id: 'SHIELD',    label: 'Shields',    icon: 'graphics/ui/refinement/images/14_item_4.png', amountKey: 'min.' }
];

const UPGRADE_DRAG_ICONS = {
    seprom: 'graphics/ui/refinement/images/18_icon_14.png',
    promerium: 'graphics/ui/refinement/images/19_icon_13.png',
    duranium: 'graphics/ui/refinement/images/20_icon_12.png',
    prometid: 'graphics/ui/refinement/images/21_icon_11.png'
};

let refiningWindowElement = null;
let refiningActiveTab = 'refine';
let refiningLastCargoSig = '';
let refiningUpgradeCards = new Map();
let refiningRecipeControls = new Map();
let currentUpgradeDrag = null;
const refiningFallbackIcon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='0' y1='0' y2='1'%3E%3Cstop offset='0' stop-color='%230f2a3d'/%3E%3Cstop offset='1' stop-color='%23163144'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='48' height='48' rx='8' ry='8' fill='url(%23g)'/%3E%3Cpath d='M16 34l6-14 6 14m-12 0h12M21 22h6' stroke='%23a6d5ff' stroke-width='3' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3Ccircle cx='24' cy='14' r='4' fill='%23cde8ff'/%3E%3C/svg%3E";
const refiningIconCandidates = [
    'graphics/ui/window1/images/9_refinement_icon.png.png',
    refiningFallbackIcon
];

function getOreCargoSnapshot() {
    return { ...(window.oreCargo || {}) };
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

const REFINE_AMOUNTS = [1, 5, 10, 50, 100, 500, 1000];

function formatOreName(oreKey) {
    const ore =
        REFINING_ORES.find(o => o.key === oreKey) ||
        UPGRADE_REFINED_ORES.find(o => o.key === oreKey) ||
        UPGRADE_RAW_ORES.find(o => o.key === oreKey);
    return ore ? ore.label : oreKey;
}

function getRefiningRecipe(key) {
    return REFINING_RECIPES_BY_KEY.get(key) || null;
}

function buildRecipeTooltip(recipe) {
    if (!recipe) return null;
    const parts = [];
    const entries = Object.entries(recipe.inputs);
    const firstTwo = entries.slice(0, 2);
    if (firstTwo.length === 2) {
        const [k1, c1] = firstTwo[0];
        const [k2, c2] = firstTwo[1];
        parts.push(`${c1} ${formatOreName(k1)} + ${c2} ${formatOreName(k2)} + 100.000c = 1 unit`);
    }
    if (entries.length === 3) {
        const [k3, c3] = entries[2];
        parts.push(`${c3} ${formatOreName(k3)} + 1.000u required per unit`);
    }
    if (REFINING_EFFECTS[recipe.key]) {
        parts.push(REFINING_EFFECTS[recipe.key]);
    }
    return parts.join('\n');
}

function getOreTooltip(key, recipe) {
    const info = REFINING_TOOLTIPS[key] || '';
    const recipeTip = buildRecipeTooltip(recipe);
    if (info && recipeTip) return `${info}\n${recipeTip}`;
    return info || recipeTip || '';
}

function showOreTooltip(e, oreKey, recipe) {
    if (typeof initActionDrawerTooltips === 'function') {
        initActionDrawerTooltips();
    }
    const tt = document.getElementById('adTooltip');
    if (!tt) return;

    tt.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'ttHeader';
    header.textContent = formatOreName(oreKey);
    tt.appendChild(header);

    const text = getOreTooltip(oreKey, recipe);
    if (text) {
        const body = document.createElement('div');
        body.className = 'ttBody';
        const lines = text.split('\n');
        lines.forEach((line, idx) => {
            if (idx > 0) body.appendChild(document.createElement('br'));
            body.appendChild(document.createTextNode(line));
        });
        tt.appendChild(body);
    }

    tt.style.display = 'block';
    if (typeof moveActionTooltip === 'function') {
        moveActionTooltip(e);
    }
}

function attachOreTooltip(element, oreKey, recipe) {
    if (!element) return;
    element.addEventListener('mouseenter', (evt) => showOreTooltip(evt, oreKey, recipe));
    element.addEventListener('mousemove', (evt) => {
        if (typeof moveActionTooltip === 'function') moveActionTooltip(evt);
    });
    element.addEventListener('mouseleave', () => {
        if (typeof hideActionTooltip === 'function') hideActionTooltip();
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
    const overlay = document.createElement('div');
    overlay.id = 'refinePromptOverlay';

    const card = document.createElement('div');
    card.id = 'refinePrompt';

    const title = document.createElement('h4');
    title.textContent = recipe.label;
    card.appendChild(title);

    const question = document.createElement('p');
    question.textContent = 'How much do you want to produce?';
    card.appendChild(question);

    const select = document.createElement('select');
    const amounts = [];
    REFINE_AMOUNTS.forEach(a => { if (a < maxAmount) amounts.push(a); });
    amounts.push(maxAmount);
    const unique = Array.from(new Set(amounts.filter(a => a > 0)));
    unique.forEach(val => {
        const opt = document.createElement('option');
        opt.value = String(val);
        opt.textContent = val;
        select.appendChild(opt);
    });
    select.value = String(maxAmount);
    card.appendChild(select);

    const actions = document.createElement('div');
    actions.className = 'refinePromptActions';

    const refineBtn = document.createElement('button');
    refineBtn.textContent = 'Refine';
    refineBtn.addEventListener('click', () => {
        const val = parseInt(select.value, 10);
        if (typeof sendProduce === 'function' && val > 0) {
            sendProduce(recipe.id, val);
        }
        closeRefinePrompt();
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', closeRefinePrompt);

    actions.appendChild(refineBtn);
    actions.appendChild(cancelBtn);
    card.appendChild(actions);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeRefinePrompt();
    });

    overlay.appendChild(card);
    document.body.appendChild(overlay);
    refinePromptOverlay = overlay;
}

function formatOreCount(n) {
    return (n || 0).toLocaleString('en-US');
}

function buildOreCard(ore, cargo) {
    const card = document.createElement('div');
    card.className = 'oreCard';

    const icon = document.createElement('div');
    icon.className = 'oreIcon';
    if (ore.icon) {
        icon.style.backgroundImage = `url('${ore.icon}')`;
    } else {
        icon.style.background = 'linear-gradient(135deg, #25384f, #1a2635)';
        icon.style.border = '1px solid #4a6b8c';
    }

    const info = document.createElement('div');
    info.className = 'oreInfo';
    const name = document.createElement('div');
    name.className = 'oreName';
    name.textContent = ore.label;
    const count = document.createElement('div');
    count.className = 'oreCount';
    const value = cargo[ore.key] || 0;
    count.textContent = `${formatOreCount(value)}`;
    info.appendChild(name);
    info.appendChild(count);

    card.appendChild(icon);
    card.appendChild(info);
    return card;
}

function applyIconFallback(el, candidates) {
    if (!el) return;
    const paths = Array.isArray(candidates) ? candidates : [candidates];
    const trySet = (idx) => {
        if (idx >= paths.length) return;
        const img = new Image();
        img.onload = () => {
            el.style.backgroundImage = `url('${paths[idx]}')`;
        };
        img.onerror = () => trySet(idx + 1);
        img.src = paths[idx];
    };
    trySet(0);
}

function renderRefiningTab(container) {
    const cargo = getOreCargoSnapshot();
    container.innerHTML = '';

    // POSITIONS CORRIGÉES (Style Flash : Haut -> Bas)
    const POS = {
        // Rang 1 (Haut)
        "prometium": { x: 30,  y: 10 },
        "endurium":  { x: 140, y: 10 },
        "terbium":   { x: 250, y: 10 },
        // Rang 2 (Milieu)
        "prometid":  { x: 85,  y: 115 },
        "duranium":  { x: 195, y: 115 },
        "xenomit":   { x: 300, y: 115 }, // À droite du rang 2
        // Rang 3 (Bas)
        "promerium": { x: 140, y: 255 }
    };

    // Connexions de haut en bas
    const connections = [
        ["prometium", "prometid"], ["endurium", "prometid"],
        ["endurium", "duranium"], ["terbium", "duranium"],
        ["prometid", "promerium"], ["duranium", "promerium"],
        ["xenomit", "promerium"]
    ];

    const wrap = document.createElement('div');
    wrap.className = 'refiningTreeWrap';

    const tree = document.createElement('div');
    tree.className = 'refiningTree';
    wrap.appendChild(tree);

    // Dessin des traits SVG
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "refiningTreeLines");
    svg.style.width = "100%";
    svg.style.height = "100%";
    tree.appendChild(svg);

    connections.forEach(conn => {
    const start = POS[conn[0]];
    const end = POS[conn[1]];
    if (start && end) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

        // Valeurs par défaut (centre -> centre)
        let x1 = start.x + 42, y1 = start.y + 40;
        let x2 = end.x + 42,   y2 = end.y + 40;

        // Exception Flash-like : Xenomit -> Promerium
if (conn[0] === "xenomit" && conn[1] === "promerium") {
    // Départ : bas-centre de la box (zone du nombre)
    y1 = start.y + 85;

    // Arrivée : milieu-droite de l'image Promerium (descendu)
    x2 = end.x + 65;
    y2 = end.y + 65;  
}


        line.setAttribute("x1", x1); line.setAttribute("y1", y1);
        line.setAttribute("x2", x2); line.setAttribute("y2", y2);

        line.setAttribute("stroke", "rgba(166, 213, 255, 0.2)");
        line.setAttribute("stroke-width", "2");
        svg.appendChild(line);
    }
});
    
    Object.keys(POS).forEach(key => {
        const ore = REFINING_ORES.find(o => o.key === key);
        const p = POS[key];
        const recipe = getRefiningRecipe(key);

        const node = document.createElement('div');
        node.className = 'refNode';
        node.style.left = p.x + 'px';
        node.style.top = p.y + 'px';

        node.innerHTML = `
            <div class="refNodeTitle">${ore.label}</div>
            <div class="refNodeBox">
                <div class="refNodeIcon" style="background-image: url('${ore.icon}')"></div>
                <div class="refNodeCount">${formatOreCount(cargo[key] || 0)}</div>
            </div>
        `;

        if (recipe) {
            const btn = document.createElement('button');
            btn.className = 'refNodeBtn';
            btn.textContent = 'Refine';
            const maxCraft = computeRecipeMax(recipe, cargo);
            btn.disabled = maxCraft <= 0;
            btn.onclick = () => openRefinePrompt(recipe, computeRecipeMax(recipe, getOreCargoSnapshot()));
            node.appendChild(btn);
        }

        const iconBox = node.querySelector('.refNodeBox');
        attachOreTooltip(iconBox, key, recipe);
        tree.appendChild(node);
    });

    container.appendChild(wrap);
}


function getUpgradeState(id) {
    return refiningUpgradeCards.get(id) || {};
}

function setUpgradeState(id, data) {
    const prev = refiningUpgradeCards.get(id) || {};
    const merged = { ...prev, ...data };
    const amount = Math.max(0, parseInt(merged.amount, 10) || 0);
    const oreKey = merged.oreKey || null;

    if (!oreKey || amount <= 0) {
        refiningUpgradeCards.delete(id);
        return;
    }

    refiningUpgradeCards.set(id, { oreKey, amount });
}

function getUpgradeOreDef(key) {
    return UPGRADE_REFINED_ORES.find((o) => o.key === key);
}

function getUpgradeTargetDef(id) {
    return UPGRADE_TARGETS.find((t) => t.id === id);
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
    switch (def.amountKey) {
        case 'rounds': return `${val} rounds`;
        case 'units':  return `${val} units`;
        case 'min.':   return `${val} min.`;
        default: return `${val}`;
    }
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
    REFINE_AMOUNTS.forEach((v) => { if (v < maxAmount) opts.push(v); });
    opts.push(maxAmount);
    return Array.from(new Set(opts.filter((v) => v > 0)));
}

function openUpgradeAmountPrompt(targetId, oreKey, maxAmount, previousAmount = 0) {
    closeUpgradePrompt();
    if (maxAmount <= 0) {
        addInfoMessage('Not enough ore in cargo.');
        return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'refinePromptOverlay';

    const card = document.createElement('div');
    card.id = 'refinePrompt';

    const title = document.createElement('h4');
    const targetDef = getUpgradeTargetDef(targetId);
    title.textContent = `Upgrade ${targetDef ? targetDef.label : targetId}`;
    card.appendChild(title);

    const question = document.createElement('p');
    question.textContent = `How much ${oreKey.toUpperCase()} do you want to apply?`;
    card.appendChild(question);

    const select = document.createElement('select');
    buildAmountOptions(maxAmount).forEach((val) => {
        const opt = document.createElement('option');
        opt.value = String(val);
        opt.textContent = val;
        select.appendChild(opt);
    });
    const safeDefault = previousAmount > 0 ? Math.min(previousAmount, maxAmount) : maxAmount;
    select.value = String(safeDefault);
    card.appendChild(select);

    const actions = document.createElement('div');
    actions.className = 'refinePromptActions';

    const applyBtn = document.createElement('button');
    applyBtn.textContent = 'Upgrade';
    applyBtn.addEventListener('click', () => {
        const val = parseInt(select.value, 10);
        if (isNaN(val) || val <= 0) return;
        setUpgradeState(targetId, { oreKey, amount: val });
        if (typeof sendRefiningUpgrade === 'function') {
            sendRefiningUpgrade(targetId, oreKey, val);
        }
        closeUpgradePrompt();
        const page = refiningWindowElement?.querySelector('.refPage[data-tab=\"upgrade\"]');
        if (page) renderUpgradeTab(page);
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', closeUpgradePrompt);

    actions.appendChild(applyBtn);
    actions.appendChild(cancelBtn);
    card.appendChild(actions);

    overlay.appendChild(card);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeUpgradePrompt();
    });

    document.body.appendChild(overlay);
    upgradePromptOverlay = overlay;
}

function openUpgradeReplacePrompt(onConfirm) {
    closeUpgradePrompt();
    const overlay = document.createElement('div');
    overlay.id = 'refinePromptOverlay';

    const card = document.createElement('div');
    card.id = 'refinePrompt';

    const question = document.createElement('p');
    question.textContent = 'Replace the current ore on this item?';
    card.appendChild(question);

    const actions = document.createElement('div');
    actions.className = 'refinePromptActions';

    const okBtn = document.createElement('button');
    okBtn.textContent = 'Update';
    okBtn.addEventListener('click', () => {
        closeUpgradePrompt();
        onConfirm();
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', closeUpgradePrompt);

    actions.appendChild(okBtn);
    actions.appendChild(cancelBtn);
    card.appendChild(actions);

    overlay.appendChild(card);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeUpgradePrompt();
    });

    document.body.appendChild(overlay);
    upgradePromptOverlay = overlay;
}

function buildUpgradeOreSlot(ore, cargo) {
    const slot = document.createElement('div');
    slot.className = 'upgradeSlot' + ((cargo > 0 && ore.allowedTargets) ? ' draggable' : '');
    const recipe = getRefiningRecipe(ore.key);

    // Titre en haut (comme Flash)
    const name = document.createElement('div');
    name.className = 'oreName';
    name.textContent = ore.label;
    slot.appendChild(name);

    // Icône au centre (plus grande)
    const icon = document.createElement('div');
    icon.className = 'oreIcon';
    if (ore.icon) icon.style.backgroundImage = `url('${ore.icon}')`;
    slot.appendChild(icon);
    attachOreTooltip(icon, ore.key, recipe);

    // Quantité en bas
    const count = document.createElement('div');
    count.className = 'oreCount';
    count.textContent = `${formatOreCount(cargo)} in cargo`;
    slot.appendChild(count);

    // Drag & drop inchangé
    if (ore.allowedTargets) {
        slot.draggable = cargo > 0;
        if (cargo <= 0) slot.classList.add('disabled');

        let dragImg = null;
        slot.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/upgrade-ore', ore.key);
            if (!dragImg && UPGRADE_DRAG_ICONS[ore.key]) {
                dragImg = new Image();
                dragImg.src = UPGRADE_DRAG_ICONS[ore.key];
            }
            if (dragImg) {
                e.dataTransfer.setDragImage(dragImg, dragImg.width / 2, dragImg.height / 2);
            }
            currentUpgradeDrag = ore.key;
        });

        slot.addEventListener('dragend', () => {
            currentUpgradeDrag = null;
        });
    }

    return slot;
}


function formatTargetStatus(targetId, state) {
    const amount = Math.max(0, state?.amount || 0);
    const oreKey = amount > 0 ? state?.oreKey : null;
    if (!oreKey) return formatUpgradeAmount(targetId, 0);
    return `${oreKey.toUpperCase()}: ${formatUpgradeAmount(targetId, amount)}`;
}

function handleUpgradeDrop(target, oreKey, cargo, state) {
    const oreDef = getUpgradeOreDef(oreKey);
    if (!oreDef) return;
    if (!canOreUpgradeTarget(oreKey, target.id)) {
        addInfoMessage('This ore cannot be applied to that item.');
        return;
    }
    const available = cargo[oreKey] || 0;
    if (available <= 0) {
        addInfoMessage('Not enough ore in cargo.');
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
    const card = document.createElement('div');
    card.className = 'upgradeTarget';

    const header = document.createElement('div');
    header.className = 'targetHeader';
    const title = document.createElement('div');
    title.className = 'targetTitle';
    title.textContent = target.label;
    const iconWrap = document.createElement('div');
    iconWrap.className = 'targetIconWrap';
    const icon = document.createElement('div');
    icon.className = 'targetIcon';
    icon.style.backgroundImage = `url('${target.icon}')`;
    const oreBadge = document.createElement('div');
    oreBadge.className = 'targetOreIcon';
    const hasOre = state?.oreKey && (state.amount || 0) > 0;
    if (hasOre) {
        const oreDef = getUpgradeOreDef(state.oreKey);
        if (oreDef?.icon) oreBadge.style.backgroundImage = `url('${oreDef.icon}')`;
        oreBadge.title = oreDef ? oreDef.label : state.oreKey.toUpperCase();
        oreBadge.classList.add('visible');
    }
    header.appendChild(title);
    iconWrap.appendChild(icon);
    iconWrap.appendChild(oreBadge);
    header.appendChild(iconWrap);
    card.appendChild(header);

    const dragKeyFromEvent = (e) => e.dataTransfer?.getData('text/upgrade-ore') || currentUpgradeDrag;
    const setDropState = (active) => iconWrap.classList.toggle('dropActive', !!active);
    const canAccept = (key) => key && canOreUpgradeTarget(key, target.id);

    card.addEventListener('dragover', (e) => {
        const dragKey = dragKeyFromEvent(e);
        if (canAccept(dragKey)) {
            e.preventDefault();
            setDropState(true);
        }
    });
    card.addEventListener('dragenter', (e) => {
        const dragKey = dragKeyFromEvent(e);
        if (canAccept(dragKey)) {
            e.preventDefault();
            setDropState(true);
        }
    });
    card.addEventListener('dragleave', (e) => {
        if (!card.contains(e.relatedTarget)) {
            setDropState(false);
        }
    });
    card.addEventListener('drop', (e) => {
        e.preventDefault();
        setDropState(false);
        const oreKey = dragKeyFromEvent(e);
        handleUpgradeDrop(target, oreKey, cargo, state);
    });

    const status = document.createElement('div');
    status.className = 'targetInfo';
    status.textContent = formatTargetStatus(target.id, state);
    card.appendChild(status);

    return card;
}

function renderUpgradeTab(container) {
    const cargo = getOreCargoSnapshot();
    container.innerHTML = '';

    const panel = document.createElement('div');
    panel.className = 'upgradePanel';

    const title = document.createElement('div');
    title.className = 'upgradeTitle';
    title.textContent = 'Raw materials/Resources:';
    panel.appendChild(title);

    const rawRow = document.createElement('div');
    rawRow.className = 'upgradeRow';
    UPGRADE_RAW_ORES.forEach((ore) => {
        rawRow.appendChild(buildUpgradeOreSlot(ore, cargo[ore.key] || 0));
    });
    panel.appendChild(rawRow);

    const hint = document.createElement('div');
    hint.className = 'upgradeHint';
    hint.textContent = "Drag 'n drop your refined ore onto the item icon you want to upgrade.";
    panel.appendChild(hint);

    const refinedRow = document.createElement('div');
    refinedRow.className = 'upgradeRow';
    UPGRADE_REFINED_ORES.forEach((ore) => {
        refinedRow.appendChild(buildUpgradeOreSlot(ore, cargo[ore.key] || 0));
    });
    panel.appendChild(refinedRow);

    const targetsRow = document.createElement('div');
    targetsRow.className = 'upgradeRow upgradeTargets';
    UPGRADE_TARGETS.forEach((target) => {
        targetsRow.appendChild(buildUpgradeTarget(target, cargo));
    });
    panel.appendChild(targetsRow);

    container.appendChild(panel);
}

function ensureRefiningWindow() {
    if (refiningWindowElement) return refiningWindowElement;

    const win = document.createElement('div');
    win.id = 'refiningWindow';
    win.className = 'gameWindow logoutWindow basicWindow';
    win.style.display = 'none';
    win.innerHTML = `
        <div class="refiningHeader">
            <div class="left">
                <span class="windowHeaderIcon"></span>
                <span class="refiningTitle">Refining</span>
            </div>
        </div>
        <div class="refiningTabs">
            <button class="refTab active" data-tab="refine">Refining</button>
            <button class="refTab" data-tab="upgrade">Upgrade</button>
        </div>
        <div class="refiningBody">
            <div class="refPage active" data-tab="refine"></div>
            <div class="refPage" data-tab="upgrade"></div>
        </div>
    `;

    document.body.appendChild(win);
    refiningWindowElement = win;

    const header = win.querySelector('.refiningHeader');
    if (header && typeof makeElementDraggable === 'function') {
        makeElementDraggable(win, header);
    }
    const headerIcon = win.querySelector('.refiningHeader .windowHeaderIcon');
    if (headerIcon) {
        headerIcon.title = 'Close';
        applyIconFallback(headerIcon, refiningIconCandidates);
        headerIcon.addEventListener('mousedown', (e) => e.stopPropagation());
        headerIcon.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeRefiningWindow();
        });
    }

    win.querySelectorAll('.refTab').forEach((btn) => {
        btn.addEventListener('click', () => {
            setRefiningTab(btn.getAttribute('data-tab'));
        });
    });

    refreshRefiningWindow(true);
    return win;
}

function setRefiningTab(tab) {
    refiningActiveTab = tab;
    if (!refiningWindowElement) return;
    refiningWindowElement.querySelectorAll('.refTab').forEach((btn) => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
    });
    refiningWindowElement.querySelectorAll('.refPage').forEach((page) => {
        page.classList.toggle('active', page.getAttribute('data-tab') === tab);
    });
    if (tab === 'refine') {
        const page = refiningWindowElement.querySelector('.refPage[data-tab="refine"]');
        if (page) renderRefiningTab(page);
    } else {
        const page = refiningWindowElement.querySelector('.refPage[data-tab="upgrade"]');
        if (page) renderUpgradeTab(page);
    }
}

function refreshRefiningWindow(force = false) {
    const sig = JSON.stringify(getOreCargoSnapshot());
    if (!force && sig === refiningLastCargoSig) return;
    refiningLastCargoSig = sig;
    if (!refiningWindowElement || refiningWindowElement.style.display === 'none') return;
    setRefiningTab(refiningActiveTab);
}

function openRefiningWindow() {
    const win = ensureRefiningWindow();
    if (!win) return;
    win.style.display = 'flex';
    win.style.zIndex = 2200;
    refreshRefiningWindow(true);
}

function closeRefiningWindow() {
    if (refiningWindowElement) {
        refiningWindowElement.style.display = 'none';
        closeRefinePrompt();
        closeUpgradePrompt();
    }
}

setInterval(() => {
    try {
        refreshRefiningWindow(false);
    } catch (e) {
        // Sécurité silencieuse : ne rien casser si le contexte n'est pas prêt
    }
}, 1000);

function initRefiningButton() {
    if (document.getElementById('refiningButton')) return;
    const btn = document.createElement('div');
    btn.id = 'refiningButton';
    btn.title = 'Refining';
    btn.textContent = '';
    applyIconFallback(btn, refiningIconCandidates);
    btn.addEventListener('click', () => {
        openRefiningWindow();
    });
    document.body.appendChild(btn);
}

function createGameWindows() {
    const dock = document.getElementById('mainMenuContainer');
    if (!dock) return;

    for (const [key, cfg] of Object.entries(WINDOWS_CONFIG)) {
        // 1. Créer l'icône
        const icon = document.createElement('div');
        icon.className = 'mainMenuIcon';
        const iconPath = WINDOW_ICON_PATHS[key];
        if (iconPath) {
            icon.style.backgroundImage = `url('${iconPath}')`;
            icon.textContent = '';
        } else {
            icon.textContent = cfg.icon;
        }
        icon.id = 'icon_' + key;
        icon.title = cfg.title;
        icon.addEventListener('click', () => toggleWindow(key));
        dock.appendChild(icon);

        // 2. Créer la fenêtre (SAUF pour la Minimap qui est un dessin Canvas)
        if (key === 'log') {
            initGameLogWindow();
        } else if (key !== 'map' && key !== 'quest' && key !== 'group') {
            createGenericWindow(key, cfg);
        }
    }
    refreshWindowsVisibility();
}

function createGenericWindow(key, cfg) {
    const div = document.createElement('div');
    div.id = 'win_' + key;

    const isBasic = BASIC_WINDOW_KEYS.has(key); // user / ship / chat / group
    div.className = isBasic ? 'gameWindow basicWindow' : 'gameWindow';

    // Thème spécial pour le chat si tu veux garder ça
    if (!isBasic && key === 'chat') {
        div.classList.add('chatTheme');
    }

    // Taille de la fenêtre
    if (cfg.w) div.style.width  = cfg.w + 'px';
    if (cfg.h) div.style.height = cfg.h + 'px';

    // Position par défaut (équivalent des valeurs dans FULL_MERGE_AS)
    const pos = WINDOW_DEFAULT_POS[key] || {};
    div.style.top  = (pos.top  != null ? pos.top  : 100) + 'px';
    div.style.left = (pos.left != null ? pos.left : 100) + 'px';

    // ---------- Contenu HTML ----------
    if (isBasic) {
        // Fenêtres "simples" style user / ship / group
        const showBasicButtons = (key !== 'chat' && key !== 'user' && key !== 'ship' && key !== 'booster');
        div.innerHTML = `
            <div class="basicHeader" id="head_${key}">
                <span class="gwTitle">${cfg.title}</span>
                <div class="gwButtons">${showBasicButtons ? `
                    <span class="basicBtn collapseBtn">-</span>
                    <span class="basicBtn closeBtn">x</span>
                ` : ''}</div>
            </div>
            <div class="basicContent" id="content_${key}"></div>
        `;
    } else {
        // Fenêtre avec chrome complet (utilisé pour chat si tu le souhaites)
        div.innerHTML = `
            <div class="windowChrome">
                <div class="winCorner tl"></div>
                <div class="winCorner tr"></div>
                <div class="winCorner bl"></div>
                <div class="winCorner br"></div>
                <div class="winEdge top"></div>
                <div class="winEdge bottom"></div>
                <div class="winEdge left"></div>
                <div class="winEdge right"></div>
            </div>
            <div class="windowInterior">
                <div class="gwHeader" id="head_${key}">
                    <span class="gwTitle">${cfg.title}</span>
                    <div class="gwButtons">
                        <span class="gwBtn collapseBtn"></span>
                        <span class="gwBtn closeBtn"></span>
                    </div>
                </div>
                <div class="gwContent" id="content_${key}"></div>
            </div>
        `;
    }

    document.body.appendChild(div);

    const content = div.querySelector('.gwContent') || div.querySelector('.basicContent');

    // ---------- Icône dans le header (comme dans le main.swf) ----------
    const header = div.querySelector('.gwHeader') || div.querySelector('.basicHeader');
    if (header && BASIC_WINDOW_KEYS.has(key)) {
        const headerIcon = document.createElement('div');
        headerIcon.className = 'windowHeaderIcon';
        headerIcon.id = 'header_icon_' + key;

        const iconPath = WINDOW_ICON_PATHS[key];
        if (iconPath) {
            headerIcon.style.backgroundImage = `url('${iconPath}')`;
        } else if (cfg.icon) {
            // Fallback : caractère si jamais aucune image n’est définie
            headerIcon.textContent = cfg.icon;
        }

        // Clic sur l’icône = replie la fenêtre dans la colonne de gauche
        headerIcon.addEventListener('click', () => {
            toggleWindow(key, false);
        });

        // On insère l’icône tout à gauche, avant le titre
        header.insertBefore(headerIcon, header.firstChild);
    }

    // ---------- Bouton fermeture (X) ----------
    const closeBtn = div.querySelector('.closeBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            toggleWindow(key, false);
        });
    }

    // ---------- Bouton réduire / étendre (-) ----------
    const collapseBtn = div.querySelector('.collapseBtn');
    if (collapseBtn && content) {
        collapseBtn.addEventListener('click', () => {
            const collapsed = content.dataset.collapsed === '1';
            content.dataset.collapsed = collapsed ? '0' : '1';
            content.style.display = collapsed ? 'block' : 'none';
        });
    }

    // ---------- Drag & drop ----------
    const dragHandle = div.querySelector('.gwHeader') || div.querySelector('.basicHeader');
    if (dragHandle) {
        makeElementDraggable(div, dragHandle);
    }

    if (key === 'chat') {
        attachChatResizer(div);
    }
}


function toggleWindow(key, forceState) {
    // Si forceState est défini, on l'utilise, sinon on inverse l'état actuel
    const newState = (forceState !== undefined) ? forceState : !windowStates[key];
    windowStates[key] = newState;
    refreshWindowsVisibility();
    saveInterfaceLayout();
}

function refreshWindowsVisibility() {
    for (const key in windowStates) {
        const isOpen = !!windowStates[key];
        const hasBooster = key !== "booster" || isBoosterActive();

        // Icône de la colonne de gauche
        const iconEl = document.getElementById('icon_' + key);

        // Id HTML de la fenêtre correspondante
        let winId = 'win_' + key;
        if (key === 'quest') winId = 'questWindow';
        if (key === 'log')   winId = 'gameLogWindow';

        const winEl = document.getElementById(winId);
        const headerIcon = winEl ? winEl.querySelector('.windowHeaderIcon') : null;

        // --- Colonne de gauche (équivalent leftDynamicSlot du main.swf) ---
        if (iconEl) {
            if (!hasBooster) {
                iconEl.style.display = 'none';
                iconEl.classList.remove('active');
            } else {
                // Fenêtre ouverte -> icône masquée, fenêtre fermée -> icône visible (minimap comprise)
                iconEl.style.display = isOpen ? 'none' : 'flex';
                iconEl.classList.toggle('active', !isOpen);
            }
        }

        // --- Fenêtre elle-même ---
        if (winEl) {
            if (!hasBooster) {
                winEl.style.display = 'none';
            } else {
                winEl.style.display = isOpen ? 'flex' : 'none';
            }
        }

        // --- Icône dans le header : visible seulement quand la fenêtre est ouverte ---
        if (headerIcon) {
            if (!hasBooster) {
                headerIcon.style.display = 'none';
            } else {
                headerIcon.style.display = isOpen ? 'inline-flex' : 'none';
            }
        }

        // Cas spécial minimap (pour le dessin dans le canvas)
        if (key === 'map') {
            window.showMinimap = isOpen;
            minimapPositionDirty = true;
        }
    }
}


// Utilitaire pour rendre n'importe quelle div déplaçable
function makeElementDraggable(elmnt, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
        // Met la fenêtre au premier plan
        document.querySelectorAll('.gameWindow').forEach(w => w.style.zIndex = 1000);
        elmnt.style.zIndex = 1001;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// Poignée de redimensionnement spécifique à la fenêtre de chat
function attachChatResizer(winEl) {
    const resizer = document.createElement('div');
    resizer.className = 'chatResizer';
    winEl.appendChild(resizer);

    const minWidth = 260;
    const minHeight = 160;
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;

    const onMouseMove = (e) => {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const newWidth = Math.max(minWidth, startWidth + deltaX);
        const newHeight = Math.max(minHeight, startHeight + deltaY);
        winEl.style.width = `${newWidth}px`;
        winEl.style.height = `${newHeight}px`;
    };

    const stopResize = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', stopResize);
    };

    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startX = e.clientX;
        startY = e.clientY;
        startWidth = winEl.offsetWidth;
        startHeight = winEl.offsetHeight;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', stopResize);
    });
}


function getTradePricesMap() {
    if (typeof labPrices !== 'undefined') return labPrices;
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

function buildTradeCard(def) {
    const card = document.createElement('div');
    card.className = 'tradeOreCard';

    const priceDisplay = document.createElement('div');
    priceDisplay.className = 'tradePriceDisplay tradePrice';
    priceDisplay.textContent = '--';

    const icon = document.createElement('div');
    icon.className = 'tradeOreIcon';
    icon.style.backgroundImage = `url('${def.icon}')`;

    const stockRow = document.createElement('div');
    stockRow.className = 'tradeRow';
    stockRow.innerHTML = `<span class=\"tradeCardLabel\">In cargo</span><span class=\"tradeStock\">0</span>`;

    const remainRow = document.createElement('div');
    remainRow.className = 'tradeRow';
    remainRow.innerHTML = `<span class=\"tradeCardLabel\">After sale</span><span class=\"tradeRemain\">0</span>`;

    const stepper = document.createElement('div');
    stepper.className = 'tradeStepper';
    const decBtn = document.createElement('button');
    decBtn.textContent = '-';
    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.min = '0';
    qtyInput.value = '0';
    const incBtn = document.createElement('button');
    incBtn.textContent = '+';
    stepper.appendChild(decBtn);
    stepper.appendChild(qtyInput);
    stepper.appendChild(incBtn);

    const gain = document.createElement('div');
    gain.className = 'tradeGain';
    gain.textContent = '0 C.';

    const sellBtn = document.createElement('button');
    sellBtn.className = 'doClassicButton';
    sellBtn.textContent = 'SELL';
    sellBtn.disabled = true;

    card.appendChild(priceDisplay);
    card.appendChild(icon);
    card.appendChild(stockRow);
    card.appendChild(remainRow);
    card.appendChild(stepper);
    card.appendChild(gain);
    card.appendChild(sellBtn);

    const updateCard = () => {
        const available = getTradeOreCargo(def.key);
        const unitPrice = getTradeOrePrice(def.type, def.key) || 0;
        const requested = Math.min(Math.max(parseInt(qtyInput.value, 10) || 0, 0), available);
        qtyInput.value = requested;

        const remaining = Math.max(0, available - requested);
        const total = unitPrice * requested;

        priceDisplay.textContent = unitPrice > 0 ? `${unitPrice.toLocaleString('en-US')} C.` : '--';
        stockRow.querySelector('.tradeStock').textContent = available.toLocaleString('en-US');
        remainRow.querySelector('.tradeRemain').textContent = remaining.toLocaleString('en-US');
        gain.textContent = `${total.toLocaleString('en-US')} C.`;

        const canSell = inTradeZone && unitPrice > 0 && requested > 0;
        sellBtn.disabled = !canSell;
    };

    const adjust = (delta) => {
        const available = getTradeOreCargo(def.key);
        const current = parseInt(qtyInput.value, 10) || 0;
        const next = Math.min(Math.max(current + delta, 0), available);
        qtyInput.value = next;
        updateCard();
    };

    decBtn.addEventListener('click', () => adjust(-1));
    incBtn.addEventListener('click', () => adjust(1));
    qtyInput.addEventListener('change', updateCard);
    qtyInput.addEventListener('input', updateCard);

    sellBtn.addEventListener('click', () => {
        const count = parseInt(qtyInput.value, 10) || 0;
        const price = getTradeOrePrice(def.type, def.key) || 0;
        if (count < 1 || price <= 0) return;
        if (!inTradeZone) {
            addInfoMessage('You must be in a trade zone to sell.');
            return;
        }
        const packet = `T|${def.type}|${count}`;
        sendRaw(packet);
    });

    tradeOreCards.set(def.type, {
        card,
        qtyInput,
        refresh: updateCard,
        reset: (available) => {
            qtyInput.value = available;
            updateCard();
        }
    });

    return card;
}

function ensureTradeWindow() {
    if (tradeWindowElement) return tradeWindowElement;

    const win = document.createElement('div');
    win.id = 'tradeWindow';
    win.className = 'gameWindow logoutWindow basicWindow';
    win.style.display = 'none';

    win.innerHTML = `
    <div class="tradeHeader">
        <div class="tradeHeaderLeft">
            <span class="windowHeaderIcon"></span>
            <span class="tradeTitle">Trade raw materials</span>
        </div>
    </div>
    <div class="tradeContent">
        <div id="tradeOreGrid"></div>
    </div>
`;


    document.body.appendChild(win);
    tradeWindowElement = win;

    const header = win.querySelector('.tradeHeader');
    if (header && typeof makeElementDraggable === 'function') {
        makeElementDraggable(win, header);
    }
    const headerIcon = win.querySelector('.tradeHeaderLeft .windowHeaderIcon');
    if (headerIcon) {
        headerIcon.title = 'Close';
        headerIcon.style.cursor = 'pointer';

        // Empêche le drag quand on clique l’icône
        headerIcon.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });

        // Fermeture uniquement au clic
        headerIcon.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeTradeWindow();
        });
    }



    const grid = win.querySelector('#tradeOreGrid');
    TRADE_ORE_CONFIG.forEach((def) => {
        const card = buildTradeCard(def);
        grid.appendChild(card);
    });


    return win;
}

function refreshTradeUI() {
    if (!tradeWindowElement) return;
    TRADE_ORE_CONFIG.forEach((def) => {
        const entry = tradeOreCards.get(def.type);
        if (!entry) return;
        const available = getTradeOreCargo(def.key);
        entry.reset(available);
    });
}
function refreshTradeSellButtons() {
    // Si la fenêtre trade n'existe pas ou est fermée -> rien à faire
    if (!tradeWindowElement || tradeWindowElement.style.display === 'none') return;

    // Ne reset pas les quantités, on ne fait que recalculer disabled/enabled
    TRADE_ORE_CONFIG.forEach((def) => {
        const entry = tradeOreCards.get(def.type);
        if (!entry) return;
        entry.refresh();
    });
}

function openTradeWindow() {
    const win = ensureTradeWindow();
    if (!win) return;

    win.style.display = 'flex';
    win.style.zIndex = 2200;
    refreshTradeUI();

    if (typeof sendRaw === 'function') {
        sendRaw('b');
    }
}

function closeTradeWindow() {
    if (tradeWindowElement) {
        tradeWindowElement.style.display = 'none';
    }
}

function initTradeButton() {
    if (document.getElementById('tradeButton')) return;

    const btn = document.createElement('div');
    btn.id = 'tradeButton';
    btn.title = 'Trade';
    btn.addEventListener('click', () => {
        openTradeWindow();
    });
    document.body.appendChild(btn);
}


function initSettingsButton() {
    if (document.getElementById('settingsButton')) return;

    const settingsBtn = document.createElement('div');
    settingsBtn.id = 'settingsButton';
    settingsBtn.title = 'Settings';
    settingsBtn.addEventListener('click', () => {
        if (typeof toggleSettingsWindow === 'function') {
            toggleSettingsWindow();
        }
    });
    document.body.appendChild(settingsBtn);
}

function initLogoutUI() {
    if (document.getElementById('logoutButton')) return;

    const logoutBtn = document.createElement('div');
    logoutBtn.id = 'logoutButton';
    logoutBtn.title = 'Logout';
    logoutBtn.addEventListener('click', () => {
        openLogoutWindow();
    });
    document.body.appendChild(logoutBtn);

    const logoutWin = document.createElement('div');
    logoutWin.id = 'logoutWindow';
    logoutWin.className = 'gameWindow logoutWindow basicWindow';
    logoutWin.style.display = 'none';
    logoutWin.innerHTML = `
        <div class="logoutHeader">
            <div class="logoutHeaderLeft">
                <span class="windowHeaderIcon"></span>
                <span class="logoutTitle">LOGOUT</span>
            </div>
            
        </div>
        <div class="logoutContent">
            <div class="logoutTextTop">Loging out in</div>
            <div class="logoutCountdown">--</div>
            <div class="logoutTextBottom">seconds</div>
            <button id="logoutCancelBtn" class="logoutCancelBtn">Cancel</button>

        </div>
    `;
    document.body.appendChild(logoutWin);

    const header = logoutWin.querySelector('.logoutHeader');
    if (header && typeof makeElementDraggable === "function") {
        makeElementDraggable(logoutWin, header);
    }

    const closeBtn = logoutWin.querySelector('.logoutClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => requestLogoutCancel(true));
    }

    const cancelBtn = logoutWin.querySelector('#logoutCancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => requestLogoutCancel(true));
    }

    logoutWindowElement = logoutWin;
}

function openLogoutWindow() {
    if (!logoutWindowElement) return;

    logoutWindowElement.style.display = 'flex';
    logoutWindowElement.style.zIndex = 2200;
    logoutBreakByUser = false;

    if (typeof heroMoveTimerId !== 'undefined' && heroMoveTimerId) {
        clearInterval(heroMoveTimerId);
        heroMoveTimerId = null;
    }
    if (typeof isMouseDownOnMap !== 'undefined') {
        isMouseDownOnMap = false;
    }
    if (typeof isChasingTarget !== 'undefined') {
        isChasingTarget = false;
    }

    if (typeof sendMoveToServer === 'function') {
        sendMoveToServer(shipX, shipY);
    }

    logoutControlsLocked = true;
    stopLogoutCountdown();
    startLogoutCountdown();

    if (typeof sendLogoutRequest === "function") {
        sendLogoutRequest();
    }
}

function startLogoutCountdown() {
    logoutCountdownValue = (heroPremium || false) ? 5 : 20;
    updateLogoutWindowText();

    logoutTimerId = setInterval(() => {
        if (logoutCountdownValue > 0) {
            logoutCountdownValue -= 1;
            updateLogoutWindowText();
            if (logoutCountdownValue <= 0) {
                finalizeLogoutCountdown();
            }
        }
    }, 1000);
}

function stopLogoutCountdown() {
    if (logoutTimerId) {
        clearInterval(logoutTimerId);
        logoutTimerId = null;
    }
}

function updateLogoutWindowText() {
    if (!logoutWindowElement) return;
    const countdownEl = logoutWindowElement.querySelector('.logoutCountdown');
    if (countdownEl) {
        countdownEl.textContent = logoutCountdownValue;
    }
}

function requestLogoutCancel(fromUser) {
    logoutBreakByUser = !!fromUser;

    if (fromUser && typeof addLogEntry === 'function') {
        addLogEntry('Logout cancelled by user.');
    }

    if (typeof sendLogoutCancel === "function") {
        sendLogoutCancel();
    }
}

function minimizeLogoutWindow() {
    if (logoutWindowElement) {
        logoutWindowElement.style.display = 'none';
    }
}

function handleLogoutCancelFromServer() {
    stopLogoutCountdown();
    logoutCountdownValue = 0;
    updateLogoutWindowText();
    minimizeLogoutWindow();
    logoutControlsLocked = false;

    if (!logoutBreakByUser && typeof addLogEntry === 'function') {
        addLogEntry('Logout cancelled.');
    }

    logoutBreakByUser = false;
}

function finalizeLogoutCountdown() {
    stopLogoutCountdown();
    logoutControlsLocked = true;
    updateLogoutWindowText();
    minimizeLogoutWindow();

    try {
        window.close();
    } catch (e) {
        // ignore
    }

    setTimeout(() => {
        window.location.href = '../';
    }, 100);
}


        // ========================================================
    // INTERFACE DU CHAT (HTML/CSS)
    // ========================================================
function renderChatTabs() {
    const tabs = document.getElementById('chatTabs');
    if (!tabs) return;
    ensureDefaultChatRooms();
    tabs.innerHTML = '';
    chatRooms.sort((a, b) => a.id - b.id);

    // Filtre des onglets pour coller au client Flash (Global + faction + clan uniquement)
    const visibleRooms = chatRooms.filter((room) => {
        const name = (room.name || '').toLowerCase();
        if (name === 'whispers') return false;
        if (room.id === 1 || name === 'global') return true;

        const factionNames = { 1: 'mmo', 2: 'eic', 3: 'vru' };
        const playerFaction = window.heroFactionId || 0;
        const factionMatch = playerFaction && (room.faction === playerFaction || room.id === playerFaction + 1 || name === factionNames[playerFaction]);

        const playerClan = window.heroClanId || 0;
        const clanMatch = playerClan && (room.id === playerClan + 100 || room.faction === playerClan + 100 || name === 'clan');

        return factionMatch || clanMatch;
    });

    const fallbackRoom = visibleRooms.find((room) => room.id === chatCurrentRoomId);
    const switchedToDefault = !fallbackRoom && chatCurrentRoomId !== 1;
    if (!fallbackRoom) {
        chatCurrentRoomId = 1; // Always fall back to Global if current tab disappears
    }

    for (const room of visibleRooms) {
        const tab = document.createElement('div');
        tab.className = 'chatTab' + (room.id === chatCurrentRoomId ? ' active' : '');
        tab.style.flex = '1';
        tab.style.padding = '4px';
        tab.style.textAlign = 'center';
        tab.style.color = room.id === chatCurrentRoomId ? '#00aaff' : '#666';
        tab.style.background = room.id === chatCurrentRoomId ? '#051525' : '#030a12';
        tab.style.fontSize = '10px';
        tab.textContent = room.name;
        tab.addEventListener('click', () => {
            chatCurrentRoomId = room.id;
            renderChatTabs();
            renderChatContent();

            if (!(chatBuffers[chatCurrentRoomId] && chatBuffers[chatCurrentRoomId].length)) {
                addChatMessage(null, "Système: Chat connecté.", chatCurrentRoomId, "chatSystem");
            }
        });
        tabs.appendChild(tab);
    }

    if (switchedToDefault) {
        renderChatContent();
    }
}

function renderChatContent() {
    const content = document.getElementById('chatContent');
    if (!content) return;
    const buf = chatBuffers[chatCurrentRoomId] || [];
    content.innerHTML = '';
    for (const entry of buf) {
        const div = document.createElement('div');
        div.className = 'chatLine ' + (entry.typeClass || 'chatGlobal');
        div.innerHTML = entry.html;
        content.appendChild(div);
    }
    content.scrollTop = content.scrollHeight;
}

function initChatInterface() {
    // On vérifie régulièrement si la fenêtre du chat a été créée
    const checkExist = setInterval(() => {
        // On cherche l'intérieur de la nouvelle fenêtre mobile
        const container = document.getElementById('content_chat');

        if (container) {
            clearInterval(checkExist); // On arrête de chercher, on a trouvé !

            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.height = '100%';

            container.innerHTML = `
                <div id="chatTabs" style="display:flex; background:rgba(0,0,0,0.5); border-bottom:1px solid #4a6b8c; cursor:pointer; height:25px;"></div>

                <div id="chatContent" style="
                    flex:1;
                    min-height:0;
                    overflow-y:auto;
                    padding:5px;
                    font-size:11px;
                    color:#ddd;
                    background:rgba(0,0,0,0.6);
                "></div>

                <div id="chatInputContainer" style="display:flex; border-top:1px solid #4a6b8c; padding:2px; height:25px;">
                    <input id="chatInput" type="text" style="
                        flex:1;
                        border:none;
                        color:white;
                        padding:2px 5px;
                        font-size:11px;
                        background:rgba(0,0,0,0.5);
                        outline:none;
                    " placeholder="Message...">

                    <button id="chatSendBtn" style="
                        background:rgba(0,0,0,0.7);
                        color:white;
                        border:none;
                        width:25px;
                        cursor:pointer;
                        padding:0;
                    ">&gt;</button>
                </div>
            `;

            renderChatTabs();
            renderChatContent();

            // --- RÉ-ACTIVATION DE LA LOGIQUE (Rien n'est supprimé) ---
            const input  = document.getElementById('chatInput');
            const sendBtn = document.getElementById('chatSendBtn');
            const content = document.getElementById('chatContent');

            function sendMessage() {
                const msg = input.value.trim();
                // On vérifie que le WebSocket (chatWs) est bien ouvert
                if (msg.length > 0 && chatWs && chatWs.readyState === WebSocket.OPEN) {
                    chatWs.send(`a|${chatCurrentRoomId}|${msg}`);
                    input.value = "";
                } else if (!chatWs || chatWs.readyState !== WebSocket.OPEN) {
                    const log = document.getElementById('chatContent');
                    if (log) log.innerHTML += `<div style="color:red">Erreur: Chat déconnecté.</div>`;
                }
            }

            if (input && sendBtn) {
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') sendMessage();
                    e.stopPropagation(); // Empêche le vaisseau de bouger quand on écrit
                });
                sendBtn.addEventListener('click', sendMessage);

                if (content) {
                    content.addEventListener('click', (e) => {
                        const target = e.target.closest('.chatName');
                        if (!target || !input) return;
                        const pseudo = target.dataset.name || target.textContent || '';
                        if (!pseudo) return;
                        input.value = `/w ${pseudo} `; // Whisper shortcut like Flash
                        input.focus();
                        input.selectionStart = input.selectionEnd = input.value.length;
                    });
                }

                // Effets visuels du bouton : over / down
                sendBtn.addEventListener('mouseenter', () => {
                    sendBtn.style.filter = "brightness(1.1)";
                });
                sendBtn.addEventListener('mouseleave', () => {
                    sendBtn.style.filter = "";
                });
                sendBtn.addEventListener('mousedown', () => {
                    sendBtn.style.filter = "brightness(0.8)";
                });
                sendBtn.addEventListener('mouseup', () => {
                    sendBtn.style.filter = "brightness(1.1)";
                });

                // Empêche de cliquer "au travers" de la fenêtre pour déplacer le vaisseau
                container.addEventListener('mousedown', (e) => e.stopPropagation());
            }
        }
    }, 500);
}

    function getLogicalPointerPosition(evt) {
        if (!evt || !canvas) {
            return { x: 0, y: 0 };
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
