import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSizes } from '../src/theme/colors';
import apiClient from '../src/api/client';

type ChallengeRow = {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  hashtag?: string;
  status?: string;
  is_sponsored?: boolean;
  sponsor_brand?: string;
  participation_count?: number;
};

type ChallengeSection = { title: string; data: ChallengeRow[] };

export default function ChallengesScreen() {
  const insets = useSafeAreaInsets();
  const [sections, setSections] = useState<ChallengeSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [viralRes, paidRes] = await Promise.all([
        apiClient.get('/challenges/viral/trending', { params: { limit: 20 } }).catch(() => null),
        apiClient.get('/challenges', { params: { page: 1, limit: 40 } }).catch(() => null),
      ]);
      const viralInner = viralRes?.data?.data ?? viralRes?.data;
      const viralList = Array.isArray(viralInner) ? viralInner : [];
      const paidInner = paidRes?.data?.data ?? paidRes?.data;
      const paidList = paidInner?.challenges ?? paidInner?.data ?? paidInner ?? [];
      const paidArr = Array.isArray(paidList) ? paidList : [];
      const next: ChallengeSection[] = [];
      if (viralList.length) next.push({ title: 'Challenges viraux (#hashtag)', data: viralList });
      if (paidArr.length) next.push({ title: 'Défis & programmes', data: paidArr });
      setSections(next);
    } catch {
      setError('Impossible de charger les défis. Réessayez.');
      setSections([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const openChallengeSearch = (item: ChallengeRow) => {
    const title = String(item.title || item.name || '').trim();
    const words = title.split(/\s+/).filter(Boolean);
    const q =
      String(item.hashtag || '')
        .trim()
        .replace(/^#+/, '') || words[0];
    if (!q) return;
    router.push({ pathname: '/search', params: { q: q.startsWith('#') ? q : `#${q}` } });
  };

  const renderItem = ({ item }: { item: ChallengeRow }) => {
    const title = String(item.title || item.name || 'Défi').trim();
    const desc = String(item.description || '').trim();
    const tag =
      String(item.hashtag || '')
        .trim()
        .replace(/^#+/, '') ||
      title.split(/\s+/)[0] ||
      '';
    const sponsored = Boolean(item.is_sponsored);
    const part = item.participation_count;
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => openChallengeSearch(item)}
        accessibilityLabel={`Rechercher le défi ${title}`}
      >
        <View style={styles.cardIcon}>
          <Ionicons name="trophy" size={22} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {title}
          </Text>
          {desc ? (
            <Text style={styles.cardDesc} numberOfLines={2}>
              {desc}
            </Text>
          ) : null}
          {tag ? (
            <Text style={styles.cardTag} numberOfLines={1}>
              #{tag}
            </Text>
          ) : null}
          {sponsored ? (
            <Text style={styles.cardSponsor} numberOfLines={1}>
              Sponsorisé{item.sponsor_brand ? ` · ${item.sponsor_brand}` : ''}
            </Text>
          ) : null}
          {typeof part === 'number' ? <Text style={styles.cardMuted}>{part} participation(s)</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Défis</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.err}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={() => { setLoading(true); void load(); }}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(it) => String(it.id)}
          renderItem={({ item }) => renderItem({ item })}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionTitle}>{title}</Text>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <Text style={styles.empty}>Aucun défi actif — les nouveaux défis apparaîtront ici.</Text>
          }
        />
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  err: { color: Colors.textSecondary, textAlign: 'center' },
  retry: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: BorderRadius.lg, backgroundColor: Colors.surface },
  retryText: { color: Colors.primary, fontWeight: '700' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.md,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,107,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  cardDesc: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 4 },
  cardTag: { color: Colors.primary, fontSize: FontSizes.sm, marginTop: 6, fontWeight: '600' },
  cardSponsor: { color: '#FFB347', fontSize: FontSizes.xs, marginTop: 4, fontWeight: '700' },
  cardMuted: { color: Colors.textMuted, fontSize: FontSizes.sm, marginTop: 6 },
  sectionTitle: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '800',
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  empty: { textAlign: 'center', color: Colors.textMuted, marginTop: 40, paddingHorizontal: 24 },
});
