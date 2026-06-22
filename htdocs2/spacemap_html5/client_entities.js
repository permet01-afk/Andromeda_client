








    // Entités
    const entities = {};
    const loggedEntities = new Set();
    const loggedObjectTypes = new Set();

    // Portails
    const portals = {};
    const loggedPortals = new Set();

    // Lasers / dégâts / explosions
    const laserBeams = [];
    const sabShots = [];
    const rocketAttacks = [];
    const labPrices = {};
    const damageBubbles = [];
    function pushDamageBubble(entityId, delta, isHealHint = false, colorId = null, showPlus = null) {
    if (entityId == null) return;

    const signed = parseInt(delta, 10);
    if (isNaN(signed) || signed === 0) return;

    const isHeal = isHealHint || signed > 0;

    // XML (game.xml -> hitpointColors)
    // 0=damage, 1=damage hero (géré au draw), 2=heal HP, 3=heal SHD
    const cid = (colorId !== null && colorId !== undefined)
        ? colorId
        : (isHeal ? 2 : 0);

    const plus = (showPlus !== null && showPlus !== undefined)
        ? showPlus
        : isHeal;

    damageBubbles.push({
        entityId,
        value: Math.abs(signed),
        isHeal,
        colorId: cid,
        showPlus: plus,
        createdAt: performance.now()
    });
}

    const explosions = [];
    const shieldBursts = [];
    const hullDamageEffects = [];
    const rocketDamageEffects = [];
    const rocketSmokeParticles = [];
    const portalJumpEffects = [];
    const smartbombEffects = [];
    const empEffects = [];

    // Cible & tir
    let selectedTargetId = null;
let currentLaserTargetId = null;
let attackIntentTargetId = null;

// ✅ Flash-like : lock seulement si le serveur a confirmé un vrai tir
let confirmedAttackTargetId = null;

// ✅ Si le serveur refuse (zone paix / beginner / map safe), on annule rapidement
let pendingAttackAckTargetId = null;
let pendingAttackAckStartMs = 0;
const ATTACK_ACK_TIMEOUT_MS = 800;

