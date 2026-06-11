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
    if (meta.kind) e.kind = meta.kind; else if (e.kind === "unknown") e.kind = "box";
    e.category = meta.category || e.category || "other";
    if (meta.oreSprite) {
        e.oreSprite = meta.oreSprite;
    }
}

function isEntityVisibleOnMap(e) {
    if (!e) return false;
    if (e.kind === "unknown") return false;
    if ((e.kind === "player" || e.kind === "npc") && (e.shipId == null || e.shipId === 0)) return false;
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

function getGameXmlColorPattern(key, fallback) {
    const map = window.GAME_COLOR_PATTERNS;
    if (map && typeof map === "object" && map[key]) return map[key];
    return fallback;
}

function getRelationColorKeyForEntity(e) {
    if (!e) return "neutral";
    if (typeof heroId !== "undefined" && e.id === heroId) {
        return "neutral";
    }
    try {
        if (typeof groupMembers === "object" && groupMembers && e.id != null && groupMembers[e.id] !== undefined) {
            return "sameGroup";
        }
    } catch (_) {}
    const myClanId = typeof heroClanId === "number" && heroClanId > 0 ? heroClanId : 0;
    if (myClanId && e.clanId && e.clanId === myClanId) {
        return "sameClan";
    }
    const myFaction = window.heroFactionId || window.ANDROMEDA_CONFIG && window.ANDROMEDA_CONFIG.factionId || 0;
    if (myFaction && e.factionId && e.factionId === myFaction) {
        return "sameFraction";
    }
    return "enemy";
}

function isHeroGroupMemberTarget(targetId) {
    if (targetId == null) return false;
    const id = parseInt(targetId, 10);
    if (!Number.isFinite(id)) return false;
    if (typeof heroId !== "undefined" && heroId && id === parseInt(heroId, 10)) return false;
    try {
        if (typeof groupMembers !== "object" || !groupMembers) return false;
        return Object.prototype.hasOwnProperty.call(groupMembers, id) || Object.prototype.hasOwnProperty.call(groupMembers, String(id));
    } catch (_) {
        return false;
    }
}

function getHeroGroupMemberName(targetId) {
    if (!isHeroGroupMemberTarget(targetId)) return "";
    try {
        const id = parseInt(targetId, 10);
        const member = groupMembers[id] || groupMembers[String(id)];
        return member && member.name ? String(member.name) : "";
    } catch (_) {
        return "";
    }
}

function blockGroupMemberAttack(targetId) {
    const memberName = getHeroGroupMemberName(targetId);
    if (typeof addInfoMessage === "function") {
        addInfoMessage(memberName ? `You cannot attack group member ${memberName}.` : "You cannot attack group members.");
    }
    if (typeof attackIntentTargetId !== "undefined" && attackIntentTargetId == targetId) attackIntentTargetId = null;
    if (typeof pendingAttackAckTargetId !== "undefined" && pendingAttackAckTargetId == targetId) {
        pendingAttackAckTargetId = null;
        pendingAttackAckStartMs = 0;
    }
    if (typeof confirmedAttackTargetId !== "undefined" && confirmedAttackTargetId == targetId) confirmedAttackTargetId = null;
    if (typeof isChasingTarget !== "undefined") isChasingTarget = false;
    if (typeof resetPendingRangeResume === "function") resetPendingRangeResume(targetId);
}

function getMinimapEntityColor(e) {
    if (!e || (e.kind !== "player" && e.kind !== "npc")) return getEntityColor(e);
    const key = getRelationColorKeyForEntity(e);
    switch (key) {
      case "sameGroup":
        return getGameXmlColorPattern("sameGroup", "#FFD700");
      case "sameClan":
        return "#33ff33";
      case "sameFraction":
        return "#0099ff";
      case "enemy":
        return "#ff0000";
      default:
        return "#ffffff";
    }
}

function getEntityColor(e) {
    if (!e) return getGameXmlColorPattern("neutral", "#ffffff");
    if (e.kind === "player" || e.kind === "npc") {
        const key = getRelationColorKeyForEntity(e);
        return getGameXmlColorPattern(key, key === "sameGroup" ? "#FFD700" : key === "sameClan" ? "#33ff33" : key === "sameFraction" ? "#0099ff" : "#cc0000");
    }
    if (e.kind === "box") {
        switch (e.category) {
          case "bonusBox":
            return "yellow";

          case "bootyBox":
            return "gold";

          case "cargoFree":
            return "lime";

          case "cargoNotFree":
            return "red";

          case "ore":
            return "cyan";

          case "beacon":
            return "magenta";

          case "mine":
            return "purple";

          case "buffBox":
            return "deepskyblue";

          case "bootyKey":
            return "white";

          default:
            return "yellow";
        }
    }
    return "white";
}

function getNameplateColor(e) {
    if (!e) return getGameXmlColorPattern("neutral", "#ffffff");
    if (e.kind === "npc") {
        return getGameXmlColorPattern("enemy", "#cc0000");
    }
    const key = getRelationColorKeyForEntity(e);
    return getGameXmlColorPattern(key, key === "sameGroup" ? "#FFD700" : key === "sameClan" ? "#33ff33" : key === "sameFraction" ? "#0099ff" : "#cc0000");
}

function getClanTagColor(clanDiplomacy) {
    switch (clanDiplomacy) {
      case 1:
        return getGameXmlColorPattern("allied", "#33ff33");

      case 2:
        return getGameXmlColorPattern("noAttackPact", "#ffcc00");

      case 3:
        return getGameXmlColorPattern("atWar", "#cc0000");

      case -1:
      case 0:
      default:
        return getGameXmlColorPattern("neutral", "#ffffff");
    }
}

function getHeroIdleOffset() {
    return 0;
}

const AUTO_NAMEPLATE_OFFSET = 15;

let lastAutoLaserResumeMs = 0;

let heroMissingCombatTargetId = null;

let heroMissingCombatTargetSince = 0;

function noteHeroMissingCombatTarget(targetId, now = performance.now()) {
    if (targetId == null) return 0;
    if (heroMissingCombatTargetId !== targetId) {
        heroMissingCombatTargetId = targetId;
        heroMissingCombatTargetSince = now;
        return 0;
    }
    return Math.max(0, now - heroMissingCombatTargetSince);
}

function clearHeroMissingCombatTarget(targetId = null) {
    if (targetId == null || heroMissingCombatTargetId === targetId) {
        heroMissingCombatTargetId = null;
        heroMissingCombatTargetSince = 0;
    }
}

function computeNameplateY(centerY, spriteHeight, shipId = null, entityScale = 1) {
    const resolvedScale = typeof entityScale === "number" && entityScale > 0 ? entityScale : 1;
    if (shipId != null && typeof getShipLabelYOffset === "function") {
        const labelOffset = getShipLabelYOffset(shipId);
        if (Number.isFinite(labelOffset)) {
            return Math.round(centerY + labelOffset * resolvedScale);
        }
    }
    let referenceHeight = spriteHeight || 10;
    if (shipId != null && typeof getShipReferenceVisualHeight === "function") {
        const stableVisualHeight = getShipReferenceVisualHeight(shipId);
        if (Number.isFinite(stableVisualHeight) && stableVisualHeight > 0) {
            referenceHeight = stableVisualHeight * resolvedScale;
        }
    }
    const h = Math.max(10, Math.min(referenceHeight || 10, 60));
    return Math.round(centerY + h * .5 + AUTO_NAMEPLATE_OFFSET * resolvedScale);
}

function sendSetting(key, value) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const keyUpper = key.toUpperCase();
    const packet = `7|${keyUpper}|${value}`;
    sendRaw(packet);
    updateLocalSetting(keyUpper, value);
}

function updateLocalSetting(key, value) {
    const keyUpper = String(key || "").toUpperCase();
    const val = parseInt(value, 10);
    if (keyUpper === "QUICKBAR_SLOT") {
        if (typeof window.flashApplyQuickbarSlotSettingValue === "function") {
            window.flashApplyQuickbarSlotSettingValue(value);
            return;
        }
    }
    if (keyUpper.startsWith("SLOTMENU_POSITION,")) {
        if (typeof window.flashApplyQuickbarPositionSettingValue === "function") {
            window.flashApplyQuickbarPositionSettingValue(value);
            return;
        }
    }
    if (keyUpper.startsWith("SLOTMENU_ORDER,")) {
        if (typeof window.flashApplyQuickbarOrderSettingValue === "function") {
            window.flashApplyQuickbarOrderSettingValue(value);
            return;
        }
    }
    if (keyUpper.startsWith("WINDOW_SETTINGS,")) {
        if (typeof window.flashApplyWindowSettingsSettingValue === "function") {
            window.flashApplyWindowSettingsSettingValue(keyUpper, value);
            return;
        }
    }
    if (keyUpper.startsWith("MAINMENU_POSITION,")) {
        if (typeof window.flashApplyMainMenuPositionSettingValue === "function") {
            window.flashApplyMainMenuPositionSettingValue(value);
            return;
        }
    }
    if (keyUpper === "QUICKSLOT_STOP_ATTACK") {
        if (typeof window.flashSetQuickSlotStopAttack === "function") {
            window.flashSetQuickSlotStopAttack(value);
            return;
        }
    }
    switch (keyUpper) {
      case "SHOW_DRONES":
        setting_show_drones = val === 1;
        break;

      case "DISPLAY_PLAYER_NAMES":
        setting_show_player_names = val === 1;
        break;

      case "PLAY_SFX":
        setting_play_sfx = val === 1;
        break;

      case "DISPLAY_CHAT":
        if (typeof window.flashApplyDisplayChatSettingValue === "function") {
            window.flashApplyDisplayChatSettingValue(value);
        }
        break;

      case "PLAY_MUSIC":
        setting_play_music = val === 1;
        break;

      case "AUTO_REFINEMENT":
        setting_auto_refinement = val === 1;
        if (typeof window.__applySettingsStateFromServer === "function") {
            window.__applySettingsStateFromServer({
                AUTO_REFINEMENT: setting_auto_refinement
            });
        }
        break;

      case "DOUBLECLICK_ATTACK":
        setting_doubleclick_attack = val === 1;
        if (typeof window.__applySettingsStateFromServer === "function") {
            window.__applySettingsStateFromServer({
                DOUBLECLICK_ATTACK: setting_doubleclick_attack
            });
        }
        break;

      case "MINIMAP_SCALE":
        if (!isNaN(val) && val > 0) {
            setMinimapScale(val, {
                forceSend: false
            });
        }
        break;

      case "CLIENT_RESOLUTION":
        applyClientResolution(value);
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
    sendRaw(packet);
}

function sendLabSafeGet() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const packet = "LAB|SAFE|GET";
    sendRaw(packet);
}

function hasSafeTradeAccess() {
    return typeof window.isTradeWindowAccessGranted === "function" ? !!window.isTradeWindowAccessGranted() : !!(typeof inTradeZone !== "undefined" && inTradeZone);
}

function notifySafeTradeAccessRequired() {
    const message = "You must be inside the trade zone (station) to use the Seprom Safe.";
    if (typeof addServerInfoLogMessage === "function") {
        addServerInfoLogMessage(message);
    } else if (typeof addInfoMessage === "function") {
        addInfoMessage(message);
    }
}

function sendLabSafeUnlock(level) {
    const safeLevel = parseInt(level, 10);
    if (!ws || ws.readyState !== WebSocket.OPEN || isNaN(safeLevel) || safeLevel <= 0) return;
    if (!hasSafeTradeAccess()) {
        notifySafeTradeAccessRequired();
        return;
    }
    const packet = `LAB|SAFE|UNLOCK|${safeLevel}`;
    sendRaw(packet);
}

function sendLabSafeDeposit(amount) {
    const safeAmount = parseInt(amount, 10);
    if (!ws || ws.readyState !== WebSocket.OPEN || isNaN(safeAmount) || safeAmount <= 0) return;
    if (!hasSafeTradeAccess()) {
        notifySafeTradeAccessRequired();
        return;
    }
    const packet = `LAB|SAFE|DEPOSIT|${safeAmount}`;
    sendRaw(packet);
}

function sendLabSafeWithdraw(amount) {
    const safeAmount = parseInt(amount, 10);
    if (!ws || ws.readyState !== WebSocket.OPEN || isNaN(safeAmount) || safeAmount <= 0) return;
    if (!hasSafeTradeAccess()) {
        notifySafeTradeAccessRequired();
        return;
    }
    const packet = `LAB|SAFE|WITHDRAW|${safeAmount}`;
    sendRaw(packet);
}

function sendProduce(productId, amount) {
    if (!ws || ws.readyState !== WebSocket.OPEN || amount <= 0) return;
    const packet = `LAB|REF|PROD|${productId}|${amount}`;
    sendRaw(packet);
    addInfoMessage(`Production requested: ${amount} units.`);
}

function sendRefiningUpgrade(target, oreKey, amount) {
    if (!ws || ws.readyState !== WebSocket.OPEN || amount <= 0) return;
    const tgt = String(target || "").toUpperCase();
    const oreId = labOreKeyToId(oreKey);
    if (!oreId) {
        console.warn("[WS] Unknown ore for upgrade:", oreKey);
        return;
    }
    const packet = `LAB|UPD|SET|${tgt}|${oreId}|${amount}`;
    sendRaw(packet);
    addInfoMessage(`Upgrade ${tgt} requested (${amount} ${String(oreKey || "").toUpperCase()}).`);
}

function flashIntCoordinate(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return numeric < 0 ? Math.ceil(numeric) : Math.floor(numeric);
}

function sendMoveToServer(x, y) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        return;
    }
    const ix = flashIntCoordinate(x);
    const iy = flashIntCoordinate(y);
    if (heroRepairing && !heroBattleRepairing && typeof setHeroRepairing === "function") {
        const sameSpot = flashIntCoordinate(shipX) === ix && flashIntCoordinate(shipY) === iy;
        if (!sameSpot) {
            setHeroRepairing(false);
        }
    }
    const currentX = Number.isFinite(shipX) ? flashIntCoordinate(shipX) : ix;
    const currentY = Number.isFinite(shipY) ? flashIntCoordinate(shipY) : iy;
    const packet = `1|${ix}|${iy}|${currentX}|${currentY}`;
    if (window.FLASH_PARITY_DEBUG) {
        console.log("[WS] Sending move →", packet);
    }
    sendRaw(packet);
}

function sendPortalJump() {
    clearPendingCollectState();
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const packet = "j";
    sendRaw(packet);
}

function sendLogoutRequest() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const packet = "l";
    sendRaw(packet);
}

function sendLogoutCancel() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const packet = "o";
    sendRaw(packet);
}

function sendSelectShip(targetId) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (targetId == null) return;
    if (typeof heroId !== "undefined" && heroId && targetId == heroId) return;
    const packet = `SES|${targetId}`;
    if (window.FLASH_PARITY_DEBUG) {
        console.log("[WS] Sending SES →", packet);
    }
    sendRaw(packet);
}

function sendLaserAttack(targetId) {
    if (targetId == null) return;
    if (typeof heroId !== "undefined" && heroId && targetId == heroId) {
        if (typeof addInfoMessage === "function") addInfoMessage("You cannot attack yourself.");
        return;
    }
    if (isHeroGroupMemberTarget(targetId)) {
        blockGroupMemberAttack(targetId);
        return;
    }
    clearPendingCollectState();
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
        const selectedAmmo = typeof currentAmmoId !== "undefined" && currentAmmoId != null ? currentAmmoId : typeof primaryAmmoId !== "undefined" && primaryAmmoId != null ? primaryAmmoId : 1;
        const stock = typeof ammoStock === "object" && ammoStock != null ? Number(ammoStock[selectedAmmo]) : NaN;
        if (Number.isFinite(stock) && stock < 18) {
            if (typeof addInfoMessage === "function") addInfoMessage("No laser ammunition left.");
            if (typeof attackIntentTargetId !== "undefined") attackIntentTargetId = null;
            if (typeof pendingAttackAckTargetId !== "undefined") pendingAttackAckTargetId = null;
            if (typeof pendingAttackAckStartMs !== "undefined") pendingAttackAckStartMs = 0;
            if (typeof resetPendingRangeResume === "function") resetPendingRangeResume();
            return;
        }
    } catch (_) {}
    const packet = `a|${targetId}`;
    if (window.FLASH_PARITY_DEBUG) {
        console.log("[WS] Sending LASER_ATTACK →", packet);
    }
    attackIntentTargetId = targetId;
    pendingAttackAckTargetId = targetId;
    pendingAttackAckStartMs = performance.now();
    lastAutoLaserResumeMs = performance.now();
    sendRaw(packet);
}

function sendLaserStop(targetId, force = false, keepIntent = false) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (targetId == null) return;
    if (!force && rangeProtectedTargetId === targetId) return;
    const packet = `G|${targetId}`;
    if (window.FLASH_PARITY_DEBUG) {
        console.log("[WS] Sending LASER_STOP →", packet);
    }
    if (typeof clearSabLaserVisualJobsForLocalHero === "function") {
        clearSabLaserVisualJobsForLocalHero();
    }
    if (currentLaserTargetId === targetId) currentLaserTargetId = null;
    if (!keepIntent && attackIntentTargetId === targetId) attackIntentTargetId = null;
    if (!keepIntent && confirmedAttackTargetId === targetId) {
        confirmedAttackTargetId = null;
    }
    if (!keepIntent && typeof heroCombatLogActiveTargetId !== "undefined" && heroCombatLogActiveTargetId === targetId) {
        heroCombatLogActiveTargetId = null;
    }
    if (!keepIntent && pendingAttackAckTargetId === targetId) {
        pendingAttackAckTargetId = null;
        pendingAttackAckStartMs = 0;
    }
    if (!keepIntent) {
        resetPendingRangeResume(targetId);
    }
    clearHeroMissingCombatTarget(targetId);
    sendRaw(packet);
}

function sendRocketAttack(targetId) {
    if (targetId == null) return;
    if (typeof heroId !== "undefined" && heroId && targetId == heroId) {
        if (typeof addInfoMessage === "function") addInfoMessage("You cannot attack yourself.");
        return;
    }
    if (isHeroGroupMemberTarget(targetId)) {
        blockGroupMemberAttack(targetId);
        return;
    }
    clearPendingCollectState();
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (typeof currentRocketId === "undefined" || currentRocketId === null || currentRocketId === 0) {
        let preferredRocketId = 1;
        try {
            if (typeof ammoStock !== "undefined" && ammoStock) {
                const r310 = parseInt(ammoStock[9], 10) || 0;
                const plt2026 = parseInt(ammoStock[10], 10) || 0;
                const plt2021 = parseInt(ammoStock[11], 10) || 0;
                if (r310 > 0) preferredRocketId = 1; else if (plt2026 > 0) preferredRocketId = 2; else if (plt2021 > 0) preferredRocketId = 3;
            }
        } catch (_) {}
        if (typeof sendSelectRocket === "function") {
            sendSelectRocket(preferredRocketId);
        } else {
            currentRocketId = preferredRocketId;
        }
    }
    const rocketIdNum = Number(currentRocketId);
    if (typeof getCooldownInfo === "function") {
        const cooldownCode = typeof flashGetCooldownCodeForItem === "function" ? flashGetCooldownCodeForItem({
            type: "rocket",
            id: rocketIdNum
        }) : rocketIdNum === 10 ? "DCR" : "ROK";
        if (cooldownCode) {
            const cd = getCooldownInfo(cooldownCode);
            if (cd) {
                const secs = Math.max(1, Math.ceil(cd.remaining));
                if (typeof addInfoMessage === "function") {
                    const rocketName = typeof flashResolveRocketCooldownCodeById === "function" && cooldownCode !== "ROK" ? (rocketIdNum === 5 ? "PLD-8" : rocketIdNum === 7 ? "WIZ" : rocketIdNum === 10 ? "DCR-250" : "Rocket") : "Rocket";
                    addInfoMessage(`${rocketName} is on cooldown (${secs}s).`);
                }
                return;
            }
        }
    }
    const packet = `v|${targetId}`;
    if (window.FLASH_PARITY_DEBUG) {
        console.log("[WS] Sending ROCKET_ATTACK →", packet);
    }
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

function sendCollectBox(id, options = {}) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    if (id == null) return false;
    const opts = options || {};
    if (typeof markCollectRequestPending === "function") {
        if (!markCollectRequestPending(id)) return false;
    } else if (typeof collectedBoxRequestIds !== "undefined") {
        if (collectedBoxRequestIds.has(id)) return false;
        collectedBoxRequestIds.add(id);
    }
    const serverId = typeof extractCollectableServerId === "function" ? extractCollectableServerId(id) : typeof id === "string" && id.startsWith("c:") ? id.slice(2) : id;
    const packet = `x|${serverId}`;
    sendRaw(packet);
    if (opts.playFlashFeedback) {
        if (typeof playFlashExactCollectFeedback === "function") {
            playFlashExactCollectFeedback(id);
        }
    } else if (!opts.suppressStartBeam && typeof startHeroCollectorBeam === "function" && !isCollectDelayActiveFor(id)) {
        startHeroCollectorBeam();
    }
    return true;
}

