# MECE Audit Task Board

## Mission

- Run ID: `bootstrap-2026-07-20`
- Status: `complete`
- Commander: Primary planning agent
- Review budget: 30 files / 1000 changed lines
- Permission boundary: Local repository and local test data only

## Atomic Tasks

| ID | Action | Input | Output | Owner | Dependencies | Definition of done | Verifier | Status |
|---|---|---|---|---|---|---|---|---|
| T0 | Baseline repository | Git state and package topology | `output/agent-audit/runs/2026-07-20T00-04-52-412Z/iteration-1/summary.json` | Commander | None | Commands and dirty files recorded | Commander | Complete |
| T1 | Audit frontend | `src/**`, UI tests, E2E specs | Ranked frontend findings | Frontend specialist | T0 | Every finding has evidence and a verifier | Verification specialist | Complete |
| T2 | Audit backend | `server/**`, API tests | Ranked backend findings | Backend specialist | T0 | Every finding has evidence and a verifier | Verification specialist | Complete |
| T3 | Audit data | Schema, migrations, stores, fixtures | Ranked data findings | Data specialist | T0 | Parity and integrity risks are evidenced | Verification specialist | Complete |
| T4 | Reconcile contracts | T1-T3 handoffs | Cross-layer function map and deduplicated queue | Commander | T1, T2, T3 | Findings are MECE and dependency-ordered | Verification specialist | Complete |
| T5 | Repair findings | Accepted P0/P1 tasks | Scoped patches and regression tests | Assigned task owners | T4 | Reproducer fails before and passes after fix | Verification specialist | Complete |
| T6 | Build audit runner | Contracts and repository scripts | Bounded local loop runner and receipts | Commander | T0 | Dry-run and focused tests pass | Verification specialist | Complete |
| T7 | Verify integration | Integrated patches and runner | Verification report | Verification specialist | T5, T6 | Required gates pass with fresh evidence | Commander | Complete |
| T8 | Close run | T7 evidence | Final task board, residual risks, next trigger | Commander | T7 | State is replayable and workers are closed | Commander | Complete |

## Typed Handoff

```json
{
  "task_id": "T1",
  "state": "accepted",
  "artifact": "path or concise finding set",
  "evidence": ["command, test, or file:line"],
  "decision": "accept, reject, repair, or escalate",
  "unknowns": [],
  "dependency": [],
  "next_action": "single bounded action"
}
```

## Severity Policy

| Severity | Meaning | Loop action |
|---|---|---|
| P0 | Security, data loss, broken auth/payment, or unusable primary flow | Stop other fixes; reproduce and repair first |
| P1 | Incorrect user-visible behavior, API contract break, or integrity drift | Repair in current run when bounded |
| P2 | Reliability, accessibility, observability, or maintainability defect | Queue after P0/P1 or fix if very small |
| P3 | Cosmetic, documentation, or low-confidence improvement | Record; do not expand current scope |

## Closure Receipt

- Full profile: `output/agent-audit/runs/2026-07-20T01-07-59-851Z/iteration-1/summary.json`.
- Post-fix quick profile: `output/agent-audit/runs/2026-07-20T01-32-08-049Z/iteration-1/summary.json`.
- Independent review: unavailable after three bounded orchestration attempts; no reviewer pass is claimed.
- Residual queue and next trigger: `docs/agent-audit/audit-report-2026-07-20.md`.
