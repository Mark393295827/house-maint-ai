# Frontend Functional Audit and Repair Report

**Repository:** `house-maint-ai`  
**Audited revision:** `cc4d6a94dbe72a28025e116d7faf599ac11fc641`  
**Audit date:** 2026-07-29  
**Environment:** local Vite frontend, local Express API, SQLite development database, Chromium browser automation  
**Release classification:** **NOT READY FOR PRODUCTION**

## Executive summary

The application is materially safer and more coherent than the audited baseline. The audit repaired false payment success, fabricated diagnosis lifecycle states, a broken legacy SQLite checkout schema, non-functional report-scoped chat, absent realtime UI subscriptions, public startup errors, an empty 404 route, silent case-list failures, date and currency errors, and several session/localization gaps.

The repaired local lifecycle was proven through real application APIs:

1. A consumer created a report.
2. A checkout order was created for the server-controlled price.
3. A locally signed deterministic webhook moved the order to paid and the report to matching.
4. A worker accepted the report.
5. Consumer and worker exchanged report-scoped messages in both directions through Socket.IO without reloading.
6. The worker completed the job.
7. The consumer submitted a review and received HTTP 201.
8. The worker dashboard reflected the corrected earnings amount of ¥99.

The release is still blocked by **DEFECT-005**. The calendar UI tries to assign a selected worker directly by updating a report to `matched`, while the server correctly reserves that transition for the payment and worker-acceptance workflow. A consumer can reach this UI through the normal quick-report/matching path, but its booking request is rejected with HTTP 403. This is a product and API contract decision, not a cosmetic defect.

Production readiness is also weakened by low automated coverage, five dependency advisories, application-wide accessibility and localization debt, large production chunks without an enforced budget, missing Firefox/WebKit coverage, and unavailable manager/tenant browser fixtures.

## Scope and method

The audit began with repository discovery rather than generic React assumptions. It mapped the route tree, role guards, API client, server endpoints, storage, Socket.IO events, external integrations, observability, and existing tests. An immutable baseline was captured before repairs.

Execution followed a strict static DAG contract:

`discovery → baseline → smoke → core workflows → three parallel quality branches → repair reduce join → regression → release report`

The graph has 10 nodes and 11 typed edges and passes the graph-engineering strict validator. Durable state, checkpoints, events, and node receipts are stored under `.agent-state/graphs/frontend-functional-audit/`.

Browser work used the Playwright workflow for real interaction, accessibility snapshots, request/console inspection, controlled network failures, multi-session realtime checks, responsive checks, and screenshots. No live payment, AI, messaging, analytics, storage, or production provider was invoked.

## Architecture and inventory

The frontend is React 19 with Vite, React Router, TanStack Query, language/auth/toast contexts, lazy route modules, error boundaries, and Socket.IO. The Express API is mounted under `/api/v1`; development and tests use SQLite while production supports PostgreSQL. Authentication uses short-lived JWTs in httpOnly cookies, rotating refresh tokens, CSRF protection for mutations, and server-side ownership/role checks.

The baseline root application declared 37 route entries; the repair adds a catch-all recovery route. They group as follows:

| Route group | Routes | Guard |
|---|---|---|
| Public/onboarding | `/`, `/welcome`, `/landing`, `/showcase`, `/preview` | Public gate or role redirect |
| Authentication | `/login`, `/repairman/login` | Public |
| Payment result | `/payment/success`, `/payment/cancel` | Public route; trusted success now requires authenticated owner-scoped order verification |
| Consumer maintenance | `/diagnosis`, `/quick-report`, `/cases`, `/assets`, `/worker/match`, `/match` | User, tenant, manager, admin |
| Shared authenticated | `/reports/:id`, `/library`, `/community`, `/omnichannel-sim`, `/calendar`, `/profile`, `/notifications`, `/orders`, `/messages`, `/conversations`, `/chat`, `/chat/:userId`, `/worker/register`, `/workers`, `/repair`, `/repair/:id`, `/review/:id` | Authenticated |
| Worker operations | `/worker/dashboard`, `/worker/job/:id` | Worker, admin |
| Enterprise | `/metrics`, `/enterprise/*`, `/enterpriseUI/*` | Manager, admin |
| Recovery | `*` | New localized 404 |

### Runtime role matrix

