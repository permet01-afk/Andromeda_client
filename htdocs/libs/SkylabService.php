<?php

class SkylabService
{
    private const MAX_CATCHUP_SECONDS = 86400;
    private const MAX_TRANSPORT_AMOUNT = 1000000;

    private const RESOURCE_KEYS = [
        'prometium',
        'endurium',
        'terbium',
        'prometid',
        'duranium',
        'xenomit',
        'promerium',
        'seprom',
    ];

    private const SHIP_CARGO_RESOURCES = [
        'prometium',
        'endurium',
        'terbium',
        'prometid',
        'duranium',
        'promerium',
        'xenomit',
        'seprom',
    ];

    private const RESOURCE_NAMES = [
        'prometium' => 'Prometium',
        'endurium' => 'Endurium',
        'terbium' => 'Terbium',
        'prometid' => 'Prometid',
        'duranium' => 'Duranium',
        'xenomit' => 'Xenomit',
        'promerium' => 'Promerium',
        'seprom' => 'Seprom',
    ];

    private const MODULES = [
        'solar' => ['name' => 'Solar module', 'type' => 'Energy', 'resource' => null, 'essential' => true],
        'prometium' => ['name' => 'Prometium collector', 'type' => 'Collector', 'resource' => 'prometium', 'essential' => false],
        'endurium' => ['name' => 'Endurium collector', 'type' => 'Collector', 'resource' => 'endurium', 'essential' => false],
        'terbium' => ['name' => 'Terbium collector', 'type' => 'Collector', 'resource' => 'terbium', 'essential' => false],
        'prometid' => ['name' => 'Prometid refinery', 'type' => 'Refinery', 'resource' => 'prometid', 'essential' => false],
        'duranium' => ['name' => 'Duranium refinery', 'type' => 'Refinery', 'resource' => 'duranium', 'essential' => false],
        'promerium' => ['name' => 'Promerium refinery', 'type' => 'Refinery', 'resource' => 'promerium', 'essential' => false],
        'xeno' => ['name' => 'Xeno module', 'type' => 'Support', 'resource' => 'xenomit', 'essential' => false],
        'transport' => ['name' => 'Transport module', 'type' => 'Logistics', 'resource' => null, 'essential' => true],
        'storage' => ['name' => 'Storage module', 'type' => 'Storage', 'resource' => null, 'essential' => true],
        'basic' => ['name' => 'Basic module', 'type' => 'Core', 'resource' => null, 'essential' => true],
        'seprom' => ['name' => 'Seprom refinery', 'type' => 'Refinery', 'resource' => 'seprom', 'essential' => false],
    ];

    private const DEFAULT_MODULES = [
        'basic' => ['level' => 1, 'active' => 1],
        'storage' => ['level' => 1, 'active' => 1],
        'solar' => ['level' => 1, 'active' => 1],
        'transport' => ['level' => 1, 'active' => 1],
        'prometium' => ['level' => 1, 'active' => 1],
        'endurium' => ['level' => 1, 'active' => 1],
        'terbium' => ['level' => 1, 'active' => 1],
        'prometid' => ['level' => 0, 'active' => 0],
        'duranium' => ['level' => 0, 'active' => 0],
        'xeno' => ['level' => 0, 'active' => 0],
        'promerium' => ['level' => 0, 'active' => 0],
        'seprom' => ['level' => 0, 'active' => 0],
    ];

    private PDO $db;
    private int $playerId;

