# T02 — Authorization-Surface Reconnaissance

Run: `centralcoms-foundation-20260729-01`

Mode: read-only reconnaissance

Territory: HTTP authentication/authorization, protected resources, Socket.IO, uploaded media, and related tests
Source/config/test edits: **none**

## Executive finding

The current system authenticates browser requests with signed, short-lived JWT cookies and has several useful resource checks, but it does not yet have an organization, property, unit, or case-participant authorization boundary. Authorization is consequently a mixture of:

- direct ownership predicates such as `reports.user_id = req.user.id`;
- assigned-worker predicates;
- global role bypasses for `manager` and/or `admin`;
- a global `workers` Socket.IO room;
- public bearer URLs for locally uploaded media; and
- route-local helper functions that are not reused consistently.

This is safe only under the implicit assumption that every user, worker, manager, report, payment, message, and media object belongs to one organization. The Wave B organization/resource foundation must make that assumption explicit through a compatibility organization and then deny every access for which no policy rule exists.

The highest-risk current cross-boundary behaviors are:

1. `manager` and `admin` read all reports and all company analytics globally.
2. Any worker can discover and accept any globally available report.
3. Local uploaded voice, video, and images are served without authentication; no upload ownership/attachment record exists.
4. Any authenticated socket can send typing/read events to an arbitrary user ID, and all workers share one global room.
5. A payment-success event broadcasts a report title and description to every connected worker.
6. A user can self-select or self-promote to the `worker` role without an organization invitation or approval.
7. A prior direct message grants indefinite read access to the full bilateral conversation, and a global manager/admin can initiate that relationship using any report participant.

## Identity and authorization foundation

### What exists and is reusable

| Capability | Current implementation | Evidence | Reuse decision |
|---|---|---|---|
| Access-token validation | Cookie-only HTTP authentication, strict JWT shape, expected token type | `server/middleware/auth.ts:8-19`, `server/middleware/auth.ts:44-59` | Reuse signature/type validation; enrich the resulting principal server-side. |
| Optional authentication | Parses the same cookie but permits anonymous access | `server/middleware/auth.ts:61-80` | Reuse only for explicitly public resources. |
| Coarse role guard | `authorize(...roles)` checks the JWT role | `server/middleware/auth.ts:82-99` | Retain as an outer capability guard, never as the final resource decision. |
| Socket token verification | Same access-token parser is reused | `server/middleware/auth.ts:194-204`, `server/socket.ts:16-52` | Reuse token verification; remove client-supplied bearer fallback and resolve membership/resource scope. |
| Short-lived cookie | Access cookie is HTTP-only, secure in production, same-site strict, 15 minutes | `server/middleware/auth.ts:162-176`, `server/middleware/auth.ts:225-235` | Reuse. |
| Refresh rotation | Refresh checks DB record and performs compare-and-set revocation before issuing successor | `server/routes/auth.ts:246-334` | Reuse; refresh should mint a scoped principal after membership lookup. |
| Scoped response cache | Cache key includes authenticated user ID and role | `server/middleware/cache.ts:12-22` | Reuse and add active organization/policy version. |
| Message relationship helpers | `canMessageAboutReport` and `canReadConversation` centralize some checks | `server/routes/messages.ts:15-62` | Extract the report-participant idea, but replace historical-message-as-authority and add organization/case scope. |
| Worker response sanitizer | Removes phone, exact coordinates, and user ID | `server/routes/workers.ts:13-30` | Reuse for an explicitly public worker-profile policy. |
| Owner-scoped SQL | Payments, notifications, worker portal, and several report routes bind the subject ID in SQL | Examples: `server/routes/payments.ts:240-257`, `server/routes/notifications.ts:13-25`, `server/routes/worker-portal.ts:123-136` | Preserve the query-level enforcement pattern, generated from a shared policy scope. |

### What the identity currently lacks

