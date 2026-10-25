-- ANDROMEDA REBORN: MANUAL RANKINGS MIGRATION, schema version1.
-- Approved rules: new GG times and final Spaceball/TDM/Invasion facts only.
-- Stop the affected NEW build first, take a verified backup, select the
-- intended database explicitly, verify existing users/player_galaxy_gates InnoDB.
-- Apply ONCE. No gameplay balance, column deletion, backfill or auto-DDL.
-- Existing on_map gates have unknown start and stay unranked.
-- No historical Rankpoints/PvP columns are removed.

-- MANUAL MIGRATION — approved private implementation; not auto-executed.
-- Forward migration: take a verified backup first. All existing on_map gates
-- retain a NULL version: their unknown start is excluded, never backfilled.
-- Required existing engines: users and player_galaxy_gates must be InnoDB;
-- existing player_galaxy_gates UNIQUE(user_id,gate_id) must remain intact.
-- No conversion, automatic DDL, change to rewards or historical SQL data here.

ALTER TABLE player_galaxy_gates
  ADD COLUMN timing_run_id CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL,
  ADD COLUMN timing_started_at DATETIME(3) NULL,
  ADD COLUMN timing_boot_id CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL,
  ADD COLUMN timing_company_id TINYINT UNSIGNED NULL,
  ADD COLUMN timing_rule_version SMALLINT UNSIGNED NULL,
  ADD COLUMN timing_eligible TINYINT UNSIGNED NOT NULL DEFAULT 0;

CREATE TABLE gg_completed_runs (
  run_id CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  player_id INT NOT NULL,
  gate_id TINYINT UNSIGNED NOT NULL,
  company_at_start TINYINT UNSIGNED NOT NULL,
  started_at DATETIME(3) NULL,
  completed_at DATETIME(3) NOT NULL,
  elapsed_ms BIGINT UNSIGNED NULL,
  rule_version SMALLINT UNSIGNED NOT NULL,
  rank_eligible TINYINT UNSIGNED NOT NULL,
  exclusion_reason VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (run_id),
  KEY gg_time_ranking (gate_id,rank_eligible,elapsed_ms,completed_at,player_id),
  KEY gg_player_runs (player_id,gate_id,completed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- PHP prepare contract (append inside its EXISTING transaction, never a new
-- standalone write): timing_run_id=NULL,timing_started_at=NULL,
-- timing_boot_id=NULL,timing_company_id=NULL,timing_rule_version=1,
-- timing_eligible=0. This is a version marker only, NOT the start instant.
-- Final loss/reset must clear these fields (including version -> NULL).
-- Completion archive survives reward/reset and must not be deleted on prepare.


-- MANUAL FORWARD MIGRATION ONLY. Not executed by the emulator or this campaign.
-- Back up first. Both tables must be InnoDB. No users/economy/gameplay table changes.
CREATE TABLE event_ranking_runs (
    run_key CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    event_type VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    occurrence_key VARCHAR(160) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    started_at DATETIME(3) NOT NULL,
    ended_at DATETIME(3) NULL,
    status VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    end_reason VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    rules_version SMALLINT UNSIGNED NOT NULL,
    snapshot_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    recorded_at DATETIME(3) NOT NULL,
    PRIMARY KEY (run_key),
    KEY ix_event_latest (event_type, started_at, run_key),
    KEY ix_event_finished (event_type, status, ended_at, run_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE event_ranking_results (
    run_key CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    entity_type VARCHAR(8) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    entity_id INT NOT NULL,
    company_at_event TINYINT UNSIGNED NOT NULL,
    metric VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    score BIGINT NOT NULL,
    outcome VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    details_json TEXT NULL,
    PRIMARY KEY (run_key, entity_type, entity_id, metric),
    KEY ix_event_entity_metric (entity_type, metric, entity_id, run_key),
    CONSTRAINT fk_event_result_run FOREIGN KEY (run_key)
        REFERENCES event_ranking_runs (run_key) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Contract v1:
-- event_type: spaceball / tdm / invasion. No daily/reset buckets.
-- Only status='finished' contributes to totals. cancelled remains an actual
-- occurrence snapshot but is excluded; interrupted has ended_at NULL and NO rows.
-- Spaceball: company/goals, all three real final goal counters; WIN only when
-- the existing engine actually declared that company the winner.
-- TDM: participating company/match_wins (0/1); player/kills,deaths,damage.
-- Kills/deaths are raw accepted Die counters, never reward q or distinct victims.
-- Invasion: company/progress (actual removed NPCs, out of55), company/damage.
-- Additional final context (map, wave, native score, participation) is JSON only.
-- No backfill: existing reward receipts and current company do not reconstruct
-- historical matches. A snapshot hash covers all immutable facts and row order.

