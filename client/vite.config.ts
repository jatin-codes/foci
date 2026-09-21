import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

// Mirrored by `paths` in client/tsconfig.json, which cannot import this list.
const src = path.join(import.meta.dirname, 'src');

export const aliases = {
  '@api': path.join(src, 'api'),
  '@components': path.join(src, 'components'),
  '@hooks': path.join(src, 'hooks'),
  '@shared': path.join(import.meta.dirname, '..', 'shared'),
};

export default defineConfig({
  root: import.meta.dirname,
  plugins: [react()],
  resolve: { alias: aliases },
  server: {
    port: 5173,
    proxy: {
      '/todos': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
