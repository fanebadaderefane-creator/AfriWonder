import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { TabContext } from '../context/TabContext';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600';

export default function LivesScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { setActiveTab } = useContext(TabContext);
  const [listResult, setListResult] = useState([]);
  const [discoveryData, setDiscoveryData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [sortBy, setSortBy] = useState('viewers');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [liveForm, setLiveForm] = useState({
    title: '',
    description: '',
    scheduled_time: '',
  });
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [listRes, recRes] = await Promise.all([
        api.live.list({ page: 1, limit: 50, sortBy, ...(categoryFilter && { category: categoryFilter }) }),
        user?.id ? api.live.getRecommendations({ limit: 5 }).catch(() => []) : Promise.resolve([]),
      ]);
      setListResult(Array.isArray(listRes) ? listRes : listRes?.streams ?? []);
      setRecommendations(Array.isArray(recRes) ? recRes : recRes?.streams ?? recRes?.data?.streams ?? []);
    } catch (_) {
      setListResult([]);
      setRecommendations([]);
    }
    try {
      const [popular, trending, followed, categories] = await Promise.all([
        api.live.getDiscovery({ type: 'popular', limit: 10 }),
        api.live.getDiscovery({ type: 'trending', limit: 10 }),
        user?.id ? api.live.getDiscovery({ type: 'followed', limit: 10 }).catch(() => ({ streams: [] })) : Promise.resolve({ streams: [] }),
        api.live.getCategories().catch(() => ({ categories: [] })),
      ]);
      setDiscoveryData({
        popular: popular?.streams ?? popular?.data?.streams ?? [],
        trending: trending?.streams ?? trending?.data?.streams ?? [],
        followed: followed?.streams ?? followed?.data?.streams ?? [],
        categories: categories?.categories ?? categories ?? [],
      });
    } catch (_) {
      setDiscoveryData({ popular: [], trending: [], followed: [], categories: [] });
    }
  }, [user?.id, sortBy, categoryFilter]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData().finally(() => setRefreshing(false));
  }, [loadData]);

  const liveStreams = listResult;
  const popularStreams = discoveryData?.popular ?? [];
  const trendingStreams = discoveryData?.trending ?? [];
  const followedStreams = discoveryData?.followed ?? [];
  const categories = discoveryData?.categories ?? [];

  const q = (searchQuery || '').trim().toLowerCase();
  const matchSearch = (live) => {
    if (!q) return true;
    const title = (live.title || '').toLowerCase();
    const creator = (live.creator_name || live.creator?.username || '').toLowerCase();
    return title.includes(q) || creator.includes(q);
  };

  const activeLives = liveStreams.filter((l) => l.status === 'live' && matchSearch(l));
  const scheduledLives = liveStreams.filter((l) => l.status === 'scheduled' && matchSearch(l));
  const endedLivesWithReplay = liveStreams.filter((l) => l.status === 'ended' && l.replay_url && matchSearch(l));
  const popularFiltered = popularStreams.filter(matchSearch);
  const recommendationsFiltered = recommendations.filter(matchSearch);
  const followedFiltered = followedStreams.filter(matchSearch);
  const featuredStream = (popularFiltered.length > 0 ? popularFiltered[0] : activeLives[0]) || null;

  const sortLabels = { viewers: 'Spectateurs', recent: 'Récent', popularity: 'Populaire', duration: 'Durée' };

  const submitScheduledLive = useCallback(async () => {
    const title = (liveForm.title || '').trim();
    if (!title) {
      Alert.alert('Erreur', 'Indiquez un titre pour le live.');
      return;
    }
    setCreating(true);
    try {
      await api.live.start({
        title,
        description: (liveForm.description || '').trim(),
        category: 'general',
        status: 'scheduled',
        scheduled_at: liveForm.scheduled_time
          ? new Date(liveForm.scheduled_time).toISOString()
          : undefined,
      });
      await loadData();
      setShowCreateForm(false);
      setLiveForm({ title: '', description: '', scheduled_time: '' });
      Alert.alert('Succès', 'Live programmé avec succès.');
    } catch (err) {
      Alert.alert('Erreur', err?.apiMessage || err?.message || 'Impossible de programmer le live.');
    } finally {
      setCreating(false);
    }
  }, [liveForm, loadData]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => setActiveTab?.('home')} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={22} color="#F9FAFB" />
        </TouchableOpacity>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un live..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        {user && (
          <>
            <TouchableOpacity
              style={styles.goLiveBtn}
              onPress={() => navigation.navigate('StartLive')}
            >
              <Ionicons name="radio" size={18} color="#FFF" />
              <Text style={styles.goLiveText}>GO LIVE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.walletBtn} onPress={() => navigation.navigate('Wallet')}>
              <Ionicons name="wallet-outline" size={18} color="#60A5FA" />
            </TouchableOpacity>
          </>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} />}
        showsVerticalScrollIndicator={false}
      >
        {featuredStream && (
          <TouchableOpacity
            style={styles.featuredCard}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('LiveView', { id: featuredStream.id })}
          >
            <Image
              source={{ uri: featuredStream.thumbnail_url || PLACEHOLDER_IMAGE }}
              style={styles.featuredImage}
              resizeMode="cover"
            />
            <View style={styles.featuredOverlay} />
            <View style={styles.featuredBadges}>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>
              <View style={styles.viewersBadge}>
                <Ionicons name="eye" size={12} color="#FFF" />
                <Text style={styles.viewersBadgeText}>{featuredStream.viewers_count ?? 0}</Text>
              </View>
            </View>
            <View style={styles.featuredBottom}>
              <View style={styles.featuredCreator}>
                <View style={styles.featuredAvatar}>
                  <Text style={styles.featuredAvatarText}>
                    {(featuredStream.creator_name || featuredStream.creator?.username || '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.featuredCreatorName} numberOfLines={1}>
                    {featuredStream.creator_name || featuredStream.creator?.username || 'Créateur'}
                  </Text>
                  <Text style={styles.featuredTitle} numberOfLines={1}>{featuredStream.title}</Text>
                </View>
              </View>
              <View style={styles.watchBtn}>
                <Ionicons name="play" size={16} color="#FFF" />
                <Text style={styles.watchBtnText}>Regarder</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {popularFiltered.length > 0 && (
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy" size={20} color="#FBBF24" />
            <View>
              <Text style={styles.sectionTitle}>Classement Top Créateurs</Text>
              <Text style={styles.sectionSubtitle}>Découvrez les meilleurs de la semaine</Text>
            </View>
          </View>
        )}

        {categories.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll} contentContainerStyle={styles.categoriesScrollContent}>
            <TouchableOpacity
              style={[styles.categoryChip, !categoryFilter && styles.categoryChipActive]}
              onPress={() => setCategoryFilter('')}
            >
              <Text style={[styles.categoryChipText, !categoryFilter && styles.categoryChipTextActive]}>Tout</Text>
            </TouchableOpacity>
            {categories.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.categoryChip, categoryFilter === c.id && styles.categoryChipActive]}
                onPress={() => setCategoryFilter(categoryFilter === c.id ? '' : c.id)}
              >
                <Text style={[styles.categoryChipText, categoryFilter === c.id && styles.categoryChipTextActive]}>{c.icon} {c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Trier:</Text>
          {['viewers', 'recent', 'popularity', 'duration'].map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.sortChip, sortBy === s && styles.sortChipActive]}
              onPress={() => setSortBy(s)}
            >
              <Text style={[styles.sortChipText, sortBy === s && styles.sortChipTextActive]}>{sortLabels[s]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {user && (
          <TouchableOpacity
            style={styles.scheduleLiveBtn}
            onPress={() => setShowCreateForm((v) => !v)}
          >
            <Ionicons name="calendar-outline" size={18} color="#FFF" />
            <Text style={styles.scheduleLiveBtnText}>
              {showCreateForm ? 'Masquer le formulaire' : 'Programmer un live'}
            </Text>
          </TouchableOpacity>
        )}

        {showCreateForm && user && (
          <View style={styles.createForm}>
            <Text style={styles.createFormTitle}>Programmer un live</Text>
            <TextInput
              style={styles.createFormInput}
              placeholder="Titre du live"
              placeholderTextColor="#6B7280"
              value={liveForm.title}
              onChangeText={(t) => setLiveForm((f) => ({ ...f, title: t }))}
            />
            <TextInput
              style={[styles.createFormInput, styles.createFormTextArea]}
              placeholder="Description"
              placeholderTextColor="#6B7280"
              value={liveForm.description}
              onChangeText={(t) => setLiveForm((f) => ({ ...f, description: t }))}
              multiline
              numberOfLines={3}
            />
            <TextInput
              style={styles.createFormInput}
              placeholder="Date et heure (ex. 2025-03-15 14:00)"
              placeholderTextColor="#6B7280"
              value={liveForm.scheduled_time}
              onChangeText={(t) => setLiveForm((f) => ({ ...f, scheduled_time: t }))}
            />
            <View style={styles.createFormActions}>
              <TouchableOpacity
                style={styles.createFormBtnCancel}
                onPress={() => setShowCreateForm(false)}
              >
                <Text style={styles.createFormBtnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createFormBtnSubmit}
                onPress={submitScheduledLive}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.createFormBtnSubmitText}>Programmer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {recommendationsFiltered.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommandé pour vous</Text>
            {recommendationsFiltered.map((live) => (
              <TouchableOpacity
                key={live.id}
                style={styles.liveCard}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('LiveView', { id: live.id })}
              >
                <View style={styles.liveCardThumb}>
                  <Image source={{ uri: live.thumbnail_url || PLACEHOLDER_IMAGE }} style={styles.liveCardImage} resizeMode="cover" />
                  <View style={styles.liveCardLiveBadge}>
                    <Ionicons name="radio" size={12} color="#FFF" />
                    <Text style={styles.liveCardLiveBadgeText}>LIVE</Text>
                  </View>
                  <View style={styles.liveCardViewers}>
                    <Ionicons name="eye" size={12} color="#FFF" />
                    <Text style={styles.liveCardViewersText}>{live.viewers_count || 0}</Text>
                  </View>
                </View>
                <View style={styles.liveCardBody}>
                  <Text style={styles.liveCardTitle} numberOfLines={1}>{live.title}</Text>
                  <Text style={styles.liveCardCreator}>{live.creator?.username || live.creator_name || 'Créateur'}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {followedFiltered.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Suivis en direct</Text>
            {followedFiltered.map((live) => (
              <TouchableOpacity key={live.id} style={styles.liveCard} activeOpacity={0.9} onPress={() => navigation.navigate('LiveView', { id: live.id })}>
                <View style={styles.liveCardThumb}>
                  <Image source={{ uri: live.thumbnail_url || PLACEHOLDER_IMAGE }} style={styles.liveCardImage} resizeMode="cover" />
                  <View style={styles.liveCardLiveBadge}>
                    <Ionicons name="radio" size={12} color="#FFF" />
                    <Text style={styles.liveCardLiveBadgeText}>LIVE</Text>
                  </View>
                  <View style={styles.liveCardViewers}>
                    <Ionicons name="eye" size={12} color="#FFF" />
                    <Text style={styles.liveCardViewersText}>{live.viewers_count}</Text>
                  </View>
                </View>
                <View style={styles.liveCardBody}>
                  <Text style={styles.liveCardTitle} numberOfLines={1}>{live.title}</Text>
                  <Text style={styles.liveCardCreator}>{live.creator_name}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {(popularFiltered.length > 0 || activeLives.length > 0) && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="radio" size={18} color="#60A5FA" />
              <Text style={styles.sectionTitleInRow}>En direct</Text>
            </View>
            {(popularFiltered.length > 0 ? popularFiltered : activeLives).map((live) => (
              <TouchableOpacity key={live.id} style={styles.liveCard} activeOpacity={0.9} onPress={() => navigation.navigate('LiveView', { id: live.id })}>
                <View style={styles.liveCardThumb}>
                  <Image source={{ uri: live.thumbnail_url || PLACEHOLDER_IMAGE }} style={styles.liveCardImage} resizeMode="cover" />
                  <View style={styles.liveCardLiveBadge}>
                    <Ionicons name="radio" size={12} color="#FFF" />
                    <Text style={styles.liveCardLiveBadgeText}>LIVE</Text>
                  </View>
                  <View style={styles.liveCardViewers}>
                    <Ionicons name="eye" size={12} color="#FFF" />
                    <Text style={styles.liveCardViewersText}>{live.viewers_count}</Text>
                  </View>
                </View>
                <View style={styles.liveCardBody}>
                  <Text style={styles.liveCardTitle} numberOfLines={1}>{live.title}</Text>
                  <Text style={styles.liveCardCreator}>{live.creator_name}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {scheduledLives.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="calendar-outline" size={18} color="#60A5FA" />
              <Text style={styles.sectionTitleInRow}>Lives programmés</Text>
            </View>
            {scheduledLives.map((live) => (
              <View key={live.id} style={styles.scheduledCard}>
                <View style={styles.scheduledAvatar}>
                  <Text style={styles.scheduledAvatarText}>{live.creator_name?.[0]?.toUpperCase()}</Text>
                </View>
                <View style={styles.scheduledBody}>
                  <Text style={styles.scheduledTitle}>{live.title}</Text>
                  <Text style={styles.scheduledCreator}>{live.creator_name}</Text>
                  <Text style={styles.scheduledTime}>
                    {new Date(live.scheduled_at || live.started_at).toLocaleString('fr-FR')}
                  </Text>
                </View>
                {user?.id === live.creator_id && (
                  <TouchableOpacity
                    style={styles.startScheduledBtn}
                    onPress={async () => {
                      try {
                        await api.live.startScheduled(live.id);
                        navigation.navigate('LiveStream', { id: live.id });
                      } catch (_) {}
                    }}
                  >
                    <Ionicons name="radio" size={14} color="#FFF" />
                    <Text style={styles.startScheduledBtnText}>Démarrer</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {endedLivesWithReplay.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="play-circle-outline" size={18} color="#9CA3AF" />
              <Text style={styles.sectionTitleInRow}>Replays</Text>
            </View>
            {endedLivesWithReplay.map((live) => (
              <TouchableOpacity key={live.id} style={styles.liveCard} activeOpacity={0.9} onPress={() => navigation.navigate('LiveView', { id: live.id })}>
                <View style={[styles.liveCardThumb, styles.replayThumb]}>
                  <Image source={{ uri: live.thumbnail_url || PLACEHOLDER_IMAGE }} style={styles.liveCardImage} resizeMode="cover" />
                  <View style={styles.replayPlayIcon}>
                    <Ionicons name="play" size={28} color="#111827" />
                  </View>
                  <View style={styles.replayBadge}><Text style={styles.replayBadgeText}>Replay</Text></View>
                </View>
                <View style={styles.liveCardBody}>
                  <Text style={styles.liveCardTitle} numberOfLines={1}>{live.title}</Text>
                  <Text style={styles.liveCardCreator}>{live.creator_name}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeLives.length === 0 && scheduledLives.length === 0 && endedLivesWithReplay.length === 0 && popularFiltered.length === 0 && (
          <View style={styles.emptyWrap}>
            <Ionicons name="radio-outline" size={64} color="#4B5563" />
            <Text style={styles.emptyTitle}>Aucun live pour le moment</Text>
            <Text style={styles.emptySubtitle}>Soyez le premier à lancer un live !</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 999,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#F9FAFB' },
  goLiveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  goLiveText: { fontSize: 13, fontWeight: '600', color: '#FFF' },
  walletBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(96,165,250,0.5)', alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  featuredCard: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#1F2937', marginBottom: 20, aspectRatio: 16/9 },
  featuredImage: { width: '100%', height: '100%' },
  featuredOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  featuredBadges: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 8 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  liveBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  viewersBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  viewersBadgeText: { fontSize: 12, color: '#FFF' },
  featuredBottom: { position: 'absolute', bottom: 12, left: 12, right: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  featuredCreator: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featuredAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  featuredAvatarText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  featuredCreatorName: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  featuredTitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  watchBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2563EB', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  watchBtnText: { fontSize: 13, fontWeight: '600', color: '#FFF' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(59,130,246,0.15)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#F9FAFB', marginBottom: 12 },
  sectionTitleInRow: { fontSize: 16, fontWeight: '700', color: '#F9FAFB' },
  sectionSubtitle: { fontSize: 12, color: '#9CA3AF' },
  section: { marginBottom: 24 },
  categoriesScroll: { marginHorizontal: -16 },
  categoriesScrollContent: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 16 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151' },
  categoryChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  categoryChipText: { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
  categoryChipTextActive: { color: '#FFF' },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 16 },
  sortLabel: { fontSize: 14, color: '#9CA3AF', marginRight: 4 },
  sortChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151' },
  sortChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  sortChipText: { fontSize: 13, color: '#9CA3AF' },
  sortChipTextActive: { color: '#FFF' },
  scheduleLiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    marginBottom: 16,
  },
  scheduleLiveBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  createForm: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  createFormTitle: { fontSize: 16, fontWeight: '600', color: '#F9FAFB', marginBottom: 12 },
  createFormInput: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#F9FAFB',
    marginBottom: 10,
  },
  createFormTextArea: { minHeight: 80, textAlignVertical: 'top' },
  createFormActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  createFormBtnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#374151',
    alignItems: 'center',
  },
  createFormBtnCancelText: { fontSize: 14, color: '#F9FAFB' },
  createFormBtnSubmit: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  createFormBtnSubmitText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  liveCard: { backgroundColor: '#1F2937', borderRadius: 12, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: '#374151' },
  liveCardThumb: { aspectRatio: 16/9, backgroundColor: '#111827', position: 'relative' },
  liveCardImage: { width: '100%', height: '100%' },
  liveCardLiveBadge: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  liveCardLiveBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  liveCardViewers: { position: 'absolute', bottom: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6 },
  liveCardViewersText: { fontSize: 12, color: '#FFF' },
  liveCardBody: { padding: 12 },
  liveCardTitle: { fontSize: 15, fontWeight: '600', color: '#F9FAFB' },
  liveCardCreator: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  scheduledCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1F2937', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#374151' },
  scheduledAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  scheduledAvatarText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  scheduledBody: { flex: 1 },
  scheduledTitle: { fontSize: 15, fontWeight: '600', color: '#F9FAFB' },
  scheduledCreator: { fontSize: 13, color: '#9CA3AF' },
  scheduledTime: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  startScheduledBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  startScheduledBtnText: { fontSize: 12, fontWeight: '600', color: '#FFF' },
  replayThumb: {},
  replayPlayIcon: { position: 'absolute', top: '50%', left: '50%', marginTop: -28, marginLeft: -28, width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  replayBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: '#4B5563', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  replayBadgeText: { fontSize: 12, color: '#FFF', fontWeight: '500' },
  emptyWrap: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#F9FAFB', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 8 },
});
