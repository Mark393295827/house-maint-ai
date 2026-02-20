
import { vi, describe, it, expect, beforeAll } from 'vitest';

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
            avatar TEXT,
            role TEXT DEFAULT 'user',
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS workers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE,
            skills TEXT,
            rating REAL DEFAULT 5.0,
            total_jobs INTEGER DEFAULT 0,
            latitude REAL,
            longitude REAL,
            available INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            title TEXT,
            description TEXT,
            category TEXT,
            status TEXT DEFAULT 'pending',
            matched_worker_id INTEGER,
            latitude REAL,
            longitude REAL,
            urgency_score INTEGER DEFAULT 0,
            diagnosis_result TEXT,
            matched_at TEXT,
            completed_at TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id INTEGER,
            worker_id INTEGER,
            score REAL,
            distance_score REAL,
            rating_score REAL,
            skill_score REAL,
            status TEXT DEFAULT 'pending'
        );
        CREATE TABLE IF NOT EXISTS user_assets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            type TEXT,
            name TEXT,
            brand TEXT,
            model TEXT
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
        default: { query: mockQuery, isSQLite: true },
        query: mockQuery,
        isSQLite: true
    };
});

import db from '../server/config/database.js';
import { vendorClaw } from '../server/services/vendor_claw.js';

describe('Vendor Sourcing Claw Service', () => {
    let userId: number;
    let workerId: number;

    beforeAll(async () => {
        // Setup User
        const userRes = await db.query(
            "INSERT INTO users (phone, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id",
            ['user', 'hash', 'Test User', 'user']
        );
        userId = userRes.rows[0].id;

        // Setup Worker
        const workerUserRes = await db.query(
            "INSERT INTO users (phone, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id",
            ['worker', 'hash', 'Test Worker', 'worker']
        );
        const workerUserId = workerUserRes.rows[0].id;

        const workerRes = await db.query(
            "INSERT INTO workers (user_id, skills, rating, available, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            [workerUserId, JSON.stringify(['plumbing']), 5.0, 1, 31.2, 121.4]
        );
        workerId = workerRes.rows[0].id;
    });

    it('should assign a worker to a low-urgency report', async () => {
        // 1. Create a matching report
        const reportRes = await db.query(`
            INSERT INTO reports (user_id, title, description, category, status, urgency_score, latitude, longitude)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
        `, [userId, 'Fix Leak', 'Faucet is dripping', 'plumbing', 'matching', 3, 31.21, 121.41]);
        const reportId = reportRes.rows[0].id;

        // 2. Trigger Claw
        await (vendorClaw as any).processMatchingReports();

        // 3. Verify Assignment
        const { rows } = await db.query("SELECT * FROM reports WHERE id = $1", [reportId]);
        const report = rows[0];

        expect(report.status).toBe('matched');
        expect(report.matched_worker_id).toBe(workerId);
        expect(report.matched_at).toBeDefined();
    });

    it('should broadcast a high-urgency report', async () => {
        // 1. Create a high-urgency report
        const reportRes = await db.query(`
            INSERT INTO reports (user_id, title, description, category, status, urgency_score, latitude, longitude)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
        `, [userId, 'BURST PIPE', 'FLOODING!', 'plumbing', 'matching', 10, 31.21, 121.41]);
        const reportId = reportRes.rows[0].id;

        // 2. Trigger Claw
        await (vendorClaw as any).processMatchingReports();

        // 3. Verify Broadcast
        const { rows: reportRows } = await db.query("SELECT * FROM reports WHERE id = $1", [reportId]);
        expect(reportRows[0].status).toBe('broadcasted');

        const { rows: matchRows } = await db.query("SELECT * FROM matches WHERE report_id = $1", [reportId]);
        expect(matchRows.length).toBeGreaterThan(0);
        expect(matchRows[0].worker_id).toBe(workerId);
    });
});
