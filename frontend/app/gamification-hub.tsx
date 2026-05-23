import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { useAuthStore } from '../src/store/authStore';
import { fetchGamificationMe, fetchDailyMissions } from '../src/api/gamificationApi';

export default function GamificationHubScreen() {
  const insets = useSafeAreaInsets();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const meQuery = useQuery({
    queryKey: ['gamification', 'me'],
    queryFn: fetchGamificationMe,
    enabled: isAuthenticated,
  });

  const missionsQuery = useQuery({
    queryKey: ['gamification', 'daily-missions'],
    queryFn: fetchDailyMissions,
    enabled: isAuthenticated,
  });

  const refresh = () => {
    void meQuery.refetch();
    void missionsQuery.refetch();
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Gamification</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.muted}>Connectez-vous pour suivre vos points, niveaux et missions quotidiennes (même backend que la PWA).</Text>
        </View>
      </View>
    );
  }

  const me = meQuery.data;
  const missions = missionsQuery.data ?? [];
  const progress = Math.min(100, Math.round(me?.next_level_progress ?? 0));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Gamification</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.xxl }]}
        refreshControl={
          <RefreshControl
            refreshing={meQuery.isRefetching || missionsQuery.isRefetching}
            onRefresh={refresh}
            tintColor="#fff"
          />
        }
      >
        {meQuery.isPending ? <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.lg }} /> : null}

        <View style={styles.hero}>
          <Ionicons name="trophy" size={40} color={Colors.accent} />
          <Text style={styles.points}>{(me?.total_points ?? 0).toLocaleString('fr-FR')} pts</Text>
          <Text style={styles.level}>Niveau {me?.level ?? 1}</Text>
          <Text style={styles.lifetime}>Total vie : {(me?.lifetime_points ?? 0).toLocaleString('fr-FR')} pts</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            Progression niveau suivant : {progress}%
          </Text>
        </View>

        <Text style={styles.section}>Missions du jour</Text>
        {missionsQuery.isPending ? <ActivityIndicator color={Colors.primary} /> : null}
        {missions.map((m) => (
          <View key={m.type} style={[styles.missionRow, m.completed && styles.missionDone]}>
            <Text style={styles.missionIcon}>{m.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.missionLabel}>{m.label}</Text>
              <Text style={styles.missionXp}>+{m.xp} XP</Text>
            </View>
            {m.completed ? (
              <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
            ) : (
              <Ionicons name="ellipse-outline" size={24} color={Colors.textMuted} />
            )}
          </View>
        ))}

        <TouchableOpacityRow />
      </ScrollView>
    </View>
  );
}

function TouchableOpacityRow() {
  return (
    <View style={styles.links}>
      <Pressable style={styles.linkBtn} onPress={() => router.push('/badges-profile')}>
        <Ionicons name="ribbon-outline" size={20} color={Colors.text} />
        <Text style={styles.linkText}>Mes badges</Text>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </Pressable>
      <Pressable style={styles.linkBtn} onPress={() => router.push('/leaderboard')}>
        <Ionicons name="bar-chart-outline" size={20} color={Colors.text} />
        <Text style={styles.linkText}>Classement public</Text>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </Pressable>
      <Pressable style={styles.linkBtn} onPress={() => router.push('/challenges')}>
        <Ionicons name="flag-outline" size={20} color={Colors.text} />
        <Text style={styles.linkText}>Défis et missions</Text>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </Pressable>
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
  scroll: { paddingHorizontal: Spacing.xl },
  hero: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    marginBottom: Spacing.xl,
  },
  points: { color: Colors.text, fontSize: 32, fontWeight: '900', marginTop: Spacing.sm },
  level: { color: Colors.accent, fontSize: FontSizes.lg, fontWeight: '700', marginTop: 4 },
  lifetime: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: Spacing.sm },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.card,
    marginTop: Spacing.lg,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  progressLabel: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: Spacing.sm },
  section: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },
  missionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  missionDone: { opacity: 0.85, borderWidth: 1, borderColor: 'rgba(76,175,80,0.35)' },
  missionIcon: { fontSize: 22 },
  missionLabel: { color: Colors.text, fontWeight: '600', fontSize: FontSizes.md },
  missionXp: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2 },
  links: { marginTop: Spacing.xl, gap: Spacing.sm },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.card,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  linkText: { flex: 1, color: Colors.text, fontWeight: '600', fontSize: FontSizes.md },
  center: { flex: 1, padding: Spacing.xl, justifyContent: 'center' },
  muted: { color: Colors.textSecondary, fontSize: FontSizes.md, lineHeight: 22 },
});
