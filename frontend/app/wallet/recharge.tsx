import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import mobileApiClient from '../../src/api/mobileClient';

const AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];
const METHODS = [
  { id: 'orange', name: 'Orange Money', icon: 'phone-portrait', color: '#FF6600' },
  { id: 'wave', name: 'Wave', icon: 'water', color: '#1DC3E2' },
  { id: 'moov', name: 'Moov Money', icon: 'phone-portrait', color: '#0066CC' },
  { id: 'card', name: 'Carte bancaire', icon: 'card', color: '#6C63FF' },
];

export default function RechargeWalletScreen() {
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('orange');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRecharge = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir un montant valide');
      return;
    }
    if (selectedMethod !== 'card' && !phone.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir votre numéro de téléphone');
      return;
    }

    setLoading(true);
    try {
      const response = await mobileApiClient.post('/mobile/wallet/topup', {
        amount: numAmount,
        phone: phone.trim() || '00000000',
        provider: selectedMethod === 'orange' ? 'orange-money' : selectedMethod === 'wave' ? 'wave' : selectedMethod === 'moov' ? 'moov-money' : 'card',
      });
      const data = response.data?.data;
      Alert.alert(
        'Recharge réussie !',
        `Votre portefeuille a été rechargé de ${numAmount.toLocaleString()} FCFA.\nNouveau solde : ${(data?.balance || 0).toLocaleString()} FCFA`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message || 'Erreur lors de la recharge';
      Alert.alert('Erreur', msg);
    } finally { setLoading(false); }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recharger</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Amount Input */}
        <Text style={styles.sectionTitle}>Montant</Text>
        <View style={styles.amountInputContainer}>
          <TextInput
            style={styles.amountInput}
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <Text style={styles.currency}>FCFA</Text>
        </View>

        {/* Quick Amounts */}
        <View style={styles.quickAmounts}>
          {AMOUNTS.map((a) => (
            <TouchableOpacity key={a} style={[styles.quickAmount, amount === a.toString() && styles.quickAmountSelected]} onPress={() => setAmount(a.toString())}>
              <Text style={[styles.quickAmountText, amount === a.toString() && styles.quickAmountTextSelected]}>{a.toLocaleString()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment Method */}
        <Text style={styles.sectionTitle}>Source de paiement</Text>
        {METHODS.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[styles.methodCard, selectedMethod === method.id && styles.methodCardSelected]}
            onPress={() => setSelectedMethod(method.id)}
          >
            <View style={[styles.methodIcon, { backgroundColor: method.color }]}>
              <Ionicons name={method.icon as any} size={20} color="#FFF" />
            </View>
            <Text style={styles.methodName}>{method.name}</Text>
            <View style={[styles.radio, selectedMethod === method.id && styles.radioSelected]}>
              {selectedMethod === method.id && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}

        {selectedMethod !== 'card' && (
          <TextInput
            style={styles.phoneInput}
            placeholder="Numero de telephone"
            placeholderTextColor={Colors.textMuted}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        )}

        <TouchableOpacity
          style={[styles.rechargeBtn, (!amount || loading) && styles.rechargeBtnDisabled]}
          onPress={handleRecharge}
          disabled={!amount || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.rechargeBtnText}>Recharger maintenant</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md, marginTop: Spacing.lg },
  amountInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.xl },
  amountInput: { flex: 1, color: Colors.text, fontSize: 32, fontWeight: 'bold' },
  currency: { color: Colors.textSecondary, fontSize: FontSizes.xl },
  quickAmounts: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  quickAmount: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  quickAmountSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  quickAmountText: { color: Colors.textSecondary, fontSize: FontSizes.md },
  quickAmountTextSelected: { color: Colors.text },
  methodCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  methodCardSelected: { borderColor: Colors.primary },
  methodIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  methodName: { flex: 1, color: Colors.text, fontSize: FontSizes.md, fontWeight: '500' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: Colors.primary },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },
  phoneInput: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, color: Colors.text, fontSize: FontSizes.md, marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  rechargeBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: 'center', marginTop: Spacing.xxl },
  rechargeBtnDisabled: { opacity: 0.5 },
  rechargeBtnText: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold' },
});
