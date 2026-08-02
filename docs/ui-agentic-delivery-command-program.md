# House Maint AI Delivery Command Program

**Status:** proposed execution program  
**Baseline:** 2026-07-29  
**Companion UI DAG:** [`ui-clean-redesign-implementation.graph-contract`](./ui-clean-redesign-implementation.graph-contract)  
**Companion runtime architecture:** [`maintenance-policy-agent-architecture.md`](./maintenance-policy-agent-architecture.md)  
**Companion runtime implementation DAG:** [`maintenance-policy-runtime-implementation.graph-contract`](./maintenance-policy-runtime-implementation.graph-contract)  
**Companion joint-adoption DAG:** [`maintenance-case-progress-adoption.graph-contract`](./maintenance-case-progress-adoption.graph-contract)  
**Voice-first Sol extension:** [`voice-first-sol-multi-agent-blueprint.md`](./voice-first-sol-multi-agent-blueprint.md)

## 1. Command decision

The project has two different kinds of agents. They must not be confused.

| Plane | Purpose | Lifetime | Authority |
|---|---|---|---|
| Delivery agents | Build and verify the cleaner product without losing existing behavior. | Temporary, bounded to a release train. | Scoped repository writes only. |
| Product policy agents | Help residents, workers, and operators resolve maintenance cases. | Durable server-side runtime. | Propose evidence-backed outcomes; never independently own consequential state or external effects. |

The command objective is therefore:

> Make the next safe action obvious for each user, while turning a photo or message into a traceable maintenance decision with the least possible user effort.

Smoothness does not come from showing more AI activity. It comes from immediate acknowledgement, stable case progress, parallel work only where inputs are independent, one authoritative decision point, and clear fallbacks when AI is uncertain or unavailable.

## 2. First-principles operating rules

| User need | Design rule | Evidence of success |
|---|---|---|
| “Tell me what to do after I report an issue.” | The case is the primary product object; every surface shows its current stage, owner, next action, and fallback. | Photo/message to a clear next action completes without page hunting. |
| “Do not make me wait without knowing what is happening.” | A request is acknowledged before AI work starts; durable status and retryability are visible. | No silent spinner; each delayed stage has a status and safe escape route. |
| “Give me a useful answer, not raw model output.” | Agents return typed artifacts; the UI renders a bilingual, customer-safe plan rather than JSON or hidden reasoning. | Plan schema, locale checks, evidence and uncertainty checks pass. |
| “Keep dangerous decisions safe.” | Models make proposals; a deterministic policy service owns case transitions and applies human gates. | No agent can directly dispatch, pay, message externally, or close a case. |
| “Do not lose working features during cleanup.” | Route, API, query, socket, locale, payment, and recovery behavior are contracts. | Compatibility and critical-journey tests remain green at every release gate. |

## 3. Program contract (commander model)

### Program

- **Objective:** deliver a coherent four-shell UI and a safe policy-agent runtime that reduce time-to-resolution while preserving existing maintenance workflows.
- **Non-goals:** big-bang rewrite; autonomous payment, dispatch, or liability decisions; production deployment; live-provider experimentation; migration of shared data without separately approved data design; changes outside an admitted territory.
- **Finite actions:** baseline, contract, isolate, implement, evaluate, integrate, release-gate, observe, rollback.
- **Completion:** the UI and runtime each receive their own fresh, scoped human approval receipt. A UI receipt proves UI parity; a runtime receipt proves advisory-only policy safety. A later joint adoption change is admitted only after both receipts exist and has its own integration/rollback gate.

### Control

- **Commanders:** the UI integration owner and runtime integration owner own their respective graph contracts; a product owner resolves cross-plane product decisions only.
- **Concurrency:** the UI graph permits four concurrent graph nodes; the runtime graph permits three. Do not run them as one unbudgeted pool or open an untracked worker. Allocate worktree/agent slots explicitly; the default is to finish each graph release train before admitting an overlapping train.
- **Checkpoints:** baseline; contract freeze; foundation or runtime architecture freeze; each surface/runtime node acceptance; independent verification; scoped human release review; optional later joint-adoption gate.
- **Stop immediately:** credential exposure, external live call, writer-territory conflict, incompatible API/route/state contract, critical journey regression, policy bypass, or exhausted task budget.
- **Retry rule:** at most two attempts for one atomic task. A repeated failure signature becomes an explicit blocker; the whole program is never replayed merely because one task failed.

