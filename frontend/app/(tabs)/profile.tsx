import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Image,
  Alert,
  useWindowDimensions,
  FlatList,
  Share,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import { router, Link } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { ProfileSkeleton } from '../../src/components/SkeletonScreens';
import apiClient from '../../src/api/client';
import { toAbsoluteMediaUrl } from '../../src/utils/absoluteMediaUrl';
import { SmartThumbnail } from '../../src/components/SmartThumbnail';
import { buildPostItemFromVideo, type ProfileGridPostItem } from '../../src/utils/buildProfileVideoGridItem';
import { orderRawVideosPinnedFirstForProfile } from '../../src/utils/profileVideoSort';

/**
 * Écran Profil style TikTok.
 * - Fond blanc #FFFFFF, texte noir.
 * - Header : Add friend / mini-avatar+badge / Share / Menu.
 * - Avatar centré 96 px avec badge + bleu, nom + bouton Edit, @handle, 3 stats
 *   (Following / Followers / Likes), bio + lien.
 * - 4 onglets : Grid | Lock (privé) | Repost | Bookmark, sticky au scroll.
 * - Grille 3 colonnes ratio 9:16 avec compteur de vues en bas à gauche.
 * - Les fonctionnalités internes AfriWonder (wallet, badges, revenus…) sont
 *   accessibles via le bouton "menu" (hamburger) qui ouvre `/menu-plus`.
 */

type ContentTab = 'posts' | 'private' | 'reposts' | 'saved';
type PrivateFilter = 'all' | 'private' | 'followers' | 'scheduled';

type PostItem = ProfileGridPostItem;

const PRIVATE_FILTER_TABS: { key: PrivateFilter; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'all', label: 'Tout', icon: 'apps-outline' },
  { key: 'private', label: 'Privé', icon: 'lock-closed-outline' },
  { key: 'followers', label: 'Abonnés', icon: 'people-outline' },
  { key: 'scheduled', label: 'Programmées', icon: 'time-outline' },
];

function formatScheduledShort(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString('en-US');
};

