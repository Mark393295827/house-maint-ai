# C2 — Case API checker receipt (attempt 2)

```json
{
  "task_id": "c2-case-api-checker",
  "attempt": 2,
  "state": "SUCCEEDED",
  "artifact": ".agent-state/practical-backend-api-20260801/artifacts/c2-case-api-checker.md",
  "evidence": [
    "npx vitest run --config vitest.config.ts server/tests/case-api.test.ts --reporter=dot: PASS (1 file, 9 tests). This includes body/header organization binding and both route failure-envelope regressions.",
    "Independent SQLite/supertest probes: no resolver returned 503 authorization_unavailable with zero cases; injected same-org create returned 201; a resolver-denied cross-org hint returned 403 forbidden with a generic message; strict unknown body returned 422 invalid_input; malformed X-Expected-Version returned 422 invalid_input; same key replay returned 200 and one event; changed payload returned 409 idempotency_conflict; stale expected_version returned 409 version_conflict; case rollback trigger returned JSON internal_error, no SQL/stack leakage, and left zero maintenance_cases and zero case_events; one successful create left exactly one opening event.",
    "Exact organization-binding probes: an allow-all resolver plus body organization_id=2 returned 403 and inserted zero cases; conflicting body organization_id=1 and X-Organization-Id=3 returned generic 403 before resolver invocation (zero calls and zero cases).",
    "Exact storage-failure probes through standalone factories: case trigger returned status 500, application/json, {error:{code:'internal_error',message:'Unable to create maintenance case'}}, no SQL/stack text, and zero cases/events; compatibility trigger returned status 500, application/json, {error:{code:'internal_error',message:'Unable to create report'}}, no SQL/stack text, and zero reports/tasks/cases/events.",
    "Legacy POST /reports probe: first call returned 201 with the legacy {status,message,data.report} envelope; replay returned 200; counts remained reports=1, maintenance_cases=1, case_events=1, tasks=1.",
    "npx tsc -p server/tsconfig.json --noEmit: PASS.",
    "npx eslint server/routes/cases.routes.ts server/routes/reportCompatibility.routes.ts server/tests/case-api.test.ts: PASS, 0 errors and 0 warnings.",
    "git diff --check over route/test territory: PASS; credential-pattern scan over the same files: PASS, zero hits; no provider, credential, AI, or agent imports found.",
    "server/routes/reports.ts has no diff and is not imported/mutated by either factory; server/index.ts still mounts only the existing reports router, so the candidate remains default-off (no case API mount present)."
  ],
  "decision": "accept_for_mount",
  "unknowns": [
    "No PostgreSQL runtime was available. The schema/migrations only enforce UNIQUE(case_id,idempotency_key), not an organization-scoped idempotency key; concurrent PostgreSQL creates can race past findExistingOpeningEvent and produce two cases. Treat this as a follow-up integrity gate or add a transactional/unique organization-scope guarantee before enabling production traffic.",
    "Changing X-Correlation-Id while replaying the same body and idempotency key returns 409 idempotency_conflict because correlationId is included in openingCommandHash. Confirm whether correlation metadata is intentionally part of command identity; if not, exclude it from the idempotency hash and add a retry fixture.",
    "A concrete database-backed AuthorizationRepository/resolver and the commander-owned feature-flag mount were outside this checker; the current tree is default-off because no candidate route is mounted."
  ],
  "dependency": "c1-case-api-builder attempt 2; accepted case-event and authorization receipts",
  "next_action": "Release c2 acceptance to /root. Add the explicit default-off feature-flag mount only in c3, preserve existing /reports ordering, then run terminal regression; do not edit or mount routes from this checker."
}
```

## Notes

Attempt 2 closes both findings from the rejected receipt: organization hints are now bound before case creation, and unknown storage failures are mapped to redacted JSON envelopes. No source or test files were edited by this checker; this receipt is the only output.
