import React from 'react';
import VideoCard from '@/components/video/VideoCard';
import Download from 'lucide-react/icons/download';

/**
 * Ne monter le lecteur que pour la slide active ± N : évite 20+ <video preload="auto"> en parallèle (réseau saturé, aucune lecture).
 * Flutter : même rayon + `offlineBlobUrl` / `offlineReady` (voir `flutter-parity.js`). Streaming adaptatif web = HLS dans VideoCard ; mobile = lecteur HLS natif.
 */
const FEED_PLAYER_MOUNT_RADIUS = 2;

export default function FeedVideoSlide({
  index,
  safeCurrentIndex,
  hideVideoHud,
  hideVideoActions = hideVideoHud,
  slide,
  isMuted,
  isLiked,
  isSaved,
  currentUser,
  isFollowing,
  setMuted,
  onLike,
  onComment,
  onShare,
  onSave,
  onTip,
  onSubscribe,
  onProfileClick,
  onRequireAuth,
  onInitialVisualReady,
  offlineReady = false,
  showOfflineBadge = true,
  offlineBlobUrl = '',
}) {
  const { video, slideBackgroundUrl } = slide;
  const distance = Math.abs(index - safeCurrentIndex);
  const shouldMountPlayer = distance <= FEED_PLAYER_MOUNT_RADIUS;

  // Hauteur = scrollport du feed (parent), pas 100dvh : sinon sur iPhone la slide déborde sous la barre
  // d’onglets / l’indicateur d’accueil et la nav devient invisible ou illisible.
  const slideShellStyle = {
    display: 'block',
    width: '100%',
    height: '100%',
    minHeight: '100%',
    scrollSnapAlign: 'start',
    scrollSnapStop: 'always',
    touchAction: 'pan-y',
    backgroundImage: slideBackgroundUrl ? `url(${slideBackgroundUrl})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  if (!shouldMountPlayer) {
    return (
      <div
        data-index={index}
        className="relative w-full snap-start overflow-hidden bg-gray-950"
        style={slideShellStyle}
        aria-hidden
      />
    );
  }

  return (
    <div
      data-index={index}
      className="relative w-full snap-start overflow-hidden bg-gray-950"
      style={slideShellStyle}
    >
      {offlineReady && showOfflineBadge && !hideVideoHud && (
        <div className="pointer-events-none absolute left-3 top-20 z-20 rounded-full border border-emerald-300/25 bg-emerald-500/18 px-3 py-1.5 text-[11px] font-semibold tracking-tight text-white shadow-[0_8px_30px_rgba(16,185,129,0.18)] backdrop-blur-md">
          <span className="inline-flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Hors connexion
          </span>
        </div>
      )}
      <VideoCard
        video={video}
        isActive={index === safeCurrentIndex}
        shouldPreload={
          index === safeCurrentIndex + 1 ||
          index === safeCurrentIndex + 2 ||
          index === safeCurrentIndex - 1
        }
        onInitialVisualReady={(id) => {
          if (index === 0) onInitialVisualReady?.(id);
        }}
        videoPoolRef={null}
        poolIndex={undefined}
        isLiked={isLiked}
        isSaved={isSaved}
        isMuted={isMuted}
        onMuteToggle={() => setMuted(!isMuted)}
        onLike={onLike}
        currentUser={currentUser}
        onComment={onComment}
        onShare={onShare}
        onSave={onSave}
        onTip={onTip}
        onSubscribe={onSubscribe}
        isFollowing={isFollowing}
        onProfileClick={onProfileClick}
        canLike
        onRequireAuth={onRequireAuth}
        hideActions={hideVideoActions}
        compact
        offlineBlobUrl={offlineBlobUrl}
      />
    </div>
  );
}
