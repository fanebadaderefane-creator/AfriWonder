import { describe, expect, it } from 'vitest';
import {
  AGORA_CONNECTION_STATE_CONNECTED,
  agoraJoinChannelErrorMessage,
  isAgoraConnectionStateJoined,
  isAgoraJoinChannelReturnOk,
} from './agoraConnectionJoin';

describe('agoraConnectionJoin', () => {
  it('isAgoraConnectionStateJoined — connected = 3', () => {
    expect(isAgoraConnectionStateJoined(AGORA_CONNECTION_STATE_CONNECTED)).toBe(true);
    expect(isAgoraConnectionStateJoined(2)).toBe(false);
  });

  it('isAgoraJoinChannelReturnOk', () => {
    expect(isAgoraJoinChannelReturnOk(0)).toBe(true);
    expect(isAgoraJoinChannelReturnOk(undefined)).toBe(true);
    expect(isAgoraJoinChannelReturnOk(-17)).toBe(false);
  });

  it('agoraJoinChannelErrorMessage', () => {
    expect(agoraJoinChannelErrorMessage(-17)).toContain('-17');
    expect(agoraJoinChannelErrorMessage(-17)).toContain('relancez');
  });
});
