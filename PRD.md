# Product Requirements Document (PRD) v1.0
**Project:** House Maint AI (WeChat Native Pivot)
**Last Updated:** February 2026
**Target Market:** Urban Mainland China (Tier 1 & Tier 2 cities)

---

## 1. Executive Summary
House Maint AI is pivoting from a generic global AI wrapper into a hyper-localized B2B2C maintenance matching platform built exclusively inside the WeChat ecosystem. It targets the **Sanya** market (absentee owners, highly corrosive environments) by solving the lack of trust and coordination friction between Chinese property managers (物业 / 二房东), tenants natively reporting issues, and independent master repair workers (师傅).

---

## 2. Core Personas
1. **The Frazzled Tenant (B2C Origin):** Reports leaks/broken appliances via WeChat. Needs immediate reassurance and a diagnosis without downloading an app. 
2. **The "Er-Fang-Dong" / Property Manager (B2B SaaS Target):** Manages 50-500 apartments. Hates endless WeChat coordination messages. Needs automated triage and a clear record of who is at fault (landlord vs. tenant damage).
3. **The Local "Shifu" Worker (Labor Supply):** Does not speak English, rarely downloads new apps. Needs jobs pushed directly to their WeChat notifications with clear photos and pre-diagnosed scope to avoid free on-site quoting trips.

---

## 3. Product Principles (The 18-Month Moat)
- **Zero App Downloads:** The entire product surface area exists within a WeChat Mini Program and Official Account notifications.
- **"Free Diagnosis, Charge on Repair":** AI visual/voice diagnostics are free hooks; the platform monetizes on closing the loop with a physical fix.
- **PIPL Data Supremacy:** Personal data never leaves mainland China. Photos are auto-blurred locally before hitting third-party AI models.
- **Edge AI & AR Future:** The platform is building towards edge inference on smart home cameras (Xiaomi/Ezviz) and AR (Augmented Reality) overlays for visual triage.

---

## 4. Key Workflows

### 4.1 Ticket Creation (Tenant Flow)
1. Tenant scans a QR code stuck on their apartment fridge linking to the WeChat Mini-Program.
2. Tenant authorizes login (1-click WeChat OpenID).
3. Tenant uploads a photo, records a video, or records a quick voice message (e.g., "The pipe under the sink is leaking really fast"). *(Future: Real-time AR scanning)*
4. **Backend:** PIPL middleware blurs faces -> payload hits DeepSeek Vision -> returns structured JSON (Severity: DIY/48h/Emergency, Category, Hypothesis).

### 4.2 Triage & Deflection (Property Manager / Absentee Owner Flow)
1. Property manager dashboard highlights the incoming ticket with an AI severity tag.
2. If it's a simple fix (e.g., resetting a breaker), AI sends a WeChat template message with a video guide directly to the tenant's phone.
3. **IoT Premium Tier:** Sanya non-resident owners can link leak/door sensors. The system automatically creates a diagnostic ticket if a sensor trips before the tenant even notices.
4. If it requires a dispatch, manager clicks "Send to Network".

### 4.3 Virtual Quoting & Dispatch (Worker Flow)
1. Nearby *Shifu* receives a WeChat Official Account push notification ("New Plumbing Job: 2km away").
2. Notification contains AI-generated summary and blurred photos.
3. *Shifu* clicks "Accept" -> 10% escrow fee held via WeChat Pay JSAPI -> Address is revealed.

---

## 5. Success Metrics (North Star)
- **Primary:** **Ticket Deflection Rate (TDR)** - Percentage of tenant issues resolved by AI/DIY guides without a truck roll.
- **Primary Technical (3-Yr Goal):** **95% Diagnostic Accuracy** & **Sub-2-Minute Resolution** from photo/scan to quote.
- **Data Flywheel:** Tracking **First-Time Fix Rate** to close the learning loop for the CV model.
- **Financial Component:** B2B MRR (¥10/door/month charge to landlords).

---

## 6. User Stories (Jobs-to-be-Done)

### 6.1 Tenant Stories
| # | When… | I want to… | So I can… |
|---|---|---|---|
| T-1 | A pipe bursts at 2 AM in my rental apartment | Send a photo/voice note via WeChat and get an instant AI diagnosis | Know whether to call emergency services or wait for morning |
| T-2 | The AI tells me it's a simple fix (e.g., reset a breaker) | Watch a short video guide in WeChat | Fix it myself without waiting for a worker or paying a fee |
| T-3 | A worker is dispatched to my unit | Track their ETA and see their verified identity | Feel safe letting a stranger into my home |

### 6.2 Property Manager Stories
| # | When… | I want to… | So I can… |
|---|---|---|---|
| PM-1 | 15 tenants report issues overnight while I'm asleep | See an AI-triaged priority queue with severity and fault assignment | Handle the most urgent issues first without reading 15 WeChat threads |
| PM-2 | A tenant reports damage that is clearly their fault | Get an AI-generated responsibility assessment (landlord vs. tenant) | Avoid disputes and charge the correct party |
| PM-3 | Monthly board reporting is due | Export a dashboard with ticket volume, deflection rates, and costs | Justify the SaaS subscription fee to the building owner |

