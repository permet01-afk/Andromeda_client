<?php

/** Read-only presentation of the existing quest service results. No persistence. */
final class MissionControlPresenter
{
    private const GROUPS = [
        'normal' => 'Normal',
        'challenges' => 'Challenges',
        'daily' => 'Daily',
        'event' => 'Event',
        'contracts' => 'Hunting Contracts',
        'basic' => 'Basic Quests',
        'pvp' => 'PVP',
        'havok' => 'Havok Quests',
        'weekly' => 'Weekly Missions',
    ];

    private const HISTORICAL_GROUPS = ['normal', 'challenges', 'daily', 'event'];

    private const FILTERS = [
        'all' => 'All',
        'available' => 'Available',
        'active' => 'Active',
        'completed' => 'Completed',
        'locked' => 'Unavailable',
    ];

    public static function escape($value): string
    {
        return htmlspecialchars(self::text($value), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    public static function url(string $group, string $selectedKey = '', string $filter = 'all', string $notice = ''): string
    {
        $group = isset(self::GROUPS[$group]) ? $group : 'contracts';
        $filter = isset(self::FILTERS[$filter]) ? $filter : 'all';
        $query = ['page' => 'user', 'tab' => 'quests', 'section' => $group];
        if ($selectedKey !== '') {
            $query['mc_selected'] = $selectedKey;
        }
        if ($filter !== 'all') {
            $query['mc_filter'] = $filter;
        }
        if (in_array($notice, ['accepted', 'claimed', 'aborted', 'contract_claimed', 'weekly_claimed'], true)) {
            $query['quest_msg'] = $notice;
        }
        return 'view.php?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986);
    }

    public static function returnUrl(string $group, string $code, string $notice): string
    {
        // A changed status must not make the submitted mission vanish behind a filter.
        return self::url($group, $group . ':' . $code, 'all', $notice);
    }

    public static function build(array $catalogues, array $context = []): array
    {
        $historicalMode = !empty($context['historicalMode']);
        $defaultSection = $historicalMode ? 'normal' : 'contracts';
        $section = self::text($context['section'] ?? $defaultSection);
        $section = isset(self::GROUPS[$section]) ? $section : $defaultSection;
        if ($historicalMode && in_array($section, ['basic', 'pvp'], true)) {
            $section = 'normal';
        }
        $filter = self::text($context['filter'] ?? 'all');
        $filter = isset(self::FILTERS[$filter]) ? $filter : 'all';
        $checkedStates = null;
        if (is_string($context['states'] ?? null)) {
            $requestedStates = explode(',', $context['states']);
            $checkedStates = array_values(array_filter(['available', 'locked', 'completed'], static function (string $state) use ($requestedStates): bool {
                return in_array($state, $requestedStates, true);
            }));
        }
        $activeCount = (int)($context['activeCount'] ?? 0);
        $maxCount = isset($context['maxActiveCount']) && is_numeric($context['maxActiveCount'])
            ? (int)$context['maxActiveCount'] : 5;
        $legacyActiveCount = $activeCount;
        $legacyMaxCount = $maxCount;
        $historicalMeta = is_array($context['historicalMeta'] ?? null) ? $context['historicalMeta'] : [];
        if ($historicalMode && in_array($section, self::HISTORICAL_GROUPS, true)) {
            $activeCount = $section === 'normal' ? (int)($historicalMeta['activeCount'] ?? 0) : 0;
            // Only the Normal quota is established. Empty future categories have no fabricated cap.
            $maxCount = $section === 'normal' && isset($historicalMeta['maxActive'])
                ? (int)$historicalMeta['maxActive'] : null;
        }
        $company = (int)($context['company'] ?? 0);
        $minimumLevels = is_array($context['minimumLevels'] ?? null) ? $context['minimumLevels'] : [];
        $missions = [];
        $groups = [];

        $groupLabels = self::GROUPS;
        if ($historicalMode) {
            unset($groupLabels['basic'], $groupLabels['pvp']);
        } else {
            foreach (self::HISTORICAL_GROUPS as $historicalGroup) {
                unset($groupLabels[$historicalGroup]);
            }
        }
        foreach ($groupLabels as $group => $label) {
            $rows = is_array($catalogues[$group] ?? null) ? $catalogues[$group] : [];
            $count = 0;
            $groupHistorical = $historicalMode && in_array($group, self::HISTORICAL_GROUPS, true);
            $groupActiveCount = $groupHistorical ? ($group === 'normal' ? (int)($historicalMeta['activeCount'] ?? 0) : 0) : $legacyActiveCount;
            $groupMaxCount = $groupHistorical ? ($group === 'normal' && isset($historicalMeta['maxActive']) ? (int)$historicalMeta['maxActive'] : null) : $legacyMaxCount;
            $limitReached = $groupMaxCount !== null && $groupActiveCount >= $groupMaxCount;
            $hasLevels = false;
            foreach ($rows as $row) {
                if (!is_array($row)) {
                    continue;
                }
                if (in_array($group, self::HISTORICAL_GROUPS, true) && !self::historicalVisible($row, $company)) continue;
                $mission = $group === 'contracts'
                    ? self::contract($row)
                    : (in_array($group, self::HISTORICAL_GROUPS, true)
                        ? self::historicalQuest($group, $row, $limitReached)
                        : self::quest($group, $row, $limitReached, $minimumLevels));
                if (isset($mission['minLevel']) && is_numeric($mission['minLevel'])) $hasLevels = true;
                $missions[] = $mission;
                $count++;
                if ($groupHistorical && $group !== 'normal' && in_array($mission['state'], ['active', 'ready'], true)) ++$groupActiveCount;
            }
            if ($groupHistorical && $group === $section) $activeCount = $groupActiveCount;
            $groups[] = ['id' => $group, 'label' => $label, 'count' => $count, 'url' => self::url($group),
                'activeCount' => $groupActiveCount, 'maxActiveCount' => $groupMaxCount, 'hasLevels' => $hasLevels];
        }

        $sectionRows = array_values(array_filter($missions, static function (array $mission) use ($section): bool {
            return $mission['group'] === $section;
        }));
        $visible = array_values(array_filter($sectionRows, static function (array $mission) use ($filter, $checkedStates): bool {
            if ($checkedStates !== null) {
                $bucket = in_array($mission['state'], ['active', 'ready'], true) ? 'available' : $mission['state'];
                return in_array($bucket, $checkedStates, true) && ($filter !== 'active' || in_array($mission['state'], ['active', 'ready'], true));
            }
            return self::matchesFilter($mission, $filter);
        }));
        $selectedKey = self::text($context['selectedKey'] ?? '');
        $selected = null;
        foreach ($visible as $mission) {
            if ($mission['id'] === $selectedKey) {
                $selected = $mission;
                break;
            }
        }
        if ($selected === null && $visible) {
            $selected = $visible[0];
        }
        $filters = [];
        foreach (self::FILTERS as $id => $label) {
            $count = count(array_filter($sectionRows, static function (array $mission) use ($id): bool {
                return self::matchesFilter($mission, $id);
            }));
            $filters[] = ['id' => $id, 'label' => $label, 'count' => $count, 'url' => self::url($section, '', $id)];
        }

        return [
            'section' => $section,
            'filter' => $filter,
            'checkedStates' => $checkedStates,
            'selectedKey' => $selected['id'] ?? '',
            'selected' => $selected,
            'groups' => $groups,
            'missions' => $missions,
            'visibleMissions' => $visible,
            'filters' => $filters,
            'activeCount' => $activeCount,
            'maxActiveCount' => $maxCount,
            'historicalMode' => $historicalMode,
            'historicalMeta' => $historicalMeta,
            'company' => in_array($company, [1, 2, 3], true) ? $company : 0,
            'playerId' => max(0, (int)($context['playerId'] ?? 0)),
            'runtimeReasonLabels' => is_array($context['runtimeReasonLabels'] ?? null) ? $context['runtimeReasonLabels'] : [],
            'weeklyMeta' => is_array($context['weeklyMeta'] ?? null) ? $context['weeklyMeta'] : [],
            'csrfToken' => self::text($context['csrfToken'] ?? ''),
            'notice' => self::text($context['notice'] ?? ''),
            'lifecycleNotice' => is_array($context['lifecycleNotice'] ?? null) ? $context['lifecycleNotice'] : [],
            'error' => self::text($context['error'] ?? ''),
            'weeklyError' => self::text($context['weeklyError'] ?? ''),
        ];
    }

    private static function historicalVisible(array $row, int $company): bool
    {
        foreach (['presentation_visible', 'company_allowed', 'technical_available'] as $field) {
            if (array_key_exists($field, $row) && !$row[$field]) return false;
        }
        if (($row['admission_lock_kind'] ?? '') === 'technical') return false;
        if (isset($row['eligible_companies']) && in_array($company, [1, 2, 3], true)) {
            $labels = self::companyLabels($row['eligible_companies']);
            if (!in_array([1 => 'MMO', 2 => 'EIC', 3 => 'VRU'][$company], $labels, true)) return false;
        }
        return true;
    }

    private static function historicalQuest(string $group, array $row, bool $limitReached = false): array
    {
        $mission = self::quest($group, $row, false, []);
        $status = self::text($row['status'] ?? 'locked');
        $accepted = in_array($status, ['in_progress', 'ready', 'failed'], true);
        $completed = in_array($status, ['completed', 'claimed'], true);
        $claimAllowed = array_key_exists('can_claim', $row) ? !empty($row['can_claim']) : !empty($row['is_complete']);
        $ready = !$completed && $accepted && $status !== 'failed' && $claimAllowed;
        $canAccept = !$completed && !$accepted && !empty($row['can_accept']);
        $failed = $status === 'failed';
        $mission['state'] = $completed ? 'completed' : ($ready ? 'ready' : ($accepted ? 'active' : ($canAccept ? 'available' : 'locked')));
        $labels = ['available' => 'Available', 'active' => 'In progress', 'ready' => 'Ready', 'completed' => 'Completed', 'locked' => 'Unavailable'];
        $mission['stateLabel'] = $failed ? 'Failed' : $labels[$mission['state']];
        $mission['lockReason'] = self::text($row['locked_reason'] ?? '');
        if ($canAccept && $limitReached) $mission['lockReason'] = 'Maximum active quests reached.';
        $mission['isAutomatic'] = false;
        $mission['isHistorical'] = true;
        $mission['constraintLabels'] = is_array($row['constraint_labels'] ?? null) ? $row['constraint_labels'] : [];
        $mission['scoringLabels'] = is_array($row['scoring_labels'] ?? null) ? $row['scoring_labels'] : [];
        $mission['scoreLines'] = is_array($row['score_lines'] ?? null) ? $row['score_lines'] : [];
        $mission['failureLabel'] = self::text($row['failed_label'] ?? '');
        $mission['attemptId'] = self::text($row['attempt_id'] ?? '');
        $mission['definitionSha256'] = self::text($row['definition_sha256'] ?? '');
        $mission['stateVersion'] = max(0, (int)($row['state_version'] ?? 0));
        $mission['adaptationNotice'] = self::text($row['adaptation_notice'] ?? '');
        if (!empty($row['level_unknown'])) {
            $mission['description'] = 'Mission details are unavailable for your company.';
        }
        $mission['eligibleCompanies'] = ($row['company_scope_complete'] ?? true) === false ? [] : self::companyLabels($row['eligible_companies'] ?? []);
        $mission['prerequisiteLabels'] = self::prerequisiteLabels($row['prerequisites'] ?? []);
        $mission['objectiveModeLabel'] = self::text($row['objective_structure_label'] ?? ($row['objective_mode_label'] ?? ($row['combination_label'] ?? '')));
        $modeLabels = ['AND' => 'Complete all objectives.', 'OR' => 'Complete one of the alternatives.', 'SEQUENCE' => 'Complete the objectives in order.', 'N_OF_M' => 'Complete the required number of objectives.', 'LEAF' => ''];
        $mission['objectiveModeLabel'] = $modeLabels[strtoupper($mission['objectiveModeLabel'])] ?? $mission['objectiveModeLabel'];
        $types = array_column($mission['objectives'], 'type');
        $mission['iconType'] = array_intersect($types, ['kill_player', 'damage_player']) ? 'pvp'
            : (array_intersect($types, ['stay_on_map', 'survive', 'visit_map', 'visit_coordinates', 'travel_distance']) ? 'time' : 'kill');
        $mission['actions'] = [];
        if ($ready) {
            $mission['actions'][] = self::action('claim', 'Claim Reward', 'claim_historical', ['quest_code' => $mission['code']]);
        } elseif ($accepted) {
            $mission['actions'][] = self::action('abort', 'Abort Quest', 'abort_historical', ['quest_code' => $mission['code']]);
        } elseif (!$completed) {
            $mission['actions'][] = self::action('accept', 'Accept Quest', 'accept_historical', ['quest_code' => $mission['code']], $canAccept && !$limitReached);
        }
        return $mission;
    }

    private static function companyLabels($values): array
    {
        $labels = [1 => 'MMO', 2 => 'EIC', 3 => 'VRU'];
        $result = [];
        foreach (is_array($values) ? $values : [] as $value) {
            $value = is_scalar($value) ? (string)$value : '';
            $label = $labels[(int)$value] ?? strtoupper($value);
            if (in_array($label, ['MMO', 'EIC', 'VRU'], true) && !in_array($label, $result, true)) {
                $result[] = $label;
            }
        }
        return $result;
    }

    private static function prerequisiteLabels($values): array
    {
        $result = [];
        foreach (is_array($values) ? $values : [] as $value) {
            if (is_array($value)) {
                $label = self::text($value['title'] ?? ($value['label'] ?? ($value['name'] ?? '')));
                if ($label !== '') {
                    $result[] = $label;
                }
            }
        }
        return $result;
    }

    private static function matchesFilter(array $mission, string $filter): bool
    {
        if ($filter === 'all') {
            return true;
        }
        if ($filter === 'available') {
            return in_array($mission['state'], ['available', 'active', 'ready'], true);
        }
        if ($filter === 'active') {
            return in_array($mission['state'], ['active', 'ready'], true);
        }
        return $mission['state'] === $filter;
    }

    private static function quest(string $group, array $row, bool $limitReached, array $minimumLevels): array
    {
        $code = self::text($row['code'] ?? '');
        $status = self::text($row['status'] ?? ($group === 'weekly' ? 'in_progress' : 'available'));
        $complete = in_array($status, ['completed', 'claimed'], true);
        $accepted = $status === 'in_progress';
        $ready = $accepted && !empty($row['is_complete']);
        $automatic = $group === 'weekly';
        $locked = !$complete && !$accepted && ($automatic || $status !== 'available');
        $state = $complete ? 'completed' : ($ready ? 'ready' : ($accepted ? 'active' : ($locked ? 'locked' : 'available')));
        $reason = '';
        if ($locked) {
            $reason = $automatic ? 'Weekly missions are activated automatically.'
                : 'This quest is unavailable.';
        }
        if (!$locked && !$complete && !$accepted && $limitReached) $reason = 'Maximum active quests reached.';
        $actions = [];
        if (!$complete && $ready) {
            $actions[] = self::action('claim', $group === 'havok' ? 'Claim Havok' : 'Claim Reward', 'claim_' . $group, ['quest_code' => $code]);
        }
        if (!$automatic && $accepted && !$ready) {
            $actions[] = self::action('abort', 'Abort Quest', 'abort_' . $group, ['quest_code' => $code]);
        } elseif (!$automatic && !$complete && !$accepted) {
            $actions[] = self::action('accept', 'Accept Quest', 'accept_' . $group, ['quest_code' => $code], !$locked && !$limitReached);
        }
        $labels = ['available' => 'Available', 'active' => 'In progress', 'ready' => 'Ready', 'completed' => 'Completed', 'locked' => 'Unavailable'];
        if ($status === 'claimed') {
            $labels['completed'] = 'Claimed';
        }
        $objectives = self::objectives($row['objectives'] ?? []);
        $id = $group . ':' . $code;
        $catalogueMinimum = $group === 'weekly' ? null : ($minimumLevels[$code] ?? null);
        $minimum = $row['min_level'] ?? ($row['minLevel'] ?? $catalogueMinimum);
        $minimum = is_numeric($minimum) && (int)$minimum > 0 ? (int)$minimum : null;

        return [
            'id' => $id, 'key' => $id, 'group' => $group, 'code' => $code,
            'title' => self::text($row['title'] ?? ''),
            'description' => self::text($row['description'] ?? ''),
            'category' => self::text($row['category'] ?? self::GROUPS[$group]),
            'status' => $status, 'state' => $state, 'stateLabel' => $labels[$state],
            'lockReason' => $reason, 'isAutomatic' => $automatic,
            // Read-only catalogue metadata aids sorting, never eligibility; zero is not "Lv. 0".
            'minLevel' => $minimum,
            'recommendedLevel' => isset($row['recommended_level']) ? (int)$row['recommended_level'] : null,
            'difficulty' => self::text($row['difficulty'] ?? ''),
            'objectives' => $objectives, 'rewards' => self::rewards($row),
            'progressSummary' => self::progressSummary($objectives),
            'percent' => self::currentPercent($objectives), 'progressPercentRole' => 'current_objective',
            'actions' => $actions, 'url' => self::url($group, $id), 'formAction' => self::url($group, $id),
        ];
    }

    private static function contract(array $row): array
    {
        $npc = self::text($row['npc'] ?? '');
        $complete = !empty($row['is_maxed']);
        $ready = !$complete && !empty($row['can_claim']);
        $state = $complete ? 'completed' : ($ready ? 'ready' : 'active');
        $goal = (int)($row['goal'] ?? 0);
        $id = 'contracts:' . $npc;
        // The source still computes a next-level goal at mastery. The old UI hid
        // that level-11 preview; do not present it as a playable contract/reward.
        $objectives = $complete ? [] : [[
            'label' => 'Destroy ' . number_format($goal) . ' ' . $npc,
            'current' => (int)($row['progress'] ?? 0), 'required' => $goal,
            'percent' => self::percent($row['percent'] ?? 0), 'complete' => $ready || $complete,
        ]];
        return [
            'id' => $id, 'key' => $id, 'group' => 'contracts', 'code' => $npc,
            'title' => $npc, 'category' => 'Hunting Contract',
            'description' => $complete ? 'All contracts for this alien species have been completed.' : 'Destroy aliens to complete this hunting contract.',
            'status' => $complete ? 'completed' : 'in_progress',
            'state' => $state, 'stateLabel' => $complete ? 'Mastered' : ($ready ? 'Ready' : 'In progress'),
            'lockReason' => '', 'isAutomatic' => true, 'minLevel' => null, 'recommendedLevel' => null,
            'difficulty' => '', 'contractLevel' => (int)($row['level'] ?? 0),
            'objectives' => $objectives, 'rewards' => $complete ? [] : self::rewards($row),
            'progressSummary' => self::progressSummary($objectives),
            'percent' => self::currentPercent($objectives), 'progressPercentRole' => 'current_objective',
            'actions' => $ready ? [self::action('claim', 'Claim Reward', 'claim_contract', ['npc_name' => $npc])] : [],
            'url' => self::url('contracts', $id), 'formAction' => self::url('contracts', $id),
        ];
    }

    private static function action(string $id, string $label, string $action, array $fields, bool $enabled = true): array
    {
        return ['id' => $id, 'label' => $label, 'questAction' => $action, 'enabled' => $enabled, 'fields' => $fields];
    }

    private static function objectives($rows): array
    {
        $result = [];
        foreach (is_array($rows) ? $rows : [] as $row) {
            if (!is_array($row)) {
                continue;
            }
            $current = $row['current'] ?? ($row['current_amount'] ?? 0);
            $required = $row['required'] ?? ($row['required_amount'] ?? null);
            $score = !empty($row['score']) || !empty($row['is_score']);
            $result[] = array_merge($row, [
                'label' => self::text($row['label'] ?? 'Progress'),
                'current' => is_numeric($current) ? (int)$current : 0,
                'required' => is_numeric($required) ? (int)$required : null,
                'percent' => self::percent($row['percent'] ?? 0),
                'complete' => !empty($row['complete']) || !empty($row['is_complete']),
                'score' => $score,
                'depth' => max(0, min(5, (int)($row['depth'] ?? 0))),
                'stage' => self::text($row['stage'] ?? ''),
                'active' => !array_key_exists('active', $row) || !empty($row['active']),
            ]);
        }
        return $result;
    }

    private static function rewards(array $row): array
    {
        if (isset($row['rewards']) && is_array($row['rewards'])) {
            $rewards = [];
            $sourceRewards = $row['rewards'];
            if (array_key_exists('items', $sourceRewards) || array_key_exists('experience', $sourceRewards) || array_key_exists('credits', $sourceRewards)) {
                $displayRewards = [];
                foreach (['experience' => 'Experience', 'credits' => 'Credits', 'uridium' => 'Uridium', 'honor' => 'Honor'] as $key => $label) {
                    if (array_key_exists($key, $sourceRewards)) {
                        $displayRewards[] = ['key' => $key, 'label' => $label, 'amount' => $sourceRewards[$key]];
                    }
                }
                foreach ((array)($sourceRewards['items'] ?? []) as $item) {
                    if (is_array($item)) {
                        $displayRewards[] = $item;
                    }
                }
                $sourceRewards = $displayRewards;
            }
            foreach ($sourceRewards as $reward) {
                if (!is_array($reward)) {
                    continue;
                }
                $amount = $reward['amount'] ?? ($reward['quantity'] ?? null);
                if (!is_numeric($amount)) {
                    continue; // An unpublished historical amount never becomes a zero grant.
                }
                $rewards[] = [
                    'key' => self::text($reward['key'] ?? ''),
                    'label' => self::text($reward['label'] ?? ($reward['key'] ?? 'Reward')),
                    'amount' => (int)$amount,
                ];
            }
            return $rewards;
        }
        $labels = ['credits' => 'Credits', 'uridium' => 'Uridium', 'experience' => 'Experience', 'honor' => 'Honor', 'ucb100' => 'UCB-100', 'rsb75' => 'RSB-75', 'seprom' => 'Seprom'];
        $result = [];
        foreach ($labels as $key => $label) {
            if (array_key_exists('reward_' . $key, $row)) {
                $result[] = ['key' => $key, 'label' => $label, 'amount' => (int)$row['reward_' . $key]];
            }
        }
        if ((int)($row['reward_item_qty'] ?? 0) > 0) {
            $result[] = ['key' => 'item', 'label' => self::text($row['reward_item_name'] ?? 'Item'),
                'amount' => (int)$row['reward_item_qty'], 'itemId' => (int)($row['reward_item_id'] ?? 0)];
        }
        return $result;
    }

    private static function progressSummary(array $objectives): string
    {
        $objective = self::currentObjective($objectives);
        if ($objective === null) {
            return 'No objective.';
        }
        return $objective['label'] . ': ' . number_format($objective['current']) . ' / ' . number_format($objective['required']);
    }

    private static function currentPercent(array $objectives): float
    {
        $objective = self::currentObjective($objectives);
        return $objective === null ? 0.0 : $objective['percent'];
    }

    private static function currentObjective(array $objectives): ?array
    {
        foreach ($objectives as $objective) {
            if (empty($objective['score']) && !empty($objective['active']) && !$objective['complete']) {
                return $objective;
            }
        }
        return $objectives[0] ?? null;
    }

    private static function percent($value): float
    {
        $number = is_numeric($value) ? (float)$value : 0.0;
        return is_finite($number) ? max(0.0, min(100.0, $number)) : 0.0;
    }

    private static function text($value): string
    {
        return is_scalar($value) ? (string)$value : '';
    }
}
