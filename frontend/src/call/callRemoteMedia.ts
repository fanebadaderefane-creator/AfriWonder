/**
 * Helpers purs pour pistes distantes WebRTC (testables sans device).
 * ⛔ `shouldMarkCallConnected` / `hasRemoteDescription` : ne pas retirer sans lire call-signaling-locked.mdc
 */

export type MediaStreamLike = {
  getAudioTracks?: () => Array<{ id?: string; enabled?: boolean; readyState?: string; muted?: boolean }>;
  getVideoTracks?: () => Array<{ id?: string; enabled?: boolean; readyState?: string; muted?: boolean }>;
};

export function streamHasLiveAudio(stream: MediaStreamLike | null | undefined): boolean {
  const tracks = stream?.getAudioTracks?.() ?? [];
  return tracks.some((t) => t.readyState === 'live' && t.enabled !== false);
}

export function streamHasLiveVideo(stream: MediaStreamLike | null | undefined): boolean {
  const tracks = stream?.getVideoTracks?.() ?? [];
  return tracks.some((t) => t.readyState === 'live' && t.enabled !== false);
}

/** Piste vidéo distante présente (même `new`) — évite RTCView audio-only sur appel vidéo natif. */
export function streamHasRemoteVideoTrack(stream: MediaStreamLike | null | undefined): boolean {
  const tracks = stream?.getVideoTracks?.() ?? [];
  return tracks.some((t) => t.readyState !== 'ended');
}

/**
 * Vidéo distante réellement AFFICHABLE — piste `live`, activée et **démutée**
 * (frames décodées). Sert à distinguer « appel connecté mais flux vidéo encore
 * muet » (écran noir) d'une vidéo qui peint vraiment. Ne modifie PAS la
 * promotion `connected` (audio) : sert seulement à un overlay de chargement.
 */
export function streamHasRenderableRemoteVideo(stream: MediaStreamLike | null | undefined): boolean {
  const tracks = stream?.getVideoTracks?.() ?? [];
  return tracks.some(
    (t) => t.readyState === 'live' && t.enabled !== false && t.muted !== true,
  );
}

/** ICE prêt pour le média — `connected` ou `completed`. */
export function isIceConnectionReady(iceConnectionState?: string | null): boolean {
  const ice = String(iceConnectionState || '').toLowerCase();
  return ice === 'connected' || ice === 'completed';
}

/** Négociation ICE encore en cours — ne pas afficher « réseau bloqué » ni couper l'appel. */
export function isIceStillNegotiating(iceConnectionState?: string | null): boolean {
  const ice = String(iceConnectionState || '').toLowerCase();
  return ice === '' || ice === 'new' || ice === 'checking';
}

/** Piste distante minimale (MediaStreamTrack ou mock de test). */
export type RemoteMediaTrackLike = {
  id?: string;
  kind?: string;
};

/** Flux distant unifié — compatible MediaStream natif et mocks de test. */
export type RemoteStreamUnified = MediaStreamLike & {
  getAudioTracks?: () => Array<{ id?: string }>;
  getVideoTracks?: () => Array<{ id?: string }>;
  addTrack?: (track: RemoteMediaTrackLike) => void;
};

/** Fusionne une piste distante dans le MediaStream unifié (évite écrasement audio/vidéo). */
export function mergeRemoteTrackIntoStream(
  unified: RemoteStreamUnified,
  track: RemoteMediaTrackLike | null | undefined,
): boolean {
  if (!track?.id || typeof unified.addTrack !== 'function') return false;
  const existing = [
    ...(unified.getAudioTracks?.() ?? []),
    ...(unified.getVideoTracks?.() ?? []),
  ];
  if (existing.some((t) => t.id === track.id)) return false;
  try {
    unified.addTrack(track as unknown as MediaStreamTrack);
    return true;
  } catch {
    return false;
  }
}

/** Piste distante réellement reçue — `new` seul provoquait un faux « 00:00 » puis crash RTCView sur Android. */
function streamHasLiveRemoteTrack(
  tracks: Array<{ enabled?: boolean; readyState?: string }>,
): boolean {
  return tracks.some((t) => t.readyState === 'live' && t.enabled !== false);
}

