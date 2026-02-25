# House Maint AI — Strategic Reshaping & OKRs (China Localized)

**Date:** 2026-02-25  
**Core Strategy:** Replicate the proven US models of Quaala/Servwizee, weaponized with a hard 18-month Chinese localization moat (WeChat + PIPL + Local Network).

---

## Part I: Core Thinking — The 18-Month Moat

### 1. Stop Guessing, Start Executing Proven Models
**Insight:** Quaala and Servwizee have already proven that "AI Diagnosis + Worker Matching/Triage" is a viable, high-growth business in the US.
**Action:** We will not invent a new business model. We will rapidly clone Quaala's SaaS triage for property managers and Servwizee's virtual quoting for contractors.

### 2. The Ultimate Moat is Chinese Localization
Foreign competitors cannot enter this space for at least 18 months due to severe structural and cultural barriers. Our product architecture must aggressively lean into these:

*   **Barrier 1: WeChat Ecosystem Deep Integration.** The US relies on SMS and email. We must build natively into WeChat Mini Programs, WeChat Pay, and Official Account pushes. The UX must be zero-download.
*   **Barrier 2: PIPL Data Compliance.** Quaala cannot legally process Chinese home interior photos containing personal data on US servers. Our adherence to Hainan/Mainland PIPL data residency is a legal moat.
*   **Barrier 3: Chinese Voice & Multimodal Input.** Typing is high-friction for panic situations (e.g., a burst pipe). Integrating seamless Chinese voice note parsing (understanding local dialects + maintenance slang) is critical.
*   **Barrier 4: The 师傅 (Master Worker) Network.** The local freelance repair network operates entirely on trust, WeChat groups, and cash. Organizing this chaotic supply side is a distinctly local operational challenge that AI alone cannot solve.

### 3. The Dual Revenue Model
Based on the US teardowns, we will pursue:
1.  **B2B SaaS (Quaala Model):** ¥10/door/month for property managers (triage + automated dispatch).
2.  **Marketplace Transaction (Servwizee Model):** "Free Diagnosis, Charge on Repair." 10-15% take rate on jobs matched and paid via our WeChat Mini-program platform. 

### 4. Sanya Beachhead Strategy & IoT Upsell
Sanya represents the perfect storm for this model: high non-resident ownership, corrosive environments (high humidity, sea breeze), and low local trust. 
*   **Base Tier:** WeChat Photo/Video triage + Worker matching.
*   **Premium Tier (Servwizee IoT Play):** Integration with cheap Xiaomi/Ezviz water leak and door sensors for predictive maintenance, selling "peace of mind" to absentee landlords.

### 5. 3-Phase Technology Roadmap (The Edge Transition)
1. **0–18 Months (MVP):** Cloud LLMs (DeepSeek/Baidu) + Human-in-the-loop (Concierge MVP). Focus on gathering 500-1000 pristine closed-loop repair datasets in Sanya.
2. **18–36 Months (Edge AI):** Train a lightweight, custom vertical vision model specifically for high-frequency issues (leaks, electrical). Deploy AR (Augmented Reality) overlays in the WeChat UI to guide diagnosis.
3. **36+ Months (OEM Integration):** Partner with Xiaomi/Hikvision to embed our diagnostic model directly into smart home cameras and robot vacuums as a "home health module."

### 6. North Star Benchmarks (3-Year Goal)
*   **Accuracy:** 95%+ diagnostic accuracy before a human worker is dispatched.
*   **Speed:** Under 2 minutes from "Scan/Photo" to "Solution/Quote".

---

## Part II: OKRs — Q2 2026 (The Localized 90-Day Sprint)

### Company-Level Objective
> **"Capture the Chinese AI Home Maintenance window by launching a WeChat-native clone of the Quaala/Servwizee model and proving initial monetization."**

---

### OKR 1: WeChat-Native Product Experience (The UX Moat)
**Objective:** Replace the generic web app flow with a frictionless WeChat Mini Program experience.
*   **KR 1.1:** Launch WeChat Mini Program MVP with AI Photo/Voice diagnosis within 30 days.
*   **KR 1.2:** Integrate WeChat Pay for deposits/final payments with secure escrows by Day 45.
*   **KR 1.3:** Build worker-side WeChat Official Account for 1-click job acceptance (no app download for workers).

---

### OKR 2: Supply-Side Network Seeding (The Operational Moat)
**Objective:** Organize a hyper-local "Servwizee-style" contractor network in Sanya as our beachhead.
*   **KR 2.1:** Onboard a whitelist of 20 verified, insured 师傅 (Master Workers) in Sanya by Day 60. Must offer "Refund Guarantee" to build trust.
*   **KR 2.2:** Conduct 50 simulated job dispatches to ensure worker response time < 15 minutes.
*   **KR 2.3:** Map local Sanya pricing guidelines for top 20 repair categories to fuel the transparent AI virtual quoting engine.

---

### OKR 3: PIPL & Local Infrastructure (The Legal Moat)
**Objective:** Ensure the architecture is strictly compliant with Chinese data laws to block foreign entry.
*   **KR 3.1:** Draft and publish a PIPL-compliant Privacy Policy explicitly detailing AI photo processing and data residency.
*   **KR 3.2:** Migrate all storage (S3 equivalents) and database instances to mainland China endpoints.
*   **KR 3.3:** Implement auto-blurring of human faces in user-uploaded maintenance photos before sending to the LLM.

---

### OKR 4: B2B Validation (The Quaala Play)
**Objective:** Prove the SaaS model by selling "Ticket Deflection" to local property managers.
*   **KR 4.1:** Pitch 10 local property management companies or large-scale landlords (二房东).
*   **KR 4.2:** Sign 2 Letters of Intent (LOIs) or pilot agreements for the SaaS triage dashboard.
*   **KR 4.3:** Demonstrate a 30% "ticket deflection" rate (issues resolved via AI DIY guides without a worker visit) during pilot.

---

## Decision Log

| Decision | Choice | Rationale |
|---|---|---|
| Target Platform | **WeChat Mini Program only** | Zero install friction; native payments; aligns with Chinese user habits |
| Voice Engine | **DeepSeek/Baidu (Local Integration)** | Must understand Chinese dialects and repair slang better than generic global models |
| Compliance | **Strict PIPL Data Residency** | Hard legal moat against US competitors |
| Strategy Focus | **Copy US workflows + Hyper-local Operations** | Eliminates product-market fit risk; redirects energy to operational execution |
