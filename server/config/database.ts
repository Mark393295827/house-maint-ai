import pg from 'pg';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DB_PASSWORD } from './secrets.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Interface matching pg.Pool query result
interface QueryResult<T = any> {
    rows: T[];
    rowCount: number | null;
}

// Common interface for both database implementations
interface DatabaseAdapter {
    query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
    on?(event: string, callback: (...args: any[]) => void): void;
}

// SQLite fallback class that mimics pg.Pool interface
export class SQLiteFallback {
    private db: Database.Database;
    private initialized: boolean = false;

    constructor(dbPath: string) {
        // Ensure data directory exists (skip for in-memory DB)
        if (dbPath !== ':memory:') {
            const dataDir = path.dirname(dbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
        }

        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        console.warn('⚠️  Using SQLite fallback (Data stored in ' + dbPath + ')');
        console.log('DEBUG: DB Initialized ' + Math.random());
    }

    /**
     * Initialize the database with schema if not already done
     */
    async initSchema(): Promise<void> {
        if (this.initialized) return;

        try {
            const schemaPath = path.join(__dirname, '..', 'models', 'schema.sql');
            if (fs.existsSync(schemaPath)) {
                const schema = fs.readFileSync(schemaPath, 'utf-8');
                this.db.exec(schema);
                console.log('✅ SQLite schema initialized');
            } else {
                console.error('❌ Schema file not found at:', schemaPath);
            }

            const blackboardPath = path.join(__dirname, '..', 'models', 'blackboard.sql');
            if (fs.existsSync(blackboardPath)) {
                const blackboardSchema = fs.readFileSync(blackboardPath, 'utf-8');
                this.db.exec(blackboardSchema);
                console.log('✅ Blackboard schema initialized');
            }

            this.initialized = true;
        } catch (err) {
            console.error('❌ SQLiteFallback initSchema FAILED:', err);
            throw err;
        }
    }

    /**
     * Convert PostgreSQL-style $1, $2 parameters to SQLite ? placeholders
     */
    private convertParams(sql: string, params?: any[]): { sql: string; params: any[] } {
        if (!params || params.length === 0) {
            return { sql, params: [] };
        }

        // Replace $1, $2, etc. with ?
        let convertedSql = sql;
        for (let i = params.length; i >= 1; i--) {
            convertedSql = convertedSql.replace(new RegExp('\\$' + i, 'g'), '?');
        }

        // Handle PostgreSQL-specific syntax
        convertedSql = convertedSql
            .replace(/RETURNING\s+[\w,\s]+/gi, '') // Remove RETURNING clause (handled separately)
            .replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
            .replace(/\bTIMESTAMP(TZ)?\b/gi, 'TEXT') // Convert types with word boundaries
            .replace(/NOW\(\)/gi, "datetime('now')")
            .replace(/CURRENT_TIMESTAMP/gi, "datetime('now')")
            .replace(/::[\w]+/g, ''); // Remove type casts like ::text

        return { sql: convertedSql, params };
    }

    /**
     * Execute a query with PostgreSQL-compatible interface
     */
    async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
        await this.initSchema();

        const { sql, params: convertedParams } = this.convertParams(text, params);
        const trimmedSql = sql.trim().toUpperCase();

        try {
            if (trimmedSql.startsWith('SELECT')) {
                const rows = this.db.prepare(sql).all(...convertedParams) as T[];
                return { rows, rowCount: rows.length };
            } else if (trimmedSql.startsWith('INSERT')) {
                const stmt = this.db.prepare(sql);
                const result = stmt.run(...convertedParams);

                // Handle RETURNING clause by fetching the inserted row
                if (text.toUpperCase().includes('RETURNING')) {
                    const lastId = result.lastInsertRowid;
                    // Extract table name from INSERT INTO table_name
                    const tableMatch = text.match(/INSERT\s+INTO\s+(\w+)/i);
                    if (tableMatch) {
                        const tableName = tableMatch[1];
                        const rows = this.db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).all(lastId) as T[];
                        return { rows, rowCount: 1 };
                    }
                }
                return { rows: [], rowCount: result.changes };
            } else if (trimmedSql.startsWith('UPDATE')) {
                const stmt = this.db.prepare(sql);
                const result = stmt.run(...convertedParams);

                // Handle RETURNING clause
                if (text.toUpperCase().includes('RETURNING')) {
                    const tableMatch = text.match(/UPDATE\s+(\w+)/i);
                    const whereMatch = text.match(/WHERE\s+id\s*=\s*\$(\d+)/i);
                    if (tableMatch && whereMatch && params) {
                        const tableName = tableMatch[1];
                        const idParamIndex = parseInt(whereMatch[1]) - 1;
                        const id = params[idParamIndex];
                        const rows = this.db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).all(id) as T[];
                        return { rows, rowCount: result.changes };
                    }
                }
                return { rows: [], rowCount: result.changes };
            } else if (trimmedSql.startsWith('DELETE')) {
                const stmt = this.db.prepare(sql);
                const result = stmt.run(...convertedParams);
                return { rows: [], rowCount: result.changes };
            } else {
                // For other statements (CREATE, DROP, etc.)
                this.db.exec(sql);
                return { rows: [], rowCount: 0 };
            }
        } catch (error) {
            console.error('SQLite query error:', error);
            console.error('Original SQL:', text);
            console.error('Converted SQL:', sql);
            throw error;
        }
    }

    on(event: string, callback: (...args: any[]) => void): void {
        // No-op for compatibility
    }
}

// PostgreSQL Pool setup
const { Pool } = pg;

const pgPool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'house_maint',
    password: DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
});

// Determine which database to use
const useSQLite = process.env.DB_USE_SQLITE === 'true' ||
    (process.env.NODE_ENV !== 'production' && !process.env.DB_HOST && !process.env.DOCKER_ENV);

// Use DatabaseAdapter type to ensure consistent interface
let pool: DatabaseAdapter;

if (useSQLite) {
    const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'data', 'dev.db');
    pool = new SQLiteFallback(dbPath);
} else {
    pool = pgPool as unknown as DatabaseAdapter;

    // Test connection
    pgPool.on('error', (err, client) => {
        console.error('Unexpected error on idle client', err);
        process.exit(-1);
    });
}

export const query = <T = any>(text: string, params?: any[]): Promise<QueryResult<T>> => pool.query<T>(text, params);
export const isSQLite = useSQLite;
export default pool;

