<?php
declare(strict_types=1);

/** Offline absolute H1 reward update; no runtime multiplier or automatic install. */
final class WeeklyRewardMigration
{
    public static function definition(): array
    {
        $path=dirname(__DIR__).'/data/weekly-rewards-andromeda.json';
        $value=json_decode((string)file_get_contents($path),true,512,JSON_THROW_ON_ERROR);
        $fields=['reward_uridium','reward_experience','reward_honor','reward_ucb100','reward_rsb75','reward_seprom'];
        if(($value['version']??'')!=='andromeda-weekly-rewards-div5-v1'||($value['reward_fields']??[])!==$fields||count($value['missions']??[])!==15)throw new RuntimeException('Unexpected absolute Weekly reward definitions.');
        $codes=[];$groups=['A'=>0,'B'=>0,'C'=>0];
        foreach($value['missions']as$row){
            if(!is_string($row['code']??null)||isset($codes[$row['code']])||!isset($groups[$row['rotation_group']??''])
                ||array_keys($row['before']??[])!==$fields||array_keys($row['after']??[])!==$fields)throw new RuntimeException('Malformed or duplicate Weekly reward definition.');
            foreach($fields as$field){$old=$row['before'][$field];$new=$row['after'][$field];if(!is_int($old)||!is_int($new)||$old<0||$new<0||$new!==intdiv($old+2,5))throw new RuntimeException('Reward values do not match the individual nearest-integer divide-by-five rule.');}
            $codes[$row['code']]=true;++$groups[$row['rotation_group']];
        }
        if($groups!==['A'=>5,'B'=>5,'C'=>5])throw new RuntimeException('Exactly five Weekly missions per group are required.');
        $value['file_sha256']=hash_file('sha256',$path);return$value;
    }

    private static function rows(PDO$db,string$sql,array$parameters=[]):array
    {
        $statement=$db->prepare($sql);$statement->execute($parameters);return$statement->fetchAll(PDO::FETCH_ASSOC);
    }

    public static function inspect(PDO$db,bool$locked=false):array
    {
        if($locked&&!$db->inTransaction())throw new RuntimeException('A maintenance transaction is required.');
        $definition=self::definition();$fields=$definition['reward_fields'];$suffix=$locked?' FOR UPDATE':'';
        $columns=self::rows($db,"SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='site_weekly_missions' AND LEFT(COLUMN_NAME,7)='reward_' ORDER BY ORDINAL_POSITION");
        if(array_column($columns,'COLUMN_NAME')!==$fields)throw new RuntimeException('Unexpected Weekly reward columns; review every quantitative reward before applying.');
        $engines=self::rows($db,"SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('site_weekly_missions','site_weekly_mission_objectives','site_player_weekly_missions','site_player_weekly_mission_progress') ORDER BY TABLE_NAME");
        if(count($engines)!==4||array_filter($engines,static fn(array$r):bool=>strcasecmp((string)$r['ENGINE'],'InnoDB')!==0))throw new RuntimeException('Existing Weekly tables must already use InnoDB.');
        $missions=self::rows($db,'SELECT * FROM site_weekly_missions ORDER BY id'.$suffix);
        if(count($missions)!==15)throw new RuntimeException('Exactly the fifteen existing Weekly missions are required.');
        $expected=[];foreach($definition['missions']as$row)$expected[$row['code']]=$row;
        $updates=[];$details=[];$totals=['A'=>array_fill_keys($fields,0),'B'=>array_fill_keys($fields,0),'C'=>array_fill_keys($fields,0)];
        foreach($missions as$row){
            $target=$expected[(string)$row['code']]??null;
            if(!$target||(int)$row['id']!==(int)$target['id']||(string)$row['rotation_group']!==$target['rotation_group']||(int)$row['slot']!==(int)$target['slot']||(int)$row['enabled']!==1)throw new RuntimeException('Weekly identity, rotation, slot or availability differs from the approved reference.');
            $current=[];foreach($fields as$field)$current[$field]=(int)$row[$field];
            if($current!==$target['before']&&$current!==$target['after'])throw new RuntimeException('Existing Weekly rewards are neither the approved H1 values nor the approved final values. No relative division is attempted.');
            $needs=$current===$target['before'];if($needs)$updates[]=['id'=>(int)$row['id'],'code'=>$row['code'],'before'=>$current,'after'=>$target['after']];
            $details[]=['code'=>$row['code'],'group'=>$row['rotation_group'],'state'=>$needs?'original_H1':'already_updated','before'=>$target['before'],'after'=>$target['after']];
            foreach($fields as$field)$totals[$row['rotation_group']][$field]+=$target['after'][$field];
            unset($expected[(string)$row['code']]);
        }
        if($expected)throw new RuntimeException('A reference Weekly mission is missing.');
        return['summary'=>['definition_sha256'=>$definition['file_sha256'],'missions'=>15,'missions_to_update'=>count($updates),'already_updated'=>15-count($updates),'reward_fields'=>$fields,'new_totals_per_group'=>$totals,'credits_present'=>false,'schema_changes'=>0,'progress_changes'=>0,'claims_changed'=>0,'rounding'=>'intdiv(original + 2, 5), independently per positive integer reward','missions_detail'=>$details],
            'updates'=>$updates,'snapshot'=>['missions'=>$missions,
                'objectives'=>self::rows($db,'SELECT * FROM site_weekly_mission_objectives ORDER BY id'.$suffix),
                'attempts'=>self::rows($db,'SELECT * FROM site_player_weekly_missions ORDER BY player_id,mission_id,week_key'.$suffix),
                'progress'=>self::rows($db,'SELECT * FROM site_player_weekly_mission_progress ORDER BY player_id,mission_id,week_key,objective_type,target_key'.$suffix)]];
    }

