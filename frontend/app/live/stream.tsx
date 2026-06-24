import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  ScrollView,
  Modal,
  Image,
  Pressable,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import PreviewCamera from '../../src/components/camera/PreviewCamera';
import { useNativeCameraPermission } from '../../src/components/camera/useNativeCameraPermission';
import { Audio } from 'expo-av';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import apiClient from '../../src/api/client';
import { getAlertMessageForCaughtError } from '../../src/utils/userFacingError';
import { useAuthStore } from '../../src/store/authStore';
import socketService from '../../src/services/socketService';
import { useAgoraLiveRtc } from '../../src/hooks/useAgoraLiveRtc';
import { LiveGiftsPanel, useGiftAnimations } from './gifts';
import { LiveTopFansSheet } from './_liveTopFansSheet';
import { uploadImageForLive } from '../../src/live/uploadImageForLive';
import { LivePollStrip } from '../../src/live/LivePollStrip';
import FloatingHeartsBurst, { type FloatingHeartsBurstHandle } from '../../src/live/FloatingHeartsBurst';
import { LiveHostModerationSection } from '../../src/live/LiveHostModerationSection';
import { LiveHostProductPinSection } from '../../src/live/LiveHostProductPinSection';
import { probeAgoraLiveReady } from '../../src/live/probeAgoraLiveReady';
import { useLiveBattle } from '../../src/live/useLiveBattle';
import { LiveBattleChallengeModal } from '../../src/live/LiveBattleChallengeModal';
import { LiveBattleProposedModal } from '../../src/live/LiveBattleProposedModal';
import { LiveBattleScoreBar } from '../../src/live/LiveBattleScoreBar';
import { LiveBattleSplitLayout } from '../../src/live/LiveBattleSplitLayout';
import { useLiveGuests } from '../../src/live/useLiveGuests';
import { LiveGuestQueueHostSection } from '../../src/live/LiveGuestQueueHostSection';

type LiveCategoryRow = { id: string; name: string; icon?: string };

function formatCompactCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(Math.round(n));
}