    public function __construct(PDO $db, int $playerId)
    {
        $this->db = $db;
        $this->playerId = $playerId;

        try {
            $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch (Throwable $ignored) {
        }

        try {
            $this->db->exec('SET NAMES utf8mb4');
        } catch (Throwable $ignored) {
        }
    }

    public function isAvailable(): bool
    {
        return $this->hasRequiredTables() && $this->hasSeedData();
    }

    public function getState(): array
    {
        if (!$this->hasRequiredTables()) {
            return $this->unavailableState('Skylab database is not installed yet. Preview mode is active.');
        }

        if (!$this->hasSeedData()) {
            return $this->unavailableState('Skylab module data is missing. Preview mode is active.');
        }

        return $this->transaction(function (): array {
            $this->ensurePlayerRows();
            $this->applyCatchUpLocked();

            return $this->buildStateLocked('Skylab is online.');
        });
    }

    public function toggleModule(string $moduleKey): array
    {
        $moduleKey = $this->normalizeModuleKey($moduleKey);

        return $this->transaction(function () use ($moduleKey): array {
            $this->ensurePlayerRows();
            $this->applyCatchUpLocked();

            $modules = $this->loadModulesLocked();
            $module = $modules[$moduleKey] ?? null;

            if ($module === null || (int)$module['level'] <= 0) {
                throw new RuntimeException('This module is not available yet.');
            }

            if ((self::MODULES[$moduleKey]['essential'] ?? false) === true) {
                throw new RuntimeException('This module cannot be deactivated.');
            }

            if ($this->isModuleUpgrading($module)) {
                throw new RuntimeException('This module is currently upgrading.');
            }

            $newState = (int)$module['active'] === 1 ? 0 : 1;

            if ($newState === 1 && !$this->canPowerModule($moduleKey, $modules)) {
                throw new RuntimeException('Not enough energy to activate this module.');
            }

            $stmt = $this->db->prepare(
                'UPDATE player_skylab_modules
                 SET active = :active, updated_at = NOW()
                 WHERE player_id = :player_id AND module_key = :module_key'
            );
            $stmt->execute([
                ':active' => $newState,
                ':player_id' => $this->playerId,
                ':module_key' => $moduleKey,
            ]);

            return $this->buildStateLocked($newState === 1 ? 'Module activated.' : 'Module deactivated.');
        });
    }

    public function startUpgrade(string $moduleKey): array
    {
        $moduleKey = $this->normalizeModuleKey($moduleKey);

        return $this->transaction(function () use ($moduleKey): array {
            $this->ensurePlayerRows();
            $this->applyCatchUpLocked();

            $modules = $this->loadModulesLocked();
            $state = $this->loadResourceStateLocked();
            $levels = $this->loadLevelCatalog();
            $module = $modules[$moduleKey] ?? null;

            if ($module === null) {
                throw new RuntimeException('This module is not available.');
            }

            if ($this->isModuleUpgrading($module)) {
                throw new RuntimeException('This module is already upgrading.');
            }

            $currentLevel = (int)$module['level'];
            $targetLevel = $currentLevel + 1;

            if (!isset($levels[$moduleKey][$targetLevel])) {
                throw new RuntimeException('This module is already at maximum level.');
            }

            $basicLevel = (int)($modules['basic']['level'] ?? 0);
            if ($moduleKey !== 'basic' && $targetLevel > max(1, $basicLevel)) {
                throw new RuntimeException('Upgrade the Basic module first.');
            }

            $cost = $levels[$moduleKey][$targetLevel];
            $creditsCost = (int)$cost['upgrade_credits'];
            $this->ensureUserCredits($creditsCost);
            $this->ensureResourceCosts($state, $cost);

            if ($creditsCost > 0) {
                $stmt = $this->db->prepare('UPDATE users SET credits = credits - :credits WHERE id = :player_id');
                $stmt->execute([
                    ':credits' => $creditsCost,
                    ':player_id' => $this->playerId,
                ]);
            }

            $this->deductResourceCosts($state, $cost);
            $this->saveResourceState($state);

            $upgradeSeconds = max(0, (int)$cost['upgrade_seconds']);
            if ($upgradeSeconds <= 0) {
                $stmt = $this->db->prepare(
                    'UPDATE player_skylab_modules
                     SET level = :level, target_level = NULL, upgrade_started_at = NULL, upgrade_ends_at = NULL, updated_at = NOW()
                     WHERE player_id = :player_id AND module_key = :module_key'
                );
                $stmt->execute([
                    ':level' => $targetLevel,
                    ':player_id' => $this->playerId,
                    ':module_key' => $moduleKey,
                ]);
            } else {
                $endsAt = date('Y-m-d H:i:s', time() + $upgradeSeconds);
                $stmt = $this->db->prepare(
                    'UPDATE player_skylab_modules
                     SET target_level = :target_level, upgrade_started_at = NOW(), upgrade_ends_at = :ends_at, updated_at = NOW()
                     WHERE player_id = :player_id AND module_key = :module_key'
                );
                $stmt->execute([
                    ':target_level' => $targetLevel,
                    ':ends_at' => $endsAt,
                    ':player_id' => $this->playerId,
                    ':module_key' => $moduleKey,
                ]);
            }

            return $this->buildStateLocked('Upgrade started.');
        });
    }

    public function startTransport(string $resourceKey, int $amount): array
    {
        $resourceKey = $this->normalizeResourceKey($resourceKey);
        $amount = max(0, $amount);

        return $this->transaction(function () use ($resourceKey, $amount): array {
            $this->ensurePlayerRows();
            $this->applyCatchUpLocked();

            if ($amount <= 0) {
                throw new RuntimeException('Enter a valid amount.');
            }

            if ($amount > self::MAX_TRANSPORT_AMOUNT) {
                throw new RuntimeException('The transport amount is too high.');
            }

            if ($resourceKey === 'seprom') {
                throw new RuntimeException('Seprom transport is disabled in this version.');
            }

            $modules = $this->loadModulesLocked();
            if ((int)($modules['transport']['level'] ?? 0) <= 0) {
                throw new RuntimeException('Transport module is not available.');
            }

            $state = $this->loadResourceStateLocked();
            if ((int)$state[$resourceKey] < $amount) {
                throw new RuntimeException('Not enough ' . self::RESOURCE_NAMES[$resourceKey] . ' in Skylab storage.');
            }

            $cargo = $this->loadShipCargoLocked();
            $capacity = $this->getApproximateShipCargoCapacityLocked();
            $currentCargo = array_sum($cargo);
            if ($capacity > 0 && $currentCargo + $amount > $capacity) {
                throw new RuntimeException('Not enough ship cargo space.');
            }

            $state[$resourceKey] -= $amount;
            $this->saveResourceState($state);

            $transportSeconds = $this->getTransportSeconds($amount, (int)$modules['transport']['level']);
            $arrivesAt = date('Y-m-d H:i:s', time() + $transportSeconds);

            $stmt = $this->db->prepare(
                'INSERT INTO player_skylab_transports
                    (player_id, direction, resource_key, amount, started_at, arrives_at, status)
                 VALUES
                    (:player_id, :direction, :resource_key, :amount, NOW(), :arrives_at, :status)'
            );
            $stmt->execute([
                ':player_id' => $this->playerId,
                ':direction' => 'to_ship',
                ':resource_key' => $resourceKey,
                ':amount' => $amount,
                ':arrives_at' => $arrivesAt,
                ':status' => 'pending',
            ]);

            return $this->buildStateLocked('Transport started.');
        });
    }

    public function collectTransport(int $transportId): array
    {
        return $this->transaction(function () use ($transportId): array {
            $this->ensurePlayerRows();
            $this->applyCatchUpLocked();

            $stmt = $this->db->prepare(
                'SELECT *
                 FROM player_skylab_transports
                 WHERE id = :id AND player_id = :player_id
                 FOR UPDATE'
            );
            $stmt->execute([
                ':id' => $transportId,
                ':player_id' => $this->playerId,
            ]);
            $transport = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$transport || (string)$transport['status'] !== 'pending') {
                throw new RuntimeException('Transport not found.');
            }

            if (strtotime((string)$transport['arrives_at']) > time()) {
                throw new RuntimeException('Transport has not arrived yet.');
            }

            $resourceKey = $this->normalizeResourceKey((string)$transport['resource_key']);
            $amount = (int)$transport['amount'];
            $cargo = $this->loadShipCargoLocked();
            $capacity = $this->getApproximateShipCargoCapacityLocked();
            $currentCargo = array_sum($cargo);

            if ($capacity > 0 && $currentCargo + $amount > $capacity) {
                throw new RuntimeException('Not enough ship cargo space.');
            }

            $column = $this->shipCargoColumn($resourceKey);
            $stmt = $this->db->prepare(
                'UPDATE player_cargo
                 SET ' . $column . ' = ' . $column . ' + :amount
                 WHERE id = :player_id'
            );
            $stmt->execute([
                ':amount' => $amount,
                ':player_id' => $this->playerId,
            ]);

            if ($stmt->rowCount() === 0) {
                $insert = array_fill_keys(self::SHIP_CARGO_RESOURCES, 0);
                $insert[$resourceKey] = $amount;
                $stmt = $this->db->prepare(
                    'INSERT INTO player_cargo
                        (id, prometium, endurium, terbium, xenomit, prometid, duranium, promerium, seprom)
                     VALUES
                        (:player_id, :prometium, :endurium, :terbium, :xenomit, :prometid, :duranium, :promerium, :seprom)'
                );
                $stmt->execute([
                    ':player_id' => $this->playerId,
                    ':prometium' => $insert['prometium'],
                    ':endurium' => $insert['endurium'],
                    ':terbium' => $insert['terbium'],
                    ':xenomit' => $insert['xenomit'],
                    ':prometid' => $insert['prometid'],
                    ':duranium' => $insert['duranium'],
                    ':promerium' => $insert['promerium'],
                    ':seprom' => $insert['seprom'],
                ]);
            }

            $stmt = $this->db->prepare(
                'UPDATE player_skylab_transports
                 SET status = :status, collected_at = NOW(), updated_at = NOW()
                 WHERE id = :id AND player_id = :player_id'
            );
            $stmt->execute([
                ':status' => 'collected',
                ':id' => $transportId,
                ':player_id' => $this->playerId,
            ]);

            return $this->buildStateLocked('Transport delivered to ship cargo. Reload the spacemap if your cargo panel is already open.');
        });
    }

