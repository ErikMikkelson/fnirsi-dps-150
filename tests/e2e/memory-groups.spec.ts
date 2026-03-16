import { test, expect, waitForConnected } from './fixtures/setup';

test.describe('Memory Groups Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForConnected(page);
    await page.click('text=Memory Groups');
    await expect(page.locator('.v-window-item--active .groups')).toBeVisible();
  });

  test('should display all 6 memory groups', async ({ page }) => {
    for (let i = 1; i <= 6; i++) {
      await expect(page.locator(`.groups`).locator(`text=M${i}`)).toBeVisible();
    }
  });

  test('should show voltage and current for each group', async ({ page }) => {
    // Each group should show V and A values
    const items = page.locator('.groups .v-list-item');
    const count = await items.count();
    expect(count).toBe(6);

    // First group should show values with V and A suffixes
    const firstItem = items.first();
    await expect(firstItem).toContainText('V');
    await expect(firstItem).toContainText('A');
  });
});
