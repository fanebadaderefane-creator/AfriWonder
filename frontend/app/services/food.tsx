import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, FlatList, TextInput, Dimensions } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

const FOOD_CATEGORIES = [
  { id: 'all', name: 'Tout', emoji: '\ud83c\udf7d\ufe0f' },
  { id: 'african', name: 'Africain', emoji: '\ud83c\udf5b' },
  { id: 'fastfood', name: 'Fast Food', emoji: '\ud83c\udf54' },
  { id: 'grills', name: 'Grillades', emoji: '\ud83c\udf56' },
  { id: 'drinks', name: 'Boissons', emoji: '\ud83e\uddc3' },
  { id: 'desserts', name: 'Desserts', emoji: '\ud83c\udf70' },
];

const RESTAURANTS = [
  {
    id: 'r1',
    name: 'Chez Fatoumata',
    image: 'https://picsum.photos/400/250?random=40',
    rating: 4.8,
    reviews: 234,
    deliveryTime: '25-35 min',
    deliveryFee: 500,
    cuisine: 'Africain',
    promo: '-20%',
    featured: true,
  },
  {
    id: 'r2',
    name: 'Bamako Burger',
    image: 'https://picsum.photos/400/250?random=41',
    rating: 4.5,
    reviews: 189,
    deliveryTime: '20-30 min',
    deliveryFee: 750,
    cuisine: 'Fast Food',
    promo: null,
    featured: false,
  },
  {
    id: 'r3',
    name: 'Le Thieboudienne',
    image: 'https://picsum.photos/400/250?random=42',
    rating: 4.9,
    reviews: 456,
    deliveryTime: '30-45 min',
    deliveryFee: 0,
    cuisine: 'Senegalais',
    promo: 'Livraison gratuite',
    featured: true,
  },
  {
    id: 'r4',
    name: 'Grillades du Sahel',
    image: 'https://picsum.photos/400/250?random=43',
    rating: 4.6,
    reviews: 112,
    deliveryTime: '35-50 min',
    deliveryFee: 500,
    cuisine: 'Grillades',
    promo: null,
    featured: false,
  },
];

export default function FoodDeliveryScreen() {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.locationContainer}>
          <Ionicons name="location" size={16} color={Colors.primary} />
          <Text style={styles.locationText}>Bamako, Mali</Text>
          <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
        </View>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un restaurant ou un plat..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {FOOD_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, activeCategory === cat.id && styles.categoryChipActive]}
              onPress={() => setActiveCategory(cat.id)}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={[styles.categoryText, activeCategory === cat.id && styles.categoryTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured Banner */}
        <TouchableOpacity style={styles.featuredBanner}>
          <View style={styles.featuredContent}>
            <Text style={styles.featuredLabel}>OFFRE SPECIALE</Text>
            <Text style={styles.featuredTitle}>Thieboudienne</Text>
            <Text style={styles.featuredPrice}>A partir de 2 500 FCFA</Text>
          </View>
          <Image source={{ uri: 'https://picsum.photos/150/150?random=50' }} style={styles.featuredImage} />
        </TouchableOpacity>

        {/* Restaurants */}
        <Text style={styles.sectionTitle}>Restaurants populaires</Text>
        {RESTAURANTS.map((restaurant) => (
          <TouchableOpacity key={restaurant.id} style={styles.restaurantCard}>
            <Image source={{ uri: restaurant.image }} style={styles.restaurantImage} />
            {restaurant.promo && (
              <View style={styles.promoBadge}>
                <Text style={styles.promoText}>{restaurant.promo}</Text>
              </View>
            )}
            <View style={styles.restaurantInfo}>
              <Text style={styles.restaurantName}>{restaurant.name}</Text>
              <View style={styles.restaurantMeta}>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={14} color={Colors.accent} />
                  <Text style={styles.ratingText}>{restaurant.rating}</Text>
                  <Text style={styles.reviewsText}>({restaurant.reviews})</Text>
                </View>
                <Text style={styles.dotSeparator}>\u2022</Text>
                <Text style={styles.cuisineText}>{restaurant.cuisine}</Text>
              </View>
              <View style={styles.deliveryInfo}>
                <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.deliveryText}>{restaurant.deliveryTime}</Text>
                <Text style={styles.dotSeparator}>\u2022</Text>
                <Text style={styles.deliveryFee}>
                  {restaurant.deliveryFee === 0 ? 'Livraison gratuite' : `${restaurant.deliveryFee} FCFA`}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  locationText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
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
  categoriesScroll: {
    paddingHorizontal: Spacing.xl,
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
  categoryEmoji: {
    fontSize: 16,
  },
  categoryText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: Colors.text,
  },
  featuredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  featuredContent: {
    flex: 1,
  },
  featuredLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  featuredTitle: {
    color: Colors.text,
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  featuredPrice: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: FontSizes.md,
  },
  featuredImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.text,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  restaurantCard: {
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  restaurantImage: {
    width: '100%',
    height: 160,
  },
  promoBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  promoText: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
  },
  restaurantInfo: {
    padding: Spacing.md,
  },
  restaurantName: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  reviewsText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
  },
  dotSeparator: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
  },
  cuisineText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  deliveryText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  deliveryFee: {
    color: Colors.success,
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
});
