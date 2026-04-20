import React, { useEffect, useMemo, useRef, useState, createElement } from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as VideoThumbnails from 'expo-video-thumbnails';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

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

const THUMB_CACHE_PREFIX = 'afw_smart_thumb_v1:';
const THUMB_CACHE_MAX_ENTRIES = 800;
const THUMB_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

type ThumbCacheEntry = { uri: string; ts: number };

const memoryCache = new Map<string, ThumbCacheEntry>();
let memoryCacheOrder: string[] = [];
const inFlight = new Map<string, Promise<string | null>>();

function stableHash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = (h * 33) ^ input.charCodeAt(i);
  return (h >>> 0).toString(16);
}

function cacheKeyForVideoSource(videoSrc: string): string {
  return `${THUMB_CACHE_PREFIX}${stableHash(videoSrc)}`;
}

function touchKey(key: string) {
  memoryCacheOrder = [key, ...memoryCacheOrder.filter((k) => k !== key)];
  if (memoryCacheOrder.length > THUMB_CACHE_MAX_ENTRIES) {
    const toDrop = memoryCacheOrder.slice(THUMB_CACHE_MAX_ENTRIES);
    memoryCacheOrder = memoryCacheOrder.slice(0, THUMB_CACHE_MAX_ENTRIES);
    for (const k of toDrop) memoryCache.delete(k);
  }
}

async function isLocalFileUsable(uri: string): Promise<boolean> {
  const u = (uri || '').trim();
  if (!u) return false;
  if (!u.startsWith('file://')) return true;
  try {
    const info = await FileSystem.getInfoAsync(u);
    return Boolean(info.exists);
  } catch {
    return false;
  }
}

async function readPersistentCache(key: string): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    const entry =
      typeof (parsed as any)?.uri === 'string' && typeof (parsed as any)?.ts === 'number'
        ? (parsed as ThumbCacheEntry)
        : null;
    if (!entry) return null;
    if (!Number.isFinite(entry.ts) || Date.now() - entry.ts > THUMB_CACHE_TTL_MS) return null;
    if (!(await isLocalFileUsable(entry.uri))) return null;
    return entry.uri;
  } catch {
    return null;
  }
}

