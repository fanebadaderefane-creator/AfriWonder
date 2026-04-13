import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ExploreGridSkeleton } from '../../src/components/SkeletonScreens';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { toAbsoluteMediaUrl } from '../../src/utils/absoluteMediaUrl';
import { SmartThumbnail, isVideoUrl } from '../../src/components/SmartThumbnail';

const GRID_GAP = 2;

// Stories — créateurs (≥1 vidéo publique) triés par popularité + « Moi »
const DEFAULT_STORIES = [
  { id: 'add', name: 'Moi', avatar: '', isAdd: true, hasNew: false, isLive: false },
];

/** Ligne créateur avec score de tri (non affiché). */
type ExploreCreatorRow = {
  id: string;
  name: string;
  avatar: string;
  popularity: number;
};

const USERS_PAGE_LIMIT = 50;
const VIDEOS_PAGE_LIMIT = 100;
/** Garde-fou si la pagination API est incohérente (50 × 100 = 5000 comptes max). */
const MAX_USER_PAGES = 100;

/** Avatar dérivé du vrai nom (pas de photo en base) — cohérent avec messages/index. */
function generatedAvatarFromLabel(label: string) {
  const safe = (label || '?').trim().slice(0, 48) || '?';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(safe)}&background=FF6B00&color=fff&size=128&bold=true`;
}

function profileDisplayName(u: { full_name?: string; username?: string; email?: string }) {
  const full = (u.full_name || '').trim();
  if (full) return full;
  const un = (u.username || '').trim();
  if (un) return `@${un.replace(/^@+/, '')}`;
  const em = (u.email || '').trim();
  if (em) return em.split('@')[0] || 'Utilisateur';
  return 'Utilisateur';
}

function resolveProfileAvatar(
  rawImage: string | null | undefined,
  displayName: string,
  userId: string,
): string {
  const abs = toAbsoluteMediaUrl((rawImage || '').trim());
  if (abs) return abs;
  return generatedAvatarFromLabel(displayName || userId);
}

/** Récupère tous les utilisateurs paginés (GET /users, limit max 50 côté backend). */
async function fetchAllUsersFromApi(): Promise<any[]> {
  const first = await apiClient.get(`/users?page=1&limit=${USERS_PAGE_LIMIT}`);
  const payload = first.data?.data;
  const users: any[] = [...(payload?.users || [])];
  const totalPages = Math.min(MAX_USER_PAGES, Math.max(1, Number(payload?.pagination?.totalPages) || 1));
  for (let p = 2; p <= totalPages; p++) {
    const res = await apiClient.get(`/users?page=${p}&limit=${USERS_PAGE_LIMIT}`);
    users.push(...(res.data?.data?.users || []));
  }
  return users;
}

const MAX_VIDEO_PAGES = 60;

/** Agrégation par créateur sur le catalogue public uniquement (pas de vidéos privées). */
type PublicVideoCreatorAgg = {
  id: string;
  name: string;
  avatar: string;
  publicVideoCount: number;
  viewsSum: number;
};

/**
 * Uniquement les auteurs qui ont au moins une vidéo **publique** (liste /videos, visibility=public).
 * Les comptes avec seulement des vidéos privées n’y figurent pas → absents de la rangée.
 */
async function collectCreatorsFromPublicVideos(): Promise<Map<string, PublicVideoCreatorAgg>> {
  const map = new Map<string, PublicVideoCreatorAgg>();
  let page = 1;
  let totalPages = 1;
  do {
    const res = await apiClient.get(
      `/videos?page=${page}&limit=${VIDEOS_PAGE_LIMIT}&visibility=public`,
    );
    const data = res.data?.data;
    const videos = data?.videos || [];
    if (videos.length === 0) break;
    totalPages = Math.max(1, Number(data?.pagination?.totalPages) || 1);
    for (const v of videos) {
      const cid = v.creator_id;
      if (!cid) continue;
      const name = (v.creator_name || '').trim() || 'Créateur';
      const avatar = resolveProfileAvatar(v.creator_avatar, name, cid);
      const views = Number(v.views) || 0;
      const prev = map.get(cid);
      if (prev) {
        prev.publicVideoCount += 1;
        prev.viewsSum = Math.min(prev.viewsSum + views, 9_999_999);
      } else {
        map.set(cid, {
          id: cid,
          name,
          avatar,
          publicVideoCount: 1,
          viewsSum: views,
        });
      }
    }
    page++;
    if (page > MAX_VIDEO_PAGES) break;
  } while (page <= totalPages);
  return map;
}

/** Popularité : abonnés (Prisma `_count.following`) + engagement sur le catalogue public. */
function popularityFromUserAndVideos(
  u: { _count?: { following?: number } } | undefined,
  agg: PublicVideoCreatorAgg,
): number {
  const followers = u ? Number(u._count?.following) || 0 : 0;
  return (
    followers * 10_000 +
    Math.min(agg.viewsSum, 999_999) +
    agg.publicVideoCount * 500
  );
}

// Categories
const CATEGORIES = [
  { id: 'all', name: 'Tout', icon: 'flame' },
  { id: 'food', name: 'Cuisine', icon: 'restaurant' },
  { id: 'fashion', name: 'Mode', icon: 'shirt' },
  { id: 'music', name: 'Musique', icon: 'musical-notes' },
  { id: 'sport', name: 'Sport', icon: 'football' },
  { id: 'travel', name: 'Voyage', icon: 'airplane' },
  { id: 'tech', name: 'Tech', icon: 'laptop' },
  { id: 'beauty', name: 'Beaute', icon: 'sparkles' },
];

// Services
const SERVICES_ROW1 = [
  { id: 'food', name: 'Livraison', icon: 'fast-food', color: '#FF6B6B', route: '/services/food' },
  { id: 'transport', name: 'Transport', icon: 'car', color: '#4ECDC4', route: '/services/transport' },
  { id: 'health', name: 'Sante', icon: 'medkit', color: '#45B7D1', route: '/services/health' },
  { id: 'wallet', name: 'Wallet', icon: 'wallet', color: '#FF6B00', route: '/wallet' },
];
const SERVICES_ROW2 = [
  { id: 'education', name: 'Cours', icon: 'school', color: '#82E0AA', route: '/courses' },
  { id: 'crowdfunding', name: 'Projets', icon: 'rocket', color: '#E91E63', route: '/crowdfunding' },
  { id: 'news', name: 'Actus', icon: 'newspaper', color: '#E67E22', route: '/news' },
  { id: 'more', name: 'Tout', icon: 'apps', color: '#9B59B6', route: '/services' },
];

const formatNum = (n: number) => n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);

type ExploreTile = {
  id: string;
  image: string;
  posterUrl?: string;
  videoUrl?: string;
  type: 'reel' | 'live' | 'photo';
  views: number;
  likes: number;
  title: string;
  creator_name: string;
  creator_avatar: string;
};

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [activeCategory, setActiveCategory] = useState('all');
  const { width: screenWidth } = useWindowDimensions();
  const [exploreItems, setExploreItems] = useState<ExploreTile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [exploreError, setExploreError] = useState<string | null>(null);
  const [stories, setStories] = useState(DEFAULT_STORIES);

  const tileSize = Math.floor((screenWidth - GRID_GAP * 2) / 3);
  const tileHeight = Math.floor(tileSize * 1.35);

  // Load real videos for explore grid
  useEffect(() => {
    loadExploreVideos();
  }, []);

  useEffect(() => {
    void loadRealCreatorsAsStories();
  }, [user?.id]);

  const loadRealCreatorsAsStories = async () => {
    try {
      const aggByCreator = await collectCreatorsFromPublicVideos();
      const creatorMap = new Map<string, ExploreCreatorRow>();

      const userById = new Map<string, any>();
      try {
        const usersData = await fetchAllUsersFromApi();
        for (const u of usersData) {
          if (u?.id) userById.set(u.id, u);
        }
      } catch (e) {
        console.log('Explore stories: liste utilisateurs indisponible', e);
      }

      for (const [id, agg] of aggByCreator) {
        const u = userById.get(id);
        const name = u ? profileDisplayName(u) : agg.name;
        const avatar = u ? resolveProfileAvatar(u.profile_image, name, id) : agg.avatar;
        creatorMap.set(id, {
          id,
          name,
          avatar,
          popularity: popularityFromUserAndVideos(u, agg),
        });
      }

      const currentId = user?.id;
      const others = Array.from(creatorMap.values())
        .filter((c) => !currentId || c.id !== currentId)
        .sort((a, b) => b.popularity - a.popularity);

      const meLabel = user
        ? profileDisplayName({
            full_name: user.full_name,
            username: user.username,
            email: user.email,
          })
        : 'Moi';
      const meAvatar = user
        ? resolveProfileAvatar(user.profile_image || user.avatar, meLabel, currentId || user.id)
        : generatedAvatarFromLabel('Moi');
      const meName = 'Moi';

      const storyList = [
        { id: 'add', name: meName, avatar: meAvatar, isAdd: true, hasNew: false, isLive: false },
        ...others.map((c) => ({
          id: c.id,
          name: c.name,
          avatar: c.avatar,
          isAdd: false,
          hasNew: false,
          isLive: false,
        })),
      ];
      setStories(storyList);
    } catch (err) {
      console.log('Failed to load real creators:', err);
    }
  };

  const loadExploreVideos = async () => {
    setIsLoading(true);
    setExploreError(null);
    try {
      const response = await apiClient.get('/videos?page=1&limit=24');
      const data = response.data?.data || response.data;
      const backendVideos = data?.videos || [];
      if (backendVideos.length > 0) {
        const transformed: ExploreTile[] = backendVideos.map((v: any, i: number) => {
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

          return {
            id: v.id || `e${i}`,
            image,
            posterUrl: posterStatic,
            videoUrl: videoForFrame || absVid || absLow,
            type: (v.media_type === 'video' ? (i % 4 === 0 ? 'reel' as const : 'photo' as const) : 'photo' as const),
            views: v.views || 0,
            likes: v.likes || 0,
            title: v.title || '',
            creator_name: v.creator_name || '',
            creator_avatar: toAbsoluteMediaUrl(v.creator_avatar || '').trim(),
          };
        });
        setExploreItems(transformed);
      } else {
        setExploreItems([]);
      }
    } catch {
      setExploreItems([]);
      setExploreError('Impossible de charger les vidéos. Vérifiez la connexion et réessayez.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ExploreGridSkeleton />
      </View>
    );
  }

  // Build grid rows (3 items per row)
  const gridRows: ExploreTile[][] = [];
  for (let i = 0; i < exploreItems.length; i += 3) {
    gridRows.push(exploreItems.slice(i, i + 3));
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Decouvrir</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity testID="messages-entry" style={styles.headerBtn} onPress={() => router.push('/messages')}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color="#FFF" />
            <View style={styles.notifDot} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={24} color="#FFF" />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <TouchableOpacity style={styles.searchContainer} activeOpacity={0.8} onPress={() => router.push('/search')}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#888" />
          <Text style={styles.searchPlaceholder}>Rechercher personnes, videos, sons...</Text>
        </View>
        <View style={styles.qrBtn}>
          <Ionicons name="qr-code-outline" size={22} color="#FFF" />
        </View>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesContent}>
          {stories.map((story) => (
            <TouchableOpacity key={story.id} style={styles.storyItem} onPress={() => router.push('/stories')}>
              {story.isAdd ? (
                <View style={styles.storyAddContainer}>
                  <Image source={{ uri: story.avatar }} style={styles.storyAvatar} />
                  <View style={styles.storyAddBadge}><Ionicons name="add" size={14} color="#FFF" /></View>
                </View>
              ) : (
                <LinearGradient
                  colors={story.isLive ? ['#FF0000', '#FF4444'] : story.hasNew ? ['#FF6B00', '#FF006E'] : ['#444', '#333']}
                  style={styles.storyRing}
                >
                  <View style={styles.storyRingInner}>
                    <Image source={{ uri: story.avatar }} style={styles.storyAvatar} />
                  </View>
                  {story.isLive && (
                    <View style={styles.storyLiveBadge}><Text style={styles.storyLiveText}>LIVE</Text></View>
                  )}
                </LinearGradient>
              )}
              <Text style={styles.storyName} numberOfLines={1}>{story.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Services Mini Programs (horizontal scroll like WeChat) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.servicesContent}>
          {[...SERVICES_ROW1, ...SERVICES_ROW2].map((s) => (
            <TouchableOpacity key={s.id} style={styles.serviceItem} onPress={() => router.push(s.route as any)} activeOpacity={0.7}>
              <View style={[styles.serviceIcon, { backgroundColor: s.color + '18' }]}>
                <Ionicons name={s.icon as any} size={24} color={s.color} />
              </View>
              <Text style={styles.serviceName}>{s.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Promo Banner */}
        <TouchableOpacity style={styles.promoBanner} activeOpacity={0.8} onPress={() => router.push('/wallet')}>
          <LinearGradient colors={['#FF6B00', '#FF3D00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.promoGradient}>
            <View style={styles.promoLeft}>
              <View style={styles.promoNewBadge}><Text style={styles.promoNewText}>NOUVEAU</Text></View>
              <Text style={styles.promoTitle}>AfriWonder Pay</Text>
              <Text style={styles.promoSubtitle}>Envoyez de l'argent instantanement</Text>
            </View>
            <Ionicons name="wallet" size={40} color="rgba(255,255,255,0.3)" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Moments Feed Banner */}
        <TouchableOpacity style={styles.momentsBanner} activeOpacity={0.8} onPress={() => router.push('/feed')}>
          <LinearGradient colors={['#667eea', '#764ba2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.promoGradient}>
            <View style={styles.promoLeft}>
              <Text style={styles.promoTitle}>Moments</Text>
              <Text style={styles.promoSubtitle}>Decouvrez ce que font vos amis</Text>
            </View>
            <Ionicons name="people" size={36} color="rgba(255,255,255,0.3)" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Crowdfunding Banner */}
        <TouchableOpacity style={styles.momentsBanner} activeOpacity={0.8} onPress={() => router.push('/crowdfunding' as any)}>
          <LinearGradient colors={['#E91E63', '#FF5722']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.promoGradient}>
            <View style={styles.promoLeft}>
              <View style={styles.promoNewBadge}><Text style={styles.promoNewText}>NOUVEAU</Text></View>
              <Text style={styles.promoTitle}>Crowdfunding</Text>
              <Text style={styles.promoSubtitle}>Financez des projets africains</Text>
            </View>
            <Ionicons name="rocket" size={36} color="rgba(255,255,255,0.3)" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContent}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryPill, activeCategory === cat.id && styles.categoryPillActive]}
              onPress={() => setActiveCategory(cat.id)}
            >
              <Ionicons name={cat.icon as any} size={14} color={activeCategory === cat.id ? '#FFF' : '#888'} />
              <Text style={[styles.categoryText, activeCategory === cat.id && styles.categoryTextActive]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLeft}>
            <Ionicons name="trending-up" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Tendances</Text>
          </View>
          <TouchableOpacity><Text style={styles.seeAll}>Voir tout</Text></TouchableOpacity>
        </View>

        {exploreError ? (
          <View style={styles.exploreErrorBox}>
            <Text style={styles.exploreErrorText}>{exploreError}</Text>
            <TouchableOpacity style={styles.exploreRetryBtn} onPress={() => void loadExploreVideos()} activeOpacity={0.85}>
              <Text style={styles.exploreRetryText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {!exploreError && exploreItems.length === 0 && !isLoading ? (
          <View style={styles.exploreEmptyBox}>
            <Text style={styles.exploreEmptyText}>Aucune vidéo publique à afficher pour l&apos;instant.</Text>
          </View>
        ) : null}

        {/* Grid */}
        <View>
          {gridRows.map((row, ri) => (
            <View key={ri} style={{ width: screenWidth, height: tileHeight + GRID_GAP, overflow: 'hidden' }}>
              {row.map((item: ExploreTile, ci: number) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.9}
                  style={{
                    position: 'absolute',
                    left: ci * (tileSize + GRID_GAP),
                    top: 0,
                    width: tileSize,
                    height: tileHeight,
                    overflow: 'hidden',
                  }}
                >
                  <SmartThumbnail
                    posterUrl={(item as any).posterUrl}
                    uri={item.image}
                    videoUrl={(item as any).videoUrl}
                    fallbackImage={(item as any).creator_avatar}
                    style={{ width: tileSize, height: tileHeight }}
                    tileSize={tileSize}
                    tileHeight={tileHeight}
                  />
                  {item.type === 'reel' && (
                    <View style={styles.reelBadge}>
                      <Ionicons name="play" size={10} color="#FFF" />
                      <Text style={styles.badgeText}>Reel</Text>
                    </View>
                  )}
                  {item.type === 'live' && (
                    <View style={styles.liveBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.badgeText}>LIVE</Text>
                    </View>
                  )}
                  <View style={[styles.gridOverlay, { position: 'absolute', bottom: 0, left: 0, width: tileSize, height: 36 }]}>
                    <View style={styles.gridStat}>
                      <Ionicons name="play" size={10} color="#FFF" />
                      <Text style={styles.gridStatText}>{formatNum(item.views)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  headerActions: { flexDirection: 'row', gap: 12 },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notifDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3D00', borderWidth: 1.5, borderColor: '#000' },

  // Search
  searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 14 },
  searchPlaceholder: { flex: 1, color: '#666', fontSize: 14 },
  qrBtn: { width: 42, height: 42, backgroundColor: '#1A1A1A', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  // Stories
  storiesContent: { paddingHorizontal: 16, gap: 16, paddingBottom: 16 },
  storyItem: { alignItems: 'center', width: 68 },
  storyAddContainer: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#333', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  storyAvatar: { width: 56, height: 56, borderRadius: 28 },
  storyAddBadge: { position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' },
  storyRing: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', padding: 2.5 },
  storyRingInner: { width: 63, height: 63, borderRadius: 31.5, borderWidth: 2.5, borderColor: '#000', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  storyLiveBadge: { position: 'absolute', bottom: -2, alignSelf: 'center', backgroundColor: '#FF0000', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, borderWidth: 1.5, borderColor: '#000' },
  storyLiveText: { color: '#FFF', fontSize: 8, fontWeight: '800' },
  storyName: { color: '#CCC', fontSize: 11, marginTop: 4, textAlign: 'center' },

  // Services (horizontal scroll)
  servicesContent: { paddingHorizontal: 16, gap: 20, paddingBottom: 16 },
  serviceItem: { alignItems: 'center' as const, width: 64 },
  serviceIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 6 },
  serviceName: { color: '#CCC', fontSize: 11, fontWeight: '500' as const, textAlign: 'center' as const },

  // Promo
  promoBanner: { marginHorizontal: 16, marginBottom: 10, borderRadius: 16, overflow: 'hidden' },
  momentsBanner: { marginHorizontal: 16, marginBottom: 16, borderRadius: 16, overflow: 'hidden' },
  promoGradient: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  promoLeft: { flex: 1 },
  promoNewBadge: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 6 },
  promoNewText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  promoTitle: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  promoSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },

  // Categories
  categoriesContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 16 },
  categoryPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1A1A1A', gap: 6 },
  categoryPillActive: { backgroundColor: Colors.primary },
  categoryText: { color: '#888', fontSize: 13, fontWeight: '600' },
  categoryTextActive: { color: '#FFF' },

  // Section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  seeAll: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  exploreErrorBox: { paddingHorizontal: 16, paddingBottom: 12 },
  exploreErrorText: { color: '#FFAB91', marginBottom: 8, fontSize: 14 },
  exploreRetryBtn: { alignSelf: 'flex-start', backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  exploreRetryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  exploreEmptyBox: { paddingHorizontal: 16, paddingBottom: 12 },
  exploreEmptyText: { color: '#888', fontSize: 14 },

  // Grid
  gridContainer: { gap: GRID_GAP },
  gridRow: { flexDirection: 'row', gap: GRID_GAP },
  gridItem: { position: 'relative', overflow: 'hidden' },
  gridImage: { width: '100%', height: '100%' },
  gridOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 36, justifyContent: 'flex-end', paddingHorizontal: 6, paddingBottom: 4 },
  gridStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  gridStatText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  reelBadge: { position: 'absolute', top: 6, right: 6, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, gap: 3 },
  liveBadge: { position: 'absolute', top: 6, left: 6, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF0000', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
});
