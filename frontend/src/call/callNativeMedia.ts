import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { PermissionsAndroid, Platform } from 'react-native';
import { safeGetAudioTracks } from './callStreamTracks';
import { type VideoQualityProfile } from './callNetworkConfig';
import { tryLoadReactNativeWebRtc } from './tryLoadReactNativeWebRtc';

type InCallManagerLike = {
  start: (opts: { media: string; auto?: boolean; ringback?: string }) => void;
  stop: (opts?: { busytone?: string }) => void;
  stopRingback: () => void;
  setSpeakerphoneOn: (on: boolean) => void;
  setForceSpeakerphoneOn: (on: boolean) => void;
};

let inCallManagerLoaderOverride: (() => InCallManagerLike | null) | null = null;

function loadInCallManager(): InCallManagerLike | null {
  if (inCallManagerLoaderOverride) return inCallManagerLoaderOverride();
  if (Platform.OS === 'web') return null;
  try {
    const mod = require('react-native-incall-manager') as { default?: InCallManagerLike };
    return mod?.default ?? null;
  } catch {
    return null;
  }
}

/** Vitest — injecte un faux InCallManager (le mock `require` est fragile avec l’alias RN). */
export function __setInCallManagerLoaderForTests(loader: (() => InCallManagerLike | null) | null): void {
  inCallManagerLoaderOverride = loader;
}

let incallSessionActive = false;

/** Tests Vitest — réinitialise la session InCallManager entre les cas. */
export function resetNativeCallAudioSessionForTests(): void {
  incallSessionActive = false;
}

/** Au moins une piste `live` — évite `play()` sur `new MediaStream()` vide (Firefox : « URI invalide »). */
export function streamHasActiveMediaTracks(stream: MediaStream | null | undefined): boolean {
  if (!stream?.getTracks) return false;
  return stream.getTracks().some((t) => t.readyState === 'live');
}

/** Piste non terminée — permet l’aperçu local pendant que la caméra passe à `live`. */
export function streamHasPlayableMediaTracks(stream: MediaStream | null | undefined): boolean {
  if (!stream?.getTracks) return false;
  return stream.getTracks().some((t) => t.readyState !== 'ended');
}

export function buildCallAudioConstraints(): MediaTrackConstraints {
  /** `latency` est supporté par Chrome/Firefox mais absent des typings DOM — cast ciblé. */
  return {
    echoCancellation: { ideal: true },
    noiseSuppression: { ideal: true },
    /** Désactivé : l’AGC amplifie souvent le bruit ambiant (ventilateur, rue, clavier). */
    autoGainControl: { ideal: false },
    channelCount: { ideal: 1 },
    sampleRate: { ideal: 48_000 },
    latency: { ideal: 0.01, max: 0.03 },
  } as MediaTrackConstraints;
}

/** Renforce annulation d’écho / suppression de bruit après capture micro. */
export async function applyCallAudioProcessingToTrack(
  track: MediaStreamTrack | null | undefined,
): Promise<void> {
  try {
    if (!track || track.kind !== 'audio' || typeof track.applyConstraints !== 'function') return;
    const attempts: MediaTrackConstraints[] = [buildCallAudioConstraints()];
    if (Platform.OS === 'web') {
      attempts.unshift({
        ...buildCallAudioConstraints(),
        ...({ voiceIsolation: true } as MediaTrackConstraints),
        ...({ echoCancellationType: 'system' } as MediaTrackConstraints),
      });
    }
    for (const constraints of attempts) {
      try {
        await track.applyConstraints(constraints);
        return;
      } catch {
        /* contrainte suivante */
      }
    }
  } catch {
    /* best-effort — ne jamais faire échouer getUserMedia */
  }
}

/** WebRTC navigateur exige HTTPS ou localhost pour getUserMedia. */
export function assertWebRtcSecureContext(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  if (window.isSecureContext) return;
  throw new DOMException(
    'Les appels nécessitent HTTPS ou localhost. Ouvrez AfriWonder via https:// ou http://localhost.',
    'SecurityError',
  );
}

