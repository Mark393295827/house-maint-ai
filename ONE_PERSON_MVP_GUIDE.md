# One-Person Company MVP Guide: House Maint AI

**Build a profitable solo business in 30 days with <$500 initial investment**

---

## Executive Summary

This guide transforms House Maint AI from a full-stack enterprise application into a **minimal viable product** that one person can build, launch, and operate profitably.

**Key Principles:**
- Ship in 30 days, not 6 months
- Validate before you build
- Automate everything you can't manually do at scale
- Focus on the ONE feature that matters

---

## 1. Identify Your ONE Core Feature

### Current Features (Full Platform)
| Feature | Build Time | Solo Maintainable? | Revenue Impact |
|---------|------------|-------------------|----------------|
| AI Diagnosis | 3 days | Yes | **HIGH** |
| Worker Matching | 2 weeks | Difficult | Medium |
| User Auth | 2 days | Yes | Low |
| Voice/Video Reports | 1 week | No | Low |
| Community Forum | 2 weeks | No | Low |
| Calendar/Booking | 1 week | Difficult | Medium |
| Worker Profiles | 1 week | Difficult | Medium |

### MVP Decision: **AI Home Diagnosis Tool Only**

**Why this feature?**
1. **Unique differentiator** - Competitors don't have it
2. **Standalone value** - Users pay for diagnosis alone
3. **No marketplace chicken-and-egg** - No workers needed
4. **API-driven** - Gemini does the heavy lifting
5. **Viral potential** - "Look what AI found wrong with my house!"

**What you're building:**
> Upload a photo of any home issue → Get instant AI diagnosis with repair instructions, cost estimate, and severity rating.

---

## 2. Minimal MVP Tech Stack

### Option A: No-Code (Fastest - 1 Week)

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│  Carrd.co ($19/yr) or Framer ($15/mo)               │
│  - Landing page                                      │
│  - Payment link (Stripe/Gumroad)                    │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                   AUTOMATION                         │
│  Make.com or Zapier ($20/mo)                        │
│  - Receive form submission                          │
│  - Call Gemini API                                  │
│  - Email results to user                            │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                    AI ENGINE                         │
│  Google Gemini API (Pay-per-use)                    │
│  - ~$0.002 per diagnosis                            │
└─────────────────────────────────────────────────────┘

Monthly Cost: ~$35-50
Build Time: 3-7 days
```

### Option B: Low-Code (Balanced - 2 Weeks)

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│  Bubble.io ($32/mo)                                 │
│  - Full web app with auth                           │
│  - Image upload                                     │
│  - Results display                                  │
│  - User dashboard                                   │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                    BACKEND                           │
│  Bubble's built-in + API Connector                  │
│  - Gemini API integration                           │
│  - Stripe for payments                              │
│  - SendGrid for emails                              │
└─────────────────────────────────────────────────────┘

Monthly Cost: ~$50-80
Build Time: 10-14 days
```

### Option C: Simplified Code (From Current Repo)

Strip down existing codebase to essentials:

```
house-maint-ai-mvp/
├── index.html              # Single page app
├── style.css               # Tailwind CDN
├── app.js                  # Vanilla JS (~200 lines)
└── api/
    └── diagnose.js         # Vercel serverless function

Hosting: Vercel (Free tier)
Database: None needed (stateless)
Auth: None needed (pay-per-use model)

Monthly Cost: $0-20
Build Time: 2-3 days (you already have the code!)
```

**Recommended: Option C** - You already have working code. Just strip it down.

---

## 3. Stripped-Down MVP Architecture

### From Current Codebase, Keep ONLY:

```javascript
// KEEP: server/routes/ai.ts (core diagnosis logic)
// KEEP: src/services/ai.ts (Gemini integration)
// KEEP: One simple upload form

// DELETE EVERYTHING ELSE:
// - User authentication
// - Worker matching
// - Reports system
// - Community features
// - PostgreSQL/Redis
// - S3 storage (use base64 or temporary)
// - Rate limiting (Stripe handles abuse)
// - Complex middleware
```

### Simplified API (Single Endpoint)

