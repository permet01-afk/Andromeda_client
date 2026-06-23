<?php

class PilotBioService
{
    private $db;
    private $playerId;

    public function __construct(PDO $db, int $playerId)
    {
        $this->db = $db;
        $this->playerId = $playerId;
    }

    public static function catalog(): array
    {
        return [
            [
                'slot' => 1,
                'node_code' => 'ship_hull_i',
                'display_name' => 'Ship Hull I',
                'description' => 'Increases your ship maximum HP.',
                'track' => 'defense',
                'max_level' => 2,
                'status' => 'active',
                'effect_key' => 'ship_hull_hp',
                'effect_values' => [5000, 10000],
                'prerequisites' => [],
            ],
            [
                'slot' => 2,
                'node_code' => 'ship_hull_ii',
                'display_name' => 'Ship Hull II',
                'description' => 'Further increases your ship maximum HP.',
                'track' => 'defense',
                'max_level' => 3,
                'status' => 'active',
                'effect_key' => 'ship_hull_hp',
                'effect_values' => [15000, 25000, 50000],
                'prerequisites' => [['node' => 'ship_hull_i', 'level' => 2]],
            ],
            [
                'slot' => 3,
                'node_code' => 'engineering',
                'display_name' => 'Engineering',
                'description' => 'Improves your repair bot.',
                'track' => 'defense',
                'max_level' => 5,
                'status' => 'active',
                'effect_key' => 'repair_bot',
                'effect_values' => [15000, 20000, 25000, 27500, 30000],
                'prerequisites' => [],
            ],
            [
                'slot' => 4,
                'node_code' => 'shield_engineering',
                'display_name' => 'Shield Engineering',
                'description' => 'Increases your maximum shield strength.',
                'track' => 'defense',
                'max_level' => 5,
                'status' => 'later',
                'effect_key' => 'shield_max_percent',
                'effect_values' => [4, 8, 12, 18, 25],
                'prerequisites' => [],
            ],
            [
                'slot' => 5,
                'node_code' => 'evasive_maneuvers_i',
                'display_name' => 'Evasive Maneuvers I',
                'description' => 'Makes your ship harder to hit.',
                'track' => 'defense',
                'max_level' => 2,
                'status' => 'later',
                'effect_key' => 'enemy_hit_chance_reduction',
                'effect_values' => [2, 4],
                'prerequisites' => [],
            ],
            [
                'slot' => 6,
                'node_code' => 'evasive_maneuvers_ii',
                'display_name' => 'Evasive Maneuvers II',
                'description' => 'Further improves your chance to avoid enemy fire.',
                'track' => 'defense',
                'max_level' => 3,
                'status' => 'later',
                'effect_key' => 'enemy_hit_chance_reduction',
                'effect_values' => [6, 8, 12],
                'prerequisites' => [['node' => 'evasive_maneuvers_i', 'level' => 2]],
            ],
            [
                'slot' => 7,
                'node_code' => 'shield_mechanics',
                'display_name' => 'Shield Mechanics',
                'description' => 'Improves how much damage your shields can absorb.',
                'track' => 'defense',
                'max_level' => 5,
                'status' => 'active',
                'effect_key' => 'shield_absorption',
                'effect_values' => [72, 74, 76, 78, 82],
                'prerequisites' => [],
            ],
            [
                'slot' => 8,
                'node_code' => 'tactics',
                'display_name' => 'Tactics',
                'description' => 'Increases experience gained from aliens.',
                'track' => 'progression',
                'max_level' => 5,
                'status' => 'later',
                'effect_key' => 'alien_xp_percent',
                'effect_values' => [2, 4, 6, 8, 12],
                'prerequisites' => [],
            ],
            [
                'slot' => 9,
                'node_code' => 'logistics',
                'display_name' => 'Logistics',
                'description' => 'Expands your cargo bay.',
                'track' => 'progression',
                'max_level' => 5,
                'status' => 'later',
                'effect_key' => 'cargo_capacity_percent',
                'effect_values' => [4, 8, 12, 16, 25],
                'prerequisites' => [],
            ],
            [
                'slot' => 10,
                'node_code' => 'luck_i',
                'display_name' => 'Luck I',
                'description' => 'Increases Uridium found in bonus boxes.',
                'track' => 'progression',
                'max_level' => 2,
                'status' => 'later',
                'effect_key' => 'bonus_box_uridium_percent',
                'effect_values' => [2, 4],
                'prerequisites' => [],
            ],
            [
                'slot' => 11,
                'node_code' => 'luck_ii',
                'display_name' => 'Luck II',
                'description' => 'Further increases Uridium found in bonus boxes.',
                'track' => 'progression',
                'max_level' => 3,
                'status' => 'later',
                'effect_key' => 'bonus_box_uridium_percent',
                'effect_values' => [6, 8, 12],
                'prerequisites' => [['node' => 'luck_i', 'level' => 2]],
            ],
            [
                'slot' => 12,
                'node_code' => 'cruelty_i',
                'display_name' => 'Cruelty I',
                'description' => 'Increases honor gained from enemies.',
                'track' => 'progression',
                'max_level' => 2,
                'status' => 'later',
                'effect_key' => 'honor_percent',
                'effect_values' => [4, 8],
                'prerequisites' => [],
            ],
            [
                'slot' => 13,
                'node_code' => 'cruelty_ii',
                'display_name' => 'Cruelty II',
                'description' => 'Further increases honor gained from enemies.',
                'track' => 'progression',
                'max_level' => 3,
                'status' => 'later',
                'effect_key' => 'honor_percent',
                'effect_values' => [12, 18, 25],
                'prerequisites' => [['node' => 'cruelty_i', 'level' => 2]],
            ],
            [
                'slot' => 14,
                'node_code' => 'tractor_beam_i',
                'display_name' => 'Tractor Beam I',
                'description' => 'Increases cargo collected from cargo boxes.',
                'track' => 'progression',
                'max_level' => 5,
                'status' => 'later',
                'effect_key' => 'cargo_box_loot_percent',
                'effect_values' => [1, 2, 3, 4, 6],
                'prerequisites' => [],
            ],
            [
                'slot' => 15,
                'node_code' => 'tractor_beam_ii',
                'display_name' => 'Tractor Beam II',
                'description' => 'Increases rewards collected from bonus boxes.',
                'track' => 'progression',
                'max_level' => 5,
                'status' => 'later',
                'effect_key' => 'bonus_box_loot_percent',
                'effect_values' => [2, 6, 10, 15, 20],
                'prerequisites' => [['node' => 'tractor_beam_i', 'level' => 5]],
            ],
            [
                'slot' => 16,
                'node_code' => 'greed',
                'display_name' => 'Greed',
                'description' => 'Increases credits gained from aliens.',
                'track' => 'progression',
                'max_level' => 5,
                'status' => 'later',
                'effect_key' => 'alien_credit_percent',
                'effect_values' => [4, 8, 12, 18, 25],
                'prerequisites' => [],
            ],
            [
                'slot' => 17,
                'node_code' => 'smartbomb_tech',
                'display_name' => 'Smartbomb Tech',
                'description' => 'Improves Smart Bomb damage.',
                'track' => 'offense',
                'max_level' => 2,
                'status' => 'active',
                'effect_key' => 'smartbomb_damage',
                'effect_values' => [25000, 35000],
                'prerequisites' => [],
            ],
            [
                'slot' => 18,
                'node_code' => 'detonation_ii',
                'display_name' => 'Detonation II',
                'description' => 'Further increases mine damage.',
                'track' => 'offense',
                'max_level' => 3,
                'status' => 'later',
                'effect_key' => 'mine_damage_percent',
                'effect_values' => [21, 28, 50],
                'prerequisites' => [],
            ],
            [
                'slot' => 19,
                'node_code' => 'explosives',
                'display_name' => 'Explosives',
                'description' => 'Increases mine explosion radius.',
                'track' => 'offense',
                'max_level' => 5,
                'status' => 'later',
                'effect_key' => 'mine_radius_percent',
                'effect_values' => [4, 8, 12, 18, 25],
                'prerequisites' => [],
            ],
            [
                'slot' => 20,
                'node_code' => 'heat_seeking_missiles',
                'display_name' => 'Heat-Seeking Missiles',
                'description' => 'Improves rocket accuracy.',
                'track' => 'offense',
                'max_level' => 5,
                'status' => 'later',
                'effect_key' => 'rocket_hit_chance_percent',
                'effect_values' => [1, 2, 4, 6, 10],
                'prerequisites' => [],
            ],
            [
                'slot' => 21,
                'node_code' => 'bounty_hunter_i',
                'display_name' => 'Bounty Hunter I',
                'description' => 'Increases laser damage against players.',
                'track' => 'offense',
                'max_level' => 2,
                'status' => 'active',
                'effect_key' => 'pvp_laser_damage_percent',
                'effect_values' => [2, 4],
                'prerequisites' => [],
            ],
            [
                'slot' => 22,
                'node_code' => 'bounty_hunter_ii',
                'display_name' => 'Bounty Hunter II',
                'description' => 'Further increases laser damage against players.',
                'track' => 'offense',
                'max_level' => 3,
                'status' => 'active',
                'effect_key' => 'pvp_laser_damage_percent',
                'effect_values' => [6, 8, 12],
                'prerequisites' => [['node' => 'bounty_hunter_i', 'level' => 2]],
            ],
            [
                'slot' => 23,
                'node_code' => 'rocket_fusion',
                'display_name' => 'Rocket Fusion',
                'description' => 'Increases rocket damage.',
                'track' => 'offense',
                'max_level' => 5,
                'status' => 'later',
                'effect_key' => 'rocket_damage_percent',
                'effect_values' => [2, 4, 6, 8, 15],
                'prerequisites' => [],
            ],
            [
                'slot' => 24,
                'node_code' => 'alien_hunter',
                'display_name' => 'Alien Hunter',
                'description' => 'Increases laser damage against aliens.',
                'track' => 'offense',
                'max_level' => 5,
                'status' => 'active',
                'effect_key' => 'pve_laser_damage_percent',
                'effect_values' => [2, 4, 6, 8, 12],
                'prerequisites' => [],
            ],
            [
                'slot' => 25,
                'node_code' => 'electro_optics',
                'display_name' => 'Electro-Optics',
                'description' => 'Improves laser accuracy.',
                'track' => 'offense',
                'max_level' => 5,
                'status' => 'later',
                'effect_key' => 'laser_accuracy_percent',
                'effect_values' => [5, 10, 15, 20, 25],
                'prerequisites' => [],
            ],
        ];
    }

