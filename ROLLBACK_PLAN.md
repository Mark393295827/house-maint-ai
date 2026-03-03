# House Maint AI — Rollback & Feature Flag Plan

**Date:** 2026-03-01  
**Purpose:** Define procedures for safely rolling back features and managing gradual rollouts.

---

## 1. Feature Flag Strategy

### 1.1 Implementation
Feature flags are managed via environment variables and a runtime configuration layer.

```typescript
// server/config/featureFlags.ts
export const featureFlags = {
  AI_AUTO_TRIAGE: process.env.FF_AI_AUTO_TRIAGE === 'true',      // AI auto-assigns severity
  WORKER_AUTO_DISPATCH: process.env.FF_WORKER_DISPATCH === 'true', // Auto-dispatch vs. manual
  WECHAT_PAY_ESCROW: process.env.FF_WECHAT_PAY === 'true',       // Live payments vs. simulation
  DIY_GUIDE_DEFLECTION: process.env.FF_DIY_DEFLECTION === 'true', // Show DIY guides to tenants
  PIPL_FACE_BLUR: true,                                           // ALWAYS ON — cannot be disabled
};
```

### 1.2 Flag Categories

| Category | Can Disable? | Example |
|---|---|---|
| **Safety-Critical** | ❌ Never | PIPL face blurring, data residency enforcement |
| **Core Experience** | ⚠️ With approval | AI diagnosis, worker matching |
| **Growth Features** | ✅ Freely | DIY guide deflection, review prompts |
| **Experimental** | ✅ Freely | New UI layouts, pricing experiments |

---

## 2. Rollback Triggers

| Trigger | Threshold | Automatic? |
|---|---|---|
| API error rate (5xx) | > 5% for 10 min | Yes — Sentry alert + auto-disable last feature flag |
| AI misdiagnosis rate | > 15% (confirmed by worker feedback) | No — manual review, then disable `AI_AUTO_TRIAGE` |
| Payment failure rate | > 2% | No — disable `WECHAT_PAY_ESCROW`, revert to manual |
| Worker no-show rate | > 10% | No — disable `WORKER_AUTO_DISPATCH`, revert to PM assignment |
| Privacy breach | Any unblurred face | Yes — full system halt, PIPL incident team notified |

---

## 3. Rollback Procedure

### Level 1: Feature Disable (< 5 min)
1. Set the relevant feature flag environment variable to `false`.
2. Restart the affected service (backend auto-restarts via PM2/Docker).
3. Verify: confirm the feature is disabled via `/api/v1/health` endpoint.

### Level 2: Code Rollback (< 30 min)
1. Identify the last known good commit via `git log --oneline -10`.
2. Create a revert: `git revert HEAD~N..HEAD`.
3. Push to `main` → CI/CD auto-deploys.
4. Verify: smoke test critical paths (login, diagnosis, dashboard).

### Level 3: Full Rollback (< 1 hour)
1. Revert database migrations if schema changed: `npx drizzle-kit rollback`.
2. Restore database from last automated backup (daily snapshots).
3. Deploy the previous Docker image tag.
4. Notify all stakeholders via WeChat group.

---

## 4. Degradation Levels

| Level | Symptoms | Action | User Impact |
|---|---|---|---|
| **Green** | All systems normal | None | None |
| **Yellow** | Non-critical feature failing | Disable feature flag | Minor — one feature unavailable |
| **Orange** | Core AI failing | Disable AI auto-triage, switch to human-in-the-loop | Moderate — slower diagnosis |
| **Red** | Payment or privacy failure | Full system pause, incident response | Major — service temporarily offline |

---

## 5. Responsible Roles

| Role | Responsibility | Contact |
|---|---|---|
| **On-call Engineer** | Execute L1/L2 rollbacks, respond to Sentry alerts | Rotating weekly schedule |
| **Product Lead** | Approve L2/L3 rollbacks, assess user impact | @张总 |
| **PIPL Compliance Officer** | Immediate authority for privacy-related system halts | Required for Red incidents |
