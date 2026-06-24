import { describe, expect, it, vi } from 'vitest';
import { invokeAgoraEngine } from './agoraEngineInvoke';

describe('invokeAgoraEngine', () => {
  it('appelle la méthode si elle existe', () => {
    const mute = vi.fn();
    invokeAgoraEngine({ muteLocalVideoStream: mute } as never, 'muteLocalVideoStream', true);
    expect(mute).toHaveBeenCalledWith(true);
  });

  it('ignore une méthode absente', () => {
    expect(() => invokeAgoraEngine({} as never, 'muteLocalVideoStream', true)).not.toThrow();
  });
});
