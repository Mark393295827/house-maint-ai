import type Database from 'better-sqlite3';
import { describe, expect, it, vi } from 'vitest';
import {
    SQLiteFallback,
    withTransaction,
    type QueryResult,
    type TransactionClient,
} from '../config/database.js';

function deferred() {
    let resolve!: () => void;
    const promise = new Promise<void>((done) => {
        resolve = done;
    });
    return { promise, resolve };
}

const nextTurn = () => new Promise<void>((resolve) => setImmediate(resolve));

async function createProbeDatabase(): Promise<SQLiteFallback> {
    const database = new SQLiteFallback(':memory:');
    await database.query(`
        CREATE TABLE transaction_probe (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT NOT NULL
        )
    `);
    return database;
}

describe('database transactions', () => {
    it('exports the frozen transaction interface and commits SQLite work', async () => {
        const database = await createProbeDatabase();
        let typedResult: QueryResult<{ label: string }> | undefined;

        try {
            expect(typeof withTransaction).toBe('function');
            const value = await database.withTransaction(async (client) => {
                await client.query(
                    'INSERT INTO transaction_probe (label) VALUES ($1)',
                    ['committed'],
                );
                typedResult = await client.query<{ label: string }>(
                    'SELECT label FROM transaction_probe',
                );
                return 42;
            });

            const pragma = await database.query<{ foreign_keys: number }>(
                'SELECT foreign_keys FROM pragma_foreign_keys',
            );
            expect(value).toBe(42);
            expect(typedResult?.rows).toEqual([{ label: 'committed' }]);
            expect(pragma.rows).toEqual([{ foreign_keys: 1 }]);
        } finally {
            database.close();
        }
    });

    it('rolls back callback rejection while a racing ordinary query stays outside', async () => {
        const database = await createProbeDatabase();
        const entered = deferred();
        const release = deferred();
        const callbackError = new Error('callback failed');
        let outsideFinished = false;

        try {
            const transaction = database.withTransaction(async (client) => {
                await client.query(
                    'INSERT INTO transaction_probe (label) VALUES ($1)',
                    ['rolled-back'],
                );
                entered.resolve();
                await release.promise;
                throw callbackError;
            });
            const rejection = expect(transaction).rejects.toBe(callbackError);

            await entered.promise;
            const outside = database.query(
                'INSERT INTO transaction_probe (label) VALUES ($1)',
                ['outside'],
            ).then(() => {
                outsideFinished = true;
            });
            await nextTurn();
            expect(outsideFinished).toBe(false);

            release.resolve();
            await rejection;
            await outside;

            const rows = await database.query<{ label: string }>(
                'SELECT label FROM transaction_probe ORDER BY id',
            );
            expect(rows.rows).toEqual([{ label: 'outside' }]);
        } finally {
            database.close();
        }
    });

    it('serializes transactions and rejects nested transaction use', async () => {
        const database = await createProbeDatabase();
        const entered = deferred();
        const release = deferred();
        const events: string[] = [];

        try {
            const first = database.withTransaction(async (client) => {
                events.push('first:start');
                await expect(database.withTransaction(async () => undefined))
                    .rejects.toThrow(/nested transaction/i);
                await expect(client.query('BEGIN'))
                    .rejects.toThrow(/transaction control/i);
                await expect(database.query('SELECT 1'))
                    .rejects.toThrow(/use the transaction client/i);
                entered.resolve();
                await release.promise;
                events.push('first:end');
            });

            await entered.promise;
            const second = database.withTransaction(async () => {
                events.push('second:start');
                events.push('second:end');
            });
            await nextTurn();
            expect(events).toEqual(['first:start']);

            release.resolve();
            await Promise.all([first, second]);
            expect(events).toEqual([
                'first:start',
                'first:end',
                'second:start',
                'second:end',
            ]);
        } finally {
            database.close();
        }
    });

    it('rejects a captured transaction client after commit', async () => {
        const database = await createProbeDatabase();
        let committedClient: TransactionClient | undefined;
        let rolledBackClient: TransactionClient | undefined;
        const rollback = new Error('rollback');

        try {
            await database.withTransaction(async (client) => {
                committedClient = client;
            });
            await expect(database.withTransaction(async (client) => {
                rolledBackClient = client;
                throw rollback;
            })).rejects.toBe(rollback);

            await expect(committedClient!.query('SELECT 1'))
                .rejects.toThrow(/transaction client is closed/i);
            await expect(rolledBackClient!.query('SELECT 1'))
                .rejects.toThrow(/transaction client is closed/i);
        } finally {
            database.close();
        }
    });

    it('rolls back and rejects when commit fails', async () => {
        const database = await createProbeDatabase();

        try {
            await database.query('CREATE TABLE parent (id INTEGER PRIMARY KEY)');
            await database.query(`
                CREATE TABLE child (
                    parent_id INTEGER NOT NULL,
                    FOREIGN KEY (parent_id) REFERENCES parent(id)
                        DEFERRABLE INITIALLY DEFERRED
                )
            `);

            await expect(database.withTransaction(async (client) => {
                await client.query('INSERT INTO child (parent_id) VALUES ($1)', [404]);
            })).rejects.toThrow(/foreign key constraint failed/i);

            const count = await database.query<{ count: number }>(
                'SELECT COUNT(*) AS count FROM child',
            );
            expect(count.rows).toEqual([{ count: 0 }]);
        } finally {
            database.close();
        }
    });

    it('preserves callback and rollback failures together', async () => {
        const database = await createProbeDatabase();
        const callbackError = new Error('original callback error');
        const rollbackError = new Error('rollback failed');
        const raw = (database as unknown as { db: Database.Database }).db;
        const originalExec = raw.exec.bind(raw);
        const exec = vi.spyOn(raw, 'exec').mockImplementation((sql: string) => {
            if (sql.trim().toUpperCase() === 'ROLLBACK') {
                throw rollbackError;
            }
            return originalExec(sql);
        });

        try {
            let received: unknown;
            try {
                await database.withTransaction(async () => {
                    throw callbackError;
                });
            } catch (error) {
                received = error;
            }

            expect(received).toBeInstanceOf(AggregateError);
            expect((received as AggregateError).errors)
                .toEqual([callbackError, rollbackError]);
        } finally {
            exec.mockRestore();
            if (raw.inTransaction) {
                raw.exec('ROLLBACK');
            }
            database.close();
        }
    });
});
