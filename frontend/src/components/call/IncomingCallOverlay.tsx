import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Animated, Platform, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import socketService from '../../services/socketService';
import { useAuthStore } from '../../store/authStore';
import { featureFlags } from '../../config/featureFlags';
import { startLoopingCallRing } from '../../call/callRingtone';

/**
 * Overlay d'appel entrant — global (`_layout.tsx`).
 * Son + vibration sur mobile jusqu'à réponse / refus / fin.
 */

type IncomingCall = {
  callId: string;
  fromUserId: string;
  toUserId: string;
  type: 'audio' | 'video';
  callerName?: string;
  callerAvatar?: string;
};

export function IncomingCallOverlay() {
  const myUserId = useAuthStore((s) => s.user?.id);
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const pulse = useRef(new Animated.Value(1)).current;
  const incomingRef = useRef<IncomingCall | null>(null);
  incomingRef.current = incoming;

  useEffect(() => {
    if (!myUserId) return;
    if (!featureFlags.callsOnNative) return;
    const onInvite = (payload: IncomingCall) => {
      if (!payload || payload.toUserId !== myUserId) return;
      setIncoming(payload);
    };
    const clearIfSameCall = (payload: { callId?: string }) => {
      const cur = incomingRef.current;
      if (cur && payload?.callId === cur.callId) {
        setIncoming(null);
      }
    };
    const offInvite = socketService.on('call:invite', onInvite);
    const offEnd = socketService.on('call:end', clearIfSameCall);
    const offDecline = socketService.on('call:decline', clearIfSameCall);
    return () => {
      offInvite();
      offEnd();
      offDecline();
    };
  }, [myUserId]);

  useEffect(() => {
    if (!incoming) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.25, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [incoming, pulse]);

  /** Sonnerie + vibration (Android / iOS), silencieux sur web. */
  useEffect(() => {
    if (!incoming || Platform.OS === 'web') return;
    let stopRing: (() => Promise<void>) | null = null;
    let vibeTimer: ReturnType<typeof setInterval> | null = null;
    void (async () => {
      stopRing = await startLoopingCallRing(0.92, { preset: 'incoming' });
    })();
    try {
      if (Platform.OS === 'android') {
        Vibration.vibrate([0, 520, 260, 520], true);
      } else {
        const pulseVibe = () => {
          try {
            Vibration.vibrate(380);
          } catch {
            /* ignore */
          }
        };
        pulseVibe();
        vibeTimer = setInterval(pulseVibe, 1250);
      }
    } catch {
      /* ignore */
    }
    return () => {
      void stopRing?.();
      if (vibeTimer) clearInterval(vibeTimer);
      try {
        Vibration.cancel();
      } catch {
        /* ignore */
      }
    };
  }, [incoming]);

  if (!incoming) return null;

  const accept = () => {
    const c = incoming;
    setIncoming(null);
    router.push({
      pathname: '/messages/call' as never,
      params: {
        name: c.callerName || 'Contact',
        avatar: c.callerAvatar || '',
        type: c.type,
        otherUserId: c.fromUserId,
        role: 'receiver',
        callId: c.callId,
      } as never,
    });
  };

  const decline = () => {
    const c = incoming;
    setIncoming(null);
    if (myUserId) {
      void socketService.ensureConnectedEmit('call:decline', {
        callId: c.callId,
        fromUserId: myUserId,
        toUserId: c.fromUserId,
        reason: 'busy',
      });
    }
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={decline}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.label}>{incoming.type === 'video' ? 'Appel vidéo entrant' : 'Appel audio entrant'}</Text>
          <Animated.View style={[styles.avatarWrap, { transform: [{ scale: pulse }] }]}>
            {incoming.callerAvatar ? (
              <Image source={{ uri: incoming.callerAvatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="person" size={48} color="#FFF" />
              </View>
            )}
          </Animated.View>
          <Text style={styles.name}>{incoming.callerName || 'Contact'}</Text>
          <Text style={styles.sub}>vous appelle…</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.declineBtn]} onPress={decline}>
              <Ionicons name="call" size={26} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={accept}>
              <Ionicons name={incoming.type === 'video' ? 'videocam' : 'call'} size={26} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '88%', maxWidth: 380, backgroundColor: '#11151B', borderRadius: 20, padding: 26, alignItems: 'center' },
  label: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginBottom: 16, fontWeight: '600' },
  avatarWrap: { padding: 6, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.06)' },
  avatar: { width: 112, height: 112, borderRadius: 56, backgroundColor: '#1F2733' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  name: { color: '#FFF', fontSize: 22, fontWeight: '800', marginTop: 14 },
  sub: { color: 'rgba(255,255,255,0.55)', fontSize: 14, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 60, marginTop: 28 },
  btn: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  declineBtn: { backgroundColor: '#FF3D00' },
  acceptBtn: { backgroundColor: '#10B981' },
});

export default IncomingCallOverlay;
