import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { featureFlags } from '../../src/config/featureFlags';
import ComingSoonScreen from '../../src/components/common/ComingSoonScreen';

const CART_ITEMS = [
  { id: '1', name: 'Robe Bogolan', price: 25000, qty: 1, seller: 'Awa Mode' },
  { id: '2', name: 'Huile de karité', price: 3500, qty: 2, seller: 'Bio Mali' },
];

const PAYMENT_METHODS = [
  { id: 'orange', name: 'Orange Money', icon: 'phone-portrait', color: '#FF6600' },
  { id: 'wave', name: 'Wave', icon: 'water', color: '#1DC3E2' },
  { id: 'moov', name: 'Moov Money', icon: 'phone-portrait', color: '#0066CC' },
  { id: 'wallet', name: 'Portefeuille AfriWonder', icon: 'wallet', color: '#FF6B00' },
];

export default function CheckoutScreen() {
  if (!featureFlags.marketplace) {
    return (
      <ComingSoonScreen
        title="Paiement"
        description="Le tunnel de commande marketplace sera disponible très prochainement. Pour les recharges, utilisez Wallet → Recharger."
        icon="bag-check-outline"
      />
    );
  }
  const insets = useSafeAreaInsets();
  const [selectedPayment, setSelectedPayment] = useState('orange');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address] = useState('Bamako, Commune III, Quartier Hippodrome');
  const subtotal = CART_ITEMS.reduce((sum, item) => sum + item.price * item.qty, 0);
  const delivery = 1500;
  const total = subtotal + delivery;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paiement</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Delivery Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Adresse de livraison</Text>
          </View>
          <TouchableOpacity style={styles.addressCard}>
            <View style={styles.addressInfo}>
              <Text style={styles.addressName}>Domicile</Text>
              <Text style={styles.addressText}>{address}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="receipt" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Resume de la commande</Text>
          </View>
          {CART_ITEMS.map((item) => (
            <View key={item.id} style={styles.orderItem}>
              <View style={styles.orderItemInfo}>
                <Text style={styles.orderItemName}>{item.name}</Text>
                <Text style={styles.orderItemSeller}>{item.seller} x{item.qty}</Text>
              </View>
              <Text style={styles.orderItemPrice}>{(item.price * item.qty).toLocaleString()} FCFA</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Sous-total</Text>
            <Text style={styles.totalValue}>{subtotal.toLocaleString()} FCFA</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Livraison</Text>
            <Text style={styles.totalValue}>{delivery.toLocaleString()} FCFA</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{total.toLocaleString()} FCFA</Text>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Mode de paiement</Text>
          </View>
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[styles.paymentCard, selectedPayment === method.id && styles.paymentCardSelected]}
              onPress={() => setSelectedPayment(method.id)}
            >
              <View style={[styles.paymentIcon, { backgroundColor: method.color }]}>
                <Ionicons name={method.icon as any} size={20} color="#FFF" />
              </View>
              <Text style={styles.paymentName}>{method.name}</Text>
              <View style={[styles.radio, selectedPayment === method.id && styles.radioSelected]}>
                {selectedPayment === method.id && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          ))}

          {(selectedPayment === 'orange' || selectedPayment === 'wave' || selectedPayment === 'moov') && (
            <TextInput
              style={styles.phoneInput}
              placeholder="Numero de telephone"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
          )}
        </View>
      </ScrollView>

      {/* Bottom Pay Button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.md }]}>
        <View style={styles.bottomTotal}>
          <Text style={styles.bottomTotalLabel}>Total</Text>
          <Text style={styles.bottomTotalValue}>{total.toLocaleString()} FCFA</Text>
        </View>
        <TouchableOpacity
          style={styles.payButton}
          onPress={() => Alert.alert('Paiement', 'Paiement initie avec succes!', [{ text: 'OK', onPress: () => router.push('/orders') }])}
        >
          <Text style={styles.payButtonText}>Payer maintenant</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: 120 },
  section: { marginBottom: Spacing.xxl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.text },
  addressCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg },
  addressInfo: { flex: 1 },
  addressName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600', marginBottom: 2 },
  addressText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  orderItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md },
  orderItemInfo: { flex: 1 },
  orderItemName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '500' },
  orderItemSeller: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  orderItemPrice: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  totalLabel: { color: Colors.textSecondary, fontSize: FontSizes.md },
  totalValue: { color: Colors.text, fontSize: FontSizes.md },
  grandTotalLabel: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold' },
  grandTotalValue: { color: Colors.primary, fontSize: FontSizes.lg, fontWeight: 'bold' },
  paymentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  paymentCardSelected: { borderColor: Colors.primary },
  paymentIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  paymentName: { flex: 1, color: Colors.text, fontSize: FontSizes.md, fontWeight: '500' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: Colors.primary },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },
  phoneInput: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, color: Colors.text, fontSize: FontSizes.md, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.secondary, borderTopWidth: 1, borderTopColor: Colors.border, padding: Spacing.xl },
  bottomTotal: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  bottomTotalLabel: { color: Colors.textSecondary, fontSize: FontSizes.md },
  bottomTotalValue: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold' },
  payButton: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: 'center' },
  payButtonText: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold' },
});