```typescript
// api/diagnose.ts - Vercel Serverless Function
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image } = req.body; // base64 image

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Analyze this home maintenance issue. Provide:
  1. Problem identified
  2. Severity (1-5)
  3. Estimated repair cost
  4. DIY difficulty (easy/medium/hard)
  5. Step-by-step repair guide
  6. Safety warnings
  7. When to call a professional

  Format as JSON.`;

  const result = await model.generateContent([
    prompt,
    { inlineData: { data: image, mimeType: "image/jpeg" } }
  ]);

  return res.json(JSON.parse(result.response.text()));
}
```

### Simple Frontend (Single HTML File)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Home Repair AI - Instant Diagnosis</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen">
  <div class="max-w-md mx-auto p-6">
    <h1 class="text-2xl font-bold mb-4">🏠 Home Repair AI</h1>
    <p class="mb-4">Upload a photo of any home issue for instant AI diagnosis</p>

    <input type="file" id="photo" accept="image/*" class="mb-4">
    <button onclick="diagnose()" class="bg-blue-500 text-white px-4 py-2 rounded">
      Diagnose ($0.99)
    </button>

    <div id="result" class="mt-6"></div>
  </div>

  <script>
    async function diagnose() {
      const file = document.getElementById('photo').files[0];
      const base64 = await toBase64(file);

      // Stripe Checkout redirect (or simple payment link)
      // After payment success, call API

      const res = await fetch('/api/diagnose', {
        method: 'POST',
        body: JSON.stringify({ image: base64 })
      });

      const data = await res.json();
      document.getElementById('result').innerHTML = formatResult(data);
    }
  </script>
</body>
</html>
```

---

## 4. Revenue Model (Solo-Optimized)

### Pricing Strategy

| Model | Price | Pros | Cons |
|-------|-------|------|------|
| **Pay-per-diagnosis** | $0.99-2.99 | Simple, low friction | Irregular revenue |
| **Credit packs** | $9.99/10 credits | Better margins | Slight friction |
| **Subscription** | $4.99/mo unlimited | Predictable MRR | Needs retention |

**Recommended: Start with pay-per-diagnosis ($1.99)**

### Unit Economics (Solo)

```
Revenue per diagnosis: $1.99
├── Stripe fees (2.9% + $0.30): -$0.36
├── Gemini API cost: -$0.002
├── Vercel (free tier): $0.00
└── Net profit per diagnosis: $1.63 (82% margin)

Break-even:
- Your time investment: ~40 hours
- Value your time at: $50/hr = $2,000 investment
- Break-even diagnoses: 1,227 ($2,000 ÷ $1.63)
- At 10 diagnoses/day = 4 months to break-even
- At 50 diagnoses/day = 25 days to break-even
```

### Revenue Targets (Realistic Solo)

| Month | Daily Users | Revenue | Cumulative |
|-------|-------------|---------|------------|
| 1 | 5 | $300 | $300 |
| 2 | 15 | $900 | $1,200 |
| 3 | 30 | $1,800 | $3,000 |
| 6 | 100 | $6,000 | $18,000 |
| 12 | 300 | $18,000 | $90,000 |

**Year 1 Target: $50K-$100K revenue as solopreneur**

---

## 5. 30-Day Launch Plan

### Week 1: Build MVP (Days 1-7)

| Day | Task | Time |
|-----|------|------|
| 1 | Set up Vercel + Gemini API | 2 hrs |
| 2 | Build diagnose API endpoint | 3 hrs |
| 3 | Create simple landing page | 3 hrs |
| 4 | Integrate Stripe payment | 2 hrs |
| 5 | Test 20 different home issues | 2 hrs |
| 6 | Fix edge cases, improve prompts | 3 hrs |
| 7 | Deploy, test payment flow end-to-end | 2 hrs |

**Deliverable:** Working product at homerepair.ai (or similar)

### Week 2: Validate Demand (Days 8-14)

| Day | Task | Time |
|-----|------|------|
| 8-9 | Create 5 demo diagnosis videos | 3 hrs |
| 10 | Post to Reddit (r/homeimprovement, r/DIY) | 1 hr |
| 11 | Share in Facebook home repair groups | 1 hr |
| 12 | Cold outreach to 10 home bloggers | 2 hrs |
| 13 | Analyze first user feedback | 1 hr |
| 14 | Iterate on UX based on feedback | 2 hrs |

**Validation Target:** 50 paying users in Week 2

### Week 3: Optimize & Grow (Days 15-21)

