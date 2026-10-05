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
        needsRefresh: false
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
            .html5QuestObjectiveLabel { overflow-wrap: anywhere; }
            .html5QuestObjectiveValue { white-space: nowrap; padding-left: 8px; }
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
            .html5QuestFeedback, .html5QuestEmpty, .html5QuestLoading { margin: 6px 0; overflow-wrap: anywhere; }
            .html5QuestFeedback.is-error { color: #ffb9b9; }
            .html5QuestFeedback.is-success { color: #88dd88; }
        `;
        document.head.appendChild(style);
    }

    function rewardRows(quest) {
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
        return "Basic Quest";
    }

    function objectiveComplete(objective) {
        const required = Number(objective.required);
        const current = Number(objective.current);
        return !!objective.complete || (Number.isFinite(required) && required > 0 &&
            Number.isFinite(current) && current >= required);
    }

    function renderObjective(objective) {
        const complete = objectiveComplete(objective);
        // The current API has no dependency/sequence information: unfinished means running.
        return `<li class="html5QuestObjectiveLine${complete ? " is-complete" : ""}">
            <span class="html5QuestObjectiveIcon ${complete ? "is-completed" : "is-running"}" role="img" aria-label="${complete ? "Completed" : "Running"}"></span>
            <span class="html5QuestObjectiveLabel">${escapeHtml(objective.label || "")}</span>
            <span class="html5QuestObjectiveValue">${formatNumber(objective.current)} / ${formatNumber(objective.required)}</span>
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
        try { localStorage.setItem(SELECTION_STORAGE_KEY, key); } catch (_) {}
    }

    function renderQuestCase(quest, weeklyMeta) {
        const objectives = Array.isArray(quest.objectives) ? quest.objectives : [];
        const weeklyInfo = questGroup(quest) === "weekly" ?
            ` | Week ${escapeHtml(weeklyMeta.rotation_group || "-")} | ${escapeHtml(weeklyMeta.time_remaining_text || "-")} remaining` : "";
        return `<article>
            <h3 class="html5QuestCaseTitle">${escapeHtml(quest.title || "")}</h3>
            <div class="html5QuestCaseGroup">${escapeHtml(groupLabel(quest))}${weeklyInfo}</div>
            <ul class="html5QuestObjectives" aria-label="Objectives">${objectives.map(renderObjective).join("")}</ul>
            <details class="html5QuestDetails"${state.detailsOpen ? " open" : ""}>
                <summary>Details / Rewards</summary>
                <p class="html5QuestDescription">${escapeHtml(quest.description || "")}</p>
                ${rewardRows(quest) || '<div class="html5QuestReward">No reward</div>'}
            </details>
            <div class="html5QuestActions">${renderAction(quest)}</div>
        </article>`;
    }

    function readNumber(value) {
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
                const ucb100 = readNumber(playerState.ammo_ucb100);
                const rsb75 = readNumber(playerState.ammo_rsb75);
                if (ucb100 !== null && ammoStock[4] !== ucb100) {
                    ammoStock[4] = ucb100;
                    changed = true;
                }
                if (rsb75 !== null && ammoStock[6] !== rsb75) {
                    ammoStock[6] = rsb75;
                    changed = true;
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

    function getActiveQuests(data) {
        if (data && Array.isArray(data.activeQuests)) {
            return data.activeQuests;
        }

        const questsByTab = data && data.quests ? data.quests : {};
        const basic = Array.isArray(questsByTab.basic) ? questsByTab.basic.map(q => Object.assign({ group: "basic" }, q)) : [];
        const pvp = Array.isArray(questsByTab.pvp) ? questsByTab.pvp.map(q => Object.assign({ group: "pvp" }, q)) : [];
        const havok = Array.isArray(questsByTab.havok) ? questsByTab.havok.map(q => Object.assign({ group: "havok" }, q)) : [];
        return basic.concat(pvp, havok).filter(q => String(q.status || "") === "in_progress");
    }

    function getWeeklyState(data) {
        const weekly = data && data.weekly && typeof data.weekly === "object" ? data.weekly : {};
        return {
            meta: weekly.meta && typeof weekly.meta === "object" ? weekly.meta : {},
            missions: Array.isArray(weekly.missions) ? weekly.missions : []
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
        if (state.loading && !state.data) {
            bodyHtml = '<div class="html5QuestLoading">Loading active quests...</div>';
        } else if (!quests.length) {
            // Do not erase a persisted selection on the initial render before the API responds.
            if (state.data) selectQuest(null, 0);
            bodyHtml = `<div class="html5QuestEmpty">No active quests.<br>Accept up to ${formatNumber(maxActive)} Basic, PVP or Havok quests from the Quest page.</div>`;
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
        if (showLoading) {
            state.error = "";
            render();
        }

        try {
            const json = await requestJson("list_active");
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
                requestQuestRewardRuntimeSync();
            }
            state.error = "";
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

    function scheduleQuestRefreshFromServer() {
        state.needsRefresh = true;

        if (state.actionPending || state.loading) {
            return;
        }

        if (!shouldRefresh()) {
            return;
        }

        if (state.serverRefreshTimer) {
            window.clearTimeout(state.serverRefreshTimer);
        }

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

    window.scheduleQuestRefreshFromServer = scheduleQuestRefreshFromServer;

    window.initQuestWindow = function initQuestWindow() {
        injectQuestStyles();

        const win = getWindow();
        if (win) {
            win.classList.add("questWindow");
        }

        if (!state.initialized) {
            state.initialized = true;
        }

        applyQuestWindowBounds();
        render();
        loadQuests(true);
        startRefreshTimer();
    };
})();