export function buildCallVideoConstraints(profile: VideoQualityProfile): MediaTrackConstraints {
  return {
    width: { ideal: profile.width },
    height: { ideal: profile.height },
    frameRate: { ideal: profile.frameRate, max: profile.frameRate },
    facingMode: 'user',
  };
}

export type AcquireCallLocalMediaResult = {
  stream: MediaStream;
  /** `false` si appel vidéo demandé mais seule la caméra a échoué (micro OK). */
  videoAcquired: boolean;
};

/** Firefox renvoie parfois NotFoundError au lieu de NotAllowedError quand le micro est bloqué. */
export function isFirefoxStyleMediaNotFoundError(error: unknown): boolean {
  const msg = String((error as Error)?.message || '').toLowerCase();
  return (
    msg.includes('can not be found')
    || msg.includes('cannot be found')
    || msg.includes('introuvable')
  );
}

async function refineWebMediaAccessError(error: unknown): Promise<unknown> {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return error;
  if (!(error instanceof DOMException) || error.name !== 'NotFoundError') return error;
  if (!isFirefoxStyleMediaNotFoundError(error)) return error;
  try {
    const perm = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    if (perm.state === 'denied') {
      return new DOMException('Permission micro refusée.', 'NotAllowedError');
    }
  } catch {
    /* Permissions API indisponible — garder l’erreur d’origine */
  }
  return error;
}

async function acquireCallAudioStream(mediaDevices: MediaDevices): Promise<MediaStream> {
  assertWebRtcSecureContext();
  /** Web : contraintes minimales d’abord (invite permission navigateur plus fiable). */
  const attempts: MediaStreamConstraints[] =
    Platform.OS === 'web'
      ? [
          { audio: buildCallAudioConstraints(), video: false },
          { audio: true, video: false },
        ]
      : [
          { audio: buildCallAudioConstraints(), video: false },
          { audio: true, video: false },
        ];

  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      const stream = await mediaDevices.getUserMedia(constraints);
      await applyCallAudioProcessingToTrack(stream.getAudioTracks()[0]);
      return stream;
    } catch (e) {
      lastError = e;
    }
  }

  if (Platform.OS === 'web' && typeof mediaDevices.enumerateDevices === 'function') {
    try {
      const devices = await mediaDevices.enumerateDevices();
      const inputs = devices.filter((d) => d.kind === 'audioinput');
      for (const input of inputs) {
        if (!input.deviceId) continue;
        try {
          const stream = await mediaDevices.getUserMedia({
            audio: { ...buildCallAudioConstraints(), deviceId: { ideal: input.deviceId } },
            video: false,
          });
          await applyCallAudioProcessingToTrack(stream.getAudioTracks()[0]);
          return stream;
        } catch (e) {
          lastError = e;
        }
      }
    } catch (e) {
      lastError = e;
    }
  }

  if (lastError instanceof DOMException || lastError instanceof Error) {
    throw await refineWebMediaAccessError(lastError);
  }
  throw new DOMException('Aucun micro détecté sur cet appareil.', 'NotFoundError');
}

/**
 * Capture micro d’abord, puis caméra en flux séparé — si la vidéo échoue (caméra occupée,
 * 2 onglets web sur la même machine), l’appel continue en audio local plutôt que de couper.
 */
/**
 * À appeler **synchroniquement** depuis un handler clic/touch (web).
 * Le navigateur n’accorde le micro que si `getUserMedia` est invoqué pendant le geste utilisateur.
 */
export function beginWebCallMediaCapture(input: {
  mediaDevices: MediaDevices;
  wantVideo: boolean;
}): Promise<MediaStream> {
  assertWebRtcSecureContext();
  const promise = input.mediaDevices.getUserMedia({
    audio: buildCallAudioConstraints(),
    video: input.wantVideo
      ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      : false,
  });
  void promise.then((stream) => {
    void applyCallAudioProcessingToTrack(stream?.getAudioTracks?.()?.[0]);
  });
  return promise;
}

