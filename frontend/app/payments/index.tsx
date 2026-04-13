import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';

const QUICK_AMOUNTS = [5000, 10_000, 25_000, 50_000];

export default function MobilePaymentsHubScreen() {
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('10000');

  const amountNum = Math.max(0, Math.round(parseFloat(amount.replace(/\s/g, '').replace(',', '.')) || 0));
  const amountStr = String(amountNum || 0);

  const goOrange = () => {
    router.push({ pathname: '/checkout/orange-money', params: { amount: amountStr } } as never);
  };

  const goWave = () => {
    router.push({ pathname: '/checkout/wave', params: { amount: amountStr } } as never);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paiements Orange Money / Wave</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.subtitle}>Choisissez un montant puis le canal de paiement sécurisé (simulation ou flux réel selon configuration backend).</Text>

        <Text style={styles.label}>Montant (FCFA)</Text>
        <TextInput
          style={styles.input}
          placeholder="10000"
          placeholderTextColor={Colors.textMuted}
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
        <View style={styles.chips}>
          {QUICK_AMOUNTS.map((a) => (
            <TouchableOpacity key={a} style={[styles.chip, amountNum === a && styles.chipActive]} onPress={() => setAmount(String(a))}>
              <Text style={[styles.chipText, amountNum === a && styles.chipTextActive]}>{a.toLocaleString('fr-FR')}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.cardOm} onPress={goOrange} activeOpacity={0.9}>
          <LinearGradient colors={['#FF8C00', '#FF6600']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <Ionicons name="phone-portrait" size={32} color="#FFF" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.cardTitle}>Orange Money</Text>
            <Text style={styles.cardHint}>Payer {amountNum.toLocaleString('fr-FR')} FCFA</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.cardWave} onPress={goWave} activeOpacity={0.9}>
          <LinearGradient colors={['#1DC3E2', '#0891B2']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <Ionicons name="water" size={32} color="#FFF" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.cardTitle}>Wave</Text>
            <Text style={styles.cardHint}>Payer {amountNum.toLocaleString('fr-FR')} FCFA</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.textMuted} />
          <Text style={styles.noticeText}>
            Pour un panier marketplace ou un dépôt wallet, utilisez aussi l’écran checkout depuis le flux d’achat.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: FontSizes.lg, fontWeight: '800', color: Colors.text },
  content: { padding: Spacing.xl, paddingBottom: 40 },
  subtitle: { color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 20, marginBottom: Spacing.xl },
  label: { color: Colors.text, fontWeight: '600', marginBottom: Spacing.sm, fontSize: FontSizes.md },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.xl },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: 'rgba(255,107,0,0.15)' },
  chipText: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: '600' },
  chipTextActive: { color: Colors.primary },
  cardOm: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  cardWave: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  cardTitle: { color: '#FFF', fontSize: FontSizes.xl, fontWeight: '800' },
  cardHint: { color: 'rgba(255,255,255,0.9)', fontSize: FontSizes.sm, marginTop: 4 },
  notice: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  noticeText: { flex: 1, color: Colors.textMuted, fontSize: FontSizes.sm, lineHeight: 18 },
});
