/** Qui peut appeler POST /api/videos/:id/repair-web-playback (aligné sur le backend). */
const STAFF_ROLES = new Set(['admin', 'super_admin', 'moderation_admin', 'moderator']);

export function canRequestWebPlaybackRepair(user, videoCreatorId) {
  if (!user?.id) return false;
  if (user.id === videoCreatorId) return true;
  const r = String(user.role || '').toLowerCase();
  return STAFF_ROLES.has(r);
}
