import React, { useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react';
import Hls from 'hls.js';
import {
  getVideoPlaybackUrl,
  getVideoPlaybackUrlCandidatesForFrameGrab,
  VIDEO_PLACEHOLDER_IMG,
  getAbsoluteImageUrl,
  isValidThumbnailUrl,
  isMobileOrPWA,
} from '@/lib/utils';

const M3U8_RE = /\.m3u8(\?|#|$)/i;

/**
 * Aperçu « frame » depuis la vidéo elle-même (Discover, profil, recherche).
 * Ne repose pas sur la miniature serveur sur mobile/PWA : décodage natif + HLS via hls.js si besoin.
 * skipThumbnailOnly : conservé pour compat API, sans effet (toujours priorité à la vidéo).
 */
export default function VideoFrameThumbnail({
  videoUrl,
  thumbnailUrl: thumbnailUrlProp,
  alt = '',
  className = '',
  frameTime = null,
  skipThumbnailOnly: _skipThumbnailOnly = false,
}) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const containerRef = useRef(null);
  const [error, setError] = useState(false);
  const [isVisible, setIsVisible] = useState(
    () => typeof window !== 'undefined' && isMobileOrPWA()
  );
  const [frameReady, setFrameReady] = useState(false);
  const [thumbnailLoadFailed, setThumbnailLoadFailed] = useState(false);
  const mobileOrPWA = useMemo(() => isMobileOrPWA(), []);

  const resolvedThumbnailUrl =
    thumbnailUrlProp && isValidThumbnailUrl(thumbnailUrlProp, videoUrl)
      ? getAbsoluteImageUrl(thumbnailUrlProp)
      : '';

  const playbackUrl = useMemo(() => getVideoPlaybackUrl(videoUrl), [videoUrl]);
  const attemptUrls = useMemo(() => {
    const c = getVideoPlaybackUrlCandidatesForFrameGrab(videoUrl);
    return c.length > 0 ? c : playbackUrl ? [playbackUrl] : [];
  }, [videoUrl, playbackUrl]);

  const [attemptIndex, setAttemptIndex] = useState(0);

  useEffect(() => {
    setAttemptIndex(0);
    setError(false);
    setFrameReady(false);
    setThumbnailLoadFailed(false);
  }, [videoUrl]);

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
    if (!videoUrl || !isVisible || error) return;

    const video = videoRef.current;
    if (!video) return;

    const sourceToTry = attemptUrls[attemptIndex] || '';
    if (!sourceToTry) {
      setError(true);
      return;
    }

    let cancelled = false;
    setFrameReady(false);

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.preload = 'auto';

    const getSeekTime = () => {
      const duration = Math.max(0.2, Number(video.duration || 0.2));
      const desired =
        Number.isFinite(frameTime) && frameTime >= 0
          ? Number(frameTime)
          : Math.min(0.35, Math.max(0.04, duration / 12));
      return Math.max(0.04, Math.min(duration - 0.04, desired));
    };

    const markIfPaintable = () => {
      if (cancelled) return;
      const vw = video.videoWidth || 0;
      const vh = video.videoHeight || 0;
      if (vw < 2 || vh < 2) return;
      setFrameReady(true);
    };

    const onSeeked = () => {
      if (cancelled) return;
      try {
        video.pause();
      } catch (_) {
        /* ignore */
      }
      markIfPaintable();
    };

    const seekFromMetadata = () => {
      if (cancelled) return;
      try {
        video.currentTime = getSeekTime();
      } catch (_) {
        /* ignore */
      }
    };

    const onLoadedData = () => {
      if (cancelled) return;
      markIfPaintable();
    };

    const failOrNext = () => {
      if (cancelled) return;
      if (attemptIndex < attemptUrls.length - 1) {
        setAttemptIndex((p) => p + 1);
      } else {
        setFrameReady(false);
        setError(true);
      }
    };

    const onVideoError = () => failOrNext();

    const detach = () => {
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch (_) {
          /* ignore */
        }
        hlsRef.current = null;
      }
      video.removeEventListener('loadedmetadata', seekFromMetadata);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('loadeddata', onLoadedData);
      video.removeEventListener('error', onVideoError);
      try {
        video.pause();
        video.removeAttribute('src');
        while (video.firstChild) video.removeChild(video.firstChild);
        video.load();
      } catch (_) {
        /* ignore */
      }
    };

    video.addEventListener('loadedmetadata', seekFromMetadata);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('error', onVideoError);

    const isHls = M3U8_RE.test(sourceToTry);

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 6,
        maxMaxBufferLength: 12,
        startLevel: 0,
        enableWorker: true,
      });
      hlsRef.current = hls;
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (cancelled || !data) return;
        if (data.fatal) failOrNext();
      });
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (cancelled) return;
        seekFromMetadata();
      });
      hls.loadSource(sourceToTry);
      hls.attachMedia(video);
    } else if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = sourceToTry;
      try {
        video.load();
      } catch (_) {
        /* ignore */
      }
    } else if (isHls) {
      failOrNext();
      return () => {
        cancelled = true;
        detach();
      };
    } else {
      video.src = sourceToTry;
      try {
        video.load();
      } catch (_) {
        /* ignore */
      }
    }

    const kickDecodeTimer = window.setTimeout(() => {
      if (cancelled) return;
      if (video.readyState >= 2) markIfPaintable();
    }, mobileOrPWA ? 480 : 360);

    return () => {
      cancelled = true;
      clearTimeout(kickDecodeTimer);
      detach();
    };
  }, [videoUrl, isVisible, error, attemptIndex, attemptUrls, frameTime, mobileOrPWA]);

  const showServerFallback =
    !!error && !!resolvedThumbnailUrl && !thumbnailLoadFailed;
  const showNeutralPlaceholder = !frameReady && !showServerFallback;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-[#4b5563] ${className}`}
    >
      {showNeutralPlaceholder ? (
        <img
          src={VIDEO_PLACEHOLDER_IMG}
          alt={alt}
          className="absolute inset-0 z-0 h-full w-full object-cover"
        />
      ) : null}
      {showServerFallback ? (
        <img
          src={resolvedThumbnailUrl}
          alt={alt}
          className="absolute inset-0 z-[5] h-full w-full object-cover"
          onError={() => setThumbnailLoadFailed(true)}
        />
      ) : null}
      <video
        ref={videoRef}
        muted
        playsInline
        preload="auto"
        className={`pointer-events-none absolute inset-0 z-10 h-full w-full object-cover transition-opacity duration-200 ease-out ${
          frameReady ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden
      />
    </div>
  );
}
