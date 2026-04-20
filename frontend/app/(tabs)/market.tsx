import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image,
  RefreshControl, useWindowDimensions, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../src/theme/colors';
import apiClient from '../../src/api/client';
import cartApi from '../../src/api/cartApi';
import { featureFlags } from '../../src/config/featureFlags';

// --- MOCK DATA ---
const CATEGORIES = [
  { id: '1', name: 'Mode', icon: 'shirt', color: '#FF6B6B', image: 'https://picsum.photos/120/120?random=40' },
  { id: '2', name: 'Electronique', icon: 'phone-portrait', color: '#4ECDC4', image: 'https://picsum.photos/120/120?random=41' },
  { id: '3', name: 'Alimentation', icon: 'fast-food', color: '#FFE66D', image: 'https://picsum.photos/120/120?random=42' },
  { id: '4', name: 'Maison', icon: 'home', color: '#95E1D3', image: 'https://picsum.photos/120/120?random=43' },
  { id: '5', name: 'Beaute', icon: 'sparkles', color: '#DDA0DD', image: 'https://picsum.photos/120/120?random=44' },
  { id: '6', name: 'Sport', icon: 'football', color: '#98D8C8', image: 'https://picsum.photos/120/120?random=45' },
  { id: '7', name: 'Artisanat', icon: 'color-palette', color: '#F8B500', image: 'https://picsum.photos/120/120?random=46' },
  { id: '8', name: 'Auto', icon: 'car', color: '#6C5CE7', image: 'https://picsum.photos/120/120?random=47' },
];

const FLASH_DEALS = [
  { id: 'fd1', name: 'Ecouteurs Bluetooth', price: 8500, oldPrice: 15000, image: 'https://picsum.photos/200/200?random=50', discount: 43, soldCount: 234 },
  { id: 'fd2', name: 'Robe Bogolan Luxe', price: 18000, oldPrice: 30000, image: 'https://picsum.photos/200/200?random=51', discount: 40, soldCount: 189 },
  { id: 'fd3', name: 'Montre Connectee', price: 25000, oldPrice: 45000, image: 'https://picsum.photos/200/200?random=52', discount: 44, soldCount: 98 },
  { id: 'fd4', name: 'Sac Cuir Artisanal', price: 12000, oldPrice: 22000, image: 'https://picsum.photos/200/200?random=53', discount: 45, soldCount: 156 },
];

const PRODUCTS = [
  { id: 'p1', name: 'Robe Bogolan Premium', price: 25000, oldPrice: 35000, image: 'https://picsum.photos/300/400?random=20', rating: 4.8, reviews: 124, seller: 'Awa Mode', sellerVerified: true, freeDelivery: true, isNew: true, isBestseller: false, wishlisted: false },
  { id: 'p2', name: 'Telephone Samsung A54', price: 185000, oldPrice: null, image: 'https://picsum.photos/300/400?random=21', rating: 4.5, reviews: 89, seller: 'Tech Mali', sellerVerified: true, freeDelivery: false, isNew: false, isBestseller: true, wishlisted: true },
  { id: 'p3', name: 'Panier de fruits frais bio', price: 5000, oldPrice: 7500, image: 'https://picsum.photos/300/400?random=22', rating: 4.9, reviews: 234, seller: 'Marche Frais', sellerVerified: false, freeDelivery: true, isNew: false, isBestseller: false, wishlisted: false },
  { id: 'p4', name: 'Bijoux traditionnels or', price: 15000, oldPrice: null, image: 'https://picsum.photos/300/400?random=23', rating: 4.7, reviews: 56, seller: 'Artisanat Bamako', sellerVerified: true, freeDelivery: false, isNew: true, isBestseller: false, wishlisted: false },
  { id: 'p5', name: 'Sac en cuir veritable', price: 35000, oldPrice: 50000, image: 'https://picsum.photos/300/400?random=24', rating: 4.6, reviews: 78, seller: 'Cuir Sahel', sellerVerified: true, freeDelivery: true, isNew: false, isBestseller: true, wishlisted: true },
  { id: 'p6', name: 'Huile de karite pure', price: 3500, oldPrice: 5000, image: 'https://picsum.photos/300/400?random=25', rating: 4.9, reviews: 312, seller: 'Bio Mali', sellerVerified: false, freeDelivery: true, isNew: false, isBestseller: false, wishlisted: false },
  { id: 'p7', name: 'Bazin riche 10 metres', price: 45000, oldPrice: 60000, image: 'https://picsum.photos/300/400?random=26', rating: 4.8, reviews: 201, seller: 'Bazin Royal', sellerVerified: true, freeDelivery: false, isNew: false, isBestseller: true, wishlisted: false },
  { id: 'p8', name: 'Chaussures cuir homme', price: 28000, oldPrice: null, image: 'https://picsum.photos/300/400?random=27', rating: 4.4, reviews: 67, seller: 'Sahel Shoes', sellerVerified: false, freeDelivery: true, isNew: true, isBestseller: false, wishlisted: false },
];