### Memory and recovery

| Class | Location | Rule |
|---|---|---|
| UI command state | `.agent-state/graphs/ui-clean-redesign-v1/{state.json,checkpoint.json,events.jsonl}` | The UI commander is the sole state/checkpoint/event writer; it records task state, input hashes, attempt, and decision. |
| Runtime command state | `.agent-state/graphs/maintenance-policy-runtime-v1/{state.json,checkpoint.json,events.jsonl}` | The runtime commander is the sole state/checkpoint/event writer; it never shares UI state files. |
| Graph artifacts | The flat, canonical paths declared by each graph (for example `artifacts/functional-contract.json` or `artifacts/runtime-architecture.json`) | These are the only payload paths graph joins consume; they are typed and hash-addressed. |
| Handoff/checkpoint receipts | Commander-owned `.agent-state/graphs/<graph-id>/receipts/<node-id>/<subtask-id>/<attempt>/` plus `output/policy-orchestrator/<run-id>/` | Receipts prove the worktree/checkpoint/evidence trail but are not graph payloads. They never contain credentials, raw photos, prompts, or hidden reasoning. |
| Durable contracts | `docs/` | Human-readable decisions and interface schemas are versioned with the source. |
| Dirty-worktree recovery | Commander-owned `worktree-registry.json` and per-node receipt | Record base SHA, dirty-worktree diff hash, worktree path, branch/commit or dirty receipt hash before a node starts. Never reset, checkout, or overwrite pre-existing user changes; restore only the failed task's declared territory. |

## 4. Typed handoff bus

Agents exchange verified artifacts, not prose-only “done” messages. Each handoff must validate against this envelope before the next task starts:

```json
{
  "schema": "house-maint.command/v1",
  "graph_id": "ui-clean-redesign-v1",
  "graph_node_id": "resident-surface",
  "subtask_id": "team-join",
  "attempt": 1,
  "state": "VERIFYING",
  "verification": "verified",
  "base_sha": "source revision or dirty-worktree receipt",
  "input_hashes": [{ "path": "src/features/resident", "sha256": "..." }],
  "artifact": {
    "type": "resident_surface_bundle",
    "path": ".agent-state/graphs/ui-clean-redesign-v1/artifacts/resident-copy-manifest.json",
    "sha256": "...",
    "integration_commit": "required commit SHA or required dirty-worktree receipt hash"
  },
  "territory": ["src/features/resident/**", "src/styles/surfaces/resident.css"],
  "evidence": [{ "command": "npm run test:unit:ui -- Diagnosis", "result": "pass" }],
  "decision": "accept | reject | repair | escalate",
  "unknowns": [],
  "dependency": ["ui-primitives"],
  "checkpoint_receipt": ".agent-state/graphs/ui-clean-redesign-v1/receipts/resident-surface/team-join/1/checkpoint.json",
  "next_action": "single bounded action"
}
```

`state` follows the graph lifecycle: `PENDING`, `READY`, `RUNNING`, `VERIFYING`, `SUCCEEDED`, `RETRY`, `FAILED`, `COMPENSATING`, `COMPENSATED`, or `WAITING`. Command-only stop/escalation values are `NEEDS_INPUT`, `BLOCKED_PERMISSION`, `BUDGET_STOP`, and `NO_PROGRESS`. `verification` is `verified` or `failed`; it is not inferred from prose. A mutable handoff must include either an integration commit SHA or a hash-addressed dirty-worktree receipt. A handoff is rejected when its graph-node mapping, source hashes, territory, schema, evidence, checkpoint, or known limitations are missing.

Never place credentials, personal media, raw provider payloads, full prompts, chain-of-thought, or unredacted traces on this bus.

## 5. Delivery team topology

The companion graph is the authoritative static delivery DAG. The work below makes its owners operational and keeps write territories disjoint.