    public static function apply(PDO$db,callable$archiveBeforeWrite):array
    {
        if($db->inTransaction())throw new RuntimeException('Nested maintenance transactions are refused.');
        $db->beginTransaction();
        try{
            $before=self::inspect($db,true);$archiveBeforeWrite($before);$fields=$before['summary']['reward_fields'];
            foreach($before['updates']as$update){
                $set=implode(',',array_map(static fn(string$f):string=>'`'.$f.'`=?',$fields));
                $where=implode(' AND ',array_map(static fn(string$f):string=>'`'.$f.'`=?',$fields));
                $statement=$db->prepare('UPDATE site_weekly_missions SET '.$set.',updated_at=updated_at WHERE id=? AND code=? AND '.$where);
                $statement->execute(array_merge(array_values($update['after']),[$update['id'],$update['code']],array_values($update['before'])));
                if($statement->rowCount()!==1)throw new RuntimeException('A locked Weekly reward row changed unexpectedly.');
            }
            $after=self::inspect($db,true);$expected=$before['snapshot'];$byId=[];foreach($before['updates']as$update)$byId[$update['id']]=$update['after'];
            foreach($expected['missions']as&$mission)if(isset($byId[(int)$mission['id']]))foreach($byId[(int)$mission['id']]as$field=>$value)$mission[$field]=is_string($mission[$field])?(string)$value:$value;
            unset($mission);
            if($expected!==$after['snapshot'])throw new RuntimeException('Unexpected objective, progression, claim or definition change; the transaction has been rolled back.');
            if($after['summary']['missions_to_update']!==0)throw new RuntimeException('Not all approved absolute rewards were applied.');
            $db->commit();return['status'=>'WEEKLY_REWARDS_MAINTENANCE_COMPLETED','missions_updated'=>count($before['updates']),'already_applied'=>count($before['updates'])===0,'progress_amounts_changed'=>0,'claims_changed'=>0,'objectives_changed'=>0,'schema_changes'=>0,'summary'=>$after['summary']];
        }catch(Throwable$error){if($db->inTransaction())$db->rollBack();throw$error;}
    }
}
