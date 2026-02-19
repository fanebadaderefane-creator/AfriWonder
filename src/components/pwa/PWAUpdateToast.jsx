import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Écoute les mises à jour du Service Worker et affiche une bannière en haut + toast.
 * Bannière fixe en haut pour ne pas rater la mise à jour.
 */
export default function PWAUpdateToast() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const waitingWorkerRef = useRef(null);
  const registrationRef = useRef(null);

  const applyUpdate = async () => {
    setIsUpdating(true);
    try {
      const worker = waitingWorkerRef.current;
      const reg = registrationRef.current;
      if (worker) {
        worker.postMessage({ type: 'SKIP_WAITING' });
      } else if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      window.location.reload();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      setIsUpdating(false);
      toast.error('Erreur lors de la mise à jour. Veuillez recharger la page manuellement.');
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !import.meta.env.PROD) return;

    let registration = null;
    let toastId = null;

    const showUpdateToast = (worker, reg, forceShow = false) => {
      if (!forceShow && (updateAvailable || isUpdating)) return;

      waitingWorkerRef.current = worker || reg?.waiting || null;
      registrationRef.current = reg || null;
      setUpdateAvailable(true);
      toast.dismiss('pwa-update');

      toastId = toast('Mise à jour disponible', {
        description: 'Une nouvelle version de l\'application est disponible. Appuyez pour mettre à jour.',
        action: {
          label: 'Mettre à jour',
          onClick: applyUpdate,
        },
        duration: Infinity,
        id: 'pwa-update',
        style: { zIndex: 99998 },
        className: 'pwa-update-toast',
      });
    };

    const onUpdate = (event) => {
      const detail = event?.detail;
      const reg = detail?.registration;
      const worker = detail?.newWorker || reg?.waiting;
      if (worker) {
        showUpdateToast(worker, reg);
      }
    };

    window.addEventListener('sw-update-available', onUpdate);

    const checkWaiting = (reg, forceShow = false) => {
      if (reg) registration = reg;
      if (reg?.waiting && navigator.serviceWorker.controller) {
        showUpdateToast(reg.waiting, reg, forceShow);
      }
    };

    navigator.serviceWorker.ready
      .then((reg) => {
        registration = reg;
        checkWaiting(reg);
      })
      .catch(() => {});

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker.ready.then((reg) => checkWaiting(reg, true));
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const handleControllerChange = () => {
      if (navigator.serviceWorker.controller) {
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      window.removeEventListener('sw-update-available', onUpdate);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      if (toastId) toast.dismiss(toastId);
    };
  }, [updateAvailable, isUpdating]);

  // Bannière fixe en haut : "Mettre à jour pour avoir la version corrigée déployée"
  if (!updateAvailable) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[99999] flex items-center justify-center gap-3 bg-orange-500 text-white px-4 py-3 shadow-md safe-area-pt"
      role="alert"
      aria-live="polite"
    >
      <span className="text-sm font-medium text-center flex-1">
        Mettre à jour pour avoir la version corrigée déployée
      </span>
      <button
        type="button"
        onClick={applyUpdate}
        disabled={isUpdating}
        className="shrink-0 px-4 py-2 bg-white text-orange-600 font-semibold rounded-full hover:bg-orange-50 active:scale-95 transition disabled:opacity-70"
      >
        {isUpdating ? 'Mise à jour…' : 'Mettre à jour'}
      </button>
    </div>
  );
}
