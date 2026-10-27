<?php
declare(strict_types=1);

/** Player-facing vocabulary for the existing historical quest AST. No game rules or persistence. */
final class HistoricalQuestLabels
{
    public static function number($value): string
    {
        if (!is_numeric($value)) return '—';
        $value = (float)$value;
        return number_format($value, floor($value) === $value ? 0 : 1, '.', ',');
    }

    public static function duration($seconds): string
    {
        $seconds = max(0, (int)$seconds);
        // Keep the native seconds counter; only human-readable instructions use minutes/hours.
        if ($seconds < 120 || $seconds % 60 !== 0) return self::number($seconds) . ($seconds === 1 ? ' second' : ' seconds');
        $hours = intdiv($seconds, 3600); $minutes = intdiv($seconds % 3600, 60); $parts = [];
        if ($hours) $parts[] = self::number($hours) . ($hours === 1 ? ' hour' : ' hours');
        if ($minutes) $parts[] = self::number($minutes) . ($minutes === 1 ? ' minute' : ' minutes');
        return implode(' ', $parts);
    }

    private static function join(array $values, string $conjunction = 'or'): string
    {
        $values = array_values(array_unique(array_filter($values, static fn($x) => $x !== '')));
        if (count($values) < 2) return (string)($values[0] ?? '');
        $last = array_pop($values);
        return implode(', ', $values) . ' ' . $conjunction . ' ' . $last;
    }

    private static function joinMaps(array $labels): string
    {
        $labels = array_values(array_unique($labels));
        foreach (["your company's map " => "your company's maps ", 'map ' => 'maps '] as $prefix => $plural) {
            if (count($labels) > 1 && count(array_filter($labels, static fn($x) => str_starts_with($x, $prefix))) === count($labels))
                return $plural . self::join(array_map(static fn($x) => substr($x, strlen($prefix)), $labels));
        }
        return self::join($labels);
    }

    private static function targets($value): string
    {
        if (is_array($value)) return self::join(array_map(static fn($x) => self::targets($x), $value));
        $value = is_scalar($value) ? trim((string)$value) : '';
        return ['enemy' => 'enemy pilots', 'enemy players' => 'enemy pilots', 'other_two_companies' => 'enemy pilots', 'mysterious_cube' => 'the mission object'][$value] ?? $value;
    }

    /** Resolves the same company-relative map vocabulary understood by the server. */
    public static function map($value, int $company): string
    {
        if (is_array($value)) return self::joinMaps(array_map(static fn($x) => self::map($x, $company), $value));
        $map = is_scalar($value) ? trim((string)$value) : '';
        $map = preg_replace('/\s+maps?$/i', '', $map) ?? $map;
        if (strpos($map, ',') !== false) return self::joinMaps(array_map(static fn($x) => self::map(trim($x), $company), explode(',', $map)));
        if ($map === '') return '';
        if (preg_match('/^(MMO|EIC|VRU)_territory$/', $map, $m)) return $m[1] . ' territory';
        if ($map === 'PvP_maps' || $map === '4-X') return 'PvP maps (4-1, 4-2, 4-3 or 4-4)';
        $enemy = preg_match('/^(enemy_|enemy |each_enemy_|one_enemy_)/', $map) === 1;
        if (in_array($map, ['enemy_home_maps', 'one_enemy_X-1', 'enemy_home'], true)) {
            $maps = [];
            foreach ([1, 2, 3] as $f) if ($f !== $company) $maps[] = $f . '-1';
            return ($map === 'one_enemy_X-1' ? 'one enemy home map (' : 'enemy home maps (') . self::join($maps) . ')';
        }
        $relative = preg_replace('/^(?:each_enemy_|one_enemy_|enemy_|enemy |own_|own )/', '', $map) ?? $map;
        if (preg_match('/^X-([1-8])$/', $relative, $m)) {
            if ($enemy) {
                $maps = [];
                foreach ([1, 2, 3] as $f) if ($f !== $company) $maps[] = $f . '-' . $m[1];
                return 'enemy maps (' . self::join($maps) . ')';
            }
            return in_array($company, [1, 2, 3], true) ? "your company's map " . $company . '-' . $m[1] : "your company's corresponding map";
        }
        if (preg_match('/^[1-4]-[1-8]$/', $relative)) return 'map ' . $relative;
        return 'the required map'; // A newly introduced enum is never shown to a player.
    }

