Objective: Close the remaining case-event replay payload-shape integrity gap without exceeding the original Wave 2 node attempt cap.
Mode: Goal
Trigger: Explicit remediation after independent t12-event-checker rejection on 2026-08-01.
Scope: Runtime object validation for replay payload_json plus malformed-shape fixtures, checker, and local regression only.
Non-goals: API routes, middleware mounting, schema/migration changes, PostgreSQL deployment, external providers, credentials, and UI.
Owner: /root commander; maker-checker repair topology.
Inputs: .agent-state/practical-backend-20260801/artifacts/t12-event-checker.md; current case-events source and tests.
Artifacts path: .agent-state/practical-backend-integrity-20260801/artifacts/
State path: .agent-state/practical-backend-integrity-20260801/state.json and events.jsonl
Work clock: .agent-state/practical-backend-integrity-20260801/work-clock.md; 45 minutes wall clock.
Success metric: replayEvents rejects null, arrays, primitives, and malformed payload objects while valid object payloads and hashes continue to replay deterministically.
Evidence: focused case-event tests, independent malformed-shape probes, server typecheck/lint, diff and credential scans.
Verifier: independent checker worker; repair worker opinion is insufficient.
Topology: maker-checker
Max iterations: 1 iteration
Time limit: 45 minutes
Budget: 38 tool calls
Review budget: 250 changed lines and 3 files per integration unit
Stop condition: Stop on checker success, any cap, ownership overlap, regression, or repeated failure signature.
Write-back: Append transitions to .agent-state/practical-backend-integrity-20260801/events.jsonl and refresh state.json atomically.
Permission boundary: Local branch only; no production, external provider, credentials, deploy, push, publication, schema, migration, or irreversible shared-state effect; approval and rollback are required before any boundary expansion.
Recovery: Reject the single repair node, restore the pre-remediation checkpoint, and require an integration gate before the continuation graph may read the accepted receipt.
