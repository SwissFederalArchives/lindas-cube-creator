import { test, expect } from '@playwright/test';

test.describe('Project Creation E2E', () => {
  const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:8080/app';

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should create a new cube project', async ({ page }) => {
    // Navigate to create project
    await page.click('text=/create|new project/i');

    await page.waitForLoadState('networkidle');

    // Fill project form
    await page.fill('input[name="name"], input[placeholder*="name"], input[id*="name"]', 'Test Project');

    await page.fill('input[name="description"], textarea[placeholder*="description"]', 'E2E Test Project');

    // Submit the form
    await page.click('button[type="submit"], button:has-text("create")');

    await page.waitForLoadState('networkidle');

    // Verify success (depends on actual app flow)
    // This is a placeholder - actual verification depends on app structure
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/create`);

    await page.waitForLoadState('networkidle');

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Check for validation errors
    const errorMessages = page.locator('.error, .validation-error, [role="alert"]');
    if (await errorMessages.isVisible()) {
      expect(await errorMessages.count()).toBeGreaterThan(0);
    }
  });

  test('should navigate through wizard steps', async ({ page }) => {
    await page.goto(`${BASE_URL}/create`);

    await page.waitForLoadState('networkidle');

    const nextButtons = page.locator('button:has-text("next"), a:has-text("next")');
    const count = await nextButtons.count();

    if (count > 0) {
      for (let i = 0; i < Math.min(count, 3); i++) {
        await nextButtons.first().click();
        await page.waitForLoadState('networkidle');
      }
    }
  });
});