- The JWT contains only user identity, global role, and token metadata. It has no organization, membership, property, case, policy version, or impersonation/support context: `server/middleware/auth.ts:8-19`.
- Tokens trust the stored global role until expiry. Authentication does not load a membership or resource scope on each request: `server/middleware/auth.ts:44-55`.
- The database models global users and roles, and reports are connected directly to a user and worker. There is no organization/membership/property/unit relation: `server/db/schema.ts:4-17`, `server/db/schema.ts:19-32`, `server/db/schema.ts:34-83`.
- Orders, messages, and notifications similarly carry user/report IDs but no organization/resource boundary: `server/db/schema.ts:219-256`.
- Express request typing is duplicated and one declaration reduces `req.user` to `any`, which would make a richer principal easy to bypass accidentally: `server/types/custom.d.ts:3-10`, `server/global.d.ts:4-8`.
- Registration accepts `role: worker` directly and persists it: `server/routes/auth.ts:32-41`, `server/routes/auth.ts:107-146`.

## Complete HTTP resource-access map

The paths below are mounted below `/api/v1` by `server/index.ts:151-184`.

### Reports

| Endpoint | Current allow rule | Current data/effect | Missing boundary or inconsistency | Evidence |
|---|---|---|---|---|
| `POST /reports` | Any authenticated user | Creates report owned by JWT user; accepts client-provided media URLs and coordinates; creates diagnosis task | No organization, property/unit, media-ownership, or role-specific create rule | `server/routes/reports.ts:57-90` |
| `GET /reports/available` | Global role `worker` or `admin` | Returns up to 50 globally matching/broadcasted unassigned rows via `r.*`, including description, coordinates, and media URLs | No organization/property/service-area/explicit-offer scope | `server/routes/reports.ts:100-134` |
| `GET /reports/my-jobs` | Global role `worker` or `admin`, but effective access requires a worker profile for the same user | Returns reports assigned to that worker and customer phone | No organization check; admin without worker profile gets an empty result rather than an admin view | `server/routes/reports.ts:144-168` |
| `GET /reports` | User: own reports. Worker: own plus assigned. Manager/admin: every report | Lists `SELECT *` reports | Manager/admin bypass is global; no property assignment or organization scope | `server/routes/reports.ts:178-207` |
| `GET /reports/:id` | Owner, assigned worker, or global manager/admin | Returns report plus customer and worker phone/name | Global manager/admin access; no organization/property/case participant relation | `server/routes/reports.ts:217-244` |
| `PUT /reports/:id` | Owner or global admin | Owner may change urgency and cancel; admin may alter worker/status/urgency and bypass illegal-transition rejection | Global admin bypass; manager has global read but no mutation; allowed fields are not schema-validated here | `server/routes/reports.ts:254-298` |
| `PUT /reports/:id/accept` | Global role worker/admin plus a worker profile | Atomically takes any global unassigned report in matching/matched/broadcasted state | No organization, offer, match-list, service-area, or property authorization | `server/routes/reports.ts:308-344` |
| `PUT /reports/:id/complete` | Assigned worker or global admin | Immediately marks the report completed and increments worker jobs | Global admin bypass; no verification/closure participant rule; no org scope | `server/routes/reports.ts:354-399` |
| `DELETE /reports/:id` | Owner or global admin | Hard-deletes report and cascading data | No organization boundary, retention rule, or soft-delete policy | `server/routes/reports.ts:409-424` |
| `POST /reports/:id/plan` | Owner, assigned worker, or global admin | Sends report/home-asset context to the AI planning service | Manager is excluded despite global read; no organization/policy/data-residency decision | `server/routes/reports.ts:436-497` |

Existing positive controls worth preserving:

- owners cannot use the generic update route to assign a worker or advance dispatch, and non-admin transitions are checked: `server/routes/reports.ts:263-285`;
- acceptance uses a guarded update to avoid two workers taking the same report: `server/routes/reports.ts:323-341`;
- completion checks the assigned worker: `server/routes/reports.ts:359-376`; and
- repair-plan generation checks owner/assigned-worker/admin relations: `server/routes/reports.ts:448-458`.

### Messages

