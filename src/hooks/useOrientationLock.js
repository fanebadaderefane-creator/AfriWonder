/**
 * Hook pour verrouiller l'orientation en portrait sur mobile
 * Fonctionne dans le navigateur et en PWA standalone
 */
import { useEffect } from 'react';

// Fonction pour détecter le mode PWA standalone
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
    || document.referrer.includes('android-app://');
}

export function useOrientationLock(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (!isMobile) return;

    const standalone = isStandalone();

    // Fonction pour verrouiller l'orientation en portrait
    const lockOrientation = async () => {
      try {
        // En mode PWA standalone, être plus agressif avec le verrouillage
        // Méthode moderne : Screen Orientation API (Chrome, Firefox, Safari iOS 16.4+)
        if (screen.orientation?.lock) {
          try {
            await screen.orientation.lock('portrait');
            if (process.env.NODE_ENV === 'development' && standalone) {
              console.log('Orientation locked in PWA standalone mode');
            }
            return;
          } catch (err) {
            // Peut échouer si pas d'interaction utilisateur ou restrictions du navigateur
            if (process.env.NODE_ENV === 'development') {
              console.log('Screen Orientation API lock failed:', err);
            }
          }
        }
        
        // Méthode legacy pour Android Chrome
        if (screen.lockOrientation) {
          try {
            screen.lockOrientation('portrait');
            if (process.env.NODE_ENV === 'development' && standalone) {
              console.log('Legacy orientation locked in PWA standalone mode');
            }
            return;
          } catch (err) {
            if (process.env.NODE_ENV === 'development') {
              console.log('Legacy lockOrientation failed:', err);
            }
          }
        }
        
        // Méthode legacy pour Firefox
        if (screen.mozLockOrientation) {
          try {
            screen.mozLockOrientation('portrait');
            return;
          } catch (err) {
            if (process.env.NODE_ENV === 'development') {
              console.log('Moz lockOrientation failed:', err);
            }
          }
        }
        
        // Méthode legacy pour WebKit (Safari iOS < 16.4)
        if (screen.orientation?.lock) {
          try {
            await screen.orientation.lock('portrait');
          } catch (err) {
            // Ignorer silencieusement
          }
        }
      } catch (err) {
        // Toutes les méthodes ont échoué, c'est normal sur certains navigateurs
        if (process.env.NODE_ENV === 'development') {
          console.log('All orientation lock methods failed');
        }
      }
    };

    // En mode PWA standalone, essayer immédiatement et de manière plus agressive
    if (standalone) {
      // Essayer plusieurs fois rapidement au démarrage en PWA
      lockOrientation();
      setTimeout(() => lockOrientation(), 100);
      setTimeout(() => lockOrientation(), 500);
      setTimeout(() => lockOrientation(), 1000);
    } else {
      // Dans le navigateur, essayer une seule fois au démarrage
      lockOrientation();
    }

    // Réessayer après une interaction utilisateur (débloque souvent les restrictions)
    // En mode PWA standalone, être plus agressif
    let interactionCount = 0;
    const maxInteractions = standalone ? 5 : 1;
    
    const handleUserInteraction = () => {
      if (interactionCount < maxInteractions) {
        interactionCount++;
        lockOrientation();
        
        // En PWA standalone, réessayer plusieurs fois après chaque interaction
        if (standalone) {
          setTimeout(() => lockOrientation(), 50);
          setTimeout(() => lockOrientation(), 200);
        }
        
        // Nettoyer après plusieurs interactions
        if (interactionCount >= maxInteractions) {
          setTimeout(() => {
            document.removeEventListener('touchstart', handleUserInteraction);
            document.removeEventListener('click', handleUserInteraction);
            document.removeEventListener('mousedown', handleUserInteraction);
            document.removeEventListener('touchend', handleUserInteraction);
          }, 2000);
        }
      }
    };

    // Écouter plusieurs types d'interactions
    document.addEventListener('touchstart', handleUserInteraction, { once: false, passive: true });
    document.addEventListener('touchend', handleUserInteraction, { once: false, passive: true });
    document.addEventListener('click', handleUserInteraction, { once: false, passive: true });
    document.addEventListener('mousedown', handleUserInteraction, { once: false, passive: true });

    // Réessayer si l'orientation change (certains navigateurs peuvent déverrouiller)
    const handleOrientationChange = () => {
      // Vérifier si on est toujours en portrait
      const isPortrait = window.innerHeight >= window.innerWidth;
      if (!isPortrait) {
        // Réessayer de verrouiller après un court délai
        // En PWA standalone, être plus agressif
        if (standalone) {
          setTimeout(() => lockOrientation(), 50);
          setTimeout(() => lockOrientation(), 150);
          setTimeout(() => lockOrientation(), 300);
        } else {
          setTimeout(() => lockOrientation(), 100);
        }
      }
    };

    // Réessayer périodiquement pour maintenir le verrouillage
    // En mode PWA standalone, vérifier plus souvent (toutes les 2 secondes)
    const checkInterval = setInterval(() => {
      const isPortrait = window.innerHeight >= window.innerWidth;
      if (!isPortrait) {
        lockOrientation();
        // En PWA standalone, réessayer plusieurs fois si nécessaire
        if (standalone) {
          setTimeout(() => lockOrientation(), 100);
          setTimeout(() => lockOrientation(), 300);
        }
      }
    }, standalone ? 2000 : 5000);

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      clearInterval(checkInterval);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('touchend', handleUserInteraction);
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('mousedown', handleUserInteraction);
    };
  }, [enabled]);
}
