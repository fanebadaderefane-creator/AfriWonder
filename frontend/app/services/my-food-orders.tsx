import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { foodOrdersApi, FoodOrder } from '../../src/api/restaurantsApi';
import { useAuthStore } from '../../src/store/authStore';

function statusLabel(s: string): string {
  const m: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmée',
    preparing: 'En préparation',
    ready: 'Prête',
    delivering: 'En livraison',
    delivered: 'Livrée',
    cancelled: 'Annulée',
  };
  return m[s] ?? s;
}

export default function MyFoodOrdersScreen() {
  const insets = useSafeAreaInsets();
  const token = useAuthStore((s) => s.accessToken);
  const [orders, setOrders] = useState<FoodOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!token) {
        setOrders([]);
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      setError(null);
      try {
        const list = await foodOrdersApi.list({ page: 1, limit: 40 });
        setOrders(list);
      } catch (err) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          || (err as { message?: string })?.message
          || 'Impossible de charger vos commandes.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    void load();
  }, [load]);

  if (!token) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mes commandes repas</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.title}>Connexion requise</Text>
          <Text style={styles.muted}>Connectez-vous pour voir l’historique de vos commandes.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(auth)/login' as never)}>
            <Text style={styles.primaryBtnText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes commandes repas</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.muted}>{error}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => load()}>
            <Text style={styles.primaryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="fast-food-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.title}>Aucune commande</Text>
          <Text style={styles.muted}>Vos prochaines commandes apparaîtront ici.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/services/food' as never)}>
            <Text style={styles.primaryBtnText}>Parcourir les restaurants</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Spacing.xl }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true).finally(() => setRefreshing(false)); }} tintColor={Colors.primary} />
          }
        >
          {orders.map((o) => (
            <View key={o.id} style={styles.card}>
              <Text style={styles.cardTitle}>{o.restaurant?.name ?? o.restaurant_name ?? 'Restaurant'}</Text>
              <Text style={styles.cardMeta}>{statusLabel(o.status)} · {Number(o.total_amount).toLocaleString('fr-FR')} FCFA</Text>
              {o.created_at ? (
                <Text style={styles.cardDate}>
                  {new Date(o.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                </Text>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: Colors.text, fontWeight: '800', fontSize: FontSizes.md, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxl, gap: Spacing.md },
  title: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '800' },
  muted: { color: Colors.textSecondary, textAlign: 'center', fontSize: FontSizes.sm },
  primaryBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  primaryBtnText: { color: '#FFF', fontWeight: '700' },
  list: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardTitle: { color: Colors.text, fontWeight: '700', fontSize: FontSizes.md },
  cardMeta: { color: Colors.primary, marginTop: 4, fontSize: FontSizes.sm },
  cardDate: { color: Colors.textMuted, marginTop: 6, fontSize: FontSizes.xs },
});