export type WebCallAudioProbe = {
  inputCount: number;
  labeledCount: number;
  permissionState: PermissionState | 'unknown';
};

/** Diagnostic navigateur — utile quand Firefox renvoie NotFoundError sans popup. */
export async function probeWebCallAudioInputs(): Promise<WebCallAudioProbe> {
  let permissionState: PermissionState | 'unknown' = 'unknown';
  if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
    try {
      const perm = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      permissionState = perm.state;
    } catch {
      /* Permissions API indisponible */
    }
  }
  let inputCount = 0;
  let labeledCount = 0;
  if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter((d) => d.kind === 'audioinput');
      inputCount = inputs.length;
      labeledCount = inputs.filter((d) => Boolean(d.label)).length;
    } catch {
      /* ignore */
    }
  }
  return { inputCount, labeledCount, permissionState };
}

export function webCallAudioProbeHint(probe: WebCallAudioProbe): string | null {
  if (probe.permissionState === 'denied') {
    return 'Micro bloqué pour ce site. Cliquez le cadenas dans la barre d’adresse → Microphone → Autoriser.';
  }
  if (probe.inputCount === 0) {
    return 'Aucun micro détecté par le navigateur. Branchez un micro ou activez-le dans Paramètres Windows → Son → Entrée.';
  }
  if (probe.labeledCount === 0 && probe.permissionState !== 'granted') {
    return 'Autorisez le micro dans la popup du navigateur, puis réessayez.';
  }
  return null;
}

export async function acquireCallLocalMedia(input: {
  mediaDevices: MediaDevices;
  wantVideo: boolean;
  videoProfile: VideoQualityProfile | null;
  /** Web : flux déjà capturé dans le handler clic (évite perte du geste utilisateur). */
  preAcquiredStream?: MediaStream | null;
  /** Web : poursuivre sans envoi micro (écoute seule). */
  listenOnly?: boolean;
}): Promise<AcquireCallLocalMediaResult> {
  const { mediaDevices, wantVideo, videoProfile, preAcquiredStream, listenOnly } = input;
  if (listenOnly && preAcquiredStream) {
    return { stream: preAcquiredStream, videoAcquired: false };
  }
  let audioStream: MediaStream;
  if (preAcquiredStream?.getAudioTracks?.().length) {
    audioStream = preAcquiredStream;
    await applyCallAudioProcessingToTrack(audioStream.getAudioTracks()[0]);
  } else {
    audioStream = await acquireCallAudioStream(mediaDevices);
  }

  const preVideoTrack = audioStream.getVideoTracks?.()[0];
  if (!wantVideo) {
    return { stream: audioStream, videoAcquired: false };
  }
  if (preVideoTrack && preVideoTrack.readyState !== 'ended') {
    return { stream: audioStream, videoAcquired: true };
  }

  const profileVideo = videoProfile ? buildCallVideoConstraints(videoProfile) : { facingMode: 'user' as const };
  const videoAttempts: MediaStreamConstraints[] = [
    { audio: false, video: profileVideo },
    { audio: false, video: { facingMode: 'user' } },
    { audio: false, video: true },
  ];

  for (const constraints of videoAttempts) {
    let videoStream: MediaStream | null = null;
    try {
      videoStream = await mediaDevices.getUserMedia(constraints);
      const videoTrack = videoStream.getVideoTracks()[0];
      if (!videoTrack) {
        videoStream.getTracks().forEach((t) => t.stop());
        continue;
      }
      audioStream.addTrack(videoTrack);
      videoStream.getTracks().forEach((t) => {
        if (t !== videoTrack) t.stop();
      });
      return { stream: audioStream, videoAcquired: true };
    } catch {
      videoStream?.getTracks().forEach((t) => t.stop());
    }
  }

  return { stream: audioStream, videoAcquired: false };
}

