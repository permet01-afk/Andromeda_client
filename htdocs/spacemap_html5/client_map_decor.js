// Phase 8C: visual-only Flash map decorations. Coordinates are logical (Phase 6
// applies zoom/DPR once, outside these draws). No packets, gameplay or DB state.
class MapDecorRenderer {
    constructor(assets, definitions, createImage, createCanvas) {
        this.assets = assets;
        this.definitions = definitions;
        this.createImage = createImage;
        this.createCanvas = createCanvas;
        this.images = new Map();
        this.stationAlpha = new WeakMap();
        this.mapId = undefined;
        this.enabled = true;
        this.setMap(null);
    }

    setMap(id) {
        if (this.mapId === id) return;
        this.mapId = id;
        const def = this.definitions[id] || { planets: [], flares: [] };
        this.planets = def.planets.map(definition => ({ definition, readyAt: null }));
        // XML ids are not unique (3-8 has two id=0): retain each array instance.
        this.flares = def.flares.map(definition => ({ definition, readyAt: null,
            state: 0, alphaFrom: 1, alphaTo: 1, fadeAt: 0, rotation: 0,
            lens5Scale: 1, lensDx: 0, lensDy: 0, flashAt: null, useLensFlash: false }));
        this.lastTick = null;
        this.lastCamera = null;
    }

    setEnabled(enabled) {
        if (this.enabled === enabled) return;
        this.enabled = enabled;
        // No pending tween/load callback can resurrect a previous map or flash.
        const id = this.mapId;
        this.mapId = undefined;
        this.setMap(id);
    }

    image(key) {
        if (!this.images.has(key)) this.images.set(key, this.createImage(this.assets[key].src));
        return this.images.get(key);
    }

    loaded(key) {
        const image = this.image(key);
        return image.complete && image.width > 0 && image.height > 0;
    }

    project(def, view) {
        return { x: view.width / 2 - view.cameraX / def.pFactor + Math.trunc(def.x * 10 / def.pFactor),
            y: view.height / 2 - view.cameraY / def.pFactor + Math.trunc(def.y * 10 / def.pFactor) };
    }

    ease(elapsed, duration) {
        const t = Math.max(0, Math.min(1, elapsed / duration));
        return 1 - (1 - t) * (1 - t); // TweenLite default Quad.easeOut.
    }

    alpha(flare, now) {
        return flare.alphaFrom + (flare.alphaTo - flare.alphaFrom) * this.ease(now - flare.fadeAt, 500);
    }

    fade(flare, to, now) {
        flare.alphaFrom = this.alpha(flare, now);
        flare.alphaTo = to;
        flare.fadeAt = now;
    }

    flashAlpha(flare, now) {
        if (flare.flashAt === null) return 0;
        const dt = now - flare.flashAt;
        if (dt < 250) return .75 * this.ease(dt, 250);
        if (dt < 3250) return .75 * (1 - this.ease(dt - 250, 3000));
        flare.flashAt = null;
        return 0;
    }

    sprite(ctx, key, x, y, alpha = 1, scale = 1, rotation = 0, frame = 0) {
        if (alpha <= 0 || !this.loaded(key)) return;
        const def = this.assets[key], image = this.image(key);
        ctx.save();
        ctx.globalCompositeOperation = "source-over"; // No additive/screen blend in the source.
        ctx.globalAlpha *= alpha;
        ctx.translate(x, y);
        if (rotation) ctx.rotate(rotation * Math.PI / 180);
        if (scale !== 1) ctx.scale(scale, scale);
        if (def.frames) {
            const i = frame % def.frames;
            ctx.drawImage(image, i % def.columns * def.width, Math.floor(i / def.columns) * def.height,
                def.width, def.height, -def.pivotX, -def.pivotY, def.width, def.height);
        } else {
            ctx.drawImage(image, -def.pivotX, -def.pivotY);
        }
        ctx.restore();
    }

