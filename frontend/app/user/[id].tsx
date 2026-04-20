import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  useWindowDimensions,
  Share,
  Platform,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../src/api/client';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../src/theme/colors';
import { useAuthStore } from '../../src/store/authStore';
import { CreatorAvatar } from '../../src/components/CreatorAvatar';
import { toAbsoluteMediaUrl } from '../../src/utils/absoluteMediaUrl';
import { buildPostItemFromVideo, type ProfileGridPostItem } from '../../src/utils/buildProfileVideoGridItem';
import { sortVideosWithPinnedFirst, type ProfileVideoSortMode } from '../../src/utils/profileVideoSort';
import { SmartThumbnail } from '../../src/components/SmartThumbnail';
import { getPublicWebOrigin } from '../../src/config/shareUrls';
import ReportModal from '../../src/components/ReportModal';
import { getRecentlyViewedVideoIds, getRecentlyViewedVideoTsMap } from '../../src/utils/recentlyViewedVideos';

type PublicUser = {
  id: string;
  username?: string;
  full_name?: string | null;
  profile_image?: string | null;
  bio?: string | null;
  is_verified?: boolean;
  isFollowing?: boolean;
  _count?: { videos?: number; follows?: number; following?: number };
};

type ProfileStats = {
  following: number;
  followers: number;
  likesReceived: number;
};

type MainTab = 'videos' | 'reposts' | 'liked';
type SortMode = ProfileVideoSortMode;

type PlaylistPreview = {
  id: string;
  name: string;
  description?: string | null;
  is_public?: boolean;
  videos_count?: number | null;
  items?: { video?: any | null }[];
};

type LiveHallSupporter = {
  rank: number;
  sender_id: string;
  sender_name?: string | null;
  sender_avatar?: string | null;
  total_amount_fcfa?: number;
  gift_events?: number;
};

const formatNumber = (num: number) => {
  if (!Number.isFinite(num) || num < 0) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(Math.round(num));
};

