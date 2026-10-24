<?php
declare(strict_types=1);

/** Read-only history, bounded keyset pages using the existing player/timestamp index. */
final class LogbookHistoryService
{
    public const PAGE_SIZE = 30;

    public static function cursor(array $row): string
    {
        return rtrim(strtr(base64_encode((string)$row['timestamp'].'|'.(string)$row['id']), '+/', '-_'), '=');
    }

    private static function decode(string $cursor): array
    {
        if (strlen($cursor) > 128 || !preg_match('/^[A-Za-z0-9_-]+$/D', $cursor)) {
            throw new InvalidArgumentException('Invalid history cursor.');
        }
        $decoded = base64_decode(strtr($cursor, '-_', '+/'), true);
        if (!is_string($decoded) || !preg_match('/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\|([1-9]\d{0,18})$/D', $decoded, $match)) {
            throw new InvalidArgumentException('Invalid history cursor.');
        }
        $time = DateTimeImmutable::createFromFormat('!Y-m-d H:i:s', $match[1]);
        $id = filter_var($match[2], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if (!$time || $time->format('Y-m-d H:i:s') !== $match[1] || $id === false) {
            throw new InvalidArgumentException('Invalid history cursor.');
        }
        return [$match[1], $id];
    }

    public static function page(PDO $db, int $playerId, string $before = '', string $after = ''): array
    {
        if ($playerId <= 0 || ($before !== '' && $after !== '')) {
            throw new InvalidArgumentException('Invalid history request.');
        }
        $ascending = $after !== '';
        $cursor = $ascending ? $after : $before;
        $where = 'playerid = :playerid';
        $values = [':playerid' => $playerId];
        if ($cursor !== '') {
            [$timestamp, $id] = self::decode($cursor);
            $comparison = $ascending ? '>' : '<';
            $where .= ' AND (timestamp '.$comparison.' :cursor_time OR (timestamp = :equal_time AND id '.$comparison.' :cursor_id))';
            $values[':cursor_time'] = $timestamp;
            $values[':equal_time'] = $timestamp;
            $values[':cursor_id'] = $id;
        }
        $order = $ascending ? 'ASC' : 'DESC';
        $query = $db->prepare('SELECT id, timestamp, message FROM users_log WHERE '.$where.' ORDER BY timestamp '.$order.', id '.$order.' LIMIT '.(self::PAGE_SIZE + 1));
        $query->execute($values);
        $rows = $query->fetchAll(PDO::FETCH_ASSOC);
        $more = count($rows) > self::PAGE_SIZE;
        if ($more) array_pop($rows);
        if ($ascending) $rows = array_reverse($rows);
        return [
            'rows' => $rows,
            'older' => $rows && ($ascending || $more) ? self::cursor($rows[count($rows) - 1]) : null,
            'newer' => $rows && ($ascending ? $more : $before !== '') ? self::cursor($rows[0]) : null,
        ];
    }

    public static function message(string $message): string
    {
        $text = preg_replace('/<br\s*\/?>/i', "\n", $message);
        $text = html_entity_decode((string)$text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        return nl2br(htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'), false);
    }
}
