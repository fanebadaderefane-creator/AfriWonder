// @ts-nocheck
/**
 * CDC §2 - Top Banner Ads
 * Bannière compacte en haut du feed (image ou courte vidéo)
 */
import React, { useRef, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { api } from '@/api/expressClient';

export default function AdBannerCard({
  ad,
  isActive,
  onReport,
  onHide,
  hideActions = false,
}) {
  const videoRef = useRef(null);
  const impressionSentRef = useRef(false);
  const creative = ad?.creative;
  const isVideo = creative?.media_type === 'video';

  useEffect(() => {
    if (!isActive || !creative || impressionSentRef.current) return;
    impressionSentRef.current = true;
    const deviceId = typeof localStorage !== 'undefined' ? localStorage.getItem('afw_device_id') : null;
    api.ads.recordImpression(creative.id, ad.campaign_id, deviceId).catch(() => {});
  }, [isActive, creative?.id, ad?.campaign_id]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive && isVideo) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [isActive, isVideo]);

  const handleCtaClick = () => {
    if (!creative || !ad) return;
    const deviceId = typeof localStorage !== 'undefined' ? localStorage.getItem('afw_device_id') : null;
    api.ads.recordClick(creative.id, ad.campaign_id, deviceId).catch(() => {});
    if (creative.cta_url) {
      window.open(creative.cta_url, '_blank', 'noopener,noreferrer');
    }
  };

  if (!creative) return null;

  const ctaLabel = creative.cta_label || 'Découvrir';

  return (
    <div className="relative w-full h-[140px] min-h-[140px] flex-shrink-0 snap-start snap-always flex overflow-hidden bg-black rounded-xl">
      <div className="absolute top-1 left-1 z-10 px-1.5 py-0.5 rounded bg-black/60 text-white/90 text-[10px] font-medium">
        Sponsorisé
      </div>
      <div className="flex-1 relative flex items-center overflow-hidden">
        {isVideo ? (
          <video
            ref={videoRef}
            src={creative.media_url}
            poster={creative.thumbnail_url}
            className="w-full h-full object-cover"
            muted
            loop
            playsInline
          />
        ) : (
          <img
            src={creative.media_url}
            alt={creative.title || 'Publicité'}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <div className="flex flex-col justify-center gap-1 px-3 py-2 min-w-0 flex-1 max-w-[50%]">
        {creative.title && (
          <p className="text-white text-sm font-medium line-clamp-2">{creative.title}</p>
        )}
        <button
          onClick={handleCtaClick}
          className="self-start flex items-center gap-1 px-2 py-1 rounded text-xs bg-orange-500 hover:bg-orange-600 text-white font-medium"
        >
          <ExternalLink className="w-3 h-3" />
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}
