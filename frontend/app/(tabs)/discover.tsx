import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  InteractionManager,
  Platform,
} from 'react-native';
import { Colors } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ExploreGridSkeleton } from '../../src/components/SkeletonScreens';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { toAbsoluteMediaUrl } from '../../src/utils/absoluteMediaUrl';
import { devLog } from '../../src/utils/devLog';
import { SmartThumbnail, isLikelyRecordingUrl, isVideoUrl } from '../../src/components/SmartThumbnail';
import {
  ensureVideoFrameLocalUri,
  queuePrefetchDiscoverFrames,
} from '../../src/utils/videoFrameExtractCache';
import { featureFlags } from '../../src/config/featureFlags';
import { filterCommerceShortcuts } from '../../src/discover/commerceShortcuts';

const GRID_GAP = 2;

type ExploreCreatorRow = {
  id: string;
  name: string;
  avatar: string;
  popularity: number;
};

const USERS_PAGE_LIMIT = 50;
const VIDEOS_PAGE_LIMIT = 100;
// PERF : précédemment 100 pages = jusqu'à 5000 users chargés au mount de Discover
// (timeout, ANR sur 3G, pression backend). On borne à 3 pages (150 users) — le reste
// doit venir via la barre de recherche + suggestions serveur dédiées.
const MAX_USER_PAGES = 3;

