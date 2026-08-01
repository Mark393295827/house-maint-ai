# Payload-shape remediation command program

Mission: Repair the exact P1 identified by t12 without replaying the accepted Wave 0–2 work. The commander owns the checkpoint and continuation decision; the repair worker owns only the two declared source/test files, and the checker owns only its receipt.

Topology: maker-checker. The graph is linear because the remediation has one dependency and one independent verifier; no parallel branch repays its coordination cost.

Typed IPC:

```json
{
  "task_id": "r1-payload-shape-repair",
  "state": "READY|RUNNING|VERIFYING|SUCCEEDED|FAILED",
  "artifact": ".agent-state/practical-backend-integrity-20260801/artifacts/<task>.json",
  "evidence": ["fresh command receipts"],
  "decision": "accept|reject|retry|escalate",
  "unknowns": [],
  "dependency": "r0-integrity-input",
  "next_action": "one bounded action or stop reason"
}
```

Ownership:

- `r0-integrity-input` (`/root`): reads the rejected t12 receipt and writes only `r0-integrity-input.json`.
- `r1-payload-shape-repair` (repair worker): writes only `server/services/case-events/repository.ts`, `server/tests/case-events.test.ts`, and `r1-payload-shape-repair.json`; it may not touch any other source.
- `r2-payload-shape-checker` (independent checker): writes only `r2-payload-shape-checker.md`.

The source files were previously owned by the completed Wave 2 node; this remediation is a sequential handoff after its rejected checker gate, with no concurrent writer. The repair must add a runtime record/object assertion after parsing `payload_json` and four malformed-shape fixtures, preserving valid object replay and all existing behavior.

Permission: local tests and source only; no credentials, providers, deployment, push, or schema/migration mutation. Stop on any new scope requirement. A green checker opens a separate continuation graph; it does not retroactively mark the rejected graph green.
