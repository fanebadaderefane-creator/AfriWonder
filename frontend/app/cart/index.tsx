import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { featureFlags } from '../../src/config/featureFlags';
import ComingSoonScreen from '../../src/components/common/ComingSoonScreen';

interface CartItem {
  id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  seller: string;
  size?: string;
}

const INITIAL_CART: CartItem[] = [
  { id: 'c1', name: 'Robe Bogolan Premium', image: 'https://picsum.photos/100/100?random=90', price: 25000, quantity: 1, seller: 'Awa Mode', size: 'M' },
  { id: 'c2', name: 'Bijoux traditionnels', image: 'https://picsum.photos/100/100?random=91', price: 15000, quantity: 2, seller: 'Artisanat Bamako' },
  { id: 'c3', name: 'Huile de karite bio', image: 'https://picsum.photos/100/100?random=92', price: 3500, quantity: 1, seller: 'Bio Mali' },
];

const PAYMENT_METHODS = [
  { id: 'orange', name: 'Orange Money', icon: 'phone-portrait', color: '#FF6B00' },
  { id: 'wave', name: 'Wave', icon: 'water', color: '#1DC1EC' },
  { id: 'mtn', name: 'MTN MoMo', icon: 'phone-portrait', color: '#FFCC00' },
  { id: 'card', name: 'Carte bancaire', icon: 'card', color: '#6C5CE7' },
];

export default function CartScreen() {
  if (!featureFlags.marketplace) {
    return (
      <ComingSoonScreen
        title="Panier"
        description="Le module marketplace (panier, commandes) est en cours de finalisation. Il sera bientôt disponible."
        icon="cart-outline"
      />
    );
  }
  const insets = useSafeAreaInsets();
  const [cart, setCart] = useState<CartItem[]>(INITIAL_CART);
  const [selectedPayment, setSelectedPayment] = useState('orange');

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item =>
      item.id === id
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item
    ));
  };

  const removeItem = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = 1500;
  const total = subtotal + deliveryFee;

  const handleCheckout = () => {
    Alert.alert(
      'Commande confirmee',
      `Total: ${total.toLocaleString()} FCFA\nPaiement via ${PAYMENT_METHODS.find(p => p.id === selectedPayment)?.name}\n\nVotre commande sera livree dans 45-60 minutes.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon Panier ({cart.length})</Text>
        <View style={{ width: 40 }} />
      </View>

      {cart.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={80} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Panier vide</Text>
          <Text style={styles.emptySubtitle}>Decouvrez nos produits sur le marketplace</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => router.push('/(tabs)/market')}>
            <Text style={styles.shopBtnText}>Voir le marketplace</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Cart Items */}
            {cart.map((item) => (
              <View key={item.id} style={styles.cartItem}>
                <Image source={{ uri: item.image }} style={styles.itemImage} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.itemSeller}>{item.seller}</Text>
                  {item.size && <Text style={styles.itemSize}>Taille: {item.size}</Text>}
                  <Text style={styles.itemPrice}>{item.price.toLocaleString()} FCFA</Text>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity onPress={() => removeItem(item.id)}>
                    <Ionicons name="trash-outline" size={18} color={Colors.error} />
                  </TouchableOpacity>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item.id, -1)}
                    >
                      <Ionicons name="remove" size={16} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item.id, 1)}
                    >
                      <Ionicons name="add" size={16} color={Colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            {/* Payment Methods */}
            <Text style={styles.sectionTitle}>Mode de paiement</Text>
            {PAYMENT_METHODS.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[styles.paymentOption, selectedPayment === method.id && styles.paymentOptionActive]}
                onPress={() => setSelectedPayment(method.id)}
              >
                <View style={[styles.paymentIcon, { backgroundColor: method.color }]}>
                  <Ionicons name={method.icon as any} size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.paymentName}>{method.name}</Text>
                <View style={[styles.radioCircle, selectedPayment === method.id && styles.radioCircleActive]}>
                  {selectedPayment === method.id && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            ))}

            {/* Order Summary */}
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>Resume de la commande</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Sous-total</Text>
                <Text style={styles.summaryValue}>{subtotal.toLocaleString()} FCFA</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Livraison</Text>
                <Text style={styles.summaryValue}>{deliveryFee.toLocaleString()} FCFA</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{total.toLocaleString()} FCFA</Text>
              </View>
            </View>
          </ScrollView>

          {/* Checkout Button */}
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.md }]}>
            <View style={styles.totalInfo}>
              <Text style={styles.bottomTotal}>Total</Text>
              <Text style={styles.bottomTotalValue}>{total.toLocaleString()} FCFA</Text>
            </View>
            <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
              <Text style={styles.checkoutText}>Commander</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    marginTop: Spacing.lg,
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    marginTop: Spacing.sm,
  },
  shopBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xl,
  },
  shopBtnText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 120,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  itemSeller: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
  },
  itemSize: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
  },
  itemPrice: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    marginTop: Spacing.xs,
  },
  itemActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  paymentOptionActive: {
    borderColor: Colors.primary,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentName: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '500',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  summary: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.xxl,
  },
  summaryTitle: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
  },
  summaryValue: {
    color: Colors.text,
    fontSize: FontSizes.md,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: 0,
  },
  totalLabel: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  totalValue: {
    color: Colors.primary,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
    gap: Spacing.lg,
  },
  totalInfo: {
    flex: 1,
  },
  bottomTotal: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  bottomTotalValue: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
  },
  checkoutBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  checkoutText: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
});
