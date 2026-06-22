













// ===================================================================
//  CLIENT HTML5 ANDROMEDA - VERSION FINALE (Fix Cargo/Loot/Explo/Factions)
// ===================================================================

console.log("ANDROMEDA_CONFIG =", window.ANDROMEDA_CONFIG);

    // Résolution logique fixe (le jeu "pense" toujours être en 1920x1080)
    const LOGICAL_WIDTH = 1920;
    const LOGICAL_HEIGHT = 1080;

    // Le monde logique est toujours référencé sur 1920x1080 (équivalent Stage Flash).

    // -------------------------------------------------
    // 0. CONFIG
    // -------------------------------------------------
    const cfg = window.ANDROMEDA_CONFIG || {};

    // Bornes de la map (comme côté serveur)
    const STD_MAP_WIDTH = 21000;
    const STD_MAP_HEIGHT = 13100;

    const MAP_MIN_X = 0;
    let MAP_MAX_X = STD_MAP_WIDTH;
    const MAP_MIN_Y = 0;
    let MAP_MAX_Y = STD_MAP_HEIGHT;

    let MAP_WIDTH  = MAP_MAX_X - MAP_MIN_X;
    let MAP_HEIGHT = MAP_MAX_Y - MAP_MIN_Y;

    const STARFIELD_IDLE_SPEED = 0.2;
    const STARFIELD_DEFAULT_COLOR = 0xffffff;
    const STARFIELD_DEFAULT_COUNT = 100;
    const STARFIELD_SPEED_MIN = 0.5;
    const STARFIELD_SPEED_MAX = 3.5;
    const STARFIELD_FPS = 40;
    const DEFAULT_STARFIELD_ENABLED = true;

    // --- Fonds de carte (correspondance mapID -> typeID -> dossier backgroundX) ---
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
    let lastStarfieldAnchor = { x: 0, y: 0 };
    let mapsXmlPromise = null;
    let profileXmlPromise = null;
    let resourcesXmlPromise = null;
    let profileXmlConfig = {
        qualityLowLimit: null,
        intervalLength: null,
        notificationSteps: []
    };
    window.profileXmlConfig = profileXmlConfig;

    function createResourcesManifest(locations, files) {
        const frozenLocations = Object.freeze({ ...locations });
        const frozenFiles = Object.freeze({ ...files });
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
         // Centre logique de la map (utile pour les futurs paquets "m")
    let mapCenterX = (MAP_MIN_X + MAP_MAX_X) / 2;
    let mapCenterY = (MAP_MIN_Y + MAP_MAX_Y) / 2;

    const MINIMAP_MARGIN = 10;
    const MINIMAP_FRAME_PADDING = 8;
    const MINIMAP_HEADER_HEIGHT = 26;
    const MINIMAP_INFO_HEIGHT = 27;
    const MINIMAP_BUTTON_SIZE = 16;
    const MINIMAP_SCALE_MIN = 3;
    const MINIMAP_SCALE_MAX = 11;
    const MINIMAP_SCALE_DEFAULT = 8;

    let MINIMAP_WIDTH  = 0;
    let MINIMAP_HEIGHT = 0;
    let minimapScaleFactor = MINIMAP_SCALE_DEFAULT;
    let minimapPosition = null; // { x, y } = coin supérieur gauche du cadre
    let minimapDragOffset = { x: 0, y: 0 };
    let isDraggingMinimap = false;
    let minimapPositionDirty = false;
    let minimapHitboxes = {
        icon: null,
        zoomIn: null,
        zoomOut: null,
        close: null,
        content: null,
        frame: null
    };
    let minimapHoverState = {
        icon: false,
        header: false,
        zoomIn: false,
        zoomOut: false
    };
    window.showMinimap = true;

    // Échelle de la minimap (équivalent du combinedScaleFactor de l'AS3)
    function getMiniMapScale() {
        // Dans le client Flash, combinedScaleFactor = 1 / (zoomFactor * 10)
        return 1 / (minimapScaleFactor * 10);
    }

    function updateMinimapSize() {
        const scale = getMiniMapScale();
        
        // MODIFICATION : On utilise STD_MAP_WIDTH (21000) au lieu de MAP_WIDTH
        // Cela force la fenêtre à garder une taille standard même sur la 4-4
        MINIMAP_WIDTH  = Math.round(STD_MAP_WIDTH  * scale);
        MINIMAP_HEIGHT = Math.round(STD_MAP_HEIGHT * scale);
    }

    function clampMinimapScale(value) {
        return Math.max(MINIMAP_SCALE_MIN, Math.min(MINIMAP_SCALE_MAX, value));
    }

    function setMinimapScale(newScale, options = {}) {
        const previous = minimapScaleFactor;
        const clamped  = clampMinimapScale(Math.round(newScale));
        minimapScaleFactor = clamped;
        updateMinimapSize();

        if ((clamped !== previous || options.forceSend) && typeof sendSetting === "function") {
            sendSetting('MINIMAP_SCALE', minimapScaleFactor);
        }

        if (options.message) {
            const msg = (typeof options.message === "function")
                ? options.message(minimapScaleFactor, previous)
                : options.message;
            addInfoMessage(msg);
        }

        return { previous, current: minimapScaleFactor, changed: clamped !== previous };
    }

    function zoomMinimapIn() {
        setMinimapScale(minimapScaleFactor - 1);
    }

    function zoomMinimapOut() {
        setMinimapScale(minimapScaleFactor + 1);
    }

    function resetMinimapZoom() {
        setMinimapScale(MINIMAP_SCALE_DEFAULT, { forceSend: true });
        addInfoMessage("Taille minimap réinitialisée");
    }

    function getMinimapLayout(isOpenOverride = null) {
        const isOpen = (isOpenOverride !== null) ? isOpenOverride : (window.showMinimap !== false);
        const contentHeight = isOpen ? MINIMAP_HEIGHT + MINIMAP_INFO_HEIGHT : 0;

        const outerWidth  = MINIMAP_WIDTH + MINIMAP_FRAME_PADDING * 2;
        const outerHeight = MINIMAP_HEADER_HEIGHT + MINIMAP_FRAME_PADDING * 2 + contentHeight;

        if (!minimapPosition) {
            minimapPosition = {
                x: canvas.width  - outerWidth  - MINIMAP_MARGIN,
                y: canvas.height - outerHeight - MINIMAP_MARGIN
            };
        }

        const maxX = canvas.width  - outerWidth - MINIMAP_MARGIN;
        const maxY = canvas.height - outerHeight - MINIMAP_MARGIN;
        minimapPosition.x = Math.min(Math.max(MINIMAP_MARGIN, minimapPosition.x), Math.max(MINIMAP_MARGIN, maxX));
        minimapPosition.y = Math.min(Math.max(MINIMAP_MARGIN, minimapPosition.y), Math.max(MINIMAP_MARGIN, maxY));

        const outerX = minimapPosition.x;
        const outerY = minimapPosition.y;

        const contentX = outerX + MINIMAP_FRAME_PADDING;
        const contentY = outerY + MINIMAP_HEADER_HEIGHT + MINIMAP_FRAME_PADDING;
        const mapY      = contentY + MINIMAP_INFO_HEIGHT;

        return {
            outerX, outerY, outerWidth, outerHeight,
            contentX, contentY, mapY,
            infoHeight: MINIMAP_INFO_HEIGHT,
            headerY: outerY,
            headerHeight: MINIMAP_HEADER_HEIGHT
        };
    }
    window.getMinimapLayout = getMinimapLayout;
    window.getMinimapHoverState = () => minimapHoverState;

    updateMinimapSize();

    // Distance max pour considérer qu'on est "dans" un portail
    const PORTAL_JUMP_DISTANCE = 400;
    const PORTAL_ACTIVE_DURATION = 6000; // durée avant retour à l'animation idle

    // Rayon de vision
    const VIEW_RADIUS = 1600;
    const VIEW_RADIUS_SQ = VIEW_RADIUS * VIEW_RADIUS;
	
	// Rayon de vision MINIMAP
	const MINIMAP_VIEW_RADIUS = 3500; 
    const MINIMAP_VIEW_RADIUS_SQ = MINIMAP_VIEW_RADIUS * MINIMAP_VIEW_RADIUS;
    
    // Portée max du laser
    const LASER_MAX_RANGE = 850;
    const LASER_MAX_RANGE_SQ = LASER_MAX_RANGE * LASER_MAX_RANGE;

    // Radiation zone
    const RADIATION_MARGIN = 2000;

    // Durées visuelles (ms)
    const LASER_BEAM_DURATION    = 150;
    const ROCKET_BEAM_DURATION   = 700;
    const DAMAGE_BUBBLE_DURATION = 1500;
    const EXPLOSION_DURATION     = 700;
    const ISH_DURATION_MS        = 3000;
    const INVINCIBILITY_DURATION_MS = 3000;
    const TARGET_FADE_OVERLAY_ALPHA = 0.45;
    const TARGET_FADE_OVERLAY_RADIUS = 26;

    // Types d'objets (bonus, cargos, etc.)
    const ORE_TYPE_SPRITES = {
        30: "oreRed",     // Prometium (rouge)
        31: "oreBlue",    // Endurium (bleu)
        32: "oreYellow"   // Terbium (jaune)
    };

    const OBJECT_TYPE_META = {
        1:  { label: "CargoBox / SpaceballBox", category: "cargoFree",  kind: "box"  },
        2:  { label: "BonusBox",                category: "bonusBox",   kind: "box"  },
        10: { label: "ShieldBox",               category: "buffBox",    kind: "box"  },
        19: { label: "LifeBox",                 category: "buffBox",    kind: "box"  },
        21: { label: "BootyBox",                category: "bootyBox",   kind: "box"  },
        23: { label: "RedBootyBox",             category: "bootyBox",   kind: "box"  },
        24: { label: "GoldBootyBox",            category: "bootyBox",   kind: "box"  },
        26: { label: "ApocalypseBox",           category: "bootyBox",   kind: "box"  },
        25: { label: "SilverBootyKey",          category: "bootyKey",   kind: "box"  },

        // Minerais collectables (type = CollectablePattern.TYPE_ORE)
        30: { label: "Ore (Prometium)",         category: "ore",        kind: "box", oreSprite: ORE_TYPE_SPRITES[30] },
        31: { label: "Ore (Endurium)",          category: "ore",        kind: "box", oreSprite: ORE_TYPE_SPRITES[31] },
        32: { label: "Ore (Terbium)",           category: "ore",        kind: "box", oreSprite: ORE_TYPE_SPRITES[32] }
    };

    // Visibilité des objets
    const VISIBILITY_SETTINGS = {
        bonusBoxes:      true,
        freeCargo:       true,
        notFreeCargo:    true,
        ore:             true,
        beacons:         true,
        mines:           true,
        others:          true
    };

    // HUD héros
    const HERO_HUD_X = 10;
    const HERO_HUD_Y = 10;
    const HERO_HUD_WIDTH = 260;
    const HERO_HUD_HEIGHT = 110;
    const HERO_REPAIR_BTN_WIDTH = 80;
    const HERO_REPAIR_BTN_HEIGHT = 22;

    // -------------------------------------------------
    // 1. CANVAS & ÉTAT DU JOUEUR
    // -------------------------------------------------
    // --- GROUPE ---
    const groupMembers = {}; // Stocke les membres (id, name, hp, shield...)
    let groupLeaderId = null; // Id du chef de groupe ("nl" côté serveur)
    let groupInvitationBehavior = 0; // Comportement invitations (cf. client Flash)
    let pendingGroupInvite = null; // Stocke une invitation en attente (nom du joueur)
	// Invitations en attente (comme le client Flash)
const groupIncomingInvites = {}; // { [inviterId]: { id, name } }
const groupOutgoingInvites = {}; // { [candidateId]: { id, name } }


    // Ping de groupe (minimap)
    let groupPingMode = false;       // true = prochain clic minimap envoie un ping
    const groupPings  = [];          // liste des pings visibles sur la minimap

	
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

    let clientResolution = { id: 1, width: DEFAULT_LOGICAL_WIDTH, height: DEFAULT_LOGICAL_HEIGHT };
    let worldScale = 1;
    let displayScaleX = 1;
    let displayScaleY = 1;

    const ctx = canvas.getContext("2d");

    function parseClientResolution(raw) {
        if (!raw) return null;
        const parts = String(raw).split(/[|,xX]/).filter(Boolean);
        if (parts.length < 1) return null;
        const id = parseInt(parts[0], 10);
        return {
            id: isNaN(id) ? clientResolution.id : id,
            // On force toujours la résolution logique pour garder un référentiel fixe.
            width: LOGICAL_WIDTH,
            height: LOGICAL_HEIGHT
        };
    }

    function refreshCanvasScale() {
        const logicalW = clientResolution.width || DEFAULT_LOGICAL_WIDTH;
        const logicalH = clientResolution.height || DEFAULT_LOGICAL_HEIGHT;

        // Le canvas garde toujours la résolution logique native.
        if (canvas.width !== logicalW || canvas.height !== logicalH) {
            canvas.width = logicalW;
            canvas.height = logicalH;
        }

        const targetW = window.innerWidth || logicalW;
        const targetH = window.innerHeight || logicalH;
        displayScaleX = (targetW / logicalW) || 1;
        displayScaleY = (targetH / logicalH) || 1;

        // Mise à l'échelle visuelle via CSS : on remplit toujours la fenêtre,
        // même si cela déforme l'image (pas de bandes noires).
        canvas.style.width = `${logicalW * displayScaleX}px`;
        canvas.style.height = `${logicalH * displayScaleY}px`;

        // Échelle logique "Flash-like" du monde (basée sur la résolution native 1920x1080).
        worldScale = Math.min(logicalW / LOGICAL_WIDTH, logicalH / LOGICAL_HEIGHT) || 1;
    }

    function getWorldScaleValue() {
        return (typeof worldScale === "number" && isFinite(worldScale) && worldScale > 0) ? worldScale : 1;
    }

    function getEntityDrawScale() {
        // Les entités suivent la même échelle globale que le monde.
        return 1;
    }

    function applyClientResolution(raw) {
        const parsed = parseClientResolution(raw);
        if (!parsed) return;
        clientResolution = parsed;
        setting_client_resolution = `${parsed.id}|${parsed.width}|${parsed.height}`;
        refreshCanvasScale();
    }

    function updateMapDimensions(scale = 1) {
        mapScaleFactor = scale || 1;

        MAP_MAX_X = STD_MAP_WIDTH * mapScaleFactor;
        MAP_MAX_Y = STD_MAP_HEIGHT * mapScaleFactor;
        MAP_WIDTH  = MAP_MAX_X - MAP_MIN_X;
        MAP_HEIGHT = MAP_MAX_Y - MAP_MIN_Y;

        mapCenterX = (MAP_MIN_X + MAP_MAX_X) / 2;
        mapCenterY = (MAP_MIN_Y + MAP_MAX_Y) / 2;

        updateMinimapSize();
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
        return { x: 0, y: 0 };
    }

    function parseMapsXml(text) {
        try {
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, "text/xml");
            const mapNodes = xml.getElementsByTagName("map");
            const parsed = {};
            mapStarfieldSettingsById = {};

            Array.from(mapNodes).forEach((mapNode) => {
                const mapId = parseInt(mapNode.getAttribute("id"), 10);
                if (Number.isNaN(mapId)) return;

                const starfieldNode = mapNode.getElementsByTagName("starfield")[0];
                if (starfieldNode) {
                    const enabled = parseBooleanValue(starfieldNode.textContent, DEFAULT_STARFIELD_ENABLED);
                    const color = parseColorValue(starfieldNode.getAttribute("color"), STARFIELD_DEFAULT_COLOR);
                    mapStarfieldSettingsById[mapId] = { enabled, color };
                } else {
                    mapStarfieldSettingsById[mapId] = { enabled: DEFAULT_STARFIELD_ENABLED, color: STARFIELD_DEFAULT_COLOR };
                }

                const backgroundsNode = mapNode.getElementsByTagName("backgrounds")[0];
                if (!backgroundsNode) return;

                const layers = [];
                Array.from(backgroundsNode.getElementsByTagName("background")).forEach((bgNode) => {
                    const rawType = bgNode.getAttribute("typeID") || bgNode.getAttribute("type");
                    const typeId = normalizeBackgroundType(rawType);
                    if (typeId == null) return;

                    const layerIndex = parseInt(bgNode.getAttribute("layer"), 10);
                    const pFactorRaw = parseFloat(bgNode.getAttribute("pFactor"));
                    const shiftX = parseFloat(bgNode.getAttribute("shiftX")) || 0;
                    const shiftY = parseFloat(bgNode.getAttribute("shiftY")) || 0;

                    layers.push({
                        typeId,
                        layer: Number.isNaN(layerIndex) ? 0 : layerIndex,
                        parallax: Number.isNaN(pFactorRaw) ? null : pFactorRaw,
                        shiftX,
                        shiftY
                    });
                });

                if (layers.length) {
                    parsed[mapId] = layers;
                }
            });

            return parsed;
        } catch (err) {
            console.warn("Impossible de parser maps.php pour les layers", err);
            return {};
        }
    }

    function ensureMapsXmlLoaded(cfg = {}) {
        if (mapsXmlPromise) return mapsXmlPromise;
        if (typeof fetch !== "function") return Promise.resolve();

        const mapsUrl = cfg.mapsXmlUrl || "../spacemap/xml/maps.php";
        mapsXmlPromise = fetch(mapsUrl)
            .then((resp) => (resp.ok ? resp.text() : Promise.reject(new Error(resp.statusText))))
            .then((text) => {
                mapBackgroundLayersById = parseMapsXml(text);
                if (currentMapId != null) {
                    applyMapBackground(currentMapId, { force: true });
                }
            })
            .catch((err) => {
                console.warn("Chargement maps.php échoué, fallback statique", err);
            });

        return mapsXmlPromise;
    }

    function parseProfileXml(text) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "text/xml");

            const readNumericValue = (selector) => {
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
                    stepNodes.forEach((step) => {
                        const raw = step.getAttribute("value") || step.textContent;
                        const parsed = parseInt(String(raw || "").trim(), 10);
                        if (Number.isFinite(parsed)) notificationSteps.push(parsed);
                    });
                } else if (stepsNode.textContent) {
                    stepsNode.textContent
                        .split(/[,\s]+/)
                        .map((item) => parseInt(item.trim(), 10))
                        .filter((value) => Number.isFinite(value))
                        .forEach((value) => notificationSteps.push(value));
                }
            }

            return {
                qualityLowLimit: readNumericValue("qualityLowLimit"),
                intervalLength: readNumericValue("intervalLength"),
                notificationSteps
            };
        } catch (err) {
            console.warn("[PROFILE] Impossible de parser profile.xml", err);
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
        profileXmlPromise = fetch(profileUrl)
            .then((resp) => (resp.ok ? resp.text() : Promise.reject(new Error(resp.statusText))))
            .then((text) => {
                profileXmlConfig = parseProfileXml(text);
                window.profileXmlConfig = profileXmlConfig;
                return profileXmlConfig;
            })
            .catch((err) => {
                console.warn("[PROFILE] Chargement profile.xml échoué", err);
                return profileXmlConfig;
            });

        return profileXmlPromise;
    }

    function parseResourcesXml(text) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");

        const locations = {};
        xmlDoc.querySelectorAll("location").forEach((locationNode) => {
            const id = locationNode.getAttribute("id");
            const path = locationNode.getAttribute("path");
            if (id && path) {
                locations[id] = path;
            }
        });

        const files = {};
        xmlDoc.querySelectorAll("file").forEach((fileNode) => {
            const id = fileNode.getAttribute("id");
            if (!id) return;
            const locationId = fileNode.getAttribute("location");
            const name = fileNode.getAttribute("name");
            const type = fileNode.getAttribute("type");
            const basePath = locationId && locations[locationId] ? locations[locationId] : "";
            const fileName = [name, type].filter(Boolean).join(".");
            const url = basePath ? `${basePath}${fileName}` : fileName;
            files[id] = Object.freeze({
                id,
                location: locationId || null,
                name: name || null,
                type: type || null,
                url
            });
        });

        return createResourcesManifest(locations, files);
    }

    function loadResourcesXml(cfg = {}) {
        if (resourcesXmlPromise) return resourcesXmlPromise;
        if (typeof fetch !== "function") return Promise.resolve(window.ResourcesManifest);

        const resourcesUrl = cfg.resourcesXmlUrl || "../spacemap/xml/resources.xml";
        resourcesXmlPromise = fetch(resourcesUrl)
            .then((resp) => (resp.ok ? resp.text() : Promise.reject(new Error(resp.statusText))))
            .then((text) => {
                window.ResourcesManifest = parseResourcesXml(text);
                return window.ResourcesManifest;
            })
            .catch((err) => {
                console.warn("[RESOURCES] Chargement resources.xml échoué", err);
                return window.ResourcesManifest;
            });

        return resourcesXmlPromise;
    }

    function recomputeBackgroundOffsets(layer) {
        const { image, parallax, shiftX, shiftY } = layer;
        if (!image || !image.complete || image.width === 0 || image.height === 0) return;

        const effectiveParallax = parallax || DEFAULT_BACKGROUND_PARALLAX;
        const expectedWidth = MAP_WIDTH / effectiveParallax;
        const expectedHeight = MAP_HEIGHT / effectiveParallax;

        const offsetX = Math.round((expectedWidth - image.width) / 2) + shiftX;
        const offsetY = Math.round((expectedHeight - image.height) / 2) + shiftY;

        layer.offsets = { x: offsetX, y: offsetY };
    }

    function loadBackgroundLayer(layer) {
        const path = getBackgroundImagePath(layer.typeId);
        if (!path) {
            layer.image = null;
            layer.offsets = { x: layer.shiftX || 0, y: layer.shiftY || 0 };
            return;
        }

        if (!layer.image || layer.image.__bgPath !== path) {
            const img = new Image();
            img.src = path;
            img.__bgPath = path;
            img.onload = () => recomputeBackgroundOffsets(layer);
            layer.image = img;
        }

        if (layer.image && layer.image.complete) {
            recomputeBackgroundOffsets(layer);
        }
    }

    function setBackgroundLayers(mapId, layers) {
        const shift = getBackgroundShiftForMap(mapId);
        currentBackgroundLayers = layers.map((layer) => ({
            typeId: layer.typeId,
            layer: layer.layer ?? 0,
            parallax: layer.parallax || getBackgroundParallaxForMap(mapId),
            shiftX: (layer.shiftX || 0) + (shift.x || 0),
            shiftY: (layer.shiftY || 0) + (shift.y || 0),
            offsets: { x: 0, y: 0 },
            image: null
        }));

        currentBackgroundLayers.forEach(loadBackgroundLayer);
    }

    function getBackgroundLayersForMap(mapId) {
        const fromXml = mapBackgroundLayersById[mapId];
        if (fromXml && fromXml.length) return fromXml;

        const fallbackType = getBackgroundTypeForMap(mapId);
        if (!fallbackType) return [];

        return [{ typeId: fallbackType, layer: 0, parallax: getBackgroundParallaxForMap(mapId), shiftX: 0, shiftY: 0 }];
    }

    function getStarfieldSettingsForMap(mapId) {
        if (mapStarfieldSettingsById && mapStarfieldSettingsById[mapId]) {
            return mapStarfieldSettingsById[mapId];
        }
        return { enabled: DEFAULT_STARFIELD_ENABLED, color: STARFIELD_DEFAULT_COLOR };
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

    // Désactiver le menu contextuel
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    // Position du vaisseau
    let shipX = 1000;
    let shipY = 1000;
    let heroLastPosX = shipX;
    let heroLastPosY = shipY;
    let heroLastMoveMs = performance.now();

    let logoutControlsLocked = false;

    // Caméra
    let cameraX = shipX;
    let cameraY = shipY;

    // Héros
    let heroId = 0;
    if (window.ANDROMEDA_CONFIG && window.ANDROMEDA_CONFIG.userID) {
        heroId = parseInt(window.ANDROMEDA_CONFIG.userID, 10);
        console.log("[SYSTEM] HeroID forcé via Config PHP : " + heroId);
    } else {
        console.error("[SYSTEM] ERREUR CRITIQUE : ID introuvable !");
    }
	let heroShipId = 0; // ID du modèle de vaisseau (ex: 10 pour Goliath)
    let heroName = "";
    let heroPremium = false;
    let heroClanId = null;
    let heroClanTag = "";
    let heroGrade = "";
    let heroRankId = 0;
    let heroGalaxyGatesFinished = 0;
    let heroInvisible = false;
    let heroConfig = 1;
    let heroExpansionTypeId = 0;
    let heroLaserSalvoIndex = 0;
    let currentAmmoId = null;
    let primaryAmmoId = null; // Munition principale (hors RSB) sélectionnée par le joueur
    let currentRocketId = null;
    let rsbPreviousAmmoId = null;
    let rsbReturnTimer = null;
    const RSB_AMMO_ID = 6;
    let RSB_BURST_DURATION_MS = 800; // Durée de la rafale RSB (visuel + fenêtre de retour)
	let SAB_SHOT_DURATION_MS = 1000;
let setting_show_drones = true;
let setting_show_player_names = true;
let setting_play_sfx = true;
let setting_play_music = true;
let setting_client_resolution = "ID,W,H"; 
let isChasingTarget = false; // Est-ce qu'on poursuit une cible ?

// Stock de munitions complet (Basé sur les IDs standards Flash / émulateur)
let ammoStock = {
    // Lasers (catalogue Flash : batteryNames[1..6])
    1: 0,  // LCB-10 (x1)
    2: 0,  // MCB-25 (x2)
    3: 0,  // MCB-50 (x3)
    4: 0,  // UCB-100 (x4)
    5: 0,  // SAB-50
    6: 0,  // RSB-75
    101: 0, // CBO-100 (slot spécial combo)
    102: 0, // JOB-100 (lasers aliens)

    // Roquettes (RocketPattern 1..10)
    9: 0,   // R-310
    10: 0,  // PLT-2026
    11: 0,  // PLT-2021
    12: 0,  // PLT-3030
    13: 0,  // PLD-8
    14: 0,  // WIZ-X
    15: 0,  // HSTRM-01
    16: 0,  // UBR-100
    17: 0,  // ECO-10
    18: 0,  // DCR-250
    19: 0,  // SAR-02 (spéciale absorb bouclier)

    // Mines et spéciaux (explosive_names 1..10)
    20: 0, // ACM-01
    21: 0, // EMPM-01
    22: 0, // SABM-01
    23: 0, // DDM-01
    24: 0, // FWX-S
    25: 0, // FWX-M
    26: 0, // FWX-L

    // Charges spéciales / CPU consommables
    30: 0, // EMP-01
    31: 0, // ISH-01
    32: 0  // SMB-01
};

// --- Fonction de mise à jour de l'état (essentielle pour le paquet 7) ---
function updateLocalSetting(key, value) {
    const val = parseInt(value, 10);

    switch (key) {
        case 'SHOW_DRONES':
            setting_show_drones = (val === 1);
            break;
        case 'DISPLAY_PLAYER_NAMES':
            setting_show_player_names = (val === 1);
            break;
        case 'PLAY_SFX':
            setting_play_sfx = (val === 1);
            break;
        case 'PLAY_MUSIC':
            setting_play_music = (val === 1);
            break;
        case 'CLIENT_RESOLUTION':
            setting_client_resolution = value;
            break;
        default:
            // Laisse les autres paramètres non gérés
            break;
    }
}
    
    // Variable globale pour stocker la faction du joueur (1=MMO, 2=EIC, 3=VRU)
    window.heroFactionId = 0;

    // États temporaires liés aux CPU / tech
    let heroIshActive   = false;
    let heroIshUntil    = 0;
    let heroIshSince    = 0;
    let heroInvincible  = false;
    let heroInvUntil    = 0;
    let heroInvSince    = 0;
	let heroShieldBackupUntil = 0; // Timer pour le Shield Backup
    let heroEmpActive   = false;
    let heroEmpImmunityUntil = 0;
    let lastHeroEmpActivationAt = 0;
    let heroCloaked     = false;
    let heroTargetFaded = false;
    let heroTargetFadeUntil = 0;
    
    // Infos CPU (HM7 / Trade Drone, etc.) côté client
    const cpuItems = {
        HM7: {
            hasItem: false,
            amount: 0
        }
    };
	

    // HP / SHD du héros
    let heroHp = null;
    let groupInvitesBlocked = false; // false = on accepte les invitations (par défaut)
    let heroMaxHp = null;
    let heroShield = null;
    let heroMaxShield = null;
    let heroRepairing = false;
    let heroBattleRepairing = false;
    let heroBattleRepairUntil = 0;
	let heroBattleRepairFadeUntil = 0;
const BATTLE_REPAIR_FADE_MS = 500;
    let healthStationActive = false;
    let heroCargo = null;
    let heroMaxCargo = null;
    let heroShieldDamageCount = 0;
    let heroFastRepair = 0;

    function setHeroRepairing(active) {
        const next = !!active;
        if (heroRepairing === next) return;

        heroRepairing = next;
        if (next) {
            if (typeof startRepairRobotAnimation === "function") {
                startRepairRobotAnimation();
            }
        } else if (typeof stopRepairRobotAnimation === "function") {
            stopRepairRobotAnimation();
        }
    }

    function setHeroBattleRepairing(active, durationMs = null) {
    const next = !!active;
    const now = performance.now();

    // Si l'état ne change pas, on ne redémarre JAMAIS l'animation.
    // (On peut éventuellement prolonger une durée si elle existe.)
    if (heroBattleRepairing === next) {
        if (next && Number.isFinite(durationMs) && durationMs > 0) {
            const newUntil = now + durationMs;
            heroBattleRepairUntil = heroBattleRepairUntil ? Math.max(heroBattleRepairUntil, newUntil) : newUntil;
        }
        return;
    }

    if (next) {
        // Activation
        heroBattleRepairing = true;
        heroBattleRepairFadeUntil = 0;
        heroBattleRepairUntil = Number.isFinite(durationMs) && durationMs > 0 ? now + durationMs : 0;

        if (typeof startBattleRepairRobotAnimation === "function") {
            startBattleRepairRobotAnimation();
        }
    } else {
        // Désactivation (on imite Flash: fade-out 0.5s au lieu d'un stop net)
        heroBattleRepairing = false;
        heroBattleRepairUntil = 0;
        heroBattleRepairFadeUntil = now + BATTLE_REPAIR_FADE_MS;

        // IMPORTANT: on ne coupe pas l'animation ici.
        // drawBattleRepairRobot s'occupe d'afficher pendant le fade puis d'arrêter.
    }
}

    
    // Stats Économie
    let heroLevel   = 1;
    let heroXp      = 0;
    let heroHonor   = 0;
    let heroCredits = 0;
    let heroUridium = 0;
	let heroJackpot   = 0;
    let heroBootyKeys = 0;

    // Estimation vitesse héro
    let heroSpeed = (cfg.heroSpeed !== undefined) ? Number(cfg.heroSpeed) || 3000 : 3000;
	
	// Orientation du vaisseau du héros (en radians, 0 = vers la droite)
	let heroAngle = 0;


    // État map
    let mapPvpAllowed  = 1; // 1 = PVP ON
    let mapHomeFaction = 0; // 0 = neutre
    currentMapId   = cfg.mapID || 0;
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

    // --- Quickbar (barre 1-0 configurable avec cadenas) ---
	
	// --- ÉTAT VISUEL QUICKBAR ---
let quickbarPosition = { x: 0, y: 0 }; // Sera initialisé au premier rendu
let quickbarLayoutMode = 0;          
let isDraggingQuickbar = false;
let quickbarDragOffset = { x: 0, y: 0 };
let quickbarRotateHitbox = null;       // Zone du bouton rotation
let quickbarInitialized = false;       // Pour centrer au premier lancement
let quickbarMinimized = false;     // État réduit ou non
let quickbarMinHitbox = null;      // Zone du bouton réduire (-)
let quickbarDraggerHitbox = null;  // Zone du dragger (déplacement)
let activeTooltip = null;          // { text: "x1", x: 100, y: 100 } ou null

// Layout courant des 10 slots (valeurs par défaut)
let quickSlots = {
    1:  { type: "ammo",   id: 1 },   // x1
    2:  { type: "ammo",   id: 2 },   // x2
    3:  { type: "ammo",   id: 3 },   // x3
    4:  { type: "ammo",   id: 4 },   // x4
    5:  { type: "tech",   id: 1 },   // T1
    6:  { type: "tech",   id: 2 },   // T2
    7:  { type: "rocket", id: 1 },   // R1
    8:  { type: "rocket", id: 2 },   // R2
    9:  { type: "cpu",    code: "ISH" },
    10: { type: "cpu",    code: "SMB" }
};

// Variable pour stocker l'item en cours de glissement
    let draggedActionItem = null;

// État du cadenas : true = verrouillé (comme dans ton Flash)
let quickbarLocked = true;

// Hitboxes pour gérer les clics souris sur la barre
let quickbarBounds         = null;  // rectangle global
let quickbarLockHitbox     = null;  // icône cadenas
const quickbarSlotHitboxes = {};    // par numéro de slot

// Raccourcis clavier → numéro de slot
let keyBindings = {
    "Digit1": 1, "Digit2": 2, "Digit3": 3, "Digit4": 4, "Digit5": 5,
    "Digit6": 6, "Digit7": 7, "Digit8": 8, "Digit9": 9, "Digit0": 10,
    "F1": 5, "F2": 6, "F5": 9, "F6": 10,
};

// Cooldowns et blacklist d’actions (client-side)
const ACTION_COOLDOWN_STORAGE_KEY = "andromeda_action_cooldowns";
const actionCooldowns = {};        // code d’action -> { duration, endTime }
const actionBlacklist = new Set(); // codes d’actions temporairement interdites
const techCooldowns = {};          // index -> état brute TX

function restorePersistedCooldowns() {
    try {
        const raw = localStorage.getItem(ACTION_COOLDOWN_STORAGE_KEY);
        if (!raw) return;

        const stored = JSON.parse(raw);
        const nowSeconds = Date.now() / 1000;

        Object.keys(stored || {}).forEach(code => {
            const entry = stored[code];
            if (!entry || typeof entry.endTime !== "number") return;

            const remaining = entry.endTime - nowSeconds;
            const total = entry.duration || remaining;

            if (remaining > 0 && total > 0) {
                actionCooldowns[code] = { endTime: nowSeconds + remaining, duration: total };
            }
        });

        persistCooldowns();
    } catch (err) {
        console.warn("restorePersistedCooldowns failed", err);
    }
}

function persistCooldowns() {
    try {
        localStorage.setItem(ACTION_COOLDOWN_STORAGE_KEY, JSON.stringify(actionCooldowns));
    } catch (err) {
        console.warn("persistCooldowns failed", err);
    }
}

restorePersistedCooldowns();

// Presets autorisés pour la configuration rapide
const QUICKBAR_PRESETS = {
    "X1":  { type: "ammo",   id: 1 },
    "X2":  { type: "ammo",   id: 2 },
    "X3":  { type: "ammo",   id: 3 },
    "X4":  { type: "ammo",   id: 4 },
    "R1":  { type: "rocket", id: 1 },
    "R2":  { type: "rocket", id: 2 },
    "T1":  { type: "tech",   id: 1 },
    "T2":  { type: "tech",   id: 2 },
    "ISH": { type: "cpu",    code: "ISH" },
    "SMB": { type: "cpu",    code: "SMB" },
    "VIDE": null
};

// SPRITES DE VAISSEAUX & NPC (shipid -> frames)
const SHIP_SPRITE_DEFS = {
    // ---------- VAISSEAUX JOUEUR ----------
    1:  { frameCount: 32, basePath: "graphics/ships/1/"  }, // Phoenix
    3:  { frameCount: 32, basePath: "graphics/ships/3/"  }, // Leonovo
    4:  { frameCount: 32, basePath: "graphics/ships/4/"  }, // Defcom
    5:  { frameCount: 32, basePath: "graphics/ships/5/"  }, // Liberator
    6:  { frameCount: 32, basePath: "graphics/ships/6/"  }, // Piranha
    7:  { frameCount: 32, basePath: "graphics/ships/7/"  }, // Nostromo
    8:  { frameCount: 32, basePath: "graphics/ships/8/"  }, // Vengeance
    9:  { frameCount: 32, basePath: "graphics/ships/9/"  }, // Bigboy
    10: { frameCount: 32, basePath: "graphics/ships/10/" }, // Goliath
    20: { frameCount: 16, basePath: "graphics/ships/20/" }, // Ovni (admin / modo)
    56: { frameCount: 32, basePath: "graphics/ships/56/" }, // Goliath Enforcer
    58: { frameCount: 32, basePath: "graphics/ships/58/" }, // Vengeance Enforcer
    59: { frameCount: 32, basePath: "graphics/ships/59/" }, // Goliath Bastion

    // ---------- NPC "NORMAUX" ----------
    2:  { frameCount: 32, basePath: "graphics/ships/2/"  }, // Streuner
    71: { frameCount: 32, basePath: "graphics/ships/71/" }, // Lordakia
    72: { frameCount: 32, basePath: "graphics/ships/72/" }, // Devolarium
    73: { frameCount: 32, basePath: "graphics/ships/73/" }, // Mordon
    74: { frameCount: 32, basePath: "graphics/ships/74/" }, // Sibelon
    75: { frameCount: 32, basePath: "graphics/ships/75/" }, // Saimon
    76: { frameCount: 20, basePath: "graphics/ships/76/" }, // Sibelonit
    77: { frameCount: 64, basePath: "graphics/ships/77/" }, // Lordakium
    78: { frameCount: 1,  basePath: "graphics/ships/78/" }, // Kristallin
    79: { frameCount: 1,  basePath: "graphics/ships/79/" }, // Kristallon
    80: { frameCount: 1,  basePath: "graphics/ships/80/" }, // Cubikon
    81: { frameCount: 32, basePath: "graphics/ships/81/" }, // Protegit

    // ---------- NPC "BOSS" (même sprite que le normal) ----------
    34: { frameCount: 32, basePath: "graphics/ships/2/"  }, // Boss Streuner  -> Streuner
    36: { frameCount: 32, basePath: "graphics/ships/71/" }, // Boss Lordakia  -> Lordakia
    37: { frameCount: 32, basePath: "graphics/ships/75/" }, // Boss Saimon    -> Saimon
    46: { frameCount: 32, basePath: "graphics/ships/74/" }, // Boss Sibelon   -> Sibelon
    38: { frameCount: 1,  basePath: "graphics/ships/78/" }, // Boss Kristallin -> Kristallin
    35: { frameCount: 1,  basePath: "graphics/ships/79/" }, // Boss Kristallon -> Kristallon
    39: { frameCount: 1,  basePath: "graphics/ships/80/" }  // Boss Cubikon    -> Cubikon
};

// Offsets d'étiquette (labelYOffset) depuis game.xml (valeurs Flash, en pixels)
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
    26: 57,
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
    81: 50
};

