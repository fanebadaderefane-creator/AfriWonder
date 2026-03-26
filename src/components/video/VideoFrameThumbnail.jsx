import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  getVideoPlaybackUrl,
  getVideoPlaybackUrlCandidates,
  VIDEO_PLACEHOLDER_IMG,
  getAbsoluteImageUrl,
  isValidThumbnailUrl,
  isMobileOrPWA,
} from '@/lib/utils';

/** Video frame thumbnail. Uses thumbnail_url on mobile when valid; otherwise extracts frame at frameTime. */
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

export default function VideoFrameThumbnail({ videoUrl, thumbnailUrl: thumbnailUrlProp, alt = '', className = '', frameTime = null }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [error, setError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [frameReady, setFrameReady] = useState(false);
  const mobileOrPWA = useMemo(() => isMobileOrPWA(), []);
  const useThumbnailOnly = mobileOrPWA && thumbnailUrlProp && isValidThumbnailUrl(thumbnailUrlProp, videoUrl);
  const resolvedThumbnailUrl = useThumbnailOnly ? getAbsoluteImageUrl(thumbnailUrlProp) : '';
  const playbackUrl = useMemo(() => getVideoPlaybackUrl(videoUrl), [videoUrl]);
  const attemptUrls = useMemo(() => {
    const c = getVideoPlaybackUrlCandidates(videoUrl);
    return c.length > 0 ? c : playbackUrl ? [playbackUrl] : [];
  }, [videoUrl, playbackUrl]);
  const [attemptIndex, setAttemptIndex] = useState(0);
  const frameTimeKey = Number.isFinite(frameTime) && frameTime >= 0 ? Number(frameTime).toFixed(2) : 'auto';
  const cacheKey = `${playbackUrl || ''}::${frameTimeKey}`;
  const [cachedFrame, setCachedFrame] = useState(() => readFrameCache(cacheKey));

  useEffect(() => {
    const cached = readFrameCache(cacheKey);
    setCachedFrame(cached || '');
    setFrameReady(!!cached);
    setAttemptIndex(0);
    setError(false);
  }, [cacheKey]);

  useEffect(() => {
    if (!videoUrl || error) return;
    const el = containerRef.current;
    if (!el) return;
    if (typeof window === 'undefined' || typeof window.IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }
    const rootMargin = mobileOrPWA ? '200px' : '120px';
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { rootMargin, threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [videoUrl, error, mobileOrPWA]);

  useEffect(() => {
    if (!videoUrl || !isVisible || error || cachedFrame || useThumbnailOnly) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const sourceToTry = attemptUrls[attemptIndex] || '';
    if (!sourceToTry) {
      setError(true);
      return;
    }
    const isSameOrigin = typeof window !== 'undefined' && (() => {
      try {
        return new URL(sourceToTry, window.location.href).origin === window.location.origin;
      } catch {
        return false;
      }
    })();

    setFrameReady(false);
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.crossOrigin = isSameOrigin ? '' : 'anonymous';
    video.src = sourceToTry;

    const drawFrame = () => {
      try {
        const vw = video.videoWidth || 0;
        const vh = video.videoHeight || 0;
        if (vw < 2 || vh < 2) return; // attendre des dimensions réelles pour éviter frame noire 1x1
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
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
    const seekDelay = mobileOrPWA ? 2500 : 1500;
    const seekTimeout = window.setTimeout(() => {
      if (!canvasRef.current || videoRef.current?.readyState < 2) return;
      drawFrame();
    }, seekDelay);

    const onError = () => {
      if (attemptIndex < attemptUrls.length - 1) {
        setAttemptIndex((prev) => prev + 1);
        return;
      }
      setError(true);
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.load();

    return () => {
      clearTimeout(seekTimeout);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      video.pause();
      video.src = '';
    };
  }, [videoUrl, isVisible, error, cacheKey, frameTime, cachedFrame, attemptUrls, attemptIndex, useThumbnailOnly, mobileOrPWA]);

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden bg-gray-600 ${className}`}>
      {((!frameReady && !useThumbnailOnly) || (useThumbnailOnly && !resolvedThumbnailUrl)) && (
        <img src={VIDEO_PLACEHOLDER_IMG} alt={alt} className="absolute inset-0 w-full h-full object-cover" />
      )}
      {useThumbnailOnly && resolvedThumbnailUrl ? (
        <img
          src={resolvedThumbnailUrl}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : null}
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
        style={useThumbnailOnly ? { display: 'none' } : undefined}
      />
      {!useThumbnailOnly && (
      <video
        ref={videoRef}
        muted
        playsInline
        preload="metadata"
        className="absolute opacity-0 pointer-events-none w-0 h-0"
        aria-hidden
      />
      )}
    </div>
  );
}
