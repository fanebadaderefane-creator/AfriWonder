import { describe, expect, it } from 'vitest';
import {
  shouldApplyInviteAckCallId,
  shouldStopPreviewBeforeChannelJoin,
} from './agoraDmJoinLifecycle';

describe('agoraDmJoinLifecycle', () => {
  it('invite:ack — ignore si même callId', () => {
    expect(shouldApplyInviteAckCallId('call-abc', 'call-abc')).toBe(false);
    expect(shouldApplyInviteAckCallId('call-abc', 'call-xyz')).toBe(true);
    expect(shouldApplyInviteAckCallId('', 'call-xyz')).toBe(true);
  });

  it('preview adopté — pas de stopPreview avant join', () => {
    expect(shouldStopPreviewBeforeChannelJoin(true)).toBe(false);
    expect(shouldStopPreviewBeforeChannelJoin(false)).toBe(false);
  });
});
