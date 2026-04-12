import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, Dimensions, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import apiClient from '../../src/api/client';

const { width } = Dimensions.get('window');
const TABS = ['Discussions', 'Statuts', 'Appels'];

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

export default function MessagesListScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(0);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [realUsers, setRealUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showContacts, setShowContacts] = useState(false);

  useEffect(() => { loadConversations(); loadRealUsers(); }, []);

  const loadRealUsers = async () => {
    try {
      const response = await apiClient.get('/users?limit=50');
      const rawData = response.data;
      const data = rawData?.data || rawData;
      let users = data?.users || data || [];
      if (!Array.isArray(users)) users = [];
      const filtered = users.filter((u: any) => u && (u.username || u.full_name));
      setRealUsers(filtered);
    } catch (err: any) {
      console.log('Could not load real users, trying direct:', err?.message);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await apiClient.get('/messages/conversations', { params: { page: 1, limit: 40 } });
      const data = response.data?.data || response.data;
      const backendConvos = data?.conversations || [];
      if (backendConvos.length > 0) {
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
            online: false,
            isTyping: false,
            lastMsgType: 'text',
            isRead: (c.unread_count || 0) === 0,
            isMine: false,
            isGroup: !!c.is_group,
            otherUserId: c.is_group ? undefined : other.id,
          };
        });
        setConversations(transformed);
      }
    } catch (err) {
      console.log('Error loading conversations:', err);
    } finally { setLoading(false); }
  };

  const formatTimeAgo = (dateStr: string) => {
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
  };

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
    Promise.all([loadConversations(), loadRealUsers()]).finally(() => setRefreshing(false));
  }, []);

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

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => router.push({
        pathname: '/messages/[id]',
        params: {
          id: item.id,
          name: item.name,
          avatar: item.avatar,
          ...(item.otherUserId ? { otherUserId: item.otherUserId } : {}),
        },
      })}
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

  const renderContactItem = ({ item }: { item: any }) => {
    const name = item.full_name || item.username || 'Utilisateur';
    const avatar = item.avatar || item.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=FF6B00&color=fff`;
    return (
      <TouchableOpacity style={styles.contactItem} onPress={() => startConversation(item)} activeOpacity={0.7}>
        <Image source={{ uri: avatar }} style={styles.contactAvatar} />
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{name}</Text>
          <Text style={styles.contactBio} numberOfLines={1}>{item.bio || item.username || ''}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCallItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.callItem}>
      <Image source={{ uri: item.avatar }} style={styles.callAvatar} />
      <View style={styles.callInfo}>
        <Text style={[styles.callName, item.missed && styles.callMissed]}>{item.name}</Text>
        <View style={styles.callMetaRow}>
          <Ionicons
            name={(item.type === 'incoming' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline') as React.ComponentProps<typeof Ionicons>['name']}
            size={14}
            color={item.missed ? Colors.error : Colors.success}
          />
          <Text style={styles.callTime}>{item.time}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.callAction}>
        <Ionicons name={item.isVideo ? 'videocam' : 'call'} size={22} color={Colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

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
            keyExtractor={(item) => item._id || item.id || Math.random().toString()}
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
          <TouchableOpacity style={styles.headerActionBtn} onPress={() => setSearchVisible(!searchVisible)}>
            <Ionicons name="search" size={22} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionBtn} onPress={() => router.push('/messages/new-group' as any)}>
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
        <View style={styles.statusContainer}>
          <TouchableOpacity style={styles.myStatusCard}>
            <View style={styles.myStatusAvatar}>
              <Image source={{ uri: 'https://i.pravatar.cc/150?img=8' }} style={styles.statusAvatarImg} />
              <View style={styles.addStatusBadge}><Ionicons name="add" size={14} color="#FFF" /></View>
            </View>
            <View>
              <Text style={styles.myStatusTitle}>Mon statut</Text>
              <Text style={styles.myStatusSubtitle}>Appuyez pour ajouter un statut</Text>
            </View>
          </TouchableOpacity>
        </View>
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
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => {
          if (activeTab === 0) setShowContacts(true);
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
  headerActionBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
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
  statusAvatarImg: { width: 52, height: 52, borderRadius: 26 },
  addStatusBadge: { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.background },
  myStatusTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  myStatusSubtitle: { color: Colors.textSecondary, fontSize: FontSizes.sm },
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
