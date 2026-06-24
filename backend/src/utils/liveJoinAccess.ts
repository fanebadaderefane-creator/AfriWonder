/** Statut d'accès spectateur pour un live (`private_mode`). */
export type ViewerJoinAccess = 'allowed' | 'none' | 'pending' | 'rejected';

export function resolveViewerJoinAccess(opts: {
  isCreator: boolean;
  privateMode: boolean;
  requestStatus: string | null | undefined;
}): ViewerJoinAccess {
  if (opts.isCreator) return 'allowed';
  if (!opts.privateMode) return 'allowed';
  const status = String(opts.requestStatus || '').toLowerCase();
  if (status === 'accepted') return 'allowed';
  if (status === 'pending') return 'pending';
  if (status === 'rejected') return 'rejected';
  return 'none';
}

export function canViewerAccessLive(access: ViewerJoinAccess): boolean {
  return access === 'allowed';
}

export function joinAccessErrorCode(access: ViewerJoinAccess): string {
  if (access === 'pending') return 'JOIN_ACCESS_PENDING';
  if (access === 'rejected') return 'JOIN_ACCESS_REJECTED';
  return 'JOIN_ACCESS_REQUIRED';
}
