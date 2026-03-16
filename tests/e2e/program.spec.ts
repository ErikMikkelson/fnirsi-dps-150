import { test, expect, waitForConnected } from './fixtures/setup';

test.describe('Program Tab - Examples', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForConnected(page);
    await page.click('text=Program');
    await expect(page.locator('.v-window-item--active textarea').first()).toBeVisible();
  });

  test('should display default example on load', async ({ page }) => {
    const textarea = page.locator('.v-window-item--active textarea').first();
    const content = await textarea.inputValue();

    // Default should be "Sweep Voltage"
    expect(content).toContain('const START = 1;');
    expect(content).toContain('V(START)');
    expect(content).toContain('while (V() + STEP < END)');
  });

  test('should switch to Sine Wave example', async ({ page }) => {
    await page.getByRole('button', { name: 'Examples' }).click();
    await page.click('text=Sine Wave');

    const textarea = page.locator('.v-window-item--active textarea').first();
    const content = await textarea.inputValue();

    expect(content).toContain('const CENTER = 10;');
    expect(content).toContain('Math.sin(i / 20)');
    expect(content).toContain('times(1000, (i) => {');
  });

  test('should switch to Sweep Current example', async ({ page }) => {
    await page.getByRole('button', { name: 'Examples' }).click();
    await page.click('text=Sweep Current');

    const textarea = page.locator('.v-window-item--active textarea').first();
    const content = await textarea.inputValue();

    expect(content).toContain('I(START)');
    expect(content).toContain('while (I() + STEP < END)');
  });
});
