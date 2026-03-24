import React from 'react';
import VideoCard from '@/components/video/VideoCard';

export default function FeedVideoSlide({
  index,
  safeCurrentIndex,
  hideVideoHud,
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
}) {
  const { video, slideBackgroundUrl } = slide;

  return (
    <div
      data-index={index}
      className="relative w-full snap-start overflow-hidden bg-gray-950"
      style={{
        display: 'block',
        width: '100%',
        height: '100dvh',
        minHeight: '100dvh',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
        touchAction: 'pan-y',
        backgroundImage: slideBackgroundUrl ? `url(${slideBackgroundUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <VideoCard
        video={video}
        isActive={index === safeCurrentIndex}
        shouldPreload={
          index === safeCurrentIndex + 1 ||
          index === safeCurrentIndex - 1
        }
        onInitialVisualReady={index === 0 ? onInitialVisualReady : undefined}
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
        hideActions={hideVideoHud}
        compact
      />
    </div>
  );
}
