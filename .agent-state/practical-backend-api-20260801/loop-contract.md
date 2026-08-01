Objective: Expose one concise, fail-closed case-create surface and preserve the legacy report-create facade using the accepted authorization and replayable case-event boundaries.
Mode: Goal
Trigger: Explicit continuation after accepted practical-backend-integrity-20260801 remediation.
Scope: Case API candidate routes, compatibility report-create adapter, feature-gated server mount, focused API checks, and terminal regression.
Non-goals: Diagnosis command orchestration, public media, global realtime, payments, leasing, PMS, UI, production, external providers, and credentials.
Owner: /root commander and integration owner.
Inputs: accepted t11 authorization receipt; accepted r2 payload-shape receipt; case-events service and committed foundation schema.
Artifacts path: .agent-state/practical-backend-api-20260801/artifacts/
State path: .agent-state/practical-backend-api-20260801/state.json and events.jsonl
Work clock: .agent-state/practical-backend-api-20260801/work-clock.md; 60 minutes wall clock.
Success metric: Feature-gated case create emits one case_opened event with idempotent replay, and the legacy report-create adapter preserves its response shape without exposing provider routes or bypassing authorization.
Evidence: route contract tests, auth seam denial tests, event-service tests, feature-flag mount review, full Node/UI/build/lint regression.
Verifier: independent API checker plus /root serial integration and terminal regression; builder opinion is insufficient.
Topology: manager-workers
Max iterations: 2 iterations
Time limit: 60 minutes
Budget: 80 tool calls
Review budget: 500 changed lines and 6 files per integration unit
Stop condition: Stop on checker success and terminal regression, any cap, ownership overlap, regression, permission boundary, or repeated failure signature.
Write-back: Append transitions to .agent-state/practical-backend-api-20260801/events.jsonl and refresh state.json plus checkpoints.
Permission boundary: Local branch only; no production, external provider, credentials, deploy, push, publication, destructive migration, or irreversible shared-state effect; approval and rollback are required before any boundary expansion.
Recovery: Reject the smallest API node, preserve accepted auth/event source, restore the last verified mount checkpoint, and require a commander-owned integration gate before the feature flag is enabled.
