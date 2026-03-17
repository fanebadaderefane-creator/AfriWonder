import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';

import { api, getVideoPlaybackUrl } from '../api/client';

const win = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const MAX_WEB_WIDTH = 480;
const CARD_HEIGHT = win.height;
const CARD_WIDTH = isWeb ? Math.min(win.width, MAX_WEB_WIDTH) : win.width;

export default function VideoCard({
  video,
  isActive,
  isLiked: isLikedProp,
  isSaved: isSavedProp,
  cardHeight,
  onLike,
  onSave,
  onCommentsPress,
  onSharePress,
  onSupportPress,
  onProfileClick,
  onSubscribe,
  isFollowing = false,
}) {
  const cardH = cardHeight ?? CARD_HEIGHT;
  // HLS prioritaire si présent (CDC transcodage), sinon video_url / hd_url
  const rawUrl =
    video?.hls_url ||
    video?.video_url ||
    video?.videoUrl ||
    video?.low_quality_url ||
    video?.lowQualityUrl ||
    video?.hd_url ||
    video?.url ||
    '';
  const sourceUrl = rawUrl && typeof rawUrl === 'string' ? getVideoPlaybackUrl(rawUrl) : '';

  const initialLikeCount =
    video?.likes_count ?? video?.likes ?? video?.like_count ?? 0;
  const initialIsLikedFromVideo = Boolean(
    video?.isLiked ??
      video?.is_liked ??
      video?.liked_by_me ??
      video?.likedByMe ??
      video?.liked_by_user,
  );
  const initialIsLiked = isLikedProp !== undefined ? isLikedProp : initialIsLikedFromVideo;

  const [localIsLiked, setLocalIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isMuted, setIsMuted] = useState(isWeb);
  const [isPlaying, setIsPlaying] = useState(false);
  const [localSaved, setLocalSaved] = useState(isSavedProp ?? false);
  const isSaved = isSavedProp !== undefined ? isSavedProp : localSaved;
  const [progress, setProgress] = useState({ currentTime: 0, duration: 0 });
  const [progressBarWidth, setProgressBarWidth] = useState(0);
  const viewRecordedRef = useRef(false);
  const wasPlayingBeforeSeekRef = useRef(false);
  const lastTapRef = useRef(0);
  const singleTapTimeoutRef = useRef(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekRatio, setSeekRatio] = useState(0);

  const player = useVideoPlayer(sourceUrl, (playerInstance) => {
    playerInstance.loop = true;
    // Son actif par défaut en mobile, muet seulement sur le web
    playerInstance.muted = isWeb;
    playerInstance.volume = 1;
  });

  useEffect(() => {
    if (!player) return;
    if (isActive) {
      try {
        player.play();
        setIsPlaying(true);
      } catch (_) {}
    } else {
      try {
        player.pause();
      } catch (_) {}
      setIsPlaying(false);
    }
  }, [isActive, player]);

  useEffect(() => {
    if (!player || !isActive) return;
    const interval = setInterval(() => {
      try {
        const ct = player.currentTime ?? 0;
        const dur = player.duration ?? 0;
        setProgress({ currentTime: ct, duration: dur });
      } catch (_) {}
    }, 500);
    return () => clearInterval(interval);
  }, [player, isActive]);

  useEffect(() => {
    if (!player) return;
    player.muted = isMuted;
  }, [isMuted, player]);

  useEffect(() => {
    // Reset de l'état local quand la vidéo change (ou isLiked/isSaved du parent)
    setLocalIsLiked(initialIsLiked);
    setLikeCount(initialLikeCount);
    if (isSavedProp !== undefined) setLocalSaved(isSavedProp);
    viewRecordedRef.current = false;
  }, [video?.id, initialIsLiked, initialLikeCount, isSavedProp]);

  useEffect(() => {
    if (!isActive || viewRecordedRef.current || !video?.id) return;
    const timer = setTimeout(() => {
      if (viewRecordedRef.current || !video?.id) return;
      viewRecordedRef.current = true;
      api.videos
        .recordView(video.id, {
          watchSeconds: 3,
          watchPercent: 20,
        })
        .catch(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, [isActive, video?.id]);

  const handleLikePress = () => {
    if (!video?.id) return;
    const nextLiked = !localIsLiked;
    setLocalIsLiked(nextLiked);
    setLikeCount((prev) => prev + (nextLiked ? 1 : -1));
    if (onLike) {
      onLike(video);
    } else {
      api.videos.like(video.id).catch(() => {});
    }

    if (nextLiked) {
      try {
        const currentTime = player?.currentTime ?? 0;
        const duration = player?.duration ?? video?.duration ?? 60;
        const pct =
          duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
        api.videos
          .recordView(video.id, {
            watchSeconds: Math.max(0, currentTime),
            watchPercent: pct,
            interactionDetected: true,
          })
          .catch(() => {});
      } catch {
        // silencieux côté UI
      }
    }
  };

  const handleTogglePlayPause = () => {
    if (!player) return;
    try {
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
      } else {
        player.play();
        setIsPlaying(true);
      }
    } catch (_) {}
  };

  const handleScreenTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (lastTapRef.current && now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }
      lastTapRef.current = 0;
      handleLikePress();
      return;
    }

    lastTapRef.current = now;
    singleTapTimeoutRef.current = setTimeout(() => {
      handleTogglePlayPause();
      singleTapTimeoutRef.current = null;
    }, DOUBLE_TAP_DELAY);
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const handleSavePress = () => {
    if (!video?.id) return;
    const next = !isSaved;
    setLocalSaved(next);
    if (onSave) {
      onSave(video);
    } else {
      api.saves?.toggle?.(video.id).catch(() => {});
    }
  };

  const commentsCount = video?.comments_count ?? 0;
  const sharesCount = video?.shares ?? video?.shares_count ?? 0;
  const supportLabel = 'Soutenir';

  const creatorInitial =
    video?.creator_name?.[0] ||
    video?.creator?.username?.[0] ||
    video?.creator_username?.[0] ||
    '?';

  const creatorAvatar =
    video?.creator_avatar ||
    video?.creator?.profile_image ||
    video?.creator?.avatar ||
    video?.creator_image ||
    null;

  if (!sourceUrl) {
    return (
      <View style={[styles.fallback, { height: cardH }]}>
        <Text style={styles.fallbackText}>Vidéo indisponible</Text>
      </View>
    );
  }

  const thumbnailUrl = video?.thumbnail_url || video?.thumbnailUrl || '';

  const handleSeekFromPosition = (x) => {
    if (!player) return;
    const totalDuration = player.duration ?? progress.duration ?? 0;
    if (!totalDuration || !progressBarWidth) return;
    const ratio = Math.min(Math.max(x / progressBarWidth, 0), 1);
    setSeekRatio(ratio);
    const newTime = ratio * totalDuration;
    try {
      player.currentTime = newTime;
    } catch (_) {}
    setProgress((prev) => ({
      ...prev,
      currentTime: newTime,
      duration: totalDuration,
    }));
  };

  const handleSeekStart = (x) => {
    if (!player) return;
    setIsSeeking(true);
    wasPlayingBeforeSeekRef.current = isPlaying;
    try {
      player.pause();
    } catch (_) {}
    handleSeekFromPosition(x);
    setIsPlaying(false);
  };

  const handleSeekMove = (x) => {
    handleSeekFromPosition(x);
  };

  const handleSeekEnd = (x) => {
    handleSeekFromPosition(x);
    if (wasPlayingBeforeSeekRef.current && isActive && player) {
      try {
        player.play();
        setIsPlaying(true);
      } catch (_) {}
    }
    setIsSeeking(false);
  };

  return (
    <View style={[styles.card, { height: cardH }]}>
      {thumbnailUrl ? (
        <Image
          source={{ uri: thumbnailUrl }}
          style={[styles.video, styles.poster, { height: cardH }]}
          resizeMode="cover"
        />
      ) : null}
      <VideoView
        key={`v-${video?.id}`}
        style={[styles.video, { height: cardH }]}
        player={player}
        contentFit="cover"
        allowsFullscreen
        allowsPictureInPicture
        nativeControls={false}
      />
      {isActive && isSeeking && (
        <View pointerEvents="none" style={styles.previewBubble}>
          <VideoView
            style={styles.previewVideo}
            player={player}
            contentFit="cover"
            nativeControls={false}
          />
          <View style={styles.previewTimeBadge}>
            <Text style={styles.previewTimeText}>
              {formatTime(progress.currentTime)}
            </Text>
          </View>
        </View>
      )}
      {isActive && (
        <TouchableOpacity
          style={styles.playPauseOverlay}
          activeOpacity={0.7}
          onPress={handleScreenTap}
        >
          {!isPlaying && (
            <Ionicons
              name="play"
              size={42}
              color="#F9FAFB"
            />
          )}
        </TouchableOpacity>
      )}
      {isActive && (
      <View style={styles.rightActions}>
        <TouchableOpacity
          style={styles.creatorBubble}
          onPress={() => onProfileClick?.(video?.creator_id || video?.creator?.id)}
          activeOpacity={0.8}
        >
          {creatorAvatar ? (
            <Image
              source={{ uri: creatorAvatar }}
              style={styles.creatorAvatarImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.creatorInitial}>
              {String(creatorInitial).toUpperCase()}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLikePress}
          style={styles.actionButton}
          activeOpacity={0.8}
        >
          <Ionicons
            name={localIsLiked ? 'heart' : 'heart-outline'}
            size={26}
            color={localIsLiked ? '#ef4444' : '#F9FAFB'}
          />
          <Text style={styles.actionLabel}>{likeCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.8}
          onPress={() => onCommentsPress?.(video)}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={24} color="#F9FAFB" />
          <Text style={styles.actionLabel}>{commentsCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.8}
          onPress={() => onSharePress?.(video)}
        >
          <Ionicons name="share-social-outline" size={24} color="#F9FAFB" />
          <Text style={styles.actionLabel}>{sharesCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSavePress}
          style={styles.actionButton}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={24}
            color={isSaved ? '#FBBF24' : '#F9FAFB'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleToggleMute}
          style={styles.actionButton}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isMuted ? 'volume-mute-outline' : 'volume-high-outline'}
            size={24}
            color="#F9FAFB"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.8}
          onPress={() => onSupportPress?.(video)}
        >
          <MaterialCommunityIcons name="currency-usd" size={24} color="#FBBF24" />
          <Text style={[styles.actionLabel, styles.supportLabel]}>{supportLabel}</Text>
        </TouchableOpacity>
      </View>
      )}

      {isActive && (
      <View style={styles.bottomMeta}>
        {video?.title ? (
          <Text style={styles.title} numberOfLines={2}>
            {video.title}
          </Text>
        ) : null}
        {video?.description ? (
          <Text style={styles.description} numberOfLines={1}>
            {video.description}
          </Text>
        ) : null}
        <View style={styles.creatorRow}>
          {video?.creator_name || video?.creator?.username ? (
            <Text style={styles.creatorName} numberOfLines={1}>
              @{video.creator_name || video.creator?.username}
            </Text>
          ) : null}
          {onSubscribe && (
            <TouchableOpacity
              style={[styles.wonderBtn, isFollowing && styles.wonderBtnActive]}
              onPress={() => onSubscribe(video?.creator_id || video?.creator?.id)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isFollowing ? 'person-check' : 'person-add-outline'}
                size={18}
                color={isFollowing ? '#9CA3AF' : '#111827'}
              />
              <Text style={[styles.wonderLabel, isFollowing && styles.wonderLabelActive]}>
                {isFollowing ? 'Dans son Wonder' : '+ Wonder'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.progressRow}>
          <Text style={styles.timeLabel}>
            {formatTime(progress.currentTime)}
          </Text>
          <View
            style={styles.progressTrack}
            onLayout={(e) =>
              setProgressBarWidth(e.nativeEvent.layout.width || 0)
            }
            onStartShouldSetResponder={() => true}
            onResponderGrant={(e) =>
              handleSeekStart(e.nativeEvent.locationX)
            }
            onResponderMove={(e) =>
              handleSeekMove(e.nativeEvent.locationX)
            }
            onResponderRelease={(e) =>
              handleSeekEnd(e.nativeEvent.locationX)
            }
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress.duration > 0 ? (progress.currentTime / progress.duration) * 100 : 0}%`,
                },
              ]}
            />
            {progressBarWidth > 0 && (
              <View
                style={[
                  styles.progressThumb,
                  {
                    transform: [
                      {
                        translateX:
                          (progress.duration > 0
                            ? (progress.currentTime / progress.duration) *
                              progressBarWidth
                            : 0) - 6,
                      },
                    ],
                  },
                ]}
              />
            )}
          </View>
          <Text style={styles.timeLabel}>
            {formatTime(progress.duration)}
          </Text>
        </View>
      </View>
      )}
    </View>
  );
}

function formatTime(seconds) {
  if (!seconds || Number.isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#020617',
  },
  video: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: CARD_WIDTH,
  },
  previewBubble: {
    position: 'absolute',
    left: 16,
    bottom: 88,
    width: 72,
    height: 128,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: '#020617',
    zIndex: 40,
  },
  previewVideo: {
    width: '100%',
    height: '100%',
  },
  previewTimeBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  previewTimeText: {
    color: '#F9FAFB',
    fontSize: 10,
    fontWeight: '600',
  },
  playPauseOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: CARD_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  poster: {
    backgroundColor: '#020617',
  },
  rightActions: {
    position: 'absolute',
    right: 16,
    bottom: 96,
    alignItems: 'center',
    gap: 10,
  },
  creatorBubble: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.6)',
  },
  creatorAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 999,
  },
  wonderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 2,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.95)',
    flexShrink: 0,
  },
  wonderBtnActive: {
    backgroundColor: 'rgba(55,65,81,0.9)',
  },
  wonderLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  wonderLabelActive: {
    color: '#9CA3AF',
    fontWeight: '600',
  },
  creatorInitial: {
    color: '#F9FAFB',
    fontWeight: '700',
    fontSize: 16,
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 2,
  },
  actionLabel: {
    marginTop: 2,
    fontSize: 11,
    color: '#E5E7EB',
  },
  supportLabel: {
    fontSize: 10,
    color: '#FBBF24',
  },
  bottomMeta: {
    position: 'absolute',
    left: 12,
    right: 16,
    bottom: 32,
    paddingRight: 56,
  },
  title: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  description: {
    color: '#D1D5DB',
    fontSize: 13,
    marginBottom: 2,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  creatorName: {
    color: '#E5E7EB',
    fontSize: 13,
    flexShrink: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    top: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  timeLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    minWidth: 28,
  },
  fallback: {
    width: CARD_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#020617',
  },
  fallbackText: {
    color: '#9CA3AF',
  },
});

