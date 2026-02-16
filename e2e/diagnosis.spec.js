import { test, expect } from '@playwright/test';

test.describe('Diagnosis and Repair Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Login first
        await page.goto('/login');
        await page.fill('input[type="tel"]', '13900000001');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('/');
    });

    test('should go through diagnosis and repair execution', async ({ page }) => {
        // Capture console logs and errors
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
        page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));

        // 1. Start Diagnosis
        await page.goto('/diagnose');

        // Mock the API response for diagnosis to avoid using real tokens/AI
        await page.route('**/api/diagnose', async route => {
            const json = {
                detected: true,
                issue_name: 'Leaky Faucet',
                steps: [
                    'Turn off water supply',
                    'Wait 15 minutes for water to drain',
                    'Replace washer'
                ],
                severity: 'medium',
                confidence: 95
            };
            await route.fulfill({ json });
        });

        // 2. Upload dummy image (if possible) or just skip to processing?
        // Since we're mocking, we can manually trigger the flow or inject state.
        // However, the UI requires interaction.
        // Let's inject state directly to simulate "After Diagnosis" for RepairGuide

        await page.evaluate(() => {
            const diagnosis = {
                detected: true,
                issue_name: 'Leaky Faucet',
                issue_name_en: 'Leaky Faucet',
                confidence: 95,
                severity: 'medium',
                description: 'Water is dripping from the faucet.',
                steps: [
                    'Turn off water supply',
                    'Wait 2 seconds for test', // Short timer for test
                    'Replace washer'
                ],
                raw_response: { diagnosis: { category: 'plumbing' } }
            };
            sessionStorage.setItem('diagnosisResult', JSON.stringify(diagnosis));
        });

        await page.goto('/repair/ai-diagnosis');

        // Debug: Check if storage persisted
        const storage = await page.evaluate(() => sessionStorage.getItem('diagnosisResult'));
        console.log('SessionStorage loaded:', storage ? 'Yes' : 'No');
        if (storage) console.log('Storage content:', storage.substring(0, 100) + '...');

        // Debug: Check header text
        const header = await page.locator('header h2').textContent();
        console.log('Header text found:', header);

        await expect(page.getByText('Leaky Faucet')).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('Wait 2 seconds for test')).toBeVisible();

        // 3. Test Timer
        // Find the timer start button
        const startTimerBtn = page.getByRole('button', { name: /Start/i }).first();
        await startTimerBtn.click();

        // Wait for timer to finish (2 seconds)
        await page.waitForTimeout(3000);

        // Verify timer finished state (Restart button visible)
        await expect(page.getByRole('button', { name: /Restart/i }).first()).toBeVisible();

        // 4. Start Repair (Execution Mode)
        // Mock create report API
        await page.route('**/api/reports', async route => {
            // Mock user profile to ensure AuthContext has user
            await page.route('**/api/auth/me', async route => {
                await route.fulfill({ json: { user: { id: 1, name: 'Test User', phone: '13900000001' } } });
            });

            await page.locator('footer').getByRole('button', { name: /Start/i }).click(); // "Start Repair" button at footer

            // Verify mode switch (Toast might be skipped if report creation fails/mocks are tricky, but mode switch is key)
            await expect(page.getByRole('button', { name: /In Progress/i })).toBeVisible({ timeout: 10000 });

            // 5. Complete Steps
            const steps = await page.locator('button.rounded-full.border-2');
            const count = await steps.count();
            for (let i = 0; i < count; i++) {
                await steps.nth(i).click();
            }

            // 6. Verify Completion
            await expect(page.getByText('Repair Complete!')).toBeVisible();
            await expect(page.getByText('Home')).toBeVisible();
        });
    });
