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
  Linking,
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
  attachLocalTracksToPeerConnection,
  prepareNativeAudioCallerOffer,
  recoverNativeAudioOfferMedia,
  CALL_NATIVE_AUDIO_FIX_TAG,
  buildCallVideoConstraints,
  callMediaErrorMessage,
  ensureLocalAudioTracksEnabled,
  enableRemoteAudioTracks,
  peerConnectionHasActiveAudioSender,
  summarizePeerConnectionForOffer,
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
import {
  connectionQualityFromRtcStatsReport,
  iceSelectedCandidateFromRtcStatsReport,
  rtpMediaStatsFromRtcStatsReport,
  transportStatsFromRtcStatsReport,
  classifyConnectedCallMediaVerdict,
} from '../../src/call/webrtcConnectionQuality';
import {
  buildCallIceConfig,
  callConnectionWatchdogMs,
  callMediaReadyHintMs,
  prepareIceServersForPlatform,
  pickVideoProfileForNetwork,
  pickVoiceOpusBitrateForNetwork,
  nativeRtcBindRetryAttempts,
  resolveIceNetworkSnapshot,
  shouldBlockCellularWithoutTurn,
  shouldBlockNativeCellularWithoutTlsTurn,
  shouldForceTurnRelay,
  type NetworkSnapshot,
  type VideoQualityProfile as NetVideoQualityProfile,
} from '../../src/call/callNetworkConfig';
import { parseTurnCredentialsResponse } from '../../src/call/parseTurnCredentialsResponse';
import {
  getPrefetchedTurnCredentials,
  prefetchTurnCredentials,
} from '../../src/call/prefetchTurnCredentials';
import { formatCallStatusLine } from '../../src/call/callStatusLine';
import {
  peerConnectionHasLocalOffer,
  shouldArmMediaConnectionWatchdog,
  shouldClearCallerRingTimeoutOnAccept,
  shouldFinishCallAsMissed,
  shouldDowngradeVideoInviteToAudioAnswer,
  shouldRecoverStalledConnectedCallMedia,
  shouldIceRestartFromConnectedMediaVerdict,
  shouldResendCallerOffer,
  shouldSendCallerOfferAfterInvite,
} from '../../src/call/callAcceptLifecycle';
import {
  CALLER_BOOTSTRAP_POLL_MS,
  CALLER_OFFER_MAX_RETRIES,
  CALLER_OFFER_RETRY_MS,
  callerBootstrapMaxWaitPolls,
  chainCallerOfferTask,
  isCallerOfferNegotiationLocked,
  shouldAttemptCallerOfferMediaRecovery,
  shouldCountCallerOfferRetryAttempt,
  shouldCreateCallerOffer,
  shouldDeferConnectionWatchdogIceRestart,
  shouldDeferIceRestartOffer,
  shouldFailCallerAfterOfferRetries,
  shouldIgnoreInboundCallEnd,
  shouldIgnoreNegotiationNeeded,
  shouldMutateCallerMediaForOffer,
  shouldRetryCallerOfferAfterAccept,
  shouldSkipCallerOfferMediaSetup,
} from '../../src/call/callCallerOffer';
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
import { CallIceOutbox } from '../../src/call/callIceOutbox';
import { decideIceGatheringWaitWithBuffer, buildOutboundSdpWithEmbeddedIce, shouldAwaitIceBeforeOutboundSdp, shouldAwaitMinimalIceBeforeAnswerEmbed, minimalIceGatherReady, MINIMAL_ANSWER_ICE_WAIT_MS, MINIMAL_ANSWER_ICE_POLL_MS } from '../../src/call/callSdpIceEmbed';
import { shouldRefreshNativeRemoteAudioPlayback } from '../../src/call/callNativeRemotePlayback';
import {
  CALL_NATIVE_STREAM_GUARD_TAG,
  safeAudioTrackCount,
  safeVideoTrackCount,
  shouldRunDeferredCallMediaNudge,
} from '../../src/call/callStreamTracks';
import { sdpCandidateCounts } from '../../src/call/callIceGathering';
import {
  optimizeCallAudioPipeline,
  pruneRedundantCallTransceivers,
  setTunedLocalDescription,
  shouldOptimizeCallAudioBeforeFirstNegotiation,
} from '../../src/call/callAudioQuality';
import { logCallPhase, sdpContainsMedia } from '../../src/call/callDebug';
import { logCallExit } from '../../src/call/callCallExit';
import {
  logAfwCall,
  logCallEndEmit,
  logCallEndReceived,
  logCreateAnswer,
  logCreateOffer,
  logPreCreateOfferPeerConnection,
  logDebugTransceiversBeforeSetLocal,
  logPatchAudioFixActive,
  logNativeStreamNullGuardActive,
  logIceLocal,
  logIceRemote,
  logIceRemoteApplied,
  logIceQueued,
  logIceFlushPending,
  logPeerConnectionStates,
  readPeerConnectionStates,
  parseIceCandidateMeta,
  logSdpReceived,
  logSdpSend,
  logRemoteStreamReceived,
  logRemoteTrackReceived,
  logRemoteRtcBindSkipped,
  logRemoteMediaAudit,
  logIceSelectedCandidate,
  logRtpMediaStats,
  logCallTransportStats,
  logCallMediaVerdict,
  logSetLocalDescription,
  logSetRemoteDescription,
  logAnswerSendStart,
  logAnswerSendSuccess,
  logAnswerSendError,
  logAnswerRx,
  logSetRemoteAnswerStart,
  logSetRemoteAnswerSuccess,
  logSetRemoteAnswerError,
  summarizeCallSdp,
} from '../../src/call/callDiagnosticLog';
import {
  bindWebRtcMediaElement,
  clearWebRtcMediaElement,
  startRemoteWebAudioPlayback,
} from '../../src/call/callWebAudioPlayback';
import {
  auditPeerConnectionMedia,
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
  receiverTracksBindingKey,
  shouldBindNativeRemoteStreamUrl,
  shouldMarkCallConnected,
  shouldRefreshNativeRemoteRtcView,
  shouldReplaceNativeRemoteMediaStream,
  shouldSyncRemoteReceiverTracks,
  streamHasLiveAudio,
  streamHasAudibleRemoteAudio,
  streamHasLiveVideo,
  streamHasRemoteVideoTrack,
  streamHasRenderableRemoteVideo,
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
import {
  isValidNativeRtcStreamUrl,
  shouldShowNativeRemoteAudioRtc,
  shouldShowNativeRemoteVideoAudioBackup,
  shouldShowNativeRemoteVideoRtc,
} from '../../src/call/callRtcStreamUrl';
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
/** Half-trickle ICE : attente max d'un candidat relay avant émission SDP. */
const HALF_TRICKLE_MAX_WAIT_MS = 3_000;
/** TURN + latence Maroc↔Mali — laisser le temps au candidat relay (audit juin 2026). */
const HALF_TRICKLE_MAX_WAIT_MS_TURN = 12_000;
const HALF_TRICKLE_POLL_MS = 150;
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
  /**
   * Vidéo distante réellement décodée (preuve getStats `framesDecoded` > 0).
   * Signal fiable sur react-native-webrtc, contrairement à `track.muted` qui
   * reste souvent `true` côté Android même quand les frames peignent.
   */
  const [remoteVideoDecoding, setRemoteVideoDecoding] = useState(false);
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
  /** Récupération média post-connexion (Maroc↔Mali) : suivi des octets reçus / stagnation. */
  const lastInboundCallBytesRef = useRef<number | null>(null);
  const inboundMediaStallSinceRef = useRef<number | null>(null);
  const postConnectedMediaRecoveryDoneRef = useRef(false);
  const voiceBitrateRef = useRef(32_000);
  const iceNetSnapshotRef = useRef<NetworkSnapshot>({ type: 'unknown' });

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
  /** Candidats locaux `onicecandidate` — Android/iOS ne les met pas toujours dans localDescription.sdp. */
  const localGatheredIceRef = useRef<RTCIceCandidateInit[]>([]);
  const turnConfiguredRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const callStateRef = useRef(callState);
  const finishingRef = useRef(false);
  const [remoteStreamUrl, setRemoteStreamUrl] = useState<string>('');
  /** Démonte RTCView avant fermeture PC — évite crash process Android/iOS. */
  const [nativeRtcUnmounting, setNativeRtcUnmounting] = useState(false);
  const [localStreamUrl, setLocalStreamUrl] = useState<string>('');
  const [localStreamKey, setLocalStreamKey] = useState(0);
  const [remoteStreamKey, setRemoteStreamKey] = useState(0);
  /** Dernier bind RTCView distant — détecte vidéo ajoutée après bind audio-only. */
  const remoteRtcBindRef = useRef({ bindingKey: '', videoCount: 0, url: '' });
  const nativeRemoteRtcRebindTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pcTearingDownRef = useRef(false);
  const mediaStoppedRef = useRef(false);
  const mediaTeardownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Évite une double offre SDP si `call:accept` est reçu deux fois. */
  const callerOfferSentRef = useRef(false);
  const callerOfferResendCountRef = useRef(0);
  /** PC + getUserMedia + pistes attachées — évite caller_offer_retries_exhausted si accept rapide. */
  const callerBootstrapReadyRef = useRef(false);
  /** Micro attaché une fois au bootstrap — ne pas re-muter le PC à accept_rx. */
  const callerLocalTracksAttachedRef = useRef(false);
  /** Dernière raison d'échec envoi offre — inclus dans [AFW_CALL_EXIT] si retries épuisés. */
  const lastCallerOfferAbortRef = useRef<string | null>(null);
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

  useEffect(() => {
    void prefetchTurnCredentials();
  }, []);

  useFocusEffect(
    useCallback(() => {
      prepareCallSessionMemory();
      return () => {
        releaseCallSessionMemory();
      };
    }, []),
  );

  /** Démonte RTCView + annule timers avant `pc.close()` — crash Android/iOS sinon. */
  const prepareNativeRtcViewUnmount = useCallback(() => {
    pcTearingDownRef.current = true;
    if (nativeRemoteRtcRebindTimerRef.current) {
      clearTimeout(nativeRemoteRtcRebindTimerRef.current);
      nativeRemoteRtcRebindTimerRef.current = null;
    }
    if (!isWebRuntime) {
      setNativeRtcUnmounting(true);
      setLocalStreamUrl('');
      setRemoteStreamUrl('');
      setRemoteStreamKey((k) => k + 1);
    }
  }, []);

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
    remoteRtcBindRef.current = { bindingKey: '', videoCount: 0, url: '' };
    if (nativeRemoteRtcRebindTimerRef.current) {
      clearTimeout(nativeRemoteRtcRebindTimerRef.current);
      nativeRemoteRtcRebindTimerRef.current = null;
    }
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
    (
      reason: 'ended' | 'failed' | 'declined' | 'cancelled' | 'missed' = 'ended',
      exitSource?: string,
    ) => {
      if (finishingRef.current || callStateRef.current === 'ended') return;
      finishingRef.current = true;
      logCallExit(reason, {
        callId: callIdRef.current,
        role,
        callState: callStateRef.current,
        peerAccepted: peerAnsweredRef.current,
        callerBootstrapReady: callerBootstrapReadyRef.current,
        callerOfferSent: callerOfferSentRef.current,
        lastOfferAbort: lastCallerOfferAbortRef.current,
        ice: String((pcRef.current as RTCPeerConnection | null)?.iceConnectionState || ''),
        pcState: String((pcRef.current as RTCPeerConnection | null)?.connectionState || ''),
        signalingState: String((pcRef.current as RTCPeerConnection | null)?.signalingState || ''),
        hasRemoteSdp: Boolean((pcRef.current as RTCPeerConnection | null)?.remoteDescription),
        hasLocalSdp: Boolean((pcRef.current as RTCPeerConnection | null)?.localDescription),
        exitSource: exitSource ?? null,
      });
      const stateBeforeEnd = callStateRef.current;
      setPeerRaisedHand(false);
      setMyRaisedHand(false);
      setPeerScreenSharing(false);
      setLocalScreenSharing(false);
      prepareNativeRtcViewUnmount();
      setCallState('ended');
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
        const endPayload = {
          callId: callIdRef.current,
          fromUserId: myUserId,
          toUserId: otherUserId,
          endedBy: myUserId,
          reason: socketReason,
          durationSec: socketReason === 'completed' ? elapsed : 0,
        };
        logCallEndEmit({ ...endPayload, finishReason: reason, exitSource: exitSource ?? null });
        void socketService.ensureConnectedEmit('call:end', endPayload);
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
    [otherUserId, myUserId, scheduleStopAllMedia, role, user?.full_name, user?.username, prepareNativeRtcViewUnmount],
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
    if (!isWebRuntime) {
      logPatchAudioFixActive({
        phase: 'call_bootstrap',
        callId,
        tag: CALL_NATIVE_AUDIO_FIX_TAG,
        role,
        startedAsVideo,
      });
      logNativeStreamNullGuardActive({
        phase: 'call_bootstrap',
        callId,
        tag: CALL_NATIVE_STREAM_GUARD_TAG,
        role,
        startedAsVideo,
      });
    }

    prepareCallSessionMemory();
    socketService.joinUserRoom(myUserId);

    const peerPcState = (): string =>
      String((pcRef.current as RTCPeerConnection | null)?.connectionState || '');

    const peerIceState = (): string =>
      String((pcRef.current as RTCPeerConnection | null)?.iceConnectionState || '');

    const remoteSdpHasVideo = (): boolean | undefined => {
      const sdp = (pcRef.current as RTCPeerConnection | null)?.remoteDescription?.sdp;
      if (!sdp) return undefined;
      return sdpContainsMedia(sdp, 'video');
    };

    /** Relais TURN strict (Maroc↔Mali) — natif toujours ; web sur cellulaire/CGNAT. */
    const callForceTurnRelay = (): boolean =>
      shouldForceTurnRelay({
        turnConfigured: turnConfiguredRef.current,
        isWeb: isWebRuntime,
        net: iceNetSnapshotRef.current,
      });

    const applyLocalDescription = async (
      pc: RTCPeerConnection,
      desc: RTCSessionDescriptionInit,
    ): Promise<void> => {
      const localType = String(desc?.type || '').trim().toLowerCase();
      // Ne pas vider le buffer ICE avant answer — candidats déjà reçus via onicecandidate
      // après setRemoteDescription(offer). Régression : answer sans ICE → blocage des deux côtés.
      if (localType === 'offer' || localType === 'rollback') {
        localGatheredIceRef.current = [];
      }
      return setTunedLocalDescription(
        pc,
        desc,
        voiceBitrateRef.current,
        isWebRuntime,
        isWebRuntime ? undefined : RTCSessionDescriptionImpl,
      );
    };

    const applyRemoteTrack = (track: MediaStreamTrack | undefined, trackKind?: string) => {
      if (!track || track.readyState === 'ended') return;
      if (isTrackFromLocalCapture(track, localTrackIdsRef.current)) return;
      const pcNow = pcRef.current as RTCPeerConnection | null;
      if (!isWebRuntime && !pcNow?.remoteDescription) return;

      const unified = remoteStreamRef.current as MediaStream;
      mergeRemoteTrackIntoStream(unified as unknown as RemoteStreamUnified, track);
      remoteStreamRef.current = unified;

      logRemoteTrackReceived({
        callId: callIdRef.current,
        role,
        streamId: unified?.id,
        trackId: track.id,
        trackKind: track.kind,
        enabled: track.enabled,
        readyState: track.readyState,
        muted: (track as { muted?: boolean }).muted,
      });

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

    const commitNativeRemoteRtcBind = (
      stream: MediaStream,
      url: string,
      bindingKey: string,
      videoTrackCount: number,
      phase: string,
    ) => {
      remoteRtcBindRef.current = { bindingKey, videoCount: videoTrackCount, url };
      setRemoteStreamUrl(url);
      setRemoteStreamKey((k) => k + 1);
      logRemoteStreamReceived({
        callId: callIdRef.current,
        role,
        phase,
        streamId: stream.id,
        streamURL: url,
        audioTracks: safeAudioTrackCount(stream),
        videoTracks: videoTrackCount,
        bindingKey,
        callState: callStateRef.current,
      });
    };

    const bindNativeRemoteStreamToRtcView = (stream: MediaStream | null | undefined) => {
      if (!stream) return;
      if (
        shouldBlockNativeRtcUrlUpdate({
          tearingDown: pcTearingDownRef.current,
          callEnded: callStateRef.current === 'ended',
        })
      ) {
        return;
      }
      const pcNow = pcRef.current as RTCPeerConnection | null;
      if (
        !shouldBindNativeRemoteStreamUrl({
          isVideo: isVideoCallRef.current,
          stream,
          hasRemoteDescription: Boolean(pcNow?.remoteDescription),
          iceConnectionState: peerIceState(),
          peerConnectionState: peerPcState(),
          forceTurnRelay: callForceTurnRelay(),
        })
      ) {
        logRemoteRtcBindSkipped({
          callId: callIdRef.current,
          role,
          reason: 'should_bind_false',
          isVideo: isVideoCallRef.current,
          audioTracks: safeAudioTrackCount(stream),
          videoTracks: safeVideoTrackCount(stream),
        });
        return;
      }
      const localUrl = (localStreamRef.current as { toURL?: () => string } | null)?.toURL?.() || '';
      const url = (stream as { toURL?: () => string })?.toURL?.() || '';
      const videoTrackCount = safeVideoTrackCount(stream);
      const bindingKey = mediaStreamBindingKey(stream);
      const prev = remoteRtcBindRef.current;
      const mustRefresh = shouldRefreshNativeRemoteRtcView({
        isVideo: isVideoCallRef.current,
        prevBindingKey: prev.bindingKey,
        nextBindingKey: bindingKey,
        prevVideoCount: prev.videoCount,
        nextVideoCount: videoTrackCount,
      });

      if (!isValidNativeRtcStreamUrl(url, { localUrl })) {
        logRemoteRtcBindSkipped({
          callId: callIdRef.current,
          role,
          reason: !url ? 'url_empty' : url === localUrl ? 'url_equals_local' : 'url_invalid',
          streamURL: url,
          localStreamURL: localUrl,
          videoTracks: videoTrackCount,
          bindingKey,
        });
        if (!url) {
          bindNativeStreamUrlWithRetry(
            stream,
            (nextUrl) => {
              if (!shouldApplyNativeRtcUrl()) return;
              if (!isValidNativeRtcStreamUrl(nextUrl, { localUrl })) return;
              commitNativeRemoteRtcBind(stream, nextUrl, bindingKey, videoTrackCount, 'rtcview_bind_retry');
            },
            () => {
              if (!shouldApplyNativeRtcUrl()) return;
              setRemoteStreamKey((k) => k + 1);
            },
            nativeRtcBindRetryAttempts(iceNetSnapshotRef.current),
            shouldApplyNativeRtcUrl,
          );
        }
        return;
      }

      if (mustRefresh && prev.url === url) {
        if (nativeRemoteRtcRebindTimerRef.current) {
          clearTimeout(nativeRemoteRtcRebindTimerRef.current);
        }
        setRemoteStreamUrl('');
        setRemoteStreamKey((k) => k + 1);
        nativeRemoteRtcRebindTimerRef.current = setTimeout(() => {
          nativeRemoteRtcRebindTimerRef.current = null;
          if (!shouldApplyNativeRtcUrl()) return;
          commitNativeRemoteRtcBind(stream, url, bindingKey, videoTrackCount, 'rtcview_rebind');
        }, 48);
        return;
      }

      commitNativeRemoteRtcBind(stream, url, bindingKey, videoTrackCount, 'rtcview_bind');
    };

    /** Vocal natif : RTCView caché + volume + HP — sans ça, connexion OK mais silence. */
    const refreshNativeRemoteAudioPlayback = (
      source: string,
      pc: RTCPeerConnection | null,
    ) => {
      if (!pc) return;
      if (
        !shouldRefreshNativeRemoteAudioPlayback({
          isWebRuntime,
          pcTearingDown: pcTearingDownRef.current,
        })
      ) {
        return;
      }
      syncRemoteTracksFromPeerConnection(pc);
      const remote = remoteStreamRef.current as MediaStream | null;
      enableRemoteAudioTracks(remote);
      if (remotePlaybackStreamRef.current) {
        enableRemoteAudioTracks(remotePlaybackStreamRef.current);
      }
      bindNativeRemoteStreamToRtcView(remote);
      void applyNativeCallSpeakerRoute(speakerOnRef.current);
      void stopNativeOutgoingRingback();
      logCallPhase(callIdRef.current, 'native_remote_audio_refresh', {
        source,
        audioTracks: safeAudioTrackCount(remote),
      });
      logAfwCall('native_remote_audio_refresh', {
        callId: callIdRef.current,
        role,
        source,
      });
    };

    const setupRemoteEl = (stream: MediaStream | null | undefined, trackKind?: string) => {
      if (!stream) return;
      if (!shouldApplyNativeRtcUrl()) return;
      const pcNow = pcRef.current as RTCPeerConnection | null;
      if (!isWebRuntime && !pcNow?.remoteDescription) return;
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
        bindNativeRemoteStreamToRtcView(stream);
      }
      const pcLog = pcRef.current as RTCPeerConnection | null;
      if (isWebRuntime || Boolean(pcLog?.remoteDescription)) {
        logCallPhase(callId, 'remote_stream_updated', {
          trackKind,
          audioTracks: safeAudioTrackCount(stream),
          videoTracks: safeVideoTrackCount(stream),
          bindingKey: mediaStreamBindingKey(stream),
        });
      }
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
            forceTurnRelay: callForceTurnRelay(),
          })
        ) {
          return;
        }
        logCallPhase(callId, 'media_connected', {
          remoteAudio: streamHasAudibleRemoteAudio(remote) || streamHasLiveAudio(remote),
          remoteVideo: streamHasLiveVideo(remote),
        });
        /** Natif : resync + RTCView distant (vocal ET vidéo) — décodeur audio sans bind = silence. */
        if (!isWebRuntime && pc) {
          refreshNativeRemoteAudioPlayback('mark_call_connected', pc);
        }
        setErrorMsg(null);
        setCallState('connected');
        ensureLocalAudioTracksEnabled(localStreamRef.current as MediaStream | null);
        enableRemoteAudioTracks(remote);
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
          /* FGS déjà démarré au bootstrap — ne pas relancer (crash Notifee « no valid small icon »). */
        }
        void apiClient
          .post(`/calls/${encodeURIComponent(callIdRef.current)}/session-state`, { status: 'active' })
          .catch(() => {});
      } catch (e) {
        devWarn('[Call] markCallConnected failed', e);
        setErrorMsg('Connexion interrompue. Réessayez l’appel.');
        finishCall('failed', 'mark_call_connected');
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
          remoteSdpHasVideo: remoteSdpHasVideo(),
          forceTurnRelay: callForceTurnRelay(),
        })
      ) {
        return;
      }
      markCallConnected();
    };

    const syncRemoteTracksFromPeerConnection = (pc: RTCPeerConnection | null) => {
      if (!pc) return;
      if (!isWebRuntime && !shouldSyncRemoteReceiverTracks(pc)) return;
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

        logRemoteMediaAudit({
          callId,
          role,
          phase: 'sync_receivers',
          ...auditPeerConnectionMedia(pc),
          receiverTrackIds: tracks.map((t) => ({ id: t.id, kind: t.kind, readyState: t.readyState })),
        });

        const current = remoteStreamRef.current as MediaStream | null;
        const receiversHaveVideo = tracks.some((t) => t.kind === 'video');
        const currentHasVideo = (current?.getVideoTracks?.()?.length ?? 0) > 0;
        if (
          !shouldReplaceNativeRemoteMediaStream(current, tracks) &&
          current &&
          streamHasPlayableMediaTracks(current)
        ) {
          if (!(isVideoCallRef.current && receiversHaveVideo && !currentHasVideo)) {
            return;
          }
        }

        for (const track of tracks) {
          logRemoteTrackReceived({
            callId,
            role,
            streamId: current?.id,
            trackId: track.id,
            trackKind: track.kind,
            enabled: track.enabled,
            readyState: track.readyState,
            muted: (track as { muted?: boolean }).muted,
          });
        }

        const next = new nativeWebRTC.MediaStream();
        for (const track of tracks) {
          next.addTrack(track);
          track.onunmute = () => {
            syncRemoteTracksFromPeerConnection(pc);
            maybeMarkCallConnected(remoteStreamRef.current as MediaStream, track.kind);
          };
        }
        remoteStreamRef.current = next;
        logRemoteStreamReceived({
          callId,
          role,
          streamId: next.id,
          streamURL: (next as { toURL?: () => string }).toURL?.() || '',
          audioTracks: safeAudioTrackCount(next),
          videoTracks: safeVideoTrackCount(next),
          bindingKey: receiverTracksBindingKey(tracks),
        });
        const leadKind = tracks.find((t) => t.kind === 'video')?.kind ?? tracks[0]?.kind;
        setupRemoteEl(next, leadKind);
        maybeMarkCallConnected(next, leadKind);
        void optimizeCallAudioPipeline(pc, voiceBitrateRef.current);
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
            remoteSdpHasVideo: remoteSdpHasVideo(),
            forceTurnRelay: callForceTurnRelay(),
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

    const waitForCallerBootstrap = async (): Promise<boolean> => {
      const maxPolls = callerBootstrapMaxWaitPolls();
      for (let i = 0; i < maxPolls; i++) {
        if (cancelled) return false;
        if (callerBootstrapReadyRef.current && pcRef.current) return true;
        await new Promise((r) => setTimeout(r, CALLER_BOOTSTRAP_POLL_MS));
      }
      return Boolean(callerBootstrapReadyRef.current && pcRef.current);
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
            nativeRtcBindRetryAttempts(iceNetSnapshotRef.current),
            shouldApplyNativeRtcUrl,
          );
        }
      }
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
    let callerOfferSendChain: Promise<boolean> = Promise.resolve(false);
    let callerOfferNegotiationInFlight = false;
    let callerOfferMediaPrepared = false;
    let callerOfferRecoveryAttempted = false;
    let lastCallerOfferSdpRef: CallSignalSdpPayload | null = null;

    const callerPcNegotiationSnapshot = (pc: RTCPeerConnection | null) => ({
      hasLocalOffer: peerConnectionHasLocalOffer({
        signalingState: pc?.signalingState,
        localDescriptionType: pc?.localDescription?.type,
      }),
      hasRemoteDescription: Boolean(pc?.remoteDescription),
    });

    const isCallerNegotiationLocked = (pc: RTCPeerConnection | null): boolean =>
      isCallerOfferNegotiationLocked({
        role,
        peerAccepted: peerAnsweredRef.current,
        callerOfferSent: callerOfferSentRef.current,
        ...callerPcNegotiationSnapshot(pc),
      });

    /**
     * Livraison FIABLE des candidats ICE (trickle).
     * Contrairement au SDP (émis avec `await` + ré-essai), l'ICE était jadis
     * « fire-and-forget » : un candidat perdu sur un blip radio cellulaire
     * (Maroc↔Mali) → aucune paire ICE → DTLS bloqué `new` → aucun média.
     * L'outbox ré-essaie les candidats non confirmés à chaque reconnexion socket.
     */
    const iceOutbox = new CallIceOutbox({
      emit: (candidate) =>
        socketService.ensureConnectedEmit(
          'call:signal',
          {
            callId: callIdRef.current,
            fromUserId: myUserId,
            toUserId: otherUserId,
            signal: { kind: 'ice' as const, candidate },
          },
          8_000,
        ),
      onLog: (phase, data) => logCallPhase(callIdRef.current, phase, data),
    });

    /**
     * Half-trickle : attendre (borné) que le `localDescription` embarque au moins
     * un candidat `relay` (TURN) avant d'émettre le SDP. Le SDP étant livré de
     * façon fiable (`ensureConnectedEmit`), la connexion peut s'établir MÊME si
     * 100 % du trickle ICE est perdu (Maroc↔Mali). Le trickle continue en
     * parallèle. Ne bloque jamais au-delà de HALF_TRICKLE_MAX_WAIT_MS ; sur les
     * ré-émissions, le gathering est déjà fini → retour immédiat.
     */
    const awaitIceCandidatesInLocalSdp = async (pc: RTCPeerConnection | null): Promise<void> => {
      if (!pc || !pc.localDescription?.sdp) return;
      const startedAt = Date.now();
      const maxWaitMs = turnConfiguredRef.current ? HALF_TRICKLE_MAX_WAIT_MS_TURN : HALF_TRICKLE_MAX_WAIT_MS;
      const requireRelay = callForceTurnRelay();
      for (;;) {
        const decision = decideIceGatheringWaitWithBuffer({
          iceGatheringState: pc.iceGatheringState,
          sdp: pc.localDescription?.sdp,
          gatheredCandidates: localGatheredIceRef.current,
          elapsedMs: Date.now() - startedAt,
          maxWaitMs,
          requireRelay,
        });
        if (decision.done) {
          const sdpCounts = sdpCandidateCounts(pc.localDescription?.sdp);
          const bufferCounts = sdpCandidateCounts(
            buildOutboundSdpWithEmbeddedIce({
              sdp: pc.localDescription?.sdp ?? '',
              type: pc.localDescription?.type ?? 'offer',
              gatheredCandidates: localGatheredIceRef.current,
            }).sdp,
          );
          logCallPhase(callIdRef.current, 'ice_in_sdp', {
            reason: decision.reason,
            waitedMs: Date.now() - startedAt,
            requireRelay,
            bufferLen: localGatheredIceRef.current.length,
            relay: bufferCounts.relay,
            srflx: bufferCounts.srflx,
            host: bufferCounts.host,
            total: bufferCounts.total,
            sdpOnlyRelay: sdpCounts.relay,
          });
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, HALF_TRICKLE_POLL_MS));
      }
    };

    const sendSdpFromPeerConnection = async (
      pc: RTCPeerConnection | null,
      fallback?: RTCSessionDescriptionInit | null,
    ): Promise<boolean> => {
      const previewType =
        pc?.localDescription?.type ??
        fallback?.type ??
        pickOutboundCallSdp(pc, fallback ?? undefined)?.type ??
        null;
      const isAnswerOutbound = String(previewType || '').toLowerCase() === 'answer';
      if (isAnswerOutbound) {
        logAnswerSendStart({
          callId: callIdRef.current,
          role,
          toUserId: otherUserId,
          signalingState: pc?.signalingState ?? null,
          ...summarizeCallSdp(pc?.localDescription?.sdp ?? fallback?.sdp, previewType),
        });
      }
      const iceWaitOpts = {
        turnConfigured: turnConfiguredRef.current,
        isNative: !isWebRuntime,
      };
      // Half-trickle : offer (+ answer natif TURN) — candidats relay embarqués dans le SDP.
      if (shouldAwaitIceBeforeOutboundSdp(previewType, iceWaitOpts)) {
        await awaitIceCandidatesInLocalSdp(pc);
      } else if (shouldAwaitMinimalIceBeforeAnswerEmbed(previewType, iceWaitOpts)) {
        const answerIceStarted = Date.now();
        while (Date.now() - answerIceStarted < MINIMAL_ANSWER_ICE_WAIT_MS) {
          if (
            minimalIceGatherReady(
              localGatheredIceRef.current.length,
              pc?.iceGatheringState ?? null,
            )
          ) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, MINIMAL_ANSWER_ICE_POLL_MS));
        }
      }
      const picked = pickOutboundCallSdp(pc, fallback ?? undefined);
      if (!picked) {
        logCallPhase(callIdRef.current, 'sdp_send_skipped', {
          reason: 'invalid_outbound',
          pcLocalType: pc?.localDescription?.type ?? null,
          fallbackType: fallback?.type ?? null,
        });
        if (isAnswerOutbound) {
          logAnswerSendError({
            callId: callIdRef.current,
            role,
            reason: 'invalid_outbound',
            pcLocalType: pc?.localDescription?.type ?? null,
            fallbackType: fallback?.type ?? null,
          });
        }
        devWarn('[Call] SDP non envoyé — type ou sdp manquant après setLocalDescription');
        return false;
      }
      const built = buildOutboundSdpWithEmbeddedIce({
        sdp: picked.sdp,
        type: picked.type,
        gatheredCandidates: localGatheredIceRef.current,
      });
      const outbound = {
        type: built.type as CallSignalSdpPayload['type'],
        sdp: built.sdp,
      };
      logCallPhase(callIdRef.current, 'sdp_send', {
        type: outbound.type,
        hasAudio: sdpContainsMedia(outbound.sdp, 'audio'),
        hasVideo: sdpContainsMedia(outbound.sdp, 'video'),
        embeddedIce: built.embeddedCount,
        iceRelay: built.counts.relay,
        iceTotal: built.counts.total,
      });
      logSdpSend({
        callId: callIdRef.current,
        role,
        toUserId: otherUserId,
        ...summarizeCallSdp(outbound.sdp, outbound.type),
      });
      const payload = {
        callId: callIdRef.current,
        fromUserId: myUserId,
        toUserId: otherUserId,
        signal: { kind: 'sdp' as const, sdp: outbound },
      };
      const ok = await socketService.ensureConnectedEmit('call:signal', payload, 12_000);
      if (!ok) {
        logCallPhase(callIdRef.current, 'sdp_send_socket_failed', { type: outbound.type });
        if (String(outbound.type).toLowerCase() === 'answer') {
          logAnswerSendError({
            callId: callIdRef.current,
            role,
            reason: 'socket_emit_failed',
            toUserId: otherUserId,
            ...summarizeCallSdp(outbound.sdp, outbound.type),
          });
        }
        lastCallerOfferAbortRef.current = 'sdp_send_socket_failed';
        logAfwCall('sdp_send_socket_failed', {
          callId: callIdRef.current,
          type: outbound.type,
          role,
        });
        setErrorMsg('Connexion instable. Nouvelle tentative…');
        return false;
      }
      if (String(outbound.type).toLowerCase() === 'answer') {
        logAnswerSendSuccess({
          callId: callIdRef.current,
          role,
          toUserId: otherUserId,
          ...summarizeCallSdp(outbound.sdp, outbound.type),
        });
        void iceOutbox.flushNow();
      }
      if (String(outbound.type).toLowerCase() === 'offer') {
        void iceOutbox.flushNow();
      }
      return true;
    };

    /** Réémet l'offre si l'answer n'arrive pas (filet avant watchdog 60 s). */
    const OFFER_RESEND_UNTIL_ANSWER_MS = [4_000, 10_000, 20_000] as const;
    let offerResendTimers: ReturnType<typeof setTimeout>[] = [];
    const clearOfferResendTimers = () => {
      for (const timer of offerResendTimers) clearTimeout(timer);
      offerResendTimers = [];
    };
    const scheduleOfferResendUntilAnswer = () => {
      if (role !== 'caller') return;
      clearOfferResendTimers();
      for (const delayMs of OFFER_RESEND_UNTIL_ANSWER_MS) {
        const timer = setTimeout(() => {
          if (cancelled || pcTearingDownRef.current) return;
          const pc = pcRef.current as RTCPeerConnection | null;
          if (!pc || pc.remoteDescription || !callerOfferSentRef.current) return;
          callerOfferResendCountRef.current += 1;
          logAfwCall('sdp_resend_offer_scheduled', {
            callId: callIdRef.current,
            role,
            delayMs,
            attempt: callerOfferResendCountRef.current,
          });
          void sendSdpFromPeerConnection(
            pc,
            lastCallerOfferSdpRef ?? pc.localDescription ?? undefined,
          );
        }, delayMs);
        offerResendTimers.push(timer);
      }
    };

    triggerIceRestartRef.current = async () => {
      if (cancelled || pcTearingDownRef.current) return;
      const pc = pcRef.current as RTCPeerConnection | null;
      if (!pc || pc.connectionState === 'closed') return;
      if (
        shouldDeferIceRestartOffer({
          role,
          negotiationLocked: isCallerNegotiationLocked(pc),
          callerOfferSent: callerOfferSentRef.current,
          hasRemoteDescription: Boolean(pc.remoteDescription),
        })
      ) {
        return;
      }
      try {
        const prunedRestart = pruneRedundantCallTransceivers(pc);
        if (prunedRestart) logCallPhase(callIdRef.current, 'transceivers_pruned', { stopped: prunedRestart, source: 'ice_restart' });
        const restartOffer = await pc.createOffer({ iceRestart: true });
        await applyLocalDescription(pc, restartOffer);
        await sendSdpFromPeerConnection(pc, restartOffer);
        const remote = remoteStreamRef.current as MediaStream;
        enableRemoteAudioTracks(remote);
        if (!isWebRuntime) {
          void applyNativeCallSpeakerRoute(speakerOnRef.current);
          refreshNativeRemoteAudioPlayback('ice_restart_network_change', pc);
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
          remoteSdpHasVideo: remoteSdpHasVideo(),
          forceTurnRelay: callForceTurnRelay(),
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
            hasLocalOffer: peerConnectionHasLocalOffer({
              signalingState: pc.signalingState,
              localDescriptionType: pc.localDescription?.type,
            }),
            hasRemoteDescription: Boolean(pc.remoteDescription),
            resendCount: callerOfferResendCountRef.current,
          })
        ) {
          callerOfferResendCountRef.current += 1;
          void sendSdpFromPeerConnection(pc, pc.localDescription);
          logCallPhase(callIdRef.current, 'sdp_resend_offer', {
            attempt: callerOfferResendCountRef.current,
          });
          armConnectionWatchdog();
          return;
        }

        if (shouldDeferConnectionWatchdogIceRestart(callerOfferNegotiationInFlight)) {
          armConnectionWatchdog();
          return;
        }

        if (
          shouldDeferIceRestartOffer({
            role,
            negotiationLocked: isCallerNegotiationLocked(pc),
            callerOfferSent: callerOfferSentRef.current,
            hasRemoteDescription: Boolean(pc.remoteDescription),
          })
        ) {
          armConnectionWatchdog();
          return;
        }

        if (!restartAttempted) {
          restartAttempted = true;
          try {
            const prunedWatchdog = pruneRedundantCallTransceivers(pc);
            if (prunedWatchdog) {
              logCallPhase(callIdRef.current, 'transceivers_pruned', {
                stopped: prunedWatchdog,
                source: 'watchdog_ice_restart',
              });
            }
            const restartOffer = await pc.createOffer({ iceRestart: true });
            await applyLocalDescription(pc, restartOffer);
            await sendSdpFromPeerConnection(pc, restartOffer);
            if (!isWebRuntime) {
              refreshNativeRemoteAudioPlayback('connection_watchdog_ice_restart', pc);
            }
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
        finishCall('failed', 'connection_watchdog');
      }, connectionWatchdogMsRef.current);
    };

    const logPcStatesSnapshot = (reason: string, extra?: Record<string, unknown>) => {
      logPeerConnectionStates({
        callId: callIdRef.current,
        role,
        reason,
        ...readPeerConnectionStates(pcRef.current as RTCPeerConnection | null),
        ...extra,
      });
    };

    const flushPendingIce = async () => {
      const pc = pcRef.current as RTCPeerConnection | null;
      if (!pc || !pc.remoteDescription) return;
      const queued = pendingIceRef.current.length;
      if (queued === 0) return;
      logIceFlushPending({ callId, role, queued });
      while (pendingIceRef.current.length > 0) {
        const c = pendingIceRef.current.shift();
        if (!c) continue;
        const meta = parseIceCandidateMeta(c.candidate ?? null);
        try {
          const ice = isWebRuntime ? c : new RTCIceCandidateImpl(c);
          await pc.addIceCandidate(ice);
          logIceRemoteApplied({
            callId: callIdRef.current,
            role,
            source: 'flush_pending',
            ...meta,
            sdpMid: c.sdpMid ?? null,
          });
        } catch (e) {
          logCallPhase(callId, 'ice_remote_failed', { error: String(e), source: 'flush_pending', ...meta });
        }
      }
      logPcStatesSnapshot('after_flush_pending_ice', { flushed: queued });
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
        await startActiveCallForeground(name || 'Contact', true);
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
        logAfwCall('signal_drop', {
          callId: callIdRef.current,
          role,
          reason: 'call_id_mismatch',
          rxCallId: payload?.callId ?? null,
          expectedCallId: callIdRef.current,
          kind: rxKind,
        });
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
        logAfwCall('signal_ignored', {
          callId: callIdRef.current,
          role,
          kind: rxKind,
          signalingState: pc.signalingState,
        });
        logCallPhase(callIdRef.current, 'signal_ignored', {
          kind: rxKind,
          signalingState: pc.signalingState,
        });
        return;
      }
      try {
        if (normalized.kind === 'sdp') {
          const remoteSdp = normalized.sdp;
          const isInboundAnswer = remoteSdp.type === 'answer';
          const remoteDescription = isWebRuntime
            ? remoteSdp
            : new RTCSessionDescriptionImpl(remoteSdp);
          logSdpReceived({
            callId: callIdRef.current,
            role,
            fromUserId: payload.fromUserId,
            ...summarizeCallSdp(remoteSdp.sdp, remoteSdp.type),
          });
          if (isInboundAnswer) {
            logAnswerRx({
              callId: callIdRef.current,
              role,
              fromUserId: payload.fromUserId,
              signalingState: pc.signalingState,
              ...summarizeCallSdp(remoteSdp.sdp, remoteSdp.type),
            });
            logSetRemoteAnswerStart({
              callId: callIdRef.current,
              role,
              fromUserId: payload.fromUserId,
              signalingState: pc.signalingState,
              ...summarizeCallSdp(remoteSdp.sdp, remoteSdp.type),
            });
          }
          try {
            await pc.setRemoteDescription(remoteDescription);
            logSetRemoteDescription({
              callId: callIdRef.current,
              role,
              type: remoteSdp.type,
              signalingState: pc.signalingState,
            });
            if (isInboundAnswer) {
              logSetRemoteAnswerSuccess({
                callId: callIdRef.current,
                role,
                fromUserId: payload.fromUserId,
                signalingState: pc.signalingState,
                ...summarizeCallSdp(remoteSdp.sdp, remoteSdp.type),
              });
              clearOfferResendTimers();
            }
            logPcStatesSnapshot('after_set_remote_description', { sdpType: remoteSdp.type });
          } catch (firstErr) {
            if (isInboundAnswer) {
              logSetRemoteAnswerError({
                callId: callIdRef.current,
                role,
                fromUserId: payload.fromUserId,
                signalingState: pc.signalingState,
                name: String((firstErr as Error)?.name || ''),
                message: String((firstErr as Error)?.message || firstErr || ''),
              });
            }
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
          ensureLocalAudioTracksEnabled(localStreamRef.current as MediaStream | null);
          syncRemoteTracksFromPeerConnection(pc);
          enableRemoteAudioTracks(remoteStreamRef.current as MediaStream);
          if (isInboundAnswer) {
            refreshNativeRemoteAudioPlayback('sdp_remote_answer', pc);
          }
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
            ensureLocalAudioTracksEnabled(localStreamRef.current as MediaStream | null);
            if (!peerConnectionHasActiveAudioSender(pc) && !callerLocalMediaReady()) {
              const localRecovery = localStreamRef.current as MediaStream | null;
              if (localRecovery && !isWebRuntime) {
                await recoverNativeAudioOfferMedia(pc, localRecovery);
              }
            }
            if (!peerConnectionHasActiveAudioSender(pc) && !callerLocalMediaReady()) {
              logAnswerSendError({
                callId: callIdRef.current,
                role,
                reason: 'no_audio_sender_abort',
                hasLocalStream: Boolean((localStreamRef.current as MediaStream | null)?.getTracks?.().length),
                senderCount: pc.getSenders?.().length ?? 0,
              });
              logAfwCall('answer_no_audio_sender_abort', {
                callId: callIdRef.current,
                role,
              });
              setErrorMsg('Micro indisponible — impossible de répondre à l’appel.');
              finishCall('failed');
              return;
            }
            const ans = await pc.createAnswer(callSdpNegotiationOptions());
            logCreateAnswer({
              callId: callIdRef.current,
              role,
              ...summarizeCallSdp(ans.sdp, ans.type),
            });
            await applyLocalDescription(pc, ans);
            const localAns = pc.localDescription;
            logSetLocalDescription({
              callId: callIdRef.current,
              role,
              type: localAns?.type ?? ans.type,
              signalingState: pc.signalingState,
              sdpTuned: isWebRuntime,
            });
            logPcStatesSnapshot('after_set_local_description', { sdpType: localAns?.type ?? ans.type });
            void optimizeCallAudioPipeline(pc, voiceBitrateRef.current);
            logCallPhase(callId, 'sdp_local', {
              type: localAns?.type ?? ans.type,
              hasAudio: sdpContainsMedia(localAns?.sdp ?? ans.sdp, 'audio'),
              hasVideo: sdpContainsMedia(localAns?.sdp ?? ans.sdp, 'video'),
            });
            let answerSent = await sendSdpFromPeerConnection(pc, ans);
            if (!answerSent) {
              await new Promise((resolve) => setTimeout(resolve, 350));
              answerSent = await sendSdpFromPeerConnection(pc, pc.localDescription ?? ans);
            }
            if (!answerSent) {
              logAnswerSendError({
                callId: callIdRef.current,
                role,
                reason: 'answer_send_exhausted',
                toUserId: otherUserId,
              });
            } else {
              refreshNativeRemoteAudioPlayback('sdp_local_answer', pc);
            }
          }
        } else if (normalized.kind === 'ice') {
          if (normalized.candidate === null) {
            if (pc.remoteDescription) {
              try {
                await pc.addIceCandidate(null as unknown as RTCIceCandidateInit);
                logIceRemoteApplied({
                  callId: callIdRef.current,
                  role,
                  source: 'end_of_candidates',
                  type: null,
                  protocol: null,
                });
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
            const iceMeta = parseIceCandidateMeta(normalized.candidate.candidate ?? null);
            logIceRemote({
              callId: callIdRef.current,
              role,
              fromUserId: payload.fromUserId,
              ...iceMeta,
              candidate: normalized.candidate.candidate?.slice(0, 48) ?? null,
              sdpMid: normalized.candidate.sdpMid ?? null,
            });
            try {
              await pc.addIceCandidate(ice);
              logIceRemoteApplied({
                callId: callIdRef.current,
                role,
                fromUserId: payload.fromUserId,
                source: 'trickle',
                ...iceMeta,
                sdpMid: normalized.candidate.sdpMid ?? null,
              });
              logPcStatesSnapshot('after_add_ice_candidate');
            } catch (e) {
              logCallPhase(callId, 'ice_remote_failed', { error: String(e), ...iceMeta });
            }
          } else {
            pendingIceRef.current.push(normalized.candidate);
            logIceQueued({
              callId: callIdRef.current,
              role,
              fromUserId: payload.fromUserId,
              ...parseIceCandidateMeta(normalized.candidate.candidate ?? null),
              pendingCount: pendingIceRef.current.length,
              sdpMid: normalized.candidate.sdpMid ?? null,
            });
          }
        }
      } catch (e) {
        logAfwCall('signal_failed', {
          callId: callIdRef.current,
          role,
          kind: rxKind,
          name: String((e as Error)?.name || ''),
          message: String((e as Error)?.message || e || ''),
        });
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

    const ensureCallerMediaOnPeerConnection = async (pc: RTCPeerConnection): Promise<boolean> => {
      const local = localStreamRef.current as MediaStream | null;
      if (!local?.getAudioTracks?.().length) return callerLocalMediaReady();
      ensureLocalAudioTracksEnabled(local);
      if (peerConnectionHasActiveAudioSender(pc)) return true;
      if (
        shouldSkipCallerOfferMediaSetup({
          localTracksAttachedAtBootstrap: callerLocalTracksAttachedRef.current,
          hasActiveAudioSender: peerConnectionHasActiveAudioSender(pc),
        })
      ) {
        return true;
      }
      const snap = callerPcNegotiationSnapshot(pc);
      if (
        isCallerOfferNegotiationLocked({
          role,
          peerAccepted: peerAnsweredRef.current,
          callerOfferSent: callerOfferSentRef.current,
          ...snap,
        }) ||
        callerOfferSentRef.current ||
        snap.hasLocalOffer
      ) {
        return peerConnectionHasActiveAudioSender(pc) || callerLocalMediaReady();
      }
      await attachLocalTracksToPeerConnection(pc, local, localSendersRef.current, isWebRuntime);
      return peerConnectionHasActiveAudioSender(pc) || callerLocalMediaReady();
    };

    const rollbackCallerLocalOffer = async (pc: RTCPeerConnection): Promise<void> => {
      if (String(pc.signalingState || '') !== 'have-local-offer') return;
      try {
        await pc.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit);
        lastCallerOfferSdpRef = null;
      } catch {
        /* ignore */
      }
    };

    const resendExistingCallerOffer = async (
      pc: RTCPeerConnection,
      source: string,
    ): Promise<boolean> => {
      if (
        !peerConnectionHasLocalOffer({
          signalingState: pc.signalingState,
          localDescriptionType: pc.localDescription?.type,
        })
      ) {
        return false;
      }
      const sent = await sendSdpFromPeerConnection(pc, lastCallerOfferSdpRef ?? undefined);
      if (!sent) return false;
      callerOfferSentRef.current = true;
      callerOfferResendCountRef.current = 0;
      armMediaWatchdogIfReady();
      logCallPhase(callIdRef.current, 'sdp_resend_existing_offer', { source });
      return true;
    };

    const sendCallerOfferAfterAccept = async (source: string): Promise<boolean> => {
      if (cancelled || role !== 'caller') return false;
      if (callerOfferSentRef.current) return true;
      if (!peerAnsweredRef.current) return false;
      const pcEarly = pcRef.current as RTCPeerConnection | null;
      if (pcEarly && isCallerNegotiationLocked(pcEarly)) {
        return (await resendExistingCallerOffer(pcEarly, `${source}_locked`)) || callerOfferSentRef.current;
      }
      if (!callerBootstrapReadyRef.current || !pcRef.current) {
        const ready = await waitForCallerBootstrap();
        if (!ready) {
          lastCallerOfferAbortRef.current = 'bootstrap_timeout';
          logCallPhase(callIdRef.current, 'caller_offer_abort', {
            reason: 'bootstrap_timeout',
            source,
          });
          logAfwCall('caller_offer_abort', { reason: 'bootstrap_timeout', source, callId: callIdRef.current, role });
          return false;
        }
      }
      const pc = pcRef.current as RTCPeerConnection;
      const negotiationLocked = isCallerNegotiationLocked(pc);
      const pcSnap = callerPcNegotiationSnapshot(pc);
      if (await resendExistingCallerOffer(pc, source)) return true;
      if (!callerLocalMediaReady()) {
        const mediaReady = await waitForLocalMediaReady();
        if (cancelled || !mediaReady) {
          lastCallerOfferAbortRef.current = 'local_media_timeout';
          logCallPhase(callIdRef.current, 'caller_offer_abort', {
            reason: 'local_media_timeout',
            source,
          });
          logAfwCall('caller_offer_abort', { reason: 'local_media_timeout', source, callId: callIdRef.current, role });
          return false;
        }
      }
      callerOfferNegotiationInFlight = true;
      try {
        const skipMediaSetup = shouldSkipCallerOfferMediaSetup({
          localTracksAttachedAtBootstrap: callerLocalTracksAttachedRef.current,
          hasActiveAudioSender: peerConnectionHasActiveAudioSender(pc),
        });
        if (!skipMediaSetup) {
          const mediaOk = await ensureCallerMediaOnPeerConnection(pc);
          if (!mediaOk) {
            lastCallerOfferAbortRef.current = 'no_audio_sender';
            logCallPhase(callIdRef.current, 'caller_offer_abort', {
              reason: 'no_audio_sender',
              source,
            });
            logAfwCall('caller_offer_abort', { reason: 'no_audio_sender', source, callId: callIdRef.current, role });
            return false;
          }
        } else if (!peerConnectionHasActiveAudioSender(pc)) {
          lastCallerOfferAbortRef.current = 'no_audio_sender';
          logCallPhase(callIdRef.current, 'caller_offer_abort', {
            reason: 'no_audio_sender',
            source,
            bootstrapAttached: true,
          });
          logAfwCall('caller_offer_abort', {
            reason: 'no_audio_sender',
            source,
            callId: callIdRef.current,
            role,
            bootstrapAttached: true,
          });
          return false;
        }
        if (
          !isWebRuntime &&
          !isVideoCallRef.current &&
          shouldMutateCallerMediaForOffer({
            negotiationLocked,
            callerOfferSent: callerOfferSentRef.current,
            hasLocalOffer: pcSnap.hasLocalOffer,
            mediaPrepared: callerOfferMediaPrepared,
            localTracksAttachedAtBootstrap: callerLocalTracksAttachedRef.current,
            hasActiveAudioSender: peerConnectionHasActiveAudioSender(pc),
          })
        ) {
          const localForOffer = localStreamRef.current as MediaStream | null;
          if (localForOffer?.getAudioTracks?.().length) {
            const reset = await prepareNativeAudioCallerOffer(pc, localForOffer, { force: false });
            callerOfferMediaPrepared = true;
            if (reset) {
              localSendersRef.current = {};
              logCallPhase(callId, 'caller_offer_media_reset', {
                source,
                forced: false,
                txCount: pc.getTransceivers?.().length ?? -1,
              });
            }
          }
        }
        const prunedOffer = pruneRedundantCallTransceivers(pc);
        if (prunedOffer) logCallPhase(callId, 'transceivers_pruned', { stopped: prunedOffer });
        if (await resendExistingCallerOffer(pc, `${source}_pre_create`)) return true;
        if (
          !shouldCreateCallerOffer({
            callerOfferSent: callerOfferSentRef.current,
            signalingState: pc.signalingState,
            localDescriptionType: pc.localDescription?.type,
            negotiationLocked,
          })
        ) {
          return (await resendExistingCallerOffer(pc, `${source}_skip_create`)) || false;
        }
        const preOfferDiag = summarizePeerConnectionForOffer(pc);
        logPreCreateOfferPeerConnection({
          callId: callIdRef.current,
          role,
          source,
          skipMediaSetup,
          bootstrapAttached: callerLocalTracksAttachedRef.current,
          ...preOfferDiag,
        });
        logCallPhase(callId, 'pre_create_offer', {
          source,
          skipMediaSetup,
          senderCount: preOfferDiag.senders.length,
          audioSenders: preOfferDiag.senders.filter((s) => s.kind === 'audio').length,
          transceiverCount: preOfferDiag.transceivers.length,
          audioTransceivers: preOfferDiag.transceivers.filter(
            (t) => t.senderKind === 'audio' || t.receiverKind === 'audio',
          ).length,
        });
        logPatchAudioFixActive({
          phase: 'before_create_offer',
          callId: callIdRef.current,
          tag: CALL_NATIVE_AUDIO_FIX_TAG,
          source,
        });
        let offer = await pc.createOffer(callSdpNegotiationOptions());
        let offerSdpBody = String(offer.sdp || '');
        if (countSdpMediaSections(offerSdpBody, 'audio') > 1) {
          const prunedDup = pruneRedundantCallTransceivers(pc);
          logCallPhase(callId, 'offer_duplicate_audio_retry', {
            source,
            stopped: prunedDup,
            audioSections: countSdpMediaSections(offerSdpBody, 'audio'),
          });
          offer = await pc.createOffer(callSdpNegotiationOptions());
          offerSdpBody = String(offer.sdp || '');
        }
        if (countSdpMediaSections(offerSdpBody, 'audio') > 1) {
          lastCallerOfferAbortRef.current = 'duplicate_audio_sections';
          logAfwCall('caller_offer_abort', {
            reason: 'duplicate_audio_sections',
            source,
            callId: callIdRef.current,
            role,
            audioSections: countSdpMediaSections(offerSdpBody, 'audio'),
          });
          setErrorMsg('Erreur média — relancez l’appel.');
          finishCall('failed');
          return false;
        }
        logCreateOffer({
          callId: callIdRef.current,
          role,
          source,
          ...summarizeCallSdp(offer.sdp, offer.type),
        });
        logDebugTransceiversBeforeSetLocal(pc, {
          callId: callIdRef.current,
          role,
          source,
          phase: 'caller_offer',
        });
        await applyLocalDescription(pc, offer);
        const localOffer = pc.localDescription;
        logSetLocalDescription({
          callId: callIdRef.current,
          role,
          type: localOffer?.type ?? offer.type,
          signalingState: pc.signalingState,
          sdpTuned: isWebRuntime,
        });
        if (isWebRuntime) void optimizeCallAudioPipeline(pc, voiceBitrateRef.current);
        lastCallerOfferSdpRef = {
          type: (localOffer?.type || offer.type || 'offer') as CallSignalSdpPayload['type'],
          sdp: String(localOffer?.sdp || offer.sdp || ''),
        };
        logCallPhase(callId, 'sdp_local', {
          type: localOffer?.type ?? offer.type,
          hasAudio: sdpContainsMedia(localOffer?.sdp ?? offer.sdp, 'audio'),
          hasVideo: sdpContainsMedia(localOffer?.sdp ?? offer.sdp, 'video'),
          audioSections: countSdpMediaSections(localOffer?.sdp ?? offer.sdp, 'audio'),
          videoSections: countSdpMediaSections(localOffer?.sdp ?? offer.sdp, 'video'),
          txCount: pc.getTransceivers?.().length ?? -1,
        });
        const sent = await sendSdpFromPeerConnection(pc, offer);
        if (!sent) {
          lastCallerOfferAbortRef.current = 'sdp_send_failed';
          logCallPhase(callIdRef.current, 'caller_offer_abort', {
            reason: 'sdp_send_failed',
            source,
          });
          logAfwCall('caller_offer_abort', { reason: 'sdp_send_failed', source, callId: callIdRef.current, role });
          return (await resendExistingCallerOffer(pc, `${source}_post_send`)) || false;
        }
        callerOfferSentRef.current = true;
        callerOfferResendCountRef.current = 0;
        armMediaWatchdogIfReady();
        scheduleOfferResendUntilAnswer();
        return true;
      } catch (e) {
        devWarn('[Call] offer failed', e);
        lastCallerOfferAbortRef.current = 'create_offer_failed';
        logCallPhase(callIdRef.current, 'caller_offer_abort', {
          reason: 'create_offer_failed',
          source,
          message: String((e as Error)?.message || e || ''),
        });
        logAfwCall('caller_offer_abort', {
          reason: 'create_offer_failed',
          source,
          callId: callIdRef.current,
          role,
          message: String((e as Error)?.message || e || ''),
          txCount: pc.getTransceivers?.().length ?? -1,
        });
        if (
          shouldAttemptCallerOfferMediaRecovery({
            negotiationLocked: isCallerNegotiationLocked(pc),
            callerOfferSent: callerOfferSentRef.current,
            hasLocalOffer: peerConnectionHasLocalOffer({
              signalingState: pc.signalingState,
              localDescriptionType: pc.localDescription?.type,
            }),
            recoveryAlreadyAttempted: callerOfferRecoveryAttempted,
            localTracksAttachedAtBootstrap: callerLocalTracksAttachedRef.current,
            hasActiveAudioSender: peerConnectionHasActiveAudioSender(pc),
          })
        ) {
          callerOfferRecoveryAttempted = true;
          let prunedRecovery = pruneRedundantCallTransceivers(pc);
          let mediaRecovered = false;
          if (!isWebRuntime && !isVideoCallRef.current) {
            const localRecovery = localStreamRef.current as MediaStream | null;
            if (localRecovery?.getAudioTracks?.().length) {
              const reset = await prepareNativeAudioCallerOffer(pc, localRecovery, { force: true });
              callerOfferMediaPrepared = true;
              if (reset) {
                localSendersRef.current = {};
                mediaRecovered = true;
                prunedRecovery += pc.getTransceivers?.().length ?? 0;
                logCallPhase(callId, 'caller_offer_media_reset', {
                  source: `${source}_recovery`,
                  forced: true,
                  txCount: pc.getTransceivers?.().length ?? -1,
                });
                logAfwCall('caller_offer_audio_recovery', {
                  source,
                  reset: true,
                  callId: callIdRef.current,
                });
              }
            }
          } else if (prunedRecovery > 0) {
            logAfwCall('caller_offer_recovery_prune', {
              source,
              stopped: prunedRecovery,
              callId: callIdRef.current,
            });
            const localRecovery = localStreamRef.current as MediaStream | null;
            if (localRecovery?.getTracks?.().length) {
              await attachLocalTracksToPeerConnection(
                pc,
                localRecovery,
                localSendersRef.current,
                isWebRuntime,
              );
            }
          }
          if ((prunedRecovery > 0 || mediaRecovered) && !isCallerNegotiationLocked(pc)) {
            try {
              const mediaOkRetry = await ensureCallerMediaOnPeerConnection(pc);
              if (!mediaOkRetry) throw new Error('no_audio_sender_after_recovery');
              if (
                !shouldCreateCallerOffer({
                  callerOfferSent: callerOfferSentRef.current,
                  signalingState: pc.signalingState,
                  localDescriptionType: pc.localDescription?.type,
                  negotiationLocked: isCallerNegotiationLocked(pc),
                })
              ) {
                throw new Error('negotiation_locked_after_recovery');
              }
              const offerRetry = await pc.createOffer(callSdpNegotiationOptions());
              await applyLocalDescription(pc, offerRetry);
              const localRetry = pc.localDescription;
              lastCallerOfferSdpRef = {
                type: (localRetry?.type || offerRetry.type || 'offer') as CallSignalSdpPayload['type'],
                sdp: String(localRetry?.sdp || offerRetry.sdp || ''),
              };
              logCallPhase(callIdRef.current, 'sdp_local', {
                type: localRetry?.type ?? offerRetry.type,
                recovered: true,
                source,
              });
              const sentRetry = await sendSdpFromPeerConnection(pc, offerRetry);
              if (sentRetry) {
                callerOfferSentRef.current = true;
                callerOfferResendCountRef.current = 0;
                armMediaWatchdogIfReady();
                return true;
              }
            } catch (retryErr) {
              devWarn('[Call] offer retry after recovery failed', retryErr);
            }
          }
        }
        if (await resendExistingCallerOffer(pc, `${source}_after_error`)) return true;
        if (!isCallerNegotiationLocked(pc)) {
          await rollbackCallerLocalOffer(pc);
        }
        return false;
      } finally {
        callerOfferNegotiationInFlight = false;
      }
    };

    const queueCallerOfferAfterAccept = (source: string): Promise<boolean> => {
      const chained = chainCallerOfferTask(callerOfferSendChain, () =>
        sendCallerOfferAfterAccept(source),
      );
      callerOfferSendChain = chained.nextChain;
      return chained.result;
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
      logAfwCall('accept_rx', {
        callId: callIdRef.current,
        role,
        type: payload?.type ?? null,
        callerBootstrapReady: callerBootstrapReadyRef.current,
        hasPc: Boolean(pcRef.current),
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
      const sent = await queueCallerOfferAfterAccept('call:accept');
      if (
        shouldRetryCallerOfferAfterAccept({
          sent,
          callerOfferSent: callerOfferSentRef.current,
          peerAccepted: peerAnsweredRef.current,
          cancelled,
        })
      ) {
        let attempt = 0;
        const retryCallerOffer = () => {
          if (cancelled || callerOfferSentRef.current || !peerAnsweredRef.current) return;
          const pcRetry = pcRef.current as RTCPeerConnection | null;
          if (pcRetry && isCallerNegotiationLocked(pcRetry)) {
            void resendExistingCallerOffer(pcRetry, `accept_retry_resend_${attempt}`);
            return;
          }
          if (shouldCountCallerOfferRetryAttempt({ callerBootstrapReady: callerBootstrapReadyRef.current })) {
            attempt += 1;
            if (shouldFailCallerAfterOfferRetries(attempt)) {
              if (!callerOfferSentRef.current && callStateRef.current !== 'ended') {
                setErrorMsg('Impossible d’établir la connexion média. Réessayez l’appel.');
                finishCall('failed', 'caller_offer_retries_exhausted');
              }
              return;
            }
          }
          void queueCallerOfferAfterAccept(`call:accept_retry_${attempt}`).then((ok) => {
            if (!ok && !callerOfferSentRef.current && !cancelled) {
              setTimeout(retryCallerOffer, CALLER_OFFER_RETRY_MS);
            }
          });
        };
        setTimeout(retryCallerOffer, CALLER_OFFER_RETRY_MS);
      }
    };

    const handlePeerEnded = (payload?: { callId?: string; reason?: string }) => {
      logCallEndReceived({
        callId: payload?.callId ?? callIdRef.current,
        role,
        localCallId: callIdRef.current,
        reason: payload?.reason ?? null,
      });
      if (
        shouldIgnoreInboundCallEnd({
          payloadCallId: payload?.callId,
          localCallId: callIdRef.current,
          callState: callStateRef.current,
          role,
        })
      ) {
        logCallPhase(callIdRef.current, 'peer_end_ignored', {
          reason: 'filtered',
          payloadCallId: payload?.callId ?? null,
          localCallId: callIdRef.current,
          callState: callStateRef.current,
        });
        return;
      }
      finishCall('ended', 'peer_call_end');
    };
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
    /** Reconnexion socket → ré-essayer les candidats ICE non confirmés. */
    const offIceReflush = socketService.on('authenticated', () => iceOutbox.flushNow());

    const start = async () => {
      if (isWebRuntime) {
        await stopAllCallRings();
      }
      finishingRef.current = false;
      pcTearingDownRef.current = false;
      mediaStoppedRef.current = false;
      callerOfferSentRef.current = false;
      callerOfferResendCountRef.current = 0;
      callerBootstrapReadyRef.current = false;
      callerLocalTracksAttachedRef.current = false;
      lastCallerOfferAbortRef.current = null;
      lastCallerOfferSdpRef = null;
      callerOfferMediaPrepared = false;
      callerOfferRecoveryAttempted = false;
      localGatheredIceRef.current = [];
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
          const cached = getPrefetchedTurnCredentials();
          if (cached) return cached;
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
        iceNetSnapshotRef.current = iceNetSnapshot;
        turnConfiguredRef.current = turnConfigured;
        if (
          shouldBlockCellularWithoutTurn({
            turnConfigured,
            net: iceNetSnapshot,
            isWeb: isWebRuntime,
          })
        ) {
          devWarn('[Call] TURN non configuré — réseau mobile Afrique bloqué (CGNAT)');
          setErrorMsg(
            'Réseau mobile sans relais TURN — l’audio ne peut pas passer. Passez en Wi‑Fi ou contactez le support.',
          );
          finishCall('failed', 'turn_missing_cellular');
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
          devWarn('[Call] TURN sans relais TLS (turns:) — réseau mobile Android bloqué');
          setErrorMsg(
            'Relais TURN sécurisé indisponible pour le réseau mobile. Mettez à jour l’app ou contactez le support AfriWonder.',
          );
          finishCall('failed', 'turn_tls_missing_cellular');
          return;
        }
        connectionWatchdogMsRef.current = callConnectionWatchdogMs(iceNetSnapshot);
        mediaReadyHintMsRef.current = callMediaReadyHintMs(iceNetSnapshot);
        voiceBitrateRef.current = pickVoiceOpusBitrateForNetwork(iceNetSnapshot);

        /** Micro + FGS avant PeerConnection — Xiaomi / Android 14 tuent le micro pendant ICE sinon. */
        if (!isWebRuntime) {
          await releaseExpoAvForWebRtcCall();
          const permitted = await requestNativeCallPermissions(startedAsVideo);
          if (!permitted) {
            throw new Error('NOTALLOWED');
          }
          await startNativeCallAudioSession(startedAsVideo, speakerOnRef.current, {
            outgoingRingback: role === 'caller',
          });
          await startActiveCallForeground(name || 'Contact', startedAsVideo);
        }

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
          devWarn('[Call] RTCPeerConnection config primaire échouée, repli ICE allégé', pcErr);
          const fallbackConfig = buildCallIceConfig({
            iceServers: prepareIceServersForPlatform({
              isWeb: true,
              turnConfigured,
              iceServers,
            }),
            turnConfigured,
            isWeb: true,
            net: iceNetSnapshot,
          });
          pc = new RTCPeerConnection(fallbackConfig);
        }
        pcRef.current = pc;
        logCallPhase(callId, 'pc_created', { isWeb: isWebRuntime });
        await flushPendingSignals();

        /**
         * Natif : aucun addTransceiver avant getUserMedia — addTrack après getUserMedia uniquement.
         * Web : addTrack (sauf listen-only recvonly).
         */
        const localSenders: { audio?: RTCRtpSender | null; video?: RTCRtpSender | null } = {};
        localSendersRef.current = localSenders;

        const remoteStream = isWebRuntime ? new MediaStream() : new nativeWebRTC.MediaStream();
        remoteStreamRef.current = remoteStream;
        startMediaNudgeTimer();

        pc.ontrack = (ev: RTCTrackEvent) => {
          if (!ev.track) return;
          syncRemoteTracksFromPeerConnection(pc);
        };

        pc.onnegotiationneeded = () => {
          if (
            shouldIgnoreNegotiationNeeded({
              isNativeRuntime: !isWebRuntime,
              connectionState: pc.connectionState,
              callState: callStateRef.current,
              offerNegotiationInFlight: callerOfferNegotiationInFlight,
              negotiationLocked: isCallerNegotiationLocked(pc),
            })
          ) {
            logCallPhase(callId, 'negotiation_needed_ignored', {
              connectionState: pc.connectionState,
              signalingState: pc.signalingState,
            });
            return;
          }
        };

        pc.onicecandidate = (ev: RTCPeerConnectionIceEvent) => {
          if (ev.candidate) {
            const candidateJson = ev.candidate.toJSON();
            localGatheredIceRef.current.push(candidateJson);
            const { type: iceType, protocol: iceProtocol } = parseIceCandidateMeta(
              candidateJson?.candidate ?? null,
            );
            logCallPhase(callId, 'ice_local', { type: iceType, protocol: iceProtocol });
            logIceLocal({ callId, role, type: iceType, protocol: iceProtocol });
            // Livraison fiable (ré-essai sur reconnexion) au lieu de fire-and-forget.
            iceOutbox.enqueue(candidateJson);
          } else {
            logIceLocal({ callId, role, type: null, protocol: null, end: true });
            iceOutbox.enqueue(null);
          }
        };

        pc.onicegatheringstatechange = () => {
          if (pcTearingDownRef.current) return;
          logPcStatesSnapshot('ice_gathering_state_change');
        };

        pc.onconnectionstatechange = () => {
          if (pcTearingDownRef.current) return;
          const s = pc.connectionState;
          logCallPhase(callId, 'pc_state', { connectionState: s });
          logPcStatesSnapshot('connection_state_change');
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
                remoteSdpHasVideo: remoteSdpHasVideo(),
                forceTurnRelay: callForceTurnRelay(),
              })
            ) {
              clearConnectionWatchdog();
            }
            enableRemoteAudioTracks(remote);
            if (!isWebRuntime) {
              refreshNativeRemoteAudioPlayback('pc_connected', pc);
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
          logPcStatesSnapshot('ice_connection_state_change');
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
                remoteSdpHasVideo: remoteSdpHasVideo(),
                forceTurnRelay: callForceTurnRelay(),
              })
            ) {
              clearConnectionWatchdog();
            }
            enableRemoteAudioTracks(remote);
            if (!isWebRuntime) {
              refreshNativeRemoteAudioPlayback('ice_connected', pc);
            }
            maybeMarkCallConnected(remote, 'audio');
          }
          if (ice === 'failed') {
            void (async () => {
              if (shouldDeferConnectionWatchdogIceRestart(callerOfferNegotiationInFlight)) {
                armConnectionWatchdog();
                return;
              }
              if (
                shouldDeferIceRestartOffer({
                  role,
                  negotiationLocked: isCallerNegotiationLocked(pc),
                  callerOfferSent: callerOfferSentRef.current,
                  hasRemoteDescription: Boolean(pc.remoteDescription),
                })
              ) {
                armConnectionWatchdog();
                return;
              }
              if (!restartAttempted) {
                restartAttempted = true;
                try {
                  // Web : createOffer({ iceRestart }) + SDP — restartIce() seul perd iceTransportPolicy relay.
                  if (!isWebRuntime && typeof pc.restartIce === 'function') {
                    pc.restartIce();
                    logCallPhase(callId, 'ice_restart_native', { method: 'restartIce' });
                    armConnectionWatchdog();
                    return;
                  }
                  const prunedMediaRestart = pruneRedundantCallTransceivers(pc);
                  if (prunedMediaRestart) {
                    logCallPhase(callId, 'transceivers_pruned', {
                      stopped: prunedMediaRestart,
                      source: 'media_watchdog_ice_restart',
                    });
                  }
                  const restartOffer = await pc.createOffer({ iceRestart: true });
                  await applyLocalDescription(pc, restartOffer);
                  await sendSdpFromPeerConnection(pc, restartOffer);
                  if (!isWebRuntime) {
                    refreshNativeRemoteAudioPlayback('media_watchdog_ice_restart', pc);
                  }
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
                audioTracks: preAcquiredWebStream?.getAudioTracks?.().length ?? 0,
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
          audioTracks: local?.getAudioTracks?.().length ?? 0,
          videoTracks: local?.getVideoTracks?.().length ?? 0,
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
        if (isWebRuntime && webListenOnlyRef.current && !local?.getAudioTracks?.().length) {
          try {
            const tx = pc.addTransceiver('audio', { direction: 'recvonly' });
            localSenders.audio = tx.sender;
            logCallPhase(callId, 'web_listen_only_transceiver', {});
          } catch (listenOnlyErr) {
            devWarn('[Call] listen-only transceiver failed', listenOnlyErr);
          }
        }
        await attachLocalTracksToPeerConnection(pc, local, localSenders, isWebRuntime);
        callerLocalTracksAttachedRef.current = peerConnectionHasActiveAudioSender(pc);
        if (!isWebRuntime) {
          logPatchAudioFixActive({
            phase: 'local_tracks_attached',
            callId,
            tag: CALL_NATIVE_AUDIO_FIX_TAG,
            audioTracks: local?.getAudioTracks?.().length ?? 0,
            txCount: pc.getTransceivers?.().length ?? -1,
            senderCount: pc.getSenders?.().length ?? -1,
            bootstrapAttached: callerLocalTracksAttachedRef.current,
          });
        }
        ensureLocalAudioTracksEnabled(local);
        if (shouldOptimizeCallAudioBeforeFirstNegotiation(isWebRuntime)) {
          await optimizeCallAudioPipeline(pc, voiceBitrateRef.current);
        }
        callerBootstrapReadyRef.current = true;
        logCallPhase(callId, 'caller_bootstrap_ready', {
          role,
          audioTracks: local?.getAudioTracks?.().length ?? 0,
        });
        logAfwCall('caller_bootstrap_ready', {
          callId,
          role,
          audioTracks: local?.getAudioTracks?.().length ?? 0,
          videoTracks: local?.getVideoTracks?.().length ?? 0,
        });
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
          const invitePayload = {
            callId: callIdRef.current,
            fromUserId: myUserId,
            toUserId: otherUserId,
            type: startedAsVideo ? 'video' : 'audio',
            callerName: user?.full_name || user?.username || 'Quelqu’un',
            callerAvatar: user?.profile_image || user?.avatar || '',
          };
          logAfwCall('invite_emit', { ...invitePayload, role });
          const invited = await socketService.ensureConnectedEmit('call:invite', invitePayload);
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
            void queueCallerOfferAfterAccept('post_invite');
          }
        } else {
          // Receveur : PC prêt avant accept — indispensable si l’app a été ouverte depuis une notification push.
          logAfwCall('accept_emit', {
            callId: callIdRef.current,
            toCaller: otherUserId,
            type: startedAsVideo ? 'video' : 'audio',
            role,
          });
          const accepted = await socketService.ensureConnectedEmit(
            'call:accept',
            buildCallAcceptPayload({
              callId: callIdRef.current,
              accepterUserId: myUserId,
              callerUserId: otherUserId,
              type: startedAsVideo ? 'video' : 'audio',
            }),
          );
          logAfwCall('accept_emit_result', { callId: callIdRef.current, accepted });
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
          await flushPendingSignals();
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
            const prunedUpgrade = pruneRedundantCallTransceivers(activePc);
            if (prunedUpgrade) {
              logCallPhase(callIdRef.current, 'transceivers_pruned', {
                stopped: prunedUpgrade,
                source: 'upgrade_video',
              });
            }
            const offer = await activePc.createOffer(callSdpNegotiationOptions());
            await applyLocalDescription(activePc, offer);
            const localUpgradeOffer = activePc.localDescription;
            logCallPhase(callIdRef.current, 'upgrade_video_offer', {
              hasVideo: sdpContainsMedia(localUpgradeOffer?.sdp ?? offer.sdp, 'video'),
            });
            await sendSdpFromPeerConnection(activePc, offer);
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
          Alert.alert(
            'Permission requise',
            startedAsVideo
              ? 'Autorisez le micro et la caméra dans les réglages pour passer un appel vidéo.'
              : 'Autorisez le micro dans les réglages pour passer un appel vocal.',
            [
              { text: 'Annuler', style: 'cancel' },
              {
                text: 'Ouvrir les réglages',
                onPress: () => {
                  void Linking.openSettings();
                },
              },
            ],
          );
        } else {
          setErrorMsg(callMediaErrorMessage(e, startedAsVideo));
        }
        finishCall('failed');
      }
    };

    let mediaNudgeTimer: ReturnType<typeof setInterval> | null = null;
    const clearMediaNudgeTimer = () => {
      if (mediaNudgeTimer) {
        clearInterval(mediaNudgeTimer);
        mediaNudgeTimer = null;
      }
    };
    const runMediaNudgeTick = () => {
      if (
        !shouldRunDeferredCallMediaNudge({
          cancelled,
          pc: pcRef.current,
          tearingDown: pcTearingDownRef.current,
        })
      ) {
        return;
      }
      const pc = pcRef.current as RTCPeerConnection;
      syncRemoteTracksFromPeerConnection(pc);
      const remote = remoteStreamRef.current as MediaStream | null;
      enableRemoteAudioTracks(remote);
      if (remotePlaybackStreamRef.current) {
        enableRemoteAudioTracks(remotePlaybackStreamRef.current);
      }
      if (!isWebRuntime) {
        refreshNativeRemoteAudioPlayback('media_nudge', pc);
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
            remoteSdpHasVideo: remoteSdpHasVideo(),
            forceTurnRelay: callForceTurnRelay(),
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
    };
    const startMediaNudgeTimer = () => {
      if (mediaNudgeTimer || cancelled) return;
      mediaNudgeTimer = setInterval(runMediaNudgeTick, 1000);
    };

    void start();

    return () => {
      cancelled = true;
      callerBootstrapReadyRef.current = false;
      callerLocalTracksAttachedRef.current = false;
      cancelWebMediaConsent();
      clearMediaNudgeTimer();
      offSignal();
      offAccept();
      offEnd();
      offDecline();
      offMissed();
      offInviteAck();
      offIceReflush();
      iceOutbox.close();
      clearOfferResendTimers();
      prepareNativeRtcViewUnmount();
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
        local?.getAudioTracks?.().forEach((t) => (t.enabled = !next));
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
        local?.getVideoTracks?.().forEach((t) => (t.enabled = !next));
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
    if (callState !== 'connected') {
      setRemoteVideoDecoding(false);
      lastInboundCallBytesRef.current = null;
      inboundMediaStallSinceRef.current = null;
      postConnectedMediaRecoveryDoneRef.current = false;
      return;
    }
    const connectedAt = Date.now();
    const tick = () => {
      const pc = pcRef.current as RTCPeerConnection | null;
      if (!pc?.getStats) return;
      void pc.getStats().then((report) => {
        const q = connectionQualityFromRtcStatsReport(report);
        const ice = iceSelectedCandidateFromRtcStatsReport(report);
        const rtp = rtpMediaStatsFromRtcStatsReport(report);
        const transport = transportStatsFromRtcStatsReport(report);
        if ((rtp.video?.framesDecoded ?? 0) > 0) {
          setRemoteVideoDecoding(true);
        }
        setConnectionDisplay({
          labelFr: q.labelFr,
          bars: q.bars,
          quality: q.quality,
        });
        logCallPhase(callIdRef.current, 'stats', {
          quality: q.quality,
          labelFr: q.labelFr,
        });
        logIceSelectedCandidate({
          callId: callIdRef.current,
          localType: ice.localType,
          remoteType: ice.remoteType,
          protocol: ice.protocol,
          relayUsed: ice.relayUsed,
        });
        logRtpMediaStats({
          callId: callIdRef.current,
          audio: rtp.audio,
          video: rtp.video,
        });
        logCallTransportStats({
          callId: callIdRef.current,
          dtlsState: transport.dtlsState,
          iceState: transport.iceState,
          bytesSent: transport.bytesSent,
          bytesReceived: transport.bytesReceived,
          selectedPairBytesSent: transport.selectedPairBytesSent,
          selectedPairBytesReceived: transport.selectedPairBytesReceived,
          hasSelectedPair: transport.hasSelectedPair,
        });

        // Verdict média consolidé : cause racine en UNE ligne (Maroc↔Mali « connecté mais muet »).
        const verdict = classifyConnectedCallMediaVerdict({
          dtlsState: transport.dtlsState,
          hasSelectedPair: transport.hasSelectedPair,
          audioBytesReceived: rtp.audio?.bytesReceived ?? 0,
          audioBytesSent: rtp.audio?.bytesSent ?? 0,
          connectedForMs: Date.now() - connectedAt,
        });
        logCallMediaVerdict({
          callId: callIdRef.current,
          role,
          verdict: verdict.verdict,
          reason: verdict.reason,
          oneWay: verdict.oneWay,
          relay: ice.relayUsed,
          localType: ice.localType,
          remoteType: ice.remoteType,
          dtls: transport.dtlsState,
          audioIn: rtp.audio?.bytesReceived ?? 0,
          audioOut: rtp.audio?.bytesSent ?? 0,
          videoIn: rtp.video?.bytesReceived ?? 0,
          framesDecoded: rtp.video?.framesDecoded ?? 0,
        });

        // CAS Maroc↔Mali : appel « connected » mais paire ICE morte (0 octet reçu) → 1 ICE restart.
        const inboundBytes = transport.selectedPairBytesReceived ?? transport.bytesReceived ?? 0;
        const prevBytes = lastInboundCallBytesRef.current;
        const inboundBytesIncreased = prevBytes == null ? true : inboundBytes > prevBytes;
        lastInboundCallBytesRef.current = inboundBytes;
        const nowTs = Date.now();
        if (inboundBytesIncreased) {
          inboundMediaStallSinceRef.current = null;
        } else if (inboundMediaStallSinceRef.current == null) {
          inboundMediaStallSinceRef.current = nowTs;
        }
        const stalledMs =
          inboundMediaStallSinceRef.current == null ? 0 : nowTs - inboundMediaStallSinceRef.current;
        if (
          shouldRecoverStalledConnectedCallMedia({
            role,
            callConnected: callStateRef.current === 'connected',
            hasSelectedPair: transport.hasSelectedPair,
            inboundBytesIncreased,
            stalledMs,
            alreadyRecovered: postConnectedMediaRecoveryDoneRef.current,
          }) ||
          shouldIceRestartFromConnectedMediaVerdict({
            role,
            verdict: verdict.verdict,
            alreadyRecovered: postConnectedMediaRecoveryDoneRef.current,
          })
        ) {
          postConnectedMediaRecoveryDoneRef.current = true;
          logCallPhase(callIdRef.current, 'media_stall_recover', { stalledMs });
          void triggerIceRestartRef.current?.();
        }
      });
    };
    tick();
    const id = setInterval(tick, 2500);
    return () => clearInterval(id);
  }, [callState, role]);

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
  /**
   * Connecté mais flux vidéo distant encore muet (frames pas décodées) → scrim
   * léger « Vidéo en cours… » au lieu d'un écran noir trompeur. Recalculé à
   * chaque tick du chronomètre (re-render 1 s). N'enlève PAS la RTCView : le
   * scrim est translucide, donc aucun risque de masquer une vidéo qui peint.
   */
  const remoteVideoFramesLive =
    remoteVideoLive &&
    isVideoCall &&
    (remoteVideoDecoding ||
      streamHasRenderableRemoteVideo(remoteStreamRef.current as MediaStream | null));
  const showRemoteVideoBuffering = remoteVideoLive && isVideoCall && !remoteVideoFramesLive;

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

  const hasRemoteSdp = Boolean((pcRef.current as RTCPeerConnection | null)?.remoteDescription);
  /** RTCView distant vocal — `connecting` dès URL valide. */
  const showNativeRemoteVoiceRtc = shouldShowNativeRemoteAudioRtc({
    isWeb,
    nativeRtcUnmounting,
    callState,
    isVideoCall,
    remoteStreamUrl,
    localStreamUrl,
  });
  /** RTCView vidéo plein écran — `connected` uniquement (garde anti-crash sonnerie). */
  const showNativeRemoteVideoMain = shouldShowNativeRemoteVideoRtc({
    isWeb,
    nativeRtcUnmounting,
    callState,
    remoteStreamUrl,
    localStreamUrl,
  });
  /** Secours audio vidéo — dès SDP distant (Xiaomi/Samsung). */
  const showNativeRemoteVideoAudioBackup = shouldShowNativeRemoteVideoAudioBackup({
    isWeb,
    nativeRtcUnmounting,
    callState,
    remoteStreamUrl,
    localStreamUrl,
    hasRemoteDescription: hasRemoteSdp,
  });
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
      {showNativeRemoteVoiceRtc ? (
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
      {showNativeRemoteVideoAudioBackup ? (
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
                ) : showRemoteVideoBuffering && peerVideoFullscreen ? (
                  <View style={[styles.videoPlaceholder, styles.videoBufferingOverlay]} pointerEvents="none">
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.videoPlaceholderText}>Vidéo en cours…</Text>
                  </View>
                ) : null}
              </View>
            ) : showNativeRemoteVideoMain ? (
              <View style={StyleSheet.absoluteFill}>
                <SafeNativeRtcView
                  debugLabel="remote-video"
                  key={`remote-video-${remoteStreamKey}`}
                  streamURL={remoteStreamUrl}
                  style={styles.nativeVideoFill}
                  objectFit="cover"
                  // Android react-native-webrtc: seul `zOrder` (int) est lu (0=sous-fenêtre, 2=onTop).
                  // Le flux PiP doit être onTop (2) pour ne JAMAIS dépendre de l'ordre d'attache des
                  // SurfaceView (sinon la miniature disparaît côté appelant). Plein écran reste 0.
                  zOrder={peerVideoFullscreen ? 0 : 2}
                />
                {showRemoteWaitingOverlay && peerVideoFullscreen ? (
                  <View style={[styles.videoPlaceholder, styles.videoPlaceholderOverlay]}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.videoPlaceholderText}>
                      {callState === 'ringing' ? 'En attente de réponse…' : 'Connexion vidéo…'}
                    </Text>
                  </View>
                ) : showRemoteVideoBuffering && peerVideoFullscreen ? (
                  <View style={[styles.videoPlaceholder, styles.videoBufferingOverlay]} pointerEvents="none">
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.videoPlaceholderText}>Vidéo en cours…</Text>
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
                    // PiP (vue locale quand le distant est plein écran) → onTop (2) pour rester
                    // au-dessus du plein écran quel que soit le rôle. En plein écran local → 0.
                    zOrder={peerVideoFullscreen ? 2 : 0}
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
  /** Scrim translucide : visible si le flux vidéo distant est encore muet, sans masquer une vidéo qui peint. */
  videoBufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,17,29,0.35)',
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
