














    // 2. WEBSOCKET
    // -------------------------------------------------

    let ws = null;
	let heroLoaded = false;
let mapLoaded = false;
let sentRdyMap = false;
let pendingBattleContinue = false;
let pendingBattleContinueTargetId = null;

function resetReadyFlags() {
    // Si on connaît déjà le héros, on le considère "loaded"
    heroLoaded = (heroId != null && heroId > 0);

    // À chaque nouvelle map, on attend un nouveau "m|..."
    mapLoaded = false;

    // Et on autorise un nouvel envoi RDY|MAP
    sentRdyMap = false;
}


function trySendRdyMap() {
    if (!sentRdyMap && heroLoaded && mapLoaded) {
        sendRaw("RDY|MAP");
        sentRdyMap = true;
        console.log("[WS] Envoi RDY|MAP");
    }
}

	let pingTimerId = null;

function startPingTimer() {
    stopPingTimer();
    sendRaw("PNG"); // ping immédiat
    pingTimerId = setInterval(() => {
        sendRaw("PNG");
    }, 25000);
}

function stopPingTimer() {
    if (pingTimerId) {
        clearInterval(pingTimerId);
        pingTimerId = null;
    }
}

	let chatWs = null;
	let netBuffer = "";
	let chatBuffer = "";

    function sendRaw(line) {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.warn("[WS] Impossible d'envoyer, WS fermé :", line);
            return;
        }
        if (!line.endsWith("\0")) line += "\0";
