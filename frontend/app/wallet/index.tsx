import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { WalletSkeleton } from '../../src/components/SkeletonScreens';

const { width } = Dimensions.get('window');

const TRANSACTIONS = [
  { id: 't1', type: 'received', name: 'Aminata Diallo', amount: 15000, date: 'Aujourd\'hui, 14:30', icon: 'arrow-down' },
  { id: 't2', type: 'sent', name: 'Chez Fatoumata', amount: 3500, date: 'Aujourd\'hui, 12:15', icon: 'arrow-up' },
  { id: 't3', type: 'received', name: 'Paiement video', amount: 5000, date: 'Hier, 18:45', icon: 'arrow-down' },
  { id: 't4', type: 'sent', name: 'Transport', amount: 1500, date: 'Hier, 09:00', icon: 'arrow-up' },
  { id: 't5', type: 'received', name: 'Vente produit', amount: 25000, date: '22 Jun, 16:20', icon: 'arrow-down' },
  { id: 't6', type: 'sent', name: 'Recharge Orange', amount: 2000, date: '21 Jun, 11:00', icon: 'arrow-up' },
];

const QUICK_ACTIONS = [
  { id: 'send', name: 'Envoyer', icon: 'send', color: Colors.primary },
  { id: 'receive', name: 'Recevoir', icon: 'download', color: Colors.success },
  { id: 'topup', name: 'Recharger', icon: 'add-circle', color: Colors.info },
  { id: 'withdraw', name: 'Retirer', icon: 'cash', color: Colors.accent },
];

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const [showBalance, setShowBalance] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  const balance = 127500;

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <WalletSkeleton />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Portefeuille</Text>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Solde disponible</Text>
            <TouchableOpacity onPress={() => setShowBalance(!showBalance)}>
              <Ionicons name={showBalance ? 'eye' : 'eye-off'} size={20} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
          <Text style={styles.balanceAmount}>
            {showBalance ? `${balance.toLocaleString()} FCFA` : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
          </Text>
          <View style={styles.balanceMeta}>
            <View style={styles.balanceMetaItem}>
              <Ionicons name="trending-up" size={14} color={Colors.success} />
              <Text style={styles.balanceMetaText}>+15 000 FCFA ce mois</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity key={action.id} style={styles.quickAction} onPress={() => {
              if (action.id === 'topup') router.push('/wallet/recharge');
            }}>
              <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
                <Ionicons name={action.icon as any} size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionText}>{action.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Microcredit Section */}
        <TouchableOpacity style={styles.microcreditBanner} onPress={() => router.push('/wallet/microcredit')}>
          <View style={styles.microcreditContent}>
            <Text style={styles.microcreditTitle}>Microcredit</Text>
            <Text style={styles.microcreditSubtitle}>Empruntez jusqu'a 100 000 FCFA</Text>
            <Text style={styles.microcreditRate}>Taux: 2% / mois</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={Colors.text} />
        </TouchableOpacity>

        {/* Transactions */}
        <View style={styles.transactionsHeader}>
          <Text style={styles.sectionTitle}>Transactions</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        {TRANSACTIONS.map((tx) => (
          <TouchableOpacity key={tx.id} style={styles.transactionItem}>
            <View style={[
              styles.txIcon,
              { backgroundColor: tx.type === 'received' ? Colors.success + '20' : Colors.error + '20' }
            ]}>
              <Ionicons
                name={tx.icon as any}
                size={20}
                color={tx.type === 'received' ? Colors.success : Colors.error}
              />
            </View>
            <View style={styles.txInfo}>
              <Text style={styles.txName}>{tx.name}</Text>
              <Text style={styles.txDate}>{tx.date}</Text>
            </View>
            <Text style={[
              styles.txAmount,
              { color: tx.type === 'received' ? Colors.success : Colors.error }
            ]}>
              {tx.type === 'received' ? '+' : '-'}{tx.amount.toLocaleString()} FCFA
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  balanceCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    marginBottom: Spacing.xxl,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSizes.md,
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  balanceMeta: {
    flexDirection: 'row',
  },
  balanceMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  balanceMetaText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSizes.sm,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xxl,
  },
  quickAction: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  microcreditBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
  },
  microcreditContent: {
    flex: 1,
  },
  microcreditTitle: {
    color: Colors.accent,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  microcreditSubtitle: {
    color: Colors.text,
    fontSize: FontSizes.md,
  },
  microcreditRate: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  seeAll: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    fontWeight: '500',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: {
    flex: 1,
  },
  txName: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '500',
  },
  txDate: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
  },
  txAmount: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
});
