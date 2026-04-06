import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useGamificationInit from './GamificationInitializer';

const mockFilter = vi.fn();
const mockCreate = vi.fn();
const mockCheckAndAwardBadges = vi.fn();
const mockCreateNotificationPreference = vi.fn();
const mockRegisterServiceWorker = vi.fn();
const mockSubscribeToPushNotifications = vi.fn();

vi.mock('@/api/expressClient', () => ({
  api: {
    entities: {
      UserPoints: {
        filter: (...args) => mockFilter(...args),
        create: (...args) => mockCreate(...args),
      },
    },
  },
}));

vi.mock('./GamificationService', () => ({
  checkAndAwardBadges: (...args) => mockCheckAndAwardBadges(...args),
}));

vi.mock('./PushNotificationService', () => ({
  default: {
    createNotificationPreference: (...args) => mockCreateNotificationPreference(...args),
    registerServiceWorker: (...args) => mockRegisterServiceWorker(...args),
    subscribeToPushNotifications: (...args) => mockSubscribeToPushNotifications(...args),
  },
}));

describe('GamificationInitializer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFilter.mockResolvedValue([{ id: 1 }]);
    mockCheckAndAwardBadges.mockResolvedValue({ success: true, newBadges: [] });
    mockCreateNotificationPreference.mockResolvedValue(undefined);
    mockRegisterServiceWorker.mockResolvedValue(undefined);
    mockSubscribeToPushNotifications.mockResolvedValue(undefined);
    delete window.Notification;
  });

  it('does not call api when userId is null', () => {
    renderHook(() => useGamificationInit(null));
    expect(mockFilter).not.toHaveBeenCalled();
  });

  it('calls api when userId is provided', async () => {
    window.Notification = { permission: 'default' };
    globalThis.navigator.serviceWorker = {};
    renderHook(() => useGamificationInit('user1'));
    await vi.waitFor(() => {
      expect(mockFilter).toHaveBeenCalledWith({ user_id: 'user1' });
      expect(mockCheckAndAwardBadges).toHaveBeenCalledWith('user1');
      expect(mockRegisterServiceWorker).toHaveBeenCalled();
      expect(mockSubscribeToPushNotifications).toHaveBeenCalledWith('user1');
    });
  });
});