ws.send(line);
    }

    function connectToServer() {
        const url = `ws://${cfg.host}:${cfg.port}`;
        console.log("[WS] Connexion à :", url);

        ws = new WebSocket(url);

        ws.onopen = () => {
            console.log("[WS] Connecté !");
            const version = "4.1";
            const loginCmd = `LOGIN|${cfg.userID}|${cfg.sessionID}|${version}`;
            console.log("[WS] Envoi LOGIN →", loginCmd);
            sendRaw(loginCmd);
			startPingTimer();
        };

        ws.onmessage = (event) => {
    const raw = (event.data ?? "");
    netBuffer += raw;

    const packets = netBuffer.split("\0");
    netBuffer = packets.pop(); // garde la fin incomplète pour le prochain message

    for (let pkt of packets) {
        if (!pkt) continue;

        // on enlève seulement les retours à la ligne à la FIN (si le serveur en met)
        pkt = pkt.replace(/\n+$/g, "");

        if (!pkt) continue;
        handleServerLine(pkt);
    }
};

        ws.onerror = (err) => console.error("[WS] ERREUR :", err);
        ws.onclose = () => {
    console.warn("[WS] Déconnexion.");
    stopPingTimer();
};
    }
    // Cette fonction gère la connexion dédiée au Chat et au Groupe
    function ensureDefaultChatRooms() {
        if (!chatRooms.length) {
            upsertChatRoom(1, "Global", 0);
        }

        const factionRooms = {
            1: "MMO",
            2: "EIC",
            3: "VRU"
        };

        if (heroFactionId && factionRooms[heroFactionId]) {
            upsertChatRoom(heroFactionId + 1, factionRooms[heroFactionId], heroFactionId);
        }

        if (heroClanId) {
            upsertChatRoom(heroClanId + 100, "Clan", heroClanId + 100);
        }
    }

    function removeChatRoom(roomId) {
        const idx = chatRooms.findIndex((r) => r.id === roomId);
        if (idx !== -1) {
            chatRooms.splice(idx, 1);
        }
        if (chatBuffers[roomId]) {
            delete chatBuffers[roomId];
        }
    }

    function syncChatRoomsToHero(previousClanId = null) {
        ensureDefaultChatRooms();

        if (previousClanId && previousClanId !== heroClanId) {
            removeChatRoom(previousClanId + 100);
        }

        if (heroClanId) {
            upsertChatRoom(heroClanId + 100, "Clan", heroClanId + 100);
        }

        renderChatTabsSafe();
    }

    // Permet d'éviter les erreurs si l'UI du chat n'est pas encore chargée
    function renderChatTabsSafe(attempt = 0) {
        if (typeof renderChatTabs === 'function') {
            renderChatTabs();
            return;
        }

        if (attempt < 10) {
            setTimeout(() => renderChatTabsSafe(attempt + 1), 100);
        }
    }

    function connectToChat() {
        const url = `ws://${cfg.host}:${cfg.port}`;
        console.log("[CHAT-WS] Connexion au canal Chat/Groupe...");

        chatWs = new WebSocket(url);

        chatWs.onopen = () => {
            console.log("[CHAT-WS] Connecté ! Attente avant init...");

            ensureDefaultChatRooms();
            renderChatTabsSafe();
            
            // On attend 500ms avant d'envoyer le paquet d'auth Chat
            // pour être sûr que le serveur a fini le handshake WebSocket
            setTimeout(() => {
                if (chatWs.readyState === WebSocket.OPEN) {
                    const chatInitCmd = `bu|u|0|${heroId}|${cfg.sessionID}`;
console.log("[CHAT-WS] Envoi INIT :", chatInitCmd);

const payload = chatInitCmd.endsWith("\0") ? chatInitCmd : (chatInitCmd + "\0");
chatWs.send(payload);

                }
            }, 500);
        };

        chatWs.onmessage = (event) => {
    const raw = (event.data ?? "");
    chatBuffer += raw;

    const packets = chatBuffer.split("\0");
    chatBuffer = packets.pop();

    for (let pkt of packets) {
        if (!pkt) continue;
        pkt = pkt.replace(/\n+$/g, "");
        if (!pkt) continue;

        // si tu as déjà une fonction dédiée chat
        if (pkt.indexOf("%") !== -1) handleChatPacket(pkt);
        else handleServerLine(pkt);
    }
};


        chatWs.onerror = (e) => console.warn("[CHAT-WS] Erreur", e);
        
        chatWs.onclose = (e) => {
            console.warn("[CHAT-WS] Fermé (Code: " + e.code + ").");
            // Optionnel : Reconnexion auto si fermé
            // setTimeout(connectToChat, 3000); 
        };
    }

    let chatInitInterval = null;

    function startChatInitMonitor() {
        if (chatInitInterval) return;
        // Lancement du Chat (avec petite sécurité pour être sûr que l'ID est prêt)
        chatInitInterval = setInterval(() => {
            if (heroId && heroId > 0) {
                clearInterval(chatInitInterval);
                chatInitInterval = null;
                connectToChat();
            }
        }, 500);
    }

    window.startNetwork = () => {
        connectToServer();
        startChatInitMonitor();
    };

    // =====================================================
    // TABLE GLOBALE DES HANDLERS DE PACKETS
    // =====================================================

    const PACKET_HANDLERS = {
        "m":   handlePacket_m,
		"i":   handlePacket_i,
        "1":   handlePacket_move,
        "A":   handlePacket_A,
        "RDY": handlePacket_RDY,
        "c":   handlePacket_c,
        "f":   handlePacket_f,
        "H":   handlePacket_H,
        "p":   handlePacket_portal,
        "SMP": handlePacket_SMP,
        "P":   handlePacket_noAttack,
        "O":   handlePacket_O,
        "X":   handlePacket_X,
        "a":   handlePacket_laserAttack,
        "SAB_SHOT": handlePacket_sabShot,
        "v":   handlePacket_rocketAttack,
        "Y":   handlePacket_attackInfo,
        "2":   handlePacket_remove,
                "s": handlePacket_s,
        "S":   handlePacket_S,
        "t":   handlePacket_logoutCancel,
        "C":   handlePacket_C,
        "R":   handlePacket_R,
        "CSS": handlePacket_CSS,
        "UT":  handlePacket_UT,
        "D":   handlePacket_D,
        "U":   handlePacket_U,
        "UI":  handlePacket_UI,
        "POI": handlePacket_POI,
                "E":   handlePacket_E,     // <--- AJOUT
        "T":   handlePacket_T,     // <--- AJOUT
        "b":   handlePacket_b,     // <--- AJOUT (Prix des minerais)
        "B":   handlePacket_B,
        "3":   handlePacket_3,
        "g":   handlePacket_g,
        "LAB": handlePacket_LAB,
                "ps":  handlePacket_ps,   // (Gestion Groupe)
                "N":  handlePacket_N,  // Infos Cible
                "n":  handlePacket_n,   // Attributs
        "y":   handlePacket_y, // Récompenses
                "7":   handlePacket_7,
		"9":   handlePacket_QuestFM,
        "K":   handlePacket_K,  // Explosions
		"TX":  handlePacket_TX
    };

    // Statistiques des packets inconnus (pour debug)
    const unknownPacketStats = {};

    function logUnknownPacket(opcode, parts) {
        if (!unknownPacketStats[opcode]) {
            unknownPacketStats[opcode] = 0;
        }
        unknownPacketStats[opcode]++;

        console.warn(
            "[PACKET INCONNU] opcode =", opcode,
            "| total vus =", unknownPacketStats[opcode],
            "| contenu =", parts.join("|")
        );
    }


    // -------------------------------------------------
    // 3. TRAITEMENT DES PAQUETS
    // -------------------------------------------------

    function handleServerLine(line) {
        const parts = line.split("|");
        if (parts.length === 0) return;

        let opcode;
        let startIndex;

        if (parts[0] === "0") {
            if (parts.length < 2) return;
            opcode = parts[1];
            startIndex = 2;
        } else {
            opcode = parts[0];
            startIndex = 1;
        }

        const handler = PACKET_HANDLERS[opcode];

        if (handler) {
            handler(parts, startIndex);
        } else {
            logUnknownPacket(opcode, parts);
        }
    }
	// ========================================================
    // GESTIONNAIRE PROTOCOLE CHAT (Format: OPCODE%DATA#) - FINAL
    // ========================================================
    const chatRooms = [];
    let chatCurrentRoomId = 1;
    const chatBuffers = {};
	
	    // Fonction utilitaire pour ajouter une ligne dans la fenêtre de chat
    function addChatMessage(name, msg, roomId = chatCurrentRoomId, typeClass = "chatGlobal", clanTag = null, nameClass = null) {
        const buffer = (chatBuffers[roomId] = chatBuffers[roomId] || []);

        let effectiveClass = typeClass || "chatGlobal";
        if (heroClanId && roomId === heroClanId + 100 && typeClass === "chatGlobal") {
            effectiveClass = "chatClan";
        } else if (heroFactionId && roomId === heroFactionId + 1 && typeClass === "chatGlobal") {
            effectiveClass = "chatFaction";
        }

        // Affichage du Tag de Clan s'il existe
        let nameDisplay = name;
        if (clanTag && clanTag.length > 0 && name) {
            nameDisplay = `<span class="chatClanTag">[${clanTag}]</span> ${name}`;
        }

        const safeNameAttr = name ? name.replace(/"/g, '&quot;') : '';

        const nameClasses = ["chatName"];
        if (nameClass) {
            nameClasses.push(nameClass);
        }

        const html = name
            ? `<span class="${nameClasses.join(' ')}" data-name="${safeNameAttr}">${nameDisplay}</span> : ${msg}`
            : msg;

        buffer.push({ html, typeClass: effectiveClass });

        // Si c'est le salon actuellement affiché, on ajoute la ligne dans le DOM
        if (roomId === chatCurrentRoomId) {
            const container = document.getElementById('chatContent');
            if (container) {
                const div = document.createElement('div');
                div.className = "chatLine " + effectiveClass;
                div.innerHTML = html;
                container.appendChild(div);
                container.scrollTop = container.scrollHeight;
            }
        }
    }


    function upsertChatRoom(id, name, faction) {
        const existing = chatRooms.find(r => r.id === id);
        if (existing) {
            existing.name = name;
            existing.faction = faction;
            return existing;
        }
        const room = { id, name, faction };
        chatRooms.push(room);
        return room;
    }

    function handleChatPacket(raw) {
        const clean = raw.endsWith("#") ? raw.slice(0, -1) : raw;
        const separatorIndex = clean.indexOf("%");
        if (separatorIndex === -1) return;

        const opcode = clean.substring(0, separatorIndex);
        const data = clean.substring(separatorIndex + 1);

        if (opcode === "by") {
            // Room definition: id|name|faction|visibility
            const parts = data.split("|");
            if (parts.length >= 2) {
                const roomId = parseInt(parts[0], 10);
                const roomName = parts[1];
                const faction = parseInt(parts[2], 10) || 0;
                if (!isNaN(roomId)) {
                    upsertChatRoom(roomId, roomName, faction);
                    renderChatTabsSafe();
                }
            }
        }
        // 1. MESSAGE JOUEUR STANDARD (a)
        else if (opcode === "a") {
            // Format: ROOM_ID@NOM@MESSAGE@CLAN_TAG#
            const parts = data.split("@");
            if (parts.length >= 3) {
                const roomId = parseInt(parts[0], 10) || 1;
                const name = parts[1];
                const msg = parts[2];
                const clanTag = parts[3] || null; // Lecture du Tag
                addChatMessage(name, msg, roomId, "chatGlobal", clanTag);
            }
        }
        // 2. MESSAGE ADMIN / STAFF (j)
        else if (opcode === "j") {
            // Format Flash: ROOM_ID@NOM@MESSAGE@ADMIN_LEVEL[@CLAN_TAG]
            const parts = data.split("@");
            if (parts.length >= 4) {
                const roomId = parseInt(parts[0], 10) || 1;
                const name = parts[1];
                const msg = parts[2];
                const adminLevel = parseInt(parts[3], 10);
                const clanTag = parts[4] || null;
                const staffClass = adminLevel > -1 && adminLevel < 3 ? "chatSupporter" : "chatMod";
                addChatMessage(name, msg, roomId, staffClass, clanTag, staffClass);
            }
        }
        // MESSAGE SYSTÈME (dq)
        else if (opcode === "dq") {
            const textOnly = data.replace(/<[^>]*>?/gm, "");
            addChatMessage(null, textOnly, chatCurrentRoomId, "chatSystem");
        }
        // WHISPER SENT
        else if (opcode === "cw") {
            const parts = data.split("@");
            if (parts.length >= 2) {
                const target = parts[0];
                const msg = parts[1];
                addChatMessage(null, `[À ${target}] ${msg}`, chatCurrentRoomId, "chatWhisper");
            }
        }
        // WHISPER RECEIVED
        else if (opcode === "cv") {
            const parts = data.split("@");
            if (parts.length >= 2) {
                const sender = parts[0];
                const msg = parts[1];
                addChatMessage(null, `[De ${sender}] ${msg}`, chatCurrentRoomId, "chatWhisper");
            }
        }
    }
	
// ========================================================
// GESTION DES PAQUETS DE GROUPE (PS) - FIX FINAL
// ========================================================
function handlePacket_ps(parts) {
    if (parts.length < 3) return;

    const INVITE_ERROR_MESSAGES = {
        full: "Le groupe est plein.",
        cig: "Le joueur est déjà dans un groupe.",
        cna: "Le joueur n'est pas disponible.",
        cnx: "Joueur introuvable.",
        inx: "Invitant introuvable.",
        noi: "Aucune invitation en cours.",
        boss: "Seul le chef peut inviter.",
        mxi: "Trop d'invitations envoyées.",
        mxc: "Trop d'invitations reçues.",
        blk: "Invitations bloquées par la cible.",
        spam: "Invitation considérée comme spam.",
        dpl: "Invitation déjà envoyée."
    };

    const action = (parts[2] || "").toLowerCase();

    const refreshGroupUi = () => {
        if (typeof forceGroupUiUpdate === "function") {
            forceGroupUiUpdate();
        }
    };

    const resetGroup = (showMessage) => {
        for (const k in groupMembers) delete groupMembers[k];
        groupLeaderId = null;
        pendingGroupInvite = null;

for (const k in groupIncomingInvites) delete groupIncomingInvites[k];
for (const k in groupOutgoingInvites) delete groupOutgoingInvites[k];

groupInvitationBehavior = 0;

        if (showMessage) addInfoMessage("Groupe dissous.");
        refreshGroupUi();
    };

    const parseMemberBlock = (block, orderIdx) => {
        const name = block[0];
        const id = parseInt(block[1], 10);
        if (!name || isNaN(id)) return null;
        const member = {
            name,
            id,
            hp: parseInt(block[2], 10) || 0,
            maxHp: parseInt(block[3], 10) || 0,
            shield: parseInt(block[4], 10) || 0,
            maxShield: parseInt(block[5], 10) || 0,
            mapId: parseInt(block[6], 10) || 0,
            posX: parseInt(block[7], 10) || 0,
            posY: parseInt(block[8], 10) || 0,
            level: parseInt(block[9], 10) || 0,
            activity: Boolean(parseInt(block[10], 10)),
            cloaked: Boolean(parseInt(block[11], 10)),
            fighting: Boolean(parseInt(block[12], 10)),
            factionId: parseInt(block[13], 10) || 0,
            targetId: parseInt(block[14], 10) || 0,
            clanTag: block[15] || "",
            shipType: parseInt(block[16], 10) || 0,
            isOffline: Boolean(parseInt(block[17], 10)),
            order: orderIdx
        };
        return member;
    };

    if (action === "err") {
        const sub = (parts[3] || "").toLowerCase();
        if (sub === "conn") {
            resetGroup(true);
            pendingGroupInvite = null;
        } else if (sub === "a" || sub === "f" || sub === "png") {
            addInfoMessage("Action de groupe impossible.");
        }
        return;
    }

    if (action === "inv") {
        const subAction = (parts[3] || "").toLowerCase();
        if (subAction === "new") {
            const inviterId = parseInt(parts[4], 10);
            const inviterName = parts[5];
            const candidateId = parseInt(parts[7] || parts[6], 10);
            const candidateName = parts[8] || parts[6] || "";
            const myHeroId = parseInt(heroId, 10);

            if (!isNaN(myHeroId) && candidateId === myHeroId) {
    // Invitation ENTRANTE
    groupIncomingInvites[inviterId] = { id: inviterId, name: inviterName };

    // Compat (touche Enter dans client_entities.js)
    pendingGroupInvite = { id: inviterId, name: inviterName };

    addInfoMessage(`Invitation groupe reçue de ${inviterName}`);
} else if (!isNaN(myHeroId) && inviterId === myHeroId && candidateName && !isNaN(candidateId)) {
    // Invitation SORTANTE
    groupOutgoingInvites[candidateId] = { id: candidateId, name: candidateName };

    addInfoMessage(`Invitation envoyée à ${candidateName}.`);
}
refreshGroupUi();

        } else if (subAction === "del") {
            const reason = parts[4];
            const inviterId = parseInt(parts[5], 10);
            const candidateId = parseInt(parts[6], 10);
			if (!isNaN(inviterId)) delete groupIncomingInvites[inviterId];
if (!isNaN(candidateId)) delete groupOutgoingInvites[candidateId];

            if (pendingGroupInvite && (pendingGroupInvite.id === inviterId || pendingGroupInvite.id === candidateId)) {
                pendingGroupInvite = null;
            }
            if (reason === "ack") {
                addInfoMessage("Invitation acceptée.");
            } else if (reason === "rj" || reason === "rjc") {
                addInfoMessage("Invitation refusée.");
            } else if (reason === "rv") {
                addInfoMessage("Invitation révoquée.");
            }
            refreshGroupUi();
        } else if (subAction === "err") {
            const code = parts[4];
            if (INVITE_ERROR_MESSAGES[code]) {
                addInfoMessage(INVITE_ERROR_MESSAGES[code]);
            }
        }
        return;
    }

    if (action === "init") {
        const subAction = (parts[3] || "").toLowerCase();
        if (subAction === "grp") {
            for (const k in groupMembers) delete groupMembers[k];
            groupLeaderId = null;

            const groupId = parseInt(parts[4], 10) || 0;
            const sizeCurrent = parseInt(parts[5], 10) || 0;
            const sizeMax = parseInt(parts[6], 10) || 0;
            groupInvitationBehavior = parseInt(parts[7], 10) || 0;
            const lootMode = parseInt(parts[8], 10) || 0;
            const memberFields = parts.slice(9);

            const myHeroId = parseInt(heroId, 10);

let orderIdx = 1;
while (memberFields.length >= 19) {
    const block = memberFields.splice(0, 19);
    const member = parseMemberBlock(block, orderIdx);
    if (!member) continue;

    // Le leader est toujours le 1er bloc côté serveur (même si c'est toi)
    if (orderIdx === 1) {
        groupLeaderId = member.id;
    }

    // IMPORTANT : ne pas afficher/stock-er le héros dans la liste du groupe
    if (!isNaN(myHeroId) && member.id === myHeroId) {
        orderIdx++;
        continue;
    }

    groupMembers[member.id] = member;
    orderIdx++;
}

            if (Object.keys(groupMembers).length > 0) {
                addInfoMessage("Groupe formé !");
            }
            refreshGroupUi();
        }
        return;
    }

    if (action === "upd") {
        const memId = parseInt(parts[3], 10);
        const xmlData = parts[4];
        if (groupMembers[memId] && xmlData) {
            const extract = (key) => {
                const match = xmlData.match(new RegExp(`${key}="(\\d+)"`));
                return match ? parseInt(match[1], 10) : null;
            };

            const hp = extract("hp");
            const maxHp = extract("hpM");
            const sh = extract("sh");
            const maxSh = extract("shM");
            const map = extract("map");
            const pos = xmlData.match(/pos="(\d+),(\d+)"/);
            const level = extract("lev");
            const faction = extract("fra");
            const act = extract("act");
            const clk = extract("clk");
            const tgt = extract("tgt");
            const shp = extract("shp");
            const fgt = extract("fgt");
            const off = extract("lgo");

            if (hp !== null) groupMembers[memId].hp = hp;
            if (maxHp !== null) groupMembers[memId].maxHp = maxHp;
            if (sh !== null) groupMembers[memId].shield = sh;
            if (maxSh !== null) groupMembers[memId].maxShield = maxSh;
            if (map !== null) groupMembers[memId].mapId = map;
            if (pos) {
                groupMembers[memId].posX = parseInt(pos[1], 10);
                groupMembers[memId].posY = parseInt(pos[2], 10);
            }
            if (level !== null) groupMembers[memId].level = level;
            if (faction !== null) groupMembers[memId].factionId = faction;
            if (act !== null) groupMembers[memId].activity = Boolean(act);
            if (clk !== null) groupMembers[memId].cloaked = Boolean(clk);
            if (tgt !== null) groupMembers[memId].targetId = tgt;
            if (shp !== null) groupMembers[memId].shipType = shp;
            if (fgt !== null) groupMembers[memId].fighting = Boolean(fgt);
            if (off !== null) groupMembers[memId].isOffline = Boolean(off);

            refreshGroupUi();
        }
        return;
    }

    if (action === "lp") {
        const reason = parts[3];
        const targetId = parseInt(parts[4], 10);
        if (targetId === parseInt(heroId, 10)) {
            resetGroup(true);
            return;
        }
        if (groupMembers[targetId]) {
            let msg = `${groupMembers[targetId].name} a quitté le groupe.`;
            if (reason === "kick") msg = `${groupMembers[targetId].name} a été exclu du groupe.`;
            addInfoMessage(msg);
            delete groupMembers[targetId];
            if (groupLeaderId === targetId) groupLeaderId = null;
            refreshGroupUi();
        }
        return;
    }

    if (action === "png") {
        const gx = parseInt(parts[3], 10);
        const gy = parseInt(parts[4], 10);
        if (!isNaN(gx) && !isNaN(gy)) {
            groupPings.push({ x: gx, y: gy, createdAt: performance.now() });
            addInfoMessage("Ping de groupe reçu.");
        }
        return;
    }

    if (action === "kill") {
        const targetId = parseInt(parts[3], 10);
        if (groupMembers[targetId]) {
            groupMembers[targetId].hp = 0;
            addInfoMessage(`${groupMembers[targetId].name} est détruit.`);
            refreshGroupUi();
        }
        return;
    }

    if (action === "jump") {
        const targetId = parseInt(parts[3], 10);
        const newMap = parseInt(parts[4], 10);
        if (groupMembers[targetId] && !isNaN(newMap)) {
            groupMembers[targetId].mapId = newMap;
            refreshGroupUi();
        }
        return;
    }

    if (action === "end") {
        resetGroup(true);
        return;
    }

    if (action === "nl") {
    const leaderId = parseInt(parts[3], 10);
    if (isNaN(leaderId)) return;

    // IMPORTANT : le héros n'est pas dans groupMembers (par design),
    // donc on doit mettre à jour groupLeaderId même si leaderId === heroId.
    groupLeaderId = leaderId;

    const myHeroId = parseInt(heroId, 10);

    if (!isNaN(myHeroId) && leaderId === myHeroId) {
        addInfoMessage("Vous êtes le chef.");
    } else if (groupMembers[leaderId]) {
        addInfoMessage(`${groupMembers[leaderId].name} est le chef.`);
    } else {
        // fallback si on n'a pas le membre en cache
        addInfoMessage("Changement de chef du groupe.");
    }

    refreshGroupUi();
    return;
}


    if (action === "chib") {
        const behavior = parseInt(parts[3], 10);
        groupInvitationBehavior = behavior;
        refreshGroupUi();
        return;
    }

    if (action === "blk") {
        groupInvitesBlocked = Boolean(parseInt(parts[3], 10));
        addInfoMessage(groupInvitesBlocked ? "Invitations de groupe bloquées." : "Invitations de groupe autorisées.");
        refreshGroupUi();
        return;
    }
}

// Info Cible (HP/Shield précis)
function handlePacket_N(parts, i) {
    // 0|N|id|nom|sh|maxSh|hp|maxHp
    const id = parseInt(parts[i], 10);
    const name = parts[i + 1] || "";
    const shield = parseInt(parts[i + 2], 10);
    const maxShield = parseInt(parts[i + 3], 10);
    const hp = parseInt(parts[i + 4], 10);
    const maxHp = parseInt(parts[i + 5], 10);

    if (isNaN(id)) return;

        if (heroId !== null && id === heroId) {
            if (!isNaN(shield))    heroShield = shield;
            if (!isNaN(maxShield)) heroMaxShield = maxShield;
            if (!isNaN(hp))        heroHp = hp;
            if (!isNaN(maxHp))     heroMaxHp = maxHp;
        } else {
            const ent = ensureEntity(id);
            if (name) ent.name = name;
            if (!isNaN(shield))    ent.shield = shield;
            if (!isNaN(maxShield)) ent.maxShield = maxShield;
            if (!isNaN(hp))        ent.hp = hp;
            if (!isNaN(maxHp))     ent.maxHp = maxHp;

            if (ent.hp != null && ent.maxHp != null && ent.hp >= ent.maxHp) {
                clearEntityClaim(id);
            }
        }
}

// Gestion du changement de carte (Jump)
    function resetMapState(newMapId) {
		resetReadyFlags();

        if (!isNaN(newMapId)) {
            currentMapId = newMapId;
            cfg.mapID = newMapId;
        }

        applyMapBackground(currentMapId);

        for (const id in entities) delete entities[id];
        for (const id in portals) delete portals[id];
        if (Array.isArray(stations)) {
            stations.length = 0;
        }

        laserBeams.length = 0;
        rocketAttacks.length = 0;
        if (Array.isArray(rocketSmokeParticles)) rocketSmokeParticles.length = 0;
        damageBubbles.length = 0;
        explosions.length = 0;
        smartbombEffects.length = 0;
        groupPings.length = 0;

        selectedTargetId = null;
        currentLaserTargetId = null;
        attackIntentTargetId = null;
        resetPendingRangeResume();
        clearPendingCollectState();
        if (typeof collectedBoxRequestIds !== "undefined") collectedBoxRequestIds.clear();
        if (typeof stopHeroCollectorBeam === "function") stopHeroCollectorBeam();
        moveTargetX = null;
        moveTargetY = null;
		moveTargetFromMinimap = false;
        isChasingTarget = false;

        inDemilitarizedZone = false;
        inTradeZone = false;
        inJumpZone = false;
        radiationServerFlag = false;
        radiationWarningActive = false;
        radiationFade = 0;
        radiationPulseStart = 0;
        radiationFlashAlpha = 0;
        stopRadiationWarningTimer();

        
    }

    function handlePacket_i(parts, i) {
        const newMapId = parseInt(parts[i], 10);
        if (isNaN(newMapId)) return;

        console.log("[MAP] Changement de carte vers : " + newMapId);

        resetMapState(newMapId);
    }

// GESTION DES ATTRIBUTS & SPACEBALL (n)
    function handlePacket_n(parts, i) {
        if (parts.length < i + 1) return;
        const sub = parts[i]; // ex: ssi, ssc, d, emp ...

        // --- EFFET EMP / IEM ---
        if (sub && sub.toUpperCase() === "EMP") {
            const targetId = parseInt(parts[i + 1], 10);

            if (!isNaN(targetId)) {
                const now = performance.now();
                const rawSelfFlag = parts[i + 2];
                const isHeroTarget = targetId === heroId;
                const isSelfActivation = isHeroTarget && (() => {
                    if (rawSelfFlag !== undefined && rawSelfFlag !== null) {
                        const flag = rawSelfFlag.toString().toUpperCase();
                        if (flag === "1" || flag === "SELF" || flag === "ME" || flag === "OWN") return true;
                        if (flag === "0" || flag === "ENEMY" || flag === "OTHER") return false;
                    }
                    return lastHeroEmpActivationAt && (now - lastHeroEmpActivationAt) < 1000;
                })();

                if (isHeroTarget) {
                    heroEmpImmunityUntil = now + 2000;
                    heroTargetFaded = true;
                    heroTargetFadeUntil = now + 2000;
                    if (!isSelfActivation) {
                        heroInvisible = false;
                        heroCloaked = false;
                    }
                } else {
                    const ent = ensureEntity(targetId);
                    if (ent) {
                        ent.empImmunityUntil = now + 2000;
                        ent.targetFaded = true;
                        ent.targetFadeUntil = now + 2000;
                        ent.invisible = false;
                    }
                }

                spawnEmpEffect(targetId);
            }

            // Animation (Optionnel : tu pourras ajouter un effet visuel ici plus tard)

            // Si ma CIBLE utilise un IEM
            if (selectedTargetId === targetId) {
                addInfoMessage("Cible : IEM activé ! Verrouillage perdu.");

                // 1. On perd la cible
                selectedTargetId = null;
                resetPendingRangeResume();

                // 2. On arrête le laser
                if (currentLaserTargetId === targetId) {
                    currentLaserTargetId = null;
                    // On peut envoyer un stop au serveur pour être sûr
                    sendLaserStop(targetId, true);
                }

                // 3. On arrête de courir
                isChasingTarget = false;
                moveTargetX = null;
                moveTargetY = null;
				moveTargetFromMinimap = false;
            }
        }

        // --- INSTA SHIELD BROADCAST ---
        else if (sub === "ISH") {
            const targetId = parseInt(parts[i + 1], 10);
            if (!isNaN(targetId)) {
                if (targetId === heroId) setHeroShieldEffect("ISH", true, ISH_DURATION_MS);
                else setEntityShieldEffect(ensureEntity(targetId), "ISH", true, ISH_DURATION_MS);
            }
        }

        // --- INVISIBILITÉ / CAMOUFLAGE ---
        else if (sub === "INV") {
            const targetId = parseInt(parts[i + 1], 10);
            const state = parseInt(parts[i + 2], 10);
            const invisible = state === 1;

            if (!isNaN(targetId)) {
                if (targetId === heroId) {
                    heroInvisible = invisible;
                    heroCloaked = invisible;
                } else {
                    const ent = ensureEntity(targetId);
                    if (ent) {
                        ent.invisible = invisible;
                        if (invisible && selectedTargetId === targetId) {
                            selectedTargetId = null;
                            resetPendingRangeResume();
                            if (currentLaserTargetId === targetId) {
                                currentLaserTargetId = null;
                                sendLaserStop(targetId, true);
                            }
                        }
                    }
                }
            }
        }

        // --- SMARTBOMB PYRO EFFECT ---
        else if (sub === "SMB") {
            const targetId = parseInt(parts[i + 1], 10);
            if (!isNaN(targetId)) {
                let fxX = null;
                let fxY = null;

                if (targetId === heroId) {
                    fxX = shipX;
                    fxY = shipY;
                } else {
                    const ent = ensureEntity(targetId);
                    if (ent) {
                        fxX = ent.x;
                        fxY = ent.y;
                    }
                }

                if (fxX != null && fxY != null) {
                    const isHeroTarget = targetId === heroId;
                    spawnSmartbombEffect(fxX, fxY, isHeroTarget);
                }
            }
        }

        // --- TARGET FADE TO GRAY (LSH / USH) ---
        else if (sub === "LSH") {
            const targetId = parseInt(parts[i + 1], 10);
            if (!isNaN(targetId)) {
                if (targetId === heroId) heroTargetFaded = true;
                else {
                    const ent = ensureEntity(targetId);
                    if (ent) ent.targetFaded = true;
                }
            }
        }
        else if (sub === "USH") {
            const targetId = parseInt(parts[i + 1], 10);
            if (!isNaN(targetId)) {
                if (targetId === heroId) heroTargetFaded = false;
                else if (entities[targetId]) entities[targetId].targetFaded = false;
            }
        }
        
        // --- SPACEBALL INIT (ssi) ---
        else if (sub === "ssi") {
            const mmo = parseInt(parts[i+1], 10);
            const eic = parseInt(parts[i+2], 10);
            const vru = parseInt(parts[i+3], 10);
            const spd = parseInt(parts[i+4], 10);
            const own = parseInt(parts[i+5], 10);
            updateSpaceballHUD(mmo, eic, vru, spd, own);
        }
        
        // --- SPACEBALL SCORE UPDATE (ssc) ---
        else if (sub === "ssc") {
            const faction = parseInt(parts[i+1], 10);
            const score   = parseInt(parts[i+2], 10);
            
            if (faction === 1) updateSpaceballHUD(score, null, null, null, null);
            if (faction === 2) updateSpaceballHUD(null, score, null, null, null);
            if (faction === 3) updateSpaceballHUD(null, null, score, null, null);
        }

        // --- EFFETS VISUELS DÉDIÉS ---
        else if (sub === "fx") {
            const action = (parts[i + 1] || "").toLowerCase();
            const effect = (parts[i + 2] || "").toUpperCase();
            const targetId = parseInt(parts[i + 3], 10);

            if (!isNaN(targetId)) {
                const targetEnt = targetId === heroId ? null : ensureEntity(targetId);

                const activate = (action === "start");
                if (effect === "INVINCIBILITY") {
                    if (targetId === heroId) setHeroShieldEffect("INVINCIBILITY", activate, INVINCIBILITY_DURATION_MS);
                    else setEntityShieldEffect(targetEnt, "INVINCIBILITY", activate, INVINCIBILITY_DURATION_MS);
                } else if (effect === "ISH") {
                    if (targetId === heroId) setHeroShieldEffect("ISH", activate, ISH_DURATION_MS);
                    else setEntityShieldEffect(targetEnt, "ISH", activate, ISH_DURATION_MS);
                } else if (effect === "BATTLE_REP_BOT" || effect === "TECH_BATTLE_REP_BOT_EFFECT" || parseInt(effect, 10) === 12) {
                    if (targetId === heroId && typeof setHeroBattleRepairing === "function") {
                        const durationSeconds = parseInt(parts[i + 4], 10);
                        const durationMs = !isNaN(durationSeconds) ? durationSeconds * 1000 : null;
                        setHeroBattleRepairing(activate, durationMs);
                    }
                }
            }
        }
        
        // --- SPACEBALL STATUS (sss) ---
        else if (sub === "sss") {
            const owner = parseInt(parts[i+1], 10);
            const speed = parseInt(parts[i+2], 10);
            updateSpaceballHUD(null, null, null, speed, owner);
        }
        
        // --- DRONES (d) ---
        else if (sub === "d") {
            const targetId = parseInt(parts[i + 1], 10);
            const droneStr = parts[i + 2] || "";

            const parsedDrones = parseDrones(droneStr);
            
            if (targetId === heroId) {
                window.heroDrones = parsedDrones;
            } else {
                const ent = ensureEntity(targetId);
                if (ent) {
                    ent.drones = parsedDrones;
                }
            }
        }
    }

    var DRONE_GROUP_RADIUS = (typeof DRONE_GROUP_RADIUS !== "undefined") ? DRONE_GROUP_RADIUS : 75; // game.xml patterns.drones.@groupRadius
    var DRONE_RADIUS = (typeof DRONE_RADIUS !== "undefined") ? DRONE_RADIUS : 15;                   // game.xml patterns.drones.drone.@droneRadius
    var DRONE_GROUP_DIMENSION = DRONE_GROUP_RADIUS * 2;

    const DRONE_POSITION_TOP = 0;
    const DRONE_POSITION_RIGHT = 1;
    const DRONE_POSITION_DOWN = 2;
    const DRONE_POSITION_LEFT = 3;
    const DRONE_POSITION_CENTER = 4;

    function resolveDroneKind(typeId) {
        // Dans le client Flash, les types 1 = Flax, 2/3 = Iris (et dérivés). Ici on ne gère
        // que Flax/Iris au niveau max : on mappe 1 -> "flax", tout le reste -> "iris".
        if (typeId === 1) return "flax";
        return "iris";
    }

    function resolveDroneRadius(typeId, level) {
        // Les patterns du client Flash donnent un radius de 15px pour les deux types (levels 0..5).
        // En Flash, Drone.droneDimension = droneRadius * 2 (diamètre) pour calculer l'offset.
        // On renvoie donc le diamètre pour coller au positionnement original.
        if (!Number.isFinite(typeId) || !Number.isFinite(level)) return DRONE_RADIUS * 2;
        return DRONE_RADIUS * 2;
    }

    function mapGroupPosition(groupCount, groupIndex) {
        if (groupCount === 1) return DRONE_POSITION_DOWN;
        if (groupCount === 2) return (groupIndex === 0) ? DRONE_POSITION_LEFT : DRONE_POSITION_RIGHT;
        if (groupCount === 3) {
            if (groupIndex === 0) return DRONE_POSITION_RIGHT;
            if (groupIndex === 1) return DRONE_POSITION_DOWN;
            return DRONE_POSITION_LEFT;
        }
        // groupCount >= 4
        if (groupIndex === 0) return DRONE_POSITION_RIGHT;
        if (groupIndex === 1) return DRONE_POSITION_DOWN;
        if (groupIndex === 2) return DRONE_POSITION_LEFT;
        return DRONE_POSITION_TOP;
    }

    function mapDronePosition(droneCount, droneIndex) {
        if (droneCount === 1) return DRONE_POSITION_CENTER;
        if (droneCount === 2) return droneIndex === 0 ? DRONE_POSITION_LEFT : DRONE_POSITION_RIGHT;
        if (droneCount === 3) {
            if (droneIndex === 0) return DRONE_POSITION_TOP;
            if (droneIndex === 1) return DRONE_POSITION_RIGHT;
            return DRONE_POSITION_LEFT;
        }
        // droneCount >= 4
        if (droneIndex === 0) return DRONE_POSITION_TOP;
        if (droneIndex === 1) return DRONE_POSITION_RIGHT;
        if (droneIndex === 2) return DRONE_POSITION_LEFT;
        return DRONE_POSITION_DOWN;
    }

    function parseDrones(droneStr) {
        const emptyResult = { groupCount: 0, groupDimension: DRONE_GROUP_DIMENSION, groups: [] };
        if (!droneStr || typeof droneStr !== "string") return emptyResult;

        const trimmed = droneStr.trim();
        if (!trimmed) return emptyResult;

        // Format original du client Flash (voir parseDroneString) :
        // "<nbGroupes>/<nbDrones>-<d1>-<d2>.../<nbDrones>-<d1>-..."
        // Exemple pour 8 drones (4 groupes de 2) :
        // "4/2-21-21/2-21-21/2-21-21/2-21-21"
        const segments = trimmed.split('/').filter(s => s !== "");
        if (!segments.length) return emptyResult;

        const groupCount = parseInt(segments.shift(), 10);
        if (!Number.isFinite(groupCount) || groupCount <= 0) return emptyResult;

        const groups = [];
        for (let i = 0; i < segments.length; i++) {
            const rawGroup = segments[i];
            if (!rawGroup) continue;

            const parts = rawGroup.split('-').filter(p => p !== "");
            if (!parts.length) continue;

            const droneCount = parseInt(parts.shift(), 10);
            if (!Number.isFinite(droneCount) || droneCount <= 0) continue;

            const drones = [];
            for (let j = 0; j < parts.length; j++) {
                const token = parts[j];
                const tokenParts = token.split(',');
                const digits = (tokenParts[0] || "").trim();
                if (digits.length < 2) continue;

                const typeId = parseInt(digits.charAt(0), 10);
                const level = parseInt(digits.charAt(1), 10);

                drones.push({
                    type: Number.isNaN(typeId) ? null : typeId,
                    kind: resolveDroneKind(typeId),
                    level: Number.isNaN(level) ? null : level,
                    position: mapDronePosition(droneCount, j),
                    dimension: resolveDroneRadius(typeId, level)
                });
            }

            if (drones.length) {
                groups.push({
                    position: mapGroupPosition(groupCount, i),
                    drones
                });
            }
        }

        return { groupCount, groupDimension: DRONE_GROUP_DIMENSION, groups };
    }


    function handlePacket_S(parts, i) {
        if (parts.length < i + 1) return;
        const subOpcode = parts[i];

        switch (subOpcode) {
            case "CFG": {
                const cfgId = parseInt(parts[i + 1], 10);
                if (!isNaN(cfgId)) {
                    heroConfig = cfgId;
                    
                }
                break;
            }
            case "ROB": {
                addInfoMessage("Réparation en cours / confirmée.");
                if (typeof setHeroRepairing === "function") {
                    setHeroRepairing(true);
                }
                break;
            }
            case "ISH": {
                const state = (parts[i + 1] || "1").toString().toUpperCase();
                const active = (state === "1" || state === "ON" || state === "TRUE");
                setHeroShieldEffect("ISH", active, ISH_DURATION_MS);
                addInfoMessage(heroIshActive ? "ISH (Insta-shield) activé." : "ISH terminé.");
                break;
            }
            case "SMB": {
                const state = (parts[i + 1] || "1").toString().toUpperCase();
                heroSmbJustUsed = (state === "1" || state === "ON" || state === "TRUE");
                addInfoMessage("Smartbomb déclenchée.");
                break;
            }
            case "EMP": {
                const state = (parts[i + 1] || "1").toString().toUpperCase();
                heroEmpActive = (state === "1" || state === "ON" || state === "TRUE");
                if (heroEmpActive) lastHeroEmpActivationAt = performance.now();
                else lastHeroEmpActivationAt = 0;
                addInfoMessage(heroEmpActive ? "EMP activé." : "EMP terminé.");
                break;
            }
            case "CLK": {
                const state = (parts[i + 1] || "1").toString().toUpperCase();
                heroCloaked = (state === "1" || state === "ON" || state === "TRUE");
                addInfoMessage(heroCloaked ? "Camouflage activé." : "Camouflage désactivé.");
                break;
            }
            default: break;
        }
    }
    
        function triggerSlot(slot) {
        const item = quickSlots[slot];
        if (!item) return;

        // 1. Récupération du code d'action pour cooldown
        const actionCode = getActionCodeForSlot(slot);

        if (actionCode && isActionBlacklisted(actionCode)) {
    // Flash-like : pas de message
    return;
}

        // 3. Vérification Cooldown (Sauf pour les munitions qui n'ont pas de CD global client)
        if (item.type !== "ammo") {
    const cd = actionCode ? getCooldownInfo(actionCode) : null;
    if (cd) {
        // Flash-like : pas de message texte, on bloque juste l’action
        return;
    }
}

        // 4. LOGIQUE SPÉCIFIQUE TYPE FLASH
        if (item.type === "ammo") {
            // Gestion spéciale du RSB : sélection temporaire + retour auto
            if (item.id === RSB_AMMO_ID) {
                if (isActionOnCooldown("RSB")) {
    // Flash-like : pas de message
    return;
}

                triggerRsbBurst();
            } else if (currentAmmoId !== item.id) {
                sendSelectAmmo(item.id);
            }

            // 2. NOUVEAU : Si on a une cible, on attaque !
            if (selectedTargetId !== null) {
    sendLaserAttack(selectedTargetId);

    // ✅ Flash-like : poursuite seulement si hors range
    const t = entities[selectedTargetId];
    if (t) {
        const dist = Math.hypot(t.x - shipX, t.y - shipY);
        isChasingTarget = dist > LASER_MAX_RANGE;
    } else {
        isChasingTarget = false;
    }
}

        }
        else if (item.type === "rocket") {
            // Sélection uniquement
            if (currentRocketId !== item.id) {
                sendSelectRocket(item.id);
            }
        }
        else if (item.type === "tech") {
            // Activation immédiate
            sendTechActivation(item.id);
        } 
        else if (item.type === "cpu") {
            // Activation immédiate
            sendCpuAction(item.code);
        }
        else if (item.type === "mine") {
            // Pose de mine immédiate (touche M par défaut dans Flash, ou via slot)
            sendRaw("u|m|" + item.id); // Format standard mine
        }
    }


        function handlePacket_m(parts, i) {
        // Paquet "m" : informations de map (centre, debug)
        // Format possible (futur) :
        //  - "m|1|centerX|centerY"
        //  - "0|m|1|centerX|centerY"
        
        let start = i;

        // Cas où la ligne commence par "0|m|..."
        if (parts[0] === "0" && parts[1] === "m") {
            start = 2;
        }

        if (parts.length < start + 3) return;

        const mode = parseInt(parts[start], 10) || 0;
        const cx   = parseInt(parts[start + 1], 10);
        const cy   = parseInt(parts[start + 2], 10);

        if (isNaN(cx) || isNaN(cy)) return;

        mapCenterX = cx;
        mapCenterY = cy;

        console.log(`[MAP] Packet m (mode=${mode}) center=(${cx},${cy})`);
		mapLoaded = true;
trySendRdyMap();
    }


    function handlePacket_H(parts, i) {
        if (parts.length < i + 2) return;
        const x = parseInt(parts[i], 10);
        const y = parseInt(parts[i + 1], 10);
        if (!isNaN(x) && !isNaN(y)) {
            shipX = x;
            shipY = y;
            cameraX = shipX;
            cameraY = shipY;
        }
    }

    function handlePacket_move(parts, i) {
        // Format attendu: 1|ID|X|Y|TIME ou 1|X|Y|TIME
        const remaining = parts.length - i;
        if (remaining < 3) return;

        let id = 0;
        let x = 0;
        let y = 0;
        let time = 0;
        let isHeroCorrection = false;

        // Détermination du format
        if (remaining === 3) {
            // Format court (1|X|Y|TIME) - Ancienne correction lag
            x = parseInt(parts[i], 10);
            y = parseInt(parts[i + 1], 10);
            time = parseFloat(parts[i + 2] || "0");
            id = heroId; // On force l'ID du héros
            isHeroCorrection = true;

        } else if (remaining >= 4) {
            // Format long (1|ID|X|Y|TIME) - Mouvements d'entités et Follow du Héros
            id = parseInt(parts[i], 10);
            x = parseInt(parts[i + 1], 10);
            y = parseInt(parts[i + 2], 10);
            time = parseFloat(parts[i + 3] || "0");
            
            if (id === heroId) {
                isHeroCorrection = true;
            }
        } else {
            return;
        }

        if (isNaN(id) || isNaN(x) || isNaN(y)) return;


        // --- LOGIQUE HÉROS (Valable pour le Follow et les clics sol) ---
        if (isHeroCorrection) {
            // On accepte la destination donnée par le serveur (Follow ou Clic Sol)
            moveTargetX = x;
            moveTargetY = y;
            
            // Si c'est une téléportation (distance énorme > 2000), on se téléporte direct
            const dist = Math.hypot(x - shipX, y - shipY);
            if (dist > 2000) {
                shipX = x;
                shipY = y;
                moveTargetX = null;
                moveTargetY = null;
				moveTargetFromMinimap = false;
            }
            return;
        }
        
        // --- LOGIQUE ENTITÉS (NPC / Autres joueurs) ---
        
        const ent = ensureEntity(id);
        
        if (ent.kind === "box") return; // On n'anime pas les boîtes

        if (ent.kind === "unknown") ent.kind = "player";

        // Initialisation ou Mouvement Interpolé
        if (ent.interp.duration === 0 && ent.x === 0 && ent.y === 0) {
            ent.x = x; ent.y = y;
            ent.interp.startX = x; ent.interp.startY = y;
            ent.interp.endX = x; ent.interp.endY = y;
            ent.interp.duration = 0; ent.interp.startTime = performance.now();
        } else {
            ent.interp.startX = ent.x; 
            ent.interp.startY = ent.y;
            ent.interp.endX = x; 
            ent.interp.endY = y;
            ent.interp.duration = (time > 0 ? time : 0);
            ent.interp.startTime = performance.now();
        }
    }

    function handlePacket_A(parts, i) {
    if (parts.length < i + 1) return;
    const subOpcode = parts[i];

    switch (subOpcode) {
        // --- GESTION MISE A JOUR UNITAIRE (C = Count) ---
        // Ce paquet sert à mettre à jour une munition précise en temps réel
        case "C": {
            const itemType = parseInt(parts[i + 1], 10);
            const itemQty  = parseInt(parts[i + 2], 10);

            if (!isNaN(itemType) && !isNaN(itemQty)) {
                if (typeof ammoStock !== 'undefined') {
                    ammoStock[itemType] = itemQty;
                }
                if (typeof renderActionDrawerItems === 'function') {
                    renderActionDrawerItems();
                }
                if (typeof drawQuickbar === 'function') {
                    drawQuickbar();
                }
            }
            break;
        }

        case "STD": {
            const msg = parts[i + 1] || "";
            const clean = msg.replace(/~/g, "").trim();
            addInfoMessage(clean);
            break;
        }
        case "BK": {
            const count = parseInt(parts[i + 1], 10);
            if (!isNaN(count)) {
                heroBootyKeys = count;
            }
            break;
        }
        case "BS": {
            const payload = parts[i + 1] || "";
            const values = payload.split("/").map((value) => parseInt(value, 10) || 0);
            if (typeof updateBoosterStatus === "function") {
                updateBoosterStatus(values);
            } else {
                window.boosterStatus = values;
            }
            break;
        }

        case "TX": {
            handleTechAction(parts, i + 1);
            break;
        }

        // --- CORRECTION DU BUG DES MUNITIONS VIDES ---
        case "ITM": { 
            // NOTE : Le serveur Andromeda envoie un paquet ITM avec des zéros au login.
            // Cela écrase les bonnes valeurs reçues par les paquets "B" et "3".
            // J'ai commenté les lignes qui écrasent les Lasers et Roquettes pour corriger le bug.
            
            // --- LASERS (Désactivé pour ne pas écraser le paquet 'B') ---
            // ammoStock[1] = parseInt(parts[i + 1], 10) || 0;  // LCB-10
            // ammoStock[2] = parseInt(parts[i + 2], 10) || 0;  // MCB-25
            // ammoStock[3] = parseInt(parts[i + 3], 10) || 0;  // MCB-50
            // ammoStock[4] = parseInt(parts[i + 4], 10) || 0;  // UCB-100
            // ammoStock[5] = parseInt(parts[i + 5], 10) || 0;  // SAB-50
            // ammoStock[6] = parseInt(parts[i + 6], 10) || 0;  // RSB-75
            
            // --- ROQUETTES (Désactivé pour ne pas écraser le paquet '3') ---
            // ammoStock[9]  = parseInt(parts[i + 9], 10) || 0;   // R-310
            // ammoStock[10] = parseInt(parts[i + 10], 10) || 0;  // PLT-2026
            // ammoStock[11] = parseInt(parts[i + 11], 10) || 0;  // PLT-2021
            // ammoStock[12] = parseInt(parts[i + 12], 10) || 0;  // PLT-3030
            // ammoStock[13] = parseInt(parts[i + 13], 10) || 0;  // PLD-8
            // ammoStock[14] = parseInt(parts[i + 15], 10) || 0;  // WIZ-X 
            // ammoStock[15] = parseInt(parts[i + 16], 10) || 0;  // HSTRM-01
            // ammoStock[16] = parseInt(parts[i + 17], 10) || 0;  // UBR-100
            // ammoStock[17] = parseInt(parts[i + 18], 10) || 0;  // ECO-10
            // ammoStock[18] = parseInt(parts[i + 14], 10) || 0;  // DCR-250

            // --- MINES (On garde ça car ce n'est pas géré ailleurs) ---
            ammoStock[20] = parseInt(parts[i + 19], 10) || 0;  // ACM-1
            ammoStock[21] = parseInt(parts[i + 20], 10) || 0;  // EMP-M
            ammoStock[22] = parseInt(parts[i + 21], 10) || 0;  // SAB-M
            ammoStock[23] = parseInt(parts[i + 22], 10) || 0;  // DDM

            // Mise à jour visuelle
            if (typeof renderActionDrawerItems === "function") {
                renderActionDrawerItems();
            }
            // On ne spamme pas de message pour ça
            // addInfoMessage("Inventaire synchronisé."); 
            break;
        }

        case "RS": {
            const mode = parts[i + 1] || "0";
            if (mode === "1") addInfoMessage("Réparation rapide démarrée (30k).");
            else addInfoMessage("Réparation démarrée.");
            if (typeof setHeroRepairing === "function" && (mode === "0" || mode === "1")) {
                setHeroRepairing(true);
            }
            break;
        }
case "CLD": {
    const code    = parts[i + 1] || "";
    const seconds = parseInt(parts[i + 2], 10);

    // ✅ On met à jour le cooldown même si c'est 0 (pour reset proprement)
    if (!isNaN(seconds)) {
        setActionCooldown(code, Math.max(0, seconds));
    }

    if (code === "RSB") {
        forceRsbReturnAfterCooldown();
    }

    // ✅ Flash-like : aucun message "Cooldown ..."
    break;
}


        case "v": {
    const speedStr = parts[i + 1] || "0";
    const speed = parseInt(speedStr, 10);
    if (!isNaN(speed) && speed > 0) {
        heroSpeed = speed;
        // Flash-like : ne pas afficher de message
    }
    break;
}
        case "SHD": {
            const shStr      = parts[i + 1] || "0";
            const maxShStr  = parts[i + 2] || "0";
            const newShield = parseInt(shStr, 10);
            const newMaxSh  = parseInt(maxShStr, 10);
            if (!isNaN(newShield)) heroShield = newShield;
            if (!isNaN(newMaxSh) && newMaxSh > 0) heroMaxShield = newMaxSh;
            break;
        }
        case "HL": {
            if (parts.length < i + 5) break;

            const targetId = parseInt(parts[i + 2], 10);
            const type      = parts[i + 3];
            const value     = parseInt(parts[i + 4], 10);
            const diffRaw   = parseInt(parts[i + 5] || "0", 10);
            const targetEnt = (heroId !== null && targetId === heroId) ? null : entities[targetId];

            const applyDeltaBubble = (prevVal, newVal, entityId, isShield = false) => {
                if (entityId == null || prevVal == null || isNaN(newVal)) return;
                let delta = !isNaN(diffRaw) ? diffRaw : (newVal - prevVal);
                if (delta === 0) delta = newVal - prevVal;
                if (delta === 0) return;
                const isHeal = delta > 0;

// XML (game.xml -> hitpointColors)
// 0=damage, 1=damage hero (géré dans drawDamageBubbles), 2=heal HP, 3=heal SHD
const colorId = isHeal ? (isShield ? 3 : 2) : 0;

pushDamageBubble(entityId, delta, isHeal, colorId, isHeal);
                if (!isShield && delta < 0 && entityId === heroId) {
                    spawnHullDamageEffect(heroId);
                }
            };

            if (heroId !== null && targetId === heroId) {
                if (type === "HPT") {
                    const prev = heroHp;
                    heroHp = value;
                    applyDeltaBubble(prev, value, heroId);
                    
                    if (typeof setHeroRepairing === "function") {
                        // Si on prend des dégâts, on arrête le robot normal
                        if (heroRepairing && prev != null && value < prev) {
                            setHeroRepairing(false);
                        } 
                        // Si on est full vie, on arrête le robot normal
                        else if (heroRepairing && heroMaxHp != null && value >= heroMaxHp) {
                            setHeroRepairing(false);
                        }
                    }

                    
                } else if (type === "SHD") {
                const prev = heroShield;
                heroShield = value;
                
                // --- LOGIQUE REGEN ---
                // On active la bulle UNIQUEMENT si le bouclier AUGMENTE (Régénération)
                if (prev != null && value > prev) {
                    // On affiche la bulle pendant 1 seconde
                    heroShieldRegenUntil = performance.now() + 1000;
                }
                // ---------------------

                // Si le bouclier BAISSE (Dégâts), on ne fait RIEN pour la bulle.
                // On gère juste les impacts visuels (éclairs)
                if (prev != null && value < prev) {
                     const angle = getRecentBeamAngleForTarget(heroId);
                     const radius = computeShieldImpactRadius(snapshotEntityById(heroId));
                     // Ceci affiche l'impact, PAS la bulle entière
                     spawnShieldBurstAt(shipX, shipY, "hit", { angle, radius, targetId: heroId });
                     
                     // Si on réparait, on arrête
                     if (heroRepairing && typeof setHeroRepairing === "function") setHeroRepairing(false);
                }
                
                applyDeltaBubble(prev, value, heroId, true);
            }
            } else if (targetEnt) {
                if (type === "HPT") {
                    const prev = targetEnt.hp;
                    targetEnt.hp = value;
                    applyDeltaBubble(prev, value, targetId);
                    if (prev != null && value < prev && (targetEnt.kind === "player" || targetEnt.kind === "npc")) {
                        spawnHullDamageEffect(targetId);
                    }
                } else if (type === "SHD") {
                    const prev = targetEnt.shield;
                    targetEnt.shield = value;
                    if (prev != null && value < prev && targetEnt.kind === "player") {
                        const angle = getRecentBeamAngleForTarget(targetId);
                        const radius = computeShieldImpactRadius(snapshotEntityById(targetId));
                        spawnShieldBurstAt(targetEnt.x, targetEnt.y, "hit", { angle, radius, targetId });
                    }
                    applyDeltaBubble(prev, value, targetId, true);
                }
            }
            break;
        }
        default: break;
    }
}

    function handlePacket_B(parts, i) {
        const values = [];
        for (let idx = i; idx < parts.length; idx++) {
            const v = parseInt(parts[idx], 10);
            values.push(isNaN(v) ? 0 : v);
        }
        const laserOrder = [1, 2, 3, 4, 5, 6];
        laserOrder.forEach((stockId, idx) => {
            if (values[idx] !== undefined) {
                ammoStock[stockId] = values[idx];
            }
        });
        renderActionDrawerItems();
    }

    function handlePacket_3(parts, i) {
        const rocketOrder = [10, 11, 12, 13, 14, 15, null, 20, 32, 31, 30, 21, 22, 23];
        let cursor = i + 1;
        const firstVal = parseInt(parts[i], 10);
        if (!isNaN(firstVal)) {
            ammoStock[rocketOrder[0]] = firstVal;
        }
        for (let idx = 1; idx < rocketOrder.length; idx++) {
            const raw = parts[cursor++] || "0";
            const val = parseInt(raw, 10);
            const stockKey = rocketOrder[idx];
            if (stockKey && !isNaN(val)) {
                ammoStock[stockKey] = val;
            }
        }
        renderActionDrawerItems();
    }

    function resolveExpansionStage(stage) {
        if (Number.isFinite(stage)) {
            return stage > 0 ? stage : 3;
        }
        const parsed = parseInt(stage, 10);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            return 3;
        }
        return parsed;
    }

    // RDY (Infos Héros complètes)
    function handlePacket_RDY(parts, i) {
        // Format (UserDataComposer): RDY|I|id|username|shipId|shipSpeed|shield|maxShield|hp|maxHp|cargo|maxCargo|locX|locY|mapId|factionId|clanId|... (see code_complet.txt)
        const section = parts[i];
        if (section !== "I") {
            console.warn("[PACKET RDY] section inattendue :", section, parts);
            return;
        }

        let idx = i + 1;
        const nextStr = () => (idx < parts.length ? parts[idx++] : null);
        const nextInt = () => {
            const raw = nextStr();
            if (raw === null) return null;
            const val = parseInt(raw, 10);
            return isNaN(val) ? null : val;
        };

        const id   = nextInt();
        const name = nextStr() || "";
        const shipModel = nextInt();
        const shipSpeed = nextInt();
        const shipShield = nextInt();
        const shipMaxShld = nextInt();
        const shipHp = nextInt();
        const shipMaxHp = nextInt();
        const cargo = nextInt();
        const maxCargo = nextInt();
        const locX = nextInt();
        const locY = nextInt();
        const mapId = nextInt();
        const faction = nextInt();
        const clanId = nextInt();

        // =======================================================
// RDY|I (UserDataComposer - Andromeda / MilkyWay Emu)
// Format réel envoyé par TON serveur :
// RDY|I|...|clanId|10000|100|4|1|exp|honor|level|credits|uridium|0|grade|clanTag|ggrings|0|invisible
// =======================================================

// 4 champs "legacy" FIXES (décalage qui cassait ton HTML5)
nextStr(); // 10000
nextStr(); // 100
nextStr(); // 4
const premiumFlag = nextStr(); // 1
heroPremium = premiumFlag === "1";

// Les 3 champs économie à lire ici (dans le bon ordre)
const expStr   = nextStr(); // experience
const honorStr = nextStr(); // honor
const levelStr = nextStr(); // level

const expValue   = expStr   !== null ? parseInt(expStr, 10)   : null;
const honorValue = honorStr !== null ? parseInt(honorStr, 10) : null;
const levelValue = levelStr !== null ? parseInt(levelStr, 10) : null;

if (Number.isFinite(expValue))   heroXp = expValue;
if (Number.isFinite(honorValue)) heroHonor = honorValue;
if (Number.isFinite(levelValue)) heroLevel = levelValue;

// Ensuite crédits / uridium (correct)
const creds = nextInt();  // credits
const uri   = nextInt();  // uridium

nextStr(); // 0 (réservé / inconnu)
const grade = nextStr();
const clanTag = nextStr();
const ggRings = nextInt();
nextStr(); // 0 (réservé / inconnu)
const invisible = nextStr();


        if (id !== null) heroId = id;
        heroName = name;
        if (shipModel !== null) heroShipId = shipModel;
        if (shipSpeed !== null) heroSpeed = shipSpeed;
        if (shipShield !== null) heroShield = shipShield;
        if (shipMaxShld !== null) heroMaxShield = shipMaxShld;
        if (shipHp !== null) heroHp = shipHp;
        if (shipMaxHp !== null) heroMaxHp = shipMaxHp;
        if (cargo !== null) heroCargo = cargo;
        if (maxCargo !== null) heroMaxCargo = maxCargo;
        if (heroId !== null) {
            const heroEntity = ensureEntity(heroId);
            heroEntity.kind = "player";
            if (shipModel !== null) {
                heroEntity.shipId = shipModel;
            } else if (Number.isFinite(heroShipId)) {
                heroEntity.shipId = heroShipId;
            }
            let stageCandidate = null;
            if (Number.isFinite(heroEntity.expansionTypeId) && heroEntity.expansionTypeId > 0) {
                stageCandidate = heroEntity.expansionTypeId;
            } else if (Number.isFinite(heroExpansionTypeId) && heroExpansionTypeId > 0) {
                stageCandidate = heroExpansionTypeId;
            }
            const resolvedStage = resolveExpansionStage(stageCandidate);
            heroEntity.expansionTypeId = resolvedStage;
            if (!Number.isFinite(heroExpansionTypeId) || heroExpansionTypeId <= 0) {
                heroExpansionTypeId = resolvedStage;
            }
        }

        if (locX !== null && locY !== null) {
            shipX = locX;
            shipY = locY;
            cameraX = shipX;
            cameraY = shipY;
            heroLastPosX = shipX;
            heroLastPosY = shipY;
            heroLastMoveMs = performance.now();
        }

        if (mapId !== null && mapId !== currentMapId) {
            resetMapState(mapId);
        }
        window.heroFactionId = (faction === null ? 0 : faction);
        const previousClanId = heroClanId || null;
        heroClanId = clanId || null;
        window.heroClanId = heroClanId || 0;
        heroGrade = grade || heroGrade;
        const parsedRank = parseInt(grade, 10);
        if (!isNaN(parsedRank)) {
            heroRankId = parsedRank;
        }
        heroClanTag = clanTag || heroClanTag;
        if (ggRings !== null && !isNaN(ggRings)) {
            heroGalaxyGatesFinished = Math.max(0, Math.min(ggRings, 4));
        }
        heroInvisible = invisible === "1" || invisible === 1;

        syncChatRoomsToHero(previousClanId);

        if (creds !== null) heroCredits = creds;
        if (uri !== null) heroUridium = uri;

        moveTargetX = null;
        moveTargetY = null;
		moveTargetFromMinimap = false;
        isChasingTarget = false;

        if (typeof sendLabStatusRequest === "function") {
            sendLabStatusRequest();
        } else if (typeof sendRaw === "function" && ws && ws.readyState === WebSocket.OPEN) {
            // Fallback direct pour récupérer l'état du labo
            sendRaw("LAB|UPD|GET");
        }
		heroLoaded = true;
trySendRdyMap();
    }

    
    // c (Spawn Box - Avec immunité temporaire)
    function handlePacket_c(parts, i) {
        if (parts.length < i + 4) return;

        const idStr = parseInt(parts[i], 10);            
        const type  = parseInt(parts[i + 1], 10);
        const x     = parseInt(parts[i + 2], 10);
        const y     = parseInt(parts[i + 3], 10);

        if (isNaN(x) || isNaN(y)) return;

        const e = ensureEntity(idStr);

        if (typeof clearBoxAnimationState === "function") {
            clearBoxAnimationState(idStr);
        }

        // On transforme l'entité en BOÎTE
        e.id     = idStr;
        e.type   = type;
        e.shipId = null;  // Plus d'image de vaisseau
        e.x      = x;
        e.y      = y;

        e.kind      = "box";
        e.name      = "";
        e.hp        = null;
        e.shield    = null;
        e.factionId = 0;
        
        // --- AJOUT IMPORTANT : L'heure de naissance ---
        e.boxSpawnTime = Date.now(); 

        categorizeEntityFromType(e);

        // Stop mouvement
        e.interp.startX   = x;
        e.interp.startY   = y;
        e.interp.endX     = x;
        e.interp.endY     = y;
        e.interp.duration = 0;

        console.log(`[BOX] Boîte ${idStr} créée (Immunisée 2s).`);
    }


    // f|C (Spawn Player - Fix Couleur)
    function handlePacket_f(parts, i) {
        const subOpcode = parts[i];
        if (subOpcode !== "C") return;

        let idx = i + 1;
        const id = parseInt(parts[idx++], 10);
        const shipId = parseInt(parts[idx++], 10);
        const expansionStage = parseInt(parts[idx++], 10);
        const clanTag = parts[idx++] || "";
        const name    = parts[idx++] || "";
        const x       = parseInt(parts[idx++], 10);
        const y       = parseInt(parts[idx++], 10);
        const faction = parseInt(parts[idx++], 10);
        const clanId  = parseInt(parts[idx++], 10);
        const grade   = parseInt(parts[idx++], 10);
        idx++; // warn icon on map (unused here)
        const clanDiplomacy = parseInt(parts[idx++], 10);
        const ggRings = parseInt(parts[idx++], 10);

        if (isNaN(id) || isNaN(x) || isNaN(y)) return;

        const resolvedStage = resolveExpansionStage(expansionStage);
        const e = ensureEntity(id);
        e.kind = "player";
        e.name = name;
        e.clanTag = clanTag;
        e.factionId = faction;
        e.clanId = isNaN(clanId) ? 0 : clanId;
        e.clanDiplomacy = isNaN(clanDiplomacy) ? 0 : clanDiplomacy;
        e.rankId = isNaN(grade) ? 0 : grade;
        e.galaxyGatesFinished = isNaN(ggRings) ? 0 : Math.max(0, Math.min(ggRings, 4));
        if (!isNaN(shipId)) {
            e.shipId = shipId;
        }
        e.x = x;
        e.y = y;
        e.expansionTypeId = resolvedStage;

        if (heroId !== null && id === heroId) {
            shipX = x;
            shipY = y;
            heroExpansionTypeId = resolvedStage;
            if (!isNaN(shipId)) {
                heroShipId = shipId;
            }
        }
        
        if (e.interp.duration === 0) {
            e.interp.startX = x;
            e.interp.startY = y;
            e.interp.endX = x;
            e.interp.endY = y;
        }
    }

    function handlePacket_portal(parts, i) {
        const len = parts.length;
        if (len < i + 3) return;
        const portalId = parseInt(parts[i], 10);
        if (isNaN(portalId)) return;

        let factionId = 0;
        let typeId = 0;
        let x = 0;
        let y = 0;
        let visibleOnMiniMap = true;
        let targetMaps = [];

        if (len < i + 7) {
            typeId = parseInt(parts[i + 1], 10) || 0;
            x      = parseInt(parts[i + 3], 10);
            y      = parseInt(parts[i + 4], 10);
        } else {
            factionId = parseInt(parts[i + 1], 10) || 0;
            typeId    = parseInt(parts[i + 2], 10) || 0;
            x         = parseInt(parts[i + 3], 10);
            y         = parseInt(parts[i + 4], 10);
            visibleOnMiniMap = (parseInt(parts[i + 5], 10) === 1);

            const mapsStr = parts[i + 6] || "";
            if (mapsStr.length > 0) {
                const tokens = mapsStr.split(",");
                for (const t of tokens) {
                    const m = parseInt(t, 10);
                    if (!isNaN(m) && m > 0) targetMaps.push(m);
                }
            }
        }

        if (isNaN(x) || isNaN(y)) return;

        const p = ensurePortal(portalId);
        p.factionId = factionId;
        p.typeId    = typeId;
        p.x = x;
        p.y = y;
        p.visibleOnMiniMap = visibleOnMiniMap;
        p.targetMaps = targetMaps;
    }

    function handlePacket_SMP(parts, i) {
        if (parts.length < i + 2) return;
        const pvp  = parseInt(parts[i], 10);
        const home = parseInt(parts[i + 1], 10);
        if (!isNaN(pvp))  mapPvpAllowed  = pvp;
        if (!isNaN(home)) mapHomeFaction = home;
    }

    function handlePacket_U(parts, i) {
        if (parts.length < i + 2) return;
        const nextMap = parseInt(parts[i], 10);
        const portalId = parseInt(parts[i + 1], 10);

        if (!isNaN(portalId) && portals[portalId]) {
            portals[portalId].playJump = true;
            portals[portalId].jumpStart = performance.now();
            const portal = portals[portalId];
            spawnPortalJumpEffect(portal.x, portal.y);
        } else if (!isNaN(portalId)) {
            spawnPortalJumpEffect(shipX, shipY);
        }
    }

    function handlePacket_UI(parts, i) {
        const action = parts[i];
        if (action === "W") {
            const key = parts[i + 1];
            const value = parts[i + 2];
            if (key === "HW" && value) {
                window.hudHeightHint = parseInt(value, 10) || window.hudHeightHint;
            }
        }
    }

    function handlePacket_POI(parts, i) {
    const action = parts[i];
    if (action === "RDY") {
        // Flash-like : ne rien afficher
    }
}


    function handlePacket_C(parts, i) {
        if (parts.length < i + 8) return;
        const id       = parseInt(parts[i], 10);
        const shipId   = parseInt(parts[i + 1], 10);
        const name     = parts[i + 4] || "";
        const x        = parseInt(parts[i + 5], 10);
        const y        = parseInt(parts[i + 6], 10);
        const factionId = parseInt(parts[i + 7] || "0", 10);

        if (isNaN(id) || isNaN(x) || isNaN(y)) return;

        const e = ensureEntity(id);
        e.kind      = "npc";
        e.type      = shipId;      // type logique du NPC
        e.shipId    = shipId;      // <<< ESSENTIEL pour les sprites
        e.x         = x;
        e.y         = y;
        e.name      = name;
        e.factionId = isNaN(factionId) ? 0 : factionId;
    }




    function handlePacket_CSS(parts, i) {
        const value = parseInt(parts[i] || "0", 10);
        healthStationActive = (value === 1);
    }

    function handlePacket_UT(parts, i) {}

    function handlePacket_D(parts, i) {
    // Deux formats possibles selon serveurs:
    // A) Flash:  locX|locY|peace|repair|trade|radiation|jump|fastRepair
    // B) Chez toi: locX|locY|peace|trade|1|radiation|jump|fastRepair
    if (parts.length < i + 8) return;

    const demilitarized = !!parseInt(parts[i + 2] || "0", 10);

    const raw3 = parseInt(parts[i + 3] || "0", 10); // repair OU trade
    const raw4 = parseInt(parts[i + 4] || "0", 10); // trade OU (souvent 1)
    const raw5 = parseInt(parts[i + 5] || "0", 10); // radiation
    const raw6 = parseInt(parts[i + 6] || "0", 10); // jump
    const raw7 = parseInt(parts[i + 7] || "0", 10); // fastRepair

    // Heuristique: si raw4 vaut 1 (champ constant chez toi), alors raw3 = trade
    const looksLikeYourServer = (raw4 === 1 && (raw3 === 0 || raw3 === 1));

    const tradeArea  = looksLikeYourServer ? !!raw3 : !!raw4;
    const repairZone = looksLikeYourServer ? !!raw4 : !!raw3;
    const radiation  = !!raw5;
    const jumpArea   = !!raw6;
    const fastRepairCount = raw7;

    // Messages info (inchangé)
    if (demilitarized !== lastDemilitarizedState) {
        addInfoMessage(demilitarized ? "Zone de paix" : "Zone de paix quittée");
        lastDemilitarizedState = demilitarized;
    }
    if (tradeArea !== lastTradeZoneState) {
        addInfoMessage(tradeArea ? "Zone commerciale" : "Zone commerciale quittée");
        lastTradeZoneState = tradeArea;
    }

    // Mise à jour états
    inDemilitarizedZone = demilitarized;
    inTradeZone = tradeArea;
    inJumpZone = jumpArea;

    // Chez toi, le champ repair peut être "1" souvent, donc on le lie à trade pour éviter un repair "toujours actif"
    healthStationActive = repairZone && tradeArea;

    if (!isNaN(fastRepairCount)) {
        heroFastRepair = fastRepairCount;
    }

    setRadiationWarning(radiation);

    // ✅ MINI AMÉLIORATION: refresh live des boutons "Sell" si la fenêtre LAB est ouverte
    // (sinon, si la fenêtre reste ouverte, les boutons gardent l'ancien état)
    try {
        const labWin = document.getElementById("labWindow");
        if (labWin && labWin.style.display !== "none") {
            const btns = labWin.querySelectorAll("button.btnSellOre");
            btns.forEach(btn => {
                const oreKey = btn.getAttribute("data-ore");
                if (!oreKey) return;

                const cargo = window.oreCargo || {};
                const prices = window.orePrices || {};

                // Compat clé (au cas où: PROMETIUM vs prometium)
                const k1 = oreKey;
                const k2 = oreKey.toLowerCase();
                const k3 = oreKey.toUpperCase();

                const count = (cargo[k1] ?? cargo[k2] ?? cargo[k3] ?? 0);
                const price = (prices[k1] ?? prices[k2] ?? prices[k3] ?? 0);

                const isSellable = (count > 0 && price > 0);

                // Règle Flash-like:
                // - Hors trade zone => toujours disabled
                // - En trade zone => disabled seulement si non vendable (0 cargo ou prix 0)
                btn.disabled = (!inTradeZone) || (!isSellable);
            });
        }
    } catch (e) {
        // no-op
    }
}


    function handlePacket_noAttack(parts, i) {
    lastNoAttackZoneTime = performance.now();
    addInfoMessage("Zone de paix (no-attack)");

    // ✅ STOP combat local immédiatement (Flash-like)
    // 1) On stop le laser côté serveur (sécurité)
    if (currentLaserTargetId != null) {
        sendLaserStop(currentLaserTargetId, true);
    }

    // 2) On coupe l'état local
    currentLaserTargetId = null;
    attackIntentTargetId = null;

    // 3) On empêche la reprise auto
    resetPendingRangeResume();

    // 4) On supprime les visuels lasers
    if (typeof laserBeams !== "undefined") {
        laserBeams.length = 0;
    }

    // 5) On stop la poursuite
    isChasingTarget = false;
}


    function handlePacket_logoutCancel() {
        if (typeof handleLogoutCancelFromServer === "function") {
            handleLogoutCancelFromServer();
        }
    }

    function handlePacket_O(parts, i) {
    // Le serveur dit : "Tu es trop loin, j'arrête de calculer les dégâts"
    addInfoMessage("Out of range");

    // ✅ (AJOUT) On mémorise la cible AVANT de couper le laser
    const prevLaserTarget = currentLaserTargetId;
    const resumeTarget =
        attackIntentTargetId ??
        confirmedAttackTargetId ??
        prevLaserTarget ??
        selectedTargetId;

    // 1. On coupe le laser visuel immédiatement
    currentLaserTargetId = null;

    // 2. IMPORTANT : On garde l'intention (attackIntentTargetId) intacte.
    // On note juste qu'on attend de revenir à portée (packet X).
    if (resumeTarget != null) {
        if (attackIntentTargetId == null) {
            attackIntentTargetId = resumeTarget;
        }
        pendingRangeResumeTargetId = resumeTarget;
        pendingRangeResumeMessage = true;
        rangeProtectedTargetId = resumeTarget;
    }

    // Nettoyage des lasers affichés
    if (typeof laserBeams !== 'undefined') {
        laserBeams.length = 0;
    }
	cancelRsbBurst(heroId);
}


    function handlePacket_X(parts, i) {
    // Le serveur dit : "Cible à portée"
    const resumeTarget =
        pendingRangeResumeTargetId ??
        attackIntentTargetId ??
        confirmedAttackTargetId ??
        selectedTargetId;

    if (pendingRangeResumeMessage && resumeTarget != null) {
        addInfoMessage("The battle continues.");
    }

    // ✅ Flash-like : on garde l'intention, mais on ne renvoie PAS "a|id"
    // C'est le serveur qui reprend l'attaque automatiquement.
    if (resumeTarget != null && attackIntentTargetId == null) {
        attackIntentTargetId = resumeTarget;
    }

    // ✅ IMPORTANT : on NE reset PAS pendingRangeResume ici !
    // On attend le vrai premier packet "a" du serveur (laserAttack) pour nettoyer.
    pendingRangeResumeMessage = false;
}



    function handlePacket_sabShot(parts, i) {
        if (parts.length < i + 2) return;

        const attackerId = parseInt(parts[i], 10);
        const targetId = parseInt(parts[i + 1], 10);

        if (isNaN(attackerId) || isNaN(targetId)) return;

        const attackerSnap = snapshotEntityById(attackerId);
        const targetSnap = snapshotEntityById(targetId);
        if (!attackerSnap || !targetSnap) return;

        updateEntityClaim(targetId, attackerId);

        // FULL_MERGE_AS : laser4 (SAB-50) est un laser absorbeur "playLoop".
        // Le clip part de la cible vers l'attaquant, sans rotation supplémentaire,
        // et se resserre progressivement (scale -> 0.1).
        const startX = targetSnap.id === heroId ? shipX : targetSnap.x;
        const startY = targetSnap.id === heroId ? shipY : targetSnap.y;
        const endX = attackerSnap.id === heroId ? shipX : attackerSnap.x;
        const endY = attackerSnap.id === heroId ? shipY : attackerSnap.y;

        const duration = (typeof SAB_SHOT_DURATION_MS !== "undefined") ? SAB_SHOT_DURATION_MS : 1000;

        const now = performance.now();

        // FULL_MERGE_AS : une seule instance de sab visuel par couple Attaquant/Cible.
        // On remet à jour l'instance existante au lieu d'empiler des copies.
        let updated = false;
        for (let idx = sabShots.length - 1; idx >= 0; idx--) {
            const shot = sabShots[idx];
            if (shot.attackerId === attackerId && shot.targetId === targetId) {
                if (!updated) {
                    shot.startX = startX;
                    shot.startY = startY;
                    shot.endX = endX;
                    shot.endY = endY;
                    shot.duration = duration;
                    shot.createdAt = now;
                    updated = true;
                } else {
                    sabShots.splice(idx, 1);
                }
            }
        }

        if (updated) return;

        sabShots.push({
            attackerId,
            targetId,
            startX,
            startY,
            endX,
            endY,
            startScale: 1,
            endScale: 0.1,
            duration,
            createdAt: now
        });
    }

    function handlePacket_rocketAttack(parts, i) {
        if (parts.length < i + 6) return;
        const attackerId = parseInt(parts[i], 10);
        const targetId = parseInt(parts[i + 1], 10);
        const heavyFlag = parts[i + 2] === "H";
        const rocketId = parseInt(parts[i + 3], 10);
        const patternId = parseInt(parts[i + 4], 10);
        const autoFlag = !!parseInt(parts[i + 5] || "0", 10);

        if (isNaN(attackerId) || isNaN(targetId)) return;

        // Comme sur le client Flash, un tir de roquette établit aussi le claim initial
        updateEntityClaim(targetId, attackerId);

        const beamAngle = computeShieldImpactAngle(attackerId, targetId);
        rocketAttacks.push({
            attackerId,
            targetId,
            rocketId: isNaN(rocketId) ? 0 : rocketId,
            patternId: isNaN(patternId) ? 0 : patternId,
            heavy: heavyFlag,
            auto: autoFlag,
            angle: beamAngle,
            createdAt: performance.now()
        });
    }

    const NETTEL_SPRITE_ID_LOCAL = (typeof NETTEL_SPRITE_ID !== "undefined") ? NETTEL_SPRITE_ID : 7;
    const NETTEL_SHIP_IDS = new Set([36, 37, 71, 75, 76]);

    const CRYSTAL_LASER_SPRITE_ID_LOCAL = (typeof CRYSTAL_LASER_SPRITE_ID !== "undefined") ? CRYSTAL_LASER_SPRITE_ID : 8;
    const CRYSTAL_NPC_TYPES = new Set([78, 29]);
    const CRYSTAL2_LASER_SPRITE_ID_LOCAL = (typeof CRYSTAL2_LASER_SPRITE_ID !== "undefined") ? CRYSTAL2_LASER_SPRITE_ID : 9;
    const CRYSTAL2_NPC_TYPES = new Set([79, 35, 45]);
    const DEVOLARIUM_LASER_SPRITE_ID_LOCAL = (typeof DEVOLARIUM_LASER_SPRITE_ID !== "undefined") ? DEVOLARIUM_LASER_SPRITE_ID : 10;
    const DEVOLARIUM_NPC_TYPES = new Set([26, 72, 74, 46]);
    const DEVOLARIUM_LASER_SPEED_MS = 750;
    const LORDAKIUM_LASER_SPRITE_ID_LOCAL = (typeof LORDAKIUM_LASER_SPRITE_ID !== "undefined") ? LORDAKIUM_LASER_SPRITE_ID : 11;
    const LORDAKIUM_NPC_TYPES = new Set([77, 28]);
    const LORDAKIUM_LASER_SPEED_MS = 1000;
    const PROTEGIT_LASER_SPRITE_ID_LOCAL = (typeof PROTEGIT_LASER_SPRITE_ID !== "undefined") ? PROTEGIT_LASER_SPRITE_ID : 12;
    const PROTEGIT_NPC_TYPES = new Set([81]);
    const PROTEGIT_LASER_SPEED_MS = 500;

    const SMALL_NPC_EXPLOSION_IDS = new Set([2, 71, 75, 78, 34, 36, 37, 38]);
    const SMALL_SHIP_EXPLOSION_IDS = new Set([1, 3, 4, 5, 6, 7, 24, 25, 27, 31]);
    const BOSS_EXPLOSION_IDS = new Set([28, 35, 45, 46, 80, 39]);
    const STRUCTURE_EXPLOSION_IDS = new Set();
    const MASSIVE_EXPLOSION_IDS = new Set();

    function shouldUseCrystalLaser(attacker) {
        if (!attacker || attacker.kind !== "npc") return false;

        // Le type NPC (shipId logique) correspond aux Kristallin
        if (CRYSTAL_NPC_TYPES.has(attacker.type)) return true;

        // Sécurité : certains NPC n'ont pas toujours "type" bien renseigné,
        // on recoupe avec le shipId et le nom pour garantir l'usage du laser cristal.
        if (CRYSTAL_NPC_TYPES.has(attacker.shipId)) return true;

        const name = (attacker.name || "").toLowerCase();
        return name.includes("kristallin");
    }

    function shouldUseCrystal2Laser(attacker) {
        if (!attacker || attacker.kind !== "npc") return false;

        if (CRYSTAL2_NPC_TYPES.has(attacker.type)) return true;
        if (attacker.shipId != null && CRYSTAL2_NPC_TYPES.has(attacker.shipId)) return true;

        const name = (attacker.name || "").toLowerCase();
        return name.includes("kristallon");
    }

    function shouldUseNettelLaser(attacker) {
        if (!attacker || attacker.kind !== "npc") return false;

        if (attacker.shipId != null && NETTEL_SHIP_IDS.has(attacker.shipId)) return true;

        const name = (attacker.name || "").toLowerCase();
        return name.includes("lordakia") || name.includes("saimon") || name.includes("sibelonit");
    }

    function shouldUseDevolariumLaser(attacker) {
        if (!attacker || attacker.kind !== "npc") return false;

        if (attacker.type != null && DEVOLARIUM_NPC_TYPES.has(attacker.type)) return true;
        if (attacker.shipId != null && DEVOLARIUM_NPC_TYPES.has(attacker.shipId)) return true;

        const name = (attacker.name || "").toLowerCase();
        return name.includes("devolarium") || name.includes("sibelon");
    }

    function shouldUseLordakiumLaser(attacker) {
        if (!attacker || attacker.kind !== "npc") return false;

        if (attacker.type != null && LORDAKIUM_NPC_TYPES.has(attacker.type)) return true;
        if (attacker.shipId != null && LORDAKIUM_NPC_TYPES.has(attacker.shipId)) return true;

        const name = (attacker.name || "").toLowerCase();
        return name.includes("lordakium");
    }

    function shouldUseProtegitLaser(attacker) {
        if (!attacker || attacker.kind !== "npc") return false;

        if (attacker.type != null && PROTEGIT_NPC_TYPES.has(attacker.type)) return true;
        if (attacker.shipId != null && PROTEGIT_NPC_TYPES.has(attacker.shipId)) return true;

        const name = (attacker.name || "").toLowerCase();
        return name.includes("protegit");
    }

    function resolveLaserSalvoOffsets(attackerId, attackerSnap, visual) {
        const fallback = [{ x: 0, y: 0 }];
        if (!attackerSnap || !visual?.allowOffsets) return fallback;

        const shipId = attackerSnap.shipId;
        if (!shipId) return fallback;

        const expansionClassId = typeof getShipExpansionClass === "function"
            ? getShipExpansionClass(shipId)
            : 0;
        if (!expansionClassId) return fallback;

        const expansionTypeId = attackerId === heroId
            ? heroExpansionTypeId
            : (entities[attackerId]?.expansionTypeId ?? 0);
        const frameCount = SHIP_SPRITE_DEFS[shipId]?.frameCount || 32;
        const attackerAngle = attackerId === heroId
            ? heroAngle
            : (entities[attackerId]?.angle ?? attackerSnap.angle ?? 0);
        const frameIndex = typeof getDirectionFrameIndex === "function"
            ? getDirectionFrameIndex(attackerAngle, frameCount)
            : 0;
        const currentIndex = attackerId === heroId
            ? heroLaserSalvoIndex
            : (entities[attackerId]?.laserSalvoIndex ?? 0);

        const buildOffsetsForPattern = (pattern, salvoIndex) => {
            const salvos = pattern?.salvosData;
            if (!salvos || salvos.length === 0) {
                return { offsets: [], salvosLength: 0, salvoIndex: 0 };
            }
            const normalizedIndex = ((salvoIndex % salvos.length) + salvos.length) % salvos.length;
            const salvo = salvos[normalizedIndex] || [];
            const offsets = [];
            for (const positionsList of salvo) {
                if (!positionsList || positionsList.length === 0) continue;
                const point = positionsList[frameIndex] || positionsList[0];
                if (point) {
                    offsets.push({ x: point.x, y: point.y });
                }
            }
            return { offsets, salvosLength: salvos.length, salvoIndex: normalizedIndex };
        };

        const hasMeaningfulOffsets = (offsets) => {
            if (!offsets || offsets.length === 0) return false;
            return offsets.some((offset) => Number.isFinite(offset?.x) && Number.isFinite(offset?.y)
                && (offset.x !== 0 || offset.y !== 0));
        };

        const stageCandidates = expansionTypeId === 0 ? [0, 2, 3] : [expansionTypeId];
        let selected = null;

        for (const candidateStage of stageCandidates) {
            const pattern = typeof getExpansionPatternForStage === "function"
                ? getExpansionPatternForStage(expansionClassId, candidateStage)
                : (typeof getExpansionPattern === "function"
                    ? getExpansionPattern(expansionClassId, candidateStage)
                    : null);
            const computed = buildOffsetsForPattern(pattern, currentIndex);
            if (computed.salvosLength === 0) continue;
            if (hasMeaningfulOffsets(computed.offsets)) {
                selected = computed;
                break;
            }
        }

        if (!selected || selected.salvosLength === 0) return fallback;

        if (attackerId === heroId) {
            heroLaserSalvoIndex = (selected.salvoIndex + 1) % selected.salvosLength;
        } else if (entities[attackerId]) {
            entities[attackerId].laserSalvoIndex = (selected.salvoIndex + 1) % selected.salvosLength;
        }

        return selected.offsets.length > 0 ? selected.offsets : fallback;
    }

    function applyLaserLength(startX, startY, endX, endY, laserLength, absorber) {
        if (absorber || !Number.isFinite(laserLength) || laserLength <= 0) {
            return { endX, endY };
        }
        const dx = startX - endX;
        const dy = startY - endY;
        const distSq = dx * dx + dy * dy;
        if (distSq < laserLength * laserLength) return null;
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;
        return {
            endX: endX + nx * laserLength,
            endY: endY + ny * laserLength
        };
    }
	
	const RSB_BURST_STATE = new Map();

