import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../src/api/client';
import { Colors, Spacing } from '../../src/theme/colors';
import { toAbsoluteMediaUrl } from '../../src/utils/absoluteMediaUrl';

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

  const load = useCallback(async () => {
    if (!videoId) {
      setError('Vidéo introuvable');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/videos/${encodeURIComponent(videoId)}`);
      const v = res.data?.data ?? res.data;
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
      setTitle(v.title || '');
      setPlayUrl(url);
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message || e?.message;
      setError(msg ? String(msg).slice(0, 160) : 'Impossible de charger la vidéo');
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    void load();
  }, [load]);

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
        <View style={{ width: 40 }} />
      </View>

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
