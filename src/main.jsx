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
  if ('caches' in window) {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        caches.delete(cacheName);
      });
    });
  }
}

// Gestion des rejets non gérés — log en dev, Sentry en prod, évite crash
window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason;
  const msg = reason?.message || (typeof reason === 'string' ? reason : String(reason ?? 'Unknown'));
  if (import.meta.env.DEV) {
    console.warn('[Unhandled rejection]', msg);
  }
  if (import.meta.env.PROD && window.Sentry) {
    window.Sentry.captureException(reason instanceof Error ? reason : new Error(msg), {
      tags: { type: 'unhandledrejection' },
    });
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

// Vérifier que le root existe avant de rendre
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ Élément root introuvable!');
  document.body.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; text-align: center; font-family: system-ui;">
      <h1 style="color: #f97316; margin-bottom: 16px;">Erreur de chargement</h1>
      <p style="color: #666; margin-bottom: 24px;">L'application n'a pas pu se charger correctement.</p>
      <button onclick="window.location.reload()" style="padding: 12px 24px; background: #f97316; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
        Recharger la page
      </button>
    </div>
  `;
} else {
  try {
    ReactDOM.createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>
    );
  } catch (error) {
    console.error('❌ Erreur lors du rendu de React:', error);
    rootElement.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; text-align: center; font-family: system-ui;">
        <h1 style="color: #f97316; margin-bottom: 16px;">Erreur de chargement</h1>
        <p style="color: #666; margin-bottom: 24px;">Une erreur est survenue lors du chargement de l'application.</p>
        <button onclick="window.location.reload()" style="padding: 12px 24px; background: #f97316; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
          Recharger la page
        </button>
      </div>
    `;
  }
}

// Register Service Worker PWA (vite-plugin-pwa en production)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  let registration = null;
  let updateCheckInterval = null;

  const registerSW = () => {
    navigator.serviceWorker.register('/sw-custom.js', { scope: '/' })
      .then((reg) => {
        registration = reg;
        console.log('✅ Service Worker enregistré:', reg.scope);

        // Vérifier les mises à jour toutes les 5 min (mobile PWA utilise souvent ancienne version sinon)
        updateCheckInterval = setInterval(() => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {});
        }, 5 * 60 * 1000);

        // Écouter les mises à jour disponibles
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nouvelle version disponible
              console.log('🔄 Nouvelle version disponible');
              window.dispatchEvent(new CustomEvent('sw-update-available', { 
                detail: { registration: reg, newWorker } 
              }));
              // PWA mobile : appliquer la mise à jour automatiquement après 3s (évite ancienne version tenace)
              const isPwaMobile = (window.matchMedia('(display-mode: standalone)').matches || (window.navigator.standalone === true)) && window.innerWidth < 1024;
              if (isPwaMobile) {
                setTimeout(() => {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                }, 3000);
              }
            } else if (newWorker.state === 'activated') {
              // Nouveau worker activé, recharger la page
              console.log('✅ Nouveau Service Worker activé');
              window.location.reload();
            }
          });
        });

        // Vérifier s'il y a déjà un worker en attente
        if (reg.waiting && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent('sw-update-available', { 
            detail: { registration: reg, newWorker: reg.waiting } 
          }));
          // PWA mobile : appliquer automatiquement après 3s
          const isPwaMobile = (window.matchMedia('(display-mode: standalone)').matches || (window.navigator.standalone === true)) && window.innerWidth < 1024;
          if (isPwaMobile) {
            setTimeout(() => {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }, 3000);
          }
        }

        // Vérifier les mises à jour immédiatement
        reg.update().catch(() => {});
        // Revérifier après 2s et 5s (cache mobile peut servir l'ancienne version)
        setTimeout(() => reg.update().catch(() => {}), 2000);
        setTimeout(() => reg.update().catch(() => {}), 5000);
        setTimeout(() => reg.update().catch(() => {}), 15000);

        // Sur mobile : revérifier à chaque retour sur l'app (visibilité)
        const onVis = () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {});
        };
        document.addEventListener('visibilitychange', onVis);
      })
      .catch((err) => {
        console.warn('⚠️ Échec enregistrement Service Worker:', err);
        // Si le SW échoue, l'app doit quand même fonctionner
        // Ne pas bloquer le chargement de l'app
      });
  };

  // Attendre que la page soit chargée
  if (document.readyState === 'complete') {
    setTimeout(registerSW, 1000);
  } else {
    window.addEventListener('load', () => {
      setTimeout(registerSW, 1000);
    });
  }

  // Gérer les messages du service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }
  });

  // Gérer les erreurs du service worker
  navigator.serviceWorker.addEventListener('error', (event) => {
    console.error('❌ Erreur Service Worker:', event.error);
    // Désenregistrer le SW défaillant pour permettre un nouveau chargement
    if (registration) {
      registration.unregister().then(() => {
        console.log('🔄 Service Worker défaillant désenregistré');
        // Nettoyer les caches en cas d'erreur persistante
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            caches.delete(cacheName).then(() => {
              console.log(`🗑️ Cache supprimé: ${cacheName}`);
            });
          });
        });
      });
    }
  });

  // Fonction de récupération en cas d'écran blanc persistant
  const handleRecovery = () => {
    // Attendre 5 secondes après le chargement
    setTimeout(() => {
      // Vérifier si l'app s'est bien chargée
      const root = document.getElementById('root');
      if (root && root.children.length === 0) {
        console.warn('⚠️ Écran blanc détecté, tentative de récupération...');
        // Nettoyer les caches et recharger
        caches.keys().then(cacheNames => {
          Promise.all(cacheNames.map(name => caches.delete(name))).then(() => {
            window.location.reload();
          });
        });
      }
    }, 5000);
  };

  // Activer la récupération uniquement en production
  if (import.meta.env.PROD) {
    window.addEventListener('load', handleRecovery);
  }
}