function cancelRsbBurst(attackerId = null) {
    // Si attackerId null => on coupe toutes les rafales (utile pour packet O)
    if (attackerId == null) {
        for (const state of RSB_BURST_STATE.values()) {
            if (state?.timeouts?.length) {
                state.timeouts.forEach(clearTimeout);
                state.timeouts.length = 0;
            }
            state.seq = (state.seq || 0) + 1;
			state.targetId = null;
        }
        return;
    }

    const key = String(attackerId);
    let state = RSB_BURST_STATE.get(key);
    if (!state) {
    state = { seq: 0, timeouts: [], targetId: null };
    RSB_BURST_STATE.set(key, state);
}

    // Annule les timeouts en attente
    if (state.timeouts.length) {
        state.timeouts.forEach(clearTimeout);
        state.timeouts.length = 0;
    }

    // Invalide toutes les callbacks déjà planifiées
    state.seq++;
	state.targetId = null;

    // Coupe visuellement les lasers RSB déjà présents (coupure nette comme Flash)
    if (typeof laserBeams !== "undefined") {
        for (let i = laserBeams.length - 1; i >= 0; i--) {
            const b = laserBeams[i];
            if (b && b.attackerId === attackerId && b.spriteId === 6) {
                laserBeams.splice(i, 1);
            }
        }
    }
}

