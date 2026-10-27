# Historical quests: consolidated installation and reversible activation

This is a publication candidate for review. Preparing these files does not authorize a deployment, principal-database migration, commit or push. Run the commands below only during a separately authorized installation.

The historical adapter remains part of `QuestService`. It reuses `site_quests`, `site_player_quests` and the existing authenticated quest routes. The C# server is the authority for progression. Browser submissions cannot supply counters, completion or rewards.

## Catalogue and known limits

The finite catalogue contains **283 logical Normal missions**, representing 293 retained documentary definitions. **280 logical missions are enabled**; the three older disabled families below remain in the catalogue. This consolidates the 259 preceding logical missions, including the four position missions, and the 24 qualified additions. A family has one stable `hq_` identifier and one durable completion per player. Nine older EIC family payloads remain unavailable rather than borrowing objectives or rewards from another company. Player-visible totals depend on company eligibility and the retained disabled variants; they are not the global catalogue count.

Three families are retained but disabled for actual technical or documentary blockers:

| Family | Blocker |
| --- | --- |
| Elite Force Audition | No real Nyx control-centre interaction exists in the current world. Opening a website is not substituted for it. |
| Playing With Fire | Repeated identical AND objectives do not establish an unambiguous event-allocation rule. No arbitrary combined quantity is substituted. |
| Mysterious Cube | The prohibited mission object is not identified in the server world. It is not treated as Cubikon. |

Availability also depends on the real company, level and prerequisites. The four position missions are included in the 283, use the verified historical coordinate conversion of x100 and a validation radius of 100 server units, and do not require an artificial completion action. Challenges, Daily and Event remain empty future sections. The 8 Havok missions, 15 Weekly definitions and 11 Hunting Contract families retain their rules and independent storage. Normal permits three simultaneous missions; it does not consume the separate Havok slots.

Maps 4-1, 4-2 and 4-3 are intentionally inaccessible. This release does not add portals or routes to them. Missions which require those maps were excluded; a PvP objective with 4-4 as a valid alternative does not require one of the removed maps. The 93 exclusions and the documentary duplicate are not a second playable catalogue.

Front Lines and Threat Level Uber each award **8,000 UCB-100 / DMG X4** through the existing `ammo_ucb100` balance. This is the explicit Andromeda choice. Their recovered historical Hellstorm rewards are preserved in provenance, not granted in addition. Their other objectives and scalar rewards are unchanged.

## Database requirements

Before any future authorized installation, retain a verified full database backup, the previous application files and binaries, and the exact catalogue SHA-256. Stop the emulator and put the website's quest mutations into maintenance mode for the entire schema change, import, archive, activation or restoration. A zero-online-player check is an additional guard, not a replacement for maintenance isolation. Do not activate while players can accept, progress, abort or claim quests.

All tables participating in archival, claims or grants must use InnoDB: `users`, `player_cargo`, `player_inventory`, `site_quests`, `site_quest_objectives`, `site_player_quests`, `site_player_quest_objective_progress` and the five new support tables. The adapter refuses a non-transactional participant; it never converts an engine automatically. Inspect actual engines before considering any manual conversion.

The schema additions are four columns and five support tables. `MIGRATION-MANUAL.sql` is the repeatable, manual schema stage for MariaDB 10.4.32. It contains no catalogue payload, account update, reward grant or activation. Existing columns and tables are checked before an addition. No legacy columns are removed, no account statistics are reset, and no old cumulative counters are imported into a new historical attempt.

Catalogue installation and activation are separate data operations performed through the existing `QuestService`, not a raw SQL import of test data. `htdocs/scripts/historical_quests_maintenance.php` provides an explicit CLI entry point with read-only inspection by default, expected database/port/catalogue-hash checks, and receipts outside the web root. Do not include a password or an authentication ticket in its command line. It uses the application's configured connection and refuses a different database identity.

## Explicit maintenance operations

These service methods and the maintenance entry point deliberately refuse web execution:

1. `installHistoricalCatalog()` installs the schema idempotently and loads the exact JSON definitions. On first installation the historical feature remains disabled. Repeating an install preserves the current feature state and archive identifier; a changed accepted definition is detected through its fingerprint.
2. `activateHistoricalCatalog()` verifies the expected 62 Basic and 7 PvP definitions, archives all their definitions, objective rows, player states and objective progress with per-row SHA-256 verification, and then performs a transactional switch. It disables those 69 definitions and archives their in-progress attempts. It does not delete them. It does not modify account balances or Havok/Weekly/Contracts.
3. Record the returned snapshot identifier and archived counts outside the public web root. Retain a second verified backup after activation. The runtime JSON and matching C# server must be present before restarting the game.
4. Check real faction eligibility, the independent Normal/Havok limits, reconnect persistence and a complete accept/progress/claim cycle. These checks require actual server events; editing progress JSON is only a lifecycle simulation.

The old private-campaign wrappers remain locked to their disposable clones and are excluded from publication. Do not weaken a clone guard to perform an installation. Use the separately reviewed maintenance entry point and preserve its expected identity checks.

## Installation order

