import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import apiClient from '../../src/api/client';

const METHODS = [
  { id: 'orange-money', name: 'Orange Money', icon: 'phone-portrait', color: '#FF6600', prefix: '+223 7' },
  { id: 'wave', name: 'Wave', icon: 'water', color: '#1DC3E2', prefix: '+223 7' },
  { id: 'moov-money', name: 'Moov Money', icon: 'phone-portrait', color: '#0066CC', prefix: '+223 7' },
];
const AMOUNTS = [5000, 10000, 25000, 50000, 100000];

export default function CreatorWithdrawScreen() {
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('orange-money');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleWithdraw = async () => {
    const num = parseFloat(amount);
    if (!num || num < 500) { Alert.alert('Erreur', 'Montant minimum: 500 FCFA'); return; }
    if (!phone.trim()) { Alert.alert('Erreur', 'Numéro requis'); return; }

    Alert.alert('Confirmer le retrait', `Retirer ${num.toLocaleString()} FCFA vers ${METHODS.find(m => m.id === method)?.name}?\nFrais: ${(num * 0.02).toLocaleString()} FCFA\nVous recevrez: ${(num * 0.98).toLocaleString()} FCFA`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', onPress: async () => {
        setLoading(true);
        try {
          const payment_method =
            method === 'wave' ? 'wave' : method === 'moov-money' ? 'mtn_money' : 'orange_money';
          const res = await apiClient.post('/withdrawals/request', {
            amount: num,
            payment_method,
            phone: phone.trim(),
            orange_money_phone: phone.trim(),
          });
          const data = res.data?.data;
          Alert.alert('Demande enregistrée', `${(data?.amount ?? num).toLocaleString()} FCFA — traitement sous 24–48h vers ${phone}`, [{ text: 'OK', onPress: () => router.back() }]);
        } catch (e: any) { Alert.alert('Erreur', e.response?.data?.detail || 'Erreur de retrait'); }
        finally { setLoading(false); }
      }}
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Retrait Mobile Money</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Méthode de retrait</Text>
        {METHODS.map(m => (
          <TouchableOpacity key={m.id} style={[styles.methodCard, method === m.id && { borderColor: m.color }]} onPress={() => setMethod(m.id)}>
            <View style={[styles.methodIcon, { backgroundColor: m.color + '20' }]}><Ionicons name={m.icon as any} size={22} color={m.color} /></View>
            <Text style={styles.methodName}>{m.name}</Text>
            {method === m.id && <Ionicons name="checkmark-circle" size={22} color={m.color} />}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>Montant (FCFA)</Text>
        <TextInput style={styles.amountInput} placeholder="0" placeholderTextColor={Colors.textMuted} keyboardType="numeric" value={amount} onChangeText={setAmount} />
        <View style={styles.quickAmounts}>
          {AMOUNTS.map(a => (
            <TouchableOpacity key={a} style={[styles.quickAmount, amount === a.toString() && styles.quickAmountActive]} onPress={() => setAmount(a.toString())}>
              <Text style={[styles.quickAmountText, amount === a.toString() && { color: '#FFF' }]}>{(a/1000)}K</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Numéro de téléphone</Text>
        <TextInput style={styles.input} placeholder="70 XX XX XX" placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />

        <Text style={styles.label}>Nom complet (optionnel)</Text>
        <TextInput style={styles.input} placeholder="Nom sur le compte" placeholderTextColor={Colors.textMuted} value={fullName} onChangeText={setFullName} />

        {amount ? (
          <View style={styles.summary}>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Montant</Text><Text style={styles.summaryValue}>{parseFloat(amount).toLocaleString()} FCFA</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Frais (2%)</Text><Text style={styles.summaryValue}>-{(parseFloat(amount) * 0.02).toLocaleString()} FCFA</Text></View>
            <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8 }]}><Text style={[styles.summaryLabel, { fontWeight: 'bold', color: Colors.text }]}>Vous recevez</Text><Text style={[styles.summaryValue, { color: '#4ECDC4', fontWeight: 'bold' }]}>{(parseFloat(amount) * 0.98).toLocaleString()} FCFA</Text></View>
          </View>
        ) : null}

        <TouchableOpacity style={[styles.submitBtn, (!amount || !phone || loading) && { opacity: 0.5 }]} onPress={handleWithdraw} disabled={!amount || !phone || loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <><Ionicons name="cash-outline" size={20} color="#FFF" /><Text style={styles.submitBtnText}>Retirer</Text></>}
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
  content: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
  label: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600', marginTop: Spacing.lg, marginBottom: Spacing.sm },
  methodCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.sm, gap: Spacing.md, borderWidth: 2, borderColor: 'transparent' },
  methodIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  methodName: { flex: 1, color: Colors.text, fontSize: FontSizes.md, fontWeight: '500' },
  amountInput: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.xl, color: Colors.text, fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
  quickAmounts: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  quickAmount: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, alignItems: 'center' },
  quickAmountActive: { backgroundColor: Colors.primary },
  quickAmountText: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: '600' },
  input: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, color: Colors.text, fontSize: FontSizes.md },
  summary: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginTop: Spacing.lg, gap: 6 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  summaryValue: { color: Colors.text, fontSize: FontSizes.sm },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.lg, marginTop: Spacing.xl, gap: 8 },
  submitBtnText: { color: '#FFF', fontSize: FontSizes.lg, fontWeight: 'bold' },
});
