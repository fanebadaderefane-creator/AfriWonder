import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Share } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const REFERRAL_CODE = 'AFRI-MOUS-2025';
const REWARDS = [
  { level: 1, target: 5, reward: '500 FCFA', achieved: true },
  { level: 2, target: 15, reward: '2 000 FCFA', achieved: true },
  { level: 3, target: 30, reward: '5 000 FCFA', achieved: false },
  { level: 4, target: 50, reward: '10 000 FCFA + Badge Or', achieved: false },
];

const RECENT_REFERRALS = [
  { name: 'Aminata D.', date: 'Il y a 2 jours', status: 'Inscrit', reward: '+100 FCFA' },
  { name: 'Moussa K.', date: 'Il y a 5 jours', status: 'Premiere commande', reward: '+500 FCFA' },
  { name: 'Fanta C.', date: 'Il y a 1 semaine', status: 'Inscrit', reward: '+100 FCFA' },
];

export default function ReferralsScreen() {
  const insets = useSafeAreaInsets();

  const handleShare = async () => {
    try {
      await Share.share({ message: `Rejoins AfriWonder avec mon code ${REFERRAL_CODE} et recois 500 FCFA de bonus! Telecharge: https://afriwonder.com/dl` });
    } catch (e) {}
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Parrainage</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>18</Text>
            <Text style={styles.statLabel}>Filleuls</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>2 600</Text>
            <Text style={styles.statLabel}>FCFA gagnes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>Niveau 2</Text>
            <Text style={styles.statLabel}>Rang</Text>
          </View>
        </View>

        {/* Referral Code */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Votre code de parrainage</Text>
          <View style={styles.codeRow}>
            <Text style={styles.codeText}>{REFERRAL_CODE}</Text>
            <TouchableOpacity style={styles.copyBtn}><Ionicons name="copy" size={20} color={Colors.primary} /></TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-social" size={20} color={Colors.text} />
            <Text style={styles.shareButtonText}>Partager</Text>
          </TouchableOpacity>
        </View>

        {/* Reward Levels */}
        <Text style={styles.sectionTitle}>Niveaux de recompenses</Text>
        {REWARDS.map((reward, i) => (
          <View key={i} style={[styles.rewardCard, reward.achieved && styles.rewardCardAchieved]}>
            <View style={[styles.rewardLevel, reward.achieved && styles.rewardLevelDone]}>
              {reward.achieved ? <Ionicons name="checkmark" size={16} color={Colors.text} /> : <Text style={styles.rewardLevelText}>{reward.level}</Text>}
            </View>
            <View style={styles.rewardInfo}>
              <Text style={styles.rewardTarget}>{reward.target} filleuls</Text>
              <Text style={styles.rewardAmount}>{reward.reward}</Text>
            </View>
          </View>
        ))}

        {/* Recent */}
        <Text style={styles.sectionTitle}>Filleuls recents</Text>
        {RECENT_REFERRALS.map((ref, i) => (
          <View key={i} style={styles.referralItem}>
            <View style={styles.referralAvatar}><Ionicons name="person" size={20} color={Colors.textSecondary} /></View>
            <View style={styles.referralInfo}>
              <Text style={styles.referralName}>{ref.name}</Text>
              <Text style={styles.referralDate}>{ref.date} - {ref.status}</Text>
            </View>
            <Text style={styles.referralReward}>{ref.reward}</Text>
          </View>
        ))}
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
  statsCard: { flexDirection: 'row', backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, padding: Spacing.xl, marginBottom: Spacing.xxl },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: Colors.text, fontSize: FontSizes.xxl, fontWeight: 'bold' },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: FontSizes.sm },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  codeCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.xl, marginBottom: Spacing.xxl },
  codeLabel: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginBottom: Spacing.sm },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  codeText: { color: Colors.text, fontSize: FontSizes.xxl, fontWeight: 'bold', letterSpacing: 2 },
  copyBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  shareButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: Spacing.md },
  shareButtonText: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md },
  rewardCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.sm, gap: Spacing.md },
  rewardCardAchieved: { borderWidth: 1, borderColor: Colors.success },
  rewardLevel: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  rewardLevelDone: { backgroundColor: Colors.success },
  rewardLevelText: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: 'bold' },
  rewardInfo: { flex: 1 },
  rewardTarget: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '500' },
  rewardAmount: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: '600' },
  referralItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.sm, gap: Spacing.md },
  referralAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  referralInfo: { flex: 1 },
  referralName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '500' },
  referralDate: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  referralReward: { color: Colors.success, fontSize: FontSizes.md, fontWeight: 'bold' },
});