/** Parse hashtags / CSV → max 5 tags (CDC). */
function parseLiveTags(raw: string): string[] {
  const t = String(raw || '').trim();
  if (!t) return [];
  const fromHash = t.match(/#[\p{L}\p{N}_]+/gu)?.map((x) => x.slice(1)) ?? [];
  const fromComma = t.split(/[,;\s]+/).map((s) => s.replace(/^#/, '').trim()).filter(Boolean);
  const merged = [...fromHash, ...fromComma].filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of merged) {
    const k = x.slice(0, 64);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
    if (out.length >= 5) break;
  }
  return out;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
  is_question?: boolean;
  is_pinned?: boolean;
  sender_role?: string;
  is_top_supporter?: boolean;
}

function mapSocketChatToRow(msg: Record<string, unknown>): ChatMessage {
  const badges = msg.sender_badges as { is_top_supporter?: boolean } | undefined;
  return {
    id: String(msg.id ?? `${Date.now()}-${Math.random()}`),
    userId: String(msg.sender_id ?? msg.userId ?? ''),
    userName: String(msg.sender_name ?? msg.userName ?? 'Anonyme'),
    text: String(msg.message ?? msg.text ?? ''),
    timestamp: Date.now(),
    is_question: Boolean(msg.is_question),
    is_pinned: Boolean(msg.is_pinned),
    sender_role: String(msg.sender_role ?? ''),
    is_top_supporter: Boolean(badges?.is_top_supporter),
  };
}

function liveChatUserColor(m: ChatMessage): string {
  if (m.sender_role === 'creator') return '#FBBF24';
  if (m.sender_role === 'moderator') return '#60A5FA';
  if (m.is_top_supporter) return '#C084FC';
  return Colors.primary;
}

export default function LiveStreamScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ prefilled_title?: string; prefilled_category?: string; resume_live_id?: string }>();
  const prefilledAppliedRef = useRef(false);
  const resumeAppliedRef = useRef(false);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [phase, setPhase] = useState<'setup' | 'live' | 'ended'>('setup');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [liveId, setLiveId] = useState<string | null>(null);
  const [liveTime, setLiveTime] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [totalGifts, setTotalGifts] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showGifts, setShowGifts] = useState(false);
  const [showTopFans, setShowTopFans] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [cameraFlipNonce, setCameraFlipNonce] = useState(0);
  const [sendingChat, setSendingChat] = useState(false);
  const [hashtagsInput, setHashtagsInput] = useState('');
  const [thumbnailLocalUri, setThumbnailLocalUri] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [liveCategories, setLiveCategories] = useState<LiveCategoryRow[]>([]);
  const [categoryId, setCategoryId] = useState('general');
  const [scheduleMode, setScheduleMode] = useState(false);
  const [privateMode, setPrivateMode] = useState(false);
  const [scheduledAtInput, setScheduledAtInput] = useState('');
  const [ageRestriction, setAgeRestriction] = useState<'all' | '13+' | '18+'>('all');
  const [goalTargetStr, setGoalTargetStr] = useState('');
  const [launchCount, setLaunchCount] = useState<number | null>(null);
  const [showQuestionsOnly, setShowQuestionsOnly] = useState(false);
  const [chatAsQuestion, setChatAsQuestion] = useState(false);
  const [goalAmount, setGoalAmount] = useState(0);
  const [goalTarget, setGoalTarget] = useState(0);
  const [peakViewers, setPeakViewers] = useState(0);
  const [topDonors, setTopDonors] = useState<
    { rank: number; sender_name?: string; total_amount_fcfa?: number; user?: { username?: string } }[]
  >([]);
  const [pollSocketBump, setPollSocketBump] = useState<unknown>(null);
  const [pollReloadKey, setPollReloadKey] = useState(0);
  const [showHostDashboard, setShowHostDashboard] = useState(false);
  const [showBattleChallenge, setShowBattleChallenge] = useState(false);
  const [hostEconomyLine, setHostEconomyLine] = useState<string | null>(null);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOpt, setPollOpt] = useState(['', '', '', '']);
  const [bannedWordsInput, setBannedWordsInput] = useState('');
  const [raisedHands, setRaisedHands] = useState<Record<string, { username: string; at: number }>>({});
  const [joinRequests, setJoinRequests] = useState<Record<string, { username: string; at: number }>>({});
  const [cohostInviteUserId, setCohostInviteUserId] = useState('');
  const [followersBaseline, setFollowersBaseline] = useState<number | null>(null);
  const [followersNow, setFollowersNow] = useState<number | null>(null);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState('5');
  const [timerLabel, setTimerLabel] = useState('');
  const [broadcastTimer, setBroadcastTimer] = useState<{ end_at_ms: number; label: string } | null>(null);
  const [screenSharingUi, setScreenSharingUi] = useState(false);
  const [beautyOn, setBeautyOn] = useState(false);
  const [hostCaptionDraft, setHostCaptionDraft] = useState('');
  const [hostSttRecording, setHostSttRecording] = useState(false);
  const [hostSttBusy, setHostSttBusy] = useState(false);
  const hostSttRecRef = useRef<InstanceType<typeof Audio.Recording> | null>(null);
  const [, setBroadcastTimerTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveIdRef = useRef<string | null>(null);
  const liveStartedAtMsRef = useRef<number | null>(null);
  const { hasPermission: hasCamPerm, requestPermission: requestCamPerm } = useNativeCameraPermission();
  const [previewFacing, setPreviewFacing] = useState<'front' | 'back'>('front');

  const { agoraJoined, agoraPreviewReady, agoraError, AgoraLocalView, AgoraRemoteGrid, remoteUids, toggleScreenShare } = useAgoraLiveRtc({
    liveId,
    role: 'host',
    enabled: phase === 'live' && !!liveId,
    muted: isMuted,
    cameraFlipNonce,
    beautyEnabled: beautyOn,
    initialCameraFront: previewFacing === 'front',
  });

  const { animations, removeAnimation, GiftAnimationBubble, GiftFullscreenHost } = useGiftAnimations(liveId || '');
  const hostHeartsRef = useRef<FloatingHeartsBurstHandle>(null);

  const { battle, proposedBattle, isBattleActive, acceptBattle, declineBattle, endBattle } = useLiveBattle(liveId);
  const { queue: guestQueue, respondGuest, removeGuest } = useLiveGuests(liveId, true);

  /** Le host reçoit les cœurs de son audience via socket → burst côté broadcaster. */
  useEffect(() => {
    if (!liveId) return;
    const handler = (data: { liveId?: string; count?: number }) => {
      if (data?.liveId !== liveId) return;
      const n = Math.min(8, Math.max(1, Number(data?.count || 1)));
      for (let i = 0; i < n; i += 1) {
        setTimeout(() => hostHeartsRef.current?.burst(), i * 100);
      }
    };
    socketService.on?.('live:hearts', handler);
    return () => {
      socketService.off?.('live:hearts', handler);
    };
  }, [liveId]);

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

  const hydrateFromStream = useCallback(async (id: string) => {
    try {
      const res = await apiClient.get(`/live/${encodeURIComponent(id)}`);
      const s = (res.data?.data ?? res.data) as Record<string, unknown> | null;
      if (!s) return;
      if (typeof s.viewers_count === 'number') setViewerCount(s.viewers_count);
      if (typeof s.total_likes === 'number') setTotalLikes(s.total_likes);
      if (typeof s.total_gifts_amount === 'number') setTotalGifts(s.total_gifts_amount);
      const startedAtRaw = s.started_at;
      const startedAtMs =
        typeof startedAtRaw === 'string'
          ? Date.parse(startedAtRaw)
          : startedAtRaw instanceof Date
            ? startedAtRaw.getTime()
            : NaN;
      if (Number.isFinite(startedAtMs) && startedAtMs > 0) {
        liveStartedAtMsRef.current = startedAtMs;
        setLiveTime(Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)));
      }
      if (typeof s.goal_amount === 'number') setGoalAmount(s.goal_amount);
      if (typeof s.goal_target === 'number' && s.goal_target > 0) setGoalTarget(s.goal_target);
      if (typeof s.peak_viewers === 'number') setPeakViewers((p) => Math.max(p, s.peak_viewers as number));
      const rawMsgs = s.chat_messages;
      if (Array.isArray(rawMsgs) && rawMsgs.length) {
        const rows = (rawMsgs as Record<string, unknown>[])
          .filter((m) => m && !m.is_deleted)
          .slice(-80)
          .map((m) => {
            const badges = m.sender_badges as { is_top_supporter?: boolean } | undefined;
            return {
              id: String(m.id ?? Math.random()),
              userId: String(m.sender_id ?? ''),
              userName: String(m.sender_name ?? 'Anonyme'),
              text: String(m.message ?? ''),
              timestamp: m.created_date ? new Date(String(m.created_date)).getTime() : Date.now(),
              is_question: Boolean(m.is_question),
              is_pinned: Boolean(m.is_pinned),
              sender_role: String(m.sender_role ?? ''),
              is_top_supporter: Boolean(badges?.is_top_supporter),
            };
          });
        setChatMessages(rows);
      }
    } catch {
      /* ignore */
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

  const visibleChatMessages = useMemo(() => {
    const base = showQuestionsOnly
      ? chatMessages.filter((m) => m.is_question || /\?\s*$/.test(String(m.text || '').trim()))
      : chatMessages;
    return base.slice(-24).map((m) => ({
      ...m,
      is_top_supporter: Boolean(m.is_top_supporter || topDonorIdSet.has(m.userId)),
    }));
  }, [chatMessages, showQuestionsOnly, topDonorIdSet]);

  const pinnedChat = useMemo(
    () => [...chatMessages].reverse().find((m) => m.is_pinned),
    [chatMessages],
  );

  const submitLivePoll = async () => {
    if (!liveId) return;
    const q = pollQuestion.trim();
    const opts = pollOpt.map((x) => String(x || '').trim()).filter(Boolean);
    if (!q || opts.length < 2) {
      Alert.alert('Sondage', 'Question + au moins 2 options requises.');
      return;
    }
    try {
      await apiClient.post(`/live/${encodeURIComponent(liveId)}/polls`, {
        question: q,
        options: opts.slice(0, 4).map((text) => ({ text })),
      });
      setShowPollModal(false);
      setPollQuestion('');
      setPollOpt(['', '', '', '']);
      setPollReloadKey((k) => k + 1);
    } catch (e: unknown) {
      Alert.alert('Sondage', getAlertMessageForCaughtError(e));
    }
  };

  const saveBannedWords = async () => {
    if (!liveId) return;
    const words = bannedWordsInput
      .split(/[,;\n]/)
      .map((w) => w.trim())
      .filter(Boolean);
    try {
      await apiClient.patch(`/live/${encodeURIComponent(liveId)}/moderation`, { banned_words: words });
      Alert.alert('Modération', 'Mots bannis enregistrés.');
    } catch (e: unknown) {
      Alert.alert('Erreur', getAlertMessageForCaughtError(e));
    }
  };

  const inviteCohost = async (targetUserId?: string) => {
    const uid = String(targetUserId || cohostInviteUserId || '').trim();
    if (!liveId || !uid) return;
    try {
      await apiClient.post(`/live/${encodeURIComponent(liveId)}/cohost/invite`, {
        userId: uid,
      });
      Alert.alert('Co-host', 'Invitation envoyée (max 5 — contrôle côté serveur).');
      if (!targetUserId) setCohostInviteUserId('');
    } catch (e: unknown) {
      Alert.alert('Erreur', getAlertMessageForCaughtError(e));
    }
  };

  const respondRaiseHandHost = async (targetUserId: string, accept: boolean) => {
    if (!liveId) return;
    try {
      await apiClient.post(`/live/${encodeURIComponent(liveId)}/raise-hand/respond`, {
        userId: targetUserId,
        accept,
      });
      setRaisedHands((prev) => {
        const n = { ...prev };
        delete n[targetUserId];
        return n;
      });
      Alert.alert(
        accept ? 'Demande acceptée' : 'Demande refusée',
        accept ? 'Invitation co-host envoyée (grille).' : 'Le spectateur a été notifié.',
      );
    } catch (e: unknown) {
      Alert.alert('Main levée', getAlertMessageForCaughtError(e));
    }
  };

  const respondJoinRequestHost = async (targetUserId: string, accept: boolean) => {
    if (!liveId) return;
    try {
      await apiClient.post(`/live/${encodeURIComponent(liveId)}/join-request/respond`, {
        userId: targetUserId,
        accept,
      });
      setJoinRequests((prev) => {
        const n = { ...prev };
        delete n[targetUserId];
        return n;
      });
      Alert.alert(
        accept ? 'Accès autorisé' : 'Accès refusé',
        accept ? 'Le spectateur peut maintenant regarder le live.' : 'Le spectateur a été notifié.',
      );
    } catch (e: unknown) {
      Alert.alert('Demande d’accès', getAlertMessageForCaughtError(e));
    }
  };

  const fetchPendingJoinRequests = useCallback(async (id: string) => {
    try {
      const res = await apiClient.get(`/live/${encodeURIComponent(id)}/join-requests`);
      const rows = (res.data?.data ?? res.data) as { userId?: string; username?: string; requested_at?: string }[];
      if (!Array.isArray(rows)) return;
      const map: Record<string, { username: string; at: number }> = {};
      for (const row of rows) {
        const uid = String(row.userId ?? '').trim();
        if (!uid) continue;
        map[uid] = {
          username: String(row.username || 'Spectateur'),
          at: row.requested_at ? Date.parse(row.requested_at) : Date.now(),
        };
      }
      setJoinRequests(map);
    } catch {
      /* ignore — live public ou erreur réseau */
    }
  }, []);

  const sendHostCaption = async () => {
    const t = hostCaptionDraft.trim();
    if (!liveId || !t) return;
    try {
      await apiClient.post(`/live/${encodeURIComponent(liveId)}/caption`, { text: t });
      setHostCaptionDraft('');
      Alert.alert('Sous-titres', 'Texte diffusé aux spectateurs.');
    } catch (e: unknown) {
      Alert.alert('Sous-titres', getAlertMessageForCaughtError(e));
    }
  };

  const startHostSttDictation = async () => {
    if (!liveId || hostSttRecRef.current || hostSttBusy) return;
    setHostSttBusy(true);
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Micro', 'Autorisez le micro pour transcrire la dictée.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      hostSttRecRef.current = recording;
      setHostSttRecording(true);
    } catch (e: unknown) {
      hostSttRecRef.current = null;
      setHostSttRecording(false);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true }).catch(() => {});
      Alert.alert('Dictée', getAlertMessageForCaughtError(e));
    } finally {
      setHostSttBusy(false);
    }
  };

  const stopHostSttAndTranscribe = async () => {
    const rec = hostSttRecRef.current;
    if (!liveId || !rec || hostSttBusy) return;
    setHostSttBusy(true);
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      hostSttRecRef.current = null;
      setHostSttRecording(false);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      if (!uri) throw new Error('Fichier audio introuvable.');
      const form = new FormData();
      form.append('audio', { uri, name: 'dictation.m4a', type: 'audio/m4a' } as unknown as Blob);
      const res = await apiClient.post(`/live/${encodeURIComponent(liveId)}/stt`, form, { timeout: 120_000 });
      const text = String((res.data as { data?: { text?: string } })?.data?.text ?? '').trim();
      if (!text) {
        Alert.alert('Dictée', 'Aucun texte reconnu. Réessayez en parlant plus près du micro.');
        return;
      }
      setHostCaptionDraft(text.slice(0, 280));
      Alert.alert('Dictée', 'Texte inséré dans le champ sous-titres. Vérifiez puis diffusez.');
    } catch (e: unknown) {
      Alert.alert('Dictée', getAlertMessageForCaughtError(e));
    } finally {
      setHostSttBusy(false);
    }
  };

  const submitBroadcastTimer = async () => {
    if (!liveId) return;
    const mins = Math.max(1, Math.min(720, Math.floor(Number(timerMinutes) || 5)));
    const end_at_ms = Date.now() + mins * 60_000;
    const label = timerLabel.trim() || `Fin dans ${mins} min`;
    try {
      await apiClient.post(`/live/${encodeURIComponent(liveId)}/broadcast-timer`, { end_at_ms, label });
      setShowTimerModal(false);
    } catch (e: unknown) {
      Alert.alert('Timer', getAlertMessageForCaughtError(e));
    }
  };

  const clearBroadcastTimerRemote = async () => {
    if (!liveId) return;
    try {
      await apiClient.delete(`/live/${encodeURIComponent(liveId)}/broadcast-timer`);
      setBroadcastTimer(null);
      setShowTimerModal(false);
    } catch (e: unknown) {
      Alert.alert('Timer', getAlertMessageForCaughtError(e));
    }
  };

  useEffect(() => {
    if (!broadcastTimer) return;
    const id = setInterval(() => setBroadcastTimerTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, [broadcastTimer]);

  useEffect(() => {
    if (!showHostDashboard) return;
    void (async () => {
      try {
        const res = await apiClient.get('/live/economy');
        const d = res.data?.data ?? res.data;
        if (d && typeof d.example_coins === 'number' && typeof d.example_usd === 'number') {
          setHostEconomyLine(
            `Taux indicatif : ${d.example_coins} coins ≈ ${d.example_usd} USD (LIVE_COINS_PER_USD=${d.coins_per_usd ?? '—'}).`,
          );
        } else setHostEconomyLine(null);
      } catch {
        setHostEconomyLine(null);
      }
    })();
  }, [showHostDashboard]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await apiClient.get('/live/categories');
        const d = res.data?.data ?? res.data;
        const cats = (d?.categories ?? []) as LiveCategoryRow[];
        if (Array.isArray(cats) && cats.length) setLiveCategories(cats);
      } catch {
        /* liste vide : l’utilisateur garde categoryId par défaut */
      }
    })();
  }, []);

  useEffect(() => {
    if (prefilledAppliedRef.current) return;
    const pt = typeof params.prefilled_title === 'string' ? params.prefilled_title.trim() : '';
    const pc = typeof params.prefilled_category === 'string' ? params.prefilled_category.trim() : '';
    if (pt) setTitle(pt.slice(0, 80));
    if (pc) setCategoryId(pc);
    prefilledAppliedRef.current = true;
  }, [params.prefilled_title, params.prefilled_category]);

  useEffect(() => {
    const rid = typeof params.resume_live_id === 'string' ? params.resume_live_id.trim() : '';
    if (!rid || resumeAppliedRef.current) return;
    resumeAppliedRef.current = true;
    void (async () => {
      setLoading(true);
      try {
        await apiClient.post(`/live/${encodeURIComponent(rid)}/start-scheduled`, {});
        const res = await apiClient.get(`/live/${encodeURIComponent(rid)}`);
        const s = (res.data?.data ?? res.data) as Record<string, unknown> | null;
        if (s?.title) setTitle(String(s.title));
        if (typeof s?.goal_target === 'number' && s.goal_target > 0) {
          setGoalTarget(s.goal_target);
          setGoalTargetStr(String(s.goal_target));
        }
        await runLaunch321();
        setLiveId(rid);
        setIsFrontCamera(previewFacing === 'front');
        setPhase('live');
        liveStartedAtMsRef.current = Date.now();
        setLiveTime(0);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          const started = liveStartedAtMsRef.current;
          if (!started) {
            setLiveTime((prev) => prev + 1);
            return;
          }
          setLiveTime(Math.max(0, Math.floor((Date.now() - started) / 1000)));
        }, 1000);
        void fetchTopDonors(rid);
      } catch (e: unknown) {
        Alert.alert('Live programmé', getAlertMessageForCaughtError(e));
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [params.resume_live_id, previewFacing]);

  useEffect(() => {
    if (accessToken) socketService.connect(accessToken);
  }, [accessToken]);

  useEffect(() => {
    liveIdRef.current = liveId;
  }, [liveId]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (liveIdRef.current) socketService.leaveLiveStream(liveIdRef.current);
    };
  }, []);

  useEffect(() => {
    if (!liveId || phase !== 'live') return;
    void fetchTopDonors(liveId);
    const t = setInterval(() => void fetchTopDonors(liveId), 20000);
    return () => clearInterval(t);
  }, [liveId, phase, fetchTopDonors]);

  useEffect(() => {
    setFollowersBaseline(null);
    setFollowersNow(null);
  }, [liveId]);

  useEffect(() => {
    if (phase !== 'live' || !user?.id) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await apiClient.get(`/users/${encodeURIComponent(user.id)}/stats`);
        if (cancelled) return;
        const pkg = res.data?.data ?? res.data;
        const f = Number(pkg?.stats?.followers);
        if (!Number.isFinite(f)) return;
        setFollowersNow(f);
        setFollowersBaseline((b) => (b == null ? f : b));
      } catch {
        /* ignore */
      }
    };
    void tick();
    const t = setInterval(() => void tick(), 45_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [phase, user?.id]);

  useEffect(() => {
    if (!liveId) return;
    socketService.joinLiveStream(liveId);

    const chatHandler = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const msg = raw as Record<string, unknown>;
      setChatMessages((prev) => [...prev.slice(-80), mapSocketChatToRow(msg)]);
    };

    const viewerHandler = (data: unknown) => {
      const d = data as { count?: number };
      if (typeof d?.count === 'number') {
        setViewerCount(d.count);
        setPeakViewers((p) => Math.max(p, d.count!));
      }
    };

    const likeHandler = (data: unknown) => {
      const d = data as { count?: number };
      if (typeof d?.count === 'number') setTotalLikes(d.count);
    };

    const giftHandler = (data: unknown) => {
      const d = data as { total_amount?: number; amount?: number; quantity?: number };
      const amt = Number(d?.total_amount ?? (d?.amount != null && d?.quantity != null ? d.amount * d.quantity : d?.amount) ?? 0);
      if (Number.isFinite(amt) && amt > 0) setTotalGifts((prev) => prev + amt);
      void hydrateFromStream(liveId);
      void fetchTopDonors(liveId);
    };

    const pinHandler = () => {
      void hydrateFromStream(liveId);
    };

    const pollCreated = (p: unknown) => {
      setPollSocketBump(p);
    };
    const pollUpdated = (p: unknown) => {
      setPollSocketBump(p);
    };
    const pollEnded = (p: unknown) => {
      setPollSocketBump(p);
    };

    const raiseHandler = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const d = raw as { userId?: string; raised?: boolean; username?: string; at?: number };
      const uid = d.userId;
      if (!uid) return;
      setRaisedHands((prev) => {
        const next = { ...prev };
        if (d.raised) {
          next[uid] = { username: String(d.username || 'Spectateur'), at: Number(d.at) || Date.now() };
        } else delete next[uid];
        return next;
      });
    };

    const joinRequestHandler = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const d = raw as { userId?: string; username?: string; at?: number };
      const uid = d.userId;
      if (!uid) return;
      setJoinRequests((prev) => ({
        ...prev,
        [uid]: { username: String(d.username || 'Spectateur'), at: Number(d.at) || Date.now() },
      }));
    };

    const joinResolvedHandler = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const d = raw as { userId?: string };
      const uid = d.userId;
      if (!uid) return;
      setJoinRequests((prev) => {
        const next = { ...prev };
        delete next[uid];
        return next;
      });
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

    socketService.on('live:chat', chatHandler);
    socketService.on('live:viewers', viewerHandler);
    socketService.on('live:like', likeHandler);
    socketService.on('live:gift', giftHandler);
    socketService.on('live:pin', pinHandler);
    socketService.on('live:poll:created', pollCreated);
    socketService.on('live:poll:updated', pollUpdated);
    socketService.on('live:poll:ended', pollEnded);
    socketService.on('live:raise-hand', raiseHandler);
    socketService.on('live:join-request', joinRequestHandler);
    socketService.on('live:join-request:resolved', joinResolvedHandler);
    socketService.on('live:timer', timerHandler);

    return () => {
      socketService.off('live:chat', chatHandler);
      socketService.off('live:viewers', viewerHandler);
      socketService.off('live:like', likeHandler);
      socketService.off('live:gift', giftHandler);
      socketService.off('live:pin', pinHandler);
      socketService.off('live:poll:created', pollCreated);
      socketService.off('live:poll:updated', pollUpdated);
      socketService.off('live:poll:ended', pollEnded);
      socketService.off('live:raise-hand', raiseHandler);
      socketService.off('live:join-request', joinRequestHandler);
      socketService.off('live:join-request:resolved', joinResolvedHandler);
      socketService.off('live:timer', timerHandler);
      socketService.leaveLiveStream(liveId);
    };
  }, [liveId, fetchTopDonors, hydrateFromStream]);

  useEffect(() => {
    if (liveId && phase === 'live') {
      void hydrateFromStream(liveId);
      void fetchPendingJoinRequests(liveId);
    }
  }, [liveId, phase, hydrateFromStream, fetchPendingJoinRequests]);

  const runLaunch321 = useCallback(async () => {
    for (const n of [3, 2, 1] as const) {
      setLaunchCount(n);
      await new Promise<void>((r) => setTimeout(r, 900));
    }
    setLaunchCount(null);
  }, []);

  const pickLiveThumbnail = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission', 'Accès galerie nécessaire pour la miniature.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setThumbnailLocalUri(result.assets[0].uri);
      setThumbnailUrl(null);
    }
  };

  const captureLiveThumbnailFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission', 'La caméra est nécessaire pour capturer la miniature.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      /** Android : l’éditeur de recadrage post-capture peut faire fermer l’app (audit mobile-first). */
      allowsEditing: Platform.OS !== 'android',
      aspect: [9, 16],
    });
    if (!result.canceled && result.assets[0]) {
      setThumbnailLocalUri(result.assets[0].uri);
      setThumbnailUrl(null);
    }
  };

  const startLive = async () => {
    const t = title.trim();
    if (!t) {
      Alert.alert('Erreur', 'Titre du live requis');
      return;
    }
    if (t.length > 80) {
      Alert.alert('Erreur', 'Titre maximum 80 caractères (CDC).');
      return;
    }
    setLoading(true);
    try {
      let thumb = thumbnailUrl;
      if (thumbnailLocalUri && !thumb) {
        setUploadingThumb(true);
        try {
          thumb = await uploadImageForLive(thumbnailLocalUri);
          setThumbnailUrl(thumb);
        } finally {
          setUploadingThumb(false);
        }
      }

      const tags = parseLiveTags(hashtagsInput);
      const goalParsed = Math.floor(Number(String(goalTargetStr).replace(/\s/g, '')) || 0);
      const goal_target = goalParsed > 0 ? goalParsed : undefined;

      let scheduled_at: Date | undefined;
      let status: 'live' | 'scheduled' = 'live';
      if (scheduleMode) {
        const raw = scheduledAtInput.trim();
        const d = raw ? new Date(raw) : null;
        if (!d || Number.isNaN(d.getTime()) || d.getTime() < Date.now() - 60_000) {
          Alert.alert('Date invalide', 'Indiquez une date/heure future (ex. 2026-04-20T18:00).');
          setLoading(false);
          return;
        }
        scheduled_at = d;
        status = 'scheduled';
      } else {
        await runLaunch321();
      }

      const res = await apiClient.post('/live/start', {
        title: t.slice(0, 80),
        description: description.trim(),
        category: categoryId,
        thumbnail_url: thumb || undefined,
        tags: tags.length ? tags : undefined,
        age_restriction: ageRestriction,
        goal_target,
        status,
        scheduled_at: scheduled_at?.toISOString(),
        private_mode: privateMode,
      });
      const data = res.data?.data ?? res.data;
      const id = String(data?.id ?? data?.live_id ?? '').trim();
      if (!id) throw new Error('Réponse sans identifiant de live');

      if (status === 'scheduled') {
        Alert.alert('Live planifié', 'Vos abonnés seront notifiés selon la configuration push du backend.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
        setLoading(false);
        return;
      }

      setLiveId(id);
      setIsFrontCamera(previewFacing === 'front');
      setPhase('live');
      liveStartedAtMsRef.current = Date.now();
      setLiveTime(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        const started = liveStartedAtMsRef.current;
        if (!started) {
          setLiveTime((prev) => prev + 1);
          return;
        }
        setLiveTime(Math.max(0, Math.floor((Date.now() - started) / 1000)));
      }, 1000);
      void fetchTopDonors(id);
    } catch (e: unknown) {
      Alert.alert('Erreur', getAlertMessageForCaughtError(e));
    } finally {
      setLoading(false);
    }
  };

  const endLive = () => {
    Alert.alert('Terminer le Live ?', 'Le replay pourra être disponible selon votre configuration.', [
      { text: 'Continuer', style: 'cancel' },
      {
        text: 'Terminer',
        style: 'destructive',
        onPress: async () => {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          liveStartedAtMsRef.current = null;
          try {
            if (liveId) await apiClient.post(`/live/${liveId}/end`, {});
            setPhase('ended');
          } catch {
            router.back();
          }
        },
      },
    ]);
  };

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || !liveId || !user) return;
    setSendingChat(true);
    try {
      await apiClient.post(`/live/${liveId}/chat`, {
        message: text,
        ...(chatAsQuestion ? { is_question: true } : {}),
      });
      setChatInput('');
    } catch (e: unknown) {
      Alert.alert('Chat', getAlertMessageForCaughtError(e));
    } finally {
      setSendingChat(false);
    }
  };

  const sendLike = async () => {
    if (!liveId) return;
    try {
      const res = await apiClient.post(`/live/${liveId}/like`, {});
      const d = res.data?.data ?? res.data;
      if (typeof d?.total_likes === 'number') setTotalLikes(d.total_likes);
    } catch {
      /* socket mettra à jour le compteur si succès côté autre client */
    }
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 3600)
      .toString()
      .padStart(2, '0')}:${Math.floor((s % 3600) / 60)
      .toString()
      .padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const recapNarrative = useMemo(() => {
    const bits = [
      `${formatTime(liveTime)} de direct`,
      `pic ${formatCompactCount(peakViewers)} spectateurs`,
      `${totalLikes} likes`,
      `${formatCompactCount(totalGifts)} FCFA en cadeaux`,
    ];
    if (followersBaseline != null && followersNow != null) {
      const d = followersNow - followersBaseline;
      bits.push(`abonnés ${d >= 0 ? '+' : ''}${d} sur la session`);
    }
    return bits.join(' · ');
  }, [liveTime, peakViewers, totalLikes, totalGifts, followersBaseline, followersNow]);

  if (phase === 'ended') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient colors={['#1a0a2e', '#0a0a12']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.endedContainer}>
          <Ionicons name="checkmark-circle" size={60} color={Colors.primary} />
          <Text style={styles.endedTitle}>Live terminé !</Text>
          <Text style={styles.endedSub}>Durée : {formatTime(liveTime)}</Text>
          <Text style={styles.endedRecap}>{recapNarrative}</Text>
          <View style={styles.endedStats}>
            <View style={styles.endedStat}>
              <Ionicons name="eye" size={20} color={Colors.text} />
              <Text style={styles.endedStatVal}>{viewerCount}</Text>
              <Text style={styles.endedStatLabel}>Spectateurs</Text>
            </View>
            <View style={styles.endedStat}>
              <Ionicons name="heart" size={20} color="#FF4757" />
              <Text style={styles.endedStatVal}>{totalLikes}</Text>
              <Text style={styles.endedStatLabel}>Likes</Text>
            </View>
            <View style={styles.endedStat}>
              <Ionicons name="gift" size={20} color="#FFD700" />
              <Text style={styles.endedStatVal}>{totalGifts}</Text>
              <Text style={styles.endedStatLabel}>Cadeaux (FCFA)</Text>
            </View>
            <View style={styles.endedStat}>
              <Ionicons name="trending-up" size={20} color={Colors.primary} />
              <Text style={styles.endedStatVal}>{peakViewers}</Text>
              <Text style={styles.endedStatLabel}>Pic spectateurs</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.replayBtn}
            onPress={() => router.replace({ pathname: '/live/replay', params: { id: liveId! } } as never)}
          >
            <Text style={styles.replayBtnText}>Voir le replay et créer des clips</Text>
          </TouchableOpacity>
          {liveId ? (
            <TouchableOpacity
              style={styles.analyticsEndedBtn}
              onPress={() => router.push({ pathname: '/live/analytics/[id]', params: { id: liveId } } as never)}
            >
              <Text style={styles.analyticsEndedBtnText}>Analytics de ce live</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.backBtn2} onPress={() => router.back()}>
            <Text style={styles.backBtn2Text}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (phase === 'setup') {
    const catRows: LiveCategoryRow[] =
      liveCategories.length > 0
        ? liveCategories
        : [
            { id: 'musique', name: 'Musique' },
            { id: 'gaming', name: 'Jeux' },
            { id: 'qa', name: 'Q&A' },
            { id: 'beauty', name: 'Beauté' },
            { id: 'actu', name: 'Actualités' },
            { id: 'cuisine', name: 'Cuisine' },
            { id: 'sport', name: 'Sport' },
            { id: 'education', name: 'Éducation' },
            { id: 'general', name: 'Général' },
          ];
    return (
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Modal visible={launchCount != null} transparent animationType="fade">
          <View style={styles.launchOverlay}>
            <Text style={styles.launchNum}>{launchCount}</Text>
            <Text style={styles.launchHint}>C’est parti…</Text>
          </View>
        </Modal>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Démarrer un Live</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView
          style={styles.setupScroll}
          contentContainerStyle={styles.setupContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.previewBox}>
            <LinearGradient colors={['#1a0a2e', '#0a0a12']} style={StyleSheet.absoluteFillObject} />
            {Platform.OS !== 'web' && hasCamPerm ? (
              <>
                <PreviewCamera
                  style={StyleSheet.absoluteFillObject}
                  facing={previewFacing}
                  active={phase === 'setup'}
                />
                {thumbnailLocalUri ? (
                  <Image source={{ uri: thumbnailLocalUri }} style={styles.previewThumbCorner} />
                ) : null}
                <TouchableOpacity
                  style={styles.previewFlip}
                  onPress={() => setPreviewFacing((f) => (f === 'front' ? 'back' : 'front'))}
                  accessibilityLabel="Inverser la caméra de prévisualisation"
                >
                  <Ionicons name="camera-reverse-outline" size={22} color="#FFF" />
                </TouchableOpacity>
              </>
            ) : Platform.OS !== 'web' && !hasCamPerm ? (
              <TouchableOpacity style={styles.previewPermBtn} onPress={() => void requestCamPerm()}>
                <Ionicons name="videocam-outline" size={28} color="#FFF" />
                <Text style={styles.previewPermText}>Autoriser caméra + micro pour prévisualiser</Text>
              </TouchableOpacity>
            ) : thumbnailLocalUri ? (
              <Image source={{ uri: thumbnailLocalUri }} style={styles.previewThumb} />
            ) : (
              <Ionicons name="videocam" size={50} color="rgba(255,255,255,0.3)" />
            )}
          </View>
          <Text style={styles.previewText}>Aperçu / miniature</Text>
          <View style={styles.thumbBtnRow}>
            <TouchableOpacity style={styles.thumbPickBtn} onPress={() => void pickLiveThumbnail()}>
              <Text style={styles.thumbPickBtnText}>Galerie</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.thumbPickBtn} onPress={() => void captureLiveThumbnailFromCamera()}>
              <Text style={styles.thumbPickBtnText}>Caméra</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.previewHint}>
            Ici vous voyez l’aperçu et la miniature. Après « Démarrer » et le décompte 3-2-1, votre image part en direct
            pour les spectateurs. Le micro reste actif sur l’antenne.
          </Text>
          <Text style={styles.label}>Titre du live * (max 80)</Text>
          <TextInput
            testID="live-title-input"
            style={styles.input}
            placeholder="Ex : Concert acoustique, Q&A…"
            placeholderTextColor={Colors.textMuted}
            value={title}
            onChangeText={(v) => setTitle(v.slice(0, 80))}
            maxLength={80}
          />
          <Text style={styles.charCount}>{title.trim().length}/80</Text>
          {title.trim().length > 0 && !loading && !uploadingThumb && !scheduleMode ? (
            <TouchableOpacity
              testID="live-start-button-top"
              style={[styles.goLiveBtn, { marginTop: Spacing.sm, marginBottom: Spacing.sm }]}
              onPress={() => void startLive()}
            >
              <Ionicons name="flash" size={20} color="#FFF" />
              <Text style={styles.goLiveBtnText}>Démarrer tout de suite (3-2-1)</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={styles.label}>Hashtags / tags (max 5, ex. #afrobeat #bamako)</Text>
          <TextInput
            style={styles.input}
            placeholder="#musique #live"
            placeholderTextColor={Colors.textMuted}
            value={hashtagsInput}
            onChangeText={setHashtagsInput}
          />
          <Text style={styles.label}>Description (optionnel)</Text>
          <TextInput
            style={[styles.input, { height: 60 }]}
            placeholder="De quoi parle ce live ?"
            placeholderTextColor={Colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <Text style={styles.label}>Catégorie (CDC)</Text>
          <View style={styles.categories}>
            {catRows.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.catChip, categoryId === c.id && styles.catChipActive]}
                onPress={() => setCategoryId(c.id)}
              >
                <Text style={[styles.catChipText, categoryId === c.id && { color: '#FFF' }]}>
                  {(c.icon ? `${c.icon} ` : '') + c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Planifier (Wonder notifié)</Text>
            <Switch value={scheduleMode} onValueChange={setScheduleMode} />
          </View>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: Spacing.sm }}>
              <Text style={styles.label}>Accès sur demande</Text>
              <Text style={styles.hint}>
                Les spectateurs envoient une demande ; vous acceptez ou refusez avant qu’ils voient le live.
              </Text>
            </View>
            <Switch value={privateMode} onValueChange={setPrivateMode} />
          </View>
          {scheduleMode ? (
            <>
              <Text style={styles.hint}>ISO local : 2026-04-20T18:00 (heure future)</Text>
              <TextInput
                style={styles.input}
                placeholder="2026-04-20T18:00"
                placeholderTextColor={Colors.textMuted}
                value={scheduledAtInput}
                onChangeText={setScheduledAtInput}
              />
            </>
          ) : null}
          <Text style={styles.label}>Restriction d’âge</Text>
          <View style={styles.categories}>
            {(
              [
                { id: 'all' as const, label: 'Tout public' },
                { id: '13+' as const, label: '13+' },
                { id: '18+' as const, label: '18+' },
              ] as const
            ).map((a) => (
              <TouchableOpacity
                key={a.id}
                style={[styles.catChip, ageRestriction === a.id && styles.catChipActive]}
                onPress={() => setAgeRestriction(a.id)}
              >
                <Text style={[styles.catChipText, ageRestriction === a.id && { color: '#FFF' }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Objectif cadeaux (FCFA, optionnel)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex : 50000"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numeric"
            value={goalTargetStr}
            onChangeText={setGoalTargetStr}
          />
          <TouchableOpacity
            style={[styles.modalOutline, { marginBottom: Spacing.md }]}
            onPress={() => void probeAgoraLiveReady()}
          >
            <Text style={styles.modalOutlineText}>Tester connexion Agora</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="live-start-button"
            style={[
              styles.goLiveBtn,
              (!title.trim() || loading || uploadingThumb) && { opacity: 0.5 },
            ]}
            onPress={() => void startLive()}
            disabled={!title.trim() || loading || uploadingThumb}
          >
            {loading || uploadingThumb ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name={scheduleMode ? 'calendar' : 'radio'} size={22} color="#FFF" />
                <Text style={styles.goLiveBtnText}>
                  {scheduleMode ? 'Planifier le Live' : 'Démarrer le Live (3-2-1)'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <Modal visible={launchCount != null} transparent animationType="fade">
        <View style={styles.launchOverlay}>
          <Text style={styles.launchNum}>{launchCount}</Text>
        </View>
      </Modal>

      <Modal visible={showTimerModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Timer visible (tous)</Text>
            <Text style={styles.modalMuted}>Durée en minutes (1–720), synchronisée par socket.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Minutes"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              value={timerMinutes}
              onChangeText={setTimerMinutes}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Libellé (optionnel)"
              placeholderTextColor={Colors.textMuted}
              value={timerLabel}
              onChangeText={setTimerLabel}
            />
            <TouchableOpacity style={styles.modalPrimary} onPress={() => void submitBroadcastTimer()}>
              <Text style={styles.modalPrimaryText}>Lancer / mettre à jour</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalPrimary} onPress={() => void clearBroadcastTimerRemote()}>
              <Text style={styles.modalPrimaryText}>Retirer le timer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowTimerModal(false)}>
              <Text style={styles.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showPollModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nouveau sondage</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Question"
              placeholderTextColor={Colors.textMuted}
              value={pollQuestion}
              onChangeText={setPollQuestion}
            />
            {pollOpt.map((o, i) => (
              <TextInput
                key={i}
                style={styles.modalInput}
                placeholder={`Option ${i + 1}`}
                placeholderTextColor={Colors.textMuted}
                value={o}
                onChangeText={(v) => {
                  const next = [...pollOpt];
                  next[i] = v;
                  setPollOpt(next);
                }}
              />
            ))}
            <TouchableOpacity style={styles.modalPrimary} onPress={() => void submitLivePoll()}>
              <Text style={styles.modalPrimaryText}>Lancer le sondage</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowPollModal(false)}>
              <Text style={styles.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showHostDashboard} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '88%' }]}>
            <Text style={styles.modalTitle}>Tableau de bord live</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {hostEconomyLine ? (
                <Text style={[styles.modalMuted, { marginBottom: Spacing.sm }]}>{hostEconomyLine}</Text>
              ) : null}
              <Text style={styles.modalSection}>Top donateurs</Text>
              {topDonors.length === 0 ? (
                <Text style={styles.modalMuted}>Aucun don pour l’instant.</Text>
              ) : (
                topDonors.slice(0, 3).map((d: { rank?: number; sender_name?: string; total_amount_fcfa?: number; total_amount?: number }, i: number) => (
                  <Text key={i} style={styles.modalLine}>
                    {d.rank ?? i + 1}. {d.sender_name || '?'} —{' '}
                    {formatCompactCount(Number(d.total_amount_fcfa ?? d.total_amount ?? 0) || 0)} FCFA
                  </Text>
                ))
              )}
              <Text style={styles.modalSection}>Abonnés (pendant ce live)</Text>
              {followersBaseline != null && followersNow != null ? (
                <Text style={styles.modalLine}>
                  {followersNow >= followersBaseline ? '+' : ''}
                  {followersNow - followersBaseline} depuis le début · actuel {followersNow.toLocaleString('fr-FR')}
                </Text>
              ) : (
                <Text style={styles.modalMuted}>Chargement des stats profil…</Text>
              )}
              <Text style={styles.modalSection}>Sous-titres live (CDC 6.2)</Text>
              <Text style={styles.modalMuted}>
                Texte manuel diffusé à tous les spectateurs. Dictée : enregistrement court envoyé au serveur (Whisper si
                OPENAI_API_KEY est configurée).
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Phrase à afficher (max 280 car.)"
                placeholderTextColor={Colors.textMuted}
                value={hostCaptionDraft}
                onChangeText={(x) => setHostCaptionDraft(x.slice(0, 280))}
                multiline
              />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <TouchableOpacity
                  style={[styles.modalOutline, hostSttRecording && { opacity: 0.45 }]}
                  disabled={hostSttRecording || hostSttBusy}
                  onPress={() => void startHostSttDictation()}
                >
                  <Text style={styles.modalOutlineText}>{hostSttBusy && !hostSttRecording ? '…' : 'Dictée'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalOutline, (!hostSttRecording || hostSttBusy) && { opacity: 0.45 }]}
                  disabled={!hostSttRecording || hostSttBusy}
                  onPress={() => void stopHostSttAndTranscribe()}
                >
                  <Text style={styles.modalOutlineText}>Transcrire</Text>
                </TouchableOpacity>
              </View>
              {hostSttBusy ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 8 }} /> : null}
              <TouchableOpacity style={styles.modalPrimary} onPress={() => void sendHostCaption()}>
                <Text style={styles.modalPrimaryText}>Diffuser le sous-titre</Text>
              </TouchableOpacity>
              <Text style={styles.modalSection}>Beauté & arrière-plan</Text>
              <Text style={styles.modalMuted}>
                Beauté visage : bouton étincelles sur le flux. Fond virtuel ou flou d’arrière-plan : option avancée
                gérée par le moteur vidéo natif de l’app — selon version et appareil (non disponible sur le Web).
              </Text>
              {liveId ? (
                <TouchableOpacity
                  style={styles.modalPrimary}
                  onPress={() => {
                    setShowHostDashboard(false);
                    router.push({ pathname: '/live/analytics/[id]', params: { id: liveId } } as never);
                  }}
                >
                  <Text style={styles.modalPrimaryText}>Ouvrir les analytics du live</Text>
                </TouchableOpacity>
              ) : null}
              <Text style={styles.modalSection}>Demandes d’accès (live privé)</Text>
              {Object.keys(joinRequests).length === 0 ? (
                <Text style={styles.modalMuted}>Aucune demande en attente.</Text>
              ) : (
                Object.entries(joinRequests).map(([uid, h]) => (
                  <View key={`join-${uid}`} style={styles.raisedHandRow}>
                    <Text style={styles.modalLine} numberOfLines={1}>
                      {h.username}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      <TouchableOpacity style={styles.inviteCohostChip} onPress={() => void respondJoinRequestHost(uid, true)}>
                        <Text style={styles.inviteCohostChipText}>Accepter</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.inviteCohostChip, { backgroundColor: 'rgba(248,113,113,0.25)' }]}
                        onPress={() => void respondJoinRequestHost(uid, false)}
                      >
                        <Text style={styles.inviteCohostChipText}>Refuser</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
              <Text style={styles.modalSection}>Mains levées</Text>
              {Object.keys(raisedHands).length === 0 ? (
                <Text style={styles.modalMuted}>Personne pour l’instant.</Text>
              ) : (
                Object.entries(raisedHands).map(([uid, h]) => (
                  <View key={uid} style={styles.raisedHandRow}>
                    <Text style={styles.modalLine} numberOfLines={1}>
                      {h.username}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      <TouchableOpacity style={styles.inviteCohostChip} onPress={() => void respondRaiseHandHost(uid, true)}>
                        <Text style={styles.inviteCohostChipText}>Accepter (antenne)</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.inviteCohostChip, { backgroundColor: 'rgba(248,113,113,0.25)' }]}
                        onPress={() => void respondRaiseHandHost(uid, false)}
                      >
                        <Text style={styles.inviteCohostChipText}>Refuser</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.inviteCohostChip} onPress={() => void inviteCohost(uid)}>
                        <Text style={styles.inviteCohostChipText}>Co-host grille</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
              <Text style={styles.modalSection}>Mots bannis (CSV)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="spam, insulte, …"
                placeholderTextColor={Colors.textMuted}
                value={bannedWordsInput}
                onChangeText={setBannedWordsInput}
              />
              <TouchableOpacity style={styles.modalPrimary} onPress={() => void saveBannedWords()}>
                <Text style={styles.modalPrimaryText}>Enregistrer filtres</Text>
              </TouchableOpacity>
              <Text style={styles.modalSection}>Inviter un co-host (ID utilisateur)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="UUID du co-host"
                placeholderTextColor={Colors.textMuted}
                value={cohostInviteUserId}
                onChangeText={setCohostInviteUserId}
              />
              <TouchableOpacity style={styles.modalPrimary} onPress={() => void inviteCohost()}>
                <Text style={styles.modalPrimaryText}>Envoyer invitation</Text>
              </TouchableOpacity>
              {liveId ? (
                <>
                  <LiveHostModerationSection liveId={liveId} />
                  <LiveHostProductPinSection liveId={liveId} />
                  <Text style={styles.modalSection}>Multi-guest (8 places TikTok)</Text>
                  <LiveGuestQueueHostSection
                    queue={guestQueue}
                    onAccept={(uid) => void respondGuest(uid, true)}
                    onReject={(uid) => void respondGuest(uid, false)}
                  />
                  <TouchableOpacity
                    style={styles.modalOutline}
                    onPress={() => {
                      setShowHostDashboard(false);
                      setShowBattleChallenge(true);
                    }}
                  >
                    <Text style={styles.modalOutlineText}>Lancer un Battle 1v1</Text>
                  </TouchableOpacity>
                  {isBattleActive ? (
                    <TouchableOpacity style={styles.modalPrimary} onPress={() => void endBattle()}>
                      <Text style={styles.modalPrimaryText}>Terminer le battle</Text>
                    </TouchableOpacity>
                  ) : null}
                </>
              ) : null}
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowHostDashboard(false)}>
              <Text style={styles.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {liveId ? (
        <LiveBattleChallengeModal
          visible={showBattleChallenge}
          liveId={liveId}
          onClose={() => setShowBattleChallenge(false)}
          onChallenged={() => setShowBattleChallenge(false)}
        />
      ) : null}

      <LiveBattleProposedModal
        visible={!!proposedBattle && proposedBattle.status === 'pending' && proposedBattle.opponent_live_id === liveId}
        onAccept={() => void acceptBattle()}
        onDecline={() => void declineBattle()}
      />

      {isBattleActive && battle && liveId ? (
        <LiveBattleScoreBar battle={battle} liveId={liveId} topInset={insets.top + 48} />
      ) : null}

      <LiveBattleSplitLayout
        battle={battle}
        liveId={liveId || ''}
        battleActive={isBattleActive && !!battle && !!liveId}
        mainChildren={
      <View style={styles.cameraPlaceholder}>
        <LinearGradient colors={['#1a0020', '#0a0a12', '#001020']} style={StyleSheet.absoluteFillObject} />
        {Platform.OS !== 'web' && agoraPreviewReady ? (
          <>
            <AgoraLocalView style={StyleSheet.absoluteFillObject} />
            {remoteUids.length > 0 ? (
              <View style={styles.cohostStrip} pointerEvents="box-none">
                <AgoraRemoteGrid maxCells={8} style={{}} />
              </View>
            ) : null}
          </>
        ) : null}
        {!agoraPreviewReady ? (
          <>
            <Ionicons name="videocam" size={60} color="rgba(255,255,255,0.15)" />
            <Text style={styles.camHint}>Caméra en direct</Text>
            <Text style={styles.camSubHint}>
              {agoraError ||
                (Platform.OS === 'web'
                  ? 'Le direct vidéo complet se fait dans l’app AfriWonder sur téléphone ou tablette (version installée).'
                  : 'Connexion au direct…')}
            </Text>
          </>
        ) : null}
      </View>
        }
      />

      {animations.map((anim) => (
        <GiftAnimationBubble key={anim.id} gift={anim} onRemove={removeAnimation} />
      ))}
      <GiftFullscreenHost />
      {/* Cœurs flottants que le host voit quand son audience tap pour liker. */}
      <FloatingHeartsBurst ref={hostHeartsRef} />

      <LiveTopFansSheet
        liveId={liveId || ''}
        visible={showTopFans}
        onClose={() => setShowTopFans(false)}
      />

      {liveId ? (
        <View style={[styles.pollHostWrap, { top: insets.top + 52 }]} pointerEvents="box-none">
          <LivePollStrip key={pollReloadKey} liveId={liveId} onSocketPoll={pollSocketBump as never} />
        </View>
      ) : null}

      {broadcastTimer && Date.now() < broadcastTimer.end_at_ms ? (
        <View
          style={[
            styles.broadcastTimerHost,
            { top: insets.top + (goalTarget > 0 ? 96 : 52) },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.broadcastTimerText} numberOfLines={2}>
            {Math.max(0, Math.ceil((broadcastTimer.end_at_ms - Date.now()) / 1000))}s
            {broadcastTimer.label ? ` · ${broadcastTimer.label}` : ''}
          </Text>
        </View>
      ) : null}

      {goalTarget > 0 ? (
        <View style={[styles.goalBarHost, { top: insets.top + 48 }]}>
          <Text style={styles.goalBarText}>
            Objectif {formatCompactCount(goalAmount)} / {formatCompactCount(goalTarget)} FCFA
          </Text>
          <View style={styles.goalTrack}>
            <View
              style={[
                styles.goalFill,
                {
                  width: `${Math.min(100, goalTarget > 0 ? (100 * goalAmount) / goalTarget : 0)}%`,
                },
              ]}
            />
          </View>
        </View>
      ) : null}

      {topDonors.length > 0 ? (
        <View style={[styles.top3Host, { top: insets.top + (goalTarget > 0 ? 100 : 52) }]}>
          <Text style={styles.top3Title}>Top 3</Text>
          <View style={styles.top3RowInner}>
            {topDonors.slice(0, 3).map((d: { sender_name?: string; total_amount_fcfa?: number }, i: number) => (
              <Text key={i} style={styles.top3Name} numberOfLines={1}>
                {i + 1}. {(d.sender_name || '?').slice(0, 10)} {formatCompactCount(d.total_amount_fcfa || 0)}
              </Text>
            ))}
          </View>
        </View>
      ) : null}

      <View style={[styles.liveTopBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.liveBadgeRow}>
          <View style={styles.liveBadge}>
            <View style={styles.liveBadgeDot} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
          <Text style={styles.liveTimer}>{formatTime(liveTime)}</Text>
          <View style={styles.viewerBadge}>
            <Ionicons name="eye" size={12} color="#FFF" />
            <Text style={styles.viewerText}>{formatCompactCount(viewerCount)}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={() => {
              setShowTopFans(true);
              setShowGifts(false);
            }}
            style={[styles.dashBtn, { backgroundColor: 'rgba(212,175,55,0.22)' }]}
            accessibilityLabel="Top Fans"
          >
            <Ionicons name="trophy" size={20} color="#D4AF37" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setShowHostDashboard(true);
              void fetchTopDonors(liveId || '');
            }}
            style={styles.dashBtn}
            accessibilityLabel="Tableau de bord"
          >
            <Ionicons name="stats-chart" size={20} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowPollModal(true)} style={styles.dashBtn} accessibilityLabel="Sondage">
            <Ionicons name="bar-chart" size={20} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowTimerModal(true)} style={styles.dashBtn} accessibilityLabel="Timer live">
            <Ionicons name="timer-outline" size={20} color="#FFF" />
          </TouchableOpacity>
          {Platform.OS !== 'web' ? (
            <TouchableOpacity
              onPress={async () => {
                const r = await toggleScreenShare();
                if (!r.ok) Alert.alert('Partage écran', r.message || 'Indisponible');
                else setScreenSharingUi(!!r.on);
              }}
              style={[styles.dashBtn, screenSharingUi && { backgroundColor: 'rgba(34,197,94,0.45)' }]}
              accessibilityLabel="Partage d écran"
            >
              <Ionicons name="desktop-outline" size={20} color="#FFF" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={endLive} style={styles.endBtn}>
            <Text style={styles.endBtnText}>Terminer</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.rightActions, { bottom: 100 + insets.bottom }]}>
        <TouchableOpacity
          style={styles.rightBtn}
          onPress={() => {
            setIsFrontCamera((prev) => !prev);
            setCameraFlipNonce((n) => n + 1);
          }}
          accessibilityLabel={isFrontCamera ? 'Caméra avant' : 'Caméra arrière'}
        >
          <Ionicons name="camera-reverse" size={24} color="#FFF" />
        </TouchableOpacity>
        {Platform.OS !== 'web' ? (
          <TouchableOpacity
            style={[styles.rightBtn, beautyOn && { backgroundColor: 'rgba(236,72,153,0.35)' }]}
            onPress={() => setBeautyOn((v) => !v)}
            accessibilityLabel="Beauté visage"
          >
            <Ionicons name="sparkles" size={24} color={beautyOn ? '#FBCFE8' : '#FFF'} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.rightBtn} onPress={() => setIsMuted((prev) => !prev)}>
          <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color={isMuted ? '#EF4444' : '#FFF'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.rightBtn} onPress={() => void sendLike()}>
          <Ionicons name="heart" size={24} color="#FF4757" />
          <Text style={styles.rightBtnCount}>{totalLikes}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rightBtn, { backgroundColor: 'rgba(255,215,0,0.2)' }]}
          onPress={() => {
            setShowGifts(true);
            setShowTopFans(false);
          }}
        >
          <Ionicons name="gift" size={24} color="#FFD700" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rightBtn, showTopFans && { backgroundColor: 'rgba(212,175,55,0.35)' }]}
          onPress={() => {
            setShowTopFans(true);
            setShowGifts(false);
          }}
          accessibilityLabel="Top Fans"
        >
          <Ionicons name="trophy" size={22} color="#D4AF37" />
          <Text style={styles.rightBtnCount}>Top</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.chatArea, { bottom: 60 + insets.bottom }]}>
        {pinnedChat ? (
          <View style={styles.pinnedBanner}>
            <Text style={styles.pinnedText} numberOfLines={2}>
              📌 {pinnedChat.userName}: {pinnedChat.text}
            </Text>
          </View>
        ) : null}
        <View style={styles.chatFilterRow}>
          <Text style={styles.chatFilterLabel}>Fil questions</Text>
          <Switch value={showQuestionsOnly} onValueChange={setShowQuestionsOnly} />
          <Text style={styles.chatFilterLabel}>Msg = question</Text>
          <Switch value={chatAsQuestion} onValueChange={setChatAsQuestion} />
        </View>
        <FlatList
          data={visibleChatMessages}
          keyExtractor={(item) => item.id}
          style={styles.chatList}
          renderItem={({ item }) => (
            <Pressable
              onLongPress={() => {
                if (!liveId || item.text.startsWith('🎁')) return;
                Alert.alert('Modération', item.userName, [
                  {
                    text: 'Épingler',
                    onPress: () =>
                      void apiClient.patch(`/live/${liveId}/chat/${encodeURIComponent(item.id)}/pin`, { pin: true }),
                  },
                  {
                    text: 'Désépingler',
                    onPress: () =>
                      void apiClient.patch(`/live/${liveId}/chat/${encodeURIComponent(item.id)}/pin`, { pin: false }),
                  },
                  {
                    text: 'Mute 10 min (silence)',
                    onPress: () =>
                      void apiClient.post(`/live/${encodeURIComponent(liveId)}/ban`, {
                        userId: item.userId,
                        reason: 'Mute 10 min (hôte)',
                        durationMinutes: 10,
                      }),
                  },
                  {
                    text: 'Mute 60 min',
                    onPress: () =>
                      void apiClient.post(`/live/${encodeURIComponent(liveId)}/ban`, {
                        userId: item.userId,
                        reason: 'Mute 60 min (hôte)',
                        durationMinutes: 60,
                      }),
                  },
                  {
                    text: 'Bannir définitivement',
                    style: 'destructive',
                    onPress: () =>
                      void apiClient.post(`/live/${encodeURIComponent(liveId)}/ban`, {
                        userId: item.userId,
                        reason: 'Ban définitif (hôte)',
                        permanent: true,
                      }),
                  },
                  { text: 'Annuler', style: 'cancel' },
                ]);
              }}
              style={styles.chatMsg}
            >
              <Text style={[styles.chatUserName, { color: liveChatUserColor(item) }]}>
                {item.sender_role === 'creator' ? '⭐ ' : item.sender_role === 'moderator' ? '🛡️ ' : ''}
                {item.is_top_supporter ? '👑 ' : ''}
                {item.is_question ? '❓ ' : ''}
                {item.userName}
              </Text>
              <Text style={styles.chatText}>{item.text}</Text>
            </Pressable>
          )}
        />
        <Text style={styles.chatCharCount}>{chatInput.length}/500</Text>
        <View style={styles.chatInputRow}>
          <TextInput
            style={styles.chatInputField}
            placeholder="Envoyer un message…"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={chatInput}
            onChangeText={(v) => setChatInput(v.slice(0, 500))}
            onSubmitEditing={() => void sendChat()}
            editable={!sendingChat}
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.chatSendBtn, sendingChat && { opacity: 0.5 }]}
            onPress={() => void sendChat()}
            disabled={sendingChat}
          >
            <Ionicons name="send" size={18} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.titleOverlay, { bottom: 16 + insets.bottom }]}>
        <Text style={styles.liveTitle}>{title}</Text>
      </View>

      {showGifts ? (
        <View style={styles.giftsOverlay}>
          <TouchableOpacity style={styles.giftsBackdrop} activeOpacity={1} onPress={() => setShowGifts(false)} />
          <LiveGiftsPanel
            liveId={liveId || ''}
            creatorId={user?.id || ''}
            visible={showGifts}
            onClose={() => setShowGifts(false)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  setupScroll: { flex: 1 },
  setupContent: { paddingHorizontal: Spacing.xl, paddingBottom: 48 },
  previewThumb: { ...StyleSheet.absoluteFillObject, opacity: 0.45 },
  thumbBtnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    justifyContent: 'center',
  },
  thumbPickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.pill,
    backgroundColor: 'rgba(233,30,99,0.35)',
  },
  thumbPickBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSizes.sm },
  charCount: { alignSelf: 'flex-end', color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.md },
  hint: { color: Colors.textMuted, fontSize: FontSizes.xs, marginBottom: 6 },
  launchOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  launchNum: { fontSize: 96, fontWeight: '900', color: '#FFF' },
  launchHint: { color: 'rgba(255,255,255,0.7)', marginTop: 12, fontSize: FontSizes.md },
  pollHostWrap: { position: 'absolute', left: 8, right: 78, zIndex: 8 },
  broadcastTimerHost: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 9,
    alignItems: 'center',
  },
  broadcastTimerText: {
    color: '#FFF',
    fontSize: FontSizes.sm,
    fontWeight: '800',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.pill,
    overflow: 'hidden',
    textAlign: 'center',
  },
  goalBarHost: {
    position: 'absolute',
    left: 8,
    right: 78,
    zIndex: 7,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: BorderRadius.md,
  },
  goalBarText: { color: '#FFF', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  goalTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  goalFill: { height: '100%', backgroundColor: '#E91E63' },
  top3Host: {
    position: 'absolute',
    left: 8,
    right: 78,
    zIndex: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: BorderRadius.pill,
  },
  top3Title: { color: '#FFD700', fontSize: 10, fontWeight: '800' },
  top3RowInner: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  top3Name: { color: '#FFF', fontSize: 10, fontWeight: '600', maxWidth: '32%' },
  dashBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  pinnedBanner: {
    marginBottom: 6,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,215,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.45)',
  },
  pinnedText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  chatFilterRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' },
  chatFilterLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '600' },
  chatCharCount: { color: 'rgba(255,255,255,0.35)', fontSize: 10, alignSelf: 'flex-end', marginBottom: 2 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: '#141520',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  modalTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '800', marginBottom: Spacing.md },
  modalSection: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: '700', marginTop: Spacing.md, marginBottom: 6 },
  modalMuted: { color: Colors.textMuted, fontSize: FontSizes.sm },
  modalLine: { color: Colors.text, fontSize: FontSizes.sm, marginBottom: 4 },
  modalInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  modalPrimary: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  modalPrimaryText: { color: '#FFF', fontWeight: '800' },
  modalOutline: {
    flex: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  modalOutlineText: { color: Colors.primary, fontWeight: '800', fontSize: FontSizes.sm },
  modalClose: { marginTop: Spacing.md, alignItems: 'center', padding: Spacing.sm },
  modalCloseText: { color: Colors.textSecondary, fontWeight: '600' },
  previewBox: {
    height: 200,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  previewThumbCorner: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  previewFlip: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPermBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    gap: 8,
    zIndex: 1,
  },
  previewPermText: { color: '#FFF', fontSize: FontSizes.sm, textAlign: 'center', maxWidth: 260 },
  previewText: { color: 'rgba(255,255,255,0.4)', marginTop: 8 },
  previewHint: { color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 4, textAlign: 'center', paddingHorizontal: 12 },
  label: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    color: Colors.text,
    fontSize: FontSizes.md,
  },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surface,
  },
  catChipActive: { backgroundColor: '#E91E63' },
  catChipText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  goLiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E91E63',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginTop: Spacing.xxl,
    gap: 10,
  },
  goLiveBtnText: { color: '#FFF', fontSize: FontSizes.lg, fontWeight: 'bold' },
  cohostStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 100,
    zIndex: 5,
    maxHeight: 200,
  },
  cameraPlaceholder: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  camHint: { color: 'rgba(255,255,255,0.2)', marginTop: 8 },
  camSubHint: { color: 'rgba(255,255,255,0.12)', fontSize: 11, marginTop: 4 },
  liveTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    zIndex: 10,
  },
  liveBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF0000',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  liveBadgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' },
  liveBadgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  liveTimer: { color: '#FFF', fontSize: FontSizes.md, fontWeight: 'bold' },
  viewerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  viewerText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  endBtn: { backgroundColor: 'rgba(255,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  endBtnText: { color: '#FFF', fontWeight: 'bold' },
  rightActions: { position: 'absolute', right: 12, gap: 16, zIndex: 10, alignItems: 'center' },
  rightBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightBtnCount: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  chatArea: { position: 'absolute', left: 12, right: 70, zIndex: 5, maxHeight: 200 },
  chatList: { maxHeight: 150 },
  chatMsg: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  chatUserName: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
  chatText: { color: '#FFF', fontSize: 12, flexShrink: 1 },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  chatInputField: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#FFF',
    fontSize: 13,
  },
  chatSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleOverlay: { position: 'absolute', left: Spacing.xl, right: 70 },
  liveTitle: { color: '#FFF', fontSize: FontSizes.lg, fontWeight: 'bold' },
  giftsOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 20, justifyContent: 'flex-end' },
  giftsBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  endedContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  endedTitle: { fontSize: FontSizes.xxl, fontWeight: 'bold', color: Colors.text, marginTop: 16 },
  endedSub: { color: Colors.textSecondary, fontSize: FontSizes.md, marginTop: 4 },
  endedRecap: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: Spacing.lg,
    lineHeight: 20,
  },
  endedStats: { flexDirection: 'row', gap: 24, marginTop: 24, marginBottom: 30, flexWrap: 'wrap', justifyContent: 'center' },
  endedStat: { alignItems: 'center', gap: 4 },
  endedStatVal: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: 'bold' },
  endedStatLabel: { color: Colors.textMuted, fontSize: FontSizes.xs },
  replayBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
  },
  replayBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: FontSizes.md },
  analyticsEndedBtn: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  analyticsEndedBtnText: { color: Colors.primary, fontWeight: '800', fontSize: FontSizes.sm, textAlign: 'center' },
  backBtn2: { marginTop: 12, paddingVertical: 10 },
  backBtn2Text: { color: Colors.textSecondary, fontSize: FontSizes.md },
  raisedHandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
    maxWidth: '100%',
  },
  inviteCohostChip: {
    backgroundColor: 'rgba(99,102,241,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexShrink: 0,
  },
  inviteCohostChipText: { color: '#E0E7FF', fontSize: 11, fontWeight: '700' },
});
