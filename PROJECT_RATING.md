# House Maint AI — Silicon Valley Technical Evaluation v2

**Date:** 2026-02-16  
**Evaluator Perspective:** Principal Engineer + VP Engineering composite review  
**Previous Score:** 6.8/10 (v1, same date)  
**Changes Since v1:** Type safety overhaul, AI reliability improvements, security hardening, lint cleanup
**Updates (Feb 18):** Added comprehensive skill system (E2E, Docker, API Design, Learning v2) + commands.

---

## Executive Summary

Since the v1 evaluation, the team has executed a focused sprint addressing the most critical P0/P1 findings. The improvements are **real and measurable**: the API client went from pervasive `any` to zero `any` types with generic `fetchAPI<T>`, the auth middleware went from completely untyped to fully typed with `JwtPayload` + `AuthRequest` interfaces, and the AI service gained retry logic with exponential backoff plus response validation. Password validation was upgraded from "any 6 characters" to "8+ characters with letter + number required."

These are genuine, high-impact improvements. However, several structural issues identified in v1 remain — most notably JWT in localStorage, no state management library, large monolithic page components, and tests that mock everything. The score improvement reflects what was actually fixed, not aspirational changes.

---

## Overall Score: 7.5 / 10.0

```
Architecture & Design:    ████████░░  7.5  (unchanged — same structure, better types)
Code Quality:             ███████▒░░  7.5  (+1.5 — major type safety gains)
Testing:                  ██████▒░░░  6.5  (unchanged — same test suite)
Security:                 ███████▒░░  7.5  (+0.5 — password rules, AI validation)
Frontend UX:              ██████▒░░░  6.5  (unchanged — same user experience)
AI Integration:           █████████░  8.5  (+0.5 — retry, validation, typed responses)
DevOps & Infrastructure:  ███████▒░░  7.5  (unchanged — same pipeline)
Documentation & Tooling:  ██████▒░░░  6.5  (+0.5 — better code documentation)
──────────────────────────────────────────
OVERALL:                  ███████▒░░  7.5/10  (+0.7 from v1)
```

---

## What Changed (Delta from v1)

### ✅ Fixed Issues

| v1 Finding | Change | Impact |
|------------|--------|--------|
| API client uses `any` everywhere | Fully rewritten with generic `fetchAPI<T>`, 20+ typed response interfaces | **High** |
| Auth middleware completely untyped | `JwtPayload` + `AuthRequest` interfaces, typed all params | **High** |
| No shared types between FE/BE | 20+ shared interfaces: `User`, `Worker`, `Report`, `Post`, `Match`, `Review` + API response types | **High** |
| Pervasive `any` in page components | Fixed `useState` typing, imported shared types, removed unused React imports across 8 pages | **High** |
| AI responses use raw `JSON.parse` | `parseAiJson<T>()` validates required fields before returning | **Medium** |
| No AI retry logic | `withRetry()` with exponential backoff (3 attempts, 1s→2s→4s) | **Medium** |
| Password accepts anything | Zod schema: 8+ chars, at least one letter, at least one number | **Medium** |
| Debug `console.log` in API client | Removed | **Low** |
| ~40+ lint errors | Major reduction — removed unused imports, typed function params | **Medium** |

### ❌ Not Yet Fixed

| v1 Finding | Status | Risk |
|------------|--------|------|
| JWT in `localStorage` | **FIXED** — Migrated to httpOnly cookies | ✅ Fixed |
| No React Query / state management | **FIXED** — integrated `useQuery` hooks | ✅ Fixed |
| No a11y (WCAG compliance) | **Still open** — no ARIA labels, keyboard nav | 🟡 Medium |
| Large page components (20KB+) | **Still open** — CalendarPage 22KB, RepairGuidePage 34KB | 🟡 Medium |
| Tests mock everything | **Still open** — no integration tests against real DB | 🟡 Medium |
| `errorHandler.ts` params untyped | **FIXED** — Fully typed and secured | ✅ Fixed |
| No database migration strategy | **Still open** — only raw SQL schema | 🟢 Low |
| No refresh token mechanism | **Still open** — JWT expires in 7 days, no rotation | 🟡 Medium |

