import { test, expect, waitForConnected } from './fixtures/setup';

test.describe('Output Control', () => {
  test('should toggle output via UI button', async ({ page }) => {
    await page.goto('/');
    await waitForConnected(page);

    // Initial state: output is enabled (mock starts with outputEnabled=true)
    const outputEnabled = await page.evaluate(() => (window as any).__deviceStore.device.outputEnabled);
    expect(outputEnabled).toBe(true);

    // Disable button should be visible
    const disableBtn = page.locator('button[title="Disable"]');
    await expect(disableBtn).toBeVisible();

    // Click to disable
    await disableBtn.click();
    await page.waitForTimeout(600); // Wait for mock to process and send update

    // Enable button should now be visible
    const enableBtn = page.locator('button[title="Enable"]');
    await expect(enableBtn).toBeVisible();
  });
});
