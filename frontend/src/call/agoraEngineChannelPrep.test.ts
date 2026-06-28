import { describe, expect, it, vi } from 'vitest';
import {
  AGORA_JOIN_CHANNEL_REJECTED,
  leaveAgoraEngineChannelOnly,
  shouldRetryAgoraJoinAfterRejected,
} from './agoraEngineChannelPrep';

describe('agoraEngineChannelPrep', () => {
  it('shouldRetryAgoraJoinAfterRejected — code -17', () => {
    expect(shouldRetryAgoraJoinAfterRejected(AGORA_JOIN_CHANNEL_REJECTED)).toBe(true);
    expect(shouldRetryAgoraJoinAfterRejected(0)).toBe(false);
  });

  it('leaveAgoraEngineChannelOnly — ignore si leaveChannel absent', async () => {
    await expect(leaveAgoraEngineChannelOnly({} as never)).resolves.toBeUndefined();
  });

  it('leaveAgoraEngineChannelOnly — appelle leaveChannel', async () => {
    const leaveChannel = vi.fn(async () => {});
    await leaveAgoraEngineChannelOnly({ leaveChannel } as never, { callId: 'c1' });
    expect(leaveChannel).toHaveBeenCalledTimes(1);
  });
});
