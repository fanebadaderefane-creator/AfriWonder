/**
 * Capacitor — Option 3 : PWA "native-like"
 * Permet de builder AfriWonder en app native (iOS/Android) avec WebView.
 * Même codebase React/Vite ; autoplay vidéo et UX améliorés en contexte natif.
 *
 * Après premier build : npm run build && npx cap sync
 * Puis : npx cap open android | npx cap open ios
 */
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.afriwonder.app',
  appName: 'AfriWonder',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // En dev, pointer vers le serveur Vite (optionnel)
    // url: 'http://192.168.x.x:5173',
    // cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
