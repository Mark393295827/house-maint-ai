/**
 * Database Abstraction Layer
 * Supports both SQLite (development) and PostgreSQL (production)
 * 
 * Usage:
 *   import db from './config/db.js';
 *   const users = await db.all('SELECT * FROM users WHERE role = $1', ['admin']);
 */

import pg from 'pg';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine database type from environment
const DATABASE_URL = process.env.DATABASE_URL || '';
const isPostgres = DATABASE_URL.startsWith('postgresql://') || DATABASE_URL.startsWith('postgres://');

let pool = null;
let sqliteDb = null;

/**
 * Initialize database connection
 */
async function initDatabase() {
    if (isPostgres) {
        // PostgreSQL connection pool
        pool = new pg.Pool({
            connectionString: DATABASE_URL,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        // Test connection
        try {
            const client = await pool.connect();
            console.log('✅ Connected to PostgreSQL');
            client.release();
        } catch (err) {
            console.error('❌ PostgreSQL connection error:', err.message);
            throw err;
        }
    } else {
        // SQLite fallback for development
        const dataDir = join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        const dbPath = join(dataDir, 'app.db');
        sqliteDb = new Database(dbPath);
        sqliteDb.pragma('journal_mode = WAL');
        sqliteDb.pragma('foreign_keys = ON');
        console.log('✅ Connected to SQLite:', dbPath);
    }
}

/**
 * Convert parameterized query from PostgreSQL style ($1, $2) to SQLite style (?, ?)
 */
function convertParams(sql, params) {
    if (!isPostgres && params) {
        // Replace $1, $2, etc. with ?
        let convertedSql = sql;
        for (let i = params.length; i >= 1; i--) {
            convertedSql = convertedSql.replace(new RegExp(`\\$${i}`, 'g'), '?');
        }
        return convertedSql;
    }
    return sql;
}

/**
 * Execute a query and return all rows
 */
async function all(sql, params = []) {
    if (isPostgres) {
        const result = await pool.query(sql, params);
        return result.rows;
    } else {
        const convertedSql = convertParams(sql, params);
        return sqliteDb.prepare(convertedSql).all(...params);
    }
}

/**
 * Execute a query and return a single row
 */
async function get(sql, params = []) {
    if (isPostgres) {
        const result = await pool.query(sql, params);
        return result.rows[0] || null;
    } else {
        const convertedSql = convertParams(sql, params);
        return sqliteDb.prepare(convertedSql).get(...params);
    }
}

/**
 * Execute a query (INSERT, UPDATE, DELETE) and return result info
 */
async function run(sql, params = []) {
    if (isPostgres) {
        const result = await pool.query(sql, params);
        return {
            changes: result.rowCount,
            lastInsertRowid: result.rows[0]?.id || null
        };
    } else {
        const convertedSql = convertParams(sql, params);
        const stmt = sqliteDb.prepare(convertedSql);
        const result = stmt.run(...params);
        return {
            changes: result.changes,
            lastInsertRowid: result.lastInsertRowid
        };
    }
}

/**
 * Execute raw SQL (for schema setup, etc.)
 */
async function exec(sql) {
    if (isPostgres) {
        await pool.query(sql);
    } else {
        sqliteDb.exec(sql);
    }
}

/**
 * Close database connection
 */
async function close() {
    if (isPostgres && pool) {
        await pool.end();
        console.log('PostgreSQL connection closed');
    } else if (sqliteDb) {
        sqliteDb.close();
        console.log('SQLite connection closed');
    }
}

/**
 * Check if using PostgreSQL
 */
function isUsingPostgres() {
    return isPostgres;
}

/**
 * Get the raw pool (PostgreSQL) or database (SQLite) for advanced operations
 */
function getRaw() {
    return isPostgres ? pool : sqliteDb;
}

// Initialize on import
await initDatabase();

const db = {
    all,
    get,
    run,
    exec,
    close,
    isUsingPostgres,
    getRaw,
};

export default db;