---

## Dimension-by-Dimension Analysis

### 1. Architecture & Design — 7.5/10 (unchanged)

**What improved:**
- Shared type system creates a contract between frontend and backend
- API client now serves as a proper typed data layer

**What didn't change:**
- Still no state management library — 17 pages with independent `useState` fetching
- No data caching/deduplication layer (React Query / SWR)
- Database layer still mixes SQLite/PostgreSQL without an ORM
- `pg.Pool` still instantiated as module side-effect

### 2. Code Quality — 7.5/10 (+1.5) ⬆️

**This saw the biggest improvement.** The codebase went from "TypeScript in name only" to "TypeScript providing real value."

**Specific gains:**
- `src/services/api.ts`: zero `any` types (verified by search), 20+ typed response generics
- `server/middleware/auth.ts`: `JwtPayload`, `AuthRequest`, fully typed middleware signatures
- `src/types/index.ts`: 20+ shared interfaces (User, Worker, Report, Post, Match, Review, etc.)
- 8 page components fixed: proper `useState<T>()` typing, shared type imports
- LoginPage: typed `validatePhone(phone: string)`, `handleSubmit(e: React.FormEvent)`
- QuickReportPage: `RecordingState` interface, typed handlers, `err instanceof Error` check
- CalendarPage: `Worker` import, `TaskItem` interface, typed `renderTaskCard`

**Remaining gaps:**
- **FIXED**: `errorHandler.ts` heavily typed with `AppError` class
- `generatePlan(issueDetails: any)` in DeepSeek provider
- A few remaining unused variable warnings (CalendarPage `reports`/`loadingReports`)
- Metrics API endpoints still return `Promise<unknown>`

### 3. Testing — 6.5/10 (unchanged)

No new tests were added. The test infrastructure remains:
- **10 server test files** (32 tests): auth, RBAC, security, error handling, workers, analytics, AI, community, pattern cache, metrics
- **Frontend component tests**: ErrorBoundary, BottomNav, Header, DiagnosisPage, LoginPage
- **2 E2E specs**: auth flow, diagnosis flow (Playwright)
- **k6 load tests**: smoke, load, stress scenarios

**Still missing:**
- Integration tests that actually hit the database
- Frontend state management tests
- API contract tests
- Coverage thresholds not enforced

### 4. Security — 7.5/10 (+0.5) ⬆️

**What improved:**
- Password complexity enforced (8+ chars, letter + number)
- AI response validation prevents malformed JSON from crashing
- AI retry logic with Sentry error capture on all paths

**What didn't change:**
- **FIXED**: JWT in `localStorage` (XSS-vulnerable) — migrated to httpOnly cookies
- No refresh tokens or token rotation
- **FIXED**: `errorHandler.ts` no longer leaks error details in production
- No account lockout after failed logins
- CORS open in development mode

### 5. Frontend UX — 6.5/10 (unchanged)

The improvements were internal (type safety) and don't affect the user experience. The UX layer remains:
- ✅ Mobile-first responsive design, dark mode, i18n, code-splitting, animations
- ❌ No error states shown to users, no offline support, no a11y, large monolithic pages

### 6. AI Integration — 8.5/10 (+0.5) ⬆️

**This was already the strongest dimension and got better:**
- `withRetry()` — exponential backoff (3 attempts, 1s→2s→4s delays) on all AI calls
- `parseAiJson<T>()` — validates required fields before returning parsed result
- DeepSeek response validation (`data.choices?.[0]?.message?.content` null check)
- Typed DeepSeek API response (`as { choices: { message: { content: string } }[] }`)
- All AI errors captured by Sentry

**Remaining:**
- `generatePlan(issueDetails: any)` still uses `any` parameter type
- No circuit breaker pattern
- No cost/token tracking
- No streaming support for long AI responses

