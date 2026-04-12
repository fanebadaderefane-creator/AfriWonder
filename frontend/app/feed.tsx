import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, useWindowDimensions,
  Platform, Share, Alert, Modal, Pressable, type ImageStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { ReactionsBar, ReactionType } from '../src/components/Reactions';
import { useOfflineData } from '../src/hooks/useOfflineData';
import { FeedSkeleton } from '../src/components/SkeletonScreens';
import ReportModal from '../src/components/ReportModal';
import apiClient from '../src/api/client';
import { useAuthStore } from '../src/store/authStore';
import { Image as ExpoImage } from 'expo-image';

const GRID_GAP = 2;

/** Anciens posts : URL en http sur une page https → image bloquée (rectangle noir). */
function normalizeMomentImageUri(raw: string): string {
  let u = String(raw || '').trim();
  if (!u) return '';
  if (u.startsWith('//')) u = `https:${u}`;
  if (Platform.OS === 'web' && /^http:\/\//i.test(u)) {
    if (!/localhost|127\.0\.0\.1/i.test(u)) {
      u = u.replace(/^http:\/\//i, 'https://');
    }
  }
  try {
    if (/%25[0-9A-Fa-f]{2}/i.test(u)) {
      const once = decodeURIComponent(u);
      if (once.length > 0 && once !== u) u = once;
    }
  } catch {
    /* garder u */
  }
  return u;
}

function isLikelyRenderableUrl(u: string): boolean {
  const s = String(u || '').trim();
  if (!s || s === 'null' || s === 'undefined') return false;
  return (
    /^https?:\/\//i.test(s)
    || s.startsWith('data:')
    || s.startsWith('blob:')
    || s.startsWith('//')
  );
}

/** Image Moments avec repli si l’URL est morte (vieux post, mixed content, etc.). */
function FeedPostImage({
  uri,
  style,
  resizeMode = 'cover',
}: {
  uri: string;
  style: ImageStyle | ImageStyle[];
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}) {
  const [broken, setBroken] = useState(false);
  const clean = normalizeMomentImageUri(uri);
  if (!clean || !isLikelyRenderableUrl(clean) || broken) {
    return (
      <View style={[style, { backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="image-outline" size={32} color="#444" />
      </View>
    );
  }
  const contentFit =
    resizeMode === 'contain' ? 'contain'
      : resizeMode === 'stretch' ? 'fill'
        : resizeMode === 'center' ? 'contain'
          : 'cover';
  return (
    <ExpoImage
      source={{ uri: clean }}
      style={style}
      contentFit={contentFit}
      transition={0}
      onError={() => setBroken(true)}
    />
  );
}

interface Post {
  id: string;
  /** Auteur (pour savoir si le menu « Supprimer » s’affiche). */
  authorId: string;
  user: { name: string; avatar: string; verified: boolean; };
  timeAgo: string;
  content: string;
  images: string[];
  reactions: Record<string, number>;
  totalReactions: number;
  comments: number;
  shares: number;
  location?: string;
}

type MomentsFeedPayload = { posts: Post[]; loaded: boolean };

/** Anneau Stories / Live en tête du fil Moments (données réelles). */
interface MomentStoryRing {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  isAdd: boolean;
  hasNew: boolean;
  isLive: boolean;
  liveStreamId: string | null;
  /** Aperçu image (ex. 1re image d’un moment) pour l’écran Stories. */
  previewUrl?: string;
}

const EMPTY_REACTIONS = { like: 0, love: 0, wow: 0, haha: 0, sad: 0, angry: 0 };

function defaultAvatarForUserId(userId: string): string {
  const q = encodeURIComponent(userId.slice(0, 12) || 'user');
  return `https://ui-avatars.com/api/?name=${q}&background=1a1a1a&color=fff&size=128`;
}

function mapLiveRowToRing(row: Record<string, unknown>): MomentStoryRing | null {
  const creator = (row.creator as Record<string, unknown>) || {};
  const creatorId = String(row.creator_id ?? creator.id ?? '').trim();
  const streamId = String(row.id ?? '').trim();
  if (!creatorId || !streamId) return null;
  const name = String(creator.full_name || creator.username || row.creator_name || 'Live').trim() || 'Live';
  const avatarRaw = String(creator.profile_image ?? '').trim();
  const avatar = avatarRaw || defaultAvatarForUserId(creatorId);
  const thumb = String(row.thumbnail_url ?? '').trim();
  return {
    id: `live-${streamId}`,
    userId: creatorId,
    name,
    avatar,
    isAdd: false,
    hasNew: true,
    isLive: true,
    liveStreamId: streamId,
    previewUrl: thumb || undefined,
  };
}

/** Lives en premier (tri spectateurs côté API), puis auteurs des moments (ordre du fil). */
function buildMomentStoryRings(
  posts: Post[],
  liveRows: Record<string, unknown>[],
  me: { id?: string; profile_image?: string; avatar?: string; full_name?: string; username?: string } | null
): MomentStoryRing[] {
  const uid = normalizeId(me?.id);
  const selfAvatar =
    String(me?.profile_image || me?.avatar || '').trim()
    || (uid ? defaultAvatarForUserId(uid) : 'https://i.pravatar.cc/150?img=10');
  const add: MomentStoryRing = {
    id: 'add',
    userId: uid || 'me',
    name: 'Votre Story',
    avatar: selfAvatar,
    isAdd: true,
    hasNew: false,
    isLive: false,
    liveStreamId: null,
  };

  const seen = new Set<string>();
  const rings: MomentStoryRing[] = [];

  for (const row of liveRows) {
    const ring = mapLiveRowToRing(row);
    if (!ring || seen.has(ring.userId)) continue;
    seen.add(ring.userId);
    rings.push(ring);
  }

  posts.forEach((p) => {
    const aid = normalizeId(p.authorId);
    if (!aid || seen.has(aid)) return;
    seen.add(aid);
    const preview = p.images[0] ? normalizeMomentImageUri(p.images[0]) : '';
    rings.push({
      id: `author-${aid}`,
      userId: aid,
      name: p.user.name,
      avatar: p.user.avatar || defaultAvatarForUserId(aid),
      isAdd: false,
      hasNew: true,
      isLive: false,
      liveStreamId: null,
      previewUrl: preview || undefined,
    });
  });

  return [add, ...rings].slice(0, 24);
}

function formatTimeAgo(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 45) return "À l'instant";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} j`;
  return d.toLocaleDateString('fr-FR');
}

function rowImageUrl(row: Record<string, unknown>): string {
  return String(
    row.image_url
    || row.imageUrl
    || row.url
    || row.file_url
    || row.fileUrl
    || row.src
    || ''
  ).trim();
}

/** `images` peut être un tableau JSON ou une chaîne JSON (selon clients / proxies). */
function parseImagesField(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return [];
    try {
      const j = JSON.parse(s) as unknown;
      return Array.isArray(j) ? (j as Record<string, unknown>[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** URLs du carrousel : snake_case + camelCase, ordre `position`. */
function collectPostImageUrls(p: Record<string, unknown>): string[] {
  const rows = parseImagesField(p.images ?? p.Images ?? p.post_images);
  rows.sort((a, b) => {
    const pa = Number(a.position ?? a.Position ?? 0);
    const pb = Number(b.position ?? b.Position ?? 0);
    return pa - pb;
  });
  const fromRows = rows.map(rowImageUrl).filter((u) => isLikelyRenderableUrl(u));
  const legacyRaw = String(p.image_url || p.imageUrl || '').trim();
  const legacy = isLikelyRenderableUrl(legacyRaw) ? legacyRaw : '';
  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const u of fromRows) {
    if (!seen.has(u)) {
      seen.add(u);
      ordered.push(u);
    }
  }
  if (legacy && !seen.has(legacy)) ordered.unshift(legacy);
  const merged = ordered.length > 0 ? ordered : (legacy ? [legacy] : []);
  return merged.map(normalizeMomentImageUri).filter(isLikelyRenderableUrl);
}

/** Identifiant auteur du post (API snake_case / camelCase / objet user). */
function extractPostAuthorId(p: Record<string, unknown>): string {
  const u = (p.user as Record<string, unknown>) || {};
  const raw =
    p.user_id ?? p.userId ?? p.author_id ?? p.authorId
    ?? u.id ?? u.user_id ?? u.userId;
  return String(raw ?? '').trim();
}

function normalizeId(s: string | undefined | null): string {
  return String(s ?? '').trim();
}

function mapApiPostToFeedPost(p: Record<string, unknown>): Post {
  const user = (p.user as Record<string, unknown>) || {};
  const name = String(user.full_name || user.username || 'Utilisateur').trim() || 'Utilisateur';
  const avatar = String(user.profile_image || user.profileImage || '').trim() || 'https://i.pravatar.cc/150?img=10';
  const authorId = extractPostAuthorId(p);
  const images = collectPostImageUrls(p);
  const created =
    typeof p.created_at === 'string' ? p.created_at
      : typeof p.createdAt === 'string' ? p.createdAt
        : undefined;
  return {
    id: String(p.id),
    authorId,
    user: { name, avatar, verified: false },
    timeAgo: formatTimeAgo(created),
    content: String(p.text || '').trim(),
    images,
    reactions: { ...EMPTY_REACTIONS },
    totalReactions: 0,
    comments: 0,
    shares: 0,
    location: undefined,
  };
}

/** Référence stable pour `useOfflineData` (évite rechargement à chaque render). */
const MOMENTS_FEED_FALLBACK: MomentsFeedPayload = { posts: [], loaded: true };

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [postReactions, setPostReactions] = useState<Record<string, ReactionType>>({});
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  /** Menu ⋯ : plusieurs options (web + natif), pas un seul confirm navigateur. */
  const [postMenuPost, setPostMenuPost] = useState<Post | null>(null);
  /** Signalement avec raison (ReportModal → /moderation/report). */
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [liveStreamRows, setLiveStreamRows] = useState<Record<string, unknown>[]>([]);

  const fetchActiveLives = useCallback(async () => {
    try {
      const res = await apiClient.get('/live', {
        params: { status: 'live', sortBy: 'viewers', limit: 24 },
      });
      const body = res.data as Record<string, unknown> | undefined;
      const inner = (body?.data ?? body) as Record<string, unknown> | undefined;
      const streams = Array.isArray(inner?.streams) ? (inner.streams as Record<string, unknown>[]) : [];
      setLiveStreamRows(streams);
    } catch {
      setLiveStreamRows([]);
    }
  }, []);

  const fetchMomentsFeed = useCallback(async (): Promise<MomentsFeedPayload> => {
    const res = await apiClient.get('/posts', {
      params: { page: 1, limit: 30 },
    });
    const body = res.data as Record<string, unknown> | undefined;
    const inner = (body?.data ?? body) as Record<string, unknown> | undefined;
    const raw = Array.isArray(inner?.posts) ? (inner.posts as Record<string, unknown>[]) : [];
    const posts = raw.map((row) => mapApiPostToFeedPost(row));
    return { posts, loaded: true };
  }, []);

  const { data: feedData, isLoading, isOffline, refresh } = useOfflineData<MomentsFeedPayload>({
    cacheKey: 'moments_feed_api_v3',
    fallbackData: MOMENTS_FEED_FALLBACK,
    fetcher: fetchMomentsFeed,
    ttl: 1000 * 60 * 2,
    autoRefresh: true,
  });

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void fetchActiveLives();
    }, [refresh, fetchActiveLives])
  );

  const displayPosts = feedData.posts;

  const momentStoryRings = useMemo(
    () => buildMomentStoryRings(displayPosts, liveStreamRows, user),
    [displayPosts, liveStreamRows, user]
  );

  const onMomentRingPress = useCallback((ring: MomentStoryRing) => {
    if (ring.isAdd) {
      router.push('/stories');
      return;
    }
    if (ring.isLive && ring.liveStreamId) {
      router.push(`/live/${ring.liveStreamId}` as const);
      return;
    }
    router.push({
      pathname: '/stories',
      params: {
        userId: ring.userId,
        userName: ring.name,
        userAvatar: ring.avatar,
        ...(ring.previewUrl ? { previewUrl: encodeURIComponent(ring.previewUrl) } : {}),
      },
    } as const);
  }, []);

  const handleReaction = useCallback((postId: string, reaction: ReactionType) => {
    setPostReactions(prev => ({ ...prev, [postId]: reaction }));
  }, []);

  const handleMomentComment = useCallback((post: Post) => {
    const body =
      'Les commentaires sur chaque moment seront disponibles ici prochainement. En attendant, ouvrez la messagerie.';
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
      if (window.confirm(`${body}\n\nAller aux messages ?`)) {
        router.push('/messages');
      }
      return;
    }
    Alert.alert('Commentaires', body, [
      { text: 'OK', style: 'cancel' },
      { text: 'Messages', onPress: () => router.push('/messages') },
    ]);
  }, []);

  const performDeletePost = useCallback(async (post: Post) => {
    try {
      await apiClient.delete(`/posts/${encodeURIComponent(post.id)}`);
      setPostReactions((prev) => {
        const next = { ...prev };
        delete next[post.id];
        return next;
      });
      await refresh();
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert('Publication supprimée.');
      } else {
        Alert.alert('Supprimé', 'Votre publication a été supprimée.');
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const msg = err.response?.data?.error?.message || err.message || 'Impossible de supprimer cette publication.';
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(msg);
      } else {
        Alert.alert('Erreur', msg);
      }
    }
  }, [refresh]);

  const closePostMenu = useCallback(() => setPostMenuPost(null), []);

  const openPostMenu = useCallback((post: Post) => {
    setPostMenuPost(post);
  }, []);

  const viewerId = normalizeId(user?.id);
  const menuAuthorId = postMenuPost ? normalizeId(postMenuPost.authorId) : '';
  /** Uniquement l’auteur du post voit Modifier / Supprimer (ids normalisés). */
  const postMenuMine = Boolean(
    postMenuPost
    && isAuthenticated
    && viewerId.length > 0
    && menuAuthorId.length > 0
    && viewerId === menuAuthorId
  );

  const confirmDeleteInBrowser = useCallback((post: Post) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
      if (window.confirm('Supprimer définitivement cette publication ?')) {
        void performDeletePost(post);
      }
      return;
    }
    Alert.alert(
      'Confirmer la suppression',
      'Cette action est définitive.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => void performDeletePost(post) },
      ]
    );
  }, [performDeletePost]);

  const handleMomentShare = useCallback(async (post: Post) => {
    const snippet = (post.content || 'Publication AfriWonder').trim().slice(0, 280);
    const msg = `${post.user.name} · AfriWonder Moments\n${snippet}`;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
        const nav = navigator as { share?: (data: { title?: string; text?: string }) => Promise<void> };
        if (typeof nav.share === 'function') {
          await nav.share({ title: 'AfriWonder', text: msg });
          return;
        }
      }
      await Share.share({ message: msg, title: 'AfriWonder' });
    } catch (e: unknown) {
      const err = e as { message?: string };
      if (String(err?.message || '').toLowerCase().includes('cancel')) return;
      Alert.alert('Partager', msg);
    }
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Moments</Text>
          <View style={styles.headerRight}>
            <View style={{ width: 40 }} />
          </View>
        </View>
        <FeedSkeleton />
      </View>
    );
  }

  /** Même largeur que la carte : évite l’image « plein écran » déconnectée du texte (effet bannière). */
  const postCardOuterGap = 12;
  const postCardWidth = Math.max(0, screenWidth - postCardOuterGap * 2);

  const renderImages = (images: string[], _postId: string, imgWidth: number) => {
    if (images.length === 0) return null;
    if (imgWidth < 40) return null;

    if (images.length === 1) {
      return (
        <FeedPostImage uri={images[0]} style={{ width: imgWidth, height: imgWidth * 0.65 }} resizeMode="cover" />
      );
    }

    if (images.length === 2) {
      const half = (imgWidth - GRID_GAP) / 2;
      const h = half * 1.2;
      // Flux horizontal (évite la 2e image invisible sur RN Web avec absolu + overflow).
      return (
        <View style={{ flexDirection: 'row', width: imgWidth, height: h }}>
          <FeedPostImage uri={images[0]} style={{ width: half, height: h, marginRight: GRID_GAP }} resizeMode="cover" />
          <FeedPostImage uri={images[1]} style={{ width: half, height: h }} resizeMode="cover" />
        </View>
      );
    }

    // 3+ images: first large, rest in column
    const mainW = imgWidth * 0.65;
    const sideW = imgWidth - mainW - GRID_GAP;
    const mainH = imgWidth * 0.6;
    const sideH = (mainH - GRID_GAP) / 2;
    const remaining = images.length - 3;

    return (
      <View style={{ width: imgWidth, height: mainH, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: 0, top: 0, width: mainW, height: mainH }}>
          <FeedPostImage uri={images[0]} style={{ width: mainW, height: mainH }} resizeMode="cover" />
        </View>
        <View style={{ position: 'absolute', left: mainW + GRID_GAP, top: 0, width: sideW, height: sideH }}>
          <FeedPostImage uri={images[1]} style={{ width: sideW, height: sideH }} resizeMode="cover" />
        </View>
        <View style={{ position: 'absolute', left: mainW + GRID_GAP, top: sideH + GRID_GAP, width: sideW, height: sideH }}>
          <FeedPostImage uri={images[2]} style={{ width: sideW, height: sideH }} resizeMode="cover" />
          {remaining > 0 && (
            <View style={styles.moreOverlay}>
              <Text style={styles.moreText}>+{remaining}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Moments</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => Alert.alert('Recherche', 'Recherche dans Moments : bientôt disponible.')}
            accessibilityLabel="Recherche"
          >
            <Ionicons name="search-outline" size={22} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/messages')}>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#FFF" />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Offline Banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={16} color="#FFF" />
          <Text style={styles.offlineText}>Mode hors ligne — donnees en cache</Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        removeClippedSubviews={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 56 }}
      >
        {/* Stories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storiesContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {momentStoryRings.map((story) => (
            <TouchableOpacity
              key={story.id}
              style={styles.storyItem}
              onPress={() => onMomentRingPress(story)}
              accessibilityLabel={story.isAdd ? 'Votre story' : story.isLive ? `${story.name} en direct` : `Story ${story.name}`}
            >
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
              <Text style={styles.storyName} numberOfLines={1}>{story.isAdd ? 'Votre Story' : story.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Create Post */}
        <View style={styles.createPost}>
          <Image
            source={{
              uri: String(user?.profile_image || user?.avatar || '').trim()
                || (viewerId ? defaultAvatarForUserId(viewerId) : 'https://i.pravatar.cc/150?img=10'),
            }}
            style={styles.createAvatar}
          />
          <TouchableOpacity style={styles.createInput} onPress={() => router.push('/(tabs)/create')}>
            <Text style={styles.createPlaceholder}>Quoi de neuf ?</Text>
          </TouchableOpacity>
          <View style={styles.createActions}>
            <TouchableOpacity style={styles.createActionBtn}>
              <Ionicons name="image" size={22} color="#4CAF50" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.createActionBtn}>
              <Ionicons name="videocam" size={22} color="#FF6B00" />
            </TouchableOpacity>
          </View>
        </View>

        {displayPosts.length === 0 && !isLoading && (
          <View style={styles.emptyMoments}>
            <Ionicons name="newspaper-outline" size={40} color="#555" />
            <Text style={styles.emptyMomentsText}>Aucun moment pour l\u2019instant</Text>
          </View>
        )}

        {/* Posts */}
        {displayPosts.map((post) => (
          <View key={post.id} style={[styles.postCard, { width: postCardWidth, alignSelf: 'center' }]}>
            {/* Post Header */}
            <View style={styles.postHeader}>
              <TouchableOpacity style={styles.postUserRow} activeOpacity={0.7}>
                <Image source={{ uri: post.user.avatar }} style={styles.postAvatar} />
                <View>
                  <View style={styles.postNameRow}>
                    <Text style={styles.postName}>{post.user.name}</Text>
                    {post.user.verified && <Ionicons name="checkmark-circle" size={14} color="#3897F0" />}
                  </View>
                  <View style={styles.postMetaRow}>
                    <Text style={styles.postTime}>{post.timeAgo}</Text>
                    {post.location && (
                      <><Text style={styles.postTime}> · </Text>
                      <Ionicons name="location" size={12} color="#888" />
                      <Text style={styles.postLocation}>{post.location}</Text></>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.postMenuBtn}
                onPress={() => openPostMenu(post)}
                accessibilityLabel="Menu publication"
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#888" />
              </TouchableOpacity>
            </View>

            {/* Médias puis légende (une seule barre d’actions par carte) */}
            {renderImages(post.images, post.id, postCardWidth)}
            {!!post.content.trim() && (
              <Text style={styles.postContent}>{post.content}</Text>
            )}

            <View style={styles.reactionsWrap}>
              <ReactionsBar
                currentReaction={postReactions[post.id] || null}
                onReact={(reaction) => handleReaction(post.id, reaction)}
                counts={post.reactions}
                totalCount={post.totalReactions}
                onCommentPress={() => handleMomentComment(post)}
                onSharePress={() => void handleMomentShare(post)}
              />
            </View>

            {/* Comments & Shares Count */}
            <View style={styles.engagementRow}>
              <Text style={[styles.engagementText, { flex: 1 }]} numberOfLines={1}>
                {post.comments} commentaires
              </Text>
              <Text style={[styles.engagementText, styles.engagementTextRight]} numberOfLines={1}>
                {post.shares} partages
              </Text>
            </View>
          </View>
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>

      <Modal
        visible={postMenuPost != null}
        transparent
        animationType="fade"
        onRequestClose={closePostMenu}
      >
        <Pressable style={styles.postMenuBackdrop} onPress={closePostMenu} accessibilityLabel="Fermer le menu">
          <Pressable style={styles.postMenuSheet} onPress={(e) => e?.stopPropagation?.()}>
            <View style={styles.postMenuGrab} />
            <Text style={styles.postMenuTitle}>Options</Text>
            {!isAuthenticated && postMenuPost && (
              <>
                <TouchableOpacity
                  style={styles.postMenuRow}
                  onPress={() => {
                    closePostMenu();
                    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
                      if (window.confirm('Pour signaler une publication, connectez-vous. Aller à la connexion ?')) {
                        router.push('/(auth)/login');
                      }
                    } else {
                      Alert.alert(
                        'Signaler',
                        'Connectez-vous pour signaler une publication.',
                        [
                          { text: 'Annuler', style: 'cancel' },
                          { text: 'Se connecter', onPress: () => router.push('/(auth)/login') },
                        ]
                      );
                    }
                  }}
                >
                  <Ionicons name="flag-outline" size={22} color="#EEE" style={styles.postMenuIcon} />
                  <Text style={styles.postMenuRowText}>Signaler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.postMenuRow}
                  onPress={() => {
                    closePostMenu();
                    router.push('/(auth)/login');
                  }}
                >
                  <Ionicons name="log-in-outline" size={22} color="#EEE" style={styles.postMenuIcon} />
                  <Text style={styles.postMenuRowText}>Se connecter</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.postMenuRowMuted} onPress={closePostMenu}>
                  <Text style={styles.postMenuRowMutedText}>Fermer</Text>
                </TouchableOpacity>
              </>
            )}
            {isAuthenticated && postMenuPost && postMenuMine && (
              <>
                <TouchableOpacity
                  style={styles.postMenuRow}
                  onPress={() => {
                    const p = postMenuPost;
                    closePostMenu();
                    void handleMomentShare(p);
                  }}
                >
                  <Ionicons name="share-outline" size={22} color="#EEE" style={styles.postMenuIcon} />
                  <Text style={styles.postMenuRowText}>Partager</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.postMenuRow}
                  onPress={() => {
                    const p = postMenuPost;
                    closePostMenu();
                    handleMomentComment(p);
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={22} color="#EEE" style={styles.postMenuIcon} />
                  <Text style={styles.postMenuRowText}>Commentaires</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.postMenuRow}
                  onPress={() => {
                    closePostMenu();
                    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
                      window.alert('Modification de publication : bientôt disponible.');
                    } else {
                      Alert.alert('Modifier', 'Bientôt disponible.');
                    }
                  }}
                >
                  <Ionicons name="create-outline" size={22} color="#EEE" style={styles.postMenuIcon} />
                  <Text style={styles.postMenuRowText}>Modifier</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.postMenuRow}
                  onPress={() => {
                    const p = postMenuPost;
                    closePostMenu();
                    confirmDeleteInBrowser(p);
                  }}
                >
                  <Ionicons name="trash-outline" size={22} color="#FF6B6B" style={styles.postMenuIcon} />
                  <Text style={[styles.postMenuRowText, styles.postMenuDestructive]}>Supprimer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.postMenuRowMuted} onPress={closePostMenu}>
                  <Text style={styles.postMenuRowMutedText}>Fermer</Text>
                </TouchableOpacity>
              </>
            )}
            {isAuthenticated && postMenuPost && !postMenuMine && (
              <>
                <TouchableOpacity
                  style={styles.postMenuRow}
                  onPress={() => {
                    const p = postMenuPost;
                    closePostMenu();
                    void handleMomentShare(p);
                  }}
                >
                  <Ionicons name="share-outline" size={22} color="#EEE" style={styles.postMenuIcon} />
                  <Text style={styles.postMenuRowText}>Partager</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.postMenuRow}
                  onPress={() => {
                    const p = postMenuPost;
                    closePostMenu();
                    handleMomentComment(p);
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={22} color="#EEE" style={styles.postMenuIcon} />
                  <Text style={styles.postMenuRowText}>Commentaires</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.postMenuRow}
                  onPress={() => {
                    const p = postMenuPost;
                    closePostMenu();
                    if (p?.id) setReportPostId(p.id);
                  }}
                >
                  <Ionicons name="flag-outline" size={22} color="#EEE" style={styles.postMenuIcon} />
                  <Text style={styles.postMenuRowText}>Signaler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.postMenuRowMuted} onPress={closePostMenu}>
                  <Text style={styles.postMenuRowMutedText}>Fermer</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <ReportModal
        visible={reportPostId != null}
        onClose={() => setReportPostId(null)}
        targetType="post"
        targetId={reportPostId ?? ''}
        useModerationEndpoint
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  headerBtn: { padding: 10 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  notifDot: {
    position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF006E',
  },
  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#222', paddingVertical: 8, paddingHorizontal: 12,
  },
  offlineText: { color: '#CCC', fontSize: 12 },
  storiesContent: { paddingHorizontal: 12, paddingVertical: 12, gap: 4 },
  storyItem: { alignItems: 'center', marginRight: 14, width: 72 },
  storyRing: { padding: 2, borderRadius: 40 },
  storyRingInner: { backgroundColor: '#0A0A0A', borderRadius: 36, padding: 2 },
  storyAvatar: { width: 64, height: 64, borderRadius: 32 },
  storyAddContainer: { position: 'relative' },
  storyAddBadge: {
    position: 'absolute', bottom: 0, right: 0, backgroundColor: '#FF006E', width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#0A0A0A',
  },
  storyLiveBadge: {
    position: 'absolute', bottom: -2, alignSelf: 'center', backgroundColor: '#FF0000', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  storyLiveText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  storyName: { color: '#AAA', fontSize: 11, marginTop: 6, maxWidth: 72, textAlign: 'center' },
  createPost: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', gap: 10,
  },
  createAvatar: { width: 40, height: 40, borderRadius: 20 },
  createInput: {
    flex: 1, backgroundColor: '#1a1a1a', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
  },
  createPlaceholder: { color: '#666', fontSize: 14 },
  createActions: { flexDirection: 'row', gap: 4 },
  createActionBtn: { padding: 6 },
  postCard: {
    marginTop: 10,
    backgroundColor: '#121212',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    overflow: 'hidden',
    paddingBottom: 8,
  },
  /** Au-dessus du scroll imbriqué (stories) sur le web, garde les taps sur Aimer / Commenter / Partager. */
  reactionsWrap: { zIndex: 2, elevation: 2 },
  postHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 12 },
  postUserRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  postAvatar: { width: 40, height: 40, borderRadius: 20 },
  postNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  postName: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  postMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  postTime: { color: '#888', fontSize: 12 },
  postLocation: { color: '#888', fontSize: 12, marginLeft: 2 },
  postMenuBtn: { padding: 8, zIndex: 10, elevation: 10 },
  postContent: { color: '#EEE', fontSize: 15, lineHeight: 22, paddingHorizontal: 12, marginTop: 10, marginBottom: 10 },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  moreText: { color: '#FFF', fontSize: 22, fontWeight: '700' },
  engagementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingRight: 14,
    paddingBottom: 8,
    marginTop: 4,
    gap: 8,
  },
  engagementText: { color: '#888', fontSize: 12 },
  engagementTextRight: { color: '#888', fontSize: 12, textAlign: 'right' },
  emptyMoments: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyMomentsText: { color: '#888', fontSize: 15, marginTop: 12, textAlign: 'center' },
  postMenuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  postMenuSheet: {
    backgroundColor: '#161616',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderColor: '#2a2a2a',
    maxHeight: '85%',
  },
  postMenuGrab: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444',
    marginTop: 10,
    marginBottom: 6,
  },
  postMenuTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 4,
  },
  postMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2a2a2a',
  },
  postMenuIcon: { marginRight: 14 },
  postMenuRowText: { color: '#EEE', fontSize: 16 },
  postMenuDestructive: { color: '#FF6B6B' },
  postMenuRowMuted: {
    marginTop: 6,
    paddingVertical: 14,
    alignItems: 'center',
  },
  postMenuRowMutedText: { color: '#888', fontSize: 16, fontWeight: '600' },
});
