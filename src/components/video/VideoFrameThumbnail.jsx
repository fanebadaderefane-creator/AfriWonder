import React, { useRef, useState, useEffect } from 'react';
import { getVideoPlaybackUrl, VIDEO_PLACEHOLDER_IMG } from '@/lib/utils';

/**
 * Affiche une frame de la vidéo automatiquement (sans miniature).
 * Utilise l'élément video en pause à ~1s : le navigateur affiche la frame, pas de canvas ni calcul.
 */
export default function VideoFrameThumbnail({ videoUrl, alt = '', className = '' }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [error, setError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!videoUrl || error) return;
    const el = containerRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { rootMargin: '100px', threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [videoUrl, error]);

  useEffect(() => {
    if (!videoUrl || !isVisible || error) return;

    const video = videoRef.current;
    if (!video) return;

    const playbackUrl = getVideoPlaybackUrl(videoUrl);
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = playbackUrl;

    const onLoadedMetadata = () => {
      const t = Math.min(1, (video.duration || 2) / 10);
      video.currentTime = t;
    };

    const onSeeked = () => {};
    const onError = () => setError(true);

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.load();

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      video.src = '';
    };
  }, [videoUrl, isVisible, error]);

  if (error) {
    return (
      <div ref={containerRef} className={`relative w-full h-full overflow-hidden bg-gray-200 ${className}`}>
        <img src={VIDEO_PLACEHOLDER_IMG} alt={alt} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden bg-gray-200 ${className}`}>
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted
        playsInline
        preload="auto"
        aria-label={alt}
        style={{ pointerEvents: 'none' }}
      />
    </div>
  );
}
