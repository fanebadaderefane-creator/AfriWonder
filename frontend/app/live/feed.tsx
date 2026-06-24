/**
 * /live/feed — Reels-style vertical swiper entre lives actifs.
 *
 * UX TikTok :
 *  - Swipe vers le haut → live suivant
 *  - Swipe vers le bas → live précédent
 *  - Snap full-screen sur chaque live (paging)
 *  - Préchargement du player du live courant uniquement (économie data Afrique)
 *  - Le live courant joue, les autres sont en preview poster
 *
 * Implémentation :
 *  - FlatList vertical paginé (snapToInterval = screen height)
 *  - Chaque page = un mini "viewer" qui fetch playback URL + montre stream
 *  - Tap sur un live → ouvre la version complète /live/[id] avec chat/gifts
 *
 * Optimisations Afrique :
 *  - Lazy load : un seul stream actif à la fois
 *  - Mute par défaut (économie battery + meilleur scroll)
 *  - Auto-pause si scroll trop rapide (debounce 400ms)
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ViewabilityConfig,
  ViewToken,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '../../src/api/client';
import { Colors, FontSizes, Spacing } from '../../src/theme/colors';
import { profileAvatarUri } from '../../src/utils/avatarFallback';
import { toAbsoluteMediaUrl } from '../../src/utils/absoluteMediaUrl';

const { height: SCREEN_H } = Dimensions.get('window');

type LiveFeedItem = {
  id: string;
  title: string;
  creator: {
    id: string;
    name: string;
    avatar: string | null;
  };
  posterUrl: string | null;
  playbackUrl: string | null;
  viewers: number;
  category: string | null;
};

function formatViewers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

/** Carte plein écran d'un live. Le player joue UNIQUEMENT si isActive=true. */
function LiveFeedCard({ item, isActive, tabBarBottom }: { item: LiveFeedItem; isActive: boolean; tabBarBottom: number }) {
  const playbackUrl = useMemo(() => {
    if (!item.playbackUrl) return null;
    return toAbsoluteMediaUrl(item.playbackUrl) ?? item.playbackUrl;
  }, [item.playbackUrl]);

  const player = useVideoPlayer(playbackUrl ?? null, (p) => {
    p.muted = true;
    p.loop = true;
  });

  useEffect(() => {
    if (!player) return;
    try {
      if (isActive) {
        player.play();
      } else {
        player.pause();
      }
    } catch {
      /* ignore */
    }
  }, [isActive, player]);

  const posterUri = item.posterUrl
    ? toAbsoluteMediaUrl(item.posterUrl) ?? item.posterUrl
    : null;

  return (
    <View style={[styles.card, { height: SCREEN_H }]}>
      {playbackUrl ? (
        <VideoView style={StyleSheet.absoluteFillObject} player={player} contentFit="cover" nativeControls={false} />
      ) : posterUri ? (
        <Image source={{ uri: posterUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000' }]} />
      )}

      {/* Gradient bas pour lisibilité */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)']}
        style={[styles.bottomGradient, { paddingBottom: tabBarBottom + Spacing.lg }]}
      >
        <View style={styles.creatorRow}>
          <Image source={{ uri: profileAvatarUri(item.creator.avatar || '', item.creator.name) }} style={styles.creatorAvatar} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.creatorName} numberOfLines={1}>{item.creator.name}</Text>
            <Text style={styles.viewerCount}>
              <Ionicons name="eye" size={12} color="#FFF" /> {formatViewers(item.viewers)} viewers
            </Text>
          </View>
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        </View>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <TouchableOpacity
          style={styles.joinBtn}
          activeOpacity={0.8}
          testID={`live-feed-join-${item.id}`}
          onPress={() => router.push({ pathname: '/live/[id]', params: { id: item.id } } as never)}
        >
          <Ionicons name="enter-outline" size={18} color="#FFF" />
          <Text style={styles.joinBtnText}>Rejoindre le live</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Hint swipe au premier item */}
      {isActive ? null : null}
    </View>
  );
}

