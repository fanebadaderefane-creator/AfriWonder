import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { AdminSubScreenHeader } from '../../src/components/admin/AdminSubScreenHeader';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import apiClient from '../../src/api/client';
import { API_ROUTES } from '../../src/config/api';

export default function AdminTransactionsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ordersMsg, setOrdersMsg] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [txMsg, setTxMsg] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [wdMsg, setWdMsg] = useState<string | null>(null);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  const load = useCallback(async () => {
    setOrdersMsg(null);
    setTxMsg(null);
    setWdMsg(null);
    try {
      const o = await apiClient.get(API_ROUTES.ADMIN_ORDERS, { params: { page: 1, limit: 15 } });
      const od = o.data?.data ?? o.data;
      const list = od?.orders ?? od?.data?.orders ?? [];
      setOrders(Array.isArray(list) ? list : []);
    } catch {
      setOrders([]);
      setOrdersMsg('Commandes indisponibles.');
    }

    try {
      const t = await apiClient.get(API_ROUTES.ADMIN_TRANSACTIONS, { params: { page: 1, limit: 15 } });
      const td = t.data?.data ?? t.data;
      const list = td?.transactions ?? [];
      setTransactions(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setTransactions([]);
      if (e?.response?.status === 403) {
        setTxMsg('Transactions : accès réservé au rôle finance admin.');
      } else {
        setTxMsg('Transactions indisponibles.');
      }
    }

    try {
      const w = await apiClient.get(API_ROUTES.ADMIN_WITHDRAWALS, {
        params: { page: 1, limit: 15, status: 'pending' },
      });
      const wd = w.data?.data ?? w.data;
      const list = wd?.withdrawals ?? [];
      setWithdrawals(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setWithdrawals([]);
      if (e?.response?.status === 403) {
        setWdMsg('Retraits : accès réservé au rôle finance admin.');
      } else {
        setWdMsg('Retraits indisponibles.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load().finally(() => setRefreshing(false));
  }, [load]);

  return (
    <View style={styles.container}>
      <AdminSubScreenHeader title="Finances" />
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 48 }}
        >
          <Text style={styles.h}>Commandes marketplace</Text>
          {ordersMsg ? <Text style={styles.hint}>{ordersMsg}</Text> : null}
          {orders.length === 0 && !ordersMsg ? (
            <Text style={styles.empty}>Aucune commande récente.</Text>
          ) : null}
          {orders.slice(0, 10).map((ord: any) => (
            <View key={String(ord.id)} style={styles.card}>
              <Text style={styles.cardTitle}>#{ord.id?.slice(0, 8)}</Text>
              <Text style={styles.cardMeta}>
                Statut : {ord.status || '—'} · {ord.total_amount != null ? `${ord.total_amount} FCFA` : '—'}
              </Text>
            </View>
          ))}

          <Text style={[styles.h, { marginTop: Spacing.xl }]}>Transactions</Text>
          {txMsg ? <Text style={styles.hint}>{txMsg}</Text> : null}
          {transactions.slice(0, 10).map((tr: any) => (
            <View key={tr.id} style={styles.card}>
              <Text style={styles.cardTitle}>{tr.type || 'transaction'}</Text>
              <Text style={styles.cardMeta}>
                {tr.amount} · {tr.status} · {tr.user?.email || tr.user?.username || '—'}
              </Text>
            </View>
          ))}

          <Text style={[styles.h, { marginTop: Spacing.xl }]}>Retraits en attente</Text>
          {wdMsg ? <Text style={styles.hint}>{wdMsg}</Text> : null}
          {withdrawals.length === 0 && !wdMsg ? (
            <Text style={styles.empty}>Aucun retrait en attente.</Text>
          ) : null}
          {withdrawals.map((w: any) => (
            <View key={w.id} style={styles.card}>
              <Text style={styles.cardTitle}>
                {w.user?.username || w.user?.email || w.user_id}
              </Text>
              <Text style={styles.cardMeta}>
                {w.amount} {w.currency || 'FCFA'} · {w.status}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  h: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  hint: { color: Colors.textMuted, fontSize: FontSizes.sm, marginBottom: Spacing.md },
  empty: { color: Colors.textMuted, marginBottom: Spacing.lg },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardTitle: { color: Colors.text, fontWeight: '600' },
  cardMeta: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 4 },
});
