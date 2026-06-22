






// --- client_bootstrap.js ---

// 1. La Boucle de Rendu (Le cœur du jeu)
function render(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    shieldAnimTime += dt;

    // --- A. MISES À JOUR LOGIQUES ---
    reinforceLockState();
    updateChaseMovement();
    updateHeroLocalMovement(dt);
    updateInterpolations();
    updateCombat();
    updateCombatRotations();
    updateActionCooldowns();
    updateShieldEffects(now);
    updateTemporaryStatuses(now);

    updatePortalJumpEffects(now);
    updateSmartbombEffects(now);
    updateEmpEffects(now);

    updateLaserBeams(now);
    updateRocketAttacks(now);
    updateSabShots(now);
    updateDamageBubbles(now);
    updateShieldBursts(now);
    updateHullDamageEffects(now);
    updateRocketDamageEffects(now);
    updateExplosions(now);

    // Centrage caméra
    cameraX = shipX;
    cameraY = shipY;

    // --- B. DESSIN (L'ordre est important !) ---

    // 1. Monde (scale global "Flash-like")
    const worldScale = (typeof getWorldScaleValue === "function") ? getWorldScaleValue() : 1;
    const worldOffsetX = (canvas.width - LOGICAL_WIDTH * worldScale) / 2;
    const worldOffsetY = (canvas.height - LOGICAL_HEIGHT * worldScale) / 2;

    ctx.save();
    ctx.translate(worldOffsetX, worldOffsetY);
    ctx.scale(worldScale, worldScale);

    // 1. Fond d'écran
    drawMapBackground();

    // 2. Stations (Dessous)
    if (typeof stations !== 'undefined' && typeof stationImages !== 'undefined') {
        for (let s of stations) {
            let img = stationImages[s.type];
            if (img && img.complete) {
                let drawX = mapToScreenX(s.x);
                let drawY = mapToScreenY(s.y);
                ctx.drawImage(img, drawX - (img.width / 2), drawY - (img.height / 2));
            }
        }
    }

    // 3. Portails
    drawPortals();

    // 4. Entités (NPCs, Ennemis, Boîtes)
    drawEntities();

    // 4 bis. Effet smartbomb héros (couche basse)
    drawSmartbombEffects({ onlyHero: true });

    // 5. Votre Vaisseau (Héros)
    drawShip();

    // 6. Effets Spéciaux (Au-dessus)
    drawEmpEffects();
    drawPortalJumpEffects();
    drawSmartbombEffects({ excludeHero: true });
    drawShieldBursts();
    drawHullDamageEffects();
    drawRocketDamageEffects();
    drawExplosions();
    drawRocketAttacks();
    drawLaserBeams();
    drawSabShots();
    drawDamageBubbles();

    ctx.restore();

    // 7. Interfaces (HUD, Minimap, Fenêtres)
    drawRadiationOverlay();
    drawPvpOverlay();

    drawMiniMap();

    updateHtmlWindows(); // Mise à jour du contenu HTML des fenêtres
    drawQuickbar();
    drawDebugInfo();
    drawTooltip();
    
    heroSmbJustUsed = false;
    
    // On boucle !
    requestAnimationFrame(render);
}

// Fonction utilitaire pour le groupe
window.selectGroupMember = function(id) {
    if (id && entities[id]) {
        selectedTargetId = id;
        sendSelectShip(id);
        
        const groupInput = document.getElementById('groupInputName');
        if (groupInput && entities[id].name) {
            groupInput.value = entities[id].name;
        }
    }
};

// =============================================================
//  NOUVEAU : FONCTION DE DÉMARRAGE (Appelée par le bouton START)
// =============================================================
window.initGame = async function() {
    console.log("[Bootstrap] Initialisation du jeu...");

    // Lancement de toutes les initialisations graphiques et UI
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
    
    initLabWindow();
    initQuestWindow();
    initSpaceballHUD();
    initGlobalScrollbarStyles();  
    initActionDrawer();
    initDragAndDrop();
    loadInterfaceLayout();
    initWindowManager();
    createGameWindows();
    initRefiningButton();
    initTradeButton();
    initSettingsButton();
    initLogoutUI();

    // Gestionnaire du tiroir d'actions (Action Drawer)
    setInterval(() => {
        if (document.getElementById("actionDrawerContainer")) {
            renderActionDrawerItems();
        }
    }, 100); 

    // IMPORTANT : On initialise le temps pour éviter un saut d'animation
    lastTime = performance.now();

    if (typeof bootLoadXmlConfigs === "function") {
        await bootLoadXmlConfigs(window.ANDROMEDA_CONFIG || {});
    }

    if (typeof window.startNetwork === "function") {
        window.startNetwork();
    }

    // ET C'EST PARTI ! On lance la boucle de rendu
    requestAnimationFrame(render);
    console.log("[Bootstrap] Boucle de rendu lancée.");
};


