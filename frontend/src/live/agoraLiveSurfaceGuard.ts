/**
 * Garde-fous montage RtcSurfaceView — lives natifs (hôte + spectateur).
 * Évite un crash si le moteur Agora n’est pas prêt (même principe que DM Inbox).
 */
export function shouldMountAgoraLiveLocalSurface(opts: {
  platform: string;
  role: 'host' | 'audience';
  previewReady: boolean;
}): boolean {
  if (opts.platform === 'web') return false;
  if (opts.role !== 'host') return false;
  return opts.previewReady;
}

export function shouldMountAgoraLiveRemoteSurface(opts: {
  platform: string;
  joined: boolean;
  remoteUid: number | null;
}): boolean {
  if (opts.platform === 'web') return false;
  if (!opts.joined) return false;
  return opts.remoteUid != null && Number.isFinite(opts.remoteUid);
}
