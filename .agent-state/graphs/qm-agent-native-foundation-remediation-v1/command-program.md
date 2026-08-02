# QM agent-native foundation remediation command program

- Run ID: `qm-agent-native-foundation-remediation-v1`
- Mission: close the four defects rejected by `j1-foundation-integration` without replaying accepted reconstruction branches.
- Commander and integration owner: `/root`
- Graph contract: `docs/qm-agent-native-foundation-remediation.graph-contract`
- Parent graph: `qm-agent-native-reconstruction-v1`
- Started: `2026-08-02T14:31:32+08:00`

## Admission and orchestration tax

Two independent repairs touch disjoint territories: domain/migration scope safety and runtime deadline accounting. Parallel execution removes one repair-length critical path and gives the final checker fresh context. Coordination is bounded to one frozen rejection snapshot, two typed maker receipts, one checker receipt, two concurrent writers, and `/root`-only integration.

## Binding boundaries

The remediation graph contract is authoritative. Only fake providers and synthetic fixtures are allowed. Live provider calls, external delivery, production mutation, credentials, unrelated workspace/security/pilot work, and weakening the downstream live PostgreSQL gates are denied.

## Typed IPC

```json
{
  "run_id": "qm-agent-native-foundation-remediation-v1",
  "task_id": "r0|r1|r2|r3 graph node id",
  "state": "READY|RUNNING|WAITING|VERIFYING|SUCCEEDED|REJECTED|FAILED|COMPENSATED",
  "attempt": 1,
  "artifact": "declared remediation receipt",
  "evidence": ["fresh verifier evidence"],
  "decision": "accept|reject|retry|escalate|stop",
  "unknowns": [],
  "dependency": "rejection snapshot or verified maker receipt hash",
  "next_action": "one bounded action or stop reason"
}
```

Messages without equivalent evidence never release a successor.

## Ownership and execution

- `/root` exclusively owns graph/command state, the rejection snapshot, worker leases, integration, and parent-graph state.
- The domain owner may write only `packages/domain/src`, the reconstruction migration, affected case tests, and its isolated receipt.
- The runtime owner may write only `packages/agent-core/src`, runtime testkit/tests, and its isolated receipt.
- The independent reviewer may write only the terminal remediation receipt and may not alter implementation.
- Retry only the smallest failed repair after a changed diagnosis, at most twice. Whole-graph replay is forbidden.
- Interrupt on writer overlap, secret/private content, live-provider intent, external effect, scope bypass, repeated failure signature, or budget exhaustion.

## Promotion boundary

The parent `j1` may receive a second verification attempt only after `r3` emits a current passing receipt bound to both maker receipts. That receipt supplements rather than rewrites the original g3/g4 history. Downstream g6-g8 remain blocked until `j1` passes.
