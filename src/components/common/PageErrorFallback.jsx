/**
 * Fallback d'erreur par route (React Router v6 errorElement).
 * Affiche une UI de récupération au lieu de remonter jusqu'au ErrorBoundary racine.
 */
import { useRouteError, useNavigate } from 'react-router-dom';

export default function PageErrorFallback() {
  const error = useRouteError();
  const navigate = useNavigate();

  if (import.meta.env.DEV && error) {
    console.error('Route error:', error);
  }
  if (typeof window !== 'undefined' && window.Sentry && error) {
    window.Sentry.captureException(error);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-800">
      <h1 className="text-xl font-semibold mb-2">Une erreur est survenue</h1>
      <p className="text-slate-600 text-center mb-6 max-w-md">
        Réessayez ou revenez à l&apos;accueil. Si le problème persiste, contactez le support.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
        >
          Retour
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
        >
          Recharger
        </button>
      </div>
    </div>
  );
}
