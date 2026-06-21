function updateGameLogic(now) {
    const MAX_CATCHUP_MS = 1e3;
    let deltaMs = now - lastTime;
    if (!isFinite(deltaMs) || deltaMs < 0) deltaMs = 0;
    if (deltaMs > MAX_CATCHUP_MS) deltaMs = MAX_CATCHUP_MS;
    if (deltaMs === 0) {
        cameraX = shipX;
        cameraY = shipY;
        return;
    }
    const STEP_MS = 50;
    let remainingMs = deltaMs;
    let t = now - remainingMs;
    while (remainingMs > 0) {
        const step = Math.min(remainingMs, STEP_MS);
        t += step;
        const dt = step / 1e3;
        shieldAnimTime += dt;
        reinforceLockState();
        updateChaseMovement();
        updateHeroLocalMovement(dt);
        updateInterpolations();
        updateCombat();
        updateCombatRotations();
        if (typeof smoothEntityRotations === "function") smoothEntityRotations(dt);
        if (typeof updateDronesAnimations === "function") updateDronesAnimations(t);
        updateActionCooldowns();
        updateShieldEffects(t);
        updateTemporaryStatuses(t);
        updateLaserBeams(t);
        updateRocketAttacks(t);
        updateShieldBursts(t);
        remainingMs -= step;
    }
    if (typeof stepMapViewScaleAnimation === "function") {
        stepMapViewScaleAnimation(deltaMs);
    }
    lastTime = now;
    cameraX = shipX;
    cameraY = shipY;
}

function updateVisualEffectsOncePerFrame(now) {
    updatePortalJumpEffects(now);
    updateSmartbombEffects(now);
    updateEmpEffects(now);
    updateSabShots(now);
    updateDamageBubbles(now);
    if (typeof updateShieldTwinkles === "function") updateShieldTwinkles(now);
    updateHullDamageEffects(now);
    updateRocketDamageEffects(now);
    updateExplosions(now);
}

const HTML_WINDOWS_UPDATE_INTERVAL_MS = 100;

let lastHtmlWindowsUpdateMs = 0;

const DRAW_SMARTBOMB_ONLY_HERO_OPTIONS = {
    onlyHero: true
};

const DRAW_SMARTBOMB_EXCLUDE_HERO_OPTIONS = {
    excludeHero: true
};

const stationRenderMetaCache = Object.create(null);

function getStationImageTrim(type, img) {
    if (typeof STATION_SPRITE_DEFS === "undefined" || !type || !img) return null;
    const def = STATION_SPRITE_DEFS[type];
    const trim = def && def.trim;
    if (!trim || !Number.isFinite(trim.x) || !Number.isFinite(trim.y) || !Number.isFinite(trim.w) || !Number.isFinite(trim.h)) return null;
    if (trim.x <= 0 && trim.y <= 0 && trim.w >= img.width && trim.h >= img.height) return null;
    if (trim.x < 0 || trim.y < 0 || trim.w <= 0 || trim.h <= 0 || trim.x + trim.w > img.width || trim.y + trim.h > img.height) return null;
    return trim;
}

function getStationRenderMeta(type, img) {
    if (!img) return null;
    const cacheKey = type || "";
    let meta = stationRenderMetaCache[cacheKey];
    if (meta && meta.image === img && meta.imageWidth === img.width && meta.imageHeight === img.height) {
        return meta;
    }
    const trim = getStationImageTrim(type, img);
    const trimX = trim ? trim.x : 0;
    const trimY = trim ? trim.y : 0;
    const trimW = trim ? trim.w : img.width;
    const trimH = trim ? trim.h : img.height;
    meta = {
        image: img,
        imageWidth: img.width,
        imageHeight: img.height,
        halfWidth: img.width / 2,
        halfHeight: img.height / 2,
        hasTrim: !!trim,
        trimX: trimX,
        trimY: trimY,
        trimW: trimW,
        trimH: trimH,
        sourceBaseX: trimX,
        sourceBaseY: trimY
    };
    stationRenderMetaCache[cacheKey] = meta;
    return meta;
}

function drawStationImageClipped(meta, drawX, drawY, viewport) {
    const img = meta.image;
    const baseDestX = drawX - meta.halfWidth;
    const baseDestY = drawY - meta.halfHeight;
    const trimX = meta.trimX;
    const trimY = meta.trimY;
    const trimW = meta.trimW;
    const trimH = meta.trimH;
    const destX = baseDestX + trimX;
    const destY = baseDestY + trimY;
    const sourceBaseX = meta.sourceBaseX;
    const sourceBaseY = meta.sourceBaseY;
    const destRight = destX + img.width;
    const destBottom = destY + trimH;
    const clipLeft = Math.max(destX, viewport.left);
    const clipTop = Math.max(destY, viewport.top);
    const clipRight = Math.min(destX + trimW, viewport.right);
    const clipBottom = Math.min(destBottom, viewport.bottom);
    if (clipRight <= clipLeft || clipBottom <= clipTop) return;
    if (!meta.hasTrim && clipLeft === destX && clipTop === destY && clipRight === destRight && clipBottom === destBottom) {
        ctx.drawImage(img, destX, destY);
        return;
    }
    const sourceX = sourceBaseX + clipLeft - destX;
    const sourceY = sourceBaseY + clipTop - destY;
    const sourceW = clipRight - clipLeft;
    const sourceH = clipBottom - clipTop;
    ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, clipLeft, clipTop, sourceW, sourceH);
}