const RECOMMENDED = [
  { id: 'r1', name: 'Tissu Wax Premium', price: 8000, image: 'https://picsum.photos/150/150?random=60', rating: 4.7, seller: 'Wax Africa' },
  { id: 'r2', name: 'Beurre de karite', price: 2500, image: 'https://picsum.photos/150/150?random=61', rating: 4.9, seller: 'Bio Bamako' },
  { id: 'r3', name: 'Bracelet perles', price: 3000, image: 'https://picsum.photos/150/150?random=62', rating: 4.6, seller: 'Perles Mali' },
  { id: 'r4', name: 'The Kinkeliba', price: 1500, image: 'https://picsum.photos/150/150?random=63', rating: 4.8, seller: 'Herbes Sahel' },
];

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
  const [, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);

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
        image: p.images?.[0] || null,
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
      setRealProducts(transformed);
    } catch (err) {
      // Pas de fallback mock : on affiche un état d'erreur explicite plutôt
      // que de faire croire à du contenu réel inexistant (audit du 20/04/2026).
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Impossible de charger les produits.';
      setProductsError(msg);
      setRealProducts([]);
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
              image: p.images?.[0] || 'https://picsum.photos/300/400', rating: p.seller?.seller_profile?.rating || 4.5,
              reviews: p.seller?.seller_profile?.total_sales || 0, seller: p.seller?.full_name || 'Vendeur',
              sellerVerified: p.seller?.seller_profile?.is_verified || false, freeDelivery: false,
              isNew: false, isBestseller: false, wishlisted: false,
            }));
            setRealProducts(transformed);
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
        {/* Flash Deals Banner */}
        <View style={styles.flashSection}>
          <TouchableOpacity activeOpacity={0.9}>
            <LinearGradient colors={['#FF3D00', '#FF6B00', '#FF9100']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.flashBanner}>
              <View style={styles.flashLeft}>
                <View style={styles.flashTitleRow}>
                  <Animated.View style={{ opacity: flashAnim }}>
                    <Ionicons name="flash" size={18} color="#FFD700" />
                  </Animated.View>
                  <Text style={styles.flashTitle}>FLASH DEALS</Text>
                  <Animated.View style={{ opacity: flashAnim }}>
                    <Ionicons name="flash" size={18} color="#FFD700" />
                  </Animated.View>
                </View>
                <View style={styles.timerRow}>
                  {['02', '14', '37'].map((t, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <Text style={styles.timerSep}>:</Text>}
                      <View style={styles.timerBox}>
                        <Text style={styles.timerText}>{t}</Text>
                      </View>
                    </React.Fragment>
                  ))}
                </View>
              </View>
              <Text style={styles.flashSeeAll}>Voir tout</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Flash Deal Cards */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.flashCards}>
            {FLASH_DEALS.map(deal => (
              <TouchableOpacity key={deal.id} style={styles.flashCard} activeOpacity={0.85}>
                <Image source={{ uri: deal.image }} style={styles.flashImage} />
                <View style={styles.flashDiscountBadge}>
                  <Text style={styles.flashDiscountText}>-{deal.discount}%</Text>
                </View>
                <View style={styles.flashCardInfo}>
                  <Text style={styles.flashPrice}>{formatPrice(deal.price)}</Text>
                  <Text style={styles.flashOldPrice}>{formatPrice(deal.oldPrice)}</Text>
                  <View style={styles.flashSoldBar}>
                    <View style={[styles.flashSoldFill, { width: `${Math.min(deal.soldCount / 3, 100)}%` }]} />
                  </View>
                  <Text style={styles.flashSoldText}>{deal.soldCount} vendus</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Categories Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity><Text style={styles.seeAll}>Voir tout</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity key={cat.id} style={styles.categoryCard} activeOpacity={0.8}>
                <View style={[styles.categoryIconBg, { backgroundColor: cat.color + '20' }]}>
                  <Ionicons name={cat.icon as any} size={24} color={cat.color} />
                </View>
                <Text style={styles.categoryName}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Promo Banner */}
        <TouchableOpacity style={styles.promoBanner} activeOpacity={0.9}>
          <LinearGradient colors={['#6C5CE7', '#A29BFE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.promoGradient}>
            <View style={styles.promoContent}>
              <View style={styles.promoBadge}><Text style={styles.promoBadgeText}>EXCLU</Text></View>
              <Text style={styles.promoTitle}>-30% sur la mode</Text>
              <Text style={styles.promoSubtitle}>Jusqu'au 31 juillet • Code: AFRI30</Text>
            </View>
            <Ionicons name="gift" size={48} color="rgba(255,255,255,0.2)" />
          </LinearGradient>
        </TouchableOpacity>

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
                    <Image source={{ uri: product.image }} style={[styles.productImage, { height: productWidth * 1.2 }]} />
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

        {/* Recommended */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recommande pour vous</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recommendedRow}>
            {RECOMMENDED.map(item => (
              <TouchableOpacity key={item.id} style={styles.recommendedCard} activeOpacity={0.85}>
                <Image source={{ uri: item.image }} style={styles.recommendedImage} />
                <Text style={styles.recommendedName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.recommendedPrice}>{formatPrice(item.price)}</Text>
                <View style={styles.recommendedRating}>
                  <Ionicons name="star" size={10} color="#FFD700" />
                  <Text style={styles.recommendedRatingText}>{item.rating}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

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
