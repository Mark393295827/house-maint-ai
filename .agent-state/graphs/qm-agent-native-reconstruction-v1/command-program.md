# QM agent-native reconstruction command program

- Run ID: `qm-agent-native-reconstruction-v1`
- Mission: execute the approved reconstruction blueprint as a domain-first modular monolith plus a durable, scoped, vendor-neutral agent runtime, then verify and refine it without production or external effects.
- Commander and integration owner: `/root`
- Graph contract: `docs/qm-agent-native-reconstruction.graph-contract`
- Blueprint: `docs/qm-agent-native-reconstruction-blueprint.md`
- Started: `2026-08-02T13:32:13+08:00`

## Admission and orchestration tax

The graph has four foundation branches with disjoint write territories after a single contract freeze, then three disjoint pilot branches. Parallel execution saves two branch-length critical paths and gives security/runtime work independent context. Coordination cost is bounded by one published contract, two serial joins, typed receipts, at most four concurrent processes, and `/root`-only integration.

## Non-goals and permissions

The graph's `non_goals` and `permission_boundary` are binding. In particular, workers may use only fake providers and synthetic/de-identified fixtures. Live model, payment, dispatch, notification, storage, deployment, credential, production, and customer-data effects are denied. Legacy deletion remains behind `g10-cutover-human-gate`.

## Typed IPC

```json
{
  "run_id": "qm-agent-native-reconstruction-v1",
  "task_id": "graph node id",
  "state": "READY|RUNNING|WAITING|VERIFYING|SUCCEEDED|REJECTED|FAILED|COMPENSATED",
  "attempt": 1,
  "artifact": "declared receipt or isolated source territory",
  "evidence": ["fresh verifier evidence"],
  "decision": "accept|reject|retry|escalate|stop",
  "unknowns": [],
  "dependency": "verified predecessor receipt and hash",
  "next_action": "one bounded action or stop reason"
}
```

Messages change graph state only when they carry this payload or a materially equivalent final receipt. Status chatter never releases a successor.

## Ownership and topology

- `/root` exclusively owns graph/command state, `packages/contracts`, shared root manifests until the contract is published, both joins, integration, rollback, and terminal acceptance.
- Foundation workers receive exactly one disjoint node territory from `g2` through `g5`; no worker may edit another branch or shared contracts.
- Pilot workers receive exactly one disjoint node territory from `g6` through `g8` after `j1` passes.
- Independent reviewers write only their declared receipt/output territory and may not certify their own implementation.
- The graph contract is the authoritative per-node owner, input, output, write territory, verifier, timeout, attempts, tools, effect class, idempotency, and compensation map.

## Execution protocol

1. `/root` validates the static DAG, records a mutation-free baseline, and publishes versioned contracts.
2. Release only nodes whose incoming payloads are verified and checkpointed.
3. Each worker performs `state + evidence -> next action -> verifier -> next state | stop | escalate` and emits a typed receipt.
4. `/root` checks territory, contract hashes, diffs, and focused tests before accepting one branch at a time.
5. `j1` and `j2` run broad integration checks; a green worker report alone cannot release a join.
6. Retry only the smallest failed node after a changed diagnosis, at most twice. Whole-graph retry is forbidden.
7. `g9` must be fresh-context independent verification. `g10` is a real human gate; absence of approval means `g11` waits, not implicit approval.
8. Close workers and record cleanup after their receipt is accepted or rejected.

## Checkpoints, interrupt policy, and recovery

- Durable current state: `.agent-state/graphs/qm-agent-native-reconstruction-v1/state.json`
- Atomic checkpoint: `.agent-state/graphs/qm-agent-native-reconstruction-v1/checkpoint.json`
- Append-only transitions: `.agent-state/graphs/qm-agent-native-reconstruction-v1/events.jsonl`
- Evidence: `.agent-state/graphs/qm-agent-native-reconstruction-v1/artifacts`
- Checkpoint after every material edit and verifier result.
- Interrupt on writer overlap, unexpected secret/private content, live-provider attempt, external effect, incompatible contract, repeated failure signature, exhausted node budget, or user override.
- Recover from the failed node's source/artifact checkpoint only; preserve verified branches and unrelated user changes.

## Promotion boundary and definition of done

Local source and fake-provider verification may be promoted through `g9`. Production enablement is outside this graph. Legacy decommission may start only with a named approval receipt bound to current implementation and verification hashes. The mission is complete only when the terminal verifier proves every blueprint hard gate and records remaining production decisions.