function sendSelectAmmo(ammoId) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (ammoId == null) return;
    const packet = `u|${ammoId}`;
    sendRaw(packet);
    updateLocalAmmoSelection(ammoId);
}

function sendSelectRocket(rocketId) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (rocketId == null) return;
    const packet = `d|${rocketId}`;
    sendRaw(packet);
    currentRocketId = rocketId;
    if (actionDrawerCategory === "rocket") {
        renderActionDrawerItems();
    }
}

function sendRocketLauncherCommand(subCode, ...args) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (!subCode) return;
    const packet = [ "RL", subCode, ...args.filter(value => value !== undefined && value !== null && value !== "") ].join("|");
    sendRaw(packet);
}

function sendSelectLauncherRocket(rocketId) {
    const rocketIdNum = Number(rocketId);
    if (!Number.isFinite(rocketIdNum) || rocketIdNum < 7) return;
    window.heroSelectedLauncherRocket = rocketIdNum;
    sendRocketLauncherCommand("SEL", rocketIdNum);
    if (actionDrawerCategory === "rocket" && typeof renderActionDrawerItems === "function") {
        renderActionDrawerItems();
    }
}

function sendRocketLauncherLoadOrFire() {
    const loaded = Math.max(0, parseInt(window.heroRocketLauncherRocketsLoaded, 10) || 0);
    sendRocketLauncherCommand(loaded < 1 ? "L" : "A");
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
}

function sendCpuAction(code) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (!code) return;
    if (code === "ARL") {
        if (typeof window.heroHasAutoRocketCpu !== "undefined" && window.heroHasAutoRocketCpu === false) {
            return;
        }
        const current = typeof window.heroAutoRocketSkill === "number" ? window.heroAutoRocketSkill : 0;
        const next = current === 1 ? 0 : 1;
        sendRaw(`S|ARL|${next}`);
        return;
    }
    if (code === "RLC") {
        const current = typeof window.heroRocketLauncherAutoCpuState === "number" ? window.heroRocketLauncherAutoCpuState : 0;
        const next = current === 1 ? 0 : 1;
        sendRaw(`S|RLC|${next}`);
        return;
    }
    const packet = `S|${code}`;
    sendRaw(packet);
}

function sendGroupPing(targetX, targetY) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const x = Math.round(targetX);
    const y = Math.round(targetY);
    const packet = `ps|png|pos|${x}|${y}`;
    sendRaw(packet);
    addInfoMessage(`Group ping sent: ${x},${y}`);
}

const BOX_COLLECT_RANGE = 70;

const FLASH_EXACT_COLLECT_EPSILON = 1.5;

const BOX_COLLECT_DELAY_MS = 1500;

function hasReachedCollectApproach(targetBox) {
    if (!targetBox) return false;
    const collectApproach = typeof computeCollectApproach === "function" ? computeCollectApproach(targetBox) : null;
    const targetX = collectApproach && Number.isFinite(collectApproach.x) ? collectApproach.x : targetBox.x;
    const targetY = collectApproach && Number.isFinite(collectApproach.y) ? collectApproach.y : targetBox.y;
    if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) return false;
    return Math.hypot(targetX - shipX, targetY - shipY) <= FLASH_EXACT_COLLECT_EPSILON;
}

function handleCollectRange(targetBox, distToBox, collectRequested) {
    if (!targetBox || collectRequested) return false;
    const collectApproach = typeof computeCollectApproach === "function" ? computeCollectApproach(targetBox) : null;
    const distToApproach = collectApproach ? Math.hypot((collectApproach.x ?? targetBox.x) - shipX, (collectApproach.y ?? targetBox.y) - shipY) : distToBox;
    const effectiveDistance = collectApproach ? distToApproach : distToBox;
    if (typeof shouldCollectLikeFlash === "function" && shouldCollectLikeFlash(targetBox)) {
        if (hasReachedCollectApproach(targetBox)) {
            return sendCollectBox(targetBox.id, {
                playFlashFeedback: true,
                suppressStartBeam: true
            });
        }
        if (isCollectDelayActiveFor(targetBox.id)) {
            cancelCollectDelay();
        }
        return false;
    }
    const needsDelay = shouldUseCollectDelay(targetBox);
    if (effectiveDistance <= BOX_COLLECT_RANGE) {
        if (needsDelay) {
            if (!isCollectDelayActiveFor(targetBox.id)) {
                startCollectDelay(targetBox.id, BOX_COLLECT_DELAY_MS);
            }
            return false;
        }
        return sendCollectBox(targetBox.id);
    }
    if (needsDelay && isCollectDelayActiveFor(targetBox.id)) {
        cancelCollectDelay();
    }
    return false;
}

function updateHeroLocalMovement(dt) {
    const prevX = shipX;
    const prevY = shipY;
    const targetBox = pendingCollectBoxId !== null ? entities[pendingCollectBoxId] : null;
    if (targetBox) {
        const collectTarget = typeof computeCollectApproach === "function" ? computeCollectApproach(targetBox) : {
            x: targetBox.x,
            y: targetBox.y
        };
        if (collectTarget) {
            moveTargetX = collectTarget.x;
            moveTargetY = collectTarget.y;
        }
    } else {
    }
    if (moveTargetX === null || moveTargetY === null) {
        if (pendingCollectBoxId !== null) {
            const collectBox = entities[pendingCollectBoxId];
            if (collectBox) {
                const distToBox = Math.hypot(collectBox.x - shipX, collectBox.y - shipY);
                const collectRequested = typeof hasCollectRequestPending === "function" ? hasCollectRequestPending(pendingCollectBoxId) : typeof collectedBoxRequestIds !== "undefined" && collectedBoxRequestIds.has(pendingCollectBoxId);
                handleCollectRange(collectBox, distToBox, collectRequested);
            } else {
                clearPendingCollectState();
            }
        }
        try {
            if (window.AudioManager && typeof window.AudioManager.setHeroEngineMoving === "function") {
                window.AudioManager.setHeroEngineMoving(false);
            }
        } catch (_) {}
        return;
    }
    const dx = moveTargetX - shipX;
    const dy = moveTargetY - shipY;
    const dist = Math.hypot(dx, dy);
    let arrivedThisFrame = false;
    if (dist > 1e-4) {
        heroAngle = Math.atan2(dy, dx) + Math.PI;
    }
    let collectRequested = pendingCollectBoxId !== null ? typeof hasCollectRequestPending === "function" ? hasCollectRequestPending(pendingCollectBoxId) : typeof collectedBoxRequestIds !== "undefined" && collectedBoxRequestIds.has(pendingCollectBoxId) : false;
    if (targetBox) {
        const distToBox = Math.hypot(targetBox.x - shipX, targetBox.y - shipY);
        const collectTriggered = handleCollectRange(targetBox, distToBox, collectRequested);
        if (collectTriggered) {
            collectRequested = true;
        }
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
    if (Math.abs(shipX - prevX) > .01 || Math.abs(shipY - prevY) > .01) {
        if (heroRepairing && !heroBattleRepairing && typeof setHeroRepairing === "function") {
            setHeroRepairing(false);
        }
    }
    try {
        if (window.AudioManager && typeof window.AudioManager.setHeroEngineMoving === "function") {
            window.AudioManager.setHeroEngineMoving(moveTargetX !== null && moveTargetY !== null);
        }
    } catch (_) {}
}

function updateChaseMovement() {
    const targetId = attackIntentTargetId;
    if (targetId == null) return;
    const target = targetId === heroId ? {
        x: shipX,
        y: shipY
    } : entities[targetId];
    if (!target) {
        attackIntentTargetId = null;
        isChasingTarget = false;
        resetPendingRangeResume();
        return;
    }
    const dx = target.x - shipX;
    const dy = target.y - shipY;
    const dist = Math.hypot(dx, dy);
    const attackRange = LASER_MAX_RANGE;
    if (dist > attackRange) {
        return;
    }
}

function updateInterpolations() {
    const now = performance.now();
    for (const id in entities) {
        const e = entities[id];
        const p = e.interp;
        if (!p || p.duration <= 0) continue;
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
        const dx = e.x - oldX;
        const dy = e.y - oldY;
        if (dx * dx + dy * dy > .1) {
            e.desiredAngle = Math.atan2(dy, dx) + Math.PI;
        }
    }
}

function updateCombat() {
    if (heroHp !== null && heroHp <= 0) {
        if (currentLaserTargetId != null) sendLaserStop(currentLaserTargetId, true);
        return;
    }
    const targetId = attackIntentTargetId || currentLaserTargetId;
    if (targetId == null) return;
    const hasTarget = targetId === heroId || !!entities[targetId];
    if (!hasTarget) {
        noteHeroMissingCombatTarget(targetId);
        return;
    }
    clearHeroMissingCombatTarget(targetId);
}

function updateTemporaryStatuses(now) {
    if (heroEmpImmunityUntil && now >= heroEmpImmunityUntil) {
        heroEmpImmunityUntil = 0;
    }
    if (heroTargetFadeUntil && now >= heroTargetFadeUntil) {
        heroTargetFadeUntil = 0;
        heroTargetFaded = false;
    }
    if (typeof activeTemporaryStatusEntityIds === "undefined" || activeTemporaryStatusEntityIds.size === 0) return;
    for (const id of activeTemporaryStatusEntityIds) {
        const ent = entities[id];
        if (!ent) {
            activeTemporaryStatusEntityIds.delete(id);
            continue;
        }
        if (ent.id === heroId) {
            activeTemporaryStatusEntityIds.delete(id);
            continue;
        }
        if (ent.empImmunityUntil && now >= ent.empImmunityUntil) {
            ent.empImmunityUntil = 0;
        }
        if (ent.targetFadeUntil && now >= ent.targetFadeUntil) {
            ent.targetFadeUntil = 0;
            ent.targetFaded = false;
        }
        if (!ent.empImmunityUntil && !ent.targetFadeUntil) {
            activeTemporaryStatusEntityIds.delete(id);
        }
    }
}

function updateCombatRotations() {
    const now = performance.now();
    const targetId = currentLaserTargetId || confirmedAttackTargetId || pendingRangeResumeTargetId;
    if (targetId !== null) {
        const target = entities[targetId];
        if (target) {
            clearHeroMissingCombatTarget(targetId);
            const dx = target.x - shipX;
            const dy = target.y - shipY;
            heroAngle = Math.atan2(dy, dx) + Math.PI;
        } else {
            noteHeroMissingCombatTarget(targetId, now);
        }
    } else {
        clearHeroMissingCombatTarget();
    }
    if (typeof laserBeams !== "undefined") {
        for (let i = 0; i < laserBeams.length; i++) {
            const beam = laserBeams[i];
            const attackerId = beam.attackerId;
            const tId = beam.targetId;
            if (attackerId == null || attackerId === heroId) continue;
            const attacker = entities[attackerId];
            if (!attacker) continue;
            let targetX;
            let targetY;
            if (tId === heroId) {
                targetX = shipX;
                targetY = shipY;
            } else {
                const target = entities[tId];
                if (target) {
                    targetX = target.x;
                    targetY = target.y;
                }
            }
            if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) {
                attacker.attackTargetId = null;
                attacker.attackLockUntil = 0;
                continue;
            }
            attacker.attackTargetId = tId;
            if (beam.duration) {
                const lockUntil = beam.createdAt + beam.duration;
                attacker.attackLockUntil = Math.max(attacker.attackLockUntil || 0, lockUntil);
            }
            const dx = targetX - attacker.x;
            const dy = targetY - attacker.y;
            attacker.desiredAngle = Math.atan2(dy, dx) + Math.PI;
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
            if (typeof clearAttackLockForEntity === "function") {
                clearAttackLockForEntity(ent);
            } else {
                ent.attackTargetId = null;
                ent.attackLockUntil = 0;
                ent.attackLockX = null;
                ent.attackLockY = null;
            }
            continue;
        }
        let targetX;
        let targetY;
        if (ent.attackTargetId === heroId) {
            targetX = shipX;
            targetY = shipY;
        } else {
            const target = entities[ent.attackTargetId];
            if (target) {
                targetX = target.x;
                targetY = target.y;
            }
        }
        if (Number.isFinite(targetX) && Number.isFinite(targetY)) {
            ent.attackLockX = targetX;
            ent.attackLockY = targetY;
        } else if (Number.isFinite(ent.attackLockX) && Number.isFinite(ent.attackLockY)) {
            targetX = ent.attackLockX;
            targetY = ent.attackLockY;
        }
        if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) {
            if (typeof clearAttackLockForEntity === "function") {
                clearAttackLockForEntity(ent);
            } else {
                ent.attackTargetId = null;
                ent.attackLockUntil = 0;
                ent.attackLockX = null;
                ent.attackLockY = null;
            }
            continue;
        }
        const dx = targetX - ent.x;
        const dy = targetY - ent.y;
        ent.desiredAngle = Math.atan2(dy, dx) + Math.PI;
    }
}

function wrapAngleRad(a) {
    a = (a + Math.PI) % (Math.PI * 2);
    if (a < 0) a += Math.PI * 2;
    return a - Math.PI;
}

function turnTowardsRad(current, target, maxStep) {
    const diff = wrapAngleRad(target - current);
    if (diff > maxStep) return wrapAngleRad(current + maxStep);
    if (diff < -maxStep) return wrapAngleRad(current - maxStep);
    return wrapAngleRad(target);
}

function smoothEntityRotations(dt) {
    if (!dt || !isFinite(dt) || dt <= 0) return;
    const TURN_SPEED = Math.PI * 3;
    const maxStep = TURN_SPEED * dt;
    for (const id in entities) {
        const e = entities[id];
        if (!e || e.id === heroId) continue;
        if (e.kind === "box") continue;
        if (typeof e.desiredAngle !== "number") continue;
        if (typeof e.angle !== "number") {
            e.angle = e.desiredAngle;
            continue;
        }
        e.angle = turnTowardsRad(e.angle, e.desiredAngle, maxStep);
    }
}

function reinforceLockState() {
    const candidate = selectedTargetId !== null ? selectedTargetId : currentLaserTargetId !== null ? currentLaserTargetId : pendingRangeResumeTargetId !== null ? pendingRangeResumeTargetId : attackIntentTargetId;
    if (candidate != null) {
        if (selectedTargetId === null) selectedTargetId = candidate;
        if (attackIntentTargetId === null && currentLaserTargetId !== null) {
            attackIntentTargetId = currentLaserTargetId;
        }
    }
}

const LASER_SPRITE_CACHE = {};

const NETTEL_SPRITE_ID = 7;

const CRYSTAL_LASER_SPRITE_ID = 8;

const CRYSTAL2_LASER_SPRITE_ID = 9;

const DEVOLARIUM_LASER_SPRITE_ID = 10;

const LORDAKIUM_LASER_SPRITE_ID = 11;

const PROTEGIT_LASER_SPRITE_ID = 12;

const LASER_STATIC_ATLAS = Object.freeze({
    atlasPath: "graphics/atlas/lasers_static_v1.png",
    atlasColumns: 4,
    atlasCellWidth: 122,
    atlasCellHeight: 102,
    atlasPadding: 1,
    entries: Object.freeze({
        laser0: Object.freeze({
            atlasIndex: 0,
            frameWidth: 87,
            frameHeight: 21
        }),
        laser1: Object.freeze({
            atlasIndex: 1,
            frameWidth: 87,
            frameHeight: 21
        }),
        laser2: Object.freeze({
            atlasIndex: 2,
            frameWidth: 83,
            frameHeight: 14
        }),
        laser3: Object.freeze({
            atlasIndex: 3,
            frameWidth: 83,
            frameHeight: 14
        }),
        laser4: Object.freeze({
            atlasIndex: 4,
            frameWidth: 24,
            frameHeight: 64
        }),
        laser5: Object.freeze({
            atlasIndex: 5,
            frameWidth: 83,
            frameHeight: 18
        }),
        laser6: Object.freeze({
            atlasIndex: 6,
            frameWidth: 60,
            frameHeight: 14
        }),
        nettel: Object.freeze({
            atlasIndex: 7,
            frameWidth: 55,
            frameHeight: 17
        }),
        protegitShot: Object.freeze({
            atlasIndex: 8,
            frameWidth: 19,
            frameHeight: 12
        }),
        skillLaser0: Object.freeze({
            atlasIndex: 9,
            frameWidth: 120,
            frameHeight: 47
        }),
        skillLaser1: Object.freeze({
            atlasIndex: 10,
            frameWidth: 120,
            frameHeight: 47
        }),
        skillLaser2: Object.freeze({
            atlasIndex: 11,
            frameWidth: 120,
            frameHeight: 47
        }),
        skillLaser3: Object.freeze({
            atlasIndex: 12,
            frameWidth: 120,
            frameHeight: 47
        }),
        skillLaser4: Object.freeze({
            atlasIndex: 13,
            frameWidth: 43,
            frameHeight: 100
        }),
        skillLaser5: Object.freeze({
            atlasIndex: 14,
            frameWidth: 120,
            frameHeight: 47
        }),
        skillLaser6: Object.freeze({
            atlasIndex: 15,
            frameWidth: 120,
            frameHeight: 47
        })
    })
});

const LASER_ANIMATED_ATLASES = Object.freeze({
    crystal1: Object.freeze({
        atlasPath: "graphics/atlas/lasers_crystal1_v1.png",
        atlasColumns: 6,
        atlasCellWidth: 22,
        atlasCellHeight: 17,
        atlasPadding: 1,
        frameWidth: 20,
        frameHeight: 15,
        frameCount: 12,
        frameDuration: 50
    }),
    crystal2: Object.freeze({
        atlasPath: "graphics/atlas/lasers_crystal2_v1.png",
        atlasColumns: 6,
        atlasCellWidth: 42,
        atlasCellHeight: 32,
        atlasPadding: 1,
        frameWidth: 40,
        frameHeight: 30,
        frameCount: 12,
        frameDuration: 50
    }),
    devolariumShot: Object.freeze({
        atlasPath: "graphics/atlas/lasers_devolarium_v1.png",
        atlasColumns: 10,
        atlasCellWidth: 152,
        atlasCellHeight: 152,
        atlasPadding: 1,
        frameWidth: 150,
        frameHeight: 150,
        frameCount: 100,
        frameDuration: 30
    }),
    lordakiumShot: Object.freeze({
        atlasPath: "graphics/atlas/lasers_lordakium_v1.png",
        atlasColumns: 2,
        atlasCellWidth: 112,
        atlasCellHeight: 67,
        atlasPadding: 1,
        frameCount: 4,
        frameDuration: 60,
        framesMeta: Object.freeze([ Object.freeze({
            frameWidth: 83,
            frameHeight: 65
        }), Object.freeze({
            frameWidth: 97,
            frameHeight: 37
        }), Object.freeze({
            frameWidth: 104,
            frameHeight: 31
        }), Object.freeze({
            frameWidth: 110,
            frameHeight: 49
        }) ])
    })
});