| Endpoint | Current allow rule | Current data/effect | Missing boundary or inconsistency | Evidence |
|---|---|---|---|---|
| `GET /messages/conversations` | Any authenticated user | Lists messages in which user is sender/receiver | User-scoped, but no organization/case grouping; one direct stream can mix reports | `server/routes/messages.ts:68-106` |
| `GET /messages/:partnerId` | A prior message exists between users **or** any assigned report links them | Reads the entire bilateral stream and marks partner messages read | Historical message grants perpetual authority; no current case/org participation; read side effect on GET | `server/routes/messages.ts:39-62`, `server/routes/messages.ts:116-163` |
| `POST /messages` | Report owner and assigned worker may message each other. Global manager/admin may message either participant without being a participant | Stores report-linked message and emits to receiver | Global operator initiation; no assigned-operator relation; after sending, operator gains bilateral history through the prior-message rule | `server/routes/messages.ts:15-37`, `server/routes/messages.ts:173-207` |

The send route is materially stronger than unrestricted direct messaging because it requires a real assigned report, but the permission must be expressed as current case participation, not inferred from old messages.

### Upload and media access

| Surface | Current allow rule | Current data/effect | Missing boundary or inconsistency | Evidence |
|---|---|---|---|---|
| `POST /uploads/voice` | Any authenticated user | Persists verified audio and returns direct URL | No owner/org/case metadata, consent/retention policy, or attachment token | `server/routes/uploads.ts:168-205`, `server/routes/uploads.ts:251-257` |
| `POST /uploads/video` | Any authenticated user | Persists verified video and returns direct URL | Same | `server/routes/uploads.ts:259-265` |
| `POST /uploads/image` | Any authenticated user | Persists verified image and returns direct URL | Same | `server/routes/uploads.ts:267-273` |
| `POST /uploads/images` | Any authenticated user | Persists up to five images and returns direct URLs | Same | `server/routes/uploads.ts:275-300` |
| `GET /uploads/**` (local) | Public; no authentication middleware | Serves local media with anti-sniffing/CSP/sandbox headers | URLs are bearer capabilities; no participant check, expiry, revocation, or audit | `server/index.ts:138-146` |
| S3 object URL | Accessibility depends on external bucket policy; application returns a direct object URL | Upload object has content type and field metadata only | No signed read, application authorization, owner/org/case metadata, expiry, or delete lifecycle | `server/routes/uploads.ts:154-191` |

The binary signature checks and randomized filenames are valuable (`server/routes/uploads.ts:75-151`, `server/routes/uploads.ts:168-172`), but they mitigate content spoofing and guessing rather than authorization. A report also accepts arbitrary client-provided media URL strings (`server/routes/reports.ts:41-50`, `server/routes/reports.ts:61-75`), so upload creation and report attachment are not bound.

### Workers and worker portal

| Endpoint | Current allow rule | Current data/effect | Missing boundary or inconsistency | Evidence |
|---|---|---|---|---|
| `GET /workers` | Public optional auth; manager/admin with `all=true` can include unavailable workers | Returns sanitized global directory | No organization/market boundary; public contract is implicit rather than a declared policy | `server/routes/workers.ts:38-72` |
| `GET /workers/match` | Authenticated. If report supplied: owner or global manager/admin. Without report: any user can submit coordinates/category | Computes matches across all available workers | No organization/service territory; assigned worker cannot inspect a report match unless also owner/manager/admin | `server/routes/workers.ts:82-114`, `server/services/matching.ts:112-126` |
| `GET /workers/:id` | Public optional auth | Sanitized worker details plus ten `reviews.*` rows and photo URLs | Reviews expose their raw IDs/report/user references and media URLs; no publication/consent scope | `server/routes/workers.ts:125-160`, `server/db/schema.ts:98-107` |
| `PUT /workers/:id/availability` | Worker who owns profile or global admin | Changes availability | Global admin bypass; no organization/operator assignment | `server/routes/workers.ts:170-186` |
| `POST /worker-portal/register` | Any authenticated user | Creates worker and changes global user role to worker | No organization invitation, verification, approval, or scoped worker role | `server/routes/worker-portal.ts:19-55` |
| `GET /worker-portal/dashboard` | Any authenticated user with self worker profile; JWT worker role auto-creates missing profile | Own jobs and earnings | Auto-initialization converts self-selected worker role into operational profile; no org | `server/routes/worker-portal.ts:65-113` |
| `GET /worker-portal/jobs` | Authenticated self with worker profile | Assigned reports | Strong self-assignment predicate, but no organization check | `server/routes/worker-portal.ts:123-138` |
| `PUT /worker-portal/profile` | Authenticated self with worker profile | Updates skills, location, availability | Strong self predicate, but no schema validation or organization/verification policy | `server/routes/worker-portal.ts:148-173` |

