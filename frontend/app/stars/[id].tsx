/**
 * Écran Profil star + Réservation — module isolé Paid Video Calls.
 * Route : `/stars/[id]` (id = StarProfile.id).
 *
 * Wizard interne 3 étapes (sans changer d'URL) :
 *   1. Récap : photo, badges (#ID, pays, rating|cat), bio, services, choix durée
 *   2. Calendrier : grille mensuelle + sélection heure
 *   3. Contact : numéro de téléphone (notifications + Mobile Money) + confirmer
 *
 * À la confirmation, création du booking (escrow wallet) puis redirection
 * vers `/stars/call/[id]` qui gère l'appel Agora.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator,
  TextInput, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme/ThemeContext';
import { FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { MIN_TOUCH_TARGET } from '../../src/theme/designSystem';
import { useAuthStore } from '../../src/store/authStore';
import axios from 'axios';
import * as WebBrowser from 'expo-web-browser';
import starsApi, {
  type StarProfile, type StarDuration, type StarRating, type StarSlot,
} from '../../src/api/starsApi';

const COUNTRY_LABELS: Record<string, string> = {
  ML: 'Mali', CI: 'Côte d’Ivoire', SN: 'Sénégal', BF: 'Burkina Faso',
  GN: 'Guinée', NE: 'Niger', TG: 'Togo', BJ: 'Bénin',
};
function countryLabel(code?: string | null): string | null {
  if (!code) return null;
  return COUNTRY_LABELS[code.toUpperCase()] ?? code.toUpperCase();
}

function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Accent réservation (captures produit — violet, distinct du orange AfriWonder). */
const BOOKING_VIOLET = '#7E3AF2';

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseYMD(s: string): Date {
  const [y, m, day] = s.split('-').map(Number);
  return new Date(y, m - 1, day);
}

