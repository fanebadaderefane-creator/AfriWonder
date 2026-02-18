import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { createRequire } from 'module'

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
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: ['recharts'], // Exclure recharts de l'optimisation pour éviter les problèmes d'initialisation
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
        background_color: '#000000',
        theme_color: '#f97316',
        orientation: 'any',
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
    host: '0.0.0.0', // Permet accès depuis mobile sur réseau local
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
