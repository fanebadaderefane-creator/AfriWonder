import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { fetchSellerDashboard, SellerDashboardPayload } from '../../src/api/sellerDashboardApi';
import { useAuthStore } from '../../src/store/authStore';

function orderStatusFr(s: string) {
  const m: Record<string, string> = {
    pending: 'En attente',
    processing: 'Préparation',
    in_transit: 'Expédition',
    delivered: 'Livré',
    completed: 'Terminé',
    cancelled: 'Annulé',
  };
  return m[s] || s;
}

export default function SellerDashboardScreen() {
  const insets = useSafeAreaInsets();
  const token = useAuthStore((s) => s.accessToken);
  const [data, setData] = useState<SellerDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setData(null);
      setLoading(false);
      setError('connect');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const d = await fetchSellerDashboard('30d');
      setData(d);
    } catch (e) {
      setData(null);
      setError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (e as { message?: string })?.message
        || 'Indisponible'
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  const kpis = data?.kpis;
  const recent = data?.recent_orders || [];
  const growth = data?.comparison?.revenue_growth_pct ?? 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prestataires / Boutique</Text>
        <TouchableOpacity onPress={() => router.push('/orders')} accessibilityLabel="Commandes">
          <Ionicons name="receipt-outline" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error === 'connect' ? (
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={48} color={Colors.textSecondary} />
          <Text style={styles.errTitle}>Connexion requise</Text>
          <Text style={styles.errText}>Connectez-vous pour voir votre tableau de bord vendeur.</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errText}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={() => void load()}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          <View style={styles.revenueCard}>
            <Text style={styles.revenueLabel}>Chiffre d’affaires (30 j)</Text>
            <Text style={styles.revenueAmount}>
              {Math.round(kpis?.total_revenue || 0).toLocaleString('fr-FR')} FCFA
            </Text>
            <View style={styles.revenueTrend}>
              <Ionicons name={growth >= 0 ? 'trending-up' : 'trending-down'} size={16} color={growth >= 0 ? Colors.success : Colors.error} />
              <Text style={[styles.revenueTrendText, { color: growth >= 0 ? Colors.success : Colors.error }]}>
                {growth >= 0 ? '+' : ''}
                {Math.round(growth * 10) / 10}% vs période précédente
              </Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="cube-outline" size={22} color={Colors.primary} />
              <Text style={styles.statValue}>{kpis?.total_products ?? 0}</Text>
              <Text style={styles.statLabel}>Produits actifs</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="bag-outline" size={22} color={Colors.primary} />
              <Text style={styles.statValue}>{kpis?.total_orders ?? 0}</Text>
              <Text style={styles.statLabel}>Commandes</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-done-outline" size={22} color={Colors.success} />
              <Text style={styles.statValue}>{kpis?.completed_orders ?? 0}</Text>
              <Text style={styles.statLabel}>Livrées</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="time-outline" size={22} color={Colors.accent} />
              <Text style={styles.statValue}>{kpis?.pending_orders ?? 0}</Text>
              <Text style={styles.statLabel}>En cours</Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(tabs)/create')}>
              <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
              <Text style={styles.actionText}>Créer contenu</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(tabs)/market')}>
              <Ionicons name="storefront-outline" size={22} color={Colors.accent} />
              <Text style={styles.actionText}>Marketplace</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/orders')}>
              <Ionicons name="list-outline" size={22} color={Colors.info} />
              <Text style={styles.actionText}>Commandes</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Commandes récentes</Text>
          {recent.length === 0 ? (
            <Text style={styles.muted}>Aucune commande sur cette période.</Text>
          ) : (
            recent.map((order) => (
              <TouchableOpacity key={order.id} style={styles.orderCard} onPress={() => router.push('/orders')}>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderProduct}>#{order.id.slice(0, 8)}</Text>
                  <Text style={styles.orderBuyer}>{order.buyer_name || 'Acheteur'}</Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderAmount}>{Math.round(order.total_amount).toLocaleString('fr-FR')} FCFA</Text>
                  <Text style={styles.orderStatus}>{orderStatusFr(order.status)}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.text, flex: 1, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  errTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '800' },
  errText: { color: Colors.textSecondary, textAlign: 'center' },
  retry: { marginTop: Spacing.md, backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  retryText: { color: '#FFF', fontWeight: '700' },
  content: { paddingHorizontal: Spacing.xl },
  revenueCard: { backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, padding: Spacing.xxl, marginBottom: Spacing.xl },
  revenueLabel: { color: 'rgba(255,255,255,0.85)', fontSize: FontSizes.md },
  revenueAmount: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold', marginVertical: Spacing.xs },
  revenueTrend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  revenueTrendText: { fontSize: FontSizes.sm, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.xl },
  statCard: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: '800' },
  statLabel: { color: Colors.textSecondary, fontSize: FontSizes.xs, textAlign: 'center' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm, marginBottom: Spacing.xl },
  actionBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionText: { color: Colors.text, fontSize: 10, fontWeight: '600', textAlign: 'center' },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md },
  muted: { color: Colors.textSecondary, marginBottom: Spacing.lg },
  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  orderInfo: { flex: 1 },
  orderProduct: { color: Colors.text, fontWeight: '700' },
  orderBuyer: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  orderRight: { alignItems: 'flex-end' },
  orderAmount: { color: Colors.primary, fontWeight: '800' },
  orderStatus: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: 4 },
});
