# ECC Skill Validation Audit

**Date:** 2026-02-26
**Framework:** Evaluated against the recently installed `everything-claude-code` skill test items (`backend-patterns`, `frontend-patterns`, `security-review`).
**Target:** House Maint AI

---

## 1. Security Review (`security-review.md`)
**Score: 8/10 (Strong, with localized gaps)**

### ✅ Passed Items:
- **Secrets Management:** The project correctly utilizes `process.env` (e.g., `JWT_SECRET`, Stripe webhooks, Wechat credentials) and has isolated environments via `.env.production` and `.env.development`.
- **Input Validation:** Safely implemented via `Zod`. The recent refactor in `auth.ts` enforcing `jwtPayloadSchema.parse(decoded)` passes the required whitelisting and structural validation test items.
- **SQL Injection Prevention:** Supabase API and Drizzle ORM are used correctly without concatenated raw strings.

### ❌ Failed Items (Actionable):
- **CSRF Tokens:** The current authentication middleware relies on a `x-csrf-token` header check, but does not deploy the recommended **Double-Submit Cookie Pattern** defined in the new ECC security guide.
- **XSS Prevention (Client):** While React inherently escapes strings, there is no explicit `Content-Security-Policy` (CSP) mapping defined in the Vite/React configuration or NGINX headers as mandated by the skill checklist.

---

## 2. Backend Patterns (`backend-patterns.md`)
**Score: 7.5/10 (Robust logic, missing advanced scale patterns)**

### ✅ Passed Items:
- **Service/Middleware Pattern:** The global Express layout with abstracted workers (`worker.ts`), route isolation, and dedicated handlers perfectly aligns with the `Service Layer Pattern`.
- **Query Optimization:** Eliminating `any` bounds the return types securely, and the codebase avoids `SELECT *` across major transactional joins.
- **Rate Limiting:** Migrated to `express-rate-limit` using `rate-limit-redis`, hitting the exact requirement of the ECC pattern for authenticated API throttling.

### ❌ Failed Items (Actionable):
- **N+1 Query Prevention:** The original `DIAGNOSIS` history loading inside the AI prompts relies on sequential fetches rather than a batched `Data Loader` / `Map` pattern.
- **Exponential Backoff:** The AI worker calls (e.g., DeepSeek/Gemini endpoints) do not currently utilize the strict exponential backoff execution wrapper defined in the new `fetchWithRetry` pattern.

---

## 3. Frontend Patterns (`frontend-patterns.md`)
**Score: 6/10 (Needs architecture cleanup)**

### ✅ Passed Items:
- **Component Composition:** React components leverage custom hooks heavily for data extraction (`useQuery` wrappers via TanStack) separating UI from network logic.
- **Performance:** `lazy` loading and `Suspense` are actively used for dashboard routing.

### ❌ Failed Items (Actionable):
- **Virtualization:** The Reports list on the Dashboard parses the entire JSON payload into the DOM without using `@tanstack/react-virtual`, which violates the `Virtualization for Long Lists` pattern for scale.
- **Error Boundaries:** The React app lacks a global, top-level `ErrorBoundary` component wrapper to catch deeply nested component crashes preventing blank white screens.

---

## 4. Cost-Aware LLM Pipeline (`cost-aware-llm-pipeline.md`)
**Score: 2/10 (Initial implementation phase)**

### ❌ Failed Items (Actionable):
- **Model Routing:** The application relies on single hardcoded models (previously OpenAI/Gemini, now exploring DeepSeek) rather than routing dynamically based on token volume or complexity (e.g., Haiku vs. Opus).
- **Prompt Caching:** System prompts for the `WorkerClaw` are regenerated per tick, lacking `cache_control: {"type": "ephemeral"}` JSON settings that drastically reduce token costs over repetitive API reads.

---

## Priority Remediation Path (Based on ECC Skills)

1. **(Security)** Implement strict strict CSP headers in `nginx.conf` and `vite.config.ts`.
2. **(Performance)** Wrap the large Report/Ticket list components with `react-virtual` to ensure 60fps scrolling on the PWA.
3. **(Resilience)** Wrap third-party network requests (AI, Wechat, Stripe) in the `fetchWithRetry` exponential backoff utility.
4. **(Cost)** Enable Anthropic/Gemini prompt caching for the system context headers to cut repetitive diagnosis token burn by 70%.
