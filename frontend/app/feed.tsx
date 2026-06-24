import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, useWindowDimensions,
  Platform, Share, Alert, Modal, Pressable, type ImageStyle, TextInput, FlatList,
  KeyboardAvoidingView, ActivityIndicator,
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
import { getAlertMessageForCaughtError } from '../src/utils/userFacingError';
import { useAuthStore } from '../src/store/authStore';
import { Image as ExpoImage } from 'expo-image';
import { profileAvatarUri, uiAvatarFromSeed } from '../src/utils/avatarFallback';
import {
  collectPostImageUrls,
  isLikelyRenderableMomentUrl,
  momentPostIsDisplayable,
  normalizeMomentFeedImageUrl,
} from '../src/moments/momentFeedMedia';
import { momentRowIsDisplayable } from '../src/moments/momentFeedMediaCore';

const GRID_GAP = 2;

/** Image Moments — masquée si URL morte (pas de grand rectangle gris). */
function FeedPostImage({
  uri,
  style,
  resizeMode = 'cover',
  onBroken,
}: {
  uri: string;
  style: ImageStyle | ImageStyle[];
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  onBroken?: () => void;
}) {
  const [broken, setBroken] = useState(false);
  const clean = normalizeMomentFeedImageUrl(uri);
  if (!clean || !isLikelyRenderableMomentUrl(uri) || broken) {
    return null;
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
      onError={() => {
        setBroken(true);
        onBroken?.();
      }}
    />
  );
}

