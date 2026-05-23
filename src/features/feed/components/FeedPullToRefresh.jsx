import React from 'react';
import Loader2 from 'lucide-react/icons/loader-2';

export default function FeedPullToRefresh({
  isRefreshing,
  pullDistance,
  threshold,
}) {
  return (
    <div
      className="flex items-center justify-center overflow-hidden bg-[#050816] transition-[height] duration-200 ease-out"
      style={{
        height: isRefreshing ? 64 : pullDistance,
        minHeight: isRefreshing ? 64 : 0,
        scrollSnapAlign: 'none',
      }}
      aria-hidden
    >
      {(pullDistance > 0 || isRefreshing) && (
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/24 px-3.5 py-2 text-white shadow-[0_12px_28px_rgba(2,6,23,0.18)] backdrop-blur-xl">
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin text-white" aria-label="Chargement" />
          ) : (
            <Loader2
              className="h-4 w-4 text-white/80 transition-transform duration-150"
              style={{ transform: `rotate(${Math.min(pullDistance * 4, 360)}deg)` }}
              aria-hidden
            />
          )}

          <span className="text-[11px] font-medium text-white/82">
            {isRefreshing
              ? 'Actualisation...'
              : pullDistance >= threshold
              ? 'Relachez'
              : 'Tirez pour actualiser'}
          </span>
        </div>
      )}
    </div>
  );
}
