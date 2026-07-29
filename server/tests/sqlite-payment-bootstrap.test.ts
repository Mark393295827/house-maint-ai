import Database from 'better-sqlite3';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { SQLiteFallback } from '../config/database.js';

const cleanupPaths: string[] = [];

afterEach(() => {
    for (const filePath of cleanupPaths.splice(0)) {
        fs.rmSync(filePath, { force: true });
        fs.rmSync(`${filePath}-shm`, { force: true });
        fs.rmSync(`${filePath}-wal`, { force: true });
    }
});

describe('SQLite payment schema bootstrap', () => {
    it('converges a legacy orders table and remains idempotent', async () => {
        const dbPath = path.join(
            os.tmpdir(),
            `house-maint-payment-bootstrap-${process.pid}-${Date.now()}.db`,
        );
        cleanupPaths.push(dbPath);

        const legacy = new Database(dbPath);
        legacy.exec(`
            CREATE TABLE orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                report_id INTEGER,
                stripe_session_id TEXT,
                amount INTEGER NOT NULL,
                currency TEXT DEFAULT 'cny',
                status TEXT DEFAULT 'pending',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `);
        legacy.close();

        const adapter = new SQLiteFallback(dbPath);
        try {
            await adapter.initSchema();
            await adapter.initSchema();

            const { rows: columns } = await adapter.query<{ name: string }>(
                "SELECT name FROM pragma_table_info('orders')",
            );
            const { rows: indexes } = await adapter.query<{ name: string }>(
                "SELECT name FROM pragma_index_list('orders')",
            );

            expect(columns.map((column) => column.name)).toContain('wechat_out_trade_no');
            expect(indexes.map((index) => index.name)).toContain('orders_wechat_out_trade_no_unique');

            const insert = await adapter.query(
                `INSERT INTO orders (user_id, report_id, wechat_out_trade_no, amount, currency, status)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id`,
                [1, null, 'HM_TEST_1', 9900, 'cny', 'pending'],
            );
            expect(insert.rowCount).toBe(1);

            await expect(adapter.query(
                `INSERT INTO orders (user_id, report_id, wechat_out_trade_no, amount, currency, status)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [1, null, 'HM_TEST_1', 9900, 'cny', 'pending'],
            )).rejects.toThrow();
        } finally {
            adapter.close();
        }
    });
});
