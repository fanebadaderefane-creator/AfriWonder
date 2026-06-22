/**
 * Politique moteur Agora vidéo DM — un seul RtcEngine par appel.
 * Ne jamais createAgoraRtcEngine() pour la vidéo si le preview n’a pas été consommé.
 */

export function shouldBlockSecondAgoraVideoEngine(audioOnly: boolean, adoptedEngine: unknown): boolean {
  return !audioOnly && adoptedEngine == null;
}

export function agoraVideoEngineUnavailableMessage(): string {
  return 'Caméra indisponible. Fermez l’appel et réessayez.';
}
