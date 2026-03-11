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
        // Optimize chunk splitting for better caching
        manualChunks(id) {
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
        },
      },
    },
    sourcemap: false,
    // Improve minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console.error for debugging, but could strip console.log in prod
        passes: 2,
      },
    },
  },
});
