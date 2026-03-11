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
    // Target modern browsers for smaller output (async/await, optional chaining kept as-is)
    target: 'es2020',
    // CSS code splitting — keep CSS per chunk for better caching
    cssCodeSplit: true,
    rollupOptions: {
      input: 'src/main.js',
      output: {
        entryFileNames: 'script.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (a) => a.name && a.name.endsWith('.css') ? 'styles.css' : 'assets/[name]-[hash][extname]',
        // Optimize chunk splitting for better caching
        manualChunks(id) {
          // Core shared utilities — cached long-term, rarely changes
          if (id.includes('/core/utils') || id.includes('/core/constants')) {
            return 'core';
          }
          // Group world-class feature modules into a single chunk
          if (id.includes('/modules/stories') || id.includes('/modules/moodorder') ||
              id.includes('/modules/livequeue') || id.includes('/modules/streaks') ||
              id.includes('/modules/giftcards') || id.includes('/modules/referral') ||
              id.includes('/modules/musicplayer') || id.includes('/modules/arpreview') ||
              id.includes('/modules/voiceorder') || id.includes('/modules/geofence')) {
            return 'worldclass';
          }
          // Group engagement modules
          if (id.includes('/modules/challenges') || id.includes('/modules/spinwheel') ||
              id.includes('/modules/secretmenu') || id.includes('/modules/feedback') ||
              id.includes('/modules/socialshare') || id.includes('/modules/polls') ||
              id.includes('/modules/milestones') || id.includes('/modules/ordertracker')) {
            return 'engagement';
          }
          // Seasonal & contextual features — loaded together, change infrequently
          if (id.includes('/modules/seasonal') || id.includes('/modules/weather')) {
            return 'seasonal';
          }
        },
      },
    },
    sourcemap: false,
    // Improve minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        pure_funcs: ['console.log', 'console.info'], // Strip verbose logs in prod, keep error/warn
        passes: 2,
      },
    },
    // Build reporting — log chunk sizes and warnings for large bundles
    reportCompressedSize: true,
    chunkSizeWarningLimit: 150, // Warn if any chunk exceeds 150 KB
    // Compression hints — ensure assets are optimally sized for gzip/brotli
    assetsInlineLimit: 4096, // Inline assets smaller than 4KB as base64
  },
});
