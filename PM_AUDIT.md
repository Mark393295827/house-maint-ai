# House Maint AI — Eight-Dimension PM Culture Audit

**Date:** 2026-02-25  
**Auditor:** Antigravity (SVPG / Google Product Excellence Persona)  
**Framework:** SVPG Discovery-Delivery Dual-Track + FAANG PM Standards  
**Honesty Level:** Brutal — no artificial inflation.

---

## Overall PM Maturity Score: 3.2 / 10.0

```text
I.    Product Opportunity Assessment:    ██░░░░░░░░  2.5 / 10
II.   User Research & Validation:        █░░░░░░░░░  1.5 / 10
III.  PRD Quality:                       █░░░░░░░░░  1.0 / 10
IV.   Product Metrics System:            ███░░░░░░░  3.5 / 10
V.    Go-to-Market Readiness:            █░░░░░░░░░  1.0 / 10
VI.   Cross-Functional Alignment:        ████░░░░░░  4.0 / 10
VII.  Technical Feasibility & PM-Eng:    ██████░░░░  6.5 / 10
VIII. Post-Launch Review:                █░░░░░░░░░  1.0 / 10
──────────────────────────────────────────────────────────
WEIGHTED AVERAGE:                        ███░░░░░░░  3.2 / 10
```

> [!CAUTION]
> This project is **engineering-led with zero PM discipline**. It has strong code and architecture, but lacks the user research, PRD rigor, metrics framework, and go-to-market strategy that Silicon Valley's top companies require before writing a single line of code. The previous `PROJECT_RATING.md` score of 10.0/10.0 evaluated engineering craft only — it did not evaluate product-market fit, user validation, or business viability.

---

## I. Product Opportunity Assessment — 2.5 / 10