    private function hasRequiredTables(): bool
    {
        foreach (['player_skylab_state', 'player_skylab_modules', 'skylab_module_levels', 'player_skylab_transports'] as $table) {
            if (!$this->tableExists($table)) {
                return false;
            }
        }

        return true;
    }

    private function hasSeedData(): bool
    {
        try {
            $stmt = $this->db->query('SELECT COUNT(*) FROM skylab_module_levels');
            return (int)$stmt->fetchColumn() > 0;
        } catch (Throwable $ignored) {
            return false;
        }
    }

    private function tableExists(string $table): bool
    {
        try {
            $stmt = $this->db->prepare(
                'SELECT COUNT(*)
                 FROM information_schema.TABLES
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table_name'
            );
            $stmt->execute([':table_name' => $table]);

            return (int)$stmt->fetchColumn() > 0;
        } catch (Throwable $ignored) {
            return false;
        }
    }

    private function transaction(callable $callback): array
    {
        try {
            $this->db->beginTransaction();
            $result = $callback();
            $this->db->commit();

            return $result;
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            throw $e;
        }
    }

    private function ensurePlayerRows(): void
    {
        $stmt = $this->db->prepare(
            'INSERT IGNORE INTO player_skylab_state
                (player_id, last_update_at, created_at, updated_at)
             VALUES
                (:player_id, NOW(), NOW(), NOW())'
        );
        $stmt->execute([':player_id' => $this->playerId]);

        $stmt = $this->db->prepare(
            'INSERT IGNORE INTO player_skylab_modules
                (player_id, module_key, level, active, created_at, updated_at)
             VALUES
                (:player_id, :module_key, :level, :active, NOW(), NOW())'
        );

        foreach (self::DEFAULT_MODULES as $moduleKey => $default) {
            $stmt->execute([
                ':player_id' => $this->playerId,
                ':module_key' => $moduleKey,
                ':level' => (int)$default['level'],
                ':active' => (int)$default['active'],
            ]);
        }
    }

