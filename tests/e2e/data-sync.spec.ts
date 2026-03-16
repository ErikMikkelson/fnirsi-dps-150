import { test, expect, waitForConnected, injectDeviceData } from './fixtures/setup';

test.describe('Real-time Data Synchronization', () => {
  test('should reflect device data fields in the UI', async ({ page }) => {
    await page.goto('/');
    await waitForConnected(page);

    // Inject specific test data
    await injectDeviceData(page, {
      temperature: 45.6,
      inputVoltage: 13.8,
      outputVoltage: 5.1234,
      outputCurrent: 0.888,
      outputPower: 4.549,
      mode: 'CC',
      protectionState: 'OVP',
    });

    // Temperature: 45.60℃ (>= 10 so 2 decimal places)
    await expect(page.locator('.v-app-bar .v-chip').filter({ hasText: '℃' })).toContainText('45.60');

    // Input voltage: 13.80V
    await expect(page.locator('.v-app-bar .v-chip').filter({ hasText: 'Input:' })).toContainText('13.80');

    // Output voltage in main view
    const mainVoltage = page.locator('.main-view .voltage span').first();
    await expect(mainVoltage).toHaveText('5.123');

    // Output current
    const mainCurrent = page.locator('.main-view .current span').first();
    await expect(mainCurrent).toHaveText('0.888');

    // Output power
    const mainPower = page.locator('.main-view .power span').first();
    await expect(mainPower).toHaveText('4.549');

    // Mode chip: CC
    const modeChip = page.locator('.main-view .v-chip').filter({ hasText: 'CC' });
    await expect(modeChip).toBeVisible();
    await expect(modeChip).toHaveClass(/current/);

    // Protection state: OVP
    const protectionChip = page.locator('.main-view .v-chip').filter({ hasText: 'OVP' });
    await expect(protectionChip).toBeVisible();
  });

  test('should show OK and CV in normal state', async ({ page }) => {
    await page.goto('/');
    await waitForConnected(page);

    await injectDeviceData(page, {
      mode: 'CV',
      protectionState: '',
    });

    const modeChip = page.locator('.main-view .v-chip').filter({ hasText: 'CV' });
    await expect(modeChip).toBeVisible();
    await expect(modeChip).toHaveClass(/voltage/);

    const protectionChip = page.locator('.main-view .v-chip').filter({ hasText: 'OK' });
    await expect(protectionChip).toBeVisible();
  });
});
