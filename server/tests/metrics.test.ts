import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';
import { resetMetrics } from '../middleware/metricsCollector.js';

describe('Metrics API', () => {
    const adminToken = jwt.sign(
        { id: 1, phone: '13800000001', role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
    );

    const userToken = jwt.sign(
        { id: 2, phone: '13800000002', role: 'user' },
        JWT_SECRET,
        { expiresIn: '1h' }
    );

    beforeEach(() => {
        resetMetrics();
    });

    it('should reject regular users (403)', async () => {
        const res = await request(app)
            .get('/api/metrics')
            .set('Cookie', [`accessToken=${userToken}`]);

        expect(res.status).toBe(403);
    });

    it('should reject unauthenticated requests (401)', async () => {
        const res = await request(app).get('/api/metrics');
        expect(res.status).toBe(401);
    });

    it('should return metrics shape for admin', async () => {
        const res = await request(app)
            .get('/api/metrics')
            .set('Cookie', [`accessToken=${adminToken}`]);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('system');
        expect(res.body).toHaveProperty('requests');
        expect(res.body).toHaveProperty('response_time');
        expect(res.body).toHaveProperty('sda_cycles');
        expect(res.body).toHaveProperty('agents');
        expect(res.body.system).toHaveProperty('uptime_ms');
        expect(res.body.system).toHaveProperty('uptime_human');
    });

    it('should return health stats for admin', async () => {
        const res = await request(app)
            .get('/api/metrics/health')
            .set('Cookie', [`accessToken=${adminToken}`]);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('memory');
        expect(res.body.memory).toHaveProperty('rss_mb');
        expect(res.body.memory).toHaveProperty('heap_used_mb');
        expect(res.body).toHaveProperty('cpu');
        expect(res.body).toHaveProperty('node_version');
        expect(res.body).toHaveProperty('platform');
    });

    it('should auto-track requests via middleware', async () => {
        // Make a known request first
        await request(app).get('/api/health');

        // Now fetch metrics (this request itself also gets counted,
        // but the 'finish' callback fires after res.json() so its own count
        // may not appear in its own response body)
        const res = await request(app)
            .get('/api/metrics')
            .set('Cookie', [`accessToken=${adminToken}`]);

        expect(res.status).toBe(200);
        // At least the /api/health request should be tracked
        expect(res.body.requests.total).toBeGreaterThanOrEqual(1);
        expect(res.body.requests.success).toBeGreaterThanOrEqual(1);
    });

    it('should record SDA metrics', async () => {
        const res = await request(app)
            .post('/api/metrics/record')
            .set('Cookie', [`accessToken=${adminToken}`])
            .set('X-CSRF-Token', 'test')
            .send({ type: 'sda', data: { phase: 'simulate', pass: true } });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const metrics = await request(app)
            .get('/api/metrics')
            .set('Cookie', [`accessToken=${adminToken}`]);

        expect(metrics.body.sda_cycles.total).toBe(1);
        expect(metrics.body.sda_cycles.simulate_passes).toBe(1);
    });

    it('should record agent metrics', async () => {
        await request(app)
            .post('/api/metrics/record')
            .set('Cookie', [`accessToken=${adminToken}`])
            .set('X-CSRF-Token', 'test')
            .send({ type: 'agent', data: { agent: 'planner' } });

        const metrics = await request(app)
            .get('/api/metrics')
            .set('Cookie', [`accessToken=${adminToken}`]);

        expect(metrics.body.agents.total_invocations).toBe(1);
        expect(metrics.body.agents.by_agent).toHaveProperty('planner');
    });

    it('should reset metrics', async () => {
        // Record something first
        await request(app)
            .post('/api/metrics/record')
            .set('Cookie', [`accessToken=${adminToken}`])
            .set('X-CSRF-Token', 'test')
            .send({ type: 'agent', data: { agent: 'coder' } });

        // Reset
        const resetRes = await request(app)
            .post('/api/metrics/reset')
            .set('Cookie', [`accessToken=${adminToken}`])
            .set('X-CSRF-Token', 'test');

        expect(resetRes.status).toBe(200);

        // Verify reset
        const metrics = await request(app)
            .get('/api/metrics')
            .set('Cookie', [`accessToken=${adminToken}`]);

        expect(metrics.body.agents.total_invocations).toBe(0);
        expect(metrics.body.sda_cycles.total).toBe(0);
    });
});
