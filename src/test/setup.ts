import { afterEach } from 'vitest';

// Only load DOM-related setup in browser-like environments
if (typeof window !== 'undefined') {
    // Dynamic import to prevent loading in Node environment
    import('@testing-library/jest-dom');
    import('@testing-library/react').then(({ cleanup }) => {
        // Cleanup after each test
        afterEach(() => {
            cleanup();
        });
    });
}
