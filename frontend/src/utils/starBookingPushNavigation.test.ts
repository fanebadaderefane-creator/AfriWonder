import { describe, it, expect, vi, beforeEach } from 'vitest';

const push = vi.fn();
vi.mock('expo-router', () => ({
  router: {
    push: (route: unknown) => push(route),
  },
}));

import { navigateFromStarBookingNotification } from './starBookingPushNavigation';

describe('navigateFromStarBookingNotification', () => {
  beforeEach(() => {
    push.mockClear();
  });

  it('returns false when reference_type is not star_booking', () => {
    expect(
      navigateFromStarBookingNotification({
        type: 'star_call_ready',
        reference_type: 'video',
        reference_id: 'x',
      }),
    ).toBe(false);
    expect(push).not.toHaveBeenCalled();
  });

  it('routes reminder and ready to call screen', () => {
    expect(
      navigateFromStarBookingNotification({
        type: 'star_call_reminder_10min',
        reference_type: 'star_booking',
        reference_id: 'booking-1',
      }),
    ).toBe(true);
    expect(push).toHaveBeenCalledWith('/stars/call/booking-1');

    push.mockClear();
    expect(
      navigateFromStarBookingNotification({
        type: 'star_call_ready',
        reference_type: 'star_booking',
        reference_id: 'booking-2',
      }),
    ).toBe(true);
    expect(push).toHaveBeenCalledWith('/stars/call/booking-2');
  });

  it('routes other star_call_* types to bookings list', () => {
    expect(
      navigateFromStarBookingNotification({
        type: 'star_call_booked',
        reference_type: 'star_booking',
        reference_id: 'booking-3',
      }),
    ).toBe(true);
    expect(push).toHaveBeenCalledWith('/stars/bookings');
  });
});
