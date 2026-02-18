import pool from '../../config/database';
import { isSQLite } from '../../config/database';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const setupTestDb = async () => {
    // Only run for SQLite in-memory tests
    if (!isSQLite) {
        throw new Error('Integration tests currently only support SQLite');
    }

    // Initialize schema
    // We can't rely on the auto-init in database.ts because it checks for db file existence
    // which behaves differently for :memory:

    // Read schema file
    const schemaPath = path.join(__dirname, '..', '..', 'models', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        console.log('Schema content length:', schema.length);
        await pool.query(schema);
        console.log('✅ In-memory test DB initialized');
        // Verify table exists
        try {
            await pool.query('SELECT count(*) FROM refresh_tokens');
            console.log('✅ refresh_tokens table exists');
        } catch (e) {
            console.error('❌ refresh_tokens table does NOT exist:', e);
        }
    } else {
        throw new Error(`Schema file not found at ${schemaPath}`);
    }
};

export const clearTestDb = async () => {
    if (isSQLite) {
        // Truncate all tables
        // Truncate all tables (Child tables first)
        const tables = ['refresh_tokens', 'matches', 'reviews', 'posts', 'reports', 'workers', 'patterns', 'users'];
        for (const table of tables) {
            try {
                await pool.query(`DELETE FROM ${table}`);
            } catch (e) {
                // Ignore if table doesn't exist
            }
        }
    }
};
