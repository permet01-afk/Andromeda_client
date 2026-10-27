<?php

/** Historical catalogue adapter for QuestService. It shares its lifecycle tables and authority. */
require_once __DIR__ . '/HistoricalQuestLabels.php';

trait HistoricalQuestSupport
{
    private $historicalEnabledCache = null;
    private $historicalRowsCache = null;
    private $historicalPlayerCache = null;
    private $historicalCompletedCache = null;

    public function isHistoricalEnabled(): bool
    {
        if ($this->historicalEnabledCache !== null) return $this->historicalEnabledCache;
        try {
            $stmt = $this->db->query("SELECT enabled FROM site_quest_features WHERE feature_key = 'historical_catalog' LIMIT 1");
            return $this->historicalEnabledCache = ((int)$stmt->fetchColumn() === 1);
        } catch (PDOException $e) { return $this->historicalEnabledCache = false; }
    }

    public function isHistoricalCatalogActive(): bool { return $this->isHistoricalEnabled(); }

    private function historicalCatalogue(): array
    {
        static $cache = null;
        if ($cache === null) {
            $path = __DIR__ . '/../data/historical-quests.json';
            $cache = json_decode((string)file_get_contents($path), true);
            $metadata = $this->historicalMetadata();
            $count = is_array($cache['quests'] ?? null) ? count($cache['quests']) : 0;
            if (!is_array($cache) || ($cache['schema_version'] ?? 0) !== 1 || $count < 1
                || ($cache['logical_missions'] ?? 0) !== $count || $metadata['catalogue_count'] !== $count
                || !hash_equals($metadata['catalogue_sha256'], hash_file('sha256', $path))) {
                throw new RuntimeException('Historical catalogue integrity check failed.');
            }
        }
        return $cache;
    }

    private function historicalMetadata(): array
    {
        static $metadata = null;
        if ($metadata === null) {
            $metadata = json_decode((string)file_get_contents(__DIR__ . '/../data/historical-quests.meta.json'), true);
            if (!is_array($metadata) || ($metadata['schema_version'] ?? 0) !== 1
                || !is_int($metadata['catalogue_count'] ?? null) || $metadata['catalogue_count'] < 1
                || !preg_match('/^[a-f0-9]{64}$/D', (string)($metadata['catalogue_sha256'] ?? ''))) {
                throw new RuntimeException('Historical catalogue metadata integrity check failed.');
            }
        }
        return $metadata;
    }