/** Le chronomètre ne démarre que lorsque le média distant est prêt. */
export function shouldMarkCallConnected(input: {
  trackKind?: string;
  stream: MediaStreamLike | null | undefined;
  isVideo?: boolean;
  /** `RTCPeerConnection.connectionState` — filet si pistes `live` pas encore signalées. */
  peerConnectionState?: string;
  /** `RTCPeerConnection.iceConnectionState` — react-native-webrtc : audio joue avant `toURL()`. */
  iceConnectionState?: string | null;
  /** Appelant : exiger le décrochage socket (`call:accept`) avant « connecté ». */
  role?: 'caller' | 'receiver';
  peerAccepted?: boolean;
  /** SDP distant appliqué — évite pistes transceiver fantômes avant négociation. */
  hasRemoteDescription?: boolean;
  /** SDP distant contient `m=video` — si false, audio seul suffit (correspondant sans caméra). */
  remoteSdpHasVideo?: boolean;
}): boolean {
  void input.trackKind;
  if (input.role === 'caller' && input.peerAccepted === false) return false;
  if (input.hasRemoteDescription === false) return false;

  const stream = input.stream;
  const iceReady = isIceConnectionReady(input.iceConnectionState);
  const pcConnected = input.peerConnectionState === 'connected';

  /**
   * Natif Android/iOS : InCallManager route l'audio dès ICE `connected`, parfois
   * avant que les pistes distantes apparaissent `live` dans le MediaStream unifié
   * (symptôme prod : « Connexion média… » → « réseau bloqué » → coupure).
   */
  if (iceReady || pcConnected) {
    if (!input.isVideo) return true;
    if (streamHasLiveVideo(stream)) return true;
    /** Appel vidéo : ne pas marquer connecté sur ICE seul + audio (RTCView lié sans vidéo → écran noir). */
    if (streamHasRemoteVideoTrack(stream) && streamHasLiveAudio(stream)) return true;
    if (streamHasRemoteVideoTrack(stream) && streamHasLiveRemoteTrack(stream?.getVideoTracks?.() ?? [])) {
      return true;
    }
  }

  if (!stream) return false;

  const hasAudio = streamHasLiveAudio(stream);
  const hasVideo = streamHasLiveVideo(stream);
  const remoteVideoTracks = stream.getVideoTracks?.() ?? [];
  const remoteAudioTracks = stream.getAudioTracks?.() ?? [];

  if (!input.isVideo) {
    if (hasAudio) return true;
    if (pcConnected && streamHasLiveRemoteTrack(remoteAudioTracks)) return true;
    return false;
  }

  /** Appel vidéo : la vidéo distante suffit (Firefox route parfois l’audio via `<video>` sans piste audio dans le flux unifié). */
  if (hasVideo) return true;

  if (!hasAudio) {
    if (pcConnected && streamHasLiveRemoteTrack(remoteVideoTracks)) return true;
    if (pcConnected && streamHasLiveRemoteTrack(remoteAudioTracks)) return true;
    return false;
  }

  /** Correspondant sans caméra ou caméra coupée — audio distant `live` suffit. */
  if (remoteVideoTracks.length === 0 && hasAudio) {
    if (input.isVideo && input.remoteSdpHasVideo !== false) {
      return false;
    }
    return true;
  }
  if (remoteVideoTracks.length > 0 && !streamHasLiveRemoteTrack(remoteVideoTracks) && hasAudio) {
    return true;
  }

  return false;
}

export function collectTrackIds(stream: MediaStreamLike | null | undefined): Set<string> {
  const ids = new Set<string>();
  for (const t of stream?.getAudioTracks?.() ?? []) {
    if (t.id) ids.add(t.id);
  }
  for (const t of stream?.getVideoTracks?.() ?? []) {
    if (t.id) ids.add(t.id);
  }
  return ids;
}

/** Pas de pistes « distantes » avant SDP distant — évite le bruit sendrecv Android (mid=0). */
export function shouldSyncRemoteReceiverTracks(
  pc: { remoteDescription?: unknown } | null | undefined,
): boolean {
  return Boolean(pc?.remoteDescription);
}

/** Évite de traiter le micro/caméra local comme flux « distant » (faux 00:00 + crash RTCView). */
export function isTrackFromLocalCapture(
  track: { id?: string } | null | undefined,
  localTrackIds: Set<string>,
): boolean {
  const id = String(track?.id || '').trim();
  return Boolean(id && localTrackIds.has(id));
}

