# Case API continuation command program

Mission: Add the smallest public case surface after the security and event gates are accepted. The API worker writes only route/test territory; the checker writes only a receipt; `/root` alone edits `server/index.ts` at the final mount gate.

Typed IPC:

```json
{"task_id":"c1-case-api-builder","state":"READY|RUNNING|VERIFYING|SUCCEEDED|FAILED","artifact":".agent-state/practical-backend-api-20260801/artifacts/<task>.json","evidence":["fresh receipts"],"decision":"accept|reject|retry|escalate","unknowns":[],"dependency":"c0-api-input","next_action":"one bounded action or stop reason"}
```

Ownership:

- `c0-api-input` (`/root`): records accepted prerequisites.
- `c1-case-api-builder` (API worker): `server/routes/cases.routes.ts`, `server/routes/reportCompatibility.routes.ts`, `server/tests/case-api.test.ts`, and its receipt only. It must use the case-event service, Zod/envelope validation, idempotency/version semantics, and an injected/fail-closed authorization seam. It may not edit `server/index.ts`.
- `c2-case-api-checker` (independent API checker): receipt only; adversarially tests unauthorized, cross-org, invalid envelope, stale version, duplicate key, feature flag, and legacy response behavior.
- `c3-mount-integration` (`/root`): `server/index.ts` and mount receipt only. Mounts the candidate routes only when the explicit case API feature flag is enabled; default-off remains safe.
- `c4-regression` (independent regression worker): terminal receipt only.

No API route may import an AI provider, credentials, payment, socket, or broad agent route. Existing `/api/v1/agents/*` remains compatibility-only and untouched.
