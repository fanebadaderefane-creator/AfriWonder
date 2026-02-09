import React, { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import ErrorBoundary from '@/components/common/ErrorBoundary'
import '@/index.css'

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
      navigator.serviceWorker.register('/sw-custom.js')
        .then((reg) => {
          console.log('✅ PWA Service Worker registered');
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('Nouvelle version disponible. Rechargez pour mettre à jour.');
              }
            });
          });
        })
        .catch((err) => console.warn('❌ Service Worker registration failed:', err));
    }, 500);
  });
}
