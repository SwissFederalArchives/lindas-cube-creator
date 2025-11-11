import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Cube Creator/i);
  });

  test('version is displayed with lindas- prefix', async ({ page }) => {
    await page.goto('/');

    // Find the footer with version info
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // Check for lindas- prefix in version
    await expect(footer).toContainText(/lindas-\d+\.\d+\.\d+/);
  });

  test('navigation bar is present', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('API health check', async ({ request }) => {
    const response = await request.get('/api/');
    expect(response.ok()).toBeTruthy();
  });

  test('app routes are accessible', async ({ page }) => {
    await page.goto('/');

    // Verify we're on the app
    await expect(page).toHaveURL(/\/app\//);
  });

  test('no console errors on page load', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');

    // Wait a bit for any delayed errors
    await page.waitForTimeout(2000);

    // We expect no critical errors (some warnings might be ok)
    expect(errors.filter(e => !e.includes('Warning'))).toHaveLength(0);
  });
});
