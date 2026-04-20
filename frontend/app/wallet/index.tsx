import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { WalletSkeleton } from '../../src/components/SkeletonScreens';
import apiClient from '../../src/api/client';
import { getCoinsBalance } from '../../src/services/mobileApiService';

const QUICK_ACTIONS = [
  { id: 'send', name: 'Envoyer', icon: 'send', color: Colors.primary },
  { id: 'receive', name: 'Recevoir', icon: 'download', color: Colors.success },
  { id: 'topup', name: 'Recharger', icon: 'add-circle', color: Colors.info },
  { id: 'withdraw', name: 'Retirer', icon: 'cash', color: Colors.accent },
  { id: 'coins', name: 'Coins', icon: 'diamond', color: '#FFD700' },
];

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const [showBalance, setShowBalance] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);
  const [coinsBalance, setCoinsBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadWallet = useCallback(async () => {
    setLoadError(null);
    try {
      const [walletRes, txRes, coinsRes] = await Promise.all([
        apiClient.get('/payments/wallet'),
        apiClient.get('/payments/transactions', { params: { page: 1, limit: 30 } }),
        getCoinsBalance().catch(() => ({ coins_balance: 0 })),
      ]);
      const walletPayload = walletRes.data?.data ?? walletRes.data;
      const bal = (walletPayload as any)?.balance ?? (walletPayload as any)?.available_balance ?? 0;
      setBalance(typeof bal === 'number' ? bal : parseFloat(String(bal)) || 0);
      setCoinsBalance(Number(coinsRes.coins_balance || 0));
      const txData = txRes.data?.data ?? txRes.data;
      const txList = (txData as any)?.transactions ?? [];
      if (Array.isArray(txList) && txList.length > 0) {
        const transformed = txList.map((t: any) => ({
          id: t.id,
          type: t.type === 'deposit' ? 'received' : t.type === 'withdrawal' ? 'sent' : t.type,
          name: t.description || t.provider || 'Transaction',
          amount: t.amount || 0,
          date: formatDate(t.created_at),
          icon: t.type === 'deposit' ? 'arrow-down' : 'arrow-up',
        }));
        setTransactions(transformed);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      // NE JAMAIS afficher de solde fictif sur un écran financier : l'utilisateur pourrait
      // croire avoir de l'argent qu'il n'a pas. On affiche un état d'erreur explicite.
      console.error('[wallet] failed to load wallet', err);
      setBalance(null);
      setCoinsBalance(0);
      setTransactions([]);
      setLoadError(
        err instanceof Error && err.message
          ? err.message
          : 'Impossible de charger votre portefeuille. Vérifiez votre connexion et réessayez.'
      );
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

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
  }, [loadWallet]);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <WalletSkeleton />
      </View>
    );
  }

  if (loadError !== null && balance === null) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Portefeuille</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color={Colors.textSecondary} />
          <Text style={styles.errorTitle}>Portefeuille indisponible</Text>
          <Text style={styles.errorMessage}>{loadError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setIsLoading(true);
              void loadWallet();
            }}
          >
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const displayBalance = balance ?? 0;

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
            {showBalance ? `${displayBalance.toLocaleString()} FCFA` : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
          </Text>
          <View style={styles.balanceMeta}>
            <View style={styles.balanceMetaItem}>
              <Ionicons name="trending-up" size={14} color={Colors.success} />
              <Text style={styles.balanceMetaText}>+15 000 FCFA ce mois</Text>
            </View>
          </View>
          <View style={styles.coinsMetaRow}>
            <View style={styles.coinsMetaBadge}>
              <Ionicons name="diamond" size={14} color="#FFD700" />
              <Text style={styles.coinsMetaText}>
                {showBalance ? `${coinsBalance.toLocaleString()} coins` : '•••• coins'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/wallet/coins' as any)}>
              <Text style={styles.coinsMetaLink}>Acheter des coins</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              testID={action.id === 'topup' ? 'wallet-open-recharge' : undefined}
              style={styles.quickAction}
              onPress={() => {
              if (action.id === 'topup') router.push('/wallet/recharge');
              if (action.id === 'send') router.push('/wallet/transfer');
              if (action.id === 'receive') Alert.alert('Recevoir', 'Partagez votre numéro pour recevoir un paiement');
              if (action.id === 'withdraw') router.push('/creator/withdraw');
              if (action.id === 'coins') router.push('/wallet/coins' as any);
            }}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
                <Ionicons name={action.icon as any} size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionText}>{action.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.coinsBanner} onPress={() => router.push('/wallet/coins' as any)}>
          <View style={styles.coinsBannerLeft}>
            <View style={styles.coinsIconWrap}>
              <Ionicons name="diamond" size={22} color="#FFD700" />
            </View>
            <View>
              <Text style={styles.coinsTitle}>Coins AfriWonder</Text>
              <Text style={styles.coinsSubtitle}>Achetez des coins pour envoyer des cadeaux en live</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>

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
  coinsMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  coinsMetaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  coinsMetaText: {
    color: '#FFD700',
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
  coinsMetaLink: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: FontSizes.xs,
    textDecorationLine: 'underline',
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
  coinsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.25)',
  },
  coinsBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  coinsIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,215,0,0.12)',
  },
  coinsTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  coinsSubtitle: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: 2 },
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  errorTitle: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    marginTop: Spacing.md,
  },
  errorMessage: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
});
