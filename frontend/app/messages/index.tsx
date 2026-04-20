import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, ActivityIndicator, RefreshControl, Alert, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import apiClient from '../../src/api/client';
import socketService from '../../src/services/socketService';
import { useAuthStore } from '../../src/store/authStore';
import { toAbsoluteMediaUrl } from '../../src/utils/absoluteMediaUrl';

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
  time: string;
  unread: number;
  online: boolean;
  isTyping: boolean;
  lastMsgType: string;
  isRead: boolean;
  isMine: boolean;
  isGroup?: boolean;
  groupMembers?: number;
  voiceDuration?: string;
  otherUserId?: string;
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

  /** Avatar du compte connecté — utilisé sur la carte « Mon statut » de l'onglet Statuts. */
  const myAvatarUri =
    toAbsoluteMediaUrl(currentUser?.profile_image || currentUser?.avatar || '') ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      currentUser?.full_name || currentUser?.username || 'Moi',
    )}&background=FF6B00&color=fff`;
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
      console.log('Could not load real users, trying direct:', err?.message);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      // Pas de `inbox=primary` ici : défaut API = `all` (toutes les discussions), comme avant la fonctionnalité « demandes ».
      // Les fils « à accepter » restent accessibles via l’écran Demandes (`inbox=requests`).
      const response = await apiClient.get('/messages/conversations', { params: { page: 1, limit: 40 } });
      const data = response.data?.data || response.data;
      const backendConvos = data?.conversations || [];
      const transformed: Conversation[] = backendConvos.map((c: any) => {
        const other = c.other || {};
        const timeStr = c.last_message_at ? formatTimeAgo(c.last_message_at) : '';
        const displayName = c.is_group
          ? (c.group_name || 'Groupe')
          : (other.full_name || other.username || 'Contact');
        const avatar = c.is_group
          ? (c.group_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=333&color=fff`)
          : (other.profile_image || `https://i.pravatar.cc/150?u=${other.id || c.id}`);
        return {
          id: c.id,
          name: displayName,
          avatar,
          lastMessage: c.last_message_text || '',
          time: timeStr,
          unread: c.unread_count || 0,
          online: Boolean(other.is_online ?? other.presence?.is_online ?? false),
          isTyping: false,
          lastMsgType: 'text',
          isRead: (c.unread_count || 0) === 0,
          isMine: false,
          isGroup: !!c.is_group,
          otherUserId: c.is_group ? undefined : other.id,
        };
      });
      setConversations(transformed);

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
      console.log('Error loading conversations:', err);
      setConversations([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void loadConversations();
    void loadRealUsers();
    void loadRequestCount();
    void loadStories();
  }, [loadConversations, loadRealUsers, loadRequestCount, loadStories]);

  /** Rafraîchit la liste à chaque retour sur l'écran (badge non-lu, dernier message, stories). */
  useFocusEffect(
    useCallback(() => {
      void loadConversations();
      void loadRequestCount();
      void loadStories();
    }, [loadConversations, loadRequestCount, loadStories]),
  );

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
    const offNew = socketService.on('new_message', () => {
      void loadConversations();
    });
    const offUnread = socketService.on('message:unread', (data: { conversationId?: string; unread?: number }) => {
      if (!data?.conversationId) return;
      const n = Math.max(0, Number(data.unread) || 0);
      setConversations((prev) =>
        prev.map((c) => (c.id === data.conversationId ? { ...c, unread: n, isRead: n === 0 } : c)),
      );
    });
    const offRead = socketService.on('message:read', (data: { conversationId?: string }) => {
      if (!data?.conversationId) return;
      setConversations((prev) =>
        prev.map((c) => (c.id === data.conversationId ? { ...c, unread: 0, isRead: true } : c)),
      );
    });
    return () => {
      offPresence();
      offNew();
      offUnread();
      offRead();
    };
  }, [loadConversations]);

  const startConversation = async (user: any) => {
    try {
      const userId = user._id || user.id;
      const userName = user.full_name || user.username || 'Utilisateur';
      const userAvatar = user.avatar || user.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=FF6B00&color=fff`;
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
      console.log('Error starting conversation:', err);
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
    return <Ionicons name="checkmark-done" size={16} color={item.isRead ? '#53BDEB' : Colors.textMuted} style={{ marginRight: 2 }} />;
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
      prev.map((c) => (c.id === item.id ? { ...c, unread: 0, isRead: true } : c)),
    );
    apiClient
      .put(`/messages/${encodeURIComponent(item.id)}/read`, {})
      .catch(() => {
        /* best effort */
      });
    router.push({
      pathname: '/messages/[id]',
      params: {
        id: item.id,
        name: item.name,
        avatar: item.avatar,
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
          <Text style={[styles.conversationName, item.unread > 0 && styles.nameUnread]} numberOfLines={1}>{item.name}</Text>
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
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
          <TouchableOpacity style={styles.headerActionBtn}>
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
        <View style={styles.emptyState}>
          <Ionicons name="call-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Appels</Text>
          <Text style={styles.emptyText}>Vos appels apparaitront ici</Text>
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity
        testID="messages-fab-new"
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => {
          if (activeTab === 0) setShowContacts(true);
          else if (activeTab === 1) router.push('/stories' as never);
          else if (activeTab === 2) {
            Alert.alert('Appels', 'Lancez un appel depuis une conversation : ouvrez la discussion puis touchez le bouton 📞 ou 📹.');
          }
        }}
      >
        <Ionicons name={activeTab === 0 ? 'chatbubble' : activeTab === 1 ? 'camera' : 'call'} size={24} color="#FFF" />
      </TouchableOpacity>
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
  // Calls
  callItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  callAvatar: { width: 48, height: 48, borderRadius: 24 },
  callInfo: { flex: 1 },
  callName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '500' },
  callMissed: { color: Colors.error },
  callMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  callTime: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  callAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  // FAB
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
});
