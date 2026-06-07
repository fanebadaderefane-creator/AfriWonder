import React, { useCallback, useEffect, useMemo, useRef, useState, createElement, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { Colors } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { safeRouterBack } from '../../src/utils/safeRouter';
import socketService from '../../src/services/socketService';
import { useAuthStore } from '../../src/store/authStore';
import apiClient from '../../src/api/client';
import { profileAvatarUri } from '../../src/utils/avatarFallback';
import { startOutgoingRingbackPattern, stopAllCallRings } from '../../src/call/callRingtone';
import { tryLoadReactNativeWebRtc } from '../../src/call/tryLoadReactNativeWebRtc';
import { consumeWebCallMediaCapture } from '../../src/call/webCallMediaSession';
import {
  buildCameraVideoConstraints,
  executeCameraFlip,
  nativeLocalVideoMirror,
  pickNextCameraSelection,
  readVideoDeviceIdFromStream,
  switchNativeVideoCameraFacing,
  type FacingMode,
} from '../../src/call/callCameraSwitch';
import {
  acquireCallLocalMedia,
  beginWebCallMediaCapture,
  applyCallAudioProcessingToTrack,
  applyNativeCallSpeakerRoute,
  buildCallVideoConstraints,
  callMediaErrorMessage,
  enableRemoteAudioTracks,
  probeWebCallAudioInputs,
  releaseExpoAvForWebRtcCall,
  requestNativeCallPermissions,
  resolveWebRtcMediaDevices,
  startNativeCallAudioSession,
  stopNativeCallAudioSession,
  stopNativeOutgoingRingback,
  streamHasActiveMediaTracks,
  streamHasPlayableMediaTracks,
  webCallAudioProbeHint,
  type WebCallAudioProbe,
} from '../../src/call/callNativeMedia';
import { connectionQualityFromRtcStatsReport } from '../../src/call/webrtcConnectionQuality';
import {
  buildCallIceConfig,
  callConnectionWatchdogMs,
  callMediaReadyHintMs,
  prepareIceServersForPlatform,
  pickVideoProfileForNetwork,
  pickVoiceOpusBitrateForNetwork,
  resolveIceNetworkSnapshot,
  shouldBlockCellularWithoutTurn,
  shouldBlockNativeCellularWithoutTlsTurn,
  type NetworkSnapshot,
  type VideoQualityProfile as NetVideoQualityProfile,
} from '../../src/call/callNetworkConfig';
import { parseTurnCredentialsResponse } from '../../src/call/parseTurnCredentialsResponse';
import { formatCallStatusLine } from '../../src/call/callStatusLine';
import {
  shouldArmMediaConnectionWatchdog,
  shouldClearCallerRingTimeoutOnAccept,
  shouldFinishCallAsMissed,
  shouldDowngradeVideoInviteToAudioAnswer,
  shouldResendCallerOffer,
  shouldSendCallerOfferAfterInvite,
} from '../../src/call/callAcceptLifecycle';
import {
  buildCallAcceptPayload,
  callIdsEqual,
  callSdpNegotiationOptions,
  callUserIdsEqual,
  countSdpMediaSections,
  normalizeInboundCallSignal,
  pickOutboundCallSdp,
  type CallSignalSdpPayload,
} from '../../src/call/callSignalingPayload';
import {
  optimizeCallAudioPipeline,
  pruneRedundantCallTransceivers,
  setTunedLocalDescription,
  withTunedVoiceSdp,
} from '../../src/call/callAudioQuality';
import { logCallPhase, sdpContainsMedia } from '../../src/call/callDebug';
import { logCallExit } from '../../src/call/callCallExit';
import {
  bindWebRtcMediaElement,
  clearWebRtcMediaElement,
  startRemoteWebAudioPlayback,
} from '../../src/call/callWebAudioPlayback';
import {
  canPromoteCallToConnected,
  collectTrackIds,
  countLocalTracks,
  dedupeRemoteReceiverTracks,
  isIceConnectionReady,
  isIceStillNegotiating,
  mediaStreamBindingKey,
  isTrackFromLocalCapture,
  mergeRemoteTrackIntoStream,
  type RemoteStreamUnified,
  remoteStreamReadyForConnectedUi,
  shouldMarkCallConnected,
  streamHasLiveAudio,
  streamHasLiveVideo,
} from '../../src/call/callRemoteMedia';
import {
  prepareCallSessionMemory,
  releaseCallSessionMemory,
} from '../../src/call/callSessionStability';
import {
  nativeRtcTeardownDelayMs,
  shouldBlockNativeRtcUrlUpdate,
} from '../../src/call/callNativeTeardown';
import { captureSentryException } from '../../src/lib/sentryMobile';
import { devWarn } from '../../src/utils/devLog';
import { CallDuringMessageModal, CallMoreOptionsSheet } from '../../src/components/call/CallMoreMenu';
import { startActiveCallForeground, stopActiveCallForeground } from '../../src/services/incomingCallService';
import { SafeNativeRtcView } from '../../src/components/call/SafeNativeRtcView';
import { CallScreenErrorBoundary } from '../../src/components/call/CallScreenErrorBoundary';
import { isValidNativeRtcStreamUrl } from '../../src/call/callRtcStreamUrl';
import NetInfo from '@react-native-community/netinfo';

/**
 * Profil de qualité vidéo selon la bande passante détectée (2G/3G/4G/Wi‑Fi).
 * Logique pure + testée dans `callNetworkConfig.ts`.
 */
async function detectVideoProfile(): Promise<NetVideoQualityProfile> {
  try {
    const st = await NetInfo.fetch();
    const details = (st.details || {}) as { cellularGeneration?: string | null };
    return pickVideoProfileForNetwork({
      type: st.type,
      cellularGeneration: details.cellularGeneration,
    });
  } catch {
    return pickVideoProfileForNetwork(null);
  }
}

const { width, height: screenH } = Dimensions.get('window');

const ALLOWED_CALL_REACTIONS = new Set(['👍', '❤️', '😂', '😮', '😢', '🙏']);

/** Icônes « doodle » façon fond WhatsApp — faible opacité, lecture seule. */
const WALLPAPER_ICON_NAMES = [
  'cafe-outline',
  'camera-outline',
  'musical-notes-outline',
  'heart-outline',
  'flash-outline',
  'moon-outline',
  'leaf-outline',
  'planet-outline',
  'fish-outline',
  'pizza-outline',
  'football-outline',
  'game-controller-outline',
  'headset-outline',
  'mic-outline',
  'videocam-outline',
  'call-outline',
  'chatbubble-outline',
  'happy-outline',
  'star-outline',
  'cloud-outline',
] as const;

const CallWallpaperPattern = memo(function CallWallpaperPattern() {
  const tiles = useMemo(() => {
    const rows = 14;
    const cols = 8;
    const out: { key: string; name: (typeof WALLPAPER_ICON_NAMES)[number]; left: number; top: number; rotate: string }[] =
      [];
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const name = WALLPAPER_ICON_NAMES[i % WALLPAPER_ICON_NAMES.length];
        i++;
        out.push({
          key: `${r}-${c}`,
          name,
          left: (c / cols) * width + (r % 2 === 0 ? 0 : 12),
          top: (r / rows) * screenH * 0.92,
          rotate: `${((r + c) % 5) * 17 - 34}deg`,
        });
      }
    }
    return out;
  }, []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {tiles.map((t) => (
        <View
          key={t.key}
          style={{
            position: 'absolute',
            width: 28,
            height: 28,
            left: t.left,
            top: t.top,
            transform: [{ rotate: t.rotate }],
          }}
        >
          <Ionicons name={t.name} size={22} color="rgba(255,255,255,0.07)" />
        </View>
      ))}
    </View>
  );
});

/**
 * Appel audio/vidéo 1-1 — web (navigateur) ou Android/iOS (`react-native-webrtc` dans l’app installée).
 *
 *  Paramètres `useLocalSearchParams` :
 *  - `name`         : nom à afficher
 *  - `avatar`       : URL avatar
 *  - `type`         : `audio` (défaut) ou `video`
 *  - `otherUserId`  : id de l'autre participant (requis pour la signalisation)
 *  - `role`         : `caller` (défaut) ou `receiver`
 *  - `callId`       : id existant si on rejoint une invitation
 */

type RTCSessionDescriptionInitLite = { type: 'offer' | 'answer' | 'rollback' | 'pranswer'; sdp?: string };
type SignalPayload =
  | { kind: 'sdp'; sdp: RTCSessionDescriptionInitLite }
  | { kind: 'ice'; candidate: RTCIceCandidateInit | null };

const CALL_RING_MS = 30_000;
const isWebRuntime = Platform.OS === 'web';