    public function getViewModel(): array
    {
        $resources = $this->getResources();
        $schemaReady = $this->isSchemaReady();
        $state = null;
        $levels = [];

        if ($schemaReady) {
            $state = $this->getState();
            if ($state !== null) {
                $levels = $this->getLevels();
            }
        }

        $catalog = self::catalog();
        $byCode = [];
        foreach ($catalog as $node) {
            $byCode[$node['node_code']] = $node;
        }

        $legacySkills = $this->parseLegacySkilltree($resources['skilltree']);
        $maxPointNumber = $schemaReady ? $this->getMaxPointNumber() : 50;
        $nextPointNumber = $state ? ((int)$state['research_points'] + (int)$state['spent_points'] + 1) : 1;
        $nextPointCost = ($nextPointNumber <= $maxPointNumber)
            ? ($schemaReady ? $this->getPointCost($nextPointNumber) : $this->fallbackPointCost($nextPointNumber))
            : null;

        foreach ($catalog as &$node) {
            $code = $node['node_code'];
            $level = (int)($levels[$code] ?? 0);
            $node['level'] = max(0, min($node['max_level'], $level));
            $node['is_active'] = $node['status'] === 'active';
            $node['is_maxed'] = $node['level'] >= $node['max_level'];
            $node['is_locked'] = !$this->arePrerequisitesMet($node, $levels);
            $node['can_upgrade'] = $schemaReady
                && $state !== null
                && $node['is_active']
                && !$node['is_maxed']
                && !$node['is_locked']
                && (int)$state['research_points'] > 0;
            $node['effect_text'] = $this->effectText($node, $node['level']);
            $node['next_effect_text'] = $node['is_maxed']
                ? 'Maximum level reached.'
                : $this->effectText($node, $node['level'] + 1);
            $node['prerequisite_text'] = $this->prerequisiteText($node, $byCode);
            $node['v1_note'] = $this->v1NoteText($node);
        }
        unset($node);

        return [
            'schema_ready' => $schemaReady,
            'state' => $state,
            'resources' => $resources,
            'catalog' => $catalog,
            'catalog_by_code' => $byCode,
            'levels' => $levels,
            'next_point_number' => $nextPointNumber,
            'next_point_cost' => $nextPointCost,
            'max_research_points' => $maxPointNumber,
            'legacy_skills' => $legacySkills,
            'migration_summary' => $this->migrationSummary($resources, $legacySkills),
        ];
    }