/** Message utilisateur lisible pour les erreurs `getUserMedia`. */
export function callMediaErrorMessage(error: unknown, wantVideo: boolean): string {
  const name = error instanceof DOMException ? error.name : '';
  const msg = String((error as Error)?.message || '').toLowerCase();
  const isNative = Platform.OS !== 'web';
  if (name === 'NotAllowedError' || msg.includes('permission') || msg.includes('notallowed')) {
    if (isNative) {
      return wantVideo
        ? 'Permission micro / caméra refusée. Autorisez-les dans Réglages → AfriWonder.'
        : 'Permission micro refusée. Autorisez le micro dans Réglages → AfriWonder.';
    }
    return wantVideo
      ? 'Permission micro / caméra refusée. Autorisez l’accès dans la barre d’adresse du navigateur.'
      : 'Permission micro refusée. Autorisez le micro dans la barre d’adresse du navigateur.';
  }
  if (isFirefoxStyleMediaNotFoundError(error)) {
    return wantVideo
      ? 'Micro ou caméra introuvable. Autorisez l’accès (cadenas) et vérifiez les permissions Windows.'
      : 'Micro introuvable. Autorisez le micro (cadenas) et vérifiez Paramètres Windows → Confidentialité → Microphone.';
  }
  if (name === 'NotFoundError' || msg.includes('notfound')) {
    return wantVideo ? 'Aucune caméra détectée sur cet appareil.' : 'Aucun micro détecté sur cet appareil.';
  }
  if (
    name === 'NotReadableError'
    || msg.includes('could not start video')
    || msg.includes('could not start audio')
    || msg.includes('device in use')
  ) {
    return wantVideo
      ? 'Caméra ou micro indisponible. Fermez l’autre onglet ou application qui les utilise, puis réessayez.'
      : 'Micro indisponible. Fermez l’autre onglet qui l’utilise, puis réessayez.';
  }
  if (name === 'OverconstrainedError' || msg.includes('overconstrained')) {
    return 'Configuration caméra non supportée — réessayez ou passez en appel vocal.';
  }
  if (name === 'SecurityError' || msg.includes('secure context')) {
    return 'Les appels web nécessitent HTTPS ou localhost (pas une IP en http://).';
  }
  return 'Impossible de démarrer l’appel.';
}

/** `mediaDevices` après `registerGlobals()` — pas seulement l’export nommé du module. */
export function resolveWebRtcMediaDevices(): MediaDevices | undefined {
  if (Platform.OS === 'web') {
    return typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
  }
  const mod = tryLoadReactNativeWebRtc() as { mediaDevices?: MediaDevices } | null;
  const fromModule = mod?.mediaDevices;
  const fromNavigator =
    typeof navigator !== 'undefined'
      ? (navigator as Navigator & { mediaDevices?: MediaDevices }).mediaDevices
      : undefined;
  return fromModule || fromNavigator;
}

/** Micro local actif avant createOffer/createAnswer (émission bidirectionnelle). */
export function ensureLocalAudioTracksEnabled(stream: MediaStream | null | undefined): void {
  for (const track of safeGetAudioTracks(stream)) {
    if (track.readyState === 'ended') continue;
    try {
      track.enabled = true;
    } catch {
      /* ignore */
    }
  }
}

/** Tag livraison — visible Logcat (`PATCH_AUDIO_FIX_ACTIVE`). */
export const CALL_NATIVE_AUDIO_FIX_TAG = '2026-06-09-v3';

/**
 * Natif : aucun addTransceiver avant getUserMedia (audio ni vidéo).
 * addTrack après getUserMedia — seul chemin stable react-native-webrtc Android.
 */
export function shouldPrenegotiateNativeVideoTransceiver(_wantVideo: boolean): boolean {
  return false;
}

