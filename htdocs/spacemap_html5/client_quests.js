(function () {
    "use strict";

    const QUEST_API_URL = "api/quests.php";
    const QUEST_REFRESH_MS = 60000;
    const QUEST_SERVER_DEBOUNCE_MS = 500;
    const STATUS_ICON_BASE = "graphics/ui/questSystem/images/";

    const SELECTION_STORAGE_KEY = "andromeda_quest_selection_v1:" +
        String((window.ANDROMEDA_CONFIG || {}).userID || "guest");
    function readSelection() {
        try { return localStorage.getItem(SELECTION_STORAGE_KEY) || ""; } catch (_) { return ""; }
    }
    const state = {
        initialized: false,
        selectedKey: readSelection(),
        selectedIndex: 0,
        detailsOpen: false,
        data: null,
        csrfToken: "",
        loading: false,
        message: "",
        error: "",
        refreshTimer: null,
        serverRefreshTimer: null,
        actionPending: false,
        needsRefresh: false,
        connectionEpoch: 0,
        liveSerial: -1,
        liveSnapshotKnown: false,
        liveLegacySnapshotKnown: false,
        liveMissions: new Map(),
        liveLegacy: new Map(),
        lastLifecycleFetch: 0,
        visibilityObserver: null,
        observedWindow: null,
        windowVisible: false,
        lastLifecycleNonce: "",
        lifecycleSyncTimer: null,
        lifecycleChannel: null,
        presentationChannel: null,
        streamId: "initial:" + Date.now() + ":" + Math.random().toString(36).slice(2),
        liveServerTimeMs: 0,
        lastPresentationReply: 0,
        lastSavedSelection: null
    };

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatNumber(value) {
        const n = Number(value || 0);
        if (!Number.isFinite(n)) return "0";
        try {
            return new Intl.NumberFormat("en-US").format(Math.trunc(n));
        } catch (_) {
            return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }
    }

    function getRoot() {
        return document.getElementById("content_quest");
    }

    function getWindow() {
        return document.getElementById("win_quest");
    }

    function injectQuestStyles() {
        if (document.getElementById("html5QuestStyles")) return;

        const style = document.createElement("style");
        style.id = "html5QuestStyles";
        style.textContent = `
            /* Paint the Quest body on the complete native window interior, not only on the
               tracker content. This removes the transparent margin around the brown frame while
               keeping the Flash-like semi-transparent body. */
            #win_quest,
            .gameWindow.flashWindow[data-window-key="quest"] {
                background: transparent !important;
                background-image: none !important;
            }

            #win_quest .windowInterior,
            .gameWindow.flashWindow[data-window-key="quest"] .windowInterior {
                position: absolute !important;
                overflow: hidden !important;
                background: transparent !important;
                background-image: none !important;
            }

            #win_quest .windowInterior::after,
            .gameWindow.flashWindow[data-window-key="quest"] .windowInterior::after {
                content: "" !important;
                display: block !important;
                position: absolute !important;
                left: 0 !important;
                right: 0 !important;
                top: var(--header-height, 28px) !important;
                bottom: 0 !important;
                background-image: url('graphics/ui/window1/images/w1_bg_tile.png') !important;
                background-repeat: repeat !important;
                /* The body starts below the header: retain windowPattern's native
                   13px lower-right bevel, without clipping the scrolling content. */
                clip-path: polygon(0 0, 100% 0, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0 100%);
                opacity: var(--flash-window-background-opacity, 0.40) !important;
                pointer-events: none !important;
                z-index: 0 !important;
            }

            #win_quest .gwHeader,
            .gameWindow.flashWindow[data-window-key="quest"] .gwHeader {
                position: relative !important;
                z-index: 2 !important;
            }

            #win_quest .gwContent,
            .gameWindow.flashWindow[data-window-key="quest"] .gwContent {
                position: absolute !important;
                left: 0 !important;
                right: 0 !important;
                top: var(--header-height, 28px) !important;
                bottom: 0 !important;
                width: auto !important;
                height: auto !important;
                padding: 0 !important;
                margin: 0 !important;
                overflow: hidden !important;
                box-sizing: border-box !important;
                background: transparent !important;
                background-image: none !important;
                z-index: 1 !important;
            }

            #win_quest .gwContent::before,
            #win_quest .gwContent::after,
            .gameWindow.flashWindow[data-window-key="quest"] .gwContent::before,
            .gameWindow.flashWindow[data-window-key="quest"] .gwContent::after {
                display: none !important;
                content: none !important;
                background: none !important;
                background-image: none !important;
            }

            #win_quest .html5QuestTracker {
                position: absolute;
                inset: 5px 8px;
                width: auto !important;
                height: auto !important;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                color: #e9e2c0;
                font: 12px/17px "EurostileFl", Tahoma, sans-serif;
                text-shadow: 1px 1px #000;
            }
            .html5QuestDots { display: flex; flex-wrap: wrap; justify-content: flex-end; flex: 0 0 auto; }
            .html5QuestDot { width: 24px; height: 24px; padding: 0; border: 0; cursor: pointer;
                background: url('graphics/ui/questSystem/images/pagedot_idle.png') center no-repeat; }
            .html5QuestDot[aria-pressed="true"] { background-image: url('graphics/ui/questSystem/images/pagedot_selected.png'); }
            .html5QuestDot:focus-visible { outline: 1px solid #e9e2c0; }
            .html5QuestActiveList { min-height: 0; overflow-y: auto; overflow-x: hidden; flex: 1; padding-right: 4px; }
            .html5QuestCaseTitle { font-family: "EurostileHeaFl", "EurostileFl", Tahoma, sans-serif;
                font-size: 13px; margin: 0 0 6px; overflow-wrap: anywhere; }
            .html5QuestCaseGroup { color: #b9b390; margin: 0 0 6px; }
            .html5QuestObjectives { margin: 0; padding: 0 0 0 4px; list-style: none; }
            .html5QuestObjectiveLine { display: grid; grid-template-columns: 12px minmax(0, 1fr) auto;
                align-items: start; column-gap: 4px; padding: 2px 0; }
            .html5QuestObjectiveIcon { width: 12px; height: 12px; margin-top: 2px;
                background: url('${STATUS_ICON_BASE}condition_running.png') center no-repeat; }
            .html5QuestObjectiveIcon.is-completed { background-image: url('${STATUS_ICON_BASE}condition_completed.png'); }
            .html5QuestObjectiveIcon.is-paused, .html5QuestObjectiveIcon.is-upcoming { background-image: url('${STATUS_ICON_BASE}condition_upcoming.png'); }
            .html5QuestObjectiveLabel { overflow-wrap: anywhere; }
            .html5QuestObjectiveValue { white-space: nowrap; padding-left: 8px; }
            .html5QuestObjectiveLine.is-wide-value { grid-template-columns: 12px minmax(0, 1fr); }
            .html5QuestObjectiveLine.is-wide-value .html5QuestObjectiveValue { grid-column: 2; justify-self: end;
                white-space: normal; overflow-wrap: anywhere; text-align: right; padding-left: 0; }
            .html5QuestObjectiveLine.is-complete { color: #88dd88; }
            .html5QuestDetails { margin-top: 10px; color: #b9b390; }
            .html5QuestDetails summary { cursor: pointer; }
            .html5QuestDescription { margin: 5px 0; overflow-wrap: anywhere; }
            .html5QuestReward { display: flex; justify-content: space-between; gap: 8px; max-width: 260px; }
            .html5QuestActions { padding: 6px 0 3px; }
            .html5QuestButton { min-height: 24px; padding: 2px 12px; border: 0; color: #e9e2c0;
                background: url('graphics/ui/ui/sprites/DefineSprite_518_button1/1.png') center / 100% 100% no-repeat;
                font: inherit; cursor: pointer; text-shadow: 1px 1px #000; }
            .html5QuestButton:disabled { opacity: .5; cursor: default; }
            .html5QuestStateText { color: #b9b390; }
            .html5QuestConditions { margin: 3px 0 7px; padding-left: 18px; color: #b9b390; }
            .html5QuestObjectiveNote { grid-column: 2 / -1; color: #b9b390; font-size: 11px; line-height: 15px; }
            .html5QuestFailure { color: #ffb9b9; margin: 5px 0; }
            .html5QuestMode { color: #b9b390; margin: 4px 0; }
            .html5QuestFeedback, .html5QuestEmpty, .html5QuestLoading { margin: 6px 0; overflow-wrap: anywhere; }
            .html5QuestFeedback.is-error { color: #ffb9b9; }
            .html5QuestFeedback.is-success { color: #88dd88; }
        `;
        document.head.appendChild(style);
    }

    function rewardRows(quest) {
        if (quest.rewards && typeof quest.rewards === "object" && !Array.isArray(quest.rewards)) {
            const labels = { experience: "Experience", credits: "Credits", uridium: "Uridium", honor: "Honor" };
            const rows = Object.keys(labels).map(key => ({ key, label: labels[key], amount: quest.rewards[key] }));
            (Array.isArray(quest.rewards.items) ? quest.rewards.items : []).forEach(item => rows.push({
                key: item.key, label: item.label || item.key, amount: item.amount ?? item.quantity
            }));
            return rewardRows({ rewards: rows });
        }
        if (Array.isArray(quest.rewards)) {
            return quest.rewards.filter(reward => reward && reward.amount != null && Number(reward.amount) > 0)
                .map(reward => `<div class="html5QuestReward"><span>${escapeHtml(reward.label || reward.key || "Reward")}</span><strong>${formatNumber(reward.amount)}</strong></div>`)
                .join("");
        }
        const rows = [
            ["Credits", quest.reward_credits],
            ["Uridium", quest.reward_uridium],
            ["Experience", quest.reward_experience],
            ["Honor", quest.reward_honor],
            ["UCB-100", quest.reward_ucb100],
            ["RSB-75", quest.reward_rsb75],
            ["Seprom", quest.reward_seprom]
        ];
        const itemQty = Number(quest.reward_item_qty || 0);
        if (itemQty > 0) {
            rows.push([quest.reward_item_name || "Item", itemQty]);
        }
        return rows
            .filter(([, value]) => Number(value || 0) > 0)
            .map(([label, value]) => `<div class="html5QuestReward"><span>${escapeHtml(label)}</span><strong>${formatNumber(value)}</strong></div>`)
            .join("");
    }

    function questGroup(quest) {
        const raw = String(quest.group || quest.category || "").toLowerCase();
        if (["historical", "normal", "challenges", "daily", "event"].includes(raw)) return "historical";
        if (raw === "weekly") return "weekly";
        if (raw === "pvp") return "pvp";
        if (raw === "havok") return "havok";
        return "basic";
    }

    function groupLabel(quest) {
        const group = questGroup(quest);
        if (group === "weekly") return "Weekly";
        if (group === "pvp") return "PVP";
        if (group === "havok") return "Havok";
        if (group === "historical") return quest.historical_category || "Normal";
        return "Basic Quest";
    }

    function objectiveComplete(objective) {
        if (objective.score || objective.is_score) return false;
        if (typeof objective.complete === "boolean") return objective.complete;
        if (typeof objective.is_complete === "boolean") return objective.is_complete;
        const required = Number(objective.required ?? objective.required_amount);
        const current = Number(objective.current ?? objective.current_amount);
        return !!(objective.complete || objective.is_complete) || (Number.isFinite(required) && required > 0 &&
            Number.isFinite(current) && current >= required);
    }

    function renderObjective(objective) {
        const complete = objectiveComplete(objective);
        const score = !!(objective.score || objective.is_score);
        const active = objective.active !== false;
        const paused = !!objective.runtime_paused;
        const depth = Math.max(0, Math.min(5, parseInt(objective.depth, 10) || 0));
        const required = objective.required ?? objective.required_amount;
        const current = objective.current ?? objective.current_amount;
        const hasGoal = required != null && Number(required) > 0;
        const value = objective.progress_text != null ? escapeHtml(objective.progress_text) :
            (objective.current_display != null ? escapeHtml(objective.current_display) : formatNumber(current)) +
            (!score && hasGoal ? " / " + formatNumber(required) : "");
        const conditions = Array.isArray(objective.conditions) ? objective.conditions : [];
        const note = objective.runtime_note || "";
        return `<li data-objective-id="${escapeHtml(objective.id || "")}" class="html5QuestObjectiveLine${complete ? " is-complete" : ""}${!active && !complete ? " is-upcoming" : ""}${score ? " is-score" : ""}${value.length > 12 ? " is-wide-value" : ""}" style="margin-left:${depth * 8}px${!active && !complete ? ";opacity:.6" : ""}">
            <span class="html5QuestObjectiveIcon ${complete ? "is-completed" : paused ? "is-paused" : active ? "is-running" : "is-upcoming"}" role="img" aria-label="${score ? "Score" : complete ? "Completed" : paused ? "Paused" : active ? "Running" : "Upcoming"}"${score ? ' style="visibility:hidden"' : ""}></span>
            <span class="html5QuestObjectiveLabel">${escapeHtml(objective.label || "")}</span>
            <span class="html5QuestObjectiveValue">${value}${score ? " · Score" : ""}</span>
            ${conditions.length ? `<ul class="html5QuestObjectiveNote html5QuestConditions">${conditions.map(line => `<li>${escapeHtml(line)}</li>`).join("")}</ul>` : ""}
            ${note ? `<span class="html5QuestObjectiveNote" role="status">${escapeHtml(note)}</span>` : ""}
        </li>`;
    }

    function renderAction(quest) {
        const isReady = !!quest.is_complete;
        const group = questGroup(quest);
        const status = String(quest.status || "");
        if (group === "weekly" && status === "claimed") {
            return '<div class="html5QuestStateText">Claimed</div>';
        }
        if (isReady) {
            return `<button class="html5QuestButton" type="button" data-quest-action="claim" data-quest-group="${escapeHtml(group)}" data-quest-code="${escapeHtml(quest.code || "")}">Claim Reward</button>`;
        }
        if (group === "weekly") {
            return '<div class="html5QuestStateText">Active</div>';
        }
        return `<button class="html5QuestButton is-abort" type="button" data-quest-action="abort" data-quest-group="${escapeHtml(group)}" data-quest-code="${escapeHtml(quest.code || "")}">Abort Quest</button>`;
    }

    function questKey(quest) {
        return questGroup(quest) + ":" + String(quest.code || quest.id || "");
    }

    function selectQuest(quest, index) {
        const key = quest ? questKey(quest) : "";
        if (key !== state.selectedKey) state.detailsOpen = false;
        state.selectedKey = key;
        state.selectedIndex = index;
        if (state.lastSavedSelection !== key) {
            state.lastSavedSelection = key;
            try { localStorage.setItem(SELECTION_STORAGE_KEY, key); } catch (_) {}
        }
    }

    function renderQuestCase(quest, weeklyMeta) {
        const objectives = Array.isArray(quest.objectives) ? quest.objectives : [];
        const scoreLines = Array.isArray(quest.score_lines) ? quest.score_lines : [];
        const conditions = Array.isArray(quest.constraint_labels) ? quest.constraint_labels : [];
        const description = String(quest.description || "").trim();
        const showDescription = description && !/^(Complete (the required|all|the) objectives\.?|Complete the objectives in order\.?)$/i.test(description);
        const weeklyInfo = questGroup(quest) === "weekly" ?
            ` | Week ${escapeHtml(weeklyMeta.rotation_group || "-")} | ${escapeHtml(weeklyMeta.time_remaining_text || "-")} remaining` : "";
        return `<article data-quest-code="${escapeHtml(quest.code || "")}" data-quest-state-source="${quest.live_snapshot ? "server" : "persisted"}"${quest.live_snapshot ? ` data-quest-state-serial="${state.liveSerial}"` : ""}>
            <h3 class="html5QuestCaseTitle">${escapeHtml(quest.title || "")}</h3>
            <div class="html5QuestCaseGroup">${escapeHtml(groupLabel(quest))}${weeklyInfo}</div>
            ${quest.failed_label ? `<p class="html5QuestFailure" role="alert">${escapeHtml(quest.failed_label)}</p>` : ""}
            ${quest.objective_mode_label ? `<p class="html5QuestMode">${escapeHtml(quest.objective_mode_label)}</p>` : ""}
            ${conditions.length ? `<ul class="html5QuestConditions">${conditions.map(line => `<li>${escapeHtml(line)}</li>`).join("")}</ul>` : ""}
            ${quest.live_timing && Number.isFinite(quest.live_timing.time_remaining_seconds) ? `<p class="html5QuestMode" role="status">Time remaining: ${formatNumber(quest.live_timing.time_remaining_seconds)} seconds</p>` : ""}
            <ul class="html5QuestObjectives" aria-label="Objectives">${objectives.map(renderObjective).join("")}</ul>
            ${scoreLines.length ? `<ul class="html5QuestObjectives" aria-label="Score measurements">${scoreLines.map(renderObjective).join("")}</ul>` : ""}
            <details class="html5QuestDetails"${state.detailsOpen ? " open" : ""}>
                <summary>Details / Rewards</summary>
                ${showDescription ? `<p class="html5QuestDescription">${escapeHtml(description)}</p>` : ""}
                ${rewardRows(quest) || '<div class="html5QuestReward">No reward</div>'}
            </details>
            <div class="html5QuestActions">${renderAction(quest)}</div>
        </article>`;
    }

    function readNumber(value) {
        if (value === null || value === undefined || value === "") return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : null;
    }

    function applyQuestRewardPlayerState(playerState) {
        if (!playerState || typeof playerState !== "object") return;

        let changed = false;
        const applyHeroNumber = (field, value) => {
            const parsed = readNumber(value);
            if (parsed === null) return;

            try {
                if (field === "credits" && typeof heroCredits !== "undefined" && heroCredits !== parsed) {
                    heroCredits = parsed;
                    changed = true;
                } else if (field === "uridium" && typeof heroUridium !== "undefined" && heroUridium !== parsed) {
                    heroUridium = parsed;
                    changed = true;
                } else if (field === "experience" && typeof heroXp !== "undefined" && heroXp !== parsed) {
                    heroXp = parsed;
                    changed = true;
                } else if (field === "honor" && typeof heroHonor !== "undefined" && heroHonor !== parsed) {
                    heroHonor = parsed;
                    changed = true;
                } else if (field === "level" && typeof heroLevel !== "undefined" && heroLevel !== parsed) {
                    heroLevel = parsed;
                    changed = true;
                }
            } catch (_) {}
        };

        applyHeroNumber("credits", playerState.credits);
        applyHeroNumber("uridium", playerState.uridium);
        applyHeroNumber("experience", playerState.experience);
        applyHeroNumber("honor", playerState.honor);
        applyHeroNumber("level", playerState.level);

        try {
            if (typeof ammoStock !== "undefined" && ammoStock) {
                const stockFields = { ammo_lcb10: 1, ammo_mcb25: 2, ammo_mcb50: 3, ammo_ucb100: 4,
                    ammo_sab50: 5, ammo_rsb75: 6, ammo_r310: 9, ammo_plt2026: 10,
                    ammo_plt2021: 11, ammo_plt3030: 12, ammo_emp01: 30 };
                for (const field of Object.keys(stockFields)) {
                    const amount = readNumber(playerState[field]);
                    const stockId = stockFields[field];
                    if (amount !== null && ammoStock[stockId] !== amount) {
                        ammoStock[stockId] = amount;
                        changed = true;
                    }
                }
                if (playerState.ammo_sab50 == null) {
                    const sab = readNumber(playerState.ammo_sab);
                    if (sab !== null && ammoStock[5] !== sab) { ammoStock[5] = sab; changed = true; }
                }
            }
        } catch (_) {}

        try {
            const cargoSeprom = readNumber(playerState.cargo_seprom);
            if (cargoSeprom !== null) {
                window.oreCargo = window.oreCargo || {};
                if (Number(window.oreCargo.seprom || 0) !== cargoSeprom) {
                    window.oreCargo.seprom = cargoSeprom;
                    changed = true;
                }
                if (typeof heroCargo !== "undefined" && window.oreCargo) {
                    const oreKeys = ["prometium", "endurium", "terbium", "prometid", "duranium", "promerium", "seprom", "palladium"];
                    const nextCargo = oreKeys.reduce((sum, key) => sum + (parseInt(window.oreCargo[key], 10) || 0), 0);
                    if (heroCargo !== nextCargo) {
                        heroCargo = nextCargo;
                        changed = true;
                    }
                }
            }
        } catch (_) {}

        if (!changed) return;

        try {
            const userContent = document.getElementById("content_user");
            if (userContent && userContent.dataset) {
                delete userContent.dataset.__sig;
            }
            if (userContent && typeof renderFlashUserInfoWindow === "function") {
                renderFlashUserInfoWindow(userContent);
            }
        } catch (_) {}

        try {
            if (typeof renderActionDrawerItems === "function") {
                renderActionDrawerItems();
            }
        } catch (_) {}

        try {
            if (typeof drawQuickbar === "function") {
                drawQuickbar();
            }
        } catch (_) {}
    }

    function requestQuestRewardRuntimeSync() {
        try {
            if (typeof sendRaw === "function") {
                sendRaw("QST|SYNC");
            }
        } catch (_) {}
    }

    // QST STATE contains display snapshots from the authenticated game session.
    // This code does not interpret AST predicates, advance clocks, validate an
    // objective, persist progress or calculate any reward.
    function readSnapshot(raw) {
        if (!raw || raw.schema_version !== 1 || !Number.isSafeInteger(raw.serial) || raw.serial < 0 ||
            !Number.isFinite(raw.server_time_ms) || raw.server_time_ms < 0 || !Array.isArray(raw.missions) || raw.missions.length > 16) return null;
        const seen = new Set();
        for (const mission of raw.missions) {
            if (!mission || !/^[A-Za-z0-9:_-]{1,96}$/.test(mission.code || "") || seen.has(mission.code) ||
                !/^[a-f0-9]{32}$/i.test(mission.attempt_id || "") || !/^[a-f0-9]{64}$/i.test(mission.definition_sha256 || "") ||
                !Number.isSafeInteger(mission.state_version) || mission.state_version < 0 ||
                typeof mission.completed !== "boolean" || !Array.isArray(mission.nodes) || mission.nodes.length > 512 ||
                (mission.failed_reason != null && (typeof mission.failed_reason !== "string" || mission.failed_reason.length > 96)) ||
                (mission.completed && mission.failed_reason)) return null;
            seen.add(mission.code);
            const nodeIds = new Set();
            for (const node of mission.nodes) {
                if (!node || !/^[A-Za-z0-9_.:-]{1,96}$/.test(node.id || "") || nodeIds.has(node.id) ||
                    !Number.isFinite(node.current) || node.current < 0 || !Number.isFinite(node.required) || node.required < 0 ||
                    typeof node.active !== "boolean" || typeof node.completed !== "boolean" ||
                    (node.blocked_reason != null && (typeof node.blocked_reason !== "string" || node.blocked_reason.length > 96))) return null;
                nodeIds.add(node.id);
            }
        }
        if (raw.legacy != null) {
            if (!Array.isArray(raw.legacy) || raw.legacy.length > 32) return null;
            const legacyKeys = new Set();
            for (const mission of raw.legacy) {
                if (!mission || !["legacy", "weekly"].includes(mission.kind) || !Number.isSafeInteger(mission.id) || mission.id < 1 ||
                    !/^[A-Za-z0-9:_-]{1,96}$/.test(mission.code || "") || typeof mission.completed !== "boolean" ||
                    !Array.isArray(mission.objectives) || mission.objectives.length > 64 ||
                    (mission.kind === "legacy" && !/^[a-f0-9]{32}$/i.test(mission.attempt_id || "")) ||
                    (mission.kind === "weekly" && !/^\d{4}-W\d{2}$/.test(mission.week_key || ""))) return null;
                const key = mission.kind + ":" + mission.id;
                if (legacyKeys.has(key)) return null;
                legacyKeys.add(key);
                const objectives = new Set();
                for (const node of mission.objectives) {
                    if (!node || typeof node.type !== "string" || !/^[a-z_]{1,40}$/.test(node.type) ||
                        typeof node.target !== "string" || !node.target || node.target.length > 96 ||
                        !Number.isSafeInteger(node.current) || node.current < 0 || !Number.isSafeInteger(node.required) || node.required < 1) return null;
                    const nodeKey = node.type + "|" + node.target;
                    if (objectives.has(nodeKey)) return null;
                    objectives.add(nodeKey);
                }
            }
        }
        return raw;
    }

    function legacyMetadataMatches(quest, live, weekly) {
        if (!live || Number(quest.id) !== live.id || live.code !== quest.code ||
            (weekly ? live.week_key !== quest.week_key : live.attempt_id !== quest.attempt_id)) return false;
        const byKey = new Map(live.objectives.map(node => [node.type + "|" + node.target, node]));
        const metadata = Array.isArray(quest.objectives) ? quest.objectives : [];
        const metadataKeys = new Set();
        // A completion flag belongs to this exact set of server objectives.
        // Never combine a new goal with an older response describing other goals.
        if (metadata.length !== live.objectives.length || metadata.some(objective => {
            if (!objective || typeof objective !== "object") return true;
            const key = String(objective.type || "") + "|" + String(objective.target || "");
            if (metadataKeys.has(key)) return true;
            metadataKeys.add(key);
            const node = byKey.get(key);
            return !node || Number(objective.required ?? objective.required_amount) !== node.required;
        })) return false;
        return true;
    }

    // These are already validated server counters. This overlay cannot accept,
    // complete or reward a mission and never delays a number until a SQL poll.
    function applyLiveLegacy(quest, weekly) {
        const live = state.liveLegacy.get((weekly ? "weekly:" : "legacy:") + Number(quest.id));
        if (!legacyMetadataMatches(quest, live, weekly) || !["in_progress", "ready"].includes(String(quest.status || ""))) return quest;
        const byKey = new Map(live.objectives.map(node => [node.type + "|" + node.target, node]));
        const metadata = quest.objectives;
        const objectives = metadata.map(objective => {
            const node = byKey.get(String(objective.type || "") + "|" + String(objective.target || ""));
            const persisted = Number(objective.current ?? objective.current_amount ?? 0);
            // These counters only increase inside one attempt/week. Both inputs
            // are authoritative; SQL and STATE may arrive in either order.
            const confirmed = Math.max(node.current, Number.isSafeInteger(persisted) && persisted >= 0 ? persisted : 0);
            const current = Math.min(node.required, confirmed);
            return Object.assign({}, objective, { current, current_amount: current,
                current_display: formatProgressNumber(current, objective.progress_unit || ""),
                progress_text: liveProgressText(objective, current, node.required),
                raw_current: confirmed, complete: current >= node.required, is_complete: current >= node.required,
                percent: Math.min(100, current / node.required * 100) });
        });
        return Object.assign({}, quest, { objectives, is_complete: quest.is_complete === true || live.completed, live_snapshot: true });
    }

    function hasCompleteLiveMetadata() {
        if (!state.data || !state.liveSnapshotKnown || !state.liveLegacySnapshotKnown) return false;
        const raw = getRawActiveQuests(state.data);
        const historical = raw.filter(q => questGroup(q) === "historical");
        const legacy = raw.filter(q => questGroup(q) !== "historical" && ["in_progress", "ready", "failed"].includes(String(q.status || "")));
        const weekly = state.data.weekly && Array.isArray(state.data.weekly.missions)
            ? state.data.weekly.missions.filter(q => ["in_progress", "ready"].includes(String(q.status || ""))) : [];
        if (historical.length !== state.liveMissions.size || legacy.length + weekly.length !== state.liveLegacy.size) return false;
        return historical.every(q => {
            const live = state.liveMissions.get(String(q.code || ""));
            return live && live.attempt_id === q.attempt_id && live.definition_sha256 === q.definition_sha256;
        }) && legacy.every(q => legacyMetadataMatches(q, state.liveLegacy.get("legacy:" + Number(q.id)), false)) &&
            weekly.every(q => legacyMetadataMatches(q, state.liveLegacy.get("weekly:" + Number(q.id)), true));
    }

    function runtimeReason(quest, code, failure) {
        const labels = quest.runtime_reason_labels || (state.data && state.data.runtime_reason_labels) || {};
        if (code && typeof labels[code] === "string") return labels[code];
        return failure ? "This mission has failed." : (labels.conditions_not_met || "Waiting for the required conditions.");
    }

    function liveProgressText(objective, current, required) {
        const unit = String(objective.progress_unit || "");
        return formatProgressNumber(current, unit) + (required != null && Number(required) > 0 ? " / " + formatProgressNumber(required, "") : "") + (unit ? " " + unit : "");
    }

    function formatProgressNumber(value, unit) {
        const number = Number(value);
        if (!Number.isFinite(number)) return "0";
        const shown = unit === "seconds" ? Math.floor(number) : number;
        const decimals = Number.isInteger(shown) ? 0 : 1;
        try { return new Intl.NumberFormat("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(shown); }
        catch (_) { return decimals ? shown.toFixed(1) : formatNumber(shown); }
    }

    function applyLiveMission(quest) {
        const live = state.liveMissions.get(String(quest.code || ""));
        if (!live || live.attempt_id !== quest.attempt_id || live.definition_sha256 !== quest.definition_sha256 ||
            Number(quest.state_version || 0) > live.state_version) return quest;
        const byId = new Map(live.nodes.map(node => [node.id, node]));
        const objectives = (Array.isArray(quest.objectives) ? quest.objectives : []).map(objective => {
            const node = byId.get(String(objective.id || ""));
            if (!node || Number(objective.required ?? objective.required_amount) !== node.required) return objective;
            return Object.assign({}, objective, {
                current: node.current, current_amount: node.current, current_display: formatProgressNumber(node.current, objective.progress_unit || ""),
                progress_text: liveProgressText(objective, node.current, node.required),
                complete: node.completed, is_complete: node.completed, active: node.active,
                runtime_paused: node.active && !node.completed && !!node.blocked_reason && !["running", "completed", "ready"].includes(node.blocked_reason),
                runtime_note: !node.completed && node.blocked_reason ? runtimeReason(quest, node.blocked_reason, false) : ""
            });
        });
        const scoreLines = (Array.isArray(quest.score_lines) ? quest.score_lines : []).map(line => {
            const value = live.scoring && live.scoring[String(line.score_key)];
            return Number.isFinite(value) && value >= 0 ? Object.assign({}, line, {
                current: value, progress_text: liveProgressText(line, value, null)
            }) : line;
        });
        const timing = live.timing && typeof live.timing === "object" ? live.timing : null;
        return Object.assign({}, quest, { objectives, score_lines: scoreLines, live_snapshot: true,
            live_timing: timing, is_complete: live.completed && !live.failed_reason,
            status: live.failed_reason ? "failed" : live.completed ? "ready" : "in_progress",
            failed_label: live.failed_reason ? runtimeReason(quest, live.failed_reason, true) : "" });
    }

    function getRawActiveQuests(data) {
        if (data && Array.isArray(data.activeQuests)) {
            return data.activeQuests;
        }

        const questsByTab = data && data.quests ? data.quests : {};
        const basic = Array.isArray(questsByTab.basic) ? questsByTab.basic.map(q => Object.assign({ group: "basic" }, q)) : [];
        const pvp = Array.isArray(questsByTab.pvp) ? questsByTab.pvp.map(q => Object.assign({ group: "pvp" }, q)) : [];
        const havok = Array.isArray(questsByTab.havok) ? questsByTab.havok.map(q => Object.assign({ group: "havok" }, q)) : [];
        const historical = Array.isArray(questsByTab.historical) ? questsByTab.historical.map(q => Object.assign({ group: "historical" }, q)) : [];
        return basic.concat(pvp, havok, historical).filter(q => ["in_progress", "ready", "failed"].includes(String(q.status || "")));
    }

    function getActiveQuests(data) {
        return getRawActiveQuests(data).filter(quest => questGroup(quest) !== "historical" ||
            !state.liveSnapshotKnown || state.liveMissions.has(String(quest.code || "")))
            .map(quest => questGroup(quest) === "historical" ? applyLiveMission(quest) : applyLiveLegacy(quest, false));
    }

    function receiveQuestServerState(raw) {
        const snapshot = readSnapshot(raw);
        if (!snapshot || snapshot.serial <= state.liveSerial) return false;
        state.liveSerial = snapshot.serial;
        state.liveServerTimeMs = snapshot.server_time_ms;
        state.liveSnapshotKnown = true;
        state.liveLegacySnapshotKnown = Array.isArray(snapshot.legacy);
        const previous = state.liveMissions;
        const next = new Map();
        for (const mission of snapshot.missions) {
            const old = previous.get(mission.code);
            if (old && old.attempt_id === mission.attempt_id && old.state_version > mission.state_version) next.set(mission.code, old);
            else next.set(mission.code, mission);
        }
        state.liveMissions = next;
        state.liveLegacy = new Map((snapshot.legacy || []).map(mission => [mission.kind + ":" + mission.id, mission]));
        publishQuestPresentationSnapshot();
        const known = getRawActiveQuests(state.data || {}).filter(q => questGroup(q) === "historical");
        const knownLegacy = getRawActiveQuests(state.data || {}).filter(q => questGroup(q) !== "historical");
        const knownWeekly = (state.data && state.data.weekly && Array.isArray(state.data.weekly.missions)) ? state.data.weekly.missions : [];
        const needsMetadata = (state.liveLegacySnapshotKnown && !hasCompleteLiveMetadata()) || snapshot.missions.some(live => !known.some(q => q.code === live.code && q.attempt_id === live.attempt_id && q.definition_sha256 === live.definition_sha256)) ||
            known.some(q => !next.has(String(q.code || ""))) || (snapshot.legacy || []).some(live => live.kind === "weekly"
                ? !knownWeekly.some(q => Number(q.id) === live.id && q.code === live.code && q.week_key === live.week_key)
                : !knownLegacy.some(q => Number(q.id) === live.id && q.code === live.code && q.attempt_id === live.attempt_id));
        if (needsMetadata && Date.now() - state.lastLifecycleFetch >= 2000) {
            state.lastLifecycleFetch = Date.now();
            scheduleQuestRefreshFromServer();
        }
        if (shouldRefresh()) render();
        return true;
    }

    function getWeeklyState(data) {
        const weekly = data && data.weekly && typeof data.weekly === "object" ? data.weekly : {};
        return {
            meta: weekly.meta && typeof weekly.meta === "object" ? weekly.meta : {},
            missions: Array.isArray(weekly.missions) ? weekly.missions.map(quest => applyLiveLegacy(quest, true)) : []
        };
    }

    function render() {
        const root = getRoot();
        if (!root) return;
        root.classList.add("html5QuestContent");
        const currentList = root.querySelector(".html5QuestActiveList");
        const previousScrollTop = currentList ? currentList.scrollTop : 0;
        const focused = document.activeElement;
        const focusedKey = focused && root.contains(focused) ? focused.getAttribute("data-quest-select") : null;
        const weekly = getWeeklyState(state.data || {});
        const quests = getActiveQuests(state.data || {}).concat(weekly.missions.map(q => Object.assign({}, q, { group: "weekly" })));
        const maxActive = state.data && state.data.maxActive != null ? Number(state.data.maxActive || 5) : 5;
        let bodyHtml = "";
        let dotsHtml = "";
        if (!state.data) {
            bodyHtml = state.error ? '<div class="html5QuestLoading">Active missions could not be loaded.</div>' :
                '<div class="html5QuestLoading">Loading active missions...</div>';
        } else if (!quests.length) {
            // Do not erase a persisted selection on the initial render before the API responds.
            if (state.data) selectQuest(null, 0);
            bodyHtml = state.data && state.data.questCatalogueMode === "historical"
                ? '<div class="html5QuestEmpty">No active quests.<br>Open Mission Control on the website to accept a mission.</div>'
                : `<div class="html5QuestEmpty">No active quests.<br>Accept up to ${formatNumber(maxActive)} Basic, PVP or Havok quests from the Quest page.</div>`;
        } else {
            let index = quests.findIndex(q => questKey(q) === state.selectedKey);
            if (index < 0) index = Math.min(state.selectedIndex, quests.length - 1);
            selectQuest(quests[index], index);
            dotsHtml = `<nav class="html5QuestDots" aria-label="Tracked quest">${quests.map((q, i) =>
                `<button type="button" class="html5QuestDot" data-quest-select="${escapeHtml(questKey(q))}" aria-pressed="${i === index}" title="${escapeHtml(q.title || q.code)}" aria-label="Track ${escapeHtml(q.title || q.code)}"></button>`).join("")}</nav>`;
            bodyHtml = renderQuestCase(quests[index], weekly.meta);
        }
        const feedback = state.error ? `<div class="html5QuestFeedback is-error" role="alert">${escapeHtml(state.error)}</div>` :
            state.message ? `<div class="html5QuestFeedback is-success" role="status">${escapeHtml(state.message)}</div>` : "";
        root.innerHTML = `<div class="html5QuestTracker">${dotsHtml}<div class="html5QuestActiveList">${feedback}${bodyHtml}</div></div>`;
        const nextList = root.querySelector(".html5QuestActiveList");
        if (nextList) nextList.scrollTop = previousScrollTop;
        bindEvents(root);
        if (focusedKey) {
            const dot = Array.from(root.querySelectorAll("[data-quest-select]")).find(b => b.getAttribute("data-quest-select") === focusedKey);
            if (dot) dot.focus({ preventScroll: true });
        }
        applyQuestWindowBounds();
    }

    function bindEvents(root) {
        root.querySelectorAll("[data-quest-select]").forEach((btn, index) => {
            btn.addEventListener("click", () => {
                state.selectedKey = btn.getAttribute("data-quest-select");
                state.selectedIndex = index;
                state.detailsOpen = false;
                const list = root.querySelector(".html5QuestActiveList");
                if (list) list.scrollTop = 0;
                render();
            });
        });
        const details = root.querySelector(".html5QuestDetails");
        if (details) details.addEventListener("toggle", () => {
            if (root.contains(details)) state.detailsOpen = details.open;
        });
        root.querySelectorAll("[data-quest-action][data-quest-code]").forEach(btn => {
            btn.disabled = state.actionPending || state.loading;
            btn.addEventListener("click", () => {
                performQuestAction(btn.getAttribute("data-quest-action"), btn.getAttribute("data-quest-code"),
                    btn.getAttribute("data-quest-group") || "basic");
            });
        });
    }

    async function requestJson(action, body) {
        const options = {
            credentials: "same-origin"
        };

        let url = QUEST_API_URL;
        if (body) {
            const params = new URLSearchParams();
            params.set("action", action);
            params.set("csrf_token", state.csrfToken || "");
            Object.keys(body).forEach(k => params.set(k, body[k]));
            options.method = "POST";
            options.headers = {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
            };
            options.body = params.toString();
        } else {
            url += "?action=" + encodeURIComponent(action) + "&_=" + Date.now();
            options.method = "GET";
        }

        const response = await fetch(url, options);
        const json = await response.json().catch(() => null);
        if (!json) {
            throw new Error("Quest API returned an invalid response.");
        }
        if (!response.ok || json.ok === false) {
            throw new Error(json.error || "Quest API request failed.");
        }
        return json;
    }

    async function loadQuests(showLoading) {
        if (state.loading || state.actionPending) {
            state.needsRefresh = true;
            return;
        }
        state.needsRefresh = false;
        state.loading = true;
        const epoch = state.connectionEpoch;
        if (showLoading) {
            state.error = "";
            render();
        }

        try {
            const json = await requestJson("list_active");
            if (epoch !== state.connectionEpoch) {
                state.needsRefresh = true;
                return;
            }
            state.data = json;
            state.csrfToken = json.csrfToken || state.csrfToken;
            state.error = "";
        } catch (e) {
            state.error = e && e.message ? e.message : "Unable to load active quests.";
        } finally {
            state.loading = false;
            render();
            if (state.needsRefresh && shouldRefresh()) {
                scheduleQuestRefreshFromServer();
            }
        }
    }

    async function performQuestAction(action, code, group) {
        if (state.actionPending || state.loading || !action || !code) return;
        state.actionPending = true;
        state.error = "";
        state.message = "";
        render();

        try {
            const json = await requestJson(action, {
                quest_code: code,
                quest_group: group
            });
            state.data = json;
            state.csrfToken = json.csrfToken || state.csrfToken;
            state.message = json.message || "Quest reward claimed.";
            if (action === "claim") {
                applyQuestRewardPlayerState(json.playerState);
            }
            requestQuestRewardRuntimeSync();
            state.error = "";
            publishQuestLifecycleSignal(action);
        } catch (e) {
            state.error = e && e.message ? e.message : "Quest action failed.";
        } finally {
            state.actionPending = false;
            render();
            if (state.needsRefresh && shouldRefresh()) {
                scheduleQuestRefreshFromServer();
            }
        }
    }

    function applyQuestWindowBounds() {
        const win = getWindow();
        const root = getRoot();
        if (!win || !root) return;
        // Fill the whole content body under the native Flash-like title bar.
        // The actual dark transparent body is painted by .windowInterior::after so it covers
        // the full interior, including the margins around the quest cards.
        const header = win.querySelector(".gwHeader");
        const headerHeight = header ? Math.max(0, Math.round(header.offsetTop + header.offsetHeight)) : 28;
        root.style.setProperty("left", "0px", "important");
        root.style.setProperty("right", "0px", "important");
        root.style.setProperty("top", headerHeight + "px", "important");
        root.style.setProperty("bottom", "0px", "important");
        root.style.setProperty("width", "auto", "important");
        root.style.setProperty("height", "auto", "important");
        root.style.setProperty("background", "transparent", "important");
        root.style.setProperty("background-image", "none", "important");
        root.style.setProperty("background-color", "transparent", "important");
        root.style.setProperty("background-size", "auto", "important");
        root.style.setProperty("overflow", "hidden", "important");
    }

    function shouldRefresh() {
        const win = getWindow();
        return !win || win.style.display !== "none";
    }

    function observeQuestWindowVisibility() {
        const win = getWindow();
        if (!win || state.observedWindow === win || typeof MutationObserver !== "function") return;
        if (state.visibilityObserver) state.visibilityObserver.disconnect();
        state.observedWindow = win;
        state.windowVisible = shouldRefresh();
        state.visibilityObserver = new MutationObserver(() => {
            const visible = shouldRefresh();
            const opened = visible && !state.windowVisible;
            state.windowVisible = visible;
            if (opened) {
                // The window may have remained closed through accept/abort/claim
                // notifications. Opening always obtains fresh PHP metadata.
                render();
                scheduleQuestRefreshFromServer();
            }
        });
        state.visibilityObserver.observe(win, { attributes: true, attributeFilter: ["style"] });
    }

    function resetQuestServerState() {
        state.connectionEpoch++;
        state.liveSerial = -1;
        state.liveSnapshotKnown = false;
        state.liveLegacySnapshotKnown = false;
        state.liveServerTimeMs = 0;
        state.liveMissions.clear();
        state.liveLegacy.clear();
        state.needsRefresh = true;
        try {
            const bytes = new Uint32Array(2);
            crypto.getRandomValues(bytes);
            state.streamId = state.connectionEpoch + ":" + Array.from(bytes).map(n => n.toString(16)).join("");
        } catch (_) { state.streamId = state.connectionEpoch + ":" + Date.now() + ":" + Math.random().toString(36).slice(2); }
    }

    function publishQuestLifecycleSignal(action) {
        const playerId = Number((window.ANDROMEDA_CONFIG || {}).userID || 0);
        if (!Number.isSafeInteger(playerId) || playerId <= 0 || !["abort", "claim"].includes(action)) return false;
        // This is emitted only after a successful authoritative POST. Other
        // tabs must fetch PHP again; no reward or progress is trusted here.
        const signal = { player_id: playerId, action,
            nonce: "client:" + Date.now().toString(36) + ":" + Math.random().toString(36).slice(2) };
        state.lastLifecycleNonce = signal.nonce;
        try { if (state.lifecycleChannel) state.lifecycleChannel.postMessage(signal); } catch (_) {}
        try { localStorage.setItem("andromeda_quest_lifecycle_v1:" + playerId, JSON.stringify(signal)); } catch (_) {}
        return true;
    }

    function handleQuestLifecycleSignal(signal) {
        const playerId = String((window.ANDROMEDA_CONFIG || {}).userID || "");
        if (!signal || String(signal.player_id || "") !== playerId || !["accept", "abort", "claim"].includes(signal.action) ||
            !/^[A-Za-z0-9_.:-]{8,128}$/.test(signal.nonce || "") || signal.nonce === state.lastLifecycleNonce) return false;
        state.lastLifecycleNonce = signal.nonce;
        state.needsRefresh = true;
        // A same-origin signal is only an invalidation hint. PHP and C# still
        // supply every authoritative state and enforce all permissions.
        if (!state.lifecycleSyncTimer) state.lifecycleSyncTimer = window.setTimeout(() => {
            state.lifecycleSyncTimer = null;
            requestQuestRewardRuntimeSync();
            scheduleQuestRefreshFromServer();
        }, QUEST_SERVER_DEBOUNCE_MS);
        return true;
    }

    function bindQuestLifecycleSignals() {
        const playerId = String((window.ANDROMEDA_CONFIG || {}).userID || "");
        const storageKey = "andromeda_quest_lifecycle_v1:" + playerId;
        window.addEventListener("storage", event => {
            if (event.key !== storageKey || typeof event.newValue !== "string" || event.newValue.length > 2048) return;
            try { handleQuestLifecycleSignal(JSON.parse(event.newValue)); } catch (_) {}
        });
        if (typeof BroadcastChannel === "function") {
            try {
                state.lifecycleChannel = new BroadcastChannel("andromeda-quest-lifecycle-v1");
                state.lifecycleChannel.addEventListener("message", event => handleQuestLifecycleSignal(event.data));
                state.presentationChannel = new BroadcastChannel("andromeda-quest-state-v1");
                state.presentationChannel.addEventListener("message", event => {
                    const request = event.data;
                    if (request && request.type === "request" && String(request.player_id || "") === playerId && Date.now() - state.lastPresentationReply >= 500) {
                        state.lastPresentationReply = Date.now();
                        publishQuestPresentationSnapshot();
                    }
                });
            } catch (_) { /* Storage events and the existing revision poll remain available. */ }
        }
    }

    function publishQuestPresentationSnapshot() {
        if (!state.presentationChannel || !state.liveSnapshotKnown) return;
        try { state.presentationChannel.postMessage({ player_id: (window.ANDROMEDA_CONFIG || {}).userID,
            serial: state.liveSerial, server_time_ms: state.liveServerTimeMs, stream_id: state.streamId,
            missions: Array.from(state.liveMissions.values()) }); } catch (_) {}
    }

    function scheduleQuestRefreshFromServer() {
        state.needsRefresh = true;

        if (state.actionPending || state.loading) {
            return;
        }

        if (!shouldRefresh()) {
            return;
        }

        // Coalesce from the first notification; repeated updates must not keep
        // postponing the metadata request forever.
        if (state.serverRefreshTimer) return;

        state.serverRefreshTimer = window.setTimeout(() => {
            state.serverRefreshTimer = null;
            if (!state.actionPending && shouldRefresh()) {
                applyQuestWindowBounds();
                loadQuests(false);
            }
        }, QUEST_SERVER_DEBOUNCE_MS);
    }

    function startRefreshTimer() {
        if (state.refreshTimer) return;
        state.refreshTimer = window.setInterval(() => {
            if (!state.actionPending && shouldRefresh()) {
                applyQuestWindowBounds();
                loadQuests(false);
            }
        }, QUEST_REFRESH_MS);
    }

    // QST UPD is only a progress hint. Full STATE packets already cover those
    // numbers; bootstrap, lifecycle, visibility and fallback refreshes below
    // still call the unconditional local metadata function.
window.scheduleQuestRefreshFromServer = function scheduleQuestProgressHintRefresh(reason) {
    if (reason !== "progress" || !hasCompleteLiveMetadata()) scheduleQuestRefreshFromServer();
    };
    window.receiveQuestServerState = receiveQuestServerState;

    window.initQuestWindow = function initQuestWindow() {
        injectQuestStyles();

        const win = getWindow();
        if (win) {
            win.classList.add("questWindow");
        }

        if (!state.initialized) {
            state.initialized = true;
            bindQuestLifecycleSignals();
            window.addEventListener("andromeda:ws-open", () => {
                resetQuestServerState();
                scheduleQuestRefreshFromServer();
            });
            window.addEventListener("andromeda:ws-close", resetQuestServerState);
            window.addEventListener("focus", () => {
                if (shouldRefresh()) scheduleQuestRefreshFromServer();
            });
            document.addEventListener("visibilitychange", () => {
                if (!document.hidden && shouldRefresh()) scheduleQuestRefreshFromServer();
            });
        }

        observeQuestWindowVisibility();
        applyQuestWindowBounds();
        render();
        loadQuests(true);
        startRefreshTimer();
    };
})();
