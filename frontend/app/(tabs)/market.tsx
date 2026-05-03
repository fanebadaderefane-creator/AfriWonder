import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  RefreshControl, useWindowDimensions, Animated, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../src/theme/colors';
import apiClient from '../../src/api/client';
import cartApi from '../../src/api/cartApi';
import { featureFlags } from '../../src/config/featureFlags';
import { DemoContentBanner } from '../../src/components/common/DemoContentBanner';
import { getDemoMarketplaceProductRows, isAfriWonderDemoId } from '../../src/demo/superAppDemoSeed';
import { toAbsoluteMediaUrl } from '../../src/utils/absoluteMediaUrl';
import { ImageOrPlaceholder } from '../../src/components/common/ImageOrPlaceholder';

function pickCategoryStyle(name: string): { icon: string; color: string } {
  const n = name.toLowerCase();
  if (n.includes('mode') || n.includes('vêt') || n.includes('vet')) return { icon: 'shirt', color: '#FF6B6B' };
  if (n.includes('élect') || n.includes('elect') || n.includes('tech')) return { icon: 'phone-portrait', color: '#4ECDC4' };
  if (n.includes('alim') || n.includes('food') || n.includes('nour')) return { icon: 'fast-food', color: '#FFE66D' };
  if (n.includes('maison') || n.includes('home')) return { icon: 'home', color: '#95E1D3' };
  if (n.includes('beaut') || n.includes('cosm')) return { icon: 'sparkles', color: '#DDA0DD' };
  if (n.includes('sport')) return { icon: 'football', color: '#98D8C8' };
  if (n.includes('artisan')) return { icon: 'color-palette', color: '#F8B500' };
  if (n.includes('auto') || n.includes('voiture')) return { icon: 'car', color: '#6C5CE7' };
  return { icon: 'grid', color: '#888' };
}

function deriveCategoriesFromProducts(products: any[]) {
  const counts = new Map<string, number>();
  for (const p of products) {
    const c = String(p.category || '').trim();
    if (!c) continue;
    counts.set(c, (counts.get(c) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name], i) => ({
      id: `cat-${i}-${name}`,
      name,
      ...pickCategoryStyle(name),
    }));
}

const formatPrice = (p: number) => p.toLocaleString('fr-FR') + ' FCFA';

