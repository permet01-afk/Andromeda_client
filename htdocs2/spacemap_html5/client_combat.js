












    // -------------------------------------------------

    function categorizeEntityFromType(e) {
        const meta = OBJECT_TYPE_META[e.type];

        if (!meta) {
            if (ORE_TYPE_SPRITES[e.type]) {
                e.kind = "box";
                e.category = "ore";
                e.oreSprite = ORE_TYPE_SPRITES[e.type];
                return;
            }

            if (!loggedObjectTypes.has(e.type)) {
                loggedObjectTypes.add(e.type);
            }
            if (!e.category || e.category === "unknown") {
                e.category = "other";
            }
            return;
        }

        if (meta.kind) e.kind = meta.kind;
        else if (e.kind === "unknown") e.kind = "box";

        e.category = meta.category || e.category || "other";

        if (meta.oreSprite) {
            e.oreSprite = meta.oreSprite;
        }
    }

    function isEntityVisibleOnMap(e) {
        if (e.kind === "player" || e.kind === "npc") return true;

        if (e.kind === "box") {
            switch (e.category) {
                case "bonusBox":
                case "bootyBox":
                    return VISIBILITY_SETTINGS.bonusBoxes;
                case "cargoFree":
                    return VISIBILITY_SETTINGS.freeCargo;
                case "cargoNotFree":
                    return VISIBILITY_SETTINGS.notFreeCargo;
                case "ore":
                    return VISIBILITY_SETTINGS.ore;
                case "beacon":
                    return VISIBILITY_SETTINGS.beacons;
                case "mine":
                    return VISIBILITY_SETTINGS.mines;
                case "buffBox":
                case "bootyKey":
                default:
                    return VISIBILITY_SETTINGS.others;
            }
        }
        return true;
    }

    function getEntityColor(e) {
        if (e.kind === "player") {
            if (window.heroFactionId && e.factionId) {
                if (e.factionId === window.heroFactionId) {
                    return "#0099ff"; // BLEU
                } else {
                    return "#ff0000"; // ROUGE
                }
            }
            return "orange";
        }
        if (e.kind === "npc")    return "red";

        if (e.kind === "box") {
            switch (e.category) {
                case "bonusBox":     return "yellow";
                case "bootyBox":     return "gold";
                case "cargoFree":    return "lime";
                case "cargoNotFree": return "red";
                case "ore":          return "cyan";
                case "beacon":       return "magenta";
                case "mine":         return "purple";
                case "buffBox":      return "deepskyblue";
                case "bootyKey":     return "white";
                default:             return "yellow";
            }
        }
        return "white";
    }

    function getNameplateColor(e) {
        if (!e) return "#ffffff";

        // Priorité : NPC toujours rouge
        if (e.kind === "npc") return "#ff0000";

        // Le héros reste toujours blanc
        if (e.id === heroId) return "#ffffff";

        // Par défaut pour les joueurs
        if (e.kind === "player") {
            const sameClan = heroClanTag && e.clanTag && heroClanTag === e.clanTag;
            if (sameClan) return "#00ff00";

            if (window.heroFactionId && e.factionId) {
                if (e.factionId === window.heroFactionId) return "#0099ff";
                return "#ff0000";
            }
        }

        return "#ffffff";
    }

    const CLAN_DIPLOMACY_COLORS = {
        neutral: "#ffffff",
        allied: "#33ff33",
        noAttackPact: "#ffcc00",
        atWar: "#cc0000"
    };

    function getClanTagColor(clanDiplomacy) {
        switch (clanDiplomacy) {
            case 1:
                return CLAN_DIPLOMACY_COLORS.allied;
            case 2:
                return CLAN_DIPLOMACY_COLORS.noAttackPact;
            case 3:
                return CLAN_DIPLOMACY_COLORS.atWar;
            case -1:
            case 0:
            default:
                return CLAN_DIPLOMACY_COLORS.neutral;
        }
    }

    function getHeroIdleOffset() {
        if (moveTargetX !== null || moveTargetY !== null) return 0;
        const now = performance.now();
        const idleDuration = now - heroLastMoveMs;
        if (idleDuration < 150) return 0;
        return Math.sin(now / 600) * 3;
    }

    const NAMEPLATE_OFFSET = 15;

    // Gestion locale des reprises d'attaque (logique Flash)
const AUTO_RESUME_INTERVAL_MS = 300;
let lastAutoLaserResumeMs = 0;

// ✅ Timestamp du dernier packet laser ("a") reçu du serveur pour le héros
let lastServerLaserAttackMs = 0;


    function computeNameplateY(centerY, spriteHeight, shipId = null, entityScale = 1) {
        const resolvedScale = (typeof entityScale === "number" && entityScale > 0) ? entityScale : 1;
        if (shipId != null && typeof getShipLabelYOffset === "function") {
    const labelOffset = getShipLabelYOffset(shipId);

    // Flash-like : labelYOffset + marge interne du conteneur (TextField + icônes)
    if (Number.isFinite(labelOffset)) {
        return centerY + (labelOffset + NAMEPLATE_OFFSET) * resolvedScale;
    }
}

        const h = Math.max(10, Math.min(spriteHeight || 10, 60));
        return centerY + h * 0.5 + (NAMEPLATE_OFFSET * resolvedScale);
    }

    // -------------------------------------------------
    // 5. COMMANDES VERS SERVEUR
    // -------------------------------------------------
	
	// Fonction d'envoi des paramètres (Paquet 7)
    function sendSetting(key, value) {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        
        const keyUpper = key.toUpperCase();
        const packet = `7|${keyUpper}|${value}`;
        
        console.log("[WS] Envoi SETTING →", packet);
        sendRaw(packet);
        
        // Mettre à jour l'état local immédiatement
        updateLocalSetting(keyUpper, value);
    }
	// Met à jour l'état local du client (simule la réponse serveur)
        // Met à jour l'état local du client (simule la réponse serveur)
    function updateLocalSetting(key, value) {
        const val    = parseInt(value, 10);
        const valStr = String(value).toUpperCase(); // Pour les chaînes

        switch (key) {
            case 'SHOW_DRONES':
                // Le serveur envoie '1' ou '0'. La variable est un booléen.
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

            case 'MINIMAP_SCALE':
                // FULL_MERGE_AS : MinimapManager.scaleFactor (int), par défaut 8.
                // On l'applique directement comme facteur de zoom interne (bornes 3..11)
                if (!isNaN(val) && val > 0) {
                    setMinimapScale(val, { forceSend: false });
                    console.log("[SETTINGS] MINIMAP_SCALE reçu → scale =", val);
                }
                break;

            case 'CLIENT_RESOLUTION':
                // Le serveur envoie "ID,WIDTH,HEIGHT" ou "ID|WIDTH|HEIGHT".
                console.log("[SETTINGS] CLIENT_RESOLUTION =", value);
                applyClientResolution(value);
                break;

            default:
                // Pour ne pas ignorer les autres paramètres envoyés par le serveur
                console.log(`[SETTINGS] Paramètre stocké: ${key} = ${value}`);
                break;
        }
    }

    const LAB_ORE_KEY_TO_ID = {
        prometium: 1,
        endurium: 2,
        terbium: 3,
        xenomit: 4,
        palladium: 5,
        prometid: 11,
        duranium: 12,
        promerium: 13,
        seprom: 14
    };

    function labOreKeyToId(key) {
        if (!key) return null;
        const normalized = String(key).toLowerCase();
        return LAB_ORE_KEY_TO_ID.hasOwnProperty(normalized) ? LAB_ORE_KEY_TO_ID[normalized] : null;
    }

    function sendLabStatusRequest() {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const packet = "LAB|UPD|GET";
        console.log("[WS] Envoi LAB STATUS →", packet);
        sendRaw(packet);
    }

    function sendProduce(productId, amount) {
    // IMPORTANT : doit partir sur le WS principal (ws) via sendRaw()
    if (!ws || ws.readyState !== WebSocket.OPEN || amount <= 0) return;

    const packet = `LAB|REF|PROD|${productId}|${amount}`;
    console.log("[WS] Envoi PRODUCTION →", packet);

    // sendRaw ajoute déjà le "\n"
    sendRaw(packet);

    addInfoMessage(`Production de ${amount} unités demandée.`);
}


    function sendRefiningUpgrade(target, oreKey, amount) {
        if (!ws || ws.readyState !== WebSocket.OPEN || amount <= 0) return;
        const tgt = String(target || '').toUpperCase();
        const oreId = labOreKeyToId(oreKey);
        if (!oreId) {
            console.warn("[WS] Ore inconnu pour upgrade :", oreKey);
            return;
        }
        const packet = `LAB|UPD|SET|${tgt}|${oreId}|${amount}`;
        console.log("[WS] Envoi UPGRADE →", packet);
        sendRaw(packet);
        addInfoMessage(`Upgrade ${tgt} demandé (${amount} ${String(oreKey || '').toUpperCase()}).`);
    }
	
    function sendMoveToServer(x, y) {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.warn("[WS] Move ignoré, WS non connecté");
            return;
        }
        const ix = Math.round(x);
        const iy = Math.round(y);
        if (heroRepairing && !heroBattleRepairing && typeof setHeroRepairing === "function") {
            const sameSpot = Math.round(shipX) === ix && Math.round(shipY) === iy;
            if (!sameSpot) {
                setHeroRepairing(false);
            }
        }
        const packet = `1|${ix}|${iy}|${ix}|${iy}`;
        console.log("[WS] Envoi move →", packet);
        sendRaw(packet);
    }
    
    function sendPortalJump() {
        clearPendingCollectState();
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const packet = "j";
        console.log("[WS] Envoi PORTAL_JUMP →", packet);
        sendRaw(packet);
    }

    function sendLogoutRequest() {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const packet = "l";
        console.log("[WS] Envoi LOGOUT →", packet);
        sendRaw(packet);
    }

    function sendLogoutCancel() {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const packet = "o";
        console.log("[WS] Envoi LOGOUT_CANCEL_FROM_CLIENT →", packet);
        sendRaw(packet);
    }

    function sendSelectShip(targetId) {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        if (targetId == null) return;
        const packet = `SES|${targetId}`;
        console.log("[WS] Envoi SES →", packet);
        sendRaw(packet);
    }

    function sendLaserAttack(targetId) {
    clearPendingCollectState();
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (targetId == null) return;

    const packet = `a|${targetId}`;
    console.log("[WS] Envoi LASER_ATTACK →", packet);

    // ✅ Flash : on garde seulement l’INTENTION côté client
    // Le "lock" (confirmedAttackTargetId) est donné UNIQUEMENT par le serveur via packet "a"
    attackIntentTargetId = targetId;

    // ✅ On attend la confirmation serveur
    pendingAttackAckTargetId = targetId;
    pendingAttackAckStartMs = performance.now();

    // ✅ Juste anti double-envoi local (cooldown anti spam)
    lastAutoLaserResumeMs = performance.now();

    // ✅ Flash : ne pas reset ici les états "out of range"
    // (ils sont pilotés par le serveur via O / X)
    // resetPendingRangeResume();  <-- SUPPRIMÉ

    sendRaw(packet);
}


    function sendLaserStop(targetId, force = false, keepIntent = false) {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        if (targetId == null) return;
        if (!force && rangeProtectedTargetId === targetId) return;

        const packet = `G|${targetId}`;
        console.log("[WS] Envoi LASER_STOP →", packet);

        if (currentLaserTargetId === targetId) currentLaserTargetId = null;
if (!keepIntent && attackIntentTargetId === targetId) attackIntentTargetId = null;

// ✅ Flash-like : si on stop volontairement l’attaque => on déverrouille
if (!keepIntent && confirmedAttackTargetId === targetId) {
    confirmedAttackTargetId = null;
}

// ✅ Si on stop => on annule aussi une demande en attente
if (!keepIntent && pendingAttackAckTargetId === targetId) {
    pendingAttackAckTargetId = null;
    pendingAttackAckStartMs = 0;
}

if (!keepIntent) {
    resetPendingRangeResume(targetId);
}


        sendRaw(packet);
    }

    function sendRocketAttack(targetId) {
        clearPendingCollectState();
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        if (targetId == null) return;
        const packet = `v|${targetId}`;
        console.log("[WS] Envoi ROCKET_ATTACK →", packet);
        sendRaw(packet);
    }

    function sendRepairCommand() {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const packet = "S|ROB";
        sendRaw(packet);
        if (typeof setHeroRepairing === "function") {
            setHeroRepairing(true);
        }
    }

    function sendCollectBox(id) {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        if (id == null) return;
        if (typeof collectedBoxRequestIds !== "undefined") {
            collectedBoxRequestIds.add(id);
        }
        const packet = `x|${id}`;
        console.log("[WS] Envoi COLLECT →", packet);
        sendRaw(packet);
        if (typeof startHeroCollectorBeam === "function" && !isCollectDelayActiveFor(id)) {
            startHeroCollectorBeam();
        }
    }

    function sendSelectAmmo(ammoId, options = {}) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (ammoId == null) return;
    const packet = `u|${ammoId}`;
    sendRaw(packet);

    // ✅ Flash-like : pas de message "Laser ammo = ..."
    const temporary = options.temporary === true;
    updateLocalAmmoSelection(ammoId, { temporary });
}

