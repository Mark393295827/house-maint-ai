# T11 — Independent T06 Security Review

Run: `centralcoms-foundation-20260729-01`

Decision: **REJECT / VERIFY_FAILED**

Scope: the exact nine additive T06 files frozen in `t04-foundation-contract.md:357-373`. No source, configuration, schema, migration, route, socket, or test file was edited by T11.

## Gate summary

The focused suite, lint, and TypeScript check pass, the middleware remains unmounted, no raw SQL is present, and the workstream stays inside its nominal file/line territory. However, adversarial evaluation found multiple default-deny violations that the declared tests do not cover. T06 must not integrate until the P0 findings are repaired and independently rechecked.

| Gate | Result |
|---|---|
| Exact mutable territory | PASS — nine authorized files only |
| Human-authored review budget | PASS, narrowly — 876/900 lines and 9/12 files |
| Focused tests | PASS — 2 files, 13 tests |
| Exact-file ESLint | PASS |
| Server TypeScript `--noEmit` | PASS |
| Middleware unmounted | PASS — zero references outside T06/tests |
| Raw SQL/client-built SQL | PASS — none |
| Secret scan | PASS — zero hits |
| Default deny / ancestry / liveness / bounded scope | **FAIL** |
| T06 integration | **BLOCKED** |

Only 24 human-authored lines remain under the T06 cap. A repair must remove/refactor enough existing lines to stay at or below 900, or the commander must explicitly revise the review budget before accepting more authored lines.

## P0 findings

### P0-1 — Expired or malformed grants can be treated as live

`isGrantLive` compares timestamp strings lexicographically:

- `server/services/authorization/scopes.ts:7-8`

The frozen contract requires UTC comparison, strict `expires_at > evaluatedAt`, and equality-as-expired:

- `.agent-state/centralcoms-upgrade/artifacts/t04-foundation-contract.md:284-290`

Adversarial evidence:

- `expiresAt = 2026-07-30T01:00:00+02:00` is **2026-07-29T23:00:00Z**, already expired at `2026-07-30T00:00:00Z`, but the function returned `true`.
- `expiresAt = not-a-date` also returned `true`.

Impact: a persisted non-canonical, offset-bearing, or malformed timestamp can keep a revoked-by-expiry capability active. The implementation must parse and validate both values as UTC instants and fail closed on invalid dates.

### P0-2 — The repository boundary does not actually enforce resolved ancestry, and forged ancestry permits upward grants

T04 requires grant target resolution, ancestry, liveness, and context loading in one organization-scoped repository operation:

- `.agent-state/centralcoms-upgrade/artifacts/t04-foundation-contract.md:286-297`

The additive `repository.ts` defines only an injectable interface. It has no durable organization-scoped implementation:

- `server/services/authorization/repository.ts:48-59`

The wrapper validates grant target type/ID/organization but never validates the requested resource's type-specific ancestry shape:

- `server/services/authorization/repository.ts:60-100`

`grantApplies` trusts optional ancestry IDs on every resource type:

- `server/services/authorization/scopes.ts:9-26`

Adversarial evidence: a property grant for property `20` applied to an `organization` resource carrying a forged `propertyId: 20`, returning `true`. This is upward inheritance, which T04 explicitly forbids.

Impact: any future adapter or resolver defect can turn internally inconsistent/client-derived ancestry into authority. Because T06 provides no concrete server-resolved repository and no strict resource-shape validator, the security claim is delegated to an unwritten caller.

Required gate: T06 must provide or consume a repository operation whose executable contract proves organization-scoped membership, resource ancestry, and grant target/liveness together; the policy boundary must reject impossible ancestry fields even when an injected repository is wrong.

### P0-3 — Direct-relation `QueryScope` widens access to unrelated users' resources

For an owner or participant authorization, `buildQueryScope` copies both the resource owner and assigned-worker IDs into an `owner-or-assigned` list scope:

- `server/services/authorization/scopes.ts:53-61`

T04 requires list scopes to be structured, bound authorization values:

- `.agent-state/centralcoms-upgrade/artifacts/t04-foundation-contract.md:246-254`
- `.agent-state/centralcoms-upgrade/artifacts/t04-foundation-contract.md:297-301`

Adversarial evidence:

- owner user `10` reading a case assigned to worker user `11` received `{ownerUserId: 10, assignedWorkerUserId: 11}`;
- participant user `12` received the same `{ownerUserId: 10, assignedWorkerUserId: 11}`.

