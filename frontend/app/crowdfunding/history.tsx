import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../src/theme/colors';
import {
  SEED_PROJECTS,
  CROWDFUNDING_CATEGORIES,
  formatFullCFA,
  getProgressPercent,
} from '../../src/data/crowdfunding';

// Mock contributions made by the user
const MY_CONTRIBUTIONS = [
  {
    id: 'mc1',
    project: SEED_PROJECTS[0],
    amount: 25000,
    reward: SEED_PROJECTS[0].rewards[1],
    paymentMethod: 'Orange Money',
    paymentColor: '#FF6600',
    date: '10 Juin 2025, 14:30',
    txId: 'CF-TX8A2B3C',
    status: 'completed' as const,
  },
  {
    id: 'mc2',
    project: SEED_PROJECTS[1],
    amount: 50000,
    reward: SEED_PROJECTS[1].rewards[1],
    paymentMethod: 'Wave',
    paymentColor: '#1DC2F3',
    date: '8 Juin 2025, 10:15',
    txId: 'CF-TX5D6E7F',
    status: 'completed' as const,
  },
  {
    id: 'mc3',
    project: SEED_PROJECTS[3],
    amount: 25000,
    reward: SEED_PROJECTS[3].rewards[1],
    paymentMethod: 'MTN Money',
    paymentColor: '#FFCB05',
    date: '5 Juin 2025, 16:45',
    txId: 'CF-TX1G2H3I',
    status: 'completed' as const,
  },
  {
    id: 'mc4',
    project: SEED_PROJECTS[5],
    amount: 5000,
    reward: SEED_PROJECTS[5].rewards[0],
    paymentMethod: 'Orange Money',
    paymentColor: '#FF6600',
    date: '1 Juin 2025, 09:00',
    txId: 'CF-TX4J5K6L',
    status: 'completed' as const,
  },
  {
    id: 'mc5',
    project: SEED_PROJECTS[7],
    amount: 2500,
    reward: SEED_PROJECTS[7].rewards[0],
    paymentMethod: 'Wave',
    paymentColor: '#1DC2F3',
    date: '28 Mai 2025, 11:20',
    txId: 'CF-TX7M8N9O',
    status: 'completed' as const,
  },
];

const TOTAL_CONTRIBUTED = MY_CONTRIBUTIONS.reduce((sum, c) => sum + c.amount, 0);

