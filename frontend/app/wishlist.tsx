import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import wishlistApi, { WishlistRow } from '../src/api/wishlistApi';
import cartApi from '../src/api/cartApi';
import { toAbsoluteMediaUrl } from '../src/utils/absoluteMediaUrl';
import { ImageOrPlaceholder } from '../src/components/common/ImageOrPlaceholder';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.xl * 2 - Spacing.md) / 2;

function firstProductImageUri(row: WishlistRow): string {
  const raw = row.product?.images?.[0];
  return toAbsoluteMediaUrl(raw || '').trim();
}

export default function WishlistScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<WishlistRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cartBusyId, setCartBusyId] = useState<string | null>(null);
  const [removeBusyId, setRemoveBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await wishlistApi.list(1, 60);
      setItems(data.items ?? []);
      setTotal(data.pagination?.total ?? (data.items?.length ?? 0));
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Impossible de charger vos favoris.';
      setError(msg);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const handleRemove = async (productId: string) => {
    setRemoveBusyId(productId);
    try {
      await wishlistApi.remove(productId);
      setItems((prev) => prev.filter((r) => r.product_id !== productId));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Retrait impossible.';
      Alert.alert('Erreur', msg);
    } finally {
      setRemoveBusyId(null);
    }
  };

  const handleAddToCart = async (row: WishlistRow) => {
    const pid = row.product_id || row.product?.id;
    if (!pid) return;
    setCartBusyId(pid);
    try {
      await cartApi.add(pid, 1);
      Alert.alert('Ajouté au panier', `${row.product?.name ?? 'Produit'} a bien été ajouté.`);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Impossible d\'ajouter au panier.';
      Alert.alert('Erreur', msg);
    } finally {
      setCartBusyId(null);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favoris ({total})</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); void load(); }}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="heart-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Aucun favori</Text>
          <Text style={styles.emptySub}>Ajoutez des produits depuis le marketplace.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.push('/(tabs)/market' as any)}>
            <Text style={styles.retryBtnText}>Voir le marketplace</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          <View style={styles.grid}>
            {items.map((row) => {
              const p = row.product;
              const pid = row.product_id || p?.id;
              const seller = p?.seller?.username?.trim() || 'Vendeur';
              const busyCart = cartBusyId === pid;
              const busyRm = removeBusyId === pid;
              return (
                <TouchableOpacity
                  key={row.id}
                  style={styles.card}
                  onPress={() => pid && router.push(`/product/${pid}` as any)}
                >
                  <View style={styles.imageContainer}>
                    <ImageOrPlaceholder uri={firstProductImageUri(row)} style={styles.image} icon="bag-handle-outline" iconSize={40} />
                    <TouchableOpacity
                      style={styles.heartBtn}
                      disabled={busyRm}
                      onPress={() => pid && handleRemove(pid)}
                    >
                      {busyRm ? (
                        <ActivityIndicator size="small" color={Colors.like} />
                      ) : (
                        <Ionicons name="heart" size={20} color={Colors.like} />
                      )}
                    </TouchableOpacity>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName} numberOfLines={2}>{p?.name ?? 'Produit'}</Text>
                    <Text style={styles.cardPrice}>{(p?.price ?? 0).toLocaleString('fr-FR')} FCFA</Text>
                    <View style={styles.cardMeta}>
                      <Ionicons name="storefront-outline" size={12} color={Colors.textSecondary} />
                      <Text style={styles.cardSeller} numberOfLines={1}>{seller}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.addToCartBtn, busyCart && { opacity: 0.7 }]}
                      disabled={busyCart}
                      onPress={() => void handleAddToCart(row)}
                    >
                      {busyCart ? (
                        <ActivityIndicator size="small" color={Colors.text} />
                      ) : (
                        <>
                          <Ionicons name="cart" size={16} color={Colors.text} />
                          <Text style={styles.addToCartText}>Ajouter</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  errorText: { color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.md },
  emptyTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginTop: Spacing.md },
  emptySub: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.lg },
  retryBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  retryBtnText: { color: Colors.text, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  card: { width: CARD_WIDTH, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, overflow: 'hidden' },
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: CARD_WIDTH * 1.2 },
  heartBtn: { position: 'absolute', top: Spacing.sm, right: Spacing.sm, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  cardInfo: { padding: Spacing.md },
  cardName: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '500', marginBottom: 4 },
  cardPrice: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: 'bold', marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.sm },
  cardSeller: { color: Colors.textSecondary, fontSize: FontSizes.xs, flex: 1 },
  addToCartBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: Colors.primary, borderRadius: BorderRadius.sm, paddingVertical: Spacing.sm },
  addToCartText: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '600' },
});
