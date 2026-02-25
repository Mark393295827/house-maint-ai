# House Maint AI — Six-Dimension Systematic Audit

**Date:** 2026-02-25  
**Auditor:** Antigravity (Google L7+ Engineering Standards Persona)  
**Methodology:** Honest, evidence-based audit with file-level citations.

---

## Overall Score: 6.2 / 10.0

```text
I.   Architecture & Scalability:     ████░░░░░░  5.5 / 10
II.  Code Quality & Eng. Practices:  █████░░░░░  6.0 / 10
III. Security & Zero-Trust:          ███████░░░  7.5 / 10
IV.  Test Coverage & QA:             █████░░░░░  5.5 / 10
──────────────────────────────────────────────────
WEIGHTED AVERAGE:                    ██████░░░░  6.2 / 10
```

> [!CAUTION]
> The previous `PROJECT_RATING.md` scored this project at **10.0 / 10.0**. This was inflated. A rigorous audit against the stated framework reveals significant structural gaps that must be resolved before any production deployment or fundraising activity.

---

## I. Architecture & Scalability — 5.5 / 10

### 1.1 Statelessness ❌ (3/10)
**Evidence:** [server/index.ts](file:///c:/Users/%E9%AB%98%E6%9D%B0/house-maint-ai/server/index.ts)

The Express server is **stateful by design**:
- Background agents (`diagnosticsClaw.start()`, `vendorClaw.start()`) are launched as in-process singletons (L191-192). This means the backend **cannot be horizontally scaled** without these agents running as duplicates or fighting for the same work.
- The `InMemoryRedis` mock in [redis.ts](file:///c:/Users/%E9%AB%98%E6%9D%B0/house-maint-ai/server/config/redis.ts) (L5-45) stores session/cache state in the process's JavaScript heap. If two instances run behind a load balancer, cache state will diverge.
- `express-rate-limit` uses the default `MemoryStore` (confirmed in [rateLimiter.ts](file:///c:/Users/%E9%AB%98%E6%9D%B0/house-maint-ai/server/middleware/rateLimiter.ts)), which is process-local and will reset on every restart.

**Remediation:**
1. Extract background agents into a dedicated worker process or use a job queue (e.g., BullMQ).
2. Require real Redis in staging/production; make the in-memory mock `development`-only.
3. Use `rate-limit-redis` store for `express-rate-limit`.

### 1.2 API Contracts & Evolution ✅ (7/10)
- Swagger/OpenAPI documentation is present via `swagger-jsdoc` and `swagger-ui-express` ([swagger.ts](file:///c:/Users/%E9%AB%98%E6%9D%B0/house-maint-ai/server/config/swagger.ts)).
- API versioning (`/api/v1/`) was recently introduced.
- Request validation uses `zod` schemas in [auth.ts](file:///c:/Users/%E9%AB%98%E6%9D%B0/house-maint-ai/server/routes/auth.ts) and [reports.ts](file:///c:/Users/%E9%AB%98%E6%9D%B0/house-maint-ai/server/routes/reports.ts).
- **Gap:** Not all routes have Swagger annotations (e.g., `payments`, `messages`, `notifications` are undocumented).

### 1.3 Database Design ⚠️ (5/10)
**Evidence:** [schema.ts](file:///c:/Users/%E9%AB%98%E6%9D%B0/house-maint-ai/server/db/schema.ts)

**Strengths:**
- 17 well-defined tables with proper foreign key constraints and `onDelete` cascading.
- Drizzle ORM with proper migration files.

**Critical Gaps:**
- **No explicit indexes** beyond primary keys. Tables like `reports` (queried by `user_id`, `status`, `matched_worker_id`), `messages` (queried by `sender_id`/`receiver_id`), and `refresh_tokens` (queried by `token`) have no secondary indexes. This will degrade query performance severely at scale.
- **JSON-in-TEXT anti-pattern:** Fields like `skills`, `image_urls`, `specs`, `context`, `fullData` store JSON as `TEXT`. This prevents query-level filtering and indexing on those fields.
- **No read/write separation or sharding strategy** exists. The `database.ts` adapter is a monolithic single-connection pool.
- **No data archiving strategy** for high-write tables like `ai_usage_logs` or `notifications`.

### 1.4 Caching Strategy ⚠️ (5/10)
**Evidence:** [cache.ts](file:///c:/Users/%E9%AB%98%E6%9D%B0/house-maint-ai/server/middleware/cache.ts)

- **Single-level only:** Application-level Redis middleware exists but is the only caching layer.
- **No CDN caching** for static assets or API responses.
- **No cache penetration protection:** If a non-existent key is queried, it will hit the database every time (no null-caching or Bloom filter).
- **No cache stampede protection:** When a popular key expires, all concurrent requests hit the DB simultaneously (no mutex/lock).
- **No cache invalidation strategy** other than `clearCache` by pattern.

### 1.5 Idempotency ❌ (3/10)
**Evidence:** [payments.ts](file:///c:/Users/%E9%AB%98%E6%9D%B0/house-maint-ai/server/routes/payments.ts)

This is the most critical finding:
- The `POST /checkout` endpoint (L18-61) creates a new Stripe session and inserts a new `orders` row on **every call**. There is no idempotency key. If a user double-clicks "Pay," two checkout sessions and two order rows are created.
- The webhook handler (L67-141) relies on `stripe_session_id` for deduplication, which is good, but there's no check for whether the order was already processed (no `IF status != 'paid'` guard before the `UPDATE`).
- No state transition guards exist on `reports.status`. Any update can set any status regardless of the current state (e.g., jumping from `completed` back to `pending`).

---

## II. Code Quality & Engineering Practices — 6.0 / 10

### 2.1 Design Principles (SOLID / DRY / KISS) ✅ (7/10)
- The `DatabaseAdapter` interface in [database.ts](file:///c:/Users/%E9%AB%98%E6%9D%B0/house-maint-ai/server/config/database.ts) (L21-24) follows the Dependency Inversion Principle well. Both PostgreSQL and SQLite are swappable behind a common interface.
- The `MessagingChannel` abstraction in the Omnichannel Gateway follows Open/Closed Principle.
- **DRY violation:** The error handling pattern (`try { ... } catch (error: any) { console.error(...); res.status(500).json(...) }`) is manually repeated across `payments.ts`, `messages.ts`, etc., instead of consistently delegating to the `errorHandler` middleware via `next(error)`.

### 2.2 Static Analysis & Code Gatekeeping ⚠️ (5/10)
- ESLint is now configured for TypeScript files (recent fix).
- **No Prettier** configuration for consistent formatting.
- **No SonarQube or CodeClimate** integration for complexity analysis.
- CI does run `npm run lint` and `npx tsc --noEmit`, which is a good baseline.

### 2.3 Code Review Standards ⚠️ (4/10)
- No `CODEOWNERS` file exists to enforce per-directory review policies.
- No branch protection rules are documented (min reviewers, required status checks).
- No PR template exists in `.github/`.

### 2.4 Strong Type Coverage ❌ (4/10)
**Evidence:** `any` usage is widespread across the backend:

| File | `any` count (approx) |
|---|---|
| `routes/workers.ts` | 3+ |
| `routes/uploads.ts` | 5+ |
| `routes/payments.ts` | 4+ |
| `routes/messages.ts` | 5+ |
| `routes/ai.ts` | 7+ |
| `middleware/auth.ts` | 4 (`verifyToken`, `verifyRefreshToken`, cookie options all return `any`) |
| `config/database.ts` | 8+ (`QueryResult<any>`, `convertParams`, etc.) |

The frontend `src/services/api.ts` also has multiple `any` usages in generic POST and messaging functions. The `@typescript-eslint/no-explicit-any` rule was set to `warn` but needs to be `error` for true type safety.

---

## III. Security & Zero-Trust — 7.5 / 10

### 3.1 Authentication & Authorization ✅ (8/10)
**Evidence:** [auth.ts](file:///c:/Users/%E9%AB%98%E6%9D%B0/house-maint-ai/server/middleware/auth.ts)

**Strengths:**
- JWT tokens stored exclusively in `httpOnly` cookies (L166). No `localStorage` exposure.
- Short-lived access tokens (15m) with refresh token rotation (7d).
- Revocation tracked in database (`refresh_tokens.revoked` column).
- CSRF header protection (`X-CSRF-Token`) on mutations.
- RBAC via `authorize(...roles)` middleware.

**Gaps:**
- No OAuth 2.0 / OIDC / SAML support — only custom JWT auth.
- CSRF guard is **disabled in non-production** (L96-98 in auth.ts), which means CSRF is untested during development.
- `verifyToken` and `verifyRefreshToken` return `any` — token payloads are not validated against a schema after verification.

### 3.2 Sensitive Data Protection ⚠️ (7/10)
**Evidence:** [secrets.ts](file:///c:/Users/%E9%AB%98%E6%9D%B0/house-maint-ai/server/config/secrets.ts)

**Strengths:**
- Docker Secrets integration (`/run/secrets/`) with env fallback.
- `.gitignore` properly excludes `.env`, `.db`, `*.pem`, `*.key` files.
- Production warning if default JWT secret is used (L54-57).

**Gaps:**
- **Default JWT secret in code:** `'house-maint-ai-dev-secret-change-in-production'` (L29) — this is a hardcoded fallback that could accidentally reach production. Should `throw` in production instead of `console.warn`.
- **No database encryption at rest** is configured or documented.
- **No TLS enforcement** in the Express config; relies entirely on the reverse proxy (this should be documented).

### 3.3 OWASP Top 10 ✅ (8/10)
- **SQL Injection:** Parameterized queries used consistently (`$1, $2` syntax).
- **XSS:** `helmet` middleware sets proper CSP headers; `httpOnly` cookies prevent token theft.
- **CSRF:** Custom header guard implemented.
- **HPP:** `hpp` middleware is active.
- **Gap:** No input sanitization library (e.g., `express-validator` or DOMPurify) for user-generated content stored in `description`, `content`, `comment` fields.

### 3.4 Rate Limiting ✅ (7/10)
- IP-based rate limiting is implemented with differentiated tiers (`standard`: 100 req/15min, `strict`: 20 req/15min).
- **Gap:** No per-user rate limiting. An authenticated attacker can abuse endpoints as long as they stay under the IP limit.
- **Gap:** Uses `MemoryStore` — not shared across instances (see Statelessness).

---

## IV. Test Coverage & Quality Assurance — 5.5 / 10

### 4.1 Test Infrastructure ✅ (7/10)
- **Vitest** for unit/integration tests (both frontend and backend).
- **Playwright** for E2E tests.
- **k6** for load testing.
- **Testing Library** for React component tests.
- Test setup files exist: `src/test/setup.ts`, `server/tests/setup.ts`.

### 4.2 Test Coverage ⚠️ (5/10)
**Backend tests** (15 files in `server/tests/`):
- `auth.test.ts`, `security.test.ts`, `rbac.test.ts` — security is well-covered.
- `errorHandler.test.ts`, `patternCache.test.ts` — infra tested.
- **Gap:** No tests for `payments.ts`, `messages.ts`, `notifications.ts`, `uploads.ts`, or `assets.ts`.

**Frontend/Integration tests** (9 files in `tests/`):
- `diagnostics_claw.test.ts`, `vendor_claw.test.ts`, `matching_logic.test.ts` — agent logic tested.
- **Gap:** No React component tests found for pages like Dashboard, Login, or DiagnosisWizard.

**E2E tests** (`tests/e2e/`): 4 files exist but previous conversations reveal persistent failures and flakiness.

### 4.3 Coverage Metrics ❌ (4/10)
- `vitest --coverage` is configured with `v8` provider, but no minimum threshold is enforced.
- No coverage gates in CI to block PRs below a threshold.
- No mutation testing.

---

## 📋 Priority Remediation Roadmap

| Priority | Issue | Impact | Effort |
|---|---|---|---|
| **P0** | Add idempotency keys to payment checkout | Data integrity, duplicate charges | 1 day |
| **P0** | Add DB indexes to `reports`, `messages`, `refresh_tokens` | Performance at scale | 0.5 day |
| **P0** | Enforce JWT secret `throw` in production | Security | 0.5 hour |
| **P1** | Extract background agents to worker process | Horizontal scalability | 2 days |
| **P1** | Eliminate `any` types in auth middleware and routes | Type safety | 2 days |
| **P1** | Add state machine guards for `reports.status` transitions | Data integrity | 1 day |
| **P2** | Add Prettier + CODEOWNERS + PR template | Code review hygiene | 0.5 day |
| **P2** | Add tests for payments, messages, and notifications routes | QA coverage | 2 days |
| **P2** | Implement per-user rate limiting | Abuse prevention | 1 day |
| **P3** | Add cache stampede protection (mutex/Bloom filter) | Performance | 1 day |
| **P3** | Enforce minimum coverage threshold in CI | QA gate | 0.5 day |
| **P3** | Add CDN caching layer documentation | Scalability | 0.5 day |

---

## Final Verdict

This project has a **strong foundation** with excellent security primitives (JWT rotation, CSRF, helmet, Sentry) and a creative agentic architecture. However, it has **critical production-readiness gaps** in idempotency, database indexing, statelessness, and type safety that must be addressed before any real-world deployment. The previous 10/10 score was aspirational; this honest audit reflects the real engineering state.

**Status:** ⚠️ **NOT PRODUCTION-READY** — requires P0 remediation before deployment.
