import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { fetchLeaderboard, type LeaderboardEntry } from '../src/api/gamificationApi';

const RANGES = [
  { id: 'all', label: 'Tous' },
  { id: 'weekly', label: '7 j.' },
  { id: 'monthly', label: '30 j.' },
  { id: 'annual', label: '1 an' },
] as const;

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const [range, setRange] = useState<string>('all');

  const lbQuery = useQuery({
    queryKey: ['leaderboard', range],
    queryFn: () => fetchLeaderboard({ range, limit: 50 }),
  });

  const rows: LeaderboardEntry[] = lbQuery.data?.leaderboard ?? [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Classement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rangeRow}>
        {RANGES.map((r) => (
          <Pressable
            key={r.id}
            onPress={() => setRange(r.id)}
            style={[styles.rangeChip, range === r.id && styles.rangeChipActive]}
          >
            <Text style={[styles.rangeText, range === r.id && styles.rangeTextActive]}>{r.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.xxl }]}
        refreshControl={
          <RefreshControl refreshing={lbQuery.isRefetching} onRefresh={() => void lbQuery.refetch()} tintColor="#fff" />
        }
      >
        {lbQuery.isPending ? <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} /> : null}
        {!lbQuery.isPending && rows.length === 0 ? (
          <Text style={styles.muted}>Aucune donnée de classement pour cette période.</Text>
        ) : null}
        {rows.map((row) => (
          <View key={row.user_id} style={styles.row}>
            <Text style={styles.rank}>#{row.rank}</Text>
            {row.user_avatar ? (
              <Image source={{ uri: row.user_avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPh]}>
                <Ionicons name="person" size={18} color={Colors.textMuted} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{row.user_name}</Text>
              <Text style={styles.sub}>Niveau {row.level} · {row.badges_count ?? 0} badges</Text>
            </View>
            <Text style={styles.points}>{row.total_points?.toLocaleString('fr-FR') ?? 0} pts</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text },
  rangeRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.md },
  rangeChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surface,
    marginRight: Spacing.sm,
  },
  rangeChipActive: { backgroundColor: Colors.primary },
  rangeText: { color: Colors.textSecondary, fontWeight: '700', fontSize: FontSizes.sm },
  rangeTextActive: { color: '#fff' },
  scroll: { paddingHorizontal: Spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  rank: { width: 36, color: Colors.accent, fontWeight: '800', fontSize: FontSizes.md },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPh: { backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center' },
  name: { color: Colors.text, fontWeight: '700', fontSize: FontSizes.md },
  sub: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2 },
  points: { color: Colors.primary, fontWeight: '800', fontSize: FontSizes.sm },
  muted: { color: Colors.textSecondary, marginTop: Spacing.lg, fontSize: FontSizes.md },
});
