---
description: Generate and run E2E tests with Playwright
---

# E2E Command

Use `/e2e [action]` to work with end-to-end tests.

// turbo-all

## Usage

```
/e2e generate <page>    # Generate E2E tests for a page
/e2e run                # Run all E2E tests
/e2e run <test>         # Run specific test
/e2e debug <test>       # Run with debug UI
/e2e report             # Show test report
```

## Generated Test Template

```javascript
import { test, expect } from '@playwright/test';

test.describe('Page Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/page-url');
  });

  test('should load correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/Expected Title/);
  });

  test('should handle user interaction', async ({ page }) => {
    await page.click('[data-testid="button"]');
    await expect(page.locator('.result')).toBeVisible();
  });
});
```

## Commands

### Setup Playwright
```bash
npm install -D @playwright/test
npx playwright install
```

### Run Tests
```bash
npx playwright test                 # All tests
npx playwright test login.spec.js   # Specific file
npx playwright test --ui            # With UI
npx playwright test --debug         # Debug mode
```

### View Report
```bash
npx playwright show-report
```

## Best Practices

1. Use `data-testid` attributes for selectors
2. Wait for elements explicitly
3. Test critical user paths first
4. Keep tests independent
5. Use page objects for complex pages

## Example Session

```
> /e2e generate Dashboard

Generating E2E tests for Dashboard...

Created: e2e/dashboard.spec.js
- Test: should display header
- Test: should show quick actions
- Test: should navigate to diagnosis

Run with: npx playwright test e2e/dashboard.spec.js
```
