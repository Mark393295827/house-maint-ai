# T03 Test and Migration Reconnaissance

## Scope and state

- Task: `T03`
- State: `accepted`
- Territory: read-only inspection of package scripts, test configuration, test database setup, schema parity/migration fixtures, and report/message/payment regressions.
- Only write: this artifact.
- Source/config/test edits: none.
- External providers, credentials, production databases, and deployment: not used.

## Baseline receipts and command cost

| Command | Purpose | Result | Cost |
|---|---|---|---:|
| `npx vitest run --config vitest.config.ts server/tests/database-adapter.test.ts server/tests/postgres-schema-parity.test.ts server/tests/sqlite-migration-convergence.test.ts server/tests/sqlite-payment-bootstrap.test.ts server/tests/payments.webhook.test.ts tests/claw_cas.test.ts tests/ai_planning.test.ts --reporter=dot` | Relevant pre-change schema, adapter, payment, lifecycle-CAS, and resource-denial baseline | PASS: 7 files, 24 tests | 25.1 s tool wall; 20.67 s Vitest |
| `npx vitest list --config vitest.config.ts` | Enumerate the Node suite | BUDGET STOP: timed out; no source mutation | 34.0 s |
| `rg`/PowerShell declaration count | Bounded replacement for the timed-out list | 45 Node test files / 156 declarations; 35 UI test files / 181 declarations | 1.7 s |
| Targeted `rg` and file reads | Locate harness, schema, denial, payment, and migration evidence | PASS | individual calls 0.5–2.5 s |

The list timeout is not a test failure. It shows that importing the entire suite merely to enumerate it is too expensive for a reconnaissance gate. T13 should run the declared scripts directly.

## Current harness evidence

1. Root scripts split Node and UI tests:
   - `package.json:17-20` defines `test`, `test:unit:node`, `test:unit:ui`, and `test:e2e`.
   - `package.json:10-11` defines build and lint.
   - `server/package.json:8-16` has a separate build/test surface.
2. The Node harness is SQLite-first and serial:
   - `vitest.config.ts:6-21` forces SQLite/Redis mock, selects server/tests/scripts, and uses `tests/setup.ts`.
   - `vitest.config.ts:26` disables file parallelism because the current database/port fixtures are not concurrency-safe.
   - `tests/setup.ts:8-11` forces test mode, in-memory SQLite, and a test JWT secret.
3. UI tests are a separate jsdom suite:
   - `vite.config.ts:41-43` uses jsdom, `src/**` tests, and `src/test/setup.ts`.
4. The canonical SQLite helper is useful:
   - `server/tests/setup.ts:7-11` creates `SQLiteFallback(':memory:')` and initializes the real SQLite schema.
   - `server/config/database.ts:52-66` loads `schema.sql` and `blackboard.sql`.
   - `server/config/database.ts:77-124` contains compatibility convergence for existing analytics/payment columns.
5. One older helper is intentionally lossy:
   - `tests/testHelper.ts:6` embeds a reduced `MASTER_SCHEMA`.
   - `tests/testHelper.ts:125-160` strips `RETURNING` and, for updates, may return the latest row rather than the row selected by the original predicate.
   - Treat tests using this helper as legacy HTTP compatibility evidence, not migration, transaction, replay, or concurrency proof.
6. Integration cleanup is incomplete for the proposed foundation:
   - `server/tests/integration/setup.ts:15` supports SQLite only.
   - `server/tests/integration/setup.ts:36` clears only eight legacy tables.
   - New organization/case-event tests should prefer a fresh isolated database per file; do not extend a global shared cleanup list unless the test truly needs a shared app instance.

## Existing regression evidence

