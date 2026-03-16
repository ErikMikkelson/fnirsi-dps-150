import { test, expect, waitForConnected } from './fixtures/setup';

test.describe('Settings Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForConnected(page);
    await page.click('text=Settings');
    await expect(page.locator('.v-window-item--active').locator('text=Brightness')).toBeVisible();
  });

  test('should change brightness', async ({ page }) => {
    await page.locator('tr:has-text("Brightness") td.changeable').click();
    await expect(page.locator('.v-dialog[role="dialog"]')).toBeVisible();

    // Input 8
    await page.click('#numberInputTable button:has-text("8")');
    // Confirm with x1
    await page.locator('#numberInputTable button').filter({ hasText: /^x1$/ }).click();

    await expect(page.locator('.v-dialog[role="dialog"]')).not.toBeVisible();
  });

  test('should change volume', async ({ page }) => {
    await page.locator('tr:has-text("Volume") td.changeable').click();
    await expect(page.locator('.v-dialog[role="dialog"]')).toBeVisible();

    // Input 5
    await page.click('#numberInputTable button:has-text("5")');
    // Confirm with x1
    await page.locator('#numberInputTable button').filter({ hasText: /^x1$/ }).click();

    await expect(page.locator('.v-dialog[role="dialog"]')).not.toBeVisible();
  });
});
