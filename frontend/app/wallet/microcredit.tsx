import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const LOAN_TIERS = [
  { id: '1', amount: 10000, duration: '1 mois', rate: '2%', monthly: 10200 },
  { id: '2', amount: 25000, duration: '2 mois', rate: '2%', monthly: 12750 },
  { id: '3', amount: 50000, duration: '3 mois', rate: '1.5%', monthly: 17500 },
  { id: '4', amount: 100000, duration: '6 mois', rate: '1.5%', monthly: 17500 },
];

const HISTORY = [
  { id: 'l1', amount: 25000, status: 'Rembourse', date: 'Mai 2025', color: Colors.success },
  { id: 'l2', amount: 10000, status: 'Rembourse', date: 'Avril 2025', color: Colors.success },
];

export default function MicrocreditScreen() {
  const insets = useSafeAreaInsets();
  const [selectedTier, setSelectedTier] = useState('2');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Microcredit</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreNumber}>750</Text>
          </View>
          <View style={styles.scoreInfo}>
            <Text style={styles.scoreLabel}>Score de credit</Text>
            <Text style={styles.scoreStatus}>Excellent</Text>
            <Text style={styles.scoreDetail}>Eligible jusqu'a 100 000 FCFA</Text>
          </View>
        </View>

        {/* Loan Tiers */}
        <Text style={styles.sectionTitle}>Choisir un montant</Text>
        {LOAN_TIERS.map((tier) => (
          <TouchableOpacity
            key={tier.id}
            style={[styles.tierCard, selectedTier === tier.id && styles.tierCardSelected]}
            onPress={() => setSelectedTier(tier.id)}
          >
            <View style={styles.tierMain}>
              <Text style={styles.tierAmount}>{tier.amount.toLocaleString()} FCFA</Text>
              <Text style={styles.tierDuration}>{tier.duration} - Taux: {tier.rate}/mois</Text>
            </View>
            <View style={styles.tierRight}>
              <Text style={styles.tierMonthly}>{tier.monthly.toLocaleString()}</Text>
              <Text style={styles.tierMonthlyLabel}>FCFA/mois</Text>
            </View>
            <View style={[styles.radio, selectedTier === tier.id && styles.radioSelected]}>
              {selectedTier === tier.id && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.requestButton}>
          <Text style={styles.requestButtonText}>Demander un pret</Text>
        </TouchableOpacity>

        {/* History */}
        <Text style={styles.sectionTitle}>Historique</Text>
        {HISTORY.map((loan) => (
          <View key={loan.id} style={styles.historyItem}>
            <View style={styles.historyInfo}>
              <Text style={styles.historyAmount}>{loan.amount.toLocaleString()} FCFA</Text>
              <Text style={styles.historyDate}>{loan.date}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: loan.color + '20' }]}>
              <Text style={[styles.statusText, { color: loan.color }]}>{loan.status}</Text>
            </View>
          </View>
        ))}
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
  scoreCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, marginBottom: Spacing.xxl, gap: Spacing.lg },
  scoreCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: Colors.success, alignItems: 'center', justifyContent: 'center' },
  scoreNumber: { color: Colors.success, fontSize: FontSizes.xxl, fontWeight: 'bold' },
  scoreInfo: { flex: 1 },
  scoreLabel: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  scoreStatus: { color: Colors.success, fontSize: FontSizes.lg, fontWeight: 'bold' },
  scoreDetail: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md },
  tierCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  tierCardSelected: { borderColor: Colors.primary },
  tierMain: { flex: 1 },
  tierAmount: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold' },
  tierDuration: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  tierRight: { alignItems: 'flex-end', marginRight: Spacing.md },
  tierMonthly: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: 'bold' },
  tierMonthlyLabel: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: Colors.primary },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },
  requestButton: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: 'center', marginVertical: Spacing.xxl },
  requestButtonText: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold' },
  historyItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.sm },
  historyInfo: {},
  historyAmount: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  historyDate: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  statusBadge: { paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: BorderRadius.sm },
  statusText: { fontSize: FontSizes.sm, fontWeight: '600' },
});
