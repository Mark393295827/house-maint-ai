
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../server/index';
import db from '../server/config/database';
import * as jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../server/config/secrets';

// Mock Redis
vi.mock('ioredis', () => {
    return {
        default: vi.fn(() => ({
            get: vi.fn(),
            set: vi.fn(),
            del: vi.fn(),
            quit: vi.fn(),
            on: vi.fn(),
        })),
    };
});

describe('Enhanced Matching Logic', () => {
    let userToken: string;
    let userId: number;
    let workerSamsungId: number;
    let workerGenericId: number;

    beforeEach(async () => {
        // 1. Create a User
        const userRes = await db.query(`
            INSERT INTO users (phone, password_hash, name, role) 
            VALUES ('match_user_' || hex(randomblob(4)), 'hash', 'Test User', 'user') 
            RETURNING id
        `);
        userId = userRes.rows[0].id;
        userToken = jwt.sign({ id: userId, role: 'user' }, JWT_SECRET);

        // 2. Add an Asset (Samsung Fridge)
        await db.query(`
            INSERT INTO user_assets (user_id, type, name, brand, model)
            VALUES ($1, 'appliance', 'Kitchen Fridge', 'Samsung', 'RF28')
        `, [userId]);

        // 3. Create Worker A (Has "Samsung" skill)
        const workerAUser = await db.query(`
            INSERT INTO users (phone, password_hash, name, role) 
            VALUES ('worker_samsung_' || hex(randomblob(4)), 'hash', 'Samsung Expert', 'worker') 
            RETURNING id
        `);
        const workerAUserId = workerAUser.rows[0].id;

        const wA = await db.query(`
            INSERT INTO workers (user_id, skills, rating, available, latitude, longitude)
            VALUES ($1, $2, 4.5, 1, 40.7128, -74.0060)
            RETURNING id
        `, [workerAUserId, JSON.stringify(['appliance', 'Samsung', 'Refrigerator'])]);
        workerSamsungId = wA.rows[0].id;

        // 4. Create Worker B (Generic Appliance)
        const workerBUser = await db.query(`
            INSERT INTO users (phone, password_hash, name, role) 
            VALUES ('worker_generic_' || hex(randomblob(4)), 'hash', 'Generic Worker', 'worker') 
            RETURNING id
        `);
        const workerBUserId = workerBUser.rows[0].id;

        const wB = await db.query(`
            INSERT INTO workers (user_id, skills, rating, available, latitude, longitude)
            VALUES ($1, $2, 4.5, 1, 40.7128, -74.0060)
            RETURNING id
        `, [workerBUserId, JSON.stringify(['appliance'])]);
        workerGenericId = wB.rows[0].id;
    });

    it('should prioritize worker with matching asset brand', async () => {
        // Create a report that mentions 'Samsung' or 'Fridge' implictly matches the user's asset
        // The asset is "Samsung Kitchen Fridge"
        // Description "My Samsung Fridge is broken" -> Matches "Samsung" brand and "Fridge" name

        const reportRes = await db.query(`
            INSERT INTO reports (user_id, title, description, category, latitude, longitude, status)
            VALUES ($1, 'Fridge Broken', 'My Samsung Fridge is not cooling', 'appliance', 40.7128, -74.0060, 'pending')
            RETURNING id
        `, [userId]);
        const reportId = reportRes.rows[0].id;

        const matchRes = await request(app)
            .get('/api/workers/match')
            .set('Authorization', `Bearer ${userToken}`)
            .query({ report_id: reportId, limit: 10 });

        expect(matchRes.status).toBe(200);

        // Find our workers in the list
        const workerA = matchRes.body.matches.find((w: any) => w.id === workerSamsungId);
        const workerB = matchRes.body.matches.find((w: any) => w.id === workerGenericId);

        expect(workerA).toBeDefined();
        expect(workerB).toBeDefined();

        // Worker A should have higher score due to Samsung match
        console.log('Worker A Score:', workerA.score, 'Asset Score:', workerA.assetScore);
        console.log('Worker B Score:', workerB.score, 'Asset Score:', workerB.assetScore);

        expect(workerA.score).toBeGreaterThan(workerB.score);
        // Verify asset score component specifically
        expect(workerA.assetScore).toBeGreaterThan(0);
    });
});
