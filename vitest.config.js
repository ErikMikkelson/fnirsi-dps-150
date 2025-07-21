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
          setupFiles: ['./tests/setup.js'],
          silent: process.env.CI === '1',
          include: ['tests/**/*.test.js'],
          exclude: ['tests/**/*.browser.test.js'],
          coverage: {
            reporter: ['text', 'json', 'html'],
            exclude: [
              'node_modules/**',
              'tests/**',
              '**/*.config.js',
              'script.js',
              'worker.js',
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
          include: ['tests/**/*.browser.test.js'],
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