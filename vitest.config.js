import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
    exclude: ['tests/e2e/**', 'tests/coverage-gaps.test.js', '**/*.spec.js', 'functions/**', 'node_modules/**'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.js'],
      exclude: ['src/core/firebase.js', 'src/main.js'],
    },
  },
});
