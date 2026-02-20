
import { vi, describe, it, expect, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';

// 1. Mock ioredis (Hoisted)
vi.mock('ioredis', () => {
    const EventEmitter = require('events');
    class CheckRedis extends EventEmitter {
        constructor() {
            super();
            setImmediate(() => this.emit('connect'));
        }
        async get() { return null; }
        async setex() { return 'OK'; }
        async del() { return 1; }
        async quit() { return 'OK'; }
        on(event: string, cb: any) {
            if (event === 'connect') cb();
            return this;
        }
    }
    return { default: CheckRedis };
});

// 2. Mock Database (Hoisted)
vi.mock('../server/config/database.js', async (importOriginal) => {
    const Database = require('better-sqlite3');
    const db = new Database(':memory:');
    db.pragma('journal_mode = WAL');

    // Init Schema immediately
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT UNIQUE,
            password_hash TEXT,
            name TEXT,
            role TEXT DEFAULT 'user',
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            title TEXT,
            description TEXT,
            category TEXT,
            voice_url TEXT,
            video_url TEXT,
            image_urls TEXT,
            status TEXT DEFAULT 'pending',
            matched_worker_id INTEGER,
            latitude REAL,
            longitude REAL,
            urgency_score INTEGER DEFAULT 0,
            diagnosis_result TEXT,
            matched_at TEXT,
            completed_at TEXT,
            resolution_details TEXT,
            issue_type TEXT,
            severity TEXT,
            diagnosis_summary TEXT,
            confidence_score REAL,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            objective TEXT,
            status TEXT DEFAULT 'new',
            priority INTEGER DEFAULT 0,
            inputs TEXT,
            outputs TEXT,
            owner_claw TEXT,
            score REAL,
            failure_reason TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS pheromone_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER,
            actor TEXT,
            event_type TEXT,
            payload TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );
    `);

    // Helper to convert params
    const convertParams = (sql: string, params?: any[]) => {
        if (!params) return { sql, params: [] };
        let convertedSql = sql;
        for (let i = params.length; i >= 1; i--) {
            convertedSql = convertedSql.replace(new RegExp('\\$' + i, 'g'), '?');
        }
        convertedSql = convertedSql
            .replace(/RETURNING\s+[\w,\s]+/gi, '')
            .replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
            .replace(/CURRENT_TIMESTAMP/gi, "datetime('now')")
            .replace(/::[\w]+/g, '');
        return { sql: convertedSql, params: params || [] };
    };

    const mockQuery = async (text: string, params?: any[]) => {
        const { sql, params: convertedParams } = convertParams(text, params);

        try {
            const trimmedSql = sql.trim().toUpperCase();

            if (trimmedSql.startsWith('SELECT')) {
                const rows = db.prepare(sql).all(...convertedParams);
                return { rows, rowCount: rows.length };
            } else if (trimmedSql.startsWith('INSERT') || trimmedSql.startsWith('UPDATE') || trimmedSql.startsWith('DELETE')) {
                const stmt = db.prepare(sql);
                const result = stmt.run(...convertedParams);

                if (text.toUpperCase().includes('RETURNING')) {
                    if (trimmedSql.startsWith('INSERT')) {
                        const tableName = text.match(/INSERT\s+INTO\s+(\w+)/i)?.[1];
                        if (tableName) {
                            const row = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(result.lastInsertRowid);
                            return { rows: [row], rowCount: 1 };
                        }
                    } else if (trimmedSql.startsWith('UPDATE')) {
                        const tableName = text.match(/UPDATE\s+(\w+)/i)?.[1];
                        const id = params ? params[params.length - 1] : undefined;
                        if (tableName && id) {
                            const row = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(id);
                            return { rows: [row], rowCount: 1 };
                        }
                    }
                }
                return { rows: [], rowCount: result.changes };
            }
            db.exec(sql);
            return { rows: [], rowCount: 0 };
        } catch (e: any) {
            console.error(`DB ERROR: ${e.message} \n SQL: ${sql}`);
            throw e;
        }
    };

    return {
        default: {
            query: mockQuery,
            isSQLite: true
        },
        query: mockQuery,
        isSQLite: true
    };
});

// 3. Mock AI Service
vi.mock('../server/services/ai.js', () => ({
    aiService: {
        diagnoseIssue: vi.fn().mockResolvedValue({
            diagnosis: {
                issue_identified: 'Leaking Faucet',
                root_cause: 'Worn washer',
                severity: 'minor',
                urgency_score: 3,
                confidence_score: 0.95,
                diagnosis_summary: 'The faucet washer needs replacement.'
            }
        })
    }
}));

// Import deps
import db from '../server/config/database.js';
import { diagnosticsClaw } from '../server/services/diagnostics_claw.js';

describe('Diagnostics Claw Service', () => {
    let userId: number;

    beforeAll(async () => {
        const userRes = await db.query(
            "INSERT INTO users (phone, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id",
            ['claw_test', 'hash', 'Claw Tester', 'user']
        );
        userId = userRes.rows[0].id;
    });

    it('should autonomously process a pending report via Blackboard Task', async () => {
        // 1. Create a pending report
        const reportRes = await db.query(`
            INSERT INTO reports (user_id, title, description, status)
            VALUES ($1, $2, $3, $4) RETURNING id
        `, [userId, 'Leaking Faucet', 'The kitchen faucet is leaking non-stop.', 'pending']);
        const reportId = reportRes.rows[0].id;

        // 2. Create a Task for the claw
        await db.query(`
            INSERT INTO tasks (title, objective, status, priority, inputs)
            VALUES ($1, $2, $3, $4, $5)
        `, ['Diagnose Leak', 'diagnose_image', 'new', 10, JSON.stringify({ report_id: reportId })]);

        // 3. Trigger the claw manually
        await (diagnosticsClaw as any).processBlackboardTasks();

        // 4. Verify the report was updated (Legacy Side-Effect)
        const { rows } = await db.query("SELECT * FROM reports WHERE id = $1", [reportId]);
        const report = rows[0];

        expect(report.status).toBe('matching');
        expect(report.diagnosis_result).toBeDefined();

        const diagnosis = JSON.parse(report.diagnosis_result);
        expect(diagnosis.diagnosis.issue_identified).toBeDefined();

        // 5. Verify Task Completion
        const { rows: taskRows } = await db.query("SELECT * FROM tasks WHERE objective = 'diagnose_image'");
        expect(taskRows[0].status).toBe('done');
        expect(taskRows[0].outputs).toBeDefined();
    });

    it('should ignore tasks that are not new', async () => {
        // Create a completed task
        await db.query(`
            INSERT INTO tasks (title, objective, status, priority, inputs)
            VALUES ($1, $2, $3, $4, $5)
        `, ['Already Done', 'diagnose_image', 'done', 5, '{}']);

        await (diagnosticsClaw as any).processBlackboardTasks();

        // Should rely on SQL filter, hard to verify without spy. 
        // But if it processed, it might error on empty inputs/report_id.
        // If no error, likely ignored.
        const { rows } = await db.query("SELECT * FROM tasks WHERE title = $1", ['Already Done']);
        expect(rows[0].status).toBe('done');
    });
});
