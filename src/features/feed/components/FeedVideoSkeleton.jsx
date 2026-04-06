import React from 'react';

/**
 * 3 slides fantômes animées affichées pendant le chargement du feed.
 * Remplace l'écran noir / <div aria-hidden /> initial.
 */
function SkeletonSlide() {
  return (
    <div className="relative min-h-full w-full shrink-0 snap-start bg-black flex flex-col justify-end p-4 gap-3">
      {/* Faux avatar + nom créateur */}
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-full bg-white/10 animate-pulse" />
        <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
      </div>
      {/* Faux titre */}
      <div className="h-3 w-3/4 rounded bg-white/10 animate-pulse" />
      <div className="h-3 w-1/2 rounded bg-white/10 animate-pulse" />
      {/* Faux boutons actions (droite) */}
      <div className="absolute right-3 bottom-24 flex flex-col gap-5 items-center">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-8 w-8 rounded-full bg-white/10 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default function FeedVideoSkeleton({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonSlide key={i} />
      ))}
    </>
  );
}