const TEXT_MAIN = '#000000';
const TEXT_MUTED = 'rgba(0,0,0,0.60)';
const DIVIDER = 'rgba(0,0,0,0.10)';
const CHIP_BG = '#F1F1F2';
const LINK_BLUE = '#2B8CFF';
const LIVE_PINK = '#FF2D55';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const gridSize = (width - 4) / 3;
  const gridItemHeight = gridSize * (16 / 9);

  const { user, isAuthenticated, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<ContentTab>('posts');
  const [privateFilter, setPrivateFilter] = useState<PrivateFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [realStats, setRealStats] = useState<{
    posts: number;
    followers: number;
    following: number;
    likes: number;
  } | null>(null);
  const [realBio, setRealBio] = useState<string | null>(null);
  const [realWebsite, setRealWebsite] = useState('');
  const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null);
  const [profileVerified, setProfileVerified] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  /** Badge notification — nombre de messages non lus (barre supérieure). */
  const [inboxBadge, setInboxBadge] = useState(0);

  const [tabPosts, setTabPosts] = useState<PostItem[]>([]);
  const [savedPosts, setSavedPosts] = useState<PostItem[]>([]);
  const [privatePosts, setPrivatePosts] = useState<PostItem[]>([]);
  const [repostPosts, setRepostPosts] = useState<PostItem[]>([]);

  const loadInboxBadge = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await apiClient.get('/messages/conversations', { params: { page: 1, limit: 50 } });
      const data = res.data?.data || res.data;
      const convos = data?.conversations || [];
      const sum = (Array.isArray(convos) ? convos : []).reduce(
        (acc: number, c: { unread_count?: number }) => acc + (Number(c.unread_count) || 0),
        0
      );
      setInboxBadge(sum);
    } catch {
      setInboxBadge(0);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void loadInboxBadge();
  }, [loadInboxBadge]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!isAuthenticated || !user?.id) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await apiClient.get(`/users/${user.id}`);
        const data = response.data?.data || response.data;
        if (data?._count) {
          setRealStats({
            posts: data._count.videos || 0,
            followers: data._count.follows || 0,
            following: data._count.following || 0,
            likes: Number(data._count.video_likes || data.total_likes || 0),
          });
        }
        if (data?.full_name != null) setProfileDisplayName(String(data.full_name));
        setProfileVerified(Boolean(data.is_verified));
        setRealBio(data?.bio != null ? String(data.bio) : null);
        setRealWebsite(data?.website != null ? String(data.website) : '');
      } catch (err) {
        console.log('Could not load full profile', err);
      }

      const creatorAvatar = toAbsoluteMediaUrl(user.profile_image || user.avatar || '').trim();

      try {
        const [videosRes, savesRes] = await Promise.all([
          apiClient.get(`/videos?creator_id=${user.id}&page=1&limit=60&visibility=creator`),
          apiClient.get(`/saves?page=1&limit=60`).catch(() => null),
        ]);
        const vData = videosRes.data?.data || videosRes.data;
        const videos = vData?.videos || [];
        const ordered = orderRawVideosPinnedFirstForProfile(videos);
        setTabPosts(
          ordered
            .filter((v: any) => (v.visibility || 'public') === 'public')
            .map((v: any) => buildPostItemFromVideo(v, creatorAvatar))
        );
        setPrivatePosts(
          ordered
            .filter((v: any) => {
              const vis = v.visibility || 'public';
              return vis !== 'public';
            })
            .map((v: any) => buildPostItemFromVideo(v, creatorAvatar))
        );
        setRepostPosts(
          ordered
            .filter((v: any) => v.remix_of_id)
            .map((v: any) => buildPostItemFromVideo(v, creatorAvatar))
        );

        if (savesRes) {
          const sPayload = savesRes.data?.data || savesRes.data;
          const savedVideos = sPayload?.videos || [];
          setSavedPosts(savedVideos.map((v: any) => buildPostItemFromVideo(v, creatorAvatar)));
        } else {
          setSavedPosts([]);
        }
      } catch (err) {
        console.log('Could not load user videos / saves', err);
        setTabPosts([]);
        setSavedPosts([]);
        setPrivatePosts([]);
        setRepostPosts([]);
      }
      setIsLoading(false);
    };
    void loadProfile();
  }, [isAuthenticated, user?.id, user?.profile_image, user?.avatar]);

  const filteredPrivatePosts = useMemo(() => {
    if (privateFilter === 'all') return privatePosts;
    return privatePosts.filter((p) => p.visibility === privateFilter);
  }, [privatePosts, privateFilter]);

  const privateCounts = useMemo(() => {
    return privatePosts.reduce(
      (acc, p) => {
        acc.all += 1;
        if (p.visibility === 'private') acc.private += 1;
        else if (p.visibility === 'followers') acc.followers += 1;
        else if (p.visibility === 'scheduled') acc.scheduled += 1;
        return acc;
      },
      { all: 0, private: 0, followers: 0, scheduled: 0 } as Record<PrivateFilter, number>,
    );
  }, [privatePosts]);

  const gridItems = useMemo(() => {
    if (!isAuthenticated || !user?.id) return [];
    switch (activeTab) {
      case 'posts':
        return tabPosts;
      case 'private':
        return filteredPrivatePosts;
      case 'reposts':
        return repostPosts;
      case 'saved':
        return savedPosts;
      default:
        return tabPosts;
    }
  }, [activeTab, isAuthenticated, user?.id, tabPosts, filteredPrivatePosts, repostPosts, savedPosts]);

  const emptyState = useMemo(() => {
    switch (activeTab) {
      case 'posts':
        return {
          icon: 'camera-outline' as const,
          title: 'Partagez votre première vidéo',
          subtitle: 'Vos publications apparaîtront ici.',
          cta: 'Publier',
          onPress: () => router.push('/(tabs)/create'),
        };
      case 'private': {
        const map: Record<PrivateFilter, { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; subtitle: string }> = {
          all: {
            icon: 'lock-closed-outline',
            title: 'Aucune vidéo non publique',
            subtitle: 'Vos vidéos privées, réservées aux abonnés ou programmées apparaîtront ici.',
          },
          private: {
            icon: 'lock-closed-outline',
            title: 'Aucune vidéo privée',
            subtitle: 'Marquez une vidéo comme "Privé" lors de la publication.',
          },
          followers: {
            icon: 'people-outline',
            title: 'Aucune vidéo abonnés',
            subtitle: 'Choisissez "Abonnés" lors de la publication pour la rendre visible aux abonnés uniquement.',
          },
          scheduled: {
            icon: 'time-outline',
            title: 'Aucune vidéo programmée',
            subtitle: 'Utilisez "Programmer la publication" lors de la création pour planifier une mise en ligne.',
          },
        };
        const e = map[privateFilter];
        return { icon: e.icon, title: e.title, subtitle: e.subtitle, cta: null, onPress: undefined };
      }
      case 'reposts':
        return {
          icon: 'repeat-outline' as const,
          title: 'Aucun repost',
          subtitle: 'Les vidéos que vous repostez s’afficheront ici.',
          cta: null,
          onPress: undefined,
        };
      case 'saved':
        return {
          icon: 'bookmark-outline' as const,
          title: 'Rien d’enregistré',
          subtitle: 'Enregistrez des vidéos depuis le lecteur pour les retrouver ici.',
          cta: null,
          onPress: undefined,
        };
      default:
        return {
          icon: 'videocam-outline' as const,
          title: '',
          subtitle: '',
          cta: null,
          onPress: undefined,
        };
    }
  }, [activeTab, privateFilter]);

  const profile = useMemo(() => {
    const displayName =
      (profileDisplayName && profileDisplayName.trim()) ||
      (user?.full_name && user.full_name.trim()) ||
      [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
      user?.username ||
      '—';
    const handle = (user?.username || '').replace(/^@+/, '');
    return {
      displayName,
      handle,
      avatar: toAbsoluteMediaUrl(user?.avatar || user?.profile_image || '').trim(),
      bio: realBio ?? user?.bio ?? '',
      website: (realWebsite || user?.website || '').trim(),
      isVerified: profileVerified || Boolean(user?.is_verified),
      stats: {
        following: realStats?.following ?? user?.following ?? 0,
        followers: realStats?.followers ?? user?.followers ?? 0,
        likes: realStats?.likes ?? 0,
      },
    };
  }, [profileDisplayName, realBio, realWebsite, profileVerified, realStats, user]);

  const shareProfileLink = useCallback(async () => {
    const handle = profile.handle || 'user';
    const url = `https://afriwonder.onrender.com/u/${encodeURIComponent(handle)}`;
    const message = `Rejoignez-moi sur AfriWonder — @${handle}\n${url}`;
    if (Platform.OS === 'web') {
      try {
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
          await navigator.share({ title: 'AfriWonder', text: message, url });
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
        /* annulé */
      }
    }
  }, [profile.handle]);

  const openWebsiteUrl = (w: string) => {
    const raw = w.trim();
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    void Linking.openURL(url).catch(() => Alert.alert('Lien', 'Impossible d’ouvrir ce lien.'));
  };

  const handleLogout = () => {
    const run = async () => {
      await logout();
      router.replace('/(auth)/login');
    };
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        void run();
      }
      return;
    }
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', style: 'destructive', onPress: () => void run() },
    ]);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ProfileSkeleton />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loginContainer}>
          <LinearGradient colors={['#00F2EA', '#FF2D55']} style={styles.loginIconGradient}>
            <Ionicons name="person" size={48} color="#FFF" />
          </LinearGradient>
          <Text style={styles.loginTitle}>Rejoignez AfriWonder</Text>
          <Text style={styles.loginSubtitle}>Créez, partagez et connectez avec la communauté africaine</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginBtnText}>Se connecter</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.registerLink}>Créer un compte</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const tabs: {
    key: ContentTab;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    iconActive: React.ComponentProps<typeof Ionicons>['name'];
    a11y: string;
  }[] = [
    { key: 'posts', icon: 'grid-outline', iconActive: 'grid', a11y: 'Publications' },
    { key: 'private', icon: 'lock-closed-outline', iconActive: 'lock-closed', a11y: 'Vidéos privées' },
    { key: 'reposts', icon: 'repeat-outline', iconActive: 'repeat', a11y: 'Reposts' },
    { key: 'saved', icon: 'bookmark-outline', iconActive: 'bookmark', a11y: 'Enregistrées' },
  ];

  const renderGridItem = ({ item, index }: { item: PostItem; index: number }) => (
    <TouchableOpacity
      testID={index === 0 ? 'profile-first-grid-video' : undefined}
      style={[styles.gridItem, { width: gridSize, height: gridItemHeight }]}
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: '/watch/[id]', params: { id: item.id } })}
    >
      <SmartThumbnail
        posterUrl={item.posterUrl}
        uri={item.image}
        videoUrl={item.videoUrl}
        fallbackImage={item.fallbackImage}
        style={styles.gridImage}
        tileSize={gridSize}
        tileHeight={gridItemHeight}
      />
      {item.isPinned ? (
        <View style={styles.pinnedBadge}>
          <Ionicons name="pin" size={10} color="#FFF" />
        </View>
      ) : null}
      {renderVisibilityBadge(item)}
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gridViewsOverlay}
        pointerEvents="none"
      >
        <Ionicons name="play" size={12} color="#FFF" />
        <Text style={styles.gridViewsText}>{formatNumber(item.views)}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  /**
   * Petit badge en haut-droite de la vignette pour distinguer Privé / Abonnés / Programmée.
   * Pas de badge pour `public` ou `archived` (épinglé reste géré séparément en haut-gauche).
   */
  function renderVisibilityBadge(item: PostItem) {
    if (item.visibility === 'private') {
      return (
        <View style={[styles.visibilityBadge, styles.visibilityBadgePrivate]}>
          <Ionicons name="lock-closed" size={10} color="#FFF" />
        </View>
      );
    }
    if (item.visibility === 'followers') {
      return (
        <View style={[styles.visibilityBadge, styles.visibilityBadgeFollowers]}>
          <Ionicons name="people" size={10} color="#FFF" />
        </View>
      );
    }
    if (item.visibility === 'scheduled') {
      return (
        <View style={[styles.visibilityBadge, styles.visibilityBadgeScheduled]}>
          <Ionicons name="time" size={10} color="#FFF" />
          {item.scheduledAt ? (
            <Text style={styles.visibilityBadgeText} numberOfLines={1}>
              {formatScheduledShort(item.scheduledAt)}
            </Text>
          ) : null}
        </View>
      );
    }
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header sticky */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.push('/find-friends')}
          style={styles.topBarBtn}
          accessibilityLabel="Ajouter des amis"
        >
          <Ionicons name="person-add-outline" size={24} color={TEXT_MAIN} />
        </TouchableOpacity>
        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={styles.topBarMiniAvatarWrap}
            onPress={() => router.push('/(tabs)/messages')}
            accessibilityLabel="Messages"
          >
            {profile.avatar ? (
              <Image source={{ uri: profile.avatar }} style={styles.topBarMiniAvatar} />
            ) : (
              <View style={[styles.topBarMiniAvatar, styles.topBarMiniAvatarFallback]}>
                <Ionicons name="person" size={16} color="#FFF" />
              </View>
            )}
            {inboxBadge > 0 ? (
              <View style={styles.topBarBadge}>
                <Text style={styles.topBarBadgeText}>{inboxBadge > 99 ? '99+' : String(inboxBadge)}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topBarBtn}
            onPress={() => void shareProfileLink()}
            accessibilityLabel="Partager le profil"
          >
            <Ionicons name="share-social-outline" size={24} color={TEXT_MAIN} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="profile-settings-button"
            style={styles.topBarBtn}
            onPress={() => router.push('/menu-plus')}
            accessibilityLabel="Menu"
          >
            <Ionicons name="menu-outline" size={28} color={TEXT_MAIN} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Section Infos Profil */}
        <View style={styles.profileSection}>
          {/* Bulle "Spill the tea" (texte de story) si besoin — laissée simple */}
          {/* <View style={styles.textStoryBubble}><Text style={styles.textStoryBubbleText}>Spill the tea</Text></View> */}

          {/* Avatar + badge create story */}
          <Pressable
            onPress={() => router.push('/stories')}
            style={({ pressed }) => [styles.avatarWrap, pressed && { opacity: 0.9 }]}
            accessibilityLabel="Publier une story"
          >
            {profile.avatar ? (
              <Image source={{ uri: profile.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="person" size={44} color="#FFF" />
              </View>
            )}
            <View style={styles.avatarAddBadge}>
              <Ionicons name="add" size={14} color="#FFF" />
            </View>
          </Pressable>

          {/* Nom + bouton Edit */}
          <View style={styles.nameRow}>
            <Text style={styles.displayName} numberOfLines={1}>
              {profile.displayName}
            </Text>
            {profile.isVerified ? (
              <Ionicons name="checkmark-circle" size={18} color={LIVE_PINK} style={{ marginLeft: 4 }} />
            ) : null}
            <Link href="/profile-edit" asChild>
              <Pressable style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.7 }]}>
                <Text style={styles.editBtnText}>Edit</Text>
              </Pressable>
            </Link>
          </View>

          {/* @username */}
          {profile.handle ? <Text style={styles.handle}>@{profile.handle}</Text> : null}

          {/* Stats */}
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => router.push({ pathname: '/profile-connections', params: { mode: 'following' } })}
              accessibilityLabel={`${profile.stats.following} abonnements`}
            >
              <Text style={styles.statNumber}>{formatNumber(profile.stats.following)}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => router.push({ pathname: '/profile-connections', params: { mode: 'followers' } })}
              accessibilityLabel={`${profile.stats.followers} abonnés`}
            >
              <Text style={styles.statNumber}>{formatNumber(profile.stats.followers)}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{formatNumber(profile.stats.likes)}</Text>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
          </View>

          {/* Bio */}
          {profile.bio ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setBioExpanded((v) => !v)}
              style={styles.bioWrap}
            >
              <Text style={styles.bio} numberOfLines={bioExpanded ? undefined : 2}>
                {profile.bio}
              </Text>
              {!bioExpanded && profile.bio.length > 90 ? (
                <Text style={styles.bioMore}>plus</Text>
              ) : null}
            </TouchableOpacity>
          ) : (
            <Link href="/profile-edit" asChild>
              <Pressable style={styles.bioEmptyWrap}>
                <Text style={styles.bioEmpty}>+ Ajouter une bio</Text>
              </Pressable>
            </Link>
          )}

          {/* Lien externe */}
          {profile.website ? (
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => openWebsiteUrl(profile.website)}
              accessibilityLabel={`Ouvrir ${profile.website}`}
            >
              <Ionicons name="link-outline" size={14} color={TEXT_MAIN} />
              <Text style={styles.linkText} numberOfLines={1}>
                {profile.website.replace(/^https?:\/\//i, '')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Tabs sticky */}
        <View style={styles.contentTabs}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.contentTab}
                onPress={() => setActiveTab(tab.key)}
                accessibilityLabel={tab.a11y}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <Ionicons
                  name={isActive ? tab.iconActive : tab.icon}
                  size={22}
                  color={isActive ? TEXT_MAIN : 'rgba(0,0,0,0.40)'}
                />
                {isActive ? <View style={styles.contentTabUnderline} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Sous-filtre Privé / Abonnés / Programmées (uniquement onglet "Private"). */}
        {activeTab === 'private' && privatePosts.length > 0 ? (
          <View style={styles.privateFilterRow}>
            {PRIVATE_FILTER_TABS.map((opt) => {
              const isActive = privateFilter === opt.key;
              const count = privateCounts[opt.key];
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.privateFilterChip, isActive && styles.privateFilterChipActive]}
                  onPress={() => setPrivateFilter(opt.key)}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={opt.icon}
                    size={14}
                    color={isActive ? '#FFF' : 'rgba(0,0,0,0.65)'}
                  />
                  <Text style={[styles.privateFilterText, isActive && styles.privateFilterTextActive]}>
                    {opt.label}
                  </Text>
                  {count > 0 ? (
                    <View
                      style={[
                        styles.privateFilterCount,
                        isActive && styles.privateFilterCountActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.privateFilterCountText,
                          isActive && styles.privateFilterCountTextActive,
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        {/* Content Grid */}
        <FlatList
          data={gridItems}
          extraData={`${activeTab}-${privateFilter}`}
          renderItem={renderGridItem}
          keyExtractor={(item) => `${activeTab}-${privateFilter}-${item.id}`}
          numColumns={3}
          scrollEnabled={false}
          columnWrapperStyle={{ gap: 1 }}
          ItemSeparatorComponent={() => <View style={{ height: 1 }} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name={emptyState.icon} size={32} color={TEXT_MAIN} />
              </View>
              <Text style={styles.emptyTitle}>{emptyState.title}</Text>
              {emptyState.subtitle ? (
                <Text style={styles.emptySubtitle}>{emptyState.subtitle}</Text>
              ) : null}
              {emptyState.cta && emptyState.onPress ? (
                <TouchableOpacity
                  style={styles.emptyCtaBtn}
                  onPress={emptyState.onPress}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={16} color="#FFF" />
                  <Text style={styles.emptyCtaText}>{emptyState.cta}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
        />

        {/* Lien discret vers menu AfriWonder (wallet, revenus, badges, déconnexion) */}
        <TouchableOpacity
          style={styles.afwFooter}
          onPress={() => router.push('/menu-plus')}
          activeOpacity={0.85}
        >
          <Ionicons name="apps-outline" size={16} color={TEXT_MUTED} />
          <Text style={styles.afwFooterText}>Plus de fonctionnalités AfriWonder</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="profile-logout-button"
          style={styles.logoutInline}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={16} color={LIVE_PINK} />
          <Text style={styles.logoutInlineText}>Déconnexion</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  // Login
  loginContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  loginIconGradient: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  loginTitle: { fontSize: 22, fontWeight: '800', color: TEXT_MAIN, marginBottom: 6 },
  loginSubtitle: {
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  loginBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: LIVE_PINK,
    marginBottom: 14,
  },
  loginBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  registerLink: { color: TEXT_MAIN, fontSize: 14, fontWeight: '600' },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  topBarBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  topBarMiniAvatarWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  topBarMiniAvatar: { width: 28, height: 28, borderRadius: 14 },
  topBarMiniAvatarFallback: {
    backgroundColor: '#888',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: LIVE_PINK,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  topBarBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },

  // Profile Section
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 10,
    position: 'relative',
    overflow: 'visible',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EEE',
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarAddBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: LINK_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    maxWidth: '100%',
  },
  displayName: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT_MAIN,
    maxWidth: 200,
  },
  editBtn: {
    marginLeft: 10,
    backgroundColor: CHIP_BG,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 4,
  },
  editBtnText: { color: TEXT_MAIN, fontSize: 14, fontWeight: '600' },
  handle: {
    marginTop: 4,
    color: TEXT_MUTED,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    marginBottom: 12,
  },
  statItem: { alignItems: 'center', paddingHorizontal: 14, minWidth: 80 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 22, backgroundColor: DIVIDER },
  statNumber: { color: TEXT_MAIN, fontSize: 16, fontWeight: '800' },
  statLabel: { color: TEXT_MUTED, fontSize: 13, marginTop: 2 },
  bioWrap: { marginTop: 6, alignItems: 'center', paddingHorizontal: 16 },
  bio: { color: TEXT_MAIN, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  bioMore: { color: TEXT_MUTED, fontSize: 13, marginTop: 2, fontWeight: '600' },
  bioEmptyWrap: { marginTop: 4 },
  bioEmpty: { color: TEXT_MUTED, fontSize: 13, fontWeight: '600' },
  linkRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: 16,
  },
  linkText: {
    color: TEXT_MAIN,
    fontSize: 14,
    textDecorationLine: 'underline',
    flexShrink: 1,
  },

  // Tabs
  contentTabs: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DIVIDER,
    backgroundColor: '#FFFFFF',
  },
  contentTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 8,
    position: 'relative',
  },
  contentTabUnderline: {
    marginTop: 6,
    height: 2,
    width: 32,
    borderRadius: 1,
    backgroundColor: TEXT_MAIN,
  },

  // Grid
  gridItem: {
    position: 'relative',
    backgroundColor: '#F1F1F2',
  },
  gridImage: { width: '100%', height: '100%' },
  gridViewsOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 6,
    paddingBottom: 4,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'flex-start',
  },
  gridViewsText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  pinnedBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  visibilityBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  visibilityBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    maxWidth: 80,
  },
  visibilityBadgePrivate: { backgroundColor: 'rgba(0,0,0,0.65)' },
  visibilityBadgeFollowers: { backgroundColor: 'rgba(43,140,255,0.85)' },
  visibilityBadgeScheduled: { backgroundColor: 'rgba(255,107,0,0.92)' },

  // Sous-filtre Private (Tout / Privé / Abonnés / Programmées)
  privateFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DIVIDER,
  },
  privateFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F1F1F2',
    borderRadius: 20,
  },
  privateFilterChipActive: { backgroundColor: '#000' },
  privateFilterText: { color: 'rgba(0,0,0,0.75)', fontSize: 13, fontWeight: '600' },
  privateFilterTextActive: { color: '#FFF' },
  privateFilterCount: {
    minWidth: 20,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  privateFilterCountActive: { backgroundColor: 'rgba(255,255,255,0.22)' },
  privateFilterCountText: { color: 'rgba(0,0,0,0.6)', fontSize: 11, fontWeight: '700' },
  privateFilterCountTextActive: { color: '#FFF' },

  // Empty state
  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: CHIP_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    color: TEXT_MAIN,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: TEXT_MUTED,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: LIVE_PINK,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  emptyCtaText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  // Footer links
  afwFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  afwFooterText: { color: TEXT_MUTED, fontSize: 13, fontWeight: '600' },
  logoutInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  logoutInlineText: { color: LIVE_PINK, fontSize: 13, fontWeight: '700' },
});
