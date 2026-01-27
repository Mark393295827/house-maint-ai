# Database Setup Instructions

## Step 1: Create Neon Project

1. Go to [neon.tech](https://neon.tech)
2. Sign up or log in
3. Click "Create Project"
4. Name: `house-maint-ai`
5. Region: Choose closest to your users (e.g., `Asia Pacific`)
6. Copy the connection string

## Step 2: Configure Environment

Add to your `.env.local` and Workers secrets:

```env
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/house_maint_ai?sslmode=require
```

## Step 3: Run Migration

```bash
# Make sure psql is installed
psql --version

# Run the schema
psql $DATABASE_URL -f database/schema.sql
```

## Step 4: Verify

```bash
# Connect to database
psql $DATABASE_URL

# Check tables
\dt

# Should see:
# - users
# - companies
# - reports
# - workers
# - orders
# - reviews
# - subscriptions
```

## Sample Data

The schema includes sample data:
- Admin user: `admin@example.com` / `password123` 
- Sample company
- Sample worker

## Migration from V1

If you have existing data in SQLite:

```bash
# Export from old database
node scripts/export-v1-data.js > v1-data.json

# Import to Neon
node scripts/import-to-v2.js v1-data.json
```

## Troubleshooting

**Can't connect to Neon:**
- Check connection string format
- Ensure `?sslmode=require` is in the URL
- Verify IP allowlist in Neon dashboard

**Migration fails:**
- Check PostgreSQL version (should be 15+)
- Ensure uuid-ossp extension is available
- Run migrations one at a time if needed
