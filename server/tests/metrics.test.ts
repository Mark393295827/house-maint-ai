import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';
import { resetMetrics } from '../middleware/metricsCollector.js';

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

    beforeEach(() => {
        resetMetrics();
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