    drawPlanets(ctx, view, now) {
        this.setEnabled(view.enabled);
        if (!this.enabled) return;
        for (const planet of this.planets) {
            const def = planet.definition;
            if (!this.loaded(def.asset)) continue;
            if (planet.readyAt === null) planet.readyAt = now;
            const p = this.project(def, view);
            this.sprite(ctx, def.asset, p.x, p.y, this.ease(now - planet.readyAt, 500));
        }
    }

    behindPlanet(x, y, view) {
        for (const planet of this.planets) {
            const def = planet.definition;
            if (!this.loaded(def.asset)) continue;
            const p = this.project(def, view);
            if ((p.x - x) ** 2 + (p.y - y) ** 2 < (def.radius + 5) ** 2) return true;
        }
        return false;
    }

    behindStation(x, y, station, view) {
        const image = station.image;
        if (!image || !image.complete || !image.width || !image.height) return false;
        const px = x - (view.width / 2 + station.x - view.cameraX - image.width / 2);
        const py = y - (view.height / 2 + station.y - view.cameraY - image.height / 2);
        if (px <= 0 || py <= 0 || px >= image.width || py >= image.height) return false;
        let mask = this.stationAlpha.get(image);
        if (mask === undefined) {
            try {
                const canvas = this.createCanvas(image.width, image.height);
                const c = canvas.getContext("2d", { willReadFrequently: true });
                c.drawImage(image, 0, 0);
                const rgba = c.getImageData(0, 0, image.width, image.height).data;
                mask = new Uint8Array(image.width * image.height);
                for (let i = 0; i < mask.length; i++) mask[i] = rgba[i * 4 + 3];
            } catch (error) {
                mask = null;
                console.warn("[MAP DECOR] Station alpha unavailable", error);
            }
            this.stationAlpha.set(image, mask);
        }
        if (!mask) return false;
        // Flash uses a radius-5 collision probe, not the transparent image bounds.
        for (let iy = Math.max(0, Math.floor(py - 5)); iy <= Math.min(image.height - 1, Math.ceil(py + 5)); iy++) {
            for (let ix = Math.max(0, Math.floor(px - 5)); ix <= Math.min(image.width - 1, Math.ceil(px + 5)); ix++) {
                if ((ix + .5 - px) ** 2 + (iy + .5 - py) ** 2 <= 25 && mask[iy * image.width + ix] > 0) return true;
            }
        }
        return false;
    }

    behindObjects(x, y, view, occluders) {
        for (const ship of occluders.ships) {
            const sx = view.width / 2 + ship.x - view.cameraX;
            const sy = view.height / 2 + ship.y - view.cameraY;
            // Reference LensFlare.isBehindShip uses the clickRadius bounding square.
            if (x > sx - ship.radius && x < sx + ship.radius && y > sy - ship.radius && y < sy + ship.radius) return true;
        }
        return occluders.stations.some(station => this.behindStation(x, y, station, view));
    }

    updateFlare(flare, view, now, occluders, diagonal) {
        const def = flare.definition;
        const p = this.project(def, view);
        flare.x = p.x;
        flare.y = p.y;
        const qx = Math.trunc(view.width / 2 + view.cameraX / def.pFactor - Math.trunc(def.x * 10 / def.pFactor));
        const qy = Math.trunc(view.height / 2 + view.cameraY / def.pFactor - Math.trunc(def.y * 10 / def.pFactor));
        const dx = qx - p.x, dy = qy - p.y;
        const outside = Math.abs(Math.trunc(dx)) > view.width || Math.abs(Math.trunc(dy)) > view.height;
        if (flare.state === 0) {
            if (outside) flare.state = 2;
            else if (this.behindPlanet(p.x, p.y, view)) {
                flare.state = 2;
                flare.useLensFlash = true;
            } else if (this.behindObjects(p.x, p.y, view, occluders)) flare.state = 2;
            else {
                flare.lensDx = dx;
                flare.lensDy = dy;
                const scale = (Math.hypot(dx, dy) / 3 + 50) * .0033;
                // Flash retains the previous lens5 scale outside this open interval.
                if (scale > 0 && scale < 1) flare.lens5Scale = scale;
            }
        } else if (flare.state === 2) {
            this.fade(flare, 0, now);
            flare.state = 4;
        } else if (flare.state === 4) {
            if (Math.abs(Math.trunc(dx)) < view.width && Math.abs(Math.trunc(dy)) < view.height &&
                !this.behindPlanet(p.x, p.y, view) && !this.behindObjects(p.x, p.y, view, occluders)) flare.state = 1;
        } else if (flare.state === 1) {
            this.fade(flare, 1, now);
            if (def.star && flare.useLensFlash) flare.flashAt = now;
            flare.useLensFlash = false;
            flare.state = 0;
        }
        if (def.star && diagonal) flare.rotation = (flare.rotation + (view.mouseX > view.width / 2 ? .15 : -.15)) % 360;
    }