    public function exchangeResearchPoint(): array
    {
        if (!$this->isSchemaReady()) {
            return ['success' => false, 'message' => 'Pilot Bio database schema is not installed yet.'];
        }

        try {
            $this->db->beginTransaction();

            $state = $this->lockState();
            if ($state === null) {
                $this->db->rollBack();
                return ['success' => false, 'message' => 'Pilot Bio migration is required before exchanging Logfiles.'];
            }

            $user = $this->lockUserResources();
            if ($user === null) {
                $this->db->rollBack();
                return ['success' => false, 'message' => 'Pilot not found.'];
            }

            $pointNumber = (int)$state['research_points'] + (int)$state['spent_points'] + 1;
            if ($pointNumber > $this->getMaxPointNumber()) {
                $this->db->rollBack();
                return ['success' => false, 'message' => 'Maximum Research Points reached.'];
            }

            $cost = $this->getPointCost($pointNumber);

            if ((int)$user['logfiles'] < $cost) {
                $this->db->rollBack();
                return ['success' => false, 'message' => 'Not enough Logfiles.'];
            }

            $updateUser = $this->db->prepare('UPDATE users SET logfiles = logfiles - :cost WHERE id = :player_id LIMIT 1');
            $updateUser->execute([
                ':cost' => $cost,
                ':player_id' => $this->playerId,
            ]);

            $updateState = $this->db->prepare('UPDATE player_pilot_bio_state SET research_points = research_points + 1 WHERE user_id = :player_id LIMIT 1');
            $updateState->execute([':player_id' => $this->playerId]);

            $this->db->commit();
            return ['success' => true, 'message' => 'Research Point created.'];
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            return ['success' => false, 'message' => 'Pilot Bio exchange failed.'];
        }
    }

