import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, createElement } from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import apiClient from '../api/client';
import { tryAcquireVideoFrameSlot, releaseVideoFrameSlot } from '../utils/videoFramePreviewBudget';
import {
  ensureVideoFrameLocalUri,
  getCachedExtractedFrameUri,
  subscribeFrameExtractCache,
  getFrameExtractCacheVersion,
  isExtractFailed,
} from '../utils/videoFrameExtractCache';
import { useDataSaverOptional } from '../dataSaver/DataSaverContext';
import { shouldSkipDiscoverVideoPrefetch } from '../config/mobileDataPolicy';

/**
 * URL média « flux » (MP4, etc.) — ne pas utiliser `includes('/videos/')` : les miniatures CDN
 * contiennent souvent ce segment et seraient traitées à tort comme vidéo → tuiles vides.
 */
export const isVideoUrl = (url: string) => {
  if (!url) return false;
  const path = url.toLowerCase().split('?')[0].split('#')[0];
  if (path.includes('.m3u8')) return true;
  return /\.(mp4|mov|m4v|avi|webm|mkv|mpeg|mpg)$/.test(path);
};

/**
 * Replays / lives CDN souvent sans extension (.mp4) — évite de traiter l’URL comme une image.
 */
export function isLikelyRecordingUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  if (isVideoUrl(url)) return true;
  const pathOnly = url.split('?')[0].split('#')[0].toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?|$)/i.test(pathOnly)) return false;
  if (pathOnly.includes('.m3u8') || pathOnly.includes('.mpd') || url.toLowerCase().includes('format=m3u8')) return true;
  if (
    /cloudfront\.net|amazonaws\.com|storage\.googleapis\.com|blob\.core\.windows\.net|supabase\.co\/storage|r2\.cloudflarestorage|cloudflarestream\.com|mux\.com|akamaized\.net/i.test(
      url,
    )
  ) {
    return true;
  }
  if (/\/(replay|recording|hls|vod|live|stream|media|segments|transcode)\//i.test(pathOnly)) return true;
  return false;
}

/**
 * Grille : poster / `uri` pointant vers une vraie image (extension) — ne pas confondre avec
 * un lien CDN (isLikelyRecordingUrl) quand c’est `…/thumb.jpg` sur CloudFront.
 */
function pathLooksLikeRasterImageUrl(u: string): boolean {
  const pathOnly = (u || '').split('?')[0].split('#')[0];
  return /\.(jpg|jpeg|png|gif|webp|bmp|avif|svg)$/i.test(pathOnly);
}

function isHlsOrDashManifestUrl(url: string): boolean {
  if (!url) return false;
  const k = String(url);
  const pathLower = k.split('?')[0].split('#')[0].toLowerCase();
  return pathLower.includes('.m3u8') || pathLower.includes('.mpd') || /(^|[?&])format=m3u8/i.test(k);
}

/**
 * Aperçu web : `<video preload>` à t=0 affiche souvent un cadre **noir** (intro, écran tel avant
 * la scène). On cherche un peu plus loin dans le clip dès que les métadonnées sont dispo.
 */
function WebVideoFramePreview({
  videoSrc,
  style,
  tileSize,
  tileHeight,
  hashKey,
  videoIdForServerThumbnail: vidForThumb,
}: {
  videoSrc: string;
  style: any;
  tileSize: number;
  tileHeight: number;
  hashKey: string;
  videoIdForServerThumbnail?: string;
}) {
  const [failed, setFailed] = useState(false);
  const seekDone = useRef(false);
  const baseSrc = useMemo(() => String(videoSrc || '').trim().split('#')[0], [videoSrc]);

  useEffect(() => {
    seekDone.current = false;
    setFailed(false);
  }, [baseSrc]);

  const trySeekToVisible = useCallback(
    (e: { currentTarget?: HTMLVideoElement | null } | null) => {
      if (failed || seekDone.current) return;
      const v = e?.currentTarget;
      if (!v || v.readyState < 1) return;
      const d = v.duration;
      let t = 0.6;
      if (Number.isFinite(d) && d > 0.15) {
        t = Math.min(1.5, Math.max(0.1, d * 0.02));
      } else if (!Number.isFinite(d) || d <= 0) {
        t = 0.6;
      }
      try {
        v.currentTime = t;
        seekDone.current = true;
      } catch {
        /* ignore */
      }
    },
    [failed]
  );

  const onErr = useCallback(() => {
    setFailed(true);
    if (vidForThumb) {
      kickServerThumbnailGeneration(vidForThumb);
    }
  }, [vidForThumb]);

  if (failed) {
    return (
      <ColoredPlaceholder
        style={style}
        tileSize={tileSize}
        tileHeight={tileHeight}
        hashKey={hashKey}
      />
    );
  }

  const flat = StyleSheet.flatten(style) as Record<string, unknown> | undefined;
  return createElement('video', {
    key: baseSrc,
    src: baseSrc,
    muted: true,
    autoPlay: false,
    playsInline: true,
    preload: 'auto',
    controls: false,
    onLoadedMetadata: trySeekToVisible,
    onLoadedData: trySeekToVisible,
    onError: onErr,
    style: {
      width: flat?.width ?? '100%',
      height: flat?.height ?? '100%',
      objectFit: 'cover',
      backgroundColor: '#111',
      display: 'block',
      pointerEvents: 'none',
    },
  });
}

