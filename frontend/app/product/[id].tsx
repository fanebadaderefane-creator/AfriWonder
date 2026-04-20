import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Share, ActivityIndicator, Alert } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import apiClient from '../../src/api/client';
import cartApi from '../../src/api/cartApi';
import { featureFlags } from '../../src/config/featureFlags';
import { toAbsoluteMediaUrl } from '../../src/utils/absoluteMediaUrl';
import { ImageOrPlaceholder } from '../../src/components/common/ImageOrPlaceholder';

const { width } = Dimensions.get('window');

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  images: string[];
  rating: number;
  reviews: number;
  sold: number;
  seller: { name: string; avatar: string; rating: number; products: number };
  sizes: string[];
  colors: string[];
  inStock: boolean;
}

export default function ProductDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);

  const handleAddToCart = async (goToCart: boolean) => {
    if (!product?.id) return;
    if (!featureFlags.marketplace) {
      Alert.alert(
        'Bientôt disponible',
        "Le panier marketplace sera activé prochainement. Merci de votre patience !"
      );
      return;
    }
    setAddingToCart(true);
    try {
      await cartApi.add(product.id, quantity);
      if (goToCart) {
        router.push('/cart' as any);
      } else {
        Alert.alert('Ajouté au panier', `${product.name} a bien été ajouté.`);
      }
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Impossible d\'ajouter au panier.';
      Alert.alert('Erreur', msg);
    } finally {
      setAddingToCart(false);
    }
  };

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const response = await apiClient.get(`/products/${id}`);
        const data = response.data?.data || response.data;
        if (data) {
          const rawImgs: unknown[] = Array.isArray(data.images)
            ? data.images
            : data.image
              ? [data.image]
              : [];
          const images = rawImgs
            .map((x) => toAbsoluteMediaUrl(String(x ?? '').trim()))
            .filter(Boolean) as string[];
          const sellerAvatar = toAbsoluteMediaUrl(
            String(data.seller?.profile_image || data.seller?.avatar || '').trim()
          );
          setSelectedImage(0);
          setProduct({
            id: data.id || (id as string),
            name: data.name || data.title || '',
            description: data.description || '',
            price: data.price || 0,
            originalPrice: data.original_price || data.price || 0,
            images,
            rating: data.rating || 4.5,
            reviews: data.reviews_count || 0,
            sold: data.sold_count || 0,
            seller: {
              name: data.seller?.name || data.seller?.username || data.seller_name || 'Vendeur',
              avatar: sellerAvatar,
              rating: data.seller?.rating || 4.5,
              products: data.seller?.products_count || 0,
            },
            sizes: data.sizes || ['S', 'M', 'L', 'XL'],
            colors: data.colors || ['#8B4513'],
            inStock: data.in_stock !== false,
          });
        }
      } catch (err) {
        console.log('Error loading product:', err);
        // Use basic product from params
        setSelectedImage(0);
        setProduct({
          id: id as string,
          name: 'Produit',
          description: '',
          price: 0,
          originalPrice: 0,
          images: [],
          rating: 0,
          reviews: 0,
          sold: 0,
          seller: { name: 'Vendeur', avatar: '', rating: 0, products: 0 },
          sizes: ['S', 'M', 'L', 'XL'],
          colors: ['#8B4513'],
          inStock: true,
        });
      } finally {
        setLoading(false);
      }
    };
    loadProduct();
  }, [id]);

  if (loading || !product) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  const discount = product.originalPrice > product.price ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;

  const handleShare = async () => {
    await Share.share({
      message: `Decouvrez ${product.name} sur AfriWonder - ${product.price.toLocaleString()} FCFA`,
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
            <Ionicons name="share-outline" size={24} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity testID="cart-button" onPress={() => router.push('/cart')} style={styles.headerBtn}>
            <Ionicons name="cart-outline" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Product Images */}
        <View style={styles.imageContainer}>
          <ImageOrPlaceholder
            uri={product.images[selectedImage] || ''}
            style={styles.mainImage}
            icon="shirt-outline"
            iconSize={56}
          />
          {product.images.length > 1 ? (
            <View style={styles.imageThumbnails}>
              {product.images.map((img, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setSelectedImage(idx)}
                  style={[styles.thumbnail, selectedImage === idx && styles.thumbnailActive]}
                >
                  <ImageOrPlaceholder uri={img} style={styles.thumbnailImage} icon="image" iconSize={20} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.content}>
          {/* Title & Price */}
          <Text style={styles.productName}>{product.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{product.price.toLocaleString()} FCFA</Text>
            <Text style={styles.originalPrice}>{product.originalPrice.toLocaleString()} FCFA</Text>
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discount}%</Text>
            </View>
          </View>

          {/* Rating */}
          <View style={styles.ratingRow}>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= Math.floor(product.rating) ? 'star' : 'star-outline'}
                  size={16}
                  color={Colors.accent}
                />
              ))}
            </View>
            <Text style={styles.ratingText}>{product.rating} ({product.reviews} avis)</Text>
            <Text style={styles.soldText}>{product.sold} vendus</Text>
          </View>

          {/* Colors */}
          <Text style={styles.optionLabel}>Couleur</Text>
          <View style={styles.colorsRow}>
            {product.colors.map((color, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === idx && styles.colorOptionActive,
                ]}
                onPress={() => setSelectedColor(idx)}
              >
                {selectedColor === idx && (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Sizes */}
          <Text style={styles.optionLabel}>Taille</Text>
          <View style={styles.sizesRow}>
            {product.sizes.map((size) => (
              <TouchableOpacity
                key={size}
                style={[styles.sizeOption, selectedSize === size && styles.sizeOptionActive]}
                onPress={() => setSelectedSize(size)}
              >
                <Text style={[styles.sizeText, selectedSize === size && styles.sizeTextActive]}>
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quantity */}
          <Text style={styles.optionLabel}>Quantite</Text>
          <View style={styles.quantityRow}>
            <TouchableOpacity
              style={styles.quantityBtn}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Ionicons name="remove" size={20} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityBtn}
              onPress={() => setQuantity(quantity + 1)}
            >
              <Ionicons name="add" size={20} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {/* Seller Info */}
          <View style={styles.sellerCard}>
            <ImageOrPlaceholder uri={product.seller.avatar} style={styles.sellerAvatar} icon="person" iconSize={22} />
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{product.seller.name}</Text>
              <View style={styles.sellerMeta}>
                <Ionicons name="star" size={12} color={Colors.accent} />
                <Text style={styles.sellerRating}>{product.seller.rating}</Text>
                <Text style={styles.sellerProducts}>{product.seller.products} produits</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.visitShopBtn}>
              <Text style={styles.visitShopText}>Voir boutique</Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text style={styles.optionLabel}>Description</Text>
          <Text style={styles.description}>{product.description}</Text>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + Spacing.md }]}>
        <TouchableOpacity
          style={styles.favoriteBtn}
          onPress={() => setIsFavorite(!isFavorite)}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={24}
            color={isFavorite ? Colors.like : Colors.text}
          />
        </TouchableOpacity>
        <TouchableOpacity
          testID="product-add-to-cart"
          style={[styles.addToCartBtn, addingToCart && { opacity: 0.6 }]}
          onPress={() => handleAddToCart(false)}
          disabled={addingToCart}
        >
          {addingToCart ? (
            <ActivityIndicator color={Colors.text} />
          ) : (
            <>
              <Ionicons name="cart" size={20} color={Colors.text} />
              <Text style={styles.addToCartText}>Ajouter au panier</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.buyNowBtn, addingToCart && { opacity: 0.6 }]}
          onPress={() => handleAddToCart(true)}
          disabled={addingToCart}
        >
          <Text style={styles.buyNowText}>Acheter</Text>
        </TouchableOpacity>
      </View>
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
    paddingVertical: Spacing.sm,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 50,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  imageContainer: {
    marginBottom: Spacing.lg,
  },
  mainImage: {
    width,
    height: width * 1.1,
  },
  imageThumbnails: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: Colors.primary,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 100,
  },
  productName: {
    color: Colors.text,
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  price: {
    color: Colors.primary,
    fontSize: FontSizes.xxxl,
    fontWeight: 'bold',
  },
  originalPrice: {
    color: Colors.textMuted,
    fontSize: FontSizes.md,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: Colors.live,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  discountText: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  stars: {
    flexDirection: 'row',
  },
  ratingText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  soldText: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
  },
  optionLabel: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  colorsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionActive: {
    borderColor: Colors.text,
  },
  sizesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  sizeOption: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sizeOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sizeText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  sizeTextActive: {
    color: Colors.text,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  quantityBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quantityText: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  sellerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sellerRating: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  sellerProducts: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
  },
  visitShopBtn: {
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  visitShopText: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  description: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    lineHeight: 22,
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
    gap: Spacing.sm,
  },
  favoriteBtn: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addToCartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  addToCartText: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  buyNowBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  buyNowText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
});