    public function upgradeNode(string $nodeCode): array
    {
        if (!$this->isSchemaReady()) {
            return ['success' => false, 'message' => 'Pilot Bio database schema is not installed yet.'];
        }

        $catalog = [];
        foreach (self::catalog() as $node) {
            $catalog[$node['node_code']] = $node;
        }

        if (!isset($catalog[$nodeCode])) {
            return ['success' => false, 'message' => 'Invalid Pilot Bio node.'];
        }

        $node = $catalog[$nodeCode];
        if ($node['status'] !== 'active') {
            return ['success' => false, 'message' => 'This Pilot Bio node is not available yet.'];
        }

        try {
            $this->db->beginTransaction();

            $state = $this->lockState();
            if ($state === null) {
                $this->db->rollBack();
                return ['success' => false, 'message' => 'Pilot Bio migration is required before upgrading nodes.'];
            }

            $levels = $this->getLevels(true);
            $currentLevel = (int)($levels[$nodeCode] ?? 0);

            if ($currentLevel >= (int)$node['max_level']) {
                $this->db->rollBack();
                return ['success' => false, 'message' => 'This Pilot Bio node is already maxed.'];
            }

            if (!$this->arePrerequisitesMet($node, $levels)) {
                $this->db->rollBack();
                return ['success' => false, 'message' => 'Pilot Bio prerequisites are not met.'];
            }

            if ((int)$state['research_points'] <= 0) {
                $this->db->rollBack();
                return ['success' => false, 'message' => 'No Research Points available.'];
            }

            $nextLevel = $currentLevel + 1;

            $upsert = $this->db->prepare(
                'INSERT INTO player_pilot_bio_levels (user_id, node_code, level) VALUES (:player_id, :node_code, :level)
                 ON DUPLICATE KEY UPDATE level = VALUES(level)'
            );
            $upsert->execute([
                ':player_id' => $this->playerId,
                ':node_code' => $nodeCode,
                ':level' => $nextLevel,
            ]);

            $updateState = $this->db->prepare('UPDATE player_pilot_bio_state SET research_points = research_points - 1, spent_points = spent_points + 1 WHERE user_id = :player_id LIMIT 1');
            $updateState->execute([':player_id' => $this->playerId]);

            $this->db->commit();
            return ['success' => true, 'message' => $node['display_name'] . ' upgraded.'];
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            return ['success' => false, 'message' => 'Pilot Bio upgrade failed.'];
        }
    }

