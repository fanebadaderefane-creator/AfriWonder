import React, { useEffect, useState, useCallback, useRef, createElement } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import apiClient from '../../src/api/client';
import { Colors, Spacing } from '../../src/theme/colors';
import { toAbsoluteMediaUrl } from '../../src/utils/absoluteMediaUrl';
import { useVideoDownload, videoDownloadManager } from '../../src/services/videoDownloadService';
import { getMobileVideoDownloadUrl, trackMobileAnalyticsEvent } from '../../src/services/mobileApiService';
import { addRecentlyViewedVideo } from '../../src/utils/recentlyViewedVideos';

function pickProgressiveDownloadUrl(v: Record<string, unknown>): string {
  const fields = [
    v.video_url,
    v.low_quality_playback_url,
    v.low_quality_url,
    v.videoUrl,
  ].filter(Boolean);
  for (const f of fields) {
    const u = toAbsoluteMediaUrl(String(f)).trim();
    if (!u) continue;
    const low = u.toLowerCase();
    if (low.includes('.m3u8') || low.includes('type=m3u8')) continue;
    return u;
  }
  return '';
}

/**
 * Player web HTML5 natif — lecture fiable dans le navigateur (autoplay muted,
 * contrôles natifs, support HLS via Safari & MP4 partout).
 * Évite le bug expo-video sur web qui n'affichait qu'une frame statique.
 */
function WebInlinePlayer({
  uri,
  title,
  trimStartSec,
  trimEndSec,
}: {
  uri: string;
  title: string;
  trimStartSec: number | null;
  trimEndSec: number | null;
}) {
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const trimStartRef = useRef<number | null>(trimStartSec);
  const trimEndRef = useRef<number | null>(trimEndSec);

  useEffect(() => {
    trimStartRef.current = trimStartSec;
    trimEndRef.current = trimEndSec;
  }, [trimStartSec, trimEndSec]);

  /**
   * Autoplay muet conforme aux politiques navigateur. Le bouton de contrôle
   * permet d'activer le son. Tap sur la vidéo = play/pause natif.
   */
  useEffect(() => {
    const el = videoElRef.current;
    if (!el) return;
    el.muted = true;
    const tryPlay = () => {
      el.play().catch(() => {
        /* L'utilisateur devra cliquer manuellement — on garde les contrôles natifs visibles. */
      });
    };
    const onLoaded = () => {
      if (trimStartRef.current != null) {
        try {
          el.currentTime = trimStartRef.current;
        } catch {
          /* ignore */
        }
      }
      tryPlay();
    };
    const onTime = () => {
      const ts = trimStartRef.current;
      const te = trimEndRef.current;
      if (te != null && ts != null && el.currentTime >= te - 0.08) {
        try {
          el.currentTime = ts;
        } catch {
          /* ignore */
        }
      }
    };
    el.addEventListener('loadedmetadata', onLoaded);
    el.addEventListener('timeupdate', onTime);
    return () => {
      el.removeEventListener('loadedmetadata', onLoaded);
      el.removeEventListener('timeupdate', onTime);
    };
  }, [uri]);

  return (
    <View style={styles.playerWrap}>
      {createElement('video', {
        ref: (el: HTMLVideoElement | null) => {
          videoElRef.current = el;
        },
        src: uri,
        controls: true,
        autoPlay: true,
        playsInline: true,
        preload: 'auto',
        /**
         * Pas de `crossOrigin` ici : forcer `anonymous` casse la lecture si le CDN
         * (Cloudflare R2 / proxy) ne renvoie pas `Access-Control-Allow-Origin`.
         * On n'a besoin de CORS que pour `canvas` / DRM, pas pour `<video>` simple.
         */
        style: { width: '100%', height: '100%', background: '#000', objectFit: 'contain' },
      })}
      {title ? (
        <Text style={styles.videoTitle} numberOfLines={2}>
          {title}
        </Text>
      ) : null}
    </View>
  );
}

