import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  FlatList,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Pressable,
  Share,
  Alert,
  ActionSheetIOS,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { useAppTheme } from '../../src/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '../../src/api/client';
import { getAlertMessageForCaughtError } from '../../src/utils/userFacingError';
import { useAuthStore } from '../../src/store/authStore';
import { useAgoraLiveRtc } from '../../src/hooks/useAgoraLiveRtc';
import socketService from '../../src/services/socketService';
import { LiveGiftsPanel, useGiftAnimations } from './gifts';
import { LiveTopFansSheet } from './_liveTopFansSheet';
import { tryEnterPictureInPicture } from '../../src/live/liveNativeExtras';
import { resolveLiveJoinGeo } from '../../src/live/liveViewerGeo';
import { profileAvatarUri } from '../../src/utils/avatarFallback';
import { ImageOrPlaceholder } from '../../src/components/common/ImageOrPlaceholder';
import { toAbsoluteMediaUrl } from '../../src/utils/absoluteMediaUrl';
import { useVideoPlayer, VideoView } from 'expo-video';
import FloatingHeartsBurst, { type FloatingHeartsBurstHandle } from '../../src/live/FloatingHeartsBurst';
import LiveShoppingStrip from '../../src/live/LiveShoppingStrip';
import { LivePollStrip } from '../../src/live/LivePollStrip';
import { LiveGoalBar } from '../../src/live/LiveGoalBar';
import { useLiveViewerSession } from '../../src/live/useLiveViewerSession';
import { useLiveCoHostRtc } from '../../src/live/useLiveCoHostRtc';
import { LiveCoHostInviteModal } from '../../src/live/LiveCoHostInviteModal';
import { LiveViewerTipButton, LiveCreatorSubscribeButton } from '../../src/live/LiveViewerMonetization';
import { useLiveBattle } from '../../src/live/useLiveBattle';
import { LiveBattleScoreBar } from '../../src/live/LiveBattleScoreBar';
import { LiveBattleProposedModal } from '../../src/live/LiveBattleProposedModal';
import { LiveBattleSplitLayout } from '../../src/live/LiveBattleSplitLayout';
import { battleSideForViewer } from '../../src/live/liveBattleTypes';
import { useLiveGuests } from '../../src/live/useLiveGuests';
import { LiveGuestGridBadge } from '../../src/live/LiveGuestGridBadge';
import { canAccessPrivateLive, type LiveViewerJoinAccess, liveJoinAccessLabel } from '../../src/live/liveJoinAccess';

const { width, height } = Dimensions.get('window');
const LIVE_REMINDER_KEY = (creatorId: string) => `afw_live_reminder_${creatorId}`;
const CHAT_MAX = 150;
const CHAT_PER_MIN = 5;

function formatCompactCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(Math.round(n));
}

interface LiveMessage {
  id: string;
  text: string;
  is_question?: boolean;
  senderId?: string;
  sender_role?: string;
  is_top_supporter?: boolean;
  user: { name: string; avatar: string };
}

function normalizeLiveId(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) return String(raw[0] ?? '').trim();
  return String(raw ?? '').trim();
}

function mapChatRow(m: Record<string, unknown>): LiveMessage {
  const badges = m.sender_badges as { is_top_supporter?: boolean } | undefined;
  const sid = String(m.sender_id ?? '').trim();
  return {
    id: String(m.id ?? `${Date.now()}-${Math.random()}`),
    text: String(m.message ?? m.text ?? ''),
    is_question: Boolean(m.is_question),
    senderId: sid || undefined,
    sender_role: String(m.sender_role ?? ''),
    is_top_supporter: Boolean(badges?.is_top_supporter),
    user: {
      name: String(m.sender_name ?? m.userName ?? 'Anonyme'),
      avatar: String(m.sender_avatar ?? m.avatar ?? '').trim(),
    },
  };
}

function liveChatViewerColor(m: LiveMessage, creatorId: string | null): string {
  if (creatorId && m.senderId && m.senderId === creatorId) return '#FBBF24';
  if (m.sender_role === 'moderator') return '#60A5FA';
  if (m.is_top_supporter) return '#C084FC';
  return Colors.primary;
}

const REPORT_REASONS = [
  { id: 'spam', label: 'Spam / publicité' },
  { id: 'nudity', label: 'Contenu adulte' },
  { id: 'violence', label: 'Violence' },
  { id: 'harassment', label: 'Harcèlement' },
  { id: 'other', label: 'Autre' },
];

function formatScheduledFr(ms: number): string {
  return new Date(ms).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' });
}

function pickLivePlaybackUrl(live: Record<string, unknown>): string {
  const candidates = [live.playback_url, live.stream_url, live.replay_url]
    .map((s) => String(s || '').trim())
    .filter(Boolean);
  for (const c of candidates) {
    if (c.startsWith('rtmp://') || c.startsWith('rtmps://')) continue;
    const abs = toAbsoluteMediaUrl(c);
    if (abs) return abs;
  }
  return '';
}

function LivePlaybackSurface({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = false;
  });
  return <VideoView style={StyleSheet.absoluteFillObject} player={player} contentFit="cover" nativeControls={false} />;
}

