import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
      exclude: [
        'tests/**',
        '**/*.config.*',
        'scripts/**',
        'dist/**',
        'node_modules/**',
        'src/taskpane/index.tsx',
      ],
    },
  },
});
