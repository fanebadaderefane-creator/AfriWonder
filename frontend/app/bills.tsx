/**
 * Écran Paiement de factures (eau, électricité, internet, abonnements).
 * Branché sur GET/POST /api/proxy/bills/* .
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import apiClient from '../src/api/client';

const BILL_TYPES: { id: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'electricity', label: 'Électricité (EDM)', icon: 'flash-outline' },
  { id: 'water', label: 'Eau (SOMAGEP)', icon: 'water-outline' },
  { id: 'internet', label: 'Internet', icon: 'wifi-outline' },
  { id: 'tv', label: 'TV / Streaming', icon: 'tv-outline' },
  { id: 'school', label: 'Scolarité', icon: 'school-outline' },
  { id: 'other', label: 'Autre', icon: 'document-text-outline' },
];

export default function BillsScreen() {
  const insets = useSafeAreaInsets();
  const [billType, setBillType] = useState('electricity');
  const [provider, setProvider] = useState('');
  const [account, setAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await apiClient.get('/bills');
        const list = res.data?.data || [];
        setHistory(Array.isArray(list) ? list : []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const handlePay = async () => {
    const num = parseFloat(amount);
    if (!provider.trim() || !account.trim() || !num || num < 100) {
      Alert.alert('Erreur', 'Fournisseur, numéro de compte et montant requis (≥ 100 FCFA)');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/bills/pay', {
        bill_type: billType,
        provider: provider.trim(),
        account_number: account.trim(),
        amount: num,
        payment_method: 'wallet',
      });
      Alert.alert('Paiement enregistré ✅', 'Votre facture est en cours de traitement.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Paiement échoué');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payer une facture</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>Type de facture</Text>
        <View style={styles.grid}>
          {BILL_TYPES.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.tile, billType === t.id && styles.tileSel]}
              onPress={() => setBillType(t.id)}
            >
              <Ionicons name={t.icon} size={24} color={billType === t.id ? '#FFF' : Colors.text} />
              <Text style={[styles.tileLabel, billType === t.id && { color: '#FFF' }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.section}>Fournisseur</Text>
        <View style={styles.input}>
          <TextInput
            value={provider}
            onChangeText={setProvider}
            placeholder="Ex: EDM-SA, Orange ML, Canal+…"
            placeholderTextColor={Colors.textMuted}
            style={styles.inputText}
          />
        </View>

        <Text style={styles.section}>Numéro de compte / Référence</Text>
        <View style={styles.input}>
          <TextInput
            value={account}
            onChangeText={setAccount}
            placeholder="Numéro client"
            placeholderTextColor={Colors.textMuted}
            style={styles.inputText}
          />
        </View>

        <Text style={styles.section}>Montant (FCFA)</Text>
        <View style={styles.input}>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numeric"
            style={[styles.inputText, { fontSize: 24, fontWeight: 'bold' }]}
          />
          <Text style={{ color: Colors.textSecondary }}>FCFA</Text>
        </View>

        <TouchableOpacity
          style={[styles.cta, (!provider || !account || !amount || loading) && { opacity: 0.5 }]}
          onPress={handlePay}
          disabled={!provider || !account || !amount || loading}
        >
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.ctaText}>Payer maintenant</Text>}
        </TouchableOpacity>

        {history.length > 0 && (
          <>
            <Text style={[styles.section, { marginTop: Spacing.xxl }]}>Historique</Text>
            {history.slice(0, 8).map((h: any) => (
              <View key={h.id} style={styles.histItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.histProvider}>{h.provider}</Text>
                  <Text style={styles.histMeta}>{h.bill_type} • {h.status}</Text>
                </View>
                <Text style={styles.histAmount}>{Number(h.amount).toLocaleString()} FCFA</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  section: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md, marginTop: Spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tile: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  tileSel: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tileLabel: { color: Colors.text, fontSize: FontSizes.sm, flex: 1 },
  input: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm },
  inputText: { flex: 1, color: Colors.text, fontSize: FontSizes.lg, paddingVertical: Spacing.md },
  cta: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: 'center', marginTop: Spacing.xxl },
  ctaText: { color: '#FFF', fontSize: FontSizes.lg, fontWeight: 'bold' },
  histItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  histProvider: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '500' },
  histMeta: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  histAmount: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold' },
});