/** Aligné sur le feed (`(tabs)/index.tsx`) : extraits republiés avec `trim_start_sec` / `trim_end_sec`. */
function NativeInlinePlayer({
  uri,
  title,
  trimStartSec,
  trimEndSec,
}: {
  uri: string;
  title: string;
  trimStartSec: number | null;
  trimEndSec: number | null;
}) {
  const trimStartRef = useRef<number | null>(trimStartSec);
  const trimEndRef = useRef<number | null>(trimEndSec);

  useEffect(() => {
    trimStartRef.current = trimStartSec;
    trimEndRef.current = trimEndSec;
  }, [trimStartSec, trimEndSec]);

  const hasTrimWindow =
    trimStartSec != null && trimEndSec != null && Number.isFinite(trimEndSec) && trimEndSec > trimStartSec;

  const player = useVideoPlayer(uri, (p) => {
    p.loop = !hasTrimWindow;
    p.muted = false;
    p.timeUpdateEventInterval = 0.25;
    p.play();
  });

  useEffect(() => {
    if (trimStartSec == null) return undefined;
    const tid = setTimeout(() => {
      try {
        player.currentTime = trimStartSec;
      } catch {
        /* lecteur pas prêt */
      }
    }, 150);
    return () => clearTimeout(tid);
  }, [uri, player, trimStartSec]);

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    const ts = trimStartRef.current;
    const te = trimEndRef.current;
    if (te != null && ts != null && currentTime >= te - 0.08) {
      try {
        player.currentTime = ts;
      } catch {
        /* ignore */
      }
    }
  });

  return (
    <View style={styles.playerWrap}>
      <VideoView style={styles.video} player={player} contentFit="contain" nativeControls />
      {title ? (
        <Text style={styles.videoTitle} numberOfLines={2}>
          {title}
        </Text>
      ) : null}
    </View>
  );
}

function InlinePlayer(props: {
  uri: string;
  title: string;
  trimStartSec: number | null;
  trimEndSec: number | null;
}) {
  if (Platform.OS === 'web') {
    return <WebInlinePlayer {...props} />;
  }
  return <NativeInlinePlayer {...props} />;
}