function sendSelectRocket(rocketId) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (rocketId == null) return;
    const packet = `d|${rocketId}`;
    sendRaw(packet);

    // ✅ Flash-like : pas de message "Rocket = ..."
    currentRocketId = rocketId;
    if (actionDrawerCategory === "rocket") {
        renderActionDrawerItems();
    }
}


    function sendTechActivation(techId) {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        if (techId == null) return;
        const packet = `TX|${techId}`;
        sendRaw(packet);

    }

    function sendChangeConfig(configId) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (configId !== 1 && configId !== 2) return;
    const packet = `S|CFG|${configId}`;
    sendRaw(packet);
    // Flash-like : ne pas afficher de message
}

    function sendCpuAction(code) {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        if (!code) return;

        // Le serveur C# attend "S|ROB" pour le robot de réparation
        // Ou S|ISH, S|SMB, etc.
        const packet = `S|${code}`;

        sendRaw(packet);
        addInfoMessage("CPU activé : " + code);

        // Dans le client Flash, l'ISH s'affiche immédiatement lors de l'activation locale
        // (le serveur diffuse ensuite l'état). On réplique ce comportement pour le héros.
        if (code === "ISH") {
            setHeroShieldEffect("ISH", true, ISH_DURATION_MS);
        }
        if (code === "ROB" && typeof setHeroRepairing === "function") {
            setHeroRepairing(true);
        }
    }
	
	    function sendGroupPing(targetX, targetY) {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;

        const x = Math.round(targetX);
        const y = Math.round(targetY);

        // Format inspiré du Flash : ps|png|pos|x|y
        const packet = `ps|png|pos|${x}|${y}`;
        sendRaw(packet);

        addInfoMessage(`Ping de groupe envoyé : ${x},${y}`);
    }


    // -------------------------------------------------
    // 6. MOUVEMENT LOCAL
    // -------------------------------------------------

    const BOX_COLLECT_RANGE = 70; // Portée de ramassage inspirée du comportement Flash
    const BOX_COLLECT_DELAY_MS = 1500; // Délai de collecte (identique à l'animation Collector Beam Flash)

    function handleCollectRange(targetBox, distToBox, collectRequested) {
        if (!targetBox || collectRequested) return;

        const collectApproach = (typeof computeCollectApproach === "function") ? computeCollectApproach(targetBox) : null;
        const distToApproach = collectApproach
            ? Math.hypot((collectApproach.x ?? targetBox.x) - shipX, (collectApproach.y ?? targetBox.y) - shipY)
            : distToBox;
        const effectiveDistance = collectApproach ? distToApproach : distToBox;

        const needsDelay = shouldUseCollectDelay(targetBox);
        if (effectiveDistance <= BOX_COLLECT_RANGE) {
            if (needsDelay) {
                if (!isCollectDelayActiveFor(targetBox.id)) {
                    startCollectDelay(targetBox.id, BOX_COLLECT_DELAY_MS);
                }
            } else {
                sendCollectBox(targetBox.id);
            }
        } else if (needsDelay && isCollectDelayActiveFor(targetBox.id)) {
            cancelCollectDelay();
        }
    }

    function updateHeroLocalMovement(dt) {
        const prevX = shipX;
        const prevY = shipY;

        const targetBox = (pendingCollectBoxId !== null) ? entities[pendingCollectBoxId] : null;
        if (targetBox) {
            const collectTarget = (typeof computeCollectApproach === "function") ? computeCollectApproach(targetBox) : { x: targetBox.x, y: targetBox.y };
            if (collectTarget) {
                pendingCollectTarget = collectTarget;
                moveTargetX = collectTarget.x;
                moveTargetY = collectTarget.y;
            }
        } else {
            pendingCollectTarget = null;
        }

        if (moveTargetX === null || moveTargetY === null) {
            heroLastPosX = shipX;
            heroLastPosY = shipY;

            // Si on se déplace vers une boîte et qu'on est déjà à portée, on déclenche la collecte avec le délai Flash
            if (pendingCollectBoxId !== null) {
                const collectBox = entities[pendingCollectBoxId];
                if (collectBox) {
                    const distToBox = Math.hypot(collectBox.x - shipX, collectBox.y - shipY);
                    const collectRequested = (typeof collectedBoxRequestIds !== "undefined") && collectedBoxRequestIds.has(pendingCollectBoxId);
                    handleCollectRange(collectBox, distToBox, collectRequested);
                } else {
                    clearPendingCollectState();
                }
            }
            return;
        }

        const dx = moveTargetX - shipX;
        const dy = moveTargetY - shipY;
        const dist = Math.hypot(dx, dy);
        let arrivedThisFrame = false;

        // NOUVEAU : mettre à jour l'angle du vaisseau vers la cible
		if (dist > 0.0001) {
			heroAngle = Math.atan2(dy, dx) + Math.PI; // +180°
		}


        const collectRequested = (pendingCollectBoxId !== null && typeof collectedBoxRequestIds !== "undefined")
            ? collectedBoxRequestIds.has(pendingCollectBoxId)
            : false;
        if (targetBox) {
            const distToBox = Math.hypot(targetBox.x - shipX, targetBox.y - shipY);
            handleCollectRange(targetBox, distToBox, collectRequested);
        }

        if (dist < 1) {

            shipX = moveTargetX;
            shipY = moveTargetY;
            moveTargetX = null;
            moveTargetY = null;
            arrivedThisFrame = true;
        } else {
            const maxStep = heroSpeed * dt;
            if (maxStep >= dist) {
                shipX = moveTargetX;
                shipY = moveTargetY;
                moveTargetX = null;
                moveTargetY = null;
                arrivedThisFrame = true;
            } else {
                const nx = dx / dist;
                const ny = dy / dist;
                shipX += nx * maxStep;
                shipY += ny * maxStep;
            }

        }

        if (arrivedThisFrame && pendingCollectBoxId !== null && !collectRequested) {
            const collectBox = entities[pendingCollectBoxId];
            const distToBox = collectBox ? Math.hypot(collectBox.x - shipX, collectBox.y - shipY) : Infinity;
            handleCollectRange(collectBox, distToBox, collectRequested);
        }

        if (Math.abs(shipX - prevX) > 0.01 || Math.abs(shipY - prevY) > 0.01) {
            heroLastMoveMs = performance.now();
            heroLastPosX = shipX;
            heroLastPosY = shipY;
            if (heroRepairing && !heroBattleRepairing && typeof setHeroRepairing === "function") {
                setHeroRepairing(false);
            }
        }
    }
	
    function updateChaseMovement() {
        // On regarde si on a une intention d'attaque (mémorisée lors du packet O ou Ctrl)
        const targetId = attackIntentTargetId;
        if (targetId == null) return;

        // On récupère la cible
        const target = targetId === heroId ? { x: shipX, y: shipY } : entities[targetId];
        
        // Si la cible n'existe plus (déco, morte), on nettoie tout
        if (!target) {
            attackIntentTargetId = null;
            isChasingTarget = false;
            resetPendingRangeResume();
            return;
        }

        const dx = target.x - shipX;
        const dy = target.y - shipY;
        const dist = Math.hypot(dx, dy);
        const attackRange = LASER_MAX_RANGE; // Environ 700-900 selon ta config

        // Flash : la gestion "out of range" est pilotée par les packets serveur (O / X).
        // Le client ne stoppe pas localement le tir sur la base de la distance.
        if (dist > attackRange) {
            return;
        }

    }

    // -------------------------------------------------
    // 7. INTERPOLATION & COMBAT
    // -------------------------------------------------

    function updateInterpolations() {
        const now = performance.now();
        for (const id in entities) {
            const e = entities[id];
            const p = e.interp;
            if (!p || p.duration <= 0) continue;

            // Position avant la mise à jour (pour calculer la direction)
            const oldX = e.x;
            const oldY = e.y;

            const t = (now - p.startTime) / p.duration;
            if (t >= 1) {
                e.x = p.endX;
                e.y = p.endY;
                p.duration = 0;
            } else if (t >= 0) {
                e.x = p.startX + (p.endX - p.startX) * t;
                e.y = p.startY + (p.endY - p.startY) * t;
            }

            // Nouveau : calcul de l'angle quand l'entité se déplace
            const dx = e.x - oldX;
            const dy = e.y - oldY;
            if (dx * dx + dy * dy > 0.1) {
                // Même logique que pour heroAngle : on ajoute PI pour aligner avec les sprites
                e.angle = Math.atan2(dy, dx) + Math.PI;
            }
        }
    }


    function updateCombat() {
    // 1) Mort du héros = arrêt total
    if (heroHp !== null && heroHp <= 0) {
        if (currentLaserTargetId != null) sendLaserStop(currentLaserTargetId, true);
        return;
    }

    // 2) Cible (Intention > Actuelle)
    const targetId = attackIntentTargetId || currentLaserTargetId;
    if (targetId == null) return;

    const target = (targetId === heroId) ? { x: shipX, y: shipY } : entities[targetId];

    // Si la cible n'existe plus, reset
    if (!target) {
        currentLaserTargetId = null;
        attackIntentTargetId = null;
        resetPendingRangeResume(targetId);
        return;
    }

    // ✅ 100% Flash imitation :
    // Le combat est PILOTÉ PAR LE SERVEUR :
    // - "O" => out of range  (on met en pause)
    // - "X" => in range      (on reprend)
    // - "a" => tir confirmé  (on lock)
    //
    // Donc ici : on ne force rien, on n'annule pas, on attend le serveur.
}


    function updateTemporaryStatuses(now) {
        if (heroEmpImmunityUntil && now >= heroEmpImmunityUntil) {
            heroEmpImmunityUntil = 0;
        }
        if (heroTargetFadeUntil && now >= heroTargetFadeUntil) {
            heroTargetFadeUntil = 0;
            heroTargetFaded = false;
        }

        for (const id in entities) {
            const ent = entities[id];
            if (!ent) continue;

            if (ent.empImmunityUntil && now >= ent.empImmunityUntil) {
                ent.empImmunityUntil = 0;
            }
            if (ent.targetFadeUntil && now >= ent.targetFadeUntil) {
                ent.targetFadeUntil = 0;
                ent.targetFaded = false;
            }
        }
    }
	
    function updateCombatRotations() {
        const now = performance.now();
        // 1. HÉROS : Regarde la cible SEULEMENT si on attaque (ou qu'on veut attaquer)
        // On NE prend PAS "selectedTargetId" ici. Si on a juste sélectionné sans tirer, le vaisseau ne tourne pas.
        const targetId = currentLaserTargetId || confirmedAttackTargetId || pendingRangeResumeTargetId;

        if (targetId !== null) {
            const target = entities[targetId];
            if (target) {
                const dx = target.x - shipX;
                const dy = target.y - shipY;
                // On force l'angle vers la cible (+ Math.PI pour corriger l'orientation)
                heroAngle = Math.atan2(dy, dx) + Math.PI;
            }
        }
        // Sinon : On ne touche pas à heroAngle, il suivra le mouvement (géré dans client_entities/bootstrap)

        // 2. ENNEMIS : Regardent la cible s'ils tirent dessus (héros OU autre cible)
        if (typeof laserBeams !== 'undefined') {
            for (let i = 0; i < laserBeams.length; i++) {
                const beam = laserBeams[i];
                const attackerId = beam.attackerId;
                const targetId = beam.targetId;

                if (attackerId == null || attackerId === heroId) continue;

                const attacker = entities[attackerId];
                if (!attacker) continue;

                const target = targetId === heroId
                    ? { x: shipX, y: shipY }
                    : entities[targetId];

                if (!target) continue;

                attacker.attackTargetId = targetId;

                if (beam.duration) {
                    const lockUntil = beam.createdAt + beam.duration;
                    attacker.attackLockUntil = Math.max(attacker.attackLockUntil || 0, lockUntil);
                }

                const dx = target.x - attacker.x;
                const dy = target.y - attacker.y;
                attacker.angle = Math.atan2(dy, dx) + Math.PI;
            }
        }

        for (const id in entities) {
            const ent = entities[id];
            if (!ent || ent.id === heroId) continue;

            if (!ent.attackTargetId) {
                if (ent.attackLockUntil && ent.attackLockUntil < now) ent.attackLockUntil = 0;
                continue;
            }

            if (ent.attackLockUntil && ent.attackLockUntil < now) {
                ent.attackTargetId = null;
                ent.attackLockUntil = 0;
                continue;
            }

            const target = ent.attackTargetId === heroId
                ? { x: shipX, y: shipY }
                : entities[ent.attackTargetId];

            if (!target) continue;

            const dx = target.x - ent.x;
            const dy = target.y - ent.y;
            ent.angle = Math.atan2(dy, dx) + Math.PI;
        }
    }

    function reinforceLockState() {
        const candidate =
            selectedTargetId !== null ? selectedTargetId :
            (currentLaserTargetId !== null ? currentLaserTargetId :
            (pendingRangeResumeTargetId !== null ? pendingRangeResumeTargetId : attackIntentTargetId));

        if (candidate != null) {
            if (selectedTargetId === null) selectedTargetId = candidate;
            if (attackIntentTargetId === null && currentLaserTargetId !== null) {
    attackIntentTargetId = currentLaserTargetId;
}
        }
    }


    // -------------------------------------------------
    // 8. EFFETS VISUELS
    // -------------------------------------------------

    const LASER_SPRITE_CACHE = {};
    const NETTEL_SPRITE_ID = 7;
    const CRYSTAL_LASER_SPRITE_ID = 8;
    const CRYSTAL2_LASER_SPRITE_ID = 9;
    const DEVOLARIUM_LASER_SPRITE_ID = 10;
    const LORDAKIUM_LASER_SPRITE_ID = 11;
    const PROTEGIT_LASER_SPRITE_ID = 12;
    const CRYSTAL_LASER_FRAMES = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23];
    const DEVOLARIUM_LASER_FRAMES = Array.from({ length: 100 }, (_, idx) => `${idx + 1}.png`);
    const LORDAKIUM_LASER_FRAMES = [1, 3, 5, 7];
    const LASER_SPRITE_INFO = {
        0: { path: "graphics/lasers/laser0/1.png", width: 87, height: 21 },
        1: { path: "graphics/lasers/laser1/1.png", width: 87, height: 21 },
        2: { path: "graphics/lasers/laser2/1.png", width: 83, height: 14 },
        3: { path: "graphics/lasers/laser3/1.png", width: 83, height: 14 },
        4: { path: "graphics/lasers/laser4/1.png", width: 64, height: 24 },
        5: { path: "graphics/lasers/laser5/1.png", width: 83, height: 18 },
        6: { path: "graphics/lasers/laser6/1.png", width: 60, height: 14 },
        [NETTEL_SPRITE_ID]: { path: "graphics/lasers/nettel/1.png", width: 55, height: 17 },
        [PROTEGIT_LASER_SPRITE_ID]: { path: "graphics/lasers/protegitShot/1.png", width: 19, height: 12 },
        [CRYSTAL_LASER_SPRITE_ID]: {
            basePath: "graphics/lasers/crystal1/",
            frames: CRYSTAL_LASER_FRAMES,
            width: 20,
            height: 15,
            frameDuration: 50
        },
        [CRYSTAL2_LASER_SPRITE_ID]: {
            basePath: "graphics/lasers/crystal2/",
            frames: CRYSTAL_LASER_FRAMES,
            width: 40,
            height: 30,
            frameDuration: 50
        },
        [DEVOLARIUM_LASER_SPRITE_ID]: {
            basePath: "graphics/lasers/devolariumShot/",
            frames: DEVOLARIUM_LASER_FRAMES,
            frameDuration: 30
        },
        [LORDAKIUM_LASER_SPRITE_ID]: {
            basePath: "graphics/lasers/lordakiumShot/",
            frames: LORDAKIUM_LASER_FRAMES,
            width: 110,
            height: 65,
            frameDuration: 60
        }
    };

    const MAX_LASER_SPRITE_ID = Math.max(...Object.keys(LASER_SPRITE_INFO).map(Number));

    const DEFAULT_LASER_SPEED_MS = (typeof LASER_BEAM_DURATION !== "undefined") ? LASER_BEAM_DURATION : 150;
    const LASER_ATTACK_LENGTH_MS = 1350; // FULL_MERGE_AS : LaserPattern.attackLength par défaut (durée d'un tir continu)
    const LASER_PATTERN_META = {
        0: { spriteId: 0, absorber: false, allowOffsets: true,  speed: 0.15, playLoop: false, playLoopRotated: false, laserLength: 80 },
        1: { spriteId: 1, absorber: false, allowOffsets: true,  speed: 0.15, playLoop: false, playLoopRotated: false, laserLength: 80 },
        2: { spriteId: 2, absorber: false, allowOffsets: true,  speed: 0.15, playLoop: false, playLoopRotated: false, laserLength: 80 },
        3: { spriteId: 3, absorber: false, allowOffsets: true,  speed: 0.15, playLoop: false, playLoopRotated: false, laserLength: 80 },
        4: { spriteId: 4, absorber: true, allowOffsets: false, speed: 0.5, playLoop: true, playLoopRotated: true, attackLengthMs: LASER_ATTACK_LENGTH_MS },
        5: { spriteId: 5, absorber: true,  allowOffsets: false, speed: 0.15, playLoop: false, playLoopRotated: false, laserLength: 80 },
        6: { spriteId: 6, absorber: false, allowOffsets: true,  speed: 0.15, playLoop: false, playLoopRotated: false, laserLength: 60 },
        7: { spriteId: 5, absorber: true,  allowOffsets: false, speed: 0.15, playLoop: false, playLoopRotated: false, laserLength: 0 }
    };

    

    function resolveLaserVisual(patternId, skilledLaser) {
        const meta = LASER_PATTERN_META[patternId] || LASER_PATTERN_META[0];
        const spriteId = skilledLaser && LASER_PATTERN_META[patternId]?.skillSpriteId !== undefined
            ? LASER_PATTERN_META[patternId].skillSpriteId
            : meta.spriteId;
        return {
            spriteId: Math.max(0, Math.min(MAX_LASER_SPRITE_ID, spriteId || 0)),
            absorber: !!meta.absorber,
            allowOffsets: meta.allowOffsets !== false,
            playLoop: !!meta.playLoop,
            playLoopRotated: !!meta.playLoopRotated,
            speedMs: Math.max(1, Math.round((meta.speed ?? 0.15) * 1000)),
            attackLengthMs: Math.max(1, Math.round(meta.attackLengthMs || LASER_ATTACK_LENGTH_MS)),
            laserLength: Number.isFinite(meta.laserLength) ? meta.laserLength : undefined
        };
    }

    function getLaserSpriteFrame(spriteId, skilledLaser = false) {
        const id = Number.isFinite(spriteId) ? Math.max(0, Math.min(MAX_LASER_SPRITE_ID, spriteId)) : 0;
        const key = `laser-${id}${skilledLaser ? "-skill" : ""}`;
        if (!LASER_SPRITE_CACHE[key]) {
            const info = LASER_SPRITE_INFO[id] || LASER_SPRITE_INFO[0];

            if (info.frames && info.frames.length > 0) {
                const frames = info.frames.map(frame => {
                    const img = new Image();
                    const suffix = typeof frame === "number" ? `${frame}.png` : frame;
                    img.src = `${info.basePath || ""}${suffix}`;
                    return img;
                });
                LASER_SPRITE_CACHE[key] = {
                    frames,
                    frameDuration: Math.max(1, info.frameDuration || 50),
                    width: info.width,
                    height: info.height
                };
            } else {
                const img = new Image();
                img.src = info.path;
                LASER_SPRITE_CACHE[key] = { img, width: info.width, height: info.height };
            }
        }

        const cached = LASER_SPRITE_CACHE[key];
        if (cached.frames && cached.frames.length > 0) {
            const idx = Math.floor(performance.now() / cached.frameDuration) % cached.frames.length;
            const img = cached.frames[idx];
            return {
                img,
                width: cached.width || img.width,
                height: cached.height || img.height
            };
        }

        return cached;
    }

    function updateLaserBeams(now) {
        for (let i = laserBeams.length - 1; i >= 0; i--) {
            const beam = laserBeams[i];
            const elapsed = now - beam.createdAt;
            if (elapsed >= beam.duration) {
                if (!beam.hitHandled) {
                    handleLaserImpact(beam);
                    beam.hitHandled = true;
                }
                laserBeams.splice(i, 1);
            }
        }
    }

    function handleLaserImpact(beam) {
        const targetSnap = snapshotEntityById(beam.targetId);
        const isPlayerOrNpc = targetSnap && (targetSnap.kind === "player" || targetSnap.kind === "npc");
        if (!isPlayerOrNpc) return;

        if (!beam.showShieldDamage) {
            spawnHullDamageEffect(targetSnap.id);
            return;
        }

        const radius = computeShieldImpactRadius(targetSnap);
        const angle = beam.rotation ?? beam.angle;
        if (angle == null) return;

        const sx = heroId !== null && targetSnap.id === heroId ? shipX : targetSnap.x;
        const sy = heroId !== null && targetSnap.id === heroId ? shipY : targetSnap.y;
        spawnShieldBurstAt(sx, sy, "hit", { angle, radius, targetId: targetSnap.id });
    }

    function getRocketWorldPositions(beam) {
        let ax, ay, tx, ty;

        if (heroId !== null && beam.attackerId === heroId) {
            ax = shipX; ay = shipY;
        } else if (entities[beam.attackerId]) {
            ax = entities[beam.attackerId].x;
            ay = entities[beam.attackerId].y;
        }

        if (heroId !== null && beam.targetId === heroId) {
            tx = shipX; ty = shipY;
        } else if (entities[beam.targetId]) {
            tx = entities[beam.targetId].x;
            ty = entities[beam.targetId].y;
        }

        if (ax == null || ay == null || tx == null || ty == null) return null;
        return { ax, ay, tx, ty };
    }

    function updateRocketAttacks(now) {
        for (let i = rocketAttacks.length - 1; i >= 0; i--) {
            const beam = rocketAttacks[i];
            if (now - beam.createdAt > ROCKET_BEAM_DURATION) {
                if (!beam.impactHandled) {
                    const positions = getRocketWorldPositions(beam);
                    if (positions) {
                        spawnRocketDamageEffect(
                            positions.tx,
                            positions.ty,
                            resolveRocketDamageType(beam.rocketId)
                        );
                    }
                    beam.impactHandled = true;
                }

                rocketAttacks.splice(i, 1);
            }
        }
    }

    function updateSabShots(now) {
        for (let i = sabShots.length - 1; i >= 0; i--) {
            const shot = sabShots[i];
            const attacker = snapshotEntityById(shot.attackerId);
            const target = snapshotEntityById(shot.targetId);

            // ✅ VITESSE SAB (doit être la même valeur que dans drawSabShots)
const SAB_SPEED_MULT = 2.0;

const baseDuration = (shot.duration || SAB_SHOT_DURATION_MS || 1000);
const duration = baseDuration / SAB_SPEED_MULT;

if (!attacker || !target || (now - shot.createdAt) >= duration) {
    sabShots.splice(i, 1);
}
        }
    }

    function drawLaserBeams() {
        const now = performance.now();

        for (const beam of laserBeams) {
            const hasOffset = Number.isFinite(beam.offsetX) && Number.isFinite(beam.offsetY);
            const hasEndOffset = Number.isFinite(beam.offsetEndX) && Number.isFinite(beam.offsetEndY);
            const endOffsetX = hasEndOffset ? beam.offsetEndX : (hasOffset ? beam.offsetX : 0);
            const endOffsetY = hasEndOffset ? beam.offsetEndY : (hasOffset ? beam.offsetY : 0);

            if (beam.followTargets && beam.attackerId && beam.targetId) {
                const attacker = snapshotEntityById(beam.attackerId);
                const target = snapshotEntityById(beam.targetId);
                if (attacker && target) {
                    const origin = beam.absorber ? target : attacker;
                    const destination = beam.absorber ? attacker : target;

                    let dynamicStartX = origin.x;
                    let dynamicStartY = origin.y;
                    let dynamicEndX = destination.x;
                    let dynamicEndY = destination.y;

                    if (hasOffset) {
                        dynamicStartX += beam.offsetX;
                        dynamicStartY += beam.offsetY;
                    }
                    if (hasEndOffset || hasOffset) {
                        dynamicEndX += endOffsetX;
                        dynamicEndY += endOffsetY;
                    }

                    if (!beam.absorber && Number.isFinite(beam.laserLength) && beam.laserLength > 0) {
                        const dx = dynamicStartX - dynamicEndX;
                        const dy = dynamicStartY - dynamicEndY;
                        const distSq = dx * dx + dy * dy;
                        if (distSq >= beam.laserLength * beam.laserLength) {
                            const dist = Math.sqrt(distSq);
                            const nx = dx / dist;
                            const ny = dy / dist;
                            dynamicEndX += nx * beam.laserLength;
                            dynamicEndY += ny * beam.laserLength;
                        }
                    }

                    beam.startX = dynamicStartX;
                    beam.startY = dynamicStartY;
                    beam.endX = dynamicEndX;
                    beam.endY = dynamicEndY;

                    const angle = Math.atan2(dynamicEndY - dynamicStartY, dynamicEndX - dynamicStartX);
                    beam.angle = angle;
                    if (!beam.playLoop) {
                        beam.rotation = angle;
                    }
                }
            }

            // --- DÉBUT DU CORRECTIF ---
            
            // On calcule la distance réelle du tir dans le jeu
            const distCheckX = (beam.endX || 0) - (beam.startX || 0);
            const distCheckY = (beam.endY || 0) - (beam.startY || 0);
            const distCheck = Math.sqrt(distCheckX * distCheckX + distCheckY * distCheckY);

            // Si le laser fait plus de 1500 pixels de long (portée max normale ~900),
            // c'est un bug visuel (téléportation NPC), on ne le dessine pas.
            if (distCheck > 1500) {
                continue; 
            }
            // --- FIN DU CORRECTIF ---

            const isSabBeam = beam.spriteId === 4; // SAB-50 uniquement : coordonnées dynamiques pendant le tir

            if (isSabBeam && beam.attackerId) {
                const attacker = snapshotEntityById(beam.attackerId);
                if (attacker) {
                    const baseX = attacker.x;
                    const baseY = attacker.y;
                    beam.startX = hasOffset ? baseX + beam.offsetX : baseX;
                    beam.startY = hasOffset ? baseY + beam.offsetY : baseY;
                }
            }
            if (isSabBeam && beam.targetId) {
                const target = snapshotEntityById(beam.targetId);
                if (target) {
                    const baseX = target.x;
                    const baseY = target.y;
                    beam.endX = (hasEndOffset || hasOffset) ? baseX + endOffsetX : baseX;
                    beam.endY = (hasEndOffset || hasOffset) ? baseY + endOffsetY : baseY;
                }
            }
            const spriteData = getLaserSpriteFrame(beam.spriteId, beam.skilledLaser);
            const sprite = spriteData?.img || spriteData;
            const width = spriteData?.width || sprite?.width || 0;
            const height = spriteData?.height || sprite?.height || 0;

            if (!sprite || !sprite.complete || width <= 0 || height <= 0) continue;

            // Calcul de la progression (0.0 à 1.0)
            const progress = Math.min(1, (now - beam.createdAt) / beam.duration);

            ctx.save();

            // --- CAS 1 : LASER EN BOUCLE (SAB, RSB...) ---
            if (beam.playLoop) {
                // 1. INVERSION DES COORDONNÉES (SAB : Cible -> Attaquant)
                // (Ne touchez pas à ce bloc, il garantit que le laser "regarde" dans le bon sens)
                let worldStartX = beam.startX;
                let worldStartY = beam.startY;
                let worldEndX = beam.endX;
                let worldEndY = beam.endY;

                if (beam.absorber && beam.spriteId != 4) {
                    worldStartX = beam.endX; 
                    worldStartY = beam.endY;
                    worldEndX = beam.startX; 
                    worldEndY = beam.startY;
                }

                const startScreenX = mapToScreenX(worldStartX);
                const startScreenY = mapToScreenY(worldStartY);
                const endScreenX = mapToScreenX(worldEndX);
                const endScreenY = mapToScreenY(worldEndY);

                ctx.translate(startScreenX, startScreenY);

                const dx = endScreenX - startScreenX;
                const dy = endScreenY - startScreenY;
                const dist = Math.hypot(dx, dy);
                
                // Rotation : Axe Y vers l'arrivée (Vous)
                ctx.rotate(Math.atan2(dy, dx) - Math.PI / 2);

                // 2. MASQUE DE DÉCOUPE
                ctx.beginPath();
                ctx.rect(-dist, 0, dist * 2, dist);
                ctx.clip();

                // 3. Espacement (On le calcule AVANT l'animation)
                const densityFactor = 5.0; 
                const step = height * densityFactor; 

                // 4. Animation Corrigée
                // On augmente le temps de cycle (1500ms au lieu de 300ms) car la distance 'step' est plus grande.
                // Cela rétablit une vitesse visuelle normale et corrige l'illusion d'optique de "retour en arrière".
                const scrollSpeed = (beam.spriteId === 4) ? 400 : 1500;
                
                // On boucle sur 'step' (la distance entre deux cercles) pour une fluidité parfaite sans coupure
                const scrollOffset = (now % scrollSpeed) / scrollSpeed * step;

                // 5. Calcul du nombre de cercles nécessaires
                const count = Math.ceil(dist / step) + 1;

                // 6. DESSIN DES CERCLES
                for (let i = -1; i < count; i++) {
                    const direction = (beam.spriteId == 4) ? -1 : 1;
                    const currentY = (i * step) + (scrollOffset * direction);

                    if (currentY > -height && currentY < dist + height) {
                        const ratio = Math.max(0, Math.min(1, currentY / dist));
                        const currentScale = 0.4 + (0.9 * ratio);
                        const w = width * currentScale;
                        const h = height * currentScale;

                        ctx.drawImage(sprite, -w / 2, currentY - h / 2, w, h);
                    }
                }
            }
            // --- CAS 2 : LASER PROJECTILE (X1, X2, X3, X4...) ---
            else {
                // Calcul de la position actuelle du projectile
                const posX = beam.startX + (beam.endX - beam.startX) * progress;
                const posY = beam.startY + (beam.endY - beam.startY) * progress;

                ctx.translate(mapToScreenX(posX), mapToScreenY(posY));

                if (beam.rotation != null) {
                    ctx.rotate(beam.rotation);
                } else {
                    // Rotation automatique standard
                    const dx = beam.endX - beam.startX;
                    const dy = beam.endY - beam.startY;
                    ctx.rotate(Math.atan2(dy, dx));
                }

                // Gestion de la taille (Scale)
                // Les lasers classiques gardent leur taille, ou changent selon l'effet
                const scale = beam.absorber ? 1 + (beam.endScale - 1) * progress : 1;
                const scaleX = (beam.flipX ? -1 : 1) * scale;
                ctx.scale(scaleX, scale);

                // Dessin simple centré
                ctx.drawImage(sprite, -width / 2, -height / 2, width, height);
            }

            ctx.restore();
        }
    }

    function easeOutQuad(t) {
        const clamped = Math.max(0, Math.min(1, t));
        return 1 - (1 - clamped) * (1 - clamped);
    }

    const ROCKET_SMOKE_OFFSET = 22;

    function getRocketSmokeDefinition(rocketId) {
        if (typeof resolveRocketSmokeKey !== "function" || !ROCKET_SMOKE_DEFS) return null;
        const key = resolveRocketSmokeKey(rocketId);
        const def = key != null ? ROCKET_SMOKE_DEFS[key] : null;
        if (!def) return null;

        return { key, def };
    }

    function spawnRocketSmokeParticle(smokeKey, x, y, angle, now) {
        if (smokeKey == null || x == null || y == null) return;
        rocketSmokeParticles.push({
            key: smokeKey,
            x,
            y,
            angle,
            createdAt: now || performance.now()
        });
    }

    function drawRocketSmokeParticles(now) {
        if (!rocketSmokeParticles.length || !ROCKET_SMOKE_DEFS) return;

        const time = now || performance.now();

        for (let i = rocketSmokeParticles.length - 1; i >= 0; i--) {
            const p = rocketSmokeParticles[i];
            const def = p ? ROCKET_SMOKE_DEFS[p.key] : null;
            if (!p || !def) {
                rocketSmokeParticles.splice(i, 1);
                continue;
            }

            const fps = def.fps || ROCKET_SMOKE_FPS || 25;
            const frameDuration = 1000 / fps;
            const frameCount = def.frames?.length || def.frameCount || 1;
            const age = time - p.createdAt;
            const frame = Math.floor(age / frameDuration);

            if (frame < 0 || frame >= frameCount) {
                rocketSmokeParticles.splice(i, 1);
                continue;
            }

            const img = getRocketSmokeSpriteFrame(p.key, frame);
            if (!img || !img.complete || img.width <= 0 || img.height <= 0) continue;

            ctx.save();
            ctx.translate(mapToScreenX(p.x), mapToScreenY(p.y));
            ctx.rotate(p.angle || 0);
            ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
            ctx.restore();
        }
    }

    function emitRocketSmoke(beam, projX, projY, travelAngle, spriteWidth, now) {
        const defInfo = getRocketSmokeDefinition(beam.rocketId);
        if (!defInfo) return;

        if (beam.smokeKey == null) beam.smokeKey = defInfo.key;
        const def = defInfo.def;
        const spawnInterval = def.spawnInterval || 45;
        const lastSpawn = beam.lastSmokeSpawn || 0;

        if (now - lastSpawn < spawnInterval) return;

        beam.lastSmokeSpawn = now;
        const offset = def.offset || (spriteWidth ? spriteWidth * 0.45 : ROCKET_SMOKE_OFFSET);
        const spawnX = projX - Math.cos(travelAngle) * offset;
        const spawnY = projY - Math.sin(travelAngle) * offset;

        spawnRocketSmokeParticle(defInfo.key, spawnX, spawnY, travelAngle + Math.PI, now);
    }

    function drawRocketAttacks() {
        const now = performance.now();
        drawRocketSmokeParticles(now);
        for (const beam of rocketAttacks) {
            const positions = getRocketWorldPositions(beam);
            if (!positions) continue;
            const { ax, ay, tx, ty } = positions;

            const elapsed = now - beam.createdAt;
            const linearProgress = Math.min(1, elapsed / ROCKET_BEAM_DURATION);
            const progress = easeOutQuad(linearProgress);

            if (linearProgress >= 1 && !beam.impactHandled) {
                spawnRocketDamageEffect(tx, ty, resolveRocketDamageType(beam.rocketId));
                beam.impactHandled = true;
            }

            const projX = ax + (tx - ax) * progress;
            const projY = ay + (ty - ay) * progress;

            const spriteData = typeof getRocketSprite === "function" ? getRocketSprite(beam.rocketId) : null;
            const sprite = spriteData?.img || spriteData;
            const spriteWidth = spriteData?.width || sprite?.width || 0;
            const spriteHeight = spriteData?.height || sprite?.height || 0;
            if (!sprite || !sprite.complete || spriteWidth <= 0 || spriteHeight <= 0) continue;

            const travelAngle = Math.atan2(ty - ay, tx - ax);
            emitRocketSmoke(beam, projX, projY, travelAngle, spriteWidth, now);

            const angle = travelAngle + Math.PI;

            ctx.save();
            ctx.translate(mapToScreenX(projX), mapToScreenY(projY));
            ctx.rotate(angle);
            ctx.drawImage(sprite, -spriteWidth / 2, -spriteHeight / 2, spriteWidth, spriteHeight);
            ctx.restore();
        }
    }

    function drawSabShots() {
        if (!sabShots || sabShots.length === 0) return;

        const now = performance.now();

        const spriteData = getLaserSpriteFrame(4);
        const sprite = spriteData?.img || spriteData;
        const spriteWidth = spriteData?.width || sprite?.width || 0;
        const spriteHeight = spriteData?.height || sprite?.height || 0;
        if (!sprite || !sprite.complete || spriteWidth <= 0 || spriteHeight <= 0) return;

        for (let i = sabShots.length - 1; i >= 0; i--) {
            const shot = sabShots[i];

// ✅ VITESSE SAB (1.5 = + rapide, 2.0 = très rapide, 3.0 = ultra rapide)
const SAB_SPEED_MULT = 2.0;

const duration = (shot.duration || 1000) / SAB_SPEED_MULT;
const lifeProgress = Math.min(1, (now - shot.createdAt) / duration);


            // laser4.swf (SAB-50) : le clip part de la cible vers l'attaquant, sans rotation,
            // et se resserre (scaleX/scaleY -> 0.1) pendant le déplacement.
            const targetSnap = snapshotEntityById(shot.targetId);
            const attackerSnap = snapshotEntityById(shot.attackerId);

            const startWorldX = targetSnap?.x ?? shot.startX ?? 0;
            const startWorldY = targetSnap?.y ?? shot.startY ?? 0;
            const endWorldX = attackerSnap?.x ?? shot.endX ?? 0;
            const endWorldY = attackerSnap?.y ?? shot.endY ?? 0;

            const currentWorldX = startWorldX + (endWorldX - startWorldX) * lifeProgress;
            const currentWorldY = startWorldY + (endWorldY - startWorldY) * lifeProgress;

            const scale = (shot.startScale ?? 1) + ((shot.endScale ?? 0.1) - (shot.startScale ?? 1)) * lifeProgress;

            ctx.save();
            ctx.translate(mapToScreenX(currentWorldX), mapToScreenY(currentWorldY));
            ctx.scale(scale, scale);

            ctx.drawImage(sprite, -spriteWidth / 2, -spriteHeight / 2, spriteWidth, spriteHeight);
            ctx.restore();
        }
    }

    function snapshotEntityById(id) {
        if (heroId !== null && id === heroId) {
            return {
                id: heroId,
                x: shipX,
                y: shipY,
                kind: "player",
                shipId: heroShipId,
                angle: heroAngle,
                expansionTypeId: heroExpansionTypeId,
                shield: heroShield,
                maxShield: heroMaxShield
            };
        }
        if (entities[id]) {
            const ent = entities[id];
            return {
                id: ent.id,
                x: ent.x,
                y: ent.y,
                kind: ent.kind,
                shipId: ent.shipId,
                angle: ent.angle,
                expansionTypeId: ent.expansionTypeId,
                shield: ent.shield,
                maxShield: ent.maxShield
            };
        }
        return null;
    }

    function computeShieldImpactRadius(targetSnap) {
        let radius = 40;
        if (targetSnap && targetSnap.shipId && SHIP_SPRITE_DEFS[targetSnap.shipId]) {
            const img = getShipSpriteFrame(targetSnap.shipId, 0);
            if (img && img.complete && img.width > 0 && img.height > 0) {
                radius = Math.max(img.width, img.height) / 2;
            }
        }
        return radius + 10;
    }

    function computeHullImpactRadius(targetSnap) {
        let radius = 35;
        if (targetSnap && targetSnap.shipId && SHIP_SPRITE_DEFS[targetSnap.shipId]) {
            const img = getShipSpriteFrame(targetSnap.shipId, 0);
            if (img && img.complete && img.width > 0 && img.height > 0) {
                radius = Math.max(img.width, img.height) / 2 - 5;
            }
        }
        return Math.max(20, radius);
    }

    function computeShieldImpactAngle(attackerId, targetId) {
        const attacker = snapshotEntityById(attackerId);
        const target = snapshotEntityById(targetId);
        if (!attacker || !target) return null;
        return Math.atan2(target.y - attacker.y, target.x - attacker.x) + Math.PI;
    }

    function getRecentBeamAngleForTarget(targetId) {
        for (let i = laserBeams.length - 1; i >= 0; i--) {
            const beam = laserBeams[i];
            if (beam.targetId === targetId && beam.angle != null) return beam.angle;
        }
        return null;
    }

    function updateDamageBubbles(now) {
        for (let i = damageBubbles.length - 1; i >= 0; i--) {
            const b = damageBubbles[i];
            if (now - b.createdAt > DAMAGE_BUBBLE_DURATION) {
                damageBubbles.splice(i, 1);
            }
        }
    }

    function resolveDamageBubblePosition(b) {
        if (b.entityId === heroId) {
            return { x: shipX, y: shipY };
        }
        const ent = entities[b.entityId];
        if (ent) {
            return { x: ent.x, y: ent.y };
        }
        return null;
    }

    function drawDamageBubbles() {
    const now = performance.now();

    for (const b of damageBubbles) {
        const pos = resolveDamageBubblePosition(b);
        if (!pos) continue;

        const bubbleScreenX = mapToScreenX(pos.x);
        const bubbleScreenY = mapToScreenY(pos.y);

        const elapsed = now - b.createdAt;
        const moveProgress = Math.min(1, elapsed / 1000);
        const offsetY = -100 * moveProgress;
        const scale = 1 + 2 * moveProgress;
        const alpha = elapsed < 500 ? 1 : Math.max(0, 1 - (elapsed - 500) / 1000);

        // ✅ Couleur depuis XML (game.xml -> hitpointColors)
        // 0=damage, 1=damage hero, 2=heal HP, 3=heal SHD
        let cid = (b.colorId !== undefined && b.colorId !== null)
            ? b.colorId
            : (b.isHeal ? 2 : 0);

        // ✅ Règle Flash : dégâts (0) sur le héros => violet (1)
        if (cid === 0 && b.entityId === heroId) {
            cid = 1;
        }

        // ✅ Couleurs XML si dispo, sinon fallback
        const fallback = {
            0: "#ff0000", // damage
            1: "#db63e2", // hero damage
            2: "#49BE40", // heal HP
            3: "#0066CC"  // heal SHD
        };

        const hitpointColors = (typeof HITPOINT_COLOR_PATTERNS !== "undefined" && HITPOINT_COLOR_PATTERNS)
            ? HITPOINT_COLOR_PATTERNS
            : {};
        const color = hitpointColors[cid] || fallback[cid] || fallback[0];

        // ✅ Texte Flash-like : pas de "-" sur dégâts, "+" sur heal
        const plus = (b.showPlus !== undefined && b.showPlus !== null) ? b.showPlus : b.isHeal;
        const text = (plus ? "+" : "") + String(b.value);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(bubbleScreenX, bubbleScreenY + offsetY);
        ctx.scale(scale, scale);
        ctx.font = "bold 12px Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // ✅ Contour noir (effet Flash)
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(0,0,0,0.85)";
        ctx.strokeText(text, 0, 0);

        ctx.fillStyle = color;
        ctx.fillText(text, 0, 0);

        ctx.restore();
    }
}


    function updateShieldBursts(now) {
        for (let i = shieldBursts.length - 1; i >= 0; i--) {
            const sb = shieldBursts[i];
            const lifeMs = sb.lifeMs || 350;
            if (now - sb.createdAt > lifeMs) {
                shieldBursts.splice(i, 1);
                if (sb.targetId !== undefined && sb.targetId !== null) {
                    if (heroId !== null && sb.targetId === heroId) {
                        heroShieldDamageCount = Math.max(0, heroShieldDamageCount - 1);
                    } else if (entities[sb.targetId]) {
                        const ent = entities[sb.targetId];
                        ent.shieldDamageCount = Math.max(0, ent.shieldDamageCount - 1);
                    }
                }
            }
        }
    }

    function drawShieldBursts() {
        const now = performance.now();
        for (const sb of shieldBursts) {
            const spriteKey = sb.sprite || "hit";
            const def = SHIELD_SPRITE_DEFS[spriteKey];
            if (!def) continue;

            const lifeMs = sb.lifeMs || 350;
            const life = Math.min(1, (now - sb.createdAt) / lifeMs);
            const frame = Math.min(def.frameCount - 1, Math.floor(def.frameCount * life));
            const img = getShieldSpriteFrame(spriteKey, frame);
            if (!img || !img.complete || img.width === 0 || img.height === 0) continue;

            const alpha = 1 - life;
            const scale = 1 + life * 0.2;

            const angle = sb.angle || 0;
            const radius = sb.radius || 0;
            const baseX = sb.x + Math.cos(angle) * radius;
            const baseY = sb.y + Math.sin(angle) * radius;

            const burstScreenX = mapToScreenX(baseX);
            const burstScreenY = mapToScreenY(baseY);
            const w = img.width * scale;
            const h = img.height * scale;

            ctx.save();
            ctx.translate(burstScreenX, burstScreenY);
            if (sb.angle !== undefined && sb.angle !== null) {
                ctx.rotate(angle);
            }
            ctx.globalAlpha = alpha;
            ctx.drawImage(img, -w / 2, -h / 2, w, h);
            ctx.restore();
        }
    }

    function spawnShieldBurstAt(x, y, sprite = "hit", options = {}) {
        if (x == null || y == null) return;
        const def = SHIELD_SPRITE_DEFS[sprite];
        const lifeMs = def ? (def.frameCount / (def.fps || SHIELD_ANIM_FPS)) * 1000 : 350;
        const targetId = options.targetId;
        if (targetId !== undefined && targetId !== null) {
            if (heroId !== null && targetId === heroId) {
                if (heroShieldDamageCount >= 9) return;
                heroShieldDamageCount++;
            } else if (entities[targetId]) {
                const ent = entities[targetId];
                if (ent.kind !== "player") return;
                if (ent.shieldDamageCount >= 9) return;
                ent.shieldDamageCount++;
            } else {
                return;
            }
        }

        shieldBursts.push({
            x,
            y,
            sprite,
            createdAt: performance.now(),
            angle: options.angle,
            radius: options.radius || 0,
            lifeMs,
            targetId
        });
    }

    function updateHullDamageEffects(now) {
        for (let i = hullDamageEffects.length - 1; i >= 0; i--) {
            const eff = hullDamageEffects[i];
            if (!eff || now - eff.createdAt > eff.duration) {
                hullDamageEffects.splice(i, 1);
            }
        }
    }

    function resolveHullDamagePosition(eff) {
        const isHero = heroId !== null && eff.entityId === heroId;
        const targetSnap = isHero ? snapshotEntityById(heroId) : snapshotEntityById(eff.entityId);
        if (!isHero && !targetSnap) return null;

        const baseX = isHero ? shipX : targetSnap.x;
        const baseY = isHero ? shipY : targetSnap.y;
        const angle = (targetSnap && typeof targetSnap.angle === "number") ? targetSnap.angle : 0;

        const offsetX = Math.cos(angle + eff.angleOffset) * eff.distance;
        const offsetY = Math.sin(angle + eff.angleOffset) * eff.distance;

        return { x: baseX + offsetX, y: baseY + offsetY };
    }

    function drawHullDamageEffects() {
        const now = performance.now();
        for (const eff of hullDamageEffects) {
            const def = LASER_DAMAGE_SPRITES[eff.type];
            if (!def) continue;

            const life = Math.min(1, Math.max(0, (now - eff.createdAt) / eff.duration));
            const frame = Math.min(def.frameCount - 1, Math.floor(def.frameCount * life));
            const img = getLaserDamageFrame(eff.type, frame);
            if (!img || !img.complete || img.width === 0 || img.height === 0) continue;

            const pos = resolveHullDamagePosition(eff);
            if (!pos) continue;

            const screenX = mapToScreenX(pos.x);
            const screenY = mapToScreenY(pos.y);

            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.rotate(eff.rotation);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            ctx.restore();
        }
    }

    function spawnHullDamageEffect(targetId, typeId = null) {
        if (targetId == null) return;

        const effectType = (typeId != null && LASER_DAMAGE_SPRITES[typeId]) ? typeId : Math.floor(Math.random() * 3);
        const def = LASER_DAMAGE_SPRITES[effectType];
        if (!def) return;

        const isHero = heroId !== null && targetId === heroId;
        const targetSnap = isHero ? snapshotEntityById(heroId) : snapshotEntityById(targetId);
        if (!isHero && (!targetSnap || (targetSnap.kind !== "player" && targetSnap.kind !== "npc"))) return;

        const duration = (def.frameCount / (def.fps || LASER_DAMAGE_ANIM_FPS)) * 1000;
        const angleOffset = Math.random() * Math.PI * 2;
        const distance = Math.random() * computeHullImpactRadius(targetSnap);
        const rotation = Math.random() * Math.PI * 2;

        for (let i = hullDamageEffects.length - 1; i >= 0; i--) {
            if (hullDamageEffects[i].entityId === targetId) {
                hullDamageEffects.splice(i, 1);
            }
        }

        hullDamageEffects.push({
            entityId: targetId,
            type: effectType,
            createdAt: performance.now(),
            duration,
            angleOffset,
            distance,
            rotation
        });
    }

    function resolveRocketDamageType(rocketId) {
        switch (rocketId) {
            case 1:
                return 0;
            case 2:
                return 1;
            case 3:
            case 4:
                return 2;
            default:
                return 1;
        }
    }

    function spawnRocketDamageEffect(x, y, typeId = 1) {
        if (x == null || y == null) return;

        const def = ROCKET_DAMAGE_SPRITES[typeId] || ROCKET_DAMAGE_SPRITES[1];
        if (!def) return;

        const fps = def.fps || ROCKET_DAMAGE_ANIM_FPS || 25;
        const duration = (def.frameCount / fps) * 1000;

        rocketDamageEffects.push({
            x,
            y,
            type: typeId,
            createdAt: performance.now(),
            duration
        });
    }

    function updateRocketDamageEffects(now) {
        for (let i = rocketDamageEffects.length - 1; i >= 0; i--) {
            const fx = rocketDamageEffects[i];
            if (!fx || now - fx.createdAt > fx.duration) {
                rocketDamageEffects.splice(i, 1);
            }
        }
    }

    function drawRocketDamageEffects() {
        if (rocketDamageEffects.length === 0) return;

        const now = performance.now();
        for (const fx of rocketDamageEffects) {
            const def = ROCKET_DAMAGE_SPRITES[fx.type] || ROCKET_DAMAGE_SPRITES[1];
            if (!def) continue;

            const fps = def.fps || ROCKET_DAMAGE_ANIM_FPS || 25;
            const frameDuration = 1000 / fps;
            const frame = Math.floor((now - fx.createdAt) / frameDuration);
            if (frame < 0 || frame >= def.frameCount) continue;

            const img = getRocketDamageFrame(fx.type, frame);
            if (!img || !img.complete || img.width === 0 || img.height === 0) continue;

            const sx = mapToScreenX(fx.x);
            const sy = mapToScreenY(fx.y);

            ctx.save();
            ctx.drawImage(img, sx - img.width / 2, sy - img.height / 2);
            ctx.restore();
        }
    }

    function updateShieldEffects(now) {
        if (heroIshActive && heroIshUntil && now >= heroIshUntil) {
            setHeroShieldEffect("ISH", false, 0);
        }
        if (heroInvincible && heroInvUntil && now >= heroInvUntil) {
            setHeroShieldEffect("INVINCIBILITY", false, 0);
        }

        for (const id in entities) {
            const e = entities[id];
            if (e.ishActive && e.ishUntil && now >= e.ishUntil) {
                setEntityShieldEffect(e, "ISH", false, 0);
            }
            if (e.invincible && e.invUntil && now >= e.invUntil) {
                setEntityShieldEffect(e, "INVINCIBILITY", false, 0);
            }
        }
    }

    function spawnPortalJumpEffect(x, y) {
        if (x == null || y == null || !PORTAL_JUMP_ANIM) return;
        portalJumpEffects.push({
            x,
            y,
            startedAt: performance.now()
        });
    }

    function spawnSmartbombEffect(x, y, onHero = false) {
        if (x == null || y == null || !SMARTBOMB_ANIM) return;
        smartbombEffects.push({
            x,
            y,
            onHero: !!onHero,
            startedAt: performance.now(),
            rotation: Math.random() * Math.PI * 2
        });
    }

    function spawnEmpEffect(targetId, x = null, y = null) {
        if (!EMP_ANIM) return;
        empEffects.push({
            targetId,
            x,
            y,
            startedAt: performance.now()
        });
    }

    function updatePortalJumpEffects(now) {
        const totalDuration = (PORTAL_JUMP_ANIM.frameCount || 1) * (PORTAL_JUMP_ANIM.frameDuration || 40);
        for (let i = portalJumpEffects.length - 1; i >= 0; i--) {
            const fx = portalJumpEffects[i];
            if (now - fx.startedAt >= totalDuration) {
                portalJumpEffects.splice(i, 1);
            }
        }
    }

    function updateSmartbombEffects(now) {
        const totalDuration = (SMARTBOMB_ANIM.frameCount || 1) * (SMARTBOMB_ANIM.frameDuration || 20);
        for (let i = smartbombEffects.length - 1; i >= 0; i--) {
            const fx = smartbombEffects[i];
            if (now - fx.startedAt >= totalDuration) {
                smartbombEffects.splice(i, 1);
            }
        }
    }

    function updateEmpEffects(now) {
        if (!EMP_ANIM) return;
        const totalDuration = Math.max(
            (EMP_ANIM.ring.delay * Math.max(EMP_ANIM.ring.count - 1, 0)) + EMP_ANIM.ring.duration,
            EMP_ANIM.blitz.duration
        );

        for (let i = empEffects.length - 1; i >= 0; i--) {
            const fx = empEffects[i];
            if (now - fx.startedAt >= totalDuration) {
                empEffects.splice(i, 1);
            }
        }
    }

    function drawPortalJumpEffects() {
        if (!PORTAL_JUMP_ANIM) return;
        const now = performance.now();
        for (const fx of portalJumpEffects) {
            const elapsed = now - fx.startedAt;
            const frame = Math.floor(elapsed / (PORTAL_JUMP_ANIM.frameDuration || 40));
            if (frame < 0 || frame >= PORTAL_JUMP_ANIM.frameCount) continue;

            const img = getPortalJumpFrame(frame);
            if (!img || !img.complete || img.width === 0 || img.height === 0) continue;
			
            const sx = mapToScreenX(fx.x) + (PORTAL_JUMP_ANIM.offsetX || 0);
            const sy = mapToScreenY(fx.y) + (PORTAL_JUMP_ANIM.offsetY || 0);
			
			const OFFSET_X = -12; // négatif = vers la gauche, positif = vers la droite

			ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.drawImage(
			img,
			sx - img.width / 2 + OFFSET_X,
			sy - img.height / 2
							);
			ctx.restore();
        }
    }

    function spawnExplosionAt(x, y, explosionType = 2) {
        if (x == null || y == null) return;
        const now = performance.now();
        explosions.push({
            x,
            y,
            startedAt: now,
            type: explosionType
        });
    }

    function updateExplosions(now) {
        for (let i = explosions.length - 1; i >= 0; i--) {
            const ex = explosions[i];
            const anim = EXPLOSION_ANIMATIONS[ex.type] || EXPLOSION_ANIMATIONS[2];
            const totalDuration = (anim.frameCount || 1) * (anim.frameDuration || 40);
            if (now - ex.startedAt > totalDuration) {
                explosions.splice(i, 1);
            }
        }
    }

    function drawExplosions() {
        const now = performance.now();
        for (const ex of explosions) {
            const anim = EXPLOSION_ANIMATIONS[ex.type] || EXPLOSION_ANIMATIONS[2];
            const frameDuration = anim.frameDuration || 40;
            const frame = Math.floor((now - ex.startedAt) / frameDuration);
            if (frame < 0 || frame >= (anim.frameCount || 0)) continue;

            const img = getExplosionFrame(ex.type, frame);
            if (!img || !img.complete || img.width === 0 || img.height === 0) continue;

            const explosionScreenX = mapToScreenX(ex.x);
            const explosionScreenY = mapToScreenY(ex.y);

            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.drawImage(img, explosionScreenX - img.width / 2, explosionScreenY - img.height / 2);
            ctx.restore();
        }
    }

    function drawSmartbombEffects(options = {}) {
        if (!SMARTBOMB_ANIM) return;

        const { onlyHero = false, excludeHero = false } = options;

        const now = performance.now();
        for (const fx of smartbombEffects) {
            if (onlyHero && !fx.onHero) continue;
            if (excludeHero && fx.onHero) continue;

            const elapsed = now - fx.startedAt;
            const frame = Math.floor(elapsed / (SMARTBOMB_ANIM.frameDuration || 20));
            if (frame < 0 || frame >= SMARTBOMB_ANIM.frameCount) continue;

            const img = getSmartbombFrame(frame);
            if (!img || !img.complete || img.width === 0 || img.height === 0) continue;

            const sx = mapToScreenX(fx.x) + (SMARTBOMB_ANIM.offsetX || 0);
            const sy = mapToScreenY(fx.y) + (SMARTBOMB_ANIM.offsetY || 0);

            ctx.save();
            ctx.translate(sx, sy);
            if (fx.rotation) {
                ctx.rotate(fx.rotation);
            }
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            ctx.restore();
        }
    }

    function drawEmpEffects() {
        if (!EMP_ANIM) return;

        const now = performance.now();
        const ringImg = getEmpRingImage();

        for (const fx of empEffects) {
            let centerX = fx.x;
            let centerY = fx.y;

            if (fx.targetId === heroId) {
                centerX = shipX;
                centerY = shipY;
            } else if (fx.targetId != null && entities[fx.targetId]) {
                centerX = entities[fx.targetId].x;
                centerY = entities[fx.targetId].y;
            }

            if (centerX == null || centerY == null) continue;

            const sx = mapToScreenX(centerX);
            const sy = mapToScreenY(centerY);

            const blitzElapsed = now - fx.startedAt;
            if (blitzElapsed >= 0 && blitzElapsed <= EMP_ANIM.blitz.duration) {
                const frameDuration = EMP_ANIM.blitz.frameDuration || 1;
                const frameCount = EMP_ANIM.blitz.frameCount || 1;
                const cycleDuration = frameDuration * frameCount;
                const frame = Math.floor(((blitzElapsed % cycleDuration) / frameDuration)) % frameCount;
                const blitzImg = getEmpBlitzFrame(frame);

                if (blitzImg && blitzImg.complete && blitzImg.width > 0 && blitzImg.height > 0) {
                    const scale = EMP_ANIM.blitz.startScale + (EMP_ANIM.blitz.endScale - EMP_ANIM.blitz.startScale) * (blitzElapsed / EMP_ANIM.blitz.duration);
                    let alpha = 1;

                    if (blitzElapsed >= EMP_ANIM.blitz.fadeOutStart) {
                        const fadeT = Math.min(1, (blitzElapsed - EMP_ANIM.blitz.fadeOutStart) / EMP_ANIM.blitz.fadeOutDuration);
                        alpha = 1 - fadeT;
                    }

                    const drawW = blitzImg.width * scale;
                    const drawH = blitzImg.height * scale;

                    ctx.save();
                    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
                    ctx.drawImage(blitzImg, sx - drawW / 2, sy - drawH / 2, drawW, drawH);
                    ctx.restore();
                }
            }

            if (ringImg && ringImg.complete && ringImg.width > 0 && ringImg.height > 0) {
                for (let idx = 0; idx < (EMP_ANIM.ring.count || 0); idx++) {
                    const ringStart = fx.startedAt + idx * (EMP_ANIM.ring.delay || 0);
                    const elapsed = now - ringStart;
                    if (elapsed < 0 || elapsed > EMP_ANIM.ring.duration) continue;

                    const t = elapsed / EMP_ANIM.ring.duration;
                    const scale = EMP_ANIM.ring.startScale + (EMP_ANIM.ring.endScale - EMP_ANIM.ring.startScale) * t;
                    const alpha = EMP_ANIM.ring.startAlpha + (EMP_ANIM.ring.endAlpha - EMP_ANIM.ring.startAlpha) * t;

                    const drawW = ringImg.width * scale;
                    const drawH = ringImg.height * scale;

                    ctx.save();
                    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
                    ctx.drawImage(ringImg, sx - drawW / 2, sy - drawH / 2, drawW, drawH);
                    ctx.restore();
                }
            }
        }
    }

    // -------------------------------------------------
    // 9. ZONES VISUELLES & HUD
    // -------------------------------------------------

    function triggerRadiationPulse() {
        radiationPulseStart = performance.now();
        radiationFlashAlpha = 0.35;
    }

    function startRadiationWarning() {
        if (radiationWarningTimer === null) {
            radiationWarningTimer = setInterval(triggerRadiationPulse, 2000);
        }
        triggerRadiationPulse();
        radiationWarningActive = true;
    }

    function stopRadiationWarningTimer() {
        if (radiationWarningTimer !== null) {
            clearInterval(radiationWarningTimer);
            radiationWarningTimer = null;
        }
    }

    function stopRadiationWarning() {
        radiationWarningActive = false;
        radiationPulseStart = 0;
        stopRadiationWarningTimer();
    }

    function setRadiationWarning(active) {
        const shouldActivate = !!active;
        radiationServerFlag = shouldActivate;
        if (shouldActivate) {
            startRadiationWarning();
        } else {
            stopRadiationWarning();
        }
    }

    function drawRadiationOverlay() {
        const now = performance.now();
        if (radiationWarningActive) {
            radiationFade = Math.min(1, radiationFade + 0.08);
        } else {
            radiationFade = Math.max(0, radiationFade - 0.08);
            if (radiationFade === 0) {
                radiationFlashAlpha = 0;
            }
        }

        if (radiationFlashAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = radiationFlashAlpha;
            ctx.fillStyle = "rgba(255, 64, 64, 0.8)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
            radiationFlashAlpha = Math.max(0, radiationFlashAlpha - 0.05);
        }

        if (radiationFade <= 0) return;

        const pulseAlpha = radiationPulseStart ? Math.max(0, 1 - (now - radiationPulseStart) / 600) : 0;
        const heroSnap = snapshotEntityById(heroId);

        if (heroSnap) {
            const radiationScreenX = mapToScreenX(heroSnap.x);
            const radiationScreenY = mapToScreenY(heroSnap.y);
            const arrow = getUiImage(UI_SPRITES.radiationHelp);
            const safeCenterX = MAP_MIN_X + MAP_WIDTH / 2;
            const safeCenterY = MAP_MIN_Y + MAP_HEIGHT / 2;
            const angle = Math.atan2(safeCenterY - heroSnap.y, safeCenterX - heroSnap.x);
            ctx.save();
            ctx.translate(radiationScreenX, radiationScreenY);
            ctx.rotate(angle);
            ctx.globalAlpha = 0.9 * radiationFade;
            if (arrow && arrow.complete && arrow.width > 0 && arrow.height > 0) {
                const scale = 0.9 + 0.15 * pulseAlpha;
                const w = arrow.width * scale;
                const h = arrow.height * scale;
                ctx.drawImage(arrow, -w / 2, -h / 2, w, h);
            } else {
                ctx.strokeStyle = "#ff5555";
                ctx.lineWidth = 2;
                const radius = 32 + 12 * pulseAlpha;
                ctx.beginPath();
                ctx.arc(0, 0, radius, 0, Math.PI * 2, false);
                ctx.stroke();
            }
            ctx.restore();
        }

        ctx.save();
        ctx.globalAlpha = 0.95 * radiationFade;
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const textY = canvas.height / 2 - 150;
        ctx.fillText("ZONE DE RADIATION", canvas.width / 2, textY);
        ctx.font = "14px Arial";
        ctx.fillText("Retournez vers la zone sécurisée", canvas.width / 2, textY + 22);
        ctx.restore();
    }

    function drawPvpOverlay() {
        const now = performance.now();
        if (mapPvpAllowed === 0) {
            ctx.save();
            ctx.globalAlpha = 0.12;
            ctx.fillStyle = "blue";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        }
        if (inDemilitarizedZone) {
            ctx.save();
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 16px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText("ZONE DE PAIX", canvas.width / 2, 14);
            ctx.restore();
        }
        if (inTradeZone) {
            ctx.save();
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 16px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText("ZONE COMMERCIALE", canvas.width / 2, 34);
            ctx.restore();
        }
        if (lastNoAttackZoneTime > 0 && (now - lastNoAttackZoneTime) < 5000) {
            ctx.save();
            ctx.globalAlpha = 0.25;
            ctx.fillStyle = "green";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        }
    }

    function drawWindowChrome(x, y, w, h, title, options = {}) {
        const bg = getUiImage(UI_SPRITES.windowBg);
        const headerImg = getUiImage(UI_SPRITES.windowHeader);
        const sideImg = getUiImage(UI_SPRITES.windowSide);
        const btnClose = getUiImage(UI_SPRITES.buttonClose);
        const btnCollapse = getUiImage(UI_SPRITES.buttonCollapse);

        ctx.save();

        if (bg && bg.complete && bg.width > 0 && bg.height > 0) {
            ctx.drawImage(bg, x, y, w, h);
        } else {
            ctx.fillStyle = "rgba(10, 16, 26, 0.9)";
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = "#35506d";
            ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        }

        let headerHeight = Math.min(28, h / 3);
        if (headerImg && headerImg.complete && headerImg.width > 0) {
            headerHeight = Math.min(headerImg.height, h);
            ctx.drawImage(headerImg, x, y, w, headerHeight);
        } else {
            ctx.fillStyle = "rgba(25, 45, 70, 0.9)";
            ctx.fillRect(x, y, w, headerHeight);
        }

        if (sideImg && sideImg.complete && sideImg.width > 0) {
            ctx.drawImage(sideImg, x, y, sideImg.width, h);
            ctx.drawImage(sideImg, x + w - sideImg.width, y, sideImg.width, h);
        }

        let closeRect = null;
        let collapseRect = null;
        if (options.showButtons) {
            const btnSize = 16;
            const btnY = y + (headerHeight - btnSize) / 2;
            const closeX = x + w - btnSize - 6;
            closeRect = { x: closeX, y: btnY, w: btnSize, h: btnSize };
            if (btnClose && btnClose.complete && btnClose.width > 0) {
                ctx.drawImage(btnClose, closeX, btnY, btnSize, btnSize);
            } else {
                ctx.fillStyle = "#aa0000";
                ctx.fillRect(closeX, btnY, btnSize, btnSize);
            }

            const collapseX = closeX - btnSize - 4;
            collapseRect = { x: collapseX, y: btnY, w: btnSize, h: btnSize };
            if (btnCollapse && btnCollapse.complete && btnCollapse.width > 0) {
                ctx.drawImage(btnCollapse, collapseX, btnY, btnSize, btnSize);
            } else {
                ctx.fillStyle = "#004477";
                ctx.fillRect(collapseX, btnY, btnSize, btnSize);
            }
        }

        if (title) {
            ctx.font = "13px Consolas, monospace";
            ctx.fillStyle = "#e3f2ff";
            ctx.textBaseline = "middle";
            ctx.textAlign = "left";
            ctx.fillText(title, x + 10, y + headerHeight / 2);
        }

        ctx.restore();
        return { headerHeight, closeRect, collapseRect };
    }
