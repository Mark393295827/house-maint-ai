# r2-payload-shape-checker receipt

- task_id: r2-payload-shape-checker
- state: SUCCEEDED
- artifact: `.agent-state/practical-backend-integrity-20260801/artifacts/r2-payload-shape-checker.md`
- evidence:
  - Read `.agent-state/practical-backend-integrity-20260801/artifacts/r0-integrity-input.json` and `r1-payload-shape-repair.json`; scope was limited to replay payload-shape verification.
  - `npx vitest run --config vitest.config.ts server/tests/case-events.test.ts --reporter=dot`: PASS, 1 file, 9 tests.
  - Independent replay probe with recomputed valid `payload_hash` and `command_hash`: canonical `[]`, `null`, `1`, `false`, and `"text"` all failed closed with `Stored payload must be a JSON object`; a valid object payload replayed to the original projection.
  - Independent integrity probes all passed: payload-hash tamper, command-hash tamper, projection-patch allow-list, strict opening timestamp, organization binding, case binding, idempotent same-key replay, idempotency conflict, transaction rollback, and mutable-projection isolation.
  - `npx tsc -p server/tsconfig.json --noEmit`: PASS.
  - `npx eslint server/services/case-events/*.ts server/tests/case-events.test.ts`: PASS.
  - `git diff --check`: PASS; Git emitted only existing LF/CRLF normalization warnings for unrelated authorization files.
  - Credential-pattern scan over case-event source and focused tests: 0 matches.
- decision: ACCEPT
- unknowns:
  - PostgreSQL runtime behavior remains structural-only; no live PostgreSQL instance was exercised.
  - The repository contains unrelated uncommitted authorization work; this checker made no source, test, schema, migration, route, or index edits.
- dependency: r1-payload-shape-repair
- next_action: Release the repaired replay payload boundary to the next graph join; retain PostgreSQL runtime verification as a separate dependency-gated check.
