# Command Program — CentralComs-Inspired Upgrade, Foundation Gate

Program:
  objective: Establish the secure organization, resource-authorization, and canonical case-event foundation needed to reduce customer-resolution time and coordination cost without sacrificing service quality.
  non_goals: No deployment, live external integration, credential use, financial automation, leasing automation, or premature UI replacement.
  finite_actions: Baseline; reconnaissance; publish contracts; implement isolated schema, authorization, and case-event units; integrate serially; verify; red-team; repair at most twice; close with receipts.
  stop_condition: Foundation acceptance checks pass within the loop budget, or a budget, permission, repeated-failure, or review-bandwidth gate stops the run.

Control:
  commander: /root
  lead: /root
  checkpoint_cadence: After every worker receipt, integration decision, and verification tier.
  interrupt_policy: Interrupt on overlapping writes, scope expansion, secrets, destructive operations, external effects, architecture drift, or repeated failure.

Memory:
  hot_context: The approved blueprint, current implementation diff, active task dependencies, last verifier output, and unresolved P0/P1 findings.
  cold_context: Repository audits, prior architecture blueprints, and rejected alternatives.
  state_path: .agent-state/centralcoms-upgrade/state.md
  artifact_path: .agent-state/centralcoms-upgrade/artifacts/

Bus:
  message_schema: `{task_id, state, artifact, evidence, decision, unknowns, dependency, next_action}`
  dependency_states: pending | ready | running | blocked_dependency | verify_failed | accepted | rejected | closed
  handoff_required_fields: Owned territory, exact changed files, checks run, residual risks, rollback, and no-overlap confirmation.

I/O:
  allowed_tools: Read-only repository inspection; apply_patch for owned local edits; local tests, build, lint, migration checks, and collaboration messages.
  denied_tools: Deployment, push, production/external mutation, credential use, destructive resets, hidden background services, and edits outside assigned territory.
  receipt_format: Typed IPC object plus deterministic command evidence.
  rollback_path: Preserve legacy routes; reject one integration unit at a time; use the pre-integration diff and explicit file ownership to recover without touching unrelated user work.

Verifier:
  command_or_fixture: Strict loop validator; scoped Vitest suites; schema parity; authorization denial tests; case-event replay/idempotency tests; full unit tests; TypeScript build; lint on changed files.
  reviewer: Independent security, migration, and regression checker agents.
  pass_threshold: All P0/P1 findings resolved, zero authorization bypasses, deterministic checks exit 0, and diff stays inside review budget.
  regression_check: Existing report, message, worker, payment, diagnosis, and UI unit tests remain green.

Self-improvement:
  candidate_destination: Project-local tests, contracts, and implementation receipts only.
  required_evidence: Repeated successful use plus deterministic verifier evidence.
  human_review: Required before promoting any generated process into a reusable skill, hook, automation, or production policy.

## Team admission

Parallel reconnaissance, isolated builders, and independent reviewers have genuinely disjoint territories. The estimated orchestration tax is one command program, three reconnaissance receipts, serial contract publication, and three review receipts. This is justified because authorization, schema migration, case-event correctness, and compatibility need independent expertise and cannot safely be self-certified.

Runtime concurrency is four active agents including the commander. The program therefore uses more than ten specialist agents in staggered parallel waves, with at most three workers active simultaneously.

## Specialist roster and exclusive territories

| Task | Specialist role | Territory / artifact | Dependency | Verifier |
|---|---|---|---|---|
| T01 | Schema reconnaissance | Read-only schema and migration gap receipt | baseline | commander |
| T02 | Authorization reconnaissance | Read-only HTTP/socket/media access map | baseline | commander |
| T03 | Test and migration reconnaissance | Read-only baseline and fixture plan | baseline | commander |
| T04 | Data-contract designer | Proposed organization/case/event contract artifact; no production file writes | T01–T03 | T11 |
| T05 | Schema and migration builder | Schema/migration files published by commander | T04 | T12 |
| T06 | Authorization-policy builder | New policy/service files only | T04 | T11 |
| T07 | HTTP compatibility integrator | Explicitly assigned route files only | T05–T06 | T13 |
| T08 | Realtime/media authorization integrator | Explicit socket/media boundary files only | T05–T06 | T11 |
| T09 | Case-event service builder | New case-event service/repository files only | T05 | T12 |
| T10 | Backfill/compatibility builder | New compatibility/backfill utility and fixtures only | T05, T09 | T12 |
| T11 | Security red team | Read-only cross-tenant/resource authorization review | integrated T06–T08 | commander |
| T12 | Migration/event checker | Read-only migration, replay, idempotency, SQLite/Postgres review | integrated T05, T09–T10 | commander |
| T13 | Regression/mission checker | Read-only full-diff, unit/build/lint and preservation review | integrated batch | commander |

## Integration policy

1. The commander owns shared schemas and publishes contracts before mutable workers start.
2. Worker edits are accepted one workstream at a time in dependency order.
3. No worker may edit a file already claimed by another active worker.
4. Passing tests do not override an ownership, authorization, migration, or payment-authority violation.
5. The batch closes only after an independent checker confirms the integrated result.
