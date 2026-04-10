import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const DAILY_CHALLENGES = [
  { id: 'd1', title: 'Regarder 5 videos', progress: 3, target: 5, reward: 50, icon: 'play-circle' },
  { id: 'd2', title: 'Partager une video', progress: 1, target: 1, reward: 30, icon: 'share-social', done: true },
  { id: 'd3', title: 'Commenter 3 videos', progress: 1, target: 3, reward: 40, icon: 'chatbubble' },
  { id: 'd4', title: 'Inviter un ami', progress: 0, target: 1, reward: 100, icon: 'person-add' },
];

const WEEKLY = [
  { id: 'w1', title: 'Acheter sur le marketplace', progress: 0, target: 1, reward: 200, icon: 'cart' },
  { id: 'w2', title: 'Creer 3 videos', progress: 1, target: 3, reward: 300, icon: 'videocam' },
  { id: 'w3', title: 'Recharger votre wallet', progress: 1, target: 1, reward: 150, icon: 'wallet', done: true },
];

export default function ChallengesScreen() {
  const insets = useSafeAreaInsets();

  const renderChallenge = (challenge: any) => {
    const progress = Math.min((challenge.progress / challenge.target) * 100, 100);
    return (
      <View key={challenge.id} style={[styles.challengeCard, challenge.done && styles.challengeCardDone]}>
        <View style={[styles.challengeIcon, challenge.done && styles.challengeIconDone]}>
          {challenge.done ? <Ionicons name="checkmark" size={22} color={Colors.text} /> : <Ionicons name={challenge.icon} size={22} color={Colors.primary} />}
        </View>
        <View style={styles.challengeInfo}>
          <Text style={styles.challengeTitle}>{challenge.title}</Text>
          <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
          <Text style={styles.challengeProgress}>{challenge.progress}/{challenge.target}</Text>
        </View>
        <View style={styles.rewardBadge}>
          <Ionicons name="gift" size={14} color={Colors.accent} />
          <Text style={styles.rewardText}>{challenge.reward}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Defis</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Points Card */}
        <View style={styles.pointsCard}>
          <Ionicons name="trophy" size={40} color={Colors.accent} />
          <Text style={styles.pointsValue}>1 250</Text>
          <Text style={styles.pointsLabel}>Points gagnes ce mois</Text>
        </View>

        <Text style={styles.sectionTitle}>Defis quotidiens</Text>
        {DAILY_CHALLENGES.map(renderChallenge)}

        <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Defis hebdomadaires</Text>
        {WEEKLY.map(renderChallenge)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  pointsCard: { alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xxl, marginBottom: Spacing.xxl },
  pointsValue: { color: Colors.accent, fontSize: 36, fontWeight: 'bold', marginTop: Spacing.sm },
  pointsLabel: { color: Colors.textSecondary, fontSize: FontSizes.md },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md },
  challengeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.sm, gap: Spacing.md },
  challengeCardDone: { borderWidth: 1, borderColor: Colors.success, opacity: 0.8 },
  challengeIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  challengeIconDone: { backgroundColor: Colors.success },
  challengeInfo: { flex: 1 },
  challengeTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '500', marginBottom: 4 },
  progressBar: { height: 4, backgroundColor: Colors.border, borderRadius: 2, marginBottom: 2 },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  challengeProgress: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  rewardBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.accent + '20', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  rewardText: { color: Colors.accent, fontSize: FontSizes.sm, fontWeight: 'bold' },
});
