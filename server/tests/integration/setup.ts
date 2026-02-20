import pool from '../../config/database';
import { isSQLite } from '../../config/database';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const setupTestDb = async () => {
    console.log('Starting setupTestDb...');
    try {
        // Only run for SQLite in-memory tests
        if (!isSQLite) {
            throw new Error('Integration tests currently only support SQLite');
        }

        // Initialize schema via pool query which triggers initSchema internally
        // We verify table exists instead of manually running schema

        try {
            await pool.query('SELECT count(*) FROM refresh_tokens');
        } catch (e) {
            // Ignore error if table check fails, initSchema should handle it
        }
    } catch (err) {
        console.error('setupTestDb FAILED:', err);
        throw err;
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
