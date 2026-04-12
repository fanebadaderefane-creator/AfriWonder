import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Image,
  Alert,
  Dimensions,
  FlatList,
  Share,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Colors, Spacing } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import { router, Link } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { ProfileSkeleton } from '../../src/components/SkeletonScreens';
import apiClient from '../../src/api/client';
import { toAbsoluteMediaUrl } from '../../src/utils/absoluteMediaUrl';
import { SmartThumbnail, isVideoUrl } from '../../src/components/SmartThumbnail';
import { useQuery } from '@tanstack/react-query';
import { fetchGamificationMe } from '../../src/api/gamificationApi';

const { width } = Dimensions.get('window');
const GRID_SIZE = (width - 4) / 3;

// Default user data (used when API data not loaded yet)
const DEFAULT_USER = {
  firstName: '',
  lastName: '',
  username: '',
  avatar: '',
  coverImage: '',
  bio: '',
  website: '',
  location: '',
  isVerified: false,
  stats: {
    posts: 0,
    followers: 0,
    following: 0,
    likes: 0,
  },
};

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

type ContentTab = 'posts' | 'reels' | 'saved' | 'tagged';

type PostItem = {
  id: string;
  image: string;
  posterUrl?: string;
  videoUrl?: string;
  fallbackImage?: string;
  isVideo: boolean;
  views: number;
  likes: number;
  isPinned: boolean;
  /** Secondes (API) — filtres onglet Reels. */
  durationSec?: number | null;
};

