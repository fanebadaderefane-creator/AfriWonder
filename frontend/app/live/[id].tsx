import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { useAgoraLiveRtc } from '../../src/hooks/useAgoraLiveRtc';
import socketService from '../../src/services/socketService';

const { width, height } = Dimensions.get('window');

interface LiveMessage {
  id: string;
  text: string;
  user: { name: string; avatar: string };
}

function normalizeLiveId(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) return String(raw[0] ?? '').trim();
  return String(raw ?? '').trim();
}

function mapChatRow(m: Record<string, unknown>): LiveMessage {
  return {
    id: String(m.id ?? `${Date.now()}-${Math.random()}`),
    text: String(m.message ?? m.text ?? ''),
    user: {
      name: String(m.sender_name ?? m.userName ?? 'Anonyme'),
      avatar: String(m.sender_avatar ?? m.avatar ?? 'https://i.pravatar.cc/150?img=12'),
    },
  };
}

export default function LiveStreamViewerScreen() {
  const insets = useSafeAreaInsets();
  const { id: rawId } = useLocalSearchParams<{ id: string | string[] }>();
  const liveId = useMemo(() => normalizeLiveId(rawId), [rawId]);

  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [viewers, setViewers] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [streamTitle, setStreamTitle] = useState('Live');
  const [streamerName, setStreamerName] = useState('Créateur');
  const [streamerAvatar, setStreamerAvatar] = useState('https://i.pravatar.cc/150?img=1');
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [sessionId] = useState(() => `${Date.now()}`);

  const { agoraJoined, agoraError, AgoraRemoteView } = useAgoraLiveRtc({
    liveId: liveId || null,
    role: 'audience',
    enabled: isAuthenticated && !!liveId && loading === false,
  });

  useEffect(() => {
    if (accessToken) socketService.connect(accessToken);
  }, [accessToken]);

  const hydrate = useCallback(async () => {
    if (!liveId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.get(`/live/${encodeURIComponent(liveId)}`);
      const s = (res.data?.data ?? res.data) as Record<string, unknown> | null;
      if (s) {
        setStreamTitle(String(s.title ?? 'Live'));
        const creator = s.creator as Record<string, unknown> | undefined;
        setStreamerName(String(creator?.full_name ?? creator?.username ?? s.creator_name ?? 'Créateur'));
        const av = String(creator?.avatar_url ?? creator?.profile_image ?? '').trim();
        if (av) setStreamerAvatar(av);
        if (typeof s.viewers_count === 'number') setViewers(s.viewers_count);
        const thumb = String(s.thumbnail_url ?? '').trim();
        if (thumb) setPosterUrl(thumb);
        const rawMsgs = s.chat_messages;
        if (Array.isArray(rawMsgs) && rawMsgs.length) {
          setMessages(
            (rawMsgs as Record<string, unknown>[])
              .filter((m) => m && !m.is_deleted)
              .slice(-30)
              .map((m) => mapChatRow(m))
          );
        }
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [liveId]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isAuthenticated || !liveId) return;
    void (async () => {
      try {
        await apiClient.post(`/live/${encodeURIComponent(liveId)}/join`, { sessionId });
      } catch {
        /* ignore */
      }
    })();
  }, [isAuthenticated, liveId, sessionId]);

  useEffect(() => {
    if (!liveId) return;
    socketService.joinLiveStream(liveId);
    const chatHandler = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      setMessages((prev) => [...prev.slice(-40), mapChatRow(raw as Record<string, unknown>)]);
    };
    const viewerHandler = (data: unknown) => {
      const d = data as { count?: number };
      if (typeof d?.count === 'number') setViewers(d.count);
    };
    socketService.on('live:chat', chatHandler);
    socketService.on('live:viewers', viewerHandler);
    return () => {
      socketService.off('live:chat', chatHandler);
      socketService.off('live:viewers', viewerHandler);
      socketService.leaveLiveStream(liveId);
    };
  }, [liveId]);

  const sendMessage = async () => {
    const text = newMessage.trim();
    if (!text || !liveId || !user) return;
    try {
      await apiClient.post(`/live/${encodeURIComponent(liveId)}/chat`, { message: text });
      setNewMessage('');
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text,
          user: { name: 'Moi', avatar: streamerAvatar },
        },
      ]);
      setNewMessage('');
    }
  };

  const GIFTS = [
    { id: 'g1', name: 'Coeur', emoji: '\u2764\ufe0f', price: 100 },
    { id: 'g2', name: 'Etoile', emoji: '\u2b50', price: 500 },
    { id: 'g3', name: 'Diamant', emoji: '\ud83d\udc8e', price: 1000 },
    { id: 'g4', name: 'Couronne', emoji: '\ud83d\udc51', price: 5000 },
  ];

  if (!liveId) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: Colors.textMuted }}>Live introuvable</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }} accessibilityLabel="Retour">
          <Text style={{ color: Colors.primary }}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center' }]}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.videoBackground}>
        {Platform.OS !== 'web' && agoraJoined ? (
          <AgoraRemoteView style={{ width, height }} />
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
      </View>

      <View style={styles.headerOverlay}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={26} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.streamerInfo}>
          <Image source={{ uri: streamerAvatar }} style={styles.streamerAvatar} />
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
            onPress={() => setIsFollowing(!isFollowing)}
          >
            <Text style={styles.followBtnText}>{isFollowing ? 'Abonné' : 'Suivre'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.viewersBadge}>
          <Ionicons name="eye" size={14} color={Colors.text} />
          <Text style={styles.viewersText}>{viewers}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.messagesContainer}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.messageItem}>
              <Image source={{ uri: item.user.avatar }} style={styles.msgAvatar} />
              <View style={styles.messageBubble}>
                <Text style={styles.msgUser}>{item.user.name}</Text>
                <Text style={styles.msgText}>{item.text}</Text>
              </View>
            </View>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesList}
          ListEmptyComponent={
            <Text style={{ color: Colors.textMuted, textAlign: 'center', marginTop: 24 }}>
              Aucun message pour l’instant
            </Text>
          }
        />

        {showGifts && (
          <View style={styles.giftsPanel}>
            {GIFTS.map((gift) => (
              <TouchableOpacity key={gift.id} style={styles.giftItem}>
                <Text style={styles.giftEmoji}>{gift.emoji}</Text>
                <Text style={styles.giftPrice}>{gift.price}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={[styles.inputBar, { paddingBottom: insets.bottom + Spacing.sm }]}>
          <TextInput
            style={styles.messageInput}
            placeholder={isAuthenticated ? 'Envoyer un message…' : 'Connectez-vous pour chatter'}
            placeholderTextColor={Colors.textMuted}
            value={newMessage}
            onChangeText={setNewMessage}
            editable={isAuthenticated}
          />
          <TouchableOpacity onPress={() => setShowGifts(!showGifts)} style={styles.giftBtn}>
            <Ionicons name="gift" size={24} color={Colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sendBtn, !isAuthenticated && { opacity: 0.4 }]}
            onPress={() => void sendMessage()}
            disabled={!isAuthenticated}
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
    backgroundColor: Colors.background,
  },
  videoBackground: {
    ...StyleSheet.absoluteFillObject,
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
  headerOverlay: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streamerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: BorderRadius.pill,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
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
  giftsPanel: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
  },
  giftItem: {
    alignItems: 'center',
    gap: 4,
  },
  giftEmoji: {
    fontSize: 32,
  },
  giftPrice: {
    color: Colors.accent,
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  messageInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    color: Colors.text,
    fontSize: FontSizes.md,
  },
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
});
