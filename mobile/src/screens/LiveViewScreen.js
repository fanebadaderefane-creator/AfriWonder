/**
 * LiveViewScreen — Réécriture RN de la PWA LiveView.jsx
 * Visionnage d'un live par id (route.params.id).
 * - api.live.getById(id), poll si status === 'live'
 * - Affichage: placeholder flux (Agora non intégré en RN), créateur, spectateurs, objectif dons, chat, envoi message
 * - Si status === 'ended': message "Live terminé" ou replay non disponible
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
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

const POLL_INTERVAL = 5000;

export default function LiveViewScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const liveId = route.params?.id;

  const [live, setLive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const pollRef = useRef(null);

  const fetchLive = useCallback(async () => {
    if (!liveId) return;
    try {
      const data = await api.live.getById(liveId);
      setLive(data);
      return data;
    } catch {
      setLive(null);
    }
  }, [liveId]);

  useEffect(() => {
    if (!liveId) {
      setLoading(false);
      return;
    }
    fetchLive().finally(() => setLoading(false));
  }, [liveId, fetchLive]);

  // Poll si live en cours
  useEffect(() => {
    if (!liveId || live?.status !== 'live') return;
    const id = setInterval(() => fetchLive(), POLL_INTERVAL);
    pollRef.current = id;
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [liveId, live?.status, fetchLive]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLive();
    setRefreshing(false);
  }, [fetchLive]);

  const sendMessage = useCallback(async () => {
    const msg = message.trim();
    if (!msg || !liveId || sending) return;
    setSending(true);
    try {
      await api.live.sendChatMessage(liveId, msg);
      setMessage('');
      await fetchLive();
    } catch {
      // erreur silencieuse
    } finally {
      setSending(false);
    }
  }, [liveId, message, sending, fetchLive]);

  const creatorName = live?.creator?.username ?? live?.creator_name ?? 'Créateur';
  const creatorAvatar = live?.creator?.profile_image ?? live?.creator_avatar ?? null;
  const viewersCount = live?.viewers_count ?? 0;
  const messages = (live?.chat_messages ?? []).filter((m) => !m.is_deleted);
  const goalTarget = live?.goal_target ?? 0;
  const goalAmount = live?.goal_amount ?? live?.total_gifts_amount ?? 0;
  const goalProgress = goalTarget > 0 ? Math.min((goalAmount / goalTarget) * 100, 100) : 0;

  if (!liveId) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>ID live manquant</Text>
          <TouchableOpacity style={styles.backBtnLarge} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnLargeText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && !live) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#60A5FA" />
        <Text style={styles.loadingText}>Chargement du live...</Text>
      </View>
    );
  }

  if (!live) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Live non trouvé</Text>
          <TouchableOpacity style={styles.backBtnLarge} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnLargeText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Zone vidéo / placeholder */}
      <View style={styles.videoArea}>
        {live.status === 'live' ? (
          <View style={styles.placeholder}>
            <View style={styles.placeholderIconWrap}>
              <Text style={styles.placeholderLetter}>{creatorName?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
            <Text style={styles.placeholderTitle}>{live.title}</Text>
            <Text style={styles.placeholderSub}>Diffusion en cours (flux à intégrer)</Text>
          </View>
        ) : live.status === 'ended' ? (
          <View style={styles.placeholder}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#6B7280" />
            <Text style={styles.placeholderTitle}>{live.title}</Text>
            <Text style={styles.placeholderSub}>Ce live est terminé</Text>
            {live.replay_url ? (
              <Text style={styles.replayHint}>Replay disponible sur la PWA</Text>
            ) : (
              <Text style={styles.placeholderSub}>Replay non disponible</Text>
            )}
          </View>
        ) : (
          <View style={styles.placeholder}>
            <ActivityIndicator size="large" color="#60A5FA" />
            <Text style={styles.placeholderTitle}>{live.title}</Text>
          </View>
        )}

        {/* Top bar: retour, partage, badge, spectateurs */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topBarBtn} onPress={() => navigation.goBack()} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.topBarRight}>
            {live.status === 'live' && (
              <>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeText}>EN DIRECT</Text>
                </View>
                <View style={styles.viewersBadge}>
                  <Ionicons name="eye" size={14} color="#FFF" />
                  <Text style={styles.viewersText}>{viewersCount}</Text>
                </View>
              </>
            )}
            {live.status === 'ended' && (
              <View style={styles.endedBadge}>
                <Text style={styles.endedBadgeText}>Terminé</Text>
              </View>
            )}
          </View>
        </View>

        {/* Objectif dons */}
        {live.status === 'live' && goalTarget > 0 && (
          <View style={styles.goalBar}>
            <View style={styles.goalRow}>
              <Text style={styles.goalLabel}>Objectif dons</Text>
              <Text style={styles.goalValue}>{Number(goalAmount).toLocaleString()} / {Number(goalTarget).toLocaleString()} FCFA</Text>
            </View>
            <View style={styles.goalBarBg}>
              <View style={[styles.goalBarFill, { width: `${goalProgress}%` }]} />
            </View>
          </View>
        )}

        {/* Créateur */}
        <View style={styles.creatorRow}>
          {creatorAvatar ? (
            <Image source={{ uri: creatorAvatar }} style={styles.creatorAvatar} />
          ) : (
            <View style={[styles.creatorAvatar, styles.creatorAvatarFallback]}>
              <Text style={styles.creatorAvatarLetter}>{creatorName?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
          )}
          <Text style={styles.creatorName} numberOfLines={1}>{creatorName}</Text>
        </View>
      </View>

      {/* Chat */}
      <View style={styles.chatSection}>
        <ScrollView
          style={styles.chatList}
          contentContainerStyle={styles.chatListContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60A5FA" />}
          inverted
          keyboardShouldPersistTaps="handled"
        >
          {messages.slice(-30).reverse().map((m) => (
            <View key={m.id} style={styles.chatBubble}>
              <Text style={styles.chatSender}>{m.sender_name}:</Text>
              <Text style={styles.chatMessage}> {m.message}</Text>
            </View>
          ))}
        </ScrollView>
        {live.status === 'live' && user && (
          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              placeholder="Message..."
              placeholderTextColor="#9CA3AF"
              value={message}
              onChangeText={setMessage}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
              editable={!sending}
            />
            <TouchableOpacity style={styles.chatSendBtn} onPress={sendMessage} disabled={sending}>
              {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={20} color="#FFF" />}
            </TouchableOpacity>
          </View>
        )}
        {live.status === 'ended' && (
          <View style={styles.chatInputRow}>
            <Text style={styles.chatDisabledText}>Le live est terminé. Plus de messages.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#FFF', marginTop: 12 },
  errorText: { color: '#FFF', fontSize: 16 },
  backBtnLarge: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: '#2563EB', borderRadius: 12 },
  backBtnLargeText: { color: '#FFF', fontWeight: '600' },
  videoArea: { flex: 1, backgroundColor: '#111' },
  placeholder: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  placeholderIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  placeholderLetter: { fontSize: 32, fontWeight: '700', color: '#FFF' },
  placeholderTitle: { color: '#FFF', fontSize: 18, fontWeight: '700', marginTop: 12, textAlign: 'center', paddingHorizontal: 24 },
  placeholderSub: { color: '#9CA3AF', fontSize: 14, marginTop: 8 },
  replayHint: { color: '#60A5FA', fontSize: 12, marginTop: 8 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
  },
  topBarBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DC2626', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  liveBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  viewersBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  viewersText: { color: '#FFF', fontSize: 12 },
  endedBadge: { backgroundColor: '#4B5563', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  endedBadgeText: { color: '#FFF', fontSize: 12 },
  goalBar: { position: 'absolute', top: 110, left: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 10, zIndex: 10 },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  goalLabel: { color: '#FFF', fontSize: 12 },
  goalValue: { color: '#FBBF24', fontSize: 12, fontWeight: '600' },
  goalBarBg: { height: 6, backgroundColor: '#374151', borderRadius: 3, overflow: 'hidden' },
  goalBarFill: { height: '100%', backgroundColor: '#F59E0B', borderRadius: 3 },
  creatorRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 160,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 12,
    zIndex: 10,
  },
  creatorAvatar: { width: 32, height: 32, borderRadius: 16 },
  creatorAvatarFallback: { backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center' },
  creatorAvatarLetter: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  creatorName: { flex: 1, color: '#FFF', fontSize: 14, fontWeight: '600' },
  chatSection: { maxHeight: 220, borderTopWidth: 1, borderTopColor: '#1F2937', backgroundColor: '#0F172A' },
  chatList: { maxHeight: 160 },
  chatListContent: { padding: 12, paddingBottom: 8 },
  chatBubble: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  chatSender: { color: '#60A5FA', fontSize: 13, fontWeight: '600' },
  chatMessage: { color: '#E5E7EB', fontSize: 13 },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  chatInput: { flex: 1, backgroundColor: '#1F2937', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#FFF' },
  chatSendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  chatDisabledText: { color: '#6B7280', fontSize: 13 },
});