function beginRsbBurst(attackerId, targetId = null) {
    cancelRsbBurst(attackerId);
    const state = RSB_BURST_STATE.get(String(attackerId));
    if (state) state.targetId = targetId; // ✅ on mémorise la cible de la rafale
    return state.seq;
}
// ✅ Coupe net une rafale RSB si sa cible disparaît (comme Flash)
function cancelRsbBurstsByTarget(targetId) {
    if (targetId == null) return;

    for (const [key, state] of RSB_BURST_STATE.entries()) {
        if (state && state.targetId === targetId) {
            cancelRsbBurst(Number(key));
        }
    }
}

// ✅ Supprime immédiatement tous les lasers liés à une entité (mort/remove)
function removeLaserBeamsForEntity(entityId) {
    if (typeof laserBeams === "undefined") return;

    for (let i = laserBeams.length - 1; i >= 0; i--) {
        const b = laserBeams[i];
        if (b && (b.targetId === entityId || b.attackerId === entityId)) {
            laserBeams.splice(i, 1);
        }
    }
}


function handlePacket_laserAttack(parts, i) {
        if (parts.length < i + 5) return;
        const attackerId = parseInt(parts[i], 10);
        const targetId   = parseInt(parts[i + 1], 10);
        const patternId  = parseInt(parts[i + 2], 10);
        const showShieldDamage = !!parseInt(parts[i + 3], 10);
        const skilledLaser = !!parseInt(parts[i + 4], 10);

        if (isNaN(attackerId) || isNaN(targetId)) return;

        // Le Flash colore l'anneau de sélection dès le premier tir effectif (premier claim)
        updateEntityClaim(targetId, attackerId);

        // Flash : le message "The battle continues." arrive sur packet X (TARGET_IN_RANGE).


  if (heroId !== null && attackerId === heroId) {
    currentLaserTargetId = targetId;

    // ✅ confirmation serveur = lock autorisé
    confirmedAttackTargetId = targetId;

    // ✅ la demande d’attaque est confirmée
    if (pendingAttackAckTargetId === targetId) {
        pendingAttackAckTargetId = null;
        pendingAttackAckStartMs = 0;
    }

    // ✅ FLASH : si on était en attente de reprise après un "OUT OF RANGE",
    // le 1er vrai tir serveur confirme que la reprise a commencé => on nettoie maintenant.
    if (typeof pendingRangeResumeTargetId !== "undefined"
        && pendingRangeResumeTargetId === targetId
        && typeof resetPendingRangeResume === "function") {
        resetPendingRangeResume(targetId);
    }

    if (typeof lastAutoLaserResumeMs !== 'undefined') {
        lastAutoLaserResumeMs = performance.now();
    }
}



        // -------------------------------------------------

        const attackerSnap = snapshotEntityById(attackerId);
        const targetSnap = snapshotEntityById(targetId);
        if (!attackerSnap || !targetSnap) return;

        let visual = resolveLaserVisual(patternId, skilledLaser);

        if (shouldUseProtegitLaser(attackerSnap)) {
            visual = {
                ...visual,
                spriteId: PROTEGIT_LASER_SPRITE_ID_LOCAL,
                playLoop: false,
                playLoopRotated: false,
                absorber: false,
                speedMs: PROTEGIT_LASER_SPEED_MS
            };
        } else if (shouldUseDevolariumLaser(attackerSnap)) {
            visual = {
                ...visual,
                spriteId: DEVOLARIUM_LASER_SPRITE_ID_LOCAL,
                playLoop: true,
                playLoopRotated: false,
                absorber: false,
                speedMs: DEVOLARIUM_LASER_SPEED_MS,
                attackLengthMs: (typeof LASER_ATTACK_LENGTH_MS !== "undefined") ? LASER_ATTACK_LENGTH_MS : 1350
            };
        } else if (shouldUseLordakiumLaser(attackerSnap)) {
            visual = {
                ...visual,
                spriteId: LORDAKIUM_LASER_SPRITE_ID_LOCAL,
                playLoop: false,
                playLoopRotated: true,
                absorber: false,
                speedMs: LORDAKIUM_LASER_SPEED_MS
            };
        } else if (shouldUseNettelLaser(attackerSnap)) {
            visual = { ...visual, spriteId: NETTEL_SPRITE_ID_LOCAL, flipX: true };
        } else if (shouldUseCrystal2Laser(attackerSnap)) {
            visual = { ...visual, spriteId: CRYSTAL2_LASER_SPRITE_ID_LOCAL, flipX: false };
        } else if (shouldUseCrystalLaser(attackerSnap)) {
            visual = { ...visual, spriteId: CRYSTAL_LASER_SPRITE_ID_LOCAL, flipX: false };
        }
        
        const spriteInfo = getLaserSpriteFrame(visual.spriteId, skilledLaser);
        const laserLength = Number.isFinite(visual.laserLength)
            ? visual.laserLength
            : (spriteInfo?.width || LASER_SPRITE_INFO[visual.spriteId]?.width || 0);
        const origin = visual.absorber ? targetSnap : attackerSnap;
        const destination = visual.absorber ? attackerSnap : targetSnap;

        const baseStartX = origin.x;
        const baseStartY = origin.y;
        const baseEndX = destination.x;
        const baseEndY = destination.y;

        const salvoOffsets = visual.absorber
            ? [{ x: 0, y: 0 }]
            : resolveLaserSalvoOffsets(attackerId, attackerSnap, visual);

        const baseDuration = visual.speedMs || DEFAULT_LASER_SPEED_MS;
        const duration = visual.playLoop ? (visual.attackLengthMs || LASER_ATTACK_LENGTH_MS) : baseDuration;

        const attackerLive = entities[attackerId];
        if (attackerLive) {
            attackerLive.attackTargetId = targetId;

            const lockDuration = visual.attackLengthMs || (typeof LASER_ATTACK_LENGTH_MS !== "undefined" ? LASER_ATTACK_LENGTH_MS : 1350);
            const lockUntil = performance.now() + lockDuration;
            attackerLive.attackLockUntil = Math.max(attackerLive.attackLockUntil || 0, lockUntil);

            if (attackerLive.kind === "npc") {
                const targetPos = targetId === heroId ? { x: shipX, y: shipY } : entities[targetId];
                if (targetPos) {
                    const dx = targetPos.x - attackerLive.x;
                    const dy = targetPos.y - attackerLive.y;
                    attackerLive.angle = Math.atan2(dy, dx) + Math.PI;
                }
            }
        }

        if (shouldUseProtegitLaser(attackerSnap)) {
            for (let idx = laserBeams.length - 1; idx >= 0; idx--) {
                const beam = laserBeams[idx];
                if (beam.attackerId === attackerId && beam.spriteId !== PROTEGIT_LASER_SPRITE_ID_LOCAL) {
                    laserBeams.splice(idx, 1);
                }
            }
        } else if (shouldUseDevolariumLaser(attackerSnap)) {
            for (let idx = laserBeams.length - 1; idx >= 0; idx--) {
                const beam = laserBeams[idx];
                if (beam.attackerId === attackerId && beam.spriteId !== DEVOLARIUM_LASER_SPRITE_ID_LOCAL) {
                    laserBeams.splice(idx, 1);
                }
            }
        } else if (shouldUseLordakiumLaser(attackerSnap)) {
            for (let idx = laserBeams.length - 1; idx >= 0; idx--) {
                const beam = laserBeams[idx];
                if (beam.attackerId === attackerId && beam.spriteId !== LORDAKIUM_LASER_SPRITE_ID_LOCAL) {
                    laserBeams.splice(idx, 1);
                }
            }
        }

        const spawnBeamEntries = (createdAt, flagShowShield = showShieldDamage) => {
            const flipX = visual.flipX === true;
            const entries = [];
            let showShield = flagShowShield;

            salvoOffsets.forEach((offset, slotIndex) => {
                const offsetX = Number.isFinite(offset?.x) ? offset.x : 0;
                const offsetY = Number.isFinite(offset?.y) ? offset.y : 0;

                let startX = baseStartX + offsetX;
                let startY = baseStartY + offsetY;
                let endX = baseEndX;
                let endY = baseEndY;

                const adjusted = applyLaserLength(startX, startY, endX, endY, laserLength, visual.absorber);
                if (!adjusted) return;
                endX = adjusted.endX;
                endY = adjusted.endY;

                const angle = Math.atan2(endY - startY, endX - startX);

                const addEntry = (extraOffsetX, extraOffsetY, shotIndex) => {
                    entries.push({
                        attackerId,
                        targetId,
                        patternId,
                        spriteId: visual.spriteId,
                        showShieldDamage: showShield,
                        skilledLaser,
                        absorber: visual.absorber,
                        rotation: visual.playLoop ? null : angle,
                        angle,
                        startX: startX + extraOffsetX,
                        startY: startY + extraOffsetY,
                        endX: endX + extraOffsetX,
                        endY: endY + extraOffsetY,
                        offsetX: offsetX + extraOffsetX,
                        offsetY: offsetY + extraOffsetY,
                        offsetEndX: extraOffsetX,
                        offsetEndY: extraOffsetY,
                        duration,
                        endScale: visual.absorber ? 0.1 : 1,
                        flipX,
                        laserLength,
                        createdAt,
                        playLoop: visual.playLoop,
                        followTargets: !visual.playLoop,
                        hitHandled: false,
                        salvoSlot: `${slotIndex}-${shotIndex}`
                    });
                };

                addEntry(0, 0, 0);

                showShield = false;
            });

            if (entries.length === 0) return;

            if (visual.playLoop) {
                const entriesBySlot = new Map(entries.map(entry => [entry.salvoSlot, entry]));
                for (let idx = laserBeams.length - 1; idx >= 0; idx--) {
                    const beam = laserBeams[idx];
                    if (beam.playLoop && beam.attackerId === attackerId && beam.targetId === targetId && beam.patternId === patternId && beam.skilledLaser === skilledLaser) {
                        const slot = beam.salvoSlot ?? "0-0";
                        const entry = entriesBySlot.get(slot);
                        if (entry) {
                            beam.startX = entry.startX;
                            beam.startY = entry.startY;
                            beam.endX = entry.endX;
                            beam.endY = entry.endY;
                            beam.duration = entry.duration;
                            beam.createdAt = createdAt;
                            beam.absorber = entry.absorber;
                            beam.showShieldDamage = entry.showShieldDamage;
                            beam.angle = entry.angle;
                            beam.rotation = entry.rotation;
                            beam.endScale = entry.endScale;
                            beam.flipX = entry.flipX;
                            beam.laserLength = entry.laserLength;
                            beam.followTargets = entry.followTargets;
                            beam.offsetX = entry.offsetX;
                            beam.offsetY = entry.offsetY;
                            beam.offsetEndX = entry.offsetEndX;
                            beam.offsetEndY = entry.offsetEndY;
                            beam.hitHandled = false;
                            beam.salvoSlot = entry.salvoSlot;
                            entriesBySlot.delete(slot);
                        } else {
                            laserBeams.splice(idx, 1);
                        }
                    }
                }
                for (const entry of entriesBySlot.values()) {
                    laserBeams.push(entry);
                }
                return;
            }

            for (const entry of entries) {
                laserBeams.push(entry);
            }
        };

        const now = performance.now();

        if (visual.spriteId === 6) {
    const cfg = window.RSB_VISUAL_BURST || {};
    const burstCount = Number.isFinite(cfg.count) ? cfg.count : 5;
    const burstSpacing = Number.isFinite(cfg.spacingMs) ? cfg.spacingMs : 120;

    // ✅ Flash-like : nouvelle rafale = on coupe l'ancienne
    const seq = beginRsbBurst(attackerId, targetId);

    for (let b = 0; b < burstCount; b++) {
        const delay = b * burstSpacing;
        const isFirst = (b === 0);

        const timeoutId = setTimeout(() => {
            // ✅ Si une nouvelle rafale a commencé => on ignore celle-ci
            const state = RSB_BURST_STATE.get(String(attackerId));
            if (!state || state.seq !== seq) return;

            spawnBeamEntries(performance.now(), isFirst);
        }, delay);

        // On stocke les timeouts pour pouvoir les annuler
        const state = RSB_BURST_STATE.get(String(attackerId));
        if (state) state.timeouts.push(timeoutId);
    }

    return;
}



        spawnBeamEntries(now, showShieldDamage);
    }


