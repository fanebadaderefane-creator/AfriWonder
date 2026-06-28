import { describe, expect, it } from 'vitest';
import {
  resolveAgoraDmCallId,
  shouldEnsureNativeInCallAfterAgoraJoin,
  shouldStartNativeInCallBeforeAgora,
} from './agoraDmCallSession';

describe('resolveAgoraDmCallId', () => {
  it('réutilise le canal actif après crash si pas de callId route', () => {
    const result = resolveAgoraDmCallId({
      role: 'caller',
      routeCallId: '',
      newCallId: () => 'call-new-generated',
      preserveActiveCallId: 'call-active-channel',
    });
    expect(result).toEqual({ callId: 'call-active-channel', error: null });
  });

  it('préfère le callId route sur le canal actif', () => {
    const result = resolveAgoraDmCallId({
      role: 'caller',
      routeCallId: 'call-from-route',
      newCallId: () => 'call-new-generated',
      preserveActiveCallId: 'call-active-channel',
    });
    expect(result).toEqual({ callId: 'call-from-route', error: null });
  });
});

describe('InCallManager timing Agora DM', () => {
  it('appelant seulement avant join (ringback)', () => {
    expect(shouldStartNativeInCallBeforeAgora('caller')).toBe(true);
    expect(shouldStartNativeInCallBeforeAgora('receiver')).toBe(false);
  });

  it('receveur après join Agora (route audio Android)', () => {
    expect(shouldEnsureNativeInCallAfterAgoraJoin('receiver')).toBe(true);
    expect(shouldEnsureNativeInCallAfterAgoraJoin('caller')).toBe(false);
  });
});
