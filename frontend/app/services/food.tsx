import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { featureFlags } from '../../src/config/featureFlags';
import ComingSoonScreen from '../../src/components/common/ComingSoonScreen';
import { restaurantsApi, Restaurant } from '../../src/api/restaurantsApi';

export default function FoodDeliveryScreen() {
  if (!featureFlags.servicesHub) {
    return <ComingSoonScreen title="Livraison repas" description="Le module livraison sera bientôt disponible." icon="restaurant-outline" />;
  }
  return <FoodDeliveryContent />;
}

function FoodDeliveryContent() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const list = await restaurantsApi.list({
        page: 1,
        limit: 30,
        search: search.trim() || undefined,
        is_open: true,
      });
      setRestaurants(list);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Impossible de charger les restaurants.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 400);
    return () => clearTimeout(t);
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
        <Text style={styles.headerTitle}>Restaurants</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un restaurant"
          placeholderTextColor={Colors.textMuted}
          style={styles.searchInput}
        />
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Ionicons name="cloud-offline-outline" size={56} color={Colors.textSecondary} />
          <Text style={styles.errorTitle}>Restaurants indisponibles</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : restaurants.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="restaurant-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Aucun restaurant</Text>
          <Text style={styles.emptyText}>
            Aucun restaurant disponible pour cette recherche.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {restaurants.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={styles.card}
              onPress={() => router.push(`/services/restaurant/${r.id}` as any)}
            >
              {r.cover_image || r.logo_url ? (
                <Image source={{ uri: r.cover_image ?? r.logo_url }} style={styles.cardImage} />
              ) : (
                <View style={[styles.cardImage, styles.cardImageFallback]}>
                  <Ionicons name="restaurant-outline" size={36} color={Colors.textSecondary} />
                </View>
              )}
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={1}>{r.name}</Text>
                {r.cuisine_type ? <Text style={styles.cardCuisine}>{r.cuisine_type}</Text> : null}
                <View style={styles.cardMeta}>
                  {r.rating ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="star" size={12} color="#FFD700" />
                      <Text style={styles.metaText}>{r.rating.toFixed(1)}</Text>
                    </View>
                  ) : null}
                  {r.delivery_time_min && r.delivery_time_max ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
                      <Text style={styles.metaText}>{r.delivery_time_min}-{r.delivery_time_max}min</Text>
                    </View>
                  ) : null}
                  {typeof r.delivery_fee === 'number' ? (
                    <Text style={styles.metaText}>
                      {r.delivery_fee === 0 ? 'Livraison gratuite' : `${r.delivery_fee.toLocaleString()} FCFA`}
                    </Text>
                  ) : null}
                </View>
                {r.is_open === false ? (
                  <View style={styles.closedBadge}>
                    <Text style={styles.closedText}>Fermé</Text>
                  </View>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSizes.md, padding: 0 },
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
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  cardImage: { width: 80, height: 80, borderRadius: BorderRadius.md, backgroundColor: Colors.card },
  cardImageFallback: { alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  cardCuisine: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  cardMeta: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm, alignItems: 'center', flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  closedBadge: {
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
    backgroundColor: Colors.error + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  closedText: { color: Colors.error, fontSize: FontSizes.xs, fontWeight: '600' },
});
