(function () {
    "use strict";

    const QUEST_API_URL = "api/quests.php";
    const QUEST_REFRESH_MS = 60000;
    const QUEST_SERVER_DEBOUNCE_MS = 500;
    const STATUS_ICON_BASE = "graphics/ui/questSystem/images/";

    const state = {
        initialized: false,
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
                opacity: 0.40 !important;
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

            .html5QuestTracker {
                background: transparent !important;
                background-image: none !important;
            }

            .html5QuestTracker {
                position: absolute;
                inset: 5px;
                box-sizing: border-box;
                color: #d8e7f8;
                font-family: Tahoma, Arial, sans-serif;
                font-size: 11px;
                overflow: hidden;
                text-shadow: 1px 1px 0 #000;
            }

            .html5QuestActiveList {
                position: absolute;
                left: 4px;
                right: 4px;
                top: 4px;
                bottom: 4px;
                overflow-y: auto;
                overflow-x: hidden;
                padding: 0 4px 2px 0;
                box-sizing: border-box;
                scrollbar-width: thin;
            }

            .html5QuestActiveList::-webkit-scrollbar {
                width: 8px;
            }

            .html5QuestActiveList::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.28);
                border-left: 1px solid rgba(123, 92, 47, 0.25);
            }

            .html5QuestActiveList::-webkit-scrollbar-thumb {
                background: linear-gradient(180deg, #875c2b, #3f2715);
                border: 1px solid rgba(255, 205, 92, 0.28);
                border-radius: 4px;
            }

            .html5QuestCase {
                position: relative;
                display: grid;
                grid-template-columns: 22px minmax(0, 1fr) 116px;
                gap: 7px;
                margin: 0 0 6px 0;
                padding: 7px 7px 7px 7px;
                min-height: 68px;
                box-sizing: border-box;
                border: 1px solid rgba(129, 94, 44, 0.80);
                background:
                    linear-gradient(180deg, rgba(22, 17, 12, 0.46), rgba(3, 5, 8, 0.22));
                box-shadow:
                    inset 0 1px 0 rgba(255, 224, 135, 0.10),
                    0 1px 1px rgba(0, 0, 0, 0.65);
            }

            .html5QuestCase.is-ready {
                border-color: rgba(255, 213, 64, 0.96);
                box-shadow:
                    inset 0 1px 0 rgba(255, 235, 140, 0.20),
                    0 0 8px rgba(255, 207, 38, 0.18);
            }

            .html5QuestStateIcon {
                width: 16px;
                height: 16px;
                margin-top: 1px;
                background-position: center;
                background-repeat: no-repeat;
                background-size: contain;
                image-rendering: pixelated;
                filter: drop-shadow(0 1px 1px #000);
            }

            .html5QuestStateIcon.is-running {
                background-image: url('${STATUS_ICON_BASE}casecon_open_running.png');
            }

            .html5QuestStateIcon.is-ready {
                background-image: url('${STATUS_ICON_BASE}casecon_open_completed.png');
            }

            .html5QuestCaseBody {
                min-width: 0;
            }

            .html5QuestCaseTop {
                display: flex;
                align-items: baseline;
                gap: 6px;
                min-width: 0;
                margin-bottom: 3px;
            }

            .html5QuestCaseTitle {
                color: #ffe16b;
                font-size: 12px;
                font-weight: 700;
                line-height: 14px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .html5QuestCaseGroup {
                color: #78d9ff;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                opacity: 0.85;
                flex: 0 0 auto;
            }

            .html5QuestDescription {
                margin: 0 0 5px 0;
                padding: 0;
                color: #b7c7da;
                line-height: 13px;
                max-height: 28px;
                overflow: hidden;
            }

            .html5QuestObjective {
                margin-top: 3px;
            }

            .html5QuestObjectiveLine {
                display: grid;
                grid-template-columns: 14px minmax(0, 1fr) auto;
                gap: 4px;
                align-items: center;
                min-height: 14px;
            }

            .html5QuestObjectiveIcon {
                width: 12px;
                height: 12px;
                background-position: center;
                background-repeat: no-repeat;
                background-size: contain;
                image-rendering: pixelated;
            }

            .html5QuestObjectiveIcon.is-running {
                background-image: url('${STATUS_ICON_BASE}condition_running.png');
            }

            .html5QuestObjectiveIcon.is-completed {
                background-image: url('${STATUS_ICON_BASE}condition_completed.png');
            }

            .html5QuestObjectiveLabel {
                color: #dceeff;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .html5QuestObjective.is-complete .html5QuestObjectiveLabel {
                color: #9dffd3;
            }

            .html5QuestObjectiveValue {
                color: #ffdf56;
                font-weight: 700;
                white-space: nowrap;
            }

            .html5QuestTrack {
                height: 5px;
                margin: 2px 0 0 18px;
                border: 1px solid rgba(26, 49, 75, 0.92);
                background: rgba(5, 10, 19, 0.82);
                box-shadow: inset 0 1px 2px rgba(0,0,0,0.82);
                overflow: hidden;
            }

            .html5QuestFill {
                height: 100%;
                width: 0;
                background: linear-gradient(90deg, #3694d7, #f1d339);
                box-shadow: 0 0 4px rgba(255, 220, 60, 0.34);
            }

            .html5QuestFill.is-complete {
                background: linear-gradient(90deg, #42eaa7, #f5dd48);
            }

            .html5QuestSide {
                display: flex;
                flex-direction: column;
                gap: 5px;
                min-width: 0;
            }

            .html5QuestRewards {
                display: flex;
                flex-direction: column;
                gap: 2px;
                min-height: 0;
                max-height: 80px;
                overflow: hidden;
            }

            .html5QuestReward {
                display: flex;
                justify-content: space-between;
                gap: 4px;
                height: 15px;
                line-height: 15px;
                padding: 0 4px;
                box-sizing: border-box;
                border: 1px solid rgba(54, 89, 124, 0.42);
                background: rgba(4, 9, 17, 0.45);
                color: #aebed0;
                font-size: 10px;
                white-space: nowrap;
            }

            .html5QuestReward strong {
                color: #ffffff;
                font-size: 10px;
                font-weight: 700;
            }

            .html5QuestButton {
                width: 100%;
                height: 22px;
                border: 1px solid #7df9ff;
                border-radius: 3px;
                background: linear-gradient(180deg, #0f718d, #064355);
                color: #ffffff;
                font-family: Tahoma, Arial, sans-serif;
                font-size: 11px;
                font-weight: 700;
                text-shadow: 1px 1px 0 #000;
                cursor: pointer;
                box-shadow:
                    inset 0 1px 0 rgba(255,255,255,0.20),
                    0 1px 2px rgba(0,0,0,0.70);
            }

            .html5QuestButton:hover {
                background: linear-gradient(180deg, #18a7bf, #086074);
            }

            .html5QuestButton.is-abort {
                border-color: rgba(255, 130, 130, 0.72);
                background: linear-gradient(180deg, #7f2a2a, #4d1717);
                color: #ffe5e5;
            }

            .html5QuestButton.is-abort:hover {
                background: linear-gradient(180deg, #a63a3a, #681f1f);
            }

            .html5QuestButton:disabled,
            .html5QuestButton.is-locked {
                cursor: default;
                color: #b8c0c8;
                border-color: rgba(111, 136, 162, 0.45);
                background: linear-gradient(180deg, rgba(48, 64, 84, 0.88), rgba(17, 24, 34, 0.88));
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
            }

            .html5QuestStateText {
                height: 22px;
                line-height: 22px;
                text-align: center;
                border: 1px solid rgba(96, 125, 157, 0.44);
                background: rgba(0, 0, 0, 0.22);
                color: #cbd7e6;
                font-weight: 700;
            }

            .html5QuestLoading,
            .html5QuestEmpty,
            .html5QuestFeedback {
                position: absolute;
                left: 16px;
                right: 16px;
                top: 18px;
                padding: 9px 10px;
                box-sizing: border-box;
                border: 1px solid rgba(118, 91, 48, 0.80);
                background: rgba(3, 6, 10, 0.28);
                color: #d7e6f5;
                line-height: 15px;
            }

            .html5QuestFeedback.is-error {
                color: #ffb9b9;
                border-color: rgba(212, 82, 82, 0.85);
            }

            .html5QuestFeedback.is-success {
                color: #94ffd4;
                border-color: rgba(91, 194, 137, 0.80);
            }

            .html5QuestSection {
                margin: 0 0 7px 0;
            }

            .html5QuestSectionHeader {
                display: flex;
                align-items: baseline;
                justify-content: space-between;
                gap: 8px;
                margin: 0 0 5px 0;
                padding: 2px 2px 4px 2px;
                color: #78d9ff;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.04em;
            }

            .html5QuestSectionHeader span {
                color: #b7c7da;
                font-size: 10px;
                font-weight: 400;
                text-transform: none;
                letter-spacing: 0;
            }
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

    function objectiveIconClass(objective) {
        return objective && objective.complete ? "is-completed" : "is-running";
    }

    function renderObjective(objective) {
        const pct = Math.max(0, Math.min(100, Number(objective.percent || 0)));
        const completeClass = objective && objective.complete ? " is-complete" : "";
        return `
            <div class="html5QuestObjective${completeClass}">
                <div class="html5QuestObjectiveLine">
                    <span class="html5QuestObjectiveIcon ${objectiveIconClass(objective)}"></span>
                    <span class="html5QuestObjectiveLabel" title="${escapeHtml(objective.label || "")}">${escapeHtml(objective.label || "")}</span>
                    <span class="html5QuestObjectiveValue">${formatNumber(objective.current)} / ${formatNumber(objective.required)}</span>
                </div>
                <div class="html5QuestTrack"><div class="html5QuestFill${objective && objective.complete ? " is-complete" : ""}" style="width:${pct}%;"></div></div>
            </div>
        `;
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

    function renderQuestCase(quest) {
        const isReady = !!quest.is_complete;
        const isClaimed = String(quest.status || "") === "claimed";
        const objectives = Array.isArray(quest.objectives) ? quest.objectives : [];
        return `
            <article class="html5QuestCase${isReady && !isClaimed ? " is-ready" : ""}">
                <span class="html5QuestStateIcon ${isReady || isClaimed ? "is-ready" : "is-running"}"></span>
                <div class="html5QuestCaseBody">
                    <div class="html5QuestCaseTop">
                        <div class="html5QuestCaseTitle" title="${escapeHtml(quest.title || "")}">${escapeHtml(quest.title || "")}</div>
                        <div class="html5QuestCaseGroup">${escapeHtml(groupLabel(quest))}</div>
                    </div>
                    <p class="html5QuestDescription">${escapeHtml(quest.description || "")}</p>
                    <div class="html5QuestObjectives">
                        ${objectives.map(obj => renderObjective(obj)).join("")}
                    </div>
                </div>
                <aside class="html5QuestSide">
                    <div class="html5QuestRewards">${rewardRows(quest) || '<div class="html5QuestReward"><span>Reward</span><strong>None</strong></div>'}</div>
                    ${renderAction(quest)}
                </aside>
            </article>
        `;
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
        const activeQuests = getActiveQuests(state.data || {});
        const weeklyState = getWeeklyState(state.data || {});
        const weeklyMissions = weeklyState.missions;
        const activeCount = state.data && state.data.activeCount != null ? Number(state.data.activeCount || 0) : activeQuests.length;
        const maxActive = state.data && state.data.maxActive != null ? Number(state.data.maxActive || 5) : 5;

        let bodyHtml = "";
        if (state.error) {
            bodyHtml = `<div class="html5QuestFeedback is-error">${escapeHtml(state.error)}</div>`;
        } else if (state.loading && !state.data) {
            bodyHtml = '<div class="html5QuestLoading">Loading active quests...</div>';
        } else if (!activeQuests.length && !weeklyMissions.length) {
            const doneMessage = state.message ? `${escapeHtml(state.message)}<br>` : "";
            bodyHtml = `<div class="html5QuestEmpty">${doneMessage}No active quests.<br>Accept up to ${formatNumber(maxActive)} Basic, PVP or Havok quests from the Quest page.</div>`;
        } else {
            const weeklyMeta = weeklyState.meta || {};
            const weeklyHeader = weeklyMissions.length ? `
                <section class="html5QuestSection">
                    <div class="html5QuestSectionHeader">
                        Weekly Missions
                        <span>Week ${escapeHtml(weeklyMeta.rotation_group || "-")} | Time remaining: ${escapeHtml(weeklyMeta.time_remaining_text || "-")}</span>
                    </div>
                    ${weeklyMissions.map(renderQuestCase).join("")}
                </section>
            ` : "";
            const activeHeader = activeQuests.length ? `
                <section class="html5QuestSection">
                    <div class="html5QuestSectionHeader">
                        Active Quests
                        <span>${formatNumber(activeCount)} / ${formatNumber(maxActive)}</span>
                    </div>
                    ${activeQuests.slice(0, maxActive).map(renderQuestCase).join("")}
                </section>
            ` : "";
            bodyHtml = `
                <div class="html5QuestActiveList" aria-label="Active quests">
                    ${weeklyHeader}${activeHeader}
                </div>
            `;
        }

        root.innerHTML = `<div class="html5QuestTracker">${bodyHtml}</div>`;

        const nextList = root.querySelector(".html5QuestActiveList");
        if (nextList && previousScrollTop > 0) {
            nextList.scrollTop = previousScrollTop;
        }

        bindEvents(root);

        // The Quest window has strict Flash-like content geometry. Force it after render because
        // the generic window synchronizer may run again when the user toggles/resizes windows.
        applyQuestWindowBounds();
    }

    function bindEvents(root) {
        root.querySelectorAll("[data-quest-action][data-quest-code]").forEach(btn => {
            btn.addEventListener("click", () => {
                const action = btn.getAttribute("data-quest-action");
                const code = btn.getAttribute("data-quest-code");
                const group = btn.getAttribute("data-quest-group") || "basic";
                performQuestAction(action, code, group);
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
        if (state.loading) {
            state.needsRefresh = true;
            return;
        }
        state.needsRefresh = false;
        state.loading = !!showLoading;
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
        if (state.actionPending || !action || !code) return;
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