1. Enter maintenance, stop the old emulator and verify the database backup and prior application-file backup. Keep account data and credentials outside the delivery archive.
2. Copy the reviewed application delta into a clean copy of the pinned Git reference and verify its complete SHA-256 manifest. Build the emulator in Release configuration. Deploy the reviewed `htdocs` files and the matching C# executable/dependencies together; do not start the emulator yet. Preserve the installation's existing database, transport and local configuration.
3. Run CLI inspection without `--execute`, using the expected database name, port and the delivered catalogue SHA-256. Verify its endpoint, catalogue-file and current feature summary against the independent schema-comparison report and manual SQL instructions. The helper's dry-run summary is not a full structural comparison. The inspected principal reference already uses InnoDB for all required pre-existing tables; no engine conversion or MariaDB upgrade is required for this release.
4. Apply only the reviewed missing-schema stage under maintenance. It adds the five support tables and four columns; it does not activate the catalogue. Repeat inspection before any data operation.
5. Use `install` to import the exact 283 definitions. A first installation stays disabled. A repeat installation preserves the existing feature state and the legacy archive identifier. No player counters, attempts, receipts or wallet balances are imported from a private clone.
6. For a first transition from Basic/PvP to Normal, use `activate`. Retain the returned snapshot identifier, archive counts and receipt outside `htdocs`. This archives and verifies the expected 69 legacy definitions and their existing player states before disabling them; it does not delete them or alter Havok/Weekly/Contracts. On an already active matching catalogue, the CLI wrapper reports `already_active` without creating a new archive or replaying the switch. A different active catalogue must first be explicitly installed under maintenance.
7. Reinspect the installed catalogue SHA, 283/280 global counts, the three disabled families and the preservation of existing accounts, inventories, receipts and balances. Start the matching emulator, perform representative accept/progress/claim and reconnect checks, then leave maintenance.

The helper requires `--expect-db`, `--expect-port` and `--expect-catalogue-sha256`. Mutating actions additionally require `--execute`, `--maintenance-confirmed` and a `--receipt-dir` outside the web root. Use its `--help` output for the exact invocation. The argument values must come from the actual installation and the delivered manifest; example names or private-clone values must not be copied to production.

After catalogue installation/activation, these read-only checks verify the persistent state rather than only the file metadata:

```sql
SELECT COUNT(*) AS historical_definitions, SUM(enabled=1) AS enabled_definitions
FROM site_quests WHERE source_domain='historical';
SELECT enabled, catalogue_sha256, snapshot_id
FROM site_quest_features WHERE feature_key='historical_catalog';
```

The global definition count must be 283. A first install remains inactive with zero enabled definitions; after successful activation the enabled count must be 280 and the stored catalogue SHA must match the delivered file. A repeat install of an already active catalogue preserves its active state and archive identifier.

## Reversal

With all quest mutations stopped and the matching new service code still present, use the maintenance helper's `restore` action with the verified snapshot identifier. It calls `restoreHistoricalLegacyArchive(snapshotId)`, verifies the row hashes, restores the archived legacy definitions and progress, deactivates historical definitions and bumps per-player revisions. Existing historical attempts and claim receipts remain preserved for a future reactivation. Then restore the prior application files and matching emulator binary from their verified file backup before reopening access. Do not run two emulator versions against the same database.

`ROLLBACK-MANUAL.sql` is emergency deactivation only. It cannot restore archived legacy attempts by itself. Do not drop archive or receipt tables, delete wallet balances, restore old account balances over newly earned rewards, or reuse an accepted attempt identifier. Any full backup restoration must be a separate planned recovery operation.

## Grants and free Galaxy Gate energy

A claim locks the player and current attempt, validates the selected company, definition fingerprint, attempt identifier, completion and absence of failure, inserts a unique receipt, applies every supported grant and closes the attempt in the same transaction. A failure rolls back the receipt and all grants. Previously completed missions cannot be claimed twice.

Unpublished scalar rewards remain null in the catalogue and are not invented. Item grants use exact retained quantities. Persistent free Galaxy Gate energy is stored separately in `site_player_gg_energy`. A generator spin consumes available free energy first and charges 40 Uridium only for the remaining spins; wallet debit and materialization share the existing generator transaction. Probabilities, gate rewards and existing prices are unchanged.

The emulator uses existing database deltas and reloads reward-facing cached data after the lifecycle revision changes. It never trusts a client-supplied reward or progression value. A new attempt has a new random identifier, and stale server progress writes are rejected through its status, version and identifier.

## Performance boundaries

The full catalogue is presented only when Mission Control is loaded. The in-game tracker queries only that player's active historical rows; the C# runtime keeps only active mission state and checks lifecycle revisions. There is no durable per-kill journal, global catalogue scan per kill or timer database write when no progression changes.

One existing world tick schedules the global ordinary quest save cycle every 10,000 ms. Only dirty players are queued. Critical lifecycle writes, completions and normal logout still flush through the existing guarded attempt/version protocol; delayed writes cannot revive an aborted or replaced attempt. HTML5 receives server progression in real time. Mission Control category/mission selection remains local; an action made in the game does not force a website reload. A manual refresh of the site reads the latest persisted state.

The 27 natural-ore fields remain in place. Prometium, Endurium and Terbium use the corrected Flash atlases, the original 39 beam positions/order and linear interpolation, with a user-selected total beam duration of 1,000 ms for all three. Uniform duration is an Andromeda preference, not a claim that Flash used identical durations. Single-line historical collection notifications and the natural collection authority remain unchanged. Normal HTML5 preloading remains `all`; the bounded private diagnostic preloader is not shipped.

Radiation-distance objectives count only the portion of an authoritative movement segment outside the map's real safe rectangle, including border crossings. Standing still or travelling in the safe zone does not add radiation distance. Other distance, damage and position objectives keep their existing event amounts and rules. Test of Courage retains its 10,000-unit objective, 60-second limit and survival condition.
