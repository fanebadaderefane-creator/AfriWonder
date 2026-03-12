// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { cn, getVideoPlaybackUrl, isValidThumbnailUrl, VIDEO_PLACEHOLDER_IMG } from '@/lib/utils';

export default function VideoPreviewCard({ video, isActive, onActivate, onOpenApp }) {
  const videoRef = useRef(null);
  const [hasStarted, setHasStarted] = useState(false);

  const rawUrl = video?.video_url || video?.videoUrl || '';
  const sourceUrl = rawUrl ? getVideoPlaybackUrl(rawUrl) : '';
  const posterUrl = isValidThumbnailUrl(video?.thumbnail_url, rawUrl)
    ? video.thumbnail_url
    : VIDEO_PLACEHOLDER_IMG;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (!isActive) {
      try {
        el.pause();
        el.currentTime = 0;
      } catch (_) {}
      setHasStarted(false);
    }
  }, [isActive]);

  const handlePlayClick = () => {
    if (!videoRef.current || !sourceUrl) return;
    onActivate?.();
    try {
      videoRef.current.play();
      setHasStarted(true);
    } catch (_) {}
  };

  if (!sourceUrl) {
    return null;
  }

  return (
    <article className="w-full max-w-2xl mx-auto rounded-2xl border border-white/10 bg-black/60 overflow-hidden shadow-lg">
      <div className="relative aspect-[16/9] bg-black">
        <video
          ref={videoRef}
          src={sourceUrl}
          poster={posterUrl}
          preload="metadata"
          playsInline
          muted
          controls={false}
          className="w-full h-full object-cover"
        />
        {!hasStarted && (
          <button
            type="button"
            onClick={handlePlayClick}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
          >
            <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
              <Play className="w-7 h-7 text-black fill-black" />
            </div>
          </button>
        )}
      </div>

      <div className="px-4 py-3 flex flex-col gap-1.5">
        {video?.title && (
          <h3 className="text-white font-semibold text-sm line-clamp-2">
            {video.title}
          </h3>
        )}
        {video?.description && (
          <p className="text-xs text-white/70 line-clamp-2">
            {video.description}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
          {video?.creator_name && (
            <span className="text-xs text-white/80">@{video.creator_name}</span>
          )}
          <button
            type="button"
            onClick={onOpenApp}
            className={cn(
              'ml-auto inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[11px] font-semibold',
              'bg-white/90 text-black hover:bg-white transition-colors shadow-sm'
            )}
          >
            Ouvrir dans l’app
          </button>
        </div>
      </div>
    </article>
  );
}

