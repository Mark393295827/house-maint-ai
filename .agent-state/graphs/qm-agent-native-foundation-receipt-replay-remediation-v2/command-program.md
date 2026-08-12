# Foundation receipt-replay remediation v2 command program

- Run ID: `qm-agent-native-foundation-receipt-replay-remediation-v2`
- Mission: deny stale `open_case` idempotency receipts after the current canonical case moves outside the caller's property/unit ancestry.
- Commander and integration owner: `/root`
- Graph contract: `docs/qm-agent-native-foundation-receipt-replay-remediation.graph-contract`
- Parent rejection: `qm-agent-native-foundation-remediation-v1/r3`, attempt 2
- Started: `2026-08-09T13:04:33+08:00`

## Admission and topology

This is the smallest invalid subgraph: one domain maker followed by one fresh-context checker. The maker edits two declared files and emits a content-addressed receipt. The checker edits only the terminal receipt. Work is serial because the checker consumes the maker's exact hashes; whole-graph replay and a hidden third r3 attempt are forbidden.

## Typed IPC

```json
{
  "run_id": "qm-agent-native-foundation-receipt-replay-remediation-v2",
  "task_id": "s0|s1|s2 graph node id",
  "state": "READY|RUNNING|VERIFYING|SUCCEEDED|REJECTED|FAILED",
  "attempt": 1,
  "artifact": "declared receipt",
  "evidence": ["fresh verifier evidence"],
  "decision": "accept|reject|retry|stop",
  "unknowns": [],
  "dependency": "verified predecessor hash",
  "next_action": "one bounded action"
}
```

## Ownership, interrupt, and promotion

- `/root` owns graph state, snapshot, leases, parent amendments, integration, and rollback.
- The maker owns only `packages/domain/src/command-service.ts`, `tests/integration/cases/in-memory-command-authority.test.ts`, and its receipt.
- The independent checker owns only the v2 terminal receipt and may not repair source.
- Stop on an overlapping writer, unexpected credential/private content, external effect, repeated exploit, exhausted budget, or weakened PostgreSQL requirement.
- Parent `j1` attempt 2 remains blocked until the v2 terminal receipt passes and is bound to current source, build, node, and UI evidence.
