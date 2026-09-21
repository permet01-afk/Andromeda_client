<?php
declare(strict_types=1);
require_once __DIR__ . '/TechFactoryService.php';

/** HTTP policy separated from connection creation so it can be tested without DB. */
final class TechFactoryHttp
{
    public static function handle(string $method, array $get, array $post, array $session, callable $connect): array
    {
        if (($session['loggedIn'] ?? false) !== true || ($session['terms_of_use'] ?? false) !== true
            || filter_var($session['player_id'] ?? null, FILTER_VALIDATE_INT, ['options'=>['min_range'=>1]]) === false) {
            return [401, ['success'=>false,'message'=>'Authentication required.']];
        }
        if (!in_array($method, ['GET','POST'], true)) { return [405,['success'=>false,'message'=>'Invalid request method.']]; }
        $action = $method === 'GET' ? ($get['action'] ?? 'state') : ($post['action'] ?? '');
        if (!is_string($action) || !in_array($action, ['state','settle','build','unlock'], true)) { return [400,['success'=>false,'message'=>'Unknown Tech Factory action.']]; }
        if (($action === 'state') !== ($method === 'GET')) { return [405,['success'=>false,'message'=>'Invalid request method.']]; }
        if ($method === 'POST') {
            $token = $session['skylab_csrf_token'] ?? '';
            $posted = $post['csrf_token'] ?? '';
            if (!is_string($token) || $token === '' || !is_string($posted) || !hash_equals($token,$posted)) { return [403,['success'=>false,'message'=>'Invalid security token.']]; }
        }
        try {
            $slot = 0;
            $tech = 0;
            if (in_array($action, ['build','unlock'], true)) {
                $slot = self::positiveInt($post['slot_no'] ?? null, 3);
                if (!is_string($post['request_key'] ?? null)) { throw new TechFactoryRuleException('Invalid request key.'); }
                TechFactoryService::requestKey($post['request_key']);
            }
            if ($action === 'build') { $tech = self::positiveInt($post['tech_id'] ?? null, 5); }
            // The callback receives ONLY the authenticated session identity.
            $service = $connect((int)$session['player_id']);
            if ($action === 'state') { $result = ['state'=>$service->getState()]; }
            elseif ($action === 'settle') { $result = $service->settle(); }
            elseif ($action === 'build') { $result = $service->build($tech,$slot,$post['request_key']); }
            else { $result = $service->unlock($slot,$post['request_key']); }
            return [200,['success'=>true] + $result];
        } catch (TechFactoryUnavailable $error) {
            return [503,['success'=>false,'available'=>false,'message'=>$error->getMessage()]];
        } catch (TechFactoryRuleException $error) {
            return [409,['success'=>false,'message'=>$error->getMessage()]];
        } catch (Throwable $error) {
            error_log('[Tech Factory API] ' . $error->getMessage());
            return [500,['success'=>false,'message'=>'Tech Factory is temporarily unavailable. Please try again.']];
        }
    }

    private static function positiveInt($value, int $max): int
    {
        if ((!is_string($value) && !is_int($value)) || !preg_match('/\A[1-9][0-9]*\z/', (string)$value)
            || (int)$value < 1 || (int)$value > $max) { throw new TechFactoryRuleException('Invalid technology or hall.'); }
        return (int)$value;
    }
}
