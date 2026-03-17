import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const paymentIcons = {
  orange_money: 'OM',
  moov_money: 'MM',
  card: 'CB',
  wallet: 'W',
  cod: 'COD',
};

export default function CheckoutScreen({ navigation }) {
  const { user } = useAuth();
  const [isGuest, setIsGuest] = useState(false);
  const [cart, setCart] = useState(null);
  const [cartBreakdown, setCartBreakdown] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [commissionConfig, setCommissionConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('orange_money');
  const [saveAddress, setSaveAddress] = useState(false);

  const [guestInfo, setGuestInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
  });

  const [newAddress, setNewAddress] = useState({
    label: 'Maison',
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postal_code: '',
    is_default: false,
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        let u = null;
        try {
          u = await api.auth.me();
        } catch {
          u = null;
        }
        if (!cancelled) {
          if (!u) {
            setIsGuest(true);
          } else {
            setIsGuest(false);
            setNewAddress((prev) => ({ ...prev, full_name: u.full_name || u.name || '' }));
          }
        }
        const cartRes = await api.cart.get();
        if (!cancelled) setCart(cartRes || {});
        if (cartRes?.items?.length) {
          const bd = await api.cart.getBreakdown().catch(() => null);
          if (!cancelled) setCartBreakdown(bd || null);
        }
        if (u) {
          const addrRes = await api.addresses
            ?.list?.()
            .catch(() => []);
          if (!cancelled) {
            const raw = Array.isArray(addrRes)
              ? addrRes
              : addrRes?.data ?? addrRes ?? [];
            const mapped = Array.isArray(raw)
              ? raw.map((a) => ({
                  id: a.id,
                  address_line1: a.street,
                  city: a.city,
                  postal_code: a.postal_code,
                  phone: a.phone,
                  label: a.type || 'Adresse',
                  is_default: a.is_default,
                  full_name: u.full_name || u.name,
                }))
              : [];
            setAddresses(mapped);
            const def = mapped.find((a) => a.is_default) || mapped[0];
            if (def) setSelectedAddress(def.id);
          }
        }
        try {
          const mod = await import('../utils/commissions');
          const getCommissionConfig = mod.getCommissionConfig;
          const formatCommissionRate = mod.formatCommissionRate;
          const c = await getCommissionConfig();
          const data = c?.data ?? c;
          const rate =
            data?.marketplace?.seller_commission_default_pct ?? 0.1;
          if (!cancelled) {
            setCommissionConfig({
              rate,
              rateLabel: formatCommissionRate(rate),
            });
          }
        } catch {
          if (!cancelled) setCommissionConfig(null);
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

  const items = cart?.items || [];
  const feesBySeller = cartBreakdown?.feesBySeller || [];
  const totalFees = cartBreakdown?.totalFees ?? 0;

  const { subtotal, deliveryFee, tax, total, platformFees } = useMemo(() => {
    const sub =
      cart?.subtotal ??
      items.reduce(
        (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
        0,
      );
    const delivery = items.length > 0 ? 1000 : 0;
    const t = 0;
    const platform = totalFees || 0;
    const tot = sub + delivery + platform;
    return {
      subtotal: sub,
      deliveryFee: delivery,
      tax: t,
      total: tot,
      platformFees: platform,
    };
  }, [cart, items, totalFees]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color="#fb923c" />
      </SafeAreaView>
    );
  }

  if (!items.length) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <Text style={styles.emptyText}>Panier vide</Text>
      </SafeAreaView>
    );
  }

  const handleSubmit = async () => {
    if (submitting) return;
    if (isGuest) {
      if (
        !guestInfo.name ||
        !guestInfo.email ||
        !guestInfo.phone ||
        !guestInfo.address ||
        !guestInfo.city
      ) {
        return;
      }
    } else if (showNewAddress) {
      if (
        !newAddress.full_name ||
        !newAddress.phone ||
        !newAddress.address_line1 ||
        !newAddress.city
      ) {
        return;
      }
    } else if (!selectedAddress && !showNewAddress) {
      return;
    }

    setSubmitting(true);
    try {
      if (!isGuest && showNewAddress && saveAddress && api.addresses?.create) {
        await api.addresses.create({
          street: newAddress.address_line1,
          city: newAddress.city,
          postal_code: newAddress.postal_code || undefined,
          phone: newAddress.phone || undefined,
          type: newAddress.label || 'shipping',
          is_default: newAddress.is_default ?? false,
        });
      }

      let shippingCity;
      let shippingAddress;

      if (isGuest) {
        shippingCity = guestInfo.city;
        shippingAddress = `${guestInfo.address}, ${guestInfo.city}`;
      } else if (showNewAddress) {
        shippingCity = newAddress.city;
        shippingAddress = `${newAddress.address_line1}, ${newAddress.city}`;
      } else {
        const addr = addresses.find((a) => a.id === selectedAddress);
        shippingCity = addr?.city || newAddress.city;
        shippingAddress = addr
          ? `${addr.address_line1}, ${addr.city}`
          : newAddress.address_line1
          ? `${newAddress.address_line1}, ${newAddress.city}`
          : '';
      }

      if (!shippingAddress?.trim()) {
        setSubmitting(false);
        return;
      }

      const result = await api.orders.create({
        shipping_address: shippingAddress,
        shipping_city: shippingCity || undefined,
        payment_method: paymentMethod || 'orange_money',
      });
      const orders = result.orders || (result.id ? [result] : []);
      const created = Array.isArray(orders) ? orders : [result];
      const first = created[0];
      if (first?.id) {
        navigation.replace('OrderTracking', { orderId: first.id });
      } else {
        navigation.goBack();
      }
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Finaliser la commande</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {isGuest && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Commander en tant qu'invité</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Nom complet *</Text>
              <TextInput
                style={styles.input}
                value={guestInfo.name}
                onChangeText={(v) =>
                  setGuestInfo((g) => ({ ...g, name: v }))
                }
                placeholder="Jean Dupont"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={guestInfo.email}
                onChangeText={(v) =>
                  setGuestInfo((g) => ({ ...g, email: v }))
                }
                keyboardType="email-address"
                placeholder="jean@example.com"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Téléphone *</Text>
              <TextInput
                style={styles.input}
                value={guestInfo.phone}
                onChangeText={(v) =>
                  setGuestInfo((g) => ({ ...g, phone: v }))
                }
                keyboardType="phone-pad"
                placeholder="+221 77 123 45 67"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Adresse *</Text>
              <TextInput
                style={styles.input}
                value={guestInfo.address}
                onChangeText={(v) =>
                  setGuestInfo((g) => ({ ...g, address: v }))
                }
                placeholder="123 Rue de la Paix"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Ville *</Text>
              <TextInput
                style={styles.input}
                value={guestInfo.city}
                onChangeText={(v) =>
                  setGuestInfo((g) => ({ ...g, city: v }))
                }
                placeholder="Dakar"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>
        )}

        {!isGuest && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.titleRow}>
                <Ionicons name="location" size={18} color="#111827" />
                <Text style={styles.cardTitle}>Adresse de livraison</Text>
              </View>
              <TouchableOpacity
                style={styles.chipBtn}
                onPress={() => setShowNewAddress((s) => !s)}
              >
                <Ionicons name="add" size={16} color="#2563eb" />
                <Text style={styles.chipBtnText}>Nouvelle</Text>
              </TouchableOpacity>
            </View>

            {showNewAddress ? (
              <>
                <View style={styles.fieldRow}>
                  <View style={[styles.field, styles.fieldHalf]}>
                    <Text style={styles.label}>Libellé</Text>
                    <TextInput
                      style={styles.input}
                      value={newAddress.label}
                      onChangeText={(v) =>
                        setNewAddress((a) => ({ ...a, label: v }))
                      }
                    />
                  </View>
                  <View style={[styles.field, styles.fieldHalf]}>
                    <Text style={styles.label}>Nom complet *</Text>
                    <TextInput
                      style={styles.input}
                      value={newAddress.full_name}
                      onChangeText={(v) =>
                        setNewAddress((a) => ({ ...a, full_name: v }))
                      }
                    />
                  </View>
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Téléphone *</Text>
                  <TextInput
                    style={styles.input}
                    value={newAddress.phone}
                    onChangeText={(v) =>
                      setNewAddress((a) => ({ ...a, phone: v }))
                    }
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Adresse *</Text>
                  <TextInput
                    style={styles.input}
                    value={newAddress.address_line1}
                    onChangeText={(v) =>
                      setNewAddress((a) => ({ ...a, address_line1: v }))
                    }
                    placeholder="Numéro et nom de rue"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Complément d'adresse</Text>
                  <TextInput
                    style={styles.input}
                    value={newAddress.address_line2}
                    onChangeText={(v) =>
                      setNewAddress((a) => ({ ...a, address_line2: v }))
                    }
                    placeholder="Appartement, étage, etc."
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                <View style={styles.fieldRow}>
                  <View style={[styles.field, styles.fieldHalf]}>
                    <Text style={styles.label}>Ville *</Text>
                    <TextInput
                      style={styles.input}
                      value={newAddress.city}
                      onChangeText={(v) =>
                        setNewAddress((a) => ({ ...a, city: v }))
                      }
                    />
                  </View>
                  <View style={[styles.field, styles.fieldHalf]}>
                    <Text style={styles.label}>Code postal</Text>
                    <TextInput
                      style={styles.input}
                      value={newAddress.postal_code}
                      onChangeText={(v) =>
                        setNewAddress((a) => ({ ...a, postal_code: v }))
                      }
                    />
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setSaveAddress((s) => !s)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      saveAddress && styles.checkboxChecked,
                    ]}
                  >
                    {saveAddress && (
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color="#ffffff"
                      />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    Enregistrer cette adresse
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              addresses.map((addr) => (
                <TouchableOpacity
                  key={addr.id}
                  style={[
                    styles.addressRow,
                    selectedAddress === addr.id && styles.addressRowSelected,
                  ]}
                  onPress={() => setSelectedAddress(addr.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.radioOuter}>
                    {selectedAddress === addr.id && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <View style={styles.addressBody}>
                    <Text style={styles.addressLabel}>{addr.label}</Text>
                    {(addr.full_name || addr.phone) && (
                      <Text style={styles.addressMeta}>
                        {[addr.full_name, addr.phone]
                          .filter(Boolean)
                          .join(' • ')}
                      </Text>
                    )}
                    <Text style={styles.addressText}>
                      {addr.address_line1}, {addr.city}
                    </Text>
                  </View>
                  {addr.is_default && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Par défaut</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mode de paiement</Text>
          {[
            {
              id: 'orange_money',
              label: 'Orange Money',
              hint: 'Paiement mobile instantané',
            },
            {
              id: 'moov_money',
              label: 'Moov Money',
              hint: 'Paiement mobile Moov',
            },
            {
              id: 'card',
              label: 'Carte bancaire',
              hint: 'Visa / Mastercard (Stripe)',
            },
            {
              id: 'wallet',
              label: 'Portefeuille',
              hint: 'Payer depuis votre solde AfriWonder',
            },
            {
              id: 'cod',
              label: 'Paiement à la livraison',
              hint: 'Règlement au livreur',
            },
          ].map((m) => {
            const active = paymentMethod === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.paymentRow,
                  active && styles.paymentRowActive,
                ]}
                onPress={() => setPaymentMethod(m.id)}
                activeOpacity={0.8}
              >
                <View style={styles.radioOuter}>
                  {active && <View style={styles.radioInner} />}
                </View>
                <View style={styles.paymentBody}>
                  <View style={styles.paymentLeft}>
                    <View style={styles.iconCircle}>
                      <Text style={styles.iconCircleText}>
                        {paymentIcons[m.id]}
                      </Text>
                    </View>
                    <Text style={styles.paymentLabel}>{m.label}</Text>
                  </View>
                  <Text style={styles.paymentHint}>{m.hint}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Résumé de la commande</Text>
          {items.map((item, idx) => {
            const img = item.image || item.product_image;
            const name = item.name || item.product_name;
            const lineTotal =
              (item.price || 0) * (item.quantity || 0);
            return (
              <View key={idx} style={styles.orderItemRow}>
                {img ? (
                  <View style={styles.orderThumbWrap}>
                    <View style={styles.orderThumbBorder}>
                      <View style={styles.orderThumbInner}>
                        <View style={styles.orderThumbImageWrap}>
                          <View style={styles.orderThumbBg} />
                        </View>
                      </View>
                    </View>
                  </View>
                ) : null}
                <View style={styles.orderItemBody}>
                  <Text style={styles.orderItemName} numberOfLines={2}>
                    {name}
                  </Text>
                  <Text style={styles.orderItemMeta}>
                    Qté: {item.quantity}
                  </Text>
                  <Text style={styles.orderItemPrice}>
                    {lineTotal.toLocaleString('fr-FR')} FCFA
                  </Text>
                </View>
              </View>
            );
          })}
          <View style={styles.summaryRows}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Sous-total</Text>
              <Text style={styles.summaryValue}>
                {subtotal.toLocaleString('fr-FR')} FCFA
              </Text>
            </View>
            {feesBySeller.length > 0 && (
              <Text style={styles.platformLabel}>
                Commission plateforme (
                {commissionConfig?.rateLabel ?? '10 %'}
                ) — AfriWonder
              </Text>
            )}
            {feesBySeller.map((f) => (
              <View
                key={f.sellerId}
                style={styles.platformRow}
              >
                <Text style={styles.platformLeft}>
                  Vendeur: {f.itemCount} article(s)
                </Text>
                <Text style={styles.platformRight}>
                  {(f.platformFee || 0).toLocaleString('fr-FR')} FCFA
                </Text>
              </View>
            ))}
            {platformFees > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Frais plateforme total
                </Text>
                <Text style={styles.summaryValue}>
                  {platformFees.toLocaleString('fr-FR')} FCFA
                </Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Frais de livraison</Text>
              <Text style={styles.summaryValue}>
                {deliveryFee.toLocaleString('fr-FR')} FCFA
              </Text>
            </View>
            {tax > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Taxes</Text>
                <Text style={styles.summaryValue}>
                  {tax.toLocaleString('fr-FR')} FCFA
                </Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {total.toLocaleString('fr-FR')} FCFA
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.noticeCard}>
          <Ionicons
            name="alert-circle"
            size={18}
            color="#ea580c"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.noticeText}>
            Vos fonds seront sécurisés en escrow et libérés au vendeur
            uniquement après confirmation de réception de votre
            commande.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            submitting && styles.primaryBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.primaryBtnText}>
              Confirmer la commande (
              {total.toLocaleString('fr-FR')} FCFA)
            </Text>
          )}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  field: {
    marginTop: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  fieldHalf: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  chipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  chipBtnText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#9ca3af',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#374151',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 8,
  },
  addressRowSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#9ca3af',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb',
  },
  addressBody: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  addressMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  addressText: {
    fontSize: 12,
    color: '#4b5563',
    marginTop: 2,
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#dcfce7',
  },
  defaultBadgeText: {
    fontSize: 11,
    color: '#15803d',
    fontWeight: '600',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginTop: 8,
  },
  paymentRowActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
  },
  paymentBody: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 8,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  paymentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  paymentHint: {
    fontSize: 11,
    color: '#6b7280',
  },
  orderItemRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  orderThumbWrap: {
    marginRight: 8,
  },
  orderThumbBorder: {
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  orderThumbInner: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  orderThumbImageWrap: {
    width: 52,
    height: 52,
  },
  orderThumbBg: {
    flex: 1,
    backgroundColor: '#e5e7eb',
  },
  orderItemBody: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  orderItemMeta: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  orderItemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fb923c',
    marginTop: 4,
  },
  summaryRows: {
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#4b5563',
  },
  summaryValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  platformLabel: {
    fontSize: 12,
    color: '#4b5563',
    marginTop: 4,
  },
  platformRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  platformLeft: {
    fontSize: 11,
    color: '#6b7280',
  },
  platformRight: {
    fontSize: 11,
    color: '#6b7280',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    paddingTop: 6,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fb923c',
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#1d4ed8',
  },
  bottomBar: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  primaryBtn: {
    borderRadius: 999,
    backgroundColor: '#fb923c',
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyText: {
    fontSize: 15,
    color: '#6b7280',
  },
});