let pendingRangeResumeTargetId = null;
let pendingRangeResumeMessage = false;
let rangeProtectedTargetId = null;

    // Gestion CTRL
    let isCtrlDown = false;
    let ctrlHandledThisPress = false;

    // Cible de déplacement
    let moveTargetX = null;
    let moveTargetY = null;
	let moveTargetFromMinimap = false; // <-- NEW: vrai uniquement si clic minimap

        // Suivi souris façon Timer Flash
    let isMouseDownOnMap = false;
    let heroMoveTimerId = null;
    let lastMouseScreenX = 0;
    let lastMouseScreenY = 0;


    // Décalage vertical pour caler le vaisseau au-dessus de la box (mimique Flash)
    const COLLECTABLE_Y_OFFSET = 120;

    // Cible de collecte en attente
    let pendingCollectBoxId = null;
    let pendingCollectTarget = null;
    // Délai de collecte (rejoue l'attente du client Flash)
    let collectDelayTimerId = null;
    let collectDelayBoxId = null;
    let collectDelayEndsAt = 0;
    // Collectes envoyées au serveur en attente de confirmation (pour lever l'immunité 2s)
    const collectedBoxRequestIds = new Set();

    function computeCollectApproach(box) {
        if (!box) return null;

        // Le client Flash cible le centre de la box mais avec un léger décalage vertical
        // pour que le vaisseau soit positionné au-dessus pendant la collecte (COLLECTABLE_Y_OFFSET).
        return { x: box.x, y: box.y - COLLECTABLE_Y_OFFSET };
    }

    function clearPendingCollectState() {
        pendingCollectBoxId = null;
        pendingCollectTarget = null;
        cancelCollectDelay();
    }

    function cancelCollectDelay() {
        if (collectDelayTimerId !== null) {
            clearTimeout(collectDelayTimerId);
            collectDelayTimerId = null;
        }
        collectDelayBoxId = null;
        collectDelayEndsAt = 0;
        if (typeof stopHeroCollectorBeam === "function") {
            stopHeroCollectorBeam();
        }
    }

    function isCollectDelayActiveFor(boxId) {
        return collectDelayTimerId !== null && collectDelayBoxId === boxId;
    }

    function shouldUseCollectDelay(box) {
        if (!box || box.kind !== "box") return false;
        return [
            "cargoFree",
            "cargoNotFree",
            "bonusBox",
            "bootyBox",
            "bootyKey",
            "ore"
        ].includes(box.category);
    }

    function startCollectDelay(boxId, durationMs = BOX_COLLECT_DELAY_MS) {
        if (boxId == null) return;

        if (collectDelayBoxId !== boxId) {
            cancelCollectDelay();
        }

        collectDelayBoxId = boxId;
        collectDelayEndsAt = performance.now() + durationMs;

        if (typeof startHeroCollectorBeam === "function") {
            startHeroCollectorBeam(durationMs);
        }

        collectDelayTimerId = setTimeout(() => {
            collectDelayTimerId = null;
            collectDelayBoxId = null;
            collectDelayEndsAt = 0;

            const collectRequested = (typeof collectedBoxRequestIds !== "undefined") && collectedBoxRequestIds.has(boxId);
            if (pendingCollectBoxId === boxId && !collectRequested) {
                sendCollectBox(boxId);
            }
        }, durationMs);
    }

    // Helpers entités / portails
    function ensureEntity(id) {
        // Harmonisé sur la structure de main.swf (FULL_MERGE_AS) :
        // les entités transportent systématiquement leurs points de vie,
        // boucliers, vitesse, cargo et états visuels (ISH, invincibilité,
        // fade de cible, etc.).
        if (!entities[id]) {
            entities[id] = {
                id,
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
                clanTag: "",
                factionId: 0, // Ajouté pour la couleur
                rankId: 0,
                galaxyGatesFinished: 0,
                hp: null,
                maxHp: null,
                shield: null,
                maxShield: null,
                cargo: null,
                maxCargo: null,
                speed: null,
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
                drones: [],
                attackTargetId: null,
                attackLockUntil: 0,
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
            // Ajoute les champs manquants si l'entité existe déjà
            if (!("shipId" in ent)) ent.shipId = null;
            if (!("expansionTypeId" in ent)) ent.expansionTypeId = 0;
            if (!("laserSalvoIndex" in ent)) ent.laserSalvoIndex = 0;
            if (!("maxHp" in ent)) ent.maxHp = null;
            if (!("maxShield" in ent)) ent.maxShield = null;
            if (!("cargo" in ent)) ent.cargo = null;
            if (!("maxCargo" in ent)) ent.maxCargo = null;
            if (!("speed" in ent)) ent.speed = null;
            if (!("targetFaded" in ent)) ent.targetFaded = false;
            if (!("targetFadeUntil" in ent)) ent.targetFadeUntil = 0;
            if (!("invisible" in ent)) ent.invisible = false;
            if (!("empImmunityUntil" in ent)) ent.empImmunityUntil = 0;
            if (!("lockOwnerId" in ent)) ent.lockOwnerId = null;
            if (!("lastClaimUpdate" in ent)) ent.lastClaimUpdate = 0;
            if (!("rankId" in ent)) ent.rankId = 0;
            if (!("galaxyGatesFinished" in ent)) ent.galaxyGatesFinished = 0;
            if (!("attackTargetId" in ent)) ent.attackTargetId = null;
            if (!("attackLockUntil" in ent)) ent.attackLockUntil = 0;
            if (!ent.interp) {
                ent.interp = { startX: 0, startY: 0, endX: 0, endY: 0, startTime: 0, duration: 0 };
            }
        }
        return entities[id];
    }

    function updateEntityClaim(targetId, attackerId) {
        if (attackerId == null || isNaN(attackerId)) return;
        const ent = ensureEntity(targetId);
        if (!ent) return;

        const fullyHealed = ent.hp != null && ent.maxHp != null && ent.hp >= ent.maxHp;
        if (ent.lockOwnerId == null || fullyHealed) {
            ent.lockOwnerId = attackerId;
        }
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
                id,
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
        const spriteKey = (effect === "ISH") ? "insta" : (effect === "INVINCIBILITY" ? "invincibility" : null);
        if (!spriteKey) return baseMs;
        const def = SHIELD_SPRITE_DEFS[spriteKey];
        if (!def) return baseMs;
        const animMs = (def.frameCount / (def.fps || SHIELD_ANIM_FPS)) * 1000;
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
    }
	
	function isPointInRect(px, py, rect) {
    return rect &&
           px >= rect.x && px <= rect.x + rect.w &&
           py >= rect.y && py <= rect.y + rect.h;
}



function handleQuickbarClick(screenX, screenY, e) {
    // Si la quickbar n'est pas définie ou clic en dehors → on laisse le reste gérer
    if (!quickbarBounds || !isPointInRect(screenX, screenY, quickbarBounds)) {
        return false;
    }

    // Cadenas (lock)
    if (quickbarLockHitbox && isPointInRect(screenX, screenY, quickbarLockHitbox)) {
        if (e.button === 0) {
            quickbarLocked = !quickbarLocked;
        }
        return true; // on consomme le clic
    }

    // Clic sur un slot
    for (let slot = 1; slot <= 10; slot++) {
        const rect = quickbarSlotHitboxes[slot];
        if (!rect) continue;
        if (!isPointInRect(screenX, screenY, rect)) continue;

        // On ne gère que le clic gauche pour l'instant
        if (e.button !== 0) return true;

        // Si la barre est verrouillée, on active l'item.
        // Si elle est déverrouillée, on ne fait rien au clic simple (le Drag & Drop s'en occupe).
        if (quickbarLocked) {
            triggerSlot(slot);
        }
        return true;
    }

    // Clic ailleurs dans la barre → on consomme quand même
    return true;
}



    // -------------------------------------------------
    // 1.b INPUT SOURIS
    // -------------------------------------------------
    
    function findPortalAtScreenPos(screenX, screenY, radius) {
        let best = null;
        const r = radius || 26;
        let bestDistSq = r * r;

        for (const id in portals) {
            const p = portals[id];
            const screenXPos = mapToScreenX(p.x);
            const screenYPos = mapToScreenY(p.y);
            const dx = screenXPos - screenX;
            const dy = screenYPos - screenY;
            const d2 = dx * dx + dy * dy;
            if (d2 < bestDistSq) {
                bestDistSq = d2;
                best = p;
            }
        }
        return best;
    }

    // --- CORRECTION HITBOX (ZONE DE CLIC) ---
    function findEntityAtScreenPos(screenX, screenY, predicate, radius, includeInvisible = false) {
        let best = null;
        // Dans Flash, la zone de clic est généreuse.
        // On augmente le rayon par défaut (ex: 60px au lieu de 24px) pour faciliter le lock.
        // Si un rayon spécifique est fourni, on l'utilise, sinon on prend 60.
        let maxR = radius || 60;
        let bestDistSq = maxR * maxR;

        // On parcourt toutes les entités pour trouver la plus proche du clic
        for (const id in entities) {
            const e = entities[id];
            // On vérifie si c'est le bon type (NPC/Joueur/Box) via le prédicat
            if (predicate && !predicate(e)) continue;
            if (e.invisible && e.id !== heroId && !includeInvisible) continue;

            const now = performance.now();
            if (e.empImmunityUntil && now < e.empImmunityUntil) continue;

            // Conversion des coordonnées Map -> Écran
            const entityScreenX = mapToScreenX(e.x);
            const entityScreenY = mapToScreenY(e.y);

            const dx = entityScreenX - screenX;
            const dy = entityScreenY - screenY;
            const d2 = dx * dx + dy * dy;

            // Si on clique dans la zone, on garde le plus proche
            if (d2 < bestDistSq) {
                bestDistSq = d2;
                best = e;
            }
        }
        return best;
    }

	// =========================================================
    // GESTION CLICS (VERSION FINALE AVEC SAUVEGARDE)
    // =========================================================
  
      // Timer "suivi souris" toutes les 370ms (comme le Timer du SWF)
    function heroFollowMouseTick() {
        if (!isMouseDownOnMap) return;

        const screenX = lastMouseScreenX;
        const screenY = lastMouseScreenY;

        if (!canvas) return;

        // Ne pas déplacer si la souris est sur la minimap
        const margin = 10;
        const miniMapX = canvas.width  - MINIMAP_WIDTH  - margin;
        const miniMapY = canvas.height - MINIMAP_HEIGHT - margin;
        const overMiniMap =
            screenX >= miniMapX && screenX <= miniMapX + MINIMAP_WIDTH &&
            screenY >= miniMapY && screenY <= miniMapY + MINIMAP_HEIGHT;

        if (overMiniMap) return;

        // Conversion écran -> coordonnées carte
        const worldPos = screenToMap(screenX, screenY);
        moveTargetX = worldPos.x;
        moveTargetY = worldPos.y;
		moveTargetFromMinimap = false;

        // On arrête la poursuite auto, on garde la cible sélectionnée
        isChasingTarget = false;

        if (typeof sendMoveToServer === "function") {
            sendMoveToServer(moveTargetX, moveTargetY);
        }
    }

  
  
  
 canvas.addEventListener("mousedown", (e) => {
        const pointer = (typeof getLogicalPointerPosition === "function")
            ? getLogicalPointerPosition(e)
            : (() => {
                const rect = canvas.getBoundingClientRect();
                const scaleMouseX = rect.width ? canvas.width  / rect.width : 1;
                const scaleMouseY = rect.height ? canvas.height / rect.height : 1;
                return {
                    x: (e.clientX - rect.left) * scaleMouseX,
                    y: (e.clientY - rect.top) * scaleMouseY
                };
            })();
        const screenX = pointer.x;
        const screenY = pointer.y;

        if (logoutControlsLocked) {
            return;
        }

        // --- 1. INTERCEPTION QUICKBAR (PRIORITÉ ABSOLUE) ---

        // A. DRAGGER (171.png) : Prioritaire sur tout le reste
        // On vérifie directement la hitbox du dragger, qu'on soit dans les bounds globaux ou non
        if (quickbarDraggerHitbox && isPointInRect(screenX, screenY, quickbarDraggerHitbox)) {
            if (e.button === 0 && !quickbarLocked) {
                isDraggingQuickbar = true;
                // On calcule le décalage pour que la barre suive la souris sans "sauter"
                quickbarDragOffset.x = screenX - quickbarPosition.x;
                quickbarDragOffset.y = screenY - quickbarPosition.y;
                return; // STOP ! On ne fait rien d'autre (pas de mouvement vaisseau)
            }
        }

        // B. ROTATOR (157.png)
        if (quickbarRotateHitbox && isPointInRect(screenX, screenY, quickbarRotateHitbox)) {
             if (e.button === 0 && !quickbarLocked) {
                quickbarLayoutMode = (quickbarLayoutMode + 1) % 4;
                saveInterfaceLayout();
                return; // STOP
             }
        }

        // C. HITBOX GLOBALE (Pour les slots et le fond)
        if (quickbarBounds && isPointInRect(screenX, screenY, quickbarBounds)) {
            
            // Gestion du bouton "Réduire" (-)
            if (quickbarMinHitbox && isPointInRect(screenX, screenY, quickbarMinHitbox)) {
                quickbarMinimized = !quickbarMinimized; 
                saveInterfaceLayout(); 
                return; 
            }

            // Gestion du Cadenas (si vous l'aviez gardé en canvas, sinon ignorer)
            if (quickbarLockHitbox && isPointInRect(screenX, screenY, quickbarLockHitbox)) {
                quickbarLocked = !quickbarLocked; 
                addInfoMessage(quickbarLocked ? "Barre verrouillée." : "Barre déverrouillée."); 
                saveInterfaceLayout(); 
                return; 
            }

            // Gestion des Slots (1 à 10)
            if (!quickbarMinimized) {
                for (let slot = 1; slot <= 10; slot++) {
                    if (quickbarSlotHitboxes[slot] && isPointInRect(screenX, screenY, quickbarSlotHitboxes[slot])) {
                        // Clic Droit = Vider le slot
                        if (e.button === 2) {
                            if (!quickbarLocked) { 
                                quickSlots[slot] = null; 
                                saveQuickbarLayout(); 
                                addInfoMessage(`Slot ${slot} vidé.`); 
                            }
                            return; 
                        }
                        // Clic Gauche = Activer
                        if (e.button === 0) { 
                            if (quickbarLocked) triggerSlot(slot); 
                            else configureQuickbarSlot(slot);
                            return; 
                        }
                    }
                }
            }
            
            // Si on clique dans la barre mais pas sur un bouton spécifique :
            // On BLOQUE le clic pour qu'il ne traverse pas vers la carte.
            return; 
        }

        // --- 2. MINIMAP ---
        const isMinimapOpen = window.showMinimap !== false;
        const layout = (typeof getMinimapLayout === "function") ? getMinimapLayout(isMinimapOpen) : null;
        const mapRect = minimapHitboxes.content || (layout ? {
            x: layout.contentX,
            y: layout.contentY,
            w: MINIMAP_WIDTH,
            h: MINIMAP_HEIGHT
        } : null);
        const headerRect = layout ? {
            x: layout.outerX,
            y: layout.outerY,
            w: layout.outerWidth,
            h: MINIMAP_HEADER_HEIGHT
        } : null;

        if (minimapHitboxes.close && isPointInRect(screenX, screenY, minimapHitboxes.close)) {
            windowStates.map = false;
            refreshWindowsVisibility();
            saveInterfaceLayout();
            return;
        }

        if (minimapHitboxes.zoomIn && isPointInRect(screenX, screenY, minimapHitboxes.zoomIn)) {
            zoomMinimapIn();
            return;
        }

        if (minimapHitboxes.zoomOut && isPointInRect(screenX, screenY, minimapHitboxes.zoomOut)) {
            zoomMinimapOut();
            return;
        }

        if (isMinimapOpen && headerRect && isPointInRect(screenX, screenY, headerRect) && e.button === 0) {
            isDraggingMinimap = true;
            minimapDragOffset = {
                x: screenX - layout.outerX,
                y: screenY - layout.outerY
            };
            minimapPositionDirty = false;
            return;
        }

        if (isMinimapOpen && mapRect && isPointInRect(screenX, screenY, mapRect)) {
            const scale = getMiniMapScale ? getMiniMapScale() : (MINIMAP_WIDTH / MAP_WIDTH);
            const realW = MAP_WIDTH * scale;
            const realH = MAP_HEIGHT * scale;
            const offsetX = (MINIMAP_WIDTH  - realW) / 2;
            const offsetY = (MINIMAP_HEIGHT - realH) / 2;
            const clickLocalX = screenX - mapRect.x - offsetX;
            const clickLocalY = screenY - mapRect.y - offsetY;
            let targetX = clickLocalX / scale;
            let targetY = clickLocalY / scale;
            targetX = Math.max(0, Math.min(MAP_WIDTH,  targetX));
            targetY = Math.max(0, Math.min(MAP_HEIGHT, targetY));

            if (groupPingMode && Object.keys(groupMembers).length > 0) {
                sendGroupPing(targetX, targetY);
                groupPingMode = false;
            } else {
                moveTargetX = targetX;
                moveTargetY = targetY;
				moveTargetFromMinimap = true;   // <-- AJOUT
                isChasingTarget = false; // Stop poursuite mais GARDE la cible
                sendMoveToServer(targetX, targetY);
            }
            return;
        }

        // --- 3. JEU ---
        
        // Clic Droit : Arrête le laser MAIS garde la cible (selon Flash)
        // Pour désélectionner, il faudrait une autre action, mais le clic droit standard arrête juste le tir.
        if (e.button === 2) {
            if (currentLaserTargetId !== null) sendLaserStop(currentLaserTargetId, true);
            isChasingTarget = false; 
            return;
        }

        if (e.button !== 0) return;
        clearPendingCollectState();
        
        // HUD Repair
        const repairBtnX = HERO_HUD_X + HERO_HUD_WIDTH - HERO_REPAIR_BTN_WIDTH - 10;
        const repairBtnY = HERO_HUD_Y + HERO_HUD_HEIGHT - HERO_REPAIR_BTN_HEIGHT - 8;
        if (screenX >= repairBtnX && screenX <= repairBtnX + HERO_REPAIR_BTN_WIDTH &&
            screenY >= repairBtnY && screenY <= repairBtnY + HERO_REPAIR_BTN_HEIGHT) {
            sendRepairCommand();
            return;
        }


        // A) Clic Entité (Vaisseau/NPC)
        const clickedShip = findEntityAtScreenPos(screenX, screenY, (ent) => ent.kind === "player" || ent.kind === "npc", 60);
        if (clickedShip) {
            // --- CORRECTION : CHANGEMENT DE CIBLE ---
            // Si on sélectionne une NOUVELLE cible, on coupe tout sur l'ancienne
            if (selectedTargetId !== null && selectedTargetId !== clickedShip.id) {
                // Si on était en train d'attaquer (ou qu'on en avait l'intention)
                if (currentLaserTargetId !== null || attackIntentTargetId !== null) {
                    // 1. On envoie le STOP au serveur pour l'ancienne cible
                    sendLaserStop(selectedTargetId, true);
                    
                    // 2. On nettoie les variables d'attaque locales
                    currentLaserTargetId = null;
                    attackIntentTargetId = null;
                    isChasingTarget = false;
                }
            }
            // ----------------------------------------

            // 1. Sélection de la nouvelle cible
            selectedTargetId = clickedShip.id;
            resetPendingRangeResume();
            sendSelectShip(selectedTargetId);
            
            // --- AJOUT : AUTO-REMPLISSAGE GROUPE ---
            if (clickedShip.kind === "player" && clickedShip.name) {
                const groupInput = document.getElementById('groupInputName');
                if (groupInput) {
                    groupInput.value = clickedShip.name;
                }
            }
            
            // Double clic = Attaque (Flash-like)
if ((e.detail && e.detail >= 2)) {

    const dist = Math.hypot(clickedShip.x - shipX, clickedShip.y - shipY);
    const outOfRange = dist > LASER_MAX_RANGE;

    // ✅ on mémorise l’intention
    attackIntentTargetId = clickedShip.id;
    isChasingTarget = outOfRange;

    if (pendingAttackAckTargetId !== clickedShip.id && currentLaserTargetId !== clickedShip.id) {
        sendLaserAttack(clickedShip.id);
    }
}


            return;
        }

        // B) Clic Portail
        const clickedPortal = findPortalAtScreenPos(screenX, screenY, 30);
        if (clickedPortal) {
            if (Math.hypot(clickedPortal.x - shipX, clickedPortal.y - shipY) <= PORTAL_JUMP_DISTANCE) {
                sendPortalJump();
                // Le saut va déclencher handlePacket_i qui videra la sélection
            } else { 
                moveTargetX = clickedPortal.x; 
                moveTargetY = clickedPortal.y; 
				moveTargetFromMinimap = false;
                isChasingTarget = false; 
                sendMoveToServer(moveTargetX, moveTargetY); 
            }
            return;
        }

        // C) Clic Box
        const clickedBox = findEntityAtScreenPos(screenX, screenY, (ent) => ent.kind === "box", 50); // Augmenté à 50 pour faciliter le ramassage
        if (clickedBox) {
            const collectTarget = computeCollectApproach(clickedBox);
            if (collectTarget) {
                pendingCollectTarget = collectTarget;
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

               // 	 (Mouvement)
        const worldPos = screenToMap(screenX, screenY);
        moveTargetX = worldPos.x; 
        moveTargetY = worldPos.y;
		moveTargetFromMinimap = false;

        // On met à jour l'état "clic enfoncé sur la carte" + position souris
        if (e.button === 0) { // bouton gauche
            isMouseDownOnMap = true;
            lastMouseScreenX = screenX;
            lastMouseScreenY = screenY;

            // Démarrage du timer façon Flash (370 ms)
            if (!heroMoveTimerId) {
                heroMoveTimerId = setInterval(heroFollowMouseTick, 370);
            }
        }
        
        // --- CORRECTION ---
        // On arrête de courir après la cible (isChasingTarget = false)
        // MAIS on NE touche PAS à selectedTargetId. La cible reste verrouillée.
        // On peut donc cliquer pour fuir tout en continuant de tirer si on a la portée.
        isChasingTarget = false; 
        
        sendMoveToServer(moveTargetX, moveTargetY);
    });

	
	

canvas.addEventListener("mousemove", (e) => {
    // Recalcul nécessaire des coordonnées
    const pointer = (typeof getLogicalPointerPosition === "function")
        ? getLogicalPointerPosition(e)
        : (() => {
            const rect = canvas.getBoundingClientRect();
            const scaleMouseX = rect.width ? canvas.width  / rect.width : 1;
            const scaleMouseY = rect.height ? canvas.height / rect.height : 1;
            return {
                x: (e.clientX - rect.left) * scaleMouseX,
                y: (e.clientY - rect.top) * scaleMouseY
            };
        })();
    const screenX = pointer.x;
    const screenY = pointer.y;
    let cursor = "default";

    const hoverState = (typeof getMinimapHoverState === "function") ? getMinimapHoverState() : null;
    if (hoverState) {
        hoverState.icon = false;
        hoverState.header = false;
    }

    // 1) Déplacement de la Quickbar si on est en drag
    if (isDraggingQuickbar) {
        quickbarPosition.x = screenX - quickbarDragOffset.x;
        quickbarPosition.y = screenY - quickbarDragOffset.y;
    }
	if (quickbarRotateHitbox && isPointInRect(screenX, screenY, quickbarRotateHitbox)) {
            cursor = "pointer";
        }

    if (isDraggingMinimap && minimapHitboxes.frame) {
        minimapPosition = {
            x: screenX - minimapDragOffset.x,
            y: screenY - minimapDragOffset.y
        };
        minimapPositionDirty = true;
        cursor = "move";
    }
	// Curseur de déplacement pour le Dragger
    if (quickbarDraggerHitbox && isPointInRect(screenX, screenY, quickbarDraggerHitbox)) {
        cursor = "move";
    }

    // 2) Tooltips de la Quickbar
    activeTooltip = null; // Reset par défaut
    if (!quickbarMinimized) {
        for (let slot = 1; slot <= 10; slot++) {
            if (quickbarSlotHitboxes[slot] && isPointInRect(screenX, screenY, quickbarSlotHitboxes[slot])) {
                const item = quickSlots[slot];
                if (item) {
                    let label = item.label || (item.code || "Item");
                    activeTooltip = { text: label, x: screenX, y: screenY };
                }
                break;
            }
        }
    }

        // 3) Mise à jour de la dernière position souris + cible locale
    if (isMouseDownOnMap && (e.buttons & 1) === 1) {
        lastMouseScreenX = screenX;
        lastMouseScreenY = screenY;

        // Mise à jour immédiate de la destination côté client (fluide)
        const worldPos = screenToMap(screenX, screenY);
        moveTargetX = worldPos.x;
        moveTargetY = worldPos.y;
        isChasingTarget = false;
        // IMPORTANT : on NE fait PAS sendMoveToServer ici
    }
	
        // --- GESTION DU CURSEUR (STYLE FLASH) ---
        // On vérifie si on survole quelque chose d'interactif
        
        // 1. On cherche une entité (Vaisseau, NPC, Box) avec le même rayon large (60) que pour le clic
        const hoverEntity = findEntityAtScreenPos(screenX, screenY,
            (ent) => ent.kind === "player" || ent.kind === "npc" || ent.kind === "box",
            60,
            true
        );

        // 2. On cherche un portail
        const hoverPortal = findPortalAtScreenPos(screenX, screenY, 40);

        const isMinimapOpen = window.showMinimap !== false;
        const layout = (typeof getMinimapLayout === "function") ? getMinimapLayout(isMinimapOpen) : null;
        if (isMinimapOpen && layout && hoverState) {
            const headerRect = {
                x: layout.outerX,
                y: layout.outerY,
                w: layout.outerWidth,
                h: MINIMAP_HEADER_HEIGHT
            };
            const overIcon = minimapHitboxes.icon && isPointInRect(screenX, screenY, minimapHitboxes.icon);
            const overZoomIn = minimapHitboxes.zoomIn && isPointInRect(screenX, screenY, minimapHitboxes.zoomIn);
            const overZoomOut = minimapHitboxes.zoomOut && isPointInRect(screenX, screenY, minimapHitboxes.zoomOut);
            const overHeader = isPointInRect(screenX, screenY, headerRect);
            hoverState.icon = !!overIcon;
            hoverState.header = !!overHeader;
            hoverState.zoomIn = !!overZoomIn;
            hoverState.zoomOut = !!overZoomOut;

            if (overIcon || overZoomIn || overZoomOut) {
                cursor = "pointer";
            } else if (overHeader || isDraggingMinimap) {
                cursor = "move";
            }
        }

        if (cursor === "default") {
            if (hoverEntity || hoverPortal) {
                cursor = "pointer"; // La petite main (comme dans Flash)
            }
        }

        canvas.style.cursor = cursor;

});


	    // GESTION RELACHEMENT SOURIS (GLOBAL)
    window.addEventListener("mouseup", () => {
        // Si on était en train de bouger la Quickbar, on sauvegarde sa nouvelle place
        if (isDraggingQuickbar) {
            saveInterfaceLayout();
        }
        isDraggingQuickbar = false;

        if (isDraggingMinimap && minimapPositionDirty) {
            saveInterfaceLayout();
        }
        isDraggingMinimap = false;
        minimapPositionDirty = false;

        // On stoppe aussi le suivi souris façon Flash
        if (isMouseDownOnMap) {
            isMouseDownOnMap = false;
        }
        if (heroMoveTimerId) {
            clearInterval(heroMoveTimerId);
            heroMoveTimerId = null;
        }
    });


    // -------------------------------------------------
    // 1.c INPUT CLAVIER (CTRL / SPACE)
    // -------------------------------------------------

   function toggleLaserOnSelectedTarget() {
    if (selectedTargetId == null) return;

    const getTargetName = (id) => {
        const e = entities[id];
        const name = (e && e.name) ? e.name : ("#" + id);
        return `-=[ ${name} ]=-`;
    };

    // ✅ Flash-like : on considère l'attaque "active" même hors range (intention)
    const isAttackingSelected =
        attackIntentTargetId === selectedTargetId ||
        confirmedAttackTargetId === selectedTargetId ||
        pendingAttackAckTargetId === selectedTargetId ||
        currentLaserTargetId === selectedTargetId;

    const t = entities[selectedTargetId];
    const dist = t ? Math.hypot(t.x - shipX, t.y - shipY) : Infinity;
    const outOfRange = dist > LASER_MAX_RANGE;

    // ---------- CANCEL ----------
    if (isAttackingSelected) {
        addInfoMessage(`Attack on ${getTargetName(selectedTargetId)} was cancelled.`);

        sendLaserStop(selectedTargetId, true);
        attackIntentTargetId = null;
        isChasingTarget = false;
        resetPendingRangeResume(selectedTargetId);
        return;
    }

    // ---------- START / ARM ----------
    addInfoMessage(`Attacking: ${getTargetName(selectedTargetId)}`);

    // ✅ On garde l’intention même si hors portée
    attackIntentTargetId = selectedTargetId;
    isChasingTarget = outOfRange;

    // ✅ Flash-like : on envoie l'attaque même hors portée (le serveur répondra O/X).
    sendLaserAttack(selectedTargetId);
}




// -------------------------------------------------
    // 1.c INPUT CLAVIER (CTRL / SPACE / GROUPE / UI)
    // -------------------------------------------------

    window.addEventListener("keydown", (e) => {
        // Si on est en train d'écrire dans un champ texte, on ne déclenche aucun raccourci du jeu
        const _t = e.target;
        if (_t && (_t.tagName === "INPUT" || _t.tagName === "TEXTAREA" || _t.isContentEditable)) {
            return;
        }

        if (logoutControlsLocked) {
            return;
        }

        // --- COMBAT & MOUVEMENT ---

        // CTRL : toggle laser sur la cible
        if (e.key === "Control") {
            if (!isCtrlDown) {
                isCtrlDown = true;
                if (!ctrlHandledThisPress) {
                    ctrlHandledThisPress = true;
                    toggleLaserOnSelectedTarget();
                }
            }
            return;
        }

        // ESPACE : roquette sur cible sélectionnée
        if (e.code === "Space" || e.key === " ") {
            if (selectedTargetId != null) {
                e.preventDefault();
                sendRocketAttack(selectedTargetId);
            }
            return;
        }
        
        // Touche J : Saut de portail
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
                console.log("[INPUT] Touche J → JUMP (portal id=" + nearest.id + ")");
                sendPortalJump();
            } else {
                addInfoMessage("Aucun portail à proximité.");
            }
            return;
        }

        // Touche C : Changer de configuration
        if (e.key === "c" || e.key === "C") {
            const nextCfg = (heroConfig === 1 ? 2 : 1);
            sendChangeConfig(nextCfg);
            return;
        }

        // --- INTERFACE (Zoom / Filtres) ---

        // Ajustement de la taille de la minimap : + / - / 0
        if (e.key === "+" || e.key === "=") {
            zoomMinimapIn();
            return;
        }

        if (e.key === "-" || e.key === "_") {
            zoomMinimapOut();
            return;
        }


        
        // Filtres d'affichage des box : B / F / N
        if (e.key === "b" || e.key === "B") {
            VISIBILITY_SETTINGS.bonusBoxes = !VISIBILITY_SETTINGS.bonusBoxes;
            addInfoMessage("Bonus box : " + (VISIBILITY_SETTINGS.bonusBoxes ? "ON" : "OFF"));
            return;
        }

        if (e.key === "f" || e.key === "F") {
            VISIBILITY_SETTINGS.freeCargo = !VISIBILITY_SETTINGS.freeCargo;
            addInfoMessage("Cargo gratuit : " + (VISIBILITY_SETTINGS.freeCargo ? "ON" : "OFF"));
            return;
        }

        if (e.key === "n" || e.key === "N") {
            VISIBILITY_SETTINGS.notFreeCargo = !VISIBILITY_SETTINGS.notFreeCargo;
            addInfoMessage("Cargo payant : " + (VISIBILITY_SETTINGS.notFreeCargo ? "ON" : "OFF"));
            return;
        }
		
        // --- COMMANDES DE GROUPE (NOUVEAU) ---

        // Touche 'I' : Inviter au groupe
        if (e.key === "i" || e.key === "I") {
            // 1. Vérifier qu'on a une cible
            if (!selectedTargetId) {
                addInfoMessage("Aucune cible sélectionnée.");
                return;
            }

            // 2. Récupérer l'entité
            const target = entities[selectedTargetId];

            // 3. Vérifications de sécurité (Debug)
            if (!target) {
                console.error("[ERREUR GROUPE] L'entité cible n'existe pas en mémoire.");
                return;
            }
            
            if (target.kind !== "player") {
                addInfoMessage("Vous ne pouvez inviter que des joueurs.");
                return;
            }

            // 4. Récupération du NOM (Le cœur du problème)
            // On s'assure que le nom existe, sinon on met un message d'erreur
            const targetName = target.name;

            if (!targetName || targetName === "" || targetName === "undefined") {
                console.error("[ERREUR GROUPE] Nom de la cible invalide :", target);
                addInfoMessage("Erreur : Impossible de lire le nom du joueur.");
                return;
            }

            // 5. Envoi propre
            console.log(`[GROUPE] Envoi invitation vers : ${targetName} (ID: ${selectedTargetId})`);
            sendRaw(`ps|inv|name|${targetName}`); 
            addInfoMessage(`Invitation envoyée à ${targetName}`);
            return;
        }

        // Touche 'Entrée' : Accepter
        if (e.key === "Enter") {
            if (pendingGroupInvite) {
                // CORRECTION : On ajoute "ps|" au début
                sendRaw(`ps|inv|ack|${pendingGroupInvite.id}`);
                addInfoMessage(`Vous avez rejoint le groupe de ${pendingGroupInvite.name}`);
                pendingGroupInvite = null;
            }
            return;
        }

        // Touche 'L' : Quitter
        if (e.key === "l" || e.key === "L") {
             // CORRECTION : On ajoute "ps|" au début
             sendRaw("ps|lv");
             addInfoMessage("Demande de départ du groupe...");
             return;
        }
		
		        // Touche P : Mode ping de groupe (clic sur la minimap)
        if (e.key === "p" || e.key === "P") {
            groupPingMode = !groupPingMode;
            if (groupPingMode) {
                addInfoMessage("Mode ping de groupe ACTIVÉ : cliquez sur la minimap.");
            } else {
                addInfoMessage("Mode ping de groupe désactivé.");
            }
            return;
        }


        // --- BARRE DE RACCOURCIS (1-0, F1-F6) ---
        if (keyBindings[e.code]) {
            triggerSlot(keyBindings[e.code]);
            return;
        }
    });

    window.addEventListener("keyup", (e) => {
        if (e.key === "Control") {
            isCtrlDown = false;
            ctrlHandledThisPress = false;
        }
    });

    // -------------------------------------------------
    // UTILITAIRES D'AFFICHAGE
    // -------------------------------------------------

    function addInfoMessage(text) {
    if (!text) return;

    // ✅ on stocke des objets (pour timer/fade)
    infoMessages.unshift({
        text: String(text),
        createdAt: performance.now(),
        duration: 2500
    });

    // on limite à 6 lignes comme Flash
    if (infoMessages.length > 6) infoMessages.pop();

    // log bas gauche (si tu veux le garder)
    if (typeof addLogEntry === "function") {
        addLogEntry(text);
    }
}


    // --- CORRECTION DE L'AFFICHAGE (SCALE FIXE COMME FLASH) ---

    function mapToScreenX(x) {
        const dx = x - cameraX;
        return LOGICAL_WIDTH / 2 + dx;
    }

    function mapToScreenY(y) {
        const dy = y - cameraY;
        return LOGICAL_HEIGHT / 2 + dy;
    }

    function screenToMap(screenX, screenY) {
        const scale = (typeof getWorldScaleValue === "function") ? getWorldScaleValue() : 1;
        const offsetX = (canvas.width - LOGICAL_WIDTH * scale) / 2;
        const offsetY = (canvas.height - LOGICAL_HEIGHT * scale) / 2;
        const dx = (screenX - offsetX) / scale - LOGICAL_WIDTH / 2;
        const dy = (screenY - offsetY) / scale - LOGICAL_HEIGHT / 2;

        const worldX = cameraX + dx;
        const worldY = cameraY + dy;

        return { x: worldX, y: worldY };
    }

    // -------------------------------------------------
