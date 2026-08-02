# T11 — Authorization Red-Team Receipt

```json
{
  "task_id": "t11-auth-redteam",
  "state": "SUCCEEDED",
  "artifact": ".agent-state/practical-backend-20260801/artifacts/t11-auth-redteam.md",
  "evidence": [
    "npx vitest run --config vitest.config.ts server/tests/authorization-policy.test.ts server/tests/authorization-compatibility.test.ts --reporter=dot: PASS, 2 files, 11 tests",
    "npx tsc -p server/tsconfig.json --noEmit: PASS",
    "npx eslint server/services/authorization/*.ts server/tests/authorization-policy.test.ts server/tests/authorization-compatibility.test.ts: PASS",
    "Adversarial tsx probe: offset, equality, malformed, and future expiry results were false/false/false/true; forged organization ancestry, upward unit grant, and sibling grant results were all false; impossible organization/case/unit ancestry was rejected",
    "Adversarial tsx probe: forged provider/system principals were invalid; mismatched user/role/context principals returned 404 organization_mismatch; assigned worker without an explicit case grant returned 404; the same worker with a valid case grant returned 200",
    "Adversarial tsx probe: invalid resource IDs, malformed/cross-organization grant contexts, zero/negative/unsupported/cross-organization grant targets, and revoked/nullable legacy memberships all failed closed; context input was not mutated",
    "Adversarial audit probe: 500-character correlation input normalized to invalid-correlation and unknown action normalized to unknown; no raw unbounded action/correlation value escaped",
    "git diff --check: PASS (only normal LF/CRLF conversion warnings)",
    "credential-pattern scan over authorization territory: PASS, zero hits",
    "middleware mount scan: PASS, createResourceAuthorization is not mounted outside its own module"
  ],
  "decision": "accept_for_event",
  "unknowns": [
    "AuthorizationRepository remains an injected organization-scoped seam; no concrete database adapter was added in this repair unit.",
    "The authorization middleware remains intentionally unmounted; HTTP route integration is a later graph node.",
    "The frozen contract contains both assigned-worker relation language and an explicit case-grant invariant; this candidate follows the stricter explicit-case-grant rule and denies relation-only worker access."
  ],
  "dependency": "w1-auth-repair",
  "next_action": "Release w2-case-events only; keep route/middleware mounting gated on a concrete repository and later API integration review."
}
```

## Decision basis

All seven previously rejected classes of unsafe outcome were independently exercised against the current tree and failed closed. No source, route, middleware, schema, migration, or test file was edited by this task; this receipt is the only mutable output.