/** Prêt pour chronomètre + RTCView natif — au moins une piste distante `live`. */
export function remoteStreamReadyForConnectedUi(input: {
  stream: MediaStreamLike | null | undefined;
  isVideo: boolean;
  iceConnectionState?: string | null;
  hasRemoteDescription?: boolean;
  peerConnectionState?: string;
}): boolean {
  const stream = input.stream;
  const iceReady = isIceConnectionReady(input.iceConnectionState);
  const pcConnected = input.peerConnectionState === 'connected';

  if (input.hasRemoteDescription && (iceReady || pcConnected)) {
    if (!input.isVideo) return true;
    if (streamHasLiveVideo(stream)) return true;
    if (streamHasRemoteVideoTrack(stream) && streamHasLiveAudio(stream)) return true;
  }

  if (!stream) return false;
  // Vocal natif : sans SDP distant, une piste audio « live » peut être le micro local
  // (unified stream / receivers prématurés) — ne pas ouvrir RTCView ni logger remote_stream_updated.
  if (!input.isVideo && !input.hasRemoteDescription) {
    return false;
  }
  if (input.isVideo) {
    return streamHasLiveVideo(stream) || streamHasLiveAudio(stream);
  }
  return streamHasLiveAudio(stream);
}

/** Vocal + vidéo : une seule porte avant « connecté », chronomètre et RTCView natif. */
export function canPromoteCallToConnected(input: {
  stream: MediaStreamLike | null | undefined;
  isVideo: boolean;
  trackKind?: string;
  peerConnectionState?: string;
  iceConnectionState?: string | null;
  role?: 'caller' | 'receiver';
  peerAccepted?: boolean;
  hasRemoteDescription?: boolean;
  remoteSdpHasVideo?: boolean;
}): boolean {
  return (
    remoteStreamReadyForConnectedUi({
      stream: input.stream,
      isVideo: input.isVideo,
      iceConnectionState: input.iceConnectionState,
      hasRemoteDescription: input.hasRemoteDescription,
      peerConnectionState: input.peerConnectionState,
    }) &&
    shouldMarkCallConnected({
      stream: input.stream,
      isVideo: input.isVideo,
      trackKind: input.trackKind,
      peerConnectionState: input.peerConnectionState,
      iceConnectionState: input.iceConnectionState,
      role: input.role,
      peerAccepted: input.peerAccepted,
      hasRemoteDescription: input.hasRemoteDescription,
      remoteSdpHasVideo: input.remoteSdpHasVideo,
    })
  );
}

export function countLocalTracks(stream: MediaStreamLike | null | undefined): {
  audio: number;
  video: number;
} {
  return {
    audio: stream?.getAudioTracks?.().length ?? 0,
    video: stream?.getVideoTracks?.().length ?? 0,
  };
}

export function mediaStreamBindingKey(stream: MediaStreamLike | null | undefined): string {
  const tracks = [
    ...(stream?.getAudioTracks?.() ?? []),
    ...(stream?.getVideoTracks?.() ?? []),
  ];
  return tracks
    .map((t) => `${t.id || ''}:${t.readyState || ''}`)
    .sort()
    .join('|');
}

export type ReceiverTrackLike = {
  id: string;
  kind: string;
  readyState: string;
};

/** Une piste audio + une vidéo max — évite double décodage / voix qui se répète. */
/**
 * Natif vocal : binder `remoteStreamUrl` dès SDP distant + piste audio (même `readyState=new`).
 * Sans ça, RTCView distant ne monte pas sur Xiaomi/Samsung → pas d’audio entrant.
 */
export function shouldBindNativeRemoteStreamUrl(input: {
  isVideo: boolean;
  stream: MediaStreamLike | null | undefined;
  hasRemoteDescription?: boolean;
  iceConnectionState?: string | null;
  peerConnectionState?: string;
}): boolean {
  if (input.isVideo && !streamHasRemoteVideoTrack(input.stream)) {
    return false;
  }
  if (
    remoteStreamReadyForConnectedUi({
      stream: input.stream,
      isVideo: input.isVideo,
      iceConnectionState: input.iceConnectionState,
      hasRemoteDescription: input.hasRemoteDescription,
      peerConnectionState: input.peerConnectionState,
    })
  ) {
    return true;
  }
  if (input.isVideo || !input.hasRemoteDescription) return false;
  return (input.stream?.getAudioTracks?.()?.length ?? 0) > 0;
}