If a list consumer applies the advertised `owner-or-assigned` scope, user `10` or participant `12` can receive every resource assigned to worker `11`; the participant can also receive resources owned by user `10`. Bound values must identify the current principal's valid direct relation only, not copy unrelated relationship IDs from one authorized object.

### P0-4 — Legacy fallback resolves a membership with `revokedAt`

The explicit header path rejects any membership with `revokedAt`:

- `server/services/authorization/principal.ts:31-43`

The legacy path checks status and organization status but omits `revokedAt`:

- `server/services/authorization/compatibility.ts:9-23`

T04 requires revoked memberships to be denied immediately and the fallback to use exactly one active membership:

- `.agent-state/centralcoms-upgrade/artifacts/t04-foundation-contract.md:286-289`
- `.agent-state/centralcoms-upgrade/artifacts/t04-foundation-contract.md:303-308`

Adversarial evidence: an `active` membership record with non-null `revokedAt` was returned by `resolveLegacyMembership`. The fake repository used in the shipped compatibility tests filters only status and organization status, so the omission is reproducible within the accepted repository interface:

- `server/tests/authorization-compatibility.test.ts:19-30`

Impact: legacy resolution can issue a principal for a revoked membership. Later context checks are not an acceptable substitute because principal creation and `resolveResource` occur first.

## P1 findings

### P1-1 — The pure policy does not bind the supplied principal to the resolved context

The policy compares only membership IDs between `input.principal` and `context.principal`:

- `server/services/authorization/policy.ts:73-92`

Direct owner/participant authorization then uses `input.principal.userId`:

- `server/services/authorization/policy.ts:28-39`

Adversarial evidence:

- a `system` actor reusing the context membership/user fields was allowed as an owner;
- a different `userId` with the same membership ID was allowed when the resource owner was changed to that user.

The current middleware happens to pass the same principal object through context loading, so this is not mounted today. Nevertheless, the exported pure policy is not default-deny under its declared input type. It must bind actor kind, user, organization, membership, role, and worker identity—or accept only the server-resolved context principal.

### P1-2 — The frozen assigned-worker relation is ignored

T04 names current assigned-worker relations as an authority source:

- `.agent-state/centralcoms-upgrade/artifacts/t04-foundation-contract.md:292`

`directRelationAllows` implements owner and participant only:

- `server/services/authorization/policy.ts:28-39`

The shipped test instead asserts an assigned worker needs a case grant:

- `server/tests/authorization-policy.test.ts:119-135`

This is an implementation/test contradiction with the frozen contract. T04 must be followed or explicitly amended; T11 does not choose a new worker policy.

### P1-3 — Audit fields accept raw, unbounded client content

The middleware copies `X-Correlation-Id` directly into every audit envelope:

- `server/middleware/resourceAuthorization.ts:46-53`

The policy also casts an unrecognized arbitrary action string into the typed audit action:

- `server/services/authorization/policy.ts:40-58`

T04 requires a content-minimized `AuditEnvelope`:

- `.agent-state/centralcoms-upgrade/artifacts/t04-foundation-contract.md:256-280`
- `.agent-state/centralcoms-upgrade/artifacts/t04-foundation-contract.md:301`

Before any sink is added, correlation IDs must be strictly length/character bounded or server-generated, and unknown actions must be recorded as a bounded sentinel rather than copied through a type cast.

### P1-4 — Runtime positive-ID validation exists but is not applied to resource/grant boundaries

`isPositiveId` is defined:

- `server/services/authorization/contracts.ts:92-95`

But resource requests and grant-creation requests are passed to repository methods without runtime validation:

- `server/services/authorization/repository.ts:69-80`
- `server/services/authorization/repository.ts:103-117`
- `server/middleware/resourceAuthorization.ts:40-44`

TypeScript types do not validate route parameters or injected runtime objects. Numeric ID invariants are frozen in T04; invalid IDs must fail before repository evaluation.

### P1-5 — Grant-creation validation does not validate capability or grantor authority

`capability` is optional on the creation request and is unused:

- `server/services/authorization/repository.ts:40-47`
- `server/services/authorization/repository.ts:103-117`

The snapshot contains only active statuses and target, so the function cannot prove the grantor has `manage` authority over the target:

- `server/services/authorization/repository.ts:34-39`

The function is unmounted, which limits current exposure, but its name and return value imply a complete creation authorization boundary. It must either be narrowed explicitly to target validation or include capability and grantor-scope authorization before B2 uses it.

## Tests and missed adversarial cases

The shipped tests cover baseline 401/403/404 cases, simple inactive/revoked states, ISO equality expiry, normal downward grants, simple sibling/upward examples, admin/worker non-implicit access, query-scope shape, forged target organization, header verification, ambiguity, and worker-ID mapping.

