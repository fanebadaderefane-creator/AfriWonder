import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import apiClient from '../../src/api/client';
import { Colors, Spacing } from '../../src/theme/colors';
import { toAbsoluteMediaUrl } from '../../src/utils/absoluteMediaUrl';
import { useVideoDownload, videoDownloadManager } from '../../src/services/videoDownloadService';

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

function InlinePlayer({ uri, title }: { uri: string; title: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = false;
    p.play();
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

export default function WatchVideoScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const videoId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';

  const [playUrl, setPlayUrl] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [fromLocalFile, setFromLocalFile] = useState(false);

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

    try {
      const offlineList = await videoDownloadManager.getDownloadedVideos();
      const local = offlineList.find((x) => x.id === videoId);
      if (local && Platform.OS !== 'web') {
        const info = await FileSystem.getInfoAsync(local.localPath);
        if (info.exists) {
          setTitle(local.title || '');
          setPlayUrl(local.localPath);
          setFromLocalFile(true);
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
        setError('Vidéo introuvable');
        setPlayUrl('');
        return;
      }
      const raw =
        v.video_url ||
        v.hls_url ||
        v.low_quality_playback_url ||
        v.low_quality_url ||
        '';
      const url = toAbsoluteMediaUrl(String(raw)).trim();
      if (!url) {
        setError('Aucune source vidéo disponible');
        return;
      }
      setTitle(String(v.title || ''));
      setPlayUrl(url);
      setDownloadUrl(pickProgressiveDownloadUrl(v));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const msg = err?.response?.data?.error?.message || err?.message;
      setError(msg ? String(msg).slice(0, 160) : 'Impossible de charger la vidéo');
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const showDownloadRow = Platform.OS !== 'web' && !!playUrl && !loading && !error;
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
      ) : playUrl ? (
        <InlinePlayer uri={playUrl} title={title} />
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
  videoTitle: {
    color: '#EEE',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
  },
});
