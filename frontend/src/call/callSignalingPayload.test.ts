import { describe, expect, it } from 'vitest';
import { buildCallAcceptPayload } from './callSignalingPayload';

describe('callSignalingPayload', () => {
  it('buildCallAcceptPayload maps accepter as fromUserId and caller as toUserId', () => {
    expect(
      buildCallAcceptPayload({
        callId: 'call-1',
        accepterUserId: 'user-b',
        callerUserId: 'user-a',
        type: 'video',
      }),
    ).toEqual({
      callId: 'call-1',
      fromUserId: 'user-b',
      toUserId: 'user-a',
      type: 'video',
    });
  });
});
