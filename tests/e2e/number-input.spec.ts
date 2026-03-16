import { test, expect, waitForConnected } from './fixtures/setup';

test.describe('Number Input Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForConnected(page);
  });

  test('should open dialog when clicking voltage', async ({ page }) => {
    await page.click('.changeable.voltage');

    await expect(page.locator('.v-dialog[role="dialog"]')).toBeVisible();
    await expect(page.locator('.v-card-title')).toHaveText('Input Voltage');
  });

  test('should input voltage value in V', async ({ page }) => {
    await page.click('.changeable.voltage');
    await expect(page.locator('.v-dialog[role="dialog"]')).toBeVisible();

    // Input 5.0V
    await page.click('#numberInputTable button:has-text("5")');
    await page.click('#numberInputTable button:has-text(".")');
    await page.click('#numberInputTable button:has-text("0")');
    await page.locator('#numberInputTable button').filter({ hasText: /^V$/ }).click();

    await expect(page.locator('.v-dialog[role="dialog"]')).not.toBeVisible();
  });

  test('should input current value in A', async ({ page }) => {
    await page.click('.changeable.current');
    await expect(page.locator('.v-dialog[role="dialog"]')).toBeVisible();

    // Input 1.5A
    await page.click('#numberInputTable button:has-text("1")');
    await page.click('#numberInputTable button:has-text(".")');
    await page.click('#numberInputTable button:has-text("5")');
    await page.locator('#numberInputTable button').filter({ hasText: /^A$/ }).click();

    await expect(page.locator('.v-dialog[role="dialog"]')).not.toBeVisible();
  });

  test('should input voltage value in mV', async ({ page }) => {
    await page.click('.changeable.voltage');
    await expect(page.locator('.v-dialog[role="dialog"]')).toBeVisible();

    // Input 500mV = 0.5V
    await page.click('#numberInputTable button:has-text("5")');
    await page.click('#numberInputTable button:has-text("0")');
    await page.click('#numberInputTable button:has-text("0")');
    await page.locator('#numberInputTable button').filter({ hasText: /^mV$/ }).click();

    await expect(page.locator('.v-dialog[role="dialog"]')).not.toBeVisible();
  });

  test('should input current value in mA', async ({ page }) => {
    await page.click('.changeable.current');
    await expect(page.locator('.v-dialog[role="dialog"]')).toBeVisible();

    // Input 500mA = 0.5A
    await page.click('#numberInputTable button:has-text("5")');
    await page.click('#numberInputTable button:has-text("0")');
    await page.click('#numberInputTable button:has-text("0")');
    await page.locator('#numberInputTable button').filter({ hasText: /^mA$/ }).click();

    await expect(page.locator('.v-dialog[role="dialog"]')).not.toBeVisible();
  });

  test('should cancel dialog', async ({ page }) => {
    await page.click('.changeable.voltage');
    await expect(page.locator('.v-dialog[role="dialog"]')).toBeVisible();

    // Input some digits then cancel
    await page.click('#numberInputTable button:has-text("1")');
    await page.click('#numberInputTable button:has-text("2")');
    await page.click('text=Cancel');

    await expect(page.locator('.v-dialog[role="dialog"]')).not.toBeVisible();
  });

  test('should use backspace button', async ({ page }) => {
    await page.click('.changeable.voltage');
    await expect(page.locator('.v-dialog[role="dialog"]')).toBeVisible();

    // Input a digit
    await page.click('#numberInputTable button:has-text("1")');

    // Backspace to clear
    await page.click('#numberInputTable button:has-text("⌫")');

    // Another backspace on empty input closes dialog
    await page.click('#numberInputTable button:has-text("⌫")');

    await expect(page.locator('.v-dialog[role="dialog"]')).not.toBeVisible();
  });
});
