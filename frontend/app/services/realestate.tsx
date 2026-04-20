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
import propertiesApi, { Property } from '../../src/api/propertiesApi';

const TYPES: { id: Property['listing_type'] | 'all'; label: string }[] = [
  { id: 'all', label: 'Tout' },
  { id: 'rent', label: 'Location' },
  { id: 'sale', label: 'Achat' },
  { id: 'land', label: 'Terrain' },
];

export default function RealEstateScreen() {
  if (!featureFlags.servicesHub) {
    return <ComingSoonScreen title="Immobilier" description="Le module immobilier sera bientôt disponible." icon="business-outline" />;
  }
  const insets = useSafeAreaInsets();
  const [activeType, setActiveType] = useState<typeof TYPES[number]['id']>('all');
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const list = await propertiesApi.list({
        page: 1,
        limit: 30,
        listing_type: activeType === 'all' ? undefined : (activeType as 'rent' | 'sale' | 'land'),
        status: 'available',
      });
      setProperties(list);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Impossible de charger les biens immobiliers.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [activeType]);

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
        <Text style={styles.headerTitle}>Immobilier</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        {TYPES.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, activeType === t.id && styles.tabActive]}
            onPress={() => setActiveType(t.id)}
          >
            <Text style={[styles.tabText, activeType === t.id && styles.tabTextActive]}>{t.label}</Text>
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
          <Text style={styles.errorTitle}>Annonces indisponibles</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : properties.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="business-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Aucun bien</Text>
          <Text style={styles.emptyText}>Aucune annonce disponible dans cette catégorie.</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {properties.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.card}
              onPress={() => router.push(`/services/property/${p.id}` as any)}
            >
              {p.cover_image || p.images?.[0] ? (
                <Image source={{ uri: p.cover_image ?? p.images?.[0] }} style={styles.cardImage} />
              ) : (
                <View style={[styles.cardImage, styles.cardImageFallback]}>
                  <Ionicons name="business-outline" size={36} color={Colors.textSecondary} />
                </View>
              )}
              <View style={styles.cardInfo}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{p.title}</Text>
                  <Text style={styles.listingType}>{p.listing_type === 'rent' ? 'Location' : p.listing_type === 'sale' ? 'Vente' : 'Terrain'}</Text>
                </View>
                <Text style={styles.cardAddress} numberOfLines={1}>
                  <Ionicons name="location-outline" size={12} color={Colors.textSecondary} /> {p.address}, {p.city ?? ''}
                </Text>
                <View style={styles.cardSpecs}>
                  {p.bedrooms ? <Text style={styles.spec}><Ionicons name="bed-outline" size={12} color={Colors.textSecondary} /> {p.bedrooms}</Text> : null}
                  {p.bathrooms ? <Text style={styles.spec}><Ionicons name="water-outline" size={12} color={Colors.textSecondary} /> {p.bathrooms}</Text> : null}
                  {p.surface_m2 ? <Text style={styles.spec}>{p.surface_m2} m²</Text> : null}
                </View>
                <Text style={styles.price}>{p.price.toLocaleString()} {p.currency ?? 'FCFA'}</Text>
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
  cardImage: { width: 100, height: 100, borderRadius: BorderRadius.md, backgroundColor: Colors.card },
  cardImageFallback: { alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600', flex: 1 },
  listingType: {
    color: Colors.primary,
    fontSize: FontSizes.xs,
    fontWeight: '600',
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  cardAddress: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 4 },
  cardSpecs: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  spec: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  price: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: 'bold', marginTop: Spacing.sm },
});
