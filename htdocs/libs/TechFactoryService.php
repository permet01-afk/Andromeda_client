<?php
declare(strict_types=1);

require_once __DIR__ . '/SkylabService.php';

final class TechFactoryUnavailable extends RuntimeException {}
final class TechFactoryRuleException extends RuntimeException {}

/** Generic halls; UTC TECH timestamps; all writes are data-only transactions.
 * Lock order: Skylab state/modules (web build/settle), users wallet, slots, builds,
 * inventory in tech_id order, use events. Every TECH writer locks users first.
 * GET state is strictly read-only, including for a new player.
 */
final class TechFactoryService
{
    public const MAX_AMOUNT = 2147483647;
    public const NOT_INSTALLED = 'Tech Factory is not installed. Please install the required database tables.';
    private PDO $db;
    private int $playerId;
    private array $catalog;
    private ?bool $available = null;

    public function __construct(PDO $db, int $playerId)
    {
        if ($playerId <= 0) { throw new InvalidArgumentException('Invalid player.'); }
        $this->db = $db;
        $this->playerId = $playerId;
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->catalog = self::loadCatalog();
    }

    public static function loadCatalog(?string $file = null): array
    {
        $json = file_get_contents($file ?? __DIR__ . '/../config/tech_factory.json');
        $rows = json_decode($json === false ? '' : $json, true, 32, JSON_THROW_ON_ERROR);
        $codes = [1 => 'ELA', 2 => 'ECI', 3 => 'RPM', 4 => 'SBU', 5 => 'BRB'];
        if (!is_array($rows) || count($rows) !== 5) { throw new UnexpectedValueException('Invalid TECH catalogue.'); }
        $result = [];
        foreach ($rows as $row) {
            $id = $row['tech_id'] ?? null;
            if (!is_int($id) || !isset($codes[$id]) || isset($result[$id]) || ($row['code'] ?? '') !== $codes[$id]) {
                throw new UnexpectedValueException('Invalid TECH identity.');
            }
            foreach (['buildCredits', 'buildSeprom', 'buildLogfiles', 'buildSeconds'] as $field) {
                if (!isset($row[$field]) || !is_int($row[$field]) || $row[$field] < 0 || $row[$field] > self::MAX_AMOUNT) {
                    throw new UnexpectedValueException('Invalid TECH recipe.');
                }
            }
            if ($row['buildSeconds'] < 1 || !is_string($row['displayName'] ?? null)
                || strlen($row['displayName']) < 1 || strlen($row['displayName']) > 64
                || !is_string($row['recipeVersion'] ?? null)
                || !preg_match('/\A[a-zA-Z0-9._-]{1,64}\z/', $row['recipeVersion'])) {
                throw new UnexpectedValueException('Invalid TECH catalogue metadata.');
            }
            $result[$id] = array_intersect_key($row, array_flip(['tech_id','code','displayName','buildCredits','buildSeprom','buildLogfiles','buildSeconds','recipeVersion']));
        }
        ksort($result);
        return $result;
    }

    public static function requestKey(string $key): string
    {
        if (!preg_match('/\A[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\z/i', $key)) {
            throw new TechFactoryRuleException('Invalid request key.');
        }
        return strtolower($key);
    }

