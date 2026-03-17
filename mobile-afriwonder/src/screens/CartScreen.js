import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

function getWhatsAppUrl(phoneOrWhatsapp, message = '') {
  const raw = (phoneOrWhatsapp || '').replace(/\D/g, '');
  if (!raw || raw.length < 8) return null;
  const num = raw.startsWith('221') || raw.startsWith('223') ? raw : `221${raw}`;
  const text = message ? `&text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${num}${text}`;
}

export default function CartScreen({ navigation }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(null);
  const [cartBreakdown, setCartBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) return;
      try {
        const res = await api.cart.get();
        if (!cancelled) setCart(res || {});
        if (res?.items?.length) {
          const bd = await api.cart.getBreakdown().catch(() => null);
          if (!cancelled) setCartBreakdown(bd || null);
        } else if (!cancelled) {
          setCartBreakdown(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const updateQuantity = async (productId, quantity) => {
    if (!cart || updating) return;
    setUpdating(true);
    try {
      if (quantity <= 0) {
        await api.cart.remove(productId);
      } else {
        await api.cart.update(productId, quantity);
      }
      const res = await api.cart.get();
      setCart(res || {});
      if (res?.items?.length) {
        const bd = await api.cart.getBreakdown().catch(() => null);
        setCartBreakdown(bd || null);
      } else {
        setCartBreakdown(null);
      }
    } finally {
      setUpdating(false);
    }
  };

  if (!user || loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const discount = cart?.coupon_discount || 0;
  const shippingFee = items.length > 0 ? 2500 : 0;
  const totalAmount = Math.max(0, subtotal + shippingFee - discount);

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityLabel="Retour"
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mon panier</Text>
        </View>
        <View style={styles.emptyWrap}>
          <Ionicons name="cart-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyTitle}>Votre panier est vide</Text>
          <Text style={styles.emptyText}>Commencez à acheter pour remplir votre panier.</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Marketplace')}
          >
            <Text style={styles.primaryBtnText}>Retour au marketplace</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityLabel="Retour"
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon panier ({items.length})</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item, index) =>
          String(item.productId || item.product_id || index)
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const productId = item.productId || item.product_id;
          const name = item.name || item.product_name;
          const image = item.image || item.product_image;
          const lineTotal = (item.price || 0) * (item.quantity || 0);
          return (
            <View style={styles.itemCard}>
              {image ? (
                <Image source={{ uri: image }} style={styles.itemImage} />
              ) : (
                <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                  <Ionicons name="image" size={24} color="#9ca3af" />
                </View>
              )}
              <View style={styles.itemBody}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {name}
                </Text>
                <Text style={styles.itemPrice}>
                  {lineTotal.toLocaleString('fr-FR')} XOF
                </Text>
                <View style={styles.itemFooter}>
                  <View style={styles.qtyWrap}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(productId, (item.quantity || 0) - 1)}
                      disabled={updating}
                    >
                      <Ionicons name="remove" size={18} color="#111827" />
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(productId, (item.quantity || 0) + 1)}
                      disabled={updating}
                    >
                      <Ionicons name="add" size={18} color="#111827" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => updateQuantity(productId, 0)}
                    disabled={updating}
                  >
                    <Ionicons name="trash-outline" size={18} color="#b91c1c" />
                    <Text style={styles.removeText}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Sous-total</Text>
          <Text style={styles.summaryValue}>
            {subtotal.toLocaleString('fr-FR')} XOF
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Livraison</Text>
          <Text style={styles.summaryValue}>
            {shippingFee.toLocaleString('fr-FR')} XOF
          </Text>
        </View>
        {discount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, styles.discountLabel]}>
              Réduction
            </Text>
            <Text style={[styles.summaryValue, styles.discountValue]}>
              -{discount.toLocaleString('fr-FR')} XOF
            </Text>
          </View>
        )}
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>
            {totalAmount.toLocaleString('fr-FR')} XOF
          </Text>
        </View>

        {cartBreakdown && (cartBreakdown.feesBySeller || []).length > 0 ? (
          <View style={styles.sellersBlock}>
            <Text style={styles.sellersTitle}>Contacter les vendeurs</Text>
            {(cartBreakdown.feesBySeller || []).map((f) => {
              const wa = f.whatsapp || f.phone;
              const storeName = f.store_name || 'Vendeur';
              const msg = `Bonjour, je souhaite commander les articles de mon panier (${f.itemCount} article${f.itemCount > 1 ? 's' : ''}) — Total: ${(f.subtotal || 0).toLocaleString('fr-FR')} XOF`;
              const waUrl = getWhatsAppUrl(wa, msg);
              return (
                <TouchableOpacity
                  key={f.sellerId}
                  style={waUrl ? styles.whatsappBtn : styles.disabledSellerBtn}
                  onPress={() => {
                    if (waUrl) {
                      // eslint-disable-next-line no-undef
                      Linking.openURL(waUrl).catch(() => {});
                    }
                  }}
                  disabled={!waUrl}
                >
                  <Ionicons
                    name="logo-whatsapp"
                    size={18}
                    color={waUrl ? '#fff' : '#6b7280'}
                  />
                  <Text
                    style={waUrl ? styles.whatsappText : styles.disabledSellerText}
                    numberOfLines={1}
                  >
                    {storeName}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <Text style={styles.phaseNote}>
              Phase 1 : paiement et livraison à organiser directement avec le
              vendeur.
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.primaryBtn, styles.checkoutBtn]}
            onPress={() => navigation.navigate('Checkout')}
          >
            <Text style={styles.primaryBtnText}>Passer la commande</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('Marketplace')}
        >
          <Text style={styles.secondaryBtnText}>Continuer les achats</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 200,
  },
  itemCard: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  itemImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
  },
  itemImagePlaceholder: {
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  itemPrice: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  qtyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  qtyBtn: {
    padding: 4,
  },
  qtyValue: {
    minWidth: 28,
    textAlign: 'center',
    fontWeight: '600',
    color: '#111827',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  removeText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#b91c1c',
    fontWeight: '500',
  },
  summaryCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#4b5563',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  discountLabel: {
    color: '#059669',
  },
  discountValue: {
    color: '#059669',
  },
  summaryDivider: {
    marginVertical: 8,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563eb',
  },
  sellersBlock: {
    marginTop: 12,
  },
  sellersTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 6,
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#16a34a',
    marginBottom: 6,
  },
  whatsappText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  disabledSellerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
    marginBottom: 6,
  },
  disabledSellerText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  phaseNote: {
    marginTop: 4,
    fontSize: 11,
    color: '#6b7280',
  },
  primaryBtn: {
    marginTop: 12,
    borderRadius: 999,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    alignItems: 'center',
  },
  checkoutBtn: {
    marginTop: 12,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  secondaryBtn: {
    marginTop: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#374151',
    fontWeight: '500',
    fontSize: 14,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  emptyText: {
    marginTop: 6,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

