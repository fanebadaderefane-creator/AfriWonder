import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, FlatList, Image, Dimensions } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const VIDEO_SIZE = (width - Spacing.md * 4) / 3;

// Mock trending data
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

const CATEGORIES = [
  { id: 'all', name: 'Tout', icon: 'apps' },
  { id: 'videos', name: 'Vidéos', icon: 'play-circle' },
  { id: 'users', name: 'Comptes', icon: 'people' },
  { id: 'products', name: 'Produits', icon: 'cart' },
  { id: 'events', name: 'Événements', icon: 'calendar' },
];

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

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
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher vidéos, comptes, produits..."
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
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Categories */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
        >
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                activeCategory === category.id && styles.categoryChipActive,
              ]}
              onPress={() => setActiveCategory(category.id)}
            >
              <Ionicons 
                name={category.icon as any} 
                size={16} 
                color={activeCategory === category.id ? Colors.text : Colors.textSecondary} 
              />
              <Text style={[
                styles.categoryText,
                activeCategory === category.id && styles.categoryTextActive,
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

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
            <Text style={styles.sectionTitle}>Découvrir</Text>
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
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  searchBar: {
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
  categoriesContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    marginRight: Spacing.sm,
    gap: Spacing.xs,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
  },
  categoryText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: Colors.text,
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
