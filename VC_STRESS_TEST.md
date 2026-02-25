# House Maint AI — VC Stress Test (Investability Audit)

**Date:** 2026-02-25  
**Auditor:** Antigravity (Tier-1 VC Due Diligence Persona)  
**Honesty Level:** Sand Hill Road brutal. No courtesy passes.

---

## Pre-Assessment: Core Positioning Answers

Before scoring, I must answer the three questions the user's framework requires, based on exhaustive codebase evidence:

| Question | Honest Answer |
|---|---|
| **One-Sentence Core Positioning** | "An AI-powered home maintenance assistant that uses Gemini Vision to diagnose household issues via photos and matches homeowners with repair workers." |
| **Current Business Model** | **Undefined.** Stripe integration exists for per-job payments (session-based checkout), but there is no subscription tier, no SaaS pricing page, no commission model, and no documented revenue strategy. |
| **Current Traction** | **Prototype (Demo) stage.** The application is functional locally with SQLite fallback, but has zero real users, zero paying customers, no production deployment, and no analytics data beyond test seeds. |

---

## Overall Investability Score: 2.0 / 10.0

```text
Dimension 1:  10x Value & Moat:           ██░░░░░░░░  2.5 / 10
Dimension 2:  Market Ceiling & Ecosystem:  ███░░░░░░░  3.0 / 10
Dimension 3:  Unit Economics & GTM:        █░░░░░░░░░  1.0 / 10
Dimension 4:  Founder DNA & Integrity:     ██░░░░░░░░  2.0 / 10
───────────────────────────────────────────────────────────
INVESTABILITY SCORE:                       ██░░░░░░░░  2.0 / 10
```

> [!CAUTION]
> **Verdict: NOT INVESTABLE in current state.** This is a well-engineered prototype with no validated market, no revenue model, no user traction, and critical moat fragility. The analysis below explains why, with specific remediation paths.

---

## Dimension 1: 10x Value & Moat — 2.5 / 10

### The 10x Claim Under Scrutiny

The product claims to transform home maintenance from "reactive" to "proactive" and "agentic." Let's stress-test this:

**Current user journey without House Maint AI:**
1. Homeowner sees a leak → Takes a photo → Texts it to a friend/contractor → Gets advice → Calls a plumber

**User journey WITH House Maint AI:**
1. Homeowner sees a leak → Takes a photo → Uploads to app → AI diagnoses → App matches a worker → Pays via Stripe

**Honest delta:** The AI diagnosis replaces "texting a friend." The worker matching replaces "Googling a plumber." This is a **2x improvement at best**, not 10x. The core friction in home maintenance isn't *description* — it's *trust, price transparency, and scheduling*.

### Resistance to Deconstruction ❌ (2/10)

This is the most critical weakness:

| Moat Layer | Status | Verdict |
|---|---|---|
| **Proprietary AI** | ❌ Uses Google Gemini API directly. Zero fine-tuning, zero proprietary training data. | **Wrapper risk.** Google could ship "Gemini for Home" tomorrow. |
| **Proprietary Workflows** | ⚠️ The 8-step Diagnosis Wizard is interesting but trivially replicable by any developer with access to the same Gemini API. | **No defensibility.** |
| **Data Network Effects** | ❌ The `patterns` table stores AI learning data, but with zero users, there is zero data. Even with users, the data volume from residential maintenance is too low-frequency to create meaningful network effects. | **No data moat.** |
| **Switching Costs** | ❌ Users have no lock-in. No historical data that would be painful to migrate. No integrations with smart home devices. | **Zero switching costs.** |

**The brutal truth:** If Thumbtack, Angi, or TaskRabbit add a "photo diagnosis" feature (which they will, given the AI trend), this product has no reason to exist. The entire product is a Gemini Vision wrapper with a CRUD backend.

### Ecosystem Dependency Risk ❌ (2/10)

| Dependency | Risk Level |
|---|---|
| **Google Gemini API** | 🔴 CRITICAL — Core value proposition collapses if Google raises prices, changes API, or rate-limits. No fallback model is production-proven (DeepSeek integration exists but is documented as experimental). |
| **Stripe** | 🟡 MODERATE — Standard payment dependency, acceptable. |
| **PostgreSQL / Redis** | 🟢 LOW — Standard, replaceable infrastructure. |

---

## Dimension 2: Market Ceiling & Ecosystem — 3.0 / 10

### TAM Analysis (Constructed from Evidence)

The product sits at the intersection of **PropTech** and **AI assistants**:

| Market Layer | Estimated Size | Realistic Capture |
|---|---|---|
| **TAM** (Global home services) | ~$600B | N/A — meaningless for a single app |
| **SAM** (AI-assisted home maintenance, developed markets) | ~$5B | Optimistic ceiling |
| **SOM** (Chinese urban homeowners using AI diagnosis, Year 1) | ~$2M | Realistic with aggressive marketing |

The SAM is real but the SOM is microscopic. This is because:

### Survival Space Under Giant Pressure ❌ (2/10)

- **Google:** Already ships Gemini-powered home assistance in Google Home. If they add "photograph your broken appliance" to the Google Home app (which is trivial), this product is dead.
- **ByteDance/Douyin:** Douyin already has home repair service marketplaces with video-based diagnosis. They have 700M+ users. They will add AI diagnosis before this product reaches 1,000 users.
- **Alibaba (闲鱼/淘宝):** Already connects homeowners with repair workers. Adding AI triage is a weekend sprint for their team.

**The existential question:** What happens when giants give this feature away for free? The honest answer: this product has no response.

### Painkiller vs. Vitamin ⚠️ (4/10)

Home maintenance is a genuine pain point with real urgency (burst pipes, electrical failures, broken HVAC). This is closer to "painkiller" territory than "vitamin."