### Payments

| Endpoint | Current allow rule | Current data/effect | Missing boundary or inconsistency | Evidence |
|---|---|---|---|---|
| `POST /payments/checkout` | Authenticated report owner | Creates/deduplicates a fixed-price pending order | Owner predicate is good; no organization/currency-policy/approval context | `server/routes/payments.ts:224-299` |
| `POST /payments/webhook` | Provider/system boundary, not user JWT; CSRF is explicitly bypassed | Verifies timestamp/signature, reconciles order, moves report to matching | Must become a typed system actor; organization is inferred only indirectly through order/report; current provider implementation is explicitly mocked/localized | `server/middleware/auth.ts:120-123`, `server/routes/payments.ts:94-133`, `server/routes/payments.ts:312-379` |
| `GET /payments/orders` | Authenticated payer | Lists only `orders.user_id = req.user.id` | Strong user scope; needs organization/payer membership for multi-org | `server/routes/payments.ts:385-400` |
| `GET /payments/orders/:id` | Authenticated payer | Reads one own order | Strong user scope; needs organization/payer membership for multi-org | `server/routes/payments.ts:406-423` |

On successful reconciliation, `movePaidReportIntoMatching` emits report ID, category, title, and description to the global worker room: `server/routes/payments.ts:194-216`. This is both an authorization and minimization issue.

### Notifications

| Endpoint/helper | Current allow rule | Current data/effect | Missing boundary or inconsistency | Evidence |
|---|---|---|---|---|
| `GET /notifications` | Authenticated user | Own rows and unread count | Good user predicate; no organization/case filtering in notification payload | `server/routes/notifications.ts:13-30` |
| `PUT /notifications/:id/read` | Authenticated row owner | Marks own row read | Good user predicate; returns success even if no row changed | `server/routes/notifications.ts:40-49` |
| `PUT /notifications/read-all` | Authenticated user | Marks all own rows read | Good user predicate; multi-org UI may need active-org scope | `server/routes/notifications.ts:56-66` |
| `createNotification` | Internal caller supplies any user ID | Persists and emits to user | No typed actor, organization, report/case relation, or delivery/outbox boundary | `server/routes/notifications.ts:68-81` |

### Analytics

All analytics routes use a global-role outer guard for `manager` or `admin`: `server/routes/analytics.ts:11-15`.

| Endpoint | Current allow rule | Current data/effect | Missing boundary or inconsistency | Evidence |
|---|---|---|---|---|
| `GET /analytics/company-overview` | Global manager/admin | Company-wide operational, financial, review, workforce, and agent telemetry aggregates | Service accepts no principal/scope and queries all rows | `server/routes/analytics.ts:20-38`, `server/services/companyAnalytics.ts:378-411`, `server/services/companyAnalytics.ts:636-763` |
| `GET /analytics/dashboard` | Global manager/admin | Global report/worker/review counts | Queries all reports, workers, reviews | `server/routes/analytics.ts:44-53`, `server/services/analytics.ts:26-52` |
| `GET /analytics/tickets` | Global manager/admin | Global seven-day report trend | No organization/property predicate | `server/routes/analytics.ts:59-68`, `server/services/analytics.ts:58-74` |
| `GET /analytics/workers` | Global manager/admin | Global top workers | No organization/service-area predicate | `server/routes/analytics.ts:74-84`, `server/services/analytics.ts:79-94` |

The analytics service boundary must accept a required authorization scope; route-only role checking cannot prevent a future internal caller from obtaining global data.

## Socket.IO joins, client events, and server emits

### Current joins

- A socket authenticates with the `accessToken` cookie, with a fallback to `socket.handshake.auth.token`: `server/socket.ts:16-45`.
- Every authenticated socket joins `user:{userId}`: `server/socket.ts:54-60`.
- Every JWT whose global role is `worker` also joins one global `workers` room: `server/socket.ts:61-63`.
- There are no organization, property, report/case, assignment, or operator rooms.

