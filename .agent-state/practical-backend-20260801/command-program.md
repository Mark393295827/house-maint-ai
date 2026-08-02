# Practical backend command program

## Mission

Execute Waves 0–2 of `docs/backend-practical-iteration-blueprint.md`: reconcile the committed foundation, repair and independently challenge authorization, build the replayable case-event service, and connect only the first case/report create seam. The commander remains `/root`; integration is serial and evidence-gated.

## Topology and admission

`manager-workers` is admitted because authorization repair and case-event work have distinct file territories and require independent red-team/checker judgment. They are still dependency-ordered, so concurrency is capped at two and no worker may cross a declared territory. The graph contract owns dependency direction; this program owns worker ownership, IPC, integration, and cleanup.

## Finite actions

1. `w0-reconcile` records a fresh post-commit baseline and classifies the broad agent/property-tools batch.
2. `w1-auth-repair` repairs only the authorization territory after reading the Wave 0 receipt.
3. `t11-auth-redteam` independently reproduces the seven security findings and adds denial fixtures.
4. `w2-case-events` builds only the case-event service after the authorization receipt is accepted.
5. `t12-event-checker` checks reducer, transaction, migration, replay, and idempotency behavior.
6. `w3-case-api` prepares the concise case create and report compatibility routes after both checkers pass.
7. `g1-integrate-case-api` is the commander-owned mount/review gate; it is the only node allowed to edit `server/index.ts` in this run.
8. `t13-regression` runs the terminal regression and preservation checks.

## Typed IPC

Every worker message is a JSON object with exactly these semantic fields:

```json
{
  "task_id": "w1-auth-repair",
  "state": "READY|RUNNING|VERIFYING|SUCCEEDED|FAILED|WAITING|STOPPED",
  "artifact": ".agent-state/practical-backend-20260801/artifacts/<task>.json",
  "evidence": ["command and result receipt paths"],
  "decision": "accept|reject|retry|escalate",
  "unknowns": ["bounded unresolved questions"],
  "dependency": "verified upstream task id or null",
  "next_action": "one bounded action or stop reason"
}
```

Status chatter is not IPC. A transition is released only after its artifact exists, its verifier has run, and the commander has appended the edge payload reference to `events.jsonl` and `state.json`.

## Ownership map

| Task | Owner | Exclusive mutable territory | Artifact | Verifier |
|---|---|---|---|---|
| `w0-reconcile` | `/root` | `.agent-state/practical-backend-20260801/artifacts/wave0-reconciliation.md` | Wave 0 receipt | fresh baseline plus diff/ownership classification |
| `w1-auth-repair` | authorization repair worker | `server/services/authorization/**` and auth-focused tests only | `auth-repair.json` | focused policy/compatibility tests and static scope audit |
| `t11-auth-redteam` | independent security worker | `.agent-state/practical-backend-20260801/artifacts/t11-auth-redteam.md` and new denial fixtures only | red-team receipt | cross-org, unrelated, revoked, expired, forged ancestry, binding, and bounded audit cases |
| `w2-case-events` | case-event worker | `server/services/case-events/**` and `server/tests/case-events.test.ts` only | `case-events-candidate.json` | reducer/repository tests plus transaction helper |
| `t12-event-checker` | independent migration/event worker | `.agent-state/practical-backend-20260801/artifacts/t12-event-checker.md` | event checker receipt | replay/idempotency/rollback and SQLite/PG structural parity |
| `w3-case-api` | API worker | `server/routes/cases.routes.ts`, `server/routes/reportCompatibility.routes.ts`, and API tests only | `case-api-candidate.json` | envelope, validation, compatibility, and authorization seam tests |
| `g1-integrate-case-api` | `/root` | `server/index.ts` plus integration receipt | `case-api-integrated.json` | serial diff review and focused route test |
| `t13-regression` | independent regression worker | `.agent-state/practical-backend-20260801/artifacts/t13-regression.md` | terminal receipt | Node/UI/build/lint and preservation checks |

## Permission and effect policy

Allowed: local reads, local tests, edits inside the exclusive territories, and local receipts. Denied: production, deploy, push, publication, external providers, credentials, destructive migration, payment, and broad cross-territory edits. Any requested boundary expansion is a `BLOCKED_PERMISSION` stop and needs human approval plus rollback preparation.

## Integration protocol

The commander accepts one verified artifact at a time in graph order. A rejected artifact remains preserved with its evidence; only the smallest failed node may be retried, with a changed diagnosis or strategy and at most two attempts. No whole-graph retry is permitted. Before the mount gate, `/root` runs `git diff --check`, inspects ownership, and records a rollback checkpoint. After terminal regression, `/root` decides whether to commit the accepted local source changes; no push is implied.

## Interrupt, stop, and cleanup

Interrupt a worker on budget exhaustion, repeated failure signature, ownership overlap, or dependency invalidation. Persist its last IPC receipt and leave source untouched if the artifact is not accepted. At run end, close/reuse workers, record accepted/rejected tasks, and leave only durable receipts and accepted source changes; no temporary worktree or credential material is permitted.
