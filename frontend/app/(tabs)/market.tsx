import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, FlatList, Dimensions } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const PRODUCT_WIDTH = (width - Spacing.xl * 2 - Spacing.md) / 2;

// Mock marketplace data
const CATEGORIES = [
  { id: '1', name: 'Mode', icon: 'shirt', color: '#FF6B6B' },
  { id: '2', name: '\u00c9lectronique', icon: 'phone-portrait', color: '#4ECDC4' },
  { id: '3', name: 'Alimentation', icon: 'fast-food', color: '#FFE66D' },
  { id: '4', name: 'Maison', icon: 'home', color: '#95E1D3' },
  { id: '5', name: 'Beaut\u00e9', icon: 'sparkles', color: '#DDA0DD' },
  { id: '6', name: 'Sport', icon: 'football', color: '#98D8C8' },
];

const PRODUCTS = [
  {
    id: 'p1',
    name: 'Robe Bogolan',
    price: 25000,
    image: 'https://picsum.photos/300/400?random=20',
    rating: 4.8,
    reviews: 124,
    seller: 'Awa Mode',
  },
  {
    id: 'p2',
    name: 'T\u00e9l\u00e9phone Samsung A54',
    price: 185000,
    image: 'https://picsum.photos/300/400?random=21',
    rating: 4.5,
    reviews: 89,
    seller: 'Tech Mali',
  },
  {
    id: 'p3',
    name: 'Panier de fruits frais',
    price: 5000,
    image: 'https://picsum.photos/300/400?random=22',
    rating: 4.9,
    reviews: 234,
    seller: 'March\u00e9 Frais',
  },
  {
    id: 'p4',
    name: 'Bijoux traditionnels',
    price: 15000,
    image: 'https://picsum.photos/300/400?random=23',
    rating: 4.7,
    reviews: 56,
    seller: 'Artisanat Bamako',
  },
  {
    id: 'p5',
    name: 'Sac en cuir',
    price: 35000,
    image: 'https://picsum.photos/300/400?random=24',
    rating: 4.6,
    reviews: 78,
    seller: 'Cuir Sahel',
  },
  {
    id: 'p6',
    name: 'Huile de karit\u00e9',
    price: 3500,
    image: 'https://picsum.photos/300/400?random=25',
    rating: 4.9,
    reviews: 312,
    seller: 'Bio Mali',
  },
];

export default function MarketScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');

  const formatPrice = (price: number) => {
    return price.toLocaleString('fr-FR') + ' FCFA';
  };

  const renderCategory = ({ item }: { item: typeof CATEGORIES[0] }) => (
    <TouchableOpacity style={styles.categoryCard}>
      <View style={[styles.categoryIcon, { backgroundColor: item.color }]}>
        <Ionicons name={item.icon as any} size={24} color={Colors.text} />
      </View>
      <Text style={styles.categoryName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderProduct = ({ item }: { item: typeof PRODUCTS[0] }) => (
    <TouchableOpacity style={styles.productCard}>
      <Image source={{ uri: item.image }} style={styles.productImage} />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productPrice}>{formatPrice(item.price)}</Text>
        <View style={styles.productMeta}>
          <Ionicons name="star" size={14} color={Colors.accent} />
          <Text style={styles.productRating}>{item.rating}</Text>
          <Text style={styles.productReviews}>({item.reviews})</Text>
        </View>
        <Text style={styles.productSeller}>{item.seller}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Marketplace</Text>
        <TouchableOpacity style={styles.cartButton}>
          <Ionicons name="cart" size={24} color={Colors.text} />
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>3</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher des produits..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Promo Banner */}
        <TouchableOpacity style={styles.promoBanner}>
          <View style={styles.promoContent}>
            <Text style={styles.promoLabel}>PROMO</Text>
            <Text style={styles.promoTitle}>-30% sur la mode</Text>
            <Text style={styles.promoSubtitle}>Jusqu'au 31 juillet</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={Colors.text} />
        </TouchableOpacity>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cat\u00e9gories</Text>
          <FlatList
            data={CATEGORIES}
            renderItem={renderCategory}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        </View>

        {/* Products Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Produits populaires</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={PRODUCTS}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.productsGrid}
            columnWrapperStyle={styles.productsRow}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  cartButton: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.primary,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSizes.md,
    paddingVertical: Spacing.md,
  },
  filterButton: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  promoContent: {
    flex: 1,
  },
  promoLabel: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.text,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  seeAll: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    fontWeight: '500',
  },
  categoryCard: {
    alignItems: 'center',
    marginLeft: Spacing.xl,
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  categoryName: {
    color: Colors.text,
    fontSize: FontSizes.sm,
  },
  productsGrid: {
    paddingHorizontal: Spacing.xl,
  },
  productsRow: {
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  productCard: {
    width: PRODUCT_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: PRODUCT_WIDTH * 1.2,
  },
  productInfo: {
    padding: Spacing.md,
  },
  productName: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  productPrice: {
    color: Colors.primary,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.xs,
  },
  productRating: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  productReviews: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
  },
  productSeller: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
  },
});