**However:** The specific feature being offered (AI photo diagnosis) is a vitamin, not a painkiller. The painkiller is "getting a trustworthy, affordable repair done quickly." Photo diagnosis is a nice-to-have step along the way.

---

## Dimension 3: Unit Economics & GTM — 1.0 / 10

### CAC/LTV Analysis ❌ (1/10)

**This cannot be evaluated because no revenue model exists.**

| Metric | Value |
|---|---|
| Revenue model | ❌ Undefined |
| Pricing page | ❌ Doesn't exist |
| Current MRR | $0 |
| Current users | 0 |
| CAC | Unknown (no acquisition channel) |
| LTV | Unknown (no retention data) |
| CAC:LTV ratio | N/A |

The Stripe integration charges per-job, but there's no documented take rate (commission percentage), no subscription tier, and no willingness-to-pay research.

### Natural Growth Engine ❌ (1/10)

| PLG Indicator | Status |
|---|---|
| Viral loop (user invites user) | ❌ No sharing, no referral system |
| Collaboration mechanism | ❌ Single-user experience |
| Free tier that creates demand | ❌ No freemium model defined |
| Community/marketplace flywheel | ⚠️ `posts` table exists but community features are minimal |

The product has **zero PLG DNA**. Home maintenance is inherently low-frequency (2-5 times per year for average homeowners), which makes viral growth extremely difficult. This is not Figma or Slack — there's no daily use case to drive organic adoption.

---

## Dimension 4: Founder DNA & Intellectual Integrity — 2.0 / 10

### Cognitive Blind Spots ❌ (2/10)

The `PROJECT_RATING.md` document is the primary evidence here, and it reveals a significant intellectual integrity concern:

| Self-Assessment (PROJECT_RATING.md) | Reality (This Audit) |
|---|---|
| "10.0 / 10.0 — Agentic Supremacy" | Engineering: 6.2/10, PM: 3.2/10, Investability: 2.0/10 |
| "SERIES A READY" | Zero users, zero revenue, zero validation |
| "multi-billion dollar opportunity" | No TAM/SAM/SOM analysis |
| "ACQUIRE / INVEST" | Not investable in current state |

The gap between self-perception ("10/10, Series A ready") and reality (pre-seed prototype with no users) is the most concerning finding. Top VCs call this **"founder reality distortion"** — and it's a dealbreaker because it signals:
1. Inability to identify real weaknesses
2. Resistance to market feedback
3. Risk of building in isolation without user input

### Learning Agility ⚠️ (3/10)

**Positive signal:** The fact that this VC stress test was requested at all shows self-awareness and willingness to receive hard feedback.

**Concerning signal:** The codebase shows 14+ months of development with zero user validation touchpoints. The ability to pivot quickly is theoretical — no evidence of previous pivots or hypothesis invalidation exists.

---

## 🚨 Core Improvement Suggestions (VC Remediation)

### Tier 1: Existential (Must-Fix Before Any Investment Conversation)

1. **Kill the "10/10" delusion.** Rewrite `PROJECT_RATING.md` with honest metrics. VCs will Google your repo. If they see "10/10, Series A Ready" with zero users, the meeting ends instantly.

2. **Define the business model.** Choose one:
   - **Marketplace commission:** 15-25% take rate on worker payments (Thumbtack model)
   - **SaaS subscription:** Monthly fee for property managers (Property Meld model)
   - **Freemium + premium diagnosis:** Free basic AI, paid deep analysis
   
   Write it down. Price it. Test it with 10 potential customers.

3. **Find 10 real users in 2 weeks.** Deploy the app, even on a free tier. Get 10 homeowners or property managers to use it. Document their feedback. This single action would raise the investability score by 3+ points.

### Tier 2: Strategic (Pre-Seed Readiness)

4. **Build a real moat.** The AI wrapper is not a moat. Consider:
   - **Proprietary dataset:** Partner with a property management company to get historical maintenance data for fine-tuning
   - **IoT integration:** Connect to smart home sensors (water leak detectors, HVAC monitors) for truly proactive alerts — this is 10x, not 2x
   - **Contractor network lock-in:** Build an exclusive contractor network with quality guarantees and verified reviews

5. **Reduce Gemini dependency.** Implement model-agnostic inference. If Gemini API costs 10x tomorrow, can you switch to Claude or a self-hosted Llama variant within 48 hours?

6. **Pick a beachhead.** Stop oscillating between "homeowner app" and "property manager SaaS." Pick one. SVPG says: *"If you try to serve everyone, you serve no one."*

### Tier 3: Fundraising Preparation

7. **Build a 10-slide pitch deck** with: Problem → Market → Product → Traction → Business Model → Team → Ask
8. **Define 3-month milestones** that prove PMF (e.g., "50 active users with 30% monthly retention")
9. **Create a competitive landscape map** showing where you sit vs. Thumbtack, Angi, Property Meld, and generic AI assistants

---

## The Honest Bottom Line

```text
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   This is a STRONG ENGINEERING PROTOTYPE                │
│   masquerading as a VENTURE-SCALE BUSINESS.             │
│                                                         │
│   The code is real. The product is real.                 │
│   The business is not.                                  │
│                                                         │
│   Fix the business, and the engineering                 │
│   becomes a genuine competitive advantage.              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Path from 2.0 → 6.0 (Investable):**
1. Get 10 real users (2 weeks)
2. Define revenue model + pricing (3 days)
3. Build one proprietary moat (IoT/data/network) (2 months)
4. Document honest metrics and competitive position (1 week)

The engineering talent is obvious. The intellectual honesty to request this audit is a positive signal. The gap is entirely in product discipline and market validation — and that gap is closable.
