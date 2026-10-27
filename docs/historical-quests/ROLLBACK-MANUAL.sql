-- EMERGENCY DEACTIVATION ONLY, after verified backup and stopped quest mutations.
-- This does not restore old Basic/PvP attempts. Normal complete reversal uses:
-- historical_quests_maintenance.php --action=restore --snapshot-id=<verified-id>
-- with the endpoint, catalogue SHA, --execute, --maintenance-confirmed and
-- --receipt-dir guards documented in MAINTENANCE.md.
-- The CLI verifies the archive and refuses to overwrite legacy rows changed
-- since activation; a repeat restoration is a no-op once rows are restored.
START TRANSACTION;
UPDATE site_quest_features SET enabled=0 WHERE feature_key='historical_catalog';
UPDATE site_quests SET enabled=0 WHERE source_domain='historical';
UPDATE site_quest_revisions SET revision=revision+1;
COMMIT;
-- Keep every support column/table, archive, historical attempt and claim receipt.
-- Do not DROP tables, rewind wallets/inventories/XP/honor, or clear old claims.
