import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../src/store/authStore';
import { fetchDailyMissions, fetchGamificationMe, type DailyMission } from '../src/api/gamificationApi';

function MissionRow({ m }: { m: DailyMission }) {
  return (
    <View style={[styles.challengeCard, m.completed && styles.challengeCardDone]}>
      <View style={[styles.challengeIcon, m.completed && styles.challengeIconDone]}>
        {m.completed ? (
          <Ionicons name="checkmark" size={22} color={Colors.text} />
        ) : (
          <Text style={styles.missionEmoji}>{m.icon}</Text>
        )}
      </View>
      <View style={styles.challengeInfo}>
        <Text style={styles.challengeTitle}>{m.label}</Text>
        <Text style={styles.challengeProgress}>{m.completed ? 'Terminé' : `+${m.xp} XP`}</Text>
      </View>
      <View style={styles.rewardBadge}>
        <Ionicons name="gift" size={14} color={Colors.accent} />
        <Text style={styles.rewardText}>{m.xp}</Text>
      </View>
    </View>
  );
}

export default function ChallengesScreen() {
  const insets = useSafeAreaInsets();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const meQuery = useQuery({
    queryKey: ['gamification', 'me', 'challenges'],
    queryFn: fetchGamificationMe,
    enabled: isAuthenticated,
  });

  const missionsQuery = useQuery({
    queryKey: ['gamification', 'daily-missions', 'challenges'],
    queryFn: fetchDailyMissions,
    enabled: isAuthenticated,
  });

  const missions = missionsQuery.data ?? [];
  const points = meQuery.data?.total_points ?? 0;
  const level = meQuery.data?.level ?? 1;

  const refresh = () => {
    void meQuery.refetch();
    void missionsQuery.refetch();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Défis</Text>
        <View style={{ width: 40 }} />
      </View>

      {!isAuthenticated ? (
        <View style={styles.centered}>
          <Text style={styles.muted}>Connectez-vous pour voir vos missions quotidiennes et vos points (même compte que la PWA).</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxxl }]}
          refreshControl={
            <RefreshControl
              refreshing={meQuery.isRefetching || missionsQuery.isRefetching}
              onRefresh={refresh}
              tintColor={Colors.primary}
            />
          }
        >
          {meQuery.isPending || missionsQuery.isPending ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.xl }} />
          ) : null}

          <View style={styles.pointsCard}>
            <Ionicons name="trophy" size={40} color={Colors.accent} />
            <Text style={styles.pointsValue}>{points.toLocaleString('fr-FR')}</Text>
            <Text style={styles.pointsLabel}>Points (niveau {level})</Text>
          </View>

          <Text style={styles.sectionTitle}>Missions du jour</Text>
          {missionsQuery.isError ? (
            <Text style={styles.muted}>Impossible de charger les missions. Tirez pour rafraîchir.</Text>
          ) : missions.length === 0 ? (
            <Text style={styles.muted}>Aucune mission disponible pour le moment.</Text>
          ) : (
            missions.map((m) => <MissionRow key={m.type} m={m} />)
          )}

          <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>Objectifs hebdomadaires</Text>
          <Text style={styles.muted}>
            Les défis hebdomadaires détaillés seront communiqués dans l&apos;application ; vos missions du jour ci-dessus
            sont synchronisées avec le serveur AfriWonder.
          </Text>

          <TouchableOpacity style={styles.hubLink} onPress={() => router.push('/gamification-hub')} activeOpacity={0.85}>
            <Ionicons name="ribbon-outline" size={20} color={Colors.primary} />
            <Text style={styles.hubLinkText}>Centre gamification</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  content: { paddingHorizontal: Spacing.xl },
  centered: { flex: 1, padding: Spacing.xl, justifyContent: 'center' },
  muted: { color: Colors.textSecondary, fontSize: FontSizes.md, lineHeight: 22 },
  pointsCard: { alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xxl, marginBottom: Spacing.xxl },
  pointsValue: { color: Colors.accent, fontSize: 36, fontWeight: 'bold', marginTop: Spacing.sm },
  pointsLabel: { color: Colors.textSecondary, fontSize: FontSizes.md },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md },
  challengeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.sm, gap: Spacing.md },
  challengeCardDone: { opacity: 0.9, borderWidth: 1, borderColor: 'rgba(76,175,80,0.35)' },
  challengeIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center' },
  challengeIconDone: { backgroundColor: 'rgba(76,175,80,0.25)' },
  missionEmoji: { fontSize: 22 },
  challengeInfo: { flex: 1 },
  challengeTitle: { color: Colors.text, fontWeight: '600', fontSize: FontSizes.md },
  challengeProgress: { color: Colors.textMuted, fontSize: FontSizes.sm, marginTop: 4 },
  rewardBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rewardText: { color: Colors.accent, fontWeight: '700', fontSize: FontSizes.sm },
  hubLink: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.xl, padding: Spacing.lg, backgroundColor: Colors.card, borderRadius: BorderRadius.md },
  hubLinkText: { flex: 1, color: Colors.text, fontWeight: '700', fontSize: FontSizes.md },
});
