import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { useAuthStore } from '../src/store/authStore';
import { fetchGamificationMe, type UserBadgeRow } from '../src/api/gamificationApi';

function BadgeIcon({ row }: { row: UserBadgeRow }) {
  const raw = row.badge_icon?.trim() || '🏅';
  if (raw.endsWith('-outline') || raw.endsWith('-sharp')) {
    return <Ionicons name={raw as keyof typeof Ionicons.glyphMap} size={28} color={Colors.accent} />;
  }
  return <Text style={styles.emojiIcon}>{raw}</Text>;
}

export default function BadgesProfileScreen() {
  const insets = useSafeAreaInsets();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const meQuery = useQuery({
    queryKey: ['gamification', 'me'],
    queryFn: fetchGamificationMe,
    enabled: isAuthenticated,
  });

  const badges = meQuery.data?.badges ?? [];

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Mes badges</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.muted}>Connectez-vous pour voir vos badges débloqués sur le même compte que la PWA.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Mes badges</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {meQuery.data?.badges_count ?? badges.length} badge{(meQuery.data?.badges_count ?? badges.length) !== 1 ? 's' : ''}
        </Text>
        {meQuery.isFetching ? <ActivityIndicator color={Colors.primary} size="small" /> : null}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.xxl }]}
        refreshControl={
          <RefreshControl refreshing={meQuery.isRefetching} onRefresh={() => void meQuery.refetch()} tintColor="#fff" />
        }
      >
        {meQuery.isPending ? <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} /> : null}
        {!meQuery.isPending && badges.length === 0 ? (
          <Text style={styles.muted}>Aucun badge pour l’instant. Interagissez sur le feed pour en gagner.</Text>
        ) : null}
        {badges.map((b) => (
          <View key={b.id} style={styles.card}>
            <View style={styles.iconWrap}>
              <BadgeIcon row={b} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.badgeName}>{b.badge_name}</Text>
              {b.badge_description ? <Text style={styles.badgeDesc}>{b.badge_description}</Text> : null}
              {b.category ? <Text style={styles.badgeCat}>{b.category}</Text> : null}
            </View>
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
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  statsText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  scroll: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
  card: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiIcon: { fontSize: 26 },
  badgeName: { color: Colors.text, fontWeight: '800', fontSize: FontSizes.md },
  badgeDesc: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 4 },
  badgeCat: { color: Colors.accent, fontSize: FontSizes.xs, marginTop: 6, fontWeight: '600' },
  center: { flex: 1, padding: Spacing.xl, justifyContent: 'center' },
  muted: { color: Colors.textSecondary, fontSize: FontSizes.md, lineHeight: 22 },
});
