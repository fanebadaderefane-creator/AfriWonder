/**
 * Dashboard STAR — module Paid Video Calls.
 * Route : `/stars/dashboard`.
 *
 * Configure : prix 5/10/15 min, max appels/jour, activation, disponibilités
 * hebdomadaires (jour + plage horaire). Accessible uniquement si l'utilisateur
 * a déjà activé le mode star (sinon redirige vers `/stars/become`).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme/ThemeContext';
import { FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { MIN_TOUCH_TARGET } from '../../src/theme/designSystem';
import starsApi, { type StarAvailabilityRule, type StarProfile, type StarStats } from '../../src/api/starsApi';

const DAYS = [
  { n: 1, label: 'Lun' },
  { n: 2, label: 'Mar' },
  { n: 3, label: 'Mer' },
  { n: 4, label: 'Jeu' },
  { n: 5, label: 'Ven' },
  { n: 6, label: 'Sam' },
  { n: 0, label: 'Dim' },
];

function defaultRules(): StarAvailabilityRule[] {
  return [1, 2, 3, 4, 5].map((n) => ({
    day_of_week: n,
    specific_date: null,
    start_time: '18:00',
    end_time: '22:00',
    is_blocked: false,
  }));
}

export default function StarDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [profile, setProfile] = useState<StarProfile | null>(null);
  const [stats, setStats] = useState<StarStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [price5, setPrice5] = useState('');
  const [price10, setPrice10] = useState('');
  const [price15, setPrice15] = useState('');
  const [maxPerDay, setMaxPerDay] = useState('5');
  const [rules, setRules] = useState<StarAvailabilityRule[]>([]);

  const reloadStats = useCallback(async () => {
    try {
      const s = await starsApi.getMyStarStats();
      setStats(s);
    } catch {
      // silencieux : le dashboard reste utilisable sans stats
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const p = await starsApi.getMyStarProfile();
        if (cancelled) return;
        if (!p) {
          router.replace('/stars/become' as never);
          return;
        }
        setProfile(p);
        setPrice5(p.price_fcfa_5min ? String(p.price_fcfa_5min) : '');
        setPrice10(p.price_fcfa_10min ? String(p.price_fcfa_10min) : '');
        setPrice15(p.price_fcfa_15min ? String(p.price_fcfa_15min) : '');
        setMaxPerDay(String(p.max_calls_per_day || 5));
        setRules(
          p.availability_rules && p.availability_rules.length > 0
            ? p.availability_rules
            : defaultRules(),
        );
        await reloadStats();
      } catch (e) {
        if (!cancelled) Alert.alert('Profil star', (e as Error)?.message || 'Impossible de charger votre profil.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reloadStats]);

  const toggleActive = useCallback(async (val: boolean) => {
    if (!profile) return;
    try {
      const p = await starsApi.toggleActive(val);
      setProfile(p);
    } catch (e) {
      Alert.alert('Activation', (e as Error)?.message || 'Impossible de changer l\'état.');
    }
  }, [profile]);

  const updateRuleDay = useCallback((idx: number, patch: Partial<StarAvailabilityRule>) => {
    setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }, []);
  const toggleDay = useCallback((day: number) => {
    setRules((prev) => {
      if (prev.some((r) => r.day_of_week === day)) return prev.filter((r) => r.day_of_week !== day);
      return [...prev, { day_of_week: day, specific_date: null, start_time: '18:00', end_time: '22:00', is_blocked: false }];
    });
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const p5 = price5.trim() ? Number(price5) : null;
      const p10 = price10.trim() ? Number(price10) : null;
      const p15 = price15.trim() ? Number(price15) : null;
      const max = Number(maxPerDay) || 5;
      await starsApi.updateStarProfile({
        price_fcfa_5min: p5,
        price_fcfa_10min: p10,
        price_fcfa_15min: p15,
        max_calls_per_day: Math.max(1, Math.min(50, max)),
      });
      const validRules = rules.filter((r) => {
        if (r.day_of_week == null && r.specific_date == null) return false;
        return !!r.start_time && !!r.end_time;
      });
      await starsApi.setAvailability(validRules);
      Alert.alert('Enregistré', 'Votre configuration a été mise à jour.');
    } catch (e) {
      Alert.alert('Enregistrement', (e as Error)?.message || 'Échec de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  }, [price5, price10, price15, maxPerDay, rules]);

  if (loading || !profile) {
    return <View style={[styles.root, styles.center, { paddingTop: insets.top }]}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Mon mode Star</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/stars/bookings' as never)}>
          <Ionicons name="calendar-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxxl * 3 }}>
        <View style={styles.activeCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.activeTitle}>
              {profile.is_active ? 'Mode star ACTIF' : 'Mode star désactivé'}
            </Text>
            <Text style={styles.activeSub}>
              {profile.is_active
                ? 'Vous apparaissez dans la recherche.'
                : 'Personne ne peut réserver d\'appel tant que le mode est désactivé.'}
            </Text>
          </View>
          <Switch value={profile.is_active} onValueChange={toggleActive} />
        </View>

        {stats ? (
          <>
            <Text style={styles.section}>Portefeuille</Text>
            <View style={styles.walletCard}>
              <View style={styles.walletMainRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.walletLabel}>Solde disponible</Text>
                  <Text style={styles.walletAmount}>
                    {stats.balance.available_fcfa.toLocaleString('fr-FR')} XOF
                  </Text>
                  {stats.balance.pending_fcfa > 0 ? (
                    <Text style={styles.walletHint}>
                      + {stats.balance.pending_fcfa.toLocaleString('fr-FR')} XOF en séquestre (en cours de traitement)
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={styles.payoutBtn}
                  onPress={() => router.push('/wallet' as never)}
                  accessibilityLabel="Portefeuille et retrait Mobile Money ou virement"
                >
                  <Ionicons name="cash-outline" size={18} color="#FFF" />
                  <Text style={styles.payoutBtnText}>Retirer</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.walletFootRow}>
                <Text style={styles.walletFoot}>
                  Cumul gagné : {stats.balance.total_earned_fcfa.toLocaleString('fr-FR')} XOF
                </Text>
                <Text style={styles.walletFoot}>
                  Retraits : Mobile Money · Virement · délai 24–72h
                </Text>
              </View>
            </View>

            <Text style={styles.section}>Cette période</Text>
            <View style={styles.periodRow}>
              <PeriodStat label="Aujourd'hui" value={`${stats.calls.today}/${stats.calls.max_per_day}`} hint="appels" />
              <PeriodStat label="Cette semaine" value={String(stats.calls.this_week)} hint="appels" />
              <PeriodStat label="Ce mois" value={String(stats.calls.this_month)} hint="appels" />
            </View>
            {stats.calls.no_show_total > 0 ? (
              <Text style={[styles.helper, { color: '#EF4444' }]}>
                ⚠ {stats.calls.no_show_total} no-show enregistré(s) — impacte votre visibilité.
              </Text>
            ) : null}
            {stats.open_disputes_count > 0 ? (
              <TouchableOpacity
                style={styles.disputeAlert}
                onPress={() => router.push('/stars/bookings' as never)}
              >
                <Ionicons name="alert-circle" size={18} color="#F59E0B" />
                <Text style={styles.disputeAlertText}>
                  {stats.open_disputes_count} litige(s) en cours — à traiter
                </Text>
              </TouchableOpacity>
            ) : null}

            {stats.upcoming_bookings.length > 0 ? (
              <>
                <View style={styles.sectionRow}>
                  <Text style={styles.section}>Prochains appels</Text>
                  <TouchableOpacity onPress={() => router.push('/stars/bookings' as never)}>
                    <Text style={styles.seeAll}>Tout voir</Text>
                  </TouchableOpacity>
                </View>
                {stats.upcoming_bookings.map((b) => {
                  const start = new Date(b.scheduled_start_at);
                  const fanName = b.fan?.full_name || b.fan?.username || 'Fan anonyme';
                  return (
                    <TouchableOpacity
                      key={b.id}
                      style={styles.upcomingCard}
                      onPress={() => router.push(`/stars/bookings` as never)}
                    >
                      <View style={styles.upcomingAvatar}>
                        <Ionicons name="person" size={20} color={colors.textSecondary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.upcomingName} numberOfLines={1}>{fanName}</Text>
                        <Text style={styles.upcomingSub}>
                          {start.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}
                          {' · '}
                          {start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          {' · '}
                          {b.duration_minutes} min
                        </Text>
                      </View>
                      <View style={styles.upcomingPrice}>
                        <Text style={styles.upcomingPriceText}>
                          +{Math.round(b.star_earnings_fcfa).toLocaleString('fr-FR')}
                        </Text>
                        <Text style={styles.upcomingPriceSub}>XOF</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            ) : (
              <View style={styles.emptyUpcoming}>
                <Ionicons name="calendar-outline" size={24} color={colors.textSecondary} />
                <Text style={styles.emptyUpcomingText}>Aucun appel prévu — vos créneaux apparaissent ici dès qu'un fan réserve.</Text>
              </View>
            )}
          </>
        ) : null}

        <Text style={styles.section}>Tarifs</Text>
        <View style={styles.rowGroup}>
          <PriceField label="5 min" value={price5} onChange={setPrice5} colors={colors} />
          <PriceField label="10 min" value={price10} onChange={setPrice10} colors={colors} />
          <PriceField label="15 min" value={price15} onChange={setPrice15} colors={colors} />
        </View>
        <Text style={styles.helper}>Montants en XOF. Laissez vide pour désactiver cette durée.</Text>

        <Text style={styles.section}>Limites</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Nombre max d'appels / jour</Text>
          <TextInput
            style={styles.numInput}
            value={maxPerDay}
            onChangeText={setMaxPerDay}
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>

        <Text style={styles.section}>Disponibilités récurrentes</Text>
        <View style={styles.daysRow}>
          {DAYS.map((d) => {
            const on = rules.some((r) => r.day_of_week === d.n);
            return (
              <TouchableOpacity
                key={d.n}
                style={[styles.dayBtn, on && styles.dayBtnOn]}
                onPress={() => toggleDay(d.n)}
              >
                <Text style={[styles.dayBtnText, on && { color: '#FFF' }]}>{d.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {rules.filter((r) => r.day_of_week != null).sort((a, b) => ((a.day_of_week ?? 0) - (b.day_of_week ?? 0))).map((r, idx) => {
          const originalIdx = rules.findIndex((x) => x === r);
          const dayLabel = DAYS.find((d) => d.n === r.day_of_week)?.label ?? '?';
          return (
            <View key={`r-${idx}`} style={styles.ruleRow}>
              <Text style={styles.ruleDay}>{dayLabel}</Text>
              <TextInput
                style={styles.timeInput}
                value={r.start_time}
                onChangeText={(v) => updateRuleDay(originalIdx, { start_time: v })}
                placeholder="HH:MM"
                placeholderTextColor={colors.textSecondary}
                maxLength={5}
              />
              <Text style={styles.ruleSep}>—</Text>
              <TextInput
                style={styles.timeInput}
                value={r.end_time}
                onChangeText={(v) => updateRuleDay(originalIdx, { end_time: v })}
                placeholder="HH:MM"
                placeholderTextColor={colors.textSecondary}
                maxLength={5}
              />
            </View>
          );
        })}

        <TouchableOpacity style={styles.saveBtn} disabled={saving} onPress={save}>
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Enregistrer</Text>}
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <Stat label="Appels" value={String(profile.calls_completed)} />
          <Stat label="Note" value={profile.rating_count > 0 ? profile.rating_avg.toFixed(1) : '—'} />
          <Stat label="Revenus" value={`${(profile.total_earnings_fcfa || 0).toLocaleString('fr-FR')} XOF`} />
        </View>
      </ScrollView>
    </View>
  );
}

function PriceField({ label, value, onChange, colors }: {
  label: string; value: string; onChange: (v: string) => void;
  colors: { background: string; text: string; textSecondary: string; primary: string; card: string; border: string };
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: colors.textSecondary, fontSize: FontSizes.xs, marginBottom: 4 }}>{label}</Text>
      <TextInput
        style={{
          color: colors.text, backgroundColor: colors.card, borderRadius: BorderRadius.md,
          borderWidth: 1, borderColor: colors.border, paddingHorizontal: Spacing.md, height: 44,
        }}
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={colors.textSecondary}
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ color: colors.textSecondary, fontSize: FontSizes.xs }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: FontSizes.lg, fontWeight: '800', marginTop: 4 }}>{value}</Text>
    </View>
  );
}

function PeriodStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.md,
      alignItems: 'center',
    }}>
      <Text style={{ color: colors.textSecondary, fontSize: FontSizes.xs }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: FontSizes.xxl, fontWeight: '800', marginTop: 4 }}>{value}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: FontSizes.xs, marginTop: 2 }}>{hint}</Text>
    </View>
  );
}

function createStyles(c: { background: string; text: string; textSecondary: string; primary: string; card: string; border: string }) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    center: { alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
    iconBtn: { width: 40, height: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
    title: { color: c.text, fontSize: FontSizes.xl, fontWeight: '800' },
    activeCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, backgroundColor: c.card, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: c.border },
    activeTitle: { color: c.text, fontSize: FontSizes.lg, fontWeight: '800' },
    activeSub: { color: c.textSecondary, fontSize: FontSizes.sm, marginTop: 4 },
    section: { color: c.text, fontSize: FontSizes.lg, fontWeight: '700', marginTop: Spacing.md },
    rowGroup: { flexDirection: 'row', gap: Spacing.sm },
    helper: { color: c.textSecondary, fontSize: FontSizes.xs },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
    label: { color: c.text, fontSize: FontSizes.md, flex: 1 },
    numInput: { color: c.text, backgroundColor: c.card, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: c.border, paddingHorizontal: Spacing.md, height: 44, width: 80, textAlign: 'center' },
    daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
    dayBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, minWidth: 46, alignItems: 'center' },
    dayBtnOn: { backgroundColor: c.primary, borderColor: c.primary },
    dayBtnText: { color: c.text, fontWeight: '700', fontSize: FontSizes.sm },
    ruleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: c.card, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: c.border },
    ruleDay: { color: c.text, fontWeight: '700', width: 40 },
    ruleSep: { color: c.textSecondary },
    timeInput: { flex: 1, color: c.text, backgroundColor: c.background, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: c.border, paddingHorizontal: Spacing.md, height: 40, textAlign: 'center' },
    saveBtn: { backgroundColor: c.primary, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.pill, marginTop: Spacing.md },
    saveText: { color: '#FFF', fontWeight: '800', fontSize: FontSizes.md },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.md, backgroundColor: c.card, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: c.border, marginTop: Spacing.md },
    sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.md },
    seeAll: { color: c.primary, fontSize: FontSizes.sm, fontWeight: '700' },
    walletCard: { backgroundColor: c.card, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: c.border, padding: Spacing.md, gap: Spacing.md },
    walletMainRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    walletLabel: { color: c.textSecondary, fontSize: FontSizes.xs, textTransform: 'uppercase', letterSpacing: 0.6 },
    walletAmount: { color: c.text, fontSize: FontSizes.xxxl, fontWeight: '800', marginTop: 4 },
    walletHint: { color: c.textSecondary, fontSize: FontSizes.xs, marginTop: 4 },
    walletFootRow: { gap: 2 },
    walletFoot: { color: c.textSecondary, fontSize: FontSizes.xs },
    payoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.primary, paddingHorizontal: Spacing.md, height: 42, borderRadius: BorderRadius.pill },
    payoutBtnText: { color: '#FFF', fontWeight: '800', fontSize: FontSizes.sm },
    periodRow: { flexDirection: 'row', gap: Spacing.sm },
    disputeAlert: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, backgroundColor: 'rgba(245, 158, 11, 0.15)', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.35)' },
    disputeAlertText: { color: '#F59E0B', fontWeight: '700', fontSize: FontSizes.sm, flex: 1 },
    upcomingCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, backgroundColor: c.card, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: c.border },
    upcomingAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border },
    upcomingName: { color: c.text, fontSize: FontSizes.md, fontWeight: '700' },
    upcomingSub: { color: c.textSecondary, fontSize: FontSizes.xs, marginTop: 2 },
    upcomingPrice: { alignItems: 'flex-end' },
    upcomingPriceText: { color: c.primary, fontWeight: '800', fontSize: FontSizes.md },
    upcomingPriceSub: { color: c.textSecondary, fontSize: FontSizes.xs },
    emptyUpcoming: { alignItems: 'center', padding: Spacing.lg, gap: Spacing.sm, backgroundColor: c.card, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: c.border, borderStyle: 'dashed' },
    emptyUpcomingText: { color: c.textSecondary, fontSize: FontSizes.sm, textAlign: 'center' },
  });
}