    /** Expected base types / nullability; widths of INT display formats are irrelevant. */
    public static function schemaColumns(): array
    {
        return [
            'player_tech_inventory' => ['player_id'=>'int','tech_id'=>'tinyint unsigned','amount'=>'int unsigned','cooldown_until'=>'?datetime','active_until'=>'?datetime','active_use_id'=>'?char(36)','version'=>'bigint unsigned'],
            'player_tech_slots' => ['player_id'=>'int','slot_no'=>'tinyint unsigned','unlocked_at'=>'?datetime','unlock_request_key'=>'?char(36)','unlock_paid_uridium'=>'bigint unsigned'],
            'player_tech_builds' => ['id'=>'bigint unsigned','player_id'=>'int','slot_no'=>'tinyint unsigned','tech_id'=>'tinyint unsigned','request_key'=>'char(36)','active_slot_no'=>'?tinyint unsigned','started_at'=>'datetime','ends_at'=>'datetime','credited_at'=>'?datetime','recipe_version'=>'varchar(64)','paid_credits'=>'bigint unsigned','paid_uridium'=>'bigint unsigned','paid_seprom'=>'bigint unsigned','paid_logfiles'=>'bigint unsigned'],
            'player_tech_use_events' => ['use_id'=>'char(36)','player_id'=>'int','tech_id'=>'tinyint unsigned','reserved_at'=>'datetime','resolved_at'=>'?datetime','session_generation'=>'char(36)','state'=>'varchar(16)','details'=>'varchar(1024)'],
        ];
    }

    public function isAvailable(): bool
    {
        if ($this->available !== null) { return $this->available; }
        $this->available = false;
        $names = "'player_tech_inventory','player_tech_slots','player_tech_builds','player_tech_use_events'";
        try {
            $tables = $this->db->query("SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ($names,'users')")->fetchAll(PDO::FETCH_ASSOC);
            if (count($tables) !== 5) { return false; }
            foreach ($tables as $table) { if (strcasecmp((string)$table['ENGINE'], 'InnoDB') !== 0) { return false; } }
            $actual = [];
            foreach ($this->db->query("SELECT TABLE_NAME,COLUMN_NAME,DATA_TYPE,COLUMN_TYPE,IS_NULLABLE,CHARACTER_MAXIMUM_LENGTH,DATETIME_PRECISION,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ($names)")->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $type = strtolower($row['DATA_TYPE']);
                if (in_array($type, ['char','varchar'], true)) { $type .= '(' . $row['CHARACTER_MAXIMUM_LENGTH'] . ')'; }
                if (strpos(strtolower($row['COLUMN_TYPE']), 'unsigned') !== false) { $type .= ' unsigned'; }
                if ($row['IS_NULLABLE'] === 'YES') { $type = '?' . $type; }
                $actual[$row['TABLE_NAME']][$row['COLUMN_NAME']] = $type;
                if ($row['DATA_TYPE'] === 'datetime' && (int)$row['DATETIME_PRECISION'] !== 6) { return false; }
                if ($row['TABLE_NAME'] === 'player_tech_builds' && $row['COLUMN_NAME'] === 'id' && strpos($row['EXTRA'], 'auto_increment') === false) { return false; }
            }
            foreach (self::schemaColumns() as $table => $columns) {
                foreach ($columns as $name => $type) { if (($actual[$table][$name] ?? '') !== $type) { return false; } }
            }
            $required = [
                'player_tech_inventory:PRIMARY'=>'0:player_id,tech_id',
                'player_tech_slots:PRIMARY'=>'0:player_id,slot_no',
                'player_tech_slots:tf_unlock_request'=>'0:player_id,unlock_request_key',
                'player_tech_builds:PRIMARY'=>'0:id',
                'player_tech_builds:tf_build_request'=>'0:player_id,request_key',
                'player_tech_builds:tf_active_slot'=>'0:player_id,active_slot_no',
                'player_tech_builds:tf_due'=>'1:player_id,credited_at,ends_at',
                'player_tech_use_events:PRIMARY'=>'0:use_id',
                'player_tech_use_events:tf_use_player'=>'1:player_id,reserved_at',
                'player_tech_use_events:tf_use_review'=>'1:state,reserved_at',
            ];
            $indexes = $this->db->query("SELECT TABLE_NAME,INDEX_NAME,NON_UNIQUE,GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ($names) GROUP BY TABLE_NAME,INDEX_NAME,NON_UNIQUE")->fetchAll(PDO::FETCH_ASSOC);
            foreach ($indexes as $row) {
                $key = $row['TABLE_NAME'] . ':' . $row['INDEX_NAME'];
                if (isset($required[$key]) && $required[$key] === $row['NON_UNIQUE'] . ':' . $row['cols']) { unset($required[$key]); }
            }
            return $this->available = !$required;
        } catch (Throwable $error) {
            error_log('[Tech Factory schema] ' . $error->getMessage());
            return false;
        }
    }

