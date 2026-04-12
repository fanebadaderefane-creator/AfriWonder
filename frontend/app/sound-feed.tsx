import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../src/api/client';
import { Colors, Spacing, FontSizes, BorderRadius } from '../src/theme/colors';
import { useAuthStore } from '../src/store/authStore';

function normParam(v: string | string[] | undefined) {
  if (v == null) return '';
  return (Array.isArray(v) ? v[0] : v) || '';
}

type Row = { id: string; title?: string; thumbnail_url?: string; views?: number; creator_name?: string };

export default function SoundFeedScreen() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { isAuthenticated } = useAuthStore();
  const params = useLocalSearchParams<{ title?: string | string[] }>();
  const rawTitle = normParam(params.title);
  const soundTitle = (() => {
    try {
      return decodeURIComponent(rawTitle).trim() || 'Son';
    } catch {
      return rawTitle.trim() || 'Son';
    }
  })();

  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!soundTitle.trim()) {
      setItems([]);
      setLoading(false);
      setErr(null);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await apiClient.get('/videos', {
        params: { page: 1, limit: 40, search: soundTitle, visibility: 'public' },
      });
      const data = res.data?.data ?? res.data;
      const videos = Array.isArray(data?.videos) ? data.videos : [];
      setItems(
        videos.map((v: any) => ({
          id: v.id,
          title: v.title,
          thumbnail_url: v.thumbnail_url || v.video_url,
          views: v.views,
          creator_name: v.creator_name || v.creator?.full_name || v.creator?.username,
        })),
      );
    } catch (e: unknown) {
      const ax = e as { message?: string };
      setErr(String(ax?.message || 'Erreur réseau'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [soundTitle]);

  useEffect(() => {
    void load();
  }, [load]);

  const horizontalInset = Spacing.md * 2;
  const colGap = 8;
  const cellW = Math.max(1, Math.floor((windowWidth - horizontalInset - colGap) / 2));
  const cellH = Math.round(cellW * (16 / 9));

  const goUseSoundForNewVideo = () => {
    if (!soundTitle.trim()) return;
    if (!isAuthenticated) {
      Alert.alert('Connexion requise', 'Connectez-vous pour créer une vidéo avec ce son.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se connecter', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }
    router.push({
      pathname: '/(tabs)/create',
      params: { useSoundTitle: soundTitle.slice(0, 200) },
    } as any);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.headerLabel}>Son</Text>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {soundTitle}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.useSoundBtn}
          onPress={goUseSoundForNewVideo}
          activeOpacity={0.88}
          accessibilityLabel="Utiliser ce son pour une nouvelle vidéo"
        >
          <Ionicons name="add-circle-outline" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} size="large" />
      ) : err ? (
        <Text style={styles.err}>{err}</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          numColumns={2}
          columnWrapperStyle={{ gap: colGap, paddingHorizontal: Spacing.md }}
          contentContainerStyle={{ paddingBottom: 40, gap: colGap }}
          ListEmptyComponent={
            <Text style={styles.empty}>Aucune autre vidéo trouvée pour ce titre audio.</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.cell, { width: cellW, height: cellH }]}
              onPress={() => router.push({ pathname: '/watch/[id]', params: { id: item.id } })}
              activeOpacity={0.88}
            >
              <Image source={{ uri: item.thumbnail_url || '' }} style={styles.thumb} resizeMode="cover" />
              <View style={styles.meta}>
                <Text style={styles.metaTitle} numberOfLines={2}>
                  {item.title || 'Vidéo'}
                </Text>
                {item.creator_name ? (
                  <Text style={styles.metaSub} numberOfLines={1}>
                    {item.creator_name}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerLabel: { color: Colors.textMuted, fontSize: FontSizes.xs, fontWeight: '600', textTransform: 'uppercase' },
  headerTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700', marginTop: 2 },
  useSoundBtn: {
    backgroundColor: Colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  err: { color: Colors.textSecondary, padding: Spacing.lg, textAlign: 'center' },
  empty: { color: Colors.textMuted, padding: Spacing.xl, textAlign: 'center', fontSize: FontSizes.sm },
  cell: { borderRadius: BorderRadius.md, overflow: 'hidden', backgroundColor: Colors.surface },
  thumb: { ...StyleSheet.absoluteFillObject },
  meta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  metaTitle: { color: '#FFF', fontSize: FontSizes.sm, fontWeight: '600' },
  metaSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },
});
