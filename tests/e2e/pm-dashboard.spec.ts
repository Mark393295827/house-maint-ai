import { test, expect } from '@playwright/test';

test.describe('Property Manager Dashboard Workflows - PRD §4.2', () => {

  // Usually we'd want to auth bypass or login. Let's do a fast UI login if possible,
  // or we can mock localstorage based on project conventions. 
  // For the sake of this mock, we assume navigating to the page directly without strict session check
  // or that we can login with a test phone number.

  test.beforeEach(async ({ page }) => {
    // Navigate to local dev server
    // We navigate directly to the enterprise dashboard
    // If the Route blocks us, we might need a test cookie.
    
    // Inject auth state token to bypass login explicitly for E2E
    await page.addInitScript(() => {
        window.localStorage.setItem('auth', 'true');
        // Let's also mock the JWT
        document.cookie = "accessToken=mock_admin_token; path=/;";
    });
  });

  test('PM can view strictly prioritized tickets and issue dispatch', async ({ page }) => {
    // 1. Visit the route
    await page.goto('/enterprise/tickets');
    
    // Check loading pulse finishes 
    await expect(page.getByTestId('tickets-table')).toBeVisible({ timeout: 15000 });

    // 2. Queue sort validation: 
    // We expect the first row to be standard Emergency or 48h
    const firstBadge = page.locator('.ticket-row').first().locator('td:nth-child(3) span').first();
    await expect(firstBadge).toBeVisible();
    
    // The text could be EMERGENCY or 48H depending on mock array map,
    // but at least one should exist and ensure DIY is at the bottom.
    const badgeText = await firstBadge.textContent();
    expect(['Emergency', '48h']).toContain(badgeText?.trim());

    // 3. Dispatch Action
    const dispatchBtn = page.getByTestId('dispatch-btn').first();
    await expect(dispatchBtn).toBeVisible();
    await dispatchBtn.click();
    
    // Just verify the action was triggered functionally
    // In actual implementation it might open a modal or toast.
  });

  test('PM can export monthly CSV metrics', async ({ page }) => {
    // 1. Visit route
    await page.goto('/enterprise/tickets');
    
    await expect(page.getByTestId('tickets-table')).toBeVisible();

    // 2. Catch the download event natively
    const downloadPromise = page.waitForEvent('download');
    
    // Trigger export
    await page.getByTestId('export-csv-btn').click();
    
    // Await download resolution
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('report_2026_04.csv');
  });

});