export default function LiveStreamViewerScreen() {
  const insets = useSafeAreaInsets();
  const { colors, mode } = useAppTheme();
  const { id: rawId } = useLocalSearchParams<{ id: string | string[] }>();
  const liveId = useMemo(() => normalizeLiveId(rawId), [rawId]);

  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [topDonors, setTopDonors] = useState<
    { rank?: number; sender_id?: string; user_id?: string; sender_name?: string; total_amount_fcfa?: number; total_amount?: number; user?: { id?: string } }[]
  >([]);
  const [newMessage, setNewMessage] = useState('');
  const [viewers, setViewers] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [showTopFans, setShowTopFans] = useState(false);
  const [loading, setLoading] = useState(true);
  const [streamTitle, setStreamTitle] = useState('Live');
  const [streamerName, setStreamerName] = useState('Créateur');
  const [streamerAvatar, setStreamerAvatar] = useState('');
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [sessionId] = useState(() => `${Date.now()}`);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [ageRestriction, setAgeRestriction] = useState<string>('all');
  const [ageGateOk, setAgeGateOk] = useState(false);
  const [streamStatus, setStreamStatus] = useState<'live' | 'scheduled' | 'ended' | null>(null);
  const [scheduledAtMs, setScheduledAtMs] = useState<number | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [bellOn, setBellOn] = useState(false);
  const [isQuestion, setIsQuestion] = useState(false);
  const [broadcastTimer, setBroadcastTimer] = useState<{ end_at_ms: number; label: string } | null>(null);
  const [, setBroadcastTimerTick] = useState(0);
  const [hostCaptionLine, setHostCaptionLine] = useState<string | null>(null);
  const [showCaptions, setShowCaptions] = useState(true);
  const [privateMode, setPrivateMode] = useState(false);
  const [joinAccess, setJoinAccess] = useState<LiveViewerJoinAccess>('allowed');
  const [joinRequestSending, setJoinRequestSending] = useState(false);
  const [goalAmount, setGoalAmount] = useState(0);
  const [goalTarget, setGoalTarget] = useState(0);
  const [pollSocketBump, setPollSocketBump] = useState<unknown>(null);
  const [creatorSubscribed, setCreatorSubscribed] = useState(false);
  const [battleGiftSide, setBattleGiftSide] = useState<'challenger' | 'opponent' | null>(null);
  const chatTimesRef = useRef<number[]>([]);
  const reactionCooldownRef = useRef(0);
  const heartsBurstRef = useRef<FloatingHeartsBurstHandle>(null);
  const likeBatchRef = useRef<{ count: number; flushTimer: ReturnType<typeof setTimeout> | null }>({
    count: 0,
    flushTimer: null,
  });

  /** Tap sur la vidéo live = cœur flottant + batch d'envoi de likes au backend. */
  const onLiveTap = useCallback(
    (evt: { nativeEvent: { locationX: number; locationY: number } }) => {
      const x = evt?.nativeEvent?.locationX ?? Math.random() * 80;
      const y = evt?.nativeEvent?.locationY ?? 200;
      heartsBurstRef.current?.burst(x, y);
      if (!liveId) return;
      // Batch : on accumule les taps puis envoie au plus toutes les 1.2s pour épargner le backend
      likeBatchRef.current.count += 1;
      if (likeBatchRef.current.flushTimer) return;
      likeBatchRef.current.flushTimer = setTimeout(() => {
        const burstCount = likeBatchRef.current.count;
        likeBatchRef.current.count = 0;
        likeBatchRef.current.flushTimer = null;
        if (burstCount <= 0) return;
        void apiClient
          .post(`/live/${encodeURIComponent(liveId)}/like`, { count: burstCount })
          .catch(() => {});
        // Émet aussi via socket pour que les autres viewers voient des cœurs (best-effort)
        try {
          socketService.emit?.('live:hearts', { liveId, count: burstCount });
        } catch {
          /* ignore */
        }
      }, 1200);
    },
    [liveId],
  );

  /** Reçoit les cœurs des autres viewers via socket → burst depuis bord droit. */
  useEffect(() => {
    if (!liveId) return;
    const handler = (data: { liveId?: string; count?: number }) => {
      if (data?.liveId !== liveId) return;
      const n = Math.min(8, Math.max(1, Number(data?.count || 1)));
      for (let i = 0; i < n; i += 1) {
        setTimeout(() => heartsBurstRef.current?.burst(), i * 90);
      }
    };
    socketService.on?.('live:hearts', handler);
    return () => {
      socketService.off?.('live:hearts', handler);
    };
  }, [liveId]);

  const { animations, removeAnimation, GiftAnimationBubble, GiftFullscreenHost } = useGiftAnimations(liveId || '');

  const fetchTopDonors = useCallback(async (id: string) => {
    try {
      const res = await apiClient.get(`/live/${encodeURIComponent(id)}/top-donors?limit=3`);
      const raw = res.data?.data ?? res.data;
      const list = Array.isArray(raw) ? raw : [];
      setTopDonors(list.slice(0, 3));
    } catch {
      setTopDonors([]);
    }
  }, []);

  const topDonorIdSet = useMemo(() => {
    const s = new Set<string>();
    for (const d of topDonors) {
      const row = d as { sender_id?: string; user_id?: string; user?: { id?: string } };
      const id = String(row.sender_id || row.user_id || row.user?.id || '').trim();
      if (id) s.add(id);
    }
    return s;
  }, [topDonors]);

  const visibleMessages = useMemo(
    () =>
      messages.map((m) => ({
        ...m,
        is_top_supporter: Boolean(m.is_top_supporter || (m.senderId && topDonorIdSet.has(m.senderId))),
      })),
    [messages, topDonorIdSet],
  );

  const liveAccessGranted = canAccessPrivateLive(joinAccess);
  const liveInteractionsEnabled = streamStatus === 'live' && liveAccessGranted;

  const { rtcRole, cohostInviteVisible, cohostBusy, acceptCoHostInvite, declineCoHostInvite } = useLiveCoHostRtc({
    liveId: liveId || null,
    creatorId,
    liveAccessGranted,
  });

  const { agoraJoined, agoraError, AgoraRemoteView, AgoraRemoteGrid, AgoraLocalView, remoteUids } = useAgoraLiveRtc({
    liveId: liveId || null,
    role: rtcRole,
    enabled:
      isAuthenticated &&
      !!liveId &&
      loading === false &&
      ((ageRestriction !== '18+' && ageRestriction !== '13+') || ageGateOk) &&
      liveInteractionsEnabled &&
      liveAccessGranted,
  });

  useLiveViewerSession({
    liveId: liveId || null,
    sessionId,
    enabled:
      isAuthenticated &&
      !!liveId &&
      streamStatus === 'live' &&
      liveAccessGranted &&
      ((ageRestriction !== '18+' && ageRestriction !== '13+') || ageGateOk),
  });

  const {
    battle,
    proposedBattle,
    isBattleActive,
    acceptBattle,
    declineBattle,
  } = useLiveBattle(liveId || null);

  const { slots: guestSlots, maxSlots: guestMaxSlots, requestGuestSlot } = useLiveGuests(
    liveId || null,
    false,
  );

  useEffect(() => {
    if (isBattleActive && battle && liveId) {
      setBattleGiftSide((prev) => prev ?? battleSideForViewer(battle, liveId));
    } else if (!isBattleActive) {
      setBattleGiftSide(null);
    }
  }, [isBattleActive, battle, liveId]);

  useEffect(() => {
    if (accessToken) socketService.connect(accessToken);
  }, [accessToken]);

  const hydrate = useCallback(async () => {
    if (!liveId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setStreamStatus(null);
    setScheduledAtMs(null);
    try {
      const res = await apiClient.get(`/live/${encodeURIComponent(liveId)}`);
      const s = (res.data?.data ?? res.data) as Record<string, unknown> | null;
      if (s) {
        setStreamTitle(String(s.title ?? 'Live'));
        const cid = String(s.creator_id ?? '').trim();
        if (cid) setCreatorId(cid);
        const creator = s.creator as Record<string, unknown> | undefined;
        setStreamerName(String(creator?.full_name ?? creator?.username ?? s.creator_name ?? 'Créateur'));
        const av = String(creator?.avatar_url ?? creator?.profile_image ?? '').trim();
        if (av) setStreamerAvatar(av);
        if (typeof s.viewers_count === 'number') setViewers(s.viewers_count);
        const thumb = String(s.thumbnail_url ?? '').trim();
        if (thumb) setPosterUrl(thumb);
        const playback = pickLivePlaybackUrl(s);
        setPlaybackUrl(playback || null);
        const ar = String(s.age_restriction ?? 'all');
        setAgeRestriction(ar);
        const needsAck = Boolean(s.needs_age_ack_for_viewer);
        if (ar === '18+' || ar === '13+') {
          setAgeGateOk(!needsAck);
        } else {
          setAgeGateOk(true);
        }
        const stRaw = String(s.status ?? 'live').toLowerCase();
        const stNorm: 'live' | 'scheduled' | 'ended' =
          stRaw === 'scheduled' || stRaw === 'ended' ? stRaw : 'live';
        setStreamStatus(stNorm);
        if (stNorm !== 'live') setBroadcastTimer(null);
        const rawSat = s.scheduled_at as string | Date | undefined | null;
        let satMs: number | null = null;
        if (rawSat) {
          const parsed =
            typeof rawSat === 'string'
              ? Date.parse(rawSat)
              : rawSat instanceof Date
                ? rawSat.getTime()
                : NaN;
          if (Number.isFinite(parsed)) satMs = parsed;
        }
        setScheduledAtMs(satMs);
        setPrivateMode(Boolean(s.private_mode));
        const accessRaw = String(s.viewer_join_access ?? 'allowed').toLowerCase();
        const accessNorm: LiveViewerJoinAccess =
          accessRaw === 'pending' || accessRaw === 'rejected' || accessRaw === 'none'
            ? accessRaw
            : 'allowed';
        setJoinAccess(Boolean(s.private_mode) ? accessNorm : 'allowed');
        if (typeof s.goal_amount === 'number') setGoalAmount(s.goal_amount);
        if (typeof s.goal_target === 'number' && s.goal_target > 0) setGoalTarget(s.goal_target);
        const rawMsgs = s.chat_messages;
        if (Array.isArray(rawMsgs) && rawMsgs.length) {
          setMessages(
            (rawMsgs as Record<string, unknown>[])
              .filter((m) => m && !m.is_deleted)
              .slice(-40)
              .map((m) => mapChatRow(m)),
          );
        }
        const c = cid || String(creator?.id ?? '').trim();
        if (c && isAuthenticated && user?.id && c !== user.id) {
          try {
            const br = await apiClient.get(`/live/creator/${encodeURIComponent(c)}/bell`);
            const bd = br.data?.data ?? br.data;
            if (typeof (bd as { subscribed?: boolean })?.subscribed === 'boolean') {
              setBellOn(Boolean((bd as { subscribed?: boolean }).subscribed));
            } else {
              const v = await AsyncStorage.getItem(LIVE_REMINDER_KEY(c));
              setBellOn(v === '1');
            }
          } catch {
            const v = await AsyncStorage.getItem(LIVE_REMINDER_KEY(c));
            setBellOn(v === '1');
          }
        } else if (c) {
          const v = await AsyncStorage.getItem(LIVE_REMINDER_KEY(c));
          setBellOn(v === '1');
        }
        if (isAuthenticated && c && user?.id && c !== user.id) {
          try {
            const ur = await apiClient.get(`/users/${encodeURIComponent(c)}`);
            const prof = ur.data?.data ?? ur.data;
            const fol = (prof as { isFollowing?: boolean } | null)?.isFollowing;
            if (typeof fol === 'boolean') setIsFollowing(fol);
          } catch {
            /* ignore */
          }
        } else {
          setIsFollowing(false);
        }
      } else {
        setStreamStatus('ended');
        setStreamTitle('Live introuvable');
        setIsFollowing(false);
        setPlaybackUrl(null);
      }
    } catch (e: unknown) {
      const st = (e as { response?: { status?: number } }).response?.status;
      setStreamStatus('ended');
      setStreamTitle(st === 404 ? 'Live introuvable' : 'Impossible de charger le live');
      setPlaybackUrl(null);
    } finally {
      setLoading(false);
    }
  }, [liveId, isAuthenticated, user?.id]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!liveId || streamStatus !== 'live') return;
    const t = setInterval(() => {
      void hydrate();
    }, 10000);
    return () => clearInterval(t);
  }, [liveId, streamStatus, hydrate]);

  useEffect(() => {
    if (!liveId || streamStatus !== 'live') return;
    void fetchTopDonors(liveId);
    const t = setInterval(() => void fetchTopDonors(liveId), 12_000);
    return () => clearInterval(t);
  }, [liveId, streamStatus, fetchTopDonors]);

  useEffect(() => {
    if (!broadcastTimer) return;
    const id = setInterval(() => setBroadcastTimerTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, [broadcastTimer]);

  useEffect(() => {
    if (!isAuthenticated || !liveId) return;
    if (streamStatus !== 'live') return;
    if ((ageRestriction === '18+' || ageRestriction === '13+') && !ageGateOk) return;
    if (!liveAccessGranted) return;
    void (async () => {
      try {
        const geo = await resolveLiveJoinGeo();
        await apiClient.post(`/live/${encodeURIComponent(liveId)}/join`, { sessionId, ...geo });
      } catch (e: unknown) {
        const err = e as { response?: { status?: number; data?: { error?: { code?: string; message?: string } } } };
        const box = err.response?.data?.error;
        const code = typeof box === 'object' && box ? box.code : undefined;
        const msg = typeof box === 'object' && box ? box.message : '';
        if (err.response?.status === 403 && (code === 'AGE_ACK_REQUIRED' || String(msg).toLowerCase().includes('âge'))) {
          Alert.alert('Accès live', 'Confirmez votre âge sur la fenêtre de sécurité pour rejoindre ce direct.');
        } else if (
          err.response?.status === 403 &&
          (code === 'JOIN_ACCESS_REQUIRED' || code === 'JOIN_ACCESS_PENDING' || code === 'JOIN_ACCESS_REJECTED')
        ) {
          if (code === 'JOIN_ACCESS_PENDING') setJoinAccess('pending');
          else if (code === 'JOIN_ACCESS_REJECTED') setJoinAccess('rejected');
          else setJoinAccess('none');
        }
      }
    })();
  }, [isAuthenticated, liveId, sessionId, ageRestriction, ageGateOk, streamStatus, liveAccessGranted]);

  const requestLiveAccess = async () => {
    if (!liveId || !isAuthenticated) {
      Alert.alert('Connexion', 'Connectez-vous pour demander l’accès à ce live.');
      return;
    }
    setJoinRequestSending(true);
    try {
      const res = await apiClient.post(`/live/${encodeURIComponent(liveId)}/join-request`);
      const data = (res.data?.data ?? res.data) as { status?: string; already_public?: boolean };
      const st = String(data?.status || 'pending').toLowerCase();
      if (data?.already_public || st === 'allowed' || st === 'accepted') {
        setJoinAccess('allowed');
        Alert.alert('Accès autorisé', 'Vous pouvez regarder le live.');
      } else if (st === 'pending') {
        setJoinAccess('pending');
        Alert.alert('Demande envoyée', 'Le créateur va accepter ou refuser votre accès.');
      } else {
        setJoinAccess(st as LiveViewerJoinAccess);
      }
    } catch (e: unknown) {
      Alert.alert('Demande d’accès', getAlertMessageForCaughtError(e));
    } finally {
      setJoinRequestSending(false);
    }
  };

  useEffect(() => {
    if (!liveId) return;
    if (streamStatus !== 'live') return;
    if ((ageRestriction === '18+' || ageRestriction === '13+') && !ageGateOk) return;
    if (!liveAccessGranted) return;
    socketService.joinLiveStream(liveId);
    const chatHandler = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      setMessages((prev) => [...prev.slice(-50), mapChatRow(raw as Record<string, unknown>)]);
    };
    const viewerHandler = (data: unknown) => {
      const d = data as { count?: number };
      if (typeof d?.count === 'number') setViewers(d.count);
    };
    const timerHandler = (payload: unknown) => {
      if (payload == null) {
        setBroadcastTimer(null);
        return;
      }
      if (typeof payload !== 'object') return;
      const p = payload as { end_at_ms?: unknown; label?: unknown };
      const end = Number(p.end_at_ms);
      if (!Number.isFinite(end)) {
        setBroadcastTimer(null);
        return;
      }
      setBroadcastTimer({ end_at_ms: end, label: String(p.label || '') });
    };
    const captionHandler = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const p = raw as { text?: string };
      const t = String(p.text || '').trim();
      if (t) setHostCaptionLine(t);
    };
    const raiseResolved = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const p = raw as { accepted?: boolean; userId?: string };
      if (user?.id && p.userId === user.id) {
        Alert.alert(
          p.accepted ? 'Demande acceptée' : 'Demande refusée',
          p.accepted ? 'Le créateur vous invite en co-host (grille).' : 'Le créateur a refusé votre demande.',
        );
      }
    };
    const joinAccessResolved = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const p = raw as { accepted?: boolean; userId?: string; streamId?: string };
      if (p.streamId && p.streamId !== liveId) return;
      if (user?.id && p.userId === user.id) {
        if (p.accepted) {
          setJoinAccess('allowed');
          Alert.alert('Accès autorisé', 'Vous pouvez maintenant regarder le live.');
        } else {
          setJoinAccess('rejected');
          Alert.alert('Accès refusé', 'Le créateur a refusé votre demande pour ce live.');
        }
      }
    };
    const pollCreated = (p: unknown) => setPollSocketBump(p);
    const pollUpdated = (p: unknown) => setPollSocketBump(p);
    const pollEnded = (p: unknown) => setPollSocketBump(p);
    const giftHandler = () => {
      void hydrate();
    };
    socketService.on('live:chat', chatHandler);
    socketService.on('live:viewers', viewerHandler);
    socketService.on('live:timer', timerHandler);
    socketService.on('live:caption', captionHandler);
    socketService.on('live:raise-hand:resolved', raiseResolved);
    socketService.on('live:join-request:resolved', joinAccessResolved);
    socketService.on('live:poll:created', pollCreated);
    socketService.on('live:poll:updated', pollUpdated);
    socketService.on('live:poll:ended', pollEnded);
    socketService.on('live:gift', giftHandler);
    return () => {
      socketService.off('live:chat', chatHandler);
      socketService.off('live:viewers', viewerHandler);
      socketService.off('live:timer', timerHandler);
      socketService.off('live:caption', captionHandler);
      socketService.off('live:raise-hand:resolved', raiseResolved);
      socketService.off('live:join-request:resolved', joinAccessResolved);
      socketService.off('live:poll:created', pollCreated);
      socketService.off('live:poll:updated', pollUpdated);
      socketService.off('live:poll:ended', pollEnded);
      socketService.off('live:gift', giftHandler);
      socketService.leaveLiveStream(liveId);
    };
  }, [liveId, ageRestriction, ageGateOk, streamStatus, user?.id, liveAccessGranted, hydrate]);

  const toggleFollow = async () => {
    if (!isAuthenticated || !creatorId) {
      Alert.alert('Connexion', 'Connectez-vous pour suivre ce créateur.');
      return;
    }
    try {
      const res = await apiClient.post(`/users/${encodeURIComponent(creatorId)}/follow`, {});
      const d = res.data?.data ?? res.data;
      setIsFollowing(Boolean(d?.following));
    } catch (e: unknown) {
      Alert.alert('Suivi', getAlertMessageForCaughtError(e));
    }
  };

  const sendMessage = async () => {
    if (!liveInteractionsEnabled) return;
    const text = newMessage.trim();
    if (!text || !liveId || !user) return;
    if (text.length > CHAT_MAX) {
      Alert.alert('Chat', `Maximum ${CHAT_MAX} caractères.`);
      return;
    }
    const now = Date.now();
    chatTimesRef.current = chatTimesRef.current.filter((t) => now - t < 60_000);
    if (chatTimesRef.current.length >= CHAT_PER_MIN) {
      Alert.alert('Limite', `Max ${CHAT_PER_MIN} messages par minute (spectateur sans badge).`);
      return;
    }
    try {
      await apiClient.post(`/live/${encodeURIComponent(liveId)}/chat`, {
        message: text,
        ...(isQuestion ? { is_question: true } : {}),
      });
      chatTimesRef.current.push(now);
      setNewMessage('');
    } catch (e: unknown) {
      Alert.alert('Chat', getAlertMessageForCaughtError(e));
    }
  };

  const sendReaction = async (type: 'heart' | 'like' | 'fire' | 'thumbs' | 'clap') => {
    if (!liveInteractionsEnabled || !liveId || !isAuthenticated) return;
    const now = Date.now();
    if (now - reactionCooldownRef.current < 400) return;
    reactionCooldownRef.current = now;
    try {
      await apiClient.post(`/live/${encodeURIComponent(liveId)}/reaction`, { type });
    } catch (e: unknown) {
      const ax = e as { response?: { status?: number; data?: { error?: { code?: string; message?: string } | string } } };
      const code =
        typeof ax.response?.data?.error === 'object' && ax.response?.data?.error
          ? (ax.response.data.error as { code?: string }).code
          : undefined;
      if (ax.response?.status === 429 || code === 'LIVE_REACTION_COOLDOWN') {
        /* déjà limité côté client ; message serveur optionnel */
        return;
      }
    }
  };

  const raiseHand = async () => {
    if (!liveInteractionsEnabled || !liveId || !isAuthenticated) return;
    try {
      await apiClient.post(`/live/${encodeURIComponent(liveId)}/raise-hand`, { raised: true });
      Alert.alert('Demande envoyée', 'Le créateur peut accepter ou refuser ; s’il accepte, vous serez invité en co-host (grille).');
    } catch (e: unknown) {
      Alert.alert('Main levée', getAlertMessageForCaughtError(e));
    }
  };

  const shareLive = async () => {
    if (!liveId) return;
    const msg = `Regarde ce live sur AfriWonder — ${streamTitle}\nhttps://afriwonder.com/live/${liveId}`;
    try {
      await Share.share({ message: msg });
    } catch {
      /* ignore */
    }
  };

  const shareLiveWhatsApp = async () => {
    if (!liveId) return;
    const text = encodeURIComponent(
      `Regarde ce live sur AfriWonder — ${streamTitle}\nhttps://afriwonder.com/live/${liveId}`,
    );
    const wa = `whatsapp://send?text=${text}`;
    try {
      if (await Linking.canOpenURL(wa)) await Linking.openURL(wa);
      else await shareLive();
    } catch {
      void shareLive();
    }
  };

  const shareLiveFacebook = async () => {
    if (!liveId) return;
    const url = encodeURIComponent(`https://afriwonder.com/live/${liveId}`);
    const fb = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    try {
      await Linking.openURL(fb);
    } catch {
      void shareLive();
    }
  };

  const submitReportWithReason = async (reason: string) => {
    if (!liveId || !isAuthenticated) return;
    try {
      await apiClient.post('/moderation/report', {
        contentType: 'live_stream',
        contentId: liveId,
        reason,
        description: `Signalement live ${liveId}`,
      });
      Alert.alert('Merci', 'Signalement envoyé.');
    } catch (e: unknown) {
      Alert.alert('Erreur', getAlertMessageForCaughtError(e));
    }
  };

  const toggleBell = async () => {
    if (!creatorId) return;
    if (!isAuthenticated) {
      Alert.alert('Connexion', 'Connectez-vous pour activer la cloche créateur.');
      return;
    }
    const next = !bellOn;
    setBellOn(next);
    await AsyncStorage.setItem(LIVE_REMINDER_KEY(creatorId), next ? '1' : '0');
    try {
      await apiClient.post(`/live/creator/${encodeURIComponent(creatorId)}/bell`, { enabled: next });
    } catch {
      /* préférence locale conservée */
    }
    Alert.alert(
      next ? 'Cloche activée' : 'Cloche désactivée',
      next
        ? 'Vous recevrez une notification pour les prochains lives de ce créateur (serveur + appareil).'
        : 'Préférence enregistrée.',
    );
  };

  const confirmAgeAndAck = async () => {
    if (!liveId || !isAuthenticated) {
      Alert.alert('Connexion', 'Connectez-vous pour confirmer l’accès à ce live.');
      return;
    }
    const restriction = ageRestriction === '18+' ? '18+' : '13+';
    try {
      await apiClient.post(`/live/${encodeURIComponent(liveId)}/age-ack`, { restriction });
      setAgeGateOk(true);
    } catch (e: unknown) {
      Alert.alert('Âge', getAlertMessageForCaughtError(e));
    }
  };

  const copyLiveLink = async () => {
    if (!liveId) return;
    const url = `https://afriwonder.com/live/${liveId}`;
    try {
      await Clipboard.setStringAsync(url);
      Alert.alert('Lien', 'Lien du live copié.');
    } catch {
      /* ignore */
    }
  };

  const openReportMenu = () => {
    if (!liveId) return;
    if (!isAuthenticated) {
      Alert.alert('Connexion', 'Connectez-vous pour signaler ce live.');
      return;
    }
    if (Platform.OS === 'ios') {
      const labels = REPORT_REASONS.map((r) => r.label);
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Annuler', ...labels, 'Copier le lien'],
          cancelButtonIndex: 0,
        },
        (idx) => {
          if (idx === 0) return;
          if (idx === labels.length + 1) {
            void copyLiveLink();
            return;
          }
          const r = REPORT_REASONS[idx - 1];
          if (r) void submitReportWithReason(r.id);
        },
      );
    } else {
      Alert.alert('Signaler le live', 'Choisissez une raison', [
        ...REPORT_REASONS.map((r) => ({
          text: r.label,
          onPress: () => void submitReportWithReason(r.id),
        })),
        { text: 'Copier le lien', onPress: () => void copyLiveLink() },
        { text: 'Annuler', style: 'cancel' },
      ]);
    }
  };

  const bg = mode === 'dark' ? colors.background : colors.background;

  if (!liveId) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center', backgroundColor: bg }]}>
        <Text style={{ color: Colors.textMuted }}>Live introuvable</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }} accessibilityLabel="Retour">
          <Text style={{ color: Colors.primary }}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', backgroundColor: bg }]}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: bg }]}>
      <Modal visible={(ageRestriction === '18+' || ageRestriction === '13+') && !ageGateOk} transparent animationType="fade">
        <View style={styles.ageModal}>
          <Text style={styles.ageTitle}>
            {ageRestriction === '18+' ? 'Live réservé aux 18+' : 'Live réservé aux 13+'}
          </Text>
          <Text style={styles.ageText}>
            {ageRestriction === '18+'
              ? 'Confirmation enregistrée côté serveur (traçabilité CDC) avant d’accéder au direct.'
              : 'Confirmation enregistrée côté serveur avant d’accéder au direct.'}
          </Text>
          <TouchableOpacity
            style={styles.ageBtn}
            onPress={() => void confirmAgeAndAck()}
            accessibilityLabel={ageRestriction === '18+' ? 'Je confirme avoir 18 ans ou plus' : 'Je confirme avoir 13 ans ou plus'}
          >
            <Text style={styles.ageBtnText}>
              {ageRestriction === '18+' ? 'J’ai 18 ans ou plus — continuer' : 'J’ai 13 ans ou plus — continuer'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ageLeave} onPress={() => router.back()} accessibilityLabel="Quitter">
            <Text style={styles.ageLeaveText}>Quitter</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal
        visible={
          streamStatus === 'live' &&
          privateMode &&
          !liveAccessGranted &&
          ((ageRestriction !== '18+' && ageRestriction !== '13+') || ageGateOk)
        }
        transparent
        animationType="fade"
      >
        <View style={styles.ageModal}>
          <Text style={styles.ageTitle}>Live privé</Text>
          <Text style={styles.ageText}>
            {liveJoinAccessLabel(joinAccess) ||
              'Le créateur doit approuver votre accès avant que vous puissiez voir la vidéo et participer.'}
          </Text>
          {joinAccess === 'pending' ? (
            <View style={styles.joinPendingBox}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={[styles.ageText, { marginTop: Spacing.sm }]}>En attente de la réponse du créateur…</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.ageBtn, joinRequestSending && { opacity: 0.6 }]}
              onPress={() => void requestLiveAccess()}
              disabled={joinRequestSending || !isAuthenticated}
              accessibilityLabel="Demander l'accès au live"
            >
              <Text style={styles.ageBtnText}>
                {!isAuthenticated
                  ? 'Connectez-vous pour demander l’accès'
                  : joinAccess === 'rejected'
                    ? 'Redemander l’accès'
                    : 'Demander l’accès'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.ageLeave} onPress={() => router.back()} accessibilityLabel="Retour">
            <Text style={styles.ageLeaveText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={showProfile} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => setShowProfile(false)}>
          <Pressable style={styles.profileCard} onPress={(e) => e.stopPropagation()}>
            <ImageOrPlaceholder
              uri={profileAvatarUri(streamerAvatar, streamerName)}
              style={styles.profileAvatar}
              icon="person"
              iconSize={36}
            />
            <Text style={styles.profileName}>{streamerName}</Text>
            <TouchableOpacity style={styles.profileFollow} onPress={() => void toggleFollow()}>
              <Text style={styles.profileFollowText}>{isFollowing ? 'Dans son Wonder' : 'Wonder'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowProfile(false)}>
              <Text style={styles.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {animations.map((anim) => (
        <GiftAnimationBubble key={anim.id} gift={anim} onRemove={removeAnimation} />
      ))}
      <GiftFullscreenHost />

      <LiveTopFansSheet liveId={liveId} visible={showTopFans} onClose={() => setShowTopFans(false)} />

      <LiveCoHostInviteModal
        visible={cohostInviteVisible}
        busy={cohostBusy}
        onAccept={() => void acceptCoHostInvite()}
        onDecline={declineCoHostInvite}
      />

      <LiveBattleProposedModal
        visible={!!proposedBattle && proposedBattle.status === 'pending' && proposedBattle.opponent_live_id === liveId}
        onAccept={() => void acceptBattle()}
        onDecline={() => void declineBattle()}
      />

      {isBattleActive && battle ? (
        <LiveBattleScoreBar battle={battle} liveId={liveId} topInset={insets.top + 48} />
      ) : null}

      <LiveBattleSplitLayout
        battle={battle}
        liveId={liveId}
        battleActive={isBattleActive && !!battle}
        mainChildren={
      <View style={styles.videoBackground}>
        {Platform.OS !== 'web' && agoraJoined ? (
          rtcRole === 'host' ? (
            <>
              <AgoraLocalView style={{ width, height }} />
              {remoteUids.length > 0 ? (
                <View style={styles.cohostStripViewer} pointerEvents="box-none">
                  <AgoraRemoteGrid uids={remoteUids} maxCells={8} style={{}} />
                </View>
              ) : null}
            </>
          ) : (
            <>
              <AgoraRemoteView style={{ width, height }} />
              {remoteUids.length > 1 ? (
                <View style={styles.cohostStripViewer} pointerEvents="box-none">
                  <AgoraRemoteGrid uids={remoteUids.slice(1)} maxCells={8} style={{}} />
                </View>
              ) : null}
            </>
          )
        ) : playbackUrl ? (
          <LivePlaybackSurface uri={playbackUrl} />
        ) : posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.backgroundImage} />
        ) : (
          <LinearGradient colors={['#1a0a2e', '#0a0a12']} style={StyleSheet.absoluteFillObject} />
        )}
        {!agoraJoined && agoraError ? (
          <View style={styles.agoraBanner}>
            <Text style={styles.agoraBannerText}>{agoraError}</Text>
          </View>
        ) : null}

        {streamStatus === 'scheduled' ? (
          <View style={styles.statusOverlay} pointerEvents="box-none">
            <Ionicons name="calendar-outline" size={32} color="#93c5fd" />
            <Text style={styles.statusTitle}>Live programmé</Text>
            <Text style={styles.statusSub}>
              {scheduledAtMs != null
                ? `Début prévu : ${formatScheduledFr(scheduledAtMs)}`
                : 'Heure de diffusion à confirmer.'}
            </Text>
            <Text style={styles.statusHint}>Revenez au démarrage ou activez la cloche pour les prochains lives.</Text>
          </View>
        ) : null}
        {streamStatus === 'ended' ? (
          <View style={styles.statusOverlay} pointerEvents="box-none">
            <Ionicons name="checkmark-circle-outline" size={32} color="#86efac" />
            <Text style={styles.statusTitle}>Live terminé</Text>
            <TouchableOpacity
              style={styles.replayCta}
              onPress={() => router.replace({ pathname: '/live/replay', params: { id: liveId } } as never)}
              accessibilityRole="button"
              accessibilityLabel="Voir le replay"
            >
              <Text style={styles.replayCtaText}>Voir le replay</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
        }
      />

      <LiveGuestGridBadge slots={guestSlots} maxSlots={guestMaxSlots} bottomOffset={168 + insets.bottom} />

      <View style={styles.headerOverlay}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={26} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.streamerInfo}>
          <TouchableOpacity onPress={() => setShowProfile(true)} accessibilityLabel="Profil du créateur">
            <ImageOrPlaceholder
              uri={profileAvatarUri(streamerAvatar, streamerName)}
              style={styles.streamerAvatar}
              icon="person"
              iconSize={22}
            />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.streamerName} numberOfLines={1}>
              {streamerName}
            </Text>
            <Text style={styles.streamerTitle} numberOfLines={1}>
              {streamTitle}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.followBtn, isFollowing && styles.followBtnActive]}
            onPress={() => void toggleFollow()}
          >
          <Text style={styles.followBtnText}>{isFollowing ? 'Dans son Wonder' : 'Wonder'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => void toggleBell()} style={styles.iconAct} accessibilityLabel="Cloche prochains lives">
            <Ionicons name={bellOn ? 'notifications' : 'notifications-outline'} size={22} color={Colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowCaptions((v) => !v)}
            style={[styles.iconAct, !showCaptions && { opacity: 0.45 }]}
            accessibilityLabel="Afficher ou masquer les sous-titres"
          >
            <Ionicons name="text-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => void copyLiveLink()} style={styles.iconAct} accessibilityLabel="Copier le lien du live">
            <Ionicons name="link-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (!liveInteractionsEnabled) return;
              void tryEnterPictureInPicture();
            }}
            style={[styles.iconAct, !liveInteractionsEnabled && { opacity: 0.35 }]}
            accessibilityLabel="Picture in Picture"
            disabled={!liveInteractionsEnabled}
          >
            <Ionicons name="expand-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => void shareLive()} style={styles.iconAct} accessibilityLabel="Partager">
            <Ionicons name="share-social-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => void shareLiveWhatsApp()} style={styles.iconAct} accessibilityLabel="WhatsApp">
            <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => void shareLiveFacebook()} style={styles.iconAct} accessibilityLabel="Partager sur Facebook">
            <Ionicons name="logo-facebook" size={22} color="#1877F2" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openReportMenu()} style={styles.iconAct} accessibilityLabel="Signaler">
            <Ionicons name="flag-outline" size={22} color="#F87171" />
          </TouchableOpacity>
        </View>

        {liveInteractionsEnabled ? (
          <TouchableOpacity
            style={styles.topFansPill}
            onPress={() => {
              setShowTopFans(true);
              setShowGifts(false);
            }}
            accessibilityLabel="Top Fans"
            accessibilityRole="button"
          >
            <Ionicons name="trophy" size={16} color="#D4AF37" />
            <Text style={styles.topFansPillText}>Top Fans</Text>
          </TouchableOpacity>
        ) : null}

        {liveInteractionsEnabled && creatorId && user?.id !== creatorId ? (
          <View style={styles.monetizationRow}>
            <LiveViewerTipButton liveId={liveId} />
            <LiveCreatorSubscribeButton creatorId={creatorId} onSubscribedChange={setCreatorSubscribed} />
          </View>
        ) : null}

        <View style={styles.viewersBadge}>
          <Ionicons name="eye" size={14} color={Colors.text} />
          <Text style={styles.viewersText}>{formatCompactCount(viewers)}</Text>
        </View>
      </View>

      {liveInteractionsEnabled && goalTarget > 0 ? (
        <LiveGoalBar goalAmount={goalAmount} goalTarget={goalTarget} topInset={insets.top + 48} />
      ) : null}

      {liveInteractionsEnabled && liveId ? (
        <View style={[styles.pollStripWrap, { top: insets.top + (goalTarget > 0 ? 88 : 48) }]} pointerEvents="box-none">
          <LivePollStrip liveId={liveId} onSocketPoll={pollSocketBump as never} />
        </View>
      ) : null}

      {liveInteractionsEnabled && topDonors.length > 0 ? (
        <View style={[styles.donorStripWrap, { top: insets.top + 102 }]} pointerEvents="box-none">
          <Text style={styles.donorStripLabel}>Top cadeaux</Text>
          <View style={styles.donorStripRow}>
            {topDonors.slice(0, 3).map((d, idx) => {
              const name = String(d.sender_name || (d as { user?: { username?: string } }).user?.username || '?').slice(0, 14);
              const amt = Number(d.total_amount_fcfa ?? d.total_amount ?? 0) || 0;
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
              return (
                <View key={`${d.sender_id || d.user_id || idx}`} style={styles.donorChip}>
                  <Text style={styles.donorChipMedal}>{medal}</Text>
                  <Text style={styles.donorChipName} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={styles.donorChipAmt}>{formatCompactCount(amt)} F</Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {broadcastTimer && Date.now() < broadcastTimer.end_at_ms ? (
        <View style={[styles.liveBroadcastTimer, { top: insets.top + 56 }]} pointerEvents="none">
          <Text style={styles.liveBroadcastTimerText} numberOfLines={2}>
            {Math.max(0, Math.ceil((broadcastTimer.end_at_ms - Date.now()) / 1000))}s
            {broadcastTimer.label ? ` · ${broadcastTimer.label}` : ''}
          </Text>
        </View>
      ) : null}

      {hostCaptionLine && showCaptions && liveInteractionsEnabled ? (
        <View style={[styles.captionBar, { bottom: 168 + insets.bottom }]} pointerEvents="none">
          <Text style={styles.captionText} numberOfLines={3}>
            {hostCaptionLine}
          </Text>
        </View>
      ) : null}

      <View style={[styles.reactionRow, !liveInteractionsEnabled && { opacity: 0.4 }]}>
        {(['heart', 'fire', 'thumbs', 'clap'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={styles.reactionBtn}
            onPress={() => void sendReaction(t)}
            disabled={!liveInteractionsEnabled}
          >
            <Text style={styles.reactionEmoji}>
              {t === 'heart' ? '❤️' : t === 'fire' ? '🔥' : t === 'thumbs' ? '👍' : '👏'}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.raiseBtn}
          onPress={() => void requestGuestSlot().catch((e) => Alert.alert('Multi-guest', getAlertMessageForCaughtError(e)))}
          disabled={!liveInteractionsEnabled}
        >
          <Ionicons name="people" size={18} color="#FFF" />
          <Text style={styles.raiseBtnText}>Invité</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.raiseBtn}
          onPress={() => void raiseHand()}
          disabled={!liveInteractionsEnabled}
        >
          <Ionicons name="hand-left" size={18} color="#FFF" />
          <Text style={styles.raiseBtnText}>Main levée</Text>
        </TouchableOpacity>
      </View>

      {liveInteractionsEnabled ? (
        <View style={[styles.viewerTopFansRail, { bottom: 195 + insets.bottom }]} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.viewerTopFansRailBtn, showTopFans && { borderColor: 'rgba(212,175,55,0.9)' }]}
            onPress={() => {
              setShowTopFans(true);
              setShowGifts(false);
            }}
            accessibilityLabel="Top Fans"
            accessibilityRole="button"
          >
            <Ionicons name="trophy" size={22} color="#D4AF37" />
            <Text style={styles.viewerTopFansRailLabel}>Top</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.messagesContainer}
      >
        <FlatList
          data={visibleMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.messageItem}>
              <ImageOrPlaceholder
                uri={profileAvatarUri(item.user.avatar, item.user.name)}
                style={styles.msgAvatar}
                icon="person"
                iconSize={16}
              />
              <View style={styles.messageBubble}>
                <Text style={[styles.msgUser, { color: liveChatViewerColor(item, creatorId) }]}>
                  {item.sender_role === 'moderator' ? '🛡️ ' : ''}
                  {creatorId && item.senderId === creatorId ? '⭐ ' : ''}
                  {creatorSubscribed && user?.id && item.senderId === user.id ? '💎 ' : ''}
                  {item.is_top_supporter ? '👑 ' : ''}
                  {item.is_question ? '❓ ' : ''}
                  {item.user.name}
                </Text>
                <Text style={styles.msgText}>{item.text}</Text>
              </View>
            </View>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesList}
          ListEmptyComponent={
            <Text style={{ color: Colors.textMuted, textAlign: 'center', marginTop: 24 }}>
              {!liveInteractionsEnabled
                ? streamStatus === 'scheduled'
                  ? 'Le chat s’ouvrira quand le live démarrera.'
                  : 'Ce live est terminé — consultez le replay pour les commentaires replay.'
                : 'Aucun message pour l’instant'}
            </Text>
          }
        />

        {showGifts && creatorId ? (
          <View style={styles.giftsOverlay}>
            <TouchableOpacity style={styles.giftsBackdrop} activeOpacity={1} onPress={() => setShowGifts(false)} />
            <LiveGiftsPanel
              liveId={liveId}
              creatorId={creatorId}
              visible={showGifts}
              onClose={() => setShowGifts(false)}
              battleActive={isBattleActive}
              battleSide={battleGiftSide}
              onBattleSideChange={setBattleGiftSide}
            />
          </View>
        ) : null}

        {/* Couche cœurs flottants TikTok-like (rendue au-dessus de la vidéo, sous la barre input). */}
        <FloatingHeartsBurst ref={heartsBurstRef} />

        {/* Live Shopping — produits en promo pendant le live */}
        {liveId ? <LiveShoppingStrip liveId={liveId} bottomOffset={insets.bottom} /> : null}

        {/* Zone tappable invisible pour déclencher les cœurs (au-dessus de la vidéo, sous le chat). */}
        <View
          style={styles.heartTapZone}
          pointerEvents="box-only"
          onStartShouldSetResponder={() => true}
          onResponderRelease={(evt) => onLiveTap(evt as any)}
          testID="live-heart-tap-zone"
        />

        <View style={[styles.inputBar, { paddingBottom: insets.bottom + Spacing.sm }]}>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.messageInput}
              placeholder={
                !liveInteractionsEnabled
                  ? streamStatus === 'scheduled'
                    ? 'Chat indisponible avant le direct'
                    : 'Live terminé'
                  : isAuthenticated
                    ? `Message (max ${CHAT_MAX})`
                    : 'Connectez-vous pour chatter'
              }
              placeholderTextColor={Colors.textMuted}
              value={newMessage}
              onChangeText={(v) => setNewMessage(v.slice(0, CHAT_MAX))}
              editable={
                isAuthenticated &&
                ((ageRestriction !== '18+' && ageRestriction !== '13+') || ageGateOk) &&
                liveInteractionsEnabled
              }
              maxLength={CHAT_MAX}
            />
            <View style={styles.questionRow}>
              <Text style={styles.qLabel}>Question</Text>
              <TouchableOpacity
                onPress={() => liveInteractionsEnabled && setIsQuestion(!isQuestion)}
                style={[styles.qChip, isQuestion && styles.qChipOn, !liveInteractionsEnabled && { opacity: 0.4 }]}
                accessibilityRole="switch"
                accessibilityState={{ checked: isQuestion }}
                disabled={!liveInteractionsEnabled}
              >
                <Text style={styles.qChipText}>{isQuestion ? 'Oui' : 'Non'}</Text>
              </TouchableOpacity>
              <Text style={styles.charHint}>
                {newMessage.length}/{CHAT_MAX}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => liveInteractionsEnabled && setShowGifts(!showGifts)}
            style={[styles.giftBtn, !liveInteractionsEnabled && { opacity: 0.35 }]}
            disabled={!liveInteractionsEnabled}
          >
            <Ionicons name="gift" size={24} color={Colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sendBtn, (!isAuthenticated || !liveInteractionsEnabled) && { opacity: 0.4 }]}
            onPress={() => void sendMessage()}
            disabled={!isAuthenticated || !liveInteractionsEnabled}
          >
            <Ionicons name="send" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  videoBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  cohostStripViewer: {
    position: 'absolute',
    right: 8,
    bottom: 160,
    left: 8,
    zIndex: 3,
    maxHeight: 180,
    alignItems: 'flex-end',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    opacity: 0.35,
  },
  agoraBanner: {
    position: 'absolute',
    bottom: 120,
    left: Spacing.xl,
    right: Spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.65)',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  agoraBannerText: {
    color: '#FBBF24',
    fontSize: FontSizes.xs,
    textAlign: 'center',
  },
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 4,
  },
  statusTitle: {
    color: '#FFF',
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  statusSub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: FontSizes.sm,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  statusHint: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: FontSizes.xs,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  replayCta: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.pill,
  },
  replayCtaText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: FontSizes.md,
  },
  headerOverlay: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  liveBroadcastTimer: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 12,
    alignItems: 'center',
  },
  liveBroadcastTimerText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    textAlign: 'center',
  },
  captionBar: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 11,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  captionText: {
    color: '#FFF',
    fontSize: FontSizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streamerInfo: {
    flex: 1,
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: BorderRadius.pill,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconAct: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  streamerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.live,
  },
  streamerName: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  streamerTitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
  },
  followBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
    marginLeft: 'auto',
  },
  followBtnActive: {
    backgroundColor: Colors.surface,
  },
  followBtnText: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  topFansPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42,31,24,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.pill,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.45)',
  },
  topFansPillText: {
    color: '#F5E6C8',
    fontSize: 11,
    fontWeight: '800',
  },
  monetizationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  pollStripWrap: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 11,
  },
  viewersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
    gap: 4,
  },
  viewersText: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  donorStripWrap: {
    position: 'absolute',
    left: Spacing.sm,
    right: Spacing.sm,
    zIndex: 11,
    alignItems: 'stretch',
  },
  donorStripLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  donorStripRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: BorderRadius.md,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  donorChip: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  donorChipMedal: { fontSize: 14, marginBottom: 2 },
  donorChipName: { color: '#FFF', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  donorChipAmt: { color: '#FDE68A', fontSize: 10, fontWeight: '800', marginTop: 2 },
  viewerTopFansRail: {
    position: 'absolute',
    right: 10,
    zIndex: 9,
    alignItems: 'center',
  },
  viewerTopFansRailBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    minWidth: 52,
    gap: 4,
  },
  viewerTopFansRailLabel: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 10,
    fontWeight: '800',
  },
  reactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    gap: 10,
    marginBottom: Spacing.sm,
  },
  reactionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmoji: { fontSize: 20 },
  raiseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 'auto',
    backgroundColor: 'rgba(233,30,99,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.pill,
  },
  raiseBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSizes.xs },
  messagesContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  messagesList: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  messageItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  messageBubble: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    maxWidth: '70%',
  },
  msgUser: {
    color: Colors.primary,
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  msgText: {
    color: Colors.text,
    fontSize: FontSizes.sm,
  },
  giftsOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 40, justifyContent: 'flex-end' },
  heartTapZone: {
    position: 'absolute',
    right: 0,
    bottom: 100,
    width: 100,
    height: 280,
    zIndex: 45,
  },
  giftsBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  messageInput: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    color: Colors.text,
    fontSize: FontSizes.md,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingLeft: 4,
  },
  qLabel: { color: Colors.textMuted, fontSize: 11 },
  qChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.pill,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  qChipOn: { backgroundColor: Colors.primary },
  qChipText: { color: Colors.text, fontSize: 11, fontWeight: '700' },
  charHint: { color: Colors.textMuted, fontSize: 10, marginLeft: 'auto' },
  giftBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  ageTitle: { color: '#FFF', fontSize: FontSizes.xl, fontWeight: '800', textAlign: 'center' },
  ageText: { color: 'rgba(255,255,255,0.8)', marginTop: 12, textAlign: 'center', fontSize: FontSizes.md },
  ageBtn: {
    marginTop: 24,
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
  },
  ageBtnText: { color: '#FFF', fontWeight: '800' },
  ageLeave: { marginTop: 16, padding: 12 },
  ageLeaveText: { color: Colors.textSecondary, fontSize: FontSizes.md },
  joinPendingBox: { marginTop: 24, alignItems: 'center' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  profileCard: {
    alignSelf: 'center',
    backgroundColor: '#141520',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    minWidth: 260,
  },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  profileName: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '700' },
  profileFollow: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: BorderRadius.pill,
  },
  profileFollowText: { color: '#FFF', fontWeight: '700' },
  modalClose: { marginTop: 16 },
  modalCloseText: { color: Colors.textMuted, fontWeight: '600' },
  reportCard: {
    backgroundColor: '#141520',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  reportTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '800', marginBottom: 12 },
  reportRow: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  reportRowActive: { borderColor: Colors.primary, backgroundColor: 'rgba(233,30,99,0.12)' },
  reportRowText: { color: Colors.text, fontSize: FontSizes.md },
  reportSubmit: {
    marginTop: 12,
    backgroundColor: '#EF4444',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  reportSubmitText: { color: '#FFF', fontWeight: '800' },
});