| ID | Agent / role | Exclusive write territory | Depends on | Atomic deliverable | Independent verifier |
|---|---|---|---|---|---|
| D00 | Integration commander | UI graph state/receipts and final UI decisions only | — | baseline scope artifact and release state | Quality owner |
| D01 | Workflow-contract analyst | contract artifacts only | D00 | route, API, storage, query, socket, payment and recovery ledger | Integration commander |
| D02 | Design-system auditor | visual-contract artifact only | D00 | token, density, motion, component and shell audit | Integration commander |
| D03 | Quality-baseline analyst | quality-contract artifact only | D00 | screenshots, test/coverage, a11y, bundle and journey baseline | Integration commander |
| D05 | Foundation owner | `src/styles/tokens.css`, `src/styles/foundations.css`, token tests | D01–D03 | semantic token bundle | Design-system verifier |
| D06 | Primitive owner | `src/components/ui/**` | D05 | accessible controls, feedback, overlays, navigation and media primitives | UI verifier |
| D07a | Resident-intake specialist | `src/features/resident/intake/**` | D06 | camera/upload → safe answer/inquiry/report slice against the frozen compatible API contract | Resident lead + UI verifier |
| D07b | Resident-casework specialist | `src/features/resident/cases/**`, `src/features/resident/messages/**` | D06 | case, match, booking, payment, message and review slices | Resident lead + UI verifier |
| D07c | Resident shell/support lead | `src/features/resident/{shell,profile,support}/**`, resident index and style | D06 | resident navigation, secondary routes and team integration | Integration commander |
| D08 | Public-surface owner | `src/features/public/**`, `src/styles/surfaces/public.css` | D06 | public/auth/callback/preview/showcase surface | UI verifier |
| D09 | Worker-surface owner | `src/features/worker/**`, `src/styles/surfaces/worker.css` | D06 | worker lifecycle and bilingual plan UI | UI verifier |
| D10 | Enterprise-surface owner | `src/features/enterprise/**`, `src/styles/surfaces/enterprise.css` | D06 | management console and data-provenance UI | UI verifier |
| D12 | Integration owner | `src/App.tsx`, `src/app/**`, `src/components/OnboardingGate.tsx`, `src/i18n/{en,zh}.json`, `tests/ui-redesign/**`, `tests/e2e/ui-redesign/**` | resident surface bundle + D08–D10 | route/locale integration and compatibility suite against the frozen existing API contract | Independent quality owner |
| D13 | CSS-consolidation owner | listed legacy CSS/Tailwind compatibility files only | D12 | no undeclared global leakage; retired conflicts | UI verifier |
| D14 | Independent quality team | `.agent-state/graphs/ui-clean-redesign-v1/artifacts/verification.json` and `output/playwright/ui-redesign/**` only | D13 | cross-surface acceptance receipt | Commander + product owner |

### Resident subteam protocol

`D07a`, `D07b`, and `D07c` are the fixed internal subtasks of the single `resident-surface` graph node; they may work in parallel only in the resident release wave and never edit one another’s territory. Each publishes a commit SHA or dirty-worktree receipt. `D07c` verifies their public interfaces and publishes the resident manifest; it does not rewrite intake/casework files or own cross-surface integration. The commander performs recorded, one-at-a-time integration of accepted commits. Route registration, locale mutation, and cross-surface tests stay with D12.

### Cross-plane interface protocol

The UI graph does **not** certify runtime safety and the runtime graph does **not** silently modify UI surfaces. The only planned handoff is the versioned `case-progress/v1` contract. It is consumed only by the static [joint-adoption graph](./maintenance-case-progress-adoption.graph-contract) after the runtime graph publishes `runtime_progress_contract`, mounted-progress, and runtime verification/approval receipts, and the UI graph has its own current approval receipt. That graph exclusively owns client consumption, resident camera-to-answer, worker bilingual plan, locale, and adoption verification territories.

The later [voice-first Sol extension](./voice-first-sol-multi-agent-implementation.graph-contract) may assume those resident, worker, and locale territories only after the joint-adoption graph is terminal and a fresh `voice-territory-handoff` receipt binds all predecessor approvals, source hashes, and retired writer leases. Until that receipt exists, the joint-adoption owners remain exclusive; the two graphs must never execute overlapping writers.

## 6. Release trains and admission order

### UI delivery graph — `ui-clean-redesign-v1`

| Train | Admitted agents | Parallelism rule | Exit evidence |
|---|---|---|---|
| A — UI truth | D00–D03 → architecture freeze | D01–D03 may run in parallel after D00; the freeze is a verified barrier. | Functional, visual, and quality contracts have compatible hashes and a frozen architecture artifact. |
| B — shared foundation | D05–D06 | Strictly serial. | Tokens and primitives pass unit, a11y, and contract checks. |
| C1 — isolated surfaces | D08, D09, D10 | One three-builder wave; no resident builders in this wave. | Public, worker, and enterprise bundles have local evidence. |
| C2 — resident surface | D07a, D07b, D07c | Fixed resident subteam only; its receipts are joined before the next UI node. | One resident bundle with disjoint writer evidence and local tests. |
| D — UI integration | D12–D13 | Strictly serial. | Routes, locales, compatibility adapters, and CSS are integrated against the frozen existing API contract. |
| E — UI proof | D14 then UI human release gate | D14 is read-only except its declared receipt paths. | Required UI tests, visual/a11y/performance evidence, and UI rollback drill are accepted. |

