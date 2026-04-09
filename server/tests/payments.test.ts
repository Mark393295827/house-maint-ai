import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbQueryMock } = vi.hoisted(() => ({ dbQueryMock: vi.fn() }));

vi.mock('../config/database.js', () => ({
    default: {
        query: dbQueryMock,
    },
}));

vi.mock('../middleware/auth.js', () => ({
    authenticate: (req: any, _res: unknown, next: () => void) => {
        req.user = { id: 99, role: 'user' };
        next();
    },
}));

vi.mock('../socket.js', () => ({
    emitToWorkers: vi.fn(),
}));

import paymentsRouter from '../routes/payments.js';

function createApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/v1/payments', paymentsRouter);
    return app;
}

describe('Payments checkout route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        dbQueryMock.mockImplementation(async (sql: string) => {
            if (sql.includes('SELECT * FROM orders')) {
                return { rows: [] };
            }

            if (sql.includes('INSERT INTO orders')) {
                return { rows: [] };
            }

            return { rows: [] };
        });
    });

    it('returns a frontend redirect URL alongside payment metadata', async () => {
        const app = createApp();

        const response = await request(app)
            .post('/api/v1/payments/checkout')
            .send({ amount: 88, reportId: 42 });

        expect(response.status).toBe(200);
        expect(response.body.id).toBeTruthy();
        expect(response.body.outTradeNo).toMatch(/^HM_/);
        expect(response.body.url).toContain('/payment/success');
        expect(response.body.url).toContain('session_id=');
        expect(response.body.cancelUrl).toContain('/payment/cancel');
    });
});
