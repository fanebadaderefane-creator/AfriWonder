import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';

const fmtMoney = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
const fmtNum = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

/** Paliers indicatifs (UX) — les gains réels suivent le barème AfriWonder et les vues qualifiées côté serveur. */
const REVENUE_TIERS = [
  { name: 'Débutant', minFollowers: 0, ratePerView: 0, badge: 'Continuez à publier du contenu.' },
  { name: 'Créateur', minFollowers: 1000, ratePerView: 0.5, badge: '0,5 FCFA / vue qualifiée (estimation)' },
  { name: 'Partenaire', minFollowers: 5000, ratePerView: 1.0, badge: '1,0 FCFA / vue qualifiée (estimation)' },
  { name: 'Star', minFollowers: 50_000, ratePerView: 1.5, badge: '1,5 FCFA / vue qualifiée (estimation)' },
  { name: 'Icône', minFollowers: 500_000, ratePerView: 2.0, badge: '2,0 FCFA / vue qualifiée (estimation)' },
];

const WITHDRAWAL_METHODS = [
  { id: 'orange-money', name: 'Orange Money', icon: 'phone-portrait' as const, color: '#FF6600', fee: '1 %', minAmount: 5000 },
  { id: 'wave', name: 'Wave', icon: 'water' as const, color: '#1DC3E2', fee: '0,5 %', minAmount: 2000 },
  { id: 'moov-money', name: 'MTN MoMo', icon: 'phone-portrait' as const, color: '#FFCC00', fee: '1 %', minAmount: 5000 },
  { id: 'bank_transfer', name: 'Virement bancaire', icon: 'business' as const, color: '#3B82F6', fee: '2 %', minAmount: 50_000 },
];

type DashboardMonetization = {
  enabled?: boolean;
  suspended?: boolean;
  pending_request?: boolean;
  status?: {
    eligible?: boolean;
    reason?: string;
    conditions?: {
      subscribers?: { met: boolean; current: number; required: number };
      views30d?: { met: boolean; current: number; required: number };
      videos?: { met: boolean; current: number; required: number };
      accountDays?: { met: boolean; current: number; required: number };
      engagement?: { met: boolean; current: number; required: number };
      verified?: { met: boolean };
    };
  };
};

type TabId = 'overview' | 'details' | 'withdraw';

