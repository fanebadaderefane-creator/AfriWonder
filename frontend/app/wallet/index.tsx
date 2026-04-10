import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl, Alert } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { WalletSkeleton } from '../../src/components/SkeletonScreens';
import mobileApiClient from '../../src/api/mobileClient';

const { width } = Dimensions.get('window');

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
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadWallet(); }, []);

  const loadWallet = async () => {
    try {
      const response = await mobileApiClient.get('/mobile/wallet');
      const data = response.data?.data || response.data;
      if (data?.wallet) {
        setBalance(data.wallet.balance || 0);
      }
      if (data?.transactions?.length > 0) {
        const transformed = data.transactions.map((t: any) => ({
          id: t.id,
          type: t.type === 'topup' ? 'received' : (t.type === 'transfer' ? 'sent' : t.type),
          name: t.description || t.provider || 'Transaction',
          amount: t.amount || 0,
          date: formatDate(t.created_at),
          icon: t.type === 'topup' ? 'arrow-down' : 'arrow-up',
        }));
        setTransactions(transformed);
      }
    } catch (err) {
      console.log('Using mock wallet data', err);
      setBalance(127500);
    } finally { setIsLoading(false); }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffH = Math.floor((now.getTime() - date.getTime()) / 3600000);
    if (diffH < 24) return `Aujourd'hui, ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    if (diffH < 48) return `Hier, ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    return `${date.getDate()} ${['Jan','Fev','Mar','Avr','Mai','Jun','Jul','Aou','Sep','Oct','Nov','Dec'][date.getMonth()]}`;
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadWallet().finally(() => setRefreshing(false));
  }, []);

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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
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
              if (action.id === 'send') router.push('/wallet/transfer');
              if (action.id === 'receive') Alert.alert('Recevoir', 'Partagez votre numéro pour recevoir un paiement');
              if (action.id === 'withdraw') Alert.alert('Retrait', 'Fonctionnalité de retrait bientôt disponible');
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

        {transactions.map((tx) => (
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