function handlePacket_attackInfo(parts, i) {
    const attackerId = parseInt(parts[i] || "", 10);
    const targetId   = parseInt(parts[i + 1] || "", 10);
    const hitType    = parts[i + 2] || "";
    const hpRaw      = parts[i + 3];
    const shRaw      = parts[i + 4];
    const deltaRaw   = parts[i + 5];
    const deltaAltRaw = parts[i + 6];

    if (isNaN(targetId)) return;

    updateEntityClaim(targetId, attackerId);

    const hp     = hpRaw !== undefined ? parseInt(hpRaw, 10) : NaN;
    const shield = shRaw !== undefined ? parseFloat(shRaw) : NaN;

    // --- SOUS-FONCTION CORRIGÉE (ANGLE BOUCLIER) ---
    const applyShieldHit = (id, prev, next) => {
        if (prev != null && !isNaN(next) && next < prev) {
            // 1) On calcule l'angle EXACT entre la cible et l'attaquant
            let angle = computeShieldImpactAngle(attackerId, targetId);

            // 2) Fallback : Si l'attaquant est inconnu, on cherche un laser visuel
            // On ajoute Math.PI pour inverser le sens (Cible -> Source)
            if (angle == null) {
                const beamAngle = getRecentBeamAngleForTarget(id);
                if (beamAngle != null) angle = beamAngle + Math.PI;
            }

            // Rayon du bouclier
            const radius = computeShieldImpactRadius(snapshotEntityById(id));

            // Position actuelle
            const sx = (heroId !== null && id === heroId) ? shipX : (entities[id]?.x || 0);
            const sy = (heroId !== null && id === heroId) ? shipY : (entities[id]?.y || 0);

            // 3) Effet seulement si on a un angle
            if (angle != null) {
                spawnShieldBurstAt(sx, sy, "hit", { angle, radius, targetId: id });
            }
        }
    };
    // -----------------------------------------------

    // ✅ On stocke les valeurs AVANT mise à jour pour savoir si c'est HP ou SHD qui bouge
    let prevHp = null;
    let prevShieldForBubble = null;

    if (heroId !== null && targetId === heroId) {
        prevHp = heroHp;
        prevShieldForBubble = heroShield;

        const prevShield = heroShield;

        if (!isNaN(hp)) heroHp = hp;

        if (!isNaN(shield)) {
            applyShieldHit(heroId, prevShield, shield);
            heroShield = shield;
        }
    } else {
        const ent = ensureEntity(targetId);

        prevHp = ent.hp;
        prevShieldForBubble = ent.shield;

        const prevShield = ent.shield;

        if (!isNaN(hp)) ent.hp = hp;

        if (!isNaN(shield)) {
            applyShieldHit(targetId, prevShield, shield);
            ent.shield = shield;
        }
    }
	
	if (!isNaN(hp) && hp <= 0) {
    cancelRsbBurstsByTarget(targetId);
    removeLaserBeamsForEntity(targetId);
}

    // ✅ Delta CORRIGÉ : on prend la valeur absolue du packet et on applique le signe
    // selon la variation réelle de HP/SHD (comme Flash)
    let delta = NaN;

    const raw = (deltaRaw !== undefined) ? parseInt(deltaRaw, 10) : NaN;
    const alt = (deltaAltRaw !== undefined) ? parseInt(deltaAltRaw, 10) : NaN;

    const abs = !isNaN(raw) ? Math.abs(raw) : (!isNaN(alt) ? Math.abs(alt) : NaN);

    if (!isNaN(abs) && abs !== 0) {
        const hpDelta = (!isNaN(hp) && prevHp != null) ? (hp - prevHp) : 0;
        const shDelta = (!isNaN(shield) && prevShieldForBubble != null) ? (shield - prevShieldForBubble) : 0;

        // Si HP ou Shield diminue => dégâts => delta NEGATIF
        if (hpDelta < 0 || shDelta < 0) {
            delta = -abs;
        }
        // Si HP ou Shield augmente => heal/regen => delta POSITIF
        else if (hpDelta > 0 || shDelta > 0) {
            delta = abs;
        }
        // fallback : si on ne sait pas -> on considère dégâts
        else {
            delta = -abs;
        }
    } else if (!isNaN(hp) && prevHp != null) {
        // fallback ultime (si abs indisponible)
        delta = hp - prevHp;
    }

    // ✅ Bubble + couleurs comme Flash (via XML hitpointColors)
    if (!isNaN(delta) && delta !== 0) {
        const isHeal = (delta > 0);

        const hpChanged = (prevHp != null && !isNaN(hp) && hp !== prevHp);
        const shieldChanged = (prevShieldForBubble != null && !isNaN(shield) && shield !== prevShieldForBubble);

        // Si seul le shield change → bubble shield (bleu heal shield)
        // Si hp change (ou les deux) → bubble hp (vert heal hp)
        const isShieldBubble = (!hpChanged && shieldChanged);

        // XML (game.xml -> hitpointColors)
        // 0=damage, 1=damage hero (géré côté draw), 2=heal HP, 3=heal SHD
        const colorId = isHeal ? (isShieldBubble ? 3 : 2) : 0;

        // pushDamageBubble(entityId, delta, isHeal, colorId, showPlus)
        pushDamageBubble(targetId, delta, isHeal, colorId, isHeal);
    }
}




   function handlePacket_remove(parts, i) {
    // 0|2|ID (Remove entity or collectable)
    if (parts.length < i + 1) return;

    const id = parseInt(parts[i], 10);
    if (!id || isNaN(id)) return;

    const e = entities[id];
    if (!e) return;

    const isMyCollection =
        (pendingCollectBoxId === id) ||
        (typeof collectedBoxRequestIds !== "undefined" && collectedBoxRequestIds.has(id));

    // Protection anti “remove trop rapide” pour les box (on garde ton comportement)
    if (e.kind === "box") {
        if (!isMyCollection && e.boxSpawnTime && (Date.now() - e.boxSpawnTime < 2000)) {
            return;
        }
    }

    // ✅ IMPORTANT : si c'était la cible / en cours d'attaque, on stoppe proprement
    if (e.kind === "player" || e.kind === "npc") {
        if (id === currentLaserTargetId || id === selectedTargetId) {
            if (typeof forceUnlock === "function") forceUnlock(id);
            if (typeof stopLaserEffects === "function") stopLaserEffects();
            if (typeof stopRocketEffects === "function") stopRocketEffects();
        }
    }

    // ✅ Si on était en train de collecter cette box
    if (pendingCollectBoxId === id) {
        pendingCollectBoxId = null;
        if (typeof stopHeroCollectorBeam === "function") stopHeroCollectorBeam();
    }

    if (e.kind === "box") {
        if (typeof clearBoxAnimationState === "function") clearBoxAnimationState(id);
        if (typeof clearOreAnimationState === "function") clearOreAnimationState(id);
    }

	cancelRsbBurstsByTarget(id);
cancelRsbBurst(id);
removeLaserBeamsForEntity(id);
    delete entities[id];
    if (loggedEntities.has(id)) loggedEntities.delete(id);
    if (typeof collectedBoxRequestIds !== "undefined") collectedBoxRequestIds.delete(id);
}

	
	// Gestion des Stations (Packet s)
