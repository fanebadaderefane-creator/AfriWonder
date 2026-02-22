import React, { useRef, useState, useEffect } from 'react';
import { getVideoPlaybackUrl, VIDEO_PLACEHOLDER_IMG } from '@/lib/utils';

/**
 * Affiche une frame extraite de la vidéo (première seconde).
 * Utilise la vidéo elle-même comme source, pas une image générique.
 * Fallback sur image de secours si chargement/extraction échoue.
 */
export default function VideoFrameThumbnail({ videoUrl, alt = '', className = '' }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [frameDataUrl, setFrameDataUrl] = useState(null);
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
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const playbackUrl = getVideoPlaybackUrl(videoUrl);
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = playbackUrl;

    const captureFrame = () => {
      try {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setError(true);
          return;
        }
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (w <= 0 || h <= 0) {
          setError(true);
          return;
        }
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(video, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setFrameDataUrl(dataUrl);
      } catch (e) {
        setError(true);
      }
    };

    const tryCapture = () => {
      if (video.readyState >= 2 && video.videoWidth > 0) captureFrame();
    };

    const onLoadedMetadata = () => {
      const t = Math.min(1, (video.duration || 2) / 10);
      video.currentTime = t;
    };

    const onSeeked = () => tryCapture();
    const onLoadedData = () => {
      if (video.currentTime === 0) tryCapture();
    };

    const onError = () => {
      setError(true);
    };

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
      video.src = '';
    };
  }, [videoUrl, isVisible, error]);

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden bg-gray-200 ${className}`}>
      <img
        src={frameDataUrl || VIDEO_PLACEHOLDER_IMG}
        alt={alt}
        className="w-full h-full object-cover"
        onError={(e) => {
          e.currentTarget.src = VIDEO_PLACEHOLDER_IMG;
        }}
      />
      {/* Vidéo cachée pour extraction de frame */}
      <video
        ref={videoRef}
        className="absolute w-0 h-0 opacity-0 pointer-events-none"
        muted
        playsInline
        preload="metadata"
        aria-hidden
      />
      <canvas ref={canvasRef} className="absolute w-0 h-0 opacity-0" aria-hidden />
    </div>
  );
}
