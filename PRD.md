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

## 6. Current Implementation Status (v1.0 Pivot)
- ✅ Database Schema supports `wechat_openid` and `wechat_unionid`.
- ✅ Backend auth proxy for `jscode2session` is active (`routes/wechat.ts`).
- ✅ WeChat Pay Native JSAPI payment routes established (`routes/payments.ts`).
- ✅ PIPL Face-Blurring Middleware created and injected into DeepSeek routes.
