-- MANUAL ROLLBACK ONLY. Destructive statements; export ranking facts first.
-- Preferred code rollback: stop new emulator and web worker; restore previous
-- code; retain this additive schema and the ranking archives without deleting.
-- If using the retained schema with old code, clear ONLY the six active timing
-- fields before old code resumes, so a later upgrade cannot reuse a stale run.
-- This intentionally excludes all still-active gates from future timing.
-- Do not delete pending event outbox files; archive them with the SQL export.
-- The optional full schema removal below is for an operator AFTER backup and
-- code rollback, never a command executed by Andromeda or its web UI.

UPDATE player_galaxy_gates SET timing_run_id=NULL,timing_started_at=NULL,
 timing_boot_id=NULL,timing_company_id=NULL,timing_rule_version=NULL,timing_eligible=0;

-- OPTIONAL FULL REMOVAL (uncomment only after exporting these facts):
-- DROP TABLE event_ranking_results;
-- DROP TABLE event_ranking_runs;
-- DROP TABLE gg_completed_runs;
-- ALTER TABLE player_galaxy_gates
--  DROP COLUMN timing_run_id,DROP COLUMN timing_started_at,
--  DROP COLUMN timing_boot_id,DROP COLUMN timing_company_id,
--  DROP COLUMN timing_rule_version,DROP COLUMN timing_eligible;
