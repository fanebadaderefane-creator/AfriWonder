import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, ActivityIndicator, Alert } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import apiClient from '../src/api/client';

type ReferralReward = {
  invites_count?: number;
  reward_type?: string;
  reward_value?: string;
};

type ReferralRow = {
  id?: string;
  status?: string;
  created_at?: string;
  referred?: {
    username?: string | null;
    email?: string | null;
  } | null;
};

export default function ReferralsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [completedReferrals, setCompletedReferrals] = useState(0);
  const [rewards, setRewards] = useState<ReferralReward[]>([]);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await apiClient.get('/referrals/stats');
        const data = res.data?.data ?? res.data;
        setCode(String(data?.code ?? ''));
        setTotalReferrals(Number(data?.totalReferrals ?? 0));
        setCompletedReferrals(Number(data?.completedReferrals ?? 0));
        setRewards(Array.isArray(data?.rewards) ? data.rewards : []);
        setReferrals(Array.isArray(data?.referrals) ? data.referrals : []);
      } catch (_error) {
        Alert.alert('Parrainage', 'Impossible de charger vos statistiques de parrainage.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const currentLevel = useMemo(() => {
    return rewards.length > 0 ? rewards.length : 0;
  }, [rewards]);

  const handleShare = async () => {
    try {
      await Share.share({ message: `Rejoins AfriWonder avec mon code ${code} et découvre AfriWonder : https://afriwonder.com/dl` });
    } catch {}
  };

  const handleCopy = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    Alert.alert('Parrainage', 'Code copié.');
  };

  const rewardLabel = (reward: ReferralReward) => {
    if (reward.reward_value) return reward.reward_value;
    if (reward.reward_type) return reward.reward_type;
    return 'Récompense';
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

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
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalReferrals}</Text>
            <Text style={styles.statLabel}>Filleuls</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{completedReferrals}</Text>
            <Text style={styles.statLabel}>Complétés</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>Niveau {currentLevel}</Text>
            <Text style={styles.statLabel}>Rang</Text>
          </View>
        </View>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Votre code de parrainage</Text>
          <View style={styles.codeRow}>
            <Text style={styles.codeText}>{code || 'INDISPONIBLE'}</Text>
            <TouchableOpacity style={styles.copyBtn} onPress={() => void handleCopy()}>
              <Ionicons name="copy" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.shareButton} onPress={() => void handleShare()} disabled={!code}>
            <Ionicons name="share-social" size={20} color={Colors.text} />
            <Text style={styles.shareButtonText}>Partager</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Niveaux de recompenses</Text>
        {rewards.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aucune récompense débloquée pour le moment.</Text>
          </View>
        ) : rewards.map((reward, i) => (
          <View key={`${reward.reward_type ?? 'reward'}-${i}`} style={[styles.rewardCard, styles.rewardCardAchieved]}>
            <View style={[styles.rewardLevel, styles.rewardLevelDone]}>
              <Ionicons name="checkmark" size={16} color={Colors.text} />
            </View>
            <View style={styles.rewardInfo}>
              <Text style={styles.rewardTarget}>{reward.invites_count ?? 0} filleuls</Text>
              <Text style={styles.rewardAmount}>{rewardLabel(reward)}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Filleuls recents</Text>
        {referrals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aucun filleul enregistré pour l’instant.</Text>
          </View>
        ) : referrals.map((ref, i) => (
          <View key={`${ref.id ?? 'ref'}-${i}`} style={styles.referralItem}>
            <View style={styles.referralAvatar}><Ionicons name="person" size={20} color={Colors.textSecondary} /></View>
            <View style={styles.referralInfo}>
              <Text style={styles.referralName}>{ref.referred?.username || ref.referred?.email || 'Utilisateur'}</Text>
              <Text style={styles.referralDate}>
                {ref.status === 'completed' ? 'Complété' : 'En attente'}
                {ref.created_at ? ` - ${new Date(ref.created_at).toLocaleDateString('fr-FR')}` : ''}
              </Text>
            </View>
            <Text style={styles.referralReward}>{ref.status === 'completed' ? 'OK' : '...'}</Text>
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
  emptyCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.md },
  emptyText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
});
