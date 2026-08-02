# T04 Frozen Foundation Contract

Status: commander-published; independent approval required before mutable source work.

Run: `centralcoms-foundation-20260729-01`

## 1. B1 objective and stop boundary

B1 establishes an additive organization/case foundation. It does not claim that the current application is multi-organization ready.

B1 includes:

- seven additive durable tables;
- dialect-safe transaction access;
- a deny-by-default authorization policy and principal resolver;
- an append-only case-event repository with stored projection, replay, and idempotency tests;
- schema/bootstrap/static parity and full regression evidence.

B1 excludes:

- existing HTTP route conversion;
- Socket.IO and media authorization conversion;
- automatic production backfill;
- live channel, PMS, payment, or external effects;
- second-organization rollout.

A second organization remains prohibited until the B2 HTTP, realtime, and media authorization gates pass.

## 2. Frozen identifiers and vocabulary

- All new primary and foreign IDs are positive integers.
- Organization, membership, property, unit, case, event, and grant IDs are server-generated.
- `maintenance_cases` is the canonical case table. The existing diagnostic `cases` table is not renamed or reused.
- Case projection is stored in `maintenance_cases`; `case_events` is the immutable history.
- Case status v1: `open | resolved | closed | cancelled`.
- Case stage v1: `intake | diagnosis | resolution | dispatch | repair | verification | closed`.
- Priority v1: `low | normal | urgent | emergency`.
- Organization role v1: `owner | admin | manager | resident | worker | auditor`.
- Organization admins are organization-scoped. Platform support is out of scope and receives no implicit bypass.

## 3. Frozen seven-table data contract

The detailed column and index evidence is in T01. T05 implements the following minimum contract identically across Drizzle, SQLite bootstrap/migration, and PostgreSQL bootstrap/forward migration.

### `organizations`

`id`, unique `slug`, `name`, `status`, `default_timezone`, `created_at`, `updated_at`.

Checks: status is `active | suspended | closed`.

### `organization_memberships`

`id`, `organization_id`, `user_id`, `role`, `status`, `created_at`, `updated_at`, nullable `revoked_at`.

Constraints: unique `(organization_id,user_id)` and `(organization_id,id)`; FKs to organization and user.

Checks: frozen roles above; status is `active | invited | suspended | revoked`.

### `properties`

`id`, `organization_id`, `name`, nullable `external_ref`, `timezone`, `status`, `created_at`, `updated_at`.

Constraints: unique `(organization_id,id)` and `(organization_id,external_ref)`; organization FK.

### `units`

`id`, `organization_id`, `property_id`, `label`, nullable `external_ref`, `status`, `created_at`, `updated_at`.

Constraints: composite property FK, unique `(organization_id,id)`, unique `(organization_id,property_id,id)`, unique `(property_id,label)`.

### `resource_grants`

`id`, `organization_id`, `membership_id`, `resource_type`, `resource_id`, `capability`, nullable `granted_by_membership_id`, nullable `expires_at`, nullable `revoked_at`, `created_at`, `updated_at`.

Resource types: `organization | property | unit | case`.

Capabilities: `read | contribute | manage | message | media | dispatch | verify | report`.

Constraints: organization-scoped membership/grantor FKs; unique `(membership_id,resource_type,resource_id,capability)`.

The polymorphic target deliberately has no portable FK. Both grant creation and authorization must resolve the named target with the same `organization_id`; a missing or cross-organization target is rejected. Organization grants require `resource_id = organization_id`.

### `maintenance_cases`

`id`, `organization_id`, nullable `property_id`, nullable `unit_id`, nullable `opened_by_membership_id`, nullable unique `legacy_report_id`, `title`, `status`, `stage`, `priority`, `version`, `created_at`, `updated_at`, nullable `closed_at`.

Constraints: organization-scoped property/unit/membership FKs; report FK; `version >= 0`; `unit_id` requires `property_id`.

Only the case-event repository may change status, stage, priority, version, or closed time after creation.

### `case_events`

`id`, `organization_id`, `case_id`, `sequence`, `event_type`, `schema_version`, `reducer_version`, `actor_type`, nullable `actor_membership_id`, `idempotency_key`, `command_hash`, `payload_hash`, `projection_patch_json`, `payload_json`, nullable `correlation_id`, `created_at`.

Constraints:

- organization-scoped case/member FKs;
- unique `(case_id,sequence)`;
- unique `(case_id,idempotency_key)`;
- positive sequence/schema version;
- reducer version equals `1` in B1;
- actor type `member | system | agent | integration`;
- member actors require a membership;
- dialect-specific triggers reject direct update/delete.

Event types v1 are:

`case_opened | legacy_imported | case_updated | case_stage_changed | case_resolved | case_closed | case_cancelled | case_reopened`.

