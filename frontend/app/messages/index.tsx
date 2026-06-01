import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { safeRouterBack } from '../../src/utils/safeRouter';
import apiClient from '../../src/api/client';
import socketService from '../../src/services/socketService';
import { useAuthStore } from '../../src/store/authStore';
import { toAbsoluteMediaUrl } from '../../src/utils/absoluteMediaUrl';
import { devLog } from '../../src/utils/devLog';
import { profileAvatarUri } from '../../src/utils/avatarFallback';
import { subscribeInboxConversationPatch } from '../../src/messages/inboxSync';
import {
  loadInboxConversationsCache,
  saveInboxConversationsCache,
} from '../../src/messages/inboxConversationsCache';
import { alertDmAccessDenied, isDmAccessDeniedError } from '../../src/messages/dmAccess';
import { mapApiGroupToInboxRow, mergeInboxDmAndGroups } from '../../src/messages/mergeInboxGroups';
import { isGroupSocketEnvelope } from '../../src/messages/dmThreadApi';
import { extractMessageReadReaderId, shouldApplyPeerReceiptEvent } from '../../src/messages/dmReadReceipt';

const TABS = ['Discussions', 'Statuts', 'Appels'];

function formatTimeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return 'Maintenant';
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Hier';
  if (diffD < 7) return ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][date.getDay()];
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageAt?: string | null;
  time: string;
  unread: number;
  online: boolean;
  isTyping: boolean;
  lastMsgType: string;
  /** Dernier message sortant lu par le correspondant (double coche bleue). */
  lastOutgoingRead: boolean;
  isMine: boolean;
  isGroup?: boolean;
  groupMembers?: number;
  voiceDuration?: string;
  otherUserId?: string;
}

function sortConversationsByRecency(list: Conversation[]): Conversation[] {
  return [...list].sort((a, b) => {
    const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return tb - ta;
  });
}

function bumpConversationToTop(list: Conversation[], conversationId: string): Conversation[] {
  const idx = list.findIndex((c) => c.id === conversationId);
  if (idx <= 0) return list;
  const next = [...list];
  const [picked] = next.splice(idx, 1);
  if (!picked) return list;
  next.unshift(picked);
  return next;
}

/** Petit wrapper pour pouvoir scroller la liste de statuts en dessous de la carte « Mon statut ». */
function ScrollViewWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 8, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

type StoryFeedItem = {
  id: string;
  username: string | null;
  full_name: string | null;
  profile_image: string | null;
  is_self: boolean;
  has_story: boolean;
  has_unseen_story: boolean;
  is_live: boolean;
  live_id: string | null;
  story_ids: string[];
};

type CallHistoryItem = {
  id: string;
  type: 'audio' | 'video';
  direction: 'incoming' | 'outgoing';
  status: 'completed' | 'missed' | 'declined' | 'failed';
  durationSec: number;
  startedAt: string;
  peer: {
    id: string;
    name: string;
    avatar: string | null;
  };
  isGroup?: boolean;
};

function formatCallDuration(sec: number) {
  if (!sec || sec < 1) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return `${m}min ${s.toString().padStart(2, '0')}s`;
}

