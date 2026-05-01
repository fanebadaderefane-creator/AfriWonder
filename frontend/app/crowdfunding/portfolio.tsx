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

function campaignStatusFr(s: string): string {
  const m: Record<string, string> = {
    active: 'Actives',
    funded: 'Financées',
    failed: 'Échouées',
    pending: 'En validation',
    draft: 'Brouillon',
    rejected: 'Refusées',
    suspended: 'Suspendues',
    unknown: 'Autre',
  };
  return m[s] ?? s;
}

export default function CrowdfundingPortfolioScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [totalInvested, setTotalInvested] = useState(0);
  const [byCategory, setByCategory] = useState<Record<string, number>>({});
  const [byCampaignStatus, setByCampaignStatus] = useState<Record<string, number>>({});
  const [counts, setCounts] = useState({ rows: 0, activeCampaigns: 0, fundedCampaigns: 0 });
  const [rows, setRows] = useState<MyContributionRow[]>([]);

  const load = useCallback(async () => {
    if (!user?.id) {
      setRows([]);
      setLoading(false);
      return;
    }
    setError(false);
    try {
      const p = await crowdfundingApi.getPortfolio();
      setTotalInvested(p.totalInvested);
      setByCategory(p.byCategory ?? {});
      setByCampaignStatus(p.byCampaignStatus ?? {});
      setCounts(p.counts ?? { rows: 0, activeCampaigns: 0, fundedCampaigns: 0 });
      setRows(p.contributions ?? []);
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

  if (!user?.id) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mon portefeuille</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.centerMessage}>
          <Ionicons name="log-in-outline" size={48} color="#666" />
          <Text style={styles.centerText}>Connectez-vous pour voir votre portefeuille investisseur.</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mon portefeuille</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.centerMessage}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  const catEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const statusEntries = Object.entries(byCampaignStatus).sort((a, b) => b[1] - a[1]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon portefeuille</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <View style={styles.summaryBanner}>
          <LinearGradient
            colors={['#1A237E', '#3949AB', '#5C6BC0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryGradient}
          >
            <View style={styles.summaryIcon}>
              <Ionicons name="briefcase" size={28} color="rgba(255,255,255,0.35)" />
            </View>
            <Text style={styles.summaryLabel}>Total investi (contributions confirmées)</Text>
            <Text style={styles.summaryAmount}>{formatFullCFA(totalInvested)}</Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatValue}>{counts.activeCampaigns}</Text>
                <Text style={styles.summaryStatLabel}>Campagnes actives</Text>
              </View>
              <View style={styles.summaryStatDivider} />
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatValue}>{counts.fundedCampaigns}</Text>
                <Text style={styles.summaryStatLabel}>Campagnes financées</Text>
              </View>
              <View style={styles.summaryStatDivider} />
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatValue}>{counts.rows}</Text>
                <Text style={styles.summaryStatLabel}>Lignes</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {error ? (
          <Text style={styles.errorBanner}>Impossible de charger. Tirez pour réessayer.</Text>
        ) : null}

        {catEntries.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Par catégorie</Text>
            {catEntries.map(([cat, amt]) => {
              const label =
                CROWDFUNDING_CATEGORIES.find((c) => c.id === cat)?.name ?? cat;
              return (
                <View key={cat} style={styles.kvRow}>
                  <Text style={styles.kvKey}>{label}</Text>
                  <Text style={styles.kvVal}>{formatFullCFA(amt)}</Text>
                </View>
              );
            })}
          </View>
        ) : null}

        {statusEntries.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Par statut de campagne</Text>
            {statusEntries.map(([st, amt]) => (
              <View key={st} style={styles.kvRow}>
                <Text style={styles.kvKey}>{campaignStatusFr(st)}</Text>
                <Text style={styles.kvVal}>{formatFullCFA(amt)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.listSection}>
          <Text style={styles.listTitle}>Détail des contributions</Text>
          {rows.length === 0 && !error ? (
            <Text style={styles.emptyText}>Aucune contribution enregistrée.</Text>
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
                  <View>
                    <Text style={styles.contribAmount}>{formatFullCFA(contrib.amount)}</Text>
                    <Text style={styles.contribPayment}>Ligne : {statusLabel(contrib.status)}</Text>
                  </View>
                  {camp?.status ? (
                    <View style={styles.campStBadge}>
                      <Text style={styles.campStText}>{campaignStatusFr(camp.status)}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.contribFooter}>
                  <Text style={styles.contribDate}>{formatDateFr(contrib.created_at)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.exploreCTA} onPress={() => router.push('/crowdfunding/history' as any)}>
          <LinearGradient colors={['#3949AB', '#1A237E']} style={styles.exploreCTAGradient}>
            <Ionicons name="time" size={18} color="#FFF" />
            <Text style={styles.exploreCTAText}>Historique détaillé</Text>
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

  summaryBanner: { marginHorizontal: 16, borderRadius: 20, overflow: 'hidden', marginBottom: 16 },
  summaryGradient: { padding: 22, alignItems: 'center' },
  summaryIcon: { marginBottom: 8 },
  summaryLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' },
  summaryAmount: { color: '#FFF', fontSize: 30, fontWeight: '800', marginVertical: 6 },
  summaryStats: { flexDirection: 'row', marginTop: 12, width: '100%' },
  summaryStatItem: { flex: 1, alignItems: 'center' },
  summaryStatValue: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  summaryStatLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, marginTop: 2, textAlign: 'center' },
  summaryStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },

  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { color: '#FFF', fontSize: 15, fontWeight: '700', marginBottom: 8 },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  kvKey: { color: '#AAA', fontSize: 14 },
  kvVal: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  listSection: { paddingHorizontal: 16 },
  listTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 12 },

  contributionCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  contribHeader: { flexDirection: 'row', gap: 12 },
  contribImage: { width: 64, height: 64, borderRadius: 12 },
  contribInfo: { flex: 1, justifyContent: 'center' },
  contribTitle: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  contribMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  contribCatBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  contribCatText: { fontSize: 10, fontWeight: '700' },
  contribProgress: { color: '#888', fontSize: 12 },
  contribAmountSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  contribAmount: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  contribPayment: { color: '#888', fontSize: 12, marginTop: 2 },
  campStBadge: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  campStText: { color: '#B0BEC5', fontSize: 11, fontWeight: '600' },
  contribFooter: { marginTop: 8 },
  contribDate: { color: '#666', fontSize: 12 },

  exploreCTA: { marginHorizontal: 16, marginTop: 8, borderRadius: 14, overflow: 'hidden' },
  exploreCTAGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  exploreCTAText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
