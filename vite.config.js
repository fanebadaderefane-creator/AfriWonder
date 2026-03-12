import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { createRequire } from 'module'

// =============================================================================
// COMPATIBILITÉ RECHARTS + VITE (ESM) - NE PAS SUPPRIMER
// Recharts et ses deps (lodash, eventemitter3, prop-types, react-smooth) sont
// en CommonJS. Sans ces réglages : "doesn't provide an export named: 'default'"
// - Alias lodash → lodash-es (version ESM)
// - optimizeDeps.include : pré-bundle avec interop CJS→ESM
// - dedupe eventemitter3 : éviter la copie imbriquée dans recharts
// =============================================================================

// PWA optionnel : si vite-plugin-pwa n'est pas installé, le dev server démarre quand même
const require = createRequire(import.meta.url)
let VitePWA = null
try {
  VitePWA = require('vite-plugin-pwa').VitePWA
} catch (_) {}

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'info',
  resolve: {
    alias: [
      // Recharts utilise lodash (CJS). Alias vers lodash-es (ESM) - requis pour Vite
      { find: /^lodash\/(.*)$/, replacement: 'lodash-es/$1' },
      { find: 'lodash', replacement: 'lodash-es' },
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: 'react', replacement: path.resolve(__dirname, './node_modules/react') },
      { find: 'react-dom', replacement: path.resolve(__dirname, './node_modules/react-dom') },
      // Recharts peut résoudre react-is depuis recharts/node_modules (version ancienne sans export ESM isFragment).
      { find: 'react-is', replacement: path.resolve(__dirname, './node_modules/react-is') },
    ],
    dedupe: ['react', 'react-dom', 'react-is', 'eventemitter3'],
  },
  optimizeDeps: {
    // Pré-bundler recharts + deps CJS (prop-types, react-smooth, eventemitter3) pour interop ESM
    include: ['react', 'react-dom', 'react-router-dom', 'prop-types', 'react-smooth', 'lodash-es', 'recharts', 'eventemitter3'],
    esbuildOptions: {
      resolveExtensions: ['.jsx', '.js', '.ts', '.tsx'],
    },
  },
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
    ...(VitePWA ? [VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw-custom.js',
      injectManifest: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MiB (bundle ~3.4 MiB)
      },
      manifest: {
        id: '/',
        name: 'AfriWonder - Plateforme Sociale Africaine',
        short_name: 'AfriWonder',
        description: 'Plateforme de partage vidéo, marketplace et services pour l\'Afrique',
        start_url: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        background_color: '#000000',
        theme_color: '#f97316',
        orientation: 'portrait',
        scope: '/',
        icons: [
          { src: '/icon-72.png', sizes: '72x72', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        categories: ['social', 'entertainment', 'shopping'],
        lang: 'fr',
        dir: 'ltr',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
      },
    })] : []),
  ],
  // PWA Configuration
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // Ne pas chunker recharts - le laisser dans le bundle principal pour éviter les erreurs d'initialisation
            // Si recharts est présent, ne pas créer de chunk séparé
            if (id.includes('recharts')) {
              return; // Pas de chunk séparé, inclus dans le bundle principal
            }
            if (id.includes('react-dom') || id.includes('react/') || id.includes('react-router')) return 'react-vendor';
            if (id.includes('@tanstack/react-query')) return 'query-vendor';
            if (id.includes('@radix-ui')) return 'ui-vendor';
            if (id.includes('framer-motion')) return 'framer-vendor';
            if (id.includes('hls.js')) return 'video-vendor';
            if (id.includes('@stripe')) return 'stripe-vendor';
            if (id.includes('axios')) return 'axios-vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
  // Mobile optimization + proxy API en dev (évite CORS front 5173 → backend 3000)
  server: {
    // `true` = écoute sur IPv4 + IPv6 (meilleure compat Firefox pour ws://localhost)
    host: true,
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      clientPort: 5173,
    },
    headers: {
      // Empêche le navigateur de réutiliser des chunks dev potentiellement corrompus.
      'Cache-Control': 'no-store',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
