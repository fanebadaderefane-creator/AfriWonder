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
import { VitePWA } from 'vite-plugin-pwa'
let viteCompression = null
try {
  viteCompression = require('vite-plugin-compression')
} catch (_) {}

/** Audit p.13 : preconnect API + CDN fonts — réduit latence connexion (LCP / TTFB perçu). */
function auditResourceHintsPlugin() {
  const name = 'afw-audit-resource-hints'
  return {
    name,
    transformIndexHtml(html) {
      const lines = []
      const api = process.env.VITE_API_URL || ''
      if (api && /^https?:\/\//i.test(api)) {
        try {
          const u = new URL(api)
          lines.push(`<link rel="preconnect" href="${u.origin}" crossorigin />`)
          lines.push(`<link rel="dns-prefetch" href="${u.origin}" />`)
        } catch (_e) {}
      }
      lines.push(`<link rel="dns-prefetch" href="https://fonts.googleapis.com" />`)
      lines.push(`<link rel="dns-prefetch" href="https://fonts.gstatic.com" />`)
      const inject = lines.length ? `${lines.join('\n    ')}\n    ` : ''
      return html.replace('<head>', `<head>\n    ${inject}`)
    },
  }
}

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
    auditResourceHintsPlugin(),
    react({
      jsxRuntime: 'automatic',
    }),
    VitePWA({
      // Pas de skipWaiting automatique : l'utilisateur confirme via PWAUpdateToast
      registerType: 'prompt',
      injectRegister: null,
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw-custom.js',
      injectManifest: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MiB
      },
      // Pas de manifest inline - on utilise public/manifest.json (source unique de verite)
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      devOptions: {
        enabled: true,
      },
    }),
    ...(viteCompression
      ? [
          viteCompression({
            algorithm: 'gzip',
            ext: '.gz',
            threshold: 1024,
            deleteOriginFile: false,
          }),
          viteCompression({
            algorithm: 'brotliCompress',
            ext: '.br',
            threshold: 1024,
            deleteOriginFile: false,
          }),
        ]
      : []),
  ],
  // PWA Configuration
  build: {
    emptyOutDir: true,
    // Cible large : Android 5+, iOS 12+, Chrome 80+, Firefox 75+
    // Évite les erreurs syntax ES2020+ sur vieux mobiles africains (mid/low-range)
    target: ['es2017', 'edge88', 'firefox78', 'chrome80', 'safari13'],
    // Terser : minification plus agressive qu'esbuild (mangle + drop_console en prod)
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,   // Supprime tous les console.* en production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2,            // Double-passe pour réduction max
      },
      mangle: { safari10: true },
      format: { comments: false },
    },
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Nommage prévisible pour le cache navigateur
        chunkFileNames: 'chunks/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return;

          // ── TIER 1 : Cœur React (chargé à chaque page) ──────────────────
          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/react-router/') ||
            id.includes('/node_modules/react-router-dom/')
          ) return 'react-core';

          // ── TIER 2 : Data layer (utilisé par toute l'app) ────────────────
          if (id.includes('@tanstack/react-query')) return 'query-vendor';
          if (id.includes('socket.io-client'))      return 'socket-vendor';
          if (id.includes('axios'))                  return 'axios-vendor';

          // ── TIER 3 : UI shell (composants du layout principal) ────────────
          if (id.includes('@radix-ui'))              return 'ui-vendor';
          if (id.includes('framer-motion'))          return 'framer-vendor';
          if (id.includes('lucide-react'))           return 'lucide-vendor';

          // ── TIER 4 : Features lazy (chargées à la demande) ───────────────
          if (id.includes('recharts'))               return 'recharts-vendor'; // Analytics
          if (id.includes('hls.js'))                 return 'video-vendor';    // Feed/Live
          if (id.includes('agora-rtc-sdk'))          return 'agora-vendor';    // Appels
          if (id.includes('@stripe'))                return 'stripe-vendor';   // Checkout
          if (id.includes('/three/') || id.includes('node_modules/three')) return 'three-vendor';
          if (id.includes('leaflet') || id.includes('react-leaflet')) return 'leaflet-vendor';
          if (id.includes('@hello-pangea/dnd'))      return 'dnd-vendor';

          // ── TIER 5 : Utilitaires (regroupés pour limiter les requêtes HTTP) ─
          if (id.includes('dompurify'))              return 'utils-vendor';
          if (id.includes('react-markdown'))         return 'utils-vendor';
          if (id.includes('embla-carousel'))         return 'utils-vendor';
          if (id.includes('date-fns'))               return 'utils-vendor';
          if (id.includes('papaparse'))              return 'utils-vendor';
          if (id.includes('qrcode'))                 return 'utils-vendor';
          if (id.includes('canvas-confetti'))        return 'utils-vendor';
          if (id.includes('sonner'))                 return 'utils-vendor';
          if (id.includes('react-window'))           return 'utils-vendor';
          if (id.includes('zod'))                    return 'utils-vendor';
        },
      },
    },
    chunkSizeWarningLimit: 400,
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
    // 127.0.0.1 (pas localhost) : sur Windows, localhost → ::1 en IPv6 alors que l'API écoute en IPv4 (0.0.0.0) → ECONNREFUSED au proxy.
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
