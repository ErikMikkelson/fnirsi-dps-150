import { test as base, expect } from '@playwright/test';

// Extended test fixture for DPS-150 E2E tests.
// The app auto-connects in test mode (VITE_USE_TEST_CLIENT=true in .env.local).
// Use ?noconnect to skip auto-connection for disconnected-state tests.
export const test = base.extend({
  page: async ({ page }, use) => {
    // Monitor console logs and errors
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        console.error('[PAGE ERROR]', text);
      }
    });

    await use(page);
  },
});

// Helper: wait for mock auto-connect to complete
export async function waitForConnected(page: any) {
  await page.waitForFunction(
    () => (window as any).__deviceStore?.port !== null,
    null,
    { timeout: 5000 }
  );
  // Give the mock a moment to send initial data
  await page.waitForTimeout(600);
}

// Helper: inject data into the device store (bypasses worker, directly updates reactive state)
export async function injectDeviceData(page: any, data: Record<string, any>) {
  await page.evaluate((d: any) => {
    Object.assign((window as any).__deviceStore.device, d);
  }, data);
}

export { expect };
