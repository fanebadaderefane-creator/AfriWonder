/**
 * InboxScreen — Messages / Boîte de réception (réécriture RN depuis PWA Inbox.jsx)
 * Liste des conversations, filtre Tous / Non lus, recherche, tap → Chat.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

function formatTime(date) {
  if (!date) return '';
  try {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Il y a ${diffDays} j`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export default function InboxScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const loadConversations = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [convData, groupsData] = await Promise.all([
        api.messages.getConversations(1, 50),
        api.messages.getGroups().catch(() => []),
      ]);
      const list = convData?.conversations ?? (Array.isArray(convData) ? convData : []);
      setConversations(list);
      setGroups(Array.isArray(groupsData) ? groupsData : (groupsData?.groups ?? []));
    } catch {
      setConversations([]);
      setGroups([]);
    }
  }, [user?.id]);

  useEffect(() => {
    setLoading(true);
    loadConversations().finally(() => setLoading(false));
  }, [loadConversations]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadConversations().finally(() => setRefreshing(false));
  }, [loadConversations]);

  const unreadConversations = useMemo(
    () => conversations.filter((c) => (c.unread_count ?? 0) > 0),
    [conversations]
  );

  const filteredConversations = useMemo(() => {
    const source = activeFilter === 'unread' ? unreadConversations : conversations;
    if (!searchQuery.trim()) return source;
    const q = searchQuery.toLowerCase();
    return source.filter((c) => {
      const other = c.other || {};
      const name = (other.full_name || other.username || '').toLowerCase();
      return name.includes(q);
    });
  }, [activeFilter, unreadConversations, conversations, searchQuery]);

  const openChat = (otherUserId) => {
    navigation.navigate('Chat', { userId: otherUserId });
  };

  const openGroupChat = (groupId) => {
    navigation.navigate('GroupChat', { groupId });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Search')} style={styles.iconBtn}>
          <Ionicons name="create-outline" size={22} color="#F9FAFB" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une conversation..."
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, activeFilter === 'all' && styles.filterBtnActive]}
          onPress={() => setActiveFilter('all')}
        >
          <Ionicons name="filter" size={16} color={activeFilter === 'all' ? '#FFF' : '#9CA3AF'} />
          <Text style={[styles.filterText, activeFilter === 'all' && styles.filterTextActive]}>Tous</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, activeFilter === 'unread' && styles.filterBtnUnread]}
          onPress={() => setActiveFilter('unread')}
        >
          <Text style={[styles.filterText, activeFilter === 'unread' && styles.filterTextUnread]}>
            Non lus ({unreadConversations.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tint="#3B82F6" />}
      >
        {!loading && (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>Groupes</Text>
            <TouchableOpacity
              style={styles.convRow}
              onPress={() => navigation.navigate('CreateGroup')}
              activeOpacity={0.7}
            >
              <View style={[styles.avatar, styles.avatarPlaceholder, styles.avatarCreate]}>
                <Ionicons name="add" size={28} color="#3B82F6" />
              </View>
              <View style={styles.convBody}>
            <Text style={[styles.convName, styles.createGroupLabel]}>Créer un groupe</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>
            {groups.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={styles.convRow}
                onPress={() => openGroupChat(g.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="people" size={24} color="#F9FAFB" />
                </View>
                <View style={styles.convBody}>
                  <View style={styles.convTop}>
                    <Text style={styles.convName} numberOfLines={1}>{g.name || 'Groupe'}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
              </TouchableOpacity>
            ))}
          </View>
        )}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Chargement des conversations…</Text>
          </View>
        ) : filteredConversations.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="chatbubbles-outline" size={48} color="#3B82F6" />
            </View>
            <Text style={styles.emptyTitle}>Pas encore de messages</Text>
            <Text style={styles.emptySub}>
              Échangez avec les créateurs et la communauté AfriWonder
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('Discover')}>
              <Text style={styles.emptyBtnText}>Découvrir des créateurs</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredConversations.map((conv) => {
            const other = conv.other || {};
            const otherName = other.full_name || other.username || 'Utilisateur';
            const otherAvatar = other.profile_image;
            const otherUserId = other.id;
            const unreadCount = conv.unread_count ?? 0;
            return (
              <TouchableOpacity
                key={conv.id || otherUserId}
                style={styles.convRow}
                onPress={() => openChat(otherUserId)}
                activeOpacity={0.7}
              >
                {otherAvatar ? (
                  <Image source={{ uri: otherAvatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarLetter}>{otherName[0]?.toUpperCase() || 'U'}</Text>
                  </View>
                )}
                <View style={styles.convBody}>
                  <View style={styles.convTop}>
                    <Text style={[styles.convName, unreadCount > 0 && styles.convNameUnread]} numberOfLines={1}>
                      {otherName}
                    </Text>
                    <Text style={styles.convTime}>{formatTime(conv.last_message_at)}</Text>
                  </View>
                  <View style={styles.convBottom}>
                    <Text style={[styles.convPreview, unreadCount > 0 && styles.convPreviewUnread]} numberOfLines={1}>
                      {conv.last_message_text || 'Aucun message'}
                    </Text>
                    {unreadCount > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1F2937',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#F9FAFB', flex: 1 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#F9FAFB',
  },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#111827',
    gap: 6,
  },
  filterBtnActive: { backgroundColor: '#1F2937' },
  filterBtnUnread: { backgroundColor: 'rgba(59,130,246,0.2)' },
  filterText: { fontSize: 14, color: '#9CA3AF' },
  filterTextActive: { color: '#F9FAFB', fontWeight: '600' },
  filterTextUnread: { color: '#3B82F6', fontWeight: '600' },
  sectionWrap: { marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', marginHorizontal: 16, marginBottom: 8 },
  avatarCreate: { backgroundColor: 'rgba(59,130,246,0.2)' },
  createGroupLabel: { color: '#3B82F6', fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  centered: { paddingVertical: 48, alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#9CA3AF' },
  emptyWrap: { paddingVertical: 48, alignItems: 'center', paddingHorizontal: 24 },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59,130,246,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#F9FAFB', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginBottom: 24 },
  emptyBtn: { backgroundColor: '#3B82F6', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999 },
  emptyBtnText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1F2937',
  },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: { backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 20, fontWeight: '700', color: '#F9FAFB' },
  convBody: { flex: 1, marginLeft: 12, minWidth: 0 },
  convTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  convName: { fontSize: 16, fontWeight: '500', color: '#E5E7EB', flex: 1 },
  convNameUnread: { color: '#F9FAFB', fontWeight: '600' },
  convTime: { fontSize: 12, color: '#6B7280' },
  convBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  convPreview: { fontSize: 14, color: '#9CA3AF', flex: 1 },
  convPreviewUnread: { color: '#D1D5DB', fontWeight: '500' },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
});