function handlePacket_s(parts, i) {
    // Le serveur envoie : 0|s|0|1|redStation|1|0|2000|1200
    // parts[i] = "0" (mode), parts[i+1] = "1" (type?)
    // parts[i+2] = NOM (ex: "redStation")
    // parts[i+5] = X
    // parts[i+6] = Y
    
    // Note : L'index dépend de ton ému. Basé sur le code C# : 
    // Compose("s", "0|1|redStation|1|0|2000|1200")
    
    let typeStation = parts[i+2]; // Index 2 après le 's'
    let stationX = parseInt(parts[i+5]);
    let stationY = parseInt(parts[i+6]);

    if (typeStation && !isNaN(stationX) && !isNaN(stationY)) {
        stations.push({
            type: typeStation,
            x: stationX,
            y: stationY
        });
        console.log("Station ajoutée : " + typeStation + " en " + stationX + "," + stationY);
    }
}

   function handlePacket_R(parts, i) {
    // 0|R|id (Remove Object)
    if (parts.length < i + 1) return;

    const id = parseInt(parts[i], 10);
    if (!id || isNaN(id)) return;

    const e = entities[id];
    if (!e) return;

    const isMyCollection =
        (pendingCollectBoxId === id) ||
        (typeof collectedBoxRequestIds !== "undefined" && collectedBoxRequestIds.has(id));

    // Protection anti “remove trop rapide” pour les box (on garde ton comportement)
    if (e.kind === "box") {
        if (!isMyCollection && e.boxSpawnTime && (Date.now() - e.boxSpawnTime < 2000)) {
            return;
        }
    }

    // ✅ IMPORTANT : si c'était la cible / en cours d'attaque, on stoppe proprement
    if (e.kind === "player" || e.kind === "npc") {
        if (id === currentLaserTargetId || id === selectedTargetId) {
            if (typeof forceUnlock === "function") forceUnlock(id);
            if (typeof stopLaserEffects === "function") stopLaserEffects();
            if (typeof stopRocketEffects === "function") stopRocketEffects();
        }
    }

    // ✅ Si on était en train de collecter cette box
    if (pendingCollectBoxId === id) {
        pendingCollectBoxId = null;
        if (typeof stopHeroCollectorBeam === "function") stopHeroCollectorBeam();
    }

    if (e.kind === "box") {
        if (typeof clearBoxAnimationState === "function") clearBoxAnimationState(id);
        if (typeof clearOreAnimationState === "function") clearOreAnimationState(id);
    }
	cancelRsbBurstsByTarget(id);
cancelRsbBurst(id);
removeLaserBeamsForEntity(id);

    delete entities[id];
    if (loggedEntities.has(id)) loggedEntities.delete(id);
    if (typeof collectedBoxRequestIds !== "undefined") collectedBoxRequestIds.delete(id);
}


