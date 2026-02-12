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
  logLevel: 'error',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: [],
    force: true,
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
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MiB (bundle peut dépasser 2 MiB)
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
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
  },
  // Mobile optimization
  server: {
    host: '0.0.0.0', // Permet accès depuis mobile sur réseau local
    port: 5173,
  },
});
