import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Écoute les mises à jour du Service Worker et propose de recharger.
 */
export default function PWAUpdateToast() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !import.meta.env.PROD) return;

    const showUpdateToast = (worker) => {
      toast('Nouvelle version disponible', {
        description: 'Actualisez pour profiter des dernières mises à jour.',
        action: {
          label: 'Mettre à jour',
          onClick: () => worker?.postMessage?.({ type: 'SKIP_WAITING' }),
        },
        duration: Infinity,
      });
    };

    const onUpdate = () => {
      navigator.serviceWorker.ready.then((reg) => {
        if (reg.waiting) showUpdateToast(reg.waiting);
      });
    };

    window.addEventListener('sw-update-available', onUpdate);

    navigator.serviceWorker.ready.then((reg) => {
      if (reg.waiting && navigator.serviceWorker.controller) showUpdateToast(reg.waiting);
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());

    return () => window.removeEventListener('sw-update-available', onUpdate);
  }, []);

  return null;
}
