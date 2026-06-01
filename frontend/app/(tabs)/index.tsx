import React, { useState, useCallback, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { Image as ExpoImage } from 'expo-image';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, TouchableWithoutFeedback, ActivityIndicator, Image, TextInput, Modal, KeyboardAvoidingView, Platform, Pressable, ScrollView, Animated, AppState, Alert, PanResponder, RefreshControl, FlatList, StatusBar, Keyboard, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ViewToken } from 'react-native';
import { FlashList as ShopifyFlashList, type FlashListRef } from '@shopify/flash-list';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import apiClient from '../../src/api/client';
import { router, useLocalSearchParams } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import ShareSheet, { type ShareVideoContext } from '../../src/components/ShareSheet';
import { getVideoSharePageUrl } from '../../src/config/shareUrls';
import ReportModal from '../../src/components/ReportModal';
import CommentReportModal from '../../src/components/CommentReportModal';
import { CreatorAvatar } from '../../src/components/CreatorAvatar';
import { toAbsoluteMediaUrl } from '../../src/utils/absoluteMediaUrl';
import { profileAvatarUri } from '../../src/utils/avatarFallback';
import { SmartThumbnail } from '../../src/components/SmartThumbnail';
import { Audio } from 'expo-av';
import offlineActionSyncService from '../../src/services/offlineActionSyncService';
import { FeedSkeleton } from '../../src/components/feed/FeedSkeleton';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { useDataSaver } from '../../src/dataSaver/DataSaverContext';
import { useFeedAutoplayFromSettings } from '../../src/hooks/useFeedAutoplayFromSettings';
import FeedPollCard, { type FeedPollPayload } from '../../src/components/feed/FeedPollCard';
import VideoReactionBar, { reactionEmojiForType } from '../../src/components/feed/VideoReactionBar';
import { addRecentlyViewedVideo } from '../../src/utils/recentlyViewedVideos';
import { devLog } from '../../src/utils/devLog';
import { FollowingStoriesBar } from '../../src/components/feed/FollowingStoriesBar';
import { capFeedVideosForMemory, trimIdSet, trimRecordKeys } from '../../src/utils/feedMemoryCap';
import {
  getFeedPageLimit,
  getFeedScrollTuning,
  getLiveHubHintRefreshMs,
  shouldBustFeedCacheOnFirstPage,
  shouldPreferLowQualityPlayback,
} from '../../src/config/mobileDataPolicy';
import feedVideoOfflineCache, {
  type FeedSnapshotVideo,
  type FeedTabKey,
} from '../../src/services/feedVideoOfflineCache';
import { isProgressiveVideoUrl, pickProgressivePlaybackUrl } from '../../src/utils/pickProgressivePlaybackUrl';
import NetInfo from '@react-native-community/netinfo';
import {
  applyFeedVideoStates,
  mergeFeedVideoInteraction,
  parseFeedVideoStatesPayload,
  pickFeedStateSyncIds,
} from '../../src/feed/feedVideoInteraction';
const { height } = Dimensions.get('window');

