import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbQueryMock } = vi.hoisted(() => ({ dbQueryMock: vi.fn() }));

vi.mock('@sentry/node', () => ({
    captureException: vi.fn(),
}));

vi.mock('../config/database.js', () => ({
    default: {
        query: dbQueryMock,
    },
}));

vi.mock('../middleware/auth.js', () => ({
    authenticate: (req: any, _res: unknown, next: () => void) => {
        req.user = { id: 5, role: 'worker', name: 'Worker 5', phone: '13812345678' };
        next();
    },
}));

vi.mock('../services/ai.js', () => ({
    aiService: {
        generateRepairPlan: vi.fn(),
    },
}));

vi.mock('../services/learning.js', () => ({
    learningService: {
        processCompletedReports: vi.fn(),
    },
}));

import reportsRouter from '../routes/reports.js';
import { errorHandler } from '../middleware/errorHandler.js';

function createApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/v1/reports', reportsRouter);
    app.use(errorHandler);
    return app;
}

describe('Reports query validation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        dbQueryMock.mockResolvedValue({ rows: [] });
    });

    it('rejects out-of-range worker coordinates before distance calculation', async () => {
        const app = createApp();

        const response = await request(app)
            .get('/api/v1/reports/available?latitude=200&longitude=116.4');

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Validation Error');
        expect(dbQueryMock).not.toHaveBeenCalled();
    });

    it('rejects unbounded report pagination parameters', async () => {
        const app = createApp();

        const response = await request(app)
            .get('/api/v1/reports?limit=999999&offset=0');

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Validation Error');
        expect(dbQueryMock).not.toHaveBeenCalled();
    });
});