### Current client-originated events

| Event | Client input | Server effect | Authorization gap | Evidence |
|---|---|---|---|---|
| `typing` | `{to: userId}` | Emits user ID/name to arbitrary target user room | No validation, relationship, organization, or case check | `server/socket.ts:69-75` |
| `stop_typing` | `{to: userId}` | Emits actor user ID to arbitrary target | Same | `server/socket.ts:77-81` |
| `mark_read` | `{partnerId: userId}` | Tells arbitrary target that actor read messages | Does not update DB and checks no conversation/case relation | `server/socket.ts:83-87` |

The browser client exposes these APIs directly by user ID: `src/services/socket.ts:40-52`.

### Current server-originated events

| Helper/caller | Room/event | Payload authorization |
|---|---|---|
| `emitToUser` | `user:{userId}` with caller-selected event/data | No central policy; correctness depends entirely on caller | `server/socket.ts:93-98` |
| `emitToWorkers` | global `workers` room | No organization/offer/minimization boundary | `server/socket.ts:100-104` |
| Messages route | `new_message` to validated receiver | HTTP send check exists, but socket helper itself is unguarded | `server/routes/messages.ts:187-205` |
| Notifications helper | `new_notification` to supplied user | No case/org/policy context | `server/routes/notifications.ts:72-78` |
| Payment success | `new_job_available` to all workers | Includes report title and description globally | `server/routes/payments.ts:194-214` |
| Vendor claw | job/report events to user IDs selected from matching/report rows | Depends on background query correctness; no central organization scope | `server/services/vendor_claw.ts:92-117`, `server/services/vendor_claw.ts:161-178` |

## Test coverage and authorization blind spots

### Existing evidence

- Analytics tests prove regular users receive `403` and an admin receives global dashboard/trend data: `server/tests/analytics.test.ts:51-89`.
- Company analytics tests explicitly expect both manager and admin roles to be allowed and only test `401/403` at the global role level: `server/tests/company-analytics.test.ts:419-486`.
- Repair-plan tests cover owner and assigned-worker success, unrelated-user denial, and the owner dispatch guard: `tests/ai_planning.test.ts:50-133`.
- Report completion has only the assigned-worker happy path: `tests/api_data_collection.test.ts:75-89`.
- Worker directory tests intentionally exercise anonymous/public list and detail access: `server/tests/workers.test.ts:33-50`.
- Worker-portal tests replace authentication with a fixed worker principal, so they cannot detect non-worker/self-elevation or cross-organization failures: `server/tests/worker-portal.test.ts:24-35`.
- Payment webhook unit tests disable verification and assert the global worker broadcast payload; production configuration tests only check known mock credentials and the verification flag: `server/tests/payments.webhook.test.ts:24-80`, `server/tests/payments.production-config.test.ts:35-66`.
- The socket client test covers singleton connection reuse only: `src/services/socket.test.ts:12-24`.

### Missing denial fixtures

Repository test inventory contains no server authorization suite for:

- report list/detail/update/delete/accept/complete across two organizations;
- manager/admin access outside their organization;
- a worker accepting a report outside its pool, property, or organization;
- messages between unrelated users, expired case participation, or operator assignment;
- upload ownership, report attachment, media reads, signed URL expiry, or legacy media compatibility;
- notification access across users/organizations;
- payment/order access across organizations or provider actor scoping;
- Socket.IO room joins and arbitrary `typing`, `mark_read`, or global worker broadcasts;
- query/service-level analytics scoping; or
- stale JWT role/membership revocation behavior.

These must be denial-first tests. Happy-path preservation alone is insufficient because the current behavior is globally permissive for several roles.

## Minimum deny-by-default policy contract

T04 should freeze a contract with these minimum types and invariants before implementation.

