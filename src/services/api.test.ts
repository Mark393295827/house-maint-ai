// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

function jsonResponse(status: number, body: unknown): Response {
    return {
        status,
        ok: status >= 200 && status < 300,
        json: vi.fn().mockResolvedValue(body),
    } as unknown as Response;
}

describe('API authentication refresh', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it('refreshes a protected request at most once before rejecting the session', async () => {
        let protectedCalls = 0;
        let refreshCalls = 0;

        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input);
            if (url.endsWith('/auth/csrf-token')) {
                return jsonResponse(200, { csrfToken: 'csrf-token' });
            }
            if (url.endsWith('/auth/refresh')) {
                refreshCalls += 1;
                return jsonResponse(200, { message: 'refreshed' });
            }

            protectedCalls += 1;
            if (protectedCalls > 2) {
                throw new Error('unbounded protected-request retry');
            }
            return jsonResponse(401, { error: 'Unauthorized' });
        });
        vi.stubGlobal('fetch', fetchMock);

        const { getOrders } = await import('./api');

        await expect(getOrders()).rejects.toThrow(/session expired|unauthorized/i);
        expect(refreshCalls).toBe(1);
        expect(protectedCalls).toBe(2);
    });
});

