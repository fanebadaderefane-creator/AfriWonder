/**
 * ProfileScreen — Mon profil (onglet Profil)
 * Réécriture RN depuis PWA Profile.jsx + ProfileHeader.jsx : header, onglets, grille vidéos, stats, actions.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../api/client';
import VideoGridThumbnail from '../components/VideoGridThumbnail';
import { useAuth } from '../context/AuthContext';

const LIMIT = 30;
const NUM_COLUMNS = 3;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAD = 12;
const GAP = 4;
const CARD_WIDTH = (SCREEN_WIDTH - PAD * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
const CARD_ASPECT = 9 / 16;

function formatCount(num) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num ?? 0);
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, logout } = useAuth();

  const [stats, setStats] = useState({ followers: 0, following: 0, wonderers: 0 });
  const [activeTab, setActiveTab] = useState('videos');
  const [allProfileVideos, setAllProfileVideos] = useState([]);
  const [savedVideos, setSavedVideos] = useState([]);
  const [likedVideos, setLikedVideos] = useState([]);
  const [videosPage, setVideosPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const publishedVideos = allProfileVideos.filter((v) => v.visibility !== 'prive');
  const draftVideos = allProfileVideos.filter((v) => v.visibility === 'prive');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await api.users.getStats(user.id);
      const st = data?.stats ?? data;
      setStats({
        followers: st?.followers ?? st?.followers_count ?? 0,
        following: st?.following ?? st?.following_count ?? 0,
        wonderers: st?.wonderers ?? st?.followers ?? 0,
      });
    } catch {
      try {
        const [followersRes, followingRes] = await Promise.all([
          api.users.getFollowers(user.id).catch(() => ({ followers: [] })),
          api.users.getFollowing(user.id).catch(() => ({ following: [] })),
        ]);
        const followers = Array.isArray(followersRes?.followers) ? followersRes.followers.length : 0;
        const following = Array.isArray(followingRes?.following) ? followingRes.following.length : 0;
        setStats({ followers, following, wonderers: followers });
      } catch {
        setStats({ followers: 0, following: 0, wonderers: 0 });
      }
    }
  }, [user?.id]);

  const loadVideos = useCallback(async (page = 1, append = false) => {
    if (!user?.id) return;
    if (page === 1 && !append) setLoading(true);
    if (page > 1) setLoadingMore(true);
    try {
      const result = await api.videos.list({
        creator_id: user.id,
        visibility: 'creator',
        page,
        limit: LIMIT,
      });
      const list = result?.videos ?? (Array.isArray(result) ? result : []);
      const filtered = list.filter((v) => (v.creator_id || v.creator?.id) === user.id);
      if (append) {
        setAllProfileVideos((prev) => (page === 1 ? filtered : [...prev, ...filtered]));
      } else {
        setAllProfileVideos(filtered);
      }
      const pagination = result?.pagination ?? {};
      setHasNextPage((pagination.page ?? page) < (pagination.totalPages ?? 1));
      setVideosPage(page);
    } catch {
      if (!append) setAllProfileVideos([]);
      setHasNextPage(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user?.id]);

  const loadSaved = useCallback(async () => {
    if (!user?.id) return;
    try {
      const result = await api.saves.list({ page: 1, limit: LIMIT });
      const list = result?.videos ?? [];
      setSavedVideos(Array.isArray(list) ? list : []);
    } catch {
      setSavedVideos([]);
    }
  }, [user?.id]);

  const loadLiked = useCallback(async () => {
    if (!user?.id) return;
    try {
      const list = await api.users.getLikedVideos(user.id, { limit: LIMIT });
      setLikedVideos(Array.isArray(list) ? list : []);
    } catch {
      setLikedVideos([]);
    }
  }, [user?.id]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadStats(),
      loadVideos(1, false),
      loadSaved(),
      loadLiked(),
    ]);
    setRefreshing(false);
  }, [loadStats, loadVideos, loadSaved, loadLiked]);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadStats();
    loadVideos(1, false);
    loadSaved();
    loadLiked();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchNextPage = useCallback(() => {
    if (loadingMore || !hasNextPage) return;
    loadVideos(videosPage + 1, true);
  }, [loadVideos, loadingMore, hasNextPage, videosPage]);

  const handleDeleteVideo = useCallback(
    (video) => {
      Alert.alert(
        'Supprimer la vidéo',
        `Supprimer « ${video.title || 'cette vidéo' } » ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: async () => {
              try {
                await api.videos.delete(video.id);
                await loadVideos(1, false);
                await loadStats();
              } catch (_e) {
                Alert.alert('Erreur', 'Impossible de supprimer la vidéo.');
              }
            },
          },
        ]
      );
    },
    [loadVideos, loadStats]
  );

  const displayName = user?.full_name || user?.first_name || user?.display_name || user?.email || 'Utilisateur';
  const username = user?.username || user?.email?.split('@')[0] || '';
  const totalLikes = publishedVideos.reduce((acc, v) => acc + (v.likes ?? v.likes_count ?? 0), 0);

  const tabs = [
    { id: 'videos', label: 'Vidéos', icon: 'grid-outline' },
    { id: 'brouillons', label: 'Brouillons', icon: 'document-text-outline' },
    { id: 'saved', label: 'Sauvegardées', icon: 'bookmark-outline' },
    { id: 'liked', label: "J'aime", icon: 'heart-outline' },
  ];

  const getVideosForTab = () => {
    switch (activeTab) {
      case 'videos':
        return publishedVideos;
      case 'brouillons':
        return draftVideos;
      case 'saved':
        return savedVideos;
      case 'liked':
        return likedVideos;
      default:
        return [];
    }
  };

  const currentVideos = getVideosForTab();
  const isOwnProfile = true;

  const renderVideoCard = (video, index) => {
    const views = video.views ?? video.views_count ?? 0;
    const likes = video.likes ?? video.likes_count ?? 0;
    return (
      <TouchableOpacity
        key={video.id}
        style={[styles.card, { width: CARD_WIDTH, height: CARD_WIDTH / CARD_ASPECT }]}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('VideoView', { videoId: video.id })}
      >
        <VideoGridThumbnail video={video} style={styles.cardThumb} />
        <View style={styles.cardGradient} />
        <View style={styles.cardStats}>
          <Ionicons name="play" size={10} color="#FFF" />
          <Text style={styles.cardStatsText}>{formatCount(views)}</Text>
          <Ionicons name="heart-outline" size={10} color="#FFF" style={styles.cardStatIcon} />
          <Text style={styles.cardStatsText}>{formatCount(likes)}</Text>
        </View>
        {isOwnProfile && (activeTab === 'videos' || activeTab === 'brouillons') && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.cardActionBtn}
              onPress={() => navigation.navigate('EditVideo', { videoId: video.id })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="pencil" size={16} color="#F9FAFB" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cardActionBtn}
              onPress={() => handleDeleteVideo(video)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color="#F9FAFB" />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderGrid = () => {
    const rows = [];
    for (let i = 0; i < currentVideos.length; i += NUM_COLUMNS) {
      const rowItems = currentVideos.slice(i, i + NUM_COLUMNS);
      rows.push(
        <View key={i} style={styles.gridRow}>
          {rowItems.map((v, j) => renderVideoCard(v, i + j))}
          {rowItems.length < NUM_COLUMNS &&
            Array(NUM_COLUMNS - rowItems.length)
              .fill(0)
              .map((_, k) => (
                <View key={`empty-${k}`} style={[styles.card, { width: CARD_WIDTH, height: CARD_WIDTH / CARD_ASPECT }]} />
              ))}
        </View>
      );
    }
    return rows;
  };

  const renderEmpty = () => {
    const messages = {
      videos: { icon: 'videocam-outline', text: 'Aucune vidéo publiée', sub: 'Publiez votre première vidéo' },
      brouillons: { icon: 'document-text-outline', text: 'Aucun brouillon', sub: 'Les vidéos en privé apparaissent ici' },
      saved: { icon: 'bookmark-outline', text: 'Aucune vidéo sauvegardée', sub: '' },
      liked: { icon: 'heart-outline', text: "Aucun j'aime", sub: '' },
    };
    const m = messages[activeTab] || messages.videos;
    return (
      <View style={styles.emptyWrap}>
        <Ionicons name={m.icon} size={48} color="#4B5563" />
        <Text style={styles.emptyText}>{m.text}</Text>
        {m.sub ? <Text style={styles.emptySub}>{m.sub}</Text> : null}
      </View>
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Connectez-vous pour voir votre profil.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tint="#3B82F6" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Cover */}
        <View style={styles.cover} />

        <View style={styles.headerContent}>
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            {user?.profile_image || user?.avatar ? (
              <Image
                source={{ uri: user.profile_image || user.avatar }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarLetter}>{displayName[0]?.toUpperCase() || '?'}</Text>
              </View>
            )}
          </View>

          {/* Name & handle */}
          <Text style={styles.name}>{displayName}</Text>
          {username ? <Text style={styles.handle}>@{username}</Text> : null}

          {/* Bio */}
          {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}

          {/* Location & website */}
          <View style={styles.metaRow}>
            {user?.location ? (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color="#9CA3AF" />
                <Text style={styles.metaText}>{user.location}</Text>
              </View>
            ) : null}
            {user?.website ? (
              <Text style={styles.website} numberOfLines={1}>
                {user.website.replace(/^https?:\/\//, '')}
              </Text>
            ) : null}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatCount(stats.following)}</Text>
              <Text style={styles.statLabel}>Dans leur Wonder</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatCount(stats.wonderers || stats.followers)}</Text>
              <Text style={styles.statLabel}>Wonderers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatCount(totalLikes)}</Text>
              <Text style={styles.statLabel}>J'aime</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatCount(publishedVideos.length)}</Text>
              <Text style={styles.statLabel}>Vidéos</Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.btnEdit}
              onPress={() => navigation.navigate('Settings')}
            >
              <Ionicons name="pencil" size={18} color="#374151" />
              <Text style={styles.btnEditText}>Modifier profil</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnIcon}
              onPress={() => navigation.navigate('Support')}
            >
              <Ionicons name="diamond-outline" size={22} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnIcon}
              onPress={() => navigation.navigate('Inbox')}
            >
              <Ionicons name="chatbubble-outline" size={22} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnWallet}
              onPress={() => navigation.navigate('Wallet')}
            >
              <Ionicons name="wallet" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons
                name={tab.icon}
                size={18}
                color={activeTab === tab.id ? '#3B82F6' : '#9CA3AF'}
              />
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === tab.id && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {loading && activeTab === 'videos' ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Chargement des vidéos…</Text>
          </View>
        ) : currentVideos.length > 0 ? (
          <>
            <View style={styles.grid}>{renderGrid()}</View>
            {activeTab === 'videos' && hasNextPage && (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={fetchNextPage}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <Text style={styles.loadMoreText}>Voir plus</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        ) : (
          renderEmpty()
        )}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#9CA3AF',
    fontSize: 15,
  },
  cover: {
    height: 96,
    backgroundColor: '#2563EB',
    overflow: 'hidden',
  },
  headerContent: {
    paddingHorizontal: PAD,
    paddingBottom: 16,
    marginTop: -48,
  },
  avatarWrap: {
    marginBottom: 12,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: '#1F2937',
  },
  avatarPlaceholder: {
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 32,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  handle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  bio: {
    fontSize: 14,
    color: '#D1D5DB',
    marginTop: 8,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  website: {
    fontSize: 13,
    color: '#3B82F6',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#1F2937',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  btnEdit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    backgroundColor: '#111827',
  },
  btnEditText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  btnIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnWallet: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: PAD,
    marginBottom: 12,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#1F2937',
  },
  tabLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  tabLabelActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
  },
  grid: {
    paddingHorizontal: PAD,
  },
  gridRow: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: GAP,
  },
  card: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  cardThumb: {
    ...StyleSheet.absoluteFillObject,
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  cardStats: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardStatsText: {
    fontSize: 10,
    color: '#FFF',
    marginLeft: 2,
  },
  cardStatIcon: {
    marginLeft: 8,
  },
  cardActions: {
    position: 'absolute',
    top: 4,
    right: 4,
    flexDirection: 'row',
    gap: 4,
  },
  cardActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreBtn: {
    marginTop: 16,
    marginHorizontal: PAD,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: '#1F2937',
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3B82F6',
  },
  emptyWrap: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  logoutButton: {
    marginTop: 32,
    marginHorizontal: PAD,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  bottomSpacer: {
    height: 24,
  },
});
