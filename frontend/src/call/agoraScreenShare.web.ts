export type AgoraScreenShareResult = { ok: boolean; on?: boolean; message?: string };

/** Web — partage écran Agora indisponible. */
export async function toggleAgoraScreenShare(): Promise<AgoraScreenShareResult> {
  return { ok: false, message: 'Partage d’écran disponible sur l’application mobile.' };
}
