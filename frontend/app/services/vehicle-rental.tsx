import React, { useCallback, useEffect, useState } from 'react';
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
import providersApi, { ServiceProvider } from '../../src/api/providersApi';

export default function VehicleRentalScreen() {
  if (!featureFlags.servicesHub) {
    return <ComingSoonScreen title="Location véhicule" description="La location de véhicules sera bientôt disponible." icon="car-sport-outline" />;
  }
  const insets = useSafeAreaInsets();
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const list = await providersApi.list({
        category: 'vehicle_rental',
        page: 1,
        limit: 30,
        status: 'approved',
      });
      setProviders(list);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Impossible de charger les loueurs.';
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
        <Text style={styles.headerTitle}>Location véhicule</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Ionicons name="cloud-offline-outline" size={56} color={Colors.textSecondary} />
          <Text style={styles.errorTitle}>Loueurs indisponibles</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : providers.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="car-sport-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Aucun loueur</Text>
          <Text style={styles.emptyText}>
            Aucune agence de location disponible pour l'instant.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {providers.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.card}
              onPress={() => router.push(`/services/provider/${p.id}` as any)}
            >
              {p.cover_image ? (
                <Image source={{ uri: p.cover_image }} style={styles.cover} />
              ) : (
                <View style={[styles.cover, styles.coverFallback]}>
                  <Ionicons name="car-sport-outline" size={36} color={Colors.textSecondary} />
                </View>
              )}
              <View style={styles.cardContent}>
                <View style={styles.nameRow}>
                  <Text style={styles.cardName} numberOfLines={1}>{p.display_name ?? p.full_name ?? 'Agence'}</Text>
                  {p.is_verified ? <Ionicons name="checkmark-circle" size={16} color={Colors.primary} /> : null}
                </View>
                {p.bio ? <Text style={styles.cardBio} numberOfLines={2}>{p.bio}</Text> : null}
                <View style={styles.cardMeta}>
                  {p.rating ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="star" size={12} color="#FFD700" />
                      <Text style={styles.metaText}>{p.rating.toFixed(1)}</Text>
                    </View>
                  ) : null}
                  {p.total_jobs ? <Text style={styles.metaText}>{p.total_jobs} locations</Text> : null}
                  {p.city ? (
                    <Text style={styles.metaText}>
                      <Ionicons name="location-outline" size={12} color={Colors.textSecondary} /> {p.city}
                    </Text>
                  ) : null}
                </View>
                {typeof p.base_price === 'number' ? (
                  <Text style={styles.priceText}>
                    À partir de {p.base_price.toLocaleString()} {p.currency ?? 'FCFA'}/jour
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
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
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  cover: { width: '100%', height: 140, backgroundColor: Colors.card },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  cardContent: { padding: Spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  cardName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600', flex: 1 },
  cardBio: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 4 },
  cardMeta: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  priceText: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: '600', marginTop: Spacing.sm },
});
