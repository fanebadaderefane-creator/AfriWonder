/**
 * /(admin)/live-revenue.tsx — Tableau de bord ADMIN du revenu live par créateur.
 *
 * Sources de revenus agrégées :
 *  - Gifts (cadeaux virtuels achetés en coins)
 *  - Tips (pourboires en coins directs)
 *
 * Pour chaque créateur, l'admin AfriWonder voit :
 *  - Montant total reçu (coins → FCFA)
 *  - Part créateur (70% par défaut, configurable)
 *  - Commission plateforme (30%)
 *  - Nombre de transactions
 *
 * Filtres : période (7j / 30j / 90j / tout) + recherche par nom
 * Actions : tap créateur → fiche détaillée, export CSV
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../src/api/client';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { profileAvatarUri } from '../../src/utils/avatarFallback';

type CreatorRevenue = {
  creator_id: string;
  creator_name: string;
  creator_username: string;
  creator_avatar: string | null;
  total_gifts_amount: number;
  total_tips_amount: number;
  creator_earnings: number;
  platform_commission: number;
  gifts_count: number;
  tips_count: number;
  total_revenue: number;
};

type Period = '7d' | '30d' | '90d' | 'all';

const PERIOD_LABELS: Record<Period, string> = {
  '7d': '7 jours',
  '30d': '30 jours',
  '90d': '90 jours',
  all: 'Tout',
};

function formatFCFA(amount: number): string {
  return `${Math.round(amount).toLocaleString('fr-FR')} FCFA`;
}

function formatCoins(amount: number): string {
  return `${Math.round(amount).toLocaleString('fr-FR')} 🪙`;
}

function computeDateRange(period: Period): { from?: string; to?: string } {
  if (period === 'all') return {};
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

export default function AdminLiveRevenueScreen() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>('30d');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<CreatorRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const range = computeDateRange(period);
      const res = await apiClient.get('/admin/live-revenue-by-creator', {
        params: { ...range, page: 1, limit: 100 },
      });
      const raw = res.data?.data ?? res.data;
      const items: any[] = Array.isArray(raw?.items)
        ? raw.items
        : Array.isArray(raw?.creators)
          ? raw.creators
          : Array.isArray(raw)
            ? raw
            : [];
      const mapped: CreatorRevenue[] = items.map((r: any) => {
        const giftsAmt = Number(r.total_gifts_amount || 0);
        const tipsAmt = Number(r.total_tips_amount || 0);
        return {
          creator_id: String(r.creator_id || r.id || ''),
          creator_name: String(r.full_name || r.creator?.full_name || r.creator_name || 'Inconnu'),
          creator_username: String(r.username || r.creator?.username || r.creator_username || ''),
          creator_avatar: r.profile_image || r.creator?.profile_image || r.creator_avatar || null,
          total_gifts_amount: giftsAmt,
          total_tips_amount: tipsAmt,
          creator_earnings: Number(r.creator_earnings || 0),
          platform_commission: Number(r.platform_commission || 0),
          gifts_count: Number(r.gifts_count || 0),
          tips_count: Number(r.tips_count || 0),
          total_revenue: giftsAmt + tipsAmt,
        };
      });
      // Tri décroissant par revenu total
      mapped.sort((a, b) => b.total_revenue - a.total_revenue);
      setData(mapped);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible de charger les revenus');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    setLoading(true);
    void loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (c) =>
        c.creator_name.toLowerCase().includes(q) ||
        c.creator_username.toLowerCase().includes(q),
    );
  }, [data, search]);

  const totals = useMemo(() => {
    let totalRevenue = 0;
    let totalEarnings = 0;
    let totalCommission = 0;
    let totalTransactions = 0;
    for (const c of data) {
      totalRevenue += c.total_revenue;
      totalEarnings += c.creator_earnings;
      totalCommission += c.platform_commission;
      totalTransactions += c.gifts_count + c.tips_count;
    }
    return { totalRevenue, totalEarnings, totalCommission, totalTransactions };
  }, [data]);

  const exportCsv = useCallback(async () => {
    try {
      const headers = ['Créateur', 'Username', 'ID', 'Gifts (coins)', 'Tips (coins)', 'Part créateur (FCFA)', 'Commission (FCFA)', 'Total cadeaux', 'Total tips'];
      const rows = data.map((c) => [
        `"${c.creator_name.replace(/"/g, '""')}"`,
        c.creator_username,
        c.creator_id,
        Math.round(c.total_gifts_amount),
        Math.round(c.total_tips_amount),
        Math.round(c.creator_earnings),
        Math.round(c.platform_commission),
        c.gifts_count,
        c.tips_count,
      ]);
      const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
      const blob = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
      void Linking.openURL(blob).catch(() => Alert.alert('CSV', csv.slice(0, 4000)));
    } catch {
      Alert.alert('Export', 'Impossible de générer le CSV');
    }
  }, [data]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: Colors.background, paddingTop: insets.top }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} testID="back-btn">
            <Ionicons name="chevron-back" size={26} color={Colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Revenus Live</Text>
            <Text style={styles.subtitle}>Par créateur · {PERIOD_LABELS[period]}</Text>
          </View>
          <TouchableOpacity onPress={exportCsv} testID="export-csv">
            <Ionicons name="download-outline" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* KPIs */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Revenu brut</Text>
            <Text style={styles.kpiValue}>{formatCoins(totals.totalRevenue)}</Text>
            <Text style={styles.kpiHint}>{formatFCFA(totals.totalRevenue * 5)}</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
            <Text style={styles.kpiLabel}>Aux créateurs</Text>
            <Text style={[styles.kpiValue, { color: '#22C55E' }]}>{formatFCFA(totals.totalEarnings)}</Text>
            <Text style={styles.kpiHint}>70%</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: 'rgba(255,107,0,0.12)' }]}>
            <Text style={styles.kpiLabel}>Commission</Text>
            <Text style={[styles.kpiValue, { color: Colors.primary }]}>{formatFCFA(totals.totalCommission)}</Text>
            <Text style={styles.kpiHint}>30%</Text>
          </View>
        </View>

        {/* Filtres période */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.periodRow}
          style={{ maxHeight: 50, marginTop: 8 }}
        >
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              testID={`period-${p}`}
              style={[styles.periodChip, period === p && styles.periodChipActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodChipLabel, period === p && styles.periodChipLabelActive]}>
                {PERIOD_LABELS[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search */}
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            testID="creator-search"
            style={styles.searchInput}
            placeholder="Rechercher un créateur..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* List */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="cash-outline" size={56} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Aucun revenu sur cette période</Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  void loadData();
                }}
                tintColor={Colors.primary}
              />
            }
          >
            {filtered.map((c, idx) => (
              <TouchableOpacity
                key={c.creator_id}
                style={styles.row}
                activeOpacity={0.7}
                testID={`creator-row-${c.creator_id}`}
                onPress={() =>
                  Alert.alert(
                    c.creator_name,
                    `Cadeaux : ${c.gifts_count} (${formatCoins(c.total_gifts_amount)})\n` +
                      `Tips : ${c.tips_count} (${formatCoins(c.total_tips_amount)})\n\n` +
                      `Part créateur : ${formatFCFA(c.creator_earnings)} (70%)\n` +
                      `Commission AfriWonder : ${formatFCFA(c.platform_commission)} (30%)`,
                  )
                }
              >
                <View style={styles.rank}>
                  <Text style={styles.rankText}>#{idx + 1}</Text>
                </View>
                <Image
                  source={{ uri: profileAvatarUri(c.creator_avatar || '', c.creator_name) }}
                  style={styles.avatar}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.creatorName} numberOfLines={1}>
                    {c.creator_name}
                  </Text>
                  <Text style={styles.creatorUsername} numberOfLines={1}>
                    @{c.creator_username || c.creator_id.slice(0, 8)}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>
                      🎁 {c.gifts_count} · 💸 {c.tips_count}
                    </Text>
                  </View>
                </View>
                <View style={styles.amountBox}>
                  <Text style={styles.amountTotal}>{formatFCFA(c.creator_earnings)}</Text>
                  <Text style={styles.amountHint}>part créateur</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  title: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: '700' },
  subtitle: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  kpiRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginTop: Spacing.md },
  kpiCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    minHeight: 80,
  },
  kpiLabel: { color: Colors.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  kpiValue: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '800', marginTop: 4 },
  kpiHint: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  periodRow: { paddingHorizontal: Spacing.lg, gap: 6, alignItems: 'center' },
  periodChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  periodChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  periodChipLabel: { color: Colors.text, fontSize: 12, fontWeight: '600' },
  periodChipLabelActive: { color: '#FFF', fontWeight: '700' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.md,
    gap: 8,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSizes.sm, padding: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,107,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { color: Colors.primary, fontSize: 11, fontWeight: '800' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#333' },
  creatorName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  creatorUsername: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: 1 },
  metaRow: { marginTop: 3 },
  metaText: { color: Colors.textMuted, fontSize: 11 },
  amountBox: { alignItems: 'flex-end' },
  amountTotal: { color: '#22C55E', fontSize: FontSizes.md, fontWeight: '700' },
  amountHint: { color: Colors.textMuted, fontSize: 10, marginTop: 1 },
});
