/**
 * Écran Recharge crédit téléphone (Airtime).
 * Branché sur POST /api/proxy/airtime/recharge — tous les opérateurs Mali/UEMOA.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import apiClient from '../src/api/client';

const OPERATORS: { id: string; name: string; color: string }[] = [
  { id: 'orange', name: 'Orange Mali', color: '#FF6B00' },
  { id: 'moov', name: 'Moov Africa', color: '#0066CC' },
  { id: 'malitel', name: 'Malitel', color: '#00A651' },
];

const AMOUNTS = [500, 1000, 2000, 5000, 10000, 25000];

export default function AirtimeScreen() {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [operator, setOperator] = useState<string>('orange');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await apiClient.get('/airtime/recharges?limit=5');
        const list = res.data?.data?.recharges || res.data?.data || [];
        setHistory(Array.isArray(list) ? list.slice(0, 5) : []);
      } catch {
        /* historique optionnel */
      }
    })();
  }, []);

  const handleRecharge = async () => {
    const num = parseFloat(amount);
    if (!phone.trim() || !num || num < 100) {
      Alert.alert('Erreur', 'Numéro et montant (≥ 100 FCFA) requis');
      return;
    }
    Alert.alert(
      'Confirmer la recharge',
      `${num.toLocaleString()} FCFA sur ${phone} (${OPERATORS.find((o) => o.id === operator)?.name})`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setLoading(true);
            try {
              await apiClient.post('/airtime/recharge', {
                phone_number: phone.trim(),
                operator,
                amount: num,
                payment_method: 'wallet',
                is_self_recharge: true,
              });
              Alert.alert('Recharge initiée ✅', 'Vous recevrez une confirmation rapidement.', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (err: any) {
              Alert.alert('Erreur', err?.response?.data?.message || 'Recharge échouée');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
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
        <Text style={styles.headerTitle}>Recharge crédit</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>Opérateur</Text>
        <View style={styles.row}>
          {OPERATORS.map((op) => (
            <TouchableOpacity
              key={op.id}
              onPress={() => setOperator(op.id)}
              style={[styles.opChip, operator === op.id && { borderColor: op.color, borderWidth: 2 }]}
            >
              <View style={[styles.opDot, { backgroundColor: op.color }]} />
              <Text style={styles.opLabel}>{op.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.section}>Numéro à recharger</Text>
        <View style={styles.input}>
          <Ionicons name="call" size={20} color={Colors.textSecondary} />
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Ex: 70 12 34 56"
            placeholderTextColor={Colors.textMuted}
            keyboardType="phone-pad"
            style={styles.inputText}
          />
        </View>

        <Text style={styles.section}>Montant</Text>
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
        <View style={styles.amounts}>
          {AMOUNTS.map((a) => (
            <TouchableOpacity
              key={a}
              onPress={() => setAmount(String(a))}
              style={[styles.amount, amount === String(a) && styles.amountSel]}
            >
              <Text style={[styles.amountText, amount === String(a) && { color: '#FFF' }]}>
                {a.toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.cta, (!amount || !phone || loading) && { opacity: 0.5 }]}
          onPress={handleRecharge}
          disabled={!amount || !phone || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="flash" size={20} color="#FFF" />
              <Text style={styles.ctaText}>Recharger</Text>
            </>
          )}
        </TouchableOpacity>

        {history.length > 0 && (
          <>
            <Text style={[styles.section, { marginTop: Spacing.xxl }]}>Historique récent</Text>
            {history.map((h: any) => (
              <View key={h.id} style={styles.histItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.histPhone}>{h.phone_number}</Text>
                  <Text style={styles.histMeta}>{h.operator?.toUpperCase?.() || ''} • {h.status}</Text>
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
  row: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  opChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  opDot: { width: 12, height: 12, borderRadius: 6 },
  opLabel: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '500' },
  input: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm },
  inputText: { flex: 1, color: Colors.text, fontSize: FontSizes.lg, paddingVertical: Spacing.md },
  amounts: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  amount: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  amountSel: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  amountText: { color: Colors.textSecondary, fontSize: FontSizes.md },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.lg, marginTop: Spacing.xxl, gap: Spacing.sm },
  ctaText: { color: '#FFF', fontSize: FontSizes.lg, fontWeight: 'bold' },
  histItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  histPhone: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '500' },
  histMeta: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  histAmount: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold' },
});
