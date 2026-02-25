# House Maint AI — AI-Powered Home Maintenance for China (WeChat Native)

> **"Like Quaala & Servwizee, but built exclusively for the Chinese WeChat ecosystem."**
> Transforming residential maintenance triage with AI Vision, native WeChat mini-programs, and automated local worker (师傅) dispatch.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![AI](https://img.shields.io/badge/AI-DeepSeek_Baidu-blue.svg)](https://deepseek.com/)
[![Ecosystem](https://img.shields.io/badge/Ecosystem-WeChat_MiniProgram-green.svg)](https://developers.weixin.qq.com/)

---

## 🌌 The Vision (The 18-Month Local Moat)

House Maint AI is a highly localized B2B2C triage and dispatch platform. We solve the core friction in Chinese urban home maintenance: **the chaotic, untrusted bridge between tenants/landlords and local repair workers.**

By combining **AI Photo/Voice Triage** with a native **WeChat Ecosystem**, we create an impenetrable 18-month legal and operational moat against foreign competitors.

---

## ✨ Core Workflows (The Dual Pivot)

### 1. B2B: Property Manager SaaS (The Quaala Model)
For Property Managers (物业) and Large-scale Landlords (二房东).
*   **Tenant Flow:** Tenant sends a photo or voice note of a leak to our Official Account.
*   **AI Triage:** The AI diagnoses the issue, assigns responsibility (landlord vs. tenant damage), and attempts to provide a "DIY Fix Guide" (Ticket Deflection).
*   **Value:** Reduces maintenance coordination time by 40%. Generates predictable MRR (¥10/door/month).

### 2. Marketplace: Virtual Quoting (The Servwizee Model)
For local freelance repair workers (师傅).
*   **Worker Flow:** Workers receive structured, pre-diagnosed leads via WeChat push notifications. No app download required. 1-click to accept the job.
*   **Value:** Eliminates the "free estimate truck roll." Connects qualified workers with high-intent jobs for a 10-15% commission via WeChat Pay.

---

## 🛡️ The Chinese Localization Moat

This system is explicitly architected to win in mainland China and deter foreign clones:
1.  **Product UX:** 100% WeChat Mini Program. Zero app installs. Fits Chinese consumer habits.
2.  **Multimodal Voice:** Integrates localized NLP to understand Chinese regional dialects and maintenance colloquialisms.
3.  **PIPL Compliance:** Strict data residency. Auto-blurring of private interior spaces in mainland cloud storages to comply with the Personal Information Protection Law.
4.  **WeChat Pay Escrow:** Native payments replacing Stripe for instant worker settlement and trust building.

---

## 🛠️ Tech Stack (China-Optimized)

| Layer | Technology |
|-------|-----------|
| **Core AI** | Localized LLMs (DeepSeek Vision / Baidu ERNIE) |
| **Frontend** | WeChat Mini Program (Taro / Uni-app) + React 19 Web Dashboard |
| **Backend** | Node.js 20, Express, TypeScript, Drizzle ORM |
| **Database** | PostgreSQL + Redis (Hosted in Mainland China) |
| **Auth & Pay** | WeChat OpenID Integration + WeChat Pay API v3 |

---

## 🚀 Getting Started (Development)

### 1. Requirements
- Node.js 20+
- WeChat Developer Tools (微信开发者工具)
- DeepSeek/Baidu API Key
- WeChat Merchant Account (微信支付商户号)

### 2. Local Setup
```bash
# Clone the repository
git clone https://github.com/Mark393295827/house-maint-ai.git
cd house-maint-ai

# Install backend dependencies
cd server && npm install

# Start the local daemon (with SQLite fallback)
npm run dev
```

---

## 📂 Architecture

- `server/routes/wechat.ts`: Mini-program login and Official Account webhook handlers.
- `server/routes/payments.ts`: WeChat Pay callback integration.
- `server/services/pipl.ts`: Data anonymization and retention policies.

*Refer to [ARCHITECTURE.md](./ARCHITECTURE.md) and [COMPETITIVE_ANALYSIS.md](./COMPETITIVE_ANALYSIS.md) for deep dives into the business model.*

---

## 🚢 License
MIT License. Created by [Mark393295827](https://github.com/Mark393295827).