/** Grille profil / sauvegardes : mêmes URLs absolues + miniatures que l’onglet Découvrir. */
function buildPostItemFromVideo(v: any, profileOwnerAvatar: string): PostItem {
  const absThumb = toAbsoluteMediaUrl(v.thumbnail_url || '').trim();
  const absLow = toAbsoluteMediaUrl(v.low_quality_url || v.low_quality_playback_url || '').trim();
  const absVid = toAbsoluteMediaUrl(v.video_url || '').trim();
  const absHls = toAbsoluteMediaUrl(v.hls_url || '').trim();

  const posterStatic =
    absThumb && !isVideoUrl(absThumb)
      ? absThumb
      : absLow && !isVideoUrl(absLow)
        ? absLow
        : '';

  const videoForFrame =
    absVid && isVideoUrl(absVid)
      ? absVid
      : absLow && isVideoUrl(absLow)
        ? absLow
        : absHls && isVideoUrl(absHls)
          ? absHls
          : '';

  const image = posterStatic || videoForFrame || absThumb || absLow || absVid || absHls;
  const creatorAvatar = toAbsoluteMediaUrl(v.creator_avatar || v.creator?.profile_image || '').trim();
  const fallbackImage = creatorAvatar || profileOwnerAvatar;

  const dur = v.duration;
  const durationSec = typeof dur === 'number' && Number.isFinite(dur) ? dur : null;

  return {
    id: v.id,
    image,
    posterUrl: posterStatic,
    videoUrl: videoForFrame || absVid || absLow,
    fallbackImage,
    isVideo: v.media_type === 'video' || Boolean(videoForFrame || absVid || absHls),
    views: v.views || 0,
    likes: v.likes || 0,
    isPinned: v.is_featured || false,
    durationSec,
  };
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<ContentTab>('posts');
  const [isLoading, setIsLoading] = useState(true);
  const [realStats, setRealStats] = useState<{ posts: number; followers: number; following: number } | null>(null);
  const [realBio, setRealBio] = useState<string | null>(null);
  const [realWebsite, setRealWebsite] = useState('');
  const [realLocation, setRealLocation] = useState('');
  const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null);
  const [profileVerified, setProfileVerified] = useState(false);
  /** Publications du créateur (grille « Posts » + filtres Reels / Identifié). */
  const [tabPosts, setTabPosts] = useState<PostItem[]>([]);
  /** Vidéos enregistrées (GET /saves). */
  const [savedPosts, setSavedPosts] = useState<PostItem[]>([]);
  /** Vidéos où vous êtes @mentionné dans un commentaire (GET /videos?tagged_for=). */
  const [taggedPosts, setTaggedPosts] = useState<PostItem[]>([]);
  /** Statistiques réelles agrégées (GET /creator-dashboard — mêmes chiffres que l’espace créateur). */
  const [creatorDashStats, setCreatorDashStats] = useState<{
    totalViews: number;
    totalLikes: number;
    videoCount: number;
    engagementPct: number;
  } | null>(null);

  const badgesQuery = useQuery({
    queryKey: ['gamification', 'me', 'profile-strip', user?.id],
    queryFn: fetchGamificationMe,
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (isAuthenticated && user?.id) {
        try {
          const response = await apiClient.get(`/users/${user.id}`);
          const data = response.data?.data || response.data;
          if (data?._count) {
            setRealStats({
              posts: data._count.videos || 0,
              followers: data._count.follows || 0,
              following: data._count.following || 0,
            });
          }
          if (data?.full_name != null) setProfileDisplayName(String(data.full_name));
          setProfileVerified(Boolean(data.is_verified));
          if (data?.bio != null) setRealBio(String(data.bio));
          else setRealBio(null);
          setRealWebsite(data?.website != null ? String(data.website) : '');
          setRealLocation(data?.location != null ? String(data.location) : '');
        } catch (err) {
          console.log('Could not load full profile', err);
        }

        const creatorAvatar = toAbsoluteMediaUrl(user.profile_image || user.avatar || '').trim();

        void apiClient
          .get('/creator-dashboard')
          .then((dashRes) => {
            const dash = dashRes.data?.data ?? dashRes.data;
            const st = dash?.stats;
            if (!st) {
              setCreatorDashStats(null);
              return;
            }
            setCreatorDashStats({
              totalViews: Number(st.total_views) || 0,
              totalLikes: Number(st.total_likes) || 0,
              videoCount: Number(st.video_count) || 0,
              engagementPct: Number(st.engagement_rate_pct) || 0,
            });
          })
          .catch(() => setCreatorDashStats(null));

        // Publications + sauvegardes (en parallèle)
        try {
          const [videosRes, savesRes, taggedRes] = await Promise.all([
            apiClient.get(`/videos?creator_id=${user.id}&page=1&limit=60`),
            apiClient.get(`/saves?page=1&limit=60`).catch(() => null),
            apiClient.get(`/videos?tagged_for=${encodeURIComponent(user.id)}&page=1&limit=60`).catch(() => null),
          ]);
          const vData = videosRes.data?.data || videosRes.data;
          const videos = vData?.videos || [];
          const mapped = videos.map((v: any) => buildPostItemFromVideo(v, creatorAvatar));
          setTabPosts(mapped);

          if (savesRes) {
            const sPayload = savesRes.data?.data || savesRes.data;
            const savedVideos = sPayload?.videos || [];
            setSavedPosts(savedVideos.map((v: any) => buildPostItemFromVideo(v, creatorAvatar)));
          } else {
            setSavedPosts([]);
          }

          if (taggedRes) {
            const tPayload = taggedRes.data?.data || taggedRes.data;
            const taggedVideos = tPayload?.videos || [];
            setTaggedPosts(taggedVideos.map((v: any) => buildPostItemFromVideo(v, creatorAvatar)));
          } else {
            setTaggedPosts([]);
          }
        } catch (err) {
          console.log('Could not load user videos / saves / tagged', err);
          setTabPosts([]);
          setSavedPosts([]);
          setTaggedPosts([]);
        }
      } else {
        setCreatorDashStats(null);
      }
      setIsLoading(false);
    };
    loadProfile();
  }, [isAuthenticated, user?.id, user?.profile_image, user?.avatar]);

  const gridItems = useMemo(() => {
    if (!isAuthenticated || !user?.id) return [];
    switch (activeTab) {
      case 'posts':
        return tabPosts;
      case 'reels': {
        const maxReelSec = 180;
        return tabPosts.filter((p) => p.durationSec == null || p.durationSec <= maxReelSec);
      }
      case 'saved':
        return savedPosts;
      case 'tagged':
        return taggedPosts;
      default:
        return tabPosts;
    }
  }, [activeTab, isAuthenticated, user?.id, tabPosts, savedPosts, taggedPosts]);

  const gridEmptyCopy = useMemo(() => {
    switch (activeTab) {
      case 'posts':
        return { icon: 'videocam-outline' as const, title: 'Aucune publication', subtitle: 'Vos vidéos apparaîtront ici.' };
      case 'reels':
        return {
          icon: 'play-circle-outline' as const,
          title: 'Aucune reel courte',
          subtitle: 'Les vidéos d’au plus 3 minutes (durée renseignée) apparaissent ici.',
        };
      case 'saved':
        return {
          icon: 'bookmark-outline' as const,
          title: 'Aucune sauvegarde',
          subtitle: 'Enregistrez une vidéo depuis le lecteur pour la retrouver ici.',
        };
      case 'tagged':
        return {
          icon: 'pricetag-outline' as const,
          title: 'Aucune identification',
          subtitle:
            'Vidéos publiques où vous êtes @mentionné dans un commentaire, ou dans le titre / la description de la vidéo.',
        };
      default:
        return { icon: 'videocam-outline' as const, title: 'Aucun contenu', subtitle: '' };
    }
  }, [activeTab]);

  const profileData = isAuthenticated && user ? {
    ...DEFAULT_USER,
    firstName: user.firstName || user.full_name?.split(' ')[0] || DEFAULT_USER.firstName,
    lastName: user.lastName || user.full_name?.split(' ').slice(1).join(' ') || DEFAULT_USER.lastName,
    displayName:
      (profileDisplayName && profileDisplayName.trim()) ||
      (user.full_name && user.full_name.trim()) ||
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
      user.username ||
      '—',
    username: user.username || DEFAULT_USER.username,
    avatar: user.avatar || user.profile_image || DEFAULT_USER.avatar,
    bio: realBio ?? user.bio ?? DEFAULT_USER.bio,
    website: (realWebsite || user.website || DEFAULT_USER.website || '').trim(),
    location: (realLocation || user.location || DEFAULT_USER.location || '').trim(),
    isVerified: profileVerified || Boolean(user.is_verified),
    stats: {
      posts: realStats?.posts ?? user.videosCount ?? DEFAULT_USER.stats.posts,
      followers: realStats?.followers ?? user.followers ?? DEFAULT_USER.stats.followers,
      following: realStats?.following ?? user.following ?? DEFAULT_USER.stats.following,
      likes: DEFAULT_USER.stats.likes,
    },
  } : { ...DEFAULT_USER, displayName: '—' };

  const shareProfileLink = async (viaQr?: boolean) => {
    const handle = profileData.username || user?.username || 'user';
    const url = `https://afriwonder.onrender.com/u/${encodeURIComponent(handle)}`;
    const line = viaQr
      ? `Scannez mon profil AfriWonder — @${handle}`
      : `Rejoignez-moi sur AfriWonder — @${handle}`;
    const message = `${line}\n${url}`;

    if (Platform.OS === 'web') {
      try {
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
          await navigator.share({ title: 'AfriWonder', text: line, url });
          return;
        }
      } catch (e: unknown) {
        const name = e && typeof e === 'object' && 'name' in e ? String((e as { name?: string }).name) : '';
        if (name === 'AbortError') return;
      }
      try {
        await Clipboard.setStringAsync(message);
        Alert.alert('Profil', 'Lien copié dans le presse-papiers.');
      } catch {
        Alert.alert('Profil', message);
      }
      return;
    }

    try {
      await Share.share({ title: 'AfriWonder', message });
    } catch {
      try {
        await Clipboard.setStringAsync(message);
        Alert.alert('Profil', 'Lien copié dans le presse-papiers.');
      } catch {
        /* annulé ou indisponible */
      }
    }
  };

  const openWebsiteUrl = (w: string) => {
    const raw = w.trim();
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    void Linking.openURL(url).catch(() => Alert.alert('Lien', 'Impossible d’ouvrir ce lien.'));
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ProfileSkeleton />
      </View>
    );
  }

  const handleLogout = () => {
    Alert.alert('Deconnexion', 'Etes-vous sur de vouloir vous deconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Deconnexion', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient colors={['#1A1A1A', '#000']} style={styles.loginContainer}>
          <View style={styles.loginIconContainer}>
            <LinearGradient colors={['#FF6B00', '#FF3D00']} style={styles.loginIconGradient}>
              <Ionicons name="person" size={50} color="#FFF" />
            </LinearGradient>
          </View>
          <Text style={styles.loginTitle}>Rejoignez AfriWonder</Text>
          <Text style={styles.loginSubtitle}>Creez, partagez et connectez avec la communaute africaine</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/(auth)/login')}>
            <LinearGradient colors={['#FF6B00', '#FF3D00']} style={styles.loginBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.loginBtnText}>Se connecter</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.registerLink}>Creer un compte</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  const tabs: { key: ContentTab; icon: string; iconActive: string }[] = [
    { key: 'posts', icon: 'grid-outline', iconActive: 'grid' },
    { key: 'reels', icon: 'play-circle-outline', iconActive: 'play-circle' },
    { key: 'saved', icon: 'bookmark-outline', iconActive: 'bookmark' },
    { key: 'tagged', icon: 'pricetag-outline', iconActive: 'pricetag' },
  ];

  const renderGridItem = ({ item }: { item: PostItem }) => (
    <TouchableOpacity
      style={styles.gridItem}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/watch/[id]', params: { id: item.id } })}
    >
      <SmartThumbnail
        posterUrl={item.posterUrl}
        uri={item.image}
        videoUrl={item.videoUrl}
        fallbackImage={item.fallbackImage}
        style={styles.gridImage}
        tileSize={GRID_SIZE}
        tileHeight={GRID_SIZE}
      />
      {item.isVideo && (
        <View style={styles.videoIndicator}>
          <Ionicons name="play" size={12} color="#FFF" />
          <Text style={styles.videoViews}>{formatNumber(item.views)}</Text>
        </View>
      )}
      {item.isPinned && (
        <View style={styles.pinnedBadge}>
          <Ionicons name="pin" size={10} color="#FFF" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Ionicons name="lock-closed" size={14} color="#FFF" />
            <Text style={styles.topBarUsername}>{profileData.username}</Text>
            {profileData.isVerified && <Ionicons name="checkmark-circle" size={16} color="#3897F0" />}
          </View>
          <View style={styles.topBarRight}>
            <TouchableOpacity
              style={styles.topBarBtn}
              onPress={() => router.push('/menu-plus')}
              accessibilityLabel="Menu toutes les fonctions"
            >
              <Ionicons name="apps-outline" size={24} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.topBarBtn} onPress={() => router.push('/settings')}>
              <Ionicons name="menu-outline" size={26} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          {/* Avatar + Stats Row */}
          <View style={styles.profileRow}>
            {/* Avatar with story ring */}
            <Link href="/profile-edit" asChild>
              <Pressable accessibilityLabel="Modifier photo ou profil" style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
                <LinearGradient colors={['#FF6B00', '#FF3D00', '#FF006E']} style={styles.avatarRing}>
                  <View style={styles.avatarInner}>
                    <Image source={{ uri: profileData.avatar }} style={styles.avatar} />
                  </View>
                </LinearGradient>
              </Pressable>
            </Link>

            {/* Stats */}
            <View style={styles.statsRow}>
              <TouchableOpacity style={styles.statItem} onPress={() => setActiveTab('posts')}>
                <Text style={styles.statNumber}>{formatNumber(profileData.stats.posts)}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.statItem}
                onPress={() => router.push({ pathname: '/profile-connections', params: { mode: 'followers' } })}
              >
                <Text style={styles.statNumber}>{formatNumber(profileData.stats.followers)}</Text>
                <Text style={styles.statLabel}>Abonnes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.statItem}
                onPress={() => router.push({ pathname: '/profile-connections', params: { mode: 'following' } })}
              >
                <Text style={styles.statNumber}>{formatNumber(profileData.stats.following)}</Text>
                <Text style={styles.statLabel}>Suivi(e)s</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Name + Bio */}
          <View style={styles.bioSection}>
            <View style={styles.nameRow}>
              <Text style={styles.displayName}>{profileData.displayName}</Text>
              {profileData.isVerified && <Ionicons name="checkmark-circle" size={16} color="#3897F0" />}
            </View>
            <Text style={styles.bio}>{profileData.bio}</Text>
            {profileData.website ? (
              <TouchableOpacity onPress={() => openWebsiteUrl(profileData.website)}>
                <Text style={styles.website}>{profileData.website}</Text>
              </TouchableOpacity>
            ) : null}
            {profileData.location ? (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.location}>{profileData.location}</Text>
              </View>
            ) : null}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <Link href="/profile-edit" asChild>
              <Pressable
                style={({ pressed }) => [styles.editProfileBtn, pressed && { opacity: 0.75 }]}
              >
                <Text style={styles.editProfileText}>Modifier le profil</Text>
              </Pressable>
            </Link>
            <TouchableOpacity style={styles.shareProfileBtn} activeOpacity={0.7} onPress={() => void shareProfileLink(false)}>
              <Text style={styles.shareProfileText}>Partager le profil</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addFriendBtn} activeOpacity={0.7} onPress={() => router.push('/search')}>
              <Ionicons name="person-add-outline" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Badges (API gamification — aligné PWA / badges-profile) */}
          <View style={styles.badgesSection}>
            <View style={styles.badgesHeaderRow}>
              <Text style={styles.badgesSectionTitle}>Badges</Text>
              <TouchableOpacity onPress={() => router.push('/badges-profile')} hitSlop={8}>
                <Text style={styles.badgesSeeAll}>Tout voir</Text>
              </TouchableOpacity>
            </View>
            {badgesQuery.isPending ? (
              <ActivityIndicator color={Colors.primary} style={{ marginVertical: 10 }} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesRow}>
                {(badgesQuery.data?.badges ?? []).length === 0 ? (
                  <TouchableOpacity onPress={() => router.push('/gamification-hub')} style={styles.badgesEmptyTap}>
                    <Text style={styles.badgesEmptyText}>
                      Aucun badge pour l&apos;instant — ouvrez le centre gamification
                    </Text>
                  </TouchableOpacity>
                ) : (
                  (badgesQuery.data?.badges ?? []).slice(0, 12).map((b) => (
                    <TouchableOpacity
                      key={b.id}
                      activeOpacity={0.85}
                      style={styles.badgeItem}
                      onPress={() => router.push('/badges-profile')}
                    >
                      <View style={[styles.badgeCircle, { backgroundColor: '#1A1A1A' }]}>
                        {b.badge_icon?.endsWith('-outline') || b.badge_icon?.endsWith('-sharp') ? (
                          <Ionicons name={b.badge_icon as keyof typeof Ionicons.glyphMap} size={18} color={Colors.primary} />
                        ) : (
                          <Text style={styles.badgeEmoji}>{b.badge_icon || '🏅'}</Text>
                        )}
                      </View>
                      <Text style={styles.badgeLabel} numberOfLines={1}>
                        {b.badge_name}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}
          </View>

          {/* Statistiques créateur (données API — pas de « vues profil » dédiées côté serveur pour l’instant) */}
          <TouchableOpacity style={styles.analyticsCard} activeOpacity={0.8} onPress={() => router.push('/creator/earnings')}>
            <View style={styles.analyticsHeader}>
              <Ionicons name="stats-chart" size={16} color={Colors.primary} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.analyticsTitle}>Statistiques créateur</Text>
                <Text style={styles.analyticsDemoHint}>Vues et likes agrégés sur vos vidéos publiées</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#888" />
            </View>
            <View style={styles.analyticsGrid}>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsValue}>
                  {creatorDashStats != null ? formatNumber(creatorDashStats.totalViews) : '—'}
                </Text>
                <Text style={styles.analyticsLabel}>Vues totales</Text>
              </View>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsValue}>
                  {creatorDashStats != null ? formatNumber(creatorDashStats.totalLikes) : '—'}
                </Text>
                <Text style={styles.analyticsLabel}>J&apos;aime</Text>
              </View>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsValue}>
                  {creatorDashStats != null ? formatNumber(creatorDashStats.videoCount) : '—'}
                </Text>
                <Text style={styles.analyticsLabel}>Vidéos</Text>
              </View>
            </View>
            {creatorDashStats != null ? (
              <Text style={styles.analyticsEngagementFoot}>
                Engagement estimé (likes / vues) :{' '}
                {Number.isInteger(creatorDashStats.engagementPct)
                  ? creatorDashStats.engagementPct
                  : creatorDashStats.engagementPct.toFixed(1)}
                %
              </Text>
            ) : null}
          </TouchableOpacity>

          {/* QR Code Card */}
          <TouchableOpacity style={styles.qrCard} activeOpacity={0.8} onPress={() => void shareProfileLink(true)}>
            <View style={styles.qrLeft}>
              <Ionicons name="qr-code" size={32} color={Colors.primary} />
            </View>
            <View style={styles.qrInfo}>
              <Text style={styles.qrTitle}>Mon QR Code</Text>
              <Text style={styles.qrSubtitle}>Scannez pour me suivre sur AfriWonder</Text>
            </View>
            <Ionicons name="share-outline" size={20} color="#888" />
          </TouchableOpacity>

          {/* Story Highlights */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.highlightsContainer} contentContainerStyle={styles.highlightsContent}>
            <TouchableOpacity style={styles.highlightItem} onPress={() => router.push('/stories')}>
              <View style={styles.highlightNew}>
                <Ionicons name="add" size={28} color="#FFF" />
              </View>
              <Text style={styles.highlightName}>Nouveau</Text>
            </TouchableOpacity>
            {['Mode', 'Cuisine', 'Voyage', 'Bamako', 'Famille'].map((name, i) => (
              <TouchableOpacity
                key={i}
                style={styles.highlightItem}
                onPress={() => router.push({ pathname: '/search', params: { q: `#${name}` } })}
              >
                <View style={styles.highlightCircle}>
                  <Image source={{ uri: `https://picsum.photos/100/100?random=${i + 80}` }} style={styles.highlightImage} />
                </View>
                <Text style={styles.highlightName}>{name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content Tabs */}
        <View style={styles.contentTabs}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.contentTab, activeTab === tab.key && styles.contentTabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={(activeTab === tab.key ? tab.iconActive : tab.icon) as any}
                size={24}
                color={activeTab === tab.key ? '#FFF' : '#666'}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Content Grid */}
        <FlatList
          data={gridItems}
          extraData={activeTab}
          renderItem={renderGridItem}
          keyExtractor={(item) => `${activeTab}-${item.id}`}
          numColumns={3}
          scrollEnabled={false}
          columnWrapperStyle={styles.gridRow}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: 40, paddingHorizontal: 24 }}>
              <Ionicons name={gridEmptyCopy.icon} size={40} color={Colors.textMuted} />
              <Text style={{ color: Colors.textMuted, marginTop: 10, fontWeight: '700', textAlign: 'center' }}>
                {gridEmptyCopy.title}
              </Text>
              {gridEmptyCopy.subtitle ? (
                <Text style={{ color: Colors.textMuted, marginTop: 6, fontSize: 13, textAlign: 'center', opacity: 0.85 }}>
                  {gridEmptyCopy.subtitle}
                </Text>
              ) : null}
            </View>
          }
        />

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {[
            { icon: 'wallet', label: 'Portefeuille', route: '/wallet', color: '#FF6B00' },
            { icon: 'cash', label: 'Mes Revenus', route: '/creator/earnings', color: '#4ECDC4' },
            { icon: 'megaphone', label: 'Publicité', route: '/creator/ads', color: '#667eea' },
            { icon: 'radio', label: 'Live & Replays', route: '/live', color: '#E91E63' },
            { icon: 'receipt', label: 'Commandes', route: '/orders', color: '#9B59B6' },
            { icon: 'storefront', label: 'Ma boutique', route: '/seller', color: '#FF6B6B' },
            { icon: 'gift', label: 'Parrainage', route: '/referrals', color: '#3498DB' },
          ].map((action, i) => (
            <TouchableOpacity key={i} style={styles.quickAction} onPress={() => router.push(action.route as any)}>
              <View style={[styles.quickActionIcon, { backgroundColor: action.color + '18' }]}>
                <Ionicons name={action.icon as any} size={22} color={action.color} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#666" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FF4757" />
          <Text style={styles.logoutText}>Deconnexion</Text>
        </TouchableOpacity>

        <Text style={styles.version}>AfriWonder v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Login state
  loginContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  loginIconContainer: {
    marginBottom: 24,
  },
  loginIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  loginBtn: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  loginBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loginBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  registerLink: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topBarUsername: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
  topBarRight: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  topBarBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Profile Section
  profileSection: {
    paddingHorizontal: Spacing.lg,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    padding: 3,
  },
  avatarInner: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 3,
    borderColor: '#000',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: Spacing.xl,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },

  // Bio
  bioSection: {
    marginBottom: Spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  displayName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  bio: {
    fontSize: 14,
    color: '#DDD',
    lineHeight: 20,
    marginBottom: 4,
  },
  website: {
    fontSize: 14,
    color: '#3897F0',
    fontWeight: '600',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontSize: 13,
    color: '#888',
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  editProfileBtn: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  editProfileText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  shareProfileBtn: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  shareProfileText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  addFriendBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Highlights
  highlightsContainer: {
    marginBottom: Spacing.lg,
  },
  highlightsContent: {
    gap: Spacing.lg,
  },
  highlightItem: {
    alignItems: 'center',
    width: 68,
  },
  highlightNew: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#444',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  highlightCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#444',
    overflow: 'hidden',
    marginBottom: 4,
  },
  highlightImage: {
    width: '100%',
    height: '100%',
  },
  highlightName: {
    color: '#CCC',
    fontSize: 11,
    textAlign: 'center',
  },

  // Content Tabs
  contentTabs: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#333',
    borderBottomWidth: 0.5,
    borderBottomColor: '#333',
  },
  contentTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  contentTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#FFF',
  },

  // Grid
  gridRow: {
    gap: 2,
    marginBottom: 2,
  },
  gridItem: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
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
  },
  pinnedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Quick Actions
  quickActions: {
    marginTop: Spacing.xxl,
    marginHorizontal: Spacing.lg,
    backgroundColor: '#0D0D0D',
    borderRadius: 16,
    overflow: 'hidden',
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1A1A1A',
    gap: Spacing.md,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    flex: 1,
    color: '#FFF',
    fontSize: 15,
    fontWeight: '500',
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xxl,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,71,87,0.1)',
    borderRadius: 12,
  },
  logoutText: {
    color: '#FF4757',
    fontSize: 15,
    fontWeight: '600',
  },
  version: {
    fontSize: 12,
    color: '#444',
    textAlign: 'center',
    marginVertical: Spacing.xxl,
  },

  // Badges
  badgesSection: { marginTop: 16, marginBottom: 8 },
  badgesHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 2 },
  badgesSectionTitle: { color: '#888', fontSize: 12, fontWeight: '600' },
  badgesSeeAll: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
  badgesRow: { gap: 12 },
  badgesEmptyTap: { paddingVertical: 8, maxWidth: 280 },
  badgesEmptyText: { color: '#888', fontSize: 11, lineHeight: 16 },
  badgeItem: { alignItems: 'center', width: 58 },
  badgeItemLocked: { opacity: 0.4 },
  badgeCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  badgeEmoji: { fontSize: 16 },
  badgeLabel: { color: '#AAA', fontSize: 9, textAlign: 'center', fontWeight: '500' },

  // Analytics
  analyticsCard: {
    backgroundColor: '#111', borderRadius: 14, padding: 14, marginTop: 12,
    borderWidth: 1, borderColor: '#1A1A1A',
  },
  analyticsHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 12 },
  analyticsTitle: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  analyticsDemoHint: { color: '#666', fontSize: 10, marginTop: 3, lineHeight: 14 },
  analyticsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  analyticsItem: { flex: 1, alignItems: 'center' },
  analyticsValue: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  analyticsLabel: { color: '#888', fontSize: 10, marginTop: 2, marginBottom: 4 },
  analyticsEngagementFoot: { color: '#666', fontSize: 11, marginTop: 10, textAlign: 'center' },

  // QR Card
  qrCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 14,
    padding: 14, marginTop: 10, borderWidth: 1, borderColor: '#1A1A1A', gap: 12,
  },
  qrLeft: {},
  qrInfo: { flex: 1 },
  qrTitle: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  qrSubtitle: { color: '#888', fontSize: 11, marginTop: 2 },
});
