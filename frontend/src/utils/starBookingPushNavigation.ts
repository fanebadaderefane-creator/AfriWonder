import { router } from 'expo-router';

/**
 * Navigation depuis une notification (push Expo ou liste in-app) liée à une réservation star.
 * Aligné sur `reference_type: star_booking` + `reference_id` côté backend.
 */
export function navigateFromStarBookingNotification(input: {
  type?: string;
  reference_type?: string | null;
  reference_id?: string | null;
}): boolean {
  const rt = String(input.reference_type || '').toLowerCase();
  const rid = String(input.reference_id || '').trim();
  const t = String(input.type || '');
  if (rt !== 'star_booking' || !rid) return false;
  if (t === 'star_call_reminder_10min' || t === 'star_call_ready') {
    router.push(`/stars/call/${rid}` as never);
    return true;
  }
  if (t.startsWith('star_call_')) {
    router.push('/stars/bookings' as never);
    return true;
  }
  return false;
}
