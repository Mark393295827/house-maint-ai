import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['**/*.test.ts'],
        setupFiles: ['./tests/setup.ts'],
        environment: 'node',
        globals: true,
        testTimeout: 20000,
        hookTimeout: 20000,
        fileParallelism: false, // Avoid concurrency issues with DB/ports
    },
});
