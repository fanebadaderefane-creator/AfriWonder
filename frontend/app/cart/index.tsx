import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { featureFlags } from '../../src/config/featureFlags';
import ComingSoonScreen from '../../src/components/common/ComingSoonScreen';
import cartApi, { Cart, CartLineItem } from '../../src/api/cartApi';

type PaymentMethodId = 'orange_money' | 'wave' | 'wallet';

const PAYMENT_METHODS: { id: PaymentMethodId; name: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { id: 'orange_money', name: 'Orange Money', icon: 'phone-portrait', color: '#FF6B00' },
  { id: 'wave', name: 'Wave', icon: 'water', color: '#1DC1EC' },
  { id: 'wallet', name: 'Mon portefeuille AfriWonder', icon: 'wallet', color: Colors.primary },
];

const DELIVERY_FEE_FCFA = 1500;

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
  return <CartContent />;
}

function CartContent() {
  const insets = useSafeAreaInsets();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethodId>('orange_money');
  const [shippingAddress, _setShippingAddress] = useState<string>('');
  const [creating, setCreating] = useState(false);

  const loadCart = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await cartApi.get();
      setCart(data);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Impossible de charger votre panier. Vérifiez votre connexion.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCart();
  }, [loadCart]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCart(true).finally(() => setRefreshing(false));
  }, [loadCart]);

  const updateQuantity = async (item: CartLineItem, delta: number) => {
    const next = Math.max(0, item.quantity + delta);
    setUpdatingProductId(item.productId);
    try {
      // Mise à jour optimiste
      setCart((prev) => {
        if (!prev) return prev;
        if (next === 0) {
          return { ...prev, items: prev.items.filter((i) => i.productId !== item.productId) };
        }
        return {
          ...prev,
          items: prev.items.map((i) => (i.productId === item.productId ? { ...i, quantity: next } : i)),
        };
      });
      const updated = next === 0 ? await cartApi.remove(item.productId) : await cartApi.update(item.productId, next);
      setCart(updated);
    } catch (err) {
      // Resync depuis le serveur si échec
      const msg = (err as { message?: string })?.message ?? 'Action impossible.';
      Alert.alert('Erreur', msg);
      void loadCart(true);
    } finally {
      setUpdatingProductId(null);
    }
  };

  const removeItem = async (item: CartLineItem) => {
    setUpdatingProductId(item.productId);
    try {
      const updated = await cartApi.remove(item.productId);
      setCart(updated);
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? 'Suppression impossible.';
      Alert.alert('Erreur', msg);
    } finally {
      setUpdatingProductId(null);
    }
  };

  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const total = subtotal + DELIVERY_FEE_FCFA;

  const handleCheckout = async () => {
    if (!items.length) return;
    if (!shippingAddress.trim()) {
      Alert.alert(
        'Adresse manquante',
        "Renseignez d'abord une adresse de livraison.",
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Saisir maintenant',
            onPress: () =>
              router.push({ pathname: '/checkout' as any, params: { paymentMethod: selectedPayment } }),
          },
        ]
      );
      return;
    }
    setCreating(true);
    try {
      const { default: ordersApi } = await import('../../src/api/ordersApi');
      const result = await ordersApi.create({
        shipping_address: shippingAddress.trim(),
        payment_method: selectedPayment,
        source: 'marketplace',
      });
      const firstOrder = result.mode === 'single' ? result.order : result.orders[0];
      if (!firstOrder?.id) {
        throw new Error('Réponse de commande invalide.');
      }
      // Redirection vers l'écran de paiement réel
      if (selectedPayment === 'orange_money') {
        router.replace({
          pathname: '/checkout/orange-money' as any,
          params: { orderId: firstOrder.id, amount: String(total) },
        });
      } else if (selectedPayment === 'wave') {
        router.replace({
          pathname: '/checkout/wave' as any,
          params: { orderId: firstOrder.id, amount: String(total) },
        });
      } else {
        // Wallet : appel direct payments/wallet/pay-order
        const { default: apiClient } = await import('../../src/api/client');
        await apiClient.post('/payments/wallet/pay-order', { orderId: firstOrder.id });
        Alert.alert('Commande payée', 'Votre paiement par portefeuille a été pris en compte.', [
          { text: 'OK', onPress: () => router.replace('/orders' as any) },
        ]);
      }
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Création de commande impossible.';
      Alert.alert('Erreur', msg);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mon Panier</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Chargement du panier...</Text>
        </View>
      </View>
    );
  }

  if (error && !cart) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mon Panier</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="cloud-offline-outline" size={64} color={Colors.textSecondary} />
          <Text style={styles.emptyTitle}>Panier indisponible</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => loadCart()}>
            <Text style={styles.shopBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon Panier ({items.length})</Text>
        <View style={{ width: 40 }} />
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={80} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Panier vide</Text>
          <Text style={styles.emptySubtitle}>Découvrez nos produits sur le marketplace</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => router.push('/(tabs)/market' as any)}>
            <Text style={styles.shopBtnText}>Voir le marketplace</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          >
            {items.map((item) => (
              <View key={item.productId} style={styles.cartItem}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.itemImage} />
                ) : (
                  <View style={[styles.itemImage, styles.itemImageFallback]}>
                    <Ionicons name="image-outline" size={28} color={Colors.textSecondary} />
                  </View>
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.itemPrice}>{item.price.toLocaleString()} FCFA</Text>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity onPress={() => removeItem(item)} disabled={updatingProductId === item.productId}>
                    <Ionicons name="trash-outline" size={18} color={Colors.error} />
                  </TouchableOpacity>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item, -1)}
                      disabled={updatingProductId === item.productId}
                    >
                      <Ionicons name="remove" size={16} color={Colors.text} />
                    </TouchableOpacity>
                    {updatingProductId === item.productId ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                    )}
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item, 1)}
                      disabled={updatingProductId === item.productId}
                    >
                      <Ionicons name="add" size={16} color={Colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            <Text style={styles.sectionTitle}>Mode de paiement</Text>
            {PAYMENT_METHODS.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[styles.paymentOption, selectedPayment === method.id && styles.paymentOptionActive]}
                onPress={() => setSelectedPayment(method.id)}
              >
                <View style={[styles.paymentIcon, { backgroundColor: method.color }]}>
                  <Ionicons name={method.icon} size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.paymentName}>{method.name}</Text>
                <View style={[styles.radioCircle, selectedPayment === method.id && styles.radioCircleActive]}>
                  {selectedPayment === method.id && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            ))}

            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>Résumé de la commande</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Sous-total</Text>
                <Text style={styles.summaryValue}>{subtotal.toLocaleString()} FCFA</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Livraison estimée</Text>
                <Text style={styles.summaryValue}>{DELIVERY_FEE_FCFA.toLocaleString()} FCFA</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{total.toLocaleString()} FCFA</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.addressShortcut}
              onPress={() =>
                router.push({ pathname: '/checkout' as any, params: { paymentMethod: selectedPayment } })
              }
            >
              <Ionicons name="location-outline" size={18} color={Colors.primary} />
              <Text style={styles.addressShortcutText}>
                {shippingAddress.trim() ? shippingAddress : 'Renseigner l\'adresse de livraison'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          </ScrollView>

          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.md }]}>
            <View style={styles.totalInfo}>
              <Text style={styles.bottomTotal}>Total</Text>
              <Text style={styles.bottomTotalValue}>{total.toLocaleString()} FCFA</Text>
            </View>
            <TouchableOpacity
              style={[styles.checkoutBtn, creating && styles.checkoutBtnDisabled]}
              onPress={handleCheckout}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.checkoutText}>Commander</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  loadingText: { color: Colors.textSecondary, fontSize: FontSizes.md },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyTitle: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: 'bold', marginTop: Spacing.lg },
  emptySubtitle: { color: Colors.textSecondary, fontSize: FontSizes.md, textAlign: 'center' },
  shopBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xl,
  },
  shopBtnText: { color: '#FFFFFF', fontSize: FontSizes.md, fontWeight: '600' },
  scrollContent: { paddingHorizontal: Spacing.xl, paddingBottom: 140 },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  itemImage: { width: 80, height: 80, borderRadius: BorderRadius.md, backgroundColor: Colors.card },
  itemImageFallback: { alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1 },
  itemName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  itemPrice: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: 'bold', marginTop: Spacing.xs },
  itemActions: { alignItems: 'flex-end', justifyContent: 'space-between' },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold', minWidth: 20, textAlign: 'center' },
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
  paymentOptionActive: { borderColor: Colors.primary },
  paymentIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  paymentName: { flex: 1, color: Colors.text, fontSize: FontSizes.md, fontWeight: '500' },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: { borderColor: Colors.primary },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },
  summary: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.xxl,
  },
  summaryTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  summaryLabel: { color: Colors.textSecondary, fontSize: FontSizes.md },
  summaryValue: { color: Colors.text, fontSize: FontSizes.md },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: 0,
  },
  totalLabel: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold' },
  totalValue: { color: Colors.primary, fontSize: FontSizes.lg, fontWeight: 'bold' },
  addressShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  addressShortcutText: { flex: 1, color: Colors.text, fontSize: FontSizes.md },
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
  totalInfo: { flex: 1 },
  bottomTotal: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  bottomTotalValue: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: 'bold' },
  checkoutBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    minWidth: 140,
    alignItems: 'center',
  },
  checkoutBtnDisabled: { opacity: 0.5 },
  checkoutText: { color: '#FFFFFF', fontSize: FontSizes.lg, fontWeight: 'bold' },
});