| Role | Runtime result | Evidence scope |
|---|---|---|
| Anonymous | **PASS** | Welcome/login/invalid route/payment verification; protected routes redirect; repaired pages have zero console errors |
| User | **PASS WITH BLOCKER** | Report, matching, payment, messages, completion/review lifecycle verified; calendar booking remains blocked by DEFECT-005 |
| Worker | **PASS** | Login, dashboard, availability/jobs, accept, report-scoped chat, completion, corrected earnings |
| Admin | **PASS** | Enterprise dashboard, map, filters, tickets, reports/workers APIs, role redirects |
| Manager | **BLOCKED** | No deterministic development fixture; backend/front-end role contracts inspected and unit/RBAC tests passed |
| Tenant | **BLOCKED** | No deterministic development fixture; backend/front-end role contracts inspected and unit/RBAC tests passed |

Manager and tenant are marked blocked, not passed by inference.

## Immutable baseline

| Gate | Baseline result |
|---|---|
| Install | PASS in 14.5 seconds; 5 advisories |
| Unit tests | PASS, 378 tests |
| Lint | PASS with 198 warnings |
| Production build | PASS; main 766.82 kB raw / 244.43 kB gzip |
| Coverage command | PASS, but only 55.94% statements / 45.00% branches / 60.62% functions / 57.29% lines |
| Browser E2E | PASS, 16 cases; Chromium desktop and mobile only |
| Development full stack | PASS |
| Audit-loop plan | PASS |
| Full audit loop | PASS |

The lint count is inflated because the configured scan includes an embedded `.claude/worktrees/...` copy of the repository. This is still recorded as the actual command result.

## Defect register

| ID | Priority | Finding | Final status |
|---|---:|---|---|
| DEFECT-001 | P2 | Public startup ran protected maintenance audits twice and produced auth errors | **FIXED / VERIFIED** |
| DEFECT-002 | P2 | Unknown routes rendered a blank page | **FIXED / VERIFIED** |
| DEFECT-003 | P1 | Public route asserted payment success without verifying an order | **FIXED / VERIFIED** |
| DEFECT-004 | P2 | Week selector rendered `Jul 29 - Jul 4` across a month boundary | **FIXED / VERIFIED** |
| DEFECT-005 | P1 | Consumer calendar booking violates the server assignment state machine | **OPEN / RELEASE BLOCKER** |
| DEFECT-006 | P1 | Legacy SQLite orders table lacked payment checkout columns | **FIXED / VERIFIED** |
| DEFECT-007 | P1 | Diagnosis UI fabricated worker dispatch, repair verification, and reporting completion | **FIXED / VERIFIED** |
| DEFECT-008 | P2 | Icon fonts pollute accessible names and landmark coverage is inconsistent | **OPEN / PARTIALLY IMPROVED** |
| DEFECT-009 | P2 | Localization catalogs and hardcoded core copy were inconsistent | **PARTIALLY FIXED**: catalog parity restored; broad hardcoded copy remains |
| DEFECT-010 | P2 | Reports API HTTP 500 appeared as a legitimate empty case list | **FIXED / VERIFIED** |
| DEFECT-011 | P1 | Chat sends omitted the backend-required `reportId` | **FIXED / VERIFIED** |
| DEFECT-012 | P1 | Socket connected but application pages had no event subscribers | **FIXED / VERIFIED** |
| DEFECT-013 | P2 | Dependency tree has four high and one moderate advisory | **OPEN / DEFERRED** |
| DEFECT-014 | P2 | Large production chunks have no enforced performance budget | **OPEN / DEFERRED** |

## Repairs

### Authentication and startup

- Added an anonymous session endpoint that returns `{ user: null }` instead of producing expected public-page 401 noise.
- Preserved refresh behavior for browsers that were previously authenticated.
- Restricted the agentic startup stack to authenticated sessions.
- Added timer cleanup and safe rejection handling.
- Reused an in-flight Socket.IO connection so React StrictMode cannot open duplicate sockets.

### Routing and error states

- Added a localized, accessible catch-all 404 page with recovery navigation.
- Changed the case list to render an explicit retryable API error. A forced HTTP 500 no longer produces “No cases yet.”
- Preserved quick-report input during offline failure; the broader transport-message localization debt remains.

### Trusted payments and persistence

- Replaced query-string success claims with an owner-scoped order lookup.
- Added explicit paid, pending, unverifiable, and error states.
- Corrected payment/order displays from stored cents to currency units.
- Added SQLite startup convergence for `wechat_out_trade_no` and its unique index.
- Verified checkout, deterministic signed webhook processing, order/report state convergence, and worker earnings without contacting WeChat Pay.

### Diagnosis and matching