function generatedAvatarFromLabel(label: string) {
  const safe = (label || '?').trim().slice(0, 48) || '?';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(safe)}&background=FF6B00&color=fff&size=128&bold=true`;
}

const DEFAULT_STORIES = [
  {
    id: 'add',
    name: 'Moi',
    avatar: generatedAvatarFromLabel('Moi'),
    isAdd: true,
    hasNew: false,
  },
];

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

// PERF + stabilité téléphone : 1 page (100 vids) pour agréger les créateurs de la barre « stories ».
const MAX_VIDEO_PAGES = 1;

type PublicVideoCreatorAgg = {
  id: string;
  name: string;
  avatar: string;
  publicVideoCount: number;
  viewsSum: number;
};

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
        map.set(cid, { id: cid, name, avatar, publicVideoCount: 1, viewsSum: views });
      }
    }
    page++;
    if (page > MAX_VIDEO_PAGES) break;
  } while (page <= totalPages);
  return map;
}

function popularityFromUserAndVideos(
  u: { _count?: { following?: number } } | undefined,
  agg: PublicVideoCreatorAgg,
): number {
  const followers = u ? Number(u._count?.following) || 0 : 0;
  return followers * 10_000 + Math.min(agg.viewsSum, 999_999) + agg.publicVideoCount * 500;
}

/** Catégories cliquables — hashtags/thèmes tendances style « Discover » TikTok. */
const CATEGORIES = [
  { id: 'all', name: 'Tout', icon: 'flame' as const, topic: '' },
  { id: 'apprendre', name: 'Apprendre', icon: 'school' as const, topic: 'apprendre' },
  { id: 'food', name: 'Cuisine', icon: 'restaurant' as const, topic: 'cuisine' },
  { id: 'music', name: 'Musique', icon: 'musical-notes' as const, topic: 'musique' },
  { id: 'sport', name: 'Sport', icon: 'football' as const, topic: 'sport' },
  { id: 'travel', name: 'Voyage', icon: 'airplane' as const, topic: 'voyage' },
  { id: 'tech', name: 'Tech', icon: 'laptop' as const, topic: 'tech' },
  { id: 'fashion', name: 'Mode', icon: 'shirt' as const, topic: 'mode' },
];

const formatNum = (n: number) =>
  n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);

/** Évite d’afficher la photo de profil comme « miniature vidéo » si l’API la met par erreur dans `thumbnail_url`. */
function isSameAsCreatorAvatar(mediaUrl: string, creatorAbs: string) {
  const a = (mediaUrl || '').trim();
  const b = (creatorAbs || '').trim();
  if (!a || !b) return false;
  if (a === b) return true;
  const base = (u: string) => u.toLowerCase().split('?')[0].split('#')[0];
  return base(a) === base(b);
}

const pathLooksStreamManifest = (u: string) => {
  const low = (u || '').toLowerCase();
  if (low.includes('format=m3u8') || low.includes('type=m3u8')) return true;
  return /\.(m3u8|mpd)(\?|#|$)/i.test((u || '').split('?')[0] || '');
};

/**
 * Choisit une source pour `expo-video-thumbnails` : d’abord un flux **non-HLS** (souvent MP4 ou
 * CDN sans extension, cf. `isLikelyRecordingUrl`), sinon HLS. L’ancien code exigeait `isVideoUrl`
 * (fichier avec extension) sur `video_url` : sans `.mp4` explicite, on retombait sur le HLS, que
 * le natif ne décode pas ici — d’où toute la grille en gris.
 */
function pickFrameExtractUrl(absVid: string, absLow: string, absHls: string) {
  const asVideo = (u: string) => u && (isVideoUrl(u) || isLikelyRecordingUrl(u));
  for (const u of [absVid, absLow]) {
    if (!u) continue;
    if (pathLooksStreamManifest(u)) continue;
    if (asVideo(u)) return u;
  }
  for (const u of [absVid, absLow, absHls]) {
    if (!u) continue;
    if (asVideo(u)) return u;
  }
  return '';
}

type TrendingHashtag = { tag: string; count: number; countFormatted: string };

type ExploreTile = {
  id: string;
  image: string;
  posterUrl?: string;
  videoUrl?: string;
  type: 'reel' | 'photo';
  views: number;
  likes: number;
  title: string;
  creator_name: string;
  creator_avatar: string;
};

type LiveStripItem = {
  id: string;
  title?: string | null;
  viewers_count?: number | null;
  thumbnail_url?: string | null;
};

/**
 * Écran « Découvrir » — tendances du moment.
 * Répond à « Qu'est-ce qui buzz ? » : hashtags populaires, catégories cliquables,
 * lives en cours, créateurs populaires, tendances vidéo. À différencier de « Explorer »
 * (feed vertical vidéo hors bulle utilisateur).
 */
export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const commerceShortcuts = useMemo(
    () => filterCommerceShortcuts({ marketplace: featureFlags.marketplace, news: featureFlags.news }),
    []
  );
  const [activeCategory, setActiveCategory] = useState('all');
  const { width: screenWidth } = useWindowDimensions();
  const [exploreItems, setExploreItems] = useState<ExploreTile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [exploreError, setExploreError] = useState<string | null>(null);
  const [stories, setStories] = useState(DEFAULT_STORIES);
  const [liveStrip, setLiveStrip] = useState<LiveStripItem[]>([]);
  const [trendingTags, setTrendingTags] = useState<TrendingHashtag[]>([]);

  const tileSize = Math.floor((screenWidth - GRID_GAP * 2) / 3);
  const tileHeight = Math.floor(tileSize * 1.35);

  const loadRealCreatorsAsStories = useCallback(async () => {
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
        devLog('Discover stories: liste utilisateurs indisponible', e);
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

      /**
       * Stories actives (24 h) — endpoint dédié `GET /api/stories/feed-bar` :
       *  - `is_self = true` ⇒ permet d'afficher l'anneau orange autour de « Moi »
       *  - `has_unseen_story` ⇒ anneau orange (vs gris) pour les autres
       */
      const storyByUser = new Map<string, { hasStory: boolean; hasUnseen: boolean; isLive: boolean }>();
      let meHasStory = false;
      try {
        const sb = await apiClient.get('/stories/feed-bar');
        const items: { id: string; is_self: boolean; has_story: boolean; has_unseen_story: boolean; is_live: boolean }[] =
          sb.data?.data?.items || sb.data?.items || [];
        for (const it of items) {
          if (it.is_self && (it.has_story || it.is_live)) meHasStory = true;
          storyByUser.set(it.id, {
            hasStory: !!it.has_story,
            hasUnseen: !!it.has_unseen_story,
            isLive: !!it.is_live,
          });
        }
      } catch {
        /* feed-bar indisponible — on garde hasNew=false, pas bloquant */
      }

      const currentId = user?.id;
      const others = Array.from(creatorMap.values())
        .filter((c) => !currentId || c.id !== currentId)
        .sort((a, b) => b.popularity - a.popularity);

      const meLabel = user
        ? profileDisplayName({ full_name: user.full_name, username: user.username, email: user.email })
        : 'Moi';
      const meAvatar = user
        ? resolveProfileAvatar(user.profile_image || user.avatar, meLabel, currentId || user.id)
        : generatedAvatarFromLabel('Moi');

      const storyList = [
        { id: 'add', name: 'Moi', avatar: meAvatar, isAdd: true, hasNew: meHasStory },
        ...others.map((c) => {
          const meta = storyByUser.get(c.id);
          return {
            id: c.id,
            name: c.name,
            avatar: c.avatar,
            isAdd: false,
            hasNew: !!(meta && (meta.hasUnseen || meta.isLive)),
          };
        }),
      ];
      setStories(storyList);
    } catch (err) {
      devLog('Failed to load real creators:', err);
    }
  }, [user]);

  const loadDiscoverVideos = useCallback(async () => {
    setIsLoading(true);
    setExploreError(null);
    try {
      const category = CATEGORIES.find((c) => c.id === activeCategory);
      const endpoint =
        category?.topic && category.topic !== ''
          ? `/videos/topic/${encodeURIComponent(category.topic)}`
          : '/videos';
      const response = await apiClient.get(endpoint, { params: { page: 1, limit: 24 } });
      const data = response.data?.data || response.data;
      const backendVideos = data?.videos || [];
      const transformed: ExploreTile[] =
        backendVideos.length > 0
          ? backendVideos.map((v: any, i: number) => {
              const absLow = toAbsoluteMediaUrl(v.low_quality_url || v.low_quality_playback_url || '').trim();
              const absVid = toAbsoluteMediaUrl(v.video_url || '').trim();
              const absHls = toAbsoluteMediaUrl(v.hls_url || '').trim();
              const creatorAbs = toAbsoluteMediaUrl(String(v.creator_avatar || '').trim());
              /** Comme le fil Home : toute URL image côté API (pas seulement `thumbnail_url`). */
              const posterStatic = (() => {
                for (const raw of [v.thumbnail_url, v.poster_url, v.cover_url, v.preview_image_url]) {
                  const abs = toAbsoluteMediaUrl(String(raw || '').trim());
                  if (!abs) continue;
                  if (isVideoUrl(abs)) continue;
                  if (/\.(m3u8|mpd)/i.test(abs.split('?')[0] || '')) continue;
                  if (isSameAsCreatorAvatar(abs, creatorAbs)) continue;
                  return abs;
                }
                if (absLow && !isVideoUrl(absLow) && !/\.(m3u8|mpd)/i.test(absLow)) {
                  if (isSameAsCreatorAvatar(absLow, creatorAbs)) return '';
                  return absLow;
                }
                return '';
              })();
              const videoForFrame = pickFrameExtractUrl(absVid, absLow, absHls);
              /** Grille Discover : ne jamais passer l'URL vidéo comme `uri` (évite N lecteurs `expo-video`). */
              const image = posterStatic;
              return {
                id: v.id || `e${i}`,
                image,
                posterUrl: posterStatic,
                videoUrl: videoForFrame || absVid || absLow,
                type:
                  v.media_type === 'video'
                    ? i % 4 === 0
                      ? ('reel' as const)
                      : ('photo' as const)
                    : ('photo' as const),
                views: v.views || 0,
                likes: v.likes || 0,
                title: v.title || '',
                creator_name: v.creator_name || '',
                creator_avatar: creatorAbs,
              };
            })
          : [];
      /**
       * Préchauffage en arrière-plan (natif) : pas d’attente — la grille s’affiche tout de suite,
       * les miniatures arrivent au fil de l’eau.
       */
      if (transformed.length && Platform.OS !== 'web') {
        const urls = transformed.map((t) => t.videoUrl);
        const startFrameWarm = () => {
          queueMicrotask(() => {
            const cap = Platform.OS === 'android' ? 20 : 32;
            queuePrefetchDiscoverFrames(urls, cap);
            for (const t of transformed) {
              const u = (t.videoUrl || '').trim();
              if (u) void ensureVideoFrameLocalUri(u);
            }
          });
        };
        if (Platform.OS === 'android') {
          /* Après 1er rendu : moins d’I/O + décodeur en rafale (OOM / sortie du process). */
          InteractionManager.runAfterInteractions(startFrameWarm);
        } else {
          startFrameWarm();
        }
      }
      setExploreItems(transformed);
      /** Ne pas await le « live » : l’appel pouvait bloquer 1s+ avant `isLoading: false` → onglet figé. */
      void (async () => {
        try {
          const liveRes = await apiClient.get('/live', {
            params: { status: 'live', limit: 12, sortBy: 'viewers' },
          });
          const ld = liveRes.data?.data ?? liveRes.data;
          const streams = Array.isArray(ld?.streams) ? (ld.streams as LiveStripItem[]) : [];
          setLiveStrip(streams);
        } catch {
          setLiveStrip([]);
        }
      })();
    } catch {
      setExploreItems([]);
      setLiveStrip([]);
      setExploreError('Impossible de charger les vidéos. Vérifiez la connexion et réessayez.');
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory]);

  const loadTrendingHashtags = useCallback(async () => {
    try {
      const res = await apiClient.get('/videos/hashtags/trending', { params: { limit: 18 } });
      const raw = res.data?.data || res.data;
      setTrendingTags(Array.isArray(raw) ? (raw as TrendingHashtag[]) : []);
    } catch {
      setTrendingTags([]);
    }
  }, []);

  useEffect(() => {
    void loadDiscoverVideos();
  }, [loadDiscoverVideos]);

  useEffect(() => {
    const t = setTimeout(() => {
      void loadTrendingHashtags();
    }, 400);
    return () => clearTimeout(t);
  }, [loadTrendingHashtags]);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      InteractionManager.runAfterInteractions(() => {
        if (cancelled) return;
        void loadRealCreatorsAsStories();
      });
    }, 8000);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [loadRealCreatorsAsStories]);

  if (isLoading && exploreItems.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ExploreGridSkeleton />
      </View>
    );
  }

  const gridRows: ExploreTile[][] = [];
  for (let i = 0; i < exploreItems.length; i += 3) {
    gridRows.push(exploreItems.slice(i, i + 3));
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Découvrir</Text>
          <View style={styles.headerBadge}>
            <Ionicons name="flame" size={11} color="#FFF" />
            <Text style={styles.headerBadgeText}>Tendances</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity testID="messages-entry" style={styles.headerBtn} onPress={() => router.push('/(tabs)/messages')}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color="#FFF" />
            <View style={styles.notifDot} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={24} color="#FFF" />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={styles.searchContainer}
        activeOpacity={0.8}
        onPress={() => router.push('/search')}
      >
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#888" />
          <Text style={styles.searchPlaceholder}>Rechercher hashtags, sons, créateurs…</Text>
        </View>
        <View style={styles.qrBtn}>
          <Ionicons name="qr-code-outline" size={22} color="#FFF" />
        </View>
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS === 'android'}
      >
        {/* Categories — hashtags thèmes */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryPill, activeCategory === cat.id && styles.categoryPillActive]}
              onPress={() => setActiveCategory(cat.id)}
            >
              <Ionicons
                name={cat.icon}
                size={14}
                color={activeCategory === cat.id ? '#FFF' : '#888'}
              />
              <Text
                style={[
                  styles.categoryText,
                  activeCategory === cat.id && styles.categoryTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Commerce & services — aligné sur Menu + / PWA (entrée visible sans passer par le profil). */}
        <View style={styles.commerceSectionRow}>
          <Text style={styles.commerceSectionTitle}>Commerce & services</Text>
          <TouchableOpacity onPress={() => router.push('/menu-plus')} accessibilityRole="button">
            <Text style={styles.seeAll}>Tout le menu</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.servicesContent}
        >
          {commerceShortcuts.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={styles.serviceItem}
              onPress={() => router.push(s.route as never)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={s.name}
            >
              <View style={[styles.serviceIcon, { backgroundColor: s.color + '18' }]}>
                <Ionicons name={s.icon} size={24} color={s.color} />
              </View>
              <Text style={styles.serviceName} numberOfLines={2}>
                {s.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Hashtags tendances */}
        {trendingTags.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionLeft}>
                <Ionicons name="pricetag" size={18} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Hashtags tendances</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }}
            >
              {trendingTags.map((h) => (
                <TouchableOpacity
                  key={h.tag}
                  style={styles.hashtagChip}
                  onPress={() =>
                    router.push({ pathname: '/search', params: { q: `#${h.tag}` } } as never)
                  }
                >
                  <Text style={styles.hashtagText}>#{h.tag}</Text>
                  <Text style={styles.hashtagCount}>{h.countFormatted}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        ) : null}

        {/* Lives en cours */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLeft}>
            <Ionicons name="radio" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Lives</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/live')} accessibilityRole="button">
            <Text style={styles.seeAll}>Tout voir</Text>
          </TouchableOpacity>
        </View>
        {liveStrip.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 14 }}
          >
            {liveStrip.map((s) => {
              const thumb = toAbsoluteMediaUrl(String(s.thumbnail_url || '').trim());
              return (
                <TouchableOpacity
                  key={s.id}
                  style={styles.liveCardWrap}
                  onPress={() => router.push({ pathname: '/live/[id]', params: { id: s.id } } as never)}
                >
                  <View style={styles.liveCardThumb}>
                    {thumb ? (
                      <Image source={{ uri: thumb }} style={styles.gridImage} />
                    ) : (
                      <View style={styles.liveCardPlaceholder}>
                        <Ionicons name="videocam" size={28} color="#555" />
                      </View>
                    )}
                    <View style={styles.liveBadge}>
                      <View style={styles.liveBadgeDot} />
                      <Text style={styles.liveBadgeText}>LIVE</Text>
                    </View>
                  </View>
                  <Text style={styles.liveCardTitle} numberOfLines={2}>
                    {s.title || 'Live'}
                  </Text>
                  <Text style={styles.liveCardMeta} numberOfLines={1}>
                    {formatNum(Number(s.viewers_count) || 0)} spectateurs
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <Text style={styles.mutedInline}>Aucun live en cours pour l’instant.</Text>
        )}

        {/* Créateurs populaires */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLeft}>
            <Ionicons name="people" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Créateurs populaires</Text>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storiesContent}
        >
          {stories.map((story) => (
            <TouchableOpacity
              key={story.id}
              style={styles.storyItem}
              onPress={() =>
                story.isAdd
                  ? router.push('/stories')
                  : router.push({ pathname: '/user/[id]', params: { id: story.id } } as never)
              }
            >
              {story.isAdd ? (
                /**
                 * Cercle « Moi » : si une story est active, on enrobe l'avatar
                 * d'un anneau dégradé orange comme les autres ; sinon avatar nu.
                 * Le badge `+` reste toujours visible pour pouvoir ajouter une story de plus.
                 */
                story.hasNew ? (
                  <LinearGradient
                    colors={['#FF6B00', '#FF006E']}
                    style={styles.storyRing}
                  >
                    <View style={styles.storyRingInner}>
                      <Image source={{ uri: story.avatar }} style={styles.storyAvatar} />
                    </View>
                    <View style={styles.storyAddBadge}>
                      <Ionicons name="add" size={14} color="#FFF" />
                    </View>
                  </LinearGradient>
                ) : (
                  <View style={styles.storyAddContainer}>
                    <Image source={{ uri: story.avatar }} style={styles.storyAvatar} />
                    <View style={styles.storyAddBadge}>
                      <Ionicons name="add" size={14} color="#FFF" />
                    </View>
                  </View>
                )
              ) : (
                <LinearGradient
                  colors={story.hasNew ? ['#FF6B00', '#FF006E'] : ['#444', '#333']}
                  style={styles.storyRing}
                >
                  <View style={styles.storyRingInner}>
                    <Image source={{ uri: story.avatar }} style={styles.storyAvatar} />
                  </View>
                </LinearGradient>
              )}
              <Text style={styles.storyName} numberOfLines={1}>
                {story.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Promo banners */}
        <TouchableOpacity
          style={styles.promoBanner}
          activeOpacity={0.8}
          onPress={() => router.push('/wallet')}
        >
          <LinearGradient
            colors={['#FF6B00', '#FF3D00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.promoGradient}
          >
            <View style={styles.promoLeft}>
              <View style={styles.promoNewBadge}>
                <Text style={styles.promoNewText}>NOUVEAU</Text>
              </View>
              <Text style={styles.promoTitle}>AfriWonder Pay</Text>
              <Text style={styles.promoSubtitle}>Envoyez de l'argent instantanément</Text>
            </View>
            <Ionicons name="wallet" size={40} color="rgba(255,255,255,0.3)" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.momentsBanner}
          activeOpacity={0.8}
          onPress={() => router.push('/feed' as never)}
        >
          <LinearGradient
            colors={['#6C4AB6', '#4A2C8A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.promoGradient}
          >
            <View style={styles.promoLeft}>
              <Text style={styles.promoTitle}>Moments</Text>
              <Text style={styles.promoSubtitle}>Découvrez ce que font vos amis</Text>
            </View>
            <Ionicons name="people" size={40} color="rgba(255,255,255,0.35)" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.crowdfundingBanner}
          activeOpacity={0.8}
          onPress={() => router.push('/crowdfunding' as any)}
        >
          <LinearGradient
            colors={['#E91E63', '#FF5722']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.promoGradient}
          >
            <View style={styles.promoLeft}>
              <View style={styles.promoNewBadge}>
                <Text style={styles.promoNewText}>NOUVEAU</Text>
              </View>
              <Text style={styles.promoTitle}>Crowdfunding</Text>
              <Text style={styles.promoSubtitle}>Financez des projets africains</Text>
            </View>
            <Ionicons name="rocket" size={36} color="rgba(255,255,255,0.3)" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Tendances vidéos — grille 3 colonnes */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLeft}>
            <Ionicons name="trending-up" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Tendances</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/explore' as never)}>
            <Text style={styles.seeAll}>Voir le feed</Text>
          </TouchableOpacity>
        </View>

        {exploreError ? (
          <View style={styles.exploreErrorBox}>
            <Text style={styles.exploreErrorText}>{exploreError}</Text>
            <TouchableOpacity
              style={styles.exploreRetryBtn}
              onPress={() => void loadDiscoverVideos()}
              activeOpacity={0.85}
            >
              <Text style={styles.exploreRetryText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {!exploreError && exploreItems.length === 0 && !isLoading ? (
          <View style={styles.exploreEmptyBox}>
            <Text style={styles.exploreEmptyText}>
              Aucune vidéo pour cette catégorie pour l'instant.
            </Text>
          </View>
        ) : null}

        <View>
          {gridRows.map((row, ri) => (
            <View
              key={ri}
              style={{ width: screenWidth, height: tileHeight + GRID_GAP, overflow: 'hidden' }}
            >
              {row.map((item: ExploreTile, ci: number) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.9}
                  onPress={() => {
                    router.push({ pathname: '/watch/[id]', params: { id: item.id } });
                  }}
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
                    videoIdForServerThumbnail={item.id}
                    extractPosterFromVideo
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
                  <View
                    style={[
                      styles.gridOverlay,
                      { position: 'absolute', bottom: 0, left: 0, width: tileSize, height: 36 },
                    ]}
                  >
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  headerBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  headerActions: { flexDirection: 'row', gap: 12 },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notifDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3D00',
    borderWidth: 1.5,
    borderColor: '#000',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchPlaceholder: { flex: 1, color: '#666', fontSize: 14 },
  qrBtn: {
    width: 42,
    height: 42,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storiesContent: { paddingHorizontal: 16, gap: 16, paddingBottom: 16 },
  storyItem: { alignItems: 'center', width: 68 },
  storyAddContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyAvatar: { width: 56, height: 56, borderRadius: 28 },
  storyAddBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  storyRing: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', padding: 2.5 },
  storyRingInner: {
    width: 63,
    height: 63,
    borderRadius: 31.5,
    borderWidth: 2.5,
    borderColor: '#000',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyName: { color: '#CCC', fontSize: 11, marginTop: 4, textAlign: 'center' },
  commerceSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  commerceSectionTitle: {
    color: 'rgba(255,107,0,0.85)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  servicesContent: { paddingHorizontal: 16, gap: 16, paddingBottom: 16 },
  serviceItem: { alignItems: 'center' as const, width: 72 },
  serviceIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 6,
  },
  serviceName: { color: '#CCC', fontSize: 11, fontWeight: '500' as const, textAlign: 'center' as const },
  promoBanner: { marginHorizontal: 16, marginBottom: 10, borderRadius: 16, overflow: 'hidden' },
  momentsBanner: { marginHorizontal: 16, marginBottom: 10, borderRadius: 16, overflow: 'hidden' },
  crowdfundingBanner: { marginHorizontal: 16, marginBottom: 16, borderRadius: 16, overflow: 'hidden' },
  promoGradient: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  promoLeft: { flex: 1 },
  promoNewBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  promoNewText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  promoTitle: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  promoSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  categoriesContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 16 },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    gap: 6,
  },
  categoryPillActive: { backgroundColor: Colors.primary },
  categoryText: { color: '#888', fontSize: 13, fontWeight: '600' },
  categoryTextActive: { color: '#FFF' },
  hashtagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,107,0,0.12)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.35)',
    gap: 6,
  },
  hashtagText: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
  hashtagCount: { color: '#888', fontSize: 11, fontWeight: '600' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  seeAll: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  mutedInline: { color: '#666', paddingHorizontal: 16, paddingBottom: 12, fontSize: 13 },
  exploreErrorBox: { paddingHorizontal: 16, paddingBottom: 12 },
  exploreErrorText: { color: '#FFAB91', marginBottom: 8, fontSize: 14 },
  exploreRetryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  exploreRetryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  exploreEmptyBox: { paddingHorizontal: 16, paddingBottom: 12 },
  exploreEmptyText: { color: '#888', fontSize: 14 },
  liveCardWrap: { width: 120 },
  liveCardThumb: {
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    position: 'relative',
  },
  liveCardPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 160 },
  liveBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220,38,38,0.9)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
  },
  liveBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  liveCardTitle: { color: '#fff', fontSize: 11, marginTop: 6, fontWeight: '600' },
  liveCardMeta: { color: '#888', fontSize: 10, marginTop: 2 },
  gridImage: { width: '100%', height: '100%' },
  gridOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    justifyContent: 'flex-end',
    paddingHorizontal: 6,
    paddingBottom: 4,
  },
  gridStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  gridStatText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  reelBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
});
