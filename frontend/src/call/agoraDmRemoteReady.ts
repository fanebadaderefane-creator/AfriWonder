/**
 * Notification « correspondant prêt » — toujours relayer vers l’écran d’appel ;
 * le dedup ne bloque que le log (régression : 1er event avant accept → jamais connecté).
 */

export function shouldLogAgoraRemoteReady(alreadyLogged: boolean): boolean {
  return !alreadyLogged;
}

export function shouldFlushAgoraDmConnected(input: {
  peerAccepted: boolean;
  callState: 'ringing' | 'connecting' | 'connected' | 'ended';
  joined: boolean;
  remoteJoined: boolean;
}): boolean {
  if (!input.peerAccepted) return false;
  if (input.callState !== 'connecting') return false;
  return input.joined && input.remoteJoined;
}