    private function isSchemaReady(): bool
    {
        static $ready = null;
        if ($ready !== null) {
            return $ready;
        }

        try {
            $stmt = $this->db->prepare(
                "SELECT COUNT(*) FROM information_schema.tables
                 WHERE table_schema = DATABASE()
                   AND table_name IN ('pilot_bio_nodes','player_pilot_bio_state','player_pilot_bio_levels','pilot_bio_point_costs')"
            );
            $stmt->execute();
            if ((int)$stmt->fetchColumn() !== 4) {
                $ready = false;
                return false;
            }

            $nodeStmt = $this->db->prepare('SELECT COUNT(*) FROM pilot_bio_nodes');
            $nodeStmt->execute();
            $ready = ((int)$nodeStmt->fetchColumn()) >= 25;
            return $ready;
        } catch (Throwable $e) {
            $ready = false;
            return false;
        }
    }

    private function getResources(): array
    {
        $stmt = $this->db->prepare('SELECT logfiles, skilltree, hp_lvl FROM users WHERE id = :player_id LIMIT 1');
        $stmt->execute([':player_id' => $this->playerId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        return [
            'logfiles' => (int)($row['logfiles'] ?? 0),
            'skilltree' => (string)($row['skilltree'] ?? ''),
            'hp_lvl' => (int)($row['hp_lvl'] ?? 0),
        ];
    }

    private function getState(): ?array
    {
        $stmt = $this->db->prepare('SELECT research_points, spent_points, reset_count, migrated_from_legacy FROM player_pilot_bio_state WHERE user_id = :player_id LIMIT 1');
        $stmt->execute([':player_id' => $this->playerId]);
        $state = $stmt->fetch(PDO::FETCH_ASSOC);
        return $state ?: null;
    }

    private function lockState(): ?array
    {
        $stmt = $this->db->prepare('SELECT research_points, spent_points, reset_count, migrated_from_legacy FROM player_pilot_bio_state WHERE user_id = :player_id LIMIT 1 FOR UPDATE');
        $stmt->execute([':player_id' => $this->playerId]);
        $state = $stmt->fetch(PDO::FETCH_ASSOC);
        return $state ?: null;
    }

    private function lockUserResources(): ?array
    {
        $stmt = $this->db->prepare('SELECT logfiles FROM users WHERE id = :player_id LIMIT 1 FOR UPDATE');
        $stmt->execute([':player_id' => $this->playerId]);
        $state = $stmt->fetch(PDO::FETCH_ASSOC);
        return $state ?: null;
    }

    private function getLevels(bool $forUpdate = false): array
    {
        $sql = 'SELECT node_code, level FROM player_pilot_bio_levels WHERE user_id = :player_id';
        if ($forUpdate) {
            $sql .= ' FOR UPDATE';
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute([':player_id' => $this->playerId]);

        $levels = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $levels[(string)$row['node_code']] = (int)$row['level'];
        }

        return $levels;
    }

    private function getPointCost(int $pointNumber): int
    {
        try {
            $stmt = $this->db->prepare('SELECT logfile_cost FROM pilot_bio_point_costs WHERE point_number = :point_number LIMIT 1');
            $stmt->execute([':point_number' => $pointNumber]);
            $cost = $stmt->fetchColumn();
            if ($cost !== false) {
                return max(1, (int)$cost);
            }
        } catch (Throwable $e) {
        }

        return $this->fallbackPointCost($pointNumber);
    }

    private function getMaxPointNumber(): int
    {
        try {
            $stmt = $this->db->prepare('SELECT MAX(point_number) FROM pilot_bio_point_costs');
            $stmt->execute();
            $maxPoint = $stmt->fetchColumn();
            if ($maxPoint !== false) {
                return max(1, (int)$maxPoint);
            }
        } catch (Throwable $e) {
        }

        return 50;
    }

    private function fallbackPointCost(int $pointNumber): int
    {
        return max(30, (int)ceil(30 * pow(1.1, max(0, $pointNumber - 1))));
    }

    private function arePrerequisitesMet(array $node, array $levels): bool
    {
        foreach ($node['prerequisites'] as $prerequisite) {
            $requiredNode = (string)($prerequisite['node'] ?? '');
            $requiredLevel = (int)($prerequisite['level'] ?? 0);
            if ((int)($levels[$requiredNode] ?? 0) < $requiredLevel) {
                return false;
            }
        }

        return true;
    }

    private function effectText(array $node, int $level): string
    {
        if ($level <= 0) {
            switch ($node['effect_key']) {
                case 'shield_absorption':
                    return '70% base shield absorption';
                case 'repair_bot':
                    return '10,000 HP per repair tick';
                case 'smartbomb_damage':
                    return '20,000 Smart Bomb damage';
                default:
                    break;
            }

            return 'No active bonus yet.';
        }

        $values = $node['effect_values'];
        $value = $values[min($level, count($values)) - 1] ?? null;
        if ($value === null) {
            return 'Active bonus.';
        }

        switch ($node['effect_key']) {
            case 'ship_hull_hp':
                return '+' . number_format((int)$value) . ' HP';
            case 'repair_bot':
                return number_format((int)$value) . ' HP per repair tick';
            case 'shield_absorption':
                return number_format((int)$value) . '% shield absorption';
            case 'smartbomb_damage':
                return number_format((int)$value) . ' Smart Bomb damage';
            case 'pve_laser_damage_percent':
            case 'pvp_laser_damage_percent':
            case 'shield_max_percent':
            case 'enemy_hit_chance_reduction':
            case 'alien_xp_percent':
            case 'cargo_capacity_percent':
            case 'bonus_box_uridium_percent':
            case 'honor_percent':
            case 'cargo_box_loot_percent':
            case 'bonus_box_loot_percent':
            case 'alien_credit_percent':
            case 'mine_damage_percent':
            case 'mine_radius_percent':
            case 'rocket_hit_chance_percent':
            case 'rocket_damage_percent':
            case 'laser_accuracy_percent':
                return '+' . number_format((int)$value) . '%';
            default:
                return 'Active bonus.';
        }
    }

    private function prerequisiteText(array $node, array $byCode): string
    {
        if (empty($node['prerequisites'])) {
            return 'None';
        }

        $parts = [];
        foreach ($node['prerequisites'] as $prerequisite) {
            $requiredNode = (string)($prerequisite['node'] ?? '');
            $requiredLevel = (int)($prerequisite['level'] ?? 0);
            $name = $byCode[$requiredNode]['display_name'] ?? $requiredNode;
            $parts[] = $name . ' level ' . $requiredLevel;
        }

        return implode(', ', $parts);
    }

    private function v1NoteText(array $node): string
    {
        if ($node['status'] !== 'active') {
            if ($node['node_code'] === 'shield_engineering') {
                return 'Later: shield capacity bonus is not active in V1.';
            }

            return 'Later: this node is visible for the future Pilot Bio tree and cannot be upgraded in V1.';
        }

        if ($node['node_code'] === 'bounty_hunter_ii') {
            return 'Fat lasers unlock when Bounty Hunter II is maxed.';
        }

        return '';
    }

    private function parseLegacySkilltree(string $skilltree): array
    {
        $skills = [];
        foreach (explode('/', $skilltree) as $entry) {
            $parts = explode(':', $entry, 2);
            if (count($parts) !== 2) {
                continue;
            }

            $key = trim($parts[0]);
            if ($key === '') {
                continue;
            }

            $skills[$key] = max(0, (int)$parts[1]);
        }

        return $skills;
    }

    private function migrationSummary(array $resources, array $legacySkills): array
    {
        $hpMigration = $this->shipHullMigration((int)$resources['hp_lvl']);
        $dmg = min(5, (int)($legacySkills['dmg'] ?? 0));
        $shdAbs = min(3, (int)($legacySkills['shd_abs'] ?? 0));
        $rep = min(3, (int)($legacySkills['rep'] ?? 0));
        $smb = min(2, (int)($legacySkills['smb'] ?? 0));
        $shreg = min(5, (int)($legacySkills['shreg'] ?? 0));
        $rck = min(5, (int)($legacySkills['rck'] ?? 0));

        return [
            'Ship Hull' => $hpMigration,
            'Alien Hunter' => $dmg > 0 ? 'Level ' . $dmg : 'No legacy damage level found.',
            'Bounty Hunter I' => $dmg > 0 ? 'Level ' . min(2, $dmg) : 'No legacy damage level found.',
            'Bounty Hunter II' => $dmg >= 3 ? 'Level ' . min(3, $dmg - 2) : 'No Bounty Hunter II level from legacy damage.',
            'Shield Mechanics' => $shdAbs > 0 ? 'Level ' . ($shdAbs === 3 ? 5 : ($shdAbs === 2 ? 3 : 1)) : 'No legacy shield absorption level found.',
            'Engineering' => $rep > 0 ? 'Level ' . ($rep === 3 ? 5 : $rep) : 'No legacy repair level found.',
            'Smartbomb Tech' => $smb > 0 ? 'Level ' . $smb : 'No legacy Smartbomb level found.',
            'Shield Regeneration' => $shreg > 0 ? 'Refund ' . $shreg . ' Research Point' . ($shreg === 1 ? '' : 's') . ' because Shield Regeneration is not active in V1.' : 'No Shield Regeneration refund.',
            'Rocket Fusion' => $rck > 0 ? 'Ignored in V1. Rocket bonuses are marked for later balancing.' : 'No legacy rocket level found.',
            'Legacy hp in skilltree' => ((int)($legacySkills['hp'] ?? 0) > 0) ? 'Ignored in V1. Ship Hull migration uses users.hp_lvl as the source of truth.' : 'No separate legacy hp skill found.',
        ];
    }

    private function shipHullMigration(int $hpLevel): string
    {
        $hpLevel = max(0, min(10, $hpLevel));
        $legacyBonus = $hpLevel * 5000;
        $shipHullI = 0;
        $shipHullII = 0;
        $pilotBonus = 0;

        if ($hpLevel >= 10) {
            $shipHullI = 2;
            $shipHullII = 3;
            $pilotBonus = 50000;
        } elseif ($hpLevel >= 5) {
            $shipHullI = 2;
            $shipHullII = 2;
            $pilotBonus = 25000;
        } elseif ($hpLevel >= 3) {
            $shipHullI = 2;
            $shipHullII = 1;
            $pilotBonus = 15000;
        } elseif ($hpLevel >= 2) {
            $shipHullI = 2;
            $pilotBonus = 10000;
        } elseif ($hpLevel >= 1) {
            $shipHullI = 1;
            $pilotBonus = 5000;
        }

        $summary = 'hp_lvl ' . $hpLevel . ' gives +' . number_format($legacyBonus) . ' HP legacy; migrate to Ship Hull I level ' . $shipHullI . ' and Ship Hull II level ' . $shipHullII . ' for +' . number_format($pilotBonus) . ' HP.';
        if ($legacyBonus > $pilotBonus) {
            $summary .= ' This rounds down by ' . number_format($legacyBonus - $pilotBonus) . ' HP; review manual compensation if needed.';
        }

        return $summary;
    }
}
?>
