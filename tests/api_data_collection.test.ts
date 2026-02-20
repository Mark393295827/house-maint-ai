
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../server/index.js';
import db from '../server/config/database.js';
import * as jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../server/config/secrets.js';

describe('Data Collection APIs', () => {
    let userToken: string;
    let workerToken: string;
    let userId: number;
    let workerId: number;
    let workerUserId: number;
    let reportId: number;

    beforeAll(async () => {
        // 1. Create User
        const userRes = await db.query(`
            INSERT INTO users (phone, password_hash, name, role) 
            VALUES ('test_user_' || hex(randomblob(4)), 'hash', 'Test User', 'user') 
            RETURNING id
        `);
        userId = userRes.rows[0].id;
        userToken = jwt.sign({ id: userId, role: 'user' }, JWT_SECRET);

        // 2. Create Worker
        const workerUserRes = await db.query(`
            INSERT INTO users (phone, password_hash, name, role) 
            VALUES ('test_worker_' || hex(randomblob(4)), 'hash', 'Test Worker', 'worker') 
            RETURNING id
        `);
        workerUserId = workerUserRes.rows[0].id;
        workerToken = jwt.sign({ id: workerUserId, role: 'worker' }, JWT_SECRET);

        const workerRes = await db.query(`
            INSERT INTO workers (user_id, available, skills) 
            VALUES ($1, 1, '[]') 
            RETURNING id
        `, [workerUserId]);
        workerId = workerRes.rows[0].id;
    });

    describe('User Assets API', () => {
        it('should add a new asset', async () => {
            const res = await request(app)
                .post('/api/assets')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    type: 'appliance',
                    name: 'My Fridge',
                    brand: 'Samsung',
                    specs: { capacity: '500L' }
                });

            expect(res.status).toBe(201);
            expect(res.body.asset.name).toBe('My Fridge');
            expect(res.body.asset.specs).toEqual({ capacity: '500L' });
        });

        it('should list assets', async () => {
            const res = await request(app)
                .get('/api/assets')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.assets.length).toBeGreaterThan(0);
            expect(res.body.assets[0].name).toBe('My Fridge');
        });
    });

    describe('Report Completion API', () => {
        it('should allow worker to complete a job', async () => {
            // 1. Create Report assigned to worker
            const reportRes = await db.query(`
                INSERT INTO reports (user_id, title, description, status, matched_worker_id)
                VALUES ($1, 'Fix Fridge', 'Broken', 'matched', $2)
                RETURNING id
            `, [userId, workerId]);
            reportId = reportRes.rows[0].id;

            // 2. Complete it
            const res = await request(app)
                .put(`/api/reports/${reportId}/complete`)
                .set('Authorization', `Bearer ${workerToken}`)
                .send({
                    resolution_details: {
                        steps: ['Checked compressor', 'Replaced relay'],
                        parts: [{ name: 'Relay', cost: 50 }],
                        total_cost: 150
                    }
                });

            expect(res.status).toBe(200);
            expect(res.body.report.status).toBe('completed');
            expect(res.body.report.completed_at).not.toBeNull();

            // Verify DB JSON storage
            const dbReport = await db.query('SELECT resolution_details FROM reports WHERE id = $1', [reportId]);
            const details = JSON.parse(dbReport.rows[0].resolution_details);
            expect(details.total_cost).toBe(150);
        });

        it('should prevent unauthorized completion', async () => {
            // Create another worker (unauthorized)
            const otherToken = jwt.sign({ id: 9999, role: 'worker' }, JWT_SECRET);

            const res = await request(app)
                .put(`/api/reports/${reportId}/complete`)
                .set('Authorization', `Bearer ${otherToken}`)
                .send({ resolution_details: {} });

            expect(res.status).toBe(403);
        });
    });
});
