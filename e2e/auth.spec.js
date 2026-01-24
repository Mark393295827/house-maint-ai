import { test, expect } from '@playwright/test';

test.describe('Critical User Flow', () => {

    test('should verify login page loads', async ({ page }) => {
        await page.goto('/login');
        await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
    });

    test('should login and navigate to home', async ({ page }) => {
        await page.goto('/login');

        // Fill credentials
        await page.getByPlaceholder('手机号码').fill('13800138001');
        await page.getByPlaceholder('密码').fill('123456');

        // Click login
        await page.getByRole('button', { name: '登 录' }).click();

        // Should navigate to home
        await expect(page).toHaveURL('/');
        // Expect user name "Demo User" (from init-db)
        await expect(page.getByText('Hi, Demo User')).toBeVisible();
    });

    test('should navigate to quick report', async ({ page }) => {
        // Login first
        await page.goto('/login');
        await page.getByPlaceholder('手机号码').fill('13800138001');
        await page.getByPlaceholder('密码').fill('123456');
        await page.getByRole('button', { name: '登 录' }).click();
        await expect(page).toHaveURL('/');

        // Go to Quick Report (Find button with 'flash_on' icon or text)
        // Dashboard has a Quick Action "Quick Rep...".
        // Let's assume navigating directly is safer for now, or find the button.
        await page.goto('/quick-report');

        // Verify page title
        await expect(page.getByText('快速报修')).toBeVisible();
    });
});
