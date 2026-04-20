import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../../src/api/client';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../../src/theme/colors';

function normalizeId(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) return String(raw[0] ?? '').trim();
  return String(raw ?? '').trim();
}

export default function LiveAnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { id: rawId } = useLocalSearchParams<{ id?: string | string[] }>();
  const liveId = normalizeId(rawId);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    if (!liveId) {
      setErr('Live introuvable');
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await apiClient.get(`/live/${encodeURIComponent(liveId)}/analytics`);
      const d = (res.data?.data ?? res.data) as Record<string, unknown> | null;
      setPayload(d && typeof d === 'object' ? d : null);
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { error?: string; message?: string }; status?: number } };
      const msg =
        ax.response?.status === 403 || ax.response?.status === 401
          ? 'Réservé au créateur de ce live.'
          : String(ax.response?.data?.error || ax.response?.data?.message || 'Impossible de charger les analytics');
      setErr(msg);
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [liveId]);

  useEffect(() => {
    void load();
  }, [load]);

  const stream = (payload?.stream as Record<string, unknown> | undefined) || {};
  const analytics = (payload?.analytics as Record<string, unknown> | null | undefined) || null;
  const topDonors = Array.isArray(payload?.topDonors) ? (payload?.topDonors as Record<string, unknown>[]) : [];
  const countries = analytics?.viewer_countries;
  const cities = analytics?.viewer_cities;
  const retentionBuckets = useMemo(() => {
    const raw = analytics?.retention_buckets;
    if (!Array.isArray(raw)) return [] as { min?: number; max?: number; count?: number }[];
    return raw as { min?: number; max?: number; count?: number }[];
  }, [analytics?.retention_buckets]);
  const maxBucketCount = useMemo(
    () => Math.max(1, ...retentionBuckets.map((b) => Math.max(0, Number(b.count) || 0))),
    [retentionBuckets],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics live</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : err ? (
        <View style={styles.centered}>
          <Text style={styles.err}>{err}</Text>
          <TouchableOpacity style={styles.retry} onPress={() => void load()}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.streamTitle}>{String(stream.title || 'Live')}</Text>
          <Text style={styles.meta}>
            Durée (enregistrée) : {String(stream.duration_minutes ?? '—')} min · Cadeaux cumulés :{' '}
            {String(stream.total_gifts_amount ?? '—')}
          </Text>

          {analytics ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Agrégats</Text>
              <Text style={styles.line}>Spectateurs (total) : {String(analytics.total_viewers ?? '—')}</Text>
              <Text style={styles.line}>Pic spectateurs : {String(analytics.peak_viewers ?? '—')}</Text>
              <Text style={styles.line}>Spectateurs uniques : {String(analytics.unique_viewers ?? '—')}</Text>
              <Text style={styles.line}>Valeur cadeaux : {String(analytics.total_gifts_value ?? '—')}</Text>
              <Text style={styles.line}>Messages : {String(analytics.total_messages ?? '—')}</Text>
              <Text style={styles.line}>Likes : {String(analytics.total_likes ?? '—')}</Text>
              <Text style={styles.line}>Durée (s) : {String(analytics.duration_seconds ?? '—')}</Text>
              <Text style={styles.line}>Temps de visionnage moyen (s) : {String(analytics.average_watch_time_seconds ?? '—')}</Text>
            </View>
          ) : (
            <Text style={styles.muted}>Pas encore d’enregistrement analytics pour ce live (données après traitement).</Text>
          )}

          {countries != null ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Pays (JSON)</Text>
              <Text style={styles.mono} selectable>
                {typeof countries === 'string' ? countries : JSON.stringify(countries, null, 2)}
              </Text>
            </View>
          ) : null}

          {cities != null ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Villes (agrégat)</Text>
              <Text style={styles.mono} selectable>
                {typeof cities === 'string' ? cities : JSON.stringify(cities, null, 2)}
              </Text>
            </View>
          ) : null}

          {retentionBuckets.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Rétention (histogramme)</Text>
              {retentionBuckets.map((b, i) => {
                const c = Math.max(0, Number(b.count) || 0);
                const label =
                  b.max === -1 || b.max == null
                    ? `${b.min ?? 0}s et +`
                    : `${b.min ?? 0}–${b.max ?? 0}s`;
                const rest = Math.max(0, maxBucketCount - c);
                return (
                  <View key={i} style={styles.bucketRow}>
                    <Text style={styles.bucketLabel}>{label}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { flex: c || 0.001 }]} />
                      <View style={{ flex: rest || 0.001 }} />
                    </View>
                    <Text style={styles.bucketCount}>{c}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          {topDonors.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Top donateurs (extrait)</Text>
              {topDonors.map((d, i) => (
                <Text key={i} style={styles.line}>
                  {String(d.rank ?? i + 1)}. {String(d.sender_name ?? d.user_id ?? '?')} —{' '}
                  {String(d.total_amount_fcfa ?? d.total_amount ?? 0)} FCFA
                </Text>
              ))}
            </View>
          ) : null}
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.text },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  err: { color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.md },
  retry: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  retryText: { color: '#FFF', fontWeight: '800' },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  streamTitle: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  meta: { color: Colors.textSecondary, marginBottom: Spacing.lg, lineHeight: 20 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: { fontWeight: '800', color: Colors.text, marginBottom: Spacing.sm, fontSize: FontSizes.md },
  line: { color: Colors.text, marginBottom: 6, fontSize: FontSizes.sm },
  muted: { color: Colors.textMuted, marginBottom: Spacing.lg },
  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 11,
    color: Colors.textSecondary,
  },
  bucketRow: { marginBottom: 12 },
  bucketLabel: { color: Colors.textMuted, fontSize: 11, marginBottom: 4 },
  barTrack: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: Colors.border,
  },
  barFill: { backgroundColor: Colors.primary },
  bucketCount: { color: Colors.text, fontSize: 11, marginTop: 4, fontWeight: '700' },
});
