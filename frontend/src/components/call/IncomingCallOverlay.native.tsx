import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import AnimatedRe, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import socketService from '../../services/socketService';
import { useAuthStore } from '../../store/authStore';
import { featureFlags } from '../../config/featureFlags';
import { INCOMING_CALL_RING_VOLUME, startIncomingCallVibration } from '../../call/callIncomingAlerts';
import { startLoopingCallRing, stopAllCallRings } from '../../call/callRingtone';
import { buildCallDeclinePayload, callUserIdsEqual } from '../../call/callSignalingPayload';
import { logAfwCall } from '../../call/callDiagnosticLog';
import { dismissIncomingCall } from '../../services/incomingCallService';
import { profileAvatarUri } from '../../utils/avatarFallback';
import apiClient from '../../api/client';
import { getAlertMessageForCaughtError } from '../../utils/userFacingError';
import { useToast } from '../common/ToastProvider';
import { IncomingCallQuickReplyPanel } from './IncomingCallQuickReplyPanel';
import { navigateToReceiverCallScreen } from '../../call/openNativeCallScreen';

/**
 * Appel entrant plein écran (Refuser · balayer pour accepter · Message avec réponses rapides).
 * Sonnerie pulsée + vibration discrète (style WhatsApp) jusqu'à réponse / refus / fin.
 */

type IncomingCall = {
  callId: string;
  fromUserId: string;
  toUserId: string;
  type: 'audio' | 'video';
  callerName?: string;
  callerAvatar?: string;
};

const SWIPE_ACCEPT_THRESHOLD_PX = 40;
const SWIPE_ACCEPT_VELOCITY = -420;

