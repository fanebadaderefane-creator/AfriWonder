import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, FlatList, Image, Dimensions } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');
const VIDEO_SIZE = (width - Spacing.md * 4) / 3;
const SERVICE_SIZE = (width - Spacing.xl * 2 - Spacing.md * 3) / 4;

// Services Grid (Super-app hub)
const SERVICES = [
  { id: 'food', name: 'Livraison', icon: 'fast-food', color: '#FF6B6B', route: '/services/food' },
  { id: 'transport', name: 'Transport', icon: 'car', color: '#4ECDC4', route: '/services/transport' },
  { id: 'health', name: 'Sante', icon: 'medkit', color: '#45B7D1', route: '/services/health' },
  { id: 'wallet', name: 'Finance', icon: 'wallet', color: '#FF6B00', route: '/wallet' },
  { id: 'education', name: 'Formations', icon: 'school', color: '#82E0AA', route: '/courses' },
  { id: 'news', name: 'Actualites', icon: 'newspaper', color: '#E67E22', route: '/news' },
  { id: 'voyage', name: 'Voyage', icon: 'airplane', color: '#3498DB', route: '/services/voyage' },
  { id: 'more', name: 'Plus', icon: 'grid', color: '#A0A0A0', route: '/services' },
];

const TRENDING_HASHTAGS = [
  { tag: 'MaliDance', count: '125K' },
  { tag: 'AfriFood', count: '98K' },
  { tag: 'DakarLife', count: '87K' },
  { tag: 'Bogolan', count: '76K' },
  { tag: 'AfroBeats', count: '234K' },
  { tag: 'SahelVibes', count: '45K' },
];

const EXPLORE_VIDEOS = Array.from({ length: 12 }, (_, i) => ({
  id: `v${i}`,
  thumbnail: `https://picsum.photos/200/300?random=${i + 10}`,
  views: Math.floor(Math.random() * 100000),
  isLive: i === 2,
}));

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');

  const formatViews = (num: number) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const renderVideoThumbnail = ({ item }: { item: typeof EXPLORE_VIDEOS[0] }) => (
    <TouchableOpacity style={styles.videoThumbnail}>
      <Image source={{ uri: item.thumbnail }} style={styles.thumbnailImage} />
      {item.isLive && (
        <View style={styles.liveBadge}>
          <Text style={styles.liveBadgeText}>LIVE</Text>
        </View>
      )}
      <View style={styles.viewsContainer}>
        <Ionicons name="play" size={12} color={Colors.text} />
        <Text style={styles.viewsText}>{formatViews(item.views)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header with search + icons */}
      <View style={styles.headerRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/messages')}>
          <Ionicons name="chatbubble-ellipses" size={22} color={Colors.text} />
          <View style={styles.badge}><Text style={styles.badgeText}>4</Text></View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/notifications')}>
          <Ionicons name="notifications" size={22} color={Colors.text} />
          <View style={styles.badge}><Text style={styles.badgeText}>3</Text></View>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Services Grid - Super App Hub */}
        <View style={styles.servicesSection}>
          <View style={styles.servicesGrid}>
            {SERVICES.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceItem}
                onPress={() => router.push(service.route as any)}
              >
                <View style={[styles.serviceIcon, { backgroundColor: service.color }]}>
                  <Ionicons name={service.icon as any} size={22} color="#FFFFFF" />
                </View>
                <Text style={styles.serviceName}>{service.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Promo Banner */}
        <TouchableOpacity style={styles.promoBanner}>
          <View style={styles.promoContent}>
            <Text style={styles.promoLabel}>NOUVEAU</Text>
            <Text style={styles.promoTitle}>Livraison gratuite</Text>
            <Text style={styles.promoSubtitle}>Sur votre 1ere commande</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={Colors.text} />
        </TouchableOpacity>

        {/* Trending Hashtags */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up" size={24} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Tendances</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {TRENDING_HASHTAGS.map((item, index) => (
              <TouchableOpacity key={index} style={styles.hashtagChip}>
                <Text style={styles.hashtagText}>#{item.tag}</Text>
                <Text style={styles.hashtagCount}>{item.count}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Explore Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="compass" size={24} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Decouvrir</Text>
          </View>
          <FlatList
            data={EXPLORE_VIDEOS}
            renderItem={renderVideoThumbnail}
            keyExtractor={(item) => item.id}
            numColumns={3}
            scrollEnabled={false}
            contentContainerStyle={styles.videosGrid}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSizes.md,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    backgroundColor: Colors.live,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: Colors.text,
    fontSize: 9,
    fontWeight: 'bold',
  },
  servicesSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  serviceItem: {
    width: SERVICE_SIZE,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  serviceName: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    fontWeight: '500',
    textAlign: 'center',
  },
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  promoContent: {
    flex: 1,
  },
  promoLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  promoTitle: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
  },
  promoSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSizes.sm,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
  },
  hashtagChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginLeft: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hashtagText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  hashtagCount: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  videosGrid: {
    paddingHorizontal: Spacing.md,
    gap: 2,
  },
  videoThumbnail: {
    width: VIDEO_SIZE,
    height: VIDEO_SIZE * 1.4,
    margin: 1,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  liveBadge: {
    position: 'absolute',
    top: Spacing.xs,
    left: Spacing.xs,
    backgroundColor: Colors.live,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  liveBadgeText: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
  },
  viewsContainer: {
    position: 'absolute',
    bottom: Spacing.xs,
    left: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewsText: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
});
