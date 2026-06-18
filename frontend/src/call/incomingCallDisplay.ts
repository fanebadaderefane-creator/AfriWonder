/** Affichage ligne appelant entrant (téléphone ou repli AfriWonder). */
export function formatIncomingCallerSubtitle(input: {
  callerPhone?: string;
  fallback?: string;
}): string {
  const phone = String(input.callerPhone || '').trim();
  if (phone) return phone;
  return String(input.fallback || 'AfriWonder').trim() || 'AfriWonder';
}
