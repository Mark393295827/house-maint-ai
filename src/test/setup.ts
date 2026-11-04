import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

vi.mock('mixpanel-browser', () => ({
    default: {
        init: vi.fn(),
        track: vi.fn(),
        identify: vi.fn(),
        people: { set: vi.fn() },
    },
}));

afterEach(() => {
    cleanup();
});
