import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: '.',
    testMatch: '**/*.browser.spec.ts',
    outputDir: fileURLToPath(new URL('./.playwright-results', import.meta.url)),
    fullyParallel: false,
    reporter: 'list',
    use: { trace: 'off' },
    projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
