# House Maint AI V2 🏠🤖

**AI-Powered B2B2C Home Maintenance Platform**

A complete redesign of House Maint AI, optimized for the "Solo Founder + AI Agents" model with serverless architecture, hybrid AI, and B2B focus.

## 🚀 Key Features

- **AI Diagnosis**: Hybrid Llama 3 + Gemini for 80% cost reduction
- **Smart Matching**: Intelligent worker matching algorithm
- **B2B Platform**: Property management SaaS dashboard
- **Serverless**: Built on Cloudflare Workers + Vercel
- **Cost-Efficient**: ~¥50/月 to serve 1000+ users

## 📊 Tech Stack

### Frontend
- **Next.js 14** with App Router & Server Components
- **TypeScript** for type safety
- **Tailwind CSS** with shadcn/ui components
- **React Query** for server state management
- **NextAuth.js** for authentication

### Backend
- **Cloudflare Workers** with Hono framework
- **Neon PostgreSQL** serverless database
- **Cloudflare R2** for image storage
- **Redis/KV** for caching

### AI
- **Llama 3.2 Vision** (local via Ollama) - 80% of requests
- **Gemini 2.0 Flash** (API) - 20% complex cases
- **Hybrid Strategy** for cost optimization

## 🏗️ Project Structure

```
v2/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth routes
│   ├── (dashboard)/       # User dashboard
│   ├── (b2b)/            # B2B dashboard
│   └── api/              # API routes (proxy)
├── components/
│   ├── ui/               # Shadcn UI components
│   └── features/         # Feature components
├── lib/
│   ├── api.ts           # API client
│   ├── auth.ts          # Auth helpers
│   └── env.ts           # Environment validation
└── workers/              # Cloudflare Workers
    └── src/
        ├── routes/       # API routes
        ├── lib/          # Services (DB, AI)
        └── middleware/   # Auth, CORS, etc.
```

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+
- Docker (for local Postgres & Ollama)
- Cloudflare account
- Neon account

### 1. Clone and Install

```bash
cd v2
npm install
cd workers && npm install
```

### 2. Set Up Database

Create a Neon project at [neon.tech](https://neon.tech) and get your connection string.

```bash
# Run schema migration
psql $DATABASE_URL -f database/schema.sql
```

### 3. Configure Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your credentials:
- `DATABASE_URL`: Neon connection string
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `GEMINI_API_KEY`: Get from Google AI Studio
- `OLLAMA_URL` (optional): Local Ollama endpoint

### 4. Run Development Servers

**Frontend:**
```bash
npm run dev
# Open http://localhost:3000
```

**Backend (Cloudflare Workers):**
```bash
cd workers
npm run dev
# Open http://localhost:8787
```

**Ollama (optional, for local AI):**
```bash
docker run -d -p 11434:11434 --name ollama ollama/ollama
docker exec ollama ollama pull llama3.2-vision
```

## 📦 Deployment

### Frontend (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Backend (Cloudflare Workers)

```bash
cd workers

# Set secrets
npx wrangler secret put DATABASE_URL
npx wrangler secret put JWT_SECRET
npx wrangler secret put GEMINI_API_KEY

# Deploy
npx wrangler deploy
```

### Create R2 Bucket

```bash
npx wrangler r2 bucket create house-maint-images
```

## 🧪 Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e
```

## 📈 Cost Breakdown (Monthly)

| Service | Tier | Cost (¥) |
|---------|------|----------|
| Neon PostgreSQL | Free (512MB) | ¥0 |
| Cloudflare Workers | Free (100k req/day) | ¥0 |
| Cloudflare R2 | Storage + Traffic | ¥20 |
| Vercel | Hobby | ¥0 |
| Gemini API | 20% of requests | ¥30 |
| **Total** | | **¥50** |

## 🎯 Roadmap

### Phase 1: Foundation (Weeks 1-4) ✅
- [x] Next.js 14 setup
- [x] Cloudflare Workers backend
- [x] Database schema
- [x] Hybrid AI integration
- [ ] Neon deployment
- [ ] Vercel deployment

### Phase 2: Core Features (Weeks 5-8)
- [ ] AI photo diagnosis
- [ ] Worker matching
- [ ] Order management

### Phase 3: B2B Features (Weeks 9-12)
- [ ] Property management dashboard
- [ ] SaaS subscription
- [ ] Bulk operations

### Phase 4: AI Automation (Weeks 13-16)
- [ ] AI customer service
- [ ] Automated routing
- [ ] Content generation

### Phase 5: Testing & Launch (Weeks 17-24)
- [ ] Quality assurance
- [ ] B2B pilot program
- [ ] Go-to-market

## 🔐 Security

- ✅ Strong JWT secrets (32+ chars)
- ✅ Password strength enforcement (10+ chars, mixed case, numbers, symbols)
- ✅ CSRF protection via NextAuth
- ✅ Rate limiting on auth endpoints
- ✅ Environment variable validation
- ✅ SQL injection prevention (parameterized queries)

## 📄 License

MIT

## 🤝 Contributing

This is a solo founder project powered by AI agents. Contributions welcome!

## 📧 Contact

For B2B inquiries: [Your Email]

---

**Built with ❤️ by AI Agents**
