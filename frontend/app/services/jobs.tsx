import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
import jobsApi, { Job } from '../../src/api/jobsApi';

const TYPE_LABELS: Record<string, string> = {
  full_time: 'CDI',
  part_time: 'Temps partiel',
  contract: 'CDD',
  internship: 'Stage',
  freelance: 'Freelance',
};

export default function JobsScreen() {
  if (!featureFlags.servicesHub) {
    return <ComingSoonScreen title="Emplois" description="La place de marché des emplois sera bientôt disponible." icon="briefcase-outline" />;
  }
  return <JobsContent />;
}

function JobsContent() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const list = await jobsApi.list({
        page: 1,
        limit: 30,
        search: search.trim() || undefined,
      });
      setJobs(list);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Impossible de charger les offres.';
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

  function formatSalary(j: Job): string {
    const cur = j.currency ?? 'FCFA';
    if (j.salary_min && j.salary_max) return `${j.salary_min.toLocaleString()} - ${j.salary_max.toLocaleString()} ${cur}`;
    if (j.salary_min) return `À partir de ${j.salary_min.toLocaleString()} ${cur}`;
    if (j.salary_max) return `Jusqu'à ${j.salary_max.toLocaleString()} ${cur}`;
    return 'Salaire à négocier';
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emplois</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Poste, entreprise, ville..."
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
          <Text style={styles.errorTitle}>Offres indisponibles</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : jobs.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="briefcase-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Aucune offre</Text>
          <Text style={styles.emptyText}>Aucune offre d'emploi disponible pour cette recherche.</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {jobs.map((j) => (
            <TouchableOpacity
              key={j.id}
              style={styles.card}
              onPress={() => router.push(`/services/job/${j.id}` as any)}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{j.title}</Text>
                  {j.company ? <Text style={styles.cardCompany}>{j.company}</Text> : null}
                </View>
                {j.type ? (
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeText}>{TYPE_LABELS[j.type] ?? j.type}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.cardMeta}>
                {j.location || j.city ? (
                  <Text style={styles.metaText}>
                    <Ionicons name="location-outline" size={12} color={Colors.textSecondary} /> {j.location ?? j.city}
                  </Text>
                ) : null}
                {j.remote ? (
                  <Text style={[styles.metaText, { color: Colors.success }]}>
                    <Ionicons name="laptop-outline" size={12} color={Colors.success} /> Télétravail
                  </Text>
                ) : null}
              </View>
              <Text style={styles.salary}>{formatSalary(j)}</Text>
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
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  cardTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  cardCompany: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  typeBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  typeText: { color: Colors.primary, fontSize: FontSizes.xs, fontWeight: '600' },
  cardMeta: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.md },
  metaText: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  salary: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: 'bold', marginTop: Spacing.md },
});
