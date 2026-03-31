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
  define: {
    __AFRW_SW_VERSION__: JSON.stringify(
      process.env.VERCEL_GIT_COMMIT_SHA ||
        process.env.GITHUB_SHA ||
        `afw-${new Date().toISOString()}`
    ),
  },
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
      /** Aligné avec sw-custom.js : pas de skipWaiting tant que l’utilisateur n’a pas confirmé (PWAUpdateToast). */
      registerType: 'prompt',
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
          { src: '/icon-72.png', sizes: '72x72', type: 'image/png', purpose: 'any' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Créer une vidéo',
            short_name: 'Créer',
            description: 'Ouvrir directement l’écran de création',
            url: '/Create',
            icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Messages',
            short_name: 'Inbox',
            description: 'Accéder rapidement aux messages',
            url: '/Inbox',
            icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Mon profil',
            short_name: 'Profil',
            description: 'Ouvrir mon profil',
            url: '/Profile',
            icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
        share_target: {
          action: '/share-target',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
            files: [
              {
                name: 'files',
                accept: ['image/*', 'video/*'],
              },
            ],
          },
        },
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
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) return 'recharts-vendor';
            if (id.includes('react-dom') || id.includes('react/') || id.includes('react-router')) return 'react-vendor';
            if (id.includes('@tanstack/react-query')) return 'query-vendor';
            if (id.includes('@radix-ui')) return 'ui-vendor';
            if (id.includes('framer-motion')) return 'framer-vendor';
            if (id.includes('hls.js')) return 'video-vendor';
            if (id.includes('agora-rtc-sdk')) return 'agora-vendor';
            if (id.includes('/three/') || id.includes('node_modules/three')) return 'three-vendor';
            if (id.includes('@stripe')) return 'stripe-vendor';
            if (id.includes('axios')) return 'axios-vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 200,
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
    // 127.0.0.1 (pas localhost) : sur Windows, localhost → ::1 en IPv6 alors que l’API écoute en IPv4 (0.0.0.0) → ECONNREFUSED au proxy.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        // Transcodage repair-web-playback : >5 min sinon réponse tronquée / non-JSON côté navigateur
        timeout: 900_000,
        proxyTimeout: 900_000,
      },
      // Socket.IO : même origine que le front en dev (Firefox / réseaux stricts)
      '/socket.io': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
