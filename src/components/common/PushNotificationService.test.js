import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PushNotificationService from './PushNotificationService';

describe('PushNotificationService', () => {
  let originalNotification;

  beforeEach(() => {
    originalNotification = global.Notification;
  });

  afterEach(() => {
    global.Notification = originalNotification;
    vi.restoreAllMocks();
  });

  it('requestPermission returns false when Notification not in window', async () => {
    const win = global.window || global;
    const backup = win.Notification;
    delete win.Notification;
    try {
      const result = await PushNotificationService.requestPermission();
      expect(result).toBe(false);
    } finally {
      win.Notification = backup;
    }
  });

  it('requestPermission returns true when already granted', async () => {
    global.Notification = { permission: 'granted', requestPermission: vi.fn() };
    const result = await PushNotificationService.requestPermission();
    expect(result).toBe(true);
  });

  it('requestPermission returns false when denied', async () => {
    global.Notification = { permission: 'denied', requestPermission: vi.fn() };
    const result = await PushNotificationService.requestPermission();
    expect(result).toBe(false);
  });

  it('subscribe returns false without full browser push setup (SW + VAPID)', async () => {
    global.Notification = { permission: 'granted', requestPermission: vi.fn() };
    const result = await PushNotificationService.subscribe('user1');
    expect(result).toBe(false);
  });

  it('sendNotification does not throw when permission granted', () => {
    const MockNotif = vi.fn();
    MockNotif.permission = 'granted';
    global.Notification = MockNotif;
    expect(() => PushNotificationService.sendNotification('Test', {})).not.toThrow();
  });
});
