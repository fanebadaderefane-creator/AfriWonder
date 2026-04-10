import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Dimensions, RefreshControl } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import apiClient from '../../src/api/client';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.xl * 2 - Spacing.md) / 2;

interface LiveStream {
  id: string;
  title: string;
  thumbnail: string;
  viewers: number;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string;
  };
}

const MOCK_STREAMS: LiveStream[] = [
  {
    id: 'live1',
    title: 'Live Dance Mali',
    thumbnail: 'https://picsum.photos/400/600?random=30',
    viewers: 234,
    user: { id: 'u1', firstName: 'Aminata', lastName: 'Diallo', avatar: 'https://i.pravatar.cc/150?img=1' },
  },
  {
    id: 'live2',
    title: 'Cuisine Senegalaise',
    thumbnail: 'https://picsum.photos/400/600?random=31',
    viewers: 189,
    user: { id: 'u2', firstName: 'Moussa', lastName: 'Ndiaye', avatar: 'https://i.pravatar.cc/150?img=2' },
  },
  {
    id: 'live3',
    title: 'Mode Africaine Show',
    thumbnail: 'https://picsum.photos/400/600?random=32',
    viewers: 567,
    user: { id: 'u3', firstName: 'Awa', lastName: 'Kone', avatar: 'https://i.pravatar.cc/150?img=3' },
  },
  {
    id: 'live4',
    title: 'Musique Live',
    thumbnail: 'https://picsum.photos/400/600?random=33',
    viewers: 891,
    user: { id: 'u4', firstName: 'Ibrahim', lastName: 'Toure', avatar: 'https://i.pravatar.cc/150?img=4' },
  },
];

export default function LiveListScreen() {
  const insets = useSafeAreaInsets();
  const [streams, setStreams] = useState<LiveStream[]>(MOCK_STREAMS);
  const [refreshing, setRefreshing] = useState(false);

  const loadStreams = async () => {
    try {
      const response = await apiClient.get('/live/streams');
      if (response.data.streams) {
        setStreams(response.data.streams);
      }
    } catch (error) {
      console.log('Using mock streams');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStreams();
    setRefreshing(false);
  };

  useEffect(() => {
    loadStreams();
  }, []);

  const formatViewers = (num: number) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const renderStream = ({ item }: { item: LiveStream }) => (
    <TouchableOpacity 
      style={styles.streamCard}
      onPress={() => router.push(`/live/${item.id}`)}
    >
      <Image source={{ uri: item.thumbnail }} style={styles.streamThumbnail} />
      
      {/* Live badge */}
      <View style={styles.liveBadge}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>LIVE</Text>
      </View>

      {/* Viewers count */}
      <View style={styles.viewersContainer}>
        <Ionicons name="eye" size={14} color={Colors.text} />
        <Text style={styles.viewersText}>{formatViewers(item.viewers)}</Text>
      </View>

      {/* Stream info */}
      <View style={styles.streamInfo}>
        <Image source={{ uri: item.user.avatar }} style={styles.streamerAvatar} />
        <View style={styles.streamDetails}>
          <Text style={styles.streamTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.streamerName}>{item.user.firstName} {item.user.lastName}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lives en cours</Text>
        <TouchableOpacity 
          style={styles.startLiveButton}
          onPress={() => router.push('/live/start')}
        >
          <Ionicons name="radio" size={20} color={Colors.text} />
          <Text style={styles.startLiveText}>Go Live</Text>
        </TouchableOpacity>
      </View>

      {streams.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="radio-outline" size={80} color={Colors.textSecondary} />
          <Text style={styles.emptyTitle}>Aucun live en cours</Text>
          <Text style={styles.emptySubtitle}>Soyez le premier a demarrer un live!</Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={() => router.push('/live/start')}
          >
            <Text style={styles.emptyButtonText}>Demarrer un live</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={streams}
          renderItem={renderStream}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.streamsList}
          columnWrapperStyle={styles.streamsRow}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  startLiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.live,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    gap: Spacing.xs,
  },
  startLiveText: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  streamsList: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  streamsRow: {
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  streamCard: {
    width: CARD_WIDTH,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  streamThumbnail: {
    width: '100%',
    height: CARD_WIDTH * 1.4,
  },
  liveBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.live,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.text,
  },
  liveText: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
  },
  viewersContainer: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  viewersText: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  streamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  streamerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  streamDetails: {
    flex: 1,
  },
  streamTitle: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  streamerName: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: Spacing.lg,
  },
  emptySubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xl,
  },
  emptyButtonText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
});
