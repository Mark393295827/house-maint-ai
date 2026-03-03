# House Maint AI — Go-to-Market Plan

**Date:** 2026-03-01  
**Stage:** Pre-Launch (Sanya Beachhead)  
**Revenue Model:** Hybrid SaaS + Marketplace Transaction

---

## 1. Pricing Model

### 1.1 B2B SaaS (Property Managers / 二房东)

| Tier | Price | Includes | Target |
|---|---|---|---|
| **Starter** | ¥5/door/month | AI triage queue, tenant WeChat channel, monthly report | 10-50 doors |
| **Professional** | ¥10/door/month | + DIY guide library, responsibility assessment, SLA alerts | 50-300 doors |
| **Enterprise** | Custom | + API access, multi-building dashboard, priority support | 300+ doors |

- **Free Trial:** 30 days, 20 doors. No credit card required.
- **Annual Discount:** 2 months free (pay 10, get 12).

### 1.2 Marketplace Commission (Workers / 师傅)

| Component | Rate | Trigger |
|---|---|---|
| Job matching fee | 10% of job total | Charged to worker upon job completion |
| Escrow service fee | 2% (WeChat Pay processing) | Passed through to tenant/landlord |
| Priority listing (optional) | ¥50/week | Worker appears first in matching results |

### 1.3 Consumer (Tenants)
- **Free forever.** AI diagnosis, DIY guides, and issue reporting are never paywalled.
- Monetization flows through the B2B SaaS and worker commissions.

---

## 2. Channel Strategy

### 2.1 Primary: WeChat Ecosystem (80% of acquisition)

| Channel | Tactic | Cost |
|---|---|---|
| **QR Code Sticker Program** | Physical QR code stickers placed on apartment fridges/doors by property managers. Tenant scans → Mini Program. | ¥0.5/sticker |
| **WeChat Official Account** | Content marketing: "5 Maintenance Emergencies Every Sanya Tenant Should Know." Follow → Mini Program CTA. | ¥0 (organic) |
| **WeChat Moments Ads** | Geo-targeted to Sanya. "Your apartment is smarter than you think" creative. | ¥3-8 CPM |
| **Property Manager Referral** | PM gets 1 month free for every new PM they refer. | ¥500-1000/referral |

### 2.2 Secondary: Offline / B2B (20%)

| Channel | Tactic | Cost |
|---|---|---|
| **Sanya Property Manager Conference** | Sponsor a booth at the annual 物业管理 conference. Live demo of AI triage. | ¥10,000-20,000 |
| **Local Worker Union (师傅 Network)** | Partner with existing WeChat groups where workers find jobs. Offer free listings for first 3 months. | ¥0 |
| **Real Estate Agent Partnerships** | Bundle "Smart Maintenance" as a value-add for agents selling Sanya investment properties. | Revenue share |

---

## 3. Core Messaging (Per Persona)

### 3.1 For Tenants
> **"拍一张照，AI帮你搞定"** (Snap a photo, AI handles it)
- Instant diagnosis, no phone calls
- Verified workers, tracked ETA
- Fix it yourself with video guides

### 3.2 For Property Managers
> **"把15条微信消息变成一个优先队列"** (Turn 15 WeChat messages into one priority queue)
- 40% reduction in coordination time
- Automated fault assignment (landlord vs. tenant)
- Monthly reporting dashboard for owners

### 3.3 For Workers
> **"接单就是有图、有价、有地址"** (Every job comes with photos, price, and address)
- No more free estimate trips
- Pre-diagnosed jobs with material lists
- Instant WeChat Pay on completion

---

## 4. Competitive Pre-Mortem

> [!WARNING]
> These are the scenarios most likely to kill us. Each has a documented contingency.

| Threat | Probability | Impact | Contingency |
|---|---|---|---|
| **Meituan/Dianping launches a similar service** | High (60%) | Critical | Our moat is AI diagnosis + PIPL compliance. Meituan has marketplace but no AI triage. Race to 10,000 doors before they react. |
| **WeChat policy changes restrict Mini Programs** | Low (10%) | Critical | Maintain a responsive mobile web fallback. Never depend on Mini Program-only APIs. |
| **Workers refuse to pay 10% commission** | Medium (30%) | High | Reduce to 5% and monetize more aggressively on B2B SaaS. Commission is dispensable; SaaS is not. |
| **AI diagnosis accuracy stalls below 70%** | Medium (25%) | High | Implement mandatory human-in-the-loop review for all diagnoses. Use human corrections to retrain the model. |
| **Sanya market is too small to prove model** | Low (15%) | Medium | Pivot to Haikou (larger Hainan city) while maintaining Sanya operations. |
| **Fundraising fails** | Medium (40%) | High | Achieve profitability on Sanya SaaS alone (breakeven at ~3,000 doors). Bootstrap until unit economics prove out. |

---

## 5. Launch Milestones

| Milestone | Target Date | Gate |
|---|---|---|
| WeChat Mini Program MVP launch (Sanya) | Q2 2026 | 20 whitelisted workers, 85% AI accuracy |
| 100 tenant registrations | Q2 2026 + 30 days | Organic via QR stickers |
| 2 property manager pilot agreements | Q2 2026 + 45 days | LOI signed |
| 1,000 doors under management | Q3 2026 | SaaS revenue covering server costs |
| First profitable month | Q4 2026 | MRR > operational costs |
