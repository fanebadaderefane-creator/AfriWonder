import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import apiClient from '../api/client';
import { Colors, FontSizes, Spacing } from '../theme/colors';
import { ImageOrPlaceholder } from '../components/common/ImageOrPlaceholder';
import { profileAvatarUri } from '../utils/avatarFallback';
import { mapLiveDiscoveryStreams, type LiveDiscoveryCard } from './mapLiveDiscoveryStreams';

function formatViewers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

export function LiveHomeSuggestionsRow({
  visible,
  topOffset = 0,
}: {
  visible: boolean;
  topOffset?: number;
}) {
  const [items, setItems] = useState<LiveDiscoveryCard[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/live/discovery', { params: { type: 'trending', limit: 12 } });
      const data = res.data?.data ?? res.data;
      setItems(mapLiveDiscoveryStreams(data));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    void load();
    const id = setInterval(() => void load(), 60_000);
    return () => clearInterval(id);
  }, [visible, load]);

  if (!visible || (!loading && items.length === 0)) return null;

  return (
    <View style={[styles.wrap, { top: topOffset }]} pointerEvents="box-none" testID="home-live-suggestions">
      <View style={styles.headerRow}>
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.livePillText}>Lives</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/live/feed' as never)} accessibilityLabel="Voir tous les lives">
          <Text style={styles.seeAll}>Tout voir</Text>
        </TouchableOpacity>
      </View>
      {loading && items.length === 0 ? (
        <ActivityIndicator color={Colors.primary} style={{ marginVertical: 8 }} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {items.map((live) => (
            <TouchableOpacity
              key={live.id}
              style={styles.item}
              onPress={() => router.push({ pathname: '/live/[id]', params: { id: live.id } } as never)}
              accessibilityLabel={`Live ${live.creatorName}`}
            >
              <View style={styles.avatarRing}>
                <ImageOrPlaceholder
                  uri={profileAvatarUri(live.creatorAvatar ?? live.thumbnailUrl, live.creatorName)}
                  style={styles.avatar}
                  icon="person"
                  iconSize={22}
                />
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {live.creatorName}
              </Text>
              <Text style={styles.viewers}>{formatViewers(live.viewerCount)}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.item} onPress={() => router.push('/live' as never)}>
            <View style={[styles.avatarRing, styles.moreRing]}>
              <Ionicons name="add" size={28} color="#FFF" />
            </View>
            <Text style={styles.name}>Hub Live</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    paddingTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginBottom: 4,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3366' },
  livePillText: { color: '#FFF', fontSize: FontSizes.xs, fontWeight: '800' },
  seeAll: { color: 'rgba(255,255,255,0.85)', fontSize: FontSizes.xs, fontWeight: '700' },
  scroll: { paddingHorizontal: Spacing.sm, gap: 10 },
  item: { width: 72, alignItems: 'center' },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#FF3366',
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreRing: {
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  liveBadge: {
    position: 'absolute',
    bottom: -2,
    backgroundColor: '#FF3366',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  liveBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  name: { color: '#FFF', fontSize: 10, fontWeight: '700', marginTop: 4, textAlign: 'center' },
  viewers: { color: 'rgba(255,255,255,0.7)', fontSize: 9 },
});
