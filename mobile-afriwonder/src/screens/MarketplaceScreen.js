import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import ProviderCard from '../components/ProviderCard';
import { FICTITIOUS_FEATURED_PROVIDERS } from '../data/marketplaceFictitiousProviders';

export default function MarketplaceScreen() {
  const navigation = useNavigation();
  const [categories, setCategories] = useState([]);
  const [providersData, setProvidersData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [catsRes, provRes] = await Promise.all([
          api.serviceCategories?.list?.().catch(() => []),
          api.providers.list({ limit: 12 }).catch(() => ({ providers: [] })),
        ]);
        if (mounted) {
          setCategories(Array.isArray(catsRes) ? catsRes : []);
          const raw = provRes?.providers ?? provRes?.data ?? provRes;
          const list = Array.isArray(raw) ? raw : [];
          const filtered = list.filter((p) => p.is_active !== false).slice(0, 12);
          setProvidersData(filtered);
        }
      } catch (_) {
        if (mounted) setProvidersData([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const fromApi = providersData ?? [];
  const featuredProviders = fromApi.length > 0 ? fromApi : FICTITIOUS_FEATURED_PROVIDERS;
  const categoryMap = useMemo(() => {
    const m = {};
    categories.forEach((c) => { m[c.id] = c.name; });
    return m;
  }, [categories]);

  const marketplaceStats = useMemo(() => {
    const ratings = featuredProviders
      .map((p) => Number(p.average_rating))
      .filter((n) => Number.isFinite(n) && n > 0);
    const avgRating = ratings.length > 0
      ? (ratings.reduce((sum, n) => sum + n, 0) / ratings.length).toFixed(1)
      : null;
    const cityCount = new Set(
      featuredProviders.map((p) => (p.city || '').trim()).filter(Boolean)
    ).size;
    return [
      { v: String(categories.length || 0), l: 'Categories' },
      { v: `${featuredProviders.length}+`, l: 'Profils visibles' },
      { v: `${cityCount || 1}+`, l: 'Villes couvertes' },
      { v: avgRating ? `${avgRating}/5` : '-', l: 'Note moyenne' },
    ];
  }, [categories.length, featuredProviders]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Retour</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHead}>
          <View>
            <Text style={styles.sectionTitle}>Prestataires en Vedette</Text>
            <Text style={styles.sectionSubtitle}>Les professionnels les mieux notés</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#3b82f6" />
          </View>
        ) : (
          <View style={styles.grid}>
            {featuredProviders.map((p) => (
              <ProviderCard
                key={p.id}
                provider={p}
                categoryName={
                  categoryMap[p.category_id] ||
                  p.category_name ||
                  p.service_category ||
                  ''
                }
              />
            ))}
          </View>
        )}

        <View style={styles.ctaSection}>
          <View style={styles.ctaBlur1} />
          <View style={styles.ctaBlur2} />
          <View style={styles.ctaContent}>
            <View style={styles.ctaLeft}>
              <Text style={styles.ctaTitle}>
                Vous êtes un professionnel ?{'\n'}
                <Text style={styles.ctaTitleHighlight}>Rejoignez AfriWonder !</Text>
              </Text>
              <Text style={styles.ctaSubtitle}>
                Augmentez votre visibilité et trouvez de nouveaux clients.
              </Text>
              <TouchableOpacity style={styles.ctaButton} onPress={() => navigation.navigate('BecomeProvider')}>
                <Ionicons name="business" size={20} color="#fff" />
                <Text style={styles.ctaButtonText}>Devenir Prestataire</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.statsGrid}>
              {marketplaceStats.map((s, i) => (
                <View key={i} style={styles.statBox}>
                  <Text style={styles.statValue}>{s.v}</Text>
                  <Text style={styles.statLabel}>{s.l}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitle: { fontSize: 16, fontWeight: '500', color: '#111827' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  sectionTitle: { fontSize: 24, fontWeight: '700', color: '#111827' },
  sectionSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center' },
  seeAllText: { fontSize: 15, fontWeight: '600', color: '#1d4ed8', marginRight: 4 },
  loadingWrap: { paddingVertical: 40, alignItems: 'center' },
  grid: { marginBottom: 32 },
  ctaSection: {
    backgroundColor: '#1f2937',
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  ctaBlur1: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  ctaBlur2: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  ctaContent: { position: 'relative' },
  ctaLeft: { marginBottom: 20 },
  ctaTitle: { fontSize: 22, fontWeight: '700', color: '#fff', lineHeight: 30 },
  ctaTitleHighlight: { color: '#3b82f6' },
  ctaSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 12 },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  ctaButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.5)',
  },
  statValue: { fontSize: 22, fontWeight: '700', color: '#3b82f6' },
  statLabel: { fontSize: 13, color: '#fff', marginTop: 4 },
});
