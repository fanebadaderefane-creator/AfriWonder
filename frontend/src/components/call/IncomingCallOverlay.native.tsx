import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
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
import { formatIncomingCallerSubtitle } from '../../call/incomingCallDisplay';
import { dismissIncomingCall } from '../../services/incomingCallService';
import { profileAvatarUri } from '../../utils/avatarFallback';
import apiClient from '../../api/client';
import { getAlertMessageForCaughtError } from '../../utils/userFacingError';
import { useToast } from '../common/ToastProvider';
import { ChatWallpaperPattern } from '../messages/ChatWallpaperPattern';
import { IncomingCallQuickReplyPanel } from './IncomingCallQuickReplyPanel';
import { navigateToReceiverCallScreen } from '../../call/openNativeCallScreen';
import { markAgoraDmPreviewHandoff } from '../../call/agoraDmPreviewSession';
import { useIncomingCallVideoPreview } from '../../hooks/useIncomingCallVideoPreview.native';

/**
 * Appel entrant plein écran — parité WhatsApp (audio · vidéo · réponses rapides).
 * ⛔ Ne pas émettre `call:accept` ici — uniquement dans l’écran d’appel après setup média.
 */

type IncomingCall = {
  callId: string;
  fromUserId: string;
  toUserId: string;
  type: 'audio' | 'video';
  callerName?: string;
  callerAvatar?: string;
  callerPhone?: string;
};

