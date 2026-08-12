# QM pilot-composition remediation command program

- Run ID: `qm-agent-native-pilot-composition-remediation-v1`
- Parent run: `qm-agent-native-reconstruction-v1`
- Mission: close only the six independently reproduced pilot-composition gaps while preserving accepted g6/g7/g8 work and the unconsumed j2 attempt.
- Commander and integration owner: `/root`
- Graph contract: `docs/qm-agent-native-pilot-composition-remediation.graph-contract`
- Graph SHA-256: `f38edcbd730f1525c87fdad5a0711b66cdec7cdf9e654a6d93cc105dd1a2dad5`

## Topology

`p0` freezes parent hashes and blockers. `p1` repairs run-plan lifecycle while `p2` repairs canonical artifact adoption in parallel and under disjoint writes. Their barrier releases `p3`, which owns the integrated fake-provider/live-PostgreSQL bridge. A fresh-context `p4` may write only the terminal receipt.

## Binding rules

- Accepted parent source and receipts are read-only except for the exact files leased by this overlay.
- Every task uses synthetic fixtures, injected structured-output routes, and fake delivery only.
- No live provider, external delivery, credential, customer, production, deployment, cutover, or deletion effect is permitted.
- A maker may not certify its own implementation; `/root` verifies each maker receipt and `p4` independently verifies the terminal overlay.
- Retry only the smallest failed node after a changed diagnosis, never beyond its declared attempt limit.
- `j2-pilot-integration` remains pending and attempt zero until the terminal overlay receipt is independently accepted.

## Typed transition

Each node reports `run_id`, `task_id`, `state`, `attempt`, `artifact`, `evidence`, `decision`, `unknowns`, `dependency`, and `next_action`. Status chatter does not release successors.

## Recovery

Checkpoint after every material verifier result. On failure, restore only the node's declared files and receipt. Never replay accepted sibling branches, broaden writer territory dynamically, or weaken the live PostgreSQL, process-cleanup, scope, budget, evaluator, and idempotency gates.
