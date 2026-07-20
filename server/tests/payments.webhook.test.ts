import express, { type Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { emitToWorkersMock, queryMock } = vi.hoisted(() => ({
    emitToWorkersMock: vi.fn(),
    queryMock: vi.fn()
}));

vi.mock('../config/database.js', () => ({
    default: {
        query: queryMock
    }
}));

vi.mock('../socket.js', () => ({
    emitToWorkers: emitToWorkersMock
}));

vi.mock('../middleware/auth.js', () => ({
    authenticate: (_req: unknown, _res: unknown, next: () => void) => next()
}));

describe('POST /payments/webhook paid-order reconciliation', () => {
    let app: Express;
    const previousWebhookVerification = process.env.WECHAT_WEBHOOK_VERIFY;

    beforeAll(async () => {
        process.env.WECHAT_WEBHOOK_VERIFY = 'false';
        const { default: paymentRoutes } = await import('../routes/payments.js');

        app = express();
        app.use(express.json());
        app.use('/payments', paymentRoutes);
    });

    beforeEach(() => {
        queryMock.mockReset();
        emitToWorkersMock.mockReset();
    });

    afterAll(() => {
        if (previousWebhookVerification === undefined) {
            delete process.env.WECHAT_WEBHOOK_VERIFY;
        } else {
            process.env.WECHAT_WEBHOOK_VERIFY = previousWebhookVerification;
        }
    });

    it('reconciles the report when the order is already paid', async () => {
        queryMock
            .mockResolvedValueOnce({
                rows: [{ id: 41, status: 'paid', report_id: 73 }]
            })
            .mockResolvedValueOnce({
                rows: [{
                    id: 73,
                    category: 'plumbing',
                    title: 'Leaking pipe',
                    description: 'Pipe under sink is leaking'
                }]
            });

        const response = await request(app)
            .post('/payments/webhook')
            .send({
                event_type: 'TRANSACTION.SUCCESS',
                out_trade_no: 'HM_ALREADY_PAID'
            });

        expect(response.status).toBe(200);
        expect(queryMock).toHaveBeenCalledTimes(2);
        expect(queryMock.mock.calls[1][0]).toContain('UPDATE reports');
        expect(queryMock.mock.calls.some(([sql]) => String(sql).includes('UPDATE orders'))).toBe(false);
        expect(emitToWorkersMock).toHaveBeenCalledWith('new_job_available', {
            reportId: 73,
            category: 'plumbing',
            title: 'Leaking pipe',
            description: 'Pipe under sink is leaking'
        });
    });

    it('returns 500 when the report transition fails after marking an order paid', async () => {
        const transitionError = new Error('report update unavailable');
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        queryMock
            .mockResolvedValueOnce({
                rows: [{ id: 42, status: 'pending', report_id: 74 }]
            })
            .mockResolvedValueOnce({ rows: [] })
            .mockRejectedValueOnce(transitionError);

        const response = await request(app)
            .post('/payments/webhook')
            .send({
                event_type: 'TRANSACTION.SUCCESS',
                out_trade_no: 'HM_TRANSITION_FAILURE'
            });

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ code: 'FAIL', message: 'Internal Server Error' });
        expect(queryMock).toHaveBeenCalledTimes(3);
        expect(queryMock.mock.calls[1][0]).toContain('UPDATE orders');
        expect(queryMock.mock.calls[2][0]).toContain('UPDATE reports');

        consoleError.mockRestore();
    });
});
