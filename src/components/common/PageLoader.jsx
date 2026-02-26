/**
 * Loader unifié pour chargement auth, restauration cache, transitions.
 * Production-ready : expérience fluide, pas d'écran blanc.
 */
export default function PageLoader() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[60vh] gap-4 bg-gray-50"
      role="status"
      aria-label="Chargement"
    >
      <div className="w-10 h-10 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
      <p className="text-sm text-slate-500">Chargement...</p>
    </div>
  );
}

/** Variante compacte (spinner seul) */
export function SpinnerLoader({ className = '' }) {
  return (
    <div
      className={`w-8 h-8 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Chargement"
    />
  );
}