/** @deprecated Préférer `shouldPrenegotiateNativeVideoTransceiver` (audio exclu). */
export function shouldPrenegotiateNativeSendrecvTransceivers(wantVideo: boolean): boolean {
  return shouldPrenegotiateNativeVideoTransceiver(wantVideo);
}

type MinimalOfferTransceiver = {
  sender?: { track?: { kind?: string; readyState?: string } | null } | null;
  direction?: string;
  currentDirection?: string;
};

/** Vocal natif : PC incohérent avant le 1er offer (doublons, recvonly, pas d’émetteur). */
export function needsNativeAudioOfferMediaReset(
  pc: RTCPeerConnection | null | undefined,
): boolean {
  if (!pc) return false;
  const transceivers = (pc.getTransceivers?.() ?? []) as MinimalOfferTransceiver[];
  if (!peerConnectionHasActiveAudioSender(pc)) return true;
  if (transceivers.length === 0) return true;
  if (transceivers.length > 1) return true;
  const tx = transceivers[0];
  const dir = String(tx?.currentDirection || tx?.direction || '').toLowerCase();
  if (dir === 'recvonly' || dir === 'inactive') return true;
  return false;
}

export type PrepareNativeAudioCallerOfferOptions = {
  /** 1re offre vocale native : reset systématique (état « OK » mais createOffer casse quand même). */
  force?: boolean;
};

/**
 * Réinitialise les transceivers avant createOffer (évite mid=0 recv parameters).
 * Retourne true si un reset a été effectué.
 */
export async function prepareNativeAudioCallerOffer(
  pc: RTCPeerConnection,
  local: MediaStream,
  options?: PrepareNativeAudioCallerOfferOptions,
): Promise<boolean> {
  if (!options?.force && !needsNativeAudioOfferMediaReset(pc)) return false;
  await recoverNativeAudioOfferMedia(pc, local);
  return true;
}

/**
 * Dernier recours vocal natif : stop transceivers incohérents puis addTrack propre.
 */
export async function recoverNativeAudioOfferMedia(
  pc: RTCPeerConnection,
  local: MediaStream,
): Promise<number> {
  let stopped = 0;
  for (const t of pc.getTransceivers?.() ?? []) {
    try {
      t.stop?.();
      stopped += 1;
    } catch {
      /* ignore */
    }
  }
  const audio = safeGetAudioTracks(local)[0];
  if (audio) {
    try {
      pc.addTrack(audio as MediaStreamTrack, local);
    } catch {
      /* ignore */
    }
  }
  return stopped;
}

/**
 * Natif avec transceiver sendrecv pré-créé : ne pas addTrack si replaceTrack échoue
 * (2e section audio → setLocalDescription « recv parameters mid=0 »).
 * Web (Firefox) : addTrack reste le repli documenté.
 */
export function shouldAddTrackAfterReplaceTrackFailure(
  isWebRuntime: boolean,
  hasPresetSender: boolean,
): boolean {
  if (!hasPresetSender) return false;
  return isWebRuntime;
}

export function findPeerConnectionSenderForKind(
  pc: RTCPeerConnection,
  kind: string,
): RTCRtpSender | undefined {
  return pc.getSenders?.().find((sender) => sender.track?.kind === kind);
}

/** Transceiver audio sans piste émise (addTransceiver orphelin avant addTrack). */
export function findOrphanNativeAudioTransceiver(
  pc: RTCPeerConnection,
): RTCRtpTransceiver | undefined {
  for (const tx of pc.getTransceivers?.() ?? []) {
    if (tx.sender?.track) continue;
    const rxKind = tx.receiver?.track?.kind;
    const dir = String(tx.direction || tx.currentDirection || '').toLowerCase();
    if (rxKind === 'audio' || dir.includes('send') || dir.includes('recv')) {
      return tx;
    }
  }
  return undefined;
}

