import { describe, expect, it } from 'vitest';
import { isValidNativeRtcStreamUrl, shouldShowNativeRemoteAudioRtc } from './callRtcStreamUrl';

describe('callRtcStreamUrl', () => {
  it('rejette URL vide, locale ou invalide', () => {
    expect(isValidNativeRtcStreamUrl('')).toBe(false);
    expect(isValidNativeRtcStreamUrl('   ')).toBe(false);
    expect(isValidNativeRtcStreamUrl(null)).toBe(false);
    expect(isValidNativeRtcStreamUrl('abc', { localUrl: 'abc' })).toBe(false);
    expect(isValidNativeRtcStreamUrl('null')).toBe(false);
    expect(isValidNativeRtcStreamUrl('0')).toBe(false);
    expect(isValidNativeRtcStreamUrl('false')).toBe(false);
  });

  it('accepte URL distante distincte', () => {
    expect(isValidNativeRtcStreamUrl('blob:abc-123', { localUrl: 'blob:local' })).toBe(true);
  });

  it('shouldShowNativeRemoteAudioRtc — vocal en connecting si URL distante prête', () => {
    expect(
      shouldShowNativeRemoteAudioRtc({
        isWeb: false,
        nativeRtcUnmounting: false,
        callState: 'connecting',
        isVideoCall: false,
        remoteStreamUrl: 'blob:remote-1',
        localStreamUrl: 'blob:local-1',
      }),
    ).toBe(true);
    expect(
      shouldShowNativeRemoteAudioRtc({
        isWeb: false,
        nativeRtcUnmounting: false,
        callState: 'connecting',
        isVideoCall: true,
        remoteStreamUrl: 'blob:remote-1',
        localStreamUrl: 'blob:local-1',
      }),
    ).toBe(false);
    expect(
      shouldShowNativeRemoteAudioRtc({
        isWeb: false,
        nativeRtcUnmounting: false,
        callState: 'ringing',
        isVideoCall: false,
        remoteStreamUrl: 'blob:remote-1',
        localStreamUrl: 'blob:local-1',
      }),
    ).toBe(false);
  });
});
