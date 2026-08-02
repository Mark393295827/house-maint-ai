import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { SQLiteFallback } from '../config/database.js';

const temporaryPaths: string[] = [];

afterEach(() => {
    for (const filePath of temporaryPaths.splice(0)) {
        for (const suffix of ['', '-shm', '-wal']) {
            fs.rmSync(`${filePath}${suffix}`, { force: true });
        }
    }
});

describe('SQLite analytics schema bootstrap', () => {
    it('adds analytics evidence columns to an existing reports table', async () => {
        const databasePath = path.join(
            os.tmpdir(),
            `house-maint-analytics-${process.pid}-${Date.now()}.db`,
        );
        temporaryPaths.push(databasePath);

        const legacyDatabase = new Database(databasePath);
        legacyDatabase.exec(`
            CREATE TABLE reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                status TEXT,
                matched_worker_id INTEGER,
                created_at TEXT
            );
        `);
        legacyDatabase.close();

        const adapter = new SQLiteFallback(databasePath);
        const result = await adapter.query<{
            severity_tag: string;
            diagnosis_correct: number | null;
            first_time_fix: number | null;
        }>(`
            SELECT severity_tag, diagnosis_correct, first_time_fix
            FROM reports
        `);

        expect(result.rows).toEqual([]);

        const columns = await adapter.query<{ name: string }>(`
            SELECT name
            FROM pragma_table_info('reports')
        `);
        (adapter as unknown as { db: Database.Database }).db.close();

        expect(columns.rows.map((column) => column.name)).toEqual(expect.arrayContaining([
            'severity_tag',
            'diagnosis_correct',
            'first_time_fix',
        ]));
    });
});