    private function applyCatchUpLocked(): void
    {
        $state = $this->loadResourceStateLocked();
        $modules = $this->loadModulesLocked();
        $levels = $this->loadLevelCatalog();
        $now = time();
        $changed = false;

        foreach ($modules as $moduleKey => $module) {
            if (!$this->isModuleUpgrading($module)) {
                continue;
            }

            $endsAt = strtotime((string)$module['upgrade_ends_at']);
            if ($endsAt !== false && $endsAt <= $now) {
                $targetLevel = max((int)$module['level'], (int)$module['target_level']);
                $active = ((int)$module['level'] <= 0 && !(self::MODULES[$moduleKey]['essential'] ?? false)) ? 0 : (int)$module['active'];
                $stmt = $this->db->prepare(
                    'UPDATE player_skylab_modules
                     SET level = :level,
                         active = :active,
                         target_level = NULL,
                         upgrade_started_at = NULL,
                         upgrade_ends_at = NULL,
                         updated_at = NOW()
                     WHERE player_id = :player_id AND module_key = :module_key'
                );
                $stmt->execute([
                    ':level' => $targetLevel,
                    ':active' => $active,
                    ':player_id' => $this->playerId,
                    ':module_key' => $moduleKey,
                ]);
                $modules[$moduleKey]['level'] = $targetLevel;
                $modules[$moduleKey]['active'] = $active;
                $modules[$moduleKey]['target_level'] = null;
                $modules[$moduleKey]['upgrade_started_at'] = null;
                $modules[$moduleKey]['upgrade_ends_at'] = null;
                $changed = true;
            }
        }

        $lastUpdate = strtotime((string)$state['last_update_at']);
        if ($lastUpdate === false || $lastUpdate > $now) {
            $lastUpdate = $now;
        }

        $elapsed = min(self::MAX_CATCHUP_SECONDS, max(0, $now - $lastUpdate));
        if ($elapsed > 0) {
            $capacities = $this->calculateCapacities($modules, $levels);
            $runnable = $this->getRunnableModules($modules, $levels);

            foreach (['prometium', 'endurium', 'terbium', 'xeno'] as $moduleKey) {
                if (!isset($runnable[$moduleKey], $modules[$moduleKey])) {
                    continue;
                }

                $resourceKey = self::MODULES[$moduleKey]['resource'];
                $level = (int)$modules[$moduleKey]['level'];
                $rate = (int)($levels[$moduleKey][$level]['production_per_hour'] ?? 0);
                if ($resourceKey !== null && $rate > 0) {
                    $changed = $this->addProducedResource($state, $resourceKey, $rate, $elapsed, $capacities[$resourceKey]) || $changed;
                }
            }

            if (isset($runnable['prometid'])) {
                $changed = $this->produceWithIngredients($state, 'prometid', (int)$this->rateFor($levels, $modules, 'prometid'), $elapsed, $capacities['prometid'], [
                    'prometium' => 20,
                    'endurium' => 10,
                ]) || $changed;
            }

            if (isset($runnable['duranium'])) {
                $changed = $this->produceWithIngredients($state, 'duranium', (int)$this->rateFor($levels, $modules, 'duranium'), $elapsed, $capacities['duranium'], [
                    'endurium' => 10,
                    'terbium' => 20,
                ]) || $changed;
            }

            if (isset($runnable['promerium'])) {
                $changed = $this->produceWithIngredients($state, 'promerium', (int)$this->rateFor($levels, $modules, 'promerium'), $elapsed, $capacities['promerium'], [
                    'prometid' => 10,
                    'duranium' => 10,
                    'xenomit' => 1,
                ]) || $changed;
            }

            if (isset($runnable['seprom'])) {
                $changed = $this->produceWithIngredients($state, 'seprom', (int)$this->rateFor($levels, $modules, 'seprom'), $elapsed, $capacities['seprom'], [
                    'promerium' => 10,
                ]) || $changed;
            }

            $state['last_update_at'] = date('Y-m-d H:i:s', $now);
            $this->saveResourceState($state);
        } elseif ($changed) {
            $this->saveResourceState($state);
        }
    }

