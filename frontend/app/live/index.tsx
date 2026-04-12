import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Dimensions } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '../../src/api/client';

const { width } = Dimensions.get('window');

export default function LiveHubScreen() {
  const insets = useSafeAreaInsets();
  const [activeLives, setActiveLives] = useState<any[]>([]);
  const [replays, setReplays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [liveRes, replayRes] = await Promise.all([
        apiClient.get('/live', { params: { status: 'live', limit: 24, sortBy: 'viewers' } }),
        apiClient.get('/live', { params: { status: 'ended', limit: 30, sortBy: 'recent' } }),
      ]);
      const liveInner = liveRes.data?.data || liveRes.data;
      const replayInner = replayRes.data?.data || replayRes.data;
      const liveStreams = liveInner?.streams || [];
      const endedStreams = replayInner?.streams || [];
      const mapLive = (s: any) => ({
        id: s.id,
        title: s.title,
        thumbnail_url: s.thumbnail_url || s.creator?.profile_image || 'https://picsum.photos/400/600',
        viewer_count: s.viewers_count ?? 0,
        likes: s.total_likes ?? 0,
      });
      const mapReplay = (s: any) => ({
        id: s.id,
        title: s.title,
        thumbnail_url: s.thumbnail_url || s.creator?.profile_image || 'https://picsum.photos/400/600',
        duration: (s.duration_minutes != null ? s.duration_minutes * 60 : 0),
        peak_viewers: s.peak_viewers ?? 0,
        likes: s.total_likes ?? 0,
        tip_amount: s.total_tips_amount ?? 0,
        highlights: s.replay_chapters || [],
      });
      setActiveLives(Array.isArray(liveStreams) ? liveStreams.map(mapLive) : []);
      setReplays(Array.isArray(endedStreams) ? endedStreams.map(mapReplay) : []);
    } catch {} finally { setLoading(false); }
  };

  const formatDuration = (s: number) => { const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); return h > 0 ? `${h}h${m}m` : `${m}min`; };
  const formatViewers = (n: number) => n >= 1000 ? (n/1000).toFixed(1) + 'K' : String(n);

  if (loading) return <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Live & Replays</Text>
        <TouchableOpacity style={styles.goLiveBtn} onPress={() => router.push('/live/stream' as any)}>
          <Ionicons name="radio" size={18} color="#FFF" />
          <Text style={styles.goLiveBtnText}>Go Live</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Active Lives */}
        {activeLives.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.liveDot} />
              <Text style={styles.sectionTitle}>En direct maintenant</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.liveScroll}>
              {activeLives.map(live => (
                <TouchableOpacity key={live.id} style={styles.liveCard} onPress={() => router.push({ pathname: '/live/replay', params: { id: live.id } } as any)}>
                  <Image source={{ uri: live.thumbnail_url }} style={styles.liveImage} />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.liveOverlay}>
                    <View style={styles.liveBadge}><View style={styles.liveBadgeDot} /><Text style={styles.liveBadgeText}>LIVE</Text></View>
                    <Text style={styles.liveTitle} numberOfLines={1}>{live.title}</Text>
                    <View style={styles.liveStats}>
                      <Ionicons name="eye" size={12} color="#FFF" />
                      <Text style={styles.liveStatText}>{formatViewers(live.viewer_count)}</Text>
                      <Ionicons name="heart" size={12} color="#E91E63" />
                      <Text style={styles.liveStatText}>{live.likes}</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Replays */}
        <Text style={[styles.sectionTitle, { paddingHorizontal: Spacing.xl, marginTop: Spacing.lg }]}>Replays</Text>
        {replays.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="videocam-off-outline" size={50} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyText}>Aucun replay disponible</Text>
          </View>
        ) : replays.map(replay => (
          <TouchableOpacity key={replay.id} style={styles.replayCard} onPress={() => router.push({ pathname: '/live/replay', params: { id: replay.id } } as any)}>
            <Image source={{ uri: replay.thumbnail_url }} style={styles.replayThumb} />
            <View style={styles.replayInfo}>
              <Text style={styles.replayTitle} numberOfLines={2}>{replay.title}</Text>
              <Text style={styles.replayMeta}>{formatDuration(replay.duration || 0)} • {formatViewers(replay.peak_viewers || 0)} spectateurs</Text>
              <View style={styles.replayStats}>
                <View style={styles.replayStatItem}><Ionicons name="heart" size={12} color="#E91E63" /><Text style={styles.replayStatText}>{replay.likes}</Text></View>
                <View style={styles.replayStatItem}><Ionicons name="gift" size={12} color="#FF6B00" /><Text style={styles.replayStatText}>{(replay.tip_amount || 0).toLocaleString()} FCFA</Text></View>
              </View>
              {(replay.highlights || []).length > 0 && (
                <View style={styles.highlightBadge}><Ionicons name="star" size={12} color="#FFEAA7" /><Text style={styles.highlightBadgeText}>{replay.highlights.length} moments forts</Text></View>
              )}
            </View>
          </TouchableOpacity>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  goLiveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E91E63', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, gap: 6 },
  goLiveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: FontSizes.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, marginTop: Spacing.md, gap: 8 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF0000' },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold' },
  liveScroll: { paddingHorizontal: Spacing.xl, gap: Spacing.md, paddingVertical: Spacing.md },
  liveCard: { width: width * 0.6, height: width * 0.8, borderRadius: BorderRadius.xl, overflow: 'hidden' },
  liveImage: { width: '100%', height: '100%' },
  liveOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.lg },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF0000', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, gap: 4, marginBottom: 6 },
  liveBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  liveBadgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  liveTitle: { color: '#FFF', fontSize: FontSizes.md, fontWeight: 'bold' },
  liveStats: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  liveStatText: { color: 'rgba(255,255,255,0.8)', fontSize: FontSizes.xs },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: Colors.textSecondary, fontSize: FontSizes.md },
  replayCard: { flexDirection: 'row', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, gap: Spacing.md },
  replayThumb: { width: 120, height: 160, borderRadius: BorderRadius.md },
  replayInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  replayTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold' },
  replayMeta: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  replayStats: { flexDirection: 'row', gap: Spacing.lg, marginTop: 4 },
  replayStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  replayStatText: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  highlightBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,234,167,0.15)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
  highlightBadgeText: { color: '#FFEAA7', fontSize: FontSizes.xs },
});
