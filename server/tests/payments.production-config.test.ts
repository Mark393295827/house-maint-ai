import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/database.js', () => ({
    default: {
        query: vi.fn()
    }
}));

vi.mock('../socket.js', () => ({
    emitToWorkers: vi.fn()
}));

vi.mock('../middleware/auth.js', () => ({
    authenticate: vi.fn()
}));

const productionCredentials = {
    WECHAT_MCH_ID: '1900000109',
    WECHAT_APP_ID: 'wx_production_app_id',
    WECHAT_API_V3_KEY: 'production_api_v3_key_123456789'
};

const knownMockCredentials = [
    ['WECHAT_MCH_ID', '1234567890'],
    ['WECHAT_APP_ID', 'wx_test_app_id'],
    ['WECHAT_API_V3_KEY', 'test_api_v3_key_1234567890123456']
] as const;

function stubCredentials(credentials: Record<string, string>) {
    for (const [name, value] of Object.entries(credentials)) {
        vi.stubEnv(name, value);
    }
}

describe('WeChat production credential validation', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it.each(knownMockCredentials)('rejects production when %s uses its known mock value', async (name, value) => {
        vi.stubEnv('NODE_ENV', 'production');
        stubCredentials(productionCredentials);
        vi.stubEnv(name, value);

        await expect(import('../routes/payments.js')).rejects.toThrow(
            new RegExp(`production.*${name}`, 'i')
        );
    });

    it('rejects production when webhook signature verification is disabled', async () => {
        vi.stubEnv('NODE_ENV', 'production');
        stubCredentials(productionCredentials);
        vi.stubEnv('WECHAT_WEBHOOK_VERIFY', 'false');

        await expect(import('../routes/payments.js')).rejects.toThrow(
            /production.*WECHAT_WEBHOOK_VERIFY/i
        );
    });

    it('allows the known mock values outside production', async () => {
        vi.stubEnv('NODE_ENV', 'test');
        stubCredentials(Object.fromEntries(knownMockCredentials));

        await expect(import('../routes/payments.js')).resolves.toHaveProperty('default');
    });
});