interface Post {
  id: string;
  /** Auteur (pour savoir si le menu « Supprimer » s’affiche). */
  authorId: string;
  /** Publication issue du fil photo (Video `media_type` image) — API commentaires / suppression différentes. */
  momentSource?: 'post' | 'video';
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

type MomentCommentRow = {
  id: string;
  content: string;
  parent_id?: string | null;
  created_at?: string;
  updated_at?: string;
  reactions_count?: number;
  reaction_counts?: Record<string, number>;
  my_reaction?: string | null;
  user_id?: string;
  replies?: MomentCommentRow[];
  user?: { id?: string; full_name?: string; username?: string; profile_image?: string };
};

type MomentsFeedPayload = { posts: Post[]; loaded: boolean };

/** Anneau Stories en tête du fil Moments (données réelles). */
interface MomentStoryRing {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  isAdd: boolean;
  hasNew: boolean;
  /** Aperçu image (ex. 1re image d’un moment) pour l’écran Stories. */
  previewUrl?: string;
}

const EMPTY_REACTIONS = { like: 0, love: 0, wow: 0, haha: 0, sad: 0, angry: 0 };

function defaultAvatarForUserId(userId: string): string {
  return uiAvatarFromSeed(userId.slice(0, 12) || 'user');
}

function buildMomentStoryRings(
  posts: Post[],
  me: { id?: string; profile_image?: string; avatar?: string; full_name?: string; username?: string } | null
): MomentStoryRing[] {
  const uid = normalizeId(me?.id);
  const selfAvatar =
    String(me?.profile_image || me?.avatar || '').trim()
    || (uid ? defaultAvatarForUserId(uid) : uiAvatarFromSeed('Moi'));
  const add: MomentStoryRing = {
    id: 'add',
    userId: uid || 'me',
    name: 'Votre Story',
    avatar: selfAvatar,
    isAdd: true,
    hasNew: false,
  };

  const seen = new Set<string>();
  const rings: MomentStoryRing[] = [];

  posts.forEach((p) => {
    const aid = normalizeId(p.authorId);
    if (!aid || seen.has(aid)) return;
    seen.add(aid);
    const preview = p.images[0] ? normalizeMomentFeedImageUrl(p.images[0]) : '';
    rings.push({
      id: `author-${aid}`,
      userId: aid,
      name: p.user.name,
      avatar: p.user.avatar || defaultAvatarForUserId(aid),
      isAdd: false,
      hasNew: true,
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
  const avatar = profileAvatarUri(
    String(user.profile_image || user.profileImage || '').trim(),
    name,
  );
  const authorId = extractPostAuthorId(p);
  const images = collectPostImageUrls(p);
  const created =
    typeof p.created_at === 'string' ? p.created_at
      : typeof p.createdAt === 'string' ? p.createdAt
        : undefined;
  const countRaw = p as { _count?: { comments?: number }; comments_count?: number; commentsCount?: number };
  const commentsCount =
    typeof countRaw._count?.comments === 'number'
      ? countRaw._count.comments
      : Number(countRaw.comments_count ?? countRaw.commentsCount ?? 0) || 0;

  const fromVideo =
    p.moment_from_video === true
    || p.momentFromVideo === true
    || String(p.moment_from_video || '').toLowerCase() === 'true';

  return {
    id: String(p.id),
    authorId,
    momentSource: fromVideo ? 'video' : 'post',
    user: { name, avatar, verified: false },
    timeAgo: formatTimeAgo(created),
    content: String(p.text || '').trim(),
    images,
    reactions: { ...EMPTY_REACTIONS },
    totalReactions: 0,
    comments: commentsCount,
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
  const [reportTarget, setReportTarget] = useState<{ id: string; contentType: 'post' | 'video' } | null>(null);
  const [commentsModalPost, setCommentsModalPost] = useState<Post | null>(null);
  const [commentsList, setCommentsList] = useState<MomentCommentRow[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [replyingToComment, setReplyingToComment] = useState<{ id: string; label: string } | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);

  const fetchMomentsFeed = useCallback(async (): Promise<MomentsFeedPayload> => {
    const res = await apiClient.get('/posts', {
      params: { page: 1, limit: 30 },
    });
    const body = res.data as Record<string, unknown> | undefined;
    const inner = (body?.data ?? body) as Record<string, unknown> | undefined;
    const raw = Array.isArray(inner?.posts) ? (inner.posts as Record<string, unknown>[]) : [];
    const posts = raw
      .filter((row) => momentRowIsDisplayable(row))
      .map((row) => mapApiPostToFeedPost(row))
      .filter((p) => momentPostIsDisplayable(p.content, p.images));
    return { posts, loaded: true };
  }, []);

  const { data: feedData, isLoading, isOffline, refresh } = useOfflineData<MomentsFeedPayload>({
    cacheKey: 'moments_feed_api_v6',
    fallbackData: MOMENTS_FEED_FALLBACK,
    fetcher: fetchMomentsFeed,
    ttl: 1000 * 60 * 2,
    autoRefresh: true,
  });

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(() => new Set());

  const markPostHidden = useCallback((postId: string) => {
    setHiddenPostIds((prev) => {
      if (prev.has(postId)) return prev;
      const next = new Set(prev);
      next.add(postId);
      return next;
    });
  }, []);

  const displayPosts = useMemo(
    () => feedData.posts.filter((p) => !hiddenPostIds.has(p.id)),
    [feedData.posts, hiddenPostIds],
  );

  const momentStoryRings = useMemo(
    () => buildMomentStoryRings(displayPosts, user),
    [displayPosts, user]
  );

  const onMomentRingPress = useCallback((ring: MomentStoryRing) => {
    if (ring.isAdd) {
      router.push('/stories');
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

  const loadCommentsForPost = useCallback(async (target: Post) => {
    setCommentsLoading(true);
    try {
      const isVideo = target.momentSource === 'video';
      const res = await apiClient.get(
        isVideo
          ? `/videos/${encodeURIComponent(target.id)}/comments`
          : `/posts/${encodeURIComponent(target.id)}/comments`,
        { params: { page: 1, limit: 50 } },
      );
      const inner = (res.data as { data?: { comments?: MomentCommentRow[] } })?.data ?? res.data;
      const arr = Array.isArray(inner?.comments) ? inner.comments : [];
      setCommentsList(arr);
    } catch {
      setCommentsList([]);
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  const closeCommentsModal = useCallback(() => {
    setCommentsModalPost(null);
    setCommentsList([]);
    setCommentDraft('');
    setCommentsLoading(false);
    setCommentSending(false);
    setReplyingToComment(null);
    setEditingCommentId(null);
  }, []);

  const handleMomentComment = useCallback(
    (post: Post) => {
      if (!isAuthenticated) {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
          if (window.confirm('Connectez-vous pour commenter. Aller à la connexion ?')) {
            router.push('/(auth)/login');
          }
        } else {
          Alert.alert('Connexion', 'Connectez-vous pour commenter ce moment.', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Se connecter', onPress: () => router.push('/(auth)/login') },
          ]);
        }
        return;
      }
      setCommentsModalPost(post);
      setCommentDraft('');
      setReplyingToComment(null);
      setEditingCommentId(null);
      void loadCommentsForPost(post);
    },
    [isAuthenticated, loadCommentsForPost],
  );

  const showMomentCommentError = useCallback((msg: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(msg);
    } else {
      Alert.alert('Erreur', msg);
    }
  }, []);

  const toggleMomentCommentReaction = useCallback(
    async (commentId: string, type: string = 'like') => {
      try {
        const isVideo = commentsModalPost?.momentSource === 'video';
        const res = await apiClient.post(
          isVideo
            ? `/comments/${encodeURIComponent(commentId)}/reaction`
            : `/posts/comments/${encodeURIComponent(commentId)}/reaction`,
          { type },
        );
        const inner = (res.data as { data?: { reaction_counts?: Record<string, number>; my_reaction?: string | null } })?.data ?? res.data;
        const nextCounts =
          inner?.reaction_counts && typeof inner.reaction_counts === 'object'
            ? (inner.reaction_counts as Record<string, number>)
            : {};
        const nextTotal = Object.values(nextCounts).reduce<number>((sum, n) => sum + (typeof n === 'number' ? n : 0), 0);
        setCommentsList((prev) => {
          const apply = (rows: MomentCommentRow[]): MomentCommentRow[] =>
            rows.map((row) => {
              if (row.id === commentId) {
                return {
                  ...row,
                  reaction_counts: nextCounts,
                  reactions_count: nextTotal,
                  my_reaction: inner?.my_reaction ?? null,
                };
              }
              return row.replies?.length ? { ...row, replies: apply(row.replies) } : row;
            });
          return apply(prev);
        });
      } catch (e: unknown) {
        showMomentCommentError(getAlertMessageForCaughtError(e));
      }
   },
    [commentsModalPost?.momentSource, showMomentCommentError],
  );

  const submitMomentComment = useCallback(async () => {
    const post = commentsModalPost;
    const text = commentDraft.trim();
    if (!post || !text || commentSending) return;
    setCommentSending(true);
    try {
      const isVideo = post.momentSource === 'video';
      if (editingCommentId) {
        if (isVideo) {
          await apiClient.put(`/comments/${encodeURIComponent(editingCommentId)}`, { content: text });
        } else {
          await apiClient.patch(`/posts/comments/${encodeURIComponent(editingCommentId)}`, { content: text });
        }
      } else if (isVideo) {
        await apiClient.post(`/videos/${encodeURIComponent(post.id)}/comment`, {
          content: text,
          ...(replyingToComment ? { parent_id: replyingToComment.id } : {}),
        });
      } else {
        await apiClient.post(`/posts/${encodeURIComponent(post.id)}/comments`, {
          content: text,
          ...(replyingToComment ? { parent_id: replyingToComment.id } : {}),
        });
      }
      setCommentDraft('');
      setReplyingToComment(null);
      setEditingCommentId(null);
      await loadCommentsForPost(post);
      await refresh();
    } catch (e: unknown) {
      showMomentCommentError(getAlertMessageForCaughtError(e));
    } finally {
      setCommentSending(false);
    }
  }, [commentDraft, commentSending, commentsModalPost, editingCommentId, loadCommentsForPost, refresh, replyingToComment, showMomentCommentError]);

  const startReplyToMomentComment = useCallback((comment: MomentCommentRow) => {
    const u = comment.user || {};
    const label = String(u.full_name || u.username || 'ce commentaire').trim() || 'ce commentaire';
    setReplyingToComment({ id: comment.id, label });
    setEditingCommentId(null);
    setCommentDraft('');
  }, []);

  const startEditMomentComment = useCallback((comment: MomentCommentRow) => {
    setEditingCommentId(comment.id);
    setReplyingToComment(null);
    setCommentDraft(comment.content || '');
  }, []);

  const deleteMomentComment = useCallback(
    async (comment: MomentCommentRow) => {
      const runDelete = async () => {
        if (!commentsModalPost) return;
        try {
          const isVideo = commentsModalPost.momentSource === 'video';
          await apiClient.delete(
            isVideo
              ? `/comments/${encodeURIComponent(comment.id)}`
              : `/posts/comments/${encodeURIComponent(comment.id)}`,
          );
          if (editingCommentId === comment.id) {
            setEditingCommentId(null);
            setCommentDraft('');
          }
          if (replyingToComment?.id === comment.id) setReplyingToComment(null);
          await loadCommentsForPost(commentsModalPost);
          await refresh();
        } catch (e: unknown) {
          showMomentCommentError(getAlertMessageForCaughtError(e));
        }
      };

      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
        if (window.confirm('Supprimer ce commentaire ?')) await runDelete();
        return;
      }

      Alert.alert('Supprimer', 'Supprimer ce commentaire ?', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => void runDelete() },
      ]);
    },
    [commentsModalPost, editingCommentId, loadCommentsForPost, refresh, replyingToComment, showMomentCommentError],
  );

  const renderMomentCommentThread = useCallback(
    (item: MomentCommentRow, depth = 0): React.ReactElement => {
      const u = item.user || {};
      const label = String(u.full_name || u.username || 'Utilisateur').trim() || 'Utilisateur';
      const avatar = String(u.profile_image || '').trim();
      const created = typeof item.created_at === 'string' ? item.created_at : undefined;
      const isMine = Boolean(user?.id) && String(item.user_id || u.id || '') === String(user?.id);
      const liked = item.my_reaction === 'like';
      const reactionCount = Number(item.reactions_count || 0);

      return (
        <View key={item.id} style={[styles.commentThreadBlock, depth > 0 && styles.commentReplyBlock]}>
          <View style={styles.commentRow}>
            <Image
              source={{
                uri: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(label.slice(0, 12))}&background=333&color=fff&size=64`,
              }}
              style={styles.commentAvatar}
            />
            <View style={styles.commentBody}>
              <Text style={styles.commentAuthor}>{label}</Text>
              <Text style={styles.commentMeta}>
                {formatTimeAgo(created)}
                {item.updated_at && item.updated_at !== item.created_at ? ' · modifié' : ''}
              </Text>
              <Text style={styles.commentText}>{item.content}</Text>
              <View style={styles.commentActionsRow}>
                <TouchableOpacity onPress={() => void toggleMomentCommentReaction(item.id)} hitSlop={10}>
                  <Text style={[styles.commentActionText, liked && styles.commentActionTextActive]}>
                    {liked ? "J’aime" : 'Like'}{reactionCount > 0 ? ` (${reactionCount})` : ''}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => startReplyToMomentComment(item)} hitSlop={10}>
                  <Text style={styles.commentActionText}>Répondre</Text>
                </TouchableOpacity>
                {isMine ? (
                  <TouchableOpacity onPress={() => startEditMomentComment(item)} hitSlop={10}>
                    <Text style={styles.commentActionText}>Modifier</Text>
                  </TouchableOpacity>
                ) : null}
                {isMine ? (
                  <TouchableOpacity onPress={() => void deleteMomentComment(item)} hitSlop={10}>
                    <Text style={[styles.commentActionText, styles.commentDeleteText]}>Supprimer</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>
          {Array.isArray(item.replies) && item.replies.length > 0 ? (
            <View style={styles.commentRepliesWrap}>
              {item.replies.map((reply) => renderMomentCommentThread(reply, depth + 1))}
            </View>
          ) : null}
        </View>
      );
    },
    [deleteMomentComment, startEditMomentComment, startReplyToMomentComment, toggleMomentCommentReaction, user?.id],
  );

  const performDeletePost = useCallback(async (post: Post) => {
    try {
      const path =
        post.momentSource === 'video'
          ? `/videos/${encodeURIComponent(post.id)}`
          : `/posts/${encodeURIComponent(post.id)}`;
      await apiClient.delete(path);
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
      const msg = getAlertMessageForCaughtError(e);
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

  const renderImages = (post: Post, imgWidth: number) => {
    const images = post.images;
    if (images.length === 0) return null;
    if (imgWidth < 40) return null;

    const onImageBroken = () => {
      if (!post.content.trim()) markPostHidden(post.id);
    };

    if (images.length === 1) {
      return (
        <FeedPostImage
          uri={images[0]}
          style={{ width: imgWidth, height: imgWidth * 0.65 }}
          resizeMode="cover"
          onBroken={onImageBroken}
        />
      );
    }

    if (images.length === 2) {
      const half = (imgWidth - GRID_GAP) / 2;
      const h = half * 1.2;
      return (
        <View style={{ flexDirection: 'row', width: imgWidth, height: h }}>
          <FeedPostImage uri={images[0]} style={{ width: half, height: h, marginRight: GRID_GAP }} resizeMode="cover" onBroken={onImageBroken} />
          <FeedPostImage uri={images[1]} style={{ width: half, height: h }} resizeMode="cover" onBroken={onImageBroken} />
        </View>
      );
    }

    const mainW = imgWidth * 0.65;
    const sideW = imgWidth - mainW - GRID_GAP;
    const mainH = imgWidth * 0.6;
    const sideH = (mainH - GRID_GAP) / 2;
    const remaining = images.length - 3;

    return (
      <View style={{ width: imgWidth, height: mainH, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: 0, top: 0, width: mainW, height: mainH }}>
          <FeedPostImage uri={images[0]} style={{ width: mainW, height: mainH }} resizeMode="cover" onBroken={onImageBroken} />
        </View>
        <View style={{ position: 'absolute', left: mainW + GRID_GAP, top: 0, width: sideW, height: sideH }}>
          <FeedPostImage uri={images[1]} style={{ width: sideW, height: sideH }} resizeMode="cover" onBroken={onImageBroken} />
        </View>
        <View style={{ position: 'absolute', left: mainW + GRID_GAP, top: sideH + GRID_GAP, width: sideW, height: sideH }}>
          <FeedPostImage uri={images[2]} style={{ width: sideW, height: sideH }} resizeMode="cover" onBroken={onImageBroken} />
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
            onPress={() => router.push({ pathname: '/search', params: { tab: 'posts' } } as never)}
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
              accessibilityLabel={story.isAdd ? 'Votre story' : `Story ${story.name}`}
            >
              {story.isAdd ? (
                <View style={styles.storyAddContainer}>
                  <Image source={{ uri: story.avatar }} style={styles.storyAvatar} />
                  <View style={styles.storyAddBadge}><Ionicons name="add" size={14} color="#FFF" /></View>
                </View>
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
              <Text style={styles.storyName} numberOfLines={1}>{story.isAdd ? 'Votre Story' : story.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Create Post */}
        <View style={styles.createPost}>
          <Image
            source={{
              uri: profileAvatarUri(
                String(user?.profile_image || user?.avatar || '').trim(),
                viewerId || user?.username || 'Moi',
              ),
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
            {renderImages(post, postCardWidth)}
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
                    if (p?.id) {
                      setReportTarget({
                        id: p.id,
                        contentType: p.momentSource === 'video' ? 'video' : 'post',
                      });
                    }
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

      <Modal
        visible={commentsModalPost != null}
        transparent
        animationType="slide"
        onRequestClose={closeCommentsModal}
      >
        <KeyboardAvoidingView
          style={styles.commentsModalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.top}
        >
          <Pressable style={styles.commentsModalBackdrop} onPress={closeCommentsModal} accessibilityLabel="Fermer" />
          <View style={[styles.commentsSheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.commentsHeader}>
              <Text style={styles.commentsTitle} numberOfLines={1}>
                Commentaires{commentsModalPost?.user?.name ? ` · ${commentsModalPost.user.name}` : ''}
              </Text>
              <TouchableOpacity onPress={closeCommentsModal} hitSlop={12} accessibilityLabel="Fermer">
                <Ionicons name="close" size={26} color="#FFF" />
              </TouchableOpacity>
            </View>
            {replyingToComment || editingCommentId ? (
              <View style={styles.commentContextBar}>
                <Text style={styles.commentContextText} numberOfLines={1}>
                  {editingCommentId ? 'Modification du commentaire' : `Réponse à ${replyingToComment?.label ?? ''}`}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setReplyingToComment(null);
                    setEditingCommentId(null);
                    setCommentDraft('');
                  }}
                  hitSlop={10}
                >
                  <Text style={styles.commentContextCancel}>Annuler</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {commentsLoading ? (
              <View style={styles.commentsLoadingBox}>
                <ActivityIndicator size="small" color="#FF6B00" />
              </View>
            ) : (
              <FlatList
                data={commentsList}
                keyExtractor={(item) => item.id}
                style={styles.commentsList}
                contentContainerStyle={commentsList.length === 0 ? styles.commentsListEmpty : undefined}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text style={styles.commentsEmptyText}>Aucun commentaire pour l’instant. Soyez le premier !</Text>
                }
                renderItem={({ item }) => renderMomentCommentThread(item)}
              />
            )}
            <View style={styles.commentComposer}>
              <TextInput
                style={styles.commentInput}
                placeholder={
                  editingCommentId
                    ? 'Modifier votre commentaire…'
                    : replyingToComment
                      ? `Répondre à ${replyingToComment.label}…`
                      : 'Écrire un commentaire…'
                }
                placeholderTextColor="#666"
                value={commentDraft}
                onChangeText={setCommentDraft}
                multiline
                maxLength={2000}
                editable={!commentSending}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.commentSendBtn, (!commentDraft.trim() || commentSending) && styles.commentSendBtnDisabled]}
                onPress={() => void submitMomentComment()}
                disabled={!commentDraft.trim() || commentSending}
                accessibilityLabel={editingCommentId ? 'Enregistrer la modification' : 'Envoyer le commentaire'}
              >
                {commentSending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name={editingCommentId ? 'checkmark' : 'send'} size={20} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ReportModal
        visible={reportTarget != null}
        onClose={() => setReportTarget(null)}
        targetType={reportTarget?.contentType ?? 'post'}
        targetId={reportTarget?.id ?? ''}
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
  commentsModalRoot: { flex: 1, justifyContent: 'flex-end' },
  commentsModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1,
  },
  commentsSheet: {
    backgroundColor: '#141414',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: '#2a2a2a',
    maxHeight: '88%',
    minHeight: 280,
    zIndex: 2,
    elevation: 2,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2a2a2a',
  },
  commentsTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', flex: 1, marginRight: 12 },
  commentsLoadingBox: { paddingVertical: 40, alignItems: 'center' },
  commentsList: { maxHeight: 360, paddingHorizontal: 12, paddingTop: 8 },
  commentsListEmpty: { flexGrow: 1, justifyContent: 'center', paddingVertical: 24 },
  commentsEmptyText: { color: '#777', fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },
  commentContextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,107,0,0.08)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2a2a2a',
    gap: 12,
  },
  commentContextText: { flex: 1, color: '#DDD', fontSize: 12 },
  commentContextCancel: { color: '#FF6B00', fontSize: 12, fontWeight: '700' },
  commentThreadBlock: { paddingVertical: 2 },
  commentReplyBlock: { marginLeft: 18, paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: '#2d2d2d' },
  commentRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#222' },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  commentBody: { flex: 1 },
  commentAuthor: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  commentMeta: { color: '#666', fontSize: 11, marginTop: 2 },
  commentText: { color: '#DDD', fontSize: 14, marginTop: 6, lineHeight: 20 },
  commentActionsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginTop: 8 },
  commentActionText: { color: '#8C8C8C', fontSize: 12, fontWeight: '600' },
  commentActionTextActive: { color: '#FF6B00' },
  commentDeleteText: { color: '#FF7676' },
  commentRepliesWrap: { marginTop: 2 },
  commentComposer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2a2a2a',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#1c1c1c',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFF',
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#333',
  },
  commentSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FF6B00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentSendBtnDisabled: { opacity: 0.45 },
});
