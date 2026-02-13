// @ts-nocheck
/**
 * CDC Phase 1 - Carte publicitaire In-Feed
 * Format vidéo plein écran, marqué "Sponsorisé", CTA cliquable
 */
import React, { useRef, useEffect, useState } from 'react';
import { ExternalLink, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/api/expressClient';

export default function AdCard({
  ad,
  isActive,
  isMuted,
  onMuteToggle,
  hideActions = false,
}) {
  const videoRef = useRef(null);
  const impressionSentRef = useRef(false);

  const creative = ad?.creative;
  const advertiser = ad?.advertiser;
  const isVideo = creative?.media_type === 'video';

  // Envoyer l'impression quand la pub devient visible
  useEffect(() => {
    if (!isActive || !creative || impressionSentRef.current) return;

    impressionSentRef.current = true;
    const deviceId = typeof localStorage !== 'undefined' ? localStorage.getItem('afw_device_id') : null;

    api.ads
      .recordImpression(creative.id, ad.campaign_id, deviceId)
      .catch(() => {});

    return () => {};
  }, [isActive, creative?.id, ad?.campaign_id]);

  // Lecture/pause vidéo selon isActive
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
    <div className="relative w-full h-full min-h-screen flex flex-col bg-black">
      {/* Badge Sponsorisé */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-2 py-1 rounded bg-black/60 text-white/90 text-xs font-medium">
        <span>Sponsorisé</span>
      </div>

      {/* Contenu média */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {isVideo ? (
          <video
            ref={videoRef}
            src={creative.media_url}
            poster={creative.thumbnail_url}
            className="w-full h-full object-cover"
            muted={isMuted}
            loop
            playsInline
            onClick={onMuteToggle}
          />
        ) : (
          <img
            src={creative.media_url}
            alt={creative.title || 'Publicité'}
            className="w-full h-full object-cover"
          />
        )}

        {/* Overlay gradient */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"
          style={{ bottom: 0 }}
        />
      </div>

      {/* Contenu texte + CTA */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-8 z-20">
        <div className="flex flex-col gap-3">
          {creative.title && (
            <p className="text-white font-semibold text-lg line-clamp-2">{creative.title}</p>
          )}
          {creative.description && (
            <p className="text-white/80 text-sm line-clamp-2">{creative.description}</p>
          )}

          <button
            onClick={handleCtaClick}
            className="self-start flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            {ctaLabel}
          </button>
        </div>
      </div>

      {/* Bouton mute (si vidéo) */}
      {!hideActions && isVideo && (
        <button
          onClick={onMuteToggle}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      )}
    </div>
  );
}