| Day | Task | Time |
|-----|------|------|
| 15-16 | SEO: Create 10 "how to fix X" blog posts | 4 hrs |
| 17 | Set up email capture for non-converters | 1 hr |
| 18 | Create TikTok/YouTube Short demos | 2 hrs |
| 19 | Reach out to home warranty influencers | 2 hrs |
| 20 | Add "share diagnosis" viral feature | 2 hrs |
| 21 | Analyze metrics, double down on what works | 1 hr |

### Week 4: Scale What Works (Days 22-30)

| Day | Task | Time |
|-----|------|------|
| 22-23 | Create content on best-performing channel | 4 hrs |
| 24 | Add credit pack option if demand is there | 2 hrs |
| 25 | Set up automated email drip campaign | 2 hrs |
| 26-27 | Guest post on 3 home improvement blogs | 4 hrs |
| 28 | Analyze monthly metrics | 1 hr |
| 29 | Plan Month 2 based on data | 2 hrs |
| 30 | Celebrate or pivot | 🎉 |

---

## 6. Solo Operations Playbook

### Daily Tasks (30 min/day)

```
Morning (15 min):
□ Check Stripe dashboard for new sales
□ Review any customer support emails
□ Check error logs (Vercel dashboard)

Evening (15 min):
□ Post 1 piece of content (social/blog)
□ Respond to comments/DMs
□ Log metrics in spreadsheet
```

### Weekly Tasks (2 hrs/week)

```
□ Analyze conversion funnel
□ Improve AI prompt based on feedback
□ Create 1 blog post or video
□ Review and optimize ad spend (if any)
□ Backup any critical data
```

### Monthly Tasks (4 hrs/month)

```
□ Full metrics review (revenue, users, churn)
□ Competitive analysis
□ Feature prioritization for next month
□ Financial review (costs, taxes)
□ Plan content calendar
```

### Automation Stack

| Task | Tool | Cost |
|------|------|------|
| Customer support | Crisp.chat | Free |
| Email marketing | Buttondown | $9/mo |
| Social scheduling | Buffer | Free |
| Analytics | Plausible | $9/mo |
| Invoicing | Stripe | Included |
| Error monitoring | Sentry | Free tier |

**Total automation cost: ~$20/month**

---

## 7. Customer Acquisition (Zero Budget)

### Organic Channels (Ranked by ROI)

#### 1. SEO Content (Highest ROI)
Create pages targeting:
- "how to fix [specific issue]" (100+ variations)
- "is [problem] serious"
- "[issue] repair cost"

**Example articles:**
- "Is This Crack in My Wall Serious? AI Analysis"
- "Water Stain on Ceiling: Causes and Fixes"
- "Electrical Outlet Sparking: What to Do"

#### 2. Reddit/Forums
- r/homeimprovement (2.6M members)
- r/DIY (22M members)
- r/homeowners (290K members)
- r/FirstTimeHomeBuyer (190K members)

**Strategy:** Provide genuine help, mention tool naturally.

#### 3. TikTok/YouTube Shorts
- "I asked AI to diagnose my home problems"
- Before/after diagnosis reveals
- Satisfying repair content

#### 4. Facebook Groups
- Local home repair groups
- New homeowner groups
- DIY communities

### Paid Channels (When Profitable)

| Channel | CPA Target | Notes |
|---------|------------|-------|
| Google Ads | <$2 | High intent searches |
| Facebook | <$3 | Homeowner targeting |
| Reddit Ads | <$2 | Specific subreddits |

---

## 8. When to Expand Beyond MVP

### Signals to Add Features

| Signal | Threshold | Next Feature |
|--------|-----------|--------------|
| Users asking for worker referrals | 20+ requests | Add contractor directory |
| Users want to save diagnoses | 50+ requests | Add user accounts |
| Repeat usage per user | 3+ per user | Add subscription tier |
| Revenue | $5K MRR | Hire part-time support |

### Growth Path

```
Stage 1 (Now): AI Diagnosis Only
├── Revenue: $0-5K MRR
├── Users: 0-1,000
└── Team: Just you

Stage 2 (Month 6+): Add Premium Features
├── Revenue: $5-20K MRR
├── Add: Saved diagnoses, subscription, mobile app
└── Team: You + VA for support

Stage 3 (Year 1+): Marketplace Lite
├── Revenue: $20-50K MRR
├── Add: Contractor directory (not booking)
└── Team: You + 1-2 contractors

Stage 4 (Year 2+): Full Platform
├── Revenue: $50K+ MRR
├── Rebuild with full features from original codebase
└── Team: Consider funding or bootstrapped growth
```

