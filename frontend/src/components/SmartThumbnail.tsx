import React, { useEffect, useState, createElement } from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as VideoThumbnails from 'expo-video-thumbnails';

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

/** Miniature grille : vraie image (thumbnail_url) > frame natif (expo-video-thumbnails) > aperçu vidéo web > fallback image. */
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

  useEffect(() => {
    setError(false);
    setWebVideoSrc(null);

    const poster = (posterUrl || '').trim();
    if (poster && !isVideoUrl(poster)) {
      setThumbUri(poster);
      return;
    }

    const main = (uri || '').trim();
    if (main && !isVideoUrl(main)) {
      setThumbUri(main);
      return;
    }

    const videoSrc = (videoUrl || main || '').trim();
    if (Platform.OS === 'web' && videoSrc && isVideoUrl(videoSrc)) {
      setThumbUri(null);
      setWebVideoSrc(webVideoPreviewSrc(videoSrc));
      return;
    }

    const generateThumb = async () => {
      if (Platform.OS !== 'web' && videoSrc && isVideoUrl(videoSrc)) {
        for (const timeMs of [400, 1200, 2400]) {
          try {
            const { uri: thumbImage } = await VideoThumbnails.getThumbnailAsync(videoSrc, {
              time: timeMs,
              quality: 0.45,
            });
            setThumbUri(thumbImage);
            return;
          } catch {
            /* try next offset */
          }
        }
      }
      const fb = (fallbackImage || '').trim();
      if (fb) {
        setThumbUri(fb);
        return;
      }
      setThumbUri(null);
      setError(true);
    };
    void generateThumb();
  }, [posterUrl, uri, videoUrl, fallbackImage]);

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