    private function buildStateLocked(string $message): array
    {
        $state = $this->loadResourceStateLocked();
        $modules = $this->loadModulesLocked();
        $levels = $this->loadLevelCatalog();
        $capacities = $this->calculateCapacities($modules, $levels);
        $energy = $this->calculateEnergy($modules, $levels);
        $runnable = $this->getRunnableModules($modules, $levels);
        $userCredits = $this->loadUserCredits();
        $moduleState = [];

        foreach (self::MODULES as $moduleKey => $meta) {
            $module = $modules[$moduleKey] ?? ['level' => 0, 'active' => 0];
            $level = (int)($module['level'] ?? 0);
            $levelData = $levels[$moduleKey][$level] ?? null;
            $production = 0;
            $energyConsumption = $levelData ? (int)$levelData['energy_consumption'] : 0;

            if ($levelData) {
                if ($moduleKey === 'solar') {
                    $production = (int)$levelData['energy_production'];
                } else {
                    $production = (int)$levelData['production_per_hour'];
                }
            }

            $nextLevel = $level + 1;
            $basicLevel = (int)($modules['basic']['level'] ?? 0);
            $upgrading = $this->isModuleUpgrading($module);
            $stateLabel = $this->moduleStateLabel($moduleKey, $module, $runnable);
            $hasNextLevel = isset($levels[$moduleKey][$nextLevel]);
            $blockedByBasic = $moduleKey !== 'basic' && $nextLevel > max(1, $basicLevel);
            $upgradeCost = $hasNextLevel ? ($levels[$moduleKey][$nextLevel] ?? []) : [];
            $costBlockReason = $hasNextLevel && !$upgrading && !$blockedByBasic
                ? $this->upgradeCostBlockReason($state, $upgradeCost, $userCredits)
                : null;
            $canUpgrade = $hasNextLevel && !$upgrading && !$blockedByBasic && $costBlockReason === null;
            $upgradeReason = null;
            $isActive = (int)($module['active'] ?? 0) === 1;
            $efficiencyValue = $level > 0 && $isActive && isset($runnable[$moduleKey]) ? 100 : 0;

            if ($upgrading) {
                $upgradeReason = 'Upgrade already in progress.';
            } elseif (!$hasNextLevel) {
                $upgradeReason = 'Maximum level reached.';
            } elseif ($blockedByBasic) {
                $upgradeReason = 'Upgrade the Basic module first.';
            } elseif ($costBlockReason !== null) {
                $upgradeReason = $costBlockReason;
            } elseif (!$canUpgrade) {
                $upgradeReason = 'Upgrade is not available.';
            }

            if ($level <= 0) {
                $efficiencyValue = 0;
            }

            if ($moduleKey === 'solar' && $level > 0 && $isActive) {
                $efficiencyValue = 100;
            }

            if ($moduleKey === 'basic' && $level > 0 && $isActive) {
                $efficiencyValue = 100;
            }

            if ($moduleKey === 'storage' && $level > 0 && $isActive) {
                $efficiencyValue = 100;
            }

            if ($moduleKey === 'transport' && $level > 0 && $isActive) {
                $efficiencyValue = 100;
            }

            if (!$isActive) {
                $efficiencyValue = 0;
            }

            if (!isset($runnable[$moduleKey]) && !in_array($moduleKey, ['solar', 'basic', 'storage', 'transport'], true)) {
                $efficiencyValue = 0;
            }

            $moduleState[$moduleKey] = [
                'name' => $meta['name'],
                'type' => $meta['type'],
                'level' => $level,
                'active' => $isActive,
                'power' => $energyConsumption,
                'production' => $this->productionLabel($moduleKey, $meta['resource'], $production),
                'consumption' => $this->consumptionLabel($moduleKey, $energyConsumption),
                'efficiency' => $efficiencyValue . '%',
                'efficiencyValue' => $efficiencyValue,
                'state' => $stateLabel,
                'resourceKey' => $meta['resource'],
                'canUpgrade' => $canUpgrade,
                'canToggle' => $level > 0 && !$upgrading && !$meta['essential'],
                'canTransport' => $level > 0 && $meta['resource'] !== null && $meta['resource'] !== 'seprom',
                'upgrading' => $upgrading,
                'upgradeEndsAt' => $module['upgrade_ends_at'] ?? null,
                'upgradeRemainingSeconds' => $this->remainingSeconds($module['upgrade_ends_at'] ?? null),
                'nextLevel' => $hasNextLevel ? $nextLevel : null,
                'nextLevelCost' => $hasNextLevel ? $this->formatUpgradeCost($upgradeCost) : null,
                'upgradeReason' => $upgradeReason,
            ];
        }

        return [
            'available' => true,
            'message' => $message,
            'resources' => $this->formatResources($state, $capacities),
            'modules' => $moduleState,
            'energy' => $energy,
            'transports' => $this->loadTransportState(),
            'cargo_note' => 'Cargo delivered from the website may require a spacemap reload before the in-game cargo panel updates.',
        ];
    }

    private function unavailableState(string $message): array
    {
        return [
            'available' => false,
            'message' => $message,
            'resources' => [],
            'modules' => [],
            'energy' => ['available' => 0, 'consumed' => 0, 'free' => 0],
            'transports' => [],
            'cargo_note' => '',
        ];
    }