// --- GESTION DES FENÊTRES HTML (Contenu dynamique) ---
function updateHtmlWindows() {
    // --- FENÊTRE SHIP ---
if (windowStates && windowStates.ship) {
    const container = document.getElementById('content_ship');
    if (container) {
        const hpNow = (heroHp != null) ? Number(heroHp) : 0;
        const hpMax = (heroMaxHp != null && Number(heroMaxHp) > 0) ? Number(heroMaxHp) : (hpNow || 1);
        const hpPct = Math.max(0, Math.min(100, (hpNow / hpMax) * 100));

        const shNow = (heroShield != null) ? Number(heroShield) : 0;
        const shMax = (heroMaxShield != null && Number(heroMaxShield) > 0) ? Number(heroMaxShield) : (shNow || 1);
        const shPct = Math.max(0, Math.min(100, (shNow / shMax) * 100));

        const cgNow = (heroCargo != null) ? Number(heroCargo) : 0;
        const cgMax = (heroMaxCargo != null && Number(heroMaxCargo) > 0) ? Number(heroMaxCargo) : (cgNow || 1);
        const cgPct = Math.max(0, Math.min(100, (cgNow / cgMax) * 100));

        // Couleurs "Flash" d’après game.xml :
        // HP = bar_green + bar_yellow2 (quand bas), Shield = bar_blue, Cargo = bar_yellow, Ammo/Rockets = bar_red
        const hpFill = (hpPct <= 33)
            ? "linear-gradient(90deg,#ffe66a,#ffb300)"   // yellow2
            : "linear-gradient(90deg,#4aff4a,#00cc00)";  // green

        const shieldFill = "linear-gradient(90deg,#3bc5ff,#46e0ff)"; // blue
        const cargoFill  = "linear-gradient(90deg,#ffe66a,#ffb300)"; // yellow
        const redFill    = "linear-gradient(90deg,#ff6b6b,#ff0000)"; // red

        // Taille des barres (raccourcies pour matcher Flash et rentrer dans la fenêtre)
        const BAR_W = 90;

        const ammoStockData = (typeof ammoStock !== "undefined" && ammoStock) ? ammoStock : {};
        const totalLaserAmmo = [1, 2, 3, 4, 5, 6]
            .reduce((sum, key) => sum + (parseInt(ammoStockData[key], 10) || 0), 0);
        const totalRocketAmmo = [10, 11, 12]
            .reduce((sum, key) => sum + (parseInt(ammoStockData[key], 10) || 0), 0);

        container.innerHTML = `
            <div style="display:flex; gap:10px; padding:6px;">

                <!-- Colonne gauche -->
                <div style="flex:1; display:flex; flex-direction:column; gap:7px;">

                    <!-- HP -->
                    <div style="display:flex; align-items:center; gap:6px;">
                        <img src="graphics/ui/ui/images/65_hp_small.png.png" title="Hit points" style="width:16px; height:16px;">
                        <div style="width:${BAR_W}px; height:10px; background:#111; border:1px solid #555; position:relative;">
                            <div style="position:absolute; left:0; top:0; bottom:0; width:${hpPct}%; background:${hpFill};"></div>
                            <div style="position:absolute; left:0; top:0; width:100%; height:100%;
                                        display:flex; align-items:center; justify-content:center;
                                        font-size:9px; color:#fff; text-shadow:1px 1px 0 #000; white-space:nowrap;">
                                ${Math.round(hpNow).toLocaleString()} / ${Math.round(hpMax).toLocaleString()}
                            </div>
                        </div>
                    </div>

                    <!-- SHIELD -->
                    <div style="display:flex; align-items:center; gap:6px;">
                        <img src="graphics/ui/ui/images/16_shipInfoIcon_shield.png" title="Shield" style="width:16px; height:16px;">
                        <div style="width:${BAR_W}px; height:10px; background:#111; border:1px solid #555; position:relative;">
                            <div style="position:absolute; left:0; top:0; bottom:0; width:${shPct}%; background:${shieldFill};"></div>
                            <div style="position:absolute; left:0; top:0; width:100%; height:100%;
                                        display:flex; align-items:center; justify-content:center;
                                        font-size:9px; color:#fff; text-shadow:1px 1px 0 #000; white-space:nowrap;">
                                ${Math.round(shNow).toLocaleString()} / ${Math.round(shMax).toLocaleString()}
                            </div>
                        </div>
                    </div>

                    <!-- CARGO (jaune) -->
                    <div style="display:flex; align-items:center; gap:6px;">
                        <img src="graphics/ui/ui/images/102_shipInfoIcon_cargo.png" title="Cargo bay" style="width:16px; height:16px;">
                        <div style="width:${BAR_W}px; height:10px; background:#111; border:1px solid #555; position:relative;">
                            <div style="position:absolute; left:0; top:0; bottom:0; width:${cgPct}%; background:${cargoFill};"></div>
                            <div style="position:absolute; left:0; top:0; width:100%; height:100%;
                                        display:flex; align-items:center; justify-content:center;
                                        font-size:9px; color:#fff; text-shadow:1px 1px 0 #000; white-space:nowrap;">
                                ${Math.round(cgNow).toLocaleString()} / ${Math.round(cgMax).toLocaleString()}
                            </div>
                        </div>
                    </div>

                </div>

                <!-- Colonne droite -->
                <div style="flex:1; display:flex; flex-direction:column; gap:7px;">

                    <!-- AMMO (rouge) -->
                    <div style="display:flex; align-items:center; gap:6px;">
                        <img src="graphics/ui/ui/images/58_shipInfoIcon_laser.png" title="Ammo" style="width:16px; height:16px;">
                        <div style="width:${BAR_W}px; height:10px; background:#111; border:1px solid #555; position:relative;">
                            <div style="position:absolute; left:0; top:0; bottom:0; width:100%; background:${redFill};"></div>
                            <div style="position:absolute; left:0; top:0; width:100%; height:100%;
                                        display:flex; align-items:center; justify-content:center;
                                        font-size:9px; color:#fff; text-shadow:1px 1px 0 #000; white-space:nowrap;">
                                ${Number(totalLaserAmmo).toLocaleString()}
                            </div>
                        </div>
                    </div>

                    <!-- ROCKETS (rouge) -->
                    <div style="display:flex; align-items:center; gap:6px;">
                        <img src="graphics/ui/ui/images/18_shipInfoIcon_rockets.png" title="Rockets" style="width:16px; height:16px;">
                        <div style="width:${BAR_W}px; height:10px; background:#111; border:1px solid #555; position:relative;">
                            <div style="position:absolute; left:0; top:0; bottom:0; width:100%; background:${redFill};"></div>
                            <div style="position:absolute; left:0; top:0; width:100%; height:100%;
                                        display:flex; align-items:center; justify-content:center;
                                        font-size:9px; color:#fff; text-shadow:1px 1px 0 #000; white-space:nowrap;">
                                ${Number(totalRocketAmmo).toLocaleString()}
                            </div>
                        </div>
                    </div>

                    <!-- CONFIG -->
                    <div style="display:flex; align-items:center; gap:6px;">
                        <img src="graphics/ui/ui/images/93_shipInfoIcon_configuration.png" title="Configuration" style="width:16px; height:16px;">
                        <span style="color:#fff; font-weight:bold; text-shadow:1px 1px 0 #000; white-space:nowrap;">
                            ${heroConfig}
                        </span>
                    </div>

                </div>

            </div>
        `;
    }
}

    // --- FENÊTRE BOOSTER ---
    if (windowStates && windowStates.booster) {
        const container = document.getElementById('content_booster');
        if (container) {
            const boosters = (typeof getBoosterStatus === "function") ? getBoosterStatus() : (window.boosterStatus || []);
            const entries = [
                { key: "dmg", index: 2, icon: "graphics/ui/ui/images/152_boosterDamageIcon.png" },
                { key: "shd", index: 3, icon: "graphics/ui/ui/images/146_boosterShieldIcon.png" },
                { key: "hp", index: 7, icon: "graphics/ui/ui/images/150_boosterHitpointsIcon.png" }
            ];

            const activeEntries = entries
                .map((entry) => ({ ...entry, value: parseInt(boosters[entry.index], 10) || 0 }))
                .filter((entry) => entry.value > 0);

            container.innerHTML = `
                <div class="boosterList">
                    ${activeEntries.map((entry) => `
                        <div class="boosterRow">
                            <div class="boosterIcon" style="background-image:url('${entry.icon}')"></div>
                            <div class="boosterBar">
                                <div class="boosterFill" style="width:${Math.min(entry.value, 100)}%;"></div>
                                <div class="boosterText">${entry.value} %</div>
                            </div>
                        </div>
                    `).join("")}
                </div>
            `;

            const win = document.getElementById('win_booster');
            if (win) {
                const rowHeight = 22;
                const targetHeight = 32 + (rowHeight * activeEntries.length);
                if (activeEntries.length > 0) {
                    win.style.height = `${targetHeight}px`;
                }
            }
        }
    }



    // --- FENÊTRE USER ---
    if (windowStates && windowStates.user) {
        const container = document.getElementById('content_user');
        if (container) {
            container.innerHTML = `
    <div style="display:flex; gap:14px; padding:6px 6px 4px 6px;">
        
        <!-- Colonne gauche : Experience / Level / Honor -->
        <div style="flex:1; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
                <img src="graphics/ui/ui/images/79_shipInfoIcon_experience.png"
                     title="Experience"
                     style="width:16px; height:16px;">
                <span style="color:#fff; font-weight:bold; text-shadow:1px 1px 0 #000; white-space:nowrap;">
                    ${heroXp.toLocaleString()}
                </span>
            </div>

            <div style="display:flex; align-items:center; gap:8px;">
                <img src="graphics/ui/ui/images/57_shipInfoIcon_level.png"
                     title="Level"
                     style="width:16px; height:16px;">
                <span style="color:#fff; font-weight:bold; text-shadow:1px 1px 0 #000; white-space:nowrap;">
                    ${heroLevel}
                </span>
            </div>

            <div style="display:flex; align-items:center; gap:8px;">
                <img src="graphics/ui/ui/images/68_shipInfoIcon_honor.png"
                     title="Honor"
                     style="width:16px; height:16px;">
                <span style="color:#fff; font-weight:bold; text-shadow:1px 1px 0 #000; white-space:nowrap;">
                    ${heroHonor.toLocaleString()}
                </span>
            </div>
        </div>

        <!-- Colonne droite : Credits / Uridium / Booty keys -->
        <div style="flex:1; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
                <img src="graphics/ui/ui/images/92_shipInfoIcon_credits.png"
                     title="Credits"
                     style="width:16px; height:16px;">
                <span style="color:#fff; font-weight:bold; text-shadow:1px 1px 0 #000; white-space:nowrap;">
                    ${heroCredits.toLocaleString()}
                </span>
            </div>

            <div style="display:flex; align-items:center; gap:8px;">
                <img src="graphics/ui/ui/images/8_shipInfoIcon_uridium.png"
                     title="Uridium"
                     style="width:16px; height:16px;">
                <span style="color:#fff; font-weight:bold; text-shadow:1px 1px 0 #000; white-space:nowrap;">
                    ${heroUridium.toLocaleString()}
                </span>
            </div>

            <div style="display:flex; align-items:center; gap:8px;">
                <img src="graphics/ui/ui/images/59_shipInfoIcon_bootykey.png"
                     title="Booty keys"
                     style="width:16px; height:16px;">
                <span style="color:#fff; font-weight:bold; text-shadow:1px 1px 0 #000; white-space:nowrap;">
                    ${heroBootyKeys}
                </span>
            </div>
        </div>

    </div>
`;

        }
    }
    
    // --- FENÊTRE LOG ---
    if (windowStates && windowStates.log) {
        const container = document.getElementById('content_log');
        if (container) {
            let html = "";
            infoMessages.forEach(msg => {
                html += `<div style="border-bottom:1px solid #333; padding:2px; font-size:10px; color:#ccc;">${msg}</div>`;
            });
            container.innerHTML = html;
        }
    }
}