### Runtime implementation graph — `maintenance-policy-runtime-v1`

| Train | Static graph nodes | Parallelism rule | Exit evidence |
|---|---|---|---|
| R-A — runtime truth | `runtime-baseline-contract` → the three contracts → `runtime-architecture-freeze` | The three contracts run in parallel; the freeze is a verified barrier. | Legacy mapping, authority, governance/evaluation contracts have compatible hashes. |
| R-B — durable ownership boundary | `policy-persistence-schema` → `case-identity-adapter` → `legacy-mutator-cutover` → `orchestrator-control-plane` and `agent-artifact-adapters` | Persistence, identity, and cutover are serial; adapters become disjoint only after direct legacy writers are guarded. | Forward-only schema parity, one report/case owner, cutover guards, sole state writer, immutable artifact adapters. |
| R-C — reachable resilience and evaluation | `recovery-outbox-control` → `runtime-worker-bootstrap`; `policy-evaluator-pack`; `case-progress-contract` → `case-progress-api-mount` | Bounded joins only; no provider/external effects are enabled. | Queue/lease/outbox, actual worker startup, evaluator fixtures, and reachable safe progress route/socket pass locally. |
| R-D — runtime proof | `runtime-verification` → `runtime-release-review` | Independent verifier then scoped human gate. | Advisory-only runtime verification and rollback receipt are accepted. |

Each graph has its own finite wall budget, checkpoint state, attempt cap, and release gate (UI: six hours; runtime implementation: nine hours; joint adoption: four and a half hours). The product runtime itself is an event-driven policy episode with leases and recovery; the second static DAG governs only its bounded implementation work. Joint UI/runtime adoption is deliberately isolated in the third graph and requires both prior approval receipts as verified inputs.

### Joint client adoption graph — `maintenance-case-progress-adoption-v1`

| Train | Static graph nodes | Parallelism rule | Exit evidence |
|---|---|---|---|
| J-A — prior-receipt freeze | `adoption-baseline` → `cross-plane-contract` → `case-progress-client` | Serial; it rejects stale UI/runtime approvals or unsafe fields before client writes. | One safe client mapping and compatibility/fallback contract. |
| J-B — user experiences | `resident-camera-experience` and `worker-plan-experience` | One two-builder wave with disjoint client writers. | Direct camera-to-answer and concise bilingual worker-plan bundles preserve manual paths. |
| J-C — joint proof | `adoption-integration` → `adoption-verification` → `adoption-release-review` | Verified barrier then joint human gate. | Locale, accessibility, mobile, route/socket, fake-provider, rollback, and no-raw-provider-payload evidence pass. |

The joint graph is a third, explicitly bounded release and may not start until both predecessor approval receipts are current. It is the only plan segment permitted to make the new progress contract visible in the camera and worker UI.

## 7. Runtime work breakdown

The runtime graph is the authoritative task board. Its nodes are summarized here so every role has a bounded output rather than an undeclared dynamic subgraph.

