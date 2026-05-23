/**
 * Admin — Paid Video Calls (User ↔ Star).
 * Hub admin isolé : KPIs + onglets (Stars / Bookings / Litiges).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Alert, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import adminStarsApi, {
  type AdminStarKpis, type AdminStarDispute,
} from '../../src/api/adminStarsApi';
import type { StarProfile, StarBooking } from '../../src/api/starsApi';

type Tab = 'stars' | 'bookings' | 'disputes';

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const fmtMoney = (n: number) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;

export default function AdminStarsScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('stars');
  const [kpis, setKpis] = useState<AdminStarKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stars, setStars] = useState<StarProfile[]>([]);
  const [bookings, setBookings] = useState<StarBooking[]>([]);
  const [disputes, setDisputes] = useState<AdminStarDispute[]>([]);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const [k, s, b, d] = await Promise.all([
        adminStarsApi.kpis(),
        adminStarsApi.listStars(search.trim() || undefined),
        adminStarsApi.listBookings(),
        adminStarsApi.listDisputes('open'),
      ]);
      setKpis(k);
      setStars(s);
      setBookings(b);
      setDisputes(d);
    } catch (e) {
      Alert.alert('Admin stars', (e as Error)?.message || 'Chargement impossible');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => { void load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  const verify = useCallback(async (s: StarProfile) => {
    Alert.alert(
      s.is_verified ? 'Retirer la vérification ?' : 'Vérifier cette star ?',
      s.is_verified ? 'La star perdra son badge vérifié.' : 'La star apparaîtra avec un badge vérifié.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: s.is_verified ? 'Retirer' : 'Vérifier',
          onPress: async () => {
            try {
              await adminStarsApi.verifyStar(s.id, !s.is_verified);
              await load();
            } catch (e) { Alert.alert('Erreur', (e as Error)?.message || 'Action refusée'); }
          },
        },
      ],
    );
  }, [load]);

  const ban = useCallback(async (s: StarProfile) => {
    Alert.alert(
      s.is_banned ? 'Débannir cette star ?' : 'Bannir cette star ?',
      s.is_banned
        ? 'La star pourra à nouveau recevoir des appels.'
        : 'Tous les appels en cours seront suspendus.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: s.is_banned ? 'Débannir' : 'Bannir',
          style: s.is_banned ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await adminStarsApi.banStar(s.id, !s.is_banned, s.is_banned ? undefined : 'admin_action');
              await load();
            } catch (e) { Alert.alert('Erreur', (e as Error)?.message || 'Action refusée'); }
          },
        },
      ],
    );
  }, [load]);

  const resolveDispute = useCallback(
    (d: AdminStarDispute, resolution: 'refund_full' | 'refund_partial' | 'reject') => {
      const askAmount = resolution === 'refund_partial';
      const run = async (amount?: number) => {
        try {
          await adminStarsApi.resolveDispute(d.id, resolution, amount, 'admin_decision');
          await load();
        } catch (e) {
          Alert.alert('Erreur', (e as Error)?.message || 'Résolution refusée');
        }
      };
      if (askAmount) {
        Alert.prompt?.(
          'Montant remboursé',
          `Sur ${d.booking?.price_fcfa ?? '?'} XOF`,
          (txt) => run(Number(txt)),
          'plain-text',
          '',
          'number-pad',
        ) ?? Alert.alert('Non supporté', 'Saisie numérique non disponible. Utilisez la console admin web.');
      } else {
        run();
      }
    },
    [load],
  );

  const runReaper = useCallback(async () => {
    const out = await adminStarsApi.runReaper();
    if (out) {
      Alert.alert('Reaper', `Terminés ${out.completed} · No-show star ${out.noShowStars} · No-show fan ${out.noShowFans} · Annulés ${out.cancelledPending}`);
      await load();
    } else {
      Alert.alert('Reaper', 'Exécution impossible.');
    }
  }, [load]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stars — Admin</Text>
        <TouchableOpacity onPress={runReaper} style={styles.backBtn}>
          <Ionicons name="timer" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, paddingBottom: insets.bottom + Spacing.xxxl * 2 }}
      >
        {kpis ? (
          <View style={styles.kpiGrid}>
            <KpiCell label="Stars actives" value={`${kpis.profiles.active}/${kpis.profiles.total}`} color="#FF6B00" />
            <KpiCell label="Vérifiées" value={String(kpis.profiles.verified)} color="#1976D2" />
            <KpiCell label="Appels terminés" value={fmt(kpis.bookings.completed)} color="#2E7D32" />
            <KpiCell label="No-show fan" value={String(kpis.bookings.no_show_fan ?? 0)} color="#C62828" />
            <KpiCell label="No-show star" value={String(kpis.bookings.no_show_star ?? 0)} color="#B71C1C" />
            <KpiCell label="Programmées" value={String(kpis.bookings.upcoming ?? 0)} color="#1565C0" />
            <KpiCell label="Litiges ouverts" value={String(kpis.open_disputes)} color="#C62828" />
            <KpiCell label="CA brut" value={fmtMoney(kpis.revenue_fcfa)} color="#FF6B00" big />
            <KpiCell label="Commission" value={fmtMoney(kpis.platform_fee_fcfa)} color="#795548" />
            <KpiCell label="Remboursé" value={fmtMoney(kpis.refunds_fcfa)} color="#6A1B9A" />
          </View>
        ) : null}

        <View style={styles.tabsRow}>
          {(['stars', 'bookings', 'disputes'] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabOn]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && { color: '#FFF' }]}>
                {t === 'stars' ? 'Stars' : t === 'bookings' ? 'Bookings' : `Litiges (${disputes.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'stars' ? (
          <>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher (username, email, headline)"
              placeholderTextColor={Colors.textSecondary}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              onSubmitEditing={() => { setLoading(true); void load(); }}
            />
            {stars.length === 0 ? (
              <Text style={styles.empty}>Aucune star.</Text>
            ) : stars.map((s) => (
              <View key={s.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>
                    @{s.user?.username || s.user?.full_name || 'star'}
                    {s.is_verified ? ' ✓' : ''}
                    {s.is_banned ? ' 🚫' : ''}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>{s.headline || '—'}</Text>
                  <Text style={styles.rowSub}>
                    {s.is_active ? 'actif' : 'inactif'} · {s.rating_count > 0 ? `${s.rating_avg.toFixed(1)}★` : 'nouveau'} · {s.calls_completed} appels
                  </Text>
                </View>
                <TouchableOpacity style={styles.actionBtn} onPress={() => verify(s)}>
                  <Ionicons name={s.is_verified ? 'shield-checkmark' : 'shield-outline'} size={20} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => ban(s)}>
                  <Ionicons name={s.is_banned ? 'lock-open' : 'lock-closed'} size={20} color="#C62828" />
                </TouchableOpacity>
              </View>
            ))}
          </>
        ) : null}

        {tab === 'bookings' ? (
          bookings.length === 0 ? (
            <Text style={styles.empty}>Aucun booking.</Text>
          ) : bookings.slice(0, 50).map((b) => (
            <View key={b.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>
                  @{b.fan?.username || '—'} ↔ @{b.star_profile?.user?.username || '—'}
                </Text>
                <Text style={styles.rowSub}>
                  {new Date(b.scheduled_start_at).toLocaleString('fr-FR')} · {b.duration_minutes}+{b.extra_minutes || 0} min
                </Text>
                <Text style={styles.rowSub}>
                  {b.status} · {fmtMoney(b.price_fcfa)} (fee {fmtMoney(b.platform_fee_fcfa)})
                </Text>
              </View>
              {['confirmed', 'completed', 'disputed'].includes(b.status) ? (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => {
                    Alert.prompt?.(
                      'Force refund',
                      'Montant XOF à rembourser',
                      async (txt) => {
                        const amt = Number(txt);
                        if (!amt || amt <= 0) return;
                        try {
                          await adminStarsApi.forceRefund(b.id, amt, 'admin_force');
                          await load();
                        } catch (e) { Alert.alert('Erreur', (e as Error)?.message || 'Refus'); }
                      },
                      'plain-text', '', 'number-pad',
                    ) ?? Alert.alert('Non supporté', 'Utilisez la console admin web.');
                  }}
                >
                  <Ionicons name="cash-outline" size={20} color="#C62828" />
                </TouchableOpacity>
              ) : null}
            </View>
          ))
        ) : null}

        {tab === 'disputes' ? (
          disputes.length === 0 ? (
            <Text style={styles.empty}>Aucun litige ouvert.</Text>
          ) : disputes.map((d) => (
            <View key={d.id} style={styles.disputeCard}>
              <Text style={styles.rowTitle}>
                Litige @{d.opener?.username || '—'} — {d.reason}
              </Text>
              <Text style={styles.rowSub} numberOfLines={3}>{d.description || '—'}</Text>
              {d.booking ? (
                <Text style={styles.rowSub}>
                  Booking {d.booking_id.slice(0, 8)} · {fmtMoney(d.booking.price_fcfa)} · {d.booking.status}
                </Text>
              ) : null}
              <View style={styles.disputeActions}>
                <TouchableOpacity
                  style={[styles.resolveBtn, { backgroundColor: '#2E7D32' }]}
                  onPress={() => resolveDispute(d, 'refund_full')}
                >
                  <Text style={styles.resolveText}>Remb. total</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.resolveBtn, { backgroundColor: '#F57C00' }]}
                  onPress={() => resolveDispute(d, 'refund_partial')}
                >
                  <Text style={styles.resolveText}>Partiel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.resolveBtn, { backgroundColor: '#757575' }]}
                  onPress={() => resolveDispute(d, 'reject')}
                >
                  <Text style={styles.resolveText}>Rejeter</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : null}
      </ScrollView>
    </View>
  );
}

function KpiCell({ label, value, color, big }: { label: string; value: string; color: string; big?: boolean }) {
  return (
    <View style={[styles.kpiCell, big && styles.kpiCellBig]}>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text, textAlign: 'center' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  kpiCell: { flexBasis: '30%', flexGrow: 1, padding: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, gap: 4 },
  kpiCellBig: { flexBasis: '62%' },
  kpiValue: { fontSize: 20, fontWeight: '800' },
  kpiLabel: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  tabsRow: { flexDirection: 'row', gap: Spacing.sm },
  tab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  tabOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { color: Colors.text, fontWeight: '600' },
  searchInput: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.pill,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md,
    height: 44, color: Colors.text,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md, backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border,
  },
  rowTitle: { color: Colors.text, fontWeight: '700' },
  rowSub: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  actionBtn: { padding: Spacing.sm },
  empty: { color: Colors.textSecondary, textAlign: 'center', padding: Spacing.lg },
  disputeCard: { padding: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, gap: 4 },
  disputeActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  resolveBtn: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.pill },
  resolveText: { color: '#FFF', fontWeight: '700', fontSize: FontSizes.sm },
});