export default function WatchVideoScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[]; source?: string | string[] }>();
  const rawId = params.id;
  const videoId = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] ?? '' : '';
  const rawSource = params.source;
  const source = typeof rawSource === 'string' ? rawSource : Array.isArray(rawSource) ? rawSource[0] : '';
  const isLiveSource = source === 'live' || source === 'live_replay';

  const [playUrl, setPlayUrl] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [fromLocalFile, setFromLocalFile] = useState(false);
  const [trimStartSec, setTrimStartSec] = useState<number | null>(null);
  const [trimEndSec, setTrimEndSec] = useState<number | null>(null);
  const [mediaType, setMediaType] = useState<'video' | 'photo'>('video');
  const [photoUrl, setPhotoUrl] = useState('');
  const viewRecordedRef = useRef<string | null>(null);

  const { isDownloaded, progress, download, remove } = useVideoDownload(videoId);

  const load = useCallback(async () => {
    if (!videoId) {
      setError('Vidéo introuvable');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setFromLocalFile(false);
    setDownloadUrl('');
    setTrimStartSec(null);
    setTrimEndSec(null);
    setMediaType('video');
    setPhotoUrl('');

    if (isLiveSource) {
      setError('Les contenus live ne sont plus disponibles dans cette version de l’app.');
      setPlayUrl('');
      setLoading(false);
      return;
    }

    try {
      const offlineList = await videoDownloadManager.getDownloadedVideos();
      const local = offlineList.find((x) => x.id === videoId);
      if (local && Platform.OS !== 'web') {
        const info = await FileSystem.getInfoAsync(local.localPath);
        if (info.exists) {
          setTitle(local.title || '');
          setPlayUrl(local.localPath);
          setFromLocalFile(true);
          setTrimStartSec(null);
          setTrimEndSec(null);
          void trackMobileAnalyticsEvent({
            eventType: 'watch_open_offline',
            entityType: 'video',
            entityId: videoId,
            metadata: { platform: Platform.OS },
          }).catch(() => {});
          void addRecentlyViewedVideo(videoId);
          setLoading(false);
          return;
        }
      }
    } catch {
      /* continue with API */
    }

    try {
      const res = await apiClient.get(`/videos/${encodeURIComponent(videoId)}`);
      const v = (res.data?.data ?? res.data) as Record<string, unknown>;
      if (!v || !v.id) {
        setError('Contenu introuvable');
        setPlayUrl('');
        return;
      }
      /**
       * Détection finale photo vs vidéo :
       *  - Si l'URL source se termine par une extension vidéo (.mp4, .mov, .m3u8, etc.)
       *    OU s'il existe un flux HLS / low-quality → c'est une VIDÉO même si le champ
       *    `media_type` est mal rempli en base.
       *  - Sinon, on se fie à `media_type`.
       *  - Défaut : vidéo (comportement historique du feed).
       */
      const kind = String(v.media_type || '').toLowerCase();
      const rawPrimary = String(v.video_url || '').trim();
      const hasVideoFlux =
        /\.(mp4|mov|m4v|webm|mkv|mpeg|mpg|avi)(\?|$)/i.test(rawPrimary) ||
        /\.m3u8(\?|$)/i.test(rawPrimary) ||
        Boolean((v.hls_url as string) || (v.low_quality_playback_url as string) || (v.low_quality_url as string));
      const looksImageUrl =
        /\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(rawPrimary) ||
        /^data:image\//i.test(rawPrimary);
      let isPhoto: boolean;
      if (hasVideoFlux) isPhoto = false;
      else if (kind === 'photo') isPhoto = true;
      else if (looksImageUrl) isPhoto = true;
      else isPhoto = false;
      setMediaType(isPhoto ? 'photo' : 'video');
      setTitle(String(v.title || ''));

      if (isPhoto) {
        const img = toAbsoluteMediaUrl(
          String(
            rawPrimary ||
              (v as { thumbnail_url?: string }).thumbnail_url ||
              (v as { poster_url?: string }).poster_url ||
              ''
          )
        ).trim();
        if (!img) {
          setError("Aucune image disponible pour ce contenu");
          return;
        }
        setPhotoUrl(img);
        setPlayUrl('');
        void trackMobileAnalyticsEvent({
          eventType: 'watch_open',
          entityType: 'video',
          entityId: videoId,
          metadata: { fromLocalFile: false, platform: Platform.OS, mediaType: 'photo' },
        }).catch(() => {});
        void addRecentlyViewedVideo(videoId);
        return;
      }

      const raw =
        rawPrimary ||
        (v.hls_url as string) ||
        (v.low_quality_playback_url as string) ||
        (v.low_quality_url as string) ||
        '';
      const url = toAbsoluteMediaUrl(String(raw)).trim();
      if (!url) {
        setError('Aucune source vidéo disponible');
        return;
      }
      setPlayUrl(url);
      const tsRaw = v.trim_start_sec;
      const teRaw = v.trim_end_sec;
      const ts =
        typeof tsRaw === 'number' && Number.isFinite(tsRaw) && tsRaw >= 0 ? tsRaw : null;
      const te =
        typeof teRaw === 'number' && Number.isFinite(teRaw) && ts != null && teRaw > ts ? teRaw : null;
      setTrimStartSec(ts);
      setTrimEndSec(te);
      const fallbackDownloadUrl = pickProgressiveDownloadUrl(v);
      try {
        const mobileDownloadUrl = await getMobileVideoDownloadUrl(videoId);
        setDownloadUrl(mobileDownloadUrl || fallbackDownloadUrl);
      } catch {
        setDownloadUrl(fallbackDownloadUrl);
      }
      void trackMobileAnalyticsEvent({
        eventType: 'watch_open',
        entityType: 'video',
        entityId: videoId,
        metadata: { fromLocalFile: false, platform: Platform.OS },
      }).catch(() => {});
      void addRecentlyViewedVideo(videoId);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const msg = err?.response?.data?.error?.message || err?.message;
      setError(msg ? String(msg).slice(0, 160) : 'Impossible de charger la vidéo');
    } finally {
      setLoading(false);
    }
  }, [videoId, isLiveSource]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!videoId || loading || error || isLiveSource) return;
    if (viewRecordedRef.current === videoId) return;
    const tid = setTimeout(() => {
      if (viewRecordedRef.current === videoId) return;
      viewRecordedRef.current = videoId;
      void apiClient.post(`/videos/${encodeURIComponent(videoId)}/view`, {
        // Même seuil que le feed vertical pour un comptage cohérent.
        watchSeconds: 3,
        watchPercent: 25,
        scrollSlow: true,
        interactionDetected: true,
      }).catch(() => {});
    }, 3200);
    return () => clearTimeout(tid);
  }, [videoId, loading, error, isLiveSource]);

  const startOfflineDownload = useCallback(async () => {
    if (!videoId || !downloadUrl) return;
    try {
      const res = await apiClient.get(`/videos/${encodeURIComponent(videoId)}`);
      const v = (res.data?.data ?? res.data) as Record<string, unknown>;
      const thumb = toAbsoluteMediaUrl(String(v.thumbnail_url || '')).trim();
      const creatorName = String(v.creator_name || '').trim() || 'Créateur';
      const creatorAvatar = toAbsoluteMediaUrl(String(v.creator_avatar || '')).trim();
      const duration = typeof v.duration === 'number' && Number.isFinite(v.duration) ? v.duration : 0;
      await download(downloadUrl, {
        id: videoId,
        title: String(v.title || title || 'Vidéo'),
        thumbnailUrl: thumb,
        duration,
        creatorName,
        creatorAvatar,
      });
    } catch {
      await download(downloadUrl, {
        id: videoId,
        title: title || 'Vidéo',
        thumbnailUrl: '',
        duration: 0,
        creatorName: 'Créateur',
        creatorAvatar: '',
      });
    }
  }, [videoId, downloadUrl, title, download]);

  const onRemoveDownload = useCallback(() => {
    Alert.alert('Supprimer le téléchargement ?', 'La vidéo ne sera plus disponible hors ligne.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => void remove() },
    ]);
  }, [remove]);

  const showDownloadRow =
    Platform.OS !== 'web' &&
    !!playUrl &&
    mediaType === 'video' &&
    !loading &&
    !error &&
    !isLiveSource;
  const canSaveOffline = Boolean(downloadUrl) && !fromLocalFile;
  const dlProgress = progress?.progress ?? 0;
  const dlActive = progress?.status === 'downloading' || progress?.status === 'queued';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={12}
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lecture</Text>
        <TouchableOpacity
          onPress={() => router.push('/downloads')}
          style={styles.backBtn}
          hitSlop={12}
          accessibilityLabel="Mes téléchargements"
        >
          <Ionicons name="download-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {showDownloadRow ? (
        <View style={styles.downloadBar}>
          {fromLocalFile ? (
            <View style={styles.downloadRow}>
              <Ionicons name="phone-portrait-outline" size={22} color={Colors.primary} />
              <Text style={styles.downloadText}>Lecture hors ligne</Text>
              <TouchableOpacity onPress={onRemoveDownload} style={styles.downloadAction}>
                <Text style={styles.downloadActionDanger}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          ) : isDownloaded ? (
            <View style={styles.downloadRow}>
              <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
              <Text style={styles.downloadText}>Enregistrée hors ligne</Text>
              <TouchableOpacity onPress={onRemoveDownload} style={styles.downloadAction}>
                <Text style={styles.downloadActionDanger}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          ) : dlActive ? (
            <View style={styles.downloadRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.downloadText}>
                {progress?.status === 'queued' ? 'En file…' : 'Téléchargement…'}{' '}
                {Math.round(dlProgress * 100)}%
              </Text>
            </View>
          ) : progress?.status === 'failed' ? (
            <View style={styles.downloadRow}>
              <Ionicons name="alert-circle" size={22} color={Colors.warning} />
              <Text style={styles.downloadTextFail} numberOfLines={2}>
                {progress.error || 'Échec'}
              </Text>
              <TouchableOpacity
                onPress={() => void startOfflineDownload()}
                style={styles.downloadAction}
              >
                <Text style={styles.downloadActionLink}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          ) : canSaveOffline ? (
            <TouchableOpacity testID="save-button" style={styles.downloadBtn} onPress={() => void startOfflineDownload()}>
              <Ionicons name="download-outline" size={20} color="#FFF" />
              <Text style={styles.downloadBtnLabel}>Télécharger pour hors ligne</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.downloadRow}>
              <Ionicons name="information-circle-outline" size={22} color={Colors.textMuted} />
              <Text style={styles.downloadHint}>
                Hors ligne : une source MP4 est nécessaire (flux HLS seul non téléchargeable ici).
              </Text>
            </View>
          )}
        </View>
      ) : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => void load()}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : mediaType === 'photo' && photoUrl ? (
        <View style={styles.photoWrap}>
          <Image
            source={{ uri: photoUrl }}
            style={styles.photo}
            resizeMode="contain"
            accessibilityLabel={title || 'Photo'}
          />
          {title ? (
            <Text style={styles.videoTitle} numberOfLines={2}>
              {title}
            </Text>
          ) : null}
        </View>
      ) : playUrl ? (
        <InlinePlayer
          uri={playUrl}
          title={title}
          trimStartSec={trimStartSec}
          trimEndSec={trimEndSec}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  downloadBar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222',
  },
  downloadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  downloadText: { flex: 1, color: '#EEE', fontSize: 14 },
  downloadTextFail: { flex: 1, color: '#FFB74D', fontSize: 13 },
  downloadHint: { flex: 1, color: Colors.textMuted, fontSize: 13, lineHeight: 18 },
  downloadAction: { paddingVertical: 4, paddingHorizontal: 4 },
  downloadActionDanger: { color: '#FF6B6B', fontWeight: '700', fontSize: 14 },
  downloadActionLink: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2A2A2A',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  downloadBtnLabel: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: Colors.textSecondary, textAlign: 'center', marginTop: 12 },
  retryBtn: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: '#222' },
  retryText: { color: Colors.primary, fontWeight: '700' },
  playerWrap: { flex: 1, justifyContent: 'center' },
  video: { width: '100%', flex: 1, backgroundColor: '#000' },
  photoWrap: { flex: 1, backgroundColor: '#000' },
  photo: { width: '100%', flex: 1, backgroundColor: '#000' },
  videoTitle: {
    color: '#EEE',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
  },
});
