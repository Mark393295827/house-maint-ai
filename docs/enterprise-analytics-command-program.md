# Enterprise Analytics Command Program

Run ID: `enterprise-analytics-20260726-01`  
Commander and integration owner: Codex main task  
Mission: Implement the approved `/enterprise/analytics` blueprint, excluding
the map, with company-wide read models, complete operational modules, explicit
measurement states, bilingual copy, and fresh verification evidence.

## Non-Goals

- No map, map library, or geospatial request on the analytics route.
- No production deployment or external publication.
- No automatic external AI call during load, tests, or refresh.
- No fabricated strategic, agent, load, or efficiency metrics.
- No unrelated refactor of the enterprise shell or other routes.

## Topology Decision

The validated graph contains independently ownable backend, UI, localization,
integration, verification, and terminal-review work. The two backend graph
nodes are assigned to one backend worker because they share the route join and
query semantics; splitting that join would add more IPC and merge risk than
elapsed-time benefit. UI modules and localization remain independent workers.
Integration and final decisions remain serial under the commander.

Orchestration tax is bounded to three isolated writer territories, one typed
contract, one integration review per territory, and one independent terminal
review.

## Shared Inputs

- `docs/enterprise-analytics-blueprint.md`
- `docs/enterprise-analytics-api-contract.md`
- `docs/enterprise-analytics-implementation.graph-contract`
- The two user-provided reference screenshots

The API contract is commander-owned and read-only for workers.

## Workstreams and Ownership

| Task ID | Owner | Exclusive writes | Verifier | Stop |
| --- | --- | --- | --- | --- |
| `backend-overview` | Backend analytics worker | `server/services/companyAnalytics.ts`, `server/services/agentTelemetry.ts`, `server/routes/analytics.ts`, `server/tests/company-analytics.test.ts`, `server/tests/agent-telemetry.test.ts` | Focused server tests plus TypeScript | Same failure signature twice |
| `ui-modules` | Frontend analytics worker | `src/components/enterprise/analytics/**`, `src/enterprise-analytics-modules.css` | Component tests and frontend TypeScript | Same failure signature twice |
| `analytics-copy` | Localization worker | `src/i18n/en.json`, `src/i18n/zh.json` | JSON parse and identical key tree | Same failure signature twice |
| `integration` | Commander | `src/pages/MetricsDashboard.tsx`, `src/pages/MetricsDashboard.test.tsx`, `src/services/api.ts`, `src/enterprise-analytics.css`, command receipts | Joined frontend/server tests, build, lint | Reject incompatible worker artifact |
| `terminal-review` | Independent reviewer | Read-only findings; commander writes receipt | Blueprint acceptance matrix | Any unverified measured claim |

Workers may read any repository file needed to understand local patterns, but
must not write outside their exclusive territory. Existing dirty changes are
preserved and reviewed as part of integration.

## Finite Actions

1. Publish the API contract and this command program.
2. Dispatch the three independent workers with exclusive write sets.
3. Continue commander-owned API and page-integration preparation.
4. Review and integrate one worker artifact at a time: backend, UI, copy.
5. Run focused tests after each integration.
6. Complete the explicit market-intelligence interaction and partial-data UI.
7. Run an independent read-only terminal review.
8. Fix accepted findings within commander-owned or returned worker territory.
9. Run full server/UI tests, build, lint, and Playwright at 1440px and 390px.
10. Close all workers and record integration, verification, and cleanup receipts.

## Typed IPC

Every worker final message must contain:

```json
{
  "task_id": "backend-overview | ui-modules | analytics-copy",
  "state": "READY_FOR_REVIEW | VERIFY_FAILED | BLOCKED_DEPENDENCY",
  "artifact": ["changed/path"],
  "evidence": ["command and result"],
  "decision": "short implementation summary",
  "unknowns": ["remaining uncertainty"],
  "dependency": ["contract or task id"],
  "next_action": "commander review or exact recovery action"
}
```

Status-only chatter does not change task state.

## Cadence and Interrupt Policy

- Workers checkpoint after schema/query implementation, renderable module
  implementation, and focused verification.
- The commander checks in only when integration is blocked or a worker returns.
- Interrupt a worker for ownership breach, fabricated data, unapproved external
  effects, or architecture drift.
- Maximum attempts per failed task or integration signature: two.

## Permissions

Allowed:

- Read the repository and approved contracts.
- Write only declared territories.
- Run local tests, type checks, builds, lint, and local browser checks.

Denied:

- Production or shared-environment changes.
- External publication, spending, or outbound messages.
- Destructive database operations.
- Market-research execution in tests or page load.
- Writes outside the assigned territory.

## Promotion Boundary

A worker report is not acceptance. The commander promotes an artifact only
after reviewing its diff, confirming contract compatibility, and running the
declared verifier. The whole mission is complete only after an independent
review and the full regression/browser gate pass.

## Recovery and Rollback

Reject only the failed workstream artifact and preserve verified siblings.
Never reset the dirty worktree. Recovery uses a corrected patch in the owning
territory. The analytics route can be rolled back by restoring only the
commander-owned integration files and newly added analytics modules/services.

