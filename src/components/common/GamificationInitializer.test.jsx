import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useGamificationInit from './GamificationInitializer';

const mockFilter = vi.fn();
const mockCreate = vi.fn();
const mockGetUserStats = vi.fn();
const mockCheckAndAwardBadge = vi.fn();
const mockCreateNotificationPreference = vi.fn();
const mockRegisterServiceWorker = vi.fn();

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
  default: {
    getUserStats: (...args) => mockGetUserStats(...args),
    checkAndAwardBadge: (...args) => mockCheckAndAwardBadge(...args),
  },
}));

vi.mock('./PushNotificationService', () => ({
  default: {
    createNotificationPreference: (...args) => mockCreateNotificationPreference(...args),
    registerServiceWorker: (...args) => mockRegisterServiceWorker(...args),
  },
}));

describe('GamificationInitializer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFilter.mockResolvedValue([{ id: 1 }]);
    mockGetUserStats.mockResolvedValue({ videos: 0, followers: 0, totalLikes: 0, totalComments: 0 });
    mockCreateNotificationPreference.mockResolvedValue(undefined);
    mockRegisterServiceWorker.mockResolvedValue(undefined);
    delete window.Notification;
  });

  it('does not call api when userId is null', () => {
    renderHook(() => useGamificationInit(null));
    expect(mockFilter).not.toHaveBeenCalled();
  });

  it('calls api when userId is provided', async () => {
    renderHook(() => useGamificationInit('user1'));
    await vi.waitFor(() => {
      expect(mockFilter).toHaveBeenCalledWith({ user_id: 'user1' });
    });
  });
});