function render(now) {
    if (typeof beginEntitySnapshotFrame === "function") beginEntitySnapshotFrame();
    try {
        updateGameLogic(now);
        updateVisualEffectsOncePerFrame(now);
        const worldScale = typeof getWorldScaleValue === "function" ? getWorldScaleValue() : 1;
        const mapScale = typeof getMapViewScaleValue === "function" ? getMapViewScaleValue() : 1;
        const totalScale = worldScale * mapScale;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const canClipStations = Number.isFinite(totalScale) && totalScale > 0;
        const stationViewport = render._stationViewport || (render._stationViewport = {
            left: 0,
            top: 0,
            right: LOGICAL_WIDTH,
            bottom: LOGICAL_HEIGHT
        });
        stationViewport.left = canClipStations ? LOGICAL_WIDTH / 2 - centerX / totalScale : 0;
        stationViewport.top = canClipStations ? LOGICAL_HEIGHT / 2 - centerY / totalScale : 0;
        stationViewport.right = canClipStations ? LOGICAL_WIDTH / 2 + centerX / totalScale : LOGICAL_WIDTH;
        stationViewport.bottom = canClipStations ? LOGICAL_HEIGHT / 2 + centerY / totalScale : LOGICAL_HEIGHT;
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(totalScale, totalScale);
        ctx.translate(-LOGICAL_WIDTH / 2, -LOGICAL_HEIGHT / 2);
        drawMapBackground();
        if (typeof stations !== "undefined" && typeof stationImages !== "undefined") {
            for (let s of stations) {
                let img = stationImages[s.type];
                if (img && img.complete) {
                    const stationMeta = getStationRenderMeta(s.type, img);
                    if (!stationMeta) continue;
                    let drawX = mapToScreenX(s.x);
                    let drawY = mapToScreenY(s.y);
                    if (canClipStations) {
                        drawStationImageClipped(stationMeta, drawX, drawY, stationViewport);
                    } else {
                        ctx.drawImage(stationMeta.image, drawX - stationMeta.halfWidth, drawY - stationMeta.halfHeight);
                    }
                }
            }
        }
        drawPortals();
        drawEntities();
        drawSmartbombEffects(DRAW_SMARTBOMB_ONLY_HERO_OPTIONS);
        drawShip();
        if (typeof drawShieldTwinkles === "function") drawShieldTwinkles();
        drawEmpEffects();
        drawPortalJumpEffects();
        drawSmartbombEffects(DRAW_SMARTBOMB_EXCLUDE_HERO_OPTIONS);
        drawShieldBursts();
        drawHullDamageEffects();
        drawRocketDamageEffects();
        drawExplosions();
        drawRocketAttacks();
        drawLaserBeams();
        drawSabShots();
        ctx.restore();
        drawRadiationOverlay();
        drawPvpOverlay();
        drawDamageBubbles();
        drawMiniMap();
        if (typeof updateHtmlWindows === "function") {
            if (now - lastHtmlWindowsUpdateMs >= HTML_WINDOWS_UPDATE_INTERVAL_MS) {
                updateHtmlWindows();
                lastHtmlWindowsUpdateMs = now;
            }
        }
        drawQuickbar();
        drawDebugInfo();
        drawTooltip();
        heroSmbJustUsed = false;
    } finally {
        if (typeof endEntitySnapshotFrame === "function") endEntitySnapshotFrame();
    }
    requestAnimationFrame(render);
}

let __bgLogicTimerId = null;

function startBackgroundLogicLoop() {
    if (__bgLogicTimerId) return;
    __bgLogicTimerId = setInterval(() => {
        if (!document.hidden) {
            stopBackgroundLogicLoop();
            return;
        }
        updateGameLogic(performance.now());
    }, 50);
}

function stopBackgroundLogicLoop() {
    if (__bgLogicTimerId) {
        clearInterval(__bgLogicTimerId);
        __bgLogicTimerId = null;
    }
}

document.addEventListener("visibilitychange", () => {
    if (document.hidden) startBackgroundLogicLoop(); else stopBackgroundLogicLoop();
});

window.addEventListener("pagehide", () => stopBackgroundLogicLoop());

window.selectGroupMember = function(id) {
    if (id && entities[id]) {
        if (typeof requestTargetSelectionLikeFlash === "function") {
            requestTargetSelectionLikeFlash(id);
        } else {
            selectedTargetId = null;
            sendSelectShip(id);
        }
        const groupInput = document.getElementById("groupInputName");
        if (groupInput && entities[id].name) {
            groupInput.value = entities[id].name;
        }
    }
};

window.__ANDRO_STARTUP_SOUNDS_ARMED = false;

window.__ANDRO_STARTUP_SOUNDS_PLAYED = false;

if (typeof window.__ANDRO_AUDIO_SETTINGS_READY !== "boolean") {
    window.__ANDRO_AUDIO_SETTINGS_READY = false;
}

function __androTryPlayStartupSounds(reason = "") {
    if (!window.__ANDRO_STARTUP_SOUNDS_ARMED || window.__ANDRO_STARTUP_SOUNDS_PLAYED) {
        return false;
    }
    if (!window.__ANDRO_AUDIO_SETTINGS_READY) {
        return false;
    }
    try {
        if (window.AudioManager && typeof window.AudioManager.playSoundEffect === "function") {
            if (typeof setting_play_music !== "undefined" && !setting_play_music) {
                window.AudioManager.playSoundEffect(14, false, false, -1, -1, true);
            }
            window.AudioManager.playSoundEffect(20, false, false, -1, -1, true);
            window.__ANDRO_STARTUP_SOUNDS_PLAYED = true;
            return true;
        }
    } catch (e) {
        console.warn("[Bootstrap] Startup sounds failed:", e, reason);
    }
    return false;
}

window.__ANDRO_TRY_PLAY_STARTUP_SOUNDS = __androTryPlayStartupSounds;

window.initGame = async function() {
    try {
        if (window.AudioManager && typeof window.AudioManager.unlock === "function") {
            await window.AudioManager.unlock();
        }
    } catch (_) {}
    initGlobalButtonStyles();
    initGlobalTextFieldStyles();
    initGlobalComboBoxStyles();
    initGlobalSliderStyles();
    initGlobalListStyles();
    initGlobalMiscComponentStyles();
    initGlobalSpriteDebugStyles();
    if (typeof initChatInterface === "function") {
        initChatInterface();
    }
    initSpaceballHUD();
    initGlobalScrollbarStyles();
    const bootXmlPromise = window.__ANDRO_BOOT_XML_PROMISE;
    let bootXmlOk = false;
    if (bootXmlPromise && typeof bootXmlPromise.then === "function") {
        bootXmlOk = await bootXmlPromise;
    } else if (typeof bootLoadXmlConfigs === "function") {
        bootXmlOk = await bootLoadXmlConfigs(window.ANDROMEDA_CONFIG || {});
    }
    if (bootXmlOk !== true || !window._gameXmlDoc) {
        throw new Error("[Bootstrap] game.xml is required before initializing the Flash action menu.");
    }
    initActionDrawer();
    initDragAndDrop();
    if (window.AudioManager && typeof window.AudioManager.waitForCriticalBootAudio === "function") {
        try {
            await window.AudioManager.waitForCriticalBootAudio("initGame");
        } catch (e) {
            console.warn("[Bootstrap] critical boot audio wait failed (continuing):", e);
        }
    }
    if (window.AudioManager && typeof window.AudioManager.warmCriticalBootRuntimeAudio === "function") {
        try {
            await window.AudioManager.warmCriticalBootRuntimeAudio("initGame");
        } catch (e) {
            console.warn("[Bootstrap] runtime audio warmup failed (continuing):", e);
        }
    }
    if (typeof window.warmCriticalBootRuntimeVisuals === "function") {
        try {
            await window.warmCriticalBootRuntimeVisuals("initGame");
        } catch (e) {
            console.warn("[Bootstrap] runtime visual warmup failed (continuing):", e);
        }
    }
    loadInterfaceLayout();
    initWindowManager();
    createGameWindows();
    initRefiningButton();
    initTradeButton();
    initSettingsButton();
    initLogoutUI();
    lastTime = performance.now();
    window.__ANDRO_STARTUP_SOUNDS_ARMED = true;
    if (typeof window.__ANDRO_TRY_PLAY_STARTUP_SOUNDS === "function") {
        window.__ANDRO_TRY_PLAY_STARTUP_SOUNDS("initGame");
    }
    if (typeof window.startNetwork === "function" && !window.__ANDRO_NETWORK_STARTED) {
        window.__ANDRO_NETWORK_STARTED = true;
        window.startNetwork();
    }
    requestAnimationFrame(render);
};

const __flashInfoLayoutCache = {};

const __flashInfoViewModeState = Object.create(null);

