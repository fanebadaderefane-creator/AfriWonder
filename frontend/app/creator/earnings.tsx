import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '../../src/api/client';

const formatMoney = (n: number) => n.toLocaleString('fr-FR') + ' FCFA';

export default function CreatorEarningsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [earnings, setEarnings] = useState<any>(null);

  const loadEarnings = async () => {
    try {
      const [dashRes, wdRes] = await Promise.all([
        apiClient.get('/creator-dashboard'),
        apiClient.get('/withdrawals', { params: { page: 1, limit: 100 } }).catch(() => ({ data: {} })),
      ]);
      const d = dashRes.data?.data || dashRes.data;
      const rev = d?.revenues || {};
      const wdData = wdRes.data?.data || wdRes.data;
      const wdList = wdData?.withdrawals || wdData?.items || [];
      const totalWithdrawn = Array.isArray(wdList)
        ? wdList.filter((w: any) => String(w.status || '').toLowerCase() === 'completed' || String(w.status || '').toLowerCase() === 'paid')
          .reduce((s: number, w: any) => s + (Number(w.amount) || 0), 0)
        : 0;
      const total = Number(rev.total_fcfa) || 0;
      const tips = Number(rev.donations_fcfa) || 0;
      const liveGifts = Number(rev.live_gifts_fcfa) || 0;
      const liveTips = Number(rev.live_tips_fcfa) || 0;
      setEarnings({
        total_earned: total,
        available_balance: Math.max(0, total - totalWithdrawn),
        total_withdrawn: totalWithdrawn,
        total_tips: tips,
        total_live_gifts: liveGifts,
        total_live_tips: liveTips,
        monthly_earned: Number(rev.video_fcfa) || 0,
        monthly_tips: tips,
        recent_tips: d?.recent_live_tips || [],
        recent_gifts: d?.recent_live_gifts || [],
      });
    } catch (_e) {
      setEarnings({ total_earned: 0, available_balance: 0, total_withdrawn: 0, total_tips: 0, total_live_gifts: 0, total_live_tips: 0, monthly_earned: 0, monthly_tips: 0, recent_tips: [], recent_gifts: [] });
    } finally { setLoading(false); }
  };

  useEffect(() => { loadEarnings(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); loadEarnings().finally(() => setRefreshing(false)); }, []);

  if (loading) return <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes Revenus</Text>
        <TouchableOpacity onPress={() => router.push('/creator/withdraw' as any)}>
          <Ionicons name="cash-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}>
        {/* Balance Card */}
        <LinearGradient colors={['#FF6B00', '#E91E63']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Solde disponible</Text>
          <Text style={styles.balanceAmount}>{formatMoney(earnings?.available_balance || 0)}</Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatLabel}>Total gagné</Text>
              <Text style={styles.balanceStatValue}>{formatMoney(earnings?.total_earned || 0)}</Text>
            </View>
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatLabel}>Retiré</Text>
              <Text style={styles.balanceStatValue}>{formatMoney(earnings?.total_withdrawn || 0)}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.withdrawBtn} onPress={() => router.push('/creator/withdraw' as any)}>
            <Ionicons name="arrow-down-circle" size={20} color="#FF6B00" />
            <Text style={styles.withdrawBtnText}>Retirer vers Mobile Money</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Monthly Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color="#4ECDC4" />
            <Text style={styles.statValue}>{formatMoney(earnings?.monthly_earned || 0)}</Text>
            <Text style={styles.statLabel}>Ce mois</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="heart" size={24} color="#E91E63" />
            <Text style={styles.statValue}>{earnings?.monthly_tips || 0}</Text>
            <Text style={styles.statLabel}>Pourboires</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="people" size={24} color="#FF6B00" />
            <Text style={styles.statValue}>{earnings?.total_tips || 0}</Text>
            <Text style={styles.statLabel}>Total fans</Text>
          </View>
        </View>

        <View style={styles.liveRevenueCard}>
          <Text style={styles.liveRevenueTitle}>Revenus live</Text>
          <View style={styles.liveRevenueRow}>
            <Text style={styles.liveRevenueLabel}>Cadeaux live</Text>
            <Text style={styles.liveRevenueValue}>{formatMoney(earnings?.total_live_gifts || 0)}</Text>
          </View>
          <View style={styles.liveRevenueRow}>
            <Text style={styles.liveRevenueLabel}>Tips live</Text>
            <Text style={styles.liveRevenueValue}>{formatMoney(earnings?.total_live_tips || 0)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.revenueShareCta}
          onPress={() => router.push('/creator/revenue-share' as any)}
          activeOpacity={0.85}
        >
          <Ionicons name="pie-chart-outline" size={22} color="#1DC3E2" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.revenueShareTitle}>Partage des revenus</Text>
            <Text style={styles.revenueShareSubtitle}>Activer la monétisation et les retraits</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.revenueShareCta}
          onPress={() => router.push('/subscriptions' as never)}
          activeOpacity={0.85}
        >
          <Ionicons name="diamond" size={22} color="#A855F7" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.revenueShareTitle}>Abonnements</Text>
            <Text style={styles.revenueShareSubtitle}>AfriWonder+, fan clubs et abonnements actifs</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Ad Revenue CTA */}
        <TouchableOpacity style={styles.adCta} onPress={() => router.push('/creator/ads' as any)}>
          <LinearGradient colors={['#667eea', '#764ba2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.adCtaGradient}>
            <View>
              <Text style={styles.adCtaTitle}>AfriWonder Ads</Text>
              <Text style={styles.adCtaSubtitle}>Promouvez votre contenu</Text>
            </View>
            <Ionicons name="megaphone" size={28} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Recent Tips */}
        <Text style={styles.sectionTitle}>Pourboires récents</Text>
        {(earnings?.recent_tips || []).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="gift-outline" size={40} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyText}>Aucun pourboire encore</Text>
            <Text style={styles.emptySubtext}>Partagez votre contenu pour recevoir des pourboires</Text>
          </View>
        ) : (
          (earnings?.recent_tips || []).map((tip: any) => (
            <View key={tip.id} style={styles.tipItem}>
              <View style={styles.tipIcon}><Ionicons name="heart" size={18} color="#E91E63" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipAmount}>{formatMoney(tip.creator_amount || 0)}</Text>
                <Text style={styles.tipMeta}>{tip.message || 'Pourboire'} • {new Date(tip.created_at).toLocaleDateString('fr-FR')}</Text>
              </View>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Cadeaux live récents</Text>
        {(earnings?.recent_gifts || []).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="gift-outline" size={40} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyText}>Aucun cadeau live récent</Text>
            <Text style={styles.emptySubtext}>Les revenus des cadeaux live apparaîtront ici.</Text>
          </View>
        ) : (
          (earnings?.recent_gifts || []).map((gift: any) => (
            <View key={gift.id} style={styles.tipItem}>
              <View style={styles.tipIcon}><Ionicons name="gift" size={18} color="#FFD700" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipAmount}>{formatMoney(gift.creator_earnings || 0)}</Text>
                <Text style={styles.tipMeta}>
                  {gift.gift_name || 'Cadeau'} • {gift.quantity}× • {new Date(gift.created_at).toLocaleDateString('fr-FR')}
                </Text>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  balanceCard: { margin: Spacing.xl, borderRadius: BorderRadius.xl, padding: Spacing.xl },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: FontSizes.sm },
  balanceAmount: { color: '#FFF', fontSize: 32, fontWeight: 'bold', marginTop: 4 },
  balanceRow: { flexDirection: 'row', gap: Spacing.xl, marginTop: Spacing.lg },
  balanceStat: {},
  balanceStatLabel: { color: 'rgba(255,255,255,0.6)', fontSize: FontSizes.xs },
  balanceStatValue: { color: '#FFF', fontSize: FontSizes.md, fontWeight: '600' },
  withdrawBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', borderRadius: BorderRadius.md, padding: Spacing.md, marginTop: Spacing.lg, gap: 8 },
  withdrawBtnText: { color: '#FF6B00', fontWeight: 'bold', fontSize: FontSizes.md },
  statsRow: { flexDirection: 'row', paddingHorizontal: Spacing.xl, gap: Spacing.sm, marginBottom: Spacing.lg },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, alignItems: 'center', gap: 4 },
  statValue: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold' },
  statLabel: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  liveRevenueCard: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: 8,
  },
  liveRevenueTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  liveRevenueRow: { flexDirection: 'row', justifyContent: 'space-between' },
  liveRevenueLabel: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  liveRevenueValue: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '700' },
  revenueShareCta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(29,195,226,0.25)',
  },
  revenueShareTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  revenueShareSubtitle: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  adCta: { marginHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  adCtaGradient: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: BorderRadius.lg, padding: Spacing.xl },
  adCtaTitle: { color: '#FFF', fontSize: FontSizes.lg, fontWeight: 'bold' },
  adCtaSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: FontSizes.sm },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  emptyState: { alignItems: 'center', padding: Spacing.xxl, gap: 8 },
  emptyText: { color: Colors.textSecondary, fontSize: FontSizes.md },
  emptySubtext: { color: Colors.textMuted, fontSize: FontSizes.sm, textAlign: 'center' },
  tipItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, gap: Spacing.md },
  tipIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(233,30,99,0.15)', alignItems: 'center', justifyContent: 'center' },
  tipAmount: { color: Colors.text, fontWeight: '600', fontSize: FontSizes.md },
  tipMeta: { color: Colors.textSecondary, fontSize: FontSizes.xs },
});
