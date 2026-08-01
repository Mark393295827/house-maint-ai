import pg from 'pg';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { AsyncLocalStorage } from 'node:async_hooks';
import { fileURLToPath } from 'url';
import { DB_PASSWORD } from './secrets.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Interface matching the subset of pg.QueryResult used by the application.
export interface QueryResult<T = unknown> {
    rows: T[];
    rowCount: number | null;
}

export interface TransactionClient {
    query<T = unknown>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
}

// Common interface for both database implementations
interface DatabaseAdapter {
    query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
    on?(event: string, callback: (...args: any[]) => void): void;
}

const transactionControlPattern =
    /^(?:BEGIN|START\s+TRANSACTION|COMMIT|ROLLBACK|SAVEPOINT|RELEASE\s+SAVEPOINT)\b/i;

function rejectTransactionControl(text: string): void {
    if (transactionControlPattern.test(text.trimStart())) {
        throw new Error('Transaction control statements are not allowed; use withTransaction');
    }
}

function transactionFailure(originalError: unknown, rollbackError: unknown): AggregateError {
    return new AggregateError(
        [originalError, rollbackError],
        'Transaction failed and rollback also failed',
        { cause: originalError },
    );
}

// SQLite fallback class that mimics pg.Pool interface
export class SQLiteFallback implements DatabaseAdapter {
    private db: Database.Database;
    private initialized: boolean = false;
    private gateTail: Promise<void> = Promise.resolve();
    private transactionScope = new AsyncLocalStorage<symbol>();

