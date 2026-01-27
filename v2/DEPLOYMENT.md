# Deployment Guide

## Prerequisites

- [Neon](https://neon.tech) account
- [Cloudflare](https://cloudflare.com) account
- [Vercel](https://vercel.com) account
- [Google AI Studio](https://aistudio.google.com) API key

## Step 1: Database Setup (Neon)

1. **Create Neon Project**
   ```bash
   # Visit https://neon.tech and create a new project
   # Name: house-maint-ai
   # Region: Choose Asia Pacific (closest to users)
   ```

2. **Copy Connection String**
   ```
   postgresql://user:password@ep-xxx.region.aws.neon.tech/house_maint_ai?sslmode=require
   ```

3. **Run Migrations**
   ```bash
   # Install psql if needed
   # Windows: https://www.postgresql.org/download/windows/
   
   # Set environment variable
   $env:DATABASE_URL="your-connection-string"
   
   # Run schema
   psql $env:DATABASE_URL -f database/schema.sql
   ```

## Step 2: Cloudflare Workers Setup

1. **Install Wrangler**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**
   ```bash
   wrangler login
   ```

3. **Create R2 Bucket**
   ```bash
   wrangler r2 bucket create house-maint-images
   ```

4. **Create KV Namespace**
   ```bash
   wrangler kv:namespace create "CACHE"
   wrangler kv:namespace create "CACHE" --preview
   ```
   
   Update `wrangler.toml` with the IDs returned.

5. **Set Secrets**
   ```bash
   cd workers
   
   # Database
   wrangler secret put DATABASE_URL
   # Paste your Neon connection string
   
   # JWT Secret (generate with: openssl rand -base64 32)
   wrangler secret put JWT_SECRET
   
   # Gemini API Key
   wrangler secret put GEMINI_API_KEY
   
   # Ollama URL (optional, for local AI)
   wrangler secret put OLLAMA_URL
   ```

6. **Deploy**
   ```bash
   npm install
   npm run deploy
   ```
   
   Note the deployed URL (e.g., `https://house-maint-ai-api.your-subdomain.workers.dev`)

## Step 3: Vercel Frontend Setup

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login**
   ```bash
   vercel login
   ```

3. **Set Environment Variables**
   
   Create `.env.local`:
   ```env
   # Database
   DATABASE_URL=your-neon-connection-string
   
   # NextAuth
   NEXTAUTH_URL=https://your-app.vercel.app
   NEXTAUTH_SECRET=your-32-char-secret
   
   # API
   NEXT_PUBLIC_API_URL=https://house-maint-ai-api.your-subdomain.workers.dev
   API_URL=https://house-maint-ai-api.your-subdomain.workers.dev
   
   # AI (same as Workers)
   GEMINI_API_KEY=your-gemini-key
   OLLAMA_URL=http://your-ollama-url (optional)
   ```

4. **Deploy**
   ```bash
   cd v2
   npm install
   vercel
   ```
   
   Follow prompts to create new project.

5. **Set Production Environment Variables**
   
   In Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.local`
   - Set for Production, Preview, and Development

6. **Redeploy**
   ```bash
   vercel --prod
   ```

## Step 4: Verification

1. **Test API Health**
   ```bash
   curl https://your-workers-url/health
   # Should return: {"status":"ok","timestamp":"..."}
   ```

2. **Test Frontend**
   - Visit your Vercel URL
   - Should see landing page
   - Try registering a new user
   - Login and access dashboard

3. **Test AI Diagnosis** (once UI is complete)
   - Upload an image
   - Verify AI diagnosis appears
   - Check which model was used (Llama vs Gemini)

## Step 5: Optional - Local Ollama Setup

For 80% cost savings, run Ollama locally or on a VPS:

```bash
# Using Docker
docker run -d -p 11434:11434 --name ollama ollama/ollama

# Pull Llama 3.2 Vision model
docker exec ollama ollama pull llama3.2-vision

# Test
curl http://localhost:11434/api/tags
```

Update Workers secret:
```bash
wrangler secret put OLLAMA_URL
# Enter: http://your-server-ip:11434
```

## Monitoring

### Cloudflare Dashboard
- Workers Analytics: Request count, errors, latency
- R2 Storage: Usage and costs
- KV: Operations and storage

### Vercel Dashboard
- Deployment status
- Analytics: Page views, Web Vitals
- Logs: Server-side errors

### Neon Dashboard
- Database size and connections
- Query performance
- Storage used vs quota

## Cost Monitoring

Expected monthly costs:
- Neon: ¥0 (free tier, 512MB)
- Cloudflare Workers: ¥0 (free tier, 100k req/day)
- Cloudflare R2: ~¥20 (storage + traffic)
- Vercel: ¥0 (hobby tier)
- Gemini API: ~¥30 (20% of requests)

**Total: ~¥50/month**

## Troubleshooting

**Workers deployment fails:**
- Check wrangler.toml configuration
- Verify all secrets are set
- Check build output for TypeScript errors

**Frontend can't connect to API:**
- Verify NEXT_PUBLIC_API_URL is correct
- Check CORS settings in Workers
- Inspect browser network tab for errors

**Database connection errors:**
- Verify DATABASE_URL format
- Check Neon dashboard for connection limits
- Ensure ?sslmode=require is in URL

**Ollama not responding:**
- Check Docker container is running
- Verify port 11434 is accessible
- Check model is downloaded

## Next Steps

1. Set up GitHub Actions for CI/CD
2. Configure custom domain
3. Set up monitoring and alerts
4. Plan for scaling (when > 100k requests/day)
