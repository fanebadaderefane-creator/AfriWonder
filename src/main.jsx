import * as Sentry from '@sentry/react'
import React, { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import ErrorBoundary from '@/components/common/ErrorBoundary'
import '@/index.css'

// Sentry — initialiser le plus tôt possible (désactivé en dev si bloqué par le navigateur)
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
const isDev = import.meta.env.DEV
if (sentryDsn && !isDev) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.VITE_REACT_APP_ENV || import.meta.env.MODE,
    sendDefaultPii: true,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 1.0,
    tracePropagationTargets: ['localhost', /^https?:\/\/[^/]+/],
    replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    enableLogs: true,
  })
  window.Sentry = Sentry
}

// Désenregistrer les service workers en développement pour éviter les conflits avec Vite
if ('serviceWorker' in navigator && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister().then(() => {
        console.log('🔧 Service Worker désenregistré en développement');
      });
    });
  });
}

// Gestion des rejets non gérés — log en dev, évite crash en prod
window.addEventListener('unhandledrejection', (event) => {
  if (import.meta.env.DEV) {
    const msg = event?.reason?.message || String(event?.reason);
    console.warn('[Unhandled rejection]', msg);
  }
});

// Vérifier que React est bien chargé
if (!React || !React.useState) {
  console.error('❌ React n\'est pas correctement chargé!');
  throw new Error('React is not properly loaded');
}

// En production, VITE_API_URL doit être défini (sinon les appels API ciblent localhost)
if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  console.error('⚠️ VITE_API_URL n\'est pas défini en production. Définir la variable d\'environnement pour pointer vers l\'API.');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)

// Register Service Worker PWA (vite-plugin-pwa en production)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      navigator.serviceWorker.register('/sw-custom.js', { scope: '/' })
        .then((reg) => {
          // Always check for an updated service worker on load
          reg.update();

          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                window.dispatchEvent(new CustomEvent('sw-update-available'));
              }
            });
          });
          if (reg.waiting && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent('sw-update-available'));
          }
        })
        .catch(() => {});
    }, 500);
  });
}