const laserAtlasImageCache = Object.create(null);

const laserAtlasStatusCache = Object.create(null);

const laserAtlasListenersBound = Object.create(null);

const LASER_SPRITE_INFO = {
    0: {
        atlasEntry: "laser0",
        width: 87,
        height: 21
    },
    1: {
        atlasEntry: "laser1",
        width: 87,
        height: 21
    },
    2: {
        atlasEntry: "laser2",
        width: 83,
        height: 14
    },
    3: {
        atlasEntry: "laser3",
        width: 83,
        height: 14
    },
    4: {
        atlasEntry: "laser4",
        width: 24,
        height: 64
    },
    5: {
        atlasEntry: "laser5",
        width: 83,
        height: 18
    },
    6: {
        atlasEntry: "laser6",
        width: 60,
        height: 14
    },
    [NETTEL_SPRITE_ID]: {
        atlasEntry: "nettel",
        width: 55,
        height: 17
    },
    [PROTEGIT_LASER_SPRITE_ID]: {
        atlasEntry: "protegitShot",
        width: 19,
        height: 12
    },
    [CRYSTAL_LASER_SPRITE_ID]: {
        atlasAnimKey: "crystal1"
    },
    [CRYSTAL2_LASER_SPRITE_ID]: {
        atlasAnimKey: "crystal2"
    },
    [DEVOLARIUM_LASER_SPRITE_ID]: {
        atlasAnimKey: "devolariumShot"
    },
    [LORDAKIUM_LASER_SPRITE_ID]: {
        atlasAnimKey: "lordakiumShot"
    }
};

const MAX_LASER_SPRITE_ID = Math.max(...Object.keys(LASER_SPRITE_INFO).map(Number));

const DEFAULT_LASER_SPEED_MS = typeof LASER_BEAM_DURATION !== "undefined" ? LASER_BEAM_DURATION : 150;

const LASER_ATTACK_LENGTH_MS = 1350;

const energyLeechEchoBeams = [];

function clearEnergyLeechEchoBeams() {
    energyLeechEchoBeams.length = 0;
}

const LASER_PATTERN_META = {
    0: {
        spriteId: 0,
        absorber: false,
        allowOffsets: true,
        speed: .15,
        playLoop: false,
        playLoopRotated: false,
        laserLength: 80
    },
    1: {
        spriteId: 1,
        absorber: false,
        allowOffsets: true,
        speed: .15,
        playLoop: false,
        playLoopRotated: false,
        laserLength: 80
    },
    2: {
        spriteId: 2,
        absorber: false,
        allowOffsets: true,
        speed: .15,
        playLoop: false,
        playLoopRotated: false,
        laserLength: 80
    },
    3: {
        spriteId: 3,
        absorber: false,
        allowOffsets: true,
        speed: .15,
        playLoop: false,
        playLoopRotated: false,
        laserLength: 80
    },
    4: {
        spriteId: 4,
        absorber: true,
        allowOffsets: false,
        speed: .5,
        playLoop: false,
        playLoopRotated: false,
        attackLengthMs: LASER_ATTACK_LENGTH_MS
    },
    5: {
        spriteId: 5,
        absorber: false,
        allowOffsets: true,
        speed: .15,
        playLoop: false,
        playLoopRotated: false,
        laserLength: 80
    },
    6: {
        spriteId: 6,
        absorber: false,
        allowOffsets: true,
        speed: .15,
        playLoop: false,
        playLoopRotated: false,
        laserLength: 60
    },
    7: {
        spriteId: 5,
        absorber: false,
        allowOffsets: false,
        speed: .5,
        playLoop: false,
        playLoopRotated: false,
        laserLength: 0
    }
};

function markLaserAtlasReadyIfDecoded(atlasPath, img) {
    if (img && img.complete && (img.naturalWidth || img.width) > 0 && (img.naturalHeight || img.height) > 0) {
        laserAtlasStatusCache[atlasPath] = "ready";
        return true;
    }
    return false;
}

function getLaserAtlasImage(atlasPath) {
    if (!atlasPath) return null;
    if (!laserAtlasImageCache[atlasPath]) {
        laserAtlasImageCache[atlasPath] = andromedaCreateImage(atlasPath);
        laserAtlasStatusCache[atlasPath] = markLaserAtlasReadyIfDecoded(atlasPath, laserAtlasImageCache[atlasPath]) ? "ready" : "pending";
    }
    const atlasImage = laserAtlasImageCache[atlasPath];
    if (!laserAtlasListenersBound[atlasPath] && atlasImage) {
        laserAtlasListenersBound[atlasPath] = true;
        atlasImage.addEventListener("load", () => {
            markLaserAtlasReadyIfDecoded(atlasPath, atlasImage);
        });
        atlasImage.addEventListener("error", () => {
            laserAtlasStatusCache[atlasPath] = "error";
        });
    }
    markLaserAtlasReadyIfDecoded(atlasPath, atlasImage);
    return atlasImage;
}

function buildLaserAtlasFrame(def, frameIndex = 0) {
    if (!def || !def.atlasPath) return null;
    const atlas = getLaserAtlasImage(def.atlasPath);
    if (!atlas) return null;
    const status = laserAtlasStatusCache[def.atlasPath] || "idle";
    const frameMeta = Array.isArray(def.framesMeta) && def.framesMeta.length ? def.framesMeta[Math.max(0, Math.min(def.framesMeta.length - 1, frameIndex))] : null;
    const frameWidth = frameMeta?.frameWidth || def.frameWidth || 0;
    const frameHeight = frameMeta?.frameHeight || def.frameHeight || 0;
    if (frameWidth <= 0 || frameHeight <= 0) return null;
    if (status !== "ready" || !atlas.complete || (atlas.naturalWidth || atlas.width) <= 0 || (atlas.naturalHeight || atlas.height) <= 0) {
        return {
            pendingAtlas: true,
            width: frameWidth,
            height: frameHeight
        };
    }
    const atlasIndex = (def.atlasStartIndex || 0) + frameIndex;
    const columns = Math.max(1, def.atlasColumns || 1);
    const cellWidth = def.atlasCellWidth || frameWidth;
    const cellHeight = def.atlasCellHeight || frameHeight;
    const padding = def.atlasPadding || 0;
    const col = atlasIndex % columns;
    const row = Math.floor(atlasIndex / columns);
    const sx = col * cellWidth + padding;
    const sy = row * cellHeight + padding;
    const sw = frameWidth;
    const sh = frameHeight;
    const atlasWidth = atlas.naturalWidth || atlas.width;
    const atlasHeight = atlas.naturalHeight || atlas.height;
    if (sx + sw > atlasWidth || sy + sh > atlasHeight) {
        laserAtlasStatusCache[def.atlasPath] = "error";
        return null;
    }
    return {
        atlas: atlas,
        sx: sx,
        sy: sy,
        sw: sw,
        sh: sh,
        width: frameWidth,
        height: frameHeight
    };
}

function getLaserStaticAtlasFrame(entryKey) {
    if (!entryKey) return null;
    const entry = LASER_STATIC_ATLAS.entries[entryKey];
    if (!entry) return null;
    const cacheKey = `laser-static-${entryKey}`;
    const cached = LASER_SPRITE_CACHE[cacheKey];
    if (cached && !cached.pendingAtlas) return cached;
    const frameDef = buildLaserAtlasFrame({
        atlasPath: LASER_STATIC_ATLAS.atlasPath,
        atlasColumns: LASER_STATIC_ATLAS.atlasColumns,
        atlasCellWidth: LASER_STATIC_ATLAS.atlasCellWidth,
        atlasCellHeight: LASER_STATIC_ATLAS.atlasCellHeight,
        atlasPadding: LASER_STATIC_ATLAS.atlasPadding,
        atlasStartIndex: entry.atlasIndex,
        frameWidth: entry.frameWidth,
        frameHeight: entry.frameHeight
    }, 0);
    if (frameDef && !frameDef.pendingAtlas) {
        LASER_SPRITE_CACHE[cacheKey] = frameDef;
    }
    return frameDef;
}

function getAnimatedLaserAtlasFrame(animKey, frameIndex) {
    const def = LASER_ANIMATED_ATLASES[animKey];
    if (!def) return null;
    const frameCount = Math.max(1, def.frameCount || 1);
    const idx = (frameIndex % frameCount + frameCount) % frameCount;
    const cacheKey = `laser-anim-${animKey}-${idx}`;
    const cached = LASER_SPRITE_CACHE[cacheKey];
    if (cached && !cached.pendingAtlas) return cached;
    const frameDef = buildLaserAtlasFrame(def, idx);
    if (frameDef && !frameDef.pendingAtlas) {
        LASER_SPRITE_CACHE[cacheKey] = frameDef;
    }
    return frameDef;
}

function resolveLaserStaticEntryKey(spriteId, skilledLaser = false) {
    const id = Number.isFinite(spriteId) ? Math.max(0, Math.min(MAX_LASER_SPRITE_ID, spriteId)) : 0;
    const info = LASER_SPRITE_INFO[id] || LASER_SPRITE_INFO[0];
    if (skilledLaser && id >= 0 && id <= 6) {
        const xmlSkillKey = typeof window !== "undefined" && window.LASER_RESKEYS_BY_TYPE && window.LASER_RESKEYS_BY_TYPE[id] && window.LASER_RESKEYS_BY_TYPE[id].skillResKey ? window.LASER_RESKEYS_BY_TYPE[id].skillResKey : null;
        if (xmlSkillKey && LASER_STATIC_ATLAS.entries[xmlSkillKey]) {
            return xmlSkillKey;
        }
        const fallbackSkillKey = `skillLaser${id}`;
        if (LASER_STATIC_ATLAS.entries[fallbackSkillKey]) {
            return fallbackSkillKey;
        }
    }
    return info.atlasEntry || null;
}

function getLaserSpriteSource(spriteData) {
    return spriteData?.atlas || spriteData?.img || spriteData || null;
}

function isLaserSpriteFrameReady(spriteData) {
    if (!spriteData || spriteData.pendingAtlas) return false;
    const source = getLaserSpriteSource(spriteData);
    if (!source) return false;
    if (typeof source.complete === "boolean" && !source.complete) return false;
    const width = spriteData?.width || source.width || source.naturalWidth || 0;
    const height = spriteData?.height || source.height || source.naturalHeight || 0;
    return width > 0 && height > 0;
}

function drawLaserSpriteFrame(spriteData, dx, dy, dw, dh) {
    if (!spriteData || spriteData.pendingAtlas) return false;
    const source = getLaserSpriteSource(spriteData);
    if (!source) return false;
    if (spriteData.atlas) {
        ctx.drawImage(spriteData.atlas, spriteData.sx, spriteData.sy, spriteData.sw, spriteData.sh, dx, dy, dw, dh);
    } else {
        ctx.drawImage(source, dx, dy, dw, dh);
    }
    return true;
}

function resolveLaserVisual(patternId, skilledLaser) {
    const meta = LASER_PATTERN_META[patternId] || LASER_PATTERN_META[0];
    const spriteId = skilledLaser && LASER_PATTERN_META[patternId]?.skillSpriteId !== undefined ? LASER_PATTERN_META[patternId].skillSpriteId : meta.spriteId;
    return {
        spriteId: Math.max(0, Math.min(MAX_LASER_SPRITE_ID, spriteId || 0)),
        absorber: !!meta.absorber,
        allowOffsets: meta.allowOffsets !== false,
        playLoop: !!meta.playLoop,
        playLoopRotated: !!meta.playLoopRotated,
        speedMs: Math.max(1, Math.round((meta.speed ?? .15) * 1e3)),
        attackLengthMs: Math.max(1, Math.round(meta.attackLengthMs || LASER_ATTACK_LENGTH_MS)),
        laserLength: Number.isFinite(meta.laserLength) ? meta.laserLength : undefined
    };
}

function getLaserSpriteFrame(spriteId, skilledLaser = false) {
    const id = Number.isFinite(spriteId) ? Math.max(0, Math.min(MAX_LASER_SPRITE_ID, spriteId)) : 0;
    const info = LASER_SPRITE_INFO[id] || LASER_SPRITE_INFO[0];
    if (info.atlasAnimKey) {
        const animDef = LASER_ANIMATED_ATLASES[info.atlasAnimKey];
        if (!animDef) return null;
        const frameDuration = Math.max(1, animDef.frameDuration || 50);
        const frameCount = Math.max(1, animDef.frameCount || 1);
        const idx = Math.floor(performance.now() / frameDuration) % frameCount;
        return getAnimatedLaserAtlasFrame(info.atlasAnimKey, idx);
    }
    const entryKey = resolveLaserStaticEntryKey(id, skilledLaser);
    return getLaserStaticAtlasFrame(entryKey);
}

function updateLaserBeams(now) {
    let keepCount = 0;
    for (let i = 0; i < laserBeams.length; i++) {
        const beam = laserBeams[i];
        const elapsed = now - beam.createdAt;
        if (elapsed >= beam.duration) {
            if (!beam.hitHandled) {
                handleLaserImpact(beam);
                beam.hitHandled = true;
            }
            continue;
        }
        laserBeams[keepCount++] = beam;
    }
    laserBeams.length = keepCount;
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
    const angle = normalizeShieldImpactVisualAngle(beam.rotation ?? beam.angle);
    if (angle == null) return;
    const sx = heroId !== null && targetSnap.id === heroId ? shipX : targetSnap.x;
    const sy = heroId !== null && targetSnap.id === heroId ? shipY : targetSnap.y;
    spawnShieldBurstAt(sx, sy, "hit", {
        angle: angle,
        radius: radius,
        targetId: targetSnap.id,
        followTarget: true
    });
}

function getRocketLifetimeMs(beam) {
    const customDuration = Number(beam && beam.duration);
    if (Number.isFinite(customDuration) && customDuration > 0) {
        return customDuration;
    }
    return ROCKET_BEAM_DURATION;
}

function updateRocketLauncherMissDisplays(now = performance.now()) {
    if (!Array.isArray(rocketLauncherMissDisplays) || rocketLauncherMissDisplays.length === 0) return;
    let keepCount = 0;
    for (let i = 0; i < rocketLauncherMissDisplays.length; i++) {
        const entry = rocketLauncherMissDisplays[i];
        if (!entry) {
            continue;
        }
        const triggerAt = Number(entry.triggerAt) || 0;
        if (now < triggerAt) {
            rocketLauncherMissDisplays[keepCount++] = entry;
            continue;
        }
        damageBubbles.push({
            entityId: entry.targetId,
            visualLifeId: entry.targetVisualLifeId != null ? entry.targetVisualLifeId : null,
            snapshotX: Number.isFinite(entry.snapshotX) ? entry.snapshotX : null,
            snapshotY: Number.isFinite(entry.snapshotY) ? entry.snapshotY : null,
            snapshotShipId: entry.snapshotShipId ?? null,
            value: 0,
            isHeal: false,
            colorId: 0,
            showPlus: false,
            createdAt: now
        });
    }
    rocketLauncherMissDisplays.length = keepCount;
}

function queueRocketLauncherMissDisplay(targetId, delayMs, now = performance.now(), targetSnapshot = null) {
    if (!Array.isArray(rocketLauncherMissDisplays) || targetId == null) return;
    const snapshot = targetSnapshot || (typeof captureEntityEffectSnapshot === "function" ? captureEntityEffectSnapshot(targetId) : null);
    rocketLauncherMissDisplays.push({
        targetId: targetId,
        targetVisualLifeId: snapshot && snapshot.visualLifeId != null ? snapshot.visualLifeId : null,
        snapshotX: snapshot && Number.isFinite(snapshot.x) ? snapshot.x : null,
        snapshotY: snapshot && Number.isFinite(snapshot.y) ? snapshot.y : null,
        snapshotShipId: snapshot ? snapshot.shipId ?? snapshot.type ?? null : null,
        triggerAt: now + Math.max(0, Number(delayMs) || 0)
    });
    if (rocketLauncherMissDisplays.length > 32) {
        rocketLauncherMissDisplays.splice(0, rocketLauncherMissDisplays.length - 32);
    }
}

function resolveRocketTargetPosition(beam) {
    const targetSnap = typeof resolveLiveEntitySnapshotForVisual === "function" ? resolveLiveEntitySnapshotForVisual(beam.targetId, beam.targetVisualLifeId) : snapshotEntityById(beam.targetId);
    const reusableTargetPosition = beam._targetPosition || (beam._targetPosition = {
        x: 0,
        y: 0
    });
    if (!beam.targetDetached && targetSnap && targetSnap.x != null && targetSnap.y != null) {
        beam.targetLastX = targetSnap.x;
        beam.targetLastY = targetSnap.y;
        if (beam.targetVisualLifeId == null && targetSnap.visualLifeId != null) {
            beam.targetVisualLifeId = targetSnap.visualLifeId;
        }
        reusableTargetPosition.x = targetSnap.x;
        reusableTargetPosition.y = targetSnap.y;
        return reusableTargetPosition;
    }
    if (Number.isFinite(beam.targetLastX) && Number.isFinite(beam.targetLastY)) {
        reusableTargetPosition.x = beam.targetLastX;
        reusableTargetPosition.y = beam.targetLastY;
        return reusableTargetPosition;
    }
    return null;
}

function getRocketWorldPositions(beam, now = performance.now()) {
    let ax, ay;
    if (Number.isFinite(beam.originX) && Number.isFinite(beam.originY)) {
        ax = beam.originX;
        ay = beam.originY;
    } else if (heroId !== null && beam.attackerId === heroId) {
        ax = shipX;
        ay = shipY;
    } else if (entities[beam.attackerId]) {
        ax = entities[beam.attackerId].x;
        ay = entities[beam.attackerId].y;
    }
    const targetBase = resolveRocketTargetPosition(beam);
    if (ax == null || ay == null || !targetBase) return null;
    const duration = getRocketLifetimeMs(beam);
    const elapsed = Math.max(0, now - (Number(beam.createdAt) || now));
    const linearProgress = Math.max(0, Math.min(1, elapsed / duration));
    let tx = targetBase.x;
    let ty = targetBase.y;
    if (beam.airstrike) {
        const gapScale = 1 - linearProgress;
        tx += (Number(beam.initialTargetGapX) || 0) * gapScale;
        ty += (Number(beam.initialTargetGapY) || 0) * gapScale;
    }
    const positions = beam._worldPositions || (beam._worldPositions = {
        ax: 0,
        ay: 0,
        tx: 0,
        ty: 0,
        targetBaseX: 0,
        targetBaseY: 0,
        duration: 0
    });
    positions.ax = ax;
    positions.ay = ay;
    positions.tx = tx;
    positions.ty = ty;
    positions.targetBaseX = targetBase.x;
    positions.targetBaseY = targetBase.y;
    positions.duration = duration;
    return positions;
}

function updateRocketAttacks(now) {
    updateRocketLauncherMissDisplays(now);
    let keepCount = 0;
    for (let i = 0; i < rocketAttacks.length; i++) {
        const beam = rocketAttacks[i];
        const duration = getRocketLifetimeMs(beam);
        if (now - beam.createdAt > duration) {
            if (!beam.impactHandled) {
                const positions = getRocketWorldPositions(beam, now);
                if (positions) {
                    const impactX = beam.airstrike ? positions.targetBaseX + (Number(beam.impactOffsetX) || 0) : positions.tx;
                    const impactY = beam.airstrike ? positions.targetBaseY + (Number(beam.impactOffsetY) || 0) : positions.ty;
                    spawnRocketDamageEffect(impactX, impactY, resolveRocketDamageType(beam.rocketId));
                }
                beam.impactHandled = true;
            }
            continue;
        }
        rocketAttacks[keepCount++] = beam;
    }
    rocketAttacks.length = keepCount;
}