/**
 * react-native-webrtc : RTCView peut rester sur une surface audio-only si `toURL()` ne change pas
 * quand la vidéo distante arrive après le 1er bind.
 */
export function shouldRefreshNativeRemoteRtcView(input: {
  isVideo: boolean;
  prevBindingKey: string;
  nextBindingKey: string;
  prevVideoCount: number;
  nextVideoCount: number;
}): boolean {
  if (!input.isVideo || input.nextVideoCount <= 0) return false;
  if (input.nextVideoCount > input.prevVideoCount) return true;
  if (input.nextBindingKey !== input.prevBindingKey) return true;
  return false;
}

export type PeerConnectionMediaAuditRow = {
  kind: string | null;
  id: string | null;
  readyState: string | null;
  enabled: boolean | null;
  direction?: string | null;
  currentDirection?: string | null;
  mid?: string | null;
};

export type PeerConnectionMediaAudit = {
  senders: PeerConnectionMediaAuditRow[];
  receivers: PeerConnectionMediaAuditRow[];
  transceivers: PeerConnectionMediaAuditRow[];
};

/** Snapshot receivers/transceivers pour Logcat — preuve réception média distante. */
export function auditPeerConnectionMedia(
  pc: RTCPeerConnection | null | undefined,
): PeerConnectionMediaAudit {
  const senders = (pc?.getSenders?.() ?? []).map((s) => ({
    kind: s.track?.kind ?? null,
    id: s.track?.id ?? null,
    readyState: s.track?.readyState ?? null,
    enabled: s.track?.enabled ?? null,
  }));
  const receivers = (pc?.getReceivers?.() ?? []).map((r) => ({
    kind: r.track?.kind ?? null,
    id: r.track?.id ?? null,
    readyState: r.track?.readyState ?? null,
    enabled: r.track?.enabled ?? null,
  }));
  const transceivers = (pc?.getTransceivers?.() ?? []).map((t) => ({
    kind: t.sender?.track?.kind ?? t.receiver?.track?.kind ?? null,
    id: null,
    readyState: null,
    enabled: null,
    direction: t.direction != null ? String(t.direction) : null,
    currentDirection: t.currentDirection != null ? String(t.currentDirection) : null,
    mid: t.mid ?? null,
  }));
  return { senders, receivers, transceivers };
}

/** Clé de liaison audio+vidéo distantes (ids + readyState) — compare receivers PC vs flux unifié natif. */
export function receiverTracksBindingKey(tracks: ReceiverTrackLike[]): string {
  return mediaStreamBindingKey({
    getAudioTracks: () => tracks.filter((t) => t.kind === 'audio'),
    getVideoTracks: () => tracks.filter((t) => t.kind === 'video'),
  });
}

/**
 * react-native-webrtc : `addTrack` sur le MediaStream unifié existant ne rafraîchit pas RTCView
 * quand la vidéo arrive après l’audio (asymétrie appelant). Reconstruire le MediaStream.
 */
export function shouldReplaceNativeRemoteMediaStream(
  current: MediaStreamLike | null | undefined,
  receiverTracks: ReceiverTrackLike[],
): boolean {
  if (!receiverTracks.length) return false;
  if (!current) return true;
  const nextKey = receiverTracksBindingKey(receiverTracks);
  if (nextKey !== mediaStreamBindingKey(current)) return true;
  const tracks = [
    ...(current.getAudioTracks?.() ?? []),
    ...(current.getVideoTracks?.() ?? []),
  ];
  return tracks.length === 0 || tracks.every((t) => t.readyState === 'ended');
}

export function dedupeRemoteReceiverTracks<T extends ReceiverTrackLike>(tracks: T[]): T[] {
  const audio = tracks.filter((t) => t.kind === 'audio');
  const video = tracks.filter((t) => t.kind === 'video');
  const pickOne = (list: T[]): T | undefined => {
    if (!list.length) return undefined;
    return list.find((t) => t.readyState === 'live') ?? list[0];
  };
  const result: T[] = [];
  const pickedAudio = pickOne(audio);
  const pickedVideo = pickOne(video);
  if (pickedAudio) result.push(pickedAudio);
  if (pickedVideo) result.push(pickedVideo);
  return result;
}