export default function MessagesListScreen() {
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState(0);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [realUsers, setRealUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const [storyFeed, setStoryFeed] = useState<StoryFeedItem[]>([]);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);
  const [callsLoading, setCallsLoading] = useState(false);

  /** Avatar du compte connecté — utilisé sur la carte « Mon statut » de l'onglet Statuts. */
  const myAvatarUri = profileAvatarUri(
    toAbsoluteMediaUrl(currentUser?.profile_image || currentUser?.avatar || ''),
    currentUser?.full_name || currentUser?.username || 'Moi',
  );
  const myFullName = currentUser?.full_name || currentUser?.username || 'Mon statut';

  const loadStories = useCallback(async () => {
    try {
      const res = await apiClient.get('/stories/feed-bar');
      const data = res.data?.data ?? res.data;
      const items: StoryFeedItem[] = Array.isArray(data?.items) ? data.items : [];
      setStoryFeed(items);
    } catch {
      setStoryFeed([]);
    }
  }, []);

  const loadCallHistory = useCallback(async () => {
    setCallsLoading(true);
    try {
      const res = await apiClient.get('/me/call-history', { params: { page: 1, limit: 50 } });
      const data = res.data?.data ?? res.data;
      const rawItems: any[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      const mapped: CallHistoryItem[] = rawItems.map((c: any) => {
        const dir: string = String(c.direction || '').toLowerCase();
        const direction: 'incoming' | 'outgoing' = dir === 'out' || dir === 'outgoing' ? 'outgoing' : 'incoming';
        const statusRaw = String(c.status || '').toLowerCase();
        let status: CallHistoryItem['status'] = 'completed';
        if (statusRaw.includes('miss') || statusRaw.includes('no_answer')) status = 'missed';
        else if (statusRaw.includes('declin') || statusRaw.includes('reject') || statusRaw.includes('busy'))
          status = 'declined';
        else if (statusRaw.includes('fail') || statusRaw.includes('error')) status = 'failed';
        else if (statusRaw.includes('end') || statusRaw.includes('complet') || statusRaw.includes('answer'))
          status = 'completed';
        const callType = String(c.call_type || c.type || '').toLowerCase();
        const isVideo = callType.includes('video');
        const peerRaw = c.peer || {};
        const groupRaw = c.group || null;
        const isGroup = c.channel === 'group' || !!groupRaw;
        return {
          id: String(c.id || Math.random()),
          type: isVideo ? 'video' : 'audio',
          direction,
          status,
          durationSec: Number(c.duration_sec || 0),
          startedAt: String(c.started_at || c.ended_at || new Date().toISOString()),
          peer: {
            id: String(peerRaw.id || ''),
            name: isGroup
              ? String(groupRaw?.name || 'Groupe')
              : String(peerRaw.full_name || peerRaw.username || 'Contact'),
            avatar: peerRaw.profile_image || null,
          },
          isGroup,
        };
      });
      setCallHistory(mapped);
    } catch {
      setCallHistory([]);
    } finally {
      setCallsLoading(false);
    }
  }, []);

  const loadRequestCount = useCallback(async () => {
    try {
      const response = await apiClient.get('/messages/conversations', {
        params: { inbox: 'requests', page: 1, limit: 1 },
      });
      const data = response.data?.data || response.data;
      const total = data?.pagination?.total;
      setRequestCount(typeof total === 'number' ? total : 0);
    } catch {
      setRequestCount(0);
    }
  }, []);

  const loadRealUsers = useCallback(async () => {
    try {
      const response = await apiClient.get('/users', { params: { page: 1, limit: 100 } });
      const rawData = response.data;
      const data = rawData?.data ?? rawData;
      let users = data?.users ?? (Array.isArray(data) ? data : []);
      if (!Array.isArray(users)) users = [];
      const filtered = users.filter((u: any) => u && (u.username || u.full_name));
      setRealUsers(filtered);
    } catch (err: any) {
      devLog('Could not load real users, trying direct:', err?.message);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      // Pas de `inbox=primary` ici : défaut API = `all` (toutes les discussions), comme avant la fonctionnalité « demandes ».
      // Les fils « à accepter » restent accessibles via l’écran Demandes (`inbox=requests`).
      const [dmRes, groupsRes] = await Promise.all([
        apiClient.get('/messages/conversations', { params: { page: 1, limit: 80 } }),
        apiClient.get('/messages/groups', { params: { page: 1, limit: 50 } }).catch(() => null),
      ]);
      const data = dmRes.data?.data || dmRes.data;
      const backendConvos = data?.conversations || [];
      const transformed: Conversation[] = backendConvos.map((c: any) => {
        const other = c.other || {};
        const timeStr = c.last_message_at ? formatTimeAgo(c.last_message_at) : '';
        const displayName = c.is_group
          ? (c.group_name || 'Groupe')
          : (other.full_name || other.username || 'Contact');
        const avatar = c.is_group
          ? profileAvatarUri(c.group_avatar, displayName)
          : profileAvatarUri(other.profile_image, displayName);
        const lastSenderId = String(c.last_message_sender_id || '').trim();
        const lastStatus = String(c.last_message_status || '').toLowerCase();
        const lastType = String(c.last_message_type || 'text').toLowerCase();
        const isMine = Boolean(currentUser?.id && lastSenderId && lastSenderId === currentUser.id);
        return {
          id: c.id,
          name: displayName,
          avatar,
          lastMessage: c.last_message_text || '',
          lastMessageAt: c.last_message_at || c.updated_at || c.created_at || null,
          time: timeStr,
          unread: c.unread_count || 0,
          online: Boolean(other.is_online ?? other.presence?.is_online ?? false),
          isTyping: false,
          lastMsgType: lastType === 'voice' ? 'voice' : lastType === 'image' ? 'image' : lastType === 'video' ? 'video' : lastType === 'audio' ? 'voice' : lastType === 'file' ? 'file' : 'text',
          lastOutgoingRead: isMine && lastStatus === 'read',
          isMine,
          isGroup: !!c.is_group,
          otherUserId: c.is_group ? undefined : other.id,
        };
      });
      const groupPayload = groupsRes?.data?.data || groupsRes?.data;
      const apiGroups = Array.isArray(groupPayload?.groups) ? groupPayload.groups : [];
      const groupRows = apiGroups.map((g: Record<string, unknown>) =>
        mapApiGroupToInboxRow(g as Parameters<typeof mapApiGroupToInboxRow>[0], formatTimeAgo, currentUser?.id),
      );
      setConversations(sortConversationsByRecency(mergeInboxDmAndGroups(transformed, groupRows)));
      void saveInboxConversationsCache(
        sortConversationsByRecency(mergeInboxDmAndGroups(transformed, groupRows)),
      );

      /** Récupère la présence en parallèle pour tous les peers 1-1 (best effort). */
      const peerIds = transformed
        .filter((t) => !t.isGroup && t.otherUserId)
        .map((t) => t.otherUserId as string);
      if (peerIds.length > 0) {
        const presenceResults = await Promise.all(
          peerIds.map((uid) =>
            apiClient
              .get(`/messages/presence/${encodeURIComponent(uid)}`)
              .then((r) => ({ uid, online: Boolean(r.data?.data?.is_online) }))
              .catch(() => ({ uid, online: false })),
          ),
        );
        const onlineByUid = new Map(presenceResults.map((p) => [p.uid, p.online]));
        setConversations((prev) =>
          prev.map((c) => (c.otherUserId ? { ...c, online: onlineByUid.get(c.otherUserId) ?? c.online } : c)),
        );
      }
    } catch (err) {
      devLog('Error loading conversations:', err);
      const cached = await loadInboxConversationsCache();
      if (cached.length > 0) {
        setConversations(cached);
      } else {
        setConversations([]);
      }
    } finally { setLoading(false); }
  }, [currentUser?.id]);

  const applyInboxPatch = useCallback(
    (patch: import('../../src/messages/inboxSync').InboxConversationPatch) => {
      const at = patch.lastMessageAt || new Date().toISOString();
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === patch.conversationId);
        const timeStr = formatTimeAgo(at);
        const lastOutgoingRead = patch.isMine === true && patch.lastOutgoingStatus === 'read';
        if (idx < 0) {
          void loadConversations();
          return prev;
        }
        const updated = [...prev];
        const cur = updated[idx];
        updated[idx] = {
          ...cur,
          ...(patch.lastMessage != null && patch.lastMessage !== '' ? { lastMessage: patch.lastMessage } : {}),
          lastMessageAt: at,
          time: timeStr,
          ...(patch.lastMsgType ? { lastMsgType: patch.lastMsgType } : {}),
          isMine: patch.isMine ?? cur.isMine,
          lastOutgoingRead:
            patch.lastOutgoingStatus != null ? lastOutgoingRead : cur.lastOutgoingRead,
        };
        return sortConversationsByRecency(updated);
      });
    },
    [loadConversations],
  );

  useEffect(() => {
    return subscribeInboxConversationPatch(applyInboxPatch);
  }, [applyInboxPatch]);

  useEffect(() => {
    void loadInboxConversationsCache().then((cached) => {
      if (cached.length > 0) {
        setConversations((prev) => (prev.length > 0 ? prev : cached));
      }
    });
    void loadConversations();
    void loadRealUsers();
    void loadRequestCount();
    void loadStories();
  }, [loadConversations, loadRealUsers, loadRequestCount, loadStories]);

  useEffect(() => {
    if (conversations.length === 0) return;
    void saveInboxConversationsCache(conversations);
  }, [conversations]);

  /** Rafraîchit la liste à chaque retour sur l'écran (badge non-lu, dernier message, stories). */
  useFocusEffect(
    useCallback(() => {
      void loadConversations();
      void loadRequestCount();
      void loadStories();
    }, [loadConversations, loadRequestCount, loadStories]),
  );

  /** Charge l'historique d'appels uniquement quand on ouvre l'onglet Appels. */
  useEffect(() => {
    if (activeTab === 2) {
      void loadCallHistory();
    }
  }, [activeTab, loadCallHistory]);

  /**
   * Temps réel : présence en ligne (point vert), nouveaux messages, lectures.
   * Tous les events sont relayés par `socketService` dès la connexion globale (`_layout.tsx`).
   *
   * Backend émissions (cf. `backend/src/services/message.service.ts`) :
   *  - `message:unread` → vers `user:{userId}` à chaque changement de compteur (nouveau msg, mark read).
   *  - `message:read`   → vers `conversation:{id}` lors d'une lecture (read receipt).
   *  - `presence:update` → vers chaque peer 1-1 à la connexion / déconnexion d'un utilisateur.
   */
  useEffect(() => {
    const offPresence = socketService.on('presence:update', (data: { userId: string; isOnline: boolean }) => {
      if (!data?.userId) return;
      setConversations((prev) =>
        prev.map((c) => (c.otherUserId === data.userId ? { ...c, online: !!data.isOnline } : c)),
      );
    });
    const offNew = socketService.on('new_message', (payload: unknown) => {
      let msg: Record<string, unknown>;
      let convId = '';
      if (isGroupSocketEnvelope(payload)) {
        convId = payload.groupId;
        msg = payload.message as Record<string, unknown>;
      } else {
        msg = (payload || {}) as Record<string, unknown>;
        convId = String(msg.conversation_id || msg.conversationId || '').trim();
      }
      if (!convId) {
        void loadConversations();
        return;
      }
      const type = String(msg?.type || 'text').toLowerCase();
      const preview =
        type === 'image'
          ? 'Photo'
          : type === 'video'
            ? 'Video'
            : type === 'audio' || type === 'voice'
              ? 'Audio'
              : type === 'file'
                ? 'Fichier'
                : type === 'location'
                  ? 'Position'
                  : type === 'contact'
                    ? 'Contact'
                    : String(msg?.content || '').slice(0, 200) || 'Message';
      const at = msg?.created_at ? String(msg.created_at) : new Date().toISOString();
      const senderId = String(msg?.sender_id || '').trim();
      const isMine = Boolean(currentUser?.id && senderId && senderId === currentUser.id);
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === convId);
        const timeStr = formatTimeAgo(at);
        if (idx < 0) {
          void loadConversations();
          return prev;
        }
        const updated = [...prev];
        const cur = updated[idx];
        updated[idx] = {
          ...cur,
          lastMessage: preview,
          lastMessageAt: at,
          time: timeStr,
          lastMsgType:
            type === 'image'
              ? 'image'
              : type === 'video'
                ? 'video'
                : type === 'audio' || type === 'voice'
                  ? 'voice'
                  : type === 'file'
                    ? 'file'
                    : 'text',
          isMine,
          lastOutgoingRead: false,
          unread: isMine ? cur.unread : cur.unread + 1,
        };
        return bumpConversationToTop(updated, convId);
      });
    });
    const offUnread = socketService.on('message:unread', (data: { conversationId?: string; unread?: number }) => {
      if (!data?.conversationId) return;
      const n = Math.max(0, Number(data.unread) || 0);
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === data.conversationId
            ? { ...c, unread: n, lastMessageAt: c.lastMessageAt || new Date().toISOString() }
            : c,
        );
        return bumpConversationToTop(updated, data.conversationId!);
      });
    });
    const offRead = socketService.on('messages_read', (data: unknown) => {
      const row = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
      const convId = String(row.conversationId || '').trim();
      if (!convId) return;
      const readerId = extractMessageReadReaderId(data);
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          if (readerId === currentUser?.id) {
            return { ...c, unread: 0 };
          }
          if (shouldApplyPeerReceiptEvent(readerId, currentUser?.id || '') && c.isMine) {
            return { ...c, lastOutgoingRead: true };
          }
          return c;
        }),
      );
    });
    return () => {
      offPresence();
      offNew();
      offUnread();
      offRead();
    };
  }, [loadConversations, currentUser?.id]);

  const startConversation = async (user: any) => {
    const userId = user._id || user.id;
    const userName = user.full_name || user.username || 'Utilisateur';
    const userAvatar =
      user.avatar ||
      user.profile_image ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=FF6B00&color=fff`;
    try {
      const response = await apiClient.get(`/messages/conversation/${encodeURIComponent(userId)}`);
      const conv = response.data?.data;
      if (conv?.id) {
        setShowContacts(false);
        router.push({
          pathname: '/messages/[id]',
          params: { id: conv.id, name: userName, avatar: userAvatar, otherUserId: userId },
        });
      }
    } catch (err) {
      devLog('Error starting conversation:', err);
      if (isDmAccessDeniedError(err)) {
        alertDmAccessDenied({ error: err, peerName: userName });
        return;
      }
      Alert.alert('Erreur', 'Impossible de démarrer la conversation');
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([loadConversations(), loadRealUsers(), loadRequestCount()]).finally(() => setRefreshing(false));
  }, [loadConversations, loadRealUsers, loadRequestCount]);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);
  const filteredConversations = searchQuery
    ? conversations.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations;

  const filteredUsers = searchQuery
    ? realUsers.filter(u => {
        const name = (u.full_name || u.username || '').toLowerCase();
        return name.includes(searchQuery.toLowerCase());
      })
    : realUsers;

  const renderReadReceipt = (item: Conversation) => {
    if (!item.isMine) return null;
    return (
      <Ionicons
        name="checkmark-done"
        size={16}
        color={item.lastOutgoingRead ? '#53BDEB' : Colors.textMuted}
        style={{ marginRight: 2 }}
      />
    );
  };

  const renderLastMessage = (item: Conversation) => {
    if (item.isTyping) return <Text style={styles.typingText}>En train d'ecrire...</Text>;
    if (item.lastMsgType === 'voice') {
      return (
        <View style={styles.lastMsgRow}>
          {renderReadReceipt(item)}
          <Ionicons name="mic" size={14} color={Colors.textSecondary} />
          <Text style={styles.lastMessage}> {item.voiceDuration}</Text>
        </View>
      );
    }
    if (item.lastMsgType === 'image') {
      return (
        <View style={styles.lastMsgRow}>
          {renderReadReceipt(item)}
          <Ionicons name="camera" size={14} color={Colors.textSecondary} />
          <Text style={styles.lastMessage}> {item.lastMessage || 'Photo'}</Text>
        </View>
      );
    }
    return (
      <View style={styles.lastMsgRow}>
        {renderReadReceipt(item)}
        <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage || 'Aucun message'}</Text>
      </View>
    );
  };

  /**
   * Tap sur une conversation :
   * 1. Optimistic UI : badge orange disparaît instantanément côté liste.
   * 2. Persiste côté serveur via `PUT /messages/:id/read` (best effort).
   * 3. Navigue vers l'écran de conversation (qui rejouera également le mark-as-read).
   */
  const openConversation = useCallback((item: Conversation) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === item.id ? { ...c, unread: 0 } : c)),
    );
    if (item.isGroup) {
      apiClient
        .post(`/messages/group/${encodeURIComponent(item.id)}/read`, {})
        .catch(() => {
          /* best effort */
        });
    } else {
      apiClient
        .put(`/messages/${encodeURIComponent(item.id)}/read`, {})
        .catch(() => {
          /* best effort */
        });
    }
    router.push({
      pathname: '/messages/[id]',
      params: {
        id: item.id,
        name: item.name,
        avatar: item.avatar,
        ...(item.isGroup ? { kind: 'group' } : {}),
        ...(item.otherUserId ? { otherUserId: item.otherUserId } : {}),
      },
    });
  }, []);

  const renderConversation = ({ item, index }: { item: Conversation; index: number }) => (
    <TouchableOpacity
      testID={index === 0 ? 'messages-first-conversation' : undefined}
      style={styles.conversationItem}
      onPress={() => openConversation(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        {item.online && <View style={styles.onlineDot} />}
      </View>
      <View style={styles.conversationInfo}>
        <View style={styles.conversationHeader}>
          <Text style={[styles.conversationName, item.unread > 0 && styles.nameUnread]} numberOfLines={1}>
            {item.isGroup ? '👥 ' : ''}
            {item.name}
          </Text>
          <Text style={[styles.conversationTime, item.unread > 0 && styles.timeUnread]}>{item.time}</Text>
        </View>
        <View style={styles.conversationFooter}>
          <View style={styles.lastMsgContainer}>{renderLastMessage(item)}</View>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderContactItem = ({ item, index }: { item: any; index: number }) => {
    const name = item.full_name || item.username || 'Utilisateur';
    const avatar = item.avatar || item.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=FF6B00&color=fff`;
    return (
      <TouchableOpacity testID={index === 0 ? 'messages-first-contact' : undefined} style={styles.contactItem} onPress={() => startConversation(item)} activeOpacity={0.7}>
        <Image source={{ uri: avatar }} style={styles.contactAvatar} />
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{name}</Text>
          <Text style={styles.contactBio} numberOfLines={1}>{item.bio || item.username || ''}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Contacts overlay
  if (showContacts) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowContacts(false)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nouvelle discussion</Text>
          <View style={styles.headerActions} />
        </View>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un contact..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        </View>
        {realUsers.length === 0 ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.emptyText}>Chargement des contacts...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            renderItem={renderContactItem}
            keyExtractor={(item, index) => item._id || item.id || `contact-${index}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.conversationsList}
          />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeRouterBack('/(tabs)')} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AfriChat</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => router.push('/messages/requests' as any)}
            accessibilityLabel="Demandes de messages"
          >
            <Ionicons name="mail-unread-outline" size={22} color={Colors.text} />
            {requestCount > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{requestCount > 9 ? '9+' : requestCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionBtn} onPress={() => setSearchVisible(!searchVisible)}>
            <Ionicons name="search" size={22} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity testID="messages-new-group" style={styles.headerActionBtn} onPress={() => router.push('/messages/new-group' as any)}>
            <Ionicons name="people-circle" size={24} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => setHeaderMenuOpen(true)}
            accessibilityLabel="Menu AfriChat"
            accessibilityRole="button"
          >
            <Ionicons name="ellipsis-vertical" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {searchVisible && (
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {TABS.map((tab, index) => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === index && styles.tabActive]} onPress={() => setActiveTab(index)}>
            <Text style={[styles.tabText, activeTab === index && styles.tabTextActive]}>{tab}</Text>
            {index === 0 && totalUnread > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{totalUnread}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === 0 && (
        loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.emptyText}>Chargement...</Text>
          </View>
        ) : filteredConversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Aucune conversation</Text>
            <Text style={styles.emptyText}>Appuyez sur le bouton ci-dessous pour commencer une discussion</Text>
          </View>
        ) : (
          <FlatList
            data={filteredConversations}
            renderItem={renderConversation}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.conversationsList}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          />
        )
      )}

      {activeTab === 1 && (
        <ScrollViewWrapper>
          <TouchableOpacity
            style={styles.myStatusCard}
            onPress={() => router.push('/stories' as never)}
            accessibilityLabel="Ajouter un statut"
            activeOpacity={0.85}
          >
            <View style={styles.myStatusAvatar}>
              <Image source={{ uri: myAvatarUri }} style={styles.statusAvatarImg} />
              <View style={styles.addStatusBadge}>
                <Ionicons name="add" size={14} color="#FFF" />
              </View>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.myStatusTitle} numberOfLines={1}>
                {myFullName}
              </Text>
              <Text style={styles.myStatusSubtitle}>Appuyez pour ajouter un statut</Text>
            </View>
            <Ionicons name="camera" size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          {storyFeed.filter((s) => !s.is_self && (s.has_story || s.is_live)).length > 0 ? (
            <Text style={styles.statusSectionTitle}>Mises à jour récentes</Text>
          ) : (
            <View style={styles.statusEmpty}>
              <Ionicons name="ellipse-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.statusEmptyTitle}>Aucun statut récent</Text>
              <Text style={styles.statusEmptyText}>
                Les statuts de vos contacts s'afficheront ici pendant 24 heures.
              </Text>
            </View>
          )}

          {storyFeed
            .filter((s) => !s.is_self && (s.has_story || s.is_live))
            .map((s) => {
              const ringColor = s.is_live
                ? '#FF2D55'
                : s.has_unseen_story
                  ? Colors.primary
                  : 'rgba(255,255,255,0.25)';
              const sub = s.is_live
                ? 'En direct'
                : s.has_unseen_story
                  ? 'Nouveau · 24 h'
                  : 'Vu';
              const peerAvatar =
                toAbsoluteMediaUrl(s.profile_image || '') ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  s.full_name || s.username || 'U',
                )}&background=FF6B00&color=fff`;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={styles.statusItem}
                  activeOpacity={0.75}
                  onPress={() => {
                    if (s.is_live && s.live_id) {
                      router.push({ pathname: '/live/[id]', params: { id: s.live_id } } as never);
                    } else {
                      router.push({ pathname: '/stories', params: { userId: s.id } } as never);
                    }
                  }}
                >
                  <View style={[styles.statusAvatarRing, { borderColor: ringColor }]}>
                    <Image source={{ uri: peerAvatar }} style={styles.statusAvatarImg} />
                    {s.is_live ? (
                      <View style={styles.statusLiveBadge}>
                        <Text style={styles.statusLiveBadgeText}>LIVE</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.statusName} numberOfLines={1}>
                      {s.full_name || s.username || 'Contact'}
                    </Text>
                    <Text style={styles.statusSub}>{sub}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
        </ScrollViewWrapper>
      )}

      {activeTab === 2 && (
        callsLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : callHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="call-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Aucun appel</Text>
            <Text style={styles.emptyText}>Vos appels apparaitront ici</Text>
          </View>
        ) : (
          <FlatList
            testID="call-history-list"
            data={callHistory}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={callsLoading}
                onRefresh={loadCallHistory}
                tintColor={Colors.primary}
              />
            }
            contentContainerStyle={{ paddingBottom: 100 }}
            renderItem={({ item }) => {
              const avatar = profileAvatarUri(item.peer.avatar || '', item.peer.name);
              const isMissed = item.status === 'missed' || item.status === 'declined';
              const arrowIcon =
                item.direction === 'outgoing'
                  ? 'arrow-up-outline'
                  : isMissed
                    ? 'arrow-down-outline'
                    : 'arrow-down-outline';
              const arrowColor = isMissed ? Colors.error : Colors.primary;
              const date = new Date(item.startedAt);
              const timeLabel = `${formatTimeAgo(item.startedAt)} · ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
              const durLabel = item.durationSec > 0 ? ` · ${formatCallDuration(item.durationSec)}` : '';
              return (
                <TouchableOpacity
                  testID={`call-history-item-${item.id}`}
                  style={styles.callRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (!item.peer.id) return;
                    router.push({
                      pathname: '/messages/call',
                      params: {
                        peerId: item.peer.id,
                        peerName: item.peer.name,
                        peerAvatar: item.peer.avatar || '',
                        callType: item.type,
                        role: 'caller',
                      },
                    } as never);
                  }}
                >
                  <Image source={{ uri: avatar }} style={styles.callAvatar} />
                  <View style={styles.callBody}>
                    <Text style={[styles.callName, isMissed && { color: Colors.error }]} numberOfLines={1}>
                      {item.peer.name}
                    </Text>
                    <View style={styles.callSubRow}>
                      <Ionicons name={arrowIcon as any} size={14} color={arrowColor} />
                      <Text style={styles.callSubText} numberOfLines={1}>
                        {timeLabel}
                        {durLabel}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    testID={`call-history-callback-${item.id}`}
                    style={styles.callActionBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      if (!item.peer.id) return;
                      router.push({
                        pathname: '/messages/call',
                        params: {
                          peerId: item.peer.id,
                          peerName: item.peer.name,
                          peerAvatar: item.peer.avatar || '',
                          callType: item.type,
                          role: 'caller',
                        },
                      } as never);
                    }}
                  >
                    <Ionicons
                      name={item.type === 'video' ? 'videocam' : 'call'}
                      size={22}
                      color={Colors.primary}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }}
          />
        )
      )}

      {/* FAB */}
      <TouchableOpacity
        testID="messages-fab-new"
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => {
          if (activeTab === 0) setShowContacts(true);
          else if (activeTab === 1) router.push('/stories' as never);
          else if (activeTab === 2) {
            setShowContacts(true);
          }
        }}
      >
        <Ionicons name={activeTab === 0 ? 'chatbubble' : activeTab === 1 ? 'camera' : 'call'} size={24} color="#FFF" />
      </TouchableOpacity>

      <Modal
        visible={headerMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setHeaderMenuOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.headerMenuRoot}>
          <Pressable
            style={styles.headerMenuBackdrop}
            onPress={() => setHeaderMenuOpen(false)}
            accessibilityLabel="Fermer le menu"
          />
          <View style={[styles.headerMenuCard, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <View style={styles.headerMenuHandle} />
            <Text style={styles.headerMenuTitle}>AfriChat</Text>
            <TouchableOpacity
              style={styles.headerMenuRow}
              onPress={() => {
                setHeaderMenuOpen(false);
                setShowContacts(true);
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={22} color={Colors.text} />
              <Text style={styles.headerMenuRowText}>Nouvelle discussion</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerMenuRow}
              onPress={() => {
                setHeaderMenuOpen(false);
                router.push('/messages/new-group' as never);
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="people-circle-outline" size={22} color={Colors.text} />
              <Text style={styles.headerMenuRowText}>Nouveau groupe</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerMenuRow}
              onPress={() => {
                setHeaderMenuOpen(false);
                setSearchVisible(true);
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="search-outline" size={22} color={Colors.text} />
              <Text style={styles.headerMenuRowText}>Rechercher une conversation</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerMenuRow}
              onPress={() => {
                setHeaderMenuOpen(false);
                router.push('/messages/requests' as never);
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="mail-unread-outline" size={22} color={Colors.text} />
              <Text style={styles.headerMenuRowText}>Demandes de messages</Text>
              {requestCount > 0 && (
                <View style={styles.headerMenuBadge}>
                  <Text style={styles.headerMenuBadgeText}>{requestCount > 9 ? '9+' : requestCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerMenuRow}
              onPress={() => {
                setHeaderMenuOpen(false);
                router.push('/settings/privacy/direct-messages' as never);
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="lock-closed-outline" size={22} color={Colors.text} />
              <Text style={styles.headerMenuRowText}>Confidentialité (messages)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerMenuRow}
              onPress={() => {
                setHeaderMenuOpen(false);
                router.push('/settings' as never);
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="settings-outline" size={22} color={Colors.text} />
              <Text style={styles.headerMenuRowText}>Paramètres</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerMenuRow, styles.headerMenuRowLast]}
              onPress={() => setHeaderMenuOpen(false)}
              activeOpacity={0.75}
            >
              <Ionicons name="close-outline" size={22} color={Colors.textSecondary} />
              <Text style={[styles.headerMenuRowText, { color: Colors.textSecondary }]}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: FontSizes.xxl, fontWeight: 'bold', color: Colors.text },
  headerActions: { flexDirection: 'row', gap: Spacing.xs },
  headerActionBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  headerBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  headerBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, marginHorizontal: Spacing.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, marginBottom: Spacing.sm },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSizes.md },
  tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border, paddingHorizontal: Spacing.lg },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, gap: 6 },
  tabActive: { borderBottomWidth: 3, borderBottomColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontSize: FontSizes.md, fontWeight: '500' },
  tabTextActive: { color: Colors.primary, fontWeight: 'bold' },
  tabBadge: { backgroundColor: Colors.primary, minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  conversationsList: { paddingTop: Spacing.xs },
  conversationItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  avatarContainer: { position: 'relative' },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.background },
  conversationInfo: { flex: 1 },
  conversationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  conversationName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '500', flex: 1, marginRight: 8 },
  nameUnread: { fontWeight: 'bold' },
  conversationTime: { color: Colors.textMuted, fontSize: FontSizes.xs },
  timeUnread: { color: Colors.primary, fontWeight: '600' },
  conversationFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMsgContainer: { flex: 1, marginRight: Spacing.sm },
  lastMsgRow: { flexDirection: 'row', alignItems: 'center' },
  lastMessage: { color: Colors.textSecondary, fontSize: FontSizes.sm, flex: 1 },
  typingText: { color: Colors.primary, fontSize: FontSizes.sm, fontStyle: 'italic' },
  unreadBadge: { backgroundColor: Colors.primary, minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  unreadText: { color: '#FFF', fontSize: FontSizes.xs, fontWeight: 'bold' },
  // Contacts
  contactItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  contactAvatar: { width: 48, height: 48, borderRadius: 24 },
  contactInfo: { flex: 1 },
  contactName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  contactBio: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  // Empty state
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginTop: 16 },
  emptyText: { color: Colors.textSecondary, fontSize: FontSizes.sm, textAlign: 'center', marginTop: 8 },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  callAvatar: { width: 52, height: 52, borderRadius: 26, marginRight: Spacing.md, backgroundColor: Colors.surface },
  callBody: { flex: 1, minWidth: 0 },
  callName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  callSubRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 4 },
  callSubText: { color: Colors.textSecondary, fontSize: FontSizes.xs, flexShrink: 1 },
  callActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,107,0,0.12)',
    marginLeft: Spacing.sm,
  },
  // Status
  statusContainer: { flex: 1, paddingTop: Spacing.md },
  myStatusCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  myStatusAvatar: { position: 'relative' },
  statusAvatarImg: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.surface },
  addStatusBadge: { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.background },
  myStatusTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  myStatusSubtitle: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  statusSectionTitle: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  statusAvatarRing: {
    position: 'relative',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2.5,
    padding: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLiveBadge: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    backgroundColor: '#FF2D55',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  statusLiveBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  statusName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  statusSub: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: 2 },
  statusEmpty: { alignItems: 'center', paddingHorizontal: 30, paddingVertical: 60, gap: 8 },
  statusEmptyTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  statusEmptyText: { color: Colors.textSecondary, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 18 },
  // FAB
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  headerMenuRoot: { flex: 1, justifyContent: 'flex-end' },
  headerMenuBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  headerMenuCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  headerMenuHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: Spacing.md,
  },
  headerMenuTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  headerMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerMenuRowLast: { borderBottomWidth: 0 },
  headerMenuRowText: { flex: 1, fontSize: FontSizes.md, color: Colors.text, fontWeight: '500' },
  headerMenuBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  headerMenuBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
});