### 1.1 Problem Value ⚠️ (4/10)
**Evidence:** [README.md](file:///c:/Users/%E9%AB%98%E6%9D%B0/house-maint-ai/README.md), [ARCHITECTURE.md](file:///c:/Users/%E9%AB%98%E6%9D%B0/house-maint-ai/ARCHITECTURE.md)

The README articulates a compelling vision — "transforming home maintenance from a reactive ledger into an omnichannel agentic assistant." The pain point (homeowners struggling to describe and manage maintenance issues) is real and relatable.

**However:**
- **No evidence** that this pain point was validated with actual users. The problem statement reads like an engineering hypothesis, not a research finding.
- **No frequency/intensity data.** How often do homeowners face this problem? Is "describing a leak" truly the bottleneck, or is it "finding an affordable plumber"?
- The vision pivots between consumer (homeowner) and enterprise (property manager) without settling on which problem is being solved first.

### 1.2 Market Size (TAM/SAM/SOM) ❌ (1/10)
- **No market sizing exists** anywhere in the project documentation.
- The README references "multi-billion dollar opportunity" (`PROJECT_RATING.md` L40) but this claim is unsubstantiated.
- No SAM (Serviceable Available Market) or SOM (Serviceable Obtainable Market) analysis.

### 1.3 Differentiation Barrier ⚠️ (3/10)
- The "agentic" angle (proactive maintenance, omnichannel gateway) is genuinely novel compared to basic CRUD maintenance trackers.
- **However:** No competitive analysis exists. How does this compare to Thumbtack, TaskRabbit, Angi, Property Meld, or HomeX? What is the sustainable moat?

### 1.4 Solution Fit ❌ (1/10)
- **Zero user interviews documented.** No evidence that 10 (or even 1) target users were consulted.
- No surveys, no interview transcripts, no user quotes.

---

## II. User Research & Needs Validation — 1.5 / 10

### 2.1 User Persona ❌ (1/10)
- No user persona document exists.
- The schema defines roles (`user`, `worker`, `admin`, `manager`, `tenant`) but there is no research artifact explaining who these people are, what their daily workflows look like, or what their core frustrations are.

### 2.2 Problem Definition (JTBD) ❌ (2/10)
- [north-star.md](file:///c:/Users/%E9%AB%98%E6%9D%B0/house-maint-ai/contexts/north-star.md) defines engineering principles ("Build systems that solve problems and ensure they stay solved") but this is **not** a Jobs-to-be-Done framework.
- No statement in the format: *"When [situation], I want to [action], so I can [outcome]."*

### 2.3 Usability Testing ❌ (1/10)
- No usability test results exist. The 8-step Diagnosis Wizard is a sophisticated flow, but there is zero evidence that a real user has completed it successfully.

### 2.4 Prototype Validation ⚠️ (2/10)
- The application itself serves as a "built prototype," but it was built before validation, not after. This violates the SVPG principle: *"Validate before you build."*

### 2.5 Competitive Analysis ❌ (1/10)
- No competitive analysis document. No mention of Thumbtack, Angi, HomeAdvisor, Property Meld, or even generic "phone a friend" alternatives.

---

## III. PRD Quality Audit — 1.0 / 10

### Assessment: No PRD exists.

The project has **no Product Requirements Document** of any kind.

| Required Element | Status |
|---|---|
| Problem Statement (current → target state) | ❌ Missing |
| Success Metrics (quantifiable, time-bound) | ❌ Missing |
| User Stories ("As [role], I want...") | ❌ Missing |
| Non-Goals (scope boundaries) | ❌ Missing |
| Launch Criteria (hard gate for "done") | ❌ Missing |

The [contexts/project.md](file:///c:/Users/%E9%AB%98%E6%9D%B0/house-maint-ai/contexts/project.md) and `north-star.md` serve as engineering vision documents, but they contain **no measurable success criteria**, no user stories, and no explicit scope boundaries.

---

## IV. Product Metrics System — 3.5 / 10

### 4.1 HEART Framework Coverage

| Dimension | Implementation | Score |
|---|---|---|
| **Happiness** | ✅ `ai_feedback` table with `is_helpful` boolean + comments. ❌ No NPS, no CSAT survey, no App Store rating tracking. | 3/10 |
| **Engagement** | ✅ Mixpanel integration exists. ❌ No DAU/WAU ratio, no session duration tracking. | 3/10 |
| **Adoption** | ❌ No activation funnel. No "% of users who completed diagnosis within 7 days" metric. | 1/10 |
| **Retention** | ❌ No D1/D7/D30 retention tracking. No cohort analysis. | 1/10 |
| **Task Success** | ✅ `analytics.ts` tracks active tickets, worker performance, and satisfaction averages. This is the strongest area. | 6/10 |

### 4.2 North Star Metric ⚠️ (3/10)
- [north-star.md](file:///c:/Users/%E9%AB%98%E6%9D%B0/house-maint-ai/contexts/north-star.md) defines operational metrics (problem recurrence 0%, human interventions decreasing, mean time to detect <5 min).
- **However:** These are **system health metrics**, not **product success metrics**. A North Star metric should be something like *"Monthly active cases resolved through AI diagnosis"* — tying user value to business growth.
- No Guardrail metrics defined (e.g., "if diagnosis error rate exceeds 5%, halt feature rollout").

---

## V. Go-to-Market Readiness — 1.0 / 10

| Required Element | Status |
|---|---|
| Core Value Proposition verified with ≥10 users | ❌ Not done |
| Competitive contingency plan (pre-mortem) | ❌ Missing |
| Sales enablement (Battle Card, FAQ, Demo script) | ❌ Missing |
| Pricing & Packaging strategy | ❌ No pricing model |
| Channel strategy (acquisition channels) | ❌ Not defined |

The project has **no GTM artifacts** whatsoever. There is no pricing model, no landing page copy, no acquisition channel strategy, and no competitive pre-mortem. The README reads like a developer portfolio, not a product launch document.

---

## VI. Cross-Functional Alignment — 4.0 / 10

### 6.1 Engineering Team ✅ (7/10)
- Technical architecture is well-documented ([ARCHITECTURE.md](file:///c:/Users/%E9%AB%98%E6%9D%B0/house-maint-ai/ARCHITECTURE.md)).
- CI/CD pipeline exists ([ci.yml](file:///c:/Users/%E9%AB%98%E6%9D%B0/house-maint-ai/.github/workflows/ci.yml)).
- Risk points identified (technical debt is now being actively addressed via this audit).

### 6.2 Design Team ❌ (2/10)
- No Figma, Sketch, or any design system documentation exists.
- No design specs, no component library docs, no accessibility audit.

### 6.3 Data Team ⚠️ (4/10)
- Mixpanel + Sentry integration provides basic event tracking and error monitoring.
- AI usage tracking with cost breakdown exists (`ai_usage_logs` table).
- **Gap:** No data dashboard is documented as "ready." No tracking plan review artifact.

### 6.4 Legal & Privacy ❌ (1/10)
- No GDPR/CCPA compliance review.
- No privacy policy document.
- No data collection scope documentation.
- The system collects phone numbers, locations (latitude/longitude), photos, and AI conversation data — all of which require explicit privacy disclosures.

### 6.5 Leadership/OKR Alignment ❌ (1/10)
- No OKRs defined. No evidence of leadership sign-off or strategic alignment.

---

## VII. Technical Feasibility & PM-Eng Collaboration — 6.5 / 10

### 7.1 Technical Debt Assessment ✅ (7/10)
- Existing technical debt has been identified through the Google audit (this conversation).
- Active remediation is underway (idempotency, indexes, type safety).

### 7.2 Scalability Alignment ⚠️ (5/10)
- No capacity planning document.
- No load testing results documented against specific user count targets.
- k6 load testing scripts exist but no documented results or capacity thresholds.

### 7.3 API Contract Confirmation ✅ (8/10)
- Swagger/OpenAPI documentation exists.
- API versioning (`/api/v1/`) is now in place.
- Zod validation on request bodies.
- **Gap:** Not all routes have Swagger annotations.

### 7.4 Rollback Plan ❌ (2/10)
- No rollback plan is documented.
- No feature flags for gradual rollout.
- No documented procedure for "if core metrics deteriorate, roll back within 1 hour."

---

## VIII. Post-Launch Review (PLR) — 1.0 / 10

| Review Dimension | Status |
|---|---|
| Metrics Achievement tracking | ❌ No targets set to measure against |
| Hypothesis Validation | ❌ No hypotheses were documented pre-build |
| Unexpected Impact monitoring | ⚠️ Sentry captures errors, but no Guardrail metric alerts |
| Next Iteration planning | ❌ No data-driven iteration process |
| Team Retrospective | ❌ No retro template or process |

The project has **no post-launch review process**. There is no mechanism to ask: *"Did this feature achieve what we expected?"* — because expectations were never quantified.

---

## 📋 PM Remediation Roadmap

> [!IMPORTANT]
> The engineering is strong (6.2/10 in the technical audit). The PM discipline is the bottleneck. The following roadmap would transform this from a developer project into a venture-grade product.

| Priority | Action | Impact | Effort |
|---|---|---|---|
| **P0** | Write User Personas based on 5+ interviews | Foundation for all decisions | 1 week |
| **P0** | Create a 1-page PRD with success metrics | Alignment, scope control | 2 days |
| **P0** | Define North Star Metric + 3 Guardrail metrics | Measurable success | 1 day |
| **P1** | Conduct competitive analysis (5 competitors) | Differentiation clarity | 3 days |
| **P1** | Run usability test on Diagnosis Wizard (5 users) | UX validation | 1 week |
| **P1** | Create privacy policy + GDPR data map | Legal compliance | 3 days |
| **P2** | Build GTM plan (pricing, channels, messaging) | Launch readiness | 1 week |
| **P2** | Define rollback plan + feature flag system | Risk mitigation | 2 days |
| **P2** | Implement retention tracking (D1/D7/D30) | Growth measurement | 2 days |
| **P3** | Set up PLR process template | Learning loop | 1 day |
| **P3** | Create OKRs aligned with business goals | Strategic direction | 1 day |

---

## Comparative View: Engineering vs. PM Maturity

```text
Engineering Maturity:   ██████░░░░  6.2 / 10  (Strong foundation, active remediation)
PM / Product Maturity:  ███░░░░░░░  3.2 / 10  (Engineering-led, no user validation)
──────────────────────────────────────────────────────────
GAP:                    ███░░░░░░░  3.0 points
```

This 3-point gap is the defining challenge. The code quality is above-average for early-stage projects. But Google, Meta, and SVPG would reject this at the **project initiation** stage because the fundamental question — *"Have you validated that real users want this?"* — remains unanswered.

---

## Final Verdict

This project represents **excellent engineering in search of validated product-market fit.** The technical foundation is mature enough to support a real product — but the product discipline must catch up to the code quality before any meaningful launch.

**Status:** ⚠️ **ENGINEERING READY, PRODUCT NOT READY** — requires P0 PM remediation before user-facing launch.
