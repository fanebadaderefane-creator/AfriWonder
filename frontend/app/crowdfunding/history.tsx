import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../src/theme/colors';
import { CROWDFUNDING_CATEGORIES, formatFullCFA, getProgressPercent } from '../../src/data/crowdfunding';
import { ImageOrPlaceholder } from '../../src/components/common/ImageOrPlaceholder';
import { toAbsoluteMediaUrl } from '../../src/utils/absoluteMediaUrl';
import { useAuthStore } from '../../src/store/authStore';
import crowdfundingApi, { type MyContributionRow } from '../../src/api/crowdfundingApi';

function formatDateFr(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function statusLabel(s: string): string {
  if (s === 'completed') return 'Confirmé';
  if (s === 'pending') return 'En attente';
  if (s === 'refunded') return 'Remboursé';
  return s;
}

export default function ContributionHistoryScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rows, setRows] = useState<MyContributionRow[]>([]);

  const load = useCallback(async () => {
    if (!user?.id) {
      setRows([]);
      setLoading(false);
      return;
    }
    setError(false);
    try {
      const list = await crowdfundingApi.getMyContributions();
      setRows(list);
    } catch {
      setError(true);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const total = rows.filter((r) => r.status === 'completed').reduce((s, r) => s + r.amount, 0);
  const confirmedCount = rows.filter((r) => r.status === 'completed').length;

  if (!user?.id) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mes contributions</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.centerMessage}>
          <Ionicons name="log-in-outline" size={48} color="#666" />
          <Text style={styles.centerText}>Connectez-vous pour voir vos contributions.</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mes contributions</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.centerMessage}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
            <Text style={styles.summaryLabel}>Total (contributions confirmées)</Text>
            <Text style={styles.summaryAmount}>{formatFullCFA(total)}</Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatValue}>{rows.length}</Text>
                <Text style={styles.summaryStatLabel}>Lignes</Text>
              </View>
              <View style={styles.summaryStatDivider} />
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatValue}>{confirmedCount}</Text>
                <Text style={styles.summaryStatLabel}>Confirmées</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/crowdfunding/portfolio' as any)}
              style={styles.portfolioLink}
              accessibilityLabel="Ouvrir le portefeuille investisseur"
            >
              <Text style={styles.portfolioLinkText}>Portefeuille investisseur (détail) →</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {error ? (
          <Text style={styles.errorBanner}>Impossible de charger l’historique. Tirez pour réessayer.</Text>
        ) : null}

        <View style={styles.listSection}>
          <Text style={styles.listTitle}>Historique</Text>
          {rows.length === 0 && !error ? (
            <Text style={styles.emptyText}>Vous n’avez pas encore soutenu de campagne.</Text>
          ) : null}
          {rows.map((contrib) => {
            const camp = contrib.campaign;
            const catData = CROWDFUNDING_CATEGORIES.find((c) => c.id === (camp?.category || 'general'));
            const progress =
              camp && camp.goal_amount > 0
                ? getProgressPercent(camp.current_amount, camp.goal_amount)
                : 0;
            const cover = camp?.cover_image ? toAbsoluteMediaUrl(camp.cover_image) : '';
            return (
              <TouchableOpacity
                key={contrib.id}
                style={styles.contributionCard}
                activeOpacity={0.85}
                onPress={() => camp && router.push(`/crowdfunding/${camp.id}` as any)}
              >
                <View style={styles.contribHeader}>
                  <ImageOrPlaceholder uri={cover} style={styles.contribImage} icon="images-outline" iconSize={22} />
                  <View style={styles.contribInfo}>
                    <Text style={styles.contribTitle} numberOfLines={1}>
                      {camp?.title ?? 'Campagne'}
                    </Text>
                    <View style={styles.contribMeta}>
                      {catData ? (
                        <View style={[styles.contribCatBadge, { backgroundColor: (catData.color || '#FF6B00') + '15' }]}>
                          <Text style={[styles.contribCatText, { color: catData.color || '#FF6B00' }]}>
                            {catData.name}
                          </Text>
                        </View>
                      ) : null}
                      <Text style={styles.contribProgress}>{progress}% financé</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.contribAmountSection}>
                  <View style={styles.contribAmountLeft}>
                    <Text style={styles.contribAmount}>{formatFullCFA(contrib.amount)}</Text>
                    <Text style={styles.contribPayment}>Statut : {statusLabel(contrib.status)}</Text>
                  </View>
                  <View style={styles.contribStatus}>
                    <Ionicons
                      name={contrib.status === 'completed' ? 'checkmark-circle' : 'time-outline'}
                      size={16}
                      color={contrib.status === 'completed' ? '#4CAF50' : '#FF9800'}
                    />
                    <Text style={styles.contribStatusText}>{statusLabel(contrib.status)}</Text>
                  </View>
                </View>

                {contrib.reward_tier ? (
                  <View style={styles.contribReward}>
                    <Ionicons name="gift" size={14} color={Colors.primary} />
                    <Text style={styles.contribRewardText}>Palier : {contrib.reward_tier}</Text>
                  </View>
                ) : null}

                <View style={styles.contribFooter}>
                  <Text style={styles.contribDate}>{formatDateFr(contrib.created_at)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.exploreCTA} onPress={() => router.push('/crowdfunding' as any)}>
          <LinearGradient colors={['#FF6B00', '#FF3D00']} style={styles.exploreCTAGradient}>
            <Ionicons name="rocket" size={18} color="#FFF" />
            <Text style={styles.exploreCTAText}>Découvrir des projets</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centerMessage: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  centerText: { color: '#888', fontSize: 15, textAlign: 'center', marginTop: 12 },
  errorBanner: { color: '#FFAB91', paddingHorizontal: 16, marginBottom: 8, fontSize: 13 },
  emptyText: { color: '#888', fontSize: 14, marginBottom: 12 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },

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
  portfolioLink: { marginTop: 14, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)' },
  portfolioLinkText: { color: 'rgba(255,255,255,0.95)', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  listSection: { paddingHorizontal: 16 },
  listTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 12 },

  contributionCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1A1A1A',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A0A0A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  contribAmountLeft: {},
  contribAmount: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  contribPayment: { color: '#888', fontSize: 11, marginTop: 3 },
  contribStatus: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  contribStatusText: { color: '#4CAF50', fontSize: 12, fontWeight: '600' },

  contribReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    backgroundColor: Colors.primary + '08',
    padding: 10,
    borderRadius: 10,
  },
  contribRewardText: { color: '#CCC', fontSize: 12, flex: 1 },

  contribFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    paddingTop: 8,
  },
  contribDate: { color: '#666', fontSize: 11 },

  exploreCTA: { marginHorizontal: 16, borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  exploreCTAGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  exploreCTAText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
