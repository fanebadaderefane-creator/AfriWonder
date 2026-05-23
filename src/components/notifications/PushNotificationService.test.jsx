import { describe, it, expect, vi, beforeEach } from 'vitest';
import PushNotificationService from './PushNotificationService';

describe('PushNotificationService (notifications)', () => {
  beforeEach(() => {
    PushNotificationService.instance = null;
    vi.restoreAllMocks();
  });

  it('getInstance returns singleton', () => {
    const a = PushNotificationService.getInstance();
    const b = PushNotificationService.getInstance();
    expect(a).toBe(b);
  });

  it('urlBase64ToUint8Array converts base64 to Uint8Array', () => {
    const instance = PushNotificationService.getInstance();
    const result = instance.urlBase64ToUint8Array('YQ==');
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it('initialize does nothing when serviceWorker not supported', async () => {
    const orig = global.navigator.serviceWorker;
    Object.defineProperty(global.navigator, 'serviceWorker', { value: undefined, configurable: true });
    const instance = PushNotificationService.getInstance();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await instance.initialize();
    expect(log).toHaveBeenCalledWith('Service Workers non supporté');
    Object.defineProperty(global.navigator, 'serviceWorker', { value: orig, configurable: true });
    log.mockRestore();
  });

  it('sendBulkNotification calls sendNotification for each user', async () => {
    const instance = PushNotificationService.getInstance();
    const sendSpy = vi.spyOn(instance, 'sendNotification').mockResolvedValue(undefined);
    await instance.sendBulkNotification(['u1', 'u2'], 'Title', { message: 'Msg' });
    expect(sendSpy).toHaveBeenCalledTimes(2);
    expect(sendSpy).toHaveBeenCalledWith('u1', 'Title', { message: 'Msg' });
    expect(sendSpy).toHaveBeenCalledWith('u2', 'Title', { message: 'Msg' });
  });

  it('sendTransactionNotification calls sendNotification with type text', async () => {
    const instance = PushNotificationService.getInstance();
    const sendSpy = vi.spyOn(instance, 'sendNotification').mockResolvedValue(undefined);
    await instance.sendTransactionNotification('u1', {
      id: 'tx1',
      type: 'payment',
      amount: 1000,
      _description: 'Test',
    });
    expect(sendSpy).toHaveBeenCalledWith('u1', 'Paiement effectué', expect.objectContaining({
      message: expect.stringMatching(/\d.*XOF.*Test/),
      type: 'transaction',
      data: { transaction_id: 'tx1' },
    }));
  });

  it('sendOrderNotification calls sendNotification with status text', async () => {
    const instance = PushNotificationService.getInstance();
    const sendSpy = vi.spyOn(instance, 'sendNotification').mockResolvedValue(undefined);
    await instance.sendOrderNotification('u1', { id: 'ord1' }, 'shipped');
    expect(sendSpy).toHaveBeenCalledWith('u1', 'Commande expédiée', expect.objectContaining({
      message: expect.stringContaining('ord1'),
      type: 'order',
    }));
  });

  it('sendLiveNotification calls sendNotification', async () => {
    const instance = PushNotificationService.getInstance();
    const sendSpy = vi.spyOn(instance, 'sendNotification').mockResolvedValue(undefined);
    await instance.sendLiveNotification('creator1', 5);
    expect(sendSpy).toHaveBeenCalledWith('creator1', 'Votre live est en direct', expect.objectContaining({
      message: '5 spectateurs vous regardent',
      type: 'live',
      requireInteraction: true,
    }));
  });
});
