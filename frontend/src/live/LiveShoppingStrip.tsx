/**
 * LiveShoppingStrip.tsx — Carrousel horizontal des produits en promotion pendant un live.
 *
 * UX inspirée TikTok Shop / Instagram Live Shopping :
 *  - Mini-bandeau en bas (au-dessus du chat) montrant 1-3 produits "featured"
 *  - Tap → ouvre la fiche produit en bottomsheet
 *  - "Acheter" → flow checkout existant (router /shop/product/:id ou modal)
 *  - Badge "1/5" qui indique le nombre total de produits
 *  - Auto-rotation toutes les 8s entre produits
 *
 * Polling léger : refresh toutes les 30s (le backend peut aussi pousser via socket si besoin futur).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import apiClient from '../api/client';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/colors';
import { toAbsoluteMediaUrl } from '../utils/absoluteMediaUrl';

const { width: SCREEN_W } = Dimensions.get('window');

type LiveProduct = {
  id: string;
  productId: string;
  name: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  originalPrice: number | null;
  promoBadge?: string | null;
  position: number;
  inStock: boolean;
};

function formatPrice(price: number, currency: string): string {
  const c = (currency || 'XOF').toUpperCase();
  if (c === 'XOF' || c === 'CFA') return `${Math.round(price).toLocaleString('fr-FR')} FCFA`;
  if (c === 'EUR') return `${price.toFixed(2)} €`;
  if (c === 'USD') return `$${price.toFixed(2)}`;
  return `${Math.round(price).toLocaleString('fr-FR')} ${c}`;
}

export type LiveShoppingStripProps = {
  liveId: string;
  bottomOffset?: number;
};

export function LiveShoppingStrip({ liveId, bottomOffset = 0 }: LiveShoppingStripProps) {
  const [products, setProducts] = useState<LiveProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      const res = await apiClient.get(`/live/${encodeURIComponent(liveId)}/products`);
      const data = res.data?.data ?? res.data;
      const raw: any[] = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.products)
          ? data.products
          : Array.isArray(data)
            ? data
            : [];
      const mapped: LiveProduct[] = raw
        .map((r) => {
          const product = r.product || r;
          const price = Number(product.price || product.amount || 0);
          const originalPrice = Number(product.original_price || product.compare_price || 0);
          return {
            id: String(r.id || product.id || ''),
            productId: String(product.id || r.product_id || ''),
            name: String(product.name || product.title || 'Produit'),
            price,
            currency: String(product.currency || 'XOF'),
            imageUrl: product.image_url || product.cover_url || product.thumbnail_url || null,
            originalPrice: originalPrice > 0 && originalPrice > price ? originalPrice : null,
            promoBadge: product.promo_badge || product.tag || null,
            position: Number(r.position || 0),
            inStock: r.in_stock !== false && product.stock !== 0,
          };
        })
        .filter((p) => p.productId)
        .sort((a, b) => a.position - b.position);
      setProducts(mapped);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [liveId]);

  useEffect(() => {
    if (!liveId) return;
    void loadProducts();
    const interval = setInterval(loadProducts, 30_000);
    return () => clearInterval(interval);
  }, [liveId, loadProducts]);

  // Auto-rotation entre produits
  useEffect(() => {
    if (products.length <= 1) return;
    const rotate = setInterval(() => {
      setActiveIdx((i) => (i + 1) % products.length);
    }, 8000);
    return () => clearInterval(rotate);
  }, [products.length]);

  const activeProduct = products[activeIdx] ?? null;
  const discountPct = useMemo(() => {
    if (!activeProduct?.originalPrice || activeProduct.originalPrice <= activeProduct.price) return null;
    return Math.round(((activeProduct.originalPrice - activeProduct.price) / activeProduct.originalPrice) * 100);
  }, [activeProduct]);

  if (loading) return null;
  if (products.length === 0 || !activeProduct) return null;

  return (
    <>
      <View
        style={[styles.container, { bottom: bottomOffset + 76 }]}
        pointerEvents="box-none"
        testID="live-shopping-strip"
      >
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          testID={`live-shopping-card-${activeProduct.productId}`}
          onPress={() => setPickerOpen(true)}
        >
          {activeProduct.imageUrl ? (
            <Image
              source={{ uri: toAbsoluteMediaUrl(activeProduct.imageUrl) ?? activeProduct.imageUrl }}
              style={styles.image}
            />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Ionicons name="cube-outline" size={20} color="#FFF" />
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{activeProduct.name}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{formatPrice(activeProduct.price, activeProduct.currency)}</Text>
              {activeProduct.originalPrice ? (
                <Text style={styles.originalPrice}>
                  {formatPrice(activeProduct.originalPrice, activeProduct.currency)}
                </Text>
              ) : null}
            </View>
          </View>
          <TouchableOpacity
            style={styles.buyBtn}
            testID={`live-shopping-buy-${activeProduct.productId}`}
            onPress={() => {
              try {
                router.push({ pathname: '/shop/product/[id]', params: { id: activeProduct.productId } } as never);
              } catch {
                setPickerOpen(true);
              }
            }}
            accessibilityLabel="Acheter ce produit"
          >
            <Text style={styles.buyBtnText}>Acheter</Text>
          </TouchableOpacity>
          {discountPct ? (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discountPct}%</Text>
            </View>
          ) : (
            <View style={styles.cartBadge}>
              <Ionicons name="cart" size={16} color="#FFF" />
            </View>
          )}
          {products.length > 1 ? (
            <View style={styles.counter}>
              <Text style={styles.counterText}>{activeIdx + 1}/{products.length}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Bottomsheet liste complète */}
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              <Ionicons name="bag-handle" size={18} color={Colors.primary} /> Boutique du live ({products.length})
            </Text>
            <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xl }}>
              {products.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  testID={`live-shopping-product-${p.productId}`}
                  style={styles.row}
                  onPress={() => {
                    setPickerOpen(false);
                    setTimeout(() => {
                      try {
                        router.push({ pathname: '/shop/product/[id]', params: { id: p.productId } } as never);
                      } catch {
                        /* fallback : pas de route shop */
                      }
                    }, 200);
                  }}
                >
                  {p.imageUrl ? (
                    <Image
                      source={{ uri: toAbsoluteMediaUrl(p.imageUrl) ?? p.imageUrl }}
                      style={styles.rowImage}
                    />
                  ) : (
                    <View style={[styles.rowImage, styles.imagePlaceholder]}>
                      <Ionicons name="cube-outline" size={24} color="#FFF" />
                    </View>
                  )}
                  <View style={{ flex: 1, paddingHorizontal: Spacing.md, justifyContent: 'center' }}>
                    <Text style={styles.rowName} numberOfLines={2}>{p.name}</Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.price}>{formatPrice(p.price, p.currency)}</Text>
                      {p.originalPrice ? (
                        <Text style={styles.originalPrice}>{formatPrice(p.originalPrice, p.currency)}</Text>
                      ) : null}
                    </View>
                    {!p.inStock ? <Text style={styles.outOfStock}>Rupture de stock</Text> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: Spacing.md, right: 80, zIndex: 25 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: BorderRadius.md,
    padding: 8,
    gap: 10,
  },
  image: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#222',
  },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, minWidth: 0 },
  name: { color: '#FFF', fontSize: FontSizes.sm, fontWeight: '600' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  price: { color: '#FFD93D', fontSize: FontSizes.sm, fontWeight: '700' },
  originalPrice: { color: 'rgba(255,255,255,0.5)', fontSize: 11, textDecorationLine: 'line-through' },
  buyBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 4,
  },
  buyBtnText: { color: '#FFF', fontSize: FontSizes.xs, fontWeight: '800' },
  discountBadge: {
    backgroundColor: '#FF3366',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  discountText: { color: '#FFF', fontWeight: '800', fontSize: 11 },
  cartBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  counterText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    maxHeight: SCREEN_W * 1.6,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.textMuted,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '700', marginBottom: Spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowImage: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#333' },
  rowName: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '600' },
  outOfStock: { color: Colors.error, fontSize: 11, marginTop: 2, fontStyle: 'italic' },
});

export default LiveShoppingStrip;
