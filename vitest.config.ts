import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        env: {
            DB_USE_SQLITE: 'true',
            REDIS_MOCK: 'true'
        },
        include: ['**/*.test.ts'],
        setupFiles: ['./tests/setup.ts'],
        environment: 'node',
        globals: true,
        testTimeout: 20000,
        hookTimeout: 20000,
        fileParallelism: false, // Avoid concurrency issues with DB/ports
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'dist/',
                'server/dist/',
                'coverage/',
                '**/*.config.*',
                '**/*.d.ts',
                '**/scripts/**',
                '**/tests/**',
                'tests/**',
                'server/index.ts',
                'server/socket.ts',
                'server/config/**',
                'server/middleware/**',
                'server/routes/**',
                'server/agents/diagnosis/**',
                'server/agents/fault/**',
                'server/agents/material/**',
                'server/agents/planning/**',
                'server/agents/research/**',
                'server/agents/turnover/**',
                'server/agents/webintel/**',
                'server/services/abExperiment.ts',
                'server/services/ai.ts',
                'server/services/knowledge.ts',
                'server/services/learning.ts',
                'server/services/planning_claw.ts',
            ],
        },
    },
});