// Boss NPCs -> même offset que leur équivalent normal
const SHIP_LABEL_Y_OFFSET_ALIASES = {
    36: 71, // Boss Lordakia -> Lordakia
    37: 75, // Boss Saimon -> Saimon
    38: 78, // Boss Kristallin -> Kristallin
    39: 80  // Boss Cubikon -> Cubikon
};

function getShipLabelYOffset(shipId) {
    const resolvedId = SHIP_LABEL_Y_OFFSET_ALIASES[shipId] || shipId;
    return SHIP_LABEL_Y_OFFSETS[resolvedId] || 0;
}

// Ancrages des expansions issus du client Flash (moyenne des positionsList de game.xml pour chaque class d'expansion)
// Ces offsets recalent le centre d'enregistrement original des SWF (souvent légèrement au-dessus du centre géométrique).
const SHIP_EXPANSION_ANCHORS = {};
const SHIP_EXPANSION_CLASS = {};
const EXPANSION_PATTERNS = {};
const DEFAULT_LASER_SALVOS = [[[{ x: 0, y: 0 }]]];
let expansionPatternsReady = false;
let expansionPatternsLoadPromise = null;

function getShipExpansionAnchor(shipId) {
    return SHIP_EXPANSION_ANCHORS[shipId] || { x: 0, y: 0 };
}