- Removed the reachable timer-based mock worker dispatch and fabricated verification/reporting phases.
- The final diagnosis action now creates a durable report once and navigates to real API-backed matching.
- Duplicate dispatch is guarded; telemetry-storage corruption cannot duplicate the report.
- Failed report creation displays an error and can be retried.

### Calendar

- Corrected date formatting with complete start/end `Date` values, including month and year boundaries.
- Direct consumer assignment was intentionally not patched around the server. The unresolved workflow contract is preserved as DEFECT-005.

### Messaging and realtime

- Made `reportId` mandatory in chat navigation and message sends.
- Updated report, conversation, and worker-job navigation to retain report authorization context.
- Added `new_message` subscriptions, message deduplication, read updates, conversation refresh, and listener cleanup.
- Verified live consumer-to-worker and worker-to-consumer delivery in separate authenticated browser sessions with no reload.

### Localization and accessibility touched paths

- Restored exact catalog parity: 1,152 English and 1,152 Chinese leaf keys.
- Added localized payment-verification, chat, report-detail, case-error, and not-found states.
- Added or corrected main landmarks and hidden decorative icons in repaired components.
- Application-wide icon and hardcoded-copy remediation remains open.

## Core workflow results after repair

| Workflow | Result | Notes |
|---|---|---|
| Public onboarding/auth | **PASS** | Fresh public pages no longer emit auth/startup console errors |
| Quick report | **PASS UNTIL CALENDAR** | Real report creation and matching pass; selected-worker calendar booking remains rejected by the state machine |
| AI diagnosis | **PASS** | Four inquiry calls, problem-solving call, real report HTTP 201, real matching results; no fabricated completion |
| Payment | **PASS LOCALLY** | Checkout, cents, signed webhook, paid order, and report transition verified using deterministic local secrets |
| Worker accept/complete | **PASS** | Worker accepted and completed the paid/matching report through real APIs |
| Messaging | **PASS** | Bidirectional report-scoped Socket.IO delivery without reload |
| Review | **PASS** | Completed job review returned HTTP 201 |
| Worker earnings | **PASS** | Dashboard shows ¥99 rather than ¥9,900 |
| Admin enterprise | **PASS** | Dashboard, map, filters, tickets, report and worker data |
| Manager/tenant | **BLOCKED** | Missing deterministic browser fixtures |

## Quality assessment

### Responsive behavior

Ten representative routes were checked at 320, 375, 390, 414, 768, and 1024 CSS pixels: 60 route/viewport combinations with zero horizontal-overflow failures and non-empty document content.

### Accessibility

The skip link passes keyboard activation: the first Tab focuses it and Enter transfers focus to `#main-content`. Repaired components improved landmarks and decorative-icon handling.

The wider application still has material debt. The source scan found 329 `material-symbols-outlined` lines but only 30 explicit `aria-hidden` uses at baseline, and browser snapshots exposed polluted names such as icon text prefixed to visible control labels. A full manual screen-reader and focus-order audit was outside this run.

### Localization

Runtime English/Chinese switching and `document.lang` updates pass. Catalog keys are now exactly aligned. Hardcoded copy remains in pages and fallbacks including parts of the calendar, worker/review experience, error boundaries, and completion/checkout alerts. The review success screen visibly remained Chinese while the session locale was English.

### API resilience

The API client has same-origin credentials, CSRF refresh, a single-flight access-token refresh, one read retry, and no automatic mutation retry. It still has no general request-timeout or `AbortSignal` policy.

Controlled `/reports` HTTP 500 now produces a retryable error instead of data loss or an empty state. Offline quick-report input survives. Transport errors still need reader-friendly localized mapping.

### Security

Verified controls include:

- httpOnly authentication cookies and rotating hashed refresh tokens;
- CSRF cookie/header validation;
- server ownership and role checks;
- Helmet/CSP and production CORS allowlisting;
- global, user, and strict endpoint rate limits;
- signed payment webhook verification with timestamp window;
- server-controlled checkout price;
- upload anti-sniffing/sandbox headers;
- no browser-stored auth token pattern or `eval` usage found;
- `noopener noreferrer` on external blank-target links.

`npm audit` reports five fixable advisories:

- high: `brace-expansion`, `js-yaml`, `postcss`, `react-router`;
- moderate: `react-router-dom`.

These were not auto-upgraded because router/build-tool changes require a separate compatibility pass.

### Performance

The final production build passes, but important chunks remain large:

| Asset | Raw | Gzip |
|---|---:|---:|
| Main application | 769.71 kB | 245.32 kB |
| Metrics dashboard | 500.55 kB | 136.43 kB |
| Vendor | 389.18 kB | 120.02 kB |

