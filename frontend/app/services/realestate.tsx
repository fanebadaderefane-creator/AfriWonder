import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const PROPERTY_TYPES = [
  { id: 'all', name: 'Tout' },
  { id: 'rent', name: 'Location' },
  { id: 'buy', name: 'Achat' },
  { id: 'land', name: 'Terrain' },
];

const PROPERTIES = [
  {
    id: 'p1',
    title: 'Appartement moderne ACI 2000',
    image: 'https://picsum.photos/400/300?random=60',
    price: 250000,
    type: 'rent',
    bedrooms: 3,
    bathrooms: 2,
    area: 120,
    location: 'ACI 2000, Bamako',
  },
  {
    id: 'p2',
    title: 'Villa avec jardin Badalabougou',
    image: 'https://picsum.photos/400/300?random=61',
    price: 85000000,
    type: 'buy',
    bedrooms: 5,
    bathrooms: 3,
    area: 350,
    location: 'Badalabougou, Bamako',
  },
  {
    id: 'p3',
    title: 'Studio meuble Hamdallaye',
    image: 'https://picsum.photos/400/300?random=62',
    price: 150000,
    type: 'rent',
    bedrooms: 1,
    bathrooms: 1,
    area: 35,
    location: 'Hamdallaye, Bamako',
  },
  {
    id: 'p4',
    title: 'Terrain constructible Sotuba',
    image: 'https://picsum.photos/400/300?random=63',
    price: 25000000,
    type: 'land',
    bedrooms: 0,
    bathrooms: 0,
    area: 600,
    location: 'Sotuba, Bamako',
  },
];

export default function RealEstateScreen() {
  const insets = useSafeAreaInsets();
  const [activeType, setActiveType] = useState('all');

  const formatPrice = (price: number, type: string) => {
    if (type === 'rent') return price.toLocaleString('fr-FR') + ' FCFA/mois';
    return price.toLocaleString('fr-FR') + ' FCFA';
  };

  const filtered = activeType === 'all' ? PROPERTIES : PROPERTIES.filter(p => p.type === activeType);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Immobilier</Text>
        <TouchableOpacity>
          <Ionicons name="filter" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Type Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
        {PROPERTY_TYPES.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[styles.filterChip, activeType === type.id && styles.filterChipActive]}
            onPress={() => setActiveType(type.id)}
          >
            <Text style={[styles.filterText, activeType === type.id && styles.filterTextActive]}>
              {type.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {filtered.map((property) => (
          <TouchableOpacity key={property.id} style={styles.propertyCard}>
            <Image source={{ uri: property.image }} style={styles.propertyImage} />
            <View style={styles.propertyBadge}>
              <Text style={styles.propertyBadgeText}>
                {property.type === 'rent' ? 'Location' : property.type === 'buy' ? 'Vente' : 'Terrain'}
              </Text>
            </View>
            <TouchableOpacity style={styles.favoriteBtn}>
              <Ionicons name="heart-outline" size={22} color={Colors.text} />
            </TouchableOpacity>
            <View style={styles.propertyInfo}>
              <Text style={styles.propertyTitle}>{property.title}</Text>
              <Text style={styles.propertyPrice}>{formatPrice(property.price, property.type)}</Text>
              <View style={styles.propertyLocation}>
                <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.propertyLocationText}>{property.location}</Text>
              </View>
              <View style={styles.propertyFeatures}>
                {property.bedrooms > 0 && (
                  <View style={styles.feature}>
                    <Ionicons name="bed-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.featureText}>{property.bedrooms}</Text>
                  </View>
                )}
                {property.bathrooms > 0 && (
                  <View style={styles.feature}>
                    <Ionicons name="water-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.featureText}>{property.bathrooms}</Text>
                  </View>
                )}
                <View style={styles.feature}>
                  <Ionicons name="resize-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.featureText}>{property.area} m\u00b2</Text>
                </View>
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
    paddingVertical: Spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  filtersScroll: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  filterChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    marginRight: Spacing.sm,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    fontWeight: '500',
  },
  filterTextActive: {
    color: Colors.text,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  propertyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  propertyImage: {
    width: '100%',
    height: 200,
  },
  propertyBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  propertyBadgeText: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
  },
  favoriteBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  propertyInfo: {
    padding: Spacing.lg,
  },
  propertyTitle: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  propertyPrice: {
    color: Colors.primary,
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  propertyLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.md,
  },
  propertyLocationText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  propertyFeatures: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featureText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
});
