# House Maint AI — Business Verification OKRs

**Date:** 2026-03-04  
**Framework:** 11-Stage Business Growth Model  
**Current Stage:** Stage 1–2 (Testing Hypothesis → Proving Value)  
**Grading:** 0.0–1.0 scale (0.7 = on-target, 1.0 = stretch achieved)

---

## Phase 1: Search for Product / Market Fit (Stages 1–3)

### Stage 1 — Test Hypothesis

> **Core question:** *Does the pain exist, and will users engage with our solution?*

**Objective 1: Validate that Sanya tenants will use WeChat AI diagnosis instead of phone calls to landlords**

| Owner | Deadline | Baseline |
|---|---|---|
| Product Lead | Q2 2026 (Apr 30) | Zero users; product not yet launched |

| # | Key Result | Definition | Target | How to Measure |
|---|---|---|---|---|
| KR1.1 | Beta tenant recruitment | Unique WeChat OpenIDs who complete at least one photo upload via the Mini Program, recruited through QR stickers placed in partner PM buildings | ≥ 30 tenants | `SELECT COUNT(DISTINCT wechat_openid) FROM users WHERE first_diagnosis_at IS NOT NULL` |
| KR1.2 | Diagnosis completion rate | % of users who start a diagnosis (trigger: `diagnosis_started` Mixpanel event) and receive a result (trigger: `diagnosis_completed`) within a single session, excluding network timeouts | ≥ 70% | Mixpanel funnel: `diagnosis_started` → `diagnosis_completed`; exclude events with `error=timeout` |
| KR1.3 | Diagnosis speed | Median elapsed time from the moment the user's photo payload hits the backend (`POST /api/ai/diagnose` timestamp) to the structured JSON response being returned to the client | < 2 min (p50) | `metricsCollector.latency('diagnosis_e2e')` histogram, p50 bucket |
| KR1.4 | Problem-solution fit signal | % of beta users who answer "Yes" or "Strongly Agree" to "Does this solve a real problem for you?" (5-point Likert scale, top-2 box) in a post-first-diagnosis WeChat template message survey | ≥ 80% top-2 box | WeChat survey response aggregation; denominator = surveys sent, not users signed up |

---

### Stage 2 — Prove the Value

> **Core question:** *Does the product deliver measurable, quantifiable value to all three user personas?*

**Objective 2: Demonstrate that AI diagnosis creates measurable efficiency gains for property managers**

| Owner | Deadline | Baseline |
|---|---|---|
| Product Lead + BD Lead | Q2 2026 + 30d (May 30) | Manual WeChat group coordination; no AI triage |

