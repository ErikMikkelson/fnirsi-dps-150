import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          globals: true,
          environment: 'node',
          setupFiles: ['./tests/setup.ts'],
          silent: process.env.CI === '1',
          include: ['tests/**/*.test.ts'],
          exclude: ['tests/**/*.browser.test.ts'],
          coverage: {
            reporter: ['text', 'json', 'html'],
            exclude: [
              'node_modules/**',
              'tests/**',
              '**/*.config.ts',
              'script.ts',
              'worker.ts',
              'index.html'
            ]
          }
        }
      },
      {
        extends: true,
        test: {
          name: 'browser',
          globals: true,
          include: ['tests/**/*.browser.test.ts'],
          browser: {
            enabled: true,
            provider: 'playwright',
            instances: [
              { browser: 'chromium' }
            ],
            headless: process.env.CI === '1'
          }
        }
      }
    ]
  }
});