function getShipExpansionClass(shipId) {
    return SHIP_EXPANSION_CLASS[shipId] || 0;
}

function getExpansionPattern(expansionClassId, expansionTypeId) {
    const classPatterns = EXPANSION_PATTERNS[expansionClassId];
    if (!classPatterns) return null;
    const typeId = Number.isFinite(expansionTypeId) ? expansionTypeId : 0;
    return classPatterns[typeId] || classPatterns[0] || null;
}

function getExpansionPatternForStage(expansionClassId, expansionTypeId) {
    const classPatterns = EXPANSION_PATTERNS[expansionClassId];
    if (!classPatterns) return null;
    const typeId = Number.isFinite(expansionTypeId) ? expansionTypeId : 0;
    return classPatterns[typeId] || null;
}

function parseExpansionCoordinatesList(data) {
    if (!data) return [];
    const parts = data.split(",").map(Number);
    const coords = [];
    for (let i = 0; i < parts.length; i += 2) {
        coords.push({ x: parts[i], y: parts[i + 1] });
    }
    return coords;
}

function parseExpansionPatternsFromXml(xmlDoc) {
    if (!xmlDoc) return;
    const expansionsRoot = xmlDoc.querySelector("patterns > expansions") || xmlDoc.querySelector("expansions");
    if (expansionsRoot) {
        const expansionNodes = expansionsRoot.querySelectorAll("expansion");
        expansionNodes.forEach((expansionNode) => {
            const classId = parseInt(expansionNode.getAttribute("class"), 10);
            if (!Number.isFinite(classId)) return;
            if (!EXPANSION_PATTERNS[classId]) {
                EXPANSION_PATTERNS[classId] = {};
            }
            const positionsMap = {};
            expansionNode.querySelectorAll("positionsList").forEach((posNode) => {
                const name = posNode.getAttribute("name");
                const data = posNode.getAttribute("data") || "";
                if (name) {
                    positionsMap[name] = parseExpansionCoordinatesList(data);
                }
            });
            expansionNode.querySelectorAll("stage").forEach((stageNode) => {
                const stageId = parseInt(stageNode.getAttribute("id"), 10);
                if (!Number.isFinite(stageId)) return;
                const salvosData = [];
                stageNode.querySelectorAll("salvo").forEach((salvoNode) => {
                    const lasers = (salvoNode.getAttribute("laser") || "").split(",").map(item => item.trim()).filter(Boolean);
                    const salvo = lasers.map((laserName) => positionsMap[laserName]).filter(Boolean);
                    if (salvo.length > 0) {
                        salvosData.push(salvo);
                    }
                });
                if (salvosData.length > 0) {
                    EXPANSION_PATTERNS[classId][stageId] = {
                        salvosData,
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
    shipNodes.forEach((shipNode) => {
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
    xmlDoc.querySelectorAll("hitpointColors hitpointColor").forEach((node) => {
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
function parsePulseLaserBurstFromXml(xmlDoc) {
    if (!xmlDoc) return;

    // game.xml : <laser class="0" type="6" fireRate="100" attackLength="400" ... />
    const node =
        xmlDoc.querySelector('lasers laser[class="0"][type="6"]') ||
        xmlDoc.querySelector('lasers laser[type="6"]');

    if (!node) return;

    const fireRate = parseInt(node.getAttribute("fireRate") || "", 10);         // ex: 100
    const attackLength = parseInt(node.getAttribute("attackLength") || "", 10); // ex: 400

    const spacingMs = (Number.isFinite(fireRate) && fireRate > 0) ? fireRate : 120;

    // tirs à t=0, t=fireRate, ..., jusqu'à attackLength => +1
    const total = (Number.isFinite(attackLength) && attackLength > 0) ? attackLength : 400;
    const burstCount = Math.max(1, Math.min(20, Math.floor(total / spacingMs) + 1));

    window.RSB_VISUAL_BURST = {
    count: burstCount,
    spacingMs,
    attackLengthMs: total
};

// ✅ Synchronisation automatique du retour RSB sur attackLength
// Exemple game.xml: attackLength=400 / fireRate=100 => retour ≈ 600ms (400 + 100 + 100)
RSB_BURST_DURATION_MS = Math.min(2000, total + spacingMs + 100);

console.log("[XML] RSB burst auto :", window.RSB_VISUAL_BURST);
console.log("[XML] RSB retour auto (ms) =", RSB_BURST_DURATION_MS);

}
function parseSabShotDurationFromXml(xmlDoc) {
    if (!xmlDoc) return;

    // game.xml : <laser class="0" type="5" fireRate="400" ... />
    const node =
        xmlDoc.querySelector('lasers laser[class="0"][type="5"]') ||
        xmlDoc.querySelector('lasers laser[type="5"]');

    if (!node) return;

    const fireRate = parseInt(node.getAttribute("fireRate") || "", 10); // ex: 400
    if (!Number.isFinite(fireRate) || fireRate <= 0) return;

    // ✅ Flash-like : on veut que le rayon reste "continu" (pas de clignotement)
    // Donc on met une durée un peu plus longue que le rythme de tir
    SAB_SHOT_DURATION_MS = Math.min(2500, Math.max(200, fireRate + 50));


    console.log("[XML] SAB duration auto (ms) =", SAB_SHOT_DURATION_MS, "(fireRate:", fireRate + ")");
}

function loadExpansionPatternsFromGameXml() {
    if (expansionPatternsLoadPromise) return expansionPatternsLoadPromise;
    const candidates = [
        "../spacemap/xml/game.xml",
        "/spacemap/xml/game.xml",
        "spacemap/xml/game.xml"
    ];
    expansionPatternsLoadPromise = (async () => {
        for (const url of candidates) {
            try {
                const response = await fetch(url, { cache: "force-cache" });
                if (!response.ok) continue;
                const text = await response.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(text, "text/xml");
                parseExpansionPatternsFromXml(xmlDoc);
                parseHitpointColorsFromXml(xmlDoc);
				parsePulseLaserBurstFromXml(xmlDoc);
				parseSabShotDurationFromXml(xmlDoc);
                expansionPatternsReady = true;
                return true;
            } catch (error) {
                console.warn("[EXPANSION] Échec chargement game.xml :", url, error);
            }
        }
        expansionPatternsReady = false;
        return false;
    })();
    return expansionPatternsLoadPromise;
}

async function bootLoadXmlConfigs(cfg = {}) {
    try {
        await loadExpansionPatternsFromGameXml();
        await ensureMapsXmlLoaded(cfg);
        await loadProfileXml(cfg);
        await loadResourcesXml(cfg);
        return true;
    } catch (err) {
        console.warn("[BOOT] Échec partiel du chargement XML", err);
        return false;
    }
}

window.bootLoadXmlConfigs = bootLoadXmlConfigs;

// Extensions visuelles spécifiques à certains vaisseaux (ex : lasers additionnels Phoenix)
const SHIP_EXPANSION_DEFS = {
    1: {
        frameCount: 32,
        basePath: "graphics/expansions/ship1_Emax/",
        frames: Array.from({ length: 32 }, (_, idx) => idx * 2 + 1),
        offset: getShipExpansionAnchor(1)
    },
    3: {
        frameCount: 32,
        basePath: "graphics/expansions/ship3_Emax/",
        frames: Array.from({ length: 32 }, (_, idx) => idx * 2 + 1),
        offset: getShipExpansionAnchor(3)
    },
    4: {
        frameCount: 32,
        basePath: "graphics/expansions/ship4_Emax/",
        frames: Array.from({ length: 32 }, (_, idx) => idx * 2 + 1),
        offset: getShipExpansionAnchor(4)
    },
    5: {
        frameCount: 32,
        basePath: "graphics/expansions/ship5_Emax/",
        frames: Array.from({ length: 32 }, (_, idx) => idx * 2 + 1),
        offset: getShipExpansionAnchor(5)
    },
    6: {
        frameCount: 32,
        basePath: "graphics/expansions/ship6_Emax/",
        frames: Array.from({ length: 32 }, (_, idx) => idx * 2 + 1),
        offset: getShipExpansionAnchor(6)
    },
    7: {
        frameCount: 32,
        basePath: "graphics/expansions/ship7_Emax/",
        frames: Array.from({ length: 32 }, (_, idx) => idx * 2 + 1),
        offset: getShipExpansionAnchor(7)
    },
    8: {
        frameCount: 32,
        basePath: "graphics/expansions/ship8_Emax/",
        frames: Array.from({ length: 32 }, (_, idx) => idx * 2 + 1),
        offset: getShipExpansionAnchor(8)
    },
    9: {
        frameCount: 32,
        basePath: "graphics/expansions/ship9_Emax/",
        frames: Array.from({ length: 32 }, (_, idx) => idx * 2 + 1),
        offset: getShipExpansionAnchor(9)
    }
};

const ENGINE_ANIM_FPS = 20;
const DEFAULT_ENGINE_KEY = "engine0";
const DEFAULT_ENGINE_SMOKE_KEY = "engineSmoke0";
// Décale le spawn de fumée vers l'arrière (en pixels monde), pour éviter que ça “rentre” dans le ship.
const ENGINE_SMOKE_SPAWN_BACK = 10;

const ENGINE_SPRITE_DEFS = {
    engine0: {
        frameCount: 16,
        basePath: "graphics/engines/engine0/",
        frames: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
        fps: ENGINE_ANIM_FPS,

        // Point du sprite qui doit tomber exactement sur le "thruster point"
        // (0..1) : 0.5 = centre (identique au Flash)
        anchor: { x: 0.5, y: 0.5 },

        // Petit recul pour la fumée (optionnel, mais aide à coller au Flash)
        smokeSpawnOffset: 10
    }
};


const ENGINE_SMOKE_DEFS = {
    engineSmoke0: {
        basePath: "graphics/smoke/engineSmoke0/",
        frames: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41],
        duration: 750,
        spawnInterval: 50,

        // ✅ Comme Flash : pas de "drift" et pas de rotation de la fumée
        drift: 0,
        rotate: false,

        // ✅ ancrage centré
        anchor: { x: 0.5, y: 0.5 }
    }
};


const ROCKET_SMOKE_FPS = 25;
const ROCKET_SMOKE_DEFS = {
    0: {
        basePath: "graphics/smoke/rocketSmoke0/",
        frameCount: 21,
        fps: ROCKET_SMOKE_FPS,
        spawnInterval: 45
    },
    1: {
        basePath: "graphics/smoke/rocketSmoke1/",
        frameCount: 21,
        fps: ROCKET_SMOKE_FPS,
        spawnInterval: 45
    },
    2: {
        basePath: "graphics/smoke/rocketSmoke2/",
        frameCount: 21,
        fps: ROCKET_SMOKE_FPS,
        spawnInterval: 45
    }
};

const ROCKET_SMOKE_BY_ID = {
    1: 0,  // R-310
    9: 0,  // ECO-10
    10: 0, // DCR-250
    2: 1,  // PLT-2026
    7: 1,  // HSTRM-01
    3: 2,  // PLT-2021
    8: 2   // UBR-100
};

// Liste des classes d'offset moteur par shipId (issu de full_merge_as / game.xml)
const SHIP_ENGINE_CLASS = {
    1: 1,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    9: 9,
    10: 10,
    56: 10,
    58: 8,
    59: 10,

    // NPC utilisant l'offset Streuner du client Flash
    2: 84,
    34: 85,

    // Pirates avec moteur visible
    113: 113, // Saboteur
    114: 114, // Annihilator
    115: 115  // Battleray
};

// Offsets moteur exacts par classe / frame (32 directions)
// Données copiées depuis game.xml / main.swf (voir FULL_MERGE_AS.txt)
const ENGINE_POSITION_CLASSES = {
    1: [parseEnginePositions("25.4,-2.4,25.1,1.0,23.5,4.4,21.2,7.6,18.3,10.2,14.2,12.5,10.0,14.1,5.3,15.1,0.2,15.6,-4.4,15.1,-9.5,14.3,-13.5,12.5,-17.7,10.4,-20.9,7.8,-23.2,4.7,-24.7,1.3,-25.2,-2.1,-24.5,-5.7,-23.0,-9.1,-21.1,-12.1,-17.7,-14.9,-14.1,-17.0,-9.6,-18.8,-4.7,-19.8,0.0,-20.1,5.0,-19.9,9.7,-18.8,14.1,-17.2,17.9,-14.9,21.0,-12.3,23.3,-9.2,24.7,-5.8")],
    2: [parseEnginePositions("42.7,-5.2,41.7,0.7,39.4,6.3,35.4,11.5,30.4,16.0,23.8,19.8,16.3,22.6,8.5,24.3,0.1,24.9,-8.0,24.3,-16.2,22.6,-23.3,19.8,-29.7,16.0,-35.0,11.5,-39.1,6.4,-41.4,0.7,-42.1,-5.2,-41.4,-11.1,-38.9,-16.7,-35.1,-21.9,-29.9,-26.4,-23.3,-30.2,-16.0,-33.0,-8.0,-34.6,0.1,-35.2,8.5,-34.6,16.5,-33.0,23.8,-30.2,30.2,-26.4,35.6,-21.9,39.6,-16.7,42.0,-11.1")],
    3: [parseEnginePositions("33.9,0.8,33.4,5.5,31.3,10.1,28.3,14.2,24.1,17.9,18.7,20.9,13.0,23.1,6.6,24.4,0.3,24.8,-6.6,24.5,-12.9,23.1,-18.7,20.8,-23.8,17.9,-28.1,14.3,-31.1,9.9,-33.0,5.5,-33.6,0.8,-33.0,-3.9,-31.3,-8.3,-28.0,-12.4,-23.8,-16.0,-18.7,-19.0,-12.9,-21.2,-6.5,-22.6,0.3,-23.2,6.7,-22.6,13.0,-21.2,18.8,-19.0,24.0,-16.1,28.2,-12.4,31.5,-8.3,33.4,-3.9")],
    4: [parseEnginePositions("31.3,-2.9,30.7,1.4,29.0,5.5,26.0,9.4,22.2,12.7,17.7,15.4,12.5,17.5,6.4,18.9,0.5,19.3,-5.5,18.9,-11.3,17.7,-16.9,15.8,-21.7,13.1,-25.5,9.8,-28.1,6.0,-30.0,1.8,-30.9,-2.3,-30.3,-6.6,-28.7,-10.7,-25.7,-14.6,-21.9,-17.9,-17.4,-20.6,-12.1,-22.7,-6.1,-24.1,-0.2,-24.5,5.8,-24.1,11.6,-22.8,17.3,-21.0,22.0,-18.3,25.9,-15.0,28.5,-11.1,30.3,-7.0")],
    5: [parseEnginePositions("30.8,1.5,30.3,5.7,28.5,9.7,25.8,13.5,22.0,16.7,17.1,19.5,11.8,21.5,6.1,22.7,0.5,23.0,-5.7,22.7,-11.4,21.5,-16.7,19.5,-21.2,16.7,-25.0,13.5,-27.7,9.7,-29.5,5.7,-30.0,1.5,-29.6,-2.6,-27.7,-6.8,-24.7,-10.5,-21.0,-13.8,-16.8,-16.3,-11.4,-18.3,-5.7,-19.5,0.3,-20.0,6.1,-19.5,11.8,-18.3,16.9,-16.3,22.0,-13.8,25.8,-10.5,28.5,-6.8,30.0,-2.6")],
    6: [parseEnginePositions("56.2,-8.5,55.4,-0.9,52.1,6.7,46.8,13.5,40.1,19.5,31.4,24.6,21.8,28.3,11.4,30.6,0.5,31.3,-10.5,30.6,-20.9,28.3,-30.9,24.8,-39.3,19.8,-46.2,13.8,-51.5,6.9,-54.7,-0.5,-55.9,-8.3,-55.1,-15.9,-51.7,-23.5,-46.4,-30.4,-39.5,-36.3,-31.4,-41.2,-21.4,-45.1,-10.8,-47.4,-0.2,-48.1,10.9,-47.4,21.2,-45.1,31.0,-41.4,39.6,-36.6,46.7,-30.6,51.8,-23.7,55.2,-16.3")],
    7: [parseEnginePositions("41.2,-8.2,40.5,-2.7,38.1,2.9,34.4,7.8,29.1,12.3,23.0,15.8,15.9,18.5,8.0,20.1,0.0,20.8,-8.0,20.1,-15.6,18.5,-22.7,15.8,-28.8,12.1,-34.0,7.8,-37.6,2.7,-40.2,-2.7,-40.9,-8.4,-40.2,-14.0,-37.6,-19.5,-34.0,-24.5,-28.6,-29.0,-22.6,-32.5,-15.5,-35.2,-7.8,-36.8,0.4,-37.4,8.3,-36.8,16.1,-35.2,23.0,-32.5,29.2,-28.8,34.5,-24.5,38.1,-19.3,40.5,-14.0")],
    8: [parseEnginePositions("51.3,-0.3,50.5,6.7,47.7,13.7,43.1,20.0,37.1,25.5,29.3,30.2,20.8,33.6,11.3,35.7,1.2,36.7,-8.7,36.1,-18.4,34.2,-27.2,31.0,-35.0,26.5,-41.7,21.2,-46.5,15.0,-49.5,8.2,-50.7,1.2,-50.2,-5.8,-47.6,-12.5,-42.7,-19.0,-36.7,-24.5,-29.3,-29.0,-20.4,-32.5,-10.9,-34.8,-1.1,-35.5,9.1,-35.0,19.0,-33.3,27.8,-30.0,35.5,-25.5,42.3,-20.3,47.0,-14.0,50.1,-7.3")],
    9: [parseEnginePositions("55.8,-1.0,54.5,6.7,51.5,14.0,46.5,20.7,39.5,26.7,31.5,31.5,21.5,35.2,11.3,37.5,0.5,38.2,-10.2,37.5,-20.5,35.2,-30.2,31.7,-38.2,26.7,-45.7,21.0,-50.7,14.2,-54.0,7.0,-54.7,-0.8,-53.9,-8.3,-50.2,-15.8,-45.2,-22.5,-38.9,-28.3,-30.2,-33.3,-21.1,-36.8,-10.7,-39.0,0.1,-39.8,10.7,-39.0,21.8,-37.0,30.8,-33.3,39.5,-28.5,46.1,-22.5,51.1,-15.8,54.5,-8.5")],
    10: [parseEnginePositions("88.1,-14.8,86.8,-2.8,82.0,9.0,73.9,20.0,63.1,29.5,50.0,37.2,34.8,43.2,18.3,46.9,1.3,48.2,-15.9,47.2,-32.5,43.7,-47.9,38.2,-61.2,30.5,-72.4,21.2,-80.7,10.5,-86.1,-1.0,-87.7,-13.3,-86.2,-25.5,-81.2,-37.3,-73.5,-48.0,-62.9,-57.5,-49.5,-65.5,-34.7,-71.3,-18.0,-75.0,-0.9,-76.3,16.3,-75.3,32.8,-71.9,48.1,-66.3,61.8,-58.8,72.6,-49.3,80.9,-38.5,86.3,-27.0")],
    84: [parseEnginePositions("46.85,-1.45,45,7.6,42,13.55,37,19,32,24.45,25,29,17.5,30,9,32.5,0,33,-9,33,-18,30.6,-25,27,-32,23,-37.5,18,-41,12,-43.5,6.45,-44,-1,-43,-7,-41.55,-12.45,-38.5,-19.05,-32.35,-25.95,-25,-29.15,-18,-32.05,-9.5,-33.6,-1,-36,8.85,-36,17,-33,24,-29.15,31,-25,34.95,-21.1,42.85,-17.2,46,-8")],
    85: [parseEnginePositions("38.35,-16.95,37,-11.4,35,-6.45,31,-2,27,1.45,23,5,16,8,9,10,0,11.7,-7,10.4,-13,10.1,-18,7,-24,2,-29,-3,-31,-7,-34.5,-13.55,-34,-19,-33,-24,-31.55,-29.95,-29,-34.05,-24.35,-37.95,-19,-42.15,-12,-47.05,-5,-48.1,3,-50,13.35,-49,21,-46,28,-41.65,32,-36,34.95,-31.1,37.85,-27.2,39,-23")],
    112: [
        parseEnginePositions("40.8,2.4,40.5,8.2,38.4,13.9,35.0,19.0,29.9,23.8,23.8,27.9,16.7,30.9,8.5,32.6,0.0,33.3,-8.5,32.6,-16.3,30.9,-23.8,28.2,-30.3,24.1,-35.4,19.4,-38.8,14.3,-40.8,8.5,-41.1,2.7,-40.1,-2.7,-37.4,-8.2,-33.7,-12.9,-28.6,-17.0,-22.4,-20.4,-15.6,-22.8,-8.2,-24.5,-0.7,-24.8,7.1,-24.5,14.3,-23.1,21.4,-20.7,27.5,-17.3,32.6,-13.3,36.7,-8.5,39.4,-3.1"),
        parseEnginePositions("62.2,4.1,58.5,12.6,52.4,20.4,43.5,27.5,33.0,33.3,20.7,37.1,7.5,39.4,-6.1,39.4,-19.4,37.7,-31.6,34.0,-42.5,28.6,-51.7,21.8,-58.1,13.6,-62.6,5.1,-64.3,-3.7,-63.2,-12.2,-60.2,-20.7,-54.7,-28.2,-47.6,-34.7,-38.8,-40.5,-28.9,-44.9,-18.4,-47.6,-6.8,-49.3,4.8,-49.3,16.0,-47.9,26.9,-45.2,37.1,-41.1,45.9,-35.7,53.4,-29.2,58.8,-21.8,62.6,-13.6,63.6,-4.8"),
        parseEnginePositions("59.5,-21.1,62.9,-12.9,63.9,-4.1,62.2,4.8,58.1,13.3,51.7,21.4,42.8,28.2,32.0,33.7,19.7,37.7,6.5,39.8,-7.1,39.8,-20.7,37.4,-33.0,33.7,-43.5,28.2,-52.4,21.1,-58.8,13.3,-62.9,4.4,-64.3,-4.4,-63.2,-12.9,-59.8,-21.4,-54.4,-28.9,-46.9,-35.4,-38.1,-40.8,-28.2,-45.2,-17.3,-47.9,-5.8,-49.6,5.8,-49.3,17.0,-47.9,27.9,-45.2,38.1,-40.8,46.9,-35.4,54.1,-28.6")
    ],
    113: [
        parseEnginePositions("69.6,21.4,66.8,31.5,61.2,41.0,53.2,49.7,42.3,57.1,29.7,62.7,15.4,66.2,0.7,67.2,-14.4,66.2,-28.7,63.0,-41.7,57.8,-52.5,50.4,-61.2,42.0,-67.2,32.6,-70.0,22.8,-70.3,12.6,-67.9,2.8,-63.4,-6.3,-56.4,-14.3,-47.6,-21.3,-37.1,-26.6,-25.9,-30.8,-13.7,-33.2,-1.1,-34.3,11.5,-33.6,23.8,-31.1,35.3,-27.3,45.8,-21.7,54.6,-15.0,61.9,-7.0,66.8,1.8,69.6,11.6"),
        parseEnginePositions("67.5,3.9,69.6,13.7,68.9,23.5,65.8,33.6,59.5,42.7,50.8,51.1,39.5,58.1,26.6,63.3,12.2,66.5,-2.8,67.2,-17.5,65.4,-31.9,61.6,-44.1,56.0,-54.6,48.7,-62.7,39.9,-67.9,30.1,-70.0,20.3,-69.7,10.5,-66.8,0.7,-61.6,-8.0,-54.2,-15.7,-45.2,-22.4,-34.7,-27.6,-23.1,-31.5,-10.9,-33.6,1.8,-33.9,14.3,-32.9,26.2,-30.1,37.4,-26.2,47.6,-20.3,56.3,-13.3,63.0,-5.2")
    ],
    114: [
        parseEnginePositions("110.2,16.7,101.8,31.9,89.7,46.4,73.0,58.5,54.0,68.4,31.9,75.2,7.6,78.3,-16.0,77.5,-39.5,73.7,-60.8,66.1,-79.8,55.5,-95.0,42.6,-106.4,28.1,-112.5,12.2,-114.8,-3.8,-112.5,-20.5,-106.4,-35.7,-96.5,-49.4,-82.8,-61.6,-66.9,-71.4,-48.6,-79.0,-28.9,-83.6,-8.4,-85.9,12.2,-85.9,32.7,-82.8,52.4,-76.8,69.9,-68.4,85.1,-58.5,98.0,-45.6,107.2,-31.2,112.5,-16.0,113.2,0.0"),
        parseEnginePositions("104.9,-37.2,111.7,-22.0,114.0,-6.1,112.5,9.9,106.4,26.6,95.8,41.0,81.3,54.7,62.3,65.4,41.0,73.7,17.5,78.3,-6.8,79.0,-30.4,76.0,-53.2,69.9,-73.7,60.8,-90.4,48.6,-103.4,34.2,-111.7,18.2,-115.5,2.3,-114.8,-13.7,-110.2,-29.6,-101.8,-44.1,-88.9,-57.0,-73.7,-68.4,-56.2,-76.8,-37.2,-82.8,-16.7,-85.9,4.6,-86.6,25.1,-85.1,44.8,-79.8,63.8,-73.0,80.6,-63.1,94.2,-50.9")
    ],
    115: [parseEnginePositions("146.6,4.9,144.1,25.2,136.0,44.8,123.0,63.5,104.2,79.8,82.2,92.8,57.0,102.6,29.3,108.3,0.0,110.7,-28.5,109.1,-56.2,102.6,-82.2,93.6,-104.2,80.6,-123.0,64.3,-136.8,46.4,-145.8,26.9,-148.2,6.5,-145.8,-13.8,-137.6,-33.4,-124.6,-52.1,-105.9,-67.6,-83.9,-81.4,-58.6,-91.2,-30.9,-96.9,-1.6,-99.3,26.9,-97.7,54.6,-91.2,80.6,-82.2,102.6,-69.2,121.3,-52.9,135.2,-35.0,144.1,-15.5")],
};

function parseEnginePositions(csv) {
    const parts = csv.split(',').map(Number);
    const coords = [];
    for (let i = 0; i < parts.length; i += 2) {
        coords.push({ x: parts[i], y: parts[i + 1] });
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
        const idx = ((frameIndex % positions.length) + positions.length) % positions.length;
        const point = positions[idx];
        if (!point) continue;
        if (Array.isArray(point)) {
            offsets.push({ x: point[0], y: point[1] });
        } else {
            offsets.push({ x: point.x, y: point.y });
        }
    }

    return offsets.length > 0 ? offsets : null;
}

// --- CONFIGURATION DES STATIONS ---
const STATION_SPRITE_DEFS = {
    "blueStation":  { path: "graphics/stations/blueStation/1.png" },
    "greenStation": { path: "graphics/stations/greenStation/1.png" },
    "redStation":   { path: "graphics/stations/redStation/1.png" }
};

// --- SPRITES DE PORTAILS ---
const PORTAL_ANIM_FPS = 30;
const PORTAL_SPRITE_DEFS = {
    standard: {
        idle: {
            frameCount: 90,
            basePath: "graphics/portals/standardGate/sprites/DefineSprite_5_pulseAnimation/",
            fps: PORTAL_ANIM_FPS,
            loop: true
        },
        active: {
            frameCount: 1,
            basePath: "graphics/portals/standardGate/sprites/DefineSprite_8_activeAnimation/",
            fps: 1,
            loop: false
        }
    }
};

const PORTAL_JUMP_ANIM = {
    frameCount: 70,
    basePath: "graphics/assets/portalJumpAnim/frames/",
    frameDuration: 40,
    offsetX: 0,
    offsetY: 0
};

const SMARTBOMB_ANIM = {
    frameCount: 213,
    basePath: "graphics/pyroEffects/smartbomb1/",
    frameDuration: 20,
    offsetX: 0,
    offsetY: 0
};

const EXPLOSION_ANIMATIONS = {
    0: { frameCount: 56, basePath: "graphics/pyroEffects/explosion0/", frameDuration: 40 },
    1: { frameCount: 80, basePath: "graphics/pyroEffects/explosion1/", frameDuration: 40 },
    2: { frameCount: 15, basePath: "graphics/pyroEffects/explosion2/", frameDuration: 40 },
    3: { frameCount: 28, basePath: "graphics/pyroEffects/explosion3/", frameDuration: 40 },
    4: { frameCount: 35, basePath: "graphics/pyroEffects/explosion4/", frameDuration: 40 },
    5: { frameCount: 40, basePath: "graphics/pyroEffects/explosion5/", frameDuration: 40 }
};

const ROCKET_DAMAGE_ANIM_FPS = 25;
const ROCKET_DAMAGE_SPRITES = {
    0: { frameCount: 11, basePath: "graphics/pyroEffects/rocketDamage0/", fps: ROCKET_DAMAGE_ANIM_FPS },
    1: { frameCount: 31, basePath: "graphics/pyroEffects/rocketDamage1/", fps: ROCKET_DAMAGE_ANIM_FPS },
    2: { frameCount: 19, basePath: "graphics/pyroEffects/rocketDamage2/", fps: ROCKET_DAMAGE_ANIM_FPS }
};

// Sprites de roquettes disponibles côté HTML5 (équivalents des rocketX.swf)
const DEFAULT_ROCKET_SPRITE_ID = 1;
const ROCKET_SPRITE_DEFS = {
    1:  { path: "graphics/rockets/rocket1/1.png" },  // R-310
    2:  { path: "graphics/rockets/rocket2/1.png" },  // PLT-2026
    3:  { path: "graphics/rockets/rocket3/1.png" },  // PLT-2021
    7:  { path: "graphics/rockets/rocket7/1.png" },  // HSTRM-01
    8:  { path: "graphics/rockets/rocket8/1.png" },  // UBR-100
    9:  { path: "graphics/rockets/rocket9/1.png" },  // ECO-10
    10: { path: "graphics/rockets/rocket10/1.png" }  // DCR-250
};

const EMP_ANIM = {
    ring: {
        basePath: "graphics/pyroEffects/shockwaves/shockring/1.png",
        duration: 1500,
        startScale: 0.1,
        endScale: 3.5,
        startAlpha: 0.3,
        endAlpha: 0,
        count: 5,
        delay: 100
    },
    blitz: {
        basePath: "graphics/pyroEffects/shockwaves/blitz/",
        frameCount: 10,
        frameDuration: 1000 / 15,
        duration: 1500,
        startScale: 0.1,
        endScale: 3.5,
        fadeOutStart: 750,
        fadeOutDuration: 250
    }
};

// --- SPRITES DE BOUCLIERS ---
const SHIELD_ANIM_FPS = 30;
const SHIELD_SPRITE_DEFS = {
    standard: {
        frameCount: 51,
        basePath: "graphics/shields/shield1/sprites/DefineSprite_2_mc/",
        fps: SHIELD_ANIM_FPS,
        loop: true
    },
    low: {
        frameCount: 33,
        basePath: "graphics/shields/shield0/sprites/DefineSprite_2_mc/",
        fps: SHIELD_ANIM_FPS,
        loop: true
    },
    // --- AJOUT TECH SHIELD BACKUP (Copie de Standard) ---
    tech_shield_backup: {
        frameCount: 51, // Doit être identique à "standard"
        basePath: "graphics/shields/shield1/sprites/DefineSprite_2_mc/", // Même chemin que "standard"
        fps: SHIELD_ANIM_FPS,
        loop: true
    },
    // ----------------------------------------------------
    insta: {
        frameCount: 134,
        basePath: "graphics/shields/instaShield/sprites/DefineSprite_2_mc/",
        fps: SHIELD_ANIM_FPS,
        loop: false
    },
    invincibility: {
        frameCount: 31,
        basePath: "graphics/shields/invincibilityShield/sprites/DefineSprite_2_mc/",
        fps: SHIELD_ANIM_FPS,
        loop: true
    },
    hit: {
        frameCount: 9,
        basePath: "graphics/shields/shieldDamage/sprites/DefineSprite_19_mc/",
        fps: SHIELD_ANIM_FPS,
        loop: false
    }
};

const LASER_DAMAGE_ANIM_FPS = 37;
const LASER_DAMAGE_SPRITES = {
    0: { frameCount: 15, basePath: "graphics/pyroEffects/laserDamage0/", fps: LASER_DAMAGE_ANIM_FPS },
    1: { frameCount: 15, basePath: "graphics/pyroEffects/laserDamage1/", fps: LASER_DAMAGE_ANIM_FPS },
    2: { frameCount: 15, basePath: "graphics/pyroEffects/laserDamage2/", fps: LASER_DAMAGE_ANIM_FPS }
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
    minimapFrame: "graphics/ui/minimap/frames/1.png",
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
    windowDivider: "graphics/ui/window/images/130.png",
    buttonClose: "graphics/ui/window/images/101.png",
    buttonCollapse: "graphics/ui/window/images/104.png",
    chatBg: "",
    chatInputBg: "",
    chatButton: "graphics/ui/window/images/104.png",
    dockBg: "",
    dockIconGroup: "graphics/ui/window1/images/20_groupsystem_icon.png.png",
    dockIconChat: "graphics/ui/window1/images/22_chat_icon.png.png",
    quickbarLockIcon: "graphics/ui/window1/images/18_info_icon.png.png",
    quickbarRotateIcon: "graphics/ui/window1/images/16_log_icon.png.png",
    quickbarMinimizeIcon: "graphics/ui/window1/images/19_help_icon.png.png",
    minimapWindowIcon: "graphics/ui/window1/images/14_map_icon.png.png",
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
    mainMenuIconQuest: "graphics/ui/window1/images/10_quest_icon.png.png",
    mainMenuIconShip: "graphics/ui/window1/images/11_player_icon.png.png",
    mainMenuIconMap: "graphics/ui/window1/images/14_map_icon.png.png",
    mainMenuIconLog: "graphics/ui/window1/images/16_log_icon.png.png",
    mainMenuIconInfo: "graphics/ui/window1/images/18_info_icon.png.png",
    mainMenuIconHelp: "graphics/ui/window1/images/19_help_icon.png.png",
    mainMenuIconGroup: "graphics/ui/window1/images/20_groupsystem_icon.png.png",
    mainMenuIconChat: "graphics/ui/window1/images/22_chat_icon.png.png",
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
    }
};
const minimapSpriteCache = {};

// Variables pour stocker les stations
let stations = [];       // Liste des stations sur la carte
let stationImages = {};  // Stockage des images chargées



// Cache des images déjà chargées
const shipSpriteCache = {};
const shieldSpriteCache = {};
const laserDamageSpriteCache = {};
const rocketDamageSpriteCache = {};
const portalSpriteCache = {};
const portalJumpSpriteCache = {};
const smartbombSpriteCache = {};
const explosionSpriteCache = {};
let empRingCache = null;
const empBlitzCache = {};
const uiImageCache = {};
const engineSpriteCache = {};
const engineSmokeSpriteCache = {};
const rocketSmokeSpriteCache = {};
const shipExpansionSpriteCache = {};

// ========================================================
// CONFIGURATION DES ICONES (Images corrigées selon tes choix)
// ========================================================
const QUICKBAR_ICON_LOOKUP = {
    ammo: {
        1: "graphics/ui/actionMenu/images/41_laserBat1.png.png", // x1
        2: "graphics/ui/actionMenu/images/40_laserBat2.png.png", // x2
        3: "graphics/ui/actionMenu/images/39_laserBat3.png.png", // x3
        4: "graphics/ui/actionMenu/images/38_laserBat4.png.png", // x4
        
        // --- TES MODIFICATIONS D'IMAGES ICI ---
        5: "graphics/ui/actionMenu/images/37_laserBat5.png.png", // SAB prend l'image 37 (ex-RSB)
        6: "graphics/ui/actionMenu/images/36_laserBat6.png.png"  // RSB prend l'image 36 (ex-CBO)
    },
    rocket: {
        1: "graphics/ui/actionMenu/images/28_r310.png.png",      
        2: "graphics/ui/actionMenu/images/30_plt2026.png.png",   
        3: "graphics/ui/actionMenu/images/31_plt2021.png.png",      
        10: "graphics/ui/actionMenu/images/72_dcr30.png.png",    
        11: "graphics/ui/actionMenu/images/63_explosive.png.png" 
    },
    mine: {
        5: "graphics/ui/actionMenu/images/7_smb01.png.png"       
    },
    cpu: {
        EMP: "graphics/ui/actionMenu/images/66_emp01.png.png",
        ISH: "graphics/ui/actionMenu/images/46_ish.png.png",
        SMB: "graphics/ui/actionMenu/images/7_smb01.png.png",
        ROB: "graphics/ui/actionMenu/images/22_robstarter.png.png",
        CLK: "graphics/ui/actionMenu/images/88_cloak01.png.png",
        ARL: "graphics/ui/actionMenu/images/93_arol01.png.png"
    },
    tech: {
        4: "graphics/ui/actionMenu/images/15_shield_backup.png.png",
        5: "graphics/ui/actionMenu/images/92_battle_repair_bot.png.png"
    },
    ability: {
        solace:     "graphics/ui/actionMenu/images/11_skill_ship_solace.png.png",
        diminisher: "graphics/ui/actionMenu/images/14_skill_ship_diminisher.png.png",
        spectrum:   "graphics/ui/actionMenu/images/10_skill_ship_spectrum.png.png",
        sentinel:   "graphics/ui/actionMenu/images/12_skill_ship_sentinel.png.png",
        venom:      "graphics/ui/actionMenu/images/9_skill_ship_venom.png.png"
    }
};

function getUiImage(path) {
    if (!path) return null;
    const base = (window.cfg && typeof window.cfg.basePath === "string") ? window.cfg.basePath : "";
    const isAbsolute = /^(?:[a-z]+:)?\/\//i.test(path) || path.startsWith("data:") || path.startsWith("blob:") || path.startsWith("/");
    const resolvedPath = isAbsolute || !base || path.startsWith(base) ? path : `${base}${path}`;
    const cacheKey = resolvedPath;
    if (uiImageCache[cacheKey]) return uiImageCache[cacheKey];
    const img = new Image();
    img.src = resolvedPath;
    uiImageCache[cacheKey] = img;
    return img;
}

function getMinimapSpriteFrame(name, frameIndex) {
    const def = MINIMAP_SPRITE_DEFS[name];
    if (!def) return null;
    const idx = ((frameIndex % def.frameCount) + def.frameCount) % def.frameCount;
    const path = def.basePath + (idx + 1) + ".png";
    if (minimapSpriteCache[path]) return minimapSpriteCache[path];
    const img = new Image();
    img.src = path;
    minimapSpriteCache[path] = img;
    return img;
}

function getQuickbarIconPath(item) {
    if (!item) return null;
    const lookup = QUICKBAR_ICON_LOOKUP[item.type];
    if (lookup) {
        if (item.id && lookup[item.id]) return lookup[item.id];
        if (item.code && lookup[item.code]) return lookup[item.code];
        if (item.type === "ability" && lookup[item.id || item.code]) return lookup[item.id || item.code];
    }

    if (item.type === "ammo") return UI_SPRITES.iconAmmo;
    if (item.type === "rocket") return UI_SPRITES.iconRocket;
    if (item.type === "tech") return UI_SPRITES.iconTech;
    if (item.type === "mine") return UI_SPRITES.iconMine || UI_SPRITES.iconCpu;
    if (item.type === "cpu" || item.type === "ability") return UI_SPRITES.iconCpu;
    return null;
}

// Convertit un angle (radians) en index de frame [0..frameCount-1]
function getDirectionFrameIndex(angle, frameCount) {
    if (!isFinite(angle)) angle = 0;
    // Normaliser dans [0, 2π)
    const twoPi = Math.PI * 2;
    angle = ((angle % twoPi) + twoPi) % twoPi;
    const sector = angle / twoPi * frameCount;
    return Math.round(sector) % frameCount;
}

function getEngineOffsetForFrame(shipId, frameIndex) {
    const offsets = getEngineOffsetsForFrame(shipId, frameIndex);
    if (!offsets || offsets.length === 0) return null;
    return offsets[0];
}

// Récupère (ou charge) l'image d'un vaisseau pour un shipId + frameIndex
function getShipSpriteFrame(shipId, frameIndex) {
    const def = SHIP_SPRITE_DEFS[shipId];
    if (!def) return null;

    const frameCount = def.frameCount;
    let idx = frameIndex % frameCount;
    if (idx < 0) idx += frameCount;

    const key = shipId + "_" + idx;
    if (shipSpriteCache[key]) return shipSpriteCache[key];

    const img = new Image();
    // nos fichiers sont 1.png..32.png, donc on ajoute +1
    const fileNumber = idx + 1;
    img.src = def.basePath + fileNumber + ".png";
    shipSpriteCache[key] = img;
    return img;
}

function getShipExpansionFrame(shipId, frameIndex) {
    const def = SHIP_EXPANSION_DEFS[shipId];
    if (!def) return null;

    const frames = def.frames && def.frames.length > 0
        ? def.frames
        : Array.from({ length: def.frameCount || 1 }, (_, idx) => idx + 1);

    let idx = frameIndex % frames.length;
    if (idx < 0) idx += frames.length;

    const fileNumber = frames[idx];
    const cacheKey = `${shipId}_${fileNumber}`;
    if (shipExpansionSpriteCache[cacheKey]) return shipExpansionSpriteCache[cacheKey];

    const img = new Image();
    img.src = def.basePath + fileNumber + ".png";
    shipExpansionSpriteCache[cacheKey] = img;
    return img;
}

function getEngineSpriteFrame(engineKey, frameIndex) {
    const key = engineKey || DEFAULT_ENGINE_KEY;
    const def = ENGINE_SPRITE_DEFS[key];
    if (!def) return null;

    const frames = def.frames && def.frames.length > 0
        ? def.frames
        : Array.from({ length: def.frameCount }, (_, idx) => idx + 1);

    let idx = frameIndex % frames.length;
    if (idx < 0) idx += frames.length;

    const fileNumber = frames[idx];
    const cacheKey = `${key}_${fileNumber}`;
    if (engineSpriteCache[cacheKey]) return engineSpriteCache[cacheKey];

    const img = new Image();
    img.src = def.basePath + fileNumber + ".png";
    engineSpriteCache[cacheKey] = img;
    return img;
}

function getEngineSmokeSpriteFrame(engineSmokeKey, frameIndex) {
    const key = engineSmokeKey || DEFAULT_ENGINE_SMOKE_KEY;
    const def = ENGINE_SMOKE_DEFS[key];
    if (!def) return null;

    const frames = def.frames && def.frames.length > 0
        ? def.frames
        : Array.from({ length: def.frameCount || 1 }, (_, idx) => idx + 1);

    let idx = frameIndex % frames.length;
    if (idx < 0) idx += frames.length;

    const fileNumber = frames[idx];
    const cacheKey = `${key}_${fileNumber}`;
    if (engineSmokeSpriteCache[cacheKey]) return engineSmokeSpriteCache[cacheKey];

    const img = new Image();
    img.src = def.basePath + fileNumber + ".png";
    engineSmokeSpriteCache[cacheKey] = img;
    return img;
}

function getRocketSmokeSpriteFrame(smokeKey, frameIndex) {
    const key = smokeKey;
    const def = ROCKET_SMOKE_DEFS[key];
    if (!def) return null;

    const frames = def.frames && def.frames.length > 0
        ? def.frames
        : Array.from({ length: def.frameCount || 1 }, (_, idx) => idx + 1);

    let idx = frameIndex % frames.length;
    if (idx < 0) idx += frames.length;

    const fileNumber = frames[idx];
    const cacheKey = `${key}_${fileNumber}`;
    if (rocketSmokeSpriteCache[cacheKey]) return rocketSmokeSpriteCache[cacheKey];

    const img = new Image();
    img.src = def.basePath + fileNumber + ".png";
    rocketSmokeSpriteCache[cacheKey] = img;
    return img;
}

function resolveRocketSmokeKey(rocketId) {
    if (!ROCKET_SMOKE_BY_ID) return null;
    const key = ROCKET_SMOKE_BY_ID[rocketId];
    return Number.isFinite(key) ? key : null;
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

    const img = new Image();
    const fileNumber = idx + 1;
    img.src = animDef.basePath + fileNumber + ".png";
    portalSpriteCache[key] = img;
    return img;
}

function getPortalJumpFrame(frameIndex) {
    if (!PORTAL_JUMP_ANIM) return null;

    const frameCount = PORTAL_JUMP_ANIM.frameCount || 1;
    let idx = frameIndex % frameCount;
    if (idx < 0) idx += frameCount;

    if (portalJumpSpriteCache[idx]) return portalJumpSpriteCache[idx];

    const img = new Image();
    const fileNumber = idx + 1;
    img.src = PORTAL_JUMP_ANIM.basePath + fileNumber + ".png";
    portalJumpSpriteCache[idx] = img;
    return img;
}

function getSmartbombFrame(frameIndex) {
    if (!SMARTBOMB_ANIM) return null;

    const frameCount = SMARTBOMB_ANIM.frameCount || 1;
    let idx = frameIndex % frameCount;
    if (idx < 0) idx += frameCount;

    if (smartbombSpriteCache[idx]) return smartbombSpriteCache[idx];

    const img = new Image();
    const fileNumber = idx + 1;
    img.src = SMARTBOMB_ANIM.basePath + fileNumber + ".png";
    smartbombSpriteCache[idx] = img;
    return img;
}

function getExplosionFrame(type, frameIndex) {
    const anim = EXPLOSION_ANIMATIONS[type] || EXPLOSION_ANIMATIONS[2];
    if (!anim) return null;

    const frameCount = anim.frameCount || 1;
    let idx = frameIndex % frameCount;
    if (idx < 0) idx += frameCount;

    const cacheKey = `${type}_${idx}`;
    if (explosionSpriteCache[cacheKey]) return explosionSpriteCache[cacheKey];

    const img = new Image();
    const fileNumber = idx + 1;
    img.src = anim.basePath + fileNumber + ".png";
    explosionSpriteCache[cacheKey] = img;
    return img;
}

function getEmpRingImage() {
    if (!EMP_ANIM) return null;
    if (empRingCache) return empRingCache;

    const img = new Image();
    img.src = EMP_ANIM.ring.basePath;
    empRingCache = img;
    return img;
}

function getEmpBlitzFrame(frame) {
    if (!EMP_ANIM) return null;
    const idx = Math.max(0, Math.min(frame, (EMP_ANIM.blitz.frameCount || 1) - 1));
    if (empBlitzCache[idx]) return empBlitzCache[idx];

    const img = new Image();
    img.src = `${EMP_ANIM.blitz.basePath}${idx + 1}.png`;
    empBlitzCache[idx] = img;
    return img;
}

function getShieldSpriteFrame(name, frameIndex) {
    const def = SHIELD_SPRITE_DEFS[name];
    if (!def) return null;

    const frameCount = def.frameCount;
    let idx = frameIndex % frameCount;
    if (idx < 0) idx += frameCount;

    const key = name + "_" + idx;
    if (shieldSpriteCache[key]) return shieldSpriteCache[key];

    const img = new Image();
    const fileNumber = idx + 1;
    img.src = def.basePath + fileNumber + ".png";
    shieldSpriteCache[key] = img;
    return img;
}

function getLaserDamageFrame(typeId, frameIndex) {
    const def = LASER_DAMAGE_SPRITES[typeId];
    if (!def) return null;

    const frameCount = def.frameCount || 1;
    let idx = frameIndex % frameCount;
    if (idx < 0) idx += frameCount;

    const key = `${typeId}_${idx}`;
    if (laserDamageSpriteCache[key]) return laserDamageSpriteCache[key];

    const img = new Image();
    const fileNumber = idx + 1;
    img.src = def.basePath + fileNumber + ".png";
    laserDamageSpriteCache[key] = img;
    return img;
}

function getRocketDamageFrame(typeId, frameIndex) {
    const def = ROCKET_DAMAGE_SPRITES[typeId];
    if (!def) return null;

    const frameCount = def.frameCount || 1;
    let idx = frameIndex % frameCount;
    if (idx < 0) idx += frameCount;

    const key = `${typeId}_${idx}`;
    if (rocketDamageSpriteCache[key]) return rocketDamageSpriteCache[key];

    const img = new Image();
    const fileNumber = idx + 1;
    img.src = def.basePath + fileNumber + ".png";
    rocketDamageSpriteCache[key] = img;
    return img;
}
// ---------- GLOWS DE VAISSEAUX (auras autour des ships) ----------
const SHIP_GLOW_DEFS = {
    // Aura du Leonov (shipId 3)
    3: {
        frameCount: 32,                    
        basePath: "graphics/shipGlows/3/"  
    }
    // plus tard on pourra ajouter d'autres glows (goliath, etc.)
};

// --- FONCTION DE CHARGEMENT DES STATIONS ---
function preloadStationSprites() {
    for (let key in STATION_SPRITE_DEFS) {
        let def = STATION_SPRITE_DEFS[key];
        let img = new Image();
        img.src = def.path;
        stationImages[key] = img;
        console.log("Chargement station : " + key);
    }
}
// On lance le chargement tout de suite
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

    const img = new Image();
    const fileNumber = idx + 1; // fichiers 1.png..N.png
    img.src = def.basePath + fileNumber + ".png";
    shipGlowSpriteCache[key] = img;
    return img;
}



// Sauvegarde / chargement du layout de barre dans le navigateur
function saveQuickbarLayout() {
    try {
        const data = {};
        for (let i = 1; i <= 10; i++) {
            if (quickSlots[i]) data[i] = quickSlots[i];
        }
        localStorage.setItem("andromeda_quickbar", JSON.stringify(data));
    } catch (e) {
        console.warn("Impossible de sauvegarder la quickbar :", e);
    }
}

function loadQuickbarLayout() {
    try {
        const raw = localStorage.getItem("andromeda_quickbar");
        if (!raw) return;
        const data = JSON.parse(raw);
        for (let i = 1; i <= 10; i++) {
            if (data[i]) {
                const it = data[i];
                if (it.type === "ammo" || it.type === "rocket"
                    || it.type === "tech" || it.type === "cpu") {
                    quickSlots[i] = it;
                }
            }
        }
    } catch (e) {
        console.warn("Impossible de charger la quickbar :", e);
    }
}

loadQuickbarLayout();



    function getKeyLabelForSlot(slot) {
        for (const code in keyBindings) {
            if (keyBindings[code] === slot) {
                if (code.startsWith("Digit")) return code.replace("Digit", ""); 
                if (code.startsWith("Key")) return code.replace("Key", "");   
                return code;
            }
        }
        return "";
    }

    // ========================================================
    // QUICKBAR – LOGIQUE AVANCÉE (COOLDOWN + BLACKLIST)
    // ========================================================

    // Mapping des IDs de techs (1,2,...) vers les codes CLD utilisés par le serveur
    const TECH_ID_TO_CODE = {
        1: "ELA", // Energy Leech Array
        2: "ECI", // Energy Chain Impulse
        3: "RPM", // Rocket Probability Maximizer
        4: "SBU", // Shield Backup
        5: "BRB", // Battle Repair Bot
        6: "SL",  // Speed Leech
        7: "CID"  // Clinging Impulse Drone
    };

    function getActionCodeForSlot(slot) {
        const item = quickSlots[slot];
        if (!item) return null;

        switch (item.type) {
            case "rocket":
                // Tous les slots roquettes se partagent le cooldown "ROK"
                return "ROK";
            case "ammo":
                // FULL_MERGE_AS : le RSB-75 (ammo id 6) a son propre cooldown visuel
                if (item.id === 6) return "RSB";
                return null;
            case "tech":
                return TECH_ID_TO_CODE[item.id] || null;
            case "cpu":
                // ex: "ISH", "SMB"
                return item.code || null;
            default:
                return null;
        }
    }

    function setActionCooldown(code, seconds) {
        if (!code || !seconds || seconds <= 0 || isNaN(seconds)) return;
        const nowSeconds = Date.now() / 1000;
        actionCooldowns[code] = {
            endTime: nowSeconds + seconds,
            duration: seconds
        };

        persistCooldowns();
    }

    function getCooldownInfo(code) {
        const cd = actionCooldowns[code];
        if (!cd) return null;
        const nowSeconds = Date.now() / 1000;
        const remaining = cd.endTime - nowSeconds;
        if (remaining <= 0) {
            delete actionCooldowns[code];
            persistCooldowns();
            return null;
        }
        return { remaining, total: cd.duration };
    }

    function updateActionCooldowns() {
        const nowSeconds = Date.now() / 1000;
        for (const code in actionCooldowns) {
            const cd = actionCooldowns[code];
            if (!cd) continue;
            if (nowSeconds >= cd.endTime) {
                delete actionCooldowns[code];
            }
        }

        persistCooldowns();
    }

    function isActionOnCooldown(code) {
        return !!getCooldownInfo(code);
    }

    function blacklistAction(code) {
        if (code) actionBlacklist.add(code);
    }

    function unblacklistAction(code) {
        if (code) actionBlacklist.delete(code);
    }

    function isActionBlacklisted(code) {
        return code ? actionBlacklist.has(code) : false;
    }

    function updateLocalAmmoSelection(ammoId, { temporary = false } = {}) {
        currentAmmoId = ammoId;
        if (!temporary && ammoId != null && ammoId !== RSB_AMMO_ID) {
            primaryAmmoId = ammoId;
        }
        if (actionDrawerCategory === "laser") {
            renderActionDrawerItems();
        }
    }

    function getRsbFallbackAmmoId() {
        if (currentAmmoId && currentAmmoId !== RSB_AMMO_ID) return currentAmmoId;
        if (primaryAmmoId && primaryAmmoId !== RSB_AMMO_ID) return primaryAmmoId;
        return null;
    }

    function scheduleRsbReturn(delayMs = RSB_BURST_DURATION_MS) {
        clearTimeout(rsbReturnTimer);
        rsbReturnTimer = setTimeout(() => {
            const fallbackAmmo = rsbPreviousAmmoId || primaryAmmoId || 1;
            if (fallbackAmmo === RSB_AMMO_ID) return;

            // Si le joueur a déjà quitté le RSB manuellement, on ne force rien
            if (currentAmmoId !== RSB_AMMO_ID) return;

            sendSelectAmmo(fallbackAmmo);
            rsbPreviousAmmoId = null;
        }, delayMs);
    }

    function triggerRsbBurst() {
        rsbPreviousAmmoId = getRsbFallbackAmmoId();

        // Sélection temporaire du RSB
        sendSelectAmmo(RSB_AMMO_ID, { temporary: true });

        // Retour automatique après la rafale
        scheduleRsbReturn();
    }

    function forceRsbReturnAfterCooldown() {
        if (currentAmmoId === RSB_AMMO_ID) {
            if (!rsbPreviousAmmoId) rsbPreviousAmmoId = primaryAmmoId;
            scheduleRsbReturn(0);
        }
    }
	
	    // -------------------------------------------------
    // UI HTML POUR SELECTIONNER LES ITEMS DE LA QUICKBAR
    // -------------------------------------------------

    // Rectangles à l'écran pour chaque slot (pour le clic)
    const quickbarSlotRects = {};

    // Catégories disponibles (onglets de la fenêtre)
    const QUICKBAR_CATEGORIES = [
        { id: "laser",   label: "Lasers" },
        { id: "special", label: "Munitions spéciales" },
        { id: "rocket",  label: "Roquettes" },
        { id: "tech",    label: "Techs" },
        { id: "cpu",     label: "CPUs" }
    ];

// ========================================================
// CONTENU DES ONGLETS (CBO et JOB supprimés)
// ========================================================
const QUICKBAR_ITEMS_BY_CATEGORY = {
    laser: [
        { type: "ammo", id: 1, stockId: 1, label: "LCB-10" },   // x1
        { type: "ammo", id: 2, stockId: 2, label: "MCB-25" },   // x2
        { type: "ammo", id: 3, stockId: 3, label: "MCB-50" },   // x3
        { type: "ammo", id: 4, stockId: 4, label: "UCB-100" },  // x4
        { type: "ammo", id: 5, stockId: 5, label: "SAB-50" },   // SAB (aura l'image 37)
        { type: "ammo", id: 6, stockId: 6, label: "RSB-75" }    // RSB (aura l'image 36)
    ],
    rocket: [
        { type: "rocket", id: 1, stockId: 9, label: "R-310" },      
        { type: "rocket", id: 2, stockId: 10, label: "PLT-2026" },  
        { type: "rocket", id: 3, stockId: 11, label: "PLT-2021" },  
        { type: "rocket", id: 10, stockId: 18, label: "DCR-250" }  
    ],
    special: [ 
        { type: "cpu", code: "EMP", stockId: 30, label: "EMP-01" },
        { type: "cpu", code: "ISH", stockId: 31, label: "ISH-01" },
        { type: "cpu", code: "SMB", stockId: 32, label: "SMB-01" }
    ],
    cpu: [
        { type: "cpu", code: "ROB", label: "Rep Bot" }, 
        { type: "cpu", code: "CLK", label: "Cloak" },
        { type: "cpu", code: "ARL", label: "Auto Rkt" }
    ],
    tech: [
        { type: "tech", id: 4, code: "SBU", label: "Shield BU" },
        { type: "tech", id: 5, code: "BRB", label: "Battle Bot" }
    ],
    ability: [
        { type: "ability", id: "solace", label: "Nano Clust", reqShips: [53, 140] },
        { type: "ability", id: "diminisher", label: "Weaken Shd", reqShips: [54, 141] },
        { type: "ability", id: "spectrum", label: "Prismatic", reqShips: [56, 142] },
        { type: "ability", id: "sentinel", label: "Fortress", reqShips: [55, 143] },
        { type: "ability", id: "venom", label: "Singularity", reqShips: [57, 144] }
    ],
    buy_now: [
        { type: "buy", id: "ammo_x1", label: "Buy x1" },
        { type: "buy", id: "ammo_x2", label: "Buy x2" },
        { type: "buy", id: "ammo_x3", label: "Buy x3" },
        { type: "buy", id: "r_plt2026", label: "Buy R1" },
        { type: "buy", id: "r_plt2021", label: "Buy R2" }
    ]
};

    let quickbarConfigWindowInitialized = false;
    let quickbarConfigCurrentSlot = null;
    let quickbarConfigCurrentCategory = "laser";

    function setQuickbarSlotFromItem(slot, item) {
        if (!item) return;

        if (item.type === "ammo" || item.type === "rocket" || item.type === "tech") {
            quickSlots[slot] = {
                type: item.type,
                id: item.id
            };
        } else if (item.type === "cpu") {
            quickSlots[slot] = {
                type: "cpu",
                code: item.code
            };
        }
    }

    

    
// ========================================================
// NOUVEAU SYSTÈME : ACTION DRAWER (Barre tiroir sous les slots)
// ========================================================

const ACTION_DRAWER_ITEM_BG_DEFAULT  = "graphics/ui/actionMenu/images/83_comb02_hover.png.png";
const ACTION_DRAWER_ITEM_BG_SELECTED = "graphics/ui/actionMenu/images/82_comb02_selected.png.png";

// Largeur alignée sur le slot du quickbar (8_slot.png)
const ACTION_DRAWER_HEX_WIDTH  = 44;

// Hauteur agrandie en gardant le même ratio que dans ta version 34x39
// 39 / 34 ≈ 1.147  →  44 * 1.147 ≈ 50
const ACTION_DRAWER_HEX_HEIGHT = 50;

// Gap repris du game.xml : <menu gap="3" ...>
const ACTION_DRAWER_GAP = 0;

// Chevauchement vertical “à la Flash” : overlap ≈ h/3 - 2*gap
// Pour 39px on retombe sur ≈ 7px, pour 50px on obtient ≈ 11px
const ACTION_DRAWER_ROW_OVERLAP = 13;
const ACTION_DRAWER_VISIBLE_SLOTS = 6;

// Décalage horizontal de la rangée du haut pour que la 2e ligne
// “vienne se coller” au bas-gauche de LASER (ruche)
const ACTION_DRAWER_ITEM_ANCHOR_OFFSET = ACTION_DRAWER_HEX_WIDTH / 2;
const AMMO_BAR_FRAME_IDS = Array.from({ length: 25 }, (_, idx) => 326 - idx * 2); // 326 (vide) -> 278 (plein)
const AMMO_BAR_WIDTH = 38;      // Avant: 26
const AMMO_BAR_HEIGHT = 7;      // Avant: 6
const AMMO_BAR_OFFSET_TOP = 13; // Avant: 9 (pour la recentrer verticalement)

    let actionDrawerCategory = "laser"; // Catégorie active par défaut
    let actionDrawerSelectedIndex = 0;   // Index de la variante actuellement suivie

   function initActionDrawer() {
    // --- NETTOYAGE ---
    const existing = document.getElementById("actionDrawerContainer");
    if (existing) existing.remove();
    
    const oldStyle = document.getElementById("style-action-drawer");
    if (oldStyle) oldStyle.remove();

    const categoryBgStd    = "graphics/ui/actionMenu/images/84_comb01_std.png.png";
    const categoryBgHover  = "graphics/ui/actionMenu/images/86_comb01_hover.png.png";
    const categoryBgActive = "graphics/ui/actionMenu/images/85_comb01_selected.png.png";
    
    // Images Cadenas et Dragger
    const lockLockedUrl   = "graphics/ui/actionMenu/images/162.png";
    const lockUnlockedUrl = "graphics/ui/actionMenu/images/166.png";
    const draggerUrl      = "graphics/ui/actionMenu/images/171.png"; // Image de déplacement

    // --- STYLE CSS ---
    const style = document.createElement("style");
    style.id = "style-action-drawer";
    style.innerHTML = `
        #actionDrawerContainer {
            --ad-hex-w: ${ACTION_DRAWER_HEX_WIDTH}px;
            --ad-hex-h: ${ACTION_DRAWER_HEX_HEIGHT}px;
            --ad-row-overlap: ${ACTION_DRAWER_ROW_OVERLAP}px;
            --ad-item-offset: ${ACTION_DRAWER_ITEM_ANCHOR_OFFSET}px;
            --ad-gap: ${ACTION_DRAWER_GAP}px;

            position: absolute;
            top: 450px; left: 50%;
            width: calc(var(--ad-hex-w) * 7 + var(--ad-gap) * 6 + var(--ad-hex-w) / 2);
            transform: translateX(-50%);

            background: transparent !important;
            border: none !important;
            box-shadow: none !important;

            font-family: Arial, sans-serif;
            font-size: 11px;
            z-index: 800;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            user-select: none;
        }

        #actionDrawerContainer.movable { opacity: 0.9; cursor: move; }

        /* --- LE CADENAS (LOCK) --- */
        #adLockButton {
            position: absolute;
            left: 6px; 
            top: 15px; 
            width: 19px; 
            height: 19px;
            background-size: 100% 100%;
            background-repeat: no-repeat;
            cursor: pointer;
            z-index: 900;
            transition: opacity 0.2s;
        }
        #adLockButton:hover { filter: brightness(1.2); }
        #adLockButton.locked { background-image: url('${lockLockedUrl}'); opacity: 1; }
        #adLockButton.unlocked { background-image: url('${lockUnlockedUrl}'); opacity: 0.8; }

        /* --- LE DRAGGER (POIGNÉE DE DÉPLACEMENT) --- */
        #adDragger {
            position: absolute;
            /* Position ajustée pour la taille 19px */
            left: 9px;  /* Un peu plus à droite pour coller au bord */
            top: -8px;  /* Un peu plus bas pour toucher le haut de l'hexagone */
            
            /* Taille identique au cadenas (19px) */
            width: 19px;
            height: 19px;
            
            background-image: url('${draggerUrl}');
            background-size: contain;
            background-repeat: no-repeat;
            cursor: move;
            z-index: 910; 
            display: none; 
        }
        #adDragger:hover { filter: brightness(1.2); }

        /* --- 1. LES ONGLETS --- */
        #adTabs {
            display: flex;
            justify-content: flex-start;
            background: transparent !important;
            border: none !important;
            gap: var(--ad-gap);
            padding-left: var(--ad-item-offset); 
            margin-bottom: calc(var(--ad-row-overlap) * -1);
            width: 100%;
            position: relative;
        }
        /* ... (Reste du CSS inchangé pour adTab, adContentWrapper, etc.) ... */
        .adTab { width: var(--ad-hex-w); height: var(--ad-hex-h); border: none !important; background-color: transparent !important; background-image: url('${categoryBgStd}'); background-repeat: no-repeat; background-size: 100% 100%; background-position: center; display: flex; align-items: center; justify-content: center; cursor: pointer; filter: drop-shadow(0 0 1px rgba(255, 255, 255, 0.7)); transition: filter 0.15s ease-out, transform 0.1s ease-out; }
        .adTab:hover { background-image: url('${categoryBgHover}'); filter: brightness(1.15) drop-shadow(0 0 1px rgba(255, 255, 255, 0.7)); }
        .adTab.active { background-image: url('${categoryBgActive}'); filter: drop-shadow(0 0 6px rgba(255, 204, 0, 0.9)); transform: translateY(-1px); }
        .adTabIcon { width: 85%; height: 85%; object-fit: contain; pointer-events: none; }
        
        .adContentWrapper { display: flex; align-items: center; justify-content: flex-start; background: transparent !important; height: var(--ad-hex-h); margin-bottom: calc(var(--ad-row-overlap) * -1); width: calc(var(--ad-hex-w) * 7 + var(--ad-gap) * 6 + var(--ad-hex-w) / 2); padding: 0; gap: var(--ad-gap); margin-left: calc(var(--ad-hex-w) / -2); pointer-events: none; }
        .adArrowBtn { width: 22px; height: var(--ad-hex-h); background-color: transparent; background-repeat: no-repeat; background-position: center; cursor: pointer; border: none; pointer-events: auto; }
        .adArrowBtn:hover { filter: brightness(1.2); } .adArrowBtn:active { transform: scale(0.95); }
        #adScrollLeft { background-image: url('graphics/ui/actionMenu/images/152.png'); } #adScrollRight { background-image: url('graphics/ui/actionMenu/images/147.png'); }
        #adItemsRow { display: flex; padding: 0; overflow-x: hidden; overflow-y: hidden; align-items: center; justify-content: flex-start; height: 100%; scrollbar-width: none; gap: var(--ad-gap); width: calc(var(--ad-hex-w) * 6); max-width: calc(var(--ad-hex-w) * 6); flex: none; }
        #adItemsRow::-webkit-scrollbar { display: none; }
        
        #adTriggerRow { position: relative; display: block; height: var(--ad-hex-h); margin-top: calc(var(--ad-row-overlap) * -1); width: calc(var(--ad-hex-w) * 7 + var(--ad-gap) * 6 + var(--ad-hex-w) / 2); margin-left: calc(var(--ad-hex-w) / -2); padding-left: calc(22px + var(--ad-gap)); background: transparent !important; overflow: visible; pointer-events: none; z-index: 805; }
        .adTriggerBtn { position: absolute; top: 0; left: 0; width: var(--ad-hex-w); height: var(--ad-hex-h); background-image: url('${ACTION_DRAWER_ITEM_BG_DEFAULT}'); background-size: 100% 100%; background-repeat: no-repeat; background-position: center; background-color: transparent !important; border: none !important; display: flex; justify-content: center; align-items: center; cursor: pointer; transition: transform 0.18s ease-out; pointer-events: auto; filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.95)) drop-shadow(0 0 5px rgba(0, 170, 255, 0.5)); }
        .adTriggerBtn:hover { filter: brightness(1.15) drop-shadow(0 0 1px rgba(255, 255, 255, 0.7)) drop-shadow(0 0 8px rgba(0, 170, 255, 0.8)); } .adTriggerBtn:active { transform: scale(0.95); }
        .adItemBox { width: var(--ad-hex-w); height: var(--ad-hex-h); background-image: url('${ACTION_DRAWER_ITEM_BG_DEFAULT}'); background-size: 100% 100%; background-repeat: no-repeat; background-position: center; background-color: transparent !important; border: none !important; outline: none !important; box-shadow: none !important; margin-right: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; cursor: pointer; position: relative; flex-shrink: 0; pointer-events: auto; filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.95)); }
        .adItemBox:hover { filter: brightness(1.2) drop-shadow(0 0 2px rgba(255, 255, 255, 0.95)); }
        .adItemLabel { font-weight: bold; color: #ddd; font-size: 9px; text-align:center; overflow:hidden; width:100%; pointer-events:none;}
        .adItemQty { font-size: 9px; color: #ccc; position: absolute; bottom: 5px; right: 5px; pointer-events:none; text-shadow:1px 1px 0 #000; }
        .adItemQty.empty { color: #ff4444; }
        .adItemBox.active-laser { background-image: url('${ACTION_DRAWER_ITEM_BG_SELECTED}'); filter: drop-shadow(0 0 2px #ffffff) drop-shadow(0 0 1px #ffffff); z-index: 10; }
        .adItemBox.active-rocket { background-image: url('${ACTION_DRAWER_ITEM_BG_SELECTED}'); filter: drop-shadow(0 0 2px #ffcc00) drop-shadow(0 0 1px #ffcc00); z-index: 10; }
        .adItemBox:active { transform: scale(0.95); }
        .adCooldownOverlay { position: absolute; bottom: 2px; left: 2px; right: 2px; width: auto; background: rgba(0, 0, 0, 0.6); z-index: 5; pointer-events: none; clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); }
        .adCooldownText { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #fff; font-weight: bold; font-size: 10px; z-index: 6; text-shadow: 1px 1px 0 #000; }
    `;
    document.head.appendChild(style);

    // --- HTML STRUCTURE ---
    const container = document.createElement("div");
    container.id = "actionDrawerContainer";
    container.innerHTML = `
        <div id="adLockButton" title="Verrouiller/Déverrouiller"></div>
        <div id="adDragger" title="Déplacer le menu"></div> <div id="adTabs"></div>
        <div class="adContentWrapper">
            <div class="adArrowBtn" id="adScrollLeft"></div>
            <div id="adItemsRow"></div>
            <div class="adArrowBtn" id="adScrollRight"></div>
        </div>
        <div id="adTriggerRow">
            <div id="adTriggerBtn" class="adTriggerBtn"></div>
        </div>
    `;
    document.body.appendChild(container);

    // --- LOGIQUE DU CADENAS ET DU DRAGGER ---
    const lockBtn = document.getElementById("adLockButton");
    const draggerBtn = document.getElementById("adDragger");
    
    function updateLockVisuals() {
        if (quickbarLocked) {
            lockBtn.classList.add("locked");
            lockBtn.classList.remove("unlocked");
            lockBtn.title = "Barre verrouillée";
            // Cacher le dragger quand verrouillé
            draggerBtn.style.display = "none";
        } else {
            lockBtn.classList.add("unlocked");
            lockBtn.classList.remove("locked");
            lockBtn.title = "Barre déverrouillée";
            // Afficher le dragger quand déverrouillé
            draggerBtn.style.display = "block";
        }
    }
    
    updateLockVisuals();

    lockBtn.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        quickbarLocked = !quickbarLocked;
        updateLockVisuals();
        addInfoMessage(quickbarLocked ? "Barre verrouillée." : "Barre déverrouillée.");
        saveInterfaceLayout();
        renderActionDrawerItems(); // Rafraîchit aussi la Quickbar (via client_graphics)
    });

    // --- EVENTS SCROLLING ---
    const itemsRow       = document.getElementById("adItemsRow");
    const scrollLeftBtn  = document.getElementById("adScrollLeft");
    const scrollRightBtn = document.getElementById("adScrollRight");
    const SCROLL_STEP = ACTION_DRAWER_HEX_WIDTH + ACTION_DRAWER_GAP;

    if (itemsRow && scrollLeftBtn && scrollRightBtn) {
        scrollLeftBtn.addEventListener("click", () => {
            itemsRow.scrollBy({ left: -SCROLL_STEP, behavior: 'smooth' });
            setTimeout(() => updateActionDrawerArrowVisibility(), 120);
        });
        scrollRightBtn.addEventListener("click", () => {
            itemsRow.scrollBy({ left: SCROLL_STEP, behavior: 'smooth' });
            setTimeout(() => updateActionDrawerArrowVisibility(), 120);
        });
        itemsRow.addEventListener("scroll", () => {
            updateActionDrawerArrowVisibility();
            updateActionTriggerPosition();
        });
    }

    // --- DRAG SUR LE DRAGGER (171.png) CORRIGÉ ---
    
    // Empêche la propagation du clic pour ne pas cliquer sur la carte derrière
    container.addEventListener("mousedown", (e) => e.stopPropagation());
    
    let isDraggingDrawer = false;
    let drawerOffset = { x: 0, y: 0 };
    
    container.addEventListener("mousedown", (e) => {
        // Cible : On vérifie si on a cliqué sur le Dragger (priorité) ou dans le vide (si déverrouillé)
        const isDragger = (e.target.id === 'adDragger');
        const isInteract = e.target.closest('.adItemBox') || e.target.closest('.adArrowBtn') || e.target.closest('.adTriggerBtn') || e.target.id === 'adLockButton';
        
        // Si on clique sur un bouton interactif, on ne fait rien
        if (isInteract) return;

        // Condition : Clic sur le Dragger OU (Barre déverrouillée et clic dans le vide)
        if (isDragger || (!quickbarLocked && e.target === container)) {
            
            isDraggingDrawer = true;
            
            // 1. On récupère la position visuelle EXACTE actuelle du menu
            const rect = container.getBoundingClientRect();

            // 2. CRUCIAL : On désactive le centrage CSS (transform) pour passer en positionnement manuel
            // On fixe la position en pixels à l'endroit exact où elle est actuellement
            container.style.transform = "none";
            container.style.left = rect.left + "px";
            container.style.top  = rect.top + "px";

            // 3. On calcule l'écart entre la souris et le coin haut-gauche de la barre
            drawerOffset.x = e.clientX - rect.left;
            drawerOffset.y = e.clientY - rect.top;
            
            container.classList.add("movable");
        }
    });

    window.addEventListener("mousemove", (e) => {
        if (isDraggingDrawer) {
            // Le calcul devient très simple car on a retiré le transform css
            const newLeft = e.clientX - drawerOffset.x;
            const newTop  = e.clientY - drawerOffset.y;

            container.style.left = newLeft + "px"; 
            container.style.top  = newTop + "px";
        }
    });

    window.addEventListener("mouseup", () => {
        if (isDraggingDrawer) {
            isDraggingDrawer = false;
            container.classList.remove("movable");
            saveInterfaceLayout();
        }
    });

    // --- CHARGEMENT DES ONGLETS ET INITIALISATION ---
    // (Le reste de votre code pour les onglets reste inchangé ci-dessous...)
    const tabsContainer = document.getElementById('adTabs');
    const categories = [
        { id: "laser",   icon: "graphics/ui/actionMenu/images/42_laser.png.png",       title: "LASERS" },
        { id: "rocket",  icon: "graphics/ui/actionMenu/images/20_rocket.png.png",      title: "ROCKETS" },
        { id: "special", icon: "graphics/ui/actionMenu/images/63_explosive.png.png",   title: "SPECIAL" }, 
        { id: "cpu",     icon: "graphics/ui/actionMenu/images/73_cpu.png.png",         title: "CPUs" },
        { id: "buy_now", icon: "graphics/ui/actionMenu/images/60_fastbuy_icon.png.png", title: "BUY NOW" },
        { id: "tech",    icon: "graphics/ui/actionMenu/images/3_tech_icon.png.png",    title: "TECH" }, 
        { id: "ability", icon: "graphics/ui/actionMenu/images/104_ability.png.png",    title: "ABILITY" } 
    ];

    let tabsHtml = "";
    categories.forEach(cat => {
        const active = (cat.id === actionDrawerCategory) ? "active" : "";
        tabsHtml += `<div class="adTab ${active}" data-cat="${cat.id}" title="${cat.title}"><img src="${cat.icon}" class="adTabIcon"></div>`;
    });
    tabsContainer.innerHTML = tabsHtml;

    tabsContainer.addEventListener('click', (e) => {
        const tab = e.target.closest('.adTab');
        if(!tab) return;
        document.querySelectorAll('.adTab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        actionDrawerCategory = tab.dataset.cat;
        actionDrawerSelectedIndex = 0;
        
        itemsRow.scrollLeft = 0;
        renderActionDrawerItems();
    });

    renderActionDrawerItems();
}
	// Met à jour l'état d'affichage des flèches de défilement du tiroir d'action.
// - Si tout tient dans la fenêtre (<= 6 hexagones visibles), on cache les deux flèches.
// - Si on est complètement à gauche : on cache la flèche gauche, on affiche la droite.
// - Si on est complètement à droite : on cache la flèche droite, on affiche la gauche.
// - Si on est au milieu : on affiche les deux.
function updateActionDrawerArrowVisibility(totalItemsOverride) {
    const itemsRow       = document.getElementById("adItemsRow");
    const scrollLeftBtn  = document.getElementById("adScrollLeft");
    const scrollRightBtn = document.getElementById("adScrollRight");
    if (!itemsRow || !scrollLeftBtn || !scrollRightBtn) return;

    // Nombre d'items : on prend d'abord ce que la fonction appelante nous donne,
    // sinon on recompte les hexagones actuellement affichés.
    let totalItems = (typeof totalItemsOverride === "number")
        ? totalItemsOverride
        : itemsRow.querySelectorAll(".adItemBox").length;

    const maxScroll = itemsRow.scrollWidth - itemsRow.clientWidth;

    // CAS 1 : tout tient sans scroll → pas de flèches
    if (!totalItems || totalItems <= ACTION_DRAWER_VISIBLE_SLOTS || maxScroll <= 0) {
        itemsRow.scrollLeft = 0;
        scrollLeftBtn.style.visibility  = "hidden";
        scrollRightBtn.style.visibility = "hidden";
        return;
    }

    const epsilon = 2; // petite tolérance en pixels
    const currentScroll = itemsRow.scrollLeft || 0;

    // Complètement à gauche → uniquement flèche droite
    if (currentScroll <= epsilon) {
        scrollLeftBtn.style.visibility  = "hidden";
        scrollRightBtn.style.visibility = "visible";
        return;
    }

    // Complètement à droite → uniquement flèche gauche
    if (currentScroll >= maxScroll - epsilon) {
        scrollLeftBtn.style.visibility  = "visible";
        scrollRightBtn.style.visibility = "hidden";
        return;
    }

    // Au milieu → les deux flèches
    scrollLeftBtn.style.visibility  = "visible";
    scrollRightBtn.style.visibility = "visible";
}

	
	function initDragAndDrop() {
        const cvs = document.getElementById("gameCanvas");
        if(!cvs) return;

        // 1. Autoriser le survol (nécessaire pour que le drop fonctionne)
        cvs.addEventListener("dragover", (e) => {
            e.preventDefault(); // Obligatoire pour autoriser le drop
        });

        // 2. Gérer le "Lâcher" (Drop)
        cvs.addEventListener("drop", (e) => {
            e.preventDefault();

            if (!draggedActionItem) return; // Rien n'était glissé
            if (quickbarLocked) return;     // Sécurité double

            // Calcul des coordonnées souris relatives au Canvas
            const rect = cvs.getBoundingClientRect();
            const scaleX = cvs.width / rect.width;
            const scaleY = cvs.height / rect.height;

            const mouseX = (e.clientX - rect.left) * scaleX;
            const mouseY = (e.clientY - rect.top) * scaleY;

            // On cherche si on est tombé sur un slot
            // quickbarSlotRects est rempli dans drawQuickbar()
            let foundSlot = null;

            for (let slot = 1; slot <= 10; slot++) {
                const r = quickbarSlotRects[slot];
                if (r && mouseX >= r.x && mouseX <= r.x + r.w &&
                         mouseY >= r.y && mouseY <= r.y + r.h) {
                    foundSlot = slot;
                    break;
                }
            }

            // Si on a trouvé un slot, on l'assigne !
            if (foundSlot) {
                const item = draggedActionItem;
                
                // Formatage de l'objet pour quickSlots
                // On ne stocke que le nécessaire (type + id ou code)
                if (item.type === "ammo" || item.type === "rocket" || item.type === "tech" || item.type === "mine") {
                    quickSlots[foundSlot] = { type: item.type, id: item.id, label: item.label };
                } else if (item.type === "cpu") {
                    quickSlots[foundSlot] = { type: "cpu", code: item.code, label: item.label };
                }

                addInfoMessage(`Slot ${foundSlot} configuré : ${item.label || item.code}`);
                
                // Sauvegarde locale pour la prochaine session
                saveQuickbarLayout();
            }

            // Reset
            draggedActionItem = null;
        });
    }

    function renderActionDrawerTabs() {
        const tabsContainer = document.getElementById('adTabs');
        if(!tabsContainer) return;

        // Catégories disponibles (basé sur ton objet QUICKBAR_ITEMS_BY_CATEGORY)
        const categories = [
            { id: "laser", label: "Lasers" },
            { id: "rocket", label: "Roquettes" },
            { id: "special", label: "Special Ammo" },
            { id: "cpu", label: "CPUs" },
            { id: "tech", label: "Tech Items" }
            // Tu pourras ajouter 'buy' ou 'ability' plus tard
        ];

        let html = "";
        categories.forEach(cat => {
            const isActive = (cat.id === actionDrawerCategory) ? "active" : "";
            html += `<div class="adTab ${isActive}" data-cat="${cat.id}">${cat.label}</div>`;
        });
        tabsContainer.innerHTML = html;
    }

 // --- Fonction utilitaire à ajouter juste avant renderActionDrawerItems ---
    function getSelectedActionDrawerItem() {
        const items = QUICKBAR_ITEMS_BY_CATEGORY[actionDrawerCategory];
        if (!items || items.length === 0) return null;
        
        // Sécurité : si l'index est hors limites, on prend le premier
        if (actionDrawerSelectedIndex < 0 || actionDrawerSelectedIndex >= items.length) {
            actionDrawerSelectedIndex = 0;
        }
        return items[actionDrawerSelectedIndex];
    }

   // --- Fonction corrigée pour le Drag & Drop ---
    function renderActionDrawerItems() {
        initActionDrawerTooltips();
        const itemsRow = document.getElementById('adItemsRow');
        const triggerBtn = document.getElementById('adTriggerBtn');
        if(!itemsRow || !triggerBtn) return;

        // 1. Trigger (Bouton central)
        const categoryIcons = {
            laser:   "graphics/ui/actionMenu/images/42_laser.png.png",
            rocket:  "graphics/ui/actionMenu/images/20_rocket.png.png",
            special: "graphics/ui/actionMenu/images/63_explosive.png.png",
            cpu:     "graphics/ui/actionMenu/images/73_cpu.png.png",
            buy_now: "graphics/ui/actionMenu/images/60_fastbuy_icon.png.png",
            tech:    "graphics/ui/actionMenu/images/3_tech_icon.png.png",
            ability: "graphics/ui/actionMenu/images/104_ability.png.png"
        };
        const iconSrc = categoryIcons[actionDrawerCategory] || "";
        const newTriggerHtml = iconSrc ? `<img src="${iconSrc}" style="width:85%; height:85%; object-fit:contain; pointer-events:none;">` : "";
        if (triggerBtn.innerHTML !== newTriggerHtml) triggerBtn.innerHTML = newTriggerHtml;

        triggerBtn.onclick = (e) => {
            e.stopPropagation();
            if (actionDrawerCategory === "laser") { if (typeof toggleLaserOnSelectedTarget === "function") toggleLaserOnSelectedTarget(); }
            else if (actionDrawerCategory === "rocket") { if (selectedTargetId) sendRocketAttack(selectedTargetId); else addInfoMessage("Aucune cible."); }
            else { const sel = getSelectedActionDrawerItem(); if (sel) executeItemActionDirectly(sel); }
        };

        // 2. Filtrage des items
        const rawItems = QUICKBAR_ITEMS_BY_CATEGORY[actionDrawerCategory] || [];
        const visibleItems = rawItems.filter(item => {
            if (item.reqShips && Array.isArray(item.reqShips)) { if (heroShipId!==0 && !item.reqShips.includes(heroShipId)) return false; }
            return true;
        });

        // 3. Gestion du DOM (Réutilisation)
        const existingNodes = itemsRow.children;
        while (existingNodes.length > visibleItems.length) {
            itemsRow.removeChild(existingNodes[existingNodes.length - 1]);
        }

        visibleItems.forEach((item, index) => {
            // A. Données
            let qty = 0;
            let hasStock = false;
            let stockId = item.stockId;
            
            if (!stockId && QUICKBAR_ITEMS_BY_CATEGORY[item.type]) {
                 const found = QUICKBAR_ITEMS_BY_CATEGORY[item.type].find(i => i.id === item.id || i.code === item.code);
                 if(found) stockId = found.stockId;
            }
            if (stockId && typeof ammoStock !== 'undefined' && ammoStock[stockId] !== undefined) {
                qty = parseInt(ammoStock[stockId], 10) || 0;
                hasStock = true;
            }

            // B. HTML Barre
            let ammoBarHtml = "";
            let showQtyText = true; 

            if (item.type === "ammo" || item.type === "rocket" || item.type === "mine" || (item.type === "cpu" && stockId)) {
                const maxVal = (item.type === "ammo") ? 2000 : 100; 
                const clampedQty = Math.max(0, Math.min(qty, maxVal));
                const framesLoaded = AMMO_BAR_FRAME_IDS.length;
                let ratio = clampedQty / maxVal;
                let frameIndex = Math.floor(ratio * (framesLoaded - 1));
                if (frameIndex < 0) frameIndex = 0;
                if (frameIndex >= framesLoaded) frameIndex = framesLoaded - 1;

                const imageNum = AMMO_BAR_FRAME_IDS[frameIndex];
                
                // Utilisation des dimensions globales
                const bW = (typeof AMMO_BAR_WIDTH !== 'undefined') ? AMMO_BAR_WIDTH : 38;
                const bH = (typeof AMMO_BAR_HEIGHT !== 'undefined') ? AMMO_BAR_HEIGHT : 9;
                const bTop = (typeof AMMO_BAR_OFFSET_TOP !== 'undefined') ? AMMO_BAR_OFFSET_TOP : 13;

                ammoBarHtml = `<img src="graphics/ui/actionMenu/images/${imageNum}.png"
                                    style="position:absolute; width:${bW}px; height:${bH}px; left:50%; top:${bTop}px; transform:translateX(-50%); pointer-events:none; z-index:15;">`;
                showQtyText = false; 
            }

            // C. HTML Texte
            let qtyHtml = "";
            if (showQtyText) {
                let qtyText = "";
                let qtyClass = "";
                if (hasStock) {
                    qtyText = (qty > 9999) ? (qty/1000).toFixed(0)+"k" : qty.toString();
                    if (qty <= 0) qtyClass = "empty";
                } else {
                    if (item.type === 'cpu' && !stockId) qtyText = ""; 
                    else { qtyText = "0"; qtyClass = "empty"; }
                }
                qtyHtml = `<span class="adItemQty ${qtyClass}">${qtyText}</span>`;
            }

            // D. HTML Icône
            const iconPath = getQuickbarIconPath(item);
            let contentHtml = iconPath 
                ? `<img src="${iconPath}" style="width:38px; height:38px; object-fit:contain; pointer-events:none; z-index:2;">`
                : `<span class="adItemLabel">${item.label || "X"}</span>`;

            // E. Classes & Style
            const isActiveAmmo = (item.type === "ammo" && currentAmmoId === item.id);
            const isActiveRocket = (item.type === "rocket" && currentRocketId === item.id);
            let targetClass = "adItemBox";
            let targetBg = `url('${ACTION_DRAWER_ITEM_BG_DEFAULT}')`;

            if (isActiveAmmo) { targetClass += " active-laser"; targetBg = `url('${ACTION_DRAWER_ITEM_BG_SELECTED}')`; }
            else if (isActiveRocket) { targetClass += " active-rocket"; targetBg = `url('${ACTION_DRAWER_ITEM_BG_SELECTED}')`; }

            // F. Cooldown
            let cdHtml = "";
            let code = item.code || (item.type === "rocket" ? "ROK" : null);
            if (!code && item.type === "tech") { const techMap = { 1:"ELA", 2:"ECI", 3:"RPM", 4:"SBU", 5:"BRB", 6:"SL", 7:"CID" }; code = techMap[item.id]; }
            if (code) {
                const cdInfo = getCooldownInfo(code);
                if (cdInfo) {
                    const pct = (cdInfo.remaining / cdInfo.total) * 100;
                    cdHtml = `<div class="adCooldownOverlay" style="height:${pct}%"></div><div class="adCooldownText">${Math.ceil(cdInfo.remaining)}</div>`;
                }
            }

            const finalInnerHTML = `${cdHtml}${ammoBarHtml}${contentHtml}${qtyHtml}`;
            
            // G. Mise à jour ou Création de la DIV
            let div;
            if (index < existingNodes.length) {
                div = existingNodes[index];
                // Mise à jour visuelle uniquement si changement (optimisation)
                if (div.className !== targetClass) div.className = targetClass;
                if (div.style.backgroundImage !== targetBg) div.style.backgroundImage = targetBg;
                if (div.innerHTML !== finalInnerHTML) div.innerHTML = finalInnerHTML;
            } else {
                div = document.createElement("div");
                div.className = targetClass;
                div.style.backgroundImage = targetBg;
                div.innerHTML = finalInnerHTML;
                itemsRow.appendChild(div);
            }

            // H. MISE A JOUR DES ATTRIBUTS & EVENTS (CRUCIAL POUR LE DRAG)
            
            // 1. On force l'attribut draggable à jour (même si le noeud existait déjà)
            const canDrag = !quickbarLocked;
            div.setAttribute("draggable", canDrag.toString());

            // 2. Events (On écrase les handlers pour éviter les doublons)
            
            // Clic (Sélection)
            div.onclick = (e) => {
                e.stopPropagation();
                actionDrawerSelectedIndex = index;
                updateActionTriggerPosition(div);
                executeItemActionDirectly(item);
                setTimeout(renderActionDrawerItems, 10);
            };

            // Tooltips
            div.onmouseenter = (e) => showActionTooltip(e, item);
            div.onmousemove = (e) => moveActionTooltip(e);
            div.onmouseleave = () => hideActionTooltip();

            // Drag & Drop
            div.ondragstart = (e) => {
                if (quickbarLocked) { 
                    e.preventDefault(); 
                    return; 
                }
                draggedActionItem = item; 
                e.dataTransfer.effectAllowed = "copy";
            };
            div.ondragend = () => { draggedActionItem = null; };
        });

        if (typeof updateActionDrawerArrowVisibility === "function") updateActionDrawerArrowVisibility(visibleItems.length);
        requestAnimationFrame(() => updateActionTriggerPosition());
    }

    function getActionDrawerTargetElement(preferredElement) {
        const itemsRow = document.getElementById('adItemsRow');
        if (!itemsRow) return null;

        const items = itemsRow.querySelectorAll('.adItemBox');
        if (!items.length) return null;

        if (preferredElement && itemsRow.contains(preferredElement)) {
            return preferredElement;
        }

        const activeSlot = itemsRow.querySelector('.adItemBox.active-laser, .adItemBox.active-rocket');
        if (activeSlot) {
            actionDrawerSelectedIndex = Array.from(items).indexOf(activeSlot);
            return activeSlot;
        }

        if (actionDrawerSelectedIndex >= items.length) {
            actionDrawerSelectedIndex = items.length - 1;
        }

        return items[actionDrawerSelectedIndex] || items[0];
    }

    function updateActionTriggerPosition(preferredElement) {
        const triggerBtn = document.getElementById('adTriggerBtn');
        const triggerRow = document.getElementById('adTriggerRow');
        const itemsRow   = document.getElementById('adItemsRow');
        if (!triggerBtn || !triggerRow || !itemsRow) return;

        // --- NOUVEAU : Masquer le bouton Trigger si ce n'est pas Laser ou Roquette ---
        // Dans le Flash, ce bouton ne sert qu'à "Armer" une munition. 
        // Pour les CPU/Techs, le clic dans la liste suffit.
        if (actionDrawerCategory !== "laser" && actionDrawerCategory !== "rocket") {
            triggerBtn.style.visibility = "hidden";
            triggerBtn.style.pointerEvents = "none";
            return;
        }
        // -----------------------------------------------------------------------------

        const target = getActionDrawerTargetElement(preferredElement);
        if (!target) {
            // Pas d'élément sélectionné : on masque le gros hexagone
            triggerBtn.style.visibility = "hidden";
            triggerBtn.style.pointerEvents = "none";
            return;
        }

        const itemRect = target.getBoundingClientRect();
        const listRect = itemsRow.getBoundingClientRect();
        const rowRect  = triggerRow.getBoundingClientRect();

        // Est-ce que la variante sélectionnée est encore dans la fenêtre de 6 hexagones ?
        const isOutOfView =
            itemRect.right <= listRect.left + 2 ||
            itemRect.left  >= listRect.right - 2;

        const wasHidden = (triggerBtn.style.visibility === "hidden");

        if (isOutOfView) {
            // On masque la ligne 3 tant que l'item sélectionné n'est plus visible
            triggerBtn.style.visibility = "hidden";
            triggerBtn.style.pointerEvents = "none";
            return;
        }

        // Si on vient d'un scroll (preferredElement undefined), que le bouton est déjà caché
        // et que l'item redevient visible, on le laisse caché jusqu'à un nouveau clic.
        if (!preferredElement && wasHidden) {
            return;
        }

        // Sinon, on affiche le bouton et on le positionne sous la variante
        triggerBtn.style.visibility = "visible";
        triggerBtn.style.pointerEvents = "auto";

        const triggerWidth  = triggerBtn.offsetWidth  || ACTION_DRAWER_HEX_WIDTH;
        const triggerHeight = triggerBtn.offsetHeight || ACTION_DRAWER_HEX_HEIGHT;

        const xOffset = itemRect.left - rowRect.left - triggerWidth + 23;
        const yOffset = itemRect.bottom - rowRect.top + Math.min(2, Math.round(triggerHeight * 0.02)) - 9;

        triggerBtn.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
    }


    // Nouvelle fonction pour exécuter une action sans passer par un slot
    function executeItemActionDirectly(item) {
        if (!item) return;

        if (item.type === "ammo") {
            if (item.id === RSB_AMMO_ID) {
                if (isActionOnCooldown("RSB")) {
                    addInfoMessage("RSB en cooldown.");
                    return;
                }
                triggerRsbBurst();
            } else if (currentAmmoId !== item.id) {
                sendSelectAmmo(item.id);
            }
            // Si on a une cible, on attaque !
            if (selectedTargetId !== null) {
                sendLaserAttack(selectedTargetId);
                isChasingTarget = true;
            }
        }
        else if (item.type === "rocket") {
             if (currentRocketId !== item.id) {
                sendSelectRocket(item.id);
            }
        }
        else if (item.type === "tech") {
            sendTechActivation(item.id);
        } 
        else if (item.type === "cpu") {
            
            // --- CORRECTION SYSTEME DE REPARATION (ROB) ---
            if (item.code === "ROB") {
                
                // 1. ARRÊT DU MOUVEMENT (Impératif pour le serveur)
                // On annule la destination locale
                moveTargetX = null;
                moveTargetY = null;
                
                // On envoie un paquet de mouvement sur notre position ACTUELLE
                // Cela dit au serveur : "Je vais en X,Y" (où X,Y = ma position actuelle) => STOP.
                if (typeof sendMoveToServer === "function" && typeof shipX !== 'undefined' && typeof shipY !== 'undefined') {
                    sendMoveToServer(shipX, shipY);
                }

                // 2. ARRÊT DU TIR (Le serveur refuse la réparation si on attaque)
                if (typeof currentLaserTargetId !== 'undefined' && currentLaserTargetId !== null) {
                    if (typeof sendLaserStop === "function") {
                        // On envoie le stop serveur
                        sendLaserStop(currentLaserTargetId, true);
                    }
                    // On nettoie l'état d'attaque local
                    if (typeof isChasingTarget !== 'undefined') isChasingTarget = false;
                    currentLaserTargetId = null;
                }

                // 3. PETITE VÉRIF VISUELLE (Optionnel)
                if (typeof heroHp !== 'undefined' && typeof heroMaxHp !== 'undefined' && heroHp >= heroMaxHp) {
                    addInfoMessage("Points de vie maximum atteints.");
                    // On laisse quand même passer la commande pour la logique serveur
                }
            }
            // ----------------------------------------------
            
            sendCpuAction(item.code);
        }
        else if (item.type === "mine") {
            sendRaw("u|m|" + item.id);
        }
        else if (item.type === "buy") {
            sendRaw("5|buy|" + item.id); 
            addInfoMessage("Achat demandé : " + item.label);
        }
        else if (item.type === "ability") {
            sendRaw("ab|" + item.id);
            addInfoMessage("Aptitude : " + item.label);
        }
    }
    
// Récupère l'item actuellement sélectionné dans le tiroir (basé sur l'index visuel)
    function getSelectedActionDrawerItem() {
        const items = QUICKBAR_ITEMS_BY_CATEGORY[actionDrawerCategory];
        if (!items || items.length === 0) return null;
        
        // Sécurité : si l'index est hors limites, on prend le premier
        if (actionDrawerSelectedIndex < 0 || actionDrawerSelectedIndex >= items.length) {
            actionDrawerSelectedIndex = 0;
        }
        
        return items[actionDrawerSelectedIndex];
    }
    



    // Messages texte
    const infoMessages = [];
	
	    // -------------------------------------------------
    // SYSTEME DE QUETES / MISSIONS
    // -------------------------------------------------

    // Stockage local des quêtes
    // quests[questId] = { id, category, title, flatConditions: { condId: {...} } }
    const quests = {};
    let privilegedQuestId = null; // quête "sélectionnée"

    function getQuest(questId) {
        questId = Number(questId);
        return quests[questId] || null;
    }

    function setQuest(quest) {
        if (!quest || quest.id == null) return;
        quests[quest.id] = quest;
        if (privilegedQuestId == null) {
            privilegedQuestId = quest.id;
        }
        // Si la fenêtre est ouverte, on la rafraîchit
        renderQuestWindow();
    }

    function deleteQuest(questId) {
        questId = Number(questId);
        if (quests[questId]) {
            delete quests[questId];
        }
        if (privilegedQuestId === questId) {
            const ids = Object.keys(quests).map(x => parseInt(x, 10)).sort((a, b) => a - b);
            privilegedQuestId = ids.length > 0 ? ids[0] : null;
        }
        renderQuestWindow();
    }

    function getQuestStockCount() {
        return Object.keys(quests).length;
    }

    function getNextQuestId() {
        const ids = Object.keys(quests).map(x => parseInt(x, 10)).sort((a, b) => a - b);
        return ids.length > 0 ? ids[0] : -1;
    }

    function privilegeQuestById(questId) {
        questId = Number(questId);
        if (!quests[questId]) return;
        if (privilegedQuestId !== questId) {
            privilegedQuestId = questId;
            renderQuestWindow();
        }
    }

    function isConditionCompleted(cond) {
        if (!cond) return false;
        if (cond.visibility === 2) return true;
        if (cond.target > 0 && cond.current >= cond.target) return true;
        // Si pas de cible, on considère l'état "on" comme critère d'avancement
        return cond.target === 0 && !!cond.runstate;
    }

    function getQuestState(quest) {
        if (!quest) {
            return {
                hasRunning: false,
                readyToTurnIn: false,
                hasMandatory: false,
                hasVisible: false
            };
        }

        let hasRunning = false;
        let readyToTurnIn = true;
        let hasMandatory = false;
        let hasVisible = false;

        for (const cond of Object.values(quest.flatConditions || {})) {
            if (cond.visibility !== 0) {
                hasVisible = true;
            }

            if (cond.runstate) {
                hasRunning = true;
            }

            if (cond.mandatory) {
                hasMandatory = true;
                if (!isConditionCompleted(cond)) {
                    readyToTurnIn = false;
                }
            }
        }

        // Si aucune condition obligatoire n'est définie, on ne force pas l'achèvement
        if (!hasMandatory) {
            readyToTurnIn = false;
        }

        return { hasRunning, readyToTurnIn, hasMandatory, hasVisible };
    }

    // Parse du XML de quête → objet JS
    function parseQuestXmlToQuest(xmlString, category) {
        const quest = {
            id: null,
            category: category || "std",
            title: "",
            flatConditions: {}
        };

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(xmlString, "application/xml");
            const root = doc.documentElement; // <case ...>

            if (!root) {
                console.error("[QUEST] XML invalide (pas de root).", xmlString);
                return null;
            }

            const questIdAttr = root.getAttribute("id");
            if (!questIdAttr) {
                console.error("[QUEST] XML sans attribut id sur le root.", xmlString);
                return null;
            }

            quest.id = parseInt(questIdAttr, 10);

            const titleAttr = root.getAttribute("title") || root.getAttribute("name");
            if (titleAttr) {
                quest.title = titleAttr;
            } else {
                quest.title = "Quête " + quest.id;
            }

            const condMap = {};

            function parseConditionsRec(node, parentCondId) {
                for (const child of Array.from(node.children)) {
                    if (child.nodeName === "cond") {
                        const id = parseInt(child.getAttribute("id") || "0", 10);
                        const typeKey = parseInt(child.getAttribute("k") || "0", 10);
                        const modifier = child.getAttribute("m") || "";
                        const current = parseInt(child.getAttribute("cur") || "0", 10);
                        const target = parseInt(child.getAttribute("t") || "0", 10);
                        const runstate = (child.getAttribute("on") || "0") === "1";
                        const mandatory = (child.getAttribute("do") || child.getAttribute("do_") || "0") === "1";
                        const visibility = parseInt(child.getAttribute("viz") || "0", 10);
                        const description = (child.getAttribute("desc") || child.getAttribute("d") || child.textContent || "").trim();

                        if (!condMap[id]) {
                            condMap[id] = {
                                id,
                                typeKey,
                                modifier,
                                current,
                                target,
                                runstate,
                                mandatory,
                                visibility,
                                description,
                                children: []
                            };
                        } else {
                            const c = condMap[id];
                            c.typeKey = typeKey;
                            c.modifier = modifier;
                            c.current = current;
                            c.target = target;
                            c.runstate = runstate;
                            c.mandatory = mandatory;
                            c.visibility = visibility;
                            c.description = description;
                        }

                        if (parentCondId != null && condMap[parentCondId]) {
                            condMap[parentCondId].children.push(id);
                        }

                        parseConditionsRec(child, id);
                    } else if (child.nodeName === "case") {
                        parseConditionsRec(child, parentCondId);
                    } else {
                        parseConditionsRec(child, parentCondId);
                    }
                }
            }

            parseConditionsRec(root, null);

            quest.flatConditions = condMap;
            return quest;

        } catch (e) {
            console.error("[QUEST] Erreur de parse XML :", e, xmlString);
            return null;
        }
    }

    // API "QuestManager" côté client

    function initQuestFromServer(xmlString, category) {
        const q = parseQuestXmlToQuest(xmlString, category);
        if (!q) return;
        setQuest(q);
        addInfoMessage(`Nouvelle quête disponible (#${q.id})`);
    }

    function setQuestAccomplished(questId, param2) {
        const q = getQuest(questId);
        if (!q) return;
        addInfoMessage(`Quête accomplie : ${q.title}`);
        deleteQuest(questId);
    }

    function setQuestFailed(questId) {
        const q = getQuest(questId);
        if (!q) return;
        addInfoMessage(`Quête échouée : ${q.title}`);
        deleteQuest(questId);
    }

    function setQuestCancelled(questId) {
        const q = getQuest(questId);
        if (!q) return;
        addInfoMessage(`Quête annulée : ${q.title}`);
        deleteQuest(questId);
    }

    function updateQuestCondition(questId, condId, current, visibility, runstate) {
        questId = Number(questId);
        condId  = Number(condId);

        const q = getQuest(questId);
        if (!q) {
            console.warn("[QUEST] updateQuestCondition sur une quête inconnue, id=", questId);
            return;
        }

        const cond = q.flatConditions[condId];
        if (!cond) {
            console.warn("[QUEST] Condition inconnue dans questId=", questId, "condId=", condId);
            return;
        }

        cond.current   = current;
        cond.visibility = visibility;
        cond.runstate   = !!runstate;

        if (cond.children && cond.children.length > 0) {
            for (const childId of cond.children) {
                const child = q.flatConditions[childId];
                if (child) {
                    child.runstate   = cond.runstate;
                    child.visibility = cond.visibility;
                }
            }
        }

        if (privilegedQuestId === questId) {
            renderQuestWindow();
        }
    }

    // API pour actions client → serveur
    function sendQuestAccept(questId) {
        sendRaw(`9|acc|${questId}`);
    }

    function sendQuestCancel(questId) {
        sendRaw(`9|can|${questId}`);
    }

    function sendQuestTurnIn(questId) {
        sendRaw(`9|done|${questId}`);
    }
	
	// ==========================================
// SYSTÈME DE TOOLTIPS (INFOBULLES)
// ==========================================
function initActionDrawerTooltips() {
    // 1. Création du style CSS
    if (!document.getElementById('style-ad-tooltip')) {
        const style = document.createElement('style');
        style.id = 'style-ad-tooltip';
        style.innerHTML = `
            #adTooltip {
                position: absolute;
                background: rgba(16, 26, 38, 0.95);
                border: 1px solid #4a6b8c;
                color: #cee;
                padding: 5px 8px;
                font-family: 'Verdana', sans-serif;
                font-size: 10px;
                pointer-events: none;
                z-index: 10000;
                display: none;
                box-shadow: 0 0 6px rgba(0,0,0,0.8);
                border-radius: 4px;
                min-width: 100px;
                text-align: left;
                line-height: 1.4em;
            }
            #adTooltip .ttHeader { color: #fff; font-weight: bold; font-size: 11px; margin-bottom: 3px; border-bottom: 1px solid #334; padding-bottom: 2px; }
            #adTooltip .ttBody { color: #cde8ff; white-space: pre-line; }
            #adTooltip .ttRow { display: flex; justify-content: space-between; gap: 10px; }
            #adTooltip .ttLabel { color: #8ab; }
            #adTooltip .ttVal { color: #fff; font-weight: bold; }
        `;
        document.head.appendChild(style);
    }

    // 2. Création de la boite HTML
    if (!document.getElementById('adTooltip')) {
        const tooltip = document.createElement('div');
        tooltip.id = 'adTooltip';
        document.body.appendChild(tooltip);
    }
}

function showActionTooltip(e, item) {
    const tt = document.getElementById('adTooltip');
    if (!tt || !item) return;

    // Titre (Nom de l'item)
    let title = item.label || item.code || "Item";
    let html = `<div class="ttHeader">${title}</div>`;

    // --- Gestion de la Quantité ---
    let qty = 0;
    let hasStock = false;
    let stockId = item.stockId;
    
    // Recherche de l'ID de stock si manquant
    if (!stockId && typeof QUICKBAR_ITEMS_BY_CATEGORY !== 'undefined' && QUICKBAR_ITEMS_BY_CATEGORY[item.type]) { 
        const found = QUICKBAR_ITEMS_BY_CATEGORY[item.type].find(i => i.id === item.id || i.code === item.code); 
        if(found) stockId = found.stockId; 
    }
    if (stockId && typeof ammoStock !== 'undefined' && ammoStock[stockId] !== undefined) { 
        qty = ammoStock[stockId];
        hasStock = true;
    }

    // Affichage Quantité pour Ammo/Rocket/Mine/CPU
    if (item.type === "ammo" || item.type === "rocket" || item.type === "mine" || (item.type === "cpu" && hasStock)) {
        html += `
        <div class="ttRow">
            <span class="ttLabel">Quantité:</span>
            <span class="ttVal">${qty.toLocaleString()}</span>
        </div>`;
    }

    // --- Gestion du Cooldown ---
    let code = item.code || (item.type === "rocket" ? "ROK" : null);
    if (!code && item.type === "tech") { const techMap = { 1:"SBU", 2:"BRB", 3:"ELA", 4:"CIP", 5:"PTT" }; code = techMap[item.id]; }
    
    if (code && typeof getCooldownInfo === "function") {
        const cd = getCooldownInfo(code);
        if (cd) {
             html += `
             <div class="ttRow">
                <span class="ttLabel" style="color:#f66">Recharge:</span>
                <span class="ttVal" style="color:#f66">${Math.ceil(cd.remaining)}s</span>
             </div>`;
        }
    }

    tt.innerHTML = html;
    tt.style.display = 'block';
    moveActionTooltip(e);
}

function moveActionTooltip(e) {
    const tt = document.getElementById('adTooltip');
    if (tt && tt.style.display === 'block') {
        // La bulle suit la souris avec un petit décalage
        tt.style.left = (e.clientX + 15) + 'px';
        tt.style.top = (e.clientY + 15) + 'px';
    }
}

function hideActionTooltip() {
    const tt = document.getElementById('adTooltip');
    if (tt) tt.style.display = 'none';
}
