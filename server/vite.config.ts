import { defineConfig } from 'vite';

// The server is bundled rather than compiled file by file, so the shared contract it imports
// from outside server/ is folded into one output file. Packages stay external: they are
// installed alongside the build, as in the production image.
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
