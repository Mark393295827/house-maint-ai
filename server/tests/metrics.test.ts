import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';
import { resetMetrics } from '../middleware/metricsCollector.js';
import db from '../config/database.js';

describe('Metrics API', () => {
    const adminToken = jwt.sign(
        { id: 1, phone: '13800000001', name: 'Admin', role: 'admin', type: 'access' },
        JWT_SECRET,
        { expiresIn: '1h' }
    );

    const userToken = jwt.sign(
        { id: 2, phone: '13800000002', name: 'User', role: 'user', type: 'access' },
        JWT_SECRET,
        { expiresIn: '1h' }
    );

    const managerToken = jwt.sign(
        { id: 3, phone: '13800000003', name: 'Manager', role: 'manager', type: 'access' },
        JWT_SECRET,
        { expiresIn: '1h' }
    );

    beforeEach(async () => {
        resetMetrics();
        await db.query('DELETE FROM ai_usage_logs');
    });

    it('should reject regular users (403)', async () => {
        const res = await request(app)
            .get('/api/v1/metrics')
            .set('Cookie', [`accessToken=${userToken}`]);

        expect(res.status).toBe(403);
    });

    it('should reject unauthenticated requests (401)', async () => {
        const res = await request(app).get('/api/v1/metrics');
        expect(res.status).toBe(401);
    });

    it('should return metrics shape for admin', async () => {
        const res = await request(app)
            .get('/api/v1/metrics')
            .set('Cookie', [`accessToken=${adminToken}`]);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('system');
        expect(res.body.data).toHaveProperty('requests');
        expect(res.body.data).toHaveProperty('response_time');
        expect(res.body.data).toHaveProperty('sda_cycles');
        expect(res.body.data).toHaveProperty('agents');
        expect(res.body.data.system).toHaveProperty('uptime_ms');
        expect(res.body.data.system).toHaveProperty('uptime_human');
    });

    it('should return health stats for admin', async () => {
        const res = await request(app)
            .get('/api/v1/metrics/health')
            .set('Cookie', [`accessToken=${adminToken}`]);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('memory');
        expect(res.body.data.memory).toHaveProperty('rss_mb');
        expect(res.body.data.memory).toHaveProperty('heap_used_mb');
        expect(res.body.data).toHaveProperty('cpu');
        expect(res.body.data).toHaveProperty('node_version');
        expect(res.body.data).toHaveProperty('platform');
    });

    it('should return measured token ratios and VC economics for admin', async () => {
        await db.query(`
            INSERT INTO ai_usage_logs (
                model_name, input_tokens, output_tokens, total_tokens, cost_usd, endpoint, duration_ms
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, ['gemini-1.5-flash', 700, 300, 1200, 0.01, '/api/v1/ai/diagnose', 1000]);
        await db.query(`
            INSERT INTO ai_usage_logs (
                model_name, input_tokens, output_tokens, total_tokens, cost_usd, endpoint, duration_ms
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, ['deepseek-r1', 500, 500, 0, 0.02, '/api/v1/ai/problem-solving', 2000]);

        const res = await request(app)
            .get('/api/v1/metrics/ai-economics?range=30d')
            .set('Cookie', [`accessToken=${adminToken}`]);

        expect(res.status).toBe(200);
        expect(res.body.data.period.range).toBe('30d');
        expect(res.body.data.totals).toMatchObject({
            calls: 2,
            input_tokens: 1200,
            output_tokens: 800,
            total_tokens: 2200,
            output_share_pct: 36.36,
            total_to_output_ratio: 2.75,
            cost_usd: 0.03,
            cost_cny: 0.216,
            estimated_business_value_cny: 350,
        });
        expect(res.body.data.totals.return_on_inference).toBeCloseTo(1620.37, 2);
        expect(res.body.data.totals.inference_to_value_pct).toBeCloseTo(0.0617, 4);
        expect(res.body.data.period.since).toMatch(/T00:00:00\.000Z$/);
        expect(res.body.data.by_model).toHaveLength(2);
        expect(res.body.data.by_endpoint).toHaveLength(2);
        expect(res.body.data.daily).toHaveLength(1);
    });

    it('should allow managers to read AI economics without exposing admin metrics', async () => {
        const economics = await request(app)
            .get('/api/v1/metrics/ai-economics?range=30d')
            .set('Cookie', [`accessToken=${managerToken}`]);
        const systemMetrics = await request(app)
            .get('/api/v1/metrics')
            .set('Cookie', [`accessToken=${managerToken}`]);

        expect(economics.status).toBe(200);
        expect(economics.body.data.period.range).toBe('30d');
        expect(systemMetrics.status).toBe(403);
    });

    it('should auto-track requests via middleware', async () => {
        // Make a known request first
        await request(app).get('/api/health');

        const res = await request(app)
            .get('/api/v1/metrics')
            .set('Cookie', [`accessToken=${adminToken}`]);

        expect(res.status).toBe(200);
        expect(res.body.data.requests.total).toBeGreaterThanOrEqual(1);
    });

    it('should record SDA metrics', async () => {
        const res = await request(app)
            .post('/api/v1/metrics/record')
            .set('Cookie', [`accessToken=${adminToken}`])
            .send({ type: 'sda', data: { phase: 'simulate', pass: true } });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');

        const metrics = await request(app)
            .get('/api/v1/metrics')
            .set('Cookie', [`accessToken=${adminToken}`]);

        expect(metrics.body.data.sda_cycles.total).toBe(1);
        expect(metrics.body.data.sda_cycles.simulate_passes).toBe(1);
    });

    it('should record agent metrics', async () => {
        await request(app)
            .post('/api/v1/metrics/record')
            .set('Cookie', [`accessToken=${adminToken}`])
            .send({ type: 'agent', data: { agent: 'planner' } });

        const metrics = await request(app)
            .get('/api/v1/metrics')
            .set('Cookie', [`accessToken=${adminToken}`]);

        expect(metrics.body.data.agents.total_invocations).toBe(1);
        expect(metrics.body.data.agents.by_agent).toHaveProperty('planner');
    });

    it('should reset metrics', async () => {
        await request(app)
            .post('/api/v1/metrics/record')
            .set('Cookie', [`accessToken=${adminToken}`])
            .send({ type: 'agent', data: { agent: 'coder' } });

        const resetRes = await request(app)
            .post('/api/v1/metrics/reset')
            .set('Cookie', [`accessToken=${adminToken}`]);

        expect(resetRes.status).toBe(200);

        const metrics = await request(app)
            .get('/api/v1/metrics')
            .set('Cookie', [`accessToken=${adminToken}`]);

        expect(metrics.body.data.agents.total_invocations).toBe(0);
    });
});
