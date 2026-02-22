# 🏠 House Maint AI

A modern, full-stack home maintenance application powered by AI.
Connects users with expert workers for home repairs, featuring AI diagnosis, real-time matching, and community sharing.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/frontend-React_18-61DAFB.svg)
![Node](https://img.shields.io/badge/backend-Node.js_20-339933.svg)
![Docker](https://img.shields.io/badge/deploy-Docker-2496ED.svg)
![Tests](https://github.com/Mark393295827/house-maint-ai/actions/workflows/test.yml/badge.svg)

> **🎯 [View the Showcase →](/showcase)** — A stunning interactive demo of every feature.

## ✨ Features

- **📱 Mobile-First Design**: Smooth, app-like experience with TailwindCSS.
- **🤖 AI Diagnosis**: Identify home issues using Google Gemini Vision API with instant repair guides.
- **⚡ Quick Report**: Voice & Video reporting with smart categorization.
- **🤝 Intelligent Matching**: Workers matched by skill, location, and rating.
- **📅 Booking System**: Schedule appointments and track order status.
- **💬 Community**: Share maintenance tips and Q&A with experts.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite, Tailwind CSS 4, React Router 7 |
| Backend | Node.js 20 + Express, TypeScript |
| Database | PostgreSQL 15 (prod), SQLite (dev fallback) |
| Cache | Redis 7 (with in-memory fallback) |
| Auth | JWT + bcrypt |
| AI | Google Gemini Vision API |
| Monitoring | Sentry (errors), Mixpanel (analytics) |
| DevOps | Docker, Nginx, GitHub Actions CI/CD |
| Testing | Vitest + Supertest (200+ tests) |

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Docker (optional, for full-stack deployment)

### 🔧 Local Development

```bash
# 1. Clone
git clone https://github.com/Mark393295827/house-maint-ai.git
cd house-maint-ai

# 2. Install dependencies
npm install
cd server && npm install && cd ..

# 3. Start dev servers (two terminals)
npm run dev          # Frontend → http://localhost:5173
cd server && npm run dev  # Backend  → http://localhost:3001
```

> The backend auto-falls back to SQLite + in-memory Redis, so no DB setup needed for local dev.

### 🐳 Docker (Full Stack)

```bash
# Generate secrets (first time only)
node -e "require('crypto').randomBytes(48).toString('hex')" > secrets/jwt_secret.txt
node -e "require('crypto').randomBytes(24).toString('hex')" > secrets/db_password.txt

# Launch all services
docker compose up --build
```

Services: Frontend (:80), Backend (:3001), PostgreSQL (:5432), Redis (:6379)

## 🧪 Testing

```bash
npm test              # All tests (Frontend + Backend)
npm run build         # Production build verification
```

## 🚢 Production Deployment

### Frontend → Vercel / GitHub Pages

The frontend auto-deploys via `.github/workflows/deploy.yml` on push to `main`.

**Vercel**: Import the repo on [vercel.com](https://vercel.com). Set env var:
- `VITE_API_URL` = your backend URL (e.g., `https://house-maint-api.onrender.com/api`)

### Backend → Render

1. Create a **Web Service** on [render.com](https://render.com) pointing to this repo.
2. Set **Root Directory** to `server`, **Build Command** to `npm install && npm run build`, **Start Command** to `npm start`.
3. Add environment variables: `NODE_ENV=production`, `PORT=3001`, `CORS_ORIGINS=https://your-frontend-domain.com`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `REDIS_HOST` (or omit for in-memory fallback).
4. Add **RENDER_SERVICE_ID** and **RENDER_API_KEY** as GitHub repo secrets for auto-deploy via `.github/workflows/deploy-backend.yml`.

### Environment Files

| File | Purpose | Gitignored? |
|------|---------|-------------|
| `.env.example` | Template with all variables | ❌ (committed) |
| `.env.production.example` | Production template | ❌ (committed) |
| `.env.production` | Actual production values | ✅ |
| `secrets/jwt_secret.txt` | JWT signing key | ✅ |
| `secrets/db_password.txt` | Database password | ✅ |

## 📂 Project Structure

```
house-maint-ai/
├── src/                # Frontend (React + Vite)
│   ├── components/     # Reusable UI components
│   ├── pages/          # Application pages
│   ├── contexts/       # Global state (Auth)
│   └── services/       # API clients (AI, Backend)
├── server/             # Backend (Express + TypeScript)
│   ├── routes/         # API endpoints
│   ├── models/         # Database schema (PG + SQLite)
│   ├── config/         # DB, Redis, Swagger, Secrets
│   └── tests/          # Backend API tests
├── .github/workflows/  # CI/CD pipelines
├── agents/             # AI agent definitions
├── Dockerfile          # Frontend container (Nginx)
├── server/Dockerfile   # Backend container (Node)
└── docker-compose.yml  # Full-stack orchestration
```

## 📄 License

This project is licensed under the MIT License.
