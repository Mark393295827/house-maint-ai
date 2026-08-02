# C4 — Terminal regression receipt

```json
{
  "task_id": "c4-regression",
  "state": "SUCCEEDED",
  "artifact": ".agent-state/practical-backend-api-20260801/artifacts/c4-regression.md",
  "evidence": [
    "npm run test:unit:node -- --reporter=dot: PASS; 55 test files / 285 tests passed.",
    "npm run test:unit:ui -- --reporter=dot: PASS; 38 test files / 192 tests passed.",
    "npm run build: PASS; TypeScript project build and Vite production bundle completed successfully. Vite emitted the existing NODE_ENV-in-.env informational warning only.",
    "npm run lint: PASS; 0 errors and 198 warnings. Warnings are existing unused-variable diagnostics across the repository, including worktree copies; no lint failure occurred.",
    "Focused API/event/auth/schema/transaction suite: PASS; 8 files / 44 tests passed (case-api, case-events, authorization-policy, authorization-compatibility, database-transactions, foundation-schema, postgres-schema-parity, sqlite-migration-convergence).",
    "CASE_API_ENABLED static check: PASS; server/index.ts enables the candidate only when process.env.CASE_API_ENABLED === 'true'. The process value was unset during this run, so the default is disabled.",
    "git diff --check: PASS; no whitespace errors (Git reported only existing LF/CRLF normalization warnings).",
    "Credential-pattern scan: PASS; zero API-key/private-key pattern hits after excluding node_modules, dist, .git, and .claude worktrees.",
    "No source, route, test, schema, or configuration files were edited by this checker; this receipt is the only checker output."
  ],
  "decision": "accept",
  "unknowns": [
    "PostgreSQL runtime was not available in this local run; only SQLite execution and structural PostgreSQL schema parity were exercised.",
    "A concrete organization-scoped AuthorizationRepository/resolver is not mounted; enabled case traffic therefore remains fail-closed with authorization_unavailable until the resolver seam is supplied.",
    "PostgreSQL concurrent creates still require an organization-scoped idempotency uniqueness/transaction guarantee; the current case-event uniqueness is case-scoped and cannot by itself close an organization-level race before a case id exists.",
    "The current command hash includes correlationId. Replaying a body and idempotency key with a changed X-Correlation-Id returns idempotency_conflict; confirm whether correlation metadata should be excluded from command identity in a follow-up contract decision."
  ],
  "dependency": "c3-mount-integration accepted; c2 API checker, authorization red-team, and payload-shape checker accepted.",
  "next_action": "Release the terminal receipt to /root. Keep CASE_API_ENABLED disabled until a concrete authorization resolver and PostgreSQL idempotency/concurrency gate are implemented and verified; then address correlation-id hash semantics as a contract decision."
}
```
