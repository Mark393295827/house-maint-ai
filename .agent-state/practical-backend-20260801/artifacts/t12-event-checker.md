{
  "task_id": "t12-event-checker",
  "attempt": 2,
  "state": "REJECTED",
  "artifact": ".agent-state/practical-backend-20260801/artifacts/t12-event-checker.md",
  "evidence": [
    "npx vitest run --config vitest.config.ts server/tests/case-events.test.ts --reporter=dot: PASS (1 file, 8 tests)",
    "npx vitest run --config vitest.config.ts server/tests/foundation-schema.test.ts server/tests/sqlite-migration-convergence.test.ts server/tests/postgres-schema-parity.test.ts server/tests/database-transactions.test.ts --reporter=dot: PASS (4 files, 15 tests)",
    "npx eslint server/services/case-events/*.ts server/tests/case-events.test.ts: PASS; npx tsc -p server/tsconfig.json --noEmit: PASS",
    "Independent SQLite probes: same-key same-command replay PASS; same-key different-command conflict PASS (idempotency_conflict); optimistic version conflict and no projection mutation PASS; rollback leaves zero event and version 0 PASS; concurrent appends produce one commit and one version_conflict PASS; member actor null and undefined fail closed PASS; idempotency and correlation values over 128 characters fail closed PASS; cross-organization append returns not_found and writes no event PASS.",
    "Independent replay-integrity probes: tampered, missing, and malformed payload_hash values fail closed; tampered, missing, and malformed command_hash values fail closed; altered canonical payload with the old command hash fails closed after command reconstruction; canonical JSON ordering and SHA-256 determinism PASS.",
    "Independent reducer probes: malformed stored patch JSON fails closed; explicit projection patch allow-list rejects unexpected keys; invalid first-event createdAt fails closed; case_opened and legacy_imported after an existing projection fail closed; non-contiguous sequence, organization/case binding, first-event opening/import rule, and reducer-version mismatch fail closed.",
    "Replay isolation probe PASS: service.replay only queries case_events and reconstructs the projection from stored patches after maintenance_cases was mutated; no mutable projection read occurred.",
    "Static migration/schema review PASS: SQLite and PostgreSQL case-event columns, event types, reducer-version check, member-actor check, composite foreign keys, append-only triggers, sequence/idempotency uniqueness, and indexes are structurally present; 0006 migrations contain no INSERT/UPDATE/DELETE, DROP TABLE, or TRUNCATE. PostgreSQL foundation migration has only idempotent DROP TRIGGER statements for replacing append-only trigger definitions.",
    "git diff --check over server/services/case-events and server/tests/case-events.test.ts: PASS; credential-pattern scan over case-event source: PASS, zero hits."
  ],
  "decision": "reject",
  "findings": [
    {
      "severity": "P1",
      "title": "Replay accepts semantically malformed stored payload shapes",
      "reproduction": "Start from a valid case_opened CaseEventRow. Replace payload_json with each canonical JSON value [], null, 1, or \"text\"; recompute payload_hash as sha256(payload_json) and command_hash from the reconstructed command envelope; replayEvents([row]) returns a version-1 projection for all four values.",
      "impact": "CaseEventInput requires payload: Record<string, unknown>, and append rejects arrays/primitives, but replay's parseCanonicalJson<Record<...>> is only a TypeScript cast. Because case_events.payload_json is TEXT without a JSON-object constraint, a raw/legacy writer or corrupted row can enter the replayable log with a non-object payload while all hashes remain valid.",
      "required_repair": "Add a runtime isJsonRecord assertion after parsing payload_json (reject null and arrays before hashing/reducing), and add fixtures for [], null, primitive, and valid object payloads. Keep the append-side object validation."
    }
  ],
  "unknowns": [
    "No PostgreSQL runtime harness or live database was available; transaction, trigger, and payload-shape behavior on PostgreSQL is structural-only.",
    "Replay relies on database CHECK/FK constraints for stored actor type, member actor binding, positive identifiers, schema_version, and correlation/idempotency bounds; this checker did not add a raw SQL bypass fixture for those invariants.",
    "Route/API integration and legacy report compatibility were not reviewed by this checker, per the graph boundary."
  ],
  "dependency": "w2-case-events attempt 2",
  "next_action": "Hold the t12-to-w3 join. Route the smallest repair to the case-event owner (runtime record assertion for replay payloads plus malformed-shape tests) and rerun this checker, or obtain explicit commander approval to scope raw-row payload shape outside the event integrity contract; do not release the API node while this receipt is rejected."
}
