-- MariaDB 10.4.32: MANUAL SCHEMA PREPARATION ONLY.
-- Stop the emulator and all HTTP quest mutations; verify a full backup first.
-- Select the intended application database explicitly before execution.
-- These DDL statements auto-commit; do not pretend they have transactional rollback.
-- Re-running is supported by IF NOT EXISTS. No account, wallet, inventory,
-- progression, historical claim or old quest definition is changed by this file.
-- Existing critical tables are already InnoDB in the inspected reference.
-- No engine conversion, column deletion, index rebuild or MariaDB upgrade is needed.

ALTER TABLE site_quests ADD COLUMN IF NOT EXISTS source_domain VARCHAR(16) NOT NULL DEFAULT 'legacy';
ALTER TABLE site_quests ADD COLUMN IF NOT EXISTS definition_json MEDIUMTEXT NULL;
ALTER TABLE site_player_quests ADD COLUMN IF NOT EXISTS attempt_id CHAR(32) NULL;
ALTER TABLE site_player_quests ADD COLUMN IF NOT EXISTS state_version BIGINT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS site_quest_features (feature_key VARCHAR(64) NOT NULL PRIMARY KEY, enabled TINYINT NOT NULL DEFAULT 0, catalogue_sha256 CHAR(64) NULL, snapshot_id CHAR(32) NULL, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS site_quest_revisions (player_id INT NOT NULL PRIMARY KEY, revision BIGINT NOT NULL DEFAULT 0, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS site_quest_claim_receipts (player_id INT NOT NULL, quest_id INT NOT NULL, attempt_id CHAR(32) NOT NULL, reward_json MEDIUMTEXT NOT NULL, claimed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(player_id,quest_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS site_quest_legacy_archive (snapshot_id CHAR(32) NOT NULL, row_kind VARCHAR(40) NOT NULL, row_key VARCHAR(128) NOT NULL, row_json MEDIUMTEXT NOT NULL, sha256 CHAR(64) NOT NULL, archived_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(snapshot_id,row_kind,row_key)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS site_player_gg_energy (player_id INT NOT NULL PRIMARY KEY, energy BIGINT UNSIGNED NOT NULL DEFAULT 0, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Catalogue insertion is a separate explicit QuestService CLI operation:
-- htdocs/scripts/historical_quests_maintenance.php --action=install [...guards...]
-- It verifies the catalogue file and metadata and upserts the 283 definitions.
-- First installation leaves the feature disabled.
-- Activation/archive is a third operation (--action=activate), not hidden in DDL.
-- No blanket transformation of users or progress counters is required.
