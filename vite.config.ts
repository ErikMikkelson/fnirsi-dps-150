/// <reference types="vitest" />
import { defineConfig } from 'vite';
import vuetify from 'vite-plugin-vuetify';

import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
  ],
  server: {
    port: 3000,
  },
  test: {
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    projects: [
      {
        name: 'node',
        test: {
          globals: true,
          environment: 'node',
          include: ['**/dps-150.test.ts'],
        },
      },
      {
        name: 'browser',
        test: {
          globals: true,
          browser: {
            enabled: true,
            provider: 'playwright',
            name: 'chromium',
            headless: true,
          },
          include: ['**/utils.browser.test.ts'],
        },
      },
    ],
  },
});