async function writePersistentCache(key: string, uri: string): Promise<void> {
  try {
    const entry: ThumbCacheEntry = { uri, ts: Date.now() };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch {
    /* ignore */
  }
}

function webVideoPreviewSrc(url: string) {
  const u = url.trim();
  if (!u) return u;
  if (/#t=\d/.test(u)) return u;
  const base = u.split('#')[0];
  return `${base}#t=0.1`;
}

export type SmartThumbnailProps = {
  posterUrl?: string;
  uri: string;
  videoUrl?: string;
  fallbackImage?: string;
  style: any;
  tileSize: number;
  tileHeight: number;
};

/** Miniature grille : vraie image (thumbnail_url) > frame (expo-video-thumbnails / web <video>) > placeholder. */
export function SmartThumbnail({
  posterUrl,
  uri,
  videoUrl,
  fallbackImage,
  style,
  tileSize,
  tileHeight,
}: SmartThumbnailProps) {
  const [thumbUri, setThumbUri] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [webVideoSrc, setWebVideoSrc] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const sources = useMemo(() => {
    const poster = (posterUrl || '').trim();
    const main = (uri || '').trim();
    const vid = (videoUrl || '').trim();
    const isPosterImage = poster && !isVideoUrl(poster) && !isLikelyRecordingUrl(poster);
    const isMainImage = main && !isVideoUrl(main) && !isLikelyRecordingUrl(main);
    const effectiveVideoSrc = (vid || main || '').trim();
    return {
      poster,
      main,
      effectiveVideoSrc,
      isPosterImage,
      isMainImage,
      isEffectiveVideo:
        effectiveVideoSrc && (isVideoUrl(effectiveVideoSrc) || isLikelyRecordingUrl(effectiveVideoSrc)),
      // NOTE: for video tiles we intentionally avoid generic image fallbacks (avatar/logo)
      fallback: (fallbackImage || '').trim(),
    };
  }, [posterUrl, uri, videoUrl, fallbackImage]);

  useEffect(() => {
    setError(false);
    setWebVideoSrc(null);

    if (sources.isPosterImage) {
      setThumbUri(sources.poster);
      return;
    }

    if (sources.isMainImage) {
      setThumbUri(sources.main);
      return;
    }

    const videoSrc = sources.effectiveVideoSrc;
    if (Platform.OS === 'web' && sources.isEffectiveVideo) {
      setThumbUri(null);
      setWebVideoSrc(webVideoPreviewSrc(videoSrc));
      return;
    }

    const generateThumb = async () => {
      if (Platform.OS !== 'web' && sources.isEffectiveVideo) {
        const key = cacheKeyForVideoSource(videoSrc);

        const memHit = memoryCache.get(key);
        if (
          memHit &&
          Date.now() - memHit.ts <= THUMB_CACHE_TTL_MS &&
          (await isLocalFileUsable(memHit.uri))
        ) {
          touchKey(key);
          if (mountedRef.current) setThumbUri(memHit.uri);
          return;
        }

        const persisted = await readPersistentCache(key);
        if (persisted) {
          memoryCache.set(key, { uri: persisted, ts: Date.now() });
          touchKey(key);
          if (mountedRef.current) setThumbUri(persisted);
          return;
        }

        const existing = inFlight.get(key);
        if (existing) {
          const uri = await existing;
          if (mountedRef.current) {
            if (uri) setThumbUri(uri);
            else {
              setThumbUri(null);
              setError(true);
            }
          }
          return;
        }

        const task = (async () => {
          const timeOffsetsMs = [100, 250, 400, 700, 900, 1200, 1500, 2000, 2400, 3200, 4000, 5500, 8000];
          const qualities = [0.55, 0.4, 0.3];

          for (const q of qualities) {
            for (const timeMs of timeOffsetsMs) {
              try {
                const { uri: thumbImage } = await VideoThumbnails.getThumbnailAsync(videoSrc, {
                  time: timeMs,
                  quality: q,
                });
                if (!thumbImage) continue;
                if (!(await isLocalFileUsable(thumbImage))) continue;
                memoryCache.set(key, { uri: thumbImage, ts: Date.now() });
                touchKey(key);
                void writePersistentCache(key, thumbImage);
                return thumbImage;
              } catch {
                /* try next offset */
              }
            }
          }
          return null;
        })();

        inFlight.set(key, task);
        try {
          const uri = await task;
          if (mountedRef.current) {
            if (uri) setThumbUri(uri);
            else {
              setThumbUri(null);
              setError(true);
            }
          }
          return;
        } finally {
          inFlight.delete(key);
        }
      }

      // Non-video tile: keep legacy fallback image behavior.
      if (sources.fallback) {
        setThumbUri(sources.fallback);
        return;
      }
      setThumbUri(null);
      setError(true);
    };
    void generateThumb();
  }, [sources]);

  if (webVideoSrc && Platform.OS === 'web') {
    const flat = StyleSheet.flatten(style) as Record<string, unknown> | undefined;
    return createElement('video', {
      src: webVideoSrc,
      muted: true,
      autoPlay: false,
      playsInline: true,
      preload: 'metadata',
      controls: false,
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

  if (error || !thumbUri) {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#E91E63', '#FF6B00'];
    const key = (uri || posterUrl || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const idx = Math.abs(key) % colors.length;
    return (
      <View style={[style, { backgroundColor: colors[idx], alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="play-circle" size={Math.min(tileSize, tileHeight) * 0.35} color="rgba(255,255,255,0.7)" />
      </View>
    );
  }

  return <Image source={{ uri: thumbUri }} style={style} resizeMode="cover" />;
}
