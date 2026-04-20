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
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { featureFlags } from '../../src/config/featureFlags';
import ComingSoonScreen from '../../src/components/common/ComingSoonScreen';
import { ridesApi, Ride } from '../../src/api/ridesApi';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  accepted: 'Acceptée',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
};

function statusColor(s: string): string {
  if (['completed', 'accepted'].includes(s)) return Colors.success;
  if (['cancelled'].includes(s)) return Colors.error;
  return Colors.info;
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function CovoiturageScreen() {
  if (!featureFlags.servicesHub) {
    return <ComingSoonScreen title="Covoiturage" description="Le module covoiturage sera bientôt disponible." icon="people-outline" />;
  }
  const insets = useSafeAreaInsets();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const list = await ridesApi.list({ as: 'passenger', page: 1, limit: 30 });
      setRides(list);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Impossible de charger vos courses.';
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes courses</Text>
        <TouchableOpacity onPress={() => router.push('/services/transport' as any)} style={styles.backBtn}>
          <Ionicons name="add" size={26} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Ionicons name="cloud-offline-outline" size={56} color={Colors.textSecondary} />
          <Text style={styles.errorTitle}>Courses indisponibles</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : rides.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="people-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Aucune course</Text>
          <Text style={styles.emptyText}>
            Vous n'avez pas encore demandé de course. Lancez-en une depuis Transport.
          </Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => router.push('/services/transport' as any)}>
            <Text style={styles.shopBtnText}>Demander une course</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {rides.map((r) => {
            const status = String(r.status).toLowerCase();
            const sColor = statusColor(status);
            return (
              <TouchableOpacity
                key={r.id}
                style={styles.card}
                onPress={() => router.push(`/services/ride/${r.id}` as any)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardDate}>{formatDate(r.created_at)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: sColor + '20' }]}>
                    <Text style={[styles.statusText, { color: sColor }]}>
                      {STATUS_LABELS[status] ?? r.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.routeRow}>
                  <View style={styles.routeIcons}>
                    <View style={[styles.routeDot, { backgroundColor: Colors.success }]} />
                    <View style={styles.routeLine} />
                    <View style={[styles.routeDot, { backgroundColor: Colors.primary }]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.routeText} numberOfLines={1}>{r.pickup_location}</Text>
                    <View style={{ height: 12 }} />
                    <Text style={styles.routeText} numberOfLines={1}>{r.dropoff_location}</Text>
                  </View>
                </View>
                {r.fare_amount ? (
                  <View style={styles.cardFooter}>
                    <Text style={styles.fareText}>{r.fare_amount.toLocaleString()} FCFA</Text>
                    {r.vehicle_type ? <Text style={styles.vehicleText}>{r.vehicle_type}</Text> : null}
                  </View>
                ) : null}
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
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  errorTitle: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: 'bold', marginTop: Spacing.md },
  errorText: { color: Colors.textSecondary, fontSize: FontSizes.md, textAlign: 'center' },
  emptyTitle: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: 'bold', marginTop: Spacing.md },
  emptyText: { color: Colors.textSecondary, fontSize: FontSizes.md, textAlign: 'center' },
  retryBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryText: { color: '#FFFFFF', fontSize: FontSizes.md, fontWeight: '600' },
  shopBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  shopBtnText: { color: '#FFFFFF', fontSize: FontSizes.md, fontWeight: '600' },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  cardDate: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '600' },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  statusText: { fontSize: FontSizes.xs, fontWeight: '600' },
  routeRow: { flexDirection: 'row', gap: Spacing.md },
  routeIcons: { alignItems: 'center', justifyContent: 'space-around', paddingVertical: 4 },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeLine: { width: 2, flex: 1, backgroundColor: Colors.border, marginVertical: 2 },
  routeText: { color: Colors.text, fontSize: FontSizes.sm },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
    marginTop: Spacing.md,
  },
  fareText: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: 'bold' },
  vehicleText: { color: Colors.textSecondary, fontSize: FontSizes.xs, textTransform: 'capitalize' },
});
