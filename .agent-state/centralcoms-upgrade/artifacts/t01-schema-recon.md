# T01 — Schema and Migration Reconnaissance

## Scope receipt

- Task: `T01`
- Mode: read-only repository reconnaissance.
- Allowed write: this artifact only.
- Source/schema/migration/config/test edits: none.
- Production database, credentials, providers, deployment, and external systems: not used.

## Decision summary

The foundation can be added without renaming or rebuilding `users`, `reports`, or the existing frontend-oriented `cases` table. The safe path is an additive seven-table spine:

1. `organizations`
2. `organization_memberships`
3. `properties`
4. `units`
5. `resource_grants`
6. `maintenance_cases`
7. `case_events`

The canonical case table must be called `maintenance_cases`, not `cases`: `cases` already exists with a text primary key and a frontend wizard payload (`server/db/schema.ts:258-274`). Existing `reports` remain the compatibility surface and link to one canonical case through a nullable, unique `maintenance_cases.legacy_report_id`.

T05 must update every schema plane in one owned workstream. Updating only Drizzle would not update the normal SQLite runtime; updating only `schema.pg.sql` would not create a replayable production migration.

## Evidence ledger

| Finding | Exact evidence |
|---|---|
| Drizzle is SQLite-only and emits to the shared migration directory. | `drizzle.config.ts:9-17` points to `server/db/schema.ts`, `server/db/migrations`, and `dialect: 'sqlite'`. |
| The Drizzle source uses plural snake-case tables, integer auto-increment IDs, text timestamps, integer booleans, text JSON, and SQLite references. | `server/db/schema.ts:1-17`, `20-32`, `35-83`, `326-361`. |
| Most legacy domain identity is integer-based; the existing diagnostic `cases` table is the exception and uses a text ID. | `server/db/schema.ts:5-6`, `35-37`, `86-89`, compared with `259-274`. |
| SQLite runtime does not run Drizzle migrations. It executes `models/schema.sql` and `models/blackboard.sql`. | `server/config/database.ts:48-68`. |
| SQLite compatibility changes currently run imperatively after bootstrap. | `server/config/database.ts:77-125`. |
| The adapter translates a subset of PostgreSQL SQL into SQLite SQL. | `server/config/database.ts:131-167`. |
| Runtime chooses SQLite by environment, otherwise a PostgreSQL pool. | `server/config/database.ts:241-274`. |
| PostgreSQL initialization executes `schema.pg.sql`, not the `postgres/` migration directory. | `server/scripts/init-db.ts:14-24`. |
| PostgreSQL also has separate forward-only repair SQL. | `server/db/migrations/postgres/004_runtime_parity.sql:1-83`; `005_research_budget_reservations.sql:1-7`. |
| SQLite migration metadata currently records exactly six generated migrations. | `server/db/migrations/meta/_journal.json:1-48`. |
| The convergence test hard-codes six migrations and the exact current table list. | `server/tests/sqlite-migration-convergence.test.ts:18-65`. |
| The current PostgreSQL parity test is textual and checks selected columns, not executable FK/default/transaction behavior. | `server/tests/postgres-schema-parity.test.ts:24-35`, `37-82`. |
| A generated SQLite rebuild has previously required temporary backups because disabling FKs inside a migration transaction is ineffective. | `server/db/migrations/0003_short_dakota_north.sql:147-191`. |
| Existing runtime schema planes already drift: the Drizzle schema contains `cases`, `agent_sessions`, `device_nodes`, `fault_attributions`, and `turnover_inspections`, while the normal SQLite and PostgreSQL bootstrap files do not define the same full set. | Drizzle definitions: `server/db/schema.ts:258-324`; SQLite bootstrap ends at `server/models/schema.sql:291`; PostgreSQL bootstrap table definitions end at `server/models/schema.pg.sql:237`. |
| The package scripts expose Drizzle generation/migration but the only config is SQLite. | `server/package.json:7-16`; `drizzle.config.ts:9-17`. |

