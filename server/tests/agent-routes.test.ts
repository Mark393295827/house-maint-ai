import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import { generateAccessToken } from '../middleware/auth.js';

describe('Agent Routes Integration (/api/v1/agents)', () => {
    const validToken = generateAccessToken({
        id: 1,
        name: 'Agent Test User',
        role: 'admin'
    });

    const authCookie = `accessToken=${validToken}`;

    describe('Authentication enforcement', () => {
        it('rejects unauthenticated requests with 401', async () => {
            const res = await request(app)
                .post('/api/v1/agents/material')
                .send({ diagnosisSummary: 'Pipe leak', category: 'Plumbing' });

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('error', 'No token provided');
        });
    });

    describe('POST /api/v1/agents/material & /material-bom', () => {
        it('validates input parameters and returns 400 for invalid body', async () => {
            const res = await request(app)
                .post('/api/v1/agents/material')
                .set('Cookie', [authCookie])
                .send({});

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Invalid input parameters');
        });

        it('returns BOM data on valid material request', async () => {
            const res = await request(app)
                .post('/api/v1/agents/material')
                .set('Cookie', [authCookie])
                .send({
                    diagnosisSummary: 'Water tap leaking at kitchen sink',
                    category: 'Plumbing',
                    locale: 'zh'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.parts).toBeDefined();
            expect(res.body.usage).toBeDefined();
        });

        it('works on alternate endpoint /material-bom', async () => {
            const res = await request(app)
                .post('/api/v1/agents/material-bom')
                .set('Cookie', [authCookie])
                .send({
                    diagnosisSummary: 'Broken light switch',
                    category: 'Electrical'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
        });
    });

    describe('POST /api/v1/agents/fault & /fault-attribution', () => {
        it('returns fault attribution analysis on valid request', async () => {
            const res = await request(app)
                .post('/api/v1/agents/fault')
                .set('Cookie', [authCookie])
                .send({
                    description: 'Water seepage on wall',
                    propertyAgeYears: 5,
                    tenancyMonths: 12
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.attribution).toBeDefined();
            expect(res.body.usage).toBeDefined();
        });

        it('works on alternate endpoint /fault-attribution', async () => {
            const res = await request(app)
                .post('/api/v1/agents/fault-attribution')
                .set('Cookie', [authCookie])
                .send({
                    description: 'Damaged door lock',
                    propertyAgeYears: 1
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.attribution).toBeDefined();
        });
    });

    describe('POST /api/v1/agents/turnover & /turnover-compare', () => {
        it('returns turnover comparison report on valid request', async () => {
            const res = await request(app)
                .post('/api/v1/agents/turnover')
                .set('Cookie', [authCookie])
                .send({
                    beforeImages: [{ data: 'base64str1', mimeType: 'image/jpeg' }],
                    afterImages: [{ data: 'base64str2', mimeType: 'image/jpeg' }],
                    propertyName: 'Sanya Resort Apt 301'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.overall_condition).toBeDefined();
            expect(res.body.usage).toBeDefined();
        });

        it('works on alternate endpoint /turnover-compare', async () => {
            const res = await request(app)
                .post('/api/v1/agents/turnover-compare')
                .set('Cookie', [authCookie])
                .send({
                    beforeImages: [],
                    afterImages: [],
                    propertyName: 'Beach House'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
        });
    });

    describe('GET Executive Control endpoints', () => {
        it('GET /cfo/budget returns CFO budget status and health check alerts', async () => {
            const res = await request(app)
                .get('/api/v1/agents/cfo/budget')
                .set('Cookie', [authCookie]);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('budget_status');
            expect(res.body.data).toHaveProperty('alerts');
        });

        it('GET /cfo/unit-economics returns CFO unit economics insights', async () => {
            const res = await request(app)
                .get('/api/v1/agents/cfo/unit-economics')
                .set('Cookie', [authCookie]);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
        });

        it('GET /coo/supply-demand returns COO supply-demand alerts', async () => {
            const res = await request(app)
                .get('/api/v1/agents/coo/supply-demand')
                .set('Cookie', [authCookie]);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('alerts');
        });

        it('GET /coo/accuracy returns COO accuracy circuit breaker alerts', async () => {
            const res = await request(app)
                .get('/api/v1/agents/coo/accuracy')
                .set('Cookie', [authCookie]);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('alerts');
        });

        it('GET /executive/dashboard returns consolidated CFO + COO dashboard', async () => {
            const res = await request(app)
                .get('/api/v1/agents/executive/dashboard')
                .set('Cookie', [authCookie]);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('budget_status');
        });
    });
});
