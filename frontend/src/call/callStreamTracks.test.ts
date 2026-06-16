import { describe, expect, it } from 'vitest';
import {
  safeAudioTrackCount,
  safeGetAudioTracks,
  safeGetVideoTracks,
  safeVideoTrackCount,
  shouldRunDeferredCallMediaNudge,
} from './callStreamTracks';

describe('callStreamTracks — garde null stream', () => {
  it('safeGetAudioTracks(null) → []', () => {
    expect(safeGetAudioTracks(null)).toEqual([]);
  });

  it('safeGetAudioTracks(undefined) → []', () => {
    expect(safeGetAudioTracks(undefined)).toEqual([]);
  });

  it('safeGetVideoTracks(null) → []', () => {
    expect(safeGetVideoTracks(null)).toEqual([]);
  });

  it('safeAudioTrackCount(null) → 0 sans throw', () => {
    expect(safeAudioTrackCount(null)).toBe(0);
  });

  it('safeVideoTrackCount(null) → 0 sans throw', () => {
    expect(safeVideoTrackCount(null)).toBe(0);
  });

  it('objet sans getAudioTracks → []', () => {
    expect(safeGetAudioTracks({})).toEqual([]);
  });

  it('getAudioTracks?.() seul ne suffit pas — stream null ne throw pas', () => {
    const stream: null = null;
    expect(() => safeAudioTrackCount(stream)).not.toThrow();
  });

  it('shouldRunDeferredCallMediaNudge — PC requis', () => {
    expect(shouldRunDeferredCallMediaNudge({ cancelled: false, pc: {} })).toBe(true);
    expect(shouldRunDeferredCallMediaNudge({ cancelled: false, pc: null })).toBe(false);
    expect(shouldRunDeferredCallMediaNudge({ cancelled: true, pc: {} })).toBe(false);
    expect(
      shouldRunDeferredCallMediaNudge({ cancelled: false, pc: {}, tearingDown: true }),
    ).toBe(false);
  });
});
