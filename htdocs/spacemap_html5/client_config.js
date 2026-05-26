const LOGICAL_WIDTH = 1920;

const LOGICAL_HEIGHT = 1080;

const cfg = window.ANDROMEDA_CONFIG || {};

const STD_MAP_WIDTH = 21e3;

const STD_MAP_HEIGHT = 13100;

const MAP_MIN_X = 0;

let MAP_MAX_X = STD_MAP_WIDTH;

const MAP_MIN_Y = 0;

let MAP_MAX_Y = STD_MAP_HEIGHT;

let MAP_WIDTH = MAP_MAX_X - MAP_MIN_X;

let MAP_HEIGHT = MAP_MAX_Y - MAP_MIN_Y;

const STARFIELD_IDLE_SPEED = .2;

const STARFIELD_DEFAULT_COLOR = 16777215;

const STARFIELD_DEFAULT_COUNT = 100;

const STARFIELD_SPEED_MIN = .5;

const STARFIELD_SPEED_MAX = 3.5;

const STARFIELD_FPS = 40;

const DEFAULT_STARFIELD_ENABLED = true;

const MAP_BACKGROUND_TYPES = {
    1: 15,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    9: 9,
    10: 10,
    11: 11,
    12: 12,
    13: 13,
    14: 14,
    15: 15,
    16: 16,
    17: 16,
    80: 91,
    81: 61
};

const MAP_SCALE_FACTORS = {
    16: 2
};

const DEFAULT_BACKGROUND_PARALLAX = 10;

const MAP_BACKGROUND_PARALLAX = {
    1: 10,
    9: 10
};

let mapScaleFactor = 1;

let currentMapId = null;

let currentBackgroundLayers = [];

let backgroundLayersEnabled = true;

let mapBackgroundLayersById = {};

let mapStarfieldSettingsById = {};

let starfieldEnabled = false;

let starfieldColor = STARFIELD_DEFAULT_COLOR;

let starfieldState = null;

let lastStarfieldAnchor = {
    x: 0,
    y: 0
};

let mapsXmlPromise = null;

let profileXmlPromise = null;

let resourcesXmlPromise = null;

const BOOT_XML_FETCH_TIMEOUT_MS = 8e3;

function fetchBootXmlText(url, options = {}, timeoutMs = BOOT_XML_FETCH_TIMEOUT_MS) {
    if (typeof fetch !== "function") {
        return Promise.reject(new Error("fetch unavailable"));
    }
    const parseResponse = resp => {
        if (!resp || !resp.ok) {
            const status = resp ? `HTTP ${resp.status}${resp.statusText ? " " + resp.statusText : ""}` : "No response";
            return Promise.reject(new Error(status));
        }
        return resp.text();
    };
    if (typeof AbortController === "function") {
        const controller = new AbortController;
        const timer = setTimeout(() => {
            try {
                controller.abort();
            } catch (_) {}
        }, timeoutMs);
        return fetch(url, {
            ...options,
            signal: controller.signal
        }).then(parseResponse).finally(() => clearTimeout(timer));
    }
    let timer = null;
    return Promise.race([ fetch(url, options).then(parseResponse), new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
    }) ]).finally(() => {
        if (timer) clearTimeout(timer);
    });
}

let profileXmlConfig = {
    qualityLowLimit: null,
    intervalLength: null,
    notificationSteps: []
};

window.profileXmlConfig = profileXmlConfig;

function createResourcesManifest(locations, files) {
    const frozenLocations = Object.freeze({
        ...locations
    });
    const frozenFiles = Object.freeze({
        ...files
    });
    return Object.freeze({
        locations: frozenLocations,
        files: frozenFiles,
        getUrl(fileId) {
            const entry = frozenFiles[fileId];
            return entry ? entry.url : null;
        }
    });
}

window.ResourcesManifest = window.ResourcesManifest || createResourcesManifest({}, {});

let hitpointColorPatterns = {};

window.HITPOINT_COLOR_PATTERNS = hitpointColorPatterns;

window.DRONE_GROUP_RADIUS = Number.isFinite(window.DRONE_GROUP_RADIUS) ? window.DRONE_GROUP_RADIUS : 75;

window.DRONE_RADIUS = Number.isFinite(window.DRONE_RADIUS) ? window.DRONE_RADIUS : 15;

window.DRONE_GROUP_DIMENSION = window.DRONE_GROUP_RADIUS * 2;

const FLASH_NOA_BMP_WIDTH = 525;

const FLASH_NOA_BMP_HEIGHT = 328;

let flashPoiZones = [];

let flashNoaZones = [];

let flashNoaGrid = null;

function flashNoaScaleFactor() {
    const width = MAP_WIDTH > 0 ? MAP_WIDTH : STD_MAP_WIDTH;
    return width / FLASH_NOA_BMP_WIDTH;
}

function clearFlashPoiZones() {
    flashPoiZones = [];
    flashNoaZones = [];
    flashNoaGrid = null;
}

window.clearFlashPoiZones = clearFlashPoiZones;

function ensureFlashNoaGrid() {
    if (!flashNoaGrid || flashNoaGrid.length !== FLASH_NOA_BMP_WIDTH * FLASH_NOA_BMP_HEIGHT) {
        flashNoaGrid = new Uint8Array(FLASH_NOA_BMP_WIDTH * FLASH_NOA_BMP_HEIGHT);
    }
    return flashNoaGrid;
}

function setNoaCell(x, y) {
    if (x < 0 || y < 0 || x >= FLASH_NOA_BMP_WIDTH || y >= FLASH_NOA_BMP_HEIGHT) return;
    ensureFlashNoaGrid()[y * FLASH_NOA_BMP_WIDTH + x] = 1;
}

function isNoaCell(x, y) {
    if (!flashNoaGrid) return false;
    if (x < 0 || y < 0 || x >= FLASH_NOA_BMP_WIDTH || y >= FLASH_NOA_BMP_HEIGHT) return false;
    return flashNoaGrid[y * FLASH_NOA_BMP_WIDTH + x] === 1;
}

function addFlashPoiZone(zoneType, zoneId, shape, designId, points) {
    const zone = {
        zoneType: String(zoneType || ""),
        zoneId: Number(zoneId) || 0,
        shape: String(shape || "").toUpperCase(),
        designId: Number(designId) || 0,
        points: (points || []).map(v => Number(v))
    };
    flashPoiZones.push(zone);
    if (zone.zoneType !== "NOA") return;
    flashNoaZones.push(zone);
    const scale = flashNoaScaleFactor();
    const grid = ensureFlashNoaGrid();
    if (!grid) return;
    if (zone.shape === "REC" && zone.points.length >= 4) {
        let x1 = Math.max(0, Math.min(MAP_WIDTH, Math.round(zone.points[0])));
        let y1 = Math.max(0, Math.min(MAP_HEIGHT, Math.round(zone.points[1])));
        let x2 = Math.max(0, Math.min(MAP_WIDTH, Math.round(zone.points[2])));
        let y2 = Math.max(0, Math.min(MAP_HEIGHT, Math.round(zone.points[3])));
        x1 = Math.round(x1 / scale);
        y1 = Math.round(y1 / scale);
        x2 = Math.round(x2 / scale);
        y2 = Math.round(y2 / scale);
        if (x2 < FLASH_NOA_BMP_WIDTH) x2 += 1;
        if (y2 < FLASH_NOA_BMP_HEIGHT) y2 += 1;
        const lx = Math.max(0, Math.min(x1, x2));
        const rx = Math.min(FLASH_NOA_BMP_WIDTH - 1, Math.max(x1, x2));
        const ty = Math.max(0, Math.min(y1, y2));
        const by = Math.min(FLASH_NOA_BMP_HEIGHT - 1, Math.max(y1, y2));
        for (let yy = ty; yy <= by; yy++) {
            const row = yy * FLASH_NOA_BMP_WIDTH;
            for (let xx = lx; xx <= rx; xx++) {
                flashNoaGrid[row + xx] = 1;
            }
        }
        return;
    }
    if (zone.shape === "CIR" && zone.points.length >= 3) {
        const cx = Math.round(zone.points[0] / scale);
        const cy = Math.round(zone.points[1] / scale);
        const r = Math.round(zone.points[2] / scale) + 1;
        const r2 = r * r;
        const minX = Math.max(0, cx - r);
        const maxX = Math.min(FLASH_NOA_BMP_WIDTH - 1, cx + r);
        const minY = Math.max(0, cy - r);
        const maxY = Math.min(FLASH_NOA_BMP_HEIGHT - 1, cy + r);
        for (let yy = minY; yy <= maxY; yy++) {
            for (let xx = minX; xx <= maxX; xx++) {
                const dx = xx - cx;
                const dy = yy - cy;
                if (dx * dx + dy * dy <= r2) {
                    setNoaCell(xx, yy);
                }
            }
        }
    }
}

window.addFlashPoiZone = addFlashPoiZone;

function isCollidingWithNoaScaled(p1, p2 = null) {
    if (!flashNoaGrid) return false;
    if (!p2) {
        return isNoaCell(p1.x, p1.y);
    }
    let x0 = Math.round(p1.x), y0 = Math.round(p1.y);
    const x1 = Math.round(p2.x), y1 = Math.round(p2.y);
    const dx = Math.abs(x1 - x0);
    const sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0);
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    while (true) {
        if (isNoaCell(x0, y0)) return true;
        if (x0 === x1 && y0 === y1) break;
        const e2 = err * 2;
        if (e2 >= dy) {
            err += dy;
            x0 += sx;
        }
        if (e2 <= dx) {
            err += dx;
            y0 += sy;
        }
    }
    return false;
}

function getMiddlePoint(p1, p2) {
    return {
        x: Math.floor((p1.x - p2.x) * .5) + p2.x,
        y: Math.floor((p1.y - p2.y) * .5) + p2.y
    };
}

function getCollisionPointScaled(fromPoint, toPoint) {
    let p1 = {
        x: fromPoint.x,
        y: fromPoint.y
    };
    let p2 = {
        x: toPoint.x,
        y: toPoint.y
    };
    let d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
    while (d > 1) {
        const mid = getMiddlePoint(p1, p2);
        if (isCollidingWithNoaScaled(p1, mid)) {
            p2 = mid;
        } else {
            p1 = mid;
        }
        d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
    }
    if (!isCollidingWithNoaScaled(p1)) return p1;
    if (!isCollidingWithNoaScaled(p2)) return p2;
    return null;
}

function getOnePixelLessIntersectPoint(intersection, fromPoint) {
    let x = fromPoint.x;
    let y = fromPoint.y;
    if (fromPoint.x < intersection.x) x = intersection.x - 5; else if (fromPoint.x > intersection.x) x = intersection.x + 5; else x = intersection.x;
    if (fromPoint.y < intersection.y) y = intersection.y - 5; else if (fromPoint.y > intersection.y) y = intersection.y + 5; else y = intersection.y;
    return {
        x: x,
        y: y
    };
}

function lineIntersect(a, b, c, d) {
    const r = {
        x: b.x - a.x,
        y: b.y - a.y
    };
    const s = {
        x: d.x - c.x,
        y: d.y - c.y
    };
    const denom = r.x * s.y - r.y * s.x;
    if (denom === 0) return null;
    const uNum = (c.x - a.x) * r.y - (c.y - a.y) * r.x;
    const tNum = (c.x - a.x) * s.y - (c.y - a.y) * s.x;
    const t = tNum / denom;
    const u = uNum / denom;
    if (t < 0 || t > 1 || u < 0 || u > 1) return null;
    return {
        x: a.x + t * r.x,
        y: a.y + t * r.y
    };
}

function checkPOIZoneCollisionsByLines(fromPoint, toPoint) {
    const intersections = [];
    for (const zone of flashNoaZones) {
        if (zone.shape !== "REC" || zone.points.length < 4) continue;
        const x1 = zone.points[0], y1 = zone.points[1], x2 = zone.points[2], y2 = zone.points[3];
        const topLeft = {
            x: x1,
            y: y1
        };
        const topRight = {
            x: x2,
            y: y1
        };
        const botLeft = {
            x: x1,
            y: y2
        };
        const botRight = {
            x: x2,
            y: y2
        };
        const hits = [ lineIntersect(fromPoint, toPoint, topLeft, topRight), lineIntersect(fromPoint, toPoint, topLeft, botLeft), lineIntersect(fromPoint, toPoint, topRight, botRight), lineIntersect(fromPoint, toPoint, botLeft, botRight) ].filter(Boolean);
        intersections.push(...hits);
    }
    if (intersections.length < 1) return null;
    if (intersections.length === 1) {
        const candidate = getOnePixelLessIntersectPoint(intersections[0], fromPoint);
        if (candidate.x === fromPoint.x && candidate.y === fromPoint.y) {
            return intersections[0];
        }
        const dist = Math.hypot(candidate.x - fromPoint.x, candidate.y - fromPoint.y);
        if (dist > 0) return getOnePixelLessIntersectPoint(intersections[0], fromPoint);
        return null;
    }
    let best = intersections[0];
    let bestDist = Math.hypot(best.x - fromPoint.x, best.y - fromPoint.y);
    for (let idx = 1; idx < intersections.length; idx++) {
        const p = intersections[idx];
        const d = Math.hypot(p.x - fromPoint.x, p.y - fromPoint.y);
        if (d < bestDist) {
            best = p;
            bestDist = d;
        }
    }
    return getOnePixelLessIntersectPoint(best, fromPoint);
}

function checkFlashPoiZoneCollisions(fromPoint, toPoint) {
    if (!flashNoaZones.length) return null;
    const from = {
        x: fromPoint.x - MAP_MIN_X,
        y: fromPoint.y - MAP_MIN_Y
    };
    const to = {
        x: toPoint.x - MAP_MIN_X,
        y: toPoint.y - MAP_MIN_Y
    };
    let outOfBounds = false;
    if (from.x < 0 || from.x > MAP_WIDTH || from.y < 0 || from.y > MAP_HEIGHT) outOfBounds = true;
    if (to.x < 0 || to.x > MAP_WIDTH || to.y < 0 || to.y > MAP_HEIGHT) outOfBounds = true;
    if (outOfBounds) {
        const lineHit = checkPOIZoneCollisionsByLines(from, to);
        return lineHit ? {
            x: lineHit.x + MAP_MIN_X,
            y: lineHit.y + MAP_MIN_Y
        } : null;
    }
    const scale = flashNoaScaleFactor();
    const fromScaled = {
        x: Math.round(from.x / scale),
        y: Math.round(from.y / scale)
    };
    const toScaled = {
        x: Math.round(to.x / scale),
        y: Math.round(to.y / scale)
    };
    const xIncreasing = toPoint.x > fromPoint.x;
    const xDecreasing = !xIncreasing;
    const yIncreasing = toPoint.y > fromPoint.y;
    const yDecreasing = !yIncreasing;
    if (isCollidingWithNoaScaled(fromScaled, fromScaled)) {
        const lineHit = checkPOIZoneCollisionsByLines(from, to);
        return lineHit ? {
            x: lineHit.x + MAP_MIN_X,
            y: lineHit.y + MAP_MIN_Y
        } : null;
    }
    if (isCollidingWithNoaScaled(fromScaled, toScaled)) {
        const collision = getCollisionPointScaled(fromScaled, toScaled);
        if (!collision) {
            const lineHit = checkPOIZoneCollisionsByLines(from, to);
            return lineHit ? {
                x: lineHit.x + MAP_MIN_X,
                y: lineHit.y + MAP_MIN_Y
            } : null;
        }
        const result = {
            x: Math.round(collision.x * scale),
            y: Math.round(collision.y * scale)
        };
        if (result.x > from.x && xDecreasing) result.x = Math.floor(from.x);
        if (result.x < from.x && xIncreasing) result.x = Math.ceil(from.x);
        if (result.y > from.y && yDecreasing) result.y = Math.floor(from.y);
        if (result.y < from.y && yIncreasing) result.y = Math.ceil(from.y);
        return {
            x: result.x + MAP_MIN_X,
            y: result.y + MAP_MIN_Y
        };
    }
    return null;
}

window.checkFlashPoiZoneCollisions = checkFlashPoiZoneCollisions;

const MINIMAP_HEADER_HEIGHT = 25;

const MINIMAP_INFO_HEIGHT = 25;

const MINIMAP_WINDOW_DIMENSION_PADDING = 25;

const MINIMAP_SCALE_MIN = 3;

const MINIMAP_SCALE_MAX = 11;

const MINIMAP_SCALE_DEFAULT = 8;

let MINIMAP_WIDTH = 0;

let MINIMAP_HEIGHT = 0;

let minimapScaleFactor = MINIMAP_SCALE_DEFAULT;

let minimapHitboxes = {
    zoomIn: null,
    zoomOut: null,
    content: null,
    frame: null
};

let minimapLayoutCache = {
    key: null,
    value: null
};

function invalidateMinimapLayoutCache() {
    minimapLayoutCache.key = null;
    minimapLayoutCache.value = null;
}

window.invalidateMinimapLayoutCache = invalidateMinimapLayoutCache;

let minimapHoverState = {
    header: false,
    zoomIn: false,
    zoomOut: false
};

const minimapServerMarkers = new Map;

const minimapInterference = {
    active: false,
    width: 0,
    height: 0,
    startAlpha: .2,
    alpha: .2,
    diff: .5,
    updateInMsec: 50,
    durationMs: 0,
    durationUntilMs: 0,
    fadeOutEnabled: true,
    minFadeOutSec: 1,
    maxFadeOutSec: 6,
    minFadeInMsec: 20,
    maxFadeInMsec: 500,
    nextNoiseUpdateMs: 0,
    nextFadeActionMs: 0,
    fading: "none",
    fadeStartMs: 0,
    fadeEndMs: 0,
    fadeFrom: 0,
    fadeTo: 0,
    barY: 0,
    barStartY: 0,
    barEndY: 0,
    barStartMs: 0,
    barDurationMs: 4e3,
    noiseCanvas: null,
    noiseCtx: null,
    lcgState: 305419896
};

window.showMinimap = true;

function getMiniMapScale() {
    return 1 / (minimapScaleFactor * 10);
}

function updateMinimapSize() {
    const scale = getMiniMapScale();
    MINIMAP_WIDTH = Math.round(STD_MAP_WIDTH * scale);
    MINIMAP_HEIGHT = Math.round(STD_MAP_HEIGHT * scale);
}

function clampMinimapScale(value) {
    return Math.max(MINIMAP_SCALE_MIN, Math.min(MINIMAP_SCALE_MAX, value));
}

function setMinimapScale(newScale, options = {}) {
    const previous = minimapScaleFactor;
    const clamped = clampMinimapScale(Math.round(newScale));
    minimapScaleFactor = clamped;
    updateMinimapSize();
    invalidateMinimapLayoutCache();
    if (typeof moveTargetFromMinimap !== "undefined") {
        moveTargetFromMinimap = false;
    }
    window.minimapClickPointer = null;
    if (typeof refreshWindowsVisibility === "function") {
        refreshWindowsVisibility();
    }
    if ((clamped !== previous || options.forceSend) && typeof sendSetting === "function") {
        sendSetting("MINIMAP_SCALE", minimapScaleFactor);
    }
    if (options.message) {
        const msg = typeof options.message === "function" ? options.message(minimapScaleFactor, previous) : options.message;
        addInfoMessage(msg);
    }
    return {
        previous: previous,
        current: minimapScaleFactor,
        changed: clamped !== previous
    };
}

function zoomMinimapIn() {
    setMinimapScale(minimapScaleFactor - 1);
}

function zoomMinimapOut() {
    setMinimapScale(minimapScaleFactor + 1);
}

const FLASH_MAP_SCALE_STEP = 0.1;
const FLASH_MAP_SCALE_MIN = 0.7;
const FLASH_MAP_SCALE_MAX = 1.4;

let mapViewScale = 1;
let mapViewScaleTarget = 1;

function clampMapViewScale(value) {
    const numeric = Number.isFinite(value) ? value : 1;
    return Math.max(FLASH_MAP_SCALE_MIN, Math.min(FLASH_MAP_SCALE_MAX, numeric));
}

function getMapViewScaleValue() {
    return typeof mapViewScale === "number" && isFinite(mapViewScale) && mapViewScale > 0 ? mapViewScale : 1;
}

function getMapViewScaleTargetValue() {
    return typeof mapViewScaleTarget === "number" && isFinite(mapViewScaleTarget) && mapViewScaleTarget > 0 ? mapViewScaleTarget : getMapViewScaleValue();
}

function getMapViewRenderScale() {
    const world = typeof getWorldScaleValue === "function" ? getWorldScaleValue() : 1;
    return world * getMapViewScaleValue();
}

function setMapViewScale(newScale, options = {}) {
    const previousTarget = getMapViewScaleTargetValue();
    const clamped = clampMapViewScale(Number(newScale));
    mapViewScaleTarget = clamped;
    if (options.instant) {
        mapViewScale = clamped;
    }
    return {
        previous: previousTarget,
        current: clamped,
        changed: Math.abs(clamped - previousTarget) > 1e-6
    };
}

function increaseMapScale() {
    return setMapViewScale(getMapViewScaleTargetValue() + FLASH_MAP_SCALE_STEP);
}

function decreaseMapScale() {
    return setMapViewScale(getMapViewScaleTargetValue() - FLASH_MAP_SCALE_STEP);
}

function resetMapZoomFactor(options = {}) {
    return setMapViewScale(1, options);
}

function stepMapViewScaleAnimation(deltaMs) {
    const target = getMapViewScaleTargetValue();
    const current = getMapViewScaleValue();
    if (Math.abs(target - current) < 5e-4) {
        mapViewScale = target;
        return target;
    }
    const durationMs = 180;
    const step = Math.max(0, Number(deltaMs) || 0);
    const t = durationMs > 0 ? Math.min(1, step / durationMs) : 1;
    mapViewScale = current + (target - current) * t;
    if (Math.abs(target - mapViewScale) < 5e-4) {
        mapViewScale = target;
    }
    return mapViewScale;
}

window.getMapViewScaleValue = getMapViewScaleValue;
window.getMapViewScaleTargetValue = getMapViewScaleTargetValue;
window.getMapViewRenderScale = getMapViewRenderScale;
window.increaseMapScale = increaseMapScale;
window.decreaseMapScale = decreaseMapScale;
window.resetMapZoomFactor = resetMapZoomFactor;

function getMinimapLayout(isOpenOverride = null) {
    const isOpen = isOpenOverride !== null ? isOpenOverride : window.showMinimap !== false;
    const contentHeight = isOpen ? MINIMAP_HEIGHT + MINIMAP_INFO_HEIGHT : 0;
    const outerWidth = MINIMAP_WIDTH + MINIMAP_WINDOW_DIMENSION_PADDING;
    const outerHeight = contentHeight + MINIMAP_WINDOW_DIMENSION_PADDING;
    const mapWindowEl = document.getElementById("win_map");
    if (!mapWindowEl || !canvas) {
        return null;
    }

    const cacheKey = [
        isOpen ? 1 : 0,
        MINIMAP_WIDTH,
        MINIMAP_HEIGHT,
        minimapScaleFactor,
        displayScaleX,
        displayScaleY,
        mapWindowEl.style.left || "",
        mapWindowEl.style.top || "",
        mapWindowEl.style.width || "",
        mapWindowEl.style.height || "",
        mapWindowEl.style.display || "",
        mapWindowEl.dataset ? mapWindowEl.dataset.flashUserWidth || "" : "",
        mapWindowEl.dataset ? mapWindowEl.dataset.flashUserHeight || "" : ""
    ].join("|");

    if (minimapLayoutCache.key === cacheKey && minimapLayoutCache.value) {
        return minimapLayoutCache.value;
    }

    const canvasRect = canvas.getBoundingClientRect();
    if (!canvasRect) {
        return null;
    }

    const sx = canvasRect.width ? canvas.width / canvasRect.width : 1;
    const sy = canvasRect.height ? canvas.height / canvasRect.height : 1;
    const winRect = mapWindowEl.getBoundingClientRect();
    const headerEl = mapWindowEl.querySelector(".gwHeader");
    const headerRect = headerEl ? headerEl.getBoundingClientRect() : null;
    const contentEl = mapWindowEl.querySelector(".gwContent");
    const contentRect = contentEl ? contentEl.getBoundingClientRect() : null;
    const outerX = (winRect.left - canvasRect.left) * sx;
    const outerY = (winRect.top - canvasRect.top) * sy;
    const resolvedContentX = contentRect ? (contentRect.left - canvasRect.left) * sx : outerX;
    const resolvedContentY = contentRect ? (contentRect.top - canvasRect.top) * sy : outerY;
    const contentWidth = contentRect ? contentRect.width * sx : MINIMAP_WIDTH;
    const mapOffsetX = Math.round((contentWidth - MINIMAP_WIDTH) / 2);
    const mapX = resolvedContentX + mapOffsetX;
    const css = window.getComputedStyle(mapWindowEl);
    const bottomInsetRaw = parseInt(css.getPropertyValue("--resizer-bottom") || "0", 10);
    const bottomInset = Number.isFinite(bottomInsetRaw) ? Math.max(0, Math.round(bottomInsetRaw * sy)) : 0;
    const mapY = resolvedContentY + MINIMAP_INFO_HEIGHT - bottomInset;
    const zoomInBtn = mapWindowEl.querySelector(".zoomInBtn");
    const zoomOutBtn = mapWindowEl.querySelector(".zoomOutBtn");
    const atMin = typeof minimapScaleFactor !== "undefined" && typeof MINIMAP_SCALE_MIN !== "undefined" ? minimapScaleFactor <= MINIMAP_SCALE_MIN : false;
    const atMax = typeof minimapScaleFactor !== "undefined" && typeof MINIMAP_SCALE_MAX !== "undefined" ? minimapScaleFactor >= MINIMAP_SCALE_MAX : false;
    if (zoomInBtn && zoomInBtn.classList.contains("disabled") !== atMin) zoomInBtn.classList.toggle("disabled", atMin);
    if (zoomOutBtn && zoomOutBtn.classList.contains("disabled") !== atMax) zoomOutBtn.classList.toggle("disabled", atMax);

    const buttonHitbox = btn => {
        if (!btn) return null;
        const r = btn.getBoundingClientRect();
        return {
            x: (r.left - canvasRect.left) * sx,
            y: (r.top - canvasRect.top) * sy,
            w: r.width * sx,
            h: r.height * sy
        };
    };

    const layout = {
        outerX: outerX,
        outerY: outerY,
        outerWidth: winRect.width * sx,
        outerHeight: winRect.height * sy,
        contentX: mapX,
        contentY: resolvedContentY,
        mapY: mapY,
        infoHeight: MINIMAP_INFO_HEIGHT,
        bottomInset: bottomInset,
        headerY: outerY,
        headerHeight: headerRect ? headerRect.height * sy : MINIMAP_HEADER_HEIGHT,
        zoomInHitbox: isOpen ? buttonHitbox(zoomInBtn) : null,
        zoomOutHitbox: isOpen ? buttonHitbox(zoomOutBtn) : null,
        outerWidthExpected: outerWidth,
        outerHeightExpected: outerHeight
    };

    minimapLayoutCache.key = cacheKey;
    minimapLayoutCache.value = layout;
    return layout;
}

window.getMinimapLayout = getMinimapLayout;

window.getMinimapWindowBaseSize = function getMinimapWindowBaseSize() {
    return {
        width: MINIMAP_WIDTH + MINIMAP_WINDOW_DIMENSION_PADDING,
        height: MINIMAP_HEIGHT + MINIMAP_INFO_HEIGHT + MINIMAP_WINDOW_DIMENSION_PADDING
    };
};

window.getMinimapHoverState = () => minimapHoverState;

window.minimapServerMarkers = minimapServerMarkers;

function __interferenceRandUnit() {
    minimapInterference.lcgState = 1664525 * minimapInterference.lcgState + 1013904223 >>> 0;
    return minimapInterference.lcgState / 4294967296;
}

function __interferenceRandInt(min, max) {
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    return lo + Math.floor(__interferenceRandUnit() * (hi - lo + 1));
}

function __ensureMinimapInterferenceSurface(width, height) {
    const w = Math.max(1, width | 0);
    const h = Math.max(1, height | 0);
    if (!minimapInterference.noiseCanvas || minimapInterference.width !== w || minimapInterference.height !== h) {
        minimapInterference.noiseCanvas = document.createElement("canvas");
        minimapInterference.noiseCanvas.width = w;
        minimapInterference.noiseCanvas.height = h;
        minimapInterference.noiseCtx = minimapInterference.noiseCanvas.getContext("2d", {
            alpha: true
        });
        minimapInterference.width = w;
        minimapInterference.height = h;
    }
}

function __updateMinimapInterferenceNoise(nowMs) {
    if (!minimapInterference.noiseCtx) return;
    if (nowMs < minimapInterference.nextNoiseUpdateMs) return;
    minimapInterference.nextNoiseUpdateMs = nowMs + minimapInterference.updateInMsec;
    const w = minimapInterference.width;
    const h = minimapInterference.height;
    const image = minimapInterference.noiseCtx.createImageData(w, h);
    const data = image.data;
    for (let idx = 0; idx < data.length; idx += 4) {
        const v = __interferenceRandInt(0, 255);
        data[idx] = v;
        data[idx + 1] = v;
        data[idx + 2] = v;
        data[idx + 3] = __interferenceRandInt(0, 255);
    }
    minimapInterference.noiseCtx.putImageData(image, 0, 0);
}

function __startInterferenceFade(fromAlpha, toAlpha, nowMs) {
    minimapInterference.fading = toAlpha < fromAlpha ? "out" : "in";
    minimapInterference.fadeFrom = fromAlpha;
    minimapInterference.fadeTo = toAlpha;
    minimapInterference.fadeStartMs = nowMs;
    minimapInterference.fadeEndMs = nowMs + 250;
}

function __scheduleNextInterferenceFade(nowMs) {
    if (!minimapInterference.fadeOutEnabled) return;
    const delaySec = __interferenceRandInt(minimapInterference.minFadeOutSec, minimapInterference.maxFadeOutSec);
    minimapInterference.nextFadeActionMs = nowMs + delaySec * 1e3;
}

function __updateMinimapInterference(nowMs, width, height) {
    if (!minimapInterference.active) return;
    __ensureMinimapInterferenceSurface(width, height);
    __updateMinimapInterferenceNoise(nowMs);
    if (minimapInterference.durationUntilMs > 0 && nowMs >= minimapInterference.durationUntilMs) {
        minimapInterference.active = false;
        minimapInterference.alpha = minimapInterference.startAlpha;
        return;
    }
    if (minimapInterference.fadeOutEnabled) {
        if (minimapInterference.fading === "none" && nowMs >= minimapInterference.nextFadeActionMs) {
            __startInterferenceFade(minimapInterference.alpha, minimapInterference.startAlpha - minimapInterference.diff, nowMs);
        }
        if (minimapInterference.fading !== "none") {
            const span = Math.max(1, minimapInterference.fadeEndMs - minimapInterference.fadeStartMs);
            const t = Math.max(0, Math.min(1, (nowMs - minimapInterference.fadeStartMs) / span));
            minimapInterference.alpha = minimapInterference.fadeFrom + (minimapInterference.fadeTo - minimapInterference.fadeFrom) * t;
            if (t >= 1) {
                if (minimapInterference.fading === "out") {
                    const delayMs = __interferenceRandInt(minimapInterference.minFadeInMsec, minimapInterference.maxFadeInMsec);
                    minimapInterference.fading = "wait-in";
                    minimapInterference.nextFadeActionMs = nowMs + delayMs;
                } else if (minimapInterference.fading === "in") {
                    minimapInterference.fading = "none";
                    __scheduleNextInterferenceFade(nowMs);
                }
            }
        }
        if (minimapInterference.fading === "wait-in" && nowMs >= minimapInterference.nextFadeActionMs) {
            __startInterferenceFade(minimapInterference.alpha, minimapInterference.startAlpha, nowMs);
        }
    }
    const barH = Math.max(1, Math.floor(minimapInterference.height / 4));
    if (minimapInterference.barEndY <= minimapInterference.barStartY) {
        minimapInterference.barStartY = -barH;
        minimapInterference.barEndY = minimapInterference.height;
        minimapInterference.barStartMs = nowMs;
    }
    const progress = Math.max(0, Math.min(1, (nowMs - minimapInterference.barStartMs) / minimapInterference.barDurationMs));
    const eased = 1 - Math.pow(1 - progress, 2);
    minimapInterference.barY = minimapInterference.barStartY + (minimapInterference.barEndY - minimapInterference.barStartY) * eased;
    if (progress >= 1) {
        minimapInterference.barStartY = -barH;
        minimapInterference.barEndY = minimapInterference.height;
        minimapInterference.barStartMs = nowMs;
        minimapInterference.barY = minimapInterference.barStartY;
    }
}

window.__setMinimapNoise = function setMinimapNoise(durationMs, width, height) {
    const nowMs = performance.now();
    const duration = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
    __ensureMinimapInterferenceSurface(Number.isFinite(width) ? width : MINIMAP_WIDTH, Number.isFinite(height) ? height : MINIMAP_HEIGHT);
    minimapInterference.active = true;
    minimapInterference.startAlpha = .2;
    minimapInterference.alpha = minimapInterference.startAlpha;
    minimapInterference.diff = .5;
    minimapInterference.updateInMsec = 50;
    minimapInterference.fadeOutEnabled = true;
    minimapInterference.durationMs = duration;
    minimapInterference.durationUntilMs = duration > 0 ? nowMs + duration : 0;
    minimapInterference.nextNoiseUpdateMs = nowMs;
    minimapInterference.fading = "none";
    minimapInterference.fadeStartMs = nowMs;
    minimapInterference.fadeEndMs = nowMs;
    minimapInterference.fadeFrom = minimapInterference.startAlpha;
    minimapInterference.fadeTo = minimapInterference.startAlpha;
    minimapInterference.barEndY = 0;
    minimapInterference.barStartY = 0;
    minimapInterference.barStartMs = nowMs;
    minimapInterference.lcgState = ((duration | 0) ^ MINIMAP_WIDTH << 8 ^ MINIMAP_HEIGHT << 16 ^ 2654435769) >>> 0;
    __scheduleNextInterferenceFade(nowMs);
};

window.__getMinimapInterferenceState = function getMinimapInterferenceState(nowMs, width, height) {
    const now = Number.isFinite(nowMs) ? nowMs : performance.now();
    __updateMinimapInterference(now, Number.isFinite(width) ? width : MINIMAP_WIDTH, Number.isFinite(height) ? height : MINIMAP_HEIGHT);
    if (!minimapInterference.active || !minimapInterference.noiseCanvas) return null;
    return {
        canvas: minimapInterference.noiseCanvas,
        alpha: minimapInterference.alpha,
        barY: minimapInterference.barY,
        barAlpha: .5,
        barHeight: Math.max(1, Math.floor(minimapInterference.height / 4))
    };
};

updateMinimapSize();

const PORTAL_JUMP_DISTANCE = 400;

const PORTAL_ACTIVE_DURATION = 6e3;

const VIEW_RADIUS = 1600;

const VIEW_RADIUS_SQ = VIEW_RADIUS * VIEW_RADIUS;

const LASER_MAX_RANGE = 700;

const LASER_BEAM_DURATION = 150;

const ROCKET_BEAM_DURATION = 700;

const DAMAGE_BUBBLE_DURATION = 1500;

const ISH_DURATION_MS = 3e3;

const INVINCIBILITY_DURATION_MS = 3e3;

const TARGET_FADE_OVERLAY_ALPHA = 0;

const TARGET_FADE_OVERLAY_RADIUS = 26;

const ORE_TYPE_SPRITES = {
    30: "oreRed",
    31: "oreBlue",
    32: "oreYellow"
};

const OBJECT_TYPE_META = {
    0: {
        label: "CargoBox (not free)",
        category: "cargoNotFree",
        kind: "box"
    },
    1: {
        label: "CargoBox / SpaceballBox",
        category: "cargoFree",
        kind: "box"
    },
    2: {
        label: "BonusBox",
        category: "bonusBox",
        kind: "box"
    },
    10: {
        label: "ShieldBox",
        category: "buffBox",
        kind: "box"
    },
    19: {
        label: "LifeBox",
        category: "buffBox",
        kind: "box"
    },
    21: {
        label: "BootyBox",
        category: "bootyBox",
        kind: "box"
    },
    23: {
        label: "RedBootyBox",
        category: "bootyBox",
        kind: "box"
    },
    24: {
        label: "GoldBootyBox",
        category: "bootyBox",
        kind: "box"
    },
    26: {
        label: "ApocalypseBox",
        category: "bootyBox",
        kind: "box"
    },
    25: {
        label: "SilverBootyKey",
        category: "bootyKey",
        kind: "box"
    },
    30: {
        label: "Ore (Prometium)",
        category: "ore",
        kind: "box",
        oreSprite: ORE_TYPE_SPRITES[30]
    },
    31: {
        label: "Ore (Endurium)",
        category: "ore",
        kind: "box",
        oreSprite: ORE_TYPE_SPRITES[31]
    },
    32: {
        label: "Ore (Terbium)",
        category: "ore",
        kind: "box",
        oreSprite: ORE_TYPE_SPRITES[32]
    }
};

const VISIBILITY_SETTINGS = {
    bonusBoxes: true,
    freeCargo: true,
    notFreeCargo: true,
    ore: true,
    beacons: true,
    mines: true,
    others: true
};

const HERO_HUD_X = 10;

const HERO_HUD_Y = 10;

const HERO_HUD_WIDTH = 260;

const HERO_HUD_HEIGHT = 110;

const HERO_REPAIR_BTN_WIDTH = 80;

const HERO_REPAIR_BTN_HEIGHT = 22;

const groupMembers = {};

let groupLeaderId = null;

let groupInvitationBehavior = 0;

let groupInGroupServerState = false;

let pendingGroupInvite = null;

const groupIncomingInvites = {};

const groupOutgoingInvites = {};

let groupPingMode = false;

const groupPings = [];

const minimapGroupPings = groupPings;

const DEFAULT_LOGICAL_WIDTH = LOGICAL_WIDTH;

const DEFAULT_LOGICAL_HEIGHT = LOGICAL_HEIGHT;

let canvas = document.getElementById("gameCanvas");

if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "gameCanvas";
    canvas.width = DEFAULT_LOGICAL_WIDTH;
    canvas.height = DEFAULT_LOGICAL_HEIGHT;
    document.body.appendChild(canvas);
}

let clientResolution = {
    id: 1,
    width: DEFAULT_LOGICAL_WIDTH,
    height: DEFAULT_LOGICAL_HEIGHT
};

let worldScale = 1;

let displayScaleX = 1;

let displayScaleY = 1;

let hudRoot = null;

function ensureHudRoot(logicalW, logicalH) {
    if (!hudRoot) {
        hudRoot = document.getElementById("hudRoot");
        if (!hudRoot) {
            hudRoot = document.createElement("div");
            hudRoot.id = "hudRoot";
            document.body.appendChild(hudRoot);
        }
        if (!document.getElementById("style-hud-root")) {
            const st = document.createElement("style");
            st.id = "style-hud-root";
            st.textContent = `\n                    #hudRoot {\n                        position: fixed;\n                        left: 0;\n                        top: 0;\n                        transform-origin: 0 0;\n                        pointer-events: none;\n                        z-index: 9000;\n                    }\n                    #hudRoot > * { pointer-events: auto; }\n                `;
            document.head.appendChild(st);
        }
    }
    hudRoot.style.width = `${logicalW}px`;
    hudRoot.style.height = `${logicalH}px`;
    hudRoot.style.transform = `scale(${displayScaleX}, ${displayScaleY})`;
    return hudRoot;
}

window.getHudScaleX = () => typeof displayScaleX === "number" && isFinite(displayScaleX) && displayScaleX > 0 ? displayScaleX : 1;

window.getHudScaleY = () => typeof displayScaleY === "number" && isFinite(displayScaleY) && displayScaleY > 0 ? displayScaleY : 1;

window.getHudRoot = () => ensureHudRoot(clientResolution.width || DEFAULT_LOGICAL_WIDTH, clientResolution.height || DEFAULT_LOGICAL_HEIGHT);

window.appendToHud = el => {
    const root = window.getHudRoot && window.getHudRoot();
    (root || document.body).appendChild(el);
};

window.clientToHudCoords = (clientX, clientY) => {
    const root = window.getHudRoot && window.getHudRoot();
    if (!root) return {
        x: clientX,
        y: clientY
    };
    const rr = root.getBoundingClientRect();
    const sx = window.getHudScaleX ? window.getHudScaleX() : 1;
    const sy = window.getHudScaleY ? window.getHudScaleY() : 1;
    return {
        x: (clientX - rr.left) / sx,
        y: (clientY - rr.top) / sy
    };
};

window.getHudElementPos = el => {
    if (!el) return {
        x: 0,
        y: 0
    };
    const root = window.getHudRoot && window.getHudRoot();
    if (!root) return {
        x: el.offsetLeft || 0,
        y: el.offsetTop || 0
    };
    const er = el.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    const sx = window.getHudScaleX ? window.getHudScaleX() : 1;
    const sy = window.getHudScaleY ? window.getHudScaleY() : 1;
    return {
        x: (er.left - rr.left) / sx,
        y: (er.top - rr.top) / sy
    };
};

const ctx = canvas.getContext("2d");

function parseClientResolution(raw) {
    if (!raw) return null;
    const parts = String(raw).split(/[|,xX]/).filter(Boolean);
    if (parts.length < 1) return null;
    const id = parseInt(parts[0], 10);
    return {
        id: isNaN(id) ? clientResolution.id : id,
        width: LOGICAL_WIDTH,
        height: LOGICAL_HEIGHT
    };
}

function refreshCanvasScale() {
    const logicalW = clientResolution.width || DEFAULT_LOGICAL_WIDTH;
    const logicalH = clientResolution.height || DEFAULT_LOGICAL_HEIGHT;
    if (canvas.width !== logicalW || canvas.height !== logicalH) {
        canvas.width = logicalW;
        canvas.height = logicalH;
    }
    const targetW = window.innerWidth || logicalW;
    const targetH = window.innerHeight || logicalH;
    displayScaleX = targetW / logicalW || 1;
    displayScaleY = targetH / logicalH || 1;
    canvas.style.width = `${logicalW * displayScaleX}px`;
    canvas.style.height = `${logicalH * displayScaleY}px`;
    worldScale = Math.min(logicalW / LOGICAL_WIDTH, logicalH / LOGICAL_HEIGHT) || 1;
    ensureHudRoot(logicalW, logicalH);
    invalidateMinimapLayoutCache();
}

function getWorldScaleValue() {
    return typeof worldScale === "number" && isFinite(worldScale) && worldScale > 0 ? worldScale : 1;
}

function getEntityDrawScale() {
    return 1;
}

function applyClientResolution(raw) {
    const parsed = parseClientResolution(raw);
    if (!parsed) return;
    clientResolution = parsed;
    refreshCanvasScale();
}

function updateMapDimensions(scale = 1) {
    mapScaleFactor = scale || 1;
    MAP_MAX_X = STD_MAP_WIDTH * mapScaleFactor;
    MAP_MAX_Y = STD_MAP_HEIGHT * mapScaleFactor;
    MAP_WIDTH = MAP_MAX_X - MAP_MIN_X;
    MAP_HEIGHT = MAP_MAX_Y - MAP_MIN_Y;
    updateMinimapSize();
    invalidateMinimapLayoutCache();
}

refreshCanvasScale();

window.addEventListener("resize", refreshCanvasScale);

function getMapScaleFactor(mapId) {
    return MAP_SCALE_FACTORS[mapId] || 1;
}

function getBackgroundTypeForMap(mapId) {
    if (mapId == null) return null;
    return MAP_BACKGROUND_TYPES[mapId] || null;
}

function getBackgroundParallaxForMap(mapId) {
    if (mapId == null) return DEFAULT_BACKGROUND_PARALLAX;
    return MAP_BACKGROUND_PARALLAX[mapId] || DEFAULT_BACKGROUND_PARALLAX;
}

const BACKGROUND_TYPE_ALIASES = {
    layer1: 1001,
    layer2: 1002
};

const BACKGROUND_PATH_OVERRIDES = {
    1001: "graphics/backgrounds/layer1/1_background.png",
    1002: "graphics/backgrounds/layer2/1_background.png"
};

function parseBooleanValue(value, fallback = false) {
    if (value == null) return fallback;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return fallback;
    return normalized === "true" || normalized === "1" || normalized === "yes";
}

function parseColorValue(raw, fallback = STARFIELD_DEFAULT_COLOR) {
    if (raw == null) return fallback;
    let normalized = String(raw).trim();
    if (!normalized) return fallback;
    const isHexHint = normalized.startsWith("#") || normalized.toLowerCase().startsWith("0x");
    if (normalized.startsWith("#")) normalized = normalized.slice(1);
    if (normalized.toLowerCase().startsWith("0x")) normalized = normalized.slice(2);
    const primaryRadix = isHexHint ? 16 : 10;
    const primary = parseInt(normalized, primaryRadix);
    if (!Number.isNaN(primary)) return primary;
    const fallbackParsed = parseInt(normalized, 16);
    return Number.isNaN(fallbackParsed) ? fallback : fallbackParsed;
}

function normalizeBackgroundType(rawType) {
    if (rawType == null) return null;
    const asNumber = parseInt(rawType, 10);
    if (!Number.isNaN(asNumber)) return asNumber;
    const aliasKey = String(rawType);
    return BACKGROUND_TYPE_ALIASES[aliasKey] || null;
}

function getBackgroundImagePath(typeId) {
    if (!typeId) return null;
    if (BACKGROUND_PATH_OVERRIDES[typeId]) return BACKGROUND_PATH_OVERRIDES[typeId];
    return `graphics/backgrounds/background${typeId}/1_background.png`;
}

function getBackgroundShiftForMap(mapId) {
    return {
        x: 0,
        y: 0
    };
}

function parseMapsXml(text) {
    try {
        const parser = new DOMParser;
        const xml = parser.parseFromString(text, "text/xml");
        const mapNodes = xml.getElementsByTagName("map");
        const parsed = {};
        mapStarfieldSettingsById = {};
        Array.from(mapNodes).forEach(mapNode => {
            const mapId = parseInt(mapNode.getAttribute("id"), 10);
            if (Number.isNaN(mapId)) return;
            const starfieldNode = mapNode.getElementsByTagName("starfield")[0];
            if (starfieldNode) {
                const enabled = parseBooleanValue(starfieldNode.textContent, DEFAULT_STARFIELD_ENABLED);
                const color = parseColorValue(starfieldNode.getAttribute("color"), STARFIELD_DEFAULT_COLOR);
                mapStarfieldSettingsById[mapId] = {
                    enabled: enabled,
                    color: color
                };
            } else {
                mapStarfieldSettingsById[mapId] = {
                    enabled: DEFAULT_STARFIELD_ENABLED,
                    color: STARFIELD_DEFAULT_COLOR
                };
            }
            const backgroundsNode = mapNode.getElementsByTagName("backgrounds")[0];
            if (!backgroundsNode) return;
            const layers = [];
            Array.from(backgroundsNode.getElementsByTagName("background")).forEach(bgNode => {
                const rawType = bgNode.getAttribute("typeID") || bgNode.getAttribute("type");
                const typeId = normalizeBackgroundType(rawType);
                if (typeId == null) return;
                const layerIndex = parseInt(bgNode.getAttribute("layer"), 10);
                const pFactorRaw = parseFloat(bgNode.getAttribute("pFactor"));
                const shiftX = parseFloat(bgNode.getAttribute("shiftX")) || 0;
                const shiftY = parseFloat(bgNode.getAttribute("shiftY")) || 0;
                layers.push({
                    typeId: typeId,
                    layer: Number.isNaN(layerIndex) ? 0 : layerIndex,
                    parallax: Number.isNaN(pFactorRaw) ? null : pFactorRaw,
                    shiftX: shiftX,
                    shiftY: shiftY
                });
            });
            if (layers.length) {
                parsed[mapId] = layers;
            }
        });
        return parsed;
    } catch (err) {
        console.warn("Failed to parse maps.php for layers", err);
        return {};
    }
}

function ensureMapsXmlLoaded(cfg = {}) {
    if (mapsXmlPromise) return mapsXmlPromise;
    if (typeof fetch !== "function") return Promise.resolve();
    const mapsUrl = cfg.mapsXmlUrl || "../spacemap/xml/maps.php";
    mapsXmlPromise = fetchBootXmlText(mapsUrl).then(text => {
        mapBackgroundLayersById = parseMapsXml(text);
        if (currentMapId != null) {
            applyMapBackground(currentMapId, {
                force: true
            });
        }
    }).catch(err => {
        console.warn("Failed to load maps.php, using static fallback", err);
    });
    return mapsXmlPromise;
}

function parseProfileXml(text) {
    try {
        const parser = new DOMParser;
        const xmlDoc = parser.parseFromString(text, "text/xml");
        const readNumericValue = selector => {
            const node = xmlDoc.querySelector(selector);
            if (!node) return null;
            const raw = node.getAttribute("value") || node.getAttribute("val") || node.textContent;
            if (raw == null) return null;
            const parsed = parseInt(String(raw).trim(), 10);
            return Number.isFinite(parsed) ? parsed : null;
        };
        const notificationSteps = [];
        const stepsNode = xmlDoc.querySelector("notificationSteps");
        if (stepsNode) {
            const stepNodes = stepsNode.querySelectorAll("step, value, notificationStep");
            if (stepNodes.length) {
                stepNodes.forEach(step => {
                    const raw = step.getAttribute("value") || step.textContent;
                    const parsed = parseInt(String(raw || "").trim(), 10);
                    if (Number.isFinite(parsed)) notificationSteps.push(parsed);
                });
            } else if (stepsNode.textContent) {
                stepsNode.textContent.split(/[,\s]+/).map(item => parseInt(item.trim(), 10)).filter(value => Number.isFinite(value)).forEach(value => notificationSteps.push(value));
            }
        }
        return {
            qualityLowLimit: readNumericValue("qualityLowLimit"),
            intervalLength: readNumericValue("intervalLength"),
            notificationSteps: notificationSteps
        };
    } catch (err) {
        console.warn("[PROFILE] Failed to parse profile.xml", err);
        return {
            qualityLowLimit: null,
            intervalLength: null,
            notificationSteps: []
        };
    }
}

function loadProfileXml(cfg = {}) {
    if (profileXmlPromise) return profileXmlPromise;
    if (typeof fetch !== "function") return Promise.resolve(profileXmlConfig);
    const profileUrl = cfg.profileXmlUrl || "../spacemap/xml/profile.xml";
    profileXmlPromise = fetchBootXmlText(profileUrl).then(text => {
        profileXmlConfig = parseProfileXml(text);
        window.profileXmlConfig = profileXmlConfig;
        return profileXmlConfig;
    }).catch(err => {
        console.warn("[PROFILE] Failed to load profile.xml", err);
        return profileXmlConfig;
    });
    return profileXmlPromise;
}

function parseResourcesXml(text) {
    const parser = new DOMParser;
    const xmlDoc = parser.parseFromString(text, "text/xml");
    const locations = {};
    xmlDoc.querySelectorAll("location").forEach(locationNode => {
        const id = locationNode.getAttribute("id");
        const path = locationNode.getAttribute("path");
        if (id && path) {
            locations[id] = path;
        }
    });
    const files = {};
    xmlDoc.querySelectorAll("file").forEach(fileNode => {
        const id = fileNode.getAttribute("id");
        if (!id) return;
        const locationId = fileNode.getAttribute("location");
        const name = fileNode.getAttribute("name");
        const type = fileNode.getAttribute("type");
        const basePath = locationId && locations[locationId] ? locations[locationId] : "";
        const fileName = [ name, type ].filter(Boolean).join(".");
        const url = basePath ? `${basePath}${fileName}` : fileName;
        files[id] = Object.freeze({
            id: id,
            location: locationId || null,
            name: name || null,
            type: type || null,
            url: url
        });
    });
    return createResourcesManifest(locations, files);
}

function loadResourcesXml(cfg = {}) {
    if (resourcesXmlPromise) return resourcesXmlPromise;
    if (typeof fetch !== "function") return Promise.resolve(window.ResourcesManifest);
    const resourcesUrl = cfg.resourcesXmlUrl || "../spacemap/xml/resources.xml";
    resourcesXmlPromise = fetchBootXmlText(resourcesUrl).then(text => {
        window.ResourcesManifest = parseResourcesXml(text);
        return window.ResourcesManifest;
    }).catch(err => {
        console.warn("[RESOURCES] Failed to load resources.xml", err);
        return window.ResourcesManifest;
    });
    return resourcesXmlPromise;
}

function recomputeBackgroundOffsets(layer) {
    const {image: image, parallax: parallax, shiftX: shiftX, shiftY: shiftY} = layer;
    if (!image || !image.complete || image.width === 0 || image.height === 0) return;
    const effectiveParallax = parallax || DEFAULT_BACKGROUND_PARALLAX;
    const expectedWidth = MAP_WIDTH / effectiveParallax;
    const expectedHeight = MAP_HEIGHT / effectiveParallax;
    const offsetX = Math.round((expectedWidth - image.width) / 2) + shiftX;
    const offsetY = Math.round((expectedHeight - image.height) / 2) + shiftY;
    layer.offsets = {
        x: offsetX,
        y: offsetY
    };
}

function loadBackgroundLayer(layer) {
    const path = getBackgroundImagePath(layer.typeId);
    if (!path) {
        layer.image = null;
        layer.offsets = {
            x: layer.shiftX || 0,
            y: layer.shiftY || 0
        };
        return;
    }
    if (!layer.image || layer.image.__bgPath !== path) {
        const img = andromedaCreateImage(path);
        img.__bgPath = path;
        if (!img.complete) {
            img.addEventListener("load", () => recomputeBackgroundOffsets(layer), {
                once: true
            });
        }
        layer.image = img;
    }
    if (layer.image && layer.image.complete) {
        recomputeBackgroundOffsets(layer);
    }
}

function setBackgroundLayers(mapId, layers) {
    const shift = getBackgroundShiftForMap(mapId);
    currentBackgroundLayers = layers.map(layer => ({
        typeId: layer.typeId,
        layer: layer.layer ?? 0,
        parallax: layer.parallax || getBackgroundParallaxForMap(mapId),
        shiftX: (layer.shiftX || 0) + (shift.x || 0),
        shiftY: (layer.shiftY || 0) + (shift.y || 0),
        offsets: {
            x: 0,
            y: 0
        },
        image: null
    })).sort((a, b) => (a.layer || 0) - (b.layer || 0));
    currentBackgroundLayers.forEach(loadBackgroundLayer);
}

function getBackgroundLayersForMap(mapId) {
    const fromXml = mapBackgroundLayersById[mapId];
    if (fromXml && fromXml.length) return fromXml;
    const fallbackType = getBackgroundTypeForMap(mapId);
    if (!fallbackType) return [];
    return [ {
        typeId: fallbackType,
        layer: 0,
        parallax: getBackgroundParallaxForMap(mapId),
        shiftX: 0,
        shiftY: 0
    } ];
}

function getStarfieldSettingsForMap(mapId) {
    if (mapStarfieldSettingsById && mapStarfieldSettingsById[mapId]) {
        return mapStarfieldSettingsById[mapId];
    }
    return {
        enabled: DEFAULT_STARFIELD_ENABLED,
        color: STARFIELD_DEFAULT_COLOR
    };
}

function applyMapStarfield(mapId) {
    const settings = getStarfieldSettingsForMap(mapId);
    starfieldEnabled = settings.enabled;
    starfieldColor = settings.color;
    if (typeof setStarfieldStateFromMap === "function") {
        setStarfieldStateFromMap(mapId, settings);
    }
}

function applyMapBackground(mapId, options = {}) {
    currentMapId = mapId;
    updateMapDimensions(getMapScaleFactor(mapId));
    const layers = getBackgroundLayersForMap(mapId);
    setBackgroundLayers(mapId, layers);
    applyMapStarfield(mapId);
    if (!options.skipLoadXml) {
        ensureMapsXmlLoaded();
    }
}

canvas.addEventListener("contextmenu", e => e.preventDefault());

let shipX = 1e3;

let shipY = 1e3;

let logoutControlsLocked = false;

let cameraX = shipX;

let cameraY = shipY;

let heroId = 0;

if (window.ANDROMEDA_CONFIG && window.ANDROMEDA_CONFIG.userID) {
    heroId = parseInt(window.ANDROMEDA_CONFIG.userID, 10);
} else {
    console.error("[SYSTEM] CRITICAL ERROR: ID not found!");
}

let heroShipId = 0;

let heroName = "";

let heroPremium = false;

let heroClanId = null;

let heroClanTag = "";

let heroGrade = "";

let heroRankId = 0;

let heroGalaxyGatesFinished = 0;

let heroConfig = 1;

let heroExpansionTypeId = 0;

let heroLaserSalvoIndex = 0;

let currentAmmoId = null;

let primaryAmmoId = null;

let currentRocketId = null;

const RSB_AMMO_ID = 6;

const SAB_AMMO_ID = 5;

let SAB_SHOT_DURATION_MS = 1e3;

let setting_show_drones = true;

let setting_show_player_names = true;

let setting_play_sfx = true;

let setting_play_music = true;

let setting_auto_refinement = false;

let setting_doubleclick_attack = false;

let isChasingTarget = false;

let ammoStock = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    101: 0,
    102: 0,
    9: 0,
    10: 0,
    11: 0,
    12: 0,
    13: 0,
    14: 0,
    15: 0,
    16: 0,
    17: 0,
    18: 0,
    19: 0,
    20: 0,
    21: 0,
    22: 0,
    23: 0,
    24: 0,
    25: 0,
    26: 0,
    30: 0,
    31: 0,
    32: 0
};

window.heroFactionId = 0;

let heroIshActive = false;

let heroIshUntil = 0;

let heroIshSince = 0;

let heroInvincible = false;

let heroInvUntil = 0;

let heroInvSince = 0;

let heroShieldBackupUntil = 0;

let heroShieldBackupStartedAt = 0;

const FLASH_SHIELD_BACKUP_FADE_IN_MS = 250;

const FLASH_SHIELD_BACKUP_HOLD_MS = 1000;

const FLASH_SHIELD_BACKUP_FADE_OUT_MS = 250;

const FLASH_SHIELD_BACKUP_VISUAL_MS = FLASH_SHIELD_BACKUP_FADE_IN_MS + FLASH_SHIELD_BACKUP_HOLD_MS + FLASH_SHIELD_BACKUP_FADE_OUT_MS;

let heroEmpImmunityUntil = 0;

let heroCombatLogActiveTargetId = null;

let heroCloaked = false;

let heroTargetFaded = false;

let heroTargetFadeUntil = 0;

const cpuItems = {
    HM7: {
        hasItem: false,
        amount: 0
    },
    SMB: {
        hasItem: null,
        level: 0
    },
    ISH: {
        hasItem: null,
        level: 0
    },
    AMB: {
        hasItem: false,
        amount: 0,
        level: 1,
        state: false
    },
    RKB: {
        hasItem: false,
        amount: 0,
        level: 1,
        state: false
    },
    CLK: {
        hasItem: null,
        amount: 0,
        level: 1
    },
    ARL: {
        hasItem: null,
        amount: 0,
        level: 1,
        state: false
    },
    ROB: {
        hasItem: null,
        amount: 0,
        level: 1,
        state: false
    },
    RLC: {
        hasItem: false,
        amount: 0,
        level: 1,
        state: false
    }
};

if (typeof window.heroSkillAvailability === "undefined" || !window.heroSkillAvailability) {
    window.heroSkillAvailability = Object.create(null);
}
if (typeof window.heroRocketLauncherType !== "number") {
    window.heroRocketLauncherType = 0;
}
if (typeof window.heroSelectedLauncherRocket !== "number") {
    window.heroSelectedLauncherRocket = 7;
}
if (typeof window.heroRocketLauncherRocketsLoaded !== "number") {
    window.heroRocketLauncherRocketsLoaded = 0;
}
if (typeof window.heroRocketLauncherAutoCpuState !== "number") {
    window.heroRocketLauncherAutoCpuState = 0;
}
if (typeof window.heroSelectedQuickBuyIcon !== "number") {
    window.heroSelectedQuickBuyIcon = 1;
}
if (typeof window.heroTechRuntimeState === "undefined" || !window.heroTechRuntimeState) {
    window.heroTechRuntimeState = Object.create(null);
}
if (typeof window.heroTechCooldownMeta === "undefined" || !window.heroTechCooldownMeta) {
    window.heroTechCooldownMeta = Object.create(null);
}
if (typeof window.heroSkillRuntimeState === "undefined" || !window.heroSkillRuntimeState) {
    window.heroSkillRuntimeState = Object.create(null);
}

let heroHp = null;

if (typeof window.FLASH_PARITY_DEBUG === "undefined") {
    window.FLASH_PARITY_DEBUG = 0;
}

window.flashParityDebugLog = function(category, payload) {
    if (!window.FLASH_PARITY_DEBUG) return;
    try {
        console.log(`[FLASH_PARITY_DEBUG][${category}]`, payload);
    } catch (_) {}
};

let groupInvitesBlocked = false;

let heroMaxHp = null;

let heroShield = null;

let heroMaxShield = null;

let heroShowSkinShieldRandomly = false;

let heroMinSkinShieldTwinkle = 0;

let heroMaxSkinShieldTwinkle = 0;

let heroShieldTwinkleTimeoutId = null;

let heroRepairing = false;

let heroBattleRepairing = false;

let heroBattleRepairUntil = 0;

let heroBattleRepairFadeUntil = 0;

const BATTLE_REPAIR_FADE_MS = 250;

let heroCargo = null;

let heroMaxCargo = null;

let heroShieldDamageCount = 0;

function setHeroRepairing(active) {
    const next = !!active;
    if (heroRepairing === next) return;
    heroRepairing = next;
    try {
        if (window.AudioManager) {
            window.__repairLoopToken = (window.__repairLoopToken || 0) + 1;
            const token = window.__repairLoopToken;
            if (next) {
                if (!window.__repairLoopCh && typeof window.AudioManager.playSoundEffect === "function") {
                    const p = window.AudioManager.playSoundEffect(35, true, false, -1, -1, true);
                    if (p && typeof p.then === "function") {
                        p.then(ch => {
                            if (!ch) return;
                            if (window.__repairLoopToken !== token || !heroRepairing) {
                                try {
                                    window.AudioManager.removeLoop(ch, false);
                                } catch (_) {}
                                return;
                            }
                            window.__repairLoopCh = ch;
                        });
                    }
                }
            } else {
                if (window.__repairLoopCh && typeof window.AudioManager.removeLoop === "function") {
                    window.AudioManager.removeLoop(window.__repairLoopCh, false);
                }
                window.__repairLoopCh = null;
            }
        }
    } catch (_) {}
    if (next) {
        if (typeof startRepairRobotAnimation === "function") {
            startRepairRobotAnimation();
        }
    } else if (typeof stopRepairRobotAnimation === "function") {
        stopRepairRobotAnimation();
    }
    if (typeof renderActionDrawerItems === "function") {
        renderActionDrawerItems();
    }
}

function setHeroBattleRepairing(active, durationMs = null) {
    const next = !!active;
    const now = performance.now();
    if (heroBattleRepairing === next) {
        if (next && Number.isFinite(durationMs) && durationMs > 0) {
            const newUntil = now + durationMs;
            heroBattleRepairUntil = heroBattleRepairUntil ? Math.max(heroBattleRepairUntil, newUntil) : newUntil;
        }
        return;
    }
    if (next) {
        heroBattleRepairing = true;
        heroBattleRepairFadeUntil = 0;
        heroBattleRepairUntil = Number.isFinite(durationMs) && durationMs > 0 ? now + durationMs : 0;
        if (typeof startBattleRepairRobotAnimation === "function") {
            startBattleRepairRobotAnimation();
        }
        try {
            if (window.AudioManager) {
                window.__battleRepairLoopToken = (window.__battleRepairLoopToken || 0) + 1;
                const token = window.__battleRepairLoopToken;
                if (!window.__battleRepairLoopCh && typeof window.AudioManager.playSoundEffect === "function") {
                    const p = window.AudioManager.playSoundEffect(35, true, false, -1, -1, true);
                    if (p && typeof p.then === "function") {
                        p.then(ch => {
                            if (!ch) return;
                            if (window.__battleRepairLoopToken !== token || !heroBattleRepairing) {
                                try {
                                    window.AudioManager.removeLoop(ch, false);
                                } catch (_) {}
                                return;
                            }
                            window.__battleRepairLoopCh = ch;
                        });
                    }
                }
            }
        } catch (_) {}
    } else {
        heroBattleRepairing = false;
        heroBattleRepairUntil = 0;
        heroBattleRepairFadeUntil = now + BATTLE_REPAIR_FADE_MS;
        try {
            if (window.AudioManager) {
                window.__battleRepairLoopToken = (window.__battleRepairLoopToken || 0) + 1;
                if (window.__battleRepairLoopCh && typeof window.AudioManager.removeLoop === "function") {
                    window.AudioManager.removeLoop(window.__battleRepairLoopCh, false);
                }
                window.__battleRepairLoopCh = null;
            }
        } catch (_) {}
    }
}

let heroLevel = 1;

let heroXp = 0;

let heroHonor = 0;

let heroCredits = 0;

let heroUridium = 0;

let heroJackpot = 0;

let heroBootyKeys = 0;

let heroJumpVouchers = 0;

let heroSpeed = cfg.heroSpeed !== undefined ? Number(cfg.heroSpeed) || 3e3 : 3e3;

let heroAngle = 0;

let mapPvpAllowed = 1;

currentMapId = cfg.mapID || 0;

let lastNoAttackZoneTime = 0;

let lastDemilitarizedState = false;

let lastTradeZoneState = false;

let inDemilitarizedZone = false;

let inTradeZone = false;

let inJumpZone = false;

let radiationServerFlag = false;

let radiationWarningActive = false;

let radiationFade = 0;

let radiationPulseStart = 0;

let radiationWarningTimer = null;

let radiationFlashAlpha = 0;

applyMapBackground(currentMapId);

let quickbarPosition = {
    x: 0,
    y: 0
};

let quickbarLayoutMode = 0;

let isDraggingQuickbar = false;

let quickbarDragOffset = {
    x: 0,
    y: 0
};

let quickbarRotateHitbox = null;

let quickbarInitialized = false;

let quickbarMinimized = false;

let quickbarMinHitbox = null;

let quickbarDraggerHitbox = null;

let activeTooltip = null;

let quickSlots = {
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
    6: null,
    7: null,
    8: null,
    9: null,
    10: null
};

let draggedActionItem = null;

let quickbarLocked = true;

let quickbarBounds = null;

let quickbarLockHitbox = null;

const quickbarSlotHitboxes = {};

let keyBindings = {
    Digit1: 1,
    Digit2: 2,
    Digit3: 3,
    Digit4: 4,
    Digit5: 5,
    Digit6: 6,
    Digit7: 7,
    Digit8: 8,
    Digit9: 9,
    Digit0: 10,
    F1: 5,
    F2: 6,
    F5: 9,
    F6: 10
};

const ACTION_COOLDOWN_STORAGE_KEY = "andromeda_action_cooldowns";

const actionCooldowns = {};

const ACTION_COOLDOWN_PERSIST_DELAY_MS = 450;

let actionCooldownPersistTimer = null;

let actionCooldownPersistDirty = false;

const actionBlacklist = new Set;

function restorePersistedCooldowns() {
    try {
        const raw = localStorage.getItem(ACTION_COOLDOWN_STORAGE_KEY);
        if (!raw) return;
        const stored = JSON.parse(raw);
        const nowSeconds = Date.now() / 1e3;
        let changed = false;
        Object.keys(stored || {}).forEach(code => {
            const entry = stored[code];
            if (!entry || typeof entry.endTime !== "number") return;
            const remaining = entry.endTime - nowSeconds;
            const total = entry.duration || remaining;
            if (remaining > 0 && total > 0) {
                actionCooldowns[code] = {
                    endTime: nowSeconds + remaining,
                    duration: total
                };
            } else {
                changed = true;
            }
        });
        if (changed) {
            persistCooldowns();
        }
    } catch (err) {
        console.warn("restorePersistedCooldowns failed", err);
    }
}

function persistCooldownsNow(reason = "manual") {
    if (actionCooldownPersistTimer) {
        clearTimeout(actionCooldownPersistTimer);
        actionCooldownPersistTimer = null;
    }
    try {
        localStorage.setItem(ACTION_COOLDOWN_STORAGE_KEY, JSON.stringify(actionCooldowns));
        actionCooldownPersistDirty = false;
    } catch (err) {
        console.warn("persistCooldowns failed", err);
    }
}

function schedulePersistCooldowns(delayMs = ACTION_COOLDOWN_PERSIST_DELAY_MS) {
    actionCooldownPersistDirty = true;
    if (actionCooldownPersistTimer) return;
    const run = () => {
        actionCooldownPersistTimer = null;
        if (!actionCooldownPersistDirty) return;
        if (typeof requestIdleCallback === "function") {
            requestIdleCallback(() => persistCooldownsNow("idle"), {
                timeout: 1200
            });
        } else {
            persistCooldownsNow("timer");
        }
    };
    actionCooldownPersistTimer = setTimeout(run, Math.max(0, Number(delayMs) || 0));
}

function persistCooldowns() {
    schedulePersistCooldowns();
}

function flushPersistedCooldowns() {
    if (actionCooldownPersistDirty) {
        persistCooldownsNow("flush");
    }
}

if (typeof window !== "undefined") {
    window.addEventListener("pagehide", flushPersistedCooldowns);
    window.addEventListener("beforeunload", flushPersistedCooldowns);
}

restorePersistedCooldowns();

const SHIP_SPRITE_DEFS = {
    1: {
        frameCount: 32,
        basePath: "graphics/ships/1/"
    },
    3: {
        frameCount: 32,
        basePath: "graphics/ships/3/"
    },
    4: {
        frameCount: 32,
        basePath: "graphics/ships/4/"
    },
    5: {
        frameCount: 32,
        basePath: "graphics/ships/5/"
    },
    6: {
        frameCount: 32,
        basePath: "graphics/ships/6/"
    },
    7: {
        frameCount: 32,
        basePath: "graphics/ships/7/"
    },
    8: {
        frameCount: 32,
        basePath: "graphics/ships/8/"
    },
    17: {
        frameCount: 32,
        basePath: "graphics/ships/17/"
    },
    9: {
        frameCount: 32,
        basePath: "graphics/ships/9/"
    },
    10: {
        frameCount: 32,
        basePath: "graphics/ships/10/"
    },
    20: {
        frameCount: 16,
        basePath: "graphics/ships/20/"
    },
    56: {
        frameCount: 32,
        basePath: "graphics/ships/56/"
    },
    58: {
        frameCount: 32,
        basePath: "graphics/ships/58/"
    },
    59: {
        frameCount: 32,
        basePath: "graphics/ships/59/"
    },
    63: {
        frameCount: 32,
        basePath: "graphics/ships/63/"
    },
    64: {
        frameCount: 32,
        basePath: "graphics/ships/64/"
    },
    65: {
        frameCount: 32,
        basePath: "graphics/ships/65/"
    },
    66: {
        frameCount: 32,
        basePath: "graphics/ships/66/"
    },
    67: {
        frameCount: 32,
        basePath: "graphics/ships/67/"
    },
    2: {
        frameCount: 32,
        basePath: "graphics/ships/2/"
    },
    71: {
        frameCount: 32,
        basePath: "graphics/ships/71/"
    },
    72: {
        frameCount: 32,
        basePath: "graphics/ships/72/"
    },
    26: {
        frameCount: 32,
        basePath: "graphics/ships/72/"
    },
    73: {
        frameCount: 32,
        basePath: "graphics/ships/73/"
    },
    74: {
        frameCount: 32,
        basePath: "graphics/ships/74/"
    },
    75: {
        frameCount: 32,
        basePath: "graphics/ships/75/"
    },
    76: {
        frameCount: 20,
        basePath: "graphics/ships/76/"
    },
    77: {
        frameCount: 64,
        basePath: "graphics/ships/77/"
    },
    78: {
        frameCount: 1,
        basePath: "graphics/ships/78/"
    },
    79: {
        frameCount: 1,
        basePath: "graphics/ships/79/"
    },
    80: {
        frameCount: 1,
        basePath: "graphics/ships/80/"
    },
    81: {
        frameCount: 32,
        basePath: "graphics/ships/81/"
    },
    442: {
        frameCount: 31,
        basePath: "graphics/ships/443/",
        loopFps: 24,
        animationMode: "loop"
    },
    443: {
        frameCount: 31,
        basePath: "graphics/ships/443/",
        loopFps: 24,
        animationMode: "loop"
    },
    85: {
        frameCount: 32,
        basePath: "graphics/ships/85/"
    },
    23: {
        frameCount: 32,
        basePath: "graphics/ships/2/"
    },
    34: {
        frameCount: 32,
        basePath: "graphics/ships/85/"
    },
    36: {
        frameCount: 32,
        basePath: "graphics/ships/71/"
    },
    37: {
        frameCount: 32,
        basePath: "graphics/ships/75/"
    },
    46: {
        frameCount: 32,
        basePath: "graphics/ships/74/"
    },
    38: {
        frameCount: 1,
        basePath: "graphics/ships/78/"
    },
    35: {
        frameCount: 1,
        basePath: "graphics/ships/79/"
    },
    39: {
        frameCount: 1,
        basePath: "graphics/ships/80/"
    }
};

const SHIP_ATLAS_DEFS = Object.freeze({
    "graphics/ships/1/": Object.freeze({
        atlasPath: "graphics/ships/1/ship_atlas_v1.png",
        atlasColumns: 8,
        atlasCellWidth: 78,
        atlasCellHeight: 68,
        atlasPadding: 1,
        frameWidth: 76,
        frameHeight: 66
    }),
    "graphics/ships/3/": Object.freeze({
        atlasPath: "graphics/ships/3/ship_atlas_v1.png",
        atlasColumns: 8,
        atlasCellWidth: 142,
        atlasCellHeight: 102,
        atlasPadding: 1,
        frameWidth: 140,
        frameHeight: 100
    }),
    "graphics/ships/4/": Object.freeze({
        atlasPath: "graphics/ships/4/ship_atlas_v1.png",
        atlasColumns: 8,
        atlasCellWidth: 86,
        atlasCellHeight: 82,
        atlasPadding: 1,
        frameWidth: 84,
        frameHeight: 80
    }),
    "graphics/ships/5/": Object.freeze({
        atlasPath: "graphics/ships/5/ship_atlas_v1.png",
        atlasColumns: 8,
        atlasCellWidth: 90,
        atlasCellHeight: 75,
        atlasPadding: 1,
        frameWidth: 88,
        frameHeight: 73
    }),
    "graphics/ships/6/": Object.freeze({
        atlasPath: "graphics/ships/6/ship_atlas_v1.png",
        atlasColumns: 8,
        atlasCellWidth: 164,
        atlasCellHeight: 117,
        atlasPadding: 1,
        frameWidth: 162,
        frameHeight: 115
    }),
    "graphics/ships/7/": Object.freeze({
        atlasPath: "graphics/ships/7/ship_atlas_v1.png",
        atlasColumns: 8,
        atlasCellWidth: 176,
        atlasCellHeight: 121,
        atlasPadding: 1,
        frameWidth: 174,
        frameHeight: 119
    }),
    "graphics/ships/8/": Object.freeze({
        atlasPath: "graphics/ships/8/ship_atlas_v1.png",
        atlasColumns: 8,
        atlasCellWidth: 165,
        atlasCellHeight: 119,
        atlasPadding: 1,
        frameWidth: 163,
        frameHeight: 117
    }),
    "graphics/ships/9/": Object.freeze({
        atlasPath: "graphics/ships/9/ship_atlas_v1.png",
        atlasColumns: 8,
        atlasCellWidth: 160,
        atlasCellHeight: 132,
        atlasPadding: 1,
        frameWidth: 158,
        frameHeight: 130
    }),
    "graphics/ships/10/": Object.freeze({
        atlasPath: "graphics/ships/10/ship_atlas_v1.png",
        atlasColumns: 8,
        atlasCellWidth: 201,
        atlasCellHeight: 161,
        atlasPadding: 1,
        frameWidth: 199,
        frameHeight: 159
    }),
    "graphics/ships/17/": Object.freeze({
        atlasPath: "graphics/ships/17/ship_atlas_v1.png",
        atlasColumns: 8,
        atlasCellWidth: 165,
        atlasCellHeight: 118,
        atlasPadding: 1,
        frameWidth: 163,
        frameHeight: 116
    }),
    "graphics/ships/56/": Object.freeze({
        atlasPath: "graphics/ships/56/ship_atlas_v1.png",
        atlasColumns: 8,
        atlasCellWidth: 201,
        atlasCellHeight: 161,
        atlasPadding: 1,
        frameWidth: 199,
        frameHeight: 159
    }),
    "graphics/ships/58/": Object.freeze({
        atlasPath: "graphics/ships/58/ship_atlas_v1.png",
        atlasColumns: 8,
        atlasCellWidth: 165,
        atlasCellHeight: 119,
        atlasPadding: 1,
        frameWidth: 163,
        frameHeight: 117
    }),
    "graphics/ships/59/": Object.freeze({
        atlasPath: "graphics/ships/59/ship_atlas_v1.png",
        atlasColumns: 8,
        atlasCellWidth: 201,
        atlasCellHeight: 161,
        atlasPadding: 1,
        frameWidth: 199,
        frameHeight: 159
    }),
    "graphics/ships/63/": Object.freeze({
        atlasPath: "graphics/ships/63/ship_atlas_v1.png",
        atlasColumns: 8,
        atlasCellWidth: 232,
        atlasCellHeight: 206,
        atlasPadding: 1,
        frameWidth: 230,
        frameHeight: 204
    }),
    "graphics/ships/2/": Object.freeze({
        atlasPath: "graphics/atlas/ship_2_v1.png",
        atlasColumns: 5,
        atlasCellWidth: 117,
        atlasCellHeight: 98,
        atlasPadding: 1,
        frameWidth: 115,
        frameHeight: 96
    }),
    "graphics/ships/20/": Object.freeze({
        atlasPath: "graphics/atlas/ship_20_v1.png",
        atlasColumns: 4,
        atlasCellWidth: 122,
        atlasCellHeight: 110,
        atlasPadding: 1,
        frameWidth: 120,
        frameHeight: 108
    }),
    "graphics/ships/71/": Object.freeze({
        atlasPath: "graphics/atlas/ship_71_v1.png",
        atlasColumns: 6,
        atlasCellWidth: 87,
        atlasCellHeight: 78,
        atlasPadding: 1,
        frameWidth: 85,
        frameHeight: 76
    }),
    "graphics/ships/72/": Object.freeze({
        atlasPath: "graphics/atlas/ship_72_v1.png",
        atlasColumns: 5,
        atlasCellWidth: 443,
        atlasCellHeight: 378,
        atlasPadding: 1,
        frameWidth: 441,
        frameHeight: 376
    }),
    "graphics/ships/73/": Object.freeze({
        atlasPath: "graphics/atlas/ship_73_v1.png",
        atlasColumns: 6,
        atlasCellWidth: 132,
        atlasCellHeight: 121,
        atlasPadding: 1,
        frameWidth: 130,
        frameHeight: 119
    }),
    "graphics/ships/74/": Object.freeze({
        atlasPath: "graphics/atlas/ship_74_v1.png",
        atlasColumns: 5,
        atlasCellWidth: 531,
        atlasCellHeight: 416,
        atlasPadding: 1,
        frameWidth: 529,
        frameHeight: 414
    }),
    "graphics/ships/75/": Object.freeze({
        atlasPath: "graphics/atlas/ship_75_v1.png",
        atlasColumns: 5,
        atlasCellWidth: 122,
        atlasCellHeight: 92,
        atlasPadding: 1,
        frameWidth: 120,
        frameHeight: 90
    }),
    "graphics/ships/76/": Object.freeze({
        atlasPath: "graphics/atlas/ship_76_v1.png",
        atlasColumns: 4,
        atlasCellWidth: 84,
        atlasCellHeight: 63,
        atlasPadding: 1,
        frameWidth: 82,
        frameHeight: 61
    }),
    "graphics/ships/77/": Object.freeze({
        atlasPath: "graphics/atlas/ship_77_v1.png",
        atlasColumns: 8,
        atlasCellWidth: 258,
        atlasCellHeight: 232,
        atlasPadding: 1,
        frameWidth: 256,
        frameHeight: 230
    }),
    "graphics/ships/81/": Object.freeze({
        atlasPath: "graphics/atlas/ship_81_v1.png",
        atlasColumns: 6,
        atlasCellWidth: 122,
        atlasCellHeight: 122,
        atlasPadding: 1,
        frameWidth: 120,
        frameHeight: 120
    }),
    "graphics/ships/85/": Object.freeze({
        atlasPath: "graphics/atlas/ship_85_v1.png",
        atlasColumns: 6,
        atlasCellWidth: 142,
        atlasCellHeight: 125,
        atlasPadding: 1,
        frameWidth: 140,
        frameHeight: 123
    }),
    "graphics/ships/443/": Object.freeze({
        atlasPath: "graphics/atlas/ship_443_v1.png",
        atlasColumns: 6,
        atlasCellWidth: 92,
        atlasCellHeight: 92,
        atlasPadding: 1,
        frameWidth: 90,
        frameHeight: 90
    })
});

for (const shipId in SHIP_SPRITE_DEFS) {
    if (!Object.prototype.hasOwnProperty.call(SHIP_SPRITE_DEFS, shipId)) continue;
    const def = SHIP_SPRITE_DEFS[shipId];
    if (!def || !def.basePath) continue;
    const atlasDef = SHIP_ATLAS_DEFS[def.basePath];
    if (atlasDef) Object.assign(def, atlasDef);
}

const rawShipFolderAtlasManifests = typeof window !== "undefined" && Array.isArray(window.__ANDROMEDA_SHIP_FOLDER_ATLAS_MANIFESTS) ? window.__ANDROMEDA_SHIP_FOLDER_ATLAS_MANIFESTS : [];

function buildShipFolderAtlasManifestMap(rawManifests) {
    const manifestMap = Object.create(null);
    if (!Array.isArray(rawManifests)) return manifestMap;
    for (const rawManifest of rawManifests) {
        if (!rawManifest || typeof rawManifest !== "object") continue;
        const atlasPath = typeof rawManifest.atlasPath === "string" ? rawManifest.atlasPath.trim().replace(/^\/+/, "") : "";
        const basePath = typeof rawManifest.basePath === "string" ? rawManifest.basePath.trim().replace(/^\/+/, "").replace(/\/?$/, "/") : "";
        const rawFrames = rawManifest.frames && typeof rawManifest.frames === "object" ? rawManifest.frames : null;
        if (!atlasPath || !basePath || !rawFrames) continue;
        const atlasFrames = [];
        for (const rawKey of Object.keys(rawFrames)) {
            const entry = rawFrames[rawKey];
            if (!entry || typeof entry !== "object") continue;
            const x = Number(entry.x);
            const y = Number(entry.y);
            const w = Number(entry.w);
            const h = Number(entry.h);
            if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h) || x < 0 || y < 0 || w <= 0 || h <= 0) continue;
            const key = String(rawKey || "").replace(/^\/+/, "");
            const match = key.match(/\/(\d+)\.png$/i);
            if (!match) continue;
            const frameNumber = Number(match[1]);
            if (!Number.isFinite(frameNumber) || frameNumber <= 0) continue;
            atlasFrames[frameNumber - 1] = {
                x: x,
                y: y,
                w: w,
                h: h,
                key: key
            };
        }
        if (!atlasFrames.length) continue;
        manifestMap[basePath] = Object.freeze({
            atlasPath: atlasPath,
            atlasFrames: Object.freeze(atlasFrames.slice())
        });
    }
    return manifestMap;
}

const SHIP_ATLAS_MANIFEST_DEFS = buildShipFolderAtlasManifestMap(rawShipFolderAtlasManifests);

for (const shipId in SHIP_SPRITE_DEFS) {
    if (!Object.prototype.hasOwnProperty.call(SHIP_SPRITE_DEFS, shipId)) continue;
    const def = SHIP_SPRITE_DEFS[shipId];
    if (!def || !def.basePath) continue;
    const manifestAtlasDef = SHIP_ATLAS_MANIFEST_DEFS[def.basePath];
    if (manifestAtlasDef) Object.assign(def, manifestAtlasDef);
}

const rawExpansionFolderAtlasManifests = typeof window !== "undefined" && Array.isArray(window.__ANDROMEDA_EXPANSION_FOLDER_ATLAS_MANIFESTS) ? window.__ANDROMEDA_EXPANSION_FOLDER_ATLAS_MANIFESTS : [];

function buildShipExpansionFolderAtlasManifestMap(rawManifests) {
    const manifestMap = Object.create(null);
    if (!Array.isArray(rawManifests)) return manifestMap;
    for (const rawManifest of rawManifests) {
        if (!rawManifest || typeof rawManifest !== "object") continue;
        const atlasPath = typeof rawManifest.atlasPath === "string" ? rawManifest.atlasPath.trim().replace(/^\/+/, "") : "";
        const basePath = typeof rawManifest.basePath === "string" ? rawManifest.basePath.trim().replace(/^\/+/, "").replace(/\/?$/, "/") : "";
        const rawFrames = rawManifest.frames && typeof rawManifest.frames === "object" ? rawManifest.frames : null;
        if (!atlasPath || !basePath || !rawFrames) continue;
        const atlasFrames = [];
        for (const rawKey of Object.keys(rawFrames)) {
            const entry = rawFrames[rawKey];
            if (!entry || typeof entry !== "object") continue;
            const x = Number(entry.x);
            const y = Number(entry.y);
            const w = Number(entry.w);
            const h = Number(entry.h);
            if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h) || x < 0 || y < 0 || w <= 0 || h <= 0) continue;
            const key = String(rawKey || "").replace(/^\/+/, "");
            const match = key.match(/\/(\d+)\.png$/i);
            if (!match) continue;
            const frameNumber = Number(match[1]);
            if (!Number.isFinite(frameNumber) || frameNumber <= 0) continue;
            atlasFrames[frameNumber - 1] = {
                x: x,
                y: y,
                w: w,
                h: h,
                key: key
            };
        }
        if (!atlasFrames.length) continue;
        manifestMap[basePath] = Object.freeze({
            atlasPath: atlasPath,
            atlasFrames: Object.freeze(atlasFrames.slice())
        });
    }
    return manifestMap;
}

const SHIP_EXPANSION_ATLAS_MANIFEST_DEFS = buildShipExpansionFolderAtlasManifestMap(rawExpansionFolderAtlasManifests);

const rawShieldEffectAtlasManifests = typeof window !== "undefined" && Array.isArray(window.__ANDROMEDA_SHIELD_EFFECT_ATLAS_MANIFESTS) ? window.__ANDROMEDA_SHIELD_EFFECT_ATLAS_MANIFESTS : [];

function buildFlashSequenceAtlasManifestMap(rawManifests) {
    const manifestMap = Object.create(null);
    if (!Array.isArray(rawManifests)) return manifestMap;
    for (const rawManifest of rawManifests) {
        if (!rawManifest || typeof rawManifest !== "object") continue;
        const atlasPath = typeof rawManifest.atlasPath === "string" ? rawManifest.atlasPath.trim().replace(/^\/+/, "") : "";
        const basePath = typeof rawManifest.basePath === "string" ? rawManifest.basePath.trim().replace(/^\/+/, "").replace(/\/?$/, "") : "";
        const rawFrames = rawManifest.frames && typeof rawManifest.frames === "object" ? rawManifest.frames : null;
        if (!atlasPath || !basePath || !rawFrames) continue;
        const atlasFrames = [];
        for (const rawKey of Object.keys(rawFrames)) {
            const entry = rawFrames[rawKey];
            if (!entry || typeof entry !== "object") continue;
            const x = Number(entry.x);
            const y = Number(entry.y);
            const w = Number(entry.w);
            const h = Number(entry.h);
            if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h) || x < 0 || y < 0 || w <= 0 || h <= 0) continue;
            const key = String(rawKey || "").replace(/^\/+/, "");
            const match = key.match(/\/frame_(\d+)\.png$/i);
            if (!match) continue;
            const frameNumber = Number(match[1]);
            if (!Number.isFinite(frameNumber) || frameNumber <= 0) continue;
            atlasFrames[frameNumber - 1] = {
                x: x,
                y: y,
                w: w,
                h: h,
                key: key
            };
        }
        if (!atlasFrames.length) continue;
        manifestMap[basePath] = Object.freeze({
            atlasPath: atlasPath,
            atlasFrames: Object.freeze(atlasFrames.slice())
        });
    }
    return manifestMap;
}

const FLASH_SEQUENCE_ATLAS_MANIFESTS = buildFlashSequenceAtlasManifestMap(rawShieldEffectAtlasManifests);

function flashGetSequenceAtlasManifest(meta) {
    if (!meta || !meta.basePath) return null;
    const basePath = String(meta.basePath || "").trim().replace(/^\/+/, "").replace(/\/?$/, "");
    return basePath ? FLASH_SEQUENCE_ATLAS_MANIFESTS[basePath] || null : null;
}

function flashBuildSequenceAtlasFrameCanvas(meta, frameNumber) {
    const manifest = flashGetSequenceAtlasManifest(meta);
    if (!manifest) return null;
    const numericFrame = Number(frameNumber);
    if (!Number.isFinite(numericFrame) || numericFrame < 1) return null;
    const atlasDef = {
        atlasPath: manifest.atlasPath,
        atlasFrames: manifest.atlasFrames,
        frameCount: manifest.atlasFrames.length
    };
    const frameCanvas = buildShipAtlasFrameCanvas(atlasDef, numericFrame - 1);
    if (frameCanvas) {
        frameCanvas.complete = true;
        frameCanvas.naturalWidth = frameCanvas.width;
        frameCanvas.naturalHeight = frameCanvas.height;
    }
    return frameCanvas;
}

const SHIP_LABEL_Y_OFFSETS = {
    1: 30,
    2: 40,
    3: 40,
    4: 50,
    5: 45,
    6: 40,
    7: 50,
    8: 60,
    9: 60,
    10: 60,
    19: 60,
    20: 50,
    21: 30,
    23: 50,
    24: 57,
    25: 57,
    26: 100,
    30: 57,
    31: 57,
    32: 57,
    34: 40,
    35: 110,
    46: 100,
    56: 60,
    58: 60,
    59: 60,
    71: 40,
    72: 100,
    73: 50,
    74: 100,
    75: 40,
    76: 50,
    77: 100,
    78: 50,
    79: 110,
    80: 200,
    81: 50,
    85: 40
};

const SHIP_ENERGY_Y_OFFSETS = {
    1: 35,
    2: 35,
    3: 35,
    4: 25,
    5: 25,
    6: 40,
    7: 40,
    8: 40,
    9: 40,
    10: 40,
    12: 35,
    13: 45,
    14: 35,
    15: 10,
    16: 40,
    17: 60,
    18: 40,
    19: 40,
    22: 7,
    24: 7,
    25: 7,
    26: 7,
    27: 7,
    28: 7,
    29: 7,
    30: 7,
    31: 7,
    32: 7,
    50: 40,
    52: 40,
    53: 40,
    54: 40,
    55: 40,
    56: 40,
    57: 40,
    58: 40,
    59: 40,
    60: 40,
    61: 40,
    62: 40,
    63: 40,
    64: 36,
    65: 40,
    66: 24,
    67: 40,
    68: 40,
    69: 40,
    86: 40,
    98: 30,
    99: 30,
    100: 30,
    101: 10,
    103: 10,
    104: 30,
    106: 35,
    111: 26,
    112: 36,
    113: 40,
    114: 70,
    115: 40,
    116: 40,
    117: 40,
    118: 40,
    119: 40,
    120: 40,
    121: 40,
    122: 40,
    123: 40,
    124: 7,
    125: 40,
    127: 40,
    129: 40,
    130: 7,
    131: 7,
    132: 7,
    134: 7,
    136: 40,
    137: 7,
    138: 7,
    139: 7,
    140: 7,
    141: 10,
    142: -30,
    145: 16,
    146: 16,
    148: 16,
    149: 16,
    155: 16,
    156: 7,
    157: 7,
    158: 7,
    159: 7,
    160: 7,
    161: 7,
    162: 7,
    163: 7,
    164: 7,
    165: 7,
    166: 7,
    167: 7,
    168: 7,
    169: 7,
    170: 7,
    172: 7,
    174: 7,
    175: 7,
    180: 7,
    182: 7,
    184: 7,
    185: 7,
    186: 7,
    187: 40,
    188: 40,
    189: 40,
    190: 7,
    696: 30
};

let SHIP_LABEL_Y_OFFSETS_FROM_XML = null;

let SHIP_ENERGY_Y_OFFSETS_FROM_XML = null;

let SHIP_LABEL_VISIBLE_FROM_XML = null;

let SHIP_ENERGY_VISIBLE_FROM_XML = null;

let SHIP_CLICK_RADII_FROM_XML = null;

let SHIP_CLICK_OFFSET_X_FROM_XML = null;

let SHIP_CLICK_OFFSET_Y_FROM_XML = null;

let SHIP_MOVE_RADIUS_SQUARED_FROM_XML = null;

function parseShipOffsetsFromXml(xmlDoc) {
    if (!xmlDoc) return;
    const labelMap = {};
    const energyMap = {};
    const labelVisibleMap = {};
    const energyVisibleMap = {};
    const clickRadiusMap = {};
    const clickOffsetXMap = {};
    const clickOffsetYMap = {};
    const moveRadiusSquaredMap = {};
    const parseFlashBoolean = rawValue => {
        if (rawValue == null) return null;
        const normalized = String(rawValue).trim().toLowerCase();
        if (normalized === "true" || normalized === "1") return true;
        if (normalized === "false" || normalized === "0") return false;
        return null;
    };
    try {
        xmlDoc.querySelectorAll("ships > ship").forEach(shipNode => {
            const type = parseInt(shipNode.getAttribute("type") || "", 10);
            if (!Number.isFinite(type)) return;
            const labelRaw = shipNode.getAttribute("labelYOffset");
            if (labelRaw !== null) {
                const v = parseInt(labelRaw, 10);
                labelMap[type] = Number.isFinite(v) ? v : 0;
            }
            const energyRaw = shipNode.getAttribute("energyYOffset");
            if (energyRaw !== null) {
                const v = parseInt(energyRaw, 10);
                energyMap[type] = Number.isFinite(v) ? v : 0;
            }
            const clickRadiusRaw = shipNode.getAttribute("clickRadius");
            if (clickRadiusRaw !== null) {
                const v = parseInt(clickRadiusRaw, 10);
                clickRadiusMap[type] = Number.isFinite(v) && v > 0 ? v : 45;
            }
            const clickOffsetXRaw = shipNode.getAttribute("clickOffsetX");
            if (clickOffsetXRaw !== null) {
                const v = parseInt(clickOffsetXRaw, 10);
                clickOffsetXMap[type] = Number.isFinite(v) ? v : 0;
            }
            const clickOffsetYRaw = shipNode.getAttribute("clickOffsetY");
            if (clickOffsetYRaw !== null) {
                const v = parseInt(clickOffsetYRaw, 10);
                clickOffsetYMap[type] = Number.isFinite(v) ? v : 0;
            }
            const moveRadiusRaw = shipNode.getAttribute("moveRadius");
            if (moveRadiusRaw !== null) {
                const v = parseInt(moveRadiusRaw, 10);
                // Flash stores ShipPattern.moveRadiusSquared; XML moveRadius is squared during parsing.
                moveRadiusSquaredMap[type] = Number.isFinite(v) && v >= 0 ? v * v : 100;
            }
            const labelVisibleRaw = shipNode.getAttribute("labelVisible");
            const labelVisible = parseFlashBoolean(labelVisibleRaw);
            if (labelVisible !== null) {
                labelVisibleMap[type] = labelVisible;
            }
            const energyVisibleRaw = shipNode.getAttribute("energyVisible");
            const energyVisible = parseFlashBoolean(energyVisibleRaw);
            if (energyVisible !== null) {
                energyVisibleMap[type] = energyVisible;
            }
        });
    } catch (e) {
        console.warn("[XML] parseShipOffsetsFromXml failed:", e);
    }
    if (Object.keys(labelMap).length > 0) {
        SHIP_LABEL_Y_OFFSETS_FROM_XML = labelMap;
        window._shipLabelYOffsetById = labelMap;
    }
    if (Object.keys(energyMap).length > 0) {
        SHIP_ENERGY_Y_OFFSETS_FROM_XML = energyMap;
        window._shipEnergyYOffsetById = energyMap;
    }
    if (Object.keys(labelVisibleMap).length > 0) {
        SHIP_LABEL_VISIBLE_FROM_XML = labelVisibleMap;
        window._shipLabelVisibleById = labelVisibleMap;
    }
    if (Object.keys(energyVisibleMap).length > 0) {
        SHIP_ENERGY_VISIBLE_FROM_XML = energyVisibleMap;
        window._shipEnergyVisibleById = energyVisibleMap;
    }
    if (Object.keys(clickRadiusMap).length > 0) {
        SHIP_CLICK_RADII_FROM_XML = clickRadiusMap;
        window._shipClickRadiusById = clickRadiusMap;
    }
    if (Object.keys(clickOffsetXMap).length > 0) {
        SHIP_CLICK_OFFSET_X_FROM_XML = clickOffsetXMap;
        window._shipClickOffsetXById = clickOffsetXMap;
    }
    if (Object.keys(clickOffsetYMap).length > 0) {
        SHIP_CLICK_OFFSET_Y_FROM_XML = clickOffsetYMap;
        window._shipClickOffsetYById = clickOffsetYMap;
    }
    if (Object.keys(moveRadiusSquaredMap).length > 0) {
        SHIP_MOVE_RADIUS_SQUARED_FROM_XML = moveRadiusSquaredMap;
        window._shipMoveRadiusSquaredById = moveRadiusSquaredMap;
    }
}

const SHIP_LABEL_Y_OFFSET_ALIASES = {
    27: 76,
    36: 71,
    28: 77,
    37: 75,
    38: 78,
    39: 80
};

function getShipXmlMetricValue(metricMap, shipId, fallbackValue = 0) {
    const parsedId = Number.isFinite(shipId) ? shipId : parseInt(shipId || "", 10);
    if (Number.isFinite(parsedId) && metricMap) {
        if (Object.prototype.hasOwnProperty.call(metricMap, parsedId)) {
            return metricMap[parsedId];
        }
        const aliasId = SHIP_LABEL_Y_OFFSET_ALIASES[parsedId];
        if (aliasId != null && Object.prototype.hasOwnProperty.call(metricMap, aliasId)) {
            return metricMap[aliasId];
        }
    }
    return fallbackValue;
}

function getShipClickRadius(shipId) {
    const value = getShipXmlMetricValue(SHIP_CLICK_RADII_FROM_XML, shipId, 45);
    return Number.isFinite(value) && value > 0 ? value : 45;
}

function getShipClickOffsetX(shipId) {
    const value = getShipXmlMetricValue(SHIP_CLICK_OFFSET_X_FROM_XML, shipId, 0);
    return Number.isFinite(value) ? value : 0;
}

function getShipClickOffsetY(shipId) {
    const value = getShipXmlMetricValue(SHIP_CLICK_OFFSET_Y_FROM_XML, shipId, 0);
    return Number.isFinite(value) ? value : 0;
}

function getShipMoveRadiusSquared(shipId) {
    // Flash default is ShipPattern.moveRadiusSquared = 100 when the XML attribute is absent.
    const value = getShipXmlMetricValue(SHIP_MOVE_RADIUS_SQUARED_FROM_XML, shipId, 100);
    return Number.isFinite(value) && value >= 0 ? value : 100;
}

function getShipLabelYOffset(shipId) {
    const resolvedId = SHIP_LABEL_Y_OFFSET_ALIASES[shipId] || shipId;
    if (SHIP_LABEL_Y_OFFSETS_FROM_XML && Object.prototype.hasOwnProperty.call(SHIP_LABEL_Y_OFFSETS_FROM_XML, resolvedId)) {
        return SHIP_LABEL_Y_OFFSETS_FROM_XML[resolvedId] || 0;
    }
    return SHIP_LABEL_Y_OFFSETS[resolvedId] || 0;
}

function getShipEnergyYOffset(shipId) {
    const resolvedId = SHIP_LABEL_Y_OFFSET_ALIASES[shipId] || shipId;
    if (SHIP_ENERGY_Y_OFFSETS_FROM_XML && Object.prototype.hasOwnProperty.call(SHIP_ENERGY_Y_OFFSETS_FROM_XML, resolvedId)) {
        return SHIP_ENERGY_Y_OFFSETS_FROM_XML[resolvedId] || 0;
    }
    return SHIP_ENERGY_Y_OFFSETS[resolvedId] || 0;
}

function isShipLabelVisible(shipId) {
    const resolvedId = SHIP_LABEL_Y_OFFSET_ALIASES[shipId] || shipId;
    if (SHIP_LABEL_VISIBLE_FROM_XML && Object.prototype.hasOwnProperty.call(SHIP_LABEL_VISIBLE_FROM_XML, resolvedId)) {
        return !!SHIP_LABEL_VISIBLE_FROM_XML[resolvedId];
    }
    return true;
}

function isShipEnergyVisible(shipId) {
    const resolvedId = SHIP_LABEL_Y_OFFSET_ALIASES[shipId] || shipId;
    if (SHIP_ENERGY_VISIBLE_FROM_XML && Object.prototype.hasOwnProperty.call(SHIP_ENERGY_VISIBLE_FROM_XML, resolvedId)) {
        return !!SHIP_ENERGY_VISIBLE_FROM_XML[resolvedId];
    }
    return true;
}

const SHIP_EXPANSION_ANCHORS = {};

const SHIP_EXPANSION_CLASS = {};

const EXPANSION_PATTERNS = {};

let expansionPatternsLoadPromise = null;

function getShipExpansionAnchor(shipId) {
    return SHIP_EXPANSION_ANCHORS[shipId] || {
        x: 0,
        y: 0
    };
}

const SHIP_EXPANSION_CLASS_OVERRIDES = {
    17: 8
};

function getShipExpansionClass(shipId) {
    return SHIP_EXPANSION_CLASS_OVERRIDES[shipId] || SHIP_EXPANSION_CLASS[shipId] || 0;
}

function getMaxExpansionStageForClass(expansionClassId) {
    const classPatterns = EXPANSION_PATTERNS[expansionClassId];
    if (!classPatterns) return 0;
    let maxStage = 0;
    for (const key of Object.keys(classPatterns)) {
        const stageId = parseInt(key, 10);
        if (Number.isFinite(stageId) && stageId > maxStage) {
            maxStage = stageId;
        }
    }
    return maxStage > 0 ? maxStage : classPatterns[0] ? 0 : 0;
}

function getMaxExpansionStageForShip(shipId) {
    const expansionClassId = getShipExpansionClass(shipId);
    if (!expansionClassId) return 0;
    return getMaxExpansionStageForClass(expansionClassId);
}

function getExpansionPattern(expansionClassId, expansionTypeId) {
    const classPatterns = EXPANSION_PATTERNS[expansionClassId];
    if (!classPatterns) return null;
    const typeId = Number.isFinite(expansionTypeId) ? expansionTypeId : 0;
    return classPatterns[typeId] || classPatterns[0] || null;
}

function parseExpansionCoordinatesList(data) {
    if (!data) return [];
    const parts = data.split(",").map(Number);
    const coords = [];
    for (let i = 0; i < parts.length; i += 2) {
        coords.push({
            x: parts[i],
            y: parts[i + 1]
        });
    }
    return coords;
}

function parseExpansionPatternsFromXml(xmlDoc) {
    if (!xmlDoc) return;
    const expansionsRoot = xmlDoc.querySelector("patterns > expansions") || xmlDoc.querySelector("expansions");
    if (expansionsRoot) {
        const expansionNodes = expansionsRoot.querySelectorAll("expansion");
        expansionNodes.forEach(expansionNode => {
            const classId = parseInt(expansionNode.getAttribute("class"), 10);
            if (!Number.isFinite(classId)) return;
            if (!EXPANSION_PATTERNS[classId]) {
                EXPANSION_PATTERNS[classId] = {};
            }
            const positionsMap = {};
            expansionNode.querySelectorAll("positionsList").forEach(posNode => {
                const name = posNode.getAttribute("name");
                const data = posNode.getAttribute("data") || "";
                if (name) {
                    positionsMap[name] = parseExpansionCoordinatesList(data);
                }
            });
            expansionNode.querySelectorAll("stage").forEach(stageNode => {
                const stageId = parseInt(stageNode.getAttribute("id"), 10);
                if (!Number.isFinite(stageId)) return;
                const salvosData = [];
                stageNode.querySelectorAll("salvo").forEach(salvoNode => {
                    const lasers = (salvoNode.getAttribute("laser") || "").split(",").map(item => item.trim()).filter(Boolean);
                    const salvo = lasers.map(laserName => positionsMap[laserName]).filter(Boolean);
                    if (salvo.length > 0) {
                        salvosData.push(salvo);
                    }
                });
                if (salvosData.length > 0) {
                    EXPANSION_PATTERNS[classId][stageId] = {
                        salvosData: salvosData,
                        resKey: stageNode.getAttribute("resKey") || ""
                    };
                }
            });
            if (EXPANSION_PATTERNS[classId][1] && !EXPANSION_PATTERNS[classId][0]) {
                EXPANSION_PATTERNS[classId][0] = EXPANSION_PATTERNS[classId][1];
            }
        });
    }
    const shipNodes = xmlDoc.querySelectorAll("ships ship[expansionClassID]");
    shipNodes.forEach(shipNode => {
        const shipId = parseInt(shipNode.getAttribute("type"), 10);
        const expansionClassId = parseInt(shipNode.getAttribute("expansionClassID"), 10);
        if (!Number.isFinite(shipId) || !Number.isFinite(expansionClassId)) return;
        if (expansionClassId > 0) {
            SHIP_EXPANSION_CLASS[shipId] = expansionClassId;
        }
    });
}

function parseHitpointColorsFromXml(xmlDoc) {
    if (!xmlDoc) return;
    const colors = {};
    xmlDoc.querySelectorAll("hitpointColors hitpointColor").forEach(node => {
        const id = parseInt(node.getAttribute("id"), 10);
        const code = node.getAttribute("code");
        if (!Number.isFinite(id) || !code) return;
        const normalized = String(code).trim().replace(/^#/, "");
        if (!normalized) return;
        colors[id] = `#${normalized}`;
    });
    if (Object.keys(colors).length > 0) {
        hitpointColorPatterns = colors;
        window.HITPOINT_COLOR_PATTERNS = hitpointColorPatterns;
    }
}

function parseColorPatternsFromXml(xmlDoc) {
    if (!xmlDoc) return;
    const colors = {};
    xmlDoc.querySelectorAll("colors > color").forEach(node => {
        const key = node.getAttribute("key") || node.getAttribute("name");
        const code = node.getAttribute("color");
        if (!key || !code) return;
        const normalized = String(code).trim().replace(/^#/, "");
        if (!normalized) return;
        colors[key] = `#${normalized}`;
    });
    if (Object.keys(colors).length > 0) {
        window.GAME_COLOR_PATTERNS = Object.freeze({
            ...colors
        });
    }
    const videoColors = {};
    xmlDoc.querySelectorAll("colors > videoWindow > color").forEach(node => {
        const key = node.getAttribute("key") || node.getAttribute("name");
        const code = node.getAttribute("color");
        if (!key || !code) return;
        const normalized = String(code).trim().replace(/^#/, "");
        if (!normalized) return;
        videoColors[key] = `#${normalized}`;
    });
    if (Object.keys(videoColors).length > 0) {
        window.GAME_VIDEO_WINDOW_COLOR_PATTERNS = Object.freeze({
            ...videoColors
        });
    }
}

function parseDronePatternsFromXml(xmlDoc) {
    if (!xmlDoc) return;
    const dronesRoot = xmlDoc.querySelector("patterns > drones") || xmlDoc.querySelector("drones");
    if (!dronesRoot) return;
    const groupRadius = parseInt(dronesRoot.getAttribute("groupRadius") || "", 10);
    if (Number.isFinite(groupRadius) && groupRadius > 0) {
        window.DRONE_GROUP_RADIUS = groupRadius;
        window.DRONE_GROUP_DIMENSION = groupRadius * 2;
    }
    const firstDroneNode = dronesRoot.querySelector("drone[droneRadius]");
    if (firstDroneNode) {
        const droneRadius = parseInt(firstDroneNode.getAttribute("droneRadius") || "", 10);
        if (Number.isFinite(droneRadius) && droneRadius > 0) {
            window.DRONE_RADIUS = droneRadius;
        }
    }
}

function parsePulseLaserBurstFromXml(xmlDoc) {
    if (!xmlDoc) return;
    const node = xmlDoc.querySelector('lasers laser[class="0"][type="6"]') || xmlDoc.querySelector('lasers laser[type="6"]');
    if (!node) return;
    const fireRate = parseInt(node.getAttribute("fireRate") || "", 10);
    const attackLength = parseInt(node.getAttribute("attackLength") || "", 10);
    const spacingMs = Number.isFinite(fireRate) && fireRate > 0 ? fireRate : 120;
    const total = Number.isFinite(attackLength) && attackLength > 0 ? attackLength : 400;
    const burstCount = Math.max(1, Math.min(20, Math.floor(total / spacingMs) + 1));
    window.RSB_VISUAL_BURST = {
        count: burstCount,
        spacingMs: spacingMs,
        attackLengthMs: total
    };
}

function parseSabLaserVisualFromXml(xmlDoc) {
    if (!xmlDoc) return;
    const node = xmlDoc.querySelector('lasers laser[class="0"][type="4"]') || xmlDoc.querySelector('lasers laser[type="4"]');
    if (!node) return;
    const fireRate = parseInt(node.getAttribute("fireRate") || "", 10);
    const speed = parseFloat(node.getAttribute("speed") || "");
    if (Number.isFinite(fireRate) && fireRate > 0) {
        window.SAB_LASER_FIRE_RATE_MS = fireRate;
    }
    if (Number.isFinite(speed) && speed > 0) {
        window.SAB_LASER_SPEED_MS = Math.round(speed * 1e3);
    }
}

function parseSabShotDurationFromXml(xmlDoc) {
    try {
        SAB_SHOT_DURATION_MS = 1e3;
        window.SAB_SHOT_DURATION_MS = SAB_SHOT_DURATION_MS;
    } catch (e) {
        console.warn("[XML] Failed to set SAB_SHOT_DURATION_MS", e);
    }
}

function parseLaserResourceKeysFromXml(xmlDoc) {
    if (!xmlDoc) return;
    const map = {};
    xmlDoc.querySelectorAll('lasers > laser[class="0"]').forEach(node => {
        const type = parseInt(node.getAttribute("type") || "", 10);
        if (!Number.isFinite(type)) return;
        const resKey = node.getAttribute("resKey") || "";
        const skillResKey = node.getAttribute("skillResKey") || "";
        if (!resKey) return;
        map[type] = {
            resKey: resKey,
            skillResKey: skillResKey
        };
    });
    if (Object.keys(map).length > 0) {
        window.LASER_RESKEYS_BY_TYPE = Object.freeze({
            ...map
        });
    }
}

function andromedaXmlHasParseError(xmlDoc) {
    if (!xmlDoc || !xmlDoc.querySelector) return true;
    return !!xmlDoc.querySelector("parsererror");
}

function loadExpansionPatternsFromGameXml() {
    if (expansionPatternsLoadPromise) return expansionPatternsLoadPromise;
    const candidates = [ "../spacemap/xml/game.xml", "/spacemap/xml/game.xml", "spacemap/xml/game.xml" ];
    expansionPatternsLoadPromise = (async () => {
        let lastError = null;
        for (const url of candidates) {
            try {
                const text = await fetchBootXmlText(url, {
                    cache: "force-cache"
                });
                const parser = new DOMParser;
                const xmlDoc = parser.parseFromString(text, "text/xml");
                if (andromedaXmlHasParseError(xmlDoc) || !xmlDoc.querySelector("menu")) {
                    throw new Error("Invalid or incomplete game.xml");
                }
                window._gameXmlDoc = xmlDoc;
                if (window.AudioManager && typeof window.AudioManager.parseFromGameXml === "function") {
                    try {
                        window.AudioManager.parseFromGameXml(xmlDoc);
                    } catch (e) {
                        console.warn("[AudioManager] parseFromGameXml failed:", e);
                    }
                }
                parseExpansionPatternsFromXml(xmlDoc);
                parseHitpointColorsFromXml(xmlDoc);
                parseColorPatternsFromXml(xmlDoc);
                parseDronePatternsFromXml(xmlDoc);
                parsePulseLaserBurstFromXml(xmlDoc);
                parseSabLaserVisualFromXml(xmlDoc);
                parseSabShotDurationFromXml(xmlDoc);
                parseLaserResourceKeysFromXml(xmlDoc);
                parseShipOffsetsFromXml(xmlDoc);
                parseFlashStationPatternsFromXml(xmlDoc);
                return true;
            } catch (error) {
                lastError = error;
                console.warn("[EXPANSION] Failed to load game.xml:", url, error);
            }
        }
        throw lastError || new Error("game.xml could not be loaded");
    })();
    return expansionPatternsLoadPromise;
}

async function bootLoadXmlConfigs(cfg = {}) {
    try {
        const gameXmlOk = await loadExpansionPatternsFromGameXml();
        if (gameXmlOk !== true || !window._gameXmlDoc) {
            throw new Error("game.xml is required before boot can continue");
        }
        await ensureMapsXmlLoaded(cfg);
        await loadProfileXml(cfg);
        await loadResourcesXml(cfg);
        if (window.AudioManager && typeof window.AudioManager.waitForCriticalBootAudio === "function") {
            try {
                await window.AudioManager.waitForCriticalBootAudio("bootLoadXmlConfigs");
            } catch (audioErr) {
                console.warn("[BOOT] Critical audio preload wait failed (continuing):", audioErr);
            }
        }
        return true;
    } catch (err) {
        console.warn("[BOOT] XML boot load failure", err);
        return false;
    }
}

window.bootLoadXmlConfigs = bootLoadXmlConfigs;

const SHIP_EXPANSION_DEFS = {
    10: {
        frameCount: 32,
        basePath: "graphics/expansions/ship10_Emax/",
        frames: Array.from({
            length: 32
        }, (_, idx) => idx + 1),
        offset: {
            x: 0,
            y: 10.2
        },
        useVisualCenterRegistration: false
    },

    1: {
        frameCount: 32,
        basePath: "graphics/expansions/ship1_Emax/",
        frames: Array.from({
            length: 32
        }, (_, idx) => idx * 2 + 1),
        offset: getShipExpansionAnchor(1),
        atlasPath: "graphics/atlas/expansion_ship1_emax_v1.png",
        atlasColumns: 8,
        atlasCellWidth: 95,
        atlasCellHeight: 79,
        atlasPadding: 1,
        frameWidth: 93,
        frameHeight: 77
    },
    3: {
        frameCount: 32,
        basePath: "graphics/expansions/ship3_Emax/",
        frames: Array.from({
            length: 32
        }, (_, idx) => idx * 2 + 1),
        offset: getShipExpansionAnchor(3),
        atlasPath: "graphics/atlas/expansion_ship3_emax_v1.png",
        atlasColumns: 8,
        atlasCellWidth: 136,
        atlasCellHeight: 99,
        atlasPadding: 1,
        frameWidth: 134,
        frameHeight: 97
    },
    4: {
        frameCount: 32,
        basePath: "graphics/expansions/ship4_Emax/",
        frames: Array.from({
            length: 32
        }, (_, idx) => idx * 2 + 1),
        offset: getShipExpansionAnchor(4),
        atlasPath: "graphics/atlas/expansion_ship4_emax_v1.png",
        atlasColumns: 8,
        atlasCellWidth: 108,
        atlasCellHeight: 88,
        atlasPadding: 1,
        frameWidth: 106,
        frameHeight: 86
    },
    5: {
        frameCount: 32,
        basePath: "graphics/expansions/ship5_Emax/",
        frames: Array.from({
            length: 32
        }, (_, idx) => idx * 2 + 1),
        offset: getShipExpansionAnchor(5),
        atlasPath: "graphics/atlas/expansion_ship5_emax_v1.png",
        atlasColumns: 8,
        atlasCellWidth: 120,
        atlasCellHeight: 87,
        atlasPadding: 1,
        frameWidth: 118,
        frameHeight: 85
    },
    6: {
        frameCount: 32,
        basePath: "graphics/expansions/ship6_Emax/",
        frames: Array.from({
            length: 32
        }, (_, idx) => idx * 2 + 1),
        offset: getShipExpansionAnchor(6),
        atlasPath: "graphics/atlas/expansion_ship6_emax_v1.png",
        atlasColumns: 8,
        atlasCellWidth: 220,
        atlasCellHeight: 156,
        atlasPadding: 1,
        frameWidth: 218,
        frameHeight: 154
    },
    7: {
        frameCount: 32,
        basePath: "graphics/expansions/ship7_Emax/",
        frames: Array.from({
            length: 32
        }, (_, idx) => idx * 2 + 1),
        offset: getShipExpansionAnchor(7),
        atlasPath: "graphics/atlas/expansion_ship7_emax_v1.png",
        atlasColumns: 8,
        atlasCellWidth: 158,
        atlasCellHeight: 114,
        atlasPadding: 1,
        frameWidth: 156,
        frameHeight: 112
    },
    8: {
        frameCount: 32,
        basePath: "graphics/expansions/ship8_Emax/",
        frames: Array.from({
            length: 32
        }, (_, idx) => idx * 2 + 1),
        offset: getShipExpansionAnchor(8),
        atlasPath: "graphics/atlas/expansion_ship8_emax_v1.png",
        atlasColumns: 8,
        atlasCellWidth: 199,
        atlasCellHeight: 144,
        atlasPadding: 1,
        frameWidth: 197,
        frameHeight: 142
    },
    17: {
        frameCount: 32,
        basePath: "graphics/expansions/ship8_Emax/",
        frames: Array.from({
            length: 32
        }, (_, idx) => idx * 2 + 1),
        offset: getShipExpansionAnchor(8),
        atlasPath: "graphics/atlas/expansion_ship8_emax_v1.png",
        atlasColumns: 8,
        atlasCellWidth: 199,
        atlasCellHeight: 144,
        atlasPadding: 1,
        frameWidth: 197,
        frameHeight: 142
    },
    9: {
        frameCount: 32,
        basePath: "graphics/expansions/ship9_Emax/",
        frames: Array.from({
            length: 32
        }, (_, idx) => idx * 2 + 1),
        offset: getShipExpansionAnchor(9),
        atlasPath: "graphics/atlas/expansion_ship9_emax_v1.png",
        atlasColumns: 8,
        atlasCellWidth: 205,
        atlasCellHeight: 142,
        atlasPadding: 1,
        frameWidth: 203,
        frameHeight: 140
    },
    56: {
        frameCount: 32,
        basePath: "graphics/expansions/ship10_Emax/",
        frames: Array.from({
            length: 32
        }, (_, idx) => idx + 1),
        offset: {
            x: 0,
            y: 10.2
        },
        useVisualCenterRegistration: false
    },
    59: {
        frameCount: 32,
        basePath: "graphics/expansions/ship10_Emax/",
        frames: Array.from({
            length: 32
        }, (_, idx) => idx + 1),
        offset: {
            x: 0,
            y: 10.2
        },
        useVisualCenterRegistration: false
    },
    63: {
        frameCount: 32,
        basePath: "graphics/expansions/ship63_Emax/",
        frames: Array.from({
            length: 32
        }, (_, idx) => idx + 1),
        offset: getShipExpansionAnchor(63)
    },
    64: {
        frameCount: 32,
        basePath: "graphics/expansions/ship64_Emax/",
        frames: Array.from({
            length: 32
        }, (_, idx) => idx + 1),
        offset: getShipExpansionAnchor(64)
    },
    65: {
        frameCount: 32,
        basePath: "graphics/expansions/ship65_Emax/",
        frames: Array.from({
            length: 32
        }, (_, idx) => idx + 1),
        offset: getShipExpansionAnchor(65)
    },
    66: {
        frameCount: 32,
        basePath: "graphics/expansions/ship66_Emax/",
        frames: Array.from({
            length: 32
        }, (_, idx) => idx + 1),
        offset: getShipExpansionAnchor(66)
    },
    67: {
        frameCount: 32,
        basePath: "graphics/expansions/ship67_Emax/",
        frames: Array.from({
            length: 32
        }, (_, idx) => idx + 1),
        offset: getShipExpansionAnchor(67)
    }
};

for (const shipId in SHIP_EXPANSION_DEFS) {
    if (!Object.prototype.hasOwnProperty.call(SHIP_EXPANSION_DEFS, shipId)) continue;
    const def = SHIP_EXPANSION_DEFS[shipId];
    if (!def || !def.basePath) continue;
    const manifestAtlasDef = SHIP_EXPANSION_ATLAS_MANIFEST_DEFS[def.basePath];
    if (manifestAtlasDef) Object.assign(def, manifestAtlasDef);
}

const ENGINE_ANIM_FPS = 20;

const DEFAULT_ENGINE_KEY = "engine0";

const DEFAULT_ENGINE_SMOKE_KEY = "engineSmoke0";

const ENGINE_SPRITE_DEFS = {
    engine0: {
        frameCount: 16,
        basePath: "graphics/engines/engine0/",
        frames: [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16 ],
        fps: ENGINE_ANIM_FPS,
        anchor: {
            x: .5,
            y: .5
        },
        smokeSpawnOffset: 10
    }
};

const ENGINE_SMOKE_DEFS = {
    engineSmoke0: {
        basePath: "graphics/smoke/engineSmoke0/",
        frames: [ 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41 ],
        duration: 750,
        spawnInterval: 50,
        drift: 0,
        rotate: false,
        anchor: {
            x: .5,
            y: .5
        }
    }
};

const ROCKET_SMOKE_FPS = 25;
const ROCKET_SMOKE_DURATION_MS = 750;
const ROCKET_SMOKE_SPAWN_INTERVAL_MS = 15;

const ROCKET_SMOKE_DEFS = {
    0: {
        basePath: "graphics/smoke/rocketSmoke0/",
        frameCount: 21,
        fps: ROCKET_SMOKE_FPS,
        duration: ROCKET_SMOKE_DURATION_MS,
        spawnInterval: ROCKET_SMOKE_SPAWN_INTERVAL_MS
    },
    1: {
        basePath: "graphics/smoke/rocketSmoke1/",
        frameCount: 21,
        fps: ROCKET_SMOKE_FPS,
        duration: ROCKET_SMOKE_DURATION_MS,
        spawnInterval: ROCKET_SMOKE_SPAWN_INTERVAL_MS
    },
    2: {
        basePath: "graphics/smoke/rocketSmoke2/",
        frameCount: 21,
        fps: ROCKET_SMOKE_FPS,
        duration: ROCKET_SMOKE_DURATION_MS,
        spawnInterval: ROCKET_SMOKE_SPAWN_INTERVAL_MS
    }
};

const ROCKET_SMOKE_BY_ID = {
    1: 0,
    9: 0,
    10: 0,
    2: 1,
    7: 1,
    3: 2,
    8: 2
};

const SHIP_ENGINE_CLASS = {
    1: 1,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    17: 8,
    9: 9,
    10: 10,
    56: 10,
    58: 8,
    59: 10,
    63: 63,
    64: 64,
    65: 65,
    66: 66,
    67: 67,
    2: 2,
    34: 85,
    85: 85,
    113: 113,
    114: 114,
    115: 115
};

const ENGINE_POSITION_CLASSES = {
    1: [ parseEnginePositions("25.4,-2.4,25.1,1.0,23.5,4.4,21.2,7.6,18.3,10.2,14.2,12.5,10.0,14.1,5.3,15.1,0.2,15.6,-4.4,15.1,-9.5,14.3,-13.5,12.5,-17.7,10.4,-20.9,7.8,-23.2,4.7,-24.7,1.3,-25.2,-2.1,-24.5,-5.7,-23.0,-9.1,-21.1,-12.1,-17.7,-14.9,-14.1,-17.0,-9.6,-18.8,-4.7,-19.8,0.0,-20.1,5.0,-19.9,9.7,-18.8,14.1,-17.2,17.9,-14.9,21.0,-12.3,23.3,-9.2,24.7,-5.8") ],
    2: [ parseEnginePositions("42.7,-5.2,41.7,0.7,39.4,6.3,35.4,11.5,30.4,16.0,23.8,19.8,16.3,22.6,8.5,24.3,0.1,24.9,-8.0,24.3,-16.2,22.6,-23.3,19.8,-29.7,16.0,-35.0,11.5,-39.1,6.4,-41.4,0.7,-42.1,-5.2,-41.4,-11.1,-38.9,-16.7,-35.1,-21.9,-29.9,-26.4,-23.3,-30.2,-16.0,-33.0,-8.0,-34.6,0.1,-35.2,8.5,-34.6,16.5,-33.0,23.8,-30.2,30.2,-26.4,35.6,-21.9,39.6,-16.7,42.0,-11.1") ],
    3: [ parseEnginePositions("33.9,0.8,33.4,5.5,31.3,10.1,28.3,14.2,24.1,17.9,18.7,20.9,13.0,23.1,6.6,24.4,0.3,24.8,-6.6,24.5,-12.9,23.1,-18.7,20.8,-23.8,17.9,-28.1,14.3,-31.1,9.9,-33.0,5.5,-33.6,0.8,-33.0,-3.9,-31.3,-8.3,-28.0,-12.4,-23.8,-16.0,-18.7,-19.0,-12.9,-21.2,-6.5,-22.6,0.3,-23.2,6.7,-22.6,13.0,-21.2,18.8,-19.0,24.0,-16.1,28.2,-12.4,31.5,-8.3,33.4,-3.9") ],
    4: [ parseEnginePositions("31.3,-2.9,30.7,1.4,29.0,5.5,26.0,9.4,22.2,12.7,17.7,15.4,12.5,17.5,6.4,18.9,0.5,19.3,-5.5,18.9,-11.3,17.7,-16.9,15.8,-21.7,13.1,-25.5,9.8,-28.1,6.0,-30.0,1.8,-30.9,-2.3,-30.3,-6.6,-28.7,-10.7,-25.7,-14.6,-21.9,-17.9,-17.4,-20.6,-12.1,-22.7,-6.1,-24.1,-0.2,-24.5,5.8,-24.1,11.6,-22.8,17.3,-21.0,22.0,-18.3,25.9,-15.0,28.5,-11.1,30.3,-7.0") ],
    5: [ parseEnginePositions("30.8,1.5,30.3,5.7,28.5,9.7,25.8,13.5,22.0,16.7,17.1,19.5,11.8,21.5,6.1,22.7,0.5,23.0,-5.7,22.7,-11.4,21.5,-16.7,19.5,-21.2,16.7,-25.0,13.5,-27.7,9.7,-29.5,5.7,-30.0,1.5,-29.6,-2.6,-27.7,-6.8,-24.7,-10.5,-21.0,-13.8,-16.8,-16.3,-11.4,-18.3,-5.7,-19.5,0.3,-20.0,6.1,-19.5,11.8,-18.3,16.9,-16.3,22.0,-13.8,25.8,-10.5,28.5,-6.8,30.0,-2.6") ],
    6: [ parseEnginePositions("56.2,-8.5,55.4,-0.9,52.1,6.7,46.8,13.5,40.1,19.5,31.4,24.6,21.8,28.3,11.4,30.6,0.5,31.3,-10.5,30.6,-20.9,28.3,-30.9,24.8,-39.3,19.8,-46.2,13.8,-51.5,6.9,-54.7,-0.5,-55.9,-8.3,-55.1,-15.9,-51.7,-23.5,-46.4,-30.4,-39.5,-36.3,-31.4,-41.2,-21.4,-45.1,-10.8,-47.4,-0.2,-48.1,10.9,-47.4,21.2,-45.1,31.0,-41.4,39.6,-36.6,46.7,-30.6,51.8,-23.7,55.2,-16.3") ],
    7: [ parseEnginePositions("41.2,-8.2,40.5,-2.7,38.1,2.9,34.4,7.8,29.1,12.3,23.0,15.8,15.9,18.5,8.0,20.1,0.0,20.8,-8.0,20.1,-15.6,18.5,-22.7,15.8,-28.8,12.1,-34.0,7.8,-37.6,2.7,-40.2,-2.7,-40.9,-8.4,-40.2,-14.0,-37.6,-19.5,-34.0,-24.5,-28.6,-29.0,-22.6,-32.5,-15.5,-35.2,-7.8,-36.8,0.4,-37.4,8.3,-36.8,16.1,-35.2,23.0,-32.5,29.2,-28.8,34.5,-24.5,38.1,-19.3,40.5,-14.0") ],
    8: [ parseEnginePositions("51.3,-0.3,50.5,6.7,47.7,13.7,43.1,20.0,37.1,25.5,29.3,30.2,20.8,33.6,11.3,35.7,1.2,36.7,-8.7,36.1,-18.4,34.2,-27.2,31.0,-35.0,26.5,-41.7,21.2,-46.5,15.0,-49.5,8.2,-50.7,1.2,-50.2,-5.8,-47.6,-12.5,-42.7,-19.0,-36.7,-24.5,-29.3,-29.0,-20.4,-32.5,-10.9,-34.8,-1.1,-35.5,9.1,-35.0,19.0,-33.3,27.8,-30.0,35.5,-25.5,42.3,-20.3,47.0,-14.0,50.1,-7.3") ],
    9: [ parseEnginePositions("55.8,-1.0,54.5,6.7,51.5,14.0,46.5,20.7,39.5,26.7,31.5,31.5,21.5,35.2,11.3,37.5,0.5,38.2,-10.2,37.5,-20.5,35.2,-30.2,31.7,-38.2,26.7,-45.7,21.0,-50.7,14.2,-54.0,7.0,-54.7,-0.8,-53.9,-8.3,-50.2,-15.8,-45.2,-22.5,-38.9,-28.3,-30.2,-33.3,-21.1,-36.8,-10.7,-39.0,0.1,-39.8,10.7,-39.0,21.8,-37.0,30.8,-33.3,39.5,-28.5,46.1,-22.5,51.1,-15.8,54.5,-8.5") ],
    10: [ parseEnginePositions("88.1,-14.8,86.8,-2.8,82.0,9.0,73.9,20.0,63.1,29.5,50.0,37.2,34.8,43.2,18.3,46.9,1.3,48.2,-15.9,47.2,-32.5,43.7,-47.9,38.2,-61.2,30.5,-72.4,21.2,-80.7,10.5,-86.1,-1.0,-87.7,-13.3,-86.2,-25.5,-81.2,-37.3,-73.5,-48.0,-62.9,-57.5,-49.5,-65.5,-34.7,-71.3,-18.0,-75.0,-0.9,-76.3,16.3,-75.3,32.8,-71.9,48.1,-66.3,61.8,-58.8,72.6,-49.3,80.9,-38.5,86.3,-27.0") ],
    63: [ parseEnginePositions("75.1,-17.0,74.7,-6.5,71.8,3.7,65.6,13.7,56.7,22.5,45.1,30.2,31.5,35.9,16.2,39.5,0.0,40.8,-15.6,39.5,-31.3,36.2,-44.5,30.3,-56.4,23.0,-65.5,14.2,-71.3,4.1,-74.8,-6.0,-74.9,-16.6,-72.7,-26.3,-67.1,-35.9,-59.7,-44.2,-50.4,-51.1,-39.0,-57.1,-27.0,-61.2,-14.0,-63.7,-0.6,-64.5,13.0,-64.0,26.0,-61.2,38.2,-57.2,49.4,-51.5,59.4,-44.6,66.8,-36.4,71.8,-26.8") ],
    64: [ parseEnginePositions("67.8,6.8,68.5,16.7,66.4,26.6,61.9,36.1,53.8,45.1,43.5,52.9,30.6,58.9,15.8,62.7,0.6,64.0,-14.5,62.8,-29.2,59.1,-42.0,53.3,-52.4,45.6,-60.9,36.9,-65.7,27.1,-68.2,17.2,-67.8,7.3,-64.5,-2.2,-59.3,-10.8,-52.6,-18.1,-43.8,-24.5,-33.5,-29.7,-23.1,-33.1,-11.8,-35.3,-0.3,-36.1,11.6,-35.5,23.3,-33.5,33.7,-29.7,43.9,-24.9,52.2,-18.5,59.8,-11.2,65.0,-2.6") ],
    65: [ parseEnginePositions("69.8,-31.9,70.7,-23.0,68.8,-13.8,63.8,-4.9,56.0,3.4,44.7,10.7,31.5,16.1,16.3,19.6,0.5,20.6,-16.1,19.6,-31.4,16.0,-44.5,10.3,-54.8,2.9,-63.1,-5.4,-68.0,-14.2,-69.5,-23.5,-68.5,-32.3,-65.1,-40.7,-59.7,-48.0,-52.6,-54.5,-43.6,-59.9,-33.5,-64.3,-22.7,-67.4,-11.4,-69.2,0.3,-69.8,12.1,-69.2,23.3,-67.2,34.4,-64.2,44.3,-59.8,53.5,-54.4,60.4,-47.7,66.3,-40.2") ],
    66: [ parseEnginePositions("77.9,-2.4,77.0,8.5,72.0,19.3,65.1,29.1,55.4,37.6,43.1,45.0,29.9,50.1,15.4,53.3,0.6,54.1,-14.8,53.0,-29.8,50.1,-43.3,44.7,-54.6,37.6,-64.3,29.1,-72.0,19.3,-76.2,8.5,-77.5,-2.6,-75.7,-13.7,-71.2,-24.5,-64.3,-34.2,-54.6,-42.8,-43.2,-49.7,-29.0,-55.3,-15.0,-58.2,0.2,-59.3,15.6,-58.2,30.2,-55.0,43.5,-49.6,55.4,-42.8,65.6,-34.2,72.4,-24.2,77.0,-13.7") ],
    67: [ parseEnginePositions("82.2,-12.6,81.3,-2.1,76.7,8.6,69.3,18.2,59.4,26.5,47.1,33.7,32.9,39.0,17.8,42.1,1.8,43.6,-14.3,42.6,-29.5,39.5,-43.9,34.8,-56.7,27.9,-67.1,19.6,-74.7,9.8,-79.8,-0.3,-81.4,-11.0,-79.9,-21.9,-75.6,-32.3,-68.0,-42.1,-58.5,-50.5,-45.7,-57.7,-31.6,-62.9,-16.8,-66.1,-0.7,-67.3,15.2,-66.6,30.8,-63.5,45.0,-58.5,57.6,-51.6,68.0,-43.3,75.7,-33.9,80.6,-23.5") ],
    84: [ parseEnginePositions("46.85,-1.45,45,7.6,42,13.55,37,19,32,24.45,25,29,17.5,30,9,32.5,0,33,-9,33,-18,30.6,-25,27,-32,23,-37.5,18,-41,12,-43.5,6.45,-44,-1,-43,-7,-41.55,-12.45,-38.5,-19.05,-32.35,-25.95,-25,-29.15,-18,-32.05,-9.5,-33.6,-1,-36,8.85,-36,17,-33,24,-29.15,31,-25,34.95,-21.1,42.85,-17.2,46,-8") ],
    85: [ parseEnginePositions("38.35,-16.95,37,-11.4,35,-6.45,31,-2,27,1.45,23,5,16,8,9,10,0,11.7,-7,10.4,-13,10.1,-18,7,-24,2,-29,-3,-31,-7,-34.5,-13.55,-34,-19,-33,-24,-31.55,-29.95,-29,-34.05,-24.35,-37.95,-19,-42.15,-12,-47.05,-5,-48.1,3,-50,13.35,-49,21,-46,28,-41.65,32,-36,34.95,-31.1,37.85,-27.2,39,-23") ],
    112: [ parseEnginePositions("40.8,2.4,40.5,8.2,38.4,13.9,35.0,19.0,29.9,23.8,23.8,27.9,16.7,30.9,8.5,32.6,0.0,33.3,-8.5,32.6,-16.3,30.9,-23.8,28.2,-30.3,24.1,-35.4,19.4,-38.8,14.3,-40.8,8.5,-41.1,2.7,-40.1,-2.7,-37.4,-8.2,-33.7,-12.9,-28.6,-17.0,-22.4,-20.4,-15.6,-22.8,-8.2,-24.5,-0.7,-24.8,7.1,-24.5,14.3,-23.1,21.4,-20.7,27.5,-17.3,32.6,-13.3,36.7,-8.5,39.4,-3.1"), parseEnginePositions("62.2,4.1,58.5,12.6,52.4,20.4,43.5,27.5,33.0,33.3,20.7,37.1,7.5,39.4,-6.1,39.4,-19.4,37.7,-31.6,34.0,-42.5,28.6,-51.7,21.8,-58.1,13.6,-62.6,5.1,-64.3,-3.7,-63.2,-12.2,-60.2,-20.7,-54.7,-28.2,-47.6,-34.7,-38.8,-40.5,-28.9,-44.9,-18.4,-47.6,-6.8,-49.3,4.8,-49.3,16.0,-47.9,26.9,-45.2,37.1,-41.1,45.9,-35.7,53.4,-29.2,58.8,-21.8,62.6,-13.6,63.6,-4.8"), parseEnginePositions("59.5,-21.1,62.9,-12.9,63.9,-4.1,62.2,4.8,58.1,13.3,51.7,21.4,42.8,28.2,32.0,33.7,19.7,37.7,6.5,39.8,-7.1,39.8,-20.7,37.4,-33.0,33.7,-43.5,28.2,-52.4,21.1,-58.8,13.3,-62.9,4.4,-64.3,-4.4,-63.2,-12.9,-59.8,-21.4,-54.4,-28.9,-46.9,-35.4,-38.1,-40.8,-28.2,-45.2,-17.3,-47.9,-5.8,-49.6,5.8,-49.3,17.0,-47.9,27.9,-45.2,38.1,-40.8,46.9,-35.4,54.1,-28.6") ],
    113: [ parseEnginePositions("69.6,21.4,66.8,31.5,61.2,41.0,53.2,49.7,42.3,57.1,29.7,62.7,15.4,66.2,0.7,67.2,-14.4,66.2,-28.7,63.0,-41.7,57.8,-52.5,50.4,-61.2,42.0,-67.2,32.6,-70.0,22.8,-70.3,12.6,-67.9,2.8,-63.4,-6.3,-56.4,-14.3,-47.6,-21.3,-37.1,-26.6,-25.9,-30.8,-13.7,-33.2,-1.1,-34.3,11.5,-33.6,23.8,-31.1,35.3,-27.3,45.8,-21.7,54.6,-15.0,61.9,-7.0,66.8,1.8,69.6,11.6"), parseEnginePositions("67.5,3.9,69.6,13.7,68.9,23.5,65.8,33.6,59.5,42.7,50.8,51.1,39.5,58.1,26.6,63.3,12.2,66.5,-2.8,67.2,-17.5,65.4,-31.9,61.6,-44.1,56.0,-54.6,48.7,-62.7,39.9,-67.9,30.1,-70.0,20.3,-69.7,10.5,-66.8,0.7,-61.6,-8.0,-54.2,-15.7,-45.2,-22.4,-34.7,-27.6,-23.1,-31.5,-10.9,-33.6,1.8,-33.9,14.3,-32.9,26.2,-30.1,37.4,-26.2,47.6,-20.3,56.3,-13.3,63.0,-5.2") ],
    114: [ parseEnginePositions("110.2,16.7,101.8,31.9,89.7,46.4,73.0,58.5,54.0,68.4,31.9,75.2,7.6,78.3,-16.0,77.5,-39.5,73.7,-60.8,66.1,-79.8,55.5,-95.0,42.6,-106.4,28.1,-112.5,12.2,-114.8,-3.8,-112.5,-20.5,-106.4,-35.7,-96.5,-49.4,-82.8,-61.6,-66.9,-71.4,-48.6,-79.0,-28.9,-83.6,-8.4,-85.9,12.2,-85.9,32.7,-82.8,52.4,-76.8,69.9,-68.4,85.1,-58.5,98.0,-45.6,107.2,-31.2,112.5,-16.0,113.2,0.0"), parseEnginePositions("104.9,-37.2,111.7,-22.0,114.0,-6.1,112.5,9.9,106.4,26.6,95.8,41.0,81.3,54.7,62.3,65.4,41.0,73.7,17.5,78.3,-6.8,79.0,-30.4,76.0,-53.2,69.9,-73.7,60.8,-90.4,48.6,-103.4,34.2,-111.7,18.2,-115.5,2.3,-114.8,-13.7,-110.2,-29.6,-101.8,-44.1,-88.9,-57.0,-73.7,-68.4,-56.2,-76.8,-37.2,-82.8,-16.7,-85.9,4.6,-86.6,25.1,-85.1,44.8,-79.8,63.8,-73.0,80.6,-63.1,94.2,-50.9") ],
    115: [ parseEnginePositions("146.6,4.9,144.1,25.2,136.0,44.8,123.0,63.5,104.2,79.8,82.2,92.8,57.0,102.6,29.3,108.3,0.0,110.7,-28.5,109.1,-56.2,102.6,-82.2,93.6,-104.2,80.6,-123.0,64.3,-136.8,46.4,-145.8,26.9,-148.2,6.5,-145.8,-13.8,-137.6,-33.4,-124.6,-52.1,-105.9,-67.6,-83.9,-81.4,-58.6,-91.2,-30.9,-96.9,-1.6,-99.3,26.9,-97.7,54.6,-91.2,80.6,-82.2,102.6,-69.2,121.3,-52.9,135.2,-35.0,144.1,-15.5") ]
};

function parseEnginePositions(csv) {
    const parts = csv.split(",").map(Number);
    const coords = [];
    for (let i = 0; i < parts.length; i += 2) {
        coords.push({
            x: parts[i],
            y: parts[i + 1]
        });
    }
    return coords;
}

function getEngineOffsetsForFrame(shipId, frameIndex) {
    const engineClassId = SHIP_ENGINE_CLASS[shipId];
    if (!engineClassId) return null;
    const positionsList = ENGINE_POSITION_CLASSES[engineClassId];
    if (!positionsList || positionsList.length === 0) return null;
    const offsets = [];
    for (const positions of positionsList) {
        if (!positions || positions.length === 0) continue;
        const idx = (frameIndex % positions.length + positions.length) % positions.length;
        const point = positions[idx];
        if (!point) continue;
        if (Array.isArray(point)) {
            offsets.push({
                x: point[0],
                y: point[1]
            });
        } else {
            offsets.push({
                x: point.x,
                y: point.y
            });
        }
    }
    return offsets.length > 0 ? offsets : null;
}

const STATION_SPRITE_DEFS = {
    blueStation: {
        path: "graphics/stations/blueStation/1.png"
    },
    greenStation: {
        path: "graphics/stations/greenStation/1.png"
    },
    redStation: {
        path: "graphics/stations/redStation/1.png"
    },
    healthStation: {
        path: "graphics/stations/healthStation/1.png"
    },
    relayStation: {
        path: "graphics/stations/relayStation/1.png"
    },
    pirateStation: {
        path: "graphics/stations/pirateStation/1.png"
    }
};

const flashStationPatternsByFaction = new Map;

const flashStationPatternsByResKey = new Map;

function parseFlashStationPatternsFromXml(xmlDoc) {
    flashStationPatternsByFaction.clear();
    flashStationPatternsByResKey.clear();
    if (!xmlDoc) return;
    const nodes = xmlDoc.querySelectorAll("patterns > stations > station");
    nodes.forEach(node => {
        const factionId = parseInt(node.getAttribute("factionID") || "", 10);
        const resKey = String(node.getAttribute("resKey") || "").trim();
        const width = parseInt(node.getAttribute("width") || "", 10);
        const height = parseInt(node.getAttribute("height") || "", 10);
        if (!resKey || !Number.isFinite(width) || !Number.isFinite(height)) return;
        const meta = {
            factionId: Number.isFinite(factionId) ? factionId : null,
            resKey: resKey,
            width: width,
            height: height
        };
        if (meta.factionId !== null) flashStationPatternsByFaction.set(meta.factionId, meta);
        flashStationPatternsByResKey.set(resKey, meta);
    });
}

window.getFlashStationPatternMeta = function getFlashStationPatternMeta(station) {
    const s = station || {};
    if (Number.isFinite(s.typeId) && flashStationPatternsByFaction.has(s.typeId)) {
        return flashStationPatternsByFaction.get(s.typeId);
    }
    if (Number.isFinite(s.factionId) && flashStationPatternsByFaction.has(s.factionId)) {
        return flashStationPatternsByFaction.get(s.factionId);
    }
    const key = String(s.type || "").trim();
    if (key && flashStationPatternsByResKey.has(key)) {
        return flashStationPatternsByResKey.get(key);
    }
    return null;
};

const PORTAL_ANIM_FPS = 30;

const PORTAL_SPRITE_DEFS = {
    standard: {
        idle: {
            frameCount: 90,
            basePath: "graphics/portals/standardGate/sprites/DefineSprite_5_pulseAnimation/",
            fps: PORTAL_ANIM_FPS,
            loop: true,
            atlasPath: "graphics/atlas/portals_standard_v1.png",
            atlasColumns: 10,
            atlasCellWidth: 322,
            atlasCellHeight: 322,
            atlasPadding: 1,
            frameWidth: 320,
            frameHeight: 320,
            atlasStartIndex: 0
        },
        active: {
            frameCount: 1,
            basePath: "graphics/portals/standardGate/sprites/DefineSprite_8_activeAnimation/",
            fps: 1,
            loop: false,
            atlasPath: "graphics/atlas/portals_standard_v1.png",
            atlasColumns: 10,
            atlasCellWidth: 322,
            atlasCellHeight: 322,
            atlasPadding: 1,
            frameWidth: 320,
            frameHeight: 320,
            atlasStartIndex: 90
        }
    },
    galaxyGate1: {
        idle: {
            frameCount: 90,
            basePath: "graphics/portals/galaxyGate1/sprites/DefineSprite_5_pulseAnimation/",
            fps: PORTAL_ANIM_FPS,
            loop: true,
            atlasPath: "graphics/atlas/portals_galaxy1_v1.png",
            atlasColumns: 9,
            atlasCellWidth: 412,
            atlasCellHeight: 355,
            atlasPadding: 1,
            frameWidth: 410,
            frameHeight: 353,
            atlasStartIndex: 0
        },
        active: {
            frameCount: 1,
            basePath: "graphics/portals/galaxyGate1/sprites/DefineSprite_8_activeAnimation/",
            fps: 1,
            loop: false,
            atlasPath: "graphics/atlas/portals_galaxy1_v1.png",
            atlasColumns: 9,
            atlasCellWidth: 412,
            atlasCellHeight: 355,
            atlasPadding: 1,
            frameWidth: 410,
            frameHeight: 353,
            atlasStartIndex: 90
        }
    },
    galaxyGate2: {
        idle: {
            frameCount: 90,
            basePath: "graphics/portals/galaxyGate2/sprites/DefineSprite_5_pulseAnimation/",
            fps: PORTAL_ANIM_FPS,
            loop: true,
            atlasPath: "graphics/atlas/portals_galaxy2_v1.png",
            atlasColumns: 9,
            atlasCellWidth: 412,
            atlasCellHeight: 355,
            atlasPadding: 1,
            frameWidth: 410,
            frameHeight: 353,
            atlasStartIndex: 0
        },
        active: {
            frameCount: 1,
            basePath: "graphics/portals/galaxyGate2/sprites/DefineSprite_8_activeAnimation/",
            fps: 1,
            loop: false,
            atlasPath: "graphics/atlas/portals_galaxy2_v1.png",
            atlasColumns: 9,
            atlasCellWidth: 412,
            atlasCellHeight: 355,
            atlasPadding: 1,
            frameWidth: 410,
            frameHeight: 353,
            atlasStartIndex: 90
        }
    },
    galaxyGate3: {
        idle: {
            frameCount: 90,
            basePath: "graphics/portals/galaxyGate3/sprites/DefineSprite_5_pulseAnimation/",
            fps: PORTAL_ANIM_FPS,
            loop: true,
            atlasPath: "graphics/atlas/portals_galaxy3_v1.png",
            atlasColumns: 9,
            atlasCellWidth: 412,
            atlasCellHeight: 355,
            atlasPadding: 1,
            frameWidth: 410,
            frameHeight: 353,
            atlasStartIndex: 0
        },
        active: {
            frameCount: 1,
            basePath: "graphics/portals/galaxyGate3/sprites/DefineSprite_8_activeAnimation/",
            fps: 1,
            loop: false,
            atlasPath: "graphics/atlas/portals_galaxy3_v1.png",
            atlasColumns: 9,
            atlasCellWidth: 412,
            atlasCellHeight: 355,
            atlasPadding: 1,
            frameWidth: 410,
            frameHeight: 353,
            atlasStartIndex: 90
        }
    },
    galaxyGate4: {
        idle: {
            frameCount: 90,
            basePath: "graphics/portals/galaxyGate4/sprites/DefineSprite_5_pulseAnimation/",
            fps: PORTAL_ANIM_FPS,
            loop: true,
            atlasParts: [ {
                startFrame: 0,
                frameCount: 45,
                atlasPath: "graphics/atlas/portals_galaxy4_v1_a.png",
                atlasColumns: 8,
                atlasCellWidth: 425,
                atlasCellHeight: 456,
                atlasPadding: 1,
                frameWidth: 423,
                frameHeight: 454,
                atlasStartIndex: 0
            }, {
                startFrame: 45,
                frameCount: 45,
                atlasPath: "graphics/atlas/portals_galaxy4_v1_b.png",
                atlasColumns: 8,
                atlasCellWidth: 425,
                atlasCellHeight: 456,
                atlasPadding: 1,
                frameWidth: 423,
                frameHeight: 454,
                atlasStartIndex: 0
            } ]
        },
        active: {
            frameCount: 1,
            basePath: "graphics/portals/galaxyGate4/sprites/DefineSprite_8_activeAnimation/",
            fps: 1,
            loop: false,
            atlasPath: "graphics/atlas/portals_galaxy4_v1_b.png",
            atlasColumns: 8,
            atlasCellWidth: 425,
            atlasCellHeight: 456,
            atlasPadding: 1,
            frameWidth: 423,
            frameHeight: 454,
            atlasStartIndex: 45
        }
    }
};

const PORTAL_TYPE_TO_SPRITE_KEY = Object.freeze({
    1: "standard",
    2: "galaxyGate1",
    3: "galaxyGate2",
    4: "galaxyGate3",
    5: "galaxyGate4"
});

window.PORTAL_TYPE_TO_SPRITE_KEY = PORTAL_TYPE_TO_SPRITE_KEY;

const PORTAL_JUMP_ANIM = {
    frameCount: 70,
    atlasPath: "graphics/atlas/portal_jump_v1.png",
    frameWidth: 550,
    frameHeight: 400,
    atlasColumns: 7,
    atlasCellWidth: 552,
    atlasCellHeight: 402,
    atlasPadding: 1,
    frameDuration: 40,
    offsetX: 0,
    offsetY: 0
};

const SMARTBOMB_ANIM = {
    // Lighter Smartbomb visual rebuilt from smartbomb1.swf: 28 frames, one compact atlas.
    // The gameplay packet, cooldown, damage, range and item consumption stay unchanged.
    frameCount: 28,
    frameWidth: 320,
    frameHeight: 320,
    atlasPath: "graphics/atlas/pyro_smartbomb1_v1_a.png",
    atlasColumns: 7,
    atlasCellWidth: 320,
    atlasCellHeight: 320,
    atlasPadding: 0,
    // SWF source runs at 12 fps: 28 frames * ~83 ms = ~2.3 s, shorter than the old 213-frame effect.
    frameDuration: 83,
    offsetX: 0,
    offsetY: 0
};

const EXPLOSION_ANIMATIONS = {
    0: {
        frameCount: 56,
        atlasPath: "graphics/atlas/pyro_explosion0_v1.png",
        frameWidth: 320,
        frameHeight: 288,
        atlasColumns: 8,
        atlasCellWidth: 322,
        atlasCellHeight: 290,
        atlasPadding: 1,
        frameDuration: 40
    },
    1: {
        frameCount: 80,
        atlasPath: "graphics/atlas/pyro_explosion1_v1.png",
        frameWidth: 350,
        frameHeight: 350,
        atlasColumns: 8,
        atlasCellWidth: 352,
        atlasCellHeight: 352,
        atlasPadding: 1,
        frameDuration: 40
    },
    2: {
        frameCount: 15,
        atlasPath: "graphics/atlas/pyro_explosion2_v1.png",
        frameWidth: 150,
        frameHeight: 150,
        atlasColumns: 5,
        atlasCellWidth: 152,
        atlasCellHeight: 152,
        atlasPadding: 1,
        frameDuration: 40
    },
    3: {
        frameCount: 28,
        atlasPath: "graphics/atlas/pyro_explosion3_v1.png",
        frameWidth: 350,
        frameHeight: 350,
        atlasColumns: 7,
        atlasCellWidth: 352,
        atlasCellHeight: 352,
        atlasPadding: 1,
        frameDuration: 40
    },
    4: {
        frameCount: 35,
        atlasPath: "graphics/atlas/pyro_explosion4_v1.png",
        frameWidth: 350,
        frameHeight: 350,
        atlasColumns: 7,
        atlasCellWidth: 352,
        atlasCellHeight: 352,
        atlasPadding: 1,
        frameDuration: 40
    },
    5: {
        frameCount: 40,
        atlasPath: "graphics/atlas/pyro_explosion5_v1.png",
        frameWidth: 300,
        frameHeight: 300,
        atlasColumns: 8,
        atlasCellWidth: 302,
        atlasCellHeight: 302,
        atlasPadding: 1,
        frameDuration: 40
    }
};

const ROCKET_DAMAGE_ANIM_FPS = 25;

const ROCKET_DAMAGE_SPRITES = {
    0: {
        frameCount: 11,
        atlasPath: "graphics/atlas/pyro_rocketDamage0_v1.png",
        frameWidth: 150,
        frameHeight: 150,
        atlasColumns: 4,
        atlasCellWidth: 152,
        atlasCellHeight: 152,
        atlasPadding: 1,
        fps: ROCKET_DAMAGE_ANIM_FPS
    },
    1: {
        frameCount: 31,
        atlasPath: "graphics/atlas/pyro_rocketDamage1_v1.png",
        frameWidth: 200,
        frameHeight: 200,
        atlasColumns: 6,
        atlasCellWidth: 202,
        atlasCellHeight: 202,
        atlasPadding: 1,
        fps: ROCKET_DAMAGE_ANIM_FPS
    },
    2: {
        frameCount: 19,
        atlasPath: "graphics/atlas/pyro_rocketDamage2_v1.png",
        frameWidth: 150,
        frameHeight: 150,
        atlasColumns: 5,
        atlasCellWidth: 152,
        atlasCellHeight: 152,
        atlasPadding: 1,
        fps: ROCKET_DAMAGE_ANIM_FPS
    }
};

const DEFAULT_ROCKET_SPRITE_ID = 1;

const ROCKET_SPRITE_DEFS = {
    1: {
        path: "graphics/rockets/rocket1/1.png"
    },
    2: {
        path: "graphics/rockets/rocket2/1.png"
    },
    3: {
        path: "graphics/rockets/rocket3/1.png"
    },
    7: {
        path: "graphics/rockets/rocket7/1.png"
    },
    8: {
        path: "graphics/rockets/rocket8/1.png"
    },
    9: {
        path: "graphics/rockets/rocket9/1.png"
    },
    10: {
        path: "graphics/rockets/rocket10/1.png"
    }
};

const EMP_ANIM = {
    ring: {
        atlasPath: "graphics/atlas/pyro_shockwaves_v1.png",
        atlasFrameIndex: 0,
        frameWidth: 256,
        frameHeight: 256,
        atlasColumns: 4,
        atlasCellWidth: 258,
        atlasCellHeight: 258,
        atlasPadding: 1,
        duration: 1500,
        startScale: .1,
        endScale: 3.5,
        startAlpha: .3,
        endAlpha: 0,
        count: 5,
        delay: 100
    },
    blitz: {
        atlasPath: "graphics/atlas/pyro_shockwaves_v1.png",
        atlasStartFrame: 1,
        frameCount: 10,
        frameWidth: 256,
        frameHeight: 256,
        atlasColumns: 4,
        atlasCellWidth: 258,
        atlasCellHeight: 258,
        atlasPadding: 1,
        frameDuration: 1e3 / 15,
        duration: 1500,
        startScale: .1,
        endScale: 3.5,
        fadeOutStart: 750,
        fadeOutDuration: 250
    }
};

const SHIELD_ANIM_FPS = 30;
const INSTA_SHIELD_ANIM_FPS = 50;
const INSTA_SHIELD_FRAME_COUNT = 22;
const INSTA_SHIELD_VISUAL_DURATION_MS = INSTA_SHIELD_FRAME_COUNT / INSTA_SHIELD_ANIM_FPS * 1e3;

const SHIELD_SPRITE_DEFS = {
    standard: {
        frameCount: 51,
        fps: SHIELD_ANIM_FPS,
        loop: true,
        atlasPath: "graphics/atlas/shield1_v1.png",
        frameWidth: 200,
        frameHeight: 200,
        atlasColumns: 8,
        atlasCellWidth: 202,
        atlasCellHeight: 202,
        atlasPadding: 1
    },
    low: {
        frameCount: 33,
        fps: SHIELD_ANIM_FPS,
        loop: true,
        atlasPath: "graphics/atlas/shield0_v1.png",
        frameWidth: 192,
        frameHeight: 192,
        atlasColumns: 6,
        atlasCellWidth: 194,
        atlasCellHeight: 194,
        atlasPadding: 1
    },
    twinkle0: {
        frameCount: 33,
        fps: 15,
        loop: true,
        atlasPath: "graphics/atlas/shield0_v1.png",
        frameWidth: 192,
        frameHeight: 192,
        atlasColumns: 6,
        atlasCellWidth: 194,
        atlasCellHeight: 194,
        atlasPadding: 1
    },
    tech_shield_backup: {
        frameCount: 51,
        fps: 15,
        loop: false,
        atlasPath: "graphics/atlas/shield1_v1.png",
        frameWidth: 200,
        frameHeight: 200,
        atlasColumns: 8,
        atlasCellWidth: 202,
        atlasCellHeight: 202,
        atlasPadding: 1
    },
    insta: {
        frameCount: INSTA_SHIELD_FRAME_COUNT,
        fps: INSTA_SHIELD_ANIM_FPS,
        loop: false,
        durationMs: INSTA_SHIELD_VISUAL_DURATION_MS,
        atlasPath: "graphics/atlas/insta_shield_v2_light.png",
        frameWidth: 320,
        frameHeight: 320,
        atlasColumns: 6,
        atlasCellWidth: 322,
        atlasCellHeight: 322,
        atlasPadding: 1
    },
    invincibility: {
        frameCount: 31,
        fps: SHIELD_ANIM_FPS,
        loop: true,
        atlasPath: "graphics/atlas/invincibility_shield_v1.png",
        frameWidth: 400,
        frameHeight: 400,
        atlasColumns: 6,
        atlasCellWidth: 402,
        atlasCellHeight: 402,
        atlasPadding: 1
    },
    hit: {
        frameCount: 9,
        fps: SHIELD_ANIM_FPS,
        loop: false,
        atlasPath: "graphics/atlas/shield_damage_v1.png",
        frameWidth: 320,
        frameHeight: 320,
        atlasColumns: 3,
        atlasCellWidth: 322,
        atlasCellHeight: 322,
        atlasPadding: 1,
        pivotX: 246,
        pivotY: 157
    }
};

const LASER_DAMAGE_ANIM_FPS = 37;

const LASER_DAMAGE_SPRITES = {
    0: {
        frameCount: 15,
        atlasPath: "graphics/atlas/pyro_laserDamage0_v1.png",
        frameWidth: 150,
        frameHeight: 150,
        atlasColumns: 5,
        atlasCellWidth: 152,
        atlasCellHeight: 152,
        atlasPadding: 1,
        fps: LASER_DAMAGE_ANIM_FPS
    },
    1: {
        frameCount: 15,
        atlasPath: "graphics/atlas/pyro_laserDamage1_v1.png",
        frameWidth: 150,
        frameHeight: 150,
        atlasColumns: 5,
        atlasCellWidth: 152,
        atlasCellHeight: 152,
        atlasPadding: 1,
        fps: LASER_DAMAGE_ANIM_FPS
    },
    2: {
        frameCount: 15,
        atlasPath: "graphics/atlas/pyro_laserDamage2_v1.png",
        frameWidth: 150,
        frameHeight: 150,
        atlasColumns: 5,
        atlasCellWidth: 152,
        atlasCellHeight: 152,
        atlasPadding: 1,
        fps: LASER_DAMAGE_ANIM_FPS
    }
};

const UI_SPRITES = {
    heroHudBg: "graphics/ui/ui/images/156_bg_standard.png.png",
    heroHudActiveBg: "graphics/ui/ui/images/157_bg_active.png.png",
    heroHpIcon: "graphics/ui/ui/images/65_hp_small.png.png",
    heroHpBar: "graphics/ui/ui/images/66_hp_bar.png.png",
    heroShieldIcon: "graphics/ui/ui/images/16_shipInfoIcon_shield.png",
    heroShieldBar: "graphics/ui/ui/images/15_shield_bar.png.png",
    heroCargoIcon: "graphics/ui/ui/images/102_shipInfoIcon_cargo.png",
    quickbarSlot: "graphics/ui/actionMenu/images/8_slot.png",
    minimapFrame: "graphics/ui/minimap/images/24.png",
    minimapBg: "graphics/ui/minimap/images/19.png",
    minimapOverlay: "graphics/ui/minimap/sprites/DefineSprite_27_minimapOverlay/1.png",
    minimapGrid: "graphics/ui/minimap/images/20.png",
    targetRingOwned: "graphics/ui/ui/images/309.png",
    targetRingUnowned: "graphics/ui/ui/images/311.png",
    windowBg: "",
    windowHeader: "",
    windowHeaderAlt: "graphics/ui/window/images/219.png",
    windowFooter: "",
    windowTopEdge: "",
    windowBottomEdge: "graphics/ui/window/images/223.png",
    windowSide: "graphics/ui/window/images/78.png",
    windowCornerTL: "graphics/ui/window/images/201.png",
    windowCornerTR: "graphics/ui/window/images/205.png",
    windowCornerBL: "graphics/ui/window/images/208.png",
    windowCornerBR: "graphics/ui/window/images/212.png",
    windowCornerAltL: "graphics/ui/window/images/203.png",
    windowCornerAltR: "graphics/ui/window/images/214.png",
    windowDivider: "graphics/ui/window/images/223.png",
    buttonClose: "graphics/ui/window/images/btn_close.png",
    buttonCloseHover: "graphics/ui/window/images/btn_close_hover.png",
    buttonCollapse: "graphics/ui/window/images/btn_minimize.png",
    buttonCollapseHover: "graphics/ui/window/images/btn_minimize_hover.png",
    chatBg: "",
    chatInputBg: "",
    chatButton: "graphics/ui/window/images/btn_minimize.png",
    dockBg: "",
    dockIconGroup: "graphics/ui/window1/images/groupsystem_icon.png",
    dockIconChat: "graphics/ui/window1/images/chat_icon.png",
    quickbarLockIcon: "graphics/ui/window1/images/info_icon.png",
    quickbarRotateIcon: "graphics/ui/window1/images/log_icon.png",
    quickbarMinimizeIcon: "graphics/ui/window1/images/help_icon.png",
    minimapWindowIcon: "graphics/ui/window1/images/map_icon.png",
    iconAmmo: "graphics/ui/actionMenu/images/42_laser.png.png",
    iconRocket: "graphics/ui/actionMenu/images/20_rocket.png.png",
    iconTech: "graphics/ui/actionMenu/images/3_tech_icon.png.png",
    iconCpu: "graphics/ui/actionMenu/images/73_cpu.png.png",
    iconMine: "graphics/ui/actionMenu/images/19_rocket_probability_maximizer.png.png",
    iconLevel: "graphics/ui/ui/images/57_shipInfoIcon_level.png",
    iconLaser: "graphics/ui/ui/images/58_shipInfoIcon_laser.png",
    iconRocketInfo: "graphics/ui/ui/images/18_shipInfoIcon_rockets.png",
    iconBootyKey: "graphics/ui/ui/images/59_shipInfoIcon_bootykey.png",
    iconJumpVoucher: "graphics/ui/ui/images/61_shipInfoIcon_jumpvoucher.png",
    mainMenuIconShip: "graphics/ui/window1/images/player_icon.png",
    mainMenuIconMap: "graphics/ui/window1/images/map_icon.png",
    mainMenuIconLog: "graphics/ui/window1/images/log_icon.png",
    mainMenuIconInfo: "graphics/ui/window1/images/info_icon.png",
    mainMenuIconHelp: "graphics/ui/window1/images/help_icon.png",
    mainMenuIconGroup: "graphics/ui/window1/images/groupsystem_icon.png",
    mainMenuIconChat: "graphics/ui/window1/images/chat_icon.png",
    chatCornerTL: "graphics/ui/window/images/192.png",
    chatCornerTR: "graphics/ui/window/images/210.png",
    chatCornerBL: "graphics/ui/window/images/208.png",
    chatCornerBR: "graphics/ui/window/images/212.png",
    chatTopEdge: "graphics/ui/window/images/221.png",
    chatBottomEdge: "graphics/ui/window/images/223.png",
    chatSide: "graphics/ui/window/images/78.png",
    chatBgTile: "",
    chatHeader: "",
    chatFooter: "",
    minimapPingBase: "graphics/ui/minimap/sprites/DefineSprite_29_minimapmarker/1.png",
    minimapPortalIcon: "graphics/ui/minimap/images/2_mapIcon_portal.png",
    minimapStationIcon: "graphics/ui/minimap/images/7_mapIcon_station_0.png",
    minimapSpaceballIcon: "graphics/ui/minimap/images/1_mapIcon_spaceball.png",
    minimapFinishIcon: "graphics/ui/minimap/images/8_mapIcon_finish.png",
    minimapAlertIcon: "graphics/ui/minimap/images/9_mapIcon_alert.png",
    radiationHelp: "graphics/ui/ui/sprites/DefineSprite_323_radiationHelp/1.png"
};

const MINIMAP_SPRITE_DEFS = {
    overlay: {
        basePath: "graphics/ui/minimap/sprites/DefineSprite_27_minimapOverlay/",
        frameCount: 1,
        fps: 1,
        loop: false
    },
    groupPing: {
        basePath: "graphics/ui/minimap/sprites/DefineSprite_29_minimapmarker/",
        frameCount: 25,
        fps: 25,
        loop: true
    },
    pointer: {
        basePath: "graphics/ui/minimap/sprites/DefineSprite_17_minimapPointer/",
        frameCount: 25,
        fps: 5,
        loop: false
    }
};

const minimapSpriteCache = {};

let stations = [];

let stationImages = {};

const shipSpriteCache = {};

const shipAtlasImageCache = Object.create(null);

const shipAtlasStatusCache = Object.create(null);

const shipAtlasListenersBound = Object.create(null);

const shieldSpriteCache = {};

const laserDamageSpriteCache = {};

const rocketDamageSpriteCache = {};

const portalSpriteCache = {};

const portalJumpSpriteCache = {};

let portalJumpAtlasImage = null;

let portalJumpAtlasStatus = PORTAL_JUMP_ANIM && PORTAL_JUMP_ANIM.atlasPath ? "idle" : "disabled";

let portalJumpAtlasListenersBound = false;

const portalAtlasImageCache = {};

const portalAtlasStatusCache = {};

const portalAtlasListenersBound = {};

const pyroAtlasImageCache = {};

const pyroAtlasStatusCache = {};

const pyroAtlasListenersBound = {};

function markShipAtlasReadyIfDecoded(atlasPath, img) {
    if (!atlasPath) return false;
    if (img && img.complete && img.width > 0 && img.height > 0) {
        shipAtlasStatusCache[atlasPath] = "ready";
        return true;
    }
    return false;
}

function getShipAtlasImage(atlasPath) {
    if (!atlasPath) return null;
    if (!shipAtlasImageCache[atlasPath]) {
        shipAtlasImageCache[atlasPath] = andromedaCreateImage(atlasPath);
        shipAtlasStatusCache[atlasPath] = markShipAtlasReadyIfDecoded(atlasPath, shipAtlasImageCache[atlasPath]) ? "ready" : "loading";
    }
    const atlasImage = shipAtlasImageCache[atlasPath];
    if (!shipAtlasListenersBound[atlasPath] && atlasImage) {
        shipAtlasListenersBound[atlasPath] = true;
        atlasImage.addEventListener("load", () => {
            markShipAtlasReadyIfDecoded(atlasPath, atlasImage);
        }, {
            once: true
        });
        atlasImage.addEventListener("error", () => {
            shipAtlasStatusCache[atlasPath] = "error";
        }, {
            once: true
        });
    }
    markShipAtlasReadyIfDecoded(atlasPath, atlasImage);
    return atlasImage;
}

function buildShipAtlasFrameCanvas(def, frameIndex = 0) {
    if (!def || !def.atlasPath) return null;
    const atlas = getShipAtlasImage(def.atlasPath);
    if (!atlas) return null;
    const status = shipAtlasStatusCache[def.atlasPath] || "idle";
    if (status !== "ready") return null;
    const frameCount = def.frameCount || 1;
    let idx = frameIndex % frameCount;
    if (idx < 0) idx += frameCount;
    let sx = 0;
    let sy = 0;
    let sw = 0;
    let sh = 0;
    let atlasIndex = idx;
    const manifestFrames = Array.isArray(def.atlasFrames) ? def.atlasFrames : null;
    if (manifestFrames && manifestFrames.length) {
        const entry = manifestFrames[idx];
        if (!entry) {
            shipAtlasStatusCache[def.atlasPath] = "error";
            return null;
        }
        sx = entry.x;
        sy = entry.y;
        sw = entry.w;
        sh = entry.h;
    } else {
        atlasIndex = (def.atlasStartIndex || 0) + idx;
        const columns = Math.max(1, def.atlasColumns || 1);
        const cellWidth = def.atlasCellWidth || def.frameWidth || 0;
        const cellHeight = def.atlasCellHeight || def.frameHeight || 0;
        const padding = def.atlasPadding || 0;
        sw = def.frameWidth || cellWidth;
        sh = def.frameHeight || cellHeight;
        const col = atlasIndex % columns;
        const row = Math.floor(atlasIndex / columns);
        sx = col * cellWidth + padding;
        sy = row * cellHeight + padding;
    }
    if (sx + sw > atlas.width || sy + sh > atlas.height) {
        shipAtlasStatusCache[def.atlasPath] = "error";
        return null;
    }
    const frameCanvas = document.createElement("canvas");
    frameCanvas.width = sw;
    frameCanvas.height = sh;
    const frameCtx = frameCanvas.getContext("2d", {
        willReadFrequently: true
    });
    if (!frameCtx) return null;
    frameCtx.clearRect(0, 0, sw, sh);
    frameCtx.drawImage(atlas, sx, sy, sw, sh, 0, 0, sw, sh);
    frameCanvas.complete = true;
    frameCanvas.naturalWidth = sw;
    frameCanvas.naturalHeight = sh;
    frameCanvas.__atlasPath = def.atlasPath;
    frameCanvas.__atlasIndex = atlasIndex;
    return frameCanvas;
}

function markPyroAtlasReadyIfDecoded(atlasPath, img) {
    if (img && img.complete && img.width > 0 && img.height > 0) {
        pyroAtlasStatusCache[atlasPath] = "ready";
        return true;
    }
    return false;
}

function getPyroAtlasImage(atlasPath) {
    if (!atlasPath) return null;
    if (!pyroAtlasImageCache[atlasPath]) {
        pyroAtlasImageCache[atlasPath] = andromedaCreateImage(atlasPath);
        pyroAtlasStatusCache[atlasPath] = markPyroAtlasReadyIfDecoded(atlasPath, pyroAtlasImageCache[atlasPath]) ? "ready" : "loading";
    }
    const atlasImage = pyroAtlasImageCache[atlasPath];
    if (!pyroAtlasListenersBound[atlasPath] && atlasImage) {
        pyroAtlasListenersBound[atlasPath] = true;
        atlasImage.addEventListener("load", () => {
            markPyroAtlasReadyIfDecoded(atlasPath, atlasImage);
        }, {
            once: true
        });
        atlasImage.addEventListener("error", () => {
            pyroAtlasStatusCache[atlasPath] = "error";
        }, {
            once: true
        });
    }
    markPyroAtlasReadyIfDecoded(atlasPath, atlasImage);
    return atlasImage;
}

function getPyroAtlasFrame(animDef, frameIndex = 0) {
    if (!animDef || !animDef.atlasPath && !(animDef.atlasParts && animDef.atlasParts.length)) return null;
    let effectiveDef = animDef;
    let effectiveFrameIndex;
    if (typeof animDef.atlasFrameIndex === "number") {
        effectiveFrameIndex = animDef.atlasFrameIndex;
    } else {
        const frameCount = animDef.frameCount || 1;
        let normalized = frameIndex % frameCount;
        if (normalized < 0) normalized += frameCount;
        effectiveFrameIndex = normalized + (animDef.atlasStartFrame || 0);
    }
    if (animDef.atlasParts && animDef.atlasParts.length) {
        let matchedPart = null;
        for (let i = 0; i < animDef.atlasParts.length; i++) {
            const part = animDef.atlasParts[i];
            const startFrame = part.startFrame || 0;
            const partFrameCount = part.frameCount || 0;
            if (effectiveFrameIndex >= startFrame && effectiveFrameIndex < startFrame + partFrameCount) {
                matchedPart = part;
                effectiveDef = {
                    ...animDef,
                    ...part,
                    frameWidth: part.frameWidth || animDef.frameWidth,
                    frameHeight: part.frameHeight || animDef.frameHeight
                };
                effectiveFrameIndex -= startFrame;
                break;
            }
        }
        if (!matchedPart) return null;
    }
    const atlasPath = effectiveDef.atlasPath;
    const atlas = getPyroAtlasImage(atlasPath);
    if (!atlas) return null;
    const status = pyroAtlasStatusCache[atlasPath] || "idle";
    const sw = effectiveDef.frameWidth || effectiveDef.atlasCellWidth || 0;
    const sh = effectiveDef.frameHeight || effectiveDef.atlasCellHeight || 0;
    if (status !== "ready") {
        return status === "error" ? null : {
            pendingAtlas: true,
            width: sw,
            height: sh
        };
    }
    const columns = Math.max(1, effectiveDef.atlasColumns || 1);
    const cellWidth = effectiveDef.atlasCellWidth || sw;
    const cellHeight = effectiveDef.atlasCellHeight || sh;
    const padding = effectiveDef.atlasPadding || 0;
    const col = effectiveFrameIndex % columns;
    const row = Math.floor(effectiveFrameIndex / columns);
    const sx = col * cellWidth + padding;
    const sy = row * cellHeight + padding;
    if (sx + sw > atlas.width || sy + sh > atlas.height) {
        pyroAtlasStatusCache[atlasPath] = "error";
        return null;
    }
    return {
        atlas: atlas,
        sx: sx,
        sy: sy,
        sw: sw,
        sh: sh,
        width: sw,
        height: sh
    };
}

function markPortalAtlasReadyIfDecoded(atlasPath, img) {
    if (img && img.complete && img.width > 0 && img.height > 0) {
        portalAtlasStatusCache[atlasPath] = "ready";
        return true;
    }
    return false;
}

function getPortalAtlasImage(atlasPath) {
    if (!atlasPath) return null;
    if (!portalAtlasImageCache[atlasPath]) {
        portalAtlasImageCache[atlasPath] = andromedaCreateImage(atlasPath);
        portalAtlasStatusCache[atlasPath] = markPortalAtlasReadyIfDecoded(atlasPath, portalAtlasImageCache[atlasPath]) ? "ready" : "loading";
    }
    const atlasImage = portalAtlasImageCache[atlasPath];
    if (!portalAtlasListenersBound[atlasPath] && atlasImage) {
        portalAtlasListenersBound[atlasPath] = true;
        atlasImage.addEventListener("load", () => {
            markPortalAtlasReadyIfDecoded(atlasPath, atlasImage);
        }, {
            once: true
        });
        atlasImage.addEventListener("error", () => {
            portalAtlasStatusCache[atlasPath] = "error";
        }, {
            once: true
        });
    }
    markPortalAtlasReadyIfDecoded(atlasPath, atlasImage);
    return atlasImage;
}

function getPortalAtlasFrame(animDef, frameIndex) {
    if (!animDef || !animDef.atlasPath && !(animDef.atlasParts && animDef.atlasParts.length)) return null;
    let effectiveDef = animDef;
    let effectiveFrameIndex = frameIndex;
    if (animDef.atlasParts && animDef.atlasParts.length) {
        const totalFrameCount = animDef.frameCount || 1;
        let normalizedFrame = frameIndex % totalFrameCount;
        if (normalizedFrame < 0) normalizedFrame += totalFrameCount;
        let matchedPart = null;
        for (let i = 0; i < animDef.atlasParts.length; i++) {
            const part = animDef.atlasParts[i];
            const startFrame = part.startFrame || 0;
            const partFrameCount = part.frameCount || 0;
            if (normalizedFrame >= startFrame && normalizedFrame < startFrame + partFrameCount) {
                matchedPart = part;
                effectiveFrameIndex = normalizedFrame - startFrame;
                effectiveDef = {
                    atlasPath: part.atlasPath || animDef.atlasPath,
                    atlasColumns: part.atlasColumns || animDef.atlasColumns,
                    atlasCellWidth: part.atlasCellWidth || animDef.atlasCellWidth,
                    atlasCellHeight: part.atlasCellHeight || animDef.atlasCellHeight,
                    atlasPadding: typeof part.atlasPadding === "number" ? part.atlasPadding : animDef.atlasPadding,
                    frameWidth: part.frameWidth || animDef.frameWidth,
                    frameHeight: part.frameHeight || animDef.frameHeight,
                    frameCount: part.frameCount || animDef.frameCount,
                    atlasStartIndex: part.atlasStartIndex || 0
                };
                break;
            }
        }
        if (!matchedPart || !effectiveDef.atlasPath) return null;
    }
    const atlas = getPortalAtlasImage(effectiveDef.atlasPath);
    if (!atlas) return null;
    const status = portalAtlasStatusCache[effectiveDef.atlasPath] || "idle";
    const frameWidth = effectiveDef.frameWidth || effectiveDef.atlasCellWidth || 0;
    const frameHeight = effectiveDef.frameHeight || effectiveDef.atlasCellHeight || 0;
    if (status !== "ready") {
        return status === "error" ? null : {
            pendingAtlas: true,
            width: frameWidth,
            height: frameHeight
        };
    }
    const frameCount = effectiveDef.frameCount || 1;
    let idx = effectiveFrameIndex % frameCount;
    if (idx < 0) idx += frameCount;
    const atlasIndex = (effectiveDef.atlasStartIndex || 0) + idx;
    const columns = Math.max(1, effectiveDef.atlasColumns || 1);
    const cellWidth = effectiveDef.atlasCellWidth || frameWidth;
    const cellHeight = effectiveDef.atlasCellHeight || frameHeight;
    const padding = effectiveDef.atlasPadding || 0;
    const col = atlasIndex % columns;
    const row = Math.floor(atlasIndex / columns);
    const sx = col * cellWidth + padding;
    const sy = row * cellHeight + padding;
    const sw = frameWidth || cellWidth;
    const sh = frameHeight || cellHeight;
    if (sx + sw > atlas.width || sy + sh > atlas.height) {
        portalAtlasStatusCache[effectiveDef.atlasPath] = "error";
        return null;
    }
    return {
        atlas: atlas,
        sx: sx,
        sy: sy,
        sw: sw,
        sh: sh,
        width: sw,
        height: sh
    };
}

function markPortalJumpAtlasReadyIfDecoded(img) {
    if (img && img.complete && img.width > 0 && img.height > 0) {
        portalJumpAtlasStatus = "ready";
        return true;
    }
    return false;
}

function getPortalJumpAtlasImage() {
    if (!PORTAL_JUMP_ANIM || !PORTAL_JUMP_ANIM.atlasPath) return null;
    if (!portalJumpAtlasImage) {
        portalJumpAtlasImage = andromedaCreateImage(PORTAL_JUMP_ANIM.atlasPath);
        portalJumpAtlasStatus = "loading";
    }
    if (!portalJumpAtlasListenersBound && portalJumpAtlasImage) {
        portalJumpAtlasListenersBound = true;
        portalJumpAtlasImage.addEventListener("load", () => {
            markPortalJumpAtlasReadyIfDecoded(portalJumpAtlasImage);
        }, {
            once: true
        });
        portalJumpAtlasImage.addEventListener("error", () => {
            portalJumpAtlasStatus = "error";
        }, {
            once: true
        });
    }
    markPortalJumpAtlasReadyIfDecoded(portalJumpAtlasImage);
    return portalJumpAtlasImage;
}

const EFFECTS_MISC_ATLAS = Object.freeze({
    path: "graphics/atlas/effects_levelup_collectorbeam_v1.png",
    sections: Object.freeze({
        levelUp: Object.freeze({
            frameCount: 49,
            frameWidth: 250,
            frameHeight: 250,
            atlasColumns: 7,
            atlasCellWidth: 252,
            atlasCellHeight: 252,
            atlasPadding: 1,
            atlasOffsetX: 0,
            atlasOffsetY: 0
        }),
        loopingCollectorBeam: Object.freeze({
            frameCount: 15,
            frameWidth: 100,
            frameHeight: 100,
            atlasColumns: 8,
            atlasCellWidth: 102,
            atlasCellHeight: 102,
            atlasPadding: 1,
            atlasOffsetX: 0,
            atlasOffsetY: 1764
        })
    })
});

let effectsMiscAtlasImage = null;

let effectsMiscAtlasStatus = EFFECTS_MISC_ATLAS && EFFECTS_MISC_ATLAS.path ? "idle" : "disabled";

let effectsMiscAtlasListenersBound = false;

function markEffectsMiscAtlasReadyIfDecoded(img) {
    if (img && img.complete && img.width > 0 && img.height > 0) {
        effectsMiscAtlasStatus = "ready";
        return true;
    }
    return false;
}

function getEffectsMiscAtlasImage() {
    if (!EFFECTS_MISC_ATLAS || !EFFECTS_MISC_ATLAS.path) return null;
    if (!effectsMiscAtlasImage) {
        effectsMiscAtlasImage = andromedaCreateImage(EFFECTS_MISC_ATLAS.path);
        effectsMiscAtlasStatus = markEffectsMiscAtlasReadyIfDecoded(effectsMiscAtlasImage) ? "ready" : "loading";
    }
    if (!effectsMiscAtlasListenersBound && effectsMiscAtlasImage) {
        effectsMiscAtlasListenersBound = true;
        effectsMiscAtlasImage.addEventListener("load", () => {
            markEffectsMiscAtlasReadyIfDecoded(effectsMiscAtlasImage);
        }, {
            once: true
        });
        effectsMiscAtlasImage.addEventListener("error", () => {
            effectsMiscAtlasStatus = "error";
        }, {
            once: true
        });
    }
    markEffectsMiscAtlasReadyIfDecoded(effectsMiscAtlasImage);
    return effectsMiscAtlasImage;
}

function getEffectsMiscAtlasFrame(sectionKey, frameIndex) {
    const section = EFFECTS_MISC_ATLAS && EFFECTS_MISC_ATLAS.sections ? EFFECTS_MISC_ATLAS.sections[sectionKey] : null;
    if (!section) return null;
    const atlas = getEffectsMiscAtlasImage();
    if (!atlas) return null;
    if (effectsMiscAtlasStatus !== "ready") {
        return effectsMiscAtlasStatus === "error" ? null : {
            pendingAtlas: true,
            width: section.frameWidth || 0,
            height: section.frameHeight || 0
        };
    }
    const frameCount = section.frameCount || 1;
    let idx = frameIndex % frameCount;
    if (idx < 0) idx += frameCount;
    const columns = Math.max(1, section.atlasColumns || 1);
    const cellWidth = section.atlasCellWidth || section.frameWidth || 0;
    const cellHeight = section.atlasCellHeight || section.frameHeight || 0;
    const padding = section.atlasPadding || 0;
    const atlasOffsetX = section.atlasOffsetX || 0;
    const atlasOffsetY = section.atlasOffsetY || 0;
    const col = idx % columns;
    const row = Math.floor(idx / columns);
    const sx = atlasOffsetX + col * cellWidth + padding;
    const sy = atlasOffsetY + row * cellHeight + padding;
    const sw = section.frameWidth || cellWidth;
    const sh = section.frameHeight || cellHeight;
    if (sx + sw > atlas.width || sy + sh > atlas.height) {
        effectsMiscAtlasStatus = "error";
        return null;
    }
    return {
        atlas: atlas,
        sx: sx,
        sy: sy,
        sw: sw,
        sh: sh,
        width: sw,
        height: sh
    };
}

const smartbombSpriteCache = {};

const explosionSpriteCache = {};

let empRingCache = null;

const empBlitzCache = {};

const uiImageCache = {};

const rawUiImageAtlasManifest = typeof window !== "undefined" && window.__ANDROMEDA_UI_IMAGE_ATLAS_MANIFEST && typeof window.__ANDROMEDA_UI_IMAGE_ATLAS_MANIFEST === "object" ? window.__ANDROMEDA_UI_IMAGE_ATLAS_MANIFEST : null;

const rawActionMenuImageAtlasManifest = typeof window !== "undefined" && window.__ANDROMEDA_ACTION_MENU_IMAGE_ATLAS_MANIFEST && typeof window.__ANDROMEDA_ACTION_MENU_IMAGE_ATLAS_MANIFEST === "object" ? window.__ANDROMEDA_ACTION_MENU_IMAGE_ATLAS_MANIFEST : null;

const rawSpacemapImageAtlasManifest = typeof window !== "undefined" && window.__ANDROMEDA_SPACEMAP_IMAGE_ATLAS_MANIFEST && typeof window.__ANDROMEDA_SPACEMAP_IMAGE_ATLAS_MANIFEST === "object" ? window.__ANDROMEDA_SPACEMAP_IMAGE_ATLAS_MANIFEST : null;

const rawIconsImageAtlasManifest = typeof window !== "undefined" && window.__ANDROMEDA_ICONS_IMAGE_ATLAS_MANIFEST && typeof window.__ANDROMEDA_ICONS_IMAGE_ATLAS_MANIFEST === "object" ? window.__ANDROMEDA_ICONS_IMAGE_ATLAS_MANIFEST : null;

const rawMinimapImageAtlasManifest = typeof window !== "undefined" && window.__ANDROMEDA_MINIMAP_IMAGE_ATLAS_MANIFEST && typeof window.__ANDROMEDA_MINIMAP_IMAGE_ATLAS_MANIFEST === "object" ? window.__ANDROMEDA_MINIMAP_IMAGE_ATLAS_MANIFEST : null;

const rawRefinementImageAtlasManifest = typeof window !== "undefined" && window.__ANDROMEDA_REFINEMENT_IMAGE_ATLAS_MANIFEST && typeof window.__ANDROMEDA_REFINEMENT_IMAGE_ATLAS_MANIFEST === "object" ? window.__ANDROMEDA_REFINEMENT_IMAGE_ATLAS_MANIFEST : null;

function buildAndromedaImageAtlasManifest(rawManifests) {
    const frames = Object.create(null);
    let version = 1;
    if (!Array.isArray(rawManifests)) return null;
    for (const rawManifest of rawManifests) {
        if (!rawManifest || typeof rawManifest !== "object") continue;
        const atlasPath = typeof rawManifest.atlasPath === "string" ? rawManifest.atlasPath.trim() : "";
        const rawFrames = rawManifest.frames && typeof rawManifest.frames === "object" ? rawManifest.frames : null;
        if (!atlasPath || !rawFrames) continue;
        version = Math.max(version, Number(rawManifest.version) || 1);
        for (const key of Object.keys(rawFrames)) {
            const entry = rawFrames[key];
            if (!entry || typeof entry !== "object") continue;
            const x = Number(entry.x);
            const y = Number(entry.y);
            const w = Number(entry.w);
            const h = Number(entry.h);
            if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) continue;
            const normKey = String(key || "").replace(/^\/+/, "");
            if (!normKey) continue;
            frames[normKey] = {
                x: x,
                y: y,
                w: w,
                h: h,
                atlasPath: atlasPath,
                key: normKey
            };
        }
    }
    return Object.keys(frames).length ? {
        version: version,
        frames: frames
    } : null;
}

const UI_IMAGE_ATLAS_MANIFEST = buildAndromedaImageAtlasManifest([ rawUiImageAtlasManifest, rawActionMenuImageAtlasManifest, rawSpacemapImageAtlasManifest, rawIconsImageAtlasManifest, rawMinimapImageAtlasManifest, rawRefinementImageAtlasManifest ]);

const uiImageAtlasFrameCanvasCache = Object.create(null);

const uiImageAtlasDataUrlCache = Object.create(null);

const uiImageAtlasImageCache = Object.create(null);

const uiImageAtlasStatusCache = Object.create(null);

const uiImageAtlasListenersBound = Object.create(null);

const uiImageAtlasReadyNotified = Object.create(null);

const UI_IMAGE_ATLAS_DATA_URL_WARMUP_PATHS = [
    "graphics/ui/ui/images/empty_bar.png.png",
    "graphics/ui/ui/images/hp_bar.png.png",
    "graphics/ui/ui/images/shield_bar.png.png",
    "graphics/ui/ui/images/iconShipNull.png",
    "graphics/ui/ui/images/boss_icon.png.png",
    "graphics/ui/ui/images/bg_standard.png.png",
    "graphics/ui/ui/images/bg_active.png.png",
    "graphics/ui/spacemap/images/marker_currentMap.png"
];

let uiImageAtlasDataUrlWarmupPathLookup = null;

function andromedaGetConfiguredBasePath() {
    try {
        if (typeof window !== "undefined" && window.cfg && typeof window.cfg.basePath === "string") return window.cfg.basePath;
    } catch (_) {}
    try {
        if (typeof cfg === "object" && cfg && typeof cfg.basePath === "string") return cfg.basePath;
    } catch (_) {}
    return "";
}

function andromedaNormalizeUiAtlasKey(src) {
    if (!src) return "";
    let normalized = String(src || "").trim();
    if (!normalized) return "";
    if (/^(?:data:|blob:)/i.test(normalized)) return "";
    const basePath = andromedaGetConfiguredBasePath();
    if (basePath && normalized.startsWith(basePath)) normalized = normalized.slice(basePath.length);
    normalized = normalized.split("#")[0].split("?")[0];
    try {
        const absoluteHref = new URL(normalized, window.location.href).href;
        const html5BaseHref = new URL("./", window.location.href).href;
        if (absoluteHref.startsWith(html5BaseHref)) {
            normalized = absoluteHref.slice(html5BaseHref.length);
        } else if (basePath) {
            const flashBaseHref = new URL(basePath, window.location.href).href;
            if (absoluteHref.startsWith(flashBaseHref)) {
                normalized = absoluteHref.slice(flashBaseHref.length);
            }
        }
    } catch (_) {}
    while (normalized.startsWith("./")) normalized = normalized.slice(2);
    return normalized.replace(/^\/+/, "");
}

function getUiImageAtlasEntry(src) {
    if (!UI_IMAGE_ATLAS_MANIFEST || !src) return null;
    const key = andromedaNormalizeUiAtlasKey(src);
    if (!key) return null;
    return UI_IMAGE_ATLAS_MANIFEST.frames[key] || null;
}

function markUiImageAtlasReadyIfDecoded(atlasPath, img) {
    if (!atlasPath) return false;
    if (img && img.complete && img.width > 0 && img.height > 0) {
        uiImageAtlasStatusCache[atlasPath] = "ready";
        notifyUiImageAtlasReady(atlasPath);
        return true;
    }
    return false;
}

function isActionMenuUiAtlasPath(atlasPath) {
    const actionAtlasPath = rawActionMenuImageAtlasManifest && typeof rawActionMenuImageAtlasManifest.atlasPath === "string" ? rawActionMenuImageAtlasManifest.atlasPath : "graphics/ui/actionMenu/images/actionmenu_images_atlas_v1.png";
    if (!atlasPath || !actionAtlasPath) return false;
    return andromedaNormalizeUiAtlasKey(atlasPath) === andromedaNormalizeUiAtlasKey(actionAtlasPath);
}

function getUiImageAtlasDataUrlWarmupPathLookup() {
    if (uiImageAtlasDataUrlWarmupPathLookup) return uiImageAtlasDataUrlWarmupPathLookup;
    const lookup = Object.create(null);
    for (const path of UI_IMAGE_ATLAS_DATA_URL_WARMUP_PATHS) {
        const key = andromedaNormalizeUiAtlasKey(path);
        if (key) lookup[key] = true;
    }
    uiImageAtlasDataUrlWarmupPathLookup = lookup;
    return lookup;
}

function shouldWarmUiImageAtlasFrameDataUrl(key, entry) {
    if (!entry) return false;
    if (isActionMenuUiAtlasPath(entry.atlasPath)) return true;
    return !!getUiImageAtlasDataUrlWarmupPathLookup()[key];
}

function shouldWarmUiImageAtlasPathDataUrls(atlasPath) {
    if (isActionMenuUiAtlasPath(atlasPath)) return true;
    const lookup = getUiImageAtlasDataUrlWarmupPathLookup();
    for (const key in lookup) {
        const entry = UI_IMAGE_ATLAS_MANIFEST && UI_IMAGE_ATLAS_MANIFEST.frames ? UI_IMAGE_ATLAS_MANIFEST.frames[key] : null;
        if (entry && andromedaNormalizeUiAtlasKey(entry.atlasPath) === andromedaNormalizeUiAtlasKey(atlasPath)) {
            return true;
        }
    }
    return false;
}

function notifyUiImageAtlasReady(atlasPath) {
    if (!atlasPath || uiImageAtlasReadyNotified[atlasPath]) return;
    uiImageAtlasReadyNotified[atlasPath] = true;
    if (shouldWarmUiImageAtlasPathDataUrls(atlasPath)) {
        scheduleActionMenuUiDataUrlWarmup("atlas-ready");
    }
    if (isActionMenuUiAtlasPath(atlasPath)) {
        scheduleActionDrawerAssetRefresh();
    }
}

let actionDrawerAssetRefreshScheduled = false;

function scheduleActionDrawerAssetRefresh() {
    if (actionDrawerAssetRefreshScheduled) return;
    actionDrawerAssetRefreshScheduled = true;
    const run = () => {
        actionDrawerAssetRefreshScheduled = false;
        refreshActionDrawerAssetSurfaces();
    };
    if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => requestAnimationFrame(run));
    } else {
        setTimeout(run, 0);
    }
}

function refreshActionDrawerStaticAtlasSurfaces() {
    const lockBtn = document.getElementById("amLockButton");
    if (lockBtn) {
        setUiBackgroundImage(lockBtn, quickbarLocked ? "graphics/ui/actionMenu/images/162.png" : "graphics/ui/actionMenu/images/166.png");
    }
    const draggerBtn = document.getElementById("amDragger");
    if (draggerBtn) {
        setUiBackgroundImage(draggerBtn, "graphics/ui/actionMenu/images/171.png");
    }
    const scrollLeftBtn = document.getElementById("amScrollLeft");
    if (scrollLeftBtn) {
        setUiBackgroundImage(scrollLeftBtn, "graphics/ui/actionMenu/images/152.png");
    }
    const scrollRightBtn = document.getElementById("amScrollRight");
    if (scrollRightBtn) {
        setUiBackgroundImage(scrollRightBtn, "graphics/ui/actionMenu/images/147.png");
    }
}

function refreshActionDrawerAssetSurfaces() {
    if (!document.getElementById("actionDrawerContainer")) return;
    refreshActionDrawerStaticAtlasSurfaces();
    if (typeof flashBuildActionDrawerTabs === "function") {
        flashBuildActionDrawerTabs();
    }
    if (typeof renderActionDrawerItems === "function") {
        renderActionDrawerItems();
    }
}

function paintUiImageAtlasFrameCanvas(canvas) {
    if (!canvas || !canvas.__uiAtlasEntry) return false;
    const entry = canvas.__uiAtlasEntry;
    const atlasPath = entry.atlasPath;
    const atlas = uiImageAtlasImageCache[atlasPath];
    if (!atlas || !atlas.complete || atlas.width <= 0 || atlas.height <= 0) return false;
    if (entry.x + entry.w > atlas.width || entry.y + entry.h > atlas.height) {
        uiImageAtlasStatusCache[atlasPath] = "error";
        return false;
    }
    const ctx = canvas.getContext("2d", {
        willReadFrequently: true
    });
    if (!ctx) return false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(atlas, entry.x, entry.y, entry.w, entry.h, 0, 0, entry.w, entry.h);
    canvas.complete = true;
    canvas.naturalWidth = entry.w;
    canvas.naturalHeight = entry.h;
    canvas.__uiAtlasPainted = true;
    return true;
}

function flushUiImageAtlasPendingFrames(atlasPath) {
    for (const key in uiImageAtlasFrameCanvasCache) {
        const canvas = uiImageAtlasFrameCanvasCache[key];
        if (!canvas || !canvas.__uiAtlasEntry || canvas.__uiAtlasEntry.atlasPath !== atlasPath) continue;
        paintUiImageAtlasFrameCanvas(canvas);
    }
}

function getUiImageAtlasImage(atlasPath) {
    if (!atlasPath) return null;
    if (!uiImageAtlasImageCache[atlasPath]) {
        uiImageAtlasImageCache[atlasPath] = andromedaCreateImage(atlasPath);
        uiImageAtlasStatusCache[atlasPath] = markUiImageAtlasReadyIfDecoded(atlasPath, uiImageAtlasImageCache[atlasPath]) ? "ready" : "loading";
    }
    const atlasImage = uiImageAtlasImageCache[atlasPath];
    if (!uiImageAtlasListenersBound[atlasPath] && atlasImage) {
        uiImageAtlasListenersBound[atlasPath] = true;
        atlasImage.addEventListener("load", () => {
            if (markUiImageAtlasReadyIfDecoded(atlasPath, atlasImage)) {
                flushUiImageAtlasPendingFrames(atlasPath);
            }
        }, {
            once: true
        });
        atlasImage.addEventListener("error", () => {
            uiImageAtlasStatusCache[atlasPath] = "error";
        }, {
            once: true
        });
    }
    markUiImageAtlasReadyIfDecoded(atlasPath, atlasImage);
    return atlasImage;
}

function getUiImageAtlasFrameCanvas(src) {
    const entry = getUiImageAtlasEntry(src);
    if (!entry) return null;
    const cacheKey = entry.key;
    let canvas = uiImageAtlasFrameCanvasCache[cacheKey];
    if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.width = entry.w;
        canvas.height = entry.h;
        canvas.complete = false;
        canvas.naturalWidth = entry.w;
        canvas.naturalHeight = entry.h;
        canvas.__uiAtlasEntry = entry;
        canvas.__uiAtlasPainted = false;
        uiImageAtlasFrameCanvasCache[cacheKey] = canvas;
    }
    if (canvas.__uiAtlasPainted && canvas.complete) return canvas;
    const atlas = getUiImageAtlasImage(entry.atlasPath);
    if (!atlas) return canvas;
    const status = uiImageAtlasStatusCache[entry.atlasPath] || "idle";
    if (status === "ready") {
        paintUiImageAtlasFrameCanvas(canvas);
    }
    return canvas;
}

function getUiImageAtlasDataUrl(src) {
    const entry = getUiImageAtlasEntry(src);
    if (!entry) return null;
    if (uiImageAtlasDataUrlCache[entry.key]) return uiImageAtlasDataUrlCache[entry.key];
    const canvas = getUiImageAtlasFrameCanvas(entry.key);
    if (!canvas || !canvas.complete || !canvas.__uiAtlasPainted) return null;
    try {
        const dataUrl = canvas.toDataURL("image/png");
        uiImageAtlasDataUrlCache[entry.key] = dataUrl;
        return dataUrl;
    } catch (_) {
        return null;
    }
}

let actionMenuUiDataUrlWarmupScheduled = false;

let actionMenuUiDataUrlWarmupQueue = null;

let actionMenuUiDataUrlWarmupQueueIndex = 0;

function buildActionMenuUiDataUrlWarmupQueue() {
    if (!UI_IMAGE_ATLAS_MANIFEST || !UI_IMAGE_ATLAS_MANIFEST.frames) return [];
    const actionMenuKeys = [];
    const priorityUiKeys = [];
    for (const key of Object.keys(UI_IMAGE_ATLAS_MANIFEST.frames)) {
        const entry = UI_IMAGE_ATLAS_MANIFEST.frames[key];
        if (!entry || uiImageAtlasDataUrlCache[key]) continue;
        if (isActionMenuUiAtlasPath(entry.atlasPath)) {
            actionMenuKeys.push(key);
        } else if (getUiImageAtlasDataUrlWarmupPathLookup()[key]) {
            priorityUiKeys.push(key);
        }
    }
    return actionMenuKeys.concat(priorityUiKeys);
}

function scheduleActionMenuUiDataUrlWarmup(reason = "manual") {
    if (actionMenuUiDataUrlWarmupScheduled) return;
    if (!UI_IMAGE_ATLAS_MANIFEST || !UI_IMAGE_ATLAS_MANIFEST.frames) return;
    actionMenuUiDataUrlWarmupScheduled = true;
    if (!Array.isArray(actionMenuUiDataUrlWarmupQueue) || actionMenuUiDataUrlWarmupQueueIndex >= actionMenuUiDataUrlWarmupQueue.length) {
        actionMenuUiDataUrlWarmupQueue = buildActionMenuUiDataUrlWarmupQueue();
        actionMenuUiDataUrlWarmupQueueIndex = 0;
    }
    if (typeof window !== "undefined") {
        window.__ANDRO_ACTION_MENU_UI_WARMUP_STATUS = {
            state: "queued",
            reason: reason,
            remaining: Math.max(0, actionMenuUiDataUrlWarmupQueue.length - actionMenuUiDataUrlWarmupQueueIndex)
        };
    }
    const run = deadline => processActionMenuUiDataUrlWarmup(deadline, reason);
    if (typeof requestIdleCallback === "function") {
        requestIdleCallback(run, {
            timeout: 1500
        });
    } else if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => run(null));
    } else {
        setTimeout(() => run(null), 0);
    }
}

function processActionMenuUiDataUrlWarmup(deadline = null, reason = "manual") {
    actionMenuUiDataUrlWarmupScheduled = false;
    if (!Array.isArray(actionMenuUiDataUrlWarmupQueue) || actionMenuUiDataUrlWarmupQueueIndex >= actionMenuUiDataUrlWarmupQueue.length) {
        actionMenuUiDataUrlWarmupQueue = buildActionMenuUiDataUrlWarmupQueue();
        actionMenuUiDataUrlWarmupQueueIndex = 0;
    }
    const startedAt = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    let processed = 0;
    while (actionMenuUiDataUrlWarmupQueueIndex < actionMenuUiDataUrlWarmupQueue.length) {
        const now = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
        const timeRemaining = deadline && typeof deadline.timeRemaining === "function" ? deadline.timeRemaining() : Math.max(0, 4 - (now - startedAt));
        if (processed > 0 && timeRemaining <= 1) break;
        const key = actionMenuUiDataUrlWarmupQueue[actionMenuUiDataUrlWarmupQueueIndex];
        if (!key || uiImageAtlasDataUrlCache[key]) {
            actionMenuUiDataUrlWarmupQueueIndex++;
            continue;
        }
        const entry = UI_IMAGE_ATLAS_MANIFEST && UI_IMAGE_ATLAS_MANIFEST.frames ? UI_IMAGE_ATLAS_MANIFEST.frames[key] : null;
        if (!entry || !shouldWarmUiImageAtlasFrameDataUrl(key, entry)) {
            actionMenuUiDataUrlWarmupQueueIndex++;
            continue;
        }
        getUiImageAtlasFrameCanvas(key);
        if (uiImageAtlasStatusCache[entry.atlasPath] !== "ready") {
            break;
        }
        try {
            getUiImageAtlasDataUrl(key);
        } catch (_) {}
        processed++;
        actionMenuUiDataUrlWarmupQueueIndex++;
    }
    const remaining = Math.max(0, actionMenuUiDataUrlWarmupQueue.length - actionMenuUiDataUrlWarmupQueueIndex);
    if (typeof window !== "undefined") {
        window.__ANDRO_ACTION_MENU_UI_WARMUP_STATUS = {
            state: remaining > 0 ? "warming" : "ready",
            reason: reason,
            remaining: remaining,
            cached: Object.keys(uiImageAtlasDataUrlCache).length
        };
    }
    if (remaining > 0) {
        scheduleActionMenuUiDataUrlWarmup(reason);
    } else {
        actionMenuUiDataUrlWarmupQueue = null;
        actionMenuUiDataUrlWarmupQueueIndex = 0;
    }
}

function resolveUiImageUrl(path) {
    if (!path) return path;
    const atlasUrl = getUiImageAtlasDataUrl(path);
    return atlasUrl || path;
}

function getUiCssUrl(path) {
    const resolved = resolveUiImageUrl(path);
    return resolved ? `url('${String(resolved).replace(/'/g, "\\'")}')` : "none";
}

function setUiBackgroundImage(element, path) {
    if (!element || !element.style) return;
    const resolved = resolveUiImageUrl(path);
    element.style.backgroundImage = resolved ? `url("${String(resolved).replace(/"/g, '\\"')}")` : "none";
}

function setUiImageElementSource(element, path) {
    if (!element) return;
    const resolved = resolveUiImageUrl(path);
    element.src = resolved || "";
}

if (typeof window !== "undefined") {
    window.resolveUiImageUrl = resolveUiImageUrl;
    window.getUiCssUrl = getUiCssUrl;
    window.setUiBackgroundImage = setUiBackgroundImage;
    window.setUiImageElementSource = setUiImageElementSource;
}

const engineSpriteCache = {};

const engineSmokeSpriteCache = {};

const rocketSmokeSpriteCache = {};

const shipExpansionSpriteCache = {};

const shipExpansionAtlasImageCache = Object.create(null);

const shipExpansionAtlasStatusCache = Object.create(null);

const shipExpansionAtlasListenersBound = Object.create(null);

function markShipExpansionAtlasReadyIfDecoded(atlasPath, img) {
    if (!atlasPath) return false;
    if (img && img.complete && img.width > 0 && img.height > 0) {
        shipExpansionAtlasStatusCache[atlasPath] = "ready";
        return true;
    }
    return false;
}

function getShipExpansionAtlasImage(atlasPath) {
    if (!atlasPath) return null;
    if (!shipExpansionAtlasImageCache[atlasPath]) {
        shipExpansionAtlasImageCache[atlasPath] = andromedaCreateImage(atlasPath);
        shipExpansionAtlasStatusCache[atlasPath] = markShipExpansionAtlasReadyIfDecoded(atlasPath, shipExpansionAtlasImageCache[atlasPath]) ? "ready" : "loading";
    }
    const atlas = shipExpansionAtlasImageCache[atlasPath];
    if (!shipExpansionAtlasListenersBound[atlasPath] && atlas) {
        shipExpansionAtlasListenersBound[atlasPath] = true;
        atlas.addEventListener("load", () => {
            shipExpansionAtlasStatusCache[atlasPath] = "ready";
        }, {
            once: true
        });
        atlas.addEventListener("error", () => {
            shipExpansionAtlasStatusCache[atlasPath] = "error";
        }, {
            once: true
        });
    }
    markShipExpansionAtlasReadyIfDecoded(atlasPath, atlas);
    return atlas;
}

function buildShipExpansionAtlasFrameCanvas(def, atlas, atlasIndex, atlasFrameEntry) {
    if (!def || !atlas || !atlasFrameEntry) return null;
    const sx = Number(atlasFrameEntry.x);
    const sy = Number(atlasFrameEntry.y);
    const sw = Number(atlasFrameEntry.w);
    const sh = Number(atlasFrameEntry.h);
    if (!Number.isFinite(sx) || !Number.isFinite(sy) || !Number.isFinite(sw) || !Number.isFinite(sh) || sw <= 0 || sh <= 0 || sx < 0 || sy < 0) {
        return null;
    }
    if (sx + sw > atlas.width || sy + sh > atlas.height) {
        shipExpansionAtlasStatusCache[def.atlasPath] = "error";
        return null;
    }
    const frameCanvas = document.createElement("canvas");
    frameCanvas.width = sw;
    frameCanvas.height = sh;
    const frameCtx = frameCanvas.getContext("2d", {
        willReadFrequently: true
    });
    if (!frameCtx) return null;
    frameCtx.clearRect(0, 0, sw, sh);
    frameCtx.drawImage(atlas, sx, sy, sw, sh, 0, 0, sw, sh);
    frameCanvas.complete = true;
    frameCanvas.__atlasPath = def.atlasPath;
    frameCanvas.__atlasIndex = atlasIndex;
    return frameCanvas;
}

function getFrameNumbersForDef(def, fallbackCount = 1) {
    if (!def) return [];
    if (def.frames && def.frames.length > 0) return def.frames;
    if (def._frameNumbers && def._frameNumbers.length > 0) return def._frameNumbers;
    const count = Math.max(1, Number(def.frameCount) || fallbackCount || 1);
    const frames = [];
    for (let i = 0; i < count; i++) frames.push(i + 1);
    def._frameNumbers = frames;
    return frames;
}

function getShipExpansionAtlasFrame(def, frameIndex) {
    if (!def || !def.atlasPath) return null;
    const atlas = getShipExpansionAtlasImage(def.atlasPath);
    if (!atlas) return null;
    const frames = getFrameNumbersForDef(def, 1);
    let idx = frameIndex % frames.length;
    if (idx < 0) idx += frames.length;
    const fileNumber = Number(frames[idx]) || idx + 1;
    const manifestFrames = Array.isArray(def.atlasFrames) ? def.atlasFrames : null;
    const manifestFrameEntry = manifestFrames && manifestFrames.length ? manifestFrames[fileNumber - 1] : null;
    const status = shipExpansionAtlasStatusCache[def.atlasPath] || "idle";
    if (status !== "ready") {
        return status === "error" ? null : {
            pendingAtlas: true,
            width: manifestFrameEntry && Number.isFinite(manifestFrameEntry.w) ? manifestFrameEntry.w : def.frameWidth || 0,
            height: manifestFrameEntry && Number.isFinite(manifestFrameEntry.h) ? manifestFrameEntry.h : def.frameHeight || 0
        };
    }
    if (manifestFrameEntry) {
        return buildShipExpansionAtlasFrameCanvas(def, atlas, fileNumber - 1, manifestFrameEntry);
    }
    const columns = Math.max(1, def.atlasColumns || 1);
    const cellWidth = def.atlasCellWidth || def.frameWidth || 0;
    const cellHeight = def.atlasCellHeight || def.frameHeight || 0;
    const padding = def.atlasPadding || 0;
    const col = idx % columns;
    const row = Math.floor(idx / columns);
    const sx = col * cellWidth + padding;
    const sy = row * cellHeight + padding;
    const sw = def.frameWidth || cellWidth;
    const sh = def.frameHeight || cellHeight;
    if (sx + sw > atlas.width || sy + sh > atlas.height) {
        shipExpansionAtlasStatusCache[def.atlasPath] = "error";
        return null;
    }
    return {
        atlas: atlas,
        sx: sx,
        sy: sy,
        sw: sw,
        sh: sh,
        width: sw,
        height: sh
    };
}

const levelUpSpriteCache = {};

const LEVEL_UP_ANIM = {
    frameCount: 49,
    frameDurationMs: 40,
    yOffset: -150,
    atlasSection: "levelUp"
};

function andromedaToAbsoluteUrl(src) {
    if (!src) return src;
    try {
        return new URL(src, window.location.href).href;
    } catch (_) {
        return src;
    }
}

function andromedaGetPreloadedImage(src) {
    if (!src) return null;
    const store = typeof window !== "undefined" ? window.__ANDROMEDA_PRELOADED_IMAGES : null;
    if (!store) return null;
    const abs = andromedaToAbsoluteUrl(src);
    return store[abs] || store[src] || null;
}

function andromedaCreateImage(src) {
    const pre = andromedaGetPreloadedImage(src);
    if (pre) return pre;
    const img = new Image;
    try {
        img.decoding = "async";
    } catch (_) {}
    img.src = src;
    return img;
}

const QUICKBAR_ICON_LOOKUP = {
    ammo: {
        1: "graphics/ui/actionMenu/images/41_laserBat1.png.png",
        2: "graphics/ui/actionMenu/images/40_laserBat2.png.png",
        3: "graphics/ui/actionMenu/images/39_laserBat3.png.png",
        4: "graphics/ui/actionMenu/images/38_laserBat4.png.png",
        5: "graphics/ui/actionMenu/images/37_laserBat5.png.png",
        6: "graphics/ui/actionMenu/images/36_laserBat6.png.png"
    },
    rocket: {
        1: "graphics/ui/actionMenu/images/28_r310.png.png",
        2: "graphics/ui/actionMenu/images/30_plt2026.png.png",
        3: "graphics/ui/actionMenu/images/31_plt2021.png.png",
        4: "graphics/ui/actionMenu/images/29_plt3030.png.png",
        5: "graphics/ui/actionMenu/images/32_pld8.png.png",
        7: "graphics/ui/actionMenu/images/wiz.png",
        10: "graphics/ui/actionMenu/images/72_dcr30.png.png",
        11: "graphics/ui/actionMenu/images/63_explosive.png.png"
    },
    explosive: {
        EMP: "graphics/ui/actionMenu/images/66_emp01.png.png",
        ISH: "graphics/ui/actionMenu/images/46_ish.png.png",
        SMB: "graphics/ui/actionMenu/images/7_smb01.png.png"
    },
    mine: {
        5: "graphics/ui/actionMenu/images/7_smb01.png.png"
    },
    cpu: {
        ROB: "graphics/ui/actionMenu/images/22_robstarter.png.png",
        CLK: "graphics/ui/actionMenu/images/88_cloak01.png.png",
        ARL: "graphics/ui/actionMenu/images/93_arol01.png.png"
    },
    tech: {
        4: "graphics/ui/actionMenu/images/15_shield_backup.png.png",
        5: "graphics/ui/actionMenu/images/92_battle_repair_bot.png.png"
    },
    ability: {
        solace: "graphics/ui/actionMenu/images/11_skill_ship_solace.png.png",
        diminisher: "graphics/ui/actionMenu/images/14_skill_ship_diminisher.png.png",
        spectrum: "graphics/ui/actionMenu/images/10_skill_ship_spectrum.png.png",
        sentinel: "graphics/ui/actionMenu/images/12_skill_ship_sentinel.png.png",
        venom: "graphics/ui/actionMenu/images/9_skill_ship_venom.png.png",
        lightning: "graphics/ui/actionMenu/images/skill_ship_lightning.png"
    }
};

function normalizeQuickbarItem(item) {
    if (!item || typeof item !== "object") return null;
    const normalized = {
        type: item.type
    };
    const copyOptionalFields = () => {
        if (item.label !== undefined && item.label !== null) normalized.label = String(item.label);
        if (item.stockId !== undefined && item.stockId !== null) normalized.stockId = item.stockId;
    };
    switch (item.type) {
      case "ammo":
        {
            const id = Number(item.id);
            if (!Number.isInteger(id) || !QUICKBAR_ICON_LOOKUP.ammo[id]) return null;
            normalized.id = id;
            copyOptionalFields();
            return normalized;
        }

      case "rocket":
        {
            const id = Number(item.id);
            if (!Number.isInteger(id) || !QUICKBAR_ICON_LOOKUP.rocket[id]) return null;
            normalized.id = id;
            copyOptionalFields();
            return normalized;
        }

      case "explosive":
        {
            const code = String(item.code || "").toUpperCase();
            if (!code || !QUICKBAR_ICON_LOOKUP.explosive[code]) return null;
            normalized.code = code;
            copyOptionalFields();
            return normalized;
        }

      case "tech":
        {
            const id = Number(item.id);
            if (!Number.isInteger(id) || !QUICKBAR_ICON_LOOKUP.tech[id]) return null;
            normalized.id = id;
            copyOptionalFields();
            return normalized;
        }

      case "mine":
        {
            const id = Number(item.id);
            if (!Number.isInteger(id) || !QUICKBAR_ICON_LOOKUP.mine[id]) return null;
            normalized.id = id;
            copyOptionalFields();
            return normalized;
        }

      case "cpu":
        {
            const code = String(item.code || "").toUpperCase();
            if (!code || !QUICKBAR_ICON_LOOKUP.cpu[code]) return null;
            normalized.code = code;
            copyOptionalFields();
            return normalized;
        }

      case "ability":
        {
            const abilityId = String(item.id || item.code || "").toLowerCase();
            if (!abilityId || !QUICKBAR_ICON_LOOKUP.ability[abilityId]) return null;
            normalized.id = abilityId;
            copyOptionalFields();
            return normalized;
        }

      default:
        return null;
    }
}

function resolveQuickbarCatalogItem(item) {
    const normalized = normalizeQuickbarItem(item);
    if (!normalized) return null;
    const typeKey = normalized.type;
    const catalog = typeof QUICKBAR_ITEMS_BY_CATEGORY !== "undefined" && QUICKBAR_ITEMS_BY_CATEGORY && QUICKBAR_ITEMS_BY_CATEGORY[typeKey] ? QUICKBAR_ITEMS_BY_CATEGORY[typeKey] : null;
    if (!catalog || !catalog.length) {
        return {
            ...normalized
        };
    }
    const normId = normalized.id;
    const normCode = normalized.code != null ? String(normalized.code).toUpperCase() : "";
    const found = catalog.find(entry => {
        if (!entry || entry.type !== typeKey) return false;
        if (normId !== undefined) {
            if (typeKey === "ability") {
                const entryAbilityId = String(entry.id || entry.code || "").toLowerCase();
                if (entryAbilityId === String(normId).toLowerCase()) return true;
            } else if (Number(entry.id) === Number(normId)) {
                return true;
            }
        }
        if (normCode) {
            const entryCode = String(entry.code || "").toUpperCase();
            if (entryCode && entryCode === normCode) return true;
        }
        return false;
    });
    return found ? {
        ...normalized,
        ...found
    } : {
        ...normalized
    };
}

function getUiImage(path) {
    if (!path) return null;
    const atlasFrame = getUiImageAtlasFrameCanvas(path);
    if (atlasFrame) return atlasFrame;
    const base = window.cfg && typeof window.cfg.basePath === "string" ? window.cfg.basePath : "";
    const isAbsolute = /^(?:[a-z]+:)?\/\//i.test(path) || path.startsWith("data:") || path.startsWith("blob:") || path.startsWith("/");
    const resolvedPath = isAbsolute || !base || path.startsWith(base) ? path : `${base}${path}`;
    const cacheKey = resolvedPath;
    if (uiImageCache[cacheKey]) return uiImageCache[cacheKey];
    const img = andromedaCreateImage(resolvedPath);
    uiImageCache[cacheKey] = img;
    return img;
}

function getMinimapSpriteFrame(name, frameIndex) {
    const def = MINIMAP_SPRITE_DEFS[name];
    if (!def) return null;
    const idx = (frameIndex % def.frameCount + def.frameCount) % def.frameCount;
    const path = def.basePath + (idx + 1) + ".png";
    if (minimapSpriteCache[path]) return minimapSpriteCache[path];
    const img = typeof getUiImage === "function" ? getUiImage(path) : andromedaCreateImage(path);
    if (img) minimapSpriteCache[path] = img;
    return img || null;
}

function getDirectionFrameIndex(angle, frameCount) {
    if (!isFinite(angle)) angle = 0;
    const twoPi = Math.PI * 2;
    angle = (angle % twoPi + twoPi) % twoPi;
    const sector = angle / twoPi * frameCount;
    return Math.floor(sector) % frameCount;
}

function getShipSpriteFrameCacheKey(shipId, frameIndex) {
    const def = SHIP_SPRITE_DEFS[shipId];
    if (!def) return "";
    const frameCount = Math.max(1, Number(def.frameCount) || 1);
    const numericFrame = Number(frameIndex);
    let idx = Number.isFinite(numericFrame) ? numericFrame % frameCount : 0;
    if (idx < 0) idx += frameCount;
    if (def.atlasPath) {
        const manifestFrames = Array.isArray(def.atlasFrames) ? def.atlasFrames : null;
        if (manifestFrames && manifestFrames.length) {
            const entry = manifestFrames[idx];
            if (entry) return `ship-atlas:${def.atlasPath}:${entry.x}:${entry.y}:${entry.w}:${entry.h}`;
        }
        const atlasIndex = (def.atlasStartIndex || 0) + idx;
        return `ship-atlas:${def.atlasPath}:${atlasIndex}:${def.frameWidth || 0}:${def.frameHeight || 0}:${def.atlasCellWidth || 0}:${def.atlasCellHeight || 0}:${def.atlasPadding || 0}`;
    }
    return `ship-image:${def.basePath}${idx + 1}.png`;
}

function getShipSpriteFrame(shipId, frameIndex) {
    const def = SHIP_SPRITE_DEFS[shipId];
    if (!def) return null;
    const frameCount = Math.max(1, Number(def.frameCount) || 1);
    const numericFrame = Number(frameIndex);
    let idx = Number.isFinite(numericFrame) ? numericFrame % frameCount : 0;
    if (idx < 0) idx += frameCount;
    const key = getShipSpriteFrameCacheKey(shipId, idx);
    if (shipSpriteCache[key]) return shipSpriteCache[key];
    if (def.atlasPath) {
        const atlasFrame = buildShipAtlasFrameCanvas(def, idx);
        if (atlasFrame) {
            shipSpriteCache[key] = atlasFrame;
            return atlasFrame;
        }
        return null;
    }
    const fileNumber = idx + 1;
    const path = def.basePath + fileNumber + ".png";
    const img = andromedaCreateImage(path);
    shipSpriteCache[key] = img;
    return img;
}

function getShipExpansionFrameCacheKey(shipId, frameIndex) {
    const def = SHIP_EXPANSION_DEFS[shipId];
    if (!def) return "";
    const frames = getFrameNumbersForDef(def, 1);
    const numericFrame = Number(frameIndex);
    let idx = Number.isFinite(numericFrame) ? numericFrame % frames.length : 0;
    if (idx < 0) idx += frames.length;
    const fileNumber = Number(frames[idx]) || idx + 1;
    if (def.atlasPath) {
        const manifestFrames = Array.isArray(def.atlasFrames) ? def.atlasFrames : null;
        const entry = manifestFrames && manifestFrames.length ? manifestFrames[fileNumber - 1] : null;
        if (entry) return `ship-expansion-atlas:${def.atlasPath}:${entry.x}:${entry.y}:${entry.w}:${entry.h}`;
        return `ship-expansion-atlas:${def.atlasPath}:${fileNumber}:${def.frameWidth || 0}:${def.frameHeight || 0}:${def.atlasCellWidth || 0}:${def.atlasCellHeight || 0}:${def.atlasPadding || 0}`;
    }
    return `ship-expansion-image:${def.basePath}${fileNumber}.png`;
}

function getShipExpansionFrame(shipId, frameIndex) {
    const def = SHIP_EXPANSION_DEFS[shipId];
    if (!def) return null;
    const frames = getFrameNumbersForDef(def, 1);
    const numericFrame = Number(frameIndex);
    let idx = Number.isFinite(numericFrame) ? numericFrame % frames.length : 0;
    if (idx < 0) idx += frames.length;
    const cacheKey = getShipExpansionFrameCacheKey(shipId, idx);
    if (shipExpansionSpriteCache[cacheKey]) return shipExpansionSpriteCache[cacheKey];
    if (def.atlasPath) {
        const atlasFrame = getShipExpansionAtlasFrame(def, idx);
        if (atlasFrame && !atlasFrame.pendingAtlas) {
            shipExpansionSpriteCache[cacheKey] = atlasFrame;
        }
        return atlasFrame;
    }
    const fileNumber = frames[idx];
    const img = andromedaCreateImage(def.basePath + fileNumber + ".png");
    shipExpansionSpriteCache[cacheKey] = img;
    return img;
}

function getEngineSpriteFrame(engineKey, frameIndex) {
    const key = engineKey || DEFAULT_ENGINE_KEY;
    const def = ENGINE_SPRITE_DEFS[key];
    if (!def) return null;
    const frames = getFrameNumbersForDef(def, 1);
    let idx = frameIndex % frames.length;
    if (idx < 0) idx += frames.length;
    const fileNumber = frames[idx];
    const cacheKey = `${key}_${fileNumber}`;
    if (engineSpriteCache[cacheKey]) return engineSpriteCache[cacheKey];
    const img = andromedaCreateImage(def.basePath + fileNumber + ".png");
    engineSpriteCache[cacheKey] = img;
    return img;
}

function getEngineSmokeSpriteFrame(engineSmokeKey, frameIndex) {
    const key = engineSmokeKey || DEFAULT_ENGINE_SMOKE_KEY;
    const def = ENGINE_SMOKE_DEFS[key];
    if (!def) return null;
    const frames = getFrameNumbersForDef(def, 1);
    let idx = frameIndex % frames.length;
    if (idx < 0) idx += frames.length;
    const fileNumber = frames[idx];
    const cacheKey = `${key}_${fileNumber}`;
    if (engineSmokeSpriteCache[cacheKey]) return engineSmokeSpriteCache[cacheKey];
    const img = andromedaCreateImage(def.basePath + fileNumber + ".png");
    engineSmokeSpriteCache[cacheKey] = img;
    return img;
}

function getRocketSmokeSpriteFrame(smokeKey, frameIndex) {
    const key = smokeKey;
    const def = ROCKET_SMOKE_DEFS[key];
    if (!def) return null;
    const frames = getFrameNumbersForDef(def, 1);
    let idx = frameIndex % frames.length;
    if (idx < 0) idx += frames.length;
    const fileNumber = frames[idx];
    const cacheKey = `${key}_${fileNumber}`;
    if (rocketSmokeSpriteCache[cacheKey]) return rocketSmokeSpriteCache[cacheKey];
    const img = andromedaCreateImage(def.basePath + fileNumber + ".png");
    rocketSmokeSpriteCache[cacheKey] = img;
    return img;
}

function resolveRocketSmokeKey(rocketId) {
    if (!ROCKET_SMOKE_BY_ID) return null;
    const key = ROCKET_SMOKE_BY_ID[rocketId];
    return Number.isFinite(key) ? key : null;
}

function getLevelUpFrame(frameIndex) {
    if (!LEVEL_UP_ANIM) return null;
    const frameCount = LEVEL_UP_ANIM.frameCount || 1;
    let idx = frameIndex % frameCount;
    if (idx < 0) idx += frameCount;
    if (levelUpSpriteCache[idx]) return levelUpSpriteCache[idx];
    const frameDef = getEffectsMiscAtlasFrame(LEVEL_UP_ANIM.atlasSection || "levelUp", idx);
    if (frameDef && !frameDef.pendingAtlas) {
        levelUpSpriteCache[idx] = frameDef;
    }
    return frameDef;
}

function getPortalSpriteFrame(portalType, animation, frameIndex) {
    const portalDef = PORTAL_SPRITE_DEFS[portalType];
    if (!portalDef) return null;
    const animDef = portalDef[animation];
    if (!animDef) return null;
    const frameCount = animDef.frameCount || 1;
    let idx = frameIndex % frameCount;
    if (idx < 0) idx += frameCount;
    const key = `${portalType}_${animation}_${idx}`;
    if (portalSpriteCache[key]) return portalSpriteCache[key];
    if (animDef.atlasPath || animDef.atlasParts && animDef.atlasParts.length) {
        const atlasFrame = getPortalAtlasFrame(animDef, idx);
        if (atlasFrame && !atlasFrame.pendingAtlas) {
            portalSpriteCache[key] = atlasFrame;
        }
        return atlasFrame;
    }
    const fileNumber = idx + 1;
    const path = animDef.basePath + fileNumber + ".png";
    const img = andromedaCreateImage(path);
    portalSpriteCache[key] = img;
    return img;
}

function getPortalJumpFrame(frameIndex) {
    if (!PORTAL_JUMP_ANIM) return null;
    const frameCount = PORTAL_JUMP_ANIM.frameCount || 1;
    let idx = frameIndex % frameCount;
    if (idx < 0) idx += frameCount;
    if (portalJumpSpriteCache[idx]) return portalJumpSpriteCache[idx];
    const atlas = getPortalJumpAtlasImage();
    if (!atlas) return null;
    if (portalJumpAtlasStatus !== "ready") {
        return portalJumpAtlasStatus === "error" ? null : {
            pendingAtlas: true,
            width: PORTAL_JUMP_ANIM.frameWidth || 0,
            height: PORTAL_JUMP_ANIM.frameHeight || 0
        };
    }
    const columns = Math.max(1, PORTAL_JUMP_ANIM.atlasColumns || 1);
    const cellWidth = PORTAL_JUMP_ANIM.atlasCellWidth || PORTAL_JUMP_ANIM.frameWidth || 0;
    const cellHeight = PORTAL_JUMP_ANIM.atlasCellHeight || PORTAL_JUMP_ANIM.frameHeight || 0;
    const padding = PORTAL_JUMP_ANIM.atlasPadding || 0;
    const col = idx % columns;
    const row = Math.floor(idx / columns);
    const sx = col * cellWidth + padding;
    const sy = row * cellHeight + padding;
    const sw = PORTAL_JUMP_ANIM.frameWidth || cellWidth;
    const sh = PORTAL_JUMP_ANIM.frameHeight || cellHeight;
    if (sx + sw > atlas.width || sy + sh > atlas.height) {
        portalJumpAtlasStatus = "error";
        return null;
    }
    const frameDef = {
        atlas: atlas,
        sx: sx,
        sy: sy,
        sw: sw,
        sh: sh,
        width: sw,
        height: sh
    };
    portalJumpSpriteCache[idx] = frameDef;
    return frameDef;
}

function buildSmartbombPreparedFrameCanvas(idx) {
    const frameDef = getPyroAtlasFrame(SMARTBOMB_ANIM, idx);
    if (!frameDef || frameDef.pendingAtlas || !frameDef.atlas) return frameDef;
    const sw = frameDef.sw || frameDef.width || SMARTBOMB_ANIM.frameWidth || 0;
    const sh = frameDef.sh || frameDef.height || SMARTBOMB_ANIM.frameHeight || 0;
    if (sw <= 0 || sh <= 0) return frameDef;
    try {
        const frameCanvas = document.createElement("canvas");
        frameCanvas.width = sw;
        frameCanvas.height = sh;
        const frameCtx = frameCanvas.getContext("2d", {
            alpha: true,
            willReadFrequently: false
        });
        if (!frameCtx) return frameDef;
        frameCtx.clearRect(0, 0, sw, sh);
        frameCtx.drawImage(frameDef.atlas, frameDef.sx, frameDef.sy, frameDef.sw, frameDef.sh, 0, 0, sw, sh);
        frameCanvas.complete = true;
        frameCanvas.naturalWidth = sw;
        frameCanvas.naturalHeight = sh;
        frameCanvas.__andromedaPreparedSmartbombFrame = true;
        frameCanvas.__andromedaSmartbombFrameIndex = idx;
        return frameCanvas;
    } catch (_) {
        return frameDef;
    }
}

function getSmartbombFrame(frameIndex) {
    if (!SMARTBOMB_ANIM) return null;
    const frameCount = SMARTBOMB_ANIM.frameCount || 1;
    let idx = frameIndex % frameCount;
    if (idx < 0) idx += frameCount;
    if (smartbombSpriteCache[idx]) return smartbombSpriteCache[idx];
    const frameDef = buildSmartbombPreparedFrameCanvas(idx);
    if (frameDef && !frameDef.pendingAtlas) {
        smartbombSpriteCache[idx] = frameDef;
    }
    return frameDef;
}

function getExplosionFrame(type, frameIndex) {
    const anim = EXPLOSION_ANIMATIONS[type] || EXPLOSION_ANIMATIONS[2];
    if (!anim) return null;
    const frameCount = anim.frameCount || 1;
    let idx = frameIndex % frameCount;
    if (idx < 0) idx += frameCount;
    const cacheKey = `${type}_${idx}`;
    if (explosionSpriteCache[cacheKey]) return explosionSpriteCache[cacheKey];
    const frameDef = getPyroAtlasFrame(anim, idx);
    if (frameDef && !frameDef.pendingAtlas) {
        explosionSpriteCache[cacheKey] = frameDef;
    }
    return frameDef;
}

function getEmpRingFrame() {
    if (!EMP_ANIM) return null;
    if (empRingCache) return empRingCache;
    const frameDef = getPyroAtlasFrame(EMP_ANIM.ring, 0);
    if (frameDef && !frameDef.pendingAtlas) {
        empRingCache = frameDef;
    }
    return frameDef;
}

function getEmpBlitzFrame(frame) {
    if (!EMP_ANIM) return null;
    const idx = Math.max(0, Math.min(frame, (EMP_ANIM.blitz.frameCount || 1) - 1));
    if (empBlitzCache[idx]) return empBlitzCache[idx];
    const frameDef = getPyroAtlasFrame(EMP_ANIM.blitz, idx);
    if (frameDef && !frameDef.pendingAtlas) {
        empBlitzCache[idx] = frameDef;
    }
    return frameDef;
}

function getShieldSpriteFrame(name, frameIndex) {
    const def = SHIELD_SPRITE_DEFS[name];
    if (!def) return null;
    const frameCount = def.frameCount || 1;
    let idx = frameIndex % frameCount;
    if (idx < 0) idx += frameCount;
    const key = name + "_" + idx;
    if (shieldSpriteCache[key]) return shieldSpriteCache[key];
    const frameDef = getPyroAtlasFrame(def, idx);
    if (frameDef && !frameDef.pendingAtlas) {
        shieldSpriteCache[key] = frameDef;
    }
    return frameDef;
}

function getLaserDamageFrame(typeId, frameIndex) {
    const def = LASER_DAMAGE_SPRITES[typeId];
    if (!def) return null;
    const frameCount = def.frameCount || 1;
    let idx = frameIndex % frameCount;
    if (idx < 0) idx += frameCount;
    const key = `${typeId}_${idx}`;
    if (laserDamageSpriteCache[key]) return laserDamageSpriteCache[key];
    const frameDef = getPyroAtlasFrame(def, idx);
    if (frameDef && !frameDef.pendingAtlas) {
        laserDamageSpriteCache[key] = frameDef;
    }
    return frameDef;
}

function getRocketDamageFrame(typeId, frameIndex) {
    const def = ROCKET_DAMAGE_SPRITES[typeId];
    if (!def) return null;
    const frameCount = def.frameCount || 1;
    let idx = frameIndex % frameCount;
    if (idx < 0) idx += frameCount;
    const key = `${typeId}_${idx}`;
    if (rocketDamageSpriteCache[key]) return rocketDamageSpriteCache[key];
    if (def.basePath) {
        const img = andromedaCreateImage(def.basePath + (idx + 1) + ".png");
        rocketDamageSpriteCache[key] = img;
        return img;
    }
    const frameDef = getPyroAtlasFrame(def, idx);
    if (frameDef && !frameDef.pendingAtlas) {
        rocketDamageSpriteCache[key] = frameDef;
    }
    return frameDef;
}

const SHIP_GLOW_DEFS = {
    3: {
        frameCount: 32,
        basePath: "graphics/shipGlows/3/"
    }
};

function preloadStationSprites() {
    for (let key in STATION_SPRITE_DEFS) {
        let def = STATION_SPRITE_DEFS[key];
        let img = andromedaCreateImage(def.path);
        stationImages[key] = img;
    }
}

preloadStationSprites();

const shipGlowSpriteCache = {};

function getShipGlowFrame(shipId, frameIndex) {
    const def = SHIP_GLOW_DEFS[shipId];
    if (!def) return null;
    const frameCount = def.frameCount;
    let idx = frameIndex % frameCount;
    if (idx < 0) idx += frameCount;
    const key = shipId + "_" + idx;
    if (shipGlowSpriteCache[key]) return shipGlowSpriteCache[key];
    const fileNumber = idx + 1;
    const path = def.basePath + fileNumber + ".png";
    const img = andromedaCreateImage(path);
    shipGlowSpriteCache[key] = img;
    return img;
}

function saveQuickbarLayout() {
    try {
        const data = {};
        for (let i = 1; i <= 10; i++) {
            const item = normalizeQuickbarItem(quickSlots[i]);
            if (item) data[i] = item;
        }
        localStorage.setItem("andromeda_quickbar", JSON.stringify(data));
    } catch (e) {
        console.warn("Failed to save quickbar:", e);
    }
}

function loadQuickbarLayout() {
    try {
        for (let i = 1; i <= 10; i++) {
            quickSlots[i] = null;
        }
        const raw = localStorage.getItem("andromeda_quickbar");
        if (!raw) return;
        const data = JSON.parse(raw);
        let migrated = false;
        for (let i = 1; i <= 10; i++) {
            const normalized = normalizeQuickbarItem(data[i]);
            if (normalized) {
                quickSlots[i] = normalized;
            } else if (data[i] !== undefined) {
                migrated = true;
            }
        }
        if (migrated) {
            saveQuickbarLayout();
        }
    } catch (e) {
        console.warn("Failed to load quickbar:", e);
    }
}

loadQuickbarLayout();

const TECH_ID_TO_CODE = {
    1: "ELA",
    2: "ECI",
    3: "RPM",
    4: "SBU",
    5: "BRB",
    6: "SL",
    7: "CID"
};

const FLASH_TECH_CODE_ALIASES = Object.freeze({
    ELA: "ELA",
    TECH_ENERGY_LEECH: "ELA",
    ECI: "ECI",
    TECH_ELECTRIC_CHAIN_IMPULSE: "ECI",
    RPM: "RPM",
    TECH_ROCKET_PROBABILITY_MAXIMIZER: "RPM",
    SBU: "SBU",
    TECH_SHIELD_BACK_UP: "SBU",
    BRB: "BRB",
    TECH_BATTLE_REP_BOT: "BRB",
    SL: "SL",
    SPEED_LEECH: "SL",
    CID: "CID",
    CLINGING_IMPULSE_DRONE: "CID"
});

const FLASH_TECH_IMPLICIT_OWNERSHIP = Object.freeze({
    ELA: true,
    ECI: true,
    SBU: true,
    BRB: true
});

function flashResolveCanonicalTechCode(codeOrId) {
    const numericId = Number(codeOrId);
    if (Number.isInteger(numericId) && TECH_ID_TO_CODE[numericId]) {
        return TECH_ID_TO_CODE[numericId];
    }
    const rawCode = String(codeOrId || "").trim().toUpperCase();
    if (!rawCode) return null;
    return FLASH_TECH_CODE_ALIASES[rawCode] || rawCode;
}

function flashTechRuntimeHasImplicitOwnership(code) {
    const normalizedCode = String(code || "").trim().toUpperCase();
    return !!(normalizedCode && FLASH_TECH_IMPLICIT_OWNERSHIP[normalizedCode]);
}

const FLASH_SKILL_TYPE_TO_ABILITY = Object.freeze({
    1: "solace",
    2: "diminisher",
    3: "spectrum",
    4: "sentinel",
    5: "venom",
    6: "lightning"
});

const FLASH_ABILITY_TO_SKILL_TYPE = Object.freeze({
    solace: 1,
    diminisher: 2,
    spectrum: 3,
    sentinel: 4,
    venom: 5,
    lightning: 6
});

const FLASH_ABILITY_TO_COOLDOWN_CODE = Object.freeze({
    solace: "IH",
    diminisher: "WS",
    spectrum: "PS",
    sentinel: "FOR",
    venom: "SIN",
    lightning: "SB"
});

const FLASH_SKILL_READY_STATE = 1;
const FLASH_SKILL_ACTIVE_STATE = 2;
const FLASH_SKILL_COOLING_STATE = 3;

function flashResolveSkillAbilityId(skillTypeOrAbilityId) {
    const numeric = Number(skillTypeOrAbilityId);
    if (Number.isInteger(numeric) && FLASH_SKILL_TYPE_TO_ABILITY[numeric]) {
        return FLASH_SKILL_TYPE_TO_ABILITY[numeric];
    }
    const raw = String(skillTypeOrAbilityId || "").trim().toLowerCase();
    if (!raw) return null;
    if (FLASH_ABILITY_TO_SKILL_TYPE[raw]) {
        return raw;
    }
    const upper = raw.toUpperCase();
    for (const abilityId in FLASH_ABILITY_TO_COOLDOWN_CODE) {
        if (FLASH_ABILITY_TO_COOLDOWN_CODE[abilityId] === upper) {
            return abilityId;
        }
    }
    return null;
}

function flashResolveSkillCooldownCode(skillTypeOrAbilityId) {
    const abilityId = flashResolveSkillAbilityId(skillTypeOrAbilityId);
    return abilityId ? FLASH_ABILITY_TO_COOLDOWN_CODE[abilityId] : null;
}

function flashIsSkillCooldownCode(code) {
    return !!flashResolveSkillAbilityId(code);
}

function flashGetOrCreateSkillRuntimeState(skillTypeOrAbilityId) {
    const abilityId = flashResolveSkillAbilityId(skillTypeOrAbilityId);
    if (!abilityId) return null;
    if (typeof window.heroSkillRuntimeState === "undefined" || !window.heroSkillRuntimeState) {
        window.heroSkillRuntimeState = Object.create(null);
    }
    if (typeof window.heroSkillAvailability === "undefined" || !window.heroSkillAvailability) {
        window.heroSkillAvailability = Object.create(null);
    }
    const state = window.heroSkillRuntimeState[abilityId] || (window.heroSkillRuntimeState[abilityId] = {});
    state.skillType = FLASH_ABILITY_TO_SKILL_TYPE[abilityId];
    state.cooldownCode = FLASH_ABILITY_TO_COOLDOWN_CODE[abilityId];
    return state;
}

function flashUnequipAllSkills() {
    if (typeof window.heroSkillAvailability === "undefined" || !window.heroSkillAvailability) {
        window.heroSkillAvailability = Object.create(null);
    }
    if (typeof window.heroSkillRuntimeState === "undefined" || !window.heroSkillRuntimeState) {
        window.heroSkillRuntimeState = Object.create(null);
    }
    window.heroSkillAvailabilityInitialized = true;
    Object.keys(FLASH_ABILITY_TO_SKILL_TYPE).forEach(abilityId => {
        const state = flashGetOrCreateSkillRuntimeState(abilityId);
        window.heroSkillAvailability[abilityId] = false;
        state.equipped = false;
        state.active = false;
        state.activeUntil = 0;
        if (!state.cooling) {
            state.flashStatus = 0;
            state.available = false;
            state.secondsLeft = 0;
        }
    });
}

function flashSetOnlyEquippedSkill(skillTypeOrAbilityId, status, secondsLeft) {
    const abilityId = flashResolveSkillAbilityId(skillTypeOrAbilityId);
    if (!abilityId) {
        flashUnequipAllSkills();
        return null;
    }
    window.heroSkillAvailabilityInitialized = true;
    const nowSeconds = Date.now() / 1e3;
    const normalizedStatus = Number.isFinite(Number(status)) ? Number(status) : FLASH_SKILL_READY_STATE;
    const normalizedSeconds = Number.isFinite(Number(secondsLeft)) ? Math.max(0, Number(secondsLeft)) : 0;
    Object.keys(FLASH_ABILITY_TO_SKILL_TYPE).forEach(id => {
        const state = flashGetOrCreateSkillRuntimeState(id);
        const isEquipped = id === abilityId;
        window.heroSkillAvailability[id] = isEquipped;
        state.equipped = isEquipped;
        if (!isEquipped) {
            state.active = false;
            state.activeUntil = 0;
            if (!state.cooling) {
                state.flashStatus = 0;
                state.available = false;
                state.secondsLeft = 0;
            }
        }
    });
    const state = flashGetOrCreateSkillRuntimeState(abilityId);
    state.equipped = true;
    state.flashStatus = normalizedStatus;
    state.secondsLeft = normalizedSeconds;
    state.available = normalizedStatus !== 0;
    if (normalizedStatus === FLASH_SKILL_ACTIVE_STATE) {
        state.active = true;
        state.activeUntil = normalizedSeconds > 0 ? nowSeconds + normalizedSeconds : 0;
        state.cooling = false;
        state.cooldownRemaining = 0;
    } else {
        state.active = false;
        state.activeUntil = 0;
        if (normalizedStatus !== FLASH_SKILL_COOLING_STATE) {
            state.cooling = false;
            state.cooldownRemaining = 0;
        }
    }
    if (normalizedStatus === FLASH_SKILL_COOLING_STATE && normalizedSeconds > 0) {
        flashSyncSkillRuntimeCooldownState(abilityId, normalizedSeconds, Math.max(normalizedSeconds, Number(state.cooldownTotal) || 0));
    } else {
        if (normalizedStatus === FLASH_SKILL_READY_STATE && normalizedSeconds <= 0 && typeof clearActionCooldown === "function" && state.cooldownCode) {
            clearActionCooldown(state.cooldownCode);
        }
        flashNormalizeSkillRuntimeReadyState(abilityId);
    }
    return state;
}

function flashSyncSkillRuntimeCooldownState(skillTypeOrCode, remainingSeconds, totalSeconds) {
    const abilityId = flashResolveSkillAbilityId(skillTypeOrCode);
    if (!abilityId) return null;
    const state = flashGetOrCreateSkillRuntimeState(abilityId);
    const remaining = Number.isFinite(Number(remainingSeconds)) ? Math.max(0, Number(remainingSeconds)) : 0;
    const total = Number.isFinite(Number(totalSeconds)) && Number(totalSeconds) > 0 ? Number(totalSeconds) : remaining;
    state.cooling = remaining > 0;
    state.cooldownRemaining = remaining;
    if (remaining > 0) {
        state.cooldownTotal = Math.max(Number(state.cooldownTotal) || 0, total || remaining);
        state.flashStatus = FLASH_SKILL_COOLING_STATE;
        state.available = false;
        state.secondsLeft = Math.max(Number(state.secondsLeft) || 0, remaining);
        if (!state.active) {
            state.activeUntil = 0;
        }
    }
    return state;
}

function flashClearSkillRuntimeCooldownState(skillTypeOrCode) {
    const abilityId = flashResolveSkillAbilityId(skillTypeOrCode);
    if (!abilityId || !window.heroSkillRuntimeState || !window.heroSkillRuntimeState[abilityId]) return null;
    const state = window.heroSkillRuntimeState[abilityId];
    state.cooling = false;
    state.cooldownRemaining = 0;
    state.secondsLeft = 0;
    if (Number(state.flashStatus) !== FLASH_SKILL_ACTIVE_STATE && state.equipped !== false) {
        state.active = false;
        state.activeUntil = 0;
        state.flashStatus = FLASH_SKILL_READY_STATE;
        state.available = true;
    }
    return flashNormalizeSkillRuntimeReadyState(abilityId) || state;
}

function flashNormalizeSkillRuntimeReadyState(skillTypeOrAbilityId) {
    const abilityId = flashResolveSkillAbilityId(skillTypeOrAbilityId);
    if (!abilityId || !window.heroSkillRuntimeState || !window.heroSkillRuntimeState[abilityId]) return null;
    const state = window.heroSkillRuntimeState[abilityId];
    const nowSeconds = Date.now() / 1e3;
    const activeUntil = Number(state.activeUntil) || 0;
    const cooldownCode = flashResolveSkillCooldownCode(abilityId);
    const cooldownEntry = cooldownCode ? actionCooldowns[String(cooldownCode).toUpperCase()] || actionCooldowns[cooldownCode] || null : null;
    const cooldownRemaining = cooldownEntry && typeof cooldownEntry.endTime === "number" ? Math.max(0, cooldownEntry.endTime - nowSeconds) : Math.max(Number(state.cooldownRemaining) || 0, 0);

    if (activeUntil > 0 && activeUntil <= nowSeconds) {
        state.active = false;
        state.activeUntil = 0;
    }

    if (state.active || Number(state.flashStatus) === FLASH_SKILL_ACTIVE_STATE) {
        if (!state.active && activeUntil > nowSeconds) {
            state.active = true;
        }
        if (state.active) {
            state.flashStatus = FLASH_SKILL_ACTIVE_STATE;
            state.available = true;
            if (activeUntil > 0) {
                state.secondsLeft = Math.max(0, Math.ceil(activeUntil - nowSeconds));
            }
        }
    }

    if (cooldownRemaining > 0) {
        state.cooling = true;
        state.cooldownRemaining = cooldownRemaining;
        state.cooldownTotal = Math.max(Number(state.cooldownTotal) || 0, Number(cooldownEntry && cooldownEntry.duration) || cooldownRemaining);
        if (!state.active) {
            state.flashStatus = FLASH_SKILL_COOLING_STATE;
            state.available = false;
            state.secondsLeft = Math.max(1, Math.ceil(cooldownRemaining));
        }
    } else {
        state.cooling = false;
        state.cooldownRemaining = 0;
        if (!state.active && state.equipped !== false) {
            state.flashStatus = FLASH_SKILL_READY_STATE;
            state.available = true;
            state.secondsLeft = 0;
        }
    }

    if (state.equipped === false && !state.active && !state.cooling) {
        state.flashStatus = 0;
        state.available = false;
        state.secondsLeft = 0;
    }

    return state;
}

const FLASH_ABILITY_TO_EFFECT_RESKEY = Object.freeze({
    solace: "solace-effect",
    diminisher: "diminisher-effect",
    spectrum: "spectrum-effect",
    sentinel: "sentinel-effect",
    venom: "venom-effect",
    lightning: "speed-buff-effect"
});

const FLASH_SKILL_EFFECT_SEQUENCE_META = Object.freeze({
    solace: Object.freeze({
        basePath: "graphics/shields/solace-effect",
        sourceSwf: "spacemap/graphics/shields/solace-effect.swf",
        symbol: "mc",
        frameCount: 27,
        fps: 24,
        loop: false,
        instantLoops: 3,
        framePattern: "frame_%03d.png"
    }),
    diminisher: Object.freeze({
        basePath: "graphics/shields/diminisher-effect",
        sourceSwf: "spacemap/graphics/shields/diminisher-effect.swf",
        symbol: "mc",
        frameCount: 27,
        fps: 24,
        loop: true,
        instantLoops: 0,
        framePattern: "frame_%03d.png"
    }),
    spectrum: Object.freeze({
        basePath: "graphics/shields/spectrum-effect",
        sourceSwf: "spacemap/graphics/shields/spectrum-effect.swf",
        symbol: "mc",
        frameCount: 35,
        fps: 24,
        loop: true,
        instantLoops: 0,
        framePattern: "frame_%03d.png"
    }),
    sentinel: Object.freeze({
        basePath: "graphics/shields/sentinel-effect",
        sourceSwf: "spacemap/graphics/shields/sentinel-effect.swf",
        symbol: "mc",
        frameCount: 38,
        fps: 24,
        loop: true,
        instantLoops: 0,
        framePattern: "frame_%03d.png"
    }),
    venom: Object.freeze({
        basePath: "graphics/shields/venom-effect",
        sourceSwf: "spacemap/graphics/shields/venom-effect.swf",
        symbol: "mc",
        frameCount: 35,
        fps: 24,
        loop: true,
        instantLoops: 0,
        framePattern: "frame_%03d.png"
    }),
    lightning: Object.freeze({
        basePath: "graphics/effects/speed-buff-effect",
        sourceSwf: "spacemap/graphics/effects/speed-buff-effect.swf",
        symbol: "mc",
        frameCount: 3,
        fps: 24,
        loop: true,
        instantLoops: 0,
        framePattern: "frame_%03d.png"
    })
});

const FLASH_SKILL_VISUAL_DEFAULTS = Object.freeze({
    solace: Object.freeze({ loop: false, pulseMs: 0, fadeInMs: 500, fadeOutMs: 0 }),
    diminisher: Object.freeze({ loop: true, pulseMs: 0, fadeInMs: 500, fadeOutMs: 500 }),
    spectrum: Object.freeze({ loop: true, pulseMs: 0, fadeInMs: 500, fadeOutMs: 500 }),
    sentinel: Object.freeze({ loop: true, pulseMs: 0, fadeInMs: 500, fadeOutMs: 500 }),
    venom: Object.freeze({ loop: true, pulseMs: 0, fadeInMs: 500, fadeOutMs: 500 }),
    lightning: Object.freeze({ loop: true, pulseMs: 0, fadeInMs: 500, fadeOutMs: 500 })
});

function flashResolveSkillEffectResKey(skillTypeOrAbilityId) {
    const abilityId = flashResolveSkillAbilityId(skillTypeOrAbilityId);
    return abilityId ? FLASH_ABILITY_TO_EFFECT_RESKEY[abilityId] || null : null;
}

function flashGetSkillEffectSequenceMeta(skillTypeOrAbilityId) {
    const abilityId = flashResolveSkillAbilityId(skillTypeOrAbilityId);
    return abilityId ? FLASH_SKILL_EFFECT_SEQUENCE_META[abilityId] || null : null;
}

function flashResolveSkillEffectSource(skillTypeOrAbilityId) {
    const meta = flashGetSkillEffectSequenceMeta(skillTypeOrAbilityId);
    return meta && meta.sourceSwf ? meta.sourceSwf : null;
}

function flashGetSkillVisualDefaults(skillTypeOrAbilityId) {
    const abilityId = flashResolveSkillAbilityId(skillTypeOrAbilityId);
    return abilityId ? FLASH_SKILL_VISUAL_DEFAULTS[abilityId] || null : null;
}
function flashGetSkillVisualSequenceDurationMs(skillTypeOrAbilityId) {
    const meta = flashGetSkillEffectSequenceMeta(skillTypeOrAbilityId);
    if (!meta) return 0;
    const fps = Math.max(1, Number(meta.fps) || 24);
    const frameCount = Math.max(1, Number(meta.frameCount) || 1);
    const totalLoops = meta.loop === false ? Math.max(1, Number(meta.instantLoops) || 1) : 1;
    return Math.ceil(frameCount * totalLoops * (1000 / fps));
}

function flashEnsureSkillEffectFrameImageCache() {
    if (typeof window.flashSkillEffectFrameImageCache === "undefined" || !window.flashSkillEffectFrameImageCache) {
        window.flashSkillEffectFrameImageCache = Object.create(null);
    }
    return window.flashSkillEffectFrameImageCache;
}

function flashGetSkillEffectFrameImage(skillTypeOrAbilityId, frameNumber) {
    const meta = flashGetSkillEffectSequenceMeta(skillTypeOrAbilityId);
    const numericFrame = Number(frameNumber);
    if (!meta || !Number.isFinite(numericFrame) || numericFrame < 1 || numericFrame > Number(meta.frameCount) || !meta.basePath) {
        return null;
    }
    const padded = String(Math.trunc(numericFrame)).padStart(3, "0");
    const path = `${meta.basePath}/frame_${padded}.png`;
    const cache = flashEnsureSkillEffectFrameImageCache();
    if (cache[path]) {
        return cache[path] || null;
    }
    const atlasCanvas = flashBuildSequenceAtlasFrameCanvas(meta, numericFrame);
    if (atlasCanvas) {
        cache[path] = atlasCanvas;
        return atlasCanvas;
    }
    if (flashGetSequenceAtlasManifest(meta)) {
        return null;
    }
    if (!cache[path]) {
        cache[path] = andromedaCreateImage(path);
    }
    return cache[path] || null;
}

const FLASH_TECH_EFFECT_SEQUENCE_META = Object.freeze({
    ELA0: Object.freeze({
        basePath: "graphics/shields/ela0",
        sourceSwf: "spacemap/graphics/shields/ela0.swf",
        symbol: "mc",
        frameCount: 52,
        fps: 4,
        playbackFps: 30,
        loop: true,
        instantLoops: 0,
        framePattern: "frame_%03d.png"
    }),
    ELACLOUD1: Object.freeze({
        basePath: "graphics/lasers/elaCloud1",
        sourceSwf: "spacemap/graphics/lasers/elaCloud1.swf",
        symbol: "mc",
        frameCount: 10,
        fps: 12,
        loop: true,
        instantLoops: 0,
        framePattern: "frame_%03d.png"
    })
});

function flashGetTechEffectSequenceMeta(effectKey) {
    const normalized = String(effectKey || "").toUpperCase();
    return normalized ? FLASH_TECH_EFFECT_SEQUENCE_META[normalized] || null : null;
}

function flashEnsureTechEffectFrameImageCache() {
    if (typeof window.flashTechEffectFrameImageCache === "undefined" || !window.flashTechEffectFrameImageCache) {
        window.flashTechEffectFrameImageCache = Object.create(null);
    }
    return window.flashTechEffectFrameImageCache;
}

function flashGetTechEffectFrameImage(effectKey, frameNumber) {
    const meta = flashGetTechEffectSequenceMeta(effectKey);
    const numericFrame = Number(frameNumber);
    if (!meta || !Number.isFinite(numericFrame) || numericFrame < 1 || numericFrame > Number(meta.frameCount) || !meta.basePath) {
        return null;
    }
    const padded = String(Math.trunc(numericFrame)).padStart(3, "0");
    const path = `${meta.basePath}/frame_${padded}.png`;
    const cache = flashEnsureTechEffectFrameImageCache();
    if (cache[path]) {
        return cache[path] || null;
    }
    const atlasCanvas = flashBuildSequenceAtlasFrameCanvas(meta, numericFrame);
    if (atlasCanvas) {
        cache[path] = atlasCanvas;
        return atlasCanvas;
    }
    if (flashGetSequenceAtlasManifest(meta)) {
        return null;
    }
    if (!cache[path]) {
        cache[path] = andromedaCreateImage(path);
    }
    return cache[path] || null;
}

function flashGetTechEffectSequenceFrameNumber(effectKey, startedAtMs, nowMs = performance.now()) {
    const meta = flashGetTechEffectSequenceMeta(effectKey);
    if (!meta) return 0;
    const fps = Math.max(1, Number(meta.playbackFps || meta.runtimeFps || meta.fps) || 24);
    const frameCount = Math.max(1, Number(meta.frameCount) || 1);
    const frameDurationMs = 1000 / fps;
    const ageMs = Math.max(0, nowMs - (Number(startedAtMs) || nowMs));
    if (meta.loop === false) {
        const instantLoops = Math.max(0, Number(meta.instantLoops) || 0);
        if (instantLoops > 0) {
            const totalFrames = frameCount * instantLoops;
            const sequenceIndex = Math.min(totalFrames - 1, Math.max(0, Math.floor(ageMs / frameDurationMs)));
            return sequenceIndex % frameCount + 1;
        }
        return Math.min(frameCount, Math.floor(ageMs / frameDurationMs) + 1);
    }
    return Math.floor(ageMs / frameDurationMs) % frameCount + 1;
}

function flashStopShipSkillRuntimeLoopAudio(effectState, fadeOut = true) {
    if (!effectState) return;
    const loopChannel = effectState.runtimeAudioLoopChannel || null;
    effectState.runtimeAudioLoopChannel = null;
    effectState.runtimeAudioLoopPending = false;
    effectState.runtimeAudioLoopDesired = false;
    if (!loopChannel) return;
    try {
        if (window.AudioManager && typeof window.AudioManager.removeLoop === "function") {
            window.AudioManager.removeLoop(loopChannel, fadeOut !== false);
        } else if (typeof loopChannel.stop === "function") {
            loopChannel.stop();
        }
    } catch (_) {}
}

function flashCleanupShipSkillRuntimeAudio(effectState, fadeOut = true) {
    if (!effectState) return;
    flashStopShipSkillRuntimeLoopAudio(effectState, fadeOut);
    effectState.runtimeAudioStartupPending = false;
    effectState.runtimeAudioLoopPending = false;
    effectState.runtimeAudioLoopDesired = false;
}

function flashUpdateShipSkillRuntimeAudio(effectState, worldX, worldY, isMoving) {
    if (!effectState || effectState.abilityId !== "lightning") return;
    const audioManager = window.AudioManager;
    if (!audioManager || typeof audioManager.playSoundEffect !== "function") return;
    const serial = Number(effectState.runtimeAudioSerial) || 0;
    const x = Number(worldX);
    const y = Number(worldY);
    const soundX = Number.isFinite(x) ? x : -1;
    const soundY = Number.isFinite(y) ? y : -1;
    const shouldRun = !!(effectState.active && !effectState.fading && isMoving);
    effectState.runtimeAudioLoopDesired = shouldRun;
    if (!shouldRun) {
        flashStopShipSkillRuntimeLoopAudio(effectState, true);
        return;
    }
    if (!effectState.runtimeAudioStartupPlayed && !effectState.runtimeAudioStartupPending) {
        effectState.runtimeAudioStartupPending = true;
        Promise.resolve(audioManager.playSoundEffect(81, false, false, soundX, soundY, true)).finally(() => {
            if (!effectState || (Number(effectState.runtimeAudioSerial) || 0) != serial) return;
            effectState.runtimeAudioStartupPending = false;
            effectState.runtimeAudioStartupPlayed = true;
        });
    }
    if (effectState.runtimeAudioLoopChannel || effectState.runtimeAudioLoopPending) return;
    effectState.runtimeAudioLoopPending = true;
    Promise.resolve(audioManager.playSoundEffect(82, true, true, soundX, soundY, true)).then(channel => {
        if (!effectState || (Number(effectState.runtimeAudioSerial) || 0) != serial) {
            try {
                if (channel && window.AudioManager && typeof window.AudioManager.removeLoop === "function") {
                    window.AudioManager.removeLoop(channel, false);
                }
            } catch (_) {}
            return;
        }
        effectState.runtimeAudioLoopPending = false;
        if (!channel) return;
        if (!(effectState.runtimeAudioLoopDesired && effectState.active && !effectState.fading)) {
            try {
                if (window.AudioManager && typeof window.AudioManager.removeLoop === "function") {
                    window.AudioManager.removeLoop(channel, false);
                }
            } catch (_) {}
            return;
        }
        effectState.runtimeAudioLoopChannel = channel;
    }).catch(() => {
        if (!effectState || (Number(effectState.runtimeAudioSerial) || 0) != serial) return;
        effectState.runtimeAudioLoopPending = false;
    });
}

function flashEnsureShipSkillVisualEffectsStore() {
    if (typeof window.flashShipSkillVisualEffectsByEntity === "undefined" || !window.flashShipSkillVisualEffectsByEntity) {
        window.flashShipSkillVisualEffectsByEntity = Object.create(null);
    }
    // Legacy alias kept for debug/compatibility; the renderer no longer scans this globally.
    window.flashShipSkillVisualEffects = window.flashShipSkillVisualEffectsByEntity;
    return window.flashShipSkillVisualEffectsByEntity;
}

function flashBuildShipSkillVisualEffectKey(entityId, abilityId) {
    return String(abilityId || "");
}

function flashGetShipSkillVisualBucket(entityId, createIfMissing = false) {
    const numericEntityId = Number(entityId);
    if (!Number.isFinite(numericEntityId)) return null;
    const store = flashEnsureShipSkillVisualEffectsStore();
    const bucketKey = String(numericEntityId);
    if (!store[bucketKey] && createIfMissing) {
        store[bucketKey] = Object.create(null);
    }
    return store[bucketKey] || null;
}

function flashDeleteShipSkillVisualBucketIfEmpty(entityId) {
    const numericEntityId = Number(entityId);
    if (!Number.isFinite(numericEntityId)) return;
    const store = flashEnsureShipSkillVisualEffectsStore();
    const bucketKey = String(numericEntityId);
    const bucket = store[bucketKey];
    if (bucket && Object.keys(bucket).length === 0) {
        delete store[bucketKey];
    }
}

function flashIsKnownShipSkillVisualEntity(entityId) {
    const numericEntityId = Number(entityId);
    if (!Number.isFinite(numericEntityId) || numericEntityId === 0) return false;
    if (typeof heroId !== "undefined" && Number(heroId) === numericEntityId) return true;
    if (typeof entities !== "undefined" && entities) {
        const ent = entities[numericEntityId] || entities[String(numericEntityId)];
        return !!(ent && ent.kind !== "unknown");
    }
    return false;
}

function flashForEachShipSkillVisualState(callback) {
    if (typeof callback !== "function") return;
    const store = flashEnsureShipSkillVisualEffectsStore();
    Object.keys(store).forEach(entityKey => {
        const bucket = store[entityKey];
        if (!bucket) return;
        Object.keys(bucket).forEach(abilityKey => {
            const entry = bucket[abilityKey];
            if (entry) callback(entry, entityKey, abilityKey, bucket);
        });
    });
}

function flashGetShipSkillVisualStatesForEntity(entityId) {
    const numericId = Number(entityId);
    if (!Number.isFinite(numericId)) return [];
    const store = flashEnsureShipSkillVisualEffectsStore();
    const bucket = flashGetShipSkillVisualBucket(numericId, false);
    if (!bucket) return [];
    const nowMs = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    const result = [];
    Object.keys(bucket).forEach(key => {
        const entry = bucket[key];
        if (!entry || Number(entry.entityId) !== numericId) {
            delete bucket[key];
            return;
        }
        if (Number.isFinite(entry.expiresAtMs) && entry.expiresAtMs > 0 && entry.expiresAtMs <= nowMs) {
            flashCleanupShipSkillRuntimeAudio(entry, true);
            delete bucket[key];
            return;
        }
        result.push(entry);
    });
    if (Object.keys(bucket).length === 0) {
        delete store[String(numericId)];
    }
    result.sort((a, b) => (Number(a.startedAtMs) || 0) - (Number(b.startedAtMs) || 0));
    return result;
}

function flashActivateShipSkillVisualState(skillTypeOrAbilityId, entityId, sourceId, targetIds) {
    const abilityId = flashResolveSkillAbilityId(skillTypeOrAbilityId);
    const numericEntityId = Number(entityId);
    if (!abilityId || !Number.isFinite(numericEntityId)) return null;
    if (!flashIsKnownShipSkillVisualEntity(numericEntityId)) return null;
    const defaults = flashGetSkillVisualDefaults(abilityId) || {};
    const bucket = flashGetShipSkillVisualBucket(numericEntityId, true);
    if (!bucket) return null;
    const key = flashBuildShipSkillVisualEffectKey(numericEntityId, abilityId);
    const nowMs = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    const state = bucket[key] || (bucket[key] = {});
    flashCleanupShipSkillRuntimeAudio(state, false);
    state.entityId = numericEntityId;
    state.abilityId = abilityId;
    state.skillType = FLASH_ABILITY_TO_SKILL_TYPE[abilityId] || 0;
    state.resKey = flashResolveSkillEffectResKey(abilityId);
    state.assetSource = flashResolveSkillEffectSource(abilityId);
    state.sourceId = Number(sourceId) || 0;
    state.targetIds = Array.isArray(targetIds) ? targetIds.map(id => Number(id)).filter(Number.isFinite) : [];
    state.role = state.sourceId === numericEntityId ? "source" : "target";
    state.loop = defaults.loop !== false;
    state.fadeInMs = Math.max(0, Number(defaults.fadeInMs) || 0);
    state.fadeOutMs = Math.max(0, Number(defaults.fadeOutMs) || 0);
    state.pulseMs = Math.max(0, Number(defaults.pulseMs) || 0);
    state.sequenceDurationMs = Math.max(0, flashGetSkillVisualSequenceDurationMs(abilityId) || 0);
    state.runtimeAudioSerial = (Number(state.runtimeAudioSerial) || 0) + 1;
    state.runtimeAudioStartupPlayed = false;
    state.runtimeAudioStartupPending = false;
    state.runtimeAudioLoopPending = false;
    state.runtimeAudioLoopChannel = null;
    state.runtimeAudioLoopDesired = false;
    state.startedAtMs = nowMs;
    state.lastRefreshMs = nowMs;
    state.endedAtMs = 0;
    state.expiresAtMs = state.loop ? 0 : nowMs + Math.max(state.sequenceDurationMs, 1);
    state.active = true;
    state.fading = false;
    return state;
}

function flashActivateShipSkillVisualChain(skillTypeOrAbilityId, sourceId, targetIds) {
    const abilityId = flashResolveSkillAbilityId(skillTypeOrAbilityId);
    if (!abilityId) return null;
    const normalizedSourceId = Number(sourceId);
    const normalizedTargets = Array.isArray(targetIds) ? targetIds.map(id => Number(id)).filter(Number.isFinite) : [];
    if (Number.isFinite(normalizedSourceId) && flashIsKnownShipSkillVisualEntity(normalizedSourceId)) {
        flashActivateShipSkillVisualState(abilityId, normalizedSourceId, normalizedSourceId, normalizedTargets);
    }
    normalizedTargets.forEach(targetId => {
        if (!Number.isFinite(targetId) || targetId === normalizedSourceId) return;
        if (!flashIsKnownShipSkillVisualEntity(targetId)) return;
        flashActivateShipSkillVisualState(abilityId, targetId, normalizedSourceId, normalizedTargets);
    });
    return abilityId;
}

function flashDeactivateShipSkillVisualState(skillTypeOrAbilityId, entityId) {
    const abilityId = flashResolveSkillAbilityId(skillTypeOrAbilityId);
    const numericEntityId = Number(entityId);
    if (!abilityId || !Number.isFinite(numericEntityId)) return null;
    const bucket = flashGetShipSkillVisualBucket(numericEntityId, false);
    if (!bucket) return null;
    const key = flashBuildShipSkillVisualEffectKey(numericEntityId, abilityId);
    const state = bucket[key];
    if (!state) return null;
    const nowMs = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    if (state.loop) {
        const fadeOutMs = Math.max(0, Number(state.fadeOutMs) || 0);
        if (fadeOutMs <= 0) {
            flashCleanupShipSkillRuntimeAudio(state, true);
            delete bucket[key];
            flashDeleteShipSkillVisualBucketIfEmpty(numericEntityId);
            return null;
        }
        flashCleanupShipSkillRuntimeAudio(state, true);
        state.active = false;
        state.fading = true;
        state.endedAtMs = nowMs;
        state.expiresAtMs = nowMs + fadeOutMs;
        return state;
    }
    const minLifetime = Math.max(1, Number(state.sequenceDurationMs) || flashGetSkillVisualSequenceDurationMs(abilityId) || 0);
    state.active = false;
    state.fading = false;
    state.endedAtMs = nowMs;
    state.expiresAtMs = Math.max(Number(state.expiresAtMs) || 0, (Number(state.startedAtMs) || nowMs) + minLifetime);
    return state;
}

function flashDeactivateShipSkillVisualChain(skillTypeOrAbilityId, sourceId, targetIds) {
    const abilityId = flashResolveSkillAbilityId(skillTypeOrAbilityId);
    if (!abilityId) return null;
    const normalizedSourceId = Number(sourceId);
    const normalizedTargets = Array.isArray(targetIds) ? targetIds.map(id => Number(id)).filter(Number.isFinite) : [];
    if (Number.isFinite(normalizedSourceId)) {
        flashDeactivateShipSkillVisualState(abilityId, normalizedSourceId);
    }
    normalizedTargets.forEach(targetId => {
        if (!Number.isFinite(targetId)) return;
        flashDeactivateShipSkillVisualState(abilityId, targetId);
    });
    return abilityId;
}

function flashRemoveShipSkillVisualState(skillTypeOrAbilityId, entityId) {
    const abilityId = flashResolveSkillAbilityId(skillTypeOrAbilityId);
    const numericEntityId = Number(entityId);
    if (!abilityId || !Number.isFinite(numericEntityId)) return null;
    const bucket = flashGetShipSkillVisualBucket(numericEntityId, false);
    if (!bucket) return null;
    const key = flashBuildShipSkillVisualEffectKey(numericEntityId, abilityId);
    const state = bucket[key];
    if (!state) return null;
    const nowMs = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    if (state.loop) {
        const fadeOutMs = Math.max(0, Number(state.fadeOutMs) || 0);
        if (fadeOutMs <= 0) {
            flashCleanupShipSkillRuntimeAudio(state, true);
            delete bucket[key];
            flashDeleteShipSkillVisualBucketIfEmpty(numericEntityId);
            return null;
        }
        flashCleanupShipSkillRuntimeAudio(state, true);
        state.active = false;
        state.fading = true;
        state.endedAtMs = nowMs;
        state.expiresAtMs = nowMs + fadeOutMs;
        return state;
    }
    const minLifetime = Math.max(1, Number(state.sequenceDurationMs) || flashGetSkillVisualSequenceDurationMs(abilityId) || 0);
    state.active = false;
    state.fading = false;
    state.endedAtMs = nowMs;
    state.expiresAtMs = Math.max(Number(state.expiresAtMs) || 0, (Number(state.startedAtMs) || nowMs) + minLifetime);
    return state;
}

function flashClearEntityShipSkillVisualEffects(entityId) {
    const numericEntityId = Number(entityId);
    if (!Number.isFinite(numericEntityId)) return;
    const store = flashEnsureShipSkillVisualEffectsStore();
    const bucketKey = String(numericEntityId);
    const bucket = store[bucketKey];
    if (!bucket) return;
    Object.keys(bucket).forEach(key => {
        const entry = bucket[key];
        if (entry) flashCleanupShipSkillRuntimeAudio(entry, true);
        delete bucket[key];
    });
    delete store[bucketKey];
}

function flashResetAllShipSkillVisualEffects() {
    flashForEachShipSkillVisualState(entry => {
        flashCleanupShipSkillRuntimeAudio(entry, true);
    });
    window.flashShipSkillVisualEffectsByEntity = Object.create(null);
    window.flashShipSkillVisualEffects = window.flashShipSkillVisualEffectsByEntity;
}

function getActionCodeForSlot(slot) {
    const item = quickSlots[slot];
    if (!item) return null;
    if (typeof flashGetCooldownCodeForItem === "function") {
        return flashGetCooldownCodeForItem(item);
    }
    switch (item.type) {
      case "rocket":
        if (item.id === 10) return "DCR";
        return "ROK";

      case "ammo":
        if (item.id === 6) return "RSB";
        return null;

      case "tech":
        return TECH_ID_TO_CODE[item.id] || null;

      case "explosive":
      case "cpu":
        return item.code || null;

      default:
        return null;
    }
}

function flashSyncTechRuntimeCooldownState(code, remainingSeconds, totalSeconds) {
    const normalizedCode = String(code || "").toUpperCase();
    if (!normalizedCode) return null;
    if (typeof window.heroTechRuntimeState === "undefined" || !window.heroTechRuntimeState) {
        window.heroTechRuntimeState = Object.create(null);
    }
    const state = window.heroTechRuntimeState[normalizedCode] || (window.heroTechRuntimeState[normalizedCode] = {});
    const remaining = Number.isFinite(Number(remainingSeconds)) ? Math.max(0, Number(remainingSeconds)) : 0;
    const total = Number.isFinite(Number(totalSeconds)) && Number(totalSeconds) > 0 ? Number(totalSeconds) : remaining;
    state.cooling = remaining > 0;
    state.cooldownRemaining = remaining;
    if (remaining > 0) {
        state.cooldownTotal = Math.max(Number(state.cooldownTotal) || 0, total || remaining);
    }
    return state;
}

function flashClearTechRuntimeCooldownState(code) {
    const normalizedCode = String(code || "").toUpperCase();
    if (!normalizedCode || !window.heroTechRuntimeState || !window.heroTechRuntimeState[normalizedCode]) return null;
    const state = window.heroTechRuntimeState[normalizedCode];
    state.cooling = false;
    state.cooldownRemaining = 0;
    if ((Number(state.flashStatus) || 0) !== 2) {
        state.active = false;
        state.activeUntil = 0;
    }
    return flashNormalizeTechRuntimeReadyState(normalizedCode) || state;
}

function flashNormalizeTechRuntimeReadyState(code) {
    const normalizedCode = String(code || "").toUpperCase();
    if (!normalizedCode || !window.heroTechRuntimeState || !window.heroTechRuntimeState[normalizedCode]) return null;
    const state = window.heroTechRuntimeState[normalizedCode];
    const nowSeconds = Date.now() / 1e3;
    const activeUntil = Number(state.activeUntil) || 0;
    const meta = window.heroTechCooldownMeta && window.heroTechCooldownMeta[normalizedCode] ? window.heroTechCooldownMeta[normalizedCode] : null;
    const metaRemaining = meta && typeof meta.endTime === "number" ? meta.endTime - nowSeconds : 0;
    const runtimeRemaining = Math.max(Number(state.cooldownRemaining) || 0, metaRemaining);
    const hasCooldown = runtimeRemaining > 0;
    const amount = Number.isFinite(Number(state.amount)) ? Math.max(0, Number(state.amount)) : null;
    const hasChargesAvailable = amount == null || amount > 0 || flashTechRuntimeHasImplicitOwnership(normalizedCode);
    let status = Number.isFinite(Number(state.flashStatus)) ? Number(state.flashStatus) : null;

    if (activeUntil > 0 && activeUntil <= nowSeconds) {
        state.active = false;
        state.activeUntil = 0;
    }

    if (!hasCooldown) {
        state.cooling = false;
        state.cooldownRemaining = 0;
    }

    if (status === 2 && !state.active && (!activeUntil || activeUntil <= nowSeconds)) {
        if (hasCooldown) {
            state.flashStatus = 3;
            state.available = false;
        } else if (hasChargesAvailable) {
            state.flashStatus = 1;
            state.available = true;
            state.secondsLeft = 0;
        }
        status = Number.isFinite(Number(state.flashStatus)) ? Number(state.flashStatus) : status;
    }

    if (status === 3 && !hasCooldown && hasChargesAvailable) {
        state.flashStatus = 1;
        state.available = true;
        state.secondsLeft = 0;
    } else if ((status === 1 || status == null) && !hasCooldown && hasChargesAvailable && !state.active) {
        state.available = true;
        state.secondsLeft = 0;
    }

    return state;
}

function setActionCooldown(code, seconds) {
    const normalizedCode = String(code || "").toUpperCase();
    if (!normalizedCode || !seconds || seconds <= 0 || isNaN(seconds)) return;
    const nowSeconds = Date.now() / 1e3;
    actionCooldowns[normalizedCode] = {
        endTime: nowSeconds + seconds,
        duration: seconds
    };
    if (flashIsSkillCooldownCode(normalizedCode)) {
        flashSyncSkillRuntimeCooldownState(normalizedCode, Math.max(0, seconds), Math.max(0, seconds));
    }
    persistCooldowns();

    // Flash updated an existing MovieClip cooldown. For quickbar explosives, keep
    // the HTML5 path equally light: update an existing overlay if visible, but do
    // not rebuild the full action drawer at the moment the action fires.
    if (flashShouldUseLightCooldownDrawerUpdate(normalizedCode)) {
        flashUpdateActionDrawerCooldownForCode(normalizedCode, true);
    } else if (typeof flashRequestActionDrawerCooldownRender === "function") {
        flashRequestActionDrawerCooldownRender(true);
    } else if (typeof renderActionDrawerItems === "function") {
        renderActionDrawerItems();
    }
}

function getCooldownInfo(code) {
    const normalizedCode = String(code || "").toUpperCase();
    let cd = actionCooldowns[normalizedCode] || actionCooldowns[code];
    const nowSeconds = Date.now() / 1e3;
    if (!cd && normalizedCode && window.heroTechCooldownMeta && window.heroTechCooldownMeta[normalizedCode]) {
        cd = window.heroTechCooldownMeta[normalizedCode];
    }
    if (!cd) return null;
    const remaining = cd.endTime - nowSeconds;
    if (remaining <= 0) return null;
    if (normalizedCode) {
        if (flashIsSkillCooldownCode(normalizedCode)) {
            flashSyncSkillRuntimeCooldownState(normalizedCode, remaining, cd.duration || remaining);
        } else if (window.heroTechRuntimeState && window.heroTechRuntimeState[normalizedCode]) {
            flashSyncTechRuntimeCooldownState(normalizedCode, remaining, cd.duration || remaining);
        }
    }
    return {
        remaining: remaining,
        total: cd.duration || remaining
    };
}

const FLASH_ACTION_DRAWER_COOLDOWN_RENDER_INTERVAL_MS = 125;
const FLASH_ACTION_DRAWER_COOLDOWN_OVERLAY_UPDATE_INTERVAL_MS = 90;
let flashActionDrawerCooldownLastRenderMs = 0;
let flashActionDrawerCooldownLastOverlayUpdateMs = 0;

function flashRequestActionDrawerCooldownRender(force = false) {
    if (typeof renderActionDrawerItems !== "function") return;
    if (!document.getElementById("actionDrawerContainer")) return;
    const nowMs = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    if (!force && nowMs - flashActionDrawerCooldownLastRenderMs < FLASH_ACTION_DRAWER_COOLDOWN_RENDER_INTERVAL_MS) return;
    flashActionDrawerCooldownLastRenderMs = nowMs;
    renderActionDrawerItems();
}

function updateActionCooldowns() {
    const nowSeconds = Date.now() / 1e3;
    let changed = false;
    let hasAnimatedCooldowns = false;
    for (const code in actionCooldowns) {
        const cd = actionCooldowns[code];
        if (!cd) continue;
        const normalizedCode = String(code || "").toUpperCase();
        const isSkillCooldown = flashIsSkillCooldownCode(normalizedCode);
        if (nowSeconds >= cd.endTime) {
            delete actionCooldowns[code];
            if (isSkillCooldown) {
                flashClearSkillRuntimeCooldownState(normalizedCode);
            } else if (normalizedCode && window.heroTechRuntimeState && window.heroTechRuntimeState[normalizedCode] && typeof flashClearTechRuntimeCooldownState === "function") {
                flashClearTechRuntimeCooldownState(normalizedCode);
            }
            changed = true;
        } else {
            const remaining = cd.endTime - nowSeconds;
            if (isSkillCooldown) {
                flashSyncSkillRuntimeCooldownState(normalizedCode, remaining, cd.duration || Math.max(0, remaining));
            } else if (normalizedCode && window.heroTechRuntimeState && window.heroTechRuntimeState[normalizedCode] && typeof flashSyncTechRuntimeCooldownState === "function") {
                flashSyncTechRuntimeCooldownState(normalizedCode, remaining, cd.duration || Math.max(0, remaining));
            }
            hasAnimatedCooldowns = true;
        }
    }
    if (window.heroTechCooldownMeta && typeof window.heroTechCooldownMeta === "object") {
        for (const code in window.heroTechCooldownMeta) {
            const cd = window.heroTechCooldownMeta[code];
            if (!cd || typeof cd.endTime !== "number") {
                delete window.heroTechCooldownMeta[code];
                flashClearTechRuntimeCooldownState(code);
                changed = true;
                continue;
            }
            const remaining = cd.endTime - nowSeconds;
            if (remaining <= 0) {
                delete window.heroTechCooldownMeta[code];
                flashClearTechRuntimeCooldownState(code);
                changed = true;
            } else {
                flashSyncTechRuntimeCooldownState(code, remaining, cd.duration || remaining);
                hasAnimatedCooldowns = true;
            }
        }
    }
    if (changed) {
        persistCooldowns();
    }
    // drawQuickbar() is already called by the render loop each frame.
    // Rebuild the drawer only at cooldown start/end; active cooldowns use a light path update.
    if (changed) {
        flashRequestActionDrawerCooldownRender(true);
    } else if (hasAnimatedCooldowns && typeof flashUpdateVisibleActionDrawerCooldownOverlays === "function") {
        flashUpdateVisibleActionDrawerCooldownOverlays(nowSeconds);
    }
}

function isActionBlacklisted(code) {
    return code ? actionBlacklist.has(code) : false;
}

function updateLocalAmmoSelection(ammoId) {
    currentAmmoId = ammoId;
    if (Array.isArray(window.__ANDRO_FLASH_SETTINGS_CHUNK)) {
        while (window.__ANDRO_FLASH_SETTINGS_CHUNK.length <= 15) {
            window.__ANDRO_FLASH_SETTINGS_CHUNK.push("1");
        }
        window.__ANDRO_FLASH_SETTINGS_CHUNK[15] = String(ammoId);
    }
    if (ammoId != null && ammoId !== RSB_AMMO_ID) {
        primaryAmmoId = ammoId;
    }
    const nextAmmoId = Number(ammoId) || 0;
    if (nextAmmoId !== Number(SAB_AMMO_ID) && typeof clearSabLaserVisualJobsForLocalHero === "function") {
        clearSabLaserVisualJobsForLocalHero();
    }
    if (actionDrawerCategory === "laser") {
        renderActionDrawerItems();
    }
}

function flashShouldSendAmmoSelection(ammoId) {
    const nextAmmoId = Number(ammoId) || 0;
    if (nextAmmoId <= 0) return false;
    const selectedAmmoId = Number(currentAmmoId) || 0;
    return nextAmmoId === Number(RSB_AMMO_ID) || nextAmmoId !== selectedAmmoId;
}

const quickbarSlotRects = {};

const QUICKBAR_ITEMS_BY_CATEGORY = {
    laser: [ {
        type: "ammo",
        id: 1,
        stockId: 1,
        label: "LCB-10"
    }, {
        type: "ammo",
        id: 2,
        stockId: 2,
        label: "MCB-25"
    }, {
        type: "ammo",
        id: 3,
        stockId: 3,
        label: "MCB-50"
    }, {
        type: "ammo",
        id: 4,
        stockId: 4,
        label: "UCB-100"
    }, {
        type: "ammo",
        id: 5,
        stockId: 5,
        label: "SAB-50"
    }, {
        type: "ammo",
        id: 6,
        stockId: 6,
        label: "RSB-75"
    } ],
    rocket: [ {
        type: "rocket",
        id: 1,
        stockId: 9,
        label: "R-310"
    }, {
        type: "rocket",
        id: 2,
        stockId: 10,
        label: "PLT-2026"
    }, {
        type: "rocket",
        id: 3,
        stockId: 11,
        label: "PLT-2021"
    }, {
        type: "rocket",
        id: 4,
        stockId: 12,
        label: "PLT-3030"
    }, {
        type: "rocket",
        id: 5,
        stockId: 13,
        label: "PLD-8"
    }, {
        type: "rocket",
        id: 7,
        stockId: 14,
        label: "WIZ"
    }, {
        type: "rocket",
        id: 10,
        stockId: 18,
        label: "DCR-250",
        code: "DCR"
    } ],
    explosive: [ {
        type: "explosive",
        code: "EMP",
        stockId: 30,
        label: "EMP-01"
    }, {
        type: "explosive",
        code: "ISH",
        stockId: 17,
        label: "ISH-01"
    }, {
        type: "explosive",
        code: "SMB",
        stockId: 16,
        label: "SMB-01"
    } ],
    special: [ {
        type: "explosive",
        code: "EMP",
        stockId: 30,
        label: "EMP-01"
    }, {
        type: "explosive",
        code: "ISH",
        stockId: 17,
        label: "ISH-01"
    }, {
        type: "explosive",
        code: "SMB",
        stockId: 16,
        label: "SMB-01"
    } ],
    cpu: [ {
        type: "cpu",
        code: "ROB",
        label: "Rep Bot"
    }, {
        type: "cpu",
        code: "CLK",
        label: "Cloak"
    }, {
        type: "cpu",
        code: "ARL",
        label: "Auto Rkt"
    } ],
    tech: [ {
        type: "tech",
        id: 4,
        code: "SBU",
        label: "Shield BU"
    }, {
        type: "tech",
        id: 5,
        code: "BRB",
        label: "Battle Bot"
    } ],
    ability: [ {
        type: "ability",
        id: "solace",
        label: "Nano Clust"
    }, {
        type: "ability",
        id: "diminisher",
        label: "Weaken Shd"
    }, {
        type: "ability",
        id: "spectrum",
        label: "Prismatic"
    }, {
        type: "ability",
        id: "sentinel",
        label: "Fortress"
    }, {
        type: "ability",
        id: "venom",
        label: "Singularity"
    }, {
        type: "ability",
        id: "lightning",
        label: "Afterburner",
        iconPath: "graphics/ui/actionMenu/images/skill_ship_lightning.png"
    } ],
    buy_now: [ {
        type: "buy",
        id: "ammo_x1",
        label: "LCB-10"
    }, {
        type: "buy",
        id: "ammo_x2",
        label: "MCB-25"
    }, {
        type: "buy",
        id: "ammo_x3",
        label: "MCB-50"
    }, {
        type: "buy",
        id: "ammo_x5",
        label: "SAB-50"
    }, {
        type: "buy",
        id: "r_r310",
        label: "R-310"
    }, {
        type: "buy",
        id: "r_plt2026",
        label: "PLT-2026"
    }, {
        type: "buy",
        id: "r_plt2021",
        label: "PLT-2021"
    } ]
};

let actionDrawerCategory = "laser";

let actionDrawerSelectedIndex = 0;

function initDragAndDrop() {
    const cvs = document.getElementById("gameCanvas");
    if (!cvs) return;
    cvs.addEventListener("dragover", e => {
        e.preventDefault();
    });
    cvs.addEventListener("drop", e => {
        e.preventDefault();
        if (!draggedActionItem) return;
        if (quickbarLocked) return;
        const rect = cvs.getBoundingClientRect();
        const scaleX = cvs.width / rect.width;
        const scaleY = cvs.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        let foundSlot = null;
        for (let slot = 1; slot <= 10; slot++) {
            const r = quickbarSlotRects[slot];
            if (r && mouseX >= r.x && mouseX <= r.x + r.w && mouseY >= r.y && mouseY <= r.y + r.h) {
                foundSlot = slot;
                break;
            }
        }
        if (foundSlot) {
            const item = draggedActionItem;
            const normalized = normalizeQuickbarItem(item);
            if (normalized) {
                quickSlots[foundSlot] = normalized;
                addInfoMessage(`Slot ${foundSlot} set: ${item.label || item.code}`);
                saveQuickbarLayout();
            }
        }
        draggedActionItem = null;
    });
}

function executeItemActionDirectly(item, options = {}) {
    if (!item) return false;
    const source = String(options && options.source ? options.source : "").toLowerCase();
    const actionCode = typeof flashGetCooldownCodeForItem === "function" ? flashGetCooldownCodeForItem(item) : item.cooldownCode || item.code || "";
    if (actionCode && isActionBlacklisted(actionCode)) {
        return false;
    }
    if (actionCode) {
        const cd = getCooldownInfo(actionCode);
        if (cd) {
            const cooldownLabel = item.type === "ammo" && item.id === RSB_AMMO_ID ? "RSB-75" : item.label || "";
            if (cooldownLabel) {
                addInfoMessage(`${cooldownLabel} is on cooldown (${Math.max(1, Math.ceil(cd.remaining))}s).`);
            }
            return false;
        }
    }
    if (item.type === "launcher") {
        if (typeof sendRocketLauncherLoadOrFire === "function") {
            sendRocketLauncherLoadOrFire();
            return true;
        }
        return false;
    }
    if (item.type === "launcherRocket") {
        if (typeof sendSelectLauncherRocket === "function") {
            sendSelectLauncherRocket(item.id);
            return true;
        }
        return false;
    }
    if (item.type === "ammo") {
        const ammoId = Number(item.id) || 0;
        if (flashShouldSendAmmoSelection(ammoId)) {
            sendSelectAmmo(ammoId);
        }
        if (ammoId === Number(RSB_AMMO_ID)) {
            return true;
        }
        if (selectedTargetId !== null || source === "quickbar" || source === "menu-trigger") {
            if (selectedTargetId !== null) {
                sendLaserAttack(selectedTargetId);
                isChasingTarget = false;
            }
        }
        return true;
    }
    if (item.type === "rocket") {
        if (currentRocketId !== item.id) {
            sendSelectRocket(item.id);
        }
        return true;
    }
    if (item.type === "explosive") {
        const qty = typeof flashGetActionStockCount === "function" ? flashGetActionStockCount(item) : 0;
        if (!flashHasExplosiveCpuAccess(item.code || "")) {
            addInfoMessage(`${item.label || item.code || "Explosive"} is not installed on this ship.`);
            return false;
        }
        if (qty <= 0) {
            addInfoMessage(`No ${item.label || item.code || "explosive"} left.`);
            return false;
        }
        sendCpuAction(item.code);
        return true;
    }
    if (item.type === "tech") {
        sendTechActivation(item.id);
        return true;
    }
    if (item.type === "cpu") {
        if (item.code === "AMB" || item.code === "RKB") {
            addInfoMessage(item.label + " is now exposed in the client. Server CPU command still needs emulator-side confirmation.");
            return false;
        }
        if (item.code === "ROB") {
            if (typeof heroHp !== "undefined" && typeof heroMaxHp !== "undefined" && heroMaxHp > 0 && heroHp >= heroMaxHp) {
                addInfoMessage("Maximum hit points reached.");
                return false;
            }
        }
        sendCpuAction(item.code);
        return true;
    }
    if (item.type === "mine") {
        sendRaw("u|m|" + item.id);
        return true;
    }
    if (item.type === "buy") {
        const fastbuyCfg = flashGetFastbuyConfig(item);
        if (!fastbuyCfg) {
            addInfoMessage((item.label || "Fast Buy item") + " is not configured correctly.");
            return false;
        }
        if (!flashCanAffordFastbuy(item)) {
            addInfoMessage(`Not enough ${flashGetFastbuyCurrencyLabel(fastbuyCfg.currency)} (${fastbuyCfg.price.toLocaleString()} required).`);
            return false;
        }
        sendRaw(`5|${fastbuyCfg.packetType}|${fastbuyCfg.protocolId}|${fastbuyCfg.amount}`);
        return true;
    }
    if (item.type === "ability") {
        sendRaw("SD");
        return true;
    }
    return false;
}

const infoMessages = [];

function initActionDrawerTooltips() {
    if (!document.getElementById("style-am-tooltip")) {
        const style = document.createElement("style");
        style.id = "style-am-tooltip";
        style.innerHTML = `\n            #amTooltip {\n                position: absolute;\n                background: rgba(16, 26, 38, 0.95);\n                border: 1px solid #4a6b8c;\n                color: #cee;\n                padding: 5px 8px;\n                font-family: 'Verdana', sans-serif;\n                font-size: 10px;\n                pointer-events: none;\n                z-index: 10000;\n                display: none;\n                box-shadow: 0 0 6px rgba(0,0,0,0.8);\n                border-radius: 4px;\n                min-width: 100px;\n                text-align: left;\n                line-height: 1.4em;\n            }\n            #amTooltip .ttHeader { color: #fff; font-weight: bold; font-size: 11px; margin-bottom: 3px; border-bottom: 1px solid #334; padding-bottom: 2px; }\n            #amTooltip .ttBody { color: #cde8ff; white-space: pre-line; }\n            #amTooltip .ttRow { display: flex; justify-content: space-between; gap: 10px; }\n            #amTooltip .ttLabel { color: #8ab; }\n            #amTooltip .ttVal { color: #fff; font-weight: bold; }\n        `;
        document.head.appendChild(style);
    }
    if (!document.getElementById("amTooltip")) {
        const tooltip = document.createElement("div");
        tooltip.id = "amTooltip";
        document.body.appendChild(tooltip);
    }
}

function showActionTooltip(e, item) {
    const tt = document.getElementById("amTooltip");
    if (!tt || !item) return;
    const escapeHtml = value => String(value == null ? "" : value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] || ch));
    const rows = [];
    const pushRow = (label, value, accent = "") => {
        if (value == null || value === "") return;
        rows.push(`<div class="ttRow"><span class="ttLabel${accent}">${escapeHtml(label)}:</span><span class="ttVal${accent}">${escapeHtml(value)}</span></div>`);
    };
    const title = item.label || item.code || flashActionLocaleText(item.languageKey, "Item") || "Item";
    const qty = typeof flashGetActionStockCount === "function" ? flashGetActionStockCount(item) : 0;
    const hasStock = qty > 0 || (typeof flashGetActionStockId === "function" && flashGetActionStockId(item) != null);

    if (item.type === "launcher") {
        const launcherBody = flashBuildLauncherTooltipBodyHtml(item);
        tt.innerHTML = `<div class="ttBody">${launcherBody}</div>`;
        tt.style.display = "block";
        moveActionTooltip(e);
        return;
    }

    if (item.type === "launcherRocket") {
        pushRow(flashActionLocaleText("quantity", "Quantity"), hasStock ? qty.toLocaleString() : "0");
        const selected = Number(flashGetLauncherSelectedRocketId()) === Number(item.id);
        pushRow(flashActionLocaleText("selected", "Selected"), selected ? flashActionLocaleText("yes", "Yes") : flashActionLocaleText("no", "No"));
    } else if (item.type === "buy") {
        const fastbuyCfg = flashGetFastbuyConfig(item);
        if (fastbuyCfg) {
            pushRow(flashActionLocaleText("quantity", "Quantity"), fastbuyCfg.amount.toLocaleString());
            pushRow(flashActionLocaleText("price", "Price"), flashFormatFastbuyPrice(item));
            const wallet = flashGetFastbuyWalletAmount(fastbuyCfg.currency);
            if (wallet != null) {
                pushRow(flashActionLocaleText("wallet", "Wallet"), `${wallet.toLocaleString()} ${flashGetFastbuyCurrencyLabel(fastbuyCfg.currency)}`);
            }
        }
    } else if (item.type === "ammo" || item.type === "rocket" || item.type === "mine" || item.type === "explosive") {
        pushRow(flashActionLocaleText("quantity", "Quantity"), (hasStock ? qty : 0).toLocaleString());
    } else if (item.type === "cpu") {
        const info = flashGetActionCpuInfo(item.code || "");
        if (info) {
            if (item.code === "ARL") {
                pushRow(flashActionLocaleText("state", "State"), info.state ? flashActionLocaleText("on", "On") : flashActionLocaleText("off", "Off"));
            } else if (item.code === "CLK") {
                pushRow(flashActionLocaleText("charges", "Charges"), info.amount);
            } else if (item.code === "AMB") {
                const selectedAmmo = flashGetActionDrawerItems("laser").find(entry => entry.type === "ammo" && Number(entry.id) === Number(currentAmmoId)) || null;
                pushRow(flashActionLocaleText("ammo", "Ammo"), selectedAmmo ? selectedAmmo.label : "Unknown");
                pushRow(flashActionLocaleText("state", "State"), info.state ? flashActionLocaleText("on", "On") : flashActionLocaleText("off", "Off"));
                pushRow(flashActionLocaleText("reserve", "Reserve"), info.amount);
            } else if (item.code === "RKB") {
                const rocketId = flashResolveRocketBuyRocketId();
                const rocketLabel = (flashGetActionDrawerItems("rocket").find(entry => entry.type === "rocket" && Number(entry.id) === Number(rocketId)) || {}).label || "Unknown";
                pushRow(flashActionLocaleText("rocket", "Rocket"), rocketLabel);
                pushRow(flashActionLocaleText("reserve", "Reserve"), info.amount);
            } else if (item.code === "RLC") {
                pushRow(flashActionLocaleText("state", "State"), info.state ? flashActionLocaleText("on", "On") : flashActionLocaleText("off", "Off"));
            }
        }
    }

    const code = typeof flashGetCooldownCodeForItem === "function" ? flashGetCooldownCodeForItem(item) : item.cooldownCode || item.code || null;
    if (code && typeof getCooldownInfo === "function") {
        const cd = getCooldownInfo(code);
        if (cd) {
            rows.push(`<div class="ttRow"><span class="ttLabel" style="color:#f66">${escapeHtml(flashActionLocaleText("cooldown", "Cooldown"))}:</span><span class="ttVal" style="color:#f66">${Math.ceil(cd.remaining)}s</span></div>`);
        }
    }

    tt.innerHTML = `<div class="ttHeader">${escapeHtml(title)}</div>${rows.join("")}`;
    tt.style.display = "block";
    moveActionTooltip(e);
}

function moveActionTooltip(e) {
    const tt = document.getElementById("amTooltip");
    if (tt && tt.style.display === "block") {
        tt.style.left = e.clientX + 15 + "px";
        tt.style.top = e.clientY + 15 + "px";
    }
}

function hideActionTooltip() {
    const tt = document.getElementById("amTooltip");
    if (tt) tt.style.display = "none";
}

function flashPlayActionClickSound() {
    try {
        if (window.AudioManager && typeof window.AudioManager.playSoundEffect === "function") {
            window.AudioManager.playSoundEffect(25, false, false, -1, -1, true);
        }
    } catch (_) {}
}

window.resolveQuickbarCatalogItem = resolveQuickbarCatalogItem;

window.showActionTooltip = showActionTooltip;

window.moveActionTooltip = moveActionTooltip;

window.hideActionTooltip = hideActionTooltip;

const FLASH_ACTION_MENU_IMAGE_BASE = "graphics/ui/actionMenu/images/";
function flashResolveActionMenuImagePath(resKeyOrPath) {
    const rawValue = String(resKeyOrPath || "").trim();
    if (!rawValue) return "";
    const logicalPath = rawValue.startsWith(FLASH_ACTION_MENU_IMAGE_BASE) ? rawValue : FLASH_ACTION_MENU_IMAGE_BASE + rawValue;
    if (typeof resolveUiImageUrl === "function") {
        const resolved = resolveUiImageUrl(logicalPath);
        if (resolved) return resolved;
    }
    return logicalPath;
}
const FLASH_ACTION_MENU_SLOT_BG = flashResolveActionMenuImagePath("slot.png");
const FLASH_ACTION_MENU_DISABLED_BG = flashResolveActionMenuImagePath("comb00_deactivated.png");
const FLASH_ACTION_MENU_TAB_BG_DEFAULT = flashResolveActionMenuImagePath("comb01_std.png");
const FLASH_ACTION_MENU_TAB_BG_HOVER = flashResolveActionMenuImagePath("comb01_hover.png");
const FLASH_ACTION_MENU_TAB_BG_SELECTED = flashResolveActionMenuImagePath("comb01_selected.png");
const FLASH_ACTION_MENU_ITEM_BG_DEFAULT = flashResolveActionMenuImagePath("comb02_std.png");
const FLASH_ACTION_MENU_ITEM_BG_SELECTED = flashResolveActionMenuImagePath("comb02_selected.png");
const FLASH_ACTION_MENU_FASTBUY_BG_DEFAULT = flashResolveActionMenuImagePath("comb04_std.png");
const FLASH_ACTION_MENU_FASTBUY_BG_HOVER = flashResolveActionMenuImagePath("comb04_hover.png");
const FLASH_ACTION_MENU_FASTBUY_BG_SELECTED = flashResolveActionMenuImagePath("comb04_selected.png");
const FLASH_ACTION_MENU_SLOT_WIDTH = 32;
const FLASH_ACTION_MENU_SLOT_HEIGHT = 35;

const FLASH_ACTION_MENU_CATEGORY_ALIASES = Object.freeze({
    special: "explosive",
    buy_now: "fastbuy",
    tech_icon: "tech"
});

const FLASH_ACTION_MENU_CATEGORY_ORDER = Object.freeze([ "laser", "rocket", "explosive", "cpu", "fastbuy", "tech", "ability" ]);

const FLASH_ACTION_MENU_BUTTON_BINDINGS = Object.freeze({
    3: { type: "ammo", id: 1, stockId: 1, label: "LCB-10", supported: true },
    4: { type: "ammo", id: 2, stockId: 2, label: "MCB-25", supported: true },
    5: { type: "ammo", id: 3, stockId: 3, label: "MCB-50", supported: true },
    6: { type: "ammo", id: 4, stockId: 4, label: "UCB-100", supported: true },
    7: { type: "ammo", id: 5, stockId: 5, label: "SAB-50", supported: true },
    39: { type: "ammo", id: 6, stockId: 6, label: "RSB-75", supported: true },

    11: { type: "rocket", id: 1, stockId: 9, label: "R-310", supported: true, cooldownCode: "ROK" },
    12: { type: "rocket", id: 2, stockId: 10, label: "PLT-2026", supported: true, cooldownCode: "ROK" },
    13: { type: "rocket", id: 3, stockId: 11, label: "PLT-2021", supported: true, cooldownCode: "ROK" },
    57: { type: "rocket", id: 4, stockId: 12, label: "PLT-3030", supported: true, cooldownCode: "ROK" },
    44: { type: "rocket", id: 5, stockId: 13, label: "PLD-8", supported: true, cooldownCode: "PLA" },
    72: { type: "rocket", id: 10, stockId: 18, label: "DCR-250", supported: true, code: "DCR", cooldownCode: "DCR" },
    43: { type: "rocket", id: 7, stockId: 14, label: "WIZ", supported: true, cooldownCode: "WIZ" },
    46: { type: "launcher", id: 46, label: "Rocket Launcher", supported: true, cooldownCode: "RL" },
    48: { type: "launcherRocket", id: 7, stockId: 20, label: "HSTRM-01", supported: true },
    49: { type: "launcherRocket", id: 8, stockId: 32, label: "UBR-100", supported: true },
    50: { type: "launcherRocket", id: 9, stockId: 31, label: "ECO-10", supported: true },

    15: { type: "unsupported", stockId: 20, label: "ACM-1", supported: false },
    68: { type: "unsupported", stockId: 24, label: "EMP-M01", supported: false },
    69: { type: "unsupported", stockId: 25, label: "SAB-M01", supported: false },
    70: { type: "unsupported", stockId: 26, label: "DD-M01", supported: false },
    16: { type: "explosive", code: "SMB", stockId: 16, label: "SMB-01", supported: true, cooldownCode: "SMB" },
    17: { type: "explosive", code: "ISH", stockId: 17, label: "ISH-01", supported: true, cooldownCode: "ISH" },
    45: { type: "explosive", code: "EMP", stockId: 30, label: "EMP-01", supported: true, cooldownCode: "EMP" },
    36: { type: "unsupported", stockId: 21, label: "Fireworks Small", supported: false },
    37: { type: "unsupported", stockId: 22, label: "Fireworks Medium", supported: false },
    38: { type: "unsupported", stockId: 23, label: "Fireworks Large", supported: false },
    40: { type: "unsupported", label: "Detonator", supported: false },

    41: { type: "unsupported", label: "Drone Repair", supported: false },
    24: { type: "unsupported", label: "AIM-CPU", supported: false },
    22: { type: "cpu", code: "ARL", label: "AROL-CPU", supported: true },
    21: { type: "cpu", code: "CLK", label: "CLO4K", supported: true },
    20: { type: "unsupported", label: "Jump CPU", supported: false },
    71: { type: "unsupported", label: "AJP-01", supported: false },
    23: { type: "cpu", code: "ROB", label: "Repair Bot", supported: true },
    35: { type: "cpu", code: "HM7", label: "HM7", supported: true },
    42: { type: "cpu", code: "AMB", label: "Ammo Buy", supported: true },
    47: { type: "cpu", code: "RLC", label: "RLLB-1", supported: true },
    56: { type: "cpu", code: "RKB", label: "Rocket Buy", supported: true },

    26: { type: "buy", id: "ammo_x1", label: "LCB-10", supported: true, buyPacketType: "b", buyId: 1, buyAmount: 1000, buyCurrency: "credits", buyPrice: 1000 },
    27: { type: "buy", id: "ammo_x2", label: "MCB-25", supported: true, buyPacketType: "b", buyId: 2, buyAmount: 1000, buyCurrency: "credits", buyPrice: 200000 },
    28: { type: "buy", id: "ammo_x3", label: "MCB-50", supported: true, buyPacketType: "b", buyId: 3, buyAmount: 1000, buyCurrency: "uridium", buyPrice: 1000 },
    30: { type: "buy", id: "ammo_x5", label: "SAB-50", supported: true, buyPacketType: "b", buyId: 5, buyAmount: 1000, buyCurrency: "uridium", buyPrice: 1000 },
    31: { type: "buy", id: "r_r310", label: "R-310", supported: true, buyPacketType: "r", buyId: 1, buyAmount: 100, buyCurrency: "credits", buyPrice: 1000 },
    32: { type: "buy", id: "r_plt2026", label: "PLT-2026", supported: true, buyPacketType: "r", buyId: 2, buyAmount: 100, buyCurrency: "credits", buyPrice: 5000 },
    33: { type: "buy", id: "r_plt2021", label: "PLT-2021", supported: true, buyPacketType: "r", buyId: 3, buyAmount: 100, buyCurrency: "uridium", buyPrice: 500 },
    58: { type: "buy", id: "r_plt3030", label: "PLT-3030", supported: false },

    54: { type: "tech", id: 1, code: "ELA", label: "Energy Leech", supported: true },
    51: { type: "tech", id: 2, code: "ECI", label: "Chain Impulse", supported: true },
    55: { type: "tech", id: 3, code: "RPM", label: "Precision Targeter", supported: false },
    53: { type: "tech", id: 4, code: "SBU", label: "Shield Backup", supported: true },
    59: { type: "tech", id: 5, code: "BRB", label: "Battle Repair Bot", supported: true },

    63: { type: "ability", id: "solace", label: "Nano Cluster Repairer", supported: true },
    64: { type: "ability", id: "diminisher", label: "Shield Leech", supported: true },
    65: { type: "ability", id: "spectrum", label: "Prismatic Shield", supported: true },
    66: { type: "ability", id: "sentinel", label: "Fortress", supported: true },
    67: { type: "ability", id: "venom", label: "Singularity", supported: true },
    73: { type: "ability", id: "lightning", label: "Afterburner", supported: true }
});

let flashActionMenuDefinitionCache = null;

function normalizeActionDrawerCategory(category) {
    const raw = String(category || "").trim().toLowerCase();
    if (!raw) return "laser";
    return FLASH_ACTION_MENU_CATEGORY_ALIASES[raw] || raw;
}

function flashActionMenuImage(resKey) {
    if (!resKey) return "";
    return flashResolveActionMenuImagePath(resKey);
}

function flashSplitResKey(resKey) {
    if (!resKey) return [];
    return String(resKey).split(",").map(part => String(part || "").trim()).filter(Boolean);
}

function flashPrimaryResKey(resKey) {
    const parts = flashSplitResKey(resKey);
    return parts.length ? parts[0] : "";
}

function flashLabelFromResKey(resKey) {
    const primary = flashPrimaryResKey(resKey);
    if (!primary) return "Action";
    return primary.replace(/\.png$/i, "").replace(/_/g, " ").replace(/\b\w/g, s => s.toUpperCase());
}

function flashActionMenuCategoryKey(menuButtonNode) {
    if (!menuButtonNode) return "laser";
    const resKey = flashPrimaryResKey(menuButtonNode.getAttribute("resKey") || "");
    const base = resKey.replace(/\.png$/i, "");
    if (base === "fastbuy_icon") return "fastbuy";
    return normalizeActionDrawerCategory(base);
}

function flashBuildActionMenuItem(buttonNode, categoryKey, actionButtonsNode, sectionId) {
    const buttonId = parseInt(buttonNode.getAttribute("id") || "", 10);
    const binding = Number.isFinite(buttonId) ? FLASH_ACTION_MENU_BUTTON_BINDINGS[buttonId] || null : null;
    const resKeyValue = buttonNode.getAttribute("resKey") || "";
    const iconResKeys = flashSplitResKey(resKeyValue);
    const iconResKey = iconResKeys.length ? iconResKeys[0] : "";
    const item = {
        categoryKey: categoryKey,
        buttonId: buttonId,
        tagName: buttonNode.tagName,
        sectionId: sectionId || "",
        iconFrames: iconResKeys.map(flashActionMenuImage),
        iconPath: iconResKey ? flashActionMenuImage(iconResKey) : "",
        resKey: resKeyValue,
        label: binding && binding.label ? binding.label : flashLabelFromResKey(buttonNode.getAttribute("resKey") || ""),
        languageKey: buttonNode.getAttribute("languageKey") || "",
        alwaysExist: buttonNode.getAttribute("alwaysExist") === "true",
        counter: buttonNode.getAttribute("counter") === "true",
        cooldown: buttonNode.getAttribute("cooldown") === "true",
        ammobar: buttonNode.getAttribute("ammobar") === "true",
        activeCapable: buttonNode.getAttribute("active") === "true",
        customizable: buttonNode.getAttribute("customizable") === "true",
        supported: binding ? binding.supported !== false : false,
        type: binding ? binding.type : "unsupported",
        id: binding && Object.prototype.hasOwnProperty.call(binding, "id") ? binding.id : null,
        code: binding && binding.code ? binding.code : "",
        stockId: binding && binding.stockId ? binding.stockId : null,
        cooldownCode: binding && binding.cooldownCode ? binding.cooldownCode : (binding && binding.code ? binding.code : ""),
        buyPacketType: binding && binding.buyPacketType ? binding.buyPacketType : "",
        buyId: binding && Object.prototype.hasOwnProperty.call(binding, "buyId") ? binding.buyId : null,
        buyAmount: binding && Object.prototype.hasOwnProperty.call(binding, "buyAmount") ? binding.buyAmount : null,
        buyCurrency: binding && binding.buyCurrency ? binding.buyCurrency : "",
        buyPrice: binding && Object.prototype.hasOwnProperty.call(binding, "buyPrice") ? binding.buyPrice : null
    };
    if (actionButtonsNode) {
        item.bgDefault = flashActionMenuImage(actionButtonsNode.getAttribute("stdIcon") || "comb02_std.png");
        item.bgHover = flashActionMenuImage(actionButtonsNode.getAttribute("hoverIcon") || "comb02_hover.png");
        item.bgSelected = flashActionMenuImage(actionButtonsNode.getAttribute("selectedIcon") || "comb02_selected.png");
    } else {
        item.bgDefault = FLASH_ACTION_MENU_ITEM_BG_DEFAULT;
        item.bgHover = FLASH_ACTION_MENU_IMAGE_BASE + "comb02_hover.png";
        item.bgSelected = FLASH_ACTION_MENU_ITEM_BG_SELECTED;
    }
    return item;
}

function flashGetActionMenuDefinition() {
    if (flashActionMenuDefinitionCache) return flashActionMenuDefinitionCache;
    const xmlDoc = window._gameXmlDoc || null;
    if (!xmlDoc) {
        throw new Error("[ActionMenu] game.xml must be loaded before creating the Flash action menu.");
    }
    const parsed = flashBuildActionMenuDefinitionFromXml(xmlDoc);
    if (!parsed) {
        throw new Error("[ActionMenu] menu definition is missing from game.xml.");
    }
    flashActionMenuDefinitionCache = parsed;
    return parsed;
}

function flashGetActionDrawerCategories() {
    return flashGetActionMenuDefinition().categories || [];
}

function flashGetActionDrawerItems(categoryKey) {
    const key = normalizeActionDrawerCategory(categoryKey);
    const items = flashGetActionMenuDefinition().itemsByCategory[key];
    return Array.isArray(items) ? items.slice() : [];
}

function flashGetVisibleActionDrawerItems(categoryKey) {
    return flashGetActionDrawerItems(categoryKey).filter(flashIsActionItemVisible);
}

const FLASH_ACTION_MENU_V2_AMMOBAR_LEFT = 3;
const FLASH_ACTION_MENU_V2_AMMOBAR_TOP = 9;
const FLASH_ACTION_MENU_V2_AMMOBAR_WIDTH = 29;
const FLASH_ACTION_MENU_V2_AMMOBAR_HEIGHT = 6;
const FLASH_ACTION_MENU_V2_QTY_TOP = 9;
const FLASH_ACTION_MENU_V2_ALLOWED_IDS = Object.freeze({
    laser: [ 3, 4, 5, 6, 7, 39 ],
    rocket: [ 11, 12, 13, 72, 46, 48, 49, 50 ],
    explosive: [ 16, 17, 45 ],
    cpu: [ 22, 21, 23, 42, 47, 56 ],
    fastbuy: [ 26, 27, 28, 30, 31, 32, 33 ],
    tech: [ 54, 51, 55, 53, 59 ],
    ability: [ 63, 64, 65, 66, 67, 73 ]
});
const FLASH_ACTION_MENU_V2_TAB_TITLE_MAP = Object.freeze({
    laser: "Lasers",
    rocket: "Rockets",
    explosive: "Special ammo",
    cpu: "CPUs",
    fastbuy: "Fast buy",
    tech: "Tech items",
    ability: "Special ability"
});

function flashGetActionMenuLayout(definition = null) {
    const def = definition || flashGetActionMenuDefinition();
    const slotWidth = Number(def.slotWidth);
    const slotHeight = Number(def.slotHeight);
    const gap = Number(def.gap);
    const menuSlots = Number(def.menuSlots);
    const maxVisiblePoolSlots = Number(def.maxVisiblePoolSlots);
    if (!Number.isFinite(slotWidth) || slotWidth <= 0 || !Number.isFinite(slotHeight) || slotHeight <= 0 || !Number.isFinite(gap) || gap < 0 || !Number.isFinite(menuSlots) || menuSlots <= 0 || !Number.isFinite(maxVisiblePoolSlots) || maxVisiblePoolSlots <= 0) {
        throw new Error("[ActionMenu] Invalid Flash menu layout from game.xml.");
    }
    const poolStep = slotWidth + gap;
    return {
        slotWidth,
        slotHeight,
        gap,
        menuSlots,
        maxVisiblePoolSlots,
        totalWidth: Math.round(slotWidth / 2 + slotWidth * menuSlots + gap * Math.max(0, menuSlots - 1)),
        poolStep,
        poolY: slotHeight * 2 / 3 + gap * 2,
        subActionY: slotHeight * 5 / 3,
        poolMaskWidth: maxVisiblePoolSlots * slotWidth + maxVisiblePoolSlots * gap - 1,
        scrollRightX: maxVisiblePoolSlots * poolStep - gap / 2,
        triggerBaseX: -Math.floor(poolStep / 2) + gap - 2,
        tabLeftOffset: slotWidth / 2,
        visualBgWidth: slotWidth,
        visualBgHeight: slotHeight,
        visualBgLeft: 0,
        visualBgTop: 0,
        selectedBgWidth: slotWidth + 2,
        selectedBgHeight: slotHeight + 4,
        selectedBgLeft: -1,
        selectedBgTop: -2
    };
}

window.flashGetActionMenuLayout = flashGetActionMenuLayout;
let flashActionMenuPoolScrollIndex = 0;
const FLASH_ACTION_MENU_ROCKET_LAUNCHER_BUTTON_IDS = Object.freeze([ 46, 48, 49, 50 ]);
const FLASH_ACTION_MENU_LAUNCHER_STOCK_BY_ROCKET_ID = Object.freeze({
    7: 20,
    8: 32,
    9: 31
});
const FLASH_ACTION_MENU_LAUNCHER_ICON_BY_ROCKET_ID = Object.freeze({
    7: flashActionMenuImage("hstrm01.png"),
    8: flashActionMenuImage("ubr100.png"),
    9: flashActionMenuImage("eco10.png")
});

const FLASH_ACTION_MENU_LAUNCHER_SLOT_TRACK_BY_CAPACITY = Object.freeze({
    3: flashActionMenuImage("120.png"),
    5: flashActionMenuImage("131.png")
});
const FLASH_ACTION_MENU_LAUNCHER_FILLED_DOT_BY_ROCKET_ID = Object.freeze({
    7: flashActionMenuImage("122.png"),
    8: flashActionMenuImage("124.png"),
    9: flashActionMenuImage("126.png")
});
const FLASH_ACTION_MENU_LAUNCHER_FILLED_SLOT_OFFSETS_BY_CAPACITY = Object.freeze({
    3: Object.freeze([ 9, 14, 19 ]),
    5: Object.freeze([ 4, 9, 14, 19, 24 ])
});
const FLASH_ACTION_MENU_LAUNCHER_UNLOADED_SYMBOL_EXACT = flashActionMenuImage("rocketlauncher_unloaded_symbol_exact.png");
const FLASH_ACTION_MENU_ROCKET_ICON_BY_ID = Object.freeze({
    1: flashActionMenuImage("r310.png"),
    2: flashActionMenuImage("plt2026.png"),
    3: flashActionMenuImage("plt2021.png"),
    4: flashActionMenuImage("plt3030.png"),
    5: flashActionMenuImage("pld8.png"),
    7: flashActionMenuImage("wiz.png"),
    10: flashActionMenuImage("dcr30.png")
});

function flashResolveRocketCooldownCodeById(rocketId) {
    const id = Number(rocketId);
    if (id === 10) return "DCR";
    if (id === 5) return "PLA";
    if (id === 7) return "WIZ";
    return id > 0 ? "ROK" : null;
}

function flashGetCooldownCodeForItem(item) {
    if (!item) return null;
    if (item.cooldownCode) return String(item.cooldownCode).toUpperCase();
    switch (item.type) {
      case "rocket":
        return flashResolveRocketCooldownCodeById(item.id);

      case "ammo":
        return Number(item.id) === Number(RSB_AMMO_ID) ? "RSB" : null;

      case "launcher":
        return "RL";

      case "tech":
        return String(item.code || (typeof TECH_ID_TO_CODE !== "undefined" ? TECH_ID_TO_CODE[item.id] : "") || "").toUpperCase() || null;

      case "ability":
        return flashResolveSkillCooldownCode(item.id || item.code || "") || null;

      case "explosive":
      case "cpu":
        return String(item.code || "").toUpperCase() || null;

      default:
        return null;
    }
}

const FLASH_LIGHT_ACTION_COOLDOWN_CODES = new Set(["EMP", "ISH", "SMB"]);

function flashShouldUseLightCooldownDrawerUpdate(code) {
    return FLASH_LIGHT_ACTION_COOLDOWN_CODES.has(String(code || "").toUpperCase());
}

function flashUpdateActionDrawerCooldownForCode(code, force = false) {
    const normalizedCode = String(code || "").toUpperCase();
    if (!normalizedCode || typeof document === "undefined") return false;
    const itemsRow = document.getElementById("amItemsRow");
    if (!itemsRow) return false;
    const categoryKey = normalizeActionDrawerCategory(actionDrawerCategory);
    const visibleItems = flashGetVisibleActionDrawerItems(categoryKey);
    if (!Array.isArray(visibleItems) || visibleItems.length === 0) return false;

    const existingByKey = new Map();
    Array.from(itemsRow.children).forEach(child => {
        if (child && child.classList && child.classList.contains("amItemBox")) {
            const key = child.dataset.itemKey || "";
            if (key) existingByKey.set(key, child);
        }
    });

    let updated = false;
    for (const item of visibleItems) {
        if (String(flashGetCooldownCodeForItem(item) || "").toUpperCase() !== normalizedCode) continue;
        const itemKey = flashGetActionDrawerItemDomKey(item, categoryKey);
        const div = existingByKey.get(itemKey) || null;
        if (!div) continue;
        const actionState = flashGetActionRuntimeState(item);
        const cooldownInfo = actionState && actionState.cooldown ? actionState.cooldown : flashGetActionMenuCooldownInfo(item);
        const ratio = cooldownInfo ? Math.max(0, Math.min(1, cooldownInfo.remaining / Math.max(cooldownInfo.total || cooldownInfo.remaining || 1, 1))) : 0;
        const cooldownOpacity = item.type === "tech" || item.type === "ability" ? 0.82 : 0.72;
        if (flashUpdateActionMenuCooldownOverlay(div, ratio, cooldownOpacity) || force) {
            updated = true;
        }
        const liveEnabled = actionState ? !!actionState.enabled : true;
        if (div.classList) {
            div.classList.toggle("is-disabled", !liveEnabled);
        }
        const nextCursor = flashShouldUsePointerCursor(item, liveEnabled) ? "pointer" : "default";
        if (div.style && div.style.cursor !== nextCursor) {
            div.style.cursor = nextCursor;
        }
    }
    return updated;
}

if (typeof window !== "undefined") {
    window.flashUpdateActionDrawerCooldownForCode = flashUpdateActionDrawerCooldownForCode;
}

function clearActionCooldown(code) {
    const normalizedCode = String(code || "").toUpperCase();
    if (!normalizedCode) return false;
    let changed = false;
    if (actionCooldowns[normalizedCode]) {
        delete actionCooldowns[normalizedCode];
        changed = true;
    }
    if (actionCooldowns[code]) {
        delete actionCooldowns[code];
        changed = true;
    }
    if (window.heroTechCooldownMeta && window.heroTechCooldownMeta[normalizedCode]) {
        delete window.heroTechCooldownMeta[normalizedCode];
        changed = true;
    }
    if (flashIsSkillCooldownCode(normalizedCode)) {
        flashClearSkillRuntimeCooldownState(normalizedCode);
    } else {
        flashClearTechRuntimeCooldownState(normalizedCode);
    }
    if (changed) {
        persistCooldowns();
    }
    return changed;
}

function clearActionCooldownGroup(codes) {
    if (!Array.isArray(codes)) return false;
    let changed = false;
    codes.forEach(code => {
        if (clearActionCooldown(code)) {
            changed = true;
        }
    });
    return changed;
}

function flashGetActionStockId(item) {
    if (!item || typeof item !== "object") return null;
    if (item.stockId != null) return item.stockId;
    if (item.type === "ammo") return Number(item.id) || null;
    if (item.type === "rocket") {
        const rocketId = Number(item.id);
        if (!Number.isFinite(rocketId) || rocketId <= 0) return null;
        return rocketId + 8;
    }
    if (item.type === "launcherRocket") {
        return FLASH_ACTION_MENU_LAUNCHER_STOCK_BY_ROCKET_ID[item.id] || null;
    }
    if (item.type === "explosive") {
        const code = String(item.code || "").toUpperCase();
        if (code === "SMB") return 16;
        if (code === "ISH") return 17;
        if (code === "EMP") return 30;
    }
    return null;
}

function flashGetActionStockCount(item) {
    const stockId = flashGetActionStockId(item);
    if (stockId == null || typeof ammoStock === "undefined" || ammoStock == null) return 0;
    const value = parseInt(ammoStock[stockId], 10);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function flashActionLocaleText(key, fallback = "") {
    const localized = typeof flashLocaleGetTextRaw === "function" ? String(flashLocaleGetTextRaw(key) || "") : "";
    if (localized) return localized;
    return String(fallback || "");
}

function flashGetLauncherTypeLabel() {
    const launcherType = Number(window.heroRocketLauncherType) || 0;
    if (launcherType === 2) return "HST-2";
    if (launcherType === 1) return "HST-1";
    return "HST";
}

function flashBuildLauncherTooltipBodyHtml(item) {
    const languageKey = item && item.languageKey ? item.languageKey : "ttip_rocketlauncher";
    const template = flashActionLocaleText(languageKey, "%TYPE%");
    const loadTemplate = flashActionLocaleText("ttip_rocketlauncher_loadcount", "%COUNT% %TYPE%");
    const loaded = Math.max(0, parseInt(window.heroRocketLauncherRocketsLoaded, 10) || 0);
    const launcherType = Number(window.heroRocketLauncherType) || 0;
    const selectedRocketId = flashGetLauncherSelectedRocketId();
    const selectedRocket = flashGetActionDrawerItems("rocket").find(entry => entry.type === "launcherRocket" && Number(entry.id) === Number(selectedRocketId)) || null;
    const selectedRocketLabel = selectedRocket && selectedRocket.label ? String(selectedRocket.label) : "HSTRM-01";
    if (launcherType !== 0) {
        const firstLine = template.replace(/%TYPE%/g, flashGetLauncherTypeLabel());
        const secondLine = loadTemplate.replace(/%COUNT%/g, String(loaded)).replace(/%TYPE%/g, selectedRocketLabel);
        return firstLine.split(/\r?\n/).concat(secondLine.split(/\r?\n/)).map(line => `<div>${line}</div>`).join("");
    }
    const unloadedText = flashActionLocaleText("ttip_rocketlauncher_unloaded", "Unloaded");
    const firstLine = template.replace(/%TYPE%/g, unloadedText);
    return firstLine.split(/\r?\n/).map(line => `<div>${line}</div>`).join("");
}

function flashBuildCooldownSectorPath(ratio, width = 34, height = 39) {
    const normalized = Math.max(0, Math.min(1, Number(ratio) || 0));
    if (normalized <= 0) return "";
    if (normalized >= 0.9999) {
        return `M0 0H${width}V${height}H0Z`;
    }
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.max(width, height) * 1.15;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + normalized * Math.PI * 2;
    const largeArc = normalized > 0.5 ? 1 : 0;
    const startX = cx + Math.cos(startAngle) * radius;
    const startY = cy + Math.sin(startAngle) * radius;
    const endX = cx + Math.cos(endAngle) * radius;
    const endY = cy + Math.sin(endAngle) * radius;
    return `M ${cx.toFixed(3)} ${cy.toFixed(3)} L ${startX.toFixed(3)} ${startY.toFixed(3)} A ${radius.toFixed(3)} ${radius.toFixed(3)} 0 ${largeArc} 1 ${endX.toFixed(3)} ${endY.toFixed(3)} Z`;
}

function flashBuildCooldownHexPath(width = FLASH_ACTION_MENU_SLOT_WIDTH, height = FLASH_ACTION_MENU_SLOT_HEIGHT) {
    const w = Math.max(1, Number(width) || FLASH_ACTION_MENU_SLOT_WIDTH);
    const h = Math.max(1, Number(height) || FLASH_ACTION_MENU_SLOT_HEIGHT);
    const leftX = w * (1 / 34);
    const midX = w * (17 / 34);
    const rightX = w * (33 / 34);
    const topY = h * (1 / 39);
    const upperY = h * (10 / 39);
    const lowerY = h * (29 / 39);
    const bottomY = h * (38 / 39);
    return `M ${midX.toFixed(3)} ${topY.toFixed(3)} L ${rightX.toFixed(3)} ${upperY.toFixed(3)} L ${rightX.toFixed(3)} ${lowerY.toFixed(3)} L ${midX.toFixed(3)} ${bottomY.toFixed(3)} L ${leftX.toFixed(3)} ${lowerY.toFixed(3)} L ${leftX.toFixed(3)} ${upperY.toFixed(3)} Z`;
}

function flashTraceCooldownHexPath(ctx, x, y, width, height) {
    if (!ctx) return;
    const leftX = x + width * (1 / 34);
    const midX = x + width * (17 / 34);
    const rightX = x + width * (33 / 34);
    const topY = y + height * (1 / 39);
    const upperY = y + height * (10 / 39);
    const lowerY = y + height * (29 / 39);
    const bottomY = y + height * (38 / 39);
    ctx.moveTo(midX, topY);
    ctx.lineTo(rightX, upperY);
    ctx.lineTo(rightX, lowerY);
    ctx.lineTo(midX, bottomY);
    ctx.lineTo(leftX, lowerY);
    ctx.lineTo(leftX, upperY);
}

let flashCooldownSvgIdCounter = 0;
const FLASH_ACTION_MENU_COOLDOWN_NS = "http://www.w3.org/2000/svg";
const FLASH_ACTION_MENU_COOLDOWN_HEX_PATH = flashBuildCooldownHexPath(FLASH_ACTION_MENU_SLOT_WIDTH, FLASH_ACTION_MENU_SLOT_HEIGHT);

function flashCreateActionMenuCooldownOverlay(div) {
    if (!div) return null;
    const width = FLASH_ACTION_MENU_SLOT_WIDTH;
    const height = FLASH_ACTION_MENU_SLOT_HEIGHT;
    const svgId = div.__adCooldownSvgId || `amCooldownHex${++flashCooldownSvgIdCounter}`;
    div.__adCooldownSvgId = svgId;

    const overlay = document.createElement("span");
    overlay.className = "amCooldownOverlay";
    overlay.style.display = "none";

    const svg = document.createElementNS(FLASH_ACTION_MENU_COOLDOWN_NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("class", "amCooldownSvg");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");

    const defs = document.createElementNS(FLASH_ACTION_MENU_COOLDOWN_NS, "defs");
    const clip = document.createElementNS(FLASH_ACTION_MENU_COOLDOWN_NS, "clipPath");
    clip.setAttribute("id", svgId);
    const hex = document.createElementNS(FLASH_ACTION_MENU_COOLDOWN_NS, "path");
    hex.setAttribute("d", FLASH_ACTION_MENU_COOLDOWN_HEX_PATH);
    clip.appendChild(hex);
    defs.appendChild(clip);
    svg.appendChild(defs);

    const group = document.createElementNS(FLASH_ACTION_MENU_COOLDOWN_NS, "g");
    group.setAttribute("clip-path", `url(#${svgId})`);
    const sector = document.createElementNS(FLASH_ACTION_MENU_COOLDOWN_NS, "path");
    sector.setAttribute("fill", "#000000");
    group.appendChild(sector);
    svg.appendChild(group);
    overlay.appendChild(svg);
    overlay.__adCooldownSectorPath = sector;
    div.appendChild(overlay);
    return overlay;
}

function flashUpdateActionMenuCooldownOverlay(div, ratio, opacity = 0.72) {
    if (!div) return false;
    const normalized = Math.max(0, Math.min(1, Number(ratio) || 0));
    let overlay = div.__adCooldownOverlay;
    if (!overlay || overlay.parentNode !== div) {
        overlay = div.querySelector ? div.querySelector(".amCooldownOverlay") : null;
        if (!overlay && normalized <= 0) return false;
        if (!overlay) overlay = flashCreateActionMenuCooldownOverlay(div);
        div.__adCooldownOverlay = overlay;
    }
    if (!overlay) return false;
    if (normalized <= 0) {
        if (overlay.style.display !== "none") overlay.style.display = "none";
        div.__adCooldownRatioStep = -1;
        return false;
    }

    overlay.style.display = "block";
    overlay.style.opacity = String(opacity);
    const ratioStep = Math.max(0, Math.min(240, Math.round(normalized * 240)));
    if (ratioStep === div.__adCooldownRatioStep) return false;
    div.__adCooldownRatioStep = ratioStep;
    const path = overlay.__adCooldownSectorPath || overlay.querySelector("g path");
    if (path) {
        path.setAttribute("d", flashBuildCooldownSectorPath(ratioStep / 240, FLASH_ACTION_MENU_SLOT_WIDTH, FLASH_ACTION_MENU_SLOT_HEIGHT));
    }
    return true;
}

function flashUpdateVisibleActionDrawerCooldownOverlays(nowSeconds = Date.now() / 1e3, force = false) {
    const itemsRow = document.getElementById("amItemsRow");
    if (!itemsRow) return false;

    const nowMs = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    if (!force && flashActionDrawerCooldownLastOverlayUpdateMs && nowMs - flashActionDrawerCooldownLastOverlayUpdateMs < FLASH_ACTION_DRAWER_COOLDOWN_OVERLAY_UPDATE_INTERVAL_MS) {
        return false;
    }
    flashActionDrawerCooldownLastOverlayUpdateMs = nowMs;

    const existingByKey = new Map();
    Array.from(itemsRow.children).forEach(child => {
        if (child && child.classList && child.classList.contains("amItemBox")) {
            const key = child.dataset.itemKey || "";
            if (key) existingByKey.set(key, child);
        }
    });

    let updated = false;
    const visibleItems = flashGetVisibleActionDrawerItems(actionDrawerCategory);
    visibleItems.forEach(item => {
        const itemKey = flashGetActionDrawerItemDomKey(item, actionDrawerCategory);
        const div = existingByKey.get(itemKey) || null;
        if (!div) return;
        const cooldownInfo = flashGetActionMenuCooldownInfo(item);
        if (!cooldownInfo) {
            if (div.__adCooldownOverlay) flashUpdateActionMenuCooldownOverlay(div, 0, 0.72);
            return;
        }
        const total = Math.max(cooldownInfo.total || cooldownInfo.remaining || 1, 1);
        const ratio = Math.max(0, Math.min(1, cooldownInfo.remaining / total));
        const cooldownOpacity = item.type === "tech" || item.type === "ability" ? 0.82 : 0.72;
        if (flashUpdateActionMenuCooldownOverlay(div, ratio, cooldownOpacity)) updated = true;
    });

    return updated;
}

window.flashUpdateVisibleActionDrawerCooldownOverlays = flashUpdateVisibleActionDrawerCooldownOverlays;

function flashDrawCooldownOverlayOnCanvas(ctx, x, y, width, height, ratio, alpha = 0.72) {
    const normalized = Math.max(0, Math.min(1, Number(ratio) || 0));
    if (!ctx || normalized <= 0) return;
    const drawX = Number.isFinite(x) ? x : 0;
    const drawY = Number.isFinite(y) ? y : 0;
    const drawWidth = Math.max(1, Number(width) || FLASH_ACTION_MENU_SLOT_WIDTH);
    const drawHeight = Math.max(1, Number(height) || FLASH_ACTION_MENU_SLOT_HEIGHT);
    const centerX = drawX + drawWidth / 2;
    const centerY = drawY + drawHeight / 2;
    const radius = Math.max(drawWidth, drawHeight) * 1.15;
    ctx.save();
    ctx.beginPath();
    flashTraceCooldownHexPath(ctx, drawX, drawY, drawWidth, drawHeight);
    ctx.closePath();
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + normalized * Math.PI * 2, false);
    ctx.closePath();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#000000";
    ctx.fill();
    ctx.restore();
}

window.flashGetCooldownCodeForItem = flashGetCooldownCodeForItem;
window.flashDrawCooldownOverlayOnCanvas = flashDrawCooldownOverlayOnCanvas;
window.clearActionCooldown = clearActionCooldown;
window.clearActionCooldownGroup = clearActionCooldownGroup;

function flashGetFastbuyConfig(item) {
    if (!item || item.type !== "buy") return null;
    const packetType = String(item.buyPacketType || "").toLowerCase();
    const protocolId = Number(item.buyId);
    const amount = Number(item.buyAmount);
    const price = Number(item.buyPrice);
    const rawCurrency = String(item.buyCurrency || "").toLowerCase();
    const currency = rawCurrency === "uridium" ? "uridium" : rawCurrency === "credits" ? "credits" : "";
    if ((packetType !== "b" && packetType !== "r") || !Number.isFinite(protocolId) || protocolId <= 0 || !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(price) || price < 0 || !currency) {
        return null;
    }
    return {
        packetType: packetType,
        protocolId: protocolId,
        amount: amount,
        price: price,
        currency: currency
    };
}

function flashGetFastbuyWalletAmount(currency) {
    if (currency === "credits") {
        const credits = Number(typeof heroCredits !== "undefined" ? heroCredits : NaN);
        return Number.isFinite(credits) ? credits : null;
    }
    if (currency === "uridium") {
        const uridium = Number(typeof heroUridium !== "undefined" ? heroUridium : NaN);
        return Number.isFinite(uridium) ? uridium : null;
    }
    return null;
}

function flashGetFastbuyCurrencyLabel(currency) {
    return currency === "uridium" ? "Uridium" : "Credits";
}

function flashCanAffordFastbuy(item) {
    const cfg = flashGetFastbuyConfig(item);
    if (!cfg) return false;
    const wallet = flashGetFastbuyWalletAmount(cfg.currency);
    if (wallet == null) return true;
    return wallet >= cfg.price;
}

function flashFormatFastbuyPrice(item) {
    const cfg = flashGetFastbuyConfig(item);
    if (!cfg) return "";
    return `${cfg.price.toLocaleString()} ${flashGetFastbuyCurrencyLabel(cfg.currency)}`;
}

const FLASH_ACTION_MENU_FASTBUY_SELECTION_MAP = Object.freeze({
    26: { icon: 1, currencyFrame: 1 },
    27: { icon: 2, currencyFrame: 1 },
    28: { icon: 3, currencyFrame: 0 },
    30: { icon: 5, currencyFrame: 0 },
    31: { icon: 6, currencyFrame: 1 },
    32: { icon: 7, currencyFrame: 1 },
    33: { icon: 8, currencyFrame: 0 }
});
const flashActionMenuSelectedButtonIds = Object.create(null);

function flashGetSelectedActionButtonId(categoryId) {
    const key = normalizeActionDrawerCategory(categoryId || actionDrawerCategory);
    return flashActionMenuSelectedButtonIds[key] || null;
}

function flashSetSelectedActionButtonId(categoryId, buttonId) {
    const key = normalizeActionDrawerCategory(categoryId || actionDrawerCategory);
    if (!buttonId) {
        delete flashActionMenuSelectedButtonIds[key];
        return;
    }
    flashActionMenuSelectedButtonIds[key] = buttonId;
}

function flashGetLauncherSelectedRocketId() {
    const rocketId = Number(window.heroSelectedLauncherRocket);
    return rocketId === 8 || rocketId === 9 ? rocketId : 7;
}

function flashGetLauncherCapacity() {
    const launcherType = Number(window.heroRocketLauncherType) || 0;
    if (launcherType === 1) return 3;
    if (launcherType === 2) return 5;
    return 0;
}

function flashShouldUsePointerCursor(item, isEnabled) {
    if (!item) return !!isEnabled;
    if (item.type === "launcher" || item.type === "launcherRocket") {
        return true;
    }
    return !!isEnabled;
}

function flashBuildLauncherButtonVisualHtml() {
    const launcherRocketId = flashGetLauncherSelectedRocketId();
    const launcherCapacity = flashGetLauncherCapacity();
    const launcherLoaded = Math.max(0, parseInt(window.heroRocketLauncherRocketsLoaded, 10) || 0);
    const selectedRocketPath = FLASH_ACTION_MENU_LAUNCHER_ICON_BY_ROCKET_ID[launcherRocketId] || FLASH_ACTION_MENU_LAUNCHER_ICON_BY_ROCKET_ID[7];
    const trackPath = FLASH_ACTION_MENU_LAUNCHER_SLOT_TRACK_BY_CAPACITY[launcherCapacity] || "";
    const filledDotPath = FLASH_ACTION_MENU_LAUNCHER_FILLED_DOT_BY_ROCKET_ID[launcherRocketId] || FLASH_ACTION_MENU_LAUNCHER_FILLED_DOT_BY_ROCKET_ID[7];
    const slotOffsets = FLASH_ACTION_MENU_LAUNCHER_FILLED_SLOT_OFFSETS_BY_CAPACITY[launcherCapacity] || [];
    const filledCount = Math.max(0, Math.min(launcherLoaded, slotOffsets.length));
    if (launcherCapacity <= 0) {
        return `<img src="${typeof resolveUiImageUrl === "function" ? (resolveUiImageUrl(FLASH_ACTION_MENU_LAUNCHER_UNLOADED_SYMBOL_EXACT) || FLASH_ACTION_MENU_LAUNCHER_UNLOADED_SYMBOL_EXACT) : FLASH_ACTION_MENU_LAUNCHER_UNLOADED_SYMBOL_EXACT}" class="amLauncherSelectedRocket" alt="">`;
    }
    const filledSlotsHtml = slotOffsets.map((left, slotIndex) => slotIndex < filledCount ? `<img src="${typeof resolveUiImageUrl === "function" ? (resolveUiImageUrl(filledDotPath) || filledDotPath) : filledDotPath}" class="amLauncherFilledDot" style="left:${left}px;top:15px;" alt="">` : "").join("");
    const slotsHtml = trackPath ? `<img src="${typeof resolveUiImageUrl === "function" ? (resolveUiImageUrl(trackPath) || trackPath) : trackPath}" class="amLauncherSlots amLauncherSlots-${launcherCapacity}" alt="">` : "";
    return `<img src="${typeof resolveUiImageUrl === "function" ? (resolveUiImageUrl(selectedRocketPath) || selectedRocketPath) : selectedRocketPath}" class="amLauncherSelectedRocket" alt="">${slotsHtml}${filledSlotsHtml}`;
}

function flashGetActionCpuInfo(code) {
    const normalized = String(code || "").toUpperCase();
    if (normalized === "HM7") {
        const data = cpuItems && cpuItems.HM7 ? cpuItems.HM7 : { hasItem: false, amount: 0, level: 1, state: false };
        return {
            hasItem: !!data.hasItem,
            amount: parseInt(data.amount, 10) || 0,
            level: parseInt(data.level, 10) || 1,
            state: !!data.state
        };
    }
    if (normalized === "ARL") {
        const data = cpuItems && cpuItems.ARL ? cpuItems.ARL : { hasItem: null, amount: 0, level: 1, state: false };
        return {
            hasItem: typeof window.heroHasAutoRocketCpu === "boolean" ? window.heroHasAutoRocketCpu : data.hasItem !== false,
            amount: parseInt(data.amount, 10) || 0,
            level: parseInt(data.level, 10) || 1,
            state: window.heroAutoRocketSkill === 1
        };
    }
    if (normalized === "CLK") {
        const data = cpuItems && cpuItems.CLK ? cpuItems.CLK : { hasItem: null, amount: 0, level: 1, state: false };
        const charge = Number.isFinite(window.heroCloakCpuCharge) ? Math.max(0, parseInt(window.heroCloakCpuCharge, 10) || 0) : parseInt(data.amount, 10) || 0;
        return {
            hasItem: data.hasItem !== false,
            amount: charge,
            level: parseInt(data.level, 10) || 1,
            state: charge > 0 && !!heroCloaked
        };
    }
    if (normalized === "AMB") {
        const data = cpuItems && cpuItems.AMB ? cpuItems.AMB : { hasItem: false, amount: 0, level: 1, state: false };
        return {
            hasItem: !!data.hasItem,
            amount: parseInt(data.amount, 10) || 0,
            level: Math.max(1, parseInt(data.level, 10) || 1),
            state: !!data.state
        };
    }
    if (normalized === "RKB") {
        const data = cpuItems && cpuItems.RKB ? cpuItems.RKB : { hasItem: false, amount: 0, level: 1, state: false };
        return {
            hasItem: !!data.hasItem,
            amount: parseInt(data.amount, 10) || 0,
            level: Math.max(1, parseInt(data.level, 10) || 1),
            state: !!data.state
        };
    }
    if (normalized === "RLC") {
        const data = cpuItems && cpuItems.RLC ? cpuItems.RLC : { hasItem: false, amount: 0, level: 1, state: false };
        return {
            hasItem: !!data.hasItem,
            amount: parseInt(data.amount, 10) || 0,
            level: Math.max(1, parseInt(data.level, 10) || 1),
            state: !!data.state || window.heroRocketLauncherAutoCpuState === 1
        };
    }
    if (normalized === "ROB") {
        const data = cpuItems && cpuItems.ROB ? cpuItems.ROB : { hasItem: null, amount: 0, level: 1, state: false };
        return {
            hasItem: data.hasItem !== false,
            amount: parseInt(data.amount, 10) || 0,
            level: Math.max(1, parseInt(data.level, 10) || 1),
            state: !!data.state || !!heroRepairing
        };
    }
    return null;
}

function flashHasExplosiveCpuAccess(code) {
    const normalized = String(code || "").toUpperCase();
    if (normalized !== "SMB" && normalized !== "ISH") {
        return true;
    }
    const data = cpuItems && cpuItems[normalized] ? cpuItems[normalized] : null;
    if (!data || data.hasItem == null) {
        return true;
    }
    return data.hasItem !== false;
}

function flashResolveRocketBuyRocketId() {
    const info = flashGetActionCpuInfo("RKB");
    const level = info ? Number(info.level) : NaN;
    if (Number.isFinite(level) && FLASH_ACTION_MENU_ROCKET_ICON_BY_ID[level]) {
        return level;
    }
    return Number(currentRocketId) || 1;
}

function flashResolveFastbuySelectionMeta(selectedItem) {
    const explicit = selectedItem && selectedItem.buttonId ? FLASH_ACTION_MENU_FASTBUY_SELECTION_MAP[selectedItem.buttonId] || null : null;
    if (explicit) {
        window.heroSelectedQuickBuyIcon = explicit.icon;
        return explicit;
    }
    const iconId = Number(window.heroSelectedQuickBuyIcon) || 1;
    const found = Object.values(FLASH_ACTION_MENU_FASTBUY_SELECTION_MAP).find(entry => entry.icon === iconId);
    return found || FLASH_ACTION_MENU_FASTBUY_SELECTION_MAP[26];
}

function flashResolveActionItemIconPath(item, selectedItem) {
    if (!item) return "";
    if (item.buttonId === 46) {
        return FLASH_ACTION_MENU_LAUNCHER_UNLOADED_SYMBOL_EXACT;
    }
    if (item.buttonId === 56) {
        return FLASH_ACTION_MENU_ROCKET_ICON_BY_ID[flashResolveRocketBuyRocketId()] || flashActionMenuImage("rocket.png");
    }
    if (item.buttonId === 25 && Array.isArray(item.iconFrames) && item.iconFrames.length > 1) {
        const meta = flashResolveFastbuySelectionMeta(selectedItem);
        const frameIndex = meta && meta.currencyFrame === 0 ? 0 : 1;
        return item.iconFrames[Math.max(0, Math.min(item.iconFrames.length - 1, frameIndex))] || item.iconFrames[0] || item.iconPath || "";
    }
    if (item.buttonId === 42 && Array.isArray(item.iconFrames) && item.iconFrames.length > 0) {
        const info = flashGetActionCpuInfo("AMB");
        const level = info ? Math.max(1, Math.min(item.iconFrames.length, parseInt(info.level, 10) || 1)) : 1;
        return item.iconFrames[level - 1] || item.iconFrames[0] || item.iconPath || "";
    }
    if (item.buttonId === 23 && Array.isArray(item.iconFrames) && item.iconFrames.length > 0) {
        const info = flashGetActionCpuInfo("ROB");
        const frameCount = Math.min(4, item.iconFrames.length);
        const level = info ? Math.max(1, Math.min(frameCount, parseInt(info.level, 10) || 1)) : 1;
        if (info && info.state && item.iconFrames.length > frameCount) {
            return item.iconFrames[item.iconFrames.length - 1] || item.iconFrames[frameCount - 1] || item.iconPath || "";
        }
        return item.iconFrames[level - 1] || item.iconFrames[0] || item.iconPath || "";
    }
    if (Array.isArray(item.iconFrames) && item.iconFrames.length > 0) {
        return item.iconFrames[0] || item.iconPath || "";
    }
    return item.iconPath || getQuickbarIconPath(item) || "";
}

function flashGetActionMenuCooldownInfo(item) {
    if (!item) return null;
    const cooldownCode = flashGetCooldownCodeForItem(item);
    if (!cooldownCode || typeof getCooldownInfo !== "function") return null;
    return getCooldownInfo(cooldownCode);
}

function flashGetActionRuntimeState(item, cpuInfo) {
    const result = {
        enabled: !!item && item.supported !== false,
        active: false,
        cooling: false,
        disabledAlpha: item && (item.categoryKey === "tech" || item.categoryKey === "ability") ? 0.8 : 0.5,
        cooldown: null
    };
    if (!item) return result;
    result.cooldown = flashGetActionMenuCooldownInfo(item);
    result.cooling = !!result.cooldown;
    if (item.type === "tech") {
        const techCode = String(item.code || (typeof TECH_ID_TO_CODE !== "undefined" ? TECH_ID_TO_CODE[item.id] : "") || "").toUpperCase();
        const state = techCode && window.heroTechRuntimeState ? window.heroTechRuntimeState[techCode] || null : null;
        const nowSeconds = Date.now() / 1e3;
        if (state) {
            flashNormalizeTechRuntimeReadyState(techCode);
        }
        let flashStatus = state && Number.isFinite(Number(state.flashStatus)) ? Number(state.flashStatus) : null;
        const activeUntil = state ? Number(state.activeUntil) || 0 : 0;
        if (state && state.active && (!activeUntil || activeUntil > nowSeconds)) {
            result.active = true;
        } else if (flashStatus === 2 && (!activeUntil || activeUntil > nowSeconds)) {
            result.active = true;
        } else if (state && (state.active || flashStatus === 2) && activeUntil && activeUntil <= nowSeconds) {
            state.active = false;
            state.activeUntil = 0;
            flashNormalizeTechRuntimeReadyState(techCode);
            flashStatus = Number.isFinite(Number(state.flashStatus)) ? Number(state.flashStatus) : flashStatus;
        } else if (state && state.active && !activeUntil && flashStatus !== 2) {
            state.active = false;
        }
        if (flashStatus === 0 || flashStatus === 3) {
            result.enabled = false;
        }
        if (state && state.available === false) {
            result.enabled = false;
        }
        const fallbackRemaining = state ? Math.max(Number(state.cooldownRemaining) || 0, 0) : 0;
        if (!result.cooling && fallbackRemaining > 0) {
            result.cooling = true;
        } else if (state && fallbackRemaining <= 0 && !result.cooldown) {
            flashClearTechRuntimeCooldownState(techCode);
            flashNormalizeTechRuntimeReadyState(techCode);
            flashStatus = Number.isFinite(Number(state.flashStatus)) ? Number(state.flashStatus) : flashStatus;
            if (flashStatus !== 0 && flashStatus !== 3 && state.available !== false) {
                result.enabled = true;
            }
        }
        if (result.active || result.cooling) {
            result.enabled = false;
        }
        return result;
    }
    if (item.type === "ability") {
        const abilityId = flashResolveSkillAbilityId(item.id || item.code || "");
        const state = abilityId && window.heroSkillRuntimeState ? window.heroSkillRuntimeState[abilityId] || null : null;
        if (state && typeof flashNormalizeSkillRuntimeReadyState === "function") {
            flashNormalizeSkillRuntimeReadyState(abilityId);
        }
        const flashStatus = state && Number.isFinite(Number(state.flashStatus)) ? Number(state.flashStatus) : null;
        if (state && (state.active || flashStatus === FLASH_SKILL_ACTIVE_STATE)) {
            result.active = true;
        }
        if (!result.cooling && state && (state.cooling || Math.max(Number(state.cooldownRemaining) || 0, 0) > 0 || flashStatus === FLASH_SKILL_COOLING_STATE)) {
            result.cooling = true;
        }
        if (state && state.equipped === false) {
            result.enabled = false;
        }
        if (flashStatus === 0 || (state && state.available === false && !result.active)) {
            result.enabled = false;
        }
        if (result.active || result.cooling) {
            result.enabled = false;
        }
        return result;
    }
    if (item.type === "explosive") {
        result.enabled = flashGetActionStockCount(item) > 0;
        if (!flashHasExplosiveCpuAccess(item.code || "")) {
            result.enabled = false;
        }
        if (result.cooling) {
            result.enabled = false;
        }
        return result;
    }
    if (item.type === "cpu") {
        const info = cpuInfo || flashGetActionCpuInfo(item.code || "");
        if (info && info.hasItem === false) {
            result.enabled = false;
        }
        if (item.code === "CLK" && heroCloaked) {
            result.active = true;
            result.enabled = false;
        } else if (item.code === "ROB" && info && !!info.state) {
            result.active = true;
            result.enabled = false;
        } else if ((item.code === "ARL" || item.code === "AMB" || item.code === "RKB" || item.code === "RLC") && info && !!info.state) {
            result.active = true;
        }
        if (result.cooling) {
            result.enabled = false;
        }
        return result;
    }
    if (item.type === "buy") {
        result.enabled = flashCanAffordFastbuy(item);
        return result;
    }
    if (item.type === "launcher") {
        result.enabled = !result.cooling;
        return result;
    }
    if (item.type === "launcherRocket") {
        result.enabled = true;
        return result;
    }
    if (item.type === "rocket") {
        result.enabled = flashGetActionStockCount(item) > 0;
    }
    if (result.cooling) {
        result.enabled = false;
    }
    return result;
}

function flashGetTriggerSourceItem(items, categoryId, selectedItem) {
    const categoryKey = normalizeActionDrawerCategory(categoryId || actionDrawerCategory);
    if (categoryKey === "rocket") {
        if (selectedItem && (selectedItem.type === "launcher" || selectedItem.type === "launcherRocket")) {
            return Array.isArray(items) ? items.find(item => item.type === "launcher" && Number(item.buttonId) === 46) || selectedItem : selectedItem;
        }
        const currentRocketItem = Array.isArray(items) ? items.find(item => item.type === "rocket" && Number(item.id) === Number(currentRocketId)) : null;
        return currentRocketItem || selectedItem || null;
    }
    return selectedItem || null;
}

function flashGetTriggerReferenceIndex(items, categoryId) {
    if (!Array.isArray(items) || items.length === 0) return -1;
    const key = normalizeActionDrawerCategory(categoryId || actionDrawerCategory);
    if (key !== "rocket") return actionDrawerSelectedIndex;
    const selectedItem = items[actionDrawerSelectedIndex] || null;
    if (!selectedItem || (selectedItem.type !== "launcher" && selectedItem.type !== "launcherRocket")) {
        return actionDrawerSelectedIndex;
    }
    const launcherIdx = items.findIndex(item => item.type === "launcher" && Number(item.buttonId) === 46);
    return launcherIdx >= 0 ? launcherIdx : actionDrawerSelectedIndex;
}

function flashActionMenuApplyUserPreferences(category) {
    if (!category) return category;
    const allowed = FLASH_ACTION_MENU_V2_ALLOWED_IDS[category.id] || null;
    if (Array.isArray(allowed)) {
        category.items = category.items.filter(item => allowed.includes(item.buttonId));
    }
    return category;
}

function flashActionMenuNormalizeAbilityItem(item) {
    if (!item) return item;
    if (item.buttonId === 63) {
        item.id = "solace";
        item.type = "ability";
        item.supported = true;
    } else if (item.buttonId === 64) {
        item.id = "diminisher";
        item.type = "ability";
        item.supported = true;
    } else if (item.buttonId === 65) {
        item.id = "spectrum";
        item.type = "ability";
        item.supported = true;
    } else if (item.buttonId === 66) {
        item.id = "sentinel";
        item.type = "ability";
        item.supported = true;
    } else if (item.buttonId === 67) {
        item.id = "venom";
        item.type = "ability";
        item.supported = true;
    } else if (item.buttonId === 73) {
        item.id = "lightning";
        item.type = "ability";
        item.label = "Afterburner";
        item.iconPath = flashActionMenuImage("skill_ship_lightning.png");
        item.supported = true;
    }
    return item;
}

function flashActionMenuNormalizeSpecialItem(item) {
    if (!item) return item;
    if (item.buttonId === 46) {
        item.iconPath = FLASH_ACTION_MENU_LAUNCHER_UNLOADED_SYMBOL_EXACT;
        item.label = "Rocket Launcher";
        item.supported = true;
        item.type = "launcher";
        item.cooldownCode = "RL";
    } else if (item.buttonId === 48) {
        item.label = "HSTRM-01";
        item.iconPath = flashActionMenuImage("hstrm01.png");
        item.supported = true;
        item.type = "launcherRocket";
        item.id = 7;
        item.stockId = 20;
    } else if (item.buttonId === 49) {
        item.label = "UBR-100";
        item.iconPath = flashActionMenuImage("ubr100.png");
        item.supported = true;
        item.type = "launcherRocket";
        item.id = 8;
        item.stockId = 32;
    } else if (item.buttonId === 50) {
        item.label = "ECO-10";
        item.iconPath = flashActionMenuImage("eco10.png");
        item.supported = true;
        item.type = "launcherRocket";
        item.id = 9;
        item.stockId = 31;
    } else if (item.buttonId === 16) {
        item.label = "SMB-01";
        item.supported = true;
        item.type = "explosive";
        item.code = "SMB";
        item.stockId = 16;
        item.cooldownCode = "SMB";
    } else if (item.buttonId === 17) {
        item.label = "ISH-01";
        item.supported = true;
        item.type = "explosive";
        item.code = "ISH";
        item.stockId = 17;
        item.cooldownCode = "ISH";
    } else if (item.buttonId === 45) {
        item.label = "EMP-01";
        item.supported = true;
        item.type = "explosive";
        item.code = "EMP";
        item.stockId = 30;
        item.cooldownCode = "EMP";
    } else if (item.buttonId === 42) {
        item.label = "Ammo Buy";
        item.supported = true;
        item.type = "cpu";
        item.code = "AMB";
    } else if (item.buttonId === 56) {
        item.label = "Rocket Buy";
        item.supported = true;
        item.type = "cpu";
        item.code = "RKB";
        item.iconPath = FLASH_ACTION_MENU_ROCKET_ICON_BY_ID[flashResolveRocketBuyRocketId()] || flashActionMenuImage("rocket.png");
    } else if (item.buttonId === 47) {
        item.label = "RLLB-1";
        item.supported = true;
        item.type = "cpu";
        item.code = "RLC";
        item.iconPath = flashActionMenuImage("rllb1.png");
    } else if (item.buttonId === 54) {
        item.label = "Energy Leech";
        item.supported = true;
    } else if (item.buttonId === 51) {
        item.label = "Chain Impulse";
        item.supported = true;
    } else if (item.buttonId === 55) {
        item.label = "Precision Targeter";
        item.supported = true;
    } else if (item.buttonId === 53) {
        item.label = "Shield Backup";
        item.supported = true;
    } else if (item.buttonId === 59) {
        item.label = "Battle Repair Bot";
        item.supported = true;
    }
    return flashActionMenuNormalizeAbilityItem(item);
}

function flashReadRequiredMenuInt(menuNode, attrName, options = {}) {
    const rawValue = menuNode ? menuNode.getAttribute(attrName) : "";
    const value = parseInt(rawValue || "", 10);
    const allowZero = options.allowZero === true;
    const valid = Number.isFinite(value) && (allowZero ? value >= 0 : value > 0);
    if (!valid) {
        throw new Error(`[ActionMenu] Missing or invalid menu @${attrName} in game.xml.`);
    }
    return value;
}

function flashBuildActionMenuDefinitionFromXml(xmlDoc) {
    const menuNode = xmlDoc && xmlDoc.querySelector ? xmlDoc.querySelector("menu") : null;
    if (!menuNode) return null;
    const menuButtonsNode = menuNode.querySelector("menuButtons");
    if (!menuButtonsNode) return null;
    const def = {
        slotWidth: FLASH_ACTION_MENU_SLOT_WIDTH,
        slotHeight: FLASH_ACTION_MENU_SLOT_HEIGHT,
        gap: flashReadRequiredMenuInt(menuNode, "gap", { allowZero: true }),
        actionSlots: flashReadRequiredMenuInt(menuNode, "actionSlots"),
        menuSlots: flashReadRequiredMenuInt(menuNode, "menuSlots"),
        maxVisiblePoolSlots: flashReadRequiredMenuInt(menuNode, "maxVisiblePoolSlots"),
        poolSlots: flashReadRequiredMenuInt(menuNode, "poolSlots"),
        categories: [],
        itemsByCategory: Object.create(null)
    };
    menuButtonsNode.querySelectorAll(":scope > menuButton").forEach(menuButtonNode => {
        const categoryKey = flashActionMenuCategoryKey(menuButtonNode);
        const actionButtonsNode = menuButtonNode.querySelector(":scope > actionButtons");
        const category = {
            id: categoryKey,
            menuButtonId: parseInt(menuButtonNode.getAttribute("id") || "", 10) || 0,
            title: FLASH_ACTION_MENU_V2_TAB_TITLE_MAP[categoryKey] || flashLabelFromResKey(menuButtonNode.getAttribute("resKey") || categoryKey),
            iconPath: flashActionMenuImage(flashPrimaryResKey(menuButtonNode.getAttribute("resKey") || "")),
            stdBg: flashActionMenuImage(menuButtonsNode.getAttribute("stdIcon") || "comb01_std.png"),
            hoverBg: flashActionMenuImage(menuButtonsNode.getAttribute("hoverIcon") || "comb01_hover.png"),
            selectedBg: flashActionMenuImage(menuButtonsNode.getAttribute("selectedIcon") || "comb01_selected.png"),
            hasSubAction: menuButtonNode.getAttribute("subAction") === "true",
            activateButtons: [],
            items: []
        };
        if (actionButtonsNode) {
            actionButtonsNode.childNodes.forEach(child => {
                if (!child || child.nodeType !== 1) return;
                if (child.tagName === "activateButton") {
                    const activateItem = flashActionMenuNormalizeSpecialItem(flashBuildActionMenuItem(child, categoryKey, actionButtonsNode, ""));
                    category.activateButtons.push(activateItem);
                    return;
                }
                if (child.tagName === "actionButton") {
                    category.items.push(flashActionMenuNormalizeSpecialItem(flashBuildActionMenuItem(child, categoryKey, actionButtonsNode, "")));
                    return;
                }
                if (child.tagName === "section") {
                    const sectionId = child.getAttribute("id") || "";
                    child.querySelectorAll(":scope > actionButton").forEach(sectionButton => {
                        category.items.push(flashActionMenuNormalizeSpecialItem(flashBuildActionMenuItem(sectionButton, categoryKey, actionButtonsNode, sectionId)));
                    });
                }
            });
        }
        flashActionMenuApplyUserPreferences(category);
        def.categories.push(category);
        def.itemsByCategory[category.id] = category.items.slice();
    });
    def.categories.sort((a, b) => {
        const aIndex = FLASH_ACTION_MENU_CATEGORY_ORDER.indexOf(a.id);
        const bIndex = FLASH_ACTION_MENU_CATEGORY_ORDER.indexOf(b.id);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
    return def;
}

function flashIsActionItemVisible(item) {
    if (!item) return false;
    if (item.categoryKey === "tech") {
        const techCode = String(item.code || (typeof TECH_ID_TO_CODE !== "undefined" ? TECH_ID_TO_CODE[item.id] : "") || "").toUpperCase();
        if (techCode === "RPM") return false;
    }
    if (item.categoryKey === "ability") {
        const skillMap = window.heroSkillAvailability && typeof window.heroSkillAvailability === "object" ? window.heroSkillAvailability : null;
        const abilityId = flashResolveSkillAbilityId(item.id || item.code || "");
        const runtimeState = abilityId && window.heroSkillRuntimeState ? window.heroSkillRuntimeState[abilityId] || null : null;
        if (!abilityId) return false;
        if (skillMap && Object.prototype.hasOwnProperty.call(skillMap, abilityId)) {
            return !!skillMap[abilityId];
        }
        if (runtimeState && typeof runtimeState.equipped !== "undefined") {
            return runtimeState.equipped === true;
        }
        return false;
    }
    if (item.categoryKey === "cpu") {
        const info = flashGetActionCpuInfo(item.code || "");
        if (item.code === "HM7") return !!(info && info.hasItem);
        if (item.code === "AMB" || item.code === "RKB" || item.code === "RLC") {
            return !!(info && info.hasItem);
        }
        if (item.code === "ARL" || item.code === "CLK" || item.code === "ROB") {
            return !info || info.hasItem !== false;
        }
        return item.supported !== false;
    }
    return true;
}

function flashSyncSelectedIndex(items, categoryId) {
    if (!Array.isArray(items) || !items.length) {
        actionDrawerSelectedIndex = 0;
        return;
    }
    const key = normalizeActionDrawerCategory(categoryId || actionDrawerCategory);
    const storedButtonId = flashGetSelectedActionButtonId(key);
    if (key === "laser") {
        const idx = items.findIndex(item => item.type === "ammo" && Number(item.id) === Number(currentAmmoId));
        if (idx >= 0) {
            actionDrawerSelectedIndex = idx;
            flashSetSelectedActionButtonId(key, items[idx].buttonId);
            return;
        }
    } else if (key === "rocket") {
        if (storedButtonId && FLASH_ACTION_MENU_ROCKET_LAUNCHER_BUTTON_IDS.includes(storedButtonId)) {
            const launcherIdx = items.findIndex(item => Number(item.buttonId) === Number(storedButtonId));
            if (launcherIdx >= 0) {
                actionDrawerSelectedIndex = launcherIdx;
                return;
            }
        }
        const idx = items.findIndex(item => item.type === "rocket" && Number(item.id) === Number(currentRocketId));
        if (idx >= 0) {
            actionDrawerSelectedIndex = idx;
            flashSetSelectedActionButtonId(key, items[idx].buttonId);
            return;
        }
    } else if (storedButtonId) {
        const storedIdx = items.findIndex(item => Number(item.buttonId) === Number(storedButtonId));
        if (storedIdx >= 0) {
            actionDrawerSelectedIndex = storedIdx;
            return;
        }
    }
    if (key === "ability" && items.length === 1) {
        actionDrawerSelectedIndex = 0;
    } else if (actionDrawerSelectedIndex >= items.length || actionDrawerSelectedIndex < 0) {
        actionDrawerSelectedIndex = 0;
    }
    const fallbackItem = items[actionDrawerSelectedIndex] || items[0] || null;
    if (fallbackItem) {
        flashSetSelectedActionButtonId(key, fallbackItem.buttonId);
    }
}

function flashGetSelectedActivateItem(category) {
    if (!category) return null;
    if (Array.isArray(category.activateButtons) && category.activateButtons.length > 0) {
        return category.activateButtons[0];
    }
    return null;
}

function flashBuildActionDrawerTabs() {
    const tabsContainer = document.getElementById("amTabs");
    if (!tabsContainer) return;
    const layout = flashGetActionMenuLayout();
    const categories = flashGetActionDrawerCategories();
    actionDrawerCategory = normalizeActionDrawerCategory(actionDrawerCategory);
    if (!categories.some(cat => cat.id === actionDrawerCategory)) {
        actionDrawerCategory = categories.length ? categories[0].id : "laser";
    }
    let tabsHtml = "";
    categories.forEach((cat, index) => {
        const active = cat.id === actionDrawerCategory;
        const left = layout.tabLeftOffset + index * layout.poolStep;
        const top = layout.visualBgTop;
        const width = layout.visualBgWidth;
        const height = layout.visualBgHeight;
        tabsHtml += `
            <div class="amTab ${active ? "active" : ""}" data-cat="${cat.id}" title="${cat.title}" style="left:${left}px;top:${top}px;width:${width}px;height:${height}px;">
                <span class="amTabSlotBg" style="background-image:${getUiCssUrl(FLASH_ACTION_MENU_SLOT_BG)}"></span>
                <span class="amTabBaseBg" style="background-image:${getUiCssUrl(cat.stdBg)}"></span>
                <span class="amTabHoverBg" style="background-image:${getUiCssUrl(cat.hoverBg)}"></span>
                <span class="amTabSelectedBg" style="background-image:${getUiCssUrl(cat.selectedBg)}"></span>
                <img src="${typeof resolveUiImageUrl === "function" ? (resolveUiImageUrl(cat.iconPath) || cat.iconPath) : cat.iconPath}" class="amTabIcon" alt="">
            </div>`;
    });
    tabsContainer.innerHTML = tabsHtml;
}

function updateActionDrawerArrowVisibility(totalItemsOverride) {
    const strip = document.getElementById("amItemsRow");
    const leftBtn = document.getElementById("amScrollLeft");
    const rightBtn = document.getElementById("amScrollRight");
    if (!strip || !leftBtn || !rightBtn) return;
    const layout = flashGetActionMenuLayout();
    const totalItems = typeof totalItemsOverride === "number" ? totalItemsOverride : flashGetVisibleActionDrawerItems(actionDrawerCategory).length;
    const maxScrollIndex = Math.max(0, totalItems - layout.maxVisiblePoolSlots);
    if (flashActionMenuPoolScrollIndex < 0) flashActionMenuPoolScrollIndex = 0;
    if (flashActionMenuPoolScrollIndex > maxScrollIndex) flashActionMenuPoolScrollIndex = maxScrollIndex;
    strip.style.left = `${-flashActionMenuPoolScrollIndex * layout.poolStep}px`;
    leftBtn.style.visibility = flashActionMenuPoolScrollIndex > 0 ? "visible" : "hidden";
    rightBtn.style.visibility = flashActionMenuPoolScrollIndex < maxScrollIndex ? "visible" : "hidden";
    leftBtn.style.pointerEvents = flashActionMenuPoolScrollIndex > 0 ? "auto" : "none";
    rightBtn.style.pointerEvents = flashActionMenuPoolScrollIndex < maxScrollIndex ? "auto" : "none";
}

function getSelectedActionDrawerItem() {
    const items = flashGetVisibleActionDrawerItems(actionDrawerCategory);
    if (!items || items.length === 0) return null;
    if (actionDrawerSelectedIndex < 0 || actionDrawerSelectedIndex >= items.length) {
        actionDrawerSelectedIndex = 0;
    }
    return items[actionDrawerSelectedIndex] || null;
}

function flashShouldShowActionTrigger(category, selectedItem) {
    const hasActivateButton = !!(category && Array.isArray(category.activateButtons) && category.activateButtons.length > 0);
    if (!category || !hasActivateButton || !selectedItem) {
        return false;
    }
    const categoryKey = normalizeActionDrawerCategory(category.id || actionDrawerCategory);
    if (categoryKey === "rocket" && (selectedItem.type === "launcher" || selectedItem.type === "launcherRocket")) {
        return false;
    }
    return true;
}

function updateActionTriggerPosition() {
    const triggerBtn = document.getElementById("amTriggerBtn");
    if (!triggerBtn) return;
    const visibleItems = flashGetVisibleActionDrawerItems(actionDrawerCategory);
    const category = flashGetActionDrawerCategories().find(cat => cat.id === normalizeActionDrawerCategory(actionDrawerCategory));
    const selectedItem = getSelectedActionDrawerItem();
    if (!flashShouldShowActionTrigger(category, selectedItem)) {
        triggerBtn.style.visibility = "hidden";
        triggerBtn.style.pointerEvents = "none";
        return;
    }
    const triggerIndex = flashGetTriggerReferenceIndex(visibleItems, category.id);
    const relativeIndex = triggerIndex - flashActionMenuPoolScrollIndex;
    const layout = flashGetActionMenuLayout();
    if (relativeIndex < 0 || relativeIndex >= layout.maxVisiblePoolSlots) {
        triggerBtn.style.visibility = "hidden";
        triggerBtn.style.pointerEvents = "none";
        return;
    }
    const x = layout.triggerBaseX + relativeIndex * layout.poolStep;
    triggerBtn.style.visibility = "visible";
    triggerBtn.style.pointerEvents = "auto";
    triggerBtn.style.left = `${x}px`;
    triggerBtn.style.transform = "none";
}

function flashGetActionDrawerItemDomKey(item, categoryId) {
    const categoryKey = normalizeActionDrawerCategory(categoryId || actionDrawerCategory);
    if (!item) return `${categoryKey}:none`;
    const buttonId = Number(item.buttonId);
    if (Number.isFinite(buttonId) && buttonId > 0) {
        return `${categoryKey}:btn:${buttonId}`;
    }
    const fallbackId = item.id != null ? item.id : (item.code || item.label || "item");
    return `${categoryKey}:${item.type || "item"}:${fallbackId}`;
}

function flashGetDisabledActionMessage(item, actionState) {
    const label = item && item.label ? item.label : "This item";
    if (!item) {
        return "This item is not available right now.";
    }
    if (item.supported === false) {
        return `${label} is not available in this client yet.`;
    }
    if (item.type === "buy") {
        const fastbuyCfg = flashGetFastbuyConfig(item);
        if (!fastbuyCfg) {
            return `${label} is not configured correctly.`;
        }
        if (!flashCanAffordFastbuy(item)) {
            return `Not enough ${flashGetFastbuyCurrencyLabel(fastbuyCfg.currency)} (${fastbuyCfg.price.toLocaleString()} required).`;
        }
    }
    const cooldownInfo = actionState && actionState.cooldown ? actionState.cooldown : flashGetActionMenuCooldownInfo(item);
    if (cooldownInfo) {
        return `${label} is on cooldown (${Math.max(1, Math.ceil(cooldownInfo.remaining))}s).`;
    }
    if (item.type === "explosive") {
        if (!flashHasExplosiveCpuAccess(item.code || "")) {
            return `${label} is not installed on this ship.`;
        }
        const qty = typeof flashGetActionStockCount === "function" ? flashGetActionStockCount(item) : 0;
        if (qty <= 0) {
            return `No ${label} left.`;
        }
    }
    if ((item.type === "ammo" || item.type === "rocket" || item.type === "launcherRocket") && typeof flashGetActionStockCount === "function" && flashGetActionStockId(item) != null) {
        const qty = flashGetActionStockCount(item);
        if (qty <= 0) {
            return `No ${label} left.`;
        }
    }
    return `${label} is not available right now.`;
}

const AMMO_BAR_FRAME_IDS = Array.from({
    length: 25
}, (_, idx) => 326 - idx * 2);

function flashUpdateActionDrawerItemBox(div, item, index, category, hasActivateButton) {
    let qty = 0;
    let hasStock = false;
    const cpuInfo = item.type === "cpu" ? flashGetActionCpuInfo(item.code || "") : null;
    const fastbuyInfo = item.type === "buy" ? flashGetFastbuyConfig(item) : null;
    if (item.type === "launcher") {
        qty = Math.max(0, parseInt(window.heroRocketLauncherRocketsLoaded, 10) || 0);
        hasStock = qty > 0 || flashGetLauncherCapacity() > 0;
    } else if (item.type === "buy" && fastbuyInfo) {
        qty = fastbuyInfo.amount;
        hasStock = true;
    } else if (item.type === "cpu" && cpuInfo) {
        qty = parseInt(cpuInfo.amount, 10) || 0;
        hasStock = cpuInfo.hasItem !== false;
    } else {
        qty = flashGetActionStockCount(item);
        hasStock = flashGetActionStockId(item) != null;
    }

    const iconPath = flashResolveActionItemIconPath(item, item);
    const isActiveAmmo = item.type === "ammo" && Number(currentAmmoId) === Number(item.id);
    const isActiveRocket = item.type === "rocket" && Number(currentRocketId) === Number(item.id);
    const isActiveLauncherRocket = item.type === "launcherRocket" && Number(flashGetLauncherSelectedRocketId()) === Number(item.id);
    const isActiveAutoRocket = item.type === "cpu" && item.code === "ARL" && !!(cpuInfo && cpuInfo.state);
    const isActiveCpuToggle = item.type === "cpu" && ((item.code === "AMB" || item.code === "RKB" || item.code === "RLC") && !!(cpuInfo && cpuInfo.state));
    const isSelected = index === actionDrawerSelectedIndex;
    const suppressCpuSelectionGlow = item.type === "cpu" && (item.code === "ARL" || item.code === "RLC" || item.code === "CLK");
    const visualSelected = isSelected && !suppressCpuSelectionGlow;
    let actionState = flashGetActionRuntimeState(item, cpuInfo);
    let isEnabled = actionState.enabled;
    const isHighlighted = visualSelected || isActiveAmmo || isActiveRocket || isActiveLauncherRocket || isActiveAutoRocket || isActiveCpuToggle;
    const baseBgPath = item.bgDefault || (category && category.id === "fastbuy" ? FLASH_ACTION_MENU_FASTBUY_BG_DEFAULT : FLASH_ACTION_MENU_ITEM_BG_DEFAULT);
    const hoverBgPath = item.bgHover || baseBgPath;
    const effectBgPath = !actionState.cooldown && isHighlighted ? (item.bgSelected || FLASH_ACTION_MENU_ITEM_BG_SELECTED) : "";
    const disabledOverlayPath = !isEnabled ? FLASH_ACTION_MENU_DISABLED_BG : "";
    const disabledOverlayOpacity = actionState.disabledAlpha;

    let ammoBarHtml = "";
    let qtyHtml = "";
    if (item.buttonId === 46) {
        qtyHtml = "";
    } else if (item.ammobar && hasStock) {
        const maxVal = item.type === "ammo" ? 2000 : 100;
        const clampedQty = Math.max(0, Math.min(qty, maxVal));
        const frameIndex = Math.min(AMMO_BAR_FRAME_IDS.length - 1, Math.max(0, Math.floor((maxVal > 0 ? clampedQty / maxVal : 0) * (AMMO_BAR_FRAME_IDS.length - 1))));
        const imageNum = AMMO_BAR_FRAME_IDS[frameIndex];
        ammoBarHtml = `<img src="${typeof resolveUiImageUrl === "function" ? resolveUiImageUrl(`graphics/ui/actionMenu/images/${imageNum}.png`) : `graphics/ui/actionMenu/images/${imageNum}.png`}" class="amAmmoBar" alt="">`;
    } else if (item.counter) {
        const displayQty = fastbuyInfo ? fastbuyInfo.amount : qty;
        const canShowCounter = !!fastbuyInfo || hasStock || item.type === "cpu" && cpuInfo && cpuInfo.hasItem !== false;
        if (canShowCounter) {
            const qtyText = displayQty > 9999 ? `${Math.round(displayQty / 1000)}k` : String(displayQty);
            const qtyClass = displayQty > 0 ? "" : " empty";
            qtyHtml = `<span class="amItemQty${qtyClass}">${qtyText}</span>`;
        }
    }

    const cooldownInfo = actionState.cooldown;
    let cooldownRatio = 0;
    let cooldownOpacity = item.type === "tech" || item.type === "ability" ? 0.82 : 0.72;
    if (cooldownInfo) {
        cooldownRatio = Math.max(0, Math.min(1, cooldownInfo.remaining / Math.max(cooldownInfo.total || cooldownInfo.remaining || 1, 1)));
    }

    const launcherVisualHtml = item.buttonId === 46 ? flashBuildLauncherButtonVisualHtml() : "";
    const nextHtml = `
            <span class="amItemSlotBg" style="background-image:${getUiCssUrl(FLASH_ACTION_MENU_SLOT_BG)}"></span>
            <span class="amItemBaseBg" style="background-image:${getUiCssUrl(baseBgPath)}"></span>
            <span class="amItemHoverBg" style="background-image:${getUiCssUrl(hoverBgPath)}"></span>
            ${effectBgPath ? `<span class="amItemSelectedBg" style="background-image:${getUiCssUrl(effectBgPath)}"></span>` : ""}
            ${item.buttonId === 46 ? launcherVisualHtml : iconPath ? `<img src="${typeof resolveUiImageUrl === "function" ? (resolveUiImageUrl(iconPath) || iconPath) : iconPath}" class="amItemIcon" alt="">` : `<span class="amItemLabel">${item.label || "Action"}</span>`}
            ${ammoBarHtml}
            ${qtyHtml}
            ${disabledOverlayPath ? `<span class="amDisabledOverlay" style="background-image:${getUiCssUrl(disabledOverlayPath)};opacity:${disabledOverlayOpacity};"></span>` : ""}
        `;
    const nextClassName = `amItemBox${isEnabled ? "" : " is-disabled"}${visualSelected ? " is-selected" : ""}${isActiveAmmo || isActiveRocket || isActiveLauncherRocket || isActiveAutoRocket || isActiveCpuToggle ? " is-active" : ""}`;
    const layout = flashGetActionMenuLayout();
    const nextLeft = `${index * layout.poolStep}px`;
    const nextCursor = flashShouldUsePointerCursor(item, isEnabled) ? "pointer" : "default";

    if (div.className !== nextClassName) {
        div.className = nextClassName;
    }
    if (div.style.left !== nextLeft) {
        div.style.left = nextLeft;
    }
    if (div.style.cursor !== nextCursor) {
        div.style.cursor = nextCursor;
    }
    if (div.__adInnerHtml !== nextHtml) {
        div.innerHTML = nextHtml;
        div.__adInnerHtml = nextHtml;
        div.__adCooldownOverlay = null;
        div.__adCooldownRatioStep = -1;
    }
    flashUpdateActionMenuCooldownOverlay(div, cooldownRatio, cooldownOpacity);

    div.onclick = e => {
        e.stopPropagation();
        const categoryKey = normalizeActionDrawerCategory(actionDrawerCategory);
        const liveCpuInfo = item.type === "cpu" ? flashGetActionCpuInfo(item.code || "") : cpuInfo;
        const liveActionState = flashGetActionRuntimeState(item, liveCpuInfo);
        if (liveActionState && typeof liveActionState.enabled === "boolean") {
            actionState = liveActionState;
            isEnabled = liveActionState.enabled;
        }
        actionDrawerSelectedIndex = index;
        flashSetSelectedActionButtonId(actionDrawerCategory, item.buttonId);
        if (categoryKey === "fastbuy") {
            flashResolveFastbuySelectionMeta(item);
        }
        if (hasActivateButton) {
            if (!isEnabled && categoryKey !== "laser" && categoryKey !== "rocket" && categoryKey !== "fastbuy") {
                updateActionTriggerPosition();
                renderActionDrawerItems();
                return;
            }
            if (categoryKey === "rocket") {
                if (isEnabled) {
                    flashPlayActionClickSound();
                    if (item.type === "launcher") {
                        executeItemActionDirectly(item, {
                            source: "menu-item"
                        });
                    } else if (item.type === "rocket") {
                        if (currentRocketId !== item.id) {
                            sendSelectRocket(item.id);
                        }
                    } else if (item.type === "launcherRocket") {
                        if (typeof sendSelectLauncherRocket === "function") {
                            sendSelectLauncherRocket(item.id);
                        }
                    }
                }
                updateActionTriggerPosition();
                renderActionDrawerItems();
                return;
            }
            if (categoryKey === "laser") {
                if (isEnabled) {
                    flashPlayActionClickSound();
                    if (item.type === "ammo" && flashShouldSendAmmoSelection(item.id)) {
                        sendSelectAmmo(item.id);
                    }
                }
                updateActionTriggerPosition();
                renderActionDrawerItems();
                return;
            }
            if (categoryKey === "explosive") {
                if (isEnabled) {
                    flashPlayActionClickSound();
                }
                updateActionTriggerPosition();
                renderActionDrawerItems();
                return;
            }
            updateActionTriggerPosition();
            renderActionDrawerItems();
            return;
        }
        updateActionTriggerPosition();
        renderActionDrawerItems();
        if (!isEnabled) {
            addInfoMessage(flashGetDisabledActionMessage(item, actionState));
            return;
        }
        flashPlayActionClickSound();
        executeItemActionDirectly(item, {
            source: "menu-item"
        });
    };
    div.onmouseenter = e => showActionTooltip(e, item);
    div.onmousemove = e => moveActionTooltip(e);
    div.onmouseleave = () => hideActionTooltip();
}

function flashFormatActionDrawerQuantity(qty) {
    const value = Math.max(0, parseInt(qty, 10) || 0);
    return value > 9999 ? `${Math.round(value / 1000)}k` : String(value);
}

function flashTryUpdateActionDrawerStockDom(stockChanges) {
    const itemsRow = typeof document !== "undefined" ? document.getElementById("amItemsRow") : null;
    if (!itemsRow || !Array.isArray(stockChanges) || stockChanges.length === 0) {
        return {
            updated: false,
            needsRender: false
        };
    }

    const changesByStockId = new Map();
    stockChanges.forEach(change => {
        const stockId = Number(change && change.stockId);
        if (!Number.isFinite(stockId)) return;
        changesByStockId.set(stockId, {
            oldValue: Math.max(0, parseInt(change.oldValue, 10) || 0),
            newValue: Math.max(0, parseInt(change.newValue, 10) || 0)
        });
    });
    if (changesByStockId.size === 0) {
        return {
            updated: false,
            needsRender: false
        };
    }

    const categoryKey = normalizeActionDrawerCategory(actionDrawerCategory);
    const visibleItems = flashGetVisibleActionDrawerItems(categoryKey);
    const existingByKey = new Map();
    Array.from(itemsRow.children).forEach(child => {
        if (child && child.classList && child.classList.contains("amItemBox")) {
            const key = child.dataset.itemKey || "";
            if (key) existingByKey.set(key, child);
        }
    });

    let updated = false;
    let needsRender = false;
    visibleItems.forEach(item => {
        const stockId = Number(flashGetActionStockId(item));
        if (!Number.isFinite(stockId) || !changesByStockId.has(stockId)) return;
        const change = changesByStockId.get(stockId);
        if ((change.oldValue > 0) !== (change.newValue > 0)) {
            needsRender = true;
            return;
        }
        const itemKey = flashGetActionDrawerItemDomKey(item, categoryKey);
        const div = existingByKey.get(itemKey) || null;
        if (!div) return;
        const qtyNode = div.querySelector ? div.querySelector(".amItemQty") : null;
        if (qtyNode) {
            qtyNode.textContent = flashFormatActionDrawerQuantity(change.newValue);
            if (qtyNode.classList) {
                qtyNode.classList.toggle("empty", change.newValue <= 0);
            }
            updated = true;
        }
    });

    return {
        updated: updated,
        needsRender: needsRender
    };
}

if (typeof window !== "undefined") {
    window.flashTryUpdateActionDrawerStockDom = flashTryUpdateActionDrawerStockDom;
}

function renderActionDrawerItems() {
    initActionDrawerTooltips();
    const itemsRow = document.getElementById("amItemsRow");
    const triggerBtn = document.getElementById("amTriggerBtn");
    if (!itemsRow || !triggerBtn) return;
    const visibleItems = flashGetVisibleActionDrawerItems(actionDrawerCategory);
    const category = flashGetActionDrawerCategories().find(cat => cat.id === normalizeActionDrawerCategory(actionDrawerCategory)) || null;
    const hasActivateButton = !!(category && Array.isArray(category.activateButtons) && category.activateButtons.length > 0);
    flashSyncSelectedIndex(visibleItems, actionDrawerCategory);

    const existingByKey = new Map();
    Array.from(itemsRow.children).forEach(child => {
        if (child && child.classList && child.classList.contains("amItemBox")) {
            const key = child.dataset.itemKey || "";
            if (key) {
                existingByKey.set(key, child);
            }
        }
    });
    const usedKeys = new Set();

    visibleItems.forEach((item, index) => {
        const itemKey = flashGetActionDrawerItemDomKey(item, actionDrawerCategory);
        let div = existingByKey.get(itemKey) || null;
        if (!div) {
            div = document.createElement("div");
            div.style.position = "absolute";
            div.style.top = "0";
        }
        div.dataset.itemKey = itemKey;
        flashUpdateActionDrawerItemBox(div, item, index, category, hasActivateButton);
        const referenceNode = itemsRow.children[index] || null;
        if (referenceNode !== div) {
            itemsRow.insertBefore(div, referenceNode);
        }
        usedKeys.add(itemKey);
    });

    Array.from(itemsRow.children).forEach(child => {
        if (!child || !child.classList || !child.classList.contains("amItemBox")) return;
        const itemKey = child.dataset.itemKey || "";
        if (!usedKeys.has(itemKey)) {
            child.remove();
        }
    });

    const selectedItem = getSelectedActionDrawerItem();
    const activateItem = flashGetSelectedActivateItem(category);
    if (flashShouldShowActionTrigger(category, selectedItem)) {
        const triggerSourceItem = flashGetTriggerSourceItem(visibleItems, category.id, selectedItem);
        const triggerState = flashGetActionRuntimeState(triggerSourceItem);
        const triggerIcon = activateItem ? flashResolveActionItemIconPath(activateItem, selectedItem) : "";
        const triggerBgPath = activateItem && activateItem.bgDefault ? activateItem.bgDefault : (category && category.id === "fastbuy" ? FLASH_ACTION_MENU_FASTBUY_BG_DEFAULT : FLASH_ACTION_MENU_ITEM_BG_DEFAULT);
        const triggerUsesLauncherVisual = !!activateItem && Number(activateItem.buttonId) === 46 && (!!selectedItem && (selectedItem.type === "launcher" || selectedItem.type === "launcherRocket"));
        const triggerVisualHtml = triggerUsesLauncherVisual ? flashBuildLauncherButtonVisualHtml() : (triggerIcon ? `<img src="${typeof resolveUiImageUrl === "function" ? (resolveUiImageUrl(triggerIcon) || triggerIcon) : triggerIcon}" class="amItemIcon amTriggerIcon" alt="">` : "");
        const triggerHtml = `
            <span class="amTriggerBaseBg" style="background-image:${getUiCssUrl(FLASH_ACTION_MENU_SLOT_BG)}"></span>
            <span class="amTriggerStateBg" style="background-image:${getUiCssUrl(triggerBgPath)}"></span>
            ${triggerVisualHtml}
            ${!triggerState.enabled ? `<span class="amDisabledOverlay amTriggerDisabledOverlay" style="background-image:${getUiCssUrl(FLASH_ACTION_MENU_DISABLED_BG)};opacity:${triggerState.disabledAlpha};"></span>` : ""}
        `;
        if (triggerBtn.__adInnerHtml !== triggerHtml) {
            triggerBtn.innerHTML = triggerHtml;
            triggerBtn.__adInnerHtml = triggerHtml;
        }
        triggerBtn.onclick = e => {
            e.stopPropagation();
            const categoryKey = normalizeActionDrawerCategory(actionDrawerCategory);
            if (!triggerState.enabled) {
                addInfoMessage((triggerSourceItem && triggerSourceItem.label ? triggerSourceItem.label : selectedItem.label) + " is not available right now.");
                return;
            }
            if (selectedItem.supported === false) {
                addInfoMessage(selectedItem.label + " is not available in this client yet.");
                return;
            }
            flashPlayActionClickSound();
            if (categoryKey === "rocket") {
                if (selectedItem.type === "launcher" || selectedItem.type === "launcherRocket") {
                    executeItemActionDirectly(triggerSourceItem || selectedItem, {
                        source: "menu-trigger"
                    });
                    return;
                }
                if (selectedTargetId) {
                    sendRocketAttack(selectedTargetId);
                } else {
                    addInfoMessage("No target.");
                }
                return;
            }
            executeItemActionDirectly(selectedItem, {
                source: "menu-trigger"
            });
        };
    } else {
        const emptyTriggerHtml = `<span class="amTriggerBaseBg" style="background-image:${getUiCssUrl(FLASH_ACTION_MENU_SLOT_BG)}"></span>`;
        if (triggerBtn.__adInnerHtml !== emptyTriggerHtml) {
            triggerBtn.innerHTML = emptyTriggerHtml;
            triggerBtn.__adInnerHtml = emptyTriggerHtml;
        }
        triggerBtn.onclick = null;
    }

    updateActionDrawerArrowVisibility(visibleItems.length);
    updateActionTriggerPosition();
}

function initActionDrawer() {
    const existing = document.getElementById("actionDrawerContainer");
    if (existing) existing.remove();
    const oldStyle = document.getElementById("style-action-drawer");
    if (oldStyle) oldStyle.remove();

    const actionMenuDefinition = flashGetActionMenuDefinition();
    const actionMenuLayout = flashGetActionMenuLayout(actionMenuDefinition);
    const lockLockedUrl = typeof resolveUiImageUrl === "function" ? resolveUiImageUrl("graphics/ui/actionMenu/images/162.png") : "graphics/ui/actionMenu/images/162.png";
    const lockUnlockedUrl = typeof resolveUiImageUrl === "function" ? resolveUiImageUrl("graphics/ui/actionMenu/images/166.png") : "graphics/ui/actionMenu/images/166.png";
    const draggerUrl = typeof resolveUiImageUrl === "function" ? resolveUiImageUrl("graphics/ui/actionMenu/images/171.png") : "graphics/ui/actionMenu/images/171.png";
    const style = document.createElement("style");
    style.id = "style-action-drawer";
    style.innerHTML = `
        #actionDrawerContainer {
            position: absolute;
            top: 450px;
            left: 50%;
            width: ${actionMenuLayout.totalWidth}px;
            height: ${actionMenuLayout.subActionY + actionMenuLayout.visualBgHeight + 2}px;
            transform: translateX(-50%);
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            z-index: 800;
            user-select: none;
            pointer-events: none;
            overflow: visible;
        }
        #actionDrawerContainer.movable { opacity: 0.92; cursor: move; }
        #amLockButton {
            position: absolute; left: -3px; top: 8px; width: 20px; height: 20px;
            background-size: 100% 100%; background-repeat: no-repeat; cursor: pointer; z-index: 900; pointer-events: auto;
        }
        #amLockButton:hover { filter: brightness(1.15); }
        #amLockButton.locked { background-image: url('${lockLockedUrl}'); }
        #amLockButton.unlocked { background-image: url('${lockUnlockedUrl}'); opacity: 0.85; }
        #amDragger {
            position: absolute; left: 9px; top: -8px; width: 20px; height: 20px;
            background-image: url('${draggerUrl}'); background-size: contain; background-repeat: no-repeat;
            cursor: move; z-index: 910; display: none; pointer-events: auto;
        }
        #amTabs { position: absolute; left: 0; top: 0; width: ${actionMenuLayout.totalWidth}px; height: ${actionMenuLayout.visualBgHeight + 2}px; pointer-events: none; }
        .amTab {
            position: absolute; margin: 0; padding: 0; border: none !important; background-color: transparent !important;
            cursor: pointer; pointer-events: auto; transition: filter 0.12s ease-out; filter: none;
        }
        .amTab:hover { filter: brightness(1.04); }
        .amTab.active { filter: none; }
        .amTabSlotBg, .amTabBaseBg, .amTabHoverBg, .amTabSelectedBg { position:absolute; background-repeat:no-repeat; background-size:100% 100%; background-position:center; pointer-events:none; }
        .amTabSlotBg { left:0; top:0; width:${actionMenuLayout.visualBgWidth}px; height:${actionMenuLayout.visualBgHeight}px; z-index:1; }
        .amTabBaseBg { left:0; top:0; width:${actionMenuLayout.visualBgWidth}px; height:${actionMenuLayout.visualBgHeight}px; z-index:2; }
        .amTabHoverBg, .amTabSelectedBg { left:${actionMenuLayout.selectedBgLeft}px; top:${actionMenuLayout.selectedBgTop}px; width:${actionMenuLayout.selectedBgWidth}px; height:${actionMenuLayout.selectedBgHeight}px; z-index:3; opacity:0; }
        .amTab:hover .amTabHoverBg { opacity:1; }
        .amTab.active .amTabHoverBg { opacity:0; }
        .amTab.active .amTabSelectedBg { opacity:1; }
        .amTabIcon { position:absolute; left:0; top:0; width:${actionMenuLayout.slotWidth}px; height:${actionMenuLayout.slotHeight}px; image-rendering: auto; pointer-events: none; z-index:4; }
        #amContentWrapper {
            position: absolute; left: 0; top: ${actionMenuLayout.poolY}px; width: ${actionMenuLayout.totalWidth}px; height: ${actionMenuLayout.selectedBgHeight}px;
            pointer-events: none; overflow: visible; z-index: 3;
        }
        #amItemsViewport {
            position: absolute; left: 0; top: 0; width: ${actionMenuLayout.poolMaskWidth}px; height: ${actionMenuLayout.selectedBgHeight + 6}px;
            overflow: hidden; pointer-events: none; z-index: 1;
        }
        #amItemsRow { position: absolute; left: 0; top: 0; height: ${actionMenuLayout.selectedBgHeight}px; pointer-events: none; }
        .amArrowBtn {
            position: absolute; top: 7px; width: 20px; height: 20px; background-repeat: no-repeat; background-position: center; background-size: 100% 100%;
            cursor: pointer; border: none; pointer-events: auto; opacity: 0.96; z-index: 4; overflow: visible;
        }
        .amArrowBtn:hover { filter: brightness(1.15); }
        #amScrollLeft { left: -24px; background-image: ${getUiCssUrl("graphics/ui/actionMenu/images/152.png")}; }
        #amScrollRight { left: ${actionMenuLayout.scrollRightX}px; background-image: ${getUiCssUrl("graphics/ui/actionMenu/images/147.png")}; }
        #amTriggerRow {
            position: absolute; left: 0; top: ${actionMenuLayout.subActionY}px; width: ${actionMenuLayout.totalWidth}px; height: ${actionMenuLayout.selectedBgHeight}px;
            pointer-events: none; overflow: visible; z-index: 1;
        }
        .amTriggerBtn {
            position: absolute; top: ${actionMenuLayout.visualBgTop}px; left: ${actionMenuLayout.triggerBaseX}px; width: ${actionMenuLayout.visualBgWidth}px; height: ${actionMenuLayout.visualBgHeight}px;
            background: transparent !important; border: none !important; pointer-events: auto; cursor: pointer; display: block; filter: none;
        }
        .amTriggerBaseBg { position:absolute; left:0; top:0; width:${actionMenuLayout.visualBgWidth}px; height:${actionMenuLayout.visualBgHeight}px; background-repeat:no-repeat; background-size:100% 100%; background-position:center; pointer-events:none; z-index:1; }
        .amTriggerStateBg { position:absolute; left:0; top:0; width:${actionMenuLayout.visualBgWidth}px; height:${actionMenuLayout.visualBgHeight}px; background-repeat:no-repeat; background-size:100% 100%; background-position:center; pointer-events:none; z-index:2; }
        .amItemBox {
            position: absolute; top: 0; width: ${actionMenuLayout.poolStep}px; height: ${actionMenuLayout.selectedBgHeight}px; background: transparent !important;
            border: none !important; outline: none !important; box-shadow: none !important; cursor: pointer; pointer-events: auto; overflow: visible;
        }
        .amItemBox.is-disabled { opacity: 1; cursor: default; }
        .amItemBox.is-disabled .amItemIcon { opacity: 0.96; }
        .amItemSlotBg, .amItemBaseBg, .amItemHoverBg, .amItemSelectedBg, .amDisabledOverlay { position: absolute; display: block; background-repeat: no-repeat; background-size: 100% 100%; background-position: center; pointer-events: none; }
        .amItemSlotBg { left:${actionMenuLayout.visualBgLeft}px; top:${actionMenuLayout.visualBgTop}px; width:${actionMenuLayout.visualBgWidth}px; height:${actionMenuLayout.visualBgHeight}px; z-index:1; }
        .amItemBaseBg { left:${actionMenuLayout.visualBgLeft}px; top:${actionMenuLayout.visualBgTop}px; width:${actionMenuLayout.visualBgWidth}px; height:${actionMenuLayout.visualBgHeight}px; z-index:2; }
        .amItemHoverBg, .amItemSelectedBg { left:${actionMenuLayout.selectedBgLeft}px; top:${actionMenuLayout.selectedBgTop}px; width:${actionMenuLayout.selectedBgWidth}px; height:${actionMenuLayout.selectedBgHeight}px; z-index:3; opacity:0; }
        .amItemBox:hover .amItemHoverBg { opacity:1; }
        .amItemBox.is-disabled:hover .amItemHoverBg, .amItemBox.is-selected:hover .amItemHoverBg, .amItemBox.is-active:hover .amItemHoverBg { opacity:0; }
        .amItemBox.is-selected .amItemSelectedBg, .amItemBox.is-active .amItemSelectedBg { opacity:1; }
        .amDisabledOverlay { left:0; top:0; width:${actionMenuLayout.visualBgWidth}px; height:${actionMenuLayout.visualBgHeight}px; z-index:7; }
        .amTriggerDisabledOverlay { z-index:7; }
        .amItemIcon { position: absolute; left:0; top:0; width:${actionMenuLayout.slotWidth}px; height:${actionMenuLayout.slotHeight}px; pointer-events: none; z-index: 4; }
        .amTriggerIcon { left:0; top:0; }
        .amAmmoBar { position: absolute; left: ${FLASH_ACTION_MENU_V2_AMMOBAR_LEFT}px; top: ${FLASH_ACTION_MENU_V2_AMMOBAR_TOP}px; width: ${FLASH_ACTION_MENU_V2_AMMOBAR_WIDTH}px; height: ${FLASH_ACTION_MENU_V2_AMMOBAR_HEIGHT}px; pointer-events: none; z-index: 5; }
        .amItemQty {
            position: absolute; left: 50%; top: ${FLASH_ACTION_MENU_V2_QTY_TOP}px; transform: translateX(-50%); font-size: 9px; line-height: 9px; color: #fff; text-shadow: 1px 1px 0 #000;
            pointer-events: none; z-index: 6;
        }
        .amItemQty.empty { color: #ff6363; }
        .amItemLabel { position: absolute; left: 0; right: 0; top: 11px; font-size: 9px; line-height: 10px; text-align: center; color: #ddd; pointer-events: none; z-index: 4; }
        .amLauncherSelectedRocket { position:absolute; left:0; top:0; width:${actionMenuLayout.slotWidth}px; height:${actionMenuLayout.slotHeight}px; pointer-events:none; z-index:4; image-rendering:auto; }
        .amLauncherSlots { position:absolute; top:15px; height:4px; pointer-events:none; z-index:5; image-rendering:auto; }
        .amLauncherSlots-3 { left:9px; width:14px; }
        .amLauncherSlots-5 { left:4px; width:24px; }
        .amLauncherFilledDot { position:absolute; width:4px; height:4px; pointer-events:none; z-index:6; image-rendering:auto; }
        .amCooldownOverlay { position: absolute; left:0; top:0; width:${actionMenuLayout.slotWidth}px; height:${actionMenuLayout.slotHeight}px; overflow:hidden; pointer-events:none; z-index:8; }
        .amCooldownSvg { display:block; width:100%; height:100%; }
    `;
    document.head.appendChild(style);

    const container = document.createElement("div");
    container.id = "actionDrawerContainer";
    container.innerHTML = `
        <div id="amLockButton" title="Lock/Unlock"></div>
        <div id="amDragger" title="Move menu"></div>
        <div id="amTabs"></div>
        <div id="amContentWrapper">
            <div class="amArrowBtn" id="amScrollLeft"></div>
            <div id="amItemsViewport"><div id="amItemsRow"></div></div>
            <div class="amArrowBtn" id="amScrollRight"></div>
        </div>
        <div id="amTriggerRow"><div id="amTriggerBtn" class="amTriggerBtn"></div></div>
    `;
    window.appendToHud ? window.appendToHud(container) : document.body.appendChild(container);

    const lockBtn = document.getElementById("amLockButton");
    const draggerBtn = document.getElementById("amDragger");
    function updateLockVisuals() {
        if (quickbarLocked) {
            lockBtn.classList.add("locked");
            lockBtn.classList.remove("unlocked");
            draggerBtn.style.display = "none";
        } else {
            lockBtn.classList.add("unlocked");
            lockBtn.classList.remove("locked");
            draggerBtn.style.display = "block";
        }
        refreshActionDrawerStaticAtlasSurfaces();
    }
    updateLockVisuals();
    lockBtn.addEventListener("mousedown", e => {
        e.stopPropagation();
        quickbarLocked = !quickbarLocked;
        updateLockVisuals();
        addInfoMessage(quickbarLocked ? "Quickbar locked." : "Quickbar unlocked.");
        saveInterfaceLayout();
    });

    const scrollLeftBtn = document.getElementById("amScrollLeft");
    const scrollRightBtn = document.getElementById("amScrollRight");
    scrollLeftBtn.addEventListener("click", e => {
        e.stopPropagation();
        flashActionMenuPoolScrollIndex = Math.max(0, flashActionMenuPoolScrollIndex - 1);
        updateActionDrawerArrowVisibility();
        updateActionTriggerPosition();
    });
    scrollRightBtn.addEventListener("click", e => {
        e.stopPropagation();
        flashActionMenuPoolScrollIndex += 1;
        updateActionDrawerArrowVisibility();
        updateActionTriggerPosition();
    });

    container.addEventListener("mousedown", e => e.stopPropagation());
    let isDraggingDrawer = false;
    let drawerOffset = { x: 0, y: 0 };
    let drawerLastValidPosition = null;
    container.addEventListener("mousedown", e => {
        const isDragger = e.target.id === "amDragger";
        const isInteract = e.target.closest(".amItemBox") || e.target.closest(".amArrowBtn") || e.target.closest(".amTriggerBtn") || e.target.id === "amLockButton";
        if (isInteract) return;
        if (isDragger || !quickbarLocked && e.target === container) {
            isDraggingDrawer = true;
            const rect = container.getBoundingClientRect();
            const root = window.getHudRoot && window.getHudRoot();
            const rootRect = root ? root.getBoundingClientRect() : { left: 0, top: 0 };
            const sx = window.getHudScaleX ? window.getHudScaleX() : 1;
            const sy = window.getHudScaleY ? window.getHudScaleY() : 1;
            const currentLeft = (rect.left - rootRect.left) / sx;
            const currentTop = (rect.top - rootRect.top) / sy;
            container.style.transform = "none";
            container.style.left = currentLeft + "px";
            container.style.top = currentTop + "px";
            drawerLastValidPosition = { x: currentLeft, y: currentTop };
            const mouse = window.clientToHudCoords ? window.clientToHudCoords(e.clientX, e.clientY) : { x: e.clientX, y: e.clientY };
            drawerOffset.x = mouse.x - currentLeft;
            drawerOffset.y = mouse.y - currentTop;
            container.classList.add("movable");
        }
    });
    window.addEventListener("mousemove", e => {
        if (!isDraggingDrawer) return;
        const mouse = window.clientToHudCoords ? window.clientToHudCoords(e.clientX, e.clientY) : { x: e.clientX, y: e.clientY };
        container.style.left = mouse.x - drawerOffset.x + "px";
        container.style.top = mouse.y - drawerOffset.y + "px";
    });
    window.addEventListener("mouseup", () => {
        if (!isDraggingDrawer) return;
        isDraggingDrawer = false;
        container.classList.remove("movable");
        if (typeof window.checkActionDrawerPosition === "function") {
            window.checkActionDrawerPosition(container, drawerLastValidPosition);
        }
        saveInterfaceLayout();
    });

    const tabsContainer = document.getElementById("amTabs");
    tabsContainer.addEventListener("click", e => {
        const tab = e.target.closest(".amTab");
        if (!tab) return;
        try {
            if (window.AudioManager && typeof window.AudioManager.playSoundEffect === "function") {
                window.AudioManager.playSoundEffect(24, false, false, -1, -1, true);
            }
        } catch (_) {}
        actionDrawerCategory = normalizeActionDrawerCategory(tab.dataset.cat);
        actionDrawerSelectedIndex = 0;
        flashActionMenuPoolScrollIndex = 0;
        flashBuildActionDrawerTabs();
        renderActionDrawerItems();
    });

    flashBuildActionDrawerTabs();
    renderActionDrawerItems();
    scheduleActionMenuUiDataUrlWarmup("action-drawer-init");
}

window.quickSlotStopAttack = typeof window.quickSlotStopAttack === "boolean" ? window.quickSlotStopAttack : true;
let quickbarHoveredSlot = 0;
let quickbarSlotDragState = null;
let quickbarDragProxy = null;
let quickbarDraggerHovered = false;
let quickbarRotateHovered = false;
let quickbarLastValidPosition = { x: 0, y: 0 };
const FLASH_QUICKBAR_SLOT_WIDTH = 32;
const FLASH_QUICKBAR_SLOT_HEIGHT = 35;
const FLASH_QUICKBAR_GAP = 3;
const FLASH_QUICKBAR_HORIZONTAL_ORDER = 0;
const FLASH_QUICKBAR_HORIZONTAL_COMPACT_ORDER = 1;
const FLASH_QUICKBAR_VERTICAL_ORDER = 2;
const FLASH_QUICKBAR_VERTICAL_COMPACT_ORDER = 3;
const FLASH_QUICKBAR_HORIZONTAL_COMPACT_POINTS = Object.freeze([
    Object.freeze({ x: 0, y: 0 }),
    Object.freeze({ x: 17, y: -29 }),
    Object.freeze({ x: 17, y: 29 }),
    Object.freeze({ x: 34, y: 0 }),
    Object.freeze({ x: 51, y: -29 }),
    Object.freeze({ x: 51, y: 29 }),
    Object.freeze({ x: 68, y: 0 }),
    Object.freeze({ x: 85, y: -29 }),
    Object.freeze({ x: 85, y: 29 }),
    Object.freeze({ x: 102, y: 0 })
]);
const FLASH_QUICKBAR_VERTICAL_COMPACT_POINTS = Object.freeze([
    Object.freeze({ x: 0, y: 0 }),
    Object.freeze({ x: -17, y: 29 }),
    Object.freeze({ x: 17, y: 29 }),
    Object.freeze({ x: 0, y: 58 }),
    Object.freeze({ x: -17, y: 87 }),
    Object.freeze({ x: 17, y: 87 }),
    Object.freeze({ x: 0, y: 116 }),
    Object.freeze({ x: -17, y: 145 }),
    Object.freeze({ x: 17, y: 145 }),
    Object.freeze({ x: 0, y: 174 })
]);
const FLASH_QUICKBAR_SLOT_POINTS_CACHE = Object.create(null);
const FLASH_QUICKBAR_BUTTON_ID_BY_ITEM = Object.freeze({
    ammo: Object.freeze({ 1: 3, 2: 4, 3: 5, 4: 6, 5: 7, 6: 39 }),
    rocket: Object.freeze({ 1: 11, 2: 12, 3: 13, 4: 57, 5: 44, 7: 43, 10: 72 }),
    explosive: Object.freeze({ SMB: 16, ISH: 17, EMP: 45 }),
    tech: Object.freeze({ 1: 54, 2: 51, 3: 55, 4: 53, 5: 59, ELA: 54, ECI: 51, RPM: 55, SBU: 53, BRB: 59 }),
    cpu: Object.freeze({ ARL: 22, CLK: 21, ROB: 23, HM7: 35, AMB: 42, RLC: 47, RKB: 56 }),
    launcherRocket: Object.freeze({ 7: 48, 8: 49, 9: 50 }),
    buy: Object.freeze({ ammo_x1: 26, ammo_x2: 27, ammo_x3: 28, ammo_x5: 30, r_r310: 31, r_plt2026: 32, r_plt2021: 33 }),
    ability: Object.freeze({ solace: 63, diminisher: 64, spectrum: 65, sentinel: 66, venom: 67, lightning: 73 })
});

function flashGetQuickbarResolutionId() {
    if (window.ANDROMEDA_CONFIG && window.ANDROMEDA_CONFIG.resolutionID != null) {
        return String(window.ANDROMEDA_CONFIG.resolutionID);
    }
    return "0";
}

function flashGetQuickbarDefaultPositionFromXml() {
    const xmlDoc = window._gameXmlDoc || null;
    if (xmlDoc && xmlDoc.querySelector) {
        const resId = flashGetQuickbarResolutionId();
        const node = xmlDoc.querySelector(`patterns > resolutions > resolution[id="${resId}"]`) || xmlDoc.querySelector("patterns > resolutions > resolution");
        if (node) {
            const x = parseInt(node.getAttribute("slotMenuXPos") || "", 10);
            const y = parseInt(node.getAttribute("slotMenuYPos") || "", 10);
            if (Number.isFinite(x) && Number.isFinite(y)) {
                return { x: x, y: y };
            }
        }
    }
    const cvs = document.getElementById("gameCanvas");
    const width = cvs && cvs.width ? cvs.width : (typeof LOGICAL_WIDTH === "number" ? LOGICAL_WIDTH : 1920);
    const height = cvs && cvs.height ? cvs.height : (typeof LOGICAL_HEIGHT === "number" ? LOGICAL_HEIGHT : 1080);
    return {
        x: Math.max(0, Math.round((width - (FLASH_QUICKBAR_SLOT_WIDTH * 10 + FLASH_QUICKBAR_GAP * 9)) / 2)),
        y: Math.max(0, Math.round(height - 20 - FLASH_QUICKBAR_SLOT_HEIGHT - 20))
    };
}

function flashEnsureQuickbarPositionInitialized(force = false) {
    if (force || !quickbarInitialized || !Number.isFinite(quickbarPosition.x) || !Number.isFinite(quickbarPosition.y)) {
        const pos = flashGetQuickbarDefaultPositionFromXml();
        quickbarPosition.x = pos.x;
        quickbarPosition.y = pos.y;
        quickbarInitialized = true;
    }
    if (!Number.isFinite(quickbarLastValidPosition.x) || !Number.isFinite(quickbarLastValidPosition.y)) {
        quickbarLastValidPosition = {
            x: quickbarPosition.x,
            y: quickbarPosition.y
        };
    }
}

function buildFlashQuickbarSlotPoints(mode) {
    const points = [];
    for (let idx = 0; idx < 10; idx++) {
        let point;
        switch (mode) {
          case FLASH_QUICKBAR_HORIZONTAL_COMPACT_ORDER:
            point = FLASH_QUICKBAR_HORIZONTAL_COMPACT_POINTS[idx];
            points.push(Object.freeze({ x: point.x, y: point.y }));
            break;

          case FLASH_QUICKBAR_VERTICAL_ORDER:
            points.push(Object.freeze({
                x: 0,
                y: idx * (FLASH_QUICKBAR_SLOT_HEIGHT + FLASH_QUICKBAR_GAP)
            }));
            break;

          case FLASH_QUICKBAR_VERTICAL_COMPACT_ORDER:
            point = FLASH_QUICKBAR_VERTICAL_COMPACT_POINTS[idx];
            points.push(Object.freeze({ x: point.x, y: point.y }));
            break;

          case FLASH_QUICKBAR_HORIZONTAL_ORDER:
          default:
            points.push(Object.freeze({
                x: idx * (FLASH_QUICKBAR_SLOT_WIDTH + FLASH_QUICKBAR_GAP),
                y: 0
            }));
            break;
        }
    }
    return Object.freeze(points);
}

function flashGetQuickbarSlotPoints(layoutMode) {
    let mode = Number.isFinite(Number(layoutMode)) ? Number(layoutMode) : quickbarLayoutMode;
    if (mode !== FLASH_QUICKBAR_HORIZONTAL_COMPACT_ORDER && mode !== FLASH_QUICKBAR_VERTICAL_ORDER && mode !== FLASH_QUICKBAR_VERTICAL_COMPACT_ORDER) {
        mode = FLASH_QUICKBAR_HORIZONTAL_ORDER;
    }
    if (!FLASH_QUICKBAR_SLOT_POINTS_CACHE[mode]) {
        FLASH_QUICKBAR_SLOT_POINTS_CACHE[mode] = buildFlashQuickbarSlotPoints(mode);
    }
    return FLASH_QUICKBAR_SLOT_POINTS_CACHE[mode];
}

function flashGetQuickbarLayoutBounds(layoutMode) {
    const points = flashGetQuickbarSlotPoints(layoutMode);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    points.forEach(point => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x + FLASH_QUICKBAR_SLOT_WIDTH);
        maxY = Math.max(maxY, point.y + FLASH_QUICKBAR_SLOT_HEIGHT);
    });
    return {
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY
    };
}

function flashQuickbarAnchorIsValid(x, y) {
    const cvs = document.getElementById("gameCanvas");
    const width = cvs && cvs.width ? cvs.width : (typeof LOGICAL_WIDTH === "number" ? LOGICAL_WIDTH : 1920);
    const height = cvs && cvs.height ? cvs.height : (typeof LOGICAL_HEIGHT === "number" ? LOGICAL_HEIGHT : 1080);
    return x >= 0 && x + FLASH_QUICKBAR_SLOT_WIDTH <= width && y >= 0 && y + 20 <= height;
}

function flashBuildFallbackQuickbarItem(buttonId) {
    const numericId = parseInt(buttonId, 10);
    if (!Number.isFinite(numericId) || numericId <= 0) return null;
    if (numericId === 55) return null;
    const binding = FLASH_ACTION_MENU_BUTTON_BINDINGS[numericId];
    if (!binding) return null;
    const item = {
        categoryKey: "quickbar",
        buttonId: numericId,
        tagName: "actionButton",
        sectionId: "",
        iconFrames: [],
        iconPath: "",
        resKey: "",
        label: binding.label || "Action",
        languageKey: "",
        alwaysExist: true,
        counter: false,
        cooldown: false,
        ammobar: false,
        activeCapable: false,
        customizable: true,
        supported: binding.supported !== false,
        type: binding.type,
        id: Object.prototype.hasOwnProperty.call(binding, "id") ? binding.id : null,
        code: binding.code || "",
        stockId: binding.stockId || null,
        cooldownCode: binding.cooldownCode || binding.code || ""
    };
    return flashActionMenuNormalizeSpecialItem(item);
}

function flashGetQuickbarDisplayItemByButtonId(buttonId) {
    const numericId = parseInt(buttonId, 10);
    if (!Number.isFinite(numericId) || numericId <= 0) return null;
    if (numericId === 55) return null;
    if (typeof flashGetActionMenuDefinition === "function") {
        try {
            const def = flashGetActionMenuDefinition();
            if (def && Array.isArray(def.categories)) {
                for (const category of def.categories) {
                    if (!category) continue;
                    const items = [];
                    if (Array.isArray(category.items)) {
                        items.push(...category.items);
                    }
                    if (Array.isArray(category.activateButtons)) {
                        items.push(...category.activateButtons);
                    }
                    const found = items.find(entry => Number(entry && entry.buttonId) === numericId) || null;
                    if (found) {
                        return { ...found };
                    }
                }
            }
        } catch (_) {}
    }
    return flashBuildFallbackQuickbarItem(numericId);
}

function flashResolveQuickbarButtonId(item) {
    if (item == null) return null;
    if (typeof item === "number" || typeof item === "string") {
        const numeric = parseInt(item, 10);
        return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
    }
    if (typeof item !== "object") return null;
    if (item.buttonId != null) {
        const numeric = parseInt(item.buttonId, 10);
        return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
    }
    const type = String(item.type || "").toLowerCase();
    if (type === "launcher") return 46;
    if (type === "ammo") return FLASH_QUICKBAR_BUTTON_ID_BY_ITEM.ammo[Number(item.id)] || null;
    if (type === "rocket") return FLASH_QUICKBAR_BUTTON_ID_BY_ITEM.rocket[Number(item.id)] || null;
    if (type === "launcherrocket") return FLASH_QUICKBAR_BUTTON_ID_BY_ITEM.launcherRocket[Number(item.id)] || null;
    if (type === "explosive") {
        const code = String(item.code || "").toUpperCase();
        return FLASH_QUICKBAR_BUTTON_ID_BY_ITEM.explosive[code] || null;
    }
    if (type === "tech") {
        const code = String(item.code || "").toUpperCase();
        if (code === "RPM" || Number(item.id) === 3) return null;
        if (code && FLASH_QUICKBAR_BUTTON_ID_BY_ITEM.tech[code]) return FLASH_QUICKBAR_BUTTON_ID_BY_ITEM.tech[code];
        return FLASH_QUICKBAR_BUTTON_ID_BY_ITEM.tech[Number(item.id)] || null;
    }
    if (type === "cpu") {
        const code = String(item.code || "").toUpperCase();
        return FLASH_QUICKBAR_BUTTON_ID_BY_ITEM.cpu[code] || null;
    }
    if (type === "buy") {
        const key = String(item.id || "").toLowerCase();
        return FLASH_QUICKBAR_BUTTON_ID_BY_ITEM.buy[key] || null;
    }
    if (type === "ability") {
        const key = String(item.id || item.code || "").toLowerCase();
        return FLASH_QUICKBAR_BUTTON_ID_BY_ITEM.ability[key] || null;
    }
    return null;
}

function flashResolveQuickbarItem(item) {
    const buttonId = flashResolveQuickbarButtonId(item);
    if (!buttonId) return null;
    return flashGetQuickbarDisplayItemByButtonId(buttonId);
}

normalizeQuickbarItem = function(item) {
    return flashResolveQuickbarItem(item);
};

resolveQuickbarCatalogItem = function(item) {
    return flashResolveQuickbarItem(item);
};

getQuickbarIconPath = function(item) {
    const resolved = flashResolveQuickbarItem(item) || item;
    if (!resolved) return null;
    if (typeof flashResolveActionItemIconPath === "function") {
        const resolvedPath = flashResolveActionItemIconPath(resolved, resolved);
        if (resolvedPath) return resolvedPath;
    }
    const lookup = QUICKBAR_ICON_LOOKUP[resolved.type];
    if (!lookup) return resolved.iconPath || null;
    if (resolved.id !== undefined && lookup[resolved.id]) return lookup[resolved.id];
    if (resolved.code !== undefined && lookup[resolved.code]) return lookup[resolved.code];
    return resolved.iconPath || null;
};

function flashSerializeQuickbarSlots() {
    const values = [];
    for (let slot = 1; slot <= 10; slot++) {
        const item = flashResolveQuickbarItem(quickSlots[slot]);
        values.push(item && item.buttonId ? String(item.buttonId) : "-1");
    }
    return values.join(",");
}

saveQuickbarLayout = function() {
    try {
        const data = {};
        for (let slot = 1; slot <= 10; slot++) {
            const item = flashResolveQuickbarItem(quickSlots[slot]);
            if (item && item.buttonId) {
                data[slot] = {
                    buttonId: item.buttonId
                };
            }
        }
        localStorage.setItem("andromeda_quickbar", JSON.stringify(data));
    } catch (e) {
        console.warn("Failed to save quickbar:", e);
    }
    if (typeof flashSendQuickbarSlotsToServer === "function") {
        flashSendQuickbarSlotsToServer();
    }
};

loadQuickbarLayout = function() {
    try {
        for (let slot = 1; slot <= 10; slot++) {
            quickSlots[slot] = null;
        }
        const raw = localStorage.getItem("andromeda_quickbar");
        if (!raw) return;
        const data = JSON.parse(raw);
        let migrated = false;
        for (let slot = 1; slot <= 10; slot++) {
            const resolved = flashResolveQuickbarItem(data && data[slot]);
            if (resolved) {
                quickSlots[slot] = resolved;
            } else if (data && data[slot] !== undefined) {
                migrated = true;
            }
        }
        if (migrated) {
            saveQuickbarLayout();
        }
    } catch (e) {
        console.warn("Failed to load quickbar:", e);
    }
};

function flashApplyQuickbarSlotSettingValue(value) {
    const tokens = String(value == null ? "" : value).split(",");
    for (let slot = 1; slot <= 10; slot++) {
        const token = tokens[slot - 1] != null ? String(tokens[slot - 1]).trim() : "-1";
        const numeric = parseInt(token, 10);
        quickSlots[slot] = Number.isFinite(numeric) && numeric > 0 ? flashGetQuickbarDisplayItemByButtonId(numeric) : null;
    }
    try {
        localStorage.setItem("andromeda_quickbar", JSON.stringify(Object.fromEntries(Object.entries(quickSlots).filter(([, item]) => item && item.buttonId).map(([slot, item]) => [slot, { buttonId: item.buttonId }]))));
    } catch (_) {}
    if (typeof renderActionDrawerItems === "function" && document.getElementById("actionDrawerContainer")) {
        renderActionDrawerItems();
    }
    if (typeof drawQuickbar === "function") {
        drawQuickbar();
    }
}

function flashApplyQuickbarPositionSettingValue(value) {
    const parts = String(value == null ? "" : value).split(",");
    const x = parseInt(parts[0] || "", 10);
    const y = parseInt(parts[1] || "", 10);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    quickbarPosition.x = x;
    quickbarPosition.y = y;
    quickbarInitialized = true;
    quickbarLastValidPosition = { x: x, y: y };
    if (typeof drawQuickbar === "function") {
        drawQuickbar();
    }
}

function flashApplyQuickbarOrderSettingValue(value) {
    const order = parseInt(value, 10);
    if (!Number.isFinite(order) || order < 0 || order > 3) return;
    quickbarLayoutMode = order;
    if (typeof drawQuickbar === "function") {
        drawQuickbar();
    }
}

function flashSendQuickbarSlotsToServer() {
    if (typeof sendSetting !== "function") return;
    sendSetting("QUICKBAR_SLOT", flashSerializeQuickbarSlots());
}

function flashSendQuickbarPositionToServer() {
    if (typeof sendSetting !== "function") return;
    sendSetting(`SLOTMENU_POSITION,${flashGetQuickbarResolutionId()}`, `${Math.round(quickbarPosition.x)},${Math.round(quickbarPosition.y)}`);
}

function flashSendQuickbarOrderToServer() {
    if (typeof sendSetting !== "function") return;
    sendSetting(`SLOTMENU_ORDER,${flashGetQuickbarResolutionId()}`, String(quickbarLayoutMode));
}

function flashSetQuickSlotStopAttack(value) {
    const numeric = parseInt(value, 10);
    window.quickSlotStopAttack = Number.isFinite(numeric) ? numeric === 1 : !!value;
}

function flashPlayQuickbarSlotMoveSound() {
    try {
        if (window.AudioManager && typeof window.AudioManager.playSoundEffect === "function") {
            window.AudioManager.playSoundEffect(33, false, false, -1, -1, true);
        }
    } catch (_) {}
}

function flashCanCustomizeQuickbarItem(item) {
    const resolved = flashResolveQuickbarItem(item);
    if (!resolved) return false;
    return Number(resolved.buttonId) > 0 && String(resolved.tagName || "actionButton").toLowerCase() === "actionbutton";
}

function flashCreateQuickbarDragProxy(item) {
    flashRemoveQuickbarDragProxy();
    if (!item) return;
    const proxy = document.createElement("div");
    const iconPath = typeof flashResolveActionItemIconPath === "function" ? flashResolveActionItemIconPath(item, item) : (item.iconPath || "");
    proxy.id = "flashQuickbarDragProxy";
    proxy.style.position = "fixed";
    proxy.style.left = "0";
    proxy.style.top = "0";
    proxy.style.width = `${FLASH_QUICKBAR_SLOT_WIDTH}px`;
    proxy.style.height = `${FLASH_QUICKBAR_SLOT_HEIGHT}px`;
    proxy.style.pointerEvents = "none";
    proxy.style.zIndex = "99999";
    proxy.style.opacity = "0.92";
    proxy.style.transform = "translate(-50%, -50%)";
    proxy.style.backgroundImage = typeof getUiCssUrl === "function" ? getUiCssUrl(FLASH_ACTION_MENU_SLOT_BG) : `url('${FLASH_ACTION_MENU_SLOT_BG}')`;
    proxy.style.backgroundRepeat = "no-repeat";
    proxy.style.backgroundSize = "100% 100%";
    if (iconPath) {
        const icon = document.createElement("img");
        icon.src = typeof resolveUiImageUrl === "function" ? (resolveUiImageUrl(iconPath) || iconPath) : iconPath;
        icon.style.position = "absolute";
        icon.style.left = "0";
        icon.style.top = "0";
        icon.style.width = `${FLASH_QUICKBAR_SLOT_WIDTH}px`;
        icon.style.height = `${FLASH_QUICKBAR_SLOT_HEIGHT}px`;
        icon.style.pointerEvents = "none";
        proxy.appendChild(icon);
    }
    document.body.appendChild(proxy);
    quickbarDragProxy = proxy;
}

function flashMoveQuickbarDragProxy(clientX, clientY) {
    if (!quickbarDragProxy) return;
    quickbarDragProxy.style.left = `${clientX}px`;
    quickbarDragProxy.style.top = `${clientY}px`;
}

function flashRemoveQuickbarDragProxy() {
    if (!quickbarDragProxy) return;
    try {
        quickbarDragProxy.remove();
    } catch (_) {
        if (quickbarDragProxy.parentNode) {
            quickbarDragProxy.parentNode.removeChild(quickbarDragProxy);
        }
    }
    quickbarDragProxy = null;
}

function flashGetQuickbarSlotAtScreenPoint(screenX, screenY) {
    for (let slot = 1; slot <= 10; slot++) {
        const rect = quickbarSlotHitboxes[slot];
        if (rect && screenX >= rect.x && screenX <= rect.x + rect.w && screenY >= rect.y && screenY <= rect.y + rect.h) {
            return slot;
        }
    }
    return null;
}

function flashBeginQuickbarSlotDrag(slot, context) {
    if (quickbarLocked) return false;
    const item = flashResolveQuickbarItem(quickSlots[slot]);
    if (!flashCanCustomizeQuickbarItem(item)) return false;
    quickbarSlotDragState = {
        slot: slot,
        item: item
    };
    quickbarHoveredSlot = slot;
    flashCreateQuickbarDragProxy(item);
    const clientX = context && Number.isFinite(context.clientX) ? context.clientX : null;
    const clientY = context && Number.isFinite(context.clientY) ? context.clientY : null;
    if (clientX != null && clientY != null) {
        flashMoveQuickbarDragProxy(clientX, clientY);
    }
    if (typeof drawQuickbar === "function") {
        drawQuickbar();
    }
    return true;
}

configureQuickbarSlot = function(slot, context) {
    flashBeginQuickbarSlotDrag(slot, context || null);
};

function updateQuickbarHoverState(screenX, screenY, event) {
    quickbarDraggerHovered = !!(quickbarDraggerHitbox && isPointInRect(screenX, screenY, quickbarDraggerHitbox));
    quickbarRotateHovered = !!(quickbarRotateHitbox && isPointInRect(screenX, screenY, quickbarRotateHitbox));
    const hoveredSlot = flashGetQuickbarSlotAtScreenPoint(screenX, screenY) || 0;
    if (!quickbarSlotDragState && !draggedActionItem) {
        quickbarHoveredSlot = hoveredSlot;
    } else {
        quickbarHoveredSlot = hoveredSlot;
    }
    if (quickbarSlotDragState) {
        if (event && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
            flashMoveQuickbarDragProxy(event.clientX, event.clientY);
        }
        if (typeof drawQuickbar === "function") {
            drawQuickbar();
        }
        return "grabbing";
    }
    if (!quickbarLocked && hoveredSlot && flashCanCustomizeQuickbarItem(quickSlots[hoveredSlot])) {
        return "grab";
    }
    return quickbarDraggerHovered ? "move" : (quickbarRotateHovered ? "pointer" : "");
}

function finishQuickbarInteraction(event) {
    if (quickbarSlotDragState) {
        const screenX = typeof getLogicalPointerPosition === "function" && event ? getLogicalPointerPosition(event).x : (typeof lastMouseScreenX === "number" ? lastMouseScreenX : 0);
        const screenY = typeof getLogicalPointerPosition === "function" && event ? getLogicalPointerPosition(event).y : (typeof lastMouseScreenY === "number" ? lastMouseScreenY : 0);
        const targetSlot = flashGetQuickbarSlotAtScreenPoint(screenX, screenY);
        const sourceSlot = quickbarSlotDragState.slot;
        const item = quickbarSlotDragState.item;
        if (targetSlot != null) {
            if (targetSlot !== sourceSlot) {
                quickSlots[targetSlot] = item;
                quickSlots[sourceSlot] = null;
            }
        } else {
            quickSlots[sourceSlot] = null;
        }
        quickbarSlotDragState = null;
        quickbarHoveredSlot = 0;
        flashRemoveQuickbarDragProxy();
        saveQuickbarLayout();
        if (typeof renderActionDrawerItems === "function" && document.getElementById("actionDrawerContainer")) {
            renderActionDrawerItems();
        }
        if (typeof drawQuickbar === "function") {
            drawQuickbar();
        }
    }
    if (isDraggingQuickbar) {
        if (flashQuickbarAnchorIsValid(quickbarPosition.x, quickbarPosition.y)) {
            quickbarLastValidPosition = {
                x: quickbarPosition.x,
                y: quickbarPosition.y
            };
            flashSendQuickbarPositionToServer();
        } else {
            quickbarPosition.x = quickbarLastValidPosition.x;
            quickbarPosition.y = quickbarLastValidPosition.y;
        }
        if (typeof drawQuickbar === "function") {
            drawQuickbar();
        }
    }
}

const __flashOriginalExecuteItemActionDirectly = executeItemActionDirectly;

function flashHeroHasActiveLaserAttack() {
    return currentLaserTargetId != null || attackIntentTargetId != null || confirmedAttackTargetId != null || pendingAttackAckTargetId != null;
}

function flashToggleOrStartLaserOnSelectedTarget() {
    if (selectedTargetId == null) return false;
    if (typeof toggleLaserOnSelectedTarget === "function") {
        toggleLaserOnSelectedTarget();
    } else {
        sendLaserAttack(selectedTargetId);
        isChasingTarget = false;
    }
    return true;
}

executeItemActionDirectly = function(item, options = {}) {
    const resolvedItem = flashResolveQuickbarItem(item) || item;
    const source = String(options && options.source ? options.source : "").toLowerCase();
    if (resolvedItem && resolvedItem.type === "ammo") {
        const previousAmmoId = Number(currentAmmoId) || 0;
        const nextAmmoId = Number(resolvedItem.id) || 0;
        if (nextAmmoId <= 0) return false;
        const isRsbAmmo = nextAmmoId === Number(RSB_AMMO_ID);
        if (flashShouldSendAmmoSelection(nextAmmoId)) {
            sendSelectAmmo(nextAmmoId);
        }
        if (selectedTargetId == null) {
            return true;
        }
        if (isRsbAmmo) {
            return true;
        }
        const switchingAwayFromRsb = previousAmmoId === Number(RSB_AMMO_ID) && nextAmmoId !== Number(RSB_AMMO_ID);
        if (switchingAwayFromRsb) {
            sendLaserAttack(selectedTargetId);
            isChasingTarget = false;
            return true;
        }
        if (source === "menu-trigger") {
            return flashToggleOrStartLaserOnSelectedTarget();
        }
        if (source === "quickbar" && !!window.quickSlotStopAttack) {
            const sameAmmo = previousAmmoId === nextAmmoId;
            if (sameAmmo || !flashHeroHasActiveLaserAttack()) {
                return flashToggleOrStartLaserOnSelectedTarget();
            }
        }
        return true;
    }
    if (resolvedItem && resolvedItem.type === "rocket") {
        if (currentRocketId !== resolvedItem.id) {
            sendSelectRocket(resolvedItem.id);
        }
        if (selectedTargetId != null && (source === "menu-trigger" || source === "quickbar" && !!window.quickSlotStopAttack)) {
            sendRocketAttack(selectedTargetId);
        }
        return true;
    }
    return __flashOriginalExecuteItemActionDirectly(resolvedItem, options);
};

initDragAndDrop = function() {
    const cvs = document.getElementById("gameCanvas");
    if (!cvs) return;
    if (cvs.__flashQuickbarDragDropInit) return;
    cvs.__flashQuickbarDragDropInit = true;
    cvs.addEventListener("dragover", e => {
        e.preventDefault();
        if (!draggedActionItem || quickbarLocked) return;
        const rect = cvs.getBoundingClientRect();
        const scaleX = rect.width ? cvs.width / rect.width : 1;
        const scaleY = rect.height ? cvs.height / rect.height : 1;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        quickbarHoveredSlot = flashGetQuickbarSlotAtScreenPoint(mouseX, mouseY) || 0;
        if (typeof drawQuickbar === "function") {
            drawQuickbar();
        }
    });
    cvs.addEventListener("dragleave", () => {
        if (quickbarHoveredSlot) {
            quickbarHoveredSlot = 0;
            if (typeof drawQuickbar === "function") {
                drawQuickbar();
            }
        }
    });
    cvs.addEventListener("drop", e => {
        e.preventDefault();
        if (!draggedActionItem || quickbarLocked) return;
        const rect = cvs.getBoundingClientRect();
        const scaleX = rect.width ? cvs.width / rect.width : 1;
        const scaleY = rect.height ? cvs.height / rect.height : 1;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        const foundSlot = flashGetQuickbarSlotAtScreenPoint(mouseX, mouseY);
        if (foundSlot) {
            const item = flashResolveQuickbarItem(draggedActionItem);
            if (item) {
                quickSlots[foundSlot] = item;
                addInfoMessage(`Slot ${foundSlot} set: ${item.label || item.code || item.buttonId}`);
                saveQuickbarLayout();
            }
        }
        quickbarHoveredSlot = 0;
        draggedActionItem = null;
        if (typeof renderActionDrawerItems === "function" && document.getElementById("actionDrawerContainer")) {
            renderActionDrawerItems();
        }
        if (typeof drawQuickbar === "function") {
            drawQuickbar();
        }
    });
};

const __flashOriginalUpdateActionDrawerItemBox = flashUpdateActionDrawerItemBox;
flashUpdateActionDrawerItemBox = function(div, item, index, category, hasActivateButton) {
    __flashOriginalUpdateActionDrawerItemBox(div, item, index, category, hasActivateButton);
    const canDrag = !quickbarLocked && flashCanCustomizeQuickbarItem(item) && !flashGetActionMenuCooldownInfo(item);
    div.draggable = !!canDrag;
    if (canDrag) {
        div.ondragstart = e => {
            draggedActionItem = flashResolveQuickbarItem(item);
            if (!draggedActionItem) return;
            if (e.dataTransfer) {
                try {
                    e.dataTransfer.effectAllowed = "copy";
                    e.dataTransfer.setData("text/plain", String(draggedActionItem.buttonId || ""));
                } catch (_) {}
            }
        };
        div.ondragend = () => {
            draggedActionItem = null;
            quickbarHoveredSlot = 0;
            if (typeof drawQuickbar === "function") {
                drawQuickbar();
            }
        };
    } else {
        div.ondragstart = null;
        div.ondragend = null;
    }
};

Object.keys(keyBindings).forEach(key => delete keyBindings[key]);
Object.assign(keyBindings, {
    Digit1: 1,
    Digit2: 2,
    Digit3: 3,
    Digit4: 4,
    Digit5: 5,
    Digit6: 6,
    Digit7: 7,
    Digit8: 8,
    Digit9: 9,
    Digit0: 10,
    Numpad1: 1,
    Numpad2: 2,
    Numpad3: 3,
    Numpad4: 4,
    Numpad5: 5,
    Numpad6: 6,
    Numpad7: 7,
    Numpad8: 8,
    Numpad9: 9,
    Numpad0: 10
});

window.flashApplyQuickbarSlotSettingValue = flashApplyQuickbarSlotSettingValue;
window.flashApplyQuickbarPositionSettingValue = flashApplyQuickbarPositionSettingValue;
window.flashApplyQuickbarOrderSettingValue = flashApplyQuickbarOrderSettingValue;
window.flashSendQuickbarSlotsToServer = flashSendQuickbarSlotsToServer;
window.flashSendQuickbarPositionToServer = flashSendQuickbarPositionToServer;
window.flashSendQuickbarOrderToServer = flashSendQuickbarOrderToServer;
window.flashSetQuickSlotStopAttack = flashSetQuickSlotStopAttack;
window.flashPlayQuickbarSlotMoveSound = flashPlayQuickbarSlotMoveSound;
window.flashCanCustomizeQuickbarItem = flashCanCustomizeQuickbarItem;
window.flashEnsureQuickbarPositionInitialized = flashEnsureQuickbarPositionInitialized;
window.flashGetQuickbarSlotPoints = flashGetQuickbarSlotPoints;
window.flashGetQuickbarLayoutBounds = flashGetQuickbarLayoutBounds;
window.flashResolveQuickbarItem = flashResolveQuickbarItem;
window.updateQuickbarHoverState = updateQuickbarHoverState;
window.finishQuickbarInteraction = finishQuickbarInteraction;
window.configureQuickbarSlot = configureQuickbarSlot;

loadQuickbarLayout();
flashEnsureQuickbarPositionInitialized();
if (typeof renderActionDrawerItems === "function" && document.getElementById("actionDrawerContainer")) {
    renderActionDrawerItems();
}