`projection_patch_json` is canonical JSON containing only `title`, `status`, `stage`, `priority`, and `closedAt`. `payload_json` contains typed facts and opaque evidence references only—never credentials, raw private media, or hidden model reasoning. Both canonical documents participate in the command hash; `payload_hash` covers the complete durable event envelope.

`case_opened` and `legacy_imported` must contain a full initial projection. Other events contain the complete changed projection fields. `case_closed` requires status/stage `closed` and a non-null close time. `case_reopened` requires status `open`, a non-closed stage, and `closedAt: null`.

Unknown schema versions, reducer versions, event types, fields, or invalid event/patch combinations fail replay closed.

### Referential deletion rules

Physical deletion is not a B1 application action for organizations, memberships, properties, units, cases, or events. Lifecycle status/revocation is used instead.

- organization to every new organization-bound row: `RESTRICT`;
- user to membership: `RESTRICT`;
- membership to grant, opened case, or actor event: `RESTRICT`;
- property to unit or case: `RESTRICT`;
- unit to case: `RESTRICT`;
- case to event: `RESTRICT`;
- legacy report to maintenance case: `SET NULL`.

T05 mirrors these actions across all schema planes and tests them. No new audit/history edge uses cascade deletion.

## 4. Database transaction interface

T05 adds and exports:

```ts
export interface TransactionClient {
  query<T = unknown>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
}

export function withTransaction<T>(
  work: (client: TransactionClient) => Promise<T>,
): Promise<T>;
```

Requirements:

- Every SQLite operation, including ordinary exported `query()` calls and initialization, enters one connection-wide FIFO gate.
- SQLite `withTransaction` acquires that gate once, uses `BEGIN IMMEDIATE`, and supplies an active transaction client whose queries execute directly on the owned connection without reacquiring the gate.
- The transaction client rejects nested transactions and every use after commit/rollback.
- While a transaction callback is awaiting, unrelated ordinary queries remain queued and cannot become part of that transaction.
- PostgreSQL acquires one pool client, runs `BEGIN`, the callback, and `COMMIT`/`ROLLBACK` on that same client, then releases it.
- Callback rejection/cancellation triggers one rollback and rejects with the callback error. Commit failure attempts rollback and rejects. A rollback failure is preserved with the original error; no path reports success after commit/rollback failure.
- Nested transactions are rejected in B1 for both dialects.
- Application code must not emulate a transaction with separate pool-level `query('BEGIN')` calls.
- SQLite initialization enables and tests `PRAGMA foreign_keys = ON`.

## 5. Case-event command contract

```ts
interface AppendCaseEventCommand {
  organizationId: number;
  caseId: number;
  expectedVersion: number;
  idempotencyKey: string;
  eventType: string;
  actor: {
    type: 'member' | 'system' | 'agent' | 'integration';
    membershipId?: number;
  };
  projection: {
    status?: 'open' | 'resolved' | 'closed' | 'cancelled';
    stage?: 'intake' | 'diagnosis' | 'resolution' | 'dispatch' | 'repair' | 'verification' | 'closed';
    priority?: 'low' | 'normal' | 'urgent' | 'emergency';
    title?: string;
    closedAt?: string | null;
  };
  payload: Record<string, unknown>;
  correlationId?: string;
}
```

T09 canonicalizes command and payload JSON, computes hashes server-side, and executes one `withTransaction` callback:

1. Resolve existing `(case_id,idempotency_key)`.
2. Matching command and payload hashes return the existing receipt.
3. A reused key with different hashes returns an idempotency conflict.
4. Guard projection update by organization, case ID, and expected version.
5. Exactly one updated row advances version by one.
6. Append exactly one event whose sequence equals the new version and whose durable event envelope contains the canonical projection patch.
7. Any error rolls back projection and event.

Reducer v1 begins with no projection and accepts only a full `case_opened` or `legacy_imported` event at sequence 1. Replay then applies frozen event/patch rules in sequence order without reading mutable projection fields. It rejects gaps, duplicates, unknown schema/reducer versions, unknown event types/fields, and invalid close/reopen derivation. The final replay must equal the stored projection for status, stage, priority, title, closed time, and version.

Models, routes, workers, and backfill utilities cannot directly insert events or mutate the protected projection fields.

## 6. Authorization contract