export default function MarketScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});
  const [activeFilter, setActiveFilter] = useState('all');
  const flashAnim = useRef(new Animated.Value(1)).current;
  const [realProducts, setRealProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [catalogIsDemo, setCatalogIsDemo] = useState(false);

  const categoryChips = useMemo(() => deriveCategoriesFromProducts(realProducts), [realProducts]);
  const flashProducts = useMemo(() => {
    const bests = realProducts.filter((p: any) => p.isBestseller);
    const src = bests.length >= 2 ? bests : realProducts;
    return src.slice(0, 4);
  }, [realProducts]);
  const recommendedProducts = useMemo(
    () =>
      [...realProducts]
        .sort((a: any, b: any) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
        .slice(0, 8),
    [realProducts],
  );

  // Vrai compteur du panier (remplace l'ancien badge en dur "3").
  // Silencieux si non authentifié ou marketplace désactivé.
  useEffect(() => {
    if (!featureFlags.marketplace) return;
    let mounted = true;
    cartApi
      .get()
      .then((cart) => {
        if (!mounted) return;
        const count = (cart.items ?? []).reduce((s, i) => s + (i.quantity || 0), 0);
        setCartCount(count);
      })
      .catch(() => {
        // Ignorer (utilisateur non connecté / backend down) — on cache simplement le badge.
      });
    return () => {
      mounted = false;
    };
  }, []);

  const productWidth = (screenWidth - 48) / 2;

  // Flash animation for deals countdown
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [flashAnim]);

  // Load products from real backend
  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    setProductsError(null);
    try {
      const response = await apiClient.get('/products');
      const data = response.data?.data || response.data;
      const backendProducts = data?.products || [];
      const transformed = (backendProducts as any[]).map((p: any) => ({
        id: p.id,
        name: p.name || '',
        price: p.price || 0,
        oldPrice: null,
        image: toAbsoluteMediaUrl(String(p.images?.[0] || '').trim()),
        rating: p.seller?.seller_profile?.rating || 4.5,
        reviews: p.seller?.seller_profile?.total_sales || 0,
        seller: p.seller?.full_name || p.seller?.username || 'Vendeur',
        sellerVerified: p.seller?.seller_profile?.is_verified || false,
        freeDelivery: false,
        isNew: new Date(p.created_at).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000,
        isBestseller: (p.seller?.seller_profile?.total_sales || 0) > 20,
        wishlisted: false,
        description: p.description || '',
        category: p.category || '',
        currency: p.currency || 'XOF',
        stock: p.stock || 0,
        city: p.seller?.seller_profile?.city || '',
      }));
      if (transformed.length === 0 && featureFlags.superAppDemoContent) {
        setRealProducts(getDemoMarketplaceProductRows() as any[]);
        setCatalogIsDemo(true);
        setProductsError(null);
      } else {
        setCatalogIsDemo(false);
        setRealProducts(transformed);
      }
    } catch (err) {
      if (featureFlags.superAppDemoContent) {
        setRealProducts(getDemoMarketplaceProductRows() as any[]);
        setCatalogIsDemo(true);
        setProductsError(null);
      } else {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          || (err as { message?: string })?.message
          || 'Impossible de charger les produits.';
        setProductsError(msg);
        setRealProducts([]);
        setCatalogIsDemo(false);
      }
    } finally {
      setLoadingProducts(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts().finally(() => setRefreshing(false));
  }, []);

  const toggleWishlist = (id: string) => {
    setWishlist(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const FILTERS = [
    { id: 'all', label: 'Tout', icon: 'grid' },
    { id: 'new', label: 'Nouveautes', icon: 'sparkles' },
    { id: 'best', label: 'Top ventes', icon: 'trophy' },
    { id: 'promo', label: 'Promos', icon: 'pricetag' },
    { id: 'free', label: 'Livr. gratuite', icon: 'car' },
  ];

  // Source unique : produits du backend. En cas d'erreur, l'écran le signale
  // explicitement (l'ancien fallback mock cachait les pannes API).
  const displayProducts = realProducts;

  const filteredProducts = displayProducts.filter((p: any) => {
    const matchesFilter = activeFilter === 'all' ||
      (activeFilter === 'new' && p.isNew) ||
      (activeFilter === 'best' && p.isBestseller) ||
      (activeFilter === 'promo' && p.oldPrice !== null) ||
      (activeFilter === 'free' && p.freeDelivery);
    const matchesSearch = !searchQuery || p.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Real-time search on backend
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timer = setTimeout(async () => {
        try {
          const res = await apiClient.get(`/products?search=${encodeURIComponent(searchQuery)}`);
          const data = res.data?.data || res.data;
          const results = data?.products || [];
          if (results.length > 0) {
            const transformed = results.map((p: any) => ({
              id: p.id, name: p.name || '', price: p.price || 0, oldPrice: null,
              image: toAbsoluteMediaUrl(String(p.images?.[0] || '').trim()), rating: p.seller?.seller_profile?.rating || 4.5,
              reviews: p.seller?.seller_profile?.total_sales || 0, seller: p.seller?.full_name || 'Vendeur',
              sellerVerified: p.seller?.seller_profile?.is_verified || false, freeDelivery: false,
              isNew: false, isBestseller: false, wishlisted: false,
            }));
            setRealProducts(transformed);
            setCatalogIsDemo(false);
          } else if (featureFlags.superAppDemoContent) {
            const q = searchQuery.trim().toLowerCase();
            const demo = (getDemoMarketplaceProductRows() as any[]).filter((p) =>
              !q || String(p.name || '').toLowerCase().includes(q),
            );
            setRealProducts(demo);
            setCatalogIsDemo(true);
          }
        } catch {}
      }, 500);
      return () => clearTimeout(timer);
    } else if (searchQuery.length === 0) {
      fetchProducts();
    }
  }, [searchQuery]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Marketplace</Text>
          <Text style={styles.headerSubtitle}>Les meilleurs produits africains</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionBtn} onPress={() => router.push('/wishlist' as any)}>
            <Ionicons name="heart-outline" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity testID="cart-button" style={styles.headerActionBtn} onPress={() => router.push('/cart' as any)}>
            <Ionicons name="cart-outline" size={24} color="#FFF" />
            {cartCount > 0 ? (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : String(cartCount)}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#888" />
          <TextInput
            testID="marketplace-search-input"
            style={styles.searchInput}
            placeholder="Rechercher produits, marques..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.filterMainBtn}>
          <Ionicons name="options" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {catalogIsDemo || realProducts.some((p: any) => isAfriWonderDemoId(p?.id)) ? <DemoContentBanner /> : null}
        {productsError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={22} color="#FF6B00" />
            <Text style={styles.errorBannerText}>{productsError}</Text>
            <TouchableOpacity style={styles.errorRetry} onPress={() => void fetchProducts()} accessibilityRole="button">
              <Text style={styles.errorRetryText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {loadingProducts && realProducts.length === 0 && !productsError ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Chargement du catalogue…</Text>
          </View>
        ) : null}

        {!loadingProducts && !productsError && realProducts.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Ionicons name="storefront-outline" size={40} color="#666" />
            <Text style={styles.emptyTitle}>Aucun produit</Text>
            <Text style={styles.emptySub}>Le catalogue est vide pour le moment. Tirez pour actualiser.</Text>
          </View>
        ) : null}

        {/* Mise en avant — uniquement à partir du catalogue API */}
        {flashProducts.length > 0 ? (
          <View style={styles.flashSection}>
            <TouchableOpacity activeOpacity={0.9}>
              <LinearGradient colors={['#FF3D00', '#FF6B00', '#FF9100']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.flashBanner}>
                <View style={styles.flashLeft}>
                  <View style={styles.flashTitleRow}>
                    <Animated.View style={{ opacity: flashAnim }}>
                      <Ionicons name="flash" size={18} color="#FFD700" />
                    </Animated.View>
                    <Text style={styles.flashTitle}>COUPS DE CŒUR</Text>
                    <Animated.View style={{ opacity: flashAnim }}>
                      <Ionicons name="flash" size={18} color="#FFD700" />
                    </Animated.View>
                  </View>
                  <Text style={styles.flashSeeAll}>Sélection catalogue</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.flashCards}>
              {flashProducts.map((deal: any) => {
                const discount =
                  deal.oldPrice && deal.price
                    ? Math.max(0, Math.round((1 - deal.price / deal.oldPrice) * 100))
                    : 0;
                const uri = deal.image || '';
                return (
                  <TouchableOpacity
                    key={deal.id}
                    style={styles.flashCard}
                    activeOpacity={0.85}
                    onPress={() => router.push(`/product/${deal.id}` as any)}
                  >
                    <ImageOrPlaceholder uri={uri} style={styles.flashImage} icon="shirt-outline" iconSize={36} />
                    {discount > 0 ? (
                      <View style={styles.flashDiscountBadge}>
                        <Text style={styles.flashDiscountText}>-{discount}%</Text>
                      </View>
                    ) : null}
                    <View style={styles.flashCardInfo}>
                      <Text style={styles.flashPrice}>{formatPrice(deal.price)}</Text>
                      {deal.oldPrice ? (
                        <Text style={styles.flashOldPrice}>{formatPrice(deal.oldPrice)}</Text>
                      ) : null}
                      <Text style={styles.flashSoldText} numberOfLines={1}>
                        {deal.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {categoryChips.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Catégories</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
              {categoryChips.map((cat) => (
                <TouchableOpacity key={cat.id} style={styles.categoryCard} activeOpacity={0.8}>
                  <View style={[styles.categoryIconBg, { backgroundColor: `${cat.color}20` }]}>
                    <Ionicons name={cat.icon as any} size={24} color={cat.color} />
                  </View>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterPill, activeFilter === f.id && styles.filterPillActive]}
              onPress={() => setActiveFilter(f.id)}
            >
              <Ionicons name={f.icon as any} size={12} color={activeFilter === f.id ? '#FFF' : '#888'} />
              <Text style={[styles.filterPillText, activeFilter === f.id && styles.filterPillTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Products Grid */}
        <View style={styles.productsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {activeFilter === 'all' ? 'Produits populaires' : FILTERS.find(f => f.id === activeFilter)?.label}
            </Text>
            <Text style={styles.productCount}>{filteredProducts.length} produits</Text>
          </View>
          <View style={styles.productsGrid}>
            {filteredProducts.map((product, cardIndex) => {
              const isWished = wishlist[product.id] ?? product.wishlisted;
              const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
              return (
                <TouchableOpacity
                  key={product.id}
                  testID={cardIndex === 0 ? 'market-first-product' : undefined}
                  style={[styles.productCard, { width: productWidth }]}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/product/${product.id}` as any)}
                >
                  {/* Image */}
                  <View style={styles.productImageWrap}>
                    <ImageOrPlaceholder
                      uri={product.image || ''}
                      style={[styles.productImage, { height: productWidth * 1.2 }]}
                      icon="bag-handle-outline"
                      iconSize={40}
                    />
                    {/* Badges */}
                    {product.isNew && (
                      <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>
                    )}
                    {product.isBestseller && (
                      <View style={styles.bestBadge}><Text style={styles.bestBadgeText}>TOP</Text></View>
                    )}
                    {discount > 0 && (
                      <View style={styles.discountBadge}><Text style={styles.discountBadgeText}>-{discount}%</Text></View>
                    )}
                    {/* Wishlist */}
                    <TouchableOpacity style={styles.wishlistBtn} onPress={() => toggleWishlist(product.id)}>
                      <Ionicons name={isWished ? 'heart' : 'heart-outline'} size={20} color={isWished ? '#FF4757' : '#FFF'} />
                    </TouchableOpacity>
                  </View>
                  {/* Info */}
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.productPrice}>{formatPrice(product.price)}</Text>
                      {product.oldPrice && (
                        <Text style={styles.productOldPrice}>{formatPrice(product.oldPrice)}</Text>
                      )}
                    </View>
                    <View style={styles.productMeta}>
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={12} color="#FFD700" />
                        <Text style={styles.ratingText}>{product.rating}</Text>
                        <Text style={styles.reviewsText}>({product.reviews})</Text>
                      </View>
                    </View>
                    <View style={styles.sellerRow}>
                      <Text style={styles.sellerName} numberOfLines={1}>{product.seller}</Text>
                      {product.sellerVerified && <Ionicons name="checkmark-circle" size={12} color={Colors.primary} />}
                    </View>
                    {product.freeDelivery && (
                      <View style={styles.freeDeliveryBadge}>
                        <Ionicons name="car" size={10} color="#4CAF50" />
                        <Text style={styles.freeDeliveryText}>Livraison gratuite</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {recommendedProducts.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recommandés</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recommendedRow}>
              {recommendedProducts.map((item: any) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.recommendedCard}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/product/${item.id}` as any)}
                >
                  <ImageOrPlaceholder uri={item.image || ''} style={styles.recommendedImage} icon="pricetag-outline" iconSize={32} />
                  <Text style={styles.recommendedName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.recommendedPrice}>{formatPrice(item.price)}</Text>
                  <View style={styles.recommendedRating}>
                    <Ionicons name="star" size={10} color="#FFD700" />
                    <Text style={styles.recommendedRatingText}>{item.rating}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    gap: 8,
  },
  errorBannerText: { color: '#EEE', fontSize: 13, lineHeight: 18 },
  errorRetry: { alignSelf: 'flex-start', marginTop: 4 },
  errorRetryText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },

  loadingBlock: { paddingVertical: 40, alignItems: 'center', gap: 12 },
  loadingText: { color: '#888', fontSize: 13 },

  emptyBlock: { paddingVertical: 48, paddingHorizontal: 24, alignItems: 'center', gap: 8 },
  emptyTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  emptySub: { color: '#888', fontSize: 13, textAlign: 'center' },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  headerSubtitle: { color: '#888', fontSize: 12, marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerActionBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  cartBadge: {
    position: 'absolute', top: 4, right: 4, backgroundColor: '#FF3D00',
    minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },

  // Search
  searchContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  searchInput: { flex: 1, color: '#FFF', fontSize: 14 },
  filterMainBtn: {
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1A1A1A', borderRadius: 12,
  },

  // Flash Deals
  flashSection: { marginBottom: 16 },
  flashBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, borderRadius: 14, padding: 14,
  },
  flashLeft: {},
  flashTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  flashTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timerBox: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  timerText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  timerSep: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  flashSeeAll: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  flashCards: { paddingHorizontal: 16, gap: 10, paddingTop: 12 },
  flashCard: { width: 130, backgroundColor: '#111', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#1A1A1A' },
  flashImage: { width: '100%', height: 110 },
  flashDiscountBadge: {
    position: 'absolute', top: 6, left: 6, backgroundColor: '#FF3D00',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  flashDiscountText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  flashCardInfo: { padding: 8 },
  flashPrice: { color: Colors.primary, fontSize: 13, fontWeight: '800' },
  flashOldPrice: { color: '#666', fontSize: 10, textDecorationLine: 'line-through', marginTop: 1 },
  flashSoldBar: { height: 4, backgroundColor: '#222', borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  flashSoldFill: { height: '100%', backgroundColor: '#FF3D00', borderRadius: 2 },
  flashSoldText: { color: '#888', fontSize: 9, marginTop: 3 },

  // Section
  section: { marginBottom: 16 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 12,
  },
  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  seeAll: { color: Colors.primary, fontSize: 12, fontWeight: '600' },

  // Categories
  categoriesRow: { paddingHorizontal: 16, gap: 12 },
  categoryCard: { alignItems: 'center', width: 70 },
  categoryIconBg: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  categoryName: { color: '#CCC', fontSize: 11, fontWeight: '500', textAlign: 'center' },

  // Promo
  promoBanner: { marginHorizontal: 16, marginBottom: 16, borderRadius: 16, overflow: 'hidden' },
  promoGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 },
  promoContent: { flex: 1 },
  promoBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 6 },
  promoBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  promoTitle: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  promoSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 },

  // Filters
  filterRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 14 },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#1A1A1A', gap: 5,
  },
  filterPillActive: { backgroundColor: Colors.primary },
  filterPillText: { color: '#888', fontSize: 12, fontWeight: '600' },
  filterPillTextActive: { color: '#FFF' },

  // Products
  productsSection: { paddingHorizontal: 16 },
  productCount: { color: '#888', fontSize: 12 },
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  productCard: { backgroundColor: '#111', borderRadius: 14, overflow: 'hidden', marginBottom: 4, borderWidth: 1, borderColor: '#1A1A1A' },
  productImageWrap: { position: 'relative' },
  productImage: { width: '100%' },
  newBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#4CAF50', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  newBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  bestBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#FFD700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  bestBadgeText: { color: '#000', fontSize: 9, fontWeight: '800' },
  discountBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#FF3D00', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  discountBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  wishlistBtn: {
    position: 'absolute', bottom: 8, right: 8, width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  productInfo: { padding: 10 },
  productName: { color: '#EEE', fontSize: 13, fontWeight: '600', lineHeight: 18, marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  productPrice: { color: Colors.primary, fontSize: 15, fontWeight: '800' },
  productOldPrice: { color: '#666', fontSize: 11, textDecorationLine: 'line-through' },
  productMeta: { marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  reviewsText: { color: '#888', fontSize: 10 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  sellerName: { color: '#999', fontSize: 11, flex: 1 },
  freeDeliveryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(76,175,80,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    alignSelf: 'flex-start',
  },
  freeDeliveryText: { color: '#4CAF50', fontSize: 9, fontWeight: '600' },

  // Recommended
  recommendedRow: { paddingHorizontal: 16, gap: 10 },
  recommendedCard: { width: 120, backgroundColor: '#111', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#1A1A1A' },
  recommendedImage: { width: '100%', height: 100 },
  recommendedName: { color: '#CCC', fontSize: 11, fontWeight: '500', paddingHorizontal: 8, paddingTop: 6 },
  recommendedPrice: { color: Colors.primary, fontSize: 13, fontWeight: '800', paddingHorizontal: 8, paddingTop: 2 },
  recommendedRating: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 4 },
  recommendedRatingText: { color: '#888', fontSize: 10 },
});
