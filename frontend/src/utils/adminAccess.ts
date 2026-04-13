/** Aligné sur la console admin mobile (`admin-dashboard.tsx`). */
export const SUPER_ADMIN_EMAIL = (
  process.env.EXPO_PUBLIC_SUPER_ADMIN_EMAIL || 'fanebadaderefane@gmail.com'
).toLowerCase();

export function isAdminUser(user: { role?: string; email?: string } | null | undefined): boolean {
  if (!user) return false;
  const r = String(user.role || '').toLowerCase();
  if (r === 'admin' || r === 'super_admin' || r === 'finance_admin' || r === 'moderation_admin') {
    return true;
  }
  if (user.role === 'ADMIN') return true;
  if (user.email?.toLowerCase() === SUPER_ADMIN_EMAIL) return true;
  return false;
}
