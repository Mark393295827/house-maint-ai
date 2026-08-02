# Practical backend execution loop contract

Objective: Make one maintenance case safe and executable through a concise case API, authorization boundary, and replayable case-event service.
Mode: Goal
Trigger: Explicit continuation after the backend practicality blueprint on 2026-08-01.
Scope: Wave 0 reconciliation, Wave 1 authorization repair and independent red-team check, Wave 2 case-events and compatibility create-path checks; use the committed foundation as input.
Non-goals: Public media, global realtime, payments, leasing, PMS, broad UI redesign, production deployment, provider credentials, and migration of every legacy route.
Owner: /root commander and integration owner.
Inputs: docs/backend-practical-iteration-blueprint.md; committed schema and transaction foundation; prior security review artifact; repository and test harness.
Artifacts path: .agent-state/practical-backend-20260801/artifacts/
State path: .agent-state/practical-backend-20260801/state.json and events.jsonl
Work clock: .agent-state/practical-backend-20260801/work-clock.md; 120 minutes wall clock from run start.
Success metric: One idempotent case creation plus diagnose-ready command path replays deterministically with zero authorization bypasses, while existing report behavior remains preserved.
Evidence: Fresh post-commit Node/UI/build/lint receipts; authorization red-team denial fixtures; case-event reducer/replay and transaction receipts; compatibility preservation tests; graph and loop validator receipts.
Verifier: Independent authorization red team, independent event/migration checker, and /root integration regression; builder opinion is insufficient.
Topology: manager-workers
Max iterations: 3 iterations
Time limit: 120 minutes
Budget: 140 tool calls
Review budget: 750 changed lines and 10 files per integration unit
Stop condition: Stop on terminal verifier success, any budget cap, ownership overlap, missing dependency, regression, or the same failure signature twice.
Write-back: Append state transitions to .agent-state/practical-backend-20260801/events.jsonl and atomically refresh state.json plus checkpoint files.
Permission boundary: Local branch only; no production, external provider, credentials, deploy, push, publication, destructive migration, or irreversible shared-state effect; approval and rollback are required before any boundary expansion.
Recovery: Reject the smallest failed node, preserve accepted branches and compatibility routes, restore the last verified checkpoint, and require an explicit integration gate before promoting any worker artifact.
