import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11'],
    }),
  ],
  build: {
    outDir: '.',
    emptyOutDir: false, // CRITICAL: do not delete index.html, styles.css, pics/, etc.
    rollupOptions: {
      input: 'src/main.js',
      output: {
        entryFileNames: 'script.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (a) => a.name && a.name.endsWith('.css') ? 'styles.css' : 'assets/[name]-[hash][extname]',
      },
    },
    sourcemap: true,
  },
});
