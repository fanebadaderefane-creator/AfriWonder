// @ts-nocheck
/**
 * CDC Phase 1 - Carte publicitaire In-Feed
 * Format vidéo plein écran, marqué "Sponsorisé", CTA cliquable
 * CDC §4 : Signaler une pub, Masquer cette pub
 */
import React, { useRef, useEffect, useState } from 'react';
import { ExternalLink, Volume2, VolumeX, MoreVertical, Flag, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/api/expressClient';
import { toast } from 'sonner';

const REPORT_REASONS = [
  'Contenu inapproprié',
  'Spam ou arnaque',
  'Violence',
  'Contenu trompeur',
  'Autre',
];

export default function AdCard({
  ad,
  isActive,
  isMuted,
  onMuteToggle,
  onReport,
  onHide,
  hideActions = false,
}) {
  const videoRef = useRef(null);
  const impressionSentRef = useRef(false);

  const creative = ad?.creative;
  const advertiser = ad?.advertiser;
  const isVideo = creative?.media_type === 'video';
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');

  const handleReport = async () => {
    if (!selectedReason) {
      toast.error('Choisissez un motif');
      return;
    }
    try {
      await api.ads.reportAd(ad.campaign_id, selectedReason);
      toast.success('Signalement enregistré. Merci.');
      setShowReportModal(false);
      setShowMenu(false);
      onReport?.();
    } catch (err) {
      if (err?.response?.status === 401) {
        toast.error('Connectez-vous pour signaler');
      } else {
        toast.error(err?.apiMessage || 'Erreur lors du signalement');
      }
    }
  };

  const handleHide = () => {
    onHide?.(ad.campaign_id);
    setShowMenu(false);
    toast.success('Cette publicité sera masquée.');
  };

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

      {/* Menu Signaler / Masquer */}
      {!hideActions && (
        <div className="absolute top-4 right-14 z-20">
          <div className="relative">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              aria-label="Options publicité"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => {
                    setShowMenu(false);
                    setShowReportModal(false);
                  }}
                  aria-hidden
                />
                <div className="absolute right-0 top-full mt-1 w-48 rounded-lg bg-black/90 text-white shadow-xl z-50 py-1">
                  {onHide && (
                    <button
                      onClick={handleHide}
                      className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/10"
                    >
                      <EyeOff className="w-4 h-4" />
                      Masquer cette pub
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowReportModal(true);
                    }}
                    className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/10"
                  >
                    <Flag className="w-4 h-4" />
                    Signaler
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal motif signalement */}
      {showReportModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div
            className="bg-slate-900 rounded-xl p-4 w-full max-w-sm border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white font-medium mb-3">Pourquoi signalez-vous cette pub ?</p>
            <div className="space-y-1 mb-4">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedReason(r)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-sm',
                    selectedReason === r ? 'bg-orange-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setSelectedReason('');
                }}
                className="flex-1 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20"
              >
                Annuler
              </button>
              <button
                onClick={handleReport}
                className="flex-1 py-2 rounded-lg bg-orange-600 text-white text-sm hover:bg-orange-500"
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Bouton mute (si vidéo) - décalé si menu visible */}
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
