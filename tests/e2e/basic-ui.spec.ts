import { test, expect, waitForConnected } from './fixtures/setup';

test.describe('Basic UI Elements', () => {
  test('should display connect overlay when disconnected', async ({ page }) => {
    await page.goto('/?noconnect');

    // Connect overlay should be visible
    const overlay = page.locator('.v-overlay__content').filter({ hasText: 'Device is not connected' });
    await expect(overlay).toBeVisible();
  });

  test('should display app bar elements', async ({ page }) => {
    await page.goto('/?noconnect');

    await expect(page.locator('.v-app-bar')).toBeVisible();
    await expect(page.locator('.v-app-bar-title')).toContainText('FNIRSI DPS-150');
  });

  test('should display main view with voltage/current/power', async ({ page }) => {
    await page.goto('/');
    await waitForConnected(page);

    await expect(page.locator('.main-view')).toBeVisible();
    await expect(page.locator('.changeable.voltage')).toBeVisible();
    await expect(page.locator('.changeable.current')).toBeVisible();
    await expect(page.locator('.power')).toBeVisible();
  });

  test('should display all tabs and their contents', async ({ page }) => {
    await page.goto('/');
    await waitForConnected(page);

    // Memory Groups
    await page.click('text=Memory Groups');
    await expect(page.locator('.v-window-item--active .groups')).toBeVisible();

    // Metering
    await page.click('text=Metering');
    await expect(page.locator('.v-window-item--active').locator('text=Output Capacity')).toBeVisible();

    // Protections
    await page.click('text=Protections');
    await expect(page.locator('text=Over Voltage Protection')).toBeVisible();

    // Program
    await page.click('text=Program');
    await expect(page.locator('.v-window-item--active textarea').first()).toBeVisible();

    // History
    await page.click('text=History');
    await expect(page.locator('.v-window-item--active').locator('text=Time')).toBeVisible();

    // Settings
    await page.click('text=Settings');
    await expect(page.locator('.v-window-item--active').locator('text=Brightness')).toBeVisible();
  });
});