```ts
type ActorKind = 'user' | 'provider' | 'system';
type OrgRole = 'owner' | 'admin' | 'manager' | 'resident' | 'worker' | 'auditor';

interface Principal {
  actorKind: ActorKind;
  userId?: number;
  organizationId: number;
  membershipId?: number;
  role: OrgRole | 'provider' | 'system';
  workerId?: number;
  policyVersion: 'foundation-v1';
  compatibilityMode: 'none' | 'legacy-single-org';
}

interface ResolvedResource {
  type: 'organization' | 'property' | 'unit' | 'case' | 'report';
  id: number;
  organizationId: number;
  propertyId?: number;
  unitId?: number;
  caseId?: number;
  ownerUserId?: number;
  assignedWorkerUserId?: number;
  participantUserIds?: number[];
}

interface ResolvedGrant {
  organizationId: number;
  membershipId: number;
  resourceType: 'organization' | 'property' | 'unit' | 'case';
  resourceId: number;
  capability: Action;
  expiresAt?: string;
}

interface AuthorizationContext {
  principal: Principal;
  organizationStatus: 'active' | 'suspended' | 'closed';
  membershipStatus: 'active' | 'invited' | 'suspended' | 'revoked';
  membershipRevokedAt?: string;
  evaluatedAt: string;
  resource: ResolvedResource;
  validatedGrants: ResolvedGrant[];
}

type Action = 'read' | 'contribute' | 'manage' | 'message' | 'media'
  | 'dispatch' | 'verify' | 'report';

interface QueryScope {
  organizationId: number;
  access: 'none' | 'organization' | 'resource-set' | 'owner-or-assigned';
  propertyIds: number[];
  unitIds: number[];
  caseIds: number[];
  ownerUserId?: number;
  assignedWorkerUserId?: number;
}

interface AuditEnvelope {
  policyVersion: 'foundation-v1';
  evaluatedAt: string;
  correlationId: string;
  actorKind: ActorKind;
  userId?: number;
  organizationId: number;
  membershipId?: number;
  action: Action | 'unknown';
  resourceType: ResolvedResource['type'];
  resourceId: number;
  allowed: boolean;
  reason: PolicyDecision['reason'];
}

interface PolicyDecision {
  allowed: boolean;
  reason: 'explicit_rule' | 'unauthenticated' | 'organization_mismatch'
    | 'not_a_participant' | 'role_forbidden' | 'resource_unresolved'
    | 'action_unrecognized';
  status: 200 | 401 | 403 | 404;
  queryScope?: QueryScope;
  obligations: Array<'audit' | 'redact_contact' | 'redact_location'
    | 'signed_media_url' | 'approval_required' | 'minimize_event_payload'>;
  audit: AuditEnvelope;
}
```

Invariants:

- unknown action/resource/membership is denied;
- durable membership and target lookup—not JWT role or client IDs—establish authority;
- organization and membership must both be active; revoked memberships are denied immediately;
- a grant is live only when `revoked_at IS NULL` and `expires_at IS NULL OR expires_at > evaluatedAt`; equality is expired; all comparisons use UTC;
- organization equality is evaluated before role;
- organization membership alone does not grant property/case access;
- explicit grants or current owner/participant/assigned-worker relations establish resource access;
- an organization grant applies to descendants in that organization; a property grant applies to its units and cases; a unit grant applies to that unit and its cases; a case grant applies only to that case; grants never flow upward or to siblings;
- grant target resolution, ancestry, liveness, and authorization context loading occur in one organization-scoped repository operation;
- managers/admins require applicable organization/property/case scope;
- assigned operators use an explicit case grant;
- list scopes are structured bound values from `QueryScope`; raw caller-provided SQL and post-query filtering are forbidden;
- absent and unauthorized object reads return the same 404 contract;
- authenticated categorical action denial returns 403; invalid authentication returns 401;
- historical messages never create authority;
- every evaluation returns a content-minimized audit envelope. T06 is pure and does not persist it; B2 owns an approved audit sink.

Active organization resolution:

1. An optional numeric `X-Organization-Id` is a hint only.
2. The server loads an active membership for that user and organization.
3. Without the header, fallback is allowed only when `AUTHZ_LEGACY_SINGLE_ORG=true`, exactly one active organization exists, and the user has exactly one active membership in it.
4. Every other ambiguity fails closed.

Existing worker rows may map to active worker memberships during compatibility backfill. New users may self-apply, but application never creates an operational worker membership without organization approval.

The public worker directory remains a separate sanitized publication surface. It conveys no operational organization, location, offer, or case authority.

## 7. Compatibility and backfill contract

- B1 schema migrations contain DDL only.
- T10 owns a separate idempotent backfill utility; dry-run is the default.
- The utility requires an explicit pilot organization slug/name and produces before/after/quarantine receipts.
- It creates one membership per unambiguous existing user and one maintenance case plus `legacy_imported` event per unambiguous report.
- Existing `users.role`, report IDs, routes, statuses, responses, and legacy reads remain intact.
- Ambiguous/unowned records are quarantined for manual reconciliation and are never silently assigned.
- Re-running produces no duplicate membership, case mapping, or event.
- Cutover is feature-gated; rollback returns reads to legacy behavior and leaves additive tables intact.

