import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { aliases } from './client/vite.config.js';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['server/src/**', 'client/src/**', 'shared/**/*.ts'],
      exclude: ['server/src/server.ts', 'client/src/main.tsx'],
      reporter: ['text-summary'],
      thresholds: { lines: 95, functions: 90, branches: 85, statements: 95 },
    },
    projects: [
      {
        test: {
          name: 'server',
          environment: 'node',
          include: ['server/tests/**/*.test.ts'],
        },
      },
      {
        plugins: [react()],
        resolve: { alias: aliases },
        test: {
          name: 'client',
          environment: 'jsdom',
          include: ['client/tests/**/*.test.{ts,tsx}'],
          setupFiles: ['./client/tests/setup.ts'],
        },
      },
    ],
  },
});