export default function PublicUserProfileScreen() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const userId = (Array.isArray(id) ? id[0] : id) || '';
  const { user: me, isAuthenticated } = useAuthStore();

  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [likedVideos, setLikedVideos] = useState<any[]>([]);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>('videos');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [reportVisible, setReportVisible] = useState(false);
  const [showRecentlyViewed, setShowRecentlyViewed] = useState(false);
  const [recentlyViewedRaw, setRecentlyViewedRaw] = useState<any[] | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistPreview[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [liveHall, setLiveHall] = useState<LiveHallSupporter[]>([]);
  const [activeLiveId, setActiveLiveId] = useState<string | null>(null);
  const scrollRef = useRef<React.ElementRef<typeof ScrollView> | null>(null);

  const viewerFirstName = useMemo(() => {
    const fn = (me?.full_name || '').trim().split(/\s+/)[0] || me?.username || '';
    return fn || 'Moi';
  }, [me?.full_name, me?.username]);
  const viewerLastName = useMemo(() => {
    const parts = (me?.full_name || '').trim().split(/\s+/);
    return parts.slice(1).join(' ') || '';
  }, [me?.full_name]);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setErr('Profil introuvable');
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const [uRes, vRes, statsRes, likedRes, hallRes, liveRes] = await Promise.all([
        apiClient.get(`/users/${userId}`),
        apiClient.get(`/videos`, { params: { creator_id: userId, page: 1, limit: 60 } }),
        apiClient.get(`/users/${userId}/stats`).catch(() => ({ data: null })),
        apiClient.get(`/users/${userId}/liked-videos`, { params: { page: 1, limit: 60 } }).catch(() => ({ data: null })),
        apiClient.get(`/users/${userId}/live-gift-hall-of-fame`, { params: { limit: 12 } }).catch(() => ({ data: null })),
        apiClient.get('/live', { params: { creator_id: userId, status: 'live', limit: 1 } }).catch(() => ({ data: null })),
      ]);
      const u = uRes.data?.data ?? uRes.data;
      setProfile(u || null);
      const vData = vRes.data?.data ?? vRes.data;
      setVideos(Array.isArray(vData?.videos) ? vData.videos : []);

      const stPkg = (statsRes as any)?.data?.data ?? (statsRes as any)?.data;
      const s = stPkg?.stats;
      setStats(
        s
          ? {
              following: Number(s.following) || 0,
              followers: Number(s.followers) || 0,
              likesReceived: Number(s.likesReceived) || 0,
            }
          : null
      );

      const lv = (likedRes as any)?.data?.data ?? (likedRes as any)?.data;
      setLikedVideos(Array.isArray(lv?.videos) ? lv.videos : []);

      const hallPkg = (hallRes as { data?: { data?: { supporters?: LiveHallSupporter[] } } })?.data?.data;
      const hallInner = (hallRes as { data?: { supporters?: LiveHallSupporter[] } })?.data;
      const supporters = hallPkg?.supporters ?? hallInner?.supporters;
      setLiveHall(Array.isArray(supporters) ? supporters : []);

      const livePkg = (liveRes as { data?: { data?: { streams?: { id?: string }[] } } })?.data?.data;
      const liveInner = (liveRes as { data?: { streams?: { id?: string }[] } })?.data;
      const streams = livePkg?.streams ?? liveInner?.streams;
      const first = Array.isArray(streams) && streams[0]?.id ? String(streams[0].id) : null;
      setActiveLiveId(first);
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { error?: { message?: string } } } };
      const msg = ax.response?.data?.error?.message || 'Impossible de charger ce profil';
      setErr(String(msg));
      setProfile(null);
      setVideos([]);
      setLikedVideos([]);
      setStats(null);
      setLiveHall([]);
      setActiveLiveId(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadPlaylists = useCallback(async () => {
    if (!userId) return;
    setPlaylistsLoading(true);
    try {
      const res = await apiClient.get('/playlists', { params: { user_id: userId, page: 1, limit: 12 } });
      const pkg = res.data?.data ?? res.data;
      const list = Array.isArray(pkg?.playlists) ? pkg.playlists : [];
      setPlaylists(list);
    } catch {
      setPlaylists([]);
    } finally {
      setPlaylistsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadPlaylists();
  }, [loadPlaylists]);

  useEffect(() => {
    if (mainTab !== 'videos' && showRecentlyViewed) {
      setShowRecentlyViewed(false);
      setRecentlyViewedRaw(null);
    }
  }, [mainTab, showRecentlyViewed]);

  const isSelf = Boolean(me?.id && userId && me.id === userId);

  const toggleFollow = async () => {
    if (!isAuthenticated || !profile || isSelf) return;
    setFollowBusy(true);
    try {
      const res = await apiClient.post(`/users/${profile.id}/follow`, {});
      const d = res.data?.data ?? res.data;
      if (d?.requestPending) {
        Alert.alert('Compte privé', 'Demande de suivi envoyée.');
        return;
      }
      const next = Boolean(d?.following);
      setProfile((p) => (p ? { ...p, isFollowing: next } : p));
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { error?: { message?: string } } } };
      Alert.alert('Erreur', String(ax.response?.data?.error?.message || 'Action impossible').slice(0, 200));
    } finally {
      setFollowBusy(false);
    }
  };

  const openViewerProfile = () => {
    if (isAuthenticated && me?.id) {
      router.push('/(tabs)/profile');
      return;
    }
    router.push('/(auth)/login');
  };

  const openShare = async () => {
    if (!profile) return;
    const handle = (profile.username || '').replace(/^@+/, '');
    const origin = getPublicWebOrigin();
    const msg = handle
      ? `${profile.full_name?.trim() || handle} (@${handle}) sur AfriWonder`
      : `${profile.full_name?.trim() || 'Créateur'} sur AfriWonder`;
    try {
      await Share.share({
        message: Platform.OS === 'android' ? `${msg}\n${origin}` : msg,
        url: Platform.OS === 'ios' ? origin : undefined,
      });
    } catch {
      /* annulé */
    }
  };

  const openMore = () => {
    if (!profile) return;
    Alert.alert('Profil', undefined, [
      {
        text: 'Signaler',
        style: 'destructive',
        onPress: () => {
          if (!isAuthenticated) {
            Alert.alert('Connexion', 'Connectez-vous pour signaler un profil.');
            return;
          }
          setReportVisible(true);
        },
      },
      {
        text: 'Bloquer',
        style: 'destructive',
        onPress: () => {
          if (!isAuthenticated) {
            Alert.alert('Connexion', 'Connectez-vous pour bloquer un utilisateur.');
            return;
          }
          if (isSelf) return;
          Alert.alert(
            'Bloquer ce profil ?',
            'Vous ne pourrez plus échanger avec cette personne.',
            [
              { text: 'Annuler', style: 'cancel' },
              {
                text: 'Bloquer',
                style: 'destructive',
                onPress: () => void blockProfileUser(),
              },
            ]
          );
        },
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const blockProfileUser = async () => {
    if (!profile || isSelf) return;
    try {
      await apiClient.post('/messages/block', { userId: profile.id });
      Alert.alert('Profil bloqué', 'Cet utilisateur a été bloqué.');
      router.back();
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { error?: { message?: string } } } };
      Alert.alert('Erreur', String(ax.response?.data?.error?.message || 'Action impossible').slice(0, 200));
    }
  };

  const refetchVideosOnly = useCallback(async () => {
    if (!userId) return;
    try {
      const vRes = await apiClient.get(`/videos`, { params: { creator_id: userId, page: 1, limit: 60 } });
      const vData = vRes.data?.data ?? vRes.data;
      setVideos(Array.isArray(vData?.videos) ? vData.videos : []);
    } catch {
      /* silencieux */
    }
  }, [userId]);

  const togglePinOwnVideo = useCallback(
    async (videoId: string, nextFeatured: boolean) => {
      try {
        await apiClient.put(`/videos/${videoId}`, { is_featured: nextFeatured });
        await refetchVideosOnly();
      } catch (e: unknown) {
        const ax = e as { response?: { data?: { error?: { message?: string } } } };
        Alert.alert('Erreur', String(ax.response?.data?.error?.message || 'Action impossible').slice(0, 220));
      }
    },
    [refetchVideosOnly]
  );

  const openPinMenuFromGrid = useCallback(
    (raw: any) => {
      if (!isSelf || mainTab !== 'videos') return;
      const pinnedCount = videos.filter((v) => v?.is_featured).length;
      const isPinned = Boolean(raw?.is_featured);
      if (!isPinned && pinnedCount >= 3) {
        Alert.alert('Limite atteinte', 'Vous pouvez épingler au maximum 3 vidéos sur votre profil.');
        return;
      }
      Alert.alert(
        isPinned ? 'Désépingler cette vidéo ?' : 'Épingler en haut du profil ?',
        isPinned
          ? 'Elle ne sera plus affichée en premier sur votre grille.'
          : 'Elle restera en tête de grille avec les autres vidéos épinglées (max. 3).',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: isPinned ? 'Désépingler' : 'Épingler',
            style: isPinned ? 'destructive' : 'default',
            onPress: () => void togglePinOwnVideo(String(raw?.id), !isPinned),
          },
        ]
      );
    },
    [isSelf, mainTab, videos, togglePinOwnVideo]
  );

  const openMessage = async () => {
    if (!isAuthenticated) {
      Alert.alert('Connexion', 'Connectez-vous pour envoyer un message.');
      return;
    }
    if (!profile || isSelf) return;
    try {
      const res = await apiClient.get(`/messages/conversation/${encodeURIComponent(profile.id)}`);
      const pkg = res.data?.data ?? res.data;
      const convId = pkg?.id;
      const name = profile.full_name?.trim() || profile.username || 'Contact';
      const avatar = toAbsoluteMediaUrl(profile.profile_image || '').trim();
      if (convId) {
        router.push({
          pathname: '/messages/[id]',
          params: {
            id: String(convId),
            name,
            avatar: avatar || `https://i.pravatar.cc/150?u=${profile.id}`,
            otherUserId: profile.id,
          },
        });
        return;
      }
    } catch {
      /* pas de conv existante */
    }
    router.push('/messages');
  };

  const nameParts = (profile?.full_name || '').trim().split(/\s+/);
  const firstName = nameParts[0] || profile?.username || '';
  const lastName = nameParts.slice(1).join(' ');

  const horizontalInset = Spacing.sm * 2;
  const colGap = 2;
  const contentW = windowWidth - horizontalInset;
  const cellW = Math.max(1, Math.floor((contentW - colGap * 2) / 3));
  /** Tuiles plus « portrait » type TikTok (~3:4). */
  const cellH = Math.round(cellW * (4 / 3));

  const profileOwnerAvatar = useMemo(
    () => (profile ? toAbsoluteMediaUrl(profile.profile_image || '').trim() : ''),
    [profile]
  );

  const repostSource = useMemo(() => videos.filter((v) => Boolean(v?.remix_of_id)), [videos]);

  const rawForTab = useMemo(() => {
    if (mainTab === 'liked') return likedVideos;
    if (mainTab === 'reposts') return repostSource;
    return videos;
  }, [mainTab, likedVideos, repostSource, videos]);

  const sortedRaw = useMemo(() => sortVideosWithPinnedFirst(rawForTab, sortMode), [rawForTab, sortMode]);

  const displayedRaw = useMemo(() => {
    if (!showRecentlyViewed || mainTab !== 'videos') return sortedRaw;
    return recentlyViewedRaw ?? [];
  }, [mainTab, recentlyViewedRaw, showRecentlyViewed, sortedRaw]);

  const gridItems: ProfileGridPostItem[] = useMemo(() => {
    if (!profile) return [];
    return displayedRaw.map((v) => buildPostItemFromVideo(v, profileOwnerAvatar));
  }, [displayedRaw, profile, profileOwnerAvatar]);

  const applyRecentlyViewedFilter = useCallback(async () => {
    // Toggle off
    if (showRecentlyViewed) {
      setShowRecentlyViewed(false);
      setRecentlyViewedRaw(null);
      setMainTab('videos');
      setSortMode('recent');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    setMainTab('videos');
    setSortMode('recent');
    try {
      const ids = await getRecentlyViewedVideoIds(200);
      const tsMap = await getRecentlyViewedVideoTsMap();
      const setIds = new Set(ids);
      const list = videos.filter((v) => setIds.has(String(v?.id)));
      if (list.length === 0) {
        setShowRecentlyViewed(false);
        setRecentlyViewedRaw(null);
        Alert.alert('Vue récente', 'Vous n’avez encore regardé aucune vidéo de ce créateur.');
        return;
      }
      list.sort((a, b) => (tsMap.get(String(b?.id)) || 0) - (tsMap.get(String(a?.id)) || 0));
      setRecentlyViewedRaw(list);
      setShowRecentlyViewed(true);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } catch {
      setShowRecentlyViewed(false);
      setRecentlyViewedRaw(null);
      Alert.alert('Vue récente', 'Impossible de charger l’historique local.');
    }
  }, [showRecentlyViewed, videos]);

  const followingCount = stats?.following ?? profile?._count?.following ?? 0;
  const followersCount = stats?.followers ?? profile?._count?.follows ?? 0;
  const likesCount = stats?.likesReceived ?? 0;

  return (
    <View style={[styles.container, styles.containerRelative, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Profil
        </Text>
        <View style={styles.headerRightPill} accessibilityRole="toolbar">
          <TouchableOpacity
            onPress={() => router.push('/africoin/coins' as never)}
            style={styles.headerPillHit}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            accessibilityLabel="Obtenir des Pièces aFRICOIN"
          >
            <View style={styles.headerPlayCircle}>
              <Ionicons name="play" size={15} color="#111" />
            </View>
          </TouchableOpacity>
          <View style={styles.headerPillDivider} />
          <TouchableOpacity
            style={styles.headerPillHit}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            accessibilityLabel="Parrainage et cash back"
            onPress={() => router.push('/africoin/referral' as never)}
          >
            <Ionicons name="phone-portrait-outline" size={19} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerPillDivider} />
          <TouchableOpacity
            onPress={openViewerProfile}
            style={styles.headerPillAvatarWrap}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            accessibilityLabel={isAuthenticated ? 'Mon profil' : 'Se connecter'}
          >
            {isAuthenticated && me ? (
              <CreatorAvatar
                uri={me.profile_image}
                username={me.username}
                firstName={viewerFirstName}
                lastName={viewerLastName}
                size={26}
                bordered={false}
              />
            ) : (
              <View style={styles.headerPillAvatarPlaceholder}>
                <Ionicons name="person" size={16} color={Colors.textMuted} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={Colors.primary} size="large" />
      ) : err || !profile ? (
        <View style={styles.centered}>
          <Text style={styles.errText}>{err || 'Profil introuvable'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => void load()}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.scrollFlex}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View style={styles.hero}>
            <View style={styles.heroTopRow}>
              <CreatorAvatar
                uri={profile.profile_image}
                username={profile.username}
                firstName={firstName}
                lastName={lastName}
                size={88}
                bordered={false}
              />
              <View style={styles.heroTextCol}>
                <Text style={styles.displayName}>{profile.full_name?.trim() || profile.username || 'Créateur'}</Text>
                {profile.username ? (
                  <Text style={styles.handle}>@{profile.username.replace(/^@+/, '')}</Text>
                ) : null}
              </View>
            </View>

            {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

            <View style={styles.statsTiktok}>
              <View style={styles.statCell}>
                <Text style={styles.statNumTiktok}>{formatNumber(followingCount)}</Text>
                <Text style={styles.statLabelTiktok}>Suivis</Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statNumTiktok}>{formatNumber(followersCount)}</Text>
                <Text style={styles.statLabelTiktok}>Abonnés</Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statNumTiktok}>{formatNumber(likesCount)}</Text>
                <Text style={styles.statLabelTiktok}>J&apos;aime</Text>
              </View>
            </View>

            {!isSelf && activeLiveId ? (
              <TouchableOpacity
                style={styles.liveNowBanner}
                onPress={() => router.push({ pathname: '/live/[id]', params: { id: activeLiveId } } as never)}
                accessibilityRole="button"
                accessibilityLabel="Voir le direct de ce créateur"
              >
                <View style={styles.liveNowDot} />
                <Text style={styles.liveNowBannerText}>Voir le direct maintenant</Text>
                <Ionicons name="chevron-forward" size={18} color="#FFF" />
              </TouchableOpacity>
            ) : null}

            {liveHall.length > 0 ? (
              <View style={styles.hallSection}>
                <Text style={styles.hallTitle}>Hall of fame Live</Text>
                <Text style={styles.hallSubtitle}>Top soutiens cadeaux (tous les lives)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hallScroll}>
                  {liveHall.map((row) => {
                    const label = (row.sender_name || '?').trim();
                    const first = label.split(/\s+/)[0] || '?';
                    return (
                      <View key={row.sender_id} style={styles.hallCard}>
                        <CreatorAvatar
                          uri={row.sender_avatar ? toAbsoluteMediaUrl(row.sender_avatar) : undefined}
                          username={label}
                          firstName={first}
                          lastName=""
                          size={44}
                          bordered
                        />
                        <Text style={styles.hallName} numberOfLines={1}>
                          {label}
                        </Text>
                        <Text style={styles.hallAmt}>{formatNumber(Math.round(row.total_amount_fcfa || 0))} FCFA</Text>
                        <Text style={styles.hallRank}>#{row.rank}</Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.actionsRow}>
              {isSelf ? (
                <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.85}>
                  <Text style={styles.primaryBtnText}>Mon profil</Text>
                </TouchableOpacity>
              ) : isAuthenticated ? (
                <>
                  <TouchableOpacity
                    style={[styles.followBtn, profile.isFollowing && styles.followBtnOutline]}
                    onPress={() => void toggleFollow()}
                    disabled={followBusy}
                    activeOpacity={0.85}
                  >
                    {followBusy ? (
                      <ActivityIndicator color={profile.isFollowing ? Colors.primary : '#FFF'} />
                    ) : (
                      <Text style={[styles.followBtnText, profile.isFollowing && styles.followBtnTextOutline]}>
                        {profile.isFollowing ? 'Abonné' : 'Suivre'}
                      </Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.messageBtn} onPress={() => void openMessage()} activeOpacity={0.85}>
                    <Text style={styles.messageBtnText}>Message</Text>
                  </TouchableOpacity>
                </>
              ) : null}
              <Pressable style={styles.iconCircle} onPress={() => void openShare()} accessibilityLabel="Partager le profil">
                <Ionicons name="share-outline" size={20} color={Colors.text} />
              </Pressable>
              <Pressable style={styles.iconCircle} onPress={openMore} accessibilityLabel="Plus d’options">
                <Ionicons name="ellipsis-horizontal" size={20} color={Colors.text} />
              </Pressable>
            </View>
          </View>

          <View style={styles.tabsRow}>
            {(
              [
                { key: 'videos' as const, label: 'Vidéos' },
                { key: 'reposts' as const, label: 'Republications' },
                { key: 'liked' as const, label: 'A aimé' },
              ] as const
            ).map((t) => (
              <Pressable key={t.key} onPress={() => setMainTab(t.key)} style={styles.tabPress}>
                <Text style={[styles.tabLabel, mainTab === t.key && styles.tabLabelActive]}>{t.label}</Text>
                {mainTab === t.key ? <View style={styles.tabUnderline} /> : <View style={styles.tabUnderlinePlaceholder} />}
              </Pressable>
            ))}
          </View>

          <View style={styles.sortRow}>
            {(
              [
                { key: 'recent' as const, label: 'Récents' },
                { key: 'popular' as const, label: 'Populaire' },
                { key: 'oldest' as const, label: 'Plus ancien' },
              ] as const
            ).map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[styles.sortChip, sortMode === s.key && styles.sortChipActive]}
                onPress={() => {
                  // Désactive la vue récente (sinon elle “fige” la liste sur l’historique local)
                  if (showRecentlyViewed) {
                    setShowRecentlyViewed(false);
                    setRecentlyViewedRaw(null);
                  }
                  setSortMode(s.key);
                  scrollRef.current?.scrollTo({ y: 0, animated: true });
                }}
                activeOpacity={0.85}
              >
                <Text style={[styles.sortChipText, sortMode === s.key && styles.sortChipTextActive]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.playlistSection}>
            <View style={styles.playlistHeaderRow}>
              <Text style={styles.playlistTitle}>Listes de lecture</Text>
              <TouchableOpacity
                onPress={() => void loadPlaylists()}
                activeOpacity={0.85}
                style={styles.playlistRefreshBtn}
                accessibilityLabel="Rafraîchir playlists"
              >
                <Ionicons name="refresh" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.playlistScroll}>
              {playlistsLoading ? (
                <View style={styles.playlistCard}>
                  <View style={styles.playlistThumb} />
                  <Text style={styles.playlistCardTitle}>Chargement…</Text>
                  <Text style={styles.playlistCardSub}>Récupération des playlists</Text>
                </View>
              ) : playlists.length === 0 ? (
                <View style={styles.playlistCard}>
                  <View style={styles.playlistThumb} />
                  <Text style={styles.playlistCardTitle}>Aucune playlist</Text>
                  <Text style={styles.playlistCardSub}>Ce créateur n’a pas encore de playlist publique.</Text>
                </View>
              ) : (
                playlists.slice(0, 12).map((pl) => {
                  const firstVideo = pl.items?.[0]?.video;
                  const posterUrl = typeof firstVideo?.thumbnail_url === 'string' ? firstVideo.thumbnail_url : '';
                  const videoUrl =
                    typeof firstVideo?.low_quality_url === 'string'
                      ? firstVideo.low_quality_url
                      : typeof firstVideo?.video_url === 'string'
                        ? firstVideo.video_url
                        : typeof firstVideo?.hls_url === 'string'
                          ? firstVideo.hls_url
                          : '';
                  const uri = posterUrl || videoUrl;
                  return (
                    <TouchableOpacity
                      key={pl.id}
                      style={styles.playlistCard}
                      activeOpacity={0.88}
                      onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: pl.id } })}
                      accessibilityLabel={`Ouvrir playlist ${pl.name}`}
                    >
                      <View style={styles.playlistThumb}>
                        {uri ? (
                          <SmartThumbnail
                            posterUrl={posterUrl}
                            uri={uri}
                            videoUrl={videoUrl}
                            style={{ width: '100%', height: '100%' }}
                            tileSize={160}
                            tileHeight={88}
                          />
                        ) : null}
                      </View>
                      <Text style={styles.playlistCardTitle} numberOfLines={1}>
                        {pl.name || 'Playlist'}
                      </Text>
                      <Text style={styles.playlistCardSub} numberOfLines={2}>
                        {(pl.videos_count != null ? `${pl.videos_count} vidéo(s)` : '') || (pl.description || '').trim() || 'Playlist'}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>

          <Text style={styles.sectionTitle}>
            {mainTab === 'videos' ? 'Vidéos' : mainTab === 'reposts' ? 'Republications' : 'A aimé'}
          </Text>
          {gridItems.length === 0 ? (
            <Text style={styles.emptyVideos}>
              {mainTab === 'reposts'
                ? 'Aucune republication (remix) pour l’instant.'
                : mainTab === 'liked'
                  ? 'Aucune vidéo likée visible.'
                  : 'Aucune vidéo publique pour l’instant.'}
            </Text>
          ) : (
            <View style={[styles.grid, { paddingHorizontal: Spacing.sm }]}>
              {gridItems.map((item, index) => (
                <TouchableOpacity
                  key={`${mainTab}-${item.id}`}
                  style={[
                    styles.thumbCell,
                    {
                      width: cellW,
                      height: cellH,
                      marginBottom: colGap,
                      marginRight: index % 3 === 2 ? 0 : colGap,
                    },
                  ]}
                  onPress={() => router.push({ pathname: '/watch/[id]', params: { id: item.id } })}
                  onLongPress={() => {
                    if (!isSelf || mainTab !== 'videos') return;
                    const raw = sortedRaw.find((v) => String(v?.id) === String(item.id));
                    if (raw) openPinMenuFromGrid(raw);
                  }}
                  delayLongPress={400}
                  activeOpacity={0.88}
                >
                  <SmartThumbnail
                    posterUrl={item.posterUrl}
                    uri={item.image}
                    videoUrl={item.videoUrl}
                    fallbackImage={item.fallbackImage}
                    style={styles.thumb}
                    tileSize={cellW}
                    tileHeight={cellH}
                  />
                  {item.isVideo ? (
                    <View style={styles.videoIndicator} pointerEvents="none">
                      <Ionicons name="play" size={12} color="#FFF" />
                      <Text style={styles.videoViews}>{formatNumber(item.views)}</Text>
                    </View>
                  ) : null}
                  {item.isPinned && mainTab === 'videos' ? (
                    <View style={styles.pinnedBadge} pointerEvents="none">
                      <Text style={styles.pinnedBadgeText}>Épinglé</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
      {!loading && !err && profile ? (
        <TouchableOpacity
          style={[styles.recentFab, { bottom: Math.max(16, insets.bottom + 8) }]}
          activeOpacity={0.9}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => {
            void applyRecentlyViewedFilter();
          }}
          accessibilityLabel="Vue récente"
        >
          <Text style={styles.recentFabText}>{showRecentlyViewed ? 'Toutes' : 'Vue récente'}</Text>
          <Ionicons name="chevron-down" size={16} color="#FFF" />
        </TouchableOpacity>
      ) : null}
      {profile ? (
        <ReportModal
          visible={reportVisible}
          onClose={() => setReportVisible(false)}
          targetType="user"
          targetId={profile.id}
          useModerationEndpoint
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  containerRelative: { position: 'relative' },
  scrollFlex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: Colors.text, fontSize: FontSizes.lg, fontWeight: '700', marginHorizontal: 4 },
  headerRightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    maxWidth: 148,
  },
  headerPillHit: { alignItems: 'center', justifyContent: 'center' },
  headerPillDivider: { width: 1, height: 18, backgroundColor: 'rgba(255,255,255,0.22)', marginHorizontal: 6 },
  headerPlayCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
  headerPillAvatarWrap: { overflow: 'hidden', borderRadius: 13 },
  headerPillAvatarPlaceholder: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errText: { color: Colors.textSecondary, textAlign: 'center', fontSize: FontSizes.md },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: Colors.primary, borderRadius: BorderRadius.pill },
  retryBtnText: { color: '#FFF', fontWeight: '700' },
  hero: { paddingVertical: 20, paddingHorizontal: Spacing.md },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroTextCol: { flex: 1, minWidth: 0 },
  displayName: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: '800' },
  handle: { marginTop: 4, color: Colors.textMuted, fontSize: FontSizes.md },
  bio: { marginTop: 12, color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 20 },
  statsTiktok: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 18,
    paddingVertical: 4,
  },
  statCell: { alignItems: 'center', flex: 1 },
  statNumTiktok: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '800' },
  statLabelTiktok: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  liveNowBanner: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#E91E63',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.lg,
  },
  liveNowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' },
  liveNowBannerText: { flex: 1, color: '#FFF', fontWeight: '800', fontSize: FontSizes.sm },
  hallSection: { marginTop: 20 },
  hallTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '800' },
  hallSubtitle: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 4, marginBottom: 10 },
  hallScroll: { gap: 10, paddingRight: Spacing.md },
  hallCard: {
    width: 108,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  hallName: { color: Colors.text, fontSize: 11, fontWeight: '700', marginTop: 8, textAlign: 'center', width: '100%' },
  hallAmt: { color: Colors.primary, fontSize: 11, fontWeight: '800', marginTop: 4 },
  hallRank: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  followBtn: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.pill,
    minWidth: 120,
    alignItems: 'center',
  },
  followBtnOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary },
  followBtnText: { color: '#FFF', fontWeight: '800', fontSize: FontSizes.md },
  followBtnTextOutline: { color: Colors.primary },
  messageBtn: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: BorderRadius.pill,
  },
  messageBtnText: { color: Colors.text, fontWeight: '700', fontSize: FontSizes.md },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFF', fontWeight: '800', fontSize: FontSizes.md },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.sm,
  },
  tabPress: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabLabel: { color: Colors.textMuted, fontSize: 14, fontWeight: '600' },
  tabLabelActive: { color: Colors.primaryLight, fontWeight: '800' },
  tabUnderline: { marginTop: 8, height: 2, width: '56%', backgroundColor: Colors.primary, borderRadius: 1 },
  tabUnderlinePlaceholder: { marginTop: 8, height: 2, width: '56%' },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingTop: 10,
    paddingBottom: 4,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  sortChipActive: { backgroundColor: 'rgba(255,107,0,0.22)', borderWidth: 1, borderColor: 'rgba(255,107,0,0.45)' },
  sortChipText: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
  sortChipTextActive: { color: Colors.primaryLight, fontWeight: '700' },
  playlistSection: { marginTop: 12, paddingBottom: 8 },
  playlistHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginBottom: 10,
  },
  playlistTitle: {
    color: Colors.text,
    fontWeight: '700',
    fontSize: FontSizes.md,
  },
  playlistRefreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  playlistScroll: { paddingHorizontal: Spacing.md, gap: 12 },
  playlistCard: {
    width: 200,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 10,
    marginRight: 12,
  },
  playlistThumb: {
    height: 88,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 8,
  },
  playlistCardTitle: { color: Colors.text, fontWeight: '800', fontSize: 14 },
  playlistCardSub: { color: Colors.textMuted, fontSize: 11, marginTop: 4 },
  sectionTitle: { color: Colors.textMuted, fontWeight: '600', fontSize: 13, paddingHorizontal: Spacing.md, marginTop: 8, marginBottom: 6 },
  emptyVideos: { color: Colors.textMuted, paddingHorizontal: Spacing.lg, fontSize: FontSizes.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  thumbCell: { borderRadius: 4, overflow: 'hidden', backgroundColor: '#222', position: 'relative' },
  thumb: { width: '100%', height: '100%' },
  videoIndicator: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoViews: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  pinnedBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  pinnedBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  recentFab: {
    position: 'absolute',
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.primary,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  },
  recentFabText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
});
