/**
 * Hook pour empêcher l'écran de s'éteindre automatiquement (Wake Lock API)
 * Style TikTok : l'écran reste allumé tant que l'application est ouverte
 */
import { useEffect, useRef } from 'react';

export function useWakeLock(enabled = true) {
  const wakeLockRef = useRef(null);
  const isSupportedRef = useRef(false);

  useEffect(() => {
    // Vérifier si le Wake Lock API est supporté
    if (!('wakeLock' in navigator)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Wake Lock API not supported in this browser');
      }
      return;
    }

    isSupportedRef.current = true;

    if (!enabled) {
      // Libérer le Wake Lock si désactivé
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
      return;
    }

    // Fonction pour acquérir le Wake Lock
    const acquireWakeLock = async () => {
      try {
        // Libérer l'ancien Wake Lock s'il existe
        if (wakeLockRef.current) {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
        }

        // Acquérir un nouveau Wake Lock
        const wakeLock = await navigator.wakeLock.request('screen');
        wakeLockRef.current = wakeLock;

        // Gérer la libération automatique (quand l'onglet devient invisible)
        wakeLock.addEventListener('release', () => {
          wakeLockRef.current = null;
        });

        if (process.env.NODE_ENV === 'development') {
          console.log('Wake Lock acquired successfully');
        }
      } catch (err) {
        // Erreur possible : l'utilisateur a refusé, ou le navigateur ne supporte pas
        if (process.env.NODE_ENV === 'development') {
          console.warn('Wake Lock acquisition failed:', err);
        }
        wakeLockRef.current = null;
      }
    };

    // Acquérir le Wake Lock immédiatement
    acquireWakeLock();

    // Réacquérir le Wake Lock si l'utilisateur revient sur l'onglet
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && enabled) {
        // Vérifier si le Wake Lock est toujours actif
        if (!wakeLockRef.current || wakeLockRef.current.released) {
          await acquireWakeLock();
        }
      }
    };

    // Réacquérir le Wake Lock si l'utilisateur revient sur l'onglet après une pause
    const handleFocus = async () => {
      if (enabled) {
        // Vérifier si le Wake Lock est toujours actif
        if (!wakeLockRef.current || wakeLockRef.current.released) {
          await acquireWakeLock();
        }
      }
    };

    // Vérifier périodiquement si le Wake Lock est toujours actif (toutes les 30 secondes)
    const checkWakeLockInterval = setInterval(async () => {
      if (enabled && document.visibilityState === 'visible') {
        if (!wakeLockRef.current || wakeLockRef.current.released) {
          await acquireWakeLock();
        }
      }
    }, 30000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Nettoyage
    return () => {
      clearInterval(checkWakeLockInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      
      // Libérer le Wake Lock au démontage
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [enabled]);

  // Fonction pour libérer manuellement le Wake Lock
  const release = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Wake Lock release failed:', err);
        }
      }
    }
  };

  return {
    isSupported: isSupportedRef.current,
    release,
  };
}
