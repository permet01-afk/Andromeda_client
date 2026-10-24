<?php
/** Atomic implementation of the existing clan-wallet payout, and nothing else. */
function clan_treasury_positive_amount($value): int
{
    if (!is_string($value) && !is_int($value)) return 0;
    $value = (string)$value;
    if (!preg_match('/^[0-9]+$/D', $value)) return 0;
    $value = ltrim($value, '0');
    $maximum = (string)PHP_INT_MAX;
    if ($value === '' || strlen($value) > strlen($maximum) ||
        (strlen($value) === strlen($maximum) && strcmp($value, $maximum) > 0)) return 0;
    return (int)$value;
}

function clan_treasury_transfer(PDO $db, int $clanId, int $actorId, int $toUser, int $amount, string $note): array
{
    if ($clanId <= 0 || $actorId <= 0 || $toUser <= 0 || $amount <= 0) {
        throw new DomainException('Invalid recipient or amount.');
    }
    if ($db->inTransaction()) throw new RuntimeException('A transfer is already in progress.');

    // Fail closed on an installation that cannot roll all four writes back.
    // This read does not create or migrate tables or alter their storage engines.
    $engines = $db->query("SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN
        ('clan','clan_roles','users','clan_wallet','clan_transfers','clan_log')")->fetchAll(PDO::FETCH_ASSOC);
    $transactional = [];
    foreach ($engines as $table) $transactional[strtolower($table['TABLE_NAME'])] = strcasecmp((string)$table['ENGINE'], 'InnoDB') === 0;
    foreach (['clan','clan_roles','users','clan_wallet','clan_transfers','clan_log'] as $table) {
        if (empty($transactional[$table])) throw new RuntimeException('The treasury storage is not transaction-ready.');
    }

    if (!$db->beginTransaction()) throw new RuntimeException('The transfer transaction could not start.');
    try {
        $q = $db->prepare('SELECT admin_id FROM clan WHERE id=? LIMIT 1 FOR UPDATE');
        $q->execute([$clanId]);
        $leader = $q->fetchColumn();
        $q = $db->prepare('SELECT clanid FROM users WHERE id=? LIMIT 1 FOR UPDATE');
        $q->execute([$actorId]);
        $actorClan = $q->fetchColumn();
        if ($leader === false || $actorClan === false || (int)$actorClan !== $clanId) {
            throw new DomainException('You are no longer a member of this clan.');
        }
        if ((int)$leader !== $actorId) {
            $q = $db->prepare('SELECT can_spend FROM clan_roles WHERE clan_id=? AND user_id=? LIMIT 1 FOR UPDATE');
            $q->execute([$clanId, $actorId]);
            if ((int)$q->fetchColumn() !== 1) throw new DomainException("You don't have permission to transfer funds.");
        }
        $q = $db->prepare('SELECT balance FROM clan_wallet WHERE clan_id=? LIMIT 1 FOR UPDATE');
        $q->execute([$clanId]);
        $balance = $q->fetchColumn();
        if ($balance === false || (int)$balance < $amount) throw new DomainException('Insufficient clan-wallet funds.');
        $q = $db->prepare('SELECT clanid, credits FROM users WHERE id=? LIMIT 1 FOR UPDATE');
        $q->execute([$toUser]);
        $recipient = $q->fetch(PDO::FETCH_ASSOC);
        if (!$recipient || (int)$recipient['clanid'] !== $clanId) throw new DomainException('Selected user is not in your clan.');
        $creditText = (string)$recipient['credits'];
        if (!preg_match('/^[0-9]+$/D', $creditText) || strlen($creditText) > strlen((string)PHP_INT_MAX) ||
            (strlen($creditText) === strlen((string)PHP_INT_MAX) && strcmp($creditText, (string)PHP_INT_MAX) > 0) ||
            (int)$creditText > PHP_INT_MAX - $amount) throw new DomainException('The recipient balance cannot accept this amount.');

        $debit = $db->prepare('UPDATE clan_wallet SET balance=balance-:amount WHERE clan_id=:clan AND balance>=:required');
        if (!$debit->execute([':amount'=>$amount, ':clan'=>$clanId, ':required'=>$amount]) || $debit->rowCount() !== 1) {
            throw new RuntimeException('Wallet debit failed.');
        }
        $credit = $db->prepare('UPDATE users SET credits=credits+:amount WHERE id=:recipient AND clanid=:clan');
        if (!$credit->execute([':amount'=>$amount, ':recipient'=>$toUser, ':clan'=>$clanId]) || $credit->rowCount() !== 1) {
            throw new RuntimeException('Recipient credit failed.');
        }
        $transfer = $db->prepare('INSERT INTO clan_transfers (clan_id,actor_user_id,to_user_id,amount,note) VALUES (?,?,?,?,?)');
        if (!$transfer->execute([$clanId, $actorId, $toUser, $amount, $note !== '' ? $note : null])) throw new RuntimeException('Transfer history failed.');
        $details = ['to_user_id'=>$toUser, 'amount'=>$amount];
        if ($note !== '') $details['note'] = $note;
        $log = $db->prepare('INSERT INTO clan_log (clan_id,actor_user_id,action_type,details) VALUES (?,?,?,?)');
        if (!$log->execute([$clanId, $actorId, 'wallet_transfer', json_encode($details, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)])) {
            throw new RuntimeException('Clan history failed.');
        }
        if (!$db->commit()) throw new RuntimeException('Transfer commit failed.');
        return ['amount'=>$amount, 'balance'=>(int)$balance-$amount, 'to_user_id'=>$toUser];
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
}
