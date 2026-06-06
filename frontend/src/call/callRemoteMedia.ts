/**
 * Helpers purs pour pistes distantes WebRTC (testables sans device).
 * ⛔ `shouldMarkCallConnected` / `hasRemoteDescription` : ne pas retirer sans lire call-signaling-locked.mdc
 */

export type MediaStreamLike = {
  getAudioTracks?: () => Array<{ id?: string; enabled?: boolean; readyState?: string }>;
  getVideoTracks?: () => Array<{ id?: string; enabled?: boolean; readyState?: string }>;
};

export function streamHasLiveAudio(stream: MediaStreamLike | null | undefined): boolean {
  const tracks = stream?.getAudioTracks?.() ?? [];
  return tracks.some((t) => t.readyState === 'live' && t.enabled !== false);
}

export function streamHasLiveVideo(stream: MediaStreamLike | null | undefined): boolean {
  const tracks = stream?.getVideoTracks?.() ?? [];
  return tracks.some((t) => t.readyState === 'live' && t.enabled !== false);
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
  /** Appelant : exiger le décrochage socket (`call:accept`) avant « connecté ». */
  role?: 'caller' | 'receiver';
  peerAccepted?: boolean;
  /** SDP distant appliqué — évite pistes transceiver fantômes avant négociation. */
  hasRemoteDescription?: boolean;
}): boolean {
  void input.trackKind;
  if (input.role === 'caller' && input.peerAccepted === false) return false;
  if (input.hasRemoteDescription === false) return false;

  const stream = input.stream;
  if (!stream) return false;

  const hasAudio = streamHasLiveAudio(stream);
  const hasVideo = streamHasLiveVideo(stream);
  const remoteVideoTracks = stream.getVideoTracks?.() ?? [];
  const remoteAudioTracks = stream.getAudioTracks?.() ?? [];
  const pcConnected = input.peerConnectionState === 'connected';

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
  if (remoteVideoTracks.length === 0 && hasAudio) return true;
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
}): boolean {
  const stream = input.stream;
  if (!stream) return false;
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
  role?: 'caller' | 'receiver';
  peerAccepted?: boolean;
  hasRemoteDescription?: boolean;
}): boolean {
  return (
    remoteStreamReadyForConnectedUi({ stream: input.stream, isVideo: input.isVideo }) &&
    shouldMarkCallConnected({
      stream: input.stream,
      isVideo: input.isVideo,
      trackKind: input.trackKind,
      peerConnectionState: input.peerConnectionState,
      role: input.role,
      peerAccepted: input.peerAccepted,
      hasRemoteDescription: input.hasRemoteDescription,
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
