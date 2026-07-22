# Continuous Audit Loop Contract

- Objective: Keep frontend, backend, and data behavior aligned by turning fresh evidence into bounded, verified repair tasks.
- Mode: Loop
- Trigger: Manual `npm run audit:loop`, a future CI event after human approval, or an explicit operator request.
- Scope: Local repository code, local test databases, frontend flows, backend APIs, persistence contracts, tests, and audit artifacts.
- Non-goals: Production deployment, external mutation, shared database migration, paid model calls, speculative product changes, or automatic merge/commit/push.
- Owner: Primary planning agent; each atomic task has one named specialist owner and an independent verifier.
- Inputs: Git worktree state, source files, package scripts, test fixtures, migration files, local environment flags, and prior audit state.
- Artifacts path: `output/agent-audit/runs/<run-id>/` with durable summaries under `docs/agent-audit/`.
- State path: `output/agent-audit/state.json`.
- Work clock: One invocation with a 30 minute wall-clock cap and timestamped checkpoints.
- Success metric: All admitted P0/P1 findings closed with fresh evidence, required gates passing, and zero unresolved cross-layer contract mismatches.
- Evidence: Command receipts, test results, schema checks, screenshots/traces when relevant, diffs, and typed worker handoffs.
- Verifier: Deterministic repository checks plus an independent verification specialist who is separate from the assigned implementer.
- Topology: manager-workers
- Max iterations: 3 iterations per invocation and 2 attempts per repeated failure signature.
- Time limit: 30 minutes per invocation.
- Budget: At most 4 concurrent specialists, 20 commands per iteration, and no paid external API usage.
- Review budget: At most 30 changed files and 1000 changed lines per integration batch.
- Stop condition: Required gates pass and no eligible issue remains; otherwise stop on repeated signature twice, metric regression, permission boundary, 3 iterations, 30 minutes, or review budget exhaustion.
- Write-back: Atomically replace current state, append iteration receipts, update the task board, and publish a final audit summary without committing automatically.
- Permission boundary: No production deploy, publish, external/shared mutation, credential change, destructive git action, or shared database write; any future crossing requires explicit human approval and a verified rollback.
- Recovery: Resume from the last valid state receipt; reject a failed integration, apply a scoped inverse patch only to commander-created edits, rerun the failed unit, and preserve unrelated user changes.

## Iteration State Machine

```text
observe -> orient -> decide -> act -> verify -> checkpoint
   ^                                              |
   |---------------- eligible work ---------------|

checkpoint -> complete | verify_failed | no_progress | budget_stop | needs_input
```
