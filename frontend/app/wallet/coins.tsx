import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import {
  claimDailyCoinsMission,
  confirmCoinsPurchase,
  creditIapCoinPurchase,
  getCoinPackages,
  getCoinsBalance,
  getCoinsHistory,
  getCoinsPurchaseStatus,
  initiateCoinsPurchase,
} from '../../src/services/mobileApiService';
import apiClient from '../../src/api/client';
import { getAlertMessageForCaughtError } from '../../src/utils/userFacingError';

const DEFAULT_COIN_PACKS = [
  { id: 'coins-100', coins: 100, priceFcfa: 500, bonusCoins: 0, popular: false },
  { id: 'coins-500', coins: 500, priceFcfa: 2500, bonusCoins: 25, popular: true },
  { id: 'coins-1000', coins: 1000, priceFcfa: 5000, bonusCoins: 75, popular: false },
  { id: 'coins-5000', coins: 5000, priceFcfa: 25000, bonusCoins: 500, popular: false },
];

const PAYMENT_METHODS = [
  { id: 'orange', label: 'Orange Money', route: '/checkout/orange-money' as const, color: '#FF6600' },
  { id: 'wave', label: 'Wave', route: '/checkout/wave' as const, color: '#1DC3E2' },
];

export default function CoinsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ referenceId?: string; presetAmount?: string }>();
  const [packages, setPackages] = useState(DEFAULT_COIN_PACKS);
  const [coinsBalance, setCoinsBalance] = useState(0);
  const [selectedPackId, setSelectedPackId] = useState(DEFAULT_COIN_PACKS[1].id);
  const [selectedMethodId, setSelectedMethodId] = useState(PAYMENT_METHODS[0].id);
  const [loading, setLoading] = useState(false);
  const [screenLoading, setScreenLoading] = useState(true);
  const [missionBusy, setMissionBusy] = useState(false);
  const [iapBusy, setIapBusy] = useState(false);
  const [history, setHistory] = useState<{
    purchases?: any[];
    sent_live_gifts?: any[];
  }>({});
  const [economyUsdPer100, setEconomyUsdPer100] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [balanceData, packageData] = await Promise.all([
          getCoinsBalance().catch(() => ({ coins_balance: 0 })),
          getCoinPackages().catch(() => ({ packages: DEFAULT_COIN_PACKS.map((p) => ({ id: p.id, name: p.id, coins_amount: p.coins, price_fcfa: p.priceFcfa, bonus_coins: p.bonusCoins, is_popular: p.popular })) })),
        ]);
        setCoinsBalance(Number(balanceData.coins_balance || 0));
        const historyData = await getCoinsHistory().catch(() => ({}));
        setHistory(historyData);
        try {
          const ec = await apiClient.get('/coins/economy');
          const ed = ec.data?.data ?? ec.data;
          const u = Number((ed as { usd_per_100_coins_payout?: unknown })?.usd_per_100_coins_payout);
          setEconomyUsdPer100(Number.isFinite(u) ? u : null);
        } catch {
          setEconomyUsdPer100(null);
        }
        const mapped = packageData.packages.map((pkg) => ({
          id: pkg.id,
          coins: pkg.coins_amount,
          priceFcfa: pkg.price_fcfa,
          bonusCoins: pkg.bonus_coins,
          popular: pkg.is_popular,
        }));
        if (mapped.length > 0) {
          setPackages(mapped);
          setSelectedPackId(mapped[0].id);
        }
      } finally {
        setScreenLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const presetAmount = typeof params.presetAmount === 'string'
      ? Number(params.presetAmount)
      : Array.isArray(params.presetAmount)
        ? Number(params.presetAmount[0])
        : NaN;
    if (!Number.isFinite(presetAmount)) return;
    const matched = packages.find((pack) => pack.priceFcfa === presetAmount);
    if (matched) setSelectedPackId(matched.id);
  }, [packages, params.presetAmount]);

  useEffect(() => {
    const referenceId = typeof params.referenceId === 'string' ? params.referenceId : Array.isArray(params.referenceId) ? params.referenceId[0] : '';
    if (!referenceId) return;
    void (async () => {
      try {
        const status = await getCoinsPurchaseStatus(referenceId);
        if (status?.status === 'completed') {
          const confirmed = await confirmCoinsPurchase(referenceId);
          setCoinsBalance(Number(confirmed?.coins_balance || 0));
          Alert.alert('Coins', `Achat confirmé. Nouveau solde : ${Number(confirmed?.coins_balance || 0).toLocaleString('fr-FR')} coins.`);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [params.referenceId]);

  const selectedPack = useMemo(
    () => packages.find((pack) => pack.id === selectedPackId) || packages[0],
    [packages, selectedPackId]
  );

  const selectedMethod = useMemo(
    () => PAYMENT_METHODS.find((method) => method.id === selectedMethodId) || PAYMENT_METHODS[0],
    [selectedMethodId]
  );

  const handleBuy = async () => {
    setLoading(true);
    try {
      const paymentMethod = selectedMethod.id === 'wave' ? 'wave' : 'orange_money';
      const data = await initiateCoinsPurchase({
        packageId: selectedPack.id,
        payment_method: paymentMethod,
        returnUrl: 'https://afriwonder.com/coins/complete',
      });
      const ref = String(data?.reference_id || '');
      const deepRoute = {
        pathname: selectedMethod.route,
        params: {
          amount: String(selectedPack.priceFcfa),
          orderId: ref || `coins-${selectedPack.id}`,
          returnUrl: `https://afriwonder.com/coins/complete?referenceId=${encodeURIComponent(ref)}`,
        },
      } as never;
      router.push(deepRoute);
    } catch (error: unknown) {
      Alert.alert('Coins', getAlertMessageForCaughtError(error));
    } finally {
      setLoading(false);
    }
  };

  const totalCoins = selectedPack.coins + selectedPack.bonusCoins;

  const handleDailyMission = async () => {
    setMissionBusy(true);
    try {
      const d = await claimDailyCoinsMission();
      const bal = Number(d.coins_balance ?? 0);
      if (Number.isFinite(bal)) setCoinsBalance(bal);
      Alert.alert(
        'Mission quotidienne',
        typeof d.coins_granted === 'number'
          ? `+${d.coins_granted.toLocaleString('fr-FR')} coins. Solde : ${bal.toLocaleString('fr-FR')}.`
          : 'Réclamé.',
      );
    } catch (error: unknown) {
      Alert.alert('Mission', getAlertMessageForCaughtError(error));
    } finally {
      setMissionBusy(false);
    }
  };

  const handleDevIapCredit = async () => {
    setIapBusy(true);
    try {
      const d = await creditIapCoinPurchase({
        transaction_id: `dev-${Platform.OS}-${Date.now()}`,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        package_id: selectedPack.id,
      });
      const bal = Number(d.coins_balance ?? 0);
      if (Number.isFinite(bal)) setCoinsBalance(bal);
      Alert.alert(
        'IAP (test)',
        d.already_credited
          ? 'Cette transaction était déjà créditée.'
          : `+${Number(d.coins_credited ?? 0).toLocaleString('fr-FR')} coins. Solde : ${bal.toLocaleString('fr-FR')}.`,
      );
    } catch (error: unknown) {
      Alert.alert('IAP', getAlertMessageForCaughtError(error));
    } finally {
      setIapBusy(false);
    }
  };

  if (screenLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Acheter des Coins</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Ionicons name="diamond" size={30} color="#FFD700" />
          <Text style={styles.heroTitle}>Coins AfriWonder</Text>
          <Text style={styles.heroSubtitle}>Envoyez des cadeaux en live et soutenez vos créateurs préférés.</Text>
          <Text style={styles.heroBalance}>{coinsBalance.toLocaleString('fr-FR')} coins disponibles</Text>
          {economyUsdPer100 != null ? (
            <Text style={styles.heroEconomy}>
              Indicatif payout (config serveur) : ~{economyUsdPer100.toFixed(2)} USD pour 100 coins
            </Text>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Récompenses & IAP</Text>
        <View style={styles.extrasRow}>
          <TouchableOpacity
            style={[styles.extrasBtn, missionBusy && { opacity: 0.6 }]}
            onPress={() => void handleDailyMission()}
            disabled={missionBusy}
          >
            {missionBusy ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.extrasBtnText}>Mission coins (1× / jour UTC)</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.extrasBtnSecondary, iapBusy && { opacity: 0.6 }]}
            onPress={() => void handleDevIapCredit()}
            disabled={iapBusy}
          >
            {iapBusy ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <Text style={styles.extrasBtnSecondaryText}>Crédit IAP test (pack sélectionné)</Text>
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.extrasHint}>
          L’IAP test utilise un identifiant unique ; en production, validez les reçus Apple / Google côté serveur avant crédit.
        </Text>

        <Text style={styles.sectionTitle}>Choisir un pack</Text>
        {packages.map((pack) => {
          const selected = selectedPackId === pack.id;
          return (
            <TouchableOpacity
              key={pack.id}
              style={[styles.packCard, selected && styles.packCardSelected]}
              onPress={() => setSelectedPackId(pack.id)}
            >
              <View style={styles.packLeft}>
                <View style={styles.packIconWrap}>
                  <Ionicons name="logo-bitcoin" size={22} color="#FFD700" />
                </View>
                <View>
                  <Text style={styles.packCoins}>{pack.coins.toLocaleString('fr-FR')} coins</Text>
                  <Text style={styles.packPrice}>{pack.priceFcfa.toLocaleString('fr-FR')} FCFA</Text>
                </View>
              </View>
              <View style={styles.packRight}>
                {pack.bonusCoins > 0 ? (
                  <Text style={styles.packBonus}>+{pack.bonusCoins} bonus</Text>
                ) : null}
                {pack.popular ? <Text style={styles.packPopular}>Populaire</Text> : null}
              </View>
            </TouchableOpacity>
          );
        })}

        <Text style={styles.sectionTitle}>Méthode de paiement</Text>
        {PAYMENT_METHODS.map((method) => {
          const selected = selectedMethodId === method.id;
          return (
            <TouchableOpacity
              key={method.id}
              style={[styles.methodCard, selected && { borderColor: method.color }]}
              onPress={() => setSelectedMethodId(method.id)}
            >
              <View style={[styles.methodBadge, { backgroundColor: `${method.color}20` }]}>
                <Ionicons name={method.id === 'wave' ? 'water' : 'phone-portrait'} size={18} color={method.color} />
              </View>
              <Text style={styles.methodLabel}>{method.label}</Text>
              {selected ? <Ionicons name="checkmark-circle" size={22} color={method.color} /> : null}
            </TouchableOpacity>
          );
        })}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Récapitulatif</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Pack</Text>
            <Text style={styles.summaryValue}>{selectedPack.coins.toLocaleString('fr-FR')} coins</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Bonus</Text>
            <Text style={styles.summaryValue}>+{selectedPack.bonusCoins.toLocaleString('fr-FR')}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total reçu</Text>
            <Text style={styles.summaryValue}>{totalCoins.toLocaleString('fr-FR')} coins</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Montant payé</Text>
            <Text style={[styles.summaryValue, styles.summaryValueStrong]}>{selectedPack.priceFcfa.toLocaleString('fr-FR')} FCFA</Text>
          </View>
        </View>

        <TouchableOpacity style={[styles.buyBtn, loading && { opacity: 0.6 }]} onPress={() => void handleBuy()} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buyBtnText}>Acheter avec {selectedMethod.label}</Text>}
        </TouchableOpacity>

        <View style={styles.noticeCard}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.textSecondary} />
          <Text style={styles.noticeText}>
            Le paiement est initié via le parcours {selectedMethod.label} existant. Le crédit définitif dépend de la confirmation
            du paiement par le backend.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.learnMore}
          onPress={() => Alert.alert('Coins', '1 coin est utilisé pour les cadeaux live. Le prix et la conversion sont affichés avant achat.')}
        >
          <Text style={styles.learnMoreText}>Comment fonctionnent les Coins ?</Text>
        </TouchableOpacity>

        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>Historique récent</Text>
          {(history.purchases || []).slice(0, 3).map((item) => (
            <View key={`purchase-${item.id}`} style={styles.historyRow}>
              <Ionicons name="add-circle-outline" size={18} color={Colors.success} />
              <View style={styles.historyBody}>
                <Text style={styles.historyLabel}>Achat {item.package_id || 'coins'}</Text>
                <Text style={styles.historyMeta}>{item.amount_fcfa?.toLocaleString?.('fr-FR') || item.amount_fcfa} FCFA • {item.status}</Text>
              </View>
            </View>
          ))}
          {(history.sent_live_gifts || []).slice(0, 3).map((item) => (
            <View key={`gift-${item.id}`} style={styles.historyRow}>
              <Ionicons name="gift-outline" size={18} color="#FFD700" />
              <View style={styles.historyBody}>
                <Text style={styles.historyLabel}>{item.gift_name}</Text>
                <Text style={styles.historyMeta}>
                  {item.quantity}× • {item.total_amount_fcfa?.toLocaleString?.('fr-FR') || item.total_amount_fcfa} FCFA
                </Text>
              </View>
            </View>
          ))}
          {(!history.purchases?.length && !history.sent_live_gifts?.length) ? (
            <Text style={styles.historyEmpty}>Aucun achat ou cadeau récent.</Text>
          ) : null}
        </View>
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
  heroCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', gap: 8, marginBottom: Spacing.xl },
  heroTitle: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: '800' },
  heroSubtitle: { color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  heroBalance: { color: '#FFD700', fontWeight: '800', marginTop: 4 },
  heroEconomy: { color: Colors.textSecondary, fontSize: FontSizes.xs, textAlign: 'center', marginTop: 6, lineHeight: 16 },
  extrasRow: { gap: Spacing.sm, marginBottom: Spacing.sm },
  extrasBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  extrasBtnText: { color: '#FFF', fontWeight: '800', fontSize: FontSizes.sm },
  extrasBtnSecondary: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  extrasBtnSecondaryText: { color: Colors.primary, fontWeight: '700', fontSize: FontSizes.sm, textAlign: 'center' },
  extrasHint: { color: Colors.textMuted, fontSize: FontSizes.xs, lineHeight: 16, marginBottom: Spacing.lg },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '700', marginBottom: Spacing.md },
  packCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  packCardSelected: { borderColor: Colors.primary },
  packLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  packIconWrap: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,215,0,0.12)', alignItems: 'center', justifyContent: 'center' },
  packCoins: { color: Colors.text, fontWeight: '700', fontSize: FontSizes.md },
  packPrice: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  packRight: { alignItems: 'flex-end', gap: 4 },
  packBonus: { color: Colors.success, fontSize: FontSizes.sm, fontWeight: '700' },
  packPopular: { color: Colors.primary, fontSize: FontSizes.xs, fontWeight: '700' },
  methodCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, gap: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm },
  methodBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  methodLabel: { flex: 1, color: Colors.text, fontSize: FontSizes.md, fontWeight: '500' },
  summaryCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginTop: Spacing.lg, gap: 8 },
  summaryTitle: { color: Colors.text, fontWeight: '700', fontSize: FontSizes.md, marginBottom: 6 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { color: Colors.textSecondary },
  summaryValue: { color: Colors.text },
  summaryValueStrong: { color: Colors.primary, fontWeight: '800' },
  buyBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: 'center', marginTop: Spacing.xl },
  buyBtnText: { color: '#FFF', fontWeight: '800', fontSize: FontSizes.md },
  noticeCard: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  noticeText: { flex: 1, color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 18 },
  learnMore: { alignSelf: 'center', marginTop: Spacing.lg },
  learnMoreText: { color: Colors.textSecondary, textDecorationLine: 'underline' },
  historyCard: { marginTop: Spacing.xl, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, gap: 10 },
  historyTitle: { color: Colors.text, fontWeight: '700', fontSize: FontSizes.md },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyBody: { flex: 1 },
  historyLabel: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '600' },
  historyMeta: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: 2 },
  historyEmpty: { color: Colors.textMuted, fontSize: FontSizes.sm },
});