There is no enforced bundle budget. Enterprise/metrics dependencies and the main application shell should be profiled and split in a dedicated performance change.

## Final regression matrix

| Gate | Final result |
|---|---|
| Focused repaired UI tests | **PASS**: 9 files, 26 tests |
| Focused repaired server tests | **PASS**: 3 files, 12 tests |
| Flake-sensitive repeat | **PASS**: 3 runs; payment, chat, diagnosis, socket |
| Full unit suite | **PASS**: 75 files, 389 tests |
| Coverage | Command **PASS**; 55.95% statements, 44.95% branches, 60.73% functions, 57.29% lines |
| Lint | **PASS**: 0 errors, 198 warnings |
| TypeScript/Vite production build | **PASS** |
| Playwright E2E | **PASS**: 16/16 desktop/mobile Chromium |
| Repository full audit loop | **PASS** in iteration 1: artifacts, frontend build, backend build, unit, lint, E2E |
| Strict graph validation | **PASS**: 10 nodes, 11 edges |
| `git diff --check` / JSON parse | **PASS** |
| Dependency audit | **RISK**: 4 high, 1 moderate |

The full audit loop completed at `2026-07-29T10:59:04.818Z`; all six of its gates passed. Its E2E gate provides a second clean browser-suite run after the independent E2E command.

## Evidence index

| Evidence | Locator |
|---|---|
| Graph contract and execution state | `.agent-state/graphs/frontend-functional-audit/` |
| Discovery and route/role inventory | `.agent-state/graphs/frontend-functional-audit/artifacts/discovery.json` |
| Immutable baseline | `output/frontend-functional-audit/baseline.json` |
| Smoke findings | `output/frontend-functional-audit/smoke.json` |
| Core workflow findings | `output/frontend-functional-audit/core-workflows.json` |
| Accessibility/localization/responsive branch | `output/frontend-functional-audit/quality-accessibility-localization-responsive.json` |
| API/resilience/realtime branch | `output/frontend-functional-audit/quality-api-resilience-realtime.json` |
| Security/performance branch | `output/frontend-functional-audit/quality-security-performance.json` |
| Repair receipt | `output/frontend-functional-audit/repair.json` |
| Regression receipt | `output/frontend-functional-audit/regression.json` |
| Full audit-loop terminal receipt | `output/agent-audit/runs/2026-07-29T10-54-22-324Z/iteration-1/summary.json` |
| Repaired not-found screenshot | `output/playwright/regression-not-found.png` |
| Submitted-review screenshot | `output/playwright/regression-review-submitted.png` |
| Corrected-worker-earnings screenshot | `output/playwright/regression-worker-earnings.png` |

## Remaining risks and recommendations

1. **Resolve DEFECT-005 before production.** Define one authoritative booking contract. Recommended shape: consumer requests a preferred worker/time, server creates a reservation or intent, payment succeeds, and the worker accepts before assignment becomes authoritative. Do not restore direct client-side status mutation.
2. **Upgrade vulnerable dependencies in a separate compatibility branch.** Prioritize PostCSS and React Router, run the full route/redirect/security suite, then resolve transitive YAML/glob packages.
3. **Raise coverage around authorization and money movement.** Add integration tests for messages, payments, reports, uploads, and feedback. Enforce a ratcheting threshold so coverage cannot regress.
4. **Create deterministic manager and tenant fixtures.** Add browser tests for their home redirects, allowed routes, denied routes, enterprise scope, and ownership boundaries.
5. **Run Firefox and WebKit projects.** Current browser confidence is Chromium-only.
6. **Execute an application-wide accessibility pass.** Hide decorative icons, add explicit names where icon-only controls are interactive, normalize landmarks, verify focus order, and test with a screen reader.
7. **Finish localization.** Replace hardcoded worker, review, calendar, modal, and error-boundary copy; add a CI key-parity check.
8. **Enforce performance budgets.** Profile the main, metrics, and vendor chunks; isolate heavy enterprise/map/chart modules and fail CI on meaningful regression.
9. **Add request cancellation/timeouts.** Use `AbortSignal` with reader-friendly localized timeout/offline errors for long or abandoned queries.

## Release decision

**Production: NO-GO.** DEFECT-005 is a reachable P1 workflow break, and the dependency/coverage/browser-role gaps reduce confidence around deployment.

**Local development or controlled internal demonstration: GO WITH DISCLOSED LIMITATIONS.** The repaired alternate lifecycle is deterministic and fully exercised locally, but this does not substitute for the unresolved calendar contract or live-provider certification.
