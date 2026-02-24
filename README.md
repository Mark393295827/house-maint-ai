# 🏠 House Maint AI — Ambient Agentic Property Manager

> **Fused with OpenClaw Framework** 🦞
> Transforming home maintenance from a reactive ledger into an omnichannel, visually intelligent, agentic assistant.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![AI](https://img.shields.io/badge/AI-Gemini_Vision-orange.svg)](https://ai.google.dev/)
[![Gateway](https://img.shields.io/badge/Gateway-OpenClaw_Omnichannel-emerald.svg)](https://github.com/openclaw/openclaw)

## 🌌 The Vision
House Maint AI is no longer just a full-stack web app. By synthesizing the core strengths of **House Maint AI** (Expert Maintenance Logic + Gemini Vision) and **OpenClaw** (Omnichannel Gateway + Agentic Skills), we have created an ambient assistant that manages your home across the digital spectrum.

---

## ✨ Key Agentic Capabilities

### 📱 Omnichannel Maintenance Reporting
Step beyond the browser. Report issues via **WhatsApp, Telegram, iMessage, Discord, or Slack**.
*   *Interaction:* "The HVAC is making a rattling noise" via text.
*   *Result:* Automatically categorized, priority-assigned, and tracked in your maintenance dashboard.

### 👁️ Edge Vision & Contextual Analysis
Direct hardware integration via device nodes (iOS, Android, macOS).
*   *Workflow:* Snap a photo of a leak via iMessage.
*   *Intelligence:* Gemini Vision diagnoses the leak, calculates severity, and logs a detailed ticket with a "5-Why" root cause analysis instantly.

### 🤖 Proactive Skills & Automation
A proactive property manager that never sleeps.
*   *Automation:* Cron-based background agents audit your house health.
*   *Intervention:* "I noticed it's been 6 months since your last water filter change. I've drafted a replacement ticket for your approval."

### 🔗 Hybrid Control Plane
The best of both worlds: Enterprise-grade security with the responsiveness of a local daemon.
*   *Backend:* PostgreSQL, Redis, and JWT authentication on a robust Dockerized stack.
*   *Gateway:* A local daemon for high-performance screen recording, camera access, and device-level skill execution.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Core AI** | Google Gemini Vision 1.5 Pro / Flash |
| **Agentic Framework** | OpenClaw Gateway + Skills Registry |
| **Messaging** | Telegram, WhatsApp, Discord, BlueBubbles (iMessage) |
| **Backend** | Node.js 20, Express, TypeScript, Prisma |
| **Frontend** | React 19, Tailwind CSS 4, Framer Motion |
| **Infrastructure** | Docker, Nginx, PostgreSQL, Redis |

---

## 🚀 Getting Started

### 1. Requirements
- Node.js 20+
- Docker & Docker Compose
- Google AI (Gemini) API Key

### 2. Local Setup
```bash
# Clone the repository
git clone https://github.com/Mark393295827/house-maint-ai.git
cd house-maint-ai

# Install dependencies (Frontend & Backend)
npm install
cd server && npm install

# Start the ambient environment
npm run dev
```

### 3. Messaging Gateway (OpenClaw)
To enable omnichannel reporting, initialize the OpenClaw gateway:
```bash
npx openclaw connect --channel telegram
```

---

## 📂 Architecture
The project follows a **Multi-Agent Hybrid Architecture**:
- `src/gateway`: Omnichannel messaging adapters.
- `src/store`: Unified case management (Local/Remote).
- `src/skills`: Proactive maintenance background tasks.
- `.agent/workflows`: Structured AI task definitions.

*Refer to [ARCHITECTURE.md](./ARCHITECTURE.md) for a deep dive into the fusion model.*

---

## 🚢 License
MIT License. Created by [Mark393295827](https://github.com/Mark393295827) and powered by the [OpenClaw](https://github.com/openclaw/openclaw) community.