| Area | Existing proof | Limit |
|---|---|---|
| Guarded DB update | `server/tests/database-adapter.test.ts:5-26` proves a failed guarded `UPDATE ... RETURNING` produces zero rows | One SQLite adapter case only |
| SQLite migration | `server/tests/sqlite-migration-convergence.test.ts:19-265` migrates an empty DB, inserts current rows, and runs `foreign_key_check` | No legacy organization/case-event backfill or rerun/replay |
| PostgreSQL parity | `server/tests/postgres-schema-parity.test.ts:30-79` textually checks table columns/migration SQL | It does not execute migrations or behavior against PostgreSQL |
| Resource denial | `tests/ai_planning.test.ts:83-117` denies an unrelated user and owner dispatch bypass | Ownership-only; no organization, membership, same-org/different-resource matrix |
| RBAC | `server/tests/rbac.test.ts:20-45` checks roles on metrics | Not resource-scoped authorization |
| Lifecycle races | `tests/claw_cas.test.ts:103-389` covers diagnosis/planning/vendor guarded transitions and effect ordering | Legacy reports/claws only; no canonical event append/replay |
| Payment | `server/tests/payments.webhook.test.ts:50-105` covers paid retry reconciliation and transition failure | The test disables webhook verification at line 29; retain only as internal reconciliation regression |
| Production payment config | `server/tests/payments.production-config.test.ts:51-59` rejects disabled verification in production | Not official provider-certificate verification; outside this foundation slice |
| Messages/notifications | No feature-level route suite found by bounded search | Must add resource/organization denial tests before organization rollout |

## Smallest deterministic implementation matrix

The matrix is intentionally narrower than a full CentralComs runtime. It proves the approved foundation gate only.

### A. Organization isolation and same-organization resource denial

Create one canonical fixture with:

- organizations `org-a`, `org-b`;
- users `a-owner`, `a-manager`, `a-member`, `a-unrelated`, `b-manager`, `b-member`;
- one property and two cases in `org-a`, one case in `org-b`;
- one report/message/media relation per case;
- explicit memberships and roles.

For every protected repository/policy function and each integrated HTTP boundary, use this table:

| Actor/resource relation | Read | Mutate | Expected |
|---|---:|---:|---|
| authorized member, allowed role, same case | yes | role-specific | allow |
| valid user, different organization | yes | yes | deny without revealing existence |
| valid user, same organization, unrelated case/property | yes | yes | deny |
| membership revoked | yes | yes | deny immediately |
| administrator without explicit organization scope | yes | yes | deny |
| legacy owner/assigned worker mapped to the same organization | existing permitted action | existing permitted action | preserve |

Minimum assertions:

- denial status/body is identical for cross-org and same-org unrelated resources;
- the denied request causes zero case events, messages, media reads, outbox rows, or state changes;
- every repository query includes organization and resource predicates, rather than loading then filtering in application code;
- manager-wide listing returns only the active organization.

Suggested test territories:

- T11 owns adversarial read-only review and denial scenarios.
- T13 runs the accepted HTTP/socket/media regression matrix after T06-T08 integration.

### B. Case-event append, replay, and idempotency

Use the real `SQLiteFallback` or direct `better-sqlite3` database, not `MASTER_SCHEMA/mockQuery`.

Minimum cases:

1. Append event 1 to case version 0 → event sequence 1 and case version 1 commit together.
2. Append with stale expected version → conflict; no event and no projection change.
3. Reuse the same idempotency key with identical normalized command/payload hash → return the original receipt; one event only.
4. Reuse the same key with a different payload hash → conflict; no second event.
5. Two concurrent commands with the same expected version → exactly one succeeds.
6. Replay ordered events from an empty projection → same state, stage, version, and legacy report mapping.
7. Replay the same event set twice → same projection; no duplicate effects.
8. Invalid transition or wrong organization/case pair → no append.
9. Simulated failure between event/projection/outbox writes → transaction rolls back all three.
10. Event content retains reason/evidence references and hashes but excludes credentials, raw media, and hidden reasoning.

T12 must independently inspect uniqueness constraints and transaction boundaries; passing service mocks alone is insufficient.

### C. Migration and backfill

SQLite:

1. Empty database → all migrations → expected organization, membership, case, event, idempotency, mapping, and indexes.
2. Current pre-foundation schema with representative users/reports/workers/messages/orders → migrations → deterministic default organization/membership/backfill.
3. Rerun migrations/bootstrap → no changed counts or duplicated organization/case/event rows.
4. `foreign_key_check` empty; uniqueness and `NOT NULL` constraints exercised.
5. Ambiguous/unowned legacy records follow the published T10 quarantine/manual-review rule rather than being silently assigned.

PostgreSQL:

1. Static schema/migration parity remains a cheap first gate.
2. T12 should execute the migration and the same insert/constraint transaction fixture against an ephemeral PostgreSQL instance only if the approved local/CI harness exists.
3. If no executable PostgreSQL harness exists, report `BLOCKED_DEPENDENCY`; textual regex parity must not be labeled runtime parity.

### D. Legacy compatibility

Keep the existing URLs, response shapes, report IDs/statuses, payment callback handling, worker access, and message contracts.