const __flashLocaleMap = Object.create(null);

let __flashLocaleLoaded = false;

let __flashLocaleLoadStarted = false;

let __flashInfoTooltipEl = null;

let __flashLocaleRevision = 0;

function __flashLocaleGetText(key) {
    if (!key) return "";
    const value = __flashLocaleMap[key];
    return value != null ? String(value) : "";
}

async function __loadFlashLocaleMapOnce() {
    if (__flashLocaleLoaded || __flashLocaleLoadStarted) return;
    __flashLocaleLoadStarted = true;
    try {
        const response = await fetch("../flashinput/translationSpacemap.php", {
            credentials: "same-origin"
        });
        if (!response.ok) return;
        const raw = await response.text();
        const re = /<item\s+id=['\"]([^'\"]+)['\"][^>]*>\s*(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))\s*<\/item>/g;
        let match;
        while ((match = re.exec(raw)) !== null) {
            const key = match[1] || "";
            const value = match[2] != null ? match[2] : match[3] || "";
            if (!key) continue;
            __flashLocaleMap[key] = value;
        }
        __flashLocaleLoaded = true;
        __flashLocaleRevision++;
        if (typeof updateHtmlWindows === "function") {
            updateHtmlWindows();
        }
    } catch (_) {}
}

function __resolveFlashInfoTooltip(field, resolvedFieldValue) {
    if (resolvedFieldValue && resolvedFieldValue.tooltipText != null) {
        return String(resolvedFieldValue.tooltipText);
    }
    const base = __flashLocaleGetText(field.languageKey);
    if (!base) return "";
    if (resolvedFieldValue && resolvedFieldValue.tooltipCount != null) {
        return base.replace(/%COUNT%/g, String(resolvedFieldValue.tooltipCount));
    }
    if (resolvedFieldValue && resolvedFieldValue.tooltipAmount != null) {
        return base.replace(/%AMOUNT%/g, String(resolvedFieldValue.tooltipAmount));
    }
    return base;
}

function __getFlashInfoViewMode(field) {
    if (!field || !field.id) return "text";
    if (__flashInfoViewModeState[field.id] == null) {
        __flashInfoViewModeState[field.id] = field.bar ? "bar" : "text";
    }
    return __flashInfoViewModeState[field.id];
}

function __setFlashInfoViewMode(fieldId, mode) {
    if (!fieldId) return;
    __flashInfoViewModeState[fieldId] = mode;
}

function __buildFlashBarHtml(width, pct, barFillSrc, extraPct = 0, extraBarFillSrc = null) {
    const barWidth = Math.max(0, Number(width) || 0);
    const clampedPct = Math.max(0, Math.min(100, Number(pct) || 0));
    const clampedExtraPct = Math.max(0, Math.min(100, Number(extraPct) || 0));
    const fillWidth = Math.max(0, Math.min(barWidth, Math.round(barWidth * clampedPct / 100)));
    const extraFillWidth = Math.max(0, Math.min(barWidth, Math.round(barWidth * clampedExtraPct / 100)));
    const resolvedBarFillSrc = typeof resolveUiImageUrl === "function" ? resolveUiImageUrl(barFillSrc) : barFillSrc;
    const resolvedExtraBarFillSrc = extraBarFillSrc && typeof resolveUiImageUrl === "function" ? resolveUiImageUrl(extraBarFillSrc) : extraBarFillSrc;
    const extraLayer = extraFillWidth > 0 && resolvedExtraBarFillSrc ? `
            <div class="flashBarFillWrap flashBarExtraFillWrap" style="width:${extraFillWidth}px;">
                <div class="flashBarFill flashBarExtraFill" style="width:${barWidth}px; background-image:url('${resolvedExtraBarFillSrc}'); background-size:${barWidth}px 13px;"></div>
            </div>` : "";
    return `
        <div class="flashBar" style="width:${barWidth}px;">
            <div class="flashBarFillWrap" style="width:${fillWidth}px;">
                <div class="flashBarFill" style="width:${barWidth}px; background-image:url('${resolvedBarFillSrc}'); background-size:${barWidth}px 13px;"></div>
            </div>${extraLayer}
        </div>`;
}

function __getFlashNumberSeparators() {
    const thousand = __flashLocaleGetText("thousands_separator") || ",";
    const decimal = __flashLocaleGetText("decimal_separator") || ".";
    return {
        thousand: thousand,
        decimal: decimal
    };
}

function __fmtInt(val) {
    const n = Number(val);
    if (!isFinite(n)) return "0";
    const {thousand: thousand} = __getFlashNumberSeparators();
    const rounded = Math.round(Math.abs(n)).toString();
    const sign = n < 0 ? "-" : "";
    return sign + rounded.replace(/\B(?=(\d{3})+(?!\d))/g, thousand);
}

function __fmtFloat2(val) {
    const n = Number(val);
    if (!isFinite(n)) return "0.00";
    const {thousand: thousand, decimal: decimal} = __getFlashNumberSeparators();
    const sign = n < 0 ? "-" : "";
    const fixed = Math.abs(n).toFixed(2);
    const parts = fixed.split(".");
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousand);
    return `${sign}${intPart}${decimal}${parts[1]}`;
}