    private function loadResourceStateLocked(): array
    {
        $stmt = $this->db->prepare('SELECT * FROM player_skylab_state WHERE player_id = :player_id FOR UPDATE');
        $stmt->execute([':player_id' => $this->playerId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        foreach (self::RESOURCE_KEYS as $resourceKey) {
            $row[$resourceKey] = (int)($row[$resourceKey] ?? 0);
        }

        $row['last_update_at'] = $row['last_update_at'] ?? date('Y-m-d H:i:s');

        return $row;
    }

    private function saveResourceState(array $state): void
    {
        $stmt = $this->db->prepare(
            'UPDATE player_skylab_state
             SET prometium = :prometium,
                 endurium = :endurium,
                 terbium = :terbium,
                 xenomit = :xenomit,
                 prometid = :prometid,
                 duranium = :duranium,
                 promerium = :promerium,
                 seprom = :seprom,
                 last_update_at = :last_update_at,
                 updated_at = NOW()
             WHERE player_id = :player_id'
        );
        $stmt->execute([
            ':prometium' => max(0, (int)$state['prometium']),
            ':endurium' => max(0, (int)$state['endurium']),
            ':terbium' => max(0, (int)$state['terbium']),
            ':xenomit' => max(0, (int)$state['xenomit']),
            ':prometid' => max(0, (int)$state['prometid']),
            ':duranium' => max(0, (int)$state['duranium']),
            ':promerium' => max(0, (int)$state['promerium']),
            ':seprom' => max(0, (int)$state['seprom']),
            ':last_update_at' => $state['last_update_at'] ?? date('Y-m-d H:i:s'),
            ':player_id' => $this->playerId,
        ]);
    }

    private function loadModulesLocked(): array
    {
        $stmt = $this->db->prepare('SELECT * FROM player_skylab_modules WHERE player_id = :player_id FOR UPDATE');
        $stmt->execute([':player_id' => $this->playerId]);
        $modules = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $modules[(string)$row['module_key']] = $row;
        }

        foreach (self::DEFAULT_MODULES as $moduleKey => $default) {
            if (!isset($modules[$moduleKey])) {
                $modules[$moduleKey] = [
                    'module_key' => $moduleKey,
                    'level' => (int)$default['level'],
                    'active' => (int)$default['active'],
                    'upgrade_started_at' => null,
                    'upgrade_ends_at' => null,
                    'target_level' => null,
                ];
            }
        }

        return $modules;
    }

    private function loadLevelCatalog(): array
    {
        $stmt = $this->db->query('SELECT * FROM skylab_module_levels ORDER BY module_key ASC, level ASC');
        $levels = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $levels[(string)$row['module_key']][(int)$row['level']] = $row;
        }

        return $levels;
    }

    private function calculateCapacities(array $modules, array $levels): array
    {
        $storageLevel = max(1, (int)($modules['storage']['level'] ?? 1));
        $storage = $levels['storage'][$storageLevel] ?? [];

        return [
            'prometium' => max(1000, (int)($storage['storage_basic'] ?? 1000)),
            'endurium' => max(1000, (int)($storage['storage_basic'] ?? 1000)),
            'terbium' => max(1000, (int)($storage['storage_basic'] ?? 1000)),
            'prometid' => max(250, (int)($storage['storage_refined'] ?? 250)),
            'duranium' => max(250, (int)($storage['storage_refined'] ?? 250)),
            'xenomit' => max(80, (int)($storage['storage_advanced'] ?? 80)),
            'promerium' => max(80, (int)($storage['storage_advanced'] ?? 80)),
            'seprom' => max(30, (int)($storage['storage_seprom'] ?? 30)),
        ];
    }

    private function calculateEnergy(array $modules, array $levels): array
    {
        $solarLevel = max(0, (int)($modules['solar']['level'] ?? 0));
        $available = (int)($levels['solar'][$solarLevel]['energy_production'] ?? 0);
        $runnable = $this->getRunnableModules($modules, $levels);
        $consumed = 0;

        foreach ($runnable as $moduleKey => $enabled) {
            if (!$enabled || $moduleKey === 'solar') {
                continue;
            }

            $level = (int)($modules[$moduleKey]['level'] ?? 0);
            $consumed += (int)($levels[$moduleKey][$level]['energy_consumption'] ?? 0);
        }

        return [
            'available' => $available,
            'consumed' => $consumed,
            'free' => max(0, $available - $consumed),
        ];
    }

    private function getRunnableModules(array $modules, array $levels): array
    {
        $solarLevel = max(0, (int)($modules['solar']['level'] ?? 0));
        $available = (int)($levels['solar'][$solarLevel]['energy_production'] ?? 0);
        $consumed = 0;
        $runnable = [];
        $priority = ['solar', 'basic', 'storage', 'transport', 'prometium', 'endurium', 'terbium', 'xeno', 'prometid', 'duranium', 'promerium', 'seprom'];

        foreach ($priority as $moduleKey) {
            $module = $modules[$moduleKey] ?? null;
            if (!$module || (int)$module['level'] <= 0 || (int)$module['active'] !== 1) {
                continue;
            }

            $level = (int)$module['level'];
            $need = (int)($levels[$moduleKey][$level]['energy_consumption'] ?? 0);
            if ($moduleKey === 'solar' || $need === 0 || $consumed + $need <= $available) {
                $consumed += $need;
                $runnable[$moduleKey] = true;
            }
        }

        return $runnable;
    }

    private function canPowerModule(string $moduleKey, array $modules): bool
    {
        $levels = $this->loadLevelCatalog();
        $modules[$moduleKey]['active'] = 1;
        $runnable = $this->getRunnableModules($modules, $levels);

        return isset($runnable[$moduleKey]);
    }

