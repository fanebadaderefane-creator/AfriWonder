import { buildIncomingCallWakeData } from '../../src/services/incomingCallPush.service.js';

describe('buildIncomingCallWakeData', () => {
  it('produit type incoming_call pour le handler mobile', () => {
    const data = buildIncomingCallWakeData({
      callId: 'call-1',
      fromUserId: 'user-a',
      type: 'video',
      callerName: 'Alice',
    });
    expect(data.type).toBe('incoming_call');
    expect(data.callId).toBe('call-1');
    expect(data.fromUserId).toBe('user-a');
    expect(data.callType).toBe('video');
    expect(data.callerName).toBe('Alice');
  });
});
