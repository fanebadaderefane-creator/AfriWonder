import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, Dimensions } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

const TABS = ['Discussions', 'Statuts', 'Appels'];

const CONVERSATIONS = [
  {
    id: 'c1', name: 'Aminata Diallo', avatar: 'https://i.pravatar.cc/150?img=1',
    lastMessage: 'Salut! Tu as vu ma nouvelle video?', time: '14:32', unread: 3, online: true,
    isTyping: false, lastMsgType: 'text', isRead: false, isMine: false,
  },
  {
    id: 'c2', name: 'Moussa Ndiaye', avatar: 'https://i.pravatar.cc/150?img=2',
    lastMessage: 'Merci pour la commande!', time: '13:45', unread: 1, online: true,
    isTyping: true, lastMsgType: 'text', isRead: false, isMine: false,
  },
  {
    id: 'c3', name: 'Famille Bamako', avatar: 'https://i.pravatar.cc/150?img=10',
    lastMessage: 'Fanta: Photos du mariage', time: '12:20', unread: 15, online: false,
    isTyping: false, lastMsgType: 'image', isRead: false, isMine: false, isGroup: true, groupMembers: 12,
  },
  {
    id: 'c4', name: 'Awa Kone', avatar: 'https://i.pravatar.cc/150?img=3',
    lastMessage: 'Le colis est en route', time: '11:05', unread: 0, online: false,
    isTyping: false, lastMsgType: 'text', isRead: true, isMine: true,
  },
  {
    id: 'c5', name: 'Ibrahim Toure', avatar: 'https://i.pravatar.cc/150?img=4',
    lastMessage: 'On se retrouve demain?', time: '09:30', unread: 0, online: false,
    isTyping: false, lastMsgType: 'text', isRead: true, isMine: true,
  },
  {
    id: 'c6', name: 'Fatoumata Diarra', avatar: 'https://i.pravatar.cc/150?img=9',
    lastMessage: "J'adore ta collection!", time: 'Hier', unread: 0, online: true,
    isTyping: false, lastMsgType: 'text', isRead: false, isMine: false,
  },
  {
    id: 'c7', name: 'Vendeurs AfriWonder', avatar: 'https://i.pravatar.cc/150?img=12',
    lastMessage: 'Moussa: Nouveau stock disponible', time: 'Hier', unread: 5, online: false,
    isTyping: false, lastMsgType: 'text', isRead: false, isMine: false, isGroup: true, groupMembers: 45,
  },
  {
    id: 'c8', name: 'Support AfriWonder', avatar: 'https://i.pravatar.cc/150?img=50',
    lastMessage: "Bienvenue sur AfriWonder!", time: 'Lun', unread: 0, online: true,
    isTyping: false, lastMsgType: 'text', isRead: true, isMine: true,
  },
  {
    id: 'c9', name: 'Mariam Sangare', avatar: 'https://i.pravatar.cc/150?img=5',
    lastMessage: '', time: 'Dim', unread: 0, online: false,
    isTyping: false, lastMsgType: 'voice', isRead: true, isMine: true, voiceDuration: '0:34',
  },
  {
    id: 'c10', name: 'Boubacar Diallo', avatar: 'https://i.pravatar.cc/150?img=7',
    lastMessage: 'Photo', time: 'Sam', unread: 0, online: false,
    isTyping: false, lastMsgType: 'image', isRead: false, isMine: true,
  },
];

const CALL_HISTORY = [
  { id: 'call1', name: 'Aminata Diallo', avatar: 'https://i.pravatar.cc/150?img=1', type: 'incoming', isVideo: false, time: 'Aujourd\'hui, 10:30', missed: false },
  { id: 'call2', name: 'Moussa Ndiaye', avatar: 'https://i.pravatar.cc/150?img=2', type: 'outgoing', isVideo: true, time: 'Hier, 18:00', missed: false },
  { id: 'call3', name: 'Ibrahim Toure', avatar: 'https://i.pravatar.cc/150?img=4', type: 'incoming', isVideo: false, time: 'Hier, 15:22', missed: true },
  { id: 'call4', name: 'Fatoumata Diarra', avatar: 'https://i.pravatar.cc/150?img=9', type: 'outgoing', isVideo: false, time: 'Lun, 09:15', missed: false },
];

