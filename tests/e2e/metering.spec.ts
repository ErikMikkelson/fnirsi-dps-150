import { test, expect, waitForConnected, injectDeviceData } from './fixtures/setup';

test.describe('Metering Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForConnected(page);
    await page.click('text=Metering');
    await expect(page.locator('.v-window-item--active').locator('text=Output Capacity')).toBeVisible();
  });

  test('should display capacity in mAh when < 1Ah', async ({ page }) => {
    await injectDeviceData(page, { outputCapacity: 0.123456 });

    const capacityCell = page.locator('tr:has-text("Output Capacity") td').nth(1);
    await expect(capacityCell).toContainText('mAh');
  });

  test('should display capacity in Ah when >= 1Ah', async ({ page }) => {
    await injectDeviceData(page, { outputCapacity: 1.234567 });

    const capacityCell = page.locator('tr:has-text("Output Capacity") td').nth(1);
    await expect(capacityCell).toContainText('Ah');
    await expect(capacityCell).not.toContainText('mAh');
  });

  test('should display energy in mWh when < 1Wh', async ({ page }) => {
    await injectDeviceData(page, { outputEnergy: 0.5 });

    const energyCell = page.locator('tr:has-text("Output Energy") td').nth(1);
    await expect(energyCell).toContainText('mWh');
  });

  test('should display energy in Wh when >= 1Wh', async ({ page }) => {
    await injectDeviceData(page, { outputEnergy: 12.5 });

    const energyCell = page.locator('tr:has-text("Output Energy") td').nth(1);
    await expect(energyCell).toContainText('Wh');
    await expect(energyCell).not.toContainText('mWh');
  });
});
