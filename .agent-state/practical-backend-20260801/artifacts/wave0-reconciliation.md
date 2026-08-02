# Wave 0 reconciliation receipt

- run_id: `practical-backend-20260801`
- task_id: `w0-reconcile`
- state: `SUCCEEDED`
- verified_at: `2026-08-01T17:13:00+08:00`
- commit: `a6939e9 Add organization-scoped maintenance case foundation`
- working_tree_before_workers: clean except the new blueprint and this run state

## Fresh verification

| Check | Result |
|---|---|
| `npm run test:unit:node` | PASS — 53 files, 267 tests |
| `npm run test:unit:ui` | PASS — 38 files, 192 tests |
| `npm run build` | PASS — TypeScript and Vite production build |
| `npm run lint` | PASS — 0 errors, 198 warnings (pre-existing/unrelated warning inventory) |
| focused foundation/auth/transaction suite | PASS — 6 files, 26 tests |
| `git diff --check` | PASS |
| secret-pattern scan of source/docs/run artifacts | PASS — no API-key/private-key hits; password matches are field names/tests only |
| loop contract validator | PASS — strict |
| graph contract validator | PASS — strict, 8 nodes, 10 edges, 2 joins |

## Architecture and ownership classification

### Accepted inputs for the next wave

- T05A additive organization/property/unit/grant/maintenance-case/event schema and SQLite/PostgreSQL structural migration files remain present and covered by the focused schema/parity tests.
- T05B SQLite FIFO transaction gate and PostgreSQL transaction helper remain present and covered by six transaction tests.
- The new practical-backend control contracts are validated and become the authoritative run state; the stale `centralcoms-upgrade` state is historical evidence only.

### Rejected or still unverified

- T06 authorization is not promoted. The prior independent T11 receipt rejected seven unsafe outcomes. The current tree contains partial repairs, but a fresh red-team receipt is required before middleware or case routes are mounted.
- The case-event repository/reducer service is absent (`server/services/case-events/**` does not exist), so no case replay claim is accepted.
- The broad `server/routes/agent.routes.ts` and related AI services/tests are present and unit-covered, but remain compatibility/batch work rather than the concise internal task contract. They are not widened or deleted in this run.
- The broad property-tools/UI batch is preserved because the full UI suite and build pass, but it is outside Waves 0–2 backend promotion and has no new backend ownership claim.
- `resourceAuthorization` is not mounted; `/uploads` remains a public static surface; Socket.IO remains globally scoped; PostgreSQL runtime migration/transaction parity remains blocked dependency.

## Promotion decision

Wave 0 is green and releases only the `wave0_receipt` payload. It does not authorize route mounting or external effects. The next READY node is `w1-auth-repair`; `w2-case-events` and API work remain WAITING behind the graph joins.

## Residual risks

1. Authorization fixes may still fail adversarial cases until T11 completes.
2. The current commit has a broad 52-file architecture delta; preservation is evidenced by tests, not by a final scope reduction.
3. No production or PostgreSQL runtime claim is made.