Fresh verifier receipt:

```text
npm test -- --run tests/sqlite-migration-convergence.test.ts
  tests/postgres-schema-parity.test.ts
  tests/sqlite-payment-bootstrap.test.ts
  tests/sqlite-analytics-bootstrap.test.ts

PASS — 4 files, 8 tests, Vitest duration 6.21 s.
```

This is a pre-change baseline, not proof of the proposed tables. PostgreSQL executable parity is unavailable in this batch; static parity may pass, but runtime parity must be reported as `BLOCKED_DEPENDENCY`.

## Current dialect conventions

| Concern | SQLite convention | PostgreSQL convention | Foundation rule |
|---|---|---|---|
| Primary IDs | `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` | Use integer IDs for the seven new tables; do not introduce UUID-returning behavior into the compatibility adapter in this gate. |
| Timestamps | `TEXT DEFAULT (datetime('now'))` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` | Store UTC; normalize at service boundaries. Do not depend on lexical equivalence between dialects without a test. |
| Boolean | integer `0/1` | existing schemas also use integer | Keep integer booleans in this gate. |
| JSON/structured payload | `TEXT` | `TEXT` | Persist canonical JSON text and a hash; validate with application schemas. |
| Enum/check | Drizzle `text(..., { enum })` is primarily a TypeScript contract; hand-written bootstrap SQL uses `CHECK`. | Hand-written SQL uses `CHECK`. | Freeze values in T04, mirror checks in both bootstrap files and both migrations, and test rejection behavior. |
| Foreign keys | Declared in Drizzle and bootstrap SQL. Current runtime constructor sets WAL at `server/config/database.ts:40-42`; FK behavior is not explicitly asserted there. | Native FK enforcement. | T05 may own `database.ts` to make SQLite FK enforcement explicit and add a deterministic assertion test. |
| Migrations | Drizzle journal plus generated snapshots. | Separate forward-only SQL; no executable runner is wired by the reviewed scripts. | SQLite and PostgreSQL files are separate owned deliverables; never label static PG inspection as runtime proof. |

## Smallest viable data contract

All organization-bound tables carry `organization_id`. Every cross-resource relation uses organization in the lookup and, where practical, a composite FK. Hard deletion of cases/events is outside this gate; erasure uses tombstones or removes referenced private content rather than rewriting history.

### 1. `organizations`

Required columns:

`id`, `slug`, `name`, `status`, `default_timezone`, `created_at`, `updated_at`.

Required constraints/indexes:

- primary key `id`;
- unique, non-null `slug`;
- `status IN ('active','suspended','closed')`;
- non-null `name`, `status`, and timezone.

### 2. `organization_memberships`

Required columns:

`id`, `organization_id`, `user_id`, `role`, `status`, `created_at`, `updated_at`, `revoked_at`.

Required constraints/indexes:

- FK `organization_id -> organizations.id`;
- FK `user_id -> users.id`;
- unique `(organization_id, user_id)`;
- unique `(organization_id, id)` for composite child references;
- `role IN ('owner','admin','manager','resident','worker','auditor')`;
- `status IN ('active','invited','suspended','revoked')`;
- index `(user_id, status)` and `(organization_id, role, status)`.

The existing global `users.role` remains untouched. Authorization must use an active organization membership plus an applicable resource grant; a global `admin` value is not an implicit cross-organization grant.

### 3. `properties`

Required columns:

`id`, `organization_id`, `name`, `external_ref`, `timezone`, `status`, `created_at`, `updated_at`.

Required constraints/indexes:

- FK `organization_id -> organizations.id`;
- unique `(organization_id, id)`;
- unique `(organization_id, external_ref)`; multiple null external references remain allowed;
- `status IN ('active','inactive','archived')`;
- index `(organization_id, status)`.

### 4. `units`

Required columns:

`id`, `organization_id`, `property_id`, `label`, `external_ref`, `status`, `created_at`, `updated_at`.

Required constraints/indexes:

- composite FK `(organization_id, property_id) -> properties(organization_id, id)`;
- unique `(organization_id, id)`;
- unique `(organization_id, property_id, id)` for case references;
- unique `(property_id, label)`;
- unique `(organization_id, property_id, external_ref)`;
- `status IN ('active','inactive','archived')`;
- index `(organization_id, property_id, status)`.

### 5. `resource_grants`

Required columns:

`id`, `organization_id`, `membership_id`, `resource_type`, `resource_id`, `capability`, `granted_by_membership_id`, `expires_at`, `revoked_at`, `created_at`, `updated_at`.

Required constraints/indexes:

- composite FK `(organization_id, membership_id) -> organization_memberships(organization_id, id)`;
- composite FK `(organization_id, granted_by_membership_id) -> organization_memberships(organization_id, id)`, nullable;
- `resource_type IN ('organization','property','unit','case')`;
- `capability IN ('read','contribute','manage','message','media','dispatch','verify','report')`;
- unique `(membership_id, resource_type, resource_id, capability)`;
- index `(organization_id, resource_type, resource_id)`;
- organization-scope rows require `resource_id = organization_id`.

This is the one deliberate database seam: a polymorphic `resource_id` cannot have a portable FK to four tables. The authorization policy must resolve the target with both `organization_id` and `resource_id` before accepting a grant or authorizing access. T11 must reject a forged cross-organization target. If T04 requires database-enforced polymorphic target integrity, it should replace this table with separate property/unit/case grant tables before T05 starts; T05 must not improvise midway.

### 6. `maintenance_cases`

Required columns:

`id`, `organization_id`, `property_id`, `unit_id`, `opened_by_membership_id`, `legacy_report_id`, `title`, `status`, `stage`, `priority`, `version`, `created_at`, `updated_at`, `closed_at`.

Required constraints/indexes:

- unique `(organization_id, id)`;
- composite FK `(organization_id, property_id) -> properties(organization_id, id)`, nullable during unresolved intake;
- composite FK `(organization_id, property_id, unit_id) -> units(organization_id, property_id, id)`, nullable;
- composite FK `(organization_id, opened_by_membership_id) -> organization_memberships(organization_id, id)`, nullable for approved system/channel intake;
- unique nullable FK `legacy_report_id -> reports.id ON DELETE SET NULL`;
- `unit_id IS NULL OR property_id IS NOT NULL`;
- `version >= 0`, default `0`;
- `status IN ('open','resolved','closed','cancelled')`;
- `priority IN ('low','normal','urgent','emergency')`;
- index `(organization_id, status, updated_at)`, `(organization_id, property_id, unit_id)`, and `legacy_report_id`.

`stage` is a versioned application contract rather than a database enum in this gate, avoiding a SQLite table rebuild for every workflow-stage addition. Only the deterministic orchestrator may change `status`, `stage`, or `version`.

### 7. `case_events`

Required columns:

`id`, `organization_id`, `case_id`, `sequence`, `event_type`, `schema_version`, `actor_type`, `actor_membership_id`, `idempotency_key`, `command_hash`, `payload_hash`, `payload_json`, `correlation_id`, `created_at`.

Required constraints/indexes:

- composite FK `(organization_id, case_id) -> maintenance_cases(organization_id, id)`;
- composite FK `(organization_id, actor_membership_id) -> organization_memberships(organization_id, id)`, nullable;
- unique `(case_id, sequence)`;
- unique `(case_id, idempotency_key)`;
- `sequence > 0` and `schema_version > 0`;
- `actor_type IN ('member','system','agent','integration')`;
- `actor_type <> 'member' OR actor_membership_id IS NOT NULL`;
- index `(organization_id, case_id, sequence)` and `correlation_id`;
- reject direct `UPDATE` and `DELETE` with dialect-specific append-only triggers; `maintenance_cases` cannot be hard-deleted while events exist.

`payload_json` must contain typed business facts and opaque evidence references only—no credential, raw private media, or hidden reasoning.

## Transaction and replay contract

For command `(organization_id, case_id, expected_version, idempotency_key, command_hash)`:

1. Begin one database transaction.
2. Load an existing `(case_id, idempotency_key)`. Return its receipt only when `command_hash` and `payload_hash` match; otherwise reject as an idempotency conflict.
3. Guard the projection update with `WHERE organization_id = ? AND id = ? AND version = expected_version`.
4. If exactly one row changes, set `version = expected_version + 1` and append one event with `sequence = expected_version + 1`.
5. Commit projection and event together; any insert/constraint failure rolls back both.
6. Replay events in `(case_id, sequence)` order. The replayed projection version must equal the stored case version.

No model, route, worker, or backfill script may insert an event or mutate the projection outside the case-event repository owned by T09.

## Backwards-compatible migration path

1. **Freeze T04 contract.** Decide resource-grant normalization, case stage vocabulary, ambiguous legacy ownership, and non-enumerating denial behavior.
2. **Expand schema only.** Add the seven tables in a new immutable SQLite Drizzle migration (`0006_*`) and a separately numbered idempotent PostgreSQL migration. Do not alter existing tables in this DDL.
3. **Mirror bootstrap planes.** Add identical table/constraint/index intent to `server/db/schema.ts`, `server/models/schema.sql`, and `server/models/schema.pg.sql`; generate the SQLite snapshot/journal update.
4. **Make SQLite FK behavior explicit.** T05 may own `server/config/database.ts` for the narrowly scoped pragma/assertion and its tests.
5. **Keep schema and data work separate.** T10—not T05—creates an idempotent, batched backfill. A human-selected pilot organization is created first; users receive explicit memberships; owned legacy reports receive one `maintenance_case` and one `legacy_imported` event.
6. **Quarantine ambiguity.** A legacy report with no defensible organization/property owner is not silently assigned. Record it for manual reconciliation.
7. **Deploy compatibility seam.** Existing report routes and response IDs remain. New report creation calls the deterministic compatibility service to create/link one canonical case transactionally; no independent dual writer is allowed.
8. **Reconcile before read cutover.** Compare report counts, unique mappings, event counts, FK checks, and replayed versions. Only then read case timelines from the new spine.
9. **Rollback operationally.** Disable the feature/cutover and return reads to legacy routes. Leave additive tables intact. Production rollback is a new forward migration, never editing or reversing a deployed migration in place.

This follows the database-migrations skill’s expand/migrate/contract rule: additive DDL first, separate backfill, verified cutover, and delayed cleanup.

## SQLite/PostgreSQL parity risks

| Priority | Risk | Required gate |
|---|---|---|
| P0 | Three schema planes can drift (`schema.ts`/journal, SQLite bootstrap, PostgreSQL bootstrap/manual SQL). | T05 owns and changes all planes in one diff; T12 compares tables, columns, FKs, checks, uniques, defaults, indexes, and triggers. |
| P0 | No reviewed script executes the PostgreSQL migration directory; the available Drizzle config is SQLite-only. | Preserve static parity, mark executable PG parity `BLOCKED_DEPENDENCY`, and do not claim production migration readiness. |
| P0 | Cross-organization safety depends on composite keys and active resource grants. | Negative fixtures for cross-org and same-org/unrelated property/case; `foreign_key_check` on SQLite. |
| P0 | Polymorphic grant targets lack portable FKs. | T04 freezes policy-enforced resolution or normalizes grants before T05. |
| P0 | SQLite append-only and PostgreSQL append-only triggers require different SQL. | T12 attempts direct update/delete on both approved harnesses; PostgreSQL remains blocked if no harness exists. |
| P1 | SQLite cannot add many FKs/checks with `ALTER TABLE` and generated rebuilds have been fragile. | Add new tables only; no `users`/`reports` rebuild in T05. |
| P1 | Current parity tests inspect selected text columns, not behavior. | Add constraint/idempotency/replay fixtures; keep the textual test as a cheap gate only. |
| P1 | Text SQLite timestamps and PostgreSQL timestamps can serialize differently. | Normalize UTC at repository boundary and compare semantic timestamps, not raw dialect strings. |
| P1 | A migration count and table inventory are hard-coded. | Update `sqlite-migration-convergence.test.ts` from six to seven and add all seven names plus insert/FK checks. |
| P1 | Unique nullable columns and partial-index syntax differ. | Use portable composite unique constraints in this gate; test multiple null legacy/external references. |

## T05 exclusive ownership recommendation

Commander has confirmed that T05 may own the following for this batch:

Schema and migration sources:

- `server/db/schema.ts`
- `server/db/migrations/0006_<generated-name>.sql`
- `server/db/migrations/meta/_journal.json`
- `server/db/migrations/meta/0006_snapshot.json`
- `server/models/schema.sql`
- `server/models/schema.pg.sql`
- `server/db/migrations/postgres/006_organization_case_foundation.sql`

Runtime prerequisite and builder tests:

- `server/config/database.ts` — only the explicit SQLite FK setting/assertion required by this contract
- `server/tests/sqlite-migration-convergence.test.ts`
- `server/tests/postgres-schema-parity.test.ts`
- new schema/constraint test files named and published by the commander before T05 starts

Not T05-owned:

- legacy data backfill/fixtures: T10;
- case-event repository/transactions/replay: T09;
- authorization service and grant evaluation: T06;
- route/socket/media integration: T07/T08;
- independent migration/event review: T12;
- full regression review: T13.

T05 must stop rather than edit an unlisted bootstrap, route, service, or backfill file. PostgreSQL executable parity remains an explicit blocked dependency even after T05 completes static definitions.

## T05 acceptance evidence expected

- empty SQLite database applies seven journaled migrations;
- all seven new tables, required indexes, FKs, checks, and append-only guards exist;
- current bootstrap is idempotent;
- representative valid rows insert;
- cross-organization composite relations fail;
- duplicate membership, legacy report mapping, event sequence, and idempotency key fail;
- direct event update/delete fail;
- `PRAGMA foreign_key_check` returns no rows;
- static SQLite/PostgreSQL definitions agree;
- all four fresh baseline files remain green;
- no existing table rebuild, destructive DDL, seed/backfill, or source edit outside T05 ownership.

## Typed IPC

```json
{
  "task_id": "T01",
  "state": "accepted",
  "artifact": ".agent-state/centralcoms-upgrade/artifacts/t01-schema-recon.md",
  "evidence": {
    "repository": [
      "three current schema planes identified with file:line receipts",
      "existing cases-name collision identified",
      "six-migration SQLite baseline identified",
      "PostgreSQL migration-runner gap identified"
    ],
    "verification": "4 focused files / 8 tests passed; 6.21 s Vitest duration",
    "source_edits": []
  },
  "decision": "READY_FOR_T04_CONTRACT_DESIGN_WITH_PG_RUNTIME_BLOCKED",
  "unknowns": [
    "T04 choice: polymorphic resource_grants policy seam or normalized grant tables",
    "human-approved pilot organization and ambiguous legacy ownership policy",
    "final maintenance case stage vocabulary",
    "approved executable PostgreSQL harness and migration runner"
  ],
  "dependency": "T04 freezes the contract before T05; T10 owns data backfill; T09 owns event transactions; T12 independently verifies and must report PostgreSQL runtime as BLOCKED_DEPENDENCY until a harness exists",
  "next_action": "Commander reviews/accepts T01, publishes T04, then assigns the exact T05 file list; no source implementation was performed by T01"
}
```

