import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Colors } from '../../src/theme/colors';
import { liveHubStyles as styles } from '../../src/screens/live/liveHub.styles';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { toAbsoluteMediaUrl } from '../../src/utils/absoluteMediaUrl';
import { ImageOrPlaceholder } from '../../src/components/common/ImageOrPlaceholder';

function formatScheduledShort(iso: string | undefined | null): string {
  if (!iso) return 'Date à confirmer';
  const t = Date.parse(String(iso));
  if (!Number.isFinite(t)) return 'Date à confirmer';
  return new Date(t).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

/** En prod : masquer le bouton de nettoyage sauf opt-in explicite (évite un libellé « test » en store). */
const showReplayCleanup =
  (typeof __DEV__ !== 'undefined' && __DEV__) ||
  process.env.EXPO_PUBLIC_SHOW_LIVE_REPLAY_CLEANUP === '1';

export default function LiveHubScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const params = useLocalSearchParams<{ creator_id?: string | string[] }>();
  const creatorIdFromUrl = useMemo(() => {
    const raw = params.creator_id;
    if (Array.isArray(raw)) return raw[0]?.trim() || undefined;
    return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
  }, [params.creator_id]);

  const [activeLives, setActiveLives] = useState<any[]>([]);
  const [scheduledLives, setScheduledLives] = useState<any[]>([]);
  const [replays, setReplays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const hasMyEndedReplays = useMemo(
    () => !!(user?.id && replays.some((r) => r.creator_id === user.id)),
    [user?.id, replays],
  );

  const loadData = useCallback(async () => {
    try {
      const liveParams: Record<string, string | number> = { status: 'live', limit: 24, sortBy: 'viewers' };
      const replayParams: Record<string, string | number> = { status: 'ended', sortBy: 'recent', limit: creatorIdFromUrl ? 100 : 30 };
      if (creatorIdFromUrl) {
        liveParams.creator_id = creatorIdFromUrl;
        replayParams.creator_id = creatorIdFromUrl;
      }
      const schedParams: Record<string, string | number> = {
        status: 'scheduled',
        limit: 16,
        sortBy: 'recent',
      };
      if (creatorIdFromUrl) schedParams.creator_id = creatorIdFromUrl;
      const [rLive, rReplay, rSched] = await Promise.allSettled([
        apiClient.get('/live', { params: liveParams }),
        apiClient.get('/live', { params: replayParams }),
        apiClient.get('/live', { params: schedParams }),
      ]);
      const liveInner =
        rLive.status === 'fulfilled' ? rLive.value.data?.data || rLive.value.data : null;
      const replayInner =
        rReplay.status === 'fulfilled' ? rReplay.value.data?.data || rReplay.value.data : null;
      const schedInner =
        rSched.status === 'fulfilled' ? rSched.value.data?.data || rSched.value.data : null;
      const liveStreams = liveInner?.streams || [];
      const endedStreams = replayInner?.streams || [];
      const schedStreams = schedInner?.streams || [];
      const thumbOf = (s: any) =>
        toAbsoluteMediaUrl(String(s.thumbnail_url || s.creator?.profile_image || '').trim());
      const mapLive = (s: any) => ({
        id: s.id,
        title: s.title,
        thumbnail_url: thumbOf(s),
        viewer_count: s.viewers_count ?? 0,
        likes: s.total_likes ?? 0,
      });
      const mapReplay = (s: any) => ({
        id: s.id,
        creator_id: s.creator_id,
        title: s.title,
        thumbnail_url: thumbOf(s),
        duration: (s.duration_minutes != null ? s.duration_minutes * 60 : 0),
        peak_viewers: s.peak_viewers ?? 0,
        likes: s.total_likes ?? 0,
        tip_amount: s.total_gifts_amount ?? s.total_tips_amount ?? 0,
        highlights: s.replay_chapters || [],
      });
      const mapScheduled = (s: any) => ({
        id: s.id,
        title: s.title,
        thumbnail_url: thumbOf(s),
        scheduled_at: s.scheduled_at as string | undefined,
      });
      setActiveLives(Array.isArray(liveStreams) ? liveStreams.map(mapLive) : []);
      setScheduledLives(Array.isArray(schedStreams) ? schedStreams.map(mapScheduled) : []);
      setReplays(Array.isArray(endedStreams) ? endedStreams.map(mapReplay) : []);
    } catch {} finally {
      setLoading(false);
    }
  }, [creatorIdFromUrl]);

  useEffect(() => {
    setLoading(true);
    void loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const confirmCleanupMyEnded = () => {
    if (!user?.id || !hasMyEndedReplays || cleaning) return;
    Alert.alert(
      'Nettoyer tes replays',
      'Supprimer de la liste tous tes lives déjà terminés ? Cette action est définitive.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setCleaning(true);
              await apiClient.delete('/live/me/ended');
              await loadData();
            } catch {
              Alert.alert('Erreur', 'Impossible de nettoyer pour le moment.');
            } finally {
              setCleaning(false);
            }
          },
        },
      ],
    );
  };

  const formatDuration = (s: number) => { const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); return h > 0 ? `${h}h${m}m` : `${m}min`; };
  const formatViewers = (n: number) => n >= 1000 ? (n/1000).toFixed(1) + 'K' : String(n);

  if (loading) return <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live & Replays</Text>
        <TouchableOpacity testID="go-live-button" style={styles.goLiveBtn} onPress={() => router.push('/live/stream' as any)}>
          <Ionicons name="radio" size={18} color="#FFF" />
          <Text style={styles.goLiveBtnText}>Go Live</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Active Lives */}
        {activeLives.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.liveDot} />
              <Text style={styles.sectionTitle}>En direct maintenant</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.liveScroll}>
              {activeLives.map(live => (
                <TouchableOpacity
                  key={live.id}
                  style={styles.liveCard}
                  onPress={() => router.push({ pathname: '/live/[id]', params: { id: live.id } } as never)}
                >
                  <ImageOrPlaceholder uri={live.thumbnail_url} style={styles.liveImage} icon="videocam" iconSize={40} />
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

        {scheduledLives.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Programmés</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.liveScroll}>
              {scheduledLives.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.scheduledCard}
                  onPress={() => router.push({ pathname: '/live/[id]', params: { id: s.id } } as never)}
                >
                  <ImageOrPlaceholder uri={s.thumbnail_url} style={styles.scheduledImage} icon="calendar" iconSize={36} />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.scheduledOverlay}>
                    <View style={styles.scheduledBadge}>
                      <Ionicons name="time-outline" size={12} color="#FFF" />
                      <Text style={styles.scheduledBadgeText}>BIENTÔT</Text>
                    </View>
                    <Text style={styles.scheduledTitle} numberOfLines={2}>
                      {s.title}
                    </Text>
                    <Text style={styles.scheduledWhen}>{formatScheduledShort(s.scheduled_at)}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Replays */}
        <View style={styles.replaysSectionRow}>
          <Text style={[styles.sectionTitle, { flex: 1 }]}>Replays</Text>
          {hasMyEndedReplays && showReplayCleanup ? (
            <TouchableOpacity
              testID="cleanup-my-ended-lives"
              onPress={confirmCleanupMyEnded}
              disabled={cleaning}
              style={styles.cleanupBtn}
            >
              <Text style={styles.cleanupBtnText}>{cleaning ? '…' : 'Nettoyer mes replays'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {replays.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="videocam-off-outline" size={50} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyText}>Aucun replay disponible</Text>
          </View>
        ) : replays.map((replay, idx) => (
          <TouchableOpacity
            key={replay.id}
            testID={idx === 0 ? 'live-replay-card' : undefined}
            style={styles.replayCard}
            onPress={() => router.push({ pathname: '/live/replay', params: { id: replay.id } } as any)}
          >
            <ImageOrPlaceholder uri={replay.thumbnail_url} style={styles.replayThumb} icon="play-circle" iconSize={36} />
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