```ts
type ActorKind = 'user' | 'provider' | 'system';
type OrgRole = 'resident' | 'worker' | 'manager' | 'admin';

interface Principal {
  actorKind: ActorKind;
  userId?: number;
  organizationId: string;
  membershipId?: string;
  role: OrgRole | 'provider' | 'system';
  workerId?: number;
  tokenId?: string;
  policyVersion: string;
  compatibilityMode: 'none' | 'legacy-single-org';
}

type ResourceType =
  | 'report'
  | 'case'
  | 'message'
  | 'media'
  | 'worker'
  | 'order'
  | 'notification'
  | 'analytics'
  | 'socket-room';

interface ResourceContext {
  type: ResourceType;
  id?: string | number;
  organizationId: string;
  propertyId?: string;
  unitId?: string;
  reportId?: number;
  caseId?: string;
  ownerUserId?: number;
  payerUserId?: number;
  assignedWorkerUserId?: number;
  participantUserIds?: number[];
  assignedOperatorUserIds?: number[];
  publication?: 'private' | 'organization' | 'public-sanitized';
}

interface PolicyDecision {
  allowed: boolean;
  reason:
    | 'explicit_rule'
    | 'unauthenticated'
    | 'organization_mismatch'
    | 'not_a_participant'
    | 'role_forbidden'
    | 'resource_unresolved'
    | 'action_unrecognized';
  queryScope?: {
    organizationId: string;
    ownerUserId?: number;
    assignedWorkerUserId?: number;
    propertyIds?: string[];
    caseIds?: string[];
  };
  obligations?: Array<
    'redact_contact'
    | 'redact_location'
    | 'signed_media_url'
    | 'audit'
    | 'approval_required'
    | 'minimize_event_payload'
  >;
}
```

Required API:

```ts
resolvePrincipal(requestOrSocket): Promise<Principal>;
authorize(principal, action, resource): PolicyDecision;
requireAuthorized(action, loadResource): ExpressMiddleware;
scopeList(principal, action, resourceType): PolicyDecision['queryScope'];
authorizeSocketEvent(principal, event, caseId): Promise<PolicyDecision>;
```

### Non-negotiable invariants

1. **Default deny:** unknown action, missing resource, unresolved organization, or missing membership is denied.
2. **Server-resolved scope:** organization, membership, worker identity, and resource relationships are loaded from durable records. Client IDs and JWT role claims are not sufficient authority.
3. **Organization equality first:** no role, including organization admin, bypasses `principal.organizationId === resource.organizationId`.
4. **Platform support is separate:** if a future platform-support actor is required, it must be an explicit audited capability, never the ordinary `admin` role.
5. **List queries are scoped before execution:** services receive a required `queryScope`; filtering after `SELECT *` is forbidden.
6. **Object reads do not enumerate:** absent and unauthorized IDs both return `404`. Authenticated but categorically forbidden actions return `403`; missing/invalid authentication returns `401`.
7. **Case participation is current authority:** messages and realtime events require current case/report participation or assigned operator status. Historical messages alone never grant access.
8. **Media is a resource:** every upload has owner, organization, purpose, consent/retention state, and optional case/report attachment. Orphan media is owner-only and expires; attached media follows case policy and is delivered with a short-lived signed URL or authorized same-origin stream.
9. **Worker discovery is bounded:** a worker can see an offer only when it is published to an eligible organization pool or addressed to that worker. Public worker profiles are a separate sanitized read action.
10. **Provider/system effects are typed:** a payment webhook becomes a provider principal after cryptographic verification and may only reconcile the order/report resolved from the provider identifier.
11. **Sockets use scoped rooms:** rooms are at minimum `org:{orgId}:user:{userId}` and `org:{orgId}:case:{caseId}`. Client events name a case, not an arbitrary target user.
12. **Every denial and privileged action is auditable:** record principal, organization, action, resource, decision reason, policy version, and correlation ID without storing raw message/media content.

### Minimum role/resource rules preserving existing intent