/** Calques semi-transparents sur le PiP local (aperçu selfie) — même logique Web / natif. */
const PIP_EFFECT_LAYER: Record<'warm' | 'cool' | 'soft', string> = {
  warm: 'rgba(255, 165, 95, 0.24)',
  cool: 'rgba(100, 165, 255, 0.22)',
  soft: 'rgba(255, 255, 255, 0.18)',
};
const nativeWebRTC: any = tryLoadReactNativeWebRtc();
const RTCPeerConnectionImpl: any = isWebRuntime ? RTCPeerConnection : nativeWebRTC?.RTCPeerConnection;
const RTCIceCandidateImpl: any = isWebRuntime ? RTCIceCandidate : nativeWebRTC?.RTCIceCandidate;
const RTCSessionDescriptionImpl: any = isWebRuntime ? RTCSessionDescription : nativeWebRTC?.RTCSessionDescription;
function newCallId(): string {
  return `call-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Natif : `toURL()` peut être vide au premier frame — retenter avant d’afficher l’avatar. */
function bindNativeStreamUrlWithRetry(
  stream: MediaStream | null | undefined,
  setUrl: (url: string) => void,
  bumpKey: () => void,
  attemptsLeft = 10,
  shouldApply?: () => boolean,
): void {
  if (!stream || (shouldApply && !shouldApply())) return;
  const url = (stream as { toURL?: () => string })?.toURL?.();
  if (url) {
    if (shouldApply && !shouldApply()) return;
    setUrl(url);
    bumpKey();
    return;
  }
  if (attemptsLeft <= 0) return;
  setTimeout(
    () => bindNativeStreamUrlWithRetry(stream, setUrl, bumpKey, attemptsLeft - 1, shouldApply),
    200,
  );
}

async function attachLocalTracksToPeerConnection(
  pc: RTCPeerConnection,
  local: MediaStream,
  senders: { audio?: RTCRtpSender | null; video?: RTCRtpSender | null },
): Promise<void> {
  for (const track of local.getTracks()) {
    const sender = track.kind === 'video' ? senders.video : senders.audio;
    if (sender) {
      try {
        await sender.replaceTrack(track);
      } catch {
        /** Firefox web : replaceTrack après addTransceiver → « object can not be found here ». */
        pc.addTrack(track, local);
      }
    } else {
      pc.addTrack(track, local);
    }
  }
}

function CallScreenInner() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  // Rétro-compatibilité : accepte aussi peerId/peerName/peerAvatar/callType (inbox call history → call screen).
  const name = String(params.peerName || params.name || 'Contact');
  const avatar = String(params.peerAvatar || params.avatar || '');
  const startedAsVideo = String(params.callType || params.type) === 'video';
  const [isVideoCall, setIsVideoCall] = useState(startedAsVideo);
  const isVideoCallRef = useRef(startedAsVideo);
  const [videoUpgradeLoading, setVideoUpgradeLoading] = useState(false);
  const otherUserId = String(params.peerId || params.otherUserId || '').trim();
  const peerAvatarUri = useMemo(
    () => profileAvatarUri(avatar, name.trim() || 'Contact'),
    [avatar, name],
  );
  const role = (String(params.role || 'caller') === 'receiver' ? 'receiver' : 'caller') as 'caller' | 'receiver';
  const initialCallId = String(params.callId || '').trim();

  const { user } = useAuthStore();
  const myAvatarUri = useMemo(
    () => profileAvatarUri(user?.profile_image || user?.avatar || '', user?.full_name || user?.username || 'Moi'),
    [user?.profile_image, user?.avatar, user?.full_name, user?.username],
  );
  const myUserId = String(user?.id || '');
  const callIdRef = useRef<string>(initialCallId || newCallId());

  useEffect(() => {
    if (initialCallId) {
      callIdRef.current = initialCallId;
    }
  }, [initialCallId]);

  const [callState, setCallState] = useState<'ringing' | 'connecting' | 'connected' | 'ended'>(
    role === 'caller' ? 'ringing' : 'connecting',
  );
  const [peerOnline, setPeerOnline] = useState<boolean | null>(null);
  /** Dès que le correspondant a décroché — le chronomètre démarre seulement à `connected` (média WebRTC). */
  const [peerAnswered, setPeerAnswered] = useState(false);
  const peerAnsweredRef = useRef(false);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const speakerOnRef = useRef(true);
  const webrtcMediaActiveRef = useRef(false);
  /** Incrémenté à chaque bootstrap / cleanup — ignore les `start()` obsolètes (Strict Mode / remontage). */
  const callSetupGenRef = useRef(0);
  const stopOutgoingRingRef = useRef<(() => Promise<void>) | null>(null);
  const [cameraOff, setCameraOff] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  /** Web : getUserMedia exige un clic utilisateur — pas d’auto-capture après les await réseau. */
  const [webMediaConsentNeeded, setWebMediaConsentNeeded] = useState(false);
  const [webMediaConsentError, setWebMediaConsentError] = useState<string | null>(null);
  const [webMediaConsentLoading, setWebMediaConsentLoading] = useState(false);
  const [webAudioProbe, setWebAudioProbe] = useState<WebCallAudioProbe | null>(null);
  const webMediaConsentRef = useRef<{
    resolve: (() => void) | null;
    reject: ((reason?: unknown) => void) | null;
  }>({ resolve: null, reject: null });
  const webPreAcquiredMediaRef = useRef<MediaStream | null>(null);
  const webListenOnlyRef = useRef(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string }[]>([]);
  const [peerRaisedHand, setPeerRaisedHand] = useState(false);
  const [myRaisedHand, setMyRaisedHand] = useState(false);
  const [peerScreenSharing, setPeerScreenSharing] = useState(false);
  const [localScreenSharing, setLocalScreenSharing] = useState(false);
  const [screenShareLoading, setScreenShareLoading] = useState(false);
  const [connectionDisplay, setConnectionDisplay] = useState<{
    labelFr: string;
    bars: 1 | 2 | 3;
    quality: 'good' | 'fair' | 'poor';
  }>({ labelFr: 'Connexion…', bars: 2, quality: 'fair' });
  const [pipEffect, setPipEffect] = useState<'none' | 'warm' | 'cool' | 'soft'>('none');
  const [effectsModalOpen, setEffectsModalOpen] = useState(false);
  /** `remote` = correspondant plein écran ; `local` = selfie plein écran (PiP = l’autre flux). */
  const [videoLayoutFocus, setVideoLayoutFocus] = useState<'remote' | 'local'>('remote');

  const screenShareDisplayStreamRef = useRef<MediaStream | null>(null);
  const facingModeRef = useRef<FacingMode>('user');
  const activeVideoDeviceIdRef = useRef<string | null>(null);
  const [localFacing, setLocalFacing] = useState<FacingMode>('user');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectionWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaReadyHintRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectionWatchdogMsRef = useRef(60_000);
  const mediaReadyHintMsRef = useRef(20_000);
  const voiceBitrateRef = useRef(32_000);

  /** Refs PeerConnection + flux média (web et natif lorsque l’appel démarre). */
  const pcRef = useRef<any>(null);
  const localStreamRef = useRef<any>(null);
  const remoteStreamRef = useRef<any>(null);
  const localVideoElRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoElRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioElRef = useRef<HTMLAudioElement | null>(null);
  /** Flux `ontrack` natif navigateur — lecture plus fiable que MediaStream synthétique. */
  const remotePlaybackStreamRef = useRef<MediaStream | null>(null);
  const remoteWebAudioPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remoteWebAudioPlaybackKeyRef = useRef('');
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const callStateRef = useRef(callState);
  const finishingRef = useRef(false);
  const [remoteStreamUrl, setRemoteStreamUrl] = useState<string>('');
  /** Démonte RTCView avant fermeture PC — évite crash process Android/iOS. */
  const [nativeRtcUnmounting, setNativeRtcUnmounting] = useState(false);
  const [localStreamUrl, setLocalStreamUrl] = useState<string>('');
  const [localStreamKey, setLocalStreamKey] = useState(0);
  const [remoteStreamKey, setRemoteStreamKey] = useState(0);
  const pcTearingDownRef = useRef(false);
  const mediaStoppedRef = useRef(false);
  const mediaTeardownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Évite une double offre SDP si `call:accept` est reçu deux fois. */
  const callerOfferSentRef = useRef(false);
  const callerOfferResendCountRef = useRef(0);
  /** IDs des pistes locales — exclues du flux distant (bug Android sendrecv). */
  const localTrackIdsRef = useRef<Set<string>>(new Set());
  const localSendersRef = useRef<{ audio?: RTCRtpSender | null; video?: RTCRtpSender | null }>({});
  const upgradeToVideoRef = useRef<(() => Promise<void>) | null>(null);
  const triggerIceRestartRef = useRef<(() => Promise<void>) | null>(null);

  const cancelWebMediaConsent = useCallback(() => {
    setWebMediaConsentNeeded(false);
    setWebMediaConsentError(null);
    setWebMediaConsentLoading(false);
    setWebAudioProbe(null);
    webListenOnlyRef.current = false;
    webPreAcquiredMediaRef.current?.getTracks().forEach((t) => t.stop());
    webPreAcquiredMediaRef.current = null;
    webMediaConsentRef.current.reject?.(new Error('WEB_MEDIA_CONSENT_CANCELLED'));
    webMediaConsentRef.current.resolve = null;
    webMediaConsentRef.current.reject = null;
  }, []);

  const grantWebListenOnlyConsent = useCallback(() => {
    if (webMediaConsentLoading) return;
    webListenOnlyRef.current = true;
    webPreAcquiredMediaRef.current = new MediaStream();
    setWebMediaConsentError(null);
    setWebMediaConsentLoading(false);
    setWebMediaConsentNeeded(false);
    webMediaConsentRef.current.resolve?.();
    webMediaConsentRef.current.resolve = null;
    webMediaConsentRef.current.reject = null;
  }, [webMediaConsentLoading]);

  const grantWebMediaConsent = useCallback(() => {
    if (webMediaConsentLoading) return;
    const mediaDevices =
      typeof navigator !== 'undefined' ? navigator.mediaDevices : resolveWebRtcMediaDevices();
    if (!mediaDevices?.getUserMedia) {
      setWebMediaConsentError('WebRTC indisponible dans ce navigateur.');
      return;
    }
    setWebMediaConsentError(null);
    setWebMediaConsentLoading(true);
    /** Invoquer getUserMedia dans le même tour synchrone que le clic — sinon NotFoundError Firefox. */
    beginWebCallMediaCapture({
      mediaDevices,
      wantVideo: startedAsVideo,
    })
      .then((stream) => {
        webPreAcquiredMediaRef.current = stream;
        setWebMediaConsentLoading(false);
        setWebMediaConsentNeeded(false);
        webMediaConsentRef.current.resolve?.();
        webMediaConsentRef.current.resolve = null;
        webMediaConsentRef.current.reject = null;
      })
      .catch((error) => {
        webPreAcquiredMediaRef.current = null;
        setWebMediaConsentLoading(false);
        setWebMediaConsentError(callMediaErrorMessage(error, startedAsVideo));
        devWarn('[Call] web media consent failed', error);
        void probeWebCallAudioInputs().then(setWebAudioProbe);
      });
  }, [startedAsVideo, webMediaConsentLoading]);

  const waitForWebMediaConsent = useCallback((): Promise<void> => {
    if (!isWebRuntime) return Promise.resolve();
    setWebMediaConsentNeeded(true);
    setWebAudioProbe(null);
    void probeWebCallAudioInputs().then(setWebAudioProbe);
    return new Promise((resolve, reject) => {
      webMediaConsentRef.current = {
        resolve: () => resolve(),
        reject,
      };
    });
  }, []);

  useEffect(() => {
    isVideoCallRef.current = isVideoCall;
  }, [isVideoCall]);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);
  useEffect(() => {
    peerAnsweredRef.current = peerAnswered;
  }, [peerAnswered]);

  useFocusEffect(
    useCallback(() => {
      prepareCallSessionMemory();
      return () => {
        releaseCallSessionMemory();
      };
    }, []),
  );

  const stopAllMedia = useCallback(() => {
    if (mediaStoppedRef.current) return;
    mediaStoppedRef.current = true;
    if (mediaTeardownTimerRef.current) {
      clearTimeout(mediaTeardownTimerRef.current);
      mediaTeardownTimerRef.current = null;
    }
    try {
      screenShareDisplayStreamRef.current?.getTracks?.().forEach((t) => {
        try {
          t.stop?.();
        } catch {
          /* ignore */
        }
      });
      screenShareDisplayStreamRef.current = null;
    } catch {
      /* ignore */
    }
    try {
      const local = localStreamRef.current as MediaStream | { getTracks?: () => { stop?: () => void }[] } | null;
      local?.getTracks?.().forEach((t) => {
        try {
          t.stop?.();
        } catch {
          /* ignore */
        }
      });
    } catch {
      /* ignore */
    }
    localStreamRef.current = null;
    localTrackIdsRef.current = new Set();
    remoteStreamRef.current = null;
    try {
      pcRef.current?.close?.();
    } catch {
      /* ignore */
    }
    pcRef.current = null;
    pcTearingDownRef.current = true;
    webrtcMediaActiveRef.current = false;
    void stopNativeCallAudioSession();
    void stopActiveCallForeground();
    void stopOutgoingRingRef.current?.();
    stopOutgoingRingRef.current = null;
    if (remoteWebAudioPollRef.current) {
      clearInterval(remoteWebAudioPollRef.current);
      remoteWebAudioPollRef.current = null;
    }
    remotePlaybackStreamRef.current = null;
    remoteWebAudioPlaybackKeyRef.current = '';
    if (isWebRuntime) {
      clearWebRtcMediaElement(localVideoElRef.current);
      clearWebRtcMediaElement(remoteVideoElRef.current);
      clearWebRtcMediaElement(remoteAudioElRef.current);
    } else {
      setLocalStreamUrl('');
      setRemoteStreamUrl('');
    }
    releaseCallSessionMemory();
  }, []);

  const scheduleStopAllMedia = useCallback(() => {
    if (mediaStoppedRef.current) return;
    if (mediaTeardownTimerRef.current) return;
    const delay = nativeRtcTeardownDelayMs(Platform.OS);
    const run = () => {
      mediaTeardownTimerRef.current = null;
      stopAllMedia();
    };
    if (delay <= 0) {
      run();
      return;
    }
    mediaTeardownTimerRef.current = setTimeout(run, delay);
  }, [stopAllMedia]);

  const finishCall = useCallback(
    (reason: 'ended' | 'failed' | 'declined' | 'cancelled' | 'missed' = 'ended') => {
      if (finishingRef.current || callStateRef.current === 'ended') return;
      logCallExit(reason, {
        callId: callIdRef.current,
        role,
        callState: callStateRef.current,
        peerAccepted: peerAnsweredRef.current,
        ice: String((pcRef.current as RTCPeerConnection | null)?.iceConnectionState || ''),
        pcState: String((pcRef.current as RTCPeerConnection | null)?.connectionState || ''),
        hasRemoteSdp: Boolean((pcRef.current as RTCPeerConnection | null)?.remoteDescription),
      });
      finishingRef.current = true;
      const stateBeforeEnd = callStateRef.current;
      setPeerRaisedHand(false);
      setMyRaisedHand(false);
      setPeerScreenSharing(false);
      setLocalScreenSharing(false);
      pcTearingDownRef.current = true;
      setNativeRtcUnmounting(true);
      setCallState('ended');
      if (!isWebRuntime) {
        setLocalStreamUrl('');
        setRemoteStreamUrl('');
        setRemoteStreamKey((k) => k + 1);
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      if (connectionWatchdogRef.current) clearTimeout(connectionWatchdogRef.current);
      connectionWatchdogRef.current = null;
      scheduleStopAllMedia();
      const elapsed = startedAtRef.current ? Math.floor((Date.now() - startedAtRef.current) / 1000) : 0;
      if (otherUserId && myUserId && reason !== 'declined') {
        let socketReason: 'completed' | 'cancelled' | 'missed' | 'failed' = 'completed';
        if (reason === 'cancelled') socketReason = 'cancelled';
        else if (reason === 'missed') socketReason = 'missed';
        else if (reason === 'failed') socketReason = 'failed';
        else if (stateBeforeEnd !== 'connected' && role === 'caller') socketReason = 'cancelled';
        void socketService.ensureConnectedEmit('call:end', {
          callId: callIdRef.current,
          fromUserId: myUserId,
          toUserId: otherUserId,
          endedBy: myUserId,
          reason: socketReason,
          durationSec: socketReason === 'completed' ? elapsed : 0,
        });
      }
      const sessionStatus =
        reason === 'failed'
          ? 'failed'
          : reason === 'declined'
            ? 'declined'
            : reason === 'cancelled'
              ? 'cancelled'
              : reason === 'missed'
                ? 'missed'
                : 'completed';
      apiClient
        .post(`/calls/${encodeURIComponent(callIdRef.current)}/session-state`, {
          status: sessionStatus,
          duration: elapsed,
          callMediaType: isVideoCallRef.current ? 'video' : 'audio',
          callerName: user?.full_name || user?.username || '',
        })
        .catch(() => {
          /* best effort */
        });
      setTimeout(() => {
        try {
          safeRouterBack('/messages');
        } catch {
          /* ignore */
        }
      }, 600);
    },
    [otherUserId, myUserId, scheduleStopAllMedia, role, user?.full_name, user?.username],
  );

  /** Animation de pulse pendant le ringing. */
  useEffect(() => {
    if (callState !== 'ringing') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [callState, pulseAnim]);

  /** Timer : uniquement après connexion média WebRTC (`connected`), pas au simple accept socket. */
  useEffect(() => {
    if (callState !== 'connected') return;
    startedAtRef.current = startedAtRef.current ?? Date.now();
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  /** Présence du correspondant (en ligne → « Appel en cours… », sinon « Appel »). */
  useEffect(() => {
    if (!otherUserId) return undefined;
    let cancelled = false;
    void apiClient
      .get(`/messages/presence/${encodeURIComponent(otherUserId)}`)
      .then((res) => {
        if (cancelled) return;
        setPeerOnline(Boolean(res.data?.data?.is_online));
      })
      .catch(() => {
        if (!cancelled) setPeerOnline(null);
      });
    const offPresence = socketService.on(
      'presence:update',
      (data: { userId?: string; isOnline?: boolean }) => {
        if (data?.userId === otherUserId) setPeerOnline(Boolean(data.isOnline));
      },
    );
    return () => {
      cancelled = true;
      offPresence();
    };
  }, [otherUserId]);

  /**
   * Bootstrap PeerConnection : web (navigateur) ou natif (`react-native-webrtc` présent dans la build).
   */
  useEffect(() => {
    const mediaDevicesImpl = resolveWebRtcMediaDevices();
    const canRunCalls =
      isWebRuntime ||
      Boolean(nativeWebRTC && RTCPeerConnectionImpl && mediaDevicesImpl?.getUserMedia);
    if (!canRunCalls) {
      if (!isWebRuntime) {
        setErrorMsg(
          'Les appels audio/vidéo nécessitent l’application installée (build EAS). Expo Go ne prend pas en charge WebRTC.',
        );
        setCallState('ended');
      }
      return;
    }

    if (!otherUserId) {
      setErrorMsg('Identifiant du correspondant manquant.');
      return;
    }
    if (!myUserId) {
      setErrorMsg('Vous devez être connecté pour lancer un appel.');
      return;
    }
    if (role === 'receiver' && !initialCallId) {
      setErrorMsg('Chargement de l’appel entrant…');
      return;
    }

    let cancelled = false;
    const setupGen = ++callSetupGenRef.current;
    const setupStale = () => cancelled || setupGen !== callSetupGenRef.current;

    const callId = callIdRef.current;
    logCallPhase(callId, 'bootstrap', { role, isVideo: startedAsVideo, otherUserId, platform: Platform.OS });

    prepareCallSessionMemory();
    socketService.joinUserRoom(myUserId);

    const peerPcState = (): string =>
      String((pcRef.current as RTCPeerConnection | null)?.connectionState || '');

    const peerIceState = (): string =>
      String((pcRef.current as RTCPeerConnection | null)?.iceConnectionState || '');

    const applyRemoteTrack = (track: MediaStreamTrack | undefined, trackKind?: string) => {
      if (!track || track.readyState === 'ended') return;
      if (isTrackFromLocalCapture(track, localTrackIdsRef.current)) return;

      const unified = remoteStreamRef.current as MediaStream;
      mergeRemoteTrackIntoStream(unified as unknown as RemoteStreamUnified, track);
      remoteStreamRef.current = unified;

      const publishRemotePlayback = () => {
        setupRemoteEl(unified, trackKind ?? track.kind);
        if (!isWebRuntime && track.kind === 'audio') {
          void applyNativeCallSpeakerRoute(speakerOnRef.current);
        }
        maybeMarkCallConnected(unified, trackKind ?? track.kind);
      };

      if (track.readyState === 'live') {
        publishRemotePlayback();
        return;
      }
      track.onunmute = () => {
        if (track.readyState === 'ended') return;
        publishRemotePlayback();
      };
    };

    const armRemoteWebAudioPlayback = () => {
      if (!isWebRuntime || isVideoCallRef.current) return;
      const el = remoteAudioElRef.current;
      const playback = remotePlaybackStreamRef.current ?? (remoteStreamRef.current as MediaStream);
      if (!el || !playback) return;

      const key = mediaStreamBindingKey(playback);
      if (
        streamHasLiveAudio(playback) &&
        el.srcObject === playback &&
        !el.paused &&
        remoteWebAudioPlaybackKeyRef.current === key
      ) {
        return;
      }

      remoteWebAudioPlaybackKeyRef.current = key;
      remoteWebAudioPollRef.current = startRemoteWebAudioPlayback(el, playback, remoteWebAudioPollRef.current);
    };

    const shouldApplyNativeRtcUrl = () =>
      !shouldBlockNativeRtcUrlUpdate({
        tearingDown: pcTearingDownRef.current,
        callEnded: callStateRef.current === 'ended',
      });

    const setupRemoteEl = (stream: MediaStream, trackKind?: string) => {
      if (!shouldApplyNativeRtcUrl()) return;
      enableRemoteAudioTracks(stream);
      if (remotePlaybackStreamRef.current) {
        enableRemoteAudioTracks(remotePlaybackStreamRef.current);
      }
      if (isWebRuntime && isVideoCallRef.current) {
        bindWebRtcMediaElement(remoteVideoElRef.current, stream, {
          force: true,
          allowPendingTracks: true,
        });
      }
      /** Appel vidéo : l’audio sort du `<video>` distant — ne pas dupliquer sur `<audio>` (double lecture). */
      if (isWebRuntime && !isVideoCallRef.current) {
        armRemoteWebAudioPlayback();
      }
      if (!isWebRuntime) {
        if (!remoteStreamReadyForConnectedUi({ stream, isVideo: isVideoCallRef.current })) {
          return;
        }
        const localUrl = (localStreamRef.current as { toURL?: () => string } | null)?.toURL?.() || '';
        const url = (stream as { toURL?: () => string })?.toURL?.();
        if (isValidNativeRtcStreamUrl(url, { localUrl })) {
          setRemoteStreamUrl(url!);
          setRemoteStreamKey((k) => k + 1);
        } else if (!url) {
          bindNativeStreamUrlWithRetry(
            stream,
            (nextUrl) => {
              if (!shouldApplyNativeRtcUrl()) return;
              if (isValidNativeRtcStreamUrl(nextUrl, { localUrl })) setRemoteStreamUrl(nextUrl);
            },
            () => {
              if (!shouldApplyNativeRtcUrl()) return;
              setRemoteStreamKey((k) => k + 1);
            },
            10,
            shouldApplyNativeRtcUrl,
          );
        }
      }
      logCallPhase(callId, 'remote_stream_updated', {
        trackKind,
        audioTracks: stream.getAudioTracks?.().length ?? 0,
        videoTracks: stream.getVideoTracks?.().length ?? 0,
      });
    };

    const markCallConnected = () => {
      try {
        if (callStateRef.current === 'connected') return;
        const remote = remoteStreamRef.current as MediaStream;
        const pc = pcRef.current as RTCPeerConnection | null;
        if (
          !remoteStreamReadyForConnectedUi({
            stream: remote,
            isVideo: isVideoCallRef.current,
            iceConnectionState: peerIceState(),
            hasRemoteDescription: Boolean(pc?.remoteDescription),
            peerConnectionState: peerPcState(),
          })
        ) {
          return;
        }
        logCallPhase(callId, 'media_connected', {
          remoteAudio: streamHasLiveAudio(remote),
          remoteVideo: streamHasLiveVideo(remote),
        });
        setErrorMsg(null);
        setCallState('connected');
        if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
        if (connectionWatchdogRef.current) clearTimeout(connectionWatchdogRef.current);
        connectionWatchdogRef.current = null;
        if (mediaReadyHintRef.current) clearTimeout(mediaReadyHintRef.current);
        if (isWebRuntime && remoteAudioElRef.current && !isVideoCallRef.current) {
          try {
            remoteAudioElRef.current.muted = false;
          } catch {
            /* ignore */
          }
          armRemoteWebAudioPlayback();
        }
        void optimizeCallAudioPipeline(
          pcRef.current as RTCPeerConnection | null,
          voiceBitrateRef.current,
        );
        if (isWebRuntime && isVideoCallRef.current && remoteVideoElRef.current) {
          try {
            remoteVideoElRef.current.muted = false;
          } catch {
            /* ignore */
          }
        }
        if (!isWebRuntime) {
          void applyNativeCallSpeakerRoute(speakerOnRef.current);
          void startActiveCallForeground(name || 'Contact', isVideoCallRef.current);
        }
        void apiClient
          .post(`/calls/${encodeURIComponent(callIdRef.current)}/session-state`, { status: 'active' })
          .catch(() => {});
      } catch (e) {
        devWarn('[Call] markCallConnected failed', e);
        setErrorMsg('Connexion interrompue. Réessayez l’appel.');
        finishCall('failed');
      }
    };

    const maybeMarkCallConnected = (
      stream: MediaStream | null | undefined,
      trackKind?: string,
    ) => {
      if (!stream) return;
      if (role === 'caller' && !peerAnsweredRef.current) return;
      const pc = pcRef.current as RTCPeerConnection | null;
      if (!pc?.remoteDescription) return;
      if (
        !shouldMarkCallConnected({
          trackKind,
          stream,
          isVideo: isVideoCallRef.current,
          peerConnectionState: peerPcState(),
          iceConnectionState: peerIceState(),
          role,
          peerAccepted: peerAnsweredRef.current,
          hasRemoteDescription: true,
        })
      ) {
        return;
      }
      markCallConnected();
    };

    const syncRemoteTracksFromPeerConnection = (pc: RTCPeerConnection | null) => {
      if (!pc) return;
      try {
        if (isWebRuntime) {
          const tracks = dedupeRemoteReceiverTracks(
            (pc.getReceivers?.() ?? [])
              .map((receiver) => receiver.track)
              .filter(
                (track): track is MediaStreamTrack =>
                  Boolean(
                    track &&
                      track.readyState !== 'ended' &&
                      !isTrackFromLocalCapture(track, localTrackIdsRef.current),
                  ),
              ),
          );
          if (!tracks.length) return;

          const current = remoteStreamRef.current as MediaStream | null;
          const currentKey = (current?.getTracks?.() ?? [])
            .map((t) => t.id)
            .sort()
            .join('|');
          const nextKey = tracks
            .map((t) => t.id)
            .sort()
            .join('|');
          if (currentKey === nextKey && current && streamHasPlayableMediaTracks(current)) {
            return;
          }

          const next = new MediaStream();
          for (const track of tracks) {
            next.addTrack(track);
            track.onunmute = () => {
              setupRemoteEl(next, track.kind);
              maybeMarkCallConnected(next, track.kind);
            };
          }
          remoteStreamRef.current = next;
          remotePlaybackStreamRef.current = next;
          setupRemoteEl(next, tracks[0]?.kind);
          maybeMarkCallConnected(next, tracks[0]?.kind);
          void optimizeCallAudioPipeline(pc, voiceBitrateRef.current);
          return;
        }

        const seen = new Set<string>();
        for (const receiver of pc.getReceivers?.() ?? []) {
          const track = receiver.track;
          if (!track || track.readyState === 'ended' || seen.has(track.id)) continue;
          if (isTrackFromLocalCapture(track, localTrackIdsRef.current)) continue;
          seen.add(track.id);
          applyRemoteTrack(track, track.kind);
        }
      } catch {
        /* ignore */
      }
    };

    const armMediaReadyHint = () => {
      if (mediaReadyHintRef.current) clearTimeout(mediaReadyHintRef.current);
      mediaReadyHintRef.current = setTimeout(() => {
        if (cancelled || callStateRef.current === 'connected') return;
        const remote = remoteStreamRef.current as MediaStream;
        const pc = pcRef.current as RTCPeerConnection | null;
        syncRemoteTracksFromPeerConnection(pc);
        const pcState = peerPcState();
        const ice = peerIceState();

        if (
          canPromoteCallToConnected({
            stream: remote,
            isVideo: isVideoCallRef.current,
            peerConnectionState: pcState,
            iceConnectionState: ice,
            role,
            peerAccepted: peerAnsweredRef.current,
            hasRemoteDescription: Boolean(pc?.remoteDescription),
          })
        ) {
          maybeMarkCallConnected(remote);
          return;
        }

        /** ICE encore en négociation — prolonger sans message d'erreur prématuré. */
        if (isIceStillNegotiating(ice) || pcState === 'connecting' || pcState === 'new') {
          armMediaReadyHint();
          return;
        }

        setErrorMsg(
          'Connexion lente ou bloquée par le réseau mobile. Vérifiez le Wi‑Fi ou réessayez dans quelques secondes.',
        );
      }, mediaReadyHintMsRef.current);
    };

    const waitForLocalMediaReady = async (): Promise<boolean> => {
      for (let i = 0; i < 60; i++) {
        if (cancelled) return false;
        const local = localStreamRef.current as MediaStream | null;
        if (local?.getTracks?.().length) return true;
        await new Promise((r) => setTimeout(r, 100));
      }
      return Boolean((localStreamRef.current as MediaStream | null)?.getTracks?.().length);
    };

    const bindLocalWebPreview = (stream: MediaStream) => {
      bindWebRtcMediaElement(localVideoElRef.current, stream, { allowPendingTracks: true });
      if (streamHasActiveMediaTracks(stream)) return;
      let polls = 0;
      const pollId = setInterval(() => {
        if (setupStale() || ++polls > 25) {
          clearInterval(pollId);
          return;
        }
        bindWebRtcMediaElement(localVideoElRef.current, stream, { allowPendingTracks: true });
        if (streamHasActiveMediaTracks(stream)) clearInterval(pollId);
      }, 200);
    };

    const setupLocalEl = (stream: MediaStream) => {
      if (!shouldApplyNativeRtcUrl()) return;
      if (isWebRuntime && isVideoCallRef.current) {
        bindLocalWebPreview(stream);
        setLocalStreamKey((k) => k + 1);
      }
      if (!isWebRuntime) {
        const url = (stream as { toURL?: () => string })?.toURL?.();
        if (isValidNativeRtcStreamUrl(url)) {
          setLocalStreamUrl(url!);
          setLocalStreamKey((k) => k + 1);
        } else if (!url) {
          bindNativeStreamUrlWithRetry(
            stream,
            (nextUrl) => {
              if (!shouldApplyNativeRtcUrl()) return;
              if (isValidNativeRtcStreamUrl(nextUrl)) setLocalStreamUrl(nextUrl);
            },
            () => {
              if (!shouldApplyNativeRtcUrl()) return;
              setLocalStreamKey((k) => k + 1);
            },
            10,
            shouldApplyNativeRtcUrl,
          );
        }
      }
    };

    const sendSignal = (signal: SignalPayload) => {
      const payload = {
        callId: callIdRef.current,
        fromUserId: myUserId,
        toUserId: otherUserId,
        signal,
      };
      void socketService.ensureConnectedEmit('call:signal', payload, signal.kind === 'sdp' ? 12_000 : 8_000).then((ok) => {
        if (!ok && !cancelled && signal.kind === 'sdp') {
          setErrorMsg('Connexion instable. Nouvelle tentative…');
        }
      });
    };

    /**
     * ⛔ ZONE SIGNALISATION VERROUILLÉE — DÉBUT
     * Web + Android + iOS partagent ce bloc. Régression juin 2026 : SDP sans type → appel bloqué.
     * Ne pas remplacer sendSdpFromPeerConnection / normalizeInboundCallSignal / enqueueSignal.
     * Voir `.cursor/rules/call-signaling-locked.mdc` et `callSignalingPayload.ts`.
     */
    const pendingSignalsRef: Array<{ callId: string; fromUserId: string; signal: SignalPayload }> = [];
    const PENDING_SIGNAL_CAP = 48;
    let signalChain: Promise<void> = Promise.resolve();

    const sendSdpFromPeerConnection = (
      pc: RTCPeerConnection | null,
      fallback?: RTCSessionDescriptionInit | null,
    ): boolean => {
      const outbound = pickOutboundCallSdp(pc, fallback ?? undefined);
      if (!outbound) {
        logCallPhase(callIdRef.current, 'sdp_send_skipped', {
          reason: 'invalid_outbound',
          pcLocalType: pc?.localDescription?.type ?? null,
          fallbackType: fallback?.type ?? null,
        });
        devWarn('[Call] SDP non envoyé — type ou sdp manquant après setLocalDescription');
        return false;
      }
      logCallPhase(callIdRef.current, 'sdp_send', {
        type: outbound.type,
        hasAudio: sdpContainsMedia(outbound.sdp, 'audio'),
        hasVideo: sdpContainsMedia(outbound.sdp, 'video'),
      });
      sendSignal({ kind: 'sdp', sdp: outbound });
      return true;
    };

    triggerIceRestartRef.current = async () => {
      if (cancelled || pcTearingDownRef.current) return;
      const pc = pcRef.current as RTCPeerConnection | null;
      if (!pc || pc.connectionState === 'closed') return;
      try {
        const restartOffer = await pc.createOffer({ iceRestart: true });
        const tunedRestart = withTunedVoiceSdp(restartOffer, voiceBitrateRef.current);
        await setTunedLocalDescription(pc, tunedRestart, voiceBitrateRef.current);
        sendSdpFromPeerConnection(pc, tunedRestart);
        const remote = remoteStreamRef.current as MediaStream;
        enableRemoteAudioTracks(remote);
        if (!isWebRuntime) {
          void applyNativeCallSpeakerRoute(speakerOnRef.current);
        }
        logCallPhase(callIdRef.current, 'ice_restart_network_change', {});
      } catch (e) {
        devWarn('[Call] ICE restart on network change failed', e);
      }
    };

    const clearConnectionWatchdog = () => {
      if (connectionWatchdogRef.current) {
        clearTimeout(connectionWatchdogRef.current);
        connectionWatchdogRef.current = null;
      }
    };

    const clearCallerRingTimeout = () => {
      if (!shouldClearCallerRingTimeoutOnAccept({ role })) return;
      if (ringTimeoutRef.current) {
        clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
    };

    const armMediaWatchdogIfReady = () => {
      if (!shouldArmMediaConnectionWatchdog({ role, peerAccepted: peerAnsweredRef.current })) {
        return;
      }
      armConnectionWatchdog();
    };

    let restartAttempted = false;
    const armConnectionWatchdog = () => {
      clearConnectionWatchdog();
      connectionWatchdogRef.current = setTimeout(async () => {
        if (cancelled) return;
        const pc = pcRef.current as RTCPeerConnection | null;
        if (!pc) return;
        const state = String(pc.connectionState || '');
        const ice = peerIceState();
        if (state === 'connected' || state === 'closed') return;
        if (isIceConnectionReady(ice)) {
          const remote = remoteStreamRef.current as MediaStream;
          maybeMarkCallConnected(remote, 'audio');
          if (callStateRef.current === 'connected') {
            clearConnectionWatchdog();
          }
          return;
        }

        const remote = remoteStreamRef.current as MediaStream;
        if (shouldMarkCallConnected({
          stream: remote,
          isVideo: isVideoCallRef.current,
          peerConnectionState: String(pc?.connectionState || ''),
          iceConnectionState: ice,
          role,
          peerAccepted: peerAnsweredRef.current,
          hasRemoteDescription: Boolean(pc.remoteDescription),
        })) {
          maybeMarkCallConnected(remote, 'audio');
          clearConnectionWatchdog();
          return;
        }
        if (streamHasLiveAudio(remote) || (isVideoCallRef.current && streamHasLiveVideo(remote))) {
          armConnectionWatchdog();
          return;
        }

        if (isIceStillNegotiating(ice) || state === 'connecting' || state === 'new') {
          armConnectionWatchdog();
          return;
        }

        if (
          shouldResendCallerOffer({
            role,
            peerAccepted: peerAnsweredRef.current,
            callerOfferSent: callerOfferSentRef.current,
            hasRemoteDescription: Boolean(pc.remoteDescription),
            resendCount: callerOfferResendCountRef.current,
          })
        ) {
          callerOfferResendCountRef.current += 1;
          sendSdpFromPeerConnection(pc, pc.localDescription);
          logCallPhase(callIdRef.current, 'sdp_resend_offer', {
            attempt: callerOfferResendCountRef.current,
          });
          armConnectionWatchdog();
          return;
        }

        if (!restartAttempted) {
          restartAttempted = true;
          try {
            const restartOffer = await pc.createOffer({ iceRestart: true });
            const tunedRestart = withTunedVoiceSdp(restartOffer, voiceBitrateRef.current);
            await setTunedLocalDescription(pc, tunedRestart, voiceBitrateRef.current);
            sendSdpFromPeerConnection(pc, tunedRestart);
            armConnectionWatchdog();
            return;
          } catch {
            /* fallback fin d’appel */
          }
        }

        logCallPhase(callIdRef.current, 'connection_watchdog_fail', {
          ice,
          pcState: state,
        });
        setErrorMsg('Connexion instable. Réessayez l’appel.');
        finishCall('failed');
      }, connectionWatchdogMsRef.current);
    };

    const flushPendingIce = async () => {
      const pc = pcRef.current as RTCPeerConnection | null;
      if (!pc || !pc.remoteDescription) return;
      while (pendingIceRef.current.length > 0) {
        const c = pendingIceRef.current.shift();
        if (!c) continue;
        try {
          const ice = isWebRuntime ? c : new RTCIceCandidateImpl(c);
          await pc.addIceCandidate(ice);
        } catch (e) {
          logCallPhase(callId, 'ice_remote_failed', { error: String(e) });
        }
      }
    };

    /** Active la caméra locale et l’attache à la PeerConnection (passage vocal → vidéo). */
    const attachVideoToActiveCall = async (): Promise<boolean> => {
      if (isVideoCallRef.current) return true;
      const pc = pcRef.current as RTCPeerConnection | null;
      if (!pc) return false;

      const mediaDevicesImpl = resolveWebRtcMediaDevices();
      if (!mediaDevicesImpl?.getUserMedia) return false;

      if (!isWebRuntime) {
        const permitted = await requestNativeCallPermissions(true);
        if (!permitted) return false;
      }

      const videoProfile = await detectVideoProfile();
      let camStream: MediaStream;
      try {
        camStream = await mediaDevicesImpl.getUserMedia({
          audio: false,
          video: buildCallVideoConstraints(videoProfile),
        });
      } catch {
        try {
          camStream = await mediaDevicesImpl.getUserMedia({ audio: false, video: { facingMode: 'user' } });
        } catch {
          try {
            camStream = await mediaDevicesImpl.getUserMedia({ audio: false, video: true });
          } catch {
            return false;
          }
        }
      }

      const vt = camStream.getVideoTracks()[0];
      if (!vt) {
        camStream.getTracks().forEach((t) => t.stop());
        return false;
      }

      const local = localStreamRef.current as MediaStream | null;
      if (!local) {
        vt.stop();
        return false;
      }

      const oldVt = local.getVideoTracks()[0];
      if (oldVt) {
        try {
          local.removeTrack(oldVt);
          oldVt.stop();
        } catch {
          /* ignore */
        }
      }
      local.addTrack(vt);

      let videoSender = localSendersRef.current.video;
      if (!videoSender) {
        const existingVideoTx = pc
          .getTransceivers()
          .find((t) => t.sender?.track?.kind === 'video' || t.receiver?.track?.kind === 'video');
        if (existingVideoTx?.sender) {
          videoSender = existingVideoTx.sender;
          localSendersRef.current.video = videoSender;
        }
      }
      if (!videoSender) {
        try {
          videoSender = pc.addTransceiver('video', { direction: 'sendrecv' }).sender;
          localSendersRef.current.video = videoSender;
        } catch {
          try {
            pc.addTrack(vt, local);
          } catch {
            vt.stop();
            return false;
          }
        }
      }
      if (videoSender) {
        try {
          await videoSender.replaceTrack(vt);
        } catch {
          vt.stop();
          return false;
        }
      }

      if (!isWebRuntime && videoSender) {
        try {
          const params = videoSender.getParameters?.() || {};
          params.encodings = (params.encodings || [{}]).map((enc: { maxBitrate?: number; maxFramerate?: number }) => ({
            ...enc,
            maxBitrate: videoProfile.maxBitrate,
            maxFramerate: videoProfile.frameRate,
          }));
          await videoSender.setParameters?.(params).catch(() => {});
        } catch {
          /* ignore */
        }
      }

      activeVideoDeviceIdRef.current = readVideoDeviceIdFromStream(local);
      setLocalFacing('user');
      setupLocalEl(local);
      isVideoCallRef.current = true;
      setIsVideoCall(true);
      setErrorMsg(null);
      if (!isWebRuntime) {
        void startActiveCallForeground(name || 'Contact', true);
      }

      if (!isWebRuntime) {
        await startNativeCallAudioSession(true, speakerOnRef.current);
      }

      logCallPhase(callIdRef.current, 'upgrade_video_local', { ok: true });
      return true;
    };

    const handleSignal = async (payload: { callId: string; fromUserId: string; signal: SignalPayload }) => {
      const rxKind = String((payload?.signal as { kind?: string })?.kind || '');
      if (!callIdsEqual(payload?.callId, callIdRef.current)) {
        logCallPhase(callIdRef.current, 'signal_drop', {
          reason: 'call_id_mismatch',
          rxCallId: payload?.callId ?? null,
          expectedCallId: callIdRef.current,
          kind: rxKind,
        });
        return;
      }
      if (payload.fromUserId && !callUserIdsEqual(payload.fromUserId, otherUserId)) {
        logCallPhase(callIdRef.current, 'signal_drop', {
          reason: 'from_user_mismatch',
          fromUserId: payload.fromUserId,
          expectedUserId: otherUserId,
          kind: rxKind,
        });
        return;
      }
      const pc = pcRef.current as RTCPeerConnection | null;
      if (!pc) {
        if (pendingSignalsRef.length < PENDING_SIGNAL_CAP) {
          pendingSignalsRef.push(payload);
          logCallPhase(callIdRef.current, 'signal_queued', {
            kind: rxKind,
            queueLen: pendingSignalsRef.length,
          });
        } else {
          logCallPhase(callIdRef.current, 'signal_drop', {
            reason: 'queue_full',
            kind: rxKind,
            cap: PENDING_SIGNAL_CAP,
          });
        }
        return;
      }
      logCallPhase(callIdRef.current, 'signal_rx', {
        kind: rxKind,
        fromUserId: payload.fromUserId ?? null,
        signalingState: pc.signalingState,
      });
      const normalized = normalizeInboundCallSignal(payload.signal, pc.signalingState);
      if (!normalized) {
        logCallPhase(callIdRef.current, 'signal_ignored', {
          kind: rxKind,
          signalingState: pc.signalingState,
        });
        return;
      }
      try {
        if (normalized.kind === 'sdp') {
          const remoteSdp = normalized.sdp;
          const remoteDescription = isWebRuntime
            ? remoteSdp
            : new RTCSessionDescriptionImpl(remoteSdp);
          try {
            await pc.setRemoteDescription(remoteDescription);
          } catch (firstErr) {
            if (
              remoteSdp.type === 'offer' &&
              String(pc.signalingState || '') === 'have-local-offer'
            ) {
              try {
                await pc.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit);
                await pc.setRemoteDescription(remoteDescription);
              } catch {
                throw firstErr;
              }
            } else {
              throw firstErr;
            }
          }
          logCallPhase(callIdRef.current, 'sdp_remote', {
            type: remoteSdp.type,
            hasAudio: sdpContainsMedia(remoteSdp.sdp, 'audio'),
            hasVideo: sdpContainsMedia(remoteSdp.sdp, 'video'),
          });
          await flushPendingIce();
          syncRemoteTracksFromPeerConnection(pc);
          maybeMarkCallConnected(remoteStreamRef.current as MediaStream, 'audio');
          if (remoteSdp.type === 'offer') {
            const offerHasVideo = sdpContainsMedia(remoteSdp.sdp, 'video');
            if (offerHasVideo && !isVideoCallRef.current) {
              const camOk = await attachVideoToActiveCall();
              if (!camOk) {
                logCallPhase(callId, 'upgrade_video_peer_camera_failed', {});
              }
            }
            const prunedAns = pruneRedundantCallTransceivers(pc);
            if (prunedAns) logCallPhase(callId, 'transceivers_pruned', { stopped: prunedAns });
            const ans = await pc.createAnswer(callSdpNegotiationOptions());
            const tunedAns = withTunedVoiceSdp(ans, voiceBitrateRef.current);
            await setTunedLocalDescription(pc, tunedAns, voiceBitrateRef.current);
            logCallPhase(callId, 'sdp_local', {
              type: tunedAns.type,
              hasAudio: sdpContainsMedia(tunedAns.sdp, 'audio'),
              hasVideo: sdpContainsMedia(tunedAns.sdp, 'video'),
            });
            sendSdpFromPeerConnection(pc, tunedAns);
          }
        } else if (normalized.kind === 'ice') {
          if (normalized.candidate === null) {
            if (pc.remoteDescription) {
              try {
                await pc.addIceCandidate(null as unknown as RTCIceCandidateInit);
              } catch {
                /* fin de candidats — optionnel selon impl */
              }
            }
            return;
          }
          if (pc.remoteDescription) {
            const ice = isWebRuntime
              ? normalized.candidate
              : new RTCIceCandidateImpl(normalized.candidate);
            try {
              await pc.addIceCandidate(ice);
            } catch (e) {
              logCallPhase(callId, 'ice_remote_failed', { error: String(e) });
            }
          } else {
            pendingIceRef.current.push(normalized.candidate);
          }
        }
      } catch (e) {
        logCallPhase(callIdRef.current, 'signal_failed', {
          kind: rxKind,
          name: String((e as Error)?.name || ''),
          message: String((e as Error)?.message || e || ''),
        });
        devWarn('[Call] signal handling failed', e);
      }
    };

    const flushPendingSignals = async () => {
      const pc = pcRef.current as RTCPeerConnection | null;
      if (!pc || pendingSignalsRef.length === 0) return;
      while (pendingSignalsRef.length > 0) {
        const next = pendingSignalsRef.shift();
        if (!next) continue;
        await handleSignal(next);
      }
    };

    const enqueueSignal = (payload: { callId: string; fromUserId: string; signal: SignalPayload }) => {
      signalChain = signalChain
        .then(() => handleSignal(payload))
        .catch((e) => {
          devWarn('[Call] signal queue failed', e);
        });
    };

    /**
     * Côté caller : on attend l'`accept` du receveur avant de créer et d'envoyer
     * l'offre SDP. Sinon le receveur n'a pas encore monté son listener `call:signal`
     * et perd l'offre → l'appel ne se connecte jamais.
     */
    const callerLocalMediaReady = (): boolean => {
      const local = localStreamRef.current as MediaStream | null;
      if (local?.getTracks?.().length) return true;
      const pc = pcRef.current as RTCPeerConnection | null;
      return (pc?.getSenders?.() ?? []).some((sender) => sender.track?.kind === 'audio');
    };

    const sendCallerOfferAfterAccept = async (source: string): Promise<boolean> => {
      if (cancelled || role !== 'caller') return false;
      if (callerOfferSentRef.current) return true;
      if (!peerAnsweredRef.current) return false;
      const pc = pcRef.current as RTCPeerConnection | null;
      if (!pc) {
        logCallPhase(callIdRef.current, 'caller_offer_deferred', { reason: 'no_pc', source });
        return false;
      }
      if (!callerLocalMediaReady()) {
        const mediaReady = await waitForLocalMediaReady();
        if (cancelled || !mediaReady) {
          logCallPhase(callIdRef.current, 'caller_offer_abort', {
            reason: 'local_media_timeout',
            source,
          });
          setErrorMsg('Micro indisponible. Réessayez l’appel.');
          finishCall('failed');
          return false;
        }
      }
      try {
        const prunedOffer = pruneRedundantCallTransceivers(pc);
        if (prunedOffer) logCallPhase(callId, 'transceivers_pruned', { stopped: prunedOffer });
        const offer = await pc.createOffer(callSdpNegotiationOptions());
        const tunedOffer = withTunedVoiceSdp(offer, voiceBitrateRef.current);
        await setTunedLocalDescription(pc, tunedOffer, voiceBitrateRef.current);
        logCallPhase(callId, 'sdp_local', {
          type: tunedOffer.type,
          hasAudio: sdpContainsMedia(tunedOffer.sdp, 'audio'),
          hasVideo: sdpContainsMedia(tunedOffer.sdp, 'video'),
          audioSections: countSdpMediaSections(tunedOffer.sdp, 'audio'),
          videoSections: countSdpMediaSections(tunedOffer.sdp, 'video'),
          txCount: pc.getTransceivers?.().length ?? -1,
        });
        const sent = sendSdpFromPeerConnection(pc, tunedOffer);
        if (!sent) {
          logCallPhase(callIdRef.current, 'caller_offer_abort', {
            reason: 'sdp_send_skipped',
            source,
          });
          return false;
        }
        callerOfferSentRef.current = true;
        callerOfferResendCountRef.current = 0;
        armMediaWatchdogIfReady();
        return true;
      } catch (e) {
        devWarn('[Call] offer failed', e);
        logCallPhase(callIdRef.current, 'caller_offer_abort', {
          reason: 'create_offer_failed',
          source,
          message: String((e as Error)?.message || e || ''),
        });
        finishCall('failed');
        return false;
      }
    };

    const handlePeerAccepted = async (payload: { callId?: string; type?: 'audio' | 'video' }) => {
      if (cancelled || role !== 'caller') return;
      if (payload?.callId && !callIdsEqual(payload.callId, callIdRef.current)) {
        logCallPhase(callIdRef.current, 'accept_ignored', {
          reason: 'call_id_mismatch',
          payloadCallId: payload.callId,
          localCallId: callIdRef.current,
        });
        return;
      }
      if (callerOfferSentRef.current) return;
      logCallPhase(callIdRef.current, 'accept_rx', {
        type: payload?.type ?? null,
        source: 'call:accept',
      });
      /** Bug #1 audit : annuler timer 30 s « Pas de réponse » dès accept. */
      clearCallerRingTimeout();
      restartAttempted = false;
      clearConnectionWatchdog();
      if (payload?.type === 'video' && !startedAsVideo) {
        logCallPhase(callId, 'accept_type_mismatch', { invite: 'video', local: 'audio' });
        setErrorMsg('Le correspondant a répondu en vidéo — relancez un appel vidéo.');
        finishCall('failed');
        return;
      }
      if (shouldDowngradeVideoInviteToAudioAnswer({ startedAsVideo, acceptType: payload?.type })) {
        logCallPhase(callId, 'accept_type_downgrade', { invite: 'video', accept: 'audio' });
        isVideoCallRef.current = false;
        setIsVideoCall(false);
        setCameraOff(true);
      }
      setPeerAnswered(true);
      peerAnsweredRef.current = true;
      setCallState('connecting');
      if (isWebRuntime) {
        void stopAllCallRings();
      }
      armMediaReadyHint();
      await sendCallerOfferAfterAccept('call:accept');
    };

    const handlePeerEnded = () => finishCall('ended');
    const handlePeerDeclined = () => {
      setErrorMsg('Appel refusé.');
      finishCall('declined');
    };
    const handleCallMissed = (payload: { callId?: string }) => {
      if (payload?.callId && !callIdsEqual(payload.callId, callIdRef.current)) return;
      if (
        !shouldFinishCallAsMissed({
          callState: callStateRef.current,
          peerAnswered: peerAnsweredRef.current,
        })
      ) {
        return;
      }
      clearCallerRingTimeout();
      setErrorMsg('Pas de réponse.');
      finishCall('missed');
    };
    const handleInviteAck = (payload: { callId?: string; receiverReachable?: boolean }) => {
      if (role !== 'caller' || !payload?.callId) return;
      callIdRef.current = String(payload.callId);
      if (payload.receiverReachable === false) {
        setErrorMsg(
          'Le correspondant semble hors ligne. Une notification lui a été envoyée — il doit ouvrir AfriWonder.',
        );
      }
    };

    /** ⛔ ZONE SIGNALISATION VERROUILLÉE — FIN (listeners enregistrés avant start()) */
    const offSignal = socketService.on('call:signal', enqueueSignal);
    const offAccept = socketService.on('call:accept', handlePeerAccepted);
    const offEnd = socketService.on('call:end', handlePeerEnded);
    const offDecline = socketService.on('call:decline', handlePeerDeclined);
    const offMissed = socketService.on('call:missed', handleCallMissed);
    const offInviteAck = socketService.on('call:invite:ack', handleInviteAck);

    const start = async () => {
      if (isWebRuntime) {
        await stopAllCallRings();
      }
      finishingRef.current = false;
      pcTearingDownRef.current = false;
      mediaStoppedRef.current = false;
      setNativeRtcUnmounting(false);
      try {
        /**
         * Optimisations Afrique de l'Ouest (Mali / Sénégal / Côte d'Ivoire) :
         * 1. STUN multiples (Google + Cloudflare + Twilio public) → meilleure résilience NAT
         * 2. TURN obligatoire pour Carrier-Grade NAT mobile (Orange, MTN, Moov) — sinon ~30% des appels échouent
         * 3. Détection bande passante via NetInfo → adapter codec/résolution
         */
        let iceServers: RTCIceServer[] = parseTurnCredentialsResponse(null).iceServers;
        let turnConfigured = false;
        const loadTurnCredentials = async () => {
          const res = await apiClient.get('/calls/turn-credentials');
          return parseTurnCredentialsResponse(res.data?.data || res.data);
        };
        try {
          let parsed = await loadTurnCredentials();
          iceServers = parsed.iceServers;
          turnConfigured = parsed.turnConfigured;
        } catch {
          try {
            await new Promise((r) => setTimeout(r, 1500));
            const parsed = await loadTurnCredentials();
            iceServers = parsed.iceServers;
            turnConfigured = parsed.turnConfigured;
          } catch {
            /* Endpoint indisponible : STUN locaux uniquement. */
          }
        }
        iceServers = prepareIceServersForPlatform({
          isWeb: isWebRuntime,
          turnConfigured,
          iceServers,
        });
        if (setupStale()) return;

        /**
         * Mobile Afrique : relais TURN forcé sur cellulaire (2G/3G/4G) si TURN configuré (CGNAT opérateur).
         * Logique pure + testée dans `callNetworkConfig.ts`.
         */
        let iceNetSnapshot: NetworkSnapshot = { type: 'unknown' };
        try {
          const net = await NetInfo.fetch();
          const det = (net.details || {}) as { cellularGeneration?: string | null };
          iceNetSnapshot = resolveIceNetworkSnapshot({
            type: net.type,
            cellularGeneration: det.cellularGeneration,
          });
        } catch {
          iceNetSnapshot = { type: 'unknown' };
        }
        connectionWatchdogMsRef.current = callConnectionWatchdogMs(iceNetSnapshot);
        mediaReadyHintMsRef.current = callMediaReadyHintMs(iceNetSnapshot);
        voiceBitrateRef.current = pickVoiceOpusBitrateForNetwork(iceNetSnapshot);
        const pcConfig = buildCallIceConfig({
          iceServers,
          turnConfigured,
          isWeb: isWebRuntime,
          net: iceNetSnapshot,
        });
        logCallPhase(callId, 'turn_config', {
          turnConfigured,
          iceTransportPolicy: pcConfig.iceTransportPolicy ?? 'all',
          netType: iceNetSnapshot.type,
          cellularGeneration: iceNetSnapshot.cellularGeneration,
          iceServersCount: iceServers.length,
        });
        pcTearingDownRef.current = false;
        let pc: RTCPeerConnection;
        try {
          pc = new RTCPeerConnectionImpl(pcConfig);
        } catch (pcErr) {
          if (!isWebRuntime) throw pcErr;
          devWarn('[Call] RTCPeerConnection config primaire échouée, repli STUN', pcErr);
          pc = new RTCPeerConnection({ iceServers: iceServers.slice(0, 3) });
        }
        pcRef.current = pc;
        logCallPhase(callId, 'pc_created', { isWeb: isWebRuntime });
        await flushPendingSignals();

        /**
         * Natif : transceivers sendrecv avant getUserMedia (fix silence / vidéo distante Android).
         * Web (Firefox/Chrome) : addTrack uniquement — addTransceiver+replaceTrack provoque DOMException.
         */
        const localSenders: { audio?: RTCRtpSender | null; video?: RTCRtpSender | null } = {};
        if (!isWebRuntime) {
          try {
            localSenders.audio = pc.addTransceiver('audio', { direction: 'sendrecv' }).sender;
            if (startedAsVideo) {
              localSenders.video = pc.addTransceiver('video', { direction: 'sendrecv' }).sender;
            }
          } catch {
            /* fallback addTrack après getUserMedia */
          }
        }
        localSendersRef.current = localSenders;

        const remoteStream = isWebRuntime ? new MediaStream() : new nativeWebRTC.MediaStream();
        remoteStreamRef.current = remoteStream;

        pc.ontrack = (ev: RTCTrackEvent) => {
          if (!ev.track) return;
          syncRemoteTracksFromPeerConnection(pc);
        };

        pc.onicecandidate = (ev: RTCPeerConnectionIceEvent) => {
          if (ev.candidate) {
            logCallPhase(callId, 'ice_local', {
              type: ev.candidate.type,
              protocol: ev.candidate.protocol,
            });
            sendSignal({ kind: 'ice', candidate: ev.candidate.toJSON() });
          } else {
            sendSignal({ kind: 'ice', candidate: null });
          }
        };

        pc.onconnectionstatechange = () => {
          if (pcTearingDownRef.current) return;
          const s = pc.connectionState;
          logCallPhase(callId, 'pc_state', { connectionState: s });
          if (s === 'connected') {
            syncRemoteTracksFromPeerConnection(pc);
            const remote = remoteStreamRef.current as MediaStream;
            if (
              shouldMarkCallConnected({
                stream: remote,
                isVideo: isVideoCallRef.current,
                peerConnectionState: s,
                iceConnectionState: peerIceState(),
                role,
                peerAccepted: peerAnsweredRef.current,
                hasRemoteDescription: Boolean(pc.remoteDescription),
              })
            ) {
              clearConnectionWatchdog();
            }
            enableRemoteAudioTracks(remote);
            if (!isWebRuntime) {
              void applyNativeCallSpeakerRoute(speakerOnRef.current);
            }
            maybeMarkCallConnected(remoteStreamRef.current as MediaStream, 'audio');
          }
          if (s === 'failed') {
            const ice = peerIceState();
            if (isIceConnectionReady(ice) || isIceStillNegotiating(ice) || ice === 'disconnected') {
              return;
            }
            setTimeout(() => {
              if (pcTearingDownRef.current || cancelled) return;
              const pcNow = pcRef.current as RTCPeerConnection | null;
              if (!pcNow || pcNow !== pc) return;
              const iceLater = peerIceState();
              if (isIceConnectionReady(iceLater) || isIceStillNegotiating(iceLater)) return;
              finishCall('failed');
            }, 4000);
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (pcTearingDownRef.current) return;
          const ice = String(pc.iceConnectionState || '');
          logCallPhase(callId, 'ice_state', { iceConnectionState: ice });
          if (ice === 'connected' || ice === 'completed') {
            syncRemoteTracksFromPeerConnection(pc);
            const remote = remoteStreamRef.current as MediaStream;
            if (
              shouldMarkCallConnected({
                stream: remote,
                isVideo: isVideoCallRef.current,
                peerConnectionState: peerPcState(),
                iceConnectionState: ice,
                role,
                peerAccepted: peerAnsweredRef.current,
                hasRemoteDescription: Boolean(pc.remoteDescription),
              })
            ) {
              clearConnectionWatchdog();
            }
            enableRemoteAudioTracks(remote);
            if (!isWebRuntime) {
              void applyNativeCallSpeakerRoute(speakerOnRef.current);
            }
            maybeMarkCallConnected(remote, 'audio');
          }
          if (ice === 'failed') {
            void (async () => {
              if (!restartAttempted) {
                restartAttempted = true;
                try {
                  const restartOffer = await pc.createOffer({ iceRestart: true });
                  const tunedRestart = withTunedVoiceSdp(restartOffer, voiceBitrateRef.current);
                  await setTunedLocalDescription(pc, tunedRestart, voiceBitrateRef.current);
                  sendSdpFromPeerConnection(pc, tunedRestart);
                  armConnectionWatchdog();
                  return;
                } catch {
                  /* fin ci-dessous */
                }
              }
              if (!turnConfigured && !isWebRuntime) {
                setErrorMsg(
                  'Audio bloqué par le réseau mobile. Le serveur TURN n’est pas configuré — contactez le support AfriWonder.',
                );
              } else if (turnConfigured && !isWebRuntime) {
                setErrorMsg(
                  'Connexion média impossible via le relais sécurisé (TURN). Réessayez en Wi‑Fi ou plus tard.',
                );
              }
              finishCall('failed');
            })();
          }
        };

        if (!isWebRuntime) {
          await releaseExpoAvForWebRtcCall();
          const permitted = await requestNativeCallPermissions(startedAsVideo);
          if (!permitted) {
            throw new Error('NOTALLOWED');
          }
          /** InCallManager avant capture micro — sinon HP / écouteur parfois muets sur Android. */
          await startNativeCallAudioSession(startedAsVideo, speakerOnRef.current, {
            outgoingRingback: role === 'caller',
          });
        }

        if (shouldBlockCellularWithoutTurn({ turnConfigured, net: iceNetSnapshot })) {
          devWarn('[Call] TURN non configuré — cellulaire Afrique bloqué (CGNAT)');
          setErrorMsg(
            'Réseau mobile sans relais TURN — l’audio ne peut pas passer. Passez en Wi‑Fi ou contactez le support.',
          );
          finishCall('failed');
          return;
        }

        if (
          shouldBlockNativeCellularWithoutTlsTurn({
            isWeb: isWebRuntime,
            turnConfigured,
            net: iceNetSnapshot,
            iceServers,
          })
        ) {
          devWarn('[Call] TURN sans relais TLS (turns:) — cellulaire Android bloqué');
          setErrorMsg(
            'Relais TURN sécurisé indisponible pour le réseau mobile. Mettez à jour l’app ou contactez le support AfriWonder.',
          );
          finishCall('failed');
          return;
        }

        const videoProfile = startedAsVideo ? await detectVideoProfile() : null;
        if (videoProfile) {
          devWarn('[Call] Profile vidéo sélectionné', videoProfile.label, 'TURN:', turnConfigured);
        }
        if (!mediaDevicesImpl?.getUserMedia) {
          throw new Error('MEDIA_DEVICES_UNAVAILABLE');
        }
        if (setupStale()) return;
        let preAcquiredWebStream: MediaStream | null = null;
        if (isWebRuntime) {
          const prefetch = consumeWebCallMediaCapture();
          if (prefetch) {
            logCallPhase(callId, 'web_media_prefetch_wait', { wantVideo: startedAsVideo });
            try {
              preAcquiredWebStream = await prefetch;
              logCallPhase(callId, 'web_media_prefetch_ok', {
                audioTracks: preAcquiredWebStream.getAudioTracks?.().length ?? 0,
              });
            } catch (prefetchErr) {
              devWarn('[Call] web media prefetch failed', prefetchErr);
              logCallPhase(callId, 'web_media_prefetch_failed', {
                name: String((prefetchErr as DOMException)?.name || ''),
                message: String((prefetchErr as Error)?.message || ''),
              });
            }
          }
          if (!preAcquiredWebStream?.getAudioTracks?.().length) {
            logCallPhase(callId, 'web_media_consent_wait', { wantVideo: startedAsVideo });
            try {
              await waitForWebMediaConsent();
            } catch (consentErr) {
              if (String((consentErr as Error)?.message || '') === 'WEB_MEDIA_CONSENT_CANCELLED') {
                return;
              }
              throw consentErr;
            }
            if (setupStale()) return;
            preAcquiredWebStream = webPreAcquiredMediaRef.current;
            webPreAcquiredMediaRef.current = null;
            logCallPhase(callId, 'web_media_consent_granted', {
              wantVideo: startedAsVideo,
              hasPreAcquiredAudio: Boolean(preAcquiredWebStream?.getAudioTracks?.().length),
            });
          }
          if (setupStale()) return;
        }
        logCallPhase(callId, 'local_media_request', {
          wantVideo: startedAsVideo,
          listenOnly: Boolean(isWebRuntime && webListenOnlyRef.current),
        });
        const { stream: local, videoAcquired } = await acquireCallLocalMedia({
          mediaDevices: mediaDevicesImpl,
          wantVideo: startedAsVideo,
          videoProfile,
          preAcquiredStream: preAcquiredWebStream,
          listenOnly: isWebRuntime && webListenOnlyRef.current,
        });
        logCallPhase(callId, 'local_media_acquired', {
          audioTracks: local.getAudioTracks?.().length ?? 0,
          videoTracks: local.getVideoTracks?.().length ?? 0,
          listenOnly: Boolean(isWebRuntime && webListenOnlyRef.current),
        });
        if (setupStale()) {
          local.getTracks().forEach((t: any) => t.stop());
          return;
        }
        if (startedAsVideo && !videoAcquired) {
          setCameraOff(true);
          devWarn('[Call] Caméra indisponible — poursuite en audio local (appel vidéo conservé)');
        }
        localStreamRef.current = local;
        localTrackIdsRef.current = collectTrackIds(local);
        webrtcMediaActiveRef.current = true;
        activeVideoDeviceIdRef.current = readVideoDeviceIdFromStream(local);
        setLocalFacing('user');
        /** Natif : couper expo-av avant WebRTC ; web : ringback HTML5 continue jusqu’à `connecting`. */
        if (!isWebRuntime) {
          void stopOutgoingRingRef.current?.();
          stopOutgoingRingRef.current = null;
        }
        const localTrackCounts = countLocalTracks(local);
        logCallPhase(callId, 'local_media', {
          ...localTrackCounts,
          isVideo: startedAsVideo,
          videoAcquired,
        });
        if (isWebRuntime && webListenOnlyRef.current && !local.getAudioTracks?.().length) {
          try {
            const tx = pc.addTransceiver('audio', { direction: 'recvonly' });
            localSenders.audio = tx.sender;
            logCallPhase(callId, 'web_listen_only_transceiver', {});
          } catch (listenOnlyErr) {
            devWarn('[Call] listen-only transceiver failed', listenOnlyErr);
          }
        }
        await attachLocalTracksToPeerConnection(pc, local, localSenders);
        await optimizeCallAudioPipeline(pc, voiceBitrateRef.current);
        setupLocalEl(local);

        /**
         * Cap bitrate vidéo selon profil (essentiel en 2G/3G Afrique) :
         * - low : 200 kbps max
         * - medium : 500 kbps max
         * - high : 1500 kbps max
         * Empêche les bursts qui font dropper l'appel sur 3G saturé.
         */
        if (videoProfile && !isWebRuntime) {
          try {
            const senders = pc.getSenders?.() || [];
            for (const sender of senders) {
              if (sender?.track?.kind !== 'video') continue;
              const params = sender.getParameters?.() || {};
              params.encodings = (params.encodings || [{}]).map((enc: any) => ({
                ...enc,
                maxBitrate: videoProfile.maxBitrate,
                maxFramerate: videoProfile.frameRate,
              }));
              await sender.setParameters?.(params).catch(() => {});
            }
          } catch {
            /* ignore — pas critique */
          }
        }

        // Persist côté backend (création directCall row).
        await apiClient
          .post('/calls/session/upsert', {
            callId: callIdRef.current,
            peerUserId: otherUserId,
            role,
            status: 'pending',
          })
          .catch(() => {});

        if (role === 'caller') {
          // Notifie l'invité via Socket.io (+ push côté serveur). Attendre la connexion socket (cold start / réseau).
          const invited = await socketService.ensureConnectedEmit('call:invite', {
            callId: callIdRef.current,
            fromUserId: myUserId,
            toUserId: otherUserId,
            type: startedAsVideo ? 'video' : 'audio',
            callerName: user?.full_name || user?.username || 'Quelqu’un',
            callerAvatar: user?.profile_image || user?.avatar || '',
          });
          if (!invited) {
            setErrorMsg('Connexion indisponible. Réessayez.');
            finishCall('failed');
            return;
          }

          ringTimeoutRef.current = setTimeout(() => {
            if (
              !shouldFinishCallAsMissed({
                callState: callStateRef.current,
                peerAnswered: peerAnsweredRef.current,
              })
            ) {
              return;
            }
            setErrorMsg('Pas de réponse.');
            finishCall('missed');
          }, CALL_RING_MS);

          if (
            shouldSendCallerOfferAfterInvite({
              role,
              peerAccepted: peerAnsweredRef.current,
              callerOfferSent: callerOfferSentRef.current,
            })
          ) {
            void sendCallerOfferAfterAccept('post_invite');
          }
        } else {
          // Receveur : PC prêt avant accept — indispensable si l’app a été ouverte depuis une notification push.
          const accepted = await socketService.ensureConnectedEmit(
            'call:accept',
            buildCallAcceptPayload({
              callId: callIdRef.current,
              accepterUserId: myUserId,
              callerUserId: otherUserId,
              type: startedAsVideo ? 'video' : 'audio',
            }),
          );
          if (!accepted) {
            setErrorMsg('Connexion indisponible. Réessayez.');
            finishCall('failed');
            return;
          }
          setPeerAnswered(true);
          peerAnsweredRef.current = true;
          setCallState('connecting');
          if (isWebRuntime) {
            void stopAllCallRings();
          }
          armMediaReadyHint();
          armMediaWatchdogIfReady();
        }

        upgradeToVideoRef.current = async () => {
          if (cancelled || isVideoCallRef.current) return;
          if (callStateRef.current !== 'connected') return;
          const camOk = await attachVideoToActiveCall();
          if (!camOk) {
            setErrorMsg(
              isWebRuntime
                ? 'Caméra indisponible. Autorisez la caméra dans le navigateur.'
                : 'Caméra indisponible. Autorisez la caméra dans Réglages → AfriWonder.',
            );
            return;
          }
          void socketService.ensureConnectedEmit('call:upgrade', {
            callId: callIdRef.current,
            fromUserId: myUserId,
            toUserId: otherUserId,
            active: true,
          });
          const activePc = pcRef.current as RTCPeerConnection | null;
          if (!activePc) return;
          try {
            const offer = await activePc.createOffer(callSdpNegotiationOptions());
            const tunedOffer = withTunedVoiceSdp(offer, voiceBitrateRef.current);
            await setTunedLocalDescription(activePc, tunedOffer, voiceBitrateRef.current);
            logCallPhase(callIdRef.current, 'upgrade_video_offer', {
              hasVideo: sdpContainsMedia(tunedOffer.sdp, 'video'),
            });
            sendSdpFromPeerConnection(activePc, tunedOffer);
          } catch (e) {
            devWarn('[Call] upgrade offer failed', e);
            setErrorMsg('Impossible de passer en vidéo.');
          }
        };
      } catch (e: any) {
        if (setupStale()) return;
        logCallPhase(callId, 'setup_failed', {
          name: String(e?.name || ''),
          message: String(e?.message || e || ''),
        });
        devWarn('[Call] setup failed', e);
        captureSentryException(e, {
          source: 'call.setup_failed',
          callId,
          role,
          isVideo: startedAsVideo,
          platform: Platform.OS,
        });
        if (String(e?.message || '') === 'MEDIA_DEVICES_UNAVAILABLE') {
          setErrorMsg('WebRTC indisponible dans ce navigateur.');
        } else if (String(e?.message || '') === 'NOTALLOWED') {
          setErrorMsg('Permission micro / caméra refusée.');
        } else {
          setErrorMsg(callMediaErrorMessage(e, startedAsVideo));
        }
        finishCall('failed');
      }
    };

    const mediaNudgeTimer = setInterval(() => {
      if (cancelled) return;
      const pc = pcRef.current as RTCPeerConnection | null;
      syncRemoteTracksFromPeerConnection(pc);
      const remote = remoteStreamRef.current as MediaStream;
      enableRemoteAudioTracks(remote);
      if (remotePlaybackStreamRef.current) {
        enableRemoteAudioTracks(remotePlaybackStreamRef.current);
      }
      if (!isWebRuntime) {
        void applyNativeCallSpeakerRoute(speakerOnRef.current);
      }
      if (callStateRef.current !== 'connected' && pc?.remoteDescription) {
        if (
          canPromoteCallToConnected({
            stream: remote,
            isVideo: isVideoCallRef.current,
            trackKind: 'audio',
            peerConnectionState: peerPcState(),
            iceConnectionState: peerIceState(),
            role,
            peerAccepted: peerAnsweredRef.current,
            hasRemoteDescription: true,
          })
        ) {
          maybeMarkCallConnected(remote, 'audio');
        }
      }
      if (isWebRuntime && isVideoCallRef.current) {
        bindWebRtcMediaElement(remoteVideoElRef.current, remote, {
          allowPendingTracks: true,
        });
      } else if (isWebRuntime && !isVideoCallRef.current) {
        if (callStateRef.current !== 'connected' || !streamHasLiveAudio(remote)) {
          armRemoteWebAudioPlayback();
        } else if (remoteAudioElRef.current?.paused) {
          try {
            remoteAudioElRef.current.muted = false;
            void remoteAudioElRef.current.play().catch(() => {});
          } catch {
            /* ignore */
          }
        }
      }
    }, 1000);

    void start();

    return () => {
      cancelled = true;
      cancelWebMediaConsent();
      clearInterval(mediaNudgeTimer);
      offSignal();
      offAccept();
      offEnd();
      offDecline();
      offMissed();
      offInviteAck();
      scheduleStopAllMedia();
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      if (connectionWatchdogRef.current) clearTimeout(connectionWatchdogRef.current);
      connectionWatchdogRef.current = null;
      if (mediaReadyHintRef.current) clearTimeout(mediaReadyHintRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUserId, myUserId, startedAsVideo, role]);

  useEffect(() => {
    speakerOnRef.current = speakerOn;
  }, [speakerOn]);

  /** Journal d’appel côté serveur si l’écran est quitté sans bouton rouge (retour navigateur, etc.). */
  const finishCallRef = useRef(finishCall);
  finishCallRef.current = finishCall;
  useEffect(() => {
    return () => {
      if (finishingRef.current || callStateRef.current === 'ended') return;
      if (role === 'receiver' && !initialCallId) return;
      if (callStateRef.current === 'ringing' && role === 'caller') {
        finishCallRef.current('cancelled');
        return;
      }
      /** Ne pas couper pendant `connecting` — la négociation WebRTC peut survivre au remontage React. */
      if (callStateRef.current === 'connecting') return;
      if (callStateRef.current !== 'connected') {
        finishCallRef.current('cancelled');
        return;
      }
      finishCallRef.current('ended');
    };
  }, [role, initialCallId]);

  /**
   * Tonalité d’attente — uniquement avant capture micro WebRTC.
   * Après getUserMedia, expo-av volerait la session audio native (silence des deux côtés).
   */
  useEffect(() => {
    if (role !== 'caller' || callState !== 'ringing') return;
    /** Natif : tonalité via InCallManager dans startNativeCallAudioSession — pas expo-av (double sonnerie). */
    if (!isWebRuntime) return;
    if (webrtcMediaActiveRef.current) return;
    let cancelled = false;
    void startOutgoingRingbackPattern(0.58).then((fn) => {
      if (cancelled) {
        void fn();
        return;
      }
      if (!isWebRuntime && webrtcMediaActiveRef.current) {
        void fn();
        return;
      }
      stopOutgoingRingRef.current = fn;
    });
    return () => {
      cancelled = true;
      void stopOutgoingRingRef.current?.();
      stopOutgoingRingRef.current = null;
    };
  }, [role, callState]);

  /** Arrête la tonalité d’attente dès connexion WebRTC (web + natif). Ne pas rappeler releaseExpoAv ici — casse l’audio natif. */
  useEffect(() => {
    if (callState !== 'connecting' && callState !== 'connected') return;
    void stopOutgoingRingRef.current?.();
    stopOutgoingRingRef.current = null;
    if (isWebRuntime) return;
    void stopNativeOutgoingRingback();
  }, [callState]);

  /**
   * Détection de changement de réseau en cours d'appel (WiFi <-> 4G, 4G <-> 3G, perte connexion).
   * Affiche un toast discret quand la qualité chute brutalement (typique Afrique).
   */
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (callState !== 'connected' && callState !== 'connecting') return;
    let lastType = '';
    const unsubscribe = NetInfo.addEventListener((state) => {
      const type = String(state.type || '');
      if (lastType && type !== lastType) {
        if (!state.isConnected || type === 'none') {
          setErrorMsg('Reseau perdu - reconnexion...');
        } else {
          setErrorMsg(`Reseau change : ${type.toUpperCase()}`);
          if (callStateRef.current === 'connected') {
            void triggerIceRestartRef.current?.();
          }
          setTimeout(() => setErrorMsg(null), 4000);
        }
      }
      lastType = type;
    });
    return () => unsubscribe();
  }, [callState]);

  /** Toggle micro : disable/enable directement les pistes audio. */
  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      if (isWebRuntime) {
        const local = localStreamRef.current as MediaStream | null;
        local?.getAudioTracks().forEach((t) => (t.enabled = !next));
      } else {
        const local = localStreamRef.current as any;
        local?.getAudioTracks?.().forEach((t: any) => (t.enabled = !next));
      }
      return next;
    });
  }, []);

  const upgradeCallToVideo = useCallback(async () => {
    if (isVideoCall || videoUpgradeLoading) return;
    if (callState !== 'connected') {
      Alert.alert('Vidéo', 'Attendez que l’appel soit bien connecté.');
      return;
    }
    setVideoUpgradeLoading(true);
    try {
      await upgradeToVideoRef.current?.();
    } finally {
      setVideoUpgradeLoading(false);
    }
  }, [isVideoCall, callState, videoUpgradeLoading]);

  /** Toggle caméra (vidéo only). */
  const toggleCamera = useCallback(() => {
    if (!isVideoCall) return;
    setCameraOff((v) => {
      const next = !v;
      if (isWebRuntime) {
        const local = localStreamRef.current as MediaStream | null;
        local?.getVideoTracks().forEach((t) => (t.enabled = !next));
      } else {
        const local = localStreamRef.current as any;
        local?.getVideoTracks?.().forEach((t: any) => (t.enabled = !next));
      }
      return next;
    });
  }, [isVideoCall]);

  const toggleSpeaker = useCallback(() => {
    setSpeakerOn((v) => {
      const next = !v;
      if (isWebRuntime && remoteAudioElRef.current) {
        try {
          /** Ne jamais couper la piste distante : `muted` forçait le silence en mode « écouteur ». */
          remoteAudioElRef.current.muted = false;
        } catch {
          /* ignore */
        }
      }
      if (!isWebRuntime) {
        void applyNativeCallSpeakerRoute(next);
      }
      return next;
    });
  }, []);

  const endCall = useCallback(() => {
    if (callState === 'ringing' && role === 'caller') {
      finishCall('cancelled');
      return;
    }
    finishCall('ended');
  }, [callState, role, finishCall]);

  const emitCallRelay = useCallback(
    (event: string, extra: Record<string, unknown>) => {
      if (!otherUserId || !myUserId) return;
      void socketService.ensureConnectedEmit(event, {
        callId: callIdRef.current,
        fromUserId: myUserId,
        toUserId: otherUserId,
        ...extra,
      });
    },
    [otherUserId, myUserId],
  );

  const pushFloatingReaction = useCallback((emoji: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setFloatingReactions((prev) => [...prev, { id, emoji }]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((x) => x.id !== id));
    }, 3200);
  }, []);

  useEffect(() => {
    if (!otherUserId || !myUserId) return;
    const offR = socketService.on(
      'call:reaction',
      (p: { callId?: string; fromUserId?: string; emoji?: string }) => {
        if (!p?.emoji || p.callId !== callIdRef.current || p.fromUserId !== otherUserId) return;
        pushFloatingReaction(p.emoji);
      },
    );
    const offH = socketService.on(
      'call:raise_hand',
      (p: { callId?: string; fromUserId?: string; raised?: boolean }) => {
        if (p?.callId !== callIdRef.current || p.fromUserId !== otherUserId) return;
        setPeerRaisedHand(!!p.raised);
      },
    );
    const offS = socketService.on(
      'call:screen_share',
      (p: { callId?: string; fromUserId?: string; active?: boolean }) => {
        if (p?.callId !== callIdRef.current || p.fromUserId !== otherUserId) return;
        setPeerScreenSharing(!!p.active);
      },
    );
    const offU = socketService.on(
      'call:upgrade',
      (p: { callId?: string; fromUserId?: string; active?: boolean }) => {
        if (p?.callId !== callIdRef.current || p.fromUserId !== otherUserId) return;
        if (p.active) {
          setErrorMsg(null);
          isVideoCallRef.current = true;
          setIsVideoCall(true);
        }
      },
    );
    return () => {
      offR();
      offH();
      offS();
      offU();
    };
  }, [otherUserId, myUserId, pushFloatingReaction]);

  useEffect(() => {
    if (callState !== 'connected') return;
    const tick = () => {
      const pc = pcRef.current as RTCPeerConnection | null;
      if (!pc?.getStats) return;
      void pc.getStats().then((report) => {
        const q = connectionQualityFromRtcStatsReport(report);
        setConnectionDisplay({
          labelFr: q.labelFr,
          bars: q.bars,
          quality: q.quality,
        });
        logCallPhase(callIdRef.current, 'stats', {
          quality: q.quality,
          labelFr: q.labelFr,
        });
      });
    };
    tick();
    const id = setInterval(tick, 2500);
    return () => clearInterval(id);
  }, [callState]);

  const replaceLocalVideoTrack = useCallback(
    async (videoConstraints: MediaTrackConstraints) => {
      const mediaDevicesImpl = resolveWebRtcMediaDevices();
      if (!mediaDevicesImpl?.getUserMedia || !pcRef.current || !localStreamRef.current) return false;
      const camOnly = await mediaDevicesImpl.getUserMedia({ video: videoConstraints, audio: false });
      const newVt = camOnly.getVideoTracks()[0];
      const local = localStreamRef.current as MediaStream;
      const oldVt = local.getVideoTracks()[0];
      const sender = (pcRef.current as RTCPeerConnection)
        .getSenders()
        .find((s) => s.track?.kind === 'video');
      if (!sender || !newVt) {
        camOnly.getTracks().forEach((t) => t.stop());
        return false;
      }
      await sender.replaceTrack(newVt);
      if (oldVt) {
        local.removeTrack(oldVt);
        oldVt.stop();
      }
      local.addTrack(newVt);
      activeVideoDeviceIdRef.current = readVideoDeviceIdFromStream(local);
      if (isWebRuntime) {
        bindWebRtcMediaElement(localVideoElRef.current, local, { force: true });
        setLocalStreamKey((k) => k + 1);
      } else if ((local as MediaStream & { toURL?: () => string }).toURL) {
        setLocalStreamUrl((local as MediaStream & { toURL: () => string }).toURL());
        setLocalStreamKey((k) => k + 1);
      }
      return true;
    },
    [],
  );

  const restoreCameraTrack = useCallback(async () => {
    const selection = {
      deviceId: activeVideoDeviceIdRef.current,
      facing: facingModeRef.current,
    };
    await replaceLocalVideoTrack(buildCameraVideoConstraints(selection, { isWeb: isWebRuntime }));
  }, [replaceLocalVideoTrack]);

  const flipCamera = useCallback(async () => {
    const mediaDevicesImpl = resolveWebRtcMediaDevices();
    const result = await executeCameraFlip({
      isWeb: isWebRuntime,
      stream: localStreamRef.current as MediaStream | null,
      mediaDevices: mediaDevicesImpl ?? ({} as MediaDevices),
      currentFacing: facingModeRef.current,
      currentDeviceId: activeVideoDeviceIdRef.current,
      replaceVideoTrack: (constraints) => {
        if (!isVideoCall || !pcRef.current || !localStreamRef.current) {
          return Promise.resolve(false);
        }
        return replaceLocalVideoTrack(constraints);
      },
    });

    if (result.ok) {
      facingModeRef.current = result.facing;
      setLocalFacing(result.facing);
      activeVideoDeviceIdRef.current = readVideoDeviceIdFromStream(localStreamRef.current as MediaStream);
      setLocalStreamKey((k) => k + 1);
      return;
    }

    if (result.reason === 'unavailable') {
      Alert.alert('Caméra', 'Caméra indisponible.');
      return;
    }
    if (result.reason === 'single_camera') {
      Alert.alert('Caméra', 'Une seule caméra disponible sur cet appareil.');
      return;
    }
    Alert.alert('Caméra', 'Impossible de changer de caméra sur cet appareil.');
  }, [isVideoCall, replaceLocalVideoTrack]);

  const toggleScreenShare = useCallback(async () => {
    if (!isVideoCall) {
      Alert.alert('Partage d’écran', 'Réservé aux appels vidéo.');
      return;
    }
    if (!isWebRuntime) {
      return;
    }
    if (!pcRef.current || !localStreamRef.current) return;

    if (localScreenSharing) {
      setScreenShareLoading(true);
      try {
        screenShareDisplayStreamRef.current?.getTracks().forEach((t) => t.stop());
        screenShareDisplayStreamRef.current = null;
        await restoreCameraTrack();
        setLocalScreenSharing(false);
        emitCallRelay('call:screen_share', { active: false });
      } finally {
        setScreenShareLoading(false);
        setMoreMenuOpen(false);
      }
      return;
    }

    setScreenShareLoading(true);
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const v = display.getVideoTracks()[0];
      if (!v) throw new Error('NO_VIDEO_TRACK');
      v.onended = () => {
        void (async () => {
          screenShareDisplayStreamRef.current?.getTracks().forEach((t) => t.stop());
          screenShareDisplayStreamRef.current = null;
          try {
            await restoreCameraTrack();
            setLocalScreenSharing(false);
            emitCallRelay('call:screen_share', { active: false });
          } catch {
            /* ignore */
          }
        })();
      };
      screenShareDisplayStreamRef.current = display;
      const local = localStreamRef.current as MediaStream;
      const oldVt = local.getVideoTracks()[0];
      const sender = (pcRef.current as RTCPeerConnection).getSenders().find((s) => s.track?.kind === 'video');
      if (!sender) return;
      await sender.replaceTrack(v);
      if (oldVt) {
        local.removeTrack(oldVt);
        oldVt.stop();
      }
      local.addTrack(v);
      if (isWebRuntime) {
        bindWebRtcMediaElement(localVideoElRef.current, local, { force: true, allowPendingTracks: true });
      }
      setLocalScreenSharing(true);
      emitCallRelay('call:screen_share', { active: true });
      setMoreMenuOpen(false);
    } catch {
      Alert.alert('Partage d’écran', 'Autorisez le partage d’écran ou réessayez.');
    } finally {
      setScreenShareLoading(false);
    }
  }, [isVideoCall, localScreenSharing, restoreCameraTrack, emitCallRelay]);

  const bindRemoteVideoEl = useCallback((el: HTMLVideoElement | null) => {
    remoteVideoElRef.current = el;
    if (!el) return;
    bindWebRtcMediaElement(el, remoteStreamRef.current as MediaStream | null, {
      allowPendingTracks: true,
    });
  }, []);

  const statusLine = useMemo(
    () =>
      formatCallStatusLine({
        hasWebRtcSupport: isWebRuntime || Boolean(nativeWebRTC),
        errorMsg,
        callState,
        durationSeconds: duration,
        role,
        peerOnline,
        answered: peerAnswered,
      }),
    [callState, duration, errorMsg, role, peerOnline, peerAnswered],
  );

  const onMinimizeHint = useCallback(() => {
    Alert.alert('Appel', 'Pour terminer l’appel, utilisez le bouton rouge.');
  }, []);

  const toggleVideoLayoutFocus = useCallback(() => {
    setVideoLayoutFocus((prev) => (prev === 'remote' ? 'local' : 'remote'));
  }, []);

  /**
   * Vidéo distante affichée seulement quand le média WebRTC bidirectionnel est prêt
   * (audio + vidéo) — évite un faux « connecté » avec seulement l’audio.
   */
  const remoteVideoLive = callState === 'connected';
  /** Quand le distant n'est pas encore là, MA caméra prend tout l'écran. */
  const selfFullScreen = !remoteVideoLive;
  const peerVideoFullscreen = remoteVideoLive && videoLayoutFocus === 'remote';
  const hasRemoteVideoReady = remoteVideoLive;
  const showRemoteWaitingOverlay = !remoteVideoLive;

  const openAddPeople = useCallback(() => {
    if (!otherUserId) return;
    router.push({
      pathname: '/messages/call-add-people',
      params: {
        callId: callIdRef.current,
        otherUserId,
        type: isVideoCall ? 'video' : 'audio',
      },
    } as never);
  }, [otherUserId, isVideoCall]);

  const isWeb = isWebRuntime;

  /** RTCView distant uniquement après média confirmé — évite crash natif en sonnerie / teardown. */
  const showNativeRemoteRtc =
    !isWeb &&
    !nativeRtcUnmounting &&
    callState === 'connected' &&
    isValidNativeRtcStreamUrl(remoteStreamUrl, { localUrl: localStreamUrl });
  const showNativeLocalRtc =
    !isWeb &&
    !nativeRtcUnmounting &&
    callState !== 'ended' &&
    isValidNativeRtcStreamUrl(localStreamUrl);

  const dockIconColor = (active: boolean) => (active ? '#1a1a1a' : '#FFFFFF');

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      {isWeb && !isVideoCall
        ? createElement('audio', {
            ref: (el: HTMLAudioElement | null) => {
              remoteAudioElRef.current = el;
              if (!el) return;
              const playback =
                remotePlaybackStreamRef.current ?? (remoteStreamRef.current as MediaStream | null);
              remoteWebAudioPollRef.current = startRemoteWebAudioPlayback(
                el,
                playback,
                remoteWebAudioPollRef.current,
              );
            },
            autoPlay: true,
            playsInline: true,
            preload: 'none',
            style: { display: 'none' },
          })
        : null}

      {/* Natif : RTCView caché pour l’audio distant — appels vocaux uniquement (évite double décodeur en vidéo). */}
      {showNativeRemoteRtc && !isVideoCall ? (
        <SafeNativeRtcView
          debugLabel="remote-audio"
          key={`remote-audio-${remoteStreamKey}`}
          streamURL={remoteStreamUrl}
          style={styles.hiddenRemoteRtc}
          objectFit="cover"
          zOrder={0}
        />
      ) : null}

      {/* Natif vidéo : secours audio si le RTCView vidéo ne route pas le son (Samsung/Xiaomi). */}
      {showNativeRemoteRtc && isVideoCall ? (
        <SafeNativeRtcView
          debugLabel="remote-audio-video-backup"
          key={`remote-audio-video-backup-${remoteStreamKey}`}
          streamURL={remoteStreamUrl}
          style={styles.hiddenRemoteRtcVideoBackup}
          objectFit="cover"
          zOrder={0}
        />
      ) : null}

      {!isVideoCall ? <CallWallpaperPattern /> : null}

      {/* Barre du haut — style WhatsApp */}
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={onMinimizeHint} style={styles.topIconHit} accessibilityLabel="Réduire">
          <Ionicons name="contract-outline" size={26} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.topTitleWrap}>
          <Text style={styles.topName} numberOfLines={1}>
            {name || 'Contact'}
          </Text>
          <Text style={styles.topStatus} numberOfLines={1}>
            {statusLine}
          </Text>
        </View>
        {isVideoCall ? (
          <View style={styles.topIconHit} />
        ) : (
          <TouchableOpacity onPress={openAddPeople} style={styles.topIconHit} accessibilityLabel="Ajouter">
            <Ionicons name="person-add-outline" size={26} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      {peerRaisedHand ? (
        <View style={styles.peerBanner}>
          <Ionicons name="hand-left" size={18} color="#FFF" />
          <Text style={styles.peerBannerText}>{name} a levé la main</Text>
        </View>
      ) : null}
      {peerScreenSharing ? (
        <View style={[styles.peerBanner, styles.peerBannerAlt]}>
          <Ionicons name="desktop-outline" size={18} color="#FFF" />
          <Text style={styles.peerBannerText}>{name} partage son écran</Text>
        </View>
      ) : null}

      {isVideoCall ? (
        <View style={styles.videoBackground}>
          {/* Flux distant — toujours monté (audio web) ; taille = plein écran ou PiP */}
          <View
            style={peerVideoFullscreen ? styles.videoLayerFull : styles.videoLayerPip}
            pointerEvents={peerVideoFullscreen ? 'none' : 'box-none'}
          >
            {isWeb ? (
              <View style={StyleSheet.absoluteFill}>
                {createElement('video', {
                  ref: bindRemoteVideoEl,
                  playsInline: true,
                  muted: false,
                  preload: 'none',
                  style: {
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    background: '#0b111d',
                  },
                })}
                {showRemoteWaitingOverlay && peerVideoFullscreen ? (
                  <View style={[styles.videoPlaceholder, styles.videoPlaceholderOverlay]}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.videoPlaceholderText}>
                      {callState === 'ringing' ? 'En attente de réponse…' : 'Connexion vidéo…'}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : showNativeRemoteRtc ? (
              <View style={StyleSheet.absoluteFill}>
                <SafeNativeRtcView
                  debugLabel="remote-video"
                  key={`remote-video-${remoteStreamKey}`}
                  streamURL={remoteStreamUrl}
                  style={styles.nativeVideoFill}
                  objectFit="cover"
                  zOrder={0}
                  zOrderMediaOverlay={Platform.OS === 'android'}
                />
                {showRemoteWaitingOverlay && peerVideoFullscreen ? (
                  <View style={[styles.videoPlaceholder, styles.videoPlaceholderOverlay]}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.videoPlaceholderText}>
                      {callState === 'ringing' ? 'En attente de réponse…' : 'Connexion vidéo…'}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={[styles.videoPlaceholder, !peerVideoFullscreen && styles.videoPlaceholderPip]}>
                {!peerVideoFullscreen ? (
                  <Image source={{ uri: peerAvatarUri }} style={styles.pipAvatar} />
                ) : (
                  <>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.videoPlaceholderText}>Connexion vidéo…</Text>
                  </>
                )}
              </View>
            )}
            {!peerVideoFullscreen ? (
              <Pressable
                style={styles.pipTapTarget}
                onPress={toggleVideoLayoutFocus}
                accessibilityLabel="Agrandir la vidéo du correspondant"
                accessibilityRole="button"
              />
            ) : null}
          </View>

          <View style={[styles.videoSideTools, { top: insets.top + 56 }]}>
            <TouchableOpacity style={styles.sideToolBtn} onPress={openAddPeople} accessibilityLabel="Ajouter">
              <Ionicons name="person-add" size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.sideToolBtn} onPress={() => void flipCamera()} accessibilityLabel="Caméra">
              <Ionicons name="camera-reverse-outline" size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sideToolBtn}
              onPress={() => setEffectsModalOpen(true)}
              accessibilityLabel="Effets"
            >
              <Ionicons name="color-wand-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View
            style={peerVideoFullscreen ? styles.videoLayerPip : styles.videoLayerFull}
            pointerEvents={peerVideoFullscreen ? 'box-none' : 'none'}
          >
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              {!cameraOff && (isWeb || showNativeLocalRtc) ? (
                isWeb ? (
                  createElement('video', {
                    key: `local-web-video-${localStreamKey}`,
                    ref: (el: HTMLVideoElement | null) => {
                      localVideoElRef.current = el;
                      bindWebRtcMediaElement(el, localStreamRef.current as MediaStream | null, {
                        allowPendingTracks: true,
                      });
                    },
                    playsInline: true,
                    muted: true,
                    preload: 'none',
                    style: {
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: localFacing === 'user' ? 'scaleX(-1)' : 'none',
                    },
                  })
                ) : (
                  <SafeNativeRtcView
                    debugLabel="local-video"
                    key={`local-video-${localStreamKey}`}
                    streamURL={localStreamUrl}
                    style={styles.nativeVideoFill}
                    objectFit="cover"
                    mirror={nativeLocalVideoMirror(localFacing)}
                    zOrderMediaOverlay
                  />
                )
              ) : (
                <Image source={{ uri: myAvatarUri }} style={styles.selfViewImage} />
              )}
            </View>
              {pipEffect !== 'none' ? (
                <View
                  style={[StyleSheet.absoluteFill, { backgroundColor: PIP_EFFECT_LAYER[pipEffect] }]}
                  pointerEvents="none"
                />
              ) : null}
              {peerVideoFullscreen ? (
                <TouchableOpacity
                  style={styles.pipFlipHit}
                  onPress={() => void flipCamera()}
                  accessibilityLabel="Changer de caméra"
                >
                  <Ionicons name="camera-reverse-outline" size={18} color="#FFF" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.pipFlipHit, styles.pipFlipHitFullscreen]}
                  onPress={() => void flipCamera()}
                  accessibilityLabel="Changer de caméra"
                >
                  <Ionicons name="camera-reverse-outline" size={22} color="#FFF" />
                </TouchableOpacity>
              )}
              {peerVideoFullscreen ? (
                <Pressable
                  style={styles.pipTapTarget}
                  onPress={toggleVideoLayoutFocus}
                  accessibilityLabel="Agrandir ma caméra"
                  accessibilityRole="button"
                />
              ) : null}
            </View>
        </View>
      ) : (
        <View style={styles.audioStage}>
          <View style={styles.avatarRingWrap}>
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  transform: [{ scale: pulseAnim }],
                  opacity: callState === 'ringing' ? 0.35 : 0,
                },
              ]}
            />
            <Image source={{ uri: peerAvatarUri }} style={styles.callerAvatar} />
          </View>
        </View>
      )}

      {/* Dock inférieur façon WhatsApp : … | vidéo | haut-parleur | micro | puis raccrocher */}
      <View style={styles.bottomDock}>
        <View style={styles.dockPill}>
          <TouchableOpacity
            style={styles.dockCircle}
            onPress={() => setMoreMenuOpen(true)}
            accessibilityLabel="Plus d’options"
          >
            <Ionicons name="ellipsis-horizontal" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.dockCircle,
              !isVideoCall && !videoUpgradeLoading && styles.dockCircleMuted,
              isVideoCall && cameraOff && styles.dockCircleMuted,
            ]}
            onPress={isVideoCall ? toggleCamera : () => void upgradeCallToVideo()}
            disabled={videoUpgradeLoading}
            accessibilityLabel={isVideoCall ? 'Caméra' : 'Passer en vidéo'}
          >
            {videoUpgradeLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons
                name={isVideoCall ? (cameraOff ? 'videocam-off' : 'videocam') : 'videocam'}
                size={24}
                color="#FFF"
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dockCircle, speakerOn && styles.dockCircleOn]}
            onPress={toggleSpeaker}
            accessibilityLabel="Haut-parleur"
          >
            <Ionicons
              name={speakerOn ? 'volume-high' : 'volume-mute'}
              size={24}
              color={dockIconColor(speakerOn)}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dockCircle, muted && styles.dockCircleOn]}
            onPress={toggleMute}
            accessibilityLabel="Micro"
          >
            <Ionicons name={muted ? 'mic-off' : 'mic'} size={24} color={dockIconColor(muted)} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.endCallFab} onPress={endCall} accessibilityLabel="Raccrocher">
          <Ionicons name="call" size={30} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>

      {floatingReactions.length > 0 ? (
        <View style={styles.reactionOverlay} pointerEvents="none">
          {floatingReactions.map((fr) => (
            <Text key={fr.id} style={styles.reactionFloat}>
              {fr.emoji}
            </Text>
          ))}
        </View>
      ) : null}

      {isWeb && webMediaConsentNeeded ? (
        <View style={styles.webMediaConsentOverlay}>
          <View style={styles.webMediaConsentCard}>
            <Ionicons
              name={startedAsVideo ? 'videocam' : 'mic'}
              size={36}
              color={Colors.primary}
              style={styles.webMediaConsentIcon}
            />
            <Text style={styles.webMediaConsentTitle}>
              {startedAsVideo ? 'Micro et caméra requis' : 'Micro requis'}
            </Text>
            <Text style={styles.webMediaConsentBody}>
              {startedAsVideo
                ? 'Cliquez ci-dessous pour autoriser le micro et la caméra dans votre navigateur.'
                : 'Cliquez ci-dessous pour autoriser le micro dans votre navigateur.'}
            </Text>
            {webMediaConsentError ? (
              <Text style={styles.webMediaConsentError}>{webMediaConsentError}</Text>
            ) : webAudioProbe ? (
              <Text style={styles.webMediaConsentHint}>
                {webCallAudioProbeHint(webAudioProbe) ||
                  `Micro détecté (${webAudioProbe.inputCount} entrée${webAudioProbe.inputCount > 1 ? 's' : ''}).`}
              </Text>
            ) : null}
            {createElement(
              'button',
              {
                type: 'button',
                disabled: webMediaConsentLoading,
                onClick: grantWebMediaConsent,
                'aria-label': startedAsVideo ? 'Autoriser micro et caméra' : 'Autoriser le micro',
                style: {
                  backgroundColor: Colors.primary,
                  border: 'none',
                  borderRadius: 12,
                  padding: '14px 20px',
                  minWidth: 220,
                  color: '#FFF',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: webMediaConsentLoading ? 'wait' : 'pointer',
                  opacity: webMediaConsentLoading ? 0.75 : 1,
                },
              },
              webMediaConsentLoading
                ? 'Autorisation…'
                : startedAsVideo
                  ? 'Autoriser et appeler'
                  : 'Autoriser le micro',
            )}
            {!startedAsVideo && (webMediaConsentError || webAudioProbe?.inputCount === 0) ? (
              createElement(
                'button',
                {
                  type: 'button',
                  disabled: webMediaConsentLoading,
                  onClick: grantWebListenOnlyConsent,
                  'aria-label': 'Continuer en écoute seule sans micro',
                  style: {
                    backgroundColor: 'transparent',
                    border: `1px solid ${Colors.border}`,
                    borderRadius: 12,
                    padding: '12px 20px',
                    minWidth: 220,
                    marginTop: 12,
                    color: Colors.textSecondary,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: webMediaConsentLoading ? 'wait' : 'pointer',
                  },
                },
                'Continuer en écoute seule (sans micro)',
              )
            ) : null}
          </View>
        </View>
      ) : null}

      <CallMoreOptionsSheet
        visible={moreMenuOpen}
        onClose={() => setMoreMenuOpen(false)}
        connectionLabel={connectionDisplay.labelFr}
        connectionBars={connectionDisplay.bars}
        connectionQuality={connectionDisplay.quality}
        myRaisedHand={myRaisedHand}
        onToggleRaiseHand={() => {
          setMyRaisedHand((r) => {
            const next = !r;
            emitCallRelay('call:raise_hand', { raised: next });
            return next;
          });
        }}
        onPickReaction={(emoji) => {
          if (!ALLOWED_CALL_REACTIONS.has(emoji)) return;
          emitCallRelay('call:reaction', { emoji });
          pushFloatingReaction(emoji);
          setMoreMenuOpen(false);
        }}
        onShareScreen={() => void toggleScreenShare()}
        showScreenShare={isWebRuntime && isVideoCall}
        onOpenMessageComposer={() => {
          setMoreMenuOpen(false);
          setMessageModalOpen(true);
        }}
        screenShareLoading={screenShareLoading}
      />

      <CallDuringMessageModal
        visible={messageModalOpen}
        onClose={() => setMessageModalOpen(false)}
        otherUserId={otherUserId}
        peerName={name}
      />

      <Modal
        visible={effectsModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEffectsModalOpen(false)}
      >
        <View style={styles.fxRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEffectsModalOpen(false)} />
          <View style={styles.fxSheet}>
            <Text style={styles.fxTitle}>Effets (votre aperçu)</Text>
            <Text style={styles.fxHint}>S’appliquent à votre caméra locale uniquement.</Text>
            <View style={styles.fxChips}>
              {(
                [
                  { key: 'none' as const, label: 'Aucun' },
                  { key: 'soft' as const, label: 'Clair' },
                  { key: 'warm' as const, label: 'Chaud' },
                  { key: 'cool' as const, label: 'Froid' },
                ]
              ).map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.fxChip, pipEffect === key && styles.fxChipOn]}
                  onPress={() => {
                    setPipEffect(key);
                    setEffectsModalOpen(false);
                  }}
                >
                  <Text style={[styles.fxChipText, pipEffect === key && styles.fxChipTextOn]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.fxClose} onPress={() => setEffectsModalOpen(false)}>
              <Text style={styles.fxCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function CallScreen() {
  return (
    <CallScreenErrorBoundary>
      <CallScreenInner />
    </CallScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B141A' },
  webMediaConsentOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    backgroundColor: 'rgba(11, 20, 26, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  webMediaConsentCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1F2C34',
    borderRadius: 16,
    paddingHorizontal: 22,
    paddingVertical: 24,
    alignItems: 'center',
  },
  webMediaConsentIcon: { marginBottom: 12 },
  webMediaConsentTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  webMediaConsentBody: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 12,
  },
  webMediaConsentHint: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  webMediaConsentError: {
    color: '#FFB4B4',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  /** Lecture audio distante — taille minimale visible pour Android (1×1 px = silence sur certains devices). */
  hiddenRemoteRtc: {
    position: 'absolute',
    width: 48,
    height: 48,
    opacity: 0.01,
    bottom: 0,
    left: 0,
    zIndex: 0,
  },
  /** Appel vidéo : secours audio si le RTCView vidéo distant ne route pas le son. */
  hiddenRemoteRtcVideoBackup: {
    position: 'absolute',
    width: 48,
    height: 48,
    opacity: 0.01,
    bottom: 0,
    right: 0,
    zIndex: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
    zIndex: 20,
  },
  topIconHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitleWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  topName: { color: '#FFF', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  topStatus: { color: 'rgba(255,255,255,0.72)', fontSize: 14, marginTop: 2, textAlign: 'center' },
  audioStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  videoBackground: {
    flex: 1,
    width,
    backgroundColor: '#101822',
    position: 'relative',
  },
  videoLayerFull: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    backgroundColor: '#101822',
  },
  videoLayerPip: {
    position: 'absolute',
    bottom: 200,
    right: 16,
    width: 112,
    height: 158,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: '#000',
    zIndex: 12,
  },
  videoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 280 },
  videoPlaceholderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16,24,34,0.88)',
    minHeight: 0,
  },
  videoPlaceholderPip: { minHeight: 0, padding: 8 },
  pipAvatar: { width: '100%', height: '100%', borderRadius: 12 },
  videoPlaceholderText: { color: 'rgba(255,255,255,0.55)', fontSize: 14, marginTop: 12 },
  nativeVideoFill: { width: '100%', height: '100%' },
  videoSideTools: {
    position: 'absolute',
    right: 12,
    zIndex: 15,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  sideToolBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipFlipHit: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 14,
  },
  pipFlipHitFullscreen: {
    top: undefined,
    bottom: 200,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  pipTapTarget: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 13,
  },
  selfViewImage: { width: '100%', height: '100%' },
  avatarRingWrap: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  callerAvatar: { width: 148, height: 148, borderRadius: 74, borderWidth: 3, borderColor: 'rgba(255,255,255,0.22)' },
  bottomDock: {
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 20,
    zIndex: 20,
  },
  dockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    backgroundColor: 'rgba(22,35,46,0.92)',
    borderRadius: 36,
    paddingVertical: 14,
    paddingHorizontal: 22,
    marginBottom: 18,
  },
  dockCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockCircleOn: {
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  dockCircleMuted: {
    opacity: 0.45,
  },
  endCallFab: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  peerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 19,
  },
  peerBannerAlt: {
    backgroundColor: 'rgba(27,94,32,0.55)',
  },
  peerBannerText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  reactionOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 260,
    alignItems: 'center',
    zIndex: 18,
    gap: 10,
  },
  reactionFloat: {
    fontSize: 52,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  fxRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fxSheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1c252e',
    borderRadius: 14,
    padding: 18,
    zIndex: 2,
  },
  fxTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  fxHint: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 6, marginBottom: 14 },
  fxChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fxChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fxChipOn: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  fxChipText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  fxChipTextOn: { color: Colors.primary },
  fxClose: { marginTop: 16, alignSelf: 'center' },
  fxCloseText: { color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: '600' },
});
