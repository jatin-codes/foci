import { defineConfig } from 'vite';

// Bundled so the shared contract, outside server/, ends up in the output.
export default defineConfig({
  root: import.meta.dirname,
  build: {
    ssr: 'src/server.ts',
    outDir: 'dist',
    emptyOutDir: true,
    target: 'node20',
    sourcemap: true,
  },
});
