import { describe, expect, it, vi } from 'vitest';

const starts = vi.hoisted(() => ({ order: [] as string[] }));

vi.mock('../instrument.js', () => ({}));
vi.mock('@sentry/node', () => ({
    init: vi.fn(),
    captureException: vi.fn(),
}));
vi.mock('../services/diagnostics_claw.js', () => ({
    diagnosticsClaw: { start: vi.fn(() => starts.order.push('diagnosis')), stop: vi.fn() },
}));
vi.mock('../services/planning_claw.js', () => ({
    planningClaw: { start: vi.fn(() => starts.order.push('planning')), stop: vi.fn() },
}));
vi.mock('../services/vendor_claw.js', () => ({
    vendorClaw: { start: vi.fn(() => starts.order.push('vendor')), stop: vi.fn() },
}));

describe('background worker bootstrap', () => {
    it('starts diagnosis, planning, and vendor stages in dependency order', async () => {
        await import('../worker.js');

        await vi.waitFor(() => {
            expect(starts.order).toEqual(['diagnosis', 'planning', 'vendor']);
        });
    });
});

