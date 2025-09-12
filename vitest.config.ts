import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist'],
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'scripts/',
        'index.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/*.setup.ts'
      ],
      thresholds: {
        global: {
          branches: 75,
          functions: 80,
          lines: 90,
          statements: 90
        }
      }
    }
  },
  esbuild: {
    target: 'node20'
  },
  ssr: {
    external: ['n8n-workflow']
  }
});