---

## 9. Cost Comparison

### Current Full Platform
```
Monthly operating costs:
├── Vercel Pro: $20
├── PostgreSQL (Supabase): $25
├── Redis (Upstash): $10
├── S3 Storage: $10
├── Sentry: $26
├── Domain: $1
├── Gemini API: $20
└── Total: ~$112/month

Plus development time: 200+ hours
```

### Minimal MVP
```
Monthly operating costs:
├── Vercel: $0 (free tier)
├── Database: $0 (not needed)
├── Gemini API: $5-20
├── Domain: $1
└── Total: ~$6-21/month

Development time: 20-40 hours
```

**Savings: $90+/month, 160+ hours**

---

## 10. Risk Mitigation

### Technical Risks

| Risk | Mitigation |
|------|------------|
| Gemini API down | Cache common diagnoses, show "try again" |
| Gemini API price increase | Budget buffer, alternative models (Claude, GPT-4) |
| Vercel limits | Monitor usage, upgrade when profitable |

### Business Risks

| Risk | Mitigation |
|------|------------|
| Low demand | Validate with $0 before building |
| Competition copies | Speed to market, build audience |
| Legal (misdiagnosis) | Clear disclaimers, no guarantees |

### Disclaimer Template

```
DISCLAIMER: This AI-powered tool provides general guidance only and
is not a substitute for professional inspection. Results are estimates
based on image analysis. Always consult a licensed contractor for
accurate diagnosis and repairs. We are not liable for any decisions
made based on this tool's output.
```

---

## 11. Quick Start Checklist

### Today (2 hours)
- [ ] Sign up for Gemini API ($0)
- [ ] Sign up for Vercel ($0)
- [ ] Register domain (~$12/year)
- [ ] Set up Stripe account ($0)

### This Week (20 hours)
- [ ] Deploy MVP from stripped codebase
- [ ] Test with 10 real home issue photos
- [ ] Set up payment flow
- [ ] Create landing page with clear value prop
- [ ] Write 3 demo diagnosis examples

### Launch Day
- [ ] Post to Reddit r/homeimprovement
- [ ] Share in 3 Facebook groups
- [ ] Tell 10 friends who own homes
- [ ] Set up basic analytics

### Success Metrics (Month 1)
- [ ] 50+ paying customers
- [ ] $100+ revenue
- [ ] <5% refund rate
- [ ] 3+ organic testimonials

---

## 12. Resources

### Tools
- **Gemini API:** https://ai.google.dev/
- **Vercel:** https://vercel.com
- **Stripe:** https://stripe.com
- **Plausible Analytics:** https://plausible.io
- **Crisp Chat:** https://crisp.chat

### Learning
- [Nucamp - Building MVP for Solo AI Startup](https://www.nucamp.co/blog/solo-ai-tech-entrepreneur-2025-building-a-minimum-viable-product-mvp-for-your-solo-ai-startup-with-limited-resources)
- [Two Cents - Solopreneur SaaS Expectations](https://www.twocents.software/blog/solopreneur-saas-realistic-expectations-for-one-person-ops/)
- [Superframeworks - Micro SaaS Ideas](https://superframeworks.com/blog/solopreneur-ideas)

### Communities
- Indie Hackers (indiehackers.com)
- r/SaaS
- r/EntrepreneurRideAlong

---

## Summary: Your 30-Day Action Plan

| Week | Focus | Outcome |
|------|-------|---------|
| 1 | Build | Working MVP deployed |
| 2 | Validate | 50 paying users |
| 3 | Optimize | Improved conversion |
| 4 | Scale | Repeatable growth channel |

**Total Investment:**
- Time: 40 hours
- Money: <$100

**Potential Outcome:**
- Month 1: $300-500
- Month 6: $3,000-6,000/month
- Year 1: $50,000-100,000

---

*"The best MVP is the one that's shipped. Ship today, improve tomorrow."*

---

**Next Step:** Run this command to create your MVP folder structure:

```bash
mkdir -p house-maint-mvp/api
cd house-maint-mvp
# Then copy the simplified code from Section 3
```