function __escapeHtmlAttr(value) {
    return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function __ensureFlashInfoTooltip() {
    if (!document.getElementById("flash-info-tooltip-style")) {
        const style = document.createElement("style");
        style.id = "flash-info-tooltip-style";
        style.textContent = `\n            #flashInfoTooltip {\n                position: fixed;\n                z-index: 2147483647;\n                display: none;\n                pointer-events: none;\n                max-width: 220px;\n                padding: 2px 4px;\n                background: #000;\n                color: #cccccc;\n                border: 1px solid #2f2f2f;\n                font-family: Tahoma, Arial, sans-serif;\n                font-size: 11px;\n                line-height: 13px;\n                white-space: pre-wrap;\n                word-break: break-word;\n            }\n        `;
        document.head.appendChild(style);
    }
    if (!__flashInfoTooltipEl) {
        __flashInfoTooltipEl = document.getElementById("flashInfoTooltip");
        if (!__flashInfoTooltipEl) {
            __flashInfoTooltipEl = document.createElement("div");
            __flashInfoTooltipEl.id = "flashInfoTooltip";
            document.body.appendChild(__flashInfoTooltipEl);
        }
    }
}

function __showFlashInfoTooltip(text, mouseX, mouseY) {
    if (!text) return;
    __ensureFlashInfoTooltip();
    __flashInfoTooltipEl.textContent = text;
    __flashInfoTooltipEl.style.display = "block";
    __moveFlashInfoTooltip(mouseX, mouseY);
}

function __hideFlashInfoTooltip() {
    if (!__flashInfoTooltipEl) return;
    __flashInfoTooltipEl.style.display = "none";
}

function __moveFlashInfoTooltip(mouseX, mouseY) {
    if (!__flashInfoTooltipEl || __flashInfoTooltipEl.style.display === "none") return;
    const gap = 10;
    let x = mouseX + gap;
    let y = mouseY - __flashInfoTooltipEl.offsetHeight - gap;
    if (x + __flashInfoTooltipEl.offsetWidth > window.innerWidth) {
        x = mouseX - __flashInfoTooltipEl.offsetWidth - gap;
    }
    if (y < 0) {
        y = mouseY + gap;
    }
    __flashInfoTooltipEl.style.left = `${Math.max(0, x)}px`;
    __flashInfoTooltipEl.style.top = `${Math.max(0, y)}px`;
}

function __safeInt(val, fallback = 0) {
    const n = parseInt(val, 10);
    return Number.isFinite(n) ? n : fallback;
}

function __getGameXmlWindowNode(windowId) {
    try {
        const doc = window._gameXmlDoc;
        if (!doc || !doc.querySelector) return null;
        return doc.querySelector(`windows > window[id="${windowId}"]`);
    } catch (e) {
        return null;
    }
}

function __getFlashInfoLayout(windowId) {
    if (__flashInfoLayoutCache[windowId]) return __flashInfoLayoutCache[windowId];
    const winNode = __getGameXmlWindowNode(windowId);
    if (!winNode) return null;
    const containerNodes = Array.from(winNode.querySelectorAll("infoFieldContainer"));
    if (!containerNodes.length) return null;
    const width1 = __safeInt(winNode.getAttribute("width_1"), -1);
    const height1 = __safeInt(winNode.getAttribute("height_1"), -1);
    const containers = containerNodes.map(cn => {
        const x0 = __safeInt(cn.getAttribute("xPos_0") || cn.getAttribute("x_0"), 0);
        const y0 = __safeInt(cn.getAttribute("yPos_0") || cn.getAttribute("y_0"), 0);
        const x1 = __safeInt(cn.getAttribute("xPos_1") || cn.getAttribute("x_1"), x0);
        const y1 = __safeInt(cn.getAttribute("yPos_1") || cn.getAttribute("y_1"), y0);
        const tfw = __safeInt(cn.getAttribute("textFieldWidth"), 110);
        const fields = Array.from(cn.querySelectorAll("infoField")).map((fn, idx) => {
            const hasY = fn.hasAttribute("yPos") || fn.hasAttribute("y");
            return {
                id: fn.getAttribute("id") || "",
                linkage: fn.getAttribute("linkage") || "",
                x: __safeInt(fn.getAttribute("xPos") || fn.getAttribute("x"), 0),
                y: __safeInt(fn.getAttribute("yPos") || fn.getAttribute("y"), idx * 17),
                hasY: hasY,
                bar: (fn.getAttribute("bar") || "").trim(),
                languageKey: fn.getAttribute("languageKey") || ""
            };
        });
        return {
            x0: x0,
            y0: y0,
            x1: x1,
            y1: y1,
            tfw: tfw,
            fields: fields
        };
    });
    const baseY0 = containers.reduce((minY, c) => Math.min(minY, c.y0), Infinity);
    const baseY1 = containers.reduce((minY, c) => Math.min(minY, c.y1), Infinity);
    const layout = {
        baseY0: isFinite(baseY0) ? baseY0 : 0,
        baseY1: isFinite(baseY1) ? baseY1 : 0,
        width1: width1,
        height1: height1,
        containers: containers
    };
    __flashInfoLayoutCache[windowId] = layout;
    return layout;
}

function ensureFlashInfoStyles() {
    const styleId = "flash-infofields-style-v3";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    const flashBarBgCss = typeof getUiCssUrl === "function" ? getUiCssUrl("graphics/ui/ui/images/bar_background.png") : "url('graphics/ui/ui/images/bar_background.png')";
    style.textContent = `\n        \n        \n        .gameWindow.flashWindow[data-window-key="ship"] .windowInterior,\n        .gameWindow.flashWindow[data-window-key="user"] .windowInterior {\n            left: 0;\n            right: 0;\n            top: 0;\n            bottom: 0;\n        }\n\n        .gameWindow.flashWindow[data-window-key="ship"] .gwHeader,\n        .gameWindow.flashWindow[data-window-key="user"] .gwHeader {\n            top: 0;\n            height: 25px;\n            padding-left: 12px;\n            padding-right: 8px;\n        }\n\n        .gameWindow.flashWindow[data-window-key="ship"] .gwHeaderLeft,\n        .gameWindow.flashWindow[data-window-key="user"] .gwHeaderLeft {\n            gap: 4px;\n        }\n\n        .gameWindow.flashWindow[data-window-key="ship"] .gwIcon,\n        .gameWindow.flashWindow[data-window-key="user"] .gwIcon {\n            width: 24px;\n            height: 24px;\n            flex: 0 0 24px;\n            background-size: 24px 24px;\n        }\n\n        \n        .gameWindow.flashWindow[data-window-key="ship"] .gwTitle,\n        .gameWindow.flashWindow[data-window-key="user"] .gwTitle {\n            line-height: 14px;\n        }\n\n        .gameWindow.flashWindow[data-window-key="ship"] .gwContent,\n        .gameWindow.flashWindow[data-window-key="user"] .gwContent,\n        .gameWindow.flashWindow[data-window-key="booster"] .gwContent {\n            padding: 0;\n            position: relative;\n            overflow: hidden;\n        }\n\n        .flashInfoRoot {\n            position: relative;\n            width: 100%;\n            height: 100%;\n        }\n        .flashInfoContainer {\n            position: absolute;\n        }\n        .flashBoosterRoot {\n            position: relative;\n            width: 100%;\n            height: 100%;\n        }\n        .flashBoosterContainer {\n            position: absolute;\n            left: 15px;\n            top: 13px;\n            width: 83px;\n        }\n        .flashBoosterValue {\n            width: auto;\n            min-width: 34px;\n            text-align: left;\n            flex: 0 0 auto;\n            margin-left: 0;\n        }\n        .flashInfoRow {\n            position: absolute;\n            left: 0;\n            display: flex;\n            align-items: center;\n            gap: 0;\n            height: 16px;\n            user-select: none;\n        }\n        .flashInfoIcon {\n            width: 16px;\n            height: 16px;\n            flex: 0 0 16px;\n            margin-right: 5px;\n            user-select: none;\n            -webkit-user-drag: none;\n        }\n        .flashBoosterRow {\n            width: 83px;\n            height: 16px;\n        }\n        .flashBoosterBar {\n            width: 62px;\n        }\n        .flashInfoValue {\n            display: block;\n            font-family: Tahoma, Arial, sans-serif;\n            font-size: 11px;\n            line-height: 13px;\n            color: #eaf5ff;\n            text-shadow: 1px 1px 0 #000;\n            white-space: nowrap;\n            overflow: hidden;\n            text-overflow: clip;\n            text-align: right;\n        }\n\n        .flashBoosterRow .flashBoosterValue {\n            text-align: left;\n        }\n\n        .flashBar {\n            position: relative;\n            height: 13px;\n            background-image: ${flashBarBgCss};\n            background-repeat: no-repeat;\n            background-size: 100% 100%;\n            overflow: hidden;\n        }\n        .flashBarFillWrap {\n            position: absolute;\n            left: 0;\n            top: 0;\n            bottom: 0;\n            width: 0;\n            overflow: hidden;\n        }\n        .flashBarFill {\n            position: absolute;\n            left: 0;\n            top: 0;\n            height: 13px;\n            background-repeat: no-repeat;\n        }\n        .flashBarText {\n            position: absolute;\n            inset: 0;\n            display: flex;\n            align-items: center;\n            justify-content: center;\n            font-family: Tahoma, Arial, sans-serif;\n            font-size: 9px;\n            color: #ffffff;\n            text-shadow: 1px 1px 0 #000;\n            pointer-events: none;\n            line-height: 13px;\n        }\n\n        .flashLogRoot {\n            position: absolute;\n            left: 0;\n            top: 0;\n            right: 0;\n            bottom: 0;\n            overflow-y: auto;\n            overflow-x: hidden;\n            font-family: Tahoma, Arial, sans-serif;\n            font-size: 11px;\n            line-height: 13px;\n            color: #d0d8df;\n            \n            padding: 30px 15px 20px 15px;\n            box-sizing: border-box;\n            background-image: url('graphics/ui/ui/sprites/DefineSprite_467_TextArea_upSkin/1.png');\n            background-repeat: repeat;\n            background-size: auto;\n        }\n        .flashLogRoot::-webkit-scrollbar {\n            width: 15px;\n        }\n        .flashLogRoot::-webkit-scrollbar-track {\n            background: url('graphics/ui/ui/sprites/DefineSprite_439_ScrollTrack_skin/1.png') repeat-y center top;\n            background-size: 15px auto;\n        }\n        .flashLogRoot::-webkit-scrollbar-thumb {\n            background: url('graphics/ui/ui/sprites/DefineSprite_457_ScrollThumb_upSkin/1.png') no-repeat center top;\n            background-size: 15px 52px;\n            min-height: 52px;\n            border: 0;\n        }\n        .flashLogRoot::-webkit-scrollbar-button:single-button:vertical:decrement {\n            height: 14px;\n            background: url('graphics/ui/ui/sprites/DefineSprite_455_ScrollArrowUp_upSkin/1.png') no-repeat center center;\n            background-size: 15px 14px;\n        }\n        .flashLogRoot::-webkit-scrollbar-button:single-button:vertical:increment {\n            height: 14px;\n            background: url('graphics/ui/ui/sprites/DefineSprite_458_ScrollArrowDown_upSkin/1.png') no-repeat center center;\n            background-size: 15px 14px;\n        }\n        .flashLogLine {\n            margin: 0;\n            padding: 0;\n            white-space: pre-wrap;\n            word-break: break-word;\n            overflow-wrap: anywhere;\n        }\n    `;
    document.head.appendChild(style);
}

function __renderFlashInfoWindow(windowId, container, fieldResolver) {
    const layout = __getFlashInfoLayout(windowId);
    if (!layout) return false;
    const cw = container.clientWidth || 0;
    const ch = container.clientHeight || 0;
    const mode = layout.width1 > 0 && cw >= layout.width1 && (layout.height1 <= 0 || ch >= layout.height1) ? 1 : 0;
    let html = '<div class="flashInfoRoot">';
    for (const c of layout.containers) {
        const left = mode === 1 ? c.x1 : c.x0;
        const y = mode === 1 ? c.y1 : c.y0;
        const top = y;
        const localLeft = left;
        html += `<div class="flashInfoContainer" style="left:${localLeft}px; top:${top}px;" data-tfw="${c.tfw}">`;
        for (const f of c.fields) {
            const res = fieldResolver(f, c);
            if (!res) continue;
            const rawIconSrc = res.iconSrc || (f.linkage ? `graphics/ui/ui/images/${f.linkage}.png` : "");
            const iconSrc = typeof resolveUiImageUrl === "function" ? resolveUiImageUrl(rawIconSrc) : rawIconSrc;
            const rowTop = Number.isFinite(f.y) ? f.y : 0;
            const rowLeft = Number.isFinite(f.x) ? f.x : 0;
            const rowStyle = `top:${rowTop}px; left:${rowLeft}px;`;
            if (res.type === "bar") {
                const viewMode = __getFlashInfoViewMode(f);
                const pct = res.pct;
                const barFillSrc = res.barFillSrc;
                const label = res.label;
                const tooltipText = __resolveFlashInfoTooltip(f, res);
                if (viewMode === "text") {
                    html += `\n                        <div class="flashInfoRow" style="${rowStyle}${f.bar ? "cursor:pointer;" : ""}" data-info-field-id="${f.id || ""}" data-info-field-mode="text" data-info-field-toggle="${f.bar ? 1 : 0}" data-flash-tooltip="${__escapeHtmlAttr(tooltipText)}">\n                            <img class="flashInfoIcon" src="${iconSrc}" alt="" draggable="false">\n                            <div class="flashInfoValue" style="text-align:left;">${label}</div>\n                        </div>\n                    `;
                    continue;
                }
                html += `\n                    <div class="flashInfoRow" style="${rowStyle}${f.bar ? "cursor:pointer;" : ""}" data-info-field-id="${f.id || ""}" data-info-field-mode="bar" data-info-field-toggle="${f.bar ? 1 : 0}" data-flash-tooltip="${__escapeHtmlAttr(tooltipText)}">\n                        <img class="flashInfoIcon" src="${iconSrc}" alt="" draggable="false">\n                        ${__buildFlashBarHtml(res.width, pct, barFillSrc, res.extraPct || 0, res.extraBarFillSrc || null)}\n                    </div>\n                `;
            } else {
                const valueWidth = Number.isFinite(res.width) ? res.width : null;
                const valueAlign = res.align || "right";
                const tooltipText = __resolveFlashInfoTooltip(f, res);
                html += `\n                    <div class="flashInfoRow" style="${rowStyle}${f.id === "28" ? "cursor:pointer;" : ""}" data-info-field-id="${f.id || ""}" data-info-field-mode="text" data-info-field-toggle="${f.bar ? 1 : 0}" data-flash-tooltip="${__escapeHtmlAttr(tooltipText)}">\n                        <img class="flashInfoIcon" src="${iconSrc}" alt="" draggable="false">\n                        <div class="flashInfoValue" style="${Number.isFinite(valueWidth) ? `width:${valueWidth}px; ` : ""}text-align:${valueAlign};">${res.label}</div>\n                    </div>\n                `;
            }
        }
        html += `</div>`;
    }
    html += `</div>`;
    container.innerHTML = html;
    if (!container.dataset.__flashInfoHandlersBound) {
        container.dataset.__flashInfoHandlersBound = "1";
        container.addEventListener("click", event => {
            const row = event.target && event.target.closest ? event.target.closest(".flashInfoRow[data-info-field-id]") : null;
            if (!row) return;
            const fieldId = row.getAttribute("data-info-field-id") || "";
            const mode = row.getAttribute("data-info-field-mode") || "text";
            const toggleable = row.getAttribute("data-info-field-toggle") === "1";
            const isShipWindow = windowId === 1;
            if (!isShipWindow) return;
            if (fieldId === "28") {
                const nextCfg = heroConfig === 1 ? 2 : 1;
                if (typeof sendChangeConfig === "function") {
                    sendChangeConfig(nextCfg);
                }
                return;
            }
            if (toggleable && (mode === "bar" || mode === "text")) {
                const current = __flashInfoViewModeState[fieldId] || mode;
                const nextMode = current === "bar" ? "text" : "bar";
                __setFlashInfoViewMode(fieldId, nextMode);
                container.dataset.__sig = "";
                renderFlashShipInfoWindow(container);
            }
        });
        container.addEventListener("mouseover", event => {
            const row = event.target && event.target.closest ? event.target.closest(".flashInfoRow[data-flash-tooltip]") : null;
            if (!row) {
                __hideFlashInfoTooltip();
                return;
            }
            const tooltipText = row.getAttribute("data-flash-tooltip") || "";
            if (!tooltipText) {
                __hideFlashInfoTooltip();
                return;
            }
            __showFlashInfoTooltip(tooltipText, event.clientX, event.clientY);
        });
        container.addEventListener("mousemove", event => {
            const row = event.target && event.target.closest ? event.target.closest(".flashInfoRow[data-flash-tooltip]") : null;
            if (!row) {
                __hideFlashInfoTooltip();
                return;
            }
            const tooltipText = row.getAttribute("data-flash-tooltip") || "";
            if (!tooltipText) {
                __hideFlashInfoTooltip();
                return;
            }
            __showFlashInfoTooltip(tooltipText, event.clientX, event.clientY);
        });
        container.addEventListener("mouseleave", () => {
            __hideFlashInfoTooltip();
        });
    }
    if (window.FLASH_PARITY_DEBUG && (windowId === 0 || windowId === 1)) {
        requestAnimationFrame(() => {
            const root = container.querySelector(".flashInfoRoot");
            const rows = root ? Array.from(root.querySelectorAll(".flashInfoRow")) : [];
            const rowRects = rows.slice(0, 8).map((row, idx) => {
                const r = row.getBoundingClientRect();
                return {
                    idx: idx,
                    x: Math.round(r.x),
                    y: Math.round(r.y),
                    w: Math.round(r.width),
                    h: Math.round(r.height)
                };
            });
            console.log("[FLASH_PARITY] info-window-layout", {
                windowId: windowId,
                mode: mode,
                container: {
                    w: cw,
                    h: ch
                },
                width1: layout.width1,
                height1: layout.height1,
                containers: layout.containers.map(c => ({
                    x0: c.x0,
                    y0: c.y0,
                    x1: c.x1,
                    y1: c.y1,
                    tfw: c.tfw,
                    fields: c.fields.length
                })),
                rows: rowRects
            });
        });
    }
    return true;
}

function renderFlashShipInfoWindow(container) {
    ensureFlashInfoStyles();
    __loadFlashLocaleMapOnce();
    const hpNow = heroHp != null ? Number(heroHp) : 0;
    const hpMax = heroMaxHp != null && Number(heroMaxHp) > 0 ? Number(heroMaxHp) : hpNow || 1;
    const shNow = heroShield != null ? Number(heroShield) : 0;
    const shMaxRaw = heroMaxShield != null ? Number(heroMaxShield) : NaN;
    const shMax = !isNaN(shMaxRaw) ? Math.max(0, shMaxRaw) : Math.max(0, shNow);
    const cgNow = heroCargo != null ? Number(heroCargo) : 0;
    const cgMax = heroMaxCargo != null && Number(heroMaxCargo) > 0 ? Number(heroMaxCargo) : cgNow || 1;
    const ammoStockData = typeof ammoStock !== "undefined" && ammoStock ? ammoStock : {};
    const totalLaserAmmo = [ 1, 2, 3, 4, 5, 6 ].reduce((sum, key) => sum + (parseInt(ammoStockData[key], 10) || 0), 0);
    const totalRocketAmmo = [ 10, 11, 12 ].reduce((sum, key) => sum + (parseInt(ammoStockData[key], 10) || 0), 0);
    const sig = `hp:${hpNow}/${hpMax}|sh:${shNow}/${shMax}|cg:${cgNow}/${cgMax}|l:${totalLaserAmmo}|r:${totalRocketAmmo}|cfg:${heroConfig}|loc:${__flashLocaleRevision}|w:${container.clientWidth}|h:${container.clientHeight}`;
    if (container.dataset.__sig === sig) return true;
    container.dataset.__sig = sig;
    return __renderFlashInfoWindow(1, container, (field, containerDef) => {
        const barNames = field.bar ? field.bar.split(",").map(s => s.trim()).filter(Boolean) : [];
        const barFill = barNames.length ? barNames[0] : null;
        const hpExtraFill = barNames.length > 1 ? barNames[1] : null;
        switch (field.linkage) {
          case "shipInfoIcon_hitpoints":
            {
                const normalHp = hpMax > 0 ? Math.min(hpNow, hpMax) : hpNow;
                const extraHp = hpMax > 0 && hpNow > hpMax ? hpNow - hpMax : 0;
                const pct = hpMax > 0 ? Math.max(0, Math.min(100, normalHp / hpMax * 100)) : 0;
                const extraPct = hpMax > 0 ? Math.max(0, Math.min(100, extraHp / hpMax * 100)) : 0;
                const count = `${__fmtInt(hpNow)}|${__fmtInt(hpMax)}`;
                return {
                    type: "bar",
                    width: 62,
                    pct: pct,
                    extraPct: extraPct,
                    barFillSrc: `graphics/ui/ui/images/${barFill || "bar_green"}.png`,
                    extraBarFillSrc: extraPct > 0 && hpExtraFill ? `graphics/ui/ui/images/${hpExtraFill}.png` : null,
                    label: __fmtInt(hpNow),
                    tooltipText: `${__flashLocaleGetText(field.languageKey)}
${count}`
                };
            }

          case "shipInfoIcon_shield":
            {
                const pct = shMax > 0 ? Math.max(0, Math.min(100, shNow / shMax * 100)) : 0;
                const count = `${__fmtInt(shNow)}|${__fmtInt(shMax)}`;
                return {
                    type: "bar",
                    width: 62,
                    pct: pct,
                    barFillSrc: `graphics/ui/ui/images/${barFill || "bar_blue"}.png`,
                    label: __fmtInt(shNow),
                    tooltipText: `${__flashLocaleGetText(field.languageKey)}\n${count}`
                };
            }

          case "shipInfoIcon_cargo":
            {
                const pct = cgMax > 0 ? Math.max(0, Math.min(100, cgNow / cgMax * 100)) : 0;
                const count = `${__fmtInt(cgNow)}|${__fmtInt(cgMax)}`;
                return {
                    type: "bar",
                    width: 62,
                    pct: pct,
                    barFillSrc: `graphics/ui/ui/images/${barFill || "bar_red"}.png`,
                    label: __fmtInt(cgNow),
                    tooltipText: `${__flashLocaleGetText(field.languageKey)}\n${count}`
                };
            }

          case "shipInfoIcon_laser":
            {
                const laserMax = typeof heroMaxLaserCapacity !== "undefined" ? heroMaxLaserCapacity : totalLaserAmmo;
                const count = `${__fmtInt(totalLaserAmmo)}|${__fmtInt(laserMax || 0)}`;
                return {
                    type: "bar",
                    width: 62,
                    pct: 100,
                    barFillSrc: `graphics/ui/ui/images/${barFill || "bar_red"}.png`,
                    label: __fmtInt(totalLaserAmmo),
                    tooltipText: `${__flashLocaleGetText(field.languageKey)}\n${count}`
                };
            }

          case "shipInfoIcon_rockets":
            {
                const rocketMax = typeof heroMaxRocketCapacity !== "undefined" ? heroMaxRocketCapacity : totalRocketAmmo;
                const count = `${__fmtInt(totalRocketAmmo)}|${__fmtInt(rocketMax || 0)}`;
                return {
                    type: "bar",
                    width: 62,
                    pct: 100,
                    barFillSrc: `graphics/ui/ui/images/${barFill || "bar_red"}.png`,
                    label: __fmtInt(totalRocketAmmo),
                    tooltipText: `${__flashLocaleGetText(field.languageKey)}\n${count}`
                };
            }

          case "shipInfoIcon_configuration":
            return {
                type: "text",
                align: "right",
                label: String(Number(heroConfig) === 2 ? 2 : 1),
                tooltipCount: String(Number(heroConfig) === 2 ? 2 : 1)
            };
        }
        return null;
    });
}

function renderFlashUserInfoWindow(container) {
    ensureFlashInfoStyles();
    __loadFlashLocaleMapOnce();
    const jumpVouchers = typeof heroJumpVouchers !== "undefined" ? Number(heroJumpVouchers) : 0;
    const sig = `xp:${heroXp}|lvl:${heroLevel}|hon:${heroHonor}|jv:${jumpVouchers}|cr:${heroCredits}|u:${heroUridium}|jp:${heroJackpot}|bk:${heroBootyKeys}|loc:${__flashLocaleRevision}|w:${container.clientWidth}|h:${container.clientHeight}`;
    if (container.dataset.__sig === sig) return true;
    container.dataset.__sig = sig;
    return __renderFlashInfoWindow(0, container, (field, containerDef) => {
        const tooltipBase = __flashLocaleGetText(field.languageKey);
        switch (field.linkage) {
          case "shipInfoIcon_experience":
            {
                const value = __fmtInt(heroXp);
                return {
                    type: "text",
                    align: "right",
                    label: value,
                    tooltipText: tooltipBase ? `${tooltipBase}\n${value}` : ""
                };
            }

          case "shipInfoIcon_level":
            return {
                type: "text",
                align: "right",
                label: __fmtInt(heroLevel),
                tooltipCount: __fmtInt(heroLevel)
            };

          case "shipInfoIcon_honor":
            {
                const value = __fmtInt(heroHonor);
                return {
                    type: "text",
                    align: "right",
                    label: value,
                    tooltipText: tooltipBase ? `${tooltipBase}\n${value}` : ""
                };
            }

          case "shipInfoIcon_jumpvoucher":
            return {
                type: "text",
                align: "right",
                label: __fmtInt(jumpVouchers),
                tooltipCount: __fmtInt(jumpVouchers)
            };

          case "shipInfoIcon_credits":
            {
                const value = __fmtInt(heroCredits);
                return {
                    type: "text",
                    align: "right",
                    label: value,
                    tooltipText: tooltipBase ? `${tooltipBase}\n${value}` : ""
                };
            }

          case "shipInfoIcon_uridium":
            {
                const value = __fmtInt(heroUridium);
                return {
                    type: "text",
                    align: "right",
                    label: value,
                    tooltipText: tooltipBase ? `${tooltipBase}\n${value}` : ""
                };
            }

          case "shipInfoIcon_jackpot":
            {
                const value = __fmtFloat2(heroJackpot);
                return {
                    type: "text",
                    align: "right",
                    label: value,
                    tooltipText: tooltipBase ? `${tooltipBase}\n${value}` : ""
                };
            }

          case "shipInfoIcon_bootykey":
            return {
                type: "text",
                align: "right",
                label: __fmtInt(heroBootyKeys),
                tooltipAmount: __fmtInt(heroBootyKeys)
            };
        }
        return null;
    });
}

const FLASH_BOOSTER_NAMES = Object.freeze([ "", "XP-B01", "HON-B01", "DMG-B01", "SHD-B01", "REP-B01", "SREG-B01", "RES-B01", "HP-B01", "NQR-B01", "NBX-B01" ]);

let __flashBoosterLayoutCache = null;

function __getFlashBoosterLayout() {
    if (__flashBoosterLayoutCache) return __flashBoosterLayoutCache;
    try {
        const doc = window._gameXmlDoc;
        if (!doc || !doc.querySelectorAll) return null;
        const nodes = Array.from(doc.querySelectorAll("boosters > booster"));
        if (!nodes.length) return null;
        const defs = nodes.map(node => ({
            id: __safeInt(node.getAttribute("id"), 0),
            infoFieldID: __safeInt(node.getAttribute("infoFieldID"), 0),
            resKey: node.getAttribute("resKey") || "",
            barKey: node.getAttribute("barKey") || "bar_green"
        })).filter(entry => entry.id > 0 && entry.resKey);
        defs.sort((a, b) => a.id - b.id);
        __flashBoosterLayoutCache = {
            windowWidth: 110,
            headerReserve: 32,
            left: 15,
            top: 13,
            rowHeight: 16,
            rowGap: 5,
            barWidth: 62,
            defs: defs
        };
        return __flashBoosterLayoutCache;
    } catch (_) {
        return null;
    }
}

function __bindFlashBoosterTooltips(container) {
    if (!container || container.dataset.__flashBoosterHandlersBound) return;
    container.dataset.__flashBoosterHandlersBound = "1";
    container.addEventListener("click", event => {
        const row = event.target && event.target.closest ? event.target.closest(".flashBoosterRow[data-info-field-id]") : null;
        if (!row) return;
        const fieldId = row.getAttribute("data-info-field-id") || "";
        const mode = row.getAttribute("data-info-field-mode") || "bar";
        const toggleable = row.getAttribute("data-info-field-toggle") === "1";
        if (!toggleable || !fieldId) return;
        const current = __flashInfoViewModeState[fieldId] || mode;
        const nextMode = current === "bar" ? "text" : "bar";
        __setFlashInfoViewMode(fieldId, nextMode);
        container.dataset.__sig = "";
        renderFlashBoosterWindow(container);
    });
    container.addEventListener("mouseover", event => {
        const row = event.target && event.target.closest ? event.target.closest(".flashBoosterRow[data-flash-tooltip]") : null;
        if (!row) {
            __hideFlashInfoTooltip();
            return;
        }
        const tooltipText = row.getAttribute("data-flash-tooltip") || "";
        if (!tooltipText) {
            __hideFlashInfoTooltip();
            return;
        }
        __showFlashInfoTooltip(tooltipText, event.clientX, event.clientY);
    });
    container.addEventListener("mousemove", event => {
        const row = event.target && event.target.closest ? event.target.closest(".flashBoosterRow[data-flash-tooltip]") : null;
        if (!row) {
            __hideFlashInfoTooltip();
            return;
        }
        const tooltipText = row.getAttribute("data-flash-tooltip") || "";
        if (!tooltipText) {
            __hideFlashInfoTooltip();
            return;
        }
        __showFlashInfoTooltip(tooltipText, event.clientX, event.clientY);
    });
    container.addEventListener("mouseleave", () => {
        __hideFlashInfoTooltip();
    });
}

function renderFlashBoosterWindow(container) {
    ensureFlashInfoStyles();
    __ensureFlashInfoTooltip();
    const layout = __getFlashBoosterLayout();
    if (!layout) return false;
    const boosters = typeof getBoosterStatus === "function" ? getBoosterStatus() : window.boosterStatus || [];
    const activeEntries = [];
    for (let idx = 0; idx < boosters.length; idx++) {
        const value = parseInt(boosters[idx], 10) || 0;
        if (value <= 0) continue;
        const def = layout.defs[idx];
        if (!def) continue;
        activeEntries.push({
            id: def.id,
            infoFieldID: String(def.infoFieldID || ""),
            value: value,
            resKey: def.resKey,
            barKey: def.barKey || "bar_green",
            tooltip: FLASH_BOOSTER_NAMES[def.id] || ""
        });
    }
    const sig = `boosters:${activeEntries.map(entry => `${entry.id}:${entry.value}:${__flashInfoViewModeState[entry.infoFieldID] || "bar"}`).join("|")}|w:${container.clientWidth}|h:${container.clientHeight}`;
    if (container.dataset.__sig === sig) return true;
    container.dataset.__sig = sig;
    if (!activeEntries.length) {
        container.innerHTML = '<div class="flashBoosterRoot"></div>';
    } else {
        let html = '<div class="flashBoosterRoot"><div class="flashBoosterContainer">';
        for (let rowIndex = 0; rowIndex < activeEntries.length; rowIndex++) {
            const entry = activeEntries[rowIndex];
            const pct = Math.max(0, Math.min(100, Number(entry.value) || 0));
            const rawIconSrc = `graphics/ui/ui/images/${entry.resKey}.png`;
            const iconSrc = typeof resolveUiImageUrl === "function" ? resolveUiImageUrl(rawIconSrc) : rawIconSrc;
            const barFillSrc = `graphics/ui/ui/images/${entry.barKey}.png`;
            const tooltipAttr = __escapeHtmlAttr(entry.tooltip);
            const viewMode = __flashInfoViewModeState[entry.infoFieldID] == null ? "bar" : __flashInfoViewModeState[entry.infoFieldID];
            const top = rowIndex * (layout.rowHeight + layout.rowGap);
            if (viewMode === "text") {
                html += `\n                    <div class="flashInfoRow flashBoosterRow" style="left:0; top:${top}px; cursor:pointer;" data-info-field-id="${entry.infoFieldID}" data-info-field-mode="text" data-info-field-toggle="1" data-flash-tooltip="${tooltipAttr}">\n                        <img class="flashInfoIcon flashBoosterIcon" src="${iconSrc}" alt="" draggable="false">\n                        <div class="flashInfoValue flashBoosterValue">${pct} %</div>\n                    </div>`;
            } else {
                html += `\n                    <div class="flashInfoRow flashBoosterRow" style="left:0; top:${top}px; cursor:pointer;" data-info-field-id="${entry.infoFieldID}" data-info-field-mode="bar" data-info-field-toggle="1" data-flash-tooltip="${tooltipAttr}">\n                        <img class="flashInfoIcon flashBoosterIcon" src="${iconSrc}" alt="" draggable="false">\n                        ${__buildFlashBarHtml(layout.barWidth, pct, barFillSrc)}\n                    </div>`;
            }
        }
        html += "</div></div>";
        container.innerHTML = html;
    }
    __bindFlashBoosterTooltips(container);
    const win = document.getElementById("win_booster");
    if (win) {
        const targetHeight = layout.headerReserve + activeEntries.length * layout.rowHeight + Math.max(0, activeEntries.length - 1) * layout.rowGap;
        win.dataset.baseW = String(layout.windowWidth);
        win.dataset.baseH = String(Math.max(layout.headerReserve, targetHeight));
        try {
            const runtimeCfg = window.__runtimeWindowsConfig && window.__runtimeWindowsConfig.booster && typeof getFlashWindowRuntimeConfig === "function" ? getFlashWindowRuntimeConfig("booster", window.__runtimeWindowsConfig.booster) : {
                w: layout.windowWidth,
                h: Math.max(layout.headerReserve, targetHeight)
            };
            if (typeof enforceFlashWindowBaseSize === "function") {
                enforceFlashWindowBaseSize("booster", win, runtimeCfg || {});
            } else {
                win.style.width = `${layout.windowWidth}px`;
                win.style.height = `${Math.max(layout.headerReserve, targetHeight)}px`;
            }
            if (typeof syncFlashWindowContentBounds === "function") {
                syncFlashWindowContentBounds(win);
            }
        } catch (_) {}
    }
    return true;
}

function updateHtmlWindows() {
    if (windowStates && windowStates.ship) {
        const container = document.getElementById("content_ship");
        if (container) {
            renderFlashShipInfoWindow(container);
        }
    }
    if (windowStates && windowStates.booster) {
        const container = document.getElementById("content_booster");
        if (container) {
            renderFlashBoosterWindow(container);
        }
    }
    if (windowStates && windowStates.spaceball) {
        const container = document.getElementById("content_spaceball");
        if (container && typeof renderFlashSpaceballWindow === "function") {
            renderFlashSpaceballWindow(container);
        }
    }
    if (windowStates && windowStates.user) {
        const container = document.getElementById("content_user");
        if (container) {
            renderFlashUserInfoWindow(container);
        }
    }
    if (windowStates && windowStates.log) {
        const container = document.getElementById("content_log");
        if (container) {
            const maxLines = 200;
            const source = Array.isArray(window.flashLogMessages) ? window.flashLogMessages : [];
            const lines = source.slice(-maxLines);
            const sig = lines.join("\n");
            const existing = container.querySelector(".flashLogRoot");
            const prevScrollTop = existing ? existing.scrollTop : 0;
            const wasNearBottom = existing ? existing.scrollHeight - existing.scrollTop - existing.clientHeight < 6 : true;
            if (container.dataset.__logSig !== sig) {
                container.dataset.__logSig = sig;
                const html = lines.map(msg => `<div class="flashLogLine">${msg}</div>`).join("");
                container.innerHTML = `<div class="flashLogRoot">${html}</div>`;
                if (window.FLASH_PARITY_DEBUG && typeof window.flashParityDebugLog === "function") {
                    window.flashParityDebugLog("log-render", {
                        renderedCount: lines.length,
                        sourceOpcode: window.__flashLastGameOpcode || null
                    });
                }
            }
            const root = container.querySelector(".flashLogRoot");
            if (root) {
                if (wasNearBottom) root.scrollTop = root.scrollHeight; else root.scrollTop = prevScrollTop;
            }
        }
    }
}