| Graph node | Owner | Atomic output | Depends on | Definition of done |
|---|---|---|---|---|
| `legacy-lifecycle-contract` | Legacy lifecycle owner | identity/cutover/reconciliation contract | runtime scope | No legacy/policy dual writer can advance one migrated case. |
| `policy-authority-contract` | Policy authority owner | action/risk/approval/financial/egress boundary | runtime scope | One state owner and explicit T0–T4 authority rules. |
| `governance-evaluation-contract` | Runtime governance owner | privacy, fixtures, evaluator, telemetry, kill-switch contract | runtime scope | Redacted, tenant-safe evidence and measurable policy outcomes. |
| `policy-persistence-schema` | Policy data migration owner | forward-only durable storage and migration receipt | architecture freeze | SQLite/Postgres parity, migration convergence, unique/idempotency keys, and rollback plan pass. |
| `case-identity-adapter` | Legacy adapter owner | report/case mapping and compatible status adapter | persistence contract | Mapping, status compatibility, and reconciliation tests pass. |
| `legacy-mutator-cutover` | Legacy cutover owner | guards around report/AI/payment/matching/claw/learning mutators | identity adapter | Legacy code cannot mutate or promote learning from a policy-migrated case. |
| `orchestrator-control-plane` | Policy orchestrator owner | CAS state/run/decision/approval/outbox control plane | cutover guard bundle | Only it owns state/leases/effects creation. |
| `agent-artifact-adapters` | Agent adapter owner | diagnosis/plan/enrichment immutable artifact boundary | cutover guard bundle | Existing agents cannot directly advance reports/cases. |
| `recovery-outbox-control` | Runtime recovery owner | lease/retry/dead-letter/outbox/reconciliation | orchestration core | Fake-provider recovery and at-least-once/idempotency tests pass. |
| `runtime-worker-bootstrap` | Runtime bootstrap owner | standard worker startup, readiness, drain and health contract | recovery/outbox | Worker actually runs in standard local/container paths without live effects. |
| `policy-evaluator-pack` | Policy evaluator owner | policy evaluators and synthetic replay fixtures | adapter bundle | Safety/privacy/authority/lifecycle/grounding checks are deterministic. |
| `case-progress-contract` | Runtime progress owner | authorized `case-progress/v1` API/socket contract | orchestration + evaluator join | No provider internals or bearer artifact references reach the UI. |
| `case-progress-api-mount` | Runtime API mount owner | actual server route/socket registration | progress contract | Progress API is reachable and compatible without client changes. |
| `runtime-verification` | Independent runtime quality owner | replay/rollback receipt | bootstrap + evaluator + mounted-progress join | Advisory-only runtime passes fresh independent proof. |

## 8. Ownership, verification, and change control

1. One agent owns one write territory. Read access is broad; write access is narrow.
2. Shared contracts are commander-owned until published. No surface agent changes routes, locales, report status, payment state, or provider selection.
3. Only the applicable commander writes `state.json`, `checkpoint.json`, `events.jsonl`, worktree registry entries, and integration commits. Workers submit typed handoffs; they do not append to shared recovery files.
4. Every mutable task has a per-`{graph_node_id, subtask_id, attempt}` checkpoint, base/diff hash, worktree record, integration commit or dirty receipt, and scoped inverse/revert procedure. The commander integrates accepted work one at a time and records the exact hashes it consumed.
5. An agent that implemented an artifact cannot be its final verifier.
6. If coordination time exceeds 25% of a train, two territory conflicts occur, or an integration review exceeds 1,000 changed lines, pause new parallel work and serialize the conflicting work.
7. A model/provider is an implementation detail behind a server-side adapter, never a durable UI or workflow contract.
8. All provider credentials remain server-side secrets. Any credentials previously shared in a chat or committed to a working tree must be revoked and replaced before runtime work begins.
9. A scoped UI or runtime approval never proves the other plane safe. Cross-plane adoption needs a separate contract, explicit writer territories, and a new independent verification gate.

## 9. Acceptance scorecard

The full two-plane program completes only when the following statements have fresh, reproducible evidence. The UI and runtime human receipts remain separately scoped; neither substitutes for the other.

- A resident can capture or upload an image, receive a clear bilingual-safe answer or an honest fallback, create a report, and follow its next action.
- A worker sees a concise Chinese and English maintenance plan, required tools, safety constraints, evidence requirements, and next job action — never raw JSON.
- A manager can distinguish measured data, AI proposals, pending review, unavailable data, and completed work.
- All preserved routes, guards, deep links, state transitions, callbacks, locale keys, sockets, and recovery actions retain their contract.
- Agent proposals cannot bypass privacy, authority, cost, emergency, or human-approval policy.
- The system resumes safely after a worker/process/provider failure, and disabling AI preserves manual case creation, messaging, and dispatch.
- The UI is keyboard-accessible, reduced-motion aware, responsive at defined widths, and within bundle budgets.

## 10. Immediate next command

Start the two independent Train-A contract sets only: publish the UI `functional`, `visual`, and `quality` contracts in `ui-clean-redesign-v1`, and publish the runtime `legacy lifecycle`, `policy authority`, and `governance/evaluation` contracts in `maintenance-policy-runtime-v1`. Freeze each graph separately, resolve contradictions within its own gate, and do not begin foundation/runtime implementation or the third joint-adoption graph until its predecessor approvals are current.