const SWIPE_ACCEPT_THRESHOLD_PX = 40;
const SWIPE_ACCEPT_VELOCITY = -420;
const SWIPE_MESSAGE_THRESHOLD_PX = -28;

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

  const acceptDragY = useSharedValue(0);
  const messageDragY = useSharedValue(0);
  const pulse = useRef(new Animated.Value(1)).current;
  const acceptingRef = useRef(false);
  const stopRingRef = useRef<(() => Promise<void>) | null>(null);
  const stopVibrationRef = useRef<(() => void) | null>(null);

  const isVideo = incoming?.type === 'video';
  const { PreviewView, previewOn, togglePreview, stopPreview } = useIncomingCallVideoPreview({
    callId: incoming?.callId || '',
    enabled: !!incoming && isVideo,
  });
  const previewOnRef = useRef(previewOn);
  previewOnRef.current = previewOn;

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

  const openQuickReplies = useCallback(() => {
    setShowQuickReplies(true);
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
        void stopIncomingRing();
        void stopPreview();
        void dismissIncomingCall(cur.callId);
        dismissIncomingUi();
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
  }, [dismissIncomingUi, myUserId, stopIncomingRing, stopPreview]);

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
    logAfwCall('overlay_accept_tap', { callId: c.callId, type: c.type, previewOn: previewOnRef.current });
    try {
      markAgoraDmPreviewHandoff(c.callId);
      dismissIncomingUi();
      void dismissIncomingCall(c.callId);
      navigateToReceiverCallScreen({
        callId: c.callId,
        peerUserId: c.fromUserId,
        peerName: c.callerName || 'Contact',
        peerAvatar: c.callerAvatar || '',
        type: c.type,
        initialCamOn: c.type === 'video' ? previewOnRef.current : undefined,
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
    await stopPreview();
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
  }, [dismissIncomingUi, myUserId, stopIncomingRing, stopPreview]);

  const sendTextToCaller = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      const c = incomingRef.current;
      if (!trimmed || !c || !myUserId) return;
      const callerUserId = c.fromUserId;
      const callId = c.callId;
      setSendingReply(true);
      try {
        await stopPreview();
        await stopIncomingRing();
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
        if (c.callId) void dismissIncomingCall(c.callId);
        showToast({ message: 'Message envoyé', type: 'success' });
      } catch (err: unknown) {
        Alert.alert('Message', getAlertMessageForCaughtError(err));
      } finally {
        setSendingReply(false);
      }
    },
    [dismissIncomingUi, myUserId, showToast, stopIncomingRing, stopPreview],
  );

  const panAccept = Gesture.Pan()
    .activeOffsetY(-10)
    .failOffsetX([-56, 56])
    .onUpdate((e) => {
      if (e.translationY < 0) {
        acceptDragY.value = Math.max(e.translationY, -140);
      }
    })
    .onEnd((e) => {
      const shouldAccept =
        acceptDragY.value < -SWIPE_ACCEPT_THRESHOLD_PX || e.velocityY < SWIPE_ACCEPT_VELOCITY;
      if (shouldAccept) {
        runOnJS(accept)();
      }
      acceptDragY.value = withSpring(0, { damping: 18, stiffness: 220 });
    });

  const panMessage = Gesture.Pan()
    .activeOffsetY(-8)
    .failOffsetX([-48, 48])
    .onUpdate((e) => {
      if (e.translationY < 0) {
        messageDragY.value = Math.max(e.translationY, -80);
      }
    })
    .onEnd((e) => {
      const shouldOpen =
        messageDragY.value < -SWIPE_MESSAGE_THRESHOLD_PX || e.velocityY < SWIPE_ACCEPT_VELOCITY;
      if (shouldOpen) {
        runOnJS(openQuickReplies)();
      }
      messageDragY.value = withSpring(0, { damping: 18, stiffness: 220 });
    });

  const acceptCircleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: acceptDragY.value }],
  }));

  const messageCircleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: messageDragY.value }],
  }));

  if (!featureFlags.callsOnNative || !incoming) return null;

  const avatarUri = profileAvatarUri(incoming.callerAvatar, incoming.callerName || 'Contact');
  const subtitle = formatIncomingCallerSubtitle({ callerPhone: incoming.callerPhone });

  return (
    <Modal
      transparent={false}
      visible
      animationType="fade"
      onRequestClose={decline}
      presentationStyle="fullScreen"
    >
      <GestureHandlerRootView style={styles.root}>
        {isVideo ? (
          <>
            <PreviewView style={StyleSheet.absoluteFill} />
            <View style={styles.videoDimOverlay} />
          </>
        ) : (
          <>
            <View style={styles.audioBg} />
            <ChatWallpaperPattern variant="dark" />
          </>
        )}

        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.headerBlock}>
            <Text style={styles.callerName} numberOfLines={2}>
              {incoming.callerName || 'Contact'}
            </Text>
            <View style={styles.subRow}>
              <Ionicons name="logo-whatsapp" size={16} color="rgba(255,255,255,0.72)" />
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
          </View>

          <View style={styles.centerBlock}>
            <Animated.View style={{ transform: [{ scale: pulse }] }}>
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            </Animated.View>

            {isVideo ? (
              <TouchableOpacity
                style={styles.disableVideoPill}
                onPress={togglePreview}
                activeOpacity={0.85}
                accessibilityLabel={
                  previewOn ? 'Désactiver votre vidéo' : 'Activer votre vidéo'
                }
              >
                <Ionicons
                  name={previewOn ? 'videocam-off-outline' : 'videocam-outline'}
                  size={20}
                  color="#FFF"
                />
                <Text style={styles.disableVideoText}>
                  {previewOn ? 'Désactiver votre vidéo' : 'Activer votre vidéo'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.bottomDock}>
            <View style={styles.dockCol}>
              <TouchableOpacity
                style={[styles.circleBtn, styles.btnDecline]}
                onPress={decline}
                activeOpacity={0.85}
                accessibilityLabel="Refuser l’appel"
              >
                <Ionicons name="call" size={30} color="#FFF" style={styles.iconHangup} />
              </TouchableOpacity>
              <Text style={styles.dockLabel}>Refuser</Text>
            </View>

            <View style={styles.dockCol}>
              <View style={styles.chevrons}>
                <Ionicons name="chevron-up" size={16} color="rgba(255,255,255,0.85)" />
                <Ionicons name="chevron-up" size={16} color="rgba(255,255,255,0.55)" />
                <Ionicons name="chevron-up" size={16} color="rgba(255,255,255,0.35)" />
              </View>
              <GestureDetector gesture={panAccept}>
                <AnimatedRe.View style={[styles.circleBtn, styles.btnAccept, acceptCircleStyle]}>
                  <TouchableOpacity
                    style={styles.circleHit}
                    onPress={() => void accept()}
                    activeOpacity={0.85}
                    accessibilityLabel="Accepter l’appel"
                  >
                    <Ionicons
                      name={isVideo ? 'videocam' : 'call'}
                      size={isVideo ? 30 : 32}
                      color="#FFF"
                    />
                  </TouchableOpacity>
                </AnimatedRe.View>
              </GestureDetector>
              <Text style={styles.swipeHint}>Balayer vers le haut pour accepter</Text>
            </View>

            <View style={styles.dockCol}>
              <GestureDetector gesture={panMessage}>
                <AnimatedRe.View style={[styles.circleBtn, styles.btnMessage, messageCircleStyle]}>
                  <TouchableOpacity
                    style={styles.circleHit}
                    onPress={openQuickReplies}
                    activeOpacity={0.85}
                    accessibilityLabel="Répondre par un message"
                  >
                    <Ionicons name="chatbubble-ellipses" size={26} color="#FFF" />
                  </TouchableOpacity>
                </AnimatedRe.View>
              </GestureDetector>
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
  audioBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0B141A',
  },
  videoDimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.12)',
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
    color: 'rgba(255,255,255,0.72)',
  },
  centerBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 28,
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#2A3942',
  },
  disableVideoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  disableVideoText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
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
  chevrons: {
    alignItems: 'center',
    marginBottom: -4,
    gap: -8,
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
    maxWidth: 130,
  },
  circleBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  circleHit: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDecline: {
    backgroundColor: '#E53935',
  },
  btnAccept: {
    backgroundColor: '#25D366',
    marginTop: 4,
  },
  btnMessage: {
    backgroundColor: '#2A3942',
  },
  iconHangup: {
    transform: [{ rotate: '135deg' }],
  },
});

export default IncomingCallOverlay;