export default function RevenueShareScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<TabId>('overview');
  const [dashboard, setDashboard] = useState<{
    revenues?: { total_fcfa?: number; video_fcfa?: number; donations_fcfa?: number };
    stats?: { qualified_views?: number };
    monetization?: DashboardMonetization;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const dashRes = await apiClient.get('/creator-dashboard');
      const d = dashRes.data?.data ?? dashRes.data;
      setDashboard(d ?? null);
    } catch {
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadData().finally(() => setRefreshing(false));
  }, [loadData]);

  const mon = dashboard?.monetization;
  const monetizationEnabled = Boolean(mon?.enabled);
  const pendingRequest = Boolean(mon?.pending_request);
  const suspended = Boolean(mon?.suspended);
  const eligible = Boolean(mon?.status?.eligible);
  const conditions = mon?.status?.conditions;

  const requestMonetization = async () => {
    try {
      const res = await apiClient.post('/creator-dashboard/request-monetization', {});
      const data = res.data as { success?: boolean; message?: string };
      if (data?.success) {
        Alert.alert('Demande envoyée', data.message || 'Vous serez notifié après validation par AfriWonder.');
        void loadData();
      } else {
        Alert.alert('Impossible pour le moment', data?.message || 'Conditions non remplies ou demande déjà en cours.');
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; error?: string } } };
      const msg =
        err.response?.data?.message || err.response?.data?.error || 'Erreur réseau. Réessayez plus tard.';
      Alert.alert('Erreur', String(msg));
    }
  };

  const requestWithdrawal = (methodId: string) => {
    if (methodId === 'bank_transfer') {
      Alert.alert(
        'Bientôt disponible',
        'Le virement bancaire arrive prochainement. Utilisez Orange Money ou Wave pour l’instant.',
      );
      return;
    }
    const balance = Number(dashboard?.revenues?.total_fcfa) || 0;
    const minAmount = WITHDRAWAL_METHODS.find((m) => m.id === methodId)?.minAmount ?? 5000;
    if (balance < minAmount) {
      Alert.alert(
        'Solde insuffisant',
        `Minimum ${fmtMoney(minAmount)} pour retirer via ${WITHDRAWAL_METHODS.find((m) => m.id === methodId)?.name}.`,
      );
      return;
    }
    router.push({
      pathname: '/creator/withdraw',
      params: { method: methodId, amount: String(balance) },
    } as never);
  };

  const rev = dashboard?.revenues ?? {};
  const followers = conditions?.subscribers?.current ?? user?.followers ?? 0;
  const currentTier = [...REVENUE_TIERS].reverse().find((t) => followers >= t.minFollowers) || REVENUE_TIERS[0];
  const currentIdx = REVENUE_TIERS.findIndex((t) => t.name === currentTier.name);
  const nextTier = REVENUE_TIERS[currentIdx + 1];

  const totalEarned = Number(rev.total_fcfa) || 0;
  const videoEarnings = Number(rev.video_fcfa) || 0;
  const tipsEarnings = Number(rev.donations_fcfa) || 0;
  const qualifiedViews = Number(dashboard?.stats?.qualified_views) || 0;

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Revenus et monétisation</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabsRow}>
        {(
          [
            { id: 'overview' as const, label: 'Aperçu' },
            { id: 'details' as const, label: 'Détails' },
            { id: 'withdraw' as const, label: 'Retirer' },
          ] as const
        ).map((t) => (
          <TouchableOpacity key={t.id} style={[styles.tab, tab === t.id && styles.tabActive]} onPress={() => setTab(t.id)}>
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {suspended ? (
          <View style={styles.warnBanner}>
            <Ionicons name="warning" size={24} color={Colors.warning} />
            <Text style={styles.warnTitle}>Monétisation suspendue</Text>
            <Text style={styles.warnDesc}>Contactez le support pour connaître les suites possibles.</Text>
          </View>
        ) : null}

        {!monetizationEnabled && !pendingRequest && eligible ? (
          <View style={styles.enableBanner}>
            <LinearGradient colors={['rgba(255,107,0,0.15)', 'rgba(255,0,110,0.1)']} style={StyleSheet.absoluteFillObject} />
            <Ionicons name="flash" size={28} color={Colors.primary} />
            <Text style={styles.enableTitle}>Demander la monétisation</Text>
            <Text style={styles.enableDesc}>
              Vous remplissez les conditions AfriWonder (abonnés, vues 30 jours, vidéos, engagement, compte vérifié).
              Envoyez une demande : validation par l’équipe sous quelques jours.
            </Text>
            <TouchableOpacity style={styles.enableBtn} onPress={() => void requestMonetization()}>
              <Text style={styles.enableBtnText}>Envoyer la demande</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!monetizationEnabled && pendingRequest ? (
          <View style={styles.pendingBanner}>
            <Ionicons name="time" size={26} color={Colors.primary} />
            <Text style={styles.pendingTitle}>Demande en cours</Text>
            <Text style={styles.pendingDesc}>AfriWonder examine votre dossier. Vous recevrez une notification.</Text>
          </View>
        ) : null}

        {!monetizationEnabled && !pendingRequest && !eligible && mon?.status ? (
          <View style={styles.conditionsCard}>
            <Text style={styles.conditionsTitle}>Conditions monétisation</Text>
            <Text style={styles.conditionsReason}>{mon.status.reason || 'Conditions non encore remplies.'}</Text>
            {conditions?.subscribers ? (
              <Text style={styles.condLine}>
                Abonnés : {fmtNum(conditions.subscribers.current)} / {fmtNum(conditions.subscribers.required)}
                {conditions.subscribers.met ? ' ✓' : ''}
              </Text>
            ) : null}
            {conditions?.views30d ? (
              <Text style={styles.condLine}>
                Vues (30 j.) : {fmtNum(conditions.views30d.current)} / {fmtNum(conditions.views30d.required)}
                {conditions.views30d.met ? ' ✓' : ''}
              </Text>
            ) : null}
            {conditions?.videos ? (
              <Text style={styles.condLine}>
                Vidéos publiques : {conditions.videos.current} / {conditions.videos.required}
                {conditions.videos.met ? ' ✓' : ''}
              </Text>
            ) : null}
            {conditions?.verified != null ? (
              <Text style={styles.condLine}>Compte vérifié : {conditions.verified.met ? 'Oui ✓' : 'Non'}</Text>
            ) : null}
          </View>
        ) : null}

        {tab === 'overview' ? (
          <>
            <LinearGradient colors={['rgba(255,107,0,0.2)', 'rgba(255,107,0,0.05)']} style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Solde estimé (revenus cumulés)</Text>
              <Text style={styles.balanceValue}>{fmtMoney(totalEarned)}</Text>
              <View style={styles.balanceRow}>
                <View style={styles.balanceStat}>
                  <Text style={styles.balanceStatLabel}>Vidéos</Text>
                  <Text style={styles.balanceStatValue}>{fmtMoney(videoEarnings)}</Text>
                </View>
                <View style={styles.balanceStat}>
                  <Text style={styles.balanceStatLabel}>Tips / dons</Text>
                  <Text style={styles.balanceStatValue}>{fmtMoney(tipsEarnings)}</Text>
                </View>
                <View style={styles.balanceStat}>
                  <Text style={styles.balanceStatLabel}>Vues qualif.</Text>
                  <Text style={styles.balanceStatValue}>{fmtNum(qualifiedViews)}</Text>
                </View>
              </View>
            </LinearGradient>

            <View style={styles.tierCard}>
              <View style={styles.tierHeader}>
                <View>
                  <Text style={styles.tierName}>{currentTier.name}</Text>
                  <Text style={styles.tierBadge}>{currentTier.badge}</Text>
                </View>
                <View style={styles.tierIcon}>
                  <Ionicons name="diamond" size={24} color="#FFD700" />
                </View>
              </View>
              {nextTier ? (
                <View style={styles.tierProgress}>
                  <Text style={styles.tierProgressText}>
                    Prochain palier : {nextTier.name} ({fmtNum(nextTier.minFollowers)} abonnés)
                  </Text>
                  <View style={styles.tierBar}>
                    <View
                      style={[
                        styles.tierBarFill,
                        { width: `${Math.min(100, (followers / nextTier.minFollowers) * 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.tierProgressSub}>
                    {fmtNum(followers)} / {fmtNum(nextTier.minFollowers)} abonnés
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Comment ça marche</Text>
              {[
                { icon: 'eye' as const, color: '#3B82F6', title: 'Vues qualifiées', desc: 'Les vues comptabilisées côté serveur alimentent vos revenus vidéo.' },
                { icon: 'cash' as const, color: '#10B981', title: 'Tips et dons', desc: 'Les soutiens des fans sont versés sur votre solde créateur.' },
                { icon: 'phone-portrait' as const, color: '#FF6600', title: 'Retrait mobile money', desc: 'Orange Money, Wave ou MoMo depuis l’onglet Retirer.' },
                { icon: 'gift' as const, color: '#FFD700', title: 'Cadeaux live', desc: 'Les cadeaux pendant les lives complètent vos revenus.' },
              ].map((item, i) => (
                <View key={i} style={styles.howItWorks}>
                  <View style={[styles.howIcon, { backgroundColor: `${item.color}20` }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.howTitle}>{item.title}</Text>
                    <Text style={styles.howDesc}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {tab === 'details' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Grille indicative</Text>
            {REVENUE_TIERS.map((tier, i) => (
              <View
                key={i}
                style={[
                  styles.tierRow,
                  currentTier.name === tier.name && {
                    borderColor: Colors.primary,
                    backgroundColor: 'rgba(255,107,0,0.08)',
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tierRowName, currentTier.name === tier.name && { color: Colors.primary }]}>
                    {tier.name}
                  </Text>
                  <Text style={styles.tierRowReq}>
                    {tier.minFollowers === 0 ? 'Aucun minimum' : `${fmtNum(tier.minFollowers)}+ abonnés`}
                  </Text>
                </View>
                <Text style={styles.tierRowRate}>
                  {tier.ratePerView > 0 ? `${tier.ratePerView} FCFA/vue` : 'Pas encore éligible'}
                </Text>
              </View>
            ))}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Estimation (à titre indicatif)</Text>
            {[10_000, 100_000, 1_000_000].map((views, i) => (
              <View key={i} style={styles.estRow}>
                <Text style={styles.estLabel}>{fmtNum(views)} vues / mois</Text>
                <Text style={styles.estValue}>{fmtMoney(views * currentTier.ratePerView)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {tab === 'withdraw' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Retirer vos gains</Text>
            <View style={styles.withdrawBalance}>
              <Text style={styles.withdrawBalanceLabel}>Solde affiché</Text>
              <Text style={styles.withdrawBalanceValue}>{fmtMoney(totalEarned)}</Text>
            </View>
            {WITHDRAWAL_METHODS.map((method) => (
              <TouchableOpacity key={method.id} style={styles.withdrawMethod} onPress={() => requestWithdrawal(method.id)}>
                <View style={[styles.withdrawIcon, { backgroundColor: `${method.color}20` }]}>
                  <Ionicons name={method.icon} size={22} color={method.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.withdrawName}>{method.name}</Text>
                  <Text style={styles.withdrawFee}>
                    Frais : {method.fee} | Min. : {fmtMoney(method.minAmount)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.paymentsLink} onPress={() => router.push('/payments' as never)}>
              <Text style={styles.paymentsLinkText}>Payer un achat avec Orange Money ou Wave</Text>
              <Ionicons name="open-outline" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        ) : null}
        <View style={{ height: 40 }} />
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
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  tabsRow: { flexDirection: 'row', paddingHorizontal: Spacing.xl, gap: 8, marginBottom: Spacing.md },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.surface },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: '#FFF' },
  warnBanner: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,193,7,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.35)',
  },
  warnTitle: { fontSize: FontSizes.md, fontWeight: 'bold', color: Colors.text, marginTop: 8 },
  warnDesc: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: 4 },
  enableBanner: {
    margin: Spacing.xl,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.2)',
  },
  enableTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.text, marginTop: 10 },
  enableDesc: { fontSize: FontSizes.sm, color: Colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  enableBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    marginTop: 14,
  },
  enableBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: FontSizes.md },
  pendingBanner: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  pendingTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.text, marginTop: 8 },
  pendingDesc: { fontSize: FontSizes.sm, color: Colors.textSecondary, textAlign: 'center', marginTop: 6 },
  conditionsCard: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  conditionsTitle: { fontSize: FontSizes.md, fontWeight: 'bold', color: Colors.text },
  conditionsReason: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: 8, lineHeight: 20 },
  condLine: { fontSize: FontSizes.sm, color: Colors.textMuted, marginTop: 6 },
  balanceCard: {
    margin: Spacing.xl,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.2)',
  },
  balanceLabel: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  balanceValue: { fontSize: 32, fontWeight: 'bold', color: Colors.text, marginTop: 4 },
  balanceRow: { flexDirection: 'row', marginTop: 16, gap: 16 },
  balanceStat: {},
  balanceStatLabel: { color: Colors.textMuted, fontSize: FontSizes.xs },
  balanceStatValue: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  tierCard: {
    marginHorizontal: Spacing.xl,
    padding: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tierHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tierName: { fontSize: FontSizes.xl, fontWeight: 'bold', color: '#FFD700' },
  tierBadge: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  tierIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,215,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierProgress: { marginTop: 14 },
  tierProgressText: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  tierBar: { height: 6, backgroundColor: Colors.background, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  tierBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  tierProgressSub: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 4 },
  section: { paddingHorizontal: Spacing.xl, marginTop: Spacing.lg },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.md },
  howItWorks: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  howIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  howTitle: { color: Colors.text, fontWeight: '600', fontSize: FontSizes.md },
  howDesc: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  tierRow: {
    padding: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierRowName: { color: Colors.text, fontWeight: '700', fontSize: FontSizes.md },
  tierRowReq: { color: Colors.textMuted, fontSize: FontSizes.xs },
  tierRowRate: { color: Colors.primary, fontWeight: '600', fontSize: FontSizes.sm },
  estRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  estLabel: { color: Colors.textSecondary, fontSize: FontSizes.md },
  estValue: { color: '#10B981', fontWeight: 'bold', fontSize: FontSizes.md },
  withdrawBalance: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
  },
  withdrawBalanceLabel: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  withdrawBalanceValue: { fontSize: 28, fontWeight: 'bold', color: Colors.text, marginTop: 4 },
  withdrawMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  withdrawIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  withdrawName: { color: Colors.text, fontWeight: '600', fontSize: FontSizes.md },
  withdrawFee: { color: Colors.textMuted, fontSize: FontSizes.xs },
  paymentsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.xl,
    padding: Spacing.md,
  },
  paymentsLinkText: { color: Colors.primary, fontWeight: '600', fontSize: FontSizes.sm },
});