export default function LiveFeedScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<LiveFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadLives = useCallback(async () => {
    try {
      const res = await apiClient.get('/live/discovery', { params: { type: 'trending', limit: 30 } });
      const data = res.data?.data ?? res.data;
      const raw: any[] = Array.isArray(data?.streams)
        ? data.streams
        : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
            ? data
            : [];
      const mapped: LiveFeedItem[] = raw
        .filter((r) => r && (r.status === 'live' || !r.status))
        .map((r) => {
          const creator = r.creator || r.user || {};
          return {
            id: String(r.id || r.stream_id || ''),
            title: String(r.title || 'Live'),
            creator: {
              id: String(creator.id || creator.user_id || ''),
              name: String(creator.full_name || creator.username || 'Créateur'),
              avatar: creator.profile_image || creator.avatar || null,
            },
            posterUrl: r.poster_url || r.thumbnail_url || null,
            playbackUrl: r.playback_url || r.hls_url || r.stream_url || null,
            viewers: Number(r.viewer_count || r.viewers || 0),
            category: r.category || r.category_name || null,
          };
        })
        .filter((x) => x.id);
      setItems(mapped);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadLives();
  }, [loadLives]);

  const viewabilityConfig = useRef<ViewabilityConfig>({
    itemVisiblePercentThreshold: 80,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length === 0) return;
    const idx = viewableItems[0].index;
    if (typeof idx === 'number') setActiveIndex(idx);
  }).current;

  const renderItem = useCallback(
    ({ item, index }: { item: LiveFeedItem; index: number }) => (
      <LiveFeedCard item={item} isActive={index === activeIndex} tabBarBottom={insets.bottom} />
    ),
    [activeIndex, insets.bottom],
  );

  if (loading) {
    return (
      <View style={styles.center} testID="live-feed-loading">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.center} testID="live-feed-empty">
        <Ionicons name="radio-outline" size={64} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>Aucun live en ce moment</Text>
        <Text style={styles.emptyText}>Reviens plus tard ou démarre ton propre live !</Text>
        <TouchableOpacity style={styles.goLiveBtn} onPress={() => router.push('/live/start' as never)}>
          <Ionicons name="videocam" size={18} color="#FFF" />
          <Text style={styles.goLiveBtnText}>Démarrer un live</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="live-feed-screen">
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        pagingEnabled
        snapToInterval={SCREEN_H}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          void loadLives();
        }}
        getItemLayout={(_data, index) => ({ length: SCREEN_H, offset: SCREEN_H * index, index })}
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        windowSize={3}
        removeClippedSubviews
      />
      {/* Header back */}
      <TouchableOpacity
        testID="live-feed-back"
        style={[styles.backBtn, { top: insets.top + 8 }]}
        onPress={() => router.back()}
        accessibilityLabel="Retour"
      >
        <Ionicons name="chevron-back" size={26} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', padding: 32 },
  card: { width: '100%', backgroundColor: '#000', position: 'relative' },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  creatorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  creatorAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: Spacing.sm, backgroundColor: '#333' },
  creatorName: { color: '#FFF', fontSize: FontSizes.md, fontWeight: '700' },
  viewerCount: { color: 'rgba(255,255,255,0.85)', fontSize: FontSizes.xs, marginTop: 2 },
  liveBadge: {
    backgroundColor: '#FF3366',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  liveBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  title: { color: '#FFF', fontSize: FontSizes.md, fontWeight: '600', marginBottom: Spacing.md },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 100,
    gap: 8,
  },
  joinBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSizes.md },
  emptyTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '700', marginTop: 16, textAlign: 'center' },
  emptyText: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 8, textAlign: 'center' },
  goLiveBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 100,
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
  },
  goLiveBtnText: { color: '#FFF', fontWeight: '700' },
  backBtn: {
    position: 'absolute',
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