export function IncomingCallOverlay() {
  const myUserId = useAuthStore((s) => s.user?.id);
  const { showToast } = useToast();
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const incomingRef = useRef<IncomingCall | null>(null);
  incomingRef.current = incoming;

  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showCustomMessage, setShowCustomMessage] = useState(false);
  const [customText, setCustomText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const dragY = useSharedValue(0);
  const pulse = useRef(new Animated.Value(1)).current;
  const acceptingRef = useRef(false);
  const stopRingRef = useRef<(() => Promise<void>) | null>(null);
  const stopVibrationRef = useRef<(() => void) | null>(null);

  const stopIncomingRing = useCallback(async () => {
    await stopRingRef.current?.();
    stopRingRef.current = null;
    stopVibrationRef.current?.();
    stopVibrationRef.current = null;
    await stopAllCallRings();
  }, []);

  const dismissIncomingUi = useCallback(() => {
    setIncoming(null);
    setShowQuickReplies(false);
    setShowCustomMessage(false);
    setCustomText('');
  }, []);

  useEffect(() => {
    if (!myUserId) return;
    if (!featureFlags.callsOnNative) return;

    const onInvite = (payload: IncomingCall) => {
      if (!payload || !callUserIdsEqual(payload.toUserId, myUserId)) return;
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
    if (!incoming?.callId) {
      void stopIncomingRing();
      return;
    }
    let disposed = false;
    stopVibrationRef.current = startIncomingCallVibration();
    void startLoopingCallRing(INCOMING_CALL_RING_VOLUME, { preset: 'incoming' }).then((stop) => {
      if (disposed) {
        void stop();
        return;
      }
      stopRingRef.current = stop;
    });
    return () => {
      disposed = true;
      void stopIncomingRing();
    };
  }, [incoming?.callId, stopIncomingRing]);

  const accept = useCallback(async () => {
    if (acceptingRef.current) return;
    const c = incomingRef.current;
    if (!c || !myUserId) return;
    acceptingRef.current = true;
    logAfwCall('overlay_accept_tap', { callId: c.callId, type: c.type });
    try {
      /**
       * ⛔ VERROUILLÉ — Ne pas émettre `call:accept` ici (régression silence + SDP perdu).
       * L’appelant envoie l’offre dès accept : le receveur doit avoir monté sa PeerConnection avant.
       * `call:accept` est émis uniquement dans `call.tsx` après getUserMedia.
       * Règle : `.cursor/rules/call-signaling-locked.mdc`
       *
       * La navigation NE DOIT PAS dépendre de l'arrêt de la sonnerie : sur appareils lents
       * (Mali, 2-3 Go) `stopIncomingRing()` pouvait traîner/rejeter et bloquer l'accept
       * (« rien ne se passe »). On navigue d'abord, on coupe la sonnerie en best-effort
       * (call.tsx libère de toute façon l'audio expo-av via releaseExpoAvForWebRtcCall).
       */
      dismissIncomingUi();
      void dismissIncomingCall(c.callId);
      navigateToReceiverCallScreen({
        callId: c.callId,
        peerUserId: c.fromUserId,
        peerName: c.callerName || 'Contact',
        peerAvatar: c.callerAvatar || '',
        type: c.type,
      });
      void stopIncomingRing();
    } catch (e) {
      logAfwCall('overlay_accept_failed', { callId: c.callId, error: String(e) });
    } finally {
      acceptingRef.current = false;
    }
  }, [dismissIncomingUi, myUserId, stopIncomingRing]);

  const decline = useCallback(async () => {
    const c = incomingRef.current;
    await stopIncomingRing();
    dismissIncomingUi();
    if (c) void dismissIncomingCall(c.callId);
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
  }, [dismissIncomingUi, myUserId, stopIncomingRing]);

  const sendTextToCaller = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      const c = incomingRef.current;
      if (!trimmed || !c || !myUserId) return;
      const callerUserId = c.fromUserId;
      const callId = c.callId;
      setSendingReply(true);
      try {
        let conversationId: string | undefined;
        try {
          const r = await apiClient.get(`/messages/conversation/${encodeURIComponent(callerUserId)}`);
          const conv = r.data?.data;
          if (conv && typeof conv.id === 'string') conversationId = conv.id;
        } catch {
          /* fil créé côté serveur au send si besoin */
        }
        await apiClient.post('/messages/send', {
          recipientId: callerUserId,
          content: trimmed,
          type: 'text',
          ...(conversationId ? { conversationId } : {}),
        });
        await socketService.ensureConnectedEmit(
          'call:decline',
          buildCallDeclinePayload({
            callId,
            declinerUserId: myUserId,
            callerUserId,
            reason: 'busy',
          }),
          8_000,
        );
        dismissIncomingUi();
        showToast({ message: 'Message envoyé', type: 'success' });
      } catch (err: unknown) {
        Alert.alert('Message', getAlertMessageForCaughtError(err));
      } finally {
        setSendingReply(false);
      }
    },
    [dismissIncomingUi, myUserId, showToast],
  );

  const panAccept = Gesture.Pan()
    .activeOffsetY(-10)
    .failOffsetX([-56, 56])
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

  /**
   * Le tap d'acceptation passe par un TouchableOpacity fiable (comme « Refuser »),
   * pas par un Gesture.Tap : sur appareils lents (2-3 Go RAM, marché Mali), un tap
   * > maxDuration ou avec micro-mouvement était ignoré → « accepter ne faisait rien »
   * alors que « refuser » (TouchableOpacity) marchait toujours. Le Pan reste pour
   * le balayage vers le haut. `acceptingRef` empêche une double acceptation.
   */
  const acceptGesture = panAccept;

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
      <GestureHandlerRootView style={styles.root}>
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
                  <GestureDetector gesture={acceptGesture}>
                    <AnimatedRe.View style={[styles.circleBtn, styles.btnAccept, acceptCircleStyle]}>
                      <TouchableOpacity
                        style={styles.acceptHit}
                        onPress={() => void accept()}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel="Accepter l’appel"
                      >
                        <Ionicons name="call" size={32} color="#FFF" />
                      </TouchableOpacity>
                    </AnimatedRe.View>
                  </GestureDetector>
                  <Text style={styles.swipeHint}>Appuyer ou balayer vers le haut pour accepter</Text>
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
      </GestureHandlerRootView>
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
  acceptHit: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnMessage: {
    backgroundColor: '#2A3942',
  },
  iconHangup: {
    transform: [{ rotate: '135deg' }],
  },
});

export default IncomingCallOverlay;
