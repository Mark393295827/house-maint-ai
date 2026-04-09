import express from 'express';
import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { dbQueryMock, withRetryMock } = vi.hoisted(() => ({ 
    dbQueryMock: vi.fn(),
    withRetryMock: vi.fn()
}));

vi.mock('../config/database.js', () => ({
    default: {
        query: dbQueryMock,
    },
}));

vi.mock('../agents/common.js', () => ({
    withRetry: withRetryMock,
}));

import wechatRouter from '../routes/wechat.js';

function createApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/v1/wechat', wechatRouter);
    return app;
}

describe('WeChat login route', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        withRetryMock.mockResolvedValue({
            json: async () => ({
                openid: 'wx-openid-1',
                session_key: 'raw-session-key',
            }),
        });

        dbQueryMock.mockImplementation(async (sql: string) => {
            if (sql.includes('SELECT * FROM users WHERE wechat_openid')) {
                return { rows: [] };
            }

            if (sql.includes('INSERT INTO users')) {
                return {
                    rows: [{
                        id: 7,
                        phone: 'wx_user_0001',
                        name: 'WeChat User 0001',
                        role: 'user',
                        avatar: null,
                    }],
                };
            }

            if (sql.includes('INSERT INTO refresh_tokens')) {
                return { rows: [] };
            }

            return { rows: [] };
        });
    });

    it('stores a hashed session key and issues standard auth cookies', async () => {
        const app = createApp();

        const response = await request(app)
            .post('/api/v1/wechat/login')
            .send({ code: 'wechat-auth-code' });

        expect(response.status).toBe(200);

        const insertUserCall = dbQueryMock.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO users'));
        expect(insertUserCall).toBeDefined();

        const insertParams = insertUserCall?.[1] as unknown[];
        const storedSessionKey = String(insertParams[1]);

        expect(storedSessionKey).not.toBe('raw-session-key');
        expect(storedSessionKey).toMatch(/^[a-f0-9]{64}$/);

        const setCookie = response.headers['set-cookie'].join(' ');
        expect(setCookie).toContain('accessToken=');
        expect(setCookie).toContain('refreshToken=');
    });
});
