import { vi, describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { MASTER_SCHEMA, mockQuery } from './testHelper';

vi.mock('ioredis', () => {
    const EventEmitter = require('events');
    class CheckRedis extends EventEmitter {
        constructor() { super(); setImmediate(() => this.emit('connect')); }
        async get() { return null; }
        async setex() { return 'OK'; }
        async del() { return 1; }
        async quit() { return 'OK'; }
        on(event: string, cb: any) { if (event === 'connect') cb(); return this; }
    }
    return { default: CheckRedis };
});

vi.mock('../server/config/database.js', async () => {
    const Database = require('better-sqlite3');
    const db = new Database(':memory:');
    db.exec(MASTER_SCHEMA);
    return { default: { query: mockQuery(db), isSQLite: true }, query: mockQuery(db), isSQLite: true };
});

import app from '../server/index.js';
import db from '../server/config/database.js';

const TEST_SECRET = process.env.JWT_SECRET || 'test_secret';

describe('AI Repair Planning API', () => {
    let userToken: string;
    let workerToken: string;
    let userId: number;
    let workerUserId: number;
    let workerId: number;

    beforeAll(async () => {
        const u = await db.query("INSERT INTO users (phone, name, role) VALUES ('100', 'U', 'user') RETURNING id");
        userId = u.rows[0].id;
        userToken = jwt.sign({ id: userId, role: 'user' }, TEST_SECRET);

        const wu = await db.query("INSERT INTO users (phone, name, role) VALUES ('101', 'W', 'worker') RETURNING id");
        workerUserId = wu.rows[0].id;
        const w = await db.query("INSERT INTO workers (user_id) VALUES ($1) RETURNING id", [workerUserId]);
        workerId = w.rows[0].id;
        workerToken = jwt.sign({ id: workerUserId, role: 'worker' }, TEST_SECRET);
    });

    it('should allow report owner to generate a plan', async () => {
        const rep = await request(app)
            .post('/api/v1/reports')
            .set('Cookie', [`accessToken=${userToken}`])
            .send({ title: 'Title', description: 'D'.repeat(10), category: 'plumbing' });
        
        expect(rep.status).toBe(201);
        expect(rep.body.data).toBeDefined();
        const rId = rep.body.data.report.id;

        const res = await request(app)
            .post(`/api/v1/reports/${rId}/plan`)
            .set('Cookie', [`accessToken=${userToken}`]);

        expect(res.status).toBe(200);
        expect(res.body.data.plan).toBeDefined();
    });

    it('should allow assigned worker to generate a plan', async () => {
        const { rows } = await db.query(
            "INSERT INTO reports (user_id, title, description, matched_worker_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING id",
            [userId, 'T2', 'D'.repeat(10), workerId, 'matched']
        );
        const rId = rows[0].id;

        const res = await request(app)
            .post(`/api/v1/reports/${rId}/plan`)
            .set('Cookie', [`accessToken=${workerToken}`]);

        expect(res.status).toBe(200);
        expect(res.body.data.plan).toBeDefined();
    });
});
