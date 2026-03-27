import React, { useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react';
import {
  getVideoPlaybackUrl,
  getVideoPlaybackUrlCandidatesForFrameGrab,
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

export default function VideoFrameThumbnail({
  videoUrl,
  thumbnailUrl: thumbnailUrlProp,
  alt = '',
  className = '',
  frameTime = null,
  /** Quand la miniature a déjà échoué côté parent (ex. Discover), forcer l’extraction frame sur mobile au lieu de réessayer la même URL. */
  skipThumbnailOnly = false,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [error, setError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [frameReady, setFrameReady] = useState(false);
  const [thumbnailLoadFailed, setThumbnailLoadFailed] = useState(false);
  const mobileOrPWA = useMemo(() => isMobileOrPWA(), []);
  const resolvedThumbnailUrl =
    thumbnailUrlProp && isValidThumbnailUrl(thumbnailUrlProp, videoUrl)
      ? getAbsoluteImageUrl(thumbnailUrlProp)
      : '';
  const useThumbnailOnly =
    !skipThumbnailOnly &&
    !thumbnailLoadFailed &&
    mobileOrPWA &&
    !!resolvedThumbnailUrl;
  const playbackUrl = useMemo(() => getVideoPlaybackUrl(videoUrl), [videoUrl]);
  const attemptUrls = useMemo(() => {
    const c = getVideoPlaybackUrlCandidatesForFrameGrab(videoUrl);
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
    setThumbnailLoadFailed(false);
  }, [videoUrl, thumbnailUrlProp, skipThumbnailOnly]);

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || error) return;
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const margin = 640;
    if (r.top < vh + margin && r.bottom > -margin) setIsVisible(true);
  }, [videoUrl, error]);

  useEffect(() => {
    if (!videoUrl || error) return;
    const el = containerRef.current;
    if (!el) return;
    if (typeof window === 'undefined' || typeof window.IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }
    const rootMargin = `${mobileOrPWA ? 720 : 480}px`;
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
    video.preload = skipThumbnailOnly || !useThumbnailOnly ? 'auto' : 'metadata';
    video.crossOrigin = isSameOrigin ? '' : 'anonymous';
    video.src = sourceToTry;

    let drawnOnce = false;
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
        drawnOnce = true;
        setFrameReady(true);
      } catch (_e) {
        // Chrome : SecurityError si CORS CDN ; enchaîner sur le candidat suivant (ex. proxy same-origin).
        if (attemptIndex < attemptUrls.length - 1) {
          setAttemptIndex((prev) => prev + 1);
        } else {
          setError(true);
        }
      }
    };

    const onLoadedMetadata = () => {
      const duration = Math.max(0.2, Number(video.duration || 0.2));
      const desired = Number.isFinite(frameTime) && frameTime >= 0
        ? Number(frameTime)
        : Math.min(0.35, Math.max(0.04, duration / 12));
      const target = Math.max(0.04, Math.min(duration - 0.04, desired));
      video.currentTime = target;
    };

    const onSeeked = () => drawFrame();
    const onLoadedData = () => {
      if (drawnOnce) return;
      drawFrame();
    };
    const seekDelay = mobileOrPWA ? 420 : 320;
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
    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.load();

    return () => {
      clearTimeout(seekTimeout);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('loadeddata', onLoadedData);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      video.pause();
      video.src = '';
    };
  }, [videoUrl, isVisible, error, cacheKey, frameTime, cachedFrame, attemptUrls, attemptIndex, useThumbnailOnly, mobileOrPWA, skipThumbnailOnly]);

  const showServerThumb = !!(resolvedThumbnailUrl && !thumbnailLoadFailed);
  const hasExtractedVisual = !!(cachedFrame && frameReady);
  const showNeutralPlaceholder = !showServerThumb && !hasExtractedVisual;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-[#374151] ${className}`}
    >
      {showNeutralPlaceholder ? (
        <img src={VIDEO_PLACEHOLDER_IMG} alt={alt} className="absolute inset-0 w-full h-full object-cover" />
      ) : null}
      {showServerThumb ? (
        <img
          src={resolvedThumbnailUrl}
          alt={alt}
          className={`absolute inset-0 z-[1] w-full h-full object-cover transition-opacity duration-150 ease-out ${hasExtractedVisual ? 'opacity-0' : 'opacity-100'}`}
          onError={() => setThumbnailLoadFailed(true)}
        />
      ) : null}
      {cachedFrame ? (
        <img
          src={cachedFrame}
          alt={alt}
          className={`absolute inset-0 z-[2] w-full h-full object-cover ${hasExtractedVisual ? 'opacity-100' : 'opacity-0'}`}
        />
      ) : null}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 z-[2] w-full h-full object-cover ${frameReady && !cachedFrame ? 'opacity-100' : 'opacity-0'}`}
        aria-label={alt}
        style={useThumbnailOnly ? { display: 'none' } : undefined}
      />
      {!useThumbnailOnly && (
      <video
        ref={videoRef}
        muted
        playsInline
        preload="auto"
        className="absolute opacity-0 pointer-events-none w-0 h-0"
        aria-hidden
      />
      )}
    </div>
  );
}
