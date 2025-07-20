import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    silent: process.env.CI === '1', // CI環境でのみ出力抑制
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
});