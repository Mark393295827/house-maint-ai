import cookieParser from 'cookie-parser';
import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    generateAccessToken: vi.fn(() => 'successor-access-token'),
    generateRefreshToken: vi.fn(() => 'successor-refresh-token'),
    hashRefreshToken: vi.fn((token: string) => `sha256:${token}`),
    query: vi.fn(),
    verifyRefreshToken: vi.fn(() => ({ id: 42, type: 'refresh' })),
}));

vi.mock('../config/database.js', () => ({
    default: { query: mocks.query },
}));

vi.mock('../middleware/auth.js', () => ({
    authenticate: vi.fn(),
    optionalAuth: vi.fn((_req: Request, _res: Response, next: NextFunction) => next()),
    generateAccessToken: mocks.generateAccessToken,
    generateCsrfToken: vi.fn(),
    generateRefreshToken: mocks.generateRefreshToken,
    getAuthCookieOptions: vi.fn(() => ({ httpOnly: true, path: '/' })),
    getRefreshCookieOptions: vi.fn(() => ({ httpOnly: true, path: '/api/v1/auth' })),
    hashRefreshToken: mocks.hashRefreshToken,
    verifyRefreshToken: mocks.verifyRefreshToken,
}));

import authRouter from '../routes/auth.js';

const presentedToken = 'presented-refresh-token';
const storedToken = {
    id: 7,
    user_id: 42,
    token: `sha256:${presentedToken}`,
    expires_at: '2999-01-01T00:00:00.000Z',
    revoked: 0,
};
const user = {
    id: 42,
    phone: '13777777779',
    name: 'Race Test User',
    role: 'user',
    password_hash: 'not-returned',
};

const createApp = () => {
    const app = express();
    app.use(cookieParser());
    app.use('/auth', authRouter);
    return app;
};

describe('refresh-token rotation race', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('mints one successor and clears cookies for the request that loses the revoke race', async () => {
        let refreshSelects = 0;
        let releaseReads: (() => void) | undefined;
        const bothRequestsRead = new Promise<void>((resolve) => {
            releaseReads = resolve;
        });
        let revoked = false;
        let successorInserts = 0;

        mocks.query.mockImplementation(async (sql: string, params: unknown[] = []) => {
            if (sql.includes('SELECT * FROM refresh_tokens')) {
                expect(params).toEqual([`sha256:${presentedToken}`]);
                refreshSelects += 1;
                if (refreshSelects === 2) {
                    releaseReads?.();
                }
                await bothRequestsRead;
                return { rows: [storedToken], rowCount: 1 };
            }

            if (sql.includes('SELECT * FROM users')) {
                return { rows: [user], rowCount: 1 };
            }

            if (sql.includes('UPDATE refresh_tokens SET revoked = 1')) {
                const rowCount = revoked ? 0 : 1;
                revoked = true;
                return { rows: [], rowCount };
            }

            if (sql.includes('INSERT INTO refresh_tokens')) {
                successorInserts += 1;
                return { rows: [], rowCount: 1 };
            }

            throw new Error(`Unexpected query: ${sql}`);
        });

        const app = createApp();
        const responses = await Promise.all([
            request(app).post('/auth/refresh').set('Cookie', `refreshToken=${presentedToken}`),
            request(app).post('/auth/refresh').set('Cookie', `refreshToken=${presentedToken}`),
        ]);

        expect(responses.map((response) => response.status).sort()).toEqual([200, 401]);
        expect(successorInserts).toBe(1);
        expect(mocks.generateAccessToken).toHaveBeenCalledTimes(1);
        expect(mocks.generateRefreshToken).toHaveBeenCalledTimes(1);

        const revokeQueries = mocks.query.mock.calls.filter(([sql]) =>
            String(sql).includes('UPDATE refresh_tokens SET revoked = 1')
        );
        expect(revokeQueries).toHaveLength(2);
        expect(revokeQueries.every(([sql]) => String(sql).includes('(revoked = 0 OR revoked IS NULL)'))).toBe(true);

        const losingResponse = responses.find((response) => response.status === 401);
        expect(losingResponse?.get('Set-Cookie')).toEqual(expect.arrayContaining([
            expect.stringContaining('accessToken=;'),
            expect.stringContaining('refreshToken=;'),
        ]));
    });

    it('retains fallback lookup for legacy plaintext refresh tokens', async () => {
        const lookupValues: unknown[] = [];

        mocks.query.mockImplementation(async (sql: string, params: unknown[] = []) => {
            if (sql.includes('SELECT * FROM refresh_tokens')) {
                lookupValues.push(params[0]);
                return params[0] === presentedToken
                    ? { rows: [{ ...storedToken, token: presentedToken }], rowCount: 1 }
                    : { rows: [], rowCount: 0 };
            }

            if (sql.includes('SELECT * FROM users')) {
                return { rows: [user], rowCount: 1 };
            }

            if (sql.includes('UPDATE refresh_tokens SET revoked = 1')) {
                return { rows: [], rowCount: 1 };
            }

            if (sql.includes('INSERT INTO refresh_tokens')) {
                return { rows: [], rowCount: 1 };
            }

            throw new Error(`Unexpected query: ${sql}`);
        });

        const response = await request(createApp())
            .post('/auth/refresh')
            .set('Cookie', `refreshToken=${presentedToken}`);

        expect(response.status).toBe(200);
        expect(lookupValues).toEqual([`sha256:${presentedToken}`, presentedToken]);
    });
});
