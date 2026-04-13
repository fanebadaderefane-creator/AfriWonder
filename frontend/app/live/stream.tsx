import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import socketService from '../../src/services/socketService';
import { useAgoraLiveRtc } from '../../src/hooks/useAgoraLiveRtc';
import { LiveGiftsPanel, useGiftAnimations } from './gifts';

const CATEGORIES = ['Musique', 'Danse', 'Cuisine', 'Discussion', 'Sport', 'Education', 'Gaming', 'Mode'];

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}

function mapSocketChatToRow(msg: Record<string, unknown>): ChatMessage {
  return {
    id: String(msg.id ?? `${Date.now()}-${Math.random()}`),
    userId: String(msg.sender_id ?? msg.userId ?? ''),
    userName: String(msg.sender_name ?? msg.userName ?? 'Anonyme'),
    text: String(msg.message ?? msg.text ?? ''),
    timestamp: Date.now(),
  };
}

export default function LiveStreamScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [phase, setPhase] = useState<'setup' | 'live' | 'ended'>('setup');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Discussion');
  const [loading, setLoading] = useState(false);
  const [liveId, setLiveId] = useState<string | null>(null);
  const [liveTime, setLiveTime] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [totalGifts, setTotalGifts] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showGifts, setShowGifts] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [cameraFlipNonce, setCameraFlipNonce] = useState(0);
  const [sendingChat, setSendingChat] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { agoraJoined, agoraError, AgoraLocalView } = useAgoraLiveRtc({
    liveId,
    role: 'host',
    enabled: phase === 'live' && !!liveId,
    muted: isMuted,
    cameraFlipNonce,
  });

  const { animations, removeAnimation, GiftAnimationBubble } = useGiftAnimations(liveId || '');

  useEffect(() => {
    if (accessToken) socketService.connect(accessToken);
  }, [accessToken]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (liveId) socketService.leaveLiveStream(liveId);
    };
  }, [liveId]);

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
      if (typeof d?.count === 'number') setViewerCount(d.count);
    };

    const likeHandler = (data: unknown) => {
      const d = data as { count?: number };
      if (typeof d?.count === 'number') setTotalLikes(d.count);
    };

    const giftHandler = (data: unknown) => {
      const d = data as { total_amount?: number; amount?: number; quantity?: number };
      const amt = Number(d?.total_amount ?? (d?.amount != null && d?.quantity != null ? d.amount * d.quantity : d?.amount) ?? 0);
      if (Number.isFinite(amt) && amt > 0) setTotalGifts((prev) => prev + amt);
    };

    socketService.on('live:chat', chatHandler);
    socketService.on('live:viewers', viewerHandler);
    socketService.on('live:like', likeHandler);
    socketService.on('live:gift', giftHandler);

    return () => {
      socketService.off('live:chat', chatHandler);
      socketService.off('live:viewers', viewerHandler);
      socketService.off('live:like', likeHandler);
      socketService.off('live:gift', giftHandler);
    };
  }, [liveId]);

  const hydrateFromStream = useCallback(async (id: string) => {
    try {
      const res = await apiClient.get(`/live/${encodeURIComponent(id)}`);
      const s = (res.data?.data ?? res.data) as Record<string, unknown> | null;
      if (!s) return;
      if (typeof s.viewers_count === 'number') setViewerCount(s.viewers_count);
      if (typeof s.total_likes === 'number') setTotalLikes(s.total_likes);
      if (typeof s.total_gifts_amount === 'number') setTotalGifts(s.total_gifts_amount);
      const rawMsgs = s.chat_messages;
      if (Array.isArray(rawMsgs) && rawMsgs.length) {
        const rows = (rawMsgs as Record<string, unknown>[])
          .filter((m) => m && !m.is_deleted)
          .slice(-40)
          .map((m) => ({
            id: String(m.id ?? Math.random()),
            userId: String(m.sender_id ?? ''),
            userName: String(m.sender_name ?? 'Anonyme'),
            text: String(m.message ?? ''),
            timestamp: m.created_date ? new Date(String(m.created_date)).getTime() : Date.now(),
          }));
        setChatMessages(rows);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (liveId && phase === 'live') void hydrateFromStream(liveId);
  }, [liveId, phase, hydrateFromStream]);

  const startLive = async () => {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Titre du live requis');
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post('/live/start', {
        title: title.trim(),
        description: description.trim(),
        category,
        status: 'live',
      });
      const data = res.data?.data ?? res.data;
      const id = String(data?.id ?? data?.live_id ?? '').trim();
      if (!id) throw new Error('Réponse sans identifiant de live');
      setLiveId(id);
      setPhase('live');
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setLiveTime((prev) => prev + 1), 1000);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string; detail?: string; message?: string } } };
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Impossible de démarrer le live';
      Alert.alert('Erreur', String(msg));
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
      await apiClient.post(`/live/${liveId}/chat`, { message: text });
      setChatInput('');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string; message?: string } } };
      const msg = err.response?.data?.error || err.response?.data?.message || "Impossible d'envoyer le message.";
      Alert.alert('Chat', String(msg));
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

  if (phase === 'ended') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient colors={['#1a0a2e', '#0a0a12']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.endedContainer}>
          <Ionicons name="checkmark-circle" size={60} color={Colors.primary} />
          <Text style={styles.endedTitle}>Live terminé !</Text>
          <Text style={styles.endedSub}>Durée : {formatTime(liveTime)}</Text>
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
          </View>
          <TouchableOpacity
            style={styles.replayBtn}
            onPress={() => router.replace({ pathname: '/live/replay', params: { id: liveId! } } as never)}
          >
            <Text style={styles.replayBtnText}>Voir le replay et créer des clips</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn2} onPress={() => router.back()}>
            <Text style={styles.backBtn2Text}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (phase === 'setup') {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Démarrer un Live</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.setupContent}>
          <View style={styles.previewBox}>
            <LinearGradient colors={['#1a0a2e', '#0a0a12']} style={StyleSheet.absoluteFillObject} />
            <Ionicons name="videocam" size={50} color="rgba(255,255,255,0.3)" />
            <Text style={styles.previewText}>Aperçu caméra</Text>
            <Text style={styles.previewHint}>
              Sur iOS/Android (build dev), la vidéo utilise Agora après le démarrage si le backend expose les tokens RTC.
            </Text>
          </View>
          <Text style={styles.label}>Titre du live *</Text>
          <TextInput
            testID="live-title-input"
            style={styles.input}
            placeholder="Ex : Concert acoustique, Q&A, Cours de danse…"
            placeholderTextColor={Colors.textMuted}
            value={title}
            onChangeText={setTitle}
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
          <Text style={styles.label}>Catégorie</Text>
          <View style={styles.categories}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.catChip, category === c && styles.catChipActive]}
                onPress={() => setCategory(c)}
              >
                <Text style={[styles.catChipText, category === c && { color: '#FFF' }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            testID="live-start-button"
            style={[styles.goLiveBtn, (!title.trim() || loading) && { opacity: 0.5 }]}
            onPress={() => void startLive()}
            disabled={!title.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="radio" size={22} color="#FFF" />
                <Text style={styles.goLiveBtnText}>Démarrer le Live</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraPlaceholder}>
        <LinearGradient colors={['#1a0020', '#0a0a12', '#001020']} style={StyleSheet.absoluteFillObject} />
        {Platform.OS !== 'web' && agoraJoined ? (
          <AgoraLocalView style={StyleSheet.absoluteFillObject} />
        ) : null}
        {!agoraJoined ? (
          <>
            <Ionicons name="videocam" size={60} color="rgba(255,255,255,0.15)" />
            <Text style={styles.camHint}>Caméra en direct</Text>
            <Text style={styles.camSubHint}>
              {agoraError || (Platform.OS === 'web' ? 'Agora RTC : utilisez l’app native (dev build).' : 'Connexion Agora…')}
            </Text>
          </>
        ) : null}
      </View>

      {animations.map((anim) => (
        <GiftAnimationBubble key={anim.id} gift={anim} onRemove={removeAnimation} />
      ))}

      <View style={[styles.liveTopBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.liveBadgeRow}>
          <View style={styles.liveBadge}>
            <View style={styles.liveBadgeDot} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
          <Text style={styles.liveTimer}>{formatTime(liveTime)}</Text>
          <View style={styles.viewerBadge}>
            <Ionicons name="eye" size={12} color="#FFF" />
            <Text style={styles.viewerText}>{viewerCount}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={endLive} style={styles.endBtn}>
          <Text style={styles.endBtnText}>Terminer</Text>
        </TouchableOpacity>
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
        <TouchableOpacity style={styles.rightBtn} onPress={() => setIsMuted((prev) => !prev)}>
          <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color={isMuted ? '#EF4444' : '#FFF'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.rightBtn} onPress={() => void sendLike()}>
          <Ionicons name="heart" size={24} color="#FF4757" />
          <Text style={styles.rightBtnCount}>{totalLikes}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rightBtn, { backgroundColor: 'rgba(255,215,0,0.2)' }]}
          onPress={() => setShowGifts(true)}
        >
          <Ionicons name="gift" size={24} color="#FFD700" />
        </TouchableOpacity>
      </View>

      <View style={[styles.chatArea, { bottom: 60 + insets.bottom }]}>
        <FlatList
          data={chatMessages.slice(-20)}
          keyExtractor={(item) => item.id}
          style={styles.chatList}
          renderItem={({ item }) => (
            <View style={styles.chatMsg}>
              <Text style={styles.chatUserName}>{item.userName}</Text>
              <Text style={styles.chatText}>{item.text}</Text>
            </View>
          )}
        />
        <View style={styles.chatInputRow}>
          <TextInput
            style={styles.chatInputField}
            placeholder="Envoyer un message…"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={chatInput}
            onChangeText={setChatInput}
            onSubmitEditing={() => void sendChat()}
            editable={!sendingChat}
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
  setupContent: { flex: 1, paddingHorizontal: Spacing.xl },
  previewBox: {
    height: 160,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
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
  backBtn2: { marginTop: 12, paddingVertical: 10 },
  backBtn2Text: { color: Colors.textSecondary, fontSize: FontSizes.md },
});