/** Temps sous l’aperçu de scrub (style PWA / TikTok). */
function formatScrubTimeline(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.min(seconds, 359999);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatCommentTimeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'A l\'instant';
  if (diffMin < 60) return `${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return diffD < 30 ? `${diffD}j` : `${Math.floor(diffD / 30)} mois`;
}

/** `Image` ne peut pas afficher un MP4/HLS : éviter poster « vide » si l’API renvoie l’URL média comme miniature. */
function isLikelyVideoFileUrl(uri: string): boolean {
  if (!uri) return false;
  const path = uri.split('?')[0].toLowerCase();
  if (/\.(mp4|m3u8|webm|mov|mkv|m4v|3gp|ogv)$/.test(path)) return true;
  return path.includes('.m3u8');
}

/** JPEG/PNG/WebP — ne pas les passer à `<video>` sur le web (MEDIA_ERR_SRC_NOT_SUPPORTED). */
function urlLooksLikeRasterImage(uri: string): boolean {
  if (!uri) return false;
  const path = uri.split('?')[0].toLowerCase();
  return /\.(jpe?g|png|gif|webp|bmp)$/.test(path);
}

/** Sur web : si l’API renvoie une miniature raster comme `video_url`, prendre une URL manifestement vidéo. */
function pickWebPlaybackUrl(v: Record<string, unknown>, preferLow: boolean, adaptiveFirstMobile: boolean): string {
  const base = preferLow
    ? (v.low_quality_playback_url || v.low_quality_url || v.video_url || v.hls_url || '')
    : adaptiveFirstMobile
      ? (v.hls_url || v.video_url || v.low_quality_playback_url || v.low_quality_url || '')
      : (v.video_url || v.hls_url || v.low_quality_playback_url || v.low_quality_url || '');
  let playUrl = typeof base === 'string' ? base.trim() : '';
  if (Platform.OS !== 'web' || !playUrl) return playUrl;
  if (urlLooksLikeRasterImage(playUrl)) {
    const candidates = [v.hls_url, v.video_url, v.low_quality_playback_url, v.low_quality_url].filter(
      (x): x is string => typeof x === 'string' && x.trim().length > 0
    );
    const fixed = candidates.find((u) => !urlLooksLikeRasterImage(u.trim()));
    playUrl = fixed ? fixed.trim() : '';
  }
  return playUrl;
}

/** Base hauteur tab bar, alignée sur `app/(tabs)/_layout.tsx` (`height: 65 + insets.bottom`). */
const TAB_BAR_LAYOUT_HEIGHT = 65;

/**
 * Sur Android (MEmu / RN), `onLayout` + snap peuvent sous-dimensionner la cellule d’1–4 px vs le viewport
 * réel → bande de la slide suivante en bas. On allonge légèrement la cellule **et** `snapToInterval` pareil.
 */

interface VideoUser {
  id: string;
  firstName: string;
  lastName: string;
  /** URL absolue ou vide → initiales affichées */
  avatar: string;
  username?: string;
  isFollowing: boolean;
  isSelf?: boolean;
}

/** Élément renvoyé par `GET /videos/:id/similar` (snake_case API + champs Prisma camelCase). */
type SimilarFeedItem = {
  id: string;
  title?: string;
  thumbnail_url?: string | null;
  thumbnailUrl?: string | null;
  poster_url?: string | null;
  video_url?: string | null;
  videoUrl?: string | null;
  likes?: number;
  views?: number;
  media_type?: string | null;
  creator_name?: string;
  creator_avatar?: string | null;
  creatorAvatar?: string | null;
};

interface Video {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isSaved: boolean;
  hashtags: string[];
  user: VideoUser;
  music: string;
  isSponsored?: boolean;
  /** Extrait replay live : lecture bouclée sur [trimStartSec, trimEndSec] (secondes média). */
  trimStartSec?: number | null;
  trimEndSec?: number | null;
  /** URL lecture privilégiant bas débit (mode économie). */
  dataSaverLowQuality?: boolean;
  /** Réactions vidéo (Like.type) — phase 23 */
  reactionCounts?: Record<string, number> | null;
  myReaction?: string | null;
  /** true si like/save utilisateur proviennent de l’API (refresh fiable). */
  viewerStateFromApi?: boolean;
  commentsDisabled?: boolean;
  remixCreditName?: string | null;
  remixKind?: string | null;
  /** `video` | `photo` — pour suggestions « similaires ». */
  mediaType?: 'video' | 'photo' | string;
  offlineCached?: boolean;
  progressiveCacheUrl?: string;
}

interface Comment {
  id: string;
  text: string;
  likes: number;
  isLiked: boolean;
  user: { id: string; firstName: string; lastName: string; avatar: string };
  createdAt: string;
  /** URL du vocal (API `audio_url`) */
  audioUrl?: string | null;
  /** Total réactions (CommentReaction) — API `_count.reactions` */
  reactionTotal?: number;
  /** Répartition par type — API `reaction_counts` */
  reactionCounts?: Record<string, number> | null;
  /** Réaction courante — API `my_reaction` */
  myReaction?: string | null;
  isPinned?: boolean;
  parentId?: string | null;
  isReply?: boolean;
}

type LiveHintStream = {
  id?: string;
  status?: string | null;
  ended_at?: string | null;
  replay_url?: string | null;
  viewers_count?: number | null;
  updated_at?: string | null;
};

function parseLiveHintDateMs(input: string | null | undefined): number | null {
  if (!input) return null;
  const ms = Date.parse(String(input));
  return Number.isFinite(ms) ? ms : null;
}

function isActiveLiveHintStream(stream: LiveHintStream | null | undefined): boolean {
  if (!stream?.id) return false;
  const status = String(stream.status || '').toLowerCase();
  if (status && status !== 'live') return false;
  if (stream.ended_at) return false;
  if (String(stream.replay_url || '').trim().length > 0) return false;
  const viewers = Number(stream.viewers_count) || 0;
  const updatedAtMs = parseLiveHintDateMs(stream.updated_at);
  if (viewers <= 0 && updatedAtMs != null && Date.now() - updatedAtMs > 3 * 60 * 1000) return false;
  return true;
}

async function appendCommentVoiceToFormData(formData: FormData, uri: string) {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    const mime = blob.type && blob.type !== 'application/octet-stream' ? blob.type : 'audio/webm';
    formData.append('file', new File([blob], 'voice.webm', { type: mime }));
    return;
  }
  formData.append('file', { uri, name: 'voice.m4a', type: 'audio/m4a' } as any);
}

// Fallback vide - les videos sont chargees depuis l'API
const FALLBACK_VIDEOS: Video[] = [];

/**
 * Nombre d’emplacements demandés au backend pour « Pour toi » (`/feed`).
 * Le JSON mélange vidéos + pubs + bannières : avec 10 slots on ne recevait souvent que 3–5 vidéos,
 * et `hasMore` se basait sur le nombre de vidéos → pagination coupée trop tôt.
 */
const TTFF_SENT_KEYS = new Set<string>();
const MAX_TTFF_SENT_KEYS = 4000;

export interface VideoItemProps {
  video: Video;
  isActive: boolean;
  /** Pour invalider le memo quand la session s’hydrate (web : feed avant `loadStoredAuth`). */
  isAuthenticated: boolean;
  /** Hauteur d’une page du feed (doit matcher snapToInterval / getItemLayout). */
  slideHeight?: number;
  onLike: () => void;
  onDoubleTapLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onSave: () => void;
  onFollow: () => void;
  onReport: () => void;
  onOpenProfile: () => void;
  onOpenSound: () => void;
  onOpenHashtag: (rawTag: string) => void;
  tapToPlayOnly?: boolean;
  reduceAnimations?: boolean;
  /** Sondage attaché (chargé pour la slide active) */
  pollState?: FeedPollPayload | null | 'loading' | undefined;
  pollVoting?: boolean;
  onPollVote: (optionIndex: number) => void | Promise<void>;
  onReactionPick: (type: string) => void | Promise<void>;
}

const VideoItemWithPlayer: React.FC<VideoItemProps> = ({
  video,
  isActive,
  slideHeight,
  onLike,
  onDoubleTapLike,
  onComment,
  onSave,
  onShare,
  onFollow,
  onReport,
  onOpenProfile,
  onOpenSound,
  onOpenHashtag,
  tapToPlayOnly = false,
  reduceAnimations = false,
  pollState,
  pollVoting = false,
  onPollVote,
  onReactionPick,
}) => {
  const insets = useSafeAreaInsets();
  const { addPlaybackEstimate } = useDataSaver();
  const [isMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [burstEmoji, setBurstEmoji] = useState<string | null>(null);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  /** Feuille « recherche visuelle » (similaires) — reste sur l’écran Accueil. */
  const [similarOpen, setSimilarOpen] = useState(false);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarItems, setSimilarItems] = useState<SimilarFeedItem[]>([]);
  const [similarSourceKind, setSimilarSourceKind] = useState<'video' | 'photo'>('video');
  const burstAnim = useRef(new Animated.Value(0)).current;
  const heartAnim = useRef(new Animated.Value(0)).current;
  const discAnim = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);
  const isActiveRef = useRef(isActive);
  const wasActiveRef = useRef(isActive);
  const [progressPct, setProgressPct] = useState(0);
  const isPausedRef = useRef(isPaused);
  const isScrubbingRef = useRef(false);
  const wasPlayingBeforeScrubRef = useRef(false);
  const progressBarHitRef = useRef<View>(null);
  const barWindowRectRef = useRef({ x: 0, width: 1 });
  const [showScrubPreview, setShowScrubPreview] = useState(false);
  const [scrubTimeSec, setScrubTimeSec] = useState(0);
  const trimStartRef = useRef<number | null>(null);
  const trimEndRef = useRef<number | null>(null);
  const prevVideoIdRef = useRef(video.id);
  const markViewedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackStartAtRef = useRef<number | null>(null);
  const firstFrameMeasuredRef = useRef(false);

  /**
   * Refs lues par `useVideoPlayer` (setup synchrone au changement de source) : les mettre à jour
   * avant tout hook suivant, sinon FlashList recycle avec `isActive` vrai mais ref encore `false`.
   *
   * PERF : on NE FAIT PLUS de `setState` pendant le render (interdit en React 19, cause un
   * double rendu sur chaque cellule recyclée). Le reset état/UI au changement de `video.id`
   * est déplacé dans un `useLayoutEffect` ci-dessous.
   */
  isActiveRef.current = isActive;
  isPausedRef.current = isPaused;

  useLayoutEffect(() => {
    if (prevVideoIdRef.current === video.id) return;
    prevVideoIdRef.current = video.id;
    setIsPaused(tapToPlayOnly);
    setProgressPct(0);
    setShowScrubPreview(false);
    setScrubTimeSec(0);
    isPausedRef.current = tapToPlayOnly;
  }, [video.id, tapToPlayOnly]);

  // Historique "Vue récente" : marquer comme vue seulement si la slide reste active un minimum (éviter les faux scrolls).
  useEffect(() => {
    if (markViewedTimeoutRef.current) {
      clearTimeout(markViewedTimeoutRef.current);
      markViewedTimeoutRef.current = null;
    }
    if (!isActive) return undefined;
    markViewedTimeoutRef.current = setTimeout(() => {
      if (!isActiveRef.current) return;
      // Même si l'utilisateur a pausé, on considère qu'elle a été vue (elle a été ouverte et visible).
      void addRecentlyViewedVideo(video.id);
    }, 1200);
    return () => {
      if (markViewedTimeoutRef.current) {
        clearTimeout(markViewedTimeoutRef.current);
        markViewedTimeoutRef.current = null;
      }
    };
  }, [isActive, video.id]);

  useEffect(() => {
    const ts = typeof video.trimStartSec === 'number' && video.trimStartSec >= 0 ? video.trimStartSec : null;
    const te =
      typeof video.trimEndSec === 'number' && ts != null && video.trimEndSec > ts ? video.trimEndSec : null;
    trimStartRef.current = ts;
    trimEndRef.current = te;
  }, [video.trimStartSec, video.trimEndSec, video.id]);

  useEffect(() => {
    if (!isActive) {
      setReactionsOpen(false);
      setSimilarOpen(false);
      setSimilarItems([]);
    }
  }, [isActive]);

  useEffect(() => {
    setSimilarOpen(false);
    setSimilarItems([]);
  }, [video.id]);

  useEffect(() => {
    if (!isPaused) setSimilarOpen(false);
  }, [isPaused]);

  const openSimilarSheet = useCallback(async () => {
    setSimilarOpen(true);
    setSimilarLoading(true);
    setSimilarItems([]);
    setSimilarSourceKind(video.mediaType === 'photo' ? 'photo' : 'video');
    try {
      const res = await apiClient.get(`/videos/${video.id}/similar`, { params: { limit: 24 } });
      const body = res.data as Record<string, unknown>;
      const inner = (body?.data ?? body) as { videos?: unknown[]; source_media_type?: string };
      const rawList = inner?.videos;
      const list = Array.isArray(rawList) ? rawList : [];
      setSimilarSourceKind(inner?.source_media_type === 'photo' ? 'photo' : 'video');
      setSimilarItems(list as SimilarFeedItem[]);
    } catch {
      setSimilarItems([]);
    } finally {
      setSimilarLoading(false);
    }
  }, [video.id, video.mediaType]);

  const safePlay = useCallback((target: { play: () => unknown }) => {
    try {
      const result = target.play();
      if (result && typeof (result as Promise<unknown>).catch === 'function') {
        (result as Promise<unknown>).catch(() => {
          // Web: le navigateur peut annuler un fetch média pendant un changement d'écran.
        });
      }
    } catch {
      // ignore
    }
  }, []);

  const sendFirstFrameMetric = useCallback(
    (ttffMs: number) => {
      const key = `${video.id}:${video.videoUrl}`;
      if (TTFF_SENT_KEYS.has(key)) return;
      if (TTFF_SENT_KEYS.size >= MAX_TTFF_SENT_KEYS) {
        // Long scroll sessions: avoid unbounded key growth.
        TTFF_SENT_KEYS.clear();
      }
      // Envoyer systématiquement les cas lents, + un échantillon des cas rapides.
      if (ttffMs < 1200 && Math.random() > 0.15) return;
      TTFF_SENT_KEYS.add(key);
      void apiClient
        .post('/analytics', {
          entityType: 'video_playback',
          entityId: video.id,
          metricType: 'first_frame_ms',
          metricValue: ttffMs,
          metadata: {
            source: 'mobile_feed',
            url_kind: /\.m3u8($|\?)/i.test(String(video.videoUrl || '')) ? 'hls' : 'file',
            data_saver_low_quality: Boolean(video.dataSaverLowQuality),
            media_type: video.mediaType || 'video',
            platform: Platform.OS,
          },
        })
        .catch(() => {});
    },
    [video.id, video.videoUrl, video.dataSaverLowQuality, video.mediaType]
  );

  /** Mode économie / réseau lent : aligner la pause sans attendre un changement de vidéo. */
  useEffect(() => {
    setIsPaused(tapToPlayOnly);
  }, [tapToPlayOnly]);

  const player = useVideoPlayer(video.videoUrl, (p) => {
    p.loop = true;
    p.muted = !isActiveRef.current;
    // PERF : 1Hz au lieu de 4Hz → 75% de re-renders en moins sur la cellule active.
    // La barre de progression reste fluide à l'œil ; le scrub reste réactif (pan responder).
    p.timeUpdateEventInterval = 1;
    if (isActiveRef.current) safePlay(p);
  });

  /** Web / certains runtimes : premier `play()` peut échouer avant `readyToPlay`. */
  useEventListener(player, 'statusChange', ({ status }) => {
    if (status !== 'readyToPlay') return;
    if (!isActiveRef.current || isPausedRef.current) return;
    if (!firstFrameMeasuredRef.current && playbackStartAtRef.current != null) {
      firstFrameMeasuredRef.current = true;
      const ttffMs = Math.max(0, Math.round(Date.now() - playbackStartAtRef.current));
      sendFirstFrameMetric(ttffMs);
    }
    void Promise.resolve().then(() => safePlay(player));
  });

  useEffect(() => {
    firstFrameMeasuredRef.current = false;
    playbackStartAtRef.current = null;
  }, [video.id, video.videoUrl]);

  useEffect(() => {
    if (!isActive || isPaused || firstFrameMeasuredRef.current) return;
    if (playbackStartAtRef.current == null) playbackStartAtRef.current = Date.now();
  }, [isActive, isPaused, video.id, video.videoUrl]);

  /** Recyclage FlashList / nouveau média : sauter au début du clip si extrait live. */
  useEffect(() => {
    const ts = typeof video.trimStartSec === 'number' && video.trimStartSec >= 0 ? video.trimStartSec : null;
    if (ts == null) return undefined;
    const tid = setTimeout(() => {
      try {
        player.currentTime = ts;
      } catch {
        /* player pas prêt */
      }
    }, 150);
    return () => clearTimeout(tid);
  }, [video.id, player, video.trimStartSec]);

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (!isActiveRef.current || isScrubbingRef.current) return;
    const ts = trimStartRef.current;
    const te = trimEndRef.current;
    if (te != null && ts != null && currentTime >= te - 0.08) {
      try {
        player.currentTime = ts;
      } catch {
        /* ignore */
      }
    }
    try {
      const d = player.duration;
      if (d > 0 && Number.isFinite(d)) {
        let pct = 0;
        if (ts != null && te != null && te > ts) {
          const span = te - ts;
          const rel = Math.min(span, Math.max(0, currentTime - ts));
          pct = (rel / span) * 100;
        } else {
          pct = (currentTime / d) * 100;
        }
        const next = Math.min(100, Math.max(0, Math.round(pct)));
        // PERF : ne déclencher un re-render que si le % entier change réellement.
        setProgressPct((prev) => (prev === next ? prev : next));
      }
    } catch {
      /* ignore */
    }
  });

  const seekFromPageX = useCallback(
    (pageX: number) => {
      if (!player) return;
      const { x: barX, width: w } = barWindowRectRef.current;
      if (w < 8) return;
      let d = 0;
      try {
        d = player.duration;
      } catch {
        return;
      }
      if (!Number.isFinite(d) || d <= 0) return;
      const ratio = Math.max(0, Math.min(1, (pageX - barX) / w));
      const ts = trimStartRef.current;
      const te = trimEndRef.current;
      let t = ratio * d;
      if (ts != null && te != null && te > ts) {
        t = ts + ratio * (te - ts);
      }
      try {
        player.currentTime = t;
      } catch {
        /* ignore */
      }
      if (ts != null && te != null && te > ts) {
        setProgressPct(ratio * 100);
        if (isScrubbingRef.current) setScrubTimeSec(t - ts);
      } else {
        setProgressPct(ratio * 100);
        if (isScrubbingRef.current) setScrubTimeSec(t);
      }
    },
    [player]
  );

  const measureProgressBar = useCallback(() => {
    progressBarHitRef.current?.measureInWindow((x, _y, width) => {
      barWindowRectRef.current = { x, width: Math.max(1, width) };
    });
  }, []);

  const endScrubbing = useCallback(() => {
    isScrubbingRef.current = false;
    setShowScrubPreview(false);
    if (!isActiveRef.current || !player) return;
    try {
      if (wasPlayingBeforeScrubRef.current && !isPausedRef.current) safePlay(player);
    } catch {
      /* ignore */
    }
  }, [player, safePlay]);

  const progressPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => Boolean(isActiveRef.current),
        onMoveShouldSetPanResponder: (_evt, g) =>
          Boolean(isActiveRef.current) && (Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2),
        onPanResponderGrant: (evt) => {
          if (!isActiveRef.current || !player) return;
          isScrubbingRef.current = true;
          setShowScrubPreview(true);
          try {
            wasPlayingBeforeScrubRef.current = player.playing;
          } catch {
            wasPlayingBeforeScrubRef.current = false;
          }
          try {
            player.pause();
          } catch {
            /* ignore */
          }
          const pageX = evt.nativeEvent.pageX;
          progressBarHitRef.current?.measureInWindow((x, _y, width) => {
            barWindowRectRef.current = { x, width: Math.max(1, width) };
            seekFromPageX(pageX);
          });
        },
        onPanResponderMove: (evt) => {
          seekFromPageX(evt.nativeEvent.pageX);
        },
        onPanResponderRelease: (evt) => {
          seekFromPageX(evt.nativeEvent.pageX);
          endScrubbing();
        },
        onPanResponderTerminate: () => {
          endScrubbing();
        },
      }),
    [player, seekFromPageX, endScrubbing]
  );

  // Nouvelle slide active : lecture auto sauf mode économie (tap pour lire)
  useEffect(() => {
    if (isActive && !wasActiveRef.current) {
      setIsPaused(tapToPlayOnly);
    }
    wasActiveRef.current = isActive;
  }, [isActive, tapToPlayOnly]);

  // Pause + sourdine hors slide active (double tick : certains runtimes laissent passer l’audio une frame)
  useLayoutEffect(() => {
    if (!player || isActive) return;
    try {
      player.pause();
      player.muted = true;
    } catch {}
    const id = requestAnimationFrame(() => {
      try {
        player.pause();
        player.muted = true;
      } catch {}
    });
    return () => cancelAnimationFrame(id);
  }, [isActive, player]);

  // Lecture / pause + mute utilisateur sur la carte active
  useEffect(() => {
    if (!player || !isActive) return;
    try {
      player.muted = isMuted;
      if (!isPaused) {
        void Promise.resolve().then(() => safePlay(player));
      } else {
        player.pause();
      }
    } catch (e) {
      devLog('Player play/pause error:', e);
    }
  }, [isActive, isPaused, isMuted, player, safePlay, video.id]);

  /** Estimation consommation data (Phase 14 — Afrique). */
  useEffect(() => {
    if (!isActive || isPaused) return;
    const low = Boolean(video.dataSaverLowQuality);
    const id = setInterval(() => addPlaybackEstimate(1, low), 1000);
    return () => clearInterval(id);
  }, [isActive, isPaused, video.id, video.dataSaverLowQuality, addPlaybackEstimate]);

  // CRITICAL: Cleanup on unmount — libérer le décodeur natif (sinon RAM monte jusqu'au kill Android).
  useEffect(() => {
    return () => {
      try {
        player?.pause();
        player.muted = true;
        const replace = (player as { replace?: (src: string | null) => void })?.replace;
        if (typeof replace === 'function') {
          replace(null);
        }
      } catch {
        /* player déjà détruit */
      }
    };
  }, [player]);

  // Rotating disc animation (désactivé si « Réduire les animations » — économie batterie)
  useEffect(() => {
    if (reduceAnimations || !isActive || isPaused) {
      discAnim.setValue(0);
      return;
    }
    const rotate = Animated.loop(
      Animated.timing(discAnim, { toValue: 1, duration: 4000, useNativeDriver: true })
    );
    rotate.start();
    return () => rotate.stop();
  }, [isActive, isPaused, reduceAnimations, discAnim]);

  const discRotation = discAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const creatorHandle = (() => {
    const u = (video.user.username || '').trim().replace(/^@+/, '');
    if (u) return `@${u}`;
    const slug = `${(video.user.firstName || '').trim()}${(video.user.lastName || '').trim()}`.replace(/\s+/g, '').slice(0, 14).toLowerCase();
    return slug ? `@${slug}` : '@créateur';
  })();

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      onDoubleTapLike();
      if (reduceAnimations) {
        return;
      }
      setShowHeart(true);
      Animated.sequence([
        Animated.spring(heartAnim, { toValue: 1, useNativeDriver: true, friction: 3 }),
        Animated.timing(heartAnim, { toValue: 0, duration: 400, delay: 200, useNativeDriver: true }),
      ]).start(() => setShowHeart(false));
    } else {
      // Single tap - toggle pause (only for active video)
      if (isActive) {
        setIsPaused(prev => !prev);
      }
    }
    lastTap.current = now;
  };

  const itemHeight = slideHeight ?? Math.ceil(Math.max(200, height - TAB_BAR_LAYOUT_HEIGHT - insets.bottom));

  const engagementTotal = useMemo(() => {
    if (video.reactionCounts && Object.keys(video.reactionCounts).length > 0) {
      return Object.values(video.reactionCounts).reduce((a, b) => a + (Number(b) || 0), 0);
    }
    return video.likes;
  }, [video.reactionCounts, video.likes]);

  const handleReactionWithBurst = useCallback(
    async (type: string) => {
      await onReactionPick(type);
      if (reduceAnimations) return;
      const em = reactionEmojiForType(type);
      setBurstEmoji(em);
      burstAnim.setValue(0);
      Animated.sequence([
        Animated.spring(burstAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
        Animated.timing(burstAnim, { toValue: 0, duration: 320, delay: 100, useNativeDriver: true }),
      ]).start(() => setBurstEmoji(null));
    },
    [burstAnim, onReactionPick, reduceAnimations]
  );

  const heartFilled = video.myReaction === 'like' || video.isLiked;

  const readyPoll: FeedPollPayload | null =
    pollState && typeof pollState === 'object' && !pollState.expired && Array.isArray(pollState.options) && pollState.options.length > 0
      ? pollState
      : null;

  return (
    <View style={[styles.videoContainer, { height: itemHeight }]}>
      {/* Native VideoView capte les touches : pas de propagation vers Touchable*. Couche Pressable au-dessus (cf. web OK). */}
      <View style={styles.videoWrapper}>
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          <VideoView
            style={styles.video}
            player={player}
            contentFit="cover"
            nativeControls={false}
            {...(Platform.OS === 'android' ? ({ surfaceType: 'textureView' } as const) : {})}
          />
        </View>
        <Pressable
          style={styles.videoTapTarget}
          onPress={handleTap}
          accessibilityRole="button"
          accessibilityLabel={isPaused ? 'Lire la vidéo' : 'Mettre en pause la vidéo'}
        />

        {/* Pause icon — pointerEvents none pour que le tap traverse jusqu’au Pressable */}
        {isPaused && isActive && (
          <View style={styles.pauseOverlay} pointerEvents="none">
            <View style={styles.pauseCircle}>
              <Ionicons name="play" size={40} color="#FFF" />
            </View>
          </View>
          )}

        {isPaused && isActive && !similarOpen ? (
          <TouchableOpacity
            testID="similar-find-pill"
            style={styles.similarPill}
            onPress={() => void openSimilarSheet()}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel="Trouver des contenus similaires"
          >
            <View style={styles.similarPillIconBox}>
              <Ionicons name="search" size={14} color="#FFF" />
            </View>
            <Text style={styles.similarPillText}>Trouver des similaires</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.95)" />
          </TouchableOpacity>
        ) : null}

        {/* Double-tap heart animation */}
        {showHeart && (
          <Animated.View
            pointerEvents="none"
            style={[styles.heartAnimation, {
              transform: [{ scale: heartAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1.3] }) }],
              opacity: heartAnim,
            }]}
          >
            <Ionicons name="heart" size={100} color={Colors.like} />
          </Animated.View>
        )}
      </View>

      {/* Gradient overlays */}
      <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.6)', 'transparent']} style={styles.topGradient} />
      <LinearGradient pointerEvents="none" colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.bottomGradient} />

      {readyPoll ? (
        <View style={[styles.pollOverlay, { bottom: Math.max(268, insets.bottom + 278) }]} pointerEvents="box-none">
          <FeedPollCard poll={readyPoll} voting={pollVoting} onVote={onPollVote} />
        </View>
      ) : null}

      {burstEmoji ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.reactionBurst,
            {
              opacity: burstAnim,
              transform: [
                {
                  scale: burstAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.4, 1.15],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.reactionBurstEmoji}>{burstEmoji}</Text>
        </Animated.View>
      ) : null}

      {/* Sponsored badge */}
      {video.isSponsored && (
        <View style={styles.sponsoredBadge}>
          <Ionicons name="megaphone" size={12} color="#FFF" />
          <Text style={styles.sponsoredText}>Sponsorise</Text>
        </View>
      )}

      {/* Right side actions */}
      <View style={[styles.actions, { bottom: Math.max(40, insets.bottom + 10) }]} pointerEvents="box-none">
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <CreatorAvatar
            testID="creator-avatar"
            uri={video.user.avatar}
            username={video.user.username}
            firstName={video.user.firstName}
            lastName={video.user.lastName}
            size={48}
            onPress={video.user.id ? onOpenProfile : undefined}
          />
          {!video.user.isSelf && !video.user.isFollowing && (
            <TouchableOpacity
              style={styles.followBadge}
              onPress={onFollow}
              accessibilityLabel="Wonder ce créateur"
              accessibilityRole="button"
            >
              <Ionicons name="add" size={12} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Like */}
        <TouchableOpacity style={styles.actionButton} onPress={onLike}>
          <Ionicons name={heartFilled ? 'heart' : 'heart-outline'} size={32} color={heartFilled ? Colors.like : '#FFF'} />
          <Text style={styles.actionText}>{formatNumber(engagementTotal)}</Text>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity testID="comment-button" style={styles.actionButton} onPress={onComment}>
          <Ionicons name="chatbubble-ellipses" size={28} color="#FFF" />
          <Text style={styles.actionText}>{formatNumber(video.comments)}</Text>
        </TouchableOpacity>

        {/* Bookmark */}
        <TouchableOpacity style={styles.actionButton} onPress={onSave}>
          <Ionicons name={video.isSaved ? 'bookmark' : 'bookmark-outline'} size={28} color={video.isSaved ? Colors.accent : '#FFF'} />
          <Text style={styles.actionText}>{video.isSaved ? 'Sauve' : 'Sauver'}</Text>
        </TouchableOpacity>

        {/* Tip / Soutenir */}
        <TouchableOpacity style={styles.actionButton} onPress={() => {
          router.push({ pathname: '/tip', params: { creatorId: video.user.id, creatorName: video.user.firstName, videoId: video.id } } as any);
        }}>
          <Ionicons name="gift" size={28} color="#FF6B00" />
          <Text style={styles.actionText}>Soutenir</Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity testID="share-button" style={styles.actionButton} onPress={onShare}>
          <Ionicons name="arrow-redo" size={28} color="#FFF" />
          <Text style={styles.actionText}>{formatNumber(video.shares)}</Text>
        </TouchableOpacity>

        {/* More / Report */}
        <TouchableOpacity style={styles.actionButton} onPress={onReport}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#FFF" />
        </TouchableOpacity>

        {/* Disque son — même destination que la ligne « Son » sous la vidéo */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onOpenSound}
          accessibilityRole="button"
          accessibilityLabel="Voir le son — page des vidéos utilisant ce titre audio"
        >
          <Animated.View style={[styles.musicDisc, { transform: [{ rotate: discRotation }] }]}>
            <View style={styles.musicDiscImage}>
              <CreatorAvatar
                uri={video.user.avatar}
                username={video.user.username}
                firstName={video.user.firstName}
                lastName={video.user.lastName}
                size={28}
                bordered={false}
              />
            </View>
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Bottom info */}
      <View style={styles.bottomInfo}>
        <TouchableOpacity
          style={styles.brandUserRow}
          onPress={video.user.id ? onOpenProfile : undefined}
          activeOpacity={0.85}
          disabled={!video.user.id}
        >
          <Image
            source={require('../../assets/images/pwa-icon-192.png')}
            style={styles.brandUserLogo}
            resizeMode="cover"
          />
          <Text style={styles.brandUserHandle} numberOfLines={1}>
            {creatorHandle}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.reactionsTriggerBtn}
          onPress={() => setReactionsOpen(true)}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="Réagir à la vidéo"
        >
          <Ionicons name="happy-outline" size={17} color="rgba(255,255,255,0.95)" />
          <Text style={styles.reactionsTriggerText}>Réagir</Text>
          {video.myReaction && video.myReaction !== 'like' ? <View style={styles.reactionsTriggerDot} /> : null}
        </TouchableOpacity>
        <View style={styles.userRow}>
          {video.user.isSelf ? null : video.user.isFollowing ? (
            <TouchableOpacity
              style={styles.followingTag}
              onPress={onFollow}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Ne plus être dans le Wonder de ce créateur"
            >
              <Text style={styles.followingTagText}>Dans ton Wonder</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.followBtn} onPress={onFollow}>
              <Text style={styles.followBtnText}>Wonder</Text>
            </TouchableOpacity>
          )}
        </View>
        {video.remixCreditName ? (
          <Text style={styles.remixCredit} numberOfLines={1}>
            {video.remixKind === 'stitch' ? 'Stitch' : video.remixKind === 'duet' ? 'Duet' : 'Remix'} · @{video.remixCreditName}
          </Text>
        ) : null}
        <Text style={styles.description} numberOfLines={2}>{video.description}</Text>
        <View style={styles.hashtagsRow}>
          {video.hashtags.map((tag, i) => (
            <TouchableOpacity
              key={`${String(tag)}-${i}`}
              onPress={() => onOpenHashtag(String(tag))}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Rechercher le hashtag ${String(tag)}`}
            >
              <Text style={styles.hashtag}>#{tag} </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.viewsRow} accessibilityLabel={`${formatNumber(video.views)} vues`}>
          <Ionicons name="eye-outline" size={15} color="rgba(255,255,255,0.92)" />
          <Text style={styles.viewsText}>
            {formatNumber(video.views)} vues
          </Text>
        </View>
        {/* Son — cliquable (liste des vidéos partageant ce titre audio) */}
        <TouchableOpacity
          style={styles.musicRow}
          onPress={onOpenSound}
          activeOpacity={0.85}
          hitSlop={{ top: 10, bottom: 10, left: 4, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Voir le son : ${video.music}`}
        >
          <Ionicons name="musical-notes" size={14} color="#FFF" />
          <Text style={styles.musicText} numberOfLines={1}>{video.music}</Text>
        </TouchableOpacity>
      </View>

      {/* Prévisualisation : même lecteur que la vidéo (pas de miniature séparée / pas de spinner) */}
      {showScrubPreview && player ? (
        <View style={styles.scrubPreviewContainer} pointerEvents="none">
          <View style={styles.scrubPreviewFrame}>
            <VideoView
              style={styles.scrubPreviewVideo}
              player={player}
              contentFit="cover"
              nativeControls={false}
              pointerEvents="none"
              {...(Platform.OS === 'android' ? ({ surfaceType: 'textureView' } as const) : {})}
            />
          </View>
          <Text style={styles.scrubPreviewTimeText}>{formatScrubTimeline(scrubTimeSec)}</Text>
        </View>
      ) : null}

      {/* Barre de progression : glisser pour scrub + image vidéo (currentTime mis à jour en continu, lecture en pause pendant le geste) */}
      <View
        ref={progressBarHitRef}
        style={styles.videoProgressHit}
        onLayout={() => {
          requestAnimationFrame(measureProgressBar);
        }}
        accessibilityRole="adjustable"
        accessibilityLabel="Progression de la vidéo"
        accessibilityHint="Maintenez et faites glisser pour avancer ou reculer dans la vidéo"
        {...progressPanResponder.panHandlers}
      >
        <View style={styles.videoProgressTrackWrap} pointerEvents="none">
          <View style={styles.videoProgressTrack}>
            <View style={[styles.videoProgressFill, { width: `${progressPct}%` }]} />
            <View
              style={[
                styles.videoProgressThumb,
                showScrubPreview && styles.videoProgressThumbScrubbing,
                {
                  left: `${Math.min(100, Math.max(0, progressPct))}%`,
                  marginLeft: showScrubPreview ? -8 : -6,
                },
              ]}
            />
          </View>
        </View>
      </View>

      <Modal
        visible={similarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSimilarOpen(false)}
      >
        <View style={styles.similarModalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSimilarOpen(false)} accessibilityLabel="Fermer" />
          <View style={styles.similarModalColumn}>
            <View style={styles.similarModalPreviewArea} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.similarModalClose}
                onPress={() => setSimilarOpen(false)}
                hitSlop={12}
                accessibilityLabel="Fermer"
              >
                <Ionicons name="close" size={28} color="#FFF" />
              </TouchableOpacity>
              <View style={styles.similarPreviewFrame}>
                <View style={styles.similarPreviewCorners} pointerEvents="none" />
                <SmartThumbnail
                  posterUrl={toAbsoluteMediaUrl(video.thumbnailUrl || '')}
                  uri={toAbsoluteMediaUrl(video.thumbnailUrl || video.videoUrl || '')}
                  videoUrl={toAbsoluteMediaUrl(video.videoUrl || '')}
                  style={styles.similarPreviewImage}
                  tileSize={120}
                  tileHeight={180}
                />
              </View>
            </View>
            <View
              style={[
                styles.similarSheet,
                {
                  height: Math.round(Dimensions.get('window').height * 0.56),
                  paddingBottom: Math.max(insets.bottom, 16) + 8,
                },
              ]}
            >
              <View style={styles.similarSheetGrab} />
              <Text style={styles.similarSheetTitle}>Recherche visuelle</Text>
              <Text style={styles.similarSheetSubtitle}>
                {similarSourceKind === 'photo'
                  ? 'Photos similaires à ce contenu'
                  : 'Vidéos similaires à ce contenu'}
              </Text>
              {similarLoading ? (
                <ActivityIndicator style={{ marginTop: 24 }} color={Colors.primary} />
              ) : similarItems.length === 0 ? (
                <Text style={styles.similarEmpty}>Aucun résultat.</Text>
              ) : (
                <ScrollView
                  style={styles.similarGridScroll}
                  contentContainerStyle={styles.similarGridScrollContent}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {(() => {
                    const winW = Dimensions.get('window').width;
                    const pad = 16;
                    const gap = 8;
                    /** Largeur utile de la feuille (plafonnée en desktop pour éviter des cartes géantes). */
                    const sheetW = Math.min(winW - pad * 2, 560);
                    /** Plus de colonnes sur écran large pour un vrai look "résultats visuels". */
                    const cols = winW >= 900 ? 4 : winW >= 600 ? 3 : 2;
                    const colW = Math.floor((sheetW - gap * (cols - 1)) / cols);
                    const imgH = Math.round(colW * 1.25);
                    return similarItems.map((item) => {
                      const absThumb = toAbsoluteMediaUrl(
                        String(item.thumbnail_url ?? item.thumbnailUrl ?? item.poster_url ?? '').trim()
                      );
                      const absVideo = toAbsoluteMediaUrl(
                        String(item.video_url ?? item.videoUrl ?? '').trim()
                      );
                      const uriProp = absThumb || absVideo;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.similarCard, { width: colW }]}
                          activeOpacity={0.9}
                          onPress={() => {
                            setSimilarOpen(false);
                            router.push({ pathname: '/watch/[id]', params: { id: item.id } } as never);
                          }}
                        >
                          <SmartThumbnail
                            posterUrl={absThumb}
                            uri={uriProp}
                            videoUrl={absVideo}
                            style={{ width: colW, height: imgH, borderRadius: 8, backgroundColor: '#E8E8E8' }}
                            tileSize={colW}
                            tileHeight={imgH}
                          />
                          {(item.media_type || '').toLowerCase() !== 'photo' ? (
                            <View style={styles.similarCardPlayBadge} pointerEvents="none">
                              <Ionicons name="play" size={10} color="#FFF" />
                            </View>
                          ) : null}
                          <Text style={styles.similarCardTitle} numberOfLines={2}>
                            {item.title || 'Sans titre'}
                          </Text>
                          <View style={styles.similarCardMeta}>
                            <CreatorAvatar
                              uri={toAbsoluteMediaUrl(
                                String(item.creator_avatar ?? item.creatorAvatar ?? '').trim()
                              )}
                              username={item.creator_name || ''}
                              firstName={String(item.creator_name || '').split(' ')[0]}
                              lastName={String(item.creator_name || '').split(' ').slice(1).join(' ')}
                              size={22}
                            />
                            <Text style={styles.similarCardCreator} numberOfLines={1}>
                              {item.creator_name || '—'}
                            </Text>
                            <View style={{ flex: 1 }} />
                            <Ionicons name="heart-outline" size={12} color="#666" />
                            <Text style={styles.similarCardLikes}>{formatNumber(Number(item.likes ?? 0))}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    });
                  })()}
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={reactionsOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setReactionsOpen(false)}
      >
        <View style={styles.reactionSheetRoot}>
          <TouchableWithoutFeedback onPress={() => setReactionsOpen(false)}>
            <View style={styles.reactionSheetDim} />
          </TouchableWithoutFeedback>
          <View style={[styles.reactionSheetPanel, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
            <View style={styles.reactionSheetHeader}>
              <Text style={styles.reactionSheetTitle}>Choisir une réaction</Text>
              <TouchableOpacity
                onPress={() => setReactionsOpen(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Fermer"
              >
                <Ionicons name="close" size={26} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <VideoReactionBar
              reactionCounts={video.reactionCounts}
              myReaction={video.myReaction ?? null}
              onPick={async (type) => {
                await handleReactionWithBurst(type);
                setReactionsOpen(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const VideoItemImpl: React.FC<VideoItemProps> = (props) => {
  const webPlayUrl = String(props.video.videoUrl || '').trim();
  const webRaster =
    Platform.OS === 'web' &&
    (props.video.mediaType === 'photo' ||
      urlLooksLikeRasterImage(webPlayUrl) ||
      !webPlayUrl);
  if (webRaster) {
    return <VideoItemWebRaster {...props} />;
  }
  return <VideoItemWithPlayer {...props} />;
};

/**
 * PERF : `VideoItem` est mémorisé. Avec un FlashList qui recycle, ça évite
 * les re-renders inutiles quand le parent (`HomeScreen`) re-render à cause
 * d'un autre état (réseau, polling, etc.). Le comparateur ne re-render que
 * sur les props qui modifient réellement le visuel.
 */
const VideoItem = React.memo(VideoItemImpl, (prev, next) => {
  if (prev.video.id !== next.video.id) return false;
  if (prev.isAuthenticated !== next.isAuthenticated) return false;
  if (prev.video.videoUrl !== next.video.videoUrl) return false;
  if (prev.video.mediaType !== next.video.mediaType) return false;
  if (prev.isActive !== next.isActive) return false;
  if (prev.slideHeight !== next.slideHeight) return false;
  if (prev.tapToPlayOnly !== next.tapToPlayOnly) return false;
  if (prev.reduceAnimations !== next.reduceAnimations) return false;
  if (prev.pollVoting !== next.pollVoting) return false;
  // Compteurs / état d'engagement de la vidéo (objet entier comparé par ref).
  if (prev.video.likes !== next.video.likes) return false;
  if (prev.video.comments !== next.video.comments) return false;
  if (prev.video.shares !== next.video.shares) return false;
  if (prev.video.isLiked !== next.video.isLiked) return false;
  if (prev.video.myReaction !== next.video.myReaction) return false;
  if (prev.video.views !== next.video.views) return false;
  if (prev.video.isSaved !== next.video.isSaved) return false;
  if (prev.video.user?.isFollowing !== next.video.user?.isFollowing) return false;
  if (prev.pollState !== next.pollState) return false;
  return true;
});

// Comments Modal
const CommentsModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  videoId: string;
  commentsCount: number;
  /** Créateur de la vidéo (épinglage commentaires) */
  videoCreatorId?: string | null;
  /** Désactivés côté créateur (API `comments_disabled`) */
  commentsDisabled?: boolean;
}> = ({ visible, onClose, videoId, commentsCount, videoCreatorId = null, commentsDisabled = false }) => {
  const insets = useSafeAreaInsets();
  const dragClosePan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 56) onClose();
      },
    })
  ).current;
  const { isAuthenticated, user } = useAuthStore();
  const promptLoginForAction = useCallback((action: string) => {
    const normalized = String(action || '').toLowerCase();
    const message =
      normalized === 'liker' || normalized === 'commenter' || normalized === 'réagir'
        ? "Connectez-vous d'abord pour liker ou commenter."
        : `Connectez-vous d'abord pour ${action}.`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const goLogin = window.confirm(`${message}\n\nVoulez-vous vous connecter maintenant ?`);
      if (goLogin) {
        router.push({ pathname: '/(auth)/login', params: { returnTo: '/(tabs)' } });
      }
      return;
    }
    Alert.alert('Connexion requise', message, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se connecter',
        onPress: () => router.push({ pathname: '/(auth)/login', params: { returnTo: '/(tabs)' } }),
      },
    ]);
  }, []);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalComments, setTotalComments] = useState(commentsCount);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  /** Fichier local après arrêt d’enregistrement — envoi seulement après validation (bouton envoyer). */
  const [voicePreviewUri, setVoicePreviewUri] = useState<string | null>(null);
  const [voicePreviewSeconds, setVoicePreviewSeconds] = useState(0);
  const [voicePreviewPlaying, setVoicePreviewPlaying] = useState(false);
  const [playingCommentId, setPlayingCommentId] = useState<string | null>(null);
  const [sendingVoice, setSendingVoice] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; label: string } | null>(null);
  /** Menu ⋯ : options selon auteur du commentaire */
  const [commentMenuFor, setCommentMenuFor] = useState<Comment | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [reportCommentId, setReportCommentId] = useState<string | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const commentsScrollRef = useRef<ScrollView | null>(null);
  const recordingRef = useRef<Awaited<ReturnType<typeof Audio.Recording.createAsync>>['recording'] | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const voicePreviewSoundRef = useRef<Audio.Sound | null>(null);
  /** Web : MediaRecorder (expo-av sur le web peut produire un fichier vide / silencieux). */
  const webRecorderRef = useRef<MediaRecorder | null>(null);
  const webStreamRef = useRef<MediaStream | null>(null);
  const webChunksRef = useRef<BlobPart[]>([]);
  /** URL blob: à révoquer après usage pour éviter fuites et doublons. */
  const voicePreviewBlobUrlRef = useRef<string | null>(null);
  /** Web : lecture audio navigateur (expo-av + blob / cross-origin est souvent cassé). */
  const webVoiceAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopWebVoicePlayback = () => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const el = webVoiceAudioRef.current;
    if (el) {
      try {
        el.pause();
        el.removeAttribute('src');
        el.load();
      } catch { /* ignore */ }
      webVoiceAudioRef.current = null;
    }
  };

  const revokeVoicePreviewBlobUrl = () => {
    const u = voicePreviewBlobUrlRef.current;
    if (u && u.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(u);
      } catch { /* ignore */ }
    }
    voicePreviewBlobUrlRef.current = null;
  };

  /** Arrêt forcé (fermeture modale) : couper le micro, pas besoin de blob final. */
  const abortWebVoiceRecording = () => {
    try {
      webStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch { /* ignore */ }
    webRecorderRef.current = null;
    webStreamRef.current = null;
    webChunksRef.current = [];
  };

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/videos/${videoId}/comments`);
      const data = response.data?.data || response.data;
      const backendComments = data?.comments || [];
      if (backendComments.length > 0) {
        const mapOne = (c: any, isReply: boolean, parentId: string | null): Comment => {
          const nameParts = (c.user_name || c.user?.full_name || '').split(' ');
          const rawCounts =
            c.reaction_counts && typeof c.reaction_counts === 'object' && !Array.isArray(c.reaction_counts)
              ? (c.reaction_counts as Record<string, number>)
              : null;
          const fromCounts = rawCounts
            ? Object.values(rawCounts).reduce(
                (s, n) => s + (typeof n === 'number' && !Number.isNaN(n) ? n : 0),
                0
              )
            : 0;
          const rcLegacy = Number(c._count?.reactions ?? 0);
          const legacyLikes = Number(c.likes_count ?? 0);
          const totalReactions = fromCounts > 0 ? fromCounts : rcLegacy > 0 ? rcLegacy : legacyLikes;
          const myR = (c.my_reaction ?? null) as string | null;
          return {
            id: String(c.id),
            text: c.content || '',
            likes: totalReactions,
            isLiked: myR === 'like',
            user: {
              id: c.user_id || c.user?.id || '',
              firstName: nameParts[0] || '',
              lastName: nameParts.slice(1).join(' ') || '',
              avatar: profileAvatarUri(
                c.user_avatar || c.user?.profile_image,
                c.user_id || c.user?.id || nameParts.join(' ') || 'U',
              ),
            },
            createdAt: formatCommentTimeAgo(c.created_at),
            audioUrl: c.audio_url || null,
            reactionTotal: totalReactions,
            reactionCounts: rawCounts,
            myReaction: myR,
            isPinned: Boolean(c.is_pinned),
            parentId,
            isReply,
          };
        };
        const transformed: Comment[] = [];
        for (const c of backendComments) {
          transformed.push(mapOne(c, false, null));
          for (const r of c.replies || []) {
            transformed.push(mapOne(r, true, c.id));
          }
        }
        setComments(transformed);
        setTotalComments(data?.pagination?.total || backendComments.length);
      } else {
        setComments([]);
        setTotalComments(0);
      }
    } catch {
      setComments([]);
    } finally { setLoading(false); }
  }, [videoId]);

  useEffect(() => {
    if (visible) void loadComments();
  }, [visible, videoId, loadComments]);

  const scrollCommentsToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      commentsScrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  useEffect(() => {
    if (!visible || Platform.OS === 'web') return;
    const onShow = (e: any) => {
      const h = Math.max(0, Number(e?.endCoordinates?.height || 0));
      setKeyboardInset(h);
      scrollCommentsToBottom();
    };
    const onHide = () => setKeyboardInset(0);
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      onShow,
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      onHide,
    );
    return () => {
      showSub.remove();
      hideSub.remove();
      setKeyboardInset(0);
    };
  }, [visible, insets.bottom, scrollCommentsToBottom]);

  useEffect(() => {
    if (!visible) {
      setReplyingTo(null);
      setCommentMenuFor(null);
      setEditingCommentId(null);
      setEditDraft('');
      setReportCommentId(null);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) return;
    (async () => {
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch { /* ignore */ }
        recordingRef.current = null;
      }
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
      setIsRecordingVoice(false);
      setRecordSeconds(0);
      abortWebVoiceRecording();
      revokeVoicePreviewBlobUrl();
      setVoicePreviewUri(null);
      setVoicePreviewSeconds(0);
      setVoicePreviewPlaying(false);
      stopWebVoicePlayback();
      if (soundRef.current) {
        try {
          await soundRef.current.unloadAsync();
        } catch { /* ignore */ }
        soundRef.current = null;
      }
      if (voicePreviewSoundRef.current) {
        try {
          await voicePreviewSoundRef.current.unloadAsync();
        } catch { /* ignore */ }
        voicePreviewSoundRef.current = null;
      }
      setPlayingCommentId(null);
    })();
  }, [visible]);

  const sumReactionCounts = (counts: Record<string, number> | undefined | null) => {
    if (!counts || typeof counts !== 'object') return 0;
    return Object.values(counts).reduce(
      (s, n) => s + (typeof n === 'number' && !Number.isNaN(n) ? n : 0),
      0
    );
  };

  const toggleCommentReaction = async (commentId: string, type: string = 'like') => {
    if (!isAuthenticated) {
      promptLoginForAction('réagir');
      return;
    }
    const idKey = String(commentId);
    try {
      const response = await apiClient.post(`/comments/${encodeURIComponent(idKey)}/reaction`, { type });
      const data = response.data?.data || response.data;
      const counts = (data?.reaction_counts || {}) as Record<string, number>;
      const total = sumReactionCounts(counts);
      const my = (data?.my_reaction ?? null) as string | null;
      setComments((prev) =>
        prev.map((c) =>
          String(c.id) === idKey
            ? {
                ...c,
                reactionCounts: counts,
                myReaction: my,
                reactionTotal: total,
                likes: total,
                isLiked: my === 'like',
              }
            : c
        )
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message ||
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.error;
      Alert.alert('Erreur', msg || "Impossible d'enregistrer la réaction.");
    }
  };

  const handleTogglePinComment = async (c: Comment) => {
    if (!videoCreatorId || String(user?.id) !== String(videoCreatorId)) return;
    if (!c.id) return;
    const nextPinned = !c.isPinned;
    try {
      await apiClient.patch(`/videos/comments/${c.id}`, { is_pinned: nextPinned });
      setComments((prev) =>
        prev.map((row) =>
          row.id === c.id ? { ...row, isPinned: nextPinned } : nextPinned ? { ...row, isPinned: false } : row
        )
      );
    } catch {
      Alert.alert('Erreur', "Impossible d'épingler ce commentaire.");
    }
  };

  const recordStartedAtRef = useRef(0);

  const unloadVoicePreviewSound = async () => {
    stopWebVoicePlayback();
    if (voicePreviewSoundRef.current) {
      try {
        await voicePreviewSoundRef.current.unloadAsync();
      } catch { /* ignore */ }
      voicePreviewSoundRef.current = null;
    }
    setVoicePreviewPlaying(false);
  };

  const discardVoicePreview = async () => {
    await unloadVoicePreviewSound();
    revokeVoicePreviewBlobUrl();
    setVoicePreviewUri(null);
    setVoicePreviewSeconds(0);
  };

  const startWebVoiceRecording = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      Alert.alert('Microphone', 'Enregistrement vocal non disponible sur ce navigateur.');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      Alert.alert('Microphone', 'Enregistrement vocal non pris en charge (MediaRecorder).');
      return;
    }
    const pickMime = (): string | undefined => {
      const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ];
      for (const c of candidates) {
        if (MediaRecorder.isTypeSupported(c)) return c;
      }
      return undefined;
    };
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      webStreamRef.current = stream;
      const mime = pickMime();
      let mr: MediaRecorder;
      try {
        mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      } catch {
        mr = new MediaRecorder(stream);
      }
      webChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) webChunksRef.current.push(e.data);
      };
      mr.start(100);
      webRecorderRef.current = mr;
      recordStartedAtRef.current = Date.now();
      setRecordSeconds(0);
      setIsRecordingVoice(true);
      recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      abortWebVoiceRecording();
      Alert.alert('Microphone', 'Autorisez le micro pour enregistrer un commentaire vocal.');
    }
  };

  const stopWebVoiceRecording = async (): Promise<{ uri: string; blob: Blob } | null> => {
    const mr = webRecorderRef.current;
    const stream = webStreamRef.current;
    webRecorderRef.current = null;
    if (!mr) {
      abortWebVoiceRecording();
      return null;
    }
    return new Promise((resolve, reject) => {
      mr.onstop = () => {
        try {
          stream?.getTracks().forEach((t) => t.stop());
          webStreamRef.current = null;
          const blob = new Blob(webChunksRef.current, { type: mr.mimeType || 'audio/webm' });
          webChunksRef.current = [];
          if (blob.size < 80) {
            resolve(null);
            return;
          }
          const uri = URL.createObjectURL(blob);
          resolve({ uri, blob });
        } catch (e) {
          reject(e);
        }
      };
      mr.onerror = () => reject(new Error('MediaRecorder'));
      try {
        if (mr.state === 'recording') {
          if (typeof mr.requestData === 'function') mr.requestData();
          mr.stop();
        } else {
          stream?.getTracks().forEach((t) => t.stop());
          webStreamRef.current = null;
          resolve(null);
        }
      } catch (e) {
        reject(e);
      }
    });
  };

  const toggleVoicePreviewPlayback = async () => {
    if (!voicePreviewUri) return;
    if (Platform.OS === 'web') {
      try {
        if (voicePreviewPlaying) {
          stopWebVoicePlayback();
          setVoicePreviewPlaying(false);
          return;
        }
        if (soundRef.current) {
          try {
            await soundRef.current.stopAsync();
            await soundRef.current.unloadAsync();
          } catch { /* ignore */ }
          soundRef.current = null;
          setPlayingCommentId(null);
        }
        stopWebVoicePlayback();
        const el = new window.Audio(voicePreviewUri);
        webVoiceAudioRef.current = el;
        el.onended = () => {
          webVoiceAudioRef.current = null;
          setVoicePreviewPlaying(false);
        };
        el.onerror = () => {
          webVoiceAudioRef.current = null;
          setVoicePreviewPlaying(false);
          Alert.alert('Lecture', 'Impossible de lire l’aperçu du vocal.');
        };
        await el.play();
        setVoicePreviewPlaying(true);
      } catch {
        Alert.alert('Lecture', 'Impossible de lire l’aperçu du vocal.');
        stopWebVoicePlayback();
        setVoicePreviewPlaying(false);
      }
      return;
    }
    try {
      if (voicePreviewPlaying) {
        await unloadVoicePreviewSound();
        return;
      }
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch { /* ignore */ }
        soundRef.current = null;
        setPlayingCommentId(null);
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: voicePreviewUri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            unloadVoicePreviewSound().catch(() => {});
          }
        }
      );
      voicePreviewSoundRef.current = sound;
      setVoicePreviewPlaying(true);
    } catch {
      Alert.alert('Lecture', 'Impossible de lire l’aperçu du vocal.');
      await unloadVoicePreviewSound();
    }
  };

  const sendVoiceComment = async () => {
    if (!voicePreviewUri || commentsDisabled || sendingVoice) return;
    if (!isAuthenticated) {
      promptLoginForAction('commenter');
      return;
    }
    const uri = voicePreviewUri;
    const blobUrlToRevoke = voicePreviewBlobUrlRef.current;
    voicePreviewBlobUrlRef.current = null;
    const caption = newComment.trim();
    const parentId = replyingTo?.id ?? null;
    await unloadVoicePreviewSound();
    setVoicePreviewUri(null);
    setVoicePreviewSeconds(0);
    setSendingVoice(true);
    try {
      const formData = new FormData();
      await appendCommentVoiceToFormData(formData, uri);
      const uploadRes = await apiClient.post('/upload/audio', formData, {
        timeout: 120000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
      const ud = uploadRes.data?.data;
      const audioUrl = ud?.file_url || ud?.url;
      if (!audioUrl) throw new Error('URL audio manquante');
      const optimistic: Comment = {
        id: `tmp-v-${Date.now()}`,
        text: caption || '🎤',
        likes: 0,
        isLiked: false,
        user: {
          id: user?.id || 'me',
          firstName: user?.firstName || user?.full_name?.split(' ')[0] || 'Moi',
          lastName: user?.lastName || '',
          avatar: profileAvatarUri(user?.avatar || user?.profile_image, user?.id || 'me'),
        },
        createdAt: 'A l\'instant',
        audioUrl,
        reactionTotal: 0,
        isPinned: false,
        parentId,
        isReply: Boolean(parentId),
      };
      setComments((prev) => {
        if (!parentId) return [optimistic, ...prev];
        const idx = prev.findIndex((c) => c.id === parentId);
        if (idx === -1) return [...prev, optimistic];
        return [...prev.slice(0, idx + 1), optimistic, ...prev.slice(idx + 1)];
      });
      setTotalComments((prev) => prev + 1);
      const response = await apiClient.post(`/videos/${videoId}/comment`, {
        content: caption || '🎤',
        audio_url: audioUrl,
        ...(parentId ? { parent_id: parentId } : {}),
      });
      const data = response.data?.data || response.data;
      if (data?.id) {
        setComments((prev) =>
          prev.map((c) => (c.id === optimistic.id ? { ...c, id: data.id, audioUrl: data.audio_url || audioUrl } : c))
        );
      }
      setNewComment('');
      setReplyingTo(null);
    } catch {
      Alert.alert('Erreur', 'Impossible d\'envoyer le commentaire vocal.');
      setComments((prev) => prev.filter((c) => !String(c.id).startsWith('tmp-v-')));
      setTotalComments((prev) => Math.max(0, prev - 1));
    } finally {
      if (blobUrlToRevoke && blobUrlToRevoke.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(blobUrlToRevoke);
        } catch { /* ignore */ }
      }
      setSendingVoice(false);
    }
  };

  /** Micro : démarrer / arrêter (→ prévisualisation) / réenregistrer si une prévisualisation existe. */
  const toggleVoiceRecording = async () => {
    if (commentsDisabled) {
      Alert.alert('Commentaires', 'Les commentaires sont désactivés sur cette vidéo.');
      return;
    }
    if (!isAuthenticated) {
      promptLoginForAction('commenter');
      return;
    }
    if (sendingVoice) return;

    if (voicePreviewUri) {
      await discardVoicePreview();
    }

    if (isRecordingVoice) {
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
      setIsRecordingVoice(false);
      setRecordSeconds(0);

      if (Platform.OS === 'web') {
        try {
          const result = await stopWebVoiceRecording();
          const sec = Math.max(1, Math.floor((Date.now() - recordStartedAtRef.current) / 1000));
          if (!result || !result.blob.size) {
            Alert.alert('Enregistrement', 'Aucun son capturé. Vérifiez le micro et réessayez.');
            return;
          }
          revokeVoicePreviewBlobUrl();
          voicePreviewBlobUrlRef.current = result.uri;
          setVoicePreviewUri(result.uri);
          setVoicePreviewSeconds(sec);
        } catch {
          Alert.alert('Erreur', 'Impossible de finaliser l’enregistrement.');
          abortWebVoiceRecording();
        }
        return;
      }

      const rec = recordingRef.current;
      if (!rec) return;
      try {
        await rec.stopAndUnloadAsync();
        const uri = rec.getURI();
        recordingRef.current = null;
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
        const sec = Math.floor((Date.now() - recordStartedAtRef.current) / 1000);
        if (!uri || sec < 1) {
          Alert.alert('Trop court', 'Enregistrez au moins 1 seconde de vocal.');
          return;
        }
        revokeVoicePreviewBlobUrl();
        setVoicePreviewUri(uri);
        if (uri.startsWith('blob:')) voicePreviewBlobUrlRef.current = uri;
        setVoicePreviewSeconds(Math.max(1, sec));
      } catch {
        Alert.alert('Erreur', 'Impossible de finaliser l’enregistrement.');
      }
      return;
    }

    try {
      if (Platform.OS === 'web') {
        await startWebVoiceRecording();
        return;
      }
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Microphone', 'Autorisez le micro pour enregistrer un commentaire vocal.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      recordStartedAtRef.current = Date.now();
      setRecordSeconds(0);
      setIsRecordingVoice(true);
      recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      Alert.alert('Erreur', 'Impossible de démarrer l\'enregistrement.');
    }
  };

  const togglePlayCommentAudio = async (c: Comment) => {
    if (!c.audioUrl) return;
    const playUri = toAbsoluteMediaUrl(c.audioUrl);
    if (!playUri) return;
    if (Platform.OS === 'web') {
      try {
        if (playingCommentId === c.id) {
          stopWebVoicePlayback();
          setPlayingCommentId(null);
          return;
        }
        stopWebVoicePlayback();
        await unloadVoicePreviewSound();
        const el = new window.Audio();
        if (playUri.startsWith('http')) el.crossOrigin = 'anonymous';
        el.src = playUri;
        webVoiceAudioRef.current = el;
        el.onended = () => {
          webVoiceAudioRef.current = null;
          setPlayingCommentId(null);
        };
        el.onerror = () => {
          webVoiceAudioRef.current = null;
          setPlayingCommentId(null);
          Alert.alert('Lecture', 'Impossible de lire ce vocal (réseau ou CORS).');
        };
        await el.play();
        setPlayingCommentId(c.id);
      } catch {
        Alert.alert('Lecture', 'Impossible de lire ce vocal.');
        stopWebVoicePlayback();
        setPlayingCommentId(null);
      }
      return;
    }
    try {
      if (playingCommentId === c.id) {
        await soundRef.current?.stopAsync();
        await soundRef.current?.unloadAsync();
        soundRef.current = null;
        setPlayingCommentId(null);
        return;
      }
      await unloadVoicePreviewSound();
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: playUri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setPlayingCommentId(null);
            sound.unloadAsync().catch(() => {});
            soundRef.current = null;
          }
        }
      );
      soundRef.current = sound;
      setPlayingCommentId(c.id);
    } catch {
      Alert.alert('Lecture', 'Impossible de lire ce vocal.');
    }
  };

  const isOwnComment = (c: Comment) => Boolean(user?.id && String(c.user.id) === String(user.id));

  const cancelCommentEdit = () => {
    setEditingCommentId(null);
    setEditDraft('');
  };

  const saveCommentEdit = async () => {
    if (!editingCommentId || !editDraft.trim()) {
      Alert.alert('Commentaire', 'Le texte ne peut pas être vide.');
      return;
    }
    if (String(editingCommentId).startsWith('tmp')) {
      Alert.alert('Commentaire', 'Ce commentaire est encore en cours d’envoi.');
      return;
    }
    const id = editingCommentId;
    const text = editDraft.trim();
    try {
      await apiClient.patch(`/videos/comments/${encodeURIComponent(id)}`, { content: text });
      setComments((prev) => prev.map((c) => (c.id === id ? { ...c, text } : c)));
      cancelCommentEdit();
    } catch {
      Alert.alert('Erreur', 'Impossible de modifier ce commentaire.');
    }
  };

  const confirmDeleteComment = (c: Comment) => {
    const run = async () => {
      try {
        if (String(c.id).startsWith('tmp-v-')) {
          setComments((prev) => prev.filter((x) => x.id !== c.id));
          setTotalComments((prev) => Math.max(0, prev - 1));
          return;
        }
        await apiClient.delete(`/videos/comments/${encodeURIComponent(c.id)}`);
        setComments((prev) => prev.filter((x) => x.id !== c.id));
        setTotalComments((prev) => Math.max(0, prev - 1));
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          setComments((prev) => prev.filter((x) => x.id !== c.id));
          setTotalComments((prev) => Math.max(0, prev - 1));
          return;
        }
        Alert.alert('Erreur', 'Impossible de supprimer ce commentaire.');
      }
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
      if (window.confirm('Supprimer ce commentaire ?')) void run();
      return;
    }
    Alert.alert('Supprimer', 'Supprimer ce commentaire ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => void run() },
    ]);
  };

  const handleSend = async () => {
    if (commentsDisabled) {
      Alert.alert('Commentaires', 'Les commentaires sont désactivés sur cette vidéo.');
      return;
    }
    if (!newComment.trim()) return;
    if (!isAuthenticated) {
      promptLoginForAction('commenter');
      return;
    }
    const commentText = newComment.trim();
    const parentId = replyingTo?.id ?? null;
    setNewComment('');
    setReplyingTo(null);

    // Optimistic add
    const optimistic: Comment = {
      id: Date.now().toString(),
      text: commentText,
      likes: 0,
      isLiked: false,
      user: {
        id: user?.id || 'me',
        firstName: user?.firstName || user?.full_name?.split(' ')[0] || 'Moi',
        lastName: user?.lastName || '',
        avatar: profileAvatarUri(user?.avatar || user?.profile_image, user?.id || 'me'),
      },
      createdAt: 'A l\'instant',
      reactionTotal: 0,
      isPinned: false,
      parentId,
      isReply: Boolean(parentId),
    };
    setComments((prev) => {
      if (!parentId) return [optimistic, ...prev];
      const idx = prev.findIndex((c) => c.id === parentId);
      if (idx === -1) return [...prev, optimistic];
      return [...prev.slice(0, idx + 1), optimistic, ...prev.slice(idx + 1)];
    });
    setTotalComments((prev) => prev + 1);

    try {
      const response = await apiClient.post(`/videos/${videoId}/comment`, {
        content: commentText,
        ...(parentId ? { parent_id: parentId } : {}),
      });
      const data = response.data?.data || response.data;
      if (data?.id) {
        setComments((prev) => prev.map((c) => (c.id === optimistic.id ? { ...c, id: data.id } : c)));
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; error?: { message?: string } } } };
      const msg =
        ax?.response?.data?.message ||
        ax?.response?.data?.error?.message ||
        (typeof ax?.response?.data === 'string' ? ax.response.data : '');
      if (msg) {
        Alert.alert('Commentaire', String(msg));
        setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
        setTotalComments((prev) => Math.max(0, prev - 1));
        return;
      }
      await offlineActionSyncService.enqueue('comment_video', videoId, { content: commentText, parent_id: parentId });
      setComments((prev) => prev.map((c) => (c.id === optimistic.id ? { ...c, createdAt: 'En attente' } : c)));
    }
  };

  const userAvatar = profileAvatarUri(user?.avatar || user?.profile_image, user?.id || 'me');

  return (
    <>
    <Modal
      visible={visible}
      animationType="slide"
      transparent={Platform.OS !== 'ios'}
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
          style={[
            styles.commentsContainer,
            { paddingBottom: Math.max(insets.bottom, 8) },
            Platform.OS === 'android' && keyboardInset > 0 ? { marginBottom: keyboardInset } : null,
          ]}
        >
          <View style={styles.commentsHeader} {...dragClosePan.panHandlers}>
            <View style={styles.shareHandle} accessibilityLabel="Fermer en glissant vers le bas" />
            <Text style={styles.commentsTitle}>{totalComments} commentaires</Text>
            <TouchableOpacity testID="close-comments" onPress={onClose} accessibilityLabel="Fermer les commentaires">
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          {commentsDisabled ? (
            <View style={{ paddingHorizontal: Spacing.lg, paddingVertical: 10, backgroundColor: 'rgba(255,107,0,0.15)' }}>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
                Commentaires désactivés par le créateur.
              </Text>
            </View>
          ) : null}
          {replyingTo ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: Spacing.lg,
                paddingVertical: 8,
                backgroundColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <Text style={{ flex: 1, color: Colors.textMuted, fontSize: 12 }} numberOfLines={1}>
                Réponse à {replyingTo.label}
              </Text>
              <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 13 }}>Annuler</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {loading ? <ActivityIndicator size="large" color={Colors.primary} style={{ padding: 40 }} /> : (
            <ScrollView
              ref={commentsScrollRef}
              style={styles.commentsList}
              contentContainerStyle={{ paddingBottom: Spacing.xxl + (Platform.OS === 'android' ? keyboardInset : 0) }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              nestedScrollEnabled
            >
              {comments.length === 0 ? (
                <View style={{ alignItems: 'center', padding: 40 }}>
                  <Ionicons name="chatbubble-outline" size={40} color={Colors.textMuted} />
                  <Text style={{ color: Colors.textMuted, marginTop: 8 }}>Soyez le premier a commenter</Text>
                </View>
              ) : comments.map((c) => (
                <View key={c.id} style={[styles.commentItem, c.isReply ? { paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: 'rgba(255,255,255,0.12)' } : null]}>
                  <Image source={{ uri: c.user.avatar }} style={styles.commentAvatar} />
                  <View style={styles.commentContent}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <Text style={styles.commentUser}>{c.user.firstName} {c.user.lastName}</Text>
                      {c.isPinned ? (
                        <View style={styles.commentPinnedBadge}>
                          <Text style={styles.commentPinnedBadgeText}>Épinglé</Text>
                        </View>
                      ) : null}
                      {videoCreatorId && user?.id && String(videoCreatorId) === String(user.id) && !c.isReply ? (
                        <TouchableOpacity
                          onPress={() => void handleTogglePinComment(c)}
                          accessibilityRole="button"
                          accessibilityLabel={c.isPinned ? 'Désépingler' : 'Épingler'}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons name="pin" size={14} color={c.isPinned ? Colors.primary : Colors.textMuted} />
                        </TouchableOpacity>
                      ) : null}
                      <View style={{ flex: 1, minWidth: 12 }} />
                      {isAuthenticated && !commentsDisabled ? (
                        <TouchableOpacity
                          onPress={() => setCommentMenuFor(c)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityRole="button"
                          accessibilityLabel="Options du commentaire"
                        >
                          <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textSecondary} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    {editingCommentId === c.id ? (
                      <View style={styles.commentEditBlock}>
                        <TextInput
                          style={styles.commentEditInput}
                          value={editDraft}
                          onChangeText={setEditDraft}
                          multiline
                          placeholder="Modifier le commentaire…"
                          placeholderTextColor={Colors.textMuted}
                        />
                        <View style={styles.commentEditActions}>
                          <TouchableOpacity onPress={cancelCommentEdit} style={styles.commentEditBtn}>
                            <Text style={styles.commentEditBtnTextMuted}>Annuler</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => void saveCommentEdit()} style={styles.commentEditBtn}>
                            <Text style={styles.commentEditBtnTextPrimary}>Enregistrer</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <Text style={styles.commentText}>{c.text}</Text>
                    )}
                    {c.audioUrl ? (
                      <TouchableOpacity
                        style={styles.commentVoiceBtn}
                        onPress={() => void togglePlayCommentAudio(c)}
                        accessibilityRole="button"
                        accessibilityLabel={playingCommentId === c.id ? 'Pause vocal' : 'Lire le vocal'}
                      >
                        <Ionicons name={playingCommentId === c.id ? 'pause' : 'play'} size={16} color={Colors.primary} />
                        <Text style={styles.commentVoiceLabel}>Commentaire vocal</Text>
                      </TouchableOpacity>
                    ) : null}
                    <View style={styles.commentMetaColumn}>
                      <View style={styles.commentMeta}>
                        <Text style={styles.commentTime}>{c.createdAt}</Text>
                        {!commentsDisabled ? (
                          <TouchableOpacity
                            style={styles.commentReply}
                            onPress={() => {
                              const label = `${c.user.firstName} ${c.user.lastName}`.trim() || 'ce commentaire';
                              setReplyingTo({ id: c.id, label });
                            }}
                          >
                            <Text style={styles.commentReplyText}>Répondre</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                      {isAuthenticated && !commentsDisabled ? (
                        <View
                          style={[
                            styles.commentReactionRow,
                            Platform.OS === 'web' ? ({ zIndex: 2, position: 'relative' } as const) : null,
                          ]}
                        >
                          {(
                            [
                              ['laugh', '😂'],
                              ['fire', '🔥'],
                              ['wow', '😮'],
                              ['sad', '😭'],
                              ['moving', '😢'],
                              ['strong', '💪'],
                              ['african', '🌍'],
                            ] as const
                          ).map(([type, emoji]) => (
                            <TouchableOpacity
                              key={type}
                              accessibilityRole="button"
                              accessibilityLabel={`Réaction ${type}`}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              activeOpacity={0.65}
                              delayPressIn={0}
                              onPress={() => void toggleCommentReaction(c.id, type)}
                              style={[
                                styles.commentReactionHit,
                                c.myReaction === type ? styles.commentReactionHitActive : null,
                                Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
                              ]}
                            >
                              <Text style={styles.commentReactionEmoji}>{emoji}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.commentLikeBtn}
                    onPress={() => void toggleCommentReaction(c.id, 'like')}
                    accessibilityRole="button"
                    accessibilityLabel={c.isLiked ? 'Retirer le j’aime' : 'J’aime'}
                  >
                    <Ionicons name={c.isLiked ? 'heart' : 'heart-outline'} size={14} color={c.isLiked ? Colors.like : Colors.textSecondary} />
                    <Text style={styles.commentLikeCount}>{c.reactionTotal ?? c.likes}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
          <View
            style={[
              styles.commentInput,
              commentsDisabled && { opacity: 0.55 },
            ]}
          >
            <Image source={{ uri: userAvatar }} style={styles.commentInputAvatar} />
            {voicePreviewUri ? (
              <View style={styles.commentVoicePreviewBar}>
                <TouchableOpacity
                  onPress={() => void toggleVoicePreviewPlayback()}
                  style={styles.commentVoicePreviewPlayBtn}
                  accessibilityRole="button"
                  accessibilityLabel={voicePreviewPlaying ? 'Pause' : 'Écouter le vocal'}
                >
                  <Ionicons name={voicePreviewPlaying ? 'pause' : 'play'} size={22} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void discardVoicePreview()}
                  style={styles.commentVoicePreviewPlayBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Supprimer le vocal"
                >
                  <Ionicons name="trash-outline" size={22} color="#E53935" />
                </TouchableOpacity>
                <Text style={styles.commentVoicePreviewMeta}>{voicePreviewSeconds}s</Text>
                <TextInput
                  style={[styles.commentTextInput, styles.commentVoicePreviewInput]}
                  placeholder="Légende (optionnel)…"
                  placeholderTextColor={Colors.textMuted}
                  value={newComment}
                  onChangeText={setNewComment}
                  onFocus={scrollCommentsToBottom}
                  multiline
                  editable={!sendingVoice && !commentsDisabled}
                />
              </View>
            ) : isRecordingVoice ? (
              <View style={styles.commentRecordingBar}>
                <View style={styles.commentRecordingDot} />
                <Text style={styles.commentRecordingText}>
                  Enregistrement… {recordSeconds}s — touchez le rouge pour terminer, écoutez puis envoyez
                </Text>
              </View>
            ) : (
              <TextInput
                style={styles.commentTextInput}
                placeholder={
                  commentsDisabled
                    ? 'Commentaires fermés'
                    : replyingTo
                      ? `Réponse à ${replyingTo.label}…`
                      : 'Ajouter un commentaire ou un vocal…'
                }
                placeholderTextColor={Colors.textMuted}
                value={newComment}
                onChangeText={setNewComment}
                onFocus={scrollCommentsToBottom}
                multiline
                editable={!sendingVoice && !commentsDisabled}
              />
            )}
            <TouchableOpacity
              style={[styles.commentMicBtn, (sendingVoice || commentsDisabled) && { opacity: 0.5 }]}
              onPress={() => void toggleVoiceRecording()}
              disabled={sendingVoice || commentsDisabled}
              accessibilityLabel={
                voicePreviewUri
                  ? 'Réenregistrer le vocal'
                  : isRecordingVoice
                    ? 'Terminer et préécouter le vocal'
                    : 'Enregistrer un commentaire vocal'
              }
            >
              {sendingVoice ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name={isRecordingVoice ? 'stop-circle' : 'mic'} size={24} color={isRecordingVoice ? '#E53935' : Colors.textSecondary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.commentSendBtn,
                (!voicePreviewUri && !newComment.trim()) || isRecordingVoice || sendingVoice || commentsDisabled ? { opacity: 0.4 } : null,
              ]}
              onPress={() => {
                if (voicePreviewUri) void sendVoiceComment();
                else void handleSend();
              }}
              disabled={
                (!voicePreviewUri && !newComment.trim()) || Boolean(isRecordingVoice) || sendingVoice || commentsDisabled
              }
            >
              <Ionicons name="send" size={18} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>

    <Modal
      visible={commentMenuFor !== null}
      transparent
      animationType="fade"
      onRequestClose={() => setCommentMenuFor(null)}
    >
      <View style={styles.commentActionMenuOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setCommentMenuFor(null)} />
        <View style={[styles.commentActionMenuSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {commentMenuFor && isOwnComment(commentMenuFor) ? (
            <>
              <TouchableOpacity
                style={styles.commentActionMenuRow}
                onPress={() => {
                  setEditDraft(commentMenuFor.text);
                  setEditingCommentId(commentMenuFor.id);
                  setCommentMenuFor(null);
                }}
              >
                <Text style={styles.commentActionMenuText}>Modifier</Text>
              </TouchableOpacity>
              <View style={styles.commentActionMenuSep} />
              <TouchableOpacity
                style={styles.commentActionMenuRow}
                onPress={() => {
                  const row = commentMenuFor;
                  setCommentMenuFor(null);
                  if (row) confirmDeleteComment(row);
                }}
              >
                <Text style={[styles.commentActionMenuText, { color: '#E53935' }]}>Supprimer</Text>
              </TouchableOpacity>
            </>
          ) : commentMenuFor ? (
            <TouchableOpacity
              style={styles.commentActionMenuRow}
              onPress={() => {
                setReportCommentId(commentMenuFor.id);
                setCommentMenuFor(null);
              }}
            >
              <Text style={styles.commentActionMenuText}>Signaler</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>

    <CommentReportModal
      visible={reportCommentId !== null}
      onClose={() => setReportCommentId(null)}
      commentId={reportCommentId ?? ''}
    />
    </>
  );
};

export default function FeedScreen(props?: {
  amisStandalone?: boolean;
  diversifiedStandalone?: boolean;
}) {
  const navigation = useNavigation();
  const amisStandalone = Boolean(props?.amisStandalone);
  const diversifiedStandalone = Boolean(props?.diversifiedStandalone);
  const isScreenFocused = useIsFocused();
  const [appState, setAppState] = useState(AppState.currentState);
  const [videos, setVideos] = useState<Video[]>([]);
  /** Index pour la lecture uniquement : dérivé du scroll (instantané). `viewability` restait ~100 ms trop lent → audio fantôme. */
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'following' | 'foryou' | 'apprendre' | 'diversified'>(
    amisStandalone ? 'following' : diversifiedStandalone ? 'diversified' : 'foryou'
  );
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState({ type: 'video', id: '' });
  const [shareData, setShareData] = useState({ title: '', message: '', url: '' });
  const [shareVideo, setShareVideo] = useState<ShareVideoContext | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [selectedVideoCreatorId, setSelectedVideoCreatorId] = useState<string | null>(null);
  const [selectedVideoComments, setSelectedVideoComments] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedOfflineMode, setFeedOfflineMode] = useState(false);
  const [feedOfflinePlayableCount, setFeedOfflinePlayableCount] = useState(0);
  const likeScrollLockUntilRef = useRef(0);
  const likeTapDebounceRef = useRef<Map<string, number>>(new Map());
  const playbackIndexRef = useRef(0);
  useEffect(() => {
    playbackIndexRef.current = playbackIndex;
  }, [playbackIndex]);
  const refreshOutcomeRef = useRef<{ hadNewTop: boolean; keepIndex: number }>({
    hadNewTop: false,
    keepIndex: 0,
  });
  /** Message sous l’état vide : erreur réseau ou rappel fil découverte (vidéos courtes). */
  const [feedEmptyMessage, setFeedEmptyMessage] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentUserId = useAuthStore((s) => s.user?.id ?? '');
  const feedParams = useLocalSearchParams<{ feed?: string; topic?: string }>();

  /** Android edge-to-edge : `insets.top` peut rester à 0 alors que la barre d’état recouvre le header ; les `position:absolute` avec `top:0` montent sous l’heure. */
  const feedHeaderTopPad = useMemo(() => {
    const statusH = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;
    // Plancher de sécurité : certains Android edge-to-edge (Xiaomi/MIUI, etc.) peuvent
    // rapporter 0/trop petit. 28 px garantit que les onglets ne chevauchent jamais l'heure.
    const minPlatformInset = Platform.OS === 'android' ? 28 : Platform.OS === 'ios' ? 20 : 0;
    const inset = Math.max(insets.top, statusH, minPlatformInset);
    return inset + (Platform.OS === 'android' ? 10 : 8);
  }, [insets.top]);

  /**
   * Header TikTok en `position:absolute` ne réserve pas d’espace en flux : sans marge, la barre Wonder stories
   * démarre à y=0 et les libellés passent sous / sous-remontent les onglets (capture utilisateur).
   */
  const wonderStoriesBarTopMargin = useMemo(
    () => feedHeaderTopPad + 44 + 6 + 4,
    [feedHeaderTopPad],
  );

  const { t } = useLanguage();
  const promptLoginForAction = useCallback((action: string) => {
    const normalized = String(action || '').toLowerCase();
    const message =
      normalized === 'liker' || normalized === 'commenter' || normalized === 'réagir'
        ? "Connectez-vous d'abord pour liker ou commenter."
        : `Connectez-vous d'abord pour ${action}.`;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
      const goLogin = window.confirm(`${message}\n\nVoulez-vous vous connecter maintenant ?`);
      if (goLogin) {
        router.push({ pathname: '/(auth)/login', params: { returnTo: '/(tabs)' } });
      }
      return;
    }
    Alert.alert('Connexion requise', message, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se connecter',
        onPress: () => router.push({ pathname: '/(auth)/login', params: { returnTo: '/(tabs)' } }),
      },
    ]);
  }, []);

  useEffect(() => {
    if (amisStandalone) {
      setActiveTab('following');
      return;
    }
    if (diversifiedStandalone) {
      setActiveTab('diversified');
      return;
    }
    if (feedParams.feed === 'following') {
      setActiveTab('following');
      requestAnimationFrame(() => {
        try {
          router.setParams({ feed: undefined });
        } catch {
          /* navigateur sans setParams sur cet écran */
        }
      });
      return;
    }
    if (feedParams.topic === 'apprendre') {
      setActiveTab('apprendre');
      requestAnimationFrame(() => {
        try {
          router.setParams({ topic: undefined });
        } catch {
          /* navigateur sans setParams sur cet écran */
        }
      });
    }
  }, [amisStandalone, diversifiedStandalone, feedParams.feed, feedParams.topic]);
  const { effectiveDataSaver, isOnCellular, tapToPlayOnly, reduceAnimations } = useDataSaver();
  const feedPageLimit = useMemo(() => getFeedPageLimit(effectiveDataSaver), [effectiveDataSaver]);
  const feedScrollTuning = useMemo(
    () => getFeedScrollTuning(effectiveDataSaver, isOnCellular),
    [effectiveDataSaver, isOnCellular],
  );
  const feedAutoplayFromSettings = useFeedAutoplayFromSettings();
  const tapToPlayOnlyEffective = useMemo(
    () => tapToPlayOnly || !feedAutoplayFromSettings,
    [tapToPlayOnly, feedAutoplayFromSettings]
  );

  /** Pastille sur l’entrée Live si des directs sont disponibles. */
  const [liveHubHasStreams, setLiveHubHasStreams] = useState(false);
  const refreshLiveHubHint = useCallback(async () => {
    if (amisStandalone) return;
    try {
      const res = await apiClient.get('/live', { params: { status: 'live', limit: 6, sortBy: 'viewers' } });
      const raw = res.data?.data ?? res.data;
      const list = Array.isArray(raw?.streams) ? (raw.streams as LiveHintStream[]) : [];
      setLiveHubHasStreams(list.some((x) => isActiveLiveHintStream(x)));
    } catch {
      setLiveHubHasStreams(false);
    }
  }, [amisStandalone]);

  useEffect(() => {
    if (amisStandalone || !isScreenFocused) return undefined;
    void refreshLiveHubHint();
    const id = setInterval(() => void refreshLiveHubHint(), getLiveHubHintRefreshMs(effectiveDataSaver));
    return () => clearInterval(id);
  }, [amisStandalone, isScreenFocused, refreshLiveHubHint, effectiveDataSaver]);

  const videosRef = useRef<Video[]>([]);
  useEffect(() => { videosRef.current = videos; }, [videos]);

  const feedStateSyncKeyRef = useRef('');
  const syncFeedVideoStates = useCallback(async () => {
    if (!isAuthenticated || !currentUserId) return;
    const list = videosRef.current;
    if (list.length === 0) return;
    const ids = pickFeedStateSyncIds(
      list.map((v) => v.id),
      playbackIndexRef.current,
    );
    const syncKey = ids.join(',');
    if (!syncKey || syncKey === feedStateSyncKeyRef.current) return;
    feedStateSyncKeyRef.current = syncKey;
    try {
      const res = await apiClient.get('/me/feed-video-states', { params: { ids: syncKey } });
      const states = parseFeedVideoStatesPayload(res.data?.data ?? res.data);
      setVideos((prev) => applyFeedVideoStates(prev, states, new Set(ids)));
    } catch {
      feedStateSyncKeyRef.current = '';
    }
  }, [isAuthenticated, currentUserId]);

  useEffect(() => {
    feedStateSyncKeyRef.current = '';
    void syncFeedVideoStates();
  }, [activeTab, isAuthenticated, currentUserId, syncFeedVideoStates]);

  useEffect(() => {
    void syncFeedVideoStates();
  }, [playbackIndex, videos.length, syncFeedVideoStates]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => setAppState(next));
    return () => sub.remove();
  }, []);

  const playbackAllowed = isScreenFocused && appState === 'active';

  /** Hauteur réelle du viewport liste (sinon snap / offset ≠ hauteur des cellules → index bloqué sur 0). */
  const [listViewportHeight, setListViewportHeight] = useState(0);
  const feedItemHeight = useMemo(() => {
    if (listViewportHeight > 0) return listViewportHeight;
    return Math.ceil(Math.max(200, height - TAB_BAR_LAYOUT_HEIGHT - insets.bottom));
  }, [listViewportHeight, insets.bottom]);

  const onListLayout = useCallback((e: LayoutChangeEvent) => {
    /** `Math.round` peut sous-dimensionner la cellule vs le viewport → bande de la vidéo suivante (Android). */
    const h = Math.ceil(e.nativeEvent.layout.height);
    if (h > 0) setListViewportHeight((prev) => (prev === h ? prev : h));
  }, []);

  const listRef = useRef<FlashListRef<Video> | FlatList<Video> | null>(null);

  /**
   * Au plus une vidéo par geste (fling fort). Index au début du geste tactile ; molette web sans toucher
   * utilise la dernière slide « stabilisée ».
   */
  const feedGestureStartIndexRef = useRef(0);
  /** Web : `true` après `onScrollBeginDrag` jusqu’au clamp final (inertie comprise). */
  const feedTouchGestureActiveRef = useRef(false);
  /** Web + molette : index de référence quand aucun drag tactile n’a démarré le geste. */
  const lastSettledPlaybackIndexRef = useRef(0);

  const clampFeedScrollToAtMostOneItem = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const h = feedItemHeight;
      const len = videosRef.current.length;
      if (h <= 0 || len === 0) return;
      const y = Math.max(0, e.nativeEvent.contentOffset.y);
      const rawIdx = Math.round(y / h);
      const start =
        Platform.OS === 'web'
          ? feedTouchGestureActiveRef.current
            ? feedGestureStartIndexRef.current
            : lastSettledPlaybackIndexRef.current
          : feedGestureStartIndexRef.current;
      const minI = Math.max(0, start - 1);
      const maxI = Math.min(len - 1, start + 1);
      const idx = Math.max(minI, Math.min(maxI, rawIdx));
      const targetY = idx * h;
      if (Math.abs(targetY - y) > 2) {
        listRef.current?.scrollToOffset({ offset: targetY, animated: false });
      }
      if (Platform.OS === 'web') {
        lastSettledPlaybackIndexRef.current = idx;
        feedGestureStartIndexRef.current = idx;
      }
    },
    [feedItemHeight]
  );

  const onFeedScrollBeginDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const h = feedItemHeight;
      if (h <= 0) return;
      const y = Math.max(0, e.nativeEvent.contentOffset.y);
      feedGestureStartIndexRef.current = Math.round(y / h);
      if (Platform.OS === 'web') {
        feedTouchGestureActiveRef.current = true;
      }
    },
    [feedItemHeight]
  );

  const onFeedScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const vy = e.nativeEvent.velocity?.y ?? 0;
      if (Platform.OS === 'web') {
        if (Math.abs(vy) > 0.2) return;
        clampFeedScrollToAtMostOneItem(e);
        feedTouchGestureActiveRef.current = false;
        return;
      }
      if (Math.abs(vy) > 0.2) return;
      clampFeedScrollToAtMostOneItem(e);
    },
    [clampFeedScrollToAtMostOneItem]
  );

  const onFeedMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (Platform.OS === 'web') {
        clampFeedScrollToAtMostOneItem(e);
        feedTouchGestureActiveRef.current = false;
        return;
      }
      clampFeedScrollToAtMostOneItem(e);
    },
    [clampFeedScrollToAtMostOneItem]
  );

  /** Page Son (`music_title`) — liste des vidéos + CTA « Utiliser ce son ». */
  const openSoundPage = useCallback((item: Video) => {
    const music = (item.music || 'Son original').trim().slice(0, 200);
    router.push({ pathname: '/sound-feed', params: { title: music } });
  }, []);

  const activeVideoId = videos[playbackIndex]?.id ?? '';

  const [pollByVideoId, setPollByVideoId] = useState<Record<string, FeedPollPayload | null | 'loading'>>({});
  const pollFetchedRef = useRef<Set<string>>(new Set());
  const [pollVoteVideoId, setPollVoteVideoId] = useState<string | null>(null);

  useLayoutEffect(() => {
    const id = activeVideoId;
    trimIdSet(pollFetchedRef.current, 40, id ? [id] : []);
    setPollByVideoId((prev) => trimRecordKeys(prev, 32, id ? [id] : []));
    if (!id || pollFetchedRef.current.has(id)) return;
    pollFetchedRef.current.add(id);
    setPollByVideoId((prev) => ({ ...prev, [id]: 'loading' }));
    apiClient
      .get(`/videos/${id}/poll`)
      .then((res) => {
        const d = res.data?.data ?? res.data;
        setPollByVideoId((prev) => ({ ...prev, [id]: d ?? null }));
      })
      .catch(() => {
        setPollByVideoId((prev) => ({ ...prev, [id]: null }));
      });
  }, [activeVideoId]);

  const votePoll = useCallback(async (videoId: string, optionIndex: number) => {
    setPollVoteVideoId(videoId);
    try {
      const r = await apiClient.post(`/videos/${videoId}/poll/vote`, { option_index: optionIndex });
      const d = r.data?.data ?? r.data;
      if (d) setPollByVideoId((prev) => ({ ...prev, [videoId]: d }));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert('Sondage', msg || 'Impossible d’enregistrer votre vote.');
    } finally {
      setPollVoteVideoId(null);
    }
  }, []);

  const reactionRequestSeqRef = useRef<Map<string, number>>(new Map());

  const handleVideoReaction = useCallback(async (videoId: string, type: string) => {
    if (!isAuthenticated) {
      promptLoginForAction('réagir');
      return;
    }
    const requestSeq = (reactionRequestSeqRef.current.get(videoId) ?? 0) + 1;
    reactionRequestSeqRef.current.set(videoId, requestSeq);
    const previousRef: { current: Video | null } = { current: null };

    // Optimistic UI: cœur et compteur réagissent immédiatement, puis sync serveur.
    setVideos((prev) =>
      prev.map((v) => {
        if (v.id !== videoId) return v;
        previousRef.current = v;
        const currentReaction = v.myReaction ?? (v.isLiked ? 'like' : null);
        const nextReaction = currentReaction === type ? null : type;
        const likesDelta =
          type === 'like'
            ? nextReaction === 'like'
              ? 1
              : currentReaction === 'like'
                ? -1
                : 0
            : 0;
        const nextLikes = Math.max(0, (Number(v.likes) || 0) + likesDelta);
        const baseCounts = v.reactionCounts && typeof v.reactionCounts === 'object' ? { ...v.reactionCounts } : null;
        const nextCounts = baseCounts
          ? {
              ...baseCounts,
              ...(type === 'like' ? { like: nextLikes } : {}),
            }
          : v.reactionCounts;
        return {
          ...v,
          myReaction: nextReaction,
          isLiked: nextReaction === 'like',
          likes: nextLikes,
          reactionCounts: nextCounts,
        };
      })
    );

    try {
      const response = await apiClient.post(`/videos/${videoId}/like`, { type });
      if ((reactionRequestSeqRef.current.get(videoId) ?? 0) !== requestSeq) {
        return;
      }
      const data = response.data?.data || response.data;
      const counts = (data?.reaction_counts || {}) as Record<string, number>;
      const total = Object.values(counts).reduce((s, x) => s + (Number(x) || 0), 0);
      const reaction = data?.reaction ?? null;
      setVideos((prev) =>
        prev.map((v) =>
          v.id === videoId
            ? {
                ...v,
                reactionCounts: counts,
                myReaction: reaction,
                isLiked: reaction === 'like',
                viewerStateFromApi: true,
                likes: total > 0 ? total : v.likes,
              }
            : v
        )
      );
    } catch (err: unknown) {
      if ((reactionRequestSeqRef.current.get(videoId) ?? 0) !== requestSeq) {
        return;
      }
      const previous = previousRef.current;
      if (previous) {
        setVideos((prev) => prev.map((v) => (v.id === videoId ? previous : v)));
      }
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        promptLoginForAction('réagir');
        return;
      }
      Alert.alert('Réaction', 'Impossible d’enregistrer la réaction.');
    }
  }, [isAuthenticated, promptLoginForAction]);

  const handlePlaybackScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (Date.now() < likeScrollLockUntilRef.current) return;
      const h = feedItemHeight;
      if (h <= 0) return;
      const len = videosRef.current.length;
      if (len === 0) return;
      const y = Math.max(0, e.nativeEvent.contentOffset.y);
      const idx = Math.min(len - 1, Math.max(0, Math.floor((y + h * 0.5) / h)));
      setPlaybackIndex((prev) => (prev === idx ? prev : idx));
    },
    [feedItemHeight]
  );

  const lastViewedVideoIdRef = useRef<string | null>(null);
  useEffect(() => {
    lastViewedVideoIdRef.current = null;
  }, [activeTab]);

  /** View / analytics uniquement — pas pour `isActive` (trop lent pour couper l’audio). */
  const viewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 3000,
  });

  const onViewableItemsChanged = useRef(
    (info: { viewableItems: ViewToken<Video>[]; changed: ViewToken<Video>[] }) => {
      const { viewableItems } = info;
      if (viewableItems.length === 0) return;
      const idx = viewableItems[0].index ?? 0;
      const list = videosRef.current;
      const video = list[idx];
      if (!video) return;
      if (lastViewedVideoIdRef.current === video.id) return;
      lastViewedVideoIdRef.current = video.id;
      void apiClient
        .post(`/videos/${video.id}/view`, {
          // Backend compte la vue a partir de >=3s ou >=25%.
          watchSeconds: 3,
          watchPercent: 25,
          scrollSlow: true,
          interactionDetected: true,
        })
        .then((res) => {
          const data = res.data?.data ?? res.data;
          const nextViews = Number(data?.views);
          if (!Number.isFinite(nextViews) || nextViews <= 0) return;
          setVideos((prev) =>
            prev.map((v) =>
              v.id === video.id ? { ...v, views: Math.max(Number(v.views) || 0, nextViews) } : v,
            ),
          );
        })
        .catch(() => {});
    }
  );

  /** Extrait les vidéos du feed combiné PWA (`/api/feed` → `items[].type === 'video'`). */
  const extractVideosFromFeedItems = (items: unknown[]): any[] => {
    if (!Array.isArray(items)) return [];
    const out: any[] = [];
    for (const it of items) {
      const row = it as { type?: string; video?: any };
      if (row?.type === 'video' && row.video && typeof row.video === 'object') {
        out.push(row.video);
      }
    }
    return out;
  };

  const transformVideo = useCallback((v: any): Video => {
    const nameParts = (v.creator_name || v.creator?.full_name || '').split(' ');
    const preferLow = shouldPreferLowQualityPlayback(effectiveDataSaver, isOnCellular);
    const adaptiveFirstMobile = Platform.OS !== 'web' && !preferLow;
    const playUrl = pickWebPlaybackUrl(v as Record<string, unknown>, preferLow, adaptiveFirstMobile);
    const rawThumb =
      [v.thumbnail_url, v.poster_url, v.cover_url, v.preview_image_url]
        .map((x: unknown) => (typeof x === 'string' ? x.trim() : ''))
        .find((s) => s.length > 0) || '';
    const thumbAbs = rawThumb ? toAbsoluteMediaUrl(rawThumb) : '';
    const thumbnailUrl =
      rawThumb && !isLikelyVideoFileUrl(thumbAbs || rawThumb) ? rawThumb : '';
    const rc =
      v.reaction_counts && typeof v.reaction_counts === 'object' && !Array.isArray(v.reaction_counts)
        ? (v.reaction_counts as Record<string, number>)
        : null;
    const myR = (v.current_user_reaction ?? v.my_reaction ?? null) as string | null;
    const viewerStateFromApi =
      v.is_liked !== undefined ||
      v.current_user_reaction !== undefined ||
      v.my_reaction !== undefined ||
      v.is_saved !== undefined;
    const remixCredit =
      v.remix_credit?.creator?.username ||
      v.remix_credit?.creator?.full_name ||
      v.remix_of_creator_name ||
      null;
    return {
      id: v.id,
      title: v.title || '',
      description: v.description || '',
      videoUrl: playUrl,
      thumbnailUrl,
      trimStartSec: typeof v.trim_start_sec === 'number' ? v.trim_start_sec : null,
      trimEndSec: typeof v.trim_end_sec === 'number' ? v.trim_end_sec : null,
      duration: v.duration || 0,
      views: Number(v.views ?? v.qualified_views_count ?? v.view_count ?? v.views_count) || 0,
      likes: v.likes || 0,
      comments: v.comments_count || 0,
      shares: v.shares || 0,
      isLiked: Boolean(v.is_liked ?? myR === 'like'),
      isSaved: Boolean(v.is_saved),
      hashtags: v.hashtags || [],
      user: {
        id: v.creator_id || v.creator?.id || '',
        firstName: nameParts[0] || 'Utilisateur',
        lastName: nameParts.slice(1).join(' ') || '',
        avatar: toAbsoluteMediaUrl((v.creator_avatar || v.creator?.profile_image || '').trim()).trim(),
        username: (v.creator?.username || v.creator_username || '').trim(),
        isFollowing: Boolean(v.creator?.is_following ?? v.is_following),
        isSelf: Boolean(currentUserId && (v.creator_id || v.creator?.id || '') === currentUserId),
      },
      music: v.music_title || 'Son original',
      isSponsored: v.is_sponsored || v.isSponsored || false,
      dataSaverLowQuality: preferLow && Boolean(v.low_quality_playback_url || v.low_quality_url),
      reactionCounts: rc,
      myReaction: myR,
      viewerStateFromApi,
      commentsDisabled: Boolean(v.comments_disabled),
      remixCreditName: remixCredit ? String(remixCredit).replace(/^@/, '') : null,
      remixKind: typeof v.remix_kind === 'string' ? v.remix_kind : null,
      mediaType: String(v.media_type || 'video').toLowerCase() === 'photo' ? 'photo' : 'video',
      progressiveCacheUrl: pickProgressivePlaybackUrl(v as Record<string, unknown>, true),
    };
  }, [effectiveDataSaver, isOnCellular, currentUserId]);

  const feedTabKey = activeTab as FeedTabKey;

  const buildWarmItems = useCallback(
    (list: Video[]) =>
      list.map((v) => ({
        id: v.id,
        progressiveUrl:
          (v.progressiveCacheUrl || '').trim() ||
          (isProgressiveVideoUrl(v.videoUrl) ? v.videoUrl.trim() : ''),
      })),
    [],
  );

  const autoWarmFeedList = useCallback(
    (list: Video[], focusIndex: number) => {
      if (Platform.OS === 'web' || list.length === 0) return;
      feedVideoOfflineCache.warmFeedPage(buildWarmItems(list), focusIndex, {
        effectiveDataSaver,
        isOnCellular,
      });
    },
    [buildWarmItems, effectiveDataSaver, isOnCellular],
  );

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const sub = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setFeedOfflineMode(offline);
    });
    return () => sub();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' || videos.length === 0) return;
    autoWarmFeedList(videosRef.current, playbackIndex);
  }, [playbackIndex, autoWarmFeedList, videos.length]);

  /** Perte réseau en cours de session : bascule auto sur fichiers locaux (sans action utilisateur). */
  useEffect(() => {
    if (Platform.OS === 'web' || !feedOfflineMode || videos.length === 0) return;
    void feedVideoOfflineCache
      .hydrateLocalPlaybackUrls(videosRef.current as FeedSnapshotVideo[])
      .then((hydrated) => {
        setVideos(hydrated as Video[]);
        void feedVideoOfflineCache
          .countOfflinePlayable(hydrated.map((v) => v.id))
          .then(setFeedOfflinePlayableCount);
      });
  }, [feedOfflineMode, videos.length]);

  const loadFeed = async (
    pageNum: number = 1,
    reset: boolean = false,
    options?: { keepExistingOnReset?: boolean }
  ) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      setFeedEmptyMessage(null);

      if (reset && Platform.OS !== 'web') {
        const deviceOffline = await feedVideoOfflineCache.isDeviceOffline();
        const snap = await feedVideoOfflineCache.loadFeedSnapshot(feedTabKey);
        let prepared: FeedSnapshotVideo[] = [];
        if (snap?.videos?.length) {
          prepared = deviceOffline
            ? await feedVideoOfflineCache.filterOfflinePlayable(snap.videos as FeedSnapshotVideo[])
            : await feedVideoOfflineCache.hydrateLocalPlaybackUrls(snap.videos as FeedSnapshotVideo[]);
          if (prepared.length > 0) {
            setVideos(prepared as Video[]);
            setPage(snap.page);
            setHasMore(snap.hasMore);
            setFeedOfflineMode(deviceOffline);
            const playableN = await feedVideoOfflineCache.countOfflinePlayable(prepared.map((v) => v.id));
            setFeedOfflinePlayableCount(playableN);
            if (!deviceOffline) {
              autoWarmFeedList(prepared as Video[], playbackIndexRef.current);
            }
          }
          if (deviceOffline) {
            if (!prepared.length) {
              setVideos(FALLBACK_VIDEOS);
              setFeedEmptyMessage(
                'Patience : les vidéos se préparent toutes seules. Laissez l’accueil ouvert quelques secondes avec Internet, puis réessayez.',
              );
            }
            return;
          }
        }
      }
      let backendVideos: any[] = [];
      let pagination: { totalPages?: number } | undefined;
      /** Pour « Pour toi » : nombre d’items renvoyés (vidéo + pub + bannière), pour heuristique `hasMore`. */
      let rawFeedItemCount = 0;

      if (activeTab === 'foryou') {
        const params: Record<string, string | number> = { page: pageNum, limit: feedPageLimit };
        if (pageNum === 1 && shouldBustFeedCacheOnFirstPage()) {
          params._ = Date.now();
        }
        const response = await apiClient.get('/feed', { params });
        const pkg = response.data?.data || response.data;
        const items = pkg?.items || [];
        rawFeedItemCount = Array.isArray(items) ? items.length : 0;
        backendVideos = extractVideosFromFeedItems(items);
        pagination = pkg?.pagination;
      } else if (activeTab === 'apprendre') {
        /** Fil thématique : éducation / science / tech (preset backend `/videos/topic/apprendre`). */
        const response = await apiClient.get('/videos/topic/apprendre', {
          params: { page: pageNum, limit: feedPageLimit },
        });
        const data = response.data?.data || response.data;
        backendVideos = data?.videos || [];
        pagination = data?.pagination;
        rawFeedItemCount = backendVideos.length;
      } else if (activeTab === 'diversified') {
        /** Fil « Explorer » — vidéos hors bulle utilisateur (créateurs non suivis). */
        const response = await apiClient.get('/videos/diversified', {
          params: { page: pageNum, limit: feedPageLimit },
        });
        const data = response.data?.data || response.data;
        backendVideos = data?.videos || [];
        pagination = data?.pagination;
        rawFeedItemCount = backendVideos.length;
      } else {
        const response = await apiClient.get('/videos', {
          params: {
            page: pageNum,
            limit: feedPageLimit,
            following_only: 1,
          },
        });
        const data = response.data?.data || response.data;
        backendVideos = data?.videos || [];
        pagination = data?.pagination;
        rawFeedItemCount = backendVideos.length;
      }

      if (backendVideos.length > 0) {
        const transformed = backendVideos.map(transformVideo);
        const hydrated =
          Platform.OS === 'web'
            ? transformed
            : await feedVideoOfflineCache.hydrateLocalPlaybackUrls(transformed as FeedSnapshotVideo[]);
        if (Platform.OS !== 'web') {
          autoWarmFeedList(hydrated as Video[], reset ? 0 : playbackIndexRef.current);
        }
        setFeedOfflineMode(false);
        if (reset) {
          const keepExistingOnReset = options?.keepExistingOnReset === true;
          setVideos((prev) => {
            const prevById = new Map(prev.map((v) => [v.id, v]));
            if (!keepExistingOnReset || prev.length === 0) {
              refreshOutcomeRef.current = { hadNewTop: true, keepIndex: 0 };
              return hydrated.map((v) => mergeFeedVideoInteraction(v, prevById.get(v.id)));
            }
            const prevTopId = prev[0]?.id ?? null;
            const prevIds = new Set(prev.map((v) => v.id));
            const hasNewInFreshBatch = hydrated.some((v) => !prevIds.has(v.id));
            const merged: Video[] = hydrated.map((v) => mergeFeedVideoInteraction(v, prevById.get(v.id)));
            const mergedIds = new Set(merged.map((v) => v.id));
            for (const old of prev) {
              if (!mergedIds.has(old.id)) {
                merged.push(old);
                mergedIds.add(old.id);
              }
            }
            const hadNewTop = Boolean(merged[0]?.id && merged[0]?.id !== prevTopId && hasNewInFreshBatch);
            const { list: capped, anchorIndex: capIdx } = capFeedVideosForMemory(merged, playbackIndexRef.current);
            refreshOutcomeRef.current = {
              hadNewTop,
              keepIndex: Math.min(capIdx, Math.max(0, capped.length - 1)),
            };
            if (capIdx !== playbackIndexRef.current) {
              playbackIndexRef.current = capIdx;
              queueMicrotask(() => {
                setPlaybackIndex(capIdx);
                lastSettledPlaybackIndexRef.current = capIdx;
              });
            }
            return capped;
          });
        } else {
          setVideos((prev) => {
            const prevById = new Map(prev.map((v) => [v.id, v]));
            const incoming = hydrated
              .filter((v) => !prevById.has(v.id))
              .map((v) => mergeFeedVideoInteraction(v, prevById.get(v.id)));
            const merged = [...prev, ...incoming];
            const { list, anchorIndex } = capFeedVideosForMemory(merged, playbackIndexRef.current);
            if (anchorIndex !== playbackIndexRef.current) {
              playbackIndexRef.current = anchorIndex;
              queueMicrotask(() => {
                setPlaybackIndex(anchorIndex);
                lastSettledPlaybackIndexRef.current = anchorIndex;
              });
            }
            return list;
          });
        }
        setPage(pageNum);
        const totalPages =
          pagination?.totalPages != null && Number.isFinite(Number(pagination.totalPages))
            ? Number(pagination.totalPages)
            : null;
        const moreByPagination = totalPages != null && pageNum < totalPages;
        /** Page « pleine » côté API → il peut y avoir une suite même si `totalPages` est absent. */
        const fullPageSlots =
          activeTab === 'foryou' ? rawFeedItemCount >= feedPageLimit : rawFeedItemCount >= feedPageLimit;
        const moreByHeuristic = totalPages == null && fullPageSlots;
        const hasMoreNext = Boolean(moreByPagination || moreByHeuristic);
        setHasMore(hasMoreNext);
        if (Platform.OS !== 'web') {
          void feedVideoOfflineCache.saveFeedSnapshot(
            feedTabKey,
            hydrated as FeedSnapshotVideo[],
            pageNum,
            hasMoreNext,
          );
        }
      } else if (reset) {
        setVideos(FALLBACK_VIDEOS);
        setHasMore(false);
        setFeedEmptyMessage(
          activeTab === 'foryou'
            ? 'Aucune vidéo dans ce fil. Tirez pour actualiser.'
            : activeTab === 'apprendre'
              ? 'Aucune vidéo éducative à afficher. Changez de fil ou actualisez.'
              : 'Aucune vidéo des comptes que vous suivez. Suivez des créateurs depuis leur profil pour enrichir ce fil.'
        );
      } else {
        setHasMore(false);
      }
    } catch (err) {
      devLog('Feed vidéo indisponible', err);
      if (reset) {
        if (Platform.OS !== 'web') {
          const snap = await feedVideoOfflineCache.loadFeedSnapshot(feedTabKey);
          if (snap?.videos?.length) {
            const playable = await feedVideoOfflineCache.filterOfflinePlayable(
              snap.videos as FeedSnapshotVideo[],
            );
            if (playable.length > 0) {
              setVideos(playable as Video[]);
              setPage(snap.page);
              setHasMore(false);
              setFeedOfflineMode(true);
              setFeedEmptyMessage(null);
              setFeedOfflinePlayableCount(playable.length);
              return;
            }
          }
        }
        setVideos(FALLBACK_VIDEOS);
        const msg = (err as any)?.response?.data?.error?.message || (err as any)?.message;
        setFeedEmptyMessage(
          msg
            ? `Impossible de charger les vidéos : ${String(msg).slice(0, 120)}`
            : 'Impossible de joindre l’API (vérifiez que le serveur tourne et l’URL dans la config Expo). Après une migration base, exécutez aussi prisma migrate deploy.'
        );
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadFeedRef = useRef(loadFeed);
  loadFeedRef.current = loadFeed;

  useEffect(() => {
    setPlaybackIndex(0);
    lastSettledPlaybackIndexRef.current = 0;
    void loadFeed(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recharger le fil au changement d’onglet ou mode économie
  }, [activeTab, effectiveDataSaver]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadFeed(page + 1, false);
    }
  };

  const onRefresh = useCallback((fromTabPress: boolean = false) => {
    setRefreshing(true);
    pollFetchedRef.current.clear();
    setPollByVideoId({});
    void refreshLiveHubHint();
    loadFeedRef.current(1, true, { keepExistingOnReset: true })
      .then(() => {
        if (!fromTabPress) return;
        const nextIndex = refreshOutcomeRef.current.hadNewTop ? 0 : refreshOutcomeRef.current.keepIndex;
        try {
          listRef.current?.scrollToOffset({ offset: nextIndex * feedItemHeight, animated: true });
        } catch {
          /* no-op */
        }
        setPlaybackIndex(nextIndex);
        lastSettledPlaybackIndexRef.current = nextIndex;
        feedGestureStartIndexRef.current = nextIndex;
      })
      .finally(() => setRefreshing(false));
  }, [refreshLiveHubHint]);

  useEffect(() => {
    const nav = navigation as { addListener: (ev: string, cb: () => void) => () => void };
    const unsub = nav.addListener('tabPress', () => {
      if (!isScreenFocused) return;
      if (!refreshing) onRefresh(true);
    });
    return unsub;
  }, [navigation, isScreenFocused, refreshing, onRefresh]);

  const handleLike = useCallback((videoId: string) => {
    const now = Date.now();
    const last = likeTapDebounceRef.current.get(videoId) ?? 0;
    if (now - last < 120) return;
    likeTapDebounceRef.current.set(videoId, now);
    likeScrollLockUntilRef.current = Date.now() + 400;
    void handleVideoReaction(videoId, 'like');
  }, [handleVideoReaction]);

  const handleDoubleTapLike = useCallback((videoId: string) => {
    const now = Date.now();
    const last = likeTapDebounceRef.current.get(videoId) ?? 0;
    if (now - last < 120) return;
    likeTapDebounceRef.current.set(videoId, now);
    likeScrollLockUntilRef.current = Date.now() + 400;
    void handleVideoReaction(videoId, 'like');
  }, [handleVideoReaction]);

  const handleSave = async (videoId: string) => {
    if (!isAuthenticated) {
      promptLoginForAction('sauvegarder');
      return;
    }
    const target = videos.find(v => v.id === videoId);
    const nextSaved = !(target?.isSaved ?? false);
    setVideos(prev => prev.map(v => v.id === videoId ? { ...v, isSaved: !v.isSaved } : v));
    try {
      const response = await apiClient.post('/saves', { video_id: videoId });
      const data = response.data?.data || response.data;
      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, isSaved: Boolean(data.saved) } : v));
    } catch {
      await offlineActionSyncService.enqueue('save_video', videoId, { saved: nextSaved });
    }
  };

  const handleFollow = async (userId: string) => {
    if (!isAuthenticated) {
      promptLoginForAction('suivre ce créateur');
      return;
    }
    if (!userId) return;
    if (currentUserId && userId === currentUserId) return;
    // Optimistic update
    const target = videos.find(v => v.user.id === userId);
    const nextFollowing = !(target?.user.isFollowing ?? false);
    setVideos(prev => prev.map(v => v.user.id === userId ? { ...v, user: { ...v.user, isFollowing: !v.user.isFollowing } } : v));
    try {
      const response = await apiClient.post(`/users/${userId}/wonder`);
      const data = response.data?.data || response.data;
      const inWonder = Boolean(data?.inWonder ?? data?.following);
      setVideos(prev =>
        prev.map((v) =>
          v.user.id === userId ? { ...v, user: { ...v.user, isFollowing: inWonder } } : v
        )
      );
    } catch {
      await offlineActionSyncService.enqueue('follow_user', userId, { following: nextFollowing });
    }
  };

  const handleShare = async (videoId: string) => {
    if (!isAuthenticated) {
      promptLoginForAction('partager');
      return;
    }
    const video = videos.find(v => v.id === videoId);
    setShareData({
      title: video?.title || 'Vidéo AfriWonder',
      message: video?.description || 'Regarde cette vidéo sur AfriWonder !',
      url: getVideoSharePageUrl(videoId),
    });
    if (video) {
      setShareVideo({
        id: video.id,
        title: video.title,
        description: video.description,
        videoUrl: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl,
        username: video.user.username,
        creatorName: `${video.user.firstName} ${video.user.lastName}`.trim(),
        creatorAvatar: video.user.avatar,
      });
    } else {
      setShareVideo(null);
    }
    setShareVisible(true);
    try { await apiClient.post(`/videos/${videoId}/share`); } catch {}
  };

  const handleReport = (videoId: string) => {
    setReportTarget({ type: 'video', id: videoId });
    setReportVisible(true);
  };

  const openHashtagSearch = useCallback((rawTag: string) => {
    const t = String(rawTag || '')
      .trim()
      .replace(/^#+/, '');
    if (!t) return;
    router.push({ pathname: '/search', params: { q: `#${t}` } });
  }, []);

  const openComments = (videoId: string, count: number, creatorId?: string | null) => {
    if (!isAuthenticated) {
      promptLoginForAction('commenter');
      return;
    }
    setSelectedVideoId(videoId);
    setSelectedVideoCreatorId(creatorId ?? null);
    setSelectedVideoComments(count);
    setCommentsVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* Header : accueil (TikTok 4 onglets) / Ami(e)s / Explorer standalone */}
      {amisStandalone ? (
        <View style={[styles.header, { paddingTop: feedHeaderTopPad, paddingBottom: 6 }]}>
          <View style={styles.headerRow}>
            <Text style={styles.friendsHeaderTitle} accessibilityRole="header">
              Ami(e)s
            </Text>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => router.push('/(tabs)/explore')}
                accessibilityRole="button"
                accessibilityLabel="Explorer"
              >
                <Ionicons name="compass-outline" size={22} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity testID="notifications-button" style={styles.headerIconBtn} onPress={() => router.push('/notifications')}>
                <Ionicons name="notifications-outline" size={22} color="#FFF" />
                <View style={styles.headerNotifDot} />
              </TouchableOpacity>
              <TouchableOpacity testID="search-button" style={styles.headerIconBtn} onPress={() => router.push('/search')}>
                <Ionicons name="search" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : diversifiedStandalone ? (
        <View style={[styles.header, { paddingTop: feedHeaderTopPad, paddingBottom: 6 }]}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.friendsHeaderTitle} accessibilityRole="header">
                Explorer
              </Text>
              <Text style={styles.diversifiedSubtitle}>Sortez de votre bulle habituelle</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => router.push('/discover' as never)}
                accessibilityRole="button"
                accessibilityLabel="Découvrir — tendances"
              >
                <Ionicons name="flame-outline" size={22} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity testID="search-button" style={styles.headerIconBtn} onPress={() => router.push('/search')}>
                <Ionicons name="search" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <View style={[styles.header, { paddingTop: feedHeaderTopPad, paddingBottom: 6 }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                testID="live-hub-button"
                style={styles.headerLiveTiktokWrap}
                onPress={() => router.push('/live')}
                onLongPress={() => router.push('/settings/data-saver')}
                delayLongPress={500}
                accessibilityLabel={
                  liveHubHasStreams
                    ? 'Live — directs en cours (long press: data saver)'
                    : 'Live — hub (long press: data saver)'
                }
              >
                <View style={styles.headerLiveTvFrame}>
                  <Text style={styles.headerLiveTvLabel}>LIVE</Text>
                </View>
                {liveHubHasStreams ? <View style={styles.headerLiveOnAirDot} /> : null}
              </TouchableOpacity>
            </View>
            <View style={styles.headerTabs}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Apprendre — éducation, science, technologie"
                style={styles.headerTabTight}
                onPress={() => setActiveTab('apprendre')}
              >
                <Text
                  style={[
                    styles.headerTabTextTiktok,
                    activeTab === 'apprendre' && styles.headerTabTextTiktokActive,
                  ]}
                >
                  Apprendre
                </Text>
                {activeTab === 'apprendre' ? <View style={styles.headerTabUnderline} /> : null}
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Explorer — contenus suggérés à découvrir"
                style={styles.headerTabTight}
                onPress={() => router.push('/(tabs)/explore')}
              >
                <Text style={styles.headerTabTextTiktok}>Explorer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Abonnements"
                style={styles.headerTabTight}
                onPress={() => setActiveTab('following')}
              >
                <Text style={[styles.headerTabTextTiktok, activeTab === 'following' && styles.headerTabTextTiktokActive]}>
                  Wonder
                </Text>
                {activeTab === 'following' ? <View style={styles.headerTabUnderline} /> : null}
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Pour toi"
                style={styles.headerTabTight}
                onPress={() => setActiveTab('foryou')}
              >
                <Text style={[styles.headerTabTextTiktok, activeTab === 'foryou' && styles.headerTabTextTiktokActive]}>For You</Text>
                {activeTab === 'foryou' ? <View style={styles.headerTabUnderline} /> : null}
              </TouchableOpacity>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity testID="search-button" style={styles.headerIconBtn} onPress={() => router.push('/search')}>
                <Ionicons name="search-outline" size={26} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {activeTab === 'following' && !amisStandalone && !diversifiedStandalone ? (
        <View style={{ marginTop: wonderStoriesBarTopMargin }}>
          <FollowingStoriesBar />
        </View>
      ) : null}

      {feedOfflineMode && Platform.OS !== 'web' ? (
        <View style={styles.feedOfflineBanner} accessibilityRole="text">
          <Ionicons name="cloud-offline" size={16} color="#FFF" />
          <Text style={styles.feedOfflineBannerText}>
            {feedOfflinePlayableCount > 0
              ? `Hors ligne — ${feedOfflinePlayableCount} vidéo${feedOfflinePlayableCount > 1 ? 's' : ''} prêtes`
              : 'Hors ligne — préparation automatique en cours'}
          </Text>
        </View>
      ) : null}

      <View style={styles.feedListClip}>
        <View style={styles.feedListInner}>
        {Platform.OS === 'web' ? (
          <FlatList<Video>
            ref={listRef as React.RefObject<FlatList<Video>>}
            style={styles.feedList}
            data={videos}
            onLayout={onListLayout}
            renderItem={({ item }: { item: Video }) => (
              <VideoItem
                video={item}
                slideHeight={feedItemHeight}
                isAuthenticated={isAuthenticated}
                isActive={playbackAllowed && item.id === activeVideoId}
                onLike={() => handleLike(item.id)}
                onDoubleTapLike={() => handleDoubleTapLike(item.id)}
                onComment={() => openComments(item.id, item.comments, item.user?.id)}
                onShare={() => handleShare(item.id)}
                onSave={() => handleSave(item.id)}
                onFollow={() => handleFollow(item.user.id)}
                onReport={() => handleReport(item.id)}
                onOpenProfile={() => {
                  if (!item.user.id) return;
                  router.push({ pathname: '/user/[id]', params: { id: item.user.id } });
                }}
                onOpenSound={() => openSoundPage(item)}
                onOpenHashtag={openHashtagSearch}
                tapToPlayOnly={tapToPlayOnlyEffective}
                reduceAnimations={reduceAnimations}
                pollState={pollByVideoId[item.id]}
                pollVoting={pollVoteVideoId === item.id}
                onPollVote={(idx) => void votePoll(item.id, idx)}
                onReactionPick={(type) => void handleVideoReaction(item.id, type)}
              />
            )}
            keyExtractor={(item: Video) => item.id}
            showsVerticalScrollIndicator={false}
            pagingEnabled
            decelerationRate="normal"
            bounces={false}
            scrollEventThrottle={32}
            onScroll={handlePlaybackScroll}
            removeClippedSubviews={false}
            windowSize={feedScrollTuning.windowSize}
            initialNumToRender={2}
            maxToRenderPerBatch={feedScrollTuning.maxToRenderPerBatch}
            updateCellsBatchingPeriod={feedScrollTuning.updateCellsBatchingPeriod}
            getItemLayout={(_, index) => {
              const h = Math.max(1, feedItemHeight);
              return { length: h, offset: h * index, index };
            }}
            onScrollBeginDrag={onFeedScrollBeginDrag}
            onScrollEndDrag={onFeedScrollEndDrag}
            onMomentumScrollEnd={onFeedMomentumScrollEnd}
            viewabilityConfig={viewabilityConfigRef.current}
            onViewableItemsChanged={onViewableItemsChanged.current}
            onEndReached={loadMore}
            onEndReachedThreshold={feedScrollTuning.onEndReachedThreshold}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            ListEmptyComponent={
              loading ? null : (
                <View
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: height - 100,
                    paddingHorizontal: 28,
                  }}
                >
                  <Ionicons
                    name={activeTab === 'following' ? 'people-outline' : 'videocam-outline'}
                    size={60}
                    color="rgba(255,255,255,0.3)"
                    accessibilityHidden
                  />
                  <Text style={{ color: 'rgba(255,255,255,0.75)', marginTop: 16, fontSize: 17, fontWeight: '700', textAlign: 'center' }}>
                    {activeTab === 'following'
                      ? 'Suivez des créateurs pour voir leur contenu ici'
                      : t('feed.empty.title')}
                  </Text>
                  {feedEmptyMessage ? (
                    <Text
                      style={{
                        color: 'rgba(255,255,255,0.45)',
                        marginTop: 12,
                        fontSize: 13,
                        textAlign: 'center',
                        lineHeight: 20,
                      }}
                    >
                      {feedEmptyMessage}
                    </Text>
                  ) : null}
                  {activeTab === 'following' ? (
                    <TouchableOpacity
                      style={{
                        marginTop: 20,
                        paddingVertical: 12,
                        paddingHorizontal: 28,
                        backgroundColor: Colors.primary,
                        borderRadius: 24,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                      }}
                      onPress={() => router.push('/(tabs)/explore')}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="compass" size={18} color="#000" />
                      <Text style={{ color: '#000', fontWeight: '800', fontSize: 14 }}>Explorer</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={{
                        marginTop: 20,
                        paddingVertical: 12,
                        paddingHorizontal: 24,
                        backgroundColor: Colors.primary,
                        borderRadius: 24,
                      }}
                      onPress={() => loadFeed(1, true)}
                      activeOpacity={0.85}
                    >
                      <Text style={{ color: '#000', fontWeight: '700', fontSize: 14 }}>{t('feed.empty.retry')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )
            }
          />
        ) : (
          <ShopifyFlashList
            style={styles.feedList}
            ref={listRef}
            data={videos}
            onLayout={onListLayout}
            renderItem={({ item }: { item: Video; index: number }) => (
              <VideoItem
                video={item}
                slideHeight={feedItemHeight}
                isAuthenticated={isAuthenticated}
                isActive={playbackAllowed && item.id === activeVideoId}
                onLike={() => handleLike(item.id)}
                onDoubleTapLike={() => handleDoubleTapLike(item.id)}
                onComment={() => openComments(item.id, item.comments, item.user?.id)}
                onShare={() => handleShare(item.id)}
                onSave={() => handleSave(item.id)}
                onFollow={() => handleFollow(item.user.id)}
                onReport={() => handleReport(item.id)}
                onOpenProfile={() => {
                  if (!item.user.id) return;
                  router.push({ pathname: '/user/[id]', params: { id: item.user.id } });
                }}
                onOpenSound={() => openSoundPage(item)}
                onOpenHashtag={openHashtagSearch}
                tapToPlayOnly={tapToPlayOnlyEffective}
                reduceAnimations={reduceAnimations}
                pollState={pollByVideoId[item.id]}
                pollVoting={pollVoteVideoId === item.id}
                onPollVote={(idx) => void votePoll(item.id, idx)}
                onReactionPick={(type) => void handleVideoReaction(item.id, type)}
              />
            )}
            keyExtractor={(item: Video) => item.id}
            showsVerticalScrollIndicator={false}
            pagingEnabled={false}
            snapToInterval={feedItemHeight}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum={Platform.OS === 'android'}
            bounces={false}
            overScrollMode="never"
            scrollEventThrottle={feedScrollTuning.scrollEventThrottle}
            onScroll={handlePlaybackScroll}
            onScrollBeginDrag={onFeedScrollBeginDrag}
            onScrollEndDrag={onFeedScrollEndDrag}
            onMomentumScrollEnd={onFeedMomentumScrollEnd}
            estimatedItemSize={feedItemHeight}
            drawDistance={
              feedItemHeight > 0
                ? feedItemHeight * feedScrollTuning.drawDistanceMultiplier
                : 400
            }
            viewabilityConfig={viewabilityConfigRef.current}
            onViewableItemsChanged={onViewableItemsChanged.current}
            onEndReached={loadMore}
            onEndReachedThreshold={feedScrollTuning.onEndReachedThreshold}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            ListEmptyComponent={
              loading ? null : (
                <View
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: height - 100,
                    paddingHorizontal: 28,
                  }}
                >
                  <Ionicons
                    name={activeTab === 'following' ? 'people-outline' : 'videocam-outline'}
                    size={60}
                    color="rgba(255,255,255,0.3)"
                    accessibilityHidden
                  />
                  <Text style={{ color: 'rgba(255,255,255,0.75)', marginTop: 16, fontSize: 17, fontWeight: '700', textAlign: 'center' }}>
                    {activeTab === 'following'
                      ? 'Suivez des créateurs pour voir leur contenu ici'
                      : t('feed.empty.title')}
                  </Text>
                  {feedEmptyMessage ? (
                    <Text
                      style={{
                        color: 'rgba(255,255,255,0.45)',
                        marginTop: 12,
                        fontSize: 13,
                        textAlign: 'center',
                        lineHeight: 20,
                      }}
                    >
                      {feedEmptyMessage}
                    </Text>
                  ) : null}
                  {activeTab === 'following' ? (
                    <TouchableOpacity
                      style={{
                        marginTop: 20,
                        paddingVertical: 12,
                        paddingHorizontal: 28,
                        backgroundColor: Colors.primary,
                        borderRadius: 24,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                      }}
                      onPress={() => router.push('/(tabs)/explore')}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="compass" size={18} color="#000" />
                      <Text style={{ color: '#000', fontWeight: '800', fontSize: 14 }}>Explorer</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={{
                        marginTop: 20,
                        paddingVertical: 12,
                        paddingHorizontal: 24,
                        backgroundColor: Colors.primary,
                        borderRadius: 24,
                      }}
                      onPress={() => loadFeed(1, true)}
                      activeOpacity={0.85}
                    >
                      <Text style={{ color: '#000', fontWeight: '700', fontSize: 14 }}>{t('feed.empty.retry')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )
            }
          />
        )}
        </View>
      </View>

      {loading && videos.length === 0 ? (
        <View style={styles.skeletonLayer} pointerEvents="none">
          <FeedSkeleton slideHeight={feedItemHeight} />
        </View>
      ) : loading && videos.length > 0 ? (
        <View style={styles.loadingOverlay} accessibilityLabel={t('common.loading')}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : null}

      <CommentsModal
        visible={commentsVisible}
        onClose={() => setCommentsVisible(false)}
        videoId={selectedVideoId}
        commentsCount={selectedVideoComments}
        videoCreatorId={selectedVideoCreatorId}
        commentsDisabled={Boolean(videos.find((v) => v.id === selectedVideoId)?.commentsDisabled)}
      />
      <ShareSheet
        visible={shareVisible}
        onClose={() => {
          setShareVisible(false);
          setShareVideo(null);
        }}
        title={shareData.title}
        message={shareData.message}
        url={shareData.url}
        video={shareVideo}
      />
      <ReportModal visible={reportVisible} onClose={() => setReportVisible(false)} targetType={reportTarget.type} targetId={reportTarget.id} useModerationEndpoint />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  feedOfflineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    marginTop: 6,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(40,40,40,0.92)',
    zIndex: 90,
  },
  feedOfflineBannerText: { color: '#E8E8E8', fontSize: 12, fontWeight: '600' },
  header: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: Spacing.lg, zIndex: 100 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  friendsHeaderTitle: { color: '#FFF', fontSize: FontSizes.lg, fontWeight: '800', flex: 1, minWidth: 0 },
  diversifiedSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '500', marginTop: 2 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  /** Entrée Live type TikTok : cadre « écran » avec LIVE dedans. */
  headerLiveTiktokWrap: {
    position: 'relative',
    width: Platform.OS === 'web' ? 48 : 40,
    height: Platform.OS === 'web' ? 36 : 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLiveTvFrame: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.92)',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 4,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  headerLiveTvLabel: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  headerLiveOnAirDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  headerTabs: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: Platform.OS === 'web' ? 2 : 0,
    gap: 2,
  },
  headerTabTight: {
    paddingHorizontal: Platform.OS === 'web' ? 6 : 3,
    paddingVertical: Platform.OS === 'web' ? Spacing.sm : 6,
    alignItems: 'center',
  },
  headerTabTextTiktok: {
    color: 'rgba(255,255,255,0.60)',
    fontSize: Platform.OS === 'web' ? 16 : 13,
    fontWeight: '500',
  },
  headerTabTextTiktokActive: { color: '#FFFFFF', fontWeight: '700' },
  headerTabUnderline: {
    marginTop: 3,
    height: 2,
    width: 20,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 0, flexShrink: 0 },
  headerIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: Platform.OS === 'web' ? 44 : 36,
    minHeight: Platform.OS === 'web' ? 44 : 36,
    paddingHorizontal: Platform.OS === 'web' ? 4 : 2,
    justifyContent: 'center',
  },
  headerNotifDot: { position: 'absolute', top: 2, right: 2, width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#FF3D00', borderWidth: 1, borderColor: '#000' },
  feedListClip: { flex: 1, overflow: 'hidden', backgroundColor: '#000' },
  feedListInner: { flex: 1, minHeight: 0 },
  feedList: { flex: 1, overflow: 'hidden', backgroundColor: '#000' },
  /** `width: 100 %` évite un écart vs la cellule FlashList (sous-pixels) qui montrait les bords des slides voisines. */
  videoContainer: { width: '100%', alignSelf: 'stretch', position: 'relative', backgroundColor: '#000', overflow: 'hidden' },
  videoWrapper: { flex: 1, overflow: 'hidden', position: 'relative' },
  /** Couche tactile au-dessus du lecteur natif (Android/iOS ne remontent pas les taps depuis VideoView). */
  videoTapTarget: { ...StyleSheet.absoluteFillObject, zIndex: 2 },
  video: { width: '100%', height: '100%' },
  pauseOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  pauseCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  heartAnimation: { position: 'absolute', alignSelf: 'center', top: '35%' },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  bottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 250 },
  pollOverlay: { position: 'absolute', left: Spacing.md, right: 86, zIndex: 18, elevation: 18 },
  reactionsTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.pill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  reactionsTriggerText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  reactionsTriggerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: 2,
  },
  similarPill: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: 'rgba(28,28,28,0.78)',
    zIndex: 24,
    elevation: 24,
  },
  similarPillIconBox: {
    width: 26,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  similarPillText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  similarModalRoot: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)' },
  /** Colonne : aperçu au-dessus, feuille en bas (évite que `flex:1` sur l’aperçu écrase la grille sur le web). */
  similarModalColumn: { flex: 1, justifyContent: 'flex-end' },
  similarModalPreviewArea: {
    flex: 1,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  similarModalClose: { position: 'absolute', left: 16, top: 48, zIndex: 30, padding: 8 },
  similarPreviewFrame: {
    width: 128,
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.95)',
  },
  similarPreviewCorners: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 0,
  },
  similarPreviewImage: { width: '100%', height: '100%' },
  similarSheet: {
    backgroundColor: '#FAFAFA',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  similarGridScroll: { flex: 1, minHeight: 120 },
  similarGridScrollContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 8,
    rowGap: 14,
    paddingBottom: 24,
    width: '100%',
    maxWidth: 560,
  },
  similarSheetGrab: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
    marginBottom: 10,
  },
  similarSheetTitle: { fontSize: 17, fontWeight: '800', color: '#111', textAlign: 'center' },
  similarSheetSubtitle: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.55)',
    textAlign: 'center',
    marginBottom: 12,
  },
  similarEmpty: { textAlign: 'center', color: '#666', marginTop: 20, fontSize: 14 },
  similarCard: { borderRadius: 10, overflow: 'hidden', backgroundColor: '#FFF' },
  similarCardImage: {
    width: '100%',
    minHeight: 168,
    aspectRatio: 3 / 4,
    backgroundColor: '#EAEAEA',
  },
  similarCardImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  similarCardPlayBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  similarCardTitle: { fontSize: 12, fontWeight: '700', color: '#111', marginTop: 6, paddingHorizontal: 4 },
  similarCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    paddingBottom: 8,
    marginTop: 4,
  },
  similarCardCreator: { fontSize: 11, color: '#444', maxWidth: '55%' },
  similarCardLikes: { fontSize: 11, color: '#666', marginLeft: 2 },
  reactionSheetRoot: { flex: 1, justifyContent: 'flex-end' },
  reactionSheetDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  reactionSheetPanel: {
    backgroundColor: '#141418',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  reactionSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  reactionSheetTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '800' },
  reactionBurst: { position: 'absolute', alignSelf: 'center', top: '32%', left: 0, right: 0, alignItems: 'center', zIndex: 25 },
  reactionBurstEmoji: { fontSize: 56, textAlign: 'center' },
  remixCredit: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: FontSizes.sm,
    fontWeight: '600',
    marginBottom: 4,
  },
  sponsoredBadge: { position: 'absolute', top: 70, left: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,107,0,0.85)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.pill },
  sponsoredText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  actions: { position: 'absolute', right: 10, alignItems: 'center', gap: 16, zIndex: 20, elevation: 20 },
  avatarContainer: { marginBottom: 8 },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#FFF' },
  followBadge: { position: 'absolute', bottom: -6, alignSelf: 'center', width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#000' },
  actionButton: { alignItems: 'center' },
  actionText: { color: '#FFF', fontSize: 12, marginTop: 2, fontWeight: '500', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  musicDisc: { width: 40, height: 40, borderRadius: 20, borderWidth: 6, borderColor: '#333', marginTop: 8, overflow: 'hidden' },
  musicDiscImage: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, overflow: 'hidden' },
  bottomInfo: { position: 'absolute', left: Spacing.lg, right: 70, bottom: 24, zIndex: 20, elevation: 20 },
  brandUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: -8,
    marginBottom: 16,
  },
  brandUserLogo: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  brandUserHandle: {
    color: '#FFF',
    fontSize: FontSizes.lg,
    fontWeight: '800',
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    maxWidth: '80%',
  },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: Spacing.sm },
  username: { color: '#FFF', fontSize: FontSizes.md, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  followBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: 3, borderRadius: BorderRadius.sm },
  followBtnText: { color: '#FFF', fontSize: FontSizes.xs, fontWeight: 'bold' },
  followingTag: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  /** Libellé « Dans ton Wonder » : taille réduite pour tenir sur une ligne. */
  followingTagText: { color: '#FFF', fontSize: 9, fontWeight: '700' as const },
  description: { color: '#FFF', fontSize: FontSizes.md, marginBottom: 6, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  hashtagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  hashtag: { color: '#FFF', fontSize: FontSizes.sm, fontWeight: '600' },
  viewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  viewsText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: FontSizes.sm,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  musicRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  musicText: { color: '#FFF', fontSize: FontSizes.sm, flex: 1 },
  /** Zone tactile large + piste épaisse + thumb (style TikTok / PWA). */
  videoProgressHit: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 45,
    elevation: 45,
    paddingTop: 14,
    paddingBottom: 4,
    justifyContent: 'flex-end',
  },
  videoProgressTrackWrap: {
    width: '100%',
  },
  videoProgressTrack: {
    position: 'relative',
    height: 5,
    width: '100%',
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.38)',
    overflow: 'visible',
  },
  videoProgressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  videoProgressThumb: {
    position: 'absolute',
    top: '50%',
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: -6,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.45)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 6,
  },
  videoProgressThumbScrubbing: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: -8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.95)',
  },
  scrubPreviewContainer: {
    position: 'absolute',
    left: Spacing.lg,
    bottom: 72,
    zIndex: 55,
    elevation: 55,
    alignItems: 'center',
  },
  scrubPreviewFrame: {
    width: 92,
    height: 148,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.95)',
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  scrubPreviewVideo: { width: '100%', height: '100%' },
  scrubPreviewTimeText: {
    marginTop: 6,
    color: '#FFF',
    fontSize: FontSizes.sm,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  skeletonLayer: { ...StyleSheet.absoluteFillObject, zIndex: 4, backgroundColor: Colors.background },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  shareHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  commentsContainer: { backgroundColor: Colors.surface || '#1a1a2e', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: height * 0.7, minHeight: height * 0.5 },
  commentsHeader: { alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  commentsTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '600', marginTop: Spacing.sm },
  commentsList: { flex: 1, paddingHorizontal: Spacing.lg },
  commentItem: { flexDirection: 'row', paddingVertical: Spacing.md, gap: Spacing.md },
  commentAvatar: { width: 36, height: 36, borderRadius: 18 },
  commentContent: { flex: 1 },
  commentUser: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: '600', marginBottom: 2 },
  commentText: { color: Colors.text, fontSize: FontSizes.md, marginBottom: 4 },
  commentMetaColumn: { gap: 6, alignSelf: 'stretch' },
  commentMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.md },
  commentTime: { color: Colors.textMuted, fontSize: FontSizes.xs },
  commentReply: {},
  commentReplyText: { color: Colors.textSecondary, fontSize: FontSizes.xs, fontWeight: '600' },
  commentLikeBtn: { alignItems: 'center', justifyContent: 'center', gap: 2, alignSelf: 'flex-start' },
  commentLikeCount: { color: Colors.textSecondary, fontSize: 10 },
  commentPinnedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  commentPinnedBadgeText: { color: '#fcd34d', fontSize: 10, fontWeight: '600' },
  commentReactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
    alignSelf: 'stretch',
  },
  commentReactionHit: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  commentReactionHitActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.28)',
    borderRadius: BorderRadius.md,
  },
  commentReactionEmoji: { fontSize: 16 },
  commentInput: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, gap: Spacing.sm },
  commentInputAvatar: { width: 32, height: 32, borderRadius: 16 },
  commentTextInput: { flex: 1, backgroundColor: Colors.card || Colors.background, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, color: Colors.text, fontSize: FontSizes.md, maxHeight: 80 },
  commentVoicePreviewBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    minWidth: 0,
  },
  commentVoicePreviewPlayBtn: { padding: 4 },
  commentVoicePreviewMeta: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: '700', minWidth: 28 },
  commentVoicePreviewInput: { flex: 1, minWidth: 0, maxHeight: 80 },
  commentRecordingBar: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, minHeight: 40 },
  commentRecordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E53935', marginRight: Spacing.sm },
  commentRecordingText: { flex: 1, color: Colors.text, fontSize: FontSizes.sm },
  commentMicBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  commentSendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  commentVoiceBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 8, borderRadius: BorderRadius.md, backgroundColor: 'rgba(255,107,0,0.12)' },
  commentVoiceLabel: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: '600' },
  commentActionMenuOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  commentActionMenuSheet: {
    backgroundColor: Colors.surface || '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 4,
  },
  commentActionMenuRow: { paddingVertical: 16, paddingHorizontal: Spacing.lg },
  commentActionMenuSep: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  commentActionMenuText: { fontSize: FontSizes.md, color: Colors.text, fontWeight: '600' },
  commentEditBlock: { marginBottom: 8 },
  commentEditInput: {
    backgroundColor: Colors.card || Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSizes.md,
    minHeight: 44,
    marginTop: 4,
    textAlignVertical: 'top',
  },
  commentEditActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 8 },
  commentEditBtn: { paddingVertical: 6, paddingHorizontal: 8 },
  commentEditBtnTextMuted: { color: Colors.textMuted, fontWeight: '600' },
  commentEditBtnTextPrimary: { color: Colors.primary, fontWeight: '700' },
});