    private function addProducedResource(array &$state, string $resourceKey, int $ratePerHour, int $elapsed, int $capacity): bool
    {
        $amount = (int)floor(($ratePerHour * $elapsed) / 3600);
        if ($amount <= 0 || (int)$state[$resourceKey] >= $capacity) {
            return false;
        }

        $before = (int)$state[$resourceKey];
        $state[$resourceKey] = min($capacity, $before + $amount);

        return $state[$resourceKey] !== $before;
    }

    private function produceWithIngredients(array &$state, string $resourceKey, int $ratePerHour, int $elapsed, int $capacity, array $ingredients): bool
    {
        $wanted = (int)floor(($ratePerHour * $elapsed) / 3600);
        if ($wanted <= 0 || (int)$state[$resourceKey] >= $capacity) {
            return false;
        }

        $wanted = min($wanted, max(0, $capacity - (int)$state[$resourceKey]));
        $possible = $wanted;

        foreach ($ingredients as $ingredient => $needed) {
            $possible = min($possible, (int)floor(((int)$state[$ingredient]) / max(1, (int)$needed)));
        }

        if ($possible <= 0) {
            return false;
        }

        foreach ($ingredients as $ingredient => $needed) {
            $state[$ingredient] -= $possible * (int)$needed;
        }

        $state[$resourceKey] += $possible;

        return true;
    }

    private function rateFor(array $levels, array $modules, string $moduleKey): int
    {
        $level = (int)($modules[$moduleKey]['level'] ?? 0);

        return (int)($levels[$moduleKey][$level]['production_per_hour'] ?? 0);
    }

    private function ensureUserCredits(int $creditsCost): void
    {
        if ($creditsCost <= 0) {
            return;
        }

        $stmt = $this->db->prepare('SELECT credits FROM users WHERE id = :player_id FOR UPDATE');
        $stmt->execute([':player_id' => $this->playerId]);
        $credits = (int)$stmt->fetchColumn();

        if ($credits < $creditsCost) {
            throw new RuntimeException('Not enough credits.');
        }
    }

    private function loadUserCredits(): int
    {
        $stmt = $this->db->prepare('SELECT credits FROM users WHERE id = :player_id LIMIT 1');
        $stmt->execute([':player_id' => $this->playerId]);
        $credits = $stmt->fetchColumn();

        return $credits === false ? 0 : max(0, (int)$credits);
    }

    private function upgradeCostBlockReason(array $state, array $cost, int $userCredits): ?string
    {
        $creditsCost = (int)($cost['upgrade_credits'] ?? 0);
        if ($creditsCost > 0 && $userCredits < $creditsCost) {
            return 'Not enough credits.';
        }

        foreach (self::RESOURCE_KEYS as $resourceKey) {
            $field = 'cost_' . $resourceKey;
            $needed = (int)($cost[$field] ?? 0);
            if ($needed > 0 && (int)$state[$resourceKey] < $needed) {
                return 'Not enough ' . self::RESOURCE_NAMES[$resourceKey] . '.';
            }
        }

        return null;
    }

    private function ensureResourceCosts(array $state, array $cost): void
    {
        foreach (self::RESOURCE_KEYS as $resourceKey) {
            $field = 'cost_' . $resourceKey;
            $needed = (int)($cost[$field] ?? 0);
            if ($needed > 0 && (int)$state[$resourceKey] < $needed) {
                throw new RuntimeException('Not enough ' . self::RESOURCE_NAMES[$resourceKey] . '.');
            }
        }
    }

    private function deductResourceCosts(array &$state, array $cost): void
    {
        foreach (self::RESOURCE_KEYS as $resourceKey) {
            $field = 'cost_' . $resourceKey;
            $needed = (int)($cost[$field] ?? 0);
            if ($needed > 0) {
                $state[$resourceKey] -= $needed;
            }
        }
    }

