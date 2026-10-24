<?php
/** Request protection for existing clan actions. No authentication or gameplay rules. */
function clan_request_session(callable $callback)
{
    $opened = session_status() !== PHP_SESSION_ACTIVE;
    if ($opened && (session_id() === '' || !session_start())) {
        throw new RuntimeException('The clan session is unavailable. Reload and try again.');
    }
    try {
        return $callback();
    } finally {
        if ($opened && session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }
    }
}

function clan_request_csrf_token(): string
{
    return clan_request_session(function (): string {
        if (empty($_SESSION['loggedIn']) || empty($_SESSION['player_id'])) return '';
        if (empty($_SESSION['clan_csrf_token']) || !is_string($_SESSION['clan_csrf_token']) ||
            (int)($_SESSION['clan_csrf_player_id'] ?? 0) !== (int)$_SESSION['player_id']) {
            $_SESSION['clan_csrf_token'] = bin2hex(random_bytes(32));
            $_SESSION['clan_csrf_player_id'] = (int)$_SESSION['player_id'];
        }
        return $_SESSION['clan_csrf_token'];
    });
}

function clan_request_csrf_field(): string
{
    return '<input type="hidden" name="csrf_token" value="' .
        htmlspecialchars(clan_request_csrf_token(), ENT_QUOTES, 'UTF-8') . '">';
}

function clan_request_is_post_valid(): bool
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST' ||
        !isset($_POST['csrf_token']) || !is_string($_POST['csrf_token'])) return false;
    $submitted = $_POST['csrf_token'];
    return clan_request_session(function () use ($submitted): bool {
        $expected = $_SESSION['clan_csrf_token'] ?? null;
        return !empty($_SESSION['loggedIn']) && !empty($_SESSION['player_id']) &&
            (int)($_SESSION['clan_csrf_player_id'] ?? 0) === (int)$_SESSION['player_id'] &&
            is_string($expected) && strlen($expected) === 64 &&
            strlen($submitted) === 64 && hash_equals($expected, $submitted);
    });
}

function clan_request_flash_set(string $scope, string $type, string $message, array $context = []): void
{
    clan_request_session(function () use ($scope, $type, $message, $context): void {
        $_SESSION['clan_request_flash'][$scope] = [
            'type' => $type === 'success' ? 'success' : 'error',
            'msg' => $message,
            'context' => $context,
        ];
    });
}

function clan_request_flash_get(string $scope): ?array
{
    return clan_request_session(function () use ($scope): ?array {
        $flash = $_SESSION['clan_request_flash'][$scope] ?? null;
        unset($_SESSION['clan_request_flash'][$scope]);
        return is_array($flash) ? $flash : null;
    });
}