/** Web : pas de `<video>` pour les posts photo / URLs image (évite erreur média « not suitable »). Déclaré après `styles`. */
function VideoItemWebRaster(props: VideoItemProps) {
  const {
    video,
    slideHeight,
    onLike,
    onDoubleTapLike,
    onComment,
    onShare,
    onSave,
    onFollow,
    onReport,
    onOpenProfile,
    onOpenSound,
    onOpenHashtag,
    reduceAnimations = false,
    pollState,
    pollVoting = false,
    onPollVote,
    onReactionPick,
  } = props;

  const insets = useSafeAreaInsets();
  const lastTap = useRef(0);
  const heartAnim = useRef(new Animated.Value(0)).current;
  const [showHeart, setShowHeart] = useState(false);
  const [reactionsOpen, setReactionsOpen] = useState(false);

  const engagementTotal = useMemo(() => {
    if (video.reactionCounts && Object.keys(video.reactionCounts).length > 0) {
      return Object.values(video.reactionCounts).reduce((a, b) => a + (Number(b) || 0), 0);
    }
    return video.likes;
  }, [video.reactionCounts, video.likes]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const creatorHandle = useMemo(() => {
    const u = (video.user.username || '').trim().replace(/^@+/, '');
    if (u) return `@${u}`;
    const slug = `${(video.user.firstName || '').trim()}${(video.user.lastName || '').trim()}`.replace(/\s+/g, '').slice(0, 14).toLowerCase();
    return slug ? `@${slug}` : '@créateur';
  }, [video.user.username, video.user.firstName, video.user.lastName]);

  const heartFilled = video.myReaction === 'like' || video.isLiked;

  const rawUriCandidate =
    [video.thumbnailUrl, video.videoUrl].find((s) => typeof s === 'string' && String(s).trim().length > 0) || '';
  const uri = toAbsoluteMediaUrl(rawUriCandidate);
  const hasRasterUri = uri.trim().length > 0;

  const itemHeight = slideHeight ?? Math.ceil(Math.max(200, height - TAB_BAR_LAYOUT_HEIGHT - insets.bottom));

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      onDoubleTapLike();
      if (!reduceAnimations) {
        setShowHeart(true);
        Animated.sequence([
          Animated.spring(heartAnim, { toValue: 1, useNativeDriver: true, friction: 3 }),
          Animated.timing(heartAnim, { toValue: 0, duration: 400, delay: 200, useNativeDriver: true }),
        ]).start(() => setShowHeart(false));
      }
    }
    lastTap.current = now;
  };

  const readyPoll: FeedPollPayload | null =
    pollState && typeof pollState === 'object' && !pollState.expired && Array.isArray(pollState.options) && pollState.options.length > 0
      ? pollState
      : null;

  return (
    <View style={[styles.videoContainer, { height: itemHeight }]}>
      <View style={styles.videoWrapper}>
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          {hasRasterUri ? (
            <ExpoImage source={{ uri }} style={styles.video} contentFit="cover" accessibilityIgnoresInvertColors />
          ) : (
            <View style={[styles.video, { backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="image-outline" size={48} color="rgba(255,255,255,0.35)" accessibilityElementsHidden />
            </View>
          )}
        </View>
        <Pressable style={styles.videoTapTarget} onPress={handleTap} accessibilityRole="button" accessibilityLabel="Publication" />
        {showHeart ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.heartAnimation,
              {
                transform: [{ scale: heartAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1.3] }) }],
                opacity: heartAnim,
              },
            ]}
          >
            <Ionicons name="heart" size={100} color={Colors.like} />
          </Animated.View>
        ) : null}
      </View>
      <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.6)', 'transparent']} style={styles.topGradient} />
      <LinearGradient pointerEvents="none" colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.bottomGradient} />

      {readyPoll ? (
        <View style={[styles.pollOverlay, { bottom: Math.max(268, insets.bottom + 278) }]} pointerEvents="box-none">
          <FeedPollCard poll={readyPoll} voting={pollVoting} onVote={onPollVote} />
        </View>
      ) : null}

      {video.isSponsored ? (
        <View style={styles.sponsoredBadge}>
          <Ionicons name="megaphone" size={12} color="#FFF" />
          <Text style={styles.sponsoredText}>Sponsorise</Text>
        </View>
      ) : null}

      <View style={[styles.actions, { bottom: Math.max(40, insets.bottom + 10) }]} pointerEvents="box-none">
        <View style={styles.avatarContainer}>
          <CreatorAvatar
            testID="creator-avatar"
            uri={video.user.avatar}
            username={video.user.username}
            firstName={video.user.firstName}
            lastName={video.user.lastName}
            size={48}
            onPress={video.user.id ? onOpenProfile : undefined}
          />
          {!video.user.isSelf && !video.user.isFollowing ? (
            <TouchableOpacity style={styles.followBadge} onPress={onFollow} accessibilityLabel="Wonder ce créateur" accessibilityRole="button">
              <Ionicons name="add" size={12} color="#FFF" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity style={styles.actionButton} onPress={onLike}>
          <Ionicons name={heartFilled ? 'heart' : 'heart-outline'} size={32} color={heartFilled ? Colors.like : '#FFF'} />
          <Text style={styles.actionText}>{formatNumber(engagementTotal)}</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="comment-button" style={styles.actionButton} onPress={onComment}>
          <Ionicons name="chatbubble-ellipses" size={28} color="#FFF" />
          <Text style={styles.actionText}>{formatNumber(video.comments)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onSave}>
          <Ionicons name={video.isSaved ? 'bookmark' : 'bookmark-outline'} size={28} color={video.isSaved ? Colors.accent : '#FFF'} />
          <Text style={styles.actionText}>{video.isSaved ? 'Sauve' : 'Sauver'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            router.push({ pathname: '/tip', params: { creatorId: video.user.id, creatorName: video.user.firstName, videoId: video.id } } as never);
          }}
        >
          <Ionicons name="gift" size={28} color="#FF6B00" />
          <Text style={styles.actionText}>Soutenir</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="share-button" style={styles.actionButton} onPress={onShare}>
          <Ionicons name="arrow-redo" size={28} color="#FFF" />
          <Text style={styles.actionText}>{formatNumber(video.shares)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onReport}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.85} onPress={onOpenSound} accessibilityRole="button" accessibilityLabel="Voir le son">
          <View style={styles.musicDisc}>
            <View style={styles.musicDiscImage}>
              <CreatorAvatar
                uri={video.user.avatar}
                username={video.user.username}
                firstName={video.user.firstName}
                lastName={video.user.lastName}
                size={28}
                bordered={false}
              />
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomInfo}>
        <TouchableOpacity
          style={styles.brandUserRow}
          onPress={video.user.id ? onOpenProfile : undefined}
          activeOpacity={0.85}
          disabled={!video.user.id}
        >
          <Image source={require('../../assets/images/pwa-icon-192.png')} style={styles.brandUserLogo} resizeMode="cover" />
          <Text style={styles.brandUserHandle} numberOfLines={1}>
            {creatorHandle}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.reactionsTriggerBtn}
          onPress={() => setReactionsOpen(true)}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="Réagir"
        >
          <Ionicons name="happy-outline" size={17} color="rgba(255,255,255,0.95)" />
          <Text style={styles.reactionsTriggerText}>Réagir</Text>
          {video.myReaction && video.myReaction !== 'like' ? <View style={styles.reactionsTriggerDot} /> : null}
        </TouchableOpacity>
        <View style={styles.userRow}>
          {video.user.isSelf ? null : video.user.isFollowing ? (
            <TouchableOpacity style={styles.followingTag} onPress={onFollow} activeOpacity={0.75} accessibilityRole="button">
              <Text style={styles.followingTagText}>Dans ton Wonder</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.followBtn} onPress={onFollow}>
              <Text style={styles.followBtnText}>Wonder</Text>
            </TouchableOpacity>
          )}
        </View>
        {video.remixCreditName ? (
          <Text style={styles.remixCredit} numberOfLines={1}>
            {video.remixKind === 'stitch' ? 'Stitch' : video.remixKind === 'duet' ? 'Duet' : 'Remix'} · @{video.remixCreditName}
          </Text>
        ) : null}
        <Text style={styles.description} numberOfLines={2}>
          {video.description}
        </Text>
        <View style={styles.hashtagsRow}>
          {video.hashtags.map((tag, i) => (
            <TouchableOpacity
              key={`raster-${String(tag)}-${i}`}
              onPress={() => onOpenHashtag(String(tag))}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Text style={styles.hashtag}>#{tag} </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.viewsRow} accessibilityLabel={`${formatNumber(video.views)} vues`}>
          <Ionicons name="eye-outline" size={15} color="rgba(255,255,255,0.92)" />
          <Text style={styles.viewsText}>{formatNumber(video.views)} vues</Text>
        </View>
        <TouchableOpacity style={styles.musicRow} onPress={onOpenSound} activeOpacity={0.85}>
          <Ionicons name="musical-notes" size={14} color="#FFF" />
          <Text style={styles.musicText} numberOfLines={1}>
            {video.music}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={reactionsOpen} transparent animationType="slide" onRequestClose={() => setReactionsOpen(false)}>
        <View style={styles.reactionSheetRoot}>
          <TouchableWithoutFeedback onPress={() => setReactionsOpen(false)}>
            <View style={styles.reactionSheetDim} />
          </TouchableWithoutFeedback>
          <View style={[styles.reactionSheetPanel, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
            <View style={styles.reactionSheetHeader}>
              <Text style={styles.reactionSheetTitle}>Choisir une réaction</Text>
              <TouchableOpacity onPress={() => setReactionsOpen(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel="Fermer">
                <Ionicons name="close" size={26} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <VideoReactionBar
              reactionCounts={video.reactionCounts}
              myReaction={video.myReaction ?? null}
              onPick={async (type) => {
                await onReactionPick(type);
                setReactionsOpen(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