### 6.3 Worker (师傅) Stories
| # | When… | I want to… | So I can… |
|---|---|---|---|
| W-1 | I'm between jobs and looking for work nearby | Receive a WeChat push notification with a pre-diagnosed job 2 km away | Accept instantly without calling anyone or driving to quote |
| W-2 | I accept a job | See the AI-generated diagnosis with blurred photos and material estimates | Bring the right tools and parts on the first trip |
| W-3 | I complete a job | Get paid immediately via WeChat Pay escrow release | Avoid chasing landlords for payment |

---

## 7. Non-Goals (Explicit Scope Boundaries for v1.0)

> [!IMPORTANT]
> The following features are **intentionally excluded** from v1.0 to maintain focus on the Sanya beachhead.

| # | Non-Goal | Rationale |
|---|---|---|
| NG-1 | IoT sensor integration (Xiaomi/Ezviz) | Deferred to v2.0 Premium Tier. Requires hardware partnerships. |
| NG-2 | Multi-city expansion beyond Sanya | Must prove unit economics in one market first. |
| NG-3 | AR-based diagnosis overlays | Requires edge AI model training on 1000+ closed-loop datasets. |
| NG-4 | Native app (iOS/Android) | WeChat Mini Program is the only UX surface. Zero app downloads. |
| NG-5 | Worker scheduling / calendar management | Workers accept or reject individual jobs. No complex scheduling. |
| NG-6 | Insurance or warranty brokering | Requires financial service licenses. Out of scope. |

---

## 8. Launch Criteria (Hard Gates)

> [!CAUTION]
> **No user-facing launch** until ALL P0 criteria are met.

| Priority | Criterion | Target | Measurement |
|---|---|---|---|
| **P0** | AI Diagnostic Accuracy (top 10 issue types) | ≥ 85% | Human auditor review of 100 consecutive diagnoses |
| **P0** | Ticket Deflection Rate (DIY resolution) | ≥ 20% | % of tickets closed by tenant after receiving DIY guide |
| **P0** | Worker Response Time (accept job) | < 15 min (median) | Measured from push notification to "Accept" click |
| **P0** | PIPL Compliance (face blurring) | 100% | Automated test: no unblurred faces reach the LLM |
| **P0** | WeChat Pay escrow settlement | 0 failures | Payment reconciliation audit over 50 test transactions |
| **P1** | First-Time Fix Rate | ≥ 70% | % of jobs completed without a return visit |
| **P1** | Tenant NPS | ≥ 30 | Post-resolution in-app survey (5-point scale) |
| **P1** | Worker onboarding (Sanya whitelist) | ≥ 20 workers | Verified, insured workers registered on the platform |

---

## 9. Market Sizing (China Property Maintenance)

### TAM (Total Addressable Market)
- China has **~300 million urban housing units** (National Bureau of Statistics, 2024).
- Average annual maintenance spend: **¥2,000–5,000/unit** (Beike Research).
- **TAM = ¥600 billion – ¥1.5 trillion/year** (~$82–205 billion USD).

### SAM (Serviceable Available Market)
- Tier 1 & 2 cities: ~120 million units.
- Professionally managed properties (物业 + 二房东): ~30% = **36 million units**.
- At ¥10/door/month SaaS: **SAM = ¥4.3 billion/year** (~$590 million USD).

### SOM (Serviceable Obtainable Market — 3-Year Target)
- Sanya beachhead: ~200,000 professionally managed units.
- Target penetration in 3 years: 5% = **10,000 doors**.
- **SOM = ¥1.2 million/year** SaaS revenue + marketplace commissions on ~50,000 jobs/year.

---

## 10. Usability Test Plan (Diagnosis Wizard)

### Objective
Validate that 4 out of 5 test users can successfully complete the Photo → AI Diagnosis → Worker Dispatch flow within 3 minutes, without assistance.

### Participants
- 5 users matching the "Frazzled Tenant" persona (age 25-45, WeChat-native, non-technical).
- Recruited via Sanya property manager partner networks.

### Test Script
1. **Scenario:** "Your kitchen sink is leaking. Use the app to get help."
2. **Task 1:** Open the Mini Program and submit a photo of the leak. *(Success: photo uploaded)*
3. **Task 2:** Review the AI diagnosis. *(Success: user reads and understands the summary)*
4. **Task 3:** Accept the recommended worker. *(Success: user clicks "Accept" and sees ETA)*
5. **Post-task interview:** SUS (System Usability Scale) questionnaire + open-ended: "What was confusing?"

### Success Criteria
- **Task completion rate:** ≥ 80% (4/5 users)
- **Time to complete:** < 3 minutes per user (median)
- **SUS Score:** ≥ 68 (above average)

---

## 11. Current Implementation Status (v1.0 Pivot)
- ✅ Database Schema supports `wechat_openid` and `wechat_unionid`.
- ✅ Backend auth proxy for `jscode2session` is active (`routes/wechat.ts`).
- ✅ WeChat Pay Native JSAPI payment routes established (`routes/payments.ts`).
- ✅ PIPL Face-Blurring Middleware created and injected into DeepSeek routes.
