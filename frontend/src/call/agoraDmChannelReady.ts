/**
 * Join canal Agora — l’aperçu caméra (preview) ne doit pas rejoindre le canal avant acceptation.
 */

export function shouldEnableAgoraChannelJoin(input: {
  role: 'caller' | 'receiver';
  peerAccepted: boolean;
  callEnded: boolean;
  mediaEnabled: boolean;
}): boolean {
  if (!input.mediaEnabled || input.callEnded) return false;
  if (input.role === 'receiver') return input.peerAccepted;
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
