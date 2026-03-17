import React, { useState, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const PERIODS = [
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '90d', label: '90 jours' },
  { value: '12m', label: '12 mois' },
];

export default function SellerDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [period, setPeriod] = useState('30d');
  const [dashboard, setDashboard] = useState(null);
  const [productAnalytics, setProductAnalytics] = useState(null);
  const [insights, setInsights] = useState(null);
  const [geography, setGeography] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const [dash, prod, ins, geo] = await Promise.all([
          api.seller.getAnalytics({ period }).catch(() => null),
          api.seller.getProductAnalytics({ period }).catch(() => null),
          api.seller.getInsights({ period }).catch(() => null),
          api.seller.getGeography({ period }).catch(() => []),
        ]);
        if (cancelled) return;
        setDashboard(dash || {});
        setProductAnalytics(prod || null);
        setInsights(ins || null);
        setGeography(Array.isArray(geo) ? geo : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, period]);

  const kpis = dashboard?.kpis || {};
  const comparison = dashboard?.comparison || {};
  const salesByDay = dashboard?.sales_by_day || [];

  const COLORS = ['#f97316', '#ef4444', '#ec4899', '#8b5cf6', '#6366f1', '#14b8a6'];

  const revenueGrowthLabel = useMemo(() => {
    const v = comparison.revenue_growth_pct;
    if (v == null) return null;
    const sign = v >= 0 ? '+' : '';
    return `${sign}${v}% vs période précédente`;
  }, [comparison.revenue_growth_pct]);

  if (!user || loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color="#f97316" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tableau de bord vendeur</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.periodRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.periodChips}
          >
            {PERIODS.map((p) => {
              const active = p.value === period;
              return (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.periodChip,
                    active && styles.periodChipActive,
                  ]}
                  onPress={() => setPeriod(p.value)}
                >
                  <Text
                    style={[
                      styles.periodChipText,
                      active && styles.periodChipTextActive,
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={styles.growthRow}>
            {revenueGrowthLabel && (
              <View
                style={[
                  styles.growthPill,
                  comparison.revenue_growth_pct >= 0
                    ? styles.growthPillUp
                    : styles.growthPillDown,
                ]}
              >
                <Ionicons
                  name={
                    comparison.revenue_growth_pct >= 0
                      ? 'trending-up-outline'
                      : 'trending-down-outline'
                  }
                  size={14}
                  color={
                    comparison.revenue_growth_pct >= 0
                      ? '#166534'
                      : '#b91c1c'
                  }
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.growthText,
                    comparison.revenue_growth_pct >= 0
                      ? styles.growthTextUp
                      : styles.growthTextDown,
                  ]}
                >
                  {revenueGrowthLabel}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconCircle}>
              <Ionicons
                name="cash-outline"
                size={20}
                color="#f97316"
              />
            </View>
            <Text style={styles.kpiLabel}>Revenu</Text>
            <Text style={styles.kpiValue}>
              {Number(kpis.total_revenue || 0).toLocaleString('fr-FR')}{' '}
              XOF
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconCircle}>
              <Ionicons
                name="cube-outline"
                size={20}
                color="#3b82f6"
              />
            </View>
            <Text style={styles.kpiLabel}>Commandes</Text>
            <Text style={styles.kpiValue}>
              {kpis.total_orders ?? 0}
            </Text>
            <Text style={styles.kpiSub}>
              {(kpis.completed_orders ?? 0)} livrées
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconCircle}>
              <Ionicons
                name="pricetag-outline"
                size={20}
                color="#22c55e"
              />
            </View>
            <Text style={styles.kpiLabel}>Produits</Text>
            <Text style={styles.kpiValue}>
              {kpis.total_products ?? 0}
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconCircle}>
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color="#ef4444"
              />
            </View>
            <Text style={styles.kpiLabel}>En attente</Text>
            <Text style={styles.kpiValue}>
              {kpis.pending_orders ?? 0}
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconCircle}>
              <Ionicons
                name="cart-outline"
                size={20}
                color="#f59e0b"
              />
            </View>
            <Text style={styles.kpiLabel}>Paniers abandonnés</Text>
            <Text style={styles.kpiValue}>
              {kpis.abandoned_carts_count ?? 0}
            </Text>
            <Text style={styles.kpiSub}>
              {Number(
                kpis.abandoned_carts_lost_value || 0,
              ).toLocaleString('fr-FR')}{' '}
              XOF perdus
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ventes par jour</Text>
          {salesByDay.length === 0 ? (
            <Text style={styles.emptyText}>
              Pas encore de données.
            </Text>
          ) : (
            <View style={styles.miniChart}>
              {salesByDay.slice(-14).map((d, i) => {
                const maxRev = Math.max(
                  ...salesByDay.map((s) => s.revenue || 0),
                  1,
                );
                const h = Math.max(
                  8,
                  Math.round(
                    ((d.revenue || 0) / maxRev) * 60,
                  ),
                );
                return (
                  <View key={i} style={styles.miniBarWrap}>
                    <View
                      style={[
                        styles.miniBar,
                        { height: h },
                      ]}
                    />
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {geography && geography.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Répartition géographique
            </Text>
            {geography.map((g, idx) => {
              const total = geography.reduce(
                (s, x) => s + (x.revenue || 0),
                0,
              );
              const pct =
                total > 0
                  ? Math.round(
                      ((g.revenue || 0) / total) * 100,
                    )
                  : 0;
              return (
                <View key={idx} style={styles.geoRow}>
                  <View style={styles.geoLabelWrap}>
                    <View
                      style={[
                        styles.geoDot,
                        {
                          backgroundColor:
                            COLORS[idx % COLORS.length],
                        },
                      ]}
                    />
                    <Text style={styles.geoLabel}>
                      {g.country || '—'}
                    </Text>
                  </View>
                  <Text style={styles.geoPct}>
                    {pct}%
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {productAnalytics && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top produits</Text>
            {(productAnalytics.top_10 || [])
              .slice(0, 5)
              .map((p) => (
                <View
                  key={p.product_id}
                  style={styles.productRow}
                >
                  <Text
                    style={styles.productName}
                    numberOfLines={1}
                  >
                    {p.name}
                  </Text>
                  <Text style={styles.productRevenue}>
                    {Number(
                      p.revenue || 0,
                    ).toLocaleString('fr-FR')}{' '}
                    XOF
                  </Text>
                </View>
              ))}
          </View>
        )}

        {insights?.insights?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Insights</Text>
            {insights.insights.map((txt, i) => (
              <View key={i} style={styles.insightRow}>
                <View style={styles.insightDot} />
                <Text style={styles.insightText}>{txt}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  periodRow: {
    marginBottom: 12,
  },
  periodChips: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  periodChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    marginRight: 8,
  },
  periodChipActive: {
    backgroundColor: '#f97316',
  },
  periodChipText: {
    fontSize: 13,
    color: '#374151',
  },
  periodChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  growthRow: {
    marginTop: 8,
  },
  growthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  growthPillUp: {
    backgroundColor: '#dcfce7',
  },
  growthPillDown: {
    backgroundColor: '#fee2e2',
  },
  growthText: {
    fontSize: 11,
  },
  growthTextUp: {
    color: '#166534',
  },
  growthTextDown: {
    color: '#b91c1c',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flexBasis: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  kpiIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  kpiValue: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  kpiSub: {
    marginTop: 2,
    fontSize: 11,
    color: '#16a34a',
  },
  section: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 12,
    color: '#6b7280',
  },
  miniChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 72,
    marginTop: 6,
  },
  miniBarWrap: {
    flex: 1,
    alignItems: 'center',
  },
  miniBar: {
    width: 6,
    borderRadius: 999,
    backgroundColor: '#f97316',
  },
  geoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  geoLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  geoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  geoLabel: {
    fontSize: 13,
    color: '#374151',
  },
  geoPct: {
    fontSize: 13,
    color: '#4b5563',
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  productName: {
    flex: 1,
    marginRight: 8,
    fontSize: 13,
    color: '#374151',
  },
  productRevenue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f97316',
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  insightDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#f59e0b',
    marginTop: 6,
    marginRight: 6,
  },
  insightText: {
    flex: 1,
    fontSize: 12,
    color: '#4b5563',
  },
});

