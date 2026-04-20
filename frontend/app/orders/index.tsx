import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { featureFlags } from '../../src/config/featureFlags';
import ComingSoonScreen from '../../src/components/common/ComingSoonScreen';
import ordersApi, { Order } from '../../src/api/ordersApi';

const TABS: { label: string; statuses: string[] | null }[] = [
  { label: 'Tous', statuses: null },
  { label: 'En cours', statuses: ['pending', 'paid', 'preparing', 'shipped', 'in_delivery'] },
  { label: 'Livrées', statuses: ['delivered', 'completed'] },
  { label: 'Annulées', statuses: ['cancelled', 'refunded', 'failed'] },
];

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  paid: 'Payée',
  preparing: 'En préparation',
  shipped: 'Expédiée',
  in_delivery: 'En livraison',
  delivered: 'Livrée',
  completed: 'Terminée',
  cancelled: 'Annulée',
  refunded: 'Remboursée',
  failed: 'Échouée',
};

function formatDate(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

function getStatusColor(status: string): string {
  if (['delivered', 'completed', 'paid'].includes(status)) return Colors.success;
  if (['cancelled', 'refunded', 'failed'].includes(status)) return Colors.error;
  if (['pending'].includes(status)) return Colors.warning ?? Colors.info;
  return Colors.info;
}

export default function OrdersScreen() {
  if (!featureFlags.marketplace) {
    return (
      <ComingSoonScreen
        title="Mes commandes"
        description="L'historique des commandes marketplace sera bientôt disponible."
        icon="receipt-outline"
      />
    );
  }
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await ordersApi.list({ page: 1, limit: 50 });
      setOrders(res.orders);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Impossible de charger vos commandes.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true).finally(() => setRefreshing(false));
  }, [load]);

  const filteredOrders = useMemo(() => {
    const allowed = TABS[activeTab].statuses;
    if (!allowed) return orders;
    return orders.filter((o) => allowed.includes(String(o.status).toLowerCase()));
  }, [orders, activeTab]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes commandes</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        {TABS.map((tab, index) => (
          <TouchableOpacity
            key={tab.label}
            style={[styles.tab, activeTab === index && styles.tabActive]}
            onPress={() => setActiveTab(index)}
          >
            <Text style={[styles.tabText, activeTab === index && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Ionicons name="cloud-offline-outline" size={56} color={Colors.textSecondary} />
          <Text style={styles.errorTitle}>Commandes indisponibles</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="receipt-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Aucune commande</Text>
          <Text style={styles.emptyText}>
            {activeTab === 0
              ? 'Vous n\'avez pas encore passé de commande.'
              : 'Aucune commande dans cette catégorie.'}
          </Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => router.push('/(tabs)/market' as any)}>
            <Text style={styles.shopBtnText}>Voir le marketplace</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {filteredOrders.map((order) => {
            const status = String(order.status).toLowerCase();
            const label = STATUS_LABELS[status] ?? order.status;
            const color = getStatusColor(status);
            const itemCount = order.items?.length ?? 0;
            return (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                onPress={() => router.push(`/orders/${order.id}` as any)}
              >
                <View style={styles.orderHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
                    <Text style={styles.orderId}>Commande #{order.id.slice(0, 8)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
                    <Text style={[styles.statusText, { color }]}>{label}</Text>
                  </View>
                </View>
                {order.items && order.items.length > 0 ? (
                  <View style={styles.orderItems}>
                    {order.items.slice(0, 3).map((item, i) => {
                      const img = item.product?.images?.[0];
                      return (
                        <View key={item.id ?? `item-${i}`} style={styles.orderItemRow}>
                          {img ? (
                            <Image source={{ uri: img }} style={styles.orderItemImage} />
                          ) : (
                            <View style={[styles.orderItemImage, styles.orderItemImageFallback]}>
                              <Ionicons name="image-outline" size={18} color={Colors.textSecondary} />
                            </View>
                          )}
                          <Text style={styles.orderItemName} numberOfLines={1}>
                            {(item.product?.name ?? 'Produit')} × {item.quantity}
                          </Text>
                        </View>
                      );
                    })}
                    {itemCount > 3 ? (
                      <Text style={styles.moreItems}>+ {itemCount - 3} autre(s)</Text>
                    ) : null}
                  </View>
                ) : null}
                <View style={styles.orderFooter}>
                  <Text style={styles.orderTotal}>{(order.total_amount ?? 0).toLocaleString()} FCFA</Text>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  tabsContainer: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg, maxHeight: 44 },
  tab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    marginRight: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontSize: FontSizes.md, fontWeight: '500' },
  tabTextActive: { color: '#FFFFFF' },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  errorTitle: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: 'bold', marginTop: Spacing.md },
  errorText: { color: Colors.textSecondary, fontSize: FontSizes.md, textAlign: 'center' },
  retryBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryText: { color: '#FFFFFF', fontSize: FontSizes.md, fontWeight: '600' },
  emptyTitle: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: 'bold', marginTop: Spacing.md },
  emptyText: { color: Colors.textSecondary, fontSize: FontSizes.md, textAlign: 'center' },
  shopBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  shopBtnText: { color: '#FFFFFF', fontSize: FontSizes.md, fontWeight: '600' },
  orderCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  orderDate: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  orderId: { color: Colors.textSecondary, fontSize: FontSizes.xs, fontFamily: 'monospace' },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  statusText: { fontSize: FontSizes.xs, fontWeight: '600' },
  orderItems: { marginBottom: Spacing.md },
  orderItemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  orderItemImage: { width: 48, height: 48, borderRadius: BorderRadius.sm, backgroundColor: Colors.card },
  orderItemImageFallback: { alignItems: 'center', justifyContent: 'center' },
  orderItemName: { color: Colors.text, fontSize: FontSizes.md, flex: 1 },
  moreItems: { color: Colors.textSecondary, fontSize: FontSizes.xs, paddingLeft: 60 },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  orderTotal: { color: Colors.primary, fontSize: FontSizes.lg, fontWeight: 'bold' },
});
