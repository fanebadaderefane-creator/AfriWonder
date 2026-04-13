import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import apiClient from '../src/api/client';
import { useAuthStore } from '../src/store/authStore';
import { API_ROUTES } from '../src/config/api';
import { isAdminUser } from '../src/utils/adminAccess';

const { width } = Dimensions.get('window');

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
const fmtMoney = (n: number) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;

interface KPI {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}

type AdminTab = 'overview' | 'users' | 'content' | 'finance' | 'lives';

function unwrapList<T>(raw: unknown, keys: string[]): T[] {
  if (!raw || typeof raw !== 'object') return [];
  const o = raw as Record<string, unknown>;
  for (const k of keys) {
    const v = o[k];
    if (Array.isArray(v)) return v as T[];
  }
  return [];
}

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<Record<string, number>>({});
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [lives, setLives] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<{
    pending_reports?: number;
    pending_withdrawals?: number;
    active_lives?: number;
  } | null>(null);
  const [periodAnalytics, setPeriodAnalytics] = useState<{
    users?: { new_signups?: number; active_users?: number };
    revenue?: { marketplace_revenue_fcfa?: number; completed_orders?: number };
    content?: { videos_uploaded?: number; lives_started_in_period?: number };
  }>({});

  const isAdmin = isAdminUser(user);

  const loadData = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const [statsRes, usersRes, reportsRes, livesRes, au, ar, ac] = await Promise.allSettled([
        apiClient.get(API_ROUTES.ADMIN_ANALYTICS_OVERVIEW),
        apiClient.get(API_ROUTES.ADMIN_USERS, { params: { page: 1, limit: 20 } }),
        apiClient.get('/moderation/reports', { params: { status: 'pending', limit: 20 } }),
        apiClient.get('/live', { params: { status: 'live', limit: 20 } }),
        apiClient.get(API_ROUTES.ADMIN_ANALYTICS_USERS('7d')),
        apiClient.get(API_ROUTES.ADMIN_ANALYTICS_REVENUE('30d')),
        apiClient.get(API_ROUTES.ADMIN_ANALYTICS_CONTENT('7d')),
      ]);

      if (statsRes.status === 'fulfilled') {
        const payload = statsRes.value.data?.data ?? statsRes.value.data;
        const s = payload?.stats ?? {};
        const al = payload?.alerts;
        if (al && typeof al === 'object') {
          setAlerts({
            pending_reports: Number((al as any).pending_reports) || 0,
            pending_withdrawals: Number((al as any).pending_withdrawals) || 0,
            active_lives: Number((al as any).active_lives) || 0,
          });
        }
        setStats({
          total_users: Number(s.totalUsers) || 0,
          total_videos: Number(s.totalVideos) || 0,
          total_orders: Number(s.totalOrders) || 0,
          total_revenue: Number(s.totalRevenue) || 0,
          total_products: Number(s.totalProducts) || 0,
          platform_commission: Number(s.platformCommission) || 0,
          pending_withdrawals: Number(s.pendingWithdrawals) || 0,
          total_tips: Number(s.totalTips) || 0,
          marketplace_revenue: Number(s.marketplaceRevenue) || 0,
          ad_revenue: Number(s.adRevenue) || 0,
          production_readiness: Math.min(
            100,
            Math.max(0, Number(s.productionReadiness ?? s.production_readiness) || 100),
          ),
        });
      }

      if (usersRes.status === 'fulfilled') {
        const ud = usersRes.value.data?.data ?? usersRes.value.data;
        setUsers(Array.isArray(ud?.users) ? ud.users : []);
      }
      if (reportsRes.status === 'fulfilled') {
        const rd = reportsRes.value.data?.data ?? reportsRes.value.data;
        setReports(unwrapList(rd, ['reports', 'items']));
      }
      if (livesRes.status === 'fulfilled') {
        const ld = livesRes.value.data?.data ?? livesRes.value.data;
        setLives(unwrapList(ld, ['streams', 'items', 'lives']));
      }

      const nextPeriod: typeof periodAnalytics = {};
      if (au.status === 'fulfilled') {
        const d = au.value.data?.data ?? au.value.data;
        nextPeriod.users = d;
      }
      if (ar.status === 'fulfilled') {
        const d = ar.value.data?.data ?? ar.value.data;
        nextPeriod.revenue = d;
      }
      if (ac.status === 'fulfilled') {
        const d = ac.value.data?.data ?? ac.value.data;
        nextPeriod.content = d;
      }
      if (Object.keys(nextPeriod).length) setPeriodAnalytics(nextPeriod);
    } catch {
      /* ignore */
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!isAdmin) return;
    const id = setInterval(() => {
      void loadData({ silent: true });
    }, 30000);
    return () => clearInterval(id);
  }, [isAdmin, loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadData().finally(() => setRefreshing(false));
  }, [loadData]);

  const handleBanUser = async (userId: string) => {
    try {
      await apiClient.patch(`/admin/users/${userId}/suspend`, {
        suspended: true,
        reason: 'Suspension depuis la console admin mobile',
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, account_suspended: true } : u)),
      );
    } catch {
      /* ignore */
    }
  };

  const handleResolveReport = async (reportId: string, action: 'remove' | 'warn' | 'dismiss') => {
    try {
      const status = action === 'dismiss' ? 'dismissed' : 'resolved';
      const notes =
        action === 'remove'
          ? 'admin_action:remove_content'
          : action === 'warn'
            ? 'admin_action:warn_user'
            : 'admin_action:dismiss';
      await apiClient.put(`/moderation/reports/${reportId}/review`, { status, notes });
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch {
      /* ignore */
    }
  };

  if (!isAdmin) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Administration</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.denied}>
          <Ionicons name="lock-closed" size={48} color={Colors.textMuted} />
          <Text style={styles.deniedText}>Accès réservé aux administrateurs</Text>
        </View>
      </View>
    );
  }

  const pendingWithdrawalsDisplay =
    alerts?.pending_withdrawals != null ? alerts.pending_withdrawals : stats.pending_withdrawals || 0;

  const kpis: KPI[] = [
    { label: 'Utilisateurs', value: fmt(stats.total_users || 0), icon: 'people', color: '#3B82F6' },
    { label: 'Vidéos', value: fmt(stats.total_videos || 0), icon: 'videocam', color: '#8B5CF6' },
    { label: 'Revenus', value: fmtMoney(stats.total_revenue || 0), icon: 'trending-up', color: '#10B981' },
    { label: 'Lives actifs', value: String(alerts?.active_lives ?? lives.length), icon: 'radio', color: '#EF4444' },
    { label: 'Commandes', value: fmt(stats.total_orders || 0), icon: 'cart', color: '#F59E0B' },
    {
      label: 'Signalements',
      value: String(alerts?.pending_reports ?? reports.length),
      icon: 'flag',
      color: '#EC4899',
    },
  ];

  const tabs = [
    { id: 'overview' as const, label: 'Vue globale', icon: 'grid' as const },
    { id: 'users' as const, label: 'Utilisateurs', icon: 'people' as const },
    { id: 'content' as const, label: 'Modération', icon: 'shield-checkmark' as const },
    { id: 'finance' as const, label: 'Finances', icon: 'wallet' as const },
    { id: 'lives' as const, label: 'Lives', icon: 'radio' as const },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Console Admin</Text>
        <Pressable onPress={onRefresh} accessibilityRole="button" accessibilityLabel="Actualiser">
          <Ionicons name="refresh" size={22} color={Colors.text} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, activeTab === t.id && styles.tabActive]}
            onPress={() => setActiveTab(t.id)}
          >
            <Ionicons
              name={t.icon}
              size={16}
              color={activeTab === t.id ? '#FFF' : Colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === t.id && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {activeTab === 'overview' && (
              <>
                <View style={styles.kpiGrid}>
                  {kpis.map((kpi, i) => (
                    <LinearGradient
                      key={i}
                      colors={[`${kpi.color}22`, `${kpi.color}08`]}
                      style={styles.kpiCard}
                    >
                      <Ionicons name={kpi.icon} size={22} color={kpi.color} />
                      <Text style={styles.kpiValue}>{kpi.value}</Text>
                      <Text style={styles.kpiLabel}>{kpi.label}</Text>
                    </LinearGradient>
                  ))}
                </View>
                {alerts ? (
                  <View style={styles.alertsSection}>
                    <Text style={styles.readinessTitle}>Alertes (temps quasi réel)</Text>
                    <View style={styles.alertRow}>
                      <Text style={styles.alertLabel}>Signalements en attente</Text>
                      <Text style={styles.alertValue}>{alerts.pending_reports ?? '—'}</Text>
                    </View>
                    <View style={styles.alertRow}>
                      <Text style={styles.alertLabel}>Retraits en attente</Text>
                      <Text style={styles.alertValue}>{alerts.pending_withdrawals ?? '—'}</Text>
                    </View>
                    <View style={styles.alertRow}>
                      <Text style={styles.alertLabel}>Lives actifs (total)</Text>
                      <Text style={styles.alertValue}>{alerts.active_lives ?? '—'}</Text>
                    </View>
                    <Text style={styles.readinessHint}>Source : GET {API_ROUTES.ADMIN_ANALYTICS_OVERVIEW}</Text>
                  </View>
                ) : null}

                {(periodAnalytics.users || periodAnalytics.revenue || periodAnalytics.content) && (
                  <View style={styles.readinessSection}>
                    <Text style={styles.readinessTitle}>Activité sur période</Text>
                    {periodAnalytics.users ? (
                      <Text style={styles.periodLine}>
                        Utilisateurs (7j) : +{periodAnalytics.users.new_signups ?? 0} inscrits ·{' '}
                        {periodAnalytics.users.active_users ?? 0} actifs (sessions)
                      </Text>
                    ) : null}
                    {periodAnalytics.revenue ? (
                      <Text style={styles.periodLine}>
                        Marketplace (30j) : {fmtMoney(periodAnalytics.revenue.marketplace_revenue_fcfa || 0)} ·{' '}
                        {periodAnalytics.revenue.completed_orders ?? 0} commandes
                      </Text>
                    ) : null}
                    {periodAnalytics.content ? (
                      <Text style={styles.periodLine}>
                        Contenu (7j) : {periodAnalytics.content.videos_uploaded ?? 0} vidéos ·{' '}
                        {periodAnalytics.content.lives_started_in_period ?? 0} lives démarrés
                      </Text>
                    ) : null}
                  </View>
                )}

                <View style={styles.readinessSection}>
                  <Text style={styles.readinessTitle}>Couverture production</Text>
                  <View style={styles.readinessBarOuter}>
                    <LinearGradient
                      colors={['#10B981', '#059669']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.readinessBarInner,
                        { width: `${stats.production_readiness ?? 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.readinessPct}>{stats.production_readiness ?? 100}%</Text>
                  <Text style={styles.readinessHint}>
                    Score exposé par l&apos;agrégat admin (stats.productionReadiness)
                  </Text>
                </View>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Écrans dédiés</Text>
                  {[
                    {
                      label: 'Utilisateurs (liste complète)',
                      icon: 'people-outline' as const,
                      onPress: () => router.push('/(admin)/users' as never),
                    },
                    {
                      label: 'Modération (plein écran)',
                      icon: 'shield-outline' as const,
                      onPress: () => router.push('/(admin)/moderation' as never),
                    },
                    {
                      label: 'Transactions & commandes',
                      icon: 'card-outline' as const,
                      onPress: () => router.push('/(admin)/transactions' as never),
                    },
                    {
                      label: 'Lives (admin)',
                      icon: 'radio-outline' as const,
                      onPress: () => router.push('/(admin)/lives' as never),
                    },
                    {
                      label: 'Créateurs & vérifications',
                      icon: 'star-outline' as const,
                      onPress: () => router.push('/(admin)/creators' as never),
                    },
                    {
                      label: 'Signalements (tous statuts)',
                      icon: 'flag-outline' as const,
                      onPress: () => router.push('/(admin)/reports' as never),
                    },
                  ].map((a, idx) => (
                    <TouchableOpacity key={`full-${idx}`} style={styles.actionRow} onPress={a.onPress}>
                      <Ionicons name={a.icon} size={20} color={Colors.primary} />
                      <Text style={styles.actionLabel}>{a.label}</Text>
                      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Actions rapides</Text>
                  {[
                    {
                      label: 'Paramètres plateforme',
                      icon: 'settings' as const,
                      onPress: () => router.push('/(admin)/settings' as never),
                    },
                    {
                      label: 'Gérer les utilisateurs',
                      icon: 'people' as const,
                      onPress: () => setActiveTab('users'),
                    },
                    {
                      label: 'Modérer le contenu',
                      icon: 'shield-checkmark' as const,
                      onPress: () => setActiveTab('content'),
                    },
                    {
                      label: 'Voir les finances',
                      icon: 'wallet' as const,
                      onPress: () => setActiveTab('finance'),
                    },
                    {
                      label: 'Gérer les lives',
                      icon: 'radio' as const,
                      onPress: () => setActiveTab('lives'),
                    },
                    {
                      label: 'Abonnements (AfriWonder+ & fan clubs)',
                      icon: 'diamond' as const,
                      onPress: () => router.push('/subscriptions' as never),
                    },
                  ].map((a, i) => (
                    <TouchableOpacity key={i} style={styles.actionRow} onPress={a.onPress}>
                      <View style={styles.actionIcon}>
                        <Ionicons name={a.icon} size={20} color={Colors.primary} />
                      </View>
                      <Text style={styles.actionLabel}>{a.label}</Text>
                      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {activeTab === 'users' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Utilisateurs récents ({users.length})</Text>
                {users.map((u) => (
                  <View key={u.id} style={styles.userRow}>
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>
                        {(u.full_name || u.username || 'U')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userName}>{u.full_name || u.username}</Text>
                      <Text style={styles.userEmail}>{u.email}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {u.account_suspended ? (
                        <View style={[styles.badge, { backgroundColor: 'rgba(239,68,68,0.2)' }]}>
                          <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '700' }}>
                            SUSPENDU
                          </Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.badge, { backgroundColor: 'rgba(239,68,68,0.15)' }]}
                          onPress={() => void handleBanUser(u.id)}
                        >
                          <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '600' }}>
                            Suspendre
                          </Text>
                        </TouchableOpacity>
                      )}
                      {u.is_verified ? (
                        <View style={[styles.badge, { backgroundColor: 'rgba(16,185,129,0.2)' }]}>
                          <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '700' }}>
                            VÉRIFIÉ
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))}
                {users.length === 0 ? <Text style={styles.emptyText}>Aucun utilisateur</Text> : null}
              </View>
            )}

            {activeTab === 'content' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Signalements en attente ({reports.length})</Text>
                {reports.map((r) => (
                  <View key={r.id} style={styles.reportCard}>
                    <View style={styles.reportHead}>
                      <Text style={styles.reportType}>{r.reason || r.type || 'Signalement'}</Text>
                      <Text style={styles.reportDate}>
                        {r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : ''}
                      </Text>
                    </View>
                    <Text style={styles.reportDesc} numberOfLines={2}>
                      {r.description || r.details || 'Aucun détail'}
                    </Text>
                    <View style={styles.reportActions}>
                      <TouchableOpacity
                        style={[styles.reportBtn, { backgroundColor: 'rgba(239,68,68,0.15)' }]}
                        onPress={() => void handleResolveReport(r.id, 'remove')}
                      >
                        <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600' }}>
                          Traiter
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.reportBtn, { backgroundColor: 'rgba(245,158,11,0.15)' }]}
                        onPress={() => void handleResolveReport(r.id, 'warn')}
                      >
                        <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '600' }}>
                          Avertir
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.reportBtn, { backgroundColor: 'rgba(16,185,129,0.15)' }]}
                        onPress={() => void handleResolveReport(r.id, 'dismiss')}
                      >
                        <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '600' }}>
                          Ignorer
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                {reports.length === 0 ? (
                  <Text style={styles.emptyText}>Aucun signalement en attente</Text>
                ) : null}
              </View>
            )}

            {activeTab === 'finance' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Finances</Text>
                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={() => router.push('/subscriptions' as never)}
                  accessibilityRole="button"
                  accessibilityLabel="Ouvrir les abonnements"
                >
                  <View style={styles.actionIcon}>
                    <Ionicons name="diamond" size={20} color="#A855F7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionLabel}>Abonnements utilisateurs</Text>
                    <Text style={{ color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2 }}>
                      AfriWonder+, fan clubs, mes abonnements
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
                {[
                  { label: 'Revenus totaux', value: fmtMoney(stats.total_revenue || 0), color: '#10B981' },
                  {
                    label: 'Commissions plateforme',
                    value: fmtMoney(stats.platform_commission || 0),
                    color: '#3B82F6',
                  },
                  {
                    label: 'Retraits en attente',
                    value: String(pendingWithdrawalsDisplay),
                    color: '#F59E0B',
                  },
                  { label: 'Tips / dons totaux', value: fmtMoney(stats.total_tips || 0), color: '#EC4899' },
                  {
                    label: 'Ventes marketplace',
                    value: fmtMoney(stats.marketplace_revenue || 0),
                    color: '#8B5CF6',
                  },
                  { label: 'Revenus publicitaires', value: fmtMoney(stats.ad_revenue || 0), color: '#F97316' },
                ].map((f, i) => (
                  <View key={i} style={styles.finRow}>
                    <Text style={styles.finLabel}>{f.label}</Text>
                    <Text style={[styles.finValue, { color: f.color }]}>{f.value}</Text>
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'lives' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Lives en cours ({lives.length})</Text>
                {lives.map((l) => (
                  <View key={l.id} style={styles.liveRow}>
                    <View style={styles.liveDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.liveName}>{l.title}</Text>
                      <Text style={styles.liveMeta}>{l.viewers_count || 0} spectateurs</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.liveEndBtn}
                      onPress={async () => {
                        try {
                          await apiClient.post(`/live/${l.id}/end`, {});
                          setLives((prev) => prev.filter((x) => x.id !== l.id));
                        } catch {
                          /* ignore */
                        }
                      }}
                    >
                      <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600' }}>Terminer</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {lives.length === 0 ? <Text style={styles.emptyText}>Aucun live en cours</Text> : null}
              </View>
            )}
          </>
        )}
        <View style={{ height: 60 }} />
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
  denied: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  deniedText: { color: Colors.textMuted, fontSize: FontSizes.md },
  tabsRow: { paddingHorizontal: Spacing.xl, gap: 8, paddingBottom: Spacing.md },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surface,
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: FontSizes.sm, color: Colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: '#FFF' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.xl, gap: 10 },
  kpiCard: {
    width: (width - 50) / 2,
    padding: 16,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  kpiValue: { fontSize: FontSizes.xxl, fontWeight: 'bold', color: Colors.text, marginTop: 8 },
  kpiLabel: { fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
  readinessSection: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  readinessTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  readinessBarOuter: {
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  readinessBarInner: { height: '100%', borderRadius: 5 },
  readinessPct: {
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    color: '#10B981',
    marginTop: Spacing.sm,
  },
  readinessHint: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 4 },
  alertsSection: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  alertRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  alertLabel: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  alertValue: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.text },
  periodLine: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: 10, lineHeight: 20 },
  section: { paddingHorizontal: Spacing.xl, marginTop: Spacing.lg },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.md },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,107,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { flex: 1, fontSize: FontSizes.md, color: Colors.text, fontWeight: '500' },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  userName: { color: Colors.text, fontWeight: '600', fontSize: FontSizes.md },
  userEmail: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  emptyText: { color: Colors.textMuted, textAlign: 'center', paddingVertical: 30 },
  reportCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: 10,
  },
  reportHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  reportType: { color: Colors.text, fontWeight: '600', fontSize: FontSizes.md },
  reportDate: { color: Colors.textMuted, fontSize: FontSizes.xs },
  reportDesc: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginBottom: 10 },
  reportActions: { flexDirection: 'row', gap: 8 },
  reportBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  finRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  finLabel: { color: Colors.textSecondary, fontSize: FontSizes.md },
  finValue: { fontWeight: 'bold', fontSize: FontSizes.md },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  liveName: { color: Colors.text, fontWeight: '600' },
  liveMeta: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  liveEndBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
});
