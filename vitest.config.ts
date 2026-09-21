import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Two envs: server runs on node, client on DOM
export default defineConfig({
  test: {
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
