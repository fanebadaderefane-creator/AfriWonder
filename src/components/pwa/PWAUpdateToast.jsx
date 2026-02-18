import { useEffect, useState } from 'react';
import { toast } from 'sonner';

/**
 * Écoute les mises à jour du Service Worker et propose de recharger.
 * Version améliorée pour éviter l'écran blanc après mise à jour.
 */
export default function PWAUpdateToast() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !import.meta.env.PROD) return;

    let registration = null;
    let toastId = null;

    const showUpdateToast = (worker) => {
      if (updateAvailable || isUpdating) return; // Éviter les doublons
      
      setUpdateAvailable(true);
      
      toastId = toast('Mise à jour disponible', {
        description: 'Une nouvelle version de l\'application est disponible. Appuyez pour mettre à jour.',
        action: {
          label: 'Mettre à jour',
          onClick: async () => {
            setIsUpdating(true);
            try {
              // Envoyer le message au worker pour activer la nouvelle version
              if (worker) {
                worker.postMessage({ type: 'SKIP_WAITING' });
              } else if (registration?.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
              }
              
              // Attendre un peu pour que le message soit traité
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Recharger la page pour activer la nouvelle version
              window.location.reload();
            } catch (error) {
              console.error('Erreur lors de la mise à jour:', error);
              setIsUpdating(false);
              toast.error('Erreur lors de la mise à jour. Veuillez recharger la page manuellement.');
            }
          },
        },
        duration: Infinity,
        id: 'pwa-update',
        style: { zIndex: 99999 },
        className: 'pwa-update-toast',
      });
    };

    const onUpdate = (event) => {
      const detail = event?.detail;
      if (detail?.newWorker) {
        showUpdateToast(detail.newWorker);
      } else if (detail?.registration) {
        const reg = detail.registration;
        if (reg.waiting) {
          showUpdateToast(reg.waiting);
        }
      }
    };

    // Écouter l'événement personnalisé
    window.addEventListener('sw-update-available', onUpdate);

    const checkWaiting = (reg) => {
      if (reg?.waiting && navigator.serviceWorker.controller) {
        showUpdateToast(reg.waiting);
      }
    };

    // Vérifier s'il y a déjà une mise à jour en attente
    navigator.serviceWorker.ready
      .then((reg) => {
        registration = reg;
        checkWaiting(reg);
      })
      .catch(() => {
        console.warn('Service Worker non disponible');
      });

    // Sur mobile : revérifier au retour sur l'app (le SW peut finir d'installer en arrière-plan)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker.ready.then(checkWaiting);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Recharger automatiquement quand le nouveau controller est activé
    const handleControllerChange = () => {
      if (navigator.serviceWorker.controller) {
        // Le nouveau service worker est actif, recharger
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      window.removeEventListener('sw-update-available', onUpdate);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      if (toastId) {
        toast.dismiss(toastId);
      }
    };
  }, [updateAvailable, isUpdating]);

  return null;
}
