# T04 Independent Foundation-Contract Review

## Scope receipt

- Reviewed only the command program, T01–T04 artifacts, and `server/config/database.ts`.
- Review dimensions: transaction correctness, schema/auth/event consistency, ownership, testability, and review budget.
- Source/config/schema/migration/test edits: none.
- Decision: **REJECT the joint T05/T06/T09 launch until the findings below are resolved in T04.**

## P0 findings
### P0-1 — Event replay cannot reconstruct the stored projection

Evidence:

- The stored event columns contain `payload_json` and hashes but no projection delta: T04:91-105.
- The command carries `projection` separately from `payload`: T04:131-151.
- The append algorithm stores an event but never requires the projection patch to be included in its durable payload: T04:154-162.
- Replay must reproduce status, stage, priority, title, and version: T04:164.

Impact: after restart, T09 cannot deterministically recover title/status/stage/priority from the event stream. A hash proves equality but cannot reconstruct content. Free-form `eventType` and `payload` also leave no frozen reducer contract.

Required contract correction:

1. Persist canonical `projection_patch_json` in every event, or freeze a canonical payload envelope containing the patch.
2. Include that content in `command_hash`/`payload_hash`.
3. Freeze the initial event/projection, known event types, reducer version, unknown-event behavior, and close-time derivation.
4. Require replay tests to start without reading mutable projection fields, then compare the result to `maintenance_cases`.

### P0-2 — SQLite transaction isolation is not connection-wide

Evidence:

- T04 requires only serialization of transaction callbacks: T04:121-127.
- SQLite has one shared connection and the exported adapter can execute ordinary queries at any time: `server/config/database.ts:26-43`, `173-234`, `257-274`.
- `withTransaction` accepts an async callback, so the event loop can run an unrelated pool query while that callback awaits.

Impact: serializing only `withTransaction` calls allows a non-transaction `query()` to execute inside another logical transaction, contaminating its commit or rollback. This violates atomic case/event ownership.

Required contract correction:

1. All SQLite operations—not only transaction callbacks—must use one connection gate.
2. A transaction-bound client must bypass that gate only for its owning callback, reject use after completion, and reject nesting.
3. Define behavior for callback cancellation/throw and commit/rollback failure.
4. Add a test where an ordinary query races an awaited transaction and prove it cannot become part of that transaction.

### P0-3 — The authorization input cannot evaluate the frozen grant rules

Evidence:

- `ResourceContext` omits property ID, unit ID, active grants, and resolved ancestry: T04:185-192.
- Yet access depends on applicable organization/property/case grants and list predicates: T04:208-221.
- No frozen `QueryScope` shape or parameter-binding contract exists, despite the rule that list filtering occurs in SQL: T04:217.
- T01 deliberately leaves polymorphic target integrity to authorization.

Impact: T06 must invent hidden database lookups or incompatible context types. It cannot prove property-to-unit-to-case inheritance, cross-organization target rejection, or safe list scoping from the published interface.

Required contract correction:

1. Freeze a server-resolved `AuthorizationContext` containing active organization, membership, resource ancestry, participant/assignment facts, and validated grants.
2. Freeze `QueryScope` as structured predicates plus bound values; raw caller-provided SQL is forbidden.
3. Specify grant inheritance explicitly: organization, property, unit, case, and no implicit sibling access.
4. Make target resolution and authorization one organization-scoped repository operation.

## P1 findings
### P1-1 — Grant and organization liveness is incomplete

`expires_at` and `revoked_at` exist (T04:71-81), but authorization invariants and T06 acceptance do not require `organization.status = active`, `membership.status = active`, `revoked_at IS NULL`, and unexpired grants. Freeze one clock/UTC rule and test boundary equality, revocation, suspension, and expiry.

### P1-2 — Audit behavior contradicts the pure policy surface

T04 says every privileged decision emits an audit envelope (T04:221), but `PolicyDecision` defines no envelope/correlation fields and B1 has no audit sink/table (T04:197-205). Define a content-minimized returned `AuditEnvelope` and defer persistence explicitly, or add an owned sink. T06 must not create an undeclared side effect.

### P1-3 — Referential delete behavior is not frozen

T04 specifies FKs but not `ON DELETE` actions for the seven tables (T04:41-103). This can diverge across Drizzle, SQLite bootstrap, and PostgreSQL. Freeze `RESTRICT`, `SET NULL`, or `CASCADE` per edge; cases/events and organization audit history must not disappear through an accidental cascade.

### P1-4 — T09 launch order conflicts with the command graph

The command program declares T09 dependent on T05, while T04 allows T05/T06/T09 to work in parallel and says T09 consumes `withTransaction`: T04:247-271. Launch T05 and T06 first, then T09 after T05 publishes and passes the transaction interface, or publish a commander-owned compileable interface before parallel launch.

### P1-5 — Test ownership is not exclusive enough

T05 owns generic “schema, constraint, migration, transaction tests” and T09 owns generic “case-event tests”: T04:249-269. Publish exact test filenames and fixture-helper ownership before launch. Shared database fixtures remain commander-owned or are integrated serially.

### P1-6 — The declared review budget is not credible without a split

Seven tables duplicated across Drizzle, SQLite bootstrap/migration, PostgreSQL bootstrap/migration, transaction code, and tests are likely to exceed the 900 human-authored-line batch cap. T04 exempts generated snapshot lines only (T04:261). The commander must either split T05 into serial review units or explicitly raise the review budget and reviewer allocation; workers cannot self-exempt.

### P1-7 — PostgreSQL transaction behavior is unverified

T04 correctly labels PostgreSQL runtime parity `BLOCKED_DEPENDENCY` (T04:275-284). Keep the PostgreSQL path disabled from promotion and state that static SQL/type review does not verify same-client commit, rollback, release, or concurrency behavior.

## Launch gate

Re-review may ACCEPT when:

1. P0-1 through P0-3 are incorporated into the frozen contract.
2. P1 liveness, audit, delete, dependency, ownership, and budget decisions are explicit.
3. PostgreSQL runtime remains blocked and unpromoted until executable evidence exists.
4. Exact mutable files and verifier-owned files are published without overlap.

## Typed IPC

```json
{
  "task_id": "T04-REVIEW",
  "state": "rejected",
  "artifact": ".agent-state/centralcoms-upgrade/artifacts/t04-contract-review.md",
  "evidence": {
    "p0": 3,
    "p1": 7,
    "reviewed": ["command-program.md", "t01-schema-recon.md", "t02-auth-recon.md", "t03-test-recon.md", "t04-foundation-contract.md", "server/config/database.ts"],
    "source_edits": []
  },
  "decision": "REJECT_T05_T06_T09_LAUNCH",
  "unknowns": ["final projection-envelope/reducer contract", "grant inheritance/query-scope shape", "revised review budget"],
  "dependency": "Commander patches and republishes T04; replacement independent reviewer rechecks before mutable launch",
  "next_action": "Resolve P0/P1 contract findings only; do not start T05, T06, or T09"
}
```