| Action | Resident/user | Worker | Manager | Organization admin |
|---|---|---|---|---|
| Create report | Member creates for self in own org/property | Same if also resident/authorized reporter | For assigned properties | For own org |
| Read report | Owner/current participant | Assigned worker or eligible minimized offer | Assigned organization/property | Own organization |
| Update/cancel report | Owner fields/cancel only | Assigned execution fields only | Explicit operational fields | Own org, still subject to state machine |
| Plan report | Owner/current participant | Assigned worker | Preserve current exclusion unless T04 explicitly changes it | Own organization |
| Accept offer | No | Explicit offer or eligible same-org pool | No | Exceptional audited action only |
| Complete work | No | Assigned worker | No direct close unless policy adds verification | Exceptional state-valid action only |
| Message/read realtime | Current case participants | Current case participants | Assigned operator only | Assigned/audited operator only |
| Read media | Current case participants | Current case participants | Assigned property/case | Own org under purpose policy |
| Checkout/read order | Payer and report owner | No | Read only if financial capability added | Own org under explicit financial capability |
| Read notifications | Own only | Own only | Own only | Own only |
| Read analytics | No | Own performance only | Own organization/property scope | Own organization |

## Legacy single-organization compatibility seam

Compatibility must preserve current workflows without preserving implicit global authority.

1. Create one durable compatibility organization, e.g. `legacy-default`, during migration.
2. Backfill every existing user with one membership whose scoped role matches the current `users.role`.
3. Backfill every report, worker, order, message, notification, upload/media record, and derived case/event with `legacy-default`; infer report-linked organization through the report, never through client input.
4. Permit tokens without `organizationId` only while:
   - `AUTHZ_LEGACY_SINGLE_ORG=true`;
   - the database contains exactly one enabled organization; and
   - the authenticated user has exactly one active membership.
   The server resolves that organization. It must fail closed rather than selecting an organization when any condition is false.
5. New and refreshed tokens may carry an active organization hint, but the server still verifies active membership and role. The DB membership remains authoritative.
6. Existing API paths and response shapes remain. Current global manager/admin views become “all resources in `legacy-default`,” which is behaviorally identical in a one-organization installation.
7. Current global worker discovery becomes the `legacy-default` eligible worker pool. Once a second organization exists, broadcasts and queries are isolated automatically.
8. Keep the public worker directory only as explicit `worker.public_profile.read` with the existing sanitizer; operational availability, exact location, IDs, and unpublished review media remain private.
9. Replace public local media reads with an authenticated same-origin compatibility route or a short signed redirect. Existing report URL fields can keep their shape, but the URL must no longer bypass policy.
10. Emit metrics for compatibility-token use and legacy media references. Remove compatibility only after all rows/tokens/clients are migrated.

This seam allows staged rollout: first add durable organization/resource fields and policies; then retrofit routes and sockets; only then allow a second organization.

## Proposed exclusive mutable territories

These territories conform to the command program and avoid overlapping writes.

### T06 — authorization-policy builder

**New files only; no existing route/socket/schema edits.**

- `server/services/authorization/contracts.ts`
- `server/services/authorization/principal.ts`
- `server/services/authorization/policy.ts`
- `server/services/authorization/scopes.ts`
- `server/services/authorization/compatibility.ts`
- `server/middleware/resourceAuthorization.ts`
- `server/tests/authorization-policy.test.ts`
- `server/tests/authorization-compatibility.test.ts`

Responsibilities:

- implement the frozen T04 principal/action/resource/decision types;
- server-side membership and compatibility resolution against T05 schema;
- pure deny-by-default decision engine and list query scopes;
- status/obligation mapping and policy audit envelope;
- tests for organization mismatch, unresolved resource, role/action matrix, default deny, and compatibility fail-closed behavior.

T06 must not edit `server/middleware/auth.ts`; T07/T08 integrate the new principal middleware after T06 is accepted.

### T07 — HTTP compatibility integrator

**Existing HTTP route/read-model files only. T07 does not edit uploads, sockets, static mounts, schema, migrations, or T06 files.**

- `server/routes/reports.ts`
- `server/routes/messages.ts`
- `server/routes/workers.ts`
- `server/routes/worker-portal.ts`
- `server/routes/payments.ts`
- `server/routes/notifications.ts`
- `server/routes/analytics.ts`
- `server/services/matching.ts`
- `server/services/analytics.ts`
- `server/services/companyAnalytics.ts`
- `server/tests/http-resource-authorization.test.ts` (new)
- existing route tests above only when required for response compatibility

Responsibilities:

- call T06 principal/policy/query-scope APIs at every endpoint;
- retain current single-org paths and successful response shapes;
- replace global role bypasses with organization-scoped rules;
- make report/message/worker/order/notification/analytics queries scope before execution;
- keep payment webhook authority provider-bound and minimize the offer payload through the frozen T08 emission contract;
- add two-organization denial fixtures and current-flow compatibility fixtures.

T07 must not alter payment amount, provider behavior, state transitions, or financial authority.

### T08 — realtime/media authorization integrator

**Socket, upload/media delivery, and their client adapter only.**

- `server/routes/uploads.ts`
- `server/socket.ts`
- `server/index.ts` (only the `/uploads` mount/replacement and Socket.IO initialization seam)
- `src/services/socket.ts`
- `server/services/mediaAccess.ts` (new)
- `server/tests/socket-authorization.test.ts` (new)
- `server/tests/uploads-authorization.test.ts` (new)
- `server/tests/media-access.test.ts` (new)
- `src/services/socket.test.ts`

Responsibilities:

- bind sockets to the T06 principal and organization;
- replace arbitrary user-ID typing/read events with authorized case-scoped events;
- replace the global worker room with organization/offer-scoped rooms and minimized payloads;
- store/use T05 media ownership and attachment metadata;
- authorize local/S3 reads and provide compatible protected URLs;
- add cross-organization room, event, upload, attachment, media-read, and URL-expiry denials.

T08 must not edit reports/messages/payments routes. T04 must freeze the emitter interface so T07 can call it without overlapping T08 files.

### Integration order

`T04 contract → T05 schema/migration → T06 policy → T08 realtime/media API → T07 HTTP callers → T11 security review`

T07 and T08 may implement in parallel only after T04 freezes their shared authorization/emitter/media URL contracts; the commander integrates T08 before T07 if T07 imports a new emitter signature.

## Decisions for T04

1. Freeze `organization admin` as organization-scoped and define any platform-support actor separately.
2. Choose active-organization resolution for future multi-membership users (header, route, or server session); no client-provided organization may be trusted without membership verification.
3. Decide whether worker public profiles are platform-wide or organization/market scoped.
4. Define assigned-operator records for manager messaging and report access.
5. Define how legacy media paths are converted to owned media records when no uploader can be inferred.
6. Standardize non-enumerating resource denials on `404` and action denials on `403`.
7. Define whether an authenticated user may self-apply as a worker versus immediately obtaining an operational worker membership.
8. Define the provider/system principal and idempotency/audit contract for payment reconciliation.

## Read-only evidence commands

- `rg --files` inventory for routes, middleware, sockets, schemas, and tests.
- Numbered source inspection of all files cited above.
- Route/query/event search for `router.*`, `authenticate`, `authorize`, `req.user`, ownership columns, room joins, and emits.
- Test inventory search for report/message/upload/notification/payment/worker/analytics/socket authorization cases.

No server, source, configuration, migration, or test file was modified by T02.

## Typed IPC

```json
{
  "task_id": "T02",
  "state": "accepted",
  "artifact": ".agent-state/centralcoms-upgrade/artifacts/t02-auth-recon.md",
  "evidence": {
    "surfaces": [
      "HTTP auth middleware and JWT principal",
      "reports",
      "messages",
      "uploads and media delivery",
      "workers and worker portal",
      "payments",
      "notifications",
      "analytics",
      "Socket.IO joins, client events, and server emits",
      "related authorization tests"
    ],
    "critical_findings": 7,
    "source_edits": []
  },
  "decision": "READY_FOR_T04_CONTRACT_DESIGN",
  "unknowns": [
    "future active-organization selection mechanism",
    "platform-support versus organization-admin semantics",
    "public worker-directory scope",
    "assigned-operator relationship model",
    "legacy media ownership inference",
    "self-application versus immediate worker activation"
  ],
  "dependency": "T04 freezes principal/resource/action/compatibility/emitter contracts; T05 publishes organization and media schema; T06 implements policy; T07 and T08 integrate disjoint HTTP and realtime/media territories; T11 independently red-teams the integrated boundary",
  "next_action": "Commander reviews T01-T03 together and dispatches T04; no mutable authorization work begins before the contract is accepted"
}
```
