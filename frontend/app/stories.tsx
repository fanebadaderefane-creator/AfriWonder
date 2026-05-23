import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../src/store/authStore';
import apiClient from '../src/api/client';
import { toAbsoluteMediaUrl } from '../src/utils/absoluteMediaUrl';

const { width } = Dimensions.get('window');

/**
 * Lecteur vidéo stories utilisant `expo-video` (recommandé Expo 54+).
 * Autoplay + muet tant que l'utilisateur n'a pas cliqué — conforme aux
 * guidelines iOS/Android de lecture automatique.
 */
function StoryVideoPlayer({ url, style }: { url: string; style: any }) {
  const player = useVideoPlayer(url || '', (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return <VideoView player={player} style={style} contentFit="cover" nativeControls={false} />;
}

function firstParam(v: string | string[] | undefined): string {
  if (v == null) return '';
  return typeof v === 'string' ? v.trim() : String(v[0] || '').trim();
}

function mimeForImageExt(ext: string): string {
  const e = String(ext || '').toLowerCase().replace(/^\./, '');
  if (e === 'jpg' || e === 'jpeg') return 'image/jpeg';
  if (e === 'png') return 'image/png';
  if (e === 'webp') return 'image/webp';
  if (e === 'gif') return 'image/gif';
  return 'image/jpeg';
}

function mimeForVideoExt(ext: string): string {
  const e = String(ext || '').toLowerCase().replace(/^\./, '');
  if (e === 'webm') return 'video/webm';
  if (e === 'mov') return 'video/quicktime';
  return 'video/mp4';
}

/** Web : Blob/File ; natif : `{ uri, name, type }`. */
async function appendUploadFile(formData: FormData, media: { uri: string; type: 'image' | 'video' }, index: number) {
  if (Platform.OS === 'web') {
    const res = await fetch(media.uri);
    const blob = await res.blob();
    let mime = String(blob.type || '').toLowerCase().trim();
    if (!mime || mime === 'application/octet-stream') {
      mime = media.type === 'video' ? 'video/mp4' : 'image/jpeg';
    }
    const ext =
      mime.includes('png') ? 'png'
        : mime.includes('webp') ? 'webp'
          : mime.includes('gif') ? 'gif'
            : mime.includes('webm') ? 'webm'
              : mime.includes('quicktime') ? 'mov'
                : media.type === 'video' ? 'mp4' : 'jpg';
    const name = `upload_${index}.${ext}`;
    formData.append('file', new File([blob], name, { type: mime }));
    return;
  }
  const raw = (media.uri.split('.').pop() || '').split('?')[0] || '';
  const ext = raw.replace(/[^a-z0-9]/gi, '').slice(0, 8) || (media.type === 'video' ? 'mp4' : 'jpg');
  const mimeType = media.type === 'video' ? mimeForVideoExt(ext) : mimeForImageExt(ext);
  formData.append('file', { uri: media.uri, name: `upload_${index}.${ext}`, type: mimeType } as any);
}

type ApiStory = {
  id: string;
  media_url: string;
  media_type: string;
  expires_at?: string;
  created_at?: string;
  user?: { id?: string; username?: string; full_name?: string | null; profile_image?: string | null };
};

type FeedBarItem = {
  id: string;
  username: string | null;
  full_name: string | null;
  profile_image: string | null;
  is_self: boolean;
  has_story: boolean;
  has_unseen_story: boolean;
  is_live: boolean;
  story_ids: string[];
};

function formatRemainingHours(expiresAt: string | undefined): string {
  if (!expiresAt) return '';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return 'Expirée';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h <= 0) return `${m} min restant${m > 1 ? 'es' : 'e'}`;
  return `${h}h${m > 0 ? ` ${m}m` : ''} restantes`;
}

export default function StoriesScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ userId?: string; userName?: string; userAvatar?: string; previewUrl?: string }>();
  const externalUserId = useMemo(() => firstParam(params.userId), [params.userId]);
  const externalName = useMemo(() => firstParam(params.userName) || 'Créateur', [params.userName]);
  const externalAvatar = useMemo(() => firstParam(params.userAvatar), [params.userAvatar]);
  const externalPreview = useMemo(() => {
    const raw = firstParam(params.previewUrl);
    if (!raw) return '';
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [params.previewUrl]);

  const [viewingStory, setViewingStory] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const myStoriesQuery = useQuery({
    queryKey: ['stories', 'me', user?.id],
    queryFn: async () => {
      const res = await apiClient.get('/stories');
      const raw = res.data?.data ?? res.data;
      const list = Array.isArray(raw) ? raw : [];
      return list as ApiStory[];
    },
    enabled: !!user?.id && !externalUserId,
  });

  /** Liste réelle des contacts ayant des stories actives (24 h). */
  const feedBarQuery = useQuery({
    queryKey: ['stories', 'feed-bar', user?.id],
    queryFn: async () => {
      const res = await apiClient.get('/stories/feed-bar');
      const raw = res.data?.data ?? res.data;
      const items: FeedBarItem[] = Array.isArray(raw?.items) ? raw.items : [];
      return items.filter((i) => !i.is_self && (i.has_story || i.is_live));
    },
    enabled: !!user?.id && !externalUserId,
    refetchInterval: 60_000,
  });

  /** Quand on clique sur un contact, on récupère ses stories réelles. */
  const [viewingPeerId, setViewingPeerId] = useState<string | null>(null);
  const peerStoriesQuery = useQuery({
    queryKey: ['stories', 'peer', viewingPeerId],
    queryFn: async () => {
      if (!viewingPeerId) return [] as ApiStory[];
      const res = await apiClient.get(`/stories/user/${encodeURIComponent(viewingPeerId)}`);
      const raw = res.data?.data ?? res.data;
      return (Array.isArray(raw) ? raw : []) as ApiStory[];
    },
    enabled: !!viewingPeerId,
  });

  const currentApiStory = useMemo(() => {
    if (!viewingStory || !myStoriesQuery.data?.length) return null;
    return myStoriesQuery.data.find((s) => s.id === viewingStory) ?? null;
  }, [viewingStory, myStoriesQuery.data]);

  const openAddStory = useCallback(async () => {
    if (!user?.id) {
      Alert.alert('Connexion requise', 'Connectez-vous pour ajouter une story.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Connexion', onPress: () => router.push('/(auth)/login' as never) },
      ]);
      return;
    }

    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!lib.granted) {
      Alert.alert('Accès médias', 'Autorisez l’accès à la galerie pour choisir une photo ou une vidéo.');
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      /** iOS seulement : recadrage natif ; web/Android sans éditeur système (stabilité Android). */
      allowsEditing: Platform.OS === 'ios',
      quality: 0.85,
      videoMaxDuration: 60,
    });

    if (picked.canceled || !picked.assets?.[0]) return;
    const asset = picked.assets[0];
    const isVideo = asset.type === 'video' || (asset.mimeType ?? '').startsWith('video/');
    const uri = asset.uri;
    if (!uri) {
      Alert.alert('Erreur', 'Fichier invalide.');
      return;
    }

    setPublishing(true);
    try {
      const formData = new FormData();
      await appendUploadFile(formData, { uri, type: isVideo ? 'video' : 'image' }, 0);
      const path = isVideo ? '/upload/video' : '/upload/image';
      const uploadRes = await apiClient.post(path, formData, {
        timeout: 300000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      const d = uploadRes.data?.data ?? uploadRes.data;
      const fileUrl = d?.file_url || d?.url;
      if (!fileUrl || typeof fileUrl !== 'string') {
        throw new Error('Réponse upload invalide');
      }

      await apiClient.post('/stories', {
        mediaUrl: fileUrl,
        mediaType: isVideo ? 'video' : 'image',
        expiresInHours: 24,
      });

      await queryClient.invalidateQueries({ queryKey: ['stories', 'me', user.id] });
      Alert.alert('Story', 'Votre story a été publiée.');
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { error?: string } } }).response?.data?.error || '')
          : e instanceof Error
            ? e.message
            : 'Impossible de publier la story.';
      Alert.alert('Erreur', msg || 'Impossible de publier la story.');
    } finally {
      setPublishing(false);
    }
  }, [user?.id, queryClient]);

  const openCamera = useCallback(async () => {
    if (!user?.id) {
      Alert.alert('Connexion requise', 'Connectez-vous pour ajouter une story.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Connexion', onPress: () => router.push('/(auth)/login' as never) },
      ]);
      return;
    }
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (!cam.granted) {
      Alert.alert('Caméra', 'Autorisez l’accès à la caméra pour filmer ou photographier.');
      return;
    }
    const picked = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: Platform.OS === 'ios',
      quality: 0.85,
      videoMaxDuration: 60,
    });
    if (picked.canceled || !picked.assets?.[0]) return;

    const asset = picked.assets[0];
    const isVideo = asset.type === 'video' || (asset.mimeType ?? '').startsWith('video/');
    const uri = asset.uri;
    if (!uri) return;

    setPublishing(true);
    try {
      const formData = new FormData();
      await appendUploadFile(formData, { uri, type: isVideo ? 'video' : 'image' }, 0);
      const path = isVideo ? '/upload/video' : '/upload/image';
      const uploadRes = await apiClient.post(path, formData, {
        timeout: 300000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      const d = uploadRes.data?.data ?? uploadRes.data;
      const fileUrl = d?.file_url || d?.url;
      if (!fileUrl || typeof fileUrl !== 'string') throw new Error('Réponse upload invalide');

      await apiClient.post('/stories', {
        mediaUrl: fileUrl,
        mediaType: isVideo ? 'video' : 'image',
        expiresInHours: 24,
      });

      await queryClient.invalidateQueries({ queryKey: ['stories', 'me', user.id] });
      Alert.alert('Story', 'Votre story a été publiée.');
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { error?: string } } }).response?.data?.error || '')
          : e instanceof Error
            ? e.message
            : 'Impossible de publier la story.';
      Alert.alert('Erreur', msg || 'Impossible de publier la story.');
    } finally {
      setPublishing(false);
    }
  }, [user?.id, queryClient]);

  /** Ouverture depuis Moments : afficher tout de suite l’aperçu (image du moment ou avatar). */
  if (externalUserId) {
    const bgUri = externalPreview || externalAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(externalName)}&background=222&color=fff&size=512`;
    return (
      <View style={[styles.storyViewer, { paddingTop: insets.top }]}>
        <Image source={{ uri: bgUri }} style={styles.storyFullImage} resizeMode="cover" />
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
        <View style={styles.storyHeader}>
          <View style={styles.storyProgress}>
            <View style={styles.storyProgressFill} />
          </View>
          <View style={styles.storyUserRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.storyBackBtn} accessibilityLabel="Retour">
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Image source={{ uri: externalAvatar || bgUri }} style={styles.storyUserAvatar} />
            <Text style={styles.storyUserName}>{externalName}</Text>
            <Text style={styles.storyTime}>Moments</Text>
          </View>
        </View>
        <View style={[styles.externalCaptionWrap, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <Text style={styles.externalCaption}>
            {externalPreview
              ? 'Aperçu d’un moment partagé par ce créateur.'
              : 'Pas d’image publique sur ce moment — profil du créateur.'}
          </Text>
        </View>
      </View>
    );
  }

  /** Viewer plein écran d'une story d'un autre utilisateur (vraie API). */
  if (viewingPeerId) {
    const peerStories = peerStoriesQuery.data || [];
    const story = peerStories[0]; // MVP : 1ʳᵉ story (la plus récente).
    const peer = feedBarQuery.data?.find((p) => p.id === viewingPeerId);
    const peerName = peer?.full_name || peer?.username || 'Contact';
    const peerAvatar = toAbsoluteMediaUrl(peer?.profile_image || '') || '';
    const url = story ? toAbsoluteMediaUrl(story.media_url) : '';
    const isVid = story ? String(story.media_type).toLowerCase().includes('video') : false;

    return (
      <View style={[styles.storyViewer, { paddingTop: insets.top }]}>
        {peerStoriesQuery.isLoading ? (
          <View style={[styles.storyFullImage, styles.storyLoading]}>
            <ActivityIndicator color="#FFF" />
          </View>
        ) : !story ? (
          <View style={[styles.storyFullImage, styles.storyLoading]}>
            <Ionicons name="alert-circle-outline" size={48} color="rgba(255,255,255,0.5)" />
            <Text style={{ color: 'rgba(255,255,255,0.7)', marginTop: 12 }}>
              Story expirée ou indisponible
            </Text>
          </View>
        ) : !isVid ? (
          <Image source={{ uri: url }} style={styles.storyFullImage} resizeMode="cover" />
        ) : (
          Platform.OS === 'web' ? (
            <View style={[styles.storyFullImage, { backgroundColor: '#000' }]}>
              {React.createElement('video', {
                src: url,
                autoPlay: true,
                playsInline: true,
                controls: true,
                muted: false,
                style: { width: '100%', height: '100%', objectFit: 'cover' },
              })}
            </View>
          ) : (
            <StoryVideoPlayer url={url} style={styles.storyFullImage} />
          )
        )}
        <View style={styles.storyHeader}>
          <View style={styles.storyProgress}>
            <View style={styles.storyProgressFill} />
          </View>
          <View style={styles.storyUserRow}>
            <Image source={{ uri: peerAvatar || url }} style={styles.storyUserAvatar} />
            <Text style={styles.storyUserName}>{peerName}</Text>
            <Text style={styles.storyTime}>{formatRemainingHours(story?.expires_at)}</Text>
            <TouchableOpacity onPress={() => setViewingPeerId(null)} style={styles.storyClose}>
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (viewingStory && currentApiStory) {
    const url = toAbsoluteMediaUrl(currentApiStory.media_url);
    const isVideo = String(currentApiStory.media_type).toLowerCase().includes('video');
    return (
      <View style={[styles.storyViewer, { paddingTop: insets.top }]}>
        {!isVideo ? (
          <Image source={{ uri: url }} style={styles.storyFullImage} />
        ) : (
          <StoryVideoPlayer url={url} style={styles.storyFullImage} />
        )}
        <View style={styles.storyHeader}>
          <View style={styles.storyProgress}>
            <View style={styles.storyProgressFill} />
          </View>
          <View style={styles.storyUserRow}>
            <Image
              source={{ uri: toAbsoluteMediaUrl(currentApiStory.user?.profile_image || '') || url }}
              style={styles.storyUserAvatar}
            />
            <Text style={styles.storyUserName}>{currentApiStory.user?.username || 'Vous'}</Text>
            <Text style={styles.storyTime}>Votre story</Text>
            <TouchableOpacity onPress={() => setViewingStory(null)} style={styles.storyClose}>
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const myCount = myStoriesQuery.data?.length ?? 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stories</Text>
        <TouchableOpacity
          onPress={openCamera}
          disabled={publishing}
          accessibilityLabel="Caméra"
          style={styles.backBtn}
        >
          {publishing ? <ActivityIndicator color={Colors.primary} /> : <Ionicons name="camera" size={24} color={Colors.text} />}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Votre Story</Text>
        <TouchableOpacity
          style={[styles.addStoryCard, publishing && { opacity: 0.7 }]}
          onPress={openAddStory}
          disabled={publishing}
          activeOpacity={0.85}
        >
          <View style={styles.addStoryCircle}>
            {publishing ? <ActivityIndicator color={Colors.primary} /> : <Ionicons name="add" size={28} color={Colors.primary} />}
          </View>
          <View>
            <Text style={styles.addStoryTitle}>Ajouter à votre story</Text>
            <Text style={styles.addStorySubtitle}>Partagez un moment (photo ou vidéo)</Text>
          </View>
        </TouchableOpacity>
        {myCount > 0 && (
          <Text style={styles.myCountHint}>
            {myCount} story{myCount > 1 ? 's' : ''} active{myCount > 1 ? 's' : ''} — appuyez sur une vignette ci-dessous
          </Text>
        )}
        {myStoriesQuery.isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.md }} />
        ) : (
          myCount > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.myStrip}>
              {(myStoriesQuery.data ?? []).map((s) => {
                const thumb = toAbsoluteMediaUrl(s.media_url);
                const vid = String(s.media_type).toLowerCase().includes('video');
                return (
                  <TouchableOpacity key={s.id} style={styles.myThumbWrap} onPress={() => setViewingStory(s.id)} activeOpacity={0.9}>
                    {!vid ? (
                      <Image source={{ uri: thumb }} style={styles.myThumb} />
                    ) : (
                      <View style={[styles.myThumb, { backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' }]}>
                        <Ionicons name="play-circle" size={40} color="#FFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )
        )}

        <Text style={styles.sectionTitle}>Stories récentes</Text>
        <Text style={styles.expiryHint}>Les stories disparaissent automatiquement après 24 h.</Text>
        {feedBarQuery.isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.lg }} />
        ) : (feedBarQuery.data?.length ?? 0) === 0 ? (
          <View style={styles.feedEmpty}>
            <Ionicons name="ellipse-outline" size={42} color={Colors.textMuted} />
            <Text style={styles.feedEmptyTitle}>Aucune story récente</Text>
            <Text style={styles.feedEmptyText}>
              Suivez plus de personnes pour voir leurs stories ici. Les stories disparaissent après 24 h.
            </Text>
          </View>
        ) : (
          <View style={styles.storiesGrid}>
            {(feedBarQuery.data ?? []).map((peer) => {
              const peerAvatar =
                toAbsoluteMediaUrl(peer.profile_image || '') ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(peer.full_name || peer.username || 'U')}&background=FF6B00&color=fff`;
              const ringNew = peer.has_unseen_story || peer.is_live;
              return (
                <TouchableOpacity
                  key={peer.id}
                  style={styles.storyCard}
                  activeOpacity={0.85}
                  onPress={() => setViewingPeerId(peer.id)}
                >
                  <Image source={{ uri: peerAvatar }} style={styles.storyCardImage} blurRadius={Platform.OS === 'web' ? 0 : 0} />
                  <View style={styles.storyCardOverlay}>
                    <View style={[styles.storyCardAvatar, ringNew && styles.storyCardAvatarNew]}>
                      <Image source={{ uri: peerAvatar }} style={styles.storyCardAvatarImg} />
                    </View>
                    <Text style={styles.storyCardName} numberOfLines={1}>
                      {peer.full_name || peer.username || 'Contact'}
                    </Text>
                    {peer.is_live ? (
                      <View style={styles.storyCardLive}>
                        <Text style={styles.storyCardLiveText}>LIVE</Text>
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md, marginTop: Spacing.lg },
  myCountHint: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginBottom: Spacing.sm },
  myStrip: { gap: Spacing.sm, paddingBottom: Spacing.sm },
  myThumbWrap: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  myThumb: { width: 88, height: 120, borderRadius: BorderRadius.md, backgroundColor: '#222' },
  addStoryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, gap: Spacing.md },
  addStoryCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  addStoryTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  addStorySubtitle: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  storiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  storyLoading: { backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  expiryHint: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: -8, marginBottom: Spacing.md },
  feedEmpty: { alignItems: 'center', paddingHorizontal: 30, paddingVertical: 40, gap: 8 },
  feedEmptyTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  feedEmptyText: { color: Colors.textSecondary, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 18 },
  storyCardLive: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF2D55',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  storyCardLiveText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  storyCard: { width: (width - Spacing.xl * 2 - Spacing.md) / 2, height: 200, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  storyCardImage: { width: '100%', height: '100%' },
  storyCardOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: Spacing.md, backgroundColor: 'rgba(0,0,0,0.2)' },
  storyCardAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: Colors.surface, marginBottom: 4 },
  storyCardAvatarNew: { borderColor: Colors.primary },
  storyCardAvatarImg: { width: '100%', height: '100%', borderRadius: 16 },
  storyCardName: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '600' },
  storyViewer: { flex: 1, backgroundColor: '#000' },
  storyFullImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  storyHeader: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  storyProgress: { height: 2, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 1, marginBottom: Spacing.sm },
  storyProgressFill: { width: '60%', height: '100%', backgroundColor: Colors.text, borderRadius: 1 },
  storyUserRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  storyUserAvatar: { width: 32, height: 32, borderRadius: 16 },
  storyUserName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  storyTime: { color: 'rgba(255,255,255,0.7)', fontSize: FontSizes.sm, flex: 1 },
  storyClose: { padding: 4 },
  storyBackBtn: { padding: 4, marginRight: 4 },
  storyActions: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, gap: Spacing.md },
  externalCaptionWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: Spacing.lg },
  externalCaption: { color: 'rgba(255,255,255,0.92)', fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 20 },
  storyReply: { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', borderRadius: BorderRadius.pill, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  storyReplyText: { color: 'rgba(255,255,255,0.7)', fontSize: FontSizes.md },
});