    drawFlares(ctx, view, now, getOccluders) {
        this.setEnabled(view.enabled);
        if (!this.enabled || !this.flares.length) return;
        const tick = this.lastTick === null || now - this.lastTick >= 39;
        let occluders, diagonal = false;
        if (tick) {
            occluders = getOccluders();
            diagonal = !!this.lastCamera && this.lastCamera.x !== view.cameraX && this.lastCamera.y !== view.cameraY;
            this.lastTick = now;
            this.lastCamera = { x: view.cameraX, y: view.cameraY };
        }
        for (const flare of this.flares) {
            // Start the whole effect together, including on a cold image cache.
            let ready = true;
            for (let i = 0; i < 6; i++) if (!this.loaded("lens" + i)) ready = false;
            if (flare.definition.star) {
                if (!this.loaded("star")) ready = false;
                if (!this.loaded("lensFlash")) ready = false;
            }
            if (!ready) continue;
            if (flare.readyAt === null) {
                if (!tick) continue;
                flare.readyAt = now;
            }
            if (tick) this.updateFlare(flare, view, now, occluders, diagonal);
            const alpha = this.alpha(flare, now);
            if (flare.definition.star) {
                const frame = Math.floor((now - flare.readyAt) * this.assets.star.fps / 1000);
                this.sprite(ctx, "star", flare.x, flare.y, alpha, 1, flare.rotation, frame);
                this.sprite(ctx, "lensFlash", flare.x, flare.y, this.flashAlpha(flare, now));
            }
            for (let i = 0; i < 6; i++) {
                const k = i < 3 ? (i - 3) / 3 : (i - 2) / 3;
                this.sprite(ctx, "lens" + i, flare.x + flare.lensDx * k, flare.y + flare.lensDy * k,
                    alpha, i === 5 ? flare.lens5Scale : 1);
            }
        }
    }
}

const mapDecorRenderer = new MapDecorRenderer(MAP_DECOR_ASSETS, MAP_DECOR_DEFINITIONS,
    src => andromedaCreateImage(src), (width, height) => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        return canvas;
    });

function setMapDecor(mapId) {
    mapDecorRenderer.setMap(mapId == null ? null : Number(mapId));
}

function getMapDecorView() {
    return { width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT, cameraX, cameraY,
        enabled: backgroundLayersEnabled, mouseX: lastMouseScreenX };
}

function getMapDecorOccluders() {
    const ships = [];
    const add = (x, y, shipId) => {
        const radius = getShipClickRadius(shipId);
        if (Number.isFinite(radius) && radius > 0) ships.push({ x, y, radius });
    };
    add(shipX, shipY, heroShipId);
    for (const id in entities) {
        const entity = entities[id];
        if (entity.kind !== "player" && entity.kind !== "npc") continue;
        if (Number(id) === Number(heroId)) continue;
        const position = getEntityInterpolatedPosition(entity);
        add(position.x, position.y, entity.shipId);
    }
    return { ships, stations: stations.map(station => ({ x: station.x, y: station.y, image: stationImages[station.type] })) };
}

function drawMapPlanets(now = performance.now()) {
    setMapDecor(currentMapId);
    mapDecorRenderer.drawPlanets(ctx, getMapDecorView(), now);
}

function drawMapFlares(now = performance.now()) {
    setMapDecor(currentMapId);
    mapDecorRenderer.drawFlares(ctx, getMapDecorView(), now, getMapDecorOccluders);
}