export async function attachNativeAudioTrackToPeerConnection(
  pc: RTCPeerConnection,
  track: MediaStreamTrack,
  local: MediaStream,
): Promise<'skipped' | 'replaced' | 'added'> {
  const existingSender = findPeerConnectionSenderForKind(pc, 'audio');
  if (existingSender?.track?.id === track.id) return 'skipped';
  if (existingSender) {
    await existingSender.replaceTrack(track);
    return 'replaced';
  }
  const orphan = findOrphanNativeAudioTransceiver(pc);
  if (orphan?.sender) {
    await orphan.sender.replaceTrack(track);
    return 'replaced';
  }
  pc.addTrack(track, local);
  return 'added';
}

export async function attachLocalTracksToPeerConnection(
  pc: RTCPeerConnection,
  local: MediaStream,
  senders: { audio?: RTCRtpSender | null; video?: RTCRtpSender | null },
  isWebRuntime: boolean,
): Promise<void> {
  for (const track of local.getTracks()) {
    const existingSender = findPeerConnectionSenderForKind(pc, track.kind);
    if (existingSender?.track?.id === track.id) continue;

    if (!isWebRuntime && track.kind === 'audio') {
      await attachNativeAudioTrackToPeerConnection(pc, track, local);
      continue;
    }

    const presetSender = track.kind === 'video' ? senders.video : senders.audio;
    const sender = presetSender ?? existingSender;
    if (sender) {
      try {
        await sender.replaceTrack(track);
      } catch {
        if (shouldAddTrackAfterReplaceTrackFailure(isWebRuntime, Boolean(presetSender))) {
          if (!existingSender) {
            pc.addTrack(track, local);
          }
        }
      }
    } else if (!existingSender) {
      pc.addTrack(track, local);
    }
  }
}

export type PeerConnectionOfferDiagnostic = {
  senders: Array<{
    kind: string | null;
    trackId: string | null;
    readyState: string | null;
  }>;
  transceivers: Array<{
    mid: string | null;
    direction: string | null;
    currentDirection: string | null;
    senderKind: string | null;
    receiverKind: string | null;
  }>;
  signalingState: string | null;
};

/** Snapshot Logcat avant createOffer — détecte doublons audio / transceivers incohérents. */
export function summarizePeerConnectionForOffer(
  pc: RTCPeerConnection | null | undefined,
): PeerConnectionOfferDiagnostic {
  return {
    senders: (pc?.getSenders?.() ?? []).map((sender) => ({
      kind: sender.track?.kind ?? null,
      trackId: sender.track?.id ?? null,
      readyState: sender.track?.readyState ?? null,
    })),
    transceivers: (pc?.getTransceivers?.() ?? []).map((tx) => ({
      mid: tx.mid ?? null,
      direction: tx.direction ?? null,
      currentDirection: tx.currentDirection ?? null,
      senderKind: tx.sender?.track?.kind ?? null,
      receiverKind: tx.receiver?.track?.kind ?? null,
    })),
    signalingState: pc?.signalingState ?? null,
  };
}

/** Vérifie qu’au moins un expéditeur audio actif est attaché à la PeerConnection. */
export function peerConnectionHasActiveAudioSender(
  pc: RTCPeerConnection | null | undefined,
): boolean {
  return (pc?.getSenders?.() ?? []).some(
    (sender) =>
      sender.track?.kind === 'audio' &&
      sender.track.readyState !== 'ended' &&
      sender.track.enabled !== false,
  );
}

/** Volume react-native-webrtc `_setVolume` — 6 était trop bas sur Xiaomi/Samsung Mali. */
export const NATIVE_REMOTE_AUDIO_TRACK_VOLUME = 10;

/** Active les pistes audio distantes et monte le volume natif si disponible. */
export function enableRemoteAudioTracks(stream: MediaStream | null | undefined): void {
  for (const track of safeGetAudioTracks(stream)) {
    try {
      track.enabled = true;
      const vol = (track as { _setVolume?: (v: number) => void })._setVolume;
      if (typeof vol === 'function') {
        vol.call(track, NATIVE_REMOTE_AUDIO_TRACK_VOLUME);
      }
    } catch {
      /* ignore */
    }
  }
}

