import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import socketService from '../../services/socketService';
import { useAuthStore } from '../../store/authStore';
import { featureFlags } from '../../config/featureFlags';
import { buildCallDeclinePayload } from '../../call/callSignalingPayload';
import { INCOMING_CALL_RING_VOLUME } from '../../call/callIncomingAlerts';
import { startLoopingCallRing } from '../../call/callRingtone';
import { profileAvatarUri } from '../../utils/avatarFallback';

type IncomingCall = {
  callId: string;
  fromUserId: string;
  toUserId: string;
  type: 'audio' | 'video';
  callerName?: string;
  callerAvatar?: string;
};

/**
 * Web : overlay simple (sans Reanimated/RNGH) pour accepter ou refuser un appel entrant.
 */
export function IncomingCallOverlay() {
  const myUserId = useAuthStore((s) => s.user?.id);
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const incomingRef = useRef<IncomingCall | null>(null);
  incomingRef.current = incoming;
  const acceptingRef = useRef(false);

  useEffect(() => {
    if (!myUserId || !featureFlags.callsOnNative) return;

    const onInvite = (payload: IncomingCall) => {
      if (!payload || payload.toUserId !== myUserId) return;
      setIncoming(payload);
    };
    const clearIfSameCall = (payload: { callId?: string }) => {
      const cur = incomingRef.current;
      if (cur && payload?.callId === cur.callId) setIncoming(null);
    };
    const offInvite = socketService.on('call:invite', onInvite);
    const offEnd = socketService.on('call:end', clearIfSameCall);
    const offDecline = socketService.on('call:decline', clearIfSameCall);
    const offMissed = socketService.on('call:missed', clearIfSameCall);
    return () => {
      offInvite();
      offEnd();
      offDecline();
      offMissed();
    };
  }, [myUserId]);

  useEffect(() => {
    if (!incoming) return;
    let stopRing: (() => Promise<void>) | null = null;
    void (async () => {
      stopRing = await startLoopingCallRing(INCOMING_CALL_RING_VOLUME, { preset: 'incoming' });
    })();
    return () => {
      void stopRing?.();
    };
  }, [incoming?.callId]);

  const dismiss = useCallback(() => setIncoming(null), []);

  const accept = useCallback(async () => {
    if (acceptingRef.current) return;
    const c = incomingRef.current;
    if (!c || !myUserId) return;
    acceptingRef.current = true;
    try {
      dismiss();
      router.push({
        pathname: '/messages/call' as never,
        params: {
          callId: c.callId,
          peerId: c.fromUserId,
          peerName: c.callerName || 'Contact',
          peerAvatar: c.callerAvatar || '',
          callType: c.type,
          role: 'receiver',
        } as never,
      });
    } finally {
      acceptingRef.current = false;
    }
  }, [dismiss, myUserId]);

  const decline = useCallback(async () => {
    const c = incomingRef.current;
    dismiss();
    if (c && myUserId) {
      await socketService.ensureConnectedEmit(
        'call:decline',
        buildCallDeclinePayload({
          callId: c.callId,
          declinerUserId: myUserId,
          callerUserId: c.fromUserId,
          reason: 'busy',
        }),
        8_000,
      );
    }
  }, [dismiss, myUserId]);

  if (!incoming) return null;

  const avatarUri = profileAvatarUri(incoming.callerAvatar, incoming.callerName || 'Contact');
  const label = incoming.type === 'video' ? 'Appel vidéo entrant' : 'Appel audio entrant';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={decline}>
      <SafeAreaView style={styles.backdrop}>
        <View style={styles.card}>
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
          <Text style={styles.name}>{incoming.callerName || 'Contact'}</Text>
          <Text style={styles.subtitle}>{label}</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.declineBtn} onPress={decline} accessibilityLabel="Refuser">
              <Ionicons name="close" size={28} color="#FFF" />
              <Text style={styles.btnLabel}>Refuser</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={accept} accessibilityLabel="Accepter">
              <Ionicons name={incoming.type === 'video' ? 'videocam' : 'call'} size={28} color="#FFF" />
              <Text style={styles.btnLabel}>Accepter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 16,
  },
  name: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 15,
    marginBottom: 28,
  },
  actions: {
    flexDirection: 'row',
    gap: 20,
  },
  declineBtn: {
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 40,
    width: 80,
    height: 80,
    justifyContent: 'center',
  },
  acceptBtn: {
    alignItems: 'center',
    backgroundColor: '#22C55E',
    borderRadius: 40,
    width: 80,
    height: 80,
    justifyContent: 'center',
  },
  btnLabel: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
});
