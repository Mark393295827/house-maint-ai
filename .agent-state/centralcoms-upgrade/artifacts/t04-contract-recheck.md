# T04 Foundation-Contract Recheck

## Scope and decision

- Rechecked only `t04-foundation-contract.md` against every P0/P1 finding in `t04-contract-review.md`.
- Source/config/schema/migration/test edits: none.
- Decision: **ACCEPT for T05A and T06 launch**, with T05B starting only after T05A integration and T09 starting only after T05B publishes and passes the transaction interface.

## Finding closure

- **P0-1 resolved:** `case_events` now persists canonical `projection_patch_json`; event types and reducer v1 are frozen; hashes cover the durable projection content; initial/close/reopen rules fail closed; replay starts without mutable projection fields and must equal the stored projection.
- **P0-2 resolved:** every SQLite operation enters one connection-wide FIFO gate; the owned transaction client bypasses reacquisition, rejects nesting/use-after-close, and specifies callback, commit, and rollback failure behavior; the ordinary-query race is an explicit T05B acceptance test.
- **P0-3 resolved:** `AuthorizationContext`, resolved ancestry/relations, validated grants, and structured `QueryScope` are frozen; raw SQL and post-query filtering are forbidden; inheritance and no-upward/no-sibling rules are explicit; context loading and target validation occur in one organization-scoped repository operation.
- **P1-1 resolved:** active organization/membership, immediate revocation, grant revocation/expiry, UTC evaluation, and equality-as-expired are frozen and included in T06 acceptance.
- **P1-2 resolved:** `PolicyDecision` returns a content-minimized `AuditEnvelope`; T06 remains pure and persistence is explicitly deferred to a B2-approved sink.
- **P1-3 resolved:** referential deletion actions are frozen per edge; organization/history edges use `RESTRICT`, legacy report linkage uses `SET NULL`, and cascade deletion is prohibited.
- **P1-4 resolved:** integration order is frozen as T05A → T05B → T06 → T09; T06 may build alongside T05A but integrates after T05B, and T09 cannot start before T05B passes.
- **P1-5 resolved:** exact owned filenames are published for T05A, T05B, T06, and T09; small fixtures stay local and no mutable shared foundation fixture is authorized.
- **P1-6 resolved:** T05 is split into serial T05A/T05B review units; each unit is capped at 900 human-authored changed lines and 12 files, with generated snapshot exemption conditioned on receipts and structural verification.
- **P1-7 resolved:** PostgreSQL runtime behavior remains `BLOCKED_DEPENDENCY`; static SQL/type comparison is explicitly non-runtime evidence, and the case-spine path remains unpromoted without an executable harness.

## Residual dependency, not a launch blocker

- T05B depends on integrated T05A.
- T06 may launch for build work now, but integration waits for T05B.
- T09 waits for T05B publication and passing transaction-interface evidence.
- PostgreSQL promotion remains blocked pending an approved executable runtime harness.

## Typed IPC

```json
{
  "task_id": "T04-CONTRACT-RECHECK",
  "state": "accepted",
  "artifact": ".agent-state/centralcoms-upgrade/artifacts/t04-contract-recheck.md",
  "evidence": {
    "p0_resolved": 3,
    "p1_resolved": 7,
    "reviewed": ["t04-foundation-contract.md", "t04-contract-review.md"],
    "source_edits": []
  },
  "decision": "ACCEPT_T05A_T06_LAUNCH",
  "unknowns": ["PostgreSQL runtime transaction/parity behavior pending executable harness"],
  "dependency": "T05B after T05A integration; T06 integration after T05B; T09 launch after T05B publishes and passes",
  "next_action": "Launch T05A and T06 build work; preserve the frozen serial integration order and PostgreSQL promotion block"
}
```
