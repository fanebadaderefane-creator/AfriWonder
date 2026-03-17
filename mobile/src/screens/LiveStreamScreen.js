/**
 * LiveStreamScreen — Réécriture RN de la PWA LiveStream.jsx
 * Steps: setup | streaming | ended
 * - Depuis StartLive: params title/category/description/goal → auto start puis streaming
 * - Depuis liste: param id → chargement stream existant (startScheduled si programmé) puis streaming
 * - Setup manuel: formulaire puis "Commencer le Live" → streaming
 * - Streaming: badge LIVE, durée, objectif dons, top supporters, commentaires, terminer
 * - Ended: message + retour Lives
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['gaming', 'music', 'education', 'sports', 'art', 'other'];

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function LiveStreamScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();

  const streamIdFromRoute = route.params?.id;
  const titleFromRoute = route.params?.title;
  const categoryFromRoute = route.params?.category ?? 'other';
  const descriptionFromRoute = route.params?.description ?? '';
  const goalFromRoute = route.params?.goal != null ? Number(route.params.goal) : undefined;

  const [step, setStep] = useState('setup');
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(!!streamIdFromRoute);
  const [streamData, setStreamData] = useState({
    title: '',
    description: '',
    category: 'other',
    goalAmount: 10000,
  });
  const [liveStream, setLiveStream] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [totalDuration, setTotalDuration] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [goalAmount, setGoalAmount] = useState(10000);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [topSupporters, setTopSupporters] = useState([]);

  const autoStartedRef = useRef(false);
  const durationIntervalRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Préremplir depuis StartLive (params sans id)
  useEffect(() => {
    if (streamIdFromRoute) return;
    if (titleFromRoute != null && titleFromRoute !== '') {
      setStreamData((prev) => ({
        ...prev,
        title: typeof titleFromRoute === 'string' ? titleFromRoute : prev.title,
        category: categoryFromRoute || prev.category,
        description: descriptionFromRoute || prev.description,
        goalAmount: goalFromRoute != null && !isNaN(goalFromRoute) && goalFromRoute > 0 ? goalFromRoute : prev.goalAmount,
      }));
    }
  }, [streamIdFromRoute, titleFromRoute, categoryFromRoute, descriptionFromRoute, goalFromRoute]);

  // Charger un stream existant (id en param)
  useEffect(() => {
    if (!streamIdFromRoute || !user?.id) return;
    const load = async () => {
      try {
        let stream = await api.live.getById(streamIdFromRoute);
        if (!stream) {
          navigation.replace('Lives');
          return;
        }
        if (stream.creator_id !== user.id) {
          navigation.replace('Lives');
          return;
        }
        if (stream.status === 'scheduled') {
          await api.live.startScheduled(streamIdFromRoute);
          stream = await api.live.getById(streamIdFromRoute);
        }
        if (stream.status === 'live') {
          setLiveStream(stream);
          setStreamData((prev) => ({
            ...prev,
            title: stream.title || prev.title,
            description: stream.description || prev.description,
            category: stream.category || prev.category,
          }));
          setGoalAmount(stream.goal_target || 10000);
          setStep('streaming');
        } else if (stream.status === 'ended') {
          navigation.replace('Lives');
        }
      } catch {
        navigation.replace('Lives');
      } finally {
        setLoadingExisting(false);
      }
    };
    load();
  }, [streamIdFromRoute, user?.id, navigation]);

  // Auto-démarrer depuis StartLive (params title, pas d’id)
  useEffect(() => {
    if (streamIdFromRoute || !user || autoStartedRef.current || step !== 'setup') return;
    const title = titleFromRoute ?? streamData.title;
    if (!title || typeof title !== 'string' || !title.trim()) return;
    autoStartedRef.current = true;
    setLoading(true);
    const category = categoryFromRoute || streamData.category;
    const description = descriptionFromRoute || streamData.description;
    const goalTarget = goalFromRoute != null && !isNaN(goalFromRoute) && goalFromRoute > 0
      ? goalFromRoute
      : (streamData.goalAmount > 0 ? streamData.goalAmount : 10000);
    api.live
      .start({
        title: title.trim(),
        description: description || undefined,
        category,
        goal_target: goalTarget,
      })
      .then((stream) => {
        setLiveStream(stream);
        setGoalAmount(stream.goal_target || goalTarget || 10000);
        setStep('streaming');
      })
      .catch(() => {
        autoStartedRef.current = false;
      })
      .finally(() => setLoading(false));
  }, [streamIdFromRoute, user?.id, step, titleFromRoute, categoryFromRoute, descriptionFromRoute, goalFromRoute, streamData.title, streamData.category, streamData.description, streamData.goalAmount]);

  // Poll live data en streaming
  useEffect(() => {
    if (step !== 'streaming' || !liveStream?.id) return;
    const fetchData = async () => {
      try {
        const data = await api.live.getById(liveStream.id);
        setLiveData(data);
        if (data?.goal_target && data.goal_target > 0) setGoalAmount(data.goal_target);
      } catch {}
    };
    fetchData();
    const id = setInterval(fetchData, 3000);
    pollIntervalRef.current = id;
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [step, liveStream?.id]);

  // Top supporters depuis chat_messages (gift/tip)
  useEffect(() => {
    const messages = liveData?.chat_messages ?? [];
    const map = new Map();
    messages.forEach((msg) => {
      if (msg.message_type !== 'gift' && msg.message_type !== 'tip') return;
      const sid = msg.sender_id ?? msg.user_id;
      const name = msg.sender_name ?? 'Anonyme';
      const amount = msg.amount ?? 0;
      if (map.has(sid)) {
        const o = map.get(sid);
        map.set(sid, { ...o, total: o.total + amount, count: o.count + 1 });
      } else {
        map.set(sid, { id: sid, name, avatar: msg.sender_avatar, total: amount, count: 1 });
      }
    });
    setTopSupporters(
      Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 10)
    );
  }, [liveData?.chat_messages]);

  // Timer durée en streaming
  useEffect(() => {
    if (step !== 'streaming' || !liveStream?.id) return;
    const start = Date.now();
    durationIntervalRef.current = setInterval(() => {
      setTotalDuration(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    };
  }, [step, liveStream?.id]);

  const viewerCount = liveData?.viewers_count ?? 0;
  const totalGifts = liveData?.total_gifts_amount ?? 0;
  const comments = useMemo(
    () => (liveData?.chat_messages ?? []).filter((c) => !c.is_deleted).slice(-20).reverse(),
    [liveData?.chat_messages]
  );
  const goalProgress = goalAmount > 0 ? Math.min((totalGifts / goalAmount) * 100, 100) : 0;

  const startStream = useCallback(async () => {
    if (!streamData.title.trim()) return;
    setLoading(true);
    try {
      const stream = await api.live.start({
        title: streamData.title.trim(),
        description: streamData.description || undefined,
        category: streamData.category,
        goal_target: streamData.goalAmount > 0 ? streamData.goalAmount : undefined,
      });
      setLiveStream(stream);
      setGoalAmount(stream.goal_target || streamData.goalAmount || 0);
      setStep('streaming');
    } catch {
      // erreur silencieuse ou toast selon besoin
    } finally {
      setLoading(false);
    }
  }, [streamData]);

  const endStream = useCallback(async () => {
    if (!liveStream?.id) return;
    setLoading(true);
    try {
      const updated = await api.live.end(liveStream.id, {});
      setLiveStream(updated || liveStream);
      setShowEndConfirm(false);
      setStep('ended');
    } catch {
      setLoading(false);
    }
  }, [liveStream?.id]);

  const sendComment = useCallback(async () => {
    const msg = newComment.trim();
    if (!msg || !liveStream?.id) return;
    try {
      await api.live.sendChatMessage(liveStream.id, msg);
      setNewComment('');
      const data = await api.live.getById(liveStream.id);
      setLiveData(data);
    } catch {}
  }, [liveStream?.id, newComment]);

  const handleEndPress = useCallback(() => {
    Alert.alert(
      'Terminer le live',
      'Voulez-vous vraiment terminer cette diffusion ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Terminer', style: 'destructive', onPress: endStream },
      ]
    );
  }, [endStream]);

  if (!user) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#60A5FA" />
      </View>
    );
  }

  if (loadingExisting) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#60A5FA" />
        <Text style={styles.loadingText}>Chargement du live...</Text>
      </View>
    );
  }

  // Démarrage auto depuis StartLive
  if (loading && titleFromRoute && !streamIdFromRoute && step === 'setup') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#60A5FA" />
        <Text style={styles.loadingText}>Démarrage du live...</Text>
        <Text style={styles.loadingSubtext}>Préparation de la diffusion</Text>
      </View>
    );
  }

  // ——— STEP: SETUP ———
  if (step === 'setup') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.setupHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.setupHeaderTitle}>Commencer un Live</Text>
          <View style={styles.backBtn} />
        </View>
        <ScrollView style={styles.setupScroll} contentContainerStyle={styles.setupScrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.previewPlaceholder}>
            <Ionicons name="videocam-outline" size={48} color="#6B7280" />
            <Text style={styles.previewPlaceholderText}>Aperçu caméra (non disponible en RN)</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Titre du live</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Gaming session, Musique..."
              placeholderTextColor="#6B7280"
              value={streamData.title}
              onChangeText={(t) => setStreamData((p) => ({ ...p, title: t }))}
              maxLength={100}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Décrivez votre live..."
              placeholderTextColor="#6B7280"
              value={streamData.description}
              onChangeText={(t) => setStreamData((p) => ({ ...p, description: t }))}
              maxLength={500}
              multiline
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Catégorie</Text>
            <View style={styles.catWrap}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catBtn, streamData.category === cat && styles.catBtnActive]}
                  onPress={() => setStreamData((p) => ({ ...p, category: cat }))}
                >
                  <Text style={[styles.catBtnText, streamData.category === cat && styles.catBtnTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Objectif de dons (FCFA)</Text>
            <TextInput
              style={styles.input}
              placeholder="10000"
              placeholderTextColor="#6B7280"
              keyboardType="number-pad"
              value={String(streamData.goalAmount || '')}
              onChangeText={(t) => setStreamData((p) => ({ ...p, goalAmount: parseInt(t, 10) || 0 }))}
            />
          </View>
          <TouchableOpacity
            style={[styles.startBtn, (!streamData.title.trim() || loading) && styles.startBtnDisabled]}
            onPress={startStream}
            disabled={!streamData.title.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="radio" size={22} color="#FFF" />
                <Text style={styles.startBtnText}>Commencer le Live</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ——— STEP: STREAMING ———
  if (step === 'streaming') {
    return (
      <View style={styles.container}>
        <View style={styles.streamingVideoArea}>
          <View style={styles.videoPlaceholder}>
            <Ionicons name="videocam" size={64} color="#374151" />
            <Text style={styles.videoPlaceholderTitle}>{liveStream?.title || streamData.title}</Text>
            <Text style={styles.videoPlaceholderSub}>Diffusion en cours (vidéo à intégrer)</Text>
          </View>

          <View style={styles.overlayTop}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
            <Text style={styles.durationText}>{formatDuration(totalDuration)}</Text>
          </View>

          {goalAmount > 0 && (
            <View style={styles.goalCard}>
              <View style={styles.goalRow}>
                <Text style={styles.goalLabel}>Objectif: {goalAmount.toLocaleString()} FCFA</Text>
                <Text style={styles.goalValue}>{totalGifts.toLocaleString()} / {goalAmount.toLocaleString()}</Text>
              </View>
              <View style={styles.goalBarBg}>
                <View style={[styles.goalBarFill, { width: `${goalProgress}%` }, goalProgress >= 100 && styles.goalBarFillDone]} />
              </View>
              {goalProgress >= 100 && <Text style={styles.goalDone}>Objectif atteint !</Text>}
            </View>
          )}

          {topSupporters.length > 0 && (
            <View style={styles.supportersCard}>
              <Text style={styles.supportersTitle}>Top Supporters</Text>
              {topSupporters.slice(0, 5).map((s, i) => (
                <View key={s.id} style={styles.supporterRow}>
                  <Text style={[styles.supporterRank, i === 0 && styles.rank1, i === 1 && styles.rank2, i === 2 && styles.rank3]}>#{i + 1}</Text>
                  <Text style={styles.supporterName} numberOfLines={1}>{s.name}</Text>
                  <Text style={styles.supporterAmount}>{s.total.toLocaleString()} FCFA</Text>
                </View>
              ))}
            </View>
          )}

          <ScrollView
            style={styles.commentsScroll}
            contentContainerStyle={styles.commentsScrollContent}
            inverted
            keyboardShouldPersistTaps="handled"
          >
            {comments.map((c) => (
              <View key={c.id} style={styles.commentBubble}>
                <Text style={styles.commentSender}>{c.sender_name}:</Text>
                <Text style={styles.commentMessage}> {c.message}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.bottomBar}>
            <TextInput
              style={styles.commentInput}
              placeholder="Message..."
              placeholderTextColor="#9CA3AF"
              value={newComment}
              onChangeText={setNewComment}
              onSubmitEditing={sendComment}
              returnKeyType="send"
            />
            <TouchableOpacity style={styles.sendBtn} onPress={sendComment}>
              <Ionicons name="send" size={20} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.endBtn} onPress={handleEndPress} disabled={loading}>
              <Ionicons name="stop-circle" size={24} color="#FFF" />
              <Text style={styles.endBtnText}>Terminer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ——— STEP: ENDED ———
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.endedContent}>
        <View style={styles.endedIconWrap}>
          <Ionicons name="checkmark-circle" size={80} color="#22C55E" />
        </View>
        <Text style={styles.endedTitle}>Live terminé</Text>
        <Text style={styles.endedSubtitle}>Merci d'avoir diffusé.</Text>
        <TouchableOpacity style={styles.endedBackBtn} onPress={() => navigation.replace('Lives')}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
          <Text style={styles.endedBackBtnText}>Retour aux Lives</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#FFF', marginTop: 12, fontSize: 16 },
  loadingSubtext: { color: '#9CA3AF', marginTop: 4, fontSize: 14 },
  setupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  setupHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  setupScroll: { flex: 1 },
  setupScrollContent: { padding: 16, paddingBottom: 32 },
  previewPlaceholder: { height: 200, backgroundColor: '#111', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  previewPlaceholderText: { color: '#6B7280', marginTop: 8, fontSize: 12 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#D1D5DB', marginBottom: 8 },
  input: { backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#FFF' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151' },
  catBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  catBtnText: { fontSize: 14, color: '#9CA3AF' },
  catBtnTextActive: { color: '#FFF', fontWeight: '600' },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 12, backgroundColor: '#DC2626', marginTop: 8 },
  startBtnDisabled: { opacity: 0.5 },
  startBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  streamingVideoArea: { flex: 1, backgroundColor: '#000' },
  videoPlaceholder: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  videoPlaceholderTitle: { color: '#FFF', fontSize: 18, fontWeight: '700', marginTop: 12 },
  videoPlaceholderSub: { color: '#6B7280', fontSize: 13, marginTop: 4 },
  overlayTop: { position: 'absolute', top: 50, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DC2626', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' },
  liveBadgeText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  durationText: { color: '#FFF', fontSize: 14, fontWeight: '500' },
  goalCard: { position: 'absolute', top: 100, left: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 12, padding: 12, zIndex: 10 },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  goalLabel: { color: '#FFF', fontSize: 12 },
  goalValue: { color: '#60A5FA', fontSize: 12, fontWeight: '600' },
  goalBarBg: { height: 8, backgroundColor: '#374151', borderRadius: 4, overflow: 'hidden' },
  goalBarFill: { height: '100%', backgroundColor: '#2563EB', borderRadius: 4 },
  goalBarFillDone: { backgroundColor: '#22C55E' },
  goalDone: { color: '#22C55E', fontSize: 12, fontWeight: '700', marginTop: 6, textAlign: 'center' },
  supportersCard: { position: 'absolute', top: 100, right: 16, width: 180, maxHeight: 220, backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 12, padding: 12, zIndex: 10 },
  supportersTitle: { color: '#FFF', fontWeight: '700', fontSize: 12, marginBottom: 8 },
  supporterRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  supporterRank: { color: '#9CA3AF', fontSize: 11, fontWeight: '700' },
  rank1: { color: '#FBBF24' },
  rank2: { color: '#D1D5DB' },
  rank3: { color: '#60A5FA' },
  supporterName: { flex: 1, color: '#FFF', fontSize: 11, numberOfLines: 1 },
  supporterAmount: { color: '#60A5FA', fontSize: 11, fontWeight: '600' },
  commentsScroll: { position: 'absolute', left: 16, right: 16, bottom: 80, maxHeight: 160, zIndex: 10 },
  commentsScrollContent: { paddingVertical: 8 },
  commentBubble: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 6, alignSelf: 'flex-start', maxWidth: '90%' },
  commentSender: { color: '#60A5FA', fontSize: 12, fontWeight: '600' },
  commentMessage: { color: '#FFF', fontSize: 12 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', padding: 12, paddingBottom: 24, backgroundColor: 'rgba(0,0,0,0.8)', gap: 8, zIndex: 10 },
  commentInput: { flex: 1, backgroundColor: '#1F2937', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#FFF' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  endBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DC2626', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12 },
  endBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  endedContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  endedIconWrap: { marginBottom: 24 },
  endedTitle: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  endedSubtitle: { color: '#9CA3AF', marginTop: 8 },
  endedBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 32, paddingVertical: 14, paddingHorizontal: 24, backgroundColor: '#2563EB', borderRadius: 12 },
  endedBackBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
});
