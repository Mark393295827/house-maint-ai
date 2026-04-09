import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        env: {
            DB_USE_SQLITE: 'true',
            REDIS_MOCK: 'true'
        },
        include: ['tests/**/*.test.ts', 'server/tests/**/*.test.ts'],
        exclude: ['tests/e2e/**', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
        setupFiles: ['./tests/setup.ts'],
        environment: 'node',
        globals: true,
        testTimeout: 20000,
        hookTimeout: 20000,
        fileParallelism: false, // Avoid concurrency issues with DB/ports
    },
});