export async function requestNativeCallPermissions(isVideo: boolean): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  try {
    if (Platform.OS === 'android') {
      const audio = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );
      if (audio !== PermissionsAndroid.RESULTS.GRANTED) return false;
      if (isVideo) {
        const cam = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
        if (cam !== PermissionsAndroid.RESULTS.GRANTED) return false;
      }
      if (Number(Platform.Version) >= 31) {
        try {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          );
        } catch {
          /* Casque BT optionnel — ne bloque pas l’appel */
        }
      }
      return true;
    }
    const mic = await Audio.requestPermissionsAsync();
    if (!mic.granted) return false;
    if (isVideo) {
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (!cam.granted) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Tonalité d’attente appelant — `_DTMF_` (bip-bip), distincte de la sonnerie entrante (`_DEFAULT_` / expo-av). */
const NATIVE_OUTGOING_RINGBACK = '_DTMF_';

/**
 * Libère la session `expo-av` (sonnerie / feed) pour que `react-native-webrtc` prenne le micro + HP.
 * Ne pas appeler `setAudioModeAsync` juste avant getUserMedia — ça bloque l’audio des deux côtés.
 */
export async function releaseExpoAvForWebRtcCall(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Audio.setIsEnabledAsync(false);
  } catch {
    /* ignore */
  }
  try {
    await Audio.setIsEnabledAsync(true);
  } catch {
    /* ignore */
  }
}

/**
 * Session audio native pour appels WebRTC (HP / écouteur / micro).
 * `react-native-incall-manager` est recommandé sur Android — sinon fallback expo-av.
 */
/** Démarre la session audio native une seule fois par appel (InCallManager / expo-av). */
export async function startNativeCallAudioSession(
  isVideo: boolean,
  speakerOn: boolean,
  options?: { outgoingRingback?: boolean },
): Promise<void> {
  if (Platform.OS === 'web') return;
  if (incallSessionActive) {
    await applyNativeCallSpeakerRoute(speakerOn);
    return;
  }
  const incall = loadInCallManager();
  const ringback = options?.outgoingRingback ? NATIVE_OUTGOING_RINGBACK : '';
  if (incall) {
    try {
      incall.start({ media: isVideo ? 'video' : 'audio', auto: true, ringback });
      incall.setSpeakerphoneOn(speakerOn);
      incall.setForceSpeakerphoneOn(speakerOn);
      incallSessionActive = true;
      return;
    } catch {
      /* fallback expo-av */
    }
  }
  await applyNativeCallSpeakerRoute(speakerOn);
  incallSessionActive = true;
}

/** Coupe la tonalité d’attente appelant (InCallManager) quand le correspondant décroche. */
export async function stopNativeOutgoingRingback(): Promise<void> {
  if (Platform.OS === 'web') return;
  const incall = loadInCallManager();
  if (!incall) return;
  try {
    incall.stopRingback();
  } catch {
    /* ignore */
  }
}

export async function stopNativeCallAudioSession(): Promise<void> {
  if (Platform.OS === 'web' || !incallSessionActive) return;
  incallSessionActive = false;
  const incall = loadInCallManager();
  if (incall) {
    try {
      incall.stop();
    } catch {
      /* ignore */
    }
  }
}

/** Haut-parleur / écouteur — toggle utilisateur ou connexion établie. */
export async function applyNativeCallSpeakerRoute(speakerOn: boolean): Promise<void> {
  if (Platform.OS === 'web') return;
  const incall = loadInCallManager();
  if (incall && incallSessionActive) {
    try {
      incall.setSpeakerphoneOn(speakerOn);
      incall.setForceSpeakerphoneOn(speakerOn);
      return;
    } catch {
      /* fallback */
    }
  }
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: !speakerOn,
      staysActiveInBackground: true,
    });
  } catch {
    /* ignore */
  }
}