    constructor(dbPath: string) {
        // Ensure data directory exists (skip for in-memory DB)
        if (dbPath !== ':memory:') {
            const dataDir = path.dirname(dbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
        }

        this.db = new Database(dbPath);
        console.warn('⚠️  Using SQLite fallback (Data stored in ' + dbPath + ')');
    }

    /**
     * Initialize the database with schema if not already done
     */
    async initSchema(): Promise<void> {
        if (this.transactionScope.getStore()) {
            throw new Error('Use the transaction client inside a transaction callback');
        }
        await this.runExclusive(() => this.initSchemaOwned());
    }

    private runExclusive<T>(operation: () => Promise<T> | T): Promise<T> {
        const result = this.gateTail.then(operation);
        this.gateTail = result.then(
            () => undefined,
            () => undefined,
        );
        return result;
    }

    private initSchemaOwned(): void {
        if (this.initialized) return;

        try {
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('foreign_keys = ON');

            const schemaPath = path.join(__dirname, '..', 'models', 'schema.sql');
            if (fs.existsSync(schemaPath)) {
                const schema = fs.readFileSync(schemaPath, 'utf-8');
                this.db.exec(schema);
                this.ensureAnalyticsReportColumns();
                this.ensurePaymentOrderColumns();
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

    private ensureAnalyticsReportColumns(): void {
        const columns = new Set(
            (this.db.prepare('PRAGMA table_info(reports)').all() as Array<{ name: string }>)
                .map((column) => column.name),
        );
        const additions = [
            {
                name: 'severity_tag',
                definition: "TEXT DEFAULT '48h' CHECK(severity_tag IN ('diy', '48h', 'emergency'))",
            },
            { name: 'diagnosis_correct', definition: 'INTEGER' },
            { name: 'first_time_fix', definition: 'INTEGER' },
        ];

        for (const column of additions) {
            if (!columns.has(column.name)) {
                this.db.exec(
                    `ALTER TABLE reports ADD COLUMN ${column.name} ${column.definition}`,
                );
            }
        }
    }

    /**
     * CREATE TABLE IF NOT EXISTS does not upgrade an existing SQLite table.
     * Converge the legacy payment table before checkout routes can use the
     * WeChat trade number introduced in later schemas.
     */
    private ensurePaymentOrderColumns(): void {
        const tableExists = this.db.prepare(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'orders'",
        ).get();
        if (!tableExists) {
            return;
        }

        const columns = new Set(
            (this.db.prepare('PRAGMA table_info(orders)').all() as Array<{ name: string }>)
                .map((column) => column.name),
        );

        if (!columns.has('wechat_out_trade_no')) {
            this.db.exec('ALTER TABLE orders ADD COLUMN wechat_out_trade_no TEXT');
        }

        this.db.exec(
            'CREATE UNIQUE INDEX IF NOT EXISTS orders_wechat_out_trade_no_unique ON orders (wechat_out_trade_no)',
        );
    }

    close(): void {
        this.db.close();
    }

    /**
     * Convert PostgreSQL-style $1, $2 parameters to SQLite ? placeholders
     */
    private convertParams(sql: string, params?: any[]): { sql: string; params: any[] } {
        if (!params || params.length === 0) {
            return { sql, params: [] };
        }

        const convertedParams: any[] = [];
        let convertedSql = sql;
        
        // Find all $N markers
        const paramMarkers = sql.match(/\$\d+/g) || [];
        
        // We need to replace them in a way that respects the index but uses ?
        // The most robust way is to use a regex callback
        convertedSql = sql.replace(/\$(\d+)/g, (match, number) => {
            const index = parseInt(number) - 1;
            if (index >= 0 && index < params.length) {
                convertedParams.push(params[index]);
                return '?';
            }
            return match; // Should not happen with valid SQL
        });

        // Handle PostgreSQL-specific syntax
        convertedSql = convertedSql
            .replace(/RETURNING\s+[\w,\s]+/gi, '') // Remove RETURNING clause (handled separately)
            .replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
            .replace(/\bTIMESTAMP(TZ)?\b/gi, 'TEXT') // Convert types with word boundaries
            .replace(/NOW\(\)/gi, "datetime('now')")
            .replace(/CURRENT_TIMESTAMP/gi, "datetime('now')")
            .replace(/::[\w]+/g, '') // Remove type casts
            .replace(/\bCOUNT\(\*\)\s+FILTER\s*\(\s*WHERE\s+((?:[^()]|\([^()]*\))+)\)/gi, 'COUNT(CASE WHEN $1 THEN 1 END)')
            .replace(/\bFILTER\s*\(\s*WHERE\s+((?:[^()]|\([^()]*\))+)\)/gi, 'CASE WHEN $1 THEN 1 END'); // Catch-all for other filters

        return { sql: convertedSql, params: convertedParams };
    }

    /**
     * Execute a query with PostgreSQL-compatible interface
     */
    async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
        if (this.transactionScope.getStore()) {
            throw new Error('Use the transaction client inside a transaction callback');
        }
        rejectTransactionControl(text);
        return this.runExclusive(() => {
            this.initSchemaOwned();
            return this.executeQueryOwned<T>(text, params);
        });
    }

    async withTransaction<T>(
        work: (client: TransactionClient) => Promise<T>,
    ): Promise<T> {
        if (this.transactionScope.getStore()) {
            throw new Error('Nested transactions are not supported');
        }

        return this.runExclusive(async () => {
            this.initSchemaOwned();
            this.db.exec('BEGIN IMMEDIATE');

            const owner = Symbol('sqlite-transaction-owner');
            let active = true;
            const client: TransactionClient = {
                query: async <Row = unknown>(
                    text: string,
                    params?: unknown[],
                ): Promise<QueryResult<Row>> => {
                    if (!active) {
                        throw new Error('Transaction client is closed');
                    }
                    if (this.transactionScope.getStore() !== owner) {
                        throw new Error('Transaction client is not owned by this callback');
                    }
                    rejectTransactionControl(text);
                    return this.executeQueryOwned<Row>(text, params as any[] | undefined);
                },
            };

            let result: T;
            try {
                result = await this.transactionScope.run(owner, () => work(client));
            } catch (error) {
                active = false;
                this.rollbackOwned(error);
                throw error;
            }

            active = false;
            try {
                this.db.exec('COMMIT');
            } catch (error) {
                this.rollbackOwned(error);
                throw error;
            }
            return result;
        });
    }

    private rollbackOwned(originalError: unknown): void {
        try {
            this.db.exec('ROLLBACK');
        } catch (rollbackError) {
            throw transactionFailure(originalError, rollbackError);
        }
    }

    private executeQueryOwned<T = any>(
        text: string,
        params?: any[],
    ): QueryResult<T> {
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
                    if (result.changes === 0) {
                        return { rows: [], rowCount: 0 };
                    }
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

const postgresTransactionScope = new AsyncLocalStorage<symbol>();

async function withPostgresTransaction<T>(
    work: (client: TransactionClient) => Promise<T>,
): Promise<T> {
    if (postgresTransactionScope.getStore()) {
        throw new Error('Nested transactions are not supported');
    }

    const connection = await pgPool.connect();
    let active = false;
    try {
        await connection.query('BEGIN');
        active = true;
        const owner = Symbol('postgres-transaction-owner');
        const client: TransactionClient = {
            query: async <Row = unknown>(
                text: string,
                params?: unknown[],
            ): Promise<QueryResult<Row>> => {
                if (!active) {
                    throw new Error('Transaction client is closed');
                }
                if (postgresTransactionScope.getStore() !== owner) {
                    throw new Error('Transaction client is not owned by this callback');
                }
                rejectTransactionControl(text);
                const result = await connection.query(text, params as any[] | undefined);
                return {
                    rows: result.rows as Row[],
                    rowCount: result.rowCount,
                };
            },
        };

        let result: T;
        try {
            result = await postgresTransactionScope.run(owner, () => work(client));
        } catch (error) {
            active = false;
            try {
                await connection.query('ROLLBACK');
            } catch (rollbackError) {
                throw transactionFailure(error, rollbackError);
            }
            throw error;
        }

        active = false;
        try {
            await connection.query('COMMIT');
        } catch (error) {
            try {
                await connection.query('ROLLBACK');
            } catch (rollbackError) {
                throw transactionFailure(error, rollbackError);
            }
            throw error;
        }
        return result;
    } finally {
        active = false;
        connection.release();
    }
}

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

export const query = <T = any>(
    text: string,
    params?: any[],
): Promise<QueryResult<T>> => {
    rejectTransactionControl(text);
    return pool.query<T>(text, params);
};

export function withTransaction<T>(
    work: (client: TransactionClient) => Promise<T>,
): Promise<T> {
    if (useSQLite) {
        return (pool as SQLiteFallback).withTransaction(work);
    }
    return withPostgresTransaction(work);
}

export const isSQLite = useSQLite;
export default pool;