    private function query(string $sql, array $params = []): PDOStatement
    {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    private function requireAvailable(): void
    {
        if (!$this->isAvailable()) { throw new TechFactoryUnavailable(self::NOT_INSTALLED); }
    }

    private function transaction(callable $operation): array
    {
        if ($this->db->inTransaction()) { throw new LogicException('Nested Factory transaction.'); }
        for ($attempt = 0; ; ++$attempt) {
            $committing = false;
            try {
                $this->db->beginTransaction();
                $result = $operation();
                $committing = true;
                $this->db->commit();
                return $result;
            } catch (Throwable $error) {
                $rolledBack = false;
                if ($this->db->inTransaction()) { $rolledBack = $this->db->rollBack(); }
                $number = $error instanceof PDOException ? (int)($error->errorInfo[1] ?? 0) : 0;
                // Only retry a known aborted transaction; NEVER retry an uncertain commit.
                if (!$committing && ($rolledBack || $number === 1213) && in_array($number, [1205,1213], true) && $attempt < 2) {
                    usleep(20000 * ($attempt + 1));
                    continue;
                }
                throw $error;
            }
        }
    }

    /** Caller holds users first. These inserts are DATA, not schema creation. */
    private function lockPlayer(?string $requestKey = null): array
    {
        $wallet = $this->query('SELECT credits,uridium,logfiles FROM users WHERE id=? FOR UPDATE', [$this->playerId])->fetch(PDO::FETCH_ASSOC);
        if (!$wallet) { throw new TechFactoryRuleException('Player not found.'); }
        for ($slot = 1; $slot <= 3; ++$slot) {
            $this->query('INSERT INTO player_tech_slots (player_id,slot_no,unlocked_at) VALUES (?,?,IF(?=1,UTC_TIMESTAMP(6),NULL)) ON DUPLICATE KEY UPDATE player_id=VALUES(player_id)', [$this->playerId,$slot,$slot]);
        }
        $slots = $this->query('SELECT * FROM player_tech_slots WHERE player_id=? ORDER BY slot_no FOR UPDATE', [$this->playerId])->fetchAll(PDO::FETCH_ASSOC);
        $builds = $this->query('SELECT * FROM player_tech_builds WHERE player_id=? AND (credited_at IS NULL OR request_key=?) ORDER BY id FOR UPDATE', [$this->playerId,$requestKey ?? ''])->fetchAll(PDO::FETCH_ASSOC);
        for ($tech = 1; $tech <= 5; ++$tech) {
            $this->query('INSERT INTO player_tech_inventory (player_id,tech_id,amount) VALUES (?,?,0) ON DUPLICATE KEY UPDATE player_id=VALUES(player_id)', [$this->playerId,$tech]);
        }
        $inventory = $this->query('SELECT * FROM player_tech_inventory WHERE player_id=? ORDER BY tech_id FOR UPDATE', [$this->playerId])->fetchAll(PDO::FETCH_ASSOC);
        $now = (string)$this->db->query('SELECT UTC_TIMESTAMP(6)')->fetchColumn();
        return compact('wallet','slots','builds','inventory','now');
    }

    private function creditDue(array &$locked): array
    {
        $completed = [];
        foreach ($locked['builds'] as &$build) {
            if ($build['credited_at'] !== null || $build['ends_at'] > $locked['now']) { continue; }
            $id = (int)$build['tech_id'];
            if (!isset($this->catalog[$id])) { throw new TechFactoryUnavailable('Tech Factory data is incompatible.'); }
            $changed = $this->query('UPDATE player_tech_inventory SET amount=amount+1,version=version+1 WHERE player_id=? AND tech_id=? AND amount<?', [$this->playerId,$id,self::MAX_AMOUNT])->rowCount();
            // The technical integer bound must not delete a paid, completed build.
            if ($changed !== 1) { continue; }
            if ($this->query('UPDATE player_tech_builds SET credited_at=?,active_slot_no=NULL WHERE id=? AND credited_at IS NULL', [$locked['now'],$build['id']])->rowCount() !== 1) { throw new RuntimeException('Delivery invariant failed.'); }
            $build['credited_at'] = $locked['now'];
            $build['active_slot_no'] = null;
            $completed[] = ['id'=>(string)$build['id'],'tech_id'=>$id,'displayName'=>$this->catalog[$id]['displayName']];
        }
        unset($build);
        return $completed;
    }

    public function settle(): array
    {
        $this->requireAvailable();
        $skylab = $this->productionSkylab(false);
        $result = $this->transaction(function () use ($skylab): array {
            // Refresh the web's spendable Seprom after offline production. GET stays read-only.
            if ($skylab !== null) { $skylab->lockFactorySeprom(); }
            $locked = $this->lockPlayer();
            return ['completed'=>$this->creditDue($locked)];
        });
        return $result + ['message'=>'Tech Factory updated.','state'=>$this->getState()];
    }

    private function productionSkylab(bool $required): ?SkylabService
    {
        $skylab = new SkylabService($this->db, $this->playerId);
        if (!$skylab->isAvailable()) {
            if (!$required) { return null; }
            throw new TechFactoryUnavailable('Skylab is not installed. Please install the required database tables.');
        }
        $tables = $this->db->query("SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('player_skylab_state','player_skylab_modules')")->fetchAll(PDO::FETCH_ASSOC);
        if (count($tables) !== 2 || array_filter($tables, static fn(array $table): bool => strcasecmp((string)$table['ENGINE'], 'InnoDB') !== 0)) {
            throw new TechFactoryUnavailable('Skylab storage is incompatible with transactional production.');
        }
        return $skylab;
    }

    public function build(int $techId, int $slotNo, string $requestKey): array
    {
        $this->requireAvailable();
        $key = self::requestKey($requestKey);
        if (!isset($this->catalog[$techId]) || $slotNo < 1 || $slotNo > 3) { throw new TechFactoryRuleException('Invalid technology or hall.'); }
        $recipe = $this->catalog[$techId];
        $skylab = $this->productionSkylab(true);
        $result = $this->transaction(function () use ($techId,$slotNo,$key,$recipe,$skylab): array {
            // This helper participates in THIS transaction; no nested getState().
            $seprom = $skylab->lockFactorySeprom();
            $locked = $this->lockPlayer($key);
            foreach ($locked['slots'] as $slot) {
                if ($slot['unlock_request_key'] === $key) { throw new TechFactoryRuleException('Request key was already used for another action.'); }
            }
            foreach ($locked['builds'] as $build) {
                if ($build['request_key'] === $key) {
                    if ((int)$build['tech_id'] !== $techId || (int)$build['slot_no'] !== $slotNo) { throw new TechFactoryRuleException('Request key does not match the original build.'); }
                    return ['build_id'=>(string)$build['id'],'replayed'=>true,'completed'=>[]];
                }
            }
            $completed = $this->creditDue($locked);
            $slot = $locked['slots'][$slotNo - 1];
            if ((int)$slot['slot_no'] !== $slotNo || $slot['unlocked_at'] === null) { throw new TechFactoryRuleException('This hall is locked.'); }
            foreach ($locked['builds'] as $build) {
                if ($build['credited_at'] === null && (int)$build['slot_no'] === $slotNo) { throw new TechFactoryRuleException('This hall is already building.'); }
            }
            if ((int)$locked['wallet']['credits'] < $recipe['buildCredits']) { throw new TechFactoryRuleException('Not enough Credits.'); }
            if ($seprom < $recipe['buildSeprom']) { throw new TechFactoryRuleException('Not enough Seprom.'); }
            if ((int)$locked['wallet']['logfiles'] < $recipe['buildLogfiles']) { throw new TechFactoryRuleException('Not enough Log Files.'); }
            $amount = 0;
            foreach ($locked['inventory'] as $item) { if ((int)$item['tech_id'] === $techId) { $amount = (int)$item['amount']; } }
            // creditDue may have added this type after the inventory snapshot.
            $amount += count(array_filter($completed, static fn(array $item): bool => $item['tech_id'] === $techId));
            $pending = count(array_filter($locked['builds'], static fn(array $item): bool => (int)$item['tech_id'] === $techId && $item['credited_at'] === null));
            if ($amount >= self::MAX_AMOUNT - $pending) { throw new TechFactoryRuleException('Technical stock limit reached.'); }
            if ($this->query('UPDATE users SET credits=credits-?,logfiles=logfiles-? WHERE id=? AND credits>=? AND logfiles>=?', [$recipe['buildCredits'],$recipe['buildLogfiles'],$this->playerId,$recipe['buildCredits'],$recipe['buildLogfiles']])->rowCount() !== 1) { throw new TechFactoryRuleException('Resources changed. Please try again.'); }
            $skylab->debitFactorySeprom($recipe['buildSeprom']);
            $this->query('INSERT INTO player_tech_builds (player_id,slot_no,tech_id,request_key,active_slot_no,started_at,ends_at,recipe_version,paid_credits,paid_uridium,paid_seprom,paid_logfiles) VALUES (?,?,?,?,?,?,DATE_ADD(?,INTERVAL ? SECOND),?,?,0,?,?)', [$this->playerId,$slotNo,$techId,$key,$slotNo,$locked['now'],$locked['now'],$recipe['buildSeconds'],$recipe['recipeVersion'],$recipe['buildCredits'],$recipe['buildSeprom'],$recipe['buildLogfiles']]);
            return ['build_id'=>$this->db->lastInsertId(),'replayed'=>false,'completed'=>$completed];
        });
        return $result + ['message'=>'Building ' . $recipe['displayName'],'state'=>$this->getState()];
    }

    public function unlock(int $slotNo, string $requestKey): array
    {
        $this->requireAvailable();
        $key = self::requestKey($requestKey);
        if (!in_array($slotNo, [2,3], true)) { throw new TechFactoryRuleException('Invalid hall.'); }
        $price = $slotNo === 2 ? 50000 : 100000;
        $result = $this->transaction(function () use ($slotNo,$key,$price): array {
            $locked = $this->lockPlayer($key);
            foreach ($locked['builds'] as $build) { if ($build['request_key'] === $key) { throw new TechFactoryRuleException('Request key was already used for another action.'); } }
            foreach ($locked['slots'] as $slot) {
                if ($slot['unlock_request_key'] === $key && (int)$slot['slot_no'] !== $slotNo) { throw new TechFactoryRuleException('Request key does not match the original hall.'); }
            }
            $slot = $locked['slots'][$slotNo - 1];
            if ($slot['unlocked_at'] !== null) { return ['replayed'=>true]; }
            if ((int)$locked['wallet']['uridium'] < $price) { throw new TechFactoryRuleException('Not enough Uridium.'); }
            if ($this->query('UPDATE users SET uridium=uridium-? WHERE id=? AND uridium>=?', [$price,$this->playerId,$price])->rowCount() !== 1) { throw new TechFactoryRuleException('Not enough Uridium.'); }
            if ($this->query('UPDATE player_tech_slots SET unlocked_at=?,unlock_request_key=?,unlock_paid_uridium=? WHERE player_id=? AND slot_no=? AND unlocked_at IS NULL', [$locked['now'],$key,$price,$this->playerId,$slotNo])->rowCount() !== 1) { throw new RuntimeException('Hall unlock invariant failed.'); }
            return ['replayed'=>false];
        });
        return $result + ['message'=>'Hall unlocked.','completed'=>[],'state'=>$this->getState()];
    }

    public function getState(): array
    {
        $this->requireAvailable();
        // Consistent snapshot, no inserts, no catch-up and no implicit delivery on GET.
        return $this->transaction(function (): array {
            $now = (string)$this->db->query('SELECT UTC_TIMESTAMP(6)')->fetchColumn();
            $wallet = $this->query('SELECT credits,uridium,logfiles FROM users WHERE id=?', [$this->playerId])->fetch(PDO::FETCH_ASSOC);
            if (!$wallet) { throw new TechFactoryRuleException('Player not found.'); }
            $inventory = [];
            foreach ($this->catalog as $id => $unused) { $inventory[$id] = ['tech_id'=>$id,'amount'=>0,'version'=>'0']; }
            foreach ($this->query('SELECT tech_id,amount,version FROM player_tech_inventory WHERE player_id=? ORDER BY tech_id', [$this->playerId])->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $id = (int)$row['tech_id'];
                if (!isset($inventory[$id]) || (int)$row['amount'] < 0 || (int)$row['amount'] > self::MAX_AMOUNT) { throw new TechFactoryUnavailable('Tech Factory data is incompatible.'); }
                $inventory[$id] = ['tech_id'=>$id,'amount'=>(int)$row['amount'],'version'=>(string)$row['version']];
            }
            $slots = [];
            for ($slot = 1; $slot <= 3; ++$slot) { $slots[$slot] = ['slot_no'=>$slot,'unlocked'=>$slot===1,'unlockCost'=>$slot===1?0:($slot===2?50000:100000)]; }
            foreach ($this->query('SELECT slot_no,unlocked_at FROM player_tech_slots WHERE player_id=? ORDER BY slot_no', [$this->playerId])->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $id = (int)$row['slot_no'];
                if (!isset($slots[$id])) { throw new TechFactoryUnavailable('Tech Factory data is incompatible.'); }
                $slots[$id]['unlocked'] = $row['unlocked_at'] !== null;
            }
            $builds = $this->query('SELECT id,slot_no,tech_id,started_at,ends_at,paid_credits,paid_seprom,paid_logfiles FROM player_tech_builds WHERE player_id=? AND credited_at IS NULL ORDER BY id', [$this->playerId])->fetchAll(PDO::FETCH_ASSOC);
            foreach ($builds as &$build) {
                $build['id'] = (string)$build['id'];
                foreach (['slot_no','tech_id','paid_credits','paid_seprom','paid_logfiles'] as $field) { $build[$field] = (int)$build[$field]; }
                foreach (['started_at','ends_at'] as $field) { $build[$field] = self::epoch($build[$field]); }
            }
            unset($build);
            $seprom = 0;
            $skylabAvailable = false;
            try {
                $row = $this->query('SELECT seprom FROM player_skylab_state WHERE player_id=?', [$this->playerId])->fetch(PDO::FETCH_ASSOC);
                $seprom = max(0, (int)($row['seprom'] ?? 0));
                $skylabAvailable = true;
            } catch (PDOException $error) {
                if ((int)($error->errorInfo[1] ?? 0) !== 1146) { throw $error; }
            }
            return ['available'=>true,'server_now'=>self::epoch($now),'catalog'=>array_values($this->catalog),
                'stocks'=>array_values($inventory),'halls'=>array_values($slots),'builds'=>$builds,
                'resources'=>['credits'=>(int)$wallet['credits'],'uridium'=>(int)$wallet['uridium'],'logfiles'=>(int)$wallet['logfiles'],'seprom'=>$seprom],
                'skylab_available'=>$skylabAvailable,'max_amount'=>self::MAX_AMOUNT];
        });
    }

    private static function epoch(string $utc): int
    {
        return (new DateTimeImmutable($utc, new DateTimeZone('UTC')))->getTimestamp();
    }
}
