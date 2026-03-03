# House Maint AI — Product Metrics Framework

**Date:** 2026-03-01  
**Framework:** Google HEART + North Star + Guardrails

---

## 1. North Star Metric

> **Monthly Tickets Deflected (MTD):** The number of maintenance issues resolved by AI-generated DIY guides without dispatching a worker.

This metric directly ties **user value** (faster resolution, lower cost) to **business growth** (lower operational cost, higher tenant satisfaction, stickier SaaS retention).

### Supporting Input Metrics
| Input Metric | Relationship | Target |
|---|---|---|
| AI Diagnostic Accuracy | Higher accuracy → more confident deflections | ≥ 85% |
| DIY Guide Library Size | More guides → more deflectable issue types | 50+ guides |
| Monthly Active Cases | Denominator for deflection rate | Growing 10% MoM |

---

## 2. HEART Framework

### 2.1 Happiness
| Signal | Metric | Current | Target | Implementation |
|---|---|---|---|---|
| Post-resolution satisfaction | **Tenant NPS** (5-point in-app survey) | Not tracked | ≥ 30 | WeChat template message after ticket closure |
| Worker satisfaction | **Worker NPS** | Not tracked | ≥ 40 | Monthly WeChat survey to active 师傅 |
| AI diagnosis helpfulness | `is_helpful` rating on AI feedback | ✅ Exists | ≥ 80% positive | Already in `ai_feedback` table |

### 2.2 Engagement
| Signal | Metric | Current | Target | Implementation |
|---|---|---|---|---|
| Daily active usage | **DAU/MAU ratio** | Not tracked | ≥ 15% | Mixpanel event: `session_start` |
| Return visits | **Sessions per user per month** | Not tracked | ≥ 3 | Mixpanel cohort analysis |
| Feature depth | **AI diagnosis completion rate** | Not tracked | ≥ 70% | Track: `diagnosis_started` → `diagnosis_completed` |

### 2.3 Adoption
| Signal | Metric | Current | Target | Implementation |
|---|---|---|---|---|
| New user activation | **% who complete first diagnosis within 7 days** | ❌ Missing | ≥ 50% | Activation funnel (see §3) |
| Property manager onboarding | **% who view dashboard within 3 days of signup** | ❌ Missing | ≥ 80% | Mixpanel funnel |
| Worker network growth | **New 师傅 registered per week** | Not tracked | ≥ 5/week | DB query on `workers` table |

### 2.4 Retention
| Signal | Metric | Current | Target | Implementation |
|---|---|---|---|---|
| Short-term | **D1 retention** (return day after first use) | ❌ Missing | ≥ 40% | Mixpanel cohort |
| Medium-term | **D7 retention** | ❌ Missing | ≥ 25% | Mixpanel cohort |
| Long-term | **D30 retention** | ❌ Missing | ≥ 15% | Mixpanel cohort |
| SaaS churn | **Monthly logo churn (B2B)** | ❌ Missing | < 5% | Billing system |

### 2.5 Task Success
| Signal | Metric | Current | Target | Implementation |
|---|---|---|---|---|
| Diagnosis completion | **End-to-end time: photo → diagnosis** | ✅ Partial | < 2 min | `metricsCollector` latency tracking |
| Worker match | **Time: diagnosis → worker acceptance** | ✅ Partial | < 15 min | Match timestamp delta |
| Issue resolution | **First-Time Fix Rate** | ✅ Exists in schema | ≥ 70% | `reports.first_time_fix` column |
| Ticket throughput | **Active tickets / available workers** | ✅ Analytics service | < 5:1 ratio | `getDashboardStats()` |

---

## 3. Activation Funnel

```
Step 1: WeChat Mini Program Opened          ─── 100%
  │
Step 2: WeChat Login Authorized (OpenID)    ─── Target: 90%
  │
Step 3: First Photo/Voice Uploaded          ─── Target: 70%
  │
Step 4: AI Diagnosis Received               ─── Target: 65%
  │
Step 5: Action Taken (DIY or Dispatch)      ─── Target: 50%  ← ACTIVATED
```

**Activation Definition:** A user is "activated" when they complete Step 5 — they have received a diagnosis AND taken action on it (either followed a DIY guide or accepted a worker dispatch).

---

## 4. Guardrail Metrics (Circuit Breakers)

> [!CAUTION]
> If any Guardrail metric breaches its threshold, **halt feature rollout** and investigate.

| Guardrail | Threshold | Response |
|---|---|---|
| AI diagnosis error rate (misdiagnosis confirmed by worker) | > 15% | Pause AI auto-triage; revert to human-in-the-loop |
| Worker no-show rate (accepted but didn't arrive) | > 10% | Suspend worker from platform; investigate dispatch flow |
| Payment failure rate (WeChat Pay) | > 2% | Roll back to manual payment; escalate to WeChat Pay support |
| Privacy breach (unblurred faces reaching LLM) | > 0% | Immediate system halt; PIPL incident response |
| API error rate (5xx) | > 5% sustained for 10 min | Trigger Sentry alert; on-call investigation |

---

## 5. Retention Tracking Plan (D1/D7/D30 Implementation)

### Data Source
- **Mixpanel** `session_start` events with `distinct_id` = WeChat OpenID.
- Cohort definition: group users by their `first_seen` date.

### Reporting Cadence
| Report | Frequency | Owner |
|---|---|---|
| D1/D7/D30 retention curves | Weekly | Product |
| Activation funnel conversion | Daily | Growth |
| Guardrail metric dashboard | Real-time (Sentry + Mixpanel alerts) | Engineering |
| HEART scorecard | Monthly | Product + Leadership |