| # | Key Result | Definition | Target | How to Measure |
|---|---|---|---|---|
| KR2.1 | Ticket deflection rate (TDR) — **North Star** | % of tenant-created tickets that are closed with `resolution_type = 'diy_guide'` (tenant self-resolved after receiving an AI-generated video/text guide), with no subsequent worker dispatch within 72 hours | ≥ 20% | `(tickets WHERE resolution_type='diy_guide' AND no dispatch within 72h) / (total tickets)` over a rolling 30-day window |
| KR2.2 | AI diagnostic accuracy | % of AI diagnoses where the predicted `category` and `severity` both match a human auditor's classification. Auditor reviews a consecutive batch of 100 closed tickets, using the worker's post-repair report as ground truth | ≥ 85% | Human audit spreadsheet; `(correct category AND correct severity) / 100` |
| KR2.3 | PM coordination time reduction | Average number of WeChat messages exchanged between PM and tenant per incident, compared before (manual baseline from pilot PM's message logs) and after AI triage is enabled | ≥ 40% reduction | Manual count from PM's WeChat chat history; sample ≥ 20 incidents pre vs. 20 incidents post |
| KR2.4 | Tenant NPS | Net Promoter Score calculated from a 0–10 "How likely are you to recommend?" question sent via WeChat template message within 24 hours of ticket closure. NPS = `%Promoters(9–10) – %Detractors(0–6)` | ≥ 30 | WeChat survey; minimum 50 responses for statistical validity |

**Objective 3: Demonstrate that workers receive tangible value from pre-diagnosed jobs**

| Owner | Deadline | Baseline |
|---|---|---|
| Operations Lead | Q2 2026 + 30d (May 30) | Workers receive vague WeChat messages with no pre-diagnosis |

| # | Key Result | Definition | Target | How to Measure |
|---|---|---|---|---|
| KR3.1 | Worker acceptance speed | % of push notifications (sent via WeChat Official Account to workers within 5km) that result in an "Accept" click within 15 minutes of delivery | ≥ 60% | `(accepted_at - notified_at < 15min) / (total notifications sent)` from `dispatch_events` table |
| KR3.2 | First-time fix rate (FTFR) | % of completed jobs where the worker marks `is_return_visit = false` AND the tenant does not re-open the same issue category within 14 days | ≥ 70% | `reports.first_time_fix` column, cross-referenced with `tickets` table for re-opens |
| KR3.3 | Worker NPS | Net Promoter Score from a monthly 0–10 WeChat survey sent to all workers who completed ≥ 1 job that month. Minimum 15 responses required | ≥ 40 | Monthly WeChat survey; `%Promoters – %Detractors` |
| KR3.4 | Eliminated estimate trips | % of workers who, in a post-job survey, answer "Yes" to: "Did the AI pre-diagnosis help you avoid a separate estimate visit?" | ≥ 75% | Post-job WeChat survey; `(yes responses) / (total responses)`, minimum 30 responses |

---

### Stage 3 — Prove It Can Be Sold

> **Core question:** *Will property managers pay ¥10/door/month, and will workers accept 10% commission?*

**Objective 4: Close first paying B2B SaaS customers in Sanya**

| Owner | Deadline | Baseline |
|---|---|---|
| BD Lead | Q2 2026 + 45d (Jun 14) | Zero paying customers; free trial only |

| # | Key Result | Definition | Target | How to Measure |
|---|---|---|---|---|
| KR4.1 | Trial-to-paid conversion | % of PMs who start a 30-day free trial (≤ 20 doors) and convert to a paid Starter or Professional tier before trial expiration | ≥ 30% | `(converted PMs) / (trial PMs where trial_end_date has passed)` from billing system |
| KR4.2 | Signed PM contracts | Number of PMs who sign a Letter of Intent (LOI) or paid subscription agreement, each managing ≥ 50 doors | ≥ 2 PMs | Signed LOI/contract documents on file |
| KR4.3 | Doors under paid management | Total sum of `door_count` across all paying PM accounts in the billing system | ≥ 200 doors | `SELECT SUM(door_count) FROM subscriptions WHERE status='active'` |
| KR4.4 | Average contract MRR | Average monthly recurring revenue per paying PM, calculated as `total MRR / count of paying PMs` | ≥ ¥500/PM/month | Billing system MRR report |

**Objective 5: Validate willingness-to-pay on the worker marketplace side**

| Owner | Deadline | Baseline |
|---|---|---|
| Operations Lead + Finance | Q2 2026 + 45d (Jun 14) | Workers have never paid a platform commission |

| # | Key Result | Definition | Target | How to Measure |
|---|---|---|---|---|
| KR5.1 | Commission model acceptance | % of workers who, during onboarding, agree to the 10% commission terms without requesting a reduction or refusing to register | ≥ 70% | `(workers who accepted without objection) / (total onboarding attempts)` |
| KR5.2 | Cumulative marketplace GMV | Total gross value of all completed, paid jobs processed through WeChat Pay JSAPI escrow (before commission deduction) | ≥ ¥50,000 | `SELECT SUM(job_total) FROM payments WHERE status='completed'` |
| KR5.3 | Payment settlement reliability | Number of WeChat Pay escrow settlements that fail (timeout, insufficient balance, API error) out of 50 consecutive test transactions | 0 failures / 50 txns | Payment reconciliation audit log; any `status='failed'` record is a failure |

---

## Phase 2: Search for Repeatable & Scalable & Profitable Growth Model (Stages 4–8)

### Stage 4 — Find Repeatable Sales Motion

> **Core question:** *Can we acquire PMs predictably through documented, repeatable channels?*

**Objective 6: Establish a PM acquisition engine with predictable unit economics**

| Owner | Deadline | Baseline |
|---|---|---|
| BD Lead + Growth Lead | Q3 2026 (Jul 31) | Ad-hoc founder-led sales; no documented channels |

| # | Key Result | Definition | Target | How to Measure |
|---|---|---|---|---|
| KR6.1 | Proven acquisition channels | Number of distinct channels (e.g., QR stickers, WeChat Moments ads, PM referrals, conference outbound) that each independently produce ≥ 5 qualified PM leads per month for 2 consecutive months | ≥ 2 channels | CRM lead source attribution; "qualified" = PM manages ≥ 50 doors and responds to outreach |
| KR6.2 | QR sticker → activation rate | % of unique users who scan a QR sticker AND reach "activated" status (complete diagnosis + take action) within 7 days | ≥ 15% | `(activated users with source='qr_sticker') / (total QR scans)` via Mixpanel UTM tracking |
| KR6.3 | Referral channel traction | Number of new paying PMs acquired through the "1-month-free" PM referral program | ≥ 3 referred PMs | Referral tracking: `referred_by` field in PM accounts |
| KR6.4 | Sales velocity | Median calendar days from first meaningful PM contact (demo scheduled or WeChat intro) to signed paid contract | < 30 days | CRM: `contract_signed_date - first_contact_date` for all closed-won deals |

---

### Stage 5 — Prove Non-Founders Can Sell

> **Core question:** *Can someone who is NOT a co-founder close a PM contract?*

**Objective 7: Transfer sales capability from founders to a repeatable team process**

| Owner | Deadline | Baseline |
|---|---|---|
| BD Lead | Q3 2026 (Aug 31) | Founders are the only people who have closed deals |

| # | Key Result | Definition | Target | How to Measure |
|---|---|---|---|---|
| KR7.1 | Sales playbook created | A documented playbook containing: (a) ideal customer profile, (b) cold outreach scripts, (c) demo walkthrough with screenshots, (d) objection handling for top 5 objections, (e) pricing negotiation guidelines | 1 complete playbook | Internal review sign-off by founders; stored in company wiki |
| KR7.2 | Non-founder closed deal | At least one PM contract (≥ 50 doors, paid tier) closed entirely by a non-founder BD hire or channel partner, from first contact to signed contract | ≥ 1 deal | CRM records with `deal_owner ≠ founder` |
| KR7.3 | Non-founder conversion efficiency | Ratio of non-founder close rate to founder close rate, where close rate = `(closed-won deals) / (qualified leads worked)`, measured over the same time period | ≥ 50% | CRM segmented by deal owner; compare rates over ≥ 10 leads each |

---

### Stage 6 — Make It Scalable

> **Core question:** *Can the technology and worker operations handle 10× current volume without degradation or compliance risk?*

**Objective 8: Platform handles 1,000+ concurrent doors without performance or compliance degradation**

| Owner | Deadline | Baseline |
|---|---|---|
| Engineering Lead | Q3 2026 (Sep 30) | System tested at ~200 doors |

| # | Key Result | Definition | Target | How to Measure |
|---|---|---|---|---|
| KR8.1 | API latency under load | p95 response time for all API endpoints when simulating 10× current peak traffic (concurrent requests = 10 × current daily peak) | < 500ms (p95) | k6 load test script; run against staging environment; report p95 from k6 summary |
| KR8.2 | AI diagnosis concurrency | Maximum number of simultaneous AI diagnosis requests the DeepSeek pipeline can handle before p95 latency exceeds 30 seconds or error rate exceeds 5% | ≥ 50 concurrent | Stress test: ramp concurrent `/api/ai/diagnose` calls from 1 to 100; record breaking point |
| KR8.3 | PIPL compliance at scale | Number of unblurred faces that reach the LLM provider across ALL test payloads in a 1,000-image automated compliance test suite | 0 faces leaked | Automated test: 1,000 images with embedded faces → verify PIPL middleware blurs 100% |
| KR8.4 | System uptime | Percentage of time the production environment returns HTTP 200 on health check endpoints over a calendar month | ≥ 99.5% | Uptime monitoring service (e.g., UptimeRobot or Render health checks) + Sentry 5xx alert count |

**Objective 9: Worker supply matches demand density across Sanya neighborhoods**

| Owner | Deadline | Baseline |
|---|---|---|
| Operations Lead | Q3 2026 (Sep 30) | ~20 initial whitelisted workers |

| # | Key Result | Definition | Target | How to Measure |
|---|---|---|---|---|
| KR9.1 | Registered workers | Total workers who have completed verification (ID uploaded, skills declared, commission terms accepted) in the `workers` table | ≥ 50 workers | `SELECT COUNT(*) FROM workers WHERE verified=true` |
| KR9.2 | Supply-demand balance | Rolling 7-day ratio of active open tickets to available workers (workers with `status='available'` and `last_active_at` within 72 hours) | < 5:1 | `getDashboardStats()` ratio; alert if > 5:1 for 3 consecutive days |
| KR9.3 | Geographic coverage | % of Sanya's 4 major urban districts (Jiyang, Tianya, Haitang, Yazhou) that have ≥ 5 verified workers each | ≥ 75% (3/4 districts) | Worker address geocoding → district assignment → count per district |

---

### Stage 7 — Ensure Customer Success

> **Core question:** *Are all three user personas genuinely succeeding — not just signed up, but actively getting value?*

**Objective 10: Achieve strong retention and active engagement across all personas**

| Owner | Deadline | Baseline |
|---|---|---|
| Product Lead | Q4 2026 (Oct 31) | No retention data; product recently launched |

| # | Key Result | Definition | Target | How to Measure |
|---|---|---|---|---|
| KR10.1 | D30 tenant retention | % of users (by `wechat_openid`) who trigger at least one `session_start` event on day 30 (±1 day) after their first `session_start`, measured as a cohort | ≥ 15% | Mixpanel retention cohort: group by `first_seen` date, check D30 return |
| KR10.2 | B2B SaaS logo churn | % of paying PM accounts that cancel or downgrade to free in a given calendar month, out of total paying PM accounts at start of month | < 5%/month | `(churned PMs in month) / (paying PMs at start of month)` from billing system |
| KR10.3 | PM weekly dashboard engagement | % of paying PMs who log into the dashboard (trigger `pm_dashboard_view` event) at least once per week, measured over a rolling 4-week window | ≥ 80% weekly active | Mixpanel: `(PMs with ≥1 dashboard_view per week in all 4 weeks) / (paying PMs)` |
| KR10.4 | Tenant activation rate | % of new users (registered in last 30 days) who reach "activated" status: completed at least one diagnosis AND taken action (followed DIY guide or accepted dispatch) within 7 days of registration | ≥ 50% | Activation funnel per METRICS_FRAMEWORK.md §3; Mixpanel funnel Step 1 → Step 5 |

---

### Stage 8 — Make It Profitable

> **Core question:** *Are unit economics positive? Does monthly revenue exceed monthly costs?*

**Objective 11: Achieve positive unit economics on the Sanya beachhead**

| Owner | Deadline | Baseline |
|---|---|---|
| Finance + CEO | Q4 2026 (Dec 31) | Pre-revenue; costs exceed income |

| # | Key Result | Definition | Target | How to Measure |
|---|---|---|---|---|
| KR11.1 | SaaS MRR | Total monthly recurring revenue from all paying PM subscriptions (Starter + Professional + Enterprise tiers), recognized at invoice date | ≥ ¥10,000/month | `SELECT SUM(monthly_amount) FROM subscriptions WHERE status='active'` |
| KR11.2 | Marketplace commission revenue | Total 10% commission fees collected from completed jobs in a calendar month, after WeChat Pay processing fees (2%) are deducted | ≥ ¥5,000/month | `SELECT SUM(commission_amount) FROM payments WHERE status='completed' AND month=current` |
| KR11.3 | CAC payback period | Number of months for a new PM's cumulative gross profit (revenue × gross margin) to exceed the fully loaded cost of acquiring them (sales time + marketing spend + trial cost) | < 6 months | `CAC / (monthly ARPU × gross margin %)`; track per PM cohort |
| KR11.4 | Doors under management | Total count of doors across all active paying PM subscriptions | ≥ 1,000 doors | Billing system: `SUM(door_count) WHERE status='active'` |
| KR11.5 | First profitable month | First calendar month where `(SaaS MRR + Marketplace Commission) > (Server + AI API + Ops + Marketing costs)` | By Dec 2026 | Monthly P&L statement; all cost categories itemized |

---

## Phase 3: Scaling the Business (Stages 9–11)

### Stage 9 — Hit the Gas and Scale

> **Core question:** *Can we pour fuel on the fire and grow the top-line aggressively?*

**Objective 12: Expand from Sanya to Hainan island-wide and accelerate revenue growth**

| Owner | Deadline | Baseline |
|---|---|---|
| CEO + BD Lead | Q1 2027 (Mar 31) | Operating in Sanya only |

| # | Key Result | Definition | Target | How to Measure |
|---|---|---|---|---|
| KR12.1 | Haikou launch | WeChat Mini Program live in Haikou with ≥ 10 verified workers and ≥ 1 paying PM | Live by Q1 2027 | City-level activation metrics in Mixpanel (property: `city=haikou`) |
| KR12.2 | Total doors (all cities) | Sum of doors across all active subscriptions in all operational cities | ≥ 5,000 doors | Billing system cross-city report |
| KR12.3 | Monthly ticket volume | Total new tickets created across all cities in a calendar month | ≥ 2,000/month | `SELECT COUNT(*) FROM tickets WHERE created_at >= month_start` |
| KR12.4 | Revenue compounding | Month-over-month growth rate of total revenue (SaaS + marketplace), sustained for ≥ 3 consecutive months | ≥ 20% MoM | `(revenue_month_N - revenue_month_N-1) / revenue_month_N-1` |

---

### Stage 10 — Scale the Org & Its Processes

> **Core question:** *Can the organization grow without the founders being bottlenecks in every decision?*

**Objective 13: Build a self-sustaining team with codified processes**

| Owner | Deadline | Baseline |
|---|---|---|
| CEO + COO | Q2 2027 (Jun 30) | Founders handle all ops, sales, and support |

| # | Key Result | Definition | Target | How to Measure |
|---|---|---|---|---|
| KR13.1 | City operations manager | Hire and onboard a dedicated operations manager for Sanya/Haikou who independently handles PM onboarding, worker issues, and escalations for ≥ 4 weeks without founder intervention | ≥ 1 hired + autonomous | HR records; founder escalation count < 3/week for 4 consecutive weeks |
| KR13.2 | PM onboarding speed | Median calendar days from a new PM signing a contract to their first live tenant ticket being processed through the system | < 3 days | `(first_ticket_date - contract_signed_date)` per PM |
| KR13.3 | Self-serve worker onboarding | % of new workers who complete the entire registration flow (ID upload → skill selection → commission acceptance → verification) via the WeChat flow without human assistance | ≥ 80% | `(workers with onboarding_method='self_serve') / (total new workers)` |
| KR13.4 | SOPs documented | Number of completed Standard Operating Procedures covering: sales, PM onboarding, worker onboarding, dispute resolution, escalation, billing, compliance, marketing, support, analytics | ≥ 10 SOPs | Internal wiki page count; each SOP must have ≥ 500 words with step-by-step instructions |

---

### Stage 11 — Long-Term Vision

> **Core question:** *What are the next platform bets to build defensible moats?*

**Objective 14: Validate v2.0 premium bets and secure growth capital**

| Owner | Deadline | Baseline |
|---|---|---|
| CTO + CEO | Q3 2027 (Sep 30) | Software-only platform; no hardware integration |

| # | Key Result | Definition | Target | How to Measure |
|---|---|---|---|---|
| KR14.1 | IoT integration pilot | Deploy Xiaomi/Ezviz leak sensor integration in ≥ 1 building, where a sensor event automatically creates a diagnostic ticket without tenant action | 1 building live | `SELECT COUNT(*) FROM tickets WHERE source='iot_sensor'` > 0 for ≥ 30 days |
| KR14.2 | AR diagnosis prototype | Prototype an AR overlay (camera → on-screen annotation of suspected issue area) tested with 50 users; measure whether it improves diagnostic accuracy vs. photo-only baseline | ≥ 60% accuracy lift | A/B test: `(AR group accuracy - photo group accuracy) / (photo group accuracy)`, n=50 per arm |
| KR14.3 | Tier 1 city entry | Signed LOIs with property managers in Shenzhen or Guangzhou, each managing ≥ 100 doors | ≥ 3 LOIs signed | Signed LOI documents on file |
| KR14.4 | Series A funding | Close a Series A round led by a reputable VC with focus on proptech or AI | ≥ ¥10M raised | Signed term sheet + funds received in company account |

---

## Current Stage Assessment

```
  ★ You Are Here
  ┌───────────────────────────────────────────────────────────────────────────┐
  │  1        2        3       4       5       6       7       8       9     │
  │ Test   Prove   Prove    Find   Non-F   Make   Cust.  Profit   Scale    │
  │ Hypo.  Value    Sell    Sales   Sell   Scale  Succ.           ↑        │
  │  ▲       ▲                                                             │
  │  ╠═══════╝                                                             │
  │  Executing Stage 1–2                                                   │
  └───────────────────────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **90-Day Sprint (Apr–Jun 2026) — Must-Win Battles:**
> 1. **KR1.1** → Recruit 30 beta tenants via QR sticked in Sanya partner buildings
> 2. **KR2.2** → Reach 85% AI diagnostic accuracy (P0 launch gate)
> 3. **KR2.1** → Achieve 20% ticket deflection rate (North Star metric)
> 4. **KR4.2** → Close 2 paying PM contracts to prove revenue model
> 5. **KR5.3** → Zero WeChat Pay settlement failures across 50 test transactions

---

## Stage-Gate Summary

| Gate | Transition | Must-Hit Criteria | Deadline |
|---|---|---|---|
| **PMF Gate** | 1 → 2 | 30 beta tenants, ≥ 70% diagnosis completion, ≥ 80% "solves a real problem" | Q2 2026 |
| **Value Gate** | 2 → 3 | ≥ 85% AI accuracy, ≥ 20% TDR, NPS ≥ 30, FTFR ≥ 70% | Q2 2026 + 30d |
| **Revenue Gate** | 3 → 4 | ≥ 2 paying PMs, ≥ 200 doors, 0 payment failures, ≥ 70% commission acceptance | Q2 2026 + 45d |
| **Repeatability Gate** | 4 → 5 | 2 proven channels (each ≥ 5 leads/mo × 2 months), < 30d sales cycle | Q3 2026 |
| **Team Gate** | 5 → 6 | Non-founder closes ≥ 1 deal at ≥ 50% of founder close rate | Q3 2026 |
| **Scale Gate** | 6 → 7 | < 500ms p95 at 10× load, ≥ 50 workers, 0 PIPL breaches | Q3 2026 |
| **Success Gate** | 7 → 8 | D30 retention ≥ 15%, churn < 5%, ≥ 80% PM weekly active | Q4 2026 |
| **Profit Gate** | 8 → 9 | First profitable month (revenue > all costs) | Q4 2026 |
| **Growth Gate** | 9 → 10 | ≥ 5,000 doors, ≥ 20% MoM revenue growth × 3 months, Haikou live | Q1 2027 |
| **Org Gate** | 10 → 11 | City ops manager autonomous ≥ 4 weeks, ≥ 10 SOPs, ≥ 80% self-serve worker onboarding | Q2 2027 |

---

## OKR Scoring Guide

| Score | Meaning | Action |
|---|---|---|
| **1.0** | Stretch goal fully achieved | Celebrate; set more ambitious targets |
| **0.7** | On-target; meaningful progress | Expected outcome; proceed to next stage |
| **0.4** | Partial progress; significant gaps | Root cause analysis; adjust tactics, keep objective |
| **0.0** | No meaningful progress | Pivot hypothesis or abandon objective |

> [!TIP]
> **Review cadence:** Score all active-stage OKRs biweekly. Gate criteria are scored monthly. Do not advance to the next stage until ALL gate criteria score ≥ 0.7.
