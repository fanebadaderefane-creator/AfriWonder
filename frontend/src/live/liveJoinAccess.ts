/** Statut d'accès spectateur pour un live privé (`private_mode`). */
export type LiveViewerJoinAccess = 'allowed' | 'none' | 'pending' | 'rejected';

export function canAccessPrivateLive(access: LiveViewerJoinAccess | null | undefined): boolean {
  return access === 'allowed';
}

export function liveJoinAccessLabel(access: LiveViewerJoinAccess | null | undefined): string {
  if (access === 'pending') return 'Demande en attente…';
  if (access === 'rejected') return 'Accès refusé par le créateur';
  if (access === 'none') return 'Ce live est privé — demandez l’accès';
  return '';
}
