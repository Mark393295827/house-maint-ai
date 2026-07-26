import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../index.js';
import { JWT_SECRET } from '../middleware/auth.js';
import db from '../config/database.js';
import { aiService } from '../services/ai.js';

describe('Market research route authorization', () => {
    const userToken = jwt.sign(
        {
            id: 201,
            phone: '13800000201',
            name: 'Regular User',
            role: 'user',
            type: 'access',
        },
        JWT_SECRET,
        { expiresIn: '1h' },
    );

    const adminToken = jwt.sign(
        {
            id: 202,
            phone: '13800000202',
            name: 'Admin User',
            role: 'admin',
            type: 'access',
        },
        JWT_SECRET,
        { expiresIn: '1h' },
    );

    beforeEach(async () => {
        await db.query(`
            DELETE FROM ai_settings
            WHERE key IN ($1, $2)
        `, ['research_daily_budget_cny', 'research_max_run_cost_cny']);
        await db.query('DELETE FROM research_budget_reservations');
        vi.restoreAllMocks();
    });

    it('rejects unauthenticated research execution', async () => {
        const response = await request(app)
            .post('/api/v1/ai/research-market')
            .set('X-CSRF-Token', 'test')
            .send({ sector: 'Property maintenance' });

        expect(response.status).toBe(401);
    });

    it('rejects regular users before research execution', async () => {
        const response = await request(app)
            .post('/api/v1/ai/research-market')
            .set('Cookie', [`accessToken=${userToken}`])
            .set('X-CSRF-Token', 'test')
            .send({ sector: 'Property maintenance' });

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Not authorized');
    });

    it('fails closed before research execution when budget evidence is unavailable', async () => {
        const runResearch = vi.spyOn(aiService, 'runResearch');
        const preflight = await request(app)
            .get('/api/v1/ai/research-market/preflight')
            .set('Cookie', [`accessToken=${adminToken}`]);
        const response = await request(app)
            .post('/api/v1/ai/research-market')
            .set('Cookie', [`accessToken=${adminToken}`])
            .set('X-CSRF-Token', 'test')
            .send({ sector: 'Property maintenance' });

        expect(preflight.status).toBe(200);
        expect(preflight.body).toMatchObject({
            allowed: false,
            measurement: 'unavailable',
            reason_code: 'research_budget_settings_missing',
        });
        expect(response.status).toBe(503);
        expect(response.body.code).toBe('research_budget_settings_missing');
        expect(runResearch).not.toHaveBeenCalled();
    });
});
