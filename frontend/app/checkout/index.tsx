import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import addressesApi, { Address } from '../../src/api/addressesApi';
import cartApi, { Cart } from '../../src/api/cartApi';
import ordersApi from '../../src/api/ordersApi';
import apiClient from '../../src/api/client';

type PaymentMethodId = 'orange_money' | 'wave' | 'mtn_money' | 'moov_money' | 'wallet';

const PAYMENT_METHODS: { id: PaymentMethodId; name: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { id: 'orange_money', name: 'Orange Money', icon: 'phone-portrait', color: '#FF6B00' },
  { id: 'wave', name: 'Wave', icon: 'water', color: '#1DC1EC' },
  { id: 'mtn_money', name: 'MTN Mobile Money', icon: 'phone-portrait', color: '#FFCC00' },
  { id: 'moov_money', name: 'Moov Money', icon: 'phone-portrait', color: '#0066CC' },
  { id: 'wallet', name: 'Mon portefeuille', icon: 'wallet', color: Colors.primary },
];

const DELIVERY_FEE_FCFA = 1500;

export default function CheckoutScreen() {
  return <CheckoutContent />;
}

function CheckoutContent() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ paymentMethod?: string }>();

  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [newAddressMode, setNewAddressMode] = useState(false);
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [saveAddress, setSaveAddress] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>(
    PAYMENT_METHODS.find((p) => p.id === params.paymentMethod)?.id ?? 'orange_money'
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cartData, addressList] = await Promise.all([
        cartApi.get().catch(() => null),
        addressesApi.list().catch(() => [] as Address[]),
      ]);
      setCart(cartData);
      setAddresses(addressList);
      if (addressList.length > 0) {
        const def = addressList.find((a) => a.is_default) ?? addressList[0];
        setSelectedAddressId(def.id);
      } else {
        setNewAddressMode(true);
      }
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? 'Chargement impossible.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const subtotal = cart?.subtotal ?? 0;
  const total = subtotal + (cart?.items?.length ? DELIVERY_FEE_FCFA : 0);

  const selectedAddress = useMemo(
    () => addresses.find((a) => a.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId]
  );

  const buildShippingAddressString = (): { full: string; city?: string } | null => {
    if (newAddressMode) {
      const trimmedStreet = street.trim();
      const trimmedCity = city.trim();
      if (!trimmedStreet || !trimmedCity) return null;
      const phoneSuffix = phone.trim() ? `, ${phone.trim()}` : '';
      return {
        full: `${trimmedStreet}, ${trimmedCity}${phoneSuffix}`,
        city: trimmedCity,
      };
    }
    if (!selectedAddress) return null;
    const phoneSuffix = selectedAddress.phone ? `, ${selectedAddress.phone}` : '';
    return {
      full: `${selectedAddress.street}, ${selectedAddress.city}${phoneSuffix}`,
      city: selectedAddress.city,
    };
  };

  const handleConfirm = async () => {
    if (!cart || cart.items.length === 0) {
      Alert.alert('Panier vide', 'Ajoutez des produits avant de commander.');
      return;
    }
    const built = buildShippingAddressString();
    if (!built) {
      Alert.alert('Adresse incomplète', 'Renseignez au moins une rue et une ville.');
      return;
    }
    setSubmitting(true);
    try {
      // Sauvegarde optionnelle de l'adresse saisie
      if (newAddressMode && saveAddress) {
        try {
          await addressesApi.create({
            street: street.trim(),
            city: city.trim(),
            phone: phone.trim() || undefined,
            is_default: addresses.length === 0,
          });
        } catch (err) {
          // L'enregistrement adresse n'est pas bloquant pour la commande
          console.warn('[checkout] address save failed', err);
        }
      }

      const result = await ordersApi.create({
        shipping_address: built.full,
        shipping_city: built.city,
        payment_method: paymentMethod,
        source: 'marketplace',
      });
      const order = result.mode === 'single' ? result.order : result.orders[0];
      if (!order?.id) throw new Error('Réponse de commande invalide.');

      if (paymentMethod === 'orange_money') {
        router.replace({
          pathname: '/checkout/orange-money' as any,
          params: { orderId: order.id, amount: String(total) },
        });
      } else if (paymentMethod === 'wave') {
        router.replace({
          pathname: '/checkout/wave' as any,
          params: { orderId: order.id, amount: String(total) },
        });
      } else if (paymentMethod === 'mtn_money' || paymentMethod === 'moov_money') {
        router.replace({
          pathname: '/checkout/mobile-money' as any,
          params: { orderId: order.id, amount: String(total), provider: paymentMethod },
        });
      } else {
        await apiClient.post('/payments/wallet/pay-order', { orderId: order.id });
        Alert.alert('Commande payée', 'Votre paiement a été pris en compte.', [
          { text: 'Voir mes commandes', onPress: () => router.replace('/orders' as any) },
        ]);
      }
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Création de commande impossible.';
      Alert.alert('Erreur', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Paiement</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Paiement</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color={Colors.textSecondary} />
          <Text style={styles.errorTitle}>Chargement impossible</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadInitial()}>
            <Text style={styles.retryText}>Réessayer</Text>
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
        <Text style={styles.headerTitle}>Paiement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Adresse de livraison</Text>

        {addresses.length > 0 && !newAddressMode ? (
          <>
            {addresses.map((addr) => (
              <TouchableOpacity
                key={addr.id}
                style={[styles.addressCard, selectedAddressId === addr.id && styles.addressCardActive]}
                onPress={() => setSelectedAddressId(addr.id)}
              >
                <View style={styles.addressCardLeft}>
                  <View style={[styles.addressIcon, addr.is_default && { backgroundColor: Colors.primary + '20' }]}>
                    <Ionicons
                      name={addr.type === 'work' ? 'briefcase' : 'home'}
                      size={18}
                      color={addr.is_default ? Colors.primary : Colors.textSecondary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addressLine}>{addr.street}</Text>
                    <Text style={styles.addressSub}>
                      {addr.city}
                      {addr.country ? `, ${addr.country}` : ''}
                    </Text>
                    {addr.phone ? <Text style={styles.addressPhone}>{addr.phone}</Text> : null}
                  </View>
                </View>
                <View style={[styles.radioCircle, selectedAddressId === addr.id && styles.radioCircleActive]}>
                  {selectedAddressId === addr.id && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addAddressBtn} onPress={() => setNewAddressMode(true)}>
              <Ionicons name="add" size={18} color={Colors.primary} />
              <Text style={styles.addAddressText}>Saisir une autre adresse</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Rue / quartier *</Text>
              <TextInput
                value={street}
                onChangeText={setStreet}
                style={styles.input}
                placeholder="Rue, quartier, indications"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Ville *</Text>
              <TextInput
                value={city}
                onChangeText={setCity}
                style={styles.input}
                placeholder="Bamako, Dakar, Abidjan..."
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Téléphone (livreur)</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                style={styles.input}
                placeholder="+221 ..."
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <TouchableOpacity style={styles.checkboxRow} onPress={() => setSaveAddress((v) => !v)}>
              <View style={[styles.checkbox, saveAddress && styles.checkboxActive]}>
                {saveAddress && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>Sauvegarder pour mes prochaines commandes</Text>
            </TouchableOpacity>
            {addresses.length > 0 ? (
              <TouchableOpacity style={styles.linkBtn} onPress={() => setNewAddressMode(false)}>
                <Text style={styles.linkText}>← Choisir une adresse enregistrée</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}

        <Text style={styles.sectionTitle}>Mode de paiement</Text>
        {PAYMENT_METHODS.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={[styles.paymentOption, paymentMethod === m.id && styles.paymentOptionActive]}
            onPress={() => setPaymentMethod(m.id)}
          >
            <View style={[styles.paymentIcon, { backgroundColor: m.color }]}>
              <Ionicons name={m.icon} size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.paymentName}>{m.name}</Text>
            <View style={[styles.radioCircle, paymentMethod === m.id && styles.radioCircleActive]}>
              {paymentMethod === m.id && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Résumé</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Articles ({cart?.items?.length ?? 0})</Text>
            <Text style={styles.summaryValue}>{subtotal.toLocaleString()} FCFA</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Livraison</Text>
            <Text style={styles.summaryValue}>{DELIVERY_FEE_FCFA.toLocaleString()} FCFA</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{total.toLocaleString()} FCFA</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.md }]}>
        <TouchableOpacity
          style={[styles.confirmBtn, submitting && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmText}>Confirmer la commande · {total.toLocaleString()} FCFA</Text>
          )}
        </TouchableOpacity>
      </View>
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
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  errorTitle: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: 'bold', marginTop: Spacing.md },
  errorText: { color: Colors.textSecondary, fontSize: FontSizes.md, textAlign: 'center' },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  retryText: { color: '#FFFFFF', fontSize: FontSizes.md, fontWeight: '600' },
  scrollContent: { paddingHorizontal: Spacing.xl, paddingBottom: 140 },
  sectionTitle: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  addressCardActive: { borderColor: Colors.primary },
  addressCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  addressIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressLine: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  addressSub: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  addressPhone: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2 },
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  addAddressText: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: '600' },
  formGroup: { marginBottom: Spacing.md },
  label: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginBottom: Spacing.xs },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: Colors.text,
    fontSize: FontSizes.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkboxLabel: { color: Colors.text, fontSize: FontSizes.sm, flex: 1 },
  linkBtn: { paddingVertical: Spacing.sm },
  linkText: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: '600' },
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
    marginTop: Spacing.lg,
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
  },
  totalLabel: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold' },
  totalValue: { color: Colors.primary, fontSize: FontSizes.lg, fontWeight: 'bold' },
  bottomBar: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmText: { color: '#FFFFFF', fontSize: FontSizes.md, fontWeight: 'bold' },
});
