/**
 * Loader unifié pour chargement auth, restauration cache, transitions.
 * Production-ready : expérience fluide, pas d'écran blanc.
 */
export default function PageLoader({ fullScreen = true, label = 'Chargement...' }) {
  const shellClassName =
    "mx-auto w-[min(100vw,400px)] min-w-[min(100vw,400px)] max-w-[400px] h-full min-h-[100dvh] bg-[#0b0b0f] text-white";

  return (
    <div
      className={
        fullScreen
          ? "fixed inset-0 z-[120] bg-[#020617] text-white"
          : "flex flex-col items-center justify-center min-h-[60vh] gap-4 bg-[#0b0b0f] text-white"
      }
      role="status"
      aria-label="Chargement"
    >
      {fullScreen ? (
        <div className={shellClassName}>
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.12),transparent_35%)]" />
          <div className="relative h-full min-h-[100dvh] flex flex-col">
            <div className="px-4 pt-6">
              <div className="flex items-center justify-between gap-3">
                <div className="h-7 w-28 rounded-full bg-white/10 animate-pulse" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
                  <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
                  <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-8 pb-24">
              <div className="w-full max-w-xs aspect-[9/16] rounded-[2rem] bg-white/5 border border-white/5 animate-pulse" />
              <div className="w-full max-w-xs mt-8 space-y-3">
                <div className="h-4 w-2/3 rounded-full bg-white/10 animate-pulse" />
                <div className="h-3 w-full rounded-full bg-white/10 animate-pulse" />
                <div className="h-3 w-4/5 rounded-full bg-white/10 animate-pulse" />
              </div>
              <div className="mt-8 flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl" />
                  <div className="relative w-10 h-10 border-2 border-white/15 border-t-blue-500 rounded-full animate-spin" />
                </div>
                <p className="text-sm text-white/70">{label}</p>
              </div>
            </div>

            <div className="h-[80px] border-t border-white/10 bg-black/80 px-6">
              <div className="h-full flex items-center justify-between">
                <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
                <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
                <div className="w-12 h-12 rounded-2xl bg-blue-600/70 animate-pulse" />
                <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
                <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl" />
            <div className="relative w-12 h-12 border-2 border-white/15 border-t-blue-500 rounded-full animate-spin" />
          </div>
          <p className="text-sm text-white/75">{label}</p>
        </>
      )}
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
