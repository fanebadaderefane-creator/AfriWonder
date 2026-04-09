import { memo, useMemo } from 'react';
import VideoCard from '@/components/video/VideoCard';
import { useNetworkQuality, pickPreferredVideoQuality } from '@/utils/networkAdaptive';
import { cn } from '@/lib/utils';

const QUALITY_LABEL = {
  low: '2G / données réduites',
  medium: '3G',
  high: 'Rapide',
  unknown: 'Réseau',
};

/**
 * Lecteur « adaptatif » hors feed TikTok : réutilise VideoCard (logique de lecture inchangée).
 * Ajoute un indicateur réseau ; ne pas utiliser sur Home / FeedVideoSlide (règle player + rendu Firefox).
 */
function AdaptiveVideoPlayer({ className, ...videoCardProps }) {
  const net = useNetworkQuality();
  const tier = pickPreferredVideoQuality(net.quality);

  const badgeText = useMemo(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return 'Hors ligne';
    }
    const base = QUALITY_LABEL[net.quality] || QUALITY_LABEL.unknown;
    if (net.saveData) return `${base} · économie`;
    return base;
  }, [net.quality, net.saveData]);

  return (
    <div className={cn('relative h-full w-full', className)}>
      <VideoCard {...videoCardProps} />
      <div
        className="pointer-events-none absolute left-3 top-20 z-[40] max-w-[min(100%,220px)] rounded-md bg-black/55 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/90 backdrop-blur-sm"
        aria-live="polite"
      >
        <span className="sr-only">Qualité réseau estimée : </span>
        {badgeText}
        <span className="ml-1.5 opacity-80 normal-case">({tier})</span>
      </div>
    </div>
  );
}

export default memo(AdaptiveVideoPlayer);