    private static function onMap($value, int $company): string
    {
        $map = self::map($value, $company);
        return $map === '' ? '' : (str_ends_with($map, ' territory') ? ' in ' : ' on ') . $map;
    }

    private static function weapon($value): string
    {
        return ['rockets' => 'rockets', 'rocket' => 'rockets', 'laser' => 'lasers', 'lasers' => 'lasers', 'X-1 laser' => 'LCB-10 laser ammunition', 'x-1 laser' => 'LCB-10 laser ammunition', 'X-2 laser' => 'X-2 laser ammunition', 'x-2 laser' => 'X-2 laser ammunition'][(string)$value] ?? 'the required weapon';
    }

    public static function leaf(array $node, int $company, $current = 0): array
    {
        $action = (string)($node['action'] ?? ''); $quantity = $node['quantity'] ?? null;
        $n = self::number($quantity); $target = self::targets($node['targets'] ?? $node['target'] ?? '');
        if (!empty($node['variant']) && $node['variant'] !== 'normal') $target = (string)$node['variant'] . ' ' . $target;
        $map = $node['maps'] ?? $node['map'] ?? null; $unit = ''; $supported = true;
        switch ($action) {
            case 'kill_npc': $label = ($node['aggregation'] ?? '') === 'one_shared_counter_across_allowed_species' ? 'Destroy ' . $n . ' aliens in total: ' . $target : 'Destroy ' . $n . ' ' . $target; break;
            case 'collect_ore': $label = 'Collect ' . $n . ' ' . $target; break;
            case 'collect_resource': $label = 'Acquire ' . $n . ' ' . $target; break;
            case 'collect_cargo_ore': $label = 'Collect ' . $n . ' ' . $target . ' from destroyed-ship cargo'; break;
            case 'steal_player_cargo': $label = 'Steal ' . $n . ' enemy ' . (!empty($node['ships']) ? self::targets($node['ships']) . ' ' : '') . 'cargo ' . ((float)$quantity === 1.0 ? 'box' : 'boxes'); $unit = 'boxes'; break;
            case 'collect_cargo_box': $label = 'Collect ' . $n . ' cargo boxes'; $unit = 'boxes'; break;
            case 'collect_bonus_box': $label = 'Collect ' . $n . ' bonus boxes'; $unit = 'boxes'; break;
            case 'kill_player':
                $raw = (string)($node['target'] ?? ''); $faction = (string)($node['target_company'] ?? '');
                if ($faction === '' && preg_match('/^(MMO|EIC|VRU) ships$/', $raw, $m)) $faction = $m[1];
                $hull = preg_replace('/^(?:enemy )/', '', $raw) ?? $raw;
                if (in_array($hull, ['enemy', 'enemy players', 'players', 'MMO ships', 'EIC ships', 'VRU ships'], true)) $hull = '';
                $label = 'Destroy ' . $n . ' ' . (in_array($faction, ['MMO', 'EIC', 'VRU'], true) ? $faction : 'enemy') . ($hull !== '' ? ' ' . $hull : '') . ' pilots';
                break;
            case 'damage_npc': case 'assist_damage_npc':
                $label = 'Deal ' . $n . (is_array($node['targets'] ?? $node['target'] ?? null) ? ' total damage to ' : ' damage to ') . $target . ($action === 'assist_damage_npc' ? ' without destroying them' : ''); $unit = 'damage'; break;
            case 'damage_player':
                $hulls = self::targets($node['ships'] ?? []);
                $faction = (string)($node['target_company'] ?? '');
                $label = 'Deal ' . $n . ' total damage to ' . (in_array($faction, ['MMO', 'EIC', 'VRU'], true) ? $faction : 'enemy') . ' pilots' . ($hulls !== '' ? ' flying ' . $hulls . ' ships' : ''); $unit = 'damage'; break;
            case 'take_damage': $label = 'Take ' . $n . ' damage'; $unit = 'damage'; break;
            case 'stay_on_map':
                $map = $map ?? $node['target'] ?? '';
                $label = 'Stay' . self::onMap($map, $company) . ' for ' . self::duration($quantity); $map = null; $unit = 'seconds'; break;
            case 'visit_map':
                $map = $map ?? $node['target'] ?? '';
                $destination = self::map($map, $company);
                if ((float)$quantity === 1.0) $destination = str_replace(['enemy home maps (', 'enemy maps ('], ['one enemy home map (', 'one enemy map ('], $destination);
                $label = 'Visit ' . $destination . ((float)$quantity > 1.0 ? ' ' . $n . ' times' : ''); $map = null; $unit = 'visits'; break;
            case 'visit_control_center': $label = 'Visit Mission Control'; $unit = 'visits'; break;
            case 'visit_coordinates':
                $point = $node['position'] ?? $node['coordinates'] ?? $node['target'] ?? [];
                $label = is_array($point) && count($point) >= 2 ? 'Reach position ' . self::number($point[0]) . ' / ' . self::number($point[1]) : 'Reach the required position'; $unit = 'positions'; break;
            case 'travel_distance': $label = 'Travel ' . $n . ' distance units'; $unit = 'distance units'; break;
            case 'travel_radiation_zone': $label = 'Travel ' . $n . ' distance units in the radiation zone'; $unit = 'distance units'; break;
            case 'galaxy_gate_complete': case 'complete_galaxy_gate': $label = 'Complete ' . $n . ' ' . $target . ' Galaxy ' . ((float)$quantity === 1.0 ? 'Gate' : 'Gates'); $unit = 'gates'; break;
            default: $label = 'Objective details unavailable'; $supported = false;
        }
        if ($map !== null) $label .= self::onMap($map, $company);
        $conditions = [];
        if (!empty($node['required_weapon'])) $conditions[] = 'Use only ' . self::weapon($node['required_weapon']) . '.';
        if (array_key_exists('cloaked', $node)) $conditions[] = $node['cloaked'] ? 'Remain cloaked.' : 'Remain uncloaked.';
        if (isset($node['hp_fraction_max'])) $conditions[] = 'Keep HP below ' . self::number((float)$node['hp_fraction_max'] * 100) . '%.';
        if (!empty($node['continuous'])) $conditions[] = 'Remain there continuously.';
        if (!empty($node['max_absence_seconds'])) $conditions[] = 'Do not remain outside these maps for more than ' . self::duration($node['max_absence_seconds']) . ' after first entering.';
        $current = max(0, min((float)($quantity ?? 0), is_numeric($current) ? (float)$current : 0));
        $displayCurrent = self::number($unit === 'seconds' ? floor($current) : $current);
        return ['label' => $label, 'conditions' => array_values(array_unique($conditions)), 'progress_unit' => $unit,
            'current_display' => $displayCurrent, 'required_display' => $n,
            'progress_text' => $displayCurrent . ' / ' . $n . ($unit !== '' ? ' ' . $unit : ''), 'label_supported' => $supported];
    }

