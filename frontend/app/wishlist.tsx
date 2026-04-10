import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.xl * 2 - Spacing.md) / 2;

const WISHLIST_ITEMS = [
  { id: '1', name: 'Robe Bogolan Premium', price: 35000, image: 'https://picsum.photos/300/400?random=40', seller: 'Awa Mode', rating: 4.8 },
  { id: '2', name: 'Montre Africaine', price: 45000, image: 'https://picsum.photos/300/400?random=41', seller: 'Bijoux Sahel', rating: 4.6 },
  { id: '3', name: 'Sac en cuir tresse', price: 28000, image: 'https://picsum.photos/300/400?random=42', seller: 'Cuir Mali', rating: 4.9 },
  { id: '4', name: 'Chaussures artisanales', price: 22000, image: 'https://picsum.photos/300/400?random=43', seller: 'Artisan Dakar', rating: 4.7 },
  { id: '5', name: 'Tissu Bazin riche', price: 18000, image: 'https://picsum.photos/300/400?random=44', seller: 'Tissu Bamako', rating: 4.5 },
  { id: '6', name: 'Parfum local', price: 12000, image: 'https://picsum.photos/300/400?random=45', seller: 'Beaute Afri', rating: 4.3 },
];

export default function WishlistScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favoris ({WISHLIST_ITEMS.length})</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {WISHLIST_ITEMS.map((item) => (
            <TouchableOpacity key={item.id} style={styles.card} onPress={() => router.push(`/product/${item.id}`)}>
              <View style={styles.imageContainer}>
                <Image source={{ uri: item.image }} style={styles.image} />
                <TouchableOpacity style={styles.heartBtn}>
                  <Ionicons name="heart" size={20} color={Colors.like} />
                </TouchableOpacity>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.cardPrice}>{item.price.toLocaleString()} FCFA</Text>
                <View style={styles.cardMeta}>
                  <Ionicons name="star" size={12} color={Colors.accent} />
                  <Text style={styles.cardRating}>{item.rating}</Text>
                  <Text style={styles.cardSeller}>{item.seller}</Text>
                </View>
                <TouchableOpacity style={styles.addToCartBtn}>
                  <Ionicons name="cart" size={16} color={Colors.text} />
                  <Text style={styles.addToCartText}>Ajouter</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  card: { width: CARD_WIDTH, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, overflow: 'hidden' },
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: CARD_WIDTH * 1.2 },
  heartBtn: { position: 'absolute', top: Spacing.sm, right: Spacing.sm, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  cardInfo: { padding: Spacing.md },
  cardName: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '500', marginBottom: 4 },
  cardPrice: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: 'bold', marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.sm },
  cardRating: { color: Colors.text, fontSize: FontSizes.xs, fontWeight: '600' },
  cardSeller: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  addToCartBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: Colors.primary, borderRadius: BorderRadius.sm, paddingVertical: Spacing.sm },
  addToCartText: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '600' },
});
