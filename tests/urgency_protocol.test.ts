
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
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
            matched_at TEXT,
            completed_at TEXT,
            resolution_details TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS workers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            specialties TEXT,
            total_jobs INTEGER DEFAULT 0,
            rating REAL DEFAULT 5.0,
            is_available INTEGER DEFAULT 1,
            latitude REAL,
            longitude REAL
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

// Import App AFTER Mocks
import app from '../server/index.js';
import db from '../server/config/database.js';

const TEST_SECRET = process.env.JWT_SECRET || 'test_secret';

describe('Urgency Protocol API', () => {
    let userToken: string;
    let userId: number;
    let reportId: number;

    beforeAll(async () => {
        // Create Test User
        const userRes = await db.query(
            "INSERT INTO users (phone, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id",
            ['urgency_test', 'hash', 'Urgency Tester', 'user']
        );
        userId = userRes.rows[0].id;
        userToken = jwt.sign({ id: userId, role: 'user' }, TEST_SECRET);
    });

    it('should create a report with default urgency 0', async () => {
        const res = await request(app)
            .post('/api/reports')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                title: 'Normal Leak',
                description: 'Just a small drip',
                category: 'plumbing'
            });

        expect(res.status).toBe(201);
        expect(res.body.report.urgency_score).toBe(0);
        reportId = res.body.report.id;
    });

    it('should update urgency score to 10 (Hair on Fire)', async () => {
        const res = await request(app)
            .put(`/api/reports/${reportId}`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                urgency_score: 10
            });

        expect(res.status).toBe(200);
        expect(res.body.report.urgency_score).toBe(10);
    });

    it('should create a report with explicit urgency', async () => {
        const res = await request(app)
            .post('/api/reports')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                title: 'FIRE HAZARD',
                description: 'Sparks flying everywhere!',
                category: 'electrical',
                urgency_score: 9
            });

        expect(res.status).toBe(201);
        expect(res.body.report.urgency_score).toBe(9);
    });

    it('should validate urgency score range (0-10)', async () => {
        const res = await request(app)
            .post('/api/reports')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                title: 'Invalid Urgency',
                description: 'Test description',
                urgency_score: 11
            });

        expect(res.status).toBe(400);
    });
});
