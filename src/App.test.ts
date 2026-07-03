import { describe, expect, it } from 'vitest';
import { APP_ROUTE_PATHS } from './App';

describe('App route coverage', () => {
    it('registers product-flow route aliases used by the UI', () => {
        expect(APP_ROUTE_PATHS).toEqual(expect.arrayContaining([
            '/match',
            '/preview',
            '/community',
            '/quick-report',
            '/orders',
            '/messages',
            '/conversations',
            '/chat/:userId',
            '/reports/:id',
            '/repair',
            '/repair/:id',
        ]));
    });
});