    public static function constraints(array $constraints): array
    {
        $labels = [];
        if (!empty($constraints['no_death'])) $labels[] = 'Do not die.';
        if (isset($constraints['max_deaths'])) $labels[] = 'Maximum deaths: ' . self::number($constraints['max_deaths']) . '.';
        if (!empty($constraints['time_limit_seconds'])) $labels[] = 'Time limit: ' . self::duration($constraints['time_limit_seconds']) . '.';
        if (!empty($constraints['no_fire'])) $labels[] = 'Do not fire any weapons.';
        if (!empty($constraints['no_movement'])) $labels[] = 'Do not move.';
        if (isset($constraints['max_damage_received'])) $labels[] = 'Do not take more than ' . self::number($constraints['max_damage_received']) . ' damage.';
        if (!empty($constraints['required_weapon'])) $labels[] = 'Use only ' . self::weapon($constraints['required_weapon']) . '.';
        if (isset($constraints['max_player_kills'])) $labels[] = 'Do not destroy more than ' . self::number($constraints['max_player_kills']) . ' enemy pilots.';
        if (!empty($constraints['prohibited_kill_targets'])) $labels[] = 'Do not destroy ' . self::targets($constraints['prohibited_kill_targets']) . '.';
        if (!empty($constraints['prohibited_damage_target'])) $labels[] = 'Do not damage ' . self::targets($constraints['prohibited_damage_target']) . '.';
        return $labels;
    }

