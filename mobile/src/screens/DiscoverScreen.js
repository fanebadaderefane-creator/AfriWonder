/**
 * DiscoverScreen — Découvrir (parité PWA Discover.jsx)
 * Onglets Explorer / Pour vous / Créateurs. Catégories, vidéos virales, tendances, créateurs avec Wonder.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
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
import RecommendationEngine from '../services/RecommendationEngine';

const PAD = 16;
const GAP = 6;
const NUM_COLUMNS = 3;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - PAD * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
const CARD_ASPECT = 9 / 16;

const CATEGORIES = [
  { id: 'trending', label: 'Tendances', icon: 'flame' },
  { id: 'musique', label: 'Musique', icon: 'musical-notes' },
  { id: 'danse', label: 'Danse', icon: 'musical-notes' },
  { id: 'cuisine', label: 'Cuisine', icon: 'restaurant' },
  { id: 'mode', label: 'Mode', icon: 'shirt' },
  { id: 'business', label: 'Business', icon: 'briefcase' },
  { id: 'humour', label: 'Humour', icon: 'happy' },
  { id: 'sport', label: 'Sport', icon: 'barbell' },
  { id: 'education', label: 'Education', icon: 'school' },
];

const TRENDING_HASHTAGS = [
  { tag: 'AfricanVibes', count: '2.5M', trending: true },
  { tag: 'DakarLife', count: '1.2M' },
  { tag: 'AfroBeats', count: '980K', trending: true },
  { tag: 'MadeInAfrica', count: '750K' },
  { tag: 'AfricanFood', count: '620K' },
];

function formatCount(n) {
  if (n == null || n === 0) return '0';
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
}

export default function DiscoverScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('explore');
  const [selectedCategory, setSelectedCategory] = useState('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [trendingVideos, setTrendingVideos] = useState([]);
  const [categoryVideos, setCategoryVideos] = useState([]);
  const [viralVideos, setViralVideos] = useState([]);
  const [trendingCreators, setTrendingCreators] = useState([]);
  const [recommendedVideos, setRecommendedVideos] = useState([]);
  const [creatorRecommendations, setCreatorRecommendations] = useState([]);
  const [courseRecommendations, setCourseRecommendations] = useState([]);
  const [eventRecommendations, setEventRecommendations] = useState([]);
  const [userFollows, setUserFollows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wonderLoadingId, setWonderLoadingId] = useState(null);

  const followingIds = useMemo(() => new Set(userFollows.map((u) => u.id)), [userFollows]);

  const loadTrending = useCallback(async () => {
    try {
      const res = await api.videos.list({ page: 1, limit: 20 });
      const list = res?.videos ?? (Array.isArray(res) ? res : []);
      setTrendingVideos(list);
    } catch {
      setTrendingVideos([]);
    }
  }, []);

  const loadCategoryVideos = useCallback(async () => {
    if (!selectedCategory || selectedCategory === 'trending') return;
    try {
      const res = await api.videos.list({ category: selectedCategory, page: 1, limit: 20 });
      const list = res?.videos ?? (Array.isArray(res) ? res : []);
      setCategoryVideos(list);
    } catch {
      setCategoryVideos([]);
    }
  }, [selectedCategory]);

  const loadViral = useCallback(async () => {
    try {
      const res = await api.videos.list({ page: 1, limit: 50 });
      const list = res?.videos ?? (Array.isArray(res) ? res : []);
      const withEngagement = list
        .filter((v) => (v.views ?? v.views_count ?? 0) > 500)
        .map((v) => ({
          ...v,
          engagementRate:
            (v.views ?? v.views_count ?? 0) > 0
              ? ((v.likes ?? v.likes_count ?? 0) + (v.comments_count ?? 0)) / (v.views ?? v.views_count ?? 1)
              : 0,
        }))
        .sort((a, b) => b.engagementRate - a.engagementRate)
        .slice(0, 12);
      setViralVideos(withEngagement);
    } catch {
      setViralVideos([]);
    }
  }, []);

  const loadTrendingCreators = useCallback(async () => {
    try {
      const res = await api.videos.list({ page: 1, limit: 30 });
      const list = res?.videos ?? (Array.isArray(res) ? res : []);
      const byCreator = {};
      list.forEach((v) => {
        const cid = v.creator_id || v.creator?.id;
        if (!cid) return;
        if (!byCreator[cid]) {
          byCreator[cid] = {
            id: cid,
            name: v.creator_name || v.creator?.username || 'Créateur',
            avatar: v.creator?.profile_image || v.creator_avatar,
            totalViews: 0,
            videoCount: 0,
          };
        }
        byCreator[cid].totalViews += v.views ?? v.views_count ?? 0;
        byCreator[cid].videoCount += 1;
      });
      const creators = Object.values(byCreator)
        .sort((a, b) => b.totalViews - a.totalViews)
        .slice(0, 10);
      setTrendingCreators(creators);
    } catch {
      setTrendingCreators([]);
    }
  }, []);

  const loadRecommended = useCallback(async () => {
    if (!user?.id) return;
    try {
      const list = await RecommendationEngine.getPersonalizedFeed(user.id, 20);
      setRecommendedVideos(Array.isArray(list) ? list : []);
    } catch {
      setRecommendedVideos([]);
    }
  }, [user?.id]);

  const loadCreatorRecommendations = useCallback(async () => {
    if (!user?.id) return;
    try {
      const list = await RecommendationEngine.getCreatorRecommendations(user.id, 10);
      setCreatorRecommendations(Array.isArray(list) ? list : []);
    } catch {
      setCreatorRecommendations([]);
    }
  }, [user?.id]);

  const loadCourseRecommendations = useCallback(async () => {
    if (!user?.id) return;
    try {
      const list = await RecommendationEngine.getCourseRecommendations(user.id, 10);
      setCourseRecommendations(Array.isArray(list) ? list : []);
    } catch {
      setCourseRecommendations([]);
    }
  }, [user?.id]);

  const loadEventRecommendations = useCallback(async () => {
    if (!user?.id) return;
    try {
      const list = await RecommendationEngine.getEventRecommendations(user.id, 10);
      setEventRecommendations(Array.isArray(list) ? list : []);
    } catch {
      setEventRecommendations([]);
    }
  }, [user?.id]);

  const loadUserFollows = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.users.getFollowing(user.id);
      const list = res?.following ?? (Array.isArray(res) ? res : []);
      setUserFollows(list);
    } catch {
      setUserFollows([]);
    }
  }, [user?.id]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadTrending(),
      loadViral(),
      loadTrendingCreators(),
      loadUserFollows(),
    ]);
    if (selectedCategory && selectedCategory !== 'trending') await loadCategoryVideos();
    if (user?.id) {
      await loadRecommended();
      await loadCreatorRecommendations();
      await loadCourseRecommendations();
      await loadEventRecommendations();
    }
    setRefreshing(false);
  }, [loadTrending, loadViral, loadTrendingCreators, loadUserFollows, loadCategoryVideos, loadRecommended, loadCreatorRecommendations, loadCourseRecommendations, loadEventRecommendations, selectedCategory, user?.id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([loadTrending(), loadViral(), loadTrendingCreators(), loadUserFollows()])
      .then(() => {
        if (!cancelled && user?.id) {
          loadRecommended();
          loadCreatorRecommendations();
          loadCourseRecommendations();
          loadEventRecommendations();
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    if (selectedCategory && selectedCategory !== 'trending') loadCategoryVideos();
  }, [selectedCategory, loadCategoryVideos]);

  const handleWonder = useCallback(async (creatorId) => {
    if (!user?.id) return;
    setWonderLoadingId(creatorId);
    try {
      await api.users.toggleWonder(creatorId);
      await loadUserFollows();
    } catch (_) {}
    setWonderLoadingId(null);
  }, [user?.id, loadUserFollows]);

  const openSearch = useCallback(() => {
    navigation.navigate('Search');
  }, [navigation]);

  const categoryOrTrending = selectedCategory && selectedCategory !== 'trending' ? categoryVideos : trendingVideos;

  const renderVideoCard = (video, showViralBadge = false) => {
    const thumb = video.thumbnail_url || video.video_url;
    const views = video.views ?? video.views_count ?? 0;
    return (
      <TouchableOpacity
        key={video.id}
        style={[styles.videoCard, { width: CARD_WIDTH, height: CARD_WIDTH / CARD_ASPECT }]}
        onPress={() => navigation.navigate('VideoView', { videoId: video.id })}
      >
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.videoThumb} resizeMode="cover" />
        ) : (
          <View style={styles.videoPlaceholder}>
            <Ionicons name="videocam-outline" size={28} color="#4B5563" />
          </View>
        )}
        {showViralBadge && (
          <View style={styles.viralBadge}>
            <Text style={styles.viralBadgeText}>VIRAL</Text>
          </View>
        )}
        <View style={styles.videoViews}>
          <Text style={styles.videoViewsText}>{formatCount(views)} vues</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Découvrir</Text>
          <TouchableOpacity style={styles.searchBtn} onPress={openSearch}>
            <Ionicons name="search" size={22} color="#F9FAFB" />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Découvrir</Text>
        <TouchableOpacity style={styles.searchBtn} onPress={openSearch}>
          <Ionicons name="search" size={22} color="#F9FAFB" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher vidéos, créateurs..."
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={openSearch}
          editable={false}
        />
      </View>

      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'explore' && styles.tabActive]}
          onPress={() => setActiveTab('explore')}
        >
          <Text style={[styles.tabText, activeTab === 'explore' && styles.tabTextActive]}>Explorer</Text>
        </TouchableOpacity>
        {user && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'recommended' && styles.tabActive]}
            onPress={() => setActiveTab('recommended')}
          >
            <Text style={[styles.tabText, activeTab === 'recommended' && styles.tabTextActive]}>Pour vous</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'creators' && styles.tabActive]}
          onPress={() => setActiveTab('creators')}
        >
          <Text style={[styles.tabText, activeTab === 'creators' && styles.tabTextActive]}>Créateurs</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tint="#3B82F6" />}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'explore' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Ionicons name={cat.icon} size={24} color={selectedCategory === cat.id ? '#FFF' : '#9CA3AF'} />
                  <Text style={[styles.categoryLabel, selectedCategory === cat.id && styles.categoryLabelActive]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.sectionTitle}>Vidéos virales</Text>
            <View style={styles.videoGrid}>
              {viralVideos.slice(0, 6).map((v) => (
                <View key={v.id} style={styles.gridCell}>
                  {renderVideoCard(v, true)}
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Tendances</Text>
            <View style={styles.hashtagRow}>
              {TRENDING_HASHTAGS.map((h) => (
                <TouchableOpacity key={h.tag} style={styles.hashtagChip} onPress={openSearch}>
                  <Ionicons name="pricetag" size={14} color="#3B82F6" />
                  <Text style={styles.hashtagText}>{h.tag}</Text>
                  <Text style={styles.hashtagCount}>{h.count}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {selectedCategory !== 'trending' ? CATEGORIES.find((c) => c.id === selectedCategory)?.label : 'Vidéos populaires'}
              </Text>
              {selectedCategory !== 'trending' && (
                <TouchableOpacity onPress={() => setSelectedCategory('trending')}>
                  <Text style={styles.seeAll}>Tout voir</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.videoGrid}>
              {categoryOrTrending.map((v) => (
                <View key={v.id} style={styles.gridCell}>
                  {renderVideoCard(v, false)}
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Créateurs tendances</Text>
            {trendingCreators.slice(0, 5).map((creator, index) => {
              const isInWonder = followingIds.has(creator.id);
              return (
                <TouchableOpacity
                  key={creator.id}
                  style={styles.creatorRow}
                  onPress={() => navigation.navigate('ProfileUser', { userId: creator.id })}
                >
                  <View style={styles.creatorRankWrap}>
                    {creator.avatar ? (
                      <Image source={{ uri: creator.avatar }} style={styles.creatorAvatar} />
                    ) : (
                      <View style={[styles.creatorAvatar, styles.creatorAvatarPlh]}>
                        <Text style={styles.creatorAvatarLetter}>{creator.name?.[0]?.toUpperCase() || 'U'}</Text>
                      </View>
                    )}
                    <View style={styles.creatorRankBadge}>
                      <Text style={styles.creatorRankText}>#{index + 1}</Text>
                    </View>
                  </View>
                  <View style={styles.creatorInfo}>
                    <Text style={styles.creatorName}>{creator.name}</Text>
                    <Text style={styles.creatorStats}>
                      {formatCount(creator.totalViews)} vues • {creator.videoCount} vidéos
                    </Text>
                  </View>
                  {user && (
                    <TouchableOpacity
                      style={[styles.wonderBtn, isInWonder && styles.wonderBtnActive]}
                      onPress={() => handleWonder(creator.id)}
                      disabled={wonderLoadingId === creator.id}
                    >
                      {wonderLoadingId === creator.id ? (
                        <ActivityIndicator size="small" color={isInWonder ? '#6B7280' : '#FFF'} />
                      ) : (
                        <Text style={[styles.wonderBtnText, isInWonder && styles.wonderBtnTextActive]}>
                          {isInWonder ? 'Dans son Wonder' : 'Wonder'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {activeTab === 'recommended' && (
          <>
            <Text style={styles.sectionTitle}>Recommandations personnalisées</Text>
            <View style={styles.videoGrid}>
              {(recommendedVideos.length > 0 ? recommendedVideos : trendingVideos).map((v) => (
                <View key={v.id} style={styles.gridCell}>
                  {renderVideoCard(v, false)}
                </View>
              ))}
            </View>
            {creatorRecommendations.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Créateurs à découvrir</Text>
                {creatorRecommendations.map((c) => (
                  <TouchableOpacity
                    key={c.creator_id}
                    style={styles.creatorRow}
                    onPress={() => navigation.navigate('ProfileUser', { userId: c.creator_id })}
                  >
                    {c.avatar ? (
                      <Image source={{ uri: c.avatar }} style={styles.creatorAvatar} />
                    ) : (
                      <View style={[styles.creatorAvatar, styles.creatorAvatarPlh]}>
                        <Text style={styles.creatorAvatarLetter}>{c.name?.[0]?.toUpperCase() || '?'}</Text>
                      </View>
                    )}
                    <View style={styles.creatorInfo}>
                      <Text style={styles.creatorName}>{c.name || 'Créateur'}</Text>
                      <Text style={styles.creatorStats}>{c.videoCount || 0} vidéos</Text>
                    </View>
                    {user && (
                      <TouchableOpacity
                        style={styles.wonderBtn}
                        onPress={() => handleWonder(c.creator_id)}
                        disabled={wonderLoadingId === c.creator_id}
                      >
                        {wonderLoadingId === c.creator_id ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Text style={styles.wonderBtnText}>Wonder</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}
            {courseRecommendations.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Cours pour vous</Text>
                {courseRecommendations.slice(0, 5).map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.eventCourseCard}
                    onPress={() => {}}
                  >
                    <Text style={styles.eventCourseTitle} numberOfLines={1}>{c.title || c.name || 'Cours'}</Text>
                    {c.description ? (
                      <Text style={styles.eventCourseDesc} numberOfLines={2}>{c.description}</Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </>
            )}
            {eventRecommendations.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Événements à venir</Text>
                {eventRecommendations.slice(0, 5).map((e) => (
                  <TouchableOpacity
                    key={e.id}
                    style={styles.eventCourseCard}
                    onPress={() => {}}
                  >
                    <Text style={styles.eventCourseTitle} numberOfLines={1}>{e.title || e.name || 'Événement'}</Text>
                    <Text style={styles.eventCourseDesc}>
                      {new Date(e.start_date || e.startDate).toLocaleDateString('fr-FR')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </>
        )}

        {activeTab === 'creators' && (
          <>
            <Text style={styles.sectionTitle}>Créateurs</Text>
            {trendingCreators.map((creator, index) => {
              const isInWonder = followingIds.has(creator.id);
              return (
                <TouchableOpacity
                  key={creator.id}
                  style={styles.creatorRow}
                  onPress={() => navigation.navigate('ProfileUser', { userId: creator.id })}
                >
                  <View style={styles.creatorRankWrap}>
                    {creator.avatar ? (
                      <Image source={{ uri: creator.avatar }} style={styles.creatorAvatar} />
                    ) : (
                      <View style={[styles.creatorAvatar, styles.creatorAvatarPlh]}>
                        <Text style={styles.creatorAvatarLetter}>{creator.name?.[0]?.toUpperCase() || 'U'}</Text>
                      </View>
                    )}
                    <View style={styles.creatorRankBadge}>
                      <Text style={styles.creatorRankText}>#{index + 1}</Text>
                    </View>
                  </View>
                  <View style={styles.creatorInfo}>
                    <Text style={styles.creatorName}>{creator.name}</Text>
                    <Text style={styles.creatorStats}>
                      {formatCount(creator.totalViews)} vues • {creator.videoCount} vidéos
                    </Text>
                  </View>
                  {user && (
                    <TouchableOpacity
                      style={[styles.wonderBtn, isInWonder && styles.wonderBtnActive]}
                      onPress={() => handleWonder(creator.id)}
                      disabled={wonderLoadingId === creator.id}
                    >
                      {wonderLoadingId === creator.id ? (
                        <ActivityIndicator size="small" color={isInWonder ? '#6B7280' : '#FFF'} />
                      ) : (
                        <Text style={[styles.wonderBtnText, isInWonder && styles.wonderBtnTextActive]}>
                          {isInWonder ? 'Dans son Wonder' : 'Wonder'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PAD,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1F2937',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#F9FAFB' },
  searchBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: PAD,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#F9FAFB' },
  tabsRow: { flexDirection: 'row', paddingHorizontal: PAD, marginBottom: 12, gap: 16 },
  tab: { paddingVertical: 8 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#3B82F6' },
  tabText: { fontSize: 15, color: '#9CA3AF', fontWeight: '500' },
  tabTextActive: { color: '#3B82F6', fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  categoriesRow: { flexDirection: 'row', gap: 12, paddingHorizontal: PAD, marginBottom: 20 },
  categoryChip: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
  },
  categoryChipActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  categoryLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  categoryLabelActive: { color: '#FFF' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#F9FAFB', marginBottom: 12, paddingHorizontal: PAD },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: PAD, marginBottom: 12 },
  seeAll: { fontSize: 14, color: '#3B82F6', fontWeight: '500' },
  videoGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: PAD, gap: GAP, marginBottom: 24 },
  gridCell: { marginBottom: GAP },
  videoCard: { borderRadius: 8, overflow: 'hidden' },
  videoThumb: { ...StyleSheet.absoluteFillObject },
  videoPlaceholder: { ...StyleSheet.absoluteFillObject, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' },
  viralBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#3B82F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  viralBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  videoViews: { position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  videoViewsText: { fontSize: 10, color: '#FFF', fontWeight: '500' },
  hashtagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: PAD, marginBottom: 24 },
  hashtagChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#111827', borderRadius: 999, borderWidth: 1, borderColor: '#1F2937' },
  hashtagText: { fontSize: 14, fontWeight: '500', color: '#E5E7EB' },
  hashtagCount: { fontSize: 12, color: '#6B7280' },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PAD,
    paddingVertical: 12,
    marginBottom: 8,
    backgroundColor: '#111827',
    borderRadius: 12,
    marginHorizontal: PAD,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  creatorRankWrap: { position: 'relative' },
  creatorAvatar: { width: 48, height: 48, borderRadius: 24 },
  creatorAvatarPlh: { backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center' },
  creatorAvatarLetter: { fontSize: 18, fontWeight: '700', color: '#F9FAFB' },
  creatorRankBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#3B82F6', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 10 },
  creatorRankText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  creatorInfo: { flex: 1, marginLeft: 12 },
  creatorName: { fontSize: 16, fontWeight: '600', color: '#F9FAFB' },
  creatorStats: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  eventCourseCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  eventCourseTitle: { fontSize: 15, fontWeight: '600', color: '#F9FAFB' },
  eventCourseDesc: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  wonderBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#3B82F6' },
  wonderBtnActive: { backgroundColor: '#374151' },
  wonderBtnText: { fontSize: 12, fontWeight: '600', color: '#FFF' },
  wonderBtnTextActive: { color: '#9CA3AF' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottomSpacer: { height: 24 },
});
