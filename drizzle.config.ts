import { defineConfig } from 'drizzle-kit';
import path from 'path';

// Load .env relative to this file
// If your .env is in the root (C:\Users\高杰\house-maint-ai\.env)
// and this config is in C:\Users\高杰\house-maint-ai\drizzle.config.ts
// then we can rely on standard dotenv loading or specify path if needed.

export default defineConfig({
    schema: './server/db/schema.ts',
    out: './server/db/migrations',
    dialect: 'sqlite', // Default to sqlite for dev, can be overridden via command line or separate config
    dbCredentials: {
        url: process.env.SQLITE_DB_PATH || 'server/data/dev.db',
    },
    verbose: true,
    strict: true,
});
