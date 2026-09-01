import react from '@vitejs/plugin-react';
import path from 'path';
import { createRequire } from 'module';
import { defineConfig } from 'vitest/config';

const require = createRequire(import.meta.url);

const alias = {
  '@': path.resolve(__dirname, 'src'),
  react: path.dirname(require.resolve('react/package.json')),
  'react-dom': path.dirname(require.resolve('react-dom/package.json')),
};

const shared = {
  environment: 'jsdom' as const,
  globals: true,
  setupFiles: ['./src/setup-tests.ts'],
  snapshotFormat: { escapeString: true, printBasicPrototype: true },
  server: {
    deps: {
      inline: [/./],
    },
  },
};

export default defineConfig({
  resolve: { alias },
  test: {
    reporters: ['verbose'],
    coverage: {
      reporter: ['text', 'lcov'],
      provider: 'v8',
    },
    projects: [
      {
        plugins: [react({ include: /\.(jsx|tsx|js|ts)$/ })],
        resolve: { alias },
        test: {
          ...shared,
          name: 'unit',
          include: ['./src/**/*.test.(ts|tsx)'],
          exclude: ['./src/storyshots.test.tsx'],
        },
      },
      {
        plugins: [react({ include: /\.(jsx|tsx|js|ts)$/ })],
        resolve: { alias },
        test: {
          ...shared,
          name: 'storyshots',
          include: ['./src/storyshots.test.tsx'],
          env: { STORYSHOTS_TEST: 'true' },
        },
      },
    ],
  },
});