    /** Explicit CLI installation only. No page request performs this migration or activation. */
    public function installHistoricalCatalog(): array
    {
        if (PHP_SAPI !== 'cli') throw new RuntimeException('Catalogue maintenance requires the CLI.');
        $this->ensureSchemaInstalled();
        foreach ([['site_quests', 'source_domain', "VARCHAR(16) NOT NULL DEFAULT 'legacy'"],
                  ['site_quests', 'definition_json', 'MEDIUMTEXT NULL'],
                  ['site_player_quests', 'attempt_id', 'CHAR(32) NULL'],
                  ['site_player_quests', 'state_version', 'BIGINT NOT NULL DEFAULT 0']] as $column) {
            $stmt = $this->db->prepare('SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?');
            $stmt->execute([$column[0], $column[1]]);
            if ((int)$stmt->fetchColumn() === 0) $this->db->exec('ALTER TABLE `' . $column[0] . '` ADD COLUMN `' . $column[1] . '` ' . $column[2]);
        }
        $ddl = [
            "CREATE TABLE IF NOT EXISTS site_quest_features (feature_key VARCHAR(64) NOT NULL PRIMARY KEY, enabled TINYINT NOT NULL DEFAULT 0, catalogue_sha256 CHAR(64) NULL, snapshot_id CHAR(32) NULL, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS site_quest_revisions (player_id INT NOT NULL PRIMARY KEY, revision BIGINT NOT NULL DEFAULT 0, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS site_quest_claim_receipts (player_id INT NOT NULL, quest_id INT NOT NULL, attempt_id CHAR(32) NOT NULL, reward_json MEDIUMTEXT NOT NULL, claimed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(player_id,quest_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS site_quest_legacy_archive (snapshot_id CHAR(32) NOT NULL, row_kind VARCHAR(40) NOT NULL, row_key VARCHAR(128) NOT NULL, row_json MEDIUMTEXT NOT NULL, sha256 CHAR(64) NOT NULL, archived_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(snapshot_id,row_kind,row_key)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS site_player_gg_energy (player_id INT NOT NULL PRIMARY KEY, energy BIGINT UNSIGNED NOT NULL DEFAULT 0, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        ];
        foreach ($ddl as $sql) $this->db->exec($sql);
        $this->db->exec("INSERT IGNORE INTO site_quest_features (feature_key,enabled) VALUES ('historical_catalog',0)");
        $this->historicalAssertTransactional();
        $catalogue = $this->historicalCatalogue();
        $active = $this->isHistoricalEnabled();
        $insert = $this->db->prepare("INSERT INTO site_quests (code,title,description,category,min_level,source_domain,definition_json,enabled,sort_order) VALUES (:code,:title,:description,'Historical',:level,'historical',:definition,:enabled,:sort) ON DUPLICATE KEY UPDATE title=VALUES(title),description=VALUES(description),category=VALUES(category),min_level=VALUES(min_level),source_domain=VALUES(source_domain),definition_json=VALUES(definition_json),enabled=VALUES(enabled),sort_order=VALUES(sort_order)");
        $this->db->beginTransaction();
        try {
            foreach ($catalogue['quests'] as $index => $quest) {
                $levels = array_column($quest['variants'], 'minimum_level');
                $insert->execute([':code'=>$quest['code'], ':title'=>$quest['title'], ':description'=>$quest['title'], ':level'=>$levels ? min($levels) : 0,
                    ':definition'=>json_encode($quest, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR), ':enabled'=>($active && $quest['enabled']) ? 1 : 0, ':sort'=>$index]);
            }
            $stmt = $this->db->prepare("UPDATE site_quest_features SET catalogue_sha256=:sha WHERE feature_key='historical_catalog'");
            $stmt->execute([':sha'=>hash_file('sha256', __DIR__.'/../data/historical-quests.json')]);
            $this->db->commit();
        } catch (Throwable $e) { if ($this->db->inTransaction()) $this->db->rollBack(); throw $e; }
        return ['catalogue_count'=>count($catalogue['quests']), 'definitions'=>$catalogue['documentary_definitions'], 'enabled'=>$active, 'sha256'=>hash_file('sha256', __DIR__.'/../data/historical-quests.json')];
    }

    private function historicalAssertTransactional(): void
    {
        $required = ['users','player_cargo','player_inventory','site_quests','site_quest_objectives','site_player_quests','site_player_quest_objective_progress','site_quest_revisions','site_quest_claim_receipts','site_player_gg_energy','site_quest_legacy_archive','site_quest_features'];
        $stmt = $this->db->prepare('SELECT TABLE_NAME,ENGINE FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (' . implode(',',array_fill(0,count($required),'?')) . ')');
        $stmt->execute($required); $rows=$stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        foreach ($required as $table) if (strcasecmp((string)($rows[$table]??''),'InnoDB')!==0) throw new RuntimeException('Historical quests require InnoDB: '.$table.'. Convert manually after backup.');
    }

    /** Archive all legacy rows first, verify each receipt, then switch only this database. */
    public function activateHistoricalCatalog(): array
    {
        if (PHP_SAPI!=='cli') throw new RuntimeException('Catalogue activation requires the CLI.');
        $this->installHistoricalCatalog();
        if ($this->isHistoricalEnabled()) throw new RuntimeException('Historical catalogue already active.');
        $this->syncBasicQuestCatalog(); $this->syncPvpQuestCatalog(); $this->syncHavokQuestCatalog();
        $legacy = $this->db->query("SELECT * FROM site_quests WHERE source_domain='legacy' AND category IN ('Starter','Ore Collection','NPC Hunt','PVP') ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
        if (count($legacy)!==69) throw new RuntimeException('Expected exactly 62 Basic and 7 PvP definitions before activation; found '.count($legacy).'.');
        $ids=array_column($legacy,'id');$in=implode(',',array_map('intval',$ids));$snapshot=bin2hex(random_bytes(16));$counts=[];
        $datasets=['site_quests'=>$legacy];
        foreach (['site_quest_objectives','site_player_quests','site_player_quest_objective_progress'] as $table) {
            $datasets[$table]=$this->db->query('SELECT * FROM `'.$table.'` WHERE quest_id IN ('.$in.') ORDER BY quest_id')->fetchAll(PDO::FETCH_ASSOC);
        }
        $this->db->beginTransaction();
        try {
            $lock=$this->db->query("SELECT enabled FROM site_quest_features WHERE feature_key='historical_catalog' FOR UPDATE");
            if ((int)$lock->fetchColumn()===1) throw new RuntimeException('Activation was already completed concurrently.');
            $archive=$this->db->prepare('INSERT INTO site_quest_legacy_archive(snapshot_id,row_kind,row_key,row_json,sha256) VALUES (?,?,?,?,?)');
            foreach ($datasets as $table=>$rows) {
                $counts[$table]=count($rows);
                foreach ($rows as $row) {
                    $key=isset($row['id'])?(string)$row['id']:implode(':',[$row['player_id'],$row['quest_id'],$row['objective_type'],$row['target_key']]);
                    $json=json_encode($row,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);$archive->execute([$snapshot,$table,$key,$json,hash('sha256',$json)]);
                }
            }
            $verify=$this->db->prepare('SELECT row_kind,row_json,sha256 FROM site_quest_legacy_archive WHERE snapshot_id=?');$verify->execute([$snapshot]);$actual=[];
            foreach ($verify->fetchAll(PDO::FETCH_ASSOC) as $row) { if (!hash_equals($row['sha256'],hash('sha256',$row['row_json']))) throw new RuntimeException('Archive integrity failure.');$actual[$row['row_kind']]=($actual[$row['row_kind']]??0)+1; }
            foreach ($counts as $kind=>$count) if (($actual[$kind]??0)!==$count) throw new RuntimeException('Archive row count mismatch: '.$kind);
            $this->db->exec('UPDATE site_quests SET enabled=0 WHERE id IN ('.$in.')');
            $this->db->exec("UPDATE site_player_quests SET status='archived' WHERE quest_id IN (".$in.") AND status='in_progress'");
            $enable=$this->db->prepare("UPDATE site_quests SET enabled=? WHERE code=? AND source_domain='historical'");
            foreach ($this->historicalCatalogue()['quests'] as $quest) $enable->execute([$quest['enabled']?1:0,$quest['code']]);
            $setting=$this->db->prepare("UPDATE site_quest_features SET enabled=1,snapshot_id=? WHERE feature_key='historical_catalog'");$setting->execute([$snapshot]);
            $this->db->exec('INSERT INTO site_quest_revisions(player_id,revision) SELECT id,1 FROM users ON DUPLICATE KEY UPDATE revision=revision+1');
            $this->db->commit();$this->historicalEnabledCache=true;$this->historicalClearCache();
            $catalogue = $this->historicalCatalogue();
            return ['snapshot_id'=>$snapshot,'archived_counts'=>$counts,'definitions'=>$catalogue['documentary_definitions'],'logical_missions'=>count($catalogue['quests']),'enabled_logical_missions'=>count(array_filter($catalogue['quests'],static function($q){return$q['enabled'];})),'account_balances_modified'=>false];
        } catch (Throwable $e) {if($this->db->inTransaction())$this->db->rollBack();throw $e;}
    }

    /** Restore archived definitions/progress only. Never undo account rewards already acquired. */
    public function restoreHistoricalLegacyArchive(string $snapshot): array
    {
        if(PHP_SAPI!=='cli'||!preg_match('/^[a-f0-9]{32}$/D',$snapshot))throw new RuntimeException('A valid CLI archive receipt is required.');
        $stmt=$this->db->prepare('SELECT row_kind,row_json,sha256 FROM site_quest_legacy_archive WHERE snapshot_id=?');$stmt->execute([$snapshot]);$rows=$stmt->fetchAll(PDO::FETCH_ASSOC);
        if(!$rows)throw new RuntimeException('Archive snapshot not found.');
        $allowed=['site_quests'=>['id'],'site_quest_objectives'=>['id'],'site_player_quests'=>['id'],'site_player_quest_objective_progress'=>['player_id','quest_id','objective_type','target_key']];$counts=[];
        $this->db->beginTransaction();
        try {
            $this->db->query("SELECT enabled FROM site_quest_features WHERE feature_key='historical_catalog' FOR UPDATE")->fetchColumn();
            foreach($rows as $stored){
                $table=$stored['row_kind'];if(!isset($allowed[$table])||!hash_equals($stored['sha256'],hash('sha256',$stored['row_json'])))throw new RuntimeException('Invalid archive content.');
                $row=json_decode($stored['row_json'],true,512,JSON_THROW_ON_ERROR);$columns=array_keys($row);
                foreach($columns as $col)if(!preg_match('/^[a-zA-Z0-9_]+$/D',$col))throw new RuntimeException('Invalid archived column.');
                $set=implode(',',array_map(static function($col){return '`'.$col.'`=?';},$columns));$where=implode(' AND ',array_map(static function($col){return '`'.$col.'`=?';},$allowed[$table]));
                $update=$this->db->prepare('UPDATE `'.$table.'` SET '.$set.' WHERE '.$where);$values=array_values($row);foreach($allowed[$table]as$key)$values[]=$row[$key];$update->execute($values);$counts[$table]=($counts[$table]??0)+1;
            }
            $this->db->exec("UPDATE site_quest_features SET enabled=0 WHERE feature_key='historical_catalog'");$this->db->exec("UPDATE site_quests SET enabled=0 WHERE source_domain='historical'");$this->db->exec('UPDATE site_quest_revisions SET revision=revision+1');
            $this->db->commit();$this->historicalEnabledCache=false;$this->historicalClearCache();return ['restored_counts'=>$counts,'historical_state_preserved'=>true,'account_balances_restored'=>false];
        }catch(Throwable$e){if($this->db->inTransaction())$this->db->rollBack();throw$e;}
    }

    private function historicalClearCache(): void {$this->historicalRowsCache=null;$this->historicalPlayerCache=null;$this->historicalCompletedCache=null;$this->clearQuestReadCaches();}
    private function historicalPlayer(): array
    {
        if($this->historicalPlayerCache===null){$stmt=$this->db->prepare('SELECT id,level,factionid,experience FROM users WHERE id=? LIMIT 1');$stmt->execute([$this->playerId]);$this->historicalPlayerCache=$stmt->fetch(PDO::FETCH_ASSOC)?:[];}
        if(!$this->historicalPlayerCache)throw new RuntimeException('Player account not found.');return $this->historicalPlayerCache;
    }
    private function historicalRows(): array
    {
        if($this->historicalRowsCache!==null)return$this->historicalRowsCache;
        $stmt=$this->db->prepare("SELECT q.*,pq.status AS player_status,pq.progress_json AS player_progress_json,pq.attempt_id,pq.state_version,pq.accepted_at,pq.claimed_at FROM site_quests q LEFT JOIN site_player_quests pq ON pq.quest_id=q.id AND pq.player_id=? WHERE q.source_domain='historical' ORDER BY q.min_level,q.sort_order,q.id");$stmt->execute([$this->playerId]);return$this->historicalRowsCache=$stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    private function historicalVariant(array $definition,int $company): ?array {return$definition['variants'][(string)$company]??null;}
    private function historicalState(array $row): array {$state=json_decode((string)($row['player_progress_json']??$row['progress_json']??''),true);return is_array($state)?$state:[];}
    private function historicalBumpRevision(): void {$stmt=$this->db->prepare('INSERT INTO site_quest_revisions(player_id,revision) VALUES (?,1) ON DUPLICATE KEY UPDATE revision=revision+1');$stmt->execute([$this->playerId]);}
    private function historicalCompletedCodes(): array
    {
        if($this->historicalCompletedCache!==null)return$this->historicalCompletedCache;
        $stmt=$this->db->prepare("SELECT q.code FROM site_player_quests pq INNER JOIN site_quests q ON q.id=pq.quest_id WHERE pq.player_id=? AND pq.status='completed' AND q.source_domain='historical'");$stmt->execute([$this->playerId]);return$this->historicalCompletedCache=array_fill_keys($stmt->fetchAll(PDO::FETCH_COLUMN),true);
    }

    private function historicalAdmissionReason(array $definition,?array $variant,array $player,array $completed): ?string
    {
        if(!$variant)return(($definition['unavailable_variants'][(string)$player['factionid']]??'')==='company_restricted')?'This mission is not offered to your company.':'Mission details are not available for your company.';
        if(empty($variant['enabled']))return'This mission is not available yet.';
        if((int)$player['level']<(int)$variant['minimum_level'])return'Requires level '.(int)$variant['minimum_level'].'.';
        foreach($variant['prerequisites']??[]as$code)if(empty($completed[$code])){ $title='the preceding mission';foreach($this->historicalCatalogue()['quests']as$q)if($q['code']===$code){$title=$q['title'];break;}return'Complete '.$title.' first.'; }
        return null;
    }

    public function getHistoricalMeta(): array
    {
        // The tracker requests only this small metadata, not the full catalogue.
        $metadata = $this->historicalMetadata();
        $active=0;
        if($this->isHistoricalEnabled()) {
            if ($this->historicalRowsCache !== null) {
                foreach ($this->historicalRowsCache as $row) if (($row['player_status'] ?? '') === 'in_progress') ++$active;
            } else {
                $stmt=$this->db->prepare("SELECT COUNT(*) FROM site_player_quests pq INNER JOIN site_quests q ON q.id=pq.quest_id WHERE pq.player_id=? AND pq.status='in_progress' AND q.source_domain='historical'");$stmt->execute([$this->playerId]);$active=(int)$stmt->fetchColumn();
            }
        }
        return ['enabled'=>$this->isHistoricalEnabled(),'activeCount'=>$active,'maxActive'=>3,'company'=>(int)($this->historicalPlayerCache['factionid']??0),'category_limits'=>$metadata['category_limits'],'catalogue_count'=>$metadata['catalogue_count'],'enabled_catalogue_count'=>$metadata['enabled_catalogue_count'],'documentary_definitions'=>$metadata['documentary_definitions'],'category_counts'=>$metadata['category_counts'],'unknown_firm_variants'=>$metadata['unknown_firm_variants'],'legacy_retired'=>$this->isHistoricalEnabled()];
    }

    public function getHistoricalQuests(?string $category=null): array
    {
        if(!$this->isHistoricalEnabled())return[];
        if($category!==null&&$category!=='Normal')return[];
        $player=$this->historicalPlayer();$rows=$this->historicalRows();$completed=[];
        foreach($rows as$row)if(($row['player_status']??'')==='completed')$completed[$row['code']]=true;
        $result=[];
        foreach($rows as$row) {
            $definition = json_decode((string)$row['definition_json'], true, 512, JSON_THROW_ON_ERROR);
            $variant = $this->historicalVariant($definition, (int)$player['factionid']);
            if (!$this->historicalPresentationVisible($row, $definition, $variant, (int)$player['factionid'])) continue;
            $result[]=$this->formatHistoricalQuest($row,$player,$completed,$definition);
        }
        usort($result,static function($a,$b){$priority=['in_progress'=>0,'ready'=>0,'failed'=>1,'available'=>2,'locked'=>3,'completed'=>4];return[($priority[$a['status']]??5),(int)$a['min_level'],$a['id']]<=>[($priority[$b['status']]??5),(int)$b['min_level'],$b['id']];});return$result;
    }

    private function historicalCompanyAllowed(array $definition, ?array $variant, int $company): bool
    {
        if (!in_array($company, [1, 2, 3], true) || $variant === null) return false;
        if (($definition['unavailable_variants'][(string)$company] ?? '') === 'company_restricted') return false;
        if (isset($definition['eligible_companies_policy'])) {
            $allowed = array_map('intval', (array)$definition['eligible_companies_policy']);
            if (!in_array($company, $allowed, true)) return false;
        }
        return true;
    }

    private function historicalPresentationVisible(array $row, array $definition, ?array $variant, int $company): bool
    {
        // A disabled mechanism is a documentary reserve, not a player unlock.
        // Filtering is read-only and never removes an old attempt or reward receipt.
        return $this->historicalCompanyAllowed($definition, $variant, $company)
            && !empty($definition['enabled']) && !empty($variant['enabled']) && (int)($row['enabled'] ?? 0) === 1;
    }

    private function formatHistoricalQuest(array $row,array $player,array $completed,?array $definition=null): array
    {
        $definition=$definition??json_decode((string)$row['definition_json'],true,512,JSON_THROW_ON_ERROR);$variant=$this->historicalVariant($definition,(int)$player['factionid']);$state=$this->historicalState($row);
        $reason=$this->historicalAdmissionReason($definition,$variant,$player,$completed);$status=(string)($row['player_status']??'');
        if($status==='completed')$display='completed';elseif($status==='in_progress')$display=!empty($state['failed_reason'])?'failed':(!empty($state['completed'])?'ready':'in_progress');else$display=$reason===null?'available':'locked';
        if($status==='in_progress'&&isset($state['variant_company'])&&(int)$state['variant_company']!==(int)$player['factionid']){$reason='Your company changed during this mission. Abort before accepting its correct variant.';$display='failed';}
        $objectives=$variant?$this->historicalFlatten($variant['ast'],$state,0,null,true,[],(int)$player['factionid']):[];$rewards=$variant['rewards']??['experience'=>null,'credits'=>null,'uridium'=>null,'honor'=>null,'items'=>[]];$items=[];
        $globalConditions=$variant?$this->historicalConstraintLabels($variant['constraints']):[];
        foreach($objectives as&$objective)$objective['conditions']=array_values(array_diff($objective['conditions']??[],$globalConditions));unset($objective);
        foreach($rewards['items']??[]as$item)$items[]=['key'=>$item['key'],'label'=>$item['label'],'quantity'=>$item['quantity'],'amount'=>$item['quantity']];
        return ['id'=>(int)$row['id'],'code'=>$row['code'],'title'=>$definition['title'],'description'=>$variant?$this->historicalDescription($variant):'Historical company variant unavailable; no objectives or rewards have been substituted.',
            'category'=>'Historical','historical_category'=>$definition['category'],'group'=>'historical','min_level'=>$variant['minimum_level']??null,'level_unknown'=>$variant===null,'status'=>$display,'available'=>$reason===null,'locked_reason'=>$reason,
            'can_accept'=>$display==='available','can_claim'=>$display==='ready'&&$reason===null,'is_complete'=>$display==='ready'||$display==='completed','objectives'=>$objectives,
            'presentation_visible'=>$this->historicalPresentationVisible($row,$definition,$variant,(int)$player['factionid']),
            'company_allowed'=>$this->historicalCompanyAllowed($definition,$variant,(int)$player['factionid']),
            'technical_available'=>!empty($definition['enabled'])&&!empty($variant['enabled'])&&(int)($row['enabled']??0)===1,
            'admission_lock_kind'=>$reason===null?'none':(!$variant?'company':(empty($variant['enabled'])?'technical':((int)$player['level']<(int)$variant['minimum_level']?'level':'prerequisite'))),
            'adaptation_notice'=>(string)($variant['historical_qualification']['position_tolerance_adaptation']['notice']??''),
            'objective_mode_label'=>$variant?HistoricalQuestLabels::mode($variant['ast']):'','objective_structure_label'=>$variant?HistoricalQuestLabels::mode($variant['ast']):'',
            'reward_experience'=>$rewards['experience'],'reward_credits'=>$rewards['credits'],'reward_uridium'=>$rewards['uridium'],'reward_honor'=>$rewards['honor'],
            'reward_ucb100'=>0,'reward_rsb75'=>0,'reward_seprom'=>0,'reward_item_id'=>0,'reward_item_qty'=>0,'reward_items'=>$items,'rewards'=>$rewards,
            'eligible_companies'=>array_map(static function($f){return[1=>'MMO',2=>'EIC',3=>'VRU'][(int)$f];},$definition['eligible_companies_policy']??array_keys($definition['variants'])),'company_scope_complete'=>!in_array('historical_company_objective_or_reward_payload_not_recovered',$definition['unavailable_variants']??[],true),'prerequisites'=>$variant['prerequisites']??[],
            'completion_percent'=>in_array($display,['ready','completed'],true)?100:$this->historicalPercent($objectives),'progress_summary'=>in_array($display,['ready','completed'],true)?'Complete':$this->historicalSummary($objectives),'source_family'=>$definition['family_id'],'source_definition'=>$variant['documentary_group_id']??null,
            'attempt_id'=>(string)($row['attempt_id']??$state['attempt_id']??''),'definition_sha256'=>(string)($variant['definition_sha256']??''),'failed_reason'=>$state['failed_reason']??null,'failed_label'=>HistoricalQuestLabels::failure($state['failed_reason']??''),'runtime_reason_labels'=>in_array($display,['in_progress','ready','failed'],true)?HistoricalQuestLabels::runtimeReasons():[],'state_version'=>(int)($row['state_version']??0),'constraint_labels'=>$variant?$this->historicalConstraintLabels($variant['constraints']):[],'scoring_labels'=>$variant?$this->historicalScoringLabels($variant['scoring']??[]):[],'score_lines'=>$variant?HistoricalQuestLabels::scoreLines($variant['scoring']??[],$state):[]];
    }

    private function historicalDescription(array $variant): string
    {
        // The catalogue contains objectives and rules, not recovered narrative text.
        // Do not manufacture a repeated generic description above the real objectives.
        return '';
    }
    private function historicalScoringLabels(array $components): array { return HistoricalQuestLabels::scoring($components); }
    private function historicalConstraintLabels(array $constraints): array { return HistoricalQuestLabels::constraints($constraints); }
    private function historicalFlatten(array $node,array $state,int $depth=0,?int $stage=null,bool $active=true,array $context=[],int $company=0): array
    {
        if(($node['op']??'leaf')==='leaf') {
            $required=(float)$node['quantity'];$current=max(0,min($required,(float)($state['nodes'][$node['id']]??0)));
            $presentation=HistoricalQuestLabels::leaf($node,$company,$current);
            $presentation['label']=($context?implode(' · ',$context).' — ':'').$presentation['label'];
            return [array_merge(['id'=>$node['id'],'type'=>$node['action'],'target_key'=>$this->historicalDisplayValue($node['target']??($node['targets']??'')),
                'current'=>$current,'current_amount'=>$current,'required'=>$required,'required_amount'=>$required,
                'percent'=>$required>0?min(100,100*$current/$required):0,'complete'=>$current>=$required,'is_complete'=>$current>=$required,
                'depth'=>$depth,'stage'=>$stage,'active'=>$active,'score'=>false],$presentation)];
        }
        $result=[];$sequence=true;
        foreach($node['children']??[]as$i=>$child) {
            $childActive=$active&&($node['op']!=='sequence'||$sequence);$path=$context;
            if($node['op']==='sequence')$path[]='Step '.($i+1);
            elseif(in_array($node['op'],['or','n_of_m'],true))$path[]='Alternative '.($i+1);
            $result=array_merge($result,$this->historicalFlatten($child,$state,$depth+1,$node['op']==='sequence'?$i+1:$stage,$childActive,$path,$company));
            if($node['op']==='sequence'&&!self::historicalAstComplete($child,$state))$sequence=false;
        }
        return $result;
    }
    private function historicalDisplayValue($value): string {if(is_array($value))return implode(' / ',array_map(function($v){return$this->historicalDisplayValue($v);},$value));return is_scalar($value)?(string)$value:'';}
    private function historicalObjectiveLabel(array $node,int $company=0): string { return HistoricalQuestLabels::leaf($node,$company)['label']; }
    public static function historicalAstComplete(array $node,array $state): bool
    {
        $op=$node['op']??null;if($op==='leaf'){$required=$node['quantity']??null;if(!isset($node['id'])||!is_numeric($required)||!is_finite((float)$required)||(float)$required<=0)return false;$value=$state['nodes'][$node['id']]??0;return is_numeric($value)&&is_finite((float)$value)&&(float)$value>=(float)$required;}
        if(!in_array($op,['and','or','sequence','n_of_m'],true))return false;$children=$node['children']??[];if(!is_array($children)||!$children)return false;$done=0;foreach($children as$child){if(!is_array($child))return false;if(self::historicalAstComplete($child,$state))++$done;}
        if($op==='or')return$done>0;if($op==='n_of_m'){$required=$node['required_children']??null;return is_int($required)&&$required>=1&&$required<=count($children)&&$done>=$required;}return$done===count($children);
    }
    private function historicalPercent(array $objectives): float {if(!$objectives)return 0;return round(array_sum(array_column($objectives,'percent'))/count($objectives),1);}
    private function historicalSummary(array $objectives): string {$done=0;foreach($objectives as$o)if($o['complete'])++$done;return$done.'/'.count($objectives).' objectives';}
    public function getHistoricalTrackerQuests(): array
    {
        if(!$this->isHistoricalEnabled())return[];
        $stmt=$this->db->prepare("SELECT q.*,pq.status AS player_status,pq.progress_json AS player_progress_json,pq.attempt_id,pq.state_version,pq.accepted_at,pq.claimed_at FROM site_player_quests pq INNER JOIN site_quests q ON q.id=pq.quest_id WHERE pq.player_id=? AND pq.status='in_progress' AND q.source_domain='historical' AND q.enabled=1 ORDER BY pq.accepted_at,q.id");$stmt->execute([$this->playerId]);$result=[];$player=$this->historicalPlayer();$done=$this->historicalCompletedCodes();foreach($stmt->fetchAll(PDO::FETCH_ASSOC)as$row)$result[]=$this->formatHistoricalQuest($row,$player,$done);return$result;
    }

    public function acceptHistoricalQuest(string $code): string
    {
        if(!$this->isHistoricalEnabled())throw new RuntimeException('Historical missions are not active.');
        $this->db->beginTransaction();
        try {
            $user=$this->db->prepare('SELECT id,level,factionid,experience FROM users WHERE id=? LIMIT 1 FOR UPDATE');$user->execute([$this->playerId]);$player=$user->fetch(PDO::FETCH_ASSOC);if(!$player)throw new RuntimeException('Player account not found.');
            $q=$this->db->prepare("SELECT * FROM site_quests WHERE code=? AND source_domain='historical' LIMIT 1");$q->execute([$code]);$quest=$q->fetch(PDO::FETCH_ASSOC);if(!$quest)throw new RuntimeException('Historical mission not found.');
            $definition=json_decode($quest['definition_json'],true,512,JSON_THROW_ON_ERROR);$variant=$this->historicalVariant($definition,(int)$player['factionid']);
            $prior=$this->db->prepare('SELECT * FROM site_player_quests WHERE player_id=? AND quest_id=? FOR UPDATE');$prior->execute([$this->playerId,$quest['id']]);$existing=$prior->fetch(PDO::FETCH_ASSOC);
            if($existing&&in_array($existing['status'],['in_progress','completed'],true))throw new RuntimeException($existing['status']==='completed'?'This mission was already completed.':'This mission is already active.');
            $done=$this->db->prepare("SELECT q.code FROM site_player_quests pq INNER JOIN site_quests q ON q.id=pq.quest_id WHERE pq.player_id=? AND pq.status='completed' AND q.source_domain='historical'");$done->execute([$this->playerId]);$completed=array_fill_keys($done->fetchAll(PDO::FETCH_COLUMN),true);
            $reason=$this->historicalAdmissionReason($definition,$variant,$player,$completed);if($reason!==null)throw new RuntimeException($reason);if(!(int)$quest['enabled'])throw new RuntimeException('This historical mission is disabled.');
            $count=$this->db->prepare("SELECT COUNT(*) FROM site_player_quests pq INNER JOIN site_quests q ON q.id=pq.quest_id WHERE pq.player_id=? AND pq.status='in_progress' AND q.source_domain='historical'");$count->execute([$this->playerId]);if((int)$count->fetchColumn()>=3)throw new RuntimeException('You can have three Normal historical missions active at the same time.');
            $attempt=bin2hex(random_bytes(16));$now=(int)floor(microtime(true)*1000);$state=['schema_version'=>1,'attempt_id'=>$attempt,'variant_company'=>(int)$player['factionid'],'definition_sha256'=>$variant['definition_sha256'],'nodes'=>new stdClass(),'sequence'=>new stdClass(),'node_started_at_unix'=>new stdClass(),'started_at_unix'=>$now,'last_server_unix_ms'=>null,'online_elapsed_ms'=>0,'epoch'=>bin2hex(random_bytes(8)),'deaths'=>0,'damage_received'=>0,'failed_reason'=>null,'completed'=>false];
            $insert=$this->db->prepare("INSERT INTO site_player_quests(player_id,quest_id,status,baseline_json,progress_json,attempt_id,state_version,accepted_at,claimed_at) VALUES (?,?,'in_progress',NULL,?,?,0,NOW(),NULL) ON DUPLICATE KEY UPDATE status='in_progress',baseline_json=NULL,progress_json=VALUES(progress_json),attempt_id=VALUES(attempt_id),state_version=state_version+1,accepted_at=NOW(),claimed_at=NULL");$insert->execute([$this->playerId,$quest['id'],json_encode($state,JSON_THROW_ON_ERROR),$attempt]);
            $this->historicalBumpRevision();$this->db->commit();$this->historicalClearCache();return'Mission accepted.';
        }catch(Throwable$e){if($this->db->inTransaction())$this->db->rollBack();throw$e;}
    }

    public function abortHistoricalQuest(string $code): string
    {
        if(!$this->isHistoricalEnabled())throw new RuntimeException('Historical missions are not active.');$this->db->beginTransaction();
        try{$stmt=$this->db->prepare("SELECT pq.quest_id,pq.status FROM site_player_quests pq INNER JOIN site_quests q ON q.id=pq.quest_id WHERE pq.player_id=? AND q.code=? AND q.source_domain='historical' FOR UPDATE");$stmt->execute([$this->playerId,$code]);$row=$stmt->fetch(PDO::FETCH_ASSOC);if(!$row||$row['status']!=='in_progress')throw new RuntimeException('This mission is not active.');
            $update=$this->db->prepare("UPDATE site_player_quests SET status='aborted',state_version=state_version+1 WHERE player_id=? AND quest_id=? AND status='in_progress'");$update->execute([$this->playerId,$row['quest_id']]);$this->historicalBumpRevision();$this->db->commit();$this->historicalClearCache();return'Mission aborted.';
        }catch(Throwable$e){if($this->db->inTransaction())$this->db->rollBack();throw$e;}
    }

    public function claimHistoricalQuest(string $code): string
    {
        if(!$this->isHistoricalEnabled())throw new RuntimeException('Historical missions are not active.');$this->historicalAssertTransactional();$this->db->beginTransaction();
        try{
            // Same player-row-first lock order as acceptance and other balance mutations.
            $user=$this->db->prepare('SELECT id,experience,factionid FROM users WHERE id=? LIMIT 1 FOR UPDATE');$user->execute([$this->playerId]);$player=$user->fetch(PDO::FETCH_ASSOC);if(!$player)throw new RuntimeException('Player account not found.');
            $stmt=$this->db->prepare("SELECT q.id,q.definition_json,q.enabled,pq.status,pq.progress_json,pq.attempt_id,pq.state_version FROM site_quests q INNER JOIN site_player_quests pq ON pq.quest_id=q.id AND pq.player_id=? WHERE q.code=? AND q.source_domain='historical' LIMIT 1 FOR UPDATE");$stmt->execute([$this->playerId,$code]);$row=$stmt->fetch(PDO::FETCH_ASSOC);
            if(!$row||$row['status']!=='in_progress')throw new RuntimeException('This mission is not active or was already claimed.');
            $definition=json_decode($row['definition_json'],true,512,JSON_THROW_ON_ERROR);$state=$this->historicalState($row);$variant=$this->historicalVariant($definition,(int)($state['variant_company']??0));
            if(!$variant||empty($variant['enabled'])||!(int)$row['enabled']||(int)$state['variant_company']!==(int)$player['factionid'])throw new RuntimeException('The active company variant is unavailable.');
            if(!hash_equals((string)$variant['definition_sha256'],(string)($state['definition_sha256']??'')))throw new RuntimeException('Mission definition changed. Abort and accept its current version.');
            if(!hash_equals((string)$row['attempt_id'],(string)($state['attempt_id']??''))||!empty($state['failed_reason'])||empty($state['completed'])||!self::historicalAstComplete($variant['ast'],$state))throw new RuntimeException('Mission objectives are not complete.');
            $rewards=$variant['rewards'];$receipt=$this->db->prepare('INSERT INTO site_quest_claim_receipts(player_id,quest_id,attempt_id,reward_json) VALUES (?,?,?,?)');$receipt->execute([$this->playerId,$row['id'],$row['attempt_id'],json_encode($rewards,JSON_THROW_ON_ERROR)]);
            $this->historicalGrantRewards($rewards,(int)$player['experience']);
            $update=$this->db->prepare("UPDATE site_player_quests SET status='completed',claimed_at=NOW(),state_version=state_version+1 WHERE player_id=? AND quest_id=? AND status='in_progress' AND attempt_id=? AND state_version=?");$update->execute([$this->playerId,$row['id'],$row['attempt_id'],$row['state_version']]);if($update->rowCount()!==1)throw new RuntimeException('Mission state changed before the reward was applied.');
            $this->historicalBumpRevision();$this->db->commit();$this->historicalClearCache();return'Mission reward claimed.';
        }catch(Throwable$e){if($this->db->inTransaction())$this->db->rollBack();throw$e;}
    }

    private function historicalGrantRewards(array $rewards,int $experience): void
    {
        $amount=static function($value):int{if($value===null)return 0;if(!is_numeric($value)||$value<0||floor($value)!=$value)throw new RuntimeException('Invalid historical reward amount.');return(int)$value;};
        $xp=$amount($rewards['experience']);$level=self::getLevelFromExperience($experience+$xp);$fields=['credits'=>$amount($rewards['credits']),'uridium'=>$amount($rewards['uridium']),'experience'=>$xp,'honor'=>$amount($rewards['honor'])];
        $ammo=['ammo_lcb10','ammo_mcb25','ammo_mcb50','ammo_ucb100','ammo_rsb75','ammo_plt2021','ammo_plt2026','ammo_plt3030','ammo_r310','ammo_emp01'];
        $cargo=['prometium','endurium','terbium','prometid','duranium','promerium','seprom','xenomit'];$cargoRewards=[];$inventory=[];$free=0;
        foreach($rewards['items']??[]as$item){$qty=$amount($item['quantity']??null);$grant=(string)($item['grant_key']??'');if(in_array($grant,$ammo,true))$fields[$grant]=($fields[$grant]??0)+$qty;
            elseif(in_array($grant,$cargo,true))$cargoRewards[$grant]=($cargoRewards[$grant]??0)+$qty;
            elseif($grant==='gg_extra_energy')$free+=$qty;
            elseif(isset($item['inventory_item_id']))$inventory[]=[(int)$item['inventory_item_id'],$qty];
            elseif($qty>0)throw new RuntimeException('Historical reward grant is not connected: '.$grant);}
        $set=[];$values=[];foreach($fields as$field=>$qty){$set[]='`'.$field.'`=`'.$field.'`+?';$values[]=$qty;}$set[]='level=?';$values[]=$level;$set[]='canBeginner=?';$values[]=BeginnerStatusService::isBeginnerLevel($level)?1:0;$values[]=$this->playerId;
        $update=$this->db->prepare('UPDATE users SET '.implode(',',$set).' WHERE id=?');$update->execute($values);
        if($cargoRewards){$stmt=$this->db->prepare('SELECT id FROM player_cargo WHERE id=? FOR UPDATE');$stmt->execute([$this->playerId]);if(!$stmt->fetchColumn())throw new RuntimeException('Cargo row missing; reward transaction cancelled.');$sets=[];$vals=[];foreach($cargoRewards as$key=>$qty){$sets[]='`'.$key.'`=`'.$key.'`+?';$vals[]=$qty;}$vals[]=$this->playerId;$stmt=$this->db->prepare('UPDATE player_cargo SET '.implode(',',$sets).' WHERE id=?');$stmt->execute($vals);}
        foreach($inventory as$grant)$this->grantInventoryItem($grant[0],$grant[1]);
        if($free>0){$stmt=$this->db->prepare('INSERT INTO site_player_gg_energy(player_id,energy) VALUES (?,?) ON DUPLICATE KEY UPDATE energy=energy+VALUES(energy)');$stmt->execute([$this->playerId,$free]);}
    }
}