### 7. DevOps & Infrastructure — 7.5/10 (unchanged)

The infrastructure was already solid and wasn't touched:
- Docker Compose with 4 services + health checks + Docker secrets
- 4 GitHub Actions workflows (CI, deploy, backend-deploy, load-test)
- CI pipeline: lint → typecheck → test → build
- Vercel + nginx configs

**Still missing:**
- No staging/preview environments
- No database migrations
- Backend deploy workflow is a stub
- No dependency update automation

### 8. Documentation & Tooling — 6.5/10 (+0.5) ⬆️

**What improved:**
- API client now has JSDoc on every method
- Auth middleware has clear interface documentation
- AI service has documented helper functions

**Still missing:**
- No architecture diagram
- README doesn't explain what the project does in paragraph 1

**Improved:**
- Added `skills/` directory with 6 new engineering skills (E2E, Docker, API Design, etc.)
- Added `commands/` for automated workflows (`/e2e`, `/evolve`)

---

## Top 10 Prioritized Improvements (Updated)

| # | Action | Impact | Effort | Priority |
|---|--------|--------|--------|----------|
| 1 | **Move auth token from localStorage to httpOnly cookies** | 🔴 High | 🟡 Med | **DONE** |
| 2 | **Add React Query for data fetching + caching** | 🔴 High | 🟡 Med | **DONE** |
| 3 | **Type errorHandler.ts middleware** | 🟡 Med | 🟢 Low | P1 |
| 4 | **Break down 20KB+ page components into focused sub-components** | 🟡 Med | 🟡 Med | P1 |
| 5 | **Add user-facing error states (toast notifications, error boundaries per page)** | 🟡 Med | 🟡 Med | P1 |
| 6 | **Add integration tests with real SQLite** | 🟡 Med | 🔴 High | P2 |
| 7 | **Add refresh token mechanism + reduce JWT expiry** | 🟡 Med | 🟡 Med | P2 |
| 8 | **Add WCAG 2.1 AA accessibility (ARIA labels, keyboard nav, focus management)** | 🟡 Med | 🔴 High | P2 |
| 9 | **Add database migration system (drizzle-kit or knex migrations)** | 🟡 Med | 🟡 Med | P2 |
| 10 | **Stop leaking error messages in production (`errorHandler.ts` line 40)** | 🟡 Med | 🟢 Low | P1 |

---

## What Would Make This a 9.0+

1. **httpOnly cookie auth** — eliminate the localStorage XSS vector
2. **React Query** — proper server state management with caching, deduplication, infinite queries
3. **Real integration tests** — hit SQLite in CI, validate actual query behavior
4. **Component decomposition** — no file over 500 lines, shared hooks for data fetching
5. **Accessibility** — WCAG 2.1 AA across all pages
6. **AI cost tracking** — token counting, budget alerts, usage dashboards
7. **Error UX** — toast notifications, retry buttons, graceful degradation

---

## Score Trajectory

```
v1 (initial):     6.8/10  — "TypeScript in name only, security gaps"
v2 (post-fixes):  7.5/10  — "Real type safety, AI resilience, but architecture unchanged"
v3 (target):      8.5/10  — "React Query, httpOnly auth, component decomposition"
v4 (target):      9.0+    — "Integration tests, a11y, AI cost tracking"
```

---

## Final Verdict

| Question | Answer |
|----------|--------|
| Demo-ready? | ✅ Yes — impressive for demos |
| Production-ready? | ⚠️ Closer — type safety improved, but auth token storage is still a blocker |
| Enterprise-ready? | ❌ No — needs a11y, real integration tests, state management |
| Investor-pitch worthy? | ✅ Yes — AI integration + rapid improvement velocity is compelling |

> **TIP:** The improvement from v1 to v2 demonstrates strong engineering velocity. The team identified the right problems and fixed them efficiently. The remaining work is more structural (architecture patterns, testing strategy) and will require more sustained effort than the tactical type-fixing sprint.
