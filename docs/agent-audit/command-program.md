# Multi-Agent Audit Command Program

Program:

- Objective: Continuously audit and verify the user-facing application, backend APIs, and persistence layer; convert verified findings into MECE tasks; fix reproducible bugs; and preserve evidence for every accepted change.
- Non-goals: Production deployment, external service mutation, schema migration against shared databases, broad visual redesign, speculative refactoring, or overwriting unrelated working-tree changes.
- Finite actions: Baseline, decompose, inspect, reproduce, prioritize, repair, verify, integrate, report, and checkpoint.
- Stop condition: Stop when all admitted P0/P1 findings are fixed and verified, no eligible issue remains, the same failure signature occurs twice, or an iteration/review/time budget is exhausted.

Control:

- Commander: Primary Codex agent in the active task.
- Lead: Primary planning team owns contracts, shared interfaces, prioritization, integration, and final reporting.
- Checkpoint cadence: After baseline, after each worker handoff, after each accepted fix, and after final regression.
- Interrupt policy: Stop the affected stream on permission boundary, ownership conflict, destructive action, repeated failure, or evidence that invalidates the mission contract.

Memory:

- Hot context: Current git status, command board, active findings, test output, and worker handoffs.
- Cold context: Repository source, tests, migrations, architecture documents, and previous audit receipts.
- State path: `output/agent-audit/state.json`.
- Artifact path: `output/agent-audit/runs/<run-id>/` for runtime receipts and `docs/agent-audit/` for durable contracts and reports.

Bus:

- Message schema: `{ task_id, state, artifact, evidence, decision, unknowns, dependency, next_action }`.
- Dependency states: `pending`, `ready`, `in_progress`, `blocked_dependency`, `verify_failed`, `accepted`, `rejected`, `complete`.
- Handoff required fields: Finding ID, severity, affected function, reproduction evidence, file/line references, proposed smallest fix, verification command, and residual risk.

I/O:

- Allowed tools: Read-only repository inspection, isolated sub-agents, local test/build/lint/security commands, scoped `apply_patch` edits, and local receipt generation.
- Denied tools: Production deploys, external messages, paid API calls, shared database writes, credential changes, destructive git commands, and edits outside assigned ownership.
- Receipt format: JSON run summary plus Markdown findings and command output summaries.
- Rollback path: Reject unverified worker artifacts; revert only commander-created edits with a scoped inverse patch; preserve pre-existing user changes.

Verifier:

- Command or fixture: Repository build, type checks, unit tests, API tests, data integrity checks, Playwright flows, lint, secret scan, and diff review as applicable.
- Reviewer: A verifier sub-agent that did not build the accepted fix, followed by commander integration review.
- Pass threshold: Zero failed required checks; no new high-severity security/data findings; every fixed issue has a reproducer or regression test.
- Regression check: Full frontend and backend suites plus end-to-end tests after integrated fixes.

Self-improvement:

- Candidate destination: `scripts/audit-loop.mjs`, `docs/agent-audit/`, and package scripts.
- Required evidence: Two successful local runs or one successful run plus deterministic tests of the runner.
- Human review: Required before automation, CI enforcement, deployment, external mutation, or promotion into a reusable global skill.

## Team Topology

| Role | Territory | Write ownership | Verifier |
|---|---|---|---|
| Primary planning team | Contracts, task graph, shared interfaces, prioritization, integration | `docs/agent-audit/**`, `scripts/audit-loop.mjs`, `package.json`, integration fixes | Independent verifier plus full suite |
| Frontend specialist | Routes, components, state, accessibility, i18n, client API contracts, browser workflows | Read-only during reconnaissance; later explicit disjoint files only | UI/unit/Playwright evidence |
| Backend specialist | Express routes, auth, validation, services, agents, error handling, observability | Read-only during reconnaissance; later explicit disjoint files only | API/unit/security evidence |
| Data specialist | Drizzle schema, SQL migrations, SQLite/Postgres parity, constraints, lifecycle integrity | Read-only during reconnaissance; later explicit disjoint files only | Schema/data integrity evidence |
| Verification specialist | Cross-layer contracts, regressions, security, and task closure | Read-only | Commander accepts or rejects findings |

## Integration Rules

1. Shared contracts and schemas remain commander-owned until published.
2. A finding enters the fix queue only when it has concrete evidence and a deterministic verifier.
3. One owner fixes one atomic task; overlapping write sets are serialized.
4. The commander integrates one verified task at a time in dependency order.
5. A green check without an explainable architecture delta or rollback is insufficient.