function updateSabShots(now) {
    let keepCount = 0;
    for (let i = 0; i < sabShots.length; i++) {
        const shot = sabShots[i];
        const SAB_SPEED_MULT = 2;
        const baseDuration = shot.duration || SAB_SHOT_DURATION_MS || 1e3;
        const duration = baseDuration / SAB_SPEED_MULT;
        if (now - shot.createdAt < duration) {
            sabShots[keepCount++] = shot;
        }
    }
    sabShots.length = keepCount;
}

function flashIsEnergyLeechLaserEchoActiveForEntity(entityId, now = performance.now()) {
    const numericId = Number(entityId);
    if (!Number.isFinite(numericId)) return false;
    if (numericId === heroId) {
        return !!window.heroTechEnergyLeechActive && (!(Number(window.heroTechEnergyLeechUntil) > 0) || Number(window.heroTechEnergyLeechUntil) > now);
    }
    const ent = typeof entities === "object" && entities ? entities[numericId] || null : null;
    if (!ent) return false;
    return !!ent.techEnergyLeechActive && (!(Number(ent.techEnergyLeechUntil) > 0) || Number(ent.techEnergyLeechUntil) > now);
}

function spawnEnergyLeechLaserEchoAttack(attackerId, targetId, createdAt = performance.now()) {
    const numericAttackerId = Number(attackerId);
    const numericTargetId = Number(targetId);
    if (!Number.isFinite(numericAttackerId) || !Number.isFinite(numericTargetId)) return;
    if (numericAttackerId === numericTargetId) return;
    const attackerSnap = snapshotEntityById(numericAttackerId);
    const targetSnap = snapshotEntityById(numericTargetId);
    if (!attackerSnap || !targetSnap) return;
    const patternMeta = LASER_PATTERN_META[7] || null;
    const duration = Math.max(1, Math.round((patternMeta && Number.isFinite(patternMeta.speed) ? patternMeta.speed : .5) * 1e3));
    const safeCreatedAt = Number(createdAt) || performance.now();
    energyLeechEchoBeams.push({
        sourceId: numericTargetId,
        destinationId: numericAttackerId,
        startX: targetSnap.x,
        startY: targetSnap.y,
        endX: attackerSnap.x,
        endY: attackerSnap.y,
        createdAt: safeCreatedAt,
        duration: duration,
        endScale: .1
    });
    if (energyLeechEchoBeams.length > 96) {
        energyLeechEchoBeams.splice(0, energyLeechEchoBeams.length - 96);
    }
}

function drawEnergyLeechLaserEchoBeams(now = performance.now()) {
    if (!energyLeechEchoBeams.length) return;
    if (typeof flashGetTechEffectSequenceFrameNumber !== "function" || typeof flashGetTechEffectFrameImage !== "function") return;
    let keepCount = 0;
    for (let i = 0; i < energyLeechEchoBeams.length; i++) {
        const echo = energyLeechEchoBeams[i];
        if (!echo) {
            continue;
        }
        const age = now - (Number(echo.createdAt) || now);
        const duration = Math.max(1, Number(echo.duration) || 500);
        if (age >= duration) {
            continue;
        }
        energyLeechEchoBeams[keepCount++] = echo;
        if (age < 0) continue;
        const progress = Math.max(0, Math.min(1, age / duration));
        const frameNumber = flashGetTechEffectSequenceFrameNumber("ELACLOUD1", Number(echo.createdAt) || now, now);
        if (!(frameNumber > 0)) continue;
        const frameImg = flashGetTechEffectFrameImage("ELACLOUD1", frameNumber);
        const width = frameImg?.naturalWidth || frameImg?.width || 0;
        const height = frameImg?.naturalHeight || frameImg?.height || 0;
        if (!frameImg || !frameImg.complete || width <= 0 || height <= 0) continue;
        const sourceSnap = snapshotEntityById(echo.sourceId) || null;
        const destinationSnap = snapshotEntityById(echo.destinationId) || null;
        const startX = sourceSnap ? sourceSnap.x : Number(echo.startX) || 0;
        const startY = sourceSnap ? sourceSnap.y : Number(echo.startY) || 0;
        const endX = destinationSnap ? destinationSnap.x : Number(echo.endX) || 0;
        const endY = destinationSnap ? destinationSnap.y : Number(echo.endY) || 0;
        const posX = startX + (endX - startX) * progress;
        const posY = startY + (endY - startY) * progress;
        const rot = Math.atan2(endY - startY, endX - startX);
        const scale = 1 + ((Number(echo.endScale) || .1) - 1) * progress;
        ctx.save();
        ctx.globalAlpha *= 0.95;
        ctx.translate(mapToScreenX(posX), mapToScreenY(posY));
        ctx.rotate(rot);
        ctx.scale(scale, scale);
        ctx.drawImage(frameImg, -width / 2, -height / 2, width, height);
        ctx.restore();
    }
    energyLeechEchoBeams.length = keepCount;
}

function drawLaserBeams() {
    const now = performance.now();
    for (const beam of laserBeams) {
        let attackerSnapshot = null;
        let attackerSnapshotReady = false;
        let targetSnapshot = null;
        let targetSnapshotReady = false;
        if (beam.attackerId) {
            attackerSnapshot = snapshotEntityById(beam.attackerId);
            attackerSnapshotReady = true;
            if (attackerSnapshot && (attackerSnapshot.shipId === 31 || attackerSnapshot.shipId === 73)) {
                continue;
            }
        }
        const hasOffset = Number.isFinite(beam.offsetX) && Number.isFinite(beam.offsetY);
        const hasEndOffset = Number.isFinite(beam.offsetEndX) && Number.isFinite(beam.offsetEndY);
        const endOffsetX = hasEndOffset ? beam.offsetEndX : hasOffset ? beam.offsetX : 0;
        const endOffsetY = hasEndOffset ? beam.offsetEndY : hasOffset ? beam.offsetY : 0;
        if (beam.followTargets && beam.attackerId && beam.targetId) {
            if (!attackerSnapshotReady) {
                attackerSnapshot = snapshotEntityById(beam.attackerId);
                attackerSnapshotReady = true;
            }
            if (!targetSnapshotReady) {
                targetSnapshot = snapshotEntityById(beam.targetId);
                targetSnapshotReady = true;
            }
            const attacker = attackerSnapshot;
            const target = targetSnapshot;
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
        const distCheckX = (beam.endX || 0) - (beam.startX || 0);
        const distCheckY = (beam.endY || 0) - (beam.startY || 0);
        const distCheck = Math.sqrt(distCheckX * distCheckX + distCheckY * distCheckY);
        if (distCheck > 1500) {
            continue;
        }
        const isSabBeam = beam.spriteId === 4;
        if (isSabBeam && beam.targetId) {
            if (!targetSnapshotReady) {
                targetSnapshot = snapshotEntityById(beam.targetId);
                targetSnapshotReady = true;
            }
            const target = targetSnapshot;
            if (target) {
                const baseX = target.x;
                const baseY = target.y;
                beam.startX = hasOffset ? baseX + beam.offsetX : baseX;
                beam.startY = hasOffset ? baseY + beam.offsetY : baseY;
            }
        }
        if (isSabBeam && beam.attackerId) {
            if (!attackerSnapshotReady) {
                attackerSnapshot = snapshotEntityById(beam.attackerId);
                attackerSnapshotReady = true;
            }
            const attacker = attackerSnapshot;
            if (attacker) {
                const baseX = attacker.x;
                const baseY = attacker.y;
                beam.endX = hasEndOffset || hasOffset ? baseX + endOffsetX : baseX;
                beam.endY = hasEndOffset || hasOffset ? baseY + endOffsetY : baseY;
            }
        }
        const spriteData = getLaserSpriteFrame(beam.spriteId, beam.skilledLaser);
        const sprite = getLaserSpriteSource(spriteData);
        const width = spriteData?.width || sprite?.width || sprite?.naturalWidth || 0;
        const height = spriteData?.height || sprite?.height || sprite?.naturalHeight || 0;
        if (!isLaserSpriteFrameReady(spriteData) || width <= 0 || height <= 0) continue;
        const progress = Math.min(1, (now - beam.createdAt) / beam.duration);
        ctx.save();
        if (beam.playLoop) {
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
            ctx.rotate(Math.atan2(dy, dx) - Math.PI / 2);
            ctx.beginPath();
            ctx.rect(-dist, 0, dist * 2, dist);
            ctx.clip();
            const densityFactor = 5;
            const step = height * densityFactor;
            const scrollSpeed = beam.spriteId === 4 ? 400 : 1500;
            const scrollOffset = now % scrollSpeed / scrollSpeed * step;
            const count = Math.ceil(dist / step) + 1;
            for (let i = -1; i < count; i++) {
                const direction = 1;
                const currentY = i * step + scrollOffset * direction;
                if (currentY > -height && currentY < dist + height) {
                    const ratio = Math.max(0, Math.min(1, currentY / dist));
                    const currentScale = .4 + .9 * ratio;
                    const w = width * currentScale;
                    const h = height * currentScale;
                    drawLaserSpriteFrame(spriteData, -w / 2, currentY - h / 2, w, h);
                }
            }
        } else {
            const posX = beam.startX + (beam.endX - beam.startX) * progress;
            const posY = beam.startY + (beam.endY - beam.startY) * progress;
            ctx.translate(mapToScreenX(posX), mapToScreenY(posY));
            let rot;
            if (beam.rotation != null) {
                rot = beam.rotation;
            } else {
                const dx = beam.endX - beam.startX;
                const dy = beam.endY - beam.startY;
                rot = Math.atan2(dy, dx);
            }
            const sabNonFatFlip = beam.spriteId === 4 && !beam.skilledLaser;
            const effectiveFlipX = !!((beam.flipX ? 1 : 0) ^ (sabNonFatFlip ? 1 : 0));
            ctx.rotate(rot);
            const scale = beam.absorber ? 1 + (beam.endScale - 1) * progress : 1;
            const scaleX = (effectiveFlipX ? -1 : 1) * scale;
            ctx.scale(scaleX, scale);
            const drawX = effectiveFlipX ? -width : 0;
            drawLaserSpriteFrame(spriteData, drawX, -height / 2, width, height);
        }
        ctx.restore();
    }
    drawEnergyLeechLaserEchoBeams(now);
}

function easeOutQuad(t) {
    const clamped = Math.max(0, Math.min(1, t));
    return 1 - (1 - clamped) * (1 - clamped);
}

const ROCKET_SMOKE_OFFSET = 22;
const ROCKET_SMOKE_PARTICLE_POOL_LIMIT = 512;
const rocketSmokeParticlePool = [];
const ROCKET_LAUNCHER_DURATION_MIN_MS = 750;
const ROCKET_LAUNCHER_DURATION_MAX_MS = 2000;
const ROCKET_LAUNCHER_TRACKING_GAP = 800;
const ROCKET_LAUNCHER_IMPACT_SPREAD = 40;

function spawnRocketLauncherAirstrike(attackerId, targetId, rocketId, count, missFlag = false) {
    const launcherCount = Math.max(1, Math.min(12, parseInt(count, 10) || 0));
    const attackerSnap = snapshotEntityById(attackerId);
    const targetSnap = snapshotEntityById(targetId);
    if (!attackerSnap || !targetSnap) return;
    const createdAt = performance.now();
    let maxDuration = 0;
    for (let idx = 0; idx < launcherCount; idx++) {
        const duration = ROCKET_LAUNCHER_DURATION_MIN_MS + Math.random() * (ROCKET_LAUNCHER_DURATION_MAX_MS - ROCKET_LAUNCHER_DURATION_MIN_MS);
        if (duration > maxDuration) maxDuration = duration;
        rocketAttacks.push({
            attackerId: attackerId,
            targetId: targetId,
            rocketId: Number(rocketId) || 0,
            patternId: Number(rocketId) || 0,
            heavy: true,
            auto: false,
            angle: computeShieldImpactAngle(attackerId, targetId),
            createdAt: createdAt,
            duration: duration,
            airstrike: true,
            originX: attackerSnap.x,
            originY: attackerSnap.y,
            targetLastX: targetSnap.x,
            targetLastY: targetSnap.y,
            targetVisualLifeId: targetSnap.visualLifeId != null ? targetSnap.visualLifeId : (typeof getEntityVisualLifeId === "function" ? getEntityVisualLifeId(targetId) : null),
            attackerVisualLifeId: attackerSnap.visualLifeId != null ? attackerSnap.visualLifeId : (typeof getEntityVisualLifeId === "function" ? getEntityVisualLifeId(attackerId) : null),
            initialTargetGapX: (Math.random() * 2 - 1) * ROCKET_LAUNCHER_TRACKING_GAP,
            initialTargetGapY: (Math.random() * 2 - 1) * ROCKET_LAUNCHER_TRACKING_GAP,
            impactOffsetX: (Math.random() * 2 - 1) * ROCKET_LAUNCHER_IMPACT_SPREAD,
            impactOffsetY: (Math.random() * 2 - 1) * ROCKET_LAUNCHER_IMPACT_SPREAD
        });
    }
    if (rocketAttacks.length > 160) {
        rocketAttacks.splice(0, rocketAttacks.length - 160);
    }
    if (missFlag) {
        queueRocketLauncherMissDisplay(targetId, maxDuration, createdAt, targetSnap);
    }
}


function getRocketSmokeDefinition(rocketId, airstrike = false) {
    if (!ROCKET_SMOKE_DEFS) return null;
    let key = null;
    if (airstrike) {
        key = 0;
    } else if (typeof resolveRocketSmokeKey === "function") {
        key = resolveRocketSmokeKey(rocketId);
    }
    const def = key != null ? ROCKET_SMOKE_DEFS[key] : null;
    if (!def) return null;
    return {
        key: key,
        def: def
    };
}

function resolveRocketSmokeDefinitionForBeam(beam) {
    const airstrike = !!beam.airstrike;
    const cached = beam._rocketSmokeDefInfo;
    if (cached && cached.rocketId === beam.rocketId && cached.airstrike === airstrike) {
        return cached.def ? cached : null;
    }
    const defInfo = getRocketSmokeDefinition(beam.rocketId, airstrike);
    if (!defInfo) {
        beam._rocketSmokeDefInfo = null;
        return null;
    }
    const nextInfo = cached || {};
    nextInfo.rocketId = beam.rocketId;
    nextInfo.airstrike = airstrike;
    nextInfo.key = defInfo.key;
    nextInfo.def = defInfo.def;
    beam._rocketSmokeDefInfo = nextInfo;
    return nextInfo;
}

function recycleRocketSmokeParticle(particle) {
    if (!particle || rocketSmokeParticlePool.length >= ROCKET_SMOKE_PARTICLE_POOL_LIMIT) return;
    particle.key = null;
    particle.x = 0;
    particle.y = 0;
    particle.angle = 0;
    particle.createdAt = 0;
    rocketSmokeParticlePool.push(particle);
}

function spawnRocketSmokeParticle(smokeKey, x, y, angle, now) {
    if (smokeKey == null || x == null || y == null) return;
    const particle = rocketSmokeParticlePool.pop() || {};
    particle.key = smokeKey;
    particle.x = x;
    particle.y = y;
    particle.angle = angle;
    particle.createdAt = now || performance.now();
    rocketSmokeParticles.push(particle);
}

function drawRocketSmokeParticles(now) {
    if (!rocketSmokeParticles.length || !ROCKET_SMOKE_DEFS) return;
    const time = now || performance.now();
    let keepStart = rocketSmokeParticles.length;
    for (let i = rocketSmokeParticles.length - 1; i >= 0; i--) {
        const p = rocketSmokeParticles[i];
        const def = p ? ROCKET_SMOKE_DEFS[p.key] : null;
        if (!p || !def) {
            recycleRocketSmokeParticle(p);
            continue;
        }
        const fps = def.fps || ROCKET_SMOKE_FPS || 25;
        const frameCount = def.frames?.length || def.frameCount || 1;
        const totalDuration = def.duration || frameCount * (1e3 / fps);
        const frameDuration = totalDuration / Math.max(1, frameCount);
        const age = time - p.createdAt;
        const frame = Math.floor(age / frameDuration);
        if (frame < 0 || frame >= frameCount) {
            recycleRocketSmokeParticle(p);
            continue;
        }
        const img = getRocketSmokeSpriteFrame(p.key, frame);
        if (!img || !img.complete || img.width <= 0 || img.height <= 0) {
            rocketSmokeParticles[--keepStart] = p;
            continue;
        }
        ctx.save();
        ctx.translate(mapToScreenX(p.x), mapToScreenY(p.y));
        ctx.rotate(p.angle || 0);
        ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
        ctx.restore();
        rocketSmokeParticles[--keepStart] = p;
    }
    if (keepStart > 0) {
        const keepCount = rocketSmokeParticles.length - keepStart;
        for (let i = 0; i < keepCount; i++) {
            rocketSmokeParticles[i] = rocketSmokeParticles[keepStart + i];
        }
        rocketSmokeParticles.length = keepCount;
    }
}

function emitRocketSmoke(beam, projX, projY, travelAngle, spriteWidth, now) {
    const defInfo = resolveRocketSmokeDefinitionForBeam(beam);
    if (!defInfo) return;
    if (beam.smokeKey == null) beam.smokeKey = defInfo.key;
    const def = defInfo.def;
    const spawnInterval = def.spawnInterval || 45;
    const lastSpawn = beam.lastSmokeSpawn || 0;
    if (now - lastSpawn < spawnInterval) return;
    beam.lastSmokeSpawn = now;
    const offset = def.offset || (spriteWidth ? spriteWidth * .45 : ROCKET_SMOKE_OFFSET);
    const spawnX = projX - Math.cos(travelAngle) * offset;
    const spawnY = projY - Math.sin(travelAngle) * offset;
    spawnRocketSmokeParticle(defInfo.key, spawnX, spawnY, travelAngle + Math.PI, now);
}

function drawRocketAttacks() {
    const now = performance.now();
    drawRocketSmokeParticles(now);
    for (const beam of rocketAttacks) {
        const positions = getRocketWorldPositions(beam, now);
        if (!positions) continue;
        const {ax: ax, ay: ay, tx: tx, ty: ty, targetBaseX: targetBaseX, targetBaseY: targetBaseY, duration: duration} = positions;
        const elapsed = now - beam.createdAt;
        const linearProgress = Math.min(1, elapsed / duration);
        const progress = beam.airstrike ? linearProgress : easeOutQuad(linearProgress);
        if (linearProgress >= 1 && !beam.impactHandled) {
            const impactX = beam.airstrike ? targetBaseX + (Number(beam.impactOffsetX) || 0) : tx;
            const impactY = beam.airstrike ? targetBaseY + (Number(beam.impactOffsetY) || 0) : ty;
            spawnRocketDamageEffect(impactX, impactY, resolveRocketDamageType(beam.rocketId));
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
        drawLaserSpriteFrame(spriteData, -spriteWidth / 2, -spriteHeight / 2, spriteWidth, spriteHeight);
        ctx.restore();
    }
}

function drawSabShots() {
    if (!sabShots || sabShots.length === 0) return;
    const now = performance.now();
    const spriteData = getLaserSpriteFrame(4);
    const sprite = getLaserSpriteSource(spriteData);
    const spriteWidth = spriteData?.width || sprite?.width || sprite?.naturalWidth || 0;
    const spriteHeight = spriteData?.height || sprite?.height || sprite?.naturalHeight || 0;
    if (!isLaserSpriteFrameReady(spriteData) || spriteWidth <= 0 || spriteHeight <= 0) return;
    for (let i = sabShots.length - 1; i >= 0; i--) {
        const shot = sabShots[i];
        const SAB_SPEED_MULT = 2;
        const duration = (shot.duration || 1e3) / SAB_SPEED_MULT;
        const lifeProgress = Math.min(1, (now - shot.createdAt) / duration);
        const followTargets = shot.followTargets !== false;
        const targetSnap = followTargets ? snapshotEntityById(shot.targetId) : null;
        const attackerSnap = followTargets ? snapshotEntityById(shot.attackerId) : null;
        if (targetSnap) {
            shot.startX = targetSnap.x;
            shot.startY = targetSnap.y;
        }
        if (attackerSnap) {
            shot.endX = attackerSnap.x;
            shot.endY = attackerSnap.y;
        }
        const startWorldX = shot.startX ?? 0;
        const startWorldY = shot.startY ?? 0;
        const endWorldX = shot.endX ?? 0;
        const endWorldY = shot.endY ?? 0;
        const currentWorldX = startWorldX + (endWorldX - startWorldX) * lifeProgress;
        const currentWorldY = startWorldY + (endWorldY - startWorldY) * lifeProgress;
        const scale = (shot.startScale ?? 1) + ((shot.endScale ?? .1) - (shot.startScale ?? 1)) * lifeProgress;
        ctx.save();
        ctx.translate(mapToScreenX(currentWorldX), mapToScreenY(currentWorldY));
        ctx.scale(scale, scale);
        drawLaserSpriteFrame(spriteData, -spriteWidth / 2, -spriteHeight / 2, spriteWidth, spriteHeight);
        ctx.restore();
    }
}

const __entitySnapshotFrameCache = new Map();
let __entitySnapshotFrameCacheActive = false;

function clearEntitySnapshotFrameCache() {
    __entitySnapshotFrameCache.clear();
}

function beginEntitySnapshotFrame() {
    clearEntitySnapshotFrameCache();
    __entitySnapshotFrameCacheActive = true;
}

function endEntitySnapshotFrame() {
    __entitySnapshotFrameCacheActive = false;
    clearEntitySnapshotFrameCache();
}

function buildEntitySnapshotById(id) {
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
            maxShield: heroMaxShield,
            visualLifeId: -1
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
            maxShield: ent.maxShield,
            visualLifeId: typeof ensureEntityVisualLife === "function" ? ensureEntityVisualLife(ent) : ent.visualLifeId
        };
    }
    return null;
}

