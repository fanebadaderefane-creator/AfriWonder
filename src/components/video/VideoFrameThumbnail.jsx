import React, { useMemo, useRef, useState, useEffect } from 'react';
import { getVideoPlaybackUrl, VIDEO_PLACEHOLDER_IMG } from '@/lib/utils';

/**
 * Extrait une frame de la video (vers ~1s) et l'affiche.
 * Evite les fonds gris/blancs pendant le swipe entre videos.
 */
const FRAME_CACHE = new Map();
const MAX_FRAME_CACHE_ITEMS = 120;

const readFrameCache = (key) => {
  if (!key || !FRAME_CACHE.has(key)) return '';
  const value = FRAME_CACHE.get(key);
  // LRU: refresh order
  FRAME_CACHE.delete(key);
  FRAME_CACHE.set(key, value);
  return value;
};

const writeFrameCache = (key, value) => {
  if (!key || !value) return;
  if (FRAME_CACHE.has(key)) FRAME_CACHE.delete(key);
  FRAME_CACHE.set(key, value);
  while (FRAME_CACHE.size > MAX_FRAME_CACHE_ITEMS) {
    const oldestKey = FRAME_CACHE.keys().next().value;
    FRAME_CACHE.delete(oldestKey);
  }
};

export default function VideoFrameThumbnail({ videoUrl, alt = '', className = '', frameTime = null }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [error, setError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [frameReady, setFrameReady] = useState(false);
  const playbackUrl = useMemo(() => getVideoPlaybackUrl(videoUrl), [videoUrl]);
  const frameTimeKey = Number.isFinite(frameTime) && frameTime >= 0 ? Number(frameTime).toFixed(2) : 'auto';
  const cacheKey = `${playbackUrl || ''}::${frameTimeKey}`;
  const [cachedFrame, setCachedFrame] = useState(() => readFrameCache(cacheKey));

  useEffect(() => {
    const cached = readFrameCache(cacheKey);
    setCachedFrame(cached || '');
    setFrameReady(!!cached);
  }, [cacheKey]);

  useEffect(() => {
    if (!videoUrl || error) return;
    const el = containerRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { rootMargin: '120px', threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [videoUrl, error]);

  useEffect(() => {
    if (!videoUrl || !isVisible || error || cachedFrame) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    setFrameReady(false);
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.src = playbackUrl;

    const drawFrame = () => {
      try {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const vw = Math.max(1, video.videoWidth || 1);
        const vh = Math.max(1, video.videoHeight || 1);
        canvas.width = vw;
        canvas.height = vh;
        ctx.drawImage(video, 0, 0, vw, vh);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
        if (dataUrl) {
          writeFrameCache(cacheKey, dataUrl);
          setCachedFrame(dataUrl);
        }
        setFrameReady(true);
      } catch (_e) {
        setError(true);
      }
    };

    const onLoadedMetadata = () => {
      const duration = Math.max(0.2, Number(video.duration || 0.2));
      const desired = Number.isFinite(frameTime) && frameTime >= 0
        ? Number(frameTime)
        : Math.min(1, Math.max(0.08, duration / 10));
      const target = Math.max(0.05, Math.min(duration - 0.05, desired));
      video.currentTime = target;
    };

    const onSeeked = () => drawFrame();
    const onLoadedData = () => {
      // Fallback si seeked n'arrive pas vite sur certains navigateurs
      drawFrame();
    };
    const onError = () => setError(true);

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('error', onError);
    video.load();

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('loadeddata', onLoadedData);
      video.removeEventListener('error', onError);
      video.pause();
      video.src = '';
    };
  }, [videoUrl, isVisible, error, playbackUrl, cacheKey, frameTime, cachedFrame]);

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden bg-black ${className}`}>
      {!frameReady && (
        <img src={VIDEO_PLACEHOLDER_IMG} alt={alt} className="absolute inset-0 w-full h-full object-cover" />
      )}
      {cachedFrame && (
        <img
          src={cachedFrame}
          alt={alt}
          className={`absolute inset-0 w-full h-full object-cover ${frameReady ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full object-cover ${(frameReady && !cachedFrame) ? 'opacity-100' : 'opacity-0'}`}
        aria-label={alt}
      />
      <video
        ref={videoRef}
        muted
        playsInline
        preload="metadata"
        className="absolute opacity-0 pointer-events-none w-0 h-0"
        aria-hidden
      />
    </div>
  );
}
