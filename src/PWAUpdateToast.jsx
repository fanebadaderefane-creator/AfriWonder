import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

export default function PWAUpdateToast() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegistered(r) {
      // Vérifie les mises à jour toutes les heures
      if (r) {
        setInterval(() => r.update(), 60 * 60 * 1000);
      }
    },
  });

  useEffect(() => {
    if (!needRefresh) return;
    toast('Nouvelle version disponible !', {
      duration: Infinity,
      action: {
        label: 'Mettre à jour',
        onClick: () => updateServiceWorker(true),
      },
      cancel: {
        label: 'Plus tard',
        onClick: () => toast.dismiss(),
      },
      icon: '🚀',
    });
  }, [needRefresh, updateServiceWorker]);

  return null;
}