// 0|y|TYPE|amount|total (Rewards)
function handlePacket_y(parts, i) {
    const type = parts[i];
    const amount = parseInt(parts[i + 1], 10);
    const total  = parseInt(parts[i + 2], 10);

    if (isNaN(amount)) return;

    let label = type;

    if (type === "CRE") {
        label = "Credits";
        heroCredits = total;
    }
    else if (type === "URI") {
        label = "Uridium";
        heroUridium = total;
    }
    else if (type === "EP") {
        label = "EP";
        heroXp = total;
    }
    else if (type === "HON") {
        label = "Honor";
        heroHonor = total;
    }

    // ✅ fidèle Flash : pas de bulle au-dessus du ship
    // ✅ message top center
    addInfoMessage(`You received ${amount} ${label}.`);
}

	// --- FONCTION UTILITAIRE POUR DÉVERROUILLER UNE CIBLE ---
    function forceUnlock(targetId) {

    // ✅ Flash-like : si c’était la cible lock => on clear
    if (confirmedAttackTargetId === targetId) {
        confirmedAttackTargetId = null;
    }

    // ✅ Si une demande d’attaque était en attente => on annule
    if (pendingAttackAckTargetId === targetId) {
        pendingAttackAckTargetId = null;
        pendingAttackAckStartMs = 0;
    }

    // 1. Si on ciblait cette entité (Lock visuel / Rond rouge)
    if (selectedTargetId === targetId) {
        selectedTargetId = null;
    }


        // 2. Si on tirait dessus (Laser actif)
        if (currentLaserTargetId === targetId) {
            currentLaserTargetId = null;
            // On envoie le STOP au serveur pour être propre et éviter les lasers fantômes
            sendLaserStop(targetId, true);
        }

        // 3. Si on avait l'intention d'attaquer (Mémoire d'attaque)
        // On supprime cette intention car l'entité n'existe plus (morte ou partie)
        if (attackIntentTargetId === targetId) {
            attackIntentTargetId = null;
        }

        // 4. Nettoyage des flags de reprise de portée (Packet O) [IMPORTANT]
        // Si on ne nettoie pas ça, le client peut bloquer sur une reprise d'attaque impossible
        if (pendingRangeResumeTargetId === targetId) {
             resetPendingRangeResume(targetId);
        }
        if (rangeProtectedTargetId === targetId) {
             rangeProtectedTargetId = null;
        }

        // 5. Arrêt du mouvement de poursuite
        if (isChasingTarget) {
            // On arrête de courir après une cible qui n'existe plus
            isChasingTarget = false;
            moveTargetX = null;
            moveTargetY = null;
			moveTargetFromMinimap = false;
        }

        // 6. Nettoyage visuel des lasers (Correction du nom de variable : laserBeams)
        // Cela supprime les traits de lasers visuels immédiatement
        if (typeof laserBeams !== 'undefined') {
             for (let i = laserBeams.length - 1; i >= 0; i--) {
                const b = laserBeams[i];
                // On supprime si le laser vient de cette cible OU va vers cette cible
                if (b.attackerId === targetId || b.targetId === targetId) {
                    laserBeams.splice(i, 1);
                }
            }
        }

        if (typeof sabShots !== 'undefined') {
             for (let i = sabShots.length - 1; i >= 0; i--) {
                const s = sabShots[i];
                if (s.attackerId === targetId || s.targetId === targetId) {
                    sabShots.splice(i, 1);
                }
            }
        }
    }

    function resolveExplosionType(entity, id) {
        const shipId = (entity && entity.shipId != null)
            ? entity.shipId
            : (id === heroId ? heroShipId : (entity ? entity.type : null));

        if (entity && entity.category === "station") return 4;
        if (entity && entity.explodeTypeId != null) {
            const explicit = parseInt(entity.explodeTypeId, 10);
            if (!isNaN(explicit)) return Math.max(0, Math.min(5, explicit));
        }

        if (shipId != null) {
            if (MASSIVE_EXPLOSION_IDS.has(shipId)) return 5;
            if (STRUCTURE_EXPLOSION_IDS.has(shipId)) return 4;
            if (BOSS_EXPLOSION_IDS.has(shipId)) return 3;
            if (SMALL_SHIP_EXPLOSION_IDS.has(shipId)) return 1;
            if (SMALL_NPC_EXPLOSION_IDS.has(shipId)) return 0;
        }

        const name = (entity && entity.name ? entity.name : "").toLowerCase();
        if (name) {
            if (name.includes("station") || name.includes("base") || name.includes("turret")) return 4;
            if (name.includes("cubikon") || name.includes("battleray") || name.includes("emperor") || name.includes("devour")) return 3;
            if (name.includes("kristallon") || name.includes("lordakium") || name.includes("boss") || name.includes("uber")) return 2;
            if (name.includes("streuner") || name.includes("lordakia") || name.includes("saimon") || name.includes("mordon") || name.includes("interceptor")) return 0;
        }

        return 2;
    }

   // 0|K|id (Explosion + Mort - Flash-like : on ne supprime pas les box ici)
