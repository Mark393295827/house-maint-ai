# 🏠 House Maint AI

A modern, full-stack home maintenance application powered by AI.
Connects users with expert workers for home repairs, featuring AI diagnosis, real-time matching, and community sharing.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/frontend-React_18-61DAFB.svg)
![Node](https://img.shields.io/badge/backend-Node.js_20-339933.svg)
![Docker](https://img.shields.io/badge/deploy-Docker-2496ED.svg)

## ✨ Features

- **📱 Mobile-First Design**: Smooth, app-like experience with TailwindCSS.
- **🤖 AI Diagnosis**: 
  - Identify home issues using Google Gemini Vision API.
  - Get instant repair guides and DIY suggestions.
- **⚡ Quick Report**: 
  - Voice & Video reporting.
  - Smart categorization (Plumbing, Electrical, HVAC, etc.).
- **🤝 Intelligent Macthing**: 
  - Match with workers based on skill, location, and rating.
  - Real-time availability checking.
- **📅 Booking System**: 
  - Schedule appointments.
  - Track order status.
- **💬 Community**: 
  - Share maintenance tips.
  - Q&A with experts.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS 4
- **State**: React Context API
- **Routing**: React Router 7

### Backend
- **Runtime**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **Auth**: JWT + bcrypt
- **Storage**: Local file system (Multer)

### DevOps
- **Container**: Docker + Docker Compose
- **Server**: Nginx (Frontend proxy)
- **Test**: Vitest + Supertest

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Docker (optional)
- Google Gemini API Key

### 🔧 Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/Mark393295827/house-maint-ai.git
   cd house-maint-ai
   ```

2. **Environment Setup**
   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   # Edit .env.local and add your VITE_GEMINI_API_KEY
   ```

3. **Install Dependencies**
   ```bash
   # Install root dependencies (Frontend)
   npm install

   # Install server dependencies (Backend)
   cd server
   npm install
   cd ..
   ```

4. **Initialize Database**
   ```bash
   cd server
   npm run init-db
   cd ..
   ```

5. **Start Development Servers**
   Open two terminals:

   Terminal 1 (Frontend):
   ```bash
   npm run dev
   ```

   Terminal 2 (Backend):
   ```bash
   cd server
   npm run dev
   ```

### 🐳 Docker Deployment

Run the entire application with a single command:

```bash
docker-compose up --build
```

Access the application at `http://localhost:5173`.

## 🧪 Testing

```bash
# Run all tests (Frontend + Backend)
npm test

# Run backend specific tests
cd server && npm test
```

## 📂 Project Structure

```
house-maint-ai/
├── src/                # Frontend Source
│   ├── components/     # Reusable UI components
│   ├── pages/          # Application pages
│   ├── contexts/       # Global state (Auth)
│   ├── services/       # API clients (AI, Backend)
│   └── utils/          # Helpers
├── server/             # Backend Source
│   ├── routes/         # API Endpoints
│   ├── models/         # Database Schema
│   ├── middleware/     # Auth & Error handling
│   └── tests/          # Backend API tests
├── Dockerfile          # Frontend container config
├── docker-compose.yml  # Orchestration config
└── vite.config.js      # Vite configuration
```

## 📄 License

This project is licensed under the MIT License.
