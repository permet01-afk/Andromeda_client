/* ANDROMEDA ADAPTATION — compact horizontal match HUD (owner-approved D).
 * Desktop only. MOBILE TDM SUPPORT: DEFERRED TO FUTURE PHASE.
 * Timers are presentation only. All actions/deaths/scores are server-owned. */
(function () {
    "use strict";
    const root = "graphics/tdm/", names = ["", "MMO", "EIC", "VRU"];
    let state = null, clockOffset = 0, dialog, body, hud, protectionLabel, death, lobbyOpen = false;
    const hudLayout = { x: 730, y: 8, width: 460, height: 40,
        labelWidth: 116, labelHeight: 18, labelGap: 6, messageGap: 12 };
    let reservedTop = 0, hudFrame = null;
    let dismissedDialogKey = null;
    let request = 0, errorText = "", lastUiKey = "", lastMatch = "", previousSeconds = null;
    const images = new Map(), heard = new Set();
    const now = () => Date.now() + clockOffset;
    const escape = value => String(value == null ? "" : value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const remaining = deadline => Math.max(0, Math.ceil((deadline - now()) / 1000));
    const time = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    const logo = (id, lobby = false) => `<img alt="${names[id] || ""}" src="${root}logo${lobby ? "Lobby" : ""}${names[id]}.png">`;
    const button = (action, label, ref = "", disabled = false) => `<button type="button" data-tdm-action="${action}" data-ref="${escape(ref)}" ${disabled ? "disabled" : ""}>${label}</button>`;
    function image(file) {
        if (!images.has(file)) { const i = new Image(); i.src = root + file; images.set(file, i); }
        return images.get(file);
    }
    function command(action, reference = "") {
        if (!state || typeof sendRaw !== "function") return;
        request = Math.max(request + 1, Date.now() * 1000);
        errorText = "";
        sendRaw(`TDM|1|${action}|${state.eventId}|${request}|${reference}`);
    }
    const dialogKey = s => s.offer ? "offer:" + s.offer.id : s.result ? "result:" + s.result.id : "lobby";
    function initialize() {
        if (dialog) return;
        dialog = document.createElement("section"); dialog.className = "tdm-window"; dialog.id = "tdm-window";
        dialog.setAttribute("aria-label", "Team Deathmatch"); dialog.setAttribute("role", "dialog");
        dialog.innerHTML = '<header><button type="button" class="gwIcon tdm-close-icon" aria-label="Close Team Deathmatch" title="Close Team Deathmatch"><img src="graphics/ui/window1/images/info_icon.png" alt="" draggable="false"></button><span>Team Deathmatch</span></header><div class="tdm-body"></div>';
        body = dialog.querySelector(".tdm-body");
        // The shared drag helper uses HUD coordinates, so the window must live
        // under that same scaled root (like the other Andromeda windows).
        const root = typeof window.getHudRoot === "function" ? window.getHudRoot() : document.body;
        root.appendChild(dialog);
        const width = root === document.body ? innerWidth : root.clientWidth;
        const height = root === document.body ? innerHeight : root.clientHeight;
        dialog.style.left = Math.max(8, Math.round((width - 524) / 2)) + "px";
        dialog.style.top = Math.max(40, Math.round((height - 352) / 2)) + "px";
        const closeIcon = dialog.querySelector(".tdm-close-icon");
        const stopControlEvent = e => { e.preventDefault(); e.stopPropagation(); };
        closeIcon.addEventListener("pointerdown", stopControlEvent);
        closeIcon.addEventListener("mousedown", stopControlEvent);
        closeIcon.addEventListener("click", e => {
            stopControlEvent(e);
            lobbyOpen = false; dismissedDialogKey = dialogKey(state); render();
        });
        if (typeof makeElementDraggable === "function") makeElementDraggable(dialog, dialog.querySelector("header"));
        hud = document.createElement("aside"); hud.className = "tdm-hud"; hud.setAttribute("aria-label", "Team Deathmatch score"); hud.hidden = true;
        Object.assign(hud.style, { left: hudLayout.x + "px", top: hudLayout.y + "px",
            width: hudLayout.width + "px", height: hudLayout.height + "px" });
        protectionLabel = document.createElement("div"); protectionLabel.className = "tdm-protection-label"; protectionLabel.hidden = true;
        Object.assign(protectionLabel.style, { left: (hudLayout.x + (hudLayout.width - hudLayout.labelWidth) / 2) + "px",
            top: (hudLayout.y + hudLayout.height + hudLayout.labelGap) + "px",
            width: hudLayout.labelWidth + "px", height: hudLayout.labelHeight + "px" });
        window.getHudRoot().append(hud, protectionLabel);
        death = document.createElement("div"); death.className = "tdm-death-overlay";
        death.innerHTML = '<section class="tdm-killscreen" role="dialog" aria-label="Team Deathmatch repair"></section>'; document.body.appendChild(death);
        for (const node of [dialog, death, hud]) {
            node.addEventListener("pointerdown", e => e.stopPropagation());
            node.addEventListener("keydown", e => e.stopPropagation());
            node.addEventListener("click", e => {
                e.stopPropagation();
                const b = e.target.closest("[data-tdm-action]");
                if (b && !b.disabled) command(b.dataset.tdmAction, b.dataset.ref || "");
            });
        }
    }
    function receive(parts, i) {
        if (Number(parts[i]) !== 1) return;
        let incoming;
        try { incoming = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(parts[i + 1]), c => c.charCodeAt(0)))); }
        catch (_) { return; }
        if (!incoming || incoming.version !== 1 || !Number.isFinite(incoming.serverNow) || !Number.isFinite(incoming.revision)) return;
        // Revision is monotonic across event start/stop in this server process.
        if (state && incoming.revision < state.revision) return;
        clockOffset = incoming.serverNow - Date.now(); state = incoming;
        if (incoming.open) { lobbyOpen = true; dismissedDialogKey = null; }
        if (incoming.error) errorText = incoming.error;
        if (incoming.match) lobbyOpen = false;
        initialize(); render(); tick();
    }
    function rewardSummary(reward) {
        if (!reward) return "";
        if (reward.status === "CAP") return '<p class="tdm-reward">Reward limit reached for this event.</p>';
        if (reward.status !== "PAID") return "";
        const values = [reward.experience, reward.uridium, reward.honor];
        if (!values.every(n => Number.isSafeInteger(n) && n >= 0)) return "";
        const [xp, uri, honor] = values.map(n => n.toLocaleString("en-US"));
        return `<div class="tdm-reward"><strong>TDM REWARD</strong><span>Experience: ${xp}</span><span>Uridium: ${uri}</span><span>Honor: ${honor}</span></div>`;
    }
    function render() {
        if (!state || !dialog) return;
        const s = state, m = s.match, o = s.offer, r = s.result;
        dialog.hidden = !(o || r || lobbyOpen) || dismissedDialogKey === dialogKey(s);
        death.hidden = !(m && m.dead && m.lives > 0);
        if (!m) hideHud();
        const uiKey = JSON.stringify([s.eventId, s.enabled, s.company, s.bracket, s.waiting, s.running, s.queued, s.queuePosition, o, r, m && [m.dead, m.deathId, m.lives], errorText]);
        if (uiKey === lastUiKey) return; lastUiKey = uiKey;
        const category = s.bracket === 1 ? "Level 8–13" : s.bracket === 2 ? "Level 14+" : "Level 8 required";
        let html;
        if (o) {
            html = `<h2>MATCH FOUND</h2><p>${escape(category)}</p><div class="tdm-versus">${logo(o.companyA, true)}<strong>${names[o.companyA]} ${o.size} vs ${o.size} ${names[o.companyB]}</strong>${logo(o.companyB, true)}</div><p>${o.accepted ? "Accepted. Waiting for the other pilots." : "Confirm your place in this match."}</p><p>Offer expires in <b data-tdm-clock="${o.deadline}"></b> s</p><footer>${button("ACCEPT", o.accepted ? "ACCEPTED" : "ACCEPT", o.id, o.accepted)}${button("DECLINE", "DECLINE", o.id)}</footer>`;
        } else if (r) {
            html = `<h2>${({WIN:"VICTORY",LOSS:"DEFEAT",DRAW:"DRAW",CANCELLED:"MATCH ENDED"})[r.outcome] || "MATCH ENDED"}</h2><div class="tdm-versus">${logo(r.companyA, true)}<strong>${names[r.companyA]} ${r.scoreA} : ${r.scoreB} ${names[r.companyB]}</strong>${logo(r.companyB, true)}</div><p>${escape(r.reason || (r.stayed ? "Waiting for the next opponent company." : "Match complete."))}</p>${r.outcome === "WIN" && !r.stayed ? `<p>Choose within <b data-tdm-clock="${r.deadline}"></b> s</p>` : ""}${rewardSummary(r.reward)}<footer>${r.outcome === "WIN" ? button("STAY", r.stayed ? "WAITING FOR NEXT MATCH" : "STAY FOR NEXT MATCH", r.id, r.stayed) : ""}${button("LEAVE", "LEAVE")}</footer>`;
        } else {
            html = `<h2>TEAM DEATHMATCH</h2><p>Category: ${escape(category)} · Your company: ${names[s.company] || "—"}</p><div class="tdm-companies">${[1,2,3].map(c => `<div class="tdm-company">${logo(c,true)}<strong>${names[c]}</strong><span>Waiting: ${s.waiting[c-1] || 0}</span></div>`).join("")}</div><p>Matches running: ${s.running || 0}</p><p class="tdm-status">${!s.enabled ? "Team Deathmatch is currently unavailable." : s.queued ? `Waiting for opponent company · Queue position: ${s.queuePosition}` : s.bracket === 0 ? "Reach level 8 to join Team Deathmatch." : "3–8 pilots per company · 3 lives · 30 kills"}</p><footer>${button(s.queued ? "LEAVE" : "JOIN", s.queued ? "LEAVE" : "JOIN", "", !s.enabled || !s.bracket)}</footer>`;
        }
        body.innerHTML = html + `<p class="tdm-error" role="status">${escape(errorText)}</p>`;
        if (m && m.dead) death.firstElementChild.innerHTML = `<h2>TEAM DEATHMATCH</h2><p class="tdm-destroyed">You have been destroyed.<br>Lives remaining: ${m.lives}</p><div class="tdm-repair-option"><img src="${root}icon_spawnPoint.png" alt="Company spawn"><strong>FREE</strong></div><p class="tdm-respawn-label">Respawn at your company spawn</p><p class="tdm-repair-clock">Repair within <b data-tdm-clock="${m.repairEnd}"></b> s</p>${button("REPAIR", "REPAIR", m.deathId)}${button("LEAVE", "LEAVE")}`;
    }
    function sound(id, key) {
        if (heard.has(key)) return;
        heard.add(key); if (heard.size > 128) heard.delete(heard.values().next().value);
        try {
            const storageKey = "andromeda-tdm-sound:" + key;
            if (sessionStorage.getItem(storageKey)) return;
            sessionStorage.setItem(storageKey,"1");
            if (window.AudioManager) window.AudioManager.playSoundEffect(id, false, false, -1, -1, true);
        } catch (_) { /* audio/storage must never alter state */ }
    }
    function tick() {
        if (!state || !dialog) return;
        for (const label of document.querySelectorAll("[data-tdm-clock]")) label.textContent = remaining(Number(label.dataset.tdmClock));
        const m = state.match; if (!m) { lastMatch = ""; previousSeconds = null; return; }
        const sec = remaining(m.safeEnd), key = state.eventId + ":" + m.id;
        if (lastMatch !== key) {
            lastMatch = key; previousSeconds = sec;
            if (sec >= 19 && now() < m.safeEnd) sound(26, key + ":intro");
        }
        if (sec !== previousSeconds) {
            if (sec > 0 && sec <= 3) sound(27, key + ":" + sec);
            if (sec === 0 && previousSeconds > 0 && now() - m.safeEnd < 1200) sound(28, key + ":start");
            previousSeconds = sec;
        }
        const own = m.side === 0 ? m.companyA : m.companyB, other = m.side === 0 ? m.companyB : m.companyA;
        const ownScore = m.side === 0 ? m.scoreA : m.scoreB, otherScore = m.side === 0 ? m.scoreB : m.scoreA;
        hud.innerHTML = `<div class="tdm-hud-team">${logo(own)}<span class="tdm-hud-company">${names[own]}</span><strong>${ownScore}<span class="tdm-hud-limit"> /30</span></strong></div><div class="tdm-hud-lives"><span>LIVES</span><strong>${m.lives}</strong></div><div class="tdm-hud-time" aria-label="Time"><strong>${sec > 0 ? "15:00" : time(remaining(m.endsAt))}</strong></div><div class="tdm-hud-team tdm-hud-opponent"><strong>${otherScore}<span class="tdm-hud-limit"> /30</span></strong><span class="tdm-hud-company">${names[other]}</span>${logo(other)}</div>`;
    }
    function hideHud() {
        if (hud) hud.hidden = true;
        if (protectionLabel) protectionLabel.hidden = true;
        hudFrame = null;
        reservedTop = 0;
    }
    // Called by the canvas render pass, before zone labels and message stacks.
    // The DOM is revealed only after that same pass has redrawn the canvas below it.
    function prepareHudFrame() {
        const m = state && state.match;
        if (!m || !hud) { hideHud(); return; }
        const safe = remaining(m.safeEnd), protectedSeconds = remaining(m.nazEnd);
        const label = safe > 0 ? `SAFE ${safe}` : protectedSeconds > 0 ? `PROTECTED ${protectedSeconds}` : "";
        if (!label) protectionLabel.hidden = true;
        reservedTop = hudLayout.y + hudLayout.height + hudLayout.messageGap
            + (label ? hudLayout.labelGap + hudLayout.labelHeight : 0);
        hudFrame = { label };
    }
    function commitHudFrame() {
        if (!hudFrame || !hud) return;
        protectionLabel.textContent = hudFrame.label;
        protectionLabel.hidden = !hudFrame.label;
        hud.hidden = false;
    }
    function draw(context) {
        if (!state || typeof currentMapId === "undefined") return;
        const scale = typeof getEntityDrawScale === "function" ? getEntityDrawScale() : 1;
        if (state.enabled && state.beacon && currentMapId === [0,1,5,9][state.company]) {
            const atlas = image("tdm_gate1_atlas.png");
            if (atlas.complete && atlas.naturalWidth) {
                const frame = Math.floor(performance.now() * 60 / 1000) % 90;
                context.drawImage(atlas, (frame % 10)*410, Math.floor(frame/10)*400, 410,400, mapToScreenX(state.beaconX)-185*scale, mapToScreenY(state.beaconY)-200*scale,410*scale,400*scale);
            }
        }
        const m = state.match;
        if (!m || currentMapId !== 83) return;
        [m.companyA,m.companyB].forEach((company,side) => {
            const sprite=image(`spawn${names[company]}.png`), x=mapToScreenX(side===0?3500:17500), y=mapToScreenY(6550);
            if(sprite.complete && sprite.naturalWidth) context.drawImage(sprite,x-90*scale,y-177.5*scale,180*scale,355*scale);
        });
        context.save(); context.strokeStyle = "rgba(99,214,230,.65)"; context.lineWidth = 1.2*scale;
        for(const p of m.protectedPlayers || []) {
            const entity = p.id === heroId ? {x:shipX,y:shipY} : entities[p.id];
            if(!entity || p.until<=now())continue;
            context.beginPath();context.ellipse(mapToScreenX(entity.x),mapToScreenY(entity.y),58*scale,31*scale,0,0,Math.PI*2);context.stroke();
        }
        context.restore();
    }
    function minimapBeacon() {
        if (!state || !state.enabled || !state.beacon || currentMapId !== [0,1,5,9][state.company]
            || !Number.isFinite(state.beaconX) || !Number.isFinite(state.beaconY)) return null;
        return { x: state.beaconX, y: state.beaconY };
    }
    function nearBeacon() {
        return !!(state && state.beacon && state.enabled && currentMapId === [0,1,5,9][state.company]
            && (shipX-state.beaconX)**2+(shipY-state.beaconY)**2 < 400**2);
    }
    function heroDeath() {
        // Keep transport and pings alive. Never enter the normal Phase5 terminal flow.
        spawnExplosionAt(shipX,shipY,0,true);
        forceUnlock(selectedTargetId,{suppressServerStop:true});
        clearPendingTargetSelection(); clearAttackLocksTargetingEntity(heroId);
        queueEntityVisualCleanup(heroId,{detachRocketAttacks:true,clearSabRing:true,releaseSabShots:true,clearShipSkillVisuals:true});
        cancelRsbBurst(heroId); cancelRsbBurstsByTarget(heroId); removeLaserBeamsForEntity(heroId);
        heroHp=0;heroShield=0;moveTargetX=null;moveTargetY=null;isChasingTarget=false;
        attackIntentTargetId=null;currentLaserTargetId=null;
    }
    window.AndromedaTdm = { receive, draw, nearBeacon, minimapBeacon, heroDeath, command,
        prepareHudFrame, commitHudFrame,
        getMessageTopOffset() { return reservedTop; },
        get dead() { return !!(state && state.match && state.match.dead); },
        hello() { if (typeof sendRaw === "function") sendRaw("TDM|1|HELLO"); },
        reset() { hideHud();state=null;lastUiKey="";lastMatch="";previousSeconds=null;lobbyOpen=false;dismissedDialogKey=null;if(dialog){dialog.hidden=true;death.hidden=true;} }
    };
    window.addEventListener("andromeda:ws-open", () => window.AndromedaTdm.reset());
    setInterval(tick, 100);
})();