They do not cover:

- offset-bearing or malformed timestamps;
- legacy `revokedAt`;
- impossible ancestry fields on ancestor resource types;
- direct owner/participant query-scope widening;
- mismatched `input.principal` versus `context.principal`;
- provider/system actors carrying user/membership fields;
- invalid/negative resource and grant IDs;
- unbounded correlation/action audit fields;
- executable organization-scoped repository behavior; or
- the frozen assigned-worker relation.

The green focused suite therefore does not satisfy the T04 T06 acceptance list at `t04-foundation-contract.md:413-415`.

## Positive controls confirmed

- Unknown actions, missing principal, missing context, ordinary organization mismatch, and unrelated read/media are denied in the normal path: `server/services/authorization/policy.ts:73-100`.
- Organization and membership status plus membership revocation are checked in the normal policy path: `server/services/authorization/policy.ts:83-87`.
- Organization grants require `resource_id === organization_id`, and grant targets are checked for exact type/ID/organization: `server/services/authorization/repository.ts:60-68`.
- Admin and worker roles receive no role-only access: `server/services/authorization/policy.ts:28-39`; covered at `server/tests/authorization-policy.test.ts:137-145`.
- Organization hints are numeric and membership-verified: `server/services/authorization/compatibility.ts:2-8`, `server/services/authorization/principal.ts:31-43`.
- Denial response bodies are non-enumerating for the normal 404 path: `server/middleware/resourceAuthorization.ts:22-24`, `server/middleware/resourceAuthorization.ts:54-63`.
- The middleware is not mounted or referenced outside T06/tests, preserving the B1 non-goal.
- No raw SQL, route change, socket change, schema change, external effect, or audit persistence was introduced by T06.

## Command evidence

```text
npm run test:unit:node -- server/tests/authorization-policy.test.ts server/tests/authorization-compatibility.test.ts
PASS: 2 files, 13 tests

npx eslint <exact nine T06 files>
PASS

npx tsc -p server/tsconfig.json --noEmit
PASS

adversarial tsx probe
FAIL SECURITY: expiredOffsetAccepted=true
FAIL SECURITY: malformedExpiryAccepted=true
FAIL SECURITY: forgedUpwardPropertyGrant=true
FAIL SECURITY: owner/participant scopes contain unrelated owner/worker IDs
FAIL SECURITY: forgedSystemOwnerAllowed=true
FAIL SECURITY: mismatchedPrincipalAllowed=true
FAIL SECURITY: revokedLegacyResolved=true

territory/quality scan
PASS: 9 files, 876 lines, 0 trailing-whitespace hits, 0 secret hits
PASS: middleware references outside T06/tests = 0
PASS: git diff --check (line-ending warnings only in T05A-owned files)
```

## Launch/integration decision

- **T05A/T05B:** unaffected by these T06 findings; continue only under their own accepted gates.
- **T06:** implementation exists but is **rejected for integration**. Repair P0/P1 findings within the frozen territory and budget, then repeat T11.
- **T09:** may begin only after T05B publishes and passes its transaction interface, as frozen. It must not be integrated ahead of a repaired/accepted T06 because the frozen integration order remains `T05A → T05B → T06 → T09`.
- **T07/T08/B2/second organization:** blocked.

## Typed IPC

```json
{
  "task_id": "T11-T06",
  "state": "verify_failed",
  "artifact": ".agent-state/centralcoms-upgrade/artifacts/t11-t06-security-review.md",
  "evidence": {
    "focused_tests": "PASS: 2 files, 13 tests",
    "eslint": "PASS: exact nine files",
    "typecheck": "PASS: server tsconfig --noEmit",
    "adversarial_security": "FAIL: 7 unsafe outcomes reproduced",
    "territory": "PASS: 9 authorized files only",
    "review_budget": "876/900 human-authored lines; 9/12 files",
    "secret_scan": "PASS",
    "source_edits": []
  },
  "decision": "REJECT_T06_INTEGRATION",
  "unknowns": [
    "whether T04 intentionally intended assigned workers to act by relation or only by explicit grant",
    "the concrete durable repository implementation point",
    "whether the commander will require line-neutral repair or revise the 900-line cap"
  ],
  "dependency": "T06 repair and independent T11 recheck before serial integration; T09 launch remains gated by T05B and integration remains gated behind accepted T06",
  "next_action": "Return exact P0/P1 findings to the T06 builder; make no T11 fixes"
}
```