    private function loadShipCargoLocked(): array
    {
        $stmt = $this->db->prepare('SELECT * FROM player_cargo WHERE id = :player_id FOR UPDATE');
        $stmt->execute([':player_id' => $this->playerId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        $cargo = [];

        foreach (self::SHIP_CARGO_RESOURCES as $resourceKey) {
            $cargo[$resourceKey] = (int)($row[$resourceKey] ?? 0);
        }

        return $cargo;
    }

    private function getApproximateShipCargoCapacityLocked(): int
    {
        try {
            $stmt = $this->db->prepare(
                'SELECT u.max_cargo, sd.base_cargo_2010
                 FROM users u
                 LEFT JOIN ship_design sd ON sd.ship_design_id = u.shipid
                 WHERE u.id = :player_id
                 FOR UPDATE'
            );
            $stmt->execute([':player_id' => $this->playerId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

            return max(0, (int)($row['max_cargo'] ?? 0), (int)($row['base_cargo_2010'] ?? 0), 1000);
        } catch (Throwable $ignored) {
            return 1000;
        }
    }

    private function getTransportSeconds(int $amount, int $transportLevel): int
    {
        $base = 900;
        $levelReduction = min(600, max(0, $transportLevel - 1) * 30);
        $loadPenalty = (int)ceil($amount / 25000) * 30;

        return max(120, $base - $levelReduction + $loadPenalty);
    }

    private function loadTransportState(): array
    {
        $stmt = $this->db->prepare(
            'SELECT id, direction, resource_key, amount, started_at, arrives_at, status
             FROM player_skylab_transports
             WHERE player_id = :player_id AND status = :status
             ORDER BY arrives_at ASC, id ASC
             LIMIT 10'
        );
        $stmt->execute([
            ':player_id' => $this->playerId,
            ':status' => 'pending',
        ]);

        $now = time();
        $rows = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $arrivesAt = strtotime((string)$row['arrives_at']);
            $rows[] = [
                'id' => (int)$row['id'],
                'direction' => (string)$row['direction'],
                'resourceKey' => (string)$row['resource_key'],
                'resourceName' => self::RESOURCE_NAMES[(string)$row['resource_key']] ?? (string)$row['resource_key'],
                'amount' => (int)$row['amount'],
                'startedAt' => (string)$row['started_at'],
                'arrivesAt' => (string)$row['arrives_at'],
                'remainingSeconds' => $arrivesAt === false ? 0 : max(0, $arrivesAt - $now),
                'ready' => $arrivesAt !== false && $arrivesAt <= $now,
                'status' => (string)$row['status'],
            ];
        }

        return $rows;
    }

    private function formatResources(array $state, array $capacities): array
    {
        $resources = [];
        foreach (self::RESOURCE_KEYS as $resourceKey) {
            $resources[] = [
                'key' => $resourceKey,
                'name' => self::RESOURCE_NAMES[$resourceKey],
                'amount' => (int)$state[$resourceKey],
                'capacity' => (int)$capacities[$resourceKey],
            ];
        }

        return $resources;
    }

    private function productionLabel(string $moduleKey, ?string $resourceKey, int $production): string
    {
        if ($moduleKey === 'solar') {
            return 'Energy capacity: ' . number_format($production);
        }

        if ($moduleKey === 'storage') {
            return 'Increases Skylab storage capacity.';
        }

        if ($moduleKey === 'basic') {
            return 'Unlocks higher module levels.';
        }

        if ($moduleKey === 'transport') {
            return 'Moves ores from Skylab to ship cargo.';
        }

        if ($resourceKey === null) {
            return 'No production.';
        }

        return '+' . number_format($production) . ' ' . self::RESOURCE_NAMES[$resourceKey] . '/hour';
    }

    private function consumptionLabel(string $moduleKey, int $energyConsumption): string
    {
        if ($moduleKey === 'prometid') {
            return 'Consumes Prometium and Endurium.';
        }

        if ($moduleKey === 'duranium') {
            return 'Consumes Endurium and Terbium.';
        }

        if ($moduleKey === 'promerium') {
            return 'Consumes Prometid, Duranium and Xenomit.';
        }

        if ($moduleKey === 'seprom') {
            return 'Consumes Promerium.';
        }

        if ($energyConsumption <= 0) {
            return 'No energy consumption.';
        }

        return number_format($energyConsumption) . ' energy.';
    }

    private function moduleStateLabel(string $moduleKey, array $module, array $runnable): string
    {
        if ($this->isModuleUpgrading($module)) {
            return 'Upgrading';
        }

        if ((int)($module['level'] ?? 0) <= 0) {
            return 'Not built';
        }

        if ((int)($module['active'] ?? 0) !== 1) {
            return 'Inactive';
        }

        if (!isset($runnable[$moduleKey])) {
            return 'No energy';
        }

        return 'Active';
    }

    private function formatUpgradeCost(array $cost): ?array
    {
        if (!$cost) {
            return null;
        }

        $resources = [];
        foreach (self::RESOURCE_KEYS as $resourceKey) {
            $field = 'cost_' . $resourceKey;
            $value = (int)($cost[$field] ?? 0);
            if ($value > 0) {
                $resources[$resourceKey] = $value;
            }
        }

        return [
            'credits' => (int)($cost['upgrade_credits'] ?? 0),
            'resources' => $resources,
            'seconds' => (int)($cost['upgrade_seconds'] ?? 0),
        ];
    }

    private function isModuleUpgrading(array $module): bool
    {
        return !empty($module['upgrade_ends_at']) && (int)($module['target_level'] ?? 0) > (int)($module['level'] ?? 0);
    }

    private function remainingSeconds(?string $dateTime): int
    {
        if (!$dateTime) {
            return 0;
        }

        $timestamp = strtotime($dateTime);
        if ($timestamp === false) {
            return 0;
        }

        return max(0, $timestamp - time());
    }

    private function normalizeModuleKey(string $moduleKey): string
    {
        $moduleKey = strtolower(trim($moduleKey));
        if (!isset(self::MODULES[$moduleKey])) {
            throw new RuntimeException('Unknown Skylab module.');
        }

        return $moduleKey;
    }

    private function normalizeResourceKey(string $resourceKey): string
    {
        $resourceKey = strtolower(trim($resourceKey));
        if (!in_array($resourceKey, self::RESOURCE_KEYS, true)) {
            throw new RuntimeException('Unknown Skylab resource.');
        }

        return $resourceKey;
    }

    private function shipCargoColumn(string $resourceKey): string
    {
        if (!in_array($resourceKey, self::SHIP_CARGO_RESOURCES, true)) {
            throw new RuntimeException('This resource cannot be moved to ship cargo.');
        }

        return '`' . $resourceKey . '`';
    }
}
