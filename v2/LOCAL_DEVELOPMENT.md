# Local Development Guide

## Quick Start

### Prerequisites
- Node.js 18+ installed
- Git installed

### 1. Install Dependencies

**Frontend:**
```bash
cd v2
npm install
```

**Backend (Workers):**
```bash
cd v2/workers
npm install
```

### 2. Environment Setup

Create `v2/.env.local`:
```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-generated-32-char-secret-here

# API
NEXT_PUBLIC_API_URL=http://localhost:8787
API_URL=http://localhost:8787

# Database (optional for local dev)
DATABASE_URL=postgresql://localhost/house_maint_ai

# AI (optional)
GEMINI_API_KEY=your-gemini-key
```

**Generate NEXTAUTH_SECRET:**
```bash
# On Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Maximum 256}))

# Or use online generator
# https://generate-secret.vercel.app/32
```

Create `v2/workers/.dev.vars`:
```env
DATABASE_URL=postgresql://localhost/house_maint_ai
JWT_SECRET=your-jwt-secret-same-as-nextauth
GEMINI_API_KEY=your-gemini-key
OLLAMA_URL=http://localhost:11434
```

### 3. Start Development Servers

**Terminal 1 - Frontend:**
```bash
cd v2
npm run dev
```
Open http://localhost:3000

**Terminal 2 - Backend:**
```bash
cd v2/workers
npm run dev
```
API running on http://localhost:8787

### 4. Test the Application

1. **Register a new account:**
   - Go to http://localhost:3000/register
   - Create account with strong password (10+ chars, mixed case, numbers, symbols)

2. **Login:**
   - Use your credentials at http://localhost:3000/login

3. **Test photo upload (mock mode):**
   - Click "创建报告" from dashboard
   - Upload any image
   - Fill in description and address
   - Submit (Note: AI diagnosis requires database setup)

4. **Browse workers:**
   - Click "找师傅"
   - Filter by specialty
   - View worker details

## Without Database (Mock Mode)

If you haven't set up PostgreSQL/Neon yet, the app will work partially:

**What works:**
- ✅ Landing page
- ✅ Registration/Login UI
- ✅ Dashboard layout
- ✅ Photo upload form

**What requires database:**
- ❌ Actual user creation
- ❌ Report storage
- ❌ AI diagnosis
- ❌ Worker data
- ❌ Order creation

## With Database Setup

### Option 1: Use Neon (Recommended)

1. Create account at [neon.tech](https://neon.tech)
2. Create project: "house-maint-ai"
3. Copy connection string
4. Update `.env.local` and `.dev.vars`
5. Run migration:
   ```bash
   psql $env:DATABASE_URL -f database/schema.sql
   ```

### Option 2: Local PostgreSQL

1. Install PostgreSQL
2. Create database:
   ```bash
   createdb house_maint_ai
   ```
3. Run migration:
   ```bash
   psql -d house_maint_ai -f v2/database/schema.sql
   ```

## Troubleshooting

**PowerShell script execution error:**
- Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

**Port already in use:**
- Change port: `npm run dev -- -p 3001`

**Cannot find module errors:**
- Delete `node_modules` and reinstall:
  ```bash
  rm -rf node_modules
  npm install
  ```

**API connection failed:**
- Verify backend is running on port 8787
- Check `NEXT_PUBLIC_API_URL` in `.env.local`

**Database connection failed:**
- Verify `DATABASE_URL` format
- Test connection: `psql $env:DATABASE_URL`
- Check Neon dashboard for connection limits

## Development Tips

**Hot Reload:**
- Frontend auto-reloads on save
- Backend requires restart for route changes

**Debug Mode:**
- Open browser DevTools (F12)
- Check Console for errors
- Check Network tab for API calls

**Testing:**
```bash
# Run tests
npm test

# Run specific test
npm test -- reports
```

## Next Steps

Once local development is working:

1. **Deploy to production** - See [DEPLOYMENT.md](./DEPLOYMENT.md)
2. **Add features** - See [PROGRESS.md](./PROGRESS.md) for roadmap
3. **Contribute** - Check GitHub issues

## Support

Having issues? Check:
- [README.md](./README.md) - Full documentation
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production setup
- GitHub Issues - Report bugs
