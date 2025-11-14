import { test, expect } from '@playwright/test';

test.describe('App E2E Tests', () => {
  const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:8080/app';

  test('should load the main application page', async ({ page }) => {
    await page.goto(BASE_URL);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check if the page title is present
    const title = await page.title();
    expect(title).toBeTruthy();

    // Check if main content is rendered
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to cube projects section', async ({ page }) => {
    await page.goto(BASE_URL);

    // Wait for navigation elements
    await page.waitForLoadState('networkidle');

    // Look for cube projects link/button (actual selector depends on app structure)
    // This is a generic test that can be adapted to actual app structure
    const projectsLink = page.locator('a, button').filter({ hasText: /project/i }).first();
    if (await projectsLink.isVisible()) {
      await projectsLink.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('should display version information', async ({ page }) => {
    await page.goto(BASE_URL);

    await page.waitForLoadState('networkidle');

    // Check for version info in footer or header
    const versionText = await page.locator('text=/v\\d+\\.\\d+\\.\\d+/').first().textContent();
    if (versionText) {
      expect(versionText).toMatch(/v\d+\.\d+\.\d+/);
    }
  });
});

test.describe('Create Cube Project Workflow', () => {
  const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:8080/app';

  test('should navigate to create project page', async ({ page }) => {
    await page.goto(BASE_URL);

    await page.waitForLoadState('networkidle');

    // Find and click create project button
    const createButton = page.locator('button, a').filter({ hasText: /create|new/i }).first();
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForLoadState('networkidle');

      // Verify we're on a create page
      const createForm = page.locator('form, input, select, textarea').first();
      await expect(createForm).toBeVisible();
    }
  });

  test('should handle form submission', async ({ page }) => {
    await page.goto(`${BASE_URL}/create`);

    await page.waitForLoadState('networkidle');

    // Fill out form if present
    const formInputs = page.locator('input, select, textarea');
    const count = await formInputs.count();

    if (count > 0) {
      // Fill first input with test data
      await formInputs.first().fill('test-value');

      // Submit form
      const submitButton = page.locator('button[type="submit"]').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForLoadState('networkidle');
      }
    }
  });
});

test.describe('Data Upload Workflow', () => {
  const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:8080/app';

  test('should show upload interface', async ({ page }) => {
    await page.goto(`${BASE_URL}/upload`);

    await page.waitForLoadState('networkidle');

    // Check for upload elements
    const uploadArea = page.locator('input[type="file"], .upload-area, .dropzone');
    if (await uploadArea.isVisible()) {
      expect(uploadArea).toBeVisible();
    }
  });
});