/**
 * Déclenche en arrière-plan la génération de la miniature côté backend (R2) pour qu'aux prochains
 * chargements `thumbnail_url` soit déjà rempli. Idempotent côté serveur ; on n'attend pas la réponse.
 */
const serverThumbAttempted = new Set<string>();
function kickServerThumbnailGeneration(videoId: string): void {
  const id = (videoId || '').trim();
  if (!id) return;
  if (serverThumbAttempted.has(id)) return;
  serverThumbAttempted.add(id);
  apiClient.post(`/videos/${encodeURIComponent(id)}/thumbnail:generate`, {}).catch(() => {
    serverThumbAttempted.delete(id);
  });
}

/**
 * Natif : on rend la vidéo elle-même (muet, non lue) pour afficher sa première frame comme
 * aperçu — même idée qu'un `<video preload="metadata">` côté web.
 */
function NativeVideoFramePreview({
  videoSrc,
  style,
}: {
  videoSrc: string;
  style: any;
}) {
  const player = useVideoPlayer(videoSrc, (p) => {
    try {
      p.muted = true;
      p.loop = false;
      p.showNowPlayingNotification = false;
    } catch {
      /* ignore */
    }
  });

  return (
    <VideoView
      player={player}
      style={style}
      contentFit="cover"
      nativeControls={false}
      allowsPictureInPicture={false}
    />
  );
}

function BudgetedNativeVideoFramePreview({
  videoSrc,
  style,
  slotKey,
  tileSize,
  tileHeight,
  placeholderHashKey,
}: {
  videoSrc: string;
  style: any;
  slotKey: string;
  tileSize: number;
  tileHeight: number;
  placeholderHashKey: string;
}) {
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    setGranted(tryAcquireVideoFrameSlot(slotKey));
    return () => {
      releaseVideoFrameSlot(slotKey);
    };
  }, [slotKey]);

  if (!granted) {
    return (
      <ColoredPlaceholder
        style={style}
        tileSize={tileSize}
        tileHeight={tileHeight}
        hashKey={placeholderHashKey}
      />
    );
  }

  return <NativeVideoFramePreview videoSrc={videoSrc} style={style} />;
}

/**
 * Image extraite (fichier local) : cache partagé + re-render dès qu’une frame est prête
 * (pré-chargement Découvrir + `ensure` dédupliqué = souvent affichage quasi instantané sur mobile).
 */
function ExtractedFrameThumbnail({
  videoSrc,
  style,
  tileSize,
  tileHeight,
}: {
  videoSrc: string;
  style: any;
  tileSize: number;
  tileHeight: number;
}) {
  const [timedOut, setTimedOut] = useState(false);
  const dataSaver = useDataSaverOptional();
  const skipFrameDownload =
    dataSaver != null &&
    shouldSkipDiscoverVideoPrefetch(dataSaver.effectiveDataSaver, dataSaver.isOnCellular);

  const tick = useSyncExternalStore(
    subscribeFrameExtractCache,
    getFrameExtractCacheVersion,
    getFrameExtractCacheVersion
  );
  void tick;
  const fileUri = getCachedExtractedFrameUri(videoSrc);

  useEffect(() => {
    setTimedOut(false);
    const t = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(t);
  }, [videoSrc]);

  useEffect(() => {
    if (skipFrameDownload) return;
    if (isHlsOrDashManifestUrl(videoSrc)) return;
    if (isExtractFailed(videoSrc)) return;
    if (getCachedExtractedFrameUri(videoSrc)) return;
    void ensureVideoFrameLocalUri(videoSrc);
  }, [videoSrc, skipFrameDownload]);

  if (fileUri) {
    const f = (fileUri || '').trim();
    const displayUri = /^(file|content|https?|asset):/i.test(f)
      ? f
      : f.startsWith('/')
        ? `file://${f}`
        : `file:///${f}`;
    if (Platform.OS === 'android') {
      return <Image source={{ uri: displayUri }} style={style} resizeMode="cover" />;
    }
    return (
      <ExpoImage
        source={{ uri: displayUri }}
        style={style}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={60}
        recyclingKey={videoSrc}
      />
    );
  }
  if (isHlsOrDashManifestUrl(videoSrc)) {
    return (
      <ColoredPlaceholder style={style} tileSize={tileSize} tileHeight={tileHeight} hashKey={videoSrc} />
    );
  }
  /** Même rendu qu’HLS/timeout : évite une grille entièrement gris-noir quand toutes les extractions échouent. */
  if (isExtractFailed(videoSrc)) {
    return (
      <ColoredPlaceholder style={style} tileSize={tileSize} tileHeight={tileHeight} hashKey={videoSrc} />
    );
  }
  if (timedOut) {
    return (
      <ColoredPlaceholder style={style} tileSize={tileSize} tileHeight={tileHeight} hashKey={videoSrc} />
    );
  }
  /** Chargement : fond neutre (pas d’arc-en-ciel). */
  return <NeutralGridThumb style={style} tileSize={tileSize} tileHeight={tileHeight} dim={false} />;
}

