/**
 * Join canal Agora — vidéo : preview sans join avant acceptation.
 * Audio vocal : join immédiat appelant (régression « Connexion média… » bloquée).
 */

export function shouldEnableAgoraChannelJoin(input: {
  role: 'caller' | 'receiver';
  peerAccepted: boolean;
  callEnded: boolean;
  mediaEnabled: boolean;
  /** Vocal — l'appelant rejoint le canal pendant la sonnerie (comportement historique). */
  audioOnly?: boolean;
}): boolean {
  if (!input.mediaEnabled || input.callEnded) return false;
  if (input.role === 'receiver') return input.peerAccepted;
  if (input.audioOnly) return true;
  return input.peerAccepted;
}

/** Chronomètre / « connecté » — uniquement après acceptation socket. */
export function shouldStartAgoraCallTimer(input: {
  callState: 'ringing' | 'connecting' | 'connected' | 'ended';
  peerAccepted: boolean;
}): boolean {
  if (input.callState !== 'connected') return false;
  return input.peerAccepted;
}

/** Déclencher connected UI depuis Agora — vidéo exige une frame distante décodée. */
export function shouldPromoteAgoraRemoteToConnected(input: {
  audioOnly: boolean;
  eventSource: string;
}): boolean {
  if (input.audioOnly) {
    return (
      input.eventSource === 'onUserJoined' ||
      input.eventSource === 'onRemoteAudioStateChanged'
    );
  }
  return input.eventSource === 'onFirstRemoteVideoDecoded';
}

/** Sticky « correspondant vu » — vidéo : première frame distante seulement (pas l’audio seul). */
export function shouldMarkAgoraRemoteEverJoined(input: {
  audioOnly: boolean;
  eventSource: string;
}): boolean {
  if (input.audioOnly) return true;
  return input.eventSource === 'onFirstRemoteVideoDecoded';
}
