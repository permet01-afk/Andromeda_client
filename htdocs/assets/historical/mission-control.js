(function () {
    'use strict';

    var currentContext = null;
    var publishedNotices = new Set();

    function boot(savedStates, restoreAddress) {
        savedStates = savedStates instanceof Map ? savedStates : null;
        var root = document.querySelector('[data-mc-root]');
        if (!root || root.dataset.mcInitialized === 'true') return;
        root.dataset.mcInitialized = 'true';

        if (currentContext) currentContext.destroy();
        var section = root.dataset.mcSection || 'contracts';
        var groups = new Map();
        var groupNode = root.querySelector('[data-mc-groups]');
        try { JSON.parse(groupNode ? groupNode.textContent : '[]').forEach(function (g) { groups.set(g.id, g); }); }
        catch (ignoredGroups) { /* Native links and forms remain usable. */ }
        var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-mc-tab]'));
        var groupStates = savedStates || new Map();
        var busy = false;
        var groupHasBeenShown = false;
        var pendingHistoryRoute = null;
        var list = root.querySelector('[data-mc-list]');
        var choices = Array.prototype.slice.call(root.querySelectorAll('[data-mc-choice]'));
        var details = Array.prototype.slice.call(root.querySelectorAll('[data-mc-detail]'));
        var filters = Array.prototype.slice.call(root.querySelectorAll('[data-mc-filter-state]'));
        var emptyList = root.querySelector('[data-mc-list-empty]');
        var noSelection = root.querySelector('[data-mc-no-selection]');
        var count = root.querySelector('[data-mc-visible-count]');
        var sort = root.querySelector('[data-mc-sort]');
        var activeOnlyLabel = root.querySelector('[data-mc-active-filter]');
        var activeOnly = root.dataset.mcFilter === 'active';
        var descending = false;
        var selected = '';
        var panes = new Map();
        details.forEach(function (detail) { panes.set(detail.dataset.mcKey, detail); });
        choices.forEach(function (choice) {
            if (choice.getAttribute('aria-current') === 'true') selected = choice.dataset.mcKey;
        });

        function updateAddress(key, push) {
            if (!window.history || !window.URL) return;
            try {
                var url = new URL(window.location.href);
                url.searchParams.set('section', section);
                url.searchParams.delete('quest_msg');
                if (key) url.searchParams.set('mc_selected', key);
                else url.searchParams.delete('mc_selected');
                var enabled = filters.filter(function (filter) { return filter.checked; })
                    .map(function (filter) { return filter.dataset.mcFilterState; });
                url.searchParams.set('mc_filter', activeOnly ? 'active' : (enabled.length === 1 ? enabled[0] : 'all'));
                if (enabled.length !== filters.length && enabled.length !== 1) url.searchParams.set('mc_states', enabled.join(','));
                else url.searchParams.delete('mc_states');
                var method = push ? 'pushState' : 'replaceState';
                window.history[method](window.history.state, '', url.toString());
            } catch (error) {
                // Selecting a server-rendered mission also works without history support.
            }
        }

        function select(key, updateUrl) {
            var target = panes.get(key);
            var previousSelection = selected;
            selected = target ? key : '';
            choices.forEach(function (choice) {
                var active = choice.dataset.mcKey === selected;
                choice.classList.toggle('is-selected', active);
                choice.setAttribute('aria-current', active ? 'true' : 'false');
            });
            details.forEach(function (detail) {
                var active = detail.dataset.mcKey === selected;
                detail.hidden = !active;
                if (active && previousSelection !== selected) {
                    detail.querySelectorAll('.mc-pane-scroll,.mc-description-scroll').forEach(function (pane) {
                        pane.scrollTop = 0;
                    });
                }
            });
            if (noSelection) noSelection.hidden = Boolean(target);
            if (updateUrl) updateAddress(selected);
        }

        function filterChoices(updateUrl) {
            var checked = new Set(filters.filter(function (filter) { return filter.checked; })
                .map(function (filter) { return filter.dataset.mcFilterState; }));
            var visible = [];
            choices.forEach(function (choice) {
                var state = choice.dataset.mcState;
                var group = state === 'active' || state === 'ready' ? 'available' : state;
                var show = (!choice.dataset.mcGroup || choice.dataset.mcGroup === section) && checked.has(group) && (!activeOnly || state === 'active' || state === 'ready');
                choice.hidden = !show;
                if (show) visible.push(choice);
            });
            if (count) count.textContent = String(visible.length);
            if (emptyList) emptyList.hidden = visible.length > 0;
            if (activeOnlyLabel) activeOnlyLabel.hidden = !activeOnly;
            var selectedVisible = visible.some(function (choice) { return choice.dataset.mcKey === selected; });
            select(selectedVisible ? selected : (visible[0] ? visible[0].dataset.mcKey : ''), updateUrl);
        }

        choices.forEach(function (choice) {
            choice.addEventListener('click', function (event) {
                if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                if (!panes.has(choice.dataset.mcKey)) return;
                event.preventDefault();
                select(choice.dataset.mcKey, true);
            });
            choice.addEventListener('keydown', function (event) {
                if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
                var visible = Array.prototype.slice.call(list.querySelectorAll('[data-mc-choice]'))
                    .filter(function (entry) { return !entry.hidden; });
                var index = visible.indexOf(choice);
                var next = visible[index + (event.key === 'ArrowDown' ? 1 : -1)];
                if (!next) return;
                event.preventDefault();
                next.focus();
                select(next.dataset.mcKey, true);
            });
        });

        filters.forEach(function (filter) {
            filter.addEventListener('change', function () {
                activeOnly = false;
                filterChoices(true);
            });
        });

        if (sort && list) {
            sort.addEventListener('click', function () {
                descending = !descending;
                sort.classList.toggle('is-descending', descending);
                sort.setAttribute('aria-label', 'Sort by level, ' + (descending ? 'descending' : 'ascending'));
                var ordered = choices.slice().sort(function (left, right) {
                    var a = left.dataset.mcLevel === '' ? null : Number(left.dataset.mcLevel);
                    var b = right.dataset.mcLevel === '' ? null : Number(right.dataset.mcLevel);
                    if (a === null && b !== null) return 1;
                    if (b === null && a !== null) return -1;
                    if (a !== null && b !== null && a !== b) return descending ? b - a : a - b;
                    return Number(left.dataset.mcOrder) - Number(right.dataset.mcOrder);
                });
                ordered.forEach(function (choice) { list.appendChild(choice); });
            });
        }

        var windowPanel = root.querySelector('[data-mc-window]');
        var reopenPanel = root.querySelector('[data-mc-reopen]');
        var openButton = root.querySelector('[data-mc-open]');
        var closeButton = root.querySelector('[data-mc-close]');
        if (windowPanel && reopenPanel && openButton && closeButton) {
            closeButton.addEventListener('click', function () {
                windowPanel.hidden = true;
                reopenPanel.hidden = false;
                openButton.focus();
            });
            openButton.addEventListener('click', function () {
                windowPanel.hidden = false;
                reopenPanel.hidden = true;
                closeButton.focus();
            });
        }

        // Mission Control is a manually refreshed snapshot. It deliberately
        // has no game-state subscription, focus refresh, polling or timer.
        function rememberGroup() {
            var activeDetail = panes.get(selected);
            groupStates.set(section, {
                selected: selected, descending: descending, activeOnly: activeOnly,
                checked: filters.filter(function (f) { return f.checked; }).map(function (f) { return f.dataset.mcFilterState; }),
                scrollTop: list ? list.scrollTop : 0,
                detailScroll: activeDetail ? Array.prototype.slice.call(activeDetail.querySelectorAll('.mc-pane-scroll,.mc-description-scroll'))
                    .map(function (pane) { return pane.scrollTop; }) : []
            });
        }

        function sortCurrent() {
            if (!list) return;
            choices.slice().sort(function (left, right) {
                var a = left.dataset.mcLevel === '' ? null : Number(left.dataset.mcLevel);
                var b = right.dataset.mcLevel === '' ? null : Number(right.dataset.mcLevel);
                if (a === null && b !== null) return 1;
                if (b === null && a !== null) return -1;
                if (a !== null && b !== null && a !== b) return descending ? b - a : a - b;
                return Number(left.dataset.mcOrder) - Number(right.dataset.mcOrder);
            }).forEach(function (choice) { list.appendChild(choice); });
            if (sort) {
                sort.classList.toggle('is-descending', descending);
                sort.setAttribute('aria-label', 'Sort by level, ' + (descending ? 'descending' : 'ascending'));
            }
        }

        function showGroup(id, address, fromAddress) {
            if (!groups.has(id)) return false;
            if (groupHasBeenShown) rememberGroup();
            section = id;
            root.dataset.mcSection = id;
            var group = groups.get(id);
            var state = groupStates.get(id) || { selected: '', checked: ['available', 'locked', 'completed'], activeOnly: false, descending: false, scrollTop: 0 };
            selected = state.selected;
            activeOnly = state.activeOnly;
            descending = state.descending;
            filters.forEach(function (f) { f.checked = state.checked.indexOf(f.dataset.mcFilterState) >= 0; });
            if (fromAddress) {
                var url = new URL(window.location.href);
                var key = url.searchParams.get('mc_selected') || '';
                selected = key;
                var filter = url.searchParams.get('mc_filter') || 'all';
                activeOnly = filter === 'active';
                var custom = url.searchParams.get('mc_states');
                filters.forEach(function (f) {
                    f.checked = custom !== null ? custom.split(',').indexOf(f.dataset.mcFilterState) >= 0
                        : filter === 'all' || (filter === 'active' && f.dataset.mcFilterState === 'available') || filter === f.dataset.mcFilterState;
                });
            }
            tabs.forEach(function (tab) {
                var isCurrent = tab.dataset.mcTab === id;
                tab.classList.toggle('is-selected', isCurrent);
                tab.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
                tab.setAttribute('tabindex', isCurrent ? '0' : '-1');
                if (isCurrent) tab.setAttribute('aria-current', 'page');
                else tab.removeAttribute('aria-current');
            });
            var activeCount = root.querySelector('[data-mc-active-count]');
            if (activeCount) activeCount.textContent = String(group.activeCount) + (group.maxActiveCount === null || group.maxActiveCount === undefined ? '' : ' / ' + String(group.maxActiveCount));
            var tabPanel = root.querySelector('[data-mc-tab-panel]');
            if (tabPanel) tabPanel.setAttribute('aria-labelledby', 'mc-tab-' + id);
            root.querySelectorAll('[data-mc-weekly-summary]').forEach(function (node) { node.hidden = id !== 'weekly'; });
            if (sort) sort.disabled = !group.hasLevels;
            sortCurrent();
            filterChoices(false);
            if (list) list.scrollTop = state.scrollTop;
            if (selected === state.selected && Array.isArray(state.detailScroll) && panes.has(selected)) {
                panes.get(selected).querySelectorAll('.mc-pane-scroll,.mc-description-scroll').forEach(function (pane, index) {
                    if (Number.isFinite(state.detailScroll[index])) pane.scrollTop = state.detailScroll[index];
                });
            }
            if (address) updateAddress(selected, address === 'push');
            groupHasBeenShown = true;
            return true;
        }

        tabs.forEach(function (tab, index) {
            tab.addEventListener('click', function (event) {
                if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                if (!groups.has(tab.dataset.mcTab)) return;
                event.preventDefault();
                if (!busy && tab.dataset.mcTab !== section) showGroup(tab.dataset.mcTab, 'push');
            });
            tab.addEventListener('keydown', function (event) {
                var next;
                if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
                if (event.key === 'ArrowLeft') next = tabs[(index + tabs.length - 1) % tabs.length];
                if (event.key === 'Home') next = tabs[0];
                if (event.key === 'End') next = tabs[tabs.length - 1];
                if (!next || busy) return;
                event.preventDefault();
                next.focus();
                if (next.dataset.mcTab !== section) showGroup(next.dataset.mcTab, 'push');
            });
        });
        function canonicalSection(id) {
            var fallback = groups.has('normal') ? 'normal' : 'contracts';
            if (id === 'daily') return 'weekly';
            if (!id || id === 'challenges' || id === 'event' || (groups.has('normal') && (id === 'basic' || id === 'pvp'))) return fallback;
            return id;
        }

        function onPopState() {
            var url = new URL(window.location.href);
            if (url.searchParams.get('page') !== 'user' || url.searchParams.get('tab') !== 'quests') return;
            var id = canonicalSection(url.searchParams.get('section'));
            if (busy) pendingHistoryRoute = window.location.href;
            else showGroup(id, false, true);
        }
        window.addEventListener('popstate', onPopState);
        currentContext = { destroy: function () { window.removeEventListener('popstate', onPopState); } };

        function publishSiteNotice() {
            var noticeNode = root.querySelector('[data-mc-lifecycle-notice]');
            var hint;
            try { hint = JSON.parse(noticeNode ? noticeNode.textContent : 'null'); } catch (ignoredNotice) { return; }
            if (!hint || Number(hint.player_id) !== Number(root.dataset.mcPlayerId) || !/^[a-f0-9]{24}$/.test(hint.nonce || '')
                || ['accept', 'abort', 'claim'].indexOf(hint.action) < 0 || publishedNotices.has(hint.nonce)) return;
            publishedNotices.add(hint.nonce);
            try {
                var channel = new BroadcastChannel('andromeda-quest-lifecycle-v1');
                channel.postMessage(hint);
                channel.close();
            } catch (ignoredBroadcast) { /* The game's existing revision fallback still applies. */ }
            try { window.localStorage.setItem('andromeda_quest_lifecycle_v1:' + String(hint.player_id), JSON.stringify(hint)); }
            catch (ignoredStorage) { /* Never retry a successful action to send a hint. */ }
        }

        function localError(message) {
            var error = root.querySelector('[data-mc-action-error]');
            if (!error) {
                error = document.createElement('p');
                error.className = 'mc-message mc-message--error';
                error.setAttribute('data-mc-action-error', '');
                error.setAttribute('role', 'alert');
                var host = root.querySelector('[data-mc-window]') || root;
                host.insertBefore(error, host.querySelector('[data-mc-tab]') ? host.querySelector('[data-mc-tab]').parentElement : host.firstChild);
            }
            error.textContent = message;
        }

        root.addEventListener('submit', function (event) {
            var form = event.target;
            if (!form || !form.classList.contains('mc-action-form') || !window.fetch || !window.FormData || !window.DOMParser) return;
            var target = new URL(form.action || window.location.href, window.location.href);
            if (target.origin !== window.location.origin) { event.preventDefault(); return; }
            event.preventDefault();
            if (busy) return;
            var body = new FormData(form);
            var submitter = event.submitter;
            if (submitter && submitter.name) body.append(submitter.name, submitter.value);
            rememberGroup();
            busy = true;
            root.setAttribute('aria-busy', 'true');
            var buttons = Array.prototype.slice.call(root.querySelectorAll('button[type="submit"]'));
            var disabledBefore = buttons.map(function (button) { return button.disabled; });
            buttons.forEach(function (button) { button.disabled = true; });
            // Only this explicit site action reads a new server snapshot.
            // A transport failure never repeats the POST automatically.
            window.fetch(target.toString(), { method: 'POST', body: body, credentials: 'same-origin', redirect: 'follow', cache: 'no-store' })
                .then(function (response) {
                    if (!response.ok || new URL(response.url, window.location.href).origin !== window.location.origin) throw new Error('invalid-response');
                    return response.text();
                }).then(function (html) {
                    var page = new DOMParser().parseFromString(html, 'text/html');
                    var next = page.querySelector('[data-mc-root]');
                    if (!next || next.dataset.mcPlayerId !== root.dataset.mcPlayerId) throw new Error('session-expired');
                    ['pilot-credits', 'pilot-uridium', 'pilot-xp', 'pilot-honor'].forEach(function (id) {
                        var live = document.getElementById(id), fresh = page.getElementById(id);
                        if (live && fresh) live.textContent = fresh.textContent;
                    });
                    var liveHeader = document.querySelector('.app-header');
                    var freshHeader = page.querySelector('.app-header');
                    if (liveHeader && freshHeader && /^\d+$/.test(freshHeader.dataset.pilotLevel || '')) {
                        liveHeader.dataset.pilotLevel = freshHeader.dataset.pilotLevel;
                        var levelLabel = document.querySelector('.hist-rev6-header-level span');
                        if (levelLabel) levelLabel.textContent = freshHeader.dataset.pilotLevel;
                    }
                    var nextRoot = document.importNode(next, true);
                    root.replaceWith(nextRoot);
                    boot(groupStates, pendingHistoryRoute);
                    var firstAlert = nextRoot.querySelector('[role="alert"]');
                    if (firstAlert) { firstAlert.setAttribute('tabindex', '-1'); firstAlert.focus(); }
                }).catch(function () {
                    localError('Unable to confirm the result. Refresh this page manually before trying the action again.');
                    if (pendingHistoryRoute) {
                        var requested = canonicalSection(new URL(pendingHistoryRoute).searchParams.get('section'));
                        showGroup(requested, false, true);
                        pendingHistoryRoute = null;
                    }
                }).finally(function () {
                    busy = false;
                    root.removeAttribute('aria-busy');
                    buttons.forEach(function (button, index) { button.disabled = disabledBefore[index]; });
                });
        });

        if (groups.size) {
            if (restoreAddress) {
                var requestedSection = canonicalSection(new URL(restoreAddress, window.location.href).searchParams.get('section'));
                if (groups.has(requestedSection)) section = requestedSection;
            }
            var initialKey = selected;
            if (!groupStates.has(section)) {
                groupStates.set(section, { selected: initialKey, checked: filters.filter(function (f) { return f.checked; }).map(function (f) { return f.dataset.mcFilterState; }), activeOnly: activeOnly, descending: descending, scrollTop: 0 });
            }
            showGroup(section, false, !savedStates || Boolean(restoreAddress));
        }
        publishSiteNotice();
        if (!groups.size) filterChoices(false);
        if (groups.size) updateAddress(selected, false);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
}());