    public static function scoring(array $components): array
    {
        $labels = [];
        foreach ($components as $component) {
            switch ($component['kind'] ?? '') {
                case 'MIN_ELAPSED': $labels[] = 'Optional score: shortest completion time; no additional time limit.'; break;
                case 'MINIMIZE_DAMAGE_RECEIVED': $labels[] = 'Optional score: take as little damage as possible.'; break;
                case 'MAXIMIZE_NPC_KILLS': $labels[] = 'Optional score: destroy as many ' . self::targets($component['target'] ?? 'aliens') . ' as possible.'; break;
            }
        }
        return $labels;
    }

    public static function mode(array $node): string
    {
        if (count($node['children'] ?? []) < 2) return '';
        switch ($node['op'] ?? '') {
            case 'and': return 'Complete all objectives.';
            case 'or': return 'Complete any one alternative.';
            case 'sequence': return 'Complete these steps in order.';
            case 'n_of_m': return 'Complete ' . self::number($node['required_children'] ?? 0) . ' of these alternatives.';
            default: return '';
        }
    }

    public static function scoreLines(array $components, array $state): array
    {
        $result = [];
        foreach ($components as $i => $component) {
            $labels = self::scoring([$component]); if (!$labels) continue;
            $current = max(0, (float)($state['scoring'][(string)$i] ?? 0));
            $unit = ($component['kind'] ?? '') === 'MIN_ELAPSED' ? 'seconds' : (($component['kind'] ?? '') === 'MINIMIZE_DAMAGE_RECEIVED' ? 'damage' : '');
            $display = self::number($unit === 'seconds' ? floor($current) : $current);
            $result[] = ['id' => 'score_' . $i, 'score_key' => (string)$i, 'label' => $labels[0], 'score' => true,
                'current' => $current, 'current_display' => $display, 'required' => null, 'progress_unit' => $unit,
                'progress_text' => $display . ($unit !== '' ? ' ' . $unit : '')];
        }
        return $result;
    }

    public static function runtimeReasons(): array
    {
        return array_merge(['wrong_map' => 'Travel to the required map.', 'cloak_required' => 'Activate camouflage.',
            'uncloaked_required' => 'Disable camouflage.', 'hp_above_limit' => 'HP is above the allowed limit.',
            'inactive_step' => 'Complete the previous step first.', 'completed' => 'Objective complete.',
            'conditions_not_met' => 'The required conditions are not met.', 'running' => 'Progressing.',
            'ready' => 'Ready to claim.', 'paused' => 'Progress paused.'], self::failureReasons());
    }

    public static function failure($reason): string
    {
        return self::failureReasons()[(string)$reason] ?? ((string)$reason !== '' ? 'The mission conditions were not met.' : '');
    }

    private static function failureReasons(): array
    {
        return ['absence_limit' => 'You stayed away from the required maps too long.',
            'company_changed' => 'Your company changed during this mission.', 'damage_limit' => 'The allowed damage limit was exceeded.',
            'death_constraint' => 'The mission death limit was exceeded.', 'movement_prohibited' => 'You moved during a mission that forbids movement.',
            'player_kill_limit' => 'The allowed number of enemy pilot kills was exceeded.',
            'prohibited_target_damaged' => 'A protected mission target was damaged.', 'prohibited_target_destroyed' => 'A protected mission target was destroyed.',
            'time_limit' => 'The mission time limit expired.', 'weapon_prohibited' => 'A weapon was fired during a mission that forbids firing.',
            'wrong_weapon' => 'A weapon forbidden by this mission was used.'];
    }
}
