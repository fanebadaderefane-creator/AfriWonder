import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Platform,
  Vibration,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import AnimatedRe, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import socketService from '../../services/socketService';
import { useAuthStore } from '../../store/authStore';
import { featureFlags } from '../../config/featureFlags';
import { startLoopingCallRing } from '../../call/callRingtone';
import { profileAvatarUri } from '../../utils/avatarFallback';
import apiClient from '../../api/client';
import { getAlertMessageForCaughtError } from '../../utils/userFacingError';
import { IncomingCallQuickReplyPanel } from './IncomingCallQuickReplyPanel';

/**
 * Appel entrant plein écran (Refuser · balayer pour accepter · Message avec réponses rapides).
 * Son + vibration jusqu'à réponse / refus / fin.
 */

type IncomingCall = {
  callId: string;
  fromUserId: string;
  toUserId: string;
  type: 'audio' | 'video';
  callerName?: string;
  callerAvatar?: string;
};

const SWIPE_ACCEPT_THRESHOLD_PX = 56;
const SWIPE_ACCEPT_VELOCITY = -520;

export function IncomingCallOverlay() {
  const myUserId = useAuthStore((s) => s.user?.id);
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const incomingRef = useRef<IncomingCall | null>(null);
  incomingRef.current = incoming;

  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showCustomMessage, setShowCustomMessage] = useState(false);
  const [customText, setCustomText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const dragY = useSharedValue(0);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!myUserId) return;
    if (!featureFlags.callsOnNative) return;

    const onInvite = (payload: IncomingCall) => {
      if (!payload || payload.toUserId !== myUserId) return;
      setIncoming(payload);
      setShowQuickReplies(false);
      setShowCustomMessage(false);
      setCustomText('');
    };
    const clearIfSameCall = (payload: { callId?: string }) => {
      const cur = incomingRef.current;
      if (cur && payload?.callId === cur.callId) {
        setIncoming(null);
        setShowQuickReplies(false);
        setShowCustomMessage(false);
      }
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
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
    /* pulse : Animated.Value stable via useRef ; relance uniquement pour un nouvel appel. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming?.callId]);

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

  const accept = useCallback(() => {
    const c = incomingRef.current;
    if (!c) return;
    setIncoming(null);
    setShowQuickReplies(false);
    setShowCustomMessage(false);
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
  }, []);

  const decline = useCallback(() => {
    const c = incomingRef.current;
    setIncoming(null);
    setShowQuickReplies(false);
    setShowCustomMessage(false);
    setCustomText('');
    if (c && myUserId) {
      void socketService.ensureConnectedEmit('call:decline', {
        callId: c.callId,
        fromUserId: myUserId,
        toUserId: c.fromUserId,
        reason: 'busy',
      });
    }
  }, [myUserId]);

  const sendTextToCaller = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      const c = incomingRef.current;
      if (!trimmed || !c || !myUserId) return;
      setSendingReply(true);
      try {
        let conversationId: string | undefined;
        try {
          const r = await apiClient.get(
            `/messages/conversation/${encodeURIComponent(c.fromUserId)}`,
          );
          const conv = r.data?.data;
          if (conv && typeof conv.id === 'string') conversationId = conv.id;
        } catch {
          /* fil de discussion peut encore être créé côté serveur au send */
        }
        await apiClient.post('/messages/send', {
          recipientId: c.fromUserId,
          content: trimmed,
          type: 'text',
          ...(conversationId ? { conversationId } : {}),
        });
        decline();
      } catch (err: unknown) {
        Alert.alert('Message', getAlertMessageForCaughtError(err));
      } finally {
        setSendingReply(false);
      }
    },
    [myUserId, decline],
  );

  const panAccept = Gesture.Pan()
    .activeOffsetY(-12)
    .failOffsetX([-48, 48])
    .onUpdate((e) => {
      if (e.translationY < 0) {
        dragY.value = Math.max(e.translationY, -140);
      }
    })
    .onEnd((e) => {
      const shouldAccept =
        dragY.value < -SWIPE_ACCEPT_THRESHOLD_PX || e.velocityY < SWIPE_ACCEPT_VELOCITY;
      if (shouldAccept) {
        runOnJS(accept)();
      }
      dragY.value = withSpring(0, { damping: 18, stiffness: 220 });
    });

  const acceptCircleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dragY.value }],
  }));

  if (!featureFlags.callsOnNative || !incoming) return null;

  const avatarUri = profileAvatarUri(incoming.callerAvatar, incoming.callerName || 'Contact');
  const video = incoming.type === 'video';

  return (
    <Modal
      transparent={false}
      visible
      animationType="fade"
      onRequestClose={decline}
      presentationStyle="fullScreen"
    >
      <View style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
              <View style={styles.headerBlock}>
                <Text style={styles.callerName} numberOfLines={2}>
                  {incoming.callerName || 'Contact'}
                </Text>
                <View style={styles.subRow}>
                  <Ionicons name="call" size={16} color="rgba(255,255,255,0.65)" />
                  <Text style={styles.subtitle}>
                    {video ? 'Appel vidéo AfriWonder' : 'Appel audio AfriWonder'}
                  </Text>
                </View>
              </View>

              <View style={styles.avatarWrap}>
                <Animated.View style={{ transform: [{ scale: pulse }] }}>
                  <Image source={{ uri: avatarUri }} style={styles.avatar} />
                </Animated.View>
              </View>

              <View style={styles.bottomDock}>
                <View style={styles.dockCol}>
                  <TouchableOpacity
                    style={[styles.circleBtn, styles.btnDecline]}
                    onPress={decline}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Refuser l’appel"
                  >
                    <Ionicons name="call" size={30} color="#FFF" style={styles.iconHangup} />
                  </TouchableOpacity>
                  <Text style={styles.dockLabel}>Refuser</Text>
                </View>

                <View style={styles.dockCol}>
                  <Ionicons name="chevron-up" size={18} color="rgba(255,255,255,0.85)" />
                  <Ionicons
                    name="chevron-up"
                    size={18}
                    color="rgba(255,255,255,0.55)"
                    style={{ marginTop: -10 }}
                  />
                  <GestureDetector gesture={panAccept}>
                    <AnimatedRe.View style={[styles.circleBtn, styles.btnAccept, acceptCircleStyle]}>
                      <Ionicons name="call" size={32} color="#FFF" />
                    </AnimatedRe.View>
                  </GestureDetector>
                  <Text style={styles.swipeHint}>Balayer vers le haut pour accepter</Text>
                </View>

                <View style={styles.dockCol}>
                  <TouchableOpacity
                    style={[styles.circleBtn, styles.btnMessage]}
                    onPress={() => setShowQuickReplies(true)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Répondre par un message"
                  >
                    <Ionicons name="chatbubble-ellipses" size={26} color="#FFF" />
                  </TouchableOpacity>
                  <Text style={styles.dockLabel}>Message</Text>
                </View>
              </View>

          <IncomingCallQuickReplyPanel
            showQuickReplies={showQuickReplies}
            showCustomMessage={showCustomMessage}
            sendingReply={sendingReply}
            customText={customText}
            onChangeCustomText={setCustomText}
            onCloseQuick={() => setShowQuickReplies(false)}
            onPickPreset={(line) => void sendTextToCaller(line)}
            onOpenCustom={() => {
              setShowQuickReplies(false);
              setShowCustomMessage(true);
            }}
            onCloseCustom={() => {
              setShowCustomMessage(false);
              setCustomText('');
            }}
            onSendCustom={() => void sendTextToCaller(customText)}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B141A',
  },
  safe: {
    flex: 1,
  },
  headerBlock: {
    paddingHorizontal: 24,
    paddingTop: 8,
    alignItems: 'center',
  },
  callerName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
  },
  avatarWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: '#2A3942',
  },
  bottomDock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  dockCol: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 8,
  },
  dockLabel: {
    marginTop: 10,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  swipeHint: {
    marginTop: 10,
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    paddingHorizontal: 4,
    maxWidth: 120,
  },
  circleBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnDecline: {
    backgroundColor: '#E53935',
  },
  btnAccept: {
    backgroundColor: '#25D366',
    marginTop: 10,
  },
  btnMessage: {
    backgroundColor: '#2A3942',
  },
  iconHangup: {
    transform: [{ rotate: '135deg' }],
  },
});

export default IncomingCallOverlay;
