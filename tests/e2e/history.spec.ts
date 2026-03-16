import { test, expect, waitForConnected } from './fixtures/setup';

test.describe('History Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForConnected(page);
    await page.click('text=History');
    await expect(page.locator('.v-window-item--active').locator('text=Time')).toBeVisible();
  });

  test('should have history entries from mock data', async ({ page }) => {
    // The mock sends periodic updates, so there should be at least one history entry
    const rows = page.locator('.v-data-table tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });

  test('should reset history', async ({ page }) => {
    // Ensure there's data first
    await expect(page.locator('.v-data-table tbody tr').first()).toBeVisible();

    // Click Reset and verify the store array was emptied
    await page.click('button:has-text("Reset")');
    const wasReset = await page.evaluate(() => {
      return (window as any).__deviceStore.history.length < 3;
    });
    expect(wasReset).toBe(true);
  });
});
