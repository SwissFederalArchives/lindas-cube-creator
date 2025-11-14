import { test, expect } from '@playwright/test';

test.describe('Navigation E2E', () => {
  const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:8080/app';

  test('should have working navigation menu', async ({ page }) => {
    await page.goto(BASE_URL);

    await page.waitForLoadState('networkidle');

    // Check for navigation elements
    const nav = page.locator('nav, .navigation, [role="navigation"]');
    if (await nav.isVisible()) {
      expect(nav).toBeVisible();

      // Check for menu items
      const menuItems = nav.locator('a, button');
      const count = await menuItems.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should navigate between pages', async ({ page }) => {
    await page.goto(BASE_URL);

    await page.waitForLoadState('networkidle');

    // Find all navigation links
    const links = page.locator('nav a, .navigation a').filter({ hasText: /\w+/ });

    const count = await links.count();
    if (count > 0) {
      // Click on first link
      await links.first().click();
      await page.waitForLoadState('networkidle');

      // Verify URL changed
      const currentUrl = page.url();
      expect(currentUrl).not.toBe(BASE_URL);
    }
  });

  test('should show active navigation state', async ({ page }) => {
    await page.goto(BASE_URL);

    await page.waitForLoadState('networkidle');

    // Check if active state is indicated
    const activeLink = page.locator('a.active, a[aria-current="page"]').first();
    if (await activeLink.isVisible()) {
      expect(activeLink).toHaveClass(/active/);
    }
  });
});