export default function ContributionHistoryScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes contributions</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Summary Banner */}
        <View style={styles.summaryBanner}>
          <LinearGradient
            colors={['#FF6B00', '#FF3D00', '#E64A19']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryGradient}
          >
            <View style={styles.summaryIcon}>
              <Ionicons name="heart" size={28} color="rgba(255,255,255,0.3)" />
            </View>
            <Text style={styles.summaryLabel}>Total de mes contributions</Text>
            <Text style={styles.summaryAmount}>{formatFullCFA(TOTAL_CONTRIBUTED)}</Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatValue}>{MY_CONTRIBUTIONS.length}</Text>
                <Text style={styles.summaryStatLabel}>Projets soutenus</Text>
              </View>
              <View style={styles.summaryStatDivider} />
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatValue}>{MY_CONTRIBUTIONS.filter(c => c.reward).length}</Text>
                <Text style={styles.summaryStatLabel}>Recompenses</Text>
              </View>
              <View style={styles.summaryStatDivider} />
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatValue}>100%</Text>
                <Text style={styles.summaryStatLabel}>Confirmes</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Contributions List */}
        <View style={styles.listSection}>
          <Text style={styles.listTitle}>Historique</Text>
          {MY_CONTRIBUTIONS.map(contrib => {
            const catData = CROWDFUNDING_CATEGORIES.find(c => c.id === contrib.project.category);
            const progress = getProgressPercent(contrib.project.raised, contrib.project.goal);
            return (
              <TouchableOpacity
                key={contrib.id}
                style={styles.contributionCard}
                activeOpacity={0.85}
                onPress={() => router.push(`/crowdfunding/${contrib.project.id}` as any)}
              >
                {/* Project info */}
                <View style={styles.contribHeader}>
                  <Image source={{ uri: contrib.project.images[0] }} style={styles.contribImage} />
                  <View style={styles.contribInfo}>
                    <Text style={styles.contribTitle} numberOfLines={1}>{contrib.project.title}</Text>
                    <View style={styles.contribMeta}>
                      <View style={[styles.contribCatBadge, { backgroundColor: (catData?.color || '#FF6B00') + '15' }]}>
                        <Text style={[styles.contribCatText, { color: catData?.color || '#FF6B00' }]}>
                          {catData?.name}
                        </Text>
                      </View>
                      <Text style={styles.contribProgress}>{progress}% finance</Text>
                    </View>
                  </View>
                </View>

                {/* Amount & Payment */}
                <View style={styles.contribAmountSection}>
                  <View style={styles.contribAmountLeft}>
                    <Text style={styles.contribAmount}>{formatFullCFA(contrib.amount)}</Text>
                    <View style={styles.contribPaymentRow}>
                      <View style={[styles.paymentDot, { backgroundColor: contrib.paymentColor }]} />
                      <Text style={styles.contribPayment}>{contrib.paymentMethod}</Text>
                    </View>
                  </View>
                  <View style={styles.contribStatus}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={styles.contribStatusText}>Confirme</Text>
                  </View>
                </View>

                {/* Reward */}
                {contrib.reward && (
                  <View style={styles.contribReward}>
                    <Ionicons name="gift" size={14} color={Colors.primary} />
                    <Text style={styles.contribRewardText}>Recompense: {contrib.reward.title}</Text>
                    <View style={styles.contribRewardStatus}>
                      <Text style={styles.contribRewardStatusText}>En attente</Text>
                    </View>
                  </View>
                )}

                {/* Footer */}
                <View style={styles.contribFooter}>
                  <Text style={styles.contribDate}>{contrib.date}</Text>
                  <Text style={styles.contribTxId}>{contrib.txId}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.exploreCTA}
          onPress={() => router.push('/crowdfunding' as any)}
        >
          <LinearGradient colors={['#FF6B00', '#FF3D00']} style={styles.exploreCTAGradient}>
            <Ionicons name="rocket" size={18} color="#FFF" />
            <Text style={styles.exploreCTAText}>Decouvrir plus de projets</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },

  // Summary
  summaryBanner: { marginHorizontal: 16, borderRadius: 20, overflow: 'hidden', marginBottom: 20 },
  summaryGradient: { padding: 22, alignItems: 'center' },
  summaryIcon: { marginBottom: 8 },
  summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  summaryAmount: { color: '#FFF', fontSize: 32, fontWeight: '800', marginVertical: 6 },
  summaryStats: { flexDirection: 'row', marginTop: 12 },
  summaryStatItem: { flex: 1, alignItems: 'center' },
  summaryStatValue: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  summaryStatLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 2 },
  summaryStatDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.15)' },

  // List
  listSection: { paddingHorizontal: 16 },
  listTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 12 },

  // Contribution Card
  contributionCard: {
    backgroundColor: '#111', borderRadius: 16, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#1A1A1A',
  },
  contribHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  contribImage: { width: 48, height: 48, borderRadius: 10 },
  contribInfo: { flex: 1, marginLeft: 10 },
  contribTitle: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  contribMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  contribCatBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  contribCatText: { fontSize: 10, fontWeight: '700' },
  contribProgress: { color: '#888', fontSize: 11 },

  contribAmountSection: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0A0A0A', borderRadius: 10, padding: 12, marginBottom: 10,
  },
  contribAmountLeft: {},
  contribAmount: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  contribPaymentRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  paymentDot: { width: 8, height: 8, borderRadius: 4 },
  contribPayment: { color: '#888', fontSize: 11 },
  contribStatus: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  contribStatusText: { color: '#4CAF50', fontSize: 12, fontWeight: '600' },

  contribReward: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10,
    backgroundColor: Colors.primary + '08', padding: 10, borderRadius: 10,
  },
  contribRewardText: { color: '#CCC', fontSize: 12, flex: 1 },
  contribRewardStatus: {
    backgroundColor: '#FF9800' + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4,
  },
  contribRewardStatusText: { color: '#FF9800', fontSize: 10, fontWeight: '700' },

  contribFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#1A1A1A', paddingTop: 8,
  },
  contribDate: { color: '#666', fontSize: 11 },
  contribTxId: { color: '#555', fontSize: 10, fontFamily: 'monospace' },

  // Explore CTA
  exploreCTA: { marginHorizontal: 16, borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  exploreCTAGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 8,
  },
  exploreCTAText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
