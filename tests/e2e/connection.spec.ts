import { test, expect, waitForConnected } from './fixtures/setup';

test.describe('Device Connection', () => {
  test('should display connect overlay when disconnected', async ({ page }) => {
    await page.goto('/?noconnect');

    const overlay = page.locator('.v-overlay__content').filter({ hasText: 'Device is not connected' });
    await expect(overlay).toBeVisible();
  });

  test('should auto-connect in test mode and display device info', async ({ page }) => {
    await page.goto('/');
    await waitForConnected(page);

    // Overlay should be hidden
    await expect(page.locator('.v-overlay--active')).toHaveCount(0);

    // App bar should show device info from mock
    const appBarTitle = page.locator('.v-app-bar-title');
    await expect(appBarTitle).toContainText('DPS-150');
  });

  test('should show device info after auto-connect', async ({ page }) => {
    await page.goto('/');
    await waitForConnected(page);

    const appBarTitle = page.locator('.v-app-bar-title');
    await expect(appBarTitle).toContainText('DPS-150');
    await expect(appBarTitle).toContainText('HW:');
    await expect(appBarTitle).toContainText('FW:');
  });
});
