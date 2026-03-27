/**
 * Miniature grille Discover / Profil.
 * Pour une vraie vidéo on affiche toujours une frame décodée (VideoView), pas seulement thumbnail_url.
 * Les posts image utilisent <Image />.
 */
import React, { useEffect, useRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';

import { getAbsoluteImageUrl } from '../utils';
import { getGridThumbnailImageUri, getVideoGridPlaybackUrl } from '../utils/videoThumbnail';

function PosterFromVideo({ videoUrl, style, contentFit }) {
  const player = useVideoPlayer(videoUrl || '', (p) => {
    if (!p) return;
    p.loop = false;
    p.muted = true;
    try {
      p.volume = 0;
    } catch (_) {}
  });
  const paintKickRef = useRef(null);

  useEffect(() => {
    if (!player || !videoUrl) return;
    let cancelled = false;
    const tick = async () => {
      for (let i = 0; i < 50 && !cancelled; i++) {
        await new Promise((r) => setTimeout(r, 120));
        try {
          const d = player.duration ?? 0;
          if (d > 0) {
            const t = Math.min(0.4, Math.max(0.06, d * 0.04));
            player.currentTime = t;
            // Certains devices n’affichent pas de surface avant un court play/pause.
            try {
              player.play();
              paintKickRef.current = setTimeout(() => {
                try {
                  player.pause();
                } catch (_) {}
              }, 90);
            } catch (_) {}
            break;
          }
        } catch (_) {}
      }
    };
    tick();
    return () => {
      cancelled = true;
      if (paintKickRef.current) clearTimeout(paintKickRef.current);
    };
  }, [player, videoUrl]);

  if (!videoUrl) {
    return (
      <View style={[style, styles.placeholder]}>
        <Ionicons name="videocam-outline" size={28} color="#4B5563" />
      </View>
    );
  }

  return (
    <View style={style} pointerEvents="none">
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        contentFit={contentFit}
        nativeControls={false}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
      />
    </View>
  );
}

export default function VideoGridThumbnail({
  video,
  style,
  contentFit = 'cover',
}) {
  const videoUrl = getVideoGridPlaybackUrl(video);

  if (video?.media_type === 'image') {
    const raw = video?.thumbnail_url || video?.video_url || '';
    const uri = raw ? getAbsoluteImageUrl(raw) : '';
    if (uri) {
      return <Image source={{ uri }} style={style} resizeMode="cover" />;
    }
  }

  if (videoUrl) {
    return (
      <PosterFromVideo
        key={video?.id ?? videoUrl}
        videoUrl={videoUrl}
        style={style}
        contentFit={contentFit}
      />
    );
  }

  const fallbackImg = getGridThumbnailImageUri(video);
  if (fallbackImg) {
    return <Image source={{ uri: fallbackImg }} style={style} resizeMode="cover" />;
  }

  return (
    <View style={[style, styles.placeholder]}>
      <Ionicons name="videocam-outline" size={28} color="#4B5563" />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
