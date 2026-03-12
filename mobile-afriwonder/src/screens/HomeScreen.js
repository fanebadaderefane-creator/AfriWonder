import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import * as SecureStore from 'expo-secure-store';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { TabContext } from '../context/TabContext';
import VideoCard from '../components/VideoCard';
import AdCard from '../components/AdCard';
import AdBannerCard from '../components/AdBannerCard';
import TipModal from '../components/TipModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// Hauteur barre d'onglets (alignée MainTabs) pour calculer la zone visible
const TAB_BAR_BASE = 56 + 8 + (Platform.OS === 'ios' ? 24 : 8);
const MIN_BOTTOM_INSET = Platform.OS === 'web' ? 32 : 0;

const ACTIVE_TAB_POURTOI = 'pourtoi';
const ACTIVE_TAB_ABONNEMENTS = 'abonnements';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { setActiveTab } = React.useContext(TabContext) || {};
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, MIN_BOTTOM_INSET);
  const tabBarHeight = TAB_BAR_BASE + bottomPadding;
  // Hauteur d'un item de feed : pleine hauteur visible au‑dessus de la barre d'onglets
  const feedItemHeight = SCREEN_HEIGHT - tabBarHeight;

  const [activeTab, setFeedTab] = useState(ACTIVE_TAB_POURTOI);
  const [feedItems, setFeedItems] = useState([]);
  const [allVideos, setAllVideos] = useState([]);
  const [userFollows, setUserFollows] = useState([]);
  const [likedVideos, setLikedVideos] = useState(new Set());
  const [savedVideos, setSavedVideos] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [hiddenAdIds, setHiddenAdIds] = useState([]);
  const [firstItemVisible, setFirstItemVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipVideo, setTipVideo] = useState(null);

  const likeScrollLockUntilRef = useRef(0);

  useEffect(() => {
    SecureStore.getItemAsync('afw_hidden_ads').then((raw) => {
      try {
        const arr = raw ? JSON.parse(raw) : [];
        setHiddenAdIds(Array.isArray(arr) ? arr : []);
      } catch (_) {
        setHiddenAdIds([]);
      }
    });
  }, []);

  const feedItemsFiltered = React.useMemo(() => {
    if (hiddenAdIds.length === 0) return feedItems;
    return feedItems.filter(
      (item) =>
        (item.type !== 'ad' && item.type !== 'top_banner') ||
        !hiddenAdIds.includes(item.ad?.campaign_id)
    );
  }, [feedItems, hiddenAdIds]);

  const topBannerItems = React.useMemo(
    () => feedItemsFiltered.filter((i) => i.type === 'top_banner'),
    [feedItemsFiltered]
  );
  const mainFeedItems = React.useMemo(
    () => feedItemsFiltered.filter((i) => i.type !== 'top_banner'),
    [feedItemsFiltered]
  );

  const handleHideAd = useCallback((campaignId) => {
    setHiddenAdIds((prev) => {
      if (prev.includes(campaignId)) return prev;
      const next = [...prev, campaignId];
      SecureStore.setItemAsync('afw_hidden_ads', JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const feedVideos = mainFeedItems
    .filter((i) => i.type === 'video' && i.video)
    .map((i) => i.video);

  const followingIds = userFollows.map((u) => u.id);
  const followingVideos = allVideos.filter((v) => followingIds.includes(v.creator_id));

  const listData = React.useMemo(() => {
    if (activeTab === ACTIVE_TAB_ABONNEMENTS) {
      return followingVideos.map((v) => ({ type: 'video', id: v.id, video: v }));
    }
    return mainFeedItems.map((item) => {
      if (item.type === 'ad' && item.ad) {
        return { type: 'ad', id: `ad-${item.ad.campaign_id}`, ad: item.ad };
      }
      return { type: 'video', id: item.video?.id, video: item.video };
    }).filter((i) => i.id);
  }, [activeTab, mainFeedItems, followingVideos]);

  const loadFeed = useCallback(async () => {
    setError(null);
    try {
      const res = await api.feed.list({ page: 1, limit: 25 }, { timeout: 12000 });
      let items = res?.items ?? [];
      if (!Array.isArray(items)) items = [];
      // Normaliser : si un item est une vidéo brute (sans .video), l'envelopper
      items = items.map((item, index) => {
        if (item && (item.type === 'video' || item.type === 'ad' || item.type === 'top_banner')) return item;
        if (item && (item.video_url || item.videoUrl || item.id)) {
          return { type: 'video', index, video: item };
        }
        return item;
      });
      setFeedItems(items);
      const first = items.find((i) => i.type === 'video' && i.video) || items.find((i) => i.type === 'ad' && i.ad);
      if (first?.type === 'video' && first?.video?.id) setActiveId(first.video.id);
      else if (first?.type === 'ad' && first?.ad?.campaign_id) setActiveId(`ad-${first.ad.campaign_id}`);
    } catch (e) {
      const isNetwork = e?.code === 'ERR_NETWORK' || e?.message === 'Network Error';
      const isTimeout = e?.code === 'ECONNABORTED' || e?.message?.includes('timeout');
      if (__DEV__) console.warn('Feed load error', e?.message || e);
      setError(
        isNetwork || isTimeout
          ? 'Impossible de joindre le serveur. Vérifiez le Wi‑Fi, que le backend tourne sur le PC (même réseau) et EXPO_PUBLIC_API_URL dans .env.'
          : (e?.apiMessage || e?.message || 'Impossible de charger le feed.')
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadVideos = useCallback(async () => {
    try {
      const res = await api.videos.list({ page: 1, limit: 25 });
      const videos = res?.videos ?? (Array.isArray(res) ? res : []);
      setAllVideos(videos);
    } catch (_) {
      setAllVideos([]);
    }
  }, []);

  const loadUserFollows = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.users.getFollowing(user.id);
      const list = res?.following ?? (Array.isArray(res) ? res : []);
      setUserFollows(list);
    } catch (_) {
      setUserFollows([]);
    }
  }, [user?.id]);

  const loadLikedAndSaved = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [likedRes, savesRes] = await Promise.all([
        api.users.getLikedVideos(user.id, { limit: 0 }),
        api.saves.list().catch(() => ({ videos: [] })),
      ]);
      const likedIds = new Set((Array.isArray(likedRes) ? likedRes : []).map((v) => v.id));
      const savedIds = new Set((savesRes?.videos ?? []).map((v) => v.id));
      setLikedVideos(likedIds);
      setSavedVideos(savedIds);
    } catch (_) {}
  }, [user?.id]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await Promise.all([
        loadFeed(),
        loadVideos(),
        loadUserFollows(),
        loadLikedAndSaved(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [loadFeed, loadVideos, loadUserFollows, loadLikedAndSaved]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    if (user?.id) {
      loadUserFollows();
      loadLikedAndSaved();
    }
  }, [user?.id, loadUserFollows, loadLikedAndSaved]);

  useEffect(() => {
    if (activeTab === ACTIVE_TAB_ABONNEMENTS) {
      setLoadingFollowing(true);
      Promise.all([loadVideos(), loadUserFollows()]).finally(() =>
        setLoadingFollowing(false)
      );
    }
  }, [activeTab, loadVideos, loadUserFollows]);

  useEffect(() => {
    if (listData.length > 0) {
      const ids = listData.map((i) => i.id);
      if (!activeId || !ids.includes(activeId)) setActiveId(listData[0].id);
    }
  }, [listData, activeId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshAll();
  }, [refreshAll]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (!viewableItems?.length) return;
    const first = viewableItems[0];
    if (typeof first.index === 'number') {
      setCurrentIndex(first.index);
    }
    if (first?.item?.id) setActiveId(first.item.id);
    setFirstItemVisible(viewableItems.some((v) => v.index === 0));
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  const handleLike = useCallback((video) => {
    if (!video?.id) return;
    likeScrollLockUntilRef.current = Date.now() + 400;
    api.videos
      .like(video.id)
      .then((res) => {
        const newLiked = res?.liked ?? !likedVideos.has(video.id);
        setLikedVideos((prev) => {
          const next = new Set(prev);
          if (newLiked) next.add(video.id);
          else next.delete(video.id);
          return next;
        });
      })
      .catch(() => {});
  }, [likedVideos]);

  const handleSave = useCallback((video) => {
    if (!video?.id) return;
    api.saves
      .toggle(video.id)
      .then(() => {
        setSavedVideos((prev) => {
          const next = new Set(prev);
          if (next.has(video.id)) next.delete(video.id);
          else next.add(video.id);
          return next;
        });
      })
      .catch(() => {});
  }, []);

  const handleToggleWonder = useCallback(
    async (creatorId) => {
      if (!user?.id) return;
      try {
        await api.users.toggleWonder(creatorId);
        await loadUserFollows();
      } catch (_) {}
    },
    [user?.id, loadUserFollows]
  );

  const handleProfileClick = useCallback(
    (creatorId) => {
      if (creatorId) navigation.navigate('ProfileUser', { userId: creatorId });
    },
    [navigation]
  );

  const isLoading = loading && !refreshing;
  const showEmptyPourtoi = activeTab === ACTIVE_TAB_POURTOI && listData.length === 0 && !isLoading;
  const showEmptyAbonnements =
    activeTab === ACTIVE_TAB_ABONNEMENTS &&
    followingVideos.length === 0 &&
    !loadingFollowing &&
    !isLoading;

  const showTopBanner =
    activeTab === ACTIVE_TAB_POURTOI &&
    firstItemVisible &&
    topBannerItems.length > 0;

  if (isLoading && listData.length === 0) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Chargement du fil…</Text>
      </SafeAreaView>
    );
  }

  if (error && listData.length === 0) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refreshAll}>
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('../../assets/icon.png')} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerLogoText}>AfriWonder</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIcon}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Search')}
            accessibilityLabel="Recherche"
          >
            <Ionicons name="search-outline" size={20} color="#F9FAFB" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIcon}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Notifications')}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={20} color="#F9FAFB" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIcon}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('MenuPlus')}
            accessibilityLabel="Ouvrir le menu"
          >
            <Ionicons name="menu" size={20} color="#F9FAFB" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => (typeof setActiveTab === 'function' ? setActiveTab('profile') : navigation.navigate('Profile'))}
            style={styles.profileButton}
          >
            {user?.profile_image || user?.avatar ? (
              <Image source={{ uri: user.profile_image || user.avatar }} style={styles.profileAvatar} />
            ) : (
              <Text style={styles.profileInitials}>
                {user?.first_name?.[0]?.toUpperCase() ||
                  user?.full_name?.[0]?.toUpperCase() ||
                  user?.email?.[0]?.toUpperCase() ||
                  '?'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.8}
          onPress={() => setFeedTab(ACTIVE_TAB_POURTOI)}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === ACTIVE_TAB_POURTOI && styles.tabLabelActive,
            ]}
          >
            Pour toi
          </Text>
          {activeTab === ACTIVE_TAB_POURTOI && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.8}
          onPress={() => setFeedTab(ACTIVE_TAB_ABONNEMENTS)}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === ACTIVE_TAB_ABONNEMENTS && styles.tabLabelActive,
            ]}
          >
            Mon Wonder
          </Text>
          {userFollows.length > 0 && activeTab === ACTIVE_TAB_ABONNEMENTS && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{userFollows.length}</Text>
            </View>
          )}
          {activeTab === ACTIVE_TAB_ABONNEMENTS && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {showEmptyPourtoi && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Aucune vidéo pour l'instant</Text>
          <Text style={styles.emptySubtitle}>Soyez le premier à partager !</Text>
          {!user ? (
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('Auth')}
            >
              <Text style={styles.emptyButtonText}>S'inscrire pour commencer</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('Create')}
            >
              <Text style={styles.emptyButtonText}>Créer votre première vidéo</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {activeTab === ACTIVE_TAB_ABONNEMENTS && loadingFollowing && listData.length === 0 && (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Chargement de Mon Wonder…</Text>
        </View>
      )}

      {showEmptyAbonnements && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Aucune vidéo de vos abonnements</Text>
          <Text style={styles.emptySubtitle}>Suivez des créateurs pour voir leurs vidéos ici</Text>
          {!user && (
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('Auth')}
            >
              <Text style={styles.emptyButtonText}>S'inscrire pour commencer</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {activeTab === ACTIVE_TAB_ABONNEMENTS && userFollows.length > 0 && (
        <View style={styles.wonderPanel}>
          <View style={styles.wonderPanelHeader}>
            <Text style={styles.wonderPanelTitle}>Ton Wonder ({userFollows.length})</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Search')}>
              <Text style={styles.wonderPanelLink}>Tout voir</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wonderAvatars}>
            {userFollows.slice(0, 12).map((creator) => (
              <TouchableOpacity
                key={creator.id}
                onPress={() => navigation.navigate('ProfileUser', { userId: creator.id })}
                style={styles.wonderAvatarWrap}
              >
                {creator.profile_image || creator.avatar ? (
                  <Image source={{ uri: creator.profile_image || creator.avatar }} style={styles.wonderAvatar} />
                ) : (
                  <View style={[styles.wonderAvatar, styles.wonderAvatarPlaceholder]}>
                    <Text style={styles.wonderAvatarLetter}>
                      {(creator.full_name || creator.username || '?')[0].toUpperCase()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {showTopBanner && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.bannerScroll}
          contentContainerStyle={styles.bannerScrollContent}
        >
          {topBannerItems.map((item, i) => (
            <View key={`top-${item.ad?.campaign_id ?? i}`} style={styles.bannerWrap}>
              <AdBannerCard
                ad={item.ad}
                isActive={true}
                onHide={handleHideAd}
              />
            </View>
          ))}
        </ScrollView>
      )}

      {!showEmptyPourtoi && !showEmptyAbonnements && !(activeTab === ACTIVE_TAB_ABONNEMENTS && loadingFollowing && listData.length === 0) && (
        <FlatList
          data={listData}
          keyExtractor={(item, index) => `${item.type ?? 'video'}-${String(item.id)}-${index}`}
          key={activeTab}
          renderItem={({ item, index }) => {
            const isNeighbor = Math.abs(index - currentIndex) <= 1;

            if (!isNeighbor) {
              return <View style={[styles.slideWrap, { height: feedItemHeight }]} />;
            }

            if (item.type === 'ad') {
              return (
                <View style={[styles.slideWrap, { height: feedItemHeight }]}>
                  <AdCard
                    ad={item.ad}
                    containerHeight={feedItemHeight}
                    isActive={item.id === activeId}
                    isMuted={isMuted}
                    onMuteToggle={() => setIsMuted((m) => !m)}
                    onHide={handleHideAd}
                  />
                </View>
              );
            }
            return (
              <View style={[styles.slideWrap, { height: feedItemHeight }]}>
                <VideoCard
                  key={item.video?.id ?? item.id}
                  cardHeight={feedItemHeight}
                  video={item.video}
                  isActive={item.id === activeId}
                  isLiked={likedVideos.has(item.id)}
                  isSaved={savedVideos.has(item.id)}
                  onLike={handleLike}
                  onSave={handleSave}
                  onCommentsPress={(video) =>
                    navigation.navigate('Comments', {
                      videoId: video.id,
                      title: video.title,
                    })
                  }
                  onSharePress={(video) =>
                    navigation.navigate('Share', { video })
                  }
                  onSupportPress={(video) => {
                    setTipVideo(video);
                    setShowTipModal(true);
                  }}
                  onProfileClick={handleProfileClick}
                  onSubscribe={handleToggleWonder}
                  isFollowing={followingIds.includes(item.video?.creator_id)}
                />
              </View>
            );
          }}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          pagingEnabled
          removeClippedSubviews
          windowSize={5}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          updateCellsBatchingPeriod={50}
          snapToAlignment="start"
          snapToInterval={feedItemHeight}
          getItemLayout={(_, index) => ({
            length: feedItemHeight,
            offset: feedItemHeight * index,
            index,
          })}
          decelerationRate="fast"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#2563eb']}
            />
          }
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />
      )}

      <TipModal
        visible={showTipModal}
        onClose={() => {
          setShowTipModal(false);
          setTipVideo(null);
        }}
        videoId={tipVideo?.id}
        creator={{
          name: tipVideo?.creator_name || tipVideo?.creator?.username,
          avatar: tipVideo?.creator_avatar || tipVideo?.creator?.avatar,
        }}
        walletBalance={0}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#020617',
    paddingHorizontal: 24,
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerLogoText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#374151',
    overflow: 'hidden',
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  profileInitials: {
    color: '#F9FAFB',
    fontWeight: '600',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 4,
    gap: 24,
  },
  tabItem: {
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  tabLabelActive: {
    color: '#F9FAFB',
    fontWeight: '600',
  },
  tabIndicator: {
    marginTop: 2,
    height: 2,
    width: 48,
    borderRadius: 999,
    backgroundColor: '#2563eb',
  },
  tabBadge: {
    marginLeft: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  tabBadgeText: {
    fontSize: 11,
    color: '#F9FAFB',
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  bannerScroll: { maxHeight: 130 },
  bannerScrollContent: { paddingHorizontal: 0, paddingBottom: 8 },
  bannerWrap: { width: 280, marginRight: 8 },
  slideWrap: {},
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#2563eb',
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  error: {
    color: '#F97373',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#2563eb',
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  wonderPanel: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 4,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  wonderPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  wonderPanelTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  wonderPanelLink: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  wonderAvatars: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 8,
  },
  wonderAvatarWrap: {
    marginRight: 4,
  },
  wonderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  wonderAvatarPlaceholder: {
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wonderAvatarLetter: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F9FAFB',
  },
});
