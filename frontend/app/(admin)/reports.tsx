import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { AdminSubScreenHeader } from '../../src/components/admin/AdminSubScreenHeader';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import apiClient from '../../src/api/client';
import { API_ROUTES } from '../../src/config/api';

type ReportRow = {
  id: string;
  status?: string;
  content_type?: string;
  content_id?: string;
  reason?: string;
  created_at?: string;
  reporter?: { username?: string | null };
};

const FILTERS: { key: string; label: string }[] = [
  { key: '', label: 'Tous' },
  { key: 'pending', label: 'En attente' },
  { key: 'resolved', label: 'Résolus' },
  { key: 'dismissed', label: 'Ignorés' },
];

export default function AdminReportsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('');
  const [reports, setReports] = useState<ReportRow[]>([]);

  const load = useCallback(async () => {
    try {
      const params: Record<string, string | number> = { limit: 80, page: 1 };
      if (filter) params.status = filter;
      const res = await apiClient.get(API_ROUTES.MODERATION_REPORTS, { params });
      const data = res.data?.data ?? res.data;
      const list = (data?.reports ?? []) as ReportRow[];
      setReports(Array.isArray(list) ? list : []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load().finally(() => setRefreshing(false));
  }, [load]);

  return (
    <View style={styles.container}>
      <AdminSubScreenHeader title="Signalements" />
      <View style={styles.chips}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key || 'all'}
            style={[styles.chip, (filter === f.key || (!f.key && !filter)) && styles.chipOn]}
            onPress={() => {
              setFilter(f.key);
              setLoading(true);
            }}
          >
            <Text style={[styles.chipText, (filter === f.key || (!f.key && !filter)) && styles.chipTextOn]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(r) => r.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 48 }}
          ListEmptyComponent={<Text style={styles.empty}>Aucun signalement.</Text>}
          renderItem={({ item: r }) => (
            <View style={styles.card}>
              <Text style={styles.badge}>{r.status || '—'}</Text>
              <Text style={styles.type}>
                {r.content_type || 'contenu'} · {r.content_id?.slice(0, 10) || '—'}
              </Text>
              <Text style={styles.reason}>{r.reason || '—'}</Text>
              <Text style={styles.meta}>@{r.reporter?.username || '?'}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipOn: { backgroundColor: Colors.primary + '33', borderColor: Colors.primary },
  chipText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  chipTextOn: { color: Colors.primary, fontWeight: '700' },
  empty: { color: Colors.textMuted, textAlign: 'center', marginTop: 24 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  badge: { fontSize: FontSizes.xs, color: Colors.primary, fontWeight: '700', marginBottom: 4 },
  type: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  reason: { fontSize: FontSizes.md, color: Colors.text, marginTop: Spacing.sm },
  meta: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: Spacing.xs },
});
