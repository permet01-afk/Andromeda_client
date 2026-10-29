<?php
/** Manual existing-H1 data fix; no schema installation and no automatic execution. */
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
ini_set('display_errors','0');
if (count($argv) === 2 && $argv[1] === '--help') {
    echo "Weekly absolute rewards data maintenance (read-only dry-run by default)\n"
        . "--expect-db=DATABASE --expect-port=PORT --expect-rewards-sha256=SHA256\n"
        . "Writes require --execute --maintenance-confirmed --receipt-dir=ABSOLUTE_DIRECTORY_OUTSIDE_HTDOCS\n"
        . "Stop the emulator and HTTP quest mutations; verify a full backup first.\n"
        . "The tool installs approved absolute reward values once; it never divides a current value repeatedly or resets a claim.\n";
    exit;
}
require_once dirname(__DIR__).'/libs/WeeklyRewardMigration.php';
function weeklyRewardReceipt(string $directory,array $value): string
{
    $path=$directory.DIRECTORY_SEPARATOR.'weekly-rewards-'.gmdate('Ymd-His').'-'.bin2hex(random_bytes(6)).'.json';
    $handle=fopen($path,'x');if($handle===false)throw new RuntimeException('Cannot create an exclusive external receipt.');
    try {
        $data=json_encode($value,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR)."\n";
        $offset=0;while($offset<strlen($data)){$written=fwrite($handle,substr($data,$offset));if($written===false||$written===0)throw new RuntimeException('Cannot write a complete receipt.');$offset+=$written;}
        if(!fflush($handle))throw new RuntimeException('Cannot flush the external receipt.');
    } finally {fclose($handle);}
    return $path;
}
$db=null;$locked=false;$beforeReceipt=null;
try {
    $options=[];
    foreach(array_slice($argv,1)as$argument){
        if(!preg_match('/^--([a-z][a-z0-9-]*)(?:=(.*))?$/D',$argument,$match)
            || !in_array($match[1],['expect-db','expect-port','expect-rewards-sha256','execute','maintenance-confirmed','receipt-dir'],true)
            || isset($options[$match[1]]))throw new RuntimeException('Unknown, duplicate or malformed maintenance option.');
        $options[$match[1]]=$match[2]??true;
    }
    if(!preg_match('/^[A-Za-z0-9_]+$/D',(string)($options['expect-db']??''))
        || !preg_match('/^[0-9]{1,5}$/D',(string)($options['expect-port']??''))
        || (int)$options['expect-port']<1 || (int)$options['expect-port']>65535)throw new RuntimeException('An explicit expected database and port are required.');
    foreach(['execute','maintenance-confirmed']as$flag)if(isset($options[$flag])&&$options[$flag]!==true)throw new RuntimeException('Confirmation flags do not accept values.');
    $rewardDefinition=WeeklyRewardMigration::definition();
    if(!preg_match('/^[a-f0-9]{64}$/D',(string)($options['expect-rewards-sha256']??''))||!hash_equals($rewardDefinition['file_sha256'],$options['expect-rewards-sha256']))throw new RuntimeException('The approved absolute reward definition SHA-256 is required.');
    $webRoot=realpath(dirname(__DIR__));if(!$webRoot)throw new RuntimeException('Application root missing.');
    require $webRoot.'/config/database.php';
    if(DB_TYPE!=='mysql'||!preg_match('/^([A-Za-z0-9_.:-]+)(?:;port=([0-9]+))?$/D',DB_HOST,$host))throw new RuntimeException('Unsupported configured SQL endpoint.');
    $port=isset($host[2])?(int)$host[2]:(defined('DB_PORT')?(int)DB_PORT:3306);
    if(DB_NAME!==$options['expect-db']||$port!==(int)$options['expect-port'])throw new RuntimeException('Configured SQL endpoint differs from the explicit expectation.');
    $db=new PDO('mysql:host='.$host[1].';port='.$port.';dbname='.DB_NAME.';charset=utf8mb4',DB_USER,DB_PASS,
        [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::MYSQL_ATTR_MULTI_STATEMENTS=>false]);
    $db->exec('SET SESSION TRANSACTION READ ONLY');$db->beginTransaction();
    $identity=$db->query('SELECT @@port AS port,DATABASE() AS db,VERSION() AS version')->fetch();
    if((int)$identity['port']!==(int)$options['expect-port']||$identity['db']!==$options['expect-db'])throw new RuntimeException('Actual SQL endpoint differs from the explicit expectation.');
    $plan=WeeklyRewardMigration::inspect($db);
    $online=(int)$db->query('SELECT COUNT(*) FROM users WHERE online<>0')->fetchColumn();
    $db->rollBack();
    if(!isset($options['execute'])){
        echo json_encode(['status'=>'DRY_RUN_READ_ONLY','SQL_mutations'=>0,'database'=>$identity['db'],'port'=>(int)$identity['port'],
            'summary'=>$plan['summary'],'online_accounts'=>$online],JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR)."\n";exit;
    }
    if(!isset($options['maintenance-confirmed'])||$online!==0)throw new RuntimeException('Stop gameplay/HTTP mutations, verify backups, and confirm maintenance before writing.');
    $argument=$options['receipt-dir']??null;
    if(!is_string($argument)||!preg_match('~^(?:[A-Za-z]:[\\\\/]|/(?!/))~',$argument))throw new RuntimeException('An absolute external receipt directory is required.');
    $directory=realpath($argument);$norm=static fn(string$p):string=>strtolower(rtrim(str_replace('\\','/',$p),'/'));
    if(!$directory||!is_writable($directory)||$norm($directory)===$norm($webRoot)||str_starts_with($norm($directory),$norm($webRoot).'/'))throw new RuntimeException('The receipt directory must be writable and outside htdocs.');
    $db->exec('SET SESSION TRANSACTION READ WRITE');
    $locked=(int)$db->query("SELECT GET_LOCK('andromeda.weekly-rewards.maintenance',0)")->fetchColumn()===1;
    if(!$locked)throw new RuntimeException('Another Weekly reward maintenance holds the lock.');
    if((int)$db->query('SELECT COUNT(*) FROM users WHERE online<>0')->fetchColumn()!==0)throw new RuntimeException('An account connected during maintenance preflight.');
    $result=WeeklyRewardMigration::apply($db,static function(array$snapshot)use($directory,$identity,&$beforeReceipt):void{
        $beforeReceipt=weeklyRewardReceipt($directory,['status'=>'LOCKED_BACKUP_BEFORE_WRITE','utc'=>gmdate('c'),'database'=>$identity['db'],'port'=>(int)$identity['port'],'data'=>$snapshot]);
    });
    $receipt=weeklyRewardReceipt($directory,['status'=>'MAINTENANCE_COMPLETED','utc'=>gmdate('c'),'result'=>$result,'before_receipt'=>$beforeReceipt]);
    echo json_encode(['status'=>'MAINTENANCE_COMPLETED','result'=>$result,'before_receipt'=>$beforeReceipt,'receipt'=>$receipt],JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR)."\n";
}catch(Throwable$error){
    if($db instanceof PDO&&$db->inTransaction())$db->rollBack();
    $reason=$error instanceof PDOException?'SQL operation failed; SQLSTATE '.$error->getCode().'. Inspect the local server without disclosing credentials.':$error->getMessage();
    fwrite(STDERR,json_encode(['status'=>'REFUSED_OR_FAILED','reason'=>$reason,'before_receipt'=>$beforeReceipt],JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR)."\n");exit(1);
}finally{
    if($locked&&$db instanceof PDO)$db->query("SELECT RELEASE_LOCK('andromeda.weekly-rewards.maintenance')");
}
