/**
 * Écran APPEL ACTIF — Paid Video Calls (User ↔ Star).
 * Route : `/stars/call/[bookingId]`.
 *
 * Logique :
 *  1. Récupère le booking + pose un interval heartbeat (10 s).
 *  2. Lance `useStarCallRtc` (Agora Communication profile).
 *  3. Timer ne démarre qu'à partir du moment où `remoteJoined === true`.
 *  4. Bouton "+5 min" (fan uniquement) → appel API extend + prolonge le temps.
 *  5. Timer à 0 → invite à raccrocher (appel API end).
 *  6. Bouton raccrocher → appel API end → redirection rating/dispute.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform, AppState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../src/theme/ThemeContext';
import { FontSizes, Spacing, BorderRadius } from '../../../src/theme/colors';
import { MIN_TOUCH_TARGET } from '../../../src/theme/designSystem';
import { useStarCallRtc } from '../../../src/hooks/useStarCallRtc';
import starsApi, { type StarBooking } from '../../../src/api/starsApi';
import { useAuthStore } from '../../../src/store/authStore';

function formatSec(sec: number): string {
  if (sec < 0) sec = 0;
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function StarCallScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const meId = useAuthStore((s) => s.user?.id);
  const [booking, setBooking] = useState<StarBooking | null>(null);
  const [loadingBooking, setLoadingBooking] = useState(true);
  const [muted, setMuted] = useState(false);
  const [videoOn, setVideoOn] = useState(true);
  const [cameraFlipNonce, setCameraFlipNonce] = useState(0);
  const [extending, setExtending] = useState(false);
  const [ending, setEnding] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startAtRef = useRef<number | null>(null);

  const isFan = useMemo(() => (booking && meId ? booking.fan_user_id === meId : false), [booking, meId]);

  const rtc = useStarCallRtc({
    bookingId: bookingId ?? null,
    enabled: !!booking && (booking.status === 'confirmed' || booking.status === 'ongoing'),
    muted,
    videoEnabled: videoOn,
    cameraFlipNonce,
  });

  // Load booking
  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
    void (async () => {
      try {
        const b = await starsApi.getBooking(bookingId);
        if (cancelled) return;
        setBooking(b);
        if (b.actually_started_at) startAtRef.current = new Date(b.actually_started_at).getTime();
        await starsApi.joinCall(bookingId).catch(() => null);
      } catch (e) {
        if (!cancelled) Alert.alert('Appel', (e as Error)?.message || 'Appel indisponible');
      } finally {
        if (!cancelled) setLoadingBooking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [bookingId]);

  // Démarrage du timer dès qu'on sait que l'autre est présent
  useEffect(() => {
    if (rtc.remoteJoined && startAtRef.current == null) {
      startAtRef.current = Date.now();
    }
  }, [rtc.remoteJoined]);

  // Heartbeat
  useEffect(() => {
    if (!bookingId) return;
    const h = setInterval(() => { void starsApi.heartbeat(bookingId).catch(() => null); }, 10_000);
    return () => clearInterval(h);
  }, [bookingId]);

  // Tick timer
  useEffect(() => {
    const t = setInterval(() => {
      if (startAtRef.current) setElapsedMs(Date.now() - startAtRef.current);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const totalMinutes = booking ? booking.duration_minutes + (booking.extra_minutes || 0) : 0;
  const totalMs = totalMinutes * 60_000;
  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const progressPct = totalMs > 0 ? Math.min(100, (elapsedMs / totalMs) * 100) : 0;

  // Fin automatique côté client quand temps écoulé + grâce 5s
  useEffect(() => {
    if (!booking || !bookingId) return;
    if (startAtRef.current && remainingMs === 0 && booking.status === 'ongoing') {
      void doEnd('timeout');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMs, booking, bookingId]);

  // Nettoyage au unmount (si utilisateur quitte)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' && bookingId && booking?.status === 'ongoing') {
        void starsApi.heartbeat(bookingId).catch(() => null);
      }
    });
    return () => sub.remove();
  }, [bookingId, booking]);

  const doExtend = useCallback(async () => {
    if (!bookingId || !isFan) return;
    setExtending(true);
    try {
      const out = await starsApi.extendCall(bookingId);
      setBooking(out.booking);
    } catch (e) {
      Alert.alert('Extension', (e as Error)?.message || 'Extension refusée.');
    } finally {
      setExtending(false);
    }
  }, [bookingId, isFan]);

  const doEnd = useCallback(async (reason: string) => {
    if (!bookingId) return;
    setEnding(true);
    try {
      const updated = await starsApi.endCall(bookingId, reason);
      if (updated.status === 'completed' && isFan) {
        router.replace(`/stars/rate/${bookingId}` as never);
      } else {
        router.back();
      }
    } catch (e) {
      Alert.alert('Appel', (e as Error)?.message || 'Impossible de terminer l\'appel');
    } finally {
      setEnding(false);
    }
  }, [bookingId, isFan]);

  if (loadingBooking || !booking) {
    return <View style={[styles.root, styles.center]}><ActivityIndicator color="#FFF" size="large" /></View>;
  }

  return (
    <View style={styles.root}>
      <rtc.RemoteView style={styles.remote} />
      <View style={[styles.localBubble, { top: insets.top + Spacing.md, right: Spacing.md }]}>
        <rtc.LocalView style={styles.localInner} />
        {!videoOn ? (
          <View style={[StyleSheet.absoluteFill, styles.localVideoOff]}>
            <Ionicons name="videocam-off" size={18} color="#FFF" />
          </View>
        ) : null}
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.timerPill}>
          <Ionicons name="time-outline" size={16} color="#FFF" />
          <Text style={styles.timerText}>
            {rtc.remoteJoined ? formatSec(remainingMs / 1000) : 'En attente…'}
          </Text>
        </View>
        {rtc.audioFallback ? (
          <View style={styles.fallbackPill}>
            <Ionicons name="wifi-outline" size={14} color="#FFF" />
            <Text style={styles.fallbackText}>Mode audio</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>

      {rtc.error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color="#FFF" />
          <Text style={styles.errorText}>{rtc.error}</Text>
        </View>
      ) : !rtc.remoteJoined ? (
        <View style={styles.waitOverlay}>
          <ActivityIndicator color="#FFF" size="large" />
          <Text style={styles.waitText}>
            {isFan ? 'En attente de la star…' : 'En attente du fan…'}
          </Text>
        </View>
      ) : null}

      <View style={[styles.controls, { paddingBottom: Spacing.lg + insets.bottom }]}>
        {isFan ? (
          <TouchableOpacity
            style={[styles.ctrlBtn, styles.extendBtn, extending && { opacity: 0.5 }]}
            disabled={extending}
            onPress={doExtend}
          >
            {extending ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Ionicons name="add-circle" size={22} color="#FFF" />
                <Text style={styles.ctrlText}>+5 min</Text>
              </>
            )}
          </TouchableOpacity>
        ) : <View style={{ width: 72 }} />}

        <View style={styles.centerRow}>
          <TouchableOpacity style={[styles.ctrlBtn, muted && styles.ctrlBtnOn]} onPress={() => setMuted((m) => !m)}>
            <Ionicons name={muted ? 'mic-off' : 'mic'} size={22} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.ctrlBtn, !videoOn && styles.ctrlBtnOn]} onPress={() => setVideoOn((v) => !v)}>
            <Ionicons name={videoOn ? 'videocam' : 'videocam-off'} size={22} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.ctrlBtn} onPress={() => setCameraFlipNonce((n) => n + 1)}>
            <Ionicons name="camera-reverse" size={22} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ctrlBtn, styles.hangupBtn]}
            disabled={ending}
            onPress={() => doEnd('hangup')}
          >
            {ending ? <ActivityIndicator color="#FFF" /> : <Ionicons name="call" size={22} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />}
          </TouchableOpacity>
        </View>

        <View style={{ width: 72 }} />
      </View>
    </View>
  );
}

function createStyles(c: { background: string; text: string; textSecondary: string; primary: string; card: string; border: string }) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000' },
    center: { alignItems: 'center', justifyContent: 'center' },
    remote: { ...StyleSheet.absoluteFillObject },
    localBubble: { position: 'absolute', width: 110, height: 150, borderRadius: 14, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', backgroundColor: '#222', zIndex: 2 },
    localInner: { flex: 1 },
    localVideoOff: { backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', opacity: 0.85 },
    topBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
      paddingHorizontal: Spacing.lg, zIndex: 3,
    },
    timerPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.pill },
    timerText: { color: '#FFF', fontWeight: '800', fontSize: FontSizes.md, fontVariant: ['tabular-nums'] as never },
    fallbackPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#B8860B', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.pill },
    fallbackText: { color: '#FFF', fontSize: FontSizes.xs, fontWeight: '700' },
    progressBar: { position: 'absolute', top: Platform.OS === 'ios' ? 64 : 44, left: 0, right: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.1)', zIndex: 3 },
    progressFill: { height: 3, backgroundColor: c.primary },
    errorBanner: { position: 'absolute', top: 120, alignSelf: 'center', flexDirection: 'row', gap: 6, backgroundColor: '#B00', paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.pill },
    errorText: { color: '#FFF', fontSize: FontSizes.sm, fontWeight: '600' },
    waitOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, zIndex: 1 },
    waitText: { color: '#FFF', fontSize: FontSizes.md, fontWeight: '600' },
    controls: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 3 },
    centerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    ctrlBtn: { width: MIN_TOUCH_TARGET + 4, height: MIN_TOUCH_TARGET + 4, borderRadius: (MIN_TOUCH_TARGET + 4) / 2, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 },
    ctrlBtnOn: { backgroundColor: c.primary },
    hangupBtn: { backgroundColor: '#E53935', width: MIN_TOUCH_TARGET + 10, height: MIN_TOUCH_TARGET + 10, borderRadius: (MIN_TOUCH_TARGET + 10) / 2 },
    extendBtn: { flexDirection: 'row', paddingHorizontal: Spacing.md, backgroundColor: c.primary, borderRadius: BorderRadius.pill, height: MIN_TOUCH_TARGET + 4, width: 'auto', gap: 6 },
    ctrlText: { color: '#FFF', fontWeight: '800' },
  });
}