Minimum checks:

- legacy report create produces one mapped case/intake event without changing the existing response;
- existing report owner and assigned-worker planning permissions remain green;
- unrelated-user denial remains green;
- generic owner dispatch bypass remains denied;
- legacy claws skip `workflow_engine_version = policy` records;
- payment retry still converges a legacy report exactly once;
- existing message/report participant access remains, now additionally organization-scoped;
- UI API/auth/socket unit suites remain unchanged and green.

## Verification territories

### T12 — migration/event checker

Read-only, independent of T05/T09/T10 authors.

Required checks:

1. Inspect only the integrated schema, migrations, event repository/service, backfill utility, and their tests.
2. Run empty and legacy SQLite migration fixtures, rerun/idempotency, `foreign_key_check`, uniqueness, stale-version, same-key/same-payload, same-key/different-payload, rollback, and replay.
3. Compare SQLite and PostgreSQL definitions for tables, columns, foreign keys, unique constraints, partial indexes, defaults, timestamps, and transaction assumptions.
4. Execute PostgreSQL behavior only through an approved ephemeral harness; otherwise return `BLOCKED_DEPENDENCY`, not PASS.
5. Confirm T10 backfill preserves IDs, creates no duplicate mappings/events, and quarantines ambiguous data.
6. Emit no source edits and do not self-certify T05/T09/T10.

Acceptance: zero orphan rows, zero duplicate events/effects, deterministic replay, idempotent rerun, stale writes rejected, and no unproved PostgreSQL runtime claim.

### T13 — regression/mission checker

Read-only, independent of T07/T08 and the integrated batch.

Run in this order:

1. New organization/resource HTTP denial suites plus report/message/media/realtime tests.
2. New case compatibility suite.
3. Existing focused baseline:
   `server/tests/database-adapter.test.ts`,
   `server/tests/postgres-schema-parity.test.ts`,
   `server/tests/sqlite-migration-convergence.test.ts`,
   `server/tests/sqlite-payment-bootstrap.test.ts`,
   `server/tests/payments.webhook.test.ts`,
   `tests/claw_cas.test.ts`,
   `tests/ai_planning.test.ts`.
4. `npm run test:unit:node`.
5. `npm run test:unit:ui`.
6. `npm run build`.
7. Lint changed files first; run full `npm run lint` if budget remains, separating pre-existing warnings from new errors.
8. Review `git diff --check`, changed-file territory, secret patterns, response-shape compatibility, and absence of provider/network calls.

Stop immediately on authorization bypass, event/outbox duplication, migration data loss, dual writer behavior, payment authority expansion, or a change outside the 25-file/900-line review budget.

## Decision and dependencies

- Decision: `READY_FOR_T04_CONTRACT_DESIGN`.
- Dependency: T04 must freeze organization/membership semantics, same-org resource relation, canonical event/idempotency contracts, legacy mapping, and ambiguous-backfill policy before T05-T10 write tests.
- Unknowns:
  1. Whether an approved ephemeral PostgreSQL test service is available.
  2. The exact legacy-row policy when organization ownership cannot be inferred.
  3. Whether denied resources standardize on `404` or `403`; one non-enumerating contract must be frozen.
  4. Whether the case projection is stored or replay-only; tests can support either after T04 freezes the contract.
- Next action: commander accepts T01-T03, then publishes T04; mutable builders remain blocked until that contract is verified.

## Typed IPC

```json
{
  "task_id": "T03",
  "state": "accepted",
  "artifact": ".agent-state/centralcoms-upgrade/artifacts/t03-test-recon.md",
  "evidence": {
    "baseline": "7 files, 24 tests passed",
    "harness": "SQLite-first serial Node suite plus separate jsdom UI suite",
    "commands": [
      "relevant Vitest baseline: PASS",
      "Vitest list: bounded timeout",
      "static suite declaration count: PASS"
    ],
    "source_edits": []
  },
  "decision": "READY_FOR_T04_CONTRACT_DESIGN",
  "unknowns": [
    "ephemeral PostgreSQL availability",
    "ambiguous legacy ownership policy",
    "non-enumerating denial status contract",
    "projection storage contract"
  ],
  "dependency": "T04 contract freeze before T05-T10; T12 checks T05/T09/T10; T13 checks integrated T07/T08 batch and full regression",
  "next_action": "Commander review and contract publication; no source implementation from T03"
}
```