export default function MessagesListScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(0);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = searchQuery
    ? CONVERSATIONS.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : CONVERSATIONS;

  const renderReadReceipt = (item: typeof CONVERSATIONS[0]) => {
    if (!item.isMine) return null;
    return (
      <Ionicons
        name="checkmark-done"
        size={16}
        color={item.isRead ? '#53BDEB' : Colors.textMuted}
        style={{ marginRight: 2 }}
      />
    );
  };

  const renderLastMessage = (item: typeof CONVERSATIONS[0]) => {
    if (item.isTyping) {
      return <Text style={styles.typingText}>En train d'ecrire...</Text>;
    }
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
        <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
      </View>
    );
  };

  const renderConversation = ({ item }: { item: typeof CONVERSATIONS[0] }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => router.push(`/messages/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        {item.online && <View style={styles.onlineDot} />}
      </View>
      <View style={styles.conversationInfo}>
        <View style={styles.conversationHeader}>
          <Text style={[styles.conversationName, item.unread > 0 && styles.nameUnread]}>{item.name}</Text>
          <Text style={[styles.conversationTime, item.unread > 0 && styles.timeUnread]}>
            {item.time}
          </Text>
        </View>
        <View style={styles.conversationFooter}>
          <View style={styles.lastMsgContainer}>
            {renderLastMessage(item)}
          </View>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCallItem = ({ item }: { item: typeof CALL_HISTORY[0] }) => (
    <TouchableOpacity style={styles.callItem}>
      <Image source={{ uri: item.avatar }} style={styles.callAvatar} />
      <View style={styles.callInfo}>
        <Text style={[styles.callName, item.missed && styles.callMissed]}>{item.name}</Text>
        <View style={styles.callMetaRow}>
          <Ionicons
            name={item.type === 'incoming' ? 'arrow-down-left' : 'arrow-up-right'}
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

      {/* Search Bar */}
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
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === index && styles.tabActive]}
            onPress={() => setActiveTab(index)}
          >
            <Text style={[styles.tabText, activeTab === index && styles.tabTextActive]}>{tab}</Text>
            {index === 0 && CONVERSATIONS.reduce((sum, c) => sum + c.unread, 0) > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{CONVERSATIONS.reduce((sum, c) => sum + c.unread, 0)}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content based on tab */}
      {activeTab === 0 && (
        <FlatList
          data={filteredConversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.conversationsList}
        />
      )}

      {activeTab === 1 && (
        <View style={styles.statusContainer}>
          {/* My Status */}
          <TouchableOpacity style={styles.myStatusCard}>
            <View style={styles.myStatusAvatar}>
              <Image source={{ uri: 'https://i.pravatar.cc/150?img=8' }} style={styles.statusAvatarImg} />
              <View style={styles.addStatusBadge}>
                <Ionicons name="add" size={14} color="#FFF" />
              </View>
            </View>
            <View>
              <Text style={styles.myStatusTitle}>Mon statut</Text>
              <Text style={styles.myStatusSubtitle}>Appuyez pour ajouter un statut</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.statusSectionTitle}>Mises a jour recentes</Text>
          {CONVERSATIONS.filter(c => c.online).slice(0, 4).map((contact) => (
            <TouchableOpacity key={contact.id} style={styles.statusItem}>
              <View style={styles.statusRing}>
                <Image source={{ uri: contact.avatar }} style={styles.statusAvatar} />
              </View>
              <View>
                <Text style={styles.statusName}>{contact.name}</Text>
                <Text style={styles.statusTime}>Aujourd'hui, 10:30</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {activeTab === 2 && (
        <FlatList
          data={CALL_HISTORY}
          renderItem={renderCallItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.conversationsList}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 20 }]}>
        <Ionicons
          name={activeTab === 0 ? 'chatbubble' : activeTab === 1 ? 'camera' : 'call'}
          size={24}
          color="#FFF"
        />
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
  conversationName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '500' },
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
  // Status tab
  statusContainer: { flex: 1, paddingTop: Spacing.md },
  myStatusCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  myStatusAvatar: { position: 'relative' },
  statusAvatarImg: { width: 52, height: 52, borderRadius: 26 },
  addStatusBadge: { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.background },
  myStatusTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  myStatusSubtitle: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  statusSectionTitle: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: '600', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  statusItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  statusRing: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: Colors.primary, padding: 2 },
  statusAvatar: { width: '100%', height: '100%', borderRadius: 24 },
  statusName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '500' },
  statusTime: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  // Calls tab
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