function handlePacket_K(parts, i) {
    const id = parseInt(parts[i], 10);
    const e = entities[id];

    // 1) Explosion visuelle à la dernière position connue
    if (e || id === heroId) {
        const entityX = (id === heroId) ? shipX : (e ? e.x : 0);
        const entityY = (id === heroId) ? shipY : (e ? e.y : 0);
        const explosionType = resolveExplosionType(e, id);
        spawnExplosionAt(entityX, entityY, explosionType);
    }

    // 2) Si c'est le HÉROS qui meurt
    if (id === heroId) {
        console.log("[MORT] Vaisseau détruit !");
        addInfoMessage("VAISSEAU DÉTRUIT !");

        heroHp = 0;
        heroShield = 0;

        moveTargetX = null;
        moveTargetY = null;
        moveTargetFromMinimap = false;

        isChasingTarget = false;
        attackIntentTargetId = null;
        currentLaserTargetId = null;

        // Stop effets en cours (Flash-like)
        cancelRsbBurstsByTarget(heroId);
        cancelRsbBurst(heroId);
        removeLaserBeamsForEntity(heroId);

        if (typeof activeLasers !== "undefined") activeLasers = [];
        if (typeof updateHtmlWindows === "function") updateHtmlWindows();
        return;
    }

    // 3) Si c'est une autre entité
    if (e) {
        // Flash : une box n'est pas supprimée par K (elle disparaît via packet dédié/expiration)
        if (e.kind === "box") {
            forceUnlock(id);
            return;
        }

        // Sinon : vaisseau détruit -> cleanup complet
        forceUnlock(id);

        cancelRsbBurstsByTarget(id);
        cancelRsbBurst(id);
        removeLaserBeamsForEntity(id);

        delete entities[id];
        if (loggedEntities.has(id)) loggedEntities.delete(id);
    }
}

	
	
	
	// ========================================================
    // GESTIONNAIRE PAQUETS DE BASE DE DONNÉES
    // ========================================================

    // E : Mise à jour du Cargo (Ore)
    // Format : E|prometium|endurium|terbium|xenomit|prometid|duranium|promerium|sep|palladium
    function handlePacket_E(parts, i) {
        if (parts.length < i + 9) return;
        
        // Stockage dans une structure globale pour être accessible à la fenêtre
        window.oreCargo = {
            prometium: parseInt(parts[i], 10) || 0,
            endurium:  parseInt(parts[i + 1], 10) || 0,
            terbium:   parseInt(parts[i + 2], 10) || 0,
            xenomit:   parseInt(parts[i + 3], 10) || 0,
            prometid:  parseInt(parts[i + 4], 10) || 0,
            duranium:  parseInt(parts[i + 5], 10) || 0,
            promerium: parseInt(parts[i + 6], 10) || 0,
            seprom:    parseInt(parts[i + 7], 10) || 0,
            palladium: parseInt(parts[i + 8], 10) || 0
        };
        heroCargo = Object.values(window.oreCargo)
            .reduce((sum, value) => sum + (parseInt(value, 10) || 0), 0);
        console.log("[LABO] Cargo reçu:", window.oreCargo);
        // La fenêtre Labo devra être mise à jour ici
        if (typeof refreshTradeUI === 'function') {
            refreshTradeUI();
        }
    }

        function handlePacket_T(parts, i) {
        // Paquet info CPU / Trade Drone (inspiré de assembleCPUInfo du client Flash)
        // Format prévu (pour TON futur émulateur) :
        //  - "T|HM7|AMOUNT"
        //  - ou "0|T|HM7|AMOUNT"
        
        let start = i;

        // Cas où la ligne commence par "0|T|..."
        if (parts[0] === "0" && parts[1] === "T") {
            start = 2;
        }

        if (parts.length < start + 2) return;

        const typeRaw = parts[start] || "HM7";
        const amount  = parseInt(parts[start + 1], 10);

        if (isNaN(amount)) return;

        const type = typeRaw.toUpperCase();

        if (type === "HM7") {
            cpuItems.HM7.amount  = amount;
            cpuItems.HM7.hasItem = (amount > 0);

            if (amount <= 0) {
                addInfoMessage("Trade Drone HM7 épuisé.");
            } else {
                addInfoMessage("Trade Drone HM7 : " + amount + " utilisation(s) restante(s).");
            }
        }

        console.log("[CPU] T packet reçu :", type, amount);
    }


    // b : Prix des minerais (Non utilisé directement par le Labo mais nécessaire)
    // Format: b|prometium_price|endurium_price|...
    function handlePacket_b(parts, i) {
        if (parts.length < i + 5) return;
        window.orePrices = {
            prometium: parseInt(parts[i], 10) || 0,
            endurium:  parseInt(parts[i + 1], 10) || 0,
            terbium:   parseInt(parts[i + 2], 10) || 0,
            // ... autres prix ...
        };
    }

    function handlePacket_g(parts, i) {
        const keys = [1, 2, 3, 11, 12, 13];
        for (let idx = 0; idx < keys.length && (i + idx) < parts.length; idx++) {
            const price = parseInt(parts[i + idx], 10);
            if (!isNaN(price)) {
                labPrices[keys[idx]] = price;
            }
        }
        window.tradePrices = { ...labPrices };
        if (typeof refreshTradeUI === 'function') {
            refreshTradeUI();
        }
    }

    // LAB : Statut du Laboratoire (Durées de buff, niveaux de raffinage)
    // Format : LAB|UPD|INFO|LASER|level|duration|ROCKET|level|duration|...
    const LAB_ORE_ID_TO_KEY = {
        1: "prometium",
        2: "endurium",
        3: "terbium",
        4: "xenomit",
        5: "palladium",
        11: "prometid",
        12: "duranium",
        13: "promerium",
        14: "seprom"
    };

    function labOreIdToKey(id) {
        const n = parseInt(id, 10);
        return LAB_ORE_ID_TO_KEY[n] || null;
    }

    function handlePacket_LAB(parts, i) {
        if (parts.length < i + 1) return;
        const subAction = parts[i];

        if (subAction === "UPD" || subAction === "INFO") {
            const updates = [];
            const cursorStart = subAction === "UPD" ? i + 1 : i;
            const actionLabel = parts[cursorStart] || "INFO";

            if (actionLabel === "INFO") {
                let cursor = cursorStart + 1;
                while (cursor + 2 < parts.length) {
                    const targetId = (parts[cursor] || "").toUpperCase();
                    const oreKey = labOreIdToKey(parts[cursor + 1]);
                    const amount = parseInt(parts[cursor + 2], 10);
                    cursor += 3;
                    if (!targetId) continue;
                    updates.push({
                        targetId,
                        oreKey,
                        amount: isNaN(amount) ? 0 : Math.max(0, amount)
                    });
                }
            }

            if (updates.length && typeof setUpgradeState === "function") {
                updates.forEach(({ targetId, oreKey, amount }) => {
                    const payload = { amount, oreKey: oreKey || null };
                    setUpgradeState(targetId, payload);
                });
            }

            if (updates.length && typeof refreshRefiningWindow === "function") {
                refreshRefiningWindow(true);
            }

            console.log("[LABO] État Labo reçu.", updates);
        }
    }

    function handleTechAction(parts, startIndex) {
    if (!parts || startIndex == null || startIndex >= parts.length) return;

    const action = parts[startIndex]; // "A" (Active) ou "D" (Deactive)

    // Supporte les deux formats:
    // 1) TX|A|BRB|targetId|duration
    // 2) TX|A|0|BRB|targetId|duration
    let k = startIndex + 1;
    if ((parts[k] || "") === "0") k++;

    const code = (parts[k] || "").toUpperCase();
    const targetId = parseInt(parts[k + 1], 10);
    const durationSeconds = parseInt(parts[k + 2], 10);

    // --- GESTION ROBOT DE COMBAT (BRB) ---
    if (code === "BRB") {
        if (action === "A") {
            if (targetId === heroId && typeof setHeroBattleRepairing === "function") {
                const durationMs = !isNaN(durationSeconds) ? durationSeconds * 1000 : null;
                setHeroBattleRepairing(true, durationMs);
            }
        } else if (action === "D") {
            if (targetId === heroId && typeof setHeroBattleRepairing === "function") {
                setHeroBattleRepairing(false);
            }
        }
    }
    
    // --- AJOUT : GESTION SHIELD BACKUP (SBU) ---
    else if (code === "SBU") {
        if (action === "A") {
            // Si c'est MOI (le héros) qui l'active
            if (targetId === heroId) {
                // On active le timer pour l'effet visuel (5 secondes par défaut)
                // Assure-toi d'avoir déclaré 'heroShieldBackupUntil' dans client_config.js
                heroShieldBackupUntil = performance.now() + 5000;
                console.log("[TECH] Shield Backup activé (Visuel)");
            }
        }
    }
    // ------------------------------------------
}


    function handlePacket_TX(parts, i) {
        const action = parts[i];
        if (action === "S") {
            for (let idx = i + 1; idx < parts.length; idx++) {
                const val = parseInt(parts[idx], 10);
                if (!isNaN(val)) {
                    techCooldowns[idx - (i + 1)] = val;
                }
            }
            renderActionDrawerItems();
        } else if (action === "A" || action === "D") {
    // Flash-like : ne pas afficher de message "Tech activée/arrêtée"
}

        handleTechAction(parts, i);
    }
	
	// ========================================================
// GESTIONNAIRE PAQUET 7 (Initialisation des Settings au Login)
// ========================================================
function handlePacket_7(parts, i) {
    // Le serveur envoie 0|7|CLE|VALEUR (répété plusieurs fois)
    const settingKey = parts[i];
    const settingValue = parts[i + 1];

    if (settingKey && settingValue !== undefined) {
        // Mise à jour de l'état local pour persister le setting
        updateLocalSetting(settingKey, settingValue);
    }
}

    function handlePacket_QuestFM(parts, i) {
        if (parts.length < i + 1) return;

        const sub = parts[i]; // "ini", "upd", "p", "a", "c", "f"

        switch (sub) {
            case "ini": {
                const questData = parts[i + 1];      // XML
                const category  = parts[i + 2] || ""; // optionnel

                if (!questData) {
                    console.warn("[QUEST] Paquet ini sans données.");
                    return;
                }

                initQuestFromServer(questData, category);
                break;
            }

            case "upd": {
                const questId = parseInt(parts[i + 1] || "0", 10);
                const mode    = parts[i + 2]; // "o" ou "i"

                if (mode === "i") {
                    const condId     = parseInt(parts[i + 3] || "0", 10);
                    const current    = parseInt(parts[i + 4] || "0", 10);
                    const visibility = parseInt(parts[i + 5] || "0", 10);
                    const runstate   = !!parseInt(parts[i + 6] || "0", 10);

                    updateQuestCondition(questId, condId, current, visibility, runstate);
                }
                break;
            }

            case "p": {
                const questId = parseInt(parts[i + 1] || "0", 10);
                privilegeQuestById(questId);
                break;
            }

            case "a": {
                const questId = parseInt(parts[i + 1] || "0", 10);
                const param2  = parseInt(parts[i + 2] || "0", 10);
                setQuestAccomplished(questId, param2);
                break;
            }

            case "c": {
                const questId = parseInt(parts[i + 1] || "0", 10);
                setQuestCancelled(questId);
                break;
            }

            case "f": {
                const questId = parseInt(parts[i + 1] || "0", 10);
                setQuestFailed(questId);
                break;
            }

            default: {
                console.warn("[QUEST] Sous-opcode QUESTFM inconnu :", sub, "parts=", parts);
                break;
            }
        }
		
		// ========================================================
    // CORRECTION COMMERCE : VENTE DE MINERAIS
    // ========================================================

    window.sendSellOre = function(oreType, amount) {
		        if (!inTradeZone) {
            addInfoMessage("Tu dois être dans la zone commerciale (station) pour vendre.");
            return;
        }
        // Mapping des Noms vers les IDs (Correction Andromeda : 11, 12, 13 pour les raffinés)
        const oreIds = {
            "prometium": 1,
            "endurium": 2,
            "terbium": 3,
            "xenomit": 4,  
            "palladium": 5,  // Ou 9 selon les versions, mais gardons 5 si c'était votre config
            "prometid": 11, 
            "duranium": 12,
            "promerium": 13,
            "seprom": 9     // Parfois 8 ou 9
        };

        const id = oreIds[oreType.toLowerCase()];
        
        if (id && amount > 0) {
            // On envoie le paquet T|sell|ID|AMOUNT via le socket de JEU (sendRaw)
            console.log(`[TRADE] Envoi vente via JEU : ${oreType} (ID: ${id}) x ${amount}`);
            sendRaw(`T|sell|${id}|${amount}`);
        } else {
            console.warn(`[TRADE] Erreur : Type de minerai '${oreType}' inconnu ou ID manquant.`);
        }
    };
    }



    // -------------------------------------------------
    // 4. CLASSIFICATION & VISIBILITÉ