Media, Socket.IO, and existing HTTP routes are not made multi-organization safe by B1. B2 must add owned media records, protected reads, scoped rooms/events, and route-level SQL scoping before a second organization is enabled.

## 8. Mutable ownership and serial review units for B1

### T05A — schema and migration builder

Owns only:

- `server/db/schema.ts`
- `server/db/migrations/0006_<generated>.sql`
- `server/db/migrations/meta/_journal.json`
- `server/db/migrations/meta/0006_snapshot.json`
- `server/models/schema.sql`
- `server/models/schema.pg.sql`
- `server/db/migrations/postgres/006_organization_case_foundation.sql`
- `server/tests/foundation-schema.test.ts`
- `server/tests/sqlite-migration-convergence.test.ts`
- `server/tests/postgres-schema-parity.test.ts`

Generated snapshot lines are outside the 900 human-authored-line cap only when accompanied by a generator receipt and independent structural verification.

### T05B — transaction adapter builder

Starts only after T05A is integrated.

Owns only:

- `server/config/database.ts`
- `server/tests/database-transactions.test.ts`

It may not change schema, migration, route, event, or authorization files.

### T06 — authorization-policy builder

May build in parallel with T05A from the frozen contract, but integrates after T05B.

Owns only:

- `server/services/authorization/contracts.ts`
- `server/services/authorization/repository.ts`
- `server/services/authorization/principal.ts`
- `server/services/authorization/policy.ts`
- `server/services/authorization/scopes.ts`
- `server/services/authorization/compatibility.ts`
- `server/middleware/resourceAuthorization.ts`
- `server/tests/authorization-policy.test.ts`
- `server/tests/authorization-compatibility.test.ts`

It does not edit current auth, route, socket, schema, database adapter, or shared test-helper files.

### T09 — case-event builder

Starts only after T05B publishes and passes the transaction interface.

Owns only:

- `server/services/case-events/contracts.ts`
- `server/services/case-events/canonicalJson.ts`
- `server/services/case-events/reducer.ts`
- `server/services/case-events/repository.ts`
- `server/services/caseEvents.ts`
- `server/tests/case-events.test.ts`
- `server/tests/case-event-replay.test.ts`

It consumes `withTransaction` and does not edit database, schema, authorization, route, socket, or shared test-helper files.

Each test file keeps any small fixture local. No mutable shared foundation fixture is authorized in B1.

Integration order is T05A → T05B → T06 → T09. Each is a separate review unit capped at 900 human-authored changed lines and 12 files. The full B1 program remains capped at 25 source/generated code, migration, and test files; command/state artifacts are review receipts rather than runtime source.

## 9. B1 acceptance and independent gates

T05A:

- empty and current SQLite schemas converge;
- seven tables, FKs, uniques, checks, indexes, and append-only triggers exist;
- cross-organization composite relations fail;
- direct event update/delete fails;
- FK check is empty;
- static PostgreSQL parity passes;
- PostgreSQL runtime parity remains `BLOCKED_DEPENDENCY`; no foundation feature is promoted on the PostgreSQL path.

T05B:

- transaction commit, callback rejection, commit failure, rollback failure, nested-use rejection, use-after-close rejection, and serialization tests pass;
- an ordinary SQLite query racing an awaited transaction stays outside that transaction;
- PostgreSQL transaction code compiles and is statically reviewed, but same-client runtime behavior remains blocked without the approved harness.

T06:

- default deny, organization mismatch, same-org unrelated resource, organization/membership liveness, revoked/expired grant boundaries, grant-target/ancestry resolution, no sibling/upward inheritance, structured query scopes, content-minimized audit envelopes, 401/403/404 mapping, header verification, and compatibility fail-closed tests pass.

T09:

- append, stale version, concurrent expected version, identical retry, conflicting retry, rollback, full initial projection, projection-patch hashing, close/reopen derivation, replay without reading mutable projection, gap/duplicate/unknown reducer, organization mismatch, and sensitive-payload rejection tests pass.

Integrated:

- focused tests, full Node/UI unit suites, build, lint, diff/secret scans pass;
- no current route, socket, media, payment, or external behavior changes;
- T11/T12/T13 independently review security, migrations/events, and regressions;
- no B2 or production promotion without a new approved integration gate.

Static SQL/type comparison is never reported as PostgreSQL runtime verification. Until an executable harness exists, the new case-spine path remains unpromoted for PostgreSQL and the checker reports `BLOCKED_DEPENDENCY`.

## 10. Recovery

Reject one owned workstream at a time. Do not modify unrelated user work or deployed migrations. Keep legacy paths active, leave additive tables unused when disabled, and use a new forward migration for any later production correction.