function NeutralGridThumb({
  style,
  tileSize,
  tileHeight,
  dim,
}: {
  style: any;
  tileSize: number;
  tileHeight: number;
  /** Échec extract : légèrement plus discret. */
  dim?: boolean;
}) {
  return (
    <View
      style={[
        style,
        { backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
      ]}
    >
      <Ionicons
        name="play-circle"
        size={Math.min(tileSize, tileHeight) * 0.28}
        color={dim ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.2)'}
      />
    </View>
  );
}

function ColoredPlaceholder({
  style,
  tileSize,
  tileHeight,
  hashKey = '',
}: {
  style: any;
  tileSize: number;
  tileHeight: number;
  hashKey?: string;
}) {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#E91E63', '#FF6B00'];
  const key = (hashKey || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const idx = Math.abs(key) % colors.length;
  return (
    <View style={[style, { backgroundColor: colors[idx], alignItems: 'center', justifyContent: 'center' }]}>
      <Ionicons name="play-circle" size={Math.min(tileSize, tileHeight) * 0.35} color="rgba(255,255,255,0.7)" />
    </View>
  );
}

export type SmartThumbnailProps = {
  posterUrl?: string;
  uri: string;
  videoUrl?: string;
  fallbackImage?: string;
  videoIdForServerThumbnail?: string;
  /**
   * Grilles (Discover, etc.) : ne **jamais** monter `VideoView` pour une « première frame ».
   * (déconseillé si `extractPosterFromVideo` est utilisé)
   */
  preferPlaceholderOverVideo?: boolean;
  /**
   * **Natif (priorité app stores : Play / iOS)** : extraire une image via `expo-video-thumbnails`
   * (fichier local + `expo-image`), sans N `VideoView` en grille. HLS seuls → échec extract
   * → placeholder jusqu’à `thumbnail_url` côté API.
   */
  extractPosterFromVideo?: boolean;
  /**
   * Grilles (hors `preferPlaceholderOverVideo`) : plafonner les `VideoView` via
   * `../utils/videoFramePreviewBudget` — utiliser plutôt `preferPlaceholderOverVideo` sur le natif.
   */
  limitVideoFramePreviews?: boolean;
  videoFramePreviewKey?: string;
  style: any;
  tileSize: number;
  tileHeight: number;
};

/**
 * Miniature grille. Ordre de priorité :
 *  1. `posterUrl` / image statique (rempli par le backend → le plus rapide et le moins cher)
 *  2. Vidéo elle-même rendue en muet non lue (première frame visible nativement)
 *  3. Placeholder coloré (seulement si on n'a ni poster ni source vidéo)
 *
 * Quand on passe par (2) sur natif, on déclenche aussi côté backend la génération de
 * `thumbnail_url` en tâche de fond — les chargements suivants utiliseront directement (1).
 */
export function SmartThumbnail({
  posterUrl,
  uri,
  videoUrl,
  fallbackImage,
  videoIdForServerThumbnail,
  preferPlaceholderOverVideo = false,
  extractPosterFromVideo = false,
  limitVideoFramePreviews = false,
  videoFramePreviewKey,
  style,
  tileSize,
  tileHeight,
}: SmartThumbnailProps) {
  const [imageError, setImageError] = useState(false);

  const sources = useMemo(() => {
    const poster = (posterUrl || '').trim();
    const main = (uri || '').trim();
    const vid = (videoUrl || '').trim();
    const isPosterImage =
      poster &&
      !isVideoUrl(poster) &&
      (pathLooksLikeRasterImageUrl(poster) || !isLikelyRecordingUrl(poster));
    const isMainImage =
      main && !isVideoUrl(main) && (pathLooksLikeRasterImageUrl(main) || !isLikelyRecordingUrl(main));
    const effectiveVideoSrc = (vid || main || '').trim();
    return {
      poster,
      main,
      effectiveVideoSrc,
      isPosterImage,
      isMainImage,
      isEffectiveVideo:
        effectiveVideoSrc && (isVideoUrl(effectiveVideoSrc) || isLikelyRecordingUrl(effectiveVideoSrc)),
      fallback: (fallbackImage || '').trim(),
    };
  }, [posterUrl, uri, videoUrl, fallbackImage]);

  const videoFrameSlotKey = useMemo(() => {
    const fromProp = (videoFramePreviewKey || '').trim();
    if (fromProp) return fromProp;
    const fromId = (videoIdForServerThumbnail || '').trim();
    if (fromId) return fromId;
    return (sources.effectiveVideoSrc || '').trim();
  }, [videoFramePreviewKey, videoIdForServerThumbnail, sources.effectiveVideoSrc]);

  useEffect(() => {
    setImageError(false);
  }, [sources]);

  const staticImageUri = useMemo(() => {
    if (sources.isPosterImage) return sources.poster;
    if (sources.isMainImage) return sources.main;
    return '';
  }, [sources]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (staticImageUri && !imageError) return;
    if (!sources.isEffectiveVideo) return;
    if (!videoIdForServerThumbnail) return;
    kickServerThumbnailGeneration(videoIdForServerThumbnail);
  }, [staticImageUri, imageError, sources.isEffectiveVideo, videoIdForServerThumbnail]);

  if (staticImageUri && !imageError) {
    return (
      <Image
        source={{ uri: staticImageUri }}
        style={style}
        resizeMode="cover"
        onError={() => setImageError(true)}
      />
    );
  }

  if (Platform.OS !== 'web' && extractPosterFromVideo && sources.isEffectiveVideo) {
    return (
      <ExtractedFrameThumbnail
        videoSrc={sources.effectiveVideoSrc}
        style={style}
        tileSize={tileSize}
        tileHeight={tileHeight}
      />
    );
  }

  if (Platform.OS === 'web' && sources.isEffectiveVideo) {
    if (preferPlaceholderOverVideo) {
      if (sources.fallback) {
        return <Image source={{ uri: sources.fallback }} style={style} resizeMode="cover" />;
      }
      return (
        <ColoredPlaceholder
          style={style}
          tileSize={tileSize}
          tileHeight={tileHeight}
          hashKey={uri || posterUrl || sources.effectiveVideoSrc}
        />
      );
    }
    return (
      <WebVideoFramePreview
        videoSrc={sources.effectiveVideoSrc}
        style={style}
        tileSize={tileSize}
        tileHeight={tileHeight}
        hashKey={uri || posterUrl || sources.effectiveVideoSrc}
        videoIdForServerThumbnail={videoIdForServerThumbnail}
      />
    );
  }

  if (preferPlaceholderOverVideo && sources.isEffectiveVideo) {
    if (sources.fallback) {
      return <Image source={{ uri: sources.fallback }} style={style} resizeMode="cover" />;
    }
    return (
      <ColoredPlaceholder
        style={style}
        tileSize={tileSize}
        tileHeight={tileHeight}
        hashKey={uri || posterUrl || sources.effectiveVideoSrc}
      />
    );
  }

  if (Platform.OS !== 'web' && sources.isEffectiveVideo) {
    if (limitVideoFramePreviews) {
      return (
        <BudgetedNativeVideoFramePreview
          videoSrc={sources.effectiveVideoSrc}
          style={style}
          slotKey={videoFrameSlotKey}
          tileSize={tileSize}
          tileHeight={tileHeight}
          placeholderHashKey={uri || posterUrl || sources.effectiveVideoSrc}
        />
      );
    }
    return <NativeVideoFramePreview videoSrc={sources.effectiveVideoSrc} style={style} />;
  }

  if (sources.fallback) {
    return <Image source={{ uri: sources.fallback }} style={style} resizeMode="cover" />;
  }

  return (
    <ColoredPlaceholder
      style={style}
      tileSize={tileSize}
      tileHeight={tileHeight}
      hashKey={uri || posterUrl || ''}
    />
  );
}
