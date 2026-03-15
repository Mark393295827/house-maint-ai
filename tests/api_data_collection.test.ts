import { vi, describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { MASTER_SCHEMA, mockQuery } from './testHelper';

vi.mock('ioredis', () => {
    const EventEmitter = require('events');
    class MockRedis extends EventEmitter {
        constructor() { super(); setImmediate(() => this.emit('connect')); }
        async get() { return null; }
        async setex() { return 'OK'; }
        async del() { return 1; }
        async quit() { return 'OK'; }
        on(event: string, cb: any) { if (event === 'connect') cb(); return this; }
    }
    return { default: MockRedis };
});

vi.mock('../server/config/database.js', async () => {
    const Database = require('better-sqlite3');
    const db = new Database(':memory:');
    db.exec(MASTER_SCHEMA);
    return { default: { query: mockQuery(db), isSQLite: true }, query: mockQuery(db), isSQLite: true };
});

import app from '../server/index.js';
const TEST_SECRET = process.env.JWT_SECRET || 'test_secret';

describe('Data Collection APIs', () => {
    let userToken: string;
    let workerToken: string;
    let userId: number;
    let workerId: number;
    let workerUserId: number;

    beforeAll(async () => {
        const db = (await import('../server/config/database.js')).default;
        const u = await db.query("INSERT INTO users (name, phone, role) VALUES ('U', '1', 'user') RETURNING id");
        userId = u.rows[0].id;
        userToken = jwt.sign({ id: userId, role: 'user' }, TEST_SECRET);

        const wu = await db.query("INSERT INTO users (name, phone, role) VALUES ('W', '2', 'worker') RETURNING id");
        workerUserId = wu.rows[0].id;
        const w = await db.query("INSERT INTO workers (user_id) VALUES ($1) RETURNING id", [workerUserId]);
        workerId = w.rows[0].id;
        workerToken = jwt.sign({ id: workerUserId, role: 'worker' }, TEST_SECRET);
    });

    describe('User Assets API', () => {
        it('should add a new asset', async () => {
            const res = await request(app)
                .post('/api/v1/assets')
                .set('Cookie', [`accessToken=${userToken}`])
                .send({
                    type: 'appliance',
                    name: 'Dishwasher',
                    brand: 'Bosch',
                    model: '800 Series'
                });

            expect(res.status).toBe(201);
            expect(res.body.data.asset.name).toBe('Dishwasher');
        });

        it('should list assets', async () => {
            const res = await request(app)
                .get('/api/v1/assets')
                .set('Cookie', [`accessToken=${userToken}`]);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data.assets)).toBe(true);
        });
    });

    describe('Report Completion API', () => {
        it('should allow worker to complete a job', async () => {
            const db = (await import('../server/config/database.js')).default;
            const description = 'D'.repeat(10);
            const r = await db.query("INSERT INTO reports (user_id, status, matched_worker_id, title, description) VALUES ($1, 'matched', $2, 'T', $3) RETURNING id", [userId, workerId, description]);
            const rId = r.rows[0].id;

            const res = await request(app)
                .put(`/api/v1/reports/${rId}/complete`)
                .set('Cookie', [`accessToken=${workerToken}`])
                .send({ resolution_details: { fixed: true } });

            expect(res.status).toBe(200);
            expect(res.body.data.report.status).toBe('completed');
        });
    });
});