function snapshotEntityById(id) {
    if (!__entitySnapshotFrameCacheActive) return buildEntitySnapshotById(id);
    const cacheKey = String(id);
    if (__entitySnapshotFrameCache.has(cacheKey)) {
        return __entitySnapshotFrameCache.get(cacheKey);
    }
    const snapshot = buildEntitySnapshotById(id);
    if (snapshot) {
        __entitySnapshotFrameCache.set(cacheKey, snapshot);
    }
    return snapshot;
}

function computeShieldImpactRadius(targetSnap) {
    let shipRadius = 40;
    if (targetSnap && targetSnap.shipId && SHIP_SPRITE_DEFS[targetSnap.shipId]) {
        const def = SHIP_SPRITE_DEFS[targetSnap.shipId];
        let frameIndex = 0;
        if (def && typeof targetSnap.angle === "number" && def.frameCount > 1 && typeof getDirectionFrameIndex === "function") {
            frameIndex = getDirectionFrameIndex(targetSnap.angle, def.frameCount);
        }
        if (typeof getShipVisualRadiusCached === "function") {
            const r = getShipVisualRadiusCached(targetSnap.shipId, frameIndex);
            if (typeof r === "number" && r > 0) shipRadius = r;
        }
        if (!shipRadius || shipRadius <= 0) {
            const img = getShipSpriteFrame(targetSnap.shipId, frameIndex);
            if (img && img.complete && img.width > 0 && img.height > 0) {
                shipRadius = Math.max(img.width, img.height) / 2;
            }
        }
    }
    return shipRadius + 10;
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

function normalizeShieldImpactVisualAngle(angle) {
    if (!Number.isFinite(angle)) return null;
    let normalized = angle + Math.PI;
    const tau = Math.PI * 2;
    normalized %= tau;
    if (normalized < -Math.PI) normalized += tau;
    if (normalized > Math.PI) normalized -= tau;
    return normalized;
}

function getRecentBeamAngleForTarget(targetId) {
    for (let i = laserBeams.length - 1; i >= 0; i--) {
        const beam = laserBeams[i];
        if (beam.targetId === targetId && beam.angle != null) return beam.angle;
    }
    return null;
}

const DAMAGE_BUBBLE_FLASH_CLEARANCE_PX = 30;

function updateDamageBubbles(now) {
    let keepCount = 0;
    for (let i = 0; i < damageBubbles.length; i++) {
        const b = damageBubbles[i];
        if (b && now - b.createdAt <= DAMAGE_BUBBLE_DURATION) {
            damageBubbles[keepCount++] = b;
        }
    }
    damageBubbles.length = keepCount;
}

function resolveDamageBubblePosition(b, out = null) {
    const position = out || {
        x: 0,
        y: 0,
        shipId: null,
        isHero: false
    };
    if (b.entityId === heroId) {
        position.x = shipX;
        position.y = shipY;
        position.shipId = heroShipId;
        position.isHero = true;
        return position;
    }
    const ent = entities[b.entityId];
    if (ent) {
        const liveVisualLifeId = typeof ensureEntityVisualLife === "function" ? ensureEntityVisualLife(ent) : ent.visualLifeId;
        if (b.visualLifeId == null || liveVisualLifeId === b.visualLifeId) {
            b.snapshotX = ent.x;
            b.snapshotY = ent.y;
            b.snapshotShipId = ent.shipId ?? ent.type ?? null;
            position.x = ent.x;
            position.y = ent.y;
            position.shipId = ent.shipId ?? ent.type ?? null;
            position.isHero = false;
            return position;
        }
    }
    if (Number.isFinite(b.snapshotX) && Number.isFinite(b.snapshotY)) {
        position.x = b.snapshotX;
        position.y = b.snapshotY;
        position.shipId = b.snapshotShipId ?? null;
        position.isHero = false;
        return position;
    }
    const removedSnapshot = typeof getRemovedEntitySnapshot === "function" ? getRemovedEntitySnapshot(b.entityId) : null;
    if (removedSnapshot && Number.isFinite(removedSnapshot.x) && Number.isFinite(removedSnapshot.y)) {
        position.x = removedSnapshot.x;
        position.y = removedSnapshot.y;
        position.shipId = removedSnapshot.shipId ?? removedSnapshot.type ?? null;
        position.isHero = false;
        return position;
    }
    return null;
}

function computeDamageBubbleScreenLift(position) {
    const viewportScale = typeof getWorldViewportScale === "function" ? getWorldViewportScale() : 1;
    const entityScale = typeof getEntityDrawScale === "function" ? getEntityDrawScale() : 1;
    const shipIdRaw = position && position.shipId != null ? position.shipId : null;
    const shipId = Number.isFinite(shipIdRaw) ? shipIdRaw : parseInt(shipIdRaw || "", 10);
    let visualHeight = 0;
    if (Number.isFinite(shipId) && shipId > 0 && typeof getShipReferenceVisualHeight === "function") {
        const referenceHeight = getShipReferenceVisualHeight(shipId);
        if (Number.isFinite(referenceHeight) && referenceHeight > 0) {
            visualHeight = referenceHeight * entityScale;
        }
    }
    if (visualHeight <= 0 && Number.isFinite(shipId) && shipId > 0 && typeof getShipSpriteFrame === "function") {
        const frame = getShipSpriteFrame(shipId, 0);
        if (frame && frame.complete && frame.height > 0) {
            visualHeight = frame.height * entityScale;
        }
    }
    if (visualHeight <= 0) {
        visualHeight = 28;
    }
    let energyOffset = 0;
    if (Number.isFinite(shipId) && shipId > 0 && typeof getShipEnergyYOffset === "function") {
        const xmlOffset = getShipEnergyYOffset(shipId);
        if (Number.isFinite(xmlOffset)) {
            energyOffset = xmlOffset * entityScale;
        }
    }
    const safeVisualHeight = Math.max(18, visualHeight);
    return (safeVisualHeight / 2 + energyOffset + DAMAGE_BUBBLE_FLASH_CLEARANCE_PX) * viewportScale;
}

function resolveDamageBubbleScreenPosition(b, out = null) {
    const worldPosition = resolveDamageBubbleScreenPosition._worldPosition || (resolveDamageBubbleScreenPosition._worldPosition = {
        x: 0,
        y: 0,
        shipId: null,
        isHero: false
    });
    const position = resolveDamageBubblePosition(b, worldPosition);
    if (!position) return null;
    const bubbleScreenX = typeof mapToViewportScreenX === "function" ? mapToViewportScreenX(position.x) : mapToScreenX(position.x);
    const bubbleScreenY = (typeof mapToViewportScreenY === "function" ? mapToViewportScreenY(position.y) : mapToScreenY(position.y)) - computeDamageBubbleScreenLift(position);
    const screenPosition = out || {
        x: 0,
        y: 0
    };
    screenPosition.x = bubbleScreenX;
    screenPosition.y = bubbleScreenY;
    return screenPosition;
}

function drawDamageBubbles() {
    const now = performance.now();
    const screenPosition = drawDamageBubbles._screenPosition || (drawDamageBubbles._screenPosition = {
        x: 0,
        y: 0
    });
    for (const b of damageBubbles) {
        const pos = resolveDamageBubbleScreenPosition(b, screenPosition);
        if (!pos) continue;
        const bubbleScreenX = pos.x;
        const bubbleScreenY = pos.y;
        const elapsed = now - b.createdAt;
        const moveProgress = Math.min(1, elapsed / 1e3);
        const offsetY = -100 * moveProgress;
        const scale = 1 + 2 * moveProgress;
        const alpha = elapsed < 500 ? 1 : Math.max(0, 1 - (elapsed - 500) / 1e3);
        let cid = b.colorId !== undefined && b.colorId !== null ? b.colorId : b.isHeal ? 2 : 0;
        if (cid === 0 && b.entityId === heroId) {
            cid = 1;
        }
        const fallback = {
            0: "#ff0000",
            1: "#db63e2",
            2: "#49BE40",
            3: "#0066CC"
        };
        const hitpointColors = typeof HITPOINT_COLOR_PATTERNS !== "undefined" && HITPOINT_COLOR_PATTERNS ? HITPOINT_COLOR_PATTERNS : {};
        const color = hitpointColors[cid] || fallback[cid] || fallback[0];
        const plus = b.showPlus !== undefined && b.showPlus !== null ? b.showPlus : b.isHeal;
        const text = (plus ? "+" : "") + String(b.value);
        ctx.save();
        ctx.globalAlpha = alpha;
        const stackOffsetY = Number.isFinite(b.stackOffsetY) ? b.stackOffsetY : 0;
        ctx.translate(bubbleScreenX, bubbleScreenY + offsetY - stackOffsetY);
        ctx.scale(scale, scale);
        ctx.font = "bold 12px Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(0,0,0,0.85)";
        ctx.strokeText(text, 0, 0);
        ctx.fillStyle = color;
        ctx.fillText(text, 0, 0);
        ctx.restore();
    }
}

function stopHeroShieldTwinkle() {
    try {
        if (heroShieldTwinkleTimeoutId != null) {
            clearTimeout(heroShieldTwinkleTimeoutId);
            heroShieldTwinkleTimeoutId = null;
        }
    } catch (_) {
        heroShieldTwinkleTimeoutId = null;
    }
}

function updateHeroShieldTwinkle() {
    stopHeroShieldTwinkle();
    if (!heroShowSkinShieldRandomly) return;
    if (heroShield == null || heroShield <= 0) return;
    showHeroShieldTwinkle(0);
}

function showHeroShieldTwinkle(param) {
    try {
        if (window.AudioManager && typeof window.AudioManager.playSoundEffect === "function") {
            window.AudioManager.playSoundEffect(37, false, false, -1, -1, true);
        }
    } catch (_) {}
    try {
        if (typeof shieldTwinkles !== "undefined" && Array.isArray(shieldTwinkles)) {
            shieldTwinkles.push({
                createdAt: performance.now(),
                sprite: "twinkle0",
                param: param | 0,
                fadeInMs: 250,
                holdMs: 1e3,
                fadeOutMs: 250,
                lifeMs: 1500
            });
        }
    } catch (_) {}
    try {
        setTimeout(function() {
            if (heroShield == null || heroShield <= 0) {
                heroShowSkinShieldRandomly = false;
            }
            stopHeroShieldTwinkle();
            if (heroId != null && heroShowSkinShieldRandomly) {
                let minT = parseInt(heroMinSkinShieldTwinkle, 10);
                let maxT = parseInt(heroMaxSkinShieldTwinkle, 10);
                if (!Number.isFinite(minT)) minT = 0;
                if (!Number.isFinite(maxT)) maxT = minT;
                if (maxT < minT) maxT = minT;
                const delaySec = minT + Math.floor(Math.random() * (maxT - minT + 1));
                heroShieldTwinkleTimeoutId = setTimeout(function() {
                    if (heroShowSkinShieldRandomly && heroShield != null && heroShield > 0) {
                        showHeroShieldTwinkle(0);
                    }
                }, Math.max(0, delaySec) * 1e3);
            }
        }, 1500);
    } catch (_) {}
}

function updateShieldTwinkles(now) {
    if (typeof shieldTwinkles === "undefined" || !Array.isArray(shieldTwinkles)) return;
    let keepCount = 0;
    for (let i = 0; i < shieldTwinkles.length; i++) {
        const tw = shieldTwinkles[i];
        const lifeMs = tw.lifeMs || 1500;
        if (now - tw.createdAt <= lifeMs) {
            shieldTwinkles[keepCount++] = tw;
        }
    }
    shieldTwinkles.length = keepCount;
}

function drawShieldTwinkles() {
    if (typeof shieldTwinkles === "undefined" || !Array.isArray(shieldTwinkles) || shieldTwinkles.length === 0) return;
    if (typeof ctx === "undefined") return;
    const now = performance.now();
    const entityScale = typeof getEntityDrawScale === "function" ? getEntityDrawScale() : 1;
    const shipScreenX = mapToScreenX(shipX);
    const syBase = mapToScreenY(shipY);
    const bobOffset = typeof getHeroIdleOffset === "function" ? getHeroIdleOffset() : 0;
    const sy = syBase + bobOffset;
    let shiftX = 0;
    let shiftY = 0;
    let shipW = 20 * entityScale;
    let shipH = 20 * entityScale;
    try {
        const shipId = heroShipId;
        const sdef = typeof SHIP_SPRITE_DEFS !== "undefined" ? SHIP_SPRITE_DEFS[shipId] : null;
        if (sdef) {
            const frameIndex = typeof getDirectionFrameIndex === "function" ? getDirectionFrameIndex(heroAngle, sdef.frameCount) : 0;
            const img = typeof getShipSpriteFrame === "function" ? getShipSpriteFrame(shipId, frameIndex) : null;
            if (img && img.complete && img.width > 0 && img.height > 0) {
                shipW = img.width * entityScale;
                shipH = img.height * entityScale;
                if (typeof getVisualShiftFromCenter === "function") {
                    const shift = getVisualShiftFromCenter(img);
                    shiftX = (shift.x || 0) * entityScale;
                    shiftY = (shift.y || 0) * entityScale;
                }
            }
            if (shipId === 56 || shipId === 58 || shipId === 59) {
                shiftX = 0;
                shiftY = 0;
            }
        }
    } catch (_) {}
    const centerX = shipScreenX - shiftX;
    const centerY = sy - shiftY;
    const shipRadius = Math.max(shipW, shipH) / 2;
    const scaleFactor = shipRadius / 65;
    const drawOptions = drawShieldTwinkles._drawOptions || (drawShieldTwinkles._drawOptions = {
        drawWidth: 0,
        drawHeight: 0,
        alpha: 1
    });
    for (const tw of shieldTwinkles) {
        const fadeInMs = tw.fadeInMs || 250;
        const holdMs = tw.holdMs || 1e3;
        const fadeOutMs = tw.fadeOutMs || 250;
        const lifeMs = tw.lifeMs || fadeInMs + holdMs + fadeOutMs;
        const age = now - tw.createdAt;
        if (age < 0 || age > lifeMs) continue;
        let alpha = 1;
        if (age < fadeInMs) alpha = age / fadeInMs; else if (age < fadeInMs + holdMs) alpha = 1; else alpha = 1 - Math.min(1, (age - (fadeInMs + holdMs)) / fadeOutMs);
        const spriteKey = tw.sprite || "twinkle0";
        const def = typeof SHIELD_SPRITE_DEFS !== "undefined" ? SHIELD_SPRITE_DEFS[spriteKey] : null;
        if (!def) continue;
        const fps = def.fps || 15;
        const frameIndex = Math.floor(age / 1e3 * fps);
        const frame = def.loop ? frameIndex % def.frameCount : Math.min(def.frameCount - 1, frameIndex);
        const frameDef = typeof getShieldSpriteFrame === "function" ? getShieldSpriteFrame(spriteKey, frame) : null;
        if (!frameDef || frameDef.pendingAtlas) continue;
        const sourceWidth = frameDef.width || frameDef.sw || (frameDef.img || frameDef).width || 0;
        const sourceHeight = frameDef.height || frameDef.sh || (frameDef.img || frameDef).height || 0;
        if (sourceWidth <= 0 || sourceHeight <= 0) continue;
        const w = sourceWidth * scaleFactor;
        const h = sourceHeight * scaleFactor;
        drawOptions.drawWidth = w;
        drawOptions.drawHeight = h;
        drawOptions.alpha = alpha;
        drawFrameDefCentered(frameDef, centerX, centerY, drawOptions);
    }
}

function updateShieldBursts(now) {
    let keepCount = 0;
    for (let i = 0; i < shieldBursts.length; i++) {
        const sb = shieldBursts[i];
        const lifeMs = sb.lifeMs || 350;
        if (now - sb.createdAt > lifeMs) {
            if (sb.targetId !== undefined && sb.targetId !== null) {
                if (heroId !== null && sb.targetId === heroId) {
                    heroShieldDamageCount = Math.max(0, heroShieldDamageCount - 1);
                } else if (entities[sb.targetId]) {
                    const ent = entities[sb.targetId];
                    ent.shieldDamageCount = Math.max(0, ent.shieldDamageCount - 1);
                }
            }
            continue;
        }
        shieldBursts[keepCount++] = sb;
    }
    shieldBursts.length = keepCount;
}

function shouldSuppressImpactEffectForInvisibleTarget(targetId) {
    if (targetId === undefined || targetId === null) return false;
    if (heroId !== null && targetId === heroId) return false;
    const ent = entities[targetId];
    return !!(ent && ent.kind === "player" && ent.invisible);
}

function spawnShieldBurstAt(x, y, sprite = "hit", options = {}) {
    if (x == null || y == null) return;
    const def = SHIELD_SPRITE_DEFS[sprite];
    const lifeMs = def ? def.frameCount / (def.fps || SHIELD_ANIM_FPS) * 1e3 : 350;
    const targetId = options.targetId;
    if (shouldSuppressImpactEffectForInvisibleTarget(targetId)) return;
    if (targetId !== undefined && targetId !== null) {
        if (heroId !== null && targetId === heroId) {
            if (heroShieldDamageCount >= 9) return;
            heroShieldDamageCount++;
        } else if (entities[targetId]) {
            const ent = entities[targetId];
            if (ent.kind !== "player") return;
            if (!Number.isFinite(ent.shieldDamageCount)) ent.shieldDamageCount = 0;
            if (ent.shieldDamageCount >= 9) return;
            ent.shieldDamageCount++;
        } else {
            return;
        }
    }
    const angle = options.angle != null ? options.angle : 0;
    const radius = options.radius || 0;
    const createdAt = options.createdAt != null ? options.createdAt : performance.now();
    shieldBursts.push({
        x: x,
        y: y,
        sprite: sprite,
        createdAt: createdAt,
        angle: angle,
        radius: radius,
        lifeMs: lifeMs,
        targetId: targetId,
        followTarget: options.followTarget !== false
    });
}

function updateHullDamageEffects(now) {
    let keepCount = 0;
    for (let i = 0; i < hullDamageEffects.length; i++) {
        const eff = hullDamageEffects[i];
        if (eff && now - eff.createdAt <= eff.duration) {
            hullDamageEffects[keepCount++] = eff;
        }
    }
    hullDamageEffects.length = keepCount;
}

function resolveHullDamagePosition(eff, out = null) {
    const isHero = heroId !== null && eff.entityId === heroId;
    let targetSnap = isHero ? snapshotEntityById(heroId) : null;
    if (!isHero) {
        targetSnap = typeof resolveLiveEntitySnapshotForVisual === "function" ? resolveLiveEntitySnapshotForVisual(eff.entityId, eff.visualLifeId) : snapshotEntityById(eff.entityId);
    }
    const hasSnapshotFallback = !isHero && !targetSnap && Number.isFinite(eff.snapshotX) && Number.isFinite(eff.snapshotY);
    if (!isHero && !targetSnap && !hasSnapshotFallback) return null;
    const baseX = isHero ? shipX : targetSnap ? targetSnap.x : eff.snapshotX;
    const baseY = isHero ? shipY : targetSnap ? targetSnap.y : eff.snapshotY;
    const angle = targetSnap && typeof targetSnap.angle === "number" ? targetSnap.angle : Number.isFinite(eff.snapshotAngle) ? eff.snapshotAngle : 0;
    const offsetX = Math.cos(angle + eff.angleOffset) * eff.distance;
    const offsetY = Math.sin(angle + eff.angleOffset) * eff.distance;
    const position = out || {
        x: 0,
        y: 0
    };
    position.x = baseX + offsetX;
    position.y = baseY + offsetY;
    return position;
}

function drawHullDamageEffects() {
    const now = performance.now();
    const position = drawHullDamageEffects._position || (drawHullDamageEffects._position = {
        x: 0,
        y: 0
    });
    const drawOptions = drawHullDamageEffects._drawOptions || (drawHullDamageEffects._drawOptions = {
        rotation: 0
    });
    for (const eff of hullDamageEffects) {
        if (shouldSuppressImpactEffectForInvisibleTarget(eff.entityId)) continue;
        const def = LASER_DAMAGE_SPRITES[eff.type];
        if (!def) continue;
        const life = Math.min(1, Math.max(0, (now - eff.createdAt) / eff.duration));
        const frame = Math.min(def.frameCount - 1, Math.floor(def.frameCount * life));
        const frameDef = getLaserDamageFrame(eff.type, frame);
        if (!frameDef || frameDef.pendingAtlas) continue;
        const pos = resolveHullDamagePosition(eff, position);
        if (!pos) continue;
        const screenX = mapToScreenX(pos.x);
        const screenY = mapToScreenY(pos.y);
        drawOptions.rotation = eff.rotation;
        drawFrameDefCentered(frameDef, screenX, screenY, drawOptions);
    }
}

function spawnHullDamageEffect(targetId, typeId = null) {
    if (targetId == null) return;
    if (shouldSuppressImpactEffectForInvisibleTarget(targetId)) return;
    const effectType = typeId != null && LASER_DAMAGE_SPRITES[typeId] ? typeId : Math.floor(Math.random() * 3);
    const def = LASER_DAMAGE_SPRITES[effectType];
    if (!def) return;
    const isHero = heroId !== null && targetId === heroId;
    const targetSnap = isHero ? snapshotEntityById(heroId) : snapshotEntityById(targetId);
    if (!isHero && (!targetSnap || targetSnap.kind !== "player" && targetSnap.kind !== "npc")) return;
    const duration = def.frameCount / (def.fps || LASER_DAMAGE_ANIM_FPS) * 1e3;
    const angleOffset = Math.random() * Math.PI * 2;
    const distance = Math.random() * computeHullImpactRadius(targetSnap);
    const rotation = Math.random() * Math.PI * 2;
    let writeIndex = 0;
    for (let i = 0; i < hullDamageEffects.length; i++) {
        const effect = hullDamageEffects[i];
        if (effect.entityId !== targetId) {
            hullDamageEffects[writeIndex++] = effect;
        }
    }
    hullDamageEffects.length = writeIndex;
    hullDamageEffects.push({
        entityId: targetId,
        visualLifeId: targetSnap && targetSnap.visualLifeId != null ? targetSnap.visualLifeId : null,
        snapshotX: targetSnap && Number.isFinite(targetSnap.x) ? targetSnap.x : null,
        snapshotY: targetSnap && Number.isFinite(targetSnap.y) ? targetSnap.y : null,
        snapshotShipId: targetSnap ? targetSnap.shipId ?? targetSnap.type ?? null : null,
        snapshotAngle: targetSnap && Number.isFinite(targetSnap.angle) ? targetSnap.angle : 0,
        type: effectType,
        createdAt: performance.now(),
        duration: duration,
        angleOffset: angleOffset,
        distance: distance,
        rotation: rotation
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
    try {
        if (window.AudioManager && typeof window.AudioManager.playPyro === "function") {
            window.AudioManager.playPyro(3, typeId, x, y);
        }
    } catch (_) {}
    const def = ROCKET_DAMAGE_SPRITES[typeId] || ROCKET_DAMAGE_SPRITES[1];
    if (!def) return;
    const fps = def.fps || ROCKET_DAMAGE_ANIM_FPS || 25;
    const duration = def.frameCount / fps * 1e3;
    rocketDamageEffects.push({
        x: x,
        y: y,
        type: typeId,
        createdAt: performance.now(),
        duration: duration
    });
}

function updateRocketDamageEffects(now) {
    let keepCount = 0;
    for (let i = 0; i < rocketDamageEffects.length; i++) {
        const fx = rocketDamageEffects[i];
        if (fx && now - fx.createdAt <= fx.duration) {
            rocketDamageEffects[keepCount++] = fx;
        }
    }
    rocketDamageEffects.length = keepCount;
}

function drawRocketDamageEffects() {
    if (rocketDamageEffects.length === 0) return;
    const now = performance.now();
    for (const fx of rocketDamageEffects) {
        const def = ROCKET_DAMAGE_SPRITES[fx.type] || ROCKET_DAMAGE_SPRITES[1];
        if (!def) continue;
        const fps = def.fps || ROCKET_DAMAGE_ANIM_FPS || 25;
        const frameDuration = 1e3 / fps;
        const frame = Math.floor((now - fx.createdAt) / frameDuration);
        if (frame < 0 || frame >= def.frameCount) continue;
        const frameDef = getRocketDamageFrame(fx.type, frame);
        if (!frameDef || frameDef.pendingAtlas) continue;
        const sx = mapToScreenX(fx.x);
        const sy = mapToScreenY(fx.y);
        drawFrameDefCentered(frameDef, sx, sy);
    }
}

function updateShieldEffects(now) {
    if (heroIshActive && heroIshUntil && now >= heroIshUntil) {
        setHeroShieldEffect("ISH", false, 0);
    }
    if (heroInvincible && heroInvUntil && now >= heroInvUntil) {
        setHeroShieldEffect("INVINCIBILITY", false, 0);
    }
    if (typeof activeShieldEffectEntityIds === "undefined" || activeShieldEffectEntityIds.size === 0) return;
    for (const id of activeShieldEffectEntityIds) {
        const e = entities[id];
        if (!e || e.kind !== "player") {
            activeShieldEffectEntityIds.delete(id);
            continue;
        }
        if (e.ishActive && e.ishUntil && now >= e.ishUntil) {
            setEntityShieldEffect(e, "ISH", false, 0);
        }
        if (e.invincible && e.invUntil && now >= e.invUntil) {
            setEntityShieldEffect(e, "INVINCIBILITY", false, 0);
        }
        if (!(e.ishActive && e.ishUntil) && !(e.invincible && e.invUntil)) {
            activeShieldEffectEntityIds.delete(id);
        }
    }
}

function spawnPortalJumpEffect(x, y) {
    if (x == null || y == null || !PORTAL_JUMP_ANIM) return;
    portalJumpEffects.push({
        x: x,
        y: y,
        startedAt: performance.now()
    });
}

function spawnSmartbombEffect(x, y, onHero = false) {
    if (x == null || y == null || !SMARTBOMB_ANIM) return;
    smartbombEffects.push({
        x: x,
        y: y,
        onHero: !!onHero,
        startedAt: performance.now(),
        rotation: Math.random() * Math.PI * 2
    });
}

function spawnEmpEffect(targetId, x = null, y = null) {
    if (!EMP_ANIM) return;
    empEffects.push({
        targetId: targetId,
        x: x,
        y: y,
        startedAt: performance.now()
    });
}

function updatePortalJumpEffects(now) {
    const totalDuration = (PORTAL_JUMP_ANIM.frameCount || 1) * (PORTAL_JUMP_ANIM.frameDuration || 40);
    let keepCount = 0;
    for (let i = 0; i < portalJumpEffects.length; i++) {
        const fx = portalJumpEffects[i];
        if (now - fx.startedAt < totalDuration) {
            portalJumpEffects[keepCount++] = fx;
        }
    }
    portalJumpEffects.length = keepCount;
}

function updateSmartbombEffects(now) {
    const totalDuration = (SMARTBOMB_ANIM.frameCount || 1) * (SMARTBOMB_ANIM.frameDuration || 20);
    let keepCount = 0;
    for (let i = 0; i < smartbombEffects.length; i++) {
        const fx = smartbombEffects[i];
        if (now - fx.startedAt < totalDuration) {
            smartbombEffects[keepCount++] = fx;
        }
    }
    smartbombEffects.length = keepCount;
}

function updateEmpEffects(now) {
    if (!EMP_ANIM) return;
    const totalDuration = Math.max(EMP_ANIM.ring.delay * Math.max(EMP_ANIM.ring.count - 1, 0) + EMP_ANIM.ring.duration, EMP_ANIM.blitz.duration);
    let keepCount = 0;
    for (let i = 0; i < empEffects.length; i++) {
        const fx = empEffects[i];
        if (now - fx.startedAt < totalDuration) {
            empEffects[keepCount++] = fx;
        }
    }
    empEffects.length = keepCount;
}

function drawFrameDefCentered(frameDef, centerX, centerY, options = null) {
    if (!frameDef || frameDef.pendingAtlas) return false;
    const drawOptions = options || drawFrameDefCentered._emptyOptions || (drawFrameDefCentered._emptyOptions = {});
    const source = frameDef.atlas || frameDef.img || frameDef;
    if (!source || !source.complete || source.width <= 0 || source.height <= 0) return false;
    const sourceWidth = frameDef.width || source.width;
    const sourceHeight = frameDef.height || source.height;
    if (sourceWidth <= 0 || sourceHeight <= 0) return false;
    const drawWidth = typeof drawOptions.drawWidth === "number" ? drawOptions.drawWidth : sourceWidth;
    const drawHeight = typeof drawOptions.drawHeight === "number" ? drawOptions.drawHeight : sourceHeight;
    const rotation = drawOptions.rotation || 0;
    ctx.save();
    if (drawOptions.composite) ctx.globalCompositeOperation = drawOptions.composite;
    if (typeof drawOptions.alpha === "number") {
        ctx.globalAlpha = Math.max(0, Math.min(1, drawOptions.alpha));
    }
    if (rotation) {
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation);
        if (frameDef.atlas) {
            ctx.drawImage(frameDef.atlas, frameDef.sx, frameDef.sy, frameDef.sw, frameDef.sh, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        } else {
            ctx.drawImage(source, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        }
    } else if (frameDef.atlas) {
        ctx.drawImage(frameDef.atlas, frameDef.sx, frameDef.sy, frameDef.sw, frameDef.sh, centerX - drawWidth / 2, centerY - drawHeight / 2, drawWidth, drawHeight);
    } else {
        ctx.drawImage(source, centerX - drawWidth / 2, centerY - drawHeight / 2, drawWidth, drawHeight);
    }
    ctx.restore();
    return true;
}

let criticalBootRuntimeVisualWarmupPromise = null;
let criticalBootRuntimeVisualWarmupStatus = {
    state: "idle",
    ready: false,
    reason: "",
    total: 0,
    completed: 0,
    warmed: 0,
    failed: 0,
    startedAt: 0,
    finishedAt: 0
};

function publishCriticalBootRuntimeVisualWarmupStatus(partial) {
    criticalBootRuntimeVisualWarmupStatus = Object.assign({}, criticalBootRuntimeVisualWarmupStatus, partial || {});
    if (typeof window !== "undefined") {
        const status = Object.assign({}, criticalBootRuntimeVisualWarmupStatus);
        window.__ANDRO_VISUAL_RUNTIME_WARMUP_STATUS = status;
        window.__ANDRO_VISUAL_RUNTIME_WARMUP_READY = !!status.ready;
        try {
            window.dispatchEvent(new CustomEvent("andromeda:visual-runtime-warmup-status", {
                detail: Object.assign({}, status)
            }));
        } catch (_) {}
    }
    return criticalBootRuntimeVisualWarmupStatus;
}

function waitNextVisualWarmupFrame() {
    return new Promise(resolve => {
        if (typeof requestAnimationFrame === "function") {
            requestAnimationFrame(() => resolve());
        } else {
            setTimeout(resolve, 0);
        }
    });
}

function buildRuntimeWarmupFrameSequence(frameCount, step) {
    const count = Math.max(0, Number(frameCount) || 0);
    const stride = Math.max(1, Number(step) || 1);
    const frames = [];
    for (let idx = 0; idx < count; idx += stride) {
        frames.push(idx);
    }
    if (count > 0) {
        frames.push(Math.floor(count / 2));
        frames.push(count - 1);
    }
    return Array.from(new Set(frames.filter(frame => Number.isFinite(frame) && frame >= 0 && frame < count))).sort((a, b) => a - b);
}

function getCriticalRuntimeWarmupContext() {
    try {
        const c = document.createElement("canvas");
        c.width = 1024;
        c.height = 1024;
        return c.getContext("2d", {
            alpha: true,
            willReadFrequently: false
        });
    } catch (_) {
        return null;
    }
}

function validateCriticalRuntimePreparedFrames() {
    const missing = [];
    if (typeof SMARTBOMB_ANIM !== "undefined" && SMARTBOMB_ANIM) {
        const frameCount = SMARTBOMB_ANIM.frameCount || 1;
        for (let frame = 0; frame < frameCount; frame++) {
            const frameDef = typeof getSmartbombFrame === "function" ? getSmartbombFrame(frame) : null;
            if (!frameDef || !frameDef.__andromedaPreparedSmartbombFrame) {
                missing.push("smartbomb:" + frame);
            }
        }
    }
    const instaDef = typeof SHIELD_SPRITE_DEFS === "object" && SHIELD_SPRITE_DEFS ? SHIELD_SPRITE_DEFS.insta : null;
    if (instaDef) {
        const frameCount = instaDef.frameCount || 1;
        for (let frame = 0; frame < frameCount; frame++) {
            const frameDef = typeof getShieldSpriteFrame === "function" ? getShieldSpriteFrame("insta", frame) : null;
            if (!frameDef || !frameDef.__andromedaPreparedShieldFrame) {
                missing.push("ish:" + frame);
            }
        }
    }
    const criticalExplosionTypes = typeof CRITICAL_PREPARED_EXPLOSION_TYPES !== "undefined" && Array.isArray(CRITICAL_PREPARED_EXPLOSION_TYPES) ? CRITICAL_PREPARED_EXPLOSION_TYPES : [];
    if (typeof EXPLOSION_ANIMATIONS === "object" && EXPLOSION_ANIMATIONS && criticalExplosionTypes.length > 0) {
        for (const explosionType of criticalExplosionTypes) {
            const anim = EXPLOSION_ANIMATIONS[explosionType];
            if (!anim) continue;
            const frameCount = anim.frameCount || 1;
            for (let frame = 0; frame < frameCount; frame++) {
                const frameDef = typeof getExplosionFrame === "function" ? getExplosionFrame(explosionType, frame) : null;
                if (!frameDef || !frameDef.__andromedaPreparedExplosionFrame || frameDef.__andromedaPreparedExplosionType !== explosionType) {
                    missing.push("explosion" + explosionType + ":" + frame);
                }
            }
        }
    }
    return {
        missingCount: missing.length,
        missingFrames: missing
    };
}

function warmFrameDefOnContext(warmCtx, frameDef, options = {}) {
    if (!warmCtx || !frameDef || frameDef.pendingAtlas) return false;
    const source = frameDef.atlas || frameDef.img || frameDef;
    if (!source) return false;
    if (typeof source.complete === "boolean" && !source.complete) return false;
    const sourceWidth = frameDef.width || frameDef.sw || source.width || source.naturalWidth || 0;
    const sourceHeight = frameDef.height || frameDef.sh || source.height || source.naturalHeight || 0;
    if (sourceWidth <= 0 || sourceHeight <= 0) return false;
    const drawWidth = Math.max(1, Math.round(options.drawWidth || sourceWidth));
    const drawHeight = Math.max(1, Math.round(options.drawHeight || sourceHeight));
    const x = Number.isFinite(options.x) ? options.x : 32;
    const y = Number.isFinite(options.y) ? options.y : 32;
    warmCtx.save();
    warmCtx.clearRect(0, 0, warmCtx.canvas.width, warmCtx.canvas.height);
    warmCtx.globalCompositeOperation = options.composite || "source-over";
    warmCtx.globalAlpha = typeof options.alpha === "number" ? Math.max(0, Math.min(1, options.alpha)) : 1;
    if (options.rotation) {
        warmCtx.translate(x + drawWidth / 2, y + drawHeight / 2);
        warmCtx.rotate(options.rotation);
        if (frameDef.atlas) {
            warmCtx.drawImage(frameDef.atlas, frameDef.sx, frameDef.sy, frameDef.sw, frameDef.sh, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        } else {
            warmCtx.drawImage(source, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        }
    } else if ((frameDef.preparedPortalFrame || frameDef.preparedPortalJumpFrame) && frameDef.img) {
        const trim = frameDef.trim;
        const preparedSource = frameDef.img;
        if (trim && trim.sw > 0 && trim.sh > 0) {
            const scaleX = drawWidth / (frameDef.sw || frameDef.width || 1);
            const scaleY = drawHeight / (frameDef.sh || frameDef.height || 1);
            warmCtx.drawImage(preparedSource, trim.sx || 0, trim.sy || 0, trim.sw, trim.sh, x + trim.x * scaleX, y + trim.y * scaleY, trim.sw * scaleX, trim.sh * scaleY);
        } else {
            warmCtx.drawImage(preparedSource, x, y, drawWidth, drawHeight);
        }
    } else if (frameDef.atlas) {
        const trim = frameDef.trim;
        if (trim && trim.sw > 0 && trim.sh > 0) {
            const scaleX = drawWidth / (frameDef.sw || frameDef.width || 1);
            const scaleY = drawHeight / (frameDef.sh || frameDef.height || 1);
            warmCtx.drawImage(frameDef.atlas, trim.sx, trim.sy, trim.sw, trim.sh, x + trim.x * scaleX, y + trim.y * scaleY, trim.sw * scaleX, trim.sh * scaleY);
        } else {
            warmCtx.drawImage(frameDef.atlas, frameDef.sx, frameDef.sy, frameDef.sw, frameDef.sh, x, y, drawWidth, drawHeight);
        }
    } else {
        warmCtx.drawImage(source, x, y, drawWidth, drawHeight);
    }
    warmCtx.restore();
    return true;
}


let portalRuntimeVisualWarmupPromise = null;
let portalRuntimeVisualWarmupStatus = {
    state: "idle",
    ready: false,
    reason: "",
    phase: "idle",
    total: 0,
    completed: 0,
    warmed: 0,
    failed: 0,
    startedAt: 0,
    finishedAt: 0
};

function publishPortalRuntimeVisualWarmupStatus(partial) {
    portalRuntimeVisualWarmupStatus = Object.assign({}, portalRuntimeVisualWarmupStatus, partial || {});
    if (typeof window !== "undefined") {
        window.__ANDRO_PORTAL_RUNTIME_WARMUP_STATUS = Object.assign({}, portalRuntimeVisualWarmupStatus);
        window.__ANDRO_PORTAL_RUNTIME_WARMUP_READY = !!portalRuntimeVisualWarmupStatus.ready;
        try {
            window.dispatchEvent(new CustomEvent("andromeda:portal-runtime-warmup-status", {
                detail: Object.assign({}, portalRuntimeVisualWarmupStatus)
            }));
        } catch (_) {}
    }
    return portalRuntimeVisualWarmupStatus;
}

function collectPortalRuntimeWarmupAtlasPaths() {
    const paths = [];
    const seen = new Set();
    const addPath = path => {
        if (!path || seen.has(path)) return;
        seen.add(path);
        paths.push(path);
    };
    if (typeof PORTAL_JUMP_ANIM !== "undefined" && PORTAL_JUMP_ANIM && PORTAL_JUMP_ANIM.atlasPath) {
        addPath(PORTAL_JUMP_ANIM.atlasPath);
    }
    if (typeof PORTAL_SPRITE_DEFS === "object" && PORTAL_SPRITE_DEFS) {
        Object.keys(PORTAL_SPRITE_DEFS).forEach(portalKey => {
            const portalDef = PORTAL_SPRITE_DEFS[portalKey];
            if (!portalDef) return;
            [ "idle", "active" ].forEach(animationName => {
                const animDef = portalDef[animationName];
                if (!animDef) return;
                if (animDef.atlasPath) addPath(animDef.atlasPath);
                if (Array.isArray(animDef.atlasParts)) {
                    animDef.atlasParts.forEach(part => {
                        if (part && part.atlasPath) addPath(part.atlasPath);
                    });
                }
            });
        });
    }
    return paths;
}

function getPortalRuntimeWarmupImage(path) {
    if (!path) return null;
    if (typeof PORTAL_JUMP_ANIM !== "undefined" && PORTAL_JUMP_ANIM && path === PORTAL_JUMP_ANIM.atlasPath) {
        return typeof getPortalJumpAtlasImage === "function" ? getPortalJumpAtlasImage() : null;
    }
    return typeof getPortalAtlasImage === "function" ? getPortalAtlasImage(path) : null;
}

function waitPortalRuntimeWarmupImageReady(img) {
    if (!img) return Promise.resolve(false);
    const decode = () => {
        if (typeof img.decode === "function") {
            return img.decode().then(() => true, () => !!(img.complete && img.width > 0 && img.height > 0));
        }
        return Promise.resolve(!!(img.complete && img.width > 0 && img.height > 0));
    };
    if (img.complete && img.width > 0 && img.height > 0) {
        return decode();
    }
    return new Promise(resolve => {
        let done = false;
        const finish = ok => {
            if (done) return;
            done = true;
            resolve(!!ok);
        };
        const onLoad = () => {
            cleanup();
            decode().then(finish, () => finish(!!(img.complete && img.width > 0 && img.height > 0)));
        };
        const onError = () => {
            cleanup();
            finish(false);
        };
        const cleanup = () => {
            try { img.removeEventListener("load", onLoad); } catch (_) {}
            try { img.removeEventListener("error", onError); } catch (_) {}
        };
        try { img.addEventListener("load", onLoad, { once: true }); } catch (_) {}
        try { img.addEventListener("error", onError, { once: true }); } catch (_) {}
        if (img.complete) onLoad();
    });
}

async function waitPortalRuntimeWarmupAtlases(reason, startedAt) {
    const atlasPaths = collectPortalRuntimeWarmupAtlasPaths();
    let loaded = 0;
    let failed = 0;
    publishPortalRuntimeVisualWarmupStatus({
        state: "loading",
        ready: false,
        reason: reason,
        phase: "atlases",
        total: atlasPaths.length,
        completed: 0,
        warmed: 0,
        failed: 0,
        startedAt: startedAt,
        finishedAt: 0
    });
    for (let i = 0; i < atlasPaths.length; i++) {
        const path = atlasPaths[i];
        try {
            const img = getPortalRuntimeWarmupImage(path);
            if (await waitPortalRuntimeWarmupImageReady(img)) loaded++; else failed++;
        } catch (_) {
            failed++;
        }
        publishPortalRuntimeVisualWarmupStatus({
            state: "loading",
            phase: "atlases",
            completed: i + 1,
            warmed: loaded,
            failed: failed
        });
        await waitNextVisualWarmupFrame();
    }
    return { total: atlasPaths.length, loaded: loaded, failed: failed };
}

function buildPortalRuntimeWarmupTasks(warmCtx) {
    const tasks = [];
    const addWarmTask = (label, frameFactory, options = {}) => {
        if (typeof frameFactory !== "function") return;
        const requirePreparedPortalFrame = !!options.requirePreparedPortalFrame;
        const requirePreparedPortalJumpFrame = !!options.requirePreparedPortalJumpFrame;
        const warmOptions = requirePreparedPortalFrame || requirePreparedPortalJumpFrame ? Object.assign({}, options) : options;
        if (requirePreparedPortalFrame) delete warmOptions.requirePreparedPortalFrame;
        if (requirePreparedPortalJumpFrame) delete warmOptions.requirePreparedPortalJumpFrame;
        tasks.push({
            label: label,
            run: () => {
                const frameDef = frameFactory();
                if (requirePreparedPortalFrame && (!frameDef || !frameDef.preparedPortalFrame)) return false;
                if (requirePreparedPortalJumpFrame && (!frameDef || !frameDef.preparedPortalJumpFrame)) return false;
                return warmFrameDefOnContext(warmCtx, frameDef, warmOptions);
            }
        });
    };
    if (typeof PORTAL_JUMP_ANIM !== "undefined" && PORTAL_JUMP_ANIM) {
        const jumpFrames = Math.max(0, Number(PORTAL_JUMP_ANIM.frameCount) || 0);
        for (let frame = 0; frame < jumpFrames; frame++) {
            const prepareJumpFrame = typeof preparePortalJumpFrame === "function";
            addWarmTask("portalJump:" + frame, () => prepareJumpFrame ? preparePortalJumpFrame(frame) : getPortalJumpFrame(frame), {
                composite: "lighter",
                requirePreparedPortalJumpFrame: prepareJumpFrame
            });
        }
    }
    if (typeof PORTAL_SPRITE_DEFS === "object" && PORTAL_SPRITE_DEFS) {
        Object.keys(PORTAL_SPRITE_DEFS).forEach(portalKey => {
            const portalDef = PORTAL_SPRITE_DEFS[portalKey];
            if (!portalDef) return;
            [ "idle", "active" ].forEach(animationName => {
                const animDef = portalDef[animationName];
                if (!animDef) return;
                const frameCount = Math.max(0, Number(animDef.frameCount) || 0);
                for (let frame = 0; frame < frameCount; frame++) {
                    const preparePortalFrame = typeof shouldPreparePortalSpriteFrame === "function" && shouldPreparePortalSpriteFrame(portalKey) && typeof preparePortalSpriteFrame === "function";
                    addWarmTask("portalGate:" + portalKey + ":" + animationName + ":" + frame, () => preparePortalFrame ? preparePortalSpriteFrame(portalKey, animationName, frame) : getPortalSpriteFrame(portalKey, animationName, frame), {
                        requirePreparedPortalFrame: preparePortalFrame
                    });
                }
            });
        });
    }
    return tasks;
}

async function warmPortalRuntimeVisualsBeforeStart(reason = "loader-before-start") {
    if (portalRuntimeVisualWarmupPromise) return portalRuntimeVisualWarmupPromise;
    portalRuntimeVisualWarmupPromise = (async () => {
        const warmCtx = getCriticalRuntimeWarmupContext();
        const startedAt = Date.now();
        if (!warmCtx) {
            return publishPortalRuntimeVisualWarmupStatus({
                state: "unavailable",
                ready: false,
                reason: reason,
                phase: "canvas",
                total: 0,
                completed: 0,
                warmed: 0,
                failed: 0,
                startedAt: startedAt,
                finishedAt: Date.now()
            });
        }
        const atlasResult = await waitPortalRuntimeWarmupAtlases(reason, startedAt);
        if (atlasResult.failed > 0) {
            return publishPortalRuntimeVisualWarmupStatus({
                state: "error",
                ready: false,
                reason: reason,
                phase: "atlases",
                total: atlasResult.total,
                completed: atlasResult.total,
                warmed: atlasResult.loaded,
                failed: atlasResult.failed,
                startedAt: startedAt,
                finishedAt: Date.now()
            });
        }

        const tasks = buildPortalRuntimeWarmupTasks(warmCtx);
        let warmed = 0;
        let failed = 0;
        let retryTasks = [];
        publishPortalRuntimeVisualWarmupStatus({
            state: "warming",
            ready: false,
            reason: reason,
            phase: "frames",
            total: tasks.length,
            completed: 0,
            warmed: 0,
            failed: 0,
            startedAt: startedAt,
            finishedAt: 0
        });
        const batchSize = 8;
        for (let idx = 0; idx < tasks.length; idx++) {
            try {
                if (tasks[idx].run()) warmed++; else retryTasks.push(tasks[idx]);
            } catch (_) {
                retryTasks.push(tasks[idx]);
            }
            failed = retryTasks.length;
            if ((idx + 1) % batchSize === 0 && idx + 1 < tasks.length) {
                publishPortalRuntimeVisualWarmupStatus({
                    state: "warming",
                    phase: "frames",
                    completed: idx + 1,
                    warmed: warmed,
                    failed: failed
                });
                await waitNextVisualWarmupFrame();
            }
        }

        const retryRounds = 8;
        const retryBatchSize = 6;
        for (let round = 0; round < retryRounds && retryTasks.length > 0; round++) {
            await waitNextVisualWarmupFrame();
            await waitNextVisualWarmupFrame();
            const nextRetryTasks = [];
            for (let idx = 0; idx < retryTasks.length; idx++) {
                const task = retryTasks[idx];
                try {
                    if (task.run()) warmed++; else nextRetryTasks.push(task);
                } catch (_) {
                    nextRetryTasks.push(task);
                }
                if ((idx + 1) % retryBatchSize === 0 && idx + 1 < retryTasks.length) {
                    failed = nextRetryTasks.length + (retryTasks.length - idx - 1);
                    publishPortalRuntimeVisualWarmupStatus({
                        state: "retrying",
                        phase: "frames",
                        warmed: warmed,
                        failed: failed,
                        retryRound: round + 1
                    });
                    await waitNextVisualWarmupFrame();
                }
            }
            retryTasks = nextRetryTasks;
            failed = retryTasks.length;
            publishPortalRuntimeVisualWarmupStatus({
                state: retryTasks.length > 0 ? "retrying" : "warming",
                phase: "frames",
                warmed: warmed,
                failed: failed,
                retryRound: round + 1
            });
        }

        const ready = retryTasks.length === 0;
        return publishPortalRuntimeVisualWarmupStatus({
            state: ready ? "ready" : "error",
            ready: ready,
            reason: reason,
            phase: "frames",
            total: tasks.length,
            completed: tasks.length,
            warmed: warmed,
            failed: retryTasks.length,
            startedAt: startedAt,
            finishedAt: Date.now()
        });
    })().catch(err => publishPortalRuntimeVisualWarmupStatus({
        state: "error",
        ready: false,
        reason: reason,
        phase: "error",
        total: 0,
        completed: 0,
        warmed: 0,
        failed: 0,
        error: err && err.message ? err.message : String(err || "portal runtime warmup failed"),
        finishedAt: Date.now()
    }));
    return portalRuntimeVisualWarmupPromise;
}

if (typeof window !== "undefined") {
    window.warmPortalRuntimeVisualsBeforeStart = warmPortalRuntimeVisualsBeforeStart;
}

function collectShipRuntimeWarmupJobs() {
    const jobs = [];
    const seen = new Set();
    const defs = typeof SHIP_SPRITE_DEFS === "object" && SHIP_SPRITE_DEFS ? SHIP_SPRITE_DEFS : null;
    if (!defs) return jobs;
    for (const rawShipId in defs) {
        if (!Object.prototype.hasOwnProperty.call(defs, rawShipId)) continue;
        const def = defs[rawShipId];
        if (!def) continue;
        const numericShipId = Number(rawShipId);
        const shipId = Number.isFinite(numericShipId) ? numericShipId : rawShipId;
        const frameCount = Math.max(1, Number(def.frameCount) || 1);
        for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
            const cacheKey = typeof getShipSpriteFrameCacheKey === "function" ? getShipSpriteFrameCacheKey(shipId, frameIndex) : `${shipId}_${frameIndex}`;
            if (cacheKey && seen.has(cacheKey)) continue;
            if (cacheKey) seen.add(cacheKey);
            jobs.push({
                shipId: shipId,
                frameIndex: frameIndex
            });
        }
    }
    return jobs;
}

function warmShipRuntimeFrame(job) {
    if (!job) return false;
    if (typeof warmShipSpriteVisualMetrics === "function") {
        return warmShipSpriteVisualMetrics(job.shipId, job.frameIndex, 1);
    }
    const img = typeof getShipSpriteFrame === "function" ? getShipSpriteFrame(job.shipId, job.frameIndex) : null;
    return !!(img && img.complete && img.width > 0 && img.height > 0);
}

function collectShipExpansionRuntimeWarmupJobs() {
    const jobs = [];
    const seen = new Set();
    const defs = typeof SHIP_EXPANSION_DEFS === "object" && SHIP_EXPANSION_DEFS ? SHIP_EXPANSION_DEFS : null;
    if (!defs) return jobs;
    for (const rawShipId in defs) {
        if (!Object.prototype.hasOwnProperty.call(defs, rawShipId)) continue;
        const def = defs[rawShipId];
        if (!def) continue;
        const numericShipId = Number(rawShipId);
        const shipId = Number.isFinite(numericShipId) ? numericShipId : rawShipId;
        const frames = typeof getFrameNumbersForDef === "function" ? getFrameNumbersForDef(def, 1) : null;
        const frameCount = Array.isArray(frames) && frames.length ? frames.length : Math.max(1, Number(def.frameCount) || 1);
        for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
            const cacheKey = typeof getShipExpansionFrameCacheKey === "function" ? getShipExpansionFrameCacheKey(shipId, frameIndex) : `${shipId}_${frameIndex}`;
            if (cacheKey && seen.has(cacheKey)) continue;
            if (cacheKey) seen.add(cacheKey);
            jobs.push({
                shipId: shipId,
                frameIndex: frameIndex
            });
        }
    }
    return jobs;
}

function warmShipExpansionRuntimeFrame(job, warmCtx) {
    if (!job || typeof getShipExpansionFrame !== "function") return false;
    const frameDef = getShipExpansionFrame(job.shipId, job.frameIndex);
    if (!frameDef || frameDef.pendingAtlas) return false;
    const warmed = warmFrameDefOnContext(warmCtx, frameDef, {});
    const source = frameDef.atlas ? null : frameDef.img || frameDef;
    if (source && source.complete && source.width > 0 && source.height > 0 && typeof getResolvedShipExpansionVisualShift === "function") {
        getResolvedShipExpansionVisualShift(job.shipId, job.frameIndex, source, 1);
    }
    return warmed;
}

async function warmCriticalBootRuntimeVisuals(reason = "manual") {
    if (criticalBootRuntimeVisualWarmupPromise) return criticalBootRuntimeVisualWarmupPromise;
    criticalBootRuntimeVisualWarmupPromise = (async () => {
        const warmCtx = getCriticalRuntimeWarmupContext();
        if (!warmCtx) {
            return publishCriticalBootRuntimeVisualWarmupStatus({
                state: "unavailable",
                ready: false,
                reason: reason,
                total: 0,
                completed: 0,
                warmed: 0,
                failed: 0,
                startedAt: 0,
                finishedAt: 0
            });
        }

        const tasks = [];
        const addWarmTask = (label, frameFactory, options = {}) => {
            if (typeof frameFactory !== "function") return;
            tasks.push({
                label: label,
                group: "visual",
                run: () => warmFrameDefOnContext(warmCtx, frameFactory(), options)
            });
        };
        const addRuntimeWarmTask = (label, runner, group = "runtime") => {
            if (typeof runner !== "function") return;
            tasks.push({
                label: label,
                group: group,
                run: runner
            });
        };

        if (PORTAL_JUMP_ANIM) {
            for (const frame of buildRuntimeWarmupFrameSequence(PORTAL_JUMP_ANIM.frameCount || 1, 3)) {
                addWarmTask("portal:" + frame, () => getPortalJumpFrame(frame), {
                    composite: "lighter"
                });
            }
        }
        if (SMARTBOMB_ANIM) {
            for (const frame of buildRuntimeWarmupFrameSequence(SMARTBOMB_ANIM.frameCount || 1, 1)) {
                addWarmTask("smartbomb:" + frame, () => typeof prepareSmartbombFrame === "function" ? prepareSmartbombFrame(frame) : null, {
                    composite: "lighter",
                    rotation: Math.PI / 8
                });
            }
        }
        const instaDef = SHIELD_SPRITE_DEFS && SHIELD_SPRITE_DEFS.insta ? SHIELD_SPRITE_DEFS.insta : null;
        if (instaDef) {
            for (const frame of buildRuntimeWarmupFrameSequence(instaDef.frameCount || 1, 1)) {
                addWarmTask("ish:" + frame, () => typeof prepareShieldSpriteFrame === "function" ? prepareShieldSpriteFrame("insta", frame) : null, {
                    composite: "lighter"
                });
            }
        }
        const criticalExplosionTypes = typeof CRITICAL_PREPARED_EXPLOSION_TYPES !== "undefined" && Array.isArray(CRITICAL_PREPARED_EXPLOSION_TYPES) ? CRITICAL_PREPARED_EXPLOSION_TYPES : [];
        if (typeof EXPLOSION_ANIMATIONS === "object" && EXPLOSION_ANIMATIONS && criticalExplosionTypes.length > 0) {
            for (const explosionType of criticalExplosionTypes) {
                const anim = EXPLOSION_ANIMATIONS[explosionType];
                if (!anim) continue;
                for (const frame of buildRuntimeWarmupFrameSequence(anim.frameCount || 1, 1)) {
                    addWarmTask("explosion" + explosionType + ":" + frame, () => typeof prepareExplosionFrame === "function" ? prepareExplosionFrame(explosionType, frame) : null, {
                        composite: "lighter"
                    });
                }
            }
        }
        if (EMP_ANIM) {
            addWarmTask("emp:ring:small", () => getEmpRingFrame(), {
                composite: "lighter",
                drawWidth: (EMP_ANIM.ring.frameWidth || 256) * Math.max(EMP_ANIM.ring.startScale || 0.1, 0.1),
                drawHeight: (EMP_ANIM.ring.frameHeight || 256) * Math.max(EMP_ANIM.ring.startScale || 0.1, 0.1)
            });
            addWarmTask("emp:ring:large", () => getEmpRingFrame(), {
                composite: "lighter",
                drawWidth: (EMP_ANIM.ring.frameWidth || 256) * Math.max(EMP_ANIM.ring.endScale || 1, 1),
                drawHeight: (EMP_ANIM.ring.frameHeight || 256) * Math.max(EMP_ANIM.ring.endScale || 1, 1)
            });
            for (const frame of buildRuntimeWarmupFrameSequence(EMP_ANIM.blitz.frameCount || 1, 1)) {
                addWarmTask("emp:blitz:" + frame, () => getEmpBlitzFrame(frame), {
                    composite: "lighter",
                    drawWidth: (EMP_ANIM.blitz.frameWidth || 256) * Math.max(EMP_ANIM.blitz.endScale || 1, 1),
                    drawHeight: (EMP_ANIM.blitz.frameHeight || 256) * Math.max(EMP_ANIM.blitz.endScale || 1, 1)
                });
            }
        }

        if (typeof SHIELD_SPRITE_DEFS === "object" && SHIELD_SPRITE_DEFS) {
            const shieldWarmupNames = ["standard", "low", "hit", "tech_shield_backup", "invincibility"];
            for (const shieldName of shieldWarmupNames) {
                const def = SHIELD_SPRITE_DEFS[shieldName];
                if (!def) continue;
                const stride = shieldName === "hit" ? 1 : 4;
                for (const frame of buildRuntimeWarmupFrameSequence(def.frameCount || 1, stride)) {
                    addWarmTask("shield:" + shieldName + ":" + frame, () => getShieldSpriteFrame(shieldName, frame), {
                        composite: "lighter"
                    });
                }
            }
        }

        if (typeof FLASH_ABILITY_TO_SKILL_TYPE === "object" && FLASH_ABILITY_TO_SKILL_TYPE && typeof flashGetSkillEffectFrameImage === "function") {
            Object.keys(FLASH_ABILITY_TO_SKILL_TYPE).forEach(abilityId => {
                const meta = typeof flashGetSkillEffectSequenceMeta === "function" ? flashGetSkillEffectSequenceMeta(abilityId) : null;
                if (!meta) return;
                const stride = abilityId === "lightning" ? 1 : 4;
                for (const zeroFrame of buildRuntimeWarmupFrameSequence(meta.frameCount || 1, stride)) {
                    const frameNumber = zeroFrame + 1;
                    addWarmTask("skill:" + abilityId + ":" + frameNumber, () => flashGetSkillEffectFrameImage(abilityId, frameNumber), {
                        composite: "lighter"
                    });
                }
            });
        }

        if (typeof FLASH_TECH_EFFECT_SEQUENCE_META === "object" && FLASH_TECH_EFFECT_SEQUENCE_META && typeof flashGetTechEffectFrameImage === "function") {
            Object.keys(FLASH_TECH_EFFECT_SEQUENCE_META).forEach(effectKey => {
                const meta = typeof flashGetTechEffectSequenceMeta === "function" ? flashGetTechEffectSequenceMeta(effectKey) : FLASH_TECH_EFFECT_SEQUENCE_META[effectKey];
                if (!meta) return;
                const stride = effectKey === "ELACLOUD1" ? 1 : 4;
                for (const zeroFrame of buildRuntimeWarmupFrameSequence(meta.frameCount || 1, stride)) {
                    const frameNumber = zeroFrame + 1;
                    addWarmTask("tech:" + effectKey + ":" + frameNumber, () => flashGetTechEffectFrameImage(effectKey, frameNumber), {
                        composite: "lighter"
                    });
                }
            });
        }

        addWarmTask("laser:0", () => getLaserSpriteFrame(0), {
            composite: "lighter"
        });
        addWarmTask("laser:4", () => getLaserSpriteFrame(4), {
            composite: "lighter"
        });
        addWarmTask("laser:4_sab", () => getLaserSpriteFrame(4, true), {
            composite: "lighter"
        });
        addWarmTask("laser:6", () => getLaserSpriteFrame(6), {
            composite: "lighter"
        });
        addWarmTask("laser:7", () => getLaserSpriteFrame(7), {
            composite: "lighter"
        });

        const shipWarmupJobs = collectShipRuntimeWarmupJobs();
        for (const job of shipWarmupJobs) {
            addRuntimeWarmTask("ship:" + job.shipId + ":" + job.frameIndex, () => warmShipRuntimeFrame(job), "ship");
        }
        const shipExpansionWarmupJobs = collectShipExpansionRuntimeWarmupJobs();
        for (const job of shipExpansionWarmupJobs) {
            addRuntimeWarmTask("shipExpansion:" + job.shipId + ":" + job.frameIndex, () => warmShipExpansionRuntimeFrame(job, warmCtx), "shipExpansion");
        }

        let warmed = 0;
        let failed = 0;
        let retryTasks = [];
        let shipFramesCompleted = 0;
        let shipExpansionFramesCompleted = 0;
        const startedAt = Date.now();
        publishCriticalBootRuntimeVisualWarmupStatus({
            state: "warming",
            ready: false,
            reason: reason,
            total: tasks.length,
            shipFramesTotal: shipWarmupJobs.length,
            shipExpansionFramesTotal: shipExpansionWarmupJobs.length,
            shipFramesCompleted: 0,
            shipExpansionFramesCompleted: 0,
            completed: 0,
            warmed: 0,
            failed: 0,
            startedAt: startedAt,
            finishedAt: 0
        });

        const batchSize = 12;
        for (let idx = 0; idx < tasks.length; idx++) {
            const task = tasks[idx];
            try {
                if (task.run()) warmed++; else retryTasks.push(task);
            } catch (_) {
                retryTasks.push(task);
            }
            if (task.group === "ship") shipFramesCompleted++;
            if (task.group === "shipExpansion") shipExpansionFramesCompleted++;
            failed = retryTasks.length;
            if ((idx + 1) % batchSize === 0 && idx + 1 < tasks.length) {
                publishCriticalBootRuntimeVisualWarmupStatus({
                    completed: idx + 1,
                    shipFramesCompleted: shipFramesCompleted,
                    shipExpansionFramesCompleted: shipExpansionFramesCompleted,
                    warmed: warmed,
                    failed: failed
                });
                await waitNextVisualWarmupFrame();
            }
        }

        const retryRounds = 6;
        const retryBatchSize = 8;
        for (let round = 0; round < retryRounds && retryTasks.length > 0; round++) {
            await waitNextVisualWarmupFrame();
            await waitNextVisualWarmupFrame();
            const nextRetryTasks = [];
            for (let idx = 0; idx < retryTasks.length; idx++) {
                const task = retryTasks[idx];
                try {
                    if (task.run()) warmed++; else nextRetryTasks.push(task);
                } catch (_) {
                    nextRetryTasks.push(task);
                }
                if ((idx + 1) % retryBatchSize === 0 && idx + 1 < retryTasks.length) {
                    failed = nextRetryTasks.length + (retryTasks.length - idx - 1);
                    publishCriticalBootRuntimeVisualWarmupStatus({
                        state: "retrying",
                        shipFramesCompleted: shipFramesCompleted,
                        shipExpansionFramesCompleted: shipExpansionFramesCompleted,
                        warmed: warmed,
                        failed: failed,
                        retryRound: round + 1
                    });
                    await waitNextVisualWarmupFrame();
                }
            }
            retryTasks = nextRetryTasks;
            failed = retryTasks.length;
            publishCriticalBootRuntimeVisualWarmupStatus({
                state: retryTasks.length > 0 ? "retrying" : "warming",
                shipFramesCompleted: shipFramesCompleted,
                shipExpansionFramesCompleted: shipExpansionFramesCompleted,
                warmed: warmed,
                failed: failed,
                retryRound: round + 1
            });
        }

        const criticalPreparedFrames = validateCriticalRuntimePreparedFrames();
        const failedLabels = new Set(retryTasks.map(task => task.label));
        criticalPreparedFrames.missingFrames.forEach(label => failedLabels.add(label));
        failed = failedLabels.size;
        const ready = failed === 0;
        return publishCriticalBootRuntimeVisualWarmupStatus({
            state: ready ? "ready" : "error",
            ready: ready,
            reason: reason,
            total: tasks.length,
            shipFramesTotal: shipWarmupJobs.length,
            shipExpansionFramesTotal: shipExpansionWarmupJobs.length,
            shipFramesCompleted: shipWarmupJobs.length,
            shipExpansionFramesCompleted: shipExpansionWarmupJobs.length,
            completed: tasks.length,
            warmed: warmed,
            failed: failed,
            warmupFailed: retryTasks.length,
            criticalFramesMissing: criticalPreparedFrames.missingCount,
            criticalFrameFailures: criticalPreparedFrames.missingFrames.slice(0, 32),
            startedAt: startedAt,
            finishedAt: Date.now()
        });
    })().catch(err => publishCriticalBootRuntimeVisualWarmupStatus({
        state: "error",
        ready: false,
        reason: reason,
        total: 0,
        completed: 0,
        warmed: 0,
        failed: 0,
        error: err && err.message ? err.message : String(err || "visual runtime warmup failed"),
        finishedAt: Date.now()
    }));
    return criticalBootRuntimeVisualWarmupPromise;
}

if (typeof window !== "undefined") {
    window.warmCriticalBootRuntimeVisuals = warmCriticalBootRuntimeVisuals;
}

function drawPortalJumpEffects() {
    if (!PORTAL_JUMP_ANIM) return;
    const now = performance.now();
    for (const fx of portalJumpEffects) {
        const elapsed = now - fx.startedAt;
        const frame = Math.floor(elapsed / (PORTAL_JUMP_ANIM.frameDuration || 40));
        if (frame < 0 || frame >= PORTAL_JUMP_ANIM.frameCount) continue;
        const frameDef = getPortalJumpFrame(frame);
        if (!frameDef || frameDef.pendingAtlas) continue;
        const sx = mapToScreenX(fx.x) + (PORTAL_JUMP_ANIM.offsetX || 0);
        const sy = mapToScreenY(fx.y) + (PORTAL_JUMP_ANIM.offsetY || 0);
        const OFFSET_X = -12;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        if (frameDef.preparedPortalJumpFrame && frameDef.img) {
            const baseX = sx - frameDef.width / 2 + OFFSET_X;
            const baseY = sy - frameDef.height / 2;
            const trim = frameDef.trim;
            if (trim && trim.sw > 0 && trim.sh > 0) {
                const scaleX = frameDef.width / (frameDef.sw || frameDef.width || 1);
                const scaleY = frameDef.height / (frameDef.sh || frameDef.height || 1);
                ctx.drawImage(frameDef.img, trim.sx || 0, trim.sy || 0, trim.sw, trim.sh, baseX + trim.x * scaleX, baseY + trim.y * scaleY, trim.sw * scaleX, trim.sh * scaleY);
            } else {
                ctx.drawImage(frameDef.img, baseX, baseY, frameDef.width, frameDef.height);
            }
        } else if (frameDef.atlas) {
            const baseX = sx - frameDef.width / 2 + OFFSET_X;
            const baseY = sy - frameDef.height / 2;
            const trim = frameDef.trim;
            if (trim && trim.sw > 0 && trim.sh > 0) {
                const scaleX = frameDef.width / (frameDef.sw || frameDef.width || 1);
                const scaleY = frameDef.height / (frameDef.sh || frameDef.height || 1);
                ctx.drawImage(frameDef.atlas, trim.sx, trim.sy, trim.sw, trim.sh, baseX + trim.x * scaleX, baseY + trim.y * scaleY, trim.sw * scaleX, trim.sh * scaleY);
            } else {
                ctx.drawImage(frameDef.atlas, frameDef.sx, frameDef.sy, frameDef.sw, frameDef.sh, baseX, baseY, frameDef.width, frameDef.height);
            }
        } else {
            const img = frameDef.img || frameDef;
            if (img && img.complete && img.width > 0 && img.height > 0) {
                ctx.drawImage(img, sx - img.width / 2 + OFFSET_X, sy - img.height / 2);
            }
        }
        ctx.restore();
    }
}

function spawnExplosionAt(x, y, explosionType = 2) {
    if (x == null || y == null) return;
    try {
        if (window.AudioManager && typeof window.AudioManager.playPyro === "function") {
            window.AudioManager.playPyro(0, explosionType, x, y);
        }
    } catch (_) {}
    const now = performance.now();
    explosions.push({
        x: x,
        y: y,
        startedAt: now,
        type: explosionType
    });
}

function updateExplosions(now) {
    let keepCount = 0;
    for (let i = 0; i < explosions.length; i++) {
        const ex = explosions[i];
        const anim = EXPLOSION_ANIMATIONS[ex.type] || EXPLOSION_ANIMATIONS[2];
        const totalDuration = (anim.frameCount || 1) * (anim.frameDuration || 40);
        if (now - ex.startedAt <= totalDuration) {
            explosions[keepCount++] = ex;
        }
    }
    explosions.length = keepCount;
}

function drawExplosions() {
    const now = performance.now();
    const drawOptions = drawExplosions._drawOptions || (drawExplosions._drawOptions = {
        composite: "lighter"
    });
    for (const ex of explosions) {
        const anim = EXPLOSION_ANIMATIONS[ex.type] || EXPLOSION_ANIMATIONS[2];
        const frameDuration = anim.frameDuration || 40;
        const frame = Math.floor((now - ex.startedAt) / frameDuration);
        if (frame < 0 || frame >= (anim.frameCount || 0)) continue;
        const frameDef = getExplosionFrame(ex.type, frame);
        if (!frameDef || frameDef.pendingAtlas) continue;
        const explosionScreenX = mapToScreenX(ex.x);
        const explosionScreenY = mapToScreenY(ex.y);
        drawFrameDefCentered(frameDef, explosionScreenX, explosionScreenY, drawOptions);
    }
}

function drawSmartbombEffects(options = null) {
    if (!SMARTBOMB_ANIM) return;
    const onlyHero = !!(options && options.onlyHero);
    const excludeHero = !!(options && options.excludeHero);
    const now = performance.now();
    const drawOptions = drawSmartbombEffects._drawOptions || (drawSmartbombEffects._drawOptions = {
        rotation: 0
    });
    for (const fx of smartbombEffects) {
        if (onlyHero && !fx.onHero) continue;
        if (excludeHero && fx.onHero) continue;
        const elapsed = now - fx.startedAt;
        const frame = Math.floor(elapsed / (SMARTBOMB_ANIM.frameDuration || 20));
        if (frame < 0 || frame >= SMARTBOMB_ANIM.frameCount) continue;
        const frameDef = getSmartbombFrame(frame);
        if (!frameDef || frameDef.pendingAtlas) continue;
        if (frameDef.atlas && !frameDef.__andromedaPreparedSmartbombFrame) continue;
        const sx = mapToScreenX(fx.x) + (SMARTBOMB_ANIM.offsetX || 0);
        const sy = mapToScreenY(fx.y) + (SMARTBOMB_ANIM.offsetY || 0);
        drawOptions.rotation = fx.rotation || 0;
        drawFrameDefCentered(frameDef, sx, sy, drawOptions);
    }
}

function drawEmpEffects() {
    if (!EMP_ANIM) return;
    const now = performance.now();
    const ringFrame = getEmpRingFrame();
    const drawOptions = drawEmpEffects._drawOptions || (drawEmpEffects._drawOptions = {
        alpha: 1,
        drawWidth: 0,
        drawHeight: 0
    });
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
            const frame = Math.floor(blitzElapsed % cycleDuration / frameDuration) % frameCount;
            const blitzFrame = getEmpBlitzFrame(frame);
            if (blitzFrame && !blitzFrame.pendingAtlas) {
                const scale = EMP_ANIM.blitz.startScale + (EMP_ANIM.blitz.endScale - EMP_ANIM.blitz.startScale) * (blitzElapsed / EMP_ANIM.blitz.duration);
                let alpha = 1;
                if (blitzElapsed >= EMP_ANIM.blitz.fadeOutStart) {
                    const fadeT = Math.min(1, (blitzElapsed - EMP_ANIM.blitz.fadeOutStart) / EMP_ANIM.blitz.fadeOutDuration);
                    alpha = 1 - fadeT;
                }
                drawOptions.alpha = alpha;
                drawOptions.drawWidth = (blitzFrame.width || 0) * scale;
                drawOptions.drawHeight = (blitzFrame.height || 0) * scale;
                drawFrameDefCentered(blitzFrame, sx, sy, drawOptions);
            }
        }
        if (ringFrame && !ringFrame.pendingAtlas) {
            for (let idx = 0; idx < (EMP_ANIM.ring.count || 0); idx++) {
                const ringStart = fx.startedAt + idx * (EMP_ANIM.ring.delay || 0);
                const elapsed = now - ringStart;
                if (elapsed < 0 || elapsed > EMP_ANIM.ring.duration) continue;
                const t = elapsed / EMP_ANIM.ring.duration;
                const scale = EMP_ANIM.ring.startScale + (EMP_ANIM.ring.endScale - EMP_ANIM.ring.startScale) * t;
                const alpha = EMP_ANIM.ring.startAlpha + (EMP_ANIM.ring.endAlpha - EMP_ANIM.ring.startAlpha) * t;
                drawOptions.alpha = alpha;
                drawOptions.drawWidth = (ringFrame.width || 0) * scale;
                drawOptions.drawHeight = (ringFrame.height || 0) * scale;
                drawFrameDefCentered(ringFrame, sx, sy, drawOptions);
            }
        }
    }
}

function triggerRadiationPulse() {
    radiationPulseStart = performance.now();
    radiationFlashAlpha = .35;
    try {
        if (window.AudioManager && typeof window.AudioManager.playSoundEffect === "function") {
            window.AudioManager.playSoundEffect(23, false, false, -1, -1, true);
        }
    } catch (_) {}
}

function startRadiationWarning() {
    if (radiationWarningTimer === null) {
        radiationWarningTimer = setInterval(triggerRadiationPulse, 2e3);
    }
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
    if (shouldActivate === radiationServerFlag) {
        return;
    }
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
        radiationFade = Math.min(1, radiationFade + .08);
    } else {
        radiationFade = Math.max(0, radiationFade - .08);
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
        radiationFlashAlpha = Math.max(0, radiationFlashAlpha - .05);
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
        ctx.globalAlpha = .9 * radiationFade;
        if (arrow && arrow.complete && arrow.width > 0 && arrow.height > 0) {
            const scale = .9 + .15 * pulseAlpha;
            const w = arrow.width * scale;
            const h = arrow.height * scale;
            ctx.drawImage(arrow, -w / 2, -h / 2, w, h);
        } else {
            const scale = .95 + .2 * pulseAlpha;
            const length = 44 * scale;
            const halfWidth = 14 * scale;
            ctx.fillStyle = "rgba(255, 120, 120, 0.95)";
            ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(length * 0.5, 0);
            ctx.lineTo(-length * 0.35, -halfWidth);
            ctx.lineTo(-length * 0.1, 0);
            ctx.lineTo(-length * 0.35, halfWidth);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = .95 * radiationFade;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const textY = canvas.height / 2 - 150;
    ctx.fillText("RADIATION ZONE", canvas.width / 2, textY);
    ctx.font = "14px Arial";
    ctx.fillText("Return to the safe zone", canvas.width / 2, textY + 22);
    ctx.restore();
}

function drawPvpOverlay() {
    const now = performance.now();
    if (mapPvpAllowed === 0) {
        ctx.save();
        ctx.globalAlpha = .12;
        ctx.fillStyle = "blue";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
    if (inDemilitarizedZone) {
        ctx.save();
        ctx.globalAlpha = .9;
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText("PEACE ZONE", canvas.width / 2, 14);
        ctx.restore();
    }
    if (inTradeZone) {
        ctx.save();
        ctx.globalAlpha = .9;
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText("TRADE ZONE", canvas.width / 2, 34);
        ctx.restore();
    }
    if (lastNoAttackZoneTime > 0 && now - lastNoAttackZoneTime < 5e3) {
        ctx.save();
        ctx.globalAlpha = .25;
        ctx.fillStyle = "green";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
}