/** Semaine affichée : dimanche → samedi (aligné grille calendrier FR courante). */
function startOfWeekSunday(d: Date): Date {
  const x = stripTime(d);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function formatWeekRangeFr(anchorStart: Date): string {
  const end = addDays(anchorStart, 6);
  const o: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  const a = anchorStart.toLocaleDateString('fr-FR', o);
  const b = end.toLocaleDateString('fr-FR', o);
  return `${a} — ${b}`;
}

function priceForDuration(p: StarProfile, d: StarDuration): number | null {
  if (d === 5) return p.price_fcfa_5min;
  if (d === 10) return p.price_fcfa_10min;
  return p.price_fcfa_15min;
}

export default function StarProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors, mode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, mode), [colors, mode]);
  const meUser = useAuthStore((s) => s.user);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [profile, setProfile] = useState<StarProfile | null>(null);
  const [ratings, setRatings] = useState<StarRating[]>([]);
  const [duration, setDuration] = useState<StarDuration>(5);
  const [loading, setLoading] = useState(true);

  // Étape 2 : semaine + créneaux (UX type capture produit)
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => startOfWeekSunday(new Date()));
  const [day, setDay] = useState<string | null>(null);
  const [slots, setSlots] = useState<StarSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Étape 3 : contact
  const [phone, setPhone] = useState<string>(() => meUser?.phone || '');
  const [booking, setBooking] = useState(false);
  /** Portefeuille intégré vs Orange Money direct (API `/stars/bookings`). */
  const [payMethod, setPayMethod] = useState<'wallet' | 'orange_money'>('wallet');

  const availableDurations: StarDuration[] = useMemo(() => {
    if (!profile) return [];
    const out: StarDuration[] = [];
    if (profile.price_fcfa_5min && profile.price_fcfa_5min > 0) out.push(5);
    if (profile.price_fcfa_10min && profile.price_fcfa_10min > 0) out.push(10);
    if (profile.price_fcfa_15min && profile.price_fcfa_15min > 0) out.push(15);
    return out;
  }, [profile]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const [p, r] = await Promise.all([starsApi.getProfile(id), starsApi.listRatings(id, 10)]);
        if (cancelled) return;
        setProfile(p);
        setRatings(r);
        const firstDur: StarDuration = p.price_fcfa_5min ? 5 : p.price_fcfa_10min ? 10 : 15;
        setDuration(firstDur);
      } catch (e) {
        if (!cancelled) Alert.alert('Star', (e as Error)?.message || 'Profil indisponible.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Charger les slots quand un jour est sélectionné
  useEffect(() => {
    if (!profile || !day || step !== 2) return;
    let cancelled = false;
    setSlotsLoading(true);
    setSelectedSlot(null);
    void starsApi.listSlots(profile.id, duration, day)
      .then((out) => { if (!cancelled) setSlots(out.slots); })
      .catch(() => { if (!cancelled) setSlots([]); })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [profile, day, duration, step]);

  const goToStep2 = useCallback(() => {
    if (!profile) return;
    if (availableDurations.length === 0) {
      Alert.alert('Indisponible', 'Aucun tarif n’est configuré pour cette star.');
      return;
    }
    const now = stripTime(new Date());
    setWeekAnchor(startOfWeekSunday(now));
    setDay(toYMD(now));
    setSelectedSlot(null);
    setStep(2);
  }, [profile, availableDurations]);

  const shiftWeek = useCallback((delta: number) => {
    setWeekAnchor((prev) => addDays(prev, delta * 7));
  }, []);

  const weekDaysList = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i)),
    [weekAnchor],
  );

  /** Garde un jour sélectionné dans la semaine visible après navigation semaine. */
  useEffect(() => {
    if (step !== 2) return;
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i));
    const todayStart = stripTime(new Date());
    setDay((currentDay) => {
      if (currentDay) {
        try {
          const cur = stripTime(parseYMD(currentDay));
          const stillHere = days.some((dd) => stripTime(dd).getTime() === cur.getTime());
          if (stillHere) return currentDay;
        } catch {
          /* noop */
        }
      }
      const firstOk = days.find((dd) => stripTime(dd) >= todayStart);
      return firstOk ? toYMD(firstOk) : null;
    });
  }, [weekAnchor, step]);

  const goToStep3 = useCallback(() => {
    if (!selectedSlot) return;
    setStep(3);
  }, [selectedSlot]);

  const confirmBooking = useCallback(async () => {
    if (!profile || !selectedSlot) return;
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 8) {
      Alert.alert('Numéro requis', 'Saisis un numéro de téléphone valide pour recevoir les notifications.');
      return;
    }
    setBooking(true);
    try {
      const msisdn =
        cleaned.startsWith('223') && cleaned.length >= 11
          ? `+${cleaned}`
          : `+223${cleaned}`;
      const { booking: b, payment } = await starsApi.createBooking({
        star_profile_id: profile.id,
        duration_minutes: duration,
        scheduled_start_at: selectedSlot,
        fan_notes: phone ? `Tel: ${cleaned}` : undefined,
        ...(payMethod === 'orange_money'
          ? { payment_method: 'orange_money' as const, payment_phone: msisdn }
          : {}),
      });
      if (payment?.paymentUrl) {
        await WebBrowser.openBrowserAsync(payment.paymentUrl);
        Alert.alert(
          'Orange Money',
          'Valide le paiement sur ton téléphone si demandé. Ta réservation passera en confirmée automatiquement — vérifie « Mes réservations » dans un instant.',
          [{ text: 'OK', onPress: () => router.replace('/stars/bookings' as never) }],
        );
        return;
      }
      router.replace(`/stars/call/${b.id}` as never);
    } catch (e: unknown) {
      const status = axios.isAxiosError(e) ? e.response?.status : undefined;
      const msg =
        axios.isAxiosError(e) && typeof e.response?.data?.error?.message === 'string'
          ? e.response.data.error.message
          : typeof (e as Error)?.message === 'string'
            ? (e as Error).message
            : 'Réessaye dans un instant.';
      if (status === 402 && payMethod === 'wallet') {
        Alert.alert(
          'Solde insuffisant',
          `${msg}\n\nRecharge ton portefeuille (Orange Money, Wave ou autres canaux proposés), puis réessaie la réservation.`,
          [
            { text: 'Plus tard', style: 'cancel' },
            {
              text: 'Recharger',
              onPress: () => router.push('/wallet/recharge' as never),
            },
          ],
        );
        return;
      }
      Alert.alert('Réservation impossible', msg);
    } finally {
      setBooking(false);
    }
  }, [profile, selectedSlot, duration, phone, payMethod]);

  if (loading) {
    return <View style={[styles.center, { paddingTop: insets.top }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }
  if (!profile) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.textSecondary} />
        <Text style={styles.emptyText}>Profil introuvable.</Text>
      </View>
    );
  }

  const name = profile.user?.full_name || profile.user?.username || 'Star';
  const username = profile.user?.username;
  const avatar = profile.user?.profile_image;
  const pays = countryLabel(profile.country);
  const minPrice = priceForDuration(profile, duration);
  const slotTime = selectedSlot
    ? new Date(selectedSlot).toLocaleString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* HEADER avec back contextuel + titre par étape */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => (step === 1 ? router.back() : setStep((step - 1) as 1 | 2 | 3))}
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {step === 1 ? name : 'Réserver un appel vidéo'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* PROGRESS BAR (uniquement étapes 2-3, ou si on veut visualiser le 1 aussi) */}
      {step >= 1 ? (
        <View style={styles.progressRow}>
          <View style={[styles.progressBar, step >= 1 && styles.progressBarOn]} />
          <View style={[styles.progressBar, step >= 2 && styles.progressBarOn]} />
          <View style={[styles.progressBar, step >= 3 && styles.progressBarOn]} />
        </View>
      ) : null}

      {/* ============================ ÉTAPE 1 : RÉCAP ============================ */}
      {step === 1 ? (
        <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xxxl * 2 }}>
          {/* HERO CARD avec dégradé doux */}
          <View style={styles.heroCard}>
            <View style={styles.heroAvatarWrap}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.heroAvatar} />
              ) : (
                <View style={[styles.heroAvatar, styles.avatarFallback]}>
                  <Ionicons name="person" size={40} color={colors.textSecondary} />
                </View>
              )}
            </View>
            <View style={styles.heroNameRow}>
              <Text style={styles.heroName}>{name}</Text>
              {profile.is_verified ? (
                <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginLeft: 6 }} />
              ) : null}
            </View>
            {username ? <Text style={styles.heroUsername}>{username}</Text> : null}

            <View style={styles.badgesRow}>
              {profile.display_id ? (
                <View style={[styles.badge, styles.badgeOrange]}>
                  <Ionicons name="flash" size={12} color={colors.primary} />
                  <Text style={[styles.badgeText, { color: colors.primary }]}>#{profile.display_id}</Text>
                </View>
              ) : null}
              {pays ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pays}</Text>
                </View>
              ) : null}
              <View style={styles.badge}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.badgeText}>
                  {profile.rating_count > 0 ? profile.rating_avg.toFixed(1) : '—'}
                  {profile.category ? ` | ${profile.category}` : ''}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.walletHint}>
            <Ionicons name="wallet-outline" size={22} color={BOOKING_VIOLET} />
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <Text style={styles.walletHintTitle}>Portefeuille AfriWonder</Text>
              <Text style={styles.walletHintBody}>
                Tu peux payer depuis ton portefeuille ou directement en Orange Money à l&apos;étape confirmation.
                En portefeuille, le montant est réservé (séquestre) jusqu&apos;à l&apos;appel.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/wallet/recharge' as never)}
              accessibilityRole="button"
              accessibilityLabel="Recharger le portefeuille"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.walletHintLink}>Recharger</Text>
            </TouchableOpacity>
          </View>

          {/* BIO */}
          {profile.bio ? (
            <View style={styles.bioBox}>
              <View style={styles.bioBar} />
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
          ) : null}

          {/* SERVICES (durées) */}
          <Text style={styles.sectionTitle}>Services</Text>
          <View style={{ paddingHorizontal: Spacing.md, gap: Spacing.sm }}>
            {availableDurations.map((d) => {
              const p = priceForDuration(profile, d);
              const isOn = duration === d;
              return (
                <TouchableOpacity
                  key={d}
                  style={[styles.serviceCard, isOn && styles.serviceCardOn]}
                  activeOpacity={0.85}
                  onPress={() => setDuration(d)}
                  accessibilityRole="button"
                  accessibilityLabel={`Appel ${d} minutes`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.serviceTitle, isOn && { color: colors.primary }]}>
                      Appel vidéo · {d} min
                    </Text>
                    <Text style={styles.serviceSubtitle}>Échange privé en visio avec la star</Text>
                  </View>
                  <Text style={[styles.servicePrice, isOn && { color: colors.primary }]}>
                    F {(p ?? 0).toLocaleString('fr-FR')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* AVIS RÉCENTS */}
          {ratings.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Avis récents</Text>
              {ratings.map((r) => (
                <View key={r.id} style={styles.ratingCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Ionicons key={n} name="star" size={14} color={n <= r.rating ? '#FFD700' : colors.border} />
                    ))}
                    <Text style={styles.ratingAuthor}>
                      {r.fan?.username ? `@${r.fan.username}` : 'Anonyme'}
                    </Text>
                  </View>
                  {r.review ? <Text style={styles.ratingReview}>{r.review}</Text> : null}
                </View>
              ))}
            </>
          ) : null}
        </ScrollView>
      ) : null}

      {/* ============================ ÉTAPE 2 : SEMAINE + CRÉNEAUX (UX captures) ============================ */}
      {step === 2 ? (
        <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xxxl * 2, paddingHorizontal: Spacing.md }}>
          <View style={styles.miniRecap}>
            {avatar ? <Image source={{ uri: avatar }} style={styles.miniAvatar} /> : (
              <View style={[styles.miniAvatar, styles.avatarFallback]}>
                <Ionicons name="person" size={20} color={colors.textSecondary} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.miniName} numberOfLines={1}>{name}</Text>
              <Text style={styles.miniSub}>{duration} min · F {(minPrice ?? 0).toLocaleString('fr-FR')}</Text>
            </View>
          </View>

          <View style={styles.bookingSheet}>
            <Text style={styles.sheetTitle}>Choisir un créneau</Text>

            <View style={styles.weekNavRow}>
              <TouchableOpacity
                style={styles.weekNavHit}
                onPress={() => shiftWeek(-1)}
                accessibilityLabel="Semaine précédente"
              >
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.weekRangeText} numberOfLines={1}>
                {formatWeekRangeFr(weekAnchor)}
              </Text>
              <TouchableOpacity
                style={styles.weekNavHit}
                onPress={() => shiftWeek(1)}
                accessibilityLabel="Semaine suivante"
              >
                <Ionicons name="chevron-forward" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.dayStrip}>
              {weekDaysList.map((d) => {
                const ymd = toYMD(d);
                const isPast = stripTime(d) < stripTime(new Date());
                const isOn = day === ymd;
                const dow = d
                  .toLocaleDateString('fr-FR', { weekday: 'short' })
                  .replace('.', '')
                  .toUpperCase();
                return (
                  <TouchableOpacity
                    key={ymd}
                    style={[
                      styles.dayStripCell,
                      isOn && styles.dayStripCellOn,
                      isPast && !isOn && styles.dayStripCellMuted,
                    ]}
                    disabled={isPast}
                    onPress={() => {
                      setDay(ymd);
                      setSelectedSlot(null);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${d.toLocaleDateString('fr-FR')}`}
                  >
                    <Text style={[styles.dayStripDow, isOn && styles.dayStripTextOn]}>{dow}</Text>
                    <Text style={[styles.dayStripNum, isOn && styles.dayStripTextOn]}>{d.getDate()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {day ? (
              <View style={styles.slotsSection}>
                <View style={styles.slotsSectionHeader}>
                  <Ionicons name="time-outline" size={18} color={BOOKING_VIOLET} />
                  <Text style={styles.slotsSectionTitle}>
                    Créneaux disponibles —{' '}
                    {parseYMD(day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                  </Text>
                </View>
                {slotsLoading ? (
                  <ActivityIndicator color={BOOKING_VIOLET} style={{ marginVertical: Spacing.lg }} />
                ) : slots.length === 0 ? (
                  <Text style={styles.emptySlots}>Aucun créneau disponible ce jour-là.</Text>
                ) : (
                  <View style={styles.slotGrid}>
                    {slots.map((s) => {
                      const isOn = selectedSlot === s.start;
                      const time = new Date(s.start).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      return (
                        <View key={s.start} style={styles.slotTileWrap}>
                          <TouchableOpacity
                            style={[styles.slotBtn, isOn && styles.slotBtnOn]}
                            onPress={() => setSelectedSlot(s.start)}
                            accessibilityRole="button"
                            accessibilityLabel={`Créneau ${time}`}
                          >
                            <Text style={[styles.slotBtnLabel, isOn && styles.slotBtnLabelOn]}>{time}</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.pickDayHint}>Choisis un jour dans la bande ci-dessus.</Text>
            )}
          </View>
        </ScrollView>
      ) : null}

      {/* ============================ ÉTAPE 3 : CONTACT + RÉCAP PAIEMENT ============================ */}
      {step === 3 ? (
        <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xxxl * 2, paddingHorizontal: Spacing.md }}>
          <View style={styles.confirmSheet}>
            <Text style={styles.sheetTitle}>Confirmer la réservation</Text>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Durée</Text>
                <Text style={styles.summaryValue}>{duration} min</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Date</Text>
                <Text style={styles.summaryValue}>
                  {selectedSlot
                    ? new Date(selectedSlot).toLocaleDateString('fr-FR')
                    : '—'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Heure</Text>
                <Text style={styles.summaryValue}>
                  {selectedSlot
                    ? new Date(selectedSlot).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                <Text style={styles.summaryLabel}>Total</Text>
                <Text style={styles.summaryTotal}>F {(minPrice ?? 0).toLocaleString('fr-FR')}</Text>
              </View>
            </View>

            <View style={styles.miniRecap}>
              {avatar ? <Image source={{ uri: avatar }} style={styles.miniAvatar} /> : (
                <View style={[styles.miniAvatar, styles.avatarFallback]}>
                  <Ionicons name="person" size={20} color={colors.textSecondary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.miniName} numberOfLines={1}>{name}</Text>
                <Text style={styles.miniSub} numberOfLines={2}>{slotTime}</Text>
              </View>
            </View>
          </View>

          <View style={styles.calCard}>
            <Text style={styles.contactTitle}>Informations de Contact</Text>
            <Text style={styles.contactLabel}>Numéro de Téléphone</Text>
            <View style={styles.phoneRow}>
              <View style={styles.phonePrefix}>
                <Text style={{ fontSize: FontSizes.md }}>🇲🇱</Text>
                <Text style={styles.prefixText}>+223</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="Entrez votre numéro de mobile"
                placeholderTextColor={colors.textSecondary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                inputMode="tel"
                maxLength={20}
              />
            </View>
            <View style={styles.privacyBox}>
              <Ionicons name="shield-checkmark" size={14} color={mode === 'light' ? colors.primary : '#FFB366'} />
              <Text style={styles.privacyText}>
                Votre numéro est uniquement utilisé pour les notifications et la validation du rendez-vous.
              </Text>
            </View>

            <Text style={styles.contactLabel}>Mode de paiement</Text>
            <View style={styles.payMethodRow}>
              <TouchableOpacity
                style={[styles.payChip, payMethod === 'wallet' && styles.payChipOn]}
                onPress={() => setPayMethod('wallet')}
                accessibilityRole="button"
                accessibilityLabel="Payer avec le portefeuille AfriWonder"
              >
                <Ionicons name="wallet-outline" size={16} color={payMethod === 'wallet' ? '#FFF' : colors.text} />
                <Text style={[styles.payChipText, payMethod === 'wallet' && styles.payChipTextOn]}>Portefeuille</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.payChip, payMethod === 'orange_money' && styles.payChipOn]}
                onPress={() => setPayMethod('orange_money')}
                accessibilityRole="button"
                accessibilityLabel="Payer avec Orange Money"
              >
                <Ionicons name="phone-portrait-outline" size={16} color={payMethod === 'orange_money' ? '#FFF' : colors.text} />
                <Text style={[styles.payChipText, payMethod === 'orange_money' && styles.payChipTextOn]}>Orange Money</Text>
              </TouchableOpacity>
            </View>
            {payMethod === 'orange_money' ? (
              <Text style={styles.omHint}>
                Après confirmation, une page sécurisée Orange Money s&apos;ouvre. Pas besoin de solde préalable dans l&apos;app.
              </Text>
            ) : null}

            <View style={styles.paymentTrustBox}>
              <View style={styles.paymentTrustRow}>
                <Ionicons name="lock-closed" size={14} color={colors.primary} />
                <Text style={styles.paymentTrustText}>Paiement sécurisé avant appel</Text>
              </View>
              <View style={styles.paymentTrustRow}>
                <Ionicons name="wallet-outline" size={14} color={colors.primary} />
                <Text style={styles.paymentTrustText}>Montant placé en séquestre (escrow)</Text>
              </View>
              <View style={styles.paymentTrustRow}>
                <Ionicons name="checkmark-done-outline" size={14} color={colors.primary} />
                <Text style={styles.paymentTrustText}>Libération après appel réussi</Text>
              </View>
              <View style={styles.paymentTrustRow}>
                <Ionicons name="alert-circle-outline" size={14} color={colors.primary} />
                <Text style={styles.paymentTrustText}>Annulation/litige: remboursement selon politique</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      ) : null}

      {/* ============================ FOOTER STICKY ============================ */}
      <View style={[styles.footer, { paddingBottom: Spacing.md + insets.bottom }]}>
        {step === 1 ? (
          <>
            <View style={styles.priceWrap}>
              <Text style={styles.priceLabel}>Total</Text>
              <Text style={styles.priceValue}>F {(minPrice ?? 0).toLocaleString('fr-FR')}</Text>
            </View>
            <TouchableOpacity
              style={[styles.ctaBtn, availableDurations.length === 0 && { opacity: 0.5 }]}
              disabled={availableDurations.length === 0}
              onPress={goToStep2}
              accessibilityRole="button"
            >
              <Ionicons name="videocam" size={16} color="#FFF" />
              <Text style={styles.ctaText}>Continuer</Text>
            </TouchableOpacity>
          </>
        ) : step === 2 ? (
          <TouchableOpacity
            style={[styles.ctaBtnFullViolet, !selectedSlot && { opacity: 0.45 }]}
            disabled={!selectedSlot}
            onPress={goToStep3}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>Continuer</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.footerStep3Col}>
            <TouchableOpacity
              style={[styles.ctaBtnFullViolet, booking && { opacity: 0.7 }]}
              disabled={booking}
              onPress={confirmBooking}
              accessibilityRole="button"
            >
              {booking ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={18} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.ctaText}>
                    {payMethod === 'orange_money' ? 'Confirmer — Orange Money' : 'Confirmer et payer'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={styles.footerLegal}>
              Paiement sécurisé · Argent bloqué jusqu’à l’appel
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function createStyles(
  c: { background: string; text: string; textSecondary: string; primary: string; card: string; border: string },
  mode: 'light' | 'dark',
) {
  /** Fond hero toujours clair : le texte du thème « dark » (blanc) serait illisible — couleurs fixes pour contraste. */
  const heroBg = '#FFE8DD';
  const heroForeground = '#1A1410';
  const heroForegroundMuted = '#5C4A42';
  /** Pastilles sur fond blanc dans le hero : `c.text` en dark mode = blanc → invisible. */
  const heroBadgeLabel = '#24303A';
  const bookingSheetBg = mode === 'light' ? '#FFFFFF' : '#2A2A34';
  const bookingSheetBorder = mode === 'light' ? '#E8E8ED' : '#3D3D48';
  const summaryBg = mode === 'light' ? '#F4F4F8' : '#23232C';
  const stripMutedBorder = mode === 'light' ? '#E0E0E6' : '#444450';
  /** Bandeau confidentialité : fond clair ≠ texte clair (bug contraste dark mode). */
  const privacyBg = mode === 'light' ? '#FFF0E6' : '#4A3018';
  const privacyBorder = mode === 'light' ? '#FFD0B8' : '#7A4E28';
  const privacyFg = mode === 'light' ? '#4A3326' : '#FFE8D4';

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background, gap: Spacing.md },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    },
    iconBtn: { width: 40, height: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
    iconBtnSmall: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: c.text, fontSize: FontSizes.lg, fontWeight: '700', flex: 1, textAlign: 'center' },

    // Progress
    progressRow: { flexDirection: 'row', gap: 6, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
    progressBar: { flex: 1, height: 4, backgroundColor: c.border, borderRadius: 2 },
    progressBarOn: { backgroundColor: c.primary },

    // HERO CARD
    heroCard: {
      backgroundColor: heroBg, marginHorizontal: Spacing.md, borderRadius: BorderRadius.lg,
      paddingVertical: Spacing.xl, alignItems: 'center', overflow: 'hidden',
    },
    heroAvatarWrap: { padding: 4, borderRadius: 60, backgroundColor: '#FFF' },
    heroAvatar: { width: 100, height: 100, borderRadius: 50 },
    avatarFallback: { backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
    heroNameRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md },
    heroName: { color: heroForeground, fontSize: FontSizes.xxl, fontWeight: '800' },
    heroUsername: { color: heroForegroundMuted, fontSize: FontSizes.sm, marginTop: 2 },
    badgesRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.md, paddingHorizontal: Spacing.md, flexWrap: 'wrap', justifyContent: 'center' },
    badge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: Spacing.md, paddingVertical: 6,
      borderRadius: BorderRadius.pill, backgroundColor: '#FFF',
    },
    badgeOrange: { backgroundColor: '#FFF' },
    /** Labels badges dans le hero uniquement (fond clair). */
    badgeText: { color: heroBadgeLabel, fontSize: FontSizes.xs, fontWeight: '700' },

    walletHint: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: Spacing.md,
      marginTop: Spacing.md,
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    walletHintTitle: { color: c.text, fontSize: FontSizes.sm, fontWeight: '700' },
    walletHintBody: { color: c.textSecondary, fontSize: FontSizes.xs, marginTop: 4, lineHeight: 18 },
    walletHintLink: { color: BOOKING_VIOLET, fontSize: FontSizes.sm, fontWeight: '800' },

    // BIO
    bioBox: {
      flexDirection: 'row', gap: Spacing.sm,
      marginHorizontal: Spacing.md, marginTop: Spacing.lg,
      backgroundColor: c.card, borderRadius: BorderRadius.md,
      padding: Spacing.md, borderWidth: 1, borderColor: c.border,
    },
    bioBar: { width: 3, backgroundColor: c.border, borderRadius: 2 },
    bioText: { flex: 1, color: c.text, fontSize: FontSizes.sm, lineHeight: 20 },

    sectionTitle: { color: c.text, fontSize: FontSizes.lg, fontWeight: '800', paddingHorizontal: Spacing.md, marginTop: Spacing.lg, marginBottom: Spacing.sm },

    // SERVICES
    serviceCard: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
      backgroundColor: c.card, borderRadius: BorderRadius.md, padding: Spacing.md,
      borderWidth: 1, borderColor: c.border,
    },
    serviceCardOn: { borderColor: c.primary, borderWidth: 2 },
    serviceTitle: { color: c.text, fontSize: FontSizes.md, fontWeight: '700' },
    serviceSubtitle: { color: c.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
    servicePrice: { color: c.text, fontSize: FontSizes.lg, fontWeight: '800' },

    // RATINGS
    ratingCard: { marginHorizontal: Spacing.md, marginBottom: Spacing.sm, padding: Spacing.md, backgroundColor: c.card, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: c.border },
    ratingAuthor: { color: c.textSecondary, fontSize: FontSizes.xs },
    ratingReview: { color: c.text, fontSize: FontSizes.sm, marginTop: Spacing.xs },

    // RECAP MINI (étapes 2/3)
    miniRecap: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
      padding: Spacing.md, backgroundColor: c.card, borderRadius: BorderRadius.md,
      borderWidth: 1, borderColor: c.border, marginBottom: Spacing.md,
    },
    miniAvatar: { width: 48, height: 48, borderRadius: 24 },
    miniName: { color: c.text, fontSize: FontSizes.md, fontWeight: '700' },
    miniSub: { color: c.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },

    confirmSheet: { marginBottom: Spacing.md },

    // Récap paiement (capture 4)
    summaryCard: {
      backgroundColor: summaryBg,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: bookingSheetBorder,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
    },
    summaryTotalRow: {
      marginTop: Spacing.sm,
      paddingTop: Spacing.sm,
      borderTopWidth: 1,
      borderTopColor: bookingSheetBorder,
    },
    summaryLabel: { color: c.textSecondary, fontSize: FontSizes.sm },
    summaryValue: { color: c.text, fontSize: FontSizes.sm, fontWeight: '600' },
    summaryTotal: { color: BOOKING_VIOLET, fontSize: FontSizes.xl, fontWeight: '800' },

    // Feuille réservation étape 2 (modal-like)
    bookingSheet: {
      backgroundColor: bookingSheetBg,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: bookingSheetBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: mode === 'light' ? 0.08 : 0.22,
      shadowRadius: 22,
      elevation: 8,
    },
    sheetTitle: {
      color: c.text,
      fontSize: FontSizes.lg,
      fontWeight: '800',
      marginBottom: Spacing.md,
    },
    weekNavRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
    },
    weekNavHit: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    weekRangeText: {
      flex: 1,
      textAlign: 'center',
      color: c.text,
      fontSize: FontSizes.sm,
      fontWeight: '700',
    },
    dayStrip: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 4,
      marginBottom: Spacing.lg,
    },
    dayStripCell: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: stripMutedBorder,
      backgroundColor: mode === 'light' ? '#FAFAFC' : '#32323C',
      minWidth: 0,
    },
    dayStripCellOn: {
      backgroundColor: BOOKING_VIOLET,
      borderColor: BOOKING_VIOLET,
    },
    dayStripCellMuted: {
      opacity: 0.38,
    },
    dayStripDow: {
      color: c.textSecondary,
      fontSize: 10,
      fontWeight: '700',
    },
    dayStripNum: {
      color: c.text,
      fontSize: FontSizes.md,
      fontWeight: '800',
      marginTop: 2,
    },
    dayStripTextOn: {
      color: '#FFFFFF',
    },

    slotsSection: { marginTop: Spacing.xs },
    slotsSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.md,
      flexWrap: 'wrap',
    },
    slotsSectionTitle: {
      color: c.text,
      fontSize: FontSizes.sm,
      fontWeight: '700',
      flex: 1,
    },

    emptySlots: { color: c.textSecondary, paddingVertical: Spacing.lg, fontSize: FontSizes.sm, textAlign: 'center' },
    pickDayHint: {
      color: c.textSecondary,
      fontSize: FontSizes.sm,
      textAlign: 'center',
      paddingVertical: Spacing.md,
    },
    slotGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -4,
    },
    slotTileWrap: {
      width: '25%',
      padding: 4,
    },
    slotBtn: {
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: bookingSheetBorder,
      backgroundColor: mode === 'light' ? '#FFFFFF' : '#32323C',
      paddingVertical: Spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    slotBtnOn: {
      backgroundColor: BOOKING_VIOLET,
      borderColor: BOOKING_VIOLET,
    },
    slotBtnLabel: {
      color: c.text,
      fontSize: FontSizes.sm,
      fontWeight: '700',
    },
    slotBtnLabelOn: {
      color: '#FFFFFF',
    },

    calCard: { backgroundColor: c.card, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: c.border },

    // CONTACT
    contactTitle: { color: c.text, fontSize: FontSizes.lg, fontWeight: '700', marginBottom: Spacing.md },
    contactLabel: { color: c.text, fontSize: FontSizes.sm, fontWeight: '600', marginBottom: Spacing.sm },
    phoneRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: c.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, height: 48, backgroundColor: c.background },
    phonePrefix: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: Spacing.sm, borderRightWidth: 1, borderRightColor: c.border },
    prefixText: { color: c.text, fontSize: FontSizes.md, fontWeight: '700' },
    phoneInput: {
      flex: 1, color: c.text, fontSize: FontSizes.md, height: 48, outlineStyle: 'none',
      ...(Platform.OS === 'web' ? { outlineWidth: 0 } : {}),
    } as never,
    privacyBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
      marginTop: Spacing.md,
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      backgroundColor: privacyBg,
      borderWidth: 1,
      borderColor: privacyBorder,
    },
    privacyText: { flex: 1, color: privacyFg, fontSize: FontSizes.xs, lineHeight: 18 },
    payMethodRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
    payChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.background,
    },
    payChipOn: { backgroundColor: BOOKING_VIOLET, borderColor: BOOKING_VIOLET },
    payChipText: { color: c.text, fontSize: FontSizes.sm, fontWeight: '700' },
    payChipTextOn: { color: '#FFF' },
    omHint: {
      marginTop: Spacing.sm,
      color: c.textSecondary,
      fontSize: FontSizes.xs,
      lineHeight: 18,
    },
    paymentTrustBox: {
      marginTop: Spacing.md,
      gap: 6,
      backgroundColor: c.background,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
    },
    paymentTrustRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    paymentTrustText: {
      color: mode === 'dark' ? '#D8D8E0' : c.textSecondary,
      fontSize: FontSizes.xs,
      flex: 1,
      lineHeight: 18,
    },

    // FOOTER
    footer: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
      paddingHorizontal: Spacing.md, paddingTop: Spacing.md,
      borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.background,
    },
    footerStep3Col: { flex: 1, minWidth: 0, alignItems: 'stretch' },
    priceWrap: { flex: 1 },
    priceLabel: { color: c.textSecondary, fontSize: FontSizes.xs },
    priceValue: { color: c.text, fontSize: FontSizes.xl, fontWeight: '800' },
    ctaBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.primary, paddingHorizontal: Spacing.xl, height: 48, borderRadius: BorderRadius.pill, justifyContent: 'center' },
    ctaBtnFull: { flex: 1, backgroundColor: c.primary, height: 48, borderRadius: BorderRadius.pill, alignItems: 'center', justifyContent: 'center' },
    ctaBtnFullViolet: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'stretch',
      backgroundColor: BOOKING_VIOLET,
      minHeight: 52,
      borderRadius: BorderRadius.pill,
      paddingHorizontal: Spacing.md,
    },
    footerLegal: {
      marginTop: Spacing.sm,
      color: c.textSecondary,
      fontSize: FontSizes.xs,
      textAlign: 'center',
      lineHeight: 16,
    },
    ctaText: { color: '#FFF', fontWeight: '800', fontSize: FontSizes.md },
    emptyText: { color: c.text, fontSize: FontSizes.md, textAlign: 'center' },
  });
}
